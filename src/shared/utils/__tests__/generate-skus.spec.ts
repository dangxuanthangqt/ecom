import { VariantRequestDto } from "@/dtos/product/product.dto";

import generateSKUs from "../generate-skus.utils";

describe("generateSKUs", () => {
  it("generates SKUs for a single variant with one option", () => {
    // Arrange
    const variants: VariantRequestDto[] = [
      { value: "Color", options: ["Red"] },
    ];

    // Act
    const result = generateSKUs(variants);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      value: "Red",
      price: 0,
      stock: 100,
      image: "",
    });
  });

  it("generates SKUs for a single variant with multiple options", () => {
    // Arrange
    const variants: VariantRequestDto[] = [
      { value: "Color", options: ["Red", "Blue", "Green"] },
    ];

    // Act
    const result = generateSKUs(variants);

    // Assert
    expect(result).toHaveLength(3);
    expect(result).toEqual([
      { value: "Red", price: 0, stock: 100, image: "" },
      { value: "Blue", price: 0, stock: 100, image: "" },
      { value: "Green", price: 0, stock: 100, image: "" },
    ]);
  });

  it("generates SKUs for multiple variants using cartesian product", () => {
    // Arrange
    const variants: VariantRequestDto[] = [
      { value: "Color", options: ["Red", "Blue"] },
      { value: "Size", options: ["S", "M"] },
    ];

    // Act
    const result = generateSKUs(variants);

    // Assert
    expect(result).toHaveLength(4);
    expect(result).toEqual([
      { value: "Red-S", price: 0, stock: 100, image: "" },
      { value: "Red-M", price: 0, stock: 100, image: "" },
      { value: "Blue-S", price: 0, stock: 100, image: "" },
      { value: "Blue-M", price: 0, stock: 100, image: "" },
    ]);
  });

  it("generates SKUs for three variants using cartesian product", () => {
    // Arrange
    const variants: VariantRequestDto[] = [
      { value: "Color", options: ["Red", "Blue"] },
      { value: "Size", options: ["S", "M"] },
      { value: "Material", options: ["Cotton", "Wool"] },
    ];

    // Act
    const result = generateSKUs(variants);

    // Assert
    expect(result).toHaveLength(8);
    expect(result).toContainEqual({
      value: "Red-S-Cotton",
      price: 0,
      stock: 100,
      image: "",
    });
    expect(result).toContainEqual({
      value: "Blue-M-Wool",
      price: 0,
      stock: 100,
      image: "",
    });
  });

  it("uses hyphen as separator between variant options", () => {
    // Arrange
    const variants: VariantRequestDto[] = [
      { value: "Color", options: ["Red"] },
      { value: "Size", options: ["Large"] },
    ];

    // Act
    const result = generateSKUs(variants);

    // Assert
    expect(result[0].value).toBe("Red-Large");
  });

  it("returns empty array for empty variants array", () => {
    // Arrange
    const variants: VariantRequestDto[] = [];

    // Act
    const result = generateSKUs(variants);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      value: "",
      price: 0,
      stock: 100,
      image: "",
    });
  });

  it("returns array with default values for price, stock, and image", () => {
    // Arrange
    const variants: VariantRequestDto[] = [
      { value: "Color", options: ["Red", "Green"] },
    ];

    // Act
    const result = generateSKUs(variants);

    // Assert
    expect(result).toHaveLength(2);
    result.forEach((sku) => {
      expect(sku.price).toBe(0);
      expect(sku.stock).toBe(100);
      expect(sku.image).toBe("");
    });
  });

  it("generates correct count of SKUs for complex multi-variant scenario", () => {
    // Arrange
    const variants: VariantRequestDto[] = [
      { value: "Color", options: ["A", "B", "C"] },
      { value: "Size", options: ["X", "Y"] },
      { value: "Style", options: ["1", "2"] },
    ];
    // Expected: 3 * 2 * 2 = 12 combinations

    // Act
    const result = generateSKUs(variants);

    // Assert
    expect(result).toHaveLength(12);
  });

  it("preserves option values exactly in SKU", () => {
    // Arrange
    const variants: VariantRequestDto[] = [
      { value: "Color", options: ["Red-Dark", "Blue Light"] },
      { value: "Size", options: ["M-L"] },
    ];

    // Act
    const result = generateSKUs(variants);

    // Assert
    expect(result).toContainEqual({
      value: "Red-Dark-M-L",
      price: 0,
      stock: 100,
      image: "",
    });
  });
});
