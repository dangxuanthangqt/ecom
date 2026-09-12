import { validate } from "class-validator";

import { IsPasswordMatch } from "../is-password-match.decorator";

class TestPasswordMatchDto {
  password: string;

  @IsPasswordMatch("password")
  passwordConfirm: string;
}

describe("IsPasswordMatch Decorator", () => {
  it("passes when passwords match", async () => {
    // Arrange
    const dto = new TestPasswordMatchDto();
    dto.password = "TestPassword123";
    dto.passwordConfirm = "TestPassword123";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("fails when passwords do not match", async () => {
    // Arrange
    const dto = new TestPasswordMatchDto();
    dto.password = "TestPassword123";
    dto.passwordConfirm = "DifferentPassword456";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("passwordConfirm");
  });

  it("produces the correct error message when passwords do not match", async () => {
    // Arrange
    const dto = new TestPasswordMatchDto();
    dto.password = "TestPassword123";
    dto.passwordConfirm = "DifferentPassword456";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    const message = Object.values(errors[0].constraints!)[0];
    expect(message).toContain("passwordConfirm");
    expect(message).toContain("must match");
    expect(message).toContain("password");
  });

  it("passes when both passwords are empty strings", async () => {
    // Arrange
    const dto = new TestPasswordMatchDto();
    dto.password = "";
    dto.passwordConfirm = "";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("passes when both passwords are complex", async () => {
    // Arrange
    const complexPassword = "P@ssw0rd!Complex#2024$%^&*()";
    const dto = new TestPasswordMatchDto();
    dto.password = complexPassword;
    dto.passwordConfirm = complexPassword;

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("fails when passwords differ only in case", async () => {
    // Arrange
    const dto = new TestPasswordMatchDto();
    dto.password = "TestPassword123";
    dto.passwordConfirm = "testpassword123";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("fails when password is longer than passwordConfirm", async () => {
    // Arrange
    const dto = new TestPasswordMatchDto();
    dto.password = "LongerPassword123";
    dto.passwordConfirm = "Short";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("fails when passwordConfirm is longer than password", async () => {
    // Arrange
    const dto = new TestPasswordMatchDto();
    dto.password = "Short";
    dto.passwordConfirm = "LongerPassword123";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("fails when passwordConfirm is non-string", async () => {
    // Arrange
    const dto = new TestPasswordMatchDto();
    dto.password = "TestPassword123";
    Object.assign(dto, { passwordConfirm: 123456 });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("fails when password is non-string", async () => {
    // Arrange
    const dto = new TestPasswordMatchDto();
    Object.assign(dto, { password: 123456 });
    dto.passwordConfirm = "TestPassword123";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("fails when both are non-string", async () => {
    // Arrange
    const dto = new TestPasswordMatchDto();
    Object.assign(dto, { password: 123456, passwordConfirm: 123456 });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("passes when both passwords contain special characters", async () => {
    // Arrange
    const specialPassword = "P@ss!W0rd#2024$%";
    const dto = new TestPasswordMatchDto();
    dto.password = specialPassword;
    dto.passwordConfirm = specialPassword;

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("passes when passwords match exactly with spaces", async () => {
    // Arrange
    const dto = new TestPasswordMatchDto();
    dto.password = "Test Password With Spaces";
    dto.passwordConfirm = "Test Password With Spaces";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("fails when passwords have different spacing", async () => {
    // Arrange
    const dto = new TestPasswordMatchDto();
    dto.password = "Test Password";
    dto.passwordConfirm = "TestPassword";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("reports constraint error on passwordConfirm field", async () => {
    // Arrange
    const dto = new TestPasswordMatchDto();
    dto.password = "TestPassword123";
    dto.passwordConfirm = "Different";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("passwordConfirm");
    expect(errors[0].constraints).toBeDefined();
  });

  it("passes with single character passwords when matching", async () => {
    // Arrange
    const dto = new TestPasswordMatchDto();
    dto.password = "a";
    dto.passwordConfirm = "a";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it("fails with single character passwords when not matching", async () => {
    // Arrange
    const dto = new TestPasswordMatchDto();
    dto.password = "a";
    dto.passwordConfirm = "b";

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
  });

  it("passes with very long matching passwords", async () => {
    // Arrange
    const longPassword = "a".repeat(255);
    const dto = new TestPasswordMatchDto();
    dto.password = longPassword;
    dto.passwordConfirm = longPassword;

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });
});
