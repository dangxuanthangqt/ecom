import { ValidationError } from "@nestjs/common";

import { ErrorDetailDto } from "@/dtos/error-detail.dto";

import { transformValidateObject } from "../app.util";

describe("transformValidateObject", () => {
  it("transforms single validation error to ErrorDetailDto array", () => {
    // Arrange
    const error: ValidationError = {
      property: "email",
      constraints: {
        isEmail: "email must be an email",
      },
    };

    // Act
    const result = transformValidateObject([error]);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      field: "email",
      code: "isEmail",
      message: "email must be an email",
    });
  });

  it("transforms multiple validation errors", () => {
    // Arrange
    const errors: ValidationError[] = [
      {
        property: "email",
        constraints: {
          isEmail: "email must be an email",
        },
      },
      {
        property: "password",
        constraints: {
          minLength: "password must be at least 8 characters",
        },
      },
    ];

    // Act
    const result = transformValidateObject(errors);

    // Assert
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      field: "email",
      code: "isEmail",
      message: "email must be an email",
    });
    expect(result).toContainEqual({
      field: "password",
      code: "minLength",
      message: "password must be at least 8 characters",
    });
  });

  it("handles error with multiple constraints", () => {
    // Arrange
    const error: ValidationError = {
      property: "password",
      constraints: {
        minLength: "password must be at least 8 characters",
        matches: "password must contain uppercase letter",
      },
    };

    // Act
    const result = transformValidateObject([error]);

    // Assert
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      field: "password",
      code: "minLength",
      message: "password must be at least 8 characters",
    });
    expect(result).toContainEqual({
      field: "password",
      code: "matches",
      message: "password must contain uppercase letter",
    });
  });

  it("transforms nested validation errors with dot notation", () => {
    // Arrange
    const error: ValidationError = {
      property: "address",
      children: [
        {
          property: "street",
          constraints: {
            isString: "street must be a string",
          },
        },
      ],
    };

    // Act
    const result = transformValidateObject([error]);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      field: "address.street",
      code: "isString",
      message: "street must be a string",
    });
  });

  it("transforms deeply nested validation errors", () => {
    // Arrange
    const error: ValidationError = {
      property: "user",
      children: [
        {
          property: "profile",
          children: [
            {
              property: "name",
              constraints: {
                isString: "name must be a string",
              },
            },
          ],
        },
      ],
    };

    // Act
    const result = transformValidateObject([error]);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      field: "user.profile.name",
      code: "isString",
      message: "name must be a string",
    });
  });

  it("handles mixed flat and nested errors", () => {
    // Arrange
    const errors: ValidationError[] = [
      {
        property: "email",
        constraints: {
          isEmail: "email must be an email",
        },
      },
      {
        property: "address",
        children: [
          {
            property: "street",
            constraints: {
              isString: "street must be a string",
            },
          },
        ],
      },
    ];

    // Act
    const result = transformValidateObject(errors);

    // Assert
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      field: "email",
      code: "isEmail",
      message: "email must be an email",
    });
    expect(result).toContainEqual({
      field: "address.street",
      code: "isString",
      message: "street must be a string",
    });
  });

  it("returns empty array for empty errors", () => {
    // Arrange
    const errors: ValidationError[] = [];

    // Act
    const result = transformValidateObject(errors);

    // Assert
    expect(result).toEqual([]);
  });

  it("handles nested error without constraints", () => {
    // Arrange
    const error: ValidationError = {
      property: "address",
      children: [
        {
          property: "street",
          constraints: {
            isString: "street must be a string",
          },
        },
        {
          property: "city",
          children: [
            {
              property: "name",
              constraints: {
                isString: "name must be a string",
              },
            },
          ],
        },
      ],
    };

    // Act
    const result = transformValidateObject([error]);

    // Assert
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      field: "address.street",
      code: "isString",
      message: "street must be a string",
    });
    expect(result).toContainEqual({
      field: "address.city.name",
      code: "isString",
      message: "name must be a string",
    });
  });

  it("returns typed ErrorDetailDto array", () => {
    // Arrange
    const error: ValidationError = {
      property: "email",
      constraints: {
        isEmail: "email must be an email",
      },
    };

    // Act
    const result: ErrorDetailDto[] = transformValidateObject([error]);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("field");
    expect(result[0]).toHaveProperty("code");
    expect(result[0]).toHaveProperty("message");
  });
});
