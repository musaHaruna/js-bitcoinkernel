import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { Block, BlockTreeEntry } from "../src/js-kernel/block.js";
import { ChainType, ChainParameters } from "../src/js-kernel/init.js";
import { makeContext } from "../src/js-kernel/init.js";
import {
  ContextOptions,
  Context,
} from "../src/js-kernel/context.js";
import { ChainstateManager, ChainstateManagerOptions } from "../src/js-kernel/chain.js";
import { ValidationInterfaceCallbacks } from "../src/js-kernel/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Chain Types Test Suite
 */
function testChainTypes(): void {
  console.log("=== Testing Chain Types Setup ===");

  const options = new ContextOptions();

  // Extract valid enum parameters dynamically from ChainType
  const chainTypes = Object.values(ChainType).filter(v => typeof v === "number") as ChainType[];

  for (const chainType of chainTypes) {
    console.log(`Configuring context for ChainType ID: ${chainType}...`);
    options.set_chainparams(new ChainParameters(chainType));

    const context = new Context(options);
    assert.ok(context !== null, `Context initialization failed for chain type enum value: ${chainType}`);

    // Cleanup native handles if explicit dispose mappings are present
    if (typeof (context as any).dispose === "function") (context as any).dispose();
  }

  console.log("✓ Chain types configuration tests passed");
  console.log();
}

/**
 * Context Initialization via Validation Callbacks Test Suite
 */
function testMakeContextWithValidationCallbacks(): void {
  console.log("=== Testing Context Configuration WITH Callbacks ===");

  const cbs = new ValidationInterfaceCallbacks({
    block_disconnected: (_block: Block, _entry: BlockTreeEntry) => {}
  });

  // FIX: Use ContextOptions to properly bridge the validation interface
  const options = new ContextOptions();
  options.set_validation_interface(cbs);

  const context = new Context(options);
  assert.ok(context !== null, "Failed to instantiate context wrapper using runtime validation structures");

  if (typeof (context as any).dispose === "function") (context as any).dispose();

  console.log("✓ Context wrapper configuration validation passed");
  console.log();
}

/**
 * Context Initialization without Validation Callbacks Test Suite
 */
function testMakeContextWithoutValidationCallbacks(): void {
  console.log("=== Testing Context Configuration WITHOUT Callbacks ===");

  const context = makeContext();
  assert.ok(context !== null, "Failed to instantiate fallback context configuration");

  if (typeof (context as any).dispose === "function") (context as any).dispose();

  console.log("✓ Context baseline default generation passed");
  console.log();
}

/**
 * Helper factory to build full chain manager environments wrapped with dynamic callbacks
 */
function buildChainmanWithInlineCallback(tempDir: string, callback: (b: Block, e: BlockTreeEntry) => void): ChainstateManager {
  const opts = new ContextOptions();
  opts.set_chainparams(new ChainParameters(ChainType.REGTEST));

  opts.set_validation_interface(
    new ValidationInterfaceCallbacks({ block_connected: callback })
  );

  const context = new Context(opts);
  const blocksDir = path.join(tempDir, "blocks");

  // Ensure data directory paths exist prior to native initialization
  fs.mkdirSync(blocksDir, { recursive: true });

  const cmOpts = new ChainstateManagerOptions(
    context,
    tempDir,
    blocksDir
  );

  return new ChainstateManager(cmOpts);
}

/**
 * Memory Safety Lifecycle Test Suite
 * * Verifies that transient inline-constructed callbacks do not get swept away
 * by the V8 Garbage Collector while active native C pointers reference them.
 */
function testChainmanKeepsValidationCallbacksAlive(): void {
  console.log("=== Testing ChainstateManager Callback Lifecycle Memory Retention ===");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbk-lifecycle-"));
  let callCount = 0;

  try {
    // Instantiate the runtime engine wrapping a localized block confirmation trigger counter
    const cm = buildChainmanWithInlineCallback(tempDir, (_b: Block, _e: BlockTreeEntry) => {
      callCount++;
    });

    // Resolve local file-system serialization data reference targets
    const blocksFile = path.join(__dirname, "data", "regtest", "blocks.txt");
    const fileContent = fs.readFileSync(blocksFile, "utf8");
    const firstBlockHex = fileContent.split(/\r?\n/)[0].trim();
    const blockBytes = Uint8Array.from(Buffer.from(firstBlockHex, "hex"));

    const block = Block.fromBytes(blockBytes);

    console.log("Processing genesis validation sequences directly against FFI layer...");
    const processingSuccess = cm.processBlock(block);

    assert.equal(processingSuccess, true, "Block processing sequence was rejected by kernel rules validation");
    assert.ok(callCount > 0, "Memory management failure: Persistent trampoline reference was lost or swept away before execution");

    if (typeof (cm as any).dispose === "function") (cm as any).dispose();
  } finally {
    // Clean up safe-housed operating system directory contexts
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log("✓ Dynamic interface memory retention checks passed safely");
  console.log();
}

/**
 * Test Runner
 *
 * Executes all test suites in sequence.
 * Exits with error code 1 if any assertion fails.
 */
function testChain(): void {
  try {
    testChainTypes();
    testMakeContextWithValidationCallbacks();
    testMakeContextWithoutValidationCallbacks();
    testChainmanKeepsValidationCallbacksAlive();
    console.log("ALL TESTS PASSED");
  } catch (err) {
    console.error();
    console.error("TEST FAILED");
    console.error(err);
    process.exit(1);
  }
}

testChain();