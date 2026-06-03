import koffi from 'koffi';
import { lib } from './loader.js';

/**
 * Helper: Safe optional loader
 * Attempts to load a native function and logs a warning if it fails.
 * This avoids silent failures while still allowing optional features.
 */
function loadOptional<T>(name: string, loader: () => T): T | undefined {
    try {
        return loader();
    } catch (err) {
        console.warn(`[native-binding] Missing or failed: ${name}`, err);
        return undefined;
    }
}

/**
 * Primitive Type Aliases
 */
const size_t = 'uint64';
const uint32_t = 'uint32';
const int32_t = 'int32';
const int64_t = "int64";
const uint64_t = "uint64";

const ByteArray32 = koffi.array('uint8', 32);
const ByteArray80 = koffi.array('uint8', 80);

/**
 * Opaque Native Types
 */
koffi.opaque('struct_btck_BlockHash');
koffi.opaque('struct_btck_BlockHeader');
koffi.opaque('struct_btck_TransactionOutput');
koffi.opaque('struct_btck_TransactionOutPoint');
koffi.opaque('struct_btck_TransactionInput');
koffi.opaque('struct_btck_TransactionSpentOutputs');

export const WriteBytesCb = koffi.proto("WriteBytesCb", int32_t, ["const void *", uint64_t, "void *"]);

/**
 * Block Hash Bindings
 */
export const btck_block_hash_create = loadOptional('btck_block_hash_create', () => 
    lib.func('btck_block_hash_create', 'struct_btck_BlockHash*', [koffi.pointer(ByteArray32)])
);

export const btck_block_hash_equals = loadOptional('btck_block_hash_equals', () =>
    lib.func('btck_block_hash_equals', int32_t, ['struct_btck_BlockHash*', 'struct_btck_BlockHash*'])
);

export const btck_block_hash_copy = loadOptional('btck_block_hash_copy', () =>
    lib.func('btck_block_hash_copy', 'struct_btck_BlockHash*', ['struct_btck_BlockHash*'])
);

export const btck_block_hash_to_bytes = loadOptional('btck_block_hash_to_bytes',() =>
    lib.func('btck_block_hash_to_bytes', 'void', ['struct_btck_BlockHash*', koffi.pointer(ByteArray32)])
);

export const btck_block_hash_destroy = loadOptional('btck_block_hash_destroy', () =>
    lib.func('btck_block_hash_destroy', 'void', ['struct_btck_BlockHash*'])
);

/**
 * Block Header Bindings
 */
export const btck_block_header_create = loadOptional('btck_block_header_create', () =>
    lib.func('btck_block_header_create', 'struct_btck_BlockHeader*', ['void*', size_t])
);

export const btck_block_header_copy = loadOptional('btck_block_header_copy', () =>
    lib.func('btck_block_header_copy', 'struct_btck_BlockHeader*', ['struct_btck_BlockHeader*'])
);

export const btck_block_header_get_hash = loadOptional('btck_block_header_get_hash', () =>
    lib.func('btck_block_header_get_hash', 'struct_btck_BlockHash*', ['struct_btck_BlockHeader*'])
);

export const btck_block_header_get_prev_hash = loadOptional('btck_block_header_get_prev_hash', () =>
    lib.func('btck_block_header_get_prev_hash', 'struct_btck_BlockHash*', ['struct_btck_BlockHeader*'])
);

export const btck_block_header_get_timestamp = loadOptional('btck_block_header_get_timestamp', () =>
    lib.func('btck_block_header_get_timestamp', uint32_t, ['struct_btck_BlockHeader*'])
);

export const btck_block_header_get_bits = loadOptional('btck_block_header_get_bits', () =>
    lib.func('btck_block_header_get_bits', uint32_t, ['struct_btck_BlockHeader*'])
);

export const btck_block_header_get_version = loadOptional('btck_block_header_get_version', () =>
    lib.func('btck_block_header_get_version', int32_t, ['struct_btck_BlockHeader*'])
);

export const btck_block_header_get_nonce = loadOptional('btck_block_header_get_nonce',() =>
    lib.func('btck_block_header_get_nonce', uint32_t, ['struct_btck_BlockHeader*'])
);

export const btck_block_header_to_bytes = loadOptional('btck_block_header_to_bytes', () =>
    lib.func('btck_block_header_to_bytes', int32_t, ['struct_btck_BlockHeader*', koffi.pointer(ByteArray80)])
);

export const btck_block_header_destroy = loadOptional('btck_block_header_destroy', () =>
    lib.func('btck_block_header_destroy', 'void', ['struct_btck_BlockHeader*'])
);


/**=========================================================
 * Transaction Bindings
 *==========================================================/

/**
 * Txid
 */
export const btck_txid_copy = loadOptional('btck_txid_copy', () =>
    lib.func('btck_txid_copy', 'struct_btck_Txid*', ['struct_btck_Txid*'])
);

export const btck_txid_equals = loadOptional('btck_txid_equals', () =>
    lib.func('btck_txid_equals', int32_t, ['struct_btck_Txid*', 'struct_btck_Txid*'])
);

export const btck_txid_to_bytes = loadOptional('btck_txid_to_bytes', () =>
    lib.func('btck_txid_to_bytes', 'void', ['struct_btck_Txid*', koffi.pointer(ByteArray32)])
);

export const btck_txid_destroy = loadOptional('btck_txid_destroy', () =>
    lib.func('btck_txid_destroy', 'void', ['struct_btck_Txid*'])
);

/**
 * Transaction
 */
export const btck_transaction_create = loadOptional('btck_transaction_create', () =>
    lib.func('btck_transaction_create', 'struct_btck_Transaction*', ['const void*', size_t])
);

export const btck_transaction_copy = loadOptional('btck_transaction_copy', () =>
    lib.func('btck_transaction_copy', 'struct_btck_Transaction*', ['struct_btck_Transaction*'])
);

export const btck_transaction_to_bytes =loadOptional("btck_transaction_to_bytes", () =>
    lib.func("btck_transaction_to_bytes", int32_t, ["struct_btck_Transaction*", koffi.pointer(WriteBytesCb),"void*"])
    );

export const btck_transaction_count_inputs = loadOptional('btck_transaction_count_inputs', () =>
    lib.func('btck_transaction_count_inputs', size_t, ['struct_btck_Transaction*'])
);

export const btck_transaction_get_input_at = loadOptional('btck_transaction_get_input_at', () =>
    lib.func('btck_transaction_get_input_at', 'struct_btck_TransactionInput*', ['struct_btck_Transaction*', size_t])
);

export const btck_transaction_count_outputs = loadOptional('btck_transaction_count_outputs', () =>
    lib.func('btck_transaction_count_outputs', size_t, ['struct_btck_Transaction*'])
);

export const btck_transaction_get_output_at = loadOptional('btck_transaction_get_output_at', () =>
    lib.func('btck_transaction_get_output_at', 'struct_btck_TransactionOutput*', ['struct_btck_Transaction*', size_t])
);

export const btck_transaction_get_locktime = loadOptional('btck_transaction_get_locktime', () =>
    lib.func('btck_transaction_get_locktime', uint32_t, ['struct_btck_Transaction*'])
);

export const btck_transaction_get_txid = loadOptional('btck_transaction_get_txid', () =>
    lib.func('btck_transaction_get_txid', 'struct_btck_Txid*', ['struct_btck_Transaction*'])
);

export const btck_transaction_destroy = loadOptional('btck_transaction_destroy', () =>
    lib.func('btck_transaction_destroy', 'void', ['struct_btck_Transaction*'])
);

/**
 * TransactionOutput 
 */
export const btck_transaction_output_create = loadOptional('btck_transaction_output_create', () =>
    lib.func('btck_transaction_output_create', 'struct_btck_TransactionOutput*', ['struct_btck_ScriptPubkey*', int64_t])
);

export const btck_transaction_output_get_script_pubkey = loadOptional('btck_transaction_output_get_script_pubkey', () =>
    lib.func('btck_transaction_output_get_script_pubkey', 'struct_btck_ScriptPubkey*', ['struct_btck_TransactionOutput*'])
);

export const btck_transaction_output_get_amount = loadOptional('btck_transaction_output_get_amount', () =>
    lib.func('btck_transaction_output_get_amount', int64_t, ['struct_btck_TransactionOutput*'])
);

export const btck_transaction_output_copy = loadOptional('btck_transaction_output_copy', () =>
    lib.func('btck_transaction_output_copy', 'struct_btck_TransactionOutput*', ['struct_btck_TransactionOutput*'])
);

export const btck_transaction_output_destroy = loadOptional('btck_transaction_output_destroy', () =>
    lib.func('btck_transaction_output_destroy', 'void', ['struct_btck_TransactionOutput*'])
);

/**
 * TransactionSpentOutputs
 */
export const btck_transaction_spent_outputs_copy = loadOptional('btck_transaction_spent_outputs_copy', () =>
    lib.func('btck_transaction_spent_outputs_copy', 'struct_btck_TransactionSpentOutputs*', ['struct_btck_TransactionSpentOutputs*'])
);

export const btck_transaction_spent_outputs_count = loadOptional('btck_transaction_spent_outputs_count', () =>
    lib.func('btck_transaction_spent_outputs_count', size_t, ['struct_btck_TransactionSpentOutputs*'])
);

export const btck_transaction_spent_outputs_get_coin_at = loadOptional('btck_transaction_spent_outputs_get_coin_at', () =>
    lib.func('btck_transaction_spent_outputs_get_coin_at', 'struct_btck_Coin*', ['struct_btck_TransactionSpentOutputs*', size_t])
);

export const btck_transaction_spent_outputs_destroy = loadOptional('btck_transaction_spent_outputs_destroy', () =>
    lib.func('btck_transaction_spent_outputs_destroy', 'void', ['struct_btck_TransactionSpentOutputs*'])
);

/**
 * TransactionOutPoint
 */
export const btck_transaction_out_point_copy = loadOptional('btck_transaction_out_point_copy', () =>
    lib.func('btck_transaction_out_point_copy', 'struct_btck_TransactionOutPoint*', ['struct_btck_TransactionOutPoint*'])
);

export const btck_transaction_out_point_get_index = loadOptional('btck_transaction_out_point_get_index', () =>
    lib.func('btck_transaction_out_point_get_index', uint32_t, ['struct_btck_TransactionOutPoint*'])
);

export const btck_transaction_out_point_get_txid = loadOptional('btck_transaction_out_point_get_txid', () =>
    lib.func('btck_transaction_out_point_get_txid', 'struct_btck_Txid*', ['struct_btck_TransactionOutPoint*'])
);

export const btck_transaction_out_point_destroy = loadOptional('btck_transaction_out_point_destroy', () =>
    lib.func('btck_transaction_out_point_destroy', 'void', ['struct_btck_TransactionOutPoint*'])
);

/**
 * TransactionInput
 */
export const btck_transaction_input_copy = loadOptional('btck_transaction_input_copy', () =>
    lib.func('btck_transaction_input_copy', 'struct_btck_TransactionInput*', ['struct_btck_TransactionInput*'])
);

export const btck_transaction_input_get_out_point = loadOptional('btck_transaction_input_get_out_point', () =>
    lib.func('btck_transaction_input_get_out_point', 'struct_btck_TransactionOutPoint*', ['struct_btck_TransactionInput*'])
);

export const btck_transaction_input_get_sequence = loadOptional('btck_transaction_input_get_sequence', () =>
    lib.func('btck_transaction_input_get_sequence', uint32_t, ['struct_btck_TransactionInput*'])
);

export const btck_transaction_input_destroy = loadOptional('btck_transaction_input_destroy', () =>
    lib.func('btck_transaction_input_destroy', 'void', ['struct_btck_TransactionInput*'])
);