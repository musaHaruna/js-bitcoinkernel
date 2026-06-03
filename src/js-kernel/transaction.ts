import {
    btck_txid_copy,
    btck_txid_destroy,
    btck_txid_equals,
    btck_txid_to_bytes,

    btck_transaction_out_point_copy,
    btck_transaction_out_point_destroy,
    btck_transaction_out_point_get_index,
    btck_transaction_out_point_get_txid,
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

/**
 * Reference to a specific output of a Bitcoin transaction.
 *
 * A transaction outpoint uniquely identifies a UTXO (Unspent Transaction Output) or 
 * spent output by combining a 32-byte transaction ID (Txid) with a specific output index. 
 * This sequence is heavily utilized inside transaction inputs to prove which historical 
 * outputs are being claimed and spent.
 * * * @note TransactionOutPoint instances cannot be directly constructed via the public API. 
 * They are obtained downstream from TransactionInput objects.
 */
export class TransactionOutPoint extends KernelOpaquePtr {
    protected static override destroyFn = btck_transaction_out_point_destroy as (ptr: bigint) => void;

    protected static override copyFn = btck_transaction_out_point_copy as (ptr: bigint) => bigint;

    /**
     * Create a TransactionOutPoint instance wrapping a native pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer. Defaults to true.
     * @param parent - The parent object holding this reference, if it's a borrowed view. Defaults to null.
     */
    constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
        super(ptr, ownsPtr, parent);
    }

    /**
     * The output index within the transaction.
     *
     * @returns The zero-based output position (often referred to as `vout`).
     * @throws {Error} If btck_transaction_out_point_get_index is unavailable.
     */
    get index(): number {
        if (!btck_transaction_out_point_get_index) {
            throw new Error("btck_transaction_out_point_get_index unavailable");
        }

        return btck_transaction_out_point_get_index(this.getHandle());
    }

    /**
     * The transaction ID being referenced.
     *
     * @returns The Txid of the transaction containing the output, instantiated 
     * as a dependent non-owning view tied to the lifecycle of this outpoint.
     * @throws {Error} If btck_transaction_out_point_get_txid is unavailable, or if the native 
     * layer returns an invalid null pointer handle.
     */
    get txid(): Txid {
        if (!btck_transaction_out_point_get_txid) {
            throw new Error("btck_transaction_out_point_get_txid unavailable");
        }

        const ptr = btck_transaction_out_point_get_txid(this.getHandle()) as bigint;

        if (ptr === 0n) {
            throw new Error("Failed to get Txid pointer from TransactionOutPoint");
        }

        // Instantiated as a dependent view layout: ownsPtr = false, parent = this
        return new Txid(ptr, false, this);
    }

    /**
     * Return a string representation of the transaction outpoint.
     *
     * @returns A descriptive string showing the serialized Txid and output index.
     */
    override toString(): string {
        return `txid=${this.txid.toString()} index=${this.index}`;
    }

    /**
     * Create a copy of this TransactionOutPoint instance.
     *
     * @returns A new instance pointing to a duplicated native handle.
     */
    override copy(): this {
        return super.copy();
    }
}