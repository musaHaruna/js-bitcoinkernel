# Bootstrap Helpers

The init module re-exports the public API and provides convenience helpers for common setup flows.

## `makeContext(chainType?, validationCallbacks?)`

Purpose: create a configured `Context` with network parameters and optional validation callbacks.

| Parameter | Type | Default | Meaning |
| --- | --- | --- | --- |
| `chainType` | `ChainType` | `ChainType.REGTEST` | Network rules to use. |
| `validationCallbacks` | `ValidationInterfaceCallbacks \| null` | `undefined` | Optional native validation callback payload. |

Returns: owned `Context`.

Errors:

- Throws if chain parameters, context options, or context creation fail.
- Throws if native bindings are unavailable.

Usage:

```ts
import { ChainType, makeContext } from "js-bitcoinkernel";

const context = makeContext(ChainType.SIGNET);
```

Caveat: the helper creates a temporary `ChainParameters` and `ContextOptions`. Keep the returned `Context` alive while dependent chainstate objects exist.

## `loadChainman(datadir, chainType?, validationCallbacks?)`

Purpose: create a ready-to-use `ChainstateManager` for a data directory.

| Parameter | Type | Default | Meaning |
| --- | --- | --- | --- |
| `datadir` | `string` | Required | Base data directory. |
| `chainType` | `ChainType` | `ChainType.REGTEST` | Network rules to use. |
| `validationCallbacks` | `ValidationInterfaceCallbacks \| null` | `undefined` | Optional validation callback payload. |

Returns: owned `ChainstateManager`.

Errors:

- Throws if native context or manager creation fails.
- Native database code may fail if the data directory is locked or invalid.

Usage:

```ts
import { ChainType, loadChainman } from "js-bitcoinkernel";

const chainman = loadChainman("/tmp/kernel-regtest", ChainType.REGTEST);
console.log(chainman.getActiveChain().height);
```

Caveats:

- Uses `<datadir>/blocks` as the block storage path.
- Resolves `datadir` to an absolute path before passing it to native code.
- Do not share the directory with a running `bitcoind`.
