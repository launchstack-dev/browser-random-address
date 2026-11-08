import { ALIAS_SERVICES, accessFor } from './lib/alias.js';

// Firefox's browser.* returns promises everywhere; Chrome's chrome.* does in MV3.
const chrome = globalThis.browser ?? globalThis.chrome;

// Every permission prompt happens on this page, never in the popup: Firefox only
// allows a request directly inside a click, and a prompt can close a popup. The
// request comes only from the Allow access button, as the first thing its click
// handler does: Firefox for Android doesn't count a <select> change as user input.

const $ = (id) => document.getElementById(id);
const say = (msg) => { $('status').textContent = msg; };
let aliasKeys = {};
let dataConsent = false;
let detectFailed = false;
let current = '';

const save = () => chrome.storage.local.set({ aliasService: current, aliasKeys });

async function showAccess() {
  $('service-setup').hidden = !current;
  if (!current) return;
  const svc = ALIAS_SERVICES[current];
  $('alias-key').value = aliasKeys[current] ?? '';
  $('key-help').textContent = `Where to find it: ${svc.keyHelp}.`;
  if (detectFailed) {
    $('access').textContent = "unknown: the browser didn't report its permissions. Reload this page.";
    $('grant').hidden = true;
    return;
  }
  const granted = await chrome.permissions.contains(accessFor(current, dataConsent)).catch(() => false);
  $('access').textContent = granted ? `allowed for ${svc.label}` : 'not allowed yet';
  $('grant').hidden = granted;
}

// Asks for one service's access. Must be called synchronously from a click.
function requestAccess(service) {
  return chrome.permissions.request(accessFor(service, dataConsent))
    .then((ok) => say(ok ? `${ALIAS_SERVICES[service].label} is ready. Paste your key, then press @ in the popup.` : 'Access was not allowed.'))
    .catch((err) => say(`Couldn't ask for access: ${err.message}`))
    .finally(showAccess);
}

// Gives up everything granted for a service: its site access and, on Firefox, its data
// consent. The next service asks again for what it needs when Allow access is pressed.
const releaseAccess = (service) => chrome.permissions.remove(accessFor(service, dataConsent)).catch(() => {});

async function boot() {
  const saved = await chrome.storage.local.get(['aliasService', 'aliasKeys']).catch(() => ({}));
  // Firefox 140+ lists data_collection here; that is how built-in data consent is detected.
  try {
    dataConsent = 'data_collection' in (await chrome.permissions.getAll());
  } catch {
    // Guessing would risk a Chrome-shaped request on Firefox, which grants site access
    // without data consent. Refuse to ask instead.
    detectFailed = true;
  }
  const select = $('alias-service');
  for (const [id, { label }] of Object.entries(ALIAS_SERVICES)) {
    select.append(Object.assign(document.createElement('option'), { value: id, textContent: label }));
  }
  current = Object.hasOwn(ALIAS_SERVICES, saved.aliasService) ? saved.aliasService : '';
  aliasKeys = Object.fromEntries(Object.keys(ALIAS_SERVICES).map((id) => [id, String(saved.aliasKeys?.[id] ?? '')]));
  select.value = current;

  select.addEventListener('change', async () => {
    const old = current;
    current = select.value;
    save();
    if (old && old !== current) await releaseAccess(old);
    say(current ? `Press Allow access for ${ALIAS_SERVICES[current].label}, then paste your key.`
      : 'Aliases are off. The extension makes no network requests.');
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
