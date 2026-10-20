# js-bitcoinkernel

A TypeScript wrapper around [libbitcoinkernel](https://github.com/bitcoin/bitcoin/pull/30595) that provides safe, structured access to native Bitcoin data structures through a C FFI layer.

It wraps a native Bitcoin kernel library using `koffi` and exposes high-level objects such as `BlockHash` and `BlockHeader` for use in JavaScript/TypeScript applications.

> [!WARNING]
> `js-bitcoinkernel` is highly experimental software, and should in no
> way be used in software that is consensus-critical, deals with
> (mainnet) coins, or is generally used in any production environment.


## Overview

This project acts as a thin abstraction layer between JavaScript and a native Bitcoin implementation.

It allows you to:

- Load a native Bitcoin kernel C library
- Work with Bitcoin block headers in a structured way
- Perform operations like hashing, serialization, and equality checks
- Safely manage native memory through RAII-style wrappers


## Architecture

The system is composed of three main layers:

#### 1. Native Layer (C/C++)
- Implements Bitcoin logic (hashing, parsing, serialization)
- Packages a macOS universal library and separate Linux x64 and ARM64 libraries.
- Loads only the library matching the running OS and CPU. Other targets can provide an ABI-compatible path through `BITCOINKERNEL_LIB`.

#### 2. FFI Layer (Koffi)
- Loads native shared libraries
- Defines function bindings
- Handles pointer communication between JS and native code

#### 3. JavaScript Kernel Layer
- Wraps raw pointers into safe objects e.g:
  - `BlockHash`
  - `BlockHeader`
- Manages memory lifecycle (create, copy, dispose)

## Development

Install [Node.js](https://nodejs.org/en), CMake 3.24 or newer, and a compiler toolchain. The Bitcoin Core source is an official Git submodule pinned to one exact commit. Initialize it, then install JavaScript dependencies and build the native library for the host:

```bash
git submodule update --init --recursive
npm ci
npm run native:build
npm test
npm run type-check
npm run lint
npm run build
npm run docs:build
```

Tests use Node's built-in test runner with named cases, assertions, isolated temporary databases, and deterministic native-resource cleanup. The suite includes native integration tests for serialization, script verification, callbacks, regtest processing, reorganization, undo data, and disk reloads.

See [reliability changes and ownership rules](docs/guide/reliability.md).

### Docker Build Option (Linux Native Libraries)

On macOS, build Linux binaries in the included Ubuntu image. The build script writes the library and its checksum manifest into the architecture-specific package directory.

```bash
docker build --platform linux/amd64 -t js-bitcoinkernel-builder:ubuntu-24.04 .
docker run --platform linux/amd64 --rm \
  -v "$PWD":/workspace -w /workspace \
  js-bitcoinkernel-builder:ubuntu-24.04 \
  npm run native:build -- x64
```

The result is `src/js-kernel/binaries/linux-x64/libbitcoinkernel.so`. To build the Linux ARM64 variant on an ARM64 host, omit `--platform linux/amd64` and use `arm64` as the build argument. Run `npm run native:verify` after all three packaged targets are present.

### Updating Bitcoin Core

Choose and review an official Bitcoin Core commit, then move the submodule to that exact commit. Rebuild every packaged native target and commit the Gitlink, binaries, and manifests together:

```bash
git -C depend/bitcoin fetch origin <bitcoin-core-commit>
git -C depend/bitcoin checkout --detach <bitcoin-core-commit>
git add depend/bitcoin
npm run native:build
npm run native:verify
```

Build macOS universal, Linux ARM64, and Linux x64 from their matching hosts or through the release workflow before committing the update. The binary manifests record the Bitcoin Core commit and `native:verify` rejects a binary built from a different or locally modified source tree.

## Installation & Usage
You can integrate js-bitcoinkernel into your external projects using either the standard npm registry installation or a local link for development purposes.

### Method 1: Standard Installation (Recommended)
Run:
```Bash
npm install js-bitcoinkernel
```
Then, import it into your TypeScript or JavaScript project:

```TypeScript
import { BlockHeader, Transaction } from 'js-bitcoinkernel';
```

### Method 2: Local Development & Linking (Alternative)
If you are modifying the js-bitcoinkernel source code locally and want to test those live changes instantly in a separate test project without republishing to npm, use npm link.

#### 1. Build and Link the Core Library
Navigate to your local js-bitcoinkernel root directory and build the project, then register it globally on your machine:

```Bash
# Inside js-bitcoinkernel/
npm run build
npm link
```
#### 2. Connect Your Target Project
Navigate to the root directory of the separate project where you want to consume the library, and wire up the symlink:

```Bash
# Inside your-other-project/
npm link js-bitcoinkernel
```
**Development Tip:** If you change the TypeScript code inside js-bitcoinkernel, simply rerun `npm run build` in its directory. The target project will immediately pick up the compiled changes through the symlink without needing to reinstall.

## Example: Basic Usage

```javascript
import { BlockHeader } from "js-bitcoinkernel";

const headerHex =
  "010000006fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000982051fd1e4ba744bbbe680e1fee14677ba1a3c3540bf7b1cdb606e857233e0e61bc6649ffff001d01e36299";

const header = BlockHeader.fromBytes(Buffer.from(headerHex, "hex"));

console.log("Block hash:", header.blockHash.toString());
console.log("Previous hash:", header.prevHash.toString());
console.log("Timestamp:", header.timestamp.toISOString());
console.log("Version:", header.version);

header.dispose();
```

## Documentation
See the [documentation](https://musaharuna.github.io/js-bitcoinkernel/) for more information, usage examples, and more.

## References
- [libbitcoinkernel](https://github.com/bitcoin/bitcoin/pull/30595)
- [Bitcoin Core build documentation](https://github.com/bitcoin/bitcoin/blob/master/doc/build-unix.md)
## Contributing
Contributions are welcome! Please feel free to submit issues and pull requests.

## License
This project follows Bitcoin Core's licensing. See the Bitcoin Core repository for details.
