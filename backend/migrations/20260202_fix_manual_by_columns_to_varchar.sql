-- Migración: Cambiar columnas *_manual_by de INTEGER a VARCHAR
-- El staff_id es UUID pero estas columnas eran INTEGER
-- Fecha: 2026-02-02

-- Cambiar onboarding_manual_by a VARCHAR para aceptar UUIDs
ALTER TABLE companies
ALTER COLUMN onboarding_manual_by TYPE VARCHAR(50) USING onboarding_manual_by::VARCHAR;

-- Cambiar status_manual_by a VARCHAR para aceptar UUIDs
ALTER TABLE companies
ALTER COLUMN status_manual_by TYPE VARCHAR(50) USING status_manual_by::VARCHAR;

-- Verificar el cambio
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'companies'
AND column_name IN ('onboarding_manual_by', 'status_manual_by');
