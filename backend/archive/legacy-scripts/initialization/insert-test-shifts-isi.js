const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

async function insertTestShifts() {
    console.log('🕐 Insertando turnos de prueba para ISI (company_id=11)...\n');

    try {
        // Verificar company ISI
        const companyResult = await pool.query(
            'SELECT company_id, name FROM companies WHERE company_id = 11'
        );

        if (companyResult.rows.length === 0) {
            console.log('❌ Empresa ISI (company_id=11) no encontrada');
            return;
        }

        console.log(`✅ Empresa encontrada: ${companyResult.rows[0].name} (company_id: ${companyResult.rows[0].company_id})\n`);

        // Insertar Turno Mañana
        const turnoMañana = await pool.query(`
            INSERT INTO shifts (
                name,
                "startTime",
                "endTime",
                "breakStartTime",
                "breakEndTime",
                "toleranceMinutes",
                "isActive",
                description,
                days,
                company_id,
                "shiftType",
                "createdAt",
                "updatedAt"
            ) VALUES (
                'Turno Mañana',
                '08:00:00',
                '17:00:00',
                '12:00:00',
                '13:00:00',
                10,
                true,
                'Turno estándar de mañana - Lunes a Viernes',
                '[1,2,3,4,5]'::json,
                11,
                'standard',
                NOW(),
                NOW()
            )
            RETURNING id, name
        `);

        if (turnoMañana.rows.length > 0) {
            console.log(`✅ Turno Mañana creado (ID: ${turnoMañana.rows[0].id})`);
            console.log(`   Horario: 08:00 - 17:00 | Descanso: 12:00 - 13:00`);
        } else {
            console.log('⚠️  Turno Mañana ya existe');
        }

        // Insertar Turno Tarde
        const turnoTarde = await pool.query(`
            INSERT INTO shifts (
                name,
                "startTime",
                "endTime",
                "toleranceMinutes",
                "isActive",
                description,
                days,
                company_id,
                "shiftType",
                "createdAt",
                "updatedAt"
            ) VALUES (
                'Turno Tarde',
                '14:00:00',
                '22:00:00',
                15,
                true,
                'Turno de tarde - Lunes a Viernes',
                '[1,2,3,4,5]'::json,
                11,
                'standard',
                NOW(),
                NOW()
            )
            RETURNING id, name
        `);

        if (turnoTarde.rows.length > 0) {
            console.log(`✅ Turno Tarde creado (ID: ${turnoTarde.rows[0].id})`);
            console.log(`   Horario: 14:00 - 22:00 | Sin descanso programado`);
        } else {
            console.log('⚠️  Turno Tarde ya existe');
        }

        console.log('\n📊 Verificando turnos para ISI...');
        const allShifts = await pool.query(
            'SELECT id, name, "startTime", "endTime" FROM shifts WHERE company_id = 11 ORDER BY name'
        );

        console.log(`\n✅ Total turnos ISI: ${allShifts.rows.length}`);
        allShifts.rows.forEach(shift => {
            console.log(`   - ${shift.name} (${shift.startTime.substring(0,5)} - ${shift.endTime.substring(0,5)})`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

insertTestShifts();
