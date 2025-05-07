import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from "class-validator";

import { Disable2faRequestDto } from "@/dtos/auth/2fa.dto";

@ValidatorConstraint({ name: "mutuallyExclusive", async: false })
export class BothOrNoneExistConstraint implements ValidatorConstraintInterface {
  validate(value: string | undefined, args: ValidationArguments) {
    const object = args.object as Disable2faRequestDto;
    const relatedPropertyName = args
      .constraints[0] as keyof Disable2faRequestDto;
    const relatedPropertyValue = object[relatedPropertyName];

    if ((value !== undefined) === (relatedPropertyValue !== undefined)) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const relatedPropertyName = args
      .constraints[0] as keyof Disable2faRequestDto;

    return `Either both ${relatedPropertyName} and ${args.property} must be provided, or neither should be provided.`;
  }
}

export function IsBothOrNoneExist(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "IsBothOrNoneExist",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: BothOrNoneExistConstraint,
    });
  };
}
