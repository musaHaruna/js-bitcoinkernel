# Notifications API

The notifications module implements native kernel notification callbacks, but it is not currently re-exported from the package root. Treat this API as direct-module only unless the package root changes.

```ts
import { NotificationInterfaceCallbacks } from "js-bitcoinkernel/dist/js-kernel/notifications.js";
```

The root API still exposes `ContextOptions.set_notifications(...)`, so this missing root export is an important packaging caveat.

## `NotificationInterfaceCallbacks`

Purpose: converts JavaScript notification callbacks into the native notification struct shape.

| Constructor input | Returns | Errors and caveats |
| --- | --- | --- |
| Object with optional notification hooks. | Instance with `.nativeStruct`. | Throws if an unknown callback key is supplied. Not exported from package root. |

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
- The object stores callback anchors so callbacks are not garbage collected.
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
