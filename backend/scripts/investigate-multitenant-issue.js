/**
 * =============================================================================
 * INVESTIGACIÓN: Problema de Aislamiento Multi-Tenant
 * =============================================================================
 *
 * Investiga usuarios que tienen departamentos de otras empresas.
 * Este es un problema CRÍTICO de seguridad y aislamiento de datos.
 *
 * =============================================================================
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT) || 5432,
        dialect: 'postgres',
        logging: false
    }
);

async function investigate() {
    console.log('\n' + '╔'.padEnd(79, '═') + '╗');
    console.log('║  🔍 INVESTIGACIÓN: Problema de Aislamiento Multi-Tenant                    ║');
    console.log('╚'.padEnd(79, '═') + '╝\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Conexión establecida\n');

        // ════════════════════════════════════════════════════════════════════════
        // 1. IDENTIFICAR USUARIOS CON DEPARTAMENTOS CRUZADOS
        // ════════════════════════════════════════════════════════════════════════
        console.log('🔍 1. USUARIOS CON DEPARTAMENTOS DE OTRAS EMPRESAS');
        console.log('─'.repeat(70));

        const [crossCompanyUsers] = await sequelize.query(`
            SELECT
                u.user_id,
                u.email,
                u."firstName",
                u."lastName",
                u.company_id as user_company_id,
                uc.name as user_company_name,
                u.department_id,
                d.name as department_name,
                d.company_id as dept_company_id,
                dc.name as dept_company_name
            FROM users u
            JOIN departments d ON u.department_id = d.id
            JOIN companies uc ON u.company_id = uc.company_id
            JOIN companies dc ON d.company_id = dc.company_id
            WHERE u.department_id IS NOT NULL
              AND d.company_id != u.company_id
            ORDER BY u.company_id, u.user_id
        `);

        if (crossCompanyUsers.length === 0) {
            console.log('   ✅ No hay usuarios con departamentos cruzados');
        } else {
            console.log(`   ⚠️ ENCONTRADOS: ${crossCompanyUsers.length} usuarios con problema\n`);

            // Agrupar por empresa del usuario
            const byCompany = {};
            crossCompanyUsers.forEach(u => {
                const key = `${u.user_company_id} - ${u.user_company_name}`;
                if (!byCompany[key]) byCompany[key] = [];
                byCompany[key].push(u);
            });

            for (const [company, users] of Object.entries(byCompany)) {
                console.log(`\n   📦 Empresa: ${company}`);
                console.log(`   ${'─'.repeat(50)}`);
                users.forEach(u => {
                    console.log(`      • User #${u.user_id}: ${u.email} (${u.firstName} ${u.lastName})`);
                    console.log(`        Dept asignado: "${u.department_name}" (ID: ${u.department_id})`);
                    console.log(`        ❌ Ese depto pertenece a: ${u.dept_company_name} (Company ID: ${u.dept_company_id})`);
                });
            }
        }

        // ════════════════════════════════════════════════════════════════════════
        // 2. ANÁLISIS DE DEPARTAMENTOS POR EMPRESA
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n\n🔍 2. DEPARTAMENTOS POR EMPRESA');
        console.log('─'.repeat(70));

        const [deptsByCompany] = await sequelize.query(`
            SELECT
                c.company_id,
                c.name as company_name,
                COUNT(d.id) as dept_count,
                STRING_AGG(d.name, ', ' ORDER BY d.name) as departments
            FROM companies c
            LEFT JOIN departments d ON d.company_id = c.company_id
            WHERE c.is_active = true
            GROUP BY c.company_id, c.name
            ORDER BY c.company_id
        `);

        deptsByCompany.forEach(c => {
            console.log(`\n   📦 ${c.company_name} (ID: ${c.company_id})`);
            console.log(`      Departamentos (${c.dept_count}): ${c.departments || 'Ninguno'}`);
        });

        // ════════════════════════════════════════════════════════════════════════
        // 3. IDENTIFICAR DEPARTAMENTOS DISPONIBLES PARA CADA EMPRESA AFECTADA
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n\n🔍 3. SOLUCIÓN PROPUESTA');
        console.log('─'.repeat(70));

        if (crossCompanyUsers.length > 0) {
            // Obtener empresas afectadas
            const affectedCompanyIds = [...new Set(crossCompanyUsers.map(u => u.user_company_id))];

            for (const companyId of affectedCompanyIds) {
                const [companyDepts] = await sequelize.query(`
                    SELECT id, name FROM departments
                    WHERE company_id = :companyId AND is_active = true
                    ORDER BY name
                `, { replacements: { companyId } });

                const [companyInfo] = await sequelize.query(`
                    SELECT name FROM companies WHERE company_id = :companyId
                `, { replacements: { companyId }, type: Sequelize.QueryTypes.SELECT });

                console.log(`\n   📦 Empresa ${companyId} (${companyInfo.name}):`);
                console.log(`      Departamentos disponibles:`);

                if (companyDepts.length === 0) {
                    console.log(`      ⚠️ NO TIENE DEPARTAMENTOS - Necesita crear uno primero`);
                } else {
                    companyDepts.forEach(d => {
                        console.log(`      • ID ${d.id}: ${d.name}`);
                    });
                }

                // Usuarios afectados de esta empresa
                const usersOfCompany = crossCompanyUsers.filter(u => u.user_company_id === companyId);
                console.log(`\n      Usuarios a corregir (${usersOfCompany.length}):`);
                usersOfCompany.forEach(u => {
                    console.log(`      • User #${u.user_id}: ${u.email} → Actualmente en dept ${u.department_id} (de empresa ${u.dept_company_id})`);
                });
            }
        }

        // ════════════════════════════════════════════════════════════════════════
        // 4. VERIFICAR OTRAS POSIBLES VIOLACIONES MULTI-TENANT
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n\n🔍 4. OTRAS POSIBLES VIOLACIONES MULTI-TENANT');
        console.log('─'.repeat(70));

        // Asistencias con usuario de otra empresa
        const [crossAttendance] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM attendances a
            JOIN users u ON a."UserId" = u.user_id
            WHERE a.company_id != u.company_id
        `);
        console.log(`   • Asistencias con company_id diferente al usuario: ${crossAttendance[0].count}`);

        // Shifts con empresa diferente
        const [crossShifts] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM user_shift_assignments usa
            JOIN users u ON usa.user_id = u.user_id
            JOIN shifts s ON usa.shift_id = s.id
            WHERE s.company_id != u.company_id
        `);
        console.log(`   • Asignaciones de turno con empresa cruzada: ${crossShifts[0].count}`);

        // ════════════════════════════════════════════════════════════════════════
        // 5. RESUMEN Y RECOMENDACIONES
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n\n' + '═'.repeat(70));
        console.log('📋 RESUMEN Y RECOMENDACIONES');
        console.log('═'.repeat(70));

        console.log(`
   PROBLEMAS ENCONTRADOS:
   ─────────────────────
   • Usuarios con departamentos cruzados: ${crossCompanyUsers.length}
   • Asistencias con empresa cruzada: ${crossAttendance[0].count}
   • Turnos con empresa cruzada: ${crossShifts[0].count}

   ACCIONES RECOMENDADAS:
   ─────────────────────
   1. Ejecutar script de corrección para usuarios
   2. Agregar CONSTRAINT de FK con validación de company_id
   3. Agregar triggers para prevenir futuras violaciones
   4. Revisar código de asignación de departamentos
        `);

        // Exportar datos para el script de corrección
        const fs = require('fs');
        const path = require('path');

        const exportData = {
            timestamp: new Date().toISOString(),
            crossCompanyUsers: crossCompanyUsers,
            summary: {
                usersAffected: crossCompanyUsers.length,
                companiesAffected: [...new Set(crossCompanyUsers.map(u => u.user_company_id))].length
            }
        };

        const exportPath = path.join(__dirname, '..', 'MULTITENANT-ISSUE-DATA.json');
        fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
        console.log(`\n📁 Datos exportados a: MULTITENANT-ISSUE-DATA.json`);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
}

investigate();
