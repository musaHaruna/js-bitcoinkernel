import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { assertCleanBitcoinSource, bitcoinCommit, root, sha256 } from './kernel-source.mjs';

const commit = bitcoinCommit();
assertCleanBitcoinSource();
const targets = {
  'darwin-universal': { platform: 'darwin', arch: 'universal', filename: 'libbitcoinkernel.dylib' },
  'linux-arm64': { platform: 'linux', arch: 'arm64', filename: 'libbitcoinkernel.so' },
  'linux-x64': { platform: 'linux', arch: 'x64', filename: 'libbitcoinkernel.so' },
};
for (const [id, target] of Object.entries(targets)) {
  const directory = join(root, 'src/js-kernel/binaries', id);
  if (!existsSync(directory)) throw new Error(`Missing packaged target ${id}. Build it with npm run native:build -- ${target.arch}.`);
  const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
  assert.equal(manifest.platform, target.platform, `Unexpected platform in ${id}`);
  assert.equal(manifest.arch, target.arch, `Unexpected architecture in ${id}`);
  assert.equal(manifest.filename, target.filename, `Unexpected filename in ${id}`);
  assert.equal(manifest.bitcoinCommit, commit, `Stale source for ${id}`);
  assert.equal(sha256(readFileSync(join(directory, manifest.filename))), manifest.binarySha256, `Checksum mismatch for ${id}`);
}
console.log('All packaged binaries match their manifests and pinned Bitcoin Core commit.');
