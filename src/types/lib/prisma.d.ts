import { VariantRequestDto } from "@/dtos/product/product.dto";

declare global {
  namespace PrismaJson {
    type Variants = VariantRequestDto[];
  }
}
