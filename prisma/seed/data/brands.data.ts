import { BrandId } from "../seed-ids";

import { BrandFixture, image } from "./catalog-types";

const brand = (
  id: string,
  name: string,
  en: string,
  vi: string,
): BrandFixture => ({
  id,
  name,
  logo: image(`brand-${name.toLowerCase()}`),
  translations: [
    { languageId: "en", name, description: en },
    { languageId: "vi", name, description: vi },
  ],
});

export const BRANDS: BrandFixture[] = [
  brand(
    BrandId.APPLE,
    "Apple",
    "Apple consumer electronics.",
    "Thiết bị điện tử tiêu dùng Apple.",
  ),
  brand(
    BrandId.SAMSUNG,
    "Samsung",
    "Samsung Electronics devices.",
    "Thiết bị điện tử Samsung.",
  ),
  brand(
    BrandId.XIAOMI,
    "Xiaomi",
    "Xiaomi smart devices.",
    "Thiết bị thông minh Xiaomi.",
  ),
  brand(
    BrandId.SONY,
    "Sony",
    "Sony audio and imaging.",
    "Thiết bị âm thanh và hình ảnh Sony.",
  ),
  brand(
    BrandId.NIKE,
    "Nike",
    "Sportswear and footwear.",
    "Đồ thể thao và giày.",
  ),
  brand(
    BrandId.ADIDAS,
    "Adidas",
    "Athletic apparel and shoes.",
    "Trang phục và giày thể thao.",
  ),
];
