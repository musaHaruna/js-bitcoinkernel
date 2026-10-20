import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './kernel-source.mjs';

const sourceRoot = join(root, 'src/js-kernel/binaries');
const destinationRoot = join(root, 'dist/js-kernel/binaries');
mkdirSync(destinationRoot, { recursive: true });
for (const target of ['darwin-universal', 'linux-arm64', 'linux-x64']) {
  const source = join(sourceRoot, target);
  if (existsSync(source)) cpSync(source, join(destinationRoot, target), { recursive: true });
}
