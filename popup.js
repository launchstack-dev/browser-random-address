import { STATES } from './lib/states.js';
import { generate, reroll, oneLineAddress, EMAIL_STYLES } from './lib/generate.js';
import { fillForm } from './lib/autofill.js';
import { hasAddresses, loadAddresses } from './lib/addresses.js';
import { ALIAS_SERVICES, createAlias, permissionFor } from './lib/alias.js';
import names from './data/names.js';
import areaCodes from './data/areacodes.js';

// addresses fills in one state at a time as states are picked.
const data = { addresses: {}, names, areaCodes };
const FIELDS = [
  ['first', 'First'], ['last', 'Last'], ['street', 'Street'], ['city', 'City'],
  ['state', 'State'], ['zip', 'ZIP'], ['phone', 'Phone'], ['email', 'Email'],
];

const $ = (id) => document.getElementById(id);
let person = null;
let site = '';
// The alias created for this site. It stays in the Email field through Generate and
// name re-rolls, and survives the popup closing (session storage), so a limited
// Relay quota isn't spent twice. Only ↻ on Email or a different site drops it.
let aliasEmail = '';
// Each service keeps its own key, so switching services never sends one service's key to the other.
let aliasKeys = {};
let enabled = Object.fromEntries(FIELDS.map(([key]) => [key, true]));

const say = (msg) => { $('status').textContent = msg; };

function ctx() {
  return { data, domain: $('domain').value.trim() || 'example.com', emailStyle: $('email-style').value, site };
}

function saveSettings() {
  chrome.storage.local.set({
    state: $('state').value, domain: $('domain').value.trim(), emailStyle: $('email-style').value, enabled,
    aliasService: $('alias-service').value, aliasKeys,
  });
}

const keepAlias = (next) => (aliasEmail ? { ...next, email: aliasEmail } : next);

function forgetAlias() {
  aliasEmail = '';
  chrome.storage.session.remove('lastAlias').catch(() => {});
}

function render() {
  const list = $('fields');
  list.replaceChildren();
  for (const [key, label] of FIELDS) {
    const li = document.createElement('li');
    li.classList.toggle('off', !enabled[key]);
    const use = Object.assign(document.createElement('input'), {
      type: 'checkbox', checked: enabled[key], title: `Include ${label} when autofilling`,
    });
    use.addEventListener('change', () => {
      enabled[key] = use.checked;
      li.classList.toggle('off', !use.checked);
      saveSettings();
    });
    const name = Object.assign(document.createElement('span'), { className: 'label', textContent: label });
    const value = Object.assign(document.createElement('span'), { className: 'value', textContent: person[key] });
    const copy = Object.assign(document.createElement('button'), { textContent: 'Copy', title: `Copy ${label}` });
    copy.addEventListener('click', () => copyText(person[key], label));
    li.append(use, name, value, copy);
    if (key !== 'state') {
      const dice = Object.assign(document.createElement('button'), { textContent: '↻', title: `Re-roll ${label}` });
      dice.addEventListener('click', () => update(() => {
        if (key === 'email') forgetAlias();
        return keepAlias(reroll(person, key, ctx()));
      }));
      li.append(dice);
    }
    const service = $('alias-service').value;
    if (key === 'email' && service) {
      const alias = Object.assign(document.createElement('button'), {
        textContent: '@', title: `New ${ALIAS_SERVICES[service].label} alias`,
      });
      alias.addEventListener('click', () => newAlias(alias));
      li.append(alias);
    }
    list.append(li);
  }
  $('copy-line').disabled = $('autofill').disabled = false;
}

function update(make) {
  try {
    person = make();
    render();
    say('');
  } catch (err) {
    say(err.message);
  }
}

async function copyText(text, what) {
  try {
    await navigator.clipboard.writeText(text);
    say(`Copied ${what}`);
  } catch {
    say('Clipboard unavailable');
  }
}

// Asks the browser for one service's host access, only if it isn't already granted.
// Returns an error message, or '' when access is in place.
async function ensureAccess(service) {
  const origins = [permissionFor(service)];
  try {
    if (await chrome.permissions.contains({ origins })) return '';
    if (await chrome.permissions.request({ origins })) return '';
    return `${ALIAS_SERVICES[service].label} needs your permission before it can create aliases.`;
  } catch (err) {
    return `Couldn't get permission: ${err.message}`;
  }
}

// The only path to the network: one click, one alias.
async function newAlias(button) {
  const service = $('alias-service').value;
  const { label } = ALIAS_SERVICES[service];
  button.disabled = true;
  const denied = await ensureAccess(service);
  if (denied) {
    button.disabled = false;
    return say(denied);
  }
  say(`Creating a ${label} alias. Keep this open…`);
  try {
    const email = await createAlias(service, { apiKey: aliasKeys[service], site });
    aliasEmail = email;
    chrome.storage.session.set({ lastAlias: { email, site } }).catch(() => {});
    update(() => ({ ...person, email }));
    say(`New ${label} alias`);
  } catch (err) {
    button.disabled = false;
    say(err.message);
  }
}

function showAliasKey() {
  const service = $('alias-service').value;
  $('alias-key-row').hidden = !service;
  $('alias-key').placeholder = service ? ALIAS_SERVICES[service].keyHelp : '';
  $('alias-key').value = aliasKeys[service] ?? '';
}

async function autofill() {
  try {
    const [tab] = await activeTab;
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: fillForm,
      args: [person, enabled],
    });
    const total = results.reduce((n, r) => n + (r.result || 0), 0);
    say(total ? `Filled ${total} field${total === 1 ? '' : 's'}` : 'No matching fields found');
  } catch {
    say("Can't fill this page");
  }
}

function boot(saved) {
  const select = $('state');
  for (const [code, name] of Object.entries(STATES)) {
    const hasData = hasAddresses(code);
    select.append(Object.assign(document.createElement('option'), {
      value: code, disabled: !hasData, textContent: `${name} (${code})${hasData ? '' : ' - no data'}`,
    }));
  }
  select.value = hasAddresses(saved.state) ? saved.state : Object.keys(STATES).find(hasAddresses);
  $('domain').value = saved.domain || 'example.com';
  $('email-style').value = EMAIL_STYLES.includes(saved.emailStyle) ? saved.emailStyle : 'name';
  enabled = { ...enabled, ...saved.enabled };

  const services = $('alias-service');
  for (const [id, { label }] of Object.entries(ALIAS_SERVICES)) {
    services.append(Object.assign(document.createElement('option'), { value: id, textContent: label }));
  }
  services.value = Object.hasOwn(ALIAS_SERVICES, saved.aliasService) ? saved.aliasService : '';
  aliasKeys = Object.fromEntries(Object.keys(ALIAS_SERVICES).map((id) => [id, String(saved.aliasKeys?.[id] ?? '')]));
  showAliasKey();
  let current = services.value;
  services.addEventListener('change', async () => {
    // Give up access to the service being left, so None really means no access.
    if (current) chrome.permissions.remove({ origins: [permissionFor(current)] }).catch(() => {});
    current = services.value;
    saveSettings();
    showAliasKey();
    if (person) render();
    if (!current) return say('');
    // Ask now, while the user is clearly choosing a service, so the first alias doesn't prompt.
    const denied = await ensureAccess(current);
    say(denied || `Paste your ${ALIAS_SERVICES[current].label} key, then press @ on the Email row.`);
  });
  $('alias-key').addEventListener('input', () => {
    if (!current) return;
    aliasKeys[current] = $('alias-key').value.trim();
    saveSettings();
  });

  $('generate').addEventListener('click', async () => {
    saveSettings();
    const state = select.value;
    try {
      data.addresses[state] ??= await loadAddresses(state);
    } catch (err) {
      return say(err.message);
    }
    // A slower load for a state the user has since changed away from is dropped.
    if (select.value === state) update(() => keepAlias(generate(state, ctx())));
  });
  $('copy-line').addEventListener('click', () => copyText(oneLineAddress(person), 'address'));
  $('autofill').addEventListener('click', autofill);
  $('copy-line').disabled = $('autofill').disabled = true;
  $('generate').click();
}

// activeTab lets the popup see the current tab's URL. Only web pages give a site
// label; chrome:// and file pages leave it empty and the site style falls back to random.
function siteOf(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.hostname : '';
  } catch {
    return '';
  }
}

// The popup doesn't wait for the tab: it boots on settings alone, and a site email
// generated before the hostname arrives is re-rolled once it does.
const activeTab = chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
Promise.all([activeTab, chrome.storage.session.get('lastAlias').catch(() => ({}))]).then(([[tab], { lastAlias }]) => {
  site = siteOf(tab?.url);
  // Bring back an alias made for this same site before the popup last closed.
  if (lastAlias?.email && lastAlias.site === site) {
    aliasEmail = lastAlias.email;
    if (person) update(() => keepAlias(person));
  } else if (lastAlias) forgetAlias();
  if (site && person && !aliasEmail && $('email-style').value === 'site') update(() => reroll(person, 'email', ctx()));
});
chrome.storage.local.get(['state', 'domain', 'emailStyle', 'enabled', 'aliasService', 'aliasKeys']).then(boot, () => boot({}));
