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
    BlockCheckFlags, 
    BlockValidationResult, 
} from "../src/js-kernel/block.js";
import { ChainParameters, ChainstateManager, ChainType, ChainstateManagerOptions } from "../src/js-kernel/chain.js";
import { TransactionSpentOutputs } from "../src/js-kernel/transaction.js";
import { ContextOptions, Context } from "../src/js-kernel/context.js";

// ESM environment path helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Deterministic Test Inputs & Constants
 */
const FORK_BLOCK_HEX = "0000002006226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f295badc0bdd9a2bc0955d12f337491eae4c87ba4660078c0156310284d47c6ff9a242d66ffff7f200200000001020000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff025100ffffffff0200f2052a010000001600141409745405c4e8310a875bcd602db6b9b3dc0cf90000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf90120000000000000000000000000000000000000000000000000000000000000000000000000";

const GENESIS_BLOCK_HEX = "0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4adae5494dffff7f20020000000101000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000";

/**
 * BlockTreeEntry Test Suite
 */
function testBlockTreeEntry(chainmanRegtest: ChainstateManager): void {
    console.log("=== Testing BlockTreeEntry ===");

    const chain = chainmanRegtest.getActiveChain();

    const block0 = chain.blockTreeEntries.get(0);
    assert.equal(block0.height, 0);

    const block1 = chain.blockTreeEntries.get(1);
    assert.equal(block1.height, 1);
    
    assert.equal(block0.equals(block1), false, "block0 should not equal block1");
    assert.ok(block0 instanceof BlockTreeEntry);
    assert.deepEqual(block1.previous, block0);
    assert.equal(block1.blockHeader.blockHash.toString(), block1.blockHash.toString());

    assert.equal(block0.equals(null as any), false);

    const genesisHashHex = block0.blockHash.toString();
    assert.equal(block0.toString(), `<BlockTreeEntry height=0 hash=${genesisHashHex}>`);

    console.log("✓ BlockTreeEntry tests passed");
    console.log();
}

/**
 * BlockTreeEntry Ancestor Resolution Test Suite
 */
function testBlockTreeEntryGetAncestor(chainmanRegtest: ChainstateManager): void {
    console.log("=== Testing BlockTreeEntry GetAncestor ===");

    const chain = chainmanRegtest.getActiveChain();
    const tip = chain.blockTreeEntries.get(chain.height);

    assert.ok(tip.getAncestor(0).equals(chain.blockTreeEntries.get(0)), "Ancestor 0 should match block 0");
    assert.ok(tip.getAncestor(tip.height).equals(tip), "Ancestor at tip height should be tip");
    assert.ok(tip.getAncestor(tip.height - 1).equals(chain.blockTreeEntries.get(tip.height - 1)), "Ancestor at tip-1 height should match");

    assert.throws(() => tip.getAncestor(tip.height + 1), /out of range/);
    assert.throws(() => tip.getAncestor(-1), /out of range/);

    console.log("✓ BlockTreeEntry GetAncestor tests passed");
    console.log();
}

/**
 * Fork-Aware Ancestor Resolution Test Suite
 */
function testBlockTreeEntryGetAncestorFork(chainmanRegtest: ChainstateManager): void {
    console.log("=== Testing BlockTreeEntry GetAncestor Fork ===");

    const chain = chainmanRegtest.getActiveChain();
    const forkBlock = Block.fromBytes(Uint8Array.from(Buffer.from(FORK_BLOCK_HEX, "hex")));
    chainmanRegtest.processBlock(forkBlock);

    const forkEntry = chainmanRegtest.blockTreeEntries.get(forkBlock.blockHash);
    assert.equal(forkEntry.height, 1);
    assert.equal(forkEntry.equals(chain.blockTreeEntries.get(1)), false);
    
    assert.ok(forkEntry.getAncestor(0).equals(chain.blockTreeEntries.get(0)), "Fork entry ancestor 0 should resolve to genesis");
    assert.ok(forkEntry.getAncestor(1).equals(forkEntry), "Fork entry ancestor at height 1 should be itself");

    console.log("✓ BlockTreeEntry GetAncestor Fork tests passed");
    console.log();
}

/**
 * BlockHash Test Suite
 */
function testBlockHash(): void {
    console.log("=== Testing BlockHash ===");

    // FIXED: Switched from Buffer back to clean Uint8Array to satisfy deepStrictEqual strict mode
    const zeroBytes = new Uint8Array(32).fill("0".charCodeAt(0));
    const oneBytes = new Uint8Array(32).fill("1".charCodeAt(0));

    const hashZero = BlockHash.fromBytes(zeroBytes);

    assert.equal(hashZero.equals(hashZero), true);
    assert.equal(hashZero.equals(BlockHash.fromBytes(zeroBytes)), true);
    assert.equal(hashZero.equals(BlockHash.fromBytes(oneBytes)), false);

    assert.deepEqual(hashZero.toBytes(), zeroBytes);
    assert.equal(hashZero.toString(), "3030303030303030303030303030303030303030303030303030303030303030");

    assert.equal(hashZero.equals(zeroBytes as any), false);

    assert.throws(() => BlockHash.fromBytes(new Uint8Array(31)), /requires 32 bytes/);

    const hashRecreated = BlockHash.fromBytes(hashZero.toBytes());
    assert.equal(hashZero.equals(hashRecreated), true);

    hashZero.dispose();

    console.log("✓ BlockHash tests passed");
    console.log();
}

/**
 * BlockHeader Test Suite
 */
function testBlockHeader(): void {
    console.log("=== Testing BlockHeader ===");

    const headerHex = "00c06a24d2ff376fa4cab6d28ac75ea4a38a675ac1cafa668cb601000000000000000000755926c6aa5c931b0b054c370746824f8935b35bd27172f1a36c07749b5cd60b9aa77869a1fc01171794522b";
    // FIXED: Ensured execution bytes are cross-compatible pure Uint8Arrays
    const headerBytes = Uint8Array.from(Buffer.from(headerHex, "hex"));
    const header = BlockHeader.fromBytes(headerBytes);

    assert.equal(header.blockHash.toString(), "00000000000000000000b1a3614f5b43589011f52dcf2c67c9e66554823ed233");
    assert.equal(header.prevHash.toString(), "00000000000000000001b68c66facac15a678aa3a45ec78ad2b6caa46f37ffd2");
    assert.equal(Math.floor(header.timestamp.getTime() / 1000), 1769514906);
    assert.equal(header.bits, 386006177);
    assert.equal(header.version, 610975744);
    assert.equal(header.nonce, 726832151);

    assert.deepEqual(header.toBytes(), headerBytes);
    assert.equal(header.toString(), "BlockHeader hash=00000000000000000000b1a3614f5b43589011f52dcf2c67c9e66554823ed233");

    assert.throws(() => BlockHeader.fromBytes(new Uint8Array(79)));
    assert.throws(() => BlockHeader.fromBytes(new Uint8Array(81)));
    assert.throws(() => BlockHeader.fromBytes(new Uint8Array(0)));

    header.dispose();

    console.log("✓ BlockHeader tests passed");
    console.log();
}

/**
 * Block Serialization & Instantiation Suite
 */
function testBlockClass(genesisBlockBytes: Uint8Array): void {
    console.log("=== Testing Block ===");

    const block = Block.fromBytes(genesisBlockBytes);

    assert.equal(block.transactions.length, 1);
    assert.equal(block.blockHeader.blockHash.toString(), block.blockHash.toString());
    assert.equal(block.toString(), `<Block hash=${block.blockHash.toString()} txs=1>`);

    console.log("✓ Block tests passed");
    console.log();
}
/**
 * Consensus Rules Block Validation Suite
 */
function testBlockCheck(genesisBlockBytes: Uint8Array): void {
    console.log("=== Testing Block Check ===");

    const block = Block.fromBytes(genesisBlockBytes);
    const consensusParams = new ChainParameters(ChainType.REGTEST).consensusParams;

    const state = block.check(consensusParams);
    assert.equal(state.validationMode, ValidationMode.VALID);

    assert.equal(BlockCheckFlags.ALL, BlockCheckFlags.POW | BlockCheckFlags.MERKLE);

    console.log("✓ Block Check tests passed");
    console.log();
}

/**
 * Mutated Merkle Root Toggling Suite
 */
function testBlockCheckInvalidMerkle(genesisBlockBytes: Uint8Array): void {
    console.log("=== Testing Block Check Invalid Merkle ===");

    const consensusParams = new ChainParameters(ChainType.REGTEST).consensusParams;
    const raw = new Uint8Array(genesisBlockBytes);
    
    raw[36] ^= 0xFF; 
    const badBlock = Block.fromBytes(raw);

    const stateInvalid = badBlock.check(consensusParams, BlockCheckFlags.MERKLE);
    assert.equal(stateInvalid.validationMode, ValidationMode.INVALID);
    assert.equal(stateInvalid.blockValidationResult, BlockValidationResult.MUTATED);

    const stateValid = badBlock.check(consensusParams, BlockCheckFlags.BASE);
    assert.equal(stateValid.validationMode, ValidationMode.VALID);

    console.log("✓ Block Check Invalid Merkle tests passed");
    console.log();
}

/**
 * Historical Block Undo Context Suite
 */
function testBlockUndo(chainmanRegtest: ChainstateManager): void {
    console.log("=== Testing Block Undo ===");

    const idx = chainmanRegtest.getActiveChain().blockTreeEntries.get(202);
    const undo = chainmanRegtest.blockSpentOutputs.get(idx);
    const transactions = undo.transactions;
    
    assert.equal(transactions.length, 20);
    for (const tx of transactions) {
        assert.ok(tx instanceof TransactionSpentOutputs);
    }

    assert.equal(undo.toString(), "<BlockSpentOutputs txs=20>");

    console.log("✓ Block Undo tests passed");
    console.log();
}

/**
 * Master Test Orchestrator
 */
function testBlock(chainmanRegtest: ChainstateManager, genesisBlockBytes: Uint8Array): void {
    try {
        testBlockTreeEntry(chainmanRegtest);
        testBlockTreeEntryGetAncestor(chainmanRegtest);
        testBlockTreeEntryGetAncestorFork(chainmanRegtest);
        testBlockHash();
        testBlockHeader();
        testBlockClass(genesisBlockBytes);
        testBlockCheck(genesisBlockBytes);
        testBlockCheckInvalidMerkle(genesisBlockBytes);
        testBlockUndo(chainmanRegtest);
        console.log("ALL TESTS PASSED");
    } catch (err) {
        console.error();
        console.error("TEST FAILED");
        console.error(err);
        process.exit(1);
    }
}

// ============================================================================
// EXECUTION BLOCK
// ============================================================================

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "chainman-test-"));
const blocksDir = path.join(tempDir, "blocks");
fs.mkdirSync(blocksDir, { recursive: true });

try {
    const opts = new ContextOptions();
    opts.set_chainparams(new ChainParameters(ChainType.REGTEST));

    const context = new Context(opts);

    const cmOpts = new ChainstateManagerOptions(
        context,
        tempDir,
        blocksDir
    );

    const chainman = new ChainstateManager(cmOpts);

    const blocksFile = path.join(__dirname, "data", "regtest", "blocks.txt");
    if (!fs.existsSync(blocksFile)) {
        throw new Error(`Missing expected test fixture file at: ${blocksFile}`);
    }

    console.log("Ingesting block chain test fixtures into engine...");
    const fileContent = fs.readFileSync(blocksFile, "utf8");
    const hexBlocks = fileContent.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

    for (const hex of hexBlocks) {
        const blockBytes = Uint8Array.from(Buffer.from(hex, "hex"));
        const block = Block.fromBytes(blockBytes);
        chainman.processBlock(block);
    }
    console.log(`Successfully indexed ${hexBlocks.length} blocks.\n`);

    // FIXED: Extracted as a pure cross-runtime native Uint8Array to satisfy strict assertions
    const genesisBlockBytes = Uint8Array.from(Buffer.from(GENESIS_BLOCK_HEX, "hex"));

    // Run the validation testing suite
    testBlock(chainman, genesisBlockBytes);

    if (typeof (chainman as any).dispose === "function") (chainman as any).dispose();
    if (typeof (context as any).dispose === "function") (context as any).dispose();

} finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
}