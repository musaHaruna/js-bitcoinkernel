import path from "node:path";
/**
 * @module js-bitcoinkernel
 * @description Central public entry-point layout for the native Bitcoin kernel wrapper.
 *
 * This section acts as a consolidated top-level distribution hub, exporting data primitives,
 * validation mechanics, memory state boundaries, and exception layers. 
 * packaging design to insulate consuming software layers from direct nested relative filepath imports.
 */

export {
    Block,
    BlockCheckFlags,
    BlockHash,
    BlockHeader,
    BlockTreeEntry,
    BlockSpentOutputs,
    BlockValidationResult,
    BlockValidationState,
    TransactionSequence,
    TransactionSpentOutputsSequence,
    ValidationMode,
} from "./block.js";

export {
    BlockMap,
    BlockSpentOutputsMap,
    BlockTreeEntryMap,
    BlockTreeEntrySequence,
    Chain,
    ChainParameters,
    ChainstateManager,
    ChainstateManagerOptions,
    ChainType,
    ConsensusParams,
} from "./chain.js";

export { Context, ContextOptions } from "./context.js";

export {
    KernelLogViewer,
    LogCategory,
    LogLevel,
    LoggingConnection,
    LoggingOptions,
    enable_log_category,
    disable_log_category,
    logging_set_options,
    set_log_level_category, 
} from "./log.js";

export {
    PrecomputedTransactionData,
    ScriptPubkey,
    ScriptVerificationFlags,
    ScriptVerifyException,
    ScriptVerifyStatus,
} from "./script.js";

export {
    Coin,
    CoinSequence,
    Transaction,
    TransactionInput,
    TransactionInputSequence,
    TransactionOutput,
    TransactionOutputSequence,
    TransactionOutPoint,
    TransactionSpentOutputs,
    Txid,
} from "./transaction.js";

export {
    KernelException,
    ProcessBlockException,
    ProcessBlockHeaderException,
} from "./util/exceptions.js";

export { ValidationInterfaceCallbacks } from "./validation.js";

// Local imports required for internal initialization functions
import { Context, ContextOptions } from "./context.js";
import { ChainParameters, ChainstateManager, ChainstateManagerOptions, ChainType } from "./chain.js";
import { ValidationInterfaceCallbacks } from "./validation.js";

/**
 * Automate the multi-step configuration sequence required to construct a valid `Context`.
 *
 * This bootstrap function abstracts away the individual steps of setting up network parameters 
 * and subscribing to subsystem notification callbacks. It encapsulates these configuration structures 
 * within a transient builder before spawning an active engine execution workspace.
 *
 * @param chainType - The network parameter profile to provision (Mainnet, Testnet, Signet, or Regtest). 
 * Defaults to {@link ChainType.REGTEST}.
 * @param validationCallbacks - Optional hook collection to intercept live consensus occurrences 
 * (such as block connections, disconnections, or chain-tip updates).
 * @returns A fresh, **fully-owned** {@link Context} instance. The unmanaged container pointer remains 
 * active until explicitly disposed of.
 */
export function makeContext(
    chainType: ChainType = ChainType.REGTEST,
    validationCallbacks?: ValidationInterfaceCallbacks | null
): Context {
    const chainParams = new ChainParameters(chainType);
    const opts = new ContextOptions();
    opts.set_chainparams(chainParams);
    
    if (validationCallbacks !== undefined && validationCallbacks !== null) {
        opts.set_validation_interface(validationCallbacks);
    }
    
    return new Context(opts);
}

/**
 * Load, allocate, and initialize an active `ChainstateManager` engine mapped to disk storage.
 *
 * This function orchestrates the complete initialization timeline of the kernel's data tier. 
 * It resolves filesystem paths to absolute spatial coordinates, spawns the core native execution 
 * context, sets database path criteria, and signals LevelDB/Flat-file engines to load existing 
 * chain states or initialize an empty ledger track.
 *
 * > ### ⚠️ Data Directory Exclusivity Lock Requirement
 * > The underlying unmanaged database engine enforces an **exclusive write-lock** over the assigned 
 * > data directory path. Concurrently sharing a data directory with a running `bitcoind` daemon or another 
 * > active engine instance will result in immediate native initialization failures and database corruption. 
 * > Shared directory operations are only viable if execution cycles alternate sequentially.
 *
 * @param datadir - The relative or absolute filesystem directory path where block indexing (`blocks/`) 
 * and unspent output profiles (`chainstate/`) reside or will be initialized.
 * @param chainType - The network target validation parameters to enforce. Defaults to {@link ChainType.REGTEST}.
 * @param validationCallbacks - Optional hook collection passed to {@link makeContext} to monitor consensus operations.
 * @returns A fully operational, **fully-owned** {@link ChainstateManager} controller instance managing active blockchain verification loops.
 */
export function loadChainman(
    datadir: string,
    chainType: ChainType = ChainType.REGTEST,
    validationCallbacks?: ValidationInterfaceCallbacks | null
): ChainstateManager {
    // Standardize directory targets across different operating systems to prevent FFI string parsing errors
    const absoluteDataDir = path.resolve(datadir);
    const context = makeContext(chainType, validationCallbacks);
    const absoluteBlocksDir = path.join(absoluteDataDir, "blocks");

    // Assemble the configuration rules mapping the newly targeted data pathways
    const chainManOpts = new ChainstateManagerOptions(
        context, 
        absoluteDataDir, 
        absoluteBlocksDir
    );
    
    return new ChainstateManager(chainManOpts);
}
