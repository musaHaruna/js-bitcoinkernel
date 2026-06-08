# Validation Callback API

Validation callbacks let application code observe native block validation lifecycle events.

## Example

```ts
import {
  Block,
  BlockTreeEntry,
  ChainType,
  ValidationInterfaceCallbacks,
  loadChainman,
} from "js-bitcoinkernel";

const callbacks = new ValidationInterfaceCallbacks({
  block_connected(block: Block, entry: BlockTreeEntry) {
    console.log(`connected ${entry.height} ${block.blockHash}`);
  },
});

const chainman = loadChainman("/tmp/kernel-callbacks", ChainType.REGTEST, callbacks);
```

## `ValidationInterfaceCallbacks`

Purpose: converts high-level JavaScript callback functions into a native struct shape accepted by `ContextOptions`.

| Constructor input | Returns | Errors and caveats |
| --- | --- | --- |
| Object with optional validation hooks. | Native-struct-like object. | Throws if an unknown callback key is supplied. Constructor returns a plain payload object rather than a normal class instance. |

Supported hooks:

| Hook | Parameters | Purpose |
| --- | --- | --- |
| `block_checked` | `(block: Block, state: BlockValidationState)` | Called after a block completes context-free checking. |
| `pow_valid_block` | `(block: Block, entry: BlockTreeEntry)` | Called when a block extends the header chain and proof of work is valid. |
| `block_connected` | `(block: Block, entry: BlockTreeEntry)` | Called when a block connects to the active best chain. |
| `block_disconnected` | `(block: Block, entry: BlockTreeEntry)` | Called during a reorganization when a block disconnects. |

Return values: callbacks return `void`; the constructor returns a struct-compatible object used by the FFI layer.

Errors:

- Unknown keys throw immediately.
- Native callback registration can fail if `koffi` is unavailable.
- Callback code that throws may surface during native operations.

Caveats:

- Callback objects are anchored by `Context` and `ChainstateManager` to prevent garbage collection.
- Block callback arguments may own native handles. Dispose objects you intentionally keep, but do not dispose borrowed `BlockTreeEntry` views.
- The constructor behavior is unusual: `new ValidationInterfaceCallbacks(...)` returns the payload object used by native code.

## Attach Callbacks Manually

```ts
const callbacks = new ValidationInterfaceCallbacks({
  block_checked(block, state) {
    console.log(block.blockHash.toString(), state.validationMode);
  },
});

const options = new ContextOptions();
options.set_validation_interface(callbacks);
const context = new Context(options);
```

## Attach Callbacks With `loadChainman`

```ts
const chainman = loadChainman(
  "/tmp/kernel-callbacks",
  ChainType.REGTEST,
  callbacks,
);
```

## Direct-Module Exports

`validation.ts` also exports the `ValidationCallbacks` TypeScript interface and `defaultValidationCallbacks`, but only `ValidationInterfaceCallbacks` is re-exported from the package root.
