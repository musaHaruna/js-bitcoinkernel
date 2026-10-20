import { test } from "node:test";
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

  using state = new BlockValidationState();
  assert.equal(state.blockValidationResult, BlockValidationResult.UNSET, "initial validation result should be UNSET");
  assert.equal(state.validationMode, ValidationMode.VALID, "initial validation mode should be VALID");

}

function testValidationCallbacksConfig(): void {

  const cbSingle = new ValidationInterfaceCallbacks({ block_disconnected: _noop });
  assert.equal(!!cbSingle.block_disconnected, true, "assigned callback should evaluate to truthy directly on instance");

  for (const name of VALIDATION_CALLBACK_NAMES) {
    if (name !== "block_disconnected") {
      assert.equal(!!(cbSingle as any)[name], false, `unassigned callback '${name}' should be falsy`);
    }
  }

  const cbEmpty = new ValidationInterfaceCallbacks({});
  for (const name of VALIDATION_CALLBACK_NAMES) {
    assert.equal(!!(cbEmpty as any)[name], false, `callback '${name}' should be falsy when empty init payload passed`);
  }

  const cbAll = new ValidationInterfaceCallbacks({
    block_checked: _noop,
    pow_valid_block: _noop,
    block_connected: _noop,
    block_disconnected: _noop,
  });
  for (const name of VALIDATION_CALLBACK_NAMES) {
    assert.equal(!!(cbAll as any)[name], true, `callback '${name}' should be explicitly registered on instance`);
  }

  assert.throws(() => {
    new ValidationInterfaceCallbacks({ block_disconected: _noop } as any);
  }, /not recognized/, "should reject typos/unknown parameters");

  assert.throws(() => {
    new ValidationInterfaceCallbacks({ user_data_destroy: _noop } as any);
  }, /not recognized/, "should reject internal reserved callback parameters");

  assert.throws(() => {
    new ValidationInterfaceCallbacks({ user_data: _noop } as any);
  }, /not recognized/, "should reject internal structural handle fields");

}

function testValidationCallbacksLifecycle(): void {

  const blocksPath = path.join(__dirname, "data", "regtest", "blocks.txt");
  const fileContent = fs.readFileSync(blocksPath, "utf8");
  const firstBlockHex = fileContent.split(/\r?\n/)[0].trim();
  const blockBytes = Uint8Array.from(Buffer.from(firstBlockHex, "hex"));

  const tempDirEntry = fs.mkdtempSync(path.join(os.tmpdir(), "pbk-cb-entry-"));

  try {
    const received: [Block, BlockTreeEntry][] = [];
    const callbacks = new ValidationInterfaceCallbacks({
      block_connected: (b: Block, e: BlockTreeEntry) => {
        assert.equal(typeof e.height, "number");
        using hash = b.blockHash;
        assert.ok(hash instanceof BlockHash);
        received.push([b, e]);
      }
    });

    using cm = loadChainman(tempDirEntry, ChainType.REGTEST, callbacks);
    using block = Block.fromBytes(blockBytes);

    assert.equal(cm.processBlock(block), true, "block process execution rejected by rule layer");
    assert.ok(received.length > 0, "callback block_connected event was never triggered");

    for (const [blockArg, entryArg] of received) {
      assert.ok(blockArg instanceof Block, "block parameter is not an instance of Block");
      assert.ok(entryArg instanceof BlockTreeEntry, "entry parameter is not an instance of BlockTreeEntry");
      assert.ok(entryArg.isDisposed());
      assert.ok(blockArg.isDisposed());
    }

    cm.dispose();
  } finally {
    fs.rmSync(tempDirEntry, { recursive: true, force: true });
  }

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

    using cm = loadChainman(tempDirState, ChainType.REGTEST, callbacks);
    using block = Block.fromBytes(blockBytes);

    assert.equal(cm.processBlock(block), true, "block verification failed processing layer constraints");
    assert.ok(received.length > 0, "callback block_checked event was never triggered");

    for (const [blockType, stateType, mode] of received) {
      assert.equal(blockType, "Block", "unexpected wrapper name resolution for block arg");
      assert.equal(stateType, "BlockValidationState", "unexpected wrapper name resolution for state arg");
      assert.equal(mode, ValidationMode.VALID, "expected block validation sequence to settle as VALID");
    }

    cm.dispose();
  } finally {
    fs.rmSync(tempDirState, { recursive: true, force: true });
  }

}
test("Validation State", testValidationState);

test("Validation Callbacks Config", testValidationCallbacksConfig);

test("Validation Callbacks Lifecycle", testValidationCallbacksLifecycle);
