const { Client } = require('pg');

async function runMigrations() {
    const client = new Client({
        connectionString: 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔌 Conectando a la base de datos de Render...');
        await client.connect();
        console.log('✅ Conectado exitosamente\n');

        // Ejecutar tabla por tabla para debugging
        const tables = [
            `CREATE TABLE IF NOT EXISTS notification_groups (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                group_type VARCHAR(50) NOT NULL,
                initiator_type VARCHAR(20) NOT NULL,
                initiator_id VARCHAR(100) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                status VARCHAR(20) DEFAULT 'open',
                priority VARCHAR(10) DEFAULT 'normal',
                company_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                closed_at TIMESTAMP,
                closed_by VARCHAR(100),
                metadata JSONB
            )`,

            `CREATE TABLE IF NOT EXISTS notification_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                group_id UUID NOT NULL REFERENCES notification_groups(id) ON DELETE CASCADE,
                sequence_number INT NOT NULL,
                sender_type VARCHAR(20) NOT NULL,
                sender_id VARCHAR(100) NOT NULL,
                sender_name VARCHAR(255),
                recipient_type VARCHAR(20) NOT NULL,
                recipient_id VARCHAR(100) NOT NULL,
                recipient_name VARCHAR(255),
                message_type VARCHAR(30) NOT NULL,
                subject VARCHAR(255),
                content TEXT NOT NULL,
                content_encrypted TEXT,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                deadline_at TIMESTAMP,
                requires_response BOOLEAN DEFAULT false,
                delivered_at TIMESTAMP,
                read_at TIMESTAMP,
                responded_at TIMESTAMP,
                message_hash VARCHAR(64) NOT NULL,
                hash_algorithm VARCHAR(20) DEFAULT 'SHA-256',
                channels JSONB DEFAULT '["web"]',
                channel_status JSONB,
                attachments JSONB,
                is_deleted BOOLEAN DEFAULT false,
                company_id INT NOT NULL
            )`
        ];

        for (let i = 0; i < tables.length; i++) {
            console.log(`📋 Creando tabla ${i + 1}/${tables.length}...`);
            await client.query(tables[i]);
            console.log(`✅ Tabla ${i + 1} creada\n`);
        }

        console.log('🎉 Tablas base creadas con éxito');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigrations();
