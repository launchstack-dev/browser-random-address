// Injected into the active tab via chrome.scripting.executeScript({ func }).
// It is serialized with toString(), so it must not reference anything outside
// its own body.
export function fillForm(person, enabled) {
  const MARK = 'data-random-address';
  const SKIP_TYPES = /^(hidden|password|submit|button|reset|image|file|checkbox|radio|range|color|date|datetime-local|month|time|week|number)$/;

  const labelText = (el) => {
    const parts = [];
    if (el.labels) for (const l of el.labels) parts.push(l.textContent);
    const by = el.getAttribute('aria-labelledby');
    if (by) for (const id of by.split(/\s+/)) parts.push(document.getElementById(id)?.textContent ?? '');
    return parts.join(' ');
  };

  const AUTOCOMPLETE = {
    'given-name': 'first', 'family-name': 'last', name: 'full', email: 'email',
    tel: 'phone', 'tel-national': 'phone', 'street-address': 'street',
    'address-line1': 'street', 'address-line2': 'line2', 'address-level2': 'city',
    'address-level1': 'state', 'postal-code': 'zip', country: 'country',
    'country-name': 'country',
  };

  // Order matters: the first match wins.
  const HEURISTICS = [
    ['email', /e-?mail/],
    ['zip', /\b(zip|postal|post.?code)\b|zipcode/],
    ['phone', /phone|\btel\b|mobile|cell/],
    ['full', /full.?name|your.?name|^name\b/],
    ['first', /first.?name|given.?name|\bfname\b|forename/],
    ['last', /last.?name|sur.?name|family.?name|\blname\b/],
    ['line2', /address.?(line)?.?(2|two)|\b(apt|apartment|suite|unit)\b|street.?2|addr(ess)?2/],
    ['street', /street|address|addr1|address.?(line)?.?1/],
    ['city', /\bcity\b|\btown\b|locality/],
    ['state', /\bstate\b|province|region/],
    ['country', /country/],
  ];

  const kindOf = (el) => {
    const token = (el.getAttribute('autocomplete') || '').trim().toLowerCase().split(/\s+/).pop();
    if (AUTOCOMPLETE[token]) return AUTOCOMPLETE[token];
    if (el.type === 'email') return 'email';
    if (el.type === 'tel') return 'phone';
    const text = [el.name, el.id, el.placeholder, el.getAttribute('aria-label'), labelText(el)]
      .join(' ').toLowerCase();
    if (/user.?name|company|business|organi[sz]ation|card|account|nick|login|password|search|coupon|promo/.test(text)) return null;
    for (const [kind, re] of HEURISTICS) if (re.test(text)) return kind;
    return null;
  };

  const setValue = (el, value) => {
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement
      : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, value);
    el.setAttribute(MARK, '1');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const pickOption = (select, candidates) => {
    const want = candidates.map((c) => c.toLowerCase());
    for (const o of select.options) {
      if (want.includes(o.value.toLowerCase()) || want.includes(o.text.trim().toLowerCase())) return o.value;
    }
    return null;
  };

  const phoneFor = (el) => {
    const digits = person.phone.replace(/\D/g, '');
    return el.maxLength === 10 ? digits : person.phone;
  };

  const valueFor = (kind, el) => {
    switch (kind) {
      case 'first': return person.first;
      case 'last': return person.last;
      case 'full': return `${person.first} ${person.last}`;
      case 'email': return person.email;
      case 'phone': return phoneFor(el);
      case 'street': return person.street;
      case 'line2': return person.line2;
      case 'city': return person.city;
      case 'zip': return person.zip;
      case 'state': return el.maxLength === 2 ? person.state : person.stateName;
      case 'country': return 'United States';
      default: return null;
    }
  };

  // Which toggle governs each kind of field. A full-name field needs both name toggles.
  const allowed = (kind) => {
    if (kind === 'full') return enabled.first && enabled.last;
    if (kind === 'country') return enabled.state;
    return enabled[kind];
  };

  let filled = 0;
  for (const el of document.querySelectorAll('input, select, textarea')) {
    if (el.disabled || el.readOnly || SKIP_TYPES.test(el.type)) continue;
    // A select always has a value, so only its placeholder or default first option counts as empty.
    const empty = el instanceof HTMLSelectElement ? el.selectedIndex <= 0 : !el.value;
    if (!empty && !el.hasAttribute(MARK)) continue;
    const kind = kindOf(el);
    if (!kind || !allowed(kind) || (kind === 'line2' && !person.line2)) continue;

    if (el instanceof HTMLSelectElement) {
      const candidates = kind === 'state' ? [person.state, person.stateName]
        : kind === 'country' ? ['US', 'USA', 'United States', 'United States of America'] : [];
      const value = candidates.length ? pickOption(el, candidates) : null;
      if (value === null) continue;
      setValue(el, value);
    } else {
      setValue(el, valueFor(kind, el));
    }
    filled++;
  }
  return filled;
}
