/**
 * ============================================================================
 * MIGRACIÓN: REVERTIR CAMPOS STAFF DE TABLA USERS
 * ============================================================================
 *
 * Descripción:
 * - Elimina los campos staff que se agregaron a la tabla users
 * - Decisión: Usar tabla separada aponnt_staff para TOTAL aislación
 * - CERO riesgo de afectar el módulo de usuarios de empresas ya testado
 *
 * Autor: Claude Code
 * Fecha: 2025-01-21
 */

-- ==================== ELIMINAR ÍNDICES ====================

DROP INDEX IF EXISTS idx_users_is_aponnt_staff;
DROP INDEX IF EXISTS idx_users_aponnt_staff_role;
DROP INDEX IF EXISTS idx_users_reports_to;
DROP INDEX IF EXISTS idx_users_country;
DROP INDEX IF EXISTS idx_users_staff_area_country;
DROP INDEX IF EXISTS idx_users_staff_level;

-- ==================== ELIMINAR COLUMNAS ====================

ALTER TABLE users DROP COLUMN IF EXISTS is_aponnt_staff;
ALTER TABLE users DROP COLUMN IF EXISTS aponnt_staff_role_id;
ALTER TABLE users DROP COLUMN IF EXISTS reports_to_user_id;
ALTER TABLE users DROP COLUMN IF EXISTS staff_level;
ALTER TABLE users DROP COLUMN IF EXISTS staff_area;
ALTER TABLE users DROP COLUMN IF EXISTS country;
ALTER TABLE users DROP COLUMN IF EXISTS nationality;
ALTER TABLE users DROP COLUMN IF EXISTS language_preference;
ALTER TABLE users DROP COLUMN IF EXISTS contract_type;
ALTER TABLE users DROP COLUMN IF EXISTS hire_date;

-- ==================== FIN REVERSIÓN ====================

COMMENT ON TABLE users IS 'Tabla de usuarios SOLO para empresas clientes. Staff de Aponnt usa tabla aponnt_staff separada.';
