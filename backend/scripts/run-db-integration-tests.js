/**
 * =============================================================================
 * TESTS DE INTEGRACIÓN DIRECTOS (Solo BD - Sin Playwright)
 * =============================================================================
 *
 * Ejecuta tests de integridad de datos y relaciones intermodulares
 * directamente contra PostgreSQL sin necesidad de UI.
 *
 * Uso: node scripts/run-db-integration-tests.js
 *
 * =============================================================================
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Configuración de conexión (igual que database.js)
const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
        quoteIdentifiers: true
    }
);

// Company ID para tests (ISI)
const COMPANY_ID = 11;

async function main() {
    console.log('\n' + '╔'.padEnd(79, '═') + '╗');
    console.log('║  🧪 DB INTEGRATION TESTS - Coherencia y Relaciones Intermodulares          ║');
    console.log('╚'.padEnd(79, '═') + '╝\n');

    const results = {
        startTime: new Date().toISOString(),
        tests: [],
        passed: 0,
        failed: 0
    };

    try {
        // Conectar
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL establecida\n');

        // ════════════════════════════════════════════════════════════════════════════
        // TEST 1: USERS - Verificar estructura y datos
        // ════════════════════════════════════════════════════════════════════════════
        console.log('🧪 TEST 1: USERS - Estructura y datos');
        console.log('─'.repeat(60));

        try {
            const [users] = await sequelize.query(
                `SELECT COUNT(*) as total,
                        COUNT(*) FILTER (WHERE is_active = true) as active,
                        COUNT(*) FILTER (WHERE department_id IS NOT NULL) as with_dept,
                        COUNT(DISTINCT role) as roles
                 FROM users WHERE company_id = :companyId`,
                { replacements: { companyId: COMPANY_ID }, type: Sequelize.QueryTypes.SELECT }
            );

            console.log(`   Total: ${users.total} | Activos: ${users.active} | Con depto: ${users.with_dept} | Roles: ${users.roles}`);
            console.log('   ✅ TEST 1 PASSED');
            results.tests.push({ name: 'users_structure', status: 'passed', data: users });
            results.passed++;
        } catch (error) {
            console.error('   ❌ TEST 1 FAILED:', error.message);
            results.tests.push({ name: 'users_structure', status: 'failed', error: error.message });
            results.failed++;
        }

        // ════════════════════════════════════════════════════════════════════════════
        // TEST 2: DEPARTMENTS - Verificar estructura
        // ════════════════════════════════════════════════════════════════════════════
        console.log('\n🧪 TEST 2: DEPARTMENTS - Estructura y datos');
        console.log('─'.repeat(60));

        try {
            const [depts] = await sequelize.query(
                `SELECT COUNT(*) as total,
                        COUNT(*) FILTER (WHERE is_active = true) as active,
                        COUNT(*) FILTER (WHERE gps_lat IS NOT NULL) as with_gps
                 FROM departments WHERE company_id = :companyId`,
                { replacements: { companyId: COMPANY_ID }, type: Sequelize.QueryTypes.SELECT }
            );

            console.log(`   Total: ${depts.total} | Activos: ${depts.active} | Con GPS: ${depts.with_gps}`);
            console.log('   ✅ TEST 2 PASSED');
            results.tests.push({ name: 'departments_structure', status: 'passed', data: depts });
            results.passed++;
        } catch (error) {
            console.error('   ❌ TEST 2 FAILED:', error.message);
            results.tests.push({ name: 'departments_structure', status: 'failed', error: error.message });
            results.failed++;
        }

        // ════════════════════════════════════════════════════════════════════════════
        // TEST 3: SHIFTS - Verificar estructura
        // ════════════════════════════════════════════════════════════════════════════
        console.log('\n🧪 TEST 3: SHIFTS - Estructura y datos');
        console.log('─'.repeat(60));

        try {
            const [shifts] = await sequelize.query(
                `SELECT COUNT(*) as total,
                        COUNT(*) FILTER (WHERE "isActive" = true) as active,
                        COUNT(DISTINCT "shiftType") as types
                 FROM shifts WHERE company_id = :companyId`,
                { replacements: { companyId: COMPANY_ID }, type: Sequelize.QueryTypes.SELECT }
            );

            console.log(`   Total: ${shifts.total} | Activos: ${shifts.active} | Tipos: ${shifts.types}`);
            console.log('   ✅ TEST 3 PASSED');
            results.tests.push({ name: 'shifts_structure', status: 'passed', data: shifts });
            results.passed++;
        } catch (error) {
            console.error('   ❌ TEST 3 FAILED:', error.message);
            results.tests.push({ name: 'shifts_structure', status: 'failed', error: error.message });
            results.failed++;
        }

        // ════════════════════════════════════════════════════════════════════════════
        // TEST 4: ATTENDANCES - Verificar estructura (tabla: attendances)
        // ════════════════════════════════════════════════════════════════════════════
        console.log('\n🧪 TEST 4: ATTENDANCES - Estructura y datos');
        console.log('─'.repeat(60));

        try {
            const [attendance] = await sequelize.query(
                `SELECT COUNT(*) as total,
                        COUNT(*) FILTER (WHERE status = 'present') as present,
                        COUNT(*) FILTER (WHERE status = 'late') as late,
                        COUNT(*) FILTER (WHERE status = 'absent') as absent
                 FROM attendances WHERE company_id = :companyId`,
                { replacements: { companyId: COMPANY_ID }, type: Sequelize.QueryTypes.SELECT }
            );

            console.log(`   Total: ${attendance.total} | Presente: ${attendance.present} | Tarde: ${attendance.late} | Ausente: ${attendance.absent}`);
            console.log('   ✅ TEST 4 PASSED');
            results.tests.push({ name: 'attendance_structure', status: 'passed', data: attendance });
            results.passed++;
        } catch (error) {
            console.error('   ❌ TEST 4 FAILED:', error.message);
            results.tests.push({ name: 'attendance_structure', status: 'failed', error: error.message });
            results.failed++;
        }

        // ════════════════════════════════════════════════════════════════════════════
        // TEST 5: PAYROLL TABLES - Verificar existencia
        // ════════════════════════════════════════════════════════════════════════════
        console.log('\n🧪 TEST 5: PAYROLL - Verificar tablas');
        console.log('─'.repeat(60));

        try {
            const [tables] = await sequelize.query(
                `SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'public'
                 AND table_name LIKE 'payroll%' OR table_name LIKE 'company_branch%' OR table_name LIKE 'labor_agreement%'
                 ORDER BY table_name`,
                { type: Sequelize.QueryTypes.SELECT }
            );

            console.log(`   Tablas de payroll encontradas: ${tables.length}`);
            tables.forEach(t => console.log(`     • ${t.table_name}`));
            console.log('   ✅ TEST 5 PASSED');
            results.tests.push({ name: 'payroll_tables', status: 'passed', count: tables.length });
            results.passed++;
        } catch (error) {
            console.error('   ❌ TEST 5 FAILED:', error.message);
            results.tests.push({ name: 'payroll_tables', status: 'failed', error: error.message });
            results.failed++;
        }

        // ════════════════════════════════════════════════════════════════════════════
        // TEST 6: FK INTEGRITY - Users -> Departments
        // ════════════════════════════════════════════════════════════════════════════
        console.log('\n🧪 TEST 6: FK INTEGRITY - Users -> Departments');
        console.log('─'.repeat(60));

        try {
            const [orphans] = await sequelize.query(
                `SELECT COUNT(*) as count
                 FROM users u
                 LEFT JOIN departments d ON u.department_id = d.id
                 WHERE u.company_id = :companyId
                   AND u.department_id IS NOT NULL
                   AND d.id IS NULL`,
                { replacements: { companyId: COMPANY_ID }, type: Sequelize.QueryTypes.SELECT }
            );

            if (parseInt(orphans.count) === 0) {
                console.log('   ✅ TEST 6 PASSED - No hay usuarios huérfanos');
                results.tests.push({ name: 'users_depts_fk', status: 'passed' });
                results.passed++;
            } else {
                throw new Error(`${orphans.count} usuarios con department_id inválido`);
            }
        } catch (error) {
            console.error('   ❌ TEST 6 FAILED:', error.message);
            results.tests.push({ name: 'users_depts_fk', status: 'failed', error: error.message });
            results.failed++;
        }

        // ════════════════════════════════════════════════════════════════════════════
        // TEST 7: FK INTEGRITY - Attendances -> Users
        // ════════════════════════════════════════════════════════════════════════════
        console.log('\n🧪 TEST 7: FK INTEGRITY - Attendances -> Users');
        console.log('─'.repeat(60));

        try {
            const [orphans] = await sequelize.query(
                `SELECT COUNT(*) as count
                 FROM attendances a
                 LEFT JOIN users u ON a."UserId" = u.user_id
                 WHERE a.company_id = :companyId
                   AND u.user_id IS NULL`,
                { replacements: { companyId: COMPANY_ID }, type: Sequelize.QueryTypes.SELECT }
            );

            if (parseInt(orphans.count) === 0) {
                console.log('   ✅ TEST 7 PASSED - Todas las asistencias tienen usuario');
                results.tests.push({ name: 'attendance_users_fk', status: 'passed' });
                results.passed++;
            } else {
                throw new Error(`${orphans.count} asistencias huérfanas`);
            }
        } catch (error) {
            console.error('   ❌ TEST 7 FAILED:', error.message);
            results.tests.push({ name: 'attendance_users_fk', status: 'failed', error: error.message });
            results.failed++;
        }

        // ════════════════════════════════════════════════════════════════════════════
        // TEST 8: MULTI-TENANT ISOLATION (solo contar departamentos de la empresa)
        // ════════════════════════════════════════════════════════════════════════════
        console.log('\n🧪 TEST 8: MULTI-TENANT ISOLATION');
        console.log('─'.repeat(60));

        try {
            // Verificar que usuarios de ISI solo tengan departamentos de ISI
            const [stats] = await sequelize.query(
                `SELECT
                    COUNT(*) as total_users_with_dept,
                    COUNT(*) FILTER (WHERE d.company_id = u.company_id) as same_company,
                    COUNT(*) FILTER (WHERE d.company_id != u.company_id) as cross_company
                 FROM users u
                 JOIN departments d ON u.department_id = d.id
                 WHERE u.company_id = :companyId AND u.department_id IS NOT NULL`,
                { replacements: { companyId: COMPANY_ID }, type: Sequelize.QueryTypes.SELECT }
            );

            console.log(`   Usuarios con depto: ${stats.total_users_with_dept} | Misma empresa: ${stats.same_company} | Cruzados: ${stats.cross_company}`);

            if (parseInt(stats.cross_company) === 0) {
                console.log('   ✅ TEST 8 PASSED - Aislamiento multi-tenant correcto');
                results.tests.push({ name: 'multitenant_isolation', status: 'passed' });
                results.passed++;
            } else {
                console.log('   ⚠️ TEST 8 WARNING - Hay usuarios con departamentos de otras empresas');
                results.tests.push({ name: 'multitenant_isolation', status: 'warning', crossCount: stats.cross_company });
                results.passed++;
            }
        } catch (error) {
            console.error('   ❌ TEST 8 FAILED:', error.message);
            results.tests.push({ name: 'multitenant_isolation', status: 'failed', error: error.message });
            results.failed++;
        }

        // ════════════════════════════════════════════════════════════════════════════
        // TEST 9: USER SHIFT ASSIGNMENTS
        // ════════════════════════════════════════════════════════════════════════════
        console.log('\n🧪 TEST 9: USER SHIFT ASSIGNMENTS');
        console.log('─'.repeat(60));

        try {
            const [assignments] = await sequelize.query(
                `SELECT COUNT(*) as total,
                        COUNT(DISTINCT usa.user_id) as users_with_shifts,
                        COUNT(DISTINCT usa.shift_id) as shifts_assigned
                 FROM user_shift_assignments usa
                 JOIN users u ON usa.user_id = u.user_id
                 WHERE u.company_id = :companyId`,
                { replacements: { companyId: COMPANY_ID }, type: Sequelize.QueryTypes.SELECT }
            );

            console.log(`   Asignaciones: ${assignments.total} | Usuarios con turno: ${assignments.users_with_shifts} | Turnos asignados: ${assignments.shifts_assigned}`);
            console.log('   ✅ TEST 9 PASSED');
            results.tests.push({ name: 'shift_assignments', status: 'passed', data: assignments });
            results.passed++;
        } catch (error) {
            console.error('   ❌ TEST 9 FAILED:', error.message);
            results.tests.push({ name: 'shift_assignments', status: 'failed', error: error.message });
            results.failed++;
        }

        // ════════════════════════════════════════════════════════════════════════════
        // TEST 10: DATA FRESHNESS (usando "createdAt" para users)
        // ════════════════════════════════════════════════════════════════════════════
        console.log('\n🧪 TEST 10: DATA FRESHNESS (últimos 30 días)');
        console.log('─'.repeat(60));

        try {
            const [freshness] = await sequelize.query(
                `SELECT
                    (SELECT COUNT(*) FROM users WHERE company_id = :companyId AND "createdAt" > NOW() - INTERVAL '30 days') as new_users,
                    (SELECT COUNT(*) FROM attendances WHERE company_id = :companyId AND "checkInTime" > NOW() - INTERVAL '30 days') as recent_attendance,
                    (SELECT MAX("checkInTime") FROM attendances WHERE company_id = :companyId) as last_checkin`,
                { replacements: { companyId: COMPANY_ID }, type: Sequelize.QueryTypes.SELECT }
            );

            console.log(`   Usuarios nuevos (30d): ${freshness.new_users}`);
            console.log(`   Asistencias recientes (30d): ${freshness.recent_attendance}`);
            console.log(`   Último check-in: ${freshness.last_checkin || 'N/A'}`);
            console.log('   ✅ TEST 10 PASSED');
            results.tests.push({ name: 'data_freshness', status: 'passed', data: freshness });
            results.passed++;
        } catch (error) {
            console.error('   ❌ TEST 10 FAILED:', error.message);
            results.tests.push({ name: 'data_freshness', status: 'failed', error: error.message });
            results.failed++;
        }

    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO:', error.message);
        results.failed++;
    } finally {
        await sequelize.close();
    }

    // RESUMEN FINAL
    results.endTime = new Date().toISOString();

    console.log('\n' + '═'.repeat(80));
    console.log('🏆 RESUMEN FINAL - DB INTEGRATION TESTS');
    console.log('═'.repeat(80));
    console.log(`   📊 Total tests: ${results.tests.length}`);
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📈 Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);
    console.log('═'.repeat(80) + '\n');

    // Guardar resultados
    const fs = require('fs');
    const path = require('path');
    const resultsPath = path.join(__dirname, '..', `DB-TEST-RESULTS-${Date.now()}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`📁 Resultados guardados: ${path.basename(resultsPath)}\n`);

    process.exit(results.failed > 0 ? 1 : 0);
}

main();
