// The only module that talks to the network, and only when the user presses
// "New alias" with an alias service turned on. The manifest CSP limits it to the
// two service URLs below, and the browser only lets it reach the one the user granted.

// Each service is data: where to post, how to authenticate, what to send, and how
// to read the new address back. Responses are untrusted, so every address must
// match its service's pattern before it can be filled into a form.
export const ALIAS_SERVICES = {
  relay: {
    label: 'Firefox Relay',
    url: 'https://relay.firefox.com/api/v1/relayaddresses/',
    keyHelp: 'Relay website, Settings, API Key',
    auth: (key) => `Token ${key}`,
    body: (site) => ({ enabled: true, description: site, generated_for: site, used_on: site }),
    address: (json) => json?.full_address,
    valid: /^[a-z0-9][a-z0-9._-]*@([a-z0-9-]+\.)?mozmail\.com$/,
    // Firefox data consent: the key, and the site's hostname sent with each mask.
    dataCollection: ['authenticationInfo', 'browsingActivity'],
  },
  duck: {
    label: 'DuckDuckGo',
    url: 'https://quack.duckduckgo.com/api/email/addresses',
    keyHelp: 'duck.com Email Protection, Autofill tab: the Bearer token sent when you generate a Private Duck Address',
    auth: (key) => `Bearer ${key}`,
    body: () => undefined,
    address: (json) => (typeof json?.address === 'string' ? `${json.address}@duck.com` : undefined),
    valid: /^[a-z0-9-]+@duck\.com$/,
    dataCollection: ['authenticationInfo'],
  },
};

// The host permission pattern for a service: its origin followed by /*.
export const permissionFor = (service) => `${new URL(ALIAS_SERVICES[service].url).origin}/*`;

// What to pass to permissions.request/remove for a service. Firefox 140+ (Android 142+)
// also asks the user to consent to the data the service receives; Chrome rejects the
// data_collection key, so it is only included where the browser supports it.
export const accessFor = (service, dataConsent) => ({
  origins: [permissionFor(service)],
  ...(dataConsent && { data_collection: ALIAS_SERVICES[service].dataCollection }),
});

const LIMIT_CODES = ['free_tier_limit', 'free_tier_no_subdomain_masks'];

export class AliasError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AliasError';
    this.code = code; // bad_key | limit | rate_limited | offline | refused | bad_response
  }
}

// Creates one new alias and returns its address. Throws AliasError with a message
// fit to show the user. site may be ''. Tests replace the global network function.
export async function createAlias(service, { apiKey, site = '', timeoutMs = 10000 }) {
  const svc = Object.hasOwn(ALIAS_SERVICES, service) ? ALIAS_SERVICES[service] : null;
  if (!svc) throw new Error(`Unknown alias service: ${service}`);
  const key = (apiKey ?? '').trim();
  if (!key) throw new AliasError('bad_key', `Add your ${svc.label} key first.`);

  const body = svc.body(site);
  let res;
  try {
    res = await globalThis.fetch(svc.url, {
      method: 'POST',
      headers: { Authorization: svc.auth(key), ...(body && { 'Content-Type': 'application/json' }) },
      body: body && JSON.stringify(body),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new AliasError('offline', `Couldn't reach ${svc.label}. Check your connection and try again.`);
  }
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const code = typeof json?.error_code === 'string' ? json.error_code : '';
    if (res.status === 401) throw new AliasError('bad_key', `${svc.label} didn't accept that key.`);
    if (LIMIT_CODES.includes(code)) throw new AliasError('limit', `${svc.label}: you've used all the aliases your plan allows.`);
    if (code) throw new AliasError('refused', `${svc.label} refused: ${String(json.detail ?? code).slice(0, 120)}`);
    if (res.status === 403) throw new AliasError('bad_key', `${svc.label} didn't accept that key.`);
    if (res.status === 429) throw new AliasError('rate_limited', `${svc.label} says slow down. Try again in a minute.`);
    throw new AliasError('refused', `${svc.label} returned an error (${res.status}).`);
  }

  const address = svc.address(json);
  if (typeof address !== 'string' || !svc.valid.test(address)) {
    throw new AliasError('bad_response', `${svc.label} sent back something that isn't an alias address.`);
  }
  return address;
}
