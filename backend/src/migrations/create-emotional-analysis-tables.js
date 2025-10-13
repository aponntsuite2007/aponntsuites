/**
 * 📊 MIGRACIÓN: TABLAS DE ANÁLISIS EMOCIONAL PROFESIONAL
 * =====================================================
 * Crea tablas para sistema profesional de análisis emocional
 * con datos REALES de Azure Face API
 *
 * IMPORTANTE: Estas tablas almacenan datos sensibles.
 * Requieren consentimiento explícito del usuario.
 *
 * @version 1.0.0
 */

const { sequelize } = require('../config/database');

async function createEmotionalAnalysisTables() {
  try {
    console.log('🚀 [MIGRATION] Creando tablas de análisis emocional...');

    // ========================================
    // TABLA 1: biometric_emotional_analysis
    // ========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS biometric_emotional_analysis (
          id SERIAL PRIMARY KEY,
          company_id INTEGER NOT NULL,
          user_id UUID NOT NULL,
          scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

          -- ========================================
          -- EMOCIONES (Azure Face API - REALES)
          -- ========================================
          emotion_anger DECIMAL(5,4) CHECK (emotion_anger >= 0 AND emotion_anger <= 1),
          emotion_contempt DECIMAL(5,4) CHECK (emotion_contempt >= 0 AND emotion_contempt <= 1),
          emotion_disgust DECIMAL(5,4) CHECK (emotion_disgust >= 0 AND emotion_disgust <= 1),
          emotion_fear DECIMAL(5,4) CHECK (emotion_fear >= 0 AND emotion_fear <= 1),
          emotion_happiness DECIMAL(5,4) CHECK (emotion_happiness >= 0 AND emotion_happiness <= 1),
          emotion_neutral DECIMAL(5,4) CHECK (emotion_neutral >= 0 AND emotion_neutral <= 1),
          emotion_sadness DECIMAL(5,4) CHECK (emotion_sadness >= 0 AND emotion_sadness <= 1),
          emotion_surprise DECIMAL(5,4) CHECK (emotion_surprise >= 0 AND emotion_surprise <= 1),

          -- Emoción dominante
          dominant_emotion VARCHAR(20),

          -- Valencia y activación emocional
          emotional_valence DECIMAL(5,4), -- -1 (negativo) a 1 (positivo)
          emotional_arousal DECIMAL(5,4), -- 0 (calmado) a 1 (activado)

          -- ========================================
          -- INDICADORES DE FATIGA (REALES)
          -- ========================================
          eye_occlusion_left DECIMAL(5,4) CHECK (eye_occlusion_left >= 0 AND eye_occlusion_left <= 1),
          eye_occlusion_right DECIMAL(5,4) CHECK (eye_occlusion_right >= 0 AND eye_occlusion_right <= 1),
          head_pose_pitch DECIMAL(6,2), -- Inclinación vertical
          head_pose_roll DECIMAL(6,2),  -- Inclinación lateral
          head_pose_yaw DECIMAL(6,2),   -- Rotación horizontal
          smile_intensity DECIMAL(5,4) CHECK (smile_intensity >= 0 AND smile_intensity <= 1),

          -- Score de fatiga calculado
          fatigue_score DECIMAL(5,4) CHECK (fatigue_score >= 0 AND fatigue_score <= 1),

          -- ========================================
          -- METADATA
          -- ========================================
          has_glasses BOOLEAN,
          glasses_type VARCHAR(20), -- 'NoGlasses', 'ReadingGlasses', 'Sunglasses'
          facial_hair_moustache DECIMAL(5,4),
          facial_hair_beard DECIMAL(5,4),
          facial_hair_sideburns DECIMAL(5,4),
          estimated_age INTEGER CHECK (estimated_age >= 0 AND estimated_age <= 120),

          -- Contexto temporal
          time_of_day VARCHAR(20), -- 'morning', 'afternoon', 'evening', 'night'
          day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),

          -- ========================================
          -- SCORES CALCULADOS
          -- ========================================
          stress_score DECIMAL(5,4) CHECK (stress_score >= 0 AND stress_score <= 1),
          wellness_score INTEGER CHECK (wellness_score >= 0 AND wellness_score <= 100),

          -- ========================================
          -- METADATA TÉCNICA
          -- ========================================
          processing_time_ms INTEGER,
          data_source VARCHAR(50) DEFAULT 'azure-face-api',
          azure_face_id VARCHAR(255), -- ID temporal de Azure
          quality_score DECIMAL(5,4),

          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

          -- Foreign keys
          FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

          -- Índice compuesto para búsquedas eficientes
          CONSTRAINT idx_emotional_analysis_unique
              UNIQUE (company_id, user_id, scan_timestamp)
      );
    `);

    console.log('✅ Tabla biometric_emotional_analysis creada');

    // ========================================
    // TABLA 2: biometric_consents
    // ========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS biometric_consents (
          id SERIAL PRIMARY KEY,
          company_id INTEGER NOT NULL,
          user_id UUID NOT NULL,

          -- Tipo de consentimiento
          consent_type VARCHAR(50) NOT NULL,
              -- 'emotional_analysis', 'fatigue_detection',
              -- 'wellness_monitoring', 'aggregated_reports'

          -- Estado del consentimiento
          consent_given BOOLEAN NOT NULL,
          consent_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

          -- Texto legal mostrado
          consent_text TEXT NOT NULL,
          consent_version VARCHAR(20) DEFAULT '1.0',

          -- Trazabilidad (auditoría)
          ip_address VARCHAR(45),
          user_agent TEXT,
          acceptance_method VARCHAR(50), -- 'web', 'mobile', 'email'

          -- Revocación
          revoked BOOLEAN DEFAULT FALSE,
          revoked_date TIMESTAMP WITH TIME ZONE,
          revoked_reason TEXT,
          revoked_ip_address VARCHAR(45),

          -- Expiración (Ley 25.326 - retención limitada)
          expires_at TIMESTAMP WITH TIME ZONE,

          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

          -- Foreign keys
          FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

          -- Un solo consentimiento activo por usuario/tipo
          CONSTRAINT uq_consent_user_type
              UNIQUE (company_id, user_id, consent_type, revoked)
      );
    `);

    console.log('✅ Tabla biometric_consents creada');

    // ========================================
    // TABLA 3: consent_audit_log (auditoría)
    // ========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS consent_audit_log (
          id SERIAL PRIMARY KEY,
          company_id INTEGER NOT NULL,
          user_id UUID NOT NULL,
          consent_type VARCHAR(50) NOT NULL,

          -- Acción realizada
          action VARCHAR(20) NOT NULL, -- 'GRANTED', 'REVOKED', 'EXPIRED', 'REQUESTED'
          action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

          -- Detalles
          ip_address VARCHAR(45),
          user_agent TEXT,
          reason TEXT,

          -- Metadata
          performed_by_user_id UUID, -- Si lo hizo un admin
          automated BOOLEAN DEFAULT FALSE, -- Si fue automático (ej: expiración)

          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

          FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `);

    console.log('✅ Tabla consent_audit_log creada');

    // ========================================
    // ÍNDICES PARA PERFORMANCE
    // ========================================

    // Índice principal: búsquedas por usuario y fecha
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_emotional_analysis_user_time
          ON biometric_emotional_analysis(company_id, user_id, scan_timestamp DESC);
    `);

    // Índice para reportes agregados por fecha
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_emotional_analysis_timestamp
          ON biometric_emotional_analysis(scan_timestamp DESC);
    `);

    // Índice para análisis de fatiga
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_emotional_analysis_fatigue
          ON biometric_emotional_analysis(company_id, fatigue_score DESC)
          WHERE fatigue_score > 0.6;
    `);

    // Índice para consentimientos activos
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_consents_active
          ON biometric_consents(company_id, user_id, consent_type)
          WHERE revoked = FALSE;
    `);

    // Índice para auditoría
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_consent_audit_timestamp
          ON consent_audit_log(action_timestamp DESC);
    `);

    console.log('✅ Índices creados');

    // ========================================
    // VISTAS PARA ANÁLISIS AGREGADO
    // ========================================

    // Vista: Bienestar por departamento (AGREGADO, no individual)
    await sequelize.query(`
      CREATE OR REPLACE VIEW v_department_wellness AS
      SELECT
          u.company_id,
          u.department_id,
          d.name as department_name,
          COUNT(DISTINCT e.user_id) as users_analyzed,
          AVG(e.wellness_score) as avg_wellness_score,
          AVG(e.fatigue_score) as avg_fatigue_score,
          AVG(e.stress_score) as avg_stress_score,
          AVG(e.emotion_happiness) as avg_happiness,
          DATE_TRUNC('day', e.scan_timestamp) as analysis_date
      FROM biometric_emotional_analysis e
      JOIN users u ON e.user_id = u.user_id AND e.company_id = u.company_id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.department_id IS NOT NULL
      GROUP BY u.company_id, u.department_id, d.name, DATE_TRUNC('day', e.scan_timestamp)
      HAVING COUNT(DISTINCT e.user_id) >= 10; -- Mínimo 10 personas para anonimización
    `);

    console.log('✅ Vista v_department_wellness creada');

    // Vista: Tendencias temporales
    await sequelize.query(`
      CREATE OR REPLACE VIEW v_wellness_trends AS
      SELECT
          company_id,
          DATE_TRUNC('hour', scan_timestamp) as hour_bucket,
          time_of_day,
          COUNT(*) as scans_count,
          AVG(wellness_score) as avg_wellness,
          AVG(fatigue_score) as avg_fatigue,
          AVG(stress_score) as avg_stress
      FROM biometric_emotional_analysis
      WHERE scan_timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY company_id, DATE_TRUNC('hour', scan_timestamp), time_of_day
      ORDER BY company_id, hour_bucket DESC;
    `);

    console.log('✅ Vista v_wellness_trends creada');

    // ========================================
    // FUNCIÓN: Limpiar datos vencidos
    // ========================================
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION cleanup_expired_emotional_data()
      RETURNS INTEGER AS $$
      DECLARE
          deleted_count INTEGER := 0;
          temp_count INTEGER;
      BEGIN
          -- Eliminar análisis de usuarios SIN consentimiento activo
          DELETE FROM biometric_emotional_analysis e
          WHERE NOT EXISTS (
              SELECT 1 FROM biometric_consents c
              WHERE c.user_id = e.user_id
                AND c.company_id = e.company_id
                AND c.consent_type = 'emotional_analysis'
                AND c.revoked = FALSE
                AND (c.expires_at IS NULL OR c.expires_at > NOW())
          );

          GET DIAGNOSTICS deleted_count := ROW_COUNT;

          -- Eliminar análisis > 90 días (retención máxima)
          DELETE FROM biometric_emotional_analysis
          WHERE scan_timestamp < NOW() - INTERVAL '90 days';

          GET DIAGNOSTICS temp_count := ROW_COUNT;
          deleted_count := deleted_count + temp_count;

          RETURN deleted_count;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('✅ Función cleanup_expired_emotional_data creada');

    console.log('');
    console.log('🎉 ========================================');
    console.log('🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('🎉 ========================================');
    console.log('');
    console.log('📊 Tablas creadas:');
    console.log('   ✅ biometric_emotional_analysis (datos REALES de Azure)');
    console.log('   ✅ biometric_consents (cumplimiento Ley 25.326)');
    console.log('   ✅ consent_audit_log (trazabilidad legal)');
    console.log('');
    console.log('🔍 Vistas creadas:');
    console.log('   ✅ v_department_wellness (datos agregados)');
    console.log('   ✅ v_wellness_trends (tendencias temporales)');
    console.log('');
    console.log('⚡ Índices optimizados: 5');
    console.log('🔧 Funciones de mantenimiento: 1');
    console.log('');
    console.log('⚖️ Cumplimiento legal: Ley 25.326 (Argentina)');
    console.log('');

    return {
      success: true,
      tablesCreated: 3,
      viewsCreated: 2,
      indexesCreated: 5,
      functionsCreated: 1
    };

  } catch (error) {
    console.error('❌ [MIGRATION] Error:', error.message);
    console.error(error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createEmotionalAnalysisTables()
    .then((result) => {
      console.log('✅ Migración exitosa:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en migración:', error);
      process.exit(1);
    });
}

module.exports = { createEmotionalAnalysisTables };
