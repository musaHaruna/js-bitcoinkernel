import { test } from "node:test";
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

  const owner = new MockOwner(3);
  const seqObj = new SimpleSequence(owner);

  assert.equal(seqObj.length, 3, "Sequence length should match owner count");
  assert.equal(owner.count_calls, 1, "Length getter should have been invoked exactly once");

}

/**
 * LazySequence Positive Indexing Test Suite
 */
function testLazySequencePositiveIndexing(): void {

  const owner = new MockOwner(3);
  const seqObj = new SimpleSequence(owner);

  assert.equal(seqObj.get(0), "item_0", "Item at index 0 mismatch");
  assert.equal(seqObj.get(2), "item_2", "Item at index 2 mismatch");
  assert.deepEqual(owner.get_calls, [0, 2], "Underlying item fetches tracked incorrectly");

}

/**
 * LazySequence Negative Indexing Test Suite
 */
function testLazySequenceNegativeIndexing(): void {

  const owner = new MockOwner(3);
  const seqObj = new SimpleSequence(owner);

  assert.equal(seqObj.get(-1), "item_2", "Item at index -1 should evaluate to the last element");
  assert.equal(seqObj.get(-3), "item_0", "Item at index -3 should evaluate to the first element");
  assert.deepEqual(owner.get_calls, [2, 0], "Underlying item fetches tracked incorrectly");

}

/**
 * LazySequence Slicing Test Suite
 */
function testLazySequenceSlicing(): void {

  const owner = new MockOwner(4);
  const seqObj = new SimpleSequence(owner);

  const result = seqObj.slice(1, 3);
  assert.deepEqual(result, ["item_1", "item_2"], "Sliced array elements mismatch");
  assert.deepEqual(owner.get_calls, [1, 2], "Underlying slice items evaluated eagerly instead of on-demand loop");

}

/**
 * LazySequence Out of Bounds Test Suite
 */
function testLazySequenceOutOfBounds(): void {

  const owner = new MockOwner(2);
  const seqObj = new SimpleSequence(owner);

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

}
test("Lazy Sequence Length", testLazySequenceLength);

test("Lazy Sequence Positive Indexing", testLazySequencePositiveIndexing);

test("Lazy Sequence Negative Indexing", testLazySequenceNegativeIndexing);

test("Lazy Sequence Slicing", testLazySequenceSlicing);

test("Lazy Sequence Out Of Bounds", testLazySequenceOutOfBounds);

test("slice matches Array coercion and clamping", () => {
  class Numbers extends LazySequence<number> {
    get length() { return 4; }
    protected getItem(index: number) { return [10, 20, 30, 40][index]; }
  }
  const sequence = new Numbers();
  for (const start of [undefined, NaN, Infinity, -Infinity, -1.5, 1.8, -20, 20]) {
    for (const end of [undefined, NaN, Infinity, -Infinity, -1.5, 2.8, -20, 20]) {
      assert.deepEqual(sequence.slice(start, end), [10, 20, 30, 40].slice(start, end));
    }
  }
});
