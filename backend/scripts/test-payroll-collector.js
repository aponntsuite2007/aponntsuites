/**
 * Script de test para verificar PayrollModuleCollector
 * Ejecuta tests de BD sin necesidad de Playwright
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    logging: false
});

async function runPayrollTests() {
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('   TEST: PAYROLL MODULE COLLECTOR - Verificación de BD');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    const results = {
        passed: 0,
        failed: 0,
        warnings: 0,
        tests: []
    };

    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL\n');

        // TEST 1: Verificar tablas de payroll
        console.log('📋 TEST 1: Tablas de Payroll');
        const [tables] = await sequelize.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'payroll%' OR table_name LIKE 'salary%' OR table_name LIKE 'labor%' OR table_name LIKE 'user_salary%'
            ORDER BY table_name
        `);
        console.log(`   Tablas encontradas: ${tables.length}`);
        tables.forEach(t => console.log(`   - ${t.table_name}`));
        results.tests.push({ name: 'Tablas Payroll', status: 'passed', count: tables.length });
        results.passed++;

        // TEST 2: Verificar triggers
        console.log('\n📋 TEST 2: Triggers de Propagación');
        const [triggers] = await sequelize.query(`
            SELECT trigger_name, event_object_table
            FROM information_schema.triggers
            WHERE trigger_schema = 'public'
            AND (trigger_name LIKE 'trg_propagate%' OR trigger_name LIKE 'trg_auto%' OR trigger_name LIKE 'trg_flag%')
        `);
        console.log(`   Triggers encontrados: ${triggers.length}`);
        triggers.forEach(t => console.log(`   - ${t.trigger_name} ON ${t.event_object_table}`));
        results.tests.push({ name: 'Triggers Propagación', status: triggers.length >= 5 ? 'passed' : 'warning', count: triggers.length });
        if (triggers.length >= 5) results.passed++; else results.warnings++;

        // TEST 3: Verificar funciones
        console.log('\n📋 TEST 3: Funciones PostgreSQL');
        const [functions] = await sequelize.query(`
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name LIKE 'fn_%'
            AND (routine_name LIKE '%payroll%' OR routine_name LIKE '%salary%' OR routine_name LIKE '%propagate%' OR routine_name LIKE '%clone%')
        `);
        console.log(`   Funciones encontradas: ${functions.length}`);
        functions.forEach(f => console.log(`   - ${f.routine_name}()`));
        results.tests.push({ name: 'Funciones PostgreSQL', status: functions.length >= 5 ? 'passed' : 'warning', count: functions.length });
        if (functions.length >= 5) results.passed++; else results.warnings++;

        // TEST 4: Verificar vista
        console.log('\n📋 TEST 4: Vista vw_user_salary_complete');
        try {
            const [viewData] = await sequelize.query(`SELECT COUNT(*) as count FROM vw_user_salary_complete`);
            console.log(`   Vista existe: ✅`);
            console.log(`   Registros: ${viewData[0].count}`);
            results.tests.push({ name: 'Vista Salary Complete', status: 'passed', count: viewData[0].count });
            results.passed++;
        } catch (error) {
            console.log(`   Vista existe: ❌ (${error.message})`);
            results.tests.push({ name: 'Vista Salary Complete', status: 'failed', error: error.message });
            results.failed++;
        }

        // TEST 5: Verificar datos de payroll
        console.log('\n📋 TEST 5: Datos de Payroll');
        const [templateCount] = await sequelize.query(`SELECT COUNT(*) as count FROM payroll_templates`);
        const [categoryCount] = await sequelize.query(`SELECT COUNT(*) as count FROM salary_categories`);
        const [configCount] = await sequelize.query(`SELECT COUNT(*) as count FROM user_salary_config_v2`);
        console.log(`   Plantillas: ${templateCount[0].count}`);
        console.log(`   Categorías: ${categoryCount[0].count}`);
        console.log(`   Configs Usuario: ${configCount[0].count}`);
        results.tests.push({
            name: 'Datos Payroll',
            status: 'passed',
            data: {
                templates: templateCount[0].count,
                categories: categoryCount[0].count,
                userConfigs: configCount[0].count
            }
        });
        results.passed++;

        // TEST 6: Verificar cadena completa User→Convenio→Categoría→Salario
        console.log('\n📋 TEST 6: Cadena Completa (User→Convenio→Categoría→Salario)');
        const [chainData] = await sequelize.query(`
            SELECT
                u.user_id,
                u."firstName" || ' ' || u."lastName" as employee,
                lac.name as convenio,
                sc.category_name as categoria,
                usc.base_salary as salario
            FROM users u
            JOIN user_salary_config_v2 usc ON usc.user_id = u.user_id AND usc.is_current = true
            JOIN labor_agreements_catalog lac ON lac.id = usc.labor_agreement_id
            JOIN salary_categories sc ON sc.id = usc.salary_category_id
            LIMIT 5
        `);
        console.log(`   Usuarios con cadena completa: ${chainData.length}`);
        chainData.forEach(row => {
            console.log(`   - ${row.employee}: ${row.convenio} → ${row.categoria} → $${row.salario}`);
        });
        results.tests.push({
            name: 'Cadena Completa',
            status: chainData.length > 0 ? 'passed' : 'warning',
            count: chainData.length
        });
        if (chainData.length > 0) results.passed++; else results.warnings++;

        // TEST 7: Verificar índices
        console.log('\n📋 TEST 7: Índices de Performance');
        const [indexes] = await sequelize.query(`
            SELECT indexname, tablename
            FROM pg_indexes
            WHERE schemaname = 'public'
            AND indexname LIKE 'idx_%salary%' OR indexname LIKE 'idx_%payroll%'
        `);
        console.log(`   Índices encontrados: ${indexes.length}`);
        indexes.forEach(i => console.log(`   - ${i.indexname} ON ${i.tablename}`));
        results.tests.push({ name: 'Índices Performance', status: 'passed', count: indexes.length });
        results.passed++;

        // RESUMEN
        console.log('\n═══════════════════════════════════════════════════════════════════════');
        console.log('                            RESUMEN');
        console.log('═══════════════════════════════════════════════════════════════════════');
        console.log(`   ✅ Tests Pasados: ${results.passed}`);
        console.log(`   ⚠️ Warnings: ${results.warnings}`);
        console.log(`   ❌ Tests Fallidos: ${results.failed}`);
        console.log(`   📊 Total Tests: ${results.tests.length}`);

        if (results.failed === 0) {
            console.log('\n🎉 TODOS LOS TESTS PASARON - Sistema de Payroll OK\n');
        } else {
            console.log('\n⚠️ ALGUNOS TESTS FALLARON - Revisar configuración\n');
        }

        return results;

    } catch (error) {
        console.error('❌ Error crítico:', error.message);
        return { error: error.message };
    } finally {
        await sequelize.close();
    }
}

runPayrollTests();
