/*
  Warnings:

  - Made the column `brandId` on table `BrandTranslation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `categoryId` on table `CategoryTranslation` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "BrandTranslation" ALTER COLUMN "brandId" SET NOT NULL;

-- AlterTable
ALTER TABLE "CategoryTranslation" ALTER COLUMN "categoryId" SET NOT NULL;
