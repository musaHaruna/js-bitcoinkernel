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
 * Base class for wrappers around native Bitcoin Kernel pointers.
 *
 * An owned wrapper must release its native handle. A borrowed wrapper
 * must not free the memory it references. When a parent is supplied,
 * access is rejected after that parent is disposed or changes its pointer.
 *
 * Subclasses provide createFn, destroyFn, and copyFn where supported.
 * Native copy semantics depend on the type: some copies share resources.
 * Call dispose(), or use a using declaration, to release owned handles.
 */
export abstract class KernelOpaquePtr {
  /** Native pointer handle. Nullified once disposed. */
  protected ptr: bigint | null;

  /** Whether this instance owns the pointer and is responsible for freeing it. */
  protected ownsPtr: boolean;

  /** Optional parent object to keep the parent ownership chain alive in memory. */
  protected parent: KernelOpaquePtr | null;
  /** Parent pointer captured at creation, used to detect replaced native storage. */
  private parentHandle: bigint | null;

  protected static createFn?: (...args: any[]) => bigint;
  protected static destroyFn?: (ptr: bigint) => void;
  protected static copyFn?: (ptr: bigint) => bigint;

  /**
   * Wrap a native pointer and record its ownership.
   *
   * Keeping a parent reference does not prevent explicit parent disposal.
   * The saved parent handle lets borrowed views detect that invalidation.
   *
   * @param ptr - Non-null native pointer.
   * @param ownsPtr - Whether this wrapper must destroy the handle.
   * @param parent - Optional owner of borrowed memory.
   * @throws {Error} If the pointer is null or the supplied parent is invalid.
   */
  protected constructor(ptr: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
    if (!ptr) {
      throw new Error("Pointer cannot be null");
    }

    this.ptr = ptr;
    this.ownsPtr = ownsPtr;
    this.parent = parent;
    this.parentHandle = parent ? parent.getHandle() : null;
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

    if (!ptr) {
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
   * Wrap a native pointer without taking ownership of its memory.
   *
   * Supply the owner as parent so later access can check its lifetime.
   * Without a parent, the caller must ensure the native memory stays valid.
   *
   * @param ptr - Native pointer to borrow.
   * @param parent - Optional owner used for lifetime checks.
   * @returns A borrowed wrapper that does not destroy the native object.
   */
  static fromView<T extends KernelOpaquePtr>(this: new (ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null) => T, ptr: bigint, parent: KernelOpaquePtr | null = null): T {
    return new this(ptr, false, parent);
  }

  /**
   * Invalidate this wrapper and release its handle if it is owned.
   *
   * Calling dispose() again does nothing. Borrowed wrappers are invalidated
   * without freeing their owner's memory. The pointer is cleared before
   * native destruction so the wrapper cannot be reused during cleanup.
   *
   * @throws {Error} If an owned handle has no destroyFn.
   */
  dispose(): void {
    if (!this.ptr) {
      return;
    }

    const ctor = this.constructor as typeof KernelOpaquePtr;

    if (this.ownsPtr && !ctor.destroyFn) {
      throw new Error(`${this.constructor.name} owns a pointer but has no destroyFn`);
    }

    const ptr = this.ptr;
    this.ptr = null;
    this.parent = null;
    if (this.ownsPtr) ctor.destroyFn!(ptr);
  }

  /**
   * Create an owned wrapper using the native copy operation.
   *
   * The returned handle has its own disposal responsibility. Whether its
   * underlying resources are duplicated or shared depends on the native type.
   * Borrowed views must still have a valid parent when copied.
   *
   * @returns Another owned wrapper.
   * @throws {TypeError} If the native type cannot be copied.
   * @throws {Error} If this wrapper is invalid or native copying fails.
   */
  copy(): this {
    const ctor = this.constructor as typeof KernelOpaquePtr;

    if (!ctor.copyFn) {
      throw new TypeError(`${this.constructor.name} cannot be copied`);
    }

    if (!this.ptr) {
      throw new Error("Object has been disposed");
    }

    const ptr = ctor.copyFn(this.getHandle());
    return new (this.constructor as any)(ptr, true);
  }

  /**
   * Replace a borrowed handle with an owned native copy in this wrapper.
   *
   * A valid owned wrapper is returned unchanged. Detaching a borrowed
   * wrapper removes its parent dependency and invalidates existing child
   * views into its previous storage. The caller must dispose the new handle.
   *
   * @returns This wrapper, now owning its handle.
   * @throws {TypeError} If the borrowed native type cannot be copied.
   * @throws {Error} If this wrapper is invalid or native copying fails.
   */
  detach(): this {
    this.getHandle();
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

    const copiedPtr = ctor.copyFn(this.getHandle());
    if (!copiedPtr) throw new Error(`Failed to copy ${this.constructor.name}`);

    this.ptr = copiedPtr;
    this.ownsPtr = true;
    this.parent = null;

    return this;
  }

  /**
   * Check whether this wrapper can still be used.
   *
   * Borrowed views are invalid when their parent is invalid or has replaced
   * its original pointer. This does not necessarily mean memory was freed.
   *
   * @returns True if this wrapper or its recorded ownership chain is invalid.
   */
  isDisposed(): boolean {
    return this.ptr === null || (!this.ownsPtr && this.parent !== null
      && (this.parent.isDisposed() || this.parent.ptr !== this.parentHandle));
  }

  /**
   * Return the native pointer after checking this wrapper's lifetime.
   *
   * @returns The valid native pointer.
   * @throws {Error} If this wrapper or its parent has become invalid.
   */
  protected getHandle(): bigint {
    if (this.isDisposed() || !this.ptr) {
      throw new Error("Object or its parent has been disposed");
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