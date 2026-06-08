# Introduction

`js-bitcoinkernel` is a TypeScript library that wraps Bitcoin Core's native `libbitcoinkernel` library. Its job is not to invent a new Bitcoin implementation. Its job is to expose Bitcoin Core kernel objects and validation routines to JavaScript through a small, typed API.

## Bitcoin Kernel From First Principles

Bitcoin consensus is the set of rules that decides whether blocks and transactions are valid. These rules cover things like:

- Whether a block header satisfies proof of work.
- Whether a block's Merkle root commits to its transaction list.
- Whether transaction signatures satisfy the scripts they spend.
- Whether a block connects to a valid parent.
- Whether spent outputs exist in the current UTXO set.

`libbitcoinkernel` is an effort inside Bitcoin Core to expose consensus and validation primitives as a reusable library. `js-bitcoinkernel` sits above that C API and turns native handles into TypeScript classes.

## What The Library Is Good For

Use this project for:

- Research tools that need to parse Bitcoin blocks or transactions.
- Local regtest experiments.
- Education around Bitcoin validation internals.
- Building higher-level JavaScript prototypes around the Bitcoin Core kernel.
- Inspecting block tree entries, active chain state, undo data, and validation callbacks.

Do not use it for:

- Consensus-critical infrastructure.
- Wallets, custody systems, exchanges, or production mainnet funds.
- Security boundaries where a JavaScript FFI wrapper is unacceptable.
- Long-running services unless you have audited native library loading, pointer lifetimes, and database locking.

## Mental Model

Most public classes wrap an opaque native pointer. Some wrappers own their pointer and can free it. Other wrappers are borrowed views into a parent object.

| Concept | Behavior |
|--------|----------|
| Owned wrapper (Block, Transaction, Context) | Owns native allocation |
| Borrowed view (Txid, TransactionInput, BlockTreeEntry) | References existing memory |
| Parent wrapper | Keeps memory alive for borrowed views |
| copy() / detach() | Converts or duplicates into owned wrapper |

The practical rule is simple: keep the parent object alive while using child views. If you need to keep a child after the parent may be disposed, call `copy()` or `detach()` when the class supports it.

## Package Entry Point

Consumer code should import from the package root:

```ts
import {
  Block,
  BlockHeader,
  ChainstateManager,
  ChainType,
  loadChainman,
  Transaction,
} from "js-bitcoinkernel";
```

Internal modules such as `ffi/bindings`, `ffi/loader`, `writer`, and `util/*` are implementation details. They are documented only indirectly through the public classes that depend on them.

## Current Maturity

The codebase is still young. The wrapper exposes a useful subset of `libbitcoinkernel`, but some rough edges remain:

- The native binary is platform-specific.
- The bundled binary is currently macOS-oriented.
- Some source modules export helpers that are not re-exported from the package root.
- Several tests act as examples; this site turns those patterns into stable tutorials and API notes.

This documentation aims to make those edges visible instead of hiding them under cheerful paint.
