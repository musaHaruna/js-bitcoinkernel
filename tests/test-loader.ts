import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as bindings from '../src/js-kernel/ffi/bindings.js';

test('all declared bindings resolve against the bundled kernel', () => {
  for (const [name, binding] of Object.entries(bindings)) {
    assert.notEqual(binding, undefined, `Missing native binding: ${name}`);
  }
});
