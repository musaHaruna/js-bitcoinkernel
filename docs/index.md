---
layout: home

hero:
  name: "js-bitcoinkernel"
  text: "Bitcoin Core consensus primitives for TypeScript"
  tagline: Parse, inspect, and validate Bitcoin blocks, transactions, scripts, and chainstate through libbitcoinkernel.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: API Reference
      link: /api/overview
    - theme: alt
      text: View Examples
      link: /tutorials/examples

features:
  - title: Native Bitcoin Core kernel
    details: Uses the libbitcoinkernel C API instead of reimplementing consensus parsing and validation logic in JavaScript.
  - title: TypeScript-first wrappers
    details: Exposes domain objects such as Block, BlockHeader, Transaction, ScriptPubkey, ChainstateManager, and ValidationInterfaceCallbacks.
  - title: Practical validation flows
    details: Learn how context-free block checks, full chainstate processing, script verification, and callback lifecycles fit together.
---

::: warning Experimental software
`js-bitcoinkernel` is experimental. Do not use it for consensus-critical applications, mainnet funds, custody, wallets, or systems where an incorrect validation result could cause financial loss.
:::

## What This Library Does

`js-bitcoinkernel` is a TypeScript wrapper around Bitcoin Core's `libbitcoinkernel`. It lets JavaScript programs load the native kernel library and work with Bitcoin consensus objects without directly handling C pointers.

At a high level, the package gives you:

- Binary parsers for block headers, blocks, transactions, script pubkeys, transaction outputs, and hashes.
- Safe object wrappers around opaque native handles.
- Context-free block validation with `Block.check(...)`.
- Full block and header processing through `ChainstateManager`.
- Script verification for legacy, SegWit, and Taproot-aware flows.
- Logging and validation callbacks from the native kernel.

## How The Pieces Fit
| Layer | Description |
|------|-------------|
| Application code | Entry point |
| TypeScript public API | Exposed interface |
| Pointer lifecycle wrappers | Manages memory / pointers |
| FFI bindings (Koffi) | Bridge to native C++ |
| libbitcoinkernel | Bitcoin native logic layer |
| Bitcoin Core consensus engine | Rule validation engine |

## First Taste

```ts
import {
  BlockHeader,
  ChainParameters,
  ChainType,
} from "js-bitcoinkernel";

const headerHex =
  "010000006fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000982051fd1e4ba744bbbe680e1fee14677ba1a3c3540bf7b1cdb606e857233e0e61bc6649ffff001d01e36299";

const header = BlockHeader.fromBytes(Buffer.from(headerHex, "hex"));
const params = new ChainParameters(ChainType.MAINNET);

console.log(header.blockHash.toString());
console.log(params.consensusParams.toString());
```

Start with the [Introduction](/guide/introduction), review the [Repository Analysis](/guide/repository-analysis) if you want the source-level map, then move into the [Quick Start](/guide/quick-start) and [API Overview](/api/overview).
