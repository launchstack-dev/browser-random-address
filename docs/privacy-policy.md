# Privacy policy for Random Address

Last updated: 2026-10-28

Random Address does not collect, sell or share any personal data. It has no servers, no accounts, no analytics and no tracking. Nothing leaves your browser unless you turn on an optional alias service, described below.

## What the extension does with data

- **Generated details** (name, address, phone, email) are created on your device from data bundled inside the extension. They are shown in the popup, copied to your clipboard if you press Copy, and written into a form on the current tab if you press Autofill. They are not stored and not sent anywhere. The one exception is an alias you create with an alias service: it is kept in session storage (`chrome.storage.session`) together with the site it was made for, so it isn't lost if the popup closes, and is cleared when you quit the browser.
- **Your settings** are saved on your device in `chrome.storage.local`: the state you last picked, your email domain, your email style, which fields you've ticked for autofill, and, if you use one, your alias service and its key. The key is stored as plain text. They never leave your browser, except the key as described below, and are removed when you uninstall the extension.
- **Web pages:** the extension reads a page's form fields only when you press **Autofill this page**, and only on the tab you're on (Chrome's `activeTab` permission). It does not read, store or transmit what is on the page, other than looking at field names and labels to decide where to put each value.
- **The current site's address:** when you open the popup, the extension reads the hostname of the tab you're on (for example `www.amazon.com`), again through `activeTab`. It is used only to build an email like `amazon.k7qx2@yourdomain.com` when you choose the **From the site** email style. It is held in memory while the popup is open. It is stored only alongside an alias you create, in session storage as described above. It is sent only to Firefox Relay, and only if you create a Relay alias (see below).

## Network access

By default the extension makes no network requests. Its manifest declares no host permissions, and its content security policy allows connections only to the two alias services below.

**Optional alias services.** If you choose Firefox Relay or DuckDuckGo under **Alias service** and grant the browser's permission prompt, pressing **@** sends one request to that service to create a new email alias:

- **Firefox Relay** (`relay.firefox.com`, run by Mozilla) receives your API key and the hostname of the current tab, which Relay stores with the new mask.
- **DuckDuckGo** (`quack.duckduckgo.com`) receives your access token and nothing else.

Like any web request, each one also reveals your IP address, your browser's user agent and the extension's identifier (in the `Origin` header) to that service. Requests are sent without your browser cookies. The service's own privacy policy covers what it does with the request. Nothing is sent to any other party, and nothing is sent at all until you press **@**. To stop, set **Alias service** to None: the extension gives up its access to that service at the same time. You can confirm it in your browser's extension settings under Site access.

The source is unminified and checked automatically for network code. You can verify this yourself: see the "Don't trust me, check me" section of the [README](../README.md).

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | To fill the form on the tab you're on, after you click, and to read that tab's hostname for the **From the site** email style. |
| `scripting` | To run the fill routine in that tab. |
| `storage` | To remember your settings, including an alias service key if you add one, on your device. |
| Optional: `relay.firefox.com`, `quack.duckduckgo.com` | Requested only when you pick that alias service, to create aliases when you press **@**. |

## Third parties and data sources

The bundled address, name and surname data comes from public US government datasets (see Provenance in the README). No third party receives anything from you through this extension, except the alias service you choose to use, as described above.

## Changes and contact

If this policy changes, the new version will be committed to this repository, where the history shows what changed. Questions or concerns: open an issue at https://github.com/launchstack-dev/browser-random-address/issues.
