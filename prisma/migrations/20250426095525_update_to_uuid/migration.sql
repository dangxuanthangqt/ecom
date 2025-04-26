/*
  Warnings:

  - The primary key for the `Brand` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `createdById` column on the `Brand` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedById` column on the `Brand` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deletedById` column on the `Brand` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `BrandTranslation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `createdById` column on the `BrandTranslation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedById` column on the `BrandTranslation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deletedById` column on the `BrandTranslation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `CartItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Category` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `parentCategoryId` column on the `Category` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `createdById` column on the `Category` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedById` column on the `Category` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deletedById` column on the `Category` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `CategoryTranslation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `createdById` column on the `CategoryTranslation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedById` column on the `CategoryTranslation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deletedById` column on the `CategoryTranslation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Device` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `createdById` column on the `Language` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedById` column on the `Language` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deletedById` column on the `Language` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Message` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Order` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `createdById` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedById` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deletedById` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `PaymentTransaction` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Permission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `createdById` column on the `Permission` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedById` column on the `Permission` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deletedById` column on the `Permission` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Product` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `createdById` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedById` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deletedById` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `ProductSKUSnapshot` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `skuId` column on the `ProductSKUSnapshot` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `orderId` column on the `ProductSKUSnapshot` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `ProductTranslation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `createdById` column on the `ProductTranslation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedById` column on the `ProductTranslation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deletedById` column on the `ProductTranslation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Review` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Role` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `createdById` column on the `Role` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedById` column on the `Role` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deletedById` column on the `Role` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `SKU` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `createdById` column on the `SKU` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedById` column on the `SKU` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deletedById` column on the `SKU` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `createdById` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedById` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deletedById` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `UserTranslation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `createdById` column on the `UserTranslation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedById` column on the `UserTranslation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deletedById` column on the `UserTranslation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Variant` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `createdById` column on the `Variant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedById` column on the `Variant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deletedById` column on the `Variant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `VariantOption` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `createdById` column on the `VariantOption` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedById` column on the `VariantOption` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deletedById` column on the `VariantOption` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `VerificationCode` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_CategoryToProduct` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_PermissionToRole` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_SKUToVariantOption` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `Brand` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `BrandTranslation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `brandId` on the `BrandTranslation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `CartItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `skuId` on the `CartItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `CartItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Category` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `CategoryTranslation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `categoryId` on the `CategoryTranslation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Device` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `Device` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Message` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `fromUserId` on the `Message` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `toUserId` on the `Message` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `PaymentTransaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Permission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Product` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `brandId` on the `Product` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `ProductSKUSnapshot` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `ProductTranslation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `productId` on the `ProductTranslation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `RefreshToken` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `deviceId` on the `RefreshToken` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Review` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `productId` on the `Review` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `Review` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Role` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `SKU` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `productId` on the `SKU` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `roleId` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `UserTranslation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `UserTranslation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Variant` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `productId` on the `Variant` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `VariantOption` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `variantId` on the `VariantOption` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `VerificationCode` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `A` on the `_CategoryToProduct` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `B` on the `_CategoryToProduct` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `A` on the `_PermissionToRole` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `B` on the `_PermissionToRole` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `A` on the `_SKUToVariantOption` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `B` on the `_SKUToVariantOption` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Brand" DROP CONSTRAINT "Brand_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Brand" DROP CONSTRAINT "Brand_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Brand" DROP CONSTRAINT "Brand_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "BrandTranslation" DROP CONSTRAINT "BrandTranslation_brandId_fkey";

-- DropForeignKey
ALTER TABLE "BrandTranslation" DROP CONSTRAINT "BrandTranslation_createdById_fkey";

-- DropForeignKey
ALTER TABLE "BrandTranslation" DROP CONSTRAINT "BrandTranslation_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "BrandTranslation" DROP CONSTRAINT "BrandTranslation_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_skuId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_userId_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_parentCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "CategoryTranslation" DROP CONSTRAINT "CategoryTranslation_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "CategoryTranslation" DROP CONSTRAINT "CategoryTranslation_createdById_fkey";

-- DropForeignKey
ALTER TABLE "CategoryTranslation" DROP CONSTRAINT "CategoryTranslation_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "CategoryTranslation" DROP CONSTRAINT "CategoryTranslation_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_userId_fkey";

-- DropForeignKey
ALTER TABLE "Language" DROP CONSTRAINT "Language_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Language" DROP CONSTRAINT "Language_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Language" DROP CONSTRAINT "Language_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_fromUserId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_toUserId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "Permission" DROP CONSTRAINT "Permission_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Permission" DROP CONSTRAINT "Permission_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Permission" DROP CONSTRAINT "Permission_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_brandId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "ProductSKUSnapshot" DROP CONSTRAINT "ProductSKUSnapshot_orderId_fkey";

-- DropForeignKey
ALTER TABLE "ProductSKUSnapshot" DROP CONSTRAINT "ProductSKUSnapshot_skuId_fkey";

-- DropForeignKey
ALTER TABLE "ProductTranslation" DROP CONSTRAINT "ProductTranslation_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ProductTranslation" DROP CONSTRAINT "ProductTranslation_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "ProductTranslation" DROP CONSTRAINT "ProductTranslation_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductTranslation" DROP CONSTRAINT "ProductTranslation_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_productId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "SKU" DROP CONSTRAINT "SKU_createdById_fkey";

-- DropForeignKey
ALTER TABLE "SKU" DROP CONSTRAINT "SKU_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "SKU" DROP CONSTRAINT "SKU_productId_fkey";

-- DropForeignKey
ALTER TABLE "SKU" DROP CONSTRAINT "SKU_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_createdById_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "UserTranslation" DROP CONSTRAINT "UserTranslation_createdById_fkey";

-- DropForeignKey
ALTER TABLE "UserTranslation" DROP CONSTRAINT "UserTranslation_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "UserTranslation" DROP CONSTRAINT "UserTranslation_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "UserTranslation" DROP CONSTRAINT "UserTranslation_userId_fkey";

-- DropForeignKey
ALTER TABLE "Variant" DROP CONSTRAINT "Variant_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Variant" DROP CONSTRAINT "Variant_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Variant" DROP CONSTRAINT "Variant_productId_fkey";

-- DropForeignKey
ALTER TABLE "Variant" DROP CONSTRAINT "Variant_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "VariantOption" DROP CONSTRAINT "VariantOption_createdById_fkey";

-- DropForeignKey
ALTER TABLE "VariantOption" DROP CONSTRAINT "VariantOption_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "VariantOption" DROP CONSTRAINT "VariantOption_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "VariantOption" DROP CONSTRAINT "VariantOption_variantId_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryToProduct" DROP CONSTRAINT "_CategoryToProduct_A_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryToProduct" DROP CONSTRAINT "_CategoryToProduct_B_fkey";

-- DropForeignKey
ALTER TABLE "_PermissionToRole" DROP CONSTRAINT "_PermissionToRole_A_fkey";

-- DropForeignKey
ALTER TABLE "_PermissionToRole" DROP CONSTRAINT "_PermissionToRole_B_fkey";

-- DropForeignKey
ALTER TABLE "_SKUToVariantOption" DROP CONSTRAINT "_SKUToVariantOption_A_fkey";

-- DropForeignKey
ALTER TABLE "_SKUToVariantOption" DROP CONSTRAINT "_SKUToVariantOption_B_fkey";

-- AlterTable
ALTER TABLE "Brand" DROP CONSTRAINT "Brand_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
DROP COLUMN "updatedById",
ADD COLUMN     "updatedById" UUID,
DROP COLUMN "deletedById",
ADD COLUMN     "deletedById" UUID,
ADD CONSTRAINT "Brand_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "BrandTranslation" DROP CONSTRAINT "BrandTranslation_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "brandId",
ADD COLUMN     "brandId" UUID NOT NULL,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
DROP COLUMN "updatedById",
ADD COLUMN     "updatedById" UUID,
DROP COLUMN "deletedById",
ADD COLUMN     "deletedById" UUID,
ADD CONSTRAINT "BrandTranslation_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "skuId",
ADD COLUMN     "skuId" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ADD CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Category" DROP CONSTRAINT "Category_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "parentCategoryId",
ADD COLUMN     "parentCategoryId" UUID,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
DROP COLUMN "updatedById",
ADD COLUMN     "updatedById" UUID,
DROP COLUMN "deletedById",
ADD COLUMN     "deletedById" UUID,
ADD CONSTRAINT "Category_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "CategoryTranslation" DROP CONSTRAINT "CategoryTranslation_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "categoryId",
ADD COLUMN     "categoryId" UUID NOT NULL,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
DROP COLUMN "updatedById",
ADD COLUMN     "updatedById" UUID,
DROP COLUMN "deletedById",
ADD COLUMN     "deletedById" UUID,
ADD CONSTRAINT "CategoryTranslation_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Device" DROP CONSTRAINT "Device_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ADD CONSTRAINT "Device_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Language" DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
DROP COLUMN "updatedById",
ADD COLUMN     "updatedById" UUID,
DROP COLUMN "deletedById",
ADD COLUMN     "deletedById" UUID;

-- AlterTable
ALTER TABLE "Message" DROP CONSTRAINT "Message_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "fromUserId",
ADD COLUMN     "fromUserId" UUID NOT NULL,
DROP COLUMN "toUserId",
ADD COLUMN     "toUserId" UUID NOT NULL,
ADD CONSTRAINT "Message_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Order" DROP CONSTRAINT "Order_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
DROP COLUMN "updatedById",
ADD COLUMN     "updatedById" UUID,
DROP COLUMN "deletedById",
ADD COLUMN     "deletedById" UUID,
ADD CONSTRAINT "Order_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT "PaymentTransaction_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Permission" DROP CONSTRAINT "Permission_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
DROP COLUMN "updatedById",
ADD COLUMN     "updatedById" UUID,
DROP COLUMN "deletedById",
ADD COLUMN     "deletedById" UUID,
ADD CONSTRAINT "Permission_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Product" DROP CONSTRAINT "Product_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "brandId",
ADD COLUMN     "brandId" UUID NOT NULL,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
DROP COLUMN "updatedById",
ADD COLUMN     "updatedById" UUID,
DROP COLUMN "deletedById",
ADD COLUMN     "deletedById" UUID,
ADD CONSTRAINT "Product_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ProductSKUSnapshot" DROP CONSTRAINT "ProductSKUSnapshot_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "skuId",
ADD COLUMN     "skuId" UUID,
DROP COLUMN "orderId",
ADD COLUMN     "orderId" UUID,
ADD CONSTRAINT "ProductSKUSnapshot_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ProductTranslation" DROP CONSTRAINT "ProductTranslation_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "productId",
ADD COLUMN     "productId" UUID NOT NULL,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
DROP COLUMN "updatedById",
ADD COLUMN     "updatedById" UUID,
DROP COLUMN "deletedById",
ADD COLUMN     "deletedById" UUID,
ADD CONSTRAINT "ProductTranslation_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "RefreshToken" DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
DROP COLUMN "deviceId",
ADD COLUMN     "deviceId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Review" DROP CONSTRAINT "Review_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "productId",
ADD COLUMN     "productId" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ADD CONSTRAINT "Review_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Role" DROP CONSTRAINT "Role_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
DROP COLUMN "updatedById",
ADD COLUMN     "updatedById" UUID,
DROP COLUMN "deletedById",
ADD COLUMN     "deletedById" UUID,
ADD CONSTRAINT "Role_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "SKU" DROP CONSTRAINT "SKU_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "productId",
ADD COLUMN     "productId" UUID NOT NULL,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
DROP COLUMN "updatedById",
ADD COLUMN     "updatedById" UUID,
DROP COLUMN "deletedById",
ADD COLUMN     "deletedById" UUID,
ADD CONSTRAINT "SKU_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "roleId",
ADD COLUMN     "roleId" UUID NOT NULL,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
DROP COLUMN "updatedById",
ADD COLUMN     "updatedById" UUID,
DROP COLUMN "deletedById",
ADD COLUMN     "deletedById" UUID,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "UserTranslation" DROP CONSTRAINT "UserTranslation_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
DROP COLUMN "updatedById",
ADD COLUMN     "updatedById" UUID,
DROP COLUMN "deletedById",
ADD COLUMN     "deletedById" UUID,
ADD CONSTRAINT "UserTranslation_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Variant" DROP CONSTRAINT "Variant_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "productId",
ADD COLUMN     "productId" UUID NOT NULL,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
DROP COLUMN "updatedById",
ADD COLUMN     "updatedById" UUID,
DROP COLUMN "deletedById",
ADD COLUMN     "deletedById" UUID,
ADD CONSTRAINT "Variant_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "VariantOption" DROP CONSTRAINT "VariantOption_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "variantId",
ADD COLUMN     "variantId" UUID NOT NULL,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID,
DROP COLUMN "updatedById",
ADD COLUMN     "updatedById" UUID,
DROP COLUMN "deletedById",
ADD COLUMN     "deletedById" UUID,
ADD CONSTRAINT "VariantOption_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "VerificationCode" DROP CONSTRAINT "VerificationCode_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "_CategoryToProduct" DROP CONSTRAINT "_CategoryToProduct_AB_pkey",
DROP COLUMN "A",
ADD COLUMN     "A" UUID NOT NULL,
DROP COLUMN "B",
ADD COLUMN     "B" UUID NOT NULL,
ADD CONSTRAINT "_CategoryToProduct_AB_pkey" PRIMARY KEY ("A", "B");

-- AlterTable
ALTER TABLE "_PermissionToRole" DROP CONSTRAINT "_PermissionToRole_AB_pkey",
DROP COLUMN "A",
ADD COLUMN     "A" UUID NOT NULL,
DROP COLUMN "B",
ADD COLUMN     "B" UUID NOT NULL,
ADD CONSTRAINT "_PermissionToRole_AB_pkey" PRIMARY KEY ("A", "B");

-- AlterTable
ALTER TABLE "_SKUToVariantOption" DROP CONSTRAINT "_SKUToVariantOption_AB_pkey",
DROP COLUMN "A",
ADD COLUMN     "A" UUID NOT NULL,
DROP COLUMN "B",
ADD COLUMN     "B" UUID NOT NULL,
ADD CONSTRAINT "_SKUToVariantOption_AB_pkey" PRIMARY KEY ("A", "B");

-- CreateIndex
CREATE INDEX "_CategoryToProduct_B_index" ON "_CategoryToProduct"("B");

-- CreateIndex
CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");

-- CreateIndex
CREATE INDEX "_SKUToVariantOption_B_index" ON "_SKUToVariantOption"("B");

-- AddForeignKey
ALTER TABLE "Language" ADD CONSTRAINT "Language_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Language" ADD CONSTRAINT "Language_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Language" ADD CONSTRAINT "Language_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserTranslation" ADD CONSTRAINT "UserTranslation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserTranslation" ADD CONSTRAINT "UserTranslation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserTranslation" ADD CONSTRAINT "UserTranslation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserTranslation" ADD CONSTRAINT "UserTranslation_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "VariantOption" ADD CONSTRAINT "VariantOption_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "VariantOption" ADD CONSTRAINT "VariantOption_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "VariantOption" ADD CONSTRAINT "VariantOption_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "VariantOption" ADD CONSTRAINT "VariantOption_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SKU" ADD CONSTRAINT "SKU_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SKU" ADD CONSTRAINT "SKU_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SKU" ADD CONSTRAINT "SKU_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SKU" ADD CONSTRAINT "SKU_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BrandTranslation" ADD CONSTRAINT "BrandTranslation_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BrandTranslation" ADD CONSTRAINT "BrandTranslation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BrandTranslation" ADD CONSTRAINT "BrandTranslation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BrandTranslation" ADD CONSTRAINT "BrandTranslation_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductSKUSnapshot" ADD CONSTRAINT "ProductSKUSnapshot_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductSKUSnapshot" ADD CONSTRAINT "ProductSKUSnapshot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SKUToVariantOption" ADD CONSTRAINT "_SKUToVariantOption_A_fkey" FOREIGN KEY ("A") REFERENCES "SKU"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SKUToVariantOption" ADD CONSTRAINT "_SKUToVariantOption_B_fkey" FOREIGN KEY ("B") REFERENCES "VariantOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
