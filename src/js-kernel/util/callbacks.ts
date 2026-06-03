/**
 * Wraps a callback function to strip its first argument (`_userData`) upon invocation.
 *
 * This utility bridges the gap between C-style native callbacks—which prepend an 
 * opaque context pointer (`user_data`) as their first argument—and standard 
 * JavaScript/TypeScript closures that capture state lexically and do not require it.
 *
 * @template T - The function type of the underlying JavaScript callback.
 * @param fn - The underlying callback function that expects arguments *without* a user data pointer.
 * @returns A wrapped function wrapper that discards its first argument and forwards the remaining arguments to `fn`.
 */
export function stripUserData<T extends (...args: any[]) => any>(fn: T): (...args: any[]) => any {
    return (_userData: any, ...args: any[]) => fn(...args);
}

/**
 * Validates, transforms, and organizes JavaScript callbacks for native FFI layer delivery.
 *
 * This function processes a plain object containing callback functions, verifying them against 
 * a registry of allowed configuration fields. It transforms the functions to ignore native context 
 * pointers and returns:
 * 1. A `payload` struct shape initialized with native interface properties (`user_data`, etc.).
 * 2. A `gcAnchors` registry designed to retain explicit references to the newly allocated 
 * callback wrappers, preventing the JavaScript runtime from prematurely garbage-collecting 
 * them while they are registered across the native boundary.
 *
 * @template T - An object type representing the user-supplied callback map.
 * @param allowedFields - A set of recognized field names permitted by the native layout definition.
 * @param callbacks - An object mapping layout field names to their corresponding JavaScript implementations.
 * @returns An object containing the FFI layout (`payload`) and the references protecting them from GC (`gcAnchors`).
 * @throws {Error} If the `callbacks` object contains any key/property not explicitly permitted by `allowedFields`.
 */
export function initializeCallbacks<T extends object>(
    allowedFields: Set<string>,
    callbacks: T
): { payload: Record<string, any>; gcAnchors: Record<string, (...args: any[]) => any> } {
    
    const gcAnchors: Record<string, (...args: any[]) => any> = {};
    
    const payload: Record<string, any> = {
        user_data: null,
        user_data_destroy: null,
    };
    for (const field of allowedFields) {
        payload[field] = null;
    }

    const unknownCallbacks = Object.keys(callbacks).filter(key => !allowedFields.has(key));
    if (unknownCallbacks.length > 0) {
        throw new Error(`ValueError: Callbacks [${unknownCallbacks.join(', ')}] are not recognized`);
    }

    // Object.entries handles any plain object structure regardless of interface limitations
    for (const [fieldName, cbFunc] of Object.entries(callbacks)) {
        if (!cbFunc) continue;

        const wrappedCallback = stripUserData(cbFunc as (...args: any[]) => any);
        
        gcAnchors[fieldName] = wrappedCallback;
        payload[fieldName] = wrappedCallback;
    }

    return { payload, gcAnchors };
}