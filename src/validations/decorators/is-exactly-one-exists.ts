import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from "class-validator";

import { Disable2faRequestDto } from "@/dtos/auth/2fa.dto";

@ValidatorConstraint({ name: "exactlyOneExists", async: false })
export class ExactlyOneExistsConstraint
  implements ValidatorConstraintInterface
{
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

    return `Exactly one of ${relatedPropertyName} or ${args.property} must be provided, not both and not neither.`;
  }
}

export function IsExactlyOneExists(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "IsExactlyOneExists",
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: ExactlyOneExistsConstraint,
    });
  };
}
