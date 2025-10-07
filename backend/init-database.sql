-- Script de inicialización de base de datos PostgreSQL
-- Sistema de Asistencia Biométrico

-- Tabla Companies (usando company_id como PK para coincidir con el modelo)
CREATE TABLE IF NOT EXISTS companies (
  company_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  legal_name VARCHAR(255),
  description TEXT,

  -- Contact
  email VARCHAR(255),
  fallback_notification_email VARCHAR(255),
  fallback_notification_whatsapp VARCHAR(20),
  phone VARCHAR(50),
  contact_phone VARCHAR(50),
  address TEXT,
  city VARCHAR(255),
  state VARCHAR(255),
  country VARCHAR(255) DEFAULT 'Argentina' NOT NULL,
  website VARCHAR(255),

  -- Legal
  tax_id VARCHAR(255),
  registration_number VARCHAR(255),

  -- System Config
  timezone VARCHAR(255) DEFAULT 'America/Argentina/Buenos_Aires' NOT NULL,
  locale VARCHAR(10) DEFAULT 'es-AR' NOT NULL,
  currency VARCHAR(3) DEFAULT 'ARS' NOT NULL,

  -- Branding
  logo TEXT,
  primary_color VARCHAR(7) DEFAULT '#0066CC',
  secondary_color VARCHAR(7) DEFAULT '#666666',

  -- Subscription
  license_type VARCHAR(50) DEFAULT 'basic' NOT NULL,
  subscription_type VARCHAR(20) DEFAULT 'basic' NOT NULL,
  max_employees INTEGER DEFAULT 50 NOT NULL,
  contracted_employees INTEGER DEFAULT 1 NOT NULL,
  max_branches INTEGER DEFAULT 5,

  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  is_trial BOOLEAN DEFAULT false NOT NULL,
  trial_ends_at TIMESTAMP,
  subscription_expires_at TIMESTAMP,

  -- Features & Modules
  active_modules JSONB DEFAULT '{"biometric":true,"attendance":true,"medical":false,"reports":true,"departments":true,"gpsTracking":false}'::jsonb,
  features JSONB DEFAULT '{}'::jsonb,
  modules_pricing JSONB DEFAULT '{}'::jsonb,
  pricing_info JSONB DEFAULT '{}'::jsonb,

  -- Security
  password_policy JSONB DEFAULT '{"minLength":6,"requireUppercase":false,"requireLowercase":false,"requireNumbers":false,"requireSymbols":false,"maxAge":null}'::jsonb,
  two_factor_required BOOLEAN DEFAULT false NOT NULL,
  session_timeout INTEGER DEFAULT 480 NOT NULL,

  -- Config
  settings JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Admin
  created_by INTEGER,
  last_config_update TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT companies_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS companies_tax_id_idx ON companies(tax_id);
CREATE INDEX IF NOT EXISTS companies_is_active_idx ON companies(is_active);
CREATE INDEX IF NOT EXISTS companies_status_idx ON companies(status);
CREATE INDEX IF NOT EXISTS companies_license_type_idx ON companies(license_type);

-- Tabla SystemModules
CREATE TABLE IF NOT EXISTS system_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  color VARCHAR(7),
  category VARCHAR(20) DEFAULT 'core' NOT NULL,
  base_price DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_core BOOLEAN DEFAULT false NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  requirements JSONB DEFAULT '[]'::jsonb,
  version VARCHAR(20) DEFAULT '1.0.0' NOT NULL,
  min_employees INTEGER,
  max_employees INTEGER,
  rubro VARCHAR(100) DEFAULT 'General' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  CONSTRAINT system_modules_module_key_unique UNIQUE (module_key)
);

CREATE INDEX IF NOT EXISTS system_modules_category_idx ON system_modules(category);
CREATE INDEX IF NOT EXISTS system_modules_is_active_idx ON system_modules(is_active);
CREATE INDEX IF NOT EXISTS system_modules_is_core_idx ON system_modules(is_core);
CREATE INDEX IF NOT EXISTS system_modules_display_order_idx ON system_modules(display_order);

-- Tabla CompanyModules (relación many-to-many entre companies y system_modules)
CREATE TABLE IF NOT EXISTS company_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  system_module_id UUID NOT NULL REFERENCES system_modules(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  contracted_price DECIMAL(10, 2) NOT NULL,
  employee_tier VARCHAR(20),
  contracted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  suspended_at TIMESTAMP,
  suspended_reason TEXT,
  last_billed_at TIMESTAMP,
  next_billing_at TIMESTAMP,
  usage_stats JSONB DEFAULT '{}'::jsonb,
  configuration JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  CONSTRAINT company_modules_unique UNIQUE (company_id, system_module_id)
);

CREATE INDEX IF NOT EXISTS company_modules_company_id_idx ON company_modules(company_id);
CREATE INDEX IF NOT EXISTS company_modules_system_module_id_idx ON company_modules(system_module_id);
CREATE INDEX IF NOT EXISTS company_modules_is_active_idx ON company_modules(is_active);

-- Tabla Users (usando user_id como PK UUID)
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" VARCHAR(50) NOT NULL,
  legajo VARCHAR(50),
  usuario VARCHAR(50) NOT NULL,
  "firstName" VARCHAR(100) NOT NULL,
  "lastName" VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'employee' NOT NULL,
  company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
  "departmentId" INTEGER,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  CONSTRAINT users_employeeId_unique UNIQUE ("employeeId"),
  CONSTRAINT users_usuario_unique UNIQUE (usuario),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS users_company_id_idx ON users(company_id);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_is_active_idx ON users(is_active);

-- Tabla Departments
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS departments_company_id_idx ON departments(company_id);

-- Tabla Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS shifts_company_id_idx ON shifts(company_id);

-- Tabla Kiosks
CREATE TABLE IF NOT EXISTS kiosks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS kiosks_company_id_idx ON kiosks(company_id);

-- Tabla Attendance
CREATE TABLE IF NOT EXISTS attendances (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
  kiosk_id INTEGER REFERENCES kiosks(id),
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS attendances_user_id_idx ON attendances(user_id);
CREATE INDEX IF NOT EXISTS attendances_company_id_idx ON attendances(company_id);
CREATE INDEX IF NOT EXISTS attendances_kiosk_id_idx ON attendances(kiosk_id);
CREATE INDEX IF NOT EXISTS attendances_check_in_idx ON attendances(check_in);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_modules_updated_at BEFORE UPDATE ON system_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_modules_updated_at BEFORE UPDATE ON company_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kiosks_updated_at BEFORE UPDATE ON kiosks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendances_updated_at BEFORE UPDATE ON attendances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
