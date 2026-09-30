# The Internet Is Haunted / reliquary

The published frontend is `index.html`, `reliquary.css`, and `reliquary.js`. The Worker serves archive lookups and a shared, permanent D1 collection. `public/index.html` is an unused historical prototype.

## Local development

Node 22.13 or newer: `npm start`. The local server runs the same Worker code and schema, backed by `.data/reliquary.sqlite`. Local entries stay local. `npm test` uses isolated in-memory SQLite and simulated upstream responses; it never publishes fixtures or calls Wayback.

## Deployment

Authenticate with `npx wrangler login`. Create a D1 database named `internet-is-haunted-reliquary`, add the returned `database_id` to the `RELIQUARY` binding in `wrangler.jsonc`, and apply `migrations/0001_reliquary.sql` before deploying `worker.js` to the existing `internet-is-haunted` Worker. Preserve the existing allowed website origins. Deploy the Worker before publishing the frontend.

Archive lookups remain usable if storage is unavailable. New saves require a server-issued discovery token (24-hour lifetime), so submitted titles and text are never trusted. Saving uses a unique normalized URL and is retry-safe; the first saved snapshot is retained. URL fragments are removed; HTTP and HTTPS remain distinct because their archived content can differ. No earlier user searches are claimed to have been retained.

Saved entries never require another Wayback request. The collection has descending accession pagination and random navigation. D1 holds the public snapshots; the edge cache holds only temporary lookup results. Empty results expire after five minutes; transient archive failures are not cached. A lookup has bounded upstream attempts and deadlines covering response bodies. Archive capture dates are not represented as site creation or death dates.

Back up the D1 database before any future schema migration. To remove an inappropriate entry, use its accession ID in an administrator-only D1 query; there is no public delete endpoint. The collection exposes recovered public text as plain text, never as HTML.
