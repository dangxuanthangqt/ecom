import { BRANDS } from "../data/brands.data";
import { defineSeeder } from "../seed-context";
import { translationId } from "../seed-ids";

export default defineSeeder({
  name: "brands",
  tier: "demo",
  run: async ({ prisma, actorId, log }) => {
    for (const brand of BRANDS) {
      const { translations, ...brandData } = brand;

      await prisma.brand.upsert({
        where: { id: brand.id },
        create: { ...brandData, createdById: actorId },
        update: {
          name: brand.name,
          logo: brand.logo,
          deletedAt: null,
          updatedById: actorId,
        },
      });

      for (const translation of translations) {
        const id = translationId(brand.id, translation.languageId);

        await prisma.brandTranslation.upsert({
          where: { id },
          create: {
            id,
            brandId: brand.id,
            ...translation,
            createdById: actorId,
          },
          update: {
            name: translation.name,
            description: translation.description,
            deletedAt: null,
            updatedById: actorId,
          },
        });
      }
    }

    log(`${BRANDS.length} brands`);
  },
});
