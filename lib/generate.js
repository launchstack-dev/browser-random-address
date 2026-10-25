import { STATES } from './states.js';

// Uniform integer in [0, max) from the OS CSPRNG, without modulo bias.
export function cryptoInt(max) {
  const limit = Math.floor(2 ** 32 / max) * max;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return buf[0] % max;
}

const pick = (arr, rng) => arr[rng(arr.length)];
const pad2 = (n) => String(n).padStart(2, '0');
const slug = (s) => s.toLowerCase().replace(/[^a-z]/g, '');

export function titleCase(s) {
  const t = s.charAt(0) + s.slice(1).toLowerCase();
  return t.replace(/^Mc([a-z])/, (_, c) => `Mc${c.toUpperCase()}`);
}

function requireData(data, state) {
  const rows = data.addresses[state];
  if (!rows?.length) throw new Error(`No address data for ${state}. Run scripts/build-data.mjs.`);
  if (!data.names.last.length || !data.names.first.m.length || !data.names.first.f.length) {
    throw new Error('Name lists are empty. Run scripts/build-data.mjs names.');
  }
  return rows;
}

function newFirst(data, rng) {
  return titleCase(pick(data.names.first[rng(2) ? 'm' : 'f'], rng));
}

const newLast = (data, rng) => titleCase(pick(data.names.last, rng));

function newAddress(data, state, rng) {
  const [num, street, city, zip] = pick(data.addresses[state], rng);
  return { street: `${num} ${street}`, city, zip };
}

function newPhone(data, state, rng) {
  return `${pick(data.areaCodes[state], rng)}-555-01${pad2(rng(100))}`;
}

const ALNUM = 'abcdefghijklmnopqrstuvwxyz0123456789';

// 'name' derives the local part from the generated name; 'random' is unrelated
// to it, which suits a catch-all domain where the alias itself shouldn't hint at who it is.
function newEmail(person, domain, rng, style) {
  if (style === 'random') {
    const local = Array.from({ length: 10 }, () => ALNUM[rng(ALNUM.length)]).join('');
    return `${ALNUM[rng(26)]}${local}@${domain}`;
  }
  return `${slug(person.first)}.${slug(person.last)}${10 + rng(90)}@${domain}`;
}

export function generate(state, { data, domain = 'example.com', emailStyle = 'name', rng = cryptoInt }) {
  requireData(data, state);
  const person = {
    first: newFirst(data, rng),
    last: newLast(data, rng),
    ...newAddress(data, state, rng),
    line2: '',
    state,
    stateName: STATES[state],
    phone: newPhone(data, state, rng),
  };
  person.email = newEmail(person, domain, rng, emailStyle);
  return person;
}

// Re-rolls one field and returns a new person. Street, city and ZIP move
// together so the address stays real; a name change refreshes the email.
export function reroll(person, field, { data, domain = 'example.com', emailStyle = 'name', rng = cryptoInt }) {
  const next = { ...person };
  switch (field) {
    case 'first':
      next.first = newFirst(data, rng);
      next.email = newEmail(next, domain, rng, emailStyle);
      break;
    case 'last':
      next.last = newLast(data, rng);
      next.email = newEmail(next, domain, rng, emailStyle);
      break;
    case 'street':
    case 'city':
    case 'zip':
      Object.assign(next, newAddress(data, person.state, rng));
      break;
    case 'phone':
      next.phone = newPhone(data, person.state, rng);
      break;
    case 'email':
      next.email = newEmail(next, domain, rng, emailStyle);
      break;
    default:
      throw new Error(`Cannot re-roll ${field}`);
  }
  return next;
}

export const oneLineAddress = (p) => `${p.street}, ${p.city}, ${p.state} ${p.zip}`;
