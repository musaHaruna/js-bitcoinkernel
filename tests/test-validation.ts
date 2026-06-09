import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  Block,
  BlockHash,
  BlockTreeEntry,
  BlockValidationResult,
  BlockValidationState,
  ValidationMode,
} from "../src/js-kernel/block.js";
import { ChainType, loadChainman } from "../src/js-kernel/init.js";
import { ValidationInterfaceCallbacks } from "../src/js-kernel/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function _noop(..._args: unknown[]): void {}

const VALIDATION_CALLBACK_NAMES = [
  "block_checked",
  "pow_valid_block",
  "block_connected",
  "block_disconnected",
] as const;

function testValidationState(): void {
  console.log("=== Testing BlockValidationState ===");
  const state = new BlockValidationState();
  assert.equal(state.blockValidationResult, BlockValidationResult.UNSET, "initial validation result should be UNSET");
  assert.equal(state.validationMode, ValidationMode.VALID, "initial validation mode should be VALID");
  console.log("✓ BlockValidationState tests passed\n");
}

function testValidationCallbacksConfig(): void {
  console.log("=== Testing ValidationInterfaceCallbacks Configuration ===");

  console.log("Testing single callback construction...");
  const cbSingle = new ValidationInterfaceCallbacks({ block_disconnected: _noop });
  assert.equal(!!cbSingle.block_disconnected, true, "assigned callback should evaluate to truthy directly on instance");

  for (const name of VALIDATION_CALLBACK_NAMES) {
    if (name !== "block_disconnected") {
      assert.equal(!!(cbSingle as any)[name], false, `unassigned callback '${name}' should be falsy`);
    }
  }

  console.log("Testing empty callback construction...");
  const cbEmpty = new ValidationInterfaceCallbacks({});
  for (const name of VALIDATION_CALLBACK_NAMES) {
    assert.equal(!!(cbEmpty as any)[name], false, `callback '${name}' should be falsy when empty init payload passed`);
  }

  console.log("Testing all callbacks construction...");
  const cbAll = new ValidationInterfaceCallbacks({
    block_checked: _noop,
    pow_valid_block: _noop,
    block_connected: _noop,
    block_disconnected: _noop,
  });
  for (const name of VALIDATION_CALLBACK_NAMES) {
    assert.equal(!!(cbAll as any)[name], true, `callback '${name}' should be explicitly registered on instance`);
  }

  console.log("Testing unknown configuration parameters error checking...");
  assert.throws(() => {
    new ValidationInterfaceCallbacks({ block_disconected: _noop } as any);
  }, /not recognized/, "should reject typos/unknown parameters");

  console.log("Testing reserved implementation structural parameters rejection...");
  assert.throws(() => {
    new ValidationInterfaceCallbacks({ user_data_destroy: _noop } as any);
  }, /not recognized/, "should reject internal reserved callback parameters");

  assert.throws(() => {
    new ValidationInterfaceCallbacks({ user_data: _noop } as any);
  }, /not recognized/, "should reject internal structural handle fields");

  console.log("✓ ValidationInterfaceCallbacks configuration tests passed\n");
}

function testValidationCallbacksLifecycle(): void {
  console.log("=== Testing Validation Interface Lifecycle Integration ===");

  const blocksPath = path.join(__dirname, "data", "regtest", "blocks.txt");
  const fileContent = fs.readFileSync(blocksPath, "utf8");
  const firstBlockHex = fileContent.split(/\r?\n/)[0].trim();
  const blockBytes = Uint8Array.from(Buffer.from(firstBlockHex, "hex"));

  console.log("Testing block_connected arguments wrapping layer...");
  const tempDirEntry = fs.mkdtempSync(path.join(os.tmpdir(), "pbk-cb-entry-"));

  try {
    const received: [Block, BlockTreeEntry][] = [];
    const callbacks = new ValidationInterfaceCallbacks({
      block_connected: (b: Block, e: BlockTreeEntry) => {
        received.push([b, e]);
      }
    });

    const cm = loadChainman(tempDirEntry, ChainType.REGTEST, callbacks);
    const block = Block.fromBytes(blockBytes);

    assert.equal(cm.processBlock(block), true, "block process execution rejected by rule layer");
    assert.ok(received.length > 0, "callback block_connected event was never triggered");

    for (const [blockArg, entryArg] of received) {
      assert.ok(blockArg instanceof Block, "block parameter is not an instance of Block");
      assert.ok(entryArg instanceof BlockTreeEntry, "entry parameter is not an instance of BlockTreeEntry");
      assert.equal(typeof entryArg.height, "number", "block index height property mismatch");
      assert.ok(blockArg.blockHash instanceof BlockHash, "block hash structural instance mapping error");
    }

    if (typeof (cm as any).dispose === "function") (cm as any).dispose();
  } finally {
    fs.rmSync(tempDirEntry, { recursive: true, force: true });
  }

  console.log("Testing block_checked state monitoring payload wrapping layer...");
  const tempDirState = fs.mkdtempSync(path.join(os.tmpdir(), "pbk-cb-state-"));

  try {
    const received: [string, string, ValidationMode][] = [];
    const callbacks = new ValidationInterfaceCallbacks({
      block_checked: (block: Block, state: BlockValidationState) => {
        received.push([
          block.constructor.name,
          state.constructor.name,
          state.validationMode
        ]);
      }
    });

    const cm = loadChainman(tempDirState, ChainType.REGTEST, callbacks);
    const block = Block.fromBytes(blockBytes);

    assert.equal(cm.processBlock(block), true, "block verification failed processing layer constraints");
    assert.ok(received.length > 0, "callback block_checked event was never triggered");

    for (const [blockType, stateType, mode] of received) {
      assert.equal(blockType, "Block", "unexpected wrapper name resolution for block arg");
      assert.equal(stateType, "BlockValidationState", "unexpected wrapper name resolution for state arg");
      assert.equal(mode, ValidationMode.VALID, "expected block validation sequence to settle as VALID");
    }

    if (typeof (cm as any).dispose === "function") (cm as any).dispose();
  } finally {
    fs.rmSync(tempDirState, { recursive: true, force: true });
  }

  console.log("✓ Validation interface execution hooks verified\n");
}

function testValidation(): void {
  try {
    testValidationState();
    testValidationCallbacksConfig();
    testValidationCallbacksLifecycle();
    console.log("ALL TESTS PASSED");
  } catch (err) {
    console.error("\nTEST FAILED");
    console.error(err);
    process.exit(1);
  }
}

testValidation();