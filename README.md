# Random Address: offline random US address, name, phone and email generator for Chrome and Brave

Random Address generates a random US address, name, phone number and email for the state you pick, and fills the signup form on the current page with one click. It makes no network requests: no host permissions, no tracking, nothing leaves your browser.

<p align="center">
  <img src="docs/popup.png" alt="The Random Address popup showing a California name, address, phone number and email, each with a checkbox, copy and re-roll buttons" width="320">
</p>
<p align="center"><sub>The house number is masked in this screenshot. The extension shows the full address.</sub></p>

**In short:** pick a state, press Generate, press Autofill. You get a real street, city and ZIP from public address data, a name from census data, a phone number that can't ring anyone, and an email on a domain you choose. It works with Wi-Fi off, and you can check that it does.

## Why

Most signup sheets ask for a full name, street address and phone number when all they need is an email. Typing your real details into every one of them is how you end up on lists you never joined. Random Address gives you plausible, correctly formatted details in one click, so the form is satisfied and you've told it nothing about you.

It is built for people who distrust extensions, so the privacy claims are things you can check, not things you're asked to believe.

## What it generates

| Field | What you get | Where it comes from |
|---|---|---|
| Street, city, ZIP | A real address point in the state you pick | [USDOT National Address Database](https://www.transportation.gov/gis/national-address-database), about 1,000 points per state, bundled in the extension |
| First and last name | A common US name | SSA baby names (1970 to 2008) and US Census 2010 surnames. Never paired with a real person |
| Phone | A real area code for the state, then `555-0100` to `555-0199` | The 555-01XX block is reserved for fictional use, so the number can't ring anyone |
| Email | `james.shah93@yourdomain.com` or a random `k7qx2m9p4w@yourdomain.com` | Generated locally. The domain is yours to set |

Each field has a checkbox (include it in autofill or not), a copy button, and a re-roll button.

## Don't trust me, check me

Privacy tools earn trust by being easy to check. These take about a minute:

1. **Turn Wi-Fi off and press Generate.** It still works, because all the data is inside the extension.
2. **Look at the permissions.** Open `manifest.json`. The permissions are `activeTab`, `scripting` and `storage`. There is no `host_permissions`, no content script, no background page.
3. **Watch the network tab.** Right-click the popup, choose Inspect, open the Network tab, and press Generate a few times. You should see no requests to any `http` or `https` host.
4. **Run the check.** `npm run check` fails if any shipped file contains `fetch`, `XMLHttpRequest`, `WebSocket`, `eval`, or a URL.
5. **Watch the check fail.** `npm test` includes tests that inject a `fetch` call and a host permission into a copy of the project and assert that the check rejects both.

What these prove, and what they don't: steps 1 and 3 show the extension works offline now, which is weak evidence by itself. The real guarantee is the combination of the CSP, the absence of network code, and source you can read. Chrome has no permission that hard-blocks network access, so no extension can promise that through a setting. This one promises it through code you can inspect.

### Claims and how to check them

| Claim | How to check it |
|---|---|
| It asks for no access to websites | `manifest.json` has no `host_permissions` or `content_scripts` |
| It can't send data anywhere | The manifest CSP sets `connect-src 'none'` and `default-src 'none'` |
| It contains no network code | `npm run check` |
| That check actually works | `tests/check-no-network.test.mjs` |
| It has no dependencies | `package.json` lists none. There is no build step and no minification |
| It only runs when you click | There is no background page or content script. Autofill is injected into the current tab when you press the button, through `activeTab` |
| It stores nothing but your settings | `chrome.storage.local` holds your state, email domain, email style and checkbox choices, and nothing else |

## Install

Random Address isn't in the Chrome Web Store yet. Install it from source in Chrome or Brave (tested on Brave), or in another Chromium-based browser:

1. Clone or download this repository.
2. Open `chrome://extensions` (or `brave://extensions`) and turn on **Developer mode**.
3. Click **Load unpacked** and choose this folder.
4. Pin the extension from the puzzle-piece menu.

## Use

1. Pick a state and press **Generate**.
2. Press **Autofill this page** to fill the form, or use the per-field **Copy** buttons.
3. Press **↻** next to a field to re-roll just that one. Street, city and ZIP re-roll together so the address stays real.
4. Untick any field's checkbox to keep autofill away from it.

Autofill matches fields by their `autocomplete` attribute first, then by name, id, placeholder and label. It fills empty fields only (plus fields it filled earlier), and it skips passwords, usernames, company names and card fields. It does not reach into shadow DOM.

### Using it with SimpleLogin, Proton Pass or your own catch-all

- **Catch-all domain:** set the email domain to one you own that has catch-all enabled (SimpleLogin custom domains, Proton, or your own mail server). Every address Random Address generates then becomes a working alias. Pick the **Random** email style so the alias doesn't hint at the name on the form.
- **Let your password manager do the email:** untick the Email checkbox. Random Address fills everything else, and Proton Pass or SimpleLogin's own autofill creates the alias.

## FAQ

### Is there a random address generator that works offline?
Yes, this one. All the addresses are bundled in the extension, so it needs no network connection and sends nothing anywhere.

### Are the addresses real?
The streets, cities and ZIP codes are real address points from the USDOT National Address Database, with unit numbers, landmarks and coordinates removed. They are places, not people: the data has no names attached. They are also real places where people may live, which is why the limits below matter.

### Can the fake phone number call a real person?
No. The last seven digits always fall in `555-0100` to `555-0199`, a block reserved for fictional use. The area code is a real one for the state so the number looks right to a form.

### Does it phone home?
No. It has no network code, no host permissions, and a CSP that forbids connections. See [Don't trust me, check me](#dont-trust-me-check-me).

### Does it work with SimpleLogin or Proton Pass?
Yes, in two ways. See [Using it with SimpleLogin, Proton Pass or your own catch-all](#using-it-with-simplelogin-proton-pass-or-your-own-catch-all). It doesn't call either service's API, because that would need network access.

### Which states are covered?
44 states plus DC. See [Coverage](#coverage).

### Is it on the Chrome Web Store?
Not yet. Install it from source for now.

## Limits and what it won't do

- It is for filling in signup sheets without handing out your real details. It is not for fraud, for getting past age or identity checks, for ordering deliveries to addresses that aren't yours, or for impersonating anyone.
- It will not generate Social Security numbers, card numbers, government ID numbers, real people's phone numbers, or non-US addresses.
- The addresses are real places. A site that verifies an address against a postal database will accept the street, but it may still reject a made-up unit or house number.
- It won't beat a form that checks your phone number or email by sending you a code.

## Coverage

44 states plus DC, about 1,000 address points each. HI, MI, MS, NV and NH have no usable rows in NAD release 24, and RI's rows have no city, so those six show as "no data" (disabled) in the dropdown. Adding them means sourcing addresses elsewhere. OpenStreetMap is an option, but its ODbL license adds share-alike obligations.

## Compared with the alternatives

Different kinds of tools solve this differently. The question that separates them for a privacy-minded user is what each one sends over the network.

| Kind of tool | Real addresses | Works offline | Needs access to sites |
|---|---|---|---|
| Web-based generator sites | Often | No | No, but your choices go to a server |
| Form-filler extensions with fake-data libraries | Rarely (made-up streets) | Usually | Often, on every site |
| Password-manager identities | You enter them | Depends | Through the manager |
| **Random Address** | Yes | Yes | Only on the tab you click, through `activeTab` |

That table is about categories, not products. Check any specific tool's permissions yourself.

## Provenance

Every field traces back to a source:

| Data | Source | Version | Terms |
|---|---|---|---|
| Street, city, ZIP | USDOT National Address Database, text file release 24 | Downloaded 2026-10-25 | **Redistribution terms unconfirmed.** The catalog records disagree, and a written answer from nad@dot.gov is pending |
| First names | SSA baby names, top 1,000 per year and sex, 1970 to 2008, via the [hadley/data-baby-names](https://github.com/hadley/data-baby-names) mirror (ssa.gov blocks scripted downloads) | 2008 data, the mirror's last year | SSA data is a US government work. The mirror has no license file of its own |
| Surnames | [US Census 2010 surnames](https://www.census.gov/topics/population/genealogy/data/2010_surnames.html), top 1,000 | 2010 | US government work |
| Area codes | Real, in-service NANP area codes per state, written by hand | n/a | n/a |
| Phone tail, email | Generated locally | n/a | `555-0100` to `555-0199` is reserved for fiction |

What the build removes: unit, building, floor, room and landmark rows; rows with placeholder or junk streets or cities; rows with invalid ZIPs; `(city, ZIP)` pairs that appear fewer than three times; coordinates and every other NAD field. It then keeps a random sample per state. NAD is aggregated from many local sources, so a few mislabeled rows can survive.

**Before this repository goes public,** confirm NAD's redistribution terms with nad@dot.gov.

## Building the data

`scripts/build-data.mjs` is the only code that touches the network, and only on a developer machine. Its output in `data/` is committed, so using or installing the extension never runs it.

```sh
# Names: SSA baby names (GitHub mirror) and Census 2010 surnames
node scripts/build-data.mjs names

# Addresses: the NAD text file is an 8.5 GB zip that uses Deflate64, so you need 7-Zip
# (`brew install sevenzip`) and about 9 GB of free disk. Delete the zip afterwards.
curl -L -o nad.zip "https://data.transportation.gov/api/views/fc2s-wawr/files/596a301b-d548-4589-8c63-6b6a8dc34f30?filename=TXT.zip"
7zz e -so nad.zip TXT/NAD_r24.txt | node scripts/build-data.mjs addresses
```

## Development

There is no build step and no dependencies. Node runs the tests (developed on Node 26).

```sh
npm run ci      # no-network check plus all tests
npm run check   # just the no-network check
npm test        # just the tests
```

## Glossary

- **Catch-all domain:** a domain whose mail server accepts mail for any address, so every address you invent works.
- **CSP (Content Security Policy):** a rule in `manifest.json` that limits what the extension's pages can load or connect to. This one forbids all connections.
- **NAD:** the National Address Database, the US Department of Transportation's collection of address points from state and local governments.
- **555-01XX:** the telephone numbers `555-0100` to `555-0199`, which are reserved for use in fiction and never assigned to real subscribers.
- **`activeTab`:** a Chrome permission that gives an extension access to the current tab only after you click it.

## License

The code is [MIT](LICENSE). The bundled data has its own terms: SSA and Census data are US government works, and NAD's redistribution terms are still being confirmed (see [Provenance](#provenance)).
