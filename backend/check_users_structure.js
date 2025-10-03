const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT,
});

async function checkUsersStructure() {
    try {
        console.log('🔍 [CHECK] Verificando estructura de tabla users...\n');

        // Verificar estructura de la tabla
        const structure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);

        console.log('📋 [STRUCTURE] Campos de la tabla users:');
        for (const row of structure.rows) {
            console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        }

        // Verificar índices únicos
        const indexes = await pool.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'users'
            AND indexdef LIKE '%UNIQUE%'
        `);

        console.log('\n🔑 [INDEXES] Índices únicos en users:');
        for (const row of indexes.rows) {
            console.log(`   ${row.indexname}: ${row.indexdef}`);
        }

        // Verificar constrains únicos
        const constraints = await pool.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint
            WHERE conrelid = 'users'::regclass
            AND contype = 'u'
        `);

        console.log('\n🛡️ [CONSTRAINTS] Restricciones únicas en users:');
        for (const row of constraints.rows) {
            console.log(`   ${row.conname}: ${row.definition}`);
        }

        // Verificar datos existentes
        const userCount = await pool.query('SELECT COUNT(*) as total FROM users');
        console.log(`\n👥 [DATA] Total usuarios: ${userCount.rows[0].total}`);

        // Verificar admins por empresa
        const adminCheck = await pool.query(`
            SELECT company_id, COUNT(*) as admin_count
            FROM users
            WHERE role = 'admin'
            GROUP BY company_id
            ORDER BY company_id
        `);

        console.log('\n📊 [ADMINS] Admins por empresa:');
        for (const row of adminCheck.rows) {
            console.log(`   Empresa ${row.company_id}: ${row.admin_count} admin(s)`);
        }

    } catch (error) {
        console.error('❌ [ERROR] Error verificando estructura:', error.message);
    } finally {
        await pool.end();
    }
}

checkUsersStructure();