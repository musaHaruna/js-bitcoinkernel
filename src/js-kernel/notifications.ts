/** Synchronization state, distinct from the selected Bitcoin network. */
export enum SynchronizationState { INIT_REINDEX = 0, INIT_DOWNLOAD = 1, POST_INIT = 2 }
import { initializeCallbacks, decodeText } from './util/callbacks.js';

/**
 * Optional handlers for kernel notifications.
 *
 * Handlers receive decoded text and no native user_data argument.
 * Message lengths remain native UTF-8 byte counts, not character counts.
 * SynchronizationState describes sync progress, not the chosen network.
 */
export interface NotificationCallbackOptions {
  /**
     * Triggered when the best block chain tip changes.
     *
     * @param state - The current synchronization stage.
     * @param index - The block index identifier or pointer.
     * @param verificationProgress - Synchronization progress normalized as a float between 0.0 and 1.0.
     */
  block_tip?: (state: SynchronizationState, index: unknown, verificationProgress: number) => void;

  /**
     * Triggered when a block header synchronization milestone is reached.
     *
     * @param state - The current synchronization stage.
     * @param height - The block height of the current header tip.
     * @param timestamp - The block header timestamp in Unix seconds.
     * @param presync - A numeric flag or progress state representing pre-synchronization status.
     */
  header_tip?: (state: SynchronizationState, height: number | bigint, timestamp: number | bigint, presync: number) => void;

  /**
     * Triggered during long-running operations to communicate structural progress.
     *
     * @param title - The label or description of the current task (e.g., "Initial Block Download").
     * @param titleLen - The UTF-8 byte length of the title.
     * @param progressPercent - Percentage completion represented as an integer or float.
     * @param resumePossible - A flag indicating whether the operational state can be safely resumed if interrupted.
     */
  progress?: (title: string, titleLen: bigint | number, progressPercent: number, resumePossible: number) => void;

  /**
     * Triggered when the kernel encounters a non-fatal warning condition.
     *
     * @param warning - The internal status or error code associated with the warning.
     * @param message - Descriptive text providing details about the warning event.
     * @param messageLen - The byte length of the message payload.
     */
  warning_set?: (warning: number, message: string, messageLen: bigint | number) => void;

  /**
     * Triggered when a previously raised kernel warning has been resolved or cleared.
     *
     * @param warning - The warning status or error code being cleared.
     */
  warning_unset?: (warning: number) => void;

  /**
     * Triggered when data fails to flush correctly to disk or persistent storage.
     *
     * @param message - Error details regarding the flush degradation.
     * @param messageLen - The byte length of the error message string.
     */
  flush_error?: (message: string, messageLen: bigint | number) => void;

  /**
     * Triggered when the kernel encounters an unrecoverable panic or fatal system breakdown.
     *
     * @param message - The panic message detailing the fatal system failure.
     * @param messageLen - The byte length of the fatal message string.
     */
  fatal_error?: (message: string, messageLen: bigint | number) => void;
}

/**
 * Supported notification names used to reject unknown callback fields.
 */
const NOTIFICATION_FIELDS = new Set([
  "block_tip",
  "header_tip",
  "progress",
  "warning_set",
  "warning_unset",
  "flush_error",
  "fatal_error"
]);

/**
 * Prepare notification handlers for registration by ContextOptions.
 *
 * Native text pointers are decoded using their explicit byte lengths.
 * The user_data argument is removed before invoking user handlers.
 * Omitted callbacks are null fields. This class prepares the functions;
 * ContextOptions registers their persistent native callback pointers.
 */
export class NotificationInterfaceCallbacks {
  /**
   * Keep prepared JavaScript callback wrappers reachable.
   */
  private _gcAnchors: Record<string, (...args: any[]) => any>;

  /**
   * Prepared callback fields consumed by ContextOptions during registration.
   */
  public nativeStruct: Record<string, any>;

  /**
     * Create a notification interface instance.
     *
     * @param callbacks - Callback functions for notification events, keyed by callback name.
     * @throws {Error} If an unrecognized callback property key is supplied.
     */
  constructor(callbacks: NotificationCallbackOptions) {
    // Delegate structural checking, user_data stripping, and memory anchoring to the utility
    const { payload, gcAnchors } = initializeCallbacks(NOTIFICATION_FIELDS, callbacks);

    // C strings are length-delimited and need not be NUL-terminated.
    for (const name of ['progress', 'flush_error', 'fatal_error']) {
      const fn = payload[name];
      if (fn) payload[name] = (ud: unknown, ptr: unknown, len: number | bigint, ...rest: unknown[]) => fn(ud, decodeText(ptr, len), len, ...rest);
    }
    const warning = payload.warning_set;
    if (warning) payload.warning_set = (ud: unknown, code: number, ptr: unknown, len: number | bigint) => warning(ud, code, decodeText(ptr, len), len);
    this.nativeStruct = payload;
    this._gcAnchors = gcAnchors;
  }
}

/**
 * Optional handlers that print kernel notifications to the console.
 */
export const defaultNotificationCallbacks = new NotificationInterfaceCallbacks({
  block_tip: (state, index, verificationProgress) => {
    console.log(`block_tip: state: ${state}, index: ${index}, verification_progress: ${verificationProgress}`);
  },
  header_tip: (state, height, timestamp, presync) => {
    console.log(`header_tip: state: ${state}, height: ${height}, timestamp: ${timestamp}, presync: ${presync}`);
  },
  progress: (title, titleLen, progressPercent, resumePossible) => {
    console.log(`progress: title: ${title}, progress_percent: ${progressPercent}, resume_possible: ${resumePossible}`);
  },
  warning_set: (warning, message, messageLen) => {
    console.log(`warning_set: warning: ${warning}, message: ${message}`);
  },
  warning_unset: (warning) => {
    console.log(`warning_unset: warning: ${warning}`);
  },
  flush_error: (message, messageLen) => {
    console.log(`flush_error: message: ${message}`);
  },
  fatal_error: (message, messageLen) => {
    console.log(`fatal_error: message: ${message}`);
  }
});