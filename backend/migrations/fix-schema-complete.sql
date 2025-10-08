-- ============================================================================
-- SCRIPT DE CORRECCIÓN COMPLETA DEL SCHEMA
-- Sistema de Asistencia Biométrico - Render.com Production
-- Fecha: 2025-10-08
-- ============================================================================
-- OBJETIVO: Agregar TODAS las columnas faltantes en producción sin romper datos existentes
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLA: users
-- Agregar columnas faltantes del modelo Sequelize
-- ============================================================================

-- Información personal extendida
ALTER TABLE users ADD COLUMN IF NOT EXISTS "defaultBranchId" BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "hireDate" DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "birthDate" DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dni VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cuil VARCHAR(15);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary NUMERIC(10, 2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_schedule JSONB DEFAULT '{}'::jsonb;

-- Seguridad y autenticación
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);

-- Permisos y configuración
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Sistema de autorización de llegadas tardías
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_authorize_late_arrivals BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS authorized_departments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preference_late_arrivals VARCHAR(20) DEFAULT 'email';

-- Control de acceso a kioscos y app móvil
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_use_mobile_app BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_use_kiosk BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_use_all_kiosks BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS authorized_kiosks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_flexible_schedule BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS flexible_schedule_notes TEXT;

-- Datos biométricos
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_fingerprint BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_facial_data BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_last_updated TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_enrolled BOOLEAN DEFAULT FALSE;

-- Geolocalización
ALTER TABLE users ADD COLUMN IF NOT EXISTS gps_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_locations JSONB DEFAULT '[]'::jsonb;

-- Performance y caching
ALTER TABLE users ADD COLUMN IF NOT EXISTS concurrent_sessions INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- Campos para vendors (vendedores)
ALTER TABLE users ADD COLUMN IF NOT EXISTS vendor_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepts_support_packages BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepts_auctions BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepts_email_notifications BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepts_whatsapp_notifications BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepts_sms_notifications BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS communication_consent_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS global_rating NUMERIC(3, 2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cbu VARCHAR(22);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;

-- Versioning para optimistic locking
ALTER TABLE users ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- ============================================================================
-- TABLA: departments
-- Agregar columnas del modelo que no existen en Render
-- ============================================================================

ALTER TABLE departments ADD COLUMN IF NOT EXISTS address VARCHAR(255);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS gps_lat NUMERIC(10, 8);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS gps_lng NUMERIC(11, 8);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS coverage_radius INTEGER DEFAULT 50;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Agregar índices para soft delete
CREATE INDEX IF NOT EXISTS idx_departments_deleted_at ON departments(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_name_company_active
  ON departments(name, company_id)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLA: attendances
-- Agregar columnas faltantes del modelo Sequelize
-- NOTA: Render ya tiene check_in, check_out (mantenemos ese schema)
-- ============================================================================

-- Campos del modelo que NO existen en Render
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS branch_id BIGINT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS break_out TIMESTAMP;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS break_in TIMESTAMP;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS origin_type VARCHAR(20) DEFAULT 'kiosk';
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS clock_in_ip INET;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS clock_out_ip INET;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS break_time INTEGER DEFAULT 0;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(5, 2) DEFAULT 0.00;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT FALSE;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS processing_queue INTEGER;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS work_date DATE;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS department_id BIGINT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS shift_id BIGINT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Campos de ubicación geográfica (GEOMETRY)
-- Nota: PostGIS debe estar habilitado
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS clock_in_location GEOMETRY(POINT, 4326);
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS clock_out_location GEOMETRY(POINT, 4326);

-- ============================================================================
-- TABLA: companies
-- Verificar que existan todas las columnas necesarias
-- ============================================================================

-- Campos que podrían faltar según el análisis
ALTER TABLE companies ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_number VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS timezone VARCHAR(255) DEFAULT 'America/Argentina/Buenos_Aires';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'es-AR';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ARS';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#0066CC';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#666666';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS license_type VARCHAR(50) DEFAULT 'basic';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_branches INTEGER DEFAULT 5;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS password_policy JSONB DEFAULT '{"minLength": 6}'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS two_factor_required BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS session_timeout INTEGER DEFAULT 480;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_config_update TIMESTAMP WITH TIME ZONE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users("employeeId");
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_biometric_flags ON users(has_fingerprint, has_facial_data);
CREATE INDEX IF NOT EXISTS idx_users_gps_enabled ON users(gps_enabled);
CREATE INDEX IF NOT EXISTS idx_users_vendor_code ON users(vendor_code) WHERE vendor_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_dni ON users(dni) WHERE dni IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_cuil ON users(cuil) WHERE cuil IS NOT NULL;

-- Índices GIN para JSONB
CREATE INDEX IF NOT EXISTS idx_users_permissions_gin ON users USING GIN(permissions);
CREATE INDEX IF NOT EXISTS idx_users_work_schedule_gin ON users USING GIN(work_schedule);
CREATE INDEX IF NOT EXISTS idx_users_settings_gin ON users USING GIN(settings);

-- Índices para attendances
CREATE INDEX IF NOT EXISTS idx_attendances_user_id ON attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_attendances_company_id ON attendances(company_id);
CREATE INDEX IF NOT EXISTS idx_attendances_kiosk_id ON attendances(kiosk_id);
CREATE INDEX IF NOT EXISTS idx_attendances_check_in ON attendances(check_in);
CREATE INDEX IF NOT EXISTS idx_attendances_check_out ON attendances(check_out);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(date);
CREATE INDEX IF NOT EXISTS idx_attendances_work_date ON attendances(work_date);
CREATE INDEX IF NOT EXISTS idx_attendances_status ON attendances(status);
CREATE INDEX IF NOT EXISTS idx_attendances_employee_id ON attendances(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendances_branch_id ON attendances(branch_id);
CREATE INDEX IF NOT EXISTS idx_attendances_department_id ON attendances(department_id);
CREATE INDEX IF NOT EXISTS idx_attendances_shift_id ON attendances(shift_id);
CREATE INDEX IF NOT EXISTS idx_attendances_is_processed ON attendances(is_processed);
CREATE INDEX IF NOT EXISTS idx_attendances_batch_id ON attendances(batch_id) WHERE batch_id IS NOT NULL;

-- Índices compuestos para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_attendances_user_date ON attendances(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendances_user_work_date ON attendances(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_attendances_company_date ON attendances(company_id, date);
CREATE INDEX IF NOT EXISTS idx_attendances_company_status ON attendances(company_id, status);

-- Índices espaciales (si PostGIS está habilitado)
-- CREATE INDEX IF NOT EXISTS idx_attendances_clock_in_location ON attendances USING GIST(clock_in_location);
-- CREATE INDEX IF NOT EXISTS idx_attendances_clock_out_location ON attendances USING GIST(clock_out_location);

-- Índices para departments
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);
CREATE INDEX IF NOT EXISTS idx_departments_gps ON departments(gps_lat, gps_lng) WHERE gps_lat IS NOT NULL AND gps_lng IS NOT NULL;

-- ============================================================================
-- CONSTRAINTS Y FOREIGN KEYS
-- ============================================================================

-- Foreign keys para users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_company_id_fkey') THEN
    ALTER TABLE users ADD CONSTRAINT users_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_department_id_fkey') THEN
    ALTER TABLE users ADD CONSTRAINT users_department_id_fkey
      FOREIGN KEY ("departmentId") REFERENCES departments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Foreign keys para attendances
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendances_user_id_fkey') THEN
    ALTER TABLE attendances ADD CONSTRAINT attendances_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendances_company_id_fkey') THEN
    ALTER TABLE attendances ADD CONSTRAINT attendances_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendances_approved_by_fkey') THEN
    ALTER TABLE attendances ADD CONSTRAINT attendances_approved_by_fkey
      FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendances_department_id_fkey') THEN
    ALTER TABLE attendances ADD CONSTRAINT attendances_department_id_fkey
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Foreign keys para departments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_company_id_fkey') THEN
    ALTER TABLE departments ADD CONSTRAINT departments_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_manager_id_fkey') THEN
    ALTER TABLE departments ADD CONSTRAINT departments_manager_id_fkey
      FOREIGN KEY (manager_id) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- VALIDACIONES Y CHECKS
-- ============================================================================

-- Validar coordenadas GPS en departments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_gps_lat_check') THEN
    ALTER TABLE departments ADD CONSTRAINT departments_gps_lat_check
      CHECK (gps_lat IS NULL OR (gps_lat >= -90 AND gps_lat <= 90));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_gps_lng_check') THEN
    ALTER TABLE departments ADD CONSTRAINT departments_gps_lng_check
      CHECK (gps_lng IS NULL OR (gps_lng >= -180 AND gps_lng <= 180));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_coverage_radius_check') THEN
    ALTER TABLE departments ADD CONSTRAINT departments_coverage_radius_check
      CHECK (coverage_radius >= 10 AND coverage_radius <= 1000);
  END IF;
END $$;

-- Validar datos de attendances
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendances_check_out_after_check_in') THEN
    ALTER TABLE attendances ADD CONSTRAINT attendances_check_out_after_check_in
      CHECK (check_out IS NULL OR check_out >= check_in);
  END IF;
END $$;

-- ============================================================================
-- ACTUALIZAR DATOS EXISTENTES (MIGRACIONES DE DATOS)
-- ============================================================================

-- Sincronizar work_date con date en attendances
UPDATE attendances SET work_date = date WHERE work_date IS NULL AND date IS NOT NULL;

-- Sincronizar employee_id desde users en attendances
UPDATE attendances a
SET employee_id = u."employeeId"
FROM users u
WHERE a.user_id = u.user_id
  AND a.employee_id IS NULL;

-- Establecer display_name en users
UPDATE users
SET display_name = TRIM("firstName" || ' ' || "lastName")
WHERE display_name IS NULL OR display_name = '';

-- Establecer valores por defecto en companies
UPDATE companies
SET
  timezone = COALESCE(timezone, 'America/Argentina/Buenos_Aires'),
  locale = COALESCE(locale, 'es-AR'),
  currency = COALESCE(currency, 'ARS'),
  session_timeout = COALESCE(session_timeout, 480),
  license_type = COALESCE(license_type, 'basic'),
  max_branches = COALESCE(max_branches, 5)
WHERE timezone IS NULL OR locale IS NULL OR currency IS NULL;

-- ============================================================================
-- COMENTARIOS EN COLUMNAS (DOCUMENTACIÓN)
-- ============================================================================

COMMENT ON COLUMN users.can_authorize_late_arrivals IS 'Indica si el usuario puede autorizar llegadas fuera de tolerancia';
COMMENT ON COLUMN users.authorized_departments IS 'Array de department_ids que este usuario puede autorizar';
COMMENT ON COLUMN users.notification_preference_late_arrivals IS 'Canal preferido para recibir notificaciones de autorización';
COMMENT ON COLUMN users.can_use_mobile_app IS 'Indica si el empleado puede usar app móvil para fichar';
COMMENT ON COLUMN users.can_use_kiosk IS 'Indica si el empleado puede usar kioscos físicos para fichar';
COMMENT ON COLUMN users.can_use_all_kiosks IS 'Si true, puede usar cualquier kiosko; si false, solo authorized_kiosks';
COMMENT ON COLUMN users.authorized_kiosks IS 'Array de kiosk IDs autorizados para este empleado';
COMMENT ON COLUMN users.has_flexible_schedule IS 'Si true, puede fichar a cualquier hora sin restricciones de turno';
COMMENT ON COLUMN users.flexible_schedule_notes IS 'Notas sobre horario flexible';

COMMENT ON COLUMN attendances.origin_type IS 'Origen del registro: kiosk, mobile_app, web, manual';
COMMENT ON COLUMN attendances.is_processed IS 'Flag para tracking de procesamiento de nómina';
COMMENT ON COLUMN attendances.batch_id IS 'UUID para operaciones batch';
COMMENT ON COLUMN attendances.work_date IS 'Fecha de trabajo calculada desde check_in';
COMMENT ON COLUMN attendances.break_time IS 'Tiempo de break en minutos';

COMMENT ON COLUMN departments.coverage_radius IS 'Radio de cobertura GPS en metros';
COMMENT ON COLUMN departments.gps_lat IS 'Latitud GPS del departamento';
COMMENT ON COLUMN departments.gps_lng IS 'Longitud GPS del departamento';

-- ============================================================================
-- FINALIZAR
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFICACIÓN POST-SCRIPT
-- ============================================================================

-- Verificar conteo de columnas por tabla
SELECT
  'users' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'users'

UNION ALL

SELECT
  'attendances' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'attendances'

UNION ALL

SELECT
  'departments' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'departments'

UNION ALL

SELECT
  'companies' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'companies';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
