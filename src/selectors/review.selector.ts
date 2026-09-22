import { Prisma } from "@/generated/prisma/client";
import { reviewAuthorSelect } from "@/selectors/review-author.selector";
import { defineSelect } from "@/shared/utils/prisma-select.util";

export const createReviewSelect = () =>
  defineSelect<Prisma.ReviewSelect>()({
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
