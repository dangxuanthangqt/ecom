---
authored_by: rebuild-spec
---
<!-- layout-exempt: rebuild-spec owns all docs/system|features|generated|flows paths -->
<!-- Contract: references/feature-spec-researcher-contract.md -->

# Functional Spec — F004_CatalogLocalization

**Priority**: P2
**Type**: ui
**Generated**: 2026-09-12

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, Source citations, pseudocode,
key entities, and DB writes for a Dev/QA/SA audience.

**Traceability:** F004 → N/A (no screens) → US015-US019, US025-US034, US045-US049 → N/A (no background logic) → ROUTE016-ROUTE020, ROUTE026-ROUTE035, ROUTE046-ROUTE050 → N/A (no test cases yet)

## 1. Overview

**Problem:** The catalog's brand, category, and product entities carry one base name/description
each. Without a separate way to hold per-locale text, the catalog cannot be shown correctly to a
caller in a different language.
**Solution:** Maintain the list of supported locales, and let an admin (or, for products, a
client/seller) attach a locale-specific name and description to a brand, category, or product.
Reading a translation always returns it alongside its parent entity and its locale.
**Scope:** Define which locales the catalog supports (add/rename/remove a language); create, read,
update, and delete localized text for a brand, a category, and a product, one row per
(entity, locale) pair.
**Non-Scope:** This feature does not own the base (untranslated) brand/category/product data —
that is F002 (Brand Catalog Management), F003 (Category Catalog Management), and F008 (Seller
Product Management) respectively. It also does not decide which locale a request should be served
in (no locale-negotiation/fallback logic was found in source) — see § 3 Open Decisions.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Admin | Back-office operator with the full permission set | Keep the supported-locale list and every brand/category/product translation accurate |
| Client | A shopper-facing account | Read and maintain localized product text (the one translation family clients can reach) |
| Seller | An account that manages its own product listings | Read and maintain localized product text for products, same reach as Client for this feature |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Manage Supported Languages | View, add, rename, and permanently remove the locales the catalog supports | US030, US031, US032, US033, US034 | FR-001, FR-101, FR-201, FR-202, FR-203, FR-204, FR-205, FR-601, FR-602 | BR-004 | — |
| CAP-02 | Manage Brand Translations | View, add, edit, and remove a brand's localized name/description | US015, US016, US017, US018, US019 | FR-301, FR-302, FR-303, FR-304, FR-305 | BR-001 | — |
| CAP-03 | Manage Category Translations | View, add, edit, and remove a category's localized name/description | US025, US026, US027, US028, US029 | FR-401, FR-402, FR-403, FR-404, FR-405 | BR-002 | — |
| CAP-04 | Manage Product Translations | View, add, edit, and remove a product's localized name/description | US045, US046, US047, US048, US049 | FR-501, FR-502, FR-503, FR-504, FR-505, FR-551 | BR-003 | — |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Should the API pick a translation automatically from an `Accept-Language`-style hint, or must every caller always pass an explicit language filter? | Ship as-is: no automatic locale negotiation; caller always resolves the language explicitly (by filtering/reading a specific translation row). | No such logic exists in source; inventing one would be a feature addition, not a documented fact. | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** A locale must already be a supported Language before any brand, category, or product translation can target it.

### Navigation (1xx)

- **FR-101** A caller reaches every capability in this feature directly by its own REST endpoint; there is no navigation flow to describe (headless API, no screens).

### Manage Supported Languages (2xx)

- **FR-201** An admin can list all supported languages, with pagination and a keyword search on the language name.
- **FR-202** An admin can fetch a single language by its locale code, receiving a not-found response when it doesn't exist.
- **FR-203** An admin can add a new supported language by supplying its 2-character locale code and a display name, via a dedicated creation endpoint.
- **FR-204** An admin can rename an existing language's display name.
- **FR-205** An admin can permanently remove a supported language; this removal cannot be undone.

### Manage Brand Translations (3xx)

- **FR-301** An admin can list all brand translations, with pagination and a keyword search on the translated name.
- **FR-302** An admin can fetch a single brand translation by its ID, receiving a not-found response when it doesn't exist.
- **FR-303** An admin can add a localized name/description for an existing brand in a given language.
- **FR-304** An admin can edit an existing brand translation's name, description, language, or target brand.
- **FR-305** An admin can remove a brand translation; the row is retired, not hard-deleted.

### Manage Category Translations (4xx)

- **FR-401** An admin can list all category translations, with pagination and a keyword search on the translated name.
- **FR-402** An admin can fetch a single category translation by its ID, receiving a not-found response when it doesn't exist.
- **FR-403** An admin can add a localized name/description for an existing category in a given language.
- **FR-404** An admin can edit an existing category translation's name, description, language, or target category.
- **FR-405** An admin can remove a category translation; the row is retired, not hard-deleted.

### Manage Product Translations (5xx)

- **FR-501** A client or seller can list all product translations, with pagination and a keyword search on the translated name.
- **FR-502** A client or seller can fetch a single product translation by its ID, receiving a not-found response when it doesn't exist.
- **FR-503** A client or seller can add a localized name/description for an existing product in a given language.
- **FR-504** A client or seller can edit an existing product translation's name, description, language, or target product.
- **FR-505** A client or seller can remove a product translation; the row is retired, not hard-deleted.

### Interaction (n/a — no cross-capability interaction)

- **FR-551** The four capabilities operate independently; a translation's parent record and its language are each a separate concern with no shared workflow between capabilities.

### Security (6xx)

- **FR-601** Every one of this feature's 20 endpoints requires a valid `Bearer` session by default; none are publicly reachable.
- **FR-602** Managing languages, brand translations, and category translations is admin-only; managing product translations is additionally open to client and seller accounts.

## 5. Business Rules

- A brand/category/product translation cannot share its (parent entity, language) pair with another live translation row — the second attempt is rejected. (BR-001)
- Creating or updating a brand/category/product translation requires the parent brand/category/product to exist and not be deleted; an invalid parent is rejected before the translation is written. (BR-002)
- Reaching this feature's routes is gated by role and by module: admin reaches all 20 routes; client and seller reach only the 5 product-translation routes — brand-translation, category-translation, and language routes stay admin-only. (BR-003)
- Removing a supported language is a permanent, non-recoverable deletion — unlike every other entity in this feature, it is never soft-deleted. (BR-004)

## 6. Screens

N/A — background feature; no user-facing screens. This is a headless backend API — no UI
layer exists in this repository and `docs/generated/screen-list.md` is an explicit "No data"
artifact, so no `SCR###` code exists to cite. Traceability runs through the owning routes
instead: its 20 owning routes across `/languages`, `/brand-translations`, `/category-translations` and `/product-translations` — see `technical-spec.md § 2 Action Index`.

## 7. User Stories

### US030 — View Language List

**Actor:** Admin
**Goal:** See every supported locale.
**Business value:** Confirms which languages the catalog can currently be translated into.

**Acceptance Criteria:**
- [ ] Returns every supported language, paginated.

### US031 — View Language Detail

**Actor:** Admin
**Goal:** Look up one language's configuration.
**Business value:** Confirms a specific locale's setup before targeting it with new translations.

**Acceptance Criteria:**
- [ ] Returns the language matching the given code, or a not-found result.

### US032 — Create Language

**Actor:** Admin
**Goal:** Add a new supported locale.
**Business value:** Unlocks translating brands/categories/products into that locale.

**Acceptance Criteria:**
- [ ] A valid code + name creates a new language row.
- [ ] A duplicate code is rejected.

### US033 — Update Language

**Actor:** Admin
**Goal:** Correct a language's display name.
**Business value:** Keeps locale metadata accurate for admins choosing a language elsewhere in the system.

**Acceptance Criteria:**
- [ ] The named language's display name is updated.

### US034 — Delete Language

**Actor:** Admin
**Goal:** Retire a locale that's no longer offered.
**Business value:** Stops a discontinued locale from being offered for new translations.

**Acceptance Criteria:**
- [ ] The language row is permanently removed.
- [ ] [EXPECTED] An admin is warned that every translation still pointing at this language will be removed along with it — no such warning was found in source; see § 11 Risks & Known Issues.

### US015 — View Brand Translation List

**Actor:** Admin
**Goal:** Audit every localized brand name/description on file.
**Business value:** Confirms brand localization coverage across supported locales.

**Acceptance Criteria:**
- [ ] Returns every brand translation, paginated.

### US016 — View Brand Translation Detail

**Actor:** Admin
**Goal:** Inspect one brand translation's content.
**Business value:** Confirms a specific brand's localized text before editing it.

**Acceptance Criteria:**
- [ ] Returns the brand translation matching the given ID, or a not-found result.

### US017 — Create Brand Translation

**Actor:** Admin
**Goal:** Add a localized name/description for a brand.
**Business value:** Makes that brand display correctly in the target locale.

**Acceptance Criteria:**
- [ ] A valid payload creates a translation linked to an existing brand and language.
- [ ] A duplicate (brand, language) pair is rejected.
- [ ] A non-existent brand is rejected.

### US018 — Update Brand Translation

**Actor:** Admin
**Goal:** Correct an existing brand translation.
**Business value:** Keeps localized brand text accurate over time.

**Acceptance Criteria:**
- [ ] The named brand translation's fields are updated.

### US019 — Delete Brand Translation

**Actor:** Admin
**Goal:** Remove an outdated brand translation.
**Business value:** Stops stale localized brand text from being served.

**Acceptance Criteria:**
- [ ] The brand translation is retired (no longer returned by list/detail).

### US025 — View Category Translation List

**Actor:** Admin
**Goal:** Audit every localized category name/description on file.
**Business value:** Confirms category localization coverage across supported locales.

**Acceptance Criteria:**
- [ ] Returns every category translation, paginated.

### US026 — View Category Translation Detail

**Actor:** Admin
**Goal:** Inspect one category translation's content.
**Business value:** Confirms a specific category's localized text before editing it.

**Acceptance Criteria:**
- [ ] Returns the category translation matching the given ID, or a not-found result.

### US027 — Create Category Translation

**Actor:** Admin
**Goal:** Add a localized name/description for a category.
**Business value:** Makes that category display correctly in the target locale.

**Acceptance Criteria:**
- [ ] A valid payload creates a translation linked to an existing category and language.
- [ ] A duplicate (category, language) pair is rejected.
- [ ] A non-existent category is rejected.

### US028 — Update Category Translation

**Actor:** Admin
**Goal:** Correct an existing category translation.
**Business value:** Keeps localized category text accurate over time.

**Acceptance Criteria:**
- [ ] The named category translation's fields are updated.

### US029 — Delete Category Translation

**Actor:** Admin
**Goal:** Remove an outdated category translation.
**Business value:** Stops stale localized category text from being served.

**Acceptance Criteria:**
- [ ] The category translation is retired (no longer returned by list/detail).

### US045 — View Product Translation List

**Actor:** Client
**Goal:** See localized product content.
**Business value:** Lets a client/seller confirm product localization coverage; seller reaches this the same way (PERM005 grants both roles the same module).

**Acceptance Criteria:**
- [ ] Returns every product translation, paginated.

### US046 — View Product Translation Detail

**Actor:** Client
**Goal:** Inspect one product's localized content.
**Business value:** Confirms a specific product's localized text before editing it.

**Acceptance Criteria:**
- [ ] Returns the product translation matching the given ID, or a not-found result.

### US047 — Create Product Translation

**Actor:** Client
**Goal:** Add a localized name/description for a product.
**Business value:** Makes that product display correctly in the target locale.

**Acceptance Criteria:**
- [ ] A valid payload creates a translation linked to an existing product and language.
- [ ] A duplicate (product, language) pair is rejected.
- [ ] A non-existent product is rejected.

### US048 — Update Product Translation

**Actor:** Client
**Goal:** Correct an existing product translation.
**Business value:** Keeps localized product text accurate over time.

**Acceptance Criteria:**
- [ ] The named product translation's fields are updated.

### US049 — Delete Product Translation

**Actor:** Client
**Goal:** Remove an outdated product translation.
**Business value:** Stops stale localized product text from being served.

**Acceptance Criteria:**
- [ ] The product translation is retired (no longer returned by list/detail).

## 8. Scenarios

### US030 — Happy Path
**Given** several languages exist, **When** an admin requests the language list, **Then** every non-removed language is returned, paginated.

### US030 — Error: unauthenticated call
**Given** no valid session, **When** the list is requested, **Then** the request is rejected as unauthorized.

### US031 — Happy Path
**Given** a language with code "en" exists, **When** an admin requests it by code, **Then** its name is returned.

### US031 — Error: unknown code
**Given** no language has code "xx", **When** an admin requests it, **Then** a not-found result is returned.

### US032 — Happy Path
**Given** no language with code "vi" exists, **When** an admin submits a valid code + name, **Then** the language is created.

### US032 — Error: duplicate code
**Given** a language with code "en" already exists, **When** an admin submits code "en" again, **Then** the creation is rejected.

### US033 — Happy Path
**Given** a language exists, **When** an admin submits a new display name, **Then** the language's name is updated.

### US033 — Error: unknown code
**Given** no language has code "xx", **When** an admin submits an update, **Then** a not-found result is returned.

### US034 — Happy Path
**Given** a language with no dependents an admin wants gone, **When** an admin deletes it, **Then** the language row is permanently removed.

### US034 — Error: unknown code
**Given** no language has code "xx", **When** an admin deletes it, **Then** a not-found result is returned.

### US015 — Happy Path
**Given** several brand translations exist, **When** an admin requests the list, **Then** every non-removed brand translation is returned, paginated.

### US015 — Error: unauthenticated call
**Given** no valid session, **When** the list is requested, **Then** the request is rejected as unauthorized.

### US016 — Happy Path
**Given** a brand translation exists, **When** an admin requests it by ID, **Then** its content is returned with its brand and language.

### US016 — Error: unknown ID
**Given** no brand translation has the given ID, **When** an admin requests it, **Then** a not-found result is returned.

### US017 — Happy Path
**Given** an existing brand and language, **When** an admin submits a valid translation payload, **Then** the translation is created.

### US017 — Error: duplicate pair
**Given** a translation already exists for that brand + language, **When** an admin submits another, **Then** the creation is rejected.

### US018 — Happy Path
**Given** a brand translation exists, **When** an admin submits updated fields, **Then** the translation is updated.

### US018 — Error: unknown ID
**Given** no brand translation has the given ID, **When** an admin submits an update, **Then** a not-found result is returned.

### US019 — Happy Path
**Given** a brand translation exists, **When** an admin deletes it, **Then** the translation is retired and no longer listed.

### US019 — Error: unknown ID
**Given** no brand translation has the given ID, **When** an admin deletes it, **Then** a not-found result is returned.

### US025 — Happy Path
**Given** several category translations exist, **When** an admin requests the list, **Then** every non-removed category translation is returned, paginated.

### US025 — Error: unauthenticated call
**Given** no valid session, **When** the list is requested, **Then** the request is rejected as unauthorized.

### US026 — Happy Path
**Given** a category translation exists, **When** an admin requests it by ID, **Then** its content is returned with its category and language.

### US026 — Error: unknown ID
**Given** no category translation has the given ID, **When** an admin requests it, **Then** a not-found result is returned.

### US027 — Happy Path
**Given** an existing category and language, **When** an admin submits a valid translation payload, **Then** the translation is created.

### US027 — Error: duplicate pair
**Given** a translation already exists for that category + language, **When** an admin submits another, **Then** the creation is rejected.

### US028 — Happy Path
**Given** a category translation exists, **When** an admin submits updated fields, **Then** the translation is updated.

### US028 — Error: unknown ID
**Given** no category translation has the given ID, **When** an admin submits an update, **Then** a not-found result is returned.

### US029 — Happy Path
**Given** a category translation exists, **When** an admin deletes it, **Then** the translation is retired and no longer listed.

### US029 — Error: unknown ID
**Given** no category translation has the given ID, **When** an admin deletes it, **Then** a not-found result is returned.

### US045 — Happy Path
**Given** several product translations exist, **When** a client or seller requests the list, **Then** every non-removed product translation is returned, paginated.

### US045 — Error: unauthenticated call
**Given** no valid session, **When** the list is requested, **Then** the request is rejected as unauthorized.

### US046 — Happy Path
**Given** a product translation exists, **When** a client or seller requests it by ID, **Then** its content is returned with its language.

### US046 — Error: unknown ID
**Given** no product translation has the given ID, **When** it is requested, **Then** a not-found result is returned.

### US047 — Happy Path
**Given** an existing product and language, **When** a client or seller submits a valid translation payload, **Then** the translation is created.

### US047 — Error: duplicate pair
**Given** a translation already exists for that product + language, **When** another is submitted, **Then** the creation is rejected — though see § 11 RISK-02 for an inconsistency in how this specific rejection surfaces.

### US048 — Happy Path
**Given** a product translation exists, **When** a client or seller submits updated fields, **Then** the translation is updated.

### US048 — Error: unknown ID
**Given** no product translation has the given ID, **When** an update is submitted, **Then** a not-found result is returned.

### US049 — Happy Path
**Given** a product translation exists, **When** a client or seller deletes it, **Then** the translation is retired and no longer listed.

### US049 — Error: unknown ID
**Given** no product translation has the given ID, **When** it is deleted, **Then** a not-found result is returned.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| A second translation is submitted for the same (brand/category/product, language) pair | The write is rejected before or at the database level (BR-001) | "This translation already exists for that language." (product-translation create: see RISK-02 — this specific case can instead surface as a generic server error) |
| A translation is created/updated against a brand/category/product ID that doesn't exist | The write is rejected before it reaches the database (BR-002) | "Brand/Category/Product not found." |
| A language, brand translation, category translation, or product translation ID that was already deleted (or never existed) is requested | The lookup returns not-found | "Not found." |
| A client account calls a language, brand-translation, or category-translation route | The request is rejected by role/module gating (BR-003) | "You don't have permission to do this." |
| An admin deletes a language that still has brand/category/product/user translations pointing at it | The deletion proceeds and cascades — every translation row for that language is removed along with it, silently | None — silent handling (see RISK-03) |
| Two admins submit the same new (brand, language) translation at nearly the same time | The database's partial unique index lets exactly one write through; the other fails the same way as an ordinary duplicate | "This translation already exists for that language." |

## 10. Edge Behaviours to Verify

- **FR-203** → Confirm `POST /languages/create` (not `POST /languages`) is the only way to create a language, and that a 2-character code is enforced.
- **FR-205** → Confirm deleting a language is a hard delete with no soft-delete trail, unlike every other entity in this feature.
- **FR-303** → Confirm a brand translation cannot be created against a brand ID that doesn't exist.
- **FR-503** → Confirm a product translation's duplicate-pair rejection actually reaches the caller as a 422, not a 500 (see RISK-02).
- **FR-602** → Confirm a seller or client token can reach all 5 product-translation routes but none of the language/brand-translation/category-translation routes.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | Creating a brand or category translation that violates the (parent, language) uniqueness constraint returns the message "…with this name already exists" / "…with this name already exists", which names the wrong field — the actual constraint is on the (brand/category, language) pair, not on the translated name. | An admin correcting a rejected duplicate may look at the wrong field (the name) instead of the real cause (an existing translation for that same language). | confirmed |
| RISK-02 | known-issue | Creating a product translation has no handling for the database's duplicate-(product, language) constraint at all — only a not-found and a foreign-key catch are wired. A duplicate create still fails at the database, but surfaces as a generic internal-error response instead of the same-shape rejection every other create path in this feature returns for the identical condition. | A client/seller retrying a duplicate product-translation create sees an unexplained server error instead of a clear "already exists" message. | confirmed |
| RISK-03 | known-issue | Deleting a supported language is a permanent hard delete, and the database cascades that delete into every brand/category/product/user translation still pointing at that language — with no confirmation step and no way to recover the removed translations. | An admin removing what looks like an unused locale can silently destroy translation content across the whole catalog. | confirmed |
| RISK-04 | risk | None of the three translation services confirm the submitted language actually exists before writing — only the parent brand/category/product is checked; an invalid language is caught only by the database's foreign-key constraint, which returns a generic constraint-violation message rather than a language-specific one. | A caller passing a typo'd or removed language code gets a less useful error than the one they get for an invalid parent entity. | confirmed |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F002 Brand Catalog Management | feature | A brand translation always targets an existing Brand row owned by F002. | FR-303 |
| F003 Category Catalog Management | feature | A category translation always targets an existing Category row owned by F003. | FR-403 |
| F008 Seller Product Management | feature | A product translation always targets an existing Product row owned by F008. | FR-503 |
| PostgreSQL partial unique indexes (per-family, on (parentId, languageId) WHERE not deleted) | infrastructure | Enforces BR-001's duplicate-pair rule at the database, since Prisma's own schema does not declare these constraints. | BR-001 |

## 13. Configuration

N/A — no user-facing configuration constants for this feature.
