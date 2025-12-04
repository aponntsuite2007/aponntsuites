-- ============================================================================
-- MIGRACIÓN: Sistema de Sectores (Subdivisiones de Departamentos)
-- ============================================================================
-- Fecha: 2025-12-01
-- Descripción: Crea la tabla sectors para subdividir departamentos
-- Multi-tenant: Incluye company_id
-- ============================================================================

-- ============================================================================
-- 1. TABLA: sectors
-- Subdivisiones de departamentos
-- ============================================================================
CREATE TABLE IF NOT EXISTS sectors (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,

    -- Información básica
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    description TEXT,

    -- Supervisor del sector
    supervisor_id UUID REFERENCES users(user_id),

    -- Ubicación (hereda del departamento pero puede tener específica)
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(11, 8),
    coverage_radius INTEGER DEFAULT 50,

    -- Configuración
    max_employees INTEGER,
    is_active BOOLEAN DEFAULT true,

    -- Orden de visualización
    display_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sectors_company ON sectors(company_id);
CREATE INDEX IF NOT EXISTS idx_sectors_department ON sectors(department_id);
CREATE INDEX IF NOT EXISTS idx_sectors_supervisor ON sectors(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_sectors_active ON sectors(company_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sectors_name_dept ON sectors(department_id, name) WHERE is_active = true;

COMMENT ON TABLE sectors IS 'Sectores - Subdivisiones de departamentos';
COMMENT ON COLUMN sectors.department_id IS 'Departamento al que pertenece';
COMMENT ON COLUMN sectors.supervisor_id IS 'Supervisor/Encargado del sector';
COMMENT ON COLUMN sectors.max_employees IS 'Capacidad máxima de empleados (null = sin límite)';

-- ============================================================================
-- 2. AGREGAR COLUMNA sector_id A USERS
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS sector_id INTEGER REFERENCES sectors(id);
CREATE INDEX IF NOT EXISTS idx_users_sector ON users(sector_id);

COMMENT ON COLUMN users.sector_id IS 'Sector asignado al empleado (subdivisión del departamento)';

-- ============================================================================
-- 3. AGREGAR COLUMNA position_id A USERS (para cargo)
-- ============================================================================
-- Nota: Las categorías salariales ya existen en salary_categories_v2
-- Agregamos referencia directa para facilitar consultas
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary_category_id INTEGER REFERENCES salary_categories_v2(category_id);
CREATE INDEX IF NOT EXISTS idx_users_salary_category ON users(salary_category_id);

COMMENT ON COLUMN users.salary_category_id IS 'Categoría salarial asignada (del convenio colectivo)';

-- ============================================================================
-- 4. TRIGGER: Actualizar updated_at automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION update_sectors_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sectors_timestamp ON sectors;
CREATE TRIGGER update_sectors_timestamp
    BEFORE UPDATE ON sectors
    FOR EACH ROW EXECUTE FUNCTION update_sectors_timestamp();

-- ============================================================================
-- 5. VISTA: Estructura organizacional completa
-- ============================================================================
CREATE OR REPLACE VIEW v_organizational_structure AS
SELECT
    u.user_id,
    u.first_name || ' ' || u.last_name AS employee_name,
    u.email,
    c.id AS company_id,
    c.name AS company_name,
    d.id AS department_id,
    d.name AS department_name,
    s.id AS sector_id,
    s.name AS sector_name,
    sc.category_id,
    sc.category_code,
    sc.category_name,
    sc.base_salary,
    sc.hourly_rate,
    la.id AS agreement_id,
    la.code AS agreement_code,
    la.name AS agreement_name,
    sh.id AS shift_id,
    sh.name AS shift_name,
    u.additional_roles
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN sectors s ON u.sector_id = s.id
LEFT JOIN salary_categories_v2 sc ON u.salary_category_id = sc.category_id
LEFT JOIN labor_agreements_v2 la ON sc.agreement_id = la.id
LEFT JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = true
LEFT JOIN shifts sh ON usa.shift_id = sh.id
WHERE u.is_active = true;

COMMENT ON VIEW v_organizational_structure IS 'Vista de estructura organizacional completa por empleado';

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
