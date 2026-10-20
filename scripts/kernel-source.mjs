import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const bitcoinDir = join(root, 'depend/bitcoin');
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
}

/** Return the official Bitcoin Core commit pinned by the current Git index. */
export function bitcoinCommit() {
  if (!existsSync(join(bitcoinDir, '.git'))) {
    throw new Error('Bitcoin Core submodule is unavailable. Run git submodule update --init --recursive.');
  }
  const commit = git(bitcoinDir, ['rev-parse', 'HEAD']);
  const gitlink = git(root, ['ls-files', '--stage', '--', 'depend/bitcoin']);
  const expected = /^160000 ([0-9a-f]{40}) 0\tdepend\/bitcoin$/.exec(gitlink)?.[1];
  if (!expected || commit !== expected) {
    throw new Error('Bitcoin Core submodule does not match the commit staged in this repository.');
  }
  return commit;
}

/** Reject local source edits so a binary manifest always describes a committed source tree. */
export function assertCleanBitcoinSource() {
  if (git(bitcoinDir, ['status', '--porcelain']) !== '') {
    throw new Error('Bitcoin Core submodule has local changes. Commit or discard them before building binaries.');
  }
}
