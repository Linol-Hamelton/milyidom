-- AlterTable: Add blockedAt field to User for admin soft-blocking
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "blockedAt" TIMESTAMP(3);

-- CreateEnum: AuditAction (was in schema.prisma but never migrated)
DO $$ BEGIN
  CREATE TYPE "public"."AuditAction" AS ENUM (
    'USER_LOGIN',
    'USER_LOGOUT',
    'USER_REGISTER',
    'PASSWORD_RESET_REQUEST',
    'PASSWORD_RESET_COMPLETE',
    'PASSWORD_CHANGE',
    'TOKEN_REFRESH',
    'BOOKING_CREATE',
    'BOOKING_CANCEL',
    'BOOKING_STATUS_CHANGE',
    'PAYMENT_INTENT_CREATE',
    'PAYMENT_SUCCEED',
    'PAYMENT_FAIL',
    'LISTING_CREATE',
    'LISTING_UPDATE',
    'LISTING_DELETE',
    'LISTING_PUBLISH',
    'LISTING_UNPUBLISH',
    'ADMIN_USER_ROLE_CHANGE',
    'ADMIN_USER_BLOCK',
    'ADMIN_BOOKING_OVERRIDE',
    'ADMIN_LISTING_MODERATE'
  );
EXCEPTION WHEN duplicate_object THEN
  -- enum already exists, add missing values
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_USER_BLOCK';
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_LISTING_MODERATE';
END $$;

-- CreateTable: AuditLog (was in schema.prisma but never migrated)
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "userRole" TEXT,
    "action" "public"."AuditAction" NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");
