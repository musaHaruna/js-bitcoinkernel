import { regtestFixture, temporaryDirectory } from "./util/fixtures.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  BlockHash,
  BlockHeader,
  Block,
  BlockTreeEntry,
  ValidationMode,
  BlockValidationResult,
} from "../src/js-kernel/block.js";
import {
  ChainParameters,
  ChainstateManager,
  ChainType,
  ChainstateManagerOptions,
  ConsensusParams
} from "../src/js-kernel/chain.js";
import { ContextOptions, Context } from "../src/js-kernel/context.js";

// ESM environment path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Suite 1: Chain Type Parameter Initialization
 */
function testChainType(): void {

  const chains = [ChainType.MAINNET, ChainType.TESTNET, ChainType.REGTEST, ChainType.SIGNET];

  for (const chainType of chains) {
    using params = new ChainParameters(chainType);
    assert.ok(params);
  }

}

/**
 * Suite 2: Consensus Strategy Parameters Instantiation
 */
function testConsensusParams(): void {

  const chains = [ChainType.MAINNET, ChainType.TESTNET, ChainType.REGTEST, ChainType.SIGNET];

  for (const chainType of chains) {
    using chainParams = new ChainParameters(chainType);
    using params = chainParams.consensusParams;
    assert.ok(params instanceof ConsensusParams);
  }

}

/**
 * Suite 3: Database & Multi-threading Configuration Constraints
 */
function testChainstateManagerOptions(tempDir: string): void {

  using opts = new ContextOptions();
  using context = new Context(opts);

  // Context string representation assertions
  assert.ok(context.toString().startsWith("<Context at 0x"));
  assert.ok(context.toString().endsWith(">"));

  const blocksDir = path.join(tempDir, "opts_blocks");
  fs.mkdirSync(blocksDir, { recursive: true });
  using chainManOpts = new ChainstateManagerOptions(context, tempDir, blocksDir);

  // Allowed database wipe configuration patterns
  const allowed = [[true, true], [false, true], [false, false]];
  for (const [blockTree, chainstate] of allowed) {
    assert.equal(chainManOpts.setWipeDbs(blockTree, chainstate), 0);
  }

  // Prohibited combinations
  const disallowed = [[true, false]];
  for (const [blockTree, chainstate] of disallowed) {
    assert.notEqual(chainManOpts.setWipeDbs(blockTree, chainstate), 0);
  }

  // Worker thread boundary limits and dynamic allocations
  for (const numThreads of [0, 1, 5]) {
    chainManOpts.setWorkerThreadsNum(numThreads);
    using cm = new ChainstateManager(chainManOpts);
    cm.dispose();
  }

  // Clamped boundary testing for extreme out-of-range integer configurations
  for (const numThreads of [-10, -1, 100]) {
    chainManOpts.setWorkerThreadsNum(numThreads);
    using cm = new ChainstateManager(chainManOpts);
    cm.dispose();
  }

  // In-memory execution configurations
  chainManOpts.updateBlockTreeDbInMemory(true);
  chainManOpts.updateChainstateDbInMemory(true);

  using cmFinal = new ChainstateManager(chainManOpts);
  cmFinal.dispose();
  context.dispose();

}

/**
 * Suite 4: Structural Chainstate Index Lookups
 */
function testChainstateManager(chainMan: ChainstateManager): void {

  using chain = chainMan.getActiveChain();
  using genesis = chain.blockTreeEntries.get(0);

  assert.ok(chainMan.blockTreeEntries.get(genesis.blockHash).equals(genesis));
  assert.ok(chainMan.bestEntry.equals(chain.blockTreeEntries.get(chain.height)));
  assert.equal(chainMan.importBlocks([]), true);

  assert.ok(chainMan.blockTreeEntries.has(genesis.blockHash));

  using zeroHash = BlockHash.fromBytes(new Uint8Array(32));
  assert.equal(chainMan.blockTreeEntries.has(zeroHash), false);

}

/**
 * Suite 5: Active Mutation & Processing Verification
 */
function testProcessBlock(tempDir: string): void {

  using opts = new ContextOptions();
  using params = new ChainParameters(ChainType.REGTEST);
  opts.set_chainparams(params);
  using context = new Context(opts);
  const blocksDir = path.join(tempDir, "proc_blocks");
  fs.mkdirSync(blocksDir, { recursive: true });
  using cmOpts = new ChainstateManagerOptions(context, tempDir, blocksDir);
  using chainMan = new ChainstateManager(cmOpts);

  const blocksPath = path.join(__dirname, "data", "regtest", "blocks.txt");
  const fileContent = fs.readFileSync(blocksPath, "utf8");
  const lines = fileContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const block1Bytes = Uint8Array.from(Buffer.from(lines[0], "hex"));
  using block1 = Block.fromBytes(block1Bytes);

  // Initial transmission should report new block indexing
  assert.equal(chainMan.processBlock(block1), true);

  // Duplicate transaction submission returns false
  assert.equal(chainMan.processBlock(block1), false);

  // Synthesize data corruption across the target Merkle execution root
  const corruptedRaw = new Uint8Array(block1Bytes);
  corruptedRaw[40] ^= 0xFF;
  using corruptedBlock = Block.fromBytes(corruptedRaw);

  assert.throws(() => {
    chainMan.processBlock(corruptedBlock);
  }, /ProcessBlockException|Failed to process block/);

  chainMan.dispose();
  context.dispose();

}

/**
 * Suite 6: Isolation Strategy Block Header Processing
 */
function testProcessBlockHeader(tempDir: string): void {

  using opts = new ContextOptions();
  using params = new ChainParameters(ChainType.MAINNET);
  opts.set_chainparams(params);
  using context = new Context(opts);
  const blocksDir = path.join(tempDir, "main_blocks");
  fs.mkdirSync(blocksDir, { recursive: true });
  using cmOpts = new ChainstateManagerOptions(context, tempDir, blocksDir);
  using chainMan = new ChainstateManager(cmOpts);

  const headerHex = "010000006fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000982051fd1e4ba744bbbe680e1fee14677ba1a3c3540bf7b1cdb606e857233e0e61bc6649ffff001d01e36299";
  const headerBytes = Uint8Array.from(Buffer.from(headerHex, "hex"));
  using header = BlockHeader.fromBytes(headerBytes);

  assert.equal(chainMan.bestEntry.height, 0);
  using result = chainMan.processBlockHeader(header);

  assert.equal(result.blockValidationResult, BlockValidationResult.UNSET);
  assert.equal(result.validationMode, ValidationMode.VALID);
  assert.equal(chainMan.bestEntry.height, 1);

  chainMan.dispose();
  context.dispose();

}

/**
 * Suite 7: Linear Chain Navigation Validation
 */
function testChain(chainMan: ChainstateManager): void {

  using chain = chainMan.getActiveChain();

  assert.equal(chain.height, 206);

  using tip = chain.blockTreeEntries.get(chain.height);
  assert.equal(tip.height, chain.height);

  using previous = chain.blockTreeEntries.get(tip.height - 1);
  assert.ok(previous instanceof BlockTreeEntry);
  assert.equal(previous.height, tip.height - 1);

  assert.equal(chain.toString(), "<Chain height=206>");
  assert.ok(chainMan.toString().startsWith("<ChainstateManager handle="));
  assert.ok(chainMan.toString().endsWith(">"));

}

/**
 * Suite 8: Historical Block Read Context & Spend Tracking
 */
function testReadBlock(chainMan: ChainstateManager): void {

  using chain = chainMan.getActiveChain();
  using genesis = chain.blockTreeEntries.get(0);
  using chainTip = chain.blockTreeEntries.get(chain.height);

  using blockTip = chainMan.blocks.get(chainTip);
  using tipHash = blockTip.blockHash;
  assert.equal(tipHash.toString(), chainTip.blockHash.toString());

  using copiedBlock = Block.fromBytes(blockTip.toBytes());
  using copiedHash = copiedBlock.blockHash;
  assert.equal(copiedHash.toString(), tipHash.toString());

  assert.ok(chainMan.blocks.has(chainTip));
  assert.ok(chainMan.blockSpentOutputs.has(chainTip));
  assert.equal(chainMan.blockSpentOutputs.has(genesis), false);

  assert.throws(() => {
    using missing = chainMan.blockSpentOutputs.get(genesis);
    if (!missing) throw new Error("Genesis block does not have BlockSpentOutputs data");
  }, /Genesis block does not have BlockSpentOutputs data/);

}

function testCustomSignetAndDatabaseCache(): void {
  using parameters = ChainParameters.createSignet(Buffer.from("51", "hex"));
  using options = new ContextOptions();
  options.set_chainparams(parameters);
  using context = new Context(options);
  using directory = temporaryDirectory();
  using chainOptions = new ChainstateManagerOptions(context, directory.path, `${directory.path}/blocks`);

  chainOptions.setDatabaseCacheBytes(4n * 1024n * 1024n);
  assert.throws(() => chainOptions.setDatabaseCacheBytes((4 << 20) - 1), RangeError);

  using chainman = new ChainstateManager(chainOptions);
  assert.equal(chainman.bestEntry.height, 0);
}
test("Chain Type", testChainType);

test("Consensus Params", testConsensusParams);

test("Chainstate Manager Options", () => {
  using directory = temporaryDirectory();
  testChainstateManagerOptions(directory.path);
});

test("Chainstate Manager", () => {
  using fixture = regtestFixture();
  testChainstateManager(fixture.chainman);
});

test("Process Block", () => {
  using directory = temporaryDirectory();
  testProcessBlock(directory.path);
});

test("Process Block Header", () => {
  using directory = temporaryDirectory();
  testProcessBlockHeader(directory.path);
});

test("Chain", () => {
  using fixture = regtestFixture();
  testChain(fixture.chainman);
});

test("Read Block", () => {
  using fixture = regtestFixture();
  testReadBlock(fixture.chainman);
});

test("Custom Signet and Database Cache", testCustomSignetAndDatabaseCache);
