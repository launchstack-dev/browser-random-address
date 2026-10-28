import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlias, ALIAS_SERVICES, AliasError } from '../lib/alias.js';

// A fake fetch that records the request and answers with the given status and JSON.
function fakeFetch(status, json) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: status >= 200 && status < 300, status, json: async () => json };
  };
  return { fetch, calls };
}

const rejectsWith = (promise, code) => assert.rejects(promise, (err) => {
  assert.ok(err instanceof AliasError, `AliasError, got ${err}`);
  assert.equal(err.code, code);
  assert.ok(err.message.length > 0);
  return true;
});

test('services list Relay and DuckDuckGo with their origins', () => {
  assert.deepEqual(Object.keys(ALIAS_SERVICES), ['relay', 'duck']);
  assert.equal(ALIAS_SERVICES.relay.origin, 'https://relay.firefox.com');
  assert.equal(ALIAS_SERVICES.duck.origin, 'https://quack.duckduckgo.com');
});

test('Relay: posts the site with a Token header and returns full_address', async () => {
  const { fetch, calls } = fakeFetch(201, { full_address: 'x7k2m9p@mozmail.com' });
  assert.equal(await createAlias('relay', { apiKey: 'k1', site: 'www.amazon.com', fetch }), 'x7k2m9p@mozmail.com');
  const [{ url, init }] = calls;
  assert.equal(url, 'https://relay.firefox.com/api/v1/relayaddresses/');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers.Authorization, 'Token k1');
  assert.equal(init.headers['Content-Type'], 'application/json');
  assert.equal(init.credentials, 'omit');
  assert.deepEqual(JSON.parse(init.body),
    { enabled: true, description: 'www.amazon.com', generated_for: 'www.amazon.com', used_on: 'www.amazon.com' });
});

test('Relay: accepts a premium subdomain address', async () => {
  const { fetch } = fakeFetch(201, { full_address: 'shop.x1@me.mozmail.com' });
  assert.equal(await createAlias('relay', { apiKey: 'k', site: '', fetch }), 'shop.x1@me.mozmail.com');
});

test('DuckDuckGo: posts with a Bearer header and no body, adds @duck.com', async () => {
  const { fetch, calls } = fakeFetch(201, { address: 'abc-def123' });
  assert.equal(await createAlias('duck', { apiKey: 't1', site: 'www.amazon.com', fetch }), 'abc-def123@duck.com');
  const [{ url, init }] = calls;
  assert.equal(url, 'https://quack.duckduckgo.com/api/email/addresses');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers.Authorization, 'Bearer t1');
  assert.equal(init.body, undefined);
  assert.equal(init.credentials, 'omit');
});

test('a missing key fails before any request', async () => {
  const { fetch, calls } = fakeFetch(201, {});
  await rejectsWith(createAlias('duck', { apiKey: '  ', site: '', fetch }), 'bad_key');
  assert.equal(calls.length, 0);
});

test('HTTP errors map to codes the popup can explain', async () => {
  for (const [service, status, json, code] of [
    ['relay', 401, { detail: 'Invalid token.' }, 'bad_key'],
    ['duck', 401, {}, 'bad_key'],
    ['relay', 403, { error_code: 'free_tier_limit', detail: 'You’ve used all 5 email masks' }, 'limit'],
    ['relay', 403, { error_code: 'account_is_paused', detail: 'Your account is paused.' }, 'refused'],
    ['relay', 429, {}, 'rate_limited'],
    ['duck', 500, null, 'refused'],
  ]) {
    const { fetch } = fakeFetch(status, json);
    await rejectsWith(createAlias(service, { apiKey: 'k', site: 'a.com', fetch }), code);
  }
});

test('an address that does not look right is refused, not filled into a form', async () => {
  for (const [service, json] of [
    ['relay', { full_address: 'x@evil.example' }],
    ['relay', { full_address: '<img src=x>@mozmail.com' }],
    ['relay', {}],
    ['duck', { address: 'abc@other.com' }],
    ['duck', { address: '' }],
  ]) {
    const { fetch } = fakeFetch(201, json);
    await rejectsWith(createAlias(service, { apiKey: 'k', site: '', fetch }), 'bad_response');
  }
});

test('network failures and timeouts become offline', async () => {
  const down = async () => { throw new TypeError('Failed to fetch'); };
  await rejectsWith(createAlias('relay', { apiKey: 'k', site: '', fetch: down }), 'offline');
  const hang = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)));
  await rejectsWith(createAlias('duck', { apiKey: 'k', site: '', fetch: hang, timeoutMs: 20 }), 'offline');
});

test('an unknown service is a programming error, not an AliasError', async () => {
  await assert.rejects(createAlias('gmail', { apiKey: 'k', site: '' }), (err) => !(err instanceof AliasError));
});
