-- =============================================
-- Migración: Agregar regla proactiva para renovación de consentimiento biométrico
-- Fecha: 2025-02-01
-- Descripción: Crea regla automática que detecta consentimientos próximos a vencer
-- =============================================

-- Insertar regla para cada empresa existente (solo si no existe ya)
INSERT INTO proactive_rules (
    company_id,
    rule_name,
    rule_type,
    trigger_threshold,
    auto_action,
    notification_recipients,
    priority,
    check_frequency,
    active,
    created_at,
    updated_at
)
SELECT
    c.id as company_id,
    'Renovación de Consentimiento Biométrico',
    'consent_renewal',
    '{"days_before_expiry": 30}'::jsonb,
    'notify',
    '["hr_admin", "employee"]'::jsonb,
    'high',
    'daily',
    true,
    NOW(),
    NOW()
FROM companies c
WHERE c.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM proactive_rules pr
    WHERE pr.company_id = c.id
    AND pr.rule_type = 'consent_renewal'
);

-- Log de migración
DO $$
DECLARE
    rules_created INTEGER;
BEGIN
    GET DIAGNOSTICS rules_created = ROW_COUNT;
    RAISE NOTICE 'Migración consent_renewal: % reglas creadas', rules_created;
END $$;

-- Comentario para documentación
COMMENT ON COLUMN proactive_rules.rule_type IS
    'Tipos: vacation_expiry, overtime_limit, rest_violation, document_expiry, certificate_expiry, consent_renewal';
