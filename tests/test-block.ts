import assert from "node:assert/strict";
import { BlockHash } from "../src/js-kernel/block.js";

/**
 * BlockHash Test Suite
 */
function testBlockHash(): void {
    console.log("=== Testing BlockHash ===");

    /**
     * Create deterministic test inputs.
     */
    const zeroBytes = new Uint8Array(32).fill("0".charCodeAt(0));
    const oneBytes = new Uint8Array(32).fill("1".charCodeAt(0));

    const hashZero = BlockHash.fromBytes(zeroBytes);

    console.log("Testing equality...");

    // Self-equality should always hold
    assert.equal(hashZero.equals(hashZero), true, "hash should equal itself");

    // Identical byte inputs should produce equal hashes
    assert.equal(hashZero.equals(BlockHash.fromBytes(zeroBytes)), true, "identical hashes should compare equal");

    // Different inputs should not be equal
    assert.equal(hashZero.equals(BlockHash.fromBytes(oneBytes)), false, "different hashes should not compare equal");

    console.log("Testing serialization...");

    // Serialization must be lossless
    assert.deepEqual(hashZero.toBytes(), zeroBytes, "serialized bytes mismatch");

    console.log("Testing string conversion...");

    // Ensure correct hex encoding (little-endian reversed display)
    assert.equal(hashZero.toString(), "3030303030303030303030303030303030303030303030303030303030303030");

    console.log("Testing invalid length...");

    // Input validation must reject incorrect sizes
    assert.throws(() => BlockHash.fromBytes(new Uint8Array(31)));

    hashZero.dispose();

    console.log("✓ BlockHash tests passed");
    console.log();
}

/**
 * Test Runner
 *
 * Executes all test suites in sequence.
 * Exits with error code 1 if any assertion fails.
 */
function testBlock(): void {
  try {
    testBlockHash();
    console.log("ALL TESTS PASSED");
  } catch (err) {
    console.error();
    console.error("TEST FAILED");
    console.error(err);
    process.exit(1);
  }
}

testBlock();
