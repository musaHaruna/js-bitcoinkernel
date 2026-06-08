import {
    btck_context_options_create,
    btck_context_options_destroy,
    btck_context_options_set_chainparams,
    btck_context_options_set_notifications,
    btck_context_options_set_validation_interface,

    btck_context_create,
    btck_context_destroy,
    btck_context_copy,
    btck_context_interrupt
} from "./ffi/bindings.js";

import { KernelOpaquePtr } from "./ffi/KernelOpaquePtr.js";
import { ChainParameters } from "./chain.js";
import { NotificationInterfaceCallbacks } from "./notifications.js";
import { ValidationInterfaceCallbacks } from "./validation.js";

/**
 * Configuration builder for assembling a new unmanaged kernel execution context.
 *
 * This class functions as an isolated setup environment for specifying network configurations, 
 * asynchronous notification architectures, and system block validation listeners.
 * * > ### ⚠️ Memory Rules
 * > Once a root {@link Context} is successfully spawned from this options configuration structure, 
 * > this builder instance can be safely disposed of. Post-birth modifications to an options instance 
 * > are isolated and **will not propagate** changes back down to an active runtime Context engine.
 */
export class ContextOptions extends KernelOpaquePtr {
    protected static override createFn = btck_context_options_create as (...args: unknown[]) => bigint;
    protected static override destroyFn = btck_context_options_destroy as (ptr: bigint) => void;

    /** JS-side safety mirror to shield unmanaged system notifications from V8 Garbage Collection. */
    private _notifications: NotificationInterfaceCallbacks | null = null;
    /** JS-side safety mirror to shield unmanaged validation callbacks from V8 Garbage Collection. */
    private _validation_callbacks: ValidationInterfaceCallbacks | null = null;

    /**
     * Instantiate a new context options builder.
     *
     * @param ptr - Optional handle pointing to an existing native choices struct. If omitted, 
     * the constructor dynamically allocates a fresh configuration context directly on the kernel heap.
     * @param ownsPtr - Whether this JavaScript class wrapper actively governs the unmanaged memory lifecycle. Defaults to true.
     * @param parent - Structural parent object pinning this configuration's visibility window. Defaults to null.
     * @throws {Error} If `btck_context_options_create` function bindings are missing, or if native allocator logic fails.
     */
    constructor(ptr?: bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
        if (ptr === undefined) {
            if (!btck_context_options_create) {
                throw new Error("btck_context_options_create unavailable");
            }
            const newPtr = btck_context_options_create() as bigint;
            if (newPtr === 0n) {
                throw new Error("Failed to create ContextOptions");
            }
            super(newPtr, true, null);
        } else {
            super(ptr, ownsPtr, parent);
        }
    }

    /**
     * Assign the network parameters configuration layout targeting the kernel instance options.
     *
     * Sets whether the resulting runtime container will spin up matching Mainnet, Testnet, or Regtest rules.
     *
     * @param chainParameters - Domain-level model wrapping targeted consensus parameter criteria guidelines.
     * @throws {Error} If `btck_context_options_set_chainparams` function bindings are missing.
     */
    set_chainparams(chainParameters: ChainParameters): void {
        if (!btck_context_options_set_chainparams) {
            throw new Error("btck_context_options_set_chainparams unavailable");
        }
        // Bypass strict sibling protection check via type casting
        const handle = (chainParameters as any).getHandle();
        btck_context_options_set_chainparams(this.getHandle(), handle);
    }

    /**
     * Attach an unmanaged global notification event routing listener pool.
     *
     * @param notifications - An instantiation configuration structural bundle containing event dispatch triggers.
     * @throws {Error} If `btck_context_options_set_notifications` function bindings are missing.
     */
    set_notifications(notifications: NotificationInterfaceCallbacks): void {
        if (!btck_context_options_set_notifications) {
            throw new Error("btck_context_options_set_notifications unavailable");
        }
        btck_context_options_set_notifications(this.getHandle(), notifications);
        // Anchor the JS object reference to prevent V8 from sweeping the callback memory under the FFI layer
        this._notifications = notifications;
    }

    /**
     * Attach an unmanaged validation pipeline event listener state pool.
     *
     * @param interfaceCallbacks - An interface mapping validation tracking metrics.
     * @throws {Error} If `btck_context_options_set_validation_interface` function bindings are missing.
     */
    set_validation_interface(interfaceCallbacks: ValidationInterfaceCallbacks): void {
        if (!btck_context_options_set_validation_interface) {
            throw new Error("btck_context_options_set_validation_interface unavailable");
        }
        btck_context_options_set_validation_interface(this.getHandle(), interfaceCallbacks);
        // Anchor the JS object reference to prevent V8 from sweeping the callback memory under the FFI layer
        this._validation_callbacks = interfaceCallbacks;
    }
}

/**
 * Core runtime context engine boundary tracking unmanaged execution sandboxes.
 *
 * This object forms the root coordination silo of your unmanaged processing environment. 
 * It anchors running processes, locks long-lived subsystem tasks, maintains transaction indices, 
 * and controls asynchronous execution lifecycles safely across foreign memory splits.
 */
export class Context extends KernelOpaquePtr {
    protected static override createFn = btck_context_create as (...args: unknown[]) => bigint;
    protected static override destroyFn = btck_context_destroy as (ptr: bigint) => void;
    protected static override copyFn = btck_context_copy as (ptr: bigint) => bigint;

    /** Retained notification memory anchor proxy carried over from options initialization. */
    private _notifications: NotificationInterfaceCallbacks | null = null;
    /** Retained validation callback memory anchor proxy carried over from options initialization. */
    private _validation_callbacks: ValidationInterfaceCallbacks | null = null;

    /**
     * Instantiate a new execution engine runtime context instance.
     *
     * @param optionsOrPtr - A configured {@link ContextOptions} builder context instance, 
     * or a raw `bigint` address pointer mapping directly to an pre-allocated unmanaged state structure.
     * @param ownsPtr - Whether this instance actively governs the unmanaged memory lifecycle. Defaults to true.
     * @param parent - Structural parent object pinning this container visibility. Defaults to null.
     * @throws {Error} If `btck_context_create` function bindings are missing, or if unmanaged initializers fail.
     */
    constructor(optionsOrPtr: ContextOptions | bigint, ownsPtr = true, parent: KernelOpaquePtr | null = null) {
        if (optionsOrPtr instanceof ContextOptions) {
            if (!btck_context_create) {
                throw new Error("btck_context_create unavailable");
            }

            // Bypass strict sibling protection check via type casting
            const optionsHandle = (optionsOrPtr as any).getHandle();
            const newPtr = btck_context_create(optionsHandle) as bigint;

            if (newPtr === 0n) {
                throw new Error("Failed to create Context");
            }

            super(newPtr, true, null);
            
            // Transfer JS-side GC protection references from the options configuration into this context lifecycle
            this._notifications = (optionsOrPtr as any)._notifications;
            this._validation_callbacks = (optionsOrPtr as any)._validation_callbacks;
        } else {
            super(optionsOrPtr, ownsPtr, parent);
        }
    }

    /**
     * Create a copy of this Context instance.
     *
     * Safely clones the underlying native engine context pointer via the native duplicator 
     * while guaranteeing that JS-side callback protection blocks remain pinned to the new copy.
     *
     * @returns A new instance pointing to a duplicated native kernel execution context handle.
     */
    override copy(): this {
        const duplicate = super.copy();
        (duplicate as any)._notifications = this._notifications;
        (duplicate as any)._validation_callbacks = this._validation_callbacks;
        return duplicate;
    }

    /**
     * Broadcast an early termination/interruption flag signal directly into the unmanaged kernel space.
     *
     * This command safely forces active context tasks (such as extensive Merkle validations 
     * or historical block index evaluations) to instantly park, drop processing pipelines, 
     * and roll back to safe execution milestones.
     *
     * @returns An execution completion code response integer dispatched back out from the native kernel layer.
     * @throws {Error} If `btck_context_interrupt` function bindings are missing.
     */
    interrupt(): number {
        if (!btck_context_interrupt) {
            throw new Error("btck_context_interrupt unavailable");
        }
        return btck_context_interrupt(this.getHandle()) as number;
    }

    /**
     * Return a clean string representation of the running context module.
     *
     * @returns A diagnostic string capturing the base-16 hexadecimal memory handle position.
     */
    override toString(): string {
        return `<Context at 0x${this.getHandle().toString(16)}>`;
    }
}