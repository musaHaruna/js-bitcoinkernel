# Blocks API

The block module wraps Bitcoin block hashes, headers, full blocks, block index entries, validation state, and undo data.

## Example

```ts
import {
  Block,
  BlockCheckFlags,
  ChainParameters,
  ChainType,
  ValidationMode,
} from "js-bitcoinkernel";

const block = Block.fromBytes(Buffer.from(rawBlockHex, "hex"));
const params = new ChainParameters(ChainType.REGTEST);
const state = block.check(params.consensusParams, BlockCheckFlags.ALL);

console.log(block.blockHash.toString());
console.log(state.validationMode === ValidationMode.VALID);
```

## `BlockCheckFlags`

Purpose: bitflags controlling optional context-free block checks.

| Member | Value | Meaning |
| --- | ---: | --- |
| `BASE` | `0` | Baseline structural checks. |
| `POW` | `1 << 0` | Verify proof of work. |
| `MERKLE` | `1 << 1` | Verify the block body matches the header Merkle root. |
| `ALL` | `POW | MERKLE` | Enable all optional checks. |

Inputs: passed to `Block.check(consensusParams, flags)`.

Returns: not returned directly; it changes validation behavior.

Errors and caveats: `BASE` alone can accept a block whose Merkle root has been mutated because Merkle verification is not requested.

## `ValidationMode`

Purpose: high-level validation outcome.

| Member | Meaning |
| --- | --- |
| `VALID` | Validation completed successfully. |
| `INVALID` | Consensus or structural rules rejected the object. |
| `INTERNAL_ERROR` | Native execution or environment failed. |

Inputs: read from `BlockValidationState.validationMode`.

Returns: enum value.

Errors and caveats: inspect `blockValidationResult` for a block-specific failure reason when mode is `INVALID`.

## `BlockHash`

Purpose: wrapper for a 32-byte block hash.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `BlockHash.fromBytes(bytes)` | `Uint8Array` of exactly 32 bytes in internal byte order. | Owned `BlockHash`. | Throws if length is not 32 or native allocation fails. |
| `toBytes()` | None. | 32-byte `Uint8Array` in internal byte order. | Throws if binding is unavailable. |
| `toString()` | None. | 64-character display-endian hex string. | Reverses bytes for standard Bitcoin display. |
| `equals(other)` | Any value. | `boolean`. | Returns false for non-`BlockHash`; can throw if native equality binding is unavailable. |
| `copy()` | None. | Owned copy. | Throws if object is disposed or copy binding is unavailable. |

Usage:

```ts
const hash = BlockHash.fromBytes(new Uint8Array(32));
console.log(hash.toString());
hash.dispose();
```

## `BlockHeader`

Purpose: wrapper for an 80-byte Bitcoin block header.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `BlockHeader.fromBytes(rawHeader)` | `Uint8Array` of exactly 80 bytes. | Owned `BlockHeader`. | Throws on wrong length or native parse failure. |
| `blockHash` | None. | Owned `BlockHash`. | Computes the double-SHA256 header hash. |
| `prevHash` | None. | Borrowed `BlockHash` view. | Keep the header alive while using it. |
| `timestamp` | None. | JavaScript `Date`. | Converts native Unix seconds to milliseconds. |
| `bits` | None. | `number`. | Compact target field. |
| `version` | None. | `number`. | Signed 32-bit header version. |
| `nonce` | None. | `number`. | 32-bit proof-of-work nonce. |
| `toBytes()` | None. | 80-byte `Uint8Array`. | Throws if serialization fails. |
| `copy()` | None. | Owned copy. | Throws if disposed. |

Usage:

```ts
const header = BlockHeader.fromBytes(Buffer.from(headerHex, "hex"));
console.log(header.blockHash.toString());
console.log(header.timestamp.toISOString());
```

## `BlockValidationResult`

Purpose: detailed block rejection reason.

| Member | Meaning |
| --- | --- |
| `UNSET` | No block-specific rejection reason. Valid blocks usually remain unset. |
| `CONSENSUS` | Failed consensus rules. |
| `CACHED_INVALID` | Known invalid block. |
| `INVALID_HEADER` | Header failed proof-of-work or time constraints. |
| `MUTATED` | Block body does not match the committed Merkle root. |
| `MISSING_PREV` | Previous block is unknown. |
| `INVALID_PREV` | Previous block is known invalid. |
| `TIME_FUTURE` | Timestamp is too far in the future. |
| `HEADER_LOW_WORK` | Header branch does not meet minimum work expectations. |

Usage:

```ts
if (state.blockValidationResult === BlockValidationResult.MUTATED) {
  console.error("Merkle root mismatch");
}
```

## `BlockValidationState`

Purpose: native validation result container.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `new BlockValidationState()` | None. | Owned state object. | Throws if native allocation fails. |
| `validationMode` | None. | `ValidationMode`. | Throws if binding unavailable. |
| `blockValidationResult` | None. | `BlockValidationResult`. | `UNSET` for valid blocks. |
| `copy()` | None. | Owned copy. | Throws if disposed. |

Usage:

```ts
const state = block.check(params.consensusParams);
console.log(state.validationMode, state.blockValidationResult);
```

## `BlockTreeEntry`

Purpose: view of a block index node in the native block tree.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `blockHash` | None. | Borrowed `BlockHash` view. | Entry must remain alive. |
| `height` | None. | `number`. | Genesis is height `0`. |
| `previous` | None. | Borrowed `BlockTreeEntry` view. | Genesis has no meaningful previous entry. |
| `blockHeader` | None. | Owned `BlockHeader`. | Independent copy. |
| `getAncestor(height)` | Target height. | Borrowed `BlockTreeEntry`. | Throws `RangeError` outside `[0, this.height]`. |
| `equals(other)` | Any value. | `boolean`. | Compares native identity. |

Usage:

```ts
const tip = chainman.getActiveChain().blockTreeEntries.get(-1);
const genesis = tip.getAncestor(0);
console.log(genesis.blockHash.toString());
```

## `TransactionSequence`

Purpose: lazy sequence of transactions inside a block.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `length` | None. | Transaction count. | Cached after first native lookup. |
| `get(index)` | Positive or negative index. | Borrowed `Transaction` view. | Throws `RangeError` out of bounds. |
| `slice(start, end)` | Optional bounds. | Array of transaction views. | Views remain tied to the block. |
| iterator | None. | Transactions in order. | Do not dispose parent block while iterating. |

Usage:

```ts
for (const tx of block.transactions) {
  console.log(tx.txid.toString());
}
```

## `Block`

Purpose: wrapper for a full serialized Bitcoin block.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `Block.fromBytes(rawBlock)` | Serialized block bytes. | Owned `Block`. | Throws if native decode fails. |
| `blockHash` | None. | Owned `BlockHash`. | Hash of the header. |
| `blockHeader` | None. | Owned `BlockHeader`. | Independent header copy. |
| `transactions` | None. | `TransactionSequence`. | Transaction views are tied to the block. |
| `toBytes()` | None. | Serialized block bytes. | Uses callback streaming; throws on callback/native errors. |
| `check(consensusParams, flags?)` | `ConsensusParams`, optional `BlockCheckFlags`. | Owned `BlockValidationState`. | Throws if native status and state disagree or binding is missing. |
| `copy()` | None. | Owned copy. | Throws if disposed. |

Usage:

```ts
const block = Block.fromBytes(Buffer.from(rawBlockHex, "hex"));
const firstTx = block.transactions.get(0);
console.log(firstTx.toString());
```

## `BlockSpentOutputs`

Purpose: wrapper for block undo data, also called spent outputs.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `transactions` | None. | `TransactionSpentOutputsSequence`. | Excludes coinbase because coinbase spends no previous output. |
| `copy()` | None. | Owned copy. | Usually obtained from `chainman.blockSpentOutputs.get(entry)`. |

Usage:

```ts
const undo = chainman.blockSpentOutputs.get(entry);
for (const spent of undo.transactions) {
  console.log(spent.coins.length);
}
```

## `TransactionSpentOutputsSequence`

Purpose: lazy sequence of per-transaction spent-output records inside block undo data.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `length` | None. | Number of non-coinbase transaction undo entries. | Cached after first lookup. |
| `get(index)` | Positive or negative index. | Borrowed `TransactionSpentOutputs`. | Throws out of bounds or on missing native pointer. |
| iterator | None. | Spent-output records in block order. | Views are tied to `BlockSpentOutputs`. |

Usage:

```ts
for (const spent of undo.transactions) {
  for (const coin of spent.coins) {
    console.log(coin.output.amount);
  }
}
```
