import assert from "node:assert/strict";
import { LazySequence } from "../../src/js-kernel/util/sequence.js";

/**
 * Mock classes to track invocations and simulate lazy evaluation behavior.
 */
class MockOwner {
  public count: number;
  public count_calls = 0;
  public get_calls: number[] = [];

  constructor(count: number) {
    this.count = count;
  }
}

class SimpleSequence extends LazySequence<string> {
  private _owner: MockOwner;

  constructor(owner: MockOwner) {
    super();
    this._owner = owner;
  }

  get length(): number {
    this._owner.count_calls++;
    return this._owner.count;
  }

  protected getItem(index: number): string {
    this._owner.get_calls.push(index);
    return `item_${index}`;
  }
}

/**
 * LazySequence Length Test Suite
 */
function testLazySequenceLength(): void {
  console.log("=== Testing LazySequence Length ===");

  const owner = new MockOwner(3);
  const seqObj = new SimpleSequence(owner);

  console.log("Testing evaluation of length property...");
  assert.equal(seqObj.length, 3, "Sequence length should match owner count");
  assert.equal(owner.count_calls, 1, "Length getter should have been invoked exactly once");

  console.log("✓ LazySequence length tests passed");
  console.log();
}

/**
 * LazySequence Positive Indexing Test Suite
 */
function testLazySequencePositiveIndexing(): void {
  console.log("=== Testing LazySequence Positive Indexing ===");

  const owner = new MockOwner(3);
  const seqObj = new SimpleSequence(owner);

  console.log("Testing element access via positive indices...");
  assert.equal(seqObj.get(0), "item_0", "Item at index 0 mismatch");
  assert.equal(seqObj.get(2), "item_2", "Item at index 2 mismatch");
  assert.deepEqual(owner.get_calls, [0, 2], "Underlying item fetches tracked incorrectly");

  console.log("✓ LazySequence positive indexing tests passed");
  console.log();
}

/**
 * LazySequence Negative Indexing Test Suite
 */
function testLazySequenceNegativeIndexing(): void {
  console.log("=== Testing LazySequence Negative Indexing ===");

  const owner = new MockOwner(3);
  const seqObj = new SimpleSequence(owner);

  console.log("Testing element access via Python-style negative indices...");
  assert.equal(seqObj.get(-1), "item_2", "Item at index -1 should evaluate to the last element");
  assert.equal(seqObj.get(-3), "item_0", "Item at index -3 should evaluate to the first element");
  assert.deepEqual(owner.get_calls, [2, 0], "Underlying item fetches tracked incorrectly");

  console.log("✓ LazySequence negative indexing tests passed");
  console.log();
}

/**
 * LazySequence Slicing Test Suite
 */
function testLazySequenceSlicing(): void {
  console.log("=== Testing LazySequence Slicing ===");

  const owner = new MockOwner(4);
  const seqObj = new SimpleSequence(owner);

  console.log("Testing shallow extraction via slice()...");
  const result = seqObj.slice(1, 3);
  assert.deepEqual(result, ["item_1", "item_2"], "Sliced array elements mismatch");
  assert.deepEqual(owner.get_calls, [1, 2], "Underlying slice items evaluated eagerly instead of on-demand loop");

  console.log("✓ LazySequence slicing tests passed");
  console.log();
}

/**
 * LazySequence Out of Bounds Test Suite
 */
function testLazySequenceOutOfBounds(): void {
  console.log("=== Testing LazySequence Index Out of Bounds ===");

  const owner = new MockOwner(2);
  const seqObj = new SimpleSequence(owner);

  console.log("Testing strict index safety limits...");

  // Positive boundary check
  assert.throws(
    () => seqObj.get(2),
    RangeError,
    "Accessing index equal to length must trigger a RangeError"
  );

  // Negative boundary check
  assert.throws(
    () => seqObj.get(-3),
    RangeError,
    "Accessing negative index past bounds must trigger a RangeError"
  );

  console.log("✓ LazySequence out of bounds bounds tests passed");
  console.log();
}

/**
 * Test Runner
 *
 * Executes all LazySequence test suites in sequence.
 * Exits with error code 1 if any assertion fails.
 */
function testSequence(): void {
  try {
    testLazySequenceLength();
    testLazySequencePositiveIndexing();
    testLazySequenceNegativeIndexing();
    testLazySequenceSlicing();
    testLazySequenceOutOfBounds();
    console.log("ALL TESTS PASSED");
  } catch (err) {
    console.error();
    console.error("TEST FAILED");
    console.error(err);
    process.exit(1);
  }
}

testSequence();