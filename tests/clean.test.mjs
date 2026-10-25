import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCase, resolveColumns, cleanRow, parseLine, Reservoir, finalizeState } from '../scripts/clean.mjs';

const header = ['AddNo_Full', 'StNam_Full', 'Post_City', 'Inc_Muni', 'State', 'Zip_Code', 'Unit', 'Building', 'Latitude'];
const cols = resolveColumns(header);
const row = (o) => header.map((h) => o[h] ?? '');

test('normalizeCase', () => {
  assert.equal(normalizeCase('NORTH MAIN ST'), 'North Main St');
  assert.equal(normalizeCase('n 23RD st'), 'N 23rd St');
  assert.equal(normalizeCase('HIGHWAY 99 NE'), 'Highway 99 NE');
  assert.equal(normalizeCase('MCKINLEY AVE'), 'McKinley Ave');
  assert.equal(normalizeCase("O'FALLON  RD"), "O'Fallon Rd");
});

test('resolveColumns reports the header when a column is missing', () => {
  assert.throws(() => resolveColumns(['A', 'B']), /No number column.*Header: A,B/s);
});

test('cleanRow accepts a plain address and strips everything else', () => {
  assert.deepEqual(
    cleanRow(row({ AddNo_Full: '1520', StNam_Full: 'S PINE ST', Post_City: 'SPOKANE', State: 'wa', Zip_Code: '99202', Latitude: '47.6' }), cols),
    ['1520', 'S Pine St', 'Spokane', 'WA', '99202'],
  );
});

test('cleanRow falls back to Inc_Muni when Post_City is a placeholder', () => {
  const base = { AddNo_Full: '114', StNam_Full: 'SOUTH Road', State: 'MA', Zip_Code: '02559' };
  assert.deepEqual(cleanRow(row({ ...base, Post_City: 'Not stated', Inc_Muni: 'BOURNE' }), cols),
    ['114', 'South Road', 'Bourne', 'MA', '02559']);
  assert.equal(cleanRow(row({ ...base, Post_City: 'Not stated', Inc_Muni: '' }), cols), null);
});

test('cleanRow cleans city labels', () => {
  const base = { AddNo_Full: '9', StNam_Full: 'Oak St', State: 'TX', Zip_Code: '79903' };
  assert.equal(cleanRow(row({ ...base, Post_City: 'CITY OF EL PASO' }), cols)[2], 'El Paso');
  for (const city of ['Unincorporated', 'UNINCORPORATED AREA', 'County Road', 'Harris County']) {
    assert.equal(cleanRow(row({ ...base, Post_City: city }), cols), null, city);
  }
});

test('cleanRow rejects bad rows', () => {
  const ok = { AddNo_Full: '12', StNam_Full: 'Oak St', Post_City: 'Reno', State: 'NV', Zip_Code: '89501' };
  assert.ok(cleanRow(row(ok), cols));
  for (const bad of [
    { Unit: '4B' }, { Building: 'A' }, { AddNo_Full: '12A' }, { AddNo_Full: '0' }, { AddNo_Full: '' },
    { Zip_Code: '8950' }, { Zip_Code: '00000' }, { Zip_Code: '89501-1234' }, { Post_City: '' }, { Post_City: 'Unknown' },
    { StNam_Full: 'NO NAME' }, { StNam_Full: '' }, { State: 'Nevada' },
  ]) {
    assert.equal(cleanRow(row({ ...ok, ...bad }), cols), null, JSON.stringify(bad));
  }
});

test('parseLine handles quotes', () => {
  assert.deepEqual(parseLine('a,b,c'), ['a', 'b', 'c']);
  assert.deepEqual(parseLine('a,"b,c",d,"e ""q"""'), ['a', 'b,c', 'd', 'e "q"']);
});

test('Reservoir never exceeds its cap and keeps small streams whole', () => {
  const r = new Reservoir(3);
  for (let i = 0; i < 100; i++) r.add(i);
  assert.equal(r.items.length, 3);
  const s = new Reservoir(10);
  [1, 2, 3].forEach((x) => s.add(x));
  assert.deepEqual(s.items, [1, 2, 3]);
});

test('finalizeState drops rare city/ZIP pairs and duplicates', () => {
  const mk = (n, city, zip) => [String(n), 'Oak St', city, 'NV', zip];
  const pool = [mk(1, 'Reno', '89501'), mk(2, 'Reno', '89501'), mk(3, 'Reno', '89501'), mk(3, 'Reno', '89501'),
    mk(4, 'Sparks', '89501')];
  const out = finalizeState(pool, 10);
  assert.equal(out.length, 3);
  assert.ok(out.every(([, , city]) => city === 'Reno'));
  assert.equal(finalizeState(pool, 2).length, 2);
});
