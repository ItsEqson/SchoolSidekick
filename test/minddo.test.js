import test from 'node:test';
import assert from 'node:assert/strict';
import { getKey, invalidateKey, KeygenError } from '../keygen.js';
import { handleAsk } from '../ask.js';

test('MindDo caching, expiry, errors, and bounded OpenAI refresh', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  const originalLog = console.error;
  const originalUrl = process.env.KEYGEN_URL;
  const originalToken = process.env.KEYGEN_TOKEN;
  let now = originalNow();
  Date.now = () => now;
  process.env.KEYGEN_URL = 'https://minddo.example/';
  process.env.KEYGEN_TOKEN = 'test-only-token';
  const calls = [];
  const logs = [];
  let queue = [];
  console.error = (fix) => logs.push(fix);
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    assert.ok(queue.length, 'Unexpected extra request');
    const next = queue.shift();
    if (next instanceof Error) throw next;
    return Response.json(next.body, { status: next.status ?? 200 });
  };
  const key = (apiKey) => ({ body: { apiKey, expiresAt: new Date(now + 10000).toISOString() } });
  const request = () => new Request('https://school.example/api/ask', {
    method: 'POST',
    headers: { origin: 'https://school.example', 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'chat', question: 'Explain fractions.' }),
  });
  const success = { body: { output: [{ content: [{ text: 'IN_SCOPE\nFractions describe parts of a whole.' }] }] } };
  try {
    await t.test('coalesces lookups, caches, expires, and ignores stale invalidation', async () => {
      queue = [key('test-key-one')];
      assert.deepEqual(await Promise.all([getKey(), getKey()]), ['test-key-one', 'test-key-one']);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, 'https://minddo.example/api/lookup-key');
      assert.equal(calls[0].options.method, 'POST');
      assert.equal(calls[0].options.headers.Authorization, 'Bearer test-only-token');
      assert.equal(await getKey(), 'test-key-one');
      now += 10000;
      queue = [key('test-key-two')];
      assert.equal(await getKey(), 'test-key-two');
      invalidateKey('test-key-one');
      assert.equal(await getKey(), 'test-key-two');
      assert.equal(calls.length, 2);
      invalidateKey('test-key-two');
    });
    await t.test('shows service message, logs fix privately, and redacts secrets', async () => {
      queue = [{ status: 403, body: { error: { message: 'MindDo unavailable test-only-token', fix: 'Update settings test-only-token' } } }];
      const start = calls.length;
      const response = await handleAsk(request());
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { error: { message: 'MindDo unavailable [redacted]' } });
      assert.equal(logs.at(-1), 'Update settings [redacted]');
      assert.equal(calls.length - start, 1);
    });
    await t.test('rejects expired/malformed replies and transport failures without retry', async () => {
      for (const failure of [
        { body: { apiKey: 'test-expired', expiresAt: new Date(now).toISOString() } },
        { body: { apiKey: 'test-malformed' } },
        new Error('Sensitive transport details'),
      ]) {
        queue = [failure];
        const start = calls.length;
        await assert.rejects(getKey(), KeygenError);
        assert.equal(calls.length - start, 1);
      }
    });
    await t.test('refreshes a rejected key once and returns the answer', async () => {
      queue = [key('test-old'), { status: 401, body: {} }, key('test-new'), success];
      const start = calls.length;
      const response = await handleAsk(request());
      assert.deepEqual(await response.json(), { answer: 'Fractions describe parts of a whole.' });
      assert.equal(calls.length - start, 4);
      assert.equal(calls.at(-1).options.headers.Authorization, 'Bearer test-new');
      invalidateKey('test-new');
    });
    await t.test('stops after a second rejection and does not retry other OpenAI errors', async () => {
      queue = [key('test-bad-one'), { status: 401, body: {} }, key('test-bad-two'), { status: 401, body: {} }];
      const start = calls.length;
      assert.equal((await handleAsk(request())).status, 503);
      assert.equal(calls.length - start, 4);
      queue = [key('test-valid'), { status: 429, body: {} }];
      const nextStart = calls.length;
      assert.equal((await handleAsk(request())).status, 503);
      assert.equal(calls.length - nextStart, 2);
      invalidateKey('test-valid');
    });
    assert.equal(queue.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
    console.error = originalLog;
    if (originalUrl === undefined) delete process.env.KEYGEN_URL;
    else process.env.KEYGEN_URL = originalUrl;
    if (originalToken === undefined) delete process.env.KEYGEN_TOKEN;
    else process.env.KEYGEN_TOKEN = originalToken;
  }
});
