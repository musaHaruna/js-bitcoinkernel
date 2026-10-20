import koffi from "koffi";
import { WriteBytesCb } from "./ffi/bindings.js";

/**
 * Collect bytes produced by a synchronous native serializer.
 *
 * A temporary Koffi callback copies each native byte span into a Buffer.
 * The callback is unregistered when write() finishes or throws. Native
 * code must not retain the callback after the serializer returns.
 *
 * Use one writer per active call. Sequential reuse is supported; nested
 * or overlapping writes on the same writer would share mutable state.
 */
export class ByteWriter {
  /**
   * Byte copies collected during the current serialization call.
   */
  private chunks: Buffer[] = [];

  /**
   * Error caught inside the native write callback.
   *
   * Stored until the serializer returns so write() can throw it from
   * JavaScript instead of throwing through the native callback boundary.
   */
  public exception: Error | null = null;

  /**
   * Discard previous chunks and callback errors before starting another write.
   */
  private clear(): void {
    this.chunks = [];
    this.exception = null;
  }

  /**
   * Run a native serializer and combine its output into one Buffer.
   *
   * The serializer receives args followed by the write callback and null
   * user_data. The callback returns zero on success and -1 on failure.
   * A captured callback error takes priority over the serializer's status.
   * The callback registration is always released after the native call.
   *
   * @param toBytesFunc - Synchronous serializer returning zero on success.
   * @param args - Native arguments placed before the callback and user_data.
   * @returns A Buffer owning all serialized bytes.
   * @throws {Error} If registration, byte copying, or serialization fails.
   */
  public write(toBytesFunc: (...args: any[]) => number, ...args: any[]): Buffer {
    this.clear();

    // Register a callback that stays valid throughout the native call.
    const nativeCallback = koffi.register((cBytesPtr: any, size: bigint, _userData: any): number => {
      try {
        const length = Number(size);

        if (length > 0 && cBytesPtr) {
          // Read exactly the byte span supplied by the serializer.
          const bytes = koffi.decode(cBytesPtr, "uint8_t", length);

          // Copy the bytes before native code reuses or releases them.
          this.chunks.push(Buffer.from(bytes));
        }

        // Zero tells the serializer that this chunk was accepted.
        return 0;
      } catch (err) {
        // Report failure to C and rethrow the error after the native call.
        this.exception = err instanceof Error ? err : new Error(String(err));

        return -1;
      }
    },
    koffi.pointer(WriteBytesCb),
    );

    try {
      // The serializer may invoke the callback multiple times before returning.
      const ret = toBytesFunc(...args, nativeCallback, null);

      // Surface a callback error before checking the native status.
      if (this.exception) throw this.exception;
      if (ret !== 0) {
        if (this.exception) {
          throw this.exception;
        }

        throw new Error(`C serialization function failed with return code ${ret}`);
      }

      // Combine the copied chunks in the order they were received.
      return Buffer.concat(this.chunks);
    } finally {
      // Native serialization has finished; release its callback registration.
      koffi.unregister(nativeCallback);
    }
  }
}
