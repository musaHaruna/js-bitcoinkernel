import { ConsensusParams } from "./chain.js";
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

  btck_block_count_transactions,
  btck_block_get_transaction_at,

  btck_block_check,
  btck_block_copy,
  btck_block_create,
  btck_block_destroy,
  btck_block_get_hash,
  btck_block_get_header,
  btck_block_to_bytes,

  btck_block_spent_outputs_count,
  btck_block_spent_outputs_get_transaction_spent_outputs_at,
  btck_block_spent_outputs_destroy,
  btck_block_spent_outputs_copy,
} from "./ffi/bindings.js";
import koffi from "koffi"
import { KernelOpaquePtr } from "./ffi/KernelOpaquePtr.js";
import { Transaction, TransactionSpentOutputs } from "./transaction.js";
import { LazySequence } from "./util/sequence.js";

/**
 * Bitflags controlling optional context-free validation checks performed on a block structure.
 *
 * "Context-free" checks are structural verifications that can be evaluated on an isolated block
 * immediately upon receipt over the network, completely independent of the current active chain state,
 * block height, or UTXO database availability.
 * * Multiple flags can be packed together using bitwise OR operations (e.g., `BlockCheckFlags.POW | BlockCheckFlags.MERKLE`).
 */
export enum BlockCheckFlags {
  /** * Execute only minimal baseline structural verification rules.
     * * Ensures the raw block size complies with maximum limits and that the transaction vector is non-empty.
     */
  BASE = 0,

  /** * Execute Proof-of-Work hash threshold verification.
     * * Validates that the computed block header double-SHA256 hash actually satisfies the difficulty target encoded
     * inside the header's `nBits` field.
     */
  POW = 1 << 0,

  /** * Reconstruct and verify the Merkle Root architecture.
     * * Re-hashes the complete list of transactions inside the block to guarantee parity with the `hashMerkleRoot` field
     * committed in the header. Crucially, this pass screens for malicious Merkle tree transaction list mutation attacks.
     */
  MERKLE = 1 << 1,

  /** Enable all optional structural, cryptographic, and mathematical context-free block checks. */
  ALL = (1 << 0) | (1 << 1),
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

/**
 * A lazily-evaluated sequence view over the vector of transactions contained within a block.
 *
 * This collection implements a memory-efficient lookahead window providing random indexed access
 * to individual transactions. Instead of instantiating all transaction wrappers simultaneously on
 * block loading, it dynamically reads pointer references from the native layer on-demand and
 * memoizes the sequence length to minimize foreign function interface (FFI) overhead.
 */
export class TransactionSequence extends LazySequence<Transaction> {
  /** The parent block architecture holding the native transaction storage array. */
  private _block: Block;
  /** Memoized sequence size storage to optimize sequence boundary checks. */
  private _cachedLen?: number;

  /**
     * Create a lazy transaction sequence view for a block.
     *
     * @param block - The parent block instance containing the transaction vector.
     */
  constructor(block: Block) {
    super();
    this._block = block;
  }

  /**
     * The total number of transactions committed within this block.
     * * Requested from the native library boundary on the first call and cached for
     * subsequent evaluations to ensure subsequent length queries resolve in O(1) time.
     *
     * @returns The evaluated array size integer.
     * @throws {Error} If `btck_block_count_transactions` function bindings are missing.
     */
  get length(): number {
    if (this._cachedLen === undefined) {
      if (!btck_block_count_transactions) {
        throw new Error("btck_block_count_transactions unavailable");
      }

      // Cast to 'any' to bypass cross-subclass protected access restrictions
      const count = btck_block_count_transactions((this._block as any).getHandle()) as bigint;
      this._cachedLen = Number(count);
    }
    return this._cachedLen;
  }

  /**
     * Retrieve a transaction entry located at a specific positional index offset.
     * * This method fulfills the internal abstraction contract of the base `LazySequence`.
     *
     * @param index - The zero-based array index position to evaluate.
     * @returns A `Transaction` instance configured as a non-owning view bound to the parent block's lifecycle.
     * @throws {RangeError} If the index argument drops below 0 or goes out of bounds.
     * @throws {Error} If the native FFI function bindings are missing or pointer extraction fails.
     */
  public override getItem(index: number): Transaction {
    if (this._cachedLen !== undefined && (index < 0 || index >= this._cachedLen)) {
      throw new RangeError(`Index out of bounds: ${index}`);
    }

    if (!btck_block_get_transaction_at) {
      throw new Error("btck_block_get_transaction_at unavailable");
    }

    // Cast to 'any' to bypass cross-subclass protected access restrictions
    const txPtr = btck_block_get_transaction_at((this._block as any).getHandle(), BigInt(index)) as bigint;

    if (txPtr === 0n) {
      throw new Error(`Failed to get transaction at index ${index}`);
    }

    // We do not own the pointer (ownsPtr = false) and tie its lifetime to the parent block context
    return new Transaction(txPtr, false, this._block);
  }
}

/**
 * Unmanaged wrapper for a deserialized Bitcoin Block.
 *
 * This class acts as the primary data container representing a full Bitcoin block
 * (comprising the 80-byte block header and the full vector of transactions, including
 * the initial coinbase transaction). It interfaces directly with the native kernel layer
 * to handle network-wire deserialization, state serialization, random-access transaction
 * slicing, and contextual validation sweeps.
 */
export class Block extends KernelOpaquePtr {
  protected static override createFn = btck_block_create as (...args: unknown[]) => bigint;
  protected static override destroyFn = btck_block_destroy as (ptr: bigint) => void;
  protected static override copyFn = btck_block_copy as (ptr: bigint) => bigint;

  /**
     * Create a block wrapper instance from a native pointer.
     *
     * @param ptr - The native memory handle.
     * @param ownsPtr - Whether this instance governs the lifecycle of the unmanaged pointer. Defaults to true.
     * @param parent - The parent memory boundary holding this reference, if it is a borrowed view. Defaults to null.
     */
  constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
    super(ptr, ownsPtr, parent);
  }

  /**
     * Parse a complete native block structure out of serialized P2P consensus-format bytes.
     *
     * Decodes the raw binary payload containing the block header, transaction counter,
     * and full transaction stream into an allocated native memory block.
     *
     * @param rawBlock - The raw binary buffer representing the serialized consensus block.
     * @returns A fresh, fully-owned Block instance.
     * @throws {Error} If FFI bindings are unavailable or if native parsing fails (returning a null pointer).
     */
  static fromBytes(rawBlock: Uint8Array): Block {
    if (!btck_block_create) {
      throw new Error("btck_block_create unavailable");
    }

    const ptr = btck_block_create(rawBlock, BigInt(rawBlock.length)) as bigint;

    if (ptr === 0n) {
      throw new Error("Failed to create Block from raw bytes");
    }

    return new Block(ptr, true);
  }

  /**
     * Compute and retrieve the unique cryptographic block hash identifier.
     *
     * Executes a native double-SHA256 (`SHA256(SHA256(...))`) calculation directly over
     * the block's internal 80-byte header component.
     *
     * * @note This method yields a **standalone, fully-owned copy** of the block hash
     * generated at the native boundary. It maintains an independent lifecycle separate from this block.
     *
     * @returns An independent, owned {@link BlockHash} instance.
     * @throws {Error} If `btck_block_get_hash` function bindings are missing or pointer extraction fails.
     */
  get blockHash(): BlockHash {
    if (!btck_block_get_hash) {
      throw new Error("btck_block_get_hash unavailable");
    }

    const ptr = btck_block_get_hash(this.getHandle()) as bigint;

    if (ptr === 0n) {
      throw new Error("Failed to get block hash");
    }

    return new BlockHash(ptr, true);
  }

  /**
     * Isolate and extract the standalone block header structure.
     *
     * * @note This method returns a **fully-owned copy** of the 80-byte header sub-component.
     * Modifications or destruction of the returned {@link BlockHeader} will not destabilize
     * the underlying parent block context.
     *
     * @returns An independent, owned {@link BlockHeader} instance.
     * @throws {Error} If `btck_block_get_header` function bindings are missing or pointer extraction fails.
     */
  get blockHeader(): BlockHeader {
    if (!btck_block_get_header) {
      throw new Error("btck_block_get_header unavailable");
    }

    const ptr = btck_block_get_header(this.getHandle()) as bigint;

    if (ptr === 0n) {
      throw new Error("Failed to get block header");
    }

    return new BlockHeader(ptr, true);
  }

  /**
     * Access the full underlying transaction vector via a streaming sequence view.
     *
     * @returns A {@link TransactionSequence} proxy enabling lazy lookahead evaluation of the
     * block's transaction arrays, inclusive of the initial positional coinbase entry.
     */
  get transactions(): TransactionSequence {
    return new TransactionSequence(this);
  }

  /**
     * Serialize the complete internal block layout back into its raw binary network representation.
     *
     * Orchestrates an unmanaged-to-managed stream pipeline. The native engine passes dynamic memory
     * chunks to a runtime callback proxy (`WriteBytesCb`), which decodes unmanaged uint8 sequences
     * into intermediate buffers before re-assembling them into a unified consensus byte array.
     * The resulting array is fully compatible with P2P network transmissions and long-term disk persistence.
     *
     * @returns A unified consensus-format `Uint8Array`.
     * @throws {Error} If serialization bindings are unavailable or if the internal chunk callback fails.
     */
  toBytes(): Uint8Array {
    if (!btck_block_to_bytes) {
      throw new Error("btck_block_to_bytes unavailable");
    }

    const chunks: Uint8Array[] = [];

    // Dynamic standard callback matching the WriteBytesCb prototype declaration
    const callback = (bytesPtr: any, size: bigint, _userData: any) => {
      const buf = koffi.decode(bytesPtr, "uint8", Number(size));
      chunks.push(new Uint8Array(buf));
      return 1; // Return 1 to indicate successful write chunk processing
    };

    const ret = btck_block_to_bytes(this.getHandle(), callback, null) as number;
    if (ret !== 1) {
      throw new Error(`Failed to serialize block to bytes (code: ${ret})`);
    }

    // Assemble chunks into a unified array buffer view
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
     * Run context-free structural and mathematical validation passes against this block.
     *
     * Executes the baseline consensus ruleset checks that do not require access to historical block indices
     * or active UTXO state pools. This includes validating maximum size parameters, coinbase structural placement rules,
     * per-transaction structural limits, and sigop (signature operation) saturation points.
     * Cryptographic proof-of-work thresholds and Merkle tree root symmetry can be toggled via parameter configurations.
     *
     * @param consensusParams - Active consensus parameter guidelines targeting the running network chain.
     * @param flags - Optional bitfield configurations toggling proof-of-work or Merkle evaluations. Defaults to `BlockCheckFlags.ALL`.
     * @returns A fresh, fully-owned {@link BlockValidationState} capture encapsulating error codes and pass/fail metrics.
     * @throws {Error} If native execution bindings are missing or if state verification codes mismatch invariants.
     */
  check(
    consensusParams: ConsensusParams,
    flags: BlockCheckFlags = BlockCheckFlags.ALL
  ): BlockValidationState {
    if (!btck_block_check) {
      throw new Error("btck_block_check unavailable");
    }

    const state = new BlockValidationState(); // Spawns a fresh context internally

    // Cast to 'any' to bypass cross-subclass protected access restrictions in TypeScript
    const ret = btck_block_check(this.getHandle(), (consensusParams as any).getHandle(), flags, (state as any).getHandle()) as number;

    const isValid = state.validationMode === ValidationMode.VALID;
    if ((ret === 1) !== isValid) {
      throw new Error("Assertion failed: Block validation status code mismatch with ValidationMode");
    }

    return state;
  }

  /**
     * Direct protected array accessor to pull a specific transaction address index from the native layer.
     *
     * @param transactionIndex - Zero-based position index tracking the transaction target.
     * @returns A non-owning {@link Transaction} instance mapped directly to the parent block's memory boundaries.
     * @throws {Error} If native lookup bindings are missing or if pointer parsing resolves to null.
     */
  protected _getTransactionAt(transactionIndex: number): Transaction {
    if (!btck_block_get_transaction_at) {
      throw new Error("btck_block_get_transaction_at unavailable");
    }

    const ptr = btck_block_get_transaction_at(this.getHandle(), BigInt(transactionIndex)) as bigint;

    if (ptr === 0n) {
      throw new Error(`Failed to get transaction at index ${transactionIndex}`);
    }

    return new Transaction(ptr, false, this);
  }

  /**
     * Generate a brief diagnostic layout summary of the block properties.
     *
     * @returns A string capturing the big-endian hexadecimal block identifier alongside transaction count sizes.
     */
  override toString(): string {
    return `<Block hash=${this.blockHash.toString()} txs=${this.transactions.length}>`;
  }

  /**
     * Create a copy of this Block instance.
     *
     * @returns A new instance pointing to a duplicated native block handle allocation.
     */
  override copy(): this {
    return super.copy();
  }
}

/**
 * Unmanaged container holding the spent outputs (undo data) for an entire block.
 *
 * This class wraps an opaque pointer to a block's undo context (corresponds to `.rev` data files
 * in Bitcoin Core). It archives the full state of all UTXOs consumed by this block's inputs.
 * * This metadata is critical for state restoration: if the local node encounters a chain
 * reorganization (re-org), it uses this "undo data" to safely disconnect blocks, roll back
 * the UTXO set database to a previous historical block height checkpoint, and restore the spent coins.
 */
export class BlockSpentOutputs extends KernelOpaquePtr {
  // Non-instantiable directly from JavaScript, but can own pointers when read from disk
  protected static override destroyFn = btck_block_spent_outputs_destroy as (ptr: bigint) => void;
  protected static override copyFn = btck_block_spent_outputs_copy as (ptr: bigint) => bigint;

  /**
     * Wrap an existing native block spent outputs pointer.
     *
     * @param ptr - The native memory handle.
     * @param ownsPtr - Whether this instance governs the lifetime of the unmanaged pointer. Defaults to true.
     * @param parent - The parent memory boundary holding this reference, if it is a borrowed view. Defaults to null.
     */
  constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
    super(ptr, ownsPtr, parent);
  }

  /**
     * Access the inner sequence of spent outputs, organized by transaction.
     *
     * @returns A {@link TransactionSpentOutputsSequence} proxy enabling lazy, on-demand evaluation
     * of the underlying spending records, excluding the initial coinbase transaction.
     */
  get transactions(): TransactionSpentOutputsSequence {
    return new TransactionSpentOutputsSequence(this);
  }

  /**
     * Direct protected array accessor to extract a specific transaction spent outputs handle from the native layer.
     *
     * @param index - Zero-based position index tracking the transaction target (excluding coinbase).
     * @returns A non-owning {@link TransactionSpentOutputs} instance mapped directly to this parent memory boundary.
     * @throws {Error} If native lookup bindings are missing or if pointer parsing resolves to null.
     */
  protected getTransactionSpentOutputsAt(index: number): TransactionSpentOutputs {
    if (!btck_block_spent_outputs_get_transaction_spent_outputs_at) {
      throw new Error("btck_block_spent_outputs_get_transaction_spent_outputs_at unavailable");
    }

    const ptr = btck_block_spent_outputs_get_transaction_spent_outputs_at(this.getHandle(), BigInt(index)) as bigint;

    if (ptr === 0n) {
      throw new Error(`Failed to get transaction spent outputs at index ${index}`);
    }

    return new TransactionSpentOutputs(ptr, false, this);
  }

  /**
     * Generate a brief diagnostic summary of the block spent outputs data.
     *
     * @returns A string capturing the total number of tracked non-coinbase transaction records.
     */
  override toString(): string {
    return `<BlockSpentOutputs txs=${this.transactions.length}>`;
  }

  /**
     * Create a copy of this BlockSpentOutputs instance.
     *
     * @returns A new instance pointing to a duplicated native block spent outputs allocation.
     */
  override copy(): this {
    return super.copy();
  }
}

/**
 * A lazily-evaluated sequence of spent transaction outputs (undo data) within a block.
 *
 * This sequence provides indexed, lookahead access to the historical outpoints consumed by
 * a block's transaction suite.
 * * > **Note on Indexing:** This sequence strictly excludes the coinbase transaction (index 0 of a block).
 * > Because the coinbase transaction generates new coins out of thin air rather than consuming existing
 * > Unspent Transaction Outputs (UTXOs), it lacks any undo data. Therefore, index `0` of this sequence
 * > maps to the spent outputs of the block's *first non-coinbase* transaction.
 */
export class TransactionSpentOutputsSequence extends LazySequence<TransactionSpentOutputs> {
  /** The parent block spent outputs block governing the native tracking array. */
  private blockSpentOutputs: BlockSpentOutputs;
  /** Memoized sequence size storage to optimize boundary verification sweeps. */
  private cachedLen?: number;

  /**
     * Create a lazy transaction spent outputs sequence view.
     *
     * @param blockSpentOutputs - The parent undo data context block.
     */
  constructor(blockSpentOutputs: BlockSpentOutputs) {
    super();
    this.blockSpentOutputs = blockSpentOutputs;
  }

  /**
     * The number of transaction spent output entries available in this block.
     * * This count is exactly equal to the total transaction count of the block minus 1
     * (omitting the coinbase transaction). It is fetched from the native layer on first
     * access and cached to allow subsequent lookups to resolve in $O(1)$ time.
     *
     * @returns The evaluated array size integer.
     * @throws {Error} If `btck_block_spent_outputs_count` function bindings are missing.
     */
  get length(): number {
    if (this.cachedLen === undefined) {
      if (!btck_block_spent_outputs_count) {
        throw new Error("btck_block_spent_outputs_count unavailable");
      }

      // Cast to 'any' to bypass cross-subclass protected access restrictions
      const count = btck_block_spent_outputs_count((this.blockSpentOutputs as any).getHandle()) as bigint;
      this.cachedLen = Number(count);
    }
    return this.cachedLen;
  }

  /**
     * Retrieve the transaction spent outputs entry located at a specific positional offset.
     * * This method fulfills the internal abstraction contract of the base `LazySequence`.
     *
     * @param index - The zero-based array index position to evaluate (relative to non-coinbase transactions).
     * @returns A `TransactionSpentOutputs` wrapper instance configured as a non-owning view bound to the parent block's lifecycle.
     * @throws {RangeError} If the index argument drops below 0 or exceeds the length boundaries.
     * @throws {Error} If native FFI bindings are missing or pointer parsing resolves to null.
     */
  public override getItem(index: number): TransactionSpentOutputs {
    if (this.cachedLen !== undefined && (index < 0 || index >= this.cachedLen)) {
      throw new RangeError(`Index out of bounds: ${index}`);
    }

    if (!btck_block_spent_outputs_get_transaction_spent_outputs_at) {
      throw new Error("btck_block_spent_outputs_get_transaction_spent_outputs_at unavailable");
    }

    // Cast to 'any' to bypass cross-subclass protected access restrictions
    const ptr = btck_block_spent_outputs_get_transaction_spent_outputs_at(
      (this.blockSpentOutputs as any).getHandle(),
      BigInt(index)
    ) as bigint;

    if (ptr === 0n) {
      throw new Error(`Failed to get transaction spent outputs at index ${index}`);
    }

    // Unowned pointer (ownsPtr = false) with lifetime tied to the parent block spent outputs context
    return new TransactionSpentOutputs(ptr, false, this.blockSpentOutputs);
  }
}
