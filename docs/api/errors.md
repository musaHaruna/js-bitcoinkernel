# Errors API

The error module exposes wrapper-specific exceptions. Native functions may also throw ordinary `Error` instances when a binding is unavailable, a pointer is null, or parsing fails.

## `KernelException`

Purpose: base class for library-specific exceptions.

| Constructor input | Returns | Errors and caveats |
| --- | --- | --- |
| Optional message string. | `KernelException`. | Extends `Error` and restores prototype chain. |

Usage:

```ts
try {
  script.verify(amount, tx, null, 0, flags);
} catch (error) {
  if (error instanceof KernelException) {
    console.error(error.message);
  }
}
```

## `ProcessBlockException`

Purpose: thrown when `ChainstateManager.processBlock(...)` returns a native error status.

| Constructor input | Returns | Properties |
| --- | --- | --- |
| `code: number` | `ProcessBlockException`. | `.code` contains the native status code. |

Usage:

```ts
try {
  chainman.processBlock(block);
} catch (error) {
  if (error instanceof ProcessBlockException) {
    console.error(`processBlock failed with code ${error.code}`);
  }
}
```

Common causes:

- Invalid block structure.
- Missing or invalid previous state.
- Script or consensus failure.
- Native I/O failure.

## `ProcessBlockHeaderException`

Purpose: thrown when `ChainstateManager.processBlockHeader(...)` returns a native error status.

| Constructor input | Returns | Properties |
| --- | --- | --- |
| `code: number` | `ProcessBlockHeaderException`. | `.code` contains the native status code. |

Usage:

```ts
try {
  const state = chainman.processBlockHeader(header);
  console.log(state.validationMode);
} catch (error) {
  if (error instanceof ProcessBlockHeaderException) {
    console.error(`processBlockHeader failed with code ${error.code}`);
  }
}
```

Common causes:

- Invalid proof of work.
- Header timestamp outside consensus bounds.
- Unknown or invalid previous header.
- Insufficient accumulated work.

## Non-Exception Failures

Some APIs return validation state instead of throwing:

```ts
const state = block.check(params.consensusParams);
if (state.validationMode !== ValidationMode.VALID) {
  console.log(state.blockValidationResult);
}
```

Use exceptions for operational failures and validation state for consensus outcomes.
