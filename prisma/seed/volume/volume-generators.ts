import { faker } from "@faker-js/faker";
import { OrderStatus, Prisma } from "@prisma/client";

import { VolumeConfig } from "./volume-config";

/** Marks every generated account so `--clean` can find them by email alone. */
export const VOLUME_EMAIL_DOMAIN = "volume.local";

const ORDER_STATUSES = Object.values(OrderStatus);

const VARIANT_POOL = [
  { value: "Color", options: ["Black", "White", "Blue", "Red"] },
  { value: "Size", options: ["S", "M", "L", "XL"] },
  { value: "Storage", options: ["128GB", "256GB", "512GB"] },
];

export interface GeneratedRow {
  id: string;
}

export const generateBrands = (count: number, actorId: string) =>
  Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    name: `${faker.company.name()} ${faker.string.alphanumeric(4)}`,
    logo: faker.image.urlPicsumPhotos({ width: 200, height: 200 }),
    createdById: actorId,
  }));

export const generateCategories = (count: number, actorId: string) =>
  Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    name: `${faker.commerce.department()} ${faker.string.alphanumeric(4)}`,
    logo: faker.image.urlPicsumPhotos({ width: 200, height: 200 }),
    parentCategoryId: null,
    createdById: actorId,
  }));

export const generateTranslations = (
  parents: GeneratedRow[],
  languageIds: string[],
  actorId: string,
  foreignKey: "brandId" | "categoryId" | "productId",
) =>
  parents.flatMap((parent) =>
    languageIds.map((languageId) => ({
      id: faker.string.uuid(),
      [foreignKey]: parent.id,
      languageId,
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      createdById: actorId,
    })),
  );

export interface GeneratedProduct {
  id: string;
  name: string;
  basePrice: number;
  virtualPrice: number;
  brandId: string;
  images: string[];
  publishedAt: Date | null;
  variants: Prisma.InputJsonValue;
  createdById: string;
}

export const generateProducts = (
  count: number,
  brandIds: string[],
  actorId: string,
): GeneratedProduct[] =>
  Array.from({ length: count }, (_, index) => {
    const basePrice = faker.number.int({ min: 50_000, max: 60_000_000 });

    return {
      id: faker.string.uuid(),
      name: `${faker.commerce.productName()} ${index}`,
      basePrice,
      virtualPrice: Math.round(basePrice * 1.15),
      brandId: faker.helpers.arrayElement(brandIds),
      images: [faker.image.urlPicsumPhotos({ width: 600, height: 600 })],
      // ~10% unpublished, so published-only filters actually exclude rows.
      publishedAt:
        faker.number.int({ min: 1, max: 10 }) === 1
          ? null
          : faker.date.past({ years: 2 }),
      variants: [
        faker.helpers.arrayElement(VARIANT_POOL),
      ] as unknown as Prisma.InputJsonValue,
      createdById: actorId,
    };
  });

export const generateSkus = (
  products: GeneratedProduct[],
  perProduct: number,
  actorId: string,
) =>
  products.flatMap((product) =>
    Array.from({ length: perProduct }, (_, order) => ({
      id: faker.string.uuid(),
      productId: product.id,
      order,
      value: `${faker.commerce.productAdjective()}-${order}`,
      price: Math.round(product.basePrice * (1 + order * 0.1)),
      stock: faker.number.int({ min: 0, max: 500 }),
      image: faker.image.urlPicsumPhotos({ width: 600, height: 600 }),
      createdById: actorId,
    })),
  );

export const generateUsers = (
  count: number,
  roleId: string,
  password: string,
  actorId: string,
) =>
  Array.from({ length: count }, (_, index) => ({
    id: faker.string.uuid(),
    // Index keeps the email unique without relying on faker not repeating itself.
    email: `volume-${index}@${VOLUME_EMAIL_DOMAIN}`,
    name: faker.person.fullName(),
    phoneNumber: faker.string.numeric(10),
    password,
    roleId,
    createdById: actorId,
  }));

export const generateOrders = (
  count: number,
  userIds: string[],
  actorId: string,
) =>
  Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    userId: faker.helpers.arrayElement(userIds),
    status: faker.helpers.arrayElement(ORDER_STATUSES),
    createdById: actorId,
  }));

export interface SkuRef {
  id: string;
  productId: string;
  value: string;
  price: number;
}

export const generateOrderItems = (
  orders: { id: string }[],
  skus: SkuRef[],
  config: VolumeConfig,
) =>
  orders.flatMap((order) =>
    faker.helpers.arrayElements(skus, config.itemsPerOrder).map((sku) => ({
      snapshot: {
        id: faker.string.uuid(),
        orderId: order.id,
        skuId: sku.id,
        productName: faker.commerce.productName(),
        price: sku.price,
        images: [faker.image.urlPicsumPhotos({ width: 600, height: 600 })],
        skuValue: sku.value,
        quantity: faker.number.int({ min: 1, max: 5 }),
      },
      orderId: order.id,
      productId: sku.productId,
    })),
  );

/**
 * Review and CartItem both carry a composite unique key. Random pairs collide,
 * so these are written with `skipDuplicates` and the realised count is reported
 * rather than the requested one.
 */
export const generateReviews = (
  count: number,
  userIds: string[],
  productIds: string[],
) =>
  Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    userId: faker.helpers.arrayElement(userIds),
    productId: faker.helpers.arrayElement(productIds),
    rating: faker.number.int({ min: 1, max: 5 }),
    content: faker.lorem.sentences(2),
  }));

export const generateCartItems = (
  count: number,
  userIds: string[],
  skuIds: string[],
) =>
  Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    userId: faker.helpers.arrayElement(userIds),
    skuId: faker.helpers.arrayElement(skuIds),
    quantity: faker.number.int({ min: 1, max: 5 }),
  }));
