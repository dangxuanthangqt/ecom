import { defineSeeder } from "../seed-context";
import { LanguageId } from "../seed-ids";

const LANGUAGES = [
  { id: LanguageId.EN, name: "English" },
  { id: LanguageId.VI, name: "Tiếng Việt" },
];

/**
 * Languages are seeded first: every *Translation table has a required FK to
 * them, and they carry no audit FK back to User, so there is no cycle.
 */
export default defineSeeder({
  name: "languages",
  tier: "core",
  run: async ({ prisma, log }) => {
    for (const language of LANGUAGES) {
      await prisma.language.upsert({
        where: { id: language.id },
        create: language,
        update: { name: language.name, deletedAt: null },
      });
    }

    log(`${LANGUAGES.length} languages`);
  },
});
