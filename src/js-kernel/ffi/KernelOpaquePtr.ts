/**
 * Constructor type for classes extending KernelOpaquePtr.
 * * Provides structural definition for subclasses, including optional native
 * creation function binding.
 */
export type KernelOpaquePtrConstructor<T extends KernelOpaquePtr> = {
  new (ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null): T;

  createFn?: (...args: unknown[]) => bigint;
};

/**
 * Base class for opaque native pointer wrappers.
 *
 * Manages the lifecycle of opaque pointers returned from a native Bitcoin kernel (C) layer.
 * It handles pointer ownership, deep duplication, view referencing, and automated or explicit disposal.
 *
 * Subclasses are expected to bind native functions:
 * - `createFn`: allocate native resource
 * - `destroyFn`: free native resource
 * - `copyFn`: duplicate native resource
 */
export abstract class KernelOpaquePtr {
  /** Native pointer handle. Nullified once disposed. */
  protected ptr: bigint | null;

  /** Whether this instance owns the pointer and is responsible for freeing it. */
  protected ownsPtr: boolean;

  /** Optional parent object to keep the parent ownership chain alive in memory. */
  protected parent: KernelOpaquePtr | null;

  protected static createFn?: (...args: any[]) => bigint;
  protected static destroyFn?: (ptr: bigint) => void;
  protected static copyFn?: (ptr: bigint) => bigint;

  /**
     * Initialize the native pointer wrapper.
     *
     * @param ptr - Native pointer value.
     * @param ownsPtr - Whether this instance owns the pointer. Defaults to true.
     * @param parent - Optional parent owner to prevent premature garbage collection or freeing. Defaults to null.
     * @throws {Error} If the provided pointer is null or evaluation evaluates to 0n.
     */
  protected constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
    if (!ptr) {
      throw new Error("Pointer cannot be null");
    }

    this.ptr = ptr;
    this.ownsPtr = ownsPtr;
    this.parent = parent;
  }

  /**
     * Create a new owned native instance using the bound native creation function.
     *
     * @param args - Variable arguments passed directly to the underlying creation function.
     * @returns A new instance of the subclass containing the allocated pointer.
     * @throws {TypeError} If the subclass cannot be instantiated directly due to a missing `createFn`.
     * @throws {Error} If the native creation layer fails to allocate and returns a null pointer handle.
     */
  static create<T extends KernelOpaquePtr>(this: KernelOpaquePtrConstructor<T>, ...args: unknown[]): T {
    if (!this.createFn) {
      throw new TypeError(`${this.name} cannot be instantiated directly`);
    }

    const ptr = this.createFn(...args);

    if (ptr === 0n) {
      throw new Error(`Failed to create ${this.name}`);
    }

    return new this(ptr, true);
  }

  /**
     * Wrap an existing native pointer as an owned handle.
     *
     * @param ptr - The native pointer handle to wrap.
     * @returns A new instance of the subclass that assumes ownership of the pointer.
     */
  static fromHandle<T extends KernelOpaquePtr>(this: new (ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null) => T, ptr: bigint): T {
    return new this(ptr, true);
  }

  /**
     * Wrap an existing native pointer as a non-owning view.
     * * Useful when referencing memory managed or owned elsewhere in the system.
     *
     * @param ptr - The native pointer handle to wrap.
     * @param parent - Optional parent object that actually owns the underlying memory space.
     * @returns A new non-owning view instance of the subclass.
     */
  static fromView<T extends KernelOpaquePtr>(this: new (ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null) => T, ptr: bigint, parent: KernelOpaquePtr | null = null): T {
    return new this(ptr, false, parent);
  }

  /**
     * Free native resources if this instance owns the pointer.
     * * Clears internal pointer handles and references to prevent use-after-free scenarios.
     *
     * @throws {Error} If the instance owns a valid pointer but the subclass has not implemented `destroyFn`.
     */
  dispose(): void {
    if (!this.ptr || !this.ownsPtr) {
      return;
    }

    const ctor = this.constructor as typeof KernelOpaquePtr;

    if (!ctor.destroyFn) {
      throw new Error(`${this.constructor.name} owns a pointer but has no destroyFn`);
    }

    ctor.destroyFn(this.ptr);
    this.ptr = null;
    this.parent = null;
  }

  /**
     * Create a deep independent copy of this native object.
     *
     * @returns A new owned instance pointing to a duplicated native handle.
     * @throws {TypeError} If the subclass does not implement a native `copyFn`.
     * @throws {Error} If attempting to copy an object that has already been disposed.
     */
  copy(): this {
    const ctor = this.constructor as typeof KernelOpaquePtr;

    if (!ctor.copyFn) {
      throw new TypeError(`${this.constructor.name} cannot be copied`);
    }

    if (!this.ptr) {
      throw new Error("Object has been disposed");
    }

    const ptr = ctor.copyFn(this.ptr);
    return new (this.constructor as any)(ptr, true);
  }

  /**
     * Convert a borrowed view into an owned instance by copying its native data.
     * * If the instance already owns its pointer, this operation performs no action.
     * Otherwise, it allocates new native memory, copies the contents, and cuts ties with the parent view.
     *
     * @returns The instance itself, now modified to own its isolated pointer.
     * @throws {TypeError} If the subclass does not implement a native `copyFn`.
     * @throws {Error} If attempting to detach an object that has already been disposed.
     */
  detach(): this {
    if (this.ownsPtr) {
      return this;
    }

    const ctor = this.constructor as typeof KernelOpaquePtr;

    if (!ctor.copyFn) {
      throw new TypeError(`${this.constructor.name} cannot be detached`);
    }

    if (!this.ptr) {
      throw new Error("Object has been disposed");
    }

    const copiedPtr = ctor.copyFn(this.ptr);

    this.ptr = copiedPtr;
    this.ownsPtr = true;
    this.parent = null;

    return this;
  }

  /**
     * Check whether this object has been disposed.
     *
     * @returns True if the native resource has been freed, false otherwise.
     */
  isDisposed(): boolean {
    return this.ptr === null;
  }

  /**
     * Internal accessor for the native handle.
     *
     * @returns The active native pointer bigint value.
     * @throws {Error} If attempting to access the handle after the object has been disposed.
     */
  protected getHandle(): bigint {
    if (!this.ptr) {
      throw new Error("Object has been disposed");
    }

    return this.ptr;
  }

  /**
     * Support for explicit resource cleanup.
     * * Hooks directly into modern JavaScript runtime resource management (`using` blocks).
     */
  [Symbol.dispose](): void {
    this.dispose();
  }
}