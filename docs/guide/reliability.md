# Reliability changes

The first reliability pass kept the bundled Bitcoin dependency unchanged. The current native upgrade pins a newer Bitcoin Core snapshot and adds header Merkle roots, witness stacks, wtxids, transaction validation state, custom signet challenges, database-cache configuration, and mock time.

## Correctness fixes

| Area | Failure | Corrected behavior |
| --- | --- | --- |
| Logging ABI | Incorrect callback argument order and packed struct alignment could abort the process. | Natural C alignment, correct argument order, and byte-length UTF-8 decoding. |
| Callback lifetime | Logging used a transient callback; notifications passed the wrapper instead of its payload; validation registrations leaked. | Persistent registrations, correct payloads, and release when the last native owner is destroyed. |
| Header processing | An owned pointer return was declared as an integer with an extra output argument. | Returns an owned `BlockValidationState`; invalid headers carry an invalid state. |
| Block serialization | Returning `1` from the writer stopped serialization, while the wrapper treated the failure as success. | Shared zero-on-success writer returns the complete block. |
| Null pointers | Checks against only `0n` missed Koffi's `null`, including map membership tests. | Missing lookups return `false` or throw; genesis `previous` returns `null`. |
| Imports | Native zero-on-success result was inverted. | `importBlocks()` returns `true` on success, including an empty batch. |
| Ownership | Borrowed descendants could access freed native memory, and disposed views remained usable. | Parent-chain and handle checks reject stale access, copying, and detachment. |
| Precomputation | The copy path called the transaction-only constructor with a pointer; spent-output marshalling was fragile. | Pointer constructor overload and a native-width pointer buffer; input-count validation. |
| Input validation | Invalid indices, flags, enums, and counts could reach native assertions. Unsafe amounts could be rounded. | JavaScript exceptions before entering C. |
| Temporary resources | Bootstrap helpers and block stringification leaked owned intermediates. | Deterministic cleanup on success and failure. |
| Logging utilities | Nested category scopes disabled outer scopes; fractional timestamps failed parsing. | Scope reference counts and fractional timestamp support. |

## Ownership and compatibility

Use `using` in TypeScript or `try/finally` with `dispose()` for owned native objects. This library does not automatically reclaim owned pointers through JavaScript garbage collection. `copy()` returns an independent owned wrapper; `detach()` promotes a borrowed wrapper to ownership. Detaching a parent invalidates previously obtained descendants into its old storage; fetch those descendants again afterward.

Validation callback arguments now have an explicit callback lifetime. Copy a block or state inside the callback to retain it, and dispose the copy when finished. Store entry heights/hash bytes instead of retaining callback entries. See [validation callbacks](../api/validation.md).

Other observable corrections:

- `BlockTreeEntry.previous` is nullable at genesis.
- `importBlocks()` reports successful completion as `true`.
- `NotificationInterfaceCallbacks`, `SynchronizationState`, and callback option types are available from the package root.
- Invalid numeric arguments fail early with `RangeError`.
- `ValidationInterfaceCallbacks` remains an actual class instance.
- Header validation failures are represented by the returned validation state, rather than an exception for an incorrectly interpreted pointer.

## Verification

```bash
npm test
npm run type-check
npm run lint
npm run build
npm run docs:build
```

The tests use Node's test runner, named cases, assertions, isolated temporary databases, and cleanup with `using`. Tests run in separate processes so global native logging state does not leak between files. Both source and tests are type-checked.

Regression coverage includes complete serialization, native logging, callback ownership and slot reclamation, invalid-input guards, all 206 regtest fixture blocks, spent-coin undo data, a locally mined competing-chain reorganization, nonempty UTF-8 block-file imports, database reopen, and signet genesis initialization. Signet coverage is local initialization, not a live-network sync.
