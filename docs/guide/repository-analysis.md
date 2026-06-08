# Repository Analysis

This report summarizes the repository analysis performed before writing the VitePress documentation.

## What The Project Does

`js-bitcoinkernel` is an experimental TypeScript wrapper around Bitcoin Core's native `libbitcoinkernel` library. It lets JavaScript and TypeScript programs parse, inspect, serialize, and validate Bitcoin data structures while delegating consensus behavior to Bitcoin Core instead of reimplementing those rules in JavaScript.

The library is intentionally thin:

- TypeScript classes expose Bitcoin concepts such as blocks, headers, transactions, scripts, chain parameters, and chainstate.
- `koffi` loads the native shared library and calls C functions.
- Wrapper classes manage opaque native pointers with ownership, borrowed views, copying, detaching, and explicit disposal.
- Tests use regtest block fixtures to exercise parsing, validation, chainstate processing, undo data, logging, and callback lifetimes.

::: warning Experimental boundary
The README and source both describe this as experimental software. It should not be used for consensus-critical infrastructure, wallets, custody, exchange systems, or production mainnet funds.
:::

## Main Modules

| Module | Role |
| --- | --- |
| `src/js-kernel/index.ts` | Package root and intended public API surface. |
| `src/js-kernel/block.ts` | Blocks, block headers, block hashes, block tree entries, context-free validation state, transaction sequences, and undo-data sequences. |
| `src/js-kernel/chain.ts` | Network parameters, consensus parameters, chainstate manager options, active chain views, block maps, undo-data maps, and block-index lookups. |
| `src/js-kernel/context.ts` | Kernel context setup, context options, chain parameter binding, notification binding, validation callback binding, and interruption. |
| `src/js-kernel/transaction.ts` | Transactions, txids, inputs, outpoints, outputs, coins, and transaction spent-output records. |
| `src/js-kernel/script.ts` | Script pubkeys, script verification flags/statuses, verification errors, and precomputed transaction data. |
| `src/js-kernel/log.ts` | Native logging options, categories, levels, connections, and convenience log viewer. |
| `src/js-kernel/validation.ts` | Validation callback registration and native callback wrapping for block validation events. |
| `src/js-kernel/notifications.ts` | Notification callback registration. This module is direct-module only today because it is not re-exported from the package root. |
| `src/js-kernel/init.ts` | Bootstrap helpers, especially `makeContext(...)` and `loadChainman(...)`. |
| `src/js-kernel/ffi/*` | Native library loading and low-level Koffi bindings. These are implementation details. |
| `src/js-kernel/util/*` and `writer.ts` | Shared internals for pointer lifecycle, sequences, callbacks, exceptions, and byte streaming. |

## Public API Surface

The package root currently re-exports these symbols.

### Blocks

`Block`, `BlockCheckFlags`, `BlockHash`, `BlockHeader`, `BlockTreeEntry`, `BlockSpentOutputs`, `BlockValidationResult`, `BlockValidationState`, `TransactionSequence`, `TransactionSpentOutputsSequence`, and `ValidationMode`.

### Chainstate

`BlockMap`, `BlockSpentOutputsMap`, `BlockTreeEntryMap`, `BlockTreeEntrySequence`, `Chain`, `ChainParameters`, `ChainstateManager`, `ChainstateManagerOptions`, `ChainType`, and `ConsensusParams`.

### Context

`Context` and `ContextOptions`.

### Logging

`KernelLogViewer`, `LogCategory`, `LogLevel`, `LoggingConnection`, `LoggingOptions`, `enable_log_category`, `disable_log_category`, `logging_set_options`, and `set_log_level_category`.

### Scripts

`PrecomputedTransactionData`, `ScriptPubkey`, `ScriptVerificationFlags`, `ScriptVerifyException`, and `ScriptVerifyStatus`.

### Transactions

`Coin`, `CoinSequence`, `Transaction`, `TransactionInput`, `TransactionInputSequence`, `TransactionOutput`, `TransactionOutputSequence`, `TransactionOutPoint`, `TransactionSpentOutputs`, and `Txid`.

### Errors

`KernelException`, `ProcessBlockException`, and `ProcessBlockHeaderException`.

### Validation And Bootstrap

`ValidationInterfaceCallbacks`, `makeContext`, and `loadChainman`.

## Architecture Summary

| Layer | Role |
|------|------|
| Application code | Entry point using the library |
| Package root (index.ts) | Public API surface |
| High-level wrappers | Block, Transaction, ChainstateManager abstractions |
| KernelOpaquePtr | Manages ownership + borrowed views |
| Koffi FFI bindings | Bridge between JS/TS and native C++ |
| libbitcoinkernel | Native Bitcoin kernel library |
| Bitcoin Core consensus engine | Core validation and consensus rules |

The wrapper's most important design constraint is native memory lifetime. Owned objects should be disposed when finished. Borrowed views must not outlive their parent unless copied or detached.

## Documentation Strategy

The docs site is organized around how a developer learns the library:

1. Start with concepts and installation.
2. Use quick-start examples that match the actual TypeScript API.
3. Learn the native pointer lifecycle model before using long-lived objects.
4. Follow tutorials for block validation, chainstate, transactions, scripts, and examples.
5. Use API pages for every public root-exported module, with direct-module caveats where relevant.
