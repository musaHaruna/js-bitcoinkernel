/**
 * js-bitcoinkernel
 *
 * Public entry point for the Bitcoin kernel library.
 *
 * This file defines the stable external API surface.
 * Internal modules (ffi, bindings, helpers) should NOT be imported directly
 * by consumers.
 *
 * Only export high-level primitives here.
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

export {makeContext, loadChainman} from "./init.js"


/**
 * If you later add more high-level primitives, expose them here:
 *
 * Example:
 * export { Transaction } from "./tx";
 * export { OutPoint } from "./utxo";
 */

/**
 * Optional: re-export selected low-level utilities (only if needed)
 *
 * Avoid exposing raw FFI bindings unless you explicitly want users
 * to depend on native-layer details.
 */
// export * from "./ffi/bindings";
