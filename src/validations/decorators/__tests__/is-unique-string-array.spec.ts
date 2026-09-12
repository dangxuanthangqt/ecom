import { validate } from "class-validator";

import { IsUniqueStringArray } from "../is-unique-string-array";

class TestUniqueStringArrayDto {
  @IsUniqueStringArray()
  tags: string[];
}

describe("IsUniqueStringArray Decorator", () => {
  it("passes when array has all unique values", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["red", "blue", "green"];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("fails when array has duplicate values", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["red", "blue", "red"];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("tags");
  });

  it("fails when array has multiple duplicates", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["red", "blue", "red", "blue"];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("produces the correct error message", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["red", "red"];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    const message = Object.values(errors[0].constraints!)[0];
    expect(message).toContain("unique");
    expect(message).toContain("Duplicate");
  });

  it("passes with single element array", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["red"];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("passes with empty array", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = [];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("is case-insensitive for duplicates", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["Red", "red", "RED"];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("trims whitespace before comparing", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["red", " red ", "  red  "];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("passes when values are different after trimming and lowercasing", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["  red  ", "  blue  ", "  green  "];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("fails when non-array value is provided", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    Object.assign(dto, { tags: "not-an-array" });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("handles array with non-string elements gracefully", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    Object.assign(dto, { tags: ["red", 123, "blue"] });

    // Act
    const errors = await validate(dto);

    // Assert
    // The validator normalizes strings but passes through non-strings as-is
    // So ["red", 123, "blue"] has no duplicates and passes
    expect(errors).toHaveLength(0);
  });

  it("passes with array of numbers as strings", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["1", "2", "3"];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("fails when array has duplicate numbers as strings", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["1", "2", "1"];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("passes with mixed case and spaces that are unique after normalization", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["Red", " Blue ", "  GREEN  "];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("fails when only whitespace differs between values", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["red", "  red  "];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("passes with special characters in unique strings", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["@tag1", "#tag2", "$tag3"];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("fails when special character strings have duplicates", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["@tag1", "@tag1"];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("passes with long strings that are unique", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = [
      "very long string number one",
      "very long string number two",
      "very long string number three",
    ];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("fails with long strings that have duplicates", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["very long string number one", "very long string number one"];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("is case-insensitive and whitespace-insensitive simultaneously", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["Red Tag", " RED TAG ", "  red tag  "];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("handles array with null value gracefully", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    Object.assign(dto, { tags: ["red", null, "blue"] });

    // Act
    const errors = await validate(dto);

    // Assert
    // The validator doesn't treat null as a string, so it passes through
    // [null, "red", "blue"] have no duplicates, so validation passes
    expect(errors).toHaveLength(0);
  });

  it("handles array with undefined value gracefully", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    Object.assign(dto, { tags: ["red", undefined, "blue"] });

    // Act
    const errors = await validate(dto);

    // Assert
    // The validator doesn't treat undefined as a string, so it passes through
    // [undefined, "red", "blue"] have no duplicates, so validation passes
    expect(errors).toHaveLength(0);
  });

  it("reports constraint error on tags field", async () => {
    // Arrange
    const dto = new TestUniqueStringArrayDto();
    dto.tags = ["red", "red"];

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("tags");
    expect(errors[0].constraints).toBeDefined();
  });
});
