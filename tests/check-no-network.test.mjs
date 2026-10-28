import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Copies the shipped files plus the check script into a temp dir so the real tree is never touched.
function copyProject() {
  const dir = mkdtempSync(join(tmpdir(), 'ra-check-'));
  for (const f of ['manifest.json', 'popup.html', 'popup.css', 'popup.js', 'lib', 'data']) {
    cpSync(join(root, f), join(dir, f), { recursive: true });
  }
  mkdirSync(join(dir, 'scripts'));
  cpSync(join(root, 'scripts/check-no-network.mjs'), join(dir, 'scripts/check-no-network.mjs'));
  return dir;
}

const run = (dir) => spawnSync(process.execPath, [join(dir, 'scripts/check-no-network.mjs')], { encoding: 'utf8' });

test('the check passes on the real project', () => {
  assert.equal(run(copyProject()).status, 0);
});

test('the check fails when network code is injected', () => {
  const dir = copyProject();
  appendFileSync(join(dir, 'popup.js'), "\nfetch('https://example.com');\n");
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /popup\.js contains fetch\(/);
});

test('the check fails when a host permission is added', () => {
  const dir = copyProject();
  const file = join(dir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  manifest.host_permissions = ['<all_urls>'];
  writeFileSync(file, JSON.stringify(manifest, null, 2));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /host_permissions/);
});

test('the check fails on import() anywhere but the address loader', () => {
  const dir = copyProject();
  appendFileSync(join(dir, 'popup.js'), "\nimport('./lib/states.js');\n");
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /popup\.js contains dynamic import\(\)/);
});

test('the check fails when the address loader imports anything else', () => {
  const dir = copyProject();
  const file = join(dir, 'lib/addresses.js');
  writeFileSync(file, readFileSync(file, 'utf8').replace('`../data/addresses/${state}.js`', '`../data/${state}.js`'));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /lib\/addresses\.js contains dynamic import\(\)/);
});
