/**
 * Constructor type for classes extending KernelOpaquePtr.
 * Provides optional native creation function binding.
 */
export type KernelOpaquePtrConstructor<T extends KernelOpaquePtr> = { 
    new (ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null): T;
    
    createFn?: (...args: unknown[]) => bigint;
};

/**
 * Base class for opaque native pointer wrappers for managing opaque pointers returned from a native Bitcoin kernel (C) layer.
 *
 * This class manages ownership of a native pointer (`bigint`) and provides
 * lifecycle utilities such as creation, copying, detaching, and disposal.
 *
 * Subclasses are expected to bind native functions:
 * - createFn: allocate native resource
 * - destroyFn: free native resource
 * - copyFn: duplicate native resource
 */
export abstract class KernelOpaquePtr {
    /** Native pointer handle */
    protected ptr: bigint | null;
    
    /** Whether this instance owns the pointer and is responsible for freeing it */
    protected ownsPtr: boolean;
    
    /** Optional parent object to keep ownership chain alive */
    protected parent: KernelOpaquePtr | null;
    
    protected static createFn?: (...args: any[]) => bigint;
    protected static destroyFn?: (ptr: bigint) => void;
    protected static copyFn?: (ptr: bigint) => bigint;

    /**
     * @param ptr Native pointer value
     * @param ownsPtr Whether this instance owns the pointer
     * @param parent Optional parent owner to prevent premature GC/freeing
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
     * Create a new owned native instance using the bound create function.
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
     */
    static fromHandle<T extends KernelOpaquePtr>(this: new (ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null) => T, ptr: bigint): T {
        return new this(ptr, true);
    }

    /**
     * Wrap an existing native pointer as a non-owning view.
     * Useful when referencing memory owned elsewhere.
     */
    static fromView<T extends KernelOpaquePtr>(this: new (ptr: bigint, ownsPtr?: boolean, parent?: KernelOpaquePtr | null) => T, ptr: bigint, parent?: KernelOpaquePtr): T {
        return new this(ptr, false, parent ?? null);
    }

    /**
     * Free native resources if this instance owns the pointer.
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
     * Convert a borrowed view into an owned instance by copying native data.
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
     */
    isDisposed(): boolean {
        return this.ptr === null;
    }

    /**
     * Internal accessor for the native handle.
     */
    protected getHandle(): bigint {
        if (!this.ptr) {
            throw new Error("Object has been disposed");
        }

        return this.ptr;
    }

    /**
     * Support for explicit resource cleanup.
     */
    [Symbol.dispose](): void {
        this.dispose();
    }
}