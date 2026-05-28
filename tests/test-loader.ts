import assert from "node:assert/strict";
import { lib } from "../src/js-kernel/ffi/loader.js";

/**
 * Loader Test Suite
 *
 * Ensures that the native Bitcoin kernel library:
 * - is correctly located
 * - loads successfully via koffi
 * - returns a valid binding object
 *
 * This test does NOT validate native function correctness,
 * only the integrity of the loading process.
 */
function runTests() {
  console.log("Running loader tests...");

  // Ensure library loaded
  assert.ok(lib, "lib failed to load (undefined or null)");

  // Must be object-like binding container
  assert.equal(typeof lib, "object", "lib must be an object");

  // Must not be primitive corruption
  assert.notEqual(typeof lib, "string", "lib should not be string");
  assert.notEqual(typeof lib, "number", "lib should not be number");
  assert.notEqual(typeof lib, "boolean", "lib should not be boolean");

  // Must be inspectable
  const keys = Object.keys(lib);
  assert.ok(Array.isArray(keys), "lib keys must be enumerable");

  // Prototype sanity check (basic structural integrity)
  assert.ok(
    Object.getPrototypeOf(lib) !== null,
    "lib must have a valid prototype"
  );

  // Ensure koffi returned a usable binding container (not empty failure object)
  assert.ok(lib, "lib is falsy after load");

  console.log("Loader test passed");
  console.log("Exported symbols:", keys);
  console.log();
}

runTests();