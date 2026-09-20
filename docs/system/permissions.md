# Permissions

**Project**: ecom (NestJS backend)
**Generated**: 2026-09-12 · **Revised**: 2026-09-21 (RBAC refactor: semantic permission keys)
**Analysis Scope**: Headless backend API, ~70 routes

> **Curated, plain-language view.** For PM/BA/client audiences. The engineering deep-dive — how a
> request is authorized, how to add a permission, why this pattern — lives at
> [../authorization-guide.md](../authorization-guide.md). The raw PERM### matrix at
> [permissions-matrix.md](permissions-matrix.md) predates the 2026-09-21 refactor and describes the
> old route-based model; treat it as historical until `rebuild-spec` is re-run.

## Authorization System Type

**System Type**: `rbac` with a per-permission scope axis (`own` / `any`) — commonly called scoped RBAC.

Every request first needs a valid Bearer access token, unless the route is explicitly marked public.
Once authenticated, a second check runs: the caller's role must hold the **permission key** the route
declares. A key names a business capability, an action, and a reach — for example
`product:update:own` ("update products you created") or `brand:create:any` ("create any brand").

Keys are declared in code, directly on each route handler, and the list of keys is synced into the
database. Which role holds which key is data: for the three built-in roles it is defined in code and
re-applied on every seed; for roles created later it is edited through the role-management API.

A route is either public or declares a key — the application refuses to start otherwise. There is
no third state.

**Identified Roles**:
- `admin`
- `seller`
- `client`

All three are **system roles**: they cannot be renamed, re-permissioned or deleted through the API.

## Curated View

- **Admin** holds every key at `any` scope: full control over users, roles, languages, brands,
  categories, all translations, every seller's products, every order's fulfilment, and moderation
  (delete any review). Admin is also the only role that can delete media files, because file
  ownership is not yet recorded and so cannot be scoped.
- **Seller** manages **its own** products and product translations (create/read/update/delete,
  `own` scope), sees and advances the status of orders that contain its products, and can read
  brands and categories — which it needs to create a product. It also has everything a signed-in
  account gets (below). It cannot touch other sellers' products, cannot write brands or categories,
  cannot manage users or roles.
- **Client** has what every signed-in account gets: its own profile, cart, orders (create, read,
  cancel), its own reviews, media upload, and read access to brands and categories. It can browse
  the public catalogue. It **cannot** create, edit or delete brands, categories or product
  translations — it used to be able to, by accident; that grant was removed in the 2026-09-21
  refactor.
- **Everyone, including anonymous callers**, can register, log in, refresh a token, request an OTP,
  start/complete Google OAuth login, request a password reset, browse `GET /products`,
  `GET /products/:id`, `GET /brands` and `GET /reviews`.

## Access Boundaries

The core boundary is the **permission key**, not the URL. Two routes can share a URL prefix and
require different keys; one capability can span several routes. Within a key, the `scope` segment
draws the second boundary:

- `any` — the caller may act on every record.
- `own` — the caller may act only on records it owns. Ownership is decided in the service layer by
  comparing the caller's user ID against the record's `createdById` (products) or by filtering the
  query to orders that contain the caller's products (order fulfilment). A record the caller does
  not own resolves to 403 (products) or 404 (orders).

Holding `any` always implies `own`. A route declares the *minimum* it needs; a caller with the
wider grant passes and the service widens the data accordingly. This is how one `GET` route serves
both "seller sees own products" and "admin sees all" without a role name ever appearing in code.

## Special Conditions

- **Default role at signup is fixed.** Registering an account (email/password or Google OAuth)
  always creates a `client`. An existing admin must promote the account afterward.
- **System roles are frozen over HTTP.** `admin`, `client`, `seller` carry `isSystem = true`; the
  role endpoints refuse to edit or delete them. Their grants come from
  `src/constants/role-permission-matrix.constant.ts` and are rewritten on every seed, so an API
  edit would be silently undone — refusing is the honest answer.
- **The permission catalogue is code-owned and read-only over HTTP.** `GET /permissions` lists it;
  there is no create/update/delete. Grants are changed from the role side (`PUT /roles/:id`) for
  custom roles, or by editing the matrix in code (a reviewed change) for system roles.
- **Media deletion is admin-only.** No table records who uploaded which file, so `media:delete`
  cannot be scoped to `own`. Sellers and clients can upload; only admin can delete. This closes a
  hole where any signed-in user could delete any file by key.
- **Product-translation ownership follows the product.** A translation belongs to whoever created
  the product it translates. A seller sees, edits and deletes only translations of its own products
  and can only add translations to its own products; another seller's row resolves to 404. Admin
  (`any`) is unrestricted.
- **`GET /brands/:id` requires a token; `GET /brands` does not.** The list is public, the detail
  route requires `brand:read:any`, which all three roles hold. Flagged for engineering to decide
  whether the detail route should also be public.
- **An unused API-key authentication path exists in the code** but is attached to no route.
