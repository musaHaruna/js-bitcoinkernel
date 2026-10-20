import koffi from "koffi";
import { int64, flagsWithin } from "./util/numbers.js";
import {
  btck_script_pubkey_copy,
  btck_script_pubkey_create,
  btck_script_pubkey_destroy,
  btck_script_pubkey_to_bytes,

  btck_precomputed_transaction_data_create,
  btck_precomputed_transaction_data_copy,
  btck_precomputed_transaction_data_destroy,
  btck_script_pubkey_verify,
} from "./ffi/bindings.js";
import { KernelOpaquePtr } from "./ffi/KernelOpaquePtr.js";
import { KernelException } from "./util/exceptions.js";
import { ByteWriter } from "./writer.js";
import { Transaction, TransactionOutput } from "./transaction.js";
/**
 * Script verification flags that may be composed with each other.
 *
 * These flags control which validation rules are enforced during script
 * verification. Multiple flags can be combined using bitwise OR operations.
 */
export enum ScriptVerificationFlags {
  NONE = 0, // No verification flags
  P2SH = 1 << 0, // Evaluate P2SH subscripts (BIP16)
  DERSIG = 1 << 2, // Enforce strict DER signature encoding (BIP66)
  NULLDUMMY = 1 << 4, // Enforce NULLDUMMY rule (BIP147)
  CHECKLOCKTIMEVERIFY = 1 << 9, // Enable CHECKLOCKTIMEVERIFY opcode (BIP65)
  CHECKSEQUENCEVERIFY = 1 << 10, // Enable CHECKSEQUENCEVERIFY opcode (BIP112)
  WITNESS = 1 << 11, // Enable Segregated Witness (BIP141)
  TAPROOT = 1 << 17, // Enable Taproot (BIP341 & BIP342)

  /** All verification flags combined */
  ALL = P2SH |
        DERSIG |
        NULLDUMMY |
        CHECKLOCKTIMEVERIFY |
        CHECKSEQUENCEVERIFY |
        WITNESS |
        TAPROOT
}

/**
 * Status codes returned by script verification.
 *
 * These codes indicate the result of script verification, including
 * success, various error conditions, and validation failures.
 */
export enum ScriptVerifyStatus {
  OK = 0, // Verification succeeded
  ERROR_INVALID_FLAGS_COMBINATION = 1, // The verification flags were combined in an invalid way
  ERROR_SPENT_OUTPUTS_REQUIRED = 2 // The taproot flag requires valid spent outputs to be provided
}

/**
 * Exception thrown when Bitcoin script verification fails.
 *
 * This exception is typically raised by the `ScriptPubkey.verify` function when a script
 * evaluates to invalid or fails to pass consensus validation rules. It captures a specific
 * status code detailing the exact programmatic reason for the verification failure.
 */
export class ScriptVerifyException extends KernelException {
  /**
     * The evaluation status code indicating the specific failure reason.
     */
  public readonly status: ScriptVerifyStatus;

  /**
     * Create a new script verification exception.
     *
     * @param status - The verification status code representing the evaluation error.
     */
  constructor(status: ScriptVerifyStatus) {
    // Resolve the enum string name using TypeScript's reverse mapping feature
    const statusName = ScriptVerifyStatus[status] || `UNKNOWN_STATUS_${status}`;

    super(`Script verification failed: ${statusName}`);
    this.status = status;

    // Corrects the prototype chain for custom Error types in JavaScript/TypeScript environments
    Object.setPrototypeOf(this, ScriptVerifyException.prototype);
  }
}

/**
 * Cache transaction data used during signature verification.
 *
 * Reusing the cache avoids repeating transaction hashing for each input.
 * Supply the spent outputs in input order when Taproot verification needs
 * all input amounts and scripts. Dispose the cache when finished.
 */
export class PrecomputedTransactionData extends KernelOpaquePtr {
  protected static override destroyFn = btck_precomputed_transaction_data_destroy as (ptr: bigint) => void;

  protected static override copyFn = btck_precomputed_transaction_data_copy as (ptr: bigint) => bigint;

  /**
   * Wrap an existing native precomputed-data pointer.
   *
   * @param ptr - Existing native cache pointer.
   * @param ownsPtr - Whether this wrapper must destroy the cache handle.
   * @param parent - Optional owner for a borrowed pointer.
   */
  constructor(ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null);
  /**
   * Create a cache for a transaction and its optional spent outputs.
   *
   * A nonempty output list must have one entry per transaction input,
   * in the same order. Null or an empty list omits spent-output data;
   * supply the full list for verification that requires it, such as Taproot.
   *
   * @param txTo - Transaction whose signatures will be verified.
   * @param spentOutputs - Outputs being spent, in input order.
   * @throws {RangeError} If a nonempty list has the wrong length.
   * @throws {Error} If a handle is invalid or native creation fails.
   */
  constructor(txTo: Transaction, spentOutputs?: TransactionOutput[] | null);
  constructor(txTo: Transaction | bigint, spentOutputs: TransactionOutput[] | boolean | null = null, parent: KernelOpaquePtr | null = null) {
    if (typeof txTo === "bigint") {
      super(txTo, typeof spentOutputs === "boolean" ? spentOutputs : true, parent);
      return;
    }
    if (typeof spentOutputs === "boolean") throw new TypeError("Expected spent outputs array");
    if (spentOutputs?.length && spentOutputs.length !== txTo.inputs.length) {
      throw new RangeError("Spent outputs must match the transaction input count");
    }
    if (!btck_precomputed_transaction_data_create) {
      throw new Error("btck_precomputed_transaction_data_create unavailable");
    }

    let outputsPtr: Buffer | null = null;
    const outputsLen = spentOutputs?.length ?? 0;
    if (spentOutputs && outputsLen > 0) {
      // Encode contiguous native-width addresses for the C pointer-array argument.
      const handles = spentOutputs.map(output => (output as any).getHandle());
      outputsPtr = Buffer.alloc(koffi.sizeof('void *') * outputsLen);
      koffi.encode(outputsPtr, koffi.array('uintptr_t', outputsLen), handles);
    }

    // Bypassing protected barrier on sibling class 'Transaction' using 'as any'
    const txHandle = (txTo as any).getHandle();

    const ptr = btck_precomputed_transaction_data_create(
      txHandle,
      outputsPtr,
      outputsLen
    ) as bigint;

    if (!ptr) {
      throw new Error("Failed to create native PrecomputedTransactionData");
    }

    super(ptr, true, null);
  }

  /**
     * Create a copy of this PrecomputedTransactionData instance.
     *
     * @returns A new instance pointing to a duplicated native cache handle.
     */
  override copy(): this {
    return super.copy();
  }
}

/**
 * Wrapper for the spending conditions of a transaction output.
 *
 * Construct a script from bytes or wrap an existing native pointer.
 * verify() checks a spending input against this script using the native
 * interpreter. Dispose owned script wrappers when finished.
 */
export class ScriptPubkey extends KernelOpaquePtr {
  protected static override destroyFn = btck_script_pubkey_destroy as (ptr: bigint) => void;

  protected static override copyFn = btck_script_pubkey_copy as (ptr: bigint) => bigint;

  /**
     * Wrap an existing native script public key pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer. Defaults to true.
     * @param parent - The parent object holding this reference, if it's a borrowed view. Defaults to null.
     */
  constructor(ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null);
  /**
     * Allocate a brand new native script public key structure from raw serialized bytes.
     *
     * @param data - The byte buffer containing the raw opcodes and script payload.
     */
  constructor(data: Uint8Array | Buffer);
  /**
     * Polymorphic implementation handling both direct pointer wrapping and native allocation from raw data.
     *
     * @throws {Error} If `btck_script_pubkey_create` is unavailable, or if the native
     * layer fails to allocate and returns an invalid null pointer handle.
     */
  constructor(arg1: bigint | Uint8Array | Buffer, arg2?: boolean, arg3: KernelOpaquePtr | null = null) {
    if (arg1 instanceof Uint8Array || Buffer.isBuffer(arg1)) {
      if (!btck_script_pubkey_create) {
        throw new Error("btck_script_pubkey_create unavailable");
      }
      const ptr = btck_script_pubkey_create(arg1, BigInt(arg1.length)) as bigint;
      if (!ptr) {
        throw new Error("Failed to create native ScriptPubkey");
      }
      super(ptr, true, null);
    } else {
      super(arg1, arg2 ?? true, arg3);
    }
  }

  /**
     * Serialize the script public key back into its raw binary format.
     *
     * @returns A Uint8Array containing the serialized script bytes.
     * @throws {Error} If `btck_script_pubkey_to_bytes` is unavailable.
     */
  toBytes(): Uint8Array {
    if (!btck_script_pubkey_to_bytes) {
      throw new Error("btck_script_pubkey_to_bytes unavailable");
    }

    const writer = new ByteWriter();

    return Uint8Array.from(
      writer.write(
        btck_script_pubkey_to_bytes,
        this.getHandle(),
      ),
    );
  }

  /**
     * Get the hexadecimal representation of the script payload.
     *
     * @returns The raw script opcodes and data serialized as a hex string.
     */
  toHex(): string {
    return Buffer.from(this.toBytes()).toString("hex");
  }

  /**
     * Return a string representation of the script pubkey.
     *
     * @returns The hex string representation of the script.
     */
  override toString(): string {
    return this.toHex();
  }

  /**
   * Verify a transaction input against this output script.
   *
   * The amount is in satoshis and must be an exact signed 64-bit integer.
   * The input index must identify an existing input, and flags may contain
   * only supported bits. These checks run before native verification.
   *
   * @param amount - Amount of the output being spent.
   * @param txTo - Spending transaction.
   * @param precomputedTxdata - Optional cache prepared for this transaction.
   * @param inputIndex - Zero-based input index.
   * @param flags - Script verification rules to enable.
   * @returns True if verification succeeds; false for script failure with OK status.
   * @throws {RangeError} If the amount, index, or flag bits are invalid.
   * @throws {ScriptVerifyException} If native verification reports a non-OK error status.
   * @throws {Error} If a required binding is unavailable or a handle is invalid.
   */
  verify(
    amount: bigint | number,
    txTo: Transaction,
    precomputedTxdata: PrecomputedTransactionData | null,
    inputIndex: number,
    flags: ScriptVerificationFlags
  ): boolean {
    if (!btck_script_pubkey_verify) {
      throw new Error("btck_script_pubkey_verify unavailable");
    }

    if (!Number.isSafeInteger(inputIndex) || inputIndex < 0 || inputIndex >= txTo.inputs.length) {
      throw new RangeError("Input index out of range");
    }

    flagsWithin(flags, ScriptVerificationFlags.ALL);

    // Allocate a 1-byte buffer to retrieve the uint8 status code back from the C-API pointer
    const kStatusOut = new Uint8Array(1);

    // Explicitly bypass TS sibling context barriers to read internal handles on complementary instances
    const txHandle = (txTo as any).getHandle();
    const precomputedHandle = precomputedTxdata ? (precomputedTxdata as any).getHandle() : 0n;

    const successInt = btck_script_pubkey_verify(
      this.getHandle(),
      int64(amount),
      txHandle,
      precomputedHandle,
      inputIndex,
      flags,
      kStatusOut
    );

    const success = Boolean(successInt);
    const status = kStatusOut[0] as ScriptVerifyStatus;

    if (!success && status !== ScriptVerifyStatus.OK) {
      throw new ScriptVerifyException(status);
    }

    return success;
  }

  /**
     * Create a copy of this ScriptPubkey instance.
     *
     * @returns A new instance pointing to a duplicated native handle.
     */
  override copy(): this {
    return super.copy();
  }
}
