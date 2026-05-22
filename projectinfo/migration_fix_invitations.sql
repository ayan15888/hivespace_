-- ============================================================
-- Migration: Align 'invitations' table with newSchema.sql
-- Run this ONCE against your live Supabase/PostgreSQL DB.
-- ============================================================

-- 1. Drop the legacy NOT NULL columns that no longer exist in the model
--    (code was a duplicate of token; recipient_username is unused)
ALTER TABLE invitations
    DROP COLUMN IF EXISTS code,
    DROP COLUMN IF EXISTS recipient_username;

-- 2. If team_id was NOT NULL in old schema but is nullable in the new model, relax it
ALTER TABLE invitations
    ALTER COLUMN team_id DROP NOT NULL;

-- Done. The table now matches newSchema.sql lines 115-130.
