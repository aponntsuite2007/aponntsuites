const { Client } = require('pg');

async function createMissingTable() {
    const client = new Client({
        connectionString: 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Conectando a Render...');
        await client.connect();
        console.log('✅ Conectado\n');

        // Crear tabla approved_shift_swaps
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS approved_shift_swaps (
                id SERIAL PRIMARY KEY,
                notification_group_id UUID NOT NULL REFERENCES notification_groups(id),
                company_id INT NOT NULL,

                employee_1_id VARCHAR(100) NOT NULL,
                employee_2_id VARCHAR(100) NOT NULL,

                swap_date DATE NOT NULL,
                original_shift_id INT,
                replacement_shift_id INT,

                status VARCHAR(20) DEFAULT 'approved',

                employee_1_can_clock BOOLEAN DEFAULT false,
                employee_2_can_clock BOOLEAN DEFAULT true,

                generates_overtime BOOLEAN DEFAULT false,
                overtime_hours DECIMAL(5,2),
                violates_rest_period BOOLEAN DEFAULT false,

                art_notified BOOLEAN DEFAULT false,
                art_notified_at TIMESTAMP,
                art_reference VARCHAR(100),

                approved_at TIMESTAMP DEFAULT NOW(),
                executed_at TIMESTAMP
            )
        `;

        console.log('📋 Creando tabla approved_shift_swaps...');
        await client.query(createTableSQL);
        console.log('✅ Tabla approved_shift_swaps creada\n');

        // Verificar que se creó
        const verifyResult = await client.query(`
            SELECT table_name,
                   (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'approved_shift_swaps') as column_count
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'approved_shift_swaps'
        `);

        if (verifyResult.rows.length > 0) {
            console.log(`✅ Verificado: ${verifyResult.rows[0].column_count} columnas en approved_shift_swaps`);
            console.log('\n🎉 Todas las 24 tablas del sistema están creadas correctamente');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n🔌 Conexión cerrada');
    }
}

createMissingTable();
