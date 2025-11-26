/**
 * ============================================================================
 * MIGRACIÓN: AGREGAR CAMPOS STAFF A TABLA USERS - Multi-País
 * ============================================================================
 *
 * Descripción:
 * - Agrega campos para gestionar staff de Aponnt en tabla users existente
 * - Soporta multi-país: cada usuario staff tiene country asignado
 * - Jerarquía: campo reports_to_user_id auto-referencia para organigramas
 * - Separación lógica: is_aponnt_staff = true vs usuarios de empresas clientes
 * - i18n: language_preference para interface de cada usuario
 *
 * IMPORTANTE:
 * - Los usuarios de empresas clientes tienen company_id NOT NULL
 * - El staff de Aponnt tiene is_aponnt_staff = true y company_id NULL
 *
 * Autor: Claude Code
 * Fecha: 2025-01-21
 */

-- ==================== ALTER TABLE users ====================

-- 1. Campos de identificación de staff
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_aponnt_staff BOOLEAN DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS aponnt_staff_role_id UUID REFERENCES aponnt_staff_roles(role_id) ON DELETE SET NULL;

-- 2. Jerarquía organizacional (auto-referencia)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS reports_to_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL;

-- 3. Clasificación organizacional
ALTER TABLE users
ADD COLUMN IF NOT EXISTS staff_level INTEGER;  -- 0 (CEO), 1 (Gerentes), 2 (Jefes), 3 (Coordinadores), 4 (Operativos)

ALTER TABLE users
ADD COLUMN IF NOT EXISTS staff_area VARCHAR(50);  -- 'ventas', 'admin', 'desarrollo', 'externo'

-- 4. Ubicación geográfica y nacionalidad (CRÍTICO para multi-país)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS country VARCHAR(2);  -- Código ISO 3166-1 alpha-2: 'AR', 'BR', 'CL', 'MX', 'US', 'ES'

ALTER TABLE users
ADD COLUMN IF NOT EXISTS nationality VARCHAR(2);  -- Código ISO 3166-1 alpha-2 (nacionalidad del empleado)

-- 5. Preferencias de idioma (i18n)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS language_preference VARCHAR(2) DEFAULT 'es';  -- 'es', 'en', 'pt', 'fr', 'de', 'it'

-- 6. Tipo de contrato
ALTER TABLE users
ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20);  -- 'interno', 'externo', 'freelance'

-- 7. Fecha de contratación
ALTER TABLE users
ADD COLUMN IF NOT EXISTS hire_date DATE;

-- ==================== ÍNDICES PARA OPTIMIZAR QUERIES ====================

-- Staff de Aponnt
CREATE INDEX IF NOT EXISTS idx_users_is_aponnt_staff ON users(is_aponnt_staff) WHERE is_aponnt_staff = true;

-- Por rol de staff
CREATE INDEX IF NOT EXISTS idx_users_aponnt_staff_role ON users(aponnt_staff_role_id) WHERE aponnt_staff_role_id IS NOT NULL;

-- Por jerarquía
CREATE INDEX IF NOT EXISTS idx_users_reports_to ON users(reports_to_user_id) WHERE reports_to_user_id IS NOT NULL;

-- Por país (CRÍTICO para filtrar organigramas por país)
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country) WHERE country IS NOT NULL;

-- Por área y país (para filtrar ventas por país)
CREATE INDEX IF NOT EXISTS idx_users_staff_area_country ON users(staff_area, country) WHERE is_aponnt_staff = true;

-- Por nivel jerárquico
CREATE INDEX IF NOT EXISTS idx_users_staff_level ON users(staff_level) WHERE staff_level IS NOT NULL;

-- ==================== MIGRAR VENDEDORES EXISTENTES ====================

-- Convertir usuarios con accepts_support_packages = true en staff de Aponnt
UPDATE users
SET
  is_aponnt_staff = true,
  staff_area = 'ventas',
  staff_level = 4,  -- Nivel operativo (vendedores)
  country = COALESCE(country, 'AR'),  -- Default Argentina si no tiene país
  nationality = COALESCE(nationality, 'AR'),
  language_preference = COALESCE(language_preference, 'es'),
  contract_type = 'interno',
  hire_date = COALESCE(hire_date, "createdAt"::date)  -- Sequelize usa camelCase
WHERE accepts_support_packages = true
  AND is_aponnt_staff IS NOT TRUE;  -- Solo si no fue migrado antes

-- ==================== COMENTARIOS Y CONSTRAINTS ====================

-- Agregar comentarios a las columnas para documentación
COMMENT ON COLUMN users.is_aponnt_staff IS 'TRUE si es empleado/staff de Aponnt, FALSE si es usuario de empresa cliente';
COMMENT ON COLUMN users.aponnt_staff_role_id IS 'FK a aponnt_staff_roles. Define el rol organizacional del staff (GG, GR, VEND, etc.)';
COMMENT ON COLUMN users.reports_to_user_id IS 'FK auto-referencia. Define a quién reporta este usuario en la jerarquía organizacional';
COMMENT ON COLUMN users.staff_level IS 'Nivel jerárquico: 0=CEO, 1=Gerentes, 2=Jefes, 3=Coordinadores, 4=Operativos';
COMMENT ON COLUMN users.staff_area IS 'Área organizacional: ventas, admin, desarrollo, externo';
COMMENT ON COLUMN users.country IS 'País asignado (código ISO-2). Para staff de ventas, define a qué país pertenece';
COMMENT ON COLUMN users.nationality IS 'Nacionalidad del empleado (código ISO-2)';
COMMENT ON COLUMN users.language_preference IS 'Idioma preferido para la interface: es, en, pt, fr, de, it';
COMMENT ON COLUMN users.contract_type IS 'Tipo de contrato: interno, externo, freelance';
COMMENT ON COLUMN users.hire_date IS 'Fecha de contratación en Aponnt';

-- ==================== QUERIES DE EJEMPLO ====================

-- Obtener todos los vendedores de Argentina:
-- SELECT * FROM users
-- WHERE is_aponnt_staff = true
--   AND staff_area = 'ventas'
--   AND country = 'AR';

-- Obtener organigrama de ventas de Brasil:
-- SELECT u1.*, u2.firstName as reports_to_name, r.role_name
-- FROM users u1
-- LEFT JOIN users u2 ON u1.reports_to_user_id = u2.user_id
-- LEFT JOIN aponnt_staff_roles r ON u1.aponnt_staff_role_id = r.role_id
-- WHERE u1.is_aponnt_staff = true
--   AND u1.staff_area = 'ventas'
--   AND u1.country = 'BR'
-- ORDER BY u1.staff_level, u1.lastName;

-- Obtener staff de desarrollo (global, sin filtro de país):
-- SELECT u.*, r.role_name
-- FROM users u
-- LEFT JOIN aponnt_staff_roles r ON u.aponnt_staff_role_id = r.role_id
-- WHERE u.is_aponnt_staff = true
--   AND u.staff_area = 'desarrollo'
-- ORDER BY u.staff_level, u.lastName;

-- ==================== FIN MIGRACIÓN ====================
