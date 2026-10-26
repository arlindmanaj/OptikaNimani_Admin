# Nimani Customer Studio

A private customer record system for Optika Nimani. It includes customer registration and editing, dated prescription history, purchase history, family connections and aftercare. Shopify continues to manage orders.

The interface defaults to Albanian with a persistent SQ/EN toggle. Language preference is the only data stored in browser local storage; business records stay in D1. Translations are explicit UI strings in `app/sq.json` and `app/locale.tsx`; user-entered descriptions, notes, names and preferences are never translated. Dates and EUR amounts use Albanian formatting in SQ mode. The monochrome design uses the original logo retrieved from https://optikanimani.com/ and included locally as `public/optika-nimani-logo.png`.

## Architecture

- React 19 + TypeScript, using the Vinext/Cloudflare Workers starter.
- Cloudflare D1: managed SQLite for customer and clinical record data. SQL migrations are tracked in `drizzle/`; the schema is in `db/schema.ts`.
- Cloudflare R2 for original prescription scans and photos, downloaded through an authenticated endpoint.
- Zod validates writes on the server as well as key client forms.
- Sites provides hosted ChatGPT sign-in and owner-only access. Every API operation additionally requires identity and checks record ownership.

Records live in the database, not browser local storage. Each signed-in account has its own records. This initial preview is owner-private; a shared staff workspace, staff roles and onboarding for the shop are future work and are not implemented by adding viewers to this preview.

## Local development

Use Node.js 24 (or a version supported by the starter, at least 22.13). On this computer, the bundled runtime is `C:/Users/arlin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`. Put its directory first on PATH before running the scripts; the system Node 22.11 is too old for the Vite native dependencies.

1. Install: `npm run install:ci`.
2. Build: `npm run build` (generates local Wrangler configuration).
3. Apply each pending local migration, once and in order:

   `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_yellow_ser_duncan.sql`

4. Start: `npm run dev`. Open the printed local URL.
5. Open `/signin-with-chatgpt?return_to=%2F` for the starter's **loopback-only simulated identity**. It is excluded from production builds.

Local D1/R2 data under `.wrangler/` is separate from deployed storage and is ignored by Git. No real data from the supplied reference image has been copied into the app or samples.

## Verification

- Type check: `node node_modules/typescript/bin/tsc --noEmit`.
- Build: `npm run build`.
- Local API integration checks: `node scripts/verify-studio.mjs http://127.0.0.1:5173` while the development server is running. The script refuses non-loopback URLs. It creates fictional local fixtures and archives them at the end; it does not touch production data.
- Browser checks: load optional samples, open a profile, add a prescription, inspect family contacts, and verify the phone layout. Optional samples can be removed from settings. Removing a sample customer also removes any records or files added to that sample.

## Data behavior

- Prescription grid: distance, computer/intermediate and near, each with OD (right) and OS (left), SPH, CYL, axis and PD. Combined binocular and per-eye monocular PD are explicit. Blank and zero values stay distinct. Entries are transcribed, not calculated or interpreted. The optician should confirm the exact final field set, including whether a separate ADD field is needed.
- A new prescription is a new entry. Corrections require a reason and append a linked revision; the original stays readable. One successor is allowed per revision, including under concurrent writes.
- Customer edits use a version check to prevent stale forms from overwriting newer changes. Customers can be archived and restored.
- Family relationships are stored once, shown in both directions, and can identify a relative as a contact person. Each family member keeps their own prescriptions and aftercare.
- Aftercare visits are append-only dated notes with a category and author attribution.
- Purchases have a date, category, description, brand/model, quantity, optional total in EUR, reference and notes. A purchase can link to a prescription belonging to the same customer. Amounts use integer cents, with missing and zero amounts kept distinct. Edits use version checks and record author-attributed activity. Archiving keeps purchase history. JSON exports include purchase records.
- Files: JPG, PNG and PDF, maximum 8 MB, with basic signature checks and private downloads. No OCR, automatic extraction or malware scanning is implemented.
- JSON export includes record data, attachment metadata and the latest 500 activity events. Binary attachments must be downloaded separately. There is no export import/restore workflow or scheduled backup job yet; the JSON export is not a complete disaster-recovery backup.

## Publishing

The Site identity and D1/R2 bindings are retained in `.openai/hosting.json`. Use the installed Sites skill workflow to build, synchronize source, package and deploy privately. Publishing applies tracked schema migrations to the hosted D1 database. Never commit credentials, `.wrangler`, runtime state or uploaded customer documents.

## Current scope

The interface supports Albanian and English. Purchase history is a manual record, not an order-management or checkout system. No loyalty automation, messaging, Shopify integration, appointments, billing or stock management are included. There is no automatic contact with customers. This is a working version for reviewing the shop's record workflow.
