/**
 * Script para ejecutar la migración de turnos rotativos
 * Ejecuta: 20250122_rotative_shifts_system.sql
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('./src/config/database');

async function runMigration() {
  try {
    console.log('🔄 Iniciando migración de turnos rotativos...\n');
    console.log('========================================\n');

    let successCount = 0;
    let skipCount = 0;

    // PASO 1: Agregar columnas a tabla shifts
    console.log('[1/5] Agregando columnas a tabla shifts...');
    try {
      await sequelize.query(`
        ALTER TABLE shifts
        ADD COLUMN IF NOT EXISTS global_cycle_start_date DATE,
        ADD COLUMN IF NOT EXISTS phases JSONB DEFAULT '[]'::jsonb;
      `);
      successCount++;
      console.log('✅ Columnas agregadas\n');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('ya existe')) {
        console.log('⚠️  Columnas ya existen (saltando)\n');
        skipCount++;
      } else {
        console.error('❌ Error:', error.message);
        throw error;
      }
    }

    // PASO 2: Agregar comentarios
    console.log('[2/5] Agregando comentarios a columnas...');
    try {
      await sequelize.query(`
        COMMENT ON COLUMN shifts.global_cycle_start_date IS 'Fecha en que ARRANCÓ el ciclo del turno (reloj propio global)';
      `);
      await sequelize.query(`
        COMMENT ON COLUMN shifts.phases IS 'Fases detalladas del turno: [{ name, duration, startTime, endTime, groupName, sector }]';
      `);
      successCount++;
      console.log('✅ Comentarios agregados\n');
    } catch (error) {
      console.log('⚠️  Error en comentarios (no crítico):', error.message.substring(0, 100), '\n');
      skipCount++;
    }

    // PASO 3: Crear índice
    console.log('[3/5] Creando índice idx_shifts_global_cycle...');
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_shifts_global_cycle
        ON shifts (global_cycle_start_date)
        WHERE global_cycle_start_date IS NOT NULL;
      `);
      successCount++;
      console.log('✅ Índice creado\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Índice ya existe (saltando)\n');
        skipCount++;
      } else {
        console.error('❌ Error:', error.message);
        throw error;
      }
    }

    // PASO 4: Crear tabla user_shift_assignments
    console.log('[4/5] Creando tabla user_shift_assignments...');
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS user_shift_assignments (
          id BIGSERIAL PRIMARY KEY,
          user_id UUID NOT NULL,
          shift_id UUID NOT NULL,
          company_id INTEGER NOT NULL,
          join_date DATE NOT NULL,
          assigned_phase VARCHAR(50) NOT NULL,
          group_name VARCHAR(255),
          sector VARCHAR(100),
          assigned_by UUID,
          assigned_at TIMESTAMP DEFAULT NOW(),
          is_active BOOLEAN DEFAULT TRUE,
          deactivated_at TIMESTAMP,
          deactivated_by UUID,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),

          CONSTRAINT fk_user_shift_user
            FOREIGN KEY (user_id)
            REFERENCES users(user_id)
            ON DELETE CASCADE,

          CONSTRAINT fk_user_shift_shift
            FOREIGN KEY (shift_id)
            REFERENCES shifts(id)
            ON DELETE CASCADE,

          CONSTRAINT fk_user_shift_company
            FOREIGN KEY (company_id)
            REFERENCES companies(company_id)
            ON DELETE CASCADE,

          CONSTRAINT fk_user_shift_assigned_by
            FOREIGN KEY (assigned_by)
            REFERENCES users(user_id)
            ON DELETE SET NULL,

          CONSTRAINT fk_user_shift_deactivated_by
            FOREIGN KEY (deactivated_by)
            REFERENCES users(user_id)
            ON DELETE SET NULL
        );
      `);
      successCount++;
      console.log('✅ Tabla creada\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Tabla ya existe (saltando)\n');
        skipCount++;
      } else {
        console.error('❌ Error:', error.message);
        throw error;
      }
    }

    // PASO 5: Crear índices de user_shift_assignments
    console.log('[5/5] Creando índices de user_shift_assignments...');
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_user_shift_active
        ON user_shift_assignments (user_id, is_active, join_date DESC)
        WHERE is_active = TRUE;
      `);

      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_user_shift_company_shift
        ON user_shift_assignments (company_id, shift_id, is_active);
      `);

      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_user_shift_phase
        ON user_shift_assignments (assigned_phase, is_active)
        WHERE is_active = TRUE;
      `);

      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_user_shift_sector
        ON user_shift_assignments (sector, company_id)
        WHERE sector IS NOT NULL;
      `);

      await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_shift_unique_active
        ON user_shift_assignments (user_id)
        WHERE is_active = TRUE;
      `);

      successCount++;
      console.log('✅ Índices creados\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Índices ya existen (saltando)\n');
        skipCount++;
      } else {
        console.error('❌ Error:', error.message);
        throw error;
      }
    }

    console.log('========================================');
    console.log('✅ Migración completada exitosamente');
    console.log(`   Pasos ejecutados: ${successCount}`);
    console.log(`   Pasos saltados: ${skipCount}`);
    console.log('========================================\n');

    // Verificar tablas creadas
    console.log('🔍 Verificando tablas creadas...\n');

    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('user_shift_assignments', 'shifts')
      ORDER BY table_name
    `);

    console.log('📋 Tablas encontradas:');
    tables.forEach(row => {
      console.log('   ✅', row.table_name);
    });

    // Verificar columnas de shifts
    console.log('\n🔍 Verificando columnas de tabla shifts...\n');
    const [shiftColumns] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'shifts'
        AND column_name IN ('global_cycle_start_date', 'phases')
      ORDER BY column_name
    `);

    console.log('📋 Columnas de shifts:');
    shiftColumns.forEach(col => {
      console.log(`   ✅ ${col.column_name} (${col.data_type})`);
    });

    // Verificar columnas de user_shift_assignments
    console.log('\n🔍 Verificando columnas de user_shift_assignments...\n');
    const [usaColumns] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_shift_assignments'
      ORDER BY ordinal_position
    `);

    console.log('📋 Columnas de user_shift_assignments:');
    usaColumns.forEach(col => {
      console.log(`   ✅ ${col.column_name} (${col.data_type})`);
    });

    console.log('\n✅ MIGRACIÓN COMPLETA - Sistema de turnos rotativos listo para usar');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR FATAL en migración:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar migración
runMigration();
