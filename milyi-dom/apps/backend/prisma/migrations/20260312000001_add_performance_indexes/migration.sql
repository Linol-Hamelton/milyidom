-- Performance indexes — Sprint 15 (BE-1)
-- All use IF NOT EXISTS so the migration is idempotent

-- User: admin/host filtering, sorting, superhost query
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "User_isVerified_idx" ON "User"("isVerified");
CREATE INDEX IF NOT EXISTS "User_isSuperhost_idx" ON "User"("isSuperhost");

-- Payment: status filter, history sort
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");
CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx" ON "Payment"("createdAt");

-- PropertyImage: primary photo lookup
CREATE INDEX IF NOT EXISTS "PropertyImage_listingId_isPrimary_idx" ON "PropertyImage"("listingId", "isPrimary");

-- Message: conversation sort, unread count
CREATE INDEX IF NOT EXISTS "Message_conversationId_sentAt_idx" ON "Message"("conversationId", "sentAt");
CREATE INDEX IF NOT EXISTS "Message_recipientId_readAt_idx" ON "Message"("recipientId", "readAt");

-- Review: featured reviews, moderation + public screen
CREATE INDEX IF NOT EXISTS "Review_isFeatured_idx" ON "Review"("isFeatured");
CREATE INDEX IF NOT EXISTS "Review_listingId_isHidden_idx" ON "Review"("listingId", "isHidden");
