-- =====================================================
-- Migration: Portal de Empleo Público - Candidate Profiles Pool
-- Date: 2025-12-22
-- Description: Tabla para candidatos que registran su CV
--              sin aplicar a oferta específica
-- =====================================================

-- Crear tipo ENUM para visibilidad si no existe
DO $$ BEGIN
    CREATE TYPE candidate_visibility AS ENUM ('public', 'hidden');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Crear tipo ENUM para status si no existe
DO $$ BEGIN
    CREATE TYPE candidate_pool_status AS ENUM ('active', 'inactive', 'hired');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Crear tabla principal
CREATE TABLE IF NOT EXISTS candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Autenticación simple
    email VARCHAR(255) UNIQUE NOT NULL,
    verification_code VARCHAR(6),
    verification_code_expires TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,

    -- Datos personales básicos
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    location JSONB DEFAULT '{}',

    -- Perfil profesional
    professional_title VARCHAR(255),
    years_experience INTEGER CHECK (years_experience >= 0 AND years_experience <= 50),
    skills JSONB DEFAULT '[]',
    education JSONB DEFAULT '[]',
    experience JSONB DEFAULT '[]',

    -- CV subido
    cv_file_path VARCHAR(500),
    cv_original_name VARCHAR(255),

    -- Preferencias laborales
    preferences JSONB DEFAULT '{}',

    -- Control de visibilidad y estado
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'hidden')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'hired')),

    -- Métricas
    last_login TIMESTAMP,
    profile_views INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidate_profiles(email);
CREATE INDEX IF NOT EXISTS idx_candidates_status_visibility ON candidate_profiles(status, visibility);
CREATE INDEX IF NOT EXISTS idx_candidates_skills ON candidate_profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_candidates_location ON candidate_profiles USING GIN(location);
CREATE INDEX IF NOT EXISTS idx_candidates_experience ON candidate_profiles(years_experience);
CREATE INDEX IF NOT EXISTS idx_candidates_verified ON candidate_profiles(is_verified) WHERE is_verified = TRUE;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_candidate_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_candidate_profiles_updated_at ON candidate_profiles;
CREATE TRIGGER trigger_candidate_profiles_updated_at
    BEFORE UPDATE ON candidate_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_candidate_profiles_updated_at();

-- Función helper para buscar candidatos por skills
CREATE OR REPLACE FUNCTION search_candidates_by_skills(
    p_skills TEXT[],
    p_min_experience INTEGER DEFAULT 0,
    p_location TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    full_name VARCHAR,
    professional_title VARCHAR,
    years_experience INTEGER,
    skills JSONB,
    location JSONB,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cp.id,
        cp.full_name,
        cp.professional_title,
        cp.years_experience,
        cp.skills,
        cp.location,
        cp.created_at
    FROM candidate_profiles cp
    WHERE cp.status = 'active'
      AND cp.visibility = 'public'
      AND cp.is_verified = TRUE
      AND (p_skills IS NULL OR cp.skills ?| p_skills)
      AND (cp.years_experience >= p_min_experience)
      AND (p_location IS NULL OR cp.location->>'city' ILIKE '%' || p_location || '%')
    ORDER BY cp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Función para estadísticas del pool
CREATE OR REPLACE FUNCTION get_candidate_pool_stats()
RETURNS TABLE (
    total_candidates BIGINT,
    verified_candidates BIGINT,
    active_public BIGINT,
    avg_experience NUMERIC,
    top_skills JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_candidates,
        COUNT(*) FILTER (WHERE is_verified = TRUE)::BIGINT as verified_candidates,
        COUNT(*) FILTER (WHERE status = 'active' AND visibility = 'public' AND is_verified = TRUE)::BIGINT as active_public,
        ROUND(AVG(years_experience)::NUMERIC, 1) as avg_experience,
        (
            SELECT jsonb_agg(skill_count)
            FROM (
                SELECT jsonb_build_object('skill', skill, 'count', COUNT(*)) as skill_count
                FROM candidate_profiles, jsonb_array_elements_text(skills) AS skill
                WHERE status = 'active' AND visibility = 'public'
                GROUP BY skill
                ORDER BY COUNT(*) DESC
                LIMIT 10
            ) top
        ) as top_skills
    FROM candidate_profiles;
END;
$$ LANGUAGE plpgsql;

-- Comentarios de documentación
COMMENT ON TABLE candidate_profiles IS 'Pool de candidatos para Portal de Empleo Público';
COMMENT ON COLUMN candidate_profiles.verification_code IS 'Código de 6 dígitos enviado por email para verificación';
COMMENT ON COLUMN candidate_profiles.skills IS 'Array JSON de habilidades técnicas y blandas';
COMMENT ON COLUMN candidate_profiles.preferences IS 'Preferencias: {salary_expectation, work_mode, availability, willing_to_relocate}';
COMMENT ON COLUMN candidate_profiles.visibility IS 'public: visible en pool, hidden: solo para postulaciones directas';
COMMENT ON COLUMN candidate_profiles.profile_views IS 'Contador de veces que empresas vieron este perfil';

-- Datos de ejemplo (comentados, descomentar para testing)
/*
INSERT INTO candidate_profiles (email, is_verified, full_name, professional_title, years_experience, skills, location, preferences)
VALUES
    ('candidato1@example.com', TRUE, 'Juan Pérez', 'Desarrollador Full Stack', 5,
     '["JavaScript", "React", "Node.js", "PostgreSQL"]'::JSONB,
     '{"city": "Buenos Aires", "province": "CABA", "country": "Argentina"}'::JSONB,
     '{"salary_expectation": 2500, "work_mode": "remote", "availability": "immediate"}'::JSONB),

    ('candidato2@example.com', TRUE, 'María García', 'Diseñadora UX/UI', 3,
     '["Figma", "Adobe XD", "CSS", "Design Systems"]'::JSONB,
     '{"city": "Córdoba", "province": "Córdoba", "country": "Argentina"}'::JSONB,
     '{"salary_expectation": 2000, "work_mode": "hybrid", "availability": "2_weeks"}'::JSONB);
*/

SELECT 'Migration candidate_profiles_pool completed successfully' as status;
