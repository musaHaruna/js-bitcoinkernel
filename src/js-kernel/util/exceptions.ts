/**
 * Base class for all runtime exceptions emitted by the kernel wrapper library.
 *
 * Serves as the foundational error type for all native Bitcoin kernel wrapper exceptions. 
 * By routing all library-specific failures through this base class, consuming applications can 
 * implement unified error-handling strategies using a single `instanceof KernelException` sweep.
 */
export class KernelException extends Error {
    /**
     * Create a new kernel exception instance.
     *
     * @param message - Optional diagnostic error message detailing the underlying failure context.
     */
    constructor(message?: string) {
        super(message);
        
        // Restore correct prototype chain alignment for custom Error sub-classes 
        // to ensure proper behavior in V8/JavaScript execution environments.
        Object.setPrototypeOf(this, KernelException.prototype);
    }
}

/**
 * Exception raised when the `ChainstateManager` encounters an error while processing or validating a full block.
 *
 * This exception signifies that a block failed full consensus verification. Common triggers include:
 * * Missing or double-spent parent outpoints in the current UTXO snapshot context.
 * * Broken scripts or invalid cryptographic transaction signatures.
 * * Hard structural violations of block size, subsidy allocations, or Merkle root matching rules.
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
 * Exception raised when the `ChainstateManager` encounters an error while processing or validating an isolated block header.
 *
 * This exception typically indicates a failure during early network parsing and header tracking. Common triggers include:
 * * Insufficient Proof-of-Work (PoW) meeting the network's active target difficulty requirements.
 * * A block timestamp that drifts too far into the future relative to median-time-past calculations.
 * * Chaining mismatches, where the `hashPrevBlock` parameter links to an unrecognized or invalid historical parent block header.
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
