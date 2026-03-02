-- AlterTable: Add Stripe Connect account ID to User
ALTER TABLE "User" ADD COLUMN "stripeConnectId" TEXT;
CREATE UNIQUE INDEX "User_stripeConnectId_key" ON "User"("stripeConnectId");
