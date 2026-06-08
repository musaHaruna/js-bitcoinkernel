# Context API

The context module creates the root native kernel runtime context. Most chainstate work starts with `ContextOptions`, then `Context`, then `ChainstateManagerOptions`.

## Example

```ts
import {
  ChainParameters,
  ChainType,
  Context,
  ContextOptions,
} from "js-bitcoinkernel";

const options = new ContextOptions();
options.set_chainparams(new ChainParameters(ChainType.REGTEST));

const context = new Context(options);
console.log(context.toString());
```

## `ContextOptions`

Purpose: native configuration builder used before creating a `Context`.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `new ContextOptions()` | None. | Owned options object. | Throws if native allocation fails. |
| `set_chainparams(chainParameters)` | `ChainParameters`. | `void`. | The provided parameters should stay alive until context creation. |
| `set_notifications(notifications)` | `NotificationInterfaceCallbacks`. | `void`. | The notifications class is not exported from the package root. See [Notifications](/api/notifications). |
| `set_validation_interface(interfaceCallbacks)` | `ValidationInterfaceCallbacks`. | `void`. | Anchors callbacks to prevent garbage collection. |

Usage:

```ts
const options = new ContextOptions();
options.set_chainparams(new ChainParameters(ChainType.SIGNET));
```

## `Context`

Purpose: root runtime object for the native kernel.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `new Context(options)` | `ContextOptions`. | Owned `Context`. | Throws if native context creation fails. |
| `copy()` | None. | Owned copy. | Preserves JS-side callback anchors. |
| `interrupt()` | None. | Native status code as `number`. | Signals active native work to stop. |
| `toString()` | None. | Diagnostic string. | Includes native pointer address. |

Usage:

```ts
const context = new Context(options);
try {
  // Use context to create ChainstateManagerOptions.
} finally {
  context.dispose();
}
```

## Callback Lifetime

When callbacks are attached through `ContextOptions`, the wrapper keeps references to the JavaScript callback objects. This prevents V8 from collecting callback trampolines while the native kernel still owns function pointers.

```ts
const callbacks = new ValidationInterfaceCallbacks({
  block_connected(block, entry) {
    console.log(entry.height, block.blockHash.toString());
  },
});

const options = new ContextOptions();
options.set_validation_interface(callbacks);
const context = new Context(options);
```

Keep the resulting `Context` or `ChainstateManager` alive for as long as native code may emit callbacks.
