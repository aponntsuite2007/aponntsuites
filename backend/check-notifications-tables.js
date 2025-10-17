const { Sequelize } = require('sequelize');

async function checkTables() {
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    });

    try {
        console.log('🔍 Verificando tablas y columnas en BD de producción...\n');

        // 1. Verificar tabla notification_groups
        console.log('📋 TABLA: notification_groups');
        const [ngCols] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'notification_groups'
            ORDER BY ordinal_position;
        `);
        if (ngCols.length > 0) {
            ngCols.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
            });
        } else {
            console.log('  ❌ TABLA NO EXISTE');
        }

        // 2. Verificar tabla notification_messages
        console.log('\n📋 TABLA: notification_messages');
        const [nmCols] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'notification_messages'
            ORDER BY ordinal_position;
        `);
        if (nmCols.length > 0) {
            nmCols.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
            });
        } else {
            console.log('  ❌ TABLA NO EXISTE');
        }

        // 3. Verificar tabla compliance_rules
        console.log('\n📋 TABLA: compliance_rules');
        const [crCols] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'compliance_rules'
            ORDER BY ordinal_position;
        `);
        if (crCols.length > 0) {
            crCols.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
            });
        } else {
            console.log('  ❌ TABLA NO EXISTE');
        }

        // 4. Verificar datos en compliance_rules
        if (crCols.length > 0) {
            console.log('\n📊 DATOS en compliance_rules:');
            const [rules] = await sequelize.query(`SELECT COUNT(*) as total FROM compliance_rules`);
            console.log(`  Total reglas: ${rules[0].total}`);
        }

        // 5. Verificar columnas críticas para SLA
        console.log('\n🔍 VERIFICANDO COLUMNAS CRÍTICAS PARA SLA:');
        const [hasCompanyId] = await sequelize.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'notification_messages'
                AND column_name = 'company_id'
            ) as exists;
        `);
        console.log(`  - notification_messages.company_id: ${hasCompanyId[0].exists ? '✅ EXISTE' : '❌ NO EXISTE'}`);

        const [hasDeadline] = await sequelize.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'notification_messages'
                AND column_name = 'deadline_at'
            ) as exists;
        `);
        console.log(`  - notification_messages.deadline_at: ${hasDeadline[0].exists ? '✅ EXISTE' : '❌ NO EXISTE'}`);

        const [hasResponded] = await sequelize.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'notification_messages'
                AND column_name = 'responded_at'
            ) as exists;
        `);
        console.log(`  - notification_messages.responded_at: ${hasResponded[0].exists ? '✅ EXISTE' : '❌ NO EXISTE'}`);

        const [hasRequires] = await sequelize.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'notification_messages'
                AND column_name = 'requires_response'
            ) as exists;
        `);
        console.log(`  - notification_messages.requires_response: ${hasRequires[0].exists ? '✅ EXISTE' : '❌ NO EXISTE'}`);

        // 6. Verificar estructura de notification_groups
        console.log('\n🔍 VERIFICANDO notification_groups:');
        const [hasGroupType] = await sequelize.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'notification_groups'
                AND column_name = 'group_type'
            ) as exists;
        `);
        console.log(`  - notification_groups.group_type: ${hasGroupType[0].exists ? '✅ EXISTE' : '❌ NO EXISTE'}`);

        const [hasId] = await sequelize.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'notification_groups'
                AND column_name = 'id'
            ) as exists;
        `);
        console.log(`  - notification_groups.id: ${hasId[0].exists ? '✅ EXISTE' : '❌ NO EXISTE'}`);

        const [hasGroupId] = await sequelize.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'notification_groups'
                AND column_name = 'group_id'
            ) as exists;
        `);
        console.log(`  - notification_groups.group_id: ${hasGroupId[0].exists ? '✅ EXISTE' : '❌ NO EXISTE'}`);

        console.log('\n✅ Verificación completada');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkTables();