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

export { BlockHash } from "./block.js";

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