# Logging API

The logging module configures native kernel logging and connects log messages to JavaScript callbacks.

Logging settings are global in the native kernel. Changing categories or levels affects all active logging connections.

## Example

```ts
import {
  KernelLogViewer,
  LogCategory,
  LogLevel,
  enable_log_category,
  set_log_level_category,
} from "js-bitcoinkernel";

set_log_level_category(LogCategory.ALL, LogLevel.DEBUG);
enable_log_category(LogCategory.KERNEL);

const viewer = new KernelLogViewer("kernel", [LogCategory.KERNEL]);
console.log(viewer.name);
```

## `LogCategory`

Purpose: selects native logging subsystem categories.

| Member | Meaning |
| --- | --- |
| `ALL` | All categories. |
| `BENCH` | Benchmarking diagnostics. |
| `BLOCKSTORAGE` | Block file and storage messages. |
| `COINDB` | Coin database messages. |
| `LEVELDB` | LevelDB messages. |
| `MEMPOOL` | Mempool messages. |
| `PRUNE` | Pruning messages. |
| `RAND` | Randomness messages. |
| `REINDEX` | Reindex messages. |
| `VALIDATION` | Validation messages. |
| `KERNEL` | Kernel lifecycle messages. |

Usage:

```ts
enable_log_category(LogCategory.VALIDATION);
```

## `LogLevel`

Purpose: native log severity threshold.

| Member | Meaning |
| --- | --- |
| `DEBUG` | Verbose diagnostics. |
| `INFO` | Informational messages. |

Usage:

```ts
set_log_level_category(LogCategory.ALL, LogLevel.INFO);
```

## `LoggingOptions`

Purpose: controls native log line formatting.

| Constructor inputs | Default | Meaning |
| --- | --- | --- |
| `log_timestamps` | `true` | Include timestamps. |
| `log_time_micros` | `false` | Include microseconds. |
| `log_threadnames` | `false` | Include thread names. |
| `log_sourcelocations` | `false` | Include source file and line. |
| `always_print_category_levels` | `false` | Always print category/level. |

Returns: a JS object with `toNativeStruct()` for the FFI binding.

Errors and caveats: formatting options are global once passed to `logging_set_options(...)`.

Usage:

```ts
const options = new LoggingOptions(true, false, true, true, true);
logging_set_options(options);
```

## `logging_set_options(options)`

Purpose: apply global native logging formatting.

Inputs: `LoggingOptions`.

Returns: `void`.

Errors: throws if the native binding is unavailable.

## `set_log_level_category(category, level)`

Purpose: set the minimum emitted log level for a category.

Inputs:

- `category`: `LogCategory`.
- `level`: `LogLevel`.

Returns: `void`.

Errors: throws if the native binding is unavailable.

## `enable_log_category(category)`

Purpose: enable a native logging category.

Inputs: `LogCategory`.

Returns: `void`.

Errors: throws if the native binding is unavailable.

## `disable_log_category(category)`

Purpose: disable a native logging category.

Inputs: `LogCategory`.

Returns: `void`.

Errors: throws if the native binding is unavailable.

## `LoggingConnection`

Purpose: connects native log messages to a JavaScript callback.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `new LoggingConnection(cb)` | Function with exactly one `message: string` parameter. | Owned connection. | Throws `TypeError` if callback arity is not one. |

Usage:

```ts
const connection = new LoggingConnection((message) => {
  console.log(message);
});
```

The connection stores the native callback wrapper to prevent garbage collection.

## `KernelLogViewer`

Purpose: convenience manager that configures formatting, enables categories, and forwards logs to `console.log`.

| API | Inputs | Returns | Errors and caveats |
| --- | --- | --- | --- |
| `new KernelLogViewer(name?, categories?)` | Optional logger name and categories. | Viewer with active `conn`. | Enables categories passed to constructor. |
| `getLogger(category?)` | Optional `LogCategory`. | Function accepting a log string. | Prefixes messages with logger/category name. |
| `temporaryCategories(categories, work)` | Category list and async task. | `Promise<void>`. | Restores categories not part of initial viewer config. |

Usage:

```ts
const viewer = new KernelLogViewer("debug", [LogCategory.KERNEL]);

await viewer.temporaryCategories([LogCategory.VALIDATION], async () => {
  // run native operation that emits logs
});
```

## Direct-Module Logging Helpers

`log.ts` also exports helpers such as `parse_btck_log_string`, `is_valid_log_callback`, `btck_level_from_python`, `KERNEL_LEVEL_TO_CONSOLE`, and `KernelLogRecord`. They are not re-exported from the package root, so treat them as direct-module/testing utilities unless the root export changes.
