# Notifications API

Notification callbacks and their option types are exported from the package root.

```ts
import { NotificationInterfaceCallbacks } from "js-bitcoinkernel";
```

Attach an instance with `ContextOptions.set_notifications(...)` before creating a context.

## `NotificationInterfaceCallbacks`

Purpose: converts JavaScript notification callbacks into the native notification struct shape.

| Constructor input | Returns | Errors and caveats |
| --- | --- | --- |
| Object with optional notification hooks. | Instance with `.nativeStruct`. | Throws for unknown keys or non-function handlers. |

Supported hooks:

| Hook | Parameters | Purpose |
| --- | --- | --- |
| `block_tip` | `(state, index, verificationProgress)` | Active block tip changed. |
| `header_tip` | `(state, height, timestamp, presync)` | Header synchronization tip changed. |
| `progress` | `(title, titleLen, progressPercent, resumePossible)` | Long-running operation progress. |
| `warning_set` | `(warning, message, messageLen)` | Kernel warning was raised. |
| `warning_unset` | `(warning)` | Kernel warning was cleared. |
| `flush_error` | `(message, messageLen)` | Flush to disk failed. |
| `fatal_error` | `(message, messageLen)` | Fatal native error occurred. |

Return values: notification callbacks return `void`.

Errors:

- Unknown keys throw.
- Reserved native fields such as `user_data` are rejected.

Caveats:

- The helper strips the native `user_data` pointer before calling user functions.
- Persistent native callback registrations stay alive until the last native owner is destroyed.
- Text is decoded as UTF-8 using the supplied byte length, preserving embedded NUL characters.
- `state` is `SynchronizationState` (`INIT_REINDEX`, `INIT_DOWNLOAD`, `POST_INIT`), not `ChainType`.
- Header heights and timestamps can arrive as `number` or `bigint`; normalize explicitly if needed.
- The `block_tip` index is a raw borrowed pointer. Do not retain or free it.
- Notifications can occur while kernel objects are shutting down, so callback code should be defensive.

## Usage

```ts
const notifications = new NotificationInterfaceCallbacks({
  warning_set(warning, message) {
    console.warn({ warning, message });
  },
});

const options = new ContextOptions();
options.set_notifications(notifications);
```

## `defaultNotificationCallbacks`

Purpose: direct-module default callback set that logs notifications to the console.

Inputs: none.

Returns: prebuilt `NotificationInterfaceCallbacks` instance.

Caveat: not re-exported from the package root.
