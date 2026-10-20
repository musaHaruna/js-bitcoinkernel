/**
 * Convert an exact integer to the native signed 64-bit representation.
 *
 * Numbers must be safe integers; use bigint for larger exact values.
 * The accepted range is -2^63 through 2^63 - 1. This checks storage
 * limits, not Bitcoin consensus amount limits or whether a value is positive.
 *
 * @param value - Integer to pass to the native API.
 * @returns The exact value as a bigint.
 * @throws {RangeError} If the number is unsafe or outside the int64 range.
 */
export function int64(value: number | bigint): bigint {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    throw new RangeError('Amount must be a safe integer number or an int64 bigint');
  }
  const integer = BigInt(value);
  if (integer < -(1n << 63n) || integer >= (1n << 63n)) {
    throw new RangeError('Amount is outside the int64 range');
  }
  return integer;
}

/**
 * Check that a flag value contains only supported unsigned 32-bit bits.
 *
 * This checks the bit mask, not dependencies between individual flags.
 *
 * @param value - Flags supplied by the caller.
 * @param mask - Bitwise combination of all supported flags.
 * @throws {RangeError} If the value is not an integer in range or has unknown bits.
 */
export function flagsWithin(value: number, mask: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff || (value & ~mask) !== 0) {
    throw new RangeError('Unsupported verification flags');
  }
}
