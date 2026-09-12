-- CreateIndex
CREATE INDEX "Order_userId_deletedAt_idx" ON "Order"("userId", "deletedAt");
