import { VariantRequestDto } from "@/dtos/product/product.dto";

declare global {
  namespace PrismaJon {
    type Variants = VariantRequestDto[];
  }
}
