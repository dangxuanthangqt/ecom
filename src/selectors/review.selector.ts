import { Prisma } from "@prisma/client";

import { reviewAuthorSelect } from "@/selectors/review-author.selector";

export const createReviewSelect = () =>
  Prisma.validator<Prisma.ReviewSelect>()({
    id: true,
    content: true,
    rating: true,
    productId: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
    user: {
      select: reviewAuthorSelect,
    },
  });
