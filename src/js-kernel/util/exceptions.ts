/**
 * Base class for all exceptions emitted by this library.
 *
 * Serves as the foundational error type for all native Bitcoin kernel wrapper exceptions, 
 * allowing developers to catch library-specific errors cleanly using a single `instanceof` check.
 */
export class KernelException extends Error {
    /**
     * Create a new kernel exception.
     *
     * @param message - Optional error message detailing the failure context.
     */
    constructor(message?: string) {
        super(message);
        // Corrects the prototype chain for custom Error types in JavaScript/TypeScript environments
        Object.setPrototypeOf(this, KernelException.prototype);
    }
}
