import koffi from "koffi";
import { decodeText } from "./util/callbacks.js";
import {
  btck_logging_set_options,
  btck_logging_set_level_category,
  btck_logging_enable_category,
  btck_logging_disable_category,
  btck_logging_connection_create,
  btck_logging_connection_destroy
} from "./ffi/bindings.js";
import { basename } from "path";
import { KernelOpaquePtr } from "./ffi/KernelOpaquePtr.js";

/**
 * Subsystem logging categories for segregating internal kernel messages.
 */
export enum LogCategory {
  /** Catch-all category representing all diagnostic systems. */
  ALL = 0,
  /** Performance benchmarking and optimization tracking diagnostics. */
  BENCH = 1,
  /** Low-level block serialization and disk storage persistence engines. */
  BLOCKSTORAGE = 2,
  /** UTXO set coin database tracking states. */
  COINDB = 3,
  /** Backing LevelDB instances and operational write/merge tasks. */
  LEVELDB = 4,
  /** Transaction memory pool entry, eviction, and validation states. */
  MEMPOOL = 5,
  /** Blockchain storage pruning and target disk window computations. */
  PRUNE = 6,
  /** Secure random number generation seeds and entropy status loops. */
  RAND = 7,
  /** Chain state reindexing and block validation catch-up updates. */
  REINDEX = 8,
  /** Consensus rule evaluation and script execution verification workflows. */
  VALIDATION = 9,
  /** Core kernel startup, initialization, and top-level lifecycle states. */
  KERNEL = 10
}

/**
 * Log severity validation levels accepted by the native kernel engine.
 */
export enum LogLevel {
  /** High-verbosity diagnostic messages useful for debugging. */
  DEBUG = 1,
  /** Standard informational status updates regarding normal operations. */
  INFO = 2
}

/**
 * Map connecting core kernel log severities to standard JavaScript `console` method routing names.
 */
export const KERNEL_LEVEL_TO_CONSOLE: Record<LogLevel, string> = {
  [LogLevel.INFO]: "info",
  [LogLevel.DEBUG]: "debug"
};

/**
 * Bridge a standard Python/numeric severity index down to a valid native kernel level.
 *
 * @param level - The input severity configuration string or numeric evaluation bound.
 * @returns A matching normalized `LogLevel` configuration constant.
 */
export function btck_level_from_python(level: number | string): LogLevel {
  const numLevel = typeof level === "string" ? parseLogLevelString(level) : level;
  if (numLevel > 10) {
    return LogLevel.INFO;
  }
  return LogLevel.DEBUG;
}

/**
 * Parse standard string severity identifiers into equivalent numeric priority tokens.
 *
 * @param levelStr - Raw textual layout name (e.g., "DEBUG", "INFO", "WARN").
 * @returns The matched numeric weight.
 */
function parseLogLevelString(levelStr: string): number {
  switch (levelStr.toUpperCase()) {
    case "DEBUG": return 10;
    case "INFO": return 20;
    case "WARN":
    case "WARNING": return 30;
    case "ERROR": return 40;
    default: return 20;
  }
}

/**
 * Configuration formatting specifications for compiled native log lines.
 */
export class LoggingOptions {
  /** Prepend ISO or human-readable timing markers to log text entries. */
  public log_timestamps: boolean;
  /** Output microsecond-precision offsets inside timing string fragments. */
  public log_time_micros: boolean;
  /** Include the processing execution thread identity string. */
  public log_threadnames: boolean;
  /** Include raw source code code filename and source line markers. */
  public log_sourcelocations: boolean;
  /** Always display explicit category context levels beside payloads. */
  public always_print_category_levels: boolean;

  /**
     * Create a new configuration bundle for log line formatting.
     */
  constructor(
    log_timestamps = true,
    log_time_micros = false,
    log_threadnames = false,
    log_sourcelocations = false,
    always_print_category_levels = false
  ) {
    this.log_timestamps = log_timestamps;
    this.log_time_micros = log_time_micros;
    this.log_threadnames = log_threadnames;
    this.log_sourcelocations = log_sourcelocations;
    this.always_print_category_levels = always_print_category_levels;
  }

  /**
   * Convert logging options to the native struct fields.
   *
   * Boolean options are represented as numeric 0 or 1 for the C API.
   *
   * @returns The native logging configuration payload.
   */
  public toNativeStruct() {
    return {
      log_timestamps: Number(this.log_timestamps),
      log_time_micros: Number(this.log_time_micros),
      log_threadnames: Number(this.log_threadnames),
      log_sourcelocations: Number(this.log_sourcelocations),
      always_print_category_levels: Number(this.always_print_category_levels)
    };
  }
}

/**
 * Check whether the supplied value is a function.
 *
 * Default and rest parameters can make function.length zero even when
 * the handler accepts a message, so declared arity is not checked.
 *
 * @param fn - Candidate logging handler.
 * @returns True if the value is callable as a JavaScript function.
 */
export function is_valid_log_callback(fn: unknown): boolean {
  if (typeof fn !== "function") {
    return false;
  }
  return true;
}

/**
 * Apply formatting parameters to the internal global logger instance.
 *
 * @param options - The chosen configuration properties to mount on the native module.
 * @throws {Error} If `btck_logging_set_options` function bindings are missing.
 */
export function logging_set_options(options: LoggingOptions): void {
  if (!btck_logging_set_options) {
    throw new Error("btck_logging_set_options unavailable");
  }
  btck_logging_set_options(options.toNativeStruct());
}

function validateCategory(category: LogCategory): void {
  if (!Number.isInteger(category) || category < LogCategory.ALL || category > LogCategory.KERNEL) {
    throw new RangeError("Invalid log category");
  }
}

/**
 * Set the minimum active message severity threshold for a target logging category.
 *
 * Sets standard limits filtering out verbose statements below chosen thresholds.
 * This command alters severity bounds for active connections universally.
 * * @note This method adjusts thresholds but does not toggle the execution pipeline state.
 * Use `enable_log_category()` to actively route output fields.
 *
 * @param category - The structural subsystem log section targeted for modification.
 * @param level - The chosen severity threshold to implement.
 * @throws {Error} If `btck_logging_set_level_category` function bindings are missing.
 */

export function set_log_level_category(category: LogCategory, level: LogLevel): void {
  validateCategory(category);
  if (level !== LogLevel.DEBUG && level !== LogLevel.INFO) throw new RangeError("Invalid log level");
  if (!btck_logging_set_level_category) {
    throw new Error("btck_logging_set_level_category unavailable");
  }
  btck_logging_set_level_category(category, level);
}

/**
 * Open a logging category pipeline to actively capture diagnostics.
 *
 * Stream events matching this subsystem target out across established `LoggingConnection` callbacks.
 * Passing `LogCategory.ALL` globally unlocks all individual functional subcategories.
 *
 * @param category - The structural subsystem logging target to open.
 * @throws {Error} If `btck_logging_enable_category` function bindings are missing.
 */
export function enable_log_category(category: LogCategory): void {
  validateCategory(category);
  if (!btck_logging_enable_category) {
    throw new Error("btck_logging_enable_category unavailable");
  }
  btck_logging_enable_category(category);
}

/**
 * Shut down a active logging category pipeline to silence its diagnostics.
 *
 * Stops routing messages emitted by this category to `LoggingConnection` callbacks.
 * Passing `LogCategory.ALL` silences all logging streams globally.
 *
 * @param category - The structural subsystem logging target to silence.
 * @throws {Error} If `btck_logging_disable_category` function bindings are missing.
 */
export function disable_log_category(category: LogCategory): void {
  validateCategory(category);
  if (!btck_logging_disable_category) {
    throw new Error("btck_logging_disable_category unavailable");
  }
  btck_logging_disable_category(category);
}

/**
 * Receive native kernel log messages through a JavaScript handler.
 *
 * A persistent Koffi callback stays registered until the connection is
 * closed. Dispose this wrapper, or use a using declaration, when finished.
 * Native logging settings apply across the process.
 */
export class LoggingConnection extends KernelOpaquePtr {
  protected static override createFn = btck_logging_connection_create as (...args: unknown[]) => bigint;
  protected static override destroyFn = btck_logging_connection_destroy as (ptr: bigint) => void;

  /**
   * Registered Koffi callback handle, released after the native connection closes.
   */
  private _nativeCallback: bigint | null;

  /**
   * Create a native logging connection with a persistent callback.
   *
   * Messages are decoded as UTF-8 using their native byte lengths.
   * If connection creation fails, the callback registration is released.
   *
   * @param cb - Handler receiving a decoded JavaScript string.
   * @throws {TypeError} If cb is not a function.
   * @throws {Error} If registration or native connection creation fails.
   */
  constructor(cb: (message: string) => void) {
    if (!is_valid_log_callback(cb)) {
      throw new TypeError(
        "Log callback must be a function."
      );
    }

    if (!btck_logging_connection_create) {
      throw new Error("btck_logging_connection_create unavailable");
    }

    // Register the callback before creating the connection that will use it.
    const nativeCb = koffi.register(LoggingConnection._wrap_log_fn(cb), "btck_LogCallback *");

    // Release the registration if native connection creation fails.
    let newPtr: bigint;
    try {
      newPtr = btck_logging_connection_create(nativeCb, null, null) as bigint;
    } catch (error) {
      koffi.unregister(nativeCb);
      throw error;
    }

    if (!newPtr) {
      koffi.unregister(nativeCb);
      throw new Error("Failed to create LoggingConnection");
    }

    // Take ownership of the native connection.
    super(newPtr, true, null);

    // Save the registration handle for disposal.
    this._nativeCallback = nativeCb;
  }

  /**
   * Close the native connection before unregistering its callback.
   *
   * Repeated disposal does nothing. The callback handle is cleared
   * after cleanup so it cannot be unregistered twice.
   */
  override dispose(): void {
    if (this.isDisposed()) return;
    try {
      super.dispose();
    } finally {
      if (this._nativeCallback) koffi.unregister(this._nativeCallback);
      this._nativeCallback = null;
    }
  }

  /**
   * Adapt the native log callback to a string handler.
   *
   * The native signature supplies user_data, a message pointer, and a byte
   * length. Ignore user_data and read exactly that span, including NUL bytes.
   *
   * @param fn - Handler receiving decoded text.
   * @returns A wrapper with the native callback argument order.
   */
  private static _wrap_log_fn(fn: (message: string) => void): Function {
    return (userData: unknown, messagePtr: unknown, messageLen: number | bigint): void => {
      fn(decodeText(messagePtr, messageLen));
    };
  }
}

/**
 * Configure native logging and forward messages to a console logger.
 *
 * The connection is available as conn; dispose it when logging is no
 * longer needed. Category and formatting settings are process-wide.
 */
export class KernelLogViewer {
  /** * The root contextual namespace descriptor tag prefixing console statements. */
  public name: string;
  /** * Active category configuration blocks established during startup initialization. */
  public categories: LogCategory[];
  /** * The underlying connection pipeline forwarding unmanaged events. */
  public conn: LoggingConnection;
  private temporaryCategoryCounts = new Map<LogCategory, number>();

  /**
     * Instantiates a diagnostic monitoring manager over active kernel operations.
     *
     * @param name - The root contextual log prefix name. Defaults to "bitcoinkernel".
     * @param categories - Initial log subsystems to unlock on construction.
     */
  constructor(
    name: string = "bitcoinkernel",
    categories: LogCategory[] = []
  ) {
    this.name = name;
    this.categories = categories;

    // Set global fallback to DEBUG level
    set_log_level_category(LogCategory.ALL, LogLevel.DEBUG);

    for (const category of this.categories) {
      enable_log_category(category);
    }

    this.conn = this._create_log_connection();
  }

  /**
     * Retrieve a dedicated logging function bound to a category context.
     *
     * @param category - The selected log category context. If omitted, uses the default root layout context.
     * @returns A function that wraps log strings with contextual identifier tags.
     */
  public getLogger(category?: LogCategory): (msg: string) => void {
    const prefix = category ? `[${this.name}:${LogCategory[category]}]` : `[${this.name}]`;

    return (msg: string) => {
      console.log(`${prefix} ${msg}`);
    };
  }

  /**
   * Enable categories while the supplied asynchronous work runs.
   *
   * Nested or overlapping scopes on this viewer are counted. A category
   * is disabled when its last temporary scope ends unless it is listed in
   * this viewer's permanent categories. Cleanup also runs when work rejects.
   *
   * Counts belong to this viewer; they do not track changes made by other
   * viewers or direct calls to the process-wide logging functions.
   *
   * @param categories - Categories to enable during the operation.
   * @param work - Asynchronous operation to await.
   * @throws {RangeError} If a category is invalid. Errors from work propagate.
   */
  public async temporaryCategories(categories: LogCategory[], work: () => Promise<void>): Promise<void> {
    for (const cat of categories) validateCategory(cat);
    for (const cat of categories) {
      enable_log_category(cat);
      this.temporaryCategoryCounts.set(cat, (this.temporaryCategoryCounts.get(cat) ?? 0) + 1);
    }

    try {
      await work();
    } finally {
      for (const cat of categories) {
        const remaining = this.temporaryCategoryCounts.get(cat)! - 1;
        if (remaining === 0) {
          this.temporaryCategoryCounts.delete(cat);
          if (!this.categories.includes(cat)) disable_log_category(cat);
        } else {
          this.temporaryCategoryCounts.set(cat, remaining);
        }
      }
    }
  }

  /**
     * Internal factory orchestrator creating active logging pipes.
     *
     * @returns A fully configured and active LoggingConnection wrapper instance.
     */
  private _create_log_connection(): LoggingConnection {
    const log_opts = new LoggingOptions(
      true,  // log_timestamps
      false, // log_time_micros
      true,  // log_threadnames
      true,  // log_sourcelocations
      true   // always_print_category_levels
    );

    logging_set_options(log_opts);

    // Forward to the root logger
    const rootLogger = this.getLogger();

    return new LoggingConnection((msg: string) => {
      try {
        rootLogger(msg);
      } catch (err) {
        console.error(`Failed to parse log message: ${msg}`, err);
      }
    });
  }
}

/**
 * Interface representing a structured log record parsed from raw kernel text.
 */
export interface KernelLogRecord {
  /** Hierarchical category logger identifier name string path. */
  name: string;
  /** Numeric severity evaluation flag (e.g., 10 for DEBUG, 20 for INFO). */
  levelno: number;
  /** Structural textual severity category identity name (e.g., "DEBUG", "INFO"). */
  levelname: string;
  /** The isolated source filename string tracking where the log entry originated. */
  filename: string;
  /** The full native pathname locating the matching source file. */
  pathname: string;
  /** The code line number matching the statement execution context. */
  lineno: number;
  /** The stripped text message payload body. */
  msg: string;
  /** The functional method scope context executing the log statement. */
  funcName: string;
  /** Epoch timestamp in seconds capturing the event's creation point. */
  created: number;
  /** Thread identifier name executing the operation loop. */
  threadName: string;
}

/**
 * Parse a standard bitcoinkernel log string into a structured data record.
 *
 * Extracts structural properties by applying regular expression group splits against lines
 * structured with active source, category, timestamp, and level options enabled.
 *
 * @param loggerName - The base identifier tag prefixing the output target framework.
 * @param logString - Raw textual content read out from the unmanaged logging stream.
 * @returns A structured record mapping metadata parameters cleanly.
 * @throws {Error} If pattern matching fails or text layouts violate formatting constraints.
 */
export function parse_btck_log_string(loggerName: string, logString: string): KernelLogRecord {
  // Regex matching the kernel log format: timestamp [thread] [function] [category:level] message
  const pattern = /^([\d-]+T[\d:]+(?:\.\d+)?Z)\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[(.+)\]\s+\[([^:]+):([^\]]+)\]\s+(.+)$/;

  const match = logString.match(pattern);
  if (!match) {
    throw new Error(`Log pattern matching failed: ${logString}`);
  }

  const [
    ,
    timestamp,
    threadName,
    sourceLoc,
    funcName,
    category,
    level,
    message
  ] = match;

  // Isolate path properties and numeric line identifiers safely
  const lastColonIndex = sourceLoc.lastIndexOf(":");
  const pathname = lastColonIndex !== -1 ? sourceLoc.substring(0, lastColonIndex) : sourceLoc;
  const linenoStr = lastColonIndex !== -1 ? sourceLoc.substring(lastColonIndex + 1) : "0";
  const lineno = parseInt(linenoStr, 10) || 0;
  const filename = basename(pathname);

  // Build the hierarchical subcategory identifier string path
  const finalLoggerName = category.toUpperCase() !== "ALL"
    ? `${loggerName}.${category.toUpperCase()}`
    : loggerName;

  // Standard logging framework severity level weights
  const levels: Record<string, number> = {
    debug: 10,
    info: 20,
    warning: 30,
    error: 40,
  };

  return {
    name: finalLoggerName,
    levelno: levels[level.toLowerCase()] ?? 0,
    levelname: level.toUpperCase(),
    filename: filename,
    pathname: pathname,
    lineno: lineno,
    msg: message,
    funcName: funcName,
    created: new Date(timestamp).getTime() / 1000,
    threadName: threadName,
  };
}
