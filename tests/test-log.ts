import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Block } from '../src/js-kernel/block.js';
import {
  LogCategory, LogLevel, set_log_level_category, enable_log_category,
  disable_log_category, is_valid_log_callback, parse_btck_log_string, KernelLogViewer
} from '../src/js-kernel/log.js';

test('logging accepts callable handlers including default and rest parameters', () => {
  assert.equal(is_valid_log_callback(() => {}), true);
  assert.equal(is_valid_log_callback((message = '') => message), true);
  assert.equal(is_valid_log_callback((...messages: string[]) => messages), true);
  assert.equal(is_valid_log_callback(null), false);
});

test('log level and category configuration is repeatable', () => {
  set_log_level_category(LogCategory.ALL, LogLevel.DEBUG);
  set_log_level_category(LogCategory.ALL, LogLevel.INFO);
  set_log_level_category(LogCategory.BLOCKSTORAGE, LogLevel.DEBUG);
  enable_log_category(LogCategory.BLOCKSTORAGE);
  enable_log_category(LogCategory.BLOCKSTORAGE);
  disable_log_category(LogCategory.BLOCKSTORAGE);
  disable_log_category(LogCategory.BLOCKSTORAGE);
});

for (const timestamp of ['2025-03-19T12:14:55Z', '2025-03-19T12:14:55.123456Z']) {
  test(`parse a native log record with timestamp ${timestamp}`, () => {
    const record = parse_btck_log_string('kernel', `${timestamp} [worker] [kernel/context.cpp:20] [operator()] [all:info] message`);
    assert.deepEqual(record, {
      name: 'kernel', levelno: 20, levelname: 'INFO', filename: 'context.cpp',
      pathname: 'kernel/context.cpp', lineno: 20, msg: 'message', funcName: 'operator()',
      created: new Date(timestamp).getTime() / 1000, threadName: 'worker'
    });
  });
}

test('viewer emits native messages inside temporary categories and nested scopes', async t => {
  const messages: string[] = [];
  t.mock.method(console, 'log', (message: string) => messages.push(message));
  const viewer = new KernelLogViewer('test');
  using connection = viewer.conn;
  await viewer.temporaryCategories([LogCategory.KERNEL], async () => {
    await viewer.temporaryCategories([LogCategory.KERNEL], async () => {});
    messages.length = 0;
    assert.throws(() => Block.fromBytes(new Uint8Array([1])));
    assert.ok(messages.some(message => message.includes('Block decode failed.')));
  });
  messages.length = 0;
  assert.throws(() => Block.fromBytes(new Uint8Array([1])));
  assert.equal(messages.length, 0);
});

test('temporary categories are restored when work rejects', async t => {
  const messages: string[] = [];
  t.mock.method(console, 'log', (message: string) => messages.push(message));
  const viewer = new KernelLogViewer('test');
  using connection = viewer.conn;
  await assert.rejects(viewer.temporaryCategories([LogCategory.KERNEL], async () => {
    throw new Error('work failed');
  }), /work failed/);
  messages.length = 0;
  assert.throws(() => Block.fromBytes(new Uint8Array([1])));
  assert.equal(messages.length, 0);
});
