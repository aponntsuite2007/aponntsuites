/**
 * Agregar workflows para marketing y quotes al sistema NCE
 * Esto permite que los emails de flyers, presupuestos y contratos
 * usen el sistema centralizado de notificaciones
 */

-- ═══════════════════════════════════════════════════════════
-- 1. WORKFLOW: Envío de Flyer "Preguntale a tu IA"
-- ═══════════════════════════════════════════════════════════
INSERT INTO notification_workflows (
  process_key,
  process_name,
  module,
  description,
  scope,
  company_id,
  channels,
  primary_channel,
  priority,
  requires_response,
  sla_delivery_minutes,
  email_config_source,
  email_type,
  recipient_type,
  is_active,
  created_at
) VALUES (
  'marketing.flyer_email',
  'Envío de Flyer Marketing',
  'marketing',
  'Email de flyer "Preguntale a tu IA" enviado a leads desde el módulo de marketing',
  'global',
  NULL,
  '["email"]'::jsonb,
  'email',
  'normal',
  false,
  NULL,
  'database',
  'commercial',
  'external',
  true,
  NOW()
) ON CONFLICT (process_key, COALESCE(company_id, 0)) DO UPDATE SET
  process_name = EXCLUDED.process_name,
  description = EXCLUDED.description,
  channels = EXCLUDED.channels,
  is_active = EXCLUDED.is_active;

-- ═══════════════════════════════════════════════════════════
-- 2. WORKFLOW: Envío de Presupuesto
-- ═══════════════════════════════════════════════════════════
INSERT INTO notification_workflows (
  process_key,
  process_name,
  module,
  description,
  scope,
  company_id,
  channels,
  primary_channel,
  priority,
  requires_response,
  sla_delivery_minutes,
  email_config_source,
  email_type,
  recipient_type,
  is_active,
  created_at
) VALUES (
  'quotes.send_quote',
  'Envío de Presupuesto',
  'quotes',
  'Email con presupuesto/cotización enviado a cliente potencial',
  'global',
  NULL,
  '["email"]'::jsonb,
  'email',
  'high',
  false,
  NULL,
  'database',
  'commercial',
  'external',
  true,
  NOW()
) ON CONFLICT (process_key, COALESCE(company_id, 0)) DO UPDATE SET
  process_name = EXCLUDED.process_name,
  description = EXCLUDED.description,
  channels = EXCLUDED.channels,
  is_active = EXCLUDED.is_active;

-- ═══════════════════════════════════════════════════════════
-- 3. WORKFLOW: Confirmación de Aceptación de Contrato
-- ═══════════════════════════════════════════════════════════
INSERT INTO notification_workflows (
  process_key,
  process_name,
  module,
  description,
  scope,
  company_id,
  channels,
  primary_channel,
  priority,
  requires_response,
  sla_delivery_minutes,
  email_config_source,
  email_type,
  recipient_type,
  is_active,
  created_at
) VALUES (
  'quotes.contract_confirmation',
  'Confirmación de Aceptación de Contrato',
  'quotes',
  'Email de confirmación enviado al cliente después de aceptar el contrato digitalmente',
  'global',
  NULL,
  '["email"]'::jsonb,
  'email',
  'high',
  false,
  NULL,
  'database',
  'commercial',
  'external',
  true,
  NOW()
) ON CONFLICT (process_key, COALESCE(company_id, 0)) DO UPDATE SET
  process_name = EXCLUDED.process_name,
  description = EXCLUDED.description,
  channels = EXCLUDED.channels,
  is_active = EXCLUDED.is_active;

-- ═══════════════════════════════════════════════════════════
-- Verificar workflows creados
-- ═══════════════════════════════════════════════════════════
SELECT
  process_key,
  process_name,
  module,
  channels,
  priority,
  is_active
FROM notification_workflows
WHERE module IN ('marketing', 'quotes')
ORDER BY module, process_key;
