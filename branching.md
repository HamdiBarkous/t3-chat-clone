# Conversation Branching Implementation Plan

## Overview
Enable users to click on any AI message and create a new conversation branch from that point, copying all messages up to the selected message and associated documents.

## Step 1: Database-Level Message & Document Copying
- Create a new `POST /conversations/{conversation_id}/branch` endpoint that accepts a `message_id` parameter
- When called, this endpoint will:
  - Create a new conversation with the same `current_model` and `system_prompt` as the original
  - Copy all messages from the original conversation up to and including the selected message
  - Copy all documents attached to the copied messages to maintain full context
  - Use batch operations for efficient database operations
- The copying logic will preserve message order, timestamps (but generate new IDs), and maintain document relationships

## Step 2: Frontend Integration
- Add a "Branch from here" action to AI messages in the chat interface
- When clicked, call the new branching endpoint and redirect user to the new conversation
- Display a visual indicator showing the conversation was branched (e.g., "Branched from [original conversation title]")
- Ensure the new conversation appears in the conversation list immediately

## Technical Notes
- Use existing `create_message_batch` method for efficient message copying
- Leverage document service's existing copy mechanisms for document duplication
- New conversation inherits the original's model and system prompt settings
- All operations happen in a single transaction to ensure data consistency 