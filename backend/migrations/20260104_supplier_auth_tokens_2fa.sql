-- =====================================================
-- SUPPLIER AUTH TOKENS - SISTEMA 2FA PARA OPERACIONES SENSIBLES
-- =====================================================
-- Fecha: 2026-01-04
-- Propósito: Firma electrónica para datos bancarios, cambio contraseña, etc.
-- Seguridad: Tokens de 6 dígitos, expiración 10 min, máx 3 intentos
-- =====================================================

BEGIN;

-- Tabla de tokens 2FA
CREATE TABLE IF NOT EXISTS supplier_auth_tokens (
    id BIGSERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES wms_suppliers(id) ON DELETE CASCADE,
    portal_user_id INTEGER NOT NULL REFERENCES supplier_portal_users(id) ON DELETE CASCADE,

    -- Token de 6 dígitos
    token VARCHAR(6) NOT NULL,

    -- Tipo de operación
    operation_type VARCHAR(50) NOT NULL,  -- 'change_password', 'update_banking', 'delete_account'

    -- Seguridad
    ip_address VARCHAR(45) NOT NULL,  -- IPv4 o IPv6
    user_agent TEXT,

    -- Metadatos de la operación (para auditoría)
    metadata JSONB DEFAULT '{}',

    -- Control de expiración e intentos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    attempts_remaining INTEGER DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    last_attempt_ip VARCHAR(45),

    -- Verificación
    verified_at TIMESTAMPTZ,
    verified_from_ip VARCHAR(45),

    -- Cancelación
    cancelled_at TIMESTAMPTZ,
    cancelled_reason TEXT
);

-- Índices para performance y seguridad
CREATE INDEX idx_supplier_auth_tokens_supplier ON supplier_auth_tokens(supplier_id);
CREATE INDEX idx_supplier_auth_tokens_token ON supplier_auth_tokens(token, operation_type, expires_at);
CREATE INDEX idx_supplier_auth_tokens_expires ON supplier_auth_tokens(expires_at) WHERE verified_at IS NULL;

-- Agregar campos de validación a supplier_portal_users
ALTER TABLE supplier_portal_users
ADD COLUMN IF NOT EXISTS banking_info_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS banking_info_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS banking_info_verified_by INTEGER,  -- FK a users (empleado de la empresa que verificó)
ADD COLUMN IF NOT EXISTS can_quote BOOLEAN GENERATED ALWAYS AS (
    email_verified = true
    AND must_change_password = false
    AND banking_info_complete = true
) STORED,
ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(30) DEFAULT 'incomplete';

-- Comentarios
COMMENT ON TABLE supplier_auth_tokens IS 'Tokens 2FA para operaciones sensibles del portal de proveedores (firma electrónica)';
COMMENT ON COLUMN supplier_auth_tokens.token IS 'Token de 6 dígitos numéricos (100000-999999)';
COMMENT ON COLUMN supplier_auth_tokens.operation_type IS 'Tipo de operación que requiere 2FA';
COMMENT ON COLUMN supplier_auth_tokens.metadata IS 'Datos de la operación para auditoría (ej: datos bancarios antiguos vs nuevos)';
COMMENT ON COLUMN supplier_portal_users.can_quote IS 'Columna computada: puede cotizar solo si completó compliance (email verificado + password cambiado + datos bancarios)';

-- Agregar campos de auditoría a wms_suppliers para datos bancarios
ALTER TABLE wms_suppliers
ADD COLUMN IF NOT EXISTS bank_info_last_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bank_info_last_updated_by INTEGER,  -- FK a supplier_portal_users
ADD COLUMN IF NOT EXISTS bank_info_2fa_token_id BIGINT REFERENCES supplier_auth_tokens(id),
ADD COLUMN IF NOT EXISTS bank_info_readonly_for_company BOOLEAN DEFAULT true;  -- Empresa NO puede modificar

-- Comentario crítico de seguridad
COMMENT ON COLUMN wms_suppliers.bank_info_readonly_for_company IS 'Si true, empleados de la empresa SOLO pueden VER datos bancarios, NO modificar (anti-fraude)';

-- Función para validar compliance antes de cotizar
CREATE OR REPLACE FUNCTION check_supplier_can_quote(p_portal_user_id INTEGER)
RETURNS TABLE(
    can_quote BOOLEAN,
    reason TEXT,
    missing_steps TEXT[]
) AS $$
DECLARE
    v_user RECORD;
    v_supplier RECORD;
    v_missing TEXT[] := '{}';
BEGIN
    -- Obtener usuario del portal
    SELECT * INTO v_user FROM supplier_portal_users WHERE id = p_portal_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Usuario no encontrado', ARRAY['user_not_found']::TEXT[];
        RETURN;
    END IF;

    -- Obtener proveedor
    SELECT * INTO v_supplier FROM wms_suppliers WHERE id = v_user.supplier_id;

    -- Validar email verificado
    IF NOT v_user.email_verified THEN
        v_missing := array_append(v_missing, 'email_verification');
    END IF;

    -- Validar contraseña cambiada
    IF v_user.must_change_password THEN
        v_missing := array_append(v_missing, 'password_change');
    END IF;

    -- Validar datos bancarios completos
    IF NOT v_user.banking_info_complete THEN
        v_missing := array_append(v_missing, 'banking_info');
    END IF;

    -- Retornar resultado
    IF array_length(v_missing, 1) > 0 THEN
        RETURN QUERY SELECT
            false,
            'Debe completar: ' || array_to_string(v_missing, ', '),
            v_missing;
    ELSE
        RETURN QUERY SELECT true, 'Proveedor habilitado para cotizar', ARRAY[]::TEXT[];
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema 2FA para proveedores creado exitosamente';
    RAISE NOTICE '   📱 Tokens de 6 dígitos con expiración de 10 minutos';
    RAISE NOTICE '   🔒 Máximo 3 intentos por token';
    RAISE NOTICE '   📊 Auditoría completa de operaciones sensibles';
    RAISE NOTICE '   🏦 Datos bancarios protegidos con firma electrónica';
    RAISE NOTICE '   ⚠️  Validación de compliance antes de cotizar';
END $$;
