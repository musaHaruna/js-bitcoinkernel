import koffi from "koffi";

/**
 * Adapt a native callback to a JavaScript handler.
 *
 * C passes user_data first. JavaScript handlers use closures for their
 * state, so this wrapper discards that argument and forwards the rest.
 *
 * @param fn - Handler that does not expect user_data.
 * @returns A function accepting the native argument order.
 */
export function stripUserData<T extends (...args: any[]) => any>(fn: T): (...args: any[]) => any {
  return (_userData: any, ...args: any[]) => fn(...args);
}

/**
 * Validate callback names and prepare their JavaScript wrappers.
 *
 * Missing or null handlers become null fields. Supplied handlers must be
 * functions. Each wrapper removes the native user_data argument.
 * This prepares the functions; registerCallbacks creates native pointers.
 *
 * @param allowedFields - Callback names supported by the native interface.
 * @param callbacks - User-supplied handlers.
 * @returns The prepared payload and references to its wrapper functions.
 * @throws {Error} If a callback name is unknown.
 * @throws {TypeError} If a supplied handler is not a function.
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
    if (cbFunc == null) continue;
    if (typeof cbFunc !== "function") throw new TypeError(`Callback ${fieldName} must be a function`);

    const wrappedCallback = stripUserData(cbFunc as (...args: any[]) => any);

    gcAnchors[fieldName] = wrappedCallback;
    payload[fieldName] = wrappedCallback;
  }

  return { payload, gcAnchors };
}
/**
 * Register persistent C-callable pointers for a prepared callback interface.
 *
 * The native interface must call user_data_destroy when its last owner
 * releases it. That hook unregisters every Koffi handle, including itself.
 * The non-null user_data sentinel enables the hook; it is never dereferenced.
 *
 * Registration failures release handles already allocated. If installing
 * the returned interface fails, the caller must call release(). After a
 * successful installation, cleanup belongs to the native interface.
 * This helper does not catch exceptions thrown later by user handlers.
 *
 * @param payload - Prepared JavaScript callback fields.
 * @param prototypes - Koffi callback pointer types keyed by field name.
 * @returns The native payload and an idempotent release function.
 */
export function registerCallbacks(payload: Record<string, any>, prototypes: Record<string, string>) {
  const handles: bigint[] = [];
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    for (const handle of handles) koffi.unregister(handle);
  };
  try {
    // Non-null sentinel: native destructors only invoke user_data_destroy for non-null data.
    const native: Record<string, any> = { user_data: 1n };
    for (const [name, prototype] of Object.entries(prototypes)) {
      const fn = payload[name];
      native[name] = fn ? koffi.register(fn, prototype) : null;
      if (native[name]) handles.push(native[name]);
    }
    native.user_data_destroy = koffi.register(release, 'UserDataDestroyCb *');
    handles.push(native.user_data_destroy);
    return { native, release };
  } catch (error) {
    release();
    throw error;
  }
}

/**
 * Read a native byte span and decode it as UTF-8.
 *
 * Read exactly length bytes, preserving embedded NUL characters without
 * requiring a terminating NUL. A zero length returns an empty string.
 *
 * @param pointer - Native memory valid for the supplied byte length.
 * @param length - Byte count, not JavaScript string length.
 * @returns The decoded JavaScript string.
 */
export function decodeText(pointer: unknown, length: number | bigint): string {
  return Number(length) === 0 ? '' : Buffer.from(koffi.decode(pointer, 'uint8_t', Number(length))).toString('utf8');
}
