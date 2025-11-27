/**
 * Script para verificar esquema real de tablas de payroll
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'attendance_system',
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  logging: false
});

async function checkSchema() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL\n');

    // Tablas a verificar relacionadas con payroll
    const tablesToCheck = [
      'payroll_templates',
      'payroll_template_concepts',
      'payroll_concept_types',
      'payroll_countries',
      'payroll_runs',
      'payroll_run_details',
      'labor_agreements_v2',
      'labor_agreements_catalog',
      'salary_categories_v2',
      'user_salary_config_v2',
      'user_payroll_assignments'
    ];

    console.log('=== ESQUEMA DE TABLAS PAYROLL ===\n');

    for (const table of tablesToCheck) {
      try {
        const [columns] = await sequelize.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = '${table}'
          ORDER BY ordinal_position
        `);

        if (columns.length > 0) {
          console.log(`\n📋 ${table.toUpperCase()} (${columns.length} columnas):`);
          columns.forEach(col => {
            const nullable = col.is_nullable === 'YES' ? '?' : '*';
            console.log(`   ${nullable} ${col.column_name}: ${col.data_type}`);
          });
        } else {
          console.log(`\n❌ ${table} - NO EXISTE`);
        }
      } catch (err) {
        console.log(`\n❌ ${table} - Error: ${err.message}`);
      }
    }

    // Verificar tablas users para campos de salario
    console.log('\n\n=== CAMPOS DE SALARIO EN USERS ===\n');
    const [userSalaryFields] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND (column_name LIKE '%salary%' OR column_name LIKE '%convenio%'
           OR column_name LIKE '%categoria%' OR column_name LIKE '%category%'
           OR column_name LIKE '%agreement%' OR column_name LIKE '%wage%')
      ORDER BY column_name
    `);

    if (userSalaryFields.length > 0) {
      userSalaryFields.forEach(col => {
        console.log(`   • ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('   ⚠️ No hay campos de salario en tabla users');
    }

    // Verificar FKs relacionadas
    console.log('\n\n=== FOREIGN KEYS DE PAYROLL ===\n');
    const [fks] = await sequelize.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND (tc.table_name LIKE 'payroll%' OR tc.table_name LIKE '%salary%' OR tc.table_name LIKE 'labor%')
      ORDER BY tc.table_name
    `);

    if (fks.length > 0) {
      fks.forEach(fk => {
        console.log(`   ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table}.${fk.foreign_column}`);
      });
    } else {
      console.log('   ⚠️ No se encontraron FKs de payroll');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkSchema();
