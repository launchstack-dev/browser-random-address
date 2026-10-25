import { STATES } from './lib/states.js';
import { generate, reroll, oneLineAddress } from './lib/generate.js';
import { fillForm } from './lib/autofill.js';
import addresses from './data/addresses.js';
import names from './data/names.js';
import areaCodes from './data/areacodes.js';

const data = { addresses, names, areaCodes };
const FIELDS = [
  ['first', 'First'], ['last', 'Last'], ['street', 'Street'], ['city', 'City'],
  ['state', 'State'], ['zip', 'ZIP'], ['phone', 'Phone'], ['email', 'Email'],
];

const $ = (id) => document.getElementById(id);
let person = null;

const say = (msg) => { $('status').textContent = msg; };

function ctx() {
  return { data, domain: $('domain').value.trim() || 'example.com' };
}

function render() {
  const list = $('fields');
  list.replaceChildren();
  for (const [key, label] of FIELDS) {
    const li = document.createElement('li');
    const name = Object.assign(document.createElement('span'), { className: 'label', textContent: label });
    const value = Object.assign(document.createElement('span'), { className: 'value', textContent: person[key] });
    const copy = Object.assign(document.createElement('button'), { textContent: 'Copy', title: `Copy ${label}` });
    copy.addEventListener('click', () => copyText(person[key], label));
    li.append(name, value, copy);
    if (key !== 'state') {
      const dice = Object.assign(document.createElement('button'), { textContent: '↻', title: `Re-roll ${label}` });
      dice.addEventListener('click', () => update(() => reroll(person, key, ctx())));
      li.append(dice);
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

async function autofill() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: fillForm,
      args: [person],
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
    const hasData = addresses[code]?.length > 0;
    select.append(Object.assign(document.createElement('option'), {
      value: code, disabled: !hasData, textContent: `${name} (${code})${hasData ? '' : ' - no data'}`,
    }));
  }
  const usable = (code) => addresses[code]?.length > 0;
  select.value = usable(saved.state) ? saved.state : Object.keys(STATES).find(usable);
  $('domain').value = saved.domain || 'example.com';

  $('generate').addEventListener('click', () => {
    chrome.storage.local.set({ state: select.value, domain: $('domain').value.trim() });
    update(() => generate(select.value, ctx()));
  });
  $('copy-line').addEventListener('click', () => copyText(oneLineAddress(person), 'address'));
  $('autofill').addEventListener('click', autofill);
  $('copy-line').disabled = $('autofill').disabled = true;
  $('generate').click();
}

chrome.storage.local.get(['state', 'domain']).then(boot, () => boot({}));
