-- ============================================
-- Migración: Agregar workflows de notificaciones fiscales
-- Fecha: 2026-01-25
-- Schema: usa process_key (no workflow_key)
-- ============================================

-- Insertar workflows fiscales (globales - scope: 'global', company_id: NULL)
INSERT INTO notification_workflows (
    process_key, process_name, module, description, scope, is_active,
    channels, primary_channel, priority, recipient_type
)
VALUES
    ('fiscal_retention_applied', 'Retención Fiscal Aplicada', 'fiscal',
     'Notifica cuando se aplican retenciones en un pago', 'aponnt', TRUE,
     '["inbox","websocket"]', 'inbox', 'normal', 'user'),

    ('fiscal_high_retention', 'Alerta Retención Alta', 'fiscal',
     'Alerta cuando retención > 5% del monto bruto', 'aponnt', TRUE,
     '["email","inbox","websocket"]', 'email', 'high', 'role'),

    ('fiscal_supplier_payment', 'Notificación Pago a Proveedor', 'fiscal',
     'Notifica al proveedor de pago programado con retenciones', 'aponnt', TRUE,
     '["email"]', 'email', 'normal', 'email'),

    ('fiscal_country_stub', 'Advertencia País Stub', 'fiscal',
     'Advierte cuando se usa régimen fiscal de país no implementado', 'aponnt', TRUE,
     '["inbox","websocket"]', 'inbox', 'low', 'user')
ON CONFLICT (process_key) DO UPDATE SET
    process_name = EXCLUDED.process_name,
    description = EXCLUDED.description,
    channels = EXCLUDED.channels,
    updated_at = CURRENT_TIMESTAMP;
