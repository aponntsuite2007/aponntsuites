const { Sequelize } = require('sequelize');

const seq = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
});

async function testTriggerQuery() {
    try {
        const result = await seq.query(`
            SELECT ms.id
            FROM medical_staff ms
            WHERE ms.company_id = 11
              AND ms.is_active = true
            ORDER BY (
                SELECT COUNT(*)
                FROM absence_cases ac
                WHERE ac.assigned_doctor_id = ms.id
                  AND ac.case_status NOT IN ('closed', 'justified', 'not_justified')
            ) ASC
            LIMIT 1
        `, { type: Sequelize.QueryTypes.SELECT });

        console.log('📊 Result from trigger query:');
        console.log(result);

        if (result.length > 0 && result[0].id) {
            console.log(`\n✅ doctor_id found: ${result[0].id}`);
        } else {
            console.log('\n❌ NO doctor_id found');
        }

        await seq.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        process.exit(1);
    }
}

testTriggerQuery();
