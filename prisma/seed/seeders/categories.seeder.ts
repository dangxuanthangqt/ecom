import { CATEGORIES } from "../data/categories.data";
import { defineSeeder } from "../seed-context";
import { translationId } from "../seed-ids";

/**
 * Parents are listed before children in the fixture, so a single ordered pass
 * satisfies the self-referencing parentCategoryId FK.
 */
export default defineSeeder({
  name: "categories",
  tier: "demo",
  run: async ({ prisma, actorId, log }) => {
    for (const category of CATEGORIES) {
      const { translations, ...categoryData } = category;

      await prisma.category.upsert({
        where: { id: category.id },
        create: { ...categoryData, createdById: actorId },
        update: {
          name: category.name,
          logo: category.logo,
          parentCategoryId: category.parentCategoryId,
          deletedAt: null,
          updatedById: actorId,
        },
      });

      for (const translation of translations) {
        const id = translationId(category.id, translation.languageId);

        await prisma.categoryTranslation.upsert({
          where: { id },
          create: {
            id,
            categoryId: category.id,
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

    log(`${CATEGORIES.length} categories`);
  },
});
