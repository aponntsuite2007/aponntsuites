-- Crear tabla de sanciones disciplinarias
CREATE TABLE IF NOT EXISTS sanctions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  employee_name VARCHAR(255) NOT NULL,
  employee_department VARCHAR(255),
  sanction_type VARCHAR(50) NOT NULL CHECK (sanction_type IN ('attendance', 'training', 'behavior', 'performance', 'safety', 'other')),
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('warning', 'minor', 'major', 'suspension', 'termination')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  sanction_date TIMESTAMP NOT NULL DEFAULT NOW(),
  expiration_date TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'appealed', 'expired', 'revoked')),
  points_deducted INTEGER DEFAULT 0,
  is_automatic BOOLEAN DEFAULT FALSE,
  created_by INTEGER NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_sanctions_company ON sanctions(company_id);
CREATE INDEX IF NOT EXISTS idx_sanctions_employee ON sanctions(employee_id);
CREATE INDEX IF NOT EXISTS idx_sanctions_status ON sanctions(status);
CREATE INDEX IF NOT EXISTS idx_sanctions_date ON sanctions(sanction_date);

-- Comentarios
COMMENT ON TABLE sanctions IS 'Sistema de gestión de sanciones disciplinarias multi-tenant';
COMMENT ON COLUMN sanctions.sanction_type IS 'Tipo de sanción: attendance, training, behavior, performance, safety, other';
COMMENT ON COLUMN sanctions.severity IS 'Severidad: warning, minor, major, suspension, termination';
COMMENT ON COLUMN sanctions.status IS 'Estado: active, appealed, expired, revoked';
COMMENT ON COLUMN sanctions.points_deducted IS 'Puntos deducidos del scoring del empleado';
COMMENT ON COLUMN sanctions.is_automatic IS 'TRUE si fue generada automáticamente por el sistema';
