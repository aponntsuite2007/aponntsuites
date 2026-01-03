-- =====================================================================
-- MIGRACIÓN: Sistema de Accesos Temporales (Temporary Access Grants)
-- Fecha: 2026-01-02
-- Descripción: Sistema profesional de accesos temporales para auditores,
--              asesores, médicos externos y consultores.
--              DIFERENTE a "visitors" (acceso físico a kioscos).
-- =====================================================================

-- ============================================================================
-- 1. TABLA PRINCIPAL: temporary_access_grants
-- ============================================================================
CREATE TABLE IF NOT EXISTS temporary_access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Información del usuario temporal
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    dni VARCHAR(20),
    phone VARCHAR(20),
    organization VARCHAR(200), -- Empresa/organización del visitante

    -- Tipo de acceso
    access_type VARCHAR(50) NOT NULL DEFAULT 'external_auditor',
    -- Valores: 'external_auditor', 'external_advisor', 'external_doctor',
    --          'consultant', 'contractor', 'temp_staff', 'custom'

    -- Credenciales
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    temp_password_plain TEXT, -- Encriptado, para envío inicial

    -- Permisos
    allowed_modules JSONB DEFAULT '[]'::jsonb, -- Array de module_keys permitidos
    permission_level VARCHAR(20) DEFAULT 'read_only', -- 'read_only', 'read_write', 'custom'
    custom_permissions JSONB DEFAULT '{}'::jsonb,

    -- Restricciones de seguridad
    allowed_ip_ranges TEXT[], -- IPs permitidas (opcional)
    max_concurrent_sessions INTEGER DEFAULT 1,
    require_password_change BOOLEAN DEFAULT true,
    two_factor_enabled BOOLEAN DEFAULT false,

    -- Vigencia
    valid_from TIMESTAMP NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMP NOT NULL,
    auto_revoke_on_expiry BOOLEAN DEFAULT true,

    -- Estado
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Valores: 'pending', 'active', 'expired', 'revoked', 'suspended'

    -- Flags de uso
    first_login_at TIMESTAMP,
    last_login_at TIMESTAMP,
    password_changed BOOLEAN DEFAULT false,
    password_changed_at TIMESTAMP,
    total_logins INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login_at TIMESTAMP,

    -- Auditoría
    created_by UUID REFERENCES users(user_id),
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,
    revoked_by UUID REFERENCES users(user_id),
    revoked_at TIMESTAMP,
    revocation_reason TEXT,

    -- Notas
    purpose TEXT, -- Propósito del acceso
    internal_notes TEXT, -- Notas internas (no visibles para el usuario temporal)

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_valid_dates CHECK (valid_until > valid_from),
    CONSTRAINT check_status CHECK (status IN ('pending', 'active', 'expired', 'revoked', 'suspended'))
);

-- Índices para rendimiento
CREATE INDEX idx_temp_access_company ON temporary_access_grants(company_id);
CREATE INDEX idx_temp_access_username ON temporary_access_grants(username) WHERE status = 'active';
CREATE INDEX idx_temp_access_email ON temporary_access_grants(email);
CREATE INDEX idx_temp_access_status ON temporary_access_grants(status, company_id);
CREATE INDEX idx_temp_access_validity ON temporary_access_grants(valid_from, valid_until) WHERE status = 'active';
CREATE INDEX idx_temp_access_type ON temporary_access_grants(access_type, company_id);

-- ============================================================================
-- 2. TABLA: temporary_access_activity_log
-- ============================================================================
CREATE TABLE IF NOT EXISTS temporary_access_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id UUID NOT NULL REFERENCES temporary_access_grants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Actividad
    activity_type VARCHAR(50) NOT NULL,
    -- Valores: 'login_success', 'login_failed', 'logout', 'access_denied',
    --          'module_accessed', 'data_viewed', 'data_modified', 'password_changed'

    module_accessed VARCHAR(100), -- Si accedió a un módulo específico
    action_performed VARCHAR(100), -- Acción específica realizada

    -- Contexto técnico
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),

    -- Datos
    request_details JSONB DEFAULT '{}'::jsonb,
    response_status INTEGER,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_temp_access_log_grant ON temporary_access_activity_log(grant_id, created_at DESC);
CREATE INDEX idx_temp_access_log_company ON temporary_access_activity_log(company_id, created_at DESC);
CREATE INDEX idx_temp_access_log_type ON temporary_access_activity_log(activity_type, created_at DESC);

-- ============================================================================
-- 3. TABLA: temporary_access_templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS temporary_access_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE, -- NULL = global

    -- Identificación
    template_key VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(10) DEFAULT '👤',
    color VARCHAR(20) DEFAULT '#667eea',

    -- Configuración del template
    access_type VARCHAR(50) NOT NULL,
    default_duration_days INTEGER NOT NULL DEFAULT 30,
    allowed_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    permission_level VARCHAR(20) DEFAULT 'read_only',

    -- Restricciones por defecto
    require_password_change BOOLEAN DEFAULT true,
    two_factor_enabled BOOLEAN DEFAULT false,
    max_concurrent_sessions INTEGER DEFAULT 1,

    -- Metadata
    is_global BOOLEAN DEFAULT false, -- Si está disponible para todas las empresas
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(template_key, company_id)
);

-- Índices
CREATE INDEX idx_temp_access_templates_company ON temporary_access_templates(company_id);
CREATE INDEX idx_temp_access_templates_key ON temporary_access_templates(template_key);

-- ============================================================================
-- 4. TABLA: temporary_access_notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS temporary_access_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id UUID NOT NULL REFERENCES temporary_access_grants(id) ON DELETE CASCADE,

    -- Tipo de notificación
    notification_type VARCHAR(50) NOT NULL,
    -- Valores: 'credentials_sent', 'expiry_warning', 'access_revoked',
    --          'password_changed', 'suspicious_activity'

    -- Canal
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'whatsapp', 'in_app'

    -- Destinatario
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),

    -- Contenido
    subject VARCHAR(500),
    content TEXT,

    -- Estado
    status VARCHAR(20) DEFAULT 'pending',
    -- Valores: 'pending', 'sent', 'delivered', 'failed'

    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_reason TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_temp_access_notif_grant ON temporary_access_notifications(grant_id);
CREATE INDEX idx_temp_access_notif_status ON temporary_access_notifications(status, created_at);

-- ============================================================================
-- 5. FUNCIONES HELPER
-- ============================================================================

-- Función: Generar username único
CREATE OR REPLACE FUNCTION generate_temp_access_username(
    p_full_name VARCHAR,
    p_company_id INTEGER,
    p_access_type VARCHAR
)
RETURNS VARCHAR AS $$
DECLARE
    v_base VARCHAR;
    v_username VARCHAR;
    v_counter INTEGER := 1;
    v_type_prefix VARCHAR;
BEGIN
    -- Prefijo según tipo
    v_type_prefix := CASE p_access_type
        WHEN 'external_auditor' THEN 'aud'
        WHEN 'external_advisor' THEN 'adv'
        WHEN 'external_doctor' THEN 'doc'
        WHEN 'consultant' THEN 'con'
        WHEN 'contractor' THEN 'ctr'
        WHEN 'temp_staff' THEN 'tmp'
        ELSE 'ext'
    END;

    -- Base: primeras letras del nombre + company_id
    v_base := v_type_prefix || '_' ||
              LOWER(REGEXP_REPLACE(SPLIT_PART(p_full_name, ' ', 1), '[^a-zA-Z]', '', 'g')) ||
              p_company_id;

    v_username := v_base;

    -- Buscar username disponible
    WHILE EXISTS (SELECT 1 FROM temporary_access_grants WHERE username = v_username) LOOP
        v_username := v_base || '_' || v_counter;
        v_counter := v_counter + 1;
    END LOOP;

    RETURN v_username;
END;
$$ LANGUAGE plpgsql;

-- Función: Generar contraseña temporal segura
CREATE OR REPLACE FUNCTION generate_secure_temp_password()
RETURNS VARCHAR AS $$
DECLARE
    v_chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%&';
    v_password VARCHAR := '';
    i INTEGER;
BEGIN
    -- Password de 16 caracteres con mayúsculas, minúsculas, números y símbolos
    FOR i IN 1..16 LOOP
        v_password := v_password || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
    END LOOP;

    RETURN v_password;
END;
$$ LANGUAGE plpgsql;

-- Función: Verificar si acceso está vigente
CREATE OR REPLACE FUNCTION is_temp_access_valid(p_grant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_valid BOOLEAN;
BEGIN
    SELECT
        status = 'active'
        AND NOW() BETWEEN valid_from AND valid_until
        AND (allowed_ip_ranges IS NULL OR cardinality(allowed_ip_ranges) = 0)
    INTO v_valid
    FROM temporary_access_grants
    WHERE id = p_grant_id;

    RETURN COALESCE(v_valid, false);
END;
$$ LANGUAGE plpgsql;

-- Función: Auto-expirar accesos vencidos
CREATE OR REPLACE FUNCTION auto_expire_temp_accesses()
RETURNS INTEGER AS $$
DECLARE
    v_expired_count INTEGER;
BEGIN
    UPDATE temporary_access_grants
    SET
        status = 'expired',
        updated_at = NOW()
    WHERE
        status = 'active'
        AND valid_until < NOW()
        AND auto_revoke_on_expiry = true
    RETURNING id INTO v_expired_count;

    GET DIAGNOSTICS v_expired_count = ROW_COUNT;

    RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- Función: Registrar actividad
CREATE OR REPLACE FUNCTION log_temp_access_activity(
    p_grant_id UUID,
    p_activity_type VARCHAR,
    p_module VARCHAR DEFAULT NULL,
    p_ip INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_company_id INTEGER;
BEGIN
    -- Obtener company_id del grant
    SELECT company_id INTO v_company_id
    FROM temporary_access_grants
    WHERE id = p_grant_id;

    -- Insertar log
    INSERT INTO temporary_access_activity_log (
        grant_id,
        company_id,
        activity_type,
        module_accessed,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        p_grant_id,
        v_company_id,
        p_activity_type,
        p_module,
        p_ip,
        p_user_agent,
        p_metadata
    )
    RETURNING id INTO v_log_id;

    -- Actualizar contadores en grant
    IF p_activity_type = 'login_success' THEN
        UPDATE temporary_access_grants
        SET
            total_logins = total_logins + 1,
            last_login_at = NOW(),
            first_login_at = COALESCE(first_login_at, NOW()),
            failed_login_attempts = 0
        WHERE id = p_grant_id;
    ELSIF p_activity_type = 'login_failed' THEN
        UPDATE temporary_access_grants
        SET
            failed_login_attempts = failed_login_attempts + 1,
            last_failed_login_at = NOW()
        WHERE id = p_grant_id;
    END IF;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Trigger: Updated_at automático
CREATE OR REPLACE FUNCTION update_temp_access_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_temp_access_updated_at
    BEFORE UPDATE ON temporary_access_grants
    FOR EACH ROW
    EXECUTE FUNCTION update_temp_access_timestamp();

-- ============================================================================
-- 7. TEMPLATES PREDEFINIDOS GLOBALES
-- ============================================================================

INSERT INTO temporary_access_templates (
    template_key, name, description, icon, color,
    access_type, default_duration_days, allowed_modules,
    permission_level, require_password_change, two_factor_enabled,
    is_global, display_order
) VALUES
(
    'external-auditor',
    'Auditor Externo',
    'Acceso de solo lectura a módulos de auditoría, reportes y dashboards',
    '📊',
    '#3498db',
    'external_auditor',
    30,
    '["dashboard", "users", "attendance", "reports", "audit-reports", "auditor"]'::jsonb,
    'read_only',
    true,
    true,
    true,
    1
),
(
    'external-advisor',
    'Asesor/Consultor',
    'Acceso personalizado según el área de consultoría',
    '💼',
    '#9b59b6',
    'external_advisor',
    60,
    '["dashboard", "reports"]'::jsonb,
    'read_only',
    true,
    false,
    true,
    2
),
(
    'external-doctor',
    'Médico Externo',
    'Acceso a dashboard médico y casos asignados',
    '⚕️',
    '#e74c3c',
    'external_doctor',
    90,
    '["medical-dashboard", "medical", "medical-cases"]'::jsonb,
    'read_write',
    true,
    true,
    true,
    3
),
(
    'financial-consultant',
    'Consultor Financiero',
    'Acceso a módulos financieros y contables',
    '💰',
    '#f39c12',
    'consultant',
    45,
    '["dashboard", "payroll-liquidation", "finance-dashboard"]'::jsonb,
    'read_only',
    true,
    true,
    true,
    4
),
(
    'it-contractor',
    'Contratista IT/Técnico',
    'Acceso técnico limitado para soporte',
    '⚙️',
    '#34495e',
    'contractor',
    15,
    '["dashboard", "engineering-dashboard"]'::jsonb,
    'read_only',
    true,
    false,
    true,
    5
)
ON CONFLICT (template_key, company_id) DO NOTHING;

-- ============================================================================
-- 8. VISTAS ÚTILES
-- ============================================================================

-- Vista: Accesos activos con información resumida
CREATE OR REPLACE VIEW v_active_temp_accesses AS
SELECT
    g.id,
    g.company_id,
    c.name as company_name,
    g.full_name,
    g.email,
    g.username,
    g.access_type,
    g.organization,
    g.allowed_modules,
    g.permission_level,
    g.valid_from,
    g.valid_until,
    g.status,
    g.first_login_at,
    g.last_login_at,
    g.total_logins,
    EXTRACT(DAY FROM (g.valid_until - NOW())) as days_remaining,
    CASE
        WHEN NOW() > g.valid_until THEN 'expired'
        WHEN EXTRACT(DAY FROM (g.valid_until - NOW())) <= 7 THEN 'expiring_soon'
        ELSE 'active'
    END as validity_status,
    g.created_at,
    u.email as created_by_email
FROM temporary_access_grants g
JOIN companies c ON g.company_id = c.company_id
LEFT JOIN users u ON g.created_by = u.user_id
WHERE g.status IN ('active', 'pending');

-- Vista: Actividad reciente por empresa
CREATE OR REPLACE VIEW v_temp_access_recent_activity AS
SELECT
    l.id,
    l.grant_id,
    l.company_id,
    c.name as company_name,
    g.full_name,
    g.username,
    l.activity_type,
    l.module_accessed,
    l.ip_address,
    l.created_at,
    CASE
        WHEN l.activity_type IN ('login_failed', 'access_denied') THEN 'warning'
        WHEN l.activity_type = 'login_success' THEN 'success'
        ELSE 'info'
    END as severity
FROM temporary_access_activity_log l
JOIN temporary_access_grants g ON l.grant_id = g.id
JOIN companies c ON l.company_id = c.company_id
ORDER BY l.created_at DESC
LIMIT 100;

-- ============================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE temporary_access_grants IS 'Sistema de accesos temporales digitales para auditores externos, asesores, médicos no asociados y consultores. Diferente a "visitors" que es para acceso físico a kioscos.';
COMMENT ON COLUMN temporary_access_grants.access_type IS 'Tipo de acceso temporal: external_auditor, external_advisor, external_doctor, consultant, contractor, temp_staff, custom';
COMMENT ON COLUMN temporary_access_grants.allowed_modules IS 'Array JSON de module_keys a los que el usuario temporal tiene acceso';
COMMENT ON COLUMN temporary_access_grants.permission_level IS 'Nivel de permisos: read_only (solo lectura), read_write (lectura/escritura), custom (personalizado)';
COMMENT ON TABLE temporary_access_activity_log IS 'Log completo de actividades de usuarios temporales para auditoría y seguridad';
COMMENT ON TABLE temporary_access_templates IS 'Templates predefinidos para facilitar la creación de accesos temporales (Auditor, Asesor, Médico, etc.)';
