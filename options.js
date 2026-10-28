import { ALIAS_SERVICES, accessFor } from './lib/alias.js';

// Firefox's browser.* returns promises everywhere; Chrome's chrome.* does in MV3.
const chrome = globalThis.browser ?? globalThis.chrome;

// Every permission prompt happens on this page, never in the popup: Firefox only
// allows a request directly inside a click, and a prompt can close a popup.
// So each request below is the first thing its handler does, before any await.

const $ = (id) => document.getElementById(id);
const say = (msg) => { $('status').textContent = msg; };
let aliasKeys = {};
let dataConsent = false;
let current = '';

const save = () => chrome.storage.local.set({ aliasService: current, aliasKeys });

async function showAccess() {
  $('service-setup').hidden = !current;
  if (!current) return;
  const svc = ALIAS_SERVICES[current];
  $('alias-key').value = aliasKeys[current] ?? '';
  $('key-help').textContent = `Where to find it: ${svc.keyHelp}.`;
  const granted = await chrome.permissions.contains(accessFor(current, dataConsent)).catch(() => false);
  $('access').textContent = granted ? `allowed for ${svc.label}` : 'not allowed yet';
  $('grant').hidden = granted;
}

// Asks for one service's access. Must be called synchronously from a click or change.
function requestAccess(service) {
  return chrome.permissions.request(accessFor(service, dataConsent))
    .then((ok) => say(ok ? `${ALIAS_SERVICES[service].label} is ready. Paste your key, then press @ in the popup.` : 'Access was not allowed.'))
    .catch((err) => say(`Couldn't ask for access: ${err.message}`))
    .finally(showAccess);
}

// Gives up a service's site access, and any data consent the new service doesn't also use.
function releaseAccess(old, next) {
  const keep = next ? ALIAS_SERVICES[next].dataCollection : [];
  const request = accessFor(old, dataConsent);
  if (request.data_collection) request.data_collection = request.data_collection.filter((d) => !keep.includes(d));
  return chrome.permissions.remove(request).catch(() => {});
}

async function boot() {
  const saved = await chrome.storage.local.get(['aliasService', 'aliasKeys']).catch(() => ({}));
  // Firefox 140+ lists data_collection here; that is how built-in data consent is detected.
  dataConsent = 'data_collection' in (await chrome.permissions.getAll().catch(() => ({})));
  const select = $('alias-service');
  for (const [id, { label }] of Object.entries(ALIAS_SERVICES)) {
    select.append(Object.assign(document.createElement('option'), { value: id, textContent: label }));
  }
  current = Object.hasOwn(ALIAS_SERVICES, saved.aliasService) ? saved.aliasService : '';
  aliasKeys = Object.fromEntries(Object.keys(ALIAS_SERVICES).map((id) => [id, String(saved.aliasKeys?.[id] ?? '')]));
  select.value = current;

  select.addEventListener('change', () => {
    const next = select.value;
    const asked = next ? requestAccess(next) : null;
    const old = current;
    current = next;
    save();
    if (old && old !== next) releaseAccess(old, next).then(() => asked ?? showAccess());
    if (!next) say('Aliases are off. The extension makes no network requests.');
    showAccess();
  });
  $('grant').addEventListener('click', () => requestAccess(current));
  $('alias-key').addEventListener('input', () => {
    aliasKeys[current] = $('alias-key').value.trim();
    save();
  });
  showAccess();
}

boot();
