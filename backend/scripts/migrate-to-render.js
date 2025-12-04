/**
 * Script para migrar la base de datos local a Render
 * Ejecuta el SQL dump directamente usando la conexión de Node.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Conexión a Render
const renderConfig = {
    host: 'dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com',
    port: 5432,
    database: 'attendance_system_866u',
    user: 'attendance_system_866u_user',
    password: 'Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt',
    ssl: { rejectUnauthorized: false }
};

async function migrate() {
    console.log('🚀 Iniciando migración a Render...');

    const client = new Client(renderConfig);

    try {
        await client.connect();
        console.log('✅ Conectado a Render PostgreSQL');

        // Leer el archivo SQL
        const sqlPath = 'C:\\Bio\\backup_full_local.sql';
        console.log(`📄 Leyendo ${sqlPath}...`);

        let sql = fs.readFileSync(sqlPath, 'utf8');
        console.log(`📊 Archivo SQL: ${(sql.length / 1024 / 1024).toFixed(2)} MB`);

        // Eliminar comandos que no funcionan en Render (no tenemos permisos de superuser)
        sql = sql.replace(/^(CREATE EXTENSION|COMMENT ON EXTENSION|DROP EXTENSION|CREATE SCHEMA|ALTER SCHEMA).*$/gm, '-- SKIPPED: $&');

        // Ejecutar en bloques más pequeños para evitar timeouts
        // Dividir por comandos completos (terminados en ;)
        const statements = [];
        let currentStatement = '';
        let inString = false;
        let stringChar = '';
        let inDollarQuote = false;
        let dollarTag = '';

        for (let i = 0; i < sql.length; i++) {
            const char = sql[i];
            const nextChar = sql[i + 1];

            // Detectar inicio/fin de strings
            if (!inDollarQuote && (char === "'" || char === '"') && sql[i - 1] !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                }
            }

            // Detectar dollar quotes $$
            if (!inString && char === '$') {
                const dollarMatch = sql.slice(i).match(/^\$[\w]*\$/);
                if (dollarMatch) {
                    if (!inDollarQuote) {
                        inDollarQuote = true;
                        dollarTag = dollarMatch[0];
                    } else if (sql.slice(i, i + dollarTag.length) === dollarTag) {
                        inDollarQuote = false;
                    }
                }
            }

            currentStatement += char;

            // Si encontramos ; fuera de strings, es fin de statement
            if (char === ';' && !inString && !inDollarQuote) {
                const trimmed = currentStatement.trim();
                if (trimmed && !trimmed.startsWith('--')) {
                    statements.push(trimmed);
                }
                currentStatement = '';
            }
        }

        console.log(`📝 Total statements a ejecutar: ${statements.length}`);

        let executed = 0;
        let errors = 0;
        const errorLog = [];

        // Ejecutar en transacción
        await client.query('BEGIN');

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];

            // Skip comandos problemáticos
            if (stmt.match(/^--\s*SKIPPED/i) ||
                stmt.match(/^SET\s+default_tablespace/i) ||
                stmt.match(/^SELECT\s+pg_catalog\.set_config/i) ||
                stmt.match(/^ALTER\s+.*\s+OWNER\s+TO/i) ||
                stmt.match(/^GRANT\s+/i) ||
                stmt.match(/^REVOKE\s+/i)) {
                continue;
            }

            try {
                await client.query(stmt);
                executed++;

                if (executed % 100 === 0) {
                    console.log(`   ⏳ Ejecutados: ${executed}/${statements.length}`);
                }
            } catch (err) {
                // Ignorar errores de "ya existe" o "no existe"
                if (!err.message.includes('already exists') &&
                    !err.message.includes('does not exist') &&
                    !err.message.includes('ya existe') &&
                    !err.message.includes('no existe')) {
                    errors++;
                    if (errors <= 20) {
                        errorLog.push({
                            stmt: stmt.substring(0, 200),
                            error: err.message
                        });
                    }
                }
            }
        }

        await client.query('COMMIT');

        console.log('\n📊 RESUMEN DE MIGRACIÓN:');
        console.log(`   ✅ Statements ejecutados: ${executed}`);
        console.log(`   ❌ Errores: ${errors}`);

        if (errorLog.length > 0) {
            console.log('\n⚠️ Primeros errores encontrados:');
            errorLog.forEach((e, i) => {
                console.log(`   ${i + 1}. ${e.error}`);
                console.log(`      SQL: ${e.stmt}...`);
            });
        }

        // Verificar tablas creadas
        const tables = await client.query(`
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
        `);
        console.log(`\n📋 Tablas en Render: ${tables.rows.length}`);

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        try {
            await client.query('ROLLBACK');
        } catch (e) {}
    } finally {
        await client.end();
    }
}

migrate().catch(console.error);
