-- ========================================================================
-- MIGRACIÓN: Sub-especialidades Médicas en Marketplace
-- ========================================================================
-- Agrega campo de sub-especialidad a la tabla partners (médicos)
-- para permitir filtrado más granular en el Marketplace Médico
--
-- Fecha: 1 de Enero de 2026
-- ========================================================================

-- ========================================================================
-- AGREGAR COLUMNA DE SUB-ESPECIALIDAD
-- ========================================================================
DO $$
BEGIN
    -- Verificar si la columna ya existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'partners'
          AND column_name = 'subspecialty'
    ) THEN
        -- Agregar columna
        ALTER TABLE partners
        ADD COLUMN subspecialty VARCHAR(100);

        -- Agregar comentario
        COMMENT ON COLUMN partners.subspecialty IS 'Sub-especialidad médica específica dentro de la especialidad principal';

        RAISE NOTICE 'Columna "subspecialty" agregada exitosamente a la tabla partners';
    ELSE
        RAISE NOTICE 'Columna "subspecialty" ya existe en la tabla partners';
    END IF;
END $$;

-- ========================================================================
-- CREAR ÍNDICE PARA BÚSQUEDAS POR SUB-ESPECIALIDAD
-- ========================================================================
CREATE INDEX IF NOT EXISTS idx_partners_subspecialty
ON partners(subspecialty)
WHERE subspecialty IS NOT NULL;

-- Índice compuesto para búsquedas frecuentes (especialidad + sub-especialidad)
CREATE INDEX IF NOT EXISTS idx_partners_specialty_subspecialty
ON partners(specialty, subspecialty)
WHERE subspecialty IS NOT NULL;

-- ========================================================================
-- SEED DATA: SUB-ESPECIALIDADES POR ESPECIALIDAD
-- ========================================================================

-- Medicina General → Sub-especialidades
UPDATE partners
SET subspecialty = 'Medicina Familiar'
WHERE specialty = 'Medicina General'
  AND (notes LIKE '%familiar%' OR notes LIKE '%familia%')
  AND subspecialty IS NULL;

UPDATE partners
SET subspecialty = 'Medicina del Trabajo'
WHERE specialty = 'Medicina General'
  AND (notes LIKE '%trabajo%' OR notes LIKE '%laboral%' OR notes LIKE '%ocupacional%')
  AND subspecialty IS NULL;

-- Cardiología → Sub-especialidades
UPDATE partners
SET subspecialty = 'Cardiología Intervencionista'
WHERE specialty = 'Cardiología'
  AND (notes LIKE '%intervencion%' OR notes LIKE '%cateterismo%')
  AND subspecialty IS NULL;

UPDATE partners
SET subspecialty = 'Electrofisiología Cardíaca'
WHERE specialty = 'Cardiología'
  AND (notes LIKE '%electro%' OR notes LIKE '%arritmia%')
  AND subspecialty IS NULL;

-- Traumatología → Sub-especialidades
UPDATE partners
SET subspecialty = 'Traumatología Deportiva'
WHERE specialty = 'Traumatología'
  AND (notes LIKE '%deporte%' OR notes LIKE '%deportiva%')
  AND subspecialty IS NULL;

UPDATE partners
SET subspecialty = 'Cirugía de Columna'
WHERE specialty = 'Traumatología'
  AND (notes LIKE '%columna%' OR notes LIKE '%vertebral%')
  AND subspecialty IS NULL;

-- Psiquiatría → Sub-especialidades
UPDATE partners
SET subspecialty = 'Psiquiatría Infantil'
WHERE specialty = 'Psiquiatría'
  AND (notes LIKE '%infantil%' OR notes LIKE '%niño%' OR notes LIKE '%pediatr%')
  AND subspecialty IS NULL;

UPDATE partners
SET subspecialty = 'Psiquiatría Laboral'
WHERE specialty = 'Psiquiatría'
  AND (notes LIKE '%laboral%' OR notes LIKE '%trabajo%')
  AND subspecialty IS NULL;

-- ========================================================================
-- VISTA: Partners con sub-especialidades
-- ========================================================================
CREATE OR REPLACE VIEW partners_with_subspecialty AS
SELECT
    p.id,
    p.firstName,
    p.lastName,
    p.specialty,
    p.subspecialty,
    p.licenseNumber,
    p.email,
    p.phone,
    p.isActive,
    p.rating,
    p.hourlyRate,
    COUNT(mr.id) AS total_consultations
FROM partners p
LEFT JOIN medical_records mr ON p.id = mr.assigned_doctor_id
WHERE p.subspecialty IS NOT NULL
GROUP BY p.id, p.firstName, p.lastName, p.specialty, p.subspecialty,
         p.licenseNumber, p.email, p.phone, p.isActive, p.rating, p.hourlyRate
ORDER BY p.specialty, p.subspecialty;

-- ========================================================================
-- FUNCIÓN: Obtener sub-especialidades por especialidad
-- ========================================================================
CREATE OR REPLACE FUNCTION get_subspecialties_by_specialty(p_specialty VARCHAR)
RETURNS TABLE (
    subspecialty VARCHAR,
    count_partners BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.subspecialty::VARCHAR,
        COUNT(*)::BIGINT AS count_partners
    FROM partners p
    WHERE p.specialty = p_specialty
      AND p.subspecialty IS NOT NULL
      AND p.isActive = true
    GROUP BY p.subspecialty
    ORDER BY count_partners DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- FUNCIÓN: Buscar médicos por sub-especialidad
-- ========================================================================
CREATE OR REPLACE FUNCTION search_partners_by_subspecialty(
    p_specialty VARCHAR DEFAULT NULL,
    p_subspecialty VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id INTEGER,
    firstName VARCHAR,
    lastName VARCHAR,
    specialty VARCHAR,
    subspecialty VARCHAR,
    licenseNumber VARCHAR,
    rating DECIMAL,
    hourlyRate DECIMAL,
    total_consultations BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.firstName,
        p.lastName,
        p.specialty,
        p.subspecialty,
        p.licenseNumber,
        p.rating,
        p.hourlyRate,
        COUNT(mr.id)::BIGINT AS total_consultations
    FROM partners p
    LEFT JOIN medical_records mr ON p.id = mr.assigned_doctor_id
    WHERE p.isActive = true
      AND (p_specialty IS NULL OR p.specialty = p_specialty)
      AND (p_subspecialty IS NULL OR p.subspecialty = p_subspecialty)
    GROUP BY p.id, p.firstName, p.lastName, p.specialty, p.subspecialty,
             p.licenseNumber, p.rating, p.hourlyRate
    ORDER BY p.rating DESC NULLS LAST, total_consultations DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- CATÁLOGO DE SUB-ESPECIALIDADES VÁLIDAS
-- ========================================================================
-- Crear tabla de catálogo (opcional, para validación en frontend)
CREATE TABLE IF NOT EXISTS medical_subspecialties_catalog (
    id SERIAL PRIMARY KEY,
    specialty VARCHAR(100) NOT NULL,
    subspecialty VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(specialty, subspecialty)
);

-- Insertar sub-especialidades de referencia
INSERT INTO medical_subspecialties_catalog (specialty, subspecialty, description)
VALUES
    -- Medicina General
    ('Medicina General', 'Medicina Familiar', 'Atención integral de la familia'),
    ('Medicina General', 'Medicina del Trabajo', 'Salud ocupacional y prevención'),
    ('Medicina General', 'Geriatría', 'Atención del adulto mayor'),

    -- Cardiología
    ('Cardiología', 'Cardiología Intervencionista', 'Cateterismo y angioplastia'),
    ('Cardiología', 'Electrofisiología Cardíaca', 'Arritmias y marcapasos'),
    ('Cardiología', 'Cardiología Pediátrica', 'Cardiopatías en niños'),

    -- Traumatología
    ('Traumatología', 'Traumatología Deportiva', 'Lesiones deportivas'),
    ('Traumatología', 'Cirugía de Columna', 'Patologías vertebrales'),
    ('Traumatología', 'Cirugía de Mano', 'Microcirugía de mano'),

    -- Psiquiatría
    ('Psiquiatría', 'Psiquiatría Infantil', 'Salud mental en niños'),
    ('Psiquiatría', 'Psiquiatría Laboral', 'Salud mental ocupacional'),
    ('Psiquiatría', 'Adicciones', 'Tratamiento de adicciones'),

    -- Oftalmología
    ('Oftalmología', 'Cirugía Refractiva', 'LASIK y corrección visual'),
    ('Oftalmología', 'Retina y Vítreo', 'Patologías de retina'),

    -- Dermatología
    ('Dermatología', 'Dermatología Estética', 'Tratamientos estéticos'),
    ('Dermatología', 'Dermatología Ocupacional', 'Enfermedades laborales de piel'),

    -- Neurología
    ('Neurología', 'Neurología Pediátrica', 'Enfermedades neurológicas en niños'),
    ('Neurología', 'Epileptología', 'Tratamiento de epilepsia'),

    -- Ginecología
    ('Ginecología', 'Medicina Materno-Fetal', 'Alto riesgo obstétrico'),
    ('Ginecología', 'Endocrinología Ginecológica', 'Trastornos hormonales')

ON CONFLICT (specialty, subspecialty) DO NOTHING;

-- ========================================================================
-- COMENTARIOS FINALES
-- ========================================================================
COMMENT ON TABLE medical_subspecialties_catalog IS 'Catálogo de sub-especialidades médicas válidas por especialidad';
COMMENT ON INDEX idx_partners_subspecialty IS 'Índice para búsquedas por sub-especialidad';
COMMENT ON INDEX idx_partners_specialty_subspecialty IS 'Índice compuesto para filtrado combinado';

-- ========================================================================
-- FIN DE MIGRACIÓN
-- ========================================================================
