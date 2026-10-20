import { test } from "node:test";
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

  // Emulates python's tempfile.TemporaryDirectory()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbk-test-"));

  try {

    using chainMan = loadChainman(tempDir, ChainType.REGTEST);

    const blocksPath = path.join(__dirname, "data", "regtest", "blocks.txt");

    const fileContent = fs.readFileSync(blocksPath, "utf8");
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);

    for (let i = 0; i < lines.length; i++) {
      const hexLine = lines[i].trim();
      const blockBytes = Uint8Array.from(Buffer.from(hexLine, "hex"));
      using block = Block.fromBytes(blockBytes);

      // Validate block submission passes consensus rules
      const processed = chainMan.processBlock(block);
      assert.equal(processed, true, `Block at sequence index ${i} failed processing rules`);
    }

    // Clean up internal context allocation handles if supported

  } finally {

    // Emulates temporary directory lifecycle cleanup hook
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

}
test("Chainman Regtest Initialization", testChainmanRegtestInitialization);
