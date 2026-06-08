import { Block, BlockTreeEntry, BlockValidationState } from "./block.js";
import { Context } from "./context.js";
import { KernelOpaquePtr } from "./ffi/KernelOpaquePtr.js";
import {
    btck_chain_parameters_create,
    btck_chain_parameters_destroy,
    btck_chain_parameters_copy,
    btck_chain_parameters_get_consensus_params,

    btck_chainstate_manager_options_create,
    btck_chainstate_manager_options_destroy,
    btck_chainstate_manager_options_set_wipe_dbs,
    btck_chainstate_manager_options_set_worker_threads_num,
    btck_chainstate_manager_options_update_block_tree_db_in_memory,
    btck_chainstate_manager_options_update_chainstate_db_in_memory,

    btck_chain_contains,
    btck_chain_get_by_height,
    btck_chain_get_height,
    
    btck_chainstate_manager_create,
    btck_chainstate_manager_destroy,
    btck_chainstate_manager_get_active_chain,
    btck_chainstate_manager_get_best_entry,
    btck_chainstate_manager_import_blocks,
    btck_chainstate_manager_process_block,
    btck_chainstate_manager_process_block_header
 } from "./ffi/bindings.js";
import { ProcessBlockException, ProcessBlockHeaderException } from "./util/exceptions.js";
import { LazySequence } from "./util/sequence.js";

/**
 * Enumeration of supported Bitcoin network types.
 */
export enum ChainType {
    MAINNET = 0, // Main Bitcoin network 
    TESTNET = 1, // Test Bitcoin network
    TESTNET_4 = 2, // Testnet4 Bitcoin network 
    SIGNET = 3, // Signet Bitcoin network 
    REGTEST = 4, // Regression test network
}

/**
 * A read-only view of the consensus parameters governing a specific blockchain.
 *
 * This class wraps an opaque pointer to the internal consensus ruleset of the native kernel.
 * It encapsulates deployment-specific logic and activation heights for Bitcoin forks and consensus
 * rules, such as BIP deployment parameters (e.g., SegWit, Taproot), block subsidy halving intervals,
 * and difficulty adjustment targets.
 *
 * Typically obtained as a borrowed view from a parent {@link ChainParameters} instance.
 */
export class ConsensusParams extends KernelOpaquePtr {
    /**
     * Wrap an existing native consensus parameters pointer.
     *
     * @param ptr - The native pointer handle.
     * @param ownsPtr - Whether this instance owns the lifetime of the pointer. Defaults to false when acting as a view.
     * @param parent - The parent object holding this reference, if it's a borrowed view. Defaults to null.
     */
    constructor(ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null) {
        super(ptr, ownsPtr, parent);
    }
}

/**
 * Chain parameters describing structural and identity properties of a Bitcoin network.
 *
 * This class defines network-specific constants, genesis block characteristics, default network ports,
 * and base protocol requirements unique to a specific network deployment (e.g., Mainnet, Testnet, Signet, or Regtest).
 * It acts as the primary configuration vehicle for bootstrapping a native kernel context.
 */
export class ChainParameters extends KernelOpaquePtr {
    public static override createFn = btck_chain_parameters_create;
    public static override destroyFn = btck_chain_parameters_destroy;
    public static override copyFn = btck_chain_parameters_copy;

    /**
     * Internal constructor required by `KernelOpaquePtrConstructor` for pointer instantiation.
     *
     * Used when wrapping raw handles returned downstream by factory methods or network queries.
     *
     * @param ptr - The native memory handle.
     * @param ownsPtr - Flag indicating if JavaScript governs the unmanaged memory lifecycle.
     * @param parent - Context parent reference, if this handle is pinned to a lifecycle subtree.
     */
    constructor(ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null);
    
    /**
     * Public-facing constructor to instantiate network specifications from an established deployment enum.
     *
     * @param chainType - The specific Bitcoin network configuration to initialize.
     */
    constructor(chainType: ChainType);
    
    /**
     * Unified polymorphic constructor implementation handling both direct pointer wrapping and native lifecycle instantiation.
     *
     * @throws {Error} If `btck_chain_parameters_create` is unavailable or if the native allocation fails.
     */
    constructor(arg: bigint | ChainType, ownsPtr?: boolean, parent?: KernelOpaquePtr | null) {
        if (typeof arg === "bigint") {
            // Instantiated via pointer (e.g., inside internal factory methods)
            super(arg, ownsPtr, parent);
        } else {
            // Instantiated directly by user via ChainType enum
            if (!btck_chain_parameters_create) {
                throw new Error("btck_chain_parameters_create unavailable");
            }
            const ptr = btck_chain_parameters_create(arg) as bigint;
            super(ptr, true, null);
        }
    }

    /**
     * Access the consensus parameters tied to this network definition.
     *
     * This getter extracts the inner consensus sub-configuration context from the native layer.
     *
     * * @note This method returns a **borrowed view** whose underlying allocation is structurally dependent
     * on the lifecycle of this `ChainParameters` parent. To safeguard unmanaged memory integrity, the returned instance
     * is explicitly linked to `this` instance to prevent premature garbage collection sweeps.
     *
     * @returns A {@link ConsensusParams} wrapper instance observing the target parameters.
     * @throws {Error} If `btck_chain_parameters_get_consensus_params` is unavailable.
     */
    get consensusParams(): ConsensusParams {
        if (!btck_chain_parameters_get_consensus_params) {
            throw new Error("btck_chain_parameters_get_consensus_params unavailable");
        }

        const ptr = btck_chain_parameters_get_consensus_params(
            this.getHandle(),
        ) as bigint;

        // Instantiates an unowned dependent view linked back to this parent instance
        return ConsensusParams.fromView(ptr, this);
    }
}

/**
 * Configuration options for initializing a `ChainstateManager`.
 *
 * This class serves as a configuration builder to specify how the node's underlying databases, 
 * path locations, validation engines, and performance metrics should be provisioned.
 *
 * > ### ⚠️ Memory & Lifecycle Constraints
 * > * **One-Shot Configuration:** Once a `ChainstateManager` is initialized using an instance of 
 * >   this class, subsequent changes to this options object will have **no effect** on the live manager.
 * > * **Context Anchoring:** This class retains an internal JS reference to the parent {@link Context} 
 * >   to prevent the V8 engine from prematurely garbage-collecting the runtime context while the options 
 * >   are actively being configured.
 */
export class ChainstateManagerOptions extends KernelOpaquePtr {
    protected static override destroyFn = btck_chainstate_manager_options_destroy as (ptr: bigint) => void;

    /** Internal reference to keep the core execution context pinned in JS memory. */
    private _context: Context | null = null;

    /**
     * Create a chainstate manager options wrapper by pointing to an existing native struct.
     *
     * @param ptr - The native memory handle address.
     * @param ownsPtr - Whether this JavaScript class wrapper actively manages the unmanaged memory lifecycle.
     * @param parent - The structural parent object pinning this configuration's visibility.
     */
    constructor(ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null);
    /**
     * Allocate a fresh, unmanaged chainstate manager configuration structure on the native heap.
     *
     * @param context - The active runtime execution context engine.
     * @param datadir - The absolute path to the base data directory (used for storing the UTXO set, indexes, etc.).
     * @param blocksDir - The absolute path to the directory where raw `.dat` block storage files are saved.
     */
    constructor(context: Context, datadir: string, blocksDir: string);
    constructor(arg1: bigint | Context, arg2?: boolean | string, arg3: KernelOpaquePtr | null | string = null) {
        if (arg1 instanceof Context) {
            if (!btck_chainstate_manager_options_create) {
                throw new Error("btck_chainstate_manager_options_create unavailable");
            }

            const datadirStr = arg2 as string;
            const blocksDirStr = arg3 as string;

            // Convert JavaScript strings into raw UTF-8 byte arrays
            const datadirBuf = Buffer.from(datadirStr, "utf8");
            const blocksDirBuf = Buffer.from(blocksDirStr, "utf8");

            // Extract the context's handle using the peer bypass rule
            const contextHandle = (arg1 as any).getHandle();

            const ptr = btck_chainstate_manager_options_create(contextHandle, datadirBuf, BigInt(datadirBuf.length), blocksDirBuf, BigInt(blocksDirBuf.length)) as bigint;

            if (ptr === 0n) {
                throw new Error("Failed to create native ChainstateManagerOptions");
            }

            super(ptr, true, null);
            this._context = arg1;
        } else {
            const ownsPtr = typeof arg2 === "boolean" ? arg2 : true;
            super(arg1 as bigint, ownsPtr, arg3 as KernelOpaquePtr | null);
        }
    }

    /**
     * Configure destructive wiping options for the block tree index and UTXO chainstate databases.
     *
     * Used when reindexing or forcing a full resynchronization of the blockchain ledger state.
     *
     * > ### ⚠️ Operational Warnings
     * > * **Execution Pre-requisite:** If `wipeBlockTreeDb` is set to `true`, you **must** call 
     * >   the `ChainstateManager` initialization and trigger block imports; otherwise, the native wipe 
     * >   operation will not be dispatched.
     * > * **Structural Invariant:** The block tree database (`wipeBlockTreeDb`) should only be wiped if 
     * >   the chainstate database (`wipeChainstateDb`) is also being wiped. Wiping block indexes without 
     * >   clearing the corresponding UTXO set will cause fatal consensus synchronization errors.
     *
     * @param wipeBlockTreeDb - True to delete the block index metadata (the graph of block headers).
     * @param wipeChainstateDb - True to completely wipe out the active LevelDB UTXO (unspent coins) set.
     * @returns `0` if the configuration was applied successfully; `1` if an operational failure occurred.
     * @throws {Error} If `btck_chainstate_manager_options_set_wipe_dbs` FFI bindings are unavailable.
     */
    setWipeDbs(wipeBlockTreeDb: boolean, wipeChainstateDb: boolean): number {
        if (!btck_chainstate_manager_options_set_wipe_dbs) {
            throw new Error("btck_chainstate_manager_options_set_wipe_dbs unavailable");
        }

        return btck_chainstate_manager_options_set_wipe_dbs(this.getHandle(), wipeBlockTreeDb, wipeChainstateDb);
    }

    /**
     * Configure the parallel worker thread pool threshold for cryptographic script validation.
     *
     * Sets the scaling limits for executing parallel ECDSA/Schnorr transaction signature verifications.
     *
     * @param workerThreads - The maximum number of worker threads allocated to validation execution. 
     * Setting this to `0` turns off parallel verification entirely (falling back to single-threaded sequential execution). 
     * *Note: The native kernel layer clamps this configuration value internally between `0` and `15` threads.*
     * @throws {Error} If `btck_chainstate_manager_options_set_worker_threads_num` FFI bindings are unavailable.
     */
    setWorkerThreadsNum(workerThreads: number): void {
        if (!btck_chainstate_manager_options_set_worker_threads_num) {
            throw new Error("btck_chainstate_manager_options_set_worker_threads_num unavailable");
        }

        btck_chainstate_manager_options_set_worker_threads_num(this.getHandle(), workerThreads);
    }

    /**
     * Toggle volatile, in-memory execution for the block tree index database.
     *
     * When enabled, the block headers graph registry skips disk serialization and is pinned inside 
     * RAM. This drastically speeds up execution overhead but strips long-term state persistence.
     *
     * @param blockTreeDbInMemory - `true` to confine block tracking completely within memory; 
     * `false` to enable standard LevelDB disk persistence.
     * @throws {Error} If `btck_chainstate_manager_options_update_block_tree_db_in_memory` FFI bindings are unavailable.
     */
    updateBlockTreeDbInMemory(blockTreeDbInMemory: boolean): void {
        if (!btck_chainstate_manager_options_update_block_tree_db_in_memory) {
            throw new Error("btck_chainstate_manager_options_update_block_tree_db_in_memory unavailable");
        }

        // Explicitly map boolean to integer to mirror the native integration rules
        btck_chainstate_manager_options_update_block_tree_db_in_memory(this.getHandle(), blockTreeDbInMemory ? 1 : 0);
    }

    /**
     * Toggle volatile, in-memory execution for the UTXO chainstate database.
     *
     * When enabled, the database tracking unspent transaction outputs is stored in RAM. 
     * This is highly optimized for testing environments, transient blockchain validation sweeps, 
     * or ephemeral sandboxes where historical disk persistence can be dropped.
     *
     * @param chainstateDbInMemory - `true` to confine the UTXO coin set completely within memory; 
     * `false` to use standard disk-backed database storage.
     * @throws {Error} If `btck_chainstate_manager_options_update_chainstate_db_in_memory` FFI bindings are unavailable.
     */
    updateChainstateDbInMemory(chainstateDbInMemory: boolean): void {
        if (!btck_chainstate_manager_options_update_chainstate_db_in_memory) {
            throw new Error("btck_chainstate_manager_options_update_chainstate_db_in_memory unavailable");
        }

        // Explicitly map boolean to integer to mirror the native integration rules
        btck_chainstate_manager_options_update_chainstate_db_in_memory(
            this.getHandle(),
            chainstateDbInMemory ? 1 : 0
        );
    }
}

/**
 * A live, dynamic view of the currently active consensus blockchain.
 *
 * This class wraps an unmanaged pointer representing the "best-known" canonical chain 
 * (the main branch) currently tracked by the native engine. It provides high-speed, 
 * height-based lookups to individual block index nodes.
 *
 * > ### ⚠️ Data Consistency & Lifetime Warnings
 * > * **Dependent Lifetime:** This chain instance is a non-owning view whose operational 
 * >   validity is tied strictly to the lifetime of the `ChainstateManager` it was extracted from.
 * > * **Reorg Volatility:** Because this object tracks the live active tip, its composition 
 * >   is fluid. Read data is only guaranteed to be consistent *until* the underlying 
 * >   manager processes new blocks or encounters a blockchain reorganization (re-org), which 
 * >   can cause previously valid height indexes to point to entirely different blocks.
 */
export class Chain extends KernelOpaquePtr {
    /**
     * Wrap an existing native Chain pointer handle.
     *
     * Typically instantiated via native internal factory bindings or parent state observers.
     *
     * @param ptr - The unmanaged native memory handle address.
     * @param ownsPtr - Whether this wrapper governs the destruction of the pointer. Defaults to true.
     * @param parent - The parent memory manager context pinning this view's lifecycle window. Defaults to null.
     */
    constructor(ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null) {
        super(ptr, ownsPtr ?? true, parent);
    }

    /**
     * The absolute height index of the active consensus chain tip.
     *
     * Represents the total number of blocks placed on top of the genesis block. 
     * The genesis block itself resides at height `0`.
     *
     * @returns The non-negative block height integer of the tip.
     * @throws {Error} If `btck_chain_get_height` function bindings are missing.
     */
    get height(): number {
        if (!btck_chain_get_height) {
            throw new Error("btck_chain_get_height unavailable");
        }
        return Number(btck_chain_get_height(this.getHandle()));
    }

    /**
     * Look up and retrieve a historical block index entry at a specific chain height.
     *
     * * @note This method yields a **borrowed view** (`ownsPtr = false`) directly dependent 
     * on this parent chain's visibility window. Do not preserve this instance beyond the scope 
     * of a block processing cycle.
     *
     * @param height - The targeted blockchain height integer to query. Must be between `0` and `this.height`.
     * @returns A non-owning {@link BlockTreeEntry} view mapping the block node at the requested height.
     * @throws {Error} If native FFI bindings are missing or pointer extraction fails (returns a null pointer).
     */
    _getByHeight(height: number): BlockTreeEntry {
        if (!btck_chain_get_by_height) {
            throw new Error("btck_chain_get_by_height unavailable");
        }

        const ptr = btck_chain_get_by_height(this.getHandle(), height) as bigint;
        if (ptr === 0n) {
            throw new Error(`Failed to get BlockTreeEntry at height ${height}`);
        }

        // Returns a dependent view tied to this chain's lifetime
        return new BlockTreeEntry(ptr, false, this);
    }

    /**
     * Access the full span of the active chain history via a sequential view model.
     *
     * @returns A {@link BlockTreeEntrySequence} proxy enabling lazy lookahead random-access 
     * index queries and standard iteration over the blocks comprising the chain path.
     */
    get blockTreeEntries(): BlockTreeEntrySequence {
        return new BlockTreeEntrySequence(this);
    }

    /**
     * The total number of blocks currently recorded within the active chain path.
     *
     * This count includes all verified ledger checkpoints, mapping exactly to `height + 1` 
     * to offset the zero-indexed genesis block boundary.
     *
     * @returns The dynamic block count size integer.
     */
    get length(): number {
        return this.height + 1;
    }

    /**
     * Generate a brief diagnostic property readout of the chain view.
     *
     * @returns A string capturing the active chain tip height.
     */
    override toString(): string {
        return `<Chain height=${this.height}>`;
    }
}

/**
 * A live, lazily-evaluated sequence view of block tree entries comprising an active blockchain path.
 *
 * This sequence exposes a continuous array-like interface where the positional index corresponds 
 * exactly to the blockchain height (with index `0` mapping to the Genesis block). Because it is a 
 * dynamic view over the active chain state, its total length and constituent elements will automatically 
 * track live mutations, expanding as the network receives new blocks or shifting completely during 
 * blockchain reorganizations (re-orgs).
 *
 * > ### ⚠️ Critical Concurrency Warning
 * > The underlying chain architecture **must not** be mutated while actively iterating across this sequence. 
 * > If a re-org event clears or modifies the active chain path midway through an iteration cycle, 
 * > there is no transactional isolation; subsequent indices may yield elements from an entirely 
 * > different fork branch, leading to inconsistent ledger states.
 */
export class BlockTreeEntrySequence extends LazySequence<BlockTreeEntry> {
    /** The active chain instance providing the underlying structural state. */
    private _chain: Chain;

    /**
     * Create a dynamic sequence view over a specific blockchain path.
     *
     * @param chain - The target chain context to observe.
     */
    constructor(chain: Chain) {
        super();
        this._chain = chain;
    }

    /**
     * The total number of blocks currently recorded in the active chain path.
     *
     * Reflects the current tip height plus one (to account for the genesis block).
     *
     * @returns The dynamic size integer of the chain.
     */
    get length(): number {
        return this._chain.length;
    }

    /**
     * Retrieve the block tree entry situated at a specific historical chain height.
     * * This method fulfills the internal abstraction contract of the base `LazySequence`.
     *
     * * @note This returns a **borrowed view** (`ownsPtr = false`) whose underlying memory context 
     * is pinned directly to the lifetime of the parent `Chain` instance.
     *
     * @param index - The targeted blockchain height integer to query.
     * @returns A {@link BlockTreeEntry} view mapping the block index node at the specified height.
     * @throws {Error} If native FFI bindings are missing or pointer extraction fails.
     */
    protected override getItem(index: number): BlockTreeEntry {
        if (!btck_chain_get_by_height) {
            throw new Error("btck_chain_get_by_height unavailable");
        }

        // Peer-access bypass to extract the protected Chain pointer handle
        const ptr = btck_chain_get_by_height((this._chain as any).getHandle(), index) as bigint;

        if (ptr === 0n) {
            throw new Error(`Failed to get BlockTreeEntry pointer at height ${index}`);
        }

        // Instantiated as a dependent view layout: ownsPtr = false, parent = this._chain
        return new BlockTreeEntry(ptr, false, this._chain);
    }

    /**
     * Evaluate whether a specific block entry is currently part of the active consensus chain.
     *
     * This allows you to verify if a known block is part of the main canonical ledger 
     * or if it has been relegated to an inactive/stale fork branch.
     *
     * @param other - The candidate object targeted for membership testing.
     * @returns True if the element is a `BlockTreeEntry` and currently resides within this active chain timeline.
     * @throws {Error} If `btck_chain_contains` function bindings are missing.
     */
    contains(other: unknown): boolean {
        if (!(other instanceof BlockTreeEntry)) {
            return false;
        }

        if (!btck_chain_contains) {
            throw new Error("btck_chain_contains unavailable");
        }

        // Peer-access bypass rules applied to both objects
        const chainHandle = (this._chain as any).getHandle();
        const entryHandle = (other as any).getHandle();

        const result = btck_chain_contains(chainHandle, entryHandle);

        return Boolean(result);
    }

    /**
     * Native JavaScript Iterator implementation.
     *
     * Facilitates clean, idiomatic parsing of the block chain history utilizing standard 
     * ECMAScript loop constructs.
     * * @example
     * ```typescript
     * for (const entry of chainSequence) {
     * console.log(`Processing block at height: ${entry.height}`);
     * }
     * ```
     * * @yields A non-owning {@link BlockTreeEntry} view for each sequential height.
     */
    *[Symbol.iterator](): Iterator<BlockTreeEntry> {
        const len = this.length;
        for (let i = 0; i < len; i++) {
            yield this.getItem(i);
        }
    }
}

/**
 * Central manager orchestrating blockchain validation, storage engines, and ledger state retrieval.
 *
 * The `ChainstateManager` serves as the primary coordination hub for all consensus-critical 
 * operations within the system. It anchors and maintains the structural integrity of:
 * * **The Block Index Graph (`BlockTreeEntryMap`):** A database tracking all validly received headers.
 * * **The UTXO Set:** The database storing active unspent transaction outputs.
 * * **The Active Chain View (`Chain`):** The canonical ledger tip containing the most accumulated proof-of-work.
 *
 * This class maps directly to the core validation state machine and is engineered to be **completely thread-safe**, 
 * allowing seamless access and query capabilities from multiple concurrent JavaScript/Worker execution contexts.
 */
export class ChainstateManager extends KernelOpaquePtr {
    protected static override destroyFn = btck_chainstate_manager_destroy as (ptr: bigint) => void;

    /** Internal reference maintaining the core context to prevent V8 from garbage-collecting FFI callback trampolines. */
    private _context: Context | null = null;

    /**
     * Wrap an existing native ChainstateManager pointer handle.
     *
     * @param ptr - The unmanaged native memory handle address.
     * @param ownsPtr - Whether this wrapper actively governs the destruction of the pointer.
     * @param parent - The structural parent object pinning this view's visibility window.
     */
    constructor(ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null);
    /**
     * Instantiate a fresh native validation engine directly from a configuration options builder.
     *
     * @param chainManOpts - Pre-configured options specifying database directories, threads, and memory status.
     */
    constructor(chainManOpts: ChainstateManagerOptions);
    constructor(arg1: bigint | ChainstateManagerOptions, arg2?: boolean, arg3: KernelOpaquePtr | null = null) {
        if (arg1 instanceof ChainstateManagerOptions) {
            if (!btck_chainstate_manager_create) {
                throw new Error("btck_chainstate_manager_create unavailable");
            }

            // Extract the options pointer handle using the peer bypass rule
            const optionsHandle = (arg1 as any).getHandle();
            const ptr = btck_chainstate_manager_create(optionsHandle) as bigint;

            if (ptr === 0n) {
                throw new Error("Failed to create native ChainstateManager");
            }

            super(ptr, true, null);
            // Link context from options to prevent garbage collection
            this._context = (arg1 as any)._context;
        } else {
            const ownsPtr = typeof arg2 === "boolean" ? arg2 : true;
            super(arg1 as bigint, ownsPtr, arg3);
        }
    }

    /**
     * The block entry node representing the tip of the chain with the highest cumulative proof-of-work.
     *
     * This field represents the globally validated structural apex, regardless of whether it is 
     * fully connected to the active chain yet.
     *
     * * @note This method yields a **borrowed view** (`ownsPtr = false`) directly tied to the lifecycle 
     * of this manager instance.
     *
     * @returns A non-owning {@link BlockTreeEntry} view mapping the best-known block node.
     * @throws {Error} If native lookup bindings are missing or pointer parsing resolves to null.
     */
    get bestEntry(): BlockTreeEntry {
        if (!btck_chainstate_manager_get_best_entry) {
            throw new Error("btck_chainstate_manager_get_best_entry unavailable");
        }

        const ptr = btck_chainstate_manager_get_best_entry(this.getHandle()) as bigint;
        if (ptr === 0n) {
            throw new Error("Failed to get best BlockTreeEntry pointer");
        }

        return new BlockTreeEntry(ptr, false, this);
    }

    /**
     * Extract a live view of the current canonical active consensus blockchain.
     *
     * * @note Returns a **dependent view** whose validation state fluctuates dynamically with the engine's processing loop.
     *
     * @returns A non-owning {@link Chain} view representing the best-work validated chain history.
     * @throws {Error} If native lookup bindings are missing or pointer parsing resolves to null.
     */
    getActiveChain(): Chain {
        if (!btck_chainstate_manager_get_active_chain) {
            throw new Error("btck_chainstate_manager_get_active_chain unavailable");
        }

        const ptr = btck_chainstate_manager_get_active_chain(this.getHandle()) as bigint;
        if (ptr === 0n) {
            throw new Error("Failed to get active Chain pointer");
        }

        return new Chain(ptr, false, this);
    }

    /**
     * Synchronously import a batch of offline block storage files (`blk?????.dat`) into the index.
     *
     * Marshals an array of string-like paths across the FFI layer. It splits the data into 
     * raw continuous UTF-8 byte buffers alongside a matching explicit length array to accommodate 
     * C-level pointer array expectations (`const char**` paired with array lengths).
     *
     * @param paths - An array of filesystem path strings or path wrapper objects containing target blocks.
     * @returns True if the full batch file import sequence completed successfully without data errors.
     * @throws {Error} If `btck_chainstate_manager_import_blocks` FFI bindings are unavailable.
     */
    importBlocks(paths: { toString(): string }[]): boolean {
        if (!btck_chainstate_manager_import_blocks) {
            throw new Error("btck_chainstate_manager_import_blocks unavailable");
        }

        // Convert path strings into unique UTF-8 byte buffers
        const encodedPaths = paths.map(p => Buffer.from(p.toString(), "utf8"));
        
        // Build the array mapping lengths (`uint64*`)
        const pathLengths = new BigUint64Array(encodedPaths.map(buf => BigInt(buf.length)));

        // Pass JavaScript array of Buffers directly matching C's `const char**` setup in Koffi
        const result = btck_chainstate_manager_import_blocks(
            this.getHandle(),
            encodedPaths,
            pathLengths,
            BigInt(paths.length)
        );

        return result !== 0;
    }

    /**
     * Submit a full consensus block to the manager for formal validation, indexing, and persistent caching.
     *
     * This orchestrates full verification sweeps including checking inputs against active UTXOs, 
     * evaluating scripts, validating contexts, and committing updates to disk storage. It allocates a 
     * mutable `Int32Array` output pointer across the boundary to receive the flag indicating whether this 
     * block represents a novel addition to our local system databases.
     *
     * @param block - The full transaction-inclusive block wrapper instance to evaluate.
     * @returns True if the block is entirely new and was successfully stored; false if it was a known duplicate.
     * @throws {ProcessBlockException} If native consensus processing errors out or hits corruption thresholds.
     */
    processBlock(block: Block): boolean {
        if (!btck_chainstate_manager_process_block) {
            throw new Error("btck_chainstate_manager_process_block unavailable");
        }

        // Allocate a mutable Int32 native reference array acting as the `int32*` out-pointer
        const isNewBlockOut = new Int32Array(1);

        const result = btck_chainstate_manager_process_block(
            this.getHandle(),
            (block as any).getHandle(),
            isNewBlockOut
        );

        if (result !== 0) {
            throw new ProcessBlockException(result);
        }

        return Boolean(isNewBlockOut[0]);
    }

    /**
     * Submit an isolated block header to the manager for validation and structure tracking.
     *
     * Evaluates initial headers to ensure they comply with network parameters, difficulty expectations, 
     * and valid chaining targets before extending the block tree hierarchy. This optimization prevents full-block 
     * download requirements for non-viable paths.
     *
     * @param header - The block header instance structure targeting verification.
     * @returns A fresh, **fully-owned** {@link BlockValidationState} tracking error flags and audit benchmarks.
     * @throws {ProcessBlockHeaderException} If native processing execution encounters an unrecoverable structural fault.
     */
    processBlockHeader(header: any): BlockValidationState {
        if (!btck_chainstate_manager_process_block_header) {
            throw new Error("btck_chainstate_manager_process_block_header unavailable");
        }

        // Bypass the strict static context checking using 'as any'
        const state = (BlockValidationState as any).create() as BlockValidationState;

        const result = btck_chainstate_manager_process_block_header(
            this.getHandle(),
            (header as any).getHandle(),
            (state as any).getHandle()
        );

        if (result !== 0) {
            state.dispose();
            throw new ProcessBlockHeaderException(result);
        }

        return state;
    }

    /**
     * Return a brief diagnostic summary layout of the chainstate manager instance.
     *
     * @returns A string capturing the raw base-16 memory handle pointer index tracking this entity.
     */
    override toString(): string {
        return `<ChainstateManager handle=${this.getHandle()}>`;
    }
}
