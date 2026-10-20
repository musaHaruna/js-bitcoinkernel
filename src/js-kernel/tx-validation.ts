import {
  btck_tx_validation_state_create, btck_tx_validation_state_destroy,
  btck_tx_validation_state_get_validation_mode, btck_tx_validation_state_get_tx_validation_result,
} from './ffi/bindings.js';
import { KernelOpaquePtr } from './ffi/KernelOpaquePtr.js';
import { ValidationMode } from './block.js';

/**
 * Native transaction validation result categories.
 *
 * These describe consensus and policy failures supported by the C API.
 * Transaction.check() performs only context-free checks and does not
 * produce every policy category. Inspect validationMode alongside this result.
 */
export enum TxValidationResult {
  UNSET = 0,
  CONSENSUS = 1,
  INPUTS_NOT_STANDARD = 2,
  NOT_STANDARD = 3,
  MISSING_INPUTS = 4,
  PREMATURE_SPEND = 5,
  WITNESS_MUTATED = 6,
  WITNESS_STRIPPED = 7,
  CONFLICT = 8,
  MEMPOOL_POLICY = 9,
  NO_MEMPOOL = 10,
  RECONSIDERABLE = 11,
  UNKNOWN = 12,
}

/**
 * Wrapper for a native transaction validation state.
 *
 * Transaction.check() returns an owned state for the caller to dispose.
 * The mode distinguishes valid, invalid, and error outcomes; the result
 * provides the native category. This API supplies no native copy operation,
 * so copy() and detaching a borrowed state are unsupported.
 */
export class TxValidationState extends KernelOpaquePtr {
  protected static override destroyFn = btck_tx_validation_state_destroy;

  /**
   * Create an empty native state or wrap an existing state pointer.
   *
   * @param ptr - Existing pointer; omit to allocate a new state.
   * @param ownsPtr - Whether this wrapper must destroy the state.
   * @param parent - Optional owner of a borrowed state.
   * @throws {Error} If creation fails, the pointer is null, or the parent is invalid.
   */
  constructor(ptr?: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
    const handle = ptr === undefined ? btck_tx_validation_state_create() : ptr;
    if (!handle) throw new Error('Failed to create TxValidationState');
    super(handle, ownsPtr, parent);
  }

  /**
   * Return whether native validation reports valid, invalid, or error.
   *
   * @throws {Error} If this state or its owner is invalid.
   */
  get validationMode(): ValidationMode {
    return btck_tx_validation_state_get_validation_mode(this.getHandle());
  }

  /**
   * Return the native transaction validation result category.
   *
   * Use validationMode to determine whether validation succeeded; this
   * category alone does not establish full transaction validity.
   *
   * @throws {Error} If this state or its owner is invalid.
   */
  get txValidationResult(): TxValidationResult {
    return btck_tx_validation_state_get_tx_validation_result(this.getHandle());
  }

  /**
   * Return a diagnostic string containing the mode and result names.
   *
   * @throws {Error} If this state or its owner is invalid.
   */
  override toString(): string {
    return `<TxValidationState mode=${ValidationMode[this.validationMode]} result=${TxValidationResult[this.txValidationResult]}>`;
  }
}
