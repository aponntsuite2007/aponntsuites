const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está configurado');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function executeMigration() {
  const client = await pool.connect();

  try {
    console.log('🔌 Conectado a la base de datos de Render');

    // Versión con UUID para Render
    const migrationSQL = `
-- Crear tabla de sanciones disciplinarias (UUID version para Render)
CREATE TABLE IF NOT EXISTS sanctions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
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
  created_by UUID NOT NULL REFERENCES users(user_id),
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
    `;

    console.log('📄 Ejecutando migración de sanctions (UUID version)...');
    await client.query(migrationSQL);

    console.log('✅ Migración de sanctions ejecutada exitosamente');

    // Verificar
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'sanctions'
      );
    `);

    if (result.rows[0].exists) {
      console.log('✅ Tabla sanctions verificada');
      const count = await client.query('SELECT COUNT(*) FROM sanctions');
      console.log(`📊 Registros actuales en sanctions: ${count.rows[0].count}`);
    }

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

executeMigration();
