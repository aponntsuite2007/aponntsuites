/**
 * FIX: Elimina índices huérfanos de migración parcial y ejecuta migración completa
 */

// Load .env file first
require('dotenv').config();

const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Use the same DATABASE_URL that the server uses
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL no está configurado en las variables de entorno');
    console.error('💡 Usa el mismo DATABASE_URL que el servidor');
    process.exit(1);
}

console.log('🔗 Usando DATABASE_URL de Render PostgreSQL...');

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

async function dropOrphanedIndexes() {
    console.log('\n🧹 Eliminando índices huérfanos...\n');

    const indexes = [
        'idx_work_history_user',
        'idx_work_history_company',
        'idx_marital_status_user',
        'idx_children_user',
        'idx_children_company',
        'idx_family_members_user',
        'idx_family_members_company',
        'idx_education_user',
        'idx_education_company',
        'idx_chronic_conditions_user',
        'idx_chronic_conditions_company',
        'idx_medications_user',
        'idx_medications_company',
        'idx_allergies_user',
        'idx_allergies_company'
    ];

    for (const indexName of indexes) {
        try {
            await sequelize.query(`DROP INDEX IF EXISTS ${indexName};`);
            console.log(`  ✅ Eliminado: ${indexName}`);
        } catch (error) {
            console.log(`  ⚠️ No existe: ${indexName}`);
        }
    }

    console.log('\n✅ Índices limpiados\n');
}

async function runMigration() {
    console.log('📄 Ejecutando migración SQL completa...\n');

    try {
        const migrationPath = path.join(__dirname, 'migrations', '20250128_complete_user_profile_system.sql');
        const sql = fs.readFileSync(migrationPath, 'utf-8');

        await sequelize.query(sql);

        console.log('✅ Migración ejecutada exitosamente\n');
        return true;
    } catch (error) {
        console.error('❌ Error en la migración:', error.message);
        return false;
    }
}

async function verifyTables() {
    console.log('🔍 Verificando tablas creadas...\n');

    const tables = [
        'user_work_history',
        'user_marital_status',
        'user_children',
        'user_family_members',
        'user_education',
        'user_chronic_conditions',
        'user_medications',
        'user_allergies'
    ];

    let allExist = true;

    for (const table of tables) {
        try {
            const [results] = await sequelize.query(`SELECT COUNT(*) FROM ${table};`);
            console.log(`  ✅ ${table} - existe (${results[0].count} registros)`);
        } catch (error) {
            console.log(`  ❌ ${table} - NO existe`);
            allExist = false;
        }
    }

    return allExist;
}

async function main() {
    console.log('\n' + '█'.repeat(80));
    console.log('🔧 FIX: MIGRACIÓN PARCIAL DEL SISTEMA DE PERFIL');
    console.log('█'.repeat(80) + '\n');

    try {
        // Conectar
        await sequelize.authenticate();
        console.log('✅ Conexión a base de datos establecida\n');

        // Limpiar índices huérfanos
        await dropOrphanedIndexes();

        // Ejecutar migración completa
        const success = await runMigration();

        if (success) {
            // Verificar tablas
            const allTablesExist = await verifyTables();

            if (allTablesExist) {
                console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE\n');
                console.log('📋 Todas las tablas fueron creadas correctamente\n');
            } else {
                console.log('\n⚠️ ADVERTENCIA: Algunas tablas no fueron creadas\n');
            }
        }

    } catch (error) {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

main();
