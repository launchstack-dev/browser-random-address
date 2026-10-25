// Row cleaning and sampling for the NAD build. Pure functions, no I/O.

const DIRECTIONS = /^(N|S|E|W|NE|NW|SE|SW)$/i;
const ORDINAL = /^(\d+)(st|nd|rd|th)$/i;
const KEEP_UPPER = /^(US|SR|CR|FM|RR|PR|PO|II|III|IV)$/i;

export function normalizeCase(s) {
  return s.trim().replace(/\s+/g, ' ').split(' ').map((w) => {
    if (DIRECTIONS.test(w) || KEEP_UPPER.test(w)) return w.toUpperCase();
    if (ORDINAL.test(w)) return w.toLowerCase();
    return w.replace(/[A-Za-z]+/g, (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .replace(/^Mc([a-z])/, (_, c) => `Mc${c.toUpperCase()}`);
  }).join(' ');
}

// Not a city: placeholders and unincorporated-area labels. "City of X" is kept as X.
const NOT_A_CITY = /unincorporated|^county\b|\bcounty$|^rural\b|^unknown/i;
const CITY_PREFIX = /^(city|town|village|borough|township) of /i;
const NO_VALUE = /^(not stated|not supplied|unknown|none|null|n\/a|-+)?$/i;
const JUNK = /\b(unknown|no ?name|unnamed|null|none|n\/a|tbd|unassigned|private|test)\b/i;
const NUMBER = /^[1-9]\d{0,5}$/;
const STREET = /^(?=.*[A-Za-z])[A-Za-z0-9 .'-]{2,40}$/;
const CITY = /^[A-Za-z][A-Za-z .'-]{1,29}$/;
const ZIP = /^(?!00000)\d{5}$/;

// Candidate column names, in preference order. Releases rename columns now
// and then, so the first one present in the header wins.
export const COLUMNS = {
  number: ['AddNo_Full', 'AddNum_Full', 'Add_Number'],
  street: ['StNam_Full', 'Street_Name'],
  state: ['State', 'State_Abbr'],
  zip: ['Zip_Code', 'Zip'],
};
// City sources in preference order. Post_City is often "Not stated", so the
// first one holding a real value wins, per row.
export const CITY_COLUMNS = ['Post_City', 'Inc_Muni', 'Uninc_Comm'];
// Any value in these means the point is a sub-unit or landmark, not a plain address.
export const BLOCKERS = ['Unit', 'Building', 'Floor', 'Room', 'Seat', 'Addtl_Loc', 'SubAddress', 'LandmkName'];

export function resolveColumns(header) {
  const index = new Map(header.map((h, i) => [h, i]));
  const cols = {};
  for (const [key, candidates] of Object.entries(COLUMNS)) {
    const found = candidates.find((c) => index.has(c));
    if (!found) throw new Error(`No ${key} column; looked for ${candidates.join(', ')}.\nHeader: ${header.join(',')}`);
    cols[key] = index.get(found);
  }
  cols.cities = CITY_COLUMNS.filter((c) => index.has(c)).map((c) => index.get(c));
  if (!cols.cities.length) throw new Error(`No city column; looked for ${CITY_COLUMNS.join(', ')}.\nHeader: ${header.join(',')}`);
  cols.blockers = BLOCKERS.filter((b) => index.has(b)).map((b) => index.get(b));
  return cols;
}

// Returns [number, street, city, state, zip] or null if the row is unusable.
export function cleanRow(fields, cols) {
  if (cols.blockers.some((i) => fields[i]?.trim())) return null;
  const number = fields[cols.number]?.trim();
  const rawStreet = fields[cols.street]?.trim() ?? '';
  const rawCity = cols.cities.map((i) => fields[i]?.trim() ?? '').find((c) => !NO_VALUE.test(c)) ?? '';
  const zip = fields[cols.zip]?.trim();
  const state = fields[cols.state]?.trim().toUpperCase();
  if (!NUMBER.test(number ?? '') || !ZIP.test(zip ?? '') || !/^[A-Z]{2}$/.test(state ?? '')) return null;
  if (JUNK.test(rawStreet) || JUNK.test(rawCity)) return null;
  const street = normalizeCase(rawStreet);
  const city = normalizeCase(rawCity.replace(CITY_PREFIX, ''));
  if (NOT_A_CITY.test(city)) return null;
  if (!STREET.test(street) || !CITY.test(city)) return null;
  return [number, street, city, state, zip];
}

// Minimal CSV line parser: quoted fields, doubled quotes, no embedded newlines.
export function parseLine(line) {
  if (!line.includes('"')) return line.split(',');
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// Uniform reservoir sample of up to `cap` items from a stream.
export class Reservoir {
  constructor(cap, rand = Math.random) {
    this.cap = cap; this.rand = rand; this.seen = 0; this.items = [];
  }
  add(item) {
    this.seen++;
    if (this.items.length < this.cap) this.items.push(item);
    else {
      const j = Math.floor(this.rand() * this.seen);
      if (j < this.cap) this.items[j] = item;
    }
  }
}

// Keep rows whose (city, ZIP) pair shows up at least `minPair` times in the
// pool, which filters out mislabeled city/ZIP combinations from messy sources.
// Then dedupe and take up to `n` rows at random.
export function finalizeState(pool, n, { minPair = 3, rand = Math.random } = {}) {
  const pairs = new Map();
  for (const [, , city, , zip] of pool) {
    const k = `${city}|${zip}`;
    pairs.set(k, (pairs.get(k) ?? 0) + 1);
  }
  const seen = new Set();
  const kept = [];
  for (const [num, street, city, , zip] of pool) {
    if (pairs.get(`${city}|${zip}`) < minPair) continue;
    const key = `${num}|${street}|${city}|${zip}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push([num, street, city, zip]);
  }
  for (let i = kept.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [kept[i], kept[j]] = [kept[j], kept[i]];
  }
  return kept.slice(0, n);
}
