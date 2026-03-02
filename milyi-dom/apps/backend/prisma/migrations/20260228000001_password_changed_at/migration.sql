-- Migration: add passwordChangedAt to User
-- Used to invalidate password-reset JWT tokens after successful reset

ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
