import { test } from "node:test";
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

  using options = new ContextOptions();

  // Extract valid enum parameters dynamically from ChainType
  const chainTypes = Object.values(ChainType).filter(v => typeof v === "number") as ChainType[];

  for (const chainType of chainTypes) {

    using params = new ChainParameters(chainType);
    options.set_chainparams(params);

    using context = new Context(options);
    assert.ok(context !== null, `Context initialization failed for chain type enum value: ${chainType}`);

    // Cleanup native handles if explicit dispose mappings are present
    context.dispose();
  }

}

/**
 * Context Initialization via Validation Callbacks Test Suite
 */
function testMakeContextWithValidationCallbacks(): void {

  const cbs = new ValidationInterfaceCallbacks({
    block_disconnected: (_block: Block, _entry: BlockTreeEntry) => {}
  });

  using options = new ContextOptions();
  options.set_validation_interface(cbs);

  using context = new Context(options);
  assert.ok(context !== null, "Failed to instantiate context wrapper using runtime validation structures");

  context.dispose();

}

/**
 * Context Initialization without Validation Callbacks Test Suite
 */
function testMakeContextWithoutValidationCallbacks(): void {

  using context = makeContext();
  assert.ok(context !== null, "Failed to instantiate fallback context configuration");

  context.dispose();

}

/**
 * Helper factory to build full chain manager environments wrapped with dynamic callbacks
 */
function buildChainmanWithInlineCallback(tempDir: string, callback: (b: Block, e: BlockTreeEntry) => void): ChainstateManager {
  using opts = new ContextOptions();
  using params = new ChainParameters(ChainType.REGTEST);
  opts.set_chainparams(params);

  opts.set_validation_interface(
    new ValidationInterfaceCallbacks({ block_connected: callback })
  );

  using context = new Context(opts);
  const blocksDir = path.join(tempDir, "blocks");

  // Ensure data directory paths exist prior to native initialization
  fs.mkdirSync(blocksDir, { recursive: true });

  using cmOpts = new ChainstateManagerOptions(
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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbk-lifecycle-"));
  let callCount = 0;

  try {
    // Instantiate the runtime engine wrapping a localized block confirmation trigger counter
    using cm = buildChainmanWithInlineCallback(tempDir, (_b: Block, _e: BlockTreeEntry) => {
      callCount++;
    });

    // Resolve local file-system serialization data reference targets
    const blocksFile = path.join(__dirname, "data", "regtest", "blocks.txt");
    const fileContent = fs.readFileSync(blocksFile, "utf8");
    const firstBlockHex = fileContent.split(/\r?\n/)[0].trim();
    const blockBytes = Uint8Array.from(Buffer.from(firstBlockHex, "hex"));

    using block = Block.fromBytes(blockBytes);

    const processingSuccess = cm.processBlock(block);

    assert.equal(processingSuccess, true, "Block processing sequence was rejected by kernel rules validation");
    assert.ok(callCount > 0, "Memory management failure: Persistent trampoline reference was lost or swept away before execution");

    cm.dispose();
  } finally {
    // Clean up safe-housed operating system directory contexts
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

}
test("Chain Types", testChainTypes);

test("Make Context With Validation Callbacks", testMakeContextWithValidationCallbacks);

test("Make Context Without Validation Callbacks", testMakeContextWithoutValidationCallbacks);

test("Chainman Keeps Validation Callbacks Alive", testChainmanKeepsValidationCallbacksAlive);
