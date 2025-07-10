/*
Warnings:

- You are about to drop the column `publishAt` on the `Product` table. All the data in the column will be lost.

 */
-- AlterTable
ALTER TABLE "Product"
RENAME COLUMN "publishAt" TO "publishedAt";

-- CreateTable
CREATE TABLE
  "_OrderToProduct" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,
    CONSTRAINT "_OrderToProduct_AB_pkey" PRIMARY KEY ("A", "B")
  );

-- CreateIndex
CREATE INDEX "_OrderToProduct_B_index" ON "_OrderToProduct" ("B");

-- CreateIndex
CREATE INDEX "Order_deletedAt_status_idx" ON "Order" ("deletedAt", "status");

-- AddForeignKey
ALTER TABLE "_OrderToProduct" ADD CONSTRAINT "_OrderToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrderToProduct" ADD CONSTRAINT "_OrderToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE;