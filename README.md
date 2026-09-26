# YAQEEN / يقين

A MORE MEANINGFUL LIFE

Next.js App Router storefront and private operations workspace for an Islamic acrylic business. Source code and Supabase migrations live in this repository. Vercel runs the application; Supabase provides PostgreSQL, Auth, and Storage.

## Implementation status

This is a working application implementation, not a static mockup. It includes catalog/variants, a persistent cart, transactional COD checkout, secret-code tracking, staff authentication, live database permissions, production workflow, inventory adjustments, delivery/payment records, CMS draft/preview/publish, public media and private production files, reports, and audit history.

Local typecheck, lint, all 22 automated database/domain tests, and the production build pass. Read-only hosted Supabase connectivity and the server credential have been verified; live migrations, end-to-end Auth/Storage workflows, and Vercel deployment remain pending. A browser surface was unavailable for visual testing. Complete the launch acceptance test below before accepting real orders. See [implementation notes](docs/IMPLEMENTATION.md) for precise scope and limits.

## Local installation

Use Node.js 24 LTS and npm. The package lock pins installed dependencies. On Windows PowerShell with script execution disabled, use `npm.cmd` / `npx.cmd`.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Without Supabase configuration, the storefront shows a setup state; it does not invent catalog data or accept orders. Staff sign-in is at `/login`; CRM is at `/admin`.

## Environment variables

Set these in `.env.local` and in Vercel Project → Settings → Environment Variables. Use separate Supabase projects for Vercel Preview and Production.

| Variable                               | Purpose                                                  | Browser exposure |
| -------------------------------------- | -------------------------------------------------------- | ---------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL                                     | Public           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project publishable key                                  | Public           |
| `SUPABASE_SECRET_KEY`                  | Supabase secret key (legacy service-role JWT also works) | Server only      |
| `NEXT_PUBLIC_SITE_URL`                 | Canonical origin, e.g. `https://your-domain.example`     | Public           |

Never prefix the secret credential with `NEXT_PUBLIC_`. Never commit `.env.local`. The private client is in `src/lib/supabase/admin.ts` and imports `server-only`. Do not put bootstrap password variables into Vercel.

The public key works with the authenticated user's JWT and RLS. Normal staff data queries and mutations use that session, not the service role. See the official [Supabase SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs) and [Next.js installation guide](https://nextjs.org/docs/app/getting-started/installation).

## Supabase setup and migrations

Use a fresh project or review the migrations against your existing database before applying them. No live database has been modified by this implementation.

1. Create/select your Supabase project.
2. Copy its URL, publishable key, and server secret into `.env.local`.
3. Install/use the official Supabase CLI, then authenticate and link:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

All application tables, indexes, constraints, RLS, functions, roles, initial website content, and Storage buckets are created by the ordered files in `supabase/migrations/`. Do not replace this with undocumented Dashboard edits.

Alternatively, with PostgreSQL's `psql` installed, save the project connection string in `SUPABASE_DB_URL` in `.env.local`. Prefer the **session pooler** connection when your network cannot reach the direct IPv6 host. The password must be URL-encoded. This credential is for local migration tooling only and is not needed in Vercel.

```sh
npm run db:inspect
npm run db:migrate
npm run check:config
```

The migration command inspects existing tables/history, refuses an unrelated schema, and applies the pending batch and Supabase-compatible migration history in one transaction. It never loads development seed data. Credentials are passed to `psql` through its process environment rather than its command line. TLS defaults to `verify-full`; if your project's CA is required, download it from Supabase's database connection settings and set `SUPABASE_DB_SSLROOTCERT` to its local path. Explicit `sslmode` in your supplied connection string is respected. Set `PSQL_PATH` only if `psql` is not on PATH.

`check:config` is read-only and prints readiness results without credentials or private records. It verifies the server credential with Auth Admin, checks tables/bucket visibility, and checks whether public signup is disabled. A publishable key in `SUPABASE_SECRET_KEY` cannot perform account creation or privileged operations.

4. In Supabase Authentication settings, **disable new user sign-ups**. The staff application has no public signup. Accounts are created by owners through Auth Admin. The local `supabase/config.toml` also disables signup.
5. Set Authentication Site URL to your deployed application origin. Add your exact development/preview origins as needed. Email/password sign-in must be enabled; other identity providers are not required.
6. Keep Supabase Auth rate limits enabled. Enable database backups appropriate for your plan before launch.

For a local Supabase stack, install Docker and run `npx supabase start`, then `npx supabase db reset`. Reset is destructive **only for the disposable local stack**. Use the keys printed by that local stack in `.env.local`.

### Development seed

`supabase/seed.sql` contains seven draft designs, one illustrative active product with three stocked variants, categories, a gift collection, and production supplies. Local reset applies it. Do **not** apply the development seed to the production project. Production migrations include editable starting website copy but no products or staff credentials.

Arabic phrases are copied exactly from the supplied business brief. They are not automatically corrected, translated, or generated. Draft seed artwork is not production-approved Quranic artwork. Have the responsible administrator approve references and upload final assets before production.

## First Owner

The bootstrap command uses trusted server credentials locally, checks that no Owner is assigned, and creates a Supabase Auth account with no default password.

Temporarily set in `.env.local`:

```dotenv
OWNER_USERNAME=your_chosen_username
OWNER_NAME=Your Name
OWNER_PASSWORD=YOUR_UNIQUE_RANDOM_PASSWORD_AT_LEAST_12_CHARACTERS
```

The text above is a placeholder, not a credential. Choose your own password and run:

```sh
npm run bootstrap-owner
```

Sign in at `/login` using the username and password. Remove `OWNER_PASSWORD` from `.env.local` afterward. Never add these bootstrap variables to Vercel or Git.

Usernames normalize to lowercase ASCII letters, digits, and underscores (3–32 characters). Supabase internally authenticates `${username}@staff.yaqeen.invalid`; the contact email is stored separately in the private profile. These internal addresses do not receive email. Password reset is an owner-authorized CRM operation; no email reset flow is claimed.

Owners alone can manage accounts/roles in this release. The protected Owner role has all permissions. Existing owner accounts cannot be disabled/demoted or password-reset through ordinary CRM forms, preventing accidental lockout. Trusted recovery: use your Supabase Dashboard Auth user management to reset an owner's password; for an interrupted bootstrap, use the SQL editor with the known Auth user UUID to assign the existing Owner role:

```sql
insert into public.user_roles(user_id, role_id)
select 'REPLACE_WITH_EXISTING_PROFILE_UUID'::uuid, id
from public.roles where is_owner
on conflict do nothing;
```

Only project administrators with trusted database access should perform recovery. The profile must already exist. Do not run bootstrap concurrently.

## Architecture and security

- `src/app/(store)`: server-rendered catalog, CMS homepage/pages, cart, checkout, tracking.
- `src/app/admin`: protected workspace and permission-checked Server Actions.
- `src/app/api`: same-origin, validated public operations; authenticated upload/download endpoints.
- `src/lib`: Supabase clients, validation, catalog/CMS models, shared domain helpers.
- `src/components`: theme, accessible native forms, tables, catalog UI, CMS editor, operational views.
- `supabase/migrations`: relational data model and authoritative business rules.

PostgreSQL RLS is enabled on all application tables. Public users read active products/variants and published categories/collections. The public CMS function returns **only the published JSON snapshot**, never a draft. Customer, order, staff, audit, and operational tables have no anonymous read policy. `has_permission` checks active profiles and current role membership on every request. Disabling an account immediately removes its private database access even if an old JWT is still valid.

The server secret is limited to Auth account provisioning/reset, public checkout/tracking, abuse counters, public contact/subscription inserts, checkout fee lookup, and signing a narrowly authorized private download. Privileged functions revoke default PUBLIC execution grants and set an empty search path.

Checkout recalculates prices from active variants/products, locks stock rows, reserves quantity, creates order/customer/items/payment/delivery/production records in one transaction, and preserves item snapshots. The browser's displayed price is never authoritative. A request UUID and payload fingerprint make retries idempotent. Production transitions move one adjacent stage at a time and record history. Inventory decrements cannot go below zero.

Tracking requires a 256-bit random code and order number. Only a hash is stored in PostgreSQL. The endpoint returns order number, status, and timestamps, not addresses, phone, email, or line items. The confirmation code is stored in the customer's current browser session; it is not emailed. Customers should save it before closing their session.

Audit triggers record before/after changes for business records. Passwords and Auth secrets never enter application tables or audit metadata. Production-file download authorization writes a separate audit event. Payment status changes record manual bookkeeping; they do not transfer or refund funds.

## Storage

| Bucket             | Visibility | Limits                  |
| ------------------ | ---------- | ----------------------- |
| `product-images`   | Public     | JPEG/PNG/WebP, 10 MB    |
| `website-media`    | Public     | JPEG/PNG/WebP, 10 MB    |
| `design-previews`  | Public     | JPEG/PNG/WebP, 10 MB    |
| `production-files` | Private    | PDF/PNG/TIFF/ZIP, 50 MB |

Uploads go directly from the browser to Supabase through a signed upload token, avoiding Vercel body-size limits. Finalization checks the upload record, current permissions, and Storage object, then registers metadata atomically. Public media and private artwork never share a bucket. Bucket-relative public URLs resolve against the configured Supabase URL.

Private files have **no direct client SELECT policy**. `/api/production-file/[id]` requires `download_production_files`, records authorization in the audit log, and issues a 60-second signed download URL. Signed links are bearer links until they expire; do not share them.

Use Supabase-hosted media in image fields. Next.js image optimization allows the configured Supabase HTTPS host. Product image replacement changes a reference to a new reusable asset; originals remain in the library until unused and deleted. Media deletion checks references first. Abandoned upload objects/requests require periodic project-admin cleanup; automatic scheduled cleanup is not included.

## CMS and daily operation

Website → Homepage controls section visibility/order, headings, Arabic, body, images, CTAs, selected products, and collections. Navigation/Footer/FAQs/Contact/About and new pages use the same draft model. Page metadata is editable there. Promotional banners are homepage sections. Theme supports primary colors for light/dark; base palettes remain the brand's accessible defaults.

Use **Save draft → Preview saved draft → Publish saved draft**. Unsaved editor changes are not included in a preview or publication. Preview supports mobile/desktop width and light/dark. Unpublish preserves the draft. Publishing requires `website.publish`, independently of `website.edit`.

Owners can create/edit products, variants, categories, collections, designs and staff; upload public images/private production files; set inventory; process production; record deliveries and cash payments; and publish content without code changes. Prices and delivery fee use integer USD cents. Theme choice persists per browser and supports system preference. Artwork is never color-inverted.

## Verification

```sh
npm run lint
npx next typegen
npm run typecheck
npm test
npm run build
```

Tests use PGlite (embedded PostgreSQL) with emulated Supabase Auth roles and Storage tables. They execute all migrations; `pgcrypto.digest` alone is substituted with PostgreSQL's built-in SHA-256 because the embedded engine lacks that extension. Coverage includes anonymous privacy, role escalation denial, transactional checkout, price tampering, retries, insufficient stock rollback, secure tracking, draft isolation/publishing, transitions, inventory invariants, disablement, and private-file authorization/auditing. These are not a substitute for hosted Auth/Storage integration testing or real-device visual review.

GitHub Actions runs lint, typecheck, tests, and build on PRs and main pushes. No production secrets are required for those checks.

## Vercel and GitHub workflow

1. Push the implementation feature branch and open a PR against `main`.
2. Import this repository into Vercel. Framework: Next.js; root: repository root; install: `npm ci`; build: `npm run build`; output: default.
3. Select Node.js 24. Set the four application variables above for Preview using a staging Supabase project.
4. Apply migrations to that project and bootstrap a staging owner. Review the Preview deployment using the acceptance test below.
5. Apply reviewed migrations to the production Supabase project, configure Production variables and Site URL, and bootstrap its owner.
6. Merge the reviewed PR. Set Vercel production branch to `main` and confirm its deployment succeeds.

There is no need for custom servers, background workers, or nonstandard Vercel routing. Preview deployments must not share production credentials/data. No GitHub push, PR, merge, live migration, or Vercel deployment has been performed from this workspace.

## Launch acceptance test

1. Owner login → create a draft product → upload an image → add a variant → adjust stock with a reason → publish the product.
2. Verify the product/image/variant in the storefront on a phone and desktop, in light/dark/system modes.
3. Add to cart → alter quantity → checkout using COD → save the private tracking code.
4. Verify exactly one order, its server-priced items, stock movement, pending payment/delivery, and production job in CRM.
5. Retry the same checkout request and confirm no duplicate order or stock movement.
6. Move the production job one stage at a time. Check history and customer tracking updates.
7. Create a Production user. Confirm it cannot see customer/payment data without those permissions and cannot manage staff or publish CMS content.
8. Upload a private PDF. Confirm an unauthenticated user cannot retrieve it, an authorized download works, and its audit event appears.
9. Edit a homepage draft; confirm the live page is unchanged. Preview both sizes/themes, publish, and confirm the live update.
10. Test the Samsung Internet browser on a real Android phone, keyboard navigation, error/retry paths, and successful upload sizes against your hosted Storage project.
