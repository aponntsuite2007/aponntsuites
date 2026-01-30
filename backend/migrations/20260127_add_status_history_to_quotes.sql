-- Migration: Add status_history JSONB column to quotes table
-- Date: 2026-01-27
-- Purpose: Track all status changes with audit trail (who, when, reason)

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]';

-- Comment
COMMENT ON COLUMN quotes.status_history IS 'Array of status changes: [{from, to, changed_by, changed_at, reason}]';
