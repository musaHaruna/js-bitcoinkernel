import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertCleanBitcoinSource, bitcoinCommit, root, sha256 } from './kernel-source.mjs';

const platform = process.platform;
const arch = process.argv[2] ?? (platform === 'darwin' ? 'universal' : process.arch);
if (!(platform === 'darwin' && arch === 'universal') && !(platform === 'linux' && ['arm64', 'x64'].includes(arch))) {
  throw new Error(`Unsupported native build: ${platform}-${arch}`);
}
const id = `${platform}-${arch}`;
const build = join(root, 'build', `native-${platform === 'darwin' ? 'darwin' : id}`);
const source = join(root, 'depend/bitcoin');
const output = join(root, 'src/js-kernel/binaries', id);
const filename = platform === 'darwin' ? 'libbitcoinkernel.dylib' : 'libbitcoinkernel.so';
const commit = bitcoinCommit();
assertCleanBitcoinSource();
const args = ['-S', source, '-B', build, '-DBUILD_SHARED_LIBS=ON', '-DBUILD_KERNEL_LIB=ON', '-DCMAKE_BUILD_TYPE=Release'];
for (const feature of ['TESTS', 'KERNEL_TEST', 'BENCH', 'CLI', 'DAEMON', 'GUI', 'TX', 'UTIL', 'UTIL_CHAINSTATE', 'WALLET_TOOL']) {
  args.push(`-DBUILD_${feature}=OFF`);
}
args.push('-DENABLE_WALLET=OFF', '-DENABLE_IPC=OFF');
if (platform === 'darwin') args.push('-DCMAKE_OSX_ARCHITECTURES=arm64;x86_64', '-DCMAKE_OSX_DEPLOYMENT_TARGET=11.0');
if (platform === 'linux' && arch !== process.arch) {
  if (process.arch !== 'arm64' || arch !== 'x64') throw new Error('Only Linux arm64 to x64 cross-compilation is configured');
  args.push('-DCMAKE_SYSTEM_NAME=Linux', '-DCMAKE_SYSTEM_PROCESSOR=x86_64', '-DCMAKE_C_COMPILER=x86_64-linux-gnu-gcc', '-DCMAKE_CXX_COMPILER=x86_64-linux-gnu-g++');
}
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status ?? result.signal})`);
}
run('cmake', ['--fresh', ...args]);
run('cmake', ['--build', build, '--target', 'bitcoinkernel', '--parallel', process.env.CMAKE_BUILD_PARALLEL_LEVEL ?? '4']);
mkdirSync(output, { recursive: true });
cpSync(join(build, 'lib', filename), join(output, filename), { dereference: true });
writeFileSync(join(output, 'manifest.json'), JSON.stringify({
  platform, arch, filename, bitcoinCommit: commit, binarySha256: sha256(readFileSync(join(output, filename))),
  minimumSystem: platform === 'darwin' ? 'macOS 11' : 'glibc 2.39 (Ubuntu 24.04)'
}, null, 2) + '\n');
console.log(`Built ${id}: ${join(output, filename)}`);
