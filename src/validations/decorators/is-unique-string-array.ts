import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

// Custom constraint for unique array values
@ValidatorConstraint({ name: "IsUniqueStringArray", async: false })
export class IsUniqueArrayConstraint implements ValidatorConstraintInterface {
  validate(values: string[], _args: ValidationArguments) {
    if (!Array.isArray(values)) return false;

    // Convert to lowercase for case-insensitive comparison
    const normalizedValues = values.map((item) =>
      typeof item === "string" ? item.toLowerCase().trim() : item,
    );

    // Check for duplicates
    const uniqueValues = new Set(normalizedValues);
    return uniqueValues.size === normalizedValues.length;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must contain unique values. Duplicate values are not allowed.`;
  }
}

// Custom decorator
export function IsUniqueStringArray(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUniqueArrayConstraint,
    });
  };
}
