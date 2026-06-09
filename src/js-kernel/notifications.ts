import { ChainType } from './chain.js';
import { initializeCallbacks } from './util/callbacks.js';

/**
 * Strongly-typed definitions for domain-level notification callbacks.
 * * These signatures match the clean, user-facing interface where the native
 * C-layer `user_data` context pointer has been stripped away by the utility layer.
 */
export interface NotificationCallbackOptions {
  /**
     * Triggered when the best block chain tip changes.
     *
     * @param state - The underlying chain state or identifier.
     * @param index - The block index identifier or pointer.
     * @param verificationProgress - Synchronization progress normalized as a float between 0.0 and 1.0.
     */
  block_tip?: (state: ChainType, index: unknown, verificationProgress: number) => void;

  /**
     * Triggered when a block header synchronization milestone is reached.
     *
     * @param state - The underlying chain state or identifier.
     * @param height - The block height of the current header tip.
     * @param timestamp - The block header timestamp (UNIX epoch).
     * @param presync - A numeric flag or progress state representing pre-synchronization status.
     */
  header_tip?: (state: ChainType, height: bigint, timestamp: bigint, presync: number) => void;

  /**
     * Triggered during long-running operations to communicate structural progress.
     *
     * @param title - The label or description of the current task (e.g., "Initial Block Download").
     * @param titleLen - The byte or character length of the title string.
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
 * The precise collection of permitted notification field keys matching the expected native layout.
 * Used to enforce strict structural boundaries during callback orchestration.
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
 * Wrapper for receiving kernel notification events.
 *
 * This class orchestrates incoming user-defined event hooks, processes them through
 * the wrapper utility to discard native context pointers, and formats them into a
 * plain layout compatible with FFI mapping layers (such as Koffi).
 * * All hooks are optional; omitted notifications are cleanly ignored by the kernel.
 */
export class NotificationInterfaceCallbacks {
  /**
     * Internal registry keeping functional closures alive.
     * This prevents the V8 garbage collection mechanism from sweeping away active event loops
     * while they are cross-referenced across the native execution boundary.
     */
  private _gcAnchors: Record<string, (...args: any[]) => any>;

  /**
     * The plain native structure object populated with safe callback handlers.
     * Configured for direct ingestion by your Koffi binding layer.
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

    this.nativeStruct = payload;
    this._gcAnchors = gcAnchors;
  }
}

/**
 * Type-Safe Default Diagnostics Instance.
 * * Provides an out-of-the-box diagnostic suite that pipes active event notifications
 * directly to standard system logs (`console.log`), replicating default runtime behaviors.
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