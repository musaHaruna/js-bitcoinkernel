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

    btck_block_validation_state_create,
    btck_block_validation_state_destroy,
    btck_block_validation_state_copy,
    btck_block_validation_state_get_validation_mode,
    btck_block_validation_state_get_block_validation_result,
    btck_block_tree_entry_get_block_hash,
    btck_block_tree_entry_get_previous,
    btck_block_tree_entry_get_height,
    btck_block_tree_entry_equals,
    btck_block_tree_entry_get_ancestor,
    btck_block_tree_entry_get_block_header,
} from "./ffi/bindings.js";

import { KernelOpaquePtr } from "./ffi/KernelOpaquePtr.js";

/**
 * Unmanaged wrapper for a Bitcoin Block Hash identifier.
 *
 * Encapsulates a fixed 32-byte crypto digest uniquely identifying a block. 
 * This class safely abstracts native FFI lifecycles and handles essential formatting 
 * conversions, bridging internal low-level little-endian byte order processing 
 * with standard big-endian hexadecimal string representations used by RPCs and block explorers.
 */
export class BlockHash extends KernelOpaquePtr {
    protected static override createFn = btck_block_hash_create as (...args: unknown[]) => bigint;
    protected static override destroyFn = btck_block_hash_destroy as (ptr: bigint) => void;
    protected static override copyFn = btck_block_hash_copy as (ptr: bigint) => bigint;

    /**
     * Create a block hash wrapper instance from a native pointer.
     *
     * @param ptr - The native memory handle.
     * @param ownsPtr - Whether this instance governs the lifetime of the unmanaged pointer. Defaults to true.
     * @param parent - The parent memory boundary holding this reference, if it is a borrowed view. Defaults to null.
     */
    constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
        super(ptr, ownsPtr, parent);
    }

    /**
     * Allocate a brand new native block hash instance from a raw byte buffer.
     *
     * @param bytes - A 32-byte array containing the block hash in little-endian network byte order.
     * @returns A fresh, fully-owned BlockHash instance.
     * @throws {Error} If the provided byte array is not exactly 32 bytes long, if FFI bindings 
     * are unavailable, or if the underlying native constructor fails and returns a null pointer.
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
     * Serialize the underlying hash instance back into a raw binary buffer.
     *
     * @returns A 32-byte Uint8Array tracking the block hash in little-endian network byte order.
     * @throws {Error} If `btck_block_hash_to_bytes` function bindings are missing.
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
     * Convert the block hash into a human-readable hexadecimal string.
     *
     * Semantics automatically reverse the little-endian consensus serialization 
     * to match the big-endian display format standard throughout the Bitcoin ecosystem.
     *
     * @returns A 64-character big-endian hex string representation.
     */
    override toString(): string {
        return Buffer.from(this.toBytes()).reverse().toString("hex");
    }

    /**
     * Evaluate value equality against an arbitrary external object.
     *
     * @param other - Target candidate object evaluated for value parity.
     * @returns True if the target instance matches type boundaries and holds an identical byte sequence.
     * @throws {Error} If `btck_block_hash_equals` function bindings are missing.
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
     * @returns A new instance pointing to a duplicated native block hash handle.
     */
    override copy(): this {
        return super.copy();
    }
}

/**
 * Unmanaged wrapper for a Bitcoin Block Header.
 *
 * Maps directly to the fixed 80-byte header layout dictated by core consensus rules. 
 * Provides direct access to essential cryptographic parameters required to validate 
 * proof-of-work, track mining difficulty transitions, and reconstruct chain historical paths.
 */
export class BlockHeader extends KernelOpaquePtr {
    protected static override createFn = btck_block_header_create as (...args: unknown[]) => bigint;
    protected static override destroyFn = btck_block_header_destroy as (ptr: bigint) => void;
    protected static override copyFn = btck_block_header_copy as (ptr: bigint) => bigint;

    /**
     * Create a block header wrapper instance from a native pointer.
     *
     * @param ptr - The native memory handle.
     * @param ownsPtr - Whether this instance governs the lifetime of the unmanaged pointer. Defaults to true.
     * @param parent - The parent memory boundary holding this reference, if it is a borrowed view. Defaults to null.
     */
    constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
        super(ptr, ownsPtr, parent);
    }

    /**
     * Parse a new native block header block instance out of serialized consensus-format bytes.
     *
     * @param rawHeader - The raw byte stream under evaluation. Must be exactly 80 bytes long.
     * @returns A fresh, fully-owned BlockHeader instance.
     * @throws {Error} If the buffer size violates the strict 80-byte validation boundary, 
     * if FFI bindings are missing, or if native parsing fails.
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
     * Compute and retrieve the unique cryptographic identifier hash for this block header.
     *
     * * @note This method yields a **standalone, fully-owned copy** of the block hash 
     * generated at the native boundary. It maintains an independent lifecycle separate from the header.
     *
     * @returns An independent, owned {@link BlockHash} instance.
     * @throws {Error} If `btck_block_header_get_hash` function bindings are missing.
     */
    get blockHash(): BlockHash {
        if (!btck_block_header_get_hash) {
            throw new Error("btck_block_header_get_hash unavailable");
        }

        const ptr = btck_block_header_get_hash(this.getHandle()) as bigint;

        return BlockHash.fromHandle(ptr);
    }

    /**
     * Extract the cryptographic hash reference mapping to the immediate ancestor block.
     *
     * * @note This method returns a **dependent borrowed view** whose unmanaged lifespan 
     * is explicitly chained to this parent header instance to prevent use-after-free anomalies.
     *
     * @returns A non-owning, dependent {@link BlockHash} reference view.
     * @throws {Error} If `btck_block_header_get_prev_hash` function bindings are missing.
     */
    get prevHash(): BlockHash {
        if (!btck_block_header_get_prev_hash) {
            throw new Error("btck_block_header_get_prev_hash unavailable");
        }

        const ptr = btck_block_header_get_prev_hash(this.getHandle()) as bigint;

        return BlockHash.fromView(ptr, this);
    }

    /**
     * The block production timestamp reported by the mining node.
     *
     * Consensus rules enforce that this value must be strictly greater than the median 
     * timestamp of the previous 11 blocks, and less than the network-adjusted time plus 2 hours.
     *
     * @returns A JavaScript `Date` instance representing the block generation point.
     * @throws {Error} If `btck_block_header_get_timestamp` function bindings are missing.
     */
    get timestamp(): Date {
        if (!btck_block_header_get_timestamp) {
            throw new Error("btck_block_header_get_timestamp unavailable");
        }

        const epoch = btck_block_header_get_timestamp(this.getHandle()) as number;

        return new Date(epoch * 1000);
    }

    /**
     * The difficulty target value compressed into a compact `nBits` numerical sequence format.
     *
     * This 32-bit field encodes the threshold target value that the block hash must 
     * fall below to meet Proof-of-Work validity requirements.
     *
     * @returns The 32-bit unsigned integer nBits difficulty target.
     * @throws {Error} If `btck_block_header_get_bits` function bindings are missing.
     */
    get bits(): number {
        if (!btck_block_header_get_bits) {
            throw new Error("btck_block_header_get_bits unavailable");
        }

        return btck_block_header_get_bits(this.getHandle()) as number;
    }

    /**
     * The block version parameters bitfield configuration.
     *
     * Signals network protocol upgrades, soft fork deployment flags, and BIP signaling states.
     *
     * @returns The signed 32-bit block version integer.
     * @throws {Error} If `btck_block_header_get_version` function bindings are missing.
     */
    get version(): number {
        if (!btck_block_header_get_version) {
            throw new Error("btck_block_header_get_version unavailable");
        }

        return btck_block_header_get_version(this.getHandle()) as number;
    }

    /**
     * The Proof-of-Work nonce value.
     *
     * An arbitrary 32-bit entropy sequence field modified during miner hashing loops 
     * to discover a valid output header hash meeting the target constraints.
     *
     * @returns The 32-bit unsigned integer nonce value.
     * @throws {Error} If `btck_block_header_get_nonce` function bindings are missing.
     */
    get nonce(): number {
        if (!btck_block_header_get_nonce) {
            throw new Error("btck_block_header_get_nonce unavailable");
        }

        return btck_block_header_get_nonce(this.getHandle()) as number;
    }

    /**
     * Serialize the core structural components of the header back into its raw binary format.
     *
     * @returns An 80-byte Uint8Array serialized block header in standard Bitcoin consensus format.
     * @throws {Error} If native serialization bindings are missing or code execution registers errors.
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
     * @returns A new instance pointing to a duplicated native block header allocation handle.
     */
    override copy(): this {
        return super.copy();
    }

    /**
     * Return a clean string representation of the block header.
     *
     * @returns A diagnostic string capturing the big-endian hexadecimal hash identifier path.
     */
    override toString(): string {
        return `BlockHeader hash=${this.blockHash.toString()}`;
    }
}

/**
 * High-level macro resolution of an individual validation pipeline pass.
 *
 * Indicates whether an unmanaged block structure successfully satisfied consensus,
 * definitively violated validation invariants, or stalled due to operational environmental issues.
 */
export enum ValidationMode {
    /** The target structure passed all structural, contextual, and cryptographic validation passes. */
    VALID = 0,
    /** Validation failed due to explicit script, consensus, or context rule violations. */
    INVALID = 1,
    /** An internal execution failure or resource issue occurred during evaluation (e.g., disk I/O failure). */
    INTERNAL_ERROR = 2
}

/**
 * Granular consensus rejection metrics detailing why a block validation attempt failed.
 *
 * Provides specialized tracking tokens mirroring the underlying Bitcoin Core engine rejections.
 * These metrics differentiate between basic cryptographic defects, malicious structural anomalies, 
 * and sequence orchestration gaps.
 */
export enum BlockValidationResult {
    /** Initial fallback state; indicates the block under review has not yet run into a rejection constraint. */
    UNSET = 0,
    
    /** * Rejected by core consensus rules.
     * Includes standard execution anomalies like illegal coinbase rewards, structural block size violations, 
     * or invalid transaction scripts.
     */
    CONSENSUS = 1,
    
    /** The block hash matches a known entry in the internal invalidity block cache memory. */
    CACHED_INVALID = 2,
    
    /** * The header fails structural requirements.
     * Indicates an invalid proof-of-work digest (hash above target difficulty threshold) or structurally corrupt components.
     */
    INVALID_HEADER = 3,
    
    /** * Merkle tree hashing mutation detected.
     * Indicates a transaction list structure exploit attempt exploiting internal Merkle tree padding vulnerabilities 
     * (e.g., duplicating transactions to generate identical Merkle root hashes).
     */
    MUTATED = 4,
    
    /** * The immediate parent block referenced by `prevHash` is absent from disk index storage.
     * Classifies the target block as an orphan.
     */
    MISSING_PREV = 5,
    
    /** The immediate ancestor block this header attempts to build upon has already been explicitly marked invalid. */
    INVALID_PREV = 6,
    
    /** * The header timestamp violates consensus timeline boundaries.
     * The declared timestamp falls more than 2 hours ahead of the local node's network-adjusted median-time-past calculation.
     */
    TIME_FUTURE = 7,
    
    /** The block header resides on a fork branch that fails to meet minimum required proof-of-work checkpoint milestones. */
    HEADER_LOW_WORK = 8
}

/**
 * Opaque thread-safe state container tracking the status of an active block validation pass.
 *
 * This class acts as the central interface reporting block verification outcomes. 
 * It can wrap an active, borrowed pointer issued by internal consensus verification engines, 
 * or allocate an isolated, fresh state block directly on the native kernel heap.
 */
export class BlockValidationState extends KernelOpaquePtr {
    protected static override createFn = btck_block_validation_state_create as (...args: unknown[]) => bigint;
    protected static override destroyFn = btck_block_validation_state_destroy as (ptr: bigint) => void;
    protected static override copyFn = btck_block_validation_state_copy as (ptr: bigint) => bigint;

    /**
     * Instantiate a new validation state container.
     *
     * @param ptr - Optional handle pointing to an existing native state block. If omitted, 
     * the constructor dynamically allocates a brand new validation state tracking block on the native heap.
     * @param ownsPtr - Whether this JavaScript class wrapper actively manages the unmanaged memory lifecycle. Defaults to true.
     * @param parent - Structural parent object pinning this state visibility within an explicit parent lifecycle boundary.
     * * @throws {Error} If `btck_block_validation_state_create` function bindings are missing, or if native allocator logic fails.
     */
    constructor(ptr?: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
        if (ptr === undefined) {
            if (!btck_block_validation_state_create) {
                throw new Error("btck_block_validation_state_create unavailable");
            }
            
            const newPtr = btck_block_validation_state_create() as bigint;
            
            if (newPtr === 0n) {
                throw new Error("Failed to create BlockValidationState");
            }
            
            super(newPtr, true, null);
        } else {
            super(ptr, ownsPtr, parent);
        }
    }

    /**
     * Extract the macro execution outcome matching this validation pipeline.
     *
     * @returns A {@link ValidationMode} token representing the baseline processing status.
     * @throws {Error} If `btck_block_validation_state_get_validation_mode` function bindings are missing.
     */
    get validationMode(): ValidationMode {
        if (!btck_block_validation_state_get_validation_mode) {
            throw new Error("btck_block_validation_state_get_validation_mode unavailable");
        }

        const mode = btck_block_validation_state_get_validation_mode(this.getHandle()) as number;
        
        return mode as ValidationMode;
    }

    /**
     * Extract the detailed micro-level failure reason assigned to this validation window.
     *
     * @returns A {@link BlockValidationResult} code. If the block successfully passes validation, returns `BlockValidationResult.UNSET`.
     * @throws {Error} If `btck_block_validation_state_get_block_validation_result` function bindings are missing.
     */
    get blockValidationResult(): BlockValidationResult {
        if (!btck_block_validation_state_get_block_validation_result) {
            throw new Error("btck_block_validation_state_get_block_validation_result unavailable");
        }

        const result = btck_block_validation_state_get_block_validation_result(this.getHandle()) as number;
        
        return result as BlockValidationResult;
    }

    /**
     * Create a copy of this BlockValidationState instance.
     *
     * @returns A new instance pointing to a duplicated native validation state handle.
     */
    override copy(): this {
        return super.copy();
    }
}

/**
 * An entry within the internal in-memory block tree graph index.
 *
 * This class wraps an opaque pointer to a block index node (equivalent to `CBlockIndex` 
 * in Bitcoin Core). It represents a structural block validation checkpoint known to the 
 * chainstate manager. Because it tracks all validated headers received over the network, 
 * this structure forms a tree tracking competing alternative fork branches alongside 
 * the main active consensus chain (the tip).
 */
export class BlockTreeEntry extends KernelOpaquePtr {
    /**
     * Wrap an existing native block tree entry pointer.
     *
     * @param ptr - The native memory handle.
     * @param ownsPtr - Whether this instance governs the lifetime of the unmanaged pointer. Defaults to false.
     * @param parent - The parent memory context (typically the global chainstate tracking layer). Defaults to null.
     */
    constructor(
        ptr: bigint,
        ownsPtr = false,
        parent: KernelOpaquePtr | null = null,
    ) {
        super(ptr, ownsPtr, parent);
    }

    /**
     * The unique cryptographic block hash identifier represented by this entry.
     *
     * * @note This returns a **borrowed view** tied directly to the lifetime of this entry instance. 
     * To prevent memory errors, do not manually delete or store this view beyond the entry's scope.
     *
     * @returns A {@link BlockHash} reference view.
     * @throws {Error} If `btck_block_tree_entry_get_block_hash` function bindings are missing.
     */
    get blockHash(): BlockHash {
        if (!btck_block_tree_entry_get_block_hash) {
            throw new Error("btck_block_tree_entry_get_block_hash unavailable");
        }

        const ptr = btck_block_tree_entry_get_block_hash(
            this.getHandle(),
        ) as bigint;

        return BlockHash.fromView(ptr, this);
    }

    /**
     * The height of this block in the blockchain ledger topology.
     *
     * Represents the absolute distance from the genesis block, where the genesis 
     * block is strictly defined at height `0`.
     *
     * @returns The non-negative block height integer index.
     * @throws {Error} If `btck_block_tree_entry_get_height` function bindings are missing.
     */
    get height(): number {
        if (!btck_block_tree_entry_get_height) {
            throw new Error("btck_block_tree_entry_get_height unavailable");
        }

        return btck_block_tree_entry_get_height(
            this.getHandle(),
        ) as number;
    }

    /**
     * The immediate parent block tree entry.
     *
     * Resolves the ancestral block indexing handle located immediately prior to this block.
     * Returns `null` or an invalid pointer state if evaluated at the genesis block boundary.
     *
     * * @note This returns a **borrowed view** tied to the same parent chainstate context 
     * governing this entry, maintaining safety across parent tree re-org mutations.
     *
     * @returns A {@link BlockTreeEntry} view mapping the parent block node.
     * @throws {Error} If `btck_block_tree_entry_get_previous` function bindings are missing.
     */
    get previous(): BlockTreeEntry {
        if (!btck_block_tree_entry_get_previous) {
            throw new Error("btck_block_tree_entry_get_previous unavailable");
        }

        const ptr = btck_block_tree_entry_get_previous(
            this.getHandle(),
        ) as bigint;

        return BlockTreeEntry.fromView(ptr, this.parent);
    }

    /**
     * The full 80-byte consensus block header structure represented by this entry.
     *
     * * @note Unlike the hash or previous entry fields, this method constructs a 
     * **fully independent, owned object** instance copy. Its unmanaged native memory structure 
     * lifecycle is governed explicitly by the resulting JavaScript wrapper.
     *
     * @returns A fresh, fully-owned {@link BlockHeader} instance.
     * @throws {Error} If `btck_block_tree_entry_get_block_header` function bindings are missing.
     */
    get blockHeader(): BlockHeader {
        if (!btck_block_tree_entry_get_block_header) {
            throw new Error("btck_block_tree_entry_get_block_header unavailable");
        }

        const ptr = btck_block_tree_entry_get_block_header(
            this.getHandle(),
        ) as bigint;

        return BlockHeader.fromHandle(ptr);
    }

    /**
     * Retrieve an ancestral block entry located at a specific historical chain height.
     *
     * Traverses backwards through the historical blockchain path to isolate the ancestor block. 
     * * @note Optimization: The underlying native layer utilizes an internal skip-list index 
     * structure (jump tables). This drops traversal search overhead from linear time down to an 
     * efficient logarithmic scale, or `$O(\log N)$`.
     *
     * @param height - The target historical block height integer to query.
     * @returns A borrowed {@link BlockTreeEntry} view mapping the ancestor block at the requested height.
     * @throws {RangeError} If the target height falls outside the acceptable range `[0, this.height]`.
     * @throws {Error} If `btck_block_tree_entry_get_ancestor` function bindings are missing.
     */
    getAncestor(height: number): BlockTreeEntry {
        if (height < 0 || height > this.height) {
            throw new RangeError(
                `height ${height} out of range for entry at height ${this.height}`,
            );
        }

        if (!btck_block_tree_entry_get_ancestor) {
            throw new Error("btck_block_tree_entry_get_ancestor unavailable");
        }

        const ptr = btck_block_tree_entry_get_ancestor(
            this.getHandle(),
            height,
        ) as bigint;

        return BlockTreeEntry.fromView(ptr, this.parent);
    }

    /**
     * Check value equality against another candidate block tree entry.
     *
     * Compares the underlying unmanaged native memory structure handle addresses to 
     * verify structural identity inside the index graph.
     *
     * @param other - The candidate object targeted for comparison.
     * @returns True if both are BlockTreeEntry instances pointing to the same underlying native struct.
     * @throws {Error} If `btck_block_tree_entry_equals` function bindings are missing.
     */
    equals(other: unknown): boolean {
        if (!(other instanceof BlockTreeEntry)) {
            return false;
        }

        if (!btck_block_tree_entry_equals) {
            throw new Error("btck_block_tree_entry_equals unavailable");
        }

        return Boolean(
            btck_block_tree_entry_equals(
                this.getHandle(),
                other.getHandle(),
            ),
        );
    }

    /**
     * Return a clean string representation of the block tree entry properties.
     *
     * @returns A diagnostic string capturing the block height and big-endian hexadecimal hash path.
     */
    override toString(): string {
        return `<BlockTreeEntry height=${this.height} hash=${this.blockHash}>`;
    }
}