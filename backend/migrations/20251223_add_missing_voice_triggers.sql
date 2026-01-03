-- =============================================================================
-- VOICE PLATFORM - TRIGGERS FALTANTES PARA STATS
-- Fecha: 2025-12-23
-- Propósito: Actualizar voice_user_stats cuando hay votos y comentarios
-- =============================================================================

-- =============================================================================
-- 1. FUNCIÓN: Actualizar stats cuando se crea un VOTO
-- =============================================================================
CREATE OR REPLACE FUNCTION update_user_stats_on_vote()
RETURNS TRIGGER AS $$
DECLARE
  experience_author_id UUID;
  voter_company_id INT;
BEGIN
  -- Obtener el autor de la experiencia y su company_id
  SELECT employee_id, company_id INTO experience_author_id, voter_company_id
  FROM employee_experiences
  WHERE id = NEW.experience_id;

  -- Si la experiencia tiene autor (no es anónima)
  IF experience_author_id IS NOT NULL THEN

    -- Actualizar upvotes_received o downvotes_received del AUTOR
    IF NEW.vote_type = 'UPVOTE' THEN
      UPDATE voice_user_stats
      SET upvotes_received = upvotes_received + 1,
          updated_at = NOW()
      WHERE user_id = experience_author_id
        AND company_id = voter_company_id;
    ELSIF NEW.vote_type = 'DOWNVOTE' THEN
      UPDATE voice_user_stats
      SET downvotes_received = downvotes_received + 1,
          updated_at = NOW()
      WHERE user_id = experience_author_id
        AND company_id = voter_company_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. FUNCIÓN: Actualizar stats cuando se ELIMINA un VOTO
-- =============================================================================
CREATE OR REPLACE FUNCTION update_user_stats_on_vote_delete()
RETURNS TRIGGER AS $$
DECLARE
  experience_author_id UUID;
  voter_company_id INT;
BEGIN
  -- Obtener el autor de la experiencia
  SELECT employee_id, company_id INTO experience_author_id, voter_company_id
  FROM employee_experiences
  WHERE id = OLD.experience_id;

  -- Si la experiencia tiene autor (no es anónima)
  IF experience_author_id IS NOT NULL THEN

    -- Decrementar upvotes_received o downvotes_received del AUTOR
    IF OLD.vote_type = 'UPVOTE' THEN
      UPDATE voice_user_stats
      SET upvotes_received = GREATEST(0, upvotes_received - 1),
          updated_at = NOW()
      WHERE user_id = experience_author_id
        AND company_id = voter_company_id;
    ELSIF OLD.vote_type = 'DOWNVOTE' THEN
      UPDATE voice_user_stats
      SET downvotes_received = GREATEST(0, downvotes_received - 1),
          updated_at = NOW()
      WHERE user_id = experience_author_id
        AND company_id = voter_company_id;
    END IF;

  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. FUNCIÓN: Actualizar stats cuando se crea un COMENTARIO
-- =============================================================================
CREATE OR REPLACE FUNCTION update_user_stats_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el comentario tiene autor (no es anónimo)
  IF NEW.user_id IS NOT NULL THEN

    -- Incrementar comments_made del COMENTARISTA
    UPDATE voice_user_stats
    SET comments_made = comments_made + 1,
        updated_at = NOW()
    WHERE user_id = NEW.user_id
      AND company_id = NEW.company_id;

    -- Si no existe el registro, crear uno
    INSERT INTO voice_user_stats (user_id, company_id, comments_made)
    VALUES (NEW.user_id, NEW.company_id, 1)
    ON CONFLICT (user_id, company_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. FUNCIÓN: Actualizar stats cuando se ELIMINA un COMENTARIO
-- =============================================================================
CREATE OR REPLACE FUNCTION update_user_stats_on_comment_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el comentario tiene autor
  IF OLD.user_id IS NOT NULL THEN

    -- Decrementar comments_made del COMENTARISTA
    UPDATE voice_user_stats
    SET comments_made = GREATEST(0, comments_made - 1),
        updated_at = NOW()
    WHERE user_id = OLD.user_id
      AND company_id = OLD.company_id;

  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. CREAR TRIGGERS
-- =============================================================================

-- Trigger para VOTOS (INSERT)
DROP TRIGGER IF EXISTS trg_user_stats_on_vote ON experience_votes;
CREATE TRIGGER trg_user_stats_on_vote
  AFTER INSERT ON experience_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_vote();

-- Trigger para VOTOS (DELETE)
DROP TRIGGER IF EXISTS trg_user_stats_on_vote_delete ON experience_votes;
CREATE TRIGGER trg_user_stats_on_vote_delete
  AFTER DELETE ON experience_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_vote_delete();

-- Trigger para COMENTARIOS (INSERT)
DROP TRIGGER IF EXISTS trg_user_stats_on_comment ON experience_comments;
CREATE TRIGGER trg_user_stats_on_comment
  AFTER INSERT ON experience_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_comment();

-- Trigger para COMENTARIOS (DELETE)
DROP TRIGGER IF EXISTS trg_user_stats_on_comment_delete ON experience_comments;
CREATE TRIGGER trg_user_stats_on_comment_delete
  AFTER DELETE ON experience_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_comment_delete();

-- =============================================================================
-- 6. VERIFICACIÓN
-- =============================================================================

SELECT 'Triggers creados exitosamente:' AS status;
SELECT tgname AS trigger_name, relname AS table_name
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE tgname IN (
  'trg_user_stats_on_vote',
  'trg_user_stats_on_vote_delete',
  'trg_user_stats_on_comment',
  'trg_user_stats_on_comment_delete'
)
ORDER BY relname, tgname;
