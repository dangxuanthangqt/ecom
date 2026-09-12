# Permissions

**Project**: ecom (NestJS backend)
**Generated**: 2026-09-12
**Analysis Scope**: Headless backend API, 70 routes

> **Curated, plain-language view.** For PM/BA/client audiences. The raw PERM### matrix with
> file:line citations lives at [permissions-matrix.md](permissions-matrix.md). This file is
> derived from it.

## Authorization System Type

**System Type**: `rbac` (with one ownership rule layered on top — effectively `hybrid`)

Every request first needs a valid Bearer access token (unless the route is explicitly marked
public). Once authenticated, a second, per-route check runs: the caller's role must hold a
`Permission` row matching the exact route and HTTP method being called. That permission table
isn't a fixed list written in code — it is regenerated from whatever routes are actually
registered in the running app, then re-attached to each role by a module-name allowlist. One
route family (product management) adds a further "you can only touch your own records" rule on
top of the role check.

**Identified Roles**:
- `admin`
- `seller`
- `client`

## Curated View

- **Admin** can do everything: every one of the 70 routes across all 14 route modules (auth,
  users, roles, permissions, products, product management, brands, categories, languages, all
  translation endpoints, media, profile). Admin is also the only role that can promote another
  user to `seller` or `admin` (by editing a user's role), and the only role exempt from the
  "you can only edit your own product" rule.
- **Seller** can use auth, media upload, profile, product translations, and the seller-facing
  product-management endpoints (create/list/view/edit/delete products) — but only for products
  they created themselves; a seller cannot see or touch another seller's product. Seller cannot
  reach user management, role management, permission management, brand/category/language
  management, or the public product catalog endpoints (those are separate from the
  seller-scoped product-management ones).
- **Client** can use auth, media upload, profile, product translations, and the public catalog
  modules (products, categories, brands). Access within an allowed module is **not** read-only:
  role grants are filtered by module name only, never by HTTP method
  (`initial-scripts/create-permission.ts:158-169`), so a client holds every method registered
  under `BRANDS` and `CATEGORIES` — including create, edit and delete. Client cannot reach
  product management, user management, role management, permission management, or language
  management. [UNVERIFIED] Whether granting clients write access to brands and categories is
  intentional — the module allowlist makes no per-method distinction, so it may be an oversight
  in the seeding script rather than a deliberate policy. Confirm with engineering.
- Everyone (including anonymous callers) can register, log in, refresh a token, request an OTP,
  start/complete Google OAuth login, and request a password reset — these are the only
  unauthenticated endpoints in the system. The public product-catalog browse endpoints
  (`GET /products`, `GET /products/:id`) are also open to anonymous callers.

## Access Boundaries

The core boundary is **module ownership**: every route belongs to one of 14 modules (derived
from its URL's first path segment — e.g. `/users/*` is the USERS module, `/manage-product/*` is
the MANAGE-PRODUCT module). Admin is the only role attached to all 14 modules; Seller and Client
are each attached to a fixed subset. Six modules — brand translations, category translations,
languages, permissions, roles, and users — are reachable by no one except Admin. This makes
Admin the sole role able to manage other accounts, manage other roles/permissions, or manage the
catalog's reference/translation data (languages, brand/category translations).

A second, independent boundary sits inside product management only: even though Seller is
allowed into that module, each seller is fenced to records they created. Ownership is decided by
comparing the caller's user ID against the product's `createdById` — not by a separate
permission row. Admin bypasses this fence and can manage any seller's product.

Client and Seller access is otherwise flat within their allowed modules — once a role is granted
a module, it gets every method (view, create, edit, delete) registered under that module's URL
prefix; there is no finer-grained per-action split beyond the ownership fence above.

## Special Conditions

- **Default role at signup is fixed.** Registering an account (email/password or Google OAuth)
  always creates a `client`. There is no signup option to become a `seller` or `admin` — an
  existing admin must promote the account afterward by editing its role.
- **Three roles cannot be edited or deleted.** `admin`, `client`, and `seller` are the bootstrap
  roles created at project setup; the role-management endpoints explicitly block renaming,
  re-permissioning, or deleting these three (custom roles created later have no such
  protection).
- **The permission set is regenerated, not hand-maintained.** A maintenance script walks every
  route currently registered in the running app and rebuilds the permission table to match —
  removing rows for routes that no longer exist and adding rows for new ones — then reassigns
  each role's permissions by its module allowlist. This means the true, current permission set
  depends on this script having been run against the live route table; it cannot be fully
  confirmed from source code alone (see permissions-matrix.md PERM004 for the exact mechanism).
- **A documentation/behavior mismatch exists on one endpoint.** `GET /brands/:id` is labeled
  "Public" in the generated API documentation, but at runtime it still requires a valid Bearer
  token, since it's missing the one decorator that would actually make it public. Treat it as
  authenticated-only; the "Public" label is believed to be a documentation error, not intended
  behavior — flagged for the engineering team to confirm.
- **An unused alternate login method exists in the code.** An API-key-based authentication path
  is implemented (checks a hardcoded placeholder key) but is not attached to any current route —
  it does not affect access to any of the 70 endpoints today.
