import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

import { LoginRequestDto } from "@/dto/auth/login.dto";

@ValidatorConstraint({ name: "mutuallyExclusive", async: false })
export class OnlyOneExistsConstraint implements ValidatorConstraintInterface {
  validate(value: string | undefined, args: ValidationArguments) {
    const object = args.object as LoginRequestDto;
    const relatedPropertyName = args.constraints[0] as keyof LoginRequestDto;
    const relatedPropertyValue = object[relatedPropertyName];
    // Check if both are provided
    if (value !== undefined && relatedPropertyValue !== undefined) {
      return false; // Both are present, validation fails
    }

    // If only one or none is provided, it's valid in this context
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const relatedPropertyName = args.constraints[0] as keyof LoginRequestDto;

    return `Only one of ${relatedPropertyName} or ${args.property} must be provided.`;
  }
}

export function IsOnlyOneExists(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "IsOnlyOneExists",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: OnlyOneExistsConstraint,
    });
  };
}
