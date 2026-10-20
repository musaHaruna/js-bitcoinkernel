/**
 * Read-only sequence that fetches items when requested.
 *
 * Subclasses provide length and getItem(). Iteration fetches one item
 * at a time; slice() fetches its selected items into an ordinary array.
 * Returned native wrappers retain the ownership rules of the subclass.
 *
 * @template T - Type of each item.
 */
export abstract class LazySequence<T> implements Iterable<T> {
  /**
   * Return the current number of items in the backing collection.
   */
  abstract get length(): number;

  /**
   * Fetch one item at a normalized index.
   *
   * @param index - Non-negative index within the collection bounds.
   * @returns The item provided by the subclass.
   */
  protected abstract getItem(index: number): T;

  /**
   * Fetch an item using a safe integer index.
   *
   * Negative indexes count from the end: -1 selects the last item.
   * Fractions, NaN, infinities, and unsafe integers are rejected before
   * calling the underlying item accessor.
   *
   * @param index - Item index, optionally negative.
   * @returns The requested item.
   * @throws {RangeError} If the index is not a safe integer or is out of bounds.
   */
  public get(index: number): T {
    if (!Number.isSafeInteger(index)) throw new RangeError("Sequence index must be a safe integer");
    const len = this.length;

    if (index < 0) {
      index += len;
    }

    if (index < 0 || index >= len) {
      throw new RangeError("Sequence index out of range");
    }

    return this.getItem(index);
  }

  /**
   * Fetch a range into a new array using Array.slice numeric bounds.
   *
   * Fractions truncate toward zero, NaN becomes zero, and bounds are clamped
   * to the collection length. Negative bounds count from the end. No native
   * objects are deep-copied by this method.
   *
   * @param start - Inclusive start; defaults to zero.
   * @param end - Exclusive end; defaults to the collection length.
   * @returns The selected items, fetched immediately.
   */
  public slice(start?: number, end?: number): T[] {
    const len = this.length;

    // Normalize start index
    let kStart = start === undefined || Number.isNaN(start) ? 0 : Math.trunc(start);
    if (kStart < 0) {
      kStart = Math.max(len + kStart, 0);
    } else {
      kStart = Math.min(kStart, len);
    }

    // Normalize end index
    let kEnd = end === undefined ? len : Number.isNaN(end) ? 0 : Math.trunc(end);
    if (kEnd < 0) {
      kEnd = Math.max(len + kEnd, 0);
    } else {
      kEnd = Math.min(kEnd, len);
    }

    const result: T[] = [];
    for (let i = kStart; i < kEnd; i++) {
      result.push(this.getItem(i));
    }
    return result;
  }

  /**
     * Built-in iterator mechanism allowing sequence instances to be consumed directly.
     *
     * Enables integration with standard JavaScript features like `for...of` loops,
     * the array spread operator (`[...sequence]`), and array destructuring assignment.
     * Elements are pulled and evaluated sequentially.
     *
     * @returns A generator iterator over the elements of the sequence.
     */
  public *[Symbol.iterator](): Iterator<T> {
    const len = this.length;
    for (let i = 0; i < len; i++) {
      yield this.getItem(i);
    }
  }

  /**
     * Return a clean string representation of the lazy sequence.
     *
     * @returns A string mapping the exact class constructor name and its evaluated length.
     */
  public toString(): string {
    return `<${this.constructor.name} len=${this.length}>`;
  }
}