CREATE UNIQUE INDEX "BrandTranslation_languageId_brandId_unique" ON "BrandTranslation" ("languageId", "brandId")
WHERE
    "deletedAt" IS NULL;
