# Chrome Web Store listing: copy and answers

Paste these into the Developer Dashboard. Nothing here has been submitted. Field names are from memory of the dashboard, so adjust to what you see.

## Package

Build the upload zip with `npm run package`. It writes `dist/random-address-<version>.zip` with only the shipped files, after running the no-network check. Bump `version` in `manifest.json` for every update you upload.

## Store listing tab

**Name** (max 45): Random Address

**Short description** (max 132): Random US name, address, phone and email for signup forms. Works offline and never contacts a server.

**Category:** Productivity. (Pick another if the dashboard offers a better fit, such as Privacy and Security.)

**Language:** English

**Detailed description:**

> Fill signup forms without handing over your real details.
>
> Pick a US state, press Generate, and Random Address gives you a random name, a real street address, a phone number that can't ring anyone, and an email on a domain you choose. Press Autofill and it fills the form on the current tab.
>
> It works completely offline. There is no server, no account, no analytics. The extension asks for no access to websites: it only touches the tab you're on, after you click.
>
> WHAT YOU GET
> • Name: a common US first and last name (SSA and Census data)
> • Address: a real street, city and ZIP in your chosen state, from the US Department of Transportation's National Address Database (44 states plus DC)
> • Phone: a real area code for the state, then 555-0100 to 555-0199, a block reserved for fiction, so it can't call anyone
> • Email: name-based or random, on your own domain. Point it at a SimpleLogin, Proton or other catch-all domain and each address becomes a working alias
> • Per-field checkboxes choose what Autofill fills. Re-roll any single field. Copy any field.
>
> DON'T TRUST ME, CHECK ME
> • No host permissions, no content script, no background page
> • A content security policy that forbids every network connection
> • No dependencies. The source is unminified and open
> • An automated check fails if any network code is added
>
> LIMITS
> The addresses are real places. Use this to fill signup sheets with details that aren't yours, not for fraud, identity checks, or mailings. It won't generate ID numbers, card numbers, or non-US addresses, and it can't pass a form that texts or emails you a code to a number or address you don't control.
>
> Open source (MIT): https://github.com/launchstack-dev/browser-random-address

**Screenshots:** upload the three images in `docs/store/` (1280×800). Suggested order: fill, choose-fields, offline.

**Website / support URL:** https://github.com/launchstack-dev/browser-random-address

## Privacy practices tab

**Single purpose:** Generate a random US name, address, phone number and email, and fill them into the signup form on the current tab.

**Permission justifications:**

| Permission | Justification |
|---|---|
| `activeTab` | Lets the extension fill the form on the tab the user is on, only after the user clicks Autofill, and read that tab's hostname when the user opens the popup, to label a generated email with the site (for example `amazon.k7qx2@yourdomain.com`). The hostname is not stored or sent anywhere. It grants no access to any other tab or site. |
| `scripting` | Runs the fill routine in the current tab after the user clicks Autofill. No code is loaded from anywhere else. |
| `storage` | Saves the user's last state, email domain, email style and field checkboxes on their own device (`chrome.storage.local`). Nothing is sent anywhere. |

**Host permissions:** none requested.

**Remote code:** No. All code is in the package. The CSP is `default-src 'none'; script-src 'self'; ...; connect-src 'none'`.

**Data usage:** the extension does not collect any user data. Leave every data-type box unticked, and tick the certifications that say you do not sell or transfer user data, do not use it for unrelated purposes, and do not use it for creditworthiness or lending.

**Privacy policy URL:** https://github.com/launchstack-dev/browser-random-address/blob/main/docs/privacy-policy.md

## Account tab

- **Trader / non-trader:** your declaration. The store asks for it for EU rules. This is a free, open-source tool, but the answer is yours to give.
- **Contact email:** shown publicly on the listing. Use one you're happy to publish.

## Notes for the reviewer (test instructions)

> No login or account is needed. Open the popup, choose a state, press Generate, then open any page with a signup form and press "Autofill this page". The extension makes no network requests and requests no host permissions. Source and tests: https://github.com/launchstack-dev/browser-random-address (run `npm run ci`).

## Review risks to expect

- "Fake address" framing. The listing says random and states its limits. Keep it that way if the reviewer asks for changes.
- Real addresses in the bundle. They come from the US government's NAD, which publishes them for re-use. See `docs/nad-terms.md`.
