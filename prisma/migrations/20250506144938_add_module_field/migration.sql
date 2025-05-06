/*
  Warnings:

  - Added the required column `module` to the `Permission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "module" VARCHAR(500) NOT NULL;
