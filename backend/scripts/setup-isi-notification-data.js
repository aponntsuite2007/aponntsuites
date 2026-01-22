/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔧 CONFIGURACIÓN DE DATOS DE ISI PARA SISTEMA DE NOTIFICACIONES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Este script configura todos los datos necesarios en ISI para que el sistema
 * de notificaciones funcione al 100%:
 *
 * 1. Organigrama jerárquico (organizational_positions con parent_position_id)
 * 2. Departamento RRHH con usuarios asignados
 * 3. Usuarios con posiciones organizacionales
 * 4. Supervisores marcados como autorizadores (can_authorize_late_arrivals)
 * 5. Supervisores con mismo turno que empleados
 *
 * @author Claude Opus 4.5
 * @date 2026-01-21
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

const COMPANY_ID = 11; // ISI

async function analyzeCurrentState() {
    console.log('═'.repeat(80));
    console.log('🔍 ANÁLISIS DE ESTRUCTURA ACTUAL DE ISI');
    console.log('═'.repeat(80));

    // 1. Departamentos
    const [depts] = await sequelize.query(`
        SELECT id, name, manager_user_id
        FROM departments
        WHERE company_id = ${COMPANY_ID} AND is_active = true
        ORDER BY name
        LIMIT 20
    `);
    console.log('\n📁 DEPARTAMENTOS:');
    depts.forEach(d => console.log(`   [${d.id}] ${d.name} (manager: ${d.manager_user_id || 'N/A'})`));

    // 2. Turnos con más usuarios
    const [shifts] = await sequelize.query(`
        SELECT s.id, s.name,
               COUNT(usa.user_id) as users_count
        FROM shifts s
        LEFT JOIN user_shift_assignments usa ON usa.shift_id = s.id AND usa.is_active = true
        WHERE s.company_id = ${COMPANY_ID} AND s."isActive" = true
        GROUP BY s.id, s.name
        ORDER BY users_count DESC
        LIMIT 10
    `);
    console.log('\n⏰ TURNOS (top 10 por usuarios):');
    shifts.forEach(s => console.log(`   [${s.id}] ${s.name} - ${s.users_count} usuarios`));

    // 3. Roles de usuarios
    const [roles] = await sequelize.query(`
        SELECT role, COUNT(*) as count
        FROM users
        WHERE company_id = ${COMPANY_ID} AND is_active = true
        GROUP BY role
        ORDER BY count DESC
    `);
    console.log('\n👥 ROLES DE USUARIOS:');
    roles.forEach(r => console.log(`   ${r.role}: ${r.count}`));

    // 4. Usuarios admin/supervisor
    const [admins] = await sequelize.query(`
        SELECT user_id, "firstName", "lastName", role, department_id, can_authorize_late_arrivals
        FROM users
        WHERE company_id = ${COMPANY_ID}
          AND is_active = true
          AND role IN ('admin', 'supervisor', 'manager')
        LIMIT 15
    `);
    console.log('\n🔐 ADMINS/SUPERVISORS:');
    admins.forEach(a => console.log(`   ${a.firstName} ${a.lastName} (${a.role}) - Dept: ${a.department_id || 'N/A'} - Autoriza: ${a.can_authorize_late_arrivals ? 'SÍ' : 'NO'}`));

    // 5. Posiciones organizacionales existentes
    const [positions] = await sequelize.query(`
        SELECT id, position_name, position_code, parent_position_id, level_order
        FROM organizational_positions
        WHERE company_id = ${COMPANY_ID}
        ORDER BY level_order NULLS LAST, position_name
        LIMIT 20
    `);
    console.log('\n📊 POSICIONES ORGANIZACIONALES:');
    positions.forEach(p => console.log(`   [${p.id}] ${p.position_name} (${p.position_code}) - Parent: ${p.parent_position_id || 'TOP'} - Level: ${p.level_order || 0}`));

    return { depts, shifts, admins, positions };
}

async function setupOrganigrama() {
    console.log('\n' + '═'.repeat(80));
    console.log('📊 CONFIGURANDO ORGANIGRAMA JERÁRQUICO');
    console.log('═'.repeat(80));

    // Crear estructura jerárquica de posiciones
    // Nivel 1: Director General
    // Nivel 2: Gerentes (RRHH, Operaciones, etc.)
    // Nivel 3: Supervisores
    // Nivel 4: Empleados

    const positionsToCreate = [
        { code: 'DIR_GEN', name: 'Director General', level: 1, parent: null },
        { code: 'GER_RRHH', name: 'Gerente RRHH', level: 2, parent: 'DIR_GEN' },
        { code: 'GER_OPS', name: 'Gerente Operaciones', level: 2, parent: 'DIR_GEN' },
        { code: 'GER_ADM', name: 'Gerente Administrativo', level: 2, parent: 'DIR_GEN' },
        { code: 'SUP_RRHH', name: 'Supervisor RRHH', level: 3, parent: 'GER_RRHH' },
        { code: 'SUP_OPS_A', name: 'Supervisor Operaciones Turno A', level: 3, parent: 'GER_OPS' },
        { code: 'SUP_OPS_B', name: 'Supervisor Operaciones Turno B', level: 3, parent: 'GER_OPS' },
        { code: 'SUP_OPS_C', name: 'Supervisor Operaciones Turno C', level: 3, parent: 'GER_OPS' },
        { code: 'SUP_ADM', name: 'Supervisor Administrativo', level: 3, parent: 'GER_ADM' },
        { code: 'EMP_OPS', name: 'Operador', level: 4, parent: 'SUP_OPS_A' },
        { code: 'EMP_ADM', name: 'Asistente Administrativo', level: 4, parent: 'SUP_ADM' },
    ];

    const positionIds = {};

    // Primero crear posiciones sin parent
    for (const pos of positionsToCreate.filter(p => !p.parent)) {
        try {
            // Verificar si ya existe
            const [existing] = await sequelize.query(`
                SELECT id FROM organizational_positions
                WHERE company_id = ${COMPANY_ID} AND position_code = '${pos.code}'
            `);

            if (existing.length > 0) {
                positionIds[pos.code] = existing[0].id;
                console.log(`   ⏭️ Posición ${pos.name} ya existe (ID: ${existing[0].id})`);
            } else {
                const [result] = await sequelize.query(`
                    INSERT INTO organizational_positions (company_id, position_code, position_name, level_order, is_active, created_at, updated_at)
                    VALUES (${COMPANY_ID}, '${pos.code}', '${pos.name}', ${pos.level}, true, NOW(), NOW())
                    RETURNING id
                `);
                positionIds[pos.code] = result[0].id;
                console.log(`   ✅ Creada posición: ${pos.name} (ID: ${result[0].id})`);
            }
        } catch (error) {
            console.error(`   ❌ Error creando ${pos.name}:`, error.message);
        }
    }

    // Luego crear posiciones con parent
    for (const pos of positionsToCreate.filter(p => p.parent)) {
        try {
            const parentId = positionIds[pos.parent];

            // Verificar si ya existe
            const [existing] = await sequelize.query(`
                SELECT id FROM organizational_positions
                WHERE company_id = ${COMPANY_ID} AND position_code = '${pos.code}'
            `);

            if (existing.length > 0) {
                positionIds[pos.code] = existing[0].id;
                // Actualizar parent_position_id si es necesario
                await sequelize.query(`
                    UPDATE organizational_positions
                    SET parent_position_id = '${parentId}', level_order = ${pos.level}
                    WHERE id = '${existing[0].id}'
                `);
                console.log(`   ⏭️ Posición ${pos.name} actualizada con parent (ID: ${existing[0].id})`);
            } else {
                const [result] = await sequelize.query(`
                    INSERT INTO organizational_positions (company_id, position_code, position_name, parent_position_id, level_order, is_active, created_at, updated_at)
                    VALUES (${COMPANY_ID}, '${pos.code}', '${pos.name}', '${parentId}', ${pos.level}, true, NOW(), NOW())
                    RETURNING id
                `);
                positionIds[pos.code] = result[0].id;
                console.log(`   ✅ Creada posición: ${pos.name} → reports to ${pos.parent} (ID: ${result[0].id})`);
            }
        } catch (error) {
            console.error(`   ❌ Error creando ${pos.name}:`, error.message);
        }
    }

    return positionIds;
}

async function setupRRHHDepartment() {
    console.log('\n' + '═'.repeat(80));
    console.log('👥 CONFIGURANDO DEPARTAMENTO RRHH');
    console.log('═'.repeat(80));

    // Verificar si existe departamento RRHH
    const [rrhhDept] = await sequelize.query(`
        SELECT id, name FROM departments
        WHERE company_id = ${COMPANY_ID}
          AND (LOWER(name) LIKE '%rrhh%' OR LOWER(name) LIKE '%recursos humanos%' OR LOWER(name) LIKE '%human%')
        LIMIT 1
    `);

    let rrhhDeptId;

    if (rrhhDept.length > 0) {
        rrhhDeptId = rrhhDept[0].id;
        console.log(`   ⏭️ Departamento RRHH ya existe: ${rrhhDept[0].name} (ID: ${rrhhDeptId})`);
    } else {
        // Crear departamento RRHH
        const [result] = await sequelize.query(`
            INSERT INTO departments (company_id, name, is_active, created_at, updated_at)
            VALUES (${COMPANY_ID}, 'Recursos Humanos (RRHH)', true, NOW(), NOW())
            RETURNING id
        `);
        rrhhDeptId = result[0].id;
        console.log(`   ✅ Creado departamento RRHH (ID: ${rrhhDeptId})`);
    }

    return rrhhDeptId;
}

async function assignUsersToPositions(positionIds, rrhhDeptId) {
    console.log('\n' + '═'.repeat(80));
    console.log('👤 ASIGNANDO USUARIOS A POSICIONES');
    console.log('═'.repeat(80));

    // Obtener usuarios admin para asignar a posiciones de gerencia
    const [admins] = await sequelize.query(`
        SELECT user_id, "firstName", "lastName", role
        FROM users
        WHERE company_id = ${COMPANY_ID} AND is_active = true AND role = 'admin'
        LIMIT 5
    `);

    if (admins.length > 0) {
        // Asignar primer admin como Director General
        const dirGenId = positionIds['DIR_GEN'];
        if (dirGenId) {
            await sequelize.query(`
                UPDATE users SET organizational_position_id = '${dirGenId}'
                WHERE user_id = '${admins[0].user_id}'
            `);
            console.log(`   ✅ ${admins[0].firstName} ${admins[0].lastName} → Director General`);

            // Marcar como autorizador
            await sequelize.query(`
                UPDATE users SET can_authorize_late_arrivals = true
                WHERE user_id = '${admins[0].user_id}'
            `);
        }
    }

    // Obtener supervisores/managers para asignar a gerencias
    const [supervisors] = await sequelize.query(`
        SELECT user_id, "firstName", "lastName", role
        FROM users
        WHERE company_id = ${COMPANY_ID}
          AND is_active = true
          AND role IN ('supervisor', 'manager')
        LIMIT 10
    `);

    const supervisorPositions = ['GER_RRHH', 'GER_OPS', 'GER_ADM', 'SUP_RRHH', 'SUP_OPS_A', 'SUP_OPS_B', 'SUP_OPS_C', 'SUP_ADM'];

    for (let i = 0; i < Math.min(supervisors.length, supervisorPositions.length); i++) {
        const posCode = supervisorPositions[i];
        const posId = positionIds[posCode];
        const user = supervisors[i];

        if (posId) {
            await sequelize.query(`
                UPDATE users SET organizational_position_id = '${posId}'
                WHERE user_id = '${user.user_id}'
            `);
            console.log(`   ✅ ${user.firstName} ${user.lastName} → ${posCode}`);

            // Marcar como autorizador
            await sequelize.query(`
                UPDATE users SET can_authorize_late_arrivals = true
                WHERE user_id = '${user.user_id}'
            `);

            // Si es RRHH, asignar al departamento RRHH
            if (posCode.includes('RRHH') && rrhhDeptId) {
                await sequelize.query(`
                    UPDATE users SET department_id = ${rrhhDeptId}
                    WHERE user_id = '${user.user_id}'
                `);
                console.log(`      → Asignado a departamento RRHH`);
            }
        }
    }

    // Asignar empleados a posiciones de operador
    const empOpsId = positionIds['EMP_OPS'];
    const empAdmId = positionIds['EMP_ADM'];

    if (empOpsId) {
        // Obtener empleados sin posición y asignarles posición de operador
        const [employees] = await sequelize.query(`
            SELECT user_id FROM users
            WHERE company_id = ${COMPANY_ID}
              AND is_active = true
              AND role = 'employee'
              AND organizational_position_id IS NULL
            LIMIT 100
        `);

        let count = 0;
        for (const emp of employees) {
            // Alternar entre EMP_OPS y EMP_ADM
            const posId = count % 2 === 0 ? empOpsId : (empAdmId || empOpsId);
            await sequelize.query(`
                UPDATE users SET organizational_position_id = '${posId}'
                WHERE user_id = '${emp.user_id}'
            `);
            count++;
        }
        console.log(`   ✅ ${count} empleados asignados a posiciones de operador/asistente`);
    }
}

async function setupShiftAssignments(positionIds) {
    console.log('\n' + '═'.repeat(80));
    console.log('⏰ CONFIGURANDO SUPERVISORES CON MISMO TURNO');
    console.log('═'.repeat(80));

    // Obtener los turnos más populares
    const [popularShifts] = await sequelize.query(`
        SELECT s.id, s.name, COUNT(usa.user_id) as users_count
        FROM shifts s
        JOIN user_shift_assignments usa ON usa.shift_id = s.id AND usa.is_active = true
        WHERE s.company_id = ${COMPANY_ID}
        GROUP BY s.id, s.name
        ORDER BY users_count DESC
        LIMIT 3
    `);

    if (popularShifts.length === 0) {
        console.log('   ⚠️ No hay turnos con usuarios asignados');
        return;
    }

    console.log('   📋 Turnos más populares:');
    popularShifts.forEach(s => console.log(`      - ${s.name}: ${s.users_count} usuarios`));

    // Asignar supervisores de operaciones a los turnos correspondientes
    const supervisorShiftMapping = [
        { posCode: 'SUP_OPS_A', shiftIndex: 0 },
        { posCode: 'SUP_OPS_B', shiftIndex: 1 },
        { posCode: 'SUP_OPS_C', shiftIndex: 2 },
        { posCode: 'GER_OPS', shiftIndex: 0 },
    ];

    for (const mapping of supervisorShiftMapping) {
        const posId = positionIds[mapping.posCode];
        const shift = popularShifts[mapping.shiftIndex] || popularShifts[0];

        if (posId && shift) {
            // Obtener usuario en esa posición
            const [users] = await sequelize.query(`
                SELECT user_id, "firstName", "lastName"
                FROM users
                WHERE organizational_position_id = '${posId}'
                LIMIT 1
            `);

            if (users.length > 0) {
                const user = users[0];

                // Verificar si ya tiene asignación de turno
                const [existing] = await sequelize.query(`
                    SELECT id FROM user_shift_assignments
                    WHERE user_id = '${user.user_id}' AND is_active = true
                `);

                if (existing.length > 0) {
                    // Actualizar turno existente
                    await sequelize.query(`
                        UPDATE user_shift_assignments
                        SET shift_id = '${shift.id}'
                        WHERE user_id = '${user.user_id}' AND is_active = true
                    `);
                    console.log(`   ✅ ${user.firstName} ${user.lastName} (${mapping.posCode}) → Turno: ${shift.name} (actualizado)`);
                } else {
                    // Crear nueva asignación con todos los campos requeridos
                    await sequelize.query(`
                        INSERT INTO user_shift_assignments (user_id, shift_id, company_id, join_date, assigned_phase, is_active, created_at, updated_at)
                        VALUES ('${user.user_id}', '${shift.id}', ${COMPANY_ID}, CURRENT_DATE, 'default', true, NOW(), NOW())
                    `);
                    console.log(`   ✅ ${user.firstName} ${user.lastName} (${mapping.posCode}) → Turno: ${shift.name} (nuevo)`);
                }
            }
        }
    }

    // Actualizar parent_position de empleados para que apunten a supervisores de su turno
    console.log('\n   🔗 Actualizando jerarquía de empleados por turno...');

    for (let i = 0; i < popularShifts.length && i < 3; i++) {
        const shift = popularShifts[i];
        const supPosCode = ['SUP_OPS_A', 'SUP_OPS_B', 'SUP_OPS_C'][i];
        const supPosId = positionIds[supPosCode];

        if (supPosId) {
            // Crear posición de empleado para este turno si no existe
            const empPosCode = `EMP_OPS_${['A', 'B', 'C'][i]}`;

            const [existingEmpPos] = await sequelize.query(`
                SELECT id FROM organizational_positions
                WHERE company_id = ${COMPANY_ID} AND position_code = '${empPosCode}'
            `);

            let empPosId;
            if (existingEmpPos.length > 0) {
                empPosId = existingEmpPos[0].id;
                await sequelize.query(`
                    UPDATE organizational_positions
                    SET parent_position_id = '${supPosId}'
                    WHERE id = '${empPosId}'
                `);
            } else {
                const [newPos] = await sequelize.query(`
                    INSERT INTO organizational_positions (company_id, position_code, position_name, parent_position_id, level_order, is_active, created_at, updated_at)
                    VALUES (${COMPANY_ID}, '${empPosCode}', 'Operador Turno ${['A', 'B', 'C'][i]}', '${supPosId}', 4, true, NOW(), NOW())
                    RETURNING id
                `);
                empPosId = newPos[0].id;
            }

            // Asignar empleados de este turno a esta posición
            const updateResult = await sequelize.query(`
                UPDATE users u
                SET organizational_position_id = '${empPosId}'
                FROM user_shift_assignments usa
                WHERE usa.user_id = u.user_id
                  AND usa.shift_id = '${shift.id}'
                  AND usa.is_active = true
                  AND u.company_id = ${COMPANY_ID}
                  AND u.role = 'employee'
                  AND u.is_active = true
            `);

            console.log(`      Turno ${shift.name} → Supervisor ${supPosCode} (${empPosCode})`);
        }
    }
}

async function verifySetup() {
    console.log('\n' + '═'.repeat(80));
    console.log('✅ VERIFICACIÓN DE CONFIGURACIÓN');
    console.log('═'.repeat(80));

    // Verificar cadena de escalamiento
    const [hierarchy] = await sequelize.query(`
        WITH RECURSIVE chain AS (
            SELECT id, position_name, position_code, parent_position_id, 1 as level
            FROM organizational_positions
            WHERE company_id = ${COMPANY_ID} AND position_code = 'EMP_OPS_A'

            UNION ALL

            SELECT p.id, p.position_name, p.position_code, p.parent_position_id, c.level + 1
            FROM organizational_positions p
            JOIN chain c ON p.id = c.parent_position_id
            WHERE p.company_id = ${COMPANY_ID}
        )
        SELECT * FROM chain ORDER BY level
    `);

    console.log('\n   📊 Cadena de escalamiento (Operador Turno A → Director):');
    hierarchy.forEach(h => {
        const indent = '   '.repeat(h.level);
        console.log(`   ${indent}↳ ${h.position_name} (${h.position_code})`);
    });

    // Verificar usuarios con posición
    const [usersWithPos] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM users
        WHERE company_id = ${COMPANY_ID}
          AND is_active = true
          AND organizational_position_id IS NOT NULL
    `);
    console.log(`\n   👥 Usuarios con posición asignada: ${usersWithPos[0].count}`);

    // Verificar autorizadores
    const [authorizers] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM users
        WHERE company_id = ${COMPANY_ID}
          AND is_active = true
          AND can_authorize_late_arrivals = true
    `);
    console.log(`   🔐 Usuarios autorizadores: ${authorizers[0].count}`);

    // Verificar RRHH
    const [rrhh] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM users u
        JOIN departments d ON u.department_id = d.id
        WHERE u.company_id = ${COMPANY_ID}
          AND u.is_active = true
          AND (LOWER(d.name) LIKE '%rrhh%' OR LOWER(d.name) LIKE '%recursos humanos%')
    `);
    console.log(`   👥 Usuarios en RRHH: ${rrhh[0].count}`);

    // Verificar supervisores con turno
    const [supWithShift] = await sequelize.query(`
        SELECT u."firstName", u."lastName", op.position_name, s.name as shift_name
        FROM users u
        JOIN organizational_positions op ON u.organizational_position_id = op.id
        JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = true
        JOIN shifts s ON usa.shift_id = s.id
        WHERE u.company_id = ${COMPANY_ID}
          AND u.can_authorize_late_arrivals = true
          AND op.position_code LIKE 'SUP_%'
        LIMIT 10
    `);
    console.log('\n   ⏰ Supervisores con turno asignado:');
    supWithShift.forEach(s => console.log(`      - ${s.firstName} ${s.lastName} (${s.position_name}) → ${s.shift_name}`));
}

async function main() {
    console.log('═'.repeat(80));
    console.log('🔧 CONFIGURACIÓN DE DATOS DE ISI PARA NOTIFICACIONES');
    console.log('═'.repeat(80));
    console.log(`📅 Fecha: ${new Date().toISOString()}`);
    console.log(`🏢 Empresa: ISI (ID: ${COMPANY_ID})`);

    try {
        // 1. Analizar estado actual
        await analyzeCurrentState();

        // 2. Configurar organigrama
        const positionIds = await setupOrganigrama();

        // 3. Configurar departamento RRHH
        const rrhhDeptId = await setupRRHHDepartment();

        // 4. Asignar usuarios a posiciones
        await assignUsersToPositions(positionIds, rrhhDeptId);

        // 5. Configurar turnos para supervisores
        await setupShiftAssignments(positionIds);

        // 6. Verificar configuración
        await verifySetup();

        console.log('\n' + '═'.repeat(80));
        console.log('🎉 CONFIGURACIÓN COMPLETADA');
        console.log('═'.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

main();
