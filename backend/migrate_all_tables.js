const { Client } = require('pg');
const fs = require('fs');

async function runMigrations() {
    const client = new Client({
        connectionString: 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Conectando a Render...');
        await client.connect();
        console.log('✅ Conectado\n');

        // Leer el SQL original y ejecutar COMMENT ON TABLE al final
        const createTablesSQL = fs.readFileSync('database/migrations/20251016_create_notification_system_tables.sql', 'utf-8');
        
        // Extraer solo los CRE ATE TABLE statements (sin INDEX ni constraints complejos)
        const tableRegex = /CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\);/gm;
        let match;
        let tableCount = 0;

        while ((match = tableRegex.exec(createTablesSQL)) !== null) {
            const tableName = match[1];
            let tableBody = match[2];
            
            // Remover líneas de INDEX
            tableBody = tableBody.split('\n').filter(line => {
                const trimmed = line.trim();
                return !trimmed.startsWith('INDEX ');
            }).join('\n');
            
            // Remover UNIQUE inline
            tableBody = tableBody.replace(/,?\s*UNIQUE\([^)]+\)/gm, '');
            
            // Limpiar comas sobrantes
            tableBody = tableBody.replace(/,\s*\)/gm, ')');
            tableBody = tableBody.replace(/,(\s*,)+/gm, ',');
            
            const sql = \`CREATE TABLE IF NOT EXISTS \${tableName} (\${tableBody});\`;
            
            console.log(\`📋 Creando tabla \${tableName}...\`);
            try {
                await client.query(sql);
                tableCount++;
                console.log(\`✅ Tabla \${tableName} creada (\${tableCount})\n\`);
            } catch (err) {
                console.error(\`❌ Error en tabla \${tableName}:\`, err.message);
            }
        }

        console.log(\`\n🎉 Total: \${tableCount} tablas creadas\`);
        
        // Ahora ejecutar los INSERT de datos
        console.log('\n📋 Insertando datos de prueba...');
        const insertSQL = fs.readFileSync('database/migrations/20251016_insert_notification_system_data.sql', 'utf-8');
        await client.query(insertSQL);
        console.log('✅ Datos insertados\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

runMigrations();
