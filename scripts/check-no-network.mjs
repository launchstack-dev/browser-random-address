#!/usr/bin/env node
// Fails if the shipped extension could talk to the network. Run by `npm run ci`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (msg) => problems.push(msg);

const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const ALLOWED_PERMISSIONS = ['activeTab', 'scripting', 'storage'];
for (const key of ['host_permissions', 'optional_host_permissions', 'content_scripts',
  'externally_connectable', 'background', 'web_accessible_resources', 'declarative_net_request']) {
  if (key in manifest) fail(`manifest.json must not declare ${key}`);
}
for (const p of manifest.permissions ?? []) {
  if (!ALLOWED_PERMISSIONS.includes(p)) fail(`manifest.json permission not allowed: ${p}`);
}
if ('optional_permissions' in manifest) fail('manifest.json must not declare optional_permissions');
const csp = manifest.content_security_policy?.extension_pages ?? '';
for (const need of ["default-src 'none'", "connect-src 'none'", "script-src 'self'"]) {
  if (!csp.includes(need)) fail(`CSP is missing ${need}`);
}

// Everything that ships. Build scripts, tests and docs may use the network or mention URLs.
const SHIPPED = ['popup.html', 'popup.css', 'popup.js', 'lib', 'data'];
const FORBIDDEN = [
  [/\bfetch\s*\(/, 'fetch('], [/XMLHttpRequest/, 'XMLHttpRequest'], [/WebSocket/, 'WebSocket'],
  [/EventSource/, 'EventSource'], [/sendBeacon/, 'sendBeacon'], [/importScripts/, 'importScripts'],
  [/\bimport\s*\(/, 'dynamic import()'], [/\beval\s*\(/, 'eval('], [/new\s+Function\b/, 'new Function'],
  [/https?:\/\//, 'http(s):// URL'], [/\/\/[a-z0-9.-]+\.[a-z]{2,}\//i, 'protocol-relative URL'],
  [/chrome\.(runtime\.sendMessage|identity|webRequest|cookies|history|downloads)/, 'extra chrome API'],
];

function* files(path) {
  if (statSync(path).isDirectory()) {
    for (const f of readdirSync(path)) yield* files(join(path, f));
  } else yield path;
}

for (const entry of SHIPPED) {
  for (const file of files(join(root, entry))) {
    const text = readFileSync(file, 'utf8');
    for (const [re, label] of FORBIDDEN) {
      if (re.test(text)) fail(`${relative(root, file)} contains ${label}`);
    }
  }
}

if (problems.length) {
  console.error(problems.map((p) => `✖ ${p}`).join('\n'));
  process.exit(1);
}
console.log('✔ no network capability: manifest, CSP and shipped source are clean');
