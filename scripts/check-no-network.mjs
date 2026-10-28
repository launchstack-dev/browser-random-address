#!/usr/bin/env node
// Fails if the shipped extension could talk to the network anywhere except the
// opt-in alias services in lib/alias.js. Run by `npm run ci`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (msg) => problems.push(msg);

const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const ALLOWED_PERMISSIONS = ['activeTab', 'scripting', 'storage'];
// The alias services: the only origins the extension may ever contact, and only
// after the user grants one of them at runtime (optional_host_permissions).
const ALIAS_ORIGINS = ['https://relay.firefox.com', 'https://quack.duckduckgo.com'];
for (const key of ['host_permissions', 'content_scripts',
  'externally_connectable', 'background', 'web_accessible_resources', 'declarative_net_request']) {
  if (key in manifest) fail(`manifest.json must not declare ${key}`);
}
for (const p of manifest.permissions ?? []) {
  if (!ALLOWED_PERMISSIONS.includes(p)) fail(`manifest.json permission not allowed: ${p}`);
}
if ('optional_permissions' in manifest) fail('manifest.json must not declare optional_permissions');
const ALIAS_HOSTS = ALIAS_ORIGINS.map((o) => `${o}/*`);
for (const host of manifest.optional_host_permissions ?? []) {
  if (!ALIAS_HOSTS.includes(host)) fail(`manifest.json optional host permission not allowed: ${host}`);
}
// The whole policy is pinned: widening img-src, default-src or any other directive
// would open a way out (an image beacon, for example) that connect-src doesn't cover.
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; "
  + `connect-src ${ALIAS_ORIGINS.join(' ')}; base-uri 'none'; form-action 'none'`;
if (manifest.content_security_policy?.extension_pages !== CSP) fail(`CSP must be exactly "${CSP}"`);

// The alias services' URLs, checked as text. The check never runs shipped code,
// so nothing in a shipped file can influence its result. Every url: property in
// lib/alias.js must be one of these exact literals, and nothing may rewrite one.
const ALIAS_URLS = ['https://relay.firefox.com/api/v1/relayaddresses/', 'https://quack.duckduckgo.com/api/email/addresses'];
for (const u of ALIAS_URLS) if (!ALIAS_ORIGINS.includes(new URL(u).origin)) fail(`alias URL outside the alias origins: ${u}`);
const aliasSource = readFileSync(join(root, 'lib/alias.js'), 'utf8');
const urlValues = [...aliasSource.matchAll(/\burl\s*:\s*([^,\n}]+)/g)].map((m) => m[1].trim()).sort();
if (JSON.stringify(urlValues) !== JSON.stringify(ALIAS_URLS.map((u) => `'${u}'`).sort())) {
  fail(`lib/alias.js service URLs must be exactly ${ALIAS_URLS.join(' and ')}, found: ${urlValues.join(', ') || 'none'}`);
}
if (/\.url\s*=(?!=)|\[\s*['"`]url['"`]\s*\]|defineProperty|Object\.assign/.test(aliasSource)) {
  fail('lib/alias.js must not rewrite a service URL');
}

// Everything that ships. Build scripts, tests and docs may use the network or mention URLs.
const SHIPPED = ['popup.html', 'popup.css', 'popup.js', 'lib', 'data'];
const FORBIDDEN = [
  [/\bfetch\b/, 'fetch'], [/XMLHttpRequest/, 'XMLHttpRequest'], [/WebSocket/, 'WebSocket'],
  [/EventSource/, 'EventSource'], [/sendBeacon/, 'sendBeacon'], [/importScripts/, 'importScripts'],
  [/\bimport\s*\(/, 'dynamic import()'], [/\beval\s*\(/, 'eval('], [/new\s+Function\b/, 'new Function'],
  [/https?:\/\//, 'http(s):// URL'], [/\/\/[a-z0-9.-]+\.[a-z]{2,}\//i, 'protocol-relative URL'],
  [/chrome\.(runtime\.sendMessage|identity|webRequest|cookies|history|downloads)/, 'extra chrome API'],
  // Other ways out, mostly for lib/autofill.js, which runs inside the web page where the
  // extension CSP doesn't apply: computed lookups that hide a name from this check,
  // image beacons, navigation, and markup or elements that load from a URL.
  [/\b(window|globalThis|self|document)\s*\[/, 'computed global access'],
  [/\bnew\s+Image\b/, 'new Image'], [/\.src\s*=(?!=)/, '.src assignment'],
  [/\blocation\b\s*(=(?!=)|\.\s*(href|assign|replace))/, 'navigation'], [/\bopen\s*\(/, 'open('],
  [/innerHTML|outerHTML|insertAdjacentHTML|srcdoc|document\.write/, 'HTML from a string'],
  [/createElement\s*\(\s*['"`](img|script|iframe|link|a|form|object|embed|audio|video|source|meta|style)\b/, 'loading element'],
  [/setAttribute\s*\(\s*['"`](src|href|action|formaction|srcset|poster|data)\b/, 'URL attribute'],
];

// Allowed exceptions, matched exactly. The address loader imports a bundled per-state
// data file; the alias module posts to its two service URLs. Any other import(),
// any other use of fetch, or any other URL, including an edited copy of one of these, fails.
const ALLOWED = {
  'lib/addresses.js': ['import(`../data/addresses/${state}.js`)'],
  'lib/alias.js': [
    'await globalThis.fetch(svc.url, {',
    "'https://relay.firefox.com/api/v1/relayaddresses/'",
    "'https://quack.duckduckgo.com/api/email/addresses'",
  ],
};

function* files(path) {
  if (statSync(path).isDirectory()) {
    for (const f of readdirSync(path)) yield* files(join(path, f));
  } else yield path;
}

for (const entry of SHIPPED) {
  for (const file of files(join(root, entry))) {
    const text = (ALLOWED[relative(root, file)] ?? []).reduce((t, ok) => t.replaceAll(ok, ''), readFileSync(file, 'utf8'));
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
