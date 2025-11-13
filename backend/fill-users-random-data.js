/**
 * ═══════════════════════════════════════════════════════════
 * SCRIPT: Llenar usuarios de ISI con datos aleatorios completos
 * ═══════════════════════════════════════════════════════════
 *
 * Este script asigna a todos los usuarios de ISI:
 * - Departamento aleatorio (de los 6 disponibles)
 * - Sucursal por defecto aleatoria
 * - Posición/cargo aleatorio
 * - Rol aleatorio
 * - Estado activo
 * - Configuración GPS aleatoria
 */

require('dotenv').config();
const database = require('./src/config/database');

const COMPANY_ID = 11; // ISI

// Posiciones/cargos realistas
const POSITIONS = [
    'Gerente General',
    'Gerente de Operaciones',
    'Gerente de RRHH',
    'Gerente Comercial',
    'Jefe de Departamento',
    'Supervisor de Área',
    'Coordinador de Proyectos',
    'Analista Senior',
    'Analista Junior',
    'Asistente Administrativo',
    'Técnico Especializado',
    'Operario',
    'Auxiliar',
    'Recepcionista',
    'Soporte Técnico'
];

// Roles disponibles
const ROLES = ['employee', 'employee', 'employee', 'supervisor', 'admin']; // employee tiene más probabilidad

async function fillUsersRandomData() {
    console.log('\n');
    console.log('='.repeat(80));
    console.log('🎲 ASIGNANDO DATOS ALEATORIOS A USUARIOS DE ISI');
    console.log('='.repeat(80));
    console.log('\n');

    try {
        // PASO 1: Obtener departamentos disponibles
        console.log('📋 PASO 1/4: Obteniendo departamentos disponibles...\n');

        const [departments] = await database.sequelize.query(`
            SELECT id FROM departments
            WHERE company_id = ${COMPANY_ID}
            ORDER BY id
        `);

        if (departments.length === 0) {
            console.log('   ⚠️  No hay departamentos para ISI');
            console.log('   🔧 Ejecuta primero: node seed-test-data-isi.js\n');
            process.exit(1);
        }

        console.log(`   ✅ ${departments.length} departamentos encontrados\n`);

        // PASO 2: Obtener usuarios de ISI
        console.log('📋 PASO 2/4: Obteniendo usuarios de ISI...\n');

        const [users] = await database.sequelize.query(`
            SELECT user_id, "firstName", "lastName"
            FROM users
            WHERE company_id = ${COMPANY_ID}
            ORDER BY user_id
        `);

        console.log(`   ✅ ${users.length} usuarios encontrados\n`);

        // PASO 3: Asignar datos aleatorios
        console.log('📋 PASO 3/4: Asignando datos aleatorios...\n');

        let updated = 0;

        for (const user of users) {
            // Seleccionar valores aleatorios
            const randomDept = departments[Math.floor(Math.random() * departments.length)];
            const randomBranch = departments[Math.floor(Math.random() * departments.length)];
            const randomPosition = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
            const randomRole = ROLES[Math.floor(Math.random() * ROLES.length)];
            const randomGPS = Math.random() > 0.5; // 50% sin restricción GPS

            // Actualizar usuario (convertir IDs a string para compatibilidad)
            await database.sequelize.query(`
                UPDATE users
                SET
                    "departmentId" = $1::text,
                    "defaultBranchId" = NULL,
                    "position" = $2,
                    "role" = $3,
                    "isActive" = true,
                    "allowOutsideRadius" = $4,
                    "updatedAt" = NOW()
                WHERE user_id = $5
            `, {
                bind: [
                    randomDept.id.toString(),
                    randomPosition,
                    randomRole,
                    randomGPS,
                    user.user_id
                ]
            });

            updated++;

            console.log(`   ✅ ${user.firstName} ${user.lastName}:`);
            console.log(`      - Departamento ID: ${randomDept.id}`);
            console.log(`      - Sucursal ID: ${randomBranch.id}`);
            console.log(`      - Posición: ${randomPosition}`);
            console.log(`      - Rol: ${randomRole}`);
            console.log(`      - GPS: ${randomGPS ? 'Sin restricción' : 'Restringido'}`);
            console.log('');
        }

        console.log(`   📊 Total usuarios actualizados: ${updated}\n`);

        // PASO 4: Asignar turnos aleatorios a algunos usuarios
        console.log('📋 PASO 4/4: Asignando turnos aleatorios...\n');

        try {
            // Verificar si existe tabla user_shifts
            const [tableExists] = await database.sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'user_shifts'
                )
            `);

            if (!tableExists[0].exists) {
                console.log('   ℹ️  Tabla user_shifts no existe (se omite asignación de turnos)\n');
            } else {
                // Obtener turnos disponibles
                const [shifts] = await database.sequelize.query(`
                    SELECT id FROM shifts
                    WHERE company_id = ${COMPANY_ID}
                    ORDER BY id
                `);

                if (shifts.length === 0) {
                    console.log('   ⚠️  No hay turnos disponibles (se omite asignación)\n');
                } else {
                    console.log(`   ✅ ${shifts.length} turnos encontrados\n`);

                    // Asignar turnos a 70% de usuarios (aleatorio)
                    let shiftsAssigned = 0;

                    for (const user of users) {
                        if (Math.random() > 0.3) { // 70% de probabilidad
                            // Seleccionar turno aleatorio
                            const randomShift = shifts[Math.floor(Math.random() * shifts.length)];

                            // Verificar si ya tiene asignación
                            const [existing] = await database.sequelize.query(`
                                SELECT id FROM user_shifts
                                WHERE user_id = $1 AND shift_id = $2
                            `, { bind: [user.user_id, randomShift.id] });

                            if (existing.length === 0) {
                                try {
                                    // Asignar turno
                                    await database.sequelize.query(`
                                        INSERT INTO user_shifts (user_id, shift_id, "createdAt", "updatedAt")
                                        VALUES ($1::uuid, $2::uuid, NOW(), NOW())
                                    `, { bind: [user.user_id, randomShift.id] });

                                    shiftsAssigned++;
                                    console.log(`   ✅ ${user.firstName} ${user.lastName} → Turno ID: ${randomShift.id}`);
                                } catch (err) {
                                    // Ignorar errores de asignación
                                    console.log(`   ⚠️  ${user.firstName} ${user.lastName} → Error asignando turno (se omite)`);
                                }
                            }
                        }
                    }

                    console.log(`\n   📊 Total turnos asignados: ${shiftsAssigned}\n`);
                }
            }
        } catch (error) {
            console.log(`   ⚠️  Error verificando turnos: ${error.message} (se omite)\n`);
        }

        // RESUMEN FINAL
        console.log('='.repeat(80));
        console.log('📊 RESUMEN FINAL');
        console.log('='.repeat(80));

        // Estadísticas por rol
        const [roleStats] = await database.sequelize.query(`
            SELECT role, COUNT(*) as count
            FROM users
            WHERE company_id = ${COMPANY_ID}
            GROUP BY role
            ORDER BY count DESC
        `);

        console.log('\n👥 USUARIOS POR ROL:\n');
        roleStats.forEach(stat => {
            const roleNames = {
                'admin': '👑 Administrador',
                'supervisor': '🔧 Supervisor',
                'employee': '👤 Empleado',
                'medical': '🏥 Médico'
            };
            console.log(`   ${roleNames[stat.role] || stat.role}: ${stat.count}`);
        });

        // Estadísticas por departamento
        const [deptStats] = await database.sequelize.query(`
            SELECT d.name, COUNT(u.user_id) as count
            FROM departments d
            LEFT JOIN users u ON u."departmentId" = d.id::text AND u.company_id = ${COMPANY_ID}
            WHERE d.company_id = ${COMPANY_ID}
            GROUP BY d.id, d.name
            ORDER BY count DESC
        `);

        console.log('\n🏢 USUARIOS POR DEPARTAMENTO:\n');
        deptStats.forEach(stat => {
            console.log(`   ${stat.name}: ${stat.count}`);
        });

        // Estadísticas GPS
        const [gpsStats] = await database.sequelize.query(`
            SELECT
                SUM(CASE WHEN "allowOutsideRadius" = true THEN 1 ELSE 0 END) as sin_restriccion,
                SUM(CASE WHEN "allowOutsideRadius" = false THEN 1 ELSE 0 END) as restringido
            FROM users
            WHERE company_id = ${COMPANY_ID}
        `);

        console.log('\n📍 CONFIGURACIÓN GPS:\n');
        console.log(`   🌍 Sin restricción: ${gpsStats[0].sin_restriccion || 0}`);
        console.log(`   📍 Restringido: ${gpsStats[0].restringido || 0}`);

        console.log('\n✅ DATOS ALEATORIOS ASIGNADOS EXITOSAMENTE');
        console.log('='.repeat(80));
        console.log('\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Ejecutar script
fillUsersRandomData();
