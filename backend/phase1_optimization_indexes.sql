-- Phase 1 Optimization Indexes
-- Run this in your Supabase SQL Editor after deploying the code changes

-- 1. Index for optimized conversation listing (user_id + updated_at)
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated 
ON conversations (user_id, updated_at DESC);

-- 2. Index for message stats queries (conversation_id + created_at)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages (conversation_id, created_at DESC);

-- 3. Composite index for message loading with user verification
CREATE INDEX IF NOT EXISTS idx_messages_conversation_user_created
ON messages (conversation_id, created_at DESC) 
INCLUDE (id, role, content, model_used, status);

-- 4. Index for message content preview queries
CREATE INDEX IF NOT EXISTS idx_messages_content_preview
ON messages (conversation_id, created_at DESC, left(content, 100));

-- 5. Index to support conversation ownership checks
CREATE INDEX IF NOT EXISTS idx_conversations_id_user
ON conversations (id, user_id);

-- Analyze tables to update statistics for query planner
ANALYZE conversations;
ANALYZE messages; 