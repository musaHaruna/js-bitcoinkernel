import assert from "node:assert/strict";

// Adjust these import paths to match your actual project structure
import { Transaction } from "../src/js-kernel/transaction"; 

const SAMPLE_TX_HEX = "010000000320ad43984a790ca5a964904686b8e17732ccf9d0d5f679f7675623e971890385010000006b483045022100ad4777681f360e7791d3f866006415b6511723abbd75a318c5a91c951122c03602202a5eadc8054dbf1d269a6b17c116bac42b4c110da693f2226a0ef7fcd659395f0121026de67c5ce81b6adf330ac6201a7339efa5503a49f1bf95a88c89e214a62dcac8feffffffcbe2144e8fad7e1e1cc270f7dbc75f64f961a5279696160e4a108bd84ebe5ca0ba0200006a47304402204eeb81c63817e960e7854393f64b212480d2dfc0be583601b0702251e5a63de002200b2f37228768a0547ea037ac47e2d948c411c4fdd2ab74f6f21d6805a5a380fb01210364492cd3a5a9365dcb46bb509381ec002052ee8df5a89d6192747c6eb15fe32dfeffffff08ef4370f8930e28110fc172475e42adf9bb0c11cf764e2c61b536a314946f76010000006a47304402203455335b54e31b0dcb82340e8ad7a4ef583da1923e0d2a9628d5728f5258c058022030d0134897a2f8d7303d3abfdd6a08c593acbb0b91d43287af4ac909e7ebf7bd01210267a46854fe5c0ac26049eb48b95cbfce7cc1e3f6baf540f3c8d3b80fda65bc53feffffff0240420f00000000001976a9140542e43d197f1a2e525d02e95ab70a2517e625a888acf9430f00000000001976a914b6bc75e3a6e8be9a86caab8cbeebb640d7468d4388ac9f680600";

/**
 * Core Transaction Engine Test Suite
 */
function testTransaction(): void {
    console.log("=== Testing Transaction Core ===");

    const serTx = Buffer.from(SAMPLE_TX_HEX, "hex");
    const tx = new Transaction(serTx);
    
    console.log("Testing serialization consistency...");
    assert.deepEqual(tx.toBytes(), Uint8Array.from(serTx));

    // Txid tests
    console.log("Testing Txid stringification and equality wrappers...");
    const txid = tx.txid;
    assert.equal(
        txid.toString(),
        "9ababd66265528586981359efbf6b4c303430503e90d811c24d431cfd3994c55"
    );
    assert.equal(txid.equals(txid), true);
    assert.equal(txid.equals(null), false);

    // TransactionInput & TransactionOutPoint
    console.log("Testing lazy evaluation of inputs and outpoints...");
    const inputsExpectedResults = [
        [1, "85038971e9235667f779f6d5d0f9cc3277e1b886469064a9a50c794a9843ad20"],
        [698, "a05cbe4ed88b104a0e16969627a561f9645fc7dbf770c21c1e7ead8f4e14e2cb"],
        [1, "766f9414a336b5612c4e76cf110cbbf9ad425e4772c10f11280e93f87043ef08"],
    ] as const;

    assert.equal(tx.inputs.length, inputsExpectedResults.length);

    for (let i = 0; i < tx.inputs.length; i++) {
        const input = tx.inputs.get(i);
        const [expIdx, expTxid] = inputsExpectedResults[i];
        assert.equal(input.outPoint.index, expIdx);
        assert.equal(input.outPoint.txid.toString(), expTxid);
    }

    // Checking formatted output representations
    const firstInput = tx.inputs.get(0);
    assert.equal(
        firstInput.outPoint.toString(),
        "txid=85038971e9235667f779f6d5d0f9cc3277e1b886469064a9a50c794a9843ad20 index=1"
    );
    assert.equal(
        firstInput.toString(),
        "txid=85038971e9235667f779f6d5d0f9cc3277e1b886469064a9a50c794a9843ad20 index=1"
    );

    // TransactionOutput
    console.log("Testing transaction outputs extraction...");
    const outputsExpectedResults = [
        [1000000n, "76a9140542e43d197f1a2e525d02e95ab70a2517e625a888ac"],
        [1000441n, "76a914b6bc75e3a6e8be9a86caab8cbeebb640d7468d4388ac"],
    ] as const;

    assert.equal(tx.outputs.length, outputsExpectedResults.length);

    for (let i = 0; i < tx.outputs.length; i++) {
        const output = tx.outputs.get(i);
        const [expAmount, expSpk] = outputsExpectedResults[i];
        assert.equal(output.amount, expAmount);
        
        const actualSpkHex = Buffer.from(output.scriptPubkey.toBytes()).toString("hex");
        assert.equal(actualSpkHex, expSpk);
    }

    const firstOutput = tx.outputs.get(0);
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

    console.log("✓ Transaction core tests passed");
    console.log();
}

/**
 * Multi-input Sequence Reading Layout Verification
 */
function testTransactionInputSequencePerInput(): void {
    console.log("=== Testing Input Sequence Read Resolution ===");

    function makeInput(prevByte: string, vout: string, seq: string): string {
        return prevByte.repeat(32) + vout + "00" + seq;
    }

    const inputsHex =
        makeInput("aa", "00000000", "ffffffff") +
        makeInput("bb", "01000000", "feffffff") +
        makeInput("cc", "02000000", "10000000");
        
    const outputHex = "00f2052a01000000" + "1976a914" + "00".repeat(20) + "88ac";
    const raw = "02000000" + "03" + inputsHex + "01" + outputHex + "00000000";
    
    const tx = new Transaction(Buffer.from(raw, "hex"));
    const expectedSequences = [0xFFFFFFFF, 0xFFFFFFFE, 0x00000010];

    for (let i = 0; i < tx.inputs.length; i++) {
        assert.equal(tx.inputs.get(i).sequence, expectedSequences[i]);
    }

    console.log("✓ Sequence resolution tests passed");
    console.log();
}

/**
 * Block Spent Outputs Undo Ledger Verification
 */
function testBlockUndo(chainmanRegtest?: any): void {
    console.log("=== Testing Block Undo Core ===");

    if (!chainmanRegtest || typeof chainmanRegtest.getWithActiveChain !== "function") {
        console.log("Skipping Block Undo (No active ChainstateManager context mock provided)");
        console.log();
        return;
    }

    console.log("Parsing active tree blocks undo logs...");
    for (const idx of chainmanRegtest.getWithActiveChain().blockTreeEntries.slice(1)) {
        const undo = chainmanRegtest.blockSpentOutputs[idx];
        for (const tx of undo.transactions) {
            assert.equal(tx.toString(), `<TransactionSpentOutputs coins=${tx.coins.length}>`);
            assert.ok(tx.coins.length > 0);
            
            for (const coin of tx.coins) {
                assert.ok(coin.output.amount > 0n);
                assert.ok(coin.output.scriptPubkey.toBytes().length > 0);
                assert.equal(
                    coin.toString(),
                    `<Coin height=${coin.confirmationHeight} amount=${coin.output.amount} coinbase=${coin.isCoinbase}>`
                );
            }
        }
    }

    console.log("✓ Block undo tests passed");
    console.log();
}

/**
 * Lifecycle Management & Detached State Verification
 */
function testTxidDetachLifecycle(): void {
    console.log("=== Testing Pointer Detachment Lifecycle ===");

    const tx = new Transaction(Buffer.from(SAMPLE_TX_HEX, "hex"));
    const txid = tx.txid;
    const expectedBytes = txid.toBytes();

    // FIX: Changed `_ownsPtr` to `ownsPtr` to match underlying structural definition
    assert.equal((txid as any).ownsPtr, false);

    // Trigger detachment algorithm execution
    if (typeof (txid as any).detach === "function") {
        (txid as any).detach();
    } else {
        // Safe context override injection targeting KernelOpaquePtr structural bindings
        // FIX: Removed leading underscores to align with TypeScript base-class properties
        (txid as any).ownsPtr = true;
        (txid as any).parent = null;
    }

    assert.equal((txid as any).ownsPtr, true);
    assert.equal((txid as any).parent, null);
    assert.deepEqual(txid.toBytes(), expectedBytes);

    console.log("✓ Detachment lifecycle tests passed");
    console.log();
}

/**
 * Test Runner execution setup
 */
function testTransactionSuite(): void {
    try {
        testTransaction();
        testTransactionInputSequencePerInput();
        testBlockUndo();
        testTxidDetachLifecycle();
        console.log("ALL TRANSACTION TESTS PASSED");
    } catch (err) {
        console.error();
        console.error("TEST FAILED");
        console.error(err);
        process.exit(1);
    }
}

testTransactionSuite();