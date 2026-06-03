/**
 * An abstract lazy sequence that fetches items on-demand from a backing data source.
 *
 * Implements a read-only, array-like interface designed for efficient access to large 
 * collections exposed by native C kernels. Instead of eagerly marshaling an entire dataset 
 * across the FFI boundary into JavaScript memory, the sequence length is queried lazily, 
 * and individual elements are allocated and pulled *only* upon explicit index evaluation.
 *
 * Subclasses must override and implement:
 * - `get length()`: Return the total element count.
 * - `getItem(index)`: Retrieve a single element at a normalized, non-negative position.
 *
 * @template T - The type of elements contained within the sequence.
 */
export abstract class LazySequence<T> implements Iterable<T> {
    /**
     * Return the total number of elements in the sequence.
     *
     * * @note This getter must be overridden by concrete subclasses. Consider caching
     * the length internally if querying it via the native C API introduces significant 
     * cross-boundary overhead.
     * * @returns The element count as a standard JavaScript integer.
     */
    abstract get length(): number;

    /**
     * Lower-level hook to fetch an item at a specific normalized position.
     *
     * This method must be implemented by concrete subclasses to resolve data 
     * extraction from the native layer.
     *
     * @param index - A guaranteed non-negative index (already normalized from negative inputs).
     * @returns The hydrated item at the specified position.
     */
    protected abstract getItem(index: number): T;

    /**
     * Retrieve an item at a specific integer index, supporting negative indexing.
     *
     * This method maps negative integer arguments to offset back from the end of the 
     * sequence (e.g., `-1` targets the final element, mimicking Python-style sequences).
     *
     * @param index - The positional integer index to look up.
     * @returns The requested element.
     * @throws {RangeError} If the resolved index falls outside the range `[0, length)`.
     */
    public get(index: number): T {
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
     * Extract a shallow-copied section of the sequence into a new JavaScript Array.
     *
     * Behavioral semantics mirror standard `Array.prototype.slice`, cleanly handling 
     * missing, out-of-bounds, or negative boundary markers.
     *
     * @param start - Optional zero-based index at which to begin extraction (inclusive). 
     * If omitted, defaults to `0`.
     * @param end - Optional zero-based index before which to end extraction (exclusive). 
     * If omitted, defaults to the sequence length.
     * @returns A fresh JavaScript array containing the pulled and hydrated sequence elements.
     */
    public slice(start?: number, end?: number): T[] {
        const len = this.length;

        // Normalize start index
        let kStart = start === undefined ? 0 : start;
        if (kStart < 0) {
            kStart = Math.max(len + kStart, 0);
        } else {
            kStart = Math.min(kStart, len);
        }

        // Normalize end index
        let kEnd = end === undefined ? len : end;
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