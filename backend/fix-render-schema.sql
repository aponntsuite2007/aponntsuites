-- SCRIPT SQL DIRECTO PARA ARREGLAR SCHEMA EN RENDER
-- Ejecutar manualmente en la consola SQL de Render

-- =====================================================
-- TABLA: attendances - Agregar columna status (CRÍTICO)
-- =====================================================

-- Verificar si la columna status existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendances' AND column_name = 'status'
    ) THEN
        -- Crear el tipo ENUM si no existe
        CREATE TYPE attendance_status_enum AS ENUM ('present', 'absent', 'late', 'early_leave', 'pending');

        -- Agregar columna status
        ALTER TABLE attendances
        ADD COLUMN status attendance_status_enum DEFAULT 'present';

        RAISE NOTICE 'Columna status agregada a attendances';
    ELSE
        RAISE NOTICE 'Columna status ya existe en attendances';
    END IF;
END $$;

-- =====================================================
-- TABLA: users - Agregar columnas faltantes
-- =====================================================

-- phone
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- departmentId
ALTER TABLE users ADD COLUMN IF NOT EXISTS "departmentId" BIGINT REFERENCES departments(id);

-- position
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100);

-- hireDate
ALTER TABLE users ADD COLUMN IF NOT EXISTS "hireDate" DATE;

-- Permisos de autorización
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_authorize_late_arrivals BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS authorized_departments JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preference_late_arrivals VARCHAR(20) DEFAULT 'email';

-- Permisos de dispositivos
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_use_mobile_app BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_use_kiosk BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_use_all_kiosks BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS authorized_kiosks JSONB DEFAULT '[]';

-- Horarios flexibles
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_flexible_schedule BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS flexible_schedule_notes TEXT;

-- Datos biométricos
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_fingerprint BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_facial_data BOOLEAN DEFAULT false;

-- Columnas adicionales detectadas en error 500 (defaultBranchId, etc.)
ALTER TABLE users ADD COLUMN IF NOT EXISTS "defaultBranchId" INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "birthDate" DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dni VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cuil VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary DECIMAL(12, 2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_schedule JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_last_updated TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gps_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_locations JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS concurrent_sessions INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vendor_code VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepts_support_packages BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepts_auctions BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepts_email_notifications BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepts_whatsapp_notifications BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepts_sms_notifications BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS communication_consent_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS global_rating DECIMAL(3, 2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cbu VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- =====================================================
-- TABLA: departments - Agregar columnas faltantes
-- =====================================================

-- description
ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- address
ALTER TABLE departments ADD COLUMN IF NOT EXISTS address VARCHAR(255) DEFAULT '';

-- gps_lat
ALTER TABLE departments ADD COLUMN IF NOT EXISTS gps_lat DECIMAL(10, 8);

-- gps_lng
ALTER TABLE departments ADD COLUMN IF NOT EXISTS gps_lng DECIMAL(11, 8);

-- coverage_radius
ALTER TABLE departments ADD COLUMN IF NOT EXISTS coverage_radius INTEGER DEFAULT 50;

-- deleted_at (para soft delete)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- manager_id (de la migración 20251007120001)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(user_id);

-- budget (de la migración 20251007120001)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS budget DECIMAL(12, 2);

-- =====================================================
-- TABLA: kiosks - Agregar columnas faltantes
-- =====================================================

-- description
ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS description TEXT;

-- device_id
ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);

-- gps_lat
ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS gps_lat DECIMAL(10, 8);

-- gps_lng
ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS gps_lng DECIMAL(11, 8);

-- is_configured
ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS is_configured BOOLEAN DEFAULT false;

-- =====================================================
-- TABLA: biometric_detections - Crear tabla completa
-- =====================================================

CREATE TABLE IF NOT EXISTS biometric_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL,
  employee_id UUID NOT NULL,
  employee_name VARCHAR(255) NOT NULL,

  -- Resultado de la detección
  similarity DECIMAL(5,3) NOT NULL,
  quality_score DECIMAL(5,3),

  -- ¿Se registró en attendances?
  was_registered BOOLEAN NOT NULL DEFAULT false,
  attendance_id BIGINT, -- Cambiado de UUID a BIGINT para coincidir con attendances.id

  -- Tipo de operación (si se registró)
  operation_type VARCHAR(20), -- 'clock_in', 'clock_out', null si no se registró

  -- Razón por la que no se registró (si aplica)
  skip_reason VARCHAR(100), -- 'recent_registration', 'cooldown', null

  -- Metadatos
  detection_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processing_time_ms INTEGER,
  kiosk_mode BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW()

  -- Nota: Foreign keys opcionales por compatibilidad
  -- CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(company_id),
  -- CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES users(user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_detections_company ON biometric_detections(company_id);
CREATE INDEX IF NOT EXISTS idx_detections_employee ON biometric_detections(employee_id);
CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON biometric_detections(detection_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_detections_registered ON biometric_detections(was_registered);
CREATE INDEX IF NOT EXISTS idx_detections_company_time ON biometric_detections(company_id, detection_timestamp);

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Ver columnas de attendances
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'attendances'
ORDER BY ordinal_position;

-- Ver columnas de users
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Ver columnas de departments
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'departments'
ORDER BY ordinal_position;

-- =====================================================
-- TABLA: employee_locations - Tracking GPS de empleados
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(user_id),
  company_id INTEGER NOT NULL,

  -- Coordenadas GPS
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy FLOAT,
  altitude FLOAT,
  heading FLOAT,
  speed FLOAT,

  -- Información contextual
  "isWorkingHours" BOOLEAN DEFAULT false,
  "isOnBreak" BOOLEAN DEFAULT false,
  "isInGeofence" BOOLEAN DEFAULT false,
  "currentActivity" VARCHAR(20) DEFAULT 'idle',

  -- Información del dispositivo
  "deviceId" VARCHAR(255),
  "appVersion" VARCHAR(50),
  "batteryLevel" INTEGER,
  "connectionType" VARCHAR(20) DEFAULT 'unknown',

  -- Información adicional
  address TEXT,
  "nearbyLandmarks" JSONB,
  "weatherConditions" JSONB,

  -- Privacidad
  "isPrivacyMode" BOOLEAN DEFAULT false,
  "sharingLevel" VARCHAR(30) DEFAULT 'full',

  -- Timestamps
  "reportedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Índices para employee_locations
CREATE INDEX IF NOT EXISTS idx_employee_locations_user ON employee_locations("userId");
CREATE INDEX IF NOT EXISTS idx_employee_locations_company ON employee_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_locations_reported ON employee_locations("reportedAt");
CREATE INDEX IF NOT EXISTS idx_employee_locations_working ON employee_locations("isWorkingHours");
CREATE INDEX IF NOT EXISTS idx_employee_locations_coords ON employee_locations(latitude, longitude);

-- =====================================================
-- TABLA: trainings - Capacitaciones
-- =====================================================

CREATE TABLE IF NOT EXISTS trainings (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,

  -- Información básica
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'video', 'pdf', 'external_link', 'scorm', etc.

  -- Contenido
  content_url TEXT,
  duration DECIMAL(5,2) DEFAULT 1, -- horas

  -- Fechas
  start_date DATE,
  deadline DATE,

  -- Instructor/Responsable
  instructor VARCHAR(255),

  -- Evaluación
  max_score INTEGER DEFAULT 100,
  min_score INTEGER DEFAULT 70,
  attempts INTEGER DEFAULT 2,

  -- Configuración
  mandatory BOOLEAN DEFAULT false,
  certificate BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active', -- 'draft', 'active', 'archived'

  -- Estadísticas
  participants INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para trainings
CREATE INDEX IF NOT EXISTS idx_trainings_company ON trainings(company_id);
CREATE INDEX IF NOT EXISTS idx_trainings_status ON trainings(status);
CREATE INDEX IF NOT EXISTS idx_trainings_category ON trainings(category);
CREATE INDEX IF NOT EXISTS idx_trainings_deadline ON trainings(deadline);

-- =====================================================
-- TABLA: training_assignments - Asignaciones de capacitaciones
-- =====================================================

CREATE TABLE IF NOT EXISTS training_assignments (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  training_id BIGINT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- Estado
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed', 'expired'

  -- Progreso
  progress_percentage INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,

  -- Fechas
  assigned_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  due_date DATE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(training_id, user_id)
);

-- Índices para training_assignments
CREATE INDEX IF NOT EXISTS idx_assignments_company ON training_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_assignments_training ON training_assignments(training_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON training_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON training_assignments(status);

-- =====================================================
-- TABLA: training_progress - Progreso detallado de capacitaciones
-- =====================================================

CREATE TABLE IF NOT EXISTS training_progress (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  assignment_id BIGINT NOT NULL REFERENCES training_assignments(id) ON DELETE CASCADE,

  -- Evaluación
  attempt_number INTEGER DEFAULT 1,
  score INTEGER,
  passed BOOLEAN DEFAULT false,

  -- Respuestas (si hay evaluación)
  answers JSONB,

  -- Certificado
  certificate_url TEXT,
  certificate_issued_at TIMESTAMP,

  -- Feedback
  instructor_feedback TEXT,
  student_feedback TEXT,

  -- Timestamps
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para training_progress
CREATE INDEX IF NOT EXISTS idx_progress_company ON training_progress(company_id);
CREATE INDEX IF NOT EXISTS idx_progress_assignment ON training_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_progress_passed ON training_progress(passed);

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '✅ Schema corregido - Todas las columnas y tablas agregadas (employee_locations, trainings, training_assignments, training_progress)';
END $$;
