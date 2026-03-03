-- Fix currency defaults from USD to RUB
ALTER TABLE "Listing" ALTER COLUMN "currency" SET DEFAULT 'RUB';
ALTER TABLE "Booking" ALTER COLUMN "currency" SET DEFAULT 'RUB';
ALTER TABLE "Payment" ALTER COLUMN "currency" SET DEFAULT 'RUB';

-- Update existing rows
UPDATE "Listing" SET currency = 'RUB' WHERE currency = 'USD';
UPDATE "Booking" SET currency = 'RUB' WHERE currency = 'USD';
UPDATE "Payment" SET currency = 'RUB' WHERE currency = 'USD';

-- Add YooKassa payout fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "yookassaPayoutId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payoutPhone" TEXT;
