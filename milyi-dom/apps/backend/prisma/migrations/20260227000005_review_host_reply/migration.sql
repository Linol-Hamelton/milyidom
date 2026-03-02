-- AlterTable: add host reply and admin moderation fields to Review
ALTER TABLE "Review"
  ADD COLUMN "hostReply"     TEXT,
  ADD COLUMN "hostRepliedAt" TIMESTAMP(3),
  ADD COLUMN "isHidden"      BOOLEAN NOT NULL DEFAULT false;
