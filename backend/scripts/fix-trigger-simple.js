require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    database: 'attendance_system',
    username: 'postgres',
    password: 'Aedr15150302',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
});

console.log('🔧 [FIX] Simplificando trigger - solo asignar médico, NO crear comunicación...\n');

async function fixTrigger() {
    try {
        await sequelize.authenticate();
        console.log('✅ [DB] Conectado a PostgreSQL\n');

        // Actualizar la función: SOLO asignar médico, sin crear comunicación
        await sequelize.query(`
CREATE OR REPLACE FUNCTION assign_doctor_to_case()
RETURNS TRIGGER AS $$
DECLARE
    v_doctor_id UUID;
BEGIN
    -- Solo asignar si es tipo médico y no tiene médico asignado
    IF NEW.absence_type IN ('medical_illness', 'work_accident', 'non_work_accident', 'occupational_disease', 'maternity')
       AND NEW.assigned_doctor_id IS NULL THEN

        -- Buscar médico activo de la empresa (round-robin básico)
        SELECT ms.id INTO v_doctor_id
        FROM medical_staff ms
        WHERE ms.company_id = NEW.company_id
          AND ms.is_active = true
        ORDER BY (
            SELECT COUNT(*)
            FROM absence_cases ac
            WHERE ac.assigned_doctor_id = ms.id
              AND ac.case_status NOT IN ('closed', 'justified', 'not_justified')
        ) ASC
        LIMIT 1;

        IF v_doctor_id IS NOT NULL THEN
            NEW.assigned_doctor_id := v_doctor_id;
            NEW.assignment_date := CURRENT_TIMESTAMP;
            NEW.case_status := 'under_review';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
        `);

        console.log('✅ [FIX] Función assign_doctor_to_case() actualizada correctamente');
        console.log('   ✓ SOLO asigna médico automáticamente');
        console.log('   ✓ NO crea comunicación (evita FK violation)');
        console.log('   ✓ Comunicaciones deben crearse desde el API después de INSERT\n');

        await sequelize.close();
        console.log('✅ [DB] Conexión cerrada');
        process.exit(0);

    } catch (error) {
        console.error('❌ [ERROR]:', error.message);
        process.exit(1);
    }
}

fixTrigger();
