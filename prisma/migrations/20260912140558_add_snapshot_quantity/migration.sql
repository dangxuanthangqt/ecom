/*
  Warnings:

  - Added the required column `quantity` to the `ProductSKUSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductSKUSnapshot" ADD COLUMN     "quantity" INTEGER NOT NULL;
