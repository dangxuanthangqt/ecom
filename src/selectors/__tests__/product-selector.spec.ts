import {
  createProductDetailSelect,
  createProductListSelect,
} from "@/selectors/product.selector";

/** Typed escape hatch for `expect.any(Object)` used inside a typed select literal. */
const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;

describe("createProductListSelect", () => {
  it("never fetches skus or categories — list responses don't expose them", () => {
    const select = createProductListSelect();

    expect(select).not.toHaveProperty("skus");
    expect(select).not.toHaveProperty("categories");
  });

  it("fetches core scalar fields, brand, and productTranslations", () => {
    const select = createProductListSelect({ languageId: "lang-en-us" });

    expect(select).toEqual(
      expect.objectContaining({
        id: true,
        name: true,
        images: true,
        basePrice: true,
        virtualPrice: true,
        publishedAt: true,
        variants: true,
        brand: anyObject(),
        productTranslations: anyObject(),
      }),
    );

    const productTranslations = select.productTranslations as {
      where: { languageId: string };
    };
    expect(productTranslations.where.languageId).toBe("lang-en-us");
  });
});

describe("createProductDetailSelect", () => {
  it("extends the list select with skus and categories", () => {
    const select = createProductDetailSelect();

    expect(select).toEqual(
      expect.objectContaining({
        ...createProductListSelect(),
        skus: anyObject(),
        categories: anyObject(),
      }),
    );
  });
});
