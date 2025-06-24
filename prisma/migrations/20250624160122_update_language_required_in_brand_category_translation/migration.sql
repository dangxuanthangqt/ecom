/*
  Warnings:

  - Made the column `languageId` on table `BrandTranslation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `languageId` on table `CategoryTranslation` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "BrandTranslation" ALTER COLUMN "languageId" SET NOT NULL;

-- AlterTable
ALTER TABLE "CategoryTranslation" ALTER COLUMN "languageId" SET NOT NULL;
