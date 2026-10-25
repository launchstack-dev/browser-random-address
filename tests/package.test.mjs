import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('package zip holds exactly the shipped files', () => {
  const out = mkdtempSync(join(tmpdir(), 'ra-pkg-'));
  execFileSync(process.execPath, [join(root, 'scripts/package.mjs'), '--out', out], { stdio: 'pipe' });
  const version = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')).version;
  const zip = join(out, `random-address-${version}.zip`);
  assert.ok(existsSync(zip));
  const entries = execFileSync('unzip', ['-Z1', zip]).toString().split('\n').filter(Boolean);
  for (const needed of ['manifest.json', 'popup.html', 'popup.js', 'lib/generate.js', 'data/addresses.js', 'icons/icon-128.png']) {
    assert.ok(entries.includes(needed), `${needed} is in the zip`);
  }
  const leaked = entries.filter((e) => /^(tests|scripts|docs|node_modules|\.git|dist)\//.test(e) || /^(README|LICENSE|package)/.test(e));
  assert.deepEqual(leaked, []);
});

test('manifest declares icons at the sizes the store and toolbar use', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest.icons).sort(), ['128', '16', '32', '48']);
  assert.ok(manifest.name.length <= 45 && manifest.description.length <= 132);
});
