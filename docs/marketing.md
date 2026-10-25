# Marketing and discoverability kit

Everything here says the same thing in different lengths, on purpose. The README title, the GitHub About line, the manifest description and any store listing should all use the same words, so search engines see one consistent description instead of three paraphrases.

Nothing here has been published. The repo is private. Work through the checklist at the bottom before it goes public.

## One-line positioning

> Offline random US address, name, phone and email generator for Chrome and Brave, with one-click form autofill. No network access, and you can check that.

## Copy at each length

| Where | Limit | Text |
|---|---|---|
| Manifest `description` | 132 characters | Offline random US name, address, phone and email generator with one-click form autofill. No network access. |
| GitHub About | 350 characters | Offline random US address, name, phone and email generator for Chrome and Brave. One-click signup form autofill. No network access: no host permissions, strict CSP, and a CI check that fails on any network code. Real address data, fictional 555-01XX phone numbers. |
| Chrome Web Store short description | 132 characters | Random US name, address, phone and email for signup forms. Works offline and never contacts a server. |
| Tagline | n/a | Fill the form. Tell it nothing. |
| Tagline (trust-first) | n/a | A signup-form filler that can't phone home. |

## GitHub topics (20 max)

`random-address-generator` `fake-address-generator` `address-generator` `privacy` `privacy-tools` `privacy-extension` `chrome-extension` `brave` `manifest-v3` `autofill` `form-filler` `offline` `no-tracking` `burner-identity` `simplelogin` `proton-pass` `email-alias` `data-minimization` `us-addresses` `javascript`

GitHub ranks repository search on the About text and topics more than on the README, so set these before going public.

## Search phrases the README answers

The README headings and FAQ use the phrases people actually type. Keep them as real answers, not keyword padding.

- random address generator offline
- fake us address for signup form
- random address generator chrome extension
- stop giving my real address to signup forms
- fake phone number that can't call anyone (555-0100)
- simplelogin catch-all autofill
- proton pass alias with fake name and address
- brave extension fake address autofill

## Launch posts (drafts)

**Show HN title:** Show HN: Random Address, an offline signup-form filler that can't phone home

**Show HN / r/privacy body:**

> Most signup forms ask for a full name, street address and phone number when they only need an email. I made a small Chrome/Brave extension that fills them with a random real US street (from the USDOT National Address Database), a census name, a phone number in the reserved 555-01XX block, and an email on a domain you choose, for example a SimpleLogin or Proton catch-all.
>
> The part I care about: it can't make network requests. No host permissions, a CSP with `connect-src 'none'`, no dependencies, unminified source, and a CI check that fails if any network code shows up (with tests that prove the check catches an injected `fetch`). The README has a one-minute way to verify that yourself.
>
> Covers 44 states plus DC. Five states have no rows in the NAD release and Rhode Island has no usable city, so they're disabled for now. Feedback welcome, especially on the autofill matching.

**Short post (social):**

> Built a signup-form filler for people who don't trust extensions. Random US name, address, phone and email, one-click autofill, zero network access. The README shows you how to check that yourself.

## Other places to list it (after it's public)

- awesome-privacy style lists, in the browser-extensions or data-minimization sections
- SimpleLogin and Proton community forums (the catch-all workflow)
- AlternativeTo, under the form-filler and fake-data categories

## Before it goes public

- [x] NAD terms researched: DOT publishes re-use without restriction, with a mailing-list caveat. See `docs/nad-terms.md`. Decided to rely on the published disclaimer and not email NAD@dot.gov.
- [x] License: MIT, in `LICENSE`. The copyright line says "Jensen Carlsen"; change it if that isn't the name or entity you want.
- [ ] Set the GitHub About line and topics above.
- [ ] Add a social preview image (1280×640) in the repository settings.
- [ ] Re-read the README's Limits section and decide whether the wording is what you want in public.
- [ ] Decide whether to publish to the Chrome Web Store. If so, reuse the store short description above, and expect the review to look closely at the "fake address" framing.
