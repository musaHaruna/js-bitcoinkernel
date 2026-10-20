import path from "node:path";
/**
 * @module js-bitcoinkernel
 *
 * Public exports and helpers for creating contexts and chainstate managers.
 * Returned native wrappers belong to the caller and must be disposed.
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
export { Wtxid, WitnessStack } from "./transaction.js";
export { TxValidationResult, TxValidationState } from "./tx-validation.js";
export { setMockTime } from "./mock-time.js";

// Local imports required for internal initialization functions
import { Context, ContextOptions } from "./context.js";
import { ChainParameters, ChainstateManager, ChainstateManagerOptions, ChainType } from "./chain.js";
import { ValidationInterfaceCallbacks } from "./validation.js";

/**
 * Create a context for a network with optional validation callbacks.
 *
 * The temporary parameters and options are disposed when this function
 * returns or throws. The created native context retains what it needs,
 * including ownership of its installed callback interfaces.
 *
 * @param chainType - Bitcoin network; defaults to regtest.
 * @param validationCallbacks - Optional block validation event handlers.
 * @returns An owned Context that the caller must dispose.
 * @throws {Error} If configuration or native context creation fails.
 */
export function makeContext(
  chainType: ChainType = ChainType.REGTEST,
  validationCallbacks?: ValidationInterfaceCallbacks | null
): Context {
  using chainParams = new ChainParameters(chainType);
  using opts = new ContextOptions();
  opts.set_chainparams(chainParams);

  if (validationCallbacks !== undefined && validationCallbacks !== null) {
    opts.set_validation_interface(validationCallbacks);
  }

  return new Context(opts);
}

/**
 * Open a chainstate manager using the supplied data directory.
 *
 * Paths are resolved before calling the native API. Temporary context and
 * options handles are disposed after setup; the manager retains the native
 * resources it needs. Do not concurrently use the directory with bitcoind
 * or another manager. Database locks can cause initialization to fail.
 *
 * @param datadir - Directory for chainstate and the blocks subdirectory.
 * @param chainType - Bitcoin network; defaults to regtest.
 * @param validationCallbacks - Optional block validation event handlers.
 * @returns An owned ChainstateManager that the caller must dispose.
 * @throws {Error} If native configuration or manager creation fails.
 */
export function loadChainman(
  datadir: string,
  chainType: ChainType = ChainType.REGTEST,
  validationCallbacks?: ValidationInterfaceCallbacks | null
): ChainstateManager {
  // Resolve the data directory before passing paths to the native API.
  const absoluteDataDir = path.resolve(datadir);
  using context = makeContext(chainType, validationCallbacks);
  const absoluteBlocksDir = path.join(absoluteDataDir, "blocks");

  // These temporary options are released after the manager is created.
  using chainManOpts = new ChainstateManagerOptions(
    context,
    absoluteDataDir,
    absoluteBlocksDir
  );

  return new ChainstateManager(chainManOpts);
}
