#!/usr/bin/env node
/**
 * 🧪 SETUP KIOSK TESTING - EMPRESA ISI (ID=11)
 * =============================================
 * Configura entorno completo para testing de kiosk:
 * - 1000+ usuarios con Faker
 * - Departamentos adicionales
 * - Configuración de kioscos con departamentos autorizados
 * - Asignación de departamentos a usuarios
 */

const { Pool } = require('pg');
const { faker } = require('@faker-js/faker/locale/es');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system';
const pool = new Pool({ connectionString: DB_URL });

const COMPANY_ID = 11;
const TARGET_USERS = 1000;
const DEFAULT_PASSWORD = bcrypt.hashSync('test123', 10);

// Departamentos adicionales para crear
const NEW_DEPARTMENTS = [
    'Producción',
    'Ventas',
    'Administración',
    'Logística',
    'Calidad',
    'Mantenimiento',
    'Compras',
    'Contabilidad',
    'Seguridad e Higiene',
    'Atención al Cliente'
];

async function main() {
    console.log('🚀 SETUP KIOSK TESTING - EMPRESA ISI (ID=11)');
    console.log('=============================================\n');

    try {
        // 1. Verificar empresa existe
        const companyCheck = await pool.query(
            'SELECT name, slug FROM companies WHERE company_id = $1',
            [COMPANY_ID]
        );

        if (companyCheck.rows.length === 0) {
            throw new Error('Empresa ISI (ID=11) no existe');
        }
        console.log('✅ Empresa:', companyCheck.rows[0].name);

        // 2. Crear departamentos adicionales
        console.log('\n📁 CREANDO DEPARTAMENTOS ADICIONALES...');
        const departmentIds = await createDepartments();
        console.log(`   ✅ ${departmentIds.length} departamentos disponibles`);

        // 3. Contar usuarios actuales
        const currentUsers = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE company_id = $1',
            [COMPANY_ID]
        );
        const existingCount = parseInt(currentUsers.rows[0].count);
        console.log(`\n👥 USUARIOS ACTUALES: ${existingCount}`);

        // 4. Crear usuarios hasta llegar a TARGET_USERS
        const usersToCreate = Math.max(0, TARGET_USERS - existingCount);
        if (usersToCreate > 0) {
            console.log(`   📝 Creando ${usersToCreate} usuarios nuevos...`);
            await createUsers(usersToCreate, departmentIds);
            console.log(`   ✅ ${usersToCreate} usuarios creados`);
        } else {
            console.log('   ⏭️ Ya hay suficientes usuarios');
        }

        // 5. Asignar departamentos a usuarios sin departamento
        console.log('\n🏢 ASIGNANDO DEPARTAMENTOS A USUARIOS SIN ASIGNAR...');
        const assigned = await assignDepartmentsToUsers(departmentIds);
        console.log(`   ✅ ${assigned} usuarios actualizados`);

        // 6. Configurar kioscos con departamentos autorizados
        console.log('\n📟 CONFIGURANDO KIOSCOS CON DEPARTAMENTOS...');
        await configureKiosks(departmentIds);
        console.log('   ✅ Kioscos configurados');

        // 7. Verificar configuración de tolerancias
        console.log('\n⏰ VERIFICANDO CONFIGURACIÓN DE TURNOS/TOLERANCIAS...');
        await checkShiftsConfiguration();

        // 8. Resumen final
        console.log('\n═══════════════════════════════════════════════');
        console.log('📊 RESUMEN FINAL');
        console.log('═══════════════════════════════════════════════');

        const finalStats = await getFinalStats();
        console.log(`   👥 Total usuarios: ${finalStats.users}`);
        console.log(`   📁 Departamentos: ${finalStats.departments}`);
        console.log(`   📟 Kioscos activos: ${finalStats.kiosks}`);
        console.log(`   🔐 Templates biométricos: ${finalStats.biometrics}`);
        console.log(`   ⏰ Turnos configurados: ${finalStats.shifts}`);
        console.log('═══════════════════════════════════════════════\n');

        console.log('🎉 SETUP COMPLETADO - Listo para testing de kiosk!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

async function createDepartments() {
    const departmentIds = [];

    // Obtener departamentos existentes
    const existing = await pool.query(
        'SELECT id, name FROM departments WHERE company_id = $1',
        [COMPANY_ID]
    );

    existing.rows.forEach(d => departmentIds.push(d.id));
    const existingNames = existing.rows.map(d => d.name.toLowerCase());

    // Crear nuevos (con prefijo ISI para evitar conflictos)
    for (const deptName of NEW_DEPARTMENTS) {
        const fullName = `${deptName} - ISI`;
        if (!existingNames.includes(fullName.toLowerCase()) && !existingNames.includes(deptName.toLowerCase())) {
            try {
                const result = await pool.query(
                    `INSERT INTO departments (name, company_id, is_active, created_at, updated_at)
                     VALUES ($1, $2, true, NOW(), NOW())
                     ON CONFLICT (name) DO UPDATE SET company_id = EXCLUDED.company_id
                     RETURNING id`,
                    [fullName, COMPANY_ID]
                );
                departmentIds.push(result.rows[0].id);
                console.log(`   + Creado: ${fullName}`);
            } catch (e) {
                // Si ya existe en otra empresa, buscar o ignorar
                console.log(`   ⏭️ ${deptName} ya existe`);
            }
        }
    }

    return departmentIds;
}

async function createUsers(count, departmentIds) {
    const batchSize = 100;
    let created = 0;

    // Obtener último legajo
    const lastLegajo = await pool.query(
        `SELECT MAX(CAST(SUBSTRING(legajo FROM 'EMP-ISI-([0-9]+)') AS INTEGER)) as max_num
         FROM users WHERE company_id = $1 AND legajo LIKE 'EMP-ISI-%'`,
        [COMPANY_ID]
    );
    let legajoNum = (lastLegajo.rows[0].max_num || 0) + 1;

    // Obtener último DNI usado para generar únicos
    const lastDni = await pool.query(
        `SELECT MAX(CAST(dni AS INTEGER)) as max_dni
         FROM users WHERE dni ~ '^[0-9]+$'`
    );
    let dniNum = (parseInt(lastDni.rows[0].max_dni) || 20000000) + 1;

    while (created < count) {
        const batchCount = Math.min(batchSize, count - created);
        const values = [];
        const placeholders = [];
        let paramIndex = 1;

        const now = new Date().toISOString();

        for (let i = 0; i < batchCount; i++) {
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            const email = faker.internet.email({ firstName, lastName, provider: 'isi.com.ar' }).toLowerCase();
            const legajo = `EMP-ISI-${String(legajoNum++).padStart(4, '0')}`;
            const departmentId = departmentIds[Math.floor(Math.random() * departmentIds.length)];
            const userId = uuidv4();
            const employeeId = legajo;
            const dni = String(dniNum++); // DNI único

            values.push(
                userId,           // 1
                firstName,        // 2
                lastName,         // 3
                email,            // 4
                DEFAULT_PASSWORD, // 5
                'employee',       // 6
                COMPANY_ID,       // 7
                departmentId,     // 8
                legajo,           // 9
                employeeId,       // 10
                dni,              // 11
                true,             // 12 isActive
                true,             // 13 can_use_kiosk
                false,            // 14 can_use_all_kiosks
                '[]',             // 15 authorized_kiosks
                false,            // 16 has_flexible_schedule
                now,              // 17 createdAt
                now               // 18 updatedAt
            );

            placeholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8}, $${paramIndex+9}, $${paramIndex+10}, $${paramIndex+11}, $${paramIndex+12}, $${paramIndex+13}, $${paramIndex+14}::jsonb, $${paramIndex+15}, $${paramIndex+16}, $${paramIndex+17})`);
            paramIndex += 18;
        }

        await pool.query(
            `INSERT INTO users (
                user_id, "firstName", "lastName", email, password, role, company_id,
                department_id, legajo, "employeeId", dni, "isActive",
                can_use_kiosk, can_use_all_kiosks, authorized_kiosks, has_flexible_schedule,
                "createdAt", "updatedAt"
            ) VALUES ${placeholders.join(', ')}
            ON CONFLICT (email) DO NOTHING`,
            values
        );

        created += batchCount;
        process.stdout.write(`   📝 Progreso: ${created}/${count}\r`);
    }
    console.log('');
}

async function assignDepartmentsToUsers(departmentIds) {
    // Usuarios sin departamento
    const result = await pool.query(`
        UPDATE users
        SET department_id = $1
        WHERE company_id = $2
          AND department_id IS NULL
        RETURNING user_id`,
        [departmentIds[0], COMPANY_ID]
    );

    return result.rowCount;
}

async function configureKiosks(departmentIds) {
    // Obtener kioscos activos
    const kiosks = await pool.query(
        'SELECT id, name FROM kiosks WHERE company_id = $1 AND is_active = true',
        [COMPANY_ID]
    );

    // Configurar cada kiosko con algunos departamentos autorizados
    for (let i = 0; i < kiosks.rows.length; i++) {
        const kiosk = kiosks.rows[i];

        // Asignar subset de departamentos (rotando)
        const startIdx = (i * 3) % departmentIds.length;
        const authorizedDepts = departmentIds.slice(startIdx, startIdx + 4);

        // Si el primer kiosko ("principal"), autorizar TODOS los departamentos
        if (kiosk.name.toLowerCase() === 'principal') {
            await pool.query(
                `UPDATE kiosks SET authorized_departments = $1::jsonb WHERE id = $2`,
                [JSON.stringify(departmentIds), kiosk.id]
            );
            console.log(`   📟 ${kiosk.name}: TODOS los departamentos autorizados`);
        } else {
            await pool.query(
                `UPDATE kiosks SET authorized_departments = $1::jsonb WHERE id = $2`,
                [JSON.stringify(authorizedDepts), kiosk.id]
            );
            console.log(`   📟 ${kiosk.name}: ${authorizedDepts.length} departamentos autorizados`);
        }
    }
}

async function checkShiftsConfiguration() {
    // Ver si hay turnos configurados (usando camelCase de la BD)
    const shifts = await pool.query(
        `SELECT id, name, "startTime", "endTime", "toleranceMinutesEntry", "toleranceMinutesExit"
         FROM shifts WHERE company_id = $1 LIMIT 5`,
        [COMPANY_ID]
    );

    if (shifts.rows.length === 0) {
        console.log('   ⚠️ No hay turnos configurados para esta empresa');
        console.log('   📝 Creando turno por defecto...');

        const now = new Date().toISOString();
        await pool.query(`
            INSERT INTO shifts (name, company_id, "startTime", "endTime", "toleranceMinutesEntry", "toleranceMinutesExit", "isActive", "createdAt", "updatedAt")
            VALUES
                ('Turno Mañana', $1, '08:00:00', '17:00:00', 10, 5, true, $2, $2),
                ('Turno Tarde', $1, '14:00:00', '22:00:00', 10, 5, true, $2, $2),
                ('Turno Noche', $1, '22:00:00', '06:00:00', 10, 5, true, $2, $2)
            ON CONFLICT DO NOTHING
        `, [COMPANY_ID, now]);

        console.log('   ✅ Turnos creados: Mañana (8-17), Tarde (14-22), Noche (22-6)');
    } else {
        console.log(`   ✅ ${shifts.rows.length} turno(s) configurado(s):`);
        shifts.rows.forEach(s => {
            console.log(`      - ${s.name}: ${s.startTime}-${s.endTime} (tol: ±${s.toleranceMinutesEntry}min)`);
        });
    }
}

async function getFinalStats() {
    const users = await pool.query('SELECT COUNT(*) as c FROM users WHERE company_id = $1', [COMPANY_ID]);
    const depts = await pool.query('SELECT COUNT(*) as c FROM departments WHERE company_id = $1', [COMPANY_ID]);
    const kiosks = await pool.query('SELECT COUNT(*) as c FROM kiosks WHERE company_id = $1 AND is_active = true', [COMPANY_ID]);
    const bio = await pool.query('SELECT COUNT(*) as c FROM biometric_templates WHERE company_id = $1', [COMPANY_ID]);
    const shifts = await pool.query('SELECT COUNT(*) as c FROM shifts WHERE company_id = $1', [COMPANY_ID]);

    return {
        users: users.rows[0].c,
        departments: depts.rows[0].c,
        kiosks: kiosks.rows[0].c,
        biometrics: bio.rows[0].c,
        shifts: shifts.rows[0].c
    };
}

main();
