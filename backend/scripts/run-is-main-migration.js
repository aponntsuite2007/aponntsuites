/**
 * Script para agregar campo is_main a branches
 * Ejecutar: node scripts/run-is-main-migration.js
 */
require('dotenv').config();
const db = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🔄 Ejecutando migración: is_main para branches...\n');

        // Leer y ejecutar SQL de migración
        const sqlPath = path.join(__dirname, '../migrations/20251201_add_is_main_to_branches.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await db.sequelize.query(sql);

        // Verificar resultado
        const [branches] = await db.sequelize.query(`
            SELECT company_id, id, name, country, state_province, is_main
            FROM branches
            ORDER BY company_id, is_main DESC
        `);

        console.log('\n📊 Sucursales actuales:');
        console.table(branches);

        console.log('\n✅ Migración completada exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

runMigration();
