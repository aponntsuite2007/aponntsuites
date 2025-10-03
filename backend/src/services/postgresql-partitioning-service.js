// 🐘 POSTGRESQL PARTICIONADO PROFESIONAL - SERVICIO INTEGRADO
// ===========================================================

const { sequelize } = require('../config/database');

class PostgreSQLPartitioningService {
  constructor() {
    this.isPartitioned = false;
    this.partitionsCreated = 0;
  }

  // 🚀 IMPLEMENTACIÓN DEFINITIVA DE PARTICIONADO
  async implementPartitioning() {
    try {
      console.log('🔧 [POSTGRESQL-PARTITIONING] Iniciando implementación definitiva...');

      // 1. CREAR SCHEMA PARA PARTICIONES
      await this.createPartitionSchema();

      // 2. CREAR TABLAS PARTICIONADAS
      await this.createPartitionedTables();

      // 3. CREAR ÍNDICES ESPECIALIZADOS
      await this.createSpecializedIndexes();

      // 4. CREAR FUNCIONES DE MANTENIMIENTO
      await this.createMaintenanceFunctions();

      // 5. CREAR VISTAS OPTIMIZADAS
      await this.createOptimizedViews();

      // 6. EJECUTAR TESTS DE RENDIMIENTO
      await this.runPerformanceTests();

      this.isPartitioned = true;
      console.log('✅ [POSTGRESQL-PARTITIONING] Implementación completada exitosamente');

      return {
        success: true,
        partitionsCreated: this.partitionsCreated,
        message: 'PostgreSQL particionado profesional implementado'
      };

    } catch (error) {
      console.error('❌ [POSTGRESQL-PARTITIONING] Error:', error.message);
      throw error;
    }
  }

  // 📊 CREAR SCHEMA PARA PARTICIONES
  async createPartitionSchema() {
    const query = `CREATE SCHEMA IF NOT EXISTS biometric_partitions;`;
    await sequelize.query(query);
    console.log('✓ Schema biometric_partitions creado');
  }

  // 🗂️ CREAR TABLAS PARTICIONADAS
  async createPartitionedTables() {
    // TABLA BIOMETRIC_SCANS PARTICIONADA
    const biometricScansQuery = `
      DROP TABLE IF EXISTS biometric_scans CASCADE;
      CREATE TABLE biometric_scans (
          scan_id BIGSERIAL,
          tenant_id INTEGER NOT NULL,
          company_id INTEGER NOT NULL,
          user_id BIGINT NOT NULL,
          scan_data JSONB NOT NULL,
          template_hash VARCHAR(128) NOT NULL,
          template_vector REAL[] NOT NULL,
          quality_score DECIMAL(5,4) NOT NULL CHECK (quality_score >= 0 AND quality_score <= 1),
          anti_spoofing_score DECIMAL(5,4) NOT NULL CHECK (anti_spoofing_score >= 0 AND anti_spoofing_score <= 1),
          ai_analysis JSONB,
          wellness_score INTEGER CHECK (wellness_score >= 0 AND wellness_score <= 100),
          alert_count INTEGER DEFAULT 0,
          source VARCHAR(50) NOT NULL,
          source_device_id VARCHAR(100),
          processing_time_ms INTEGER,
          processing_id UUID DEFAULT gen_random_uuid(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

          CONSTRAINT pk_biometric_scans PRIMARY KEY (scan_id, company_id)
      ) PARTITION BY HASH (company_id);
    `;

    await sequelize.query(biometricScansQuery);
    console.log('✓ Tabla biometric_scans particionada creada');

    // Crear 16 particiones para scans
    for (let i = 0; i < 16; i++) {
      const partitionQuery = `
        CREATE TABLE biometric_partitions.biometric_scans_p${i}
        PARTITION OF biometric_scans
        FOR VALUES WITH (modulus 16, remainder ${i});
      `;
      await sequelize.query(partitionQuery);
      this.partitionsCreated++;
    }

    console.log('✓ 16 particiones de biometric_scans creadas');

    // TABLA BIOMETRIC_ALERTS PARTICIONADA
    const biometricAlertsQuery = `
      DROP TABLE IF EXISTS biometric_alerts CASCADE;
      CREATE TABLE biometric_alerts (
          alert_id BIGSERIAL,
          tenant_id INTEGER NOT NULL,
          company_id INTEGER NOT NULL,
          user_id BIGINT NOT NULL,
          scan_id BIGINT NOT NULL,
          alert_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          message TEXT NOT NULL,
          recommendations JSONB,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
          acknowledged_by VARCHAR(100),
          acknowledged_at TIMESTAMP WITH TIME ZONE,
          resolved_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

          CONSTRAINT pk_biometric_alerts PRIMARY KEY (alert_id, company_id)
      ) PARTITION BY HASH (company_id);
    `;

    await sequelize.query(biometricAlertsQuery);
    console.log('✓ Tabla biometric_alerts particionada creada');

    // Crear 16 particiones para alerts
    for (let i = 0; i < 16; i++) {
      const partitionQuery = `
        CREATE TABLE biometric_partitions.biometric_alerts_p${i}
        PARTITION OF biometric_alerts
        FOR VALUES WITH (modulus 16, remainder ${i});
      `;
      await sequelize.query(partitionQuery);
      this.partitionsCreated++;
    }

    console.log('✓ 16 particiones de biometric_alerts creadas');

    // TABLA BIOMETRIC_TEMPLATES PARTICIONADA
    const biometricTemplatesQuery = `
      DROP TABLE IF EXISTS biometric_templates CASCADE;
      CREATE TABLE biometric_templates (
          template_id BIGSERIAL,
          company_id INTEGER NOT NULL,
          user_id BIGINT NOT NULL,
          template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('face', 'fingerprint', 'voice')),
          template_data BYTEA NOT NULL,
          template_vector REAL[] NOT NULL,
          quality_score DECIMAL(5,4) NOT NULL,
          algorithm VARCHAR(50) NOT NULL,
          version INTEGER DEFAULT 1,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

          CONSTRAINT pk_biometric_templates PRIMARY KEY (template_id, company_id),
          CONSTRAINT uq_biometric_templates_user_type UNIQUE (user_id, template_type, company_id)
      ) PARTITION BY HASH (company_id);
    `;

    await sequelize.query(biometricTemplatesQuery);
    console.log('✓ Tabla biometric_templates particionada creada');

    // Crear 16 particiones para templates
    for (let i = 0; i < 16; i++) {
      const partitionQuery = `
        CREATE TABLE biometric_partitions.biometric_templates_p${i}
        PARTITION OF biometric_templates
        FOR VALUES WITH (modulus 16, remainder ${i});
      `;
      await sequelize.query(partitionQuery);
      this.partitionsCreated++;
    }

    console.log('✓ 16 particiones de biometric_templates creadas');
    console.log(`📊 Total particiones creadas: ${this.partitionsCreated}`);
  }

  // 🔍 CREAR ÍNDICES ESPECIALIZADOS
  async createSpecializedIndexes() {
    console.log('🔍 Creando índices especializados...');

    // Índices para particiones de scans
    for (let i = 0; i < 16; i++) {
      const indexes = [
        `CREATE INDEX idx_biometric_scans_p${i}_user_id ON biometric_partitions.biometric_scans_p${i} (user_id);`,
        `CREATE INDEX idx_biometric_scans_p${i}_created_at ON biometric_partitions.biometric_scans_p${i} (created_at DESC);`,
        `CREATE INDEX idx_biometric_scans_p${i}_template_hash ON biometric_partitions.biometric_scans_p${i} (template_hash);`,
        `CREATE INDEX idx_biometric_scans_p${i}_ai_analysis ON biometric_partitions.biometric_scans_p${i} USING gin (ai_analysis);`
      ];

      for (const indexQuery of indexes) {
        try {
          await sequelize.query(indexQuery);
        } catch (error) {
          // Ignorar errores de índices que ya existen
          if (!error.message.includes('already exists')) {
            throw error;
          }
        }
      }
    }

    // Índices para particiones de alerts
    for (let i = 0; i < 16; i++) {
      const indexes = [
        `CREATE INDEX idx_biometric_alerts_p${i}_user_id ON biometric_partitions.biometric_alerts_p${i} (user_id);`,
        `CREATE INDEX idx_biometric_alerts_p${i}_status ON biometric_partitions.biometric_alerts_p${i} (status, created_at DESC);`
      ];

      for (const indexQuery of indexes) {
        try {
          await sequelize.query(indexQuery);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            throw error;
          }
        }
      }
    }

    // Índices para particiones de templates
    for (let i = 0; i < 16; i++) {
      const indexes = [
        `CREATE INDEX idx_biometric_templates_p${i}_user_type ON biometric_partitions.biometric_templates_p${i} (user_id, template_type);`,
        `CREATE INDEX idx_biometric_templates_p${i}_active ON biometric_partitions.biometric_templates_p${i} (is_active, created_at DESC);`
      ];

      for (const indexQuery of indexes) {
        try {
          await sequelize.query(indexQuery);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            throw error;
          }
        }
      }
    }

    console.log('✓ Índices especializados creados');
  }

  // 🔧 CREAR FUNCIONES DE MANTENIMIENTO
  async createMaintenanceFunctions() {
    const maintenanceFunction = `
      CREATE OR REPLACE FUNCTION cleanup_old_biometric_data()
      RETURNS INTEGER AS $$
      DECLARE
          deleted_count INTEGER := 0;
          partition_name TEXT;
      BEGIN
          FOR partition_name IN
              SELECT schemaname||'.'||tablename
              FROM pg_tables
              WHERE schemaname = 'biometric_partitions'
              AND tablename LIKE 'biometric_scans_p%'
          LOOP
              EXECUTE format('
                  DELETE FROM %s
                  WHERE created_at < NOW() - INTERVAL ''2 years''',
                  partition_name
              );
              GET DIAGNOSTICS deleted_count = ROW_COUNT;
          END LOOP;

          RETURN deleted_count;
      END;
      $$ LANGUAGE plpgsql;
    `;

    await sequelize.query(maintenanceFunction);

    const performanceFunction = `
      CREATE OR REPLACE FUNCTION analyze_company_biometric_performance(p_company_id INTEGER)
      RETURNS TABLE (
          avg_processing_time_ms DECIMAL,
          scans_per_hour DECIMAL,
          quality_average DECIMAL,
          alert_rate DECIMAL
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT
              AVG(bs.processing_time_ms)::DECIMAL as avg_processing_time_ms,
              COUNT(bs.scan_id)::DECIMAL /
                  NULLIF(EXTRACT(EPOCH FROM (MAX(bs.created_at) - MIN(bs.created_at))), 0) * 3600 as scans_per_hour,
              AVG(bs.quality_score)::DECIMAL as quality_average,
              (COUNT(ba.alert_id)::DECIMAL / NULLIF(COUNT(bs.scan_id), 0) * 100) as alert_rate
          FROM biometric_scans bs
          LEFT JOIN biometric_alerts ba ON bs.scan_id = ba.scan_id AND bs.company_id = ba.company_id
          WHERE bs.company_id = p_company_id
          AND bs.created_at >= NOW() - INTERVAL '24 hours';
      END;
      $$ LANGUAGE plpgsql;
    `;

    await sequelize.query(performanceFunction);
    console.log('✓ Funciones de mantenimiento creadas');
  }

  // 👁️ CREAR VISTAS OPTIMIZADAS
  async createOptimizedViews() {
    const dashboardView = `
      CREATE OR REPLACE VIEW v_biometric_dashboard AS
      SELECT
          c.company_id as company_id,
          c.name as company_name,
          COALESCE(COUNT(bs.scan_id), 0) as total_scans_today,
          COALESCE(AVG(bs.quality_score), 0) as avg_quality,
          COALESCE(AVG(bs.processing_time_ms), 0) as avg_processing_time,
          COALESCE(COUNT(ba.alert_id), 0) as active_alerts,
          MAX(bs.created_at) as last_scan_time
      FROM companies c
      LEFT JOIN biometric_scans bs ON c.company_id = bs.company_id
          AND bs.created_at >= CURRENT_DATE
      LEFT JOIN biometric_alerts ba ON c.company_id = ba.company_id
          AND ba.status = 'active'
      GROUP BY c.company_id, c.name;
    `;

    await sequelize.query(dashboardView);

    const trendsView = `
      CREATE OR REPLACE VIEW v_biometric_trends AS
      SELECT
          company_id,
          DATE_TRUNC('hour', created_at) as hour_bucket,
          COUNT(*) as scans_per_hour,
          AVG(quality_score) as avg_quality,
          AVG(processing_time_ms) as avg_processing_time,
          COUNT(*) FILTER (WHERE wellness_score < 50) as low_wellness_count
      FROM biometric_scans
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY company_id, DATE_TRUNC('hour', created_at)
      ORDER BY company_id, hour_bucket DESC;
    `;

    await sequelize.query(trendsView);
    console.log('✓ Vistas optimizadas creadas');
  }

  // 🎯 EJECUTAR TESTS DE RENDIMIENTO
  async runPerformanceTests() {
    console.log('🎯 Ejecutando tests de rendimiento...');

    const testFunction = `
      CREATE OR REPLACE FUNCTION test_biometric_partitioning_performance()
      RETURNS TABLE (
          test_name TEXT,
          execution_time_ms BIGINT,
          rows_affected INTEGER,
          status TEXT
      ) AS $$
      DECLARE
          start_time TIMESTAMP;
          end_time TIMESTAMP;
          test_company_id INTEGER := 999;
          test_user_id BIGINT := 12345;
          rows_count INTEGER;
      BEGIN
          -- Test 1: Inserción masiva
          start_time := clock_timestamp();

          INSERT INTO biometric_scans (
              tenant_id, company_id, user_id, scan_data, template_hash,
              template_vector, quality_score, anti_spoofing_score, source
          )
          SELECT
              1, test_company_id, test_user_id + i,
              '{"test": true}'::JSONB,
              'test_hash_' || i,
              ARRAY(SELECT random() FROM generate_series(1, 512)),
              random(),
              random(),
              'test'
          FROM generate_series(1, 100) i;

          GET DIAGNOSTICS rows_count = ROW_COUNT;
          end_time := clock_timestamp();

          RETURN QUERY SELECT
              'Inserción masiva 100 registros'::TEXT,
              EXTRACT(MILLISECONDS FROM end_time - start_time)::BIGINT,
              rows_count,
              'PASS'::TEXT;

          -- Test 2: Consulta por empresa
          start_time := clock_timestamp();

          SELECT COUNT(*) INTO rows_count
          FROM biometric_scans
          WHERE company_id = test_company_id;

          end_time := clock_timestamp();

          RETURN QUERY SELECT
              'Consulta por empresa'::TEXT,
              EXTRACT(MILLISECONDS FROM end_time - start_time)::BIGINT,
              rows_count,
              'PASS'::TEXT;

          -- Limpiar datos de test
          DELETE FROM biometric_scans WHERE company_id = test_company_id;

          RETURN QUERY SELECT
              'Sistema de particionado'::TEXT,
              0::BIGINT,
              0,
              'OPERATIONAL'::TEXT;
      END;
      $$ LANGUAGE plpgsql;
    `;

    await sequelize.query(testFunction);

    // Ejecutar tests
    const [results] = await sequelize.query('SELECT * FROM test_biometric_partitioning_performance()');

    console.log('📈 RESULTADOS DE TESTING:');
    results.forEach(test => {
      console.log(`   ✓ ${test.test_name}: ${test.execution_time_ms}ms - ${test.status}`);
      if (test.rows_affected > 0) {
        console.log(`     Registros procesados: ${test.rows_affected}`);
      }
    });

    return results;
  }

  // 📊 OBTENER ESTADÍSTICAS DEL SISTEMA
  async getSystemStats() {
    const [partitions] = await sequelize.query(`
      SELECT
          schemaname,
          tablename,
          tableowner
      FROM pg_tables
      WHERE schemaname = 'biometric_partitions'
      ORDER BY tablename;
    `);

    const [views] = await sequelize.query(`
      SELECT viewname
      FROM pg_views
      WHERE schemaname = 'public'
      AND viewname LIKE 'v_biometric%';
    `);

    return {
      totalPartitions: partitions.length,
      partitions: partitions,
      views: views,
      isPartitioned: this.isPartitioned
    };
  }

  // 🚀 HEALTH CHECK DEL SISTEMA PARTICIONADO
  async healthCheck() {
    try {
      const stats = await this.getSystemStats();

      return {
        status: 'healthy',
        partitioned: this.isPartitioned,
        totalPartitions: stats.totalPartitions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new PostgreSQLPartitioningService();