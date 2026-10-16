\# Zendesk Ticket Copy Button



A simple Firefox extension that adds a "Copy" button next to Zendesk ticket elements, allowing you to easily copy ticket data to the clipboard.



Download here -> https://addons.mozilla.org/en-US/firefox/addon/zendesk-ticket-copy-button/



\## 🧩 Features



\- Copies ticket numbers

\- Runs only on relevant Zendesk pages

\- Lightweight, no external dependencies



\## 📸 Screenshots



<img src="https://raw.githubusercontent.com/haydencpuk/zendeskticketcopyforfirefox/main/assets/screenshot1.jpg" width="600" />



<img src="https://raw.githubusercontent.com/haydencpuk/zendeskticketcopyforfirefox/main/assets/screenshot2.jpg"/>

## Open in Obsidian (this fork)

This fork adds an **Obsidian** button beside **Copy**. It opens the ticket's note through the [QuickAdd](https://quickadd.obsidian.guide/) URI:

```
obsidian://quickadd?vault=<vault>&choice=<choice>&value-ticket=<ticket number>
```

QuickAdd runs the named choice and passes the ticket number to it as the `ticket` variable (`params.variables.ticket` in a user script). The vault name and choice name are set in the extension's settings popup. Leave the vault name blank to use whichever vault was open last.

Requirements on each machine: Obsidian installed with its `obsidian://` link handler registered, the QuickAdd plugin enabled, and a choice with the configured name.

To try it: `about:debugging` → This Firefox → Load Temporary Add-on → pick `manifest.json`.
