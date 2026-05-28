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
/* BlockHash                                                                 
/* 

/**
 * High-level wrapper around a native BlockHash pointer.
 *
 * Provides safe lifecycle management and convenient conversion utilities.
 */
export class BlockHash extends KernelOpaquePtr {
    protected static override createFn = btck_block_hash_create as (...args: unknown[]) => bigint;

    protected static override destroyFn = btck_block_hash_destroy as (ptr: bigint) => void;

    protected static override copyFn = btck_block_hash_copy as (ptr: bigint) => bigint;

    constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
        super(ptr, ownsPtr, parent);
    }

    /**
     * Construct a BlockHash from a 32-byte raw hash.
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
     * Serialize the hash into raw 32-byte representation (little-endian).
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
     * Convert to Bitcoin-style hex string (big-endian display format).
     */
    override toString(): string {
        return Buffer.from(this.toBytes()).reverse().toString("hex");
    }

    /**
     * Compare two BlockHash values using native equality check.
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

    override copy(): this {
        return super.copy();
    }
}

/** 
/* BlockHeader                                                             
/* 

/**
 * High-level wrapper around a native BlockHeader pointer.
 *
 * Represents a parsed or constructed block header and provides
 * access to consensus-relevant fields and serialization utilities.
 */
export class BlockHeader extends KernelOpaquePtr {
    protected static override createFn = btck_block_header_create as (...args: unknown[]) => bigint;
    
    protected static override destroyFn = btck_block_header_destroy as (ptr: bigint) => void;
    
    protected static override copyFn = btck_block_header_copy as (ptr: bigint) => bigint;

    constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
        super(ptr, ownsPtr, parent);
    }

    /**
     * Parse a serialized 80-byte Bitcoin block header.
     */
    static fromBytes(rawHeader: Uint8Array): BlockHeader {
        if (rawHeader.length !== 80) {
            throw new Error(`BlockHeader requires 80 bytes, got ${rawHeader.length}`);
        }

        if (!btck_block_header_create) {
            throw new Error("btck_block_header_create unavailable");
        }

        const ptr = btck_block_header_create(rawHeader,rawHeader.length) as bigint;

        if (ptr === 0n) {
            throw new Error("Failed to parse BlockHeader");
        }

        return new BlockHeader(ptr, true);
    }

    /**
     * Compute and return the block hash (owned object).
     */
    get blockHash(): BlockHash {
        if (!btck_block_header_get_hash) {
            throw new Error("btck_block_header_get_hash unavailable");
        }

        const ptr = btck_block_header_get_hash(this.getHandle()) as bigint;

        return BlockHash.fromHandle(ptr);
    }

    /**
     * Get previous block hash as a borrowed view tied to this header.
     */
    get prevHash(): BlockHash {
        if (!btck_block_header_get_prev_hash) {
            throw new Error("btck_block_header_get_prev_hash unavailable");
        }

        const ptr = btck_block_header_get_prev_hash(this.getHandle()) as bigint;

        return BlockHash.fromView(ptr, this);
    }

    /**
     * Block timestamp converted to JavaScript Date.
     */
    get timestamp(): Date {
        if (!btck_block_header_get_timestamp) {
            throw new Error("btck_block_header_get_timestamp unavailable");
        }

        const epoch = btck_block_header_get_timestamp(this.getHandle()) as number;

        return new Date(epoch * 1000);
    }

    /**
     * Difficulty target bits.
     */
    get bits(): number {
        if (!btck_block_header_get_bits) {
            throw new Error("btck_block_header_get_bits unavailable");
        }

        return btck_block_header_get_bits(this.getHandle()) as number;
    }

    /**
     * Block version field.
     */
    get version(): number {
        if (!btck_block_header_get_version) {
            throw new Error("btck_block_header_get_version unavailable");
        }

        return btck_block_header_get_version(this.getHandle()) as number;
    }

    /**
     * Nonce used in Proof-of-Work.
     */
    get nonce(): number {
        if (!btck_block_header_get_nonce) {
            throw new Error("btck_block_header_get_nonce unavailable");
        }

        return btck_block_header_get_nonce(this.getHandle()) as number;
    }

    /**
     * Serialize header back into canonical 80-byte format.
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

    override copy(): this {
        return super.copy();
    }

    override toString(): string {
        return `BlockHeader hash=${this.blockHash.toString()}`;
    }
}
