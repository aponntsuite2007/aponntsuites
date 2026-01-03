const { Client } = require('pg');
require('dotenv').config();

async function activateFinanceModules() {
    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'attendance_system'
    });

    try {
        await client.connect();
        console.log('✅ Conectado a PostgreSQL\n');

        // Obtener active_modules actuales
        const result = await client.query('SELECT active_modules FROM companies WHERE company_id = $1', [1]);
        const activeModules = JSON.parse(result.rows[0].active_modules);

        console.log('📊 Módulos actuales:', Object.keys(activeModules).length);

        // Agregar módulos finance faltantes
        const newModules = {
            'siac-commercial': true,
            'siac-collections': true,
            'procurement-management': true
        };

        let added = 0;
        for (const [key, value] of Object.entries(newModules)) {
            if (!activeModules[key]) {
                activeModules[key] = value;
                console.log(`  ✓ Agregado: ${key}`);
                added++;
            } else {
                console.log(`  ○ Ya existe: ${key}`);
            }
        }

        if (added > 0) {
            // Actualizar en BD
            await client.query(
                'UPDATE companies SET active_modules = $1 WHERE company_id = $2',
                [JSON.stringify(activeModules), 1]
            );
            console.log(`\n✅ ${added} módulos agregados a la empresa\n`);
        } else {
            console.log('\n✅ Todos los módulos ya estaban activos\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

activateFinanceModules();
