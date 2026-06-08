# Quick Start

This quick start parses Bitcoin data from hex, inspects it, and runs validation with the public API.

## Parse A Block Header

A Bitcoin block header is exactly 80 bytes. The wrapper does not currently expose an object-literal constructor for headers. Use `BlockHeader.fromBytes(...)`.

```ts
import { BlockHeader } from "js-bitcoinkernel";

const headerHex =
  "010000006fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000982051fd1e4ba744bbbe680e1fee14677ba1a3c3540bf7b1cdb606e857233e0e61bc6649ffff001d01e36299";

const header = BlockHeader.fromBytes(Buffer.from(headerHex, "hex"));

console.log("hash:", header.blockHash.toString());
console.log("previous:", header.prevHash.toString());
console.log("timestamp:", header.timestamp.toISOString());
console.log("bits:", header.bits);
console.log("nonce:", header.nonce);

header.dispose();
```

Inputs:

- `headerHex`: 160 hex characters, or 80 bytes.

Outputs:

- A `BlockHeader` wrapper around a native header allocation.
- A `BlockHash` for the computed block hash.

Errors:

- Throws if the byte length is not exactly 80.
- Throws if the native parser rejects the header or the native binding is unavailable.

## Validate A Serialized Block

Context-free block validation checks the block structure without requiring a UTXO set. It can verify the Merkle root and proof-of-work depending on flags.

```ts
import {
  Block,
  BlockCheckFlags,
  ChainParameters,
  ChainType,
  ValidationMode,
} from "js-bitcoinkernel";

const genesisHex =
  "0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4adae5494dffff7f20020000000101000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000";

const block = Block.fromBytes(Buffer.from(genesisHex, "hex"));
const params = new ChainParameters(ChainType.REGTEST);
const state = block.check(params.consensusParams, BlockCheckFlags.ALL);

console.log(state.validationMode === ValidationMode.VALID);

block.dispose();
params.dispose();
state.dispose();
```

## Create A Chainstate Manager

Use `loadChainman(...)` when you want the convenience path. It creates a context, sets chain parameters, configures directories, and returns a `ChainstateManager`.

```ts
import { Block, ChainType, loadChainman } from "js-bitcoinkernel";

const chainman = loadChainman("/tmp/js-bitcoinkernel-regtest", ChainType.REGTEST);
const block = Block.fromBytes(Buffer.from(genesisHex, "hex"));

const wasNew = chainman.processBlock(block);
const chain = chainman.getActiveChain();

console.log({ wasNew, height: chain.height });

block.dispose();
chainman.dispose();
```

## Memory Cleanup

Most owned wrappers support `dispose()`. Borrowed child views should not be disposed manually. A typical pattern is:

```ts
const tx = new Transaction(Buffer.from(rawTxHex, "hex"));
try {
  console.log(tx.txid.toString());
} finally {
  tx.dispose();
}
```

If you use a JavaScript runtime with explicit resource management support, wrappers also implement `Symbol.dispose`.
