import assert from "node:assert/strict";
import { NotificationInterfaceCallbacks } from "../src/js-kernel/notifications.js"; 

const NOTIFICATION_CALLBACK_NAMES = [
    "block_tip",
    "header_tip",
    "progress",
    "warning_set",
    "warning_unset",
    "flush_error",
    "fatal_error",
] as const;

const _noop = (): void => {};

/**
 * Test: Initialization with no callbacks leaves all fields null/undefined
 */
function testNotificationCallbacksEmpty(): void {
    console.log("=== Testing Notification Callbacks Empty ===");

    const cb = new NotificationInterfaceCallbacks({});
    
    for (const name of NOTIFICATION_CALLBACK_NAMES) {
        assert.equal(
            cb.nativeStruct[name], 
            null, 
            `Expected nativeStruct.${name} to be null when uninitialized`
        );
    }

    console.log("✓ Empty callbacks test passed");
    console.log();
}

/**
 * Test: Initialization with a single callback sets only that specific handle
 */
function testNotificationCallbacksSingle(): void {
    console.log("=== Testing Notification Callbacks Single ===");

    const cb = new NotificationInterfaceCallbacks({ warning_unset: _noop });

    // Ensure the targeted callback hook is successfully populated
    assert.ok(cb.nativeStruct.warning_unset, "Expected warning_unset handle to be truthy");

    // Ensure all other hooks remain unpopulated
    for (const name of NOTIFICATION_CALLBACK_NAMES) {
        if (name !== "warning_unset") {
            assert.equal(
                cb.nativeStruct[name], 
                null, 
                `Expected nativeStruct.${name} to be null`
            );
        }
    }

    console.log("✓ Single callback test passed");
    console.log();
}

/**
 * Test: Passing an unrecognized callback option throws a runtime error
 */
function testNotificationCallbacksUnknownRaises(): void {
    console.log("=== Testing Notification Callbacks Unknown Raises ===");

    assert.throws(
        () => {
            // Bypass compiler checks using 'as any' to verify runtime guard rails
            new NotificationInterfaceCallbacks({ blok_tip: _noop } as any);
        },
        /not recognized/,
        "Expected constructor to reject unrecognized callback names"
    );

    console.log("✓ Unknown callback runtime rejection passed");
    console.log();
}

/**
 * Test: Explicitly passing 'user_data' key inside options is rejected
 */
function testNotificationCallbacksUserDataRejected(): void {
    console.log("=== Testing Notification Callbacks User Data Rejected ===");

    assert.throws(
        () => {
            // user_data is reserved for internal state, shouldn't be accepted as a public kwarg
            new NotificationInterfaceCallbacks({ user_data: _noop } as any);
        },
        /not recognized/,
        "Expected constructor to reject 'user_data' field injection"
    );

    console.log("✓ User data restriction verification passed");
    console.log();
}

/*
 * Test: The internal FFI bridge swallows user_data before executing user scope code
 */
/*
 * Test: The internal FFI bridge swallows user_data before executing user scope code
 */
function testNotificationCallbacksSwallowUserData(): void {
    console.log("=== Testing Notification Callbacks Swallow User Data ===");

    const seen: [number, number][] = [];
    
    const cb = new NotificationInterfaceCallbacks({
        warning_unset: (warning: number) => {
            seen.push([1, warning]);
        }
    });

    const mockUserDataPointer = null;
    const sampleWarningCode = 7;

    // FIX: Remove koffi.proto and koffi.call. 
    // Directly invoke the function wrapper to test the interceptor bridge logic.
    cb.nativeStruct.warning_unset(mockUserDataPointer, sampleWarningCode);

    // Validate that the underlying high-level callback safely received the arguments 
    // after dropping the user_data context reference.
    assert.deepEqual(seen, [[1, sampleWarningCode]], "Callback failed to intercept wrapped values cleanly");

    console.log("✓ Context memory stripping evaluation passed");
    console.log();
}

/**
 * Test Runner
 */
function testNotifications(): void {
    try {
        testNotificationCallbacksEmpty();
        testNotificationCallbacksSingle();
        testNotificationCallbacksUnknownRaises();
        testNotificationCallbacksUserDataRejected();
        testNotificationCallbacksSwallowUserData();
        console.log("ALL NOTIFICATION TESTS PASSED");
    } catch (err) {
        console.error();
        console.error("TEST FAILED");
        console.error(err);
        process.exit(1);
    }
}

testNotifications();