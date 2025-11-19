-- Agregar columna toleranceConfig a shifts
-- Esta columna almacena configuración detallada de tolerancias

BEGIN;

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS "toleranceConfig" JSONB DEFAULT '{
  "entry": {"before": 15, "after": 10},
  "exit": {"before": 0, "after": 30}
}'::jsonb;

COMMENT ON COLUMN shifts."toleranceConfig" IS 'Configuración detallada de tolerancias de entrada y salida';

COMMIT;
