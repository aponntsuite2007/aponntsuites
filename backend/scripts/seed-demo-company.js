/**
 * SEED DEMO COMPANY - Datos realistas para demostración
 *
 * Crea:
 * - Empresa DEMO con todos los módulos
 * - 2 sucursales (Argentina + Uruguay)
 * - 4 turnos laborales
 * - 10 usuarios con roles variados
 * - ~100 registros de asistencia coherentes
 * - Calendarios y feriados
 *
 * Uso:
 *   node scripts/seed-demo-company.js [--render]
 *
 * Si usas --render, se conecta a la BD de Render (necesita DATABASE_URL)
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Configuración de conexión
const isRender = process.argv.includes('--render');

const pool = new Pool(isRender ? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
} : {
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

// ============================================================
// DATOS REALISTAS
// ============================================================

const EMPRESA = {
    name: 'DEMO',
    legal_name: 'Demo Corporación S.A.',
    slug: 'demo-corp',
    tax_id: '30-71234567-8',
    contact_email: 'admin@democorp.com',
    contact_phone: '+54 11 4567-8900',
    address: 'Av. Corrientes 1234, Piso 5',
    city: 'Buenos Aires',
    province: 'Ciudad Autónoma de Buenos Aires',
    country: 'Argentina',
    postal_code: 'C1043AAZ',
    license_type: 'enterprise',
    max_employees: 500
};

const SUCURSALES = [
    {
        name: 'Casa Central',
        code: 'AR-CABA',
        address: 'Av. Corrientes 1234, Piso 5',
        city: 'Buenos Aires',
        province: 'Ciudad Autónoma de Buenos Aires',
        country: 'Argentina',
        postal_code: 'C1043AAZ',
        phone: '+54 11 4567-8900',
        latitude: -34.6037,
        longitude: -58.3816,
        timezone: 'America/Argentina/Buenos_Aires',
        is_main: true
    },
    {
        name: 'Sucursal Montevideo',
        code: 'UY-MVD',
        address: '18 de Julio 1234',
        city: 'Montevideo',
        province: 'Montevideo',
        country: 'Uruguay',
        postal_code: '11100',
        phone: '+598 2 901 2345',
        latitude: -34.9011,
        longitude: -56.1645,
        timezone: 'America/Montevideo',
        is_main: false
    }
];

const TURNOS = [
    {
        name: 'Turno Mañana',
        code: 'TM',
        start_time: '08:00:00',
        end_time: '16:00:00',
        break_start: '12:00:00',
        break_end: '13:00:00',
        color: '#3B82F6',
        work_days: [1, 2, 3, 4, 5] // Lun-Vie
    },
    {
        name: 'Turno Tarde',
        code: 'TT',
        start_time: '14:00:00',
        end_time: '22:00:00',
        break_start: '18:00:00',
        break_end: '19:00:00',
        color: '#F59E0B',
        work_days: [1, 2, 3, 4, 5]
    },
    {
        name: 'Turno Noche',
        code: 'TN',
        start_time: '22:00:00',
        end_time: '06:00:00',
        break_start: '02:00:00',
        break_end: '02:30:00',
        color: '#8B5CF6',
        work_days: [1, 2, 3, 4, 5]
    },
    {
        name: 'Turno Comercial',
        code: 'TC',
        start_time: '09:00:00',
        end_time: '18:00:00',
        break_start: '13:00:00',
        break_end: '14:00:00',
        color: '#10B981',
        work_days: [1, 2, 3, 4, 5, 6] // Lun-Sab
    }
];

const DEPARTAMENTOS = [
    { name: 'Recursos Humanos', code: 'RRHH' },
    { name: 'Administración', code: 'ADMIN' },
    { name: 'Sistemas', code: 'IT' },
    { name: 'Operaciones', code: 'OPS' },
    { name: 'Comercial', code: 'SALES' }
];

const USUARIOS = [
    // Admin
    { firstName: 'Admin', lastName: 'Sistema', email: 'admin@democorp.com', role: 'admin', department: 'ADMIN', shift: 'TC', branch: 0 },
    // RRHH
    { firstName: 'María', lastName: 'González', email: 'mgonzalez@democorp.com', role: 'supervisor', department: 'RRHH', shift: 'TM', branch: 0 },
    { firstName: 'Carlos', lastName: 'Rodríguez', email: 'crodriguez@democorp.com', role: 'employee', department: 'RRHH', shift: 'TM', branch: 0 },
    // Sistemas
    { firstName: 'Juan', lastName: 'Martínez', email: 'jmartinez@democorp.com', role: 'supervisor', department: 'IT', shift: 'TM', branch: 0 },
    { firstName: 'Ana', lastName: 'López', email: 'alopez@democorp.com', role: 'employee', department: 'IT', shift: 'TT', branch: 0 },
    // Operaciones
    { firstName: 'Pedro', lastName: 'Fernández', email: 'pfernandez@democorp.com', role: 'supervisor', department: 'OPS', shift: 'TN', branch: 0 },
    { firstName: 'Laura', lastName: 'Díaz', email: 'ldiaz@democorp.com', role: 'employee', department: 'OPS', shift: 'TM', branch: 0 },
    // Comercial
    { firstName: 'Roberto', lastName: 'Sánchez', email: 'rsanchez@democorp.com', role: 'supervisor', department: 'SALES', shift: 'TC', branch: 0 },
    // Uruguay
    { firstName: 'Martín', lastName: 'Pereira', email: 'mpereira@democorp.com', role: 'supervisor', department: 'OPS', shift: 'TM', branch: 1 },
    { firstName: 'Lucía', lastName: 'Silva', email: 'lsilva@democorp.com', role: 'employee', department: 'ADMIN', shift: 'TC', branch: 1 }
];

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function randomMinutes(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMinutesToTime(timeStr, minutes) {
    const [h, m, s] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`;
}

function getWorkDaysInMonth(year, month, workDays) {
    const days = [];
    const date = new Date(year, month - 1, 1);
    while (date.getMonth() === month - 1) {
        const dayOfWeek = date.getDay() || 7; // Domingo = 7
        if (workDays.includes(dayOfWeek)) {
            days.push(new Date(date));
        }
        date.setDate(date.getDate() + 1);
    }
    return days;
}

// ============================================================
// FUNCIONES DE SEED
// ============================================================

async function seedDemoCompany() {
    const client = await pool.connect();

    try {
        console.log('\n🏢 SEED DEMO COMPANY - Iniciando...\n');
        console.log(`📡 Conectando a: ${isRender ? 'RENDER' : 'LOCAL'}\n`);

        await client.query('BEGIN');

        // 1. Verificar si ya existe
        const existing = await client.query(`SELECT company_id FROM companies WHERE slug = $1`, [EMPRESA.slug]);
        if (existing.rows.length > 0) {
            console.log('⚠️  La empresa DEMO ya existe. ¿Desea recrearla? (eliminará todos los datos)');
            console.log('    Para recrear, ejecute: node scripts/seed-demo-company.js --force\n');

            if (!process.argv.includes('--force')) {
                await client.query('ROLLBACK');
                return;
            }

            console.log('🗑️  Eliminando empresa existente...');
            await client.query(`DELETE FROM companies WHERE slug = $1`, [EMPRESA.slug]);
        }

        // 2. Crear empresa
        console.log('📝 Creando empresa DEMO...');
        const companyResult = await client.query(`
            INSERT INTO companies (
                name, legal_name, slug, tax_id, contact_email, contact_phone,
                address, city, province, country, postal_code,
                license_type, max_employees, is_active, contracted_employees
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, 10)
            RETURNING company_id
        `, [
            EMPRESA.name, EMPRESA.legal_name, EMPRESA.slug, EMPRESA.tax_id,
            EMPRESA.contact_email, EMPRESA.contact_phone, EMPRESA.address,
            EMPRESA.city, EMPRESA.province, EMPRESA.country, EMPRESA.postal_code,
            EMPRESA.license_type, EMPRESA.max_employees
        ]);
        const companyId = companyResult.rows[0].company_id;
        console.log(`   ✅ Empresa creada: ID ${companyId}\n`);

        // 3. Crear sucursales
        console.log('🏬 Creando sucursales...');
        const branchIds = [];
        for (const branch of SUCURSALES) {
            const branchResult = await client.query(`
                INSERT INTO branches (
                    company_id, name, code, address, city, province, country,
                    postal_code, phone, latitude, longitude, timezone, is_main, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
                RETURNING id
            `, [
                companyId, branch.name, branch.code, branch.address, branch.city,
                branch.province, branch.country, branch.postal_code, branch.phone,
                branch.latitude, branch.longitude, branch.timezone, branch.is_main
            ]);
            branchIds.push(branchResult.rows[0].id);
            console.log(`   ✅ ${branch.name} (${branch.country})`);
        }
        console.log('');

        // 4. Crear departamentos
        console.log('🏛️  Creando departamentos...');
        const deptIds = {};
        for (const dept of DEPARTAMENTOS) {
            const deptResult = await client.query(`
                INSERT INTO departments (company_id, name, code, is_active)
                VALUES ($1, $2, $3, true)
                RETURNING department_id
            `, [companyId, dept.name, dept.code]);
            deptIds[dept.code] = deptResult.rows[0].department_id;
            console.log(`   ✅ ${dept.name}`);
        }
        console.log('');

        // 5. Crear turnos
        console.log('⏰ Creando turnos...');
        const shiftIds = {};
        for (const shift of TURNOS) {
            const shiftResult = await client.query(`
                INSERT INTO shifts (
                    company_id, name, code, start_time, end_time,
                    break_start, break_end, color, work_days, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
                RETURNING shift_id
            `, [
                companyId, shift.name, shift.code, shift.start_time, shift.end_time,
                shift.break_start, shift.break_end, shift.color, shift.work_days
            ]);
            shiftIds[shift.code] = shiftResult.rows[0].shift_id;
            console.log(`   ✅ ${shift.name} (${shift.start_time} - ${shift.end_time})`);
        }
        console.log('');

        // 6. Crear usuarios
        console.log('👥 Creando usuarios...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const userIds = [];
        const userShifts = [];

        for (const user of USUARIOS) {
            const empCode = `EMP-${String(userIds.length + 1).padStart(3, '0')}`;
            const userId = uuidv4();

            await client.query(`
                INSERT INTO users (
                    user_id, company_id, "firstName", "lastName", email, password,
                    role, employee_code, department_id, branch_id, shift_id,
                    hire_date, is_active, phone
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13)
            `, [
                userId, companyId, user.firstName, user.lastName, user.email, hashedPassword,
                user.role, empCode, deptIds[user.department], branchIds[user.branch],
                shiftIds[user.shift], '2024-01-15', `+54 11 ${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`
            ]);

            userIds.push(userId);
            userShifts.push({ id: shiftIds[user.shift], ...TURNOS.find(t => t.code === user.shift) });

            const roleIcon = user.role === 'admin' ? '👑' : user.role === 'supervisor' ? '⭐' : '👤';
            console.log(`   ${roleIcon} ${user.firstName} ${user.lastName} (${user.role}) - ${user.shift}`);
        }
        console.log('');

        // 7. Generar asistencias (últimos 30 días)
        console.log('📊 Generando asistencias...');
        let totalAttendances = 0;
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);

        for (let i = 0; i < userIds.length; i++) {
            const userId = userIds[i];
            const shift = userShifts[i];
            let userAttendances = 0;

            // Iterar cada día
            const currentDate = new Date(startDate);
            while (currentDate <= today) {
                const dayOfWeek = currentDate.getDay() || 7;

                // Solo días laborales del turno
                if (shift.work_days.includes(dayOfWeek)) {
                    // 90% probabilidad de asistencia
                    if (Math.random() < 0.9) {
                        // Variación en entrada (-10 a +15 minutos)
                        const entryVariation = randomMinutes(-10, 15);
                        const checkIn = addMinutesToTime(shift.start_time, entryVariation);

                        // Variación en salida (-5 a +30 minutos)
                        const exitVariation = randomMinutes(-5, 30);
                        const checkOut = addMinutesToTime(shift.end_time, exitVariation);

                        const dateStr = currentDate.toISOString().split('T')[0];
                        const status = entryVariation > 10 ? 'late' : 'present';

                        await client.query(`
                            INSERT INTO attendances (
                                user_id, company_id, attendance_date, check_in, check_out,
                                shift_id, status, source, is_manual
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'biometric', false)
                        `, [
                            userId, companyId, dateStr,
                            `${dateStr} ${checkIn}`, `${dateStr} ${checkOut}`,
                            shift.id, status
                        ]);

                        userAttendances++;
                        totalAttendances++;
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }

            console.log(`   ✅ Usuario ${i + 1}: ${userAttendances} asistencias`);
        }
        console.log(`   📈 Total: ${totalAttendances} registros\n`);

        // 8. Asignar TODOS los módulos
        console.log('📦 Asignando módulos...');
        const modulesResult = await client.query(`
            SELECT id, key, name FROM system_modules WHERE is_active = true
        `);

        for (const mod of modulesResult.rows) {
            await client.query(`
                INSERT INTO company_modules (company_id, module_id, is_active, activated_at)
                VALUES ($1, $2, true, NOW())
                ON CONFLICT (company_id, module_id) DO UPDATE SET is_active = true
            `, [companyId, mod.id]);
        }
        console.log(`   ✅ ${modulesResult.rows.length} módulos asignados\n`);

        // 9. Crear algunos casos legales de prueba
        console.log('⚖️  Creando casos legales de demo...');
        const legalUser = userIds[2]; // Carlos Rodríguez
        await client.query(`
            INSERT INTO legal_cases (
                company_id, case_type, employee_id, employee_name, employee_position,
                title, description, current_stage, priority, risk_assessment,
                incident_date, notification_date, created_by, assigned_to
            ) VALUES (
                $1, 'warning_letter', $2, 'Carlos Rodríguez', 'Analista RRHH',
                'Apercibimiento por llegadas tardías',
                'El empleado ha acumulado 5 llegadas tardías en el último mes.',
                'prejudicial', 'low', 'low',
                CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '5 days',
                $3, $3
            )
        `, [companyId, legalUser, userIds[0]]);
        console.log('   ✅ 1 caso legal creado\n');

        // 10. Crear configuración de vacaciones
        console.log('🏖️  Configurando vacaciones...');
        await client.query(`
            INSERT INTO vacation_configurations (company_id, country_code, min_days_per_year, max_days_per_year, days_per_year_of_service)
            VALUES ($1, 'AR', 14, 35, '{"1": 14, "5": 21, "10": 28, "20": 35}')
            ON CONFLICT DO NOTHING
        `, [companyId]);
        console.log('   ✅ Configuración Argentina aplicada\n');

        await client.query('COMMIT');

        // Resumen final
        console.log('═══════════════════════════════════════════════════════════');
        console.log('✅ SEED COMPLETADO EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`
🏢 Empresa: ${EMPRESA.name} (${EMPRESA.legal_name})
   Slug: ${EMPRESA.slug}
   ID: ${companyId}

🔐 Credenciales de acceso:
   Usuario: admin@democorp.com
   Contraseña: admin123

🏬 Sucursales: ${SUCURSALES.length}
   - Casa Central (Argentina)
   - Sucursal Montevideo (Uruguay)

👥 Usuarios: ${USUARIOS.length}
   - 1 Admin
   - 4 Supervisores
   - 5 Empleados

⏰ Turnos: ${TURNOS.length}
   - Mañana, Tarde, Noche, Comercial

📊 Asistencias: ${totalAttendances} registros
   - Últimos 30 días
   - Con variaciones realistas

📦 Módulos: ${modulesResult.rows.length} activos
`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar
seedDemoCompany();
