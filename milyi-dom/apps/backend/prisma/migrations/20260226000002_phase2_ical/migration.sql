-- Phase 2: iCal sync support

-- Add iCal fields to Listing
ALTER TABLE "Listing"
  ADD COLUMN IF NOT EXISTS "icalToken" TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS "icalSyncUrls" TEXT[] NOT NULL DEFAULT '{}';

-- Set icalToken where null (existing rows)
UPDATE "Listing" SET "icalToken" = gen_random_uuid()::text WHERE "icalToken" IS NULL;

-- BlockedDate model for iCal sync and manual blocks
CREATE TABLE IF NOT EXISTS "BlockedDate" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "listingId" TEXT NOT NULL,
  "date"      DATE NOT NULL,
  "source"    TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlockedDate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BlockedDate_listingId_date_key" UNIQUE ("listingId", "date"),
  CONSTRAINT "BlockedDate_listingId_fkey" FOREIGN KEY ("listingId")
    REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "BlockedDate_listingId_date_idx" ON "BlockedDate"("listingId", "date");
