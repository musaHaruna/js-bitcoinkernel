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
    using hash = block.blockHash;
    console.log(`connected ${entry.height} ${hash}`);
  },
});

const chainman = loadChainman("/tmp/kernel-callbacks", ChainType.REGTEST, callbacks);
```

## `ValidationInterfaceCallbacks`

Purpose: converts high-level JavaScript callback functions into a native struct shape accepted by `ContextOptions`.

| Constructor input | Returns | Errors and caveats |
| --- | --- | --- |
| Object with optional validation hooks. | `ValidationInterfaceCallbacks` instance. | Throws for unknown keys or non-function handlers. |

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
- Native callback registration occurs when attaching to context options.
- Callback code that throws may surface during native operations.

Caveats:

- Registrations remain active until the last native owner is destroyed, including context copies and managers. Creating an unattached callback object consumes no native callback slots.
- Callbacks are synchronous. Their `block`, `state`, and `entry` arguments are valid during the callback only. The wrapper frees the transferred block and invalidates borrowed arguments on return, including when a handler throws.
- To retain block or state data, call `copy()` inside the callback and later dispose the copy. A state can also be retained with `detach()`. A block is already owned, so `block.detach()` does not retain it beyond the callback; use `block.copy()`.
- Entries cannot be copied. Store the height and hash bytes, then look up the entry again through a live manager.
- A callback exception does not roll back native work already performed. Keep handlers short and handle application errors explicitly.

## Attach Callbacks Manually

```ts
const callbacks = new ValidationInterfaceCallbacks({
  block_checked(block, state) {
    using hash = block.blockHash;
    console.log(hash.toString(), state.validationMode);
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

`validation.ts` also exports the `ValidationCallbacks` TypeScript interface and `defaultValidationCallbacks`, and the package root re-exports `ValidationCallbacks` as a type alongside `ValidationInterfaceCallbacks`.
