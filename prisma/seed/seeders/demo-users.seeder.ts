import { HashingService } from "@/shared/services/hashing.service";

import { defineSeeder } from "../seed-context";
import { LanguageId, RoleId, translationId, UserId } from "../seed-ids";

const hashingService = new HashingService();

/** Shared across every demo account so local login is one thing to remember. */
export const DEMO_PASSWORD = "Password@123";

const DEMO_USERS = [
  {
    id: UserId.SELLER,
    email: "seller@ecom.local",
    name: "Demo Seller",
    phoneNumber: "0900000001",
    roleId: RoleId.SELLER,
    address: "12 Nguyen Hue, District 1, Ho Chi Minh City",
  },
  {
    id: UserId.CLIENT,
    email: "client@ecom.local",
    name: "Demo Client",
    phoneNumber: "0900000002",
    roleId: RoleId.CLIENT,
    address: "45 Le Loi, District 1, Ho Chi Minh City",
  },
  {
    id: UserId.CLIENT_SECONDARY,
    email: "client2@ecom.local",
    name: "Second Demo Client",
    phoneNumber: "0900000003",
    roleId: RoleId.CLIENT,
    address: "78 Tran Hung Dao, District 5, Ho Chi Minh City",
  },
];

export default defineSeeder({
  name: "demo-users",
  tier: "demo",
  run: async ({ prisma, actorId, log }) => {
    const password = hashingService.hash(DEMO_PASSWORD);

    for (const user of DEMO_USERS) {
      const { address, ...userData } = user;

      await prisma.user.upsert({
        where: { id: user.id },
        create: { ...userData, password, createdById: actorId },
        update: {
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          status: "ACTIVE",
          deletedAt: null,
          updatedById: actorId,
        },
      });

      // One translation row per user keeps the i18n read paths exercised locally.
      // Keyed through translationId like every other translation seeder, so a
      // second language for the same user gets its own id instead of colliding.
      const userTranslationId = translationId(user.id, LanguageId.EN);

      await prisma.userTranslation.upsert({
        where: { id: userTranslationId },
        create: {
          id: userTranslationId,
          userId: user.id,
          languageId: LanguageId.EN,
          address,
          createdById: actorId,
        },
        update: { address, deletedAt: null, updatedById: actorId },
      });
    }

    log(`${DEMO_USERS.length} demo users (password: ${DEMO_PASSWORD})`);
  },
});
