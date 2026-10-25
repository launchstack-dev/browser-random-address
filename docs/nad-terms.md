# NAD data terms: what we found

Researched 2026-10-25. This is a reading of public sources, not legal advice.

## What the US Department of Transportation says

From DOT's own [NAD disclaimer page](https://www.transportation.gov/mission/open/gis/national-address-database/national-address-database-nad-disclaimer), read from a [Wayback Machine snapshot taken 2026-01-18](https://web.archive.org/web/20260118054031/https://www.transportation.gov/mission/open/gis/national-address-database/national-address-database-nad-disclaimer). The page itself blocks scripted access, and the snapshot shows it last updated 2026-01-09.

| Topic | What the page says |
|---|---|
| Copyright | The NAD "is a work of the federal government and as such is not subject to copyright protection in accordance with 17 U.S.C. § 105." |
| Re-use | "It is available for re-use without limitation or restriction." |
| Attribution | None required. |
| Mailing lists | "Although the NAD is open data, it is not intended for use as a mailing list and is subject to individual state statutes that prohibit it's use as a mailing list." |
| Accuracy | Provided "as is". USDOT "makes no warranties" on accuracy, completeness or suitability, and the data "should not be construed or used as a legal description." |
| Liability | Users "agree to indemnify, defend, and hold harmless USDOT" for liability arising from inaccuracy or from use of the data. |
| Origin | "A compilation of data provided by state, local, and tribal governments", "with few exceptions, aggregated from state data, which is in turn aggregated from local data." |

## What the catalog records say

- The [data.transportation.gov record](https://data.transportation.gov/d/fc2s-wawr) for the text file has no license field set. Its metadata says Rights: `public`, Restriction Status: `Public`, CUI: not applicable. Publisher: US Department of Transportation. Contact: NAD@dot.gov.
- The [data.gov record](https://catalog.data.gov/dataset/national-address-database-nad-text-file) also states no license, only Rights: `public` and access level `public`.
- A search summary claimed a public-domain license URL on the current data.gov entry and a CC0 license on a 2017 entry. I could not confirm either by reading the records, so I'm not relying on them. The earlier "catalog records disagree" note in this repo came from that summary and is withdrawn.

## What this means for this project

- Redistributing a small sample of NAD address points is covered by DOT's statement that the data may be re-used without limitation or restriction.
- We keep only number, street, city and ZIP, and drop NAD's per-row source and authority fields. DOT requires no attribution, and we credit NAD anyway in the README.
- The extension is not a mailing list. It hands out about 1,000 sampled address points per state, one at a time, to fill forms. The README says so and discourages mailing use.
- The "as is", no-warranty and indemnity language is addressed to users of the data. The README repeats that the addresses are provided as is, and the MIT license disclaims warranty for the code.

## What this does not settle

- DOT's 17 U.S.C. § 105 statement covers DOT's own work. Underlying records come from state, local and tribal governments, and DOT says states provide data "willingly, with no obligation". DOT does not say those providers waived rights in their own data. Street addresses are facts, which weakens any copyright claim, but I can't rule out a provider-level restriction. We sample across many sources and keep no per-row source, so we couldn't attribute one even if asked.
- State statutes that restrict mailing-list use are not listed on the page.
- Whether the indemnity clause binds people who only use the extension, and not the person who downloaded NAD, is a legal question I can't answer.

## Decision

We rely on DOT's published disclaimer and are not emailing NAD@dot.gov. The upstream-provider question above stays open and accepted. If it ever matters, a short question to NAD@dot.gov ("may we redistribute a sampled subset of NAD address points, number, street, city and ZIP, inside an open-source tool, and do any contributing states restrict that?") would settle it.
