import { STATES } from './lib/states.js';
import { generate, reroll, oneLineAddress, EMAIL_STYLES } from './lib/generate.js';
import { fillForm } from './lib/autofill.js';
import { hasAddresses, loadAddresses } from './lib/addresses.js';
import { ALIAS_SERVICES, createAlias } from './lib/alias.js';
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
// The last alias created, so re-rolling a name doesn't throw it away.
let aliasEmail = '';
let enabled = Object.fromEntries(FIELDS.map(([key]) => [key, true]));

const say = (msg) => { $('status').textContent = msg; };

function ctx() {
  return { data, domain: $('domain').value.trim() || 'example.com', emailStyle: $('email-style').value, site };
}

function saveSettings() {
  chrome.storage.local.set({
    state: $('state').value, domain: $('domain').value.trim(), emailStyle: $('email-style').value, enabled,
    aliasService: $('alias-service').value, aliasKey: $('alias-key').value.trim(),
  });
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
        const next = reroll(person, key, ctx());
        return key !== 'email' && aliasEmail && person.email === aliasEmail ? { ...next, email: aliasEmail } : next;
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

// The only path to the network. It runs on a click, so the browser can show its
// permission prompt; once the user has granted the service, the request is a no-op.
async function newAlias(button) {
  const service = $('alias-service').value;
  const { label, origin } = ALIAS_SERVICES[service];
  const granted = await chrome.permissions.request({ origins: [`${origin}/*`] }).catch(() => false);
  if (!granted) return say(`${label} needs your permission before it can create aliases.`);
  button.disabled = true;
  say(`Creating a ${label} alias…`);
  try {
    const email = await createAlias(service, { apiKey: $('alias-key').value, site });
    aliasEmail = email;
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
  $('alias-key').value = saved.aliasKey || '';
  showAliasKey();
  services.addEventListener('change', () => {
    saveSettings();
    showAliasKey();
    if (person) render();
    // Ask now, while the user is clearly choosing a service, so the first alias doesn't prompt.
    const svc = ALIAS_SERVICES[services.value];
    if (svc) chrome.permissions.request({ origins: [`${svc.origin}/*`] }).catch(() => false)
      .then((ok) => say(ok ? `Paste your ${svc.label} key, then press @ on the Email row.` : `${svc.label} needs your permission to create aliases.`));
  });
  $('alias-key').addEventListener('change', saveSettings);

  $('generate').addEventListener('click', async () => {
    saveSettings();
    const state = select.value;
    try {
      data.addresses[state] ??= await loadAddresses(state);
    } catch (err) {
      return say(err.message);
    }
    // A slower load for a state the user has since changed away from is dropped.
    if (select.value === state) update(() => generate(state, ctx()));
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
activeTab.then(([tab]) => {
  site = siteOf(tab?.url);
  if (site && person && person.email !== aliasEmail && $('email-style').value === 'site') update(() => reroll(person, 'email', ctx()));
});
chrome.storage.local.get(['state', 'domain', 'emailStyle', 'enabled', 'aliasService', 'aliasKey']).then(boot, () => boot({}));
