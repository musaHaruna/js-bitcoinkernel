# Installation

`js-bitcoinkernel` has two kinds of dependencies:

- JavaScript dependencies installed with npm.
- A native `libbitcoinkernel` dynamic library built from Bitcoin Core.

Both must be available before examples that touch the native API can run.

## Requirements

- Node.js 22.13 or newer for development and the current lint/build toolchain.
- npm.
- CMake 3.24 or newer.
- A compiler toolchain that can build Bitcoin Core.
- A platform-compatible `libbitcoinkernel` dynamic library.

The package is an ES module package, so examples use `import` syntax.

## Install JavaScript Dependencies

From the repository root:

```bash
git submodule update --init --recursive
npm install
```

The official `bitcoin/bitcoin` submodule is pinned to the exact commit used by the wrapper and native binaries. A fresh clone can initialize it in one step with `git clone --recurse-submodules <repository-url>`.

## Build The Native Kernel

Build the pinned Bitcoin Core source and write a manifest that records its Git commit with:

```bash
npm run native:build
```

On macOS this produces one universal binary. On Linux it produces the binary for the current CPU; use the release workflow to build every packaged target. Verify the pinned source and all packaged manifests with:

```bash
npm run native:verify
```

## Native Library Resolution

At runtime, the loader selects an exact packaged target:

| Runtime | Bundled target |
| --- | --- |
| macOS arm64 or x64 | `darwin-universal/libbitcoinkernel.dylib` |
| Linux arm64 | `linux-arm64/libbitcoinkernel.so` |
| Linux x64 | `linux-x64/libbitcoinkernel.so` |

The loader never falls back to another architecture. For an unsupported target, such as Windows, set `BITCOINKERNEL_LIB` to the absolute path of an ABI-compatible kernel library:

```bash
BITCOINKERNEL_LIB=/opt/lib/libbitcoinkernel.dll node app.js
```

## Build The TypeScript Package

```bash
npm run build
```

This compiles TypeScript, rewrites path aliases, and copies bundled native binaries into `dist/js-kernel/binaries`.

## Local Linking

To use the current build from another local project:

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

Dynamic libraries are not portable across operating systems or CPU architectures. Check `process.platform` and `process.arch`, or point `BITCOINKERNEL_LIB` to a matching build.

### Database lock failures

`ChainstateManager` opens chainstate data directories with exclusive native database locks. Do not share the same data directory with a running `bitcoind` or another wrapper process.
