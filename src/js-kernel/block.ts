import {
  btck_block_hash_create,
  btck_block_hash_destroy,
  btck_block_hash_copy,
  btck_block_hash_equals,
  btck_block_hash_to_bytes,
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
