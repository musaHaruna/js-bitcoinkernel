import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Block, ChainType, loadChainman } from '../../src/js-kernel/index.js';

export const regtestBlocks = readFileSync(new URL('../data/regtest/blocks.txt', import.meta.url), 'utf8')
  .trim().split(/\r?\n/).map(hex => Buffer.from(hex, 'hex'));

export function temporaryDirectory() {
  const path = mkdtempSync(join(tmpdir(), 'js-bitcoinkernel-'));
  return { path, [Symbol.dispose]() { rmSync(path, { recursive: true, force: true }); } };
}

export function regtestFixture() {
  const directory = temporaryDirectory();
  try {
    const chainman = loadChainman(directory.path, ChainType.REGTEST);
    try {
      for (const bytes of regtestBlocks) {
        using block = Block.fromBytes(bytes);
        assert.equal(chainman.processBlock(block), true);
      }
    } catch (error) {
      chainman.dispose();
      throw error;
    }
    return {
      chainman,
      [Symbol.dispose]() {
        try { chainman.dispose(); } finally { directory[Symbol.dispose](); }
      }
    };
  } catch (error) {
    directory[Symbol.dispose]();
    throw error;
  }
}

export const forkBlockBytes = Buffer.from("0000002006226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f295badc0bdd9a2bc0955d12f337491eae4c87ba4660078c0156310284d47c6ff9a242d66ffff7f200200000001020000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff025100ffffffff0200f2052a010000001600141409745405c4e8310a875bcd602db6b9b3dc0cf90000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf90120000000000000000000000000000000000000000000000000000000000000000000000000", "hex");
