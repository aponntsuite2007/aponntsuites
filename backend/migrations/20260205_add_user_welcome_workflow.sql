-- ============================================================================
-- MIGRACIÓN: Workflow para email de bienvenida a nuevos usuarios
-- ============================================================================
-- Fecha: 2026-02-05
-- Descripción: Registra el workflow 'users.welcome_employee' para que NCE
--              pueda enviar emails de bienvenida con credenciales al crear
--              nuevos usuarios/empleados.
-- ============================================================================

BEGIN;

INSERT INTO notification_workflows (
    process_key, process_name, module, description, scope,
    workflow_steps, channels, primary_channel,
    requires_response, priority, sla_delivery_minutes,
    email_template_key, recipient_type, metadata
) VALUES (
    'users.welcome_employee',
    'Bienvenida a Nuevo Empleado',
    'users',
    'Email de bienvenida con credenciales de acceso al crear un nuevo usuario/empleado',
    'company',
    '{"steps": [{"step": 1, "action": "send_welcome_email"}]}'::jsonb,
    '["email"]'::jsonb,
    'email',
    false,
    'high',
    5,
    'users_welcome_employee',
    'external',
    '{"requiresAction": false, "description": "Email de bienvenida con usuario, contraseña y guía de acceso al sistema"}'::jsonb
) ON CONFLICT (process_key, scope, company_id) DO UPDATE SET
    process_name = EXCLUDED.process_name,
    description = EXCLUDED.description,
    metadata = EXCLUDED.metadata;

COMMIT;
