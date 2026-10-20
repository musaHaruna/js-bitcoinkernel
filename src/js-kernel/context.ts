
import {
  btck_context_options_create,
  btck_context_options_destroy,
  btck_context_options_set_chainparams,
  btck_context_options_set_notifications,
  btck_context_options_set_validation_interface,
  btck_context_create,
  btck_context_destroy,
  btck_context_copy,
  btck_context_interrupt,
} from "./ffi/bindings.js";

import { registerCallbacks } from "./util/callbacks.js";
import { KernelOpaquePtr } from "./ffi/KernelOpaquePtr.js";
import { ChainParameters } from "./chain.js";
import { NotificationInterfaceCallbacks } from "./notifications.js";
import { ValidationInterfaceCallbacks } from "./validation.js";

/**
 * Configuration options used to create a Bitcoin Kernel context.
 *
 * Allows callers to configure chain parameters, notification
 * callbacks, and validation callbacks before creating a Context.
 *
 * The native options object can be destroyed after a Context
 * has been successfully created from it.
 *
 * Changes to the options after context creation do not affect
 * the existing Context.
 */
export class ContextOptions extends KernelOpaquePtr {
  protected static override createFn =
    btck_context_options_create as (...args: unknown[]) => bigint;

  protected static override destroyFn =
    btck_context_options_destroy as (ptr: bigint) => void;

  /** Retain JavaScript notification callbacks while this wrapper uses them. */
  private _notifications: NotificationInterfaceCallbacks | null = null;

  /** Retain JavaScript validation callbacks while this wrapper uses them. */
  private _validation_callbacks: ValidationInterfaceCallbacks | null = null;

  /**
   * Create a new ContextOptions wrapper.
   *
   * If no pointer is provided, a new native options object is allocated.
   * Otherwise, the wrapper references the supplied native pointer.
   *
   * @param ptr - Optional existing native options pointer.
   * @param ownsPtr - Whether this wrapper owns the native pointer. Defaults to true.
   * @param parent - Optional parent wrapper for borrowed native memory.
   * @throws {Error} If the native creation function is unavailable or returns a null pointer.
   */
  constructor(
    ptr?: bigint,
    ownsPtr = true,
    parent: KernelOpaquePtr | null = null
  ) {
    if (ptr === undefined) {
      if (!btck_context_options_create) {
        throw new Error("btck_context_options_create unavailable");
      }

      const newPtr = btck_context_options_create() as bigint;

      if (!newPtr) {
        throw new Error("Failed to create ContextOptions");
      }

      super(newPtr, true, null);
    } else {
      super(ptr, ownsPtr, parent);
    }
  }

  /**
   * Configure the Bitcoin network parameters for the context.
   *
   * The supplied ChainParameters determine the consensus rules
   * and network configuration used by the resulting Context.
   *
   * @param chainParameters - Network parameters, such as mainnet,
   * signet, or regtest.
   * @throws {Error} If the native setter is unavailable or a
   * required native object has been disposed.
   */
  set_chainparams(chainParameters: ChainParameters): void {
    if (!btck_context_options_set_chainparams) {
      throw new Error("btck_context_options_set_chainparams unavailable");
    }

    // Access the native handle of another KernelOpaquePtr subclass.
    const handle = (chainParameters as any).getHandle();

    btck_context_options_set_chainparams(this.getHandle(), handle);
  }

  /**
   * Register notification callbacks for the Context created
   * from these options.
   *
   * The callbacks are registered with Koffi as C-compatible
   * function pointers and passed to the Bitcoin Kernel C API.
   *
   * The native callback registrations must remain valid while
   * the kernel retains the corresponding callback interface.
   * Their cleanup is tied to the native interface's destruction.
   *
   * The JavaScript callback object is also retained to prevent
   * its functions from becoming unreachable while needed.
   *
   * @param notifications - Notification callbacks to register.
   * @throws {Error} If registration or native configuration fails.
   */
  set_notifications(notifications: NotificationInterfaceCallbacks): void {
    if (!btck_context_options_set_notifications) {
      throw new Error("btck_context_options_set_notifications unavailable");
    }

    const handle = this.getHandle();

    const registration = registerCallbacks(notifications.nativeStruct, {
      block_tip: "BlockTipCb *",
      header_tip: "HeaderTipCb *",
      progress: "ProgressCb *",
      warning_set: "WarningSetCb *",
      warning_unset: "WarningUnsetCb *",
      flush_error: "NotificationErrorCb *",
      fatal_error: "NotificationErrorCb *",
    });

    try {
      btck_context_options_set_notifications(handle, registration.native);
    } catch (error) {
      // Release registrations if the native setter fails.
      registration.release();
      throw error;
    }

    // Keep the JavaScript callback object reachable.
    this._notifications = notifications;
  }

  /**
   * Register validation callbacks for the Context created
   * from these options.
   *
   * These callbacks receive events related to block validation,
   * including block checks, connections, and disconnections.
   *
   * Koffi converts the JavaScript callbacks into native function
   * pointers. The native interface's lifetime determines when
   * those registrations can be released.
   *
   * The JavaScript callback object is retained while needed
   * by this wrapper.
   *
   * @param interfaceCallbacks - Validation callbacks to register.
   * @throws {Error} If registration or native configuration fails.
   */
  set_validation_interface(
    interfaceCallbacks: ValidationInterfaceCallbacks
  ): void {
    if (!btck_context_options_set_validation_interface) {
      throw new Error(
        "btck_context_options_set_validation_interface unavailable"
      );
    }

    const handle = this.getHandle();

    const registration = registerCallbacks(interfaceCallbacks, {
      block_checked: "BlockCheckedCb *",
      pow_valid_block: "BlockEntryCb *",
      block_connected: "BlockEntryCb *",
      block_disconnected: "BlockEntryCb *",
    });

    try {
      btck_context_options_set_validation_interface(
        handle,
        registration.native
      );
    } catch (error) {
      // Release registrations if the native setter fails.
      registration.release();
      throw error;
    }

    // Keep the JavaScript callback object reachable.
    this._validation_callbacks = interfaceCallbacks;
  }
}

/**
 * JavaScript wrapper for a native Bitcoin Kernel context.
 *
 * A Context holds shared kernel configuration and resources
 * used by Bitcoin Kernel operations.
 *
 * It provides access to the configured chain parameters,
 * notification callbacks, validation callbacks, and
 * interruption functionality.
 *
 * The native context uses reference-counted ownership,
 * allowing other native kernel objects to retain it as needed.
 *
 * Dispose of this wrapper when it is no longer required.
 */
export class Context extends KernelOpaquePtr {
  protected static override createFn =
    btck_context_create as (...args: unknown[]) => bigint;

  protected static override destroyFn =
    btck_context_destroy as (ptr: bigint) => void;

  protected static override copyFn =
    btck_context_copy as (ptr: bigint) => bigint;

  /** Retain JavaScript notification callbacks associated with this context. */
  private _notifications: NotificationInterfaceCallbacks | null = null;

  /** Retain JavaScript validation callbacks associated with this context. */
  private _validation_callbacks: ValidationInterfaceCallbacks | null = null;

  /**
   * Create a new Context or wrap an existing native context pointer.
   *
   * When ContextOptions is supplied, a new native context is
   * created using the configured network parameters and callbacks.
   *
   * When a bigint pointer is supplied, the constructor wraps
   * that existing native context without creating another one.
   *
   * JavaScript callback references are retained from the options
   * object when constructing a new context.
   *
   * @param optionsOrPtr - ContextOptions used for creation,
   * or an existing native context pointer.
   * @param ownsPtr - Whether this wrapper owns the native pointer.
   * Defaults to true.
   * @param parent - Optional parent wrapper for borrowed memory.
   * @throws {Error} If native context creation fails.
   */
  constructor(
    optionsOrPtr: ContextOptions | bigint,
    ownsPtr = true,
    parent: KernelOpaquePtr | null = null
  ) {
    if (optionsOrPtr instanceof ContextOptions) {
      if (!btck_context_create) {
        throw new Error("btck_context_create unavailable");
      }

      // Access the native handle of the ContextOptions instance.
      const optionsHandle = (optionsOrPtr as any).getHandle();

      const newPtr = btck_context_create(optionsHandle) as bigint;

      if (!newPtr) {
        throw new Error("Failed to create Context");
      }

      super(newPtr, true, null);

      // Retain JavaScript callback references from the options.
      this._notifications = (optionsOrPtr as any)._notifications;
      this._validation_callbacks =
        (optionsOrPtr as any)._validation_callbacks;
    } else {
      // Wrap an existing native context pointer.
      super(optionsOrPtr, ownsPtr, parent);
    }
  }

  /**
   * Create another owned handle to the native kernel context.
   *
   * The native copy operation shares the underlying context
   * through reference-counted ownership rather than creating
   * a completely independent kernel environment.
   *
   * JavaScript notification and validation callback references
   * are also retained by the returned wrapper.
   *
   * @returns Another Context wrapper sharing the native context.
   * @throws {Error} If the original context has been disposed
   * or native copying fails.
   */
  override copy(): this {
    const duplicate = super.copy();

    // Preserve JavaScript callback references in the copied wrapper.
    (duplicate as any)._notifications = this._notifications;
    (duplicate as any)._validation_callbacks =
      this._validation_callbacks;

    return duplicate;
  }

  /**
   * Request interruption of long-running Bitcoin Kernel operations.
   *
   * Can be used to signal operations such as reindexing,
   * block importing, or block processing to stop.
   *
   * This does not guarantee that active operations stop
   * immediately or that their work is rolled back.
   *
   * @returns 0 if the interruption request succeeded,
   * or a nonzero value otherwise.
   * @throws {Error} If the native function is unavailable
   * or this context has been disposed.
   */
  interrupt(): number {
    if (!btck_context_interrupt) {
      throw new Error("btck_context_interrupt unavailable");
    }

    return btck_context_interrupt(this.getHandle()) as number;
  }

  /**
   * Return a readable representation of the native context pointer.
   *
   * The pointer address is formatted as a hexadecimal string.
   *
   * @returns A string such as "<Context at 0x1234>".
   * @throws {Error} If the context has been disposed.
   */
  override toString(): string {
    return `<Context at 0x${this.getHandle().toString(16)}>`;
  }
}
