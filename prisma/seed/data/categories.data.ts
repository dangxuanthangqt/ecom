import { CategoryId } from "../seed-ids";

import { CategoryFixture, image } from "./catalog-types";

const category = (
  id: string,
  name: string,
  parentCategoryId: string | null,
  vi: { name: string; description: string },
  en: string,
): CategoryFixture => ({
  id,
  name,
  logo: image(`cat-${name.toLowerCase()}`),
  parentCategoryId,
  translations: [
    { languageId: "en", name, description: en },
    { languageId: "vi", name: vi.name, description: vi.description },
  ],
});

/**
 * Parents are listed before their children so a single ordered pass satisfies
 * the self-referencing parentCategoryId FK.
 */
export const CATEGORIES: CategoryFixture[] = [
  category(
    CategoryId.ELECTRONICS,
    "Electronics",
    null,
    { name: "Điện tử", description: "Điện thoại, laptop và phụ kiện." },
    "Phones, laptops and gadgets.",
  ),
  category(
    CategoryId.PHONES,
    "Phones",
    CategoryId.ELECTRONICS,
    { name: "Điện thoại", description: "Điện thoại thông minh." },
    "Smartphones.",
  ),
  category(
    CategoryId.LAPTOPS,
    "Laptops",
    CategoryId.ELECTRONICS,
    { name: "Laptop", description: "Máy tính xách tay." },
    "Portable computers.",
  ),
  category(
    CategoryId.AUDIO,
    "Audio",
    CategoryId.ELECTRONICS,
    { name: "Âm thanh", description: "Tai nghe và loa." },
    "Headphones and speakers.",
  ),
  category(
    CategoryId.FASHION,
    "Fashion",
    null,
    { name: "Thời trang", description: "Quần áo và giày dép." },
    "Clothing and footwear.",
  ),
  category(
    CategoryId.SHOES,
    "Shoes",
    CategoryId.FASHION,
    { name: "Giày", description: "Giày thể thao và giày chạy bộ." },
    "Sneakers and running shoes.",
  ),
  category(
    CategoryId.CLOTHING,
    "Clothing",
    CategoryId.FASHION,
    { name: "Quần áo", description: "Áo, quần và đồ khoác." },
    "Tops, bottoms and outerwear.",
  ),
  category(
    CategoryId.HOME,
    "Home",
    null,
    { name: "Nhà cửa", description: "Đồ gia dụng." },
    "Household goods.",
  ),
  category(
    CategoryId.KITCHEN,
    "Kitchen",
    CategoryId.HOME,
    { name: "Nhà bếp", description: "Thiết bị nhà bếp." },
    "Kitchen appliances.",
  ),
];
