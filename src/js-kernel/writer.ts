import koffi from "koffi";
import { WriteBytesCb } from "./ffi/bindings.js";

/**
 * A streaming byte buffer bridge for native serialization.
 *
 * This utility orchestrates the accumulation of data emitted by native C-layer 
 * serialization functions that utilize callback-driven streaming architectures. 
 * It manages registering temporary functional pointers into Koffi's FFI layer, 
 * safely copies raw `uint8_t` bytes out of native memory space before they are 
 * unmapped, handles cross-boundary exceptions, and prevents memory leaks through 
 * deterministic pointer lifecycle teardowns.
 */
export class ByteWriter {
    /** * Accumulated binary segments intercepted during the active streaming operation. 
     */
    private chunks: Buffer[] = [];
    
    /** * Captures asynchronous exceptions that manifest inside the foreign callback loop.
     * Stored here to be rethrown once control returns safely to the JavaScript thread.
     */
    public exception: Error | null = null;

    /**
     * Clear historical buffers and state variables prior to a new serialization iteration.
     */
    private clear(): void {
        this.chunks = [];
        this.exception = null;
    }

    /**
     * Execute a native serialization function and compile its stream output into a consolidated Buffer.
     *
     * @param toBytesFunc - The native binding wrapper responsible for initiating data streaming.
     * @param ptr - The handle or memory address of the opaque native object to serialize.
     * @returns A Node.js `Buffer` containing the fully concatenated binary sequence.
     * @throws {Error} If the native operation fails (returns a non-zero exit code), or if 
     * an unhandled runtime error is caught within the internal FFI callback wrapper.
     */
    public write(toBytesFunc: (ptr: bigint, cb: unknown, userData: unknown) => number, ptr: bigint): Buffer {
        this.clear();

        // Register a concrete callback function layout with Koffi's FFI mapping registry
        const nativeCallback = koffi.register((cBytesPtr: any, size: bigint, _userData: any): number => {
                try {
                    const length = Number(size);

                    if (length > 0 && cBytesPtr) {
                        // Safely extract the raw continuous uint8 array directly out of the memory address
                        const bytes = koffi.decode(cBytesPtr, "uint8_t", length);

                        // Isolate data by allocating an independent Node.js Buffer copy
                        this.chunks.push(Buffer.from(bytes));
                    }

                    // Acknowledge successful stream processing iteration back to the native module
                    return 0;
                } catch (err) {
                    // Cache the error instance to bypass cross-boundary stack unwinding panics
                    this.exception = err instanceof Error ? err : new Error(String(err));

                    return -1;
                }
            },
            koffi.pointer(WriteBytesCb),
        );

        try {
            // Trigger the native C function to kick off the callback streaming loop
            const ret = toBytesFunc(ptr, nativeCallback, null);

            // Validate execution parity once control returns back to JavaScript
            if (ret !== 0) {
                if (this.exception) {
                    throw this.exception;
                }

                throw new Error(`C serialization function failed with return code ${ret}`);
            }

            // Concatenate accumulated memory segments into a standalone response payload
            return Buffer.concat(this.chunks);
        } finally {
            // Unregister the callback to free the transient code stub and avoid memory leaks
            koffi.unregister(nativeCallback);
        }
    }
}