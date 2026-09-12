import { defineSeeder } from "../seed-context";
import { catalogProductId, ProductId, UserId } from "../seed-ids";

/**
 * Ratings deliberately span 1..5 so rating filters and average-rating
 * aggregations have every bucket populated. Review carries
 * @@unique([userId, productId]) — one review per user per product.
 */
const REVIEWS = [
  {
    userId: UserId.CLIENT,
    productId: ProductId.IPHONE_15,
    rating: 5,
    content: "Battery life is excellent and the camera is a big step up.",
  },
  {
    userId: UserId.CLIENT_SECONDARY,
    productId: ProductId.IPHONE_15,
    rating: 4,
    content: "Great phone, but it gets warm while charging.",
  },
  {
    userId: UserId.CLIENT,
    productId: ProductId.AIR_MAX,
    rating: 3,
    content: "Comfortable, though the sizing runs small.",
  },
  {
    userId: UserId.CLIENT_SECONDARY,
    productId: ProductId.AIR_MAX,
    rating: 2,
    content: "Sole started separating after a month.",
  },
  {
    userId: UserId.CLIENT,
    productId: ProductId.GALAXY_S24,
    rating: 1,
    content: "Screen had a dead pixel out of the box.",
  },
  {
    userId: UserId.CLIENT_SECONDARY,
    productId: ProductId.GALAXY_S24,
    rating: 5,
    content: "Fast, bright screen, no complaints.",
  },
  {
    userId: UserId.CLIENT,
    productId: ProductId.MACBOOK_AIR,
    rating: 4,
    content: "Silent and light. Wish it had more ports.",
  },
  {
    userId: UserId.CLIENT,
    productId: catalogProductId(100),
    rating: 5,
    content: "Worth the upgrade over the base model.",
  },
  {
    userId: UserId.CLIENT_SECONDARY,
    productId: catalogProductId(104),
    rating: 4,
    content: "Noise cancelling is solid for the price.",
  },
  {
    userId: UserId.CLIENT,
    productId: catalogProductId(113),
    rating: 5,
    content: "Best headphones I have owned.",
  },
];

export default defineSeeder({
  name: "reviews",
  tier: "demo",
  run: async ({ prisma, log }) => {
    for (const review of REVIEWS) {
      await prisma.review.upsert({
        where: {
          userId_productId: {
            userId: review.userId,
            productId: review.productId,
          },
        },
        create: review,
        update: { rating: review.rating, content: review.content },
      });
    }

    log(`${REVIEWS.length} reviews`);
  },
});
