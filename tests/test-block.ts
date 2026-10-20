import { regtestFixture, forkBlockBytes } from "./util/fixtures.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BlockHash,
  BlockHeader,
  Block,
  BlockTreeEntry,
  ValidationMode,
  BlockCheckFlags,
  BlockValidationResult,
} from "../src/js-kernel/block.js";
import { ChainParameters, ChainstateManager, ChainType } from "../src/js-kernel/chain.js";
import { TransactionSpentOutputs } from "../src/js-kernel/transaction.js";

/**
 * Deterministic Test Inputs & Constants
 */

const GENESIS_BLOCK_HEX = "0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4adae5494dffff7f20020000000101000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000";

/**
 * BlockTreeEntry Test Suite
 */
function testBlockTreeEntry(chainmanRegtest: ChainstateManager): void {
  using chain = chainmanRegtest.getActiveChain();

  using block0 = chain.blockTreeEntries.get(0);
  assert.equal(block0.height, 0);

  using block1 = chain.blockTreeEntries.get(1);
  assert.equal(block1.height, 1);

  assert.equal(block0.equals(block1), false, "block0 should not equal block1");
  assert.ok(block0 instanceof BlockTreeEntry);
  assert.ok(block1.previous?.equals(block0));
  using header = block1.blockHeader;
  using hash = header.blockHash;
  assert.equal(hash.toString(), block1.blockHash.toString());

  assert.equal(block0.equals(null as any), false);

  const genesisHashHex = block0.blockHash.toString();
  assert.equal(block0.toString(), `<BlockTreeEntry height=0 hash=${genesisHashHex}>`);
}

/**
 * BlockTreeEntry Ancestor Resolution Test Suite
 */
function testBlockTreeEntryGetAncestor(chainmanRegtest: ChainstateManager): void {
  using chain = chainmanRegtest.getActiveChain();
  using tip = chain.blockTreeEntries.get(chain.height);

  assert.ok(tip.getAncestor(0).equals(chain.blockTreeEntries.get(0)), "Ancestor 0 should match block 0");
  assert.ok(tip.getAncestor(tip.height).equals(tip), "Ancestor at tip height should be tip");
  assert.ok(tip.getAncestor(tip.height - 1).equals(chain.blockTreeEntries.get(tip.height - 1)), "Ancestor at tip-1 height should match");

  assert.throws(() => tip.getAncestor(tip.height + 1), /out of range/);
  assert.throws(() => tip.getAncestor(-1), /out of range/);
}

/**
 * Fork-Aware Ancestor Resolution Test Suite
 */
function testBlockTreeEntryGetAncestorFork(chainmanRegtest: ChainstateManager): void {
  using chain = chainmanRegtest.getActiveChain();
  using forkBlock = Block.fromBytes(forkBlockBytes);
  chainmanRegtest.processBlock(forkBlock);

  using forkHash = forkBlock.blockHash;
  using forkEntry = chainmanRegtest.blockTreeEntries.get(forkHash);
  assert.equal(forkEntry.height, 1);
  assert.equal(forkEntry.equals(chain.blockTreeEntries.get(1)), false);

  assert.ok(forkEntry.getAncestor(0).equals(chain.blockTreeEntries.get(0)), "Fork entry ancestor 0 should resolve to genesis");
  assert.ok(forkEntry.getAncestor(1).equals(forkEntry), "Fork entry ancestor at height 1 should be itself");
}

/**
 * BlockHash Test Suite
 */
function testBlockHash(): void {
  const zeroBytes = new Uint8Array(32).fill("0".charCodeAt(0));
  const oneBytes = new Uint8Array(32).fill("1".charCodeAt(0));

  using hashZero = BlockHash.fromBytes(zeroBytes);

  assert.equal(hashZero.equals(hashZero), true);
  using secondZero = BlockHash.fromBytes(zeroBytes);
  using hashOne = BlockHash.fromBytes(oneBytes);
  assert.equal(hashZero.equals(secondZero), true);
  assert.equal(hashZero.equals(hashOne), false);

  assert.deepEqual(hashZero.toBytes(), zeroBytes);
  assert.equal(hashZero.toString(), "3030303030303030303030303030303030303030303030303030303030303030");

  assert.equal(hashZero.equals(zeroBytes as any), false);

  assert.throws(() => BlockHash.fromBytes(new Uint8Array(31)), /requires 32 bytes/);

  using hashRecreated = BlockHash.fromBytes(hashZero.toBytes());
  assert.equal(hashZero.equals(hashRecreated), true);

  hashZero.dispose();
}

/**
 * BlockHeader Test Suite
 */
function testBlockHeader(): void {
  const headerHex = "00c06a24d2ff376fa4cab6d28ac75ea4a38a675ac1cafa668cb601000000000000000000755926c6aa5c931b0b054c370746824f8935b35bd27172f1a36c07749b5cd60b9aa77869a1fc01171794522b";

  const headerBytes = Uint8Array.from(Buffer.from(headerHex, "hex"));
  using header = BlockHeader.fromBytes(headerBytes);

  using hash = header.blockHash;
  assert.equal(hash.toString(), "00000000000000000000b1a3614f5b43589011f52dcf2c67c9e66554823ed233");
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
}

function testBlockHeaderMerkleRoot(): void {
  using block = Block.fromBytes(Uint8Array.from(Buffer.from(GENESIS_BLOCK_HEX, "hex")));
  using header = block.blockHeader;
  using transaction = block.transactions.get(0);
  using txid = transaction.txid;

  assert.deepEqual(header.merkleRoot, txid.toBytes());
}

/**
 * Block Serialization & Instantiation Suite
 */
function testBlockClass(genesisBlockBytes: Uint8Array): void {
  using block = Block.fromBytes(genesisBlockBytes);

  assert.equal(block.transactions.length, 1);
  using header = block.blockHeader;
  using headerHash = header.blockHash;
  using hash = block.blockHash;
  assert.equal(headerHash.toString(), hash.toString());
  assert.equal(block.toString(), `<Block hash=${hash.toString()} txs=1>`);
}
/**
 * Consensus Rules Block Validation Suite
 */
function testBlockCheck(genesisBlockBytes: Uint8Array): void {
  using block = Block.fromBytes(genesisBlockBytes);
  using params = new ChainParameters(ChainType.REGTEST);
  using consensusParams = params.consensusParams;

  using state = block.check(consensusParams);
  assert.equal(state.validationMode, ValidationMode.VALID);

  assert.equal(BlockCheckFlags.ALL, BlockCheckFlags.POW | BlockCheckFlags.MERKLE);
}

/**
 * Mutated Merkle Root Toggling Suite
 */
function testBlockCheckInvalidMerkle(genesisBlockBytes: Uint8Array): void {
  using params = new ChainParameters(ChainType.REGTEST);
  using consensusParams = params.consensusParams;
  const raw = new Uint8Array(genesisBlockBytes);

  raw[36] ^= 0xFF;
  using badBlock = Block.fromBytes(raw);

  using stateInvalid = badBlock.check(consensusParams, BlockCheckFlags.MERKLE);
  assert.equal(stateInvalid.validationMode, ValidationMode.INVALID);
  assert.equal(stateInvalid.blockValidationResult, BlockValidationResult.MUTATED);

  using stateValid = badBlock.check(consensusParams, BlockCheckFlags.BASE);
  assert.equal(stateValid.validationMode, ValidationMode.VALID);
}

/**
 * Historical Block Undo Context Suite
 */
function testBlockUndo(chainmanRegtest: ChainstateManager): void {
  using idx = chainmanRegtest.getActiveChain().blockTreeEntries.get(202);
  using undo = chainmanRegtest.blockSpentOutputs.get(idx);
  const transactions = undo.transactions;

  assert.equal(transactions.length, 20);
  for (const tx of transactions) {
    assert.ok(tx instanceof TransactionSpentOutputs);
  }

  assert.equal(undo.toString(), "<BlockSpentOutputs txs=20>");
}
test("Block Tree Entry", () => {
  using fixture = regtestFixture();
  testBlockTreeEntry(fixture.chainman);
});

test("Block Tree Entry Get Ancestor", () => {
  using fixture = regtestFixture();
  testBlockTreeEntryGetAncestor(fixture.chainman);
});

test("Block Tree Entry Get Ancestor Fork", () => {
  using fixture = regtestFixture();
  testBlockTreeEntryGetAncestorFork(fixture.chainman);
});

test("Block Hash", testBlockHash);

test("Block Header", testBlockHeader);

test("Block Header Merkle Root", testBlockHeaderMerkleRoot);

test("Block Class", () => {
  testBlockClass(Uint8Array.from(Buffer.from(GENESIS_BLOCK_HEX, "hex")));
});

test("Block Check", () => {
  testBlockCheck(Uint8Array.from(Buffer.from(GENESIS_BLOCK_HEX, "hex")));
});

test("Block Check Invalid Merkle", () => {
  testBlockCheckInvalidMerkle(Uint8Array.from(Buffer.from(GENESIS_BLOCK_HEX, "hex")));
});

test("Block Undo", () => {
  using fixture = regtestFixture();
  testBlockUndo(fixture.chainman);
});
