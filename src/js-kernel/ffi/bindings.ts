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

const ByteArray32 = koffi.array('uint8', 32);
const ByteArray80 = koffi.array('uint8', 80);

/**
 * Opaque Native Types
 */
koffi.opaque('struct_btck_BlockHash');

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
