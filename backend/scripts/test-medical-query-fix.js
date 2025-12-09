/**
 * Test script to verify the medical endpoint query fix
 */
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    user: 'postgres',
    password: 'Aedr15150302',
    database: 'attendance_system',
    port: 5432
});

async function testMedicalQuery() {
    console.log('Testing corrected medical query...\n');

    try {
        const result = await pool.query(`
            SELECT
                u.user_id as id,
                u."firstName" || ' ' || u."lastName" as name,
                (SELECT COUNT(*) FROM medical_certificates
                 WHERE user_id = u.user_id AND status IN ('approved', 'pending', 'under_review')
                 AND (end_date IS NULL OR end_date >= CURRENT_DATE)) as active_certificates,
                (SELECT COUNT(*) FROM absence_cases
                 WHERE employee_id = u.user_id AND case_status IN ('pending', 'under_review', 'awaiting_docs', 'needs_follow_up')) as pending_cases,
                (SELECT COUNT(*) FROM absence_cases
                 WHERE employee_id = u.user_id AND case_status IN ('justified', 'not_justified', 'closed')) as completed_cases
            FROM users u
            WHERE u.company_id = 11
            AND u."isActive" = true
            AND u.role != 'admin'
            LIMIT 5
        `);

        console.log('✅ Query CORREGIDA funciona!');
        console.log('Filas retornadas:', result.rowCount);
        console.log('\nMuestra de resultados:');
        result.rows.forEach((row, i) => {
            console.log(`  ${i + 1}. ${row.name}: ${row.active_certificates} certs, ${row.pending_cases} pending, ${row.completed_cases} completed`);
        });

        // Test the OLD query (should fail or return empty for pending_cases)
        console.log('\n--- Testing OLD query (with incorrect values) ---');
        const oldResult = await pool.query(`
            SELECT COUNT(*) as count FROM absence_cases
            WHERE case_status IN ('new', 'in_progress', 'pending_documentation')
        `);
        console.log('Old query (incorrect values) returned:', oldResult.rows[0].count, 'rows');
        console.log('(Should be 0 since those status values do not exist in the CHECK constraint)');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

testMedicalQuery();
