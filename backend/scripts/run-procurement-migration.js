/**
 * Script para ejecutar migraciones de Procurement
 */
const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function executeMigration() {
    const sqlFile = path.join(__dirname, '../migrations/20251231_create_procurement_system.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Extraer CREATE TABLE statements
    const createTableRegex = /CREATE TABLE IF NOT EXISTS[\s\S]+?(?=CREATE TABLE IF NOT EXISTS|CREATE INDEX|CREATE OR REPLACE FUNCTION|$)/gi;
    const createIndexRegex = /CREATE INDEX[\s\S]+?;/gi;

    // Match individual CREATE TABLE statements
    const tableMatches = [];
    let match;

    // Split by semicolons but be careful with functions
    const lines = sql.split('\n');
    let currentStatement = '';
    let inFunction = false;

    for (const line of lines) {
        // Skip comments
        if (line.trim().startsWith('--')) continue;

        currentStatement += line + '\n';

        // Check if entering function
        if (line.includes('CREATE OR REPLACE FUNCTION')) {
            inFunction = true;
        }

        // Check if we have a complete CREATE TABLE
        if (!inFunction && currentStatement.includes('CREATE TABLE IF NOT EXISTS') && line.includes(';')) {
            tableMatches.push(currentStatement.trim());
            currentStatement = '';
        }

        // Check if we have a complete CREATE INDEX
        if (!inFunction && currentStatement.includes('CREATE INDEX') && line.includes(';')) {
            if (!currentStatement.includes('CREATE TABLE')) {
                tableMatches.push(currentStatement.trim());
            }
            currentStatement = '';
        }

        // End of function
        if (inFunction && line.includes('$$ LANGUAGE plpgsql')) {
            inFunction = false;
            currentStatement = '';
        }
    }

    console.log('📊 Statements encontrados:', tableMatches.length);

    let success = 0, skipped = 0, errors = 0;

    for (const stmt of tableMatches) {
        if (stmt.length < 20) continue;

        try {
            await sequelize.query(stmt);

            // Extract table/index name
            const tableMatch = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
            const indexMatch = stmt.match(/CREATE INDEX (\w+)/i);

            if (tableMatch) {
                console.log('✅ Tabla:', tableMatch[1]);
            } else if (indexMatch) {
                console.log('✅ Index:', indexMatch[1]);
            }
            success++;
        } catch (e) {
            if (e.message.includes('already exists') || e.message.includes('ya existe')) {
                skipped++;
            } else {
                const name = stmt.match(/CREATE (?:TABLE IF NOT EXISTS|INDEX) (\w+)/i);
                console.log('⚠️', name ? name[1] : 'unknown', '-', e.message.substring(0, 50));
                errors++;
            }
        }
    }

    console.log('\n📊 Resumen:');
    console.log('  ✅ Creados:', success);
    console.log('  ⏭️ Ya existían:', skipped);
    console.log('  ❌ Errores:', errors);

    await sequelize.close();
}

executeMigration().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
