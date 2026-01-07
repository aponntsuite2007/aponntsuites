-- ============================================================================
-- AGREGAR CAMPOS PARA SLA WARNINGS
-- ============================================================================
-- Fecha: 2026-01-07
-- Propósito: Agregar campos para tracking de advertencias de SLA
-- ============================================================================

-- Agregar campos a unified_notifications
ALTER TABLE unified_notifications
ADD COLUMN IF NOT EXISTS sla_warning_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sla_warning_sent_at TIMESTAMP;

-- Comentarios descriptivos
COMMENT ON COLUMN unified_notifications.sla_warning_sent IS 'TRUE si se envió advertencia de SLA próximo a vencer';
COMMENT ON COLUMN unified_notifications.sla_warning_sent_at IS 'Momento en que se envió la advertencia de SLA';

-- Índice para buscar notificaciones que necesitan advertencia
CREATE INDEX IF NOT EXISTS idx_unified_notif_sla_warning
ON unified_notifications(sla_deadline, sla_warning_sent)
WHERE sla_deadline IS NOT NULL
  AND sla_warning_sent = FALSE
  AND deleted_at IS NULL;

-- Nota: notification_log no tiene campos de SLA (solo tracking de envío)
-- Los campos de SLA están en unified_notifications

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
