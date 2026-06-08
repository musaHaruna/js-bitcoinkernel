# Installation

`js-bitcoinkernel` has two kinds of dependencies:

- JavaScript dependencies installed with npm.
- A native `libbitcoinkernel` dynamic library built from Bitcoin Core.

Both must be available before examples that touch the native API can run.

## Requirements

- Node.js 18 or newer.
- npm.
- CMake 3.22 or newer.
- A compiler toolchain that can build Bitcoin Core.
- A platform-compatible `libbitcoinkernel` dynamic library.

The package is an ES module package, so examples use `import` syntax.

## Install JavaScript Dependencies

From the repository root:

```bash
npm install
```

## Build The Native Kernel

The root `CMakeLists.txt` treats `depend/bitcoin` as an external project and builds only the Bitcoin Core kernel target.

```bash
cmake -B build
cmake --build build -j 10
```

The build is configured with wallet, GUI, daemon, CLI, util, and test targets disabled. The important target is `bitcoinkernel`.

## Native Library Resolution

At runtime, the loader searches for a platform-specific dynamic library:

- macOS: `libbitcoinkernel.dylib`
- Linux: `libbitcoinkernel.so`
- Windows: `bitcoinkernel.dll`

In development, it searches common build locations:

```txt
lib/
build/
build/bitcoin-build/lib/
build/bitcoin-build/bin/
```

In packaged builds, it expects binaries under:

```txt
dist/js-kernel/binaries/
```

The current repository includes a macOS binary at `src/js-kernel/binaries/libbitcoinkernel.dylib`.

## Build The TypeScript Package

```bash
npm run build
```

This compiles TypeScript, rewrites path aliases, and copies bundled native binaries into `dist/js-kernel/binaries`.

## Local Linking

The package is not currently documented as published to npm. To use it from another local project:

```bash
npm run build
npm link
```

Then, in the consuming project:

```bash
npm link js-bitcoinkernel
```

## Documentation Commands

The docs site lives in `docs/`.

```bash
npm run docs:dev
npm run docs:build
npm run docs:preview
```

`docs:build` produces a static site in `docs/.vitepress/dist`.

## Common Installation Errors

### Native library not found

The loader could not find `libbitcoinkernel` in either packaged or development locations. Build the CMake project, or place the correct dynamic library in one of the searched directories.

### Wrong platform binary

Dynamic libraries are not portable across operating systems. A `.dylib` built on macOS cannot satisfy Linux or Windows runtimes.

### Database lock failures

`ChainstateManager` opens chainstate data directories with exclusive native database locks. Do not share the same data directory with a running `bitcoind` or another wrapper process.
