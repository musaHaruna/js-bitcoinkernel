/**
 * Base class for the wrapper's kernel-specific exceptions.
 *
 * The error name follows the constructed subclass. Argument and lifetime
 * checks may instead throw standard TypeError, RangeError, or Error values.
 */
export class KernelException extends Error {
  /**
     * Create a new kernel exception instance.
     *
     * @param message - Optional diagnostic error message detailing the underlying failure context.
     */
  constructor(message?: string) {
    super(message);

    // Preserve the concrete subclass name in error output.
    this.name = new.target.name;
  }
}

/**
 * Report a failed native block-processing operation.
 *
 * The code preserves the native operation status. It is not a complete
 * consensus rejection reason by itself.
 */
export class ProcessBlockException extends KernelException {
  /** * The explicit status error code returned directly by the underlying native C API.
     * Mapping this code helps identify the specific internal failure cause (e.g., consensus vs. disk I/O errors).
     */
  public readonly code: number;

  /**
     * Create a block processing exception wrapper.
     *
     * @param code - The numeric error status code extracted from the native kernel layer.
     */
  constructor(code: number) {
    super(`Block processing failed with error code ${code}`);
    this.code = code;

    // Restore correct prototype chain alignment for custom Error sub-classes
    // to ensure proper behavior in V8/JavaScript execution environments.
    Object.setPrototypeOf(this, ProcessBlockException.prototype);
  }
}

/**
 * Report a failed native block-header processing operation.
 *
 * The code preserves the native operation status. Consult the validation
 * state, where available, for details about a rejected header.
 */
export class ProcessBlockHeaderException extends KernelException {
  /** * The explicit status error code returned directly by the underlying native C API.
     * Mapping this code helps identify the specific internal failure cause (e.g., checkpoint violation vs. difficulty mismatch).
     */
  public readonly code: number;

  /**
     * Create a block header processing exception wrapper.
     *
     * @param code - The numeric error status code extracted from the native kernel layer.
     */
  constructor(code: number) {
    super(`Block header processing failed with error code ${code}`);
    this.code = code;

    // Restore correct prototype chain alignment for custom Error sub-classes
    // to ensure proper behavior in V8/JavaScript execution environments.
    Object.setPrototypeOf(this, ProcessBlockHeaderException.prototype);
  }
}
