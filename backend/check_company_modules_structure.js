// ============================================
// VERIFICAR ESTRUCTURA DE COMPANY_MODULES
// ============================================
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'attendance_system',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    timezone: '+00:00'
  }
);

async function checkStructure() {
    try {
        console.log('🔄 Conectando a PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ Conectado exitosamente');

        // Verificar estructura de company_modules
        const moduleStructure = await sequelize.query(
            `SELECT column_name, data_type, is_nullable, column_default
             FROM information_schema.columns
             WHERE table_name = 'company_modules'
             ORDER BY ordinal_position`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log('📋 Estructura de tabla company_modules:');
        moduleStructure.forEach(col => {
            console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });

        // También verificar empresas duplicadas
        const duplicates = await sequelize.query(
            `SELECT slug, COUNT(*) as count FROM companies WHERE metadata->>'created_for' = 'panel-transporte' GROUP BY slug HAVING COUNT(*) > 1`,
            { type: sequelize.QueryTypes.SELECT }
        );

        if (duplicates.length > 0) {
            console.log('\n⚠️ Empresas duplicadas encontradas:');
            duplicates.forEach(dup => {
                console.log(`   ${dup.slug}: ${dup.count} registros`);
            });
        } else {
            console.log('\n✅ No hay empresas duplicadas');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkStructure();