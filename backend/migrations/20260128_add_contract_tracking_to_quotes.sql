-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN: Agregar tracking de contrato EULA a quotes
-- Fecha: 2026-01-28
-- Estados: none → draft → sent → signed
--
-- NOTA: Los EULA son "click-wrap agreements":
-- - No requieren nombre/DNI insertados en el documento
-- - Solo se registra que el cliente hizo click en "Acepto"
-- - Se preservan metadatos de auditoría inmutables
-- ═══════════════════════════════════════════════════════════

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS contract_status VARCHAR(20) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS contract_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS contract_signature_ip VARCHAR(45),
  ADD COLUMN IF NOT EXISTS contract_acceptance_data JSONB;

-- Campos legacy (no usados en EULA, pero mantenidos por compatibilidad)
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS contract_signer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contract_signer_dni VARCHAR(20);

COMMENT ON COLUMN quotes.contract_status IS 'Estado del contrato EULA: none, draft, sent, signed';
COMMENT ON COLUMN quotes.contract_acceptance_data IS 'Datos inmutables de aceptacion EULA: {acceptance_id, timestamp, ip, user_agent, document_hash, ...}';
