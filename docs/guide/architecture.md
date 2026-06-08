# Architecture

`js-bitcoin-kernel` is intentionally thin. It tries to keep Bitcoin consensus behavior in Bitcoin Core while making native objects usable from TypeScript.

## High-Level Architecture

| Layer | Components | Role |
|------|------------|------|
| JavaScript / TypeScript | App code, Public API, KernelOpaquePtr, Helpers | High-level logic and abstraction |
| FFI boundary | bindings.ts, koffi, callbacks | Bridge between JS and native C++ |
| Native layer | libbitcoinkernel, validation engine, blockchain data | Core Bitcoin implementation |

## Module Relationships

```
index.ts
├── block.ts
│   ├── transaction.ts
│   └── chain.ts
│       └── context.ts
│           ├── validation.ts
│           └── notifications.ts (direct-module only)
├── chain.ts
│   └── block.ts
├── script.ts
│   └── transaction.ts
├── log.ts
├── validation.ts
└── init.ts

FFI layer
├── ffi/bindings.ts
│   └── ffi/loader.ts
```

## Data Flow

The common data flow is:

1. JavaScript receives bytes from a file, fixture, network message, or database.
2. A public wrapper parses bytes by calling a native constructor through `koffi`.
3. The native layer returns an opaque pointer.
4. The TypeScript class stores the pointer and exposes safe getters.
5. Getters either return primitives, owned objects, or borrowed views into parent memory.
6. The caller disposes owned objects when finished.

## Validation Flow

`Block.check(...)` performs context-free checks. `ChainstateManager.processBlock(...)` performs contextual validation against the current chainstate and UTXO set.

```
1. Input:
   Serialized block bytes

2. Parsing:
   Block.fromBytes

3. Basic validation (context-free):
   Block.check
   → uses ConsensusParams
   → outputs BlockValidationState

4. Decision point:
   VALID?

   ├── NO
   │     → Inspect validationMode
   │     → Inspect blockValidationResult
   │
   └── YES
         → ChainstateManager.processBlock
               ├── updates Block tree index
               ├── updates UTXO set
               ├── triggers validation callbacks
               └── updates active chain view
```

## Pointer Ownership

The native C API allocates memory that JavaScript cannot see directly. The wrapper uses `KernelOpaquePtr` to track three important states:

- Owned pointer: this wrapper is responsible for calling the matching native destroy function.
- Borrowed view: another object owns the underlying memory; this wrapper keeps a parent reference alive.
- Detached copy: a borrowed view has been copied into a new owned native allocation.

Examples:

- `Block.fromBytes(...)` returns an owned `Block`.
- `block.transactions.get(0)` returns a borrowed `Transaction` view tied to the block.
- `transaction.txid` returns a borrowed `Txid` view tied to the transaction.
- `txid.detach()` copies the txid into owned native memory when supported.

## Chainstate Architecture

`ChainstateManager` is the long-lived validation coordinator. It owns or references:

- A native kernel context.
- A block tree index.
- The active chain view.
- Block storage readers.
- Undo data readers.
- A UTXO chainstate database.

The data directory must be treated like a database, not a cache. Do not share it concurrently with `bitcoind` or another `ChainstateManager`.
