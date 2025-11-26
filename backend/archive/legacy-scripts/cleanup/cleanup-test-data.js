/**
 * SCRIPT DE LIMPIEZA DE DATOS DE PRUEBA
 *
 * Elimina TODOS los registros creados durante tests de auditoría.
 * Identifica datos por el prefijo '[TEST-AUDIT]' en campos de texto.
 *
 * USO:
 *   node cleanup-test-data.js                    # Modo dry-run (solo muestra qué se borraría)
 *   node cleanup-test-data.js --confirm          # Ejecuta borrado real
 *   node cleanup-test-data.js --company-id 11    # Solo borra de empresa específica
 *
 * @version 1.0.0
 * @created 2025-10-26
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const TEST_PREFIX = '[TEST-AUDIT]';

// Configuración de conexión
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// Mapeo de tablas y campos que pueden contener el prefijo
const TABLES_TO_CLEAN = [
  // Usuarios y departamentos
  { table: 'users', fields: ['name', 'username', 'email'], company_field: 'company_id' },
  { table: 'departments', fields: ['name', 'description'], company_field: 'company_id' },
  { table: 'positions', fields: ['name', 'description'], company_field: 'company_id' },

  // Asistencia y vacaciones
  { table: 'attendance', fields: ['notes'], company_field: 'company_id' },
  { table: 'vacations', fields: ['reason', 'notes'], company_field: 'company_id' },
  { table: 'medical_leaves', fields: ['reason', 'notes'], company_field: 'company_id' },

  // Reportes y notificaciones
  { table: 'reports', fields: ['title', 'description'], company_field: 'company_id' },
  { table: 'notifications', fields: ['title', 'message'], company_field: 'company_id' },

  // Kiosks y dispositivos
  { table: 'kiosks', fields: ['name', 'location'], company_field: 'company_id' },
  { table: 'devices', fields: ['name', 'description'], company_field: 'company_id' },

  // Capacitaciones y certificaciones
  { table: 'trainings', fields: ['name', 'description'], company_field: 'company_id' },
  { table: 'certifications', fields: ['name', 'description'], company_field: 'company_id' },

  // SLA y tickets
  { table: 'sla_configs', fields: ['name', 'description'], company_field: 'company_id' },
  { table: 'tickets', fields: ['title', 'description'], company_field: 'company_id' },

  // Empresas (solo si se especifica explícitamente)
  // { table: 'companies', fields: ['name', 'legal_name'], company_field: null }
];

async function scanTestData(companyId = null, dryRun = true) {
  try {
    await db.authenticate();
    console.log(`✅ Conectado a PostgreSQL\n`);

    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`🧹 ESCANEO DE DATOS DE PRUEBA`);
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`Prefijo de búsqueda: "${TEST_PREFIX}"`);
    if (companyId) {
      console.log(`Company ID filtrado: ${companyId}`);
    }
    console.log(`Modo: ${dryRun ? '🔍 DRY-RUN (solo lectura)' : '🗑️  DELETE (borrado real)'}`);
    console.log(`\n`);

    let totalRecords = 0;
    const results = [];

    for (const tableConfig of TABLES_TO_CLEAN) {
      const { table, fields, company_field } = tableConfig;

      try {
        // Construir WHERE clause para buscar el prefijo en cualquiera de los campos
        const whereConditions = fields.map(field => `${field} LIKE '%${TEST_PREFIX}%'`).join(' OR ');

        let whereClause = `WHERE (${whereConditions})`;

        // Agregar filtro de company_id si existe
        if (company_field && companyId) {
          whereClause += ` AND ${company_field} = ${companyId}`;
        }

        // Verificar si la tabla existe
        const [tableExists] = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = '${table}'
          )
        `);

        if (!tableExists[0].exists) {
          console.log(`  ⚠️  Tabla "${table}" no existe - SKIP`);
          continue;
        }

        // Contar registros con prefijo
        const countQuery = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
        const [countResult] = await db.query(countQuery);
        const count = parseInt(countResult[0].count);

        if (count > 0) {
          console.log(`  📊 ${table}: ${count} registros con prefijo de prueba`);

          // Obtener preview de los registros
          const previewQuery = `SELECT * FROM ${table} ${whereClause} LIMIT 5`;
          const [preview] = await db.query(previewQuery);

          results.push({
            table,
            count,
            preview: preview.slice(0, 3) // Solo primeros 3 para no saturar output
          });

          totalRecords += count;

          // Si NO es dry-run, ejecutar DELETE
          if (!dryRun) {
            const deleteQuery = `DELETE FROM ${table} ${whereClause}`;
            await db.query(deleteQuery);
            console.log(`     ✅ ${count} registros ELIMINADOS`);
          }
        } else {
          console.log(`  ✅ ${table}: 0 registros (limpia)`);
        }

      } catch (error) {
        console.error(`  ❌ Error procesando tabla "${table}":`, error.message);
      }
    }

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`📊 RESUMEN`);
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`Total de registros encontrados: ${totalRecords}`);

    if (dryRun && totalRecords > 0) {
      console.log(`\n⚠️  MODO DRY-RUN ACTIVO - Ningún dato fue eliminado`);
      console.log(`\nPara ejecutar el borrado real, ejecuta:`);
      console.log(`  node cleanup-test-data.js --confirm`);
      if (companyId) {
        console.log(`  node cleanup-test-data.js --confirm --company-id ${companyId}`);
      }
    } else if (!dryRun && totalRecords > 0) {
      console.log(`\n✅ ${totalRecords} registros ELIMINADOS exitosamente`);
    } else {
      console.log(`\n✅ No hay datos de prueba para limpiar`);
    }

    // Mostrar preview de datos encontrados
    if (results.length > 0 && dryRun) {
      console.log(`\n═══════════════════════════════════════════════════════════`);
      console.log(`🔍 PREVIEW DE DATOS A ELIMINAR`);
      console.log(`═══════════════════════════════════════════════════════════\n`);

      results.forEach(({ table, count, preview }) => {
        console.log(`📋 ${table} (${count} registros):`);
        preview.forEach((record, i) => {
          const fieldsToShow = Object.keys(record)
            .filter(key => !['created_at', 'updated_at', 'deleted_at'].includes(key))
            .slice(0, 5);

          console.log(`   ${i+1}. ${fieldsToShow.map(key => `${key}: ${record[key]}`).join(', ')}`);
        });
        console.log('');
      });
    }

    await db.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await db.close();
    process.exit(1);
  }
}

// Parsear argumentos de línea de comandos
const args = process.argv.slice(2);
const dryRun = !args.includes('--confirm');
const companyIdArg = args.find(arg => arg.startsWith('--company-id'));
const companyId = companyIdArg ? parseInt(companyIdArg.split('=')[1]) : null;

// Ejecutar
scanTestData(companyId, dryRun);
