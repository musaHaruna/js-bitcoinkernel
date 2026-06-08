import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { Block} from "../src/js-kernel/block.js";
import { ChainType } from "../src/js-kernel/init.js";
import { loadChainman } from "../src/js-kernel/init.js";

// Handle ESM resolution for relative data pathing
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ChainstateManager Regtest Fixture & Block Processing Test Suite
 */
function testChainmanRegtestInitialization(): void {
    console.log("=== Testing ChainstateManager Regtest Setup ===");

    console.log("Creating temporary directory...");
    // Emulates python's tempfile.TemporaryDirectory()
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbk-test-"));

        try {
            console.log(`Initializing ChainstateManager in: ${tempDir}`);
            const chainMan = loadChainman(tempDir, ChainType.REGTEST);

        const blocksPath = path.join(__dirname, "data", "regtest", "blocks.txt");
        console.log(`Loading verification blocks from: ${blocksPath}`);
        
        const fileContent = fs.readFileSync(blocksPath, "utf8");
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);

        console.log(`Processing ${lines.length} sequential blocks...`);
        for (let i = 0; i < lines.length; i++) {
            const hexLine = lines[i].trim();
            const blockBytes = Uint8Array.from(Buffer.from(hexLine, "hex"));
            const block = Block.fromBytes(blockBytes);
            
            // Validate block submission passes consensus rules
            const processed = chainMan.processBlock(block);
            assert.equal(processed, true, `Block at sequence index ${i} failed processing rules`);
        }

        console.log("✓ All regtest blocks successfully synced onto temporary chainstate");
        
        // Clean up internal context allocation handles if supported
        if (typeof (chainMan as any).dispose === "function") {
            (chainMan as any).dispose();
        }

    } finally {
        console.log("Cleaning up temporary directory...");
        // Emulates temporary directory lifecycle cleanup hook
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    console.log("✓ ChainstateManager environment test passed");
    console.log();
}

/**
 * Test Runner
 *
 * Executes all test suites in sequence.
 * Exits with error code 1 if any assertion fails.
 */
function testFixtureSuite(): void {
    try {
        testChainmanRegtestInitialization();
        console.log("ALL TESTS PASSED");
    } catch (err) {
        console.error();
        console.error("TEST FAILED");
        console.error(err);
        process.exit(1);
    }
}

testFixtureSuite();
