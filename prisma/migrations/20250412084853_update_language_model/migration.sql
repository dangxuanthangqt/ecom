/*
  Warnings:

  - The primary key for the `Language` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `code` on the `Language` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Language` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `VarChar(10)`.

*/
-- DropForeignKey
ALTER TABLE "BrandTranslation" DROP CONSTRAINT "BrandTranslation_languageId_fkey";

-- DropForeignKey
ALTER TABLE "CategoryTranslation" DROP CONSTRAINT "CategoryTranslation_languageId_fkey";

-- DropForeignKey
ALTER TABLE "ProductTranslation" DROP CONSTRAINT "ProductTranslation_languageId_fkey";

-- DropForeignKey
ALTER TABLE "UserTranslation" DROP CONSTRAINT "UserTranslation_languageId_fkey";

-- DropIndex
DROP INDEX "Language_code_key";

-- AlterTable
ALTER TABLE "BrandTranslation" ALTER COLUMN "languageId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "CategoryTranslation" ALTER COLUMN "languageId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Language" DROP CONSTRAINT "Language_pkey",
DROP COLUMN "code",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(10),
ADD CONSTRAINT "Language_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Language_id_seq";

-- AlterTable
ALTER TABLE "ProductTranslation" ALTER COLUMN "languageId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "UserTranslation" ALTER COLUMN "languageId" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "Brand_deletedAt_idx" ON "Brand"("deletedAt");

-- CreateIndex
CREATE INDEX "BrandTranslation_deletedAt_idx" ON "BrandTranslation"("deletedAt");

-- CreateIndex
CREATE INDEX "Category_deletedAt_idx" ON "Category"("deletedAt");

-- CreateIndex
CREATE INDEX "CategoryTranslation_deletedAt_idx" ON "CategoryTranslation"("deletedAt");

-- CreateIndex
CREATE INDEX "Language_deletedAt_idx" ON "Language"("deletedAt");

-- CreateIndex
CREATE INDEX "Order_deletedAt_idx" ON "Order"("deletedAt");

-- CreateIndex
CREATE INDEX "Permission_deletedAt_idx" ON "Permission"("deletedAt");

-- CreateIndex
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");

-- CreateIndex
CREATE INDEX "ProductTranslation_deletedAt_idx" ON "ProductTranslation"("deletedAt");

-- CreateIndex
CREATE INDEX "Role_deletedAt_idx" ON "Role"("deletedAt");

-- CreateIndex
CREATE INDEX "SKU_deletedAt_idx" ON "SKU"("deletedAt");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "UserTranslation_deletedAt_idx" ON "UserTranslation"("deletedAt");

-- CreateIndex
CREATE INDEX "Variant_deletedAt_idx" ON "Variant"("deletedAt");

-- CreateIndex
CREATE INDEX "VariantOption_deletedAt_idx" ON "VariantOption"("deletedAt");

-- AddForeignKey
ALTER TABLE "UserTranslation" ADD CONSTRAINT "UserTranslation_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BrandTranslation" ADD CONSTRAINT "BrandTranslation_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
