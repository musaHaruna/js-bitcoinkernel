import assert from "node:assert/strict";
import { BlockHash, BlockHeader } from "../src/js-kernel/block.js";

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
 * BlockHeader Test Suite
 */
function testBlockHeader(): void {
    console.log("=== Testing BlockHeader ===");

    /**
     * Example serialized block header (80 bytes).
     * This represents a real or testnet-style header structure.
     */
    const headerHex = "00c06a24d2ff376fa4cab6d28ac75ea4a38a675ac1cafa668cb601000000000000000000755926c6aa5c931b0b054c370746824f8935b35bd27172f1a36c07749b5cd60b9aa77869a1fc01171794522b";

    const headerBytes = Uint8Array.from(Buffer.from(headerHex, "hex"));

    const header = BlockHeader.fromBytes(headerBytes);

    console.log("Testing block hash...");

    assert.equal(header.blockHash.toString(),"00000000000000000000b1a3614f5b43589011f52dcf2c67c9e66554823ed233");

    console.log("Testing previous hash...");

    assert.equal(header.prevHash.toString(), "00000000000000000001b68c66facac15a678aa3a45ec78ad2b6caa46f37ffd2");

    console.log("Testing timestamp...");

    // Unix timestamp validation
    assert.equal(Math.floor(header.timestamp.getTime() / 1000), 1769514906);

    console.log("Testing bits...");

    assert.equal(header.bits, 386006177);

    console.log("Testing version...");

    assert.equal(header.version, 610975744);

    console.log("Testing nonce...");

    assert.equal(header.nonce, 726832151);

    console.log("Testing serialization...");

    // Round-trip serialization must preserve original data
    assert.equal(Buffer.from(header.toBytes()).toString("hex"), headerHex);

    console.log("Testing string representation...");

    assert.equal(header.toString(), "BlockHeader hash=00000000000000000000b1a3614f5b43589011f52dcf2c67c9e66554823ed233");

    header.dispose();

    console.log("✓ BlockHeader tests passed");
    console.log();
    }

    /**
     * Invalid Input Tests
     *
     * Ensures strict validation of block header size constraints.
     */
    function testInvalidHeaderLengths(): void {
    console.log("Testing Invalid BlockHeader Lengths...");

    assert.throws(() => BlockHeader.fromBytes(new Uint8Array(79)));
    assert.throws(() => BlockHeader.fromBytes(new Uint8Array(81)));
    assert.throws(() => BlockHeader.fromBytes(new Uint8Array(0)));

    console.log("✓ Invalid BlockHeader length tests passed");
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
    testBlockHeader();
    testInvalidHeaderLengths();
    console.log("ALL TESTS PASSED");
  } catch (err) {
    console.error();
    console.error("TEST FAILED");
    console.error(err);
    process.exit(1);
  }
}

testBlock();