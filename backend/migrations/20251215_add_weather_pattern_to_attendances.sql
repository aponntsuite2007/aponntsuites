-- ============================================================================
-- MIGRACIÓN: Agregar weather_pattern a attendances
-- ============================================================================
-- Sistema simplificado de patrones climáticos
-- Capturados al momento de la fichada (15 min antes del turno)
-- ============================================================================

-- 1. Agregar columna weather_pattern
ALTER TABLE attendances
ADD COLUMN IF NOT EXISTS weather_pattern VARCHAR(20) DEFAULT 'UNKNOWN';

-- 2. Agregar columnas de metadata climática (opcional para análisis)
ALTER TABLE attendances
ADD COLUMN IF NOT EXISTS weather_temperature DECIMAL(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS weather_condition VARCHAR(30) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS weather_is_night BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS weather_captured_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. Crear índice para búsquedas por patrón
CREATE INDEX IF NOT EXISTS idx_attendances_weather_pattern
ON attendances(weather_pattern);

-- 4. Crear índice compuesto para análisis
CREATE INDEX IF NOT EXISTS idx_attendances_date_weather
ON attendances(date, weather_pattern);

-- 5. Comentarios de documentación
COMMENT ON COLUMN attendances.weather_pattern IS 'Patrón climático simplificado: FAVORABLE, ADVERSO_LLUVIA, ADVERSO_FRIO, NOCTURNO, UNKNOWN';
COMMENT ON COLUMN attendances.weather_temperature IS 'Temperatura en °C al momento de la fichada';
COMMENT ON COLUMN attendances.weather_condition IS 'Condición: sunny, cloudy, rainy, stormy, snow, etc.';
COMMENT ON COLUMN attendances.weather_is_night IS 'Si es horario nocturno (true/false)';
COMMENT ON COLUMN attendances.weather_captured_at IS 'Timestamp cuando se capturó el clima';

-- ============================================================================
-- PATRONES CLIMÁTICOS DEFINIDOS:
-- ============================================================================
-- FAVORABLE      = Día, sin lluvia, temp 10-30°C
-- ADVERSO_LLUVIA = Lluvia o tormenta (cualquier hora)
-- ADVERSO_FRIO   = Temperatura < 10°C (sin lluvia)
-- NOCTURNO       = Hora fichada entre 20:00 y 06:00 (cualquier clima)
-- UNKNOWN        = No se pudo determinar el clima
-- ============================================================================
