# Transactions API

The transaction module wraps Bitcoin transactions, txids, inputs, outpoints, outputs, UTXO coins, and spent-output undo collections.

## Example

```ts
import { Transaction } from "js-bitcoinkernel";

const tx = new Transaction(Buffer.from(rawTxHex, "hex"));

console.log(tx.txid.toString());
console.log(tx.inputs.length);
console.log(tx.outputs.get(0).amount);
```

## `Txid`

Purpose: wrapper for a transaction identifier.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `toBytes()` | None. | 32-byte internal-order bytes. | Throws if binding unavailable. |
| `toString()` | None. | 64-character display-endian txid hex. | Reverses native bytes. |
| `equals(other)` | Any value. | `boolean`. | False for non-`Txid`; native compare for txids. |
| `copy()` | None. | Owned copy. | Throws if disposed. |
| `detach()` | None. | Same instance, now owned. | Useful when keeping a borrowed txid after parent disposal. |

Usage:

```ts
const txid = tx.txid.detach();
tx.dispose();
console.log(txid.toString());
txid.dispose();
```

## `TransactionOutPoint`

Purpose: identifies the previous output spent by an input.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `index` | None. | Output index as `number`. | Also called `vout`. |
| `txid` | None. | Borrowed `Txid` view. | Keep outpoint alive. |
| `toString()` | None. | `txid=<hex> index=<n>`. | Diagnostic format. |
| `copy()` | None. | Owned copy. | Throws if disposed. |

Usage:

```ts
const input = tx.inputs.get(0);
console.log(input.outPoint.txid.toString(), input.outPoint.index);
```

## `TransactionInput`

Purpose: wrapper for a transaction input.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `outPoint` | None. | Borrowed `TransactionOutPoint`. | Tied to input lifetime. |
| `sequence` | None. | 32-bit sequence number. | Used for RBF and relative locktime semantics. |
| `toString()` | None. | Outpoint summary. | Diagnostic only. |
| `copy()` | None. | Owned copy. | Throws if disposed. |

Usage:

```ts
for (const input of tx.inputs) {
  console.log(input.sequence);
}
```

## `TransactionOutput`

Purpose: wrapper for a transaction output.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `new TransactionOutput(scriptPubkey, amount)` | `ScriptPubkey`, satoshi amount. | Owned output. | Throws if native allocation fails. |
| `amount` | None. | `bigint`. | Satoshis. |
| `scriptPubkey` | None. | Borrowed `ScriptPubkey`. | Keep output alive. |
| `toString()` | None. | Diagnostic summary. | Includes amount and script length. |
| `copy()` | None. | Owned copy. | Throws if disposed. |

Usage:

```ts
const output = tx.outputs.get(0);
console.log(output.amount, output.scriptPubkey.toHex());
```

## `TransactionInputSequence`

Purpose: lazy sequence of transaction inputs.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `length` | None. | Input count. | Cached after first lookup. |
| `get(index)` | Positive or negative index. | Borrowed `TransactionInput`. | Throws out of bounds. |
| `slice(start, end)` | Optional bounds. | Array of input views. | Views tied to transaction. |
| iterator | None. | Inputs in order. | Keep parent transaction alive. |

Usage:

```ts
const lastInput = tx.inputs.get(-1);
```

## `TransactionOutputSequence`

Purpose: lazy sequence of transaction outputs.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `length` | None. | Output count. | Cached after first lookup. |
| `get(index)` | Positive or negative index. | Borrowed `TransactionOutput`. | Throws out of bounds. |
| `slice(start, end)` | Optional bounds. | Array of output views. | Views tied to transaction. |
| iterator | None. | Outputs in order. | Keep parent transaction alive. |

Usage:

```ts
for (const output of tx.outputs) {
  console.log(output.amount);
}
```

## `Transaction`

Purpose: wrapper for a full Bitcoin transaction.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `new Transaction(data)` | Raw transaction bytes. | Owned transaction. | Throws if native parsing fails. |
| `inputs` | None. | `TransactionInputSequence`. | Lazy native views. |
| `outputs` | None. | `TransactionOutputSequence`. | Lazy native views. |
| `txid` | None. | Borrowed `Txid` view. | Keep transaction alive or detach/copy txid. |
| `locktime` | None. | `number`. | Raw `nLockTime`. |
| `toBytes()` | None. | Serialized transaction bytes. | Uses native byte writer. |
| `toString()` | None. | Txid/input/output summary. | Diagnostic only. |
| `copy()` | None. | Owned copy. | Throws if disposed. |

Usage:

```ts
const tx = new Transaction(Buffer.from(rawTxHex, "hex"));
console.log(tx.toBytes().length);
```

## `Coin`

Purpose: wrapper for a UTXO record read from undo data.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `confirmationHeight` | None. | Block height. | Height where coin was created. |
| `isCoinbase` | None. | `boolean`. | Coinbase outputs have maturity rules. |
| `output` | None. | Borrowed `TransactionOutput`. | Keep coin alive. |
| `toString()` | None. | Diagnostic summary. | Includes height, amount, coinbase. |
| `copy()` | None. | Owned copy. | Throws if disposed. |

Usage:

```ts
for (const coin of spent.coins) {
  console.log(coin.confirmationHeight, coin.output.amount);
}
```

## `CoinSequence`

Purpose: iterable sequence of coins spent by a transaction.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `length` | None. | Coin count. | Cached after first lookup. |
| `get(index)` | Zero-based index. | Borrowed `Coin`. | Throws `RangeError` out of bounds. |
| iterator | None. | Coins in order. | Views tied to `TransactionSpentOutputs`. |

Usage:

```ts
const firstCoin = spent.coins.get(0);
```

## `TransactionSpentOutputs`

Purpose: per-transaction undo data describing coins consumed by that transaction.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `coins` | None. | `CoinSequence`. | Ordered with transaction inputs. |
| `toString()` | None. | Diagnostic summary. | Shows coin count. |
| `copy()` | None. | Owned copy. | Usually obtained from `BlockSpentOutputs.transactions`. |

Usage:

```ts
const undo = chainman.blockSpentOutputs.get(entry);
const spent = undo.transactions.get(0);
console.log(spent.coins.length);
```
