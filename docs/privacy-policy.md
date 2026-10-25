# Privacy policy for Random Address

Last updated: 2026-10-25

Random Address does not collect, transmit, sell or share any personal data. It has no servers, no accounts, no analytics and no tracking.

## What the extension does with data

- **Generated details** (name, address, phone, email) are created on your device from data bundled inside the extension. They are shown in the popup, copied to your clipboard if you press Copy, and written into a form on the current tab if you press Autofill. They are not stored and not sent anywhere.
- **Your settings** are saved on your device in `chrome.storage.local`: the state you last picked, your email domain, your email style, and which fields you've ticked for autofill. They never leave your browser and are removed when you uninstall the extension.
- **Web pages:** the extension reads a page's form fields only when you press **Autofill this page**, and only on the tab you're on (Chrome's `activeTab` permission). It does not read, store or transmit what is on the page, other than looking at field names and labels to decide where to put each value.

## Network access

The extension makes no network requests. Its manifest declares no host permissions, and its content security policy forbids all connections (`connect-src 'none'`). The source is unminified and checked automatically for network code. You can verify this yourself: see the "Don't trust me, check me" section of the [README](../README.md).

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | To fill the form on the tab you're on, after you click. |
| `scripting` | To run the fill routine in that tab. |
| `storage` | To remember your settings on your device. |

## Third parties and data sources

The bundled address, name and surname data comes from public US government datasets (see Provenance in the README). No third party receives anything from you through this extension.

## Changes and contact

If this policy changes, the new version will be committed to this repository, where the history shows what changed. Questions or concerns: open an issue at https://github.com/launchstack-dev/browser-random-address/issues.
