/**
 * Script para ejecutar la migración del Sistema Universal de Conceptos
 * Usa pg directamente para evitar problemas con Sequelize y los casts ::
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'attendance_system',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
    });

    try {
        await client.connect();
        console.log('✅ Conectado a PostgreSQL');

        const sql = fs.readFileSync(
            path.join(__dirname, '..', 'migrations', '20251201_universal_payroll_concept_system.sql'),
            'utf8'
        );

        console.log('🚀 Ejecutando migración Universal Payroll System v5.0...');
        await client.query(sql);
        console.log('✅ Migración completada');

        // Verificar nuevas tablas
        const classesResult = await client.query('SELECT * FROM payroll_concept_classifications ORDER BY calculation_order');
        console.log('\n📊 Clasificaciones Universales:');
        classesResult.rows.forEach(c => {
            console.log(`   [${c.classification_code}] ${c.classification_name} (sign: ${c.sign})`);
        });

        // Verificar tipos con ayuda
        const typesResult = await client.query(`
            SELECT type_code, help_tooltip
            FROM payroll_concept_types
            WHERE help_tooltip IS NOT NULL
            LIMIT 5
        `);
        console.log('\n💡 Tipos con ayuda contextual (muestra):');
        typesResult.rows.forEach(t => {
            console.log(`   [${t.type_code}]: ${t.help_tooltip}`);
        });

        // Verificar nuevas columnas
        const colsResult = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'payroll_concept_types'
            AND column_name IN ('is_remunerative', 'is_pre_tax', 'is_mandatory', 'default_employee_rate', 'default_employer_rate', 'help_tooltip')
        `);
        console.log('\n✅ Nuevas columnas agregadas:');
        colsResult.rows.forEach(c => {
            console.log(`   - ${c.column_name}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.position) {
            console.error(`   Posición: ${error.position}`);
        }
    } finally {
        await client.end();
        console.log('\n🔌 Conexión cerrada');
    }
}

run();
