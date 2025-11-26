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

    // Solo crear la tabla kiosks sin las vistas ni funciones complejas
    const createTableSQL = `
-- Tabla de Kiosks
CREATE TABLE IF NOT EXISTS kiosks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    device_id VARCHAR(100) UNIQUE,
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(11, 8),
    is_configured BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    -- Constraints
    CONSTRAINT kiosks_unique_name_per_company UNIQUE (name, company_id),
    CONSTRAINT kiosks_gps_lat_range CHECK (gps_lat >= -90 AND gps_lat <= 90),
    CONSTRAINT kiosks_gps_lng_range CHECK (gps_lng >= -180 AND gps_lng <= 180),
    CONSTRAINT kiosks_both_gps_or_none CHECK (
        (gps_lat IS NULL AND gps_lng IS NULL) OR
        (gps_lat IS NOT NULL AND gps_lng IS NOT NULL)
    )
);

-- Índices para kiosks
CREATE INDEX IF NOT EXISTS idx_kiosks_company_id ON kiosks(company_id);
CREATE INDEX IF NOT EXISTS idx_kiosks_is_active ON kiosks(is_active);
CREATE INDEX IF NOT EXISTS idx_kiosks_is_configured ON kiosks(is_configured);
CREATE INDEX IF NOT EXISTS idx_kiosks_gps ON kiosks(gps_lat, gps_lng) WHERE gps_lat IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_kiosks_unique_gps_per_company ON kiosks(gps_lat, gps_lng, company_id)
    WHERE gps_lat IS NOT NULL AND gps_lng IS NOT NULL AND deleted_at IS NULL;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_kiosks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    IF NEW.name IS NOT NULL AND NEW.gps_lat IS NOT NULL AND NEW.gps_lng IS NOT NULL THEN
        NEW.is_configured = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_kiosks_timestamp ON kiosks;
CREATE TRIGGER trigger_update_kiosks_timestamp
    BEFORE UPDATE ON kiosks
    FOR EACH ROW
    EXECUTE FUNCTION update_kiosks_timestamp();
    `;

    console.log('📄 Ejecutando migración simplificada de kiosks...');
    await client.query(createTableSQL);

    console.log('✅ Migración de kiosks ejecutada exitosamente');

    // Verificar
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'kiosks'
      );
    `);

    if (result.rows[0].exists) {
      console.log('✅ Tabla kiosks verificada');
      const count = await client.query('SELECT COUNT(*) FROM kiosks');
      console.log(`📊 Registros actuales en kiosks: ${count.rows[0].count}`);
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
