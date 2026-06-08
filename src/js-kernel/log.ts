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
     * Marshal properties into an unmanaged structural layout compliant with the FFI layer.
     *
     * @returns A plain configuration object matching the target C layout definition.
     */
    public toNativeStruct() {
        return {
            log_timestamps: this.log_timestamps,
            log_time_micros: this.log_time_micros,
            log_threadnames: this.log_threadnames,
            log_sourcelocations: this.log_sourcelocations,
            always_print_category_levels: this.always_print_category_levels
        };
    }
}

/**
 * Validate that an object satisfies single-argument function callback constraints.
 *
 * @param fn - The candidate reference testing for compatibility.
 * @returns True if the parameter behaves as a single-argument functional router.
 */
export function is_valid_log_callback(fn: unknown): boolean {
    if (typeof fn !== "function") {
        return false;
    }
    return fn.length === 1;
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
    if (!btck_logging_disable_category) {
        throw new Error("btck_logging_disable_category unavailable");
    }
    btck_logging_disable_category(category);
}

/**
 * Active context manager linking native log string streams to JavaScript callbacks.
 *
 * Instantiates a direct callback pipe intercepting text lines formatted by the kernel.
 * * @note Early startup events occurring prior to initial connection setups are held within an 
 * internal 1MB buffer and flushed immediately across the boundary upon connection activation.
 */
export class LoggingConnection extends KernelOpaquePtr {
    protected static override createFn = btck_logging_connection_create as (...args: unknown[]) => bigint;
    protected static override destroyFn = btck_logging_connection_destroy as (ptr: bigint) => void;

    /** * Retained reference to the native callback wrapper function.
     * Crucial to anchor this reference here to prevent the V8 Garbage Collector from 
     * sweeping the callback stub while unmanaged C loops still hold its function pointer.
     */
    private _nativeCallback: Function;

    /**
     * Create a new connection instance listening to the kernel logging stream.
     *
     * @param cb - Single-argument callback receiving raw unmanaged string buffers.
     * @throws {TypeError} If the provided callback function does not take exactly one parameter.
     * @throws {Error} If `btck_logging_connection_create` function bindings are missing or handle initialization fails.
     */
    constructor(cb: (message: string) => void) {
        if (!is_valid_log_callback(cb)) {
            throw new TypeError(
                "Log callback must be a function with 1 parameter and no return value."
            );
        }

        if (!btck_logging_connection_create) {
            throw new Error("btck_logging_connection_create unavailable");
        }

        // 1. Wrap the JS function and store it in a local variable (Safe from 'this' constraints)
        const nativeCb = LoggingConnection._wrap_log_fn(cb);

        // 2. Invoke the native FFI creator function
        const newPtr = btck_logging_connection_create(nativeCb, null, null) as bigint;

        if (newPtr === 0n) {
            throw new Error("Failed to create LoggingConnection");
        }

        // 3. Construct the base class first to bind the unmanaged pointer handle
        super(newPtr, true, null);

        // 4. Anchor the callback stub instance safely to protect it from V8 GC sweeps
        this._nativeCallback = nativeCb;
    }

    /**
     * Wrap a standard JavaScript functional closure inside an FFI-compliant callback signature.
     * Maps structurally to: `void (*btck_LogCallback)(void* user_data, const char* message, size_t message_len)`
     *
     * @param fn - The high-level consumer handler receiving string payloads.
     * @returns An FFI-compliant trampoline function capable of decoding unmanaged string pointer segments.
     */
    private static _wrap_log_fn(fn: (message: string) => void): Function {
        return (userData: unknown, messagePtr: unknown, messageLen: number | bigint): void => {
            const length = Number(messageLen);
            
            let decodedString = "";
            if (messagePtr) {
                // Instantly construct a safe local memory copy from the raw unmanaged character pointer address
                const bufferView = Buffer.from(messagePtr as any, 0, length);
                decodedString = bufferView.toString("utf-8");
            }

            fn(decodedString);
        };
    }
}

/**
 * Coordination manager bridging native kernel log events to application consumers.
 *
 * Configures output formatting styles, initializes categories, registers baseline levels, 
 * and anchors the active `LoggingConnection` pipe to ensure robust message routing.
 */
export class KernelLogViewer {
    /** * The root contextual namespace descriptor tag prefixing console statements. */
    public name: string;
    /** * Active category configuration blocks established during startup initialization. */
    public categories: LogCategory[];
    /** * The underlying connection pipeline forwarding unmanaged events. */
    public conn: LoggingConnection;

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
     * Temporarily open structural categories for an isolated execution scope.
     *
     * Toggles categories on, runs the provided callback block, and cleanly restores previous states 
     * within a `try...finally` block to protect against diagnostic pollution or memory leaks.
     *
     * @param categories - Array of categories to temporarily open.
     * @param work - Async functional task context block to process.
     */
    public async temporaryCategories(categories: LogCategory[], work: () => Promise<void>): Promise<void> {
        for (const cat of categories) enable_log_category(cat);
        
        try {
            await work();
        } finally {
            for (const cat of categories) {
                if (!this.categories.includes(cat)) {
                    disable_log_category(cat);
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
    const pattern = /^([\d-]+T[\d:]+Z)\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[(.+)\]\s+\[([^:]+):([^\]]+)\]\s+(.+)$/;
    
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
