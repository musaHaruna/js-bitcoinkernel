import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { Transaction } from "../src/js-kernel/transaction.js";
import { ValidationMode } from "../src/js-kernel/block.js";
import { TxValidationResult } from "../src/js-kernel/tx-validation.js";

const SAMPLE_TX_HEX = "010000000320ad43984a790ca5a964904686b8e17732ccf9d0d5f679f7675623e971890385010000006b483045022100ad4777681f360e7791d3f866006415b6511723abbd75a318c5a91c951122c03602202a5eadc8054dbf1d269a6b17c116bac42b4c110da693f2226a0ef7fcd659395f0121026de67c5ce81b6adf330ac6201a7339efa5503a49f1bf95a88c89e214a62dcac8feffffffcbe2144e8fad7e1e1cc270f7dbc75f64f961a5279696160e4a108bd84ebe5ca0ba0200006a47304402204eeb81c63817e960e7854393f64b212480d2dfc0be583601b0702251e5a63de002200b2f37228768a0547ea037ac47e2d948c411c4fdd2ab74f6f21d6805a5a380fb01210364492cd3a5a9365dcb46bb509381ec002052ee8df5a89d6192747c6eb15fe32dfeffffff08ef4370f8930e28110fc172475e42adf9bb0c11cf764e2c61b536a314946f76010000006a47304402203455335b54e31b0dcb82340e8ad7a4ef583da1923e0d2a9628d5728f5258c058022030d0134897a2f8d7303d3abfdd6a08c593acbb0b91d43287af4ac909e7ebf7bd01210267a46854fe5c0ac26049eb48b95cbfce7cc1e3f6baf540f3c8d3b80fda65bc53feffffff0240420f00000000001976a9140542e43d197f1a2e525d02e95ab70a2517e625a888acf9430f00000000001976a914b6bc75e3a6e8be9a86caab8cbeebb640d7468d4388ac9f680600";
const sha256d = (bytes: Uint8Array): Buffer => {
  const first = createHash("sha256").update(bytes).digest();
  return createHash("sha256").update(first).digest();
};
const makeInput = (hashByte: string, output: string, sequence: string) =>
  hashByte.repeat(32) + output + "00" + sequence;
const output = "00f2052a01000000" + "160014" + "00".repeat(20);
const witnessInput = makeInput("aa", "00000000", "ffffffff");
const noWitnessHex = "03000000" + "01" + witnessInput + "01" + output + "00000000";
const witnessItems = [Buffer.alloc(71, 0x30), Buffer.alloc(33, 0x02)];
const witnessBytes = witnessItems.map(item => Uint8Array.from(item));
const witnessHex = "02" + witnessItems.map(item => item.length.toString(16).padStart(2, "0") + item.toString("hex")).join("");
const witnessTransaction = Buffer.from("03000000000101" + witnessInput + "01" + output + witnessHex + "00000000", "hex");

/**
 * Core Transaction Engine Test Suite
 */
function testTransaction(): void {

  const serTx = Buffer.from(SAMPLE_TX_HEX, "hex");
  using tx = new Transaction(serTx);

  assert.deepEqual(tx.toBytes(), Uint8Array.from(serTx));

  // Txid tests

  using txid = tx.txid;
  assert.equal(
    txid.toString(),
    "9ababd66265528586981359efbf6b4c303430503e90d811c24d431cfd3994c55"
  );
  assert.equal(txid.equals(txid), true);
  assert.equal(txid.equals(null), false);

  // TransactionInput & TransactionOutPoint

  const inputsExpectedResults = [
    [1, "85038971e9235667f779f6d5d0f9cc3277e1b886469064a9a50c794a9843ad20"],
    [698, "a05cbe4ed88b104a0e16969627a561f9645fc7dbf770c21c1e7ead8f4e14e2cb"],
    [1, "766f9414a336b5612c4e76cf110cbbf9ad425e4772c10f11280e93f87043ef08"],
  ] as const;

  assert.equal(tx.inputs.length, inputsExpectedResults.length);

  for (let i = 0; i < tx.inputs.length; i++) {
    using input = tx.inputs.get(i);
    const [expIdx, expTxid] = inputsExpectedResults[i];
    assert.equal(input.outPoint.index, expIdx);
    assert.equal(input.outPoint.txid.toString(), expTxid);
  }

  // Checking formatted output representations
  using firstInput = tx.inputs.get(0);
  assert.equal(
    firstInput.outPoint.toString(),
    "txid=85038971e9235667f779f6d5d0f9cc3277e1b886469064a9a50c794a9843ad20 index=1"
  );
  assert.equal(
    firstInput.toString(),
    "txid=85038971e9235667f779f6d5d0f9cc3277e1b886469064a9a50c794a9843ad20 index=1"
  );

  // TransactionOutput

  const outputsExpectedResults = [
    [1000000n, "76a9140542e43d197f1a2e525d02e95ab70a2517e625a888ac"],
    [1000441n, "76a914b6bc75e3a6e8be9a86caab8cbeebb640d7468d4388ac"],
  ] as const;

  assert.equal(tx.outputs.length, outputsExpectedResults.length);

  for (let i = 0; i < tx.outputs.length; i++) {
    using output = tx.outputs.get(i);
    const [expAmount, expSpk] = outputsExpectedResults[i];
    assert.equal(output.amount, expAmount);

    const actualSpkHex = Buffer.from(output.scriptPubkey.toBytes()).toString("hex");
    assert.equal(actualSpkHex, expSpk);
  }

  using firstOutput = tx.outputs.get(0);
  assert.equal(firstOutput.toString(), "<TransactionOutput amount=1000000 spk_len=25>");
  assert.equal(
    tx.toString(),
    "txid=9ababd66265528586981359efbf6b4c303430503e90d811c24d431cfd3994c55 ins=3 outs=2"
  );

  // Locktime and basic sequence properties
  assert.equal(tx.locktime, 0x0006689F);

  for (let i = 0; i < tx.inputs.length; i++) {
    assert.equal(tx.inputs.get(i).sequence, 0xFFFFFFFE);
  }

}

/**
 * Multi-input Sequence Reading Layout Verification
 */
function testTransactionInputSequencePerInput(): void {

  function makeInput(prevByte: string, vout: string, seq: string): string {
    return prevByte.repeat(32) + vout + "00" + seq;
  }

  const inputsHex =
    makeInput("aa", "00000000", "ffffffff") +
        makeInput("bb", "01000000", "feffffff") +
        makeInput("cc", "02000000", "10000000");

  const outputHex = "00f2052a01000000" + "1976a914" + "00".repeat(20) + "88ac";
  const raw = "02000000" + "03" + inputsHex + "01" + outputHex + "00000000";

  using tx = new Transaction(Buffer.from(raw, "hex"));
  const expectedSequences = [0xFFFFFFFF, 0xFFFFFFFE, 0x00000010];

  for (let i = 0; i < tx.inputs.length; i++) {
    assert.equal(tx.inputs.get(i).sequence, expectedSequences[i]);
  }

}

/**
 * Lifecycle Management & Detached State Verification
 */
function testTxidDetachLifecycle(): void {

  using tx = new Transaction(Buffer.from(SAMPLE_TX_HEX, "hex"));
  using txid = tx.txid;
  const expectedBytes = txid.toBytes();


  txid.detach();
  tx.dispose();
  assert.deepEqual(txid.toBytes(), expectedBytes);
  txid.dispose();

}

function testWitnessTransactionProperties(): void {
  using transaction = new Transaction(witnessTransaction);
  assert.equal(transaction.version, 3);
  assert.equal(transaction.hasWitness, true);
  assert.deepEqual(transaction.wtxid.toBytes(), Uint8Array.from(sha256d(witnessTransaction)));
  assert.deepEqual(transaction.txid.toBytes(), Uint8Array.from(sha256d(Buffer.from(noWitnessHex, "hex"))));

  using input = transaction.inputs.get(0);
  assert.deepEqual(input.scriptSig, new Uint8Array());
  using witness = input.witnessStack;
  assert.equal(witness.length, witnessItems.length);
  assert.deepEqual(witness.get(-1), witnessBytes[1]);
  assert.deepEqual([...witness], witnessBytes);

  using state = transaction.check();
  assert.equal(state.validationMode, ValidationMode.VALID);
  assert.equal(state.txValidationResult, TxValidationResult.UNSET);
}

function testContextFreeValidationFailure(): void {
  const duplicate = makeInput("aa", "00000000", "ffffffff");
  using transaction = new Transaction(Buffer.from("0200000002" + duplicate + duplicate + "01" + output + "00000000", "hex"));
  using state = transaction.check();

  assert.equal(state.validationMode, ValidationMode.INVALID);
  assert.equal(state.txValidationResult, TxValidationResult.CONSENSUS);
}

function testDetachedWitnessAndWtxid(): void {
  using transaction = new Transaction(witnessTransaction);
  using witness = transaction.inputs.get(0).witnessStack.detach();
  using wtxid = transaction.wtxid.detach();
  const expected = wtxid.toBytes();

  transaction.dispose();
  assert.deepEqual([...witness], witnessBytes);
  assert.deepEqual(wtxid.toBytes(), expected);
}
test("Transaction", testTransaction);

test("Transaction Input Sequence Per Input", testTransactionInputSequencePerInput);

test("Txid Detach Lifecycle", testTxidDetachLifecycle);

test("Witness Transaction Properties", testWitnessTransactionProperties);

test("Context-Free Transaction Validation Failure", testContextFreeValidationFailure);

test("Detached Witness and Wtxid", testDetachedWitnessAndWtxid);
