-- ENTERPRISE FEATURES: Visitors Module
-- Mejoras de nivel enterprise para control de visitantes multi-tenant

-- 1. Agregar categoría de visitante (para políticas de seguridad diferenciadas)
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS visitor_category VARCHAR(50) DEFAULT 'standard';

COMMENT ON COLUMN visitors.visitor_category IS 'Categoría del visitante: vip, contractor, auditor, medical, delivery, standard, other';

-- 2. Agregar número de badge (para badges físicos impresos)
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS badge_number VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS idx_visitors_badge_number 
ON visitors(badge_number) 
WHERE badge_number IS NOT NULL AND is_active = true;

COMMENT ON COLUMN visitors.badge_number IS 'Número del badge físico impreso (único por visita activa)';

-- 3. Agregar nivel de clearance de seguridad (para zonas restringidas)
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS security_clearance_level INT DEFAULT 1;

COMMENT ON COLUMN visitors.security_clearance_level IS 'Nivel de clearance: 1=público, 2=restringido, 3=confidencial, 4=secreto';

-- 4. Agregar audit trail para autorizaciones
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS audit_reason TEXT,
ADD COLUMN IF NOT EXISTS audit_ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS audit_user_agent TEXT;

COMMENT ON COLUMN visitors.audit_reason IS 'Razón documentada de autorización/rechazo';
COMMENT ON COLUMN visitors.audit_ip_address IS 'IP desde donde se autorizó/rechazó';
COMMENT ON COLUMN visitors.audit_user_agent IS 'User agent del navegador que autorizó';

-- 5. Agregar timestamps de última actualización de status
ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS status_updated_by INT REFERENCES users(id);

COMMENT ON COLUMN visitors.status_updated_at IS 'Última vez que cambió el authorization_status';
COMMENT ON COLUMN visitors.status_updated_by IS 'Quién cambió el status por última vez';

-- 6. Índices para performance en queries enterprise
CREATE INDEX IF NOT EXISTS idx_visitors_category 
ON visitors(visitor_category) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_visitors_clearance 
ON visitors(security_clearance_level) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_visitors_scheduled_date_range 
ON visitors(scheduled_visit_date, company_id) 
WHERE is_active = true;

-- 7. Vista materializada para analytics de visitantes por empresa
CREATE OR REPLACE VIEW visitor_analytics_by_company AS
SELECT 
  v.company_id,
  c.name as company_name,
  COUNT(*) as total_visitors,
  COUNT(*) FILTER (WHERE v.authorization_status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE v.authorization_status = 'authorized') as authorized_count,
  COUNT(*) FILTER (WHERE v.authorization_status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE v.authorization_status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE v.check_in IS NOT NULL AND v.check_out IS NULL) as currently_inside,
  COUNT(*) FILTER (WHERE v.visitor_category = 'vip') as vip_count,
  COUNT(*) FILTER (WHERE v.visitor_category = 'contractor') as contractor_count,
  COUNT(*) FILTER (WHERE v.gps_tracking_enabled = true) as gps_enabled_count,
  AVG(EXTRACT(EPOCH FROM (v.check_out - v.check_in))/60) as avg_visit_duration_minutes,
  MAX(v.created_at) as last_visitor_created_at
FROM visitors v
JOIN companies c ON v.company_id = c.id
WHERE v.is_active = true
GROUP BY v.company_id, c.name;

COMMENT ON VIEW visitor_analytics_by_company IS 'Analytics de visitantes agrupados por empresa (multi-tenant)';

-- 8. Función para auto-generar badge numbers
CREATE OR REPLACE FUNCTION generate_visitor_badge_number(p_company_id INT)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR := 'BADGE';
  v_number INT;
  v_badge_number VARCHAR;
BEGIN
  -- Obtener el siguiente número secuencial para la empresa
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(badge_number, '[^0-9]', '', 'g'), '')::INT
  ), 0) + 1
  INTO v_number
  FROM visitors
  WHERE company_id = p_company_id
  AND badge_number IS NOT NULL;

  -- Formato: BADGE-{company_id}-{number}
  v_badge_number := v_prefix || '-' || p_company_id || '-' || LPAD(v_number::TEXT, 6, '0');

  RETURN v_badge_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_visitor_badge_number IS 'Genera número de badge único por empresa (multi-tenant safe)';

-- 9. Trigger para auto-actualizar status_updated_at
CREATE OR REPLACE FUNCTION update_visitor_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.authorization_status IS DISTINCT FROM NEW.authorization_status) THEN
    NEW.status_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_visitor_status_timestamp ON visitors;
CREATE TRIGGER trg_visitor_status_timestamp
BEFORE UPDATE ON visitors
FOR EACH ROW
EXECUTE FUNCTION update_visitor_status_timestamp();

-- 10. Función para validar visitor_category
CREATE OR REPLACE FUNCTION validate_visitor_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visitor_category NOT IN ('vip', 'contractor', 'auditor', 'medical', 'delivery', 'standard', 'other') THEN
    RAISE EXCEPTION 'Invalid visitor_category: %. Must be one of: vip, contractor, auditor, medical, delivery, standard, other', NEW.visitor_category;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_visitor_category ON visitors;
CREATE TRIGGER trg_validate_visitor_category
BEFORE INSERT OR UPDATE ON visitors
FOR EACH ROW
WHEN (NEW.visitor_category IS NOT NULL)
EXECUTE FUNCTION validate_visitor_category();

-- Insertar log de migración
INSERT INTO migration_log (migration_name, executed_at, description)
VALUES (
  '20260102_visitors_enterprise_features',
  NOW(),
  'ENTERPRISE: visitor_category, badge_number, security_clearance, audit_trail, analytics view'
) ON CONFLICT DO NOTHING;
