import {
    btck_txid_copy,
    btck_txid_destroy,
    btck_txid_equals,
    btck_txid_to_bytes,
} from "./ffi/bindings.js";

import { KernelOpaquePtr } from "./ffi/KernelOpaquePtr.js";

/**
 * Identifier for a Bitcoin transaction (Txid).
 *
 * High-level wrapper around a native Txid pointer. Provides safe lifecycle management 
 * and convenient conversion utilities.
 * * @note Txid instances cannot be directly constructed from raw bytes via the public API. 
 * They are obtained downstream from Transaction or TransactionOutPoint objects.
 */
export class Txid extends KernelOpaquePtr {
    protected static override destroyFn = btck_txid_destroy as (ptr: bigint) => void;

    protected static override copyFn = btck_txid_copy as (ptr: bigint) => bigint;

    /**
     * Create a Txid instance wrapping a native pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer. Defaults to true.
     * @param parent - The parent object holding this reference, if it's a borrowed view. Defaults to null.
     */
    constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
        super(ptr, ownsPtr, parent);
    }

    /**
     * Serialize the transaction ID into raw bytes.
     *
     * @returns A 32-byte Uint8Array representation in internal little-endian byte order.
     * @throws {Error} If btck_txid_to_bytes is unavailable.
     */
    toBytes(): Uint8Array {
        if (!btck_txid_to_bytes) {
            throw new Error("btck_txid_to_bytes unavailable");
        }

        const output = new Uint8Array(32);

        btck_txid_to_bytes(this.getHandle(), output);

        return output;
    }

    /**
     * Get the hexadecimal representation of the transaction ID.
     *
     * @returns The Txid as a 64-character hex string in big-endian 
     * byte order (standard Bitcoin display format).
     */
    override toString(): string {
        return Buffer.from(this.toBytes()).reverse().toString("hex");
    }

    /**
     * Compare equality with another Txid value using a native verification check.
     *
     * @param other - Object to compare with.
     * @returns True if both are Txid instances with matching underlying native values.
     * @throws {Error} If btck_txid_equals is unavailable.
     */
    equals(other: unknown): boolean {
        if (!(other instanceof Txid)) {
            return false;
        }

        if (!btck_txid_equals) {
            throw new Error("btck_txid_equals unavailable");
        }

        return Boolean(btck_txid_equals(this.getHandle(), other.getHandle()));
    }

    /**
     * Create a copy of this Txid instance.
     *
     * @returns A new instance pointing to a duplicated native handle.
     */
    override copy(): this {
        return super.copy();
    }
}