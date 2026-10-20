import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import {
  Block, BlockCheckFlags, BlockHash, BlockHeader, BlockTreeEntry, BlockValidationState, ChainParameters, ChainType,
  Context, ContextOptions, ChainstateManager, ChainstateManagerOptions,
  LoggingConnection, LoggingOptions, LogCategory, LogLevel,
  enable_log_category, disable_log_category, set_log_level_category, logging_set_options,
  NotificationInterfaceCallbacks, ValidationInterfaceCallbacks, ValidationMode, BlockValidationResult,
  ScriptPubkey, PrecomputedTransactionData, ScriptVerificationFlags, ScriptVerifyException, ScriptVerifyStatus,
  Transaction, TransactionOutput, loadChainman
} from '../src/js-kernel/index.js';
import { decodeText } from '../src/js-kernel/util/callbacks.js';
import { regtestBlocks, regtestFixture, temporaryDirectory, forkBlockBytes } from './util/fixtures.js';

// One input with an empty scriptSig and one output. Script tests use OP_TRUE/OP_FALSE.
const transactionBytes = Buffer.from('0100000001' + '00'.repeat(32) + '0000000000ffffffff010100000000000000015100000000', 'hex');

for (const [name, bytes] of [['coinbase', regtestBlocks[0]], ['many transactions', regtestBlocks[201]]] as const) {
  test(`complete block serialization: ${name}`, () => {
    using block = Block.fromBytes(bytes);
    assert.deepEqual(Buffer.from(block.toBytes()), bytes);
    using copy = block.copy();
    block.dispose();
    assert.deepEqual(Buffer.from(copy.toBytes()), bytes);
  });
}

test('malformed native objects throw descriptive errors instead of wrapping NULL', () => {
  assert.throws(() => Block.fromBytes(new Uint8Array([1])), /Failed to create Block/);
  assert.throws(() => new Transaction(new Uint8Array([1])), /Failed to parse/);
  assert.throws(() => BlockHeader.fromBytes(new Uint8Array(79)), /80 bytes/);
  assert.throws(() => BlockHash.fromBytes(new Uint8Array(31)), /32 bytes/);
});

test('borrowed descendants reject access, copy and detach after owner disposal', () => {
  using tx = new Transaction(transactionBytes);
  using input = tx.inputs.get(0);
  using txid = input.outPoint.txid;
  const outputs = tx.outputs;
  assert.equal(outputs.length, 1); // Prime the cached length.
  tx.dispose();
  assert.equal(txid.isDisposed(), true);
  for (const action of [() => txid.toBytes(), () => txid.copy(), () => txid.detach(), () => outputs.length, () => outputs.get(0), () => tx.detach()]) {
    assert.throws(action, /disposed/);
  }
});

test('disposing a borrowed view invalidates only that view and its children', () => {
  using tx = new Transaction(transactionBytes);
  using output = tx.outputs.get(0);
  using script = output.scriptPubkey;
  output.dispose();
  output.dispose();
  assert.throws(() => script.toBytes(), /disposed/);
  assert.equal(tx.outputs.get(0).amount, 1n);
});

test('detached and copied children survive their original owner', () => {
  using tx = new Transaction(transactionBytes);
  using output = tx.outputs.get(0).detach();
  using txid = tx.txid.copy();
  const expected = txid.toString();
  tx.dispose();
  assert.equal(output.amount, 1n);
  assert.equal(txid.toString(), expected);
});

test('detaching a parent invalidates existing descendants into its old storage', () => {
  using tx = new Transaction(transactionBytes);
  using output = tx.outputs.get(0);
  using oldScript = output.scriptPubkey;
  output.detach();
  tx.dispose();
  assert.throws(() => oldScript.toBytes(), /disposed/);
  assert.equal(output.scriptPubkey.toString(), '51');
});

test('public sequence access validates indices even before length has been read', () => {
  using block = Block.fromBytes(regtestBlocks[0]);
  for (const index of [-1, 1, NaN, Infinity, 0.5]) {
    assert.throws(() => block.transactions.getItem(index), RangeError);
  }
  for (const index of [NaN, Infinity, 0.5]) {
    assert.throws(() => block.transactions.get(index), RangeError);
  }
});

test('precomputed data can be copied and used after the original is disposed', () => {
  using tx = new Transaction(transactionBytes);
  using script = new ScriptPubkey(Buffer.from('51', 'hex'));
  using output = new TransactionOutput(script, 1n);
  using cache = new PrecomputedTransactionData(tx, [output]);
  using copy = cache.copy();
  cache.dispose();
  assert.equal(script.verify(1n, tx, copy, 0, ScriptVerificationFlags.ALL), true);
});

test('script and cache validation prevent native assertions', () => {
  using tx = new Transaction(transactionBytes);
  using script = new ScriptPubkey(Buffer.from('51', 'hex'));
  using output = new TransactionOutput(script, 1n);
  assert.throws(() => new PrecomputedTransactionData(tx, [output, output]), RangeError);
  for (const index of [-1, 1, NaN, Infinity, 0.5]) {
    assert.throws(() => script.verify(1n, tx, null, index, ScriptVerificationFlags.NONE), RangeError);
  }
  for (const flags of [-1, 2, 2 ** 32, NaN, 0.5]) {
    assert.throws(() => script.verify(1n, tx, null, 0, flags), RangeError);
  }
  assert.throws(() => script.verify(1n, tx, null, 0, ScriptVerificationFlags.WITNESS),
    (error: unknown) => error instanceof ScriptVerifyException && error.status === ScriptVerifyStatus.ERROR_INVALID_FLAGS_COMBINATION);
  assert.throws(() => script.verify(1n, tx, null, 0, ScriptVerificationFlags.ALL),
    (error: unknown) => error instanceof ScriptVerifyException && error.status === ScriptVerifyStatus.ERROR_SPENT_OUTPUTS_REQUIRED);
  using falseScript = new ScriptPubkey(Buffer.from('00', 'hex'));
  assert.equal(falseScript.verify(1n, tx, null, 0, ScriptVerificationFlags.NONE), false);
});

test('amounts are exact signed 64-bit integers', () => {
  using script = new ScriptPubkey(Buffer.from('51', 'hex'));
  for (const amount of [Number.MAX_SAFE_INTEGER + 1, 1.5, NaN, 1n << 63n, -(1n << 63n) - 1n]) {
    assert.throws(() => new TransactionOutput(script, amount), RangeError);
  }
  using output = new TransactionOutput(script, (1n << 63n) - 1n);
  assert.equal(output.amount, (1n << 63n) - 1n);
});

test('enum values and block flags are checked before entering C', () => {
  for (const value of [-1, 5, NaN, 0.5, 256]) assert.throws(() => new ChainParameters(value), RangeError);
  assert.throws(() => enable_log_category(255 as LogCategory), RangeError);
  assert.throws(() => disable_log_category(NaN), RangeError);
  assert.throws(() => set_log_level_category(LogCategory.ALL, 255 as LogLevel), RangeError);
  using block = Block.fromBytes(regtestBlocks[0]);
  using params = new ChainParameters(ChainType.REGTEST);
  assert.throws(() => block.check(params.consensusParams, 4 as BlockCheckFlags), RangeError);
});

test('missing map keys, genesis predecessor and header-only blocks are handled safely', () => {
  using directory = temporaryDirectory();
  using cm = loadChainman(directory.path);
  using genesis = cm.bestEntry;
  assert.equal(genesis.previous, null);
  using missing = BlockHash.fromBytes(new Uint8Array(32));
  assert.equal(cm.blockTreeEntries.has(missing), false);
  assert.throws(() => cm.blockTreeEntries.get(missing), /not found/);
  assert.equal(cm.blockSpentOutputs.has(genesis), false);
  assert.throws(() => cm.blockSpentOutputs.get(genesis), RangeError);
  using header = BlockHeader.fromBytes(regtestBlocks[0].subarray(0, 80));
  using state = cm.processBlockHeader(header);
  assert.equal(state.validationMode, ValidationMode.VALID);
  assert.equal(cm.bestEntry.height, 1);
  assert.equal(cm.getActiveChain().height, 0);
  assert.equal(cm.blocks.has(cm.bestEntry), false);
  assert.throws(() => cm.blocks.get(cm.bestEntry), /Error reading/);
  assert.equal(cm.blockSpentOutputs.has(cm.bestEntry), false);
  assert.throws(() => cm.blockSpentOutputs.get(cm.bestEntry), /Error reading/);
  assert.equal(cm.importBlocks([]), true);
  cm.dispose();
  assert.throws(() => genesis.height, /disposed/);
});

test('invalid header returns its owned validation state', () => {
  using directory = temporaryDirectory();
  using cm = loadChainman(directory.path);
  const bytes = Buffer.from(regtestBlocks[0].subarray(0, 80));
  bytes.fill(0, 72, 76); // Impossible difficulty target.
  using header = BlockHeader.fromBytes(bytes);
  using state = cm.processBlockHeader(header);
  assert.equal(state.validationMode, ValidationMode.INVALID);
  assert.equal(state.blockValidationResult, BlockValidationResult.INVALID_HEADER);
  assert.equal(cm.bestEntry.height, 0);
});

test('regtest undo contains actual spent coins and supports negative indexing', () => {
  using fixture = regtestFixture();
  using entry = fixture.chainman.getActiveChain().blockTreeEntries.get(202);
  using undo = fixture.chainman.blockSpentOutputs.get(entry);
  assert.equal(undo.transactions.length, 20);
  let count = 0;
  for (const spent of undo.transactions) {
    assert.ok(spent.coins.length > 0);
    using last = spent.coins.get(-1);
    assert.equal(last.output.amount, spent.coins.get(spent.coins.length - 1).output.amount);
    for (const coin of spent.coins) {
      count++;
      assert.ok(coin.output.amount > 0n);
      assert.ok(coin.output.scriptPubkey.toBytes().length > 0);
      assert.ok(coin.confirmationHeight < entry.height);
    }
  }
  assert.ok(count >= 20);
  assert.throws(() => undo.transactions.getItem(NaN), RangeError);
  using coin = undo.transactions.get(0).coins.get(0);
  undo.dispose();
  assert.throws(() => coin.output, /disposed/);
});

test('persisted chainstate reopens and duplicate blocks are not new', () => {
  using directory = temporaryDirectory();
  {
    using cm = loadChainman(directory.path);
    using block = Block.fromBytes(regtestBlocks[0]);
    assert.equal(cm.processBlock(block), true);
  }
  using reopened = loadChainman(directory.path);
  assert.equal(reopened.getActiveChain().height, 1);
  using block = Block.fromBytes(regtestBlocks[0]);
  assert.equal(reopened.processBlock(block), false);
});

test('signet context opens the correct genesis chain', () => {
  using directory = temporaryDirectory();
  using cm = loadChainman(directory.path, ChainType.SIGNET);
  assert.equal(cm.bestEntry.blockHash.toString(), '00000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6');
});

test('notification and validation callbacks survive disposed options and context copies', () => {
  using directory = temporaryDirectory();
  using options = new ContextOptions();
  using params = new ChainParameters(ChainType.REGTEST);
  options.set_chainparams(params);
  const heights: number[] = [];
  const states: BlockValidationState[] = [];
  const copies: BlockValidationState[] = [];
  const borrowedEntries: BlockTreeEntry[] = [];
  options.set_notifications(new NotificationInterfaceCallbacks({
    block_tip: (_state, _entry, progress) => { assert.ok(progress >= 0 && progress <= 1); },
    header_tip: (_state, height) => { heights.push(Number(height)); }
  }));
  options.set_validation_interface(new ValidationInterfaceCallbacks({
    block_checked: (_block, state) => { states.push(state); copies.push(state.copy()); },
    block_connected: (_block, entry) => { borrowedEntries.push(entry.getAncestor(0)); }
  }));
  using original = new Context(options);
  using context = original.copy();
  options.dispose();
  original.dispose();
  using cmOptions = new ChainstateManagerOptions(context, directory.path, directory.path + '/blocks');
  using cm = new ChainstateManager(cmOptions);
  cmOptions.dispose();
  context.dispose();
  try {
    using block = Block.fromBytes(regtestBlocks[0]);
    assert.equal(cm.processBlock(block), true);
    assert.ok(heights.includes(1));
    assert.ok(states.length > 0);
    for (const entry of borrowedEntries) assert.throws(() => entry.height, /disposed/);
    for (const state of states) assert.throws(() => state.validationMode, /disposed/);
    for (const copy of copies) assert.equal(copy.validationMode, ValidationMode.VALID);
  } finally {
    for (const copy of copies) copy.dispose();
  }
});

test('callback argument validation and instance identity', () => {
  assert.ok(new ValidationInterfaceCallbacks({}) instanceof ValidationInterfaceCallbacks);
  assert.throws(() => new ValidationInterfaceCallbacks({ block_checked: 1 } as never), TypeError);
  assert.throws(() => new NotificationInterfaceCallbacks({ progress: true } as never), TypeError);
});

test('callback registrations are released by the last native owner', () => {
  // Exceeds Koffi's 8192 registered callback slots if each options instance leaks.
  const callbacks = new ValidationInterfaceCallbacks({ block_checked: () => {} });
  for (let i = 0; i < 4200; i++) {
    using options = new ContextOptions();
    options.set_validation_interface(callbacks);
  }
});

test('length-delimited text preserves UTF-8 and embedded NUL without over-reading', () => {
  const bytes = Buffer.from('hé\0tailIGNORED');
  assert.equal(decodeText(bytes, Buffer.byteLength('hé\0tail')), 'hé\0tail');
  assert.equal(decodeText(null, 0), '');
});

test('native logging works after creation returns and disconnects deterministically', () => {
  const messages: string[] = [];
  logging_set_options(new LoggingOptions(false));
  set_log_level_category(LogCategory.ALL, LogLevel.DEBUG);
  enable_log_category(LogCategory.KERNEL);
  using connection = new LoggingConnection((message = '') => messages.push(message));
  assert.throws(() => Block.fromBytes(new Uint8Array([1])));
  assert.ok(messages.some(message => message.includes('Block decode failed.')));
  connection.dispose();
  const count = messages.length;
  assert.throws(() => Block.fromBytes(new Uint8Array([1])));
  assert.equal(messages.length, count);
  disable_log_category(LogCategory.KERNEL);
});

test('a longer regtest fork disconnects the old tip and connects the replacement', () => {
  using directory = temporaryDirectory();
  const disconnected: number[] = [];
  const connected: number[] = [];
  const callbacks = new ValidationInterfaceCallbacks({
    block_disconnected: (_block, entry) => disconnected.push(entry.height),
    block_connected: (_block, entry) => connected.push(entry.height)
  });
  using cm = loadChainman(directory.path, ChainType.REGTEST, callbacks);
  using mainBlock = Block.fromBytes(regtestBlocks[0]);
  using fork = Block.fromBytes(forkBlockBytes);
  cm.processBlock(mainBlock);
  cm.processBlock(fork);
  const bytes = Buffer.from(regtestBlocks[1]);
  using forkHash = fork.blockHash;
  bytes.set(forkHash.toBytes(), 4);
  // Regtest's 0x207fffff target makes this a small, deterministic local PoW search.
  const target = 0x7fffffn << (8n * 29n);
  let mined = false;
  for (let nonce = 0; nonce < 1000; nonce++) {
    bytes.writeUInt32LE(nonce, 76);
    const hash = createHash('sha256').update(createHash('sha256').update(bytes.subarray(0, 80)).digest()).digest();
    if (BigInt('0x' + hash.reverse().toString('hex')) <= target) { mined = true; break; }
  }
  assert.ok(mined);
  using forkTip = Block.fromBytes(bytes);
  assert.equal(cm.processBlock(forkTip), true);
  assert.deepEqual(disconnected, [1]);
  assert.deepEqual(connected, [0, 1, 1, 2]);
  using expectedHash = forkTip.blockHash;
  assert.ok(cm.getActiveChain().blockTreeEntries.get(2).blockHash.equals(expectedHash));
});

test('importBlocks marshals nonempty UTF-8 paths and native size_t lengths', () => {
  using directory = temporaryDirectory();
  using cm = loadChainman(directory.path + '/chain');
  const file = directory.path + '/blöcks.dat';
  const prefix = Buffer.alloc(8);
  prefix.set(Buffer.from('fabfb5da', 'hex'));
  prefix.writeUInt32LE(regtestBlocks[0].length, 4);
  writeFileSync(file, Buffer.concat([prefix, regtestBlocks[0]]));
  assert.equal(cm.importBlocks([file]), true);
  assert.equal(cm.getActiveChain().height, 1);
});
