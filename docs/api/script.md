# Scripts API

The script module wraps script pubkeys, script verification flags, Taproot/SegWit precomputation data, and script verification errors.

## Example

```ts
import {
  ScriptPubkey,
  ScriptVerificationFlags,
  Transaction,
} from "js-bitcoinkernel";

const scriptPubkey = new ScriptPubkey(Buffer.from(scriptHex, "hex"));
const tx = new Transaction(Buffer.from(txHex, "hex"));

const ok = scriptPubkey.verify(
  100000n,
  tx,
  null,
  0,
  ScriptVerificationFlags.ALL & ~ScriptVerificationFlags.TAPROOT,
);

console.log(ok);
```

## `ScriptVerificationFlags`

Purpose: bitflags that select script validation rules.

| Member | Meaning |
| --- | --- |
| `NONE` | No verification flags. |
| `P2SH` | Evaluate P2SH subscripts. |
| `DERSIG` | Enforce strict DER signatures. |
| `NULLDUMMY` | Enforce NULLDUMMY. |
| `CHECKLOCKTIMEVERIFY` | Enable CLTV. |
| `CHECKSEQUENCEVERIFY` | Enable CSV. |
| `WITNESS` | Enable SegWit witness validation. |
| `TAPROOT` | Enable Taproot rules. |
| `ALL` | Combine all supported flags. |

Usage:

```ts
const flags = ScriptVerificationFlags.ALL & ~ScriptVerificationFlags.TAPROOT;
```

Caveat: Taproot verification requires valid spent outputs and precomputed transaction data.

## `ScriptVerifyStatus`

Purpose: native status code for script verification.

| Member | Meaning |
| --- | --- |
| `OK` | Verification succeeded. |
| `ERROR_INVALID_FLAGS_COMBINATION` | The provided flags are not valid together. |
| `ERROR_SPENT_OUTPUTS_REQUIRED` | Taproot validation needs spent outputs. |

Usage:

```ts
try {
  script.verify(amount, tx, precomputed, inputIndex, flags);
} catch (error) {
  if (error instanceof ScriptVerifyException) {
    console.error(error.status);
  }
}
```

## `ScriptVerifyException`

Purpose: error thrown when native script verification fails with a non-OK status.

| Constructor inputs | Returns | Errors and caveats |
| --- | --- | --- |
| `status: ScriptVerifyStatus` | `ScriptVerifyException`. | Extends `KernelException`; exposes `.status`. |

Usage:

```ts
catch (error) {
  if (error instanceof ScriptVerifyException) {
    console.error(ScriptVerifyStatus[error.status]);
  }
}
```

## `PrecomputedTransactionData`

Purpose: native sighash/cache structure for verifying transaction inputs efficiently.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `new PrecomputedTransactionData(txTo, spentOutputs?)` | Spending `Transaction`, optional `TransactionOutput[]`. | Owned precomputed cache. | Taproot requires spent outputs. Throws if native allocation fails. |
| `copy()` | None. | Owned copy. | Throws if disposed or copy binding unavailable. |

Usage:

```ts
const precomputed = new PrecomputedTransactionData(tx, spentOutputs);
scriptPubkey.verify(amount, tx, precomputed, 0, ScriptVerificationFlags.ALL);
```

## `ScriptPubkey`

Purpose: wrapper for a raw Bitcoin output script.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `new ScriptPubkey(data)` | Raw script bytes. | Owned `ScriptPubkey`. | Throws if native allocation fails. |
| `toBytes()` | None. | Script bytes. | Uses native callback streaming. |
| `toHex()` | None. | Lowercase hex string. | Convenience wrapper around `toBytes()`. |
| `toString()` | None. | Same as `toHex()`. | Diagnostic display. |
| `verify(amount, txTo, precomputedTxdata, inputIndex, flags)` | Amount in sats, spending transaction, precomputed data or null, input index, flags. | `boolean`. | Throws `ScriptVerifyException` for native status errors. |
| `copy()` | None. | Owned copy. | Throws if disposed. |

Usage:

```ts
const p2pkh = new ScriptPubkey(
  Buffer.from("76a9140542e43d197f1a2e525d02e95ab70a2517e625a888ac", "hex"),
);

console.log(p2pkh.toHex());
```

Verification returns `true` for successful script execution. It can return `false` for failed evaluation or throw when the native status reports a structural verification error.
