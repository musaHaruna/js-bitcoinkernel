/**
 * Test entry point.
 * This file runs all test files in order.
 * Each imported file executes its tests automatically.
 */

// Run loader / FFI binding tests
import "./test-loader.js";

// Run BlockHash test
import "./test-block.js";

// Run Notifications test
import "./test-notifications.js";

// Run LazySequence tests
import "./util/test-sequence.js";

// Run Script tests
import "./test-script.js";