/*
Warnings:

- You are about to drop the column `publishedAt` on the `Product` table. All the data in the column will be lost.

 */
-- AlterTable
ALTER TABLE "Product"
DROP COLUMN "publishedAt",
ADD COLUMN "publishedAt" TIMESTAMP(3);
