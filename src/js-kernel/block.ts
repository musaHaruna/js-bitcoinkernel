import {
    btck_block_hash_create,
    btck_block_hash_destroy,
    btck_block_hash_copy,
    btck_block_hash_equals,
    btck_block_hash_to_bytes,

    btck_block_header_create,
    btck_block_header_destroy,
    btck_block_header_copy,
    btck_block_header_get_hash,
    btck_block_header_get_prev_hash,
    btck_block_header_get_timestamp,
    btck_block_header_get_bits,
    btck_block_header_get_version,
    btck_block_header_get_nonce,
    btck_block_header_to_bytes,
} from "./ffi/bindings.js";

import { KernelOpaquePtr } from "./ffi/KernelOpaquePtr.js";

/**
 * BlockHash (Identifier for a block).
 *
 * Provides safe lifecycle management and convenient conversion utilities.
 */
export class BlockHash extends KernelOpaquePtr {
    protected static override createFn = btck_block_hash_create as (...args: unknown[]) => bigint;

    protected static override destroyFn = btck_block_hash_destroy as (ptr: bigint) => void;

    protected static override copyFn = btck_block_hash_copy as (ptr: bigint) => bigint;

    /**
     * Create a block hash instance wrapping a native pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer. Defaults to true.
     * @param parent - The parent object holding this reference, if it's a borrowed view. Defaults to null.
     */
    constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
        super(ptr, ownsPtr, parent);
    }

    /**
     * Create a block hash from raw bytes.
     *
     * @param bytes - The 32-byte block hash in little-endian byte order.
     * @returns A new BlockHash instance.
     * @throws {Error} If the block hash is not exactly 32 bytes, or if creation fails.
     */
    static fromBytes(bytes: Uint8Array): BlockHash {
        if (bytes.length !== 32) {
            throw new Error(`BlockHash requires 32 bytes, got ${bytes.length}`);
        }

        if (!btck_block_hash_create) {
            throw new Error("btck_block_hash_create unavailable");
        }

        const ptr = btck_block_hash_create(bytes) as bigint;

        if (ptr === 0n) {
            throw new Error("Failed to create BlockHash");
        }

        return new BlockHash(ptr, true);
    }

    /**
     * Serialize the block hash to bytes.
     *
     * @returns The 32-byte block hash in little-endian byte order.
     * @throws {Error} If btck_block_hash_to_bytes is unavailable.
     */
    toBytes(): Uint8Array {
        if (!btck_block_hash_to_bytes) {
            throw new Error("btck_block_hash_to_bytes unavailable");
        }

        const output = new Uint8Array(32);

        btck_block_hash_to_bytes(this.getHandle(), output);

        return output;
    }

    /**
     * Get the hexadecimal representation of the block hash.
     *
     * @returns The block hash as a 64-character hex string in big-endian
     * byte order (standard Bitcoin display format).
     */
    override toString(): string {
        return Buffer.from(this.toBytes()).reverse().toString("hex");
    }

    /**
     * Check equality with another block hash.
     *
     * @param other - Object to compare with.
     * @returns True if both are BlockHash instances with equal values.
     * @throws {Error} If btck_block_hash_equals is unavailable.
     */
    equals(other: unknown): boolean {
        if (!(other instanceof BlockHash)) {
            return false;
        }

        if (!btck_block_hash_equals) {
            throw new Error("btck_block_hash_equals unavailable");
        }

        return Boolean(btck_block_hash_equals(this.getHandle(), other.getHandle()));
    }

    /**
     * Create a copy of this BlockHash instance.
     *
     * @returns A new instance pointing to a duplicated native handle.
     */
    override copy(): this {
        return super.copy();
    }
}

/**
 * BlockHeader.
 *
 * Represents a parsed or constructed block header and provides
 * access to consensus-relevant fields and serialization utilities.
 */
export class BlockHeader extends KernelOpaquePtr {
    protected static override createFn = btck_block_header_create as (...args: unknown[]) => bigint;
    
    protected static override destroyFn = btck_block_header_destroy as (ptr: bigint) => void;
    
    protected static override copyFn = btck_block_header_copy as (ptr: bigint) => bigint;

    /**
     * Create a block header instance wrapping a native pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer. Defaults to true.
     * @param parent - The parent object holding this reference, if it's a borrowed view. Defaults to null.
     */
    constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
        super(ptr, ownsPtr, parent);
    }

    /**
     * Create a block header from serialized data.
     *
     * @param rawHeader - The serialized block header data in consensus format. Must be 80 bytes.
     * @returns A new BlockHeader instance.
     * @throws {Error} If rawHeader is not exactly 80 bytes or if parsing the block header data fails.
     */
    static fromBytes(rawHeader: Uint8Array): BlockHeader {
        if (rawHeader.length !== 80) {
            throw new Error(`BlockHeader requires 80 bytes, got ${rawHeader.length}`);
        }

        if (!btck_block_header_create) {
            throw new Error("btck_block_header_create unavailable");
        }

        const ptr = btck_block_header_create(rawHeader, rawHeader.length) as bigint;

        if (ptr === 0n) {
            throw new Error("Failed to parse BlockHeader");
        }

        return new BlockHeader(ptr, true);
    }

    /**
     * The block hash.
     *
     * @returns The block hash. Owned handle.
     * @throws {Error} If btck_block_header_get_hash is unavailable.
     */
    get blockHash(): BlockHash {
        if (!btck_block_header_get_hash) {
            throw new Error("btck_block_header_get_hash unavailable");
        }

        const ptr = btck_block_header_get_hash(this.getHandle()) as bigint;

        return BlockHash.fromHandle(ptr);
    }

    /**
     * The previous block hash.
     *
     * @returns The previous block hash. View into this header.
     * @throws {Error} If btck_block_header_get_prev_hash is unavailable.
     */
    get prevHash(): BlockHash {
        if (!btck_block_header_get_prev_hash) {
            throw new Error("btck_block_header_get_prev_hash unavailable");
        }

        const ptr = btck_block_header_get_prev_hash(this.getHandle()) as bigint;

        return BlockHash.fromView(ptr, this);
    }

    /**
     * The timestamp.
     *
     * @returns The block timestamp converted to a JavaScript Date.
     * @throws {Error} If btck_block_header_get_timestamp is unavailable.
     */
    get timestamp(): Date {
        if (!btck_block_header_get_timestamp) {
            throw new Error("btck_block_header_get_timestamp unavailable");
        }

        const epoch = btck_block_header_get_timestamp(this.getHandle()) as number;

        return new Date(epoch * 1000);
    }

    /**
     * The nBits difficulty target.
     *
     * @returns The difficulty target bits.
     * @throws {Error} If btck_block_header_get_bits is unavailable.
     */
    get bits(): number {
        if (!btck_block_header_get_bits) {
            throw new Error("btck_block_header_get_bits unavailable");
        }

        return btck_block_header_get_bits(this.getHandle()) as number;
    }

    /**
     * The version.
     *
     * @returns The block version field.
     * @throws {Error} If btck_block_header_get_version is unavailable.
     */
    get version(): number {
        if (!btck_block_header_get_version) {
            throw new Error("btck_block_header_get_version unavailable");
        }

        return btck_block_header_get_version(this.getHandle()) as number;
    }

    /**
     * The nonce.
     *
     * @returns The nonce used in Proof-of-Work.
     * @throws {Error} If btck_block_header_get_nonce is unavailable.
     */
    get nonce(): number {
        if (!btck_block_header_get_nonce) {
            throw new Error("btck_block_header_get_nonce unavailable");
        }

        return btck_block_header_get_nonce(this.getHandle()) as number;
    }

    /**
     * Serialize the block header to bytes.
     *
     * @returns The 80-byte serialized block header in consensus format.
     * @throws {Error} If serialization fails or native function is unavailable.
     */
    toBytes(): Uint8Array {
        if (!btck_block_header_to_bytes) {
            throw new Error("btck_block_header_to_bytes unavailable");
        }

        const output = new Uint8Array(80);

        const ret = btck_block_header_to_bytes(this.getHandle(), output) as number;

        if (ret !== 0) {
            throw new Error(`BlockHeader serialization failed with code ${ret}`);
        }

        return output;
    }

    /**
     * Create a copy of this BlockHeader instance.
     *
     * @returns A new instance pointing to a duplicated native handle.
     */
    override copy(): this {
        return super.copy();
    }

    /**
     * Return a string representation of the block header.
     *
     * @returns A string representing the block header.
     */
    override toString(): string {
        return `BlockHeader hash=${this.blockHash.toString()}`;
    }
}
