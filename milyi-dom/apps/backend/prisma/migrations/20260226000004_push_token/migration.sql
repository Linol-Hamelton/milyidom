-- AlterTable: Add pushToken field to User for mobile push notifications (Expo)
ALTER TABLE "User" ADD COLUMN "pushToken" TEXT;
CREATE UNIQUE INDEX "User_pushToken_key" ON "User"("pushToken");
