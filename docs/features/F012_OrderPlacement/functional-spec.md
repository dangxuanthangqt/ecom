---
authored_by: doc-writer
---

# Functional Spec — F012_OrderPlacement

**Priority**: P0
**Type**: mixed
**Generated**: 2026-09-12

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, Source citations, pseudocode,
key entities, and DB writes for a Dev/QA/SA audience.

**Traceability:** F012 → N/A (headless API — no screens) → US074, US075, US076, US077, US078, US079, US080 → N/A (no background logic) → ROUTE075, ROUTE076, ROUTE077, ROUTE078, ROUTE079, ROUTE080, ROUTE081 → N/A (no test cases generated yet)

## 1. Overview

**Problem:** A full cart cannot become a commitment — there is no record of what was bought, at
what price, or how far along delivery is.
**Solution:** Checkout converts selected cart lines into one order per seller, freezing the product
name, price, image, SKU value and quantity into `ProductSKUSnapshot` rows so later catalog edits
cannot rewrite history, and decrementing stock in the same transaction. Buyers track and cancel
their own orders; sellers/admins track and progress the orders touching their own products.
**Scope:** placing an order (checkout), buyer's own order list/detail, buyer cancellation,
seller/admin order visibility and status progression.
**Non-Scope:** payment (deferred, see `clarifications.md`); shipping address and fees (no Prisma
model); returns processing beyond setting the `RETURNED` status; seller replies or messaging (F013
covers reviews only, not seller-buyer chat).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Buyer | Any authenticated user (client/seller/admin) checking out their own cart | Convert cart lines into a trackable, cancellable order |
| Seller | An authenticated user with products in an order | See and progress orders containing their own products |
| Admin | Any admin caller | See and progress every order, same as a seller but unrestricted |

This feature consumes F011_ShoppingCart's cart lines as checkout's sole input, and is the
dependency F013_ProductReviews leans on for purchase-verified review eligibility.

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Buyer Order Lifecycle | List/view own orders, check out selected cart lines into per-seller orders, cancel own orders while still pending confirmation | US074, US075, US076, US077 | FR-001, FR-201, FR-202, FR-203, FR-204 | BR-O01, BR-O02, BR-O03, BR-O04, BR-O06, BR-O07, BR-O08 | N/A — headless API, no screens |
| CAP-02 | Seller/Admin Order Management | List/view orders visible to the caller, advance an order's status along its legal lifecycle | US078, US079, US080 | FR-301, FR-302 | BR-O05, BR-O06 | N/A — headless API, no screens |

## 3. Open Decisions

None — no unresolved domain confirmations. `clarifications.md` records both the initial blueprint
decisions and two post-blueprint resolutions (the `ProductSKUSnapshot.quantity` migration and
populating the implicit `Order.products` relation at checkout).

## 4. Requirements

### Foundation (0xx)

- **FR-001** Every buyer-facing order read and write is scoped to the caller's own orders
  (`Order.userId`) — no route accepts a target buyer id.

### Buyer Order Lifecycle (2xx)

- **FR-201** A buyer can list their own orders, optionally filtered by status, paginated.
- **FR-202** A buyer can view one own order's detail, including its frozen snapshot line items.
- **FR-203** A buyer can check out a set of their own cart lines; the checkout splits into one
  order per seller and, in the same transaction, decrements stock, freezes snapshot lines, and
  deletes the consumed cart lines.
- **FR-204** A buyer can cancel their own order while it is still `PENDING_CONFIRMATION`,
  restoring the stock that order had decremented.

### Seller/Admin Order Management (3xx)

- **FR-301** A seller/admin can list and view the orders visible to them — a seller sees only
  orders containing their own products, an admin sees all.
- **FR-302** A seller/admin can advance an order's status along the legal linear progression; an
  illegal transition (including buyer-only cancellation) is rejected.

## 5. Business Rules

- **BR-O01 — Split per seller.** The selected cart lines are grouped by their product's
  `createdById` (the seller). Each group produces one `Order`. A checkout spanning three sellers
  returns three orders, each independently statused.
- **BR-O02 — Atomic creation.** One Prisma interactive transaction performs, in order:
  re-validate every cart line and its SKU (exists, not deleted, product published,
  `stock >= quantity`) → decrement `SKU.stock` → create the `Order` rows → create the
  `ProductSKUSnapshot` rows → delete the consumed `CartItem` rows. Any failure rolls the whole
  checkout back; no partial order.
- **BR-O03 — Snapshot, never join.** `ProductSKUSnapshot` copies `productName`, `price`, `images`,
  `skuValue`, and `quantity` at purchase time. Order reads serve these copies, not the live
  product — a later price change must not alter a past order.
- **BR-O04 — Buyer cancellation.** The buyer may cancel only their own order, and only while it is
  `PENDING_CONFIRMATION`. Cancelling sets `CANCELLED` and restores the decremented stock in the
  same transaction.
- **BR-O05 — Linear progression.** Seller/admin may advance only along
  `PENDING_CONFIRMATION → PENDING_PICKUP → PENDING_DELIVERY → DELIVERED`, or set `RETURNED` from
  `DELIVERED`. Any other transition — backwards, skipping a step, or out of a terminal state — is
  rejected with 400. Setting `CANCELLED` through the seller/admin route is always rejected;
  cancellation is buyer-only.
- **BR-O06 — Visibility.** A buyer sees only orders where `userId` is theirs. A seller sees only
  orders whose snapshot items reference their own products (via the `Order.products` m-n
  relation). An admin sees all. Another party's `orderId` is a 404, never a 403.
- **BR-O07 — Cart lines must be the caller's.** Every id in `cartItemIds` must belong to the
  caller; an id that does not fails the whole request rather than being skipped silently.
- **BR-O08 — Audit fields.** `createdById`/`updatedById` are set per the existing convention;
  `deletedAt` soft-delete applies to `Order` as it does to other soft-deletable models.

## 6. Screens

N/A — background feature; no user-facing screens. This is a headless backend API — see § 4
Requirements' `(ROUTE###)` references in `technical-spec.md § 2` for the seven owning routes in
place of screen codes.

### User Journey

1. A buyer reviews their cart (F011) and checks out selected lines; the system splits them into
   one order per seller, decrementing stock and freezing what was bought.
2. The buyer tracks their own orders by list/detail, and may cancel one while it's still awaiting
   confirmation.
3. Independently, the seller (or an admin) sees the orders touching their own products and moves
   each one forward — confirmed → picked up → out for delivery → delivered — or marks a delivered
   order returned.

## 7. User Stories

### US074_ViewOwnOrderList — View Own Order List

**Actor:** Buyer
**Goal:** See the orders they've placed.
**Business value:** Lets a buyer track their purchase history and current order states.

**Acceptance Criteria:**
- [ ] Only orders where `userId` is the caller's are returned, optionally filtered by status.
- [ ] Results are paginated.

### US075_ViewOwnOrderDetail — View Own Order Detail

**Actor:** Buyer
**Goal:** See exactly what one of their orders contains.
**Business value:** Gives the buyer the frozen record of what they bought, immune to later catalog
changes.

**Acceptance Criteria:**
- [ ] Returns the order's `ProductSKUSnapshot` lines as they were captured at purchase time.
- [ ] Another buyer's order id is a 404.

### US076_CheckoutCart — Checkout Cart

**Actor:** Buyer
**Goal:** Turn selected cart lines into one or more real orders.
**Business value:** Converts browsing/cart intent into a fulfillable, trackable commitment.

**Acceptance Criteria:**
- [ ] Cart lines are grouped by seller; one order is created per seller.
- [ ] Stock is decremented, snapshot lines are frozen, and the consumed cart lines are deleted, all
  in one transaction.
- [ ] Any cart line that fails validation (missing, another user's, insufficient stock) fails the
  whole checkout — nothing is partially written.

### US077_CancelOwnOrder — Cancel Own Order

**Actor:** Buyer
**Goal:** Back out of an order before it starts being fulfilled.
**Business value:** Gives a buyer a safety window to undo a purchase mistake.

**Acceptance Criteria:**
- [ ] Only while `status = PENDING_CONFIRMATION`; any other status is rejected with 400.
- [ ] Cancelling restores exactly the stock the order's snapshot lines had decremented.

### US078_ViewManageOrderList — View Manage Order List

**Actor:** Seller
**Goal:** See the orders that contain their own products.
**Business value:** Lets a seller know what they need to fulfil.

**Acceptance Criteria:**
- [ ] A seller sees only orders whose snapshot items reference products they created.
- [ ] An admin sees every order; a `client` caller cannot reach this route at all (403, role gate).

### US079_ViewManageOrderDetail — View Manage Order Detail

**Actor:** Seller
**Goal:** See one order's full detail to know what to prepare/ship.
**Business value:** Gives the seller everything needed to act on a specific order.

**Acceptance Criteria:**
- [ ] Same visibility scope as US078; an order outside scope is a 404, not a 403.

### US080_UpdateOrderStatus — Update Order Status

**Actor:** Seller
**Goal:** Move an order forward as it's fulfilled.
**Business value:** Keeps the buyer-visible order status accurate as fulfilment progresses.

**Acceptance Criteria:**
- [ ] Only the legal linear progression (or `DELIVERED → RETURNED`) is accepted; anything else is
  400, naming the current and requested status.
- [ ] Attempting to set `CANCELLED` here is always rejected — that's buyer-only.
- [ ] A status write racing another one (stale `currentStatus`) is rejected with 409, not silently
  overwritten.

## 8. Scenarios

### US076_CheckoutCart — Happy Path, split by seller

**Given** a buyer's cart holds lines from two different sellers, **When** they check out all of
those lines, **Then** exactly two orders are created, one per seller, each holding only that
seller's lines.

### US076_CheckoutCart — Error: insufficient stock mid-checkout

**Given** one of several cart lines no longer has enough stock, **When** the buyer checks out,
**Then** the entire checkout fails with 400 naming that SKU, and no order, snapshot, or stock
change is written for any line.

### US077_CancelOwnOrder — Error: already past confirmation

**Given** an order's status is `PENDING_PICKUP`, **When** the buyer tries to cancel it, **Then**
the request is rejected with 400 — only `PENDING_CONFIRMATION` orders may be cancelled.

### US080_UpdateOrderStatus — Error: illegal transition

**Given** an order is `PENDING_CONFIRMATION`, **When** a seller tries to set it directly to
`DELIVERED`, **Then** the request is rejected with 400 naming the current and requested status.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| `cartItemIds` empty or contains a non-UUID | Rejected before any lookup | Validation error naming the field |
| A cart line id is missing or belongs to another user | Whole checkout rejected | 404 |
| A SKU no longer has enough stock at checkout | Whole checkout rejected, nothing written | 400 naming the SKU and available stock |
| Cancelling an order not in `PENDING_CONFIRMATION` | Rejected | 400 "Only orders pending confirmation can be cancelled." |
| Illegal status transition (seller/admin) | Rejected | 400 naming current and requested status |
| Seller acting on an order holding none of their products | Treated as absent | 404 |
| Two seller/admin writes race on the same order's status | Second write loses | 409 "Order status was changed by someone else in the meantime. Please retry." |
| Seller/admin attempts to set status to `CANCELLED` | Always rejected regardless of current status | 400 "Only the buyer may cancel an order." |

## 10. Edge Behaviours to Verify

- **BR-O02** → Confirm a checkout that fails partway (e.g. the second of three SKUs is out of
  stock) leaves stock, `Order`, `ProductSKUSnapshot`, and `CartItem` rows completely untouched.
- **BR-O04** → Confirm cancelling restores exactly the quantity each snapshot line held, not a
  flat/default amount.
- **BR-O05** → Confirm every transition outside the linear chain (backwards, skipped step, out of
  `RETURNED`/`CANCELLED`) is rejected, and that `CANCELLED` is unreachable from this route
  regardless of current status.
- **BR-O06** → Confirm a seller with zero shared products on an order gets 404 on both list-detail
  and status-update for that order, never a 403.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | `Product.createdById` has no DB index, but `ManageOrderService.buildActorScope`'s seller visibility scope depends on it via the implicit `_OrderToProduct` join on every seller request. | Seller order-list/detail queries may degrade as `Product`/`Order` volume grows. | confirmed — deferred per `clarifications.md` (reviewer finding H2), not fixed in this pass |
| RISK-02 | known-issue | Payment is fully deferred — no `PaymentTransaction` link to `Order` exists yet; `PENDING_CONFIRMATION` orders are not gated on any payment signal. | An order can be created and progressed with no verified payment step in this codebase today. | confirmed — deferred per `clarifications.md` |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F011_ShoppingCart | feature | Checkout's sole input is the caller's own `CartItem` rows; consumed (deleted) lines are gone afterward. | BR-O01, BR-O02 |
| F007_PublicProductBrowsing | feature | Reuses the product-eligibility check (published, non-deleted) when re-validating cart lines at checkout. | BR-O02 |
| F013_ProductReviews | feature (downstream) | F013's purchase-verification (BR-R01) reads this feature's `DELIVERED` orders and the `Order.products` relation this feature populates. | § 1 Overview |

## 13. Configuration

```text
DEFAULT_PAGE_INDEX = 1     # order list starts at page 1 when no pageIndex is supplied
DEFAULT_PAGE_SIZE = 10     # number of orders returned per page when no pageSize is supplied
CHECKOUT_TRANSACTION_TIMEOUT_MS = 15000   # extended interactive-transaction timeout for multi-line, multi-seller checkout
```
