/**
 * Script para crear todas las tablas del sistema de vacaciones
 * Ejecutar contra la base de datos de producción en Render
 */

const { Sequelize, DataTypes } = require('sequelize');

// Usar DATABASE_URL de Render o configuración local
const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function createVacationTables() {
  console.log('🔧 Conectando a PostgreSQL...');

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida exitosamente\n');

    // 1. Tabla de configuración de vacaciones
    console.log('📋 Creando tabla: vacation_configurations...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS vacation_configurations (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL DEFAULT 1,
        vacation_interruptible BOOLEAN DEFAULT true,
        min_continuous_days INTEGER DEFAULT 7,
        max_fractions INTEGER DEFAULT 3,
        auto_scheduling_enabled BOOLEAN DEFAULT false,
        min_advance_notice_days INTEGER DEFAULT 15,
        max_simultaneous_percentage INTEGER DEFAULT 30,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ vacation_configurations creada\n');

    // 2. Tabla de escalas de vacaciones
    console.log('📋 Creando tabla: vacation_scales...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS vacation_scales (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL DEFAULT 1,
        years_from INTEGER NOT NULL,
        years_to INTEGER,
        vacation_days INTEGER NOT NULL,
        priority INTEGER DEFAULT 0,
        range_description VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ vacation_scales creada\n');

    // 3. Tabla de licencias extraordinarias
    console.log('📋 Creando tabla: extraordinary_licenses...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS extraordinary_licenses (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL DEFAULT 1,
        type VARCHAR(100) NOT NULL,
        description TEXT,
        days INTEGER NOT NULL,
        day_type VARCHAR(20) DEFAULT 'habil',
        requires_approval BOOLEAN DEFAULT true,
        requires_documentation BOOLEAN DEFAULT false,
        max_per_year INTEGER,
        advance_notice_days INTEGER DEFAULT 0,
        legal_basis TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ extraordinary_licenses creada\n');

    // 4. Tabla de solicitudes de vacaciones
    console.log('📋 Creando tabla: vacation_requests...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS vacation_requests (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL DEFAULT 1,
        user_id INTEGER NOT NULL,
        request_type VARCHAR(50) NOT NULL,
        extraordinary_license_id INTEGER REFERENCES extraordinary_licenses(id),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_days INTEGER NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        approved_by INTEGER,
        approval_date TIMESTAMP,
        approval_comments TEXT,
        source VARCHAR(50) DEFAULT 'web',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ vacation_requests creada\n');

    // 5. Tabla de compatibilidad de tareas
    console.log('📋 Creando tabla: task_compatibility...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS task_compatibility (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL DEFAULT 1,
        primary_user_id INTEGER NOT NULL,
        cover_user_id INTEGER NOT NULL,
        compatibility_score DECIMAL(5,2) DEFAULT 0,
        coverable_tasks JSONB,
        max_coverage_hours INTEGER,
        max_concurrent_tasks INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ task_compatibility creada\n');

    // 6. Insertar datos de ejemplo/configuración inicial
    console.log('📝 Insertando configuración inicial...\n');

    // Configuración por defecto
    await sequelize.query(`
      INSERT INTO vacation_configurations (
        company_id, vacation_interruptible, min_continuous_days,
        max_fractions, auto_scheduling_enabled, min_advance_notice_days,
        max_simultaneous_percentage, is_active
      ) VALUES (1, true, 7, 3, true, 15, 30, true)
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Configuración inicial insertada');

    // Escalas de vacaciones (ley argentina)
    await sequelize.query(`
      INSERT INTO vacation_scales (company_id, years_from, years_to, vacation_days, priority, range_description, is_active)
      VALUES
        (1, 0, 5, 14, 1, '0-5 años de antigüedad', true),
        (1, 5, 10, 21, 2, '5-10 años de antigüedad', true),
        (1, 10, 20, 28, 3, '10-20 años de antigüedad', true),
        (1, 20, NULL, 35, 4, 'Más de 20 años de antigüedad', true)
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Escalas de vacaciones insertadas');

    // Licencias extraordinarias comunes
    await sequelize.query(`
      INSERT INTO extraordinary_licenses (
        company_id, type, description, days, day_type,
        requires_approval, requires_documentation, legal_basis, is_active
      ) VALUES
        (1, 'Matrimonio', 'Licencia por matrimonio', 10, 'corrido', true, true, 'Art. 158 LCT', true),
        (1, 'Fallecimiento cónyuge/hijos', 'Licencia por fallecimiento de cónyuge o hijos', 3, 'corrido', false, true, 'Art. 158 LCT', true),
        (1, 'Fallecimiento padres/hermanos', 'Licencia por fallecimiento de padres o hermanos', 1, 'habil', false, true, 'Art. 158 LCT', true),
        (1, 'Nacimiento', 'Licencia por nacimiento de hijo', 2, 'corrido', false, true, 'Art. 158 LCT', true),
        (1, 'Examen', 'Licencia para rendir examen', 2, 'habil', true, true, 'Art. 158 LCT', true)
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Licencias extraordinarias insertadas\n');

    console.log('🎉 ¡TODAS LAS TABLAS CREADAS EXITOSAMENTE!\n');
    console.log('📊 Resumen:');
    console.log('   ✅ vacation_configurations');
    console.log('   ✅ vacation_scales (4 escalas)');
    console.log('   ✅ extraordinary_licenses (5 licencias)');
    console.log('   ✅ vacation_requests');
    console.log('   ✅ task_compatibility');
    console.log('\n✨ Sistema de vacaciones listo para usar\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar
createVacationTables();
