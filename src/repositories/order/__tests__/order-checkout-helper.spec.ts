import {
  CheckoutCartItemRow,
  assertAllOwned,
  buildSnapshotRows,
  groupBySeller,
  isRowPurchasable,
} from "../order-checkout.helper";

const SELLER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SELLER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const makeRow = (
  overrides: Partial<CheckoutCartItemRow> = {},
): CheckoutCartItemRow => ({
  id: "11111111-1111-4111-8111-111111111111",
  quantity: 2,
  sku: {
    id: "22222222-2222-4222-8222-222222222222",
    value: "M",
    price: 19.99,
    stock: 10,
    deletedAt: null,
    product: {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Test Product",
      images: ["https://example.com/p.png"],
      publishedAt: new Date("2026-01-01"),
      deletedAt: null,
      createdById: SELLER_A,
    },
    ...overrides.sku,
  },
  ...overrides,
});

describe("order-checkout.helper - groupBySeller (BR-O01)", () => {
  it("keeps a single-seller checkout in one group", () => {
    const rows = [makeRow(), makeRow({ id: "row-2" })];

    const groups = groupBySeller(rows);

    expect(groups).toHaveLength(1);
    expect(groups[0].sellerId).toBe(SELLER_A);
    expect(groups[0].rows).toHaveLength(2);
  });

  it("splits a two-seller checkout into two groups", () => {
    const rows = [
      makeRow({ id: "row-a" }),
      makeRow({
        id: "row-b",
        sku: {
          ...makeRow().sku,
          id: "sku-b",
          product: { ...makeRow().sku.product, createdById: SELLER_B },
        },
      }),
    ];

    const groups = groupBySeller(rows);

    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.sellerId).sort()).toEqual(
      [SELLER_A, SELLER_B].sort(),
    );
  });

  it("groups mixed rows correctly when seller order is interleaved", () => {
    const rowSellerB = makeRow({
      id: "row-b",
      sku: {
        ...makeRow().sku,
        product: { ...makeRow().sku.product, createdById: SELLER_B },
      },
    });
    const rows = [
      makeRow({ id: "row-a1" }),
      rowSellerB,
      makeRow({ id: "row-a2" }),
    ];

    const groups = groupBySeller(rows);

    expect(groups).toHaveLength(2);
    const groupA = groups.find((g) => g.sellerId === SELLER_A);
    const groupB = groups.find((g) => g.sellerId === SELLER_B);
    expect(groupA?.rows).toHaveLength(2);
    expect(groupB?.rows).toHaveLength(1);
  });
});

describe("order-checkout.helper - buildSnapshotRows (BR-O03)", () => {
  it("copies the frozen fields verbatim from each row", () => {
    const row = makeRow({ quantity: 4 });

    const snapshots = buildSnapshotRows([row]);

    expect(snapshots).toEqual([
      {
        productName: row.sku.product.name,
        price: row.sku.price,
        images: row.sku.product.images,
        skuValue: row.sku.value,
        quantity: 4,
        skuId: row.sku.id,
      },
    ]);
  });

  it("produces one row per line, preserving order", () => {
    const rows = [makeRow({ id: "a" }), makeRow({ id: "b", quantity: 1 })];

    const snapshots = buildSnapshotRows(rows);

    expect(snapshots).toHaveLength(2);
    expect(snapshots[1].quantity).toBe(1);
  });
});

describe("order-checkout.helper - assertAllOwned (BR-O07)", () => {
  it("does not throw when every id resolved to a row", () => {
    expect(() =>
      assertAllOwned({
        cartItemIds: ["a", "b"],
        rows: [{ id: "a" }, { id: "b" }],
      }),
    ).not.toThrow();
  });

  it("throws a 404 when fewer rows resolved than requested ids", () => {
    let error: unknown;

    try {
      assertAllOwned({
        cartItemIds: ["a", "b", "c"],
        rows: [{ id: "a" }, { id: "b" }],
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({ status: 404 });
  });
});

describe("order-checkout.helper - isRowPurchasable (BR-O02 step 3)", () => {
  it("is purchasable when SKU and product are live and published", () => {
    expect(isRowPurchasable(makeRow())).toBe(true);
  });

  it("rejects a soft-deleted SKU", () => {
    const row = makeRow({ sku: { ...makeRow().sku, deletedAt: new Date() } });
    expect(isRowPurchasable(row)).toBe(false);
  });

  it("rejects a soft-deleted product", () => {
    const row = makeRow({
      sku: {
        ...makeRow().sku,
        product: { ...makeRow().sku.product, deletedAt: new Date() },
      },
    });
    expect(isRowPurchasable(row)).toBe(false);
  });

  it("rejects an unpublished product (publishedAt null)", () => {
    const row = makeRow({
      sku: {
        ...makeRow().sku,
        product: { ...makeRow().sku.product, publishedAt: null },
      },
    });
    expect(isRowPurchasable(row)).toBe(false);
  });

  it("rejects a product scheduled to publish in the future", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const row = makeRow({
      sku: {
        ...makeRow().sku,
        product: { ...makeRow().sku.product, publishedAt: future },
      },
    });
    expect(isRowPurchasable(row)).toBe(false);
  });
});
