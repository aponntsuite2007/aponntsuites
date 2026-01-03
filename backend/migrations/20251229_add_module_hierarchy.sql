-- ============================================================================
-- MIGRACIÓN: Sistema de Jerarquías de Módulos
-- Fecha: 2025-12-29
-- Objetivo: Distinguir entre módulos standalone, containers y submodules
-- ============================================================================

-- PASO 1: Agregar columnas
ALTER TABLE system_modules
ADD COLUMN IF NOT EXISTS parent_module_key VARCHAR(100),
ADD COLUMN IF NOT EXISTS module_type VARCHAR(20) DEFAULT 'standalone';

-- PASO 2: Agregar comentarios
COMMENT ON COLUMN system_modules.parent_module_key IS 'Clave del módulo padre (si es submodule)';
COMMENT ON COLUMN system_modules.module_type IS 'Tipo: standalone, container, submodule';

-- PASO 3: Crear índice para búsquedas por jerarquía
CREATE INDEX IF NOT EXISTS idx_system_modules_parent ON system_modules(parent_module_key);
CREATE INDEX IF NOT EXISTS idx_system_modules_type ON system_modules(module_type);

-- PASO 4: Clasificar módulos existentes

-- Container: Estructura Organizacional
UPDATE system_modules
SET module_type = 'container'
WHERE module_key = 'organizational-structure';

-- Submodules: Departamentos y Turnos (dentro de Estructura Organizacional)
UPDATE system_modules
SET
  parent_module_key = 'organizational-structure',
  module_type = 'submodule'
WHERE module_key IN ('departments', 'shifts');

-- PASO 5: Agregar constraint para validar tipos
ALTER TABLE system_modules
ADD CONSTRAINT chk_module_type
CHECK (module_type IN ('standalone', 'container', 'submodule'));

-- PASO 6: Verificar resultados
SELECT
  module_key,
  name,
  module_type,
  parent_module_key,
  is_core
FROM system_modules
WHERE module_key IN ('organizational-structure', 'departments', 'shifts', 'roles-permissions')
ORDER BY
  CASE module_type
    WHEN 'container' THEN 1
    WHEN 'submodule' THEN 2
    WHEN 'standalone' THEN 3
  END,
  module_key;

-- ============================================================================
-- RESULTADO ESPERADO:
--
-- organizational-structure | container  | NULL
-- departments              | submodule  | organizational-structure
-- shifts                   | submodule  | organizational-structure
-- roles-permissions        | standalone | NULL
-- ============================================================================
