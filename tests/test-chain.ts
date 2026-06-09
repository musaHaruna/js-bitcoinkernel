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
  console.log("=== Testing Chain Type ===");
  const chains = [ChainType.MAINNET, ChainType.TESTNET, ChainType.REGTEST, ChainType.SIGNET];

  for (const chainType of chains) {
    const params = new ChainParameters(chainType);
    assert.ok(params);
  }
  console.log("✓ Chain Type tests passed\n");
}

/**
 * Suite 2: Consensus Strategy Parameters Instantiation
 */
function testConsensusParams(): void {
  console.log("=== Testing Consensus Params ===");
  const chains = [ChainType.MAINNET, ChainType.TESTNET, ChainType.REGTEST, ChainType.SIGNET];

  for (const chainType of chains) {
    const params = new ChainParameters(chainType).consensusParams;
    assert.ok(params instanceof ConsensusParams);
  }
  console.log("✓ Consensus Params tests passed\n");
}

/**
 * Suite 3: Database & Multi-threading Configuration Constraints
 */
function testChainstateManagerOptions(tempDir: string): void {
  console.log("=== Testing Chainstate Manager Options ===");
  const opts = new ContextOptions();
  const context = new Context(opts);

  // Context string representation assertions
  assert.ok(context.toString().startsWith("<Context at 0x"));
  assert.ok(context.toString().endsWith(">"));

  const blocksDir = path.join(tempDir, "opts_blocks");
  fs.mkdirSync(blocksDir, { recursive: true });
  const chainManOpts = new ChainstateManagerOptions(context, tempDir, blocksDir);

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
    const cm = new ChainstateManager(chainManOpts);
    if (typeof (cm as any).dispose === "function") (cm as any).dispose();
  }

  // Clamped boundary testing for extreme out-of-range integer configurations
  for (const numThreads of [-10, -1, 100]) {
    chainManOpts.setWorkerThreadsNum(numThreads);
    const cm = new ChainstateManager(chainManOpts);
    if (typeof (cm as any).dispose === "function") (cm as any).dispose();
  }

  // In-memory execution configurations
  chainManOpts.updateBlockTreeDbInMemory(true);
  chainManOpts.updateChainstateDbInMemory(true);

  const cmFinal = new ChainstateManager(chainManOpts);
  if (typeof (cmFinal as any).dispose === "function") (cmFinal as any).dispose();
  if (typeof (context as any).dispose === "function") (context as any).dispose();

  console.log("✓ Chainstate Manager Options tests passed\n");
}

/**
 * Suite 4: Structural Chainstate Index Lookups
 */
function testChainstateManager(chainMan: ChainstateManager): void {
  console.log("=== Testing Chainstate Manager ===");
  const chain = chainMan.getActiveChain();
  const genesis = chain.blockTreeEntries.get(0);

  assert.deepEqual(chainMan.blockTreeEntries.get(genesis.blockHash), genesis);
  assert.deepEqual(chainMan.bestEntry, chain.blockTreeEntries.get(chain.height));
  assert.equal(chainMan.importBlocks([]), 0);

  assert.ok(chainMan.blockTreeEntries.has(genesis.blockHash));

  const zeroHash = BlockHash.fromBytes(new Uint8Array(32));
  assert.equal(chainMan.blockTreeEntries.has(zeroHash), false);

  console.log("✓ Chainstate Manager tests passed\n");
}

/**
 * Suite 5: Active Mutation & Processing Verification
 */
function testProcessBlock(tempDir: string): void {
  console.log("=== Testing Process Block ===");
  const opts = new ContextOptions();
  opts.set_chainparams(new ChainParameters(ChainType.REGTEST));
  const context = new Context(opts);
  const blocksDir = path.join(tempDir, "proc_blocks");
  fs.mkdirSync(blocksDir, { recursive: true });
  const cmOpts = new ChainstateManagerOptions(context, tempDir, blocksDir);
  const chainMan = new ChainstateManager(cmOpts);

  const blocksPath = path.join(__dirname, "data", "regtest", "blocks.txt");
  const fileContent = fs.readFileSync(blocksPath, "utf8");
  const lines = fileContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const block1Bytes = Uint8Array.from(Buffer.from(lines[0], "hex"));
  const block1 = Block.fromBytes(block1Bytes);

  // Initial transmission should report new block indexing
  assert.equal(chainMan.processBlock(block1), true);

  // Duplicate transaction submission returns false
  assert.equal(chainMan.processBlock(block1), false);

  // Synthesize data corruption across the target Merkle execution root
  const corruptedRaw = new Uint8Array(block1Bytes);
  corruptedRaw[40] ^= 0xFF;
  const corruptedBlock = Block.fromBytes(corruptedRaw);

  assert.throws(() => {
    chainMan.processBlock(corruptedBlock);
  }, /ProcessBlockException|Failed to process block/);

  if (typeof (chainMan as any).dispose === "function") (chainMan as any).dispose();
  if (typeof (context as any).dispose === "function") (context as any).dispose();
  console.log("✓ Process Block tests passed\n");
}

/**
 * Suite 6: Isolation Strategy Block Header Processing
 */
function testProcessBlockHeader(tempDir: string): void {
  console.log("=== Testing Process Block Header ===");
  const opts = new ContextOptions();
  opts.set_chainparams(new ChainParameters(ChainType.MAINNET));
  const context = new Context(opts);
  const blocksDir = path.join(tempDir, "main_blocks");
  fs.mkdirSync(blocksDir, { recursive: true });
  const cmOpts = new ChainstateManagerOptions(context, tempDir, blocksDir);
  const chainMan = new ChainstateManager(cmOpts);

  const headerHex = "010000006fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000982051fd1e4ba744bbbe680e1fee14677ba1a3c3540bf7b1cdb606e857233e0e61bc6649ffff001d01e36299";
  const headerBytes = Uint8Array.from(Buffer.from(headerHex, "hex"));
  const header = BlockHeader.fromBytes(headerBytes);

  assert.equal(chainMan.bestEntry.height, 0);
  const result = chainMan.processBlockHeader(header);

  assert.equal(result.blockValidationResult, BlockValidationResult.UNSET);
  assert.equal(result.validationMode, ValidationMode.VALID);
  assert.equal(chainMan.bestEntry.height, 1);

  if (typeof (chainMan as any).dispose === "function") (chainMan as any).dispose();
  if (typeof (context as any).dispose === "function") (context as any).dispose();
  console.log("✓ Process Block Header tests passed\n");
}

/**
 * Suite 7: Linear Chain Navigation Validation
 */
function testChain(chainMan: ChainstateManager): void {
  console.log("=== Testing Chain ===");
  const chain = chainMan.getActiveChain() ? (chainMan as any).get_active_chain() : chainMan.getActiveChain();

  assert.equal(chain.height, 206);

  const tip = chain.blockTreeEntries.get(chain.height);
  assert.equal(tip.height, chain.height);

  const previous = chain.blockTreeEntries.get(tip.height - 1);
  assert.ok(previous instanceof BlockTreeEntry);
  assert.equal(previous.height, tip.height - 1);

  assert.equal(chain.toString(), "<Chain height=206>");
  assert.ok(chainMan.toString().startsWith("<ChainstateManager at 0x"));
  assert.ok(chainMan.toString().endsWith(">"));

  console.log("✓ Chain tests passed\n");
}

/**
 * Suite 8: Historical Block Read Context & Spend Tracking
 */
function testReadBlock(chainMan: ChainstateManager): void {
  console.log("=== Testing Read Block ===");
  const chain = chainMan.getActiveChain() ? (chainMan as any).get_active_chain() : chainMan.getActiveChain();
  const genesis = chain.blockTreeEntries.get(0);
  const chainTip = chain.blockTreeEntries.get(chain.height);

  const blockTip = chainMan.blocks.get(chainTip);
  assert.equal(blockTip.blockHash.toString(), chainTip.blockHash.toString());

  const copiedBlock = Block.fromBytes(blockTip.toBytes());
  assert.equal(copiedBlock.blockHash.toString(), blockTip.blockHash.toString());

  assert.ok(chainMan.blocks.has(chainTip));
  assert.ok(chainMan.blockSpentOutputs.has(chainTip));
  assert.equal(chainMan.blockSpentOutputs.has(genesis), false);

  assert.throws(() => {
    const missing = chainMan.blockSpentOutputs.get(genesis);
    if (!missing) throw new Error("Genesis block does not have BlockSpentOutputs data");
  }, /Genesis block does not have BlockSpentOutputs data/);

  console.log("✓ Read Block tests passed\n");
}

/**
 * Main Orchestration Matrix
 */
function runAllTests(chainMan: ChainstateManager, tempDir: string): void {
  try {
    testChainType();
    testConsensusParams();
    testChainstateManagerOptions(tempDir);
    testChainstateManager(chainMan);
    testProcessBlock(tempDir);
    testProcessBlockHeader(tempDir);
    testChain(chainMan);
    testReadBlock(chainMan);
    console.log("ALL TESTS PASSED SUCCESSFULLY");
  } catch (err) {
    console.error("\nVALIDATION MATRIX FAILED:");
    console.error(err);
    process.exit(1);
  }
}

// ============================================================================
// EXECUTION CONTEXT SETUP
// ============================================================================

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbk-ts-test-"));
const blocksDir = path.join(tempDir, "blocks");
fs.mkdirSync(blocksDir, { recursive: true });

try {
  const opts = new ContextOptions();
  opts.set_chainparams(new ChainParameters(ChainType.REGTEST));
  const context = new Context(opts);

  const cmOpts = new ChainstateManagerOptions(context, tempDir, blocksDir);
  const chainmanRegtest = new ChainstateManager(cmOpts);

  const blocksFile = path.join(__dirname, "data", "regtest", "blocks.txt");
  if (!fs.existsSync(blocksFile)) {
    throw new Error(`Missing expected fixture input mapping at: ${blocksFile}`);
  }

  console.log("Pre-populating engine with block database fixtures...");
  const fileContent = fs.readFileSync(blocksFile, "utf8");
  const hexBlocks = fileContent.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  for (const hex of hexBlocks) {
    const blockBytes = Uint8Array.from(Buffer.from(hex, "hex"));
    const block = Block.fromBytes(blockBytes);
    chainmanRegtest.processBlock(block);
  }
  console.log(`Indexed ${hexBlocks.length} blocks successfully.\n`);

  // Execute matrix test cases
  runAllTests(chainmanRegtest, tempDir);

  if (typeof (chainmanRegtest as any).dispose === "function") (chainmanRegtest as any).dispose();
  if (typeof (context as any).dispose === "function") (context as any).dispose();

} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}