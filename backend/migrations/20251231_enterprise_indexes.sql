-- ═══════════════════════════════════════════════════════════════════════════
-- ENTERPRISE INDEXES FOR 100k+ CONCURRENT USERS
-- ═══════════════════════════════════════════════════════════════════════════
-- Date: 2025-12-31
-- Purpose: Optimize critical queries for enterprise scale
-- NOTE: Running without transaction because CONCURRENTLY requires it
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. AUTH/LOGIN INDEXES (Critical: 100-200ms → <50ms)
-- ═══════════════════════════════════════════════════════════════════════════

-- Index for username lookup (most common login method)
CREATE INDEX IF NOT EXISTS idx_users_usuario_active
  ON users(usuario) WHERE is_active = true;

-- Index for DNI lookup (secondary login method)
CREATE INDEX IF NOT EXISTS idx_users_dni_active
  ON users(dni) WHERE is_active = true;

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_users_email_active
  ON users(email) WHERE is_active = true AND email IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. COMPANY MODULES INDEXES (Critical: N+1 elimination)
-- ═══════════════════════════════════════════════════════════════════════════

-- Composite index for active modules per company (most common query)
CREATE INDEX IF NOT EXISTS idx_company_modules_active
  ON company_modules(company_id, system_module_id)
  WHERE activo = true;

-- Index for system_module joins
CREATE INDEX IF NOT EXISTS idx_company_modules_system_module
  ON company_modules(system_module_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ATTENDANCE INDEXES (Critical: Bulk operations)
-- ═══════════════════════════════════════════════════════════════════════════

-- Index for user attendance lookup (most common attendance query)
CREATE INDEX IF NOT EXISTS idx_attendances_user_date
  ON attendances("UserId", DATE("checkInTime"))
  WHERE "checkInTime" IS NOT NULL;

-- Index for company attendance reports
CREATE INDEX IF NOT EXISTS idx_attendances_company_date
  ON attendances(company_id, DATE("checkInTime"))
  WHERE "checkInTime" IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. USERS TABLE INDEXES (Critical: User search)
-- ═══════════════════════════════════════════════════════════════════════════

-- Index for company users listing (most common users query)
CREATE INDEX IF NOT EXISTS idx_users_company_active
  ON users(company_id, is_active)
  WHERE is_active = true;

-- Index for employee ID lookup
CREATE INDEX IF NOT EXISTS idx_users_employee_id
  ON users("employeeId")
  WHERE "employeeId" IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. FULL-TEXT SEARCH FOR USERS (Critical: Search performance)
-- ═══════════════════════════════════════════════════════════════════════════

-- Add search_vector column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE users ADD COLUMN search_vector tsvector;
  END IF;
END $$;

-- Update search vectors for existing data (only if null)
UPDATE users SET search_vector =
  to_tsvector('spanish', coalesce("firstName",'') || ' ' ||
              coalesce("lastName",'') || ' ' ||
              coalesce("employeeId",'') || ' ' ||
              coalesce(dni,'') || ' ' ||
              coalesce(email,''))
WHERE search_vector IS NULL;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_users_fts
  ON users USING gin(search_vector);

-- Create trigger to auto-update search_vector
CREATE OR REPLACE FUNCTION users_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('spanish', coalesce(NEW."firstName",'') || ' ' ||
                coalesce(NEW."lastName",'') || ' ' ||
                coalesce(NEW."employeeId",'') || ' ' ||
                coalesce(NEW.dni,'') || ' ' ||
                coalesce(NEW.email,''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_search_vector ON users;
CREATE TRIGGER trg_users_search_vector
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION users_search_vector_update();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. SYSTEM MODULES INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- Index for active system modules (cached in RedisCacheService)
CREATE INDEX IF NOT EXISTS idx_system_modules_active
  ON system_modules(is_active, available_in)
  WHERE is_active = true;

-- Index for module key lookup
CREATE INDEX IF NOT EXISTS idx_system_modules_key
  ON system_modules(module_key);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. DEPARTMENTS & SHIFTS INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- Index for company departments
CREATE INDEX IF NOT EXISTS idx_departments_company
  ON departments(company_id)
  WHERE is_active = true;

-- Index for company shifts
CREATE INDEX IF NOT EXISTS idx_shifts_company
  ON shifts(company_id)
  WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. ANALYZE TABLES (Update statistics for query planner)
-- ═══════════════════════════════════════════════════════════════════════════

ANALYZE users;
ANALYZE attendances;
ANALYZE company_modules;
ANALYZE system_modules;
ANALYZE departments;
ANALYZE shifts;
ANALYZE companies;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION: Check created indexes
-- ═══════════════════════════════════════════════════════════════════════════
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND (indexname LIKE 'idx_users_%'
       OR indexname LIKE 'idx_company_modules_%'
       OR indexname LIKE 'idx_attendances_%'
       OR indexname LIKE 'idx_system_modules_%'
       OR indexname LIKE 'idx_departments_%'
       OR indexname LIKE 'idx_shifts_%')
ORDER BY tablename, indexname;
