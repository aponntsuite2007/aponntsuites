/**
 * Script para ejecutar migración del sistema de soporte
 */

const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const sqlFile = path.join(__dirname, '../migrations', '20251023_create_support_system.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Dividir en statements individuales
    const statements = sql.split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/**'));

    console.log('Ejecutando migración de soporte...');
    console.log('Statements a ejecutar:', statements.length);

    let success = 0;
    let skipped = 0;
    let errors = 0;

    for (const stmt of statements) {
        if (stmt.length > 10) {
            try {
                await sequelize.query(stmt + ';');
                const preview = stmt.replace(/\s+/g, ' ').substring(0, 50);
                console.log('✅', preview + '...');
                success++;
            } catch (e) {
                if (e.message.includes('already exists') || e.message.includes('ya existe')) {
                    console.log('⏭️  Skipped (exists):', stmt.substring(0, 40).replace(/\s+/g, ' ') + '...');
                    skipped++;
                } else {
                    console.error('❌ Error:', e.message.substring(0, 100));
                    errors++;
                }
            }
        }
    }

    console.log('\n📊 Resumen:');
    console.log('   ✅ Exitosos:', success);
    console.log('   ⏭️  Skipped:', skipped);
    console.log('   ❌ Errores:', errors);
    console.log('\n✅ Migración completada');
}

runMigration()
    .then(() => process.exit(0))
    .catch(e => { console.error('Fatal:', e.message); process.exit(1); });
