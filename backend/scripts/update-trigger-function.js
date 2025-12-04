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

console.log('🔧 [UPDATE] Actualizando función assign_doctor_to_case() en PostgreSQL...\n');

async function updateTriggerFunction() {
    try {
        await sequelize.authenticate();
        console.log('✅ [DB] Conectado a PostgreSQL\n');

        // Actualizar la función con el SQL corregido
        await sequelize.query(`
CREATE OR REPLACE FUNCTION assign_doctor_to_case()
RETURNS TRIGGER AS $$
DECLARE
    v_doctor_id UUID;
    v_employee_name TEXT;
    v_employee_legajo TEXT;
    v_employee_dni TEXT;
    v_department TEXT;
    v_shift TEXT;
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

            -- Obtener datos del empleado para la notificación
            SELECT
                u."firstName" || ' ' || u."lastName",
                u."employeeId",
                u.dni,
                d.name,
                s.name
            INTO v_employee_name, v_employee_legajo, v_employee_dni, v_department, v_shift
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN shifts s ON u.shift_id = s.id
            WHERE u.user_id = NEW.employee_id;

            -- Crear notificación inicial al médico
            INSERT INTO medical_communications (
                company_id,
                absence_case_id,
                sender_type,
                sender_id,
                receiver_type,
                receiver_id,
                message_type,
                subject,
                message,
                requires_response,
                response_deadline
            ) VALUES (
                NEW.company_id,
                NEW.id,
                'system',
                NULL,
                'doctor',
                v_doctor_id,
                'initial_notification',
                'Nueva inasistencia médica asignada',
                format(
                    E'Nueva inasistencia por revisar:\\n\\n' ||
                    'Empleado: %s\\n' ||
                    'Legajo: %s\\n' ||
                    'DNI: %s\\n' ||
                    'Departamento: %s\\n' ||
                    'Turno: %s\\n\\n' ||
                    'Tipo: %s\\n' ||
                    'Fecha inicio: %s\\n' ||
                    'Días solicitados: %s\\n\\n' ||
                    'Descripción del empleado:\\n%s',
                    v_employee_name,
                    COALESCE(v_employee_legajo, 'N/A'),
                    COALESCE(v_employee_dni, 'N/A'),
                    COALESCE(v_department, 'N/A'),
                    COALESCE(v_shift, 'N/A'),
                    NEW.absence_type,
                    NEW.start_date,
                    NEW.requested_days,
                    COALESCE(NEW.employee_description, 'Sin descripción')
                ),
                true,
                CURRENT_TIMESTAMP + INTERVAL '48 hours'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
        `);

        console.log('✅ [UPDATE] Función assign_doctor_to_case() actualizada correctamente');
        console.log('   ✓ Cambio aplicado: u."shiftId" → u.shift_id\n');

        await sequelize.close();
        console.log('✅ [DB] Conexión cerrada');
        process.exit(0);

    } catch (error) {
        console.error('❌ [ERROR]:', error.message);
        process.exit(1);
    }
}

updateTriggerFunction();
