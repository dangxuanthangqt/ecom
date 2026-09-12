import { validate } from "class-validator";

import { IsOnlyOneExists } from "../is-only-one-exists";

class TestOnlyOneExistsDto {
  email?: string;

  @IsOnlyOneExists("email")
  code?: string;
}

describe("IsOnlyOneExists Decorator", () => {
  it("passes when email is provided and code is undefined", async () => {
    // Arrange
    const dto = new TestOnlyOneExistsDto();
    dto.email = "user@example.com";
    // code is undefined

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("passes when code is provided and email is undefined", async () => {
    // Arrange
    const dto = new TestOnlyOneExistsDto();
    dto.code = "123456";
    // email is undefined

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("passes when both email and code are undefined", async () => {
    // Arrange
    const dto = new TestOnlyOneExistsDto();
    // Both are undefined

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("fails when both email and code are provided", async () => {
    // Arrange
    const dto = new TestOnlyOneExistsDto();
    dto.email = "user@example.com";
    dto.code = "123456";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("code");
  });

  it("produces the correct error message when both fields are provided", async () => {
    // Arrange
    const dto = new TestOnlyOneExistsDto();
    dto.email = "user@example.com";
    dto.code = "123456";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    const message = Object.values(errors[0].constraints!)[0];
    expect(message).toContain("Only one");
    expect(message).toContain("email");
    expect(message).toContain("code");
  });

  it("passes when email is empty string and code is undefined", async () => {
    // Arrange
    const dto = new TestOnlyOneExistsDto();
    dto.email = "";
    // code is undefined

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("passes when code is empty string and email is undefined", async () => {
    // Arrange
    const dto = new TestOnlyOneExistsDto();
    dto.code = "";
    // email is undefined

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("passes when code is whitespace and email is undefined", async () => {
    // Arrange
    const dto = new TestOnlyOneExistsDto();
    dto.code = "   ";
    // email is undefined

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("fails when both email and code are empty strings", async () => {
    // Arrange
    const dto = new TestOnlyOneExistsDto();
    dto.email = "";
    dto.code = "";

    // Act
    const errors = await validate(dto);

    // Assert
    // Empty string is still considered "defined"
    expect(errors).toHaveLength(1);
  });

  it("fails when both email and code are whitespace strings", async () => {
    // Arrange
    const dto = new TestOnlyOneExistsDto();
    dto.email = "   ";
    dto.code = "   ";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("passes with various single defined value combinations", async () => {
    // Arrange & Act & Assert
    const test1 = new TestOnlyOneExistsDto();
    test1.email = "test@example.com";
    const errors1 = await validate(test1);
    expect(errors1).toHaveLength(0);

    const test2 = new TestOnlyOneExistsDto();
    test2.code = "999999";
    const errors2 = await validate(test2);
    expect(errors2).toHaveLength(0);
  });

  it("reports constraint error on code field when both are provided", async () => {
    // Arrange
    const dto = new TestOnlyOneExistsDto();
    dto.email = "user@example.com";
    dto.code = "123456";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("code");
    expect(errors[0].constraints).toBeDefined();
  });

  it("fails when code is null and email is provided (null is still defined)", async () => {
    // Arrange
    const dto = new TestOnlyOneExistsDto();
    dto.email = "user@example.com";
    Object.assign(dto, { code: null });

    // Act
    const errors = await validate(dto);

    // Assert
    // null !== undefined, so null is considered "defined"
    expect(errors).toHaveLength(1);
  });

  it("fails when email is null and code is provided (null is still defined)", async () => {
    // Arrange
    const dto = new TestOnlyOneExistsDto();
    Object.assign(dto, { email: null });
    dto.code = "123456";

    // Act
    const errors = await validate(dto);

    // Assert
    // null !== undefined, so null is considered "defined"
    expect(errors).toHaveLength(1);
  });

  it("fails when both are null (both defined)", async () => {
    // Arrange
    const dto = new TestOnlyOneExistsDto();
    Object.assign(dto, { email: null, code: null });

    // Act
    const errors = await validate(dto);

    // Assert
    // Both null values are considered "defined"
    expect(errors).toHaveLength(1);
  });

  it("fails when both email and code are non-empty strings", async () => {
    // Arrange
    const dto = new TestOnlyOneExistsDto();
    dto.email = "test@example.com";
    dto.code = "123456";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });
});
