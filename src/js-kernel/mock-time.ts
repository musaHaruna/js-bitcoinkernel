import { btck_set_mock_time } from './ffi/bindings.js';

/**
 * Set the process-wide kernel clock for controlled tests.
 *
 * The timestamp is in Unix seconds. Pass zero to restore the system clock.
 * This affects all kernel contexts in the process; restore it in finally
 * and avoid overlapping operations that assume a different time.
 *
 * @param timestamp - Exact integer from 0 through 4294967295.
 * @throws {RangeError} If the value is unsafe, out of range, or rejected by the kernel.
 */
export function setMockTime(timestamp: number | bigint): void {
  if (typeof timestamp === 'number' && !Number.isSafeInteger(timestamp)) {
    throw new RangeError('Mock time must be an integer in [0, 4294967295]');
  }
  const value = BigInt(timestamp);
  if (value < 0n || value > 0xffffffffn || btck_set_mock_time(value) !== 0) {
    throw new RangeError('Mock time is outside [0, 4294967295]');
  }
}
