import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, reroll, oneLineAddress } from '../lib/generate.js';
import areaCodes from '../data/areacodes.js';
import { STATES } from '../lib/states.js';

// Fixture only; the shipped data is built from NAD/SSA/Census by scripts/build-data.mjs.
const data = {
  addresses: { CA: [['100', 'Test Ave', 'Fontana', '92335'], ['200', 'Sample Blvd', 'Rialto', '92376']] },
  names: { first: { m: ['JAMES'], f: ['MARY'] }, last: ['SMITH', "O'BRIEN"] },
  areaCodes: { CA: [909] },
};

const zero = () => 0; // always picks index 0
const one = (max) => 1 % max;
const counter = () => { let i = 0; return (max) => i++ % max; };

test('generate builds a consistent person for the state', () => {
  const p = generate('CA', { data, rng: counter() });
  assert.equal(p.state, 'CA');
  assert.equal(p.stateName, 'California');
  assert.match(p.phone, /^909-555-01\d\d$/);
  assert.match(p.email, /^[a-z]+\.[a-z]+\d\d@example\.com$/);
  assert.equal(p.line2, '');
  assert.deepEqual(data.addresses.CA.map(([n, s, c, z]) => [`${n} ${s}`, c, z]).filter(
    ([s, c, z]) => s === p.street && c === p.city && z === p.zip).length, 1);
});

test('email domain is configurable and names are stripped to letters', () => {
  const p = generate('CA', { data, domain: 'me.example', rng: counter() });
  assert.ok(p.email.endsWith('@me.example'));
  const o = reroll({ ...p, last: "O'Brien" }, 'last', { data, rng: one });
  assert.match(o.email, /^[a-z]+\.[a-z]+\d\d@example\.com$/);
});

test('reroll street/city/zip keeps them from one real row', () => {
  const p = generate('CA', { data, rng: zero });
  const q = reroll(p, 'city', { data, rng: one });
  assert.equal(q.street, '200 Sample Blvd');
  assert.equal(q.city, 'Rialto');
  assert.equal(q.zip, '92376');
  assert.equal(q.first, p.first);
});

test('reroll of a name refreshes the email, phone reroll leaves it alone', () => {
  const p = generate('CA', { data, rng: zero });
  const q = reroll(p, 'first', { data, rng: one });
  assert.notEqual(q.first, p.first);
  assert.ok(q.email.startsWith(q.first.toLowerCase()));
  assert.equal(reroll(p, 'phone', { data, rng: one }).email, p.email);
});

test('throws a helpful error when data is missing', () => {
  assert.throws(() => generate('TX', { data }), /No address data for TX/);
  assert.throws(() => generate('CA', { data: { ...data, names: { first: { m: [], f: [] }, last: [] } } }), /Name lists are empty/);
});

test('oneLineAddress', () => {
  const p = generate('CA', { data, rng: zero });
  assert.equal(oneLineAddress(p), '100 Test Ave, Fontana, CA 92335');
});

test('every state has area codes and a name', () => {
  for (const code of Object.keys(STATES)) {
    assert.ok(areaCodes[code]?.length, `area codes for ${code}`);
  }
  assert.equal(Object.keys(STATES).length, 51);
});

test('titleCase handles all-caps source names', async () => {
  const { titleCase } = await import('../lib/generate.js');
  assert.equal(titleCase('SMITH'), 'Smith');
  assert.equal(titleCase('MCDONALD'), 'McDonald');
  assert.equal(titleCase('Mary'), 'Mary');
});

test('random email style is unrelated to the name and works in reroll', () => {
  const p = generate('CA', { data, emailStyle: 'random', domain: 'me.example', rng: counter() });
  assert.match(p.email, /^[a-z][a-z0-9]{10}@me\.example$/);
  assert.ok(!p.email.includes(p.first.toLowerCase()));
  const q = reroll(p, 'first', { data, emailStyle: 'random', domain: 'me.example', rng: one });
  assert.match(q.email, /^[a-z][a-z0-9]{10}@me\.example$/);
  assert.match(reroll(p, 'email', { data, emailStyle: 'name', rng: one }).email, /^[a-z]+\.[a-z]+\d\d@example\.com$/);
});

test('site email style labels the address with the site it was made for', () => {
  const cases = {
    'www.amazon.com': 'amazon',
    'accounts.google.com': 'google',
    'shop.example.co.uk': 'example',
    'bbc.com.au': 'bbc',
    'localhost': 'localhost',
    'xn--bcher-kva.example': 'xn--bcher-kva',
    'a-very-long-company-name-here.com': 'a-very-long-company',
    'WWW.Example.COM.': 'example',
  };
  for (const [site, label] of Object.entries(cases)) {
    const p = generate('CA', { data, emailStyle: 'site', site, domain: 'me.example', rng: counter() });
    assert.match(p.email, new RegExp(`^${label}\\.[a-z0-9]{5}@me\\.example$`), site);
  }
});

test('site email style falls back to random when there is no usable site', () => {
  for (const site of [undefined, '', '192.168.1.10', '[::1]']) {
    const p = generate('CA', { data, emailStyle: 'site', site, domain: 'me.example', rng: counter() });
    assert.match(p.email, /^[a-z][a-z0-9]{10}@me\.example$/, String(site));
  }
});

test('re-rolling a site email keeps the label and changes the tail', () => {
  const opts = { data, emailStyle: 'site', site: 'www.amazon.com', domain: 'me.example' };
  const p = generate('CA', { ...opts, rng: zero });
  const q = reroll(p, 'email', { ...opts, rng: one });
  assert.match(q.email, /^amazon\.[a-z0-9]{5}@me\.example$/);
  assert.notEqual(q.email, p.email);
});

test('EMAIL_STYLES lists every style the generator understands', async () => {
  const { EMAIL_STYLES } = await import('../lib/generate.js');
  assert.deepEqual(EMAIL_STYLES, ['name', 'random', 'site']);
});
