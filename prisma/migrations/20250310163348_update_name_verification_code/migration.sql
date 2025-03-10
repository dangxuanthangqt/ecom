/*
  Warnings:

  - Changed the type of `type` on the `VerificationCode` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "VerificationCodeType" AS ENUM ('REGISTER', 'FORGOT_PASSWORD');

-- AlterTable
ALTER TABLE "VerificationCode" DROP COLUMN "type",
ADD COLUMN     "type" "VerificationCodeType" NOT NULL;

-- DropEnum
DROP TYPE "RegistrationCodeType";

-- CreateIndex
CREATE INDEX "VerificationCode_email_code_type_idx" ON "VerificationCode"("email", "code", "type");
