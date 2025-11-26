/**
 * ============================================================================
 * MIGRACIÓN: CREAR TABLA APONNT_STAFF SEPARADA - Multi-País
 * ============================================================================
 *
 * Descripción:
 * - Tabla SEPARADA para staff de Aponnt (CERO riesgo de conflicto con users)
 * - Relación OPCIONAL 1-to-1 con users (solo si el staff tiene acceso al sistema)
 * - Sistema de autenticación propio para staff
 * - Puerta trasera hardcodeada: user=postgres, pass=Aedr15150302
 *
 * Ventajas:
 * ✅ Aislación total de usuarios de empresas
 * ✅ Panel separado para staff (panel-aponnt-staff.html)
 * ✅ Auth separada (/api/aponnt/staff/login)
 * ✅ CERO testing del módulo usuarios existente
 *
 * Autor: Claude Code
 * Fecha: 2025-01-21
 */

-- ==================== TABLA: aponnt_staff ====================

-- Eliminar tabla si existe (para poder recrearla limpia)
DROP TABLE IF EXISTS aponnt_staff CASCADE;

CREATE TABLE aponnt_staff (
  staff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relación OPCIONAL con users (solo si tiene acceso al sistema)
  user_id UUID REFERENCES users(user_id) ON DELETE SET NULL UNIQUE,
  -- Si user_id es NULL, significa que no tiene acceso al sistema (ej: staff externo)

  -- Datos personales
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  document_type VARCHAR(20),  -- 'DNI', 'Passport', 'RUT', etc.
  document_number VARCHAR(50),

  -- Rol organizacional
  role_id UUID NOT NULL REFERENCES aponnt_staff_roles(role_id) ON DELETE RESTRICT,

  -- Jerarquía organizacional
  reports_to_staff_id UUID REFERENCES aponnt_staff(staff_id) ON DELETE SET NULL,

  -- Ubicación geográfica y nacionalidad (CRÍTICO para multi-país)
  country VARCHAR(2) NOT NULL,       -- País asignado (código ISO-2): 'AR', 'BR', 'CL', 'MX', 'US', 'ES'
  nationality VARCHAR(2),             -- Nacionalidad del empleado

  -- Clasificación organizacional (denormalizados desde role para queries rápidas)
  level INTEGER NOT NULL,             -- 0 (CEO), 1 (Gerentes), 2 (Jefes), 3 (Coordinadores), 4 (Operativos)
  area VARCHAR(50) NOT NULL,          -- 'ventas', 'admin', 'desarrollo', 'externo', 'direccion'

  -- Preferencias
  language_preference VARCHAR(2) DEFAULT 'es',  -- 'es', 'en', 'pt', 'fr', 'de', 'it'

  -- Contratación
  contract_type VARCHAR(20),          -- 'interno', 'externo', 'freelance'
  hire_date DATE,
  termination_date DATE,

  -- Datos bancarios (para comisiones)
  cbu VARCHAR(50),
  bank_name VARCHAR(100),
  bank_account_type VARCHAR(20),      -- 'checking', 'savings'

  -- Configuración de vendedores (solo para staff de ventas)
  accepts_support_packages BOOLEAN DEFAULT false,
  accepts_auctions BOOLEAN DEFAULT false,
  whatsapp_number VARCHAR(50),
  global_rating DECIMAL(3,2) DEFAULT 0.00,

  -- Estado
  is_active BOOLEAN DEFAULT true,

  -- Auditoría
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(user_id) ON DELETE SET NULL
);

-- ==================== ÍNDICES ====================

-- Índice principal por país (CRÍTICO para organigramas multi-país)
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_country ON aponnt_staff(country) WHERE is_active = true;

-- Por área y país (ventas por país)
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_area_country ON aponnt_staff(area, country) WHERE is_active = true;

-- Por rol
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_role ON aponnt_staff(role_id) WHERE is_active = true;

-- Por jerarquía
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_reports_to ON aponnt_staff(reports_to_staff_id) WHERE is_active = true;

-- Por nivel
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_level ON aponnt_staff(level) WHERE is_active = true;

-- Por email (para login)
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_email ON aponnt_staff(email) WHERE is_active = true;

-- Por relación con users (1-to-1 opcional)
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_user ON aponnt_staff(user_id) WHERE user_id IS NOT NULL;

-- Por vendedores activos
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_vendors ON aponnt_staff(area, country)
  WHERE is_active = true AND area = 'ventas' AND accepts_support_packages = true;

-- ==================== MIGRAR VENDEDORES EXISTENTES ====================

-- Obtener el role_id de 'VEND' (Vendedor)
DO $$
DECLARE
  vendedor_role_id UUID;
BEGIN
  -- Obtener el UUID del rol VEND
  SELECT role_id INTO vendedor_role_id
  FROM aponnt_staff_roles
  WHERE role_code = 'VEND'
  LIMIT 1;

  -- Solo migrar si existe el rol
  IF vendedor_role_id IS NOT NULL THEN
    -- Insertar vendedores desde users que tengan accepts_support_packages = true
    INSERT INTO aponnt_staff (
      user_id,
      first_name,
      last_name,
      email,
      phone,
      role_id,
      country,
      nationality,
      level,
      area,
      language_preference,
      contract_type,
      hire_date,
      cbu,
      bank_name,
      accepts_support_packages,
      accepts_auctions,
      whatsapp_number,
      global_rating,
      is_active,
      created_at,
      updated_at
    )
    SELECT
      u.user_id,
      u."firstName",
      u."lastName",
      u.email,
      u.phone,
      vendedor_role_id,  -- Todos son vendedores (nivel 4)
      'AR',  -- Default Argentina para todos los vendedores existentes
      'AR',  -- Nacionalidad Argentina por defecto
      4,  -- Nivel operativo (vendedores)
      'ventas',
      'es',
      'interno',
      u."createdAt"::date,
      u.cbu,
      u.bank_name,
      u.accepts_support_packages,
      u.accepts_auctions,
      u.whatsapp_number,
      u.global_rating,
      u."isActive",
      u."createdAt",
      u."updatedAt"
    FROM users u
    WHERE u.accepts_support_packages = true
      AND NOT EXISTS (
        -- Evitar duplicados si se ejecuta la migración dos veces
        SELECT 1 FROM aponnt_staff s WHERE s.user_id = u.user_id
      );

    RAISE NOTICE 'Vendedores migrados a aponnt_staff exitosamente';
  ELSE
    RAISE WARNING 'No se encontró el rol VEND, migración de vendedores omitida';
  END IF;
END $$;

-- ==================== COMENTARIOS ====================

COMMENT ON TABLE aponnt_staff IS 'Staff de Aponnt (vendedores, gerentes, desarrollo, etc.). SEPARADO de users de empresas.';
COMMENT ON COLUMN aponnt_staff.user_id IS 'FK a users (OPCIONAL). Solo si el staff tiene acceso al sistema. NULL = sin acceso.';
COMMENT ON COLUMN aponnt_staff.role_id IS 'FK a aponnt_staff_roles. Define el rol organizacional (GG, GR, VEND, etc.)';
COMMENT ON COLUMN aponnt_staff.reports_to_staff_id IS 'FK a aponnt_staff (auto-referencia). Define la jerarquía organizacional.';
COMMENT ON COLUMN aponnt_staff.country IS 'País asignado (ISO-2). Para ventas, define región. Para otros, ubicación física.';
COMMENT ON COLUMN aponnt_staff.level IS 'Nivel jerárquico: 0=CEO, 1=Gerentes, 2=Jefes, 3=Coordinadores, 4=Operativos';
COMMENT ON COLUMN aponnt_staff.area IS 'Área organizacional: ventas, admin, desarrollo, externo, direccion';

-- ==================== QUERIES DE EJEMPLO ====================

-- Obtener todos los vendedores de Argentina:
-- SELECT s.*, r.role_name, u.email as login_email
-- FROM aponnt_staff s
-- INNER JOIN aponnt_staff_roles r ON s.role_id = r.role_id
-- LEFT JOIN users u ON s.user_id = u.user_id
-- WHERE s.is_active = true
--   AND s.area = 'ventas'
--   AND s.country = 'AR'
-- ORDER BY s.level, s.last_name;

-- Obtener organigrama de ventas de Brasil con jerarquía:
-- WITH RECURSIVE hierarchy AS (
--   -- Gerente Regional de Brasil
--   SELECT s.*, r.role_name, 0 as depth
--   FROM aponnt_staff s
--   INNER JOIN aponnt_staff_roles r ON s.role_id = r.role_id
--   WHERE s.country = 'BR' AND r.role_code = 'GR' AND s.is_active = true
--
--   UNION ALL
--
--   -- Subordinados recursivamente
--   SELECT s.*, r.role_name, h.depth + 1
--   FROM aponnt_staff s
--   INNER JOIN aponnt_staff_roles r ON s.role_id = r.role_id
--   INNER JOIN hierarchy h ON s.reports_to_staff_id = h.staff_id
--   WHERE s.is_active = true
-- )
-- SELECT * FROM hierarchy ORDER BY depth, level, last_name;

-- ==================== FIN MIGRACIÓN ====================
