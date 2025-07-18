import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

import generateSKUs from "@/shared/utils/generate-skus.utils";

import { UpsertSKURequestDto } from "../sku/sku.dto";

import { ProductRequestDto, VariantRequestDto } from "./product.dto";

@ValidatorConstraint({ name: "IsUniqueVariant", async: false })
export class IsUniqueVariantConstraint implements ValidatorConstraintInterface {
  validate(variants: VariantRequestDto[], args: ValidationArguments) {
    // Extract variant names and normalize them
    const variantNames = variants.map((variant) => variant.value.toLowerCase());

    // Check for duplicates variant names
    const uniqueNames = new Set(variantNames);
    if (uniqueNames.size !== variantNames.length) {
      args.constraints[0] =
        "All variant names must be unique. Duplicate variant names are not allowed.";
      return false; // If any variant name is duplicated, return false
    }

    for (const variant of variants) {
      const options = variant.options || [];
      const uniqueOptions = new Set(options);
      // Check for duplicates in options
      if (uniqueOptions.size !== options.length) {
        args.constraints[0] =
          "All options must be unique. Duplicate options are not allowed.";
        return false; // If any option is duplicated, return false
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return (args.constraints[0] as string) || "Invalid variant data provided.";
  }
}

// Custom decorator
export function IsUniqueVariant(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "IsUniqueVariant",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUniqueVariantConstraint,
    });
  };
}

@ValidatorConstraint({ name: "IsValidSKUs", async: false })
export class IsValidSKUsConstraint implements ValidatorConstraintInterface {
  validate(skuFromClients: UpsertSKURequestDto[], args: ValidationArguments) {
    const productObject = args.object as ProductRequestDto;
    const variants = productObject.variants || [];

    const generatedSKUValues = generateSKUs(variants).map((sku) =>
      sku.value.toLowerCase(),
    );

    // console.log("generateSKUs(variants)", generateSKUs(variants));

    if (skuFromClients.length !== generatedSKUValues.length) {
      args.constraints[0] =
        "The number of SKUs does not match the correctly generated SKUs.";
      return false; // The number of SKUs must match the generated SKUs
    }

    // Check if each SKU matches the generated SKUs
    for (const skuClient of skuFromClients) {
      const skuString = skuClient.value.toLowerCase().trim();

      if (!generatedSKUValues.includes(skuString)) {
        args.constraints[0] = `SKU "${skuString}" is not valid.`;
        return false; // SKU does not match the generated SKUs
      }
    }

    return true; // All SKUs are valid
  }

  defaultMessage(args: ValidationArguments) {
    return (args.constraints[0] as string) || "Invalid SKUs provided.";
  }
}

// Custom decorator
export function IsValidSKUs(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "IsValidSKUs",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidSKUsConstraint,
    });
  };
}
