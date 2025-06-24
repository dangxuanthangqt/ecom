/*
Warnings:

- Added the required column `name` to the `Category` table without a default value. This is not possible if the table is not empty.

 */
-- AlterTable
ALTER TABLE "Category"
ADD COLUMN "logo" TEXT,
ADD COLUMN "name" VARCHAR(500) NOT NULL;

CREATE UNIQUE INDEX "CategoryTranslation_languageId_categoryId_unique" ON "CategoryTranslation" ("categoryId", "languageId")
WHERE
  "deletedAt" IS NULL;