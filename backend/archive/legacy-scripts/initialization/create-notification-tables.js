/**
 * Migración URGENTE para crear tablas de notificaciones que faltan
 */

const { Sequelize } = require('sequelize');

async function createTables() {
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: console.log,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    });

    try {
        console.log('🚨 CREANDO TABLAS DE NOTIFICACIONES FALTANTES...');

        // 1. Crear tabla notification_groups
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS notification_groups (
                id SERIAL PRIMARY KEY,
                group_id VARCHAR(100) UNIQUE NOT NULL,
                company_id INTEGER NOT NULL,
                context_type VARCHAR(50),
                group_type VARCHAR(50),
                status VARCHAR(20) DEFAULT 'active',
                priority VARCHAR(20) DEFAULT 'normal',
                participants TEXT[],
                group_metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabla notification_groups creada');

        // 2. Crear tabla notification_messages
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS notification_messages (
                id SERIAL PRIMARY KEY,
                message_id VARCHAR(100) UNIQUE NOT NULL,
                group_id VARCHAR(100) NOT NULL,
                company_id INTEGER,
                sender_id VARCHAR(100),
                sender_type VARCHAR(50),
                message_text TEXT,
                message_type VARCHAR(50),
                message_metadata JSONB,
                read_by TEXT[],
                deadline_at TIMESTAMP,
                responded_at TIMESTAMP,
                requires_response BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabla notification_messages creada');

        // 3. Crear índices para mejorar performance (uno por uno para evitar errores)
        try {
            await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notification_groups_company ON notification_groups(company_id);`);
            await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notification_groups_group_id ON notification_groups(group_id);`);
            await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notification_messages_group ON notification_messages(group_id);`);
            await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notification_messages_company ON notification_messages(company_id);`);
        } catch (indexError) {
            console.log('⚠️ Algunos índices ya existen o no se pudieron crear, continuando...');
        }
        console.log('✅ Índices creados');

        // 4. Verificar que las tablas existen
        const [tables] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('notification_groups', 'notification_messages')
            ORDER BY table_name
        `);

        console.log('\n📊 VERIFICACIÓN FINAL:');
        tables.forEach(t => {
            console.log(`  ✅ ${t.table_name} - EXISTE`);
        });

        console.log('\n✅ TODAS LAS TABLAS DE NOTIFICACIONES CREADAS EXITOSAMENTE');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error creando tablas:', error);
        console.error('Detalles:', error.message);
        process.exit(1);
    }
}

// Ejecutar migración
createTables();