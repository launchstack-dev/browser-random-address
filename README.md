# Random Address

A Chrome extension (Manifest V3) that generates a random US name, address, phone number and email for the state you pick, and can fill them into the signup form on the current page.

Built for people who don't want to hand real details to every signup sheet. It has no network access at all.

## What it generates

| Field | Source |
|---|---|
| Street, city, ZIP | A real address point from the USDOT [National Address Database](https://www.transportation.gov/gis/national-address-database), about 1,000 per state (50 states + DC), bundled in the extension |
| First / last name | SSA baby names (1970–2008) and US Census 2010 surnames, both US government data. Never paired with a real person |
| Phone | A real area code for the state, then `555-0100`–`555-0199`, a block reserved for fiction, so it can't ring anyone |
| Email | `first.last##@example.com` or a random local part like `k7qx2m9p4w@…`. The domain is editable. Point it at a catch-all domain (SimpleLogin, Proton, your own) and each address becomes a working alias |

The addresses are real public address points for form-filling and testing. Don't use them to misrepresent who you are where that matters (banking, government, payments).

## Privacy

- No `host_permissions`, no background page, no always-on content script. Autofill runs only when you click the button (`activeTab` + `scripting`). `storage` keeps your last state and email domain in `chrome.storage.local`.
- The extension CSP is `default-src 'none'; connect-src 'none'; script-src 'self'; …`, and the shipped source contains no `fetch`, `XMLHttpRequest`, `WebSocket`, `eval` or URLs.
- `npm run check` enforces this, and `npm run ci` runs it with the tests. There are no runtime dependencies and no build step: the source you read is the source that runs.
- Chrome has no permission that blocks network access outright, so the guarantee comes from the CSP, the absence of network code, and readable source.

## Coverage

45 states plus DC. HI, MI, MS, NV and NH have no rows in NAD release 24, and RI's rows have no usable city, so those six show as "no data" (disabled) in the dropdown. Adding them means sourcing addresses elsewhere; OpenStreetMap is an option but its ODbL license adds share-alike obligations.

## Install

1. `chrome://extensions` → turn on Developer mode → **Load unpacked** → pick this folder.
2. Pick a state, press **Generate**, then **Autofill this page** or copy fields one by one. ↻ re-rolls a single field.
3. The checkbox on each row decides whether that field is included in autofill, so you can leave the email to Proton Pass or SimpleLogin's own autofill. Your checkbox choices, email domain and email style are remembered.

Autofill matches `autocomplete` attributes first, then field names, ids, placeholders and labels. It fills empty fields only (plus fields it filled earlier), skips passwords, usernames, company and card fields, and doesn't reach into shadow DOM.

## Building the data

`scripts/build-data.mjs` is the only code that touches the network, and only on a developer machine. Its output in `data/` is committed.

```sh
# names: SSA baby names via a GitHub mirror (ssa.gov blocks scripted downloads) + Census 2010 surnames
node scripts/build-data.mjs names

# addresses: the NAD text file is an 8.5 GB zip using Deflate64, so it needs 7-Zip (`brew install sevenzip`)
# and 8.5 GB of free disk (zips can't be unpacked from a pipe). Delete the zip afterwards.
curl -L -o nad.zip "https://data.transportation.gov/api/views/fc2s-wawr/files/596a301b-d548-4589-8c63-6b6a8dc34f30?filename=TXT.zip"
7zz e -so nad.zip TXT/NAD_r24.txt | node scripts/build-data.mjs addresses
```

The address build drops sub-units and landmarks, junk streets, bad ZIPs and `(city, ZIP)` pairs that rarely occur, then keeps a random 1,000 per state. NAD is aggregated from many local sources, so some mislabeled rows can survive.

Before publishing publicly, confirm NAD's redistribution terms with nad@dot.gov. The catalog records disagree.
