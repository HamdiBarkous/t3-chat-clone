-- Migration: Remove MCP tools from conversations table
-- Run this in your Supabase SQL editor to clean up

-- Drop the index first
DROP INDEX IF EXISTS idx_conversations_tools_enabled;

-- Remove tool columns from conversations table
ALTER TABLE conversations 
DROP COLUMN IF EXISTS tools_enabled,
DROP COLUMN IF EXISTS enabled_tools; 