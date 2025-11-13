/**
 * ═══════════════════════════════════════════════════════════
 * SEED: Datos de Prueba para ISI (company_id = 11)
 * ═══════════════════════════════════════════════════════════
 *
 * Este script carga datos REALISTAS en las tablas necesarias
 * para poder probar el CRUD del TAB 1 (Administración)
 *
 * TABLAS A LLENAR:
 * 1. departments - Departamentos/Sucursales
 * 2. shifts - Turnos de trabajo
 */

require('dotenv').config();
const database = require('./src/config/database');

async function seedTestData() {
    console.log('\n');
    console.log('='.repeat(80));
    console.log('🌱 SEED: Datos de Prueba para ISI (company_id = 11)');
    console.log('='.repeat(80));
    console.log('\n');

    const COMPANY_ID = 11; // ISI

    try {
        // ═════════════════════════════════════════════════════════
        // 1. DEPARTAMENTOS/SUCURSALES
        // ═════════════════════════════════════════════════════════
        console.log('📋 PASO 1/2: Insertando Departamentos/Sucursales...\n');

        const departments = [
            {
                name: 'Administración Central',
                description: 'Departamento administrativo principal',
                address: 'Av. Corrientes 1234, CABA, Argentina',
                gps_lat: -34.603722,
                gps_lng: -58.381592,
                coverage_radius: 500,
                is_active: true,
                company_id: COMPANY_ID,
                allow_gps_attendance: true
            },
            {
                name: 'Sucursal Belgrano',
                description: 'Sucursal comercial zona norte',
                address: 'Av. Cabildo 2500, CABA, Argentina',
                gps_lat: -34.563056,
                gps_lng: -58.457222,
                coverage_radius: 300,
                is_active: true,
                company_id: COMPANY_ID,
                allow_gps_attendance: true
            },
            {
                name: 'Sucursal Microcentro',
                description: 'Oficina comercial centro',
                address: 'Florida 500, CABA, Argentina',
                gps_lat: -34.599722,
                gps_lng: -58.374444,
                coverage_radius: 200,
                is_active: true,
                company_id: COMPANY_ID,
                allow_gps_attendance: true
            },
            {
                name: 'Depósito Zona Sur',
                description: 'Centro logístico y depósito',
                address: 'Av. Roca 3000, Lanús, Buenos Aires',
                gps_lat: -34.707222,
                gps_lng: -58.396389,
                coverage_radius: 1000,
                is_active: true,
                company_id: COMPANY_ID,
                allow_gps_attendance: true
            },
            {
                name: 'Recursos Humanos',
                description: 'Departamento de RRHH',
                address: 'Av. Corrientes 1234, Piso 5, CABA',
                gps_lat: -34.603722,
                gps_lng: -58.381592,
                coverage_radius: 500,
                is_active: true,
                company_id: COMPANY_ID,
                allow_gps_attendance: false
            },
            {
                name: 'Sistemas e IT',
                description: 'Departamento de tecnología',
                address: 'Av. Corrientes 1234, Piso 8, CABA',
                gps_lat: -34.603722,
                gps_lng: -58.381592,
                coverage_radius: 500,
                is_active: true,
                company_id: COMPANY_ID,
                allow_gps_attendance: false
            }
        ];

        for (const dept of departments) {
            const [existing] = await database.sequelize.query(`
                SELECT id FROM departments
                WHERE name = $1 AND company_id = $2
            `, { bind: [dept.name, COMPANY_ID] });

            if (existing.length === 0) {
                await database.sequelize.query(`
                    INSERT INTO departments (
                        name, description, address, gps_lat, gps_lng,
                        coverage_radius, is_active, company_id, allow_gps_attendance,
                        created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
                    )
                `, {
                    bind: [
                        dept.name, dept.description, dept.address,
                        dept.gps_lat, dept.gps_lng, dept.coverage_radius,
                        dept.is_active, dept.company_id, dept.allow_gps_attendance
                    ]
                });
                console.log(`   ✅ Creado: ${dept.name}`);
            } else {
                console.log(`   ⏭️  Ya existe: ${dept.name}`);
            }
        }

        // ═════════════════════════════════════════════════════════
        // 2. TURNOS
        // ═════════════════════════════════════════════════════════
        console.log('\n📋 PASO 2/2: Insertando Turnos de Trabajo...\n');

        const shifts = [
            {
                name: 'Turno Mañana',
                startTime: '08:00',
                endTime: '16:00',
                toleranceMinutes: 15,
                description: 'Turno matutino estándar',
                isActive: true,
                color: '#4CAF50'
            },
            {
                name: 'Turno Tarde',
                startTime: '14:00',
                endTime: '22:00',
                toleranceMinutes: 15,
                description: 'Turno vespertino',
                isActive: true,
                color: '#2196F3'
            },
            {
                name: 'Turno Noche',
                startTime: '22:00',
                endTime: '06:00',
                toleranceMinutes: 20,
                description: 'Turno nocturno',
                isActive: true,
                color: '#9C27B0'
            },
            {
                name: 'Jornada Completa 9-18',
                startTime: '09:00',
                endTime: '18:00',
                toleranceMinutes: 10,
                description: 'Jornada laboral completa',
                isActive: true,
                color: '#FF9800'
            },
            {
                name: 'Part-Time Mañana',
                startTime: '09:00',
                endTime: '13:00',
                toleranceMinutes: 10,
                description: 'Medio tiempo matutino',
                isActive: true,
                color: '#00BCD4'
            }
        ];

        // Verificar si shifts tiene company_id (multi-tenant)
        const [shiftsColumns] = await database.sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'shifts' AND column_name = 'company_id'
        `);

        const isMultiTenant = shiftsColumns.length > 0;

        if (!isMultiTenant) {
            console.log('   ⚠️  Tabla shifts NO es multi-tenant (falta company_id)');
            console.log('   🔧 Ejecuta: node fix-shifts-table-multitenant.js\n');
        }

        // Verificar si hay shifts existentes para ISI
        let existingQuery = `SELECT COUNT(*) as count FROM shifts`;
        let existingBind = [];

        if (isMultiTenant) {
            existingQuery += ` WHERE company_id = $1`;
            existingBind = [COMPANY_ID];
        }

        const [existingShifts] = await database.sequelize.query(existingQuery, {
            bind: existingBind.length > 0 ? existingBind : undefined
        });

        const shiftsCount = parseInt(existingShifts[0].count);

        if (shiftsCount > 0) {
            console.log(`   ℹ️  Ya existen ${shiftsCount} turnos ${isMultiTenant ? 'para ISI' : 'en la BD'} (se omite creación)`);
        } else {
            for (const shift of shifts) {
                let insertQuery, insertBind;

                if (isMultiTenant) {
                    insertQuery = `
                        INSERT INTO shifts (
                            name, "startTime", "endTime", "toleranceMinutes",
                            description, "isActive", color, company_id, "createdAt", "updatedAt"
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
                        )
                    `;
                    insertBind = [
                        shift.name, shift.startTime, shift.endTime,
                        shift.toleranceMinutes, shift.description,
                        shift.isActive, shift.color, COMPANY_ID
                    ];
                } else {
                    insertQuery = `
                        INSERT INTO shifts (
                            name, "startTime", "endTime", "toleranceMinutes",
                            description, "isActive", color, "createdAt", "updatedAt"
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
                        )
                    `;
                    insertBind = [
                        shift.name, shift.startTime, shift.endTime,
                        shift.toleranceMinutes, shift.description,
                        shift.isActive, shift.color
                    ];
                }

                await database.sequelize.query(insertQuery, { bind: insertBind });
                console.log(`   ✅ Creado: ${shift.name} (${shift.startTime} - ${shift.endTime})`);
            }
        }

        // ═════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ═════════════════════════════════════════════════════════
        console.log('\n');
        console.log('='.repeat(80));
        console.log('📊 RESUMEN DE DATOS CREADOS');
        console.log('='.repeat(80));

        const [deptCount] = await database.sequelize.query(`
            SELECT COUNT(*) as count FROM departments WHERE company_id = ${COMPANY_ID}
        `);

        const [shiftCount] = await database.sequelize.query(`
            SELECT COUNT(*) as count FROM shifts WHERE "isActive" = true
        `);

        console.log(`\n🏢 Departamentos/Sucursales para ISI: ${deptCount[0].count}`);
        console.log(`🕐 Turnos disponibles (sistema): ${shiftCount[0].count}`);

        console.log('\n✅ SEED COMPLETADO - Los datos están listos para testing');
        console.log('='.repeat(80));
        console.log('\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR durante el seed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Ejecutar seed
seedTestData();
