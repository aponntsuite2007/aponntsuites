-- Fix: Cambiar default_branch_id de BIGINT a UUID
-- Razón: branches.id es UUID, no puede ser FK de BIGINT

BEGIN;

-- Drop foreign key constraint if exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_default_branch_id_fkey;

-- Change column type from BIGINT to UUID
ALTER TABLE users ALTER COLUMN default_branch_id TYPE UUID USING default_branch_id::text::uuid;

-- Re-add foreign key constraint
ALTER TABLE users ADD CONSTRAINT users_default_branch_id_fkey 
  FOREIGN KEY (default_branch_id) REFERENCES branches(id) ON DELETE SET NULL;

COMMIT;
