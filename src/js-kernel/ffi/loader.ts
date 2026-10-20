import path from 'node:path';
import fs from 'node:fs';
import koffi from 'koffi';
import { fileURLToPath } from 'node:url';

const binaryRoot = fileURLToPath(new URL('../binaries/', import.meta.url));

/** Resolve by OS and CPU architecture; never silently load another architecture's library. */
export function resolveLibraryPath(): string {
  if (process.env.BITCOINKERNEL_LIB) {
    const override = path.resolve(process.env.BITCOINKERNEL_LIB);
    if (!fs.statSync(override).isFile()) throw new Error(`BITCOINKERNEL_LIB is not a file: ${override}`);
    return override;
  }
  if (!['arm64', 'x64'].includes(process.arch) || !['darwin', 'linux'].includes(process.platform)) {
    throw new Error(`No bundled kernel for ${process.platform}-${process.arch}. Set BITCOINKERNEL_LIB to a compatible custom build.`);
  }
  const target = process.platform === 'darwin' ? 'darwin-universal' : `linux-${process.arch}`;
  const filename = process.platform === 'darwin' ? 'libbitcoinkernel.dylib' : 'libbitcoinkernel.so';
  const packaged = path.join(binaryRoot, target, filename);
  if (!fs.existsSync(packaged)) {
    throw new Error(`Missing kernel binary ${packaged}. Run npm run native:build or set BITCOINKERNEL_LIB.`);
  }
  return packaged;
}

export const lib = koffi.load(resolveLibraryPath());
