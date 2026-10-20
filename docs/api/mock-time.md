# Mock time API

## `setMockTime(timestamp)`

Sets Bitcoin Core's process-wide kernel clock to Unix seconds. Pass `0` to restore the system clock.

```ts
import { setMockTime } from "js-bitcoinkernel";

setMockTime(1);
try {
  // Header validation now observes the fixed time.
} finally {
  setMockTime(0);
}
```

The accepted range is `0` through `4294967295`. Values outside the range, non-integers, and unsafe `number` values throw `RangeError` before entering native code.

This setting is global to the process. Use it only in isolated tests, always restore time in `finally`, and never use it for a live indexer.
