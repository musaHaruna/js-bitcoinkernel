# Chainstate API

The chain module configures Bitcoin network parameters, creates chainstate managers, and exposes active-chain, block-index, block-storage, and undo-data views.

## Example

```ts
import {
  Block,
  ChainParameters,
  ChainstateManager,
  ChainstateManagerOptions,
  ChainType,
  Context,
  ContextOptions,
} from "js-bitcoinkernel";

const contextOptions = new ContextOptions();
contextOptions.set_chainparams(new ChainParameters(ChainType.REGTEST));

const context = new Context(contextOptions);
const managerOptions = new ChainstateManagerOptions(
  context,
  "/tmp/kernel-regtest",
  "/tmp/kernel-regtest/blocks",
);

const chainman = new ChainstateManager(managerOptions);
const block = Block.fromBytes(Buffer.from(rawBlockHex, "hex"));

console.log(chainman.processBlock(block));
```

## `ChainType`

Purpose: selects the Bitcoin network ruleset.

| Member | Meaning |
| --- | --- |
| `MAINNET` | Main Bitcoin network. |
| `TESTNET` | Legacy testnet. |
| `TESTNET_4` | Testnet4. |
| `SIGNET` | Signet. |
| `REGTEST` | Local regression-test network. |

Inputs: passed to `new ChainParameters(chainType)`, `makeContext(...)`, or `loadChainman(...)`.

Returns: enum value.

Errors and caveats: the native library must support the selected network type.

## `ConsensusParams`

Purpose: borrowed view of consensus parameters for a `ChainParameters` instance.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| constructor | Native pointer only. | Wrapper view. | Usually not constructed by users. |

Usage:

```ts
const params = new ChainParameters(ChainType.REGTEST);
const state = block.check(params.consensusParams);
```

Keep the parent `ChainParameters` alive while using the borrowed `ConsensusParams` view.

## `ChainParameters`

Purpose: network-specific parameter container.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `new ChainParameters(chainType)` | `ChainType`. | Owned `ChainParameters`. | Throws if native allocation fails. |
| `consensusParams` | None. | Borrowed `ConsensusParams`. | Parent must remain alive. |
| `copy()` | None. | Owned copy. | Throws if disposed or copy binding unavailable. |

Usage:

```ts
const chainParams = new ChainParameters(ChainType.SIGNET);
console.log(chainParams.consensusParams);
```

## `ChainstateManagerOptions`

Purpose: configuration builder for `ChainstateManager`.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `new ChainstateManagerOptions(context, datadir, blocksDir)` | `Context`, data dir, blocks dir. | Owned options object. | Paths are UTF-8 encoded and passed to native code. |
| `setWipeDbs(wipeBlockTreeDb, wipeChainstateDb)` | Two booleans. | `0` on success, nonzero on invalid combination/failure. | Wiping block tree without chainstate is invalid. |
| `setWorkerThreadsNum(workerThreads)` | Number. | `void`. | Native layer clamps values. |
| `updateBlockTreeDbInMemory(value)` | Boolean. | `void`. | Useful for tests. |
| `updateChainstateDbInMemory(value)` | Boolean. | `void`. | Useful for tests. |

Usage:

```ts
const options = new ChainstateManagerOptions(context, datadir, blocksDir);
options.setWorkerThreadsNum(4);
options.updateBlockTreeDbInMemory(true);
options.updateChainstateDbInMemory(true);
```

## `Chain`

Purpose: live view of the active best chain.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `height` | None. | Active tip height. | Changes after block processing or reorgs. |
| `blockTreeEntries` | None. | `BlockTreeEntrySequence`. | Height-indexed lazy sequence. |
| `length` | None. | `height + 1`. | Includes genesis. |

Usage:

```ts
const chain = chainman.getActiveChain();
const tip = chain.blockTreeEntries.get(chain.height);
console.log(tip.blockHash.toString());
```

Do not assume a `Chain` view is immutable. It reflects native chainstate.

## `BlockTreeEntrySequence`

Purpose: lazy, height-indexed sequence over the active chain.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `length` | None. | Number of entries. | Equivalent to `chain.height + 1`. |
| `get(index)` | Positive or negative index. | Borrowed `BlockTreeEntry`. | View tied to the parent chain. |
| `slice(start, end)` | Optional bounds. | Array of entries. | No snapshot isolation. |
| `contains(other)` | Candidate object. | `boolean`. | True only if entry belongs to active chain. |
| iterator | None. | Entries from genesis to tip. | Do not mutate chain while iterating. |

Usage:

```ts
for (const entry of chain.blockTreeEntries.slice(-10)) {
  console.log(entry.height, entry.blockHash.toString());
}
```

## `ChainstateManager`

Purpose: native validation, storage, and active-chain coordinator.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `new ChainstateManager(options)` | `ChainstateManagerOptions`. | Owned manager. | Native databases may lock data directory. |
| `blockTreeEntries` | None. | `BlockTreeEntryMap`. | All known headers/entries, not only active chain. |
| `blocks` | None. | `BlockMap`. | Reads raw block data from disk. |
| `blockSpentOutputs` | None. | `BlockSpentOutputsMap`. | Reads undo data from disk. |
| `bestEntry` | None. | Borrowed `BlockTreeEntry`. | Best-work entry known to manager. |
| `getActiveChain()` | None. | Borrowed `Chain` view. | Changes after processing. |
| `importBlocks(paths)` | Array of path-like values. | `boolean`. | Imports block files by path. Empty array returns falsey. |
| `processBlock(block)` | `Block`. | `boolean` for new block. | Throws `ProcessBlockException` on native error. |
| `processBlockHeader(header)` | `BlockHeader`. | Owned `BlockValidationState`. | Throws `ProcessBlockHeaderException` on native error. |

Usage:

```ts
const wasNew = chainman.processBlock(block);
const activeTip = chainman.getActiveChain().blockTreeEntries.get(-1);
console.log({ wasNew, tip: activeTip.blockHash.toString() });
```

## `BlockMap`

Purpose: dictionary-like reader for full blocks stored on disk.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `has(entry)` | `BlockTreeEntry`. | `boolean`. | Frees transient native block immediately. |
| `get(entry)` | `BlockTreeEntry`. | Owned `Block`. | Throws if block cannot be read. |

Usage:

```ts
if (chainman.blocks.has(tip)) {
  const block = chainman.blocks.get(tip);
  console.log(block.transactions.length);
  block.dispose();
}
```

## `BlockSpentOutputsMap`

Purpose: dictionary-like reader for block undo data.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `has(entry)` | `BlockTreeEntry`. | `boolean`. | Always false for genesis. |
| `get(entry)` | `BlockTreeEntry`. | Owned `BlockSpentOutputs`. | Throws `RangeError` for genesis or if data is missing. |

Usage:

```ts
if (chainman.blockSpentOutputs.has(entry)) {
  const undo = chainman.blockSpentOutputs.get(entry);
  console.log(undo.transactions.length);
}
```

## `BlockTreeEntryMap`

Purpose: dictionary-like lookup from block hash to block index entry.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `has(hash)` | `BlockHash`. | `boolean`. | Searches all known block tree entries. |
| `get(hash)` | `BlockHash`. | Borrowed `BlockTreeEntry`. | Throws if hash is absent. |

Usage:

```ts
const entry = chainman.blockTreeEntries.get(block.blockHash);
console.log(entry.height);
```
