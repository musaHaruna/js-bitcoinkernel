import assert from "node:assert/strict";
import { Block } from "../src/js-kernel/block.js";
import { 
    LogCategory, 
    LogLevel, 
    set_log_level_category, 
    enable_log_category, 
    disable_log_category,
    is_valid_log_callback,
    parse_btck_log_string,
    KernelLogViewer
} from "../src/js-kernel/log.js";

/**
 * Global Log Capture Interceptor Utility
 * Handles asynchronous block closures to capture standard console streams
 */
async function captureLogs(action: () => Promise<void> | void): Promise<string[]> {
    const records: string[] = [];
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const interceptor = (...args: any[]) => {
        records.push(args.map(arg => String(arg)).join(" "));
    };

    console.log = interceptor;
    console.warn = interceptor;
    console.error = interceptor;

    try {
        await action();
    } finally {
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
    }

    return records;
}

function dummyFn(msg: string): void {}

/**
 * Log Callback Verification Test Suite
 */
function testIsValidLogCallback(): void {
    console.log("=== Testing Log Callback Signature Verification ===");

    assert.equal(is_valid_log_callback((msg: string) => console.log(msg)), true);
    assert.equal(is_valid_log_callback(dummyFn), true);

    assert.equal(is_valid_log_callback(() => console.log("hello")), false);
    assert.equal(is_valid_log_callback((msg: string, dummy: any) => console.log(msg)), false);

    console.log("✓ Log callback verification tests passed");
    console.log();
}

/**
 * Log Level and Category Adjustments Test Suite
 */
function testLevelCategory(): void {
    console.log("=== Testing Log Level Category Settings ===");

    set_log_level_category(LogCategory.ALL, LogLevel.DEBUG);
    set_log_level_category(LogCategory.ALL, LogLevel.INFO);
    set_log_level_category(LogCategory.ALL, LogLevel.INFO); // Double invocation checks

    set_log_level_category(LogCategory.BLOCKSTORAGE, LogLevel.DEBUG);

    enable_log_category(LogCategory.BLOCKSTORAGE);
    enable_log_category(LogCategory.BLOCKSTORAGE); // Double invocation checks
    
    disable_log_category(LogCategory.BLOCKSTORAGE);
    disable_log_category(LogCategory.BLOCKSTORAGE); // Double invocation checks

    console.log("✓ Log level category rules verified successfully");
    console.log();
}

/**
 * Kernel Log Viewer Test Suite
 */
async function testKernelLogViewer(): Promise<void> {
    console.log("=== Testing Kernel Log Viewer and Parsing Logic ===");

    const logger = new KernelLogViewer("test_logger", []);
    
    // Validate identity binding attributes
    assert.equal(logger.name, "test_logger");

    const time = "2025-03-19T12:14:55Z";
    const thread = "unknown";
    const filename = "context.cpp";
    const path = `depend/bitcoin/src/kernel/${filename}`;
    const lineno = 20;
    const func = "operator()";
    const category = "all";
    const level = "info";
    const msg = "Using the 'arm_shani(1way,2way)' SHA256 implementation";
    
    const logString = `${time} [${thread}] [${path}:${lineno}] [${func}] [${category}:${level}] ${msg}`;
    
    // Parse using the precise exported snake_case function hook
    const record = parse_btck_log_string(logger.name, logString);
    
    assert.equal(record.name, logger.name);
    assert.equal(record.levelno, 20); // Info level maps to 20
    assert.equal(record.levelname, level.toUpperCase());
    assert.equal(record.filename, filename);
    assert.equal(record.pathname, path);
    assert.equal(record.lineno, lineno);
    assert.equal(record.msg, msg);
    assert.equal(record.threadName, thread);
    assert.equal(record.funcName, func);
    
    const expectedTimestamp = new Date(time).getTime() / 1000;
    assert.equal(record.created, expectedTimestamp);

    // Context Manager Verification: Core execution hook inside async temporary categories loop
    const logsFromContext = await captureLogs(async () => {
        await logger.temporaryCategories([LogCategory.KERNEL], async () => {
            try {
                // Pass malformed hex sequences to simulate decoding validation failures
                Block.fromBytes(Uint8Array.from([0xab]));
            } catch (err) {
                // Intercept expected kernel-side execution block dropouts
            }
        });
    });

    assert.ok(
        logsFromContext.some(log => log.includes("Block decode failed.")),
        "Expected log entry 'Block decode failed.' was missing from contextual intercept pipeline"
    );

    const debugLogger = new KernelLogViewer("debug_logger", [LogCategory.KERNEL, LogCategory.PRUNE]);
    
    const logsFromDebug = await captureLogs(() => {
        try {
            Block.fromBytes(Uint8Array.from([0xab]));
        } catch (err) {
            // Intercept expected failure
        }
    });

    assert.ok(
        logsFromDebug.some(log => log.includes("Block decode failed.")),
        "Expected log entry 'Block decode failed.' was missing from debug_logger output"
    );

    console.log("✓ Kernel log viewer string parsing and scopes verified");
    console.log();
}

/**
 * Test Runner Hook
 */
async function testLog(): Promise<void> {
    try {
        testIsValidLogCallback();
        testLevelCategory();
        await testKernelLogViewer();
        console.log("ALL LOGGING TESTS PASSED");
    } catch (err) {
        console.error();
        console.error("TEST SUITE FAILED");
        console.error(err);
        process.exit(1);
    }
}

testLog();
