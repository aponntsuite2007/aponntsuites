/**
 * ============================================================================
 * MIGRATION: Sistema de Bundling y Auto-Conocimiento de Módulos (FIXED)
 * ============================================================================
 *
 * PROPÓSITO:
 * - Agregar campo bundled_modules (módulos incluidos gratis con el padre)
 * - Agregar campo available_in (dónde se muestra: admin, company, both)
 * - Agregar campo provides_to (qué módulos se benefician de este)
 * - Agregar campo integrates_with (módulos con los que se integra)
 * - Actualizar company_modules para trackear bundled relationships
 *
 * CASOS DE USO:
 * - Asistencia incluye gratis: Kioscos + APK Kiosko
 * - Dashboard Médico incluye gratis: Gestión Médica
 * - Soporte IA incluye gratis: Asistente IA
 *
 * @author Sistema de Auto-Conocimiento
 * @date 2025-10-30
 * @version 1.0.1 (Fixed)
 */

-- ============================================================================
-- PASO 1: Agregar nuevos campos a system_modules
-- ============================================================================

ALTER TABLE system_modules
  ADD COLUMN IF NOT EXISTS bundled_modules JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS available_in VARCHAR(20) DEFAULT 'both' CHECK (available_in IN ('admin', 'company', 'both')),
  ADD COLUMN IF NOT EXISTS provides_to JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS integrates_with JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN system_modules.bundled_modules IS 'Módulos que se activan GRATIS al contratar este (ej: attendance incluye kiosks)';
COMMENT ON COLUMN system_modules.available_in IS 'Dónde está disponible: admin (solo panel-admin), company (solo panel-empresa), both';
COMMENT ON COLUMN system_modules.provides_to IS 'Módulos que se benefician de tener este activo';
COMMENT ON COLUMN system_modules.integrates_with IS 'Módulos con los que se integra automáticamente';
COMMENT ON COLUMN system_modules.metadata IS 'Metadata adicional flexible (help, comercial, etc)';

-- ============================================================================
-- PASO 2: Actualizar company_modules para trackear bundled
-- ============================================================================

ALTER TABLE company_modules
  ADD COLUMN IF NOT EXISTS is_bundled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bundled_with UUID REFERENCES system_modules(id),
  ADD COLUMN IF NOT EXISTS auto_activated BOOLEAN DEFAULT false;

COMMENT ON COLUMN company_modules.is_bundled IS 'True si este módulo vino gratis con otro (bundled)';
COMMENT ON COLUMN company_modules.bundled_with IS 'ID del módulo padre que incluyó este gratis';
COMMENT ON COLUMN company_modules.auto_activated IS 'True si fue activado automáticamente por el sistema';

-- Índice para queries de bundled
CREATE INDEX IF NOT EXISTS idx_company_modules_bundled
  ON company_modules(company_id, is_bundled, bundled_with);

-- ============================================================================
-- PASO 3: Función helper para obtener módulos disponibles según panel
-- ============================================================================

CREATE OR REPLACE FUNCTION get_available_modules(panel_type VARCHAR)
RETURNS TABLE (
  id UUID,
  module_key VARCHAR,
  name VARCHAR,
  category VARCHAR,
  base_price DECIMAL,
  is_core BOOLEAN,
  requirements JSONB,
  bundled_modules JSONB,
  available_in VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.id,
    sm.module_key,
    sm.name,
    sm.category,
    sm.base_price,
    sm.is_core,
    sm.requirements,
    sm.bundled_modules,
    sm.available_in
  FROM system_modules sm
  WHERE sm.is_active = true
    AND (
      sm.available_in = panel_type OR
      sm.available_in = 'both'
    )
  ORDER BY sm.display_order, sm.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_modules IS 'Retorna módulos disponibles según el panel (admin o company)';

-- ============================================================================
-- PASO 4: Función para validar dependencias de módulos
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_module_dependencies(
  p_company_id UUID,
  p_module_key VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_module system_modules%ROWTYPE;
  v_active_modules TEXT[];
  v_missing_required TEXT[];
  v_result JSONB;
BEGIN
  -- Obtener módulo
  SELECT * INTO v_module
  FROM system_modules
  WHERE module_key = p_module_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Module not found'
    );
  END IF;

  -- Obtener módulos activos de la empresa
  SELECT ARRAY_AGG(sm.module_key)
  INTO v_active_modules
  FROM company_modules cm
  JOIN system_modules sm ON cm.system_module_id = sm.id
  WHERE cm.company_id = p_company_id
    AND cm.is_active = true;

  -- Verificar dependencias requeridas
  SELECT ARRAY_AGG(req)
  INTO v_missing_required
  FROM jsonb_array_elements_text(v_module.requirements) req
  WHERE req != ALL(COALESCE(v_active_modules, ARRAY[]::TEXT[]));

  -- Construir resultado
  v_result := jsonb_build_object(
    'valid', COALESCE(array_length(v_missing_required, 1), 0) = 0,
    'module_key', p_module_key,
    'missing_required', COALESCE(v_missing_required, ARRAY[]::TEXT[]),
    'bundled_modules', v_module.bundled_modules
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_module_dependencies IS 'Valida si un módulo puede activarse verificando dependencias';

-- ============================================================================
-- PASO 5: Función para analizar impacto de desactivar módulo
-- ============================================================================

CREATE OR REPLACE FUNCTION analyze_deactivation_impact(
  p_company_id UUID,
  p_module_key VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_module_id UUID;
  v_affected JSONB;
  v_critical_count INTEGER;
BEGIN
  -- Obtener ID del módulo
  SELECT id INTO v_module_id
  FROM system_modules
  WHERE module_key = p_module_key;

  -- Buscar módulos que dependen de este
  WITH dependent_modules AS (
    SELECT
      sm.module_key,
      sm.name,
      CASE
        WHEN sm.requirements @> to_jsonb(p_module_key::text)
        THEN 'critical'
        ELSE 'degraded'
      END as impact
    FROM company_modules cm
    JOIN system_modules sm ON cm.system_module_id = sm.id
    WHERE cm.company_id = p_company_id
      AND cm.is_active = true
      AND (
        sm.requirements @> to_jsonb(p_module_key::text) OR
        sm.integrates_with @> to_jsonb(p_module_key::text)
      )
  )
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'module', module_key,
        'name', name,
        'impact', impact
      )
    ),
    COUNT(*) FILTER (WHERE impact = 'critical')
  INTO v_affected, v_critical_count
  FROM dependent_modules;

  RETURN jsonb_build_object(
    'safe', COALESCE(v_critical_count, 0) = 0,
    'critical_affected', COALESCE(v_critical_count, 0),
    'affected', COALESCE(v_affected, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION analyze_deactivation_impact IS 'Analiza el impacto de desactivar un módulo';

-- ============================================================================
-- PASO 6: Trigger para auto-activar módulos bundled
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_activate_bundled_modules()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_module system_modules%ROWTYPE;
  v_bundled_key TEXT;
  v_bundled_module system_modules%ROWTYPE;
BEGIN
  -- Solo procesar si es un INSERT o UPDATE que activa el módulo
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false)) THEN

    -- Obtener información del módulo padre
    SELECT * INTO v_parent_module
    FROM system_modules
    WHERE id = NEW.system_module_id;

    -- Si tiene bundled_modules, activarlos automáticamente
    IF v_parent_module.bundled_modules IS NOT NULL AND jsonb_array_length(v_parent_module.bundled_modules) > 0 THEN

      FOR v_bundled_key IN SELECT * FROM jsonb_array_elements_text(v_parent_module.bundled_modules)
      LOOP
        -- Buscar el módulo bundled
        SELECT * INTO v_bundled_module
        FROM system_modules
        WHERE module_key = v_bundled_key;

        IF FOUND THEN
          -- Insertar o actualizar el módulo bundled
          INSERT INTO company_modules (
            company_id,
            system_module_id,
            is_active,
            price_per_employee,
            is_bundled,
            bundled_with,
            auto_activated
          ) VALUES (
            NEW.company_id,
            v_bundled_module.id,
            true,
            0.00, -- Precio $0 porque es bundled
            true,
            v_parent_module.id,
            true
          )
          ON CONFLICT (company_id, system_module_id)
          DO UPDATE SET
            is_active = true,
            is_bundled = true,
            bundled_with = v_parent_module.id,
            auto_activated = true,
            price_per_employee = 0.00;

          RAISE NOTICE 'Auto-activado módulo bundled: % (gratis con %)', v_bundled_key, v_parent_module.module_key;
        END IF;
      END LOOP;

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_auto_activate_bundled ON company_modules;
CREATE TRIGGER trigger_auto_activate_bundled
  AFTER INSERT OR UPDATE ON company_modules
  FOR EACH ROW
  EXECUTE FUNCTION auto_activate_bundled_modules();

COMMENT ON FUNCTION auto_activate_bundled_modules IS 'Trigger que auto-activa módulos bundled cuando se activa el padre';

-- ============================================================================
-- PASO 7: Vista helper para módulos con pricing calculado (SIMPLIFIED)
-- ============================================================================
-- NOTA: Vista simplificada sin JOIN companies para evitar errores de columnas

DROP VIEW IF EXISTS v_company_modules_pricing CASCADE;

CREATE OR REPLACE VIEW v_company_modules_pricing AS
SELECT
  cm.id,
  cm.company_id,
  sm.module_key,
  sm.name as module_name,
  sm.category,
  sm.is_core,
  cm.is_active,
  cm.is_bundled,
  cm.bundled_with,
  cm.auto_activated,
  CASE
    WHEN cm.is_bundled THEN 0.00::DECIMAL
    WHEN sm.is_core THEN 0.00::DECIMAL
    ELSE COALESCE(cm.price_per_employee, sm.base_price)
  END as effective_price,
  sm.base_price,
  cm.price_per_employee,
  sm.bundled_modules,
  sm.requirements,
  sm.available_in
FROM company_modules cm
JOIN system_modules sm ON cm.system_module_id = sm.id
WHERE cm.is_active = true;

COMMENT ON VIEW v_company_modules_pricing IS 'Vista con pricing calculado para módulos de empresas (sin company data para evitar errores)';

-- ============================================================================
-- PASO 8: Índices adicionales para performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_system_modules_available_in
  ON system_modules(available_in) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_system_modules_is_core
  ON system_modules(is_core) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_system_modules_bundled_modules
  ON system_modules USING GIN (bundled_modules);

CREATE INDEX IF NOT EXISTS idx_system_modules_requirements
  ON system_modules USING GIN (requirements);

-- ============================================================================
-- FINALIZADO
-- ============================================================================

-- Log de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '   - Agregados campos: bundled_modules, available_in, provides_to, integrates_with';
  RAISE NOTICE '   - Actualizada tabla company_modules con tracking de bundled';
  RAISE NOTICE '   - Creadas 4 funciones SQL helper';
  RAISE NOTICE '   - Creado trigger auto_activate_bundled_modules';
  RAISE NOTICE '   - Creada vista v_company_modules_pricing (simplificada)';
  RAISE NOTICE '   - Creados 5 índices para performance';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Siguiente paso: node populate-modules-with-bundling.js';
END $$;
