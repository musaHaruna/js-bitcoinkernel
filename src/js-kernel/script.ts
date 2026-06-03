import { 
    btck_script_pubkey_copy, 
    btck_script_pubkey_create, 
    btck_script_pubkey_destroy, 
    btck_script_pubkey_to_bytes
} from "./ffi/bindings.js";
import { KernelOpaquePtr } from "./ffi/KernelOpaquePtr.js";
import { KernelException } from "./util/exceptions.js";
import { ByteWriter } from "./writer.js";
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
 * A Bitcoin script defining spending conditions for a transaction output (scriptPubKey).
 *
 * This wrapper encapsulates an opaque pointer to a compiled or raw native Bitcoin script. 
 * It contains the explicit consensus validation logic required to locked funds, which 
 * must be evaluated alongside a spending transaction input's witness or signature script.
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
            if (ptr === 0n) {
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
     * Create a copy of this ScriptPubkey instance.
     *
     * @returns A new instance pointing to a duplicated native handle.
     */
    override copy(): this {
        return super.copy();
    }
}