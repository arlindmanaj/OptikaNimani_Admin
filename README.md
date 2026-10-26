# Nimani Customer Studio

A private customer record system for Optika Nimani. It includes customer registration and editing, dated prescription history, purchase history, family connections and aftercare. Shopify continues to manage orders.

The interface defaults to Albanian with a persistent SQ/EN toggle. Language preference is the only data stored in browser local storage; business records stay in D1. Translations are explicit UI strings in `app/sq.json` and `app/locale.tsx`; user-entered descriptions, notes, names and preferences are never translated. Dates and EUR amounts use Albanian formatting in SQ mode. The monochrome design uses the original logo retrieved from https://optikanimani.com/ and included locally as `public/optika-nimani-logo.png`.

## Architecture

- React 19 + TypeScript, using the Vinext/Cloudflare Workers starter.
- Cloudflare D1: managed SQLite for customer and clinical record data. SQL migrations are tracked in `drizzle/`; the schema is in `db/schema.ts`.
- Cloudflare R2 for original prescription scans and photos, downloaded through an authenticated endpoint.
- Zod validates writes on the server as well as key client forms.
- The app provides its own email/password staff sign-in. Administrator accounts create staff, activate/deactivate accounts and reset passwords. Every data and file endpoint requires a current staff session. Staff administration is enforced on the server.

Records live in the database, not browser local storage. All active staff share this one shop's D1/R2 records. Legacy owner identifiers are retained for provenance; existing records are available to staff without copying or reassigning patient histories. This Site hosts one store, not multiple tenants. The user approved a publicly reachable login page with all customer data protected by app authentication; no ChatGPT account is required for staff.

## Accounts and authentication

- Passwords use salted scrypt (N=32768, r=8, p=3, 64-byte output). Raw passwords are not stored or included in source.
- The initial administrator is bootstrapped once from `NIMANI_ADMIN_EMAIL` and `NIMANI_INITIAL_ADMIN_HASH` runtime secrets. The supplied plaintext password was hashed through hidden stdin. Existing staff accounts are never overwritten by bootstrap configuration.
- For local development, put the email and precomputed salted hash in ignored `.dev.vars`. `node scripts/password-credential.mjs` reads password JSON through hidden stdin and outputs hash parts; do not commit those credentials. Configure the same keys through Sites runtime secrets for hosted use.
- Sessions use random 256-bit tokens. Only SHA-256 token hashes are stored in D1. Hosted cookies are `__Host-` scoped, Secure, HttpOnly and SameSite=Lax; local HTTP uses `nimani-session`. Sessions expire after 12 hours. Every request checks the account remains active.
- Login has persistent per-email and per-IP attempt limits. Writes check their Origin. Password changes/resets and deactivation revoke sessions immediately. Administrators cannot deactivate themselves or remove the last active administrator.
- Staff have normal customer/prescription/purchase/aftercare access. Only administrators can manage staff accounts or add/remove the fictional sample dataset. There is no public signup, email sending or Google-account authentication. Password recovery is performed by another administrator; individual users can change their password in settings.

## Local development

Use Node.js 24 (or a version supported by the starter, at least 22.13). On this computer, the bundled runtime is `C:/Users/arlin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`. Put its directory first on PATH before running the scripts; the system Node 22.11 is too old for the Vite native dependencies.

1. Install: `npm run install:ci`.
2. Build: `npm run build` (generates local Wrangler configuration).
3. Apply each pending local migration, once and in order:

   `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_yellow_ser_duncan.sql`

4. Start: `npm run dev`. Open the printed local URL.
5. Open `/login` and sign in with a staff account. The starter's simulated ChatGPT identity no longer grants access to customer records.

Local D1/R2 data under `.wrangler/` is separate from deployed storage and is ignored by Git. No real data from the supplied reference image has been copied into the app or samples.

## Verification

- Type check: `node node_modules/typescript/bin/tsc --noEmit`.
- Build: `npm run build`.
- Local authentication and record integration checks: `node scripts/verify-auth.mjs http://127.0.0.1:5173` while the development server is running. Supply administrator email/password JSON through its hidden stdin prompt. It refuses non-loopback URLs, creates/deactivates local test staff, checks authentication, then runs the record suite with an in-memory real session. Test customers are archived. It does not touch production data.
- Family calculation checks: `node scripts/verify-family.mjs` with Node 24. Covers connected relatives, cycles without duplicate purchases, five-glasses example, missing amounts, unrelated customers, unlinking, and unchanged personal prescriptions.
- Browser checks: load optional samples, open a profile, add a prescription, inspect family contacts, and verify the phone layout. Optional samples can be removed from settings. Removing a sample customer also removes any records or files added to that sample.

## Data behavior

- Prescription grid: distance, computer/intermediate and near, each with OD (right) and OS (left), SPH, CYL, axis and PD. Combined binocular and per-eye monocular PD are explicit. Blank and zero values stay distinct. Entries are transcribed, not calculated or interpreted. The optician should confirm the exact final field set, including whether a separate ADD field is needed.
- A new prescription is a new entry. Corrections require a reason and append a linked revision; the original stays readable. One successor is allowed per revision, including under concurrent writes.
- Customer edits use a version check to prevent stale forms from overwriting newer changes. Customers can be archived and restored.
- Family relationships are stored once, shown in both directions, and can identify a relative as a contact person. Each family member keeps their own prescriptions and aftercare.
- Family purchase history follows the connected graph of relatives in either direction. On a sibling/relative's profile, staff see the same family purchases, purchase count, quantity of glasses/frames and recorded spend. Cycles do not duplicate records. The spend explicitly flags missing amounts. Clinical prescriptions remain customer-specific and are not included in the shared family sales view. Links can be removed to separate groups. There is no customer-facing family login or portal.
- Aftercare visits are append-only dated notes with a category and author attribution.
- Purchases have a date, category, description, brand/model, quantity, optional total in EUR, reference and notes. A purchase can link to a prescription belonging to the same customer. Amounts use integer cents, with missing and zero amounts kept distinct. Edits use version checks and record author-attributed activity. Archiving keeps purchase history. JSON exports include purchase records.
- Files: JPG, PNG and PDF, maximum 8 MB, with basic signature checks and private downloads. No OCR, automatic extraction or malware scanning is implemented.
- JSON export includes record data, attachment metadata and the latest 500 activity events. Binary attachments must be downloaded separately. There is no export import/restore workflow or scheduled backup job yet; the JSON export is not a complete disaster-recovery backup.

## Publishing

The Site identity and D1/R2 bindings are retained in `.openai/hosting.json`. Use the installed Sites skill workflow to build, synchronize source, package and deploy privately. Publishing applies tracked schema migrations to the hosted D1 database. Never commit credentials, `.wrangler`, runtime state or uploaded customer documents.

## Current scope

The interface supports Albanian and English. Purchase history is a manual record, not an order-management or checkout system. No loyalty automation, messaging, Shopify integration, appointments, billing or stock management are included. There is no automatic contact with customers. This is a working version for reviewing the shop's record workflow.
