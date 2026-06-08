# API Overview

The package root exports high-level wrappers only. Prefer:

```ts
import { Block, ChainType, loadChainman, Transaction } from "js-bitcoinkernel";
```

Avoid importing from `src/js-kernel/ffi/*`, `writer`, or `util/*` in application code. Those modules expose implementation details for native loading, callback streaming, and pointer lifecycle.

## Public Modules

| Page | Main exports |
| --- | --- |
| [Blocks](/api/block) | `Block`, `BlockHeader`, `BlockHash`, `BlockTreeEntry`, validation state/result enums, block sequences, undo data. |
| [Chainstate](/api/chain) | `ChainParameters`, `ConsensusParams`, `ChainstateManagerOptions`, `ChainstateManager`, `Chain`, block maps. |
| [Context](/api/context) | `ContextOptions`, `Context`. |
| [Logging](/api/log) | `LoggingOptions`, `LoggingConnection`, `KernelLogViewer`, log enums and category helpers. |
| [Scripts](/api/script) | `ScriptPubkey`, script flags/statuses, `PrecomputedTransactionData`, `ScriptVerifyException`. |
| [Transactions](/api/transaction) | `Transaction`, `Txid`, inputs, outpoints, outputs, coins, spent-output collections. |
| [Validation Callbacks](/api/validation) | `ValidationInterfaceCallbacks`. |
| [Notifications](/api/notifications) | `NotificationInterfaceCallbacks` and `defaultNotificationCallbacks` from a direct submodule. Not root-exported today. |
| [Bootstrap Helpers](/api/init) | `makeContext`, `loadChainman`. |
| [Errors](/api/errors) | `KernelException`, `ProcessBlockException`, `ProcessBlockHeaderException`. |

## Cross-Cutting Rules

### Bytes Are Consensus-Serialized

Constructors and factory methods expect Bitcoin's consensus wire format:

- `BlockHeader.fromBytes(...)`: exactly 80 bytes.
- `Block.fromBytes(...)`: full block bytes.
- `new Transaction(...)`: raw transaction bytes.
- `new ScriptPubkey(...)`: raw script bytes.

### Hash Strings Are Display-Endian

`BlockHash.toString()` and `Txid.toString()` reverse native little-endian bytes into standard Bitcoin display hex.

```ts
const displayHash = block.blockHash.toString();
const internalBytes = block.blockHash.toBytes();
```

### Native Pointers Have Lifetimes

Owned wrappers should be disposed when finished:

```ts
const block = Block.fromBytes(raw);
try {
  console.log(block.blockHash.toString());
} finally {
  block.dispose();
}
```

Borrowed views are tied to their parent:

```ts
const tx = block.transactions.get(0); // view tied to block
```

Keep `block` alive while using `tx`.

### Lazy Sequences Pull From Native Memory

Sequence wrappers such as `TransactionSequence`, `TransactionInputSequence`, and `BlockTreeEntrySequence` expose:

- `.length`
- `.get(index)`
- `.get(-1)`
- `.slice(start, end)`
- `for...of`

They do not eagerly copy the entire native collection.

## Error Handling Pattern

```ts
import {
  KernelException,
  ProcessBlockException,
  ScriptVerifyException,
} from "js-bitcoinkernel";

try {
  chainman.processBlock(block);
} catch (error) {
  if (error instanceof ProcessBlockException) {
    console.error(error.code);
  } else if (error instanceof KernelException) {
    console.error(error.message);
  } else {
    throw error;
  }
}
```

## Stability Notes

The root export is the intended stable API surface. Some source files export additional helpers for tests or internal use, but they are not re-exported from `index.ts`. This reference clearly labels those cases when relevant.

One current packaging wrinkle is `notifications.ts`: `ContextOptions` exposes `set_notifications(...)`, but `NotificationInterfaceCallbacks` is not exported from the package root. Use the [Notifications](/api/notifications) page only if you are comfortable importing a direct built submodule until the root export changes.
