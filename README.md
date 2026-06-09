# js-bitcoinkernel

A TypeScript a wrapper around [ libbitcoinkernel](https://github.com/bitcoin/bitcoin/pull/30595) that provides safe, structured access to native Bitcoin data structures through a C FFI layer.

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
- Compiled into shared libraries:
  - `libbitcoinkernel.so` (Linux)
  - `libbitcoinkernel.dylib` (macOS)
  - `bitcoinkernel.dll` (Windows)

> ⚠️ **Note:** You must compile Bitcoin Core to generate the native binary for your target operating system. This repository supports direct local builds for **macOS** as well as containerized builds via **Docker** to easily generate and extract the **Linux** shared library (`.so`).

#### 2. FFI Layer (Koffi)
- Loads native shared libraries
- Defines function bindings
- Handles pointer communication between JS and native code

#### 3. JavaScript Kernel Layer
- Wraps raw pointers into safe objects e.g:
  - `BlockHash`
  - `BlockHeader`
- Manages memory lifecycle (create, copy, dispose)

## Installation Guide

### 1. Build Bitcoin Core Dependency

Before building this project, you must first build Bitcoin Core as a dependency.

Go to:
```
depends/bitcoin/doc
```
Follow the instructions there to build Bitcoin Core for your operating system.

This step ensures all platform-specific dependencies are correctly configured and will also include CMake, which is required in the next step for configuring and building Bitcoin Core and the main project.

### 2. Configure the Project with CMake

From the root of the project, run:

```
cmake -B build
```
What this command does
cmake runs the CMake build system generator
-B build creates a `build/` directory and generates all build files inside it

It simply prepares the project for compilation by generating platform-specific build files.

### 3. Build the Project

After configuration is complete, run:

```
cmake --build build -j 10
```
`cmake --build build` compiles the project inside the `build/` directory
`-j 10` uses 10 CPU threads for parallel compilation

**Why parallel build matters**

Large C++ projects like Bitcoin Core contain many files. Parallel builds speed up compilation by processing multiple files at the same time.

Example:
`-j 1` slow (e.g one file at a time)
`-j 10` faster (multiple files at once, depending on CPU capacity)

### Docker Build Option (For Linux Shared Libraries)
If you are on macOS but need to compile the .so binary for a Linux environment, you can use the included Dockerfile to build inside an isolated Ubuntu container. This method outputs the artifact right back into your host workspace via volume mounts.

1. Build the Docker Builder Image
Ensure Docker Desktop is running on your machine, then run:

```Bash
docker build -t bitcoin-kernel-builder .
```
2. Compile via Containerized Volume Mount
Run the compilation pipeline inside the container. We use an isolated build-linux folder so absolute build paths inside the container do not conflict with your local macOS host environment:

```Bash
docker run --rm -v "$(pwd)":/workspace bitcoin-kernel-builder bash -c "
    mkdir -p build-linux && \
    cd build-linux && \
    cmake .. && \
    cmake --build .
"
```

3. Locate Your Linux Binary
Once the container finishes compiling, your Linux shared library will be available on your host machine at:

```Plaintext
build-linux/bitcoin-build/src/kernel/libbitcoinkernel.so
```
### 4. Install NPM Dependencies

Make sure you have [Node.js](https://nodejs.org/en) installed.

Then run:
```bash
npm install
```
## Run Tests

After building everything, run the test suite:
```
npm run test
```
This executes:

```
"test": "tsx ./tests/index.ts"
```
## Using `js-bitcoin-kernel` in Another Project

This library is not published to npm yet. That means you cannot install it using `npm install js-bitcoin-kernel`.

Instead, you use it locally by building it and linking it into another project check installation steps for that.

#### 1. Build the project
Run:
```
npm run build
```
#### 2. Link the Package Locally

Since it is not on npm, you link it using this method:

Inside js-bitcoin-kernel root directory:

Run:

```
npm link
```

Then inside your external project:

```
npm link js-bitcoinkernel
```
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
- [py-bitcoinkernel wrapper](https://github.com/stickies-v/py-bitcoinkernel)
## Contributing
Contributions are welcome! Please feel free to submit issues and pull requests.

## License
This project follows Bitcoin Core's licensing. See the Bitcoin Core repository for details.
