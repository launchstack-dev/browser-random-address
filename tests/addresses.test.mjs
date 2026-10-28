import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAddresses, hasAddresses } from '../lib/addresses.js';
import { STATES } from '../lib/states.js';

test('loadAddresses returns the rows for one state', async () => {
  const rows = await loadAddresses('CA');
  assert.ok(rows.length > 0);
  for (const row of rows.slice(0, 20)) {
    assert.equal(row.length, 4);
    assert.match(row[3], /^9\d{4}$/, 'California ZIPs start with 9');
  }
});

test('hasAddresses matches what loadAddresses can load', async () => {
  for (const state of Object.keys(STATES)) {
    if (hasAddresses(state)) assert.ok((await loadAddresses(state)).length > 0, state);
    else await assert.rejects(loadAddresses(state), /No address data/, state);
  }
});

test('loadAddresses refuses anything that is not a state with data', async () => {
  for (const bad of ['XX', '../states', 'ca', '', undefined]) {
    assert.equal(hasAddresses(bad), false);
    await assert.rejects(loadAddresses(bad), /No address data/, String(bad));
  }
});
