-- Migration: Add MCP tools support to conversations table
-- Run this in your Supabase SQL editor

-- Add tool configuration columns to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS tools_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS enabled_tools JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN conversations.tools_enabled IS 'Whether MCP tools are enabled for this conversation';
COMMENT ON COLUMN conversations.enabled_tools IS 'Array of enabled MCP tool names (e.g., ["supabase", "filesystem"])';

-- Create an index on tools_enabled for efficient filtering
CREATE INDEX IF NOT EXISTS idx_conversations_tools_enabled ON conversations(tools_enabled) WHERE tools_enabled = TRUE; 