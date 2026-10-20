import { initializeCallbacks } from './util/callbacks.js';
import { Block, BlockTreeEntry, BlockValidationState } from './block.js';

/**
 * Handlers for native block validation events.
 *
 * Arguments are scoped to the synchronous callback. Copy supported values
 * before returning if they must be retained; async handlers are not awaited.
 */
export interface ValidationCallbacks {
  /**
     * Triggered immediately after a block finishes its context-free structural checks.
     *
     * @param block - The fully parsed block context. **Valid during the callback; copy to retain.**
     * @param state - The block validation result. **Borrowed for the duration of the callback.**
     */
  block_checked?: (block: Block, state: BlockValidationState) => void;

  /**
     * Triggered when a block header successfully passes Proof-of-Work threshold checks.
     *
     * @param block - The associated block context. **Valid during the callback; copy to retain.**
     * @param entry - The mapped index node inside the block index tree. **Borrowed for the duration of the callback.**
     */
  pow_valid_block?: (block: Block, entry: BlockTreeEntry) => void;

  /**
     * Triggered when a block is safely committed to the tip of the active consensus chain.
     *
     * At this point, the block's transactions are fully integrated, and the UTXO set is updated.
     *
     * @param block - The connected block context. **Valid during the callback; copy to retain.**
     * @param entry - The corresponding block tree index reference. **Borrowed for the duration of the callback.**
     */
  block_connected?: (block: Block, entry: BlockTreeEntry) => void;

  /**
     * Triggered when a block is disconnected from the active consensus chain.
     *
     * Typically occurs during a blockchain reorganization (re-org) where an alternative
     * branch with more accumulated work overtakes the current tip.
     *
     * @param block - The disconnected block context. **Valid during the callback; copy to retain.**
     * @param entry - The corresponding block tree index reference. **Borrowed for the duration of the callback.**
     */
  block_disconnected?: (block: Block, entry: BlockTreeEntry) => void;
}

/**
 * Internal validation whitelist used to sanitize incoming object keys.
 * Protects against silent typos or unmapped parameters passed from JavaScript.
 */
const VALIDATION_FIELDS = new Set([
  'block_checked',
  'pow_valid_block',
  'block_connected',
  'block_disconnected'
]);

/**
 * Prepare validation handlers for registration by ContextOptions.
 *
 * The kernel transfers a block handle to each callback and lends the
 * state or tree-entry pointer. After the handler, the block is destroyed
 * and borrowed wrappers are invalidated, even if the handler throws.
 *
 * Use block.copy() to retain a block: detach() on an already owned block
 * does not extend its callback lifetime. A supported borrowed detail may
 * be copied or detached during the handler and must then be disposed by
 * the caller. Cleanup does not swallow exceptions from user handlers.
 */
export class ValidationInterfaceCallbacks {
  declare public user_data: any;
  declare public user_data_destroy: any;
  declare public block_checked: any;
  declare public pow_valid_block: any;
  declare public block_connected: any;
  declare public block_disconnected: any;

  /**
   * Validate handlers and wrap native callback arguments.
   *
   * Registration with Koffi happens later in ContextOptions.
   *
   * @param callbacks - Optional handlers keyed by supported event name.
   * @throws {Error} If a callback name is unknown.
   * @throws {TypeError} If a supplied handler is not a function.
   */
  constructor(callbacks: ValidationCallbacks) {
    initializeCallbacks(VALIDATION_FIELDS, callbacks);
    this.user_data = null;
    this.user_data_destroy = null;
    for (const name of VALIDATION_FIELDS) {
      const fn = callbacks[name as keyof ValidationCallbacks];
      (this as any)[name] = fn ? (_ud: unknown, blockPtr: bigint, detailPtr: bigint) => {
        // The kernel transfers ownership of block, but lends the detail pointer.
        // Copy the block to retain it; detach only promotes borrowed detail objects.
        const block = new Block(blockPtr, true);
        const detail = name === 'block_checked'
          ? new BlockValidationState(detailPtr, false)
          : new BlockTreeEntry(detailPtr, false);
        try {
          (fn as (b: Block, d: typeof detail) => void)(block, detail);
        } finally {
          block.dispose();
          // detach() promotes state to an owned object that the caller must dispose.
          if (!(detail as any).ownsPtr) detail.dispose();
        }
      } : null;
    }
  }
}

/**
 * Optional handlers that print validation events to the console.
 */
export const defaultValidationCallbacks = new ValidationInterfaceCallbacks({
  block_checked: (block, state) => {
    console.log(`block_checked: block: ${block.toString()}, state: ${state.toString()}`);
  },
  pow_valid_block: (block, entry) => {
    console.log(`pow_valid_block: block: ${block.toString()}, entry: ${entry.toString()}`);
  },
  block_connected: (block, entry) => {
    console.log(`block_connected: block: ${block.toString()}, entry: ${entry.toString()}`);
  },
  block_disconnected: (block, entry) => {
    console.log(`block_disconnected: block: ${block.toString()}, entry: ${entry.toString()}`);
  },
});
