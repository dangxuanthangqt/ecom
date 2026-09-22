import { Logger } from "@nestjs/common";

import { ErrorCode } from "@/constants/error-codes";
import { createCartItemSelect } from "@/selectors/cart-item.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

interface UpsertCartItemArgs {
  prismaService: PrismaService;
  logger: Logger;
  userId: string;
  skuId: string;
  quantity: number;
}

/**
 * BR-C04: one line per SKU, enforced by the `(userId, skuId)` unique key on
 * `CartItem`. Split out of `CartRepository` to keep that file under 200
 * lines — the conflict-retry path below is the only part of the module with
 * meaningful branching logic.
 *
 * A concurrent add-to-cart can win the upsert's create branch first, making
 * ours collide on that constraint (P2002). The row now exists, so retry once
 * as a plain increment update instead of surfacing a 500 for a benign race.
 */
export async function upsertCartItemWithConflictRetry({
  prismaService,
  logger,
  userId,
  skuId,
  quantity,
}: UpsertCartItemArgs) {
  try {
    return await prismaService.cartItem.upsert({
      where: { userId_skuId: { userId, skuId } },
      create: { userId, skuId, quantity },
      update: { quantity: { increment: quantity } },
      select: createCartItemSelect(),
    });
  } catch (error) {
    logger.error(error);

    if (isUniqueConstraintPrismaError(error)) {
      return retryAsIncrement({
        prismaService,
        logger,
        userId,
        skuId,
        quantity,
      });
    }

    if (isForeignKeyConstraintPrismaError(error)) {
      throwHttpException({
        type: "notFound",
        code: ErrorCode.SKU_NOT_FOUND,
        message: "SKU not found.",
      });
    }

    throwHttpException({
      type: "internal",
      message: "Failed to add item to cart.",
    });
  }
}

async function retryAsIncrement({
  prismaService,
  logger,
  userId,
  skuId,
  quantity,
}: UpsertCartItemArgs) {
  try {
    return await prismaService.cartItem.update({
      where: { userId_skuId: { userId, skuId } },
      data: { quantity: { increment: quantity } },
      select: createCartItemSelect(),
    });
  } catch (error) {
    logger.error(error);

    throwHttpException({
      type: "badRequest",
      code: ErrorCode.CART_UPDATE_CONFLICT,
      message:
        "Could not add item to cart due to a conflicting update. Please try again.",
    });
  }
}
