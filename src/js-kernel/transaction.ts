import {
    btck_txid_copy,
    btck_txid_destroy,
    btck_txid_equals,
    btck_txid_to_bytes,

    btck_transaction_out_point_copy,
    btck_transaction_out_point_destroy,
    btck_transaction_out_point_get_index,
    btck_transaction_out_point_get_txid,

    btck_transaction_input_copy,
    btck_transaction_input_destroy,
    btck_transaction_input_get_out_point,
    btck_transaction_input_get_sequence,
    btck_transaction_output_copy,
    btck_transaction_output_create,
    btck_transaction_output_destroy,
    btck_transaction_output_get_amount,
    btck_transaction_output_get_script_pubkey,
} from "./ffi/bindings.js";

import { KernelOpaquePtr } from "./ffi/KernelOpaquePtr.js";
import { ScriptPubkey } from "./script.js";

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

/**
 * Input to a Bitcoin transaction that spends a historical transaction output.
 *
 * A transaction input (TxIn) spends an existing Unspent Transaction Output (UTXO) 
 * by referencing it through an explicit `TransactionOutPoint`. It contains the 
 * validation criteria (and sequence rules) required to successfully claim those funds.
 *
 * * @note TransactionInput instances cannot be directly constructed via the public API. 
 * They are obtained downstream from Transaction objects.
 */
export class TransactionInput extends KernelOpaquePtr {
    protected static override destroyFn = btck_transaction_input_destroy as (ptr: bigint) => void;

    protected static override copyFn = btck_transaction_input_copy as (ptr: bigint) => bigint;

    /**
     * Create a TransactionInput instance wrapping a native pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer. Defaults to true.
     * @param parent - The parent object holding this reference, if it's a borrowed view. Defaults to null.
     */
    constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
        super(ptr, ownsPtr, parent);
    }

    /**
     * The outpoint being spent by this input.
     *
     * @returns The TransactionOutPoint referencing the targeted previous output, 
     * instantiated as a dependent non-owning view tied to the lifecycle of this input.
     * @throws {Error} If btck_transaction_input_get_out_point is unavailable, or if the native 
     * layer returns an invalid null pointer handle.
     */
    get outPoint(): TransactionOutPoint {
        if (!btck_transaction_input_get_out_point) {
            throw new Error("btck_transaction_input_get_out_point unavailable");
        }

        const ptr = btck_transaction_input_get_out_point(this.getHandle()) as bigint;

        if (ptr === 0n) {
            throw new Error("Failed to get TransactionOutPoint pointer from TransactionInput");
        }

        // Instantiated as a dependent view layout: ownsPtr = false, parent = this
        return new TransactionOutPoint(ptr, false, this);
    }

    /**
     * The sequence number (nSequence) of this input.
     *
     * This field is typically applied to signal transaction opt-in Replace-By-Fee (RBF), 
     * handle relative locktimes (BIP 68), or disable absolute locktimes.
     *
     * @returns The 32-bit unsigned integer sequence value.
     * @throws {Error} If btck_transaction_input_get_sequence is unavailable.
     */
    get sequence(): number {
        if (!btck_transaction_input_get_sequence) {
            throw new Error("btck_transaction_input_get_sequence unavailable");
        }

        return btck_transaction_input_get_sequence(this.getHandle());
    }

    /**
     * Return a string representation of the transaction input.
     *
     * @returns A string representing the underlying outpoint spent by this input.
     */
    override toString(): string {
        return `${this.outPoint.toString()}`;
    }

    /**
     * Create a copy of this TransactionInput instance.
     *
     * @returns A new instance pointing to a duplicated native handle.
     */
    override copy(): this {
        return super.copy();
    }
}

/**
 * Output from a Bitcoin transaction (TxOut) that specifies transferable value.
 *
 * A transaction output defines the numeric amount of bitcoin (denominated in satoshis) 
 * being transferred, alongside the explicit spending conditions (`scriptPubkey`) 
 * that a future transaction input must satisfy to claim and spend the funds.
 *
 * This wrapper supports a dual lifecycle: it can either construct a brand new 
 * native allocation from an active script pubkey and value, or wrap an existing 
 * native memory address returned downstream from an established block or transaction.
 */
export class TransactionOutput extends KernelOpaquePtr {
    protected static override destroyFn = btck_transaction_output_destroy as (ptr: bigint) => void;
    protected static override copyFn = btck_transaction_output_copy as (ptr: bigint) => bigint;

    /**
     * Wrap an existing native transaction output pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer.
     * @param parent - The parent object holding this reference, if it's a borrowed view.
     */
    constructor(ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null);
    /**
     * Allocate a brand new native transaction output instance from components.
     *
     * @param scriptPubkey - The script public key defining the output's spending conditions.
     * @param amount - The value allocated to this output, denominated in satoshis.
     */
    constructor(scriptPubkey: ScriptPubkey, amount: bigint | number);
    /**
     * Polymorphic implementation handling both direct pointer wrapping and native allocation.
     *
     * @throws {Error} If `btck_transaction_output_create` is unavailable, or if the native 
     * allocation layer fails and returns an invalid null pointer handle.
     */
    constructor(arg1: bigint | ScriptPubkey, arg2?: boolean | bigint | number, arg3: KernelOpaquePtr | null = null) {
        if (arg1 instanceof ScriptPubkey) {
            if (!btck_transaction_output_create) {
                throw new Error("btck_transaction_output_create unavailable");
            }
            const amount = BigInt(arg2 as number | bigint);
            const ptr = btck_transaction_output_create((arg1 as any).getHandle(), amount) as bigint;
            if (ptr === 0n) {
                throw new Error("Failed to create native TransactionOutput");
            }
            super(ptr, true, null);
        } else {
            const ownsPtr = typeof arg2 === "boolean" ? arg2 : true;
            super(arg1 as bigint, ownsPtr, arg3 as KernelOpaquePtr | null);
        }
    }

    /**
     * The value of this output denominated in satoshis.
     *
     * @returns A 64-bit unsigned integer primitive representing the satoshi value.
     * @throws {Error} If `btck_transaction_output_get_amount` is unavailable.
     */
    get amount(): bigint {
        if (!btck_transaction_output_get_amount) {
            throw new Error("btck_transaction_output_get_amount unavailable");
        }
        // Force evaluation into a real runtime BigInt primitive
        return BigInt(btck_transaction_output_get_amount(this.getHandle()));
    }

    /**
     * The spending conditions bound to this output.
     *
     * @returns The ScriptPubkey defining validation criteria, instantiated 
     * as a dependent non-owning view tied directly to the lifecycle of this output.
     * @throws {Error} If `btck_transaction_output_get_script_pubkey` is unavailable, or if the native 
     * layer returns an invalid null pointer handle.
     */
    get scriptPubkey(): ScriptPubkey {
        if (!btck_transaction_output_get_script_pubkey) {
            throw new Error("btck_transaction_output_get_script_pubkey unavailable");
        }
        const ptr = btck_transaction_output_get_script_pubkey(this.getHandle()) as bigint;
        if (ptr === 0n) {
            throw new Error("Failed to get ScriptPubkey pointer from TransactionOutput");
        }
        return new ScriptPubkey(ptr, false, this);
    }

    /**
     * Return a string representation of the transaction output.
     *
     * @returns A descriptive string showing the satoshi amount and script pubkey byte length.
     */
    override toString(): string {
        return `<TransactionOutput amount=${this.amount} spk_len=${this.scriptPubkey.toBytes().length}>`;
    }

    /**
     * Create a copy of this TransactionOutput instance.
     *
     * @returns A new instance pointing to a duplicated native handle.
     */
    override copy(): this {
        return super.copy();
    }
}