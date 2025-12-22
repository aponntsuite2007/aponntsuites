-- =====================================================================================
-- MIGRACIÓN: Datos Socio-Ambientales de Usuarios
-- Fecha: 2025-12-17
-- Descripción: Agrega campos estructurados de dirección, vivienda y composición del hogar
-- Basado en mejores prácticas de SAP SuccessFactors, Workday HCM, Oracle HCM, BambooHR
-- =====================================================================================

-- =====================================================================================
-- PARTE 1: TIPOS ENUM
-- =====================================================================================

-- Tipo de residencia
DO $$ BEGIN
    CREATE TYPE residence_type_enum AS ENUM (
        'own',           -- Propia
        'rent',          -- Alquilada
        'family',        -- Vivienda familiar (padres, suegros, etc.)
        'shared',        -- Compartida con compañeros
        'employer',      -- Provista por empleador
        'temporary',     -- Temporal/transitoria
        'other'          -- Otro
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de vivienda
DO $$ BEGIN
    CREATE TYPE housing_type_enum AS ENUM (
        'house',         -- Casa
        'apartment',     -- Departamento
        'duplex',        -- Dúplex
        'studio',        -- Monoambiente
        'room',          -- Habitación
        'farm',          -- Campo/chacra
        'mobile',        -- Vivienda móvil
        'other'          -- Otro
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Relación con conviviente
DO $$ BEGIN
    CREATE TYPE household_relationship_enum AS ENUM (
        'spouse',        -- Cónyuge/Pareja
        'child',         -- Hijo/a
        'parent',        -- Padre/Madre
        'sibling',       -- Hermano/a
        'grandparent',   -- Abuelo/a
        'grandchild',    -- Nieto/a
        'in_law',        -- Suegro/a, cuñado/a
        'uncle_aunt',    -- Tío/a
        'cousin',        -- Primo/a
        'roommate',      -- Compañero de cuarto
        'friend',        -- Amigo/a
        'caregiver',     -- Cuidador/a
        'other_family',  -- Otro familiar
        'other'          -- Otro
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Nivel educativo
DO $$ BEGIN
    CREATE TYPE education_level_enum AS ENUM (
        'none',          -- Sin estudios formales
        'primary_incomplete',     -- Primario incompleto
        'primary_complete',       -- Primario completo
        'secondary_incomplete',   -- Secundario incompleto
        'secondary_complete',     -- Secundario completo
        'tertiary_incomplete',    -- Terciario incompleto
        'tertiary_complete',      -- Terciario completo
        'university_incomplete',  -- Universitario incompleto
        'university_complete',    -- Universitario completo
        'postgraduate'            -- Posgrado
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================================
-- PARTE 2: CAMPOS EN TABLA USERS (Dirección estructurada + Datos de vivienda)
-- =====================================================================================

-- Dirección estructurada
ALTER TABLE users ADD COLUMN IF NOT EXISTS street_address VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS floor_apt VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS province VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Argentina';
ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_latitude DECIMAL(10, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_longitude DECIMAL(11, 8);

-- Datos de vivienda
ALTER TABLE users ADD COLUMN IF NOT EXISTS residence_type VARCHAR(20) DEFAULT 'own';
ALTER TABLE users ADD COLUMN IF NOT EXISTS housing_type VARCHAR(20) DEFAULT 'apartment';
ALTER TABLE users ADD COLUMN IF NOT EXISTS residence_since DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS previous_moves_5years INTEGER DEFAULT 0;

-- Composición del hogar (resumen)
ALTER TABLE users ADD COLUMN IF NOT EXISTS household_size INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lives_alone BOOLEAN DEFAULT FALSE;

-- Datos socioeconómicos adicionales
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_vehicle BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS commute_method VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS commute_time_minutes INTEGER;

-- Comentarios
COMMENT ON COLUMN users.street_address IS 'Calle y número de la dirección';
COMMENT ON COLUMN users.floor_apt IS 'Piso y departamento';
COMMENT ON COLUMN users.neighborhood IS 'Barrio';
COMMENT ON COLUMN users.city IS 'Ciudad';
COMMENT ON COLUMN users.province IS 'Provincia o estado';
COMMENT ON COLUMN users.country IS 'País';
COMMENT ON COLUMN users.postal_code IS 'Código postal';
COMMENT ON COLUMN users.residence_type IS 'Tipo de tenencia: own, rent, family, shared, employer, temporary, other';
COMMENT ON COLUMN users.housing_type IS 'Tipo de vivienda: house, apartment, duplex, studio, room, farm, mobile, other';
COMMENT ON COLUMN users.residence_since IS 'Fecha desde la que reside en la dirección actual';
COMMENT ON COLUMN users.household_size IS 'Cantidad total de personas en el hogar';
COMMENT ON COLUMN users.dependents_count IS 'Cantidad de personas que dependen económicamente del empleado';
COMMENT ON COLUMN users.commute_method IS 'Método de transporte al trabajo: car, public, bike, walk, motorcycle, remote';

-- =====================================================================================
-- PARTE 3: TABLA DE MIEMBROS DEL HOGAR (Convivientes)
-- =====================================================================================

CREATE TABLE IF NOT EXISTS user_household_members (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id),

    -- Datos básicos
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(30) NOT NULL,  -- Uses household_relationship_enum values
    birth_date DATE,
    gender VARCHAR(20),
    dni VARCHAR(20),

    -- Situación
    is_dependent BOOLEAN DEFAULT FALSE,  -- ¿Depende económicamente?
    is_cohabitant BOOLEAN DEFAULT TRUE,  -- ¿Vive en el hogar? (puede ser dependiente pero no convivir)

    -- Características
    has_disability BOOLEAN DEFAULT FALSE,
    disability_type VARCHAR(100),
    has_chronic_illness BOOLEAN DEFAULT FALSE,
    chronic_illness_notes TEXT,

    -- Situación laboral/educativa
    works_externally BOOLEAN DEFAULT FALSE,
    occupation VARCHAR(100),
    education_level VARCHAR(30),  -- Uses education_level_enum values
    is_student BOOLEAN DEFAULT FALSE,
    school_name VARCHAR(255),

    -- Cobertura médica
    has_own_health_insurance BOOLEAN DEFAULT FALSE,
    health_insurance_provider VARCHAR(100),
    is_covered_by_employee BOOLEAN DEFAULT FALSE,  -- ¿Está en la OS del empleado?

    -- Beneficiario
    is_life_insurance_beneficiary BOOLEAN DEFAULT FALSE,
    beneficiary_percentage DECIMAL(5,2),

    -- Notas
    notes TEXT,

    -- Metadatos
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_household_user_id ON user_household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_company ON user_household_members(company_id);
CREATE INDEX IF NOT EXISTS idx_household_relationship ON user_household_members(relationship);
CREATE INDEX IF NOT EXISTS idx_household_dependent ON user_household_members(is_dependent) WHERE is_dependent = TRUE;

-- Comentarios
COMMENT ON TABLE user_household_members IS 'Miembros del hogar/grupo familiar del empleado (convivientes y dependientes)';
COMMENT ON COLUMN user_household_members.is_dependent IS 'TRUE si la persona depende económicamente del empleado';
COMMENT ON COLUMN user_household_members.is_cohabitant IS 'TRUE si la persona vive en el mismo hogar';
COMMENT ON COLUMN user_household_members.is_covered_by_employee IS 'TRUE si está cubierto por la obra social/prepaga del empleado';

-- =====================================================================================
-- PARTE 4: TABLA DE CONTACTOS DE EMERGENCIA MEJORADA
-- =====================================================================================

CREATE TABLE IF NOT EXISTS user_emergency_contacts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id),

    -- Prioridad
    priority INTEGER NOT NULL DEFAULT 1,  -- 1 = Primario, 2 = Secundario, etc.

    -- Datos de contacto
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(30) NOT NULL,

    -- Teléfonos
    phone_primary VARCHAR(30) NOT NULL,
    phone_secondary VARCHAR(30),
    phone_work VARCHAR(30),

    -- Otros contactos
    email VARCHAR(255),

    -- Dirección (por si hay que ir a buscarlo)
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),

    -- Disponibilidad
    available_hours VARCHAR(100),  -- Ej: "9:00-18:00" o "24/7"
    preferred_contact_method VARCHAR(20) DEFAULT 'phone',  -- phone, whatsapp, email

    -- Instrucciones especiales
    special_instructions TEXT,
    speaks_languages VARCHAR(100),  -- Ej: "Español, Inglés"

    -- Autorización
    can_make_medical_decisions BOOLEAN DEFAULT FALSE,
    can_pickup_employee BOOLEAN DEFAULT TRUE,
    has_keys_to_home BOOLEAN DEFAULT FALSE,

    -- Metadatos
    is_active BOOLEAN DEFAULT TRUE,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_emergency_user_id ON user_emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_priority ON user_emergency_contacts(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_emergency_company ON user_emergency_contacts(company_id);

-- Constraint: Solo un contacto primario por usuario
CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_primary_unique
ON user_emergency_contacts(user_id, priority)
WHERE is_active = TRUE;

-- Comentarios
COMMENT ON TABLE user_emergency_contacts IS 'Contactos de emergencia del empleado, ordenados por prioridad';
COMMENT ON COLUMN user_emergency_contacts.priority IS '1 = Contacto primario, 2 = Secundario, etc.';
COMMENT ON COLUMN user_emergency_contacts.can_make_medical_decisions IS 'Autorizado para tomar decisiones médicas en nombre del empleado';

-- =====================================================================================
-- PARTE 5: TRIGGER PARA ACTUALIZAR household_size AUTOMÁTICAMENTE
-- =====================================================================================

CREATE OR REPLACE FUNCTION update_household_size()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar el contador en users
    UPDATE users
    SET household_size = (
        SELECT COUNT(*) + 1  -- +1 por el propio empleado
        FROM user_household_members
        WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
        AND is_cohabitant = TRUE
        AND is_active = TRUE
    ),
    dependents_count = (
        SELECT COUNT(*)
        FROM user_household_members
        WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
        AND is_dependent = TRUE
        AND is_active = TRUE
    )
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_household_size ON user_household_members;
CREATE TRIGGER trg_update_household_size
AFTER INSERT OR UPDATE OR DELETE ON user_household_members
FOR EACH ROW EXECUTE FUNCTION update_household_size();

-- =====================================================================================
-- PARTE 6: VISTA PARA REPORTE SOCIODEMOGRÁFICO
-- =====================================================================================

CREATE OR REPLACE VIEW v_user_socioeconomic_summary AS
SELECT
    u.user_id,
    u.company_id,
    u."firstName" || ' ' || u."lastName" AS full_name,

    -- Dirección completa
    COALESCE(u.street_address, '') ||
    CASE WHEN u.floor_apt IS NOT NULL THEN ' ' || u.floor_apt ELSE '' END AS address_line1,
    COALESCE(u.neighborhood, '') AS neighborhood,
    COALESCE(u.city, '') ||
    CASE WHEN u.province IS NOT NULL THEN ', ' || u.province ELSE '' END ||
    CASE WHEN u.postal_code IS NOT NULL THEN ' (' || u.postal_code || ')' ELSE '' END AS city_province_zip,
    COALESCE(u.country, 'Argentina') AS country,

    -- Vivienda
    u.residence_type,
    u.housing_type,
    u.residence_since,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.residence_since))::INTEGER AS years_at_residence,

    -- Hogar
    u.household_size,
    u.dependents_count,
    u.lives_alone,

    -- Transporte
    u.has_vehicle,
    u.vehicle_type,
    u.commute_method,
    u.commute_time_minutes,

    -- Contadores de miembros
    (SELECT COUNT(*) FROM user_household_members m WHERE m.user_id = u.user_id AND m.is_active = TRUE) AS total_household_members,
    (SELECT COUNT(*) FROM user_household_members m WHERE m.user_id = u.user_id AND m.is_active = TRUE AND m.relationship = 'child') AS children_count,
    (SELECT COUNT(*) FROM user_emergency_contacts e WHERE e.user_id = u.user_id AND e.is_active = TRUE) AS emergency_contacts_count

FROM users u
WHERE u.is_active = TRUE;

COMMENT ON VIEW v_user_socioeconomic_summary IS 'Vista resumida de datos sociodemográficos de empleados';

-- =====================================================================================
-- PARTE 7: MIGRAR DATOS EXISTENTES (si hay dirección en formato texto)
-- =====================================================================================

-- Intentar parsear direcciones existentes básicas (solo si están vacías las nuevas)
UPDATE users
SET
    street_address = CASE
        WHEN address IS NOT NULL AND street_address IS NULL
        THEN TRIM(address)
        ELSE street_address
    END,
    country = COALESCE(country, 'Argentina')
WHERE address IS NOT NULL AND street_address IS NULL;

-- =====================================================================================
-- PARTE 8: FUNCIÓN HELPER PARA OBTENER DATOS COMPLETOS
-- =====================================================================================

CREATE OR REPLACE FUNCTION get_user_socioeconomic_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'address', jsonb_build_object(
            'street_address', u.street_address,
            'floor_apt', u.floor_apt,
            'neighborhood', u.neighborhood,
            'city', u.city,
            'province', u.province,
            'country', u.country,
            'postal_code', u.postal_code,
            'latitude', u.address_latitude,
            'longitude', u.address_longitude
        ),
        'housing', jsonb_build_object(
            'residence_type', u.residence_type,
            'housing_type', u.housing_type,
            'residence_since', u.residence_since,
            'previous_moves_5years', u.previous_moves_5years
        ),
        'household', jsonb_build_object(
            'size', u.household_size,
            'dependents_count', u.dependents_count,
            'lives_alone', u.lives_alone,
            'members', (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', m.id,
                    'full_name', m.full_name,
                    'relationship', m.relationship,
                    'birth_date', m.birth_date,
                    'is_dependent', m.is_dependent,
                    'is_cohabitant', m.is_cohabitant,
                    'has_disability', m.has_disability,
                    'education_level', m.education_level,
                    'works_externally', m.works_externally,
                    'is_covered_by_employee', m.is_covered_by_employee
                ) ORDER BY
                    CASE m.relationship
                        WHEN 'spouse' THEN 1
                        WHEN 'child' THEN 2
                        WHEN 'parent' THEN 3
                        ELSE 4
                    END
                ), '[]'::jsonb)
                FROM user_household_members m
                WHERE m.user_id = p_user_id AND m.is_active = TRUE
            )
        ),
        'commute', jsonb_build_object(
            'has_vehicle', u.has_vehicle,
            'vehicle_type', u.vehicle_type,
            'method', u.commute_method,
            'time_minutes', u.commute_time_minutes
        ),
        'emergency_contacts', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', e.id,
                'priority', e.priority,
                'full_name', e.full_name,
                'relationship', e.relationship,
                'phone_primary', e.phone_primary,
                'phone_secondary', e.phone_secondary,
                'email', e.email,
                'can_make_medical_decisions', e.can_make_medical_decisions,
                'special_instructions', e.special_instructions
            ) ORDER BY e.priority), '[]'::jsonb)
            FROM user_emergency_contacts e
            WHERE e.user_id = p_user_id AND e.is_active = TRUE
        )
    ) INTO result
    FROM users u
    WHERE u.user_id = p_user_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_socioeconomic_data IS 'Obtiene todos los datos sociodemográficos de un usuario en formato JSON';

-- =====================================================================================
-- FIN DE MIGRACIÓN
-- =====================================================================================

-- Log de migración
DO $$
BEGIN
    RAISE NOTICE '✅ Migración 20251217_user_socioeconomic_data completada exitosamente';
    RAISE NOTICE '   - Campos de dirección estructurada agregados a users';
    RAISE NOTICE '   - Campos de vivienda y hogar agregados a users';
    RAISE NOTICE '   - Tabla user_household_members creada';
    RAISE NOTICE '   - Tabla user_emergency_contacts creada';
    RAISE NOTICE '   - Vista v_user_socioeconomic_summary creada';
    RAISE NOTICE '   - Función get_user_socioeconomic_data creada';
END $$;
