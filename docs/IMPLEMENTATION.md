# Implementation scope and launch limits

The repository was empty. Work is isolated on `feature/yaqeen-v1`; no existing application was replaced.

## Implemented modules

| Area                 | Implementation                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Foundation           | Next.js 16.3.6, React, strict TypeScript, Tailwind, shared tokens, Arabic/RTL fields, light/dark/system                                                |
| Database/security    | Seven ordered migrations, relational schema, RLS, live roles/permissions, audit triggers, transactional business RPCs                                  |
| Staff                | Username/password Auth, owner bootstrap, staff creation/disable/reactivate/reset, role assignment and permission editor                                |
| Catalog              | Products, variants, categories, collections/membership, independent designs, curated Arabic, image attachment/replacement                              |
| Commerce             | Persistent cart/wishlist, COD checkout, server totals, stock locks, idempotency, order snapshots, private-code tracking                                |
| Operations           | Dashboard, orders/detail/history, production board/list, stock adjustments/history, supply creation, deliveries, manual payment states                 |
| CMS                  | Homepage sections/order/visibility, pages, navigation/footer/FAQ/contact, banners, media picker, draft/preview/publish/unpublish, primary theme colors |
| Media                | Direct signed uploads, title/alt/folder/search, reference-aware deletion, private production assets and audited downloads                              |
| Customer care        | Private profiles/addresses/order history, contact inbox, newsletter consent capture                                                                    |
| Reporting            | Date-filtered sales/order value/AOV, product/design quantities, payment totals, production/delivery distributions, global permission-filtered search   |
| Delivery engineering | Environment template, local Supabase config/seed, CI, deployment/owner documentation                                                                   |

## Decisions and remaining limits

- Hosted Supabase connectivity and the corrected server credential have been verified with read-only requests. Application tables/buckets still require migrations, and public signup must be disabled. Full hosted Auth/Storage workflows and Vercel deployment remain unverified.
- No browser surface was available. HTTP route checks and production compilation are not visual, keyboard, or Samsung-device QA.
- Currency is USD; delivery is a configurable flat fee. Taxes, shipping zones, discounts, gateways, automated refunds, cancellation/restocking, and accounting exports are not implemented.
- Payment state changes are manual COD bookkeeping. `Partially Refunded` is a status, not a partial refund transaction ledger.
- Guest checkouts intentionally create separate customer records rather than automatically merging identities based on unverified phone/email. Staff can view and edit those records; identity verification/customer merging is future work.
- Catalog/orders/audit have pagination; operational boards and lookup controls have explicit bounded query limits (typically 100–500 records). Large-scale operational pagination and advanced filters remain future work.
- Staff role creation/assignment is owner-only. No MFA enrollment UI, forced first-login password change, self-service email password recovery, or last-login display is included. Supabase Auth manages password hashing and sign-in rate limits.
- CMS uses structured sections instead of a drag-and-drop builder. Images are selected from media or supplied as URLs. Theme editing changes primary colors; other tokens remain centrally configured. Preview renders saved draft content, not unsaved edits.
- Newsletter consent and contact messages are captured in CRM. No outgoing email/SMS service is configured. Order confirmations/tracking codes are displayed in the checkout browser session, not sent automatically.
- Inventory records track supplies and sellable variants separately. Variant stock is reserved at checkout; supply consumption/BOM automation is not included.
- Audit history captures before/after row changes and explicit publish/download/account events. Account creation through Auth Admin spans services and uses compensating cleanup; it is not one cross-service database transaction.
- Public photography is missing. Placeholder artwork is explicitly illustrative; Quranic seed designs remain Draft for administrator review.
- SEO includes metadata, canonical product/home URLs, robots and a sitemap bounded to 1,000 records per catalog entity. Large catalogs should add sitemap sharding.
- Deployment is not claimed complete or production-validated. Use the README acceptance test on staging before merging to production.

## Phase verification

The database tests execute migrations against embedded PostgreSQL with Supabase role/Storage stand-ins. A production build without credentials verifies the fail-closed setup state and Next.js route compilation. No production secrets or default account credentials belong in source control.
