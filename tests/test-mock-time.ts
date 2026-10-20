import assert from "node:assert/strict";
import { test } from "node:test";
import { BlockHeader, ValidationMode } from "../src/js-kernel/block.js";
import { ChainParameters, ChainstateManager, ChainstateManagerOptions, ChainType } from "../src/js-kernel/chain.js";
import { Context, ContextOptions } from "../src/js-kernel/context.js";
import { setMockTime } from "../src/js-kernel/mock-time.js";
import { temporaryDirectory } from "./util/fixtures.js";

test("mock time produces a deterministic future-header failure and restores real time", () => {
  using directory = temporaryDirectory();
  using parameters = new ChainParameters(ChainType.MAINNET);
  using options = new ContextOptions();
  options.set_chainparams(parameters);
  using context = new Context(options);
  using chainOptions = new ChainstateManagerOptions(context, directory.path, `${directory.path}/blocks`);
  using chainman = new ChainstateManager(chainOptions);
  using mainnetHeader = BlockHeader.fromBytes(Buffer.from(
    "010000006fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000982051fd1e4ba744bbbe680e1fee14677ba1a3c3540bf7b1cdb606e857233e0e61bc6649ffff001d01e36299",
    "hex"
  ));

  setMockTime(1);
  try {
    using state = chainman.processBlockHeader(mainnetHeader);
    assert.equal(state.validationMode, ValidationMode.INVALID);
  } finally {
    setMockTime(0);
  }

  assert.throws(() => setMockTime(-1), RangeError);
  assert.throws(() => setMockTime(2n ** 32n), RangeError);
});
