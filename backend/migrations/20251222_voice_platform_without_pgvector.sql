/**
 * ============================================================================
 * VOICE PLATFORM - MIGRACIÓN SIN PGVECTOR
 * ============================================================================
 *
 * Versión alternativa sin dependencia de pgvector
 * Usa JSONB para almacenar embeddings (funcional, un poco más lento)
 *
 * @version 1.0.0
 * @date 2025-12-22
 * ============================================================================
 */

-- ============================================================================
-- TABLAS PRINCIPALES
-- ============================================================================

-- 1. EXPERIENCE CLUSTERS (primero, porque employee_experiences la referencia)

CREATE TABLE IF NOT EXISTS experience_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    name VARCHAR(200) NOT NULL,
    description TEXT,
    auto_generated BOOLEAN DEFAULT false,

    type VARCHAR(20),
    area VARCHAR(50),
    priority VARCHAR(20),

    -- Clustering info (centroid como JSONB)
    centroid_embedding JSONB,
    member_count INT DEFAULT 0,
    avg_sentiment FLOAT,

    -- Engagement agregado
    total_upvotes INT DEFAULT 0,
    total_downvotes INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. EMPLOYEE EXPERIENCES
CREATE TABLE IF NOT EXISTS employee_experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    employee_id UUID REFERENCES users(user_id) ON DELETE SET NULL,

    -- Contenido
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'SUGGESTION' CHECK (type IN ('SUGGESTION', 'PROBLEM', 'SOLUTION')),
    area VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),

    -- Estado
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_REVIEW', 'APPROVED', 'IN_PILOT', 'IMPLEMENTED', 'REJECTED', 'DUPLICATE')),
    visibility VARCHAR(20) DEFAULT 'ADMIN_ONLY' CHECK (visibility IN ('ANONYMOUS', 'ADMIN_ONLY', 'PUBLIC')),

    -- AI/ML Results (JSONB en vez de vector)
    embedding JSONB,
    topics JSONB,
    sentiment_score FLOAT,
    sentiment_label VARCHAR(20),

    -- Clustering
    cluster_id UUID REFERENCES experience_clusters(id) ON DELETE SET NULL,
    similarity_to_cluster FLOAT,
    is_cluster_original BOOLEAN DEFAULT false,

    -- Engagement
    upvotes INT DEFAULT 0,
    downvotes INT DEFAULT 0,
    comments_count INT DEFAULT 0,

    -- Implementación
    estimated_savings DECIMAL(12,2),
    actual_savings DECIMAL(12,2),
    implementation_notes TEXT,
    implementation_complete_date TIMESTAMP,
    safety_impact_notes TEXT,

    -- Gamificación
    total_points_awarded INT DEFAULT 0,
    badges_earned TEXT[],

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. EXPERIENCE VOTES
CREATE TABLE IF NOT EXISTS experience_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id UUID NOT NULL REFERENCES employee_experiences(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('UPVOTE', 'DOWNVOTE')),

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(experience_id, user_id)
);

-- 4. EXPERIENCE COMMENTS
CREATE TABLE IF NOT EXISTS experience_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id UUID NOT NULL REFERENCES employee_experiences(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES experience_comments(id) ON DELETE CASCADE,

    is_helpful BOOLEAN DEFAULT false,
    helpful_count INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. EXPERIENCE RECOGNITIONS
CREATE TABLE IF NOT EXISTS experience_recognitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id UUID NOT NULL REFERENCES employee_experiences(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    recognition_type VARCHAR(50) NOT NULL,
    points_awarded INT NOT NULL,
    badge_name VARCHAR(100),

    awarded_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. EXPERIENCE TOPICS
CREATE TABLE IF NOT EXISTS experience_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    keywords TEXT[],
    experience_count INT DEFAULT 0,
    avg_sentiment FLOAT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, name)
);

-- 7. VOICE GAMIFICATION CONFIG
CREATE TABLE IF NOT EXISTS voice_gamification_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, config_key)
);

-- 8. VOICE USER STATS
CREATE TABLE IF NOT EXISTS voice_user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    total_points INT DEFAULT 0,
    current_level VARCHAR(20) DEFAULT 'BRONZE',
    badges JSONB DEFAULT '[]'::jsonb,

    suggestions_submitted INT DEFAULT 0,
    suggestions_approved INT DEFAULT 0,
    suggestions_implemented INT DEFAULT 0,

    upvotes_received INT DEFAULT 0,
    downvotes_received INT DEFAULT 0,
    comments_made INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, company_id)
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

-- Experiences
CREATE INDEX IF NOT EXISTS idx_experiences_company ON employee_experiences(company_id);
CREATE INDEX IF NOT EXISTS idx_experiences_employee ON employee_experiences(employee_id);
CREATE INDEX IF NOT EXISTS idx_experiences_status ON employee_experiences(status);
CREATE INDEX IF NOT EXISTS idx_experiences_cluster ON employee_experiences(cluster_id);
CREATE INDEX IF NOT EXISTS idx_experiences_created ON employee_experiences(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_experiences_embedding ON employee_experiences USING GIN (embedding);

-- Clusters
CREATE INDEX IF NOT EXISTS idx_clusters_company ON experience_clusters(company_id);

-- Votes
CREATE INDEX IF NOT EXISTS idx_votes_experience ON experience_votes(experience_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON experience_votes(user_id);

-- Comments
CREATE INDEX IF NOT EXISTS idx_comments_experience ON experience_comments(experience_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON experience_comments(parent_comment_id);

-- Recognitions
CREATE INDEX IF NOT EXISTS idx_recognitions_experience ON experience_recognitions(experience_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_user ON experience_recognitions(user_id);

-- Stats
CREATE INDEX IF NOT EXISTS idx_stats_user_company ON voice_user_stats(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_stats_company ON voice_user_stats(company_id);
CREATE INDEX IF NOT EXISTS idx_stats_points ON voice_user_stats(total_points DESC);

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

-- 1. Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_voice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Incrementar contador de cluster
CREATE OR REPLACE FUNCTION increment_cluster_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cluster_id IS NOT NULL THEN
        UPDATE experience_clusters
        SET member_count = member_count + 1,
            updated_at = NOW()
        WHERE id = NEW.cluster_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Decrementar contador de cluster
CREATE OR REPLACE FUNCTION decrement_cluster_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.cluster_id IS NOT NULL THEN
        UPDATE experience_clusters
        SET member_count = GREATEST(member_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.cluster_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 4. Actualizar stats de usuario al crear experiencia
CREATE OR REPLACE FUNCTION update_user_stats_on_experience()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.employee_id IS NOT NULL THEN
        INSERT INTO voice_user_stats (user_id, company_id, suggestions_submitted)
        VALUES (NEW.employee_id, NEW.company_id, 1)
        ON CONFLICT (user_id, company_id)
        DO UPDATE SET
            suggestions_submitted = voice_user_stats.suggestions_submitted + 1,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Actualizar stats al cambiar estado
CREATE OR REPLACE FUNCTION update_user_stats_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status AND NEW.employee_id IS NOT NULL THEN
        IF NEW.status = 'APPROVED' THEN
            UPDATE voice_user_stats
            SET suggestions_approved = suggestions_approved + 1,
                updated_at = NOW()
            WHERE user_id = NEW.employee_id AND company_id = NEW.company_id;
        ELSIF NEW.status = 'IMPLEMENTED' THEN
            UPDATE voice_user_stats
            SET suggestions_implemented = suggestions_implemented + 1,
                updated_at = NOW()
            WHERE user_id = NEW.employee_id AND company_id = NEW.company_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
DROP TRIGGER IF EXISTS trg_experience_updated_at ON employee_experiences;
CREATE TRIGGER trg_experience_updated_at
    BEFORE UPDATE ON employee_experiences
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_updated_at();

DROP TRIGGER IF EXISTS trg_cluster_updated_at ON experience_clusters;
CREATE TRIGGER trg_cluster_updated_at
    BEFORE UPDATE ON experience_clusters
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_updated_at();

-- Cluster member count triggers
DROP TRIGGER IF EXISTS trg_increment_cluster_count ON employee_experiences;
CREATE TRIGGER trg_increment_cluster_count
    AFTER INSERT ON employee_experiences
    FOR EACH ROW
    EXECUTE FUNCTION increment_cluster_member_count();

DROP TRIGGER IF EXISTS trg_decrement_cluster_count ON employee_experiences;
CREATE TRIGGER trg_decrement_cluster_count
    AFTER DELETE ON employee_experiences
    FOR EACH ROW
    EXECUTE FUNCTION decrement_cluster_member_count();

-- User stats triggers
DROP TRIGGER IF EXISTS trg_user_stats_on_experience ON employee_experiences;
CREATE TRIGGER trg_user_stats_on_experience
    AFTER INSERT ON employee_experiences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_on_experience();

DROP TRIGGER IF EXISTS trg_user_stats_on_status ON employee_experiences;
CREATE TRIGGER trg_user_stats_on_status
    AFTER UPDATE ON employee_experiences
    FOR EACH ROW
    WHEN (NEW.status IS DISTINCT FROM OLD.status)
    EXECUTE FUNCTION update_user_stats_on_status_change();

-- ============================================================================
-- DATOS INICIALES
-- ============================================================================

-- Configuración default de gamificación
INSERT INTO voice_gamification_config (company_id, config_key, config_value)
SELECT company_id, 'default_points', '{
    "SUBMIT_SUGGESTION": 10,
    "SUBMIT_PROBLEM": 8,
    "SUBMIT_SOLUTION": 12,
    "UPVOTE_RECEIVED": 5,
    "SUGGESTION_APPROVED": 25,
    "SUGGESTION_IMPLEMENTED": 100,
    "CLUSTER_CONTRIBUTOR": 50
}'::jsonb
FROM companies
WHERE company_id IN (1, 4, 11)
ON CONFLICT (company_id, config_key) DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
    table_count INT;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'employee_experiences',
        'experience_clusters',
        'experience_votes',
        'experience_comments',
        'experience_recognitions',
        'experience_topics',
        'voice_gamification_config',
        'voice_user_stats'
    );

    RAISE NOTICE '✅ Tablas Voice Platform creadas: %', table_count;

    IF table_count = 8 THEN
        RAISE NOTICE '🎉 MIGRACIÓN VOICE PLATFORM COMPLETADA';
        RAISE NOTICE '📊 Sistema funcionando con JSONB (sin pgvector)';
        RAISE NOTICE '⚡ Performance: Buena (un poco más lento que pgvector)';
    ELSE
        RAISE EXCEPTION '❌ Error: Solo % de 8 tablas creadas', table_count;
    END IF;
END $$;
