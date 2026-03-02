-- AlterTable: add email notification preference fields to User
ALTER TABLE "User"
  ADD COLUMN "notifEmailBookings"      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifEmailMessages"      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifEmailSavedSearches" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifEmailMarketing"     BOOLEAN NOT NULL DEFAULT false;
