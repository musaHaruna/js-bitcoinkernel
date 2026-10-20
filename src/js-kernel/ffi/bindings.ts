import koffi from 'koffi';
import { lib } from './loader.js';

/**
 * Every binding belongs to the pinned native snapshot. Fail at import time
 * when an old or incompatible binary is loaded.
 */
function loadRequired<T>(name: string, loader: () => T): T {
  try {
    return loader();
  } catch (err) {
    throw new Error(`Required kernel binding ${name} is unavailable. Rebuild the native library for this package version.`, { cause: err });
  }
}

/**
 * Primitive Type Aliases
 */
const size_t = 'size_t';
const uint32_t = 'uint32';
const int32_t = 'int32';
const int64_t = "int64";
const uint64_t = "uint64";
const btck_ScriptVerificationFlags = 'uint32';
const btck_LogCategory = 'uint8';
const btck_LogLevel = 'uint8';
const btck_ChainType = 'uint8';
const ByteArray32 = koffi.array('uint8', 32);
const ByteArray80 = koffi.array('uint8', 80);
const btck_ValidationMode = 'uint8';
const btck_BlockValidationResult = 'uint32';
const btck_BlockCheckFlags = 'uint32';

/**
 * Opaque Native Types
 */
koffi.opaque('struct_btck_BlockHash');
koffi.opaque('struct_btck_BlockHeader');
koffi.opaque('struct_btck_ChainParameters');
koffi.opaque('struct_btck_ConsensusParams');
koffi.opaque('struct_btck_ContextOptions');
koffi.opaque('struct_btck_Context');
koffi.opaque('struct_btck_BlockTreeEntry');
koffi.opaque('struct_btck_Txid');
koffi.opaque('struct_btck_ScriptPubkey');
koffi.opaque('struct_btck_Transaction');
koffi.opaque('struct_btck_TransactionOutput');
koffi.opaque('struct_btck_TransactionOutPoint');
koffi.opaque('struct_btck_TransactionInput');
koffi.opaque('struct_btck_TransactionSpentOutputs');
koffi.opaque('struct_btck_Coin');
koffi.opaque('struct_btck_PrecomputedTransactionData');
koffi.opaque('struct_btck_BlockValidationState');
koffi.opaque('struct_btck_ChainstateManager');
koffi.opaque('struct_btck_Block');
koffi.opaque('struct_btck_BlockSpentOutputs');
koffi.opaque('struct_btck_LoggingConnection');
koffi.opaque('struct_btck_ChainstateManagerOptions');
koffi.opaque('struct_btck_Chain');
koffi.opaque('struct_btck_ValidationInterfaceCallbacks');
koffi.opaque('struct_btck_NotificationInterfaceCallbacks');


/**
 * FFI Callback Prototypes
 * * These types define the function signatures for the native C++ validation
 * interface, logging, and stream event hooks.
 */
export const WriteBytesCb = koffi.proto("WriteBytesCb", int32_t, ["const void *", size_t, "void *"]);
export const BlockTipCb = koffi.proto("BlockTipCb", "void", ["void*", "uint8", "void*", "double"]);
export const HeaderTipCb = koffi.proto("HeaderTipCb", "void", ["void*", "uint8", "int64", "int64", "int32"]);
export const ProgressCb = koffi.proto("ProgressCb", "void", ["void*", "void*", size_t, "int32", "int32"]);
export const WarningSetCb = koffi.proto("WarningSetCb", "void", ["void*", "uint8", "void*", size_t]);
export const WarningUnsetCb = koffi.proto("WarningUnsetCb", "void", ["void*", "uint8"]);
export const NotificationErrorCb = koffi.proto("NotificationErrorCb", "void", ["void*", "void*", size_t]);
export const btck_LogCallback = koffi.proto("btck_LogCallback", "void", ["void*", "const void*", size_t]);
export const BlockCheckedCb = koffi.proto("BlockCheckedCb", "void", ["void*", "void*", "void*"]);
export const BlockEntryCb = koffi.proto("BlockEntryCb", "void", ["void*", "void*", "void*"]);
export const UserDataDestroyCb = koffi.proto("UserDataDestroyCb", "void", ["void*"]);
export const btck_DestroyCallback = koffi.proto("btck_DestroyCallback", "void", ["void*"]);

// Natural C alignment is required for passing this struct by value.
export const btck_LoggingOptions = koffi.struct('struct_btck_LoggingOptions', {
  log_timestamps: int32_t,
  log_time_micros: int32_t,
  log_threadnames: int32_t,
  log_sourcelocations: int32_t,
  always_print_category_levels: int32_t,
});

export const btck_ValidationInterfaceCallbacks = koffi.struct('btck_ValidationInterfaceCallbacks', {
  user_data: 'void*',
  user_data_destroy: koffi.pointer(UserDataDestroyCb),
  block_checked: koffi.pointer(BlockCheckedCb),
  pow_valid_block: koffi.pointer(BlockEntryCb),
  block_connected: koffi.pointer(BlockEntryCb),
  block_disconnected: koffi.pointer(BlockEntryCb)
});

export const btck_NotificationInterfaceCallbacks = koffi.struct('btck_NotificationInterfaceCallbacks', {
  user_data: 'void*',
  user_data_destroy: koffi.pointer(UserDataDestroyCb),
  block_tip: koffi.pointer(BlockTipCb),
  header_tip: koffi.pointer(HeaderTipCb),
  progress: koffi.pointer(ProgressCb),
  warning_set: koffi.pointer(WarningSetCb),
  warning_unset: koffi.pointer(WarningUnsetCb),
  flush_error: koffi.pointer(NotificationErrorCb),
  fatal_error: koffi.pointer(NotificationErrorCb)
});


/**=========================================================
 * Block Bindings
 *==========================================================/
/**
 * BlockHash
 */
export const btck_block_hash_create = loadRequired('btck_block_hash_create', () =>
  lib.func('btck_block_hash_create', 'struct_btck_BlockHash*', [koffi.pointer(ByteArray32)])
);

export const btck_block_hash_equals = loadRequired('btck_block_hash_equals', () =>
  lib.func('btck_block_hash_equals', int32_t, ['struct_btck_BlockHash*', 'struct_btck_BlockHash*'])
);

export const btck_block_hash_copy = loadRequired('btck_block_hash_copy', () =>
  lib.func('btck_block_hash_copy', 'struct_btck_BlockHash*', ['struct_btck_BlockHash*'])
);

export const btck_block_hash_to_bytes = loadRequired('btck_block_hash_to_bytes', () =>
  lib.func('btck_block_hash_to_bytes', 'void', ['struct_btck_BlockHash*', koffi.pointer(ByteArray32)])
);

export const btck_block_hash_destroy = loadRequired('btck_block_hash_destroy', () =>
  lib.func('btck_block_hash_destroy', 'void', ['struct_btck_BlockHash*'])
);

/**
 * BlockHeader
 */
export const btck_block_header_create = loadRequired('btck_block_header_create', () =>
  lib.func('btck_block_header_create', 'struct_btck_BlockHeader*', ['void*', size_t])
);

export const btck_block_header_copy = loadRequired('btck_block_header_copy', () =>
  lib.func('btck_block_header_copy', 'struct_btck_BlockHeader*', ['struct_btck_BlockHeader*'])
);

export const btck_block_header_get_hash = loadRequired('btck_block_header_get_hash', () =>
  lib.func('btck_block_header_get_hash', 'struct_btck_BlockHash*', ['struct_btck_BlockHeader*'])
);

export const btck_block_header_get_prev_hash = loadRequired('btck_block_header_get_prev_hash', () =>
  lib.func('btck_block_header_get_prev_hash', 'struct_btck_BlockHash*', ['struct_btck_BlockHeader*'])
);

export const btck_block_header_get_timestamp = loadRequired('btck_block_header_get_timestamp', () =>
  lib.func('btck_block_header_get_timestamp', uint32_t, ['struct_btck_BlockHeader*'])
);

export const btck_block_header_get_bits = loadRequired('btck_block_header_get_bits', () =>
  lib.func('btck_block_header_get_bits', uint32_t, ['struct_btck_BlockHeader*'])
);

export const btck_block_header_get_version = loadRequired('btck_block_header_get_version', () =>
  lib.func('btck_block_header_get_version', int32_t, ['struct_btck_BlockHeader*'])
);

export const btck_block_header_get_nonce = loadRequired('btck_block_header_get_nonce', () =>
  lib.func('btck_block_header_get_nonce', uint32_t, ['struct_btck_BlockHeader*'])
);

export const btck_block_header_to_bytes = loadRequired('btck_block_header_to_bytes', () =>
  lib.func('btck_block_header_to_bytes', int32_t, ['struct_btck_BlockHeader*', koffi.pointer(ByteArray80)])
);

export const btck_block_header_destroy = loadRequired('btck_block_header_destroy', () =>
  lib.func('btck_block_header_destroy', 'void', ['struct_btck_BlockHeader*'])
);

/**
 * Block
 */
export const btck_block_read = loadRequired('btck_block_read', () =>
  lib.func('btck_block_read', 'struct_btck_Block*', ['struct_btck_ChainstateManager*', 'struct_btck_BlockTreeEntry*'])
);

export const btck_block_create = loadRequired('btck_block_create', () =>
  lib.func('btck_block_create', 'struct_btck_Block*', ['const void*', size_t])
);

export const btck_block_copy = loadRequired('btck_block_copy', () =>
  lib.func('btck_block_copy', 'struct_btck_Block*', ['struct_btck_Block*'])
);

export const btck_block_check = loadRequired('btck_block_check', () =>
  lib.func('btck_block_check', int32_t, ['struct_btck_Block*', 'struct_btck_ConsensusParams*', btck_BlockCheckFlags, 'struct_btck_BlockValidationState*'])
);

export const btck_block_count_transactions = loadRequired('btck_block_count_transactions', () =>
  lib.func('btck_block_count_transactions', size_t, ['struct_btck_Block*'])
);

export const btck_block_get_transaction_at = loadRequired('btck_block_get_transaction_at', () =>
  lib.func('btck_block_get_transaction_at', 'struct_btck_Transaction*', ['struct_btck_Block*', size_t])
);

export const btck_block_get_header = loadRequired('btck_block_get_header', () =>
  lib.func('btck_block_get_header', 'struct_btck_BlockHeader*', ['struct_btck_Block*'])
);

export const btck_block_get_hash = loadRequired('btck_block_get_hash', () =>
  lib.func('btck_block_get_hash', 'struct_btck_BlockHash*', ['struct_btck_Block*'])
);

export const btck_block_to_bytes = loadRequired('btck_block_to_bytes', () =>
  lib.func('btck_block_to_bytes', int32_t, ['struct_btck_Block*', koffi.pointer(WriteBytesCb), 'void*'])
);

export const btck_block_destroy = loadRequired('btck_block_destroy', () =>
  lib.func('btck_block_destroy', 'void', ['struct_btck_Block*'])
);

/**
 * BlockSpentOutputs
 */
export const btck_block_spent_outputs_read = loadRequired('btck_block_spent_outputs_read', () =>
  lib.func('btck_block_spent_outputs_read', 'struct_btck_BlockSpentOutputs*', ['struct_btck_ChainstateManager*', 'struct_btck_BlockTreeEntry*'])
);

export const btck_block_spent_outputs_copy = loadRequired('btck_block_spent_outputs_copy', () =>
  lib.func('btck_block_spent_outputs_copy', 'struct_btck_BlockSpentOutputs*', ['struct_btck_BlockSpentOutputs*'])
);

export const btck_block_spent_outputs_count = loadRequired('btck_block_spent_outputs_count', () =>
  lib.func('btck_block_spent_outputs_count', size_t, ['struct_btck_BlockSpentOutputs*'])
);

export const btck_block_spent_outputs_get_transaction_spent_outputs_at = loadRequired('btck_block_spent_outputs_get_transaction_spent_outputs_at', () =>
  lib.func('btck_block_spent_outputs_get_transaction_spent_outputs_at', 'struct_btck_TransactionSpentOutputs*', ['struct_btck_BlockSpentOutputs*', size_t])
);

export const btck_block_spent_outputs_destroy = loadRequired('btck_block_spent_outputs_destroy', () =>
  lib.func('btck_block_spent_outputs_destroy', 'void', ['struct_btck_BlockSpentOutputs*'])
);

/**
 * BlockValidationState
 */
export const btck_block_validation_state_create = loadRequired('btck_block_validation_state_create', () =>
  lib.func('btck_block_validation_state_create', 'struct_btck_BlockValidationState*', [])
);

export const btck_block_validation_state_get_validation_mode = loadRequired('btck_block_validation_state_get_validation_mode', () =>
  lib.func('btck_block_validation_state_get_validation_mode', btck_ValidationMode, ['struct_btck_BlockValidationState*'])
);

export const btck_block_validation_state_get_block_validation_result = loadRequired('btck_block_validation_state_get_block_validation_result', () =>
  lib.func('btck_block_validation_state_get_block_validation_result', btck_BlockValidationResult, ['struct_btck_BlockValidationState*'])
);

export const btck_block_validation_state_copy = loadRequired('btck_block_validation_state_copy', () =>
  lib.func('btck_block_validation_state_copy', 'struct_btck_BlockValidationState*', ['struct_btck_BlockValidationState*'])
);

export const btck_block_validation_state_destroy = loadRequired('btck_block_validation_state_destroy', () =>
  lib.func('btck_block_validation_state_destroy', 'void', ['struct_btck_BlockValidationState*'])
);

/**
 * Block Tree Entry
 */
export const btck_block_tree_entry_get_previous = loadRequired('btck_block_tree_entry_get_previous', () =>
  lib.func('btck_block_tree_entry_get_previous', 'struct_btck_BlockTreeEntry*', ['struct_btck_BlockTreeEntry*'])
);

export const btck_block_tree_entry_get_block_header = loadRequired('btck_block_tree_entry_get_block_header', () =>
  lib.func('btck_block_tree_entry_get_block_header', 'struct_btck_BlockHeader*', ['struct_btck_BlockTreeEntry*'])
);

export const btck_block_tree_entry_get_height = loadRequired('btck_block_tree_entry_get_height', () =>
  lib.func('btck_block_tree_entry_get_height', int32_t, ['struct_btck_BlockTreeEntry*'])
);

export const btck_block_tree_entry_get_block_hash = loadRequired('btck_block_tree_entry_get_block_hash', () =>
  lib.func('btck_block_tree_entry_get_block_hash', 'struct_btck_BlockHash*', ['struct_btck_BlockTreeEntry*'])
);

export const btck_block_tree_entry_equals = loadRequired('btck_block_tree_entry_equals', () =>
  lib.func('btck_block_tree_entry_equals', int32_t, ['struct_btck_BlockTreeEntry*', 'struct_btck_BlockTreeEntry*',])
);

export const btck_block_tree_entry_get_ancestor = loadRequired('btck_block_tree_entry_get_ancestor', () =>
  lib.func('btck_block_tree_entry_get_ancestor', 'struct_btck_BlockTreeEntry*', ['struct_btck_BlockTreeEntry*', int32_t,])
);


/**=========================================================
 * Transaction Bindings
 *==========================================================/

/**
 * Txid
 */
export const btck_txid_copy = loadRequired('btck_txid_copy', () =>
  lib.func('btck_txid_copy', 'struct_btck_Txid*', ['struct_btck_Txid*'])
);

export const btck_txid_equals = loadRequired('btck_txid_equals', () =>
  lib.func('btck_txid_equals', int32_t, ['struct_btck_Txid*', 'struct_btck_Txid*'])
);

export const btck_txid_to_bytes = loadRequired('btck_txid_to_bytes', () =>
  lib.func('btck_txid_to_bytes', 'void', ['struct_btck_Txid*', koffi.pointer(ByteArray32)])
);

export const btck_txid_destroy = loadRequired('btck_txid_destroy', () =>
  lib.func('btck_txid_destroy', 'void', ['struct_btck_Txid*'])
);

/**
 * Transaction
 */
export const btck_transaction_create = loadRequired('btck_transaction_create', () =>
  lib.func('btck_transaction_create', 'struct_btck_Transaction*', ['const void*', size_t])
);

export const btck_transaction_copy = loadRequired('btck_transaction_copy', () =>
  lib.func('btck_transaction_copy', 'struct_btck_Transaction*', ['struct_btck_Transaction*'])
);

export const btck_transaction_to_bytes = loadRequired("btck_transaction_to_bytes", () =>
  lib.func("btck_transaction_to_bytes", int32_t, ["struct_btck_Transaction*", koffi.pointer(WriteBytesCb), "void*"])
);

export const btck_transaction_count_inputs = loadRequired('btck_transaction_count_inputs', () =>
  lib.func('btck_transaction_count_inputs', size_t, ['struct_btck_Transaction*'])
);

export const btck_transaction_get_input_at = loadRequired('btck_transaction_get_input_at', () =>
  lib.func('btck_transaction_get_input_at', 'struct_btck_TransactionInput*', ['struct_btck_Transaction*', size_t])
);

export const btck_transaction_count_outputs = loadRequired('btck_transaction_count_outputs', () =>
  lib.func('btck_transaction_count_outputs', size_t, ['struct_btck_Transaction*'])
);

export const btck_transaction_get_output_at = loadRequired('btck_transaction_get_output_at', () =>
  lib.func('btck_transaction_get_output_at', 'struct_btck_TransactionOutput*', ['struct_btck_Transaction*', size_t])
);

export const btck_transaction_get_locktime = loadRequired('btck_transaction_get_locktime', () =>
  lib.func('btck_transaction_get_locktime', uint32_t, ['struct_btck_Transaction*'])
);

export const btck_transaction_get_txid = loadRequired('btck_transaction_get_txid', () =>
  lib.func('btck_transaction_get_txid', 'struct_btck_Txid*', ['struct_btck_Transaction*'])
);

export const btck_transaction_destroy = loadRequired('btck_transaction_destroy', () =>
  lib.func('btck_transaction_destroy', 'void', ['struct_btck_Transaction*'])
);

/**
 * TransactionOutput
 */
export const btck_transaction_output_create = loadRequired('btck_transaction_output_create', () =>
  lib.func('btck_transaction_output_create', 'struct_btck_TransactionOutput*', ['struct_btck_ScriptPubkey*', int64_t])
);

export const btck_transaction_output_get_script_pubkey = loadRequired('btck_transaction_output_get_script_pubkey', () =>
  lib.func('btck_transaction_output_get_script_pubkey', 'struct_btck_ScriptPubkey*', ['struct_btck_TransactionOutput*'])
);

export const btck_transaction_output_get_amount = loadRequired('btck_transaction_output_get_amount', () =>
  lib.func('btck_transaction_output_get_amount', int64_t, ['struct_btck_TransactionOutput*'])
);

export const btck_transaction_output_copy = loadRequired('btck_transaction_output_copy', () =>
  lib.func('btck_transaction_output_copy', 'struct_btck_TransactionOutput*', ['struct_btck_TransactionOutput*'])
);

export const btck_transaction_output_destroy = loadRequired('btck_transaction_output_destroy', () =>
  lib.func('btck_transaction_output_destroy', 'void', ['struct_btck_TransactionOutput*'])
);

/**
 * TransactionSpentOutputs
 */
export const btck_transaction_spent_outputs_copy = loadRequired('btck_transaction_spent_outputs_copy', () =>
  lib.func('btck_transaction_spent_outputs_copy', 'struct_btck_TransactionSpentOutputs*', ['struct_btck_TransactionSpentOutputs*'])
);

export const btck_transaction_spent_outputs_count = loadRequired('btck_transaction_spent_outputs_count', () =>
  lib.func('btck_transaction_spent_outputs_count', size_t, ['struct_btck_TransactionSpentOutputs*'])
);

export const btck_transaction_spent_outputs_get_coin_at = loadRequired('btck_transaction_spent_outputs_get_coin_at', () =>
  lib.func('btck_transaction_spent_outputs_get_coin_at', 'struct_btck_Coin*', ['struct_btck_TransactionSpentOutputs*', size_t])
);

export const btck_transaction_spent_outputs_destroy = loadRequired('btck_transaction_spent_outputs_destroy', () =>
  lib.func('btck_transaction_spent_outputs_destroy', 'void', ['struct_btck_TransactionSpentOutputs*'])
);

/**
 * TransactionOutPoint
 */
export const btck_transaction_out_point_copy = loadRequired('btck_transaction_out_point_copy', () =>
  lib.func('btck_transaction_out_point_copy', 'struct_btck_TransactionOutPoint*', ['struct_btck_TransactionOutPoint*'])
);

export const btck_transaction_out_point_get_index = loadRequired('btck_transaction_out_point_get_index', () =>
  lib.func('btck_transaction_out_point_get_index', uint32_t, ['struct_btck_TransactionOutPoint*'])
);

export const btck_transaction_out_point_get_txid = loadRequired('btck_transaction_out_point_get_txid', () =>
  lib.func('btck_transaction_out_point_get_txid', 'struct_btck_Txid*', ['struct_btck_TransactionOutPoint*'])
);

export const btck_transaction_out_point_destroy = loadRequired('btck_transaction_out_point_destroy', () =>
  lib.func('btck_transaction_out_point_destroy', 'void', ['struct_btck_TransactionOutPoint*'])
);

/**
 * TransactionInput
 */
export const btck_transaction_input_copy = loadRequired('btck_transaction_input_copy', () =>
  lib.func('btck_transaction_input_copy', 'struct_btck_TransactionInput*', ['struct_btck_TransactionInput*'])
);

export const btck_transaction_input_get_out_point = loadRequired('btck_transaction_input_get_out_point', () =>
  lib.func('btck_transaction_input_get_out_point', 'struct_btck_TransactionOutPoint*', ['struct_btck_TransactionInput*'])
);

export const btck_transaction_input_get_sequence = loadRequired('btck_transaction_input_get_sequence', () =>
  lib.func('btck_transaction_input_get_sequence', uint32_t, ['struct_btck_TransactionInput*'])
);

export const btck_transaction_input_destroy = loadRequired('btck_transaction_input_destroy', () =>
  lib.func('btck_transaction_input_destroy', 'void', ['struct_btck_TransactionInput*'])
);


/**=========================================================
 * Coins Bindings
 *==========================================================*/

export const btck_coin_copy = loadRequired('btck_coin_copy', () =>
  lib.func('btck_coin_copy', 'struct_btck_Coin*', ['struct_btck_Coin*'])
);

export const btck_coin_confirmation_height = loadRequired('btck_coin_confirmation_height', () =>
  lib.func('btck_coin_confirmation_height', uint32_t, ['struct_btck_Coin*'])
);

export const btck_coin_is_coinbase = loadRequired('btck_coin_is_coinbase', () =>
  lib.func('btck_coin_is_coinbase', int32_t, ['struct_btck_Coin*'])
);

export const btck_coin_get_output = loadRequired('btck_coin_get_output', () =>
  lib.func('btck_coin_get_output', 'struct_btck_TransactionOutput*', ['struct_btck_Coin*'])
);

export const btck_coin_destroy = loadRequired('btck_coin_destroy', () =>
  lib.func('btck_coin_destroy', 'void', ['struct_btck_Coin*'])
);

/**==========================================================
 * ScriptPubkey Bindings
 *===========================================================*/
export const btck_script_pubkey_create = loadRequired('btck_script_pubkey_create', () =>
  lib.func('btck_script_pubkey_create', 'struct_btck_ScriptPubkey*', ['void*', size_t])
);

export const btck_script_pubkey_copy = loadRequired('btck_script_pubkey_copy', () =>
  lib.func('btck_script_pubkey_copy', 'struct_btck_ScriptPubkey*', ['struct_btck_ScriptPubkey*'])
);

export const btck_script_pubkey_verify = loadRequired('btck_script_pubkey_verify', () =>
  lib.func('btck_script_pubkey_verify', int32_t, ['struct_btck_ScriptPubkey*', int64_t, 'struct_btck_Transaction*', 'struct_btck_PrecomputedTransactionData*', uint32_t, btck_ScriptVerificationFlags, 'uint8*'])
);

export const btck_script_pubkey_to_bytes = loadRequired('btck_script_pubkey_to_bytes', () =>
  lib.func('btck_script_pubkey_to_bytes', int32_t, ['struct_btck_ScriptPubkey*', koffi.pointer(WriteBytesCb), 'void*'])
);

export const btck_script_pubkey_destroy = loadRequired('btck_script_pubkey_destroy', () =>
  lib.func('btck_script_pubkey_destroy', 'void', ['struct_btck_ScriptPubkey*'])
);

/**===========================================================
 * PrecomputedTransactionData Bindings
*============================================================*/
export const btck_precomputed_transaction_data_create = loadRequired('btck_precomputed_transaction_data_create', () =>
  lib.func('btck_precomputed_transaction_data_create', 'struct_btck_PrecomputedTransactionData*', ['struct_btck_Transaction*', 'struct_btck_TransactionOutput**', size_t])
);

export const btck_precomputed_transaction_data_copy = loadRequired('btck_precomputed_transaction_data_copy', () =>
  lib.func('btck_precomputed_transaction_data_copy', 'struct_btck_PrecomputedTransactionData*', ['struct_btck_PrecomputedTransactionData*'])
);

export const btck_precomputed_transaction_data_destroy = loadRequired('btck_precomputed_transaction_data_destroy', () =>
  lib.func('btck_precomputed_transaction_data_destroy', 'void', ['struct_btck_PrecomputedTransactionData*'])
);

/**===========================================================
 * Chain Bindings
*============================================================*/
/**
 * ChainParameters
 */
export const btck_chain_parameters_create = loadRequired("btck_chain_parameters_create", () =>
  lib.func("btck_chain_parameters_create", "struct_btck_ChainParameters*", [btck_ChainType]));

export const btck_chain_parameters_copy = loadRequired("btck_chain_parameters_copy", () =>
  lib.func("btck_chain_parameters_copy", "struct_btck_ChainParameters*", ["struct_btck_ChainParameters*"])
);

export const btck_chain_parameters_destroy = loadRequired("btck_chain_parameters_destroy", () =>
  lib.func("btck_chain_parameters_destroy", "void", ["struct_btck_ChainParameters*"])
);

export const btck_chain_parameters_get_consensus_params = loadRequired("btck_chain_parameters_get_consensus_params", () =>
  lib.func("btck_chain_parameters_get_consensus_params", "struct_btck_ConsensusParams*", ["struct_btck_ChainParameters*"])
);

/**
 * ChainstateManagerOptions
 */
export const btck_chainstate_manager_options_create = loadRequired('btck_chainstate_manager_options_create', () =>
  lib.func('btck_chainstate_manager_options_create', 'struct_btck_ChainstateManagerOptions*', ['struct_btck_Context*', 'const char*', size_t, 'const char*', size_t])
);

export const btck_chainstate_manager_options_set_worker_threads_num = loadRequired('btck_chainstate_manager_options_set_worker_threads_num', () =>
  lib.func('btck_chainstate_manager_options_set_worker_threads_num', 'void', ['struct_btck_ChainstateManagerOptions*', int32_t])
);

export const btck_chainstate_manager_options_set_wipe_dbs = loadRequired('btck_chainstate_manager_options_set_wipe_dbs', () =>
  lib.func('btck_chainstate_manager_options_set_wipe_dbs', int32_t, ['struct_btck_ChainstateManagerOptions*', int32_t, int32_t])
);

export const btck_chainstate_manager_options_update_block_tree_db_in_memory = loadRequired('btck_chainstate_manager_options_update_block_tree_db_in_memory', () =>
  lib.func('btck_chainstate_manager_options_update_block_tree_db_in_memory', 'void', ['struct_btck_ChainstateManagerOptions*', int32_t])
);

export const btck_chainstate_manager_options_update_chainstate_db_in_memory = loadRequired('btck_chainstate_manager_options_update_chainstate_db_in_memory', () =>
  lib.func('btck_chainstate_manager_options_update_chainstate_db_in_memory', 'void', ['struct_btck_ChainstateManagerOptions*', int32_t])
);

export const btck_chainstate_manager_options_destroy = loadRequired('btck_chainstate_manager_options_destroy', () =>
  lib.func('btck_chainstate_manager_options_destroy', 'void', ['struct_btck_ChainstateManagerOptions*'])
);

/**
 * ChainstateManager
 */
export const btck_chainstate_manager_create = loadRequired('btck_chainstate_manager_create', () =>
  lib.func('btck_chainstate_manager_create', 'struct_btck_ChainstateManager*', ['struct_btck_ChainstateManagerOptions*'])
);

export const btck_chainstate_manager_get_best_entry = loadRequired('btck_chainstate_manager_get_best_entry', () =>
  lib.func('btck_chainstate_manager_get_best_entry', 'struct_btck_BlockTreeEntry*', ['struct_btck_ChainstateManager*'])
);

export const btck_chainstate_manager_process_block_header = loadRequired('btck_chainstate_manager_process_block_header', () =>
  lib.func('btck_chainstate_manager_process_block_header', 'struct_btck_BlockValidationState*', ['struct_btck_ChainstateManager*', 'struct_btck_BlockHeader*'])
);

export const btck_chainstate_manager_import_blocks = loadRequired('btck_chainstate_manager_import_blocks', () =>
  lib.func('btck_chainstate_manager_import_blocks', int32_t, ['struct_btck_ChainstateManager*', 'const char**', 'size_t*', size_t])
);

export const btck_chainstate_manager_process_block = loadRequired('btck_chainstate_manager_process_block', () =>
  lib.func('btck_chainstate_manager_process_block', int32_t, ['struct_btck_ChainstateManager*', 'struct_btck_Block*', 'int32*'])
);

export const btck_chainstate_manager_get_active_chain = loadRequired('btck_chainstate_manager_get_active_chain', () =>
  lib.func('btck_chainstate_manager_get_active_chain', 'struct_btck_Chain*', ['struct_btck_ChainstateManager*'])
);

export const btck_chainstate_manager_get_block_tree_entry_by_hash = loadRequired('btck_chainstate_manager_get_block_tree_entry_by_hash', () =>
  lib.func('btck_chainstate_manager_get_block_tree_entry_by_hash', 'struct_btck_BlockTreeEntry*', ['struct_btck_ChainstateManager*', 'struct_btck_BlockHash*'])
);

export const btck_chainstate_manager_destroy = loadRequired('btck_chainstate_manager_destroy', () =>
  lib.func('btck_chainstate_manager_destroy', 'void', ['struct_btck_ChainstateManager*'])
);

/**
 * ChainView
 */
export const btck_chain_get_by_height = loadRequired('btck_chain_get_by_height', () =>
  lib.func('btck_chain_get_by_height', 'struct_btck_BlockTreeEntry*', ['struct_btck_Chain*', int32_t])
);

export const btck_chain_contains = loadRequired('btck_chain_contains', () =>
  lib.func('btck_chain_contains', int32_t, ['struct_btck_Chain*', 'struct_btck_BlockTreeEntry*'])
);

export const btck_chain_get_height = loadRequired('btck_chain_get_height', () =>
  lib.func('btck_chain_get_height', int32_t, ['struct_btck_Chain*'])
);

/**===========================================================
 * ContextOptions & Context Bindings
 *===========================================================*/
export const btck_context_options_create = loadRequired('btck_context_options_create', () =>
  lib.func('btck_context_options_create', 'struct_btck_ContextOptions*', [])
);

export const btck_context_options_set_chainparams = loadRequired('btck_context_options_set_chainparams', () =>
  lib.func('btck_context_options_set_chainparams', 'void', ['struct_btck_ContextOptions*', 'struct_btck_ChainParameters*'])
);

export const btck_context_options_set_notifications = loadRequired('btck_context_options_set_notifications', () =>
  lib.func('btck_context_options_set_notifications', 'void', ['struct_btck_ContextOptions*', btck_NotificationInterfaceCallbacks])
);

export const btck_context_options_set_validation_interface = loadRequired('btck_context_options_set_validation_interface', () =>
  lib.func('btck_context_options_set_validation_interface', 'void', ['struct_btck_ContextOptions*', btck_ValidationInterfaceCallbacks])
);

export const btck_context_options_destroy = loadRequired('btck_context_options_destroy', () =>
  lib.func('btck_context_options_destroy', 'void', ['struct_btck_ContextOptions*'])
);

export const btck_context_create = loadRequired('btck_context_create', () =>
  lib.func('btck_context_create', 'struct_btck_Context*', ['struct_btck_ContextOptions*'])
);

export const btck_context_copy = loadRequired('btck_context_copy', () =>
  lib.func('btck_context_copy', 'struct_btck_Context*', ['struct_btck_Context*'])
);

export const btck_context_interrupt = loadRequired('btck_context_interrupt', () =>
  lib.func('btck_context_interrupt', int32_t, ['struct_btck_Context*'])
);

export const btck_context_destroy = loadRequired('btck_context_destroy', () =>
  lib.func('btck_context_destroy', 'void', ['struct_btck_Context*'])
);

/**===========================================================
 * Logging Bindings
 *===========================================================*/
export const btck_logging_disable = loadRequired('btck_logging_disable', () =>
  lib.func('btck_logging_disable', 'void', [])
);

export const btck_logging_set_options = loadRequired('btck_logging_set_options', () =>
  lib.func('btck_logging_set_options', 'void', [btck_LoggingOptions])
);

export const btck_logging_set_level_category = loadRequired('btck_logging_set_level_category', () =>
  lib.func('btck_logging_set_level_category', 'void', [btck_LogCategory, btck_LogLevel])
);

export const btck_logging_enable_category = loadRequired('btck_logging_enable_category', () =>
  lib.func('btck_logging_enable_category', 'void', [btck_LogCategory])
);

export const btck_logging_disable_category = loadRequired('btck_logging_disable_category', () =>
  lib.func('btck_logging_disable_category', 'void', [btck_LogCategory])
);

export const btck_logging_connection_create = loadRequired('btck_logging_connection_create', () =>
  lib.func('btck_logging_connection_create', 'struct_btck_LoggingConnection*', [koffi.pointer(btck_LogCallback), 'void*', koffi.pointer(btck_DestroyCallback)])
);

export const btck_logging_connection_destroy = loadRequired('btck_logging_connection_destroy', () =>
  lib.func('btck_logging_connection_destroy', 'void', ['struct_btck_LoggingConnection*'])
);

// APIs provided by the vendored Python-reference kernel snapshot.
koffi.opaque('struct_btck_Wtxid');
koffi.opaque('struct_btck_WitnessStack');
koffi.opaque('struct_btck_TxValidationState');

export const btck_block_header_get_merkle_root = loadRequired('btck_block_header_get_merkle_root', () =>
  lib.func('btck_block_header_get_merkle_root', 'void', ['struct_btck_BlockHeader*', koffi.pointer(ByteArray32)])
);
export const btck_chain_parameters_create_signet = loadRequired('btck_chain_parameters_create_signet', () =>
  lib.func('btck_chain_parameters_create_signet', 'struct_btck_ChainParameters*', ['const void*', size_t])
);
export const btck_chainstate_manager_options_set_database_cache_bytes = loadRequired('btck_chainstate_manager_options_set_database_cache_bytes', () =>
  lib.func('btck_chainstate_manager_options_set_database_cache_bytes', int32_t, ['struct_btck_ChainstateManagerOptions*', uint64_t])
);
export const btck_set_mock_time = loadRequired('btck_set_mock_time', () =>
  lib.func('btck_set_mock_time', int32_t, [int64_t])
);
export const btck_transaction_get_version = loadRequired('btck_transaction_get_version', () =>
  lib.func('btck_transaction_get_version', uint32_t, ['struct_btck_Transaction*'])
);
export const btck_transaction_has_witness = loadRequired('btck_transaction_has_witness', () =>
  lib.func('btck_transaction_has_witness', int32_t, ['struct_btck_Transaction*'])
);
export const btck_transaction_get_wtxid = loadRequired('btck_transaction_get_wtxid', () =>
  lib.func('btck_transaction_get_wtxid', 'struct_btck_Wtxid*', ['struct_btck_Transaction*'])
);
export const btck_wtxid_copy = loadRequired('btck_wtxid_copy', () =>
  lib.func('btck_wtxid_copy', 'struct_btck_Wtxid*', ['struct_btck_Wtxid*'])
);
export const btck_wtxid_destroy = loadRequired('btck_wtxid_destroy', () =>
  lib.func('btck_wtxid_destroy', 'void', ['struct_btck_Wtxid*'])
);
export const btck_wtxid_equals = loadRequired('btck_wtxid_equals', () =>
  lib.func('btck_wtxid_equals', int32_t, ['struct_btck_Wtxid*', 'struct_btck_Wtxid*'])
);
export const btck_wtxid_to_bytes = loadRequired('btck_wtxid_to_bytes', () =>
  lib.func('btck_wtxid_to_bytes', 'void', ['struct_btck_Wtxid*', koffi.pointer(ByteArray32)])
);
export const btck_transaction_input_get_script_sig = loadRequired('btck_transaction_input_get_script_sig', () =>
  lib.func('btck_transaction_input_get_script_sig', int32_t, ['struct_btck_TransactionInput*', koffi.pointer(WriteBytesCb), 'void*'])
);
export const btck_transaction_input_get_witness_stack = loadRequired('btck_transaction_input_get_witness_stack', () =>
  lib.func('btck_transaction_input_get_witness_stack', 'struct_btck_WitnessStack*', ['struct_btck_TransactionInput*'])
);
export const btck_witness_stack_copy = loadRequired('btck_witness_stack_copy', () =>
  lib.func('btck_witness_stack_copy', 'struct_btck_WitnessStack*', ['struct_btck_WitnessStack*'])
);
export const btck_witness_stack_destroy = loadRequired('btck_witness_stack_destroy', () =>
  lib.func('btck_witness_stack_destroy', 'void', ['struct_btck_WitnessStack*'])
);
export const btck_witness_stack_count_items = loadRequired('btck_witness_stack_count_items', () =>
  lib.func('btck_witness_stack_count_items', size_t, ['struct_btck_WitnessStack*'])
);
export const btck_witness_stack_get_item_at = loadRequired('btck_witness_stack_get_item_at', () =>
  lib.func('btck_witness_stack_get_item_at', int32_t, ['struct_btck_WitnessStack*', size_t, koffi.pointer(WriteBytesCb), 'void*'])
);
export const btck_tx_validation_state_create = loadRequired('btck_tx_validation_state_create', () =>
  lib.func('btck_tx_validation_state_create', 'struct_btck_TxValidationState*', [])
);
export const btck_tx_validation_state_destroy = loadRequired('btck_tx_validation_state_destroy', () =>
  lib.func('btck_tx_validation_state_destroy', 'void', ['struct_btck_TxValidationState*'])
);
export const btck_tx_validation_state_get_validation_mode = loadRequired('btck_tx_validation_state_get_validation_mode', () =>
  lib.func('btck_tx_validation_state_get_validation_mode', btck_ValidationMode, ['struct_btck_TxValidationState*'])
);
export const btck_tx_validation_state_get_tx_validation_result = loadRequired('btck_tx_validation_state_get_tx_validation_result', () =>
  lib.func('btck_tx_validation_state_get_tx_validation_result', uint32_t, ['struct_btck_TxValidationState*'])
);
export const btck_transaction_check = loadRequired('btck_transaction_check', () =>
  lib.func('btck_transaction_check', int32_t, ['struct_btck_Transaction*', 'struct_btck_TxValidationState*'])
);
