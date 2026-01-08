/**
 * Migración: Sistema de Tarifación y Facturación de Canales de Notificación
 *
 * Permite a Aponnt gestionar centralizadamente:
 * - Tarifas por empresa y canal (SMS, WhatsApp)
 * - Consumo mensual acumulado
 * - Facturación y billing
 * - Suspensión de servicio por empresa
 * - Webhooks entrantes (respuestas SMS/WhatsApp)
 */

-- =====================================================
-- TABLA 1: TARIFAS POR EMPRESA Y CANAL
-- =====================================================
CREATE TABLE IF NOT EXISTS company_notification_pricing (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL, -- 'sms', 'whatsapp', 'push', 'email'

  -- Pricing
  price_per_unit NUMERIC(10, 4) NOT NULL DEFAULT 0.01, -- USD por mensaje/notificación
  currency VARCHAR(3) DEFAULT 'USD',

  -- Cuotas y límites
  monthly_quota INTEGER DEFAULT NULL, -- NULL = ilimitado, INT = límite mensual
  is_enabled BOOLEAN DEFAULT true,    -- false = canal suspendido para esta empresa

  -- Razón de suspensión (si is_enabled = false)
  suspension_reason VARCHAR(255),     -- 'non_payment', 'request', 'abuse', etc.
  suspended_at TIMESTAMP,
  suspended_by INTEGER,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,

  -- Constraint: Una sola tarifa activa por empresa/canal
  UNIQUE(company_id, channel)
);

-- Índices
CREATE INDEX idx_company_pricing_company ON company_notification_pricing(company_id);
CREATE INDEX idx_company_pricing_channel ON company_notification_pricing(channel);
CREATE INDEX idx_company_pricing_enabled ON company_notification_pricing(is_enabled);

-- =====================================================
-- TABLA 2: CONSUMO MENSUAL ACUMULADO (POR EMPRESA)
-- =====================================================
CREATE TABLE IF NOT EXISTS company_notification_usage (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL,

  -- Período
  year INTEGER NOT NULL,
  month INTEGER NOT NULL, -- 1-12

  -- Consumo
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,

  -- Costos (calculados automáticamente)
  total_cost NUMERIC(10, 2) DEFAULT 0.00,  -- Costo total del mes
  currency VARCHAR(3) DEFAULT 'USD',

  -- Facturación
  is_invoiced BOOLEAN DEFAULT false,       -- ¿Ya se facturó este período?
  invoice_id VARCHAR(100),                 -- ID de factura externa
  invoiced_at TIMESTAMP,

  -- Metadata
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraint: Un solo registro por empresa/canal/mes
  UNIQUE(company_id, channel, year, month)
);

-- Índices
CREATE INDEX idx_company_usage_company ON company_notification_usage(company_id);
CREATE INDEX idx_company_usage_period ON company_notification_usage(year, month);
CREATE INDEX idx_company_usage_invoiced ON company_notification_usage(is_invoiced);

-- =====================================================
-- TABLA 3: LOG DETALLADO DE FACTURACIÓN (AUDITORÍA)
-- =====================================================
CREATE TABLE IF NOT EXISTS company_notification_billing_log (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  notification_id INTEGER REFERENCES notifications(id) ON DELETE SET NULL,

  -- Canal y costo
  channel VARCHAR(20) NOT NULL,
  unit_price NUMERIC(10, 4) NOT NULL,  -- Precio unitario en el momento del envío
  total_cost NUMERIC(10, 4) NOT NULL,  -- Costo de esta notificación
  currency VARCHAR(3) DEFAULT 'USD',

  -- Estado del envío
  status VARCHAR(20) NOT NULL, -- 'pending', 'delivered', 'failed', 'suspended'

  -- Razón de suspensión (si status = 'suspended')
  suspension_reason VARCHAR(255),

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Período de facturación
  billing_year INTEGER NOT NULL,
  billing_month INTEGER NOT NULL
);

-- Índices
CREATE INDEX idx_billing_log_company ON company_notification_billing_log(company_id);
CREATE INDEX idx_billing_log_notification ON company_notification_billing_log(notification_id);
CREATE INDEX idx_billing_log_period ON company_notification_billing_log(billing_year, billing_month);
CREATE INDEX idx_billing_log_status ON company_notification_billing_log(status);
CREATE INDEX idx_billing_log_created ON company_notification_billing_log(created_at DESC);

-- =====================================================
-- TABLA 4: WEBHOOKS ENTRANTES (RESPUESTAS SMS/WHATSAPP)
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_incoming_messages (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Origen del mensaje
  channel VARCHAR(20) NOT NULL,           -- 'sms', 'whatsapp'
  from_number VARCHAR(50) NOT NULL,       -- Número del remitente
  to_number VARCHAR(50) NOT NULL,         -- Número Aponnt que recibió

  -- Contenido
  message_body TEXT NOT NULL,
  media_urls JSONB DEFAULT '[]'::jsonb,   -- URLs de imágenes/archivos (WhatsApp)

  -- Matching con notificación original
  original_notification_id INTEGER REFERENCES notifications(id),
  conversation_thread_id VARCHAR(100),    -- Para agrupar conversación

  -- Metadata del proveedor (Twilio)
  provider_message_id VARCHAR(100),       -- MessageSid de Twilio
  provider_metadata JSONB,                -- Metadata completo del webhook

  -- Estado de procesamiento
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,

  -- Metadata
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Índices para búsqueda rápida
  CONSTRAINT idx_incoming_unique UNIQUE(provider_message_id)
);

-- Índices
CREATE INDEX idx_incoming_company ON notification_incoming_messages(company_id);
CREATE INDEX idx_incoming_channel ON notification_incoming_messages(channel);
CREATE INDEX idx_incoming_from ON notification_incoming_messages(from_number);
CREATE INDEX idx_incoming_notification ON notification_incoming_messages(original_notification_id);
CREATE INDEX idx_incoming_thread ON notification_incoming_messages(conversation_thread_id);
CREATE INDEX idx_incoming_processed ON notification_incoming_messages(is_processed);

-- =====================================================
-- FUNCIÓN 1: VERIFICAR SI EMPRESA PUEDE ENVIAR
-- =====================================================
CREATE OR REPLACE FUNCTION can_company_send_notification(
  p_company_id INTEGER,
  p_channel VARCHAR
) RETURNS TABLE (
  can_send BOOLEAN,
  reason VARCHAR,
  current_usage INTEGER,
  monthly_quota INTEGER,
  remaining INTEGER
) AS $$
DECLARE
  v_pricing RECORD;
  v_usage RECORD;
  v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
BEGIN
  -- 1. Verificar si existe pricing para esta empresa/canal
  SELECT * INTO v_pricing
  FROM company_notification_pricing
  WHERE company_id = p_company_id
    AND channel = p_channel;

  -- Si no existe pricing, usar valores por defecto (GRATIS, ilimitado)
  IF v_pricing IS NULL THEN
    RETURN QUERY SELECT
      true,
      'no_pricing_configured_free'::VARCHAR,
      0,
      NULL::INTEGER,
      NULL::INTEGER;
    RETURN;
  END IF;

  -- 2. Verificar si canal está habilitado
  IF v_pricing.is_enabled = false THEN
    RETURN QUERY SELECT
      false,
      COALESCE(v_pricing.suspension_reason, 'channel_suspended')::VARCHAR,
      0,
      v_pricing.monthly_quota,
      0;
    RETURN;
  END IF;

  -- 3. Obtener uso del mes actual
  SELECT * INTO v_usage
  FROM company_notification_usage
  WHERE company_id = p_company_id
    AND channel = p_channel
    AND year = v_current_year
    AND month = v_current_month;

  -- Si no hay uso registrado, es el primer envío del mes
  IF v_usage IS NULL THEN
    IF v_pricing.monthly_quota IS NULL THEN
      -- Sin límite
      RETURN QUERY SELECT
        true,
        'unlimited'::VARCHAR,
        0,
        NULL::INTEGER,
        NULL::INTEGER;
    ELSE
      -- Con límite, aún no ha usado nada
      RETURN QUERY SELECT
        true,
        'within_quota'::VARCHAR,
        0,
        v_pricing.monthly_quota,
        v_pricing.monthly_quota;
    END IF;
    RETURN;
  END IF;

  -- 4. Verificar si superó cuota mensual
  IF v_pricing.monthly_quota IS NOT NULL THEN
    IF v_usage.total_sent >= v_pricing.monthly_quota THEN
      RETURN QUERY SELECT
        false,
        'quota_exceeded'::VARCHAR,
        v_usage.total_sent,
        v_pricing.monthly_quota,
        0;
      RETURN;
    ELSE
      RETURN QUERY SELECT
        true,
        'within_quota'::VARCHAR,
        v_usage.total_sent,
        v_pricing.monthly_quota,
        (v_pricing.monthly_quota - v_usage.total_sent);
      RETURN;
    END IF;
  ELSE
    -- Sin límite de cuota
    RETURN QUERY SELECT
      true,
      'unlimited'::VARCHAR,
      v_usage.total_sent,
      NULL::INTEGER,
      NULL::INTEGER;
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN 2: REGISTRAR ENVÍO Y ACUMULAR COSTO
-- =====================================================
CREATE OR REPLACE FUNCTION register_notification_billing(
  p_company_id INTEGER,
  p_notification_id INTEGER,
  p_channel VARCHAR,
  p_status VARCHAR DEFAULT 'pending'
) RETURNS TABLE (
  billing_id INTEGER,
  unit_price NUMERIC,
  total_cost NUMERIC,
  success BOOLEAN
) AS $$
DECLARE
  v_pricing RECORD;
  v_unit_price NUMERIC(10, 4);
  v_total_cost NUMERIC(10, 4);
  v_billing_id INTEGER;
  v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
BEGIN
  -- 1. Obtener precio unitario
  SELECT price_per_unit INTO v_unit_price
  FROM company_notification_pricing
  WHERE company_id = p_company_id
    AND channel = p_channel;

  -- Si no hay pricing configurado, usar $0.01 por defecto
  IF v_unit_price IS NULL THEN
    v_unit_price := 0.01;
  END IF;

  v_total_cost := v_unit_price;

  -- 2. Insertar en billing log
  INSERT INTO company_notification_billing_log (
    company_id,
    notification_id,
    channel,
    unit_price,
    total_cost,
    status,
    billing_year,
    billing_month
  ) VALUES (
    p_company_id,
    p_notification_id,
    p_channel,
    v_unit_price,
    v_total_cost,
    p_status,
    v_current_year,
    v_current_month
  ) RETURNING id INTO v_billing_id;

  -- 3. Acumular en company_notification_usage
  INSERT INTO company_notification_usage (
    company_id,
    channel,
    year,
    month,
    total_sent,
    total_delivered,
    total_failed,
    total_cost
  ) VALUES (
    p_company_id,
    p_channel,
    v_current_year,
    v_current_month,
    CASE WHEN p_status = 'pending' THEN 1 ELSE 0 END,
    CASE WHEN p_status = 'delivered' THEN 1 ELSE 0 END,
    CASE WHEN p_status = 'failed' THEN 1 ELSE 0 END,
    v_total_cost
  )
  ON CONFLICT (company_id, channel, year, month)
  DO UPDATE SET
    total_sent = company_notification_usage.total_sent +
      CASE WHEN p_status = 'pending' THEN 1 ELSE 0 END,
    total_delivered = company_notification_usage.total_delivered +
      CASE WHEN p_status = 'delivered' THEN 1 ELSE 0 END,
    total_failed = company_notification_usage.total_failed +
      CASE WHEN p_status = 'failed' THEN 1 ELSE 0 END,
    total_cost = company_notification_usage.total_cost + v_total_cost,
    last_updated = CURRENT_TIMESTAMP;

  -- 4. Retornar resultado
  RETURN QUERY SELECT
    v_billing_id,
    v_unit_price,
    v_total_cost,
    true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN 3: OBTENER RESUMEN DE FACTURACIÓN MENSUAL
-- =====================================================
CREATE OR REPLACE FUNCTION get_monthly_billing_summary(
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
) RETURNS TABLE (
  company_id INTEGER,
  company_name VARCHAR,
  channel VARCHAR,
  total_sent INTEGER,
  total_delivered INTEGER,
  total_failed INTEGER,
  total_cost NUMERIC,
  is_invoiced BOOLEAN,
  invoice_id VARCHAR
) AS $$
DECLARE
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE));
  v_month INTEGER := COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE));
BEGIN
  RETURN QUERY
  SELECT
    u.company_id,
    c.name::VARCHAR,
    u.channel::VARCHAR,
    u.total_sent,
    u.total_delivered,
    u.total_failed,
    u.total_cost,
    u.is_invoiced,
    u.invoice_id::VARCHAR
  FROM company_notification_usage u
  INNER JOIN companies c ON c.company_id = u.company_id
  WHERE u.year = v_year
    AND u.month = v_month
  ORDER BY u.total_cost DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN 4: MARCAR PERÍODO COMO FACTURADO
-- =====================================================
CREATE OR REPLACE FUNCTION mark_period_as_invoiced(
  p_company_id INTEGER,
  p_year INTEGER,
  p_month INTEGER,
  p_invoice_id VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE company_notification_usage
  SET
    is_invoiced = true,
    invoice_id = p_invoice_id,
    invoiced_at = CURRENT_TIMESTAMP
  WHERE company_id = p_company_id
    AND year = p_year
    AND month = p_month;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TARIFAS POR DEFECTO (APONNT - PARA TODAS LAS EMPRESAS)
-- =====================================================
-- Insertar tarifas globales por defecto para SMS y WhatsApp
-- Nota: Esto se puede ejecutar por empresa individualmente en producción

-- Comentar estas líneas si NO quieres aplicar tarifas automáticamente a todas las empresas
-- Descomentar cuando estés listo para activar facturación

/*
INSERT INTO company_notification_pricing (
  company_id,
  channel,
  price_per_unit,
  currency,
  monthly_quota,
  is_enabled
)
SELECT
  c.company_id,
  'sms',
  0.01,      -- $0.01 USD por SMS
  'USD',
  1000,      -- 1000 SMS/mes por defecto
  true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM company_notification_pricing p
  WHERE p.company_id = c.company_id AND p.channel = 'sms'
)
ON CONFLICT (company_id, channel) DO NOTHING;

INSERT INTO company_notification_pricing (
  company_id,
  channel,
  price_per_unit,
  currency,
  monthly_quota,
  is_enabled
)
SELECT
  c.company_id,
  'whatsapp',
  0.008,     -- $0.008 USD por WhatsApp
  'USD',
  1000,      -- 1000 WhatsApp/mes por defecto
  true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM company_notification_pricing p
  WHERE p.company_id = c.company_id AND p.channel = 'whatsapp'
)
ON CONFLICT (company_id, channel) DO NOTHING;
*/

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON TABLE company_notification_pricing IS 'Tarifas de notificaciones por empresa y canal (gestionado por Aponnt)';
COMMENT ON TABLE company_notification_usage IS 'Consumo mensual acumulado por empresa/canal para facturación';
COMMENT ON TABLE company_notification_billing_log IS 'Log detallado de cada envío para auditoría y billing';
COMMENT ON TABLE notification_incoming_messages IS 'Mensajes entrantes (respuestas SMS/WhatsApp) vía webhooks';

COMMENT ON FUNCTION can_company_send_notification IS 'Verifica si empresa puede enviar notificación (cuota, suspensión, etc.)';
COMMENT ON FUNCTION register_notification_billing IS 'Registra envío y acumula costo en billing';
COMMENT ON FUNCTION get_monthly_billing_summary IS 'Resumen de facturación mensual para todas las empresas';
COMMENT ON FUNCTION mark_period_as_invoiced IS 'Marca período como facturado';
