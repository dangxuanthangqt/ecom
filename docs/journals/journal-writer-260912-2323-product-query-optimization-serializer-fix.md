# Product Query Optimization & ClassSerializerInterceptor Fix in F011–F013 Release

**Date**: 2026-09-12 23:23
**Severity**: medium
**Component**: Product queries, DTO serialization, soft-delete strategy
**Status**: resolved

## What Happened

Shipped a PR bundling prior-session features (Cart F011, Order buyer/admin F012, Product reviews F013, related migrations) alongside this session's optimization work: split `Product` Prisma selections into granular `createProductListSelect` and `createProductDetailSelect` to stop paginated list endpoints over-fetching `skus` and `categories`, applied a shared `NOT_DELETED` soft-delete constant across 6 selector files to DRY up repeated filtering, added a Prisma index on `Product.brandId` and `Product.createdById`, and crucially fixed a subtle but real serialization bug where plain Prisma rows in paginated responses bypass `ClassSerializerInterceptor`'s `excludeExtraneousValues: true` entirely.

## The Brutal Truth

Spent honest time going down a rabbit hole investigating whether `Client Extension` on Prisma's `prisma-client` would be the right lever for soft-delete filtering — it would be, if we could guarantee it everywhere. It isn't. That hesitation cost maybe 30 minutes of reading and reconsideration, but it surfaced the real lesson: a plain shared constant is lower-blast-radius and more transparent to future readers than a hidden client-extension hook. The gut-punch came when testing the paginated product list and realizing sensitive fields that should have been stripped — `createdById`, for one — were still leaking to the client. Turns out `excludeExtraneousValues` only applies to actual DTO class instances, not raw Prisma objects. That's the kind of silent failure that lives in production for months.

## Technical Details

The serialization failure: `product.service.ts` returned `PageDto<Product>` with `data: Prisma.ProductGetPayload[]` — plain objects. `ClassSerializerInterceptor` sees the page structure but never instantiates `ProductResponseDto` around each row, so `@Expose()` decorators never fire. The fix: wrap each result: `new ProductResponseDto(row)` in both `product.service.ts` line ~45 (list endpoint) and `manage-product.service.ts` line ~62 (admin list).

The soft-delete constant (`src/constants/soft-delete.constant.ts`): `export const NOT_DELETED = { deletedAt: null }` applied to `BrandSelector`, `CategorySelector`, `CategoryTranslationSelector`, `BrandTranslationSelector`, `PermissionSelector`, `RoleSelector` — reduces duplication and anchors the definition in one place.

The product selector split (`src/selectors/product.selector.ts`): `createProductListSelect` drops `categories` and `skus` arrays; `createProductDetailSelect` includes them. List queries now touch a smaller result set; detail routes pay the full fetch cost.

Prisma migration added index on `(brandId, createdById)` — both columns hit frequently in filters and sorts.

## What We Tried

Initial instinct: Prisma `Client Extension` to auto-apply soft-delete filtering. Appealing because it's invisible and enforced everywhere. Reality: requires wrapping `prismaMock` in tests and adds hidden behavior that makes debugging harder for the next person. Pivoted to a constant.

## Root Cause Analysis

The serialization bug stems from a common assumption: if a controller returns a DTO type, the interceptor handles serialization everywhere. It doesn't — only for class instances. A `PageDto<Product>` generic tells TypeScript the shape, but at runtime `data` holds plain objects. The Prisma `select` optimization that built those objects is orthogonal to serialization; wrapping them in the DTO class is the glue that activates `class-transformer`.

## Lessons Learned

**Always wrap paginated list rows in the DTO class, not just single-item responses.** `excludeExtraneousValues: true` is silent-fail when the object isn't an instance of the DTO class. This should have been caught in code review — the pattern works for single endpoints, so it was easy to assume it scales to lists. It doesn't.

**A shared constant over a hidden mechanism.** Plain `{ deletedAt: null }` scattered across 6 files felt repetitive, and `Client Extension` felt clever. But sharing one defined constant is more explicit, easier to grep, and clearer to the next reader.

## Next Steps

Two non-blocking hardening notes for future work:

1. **Fragile selector boundary** (`manage-product.service.ts`): The same select object feeds the DTO and client response. `createdById` stays safe only because the DTO doesn't expose it. If a future edit removes the DTO wrap or adds `@Expose() createdById`, we leak it. Consider separating selectors into `*ForDto` vs `*ForDb`.

2. **Missing 404 guards** (`manage-product.service.ts`): `updateProduct` and `deleteProduct` lack the missing-product guard that `getProductById` has. A stale product ID returns a raw 500 instead of a clean 404. Align with the get pattern.

These are not blocking the current PR but should anchor a follow-up pass.
