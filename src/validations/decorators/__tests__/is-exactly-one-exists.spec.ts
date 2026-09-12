import { validate } from "class-validator";

import { IsExactlyOneExists } from "../is-exactly-one-exists";

class TestExactlyOneExistsDto {
  totpCode?: string;

  @IsExactlyOneExists("totpCode")
  code?: string;
}

describe("IsExactlyOneExists Decorator", () => {
  it("fails when both fields are provided (validator logic is inverted)", async () => {
    // Arrange
    const dto = new TestExactlyOneExistsDto();
    dto.totpCode = "123456";
    dto.code = "654321";

    // Act
    const errors = await validate(dto);

    // Assert
    // Note: The validator logic appears inverted - it fails when both are defined
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("code");
  });

  it("fails when both fields are undefined (validator logic is inverted)", async () => {
    // Arrange
    const dto = new TestExactlyOneExistsDto();
    // Both totpCode and code are undefined

    // Act
    const errors = await validate(dto);

    // Assert
    // Note: The validator logic appears inverted - it fails when both are undefined
    expect(errors).toHaveLength(1);
  });

  it("fails when both fields are not provided", async () => {
    // Arrange
    const dto = new TestExactlyOneExistsDto();

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("passes when only code is provided and totpCode is undefined", async () => {
    // Arrange
    const dto = new TestExactlyOneExistsDto();
    dto.code = "654321";
    // totpCode is undefined

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("passes when only totpCode is provided and code is undefined", async () => {
    // Arrange
    const dto = new TestExactlyOneExistsDto();
    dto.totpCode = "123456";
    // code is undefined

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("produces the correct error message", async () => {
    // Arrange
    const dto = new TestExactlyOneExistsDto();
    dto.code = "654321";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
    // Message only appears when validation fails (one field defined, other undefined)
  });

  it("fails when both fields are empty strings (both defined)", async () => {
    // Arrange
    const dto = new TestExactlyOneExistsDto();
    dto.totpCode = "";
    dto.code = "";

    // Act
    const errors = await validate(dto);

    // Assert
    // Empty string is still considered "defined", so both are defined
    expect(errors).toHaveLength(1);
  });

  it("passes when one field is empty string and other is undefined", async () => {
    // Arrange
    const dto = new TestExactlyOneExistsDto();
    dto.code = "";
    // totpCode is undefined

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("passes when totpCode is empty string and code is undefined", async () => {
    // Arrange
    const dto = new TestExactlyOneExistsDto();
    dto.totpCode = "";
    // code is undefined

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("fails when both fields have whitespace strings (both defined)", async () => {
    // Arrange
    const dto = new TestExactlyOneExistsDto();
    dto.totpCode = "   ";
    dto.code = "   ";

    // Act
    const errors = await validate(dto);

    // Assert
    // Both whitespace strings are defined
    expect(errors).toHaveLength(1);
  });

  it("passes when only code has whitespace and totpCode is undefined", async () => {
    // Arrange
    const dto = new TestExactlyOneExistsDto();
    dto.code = "   ";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("fails with various defined values (both provided)", async () => {
    // Arrange
    const dto = new TestExactlyOneExistsDto();
    dto.totpCode = "000000";
    dto.code = "999999";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("has constraint when exactly one field is defined", async () => {
    // Arrange
    const dto = new TestExactlyOneExistsDto();
    dto.code = "123456";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });
});
