import koffi from 'koffi';
import { Block, BlockTreeEntry, BlockValidationState } from './block.js';

/**
 * Strongly-typed definitions for domain-level blockchain validation event hooks.
 *
 * Consuming applications implement this interface to listen to lifecycle updates
 * emitted from the underlying native validation loop.
 */
export interface ValidationCallbacks {
    /**
     * Triggered immediately after a block finishes its context-free structural checks.
     *
     * @param block - The fully parsed block context. **Owned handle.**
     * @param state - The performance and error metrics result. **Borrowed view.**
     */
    block_checked?: (block: Block, state: BlockValidationState) => void;

    /**
     * Triggered when a block header successfully passes Proof-of-Work threshold checks.
     *
     * @param block - The associated block context. **Owned handle.**
     * @param entry - The mapped index node inside the block index tree. **Borrowed view.**
     */
    pow_valid_block?: (block: Block, entry: BlockTreeEntry) => void;

    /**
     * Triggered when a block is safely committed to the tip of the active consensus chain.
     *
     * At this point, the block's transactions are fully integrated, and the UTXO set is updated.
     *
     * @param block - The connected block context. **Owned handle.**
     * @param entry - The corresponding block tree index reference. **Borrowed view.**
     */
    block_connected?: (block: Block, entry: BlockTreeEntry) => void;

    /**
     * Triggered when a block is disconnected from the active consensus chain.
     *
     * Typically occurs during a blockchain reorganization (re-org) where an alternative 
     * branch with more accumulated work overtakes the current tip.
     *
     * @param block - The disconnected block context. **Owned handle.**
     * @param entry - The corresponding block tree index reference. **Borrowed view.**
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
 * Marshaling factory that intercepts instantiation to construct a native C-compatible structural payload.
 *
 * > ### ⚠️ Architectural Warning
 * > This class utilizes **constructor hijacking**. Executing `new ValidationInterfaceCallbacks(callbacks)` 
 * > does **not** return an instance of `ValidationInterfaceCallbacks`. Instead, it intercepts the instantiation 
 * > workflow to generate and return a raw JavaScript object structurally layout-aligned with the target 
 * > C struct expected by Koffi FFI.
 *
 * It acts as an orchestrator that:
 * 1. Sanitizes incoming high-level callbacks.
 * 2. Wraps bare unmanaged pointers into safe domain-level entities (`Block`, `BlockTreeEntry`, etc.).
 * 3. Registers low-level callbacks with the Koffi runtime.
 * 4. Transparently pins unmanaged callback handle tokens to prevent V8 garbage collection sweeps.
 */
export class ValidationInterfaceCallbacks {
    // Structural declaration fields instructing TypeScript that these properties 
    // are available on the resulting type projection without writing JavaScript assignments.
    declare public user_data: any;
    declare public user_data_destroy: any;
    declare public block_checked: any;
    declare public pow_valid_block: any;
    declare public block_connected: any;
    declare public block_disconnected: any;

    /**
     * Instantiate and transform high-level event functions into an FFI-mapped structural payload.
     *
     * @param callbacks - An object implementing the target event hooks.
     * @returns A plain layout payload matching the underlying native structural signature.
     * @throws {Error} If an unrecognized hook parameter key is detected.
     */
    constructor(callbacks: ValidationCallbacks) {
        // Strict error checking layer to catch typos and unmapped parameters
        for (const key of Object.keys(callbacks)) {
            if (!VALIDATION_FIELDS.has(key)) {
                throw new Error(`Callback parameter '${key}' is not recognized.`);
            }
        }

        /** Array anchoring registered function tokens to guarantee lifetime persistence against V8 GC. */
        const gcAnchors: any[] = [];

        /** Helper to register persistent, long-lived callbacks into Koffi */
        const registerCallback = (fn: Function | undefined, protoStr: string) => {
            if (!fn) return null;
            const registered = koffi.register(fn, protoStr);
            gcAnchors.push(registered); // Safe-keep the reference token away from V8 Garbage Collector
            return registered;
        };

        // Native proxy wrapper hooks matching the standard (user_data, block_ptr, detail_ptr) C call signature.
        // These map native opaque pointer outputs directly into domain-specific JavaScript objects.

        const blockCheckedWrapper = callbacks.block_checked ? (_ud: any, blockPtr: any, statePtr: any) => {
            const block = new Block(BigInt(blockPtr), true);
            const state = new BlockValidationState(BigInt(statePtr), false);
            callbacks.block_checked!(block, state);
        } : undefined;

        const powValidBlockWrapper = callbacks.pow_valid_block ? (_ud: any, blockPtr: any, entryPtr: any) => {
            const block = new Block(BigInt(blockPtr), true);
            const entry = new BlockTreeEntry(BigInt(entryPtr), false);
            callbacks.pow_valid_block!(block, entry);
        } : undefined;

        const blockConnectedWrapper = callbacks.block_connected ? (_ud: any, blockPtr: any, entryPtr: any) => {
            const block = new Block(BigInt(blockPtr), true);
            const entry = new BlockTreeEntry(BigInt(entryPtr), false);
            callbacks.block_connected!(block, entry);
        } : undefined;

        const blockDisconnectedWrapper = callbacks.block_disconnected ? (_ud: any, blockPtr: any, entryPtr: any) => {
            const block = new Block(BigInt(blockPtr), true);
            const entry = new BlockTreeEntry(BigInt(entryPtr), false);
            callbacks.block_disconnected!(block, entry);
        } : undefined;

        // Construct the pure memory payload matching the C struct layout exactly
        const payload = {
            user_data: null,
            user_data_destroy: null,
            block_checked: registerCallback(blockCheckedWrapper, 'BlockCheckedCb *'),
            pow_valid_block: registerCallback(powValidBlockWrapper, 'BlockEntryCb *'),
            block_connected: registerCallback(blockConnectedWrapper, 'BlockEntryCb *'),
            block_disconnected: registerCallback(blockDisconnectedWrapper, 'BlockEntryCb *'),
        };

        // Attach GC anchors invisibly onto the payload object to preserve references silently
        Object.defineProperty(payload, '_gcAnchors', {
            value: gcAnchors,
            enumerable: false,
            configurable: true,
            writable: true
        });

        // Hijack the constructor instantiation to return the aligned struct representation object directly
        return payload as any;
    }
}

/**
 * Default boilerplate validation callback interface pipeline.
 *
 * Logs essential diagnostic string summaries to the standard console output stream 
 * as events filter up from the unmanaged block validation layer.
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
