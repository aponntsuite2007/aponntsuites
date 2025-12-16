/**
 * Run kiosk security columns migration
 */
const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('🔄 Running kiosk security columns migration...\n');

    try {
        const migrationPath = path.join(__dirname, '../migrations/20251216_add_kiosk_security_columns.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split by semicolons but handle DO $$ blocks
        const statements = sql.split(/;(?=\s*(?:DO|COMMENT|SELECT|ALTER|CREATE|INSERT|UPDATE|DELETE|DROP)\s)/i)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Found ${statements.length} SQL statements to execute`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            if (stmt.length < 10) continue;

            const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
            console.log(`\n[${i + 1}/${statements.length}] ${preview}...`);

            try {
                await sequelize.query(stmt);
                console.log('   ✅ OK');
            } catch (err) {
                // Some errors are expected (like "column already exists")
                if (err.message.includes('already exists')) {
                    console.log('   ⏭️ Already exists, skipping');
                } else {
                    console.log('   ⚠️', err.message.substring(0, 100));
                }
            }
        }

        // Verify columns
        const [cols] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'kiosks'
            ORDER BY ordinal_position
        `);

        console.log('\n📋 Current kiosks table columns:');
        cols.forEach(c => {
            console.log(`  - ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        console.log('\n✅ Migration completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
