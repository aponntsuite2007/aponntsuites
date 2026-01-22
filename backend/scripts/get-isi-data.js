/**
 * Script para obtener datos de la empresa ISI
 * para preparar stress test de kiosk biométrico
 */

const { sequelize } = require('../src/config/database');

async function getISIData() {
    try {
        console.log('🔍 Buscando datos de empresa ISI...\n');

        // Ver estructura de companies
        const [cols] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'companies'
            ORDER BY ordinal_position
        `);
        console.log('=== ESTRUCTURA COMPANIES ===');
        cols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

        // Buscar empresa ISI
        const [companies] = await sequelize.query(`
            SELECT * FROM companies
            WHERE LOWER(name) LIKE '%isi%' OR LOWER(slug) LIKE '%isi%'
        `);
        console.log('\n=== EMPRESAS ISI ===');
        console.log(JSON.stringify(companies, null, 2));

        if (companies.length === 0) {
            // Listar todas las empresas
            const [allCompanies] = await sequelize.query(`
                SELECT company_id, name, slug, is_active FROM companies LIMIT 20
            `);
            console.log('\n=== TODAS LAS EMPRESAS ===');
            allCompanies.forEach(c => console.log(`  [${c.company_id}] ${c.name} (${c.slug})`));
            process.exit(0);
        }

        const companyId = companies[0].company_id;
        console.log(`\n✅ Empresa ISI encontrada: ID = ${companyId}`);

        // Contar empleados
        const [employeeCount] = await sequelize.query(`
            SELECT COUNT(*) as total FROM users WHERE company_id = ${companyId}
        `);
        console.log('\n=== EMPLEADOS ISI ===');
        console.log('Total empleados:', employeeCount[0].total);

        // Empleados activos
        const [activeCount] = await sequelize.query(`
            SELECT COUNT(*) as total FROM users
            WHERE company_id = ${companyId} AND "isActive" = true
        `);
        console.log('Empleados activos:', activeCount[0].total);

        // Empleados con biometría
        const [biometricCount] = await sequelize.query(`
            SELECT COUNT(DISTINCT employee_id) as total
            FROM biometric_templates
            WHERE company_id = ${companyId} AND is_active = true
        `);
        console.log('Con template biométrico:', biometricCount[0].total);

        // Lista de empleados con templates
        const [employees] = await sequelize.query(`
            SELECT u.user_id, u."firstName", u."lastName", u.legajo, u.email,
                   bt.id as template_id, bt.created_at as template_date
            FROM users u
            JOIN biometric_templates bt ON bt.employee_id::text = u.user_id::text
            WHERE u.company_id = ${companyId} AND bt.is_active = true
            ORDER BY u."lastName"
        `);
        console.log('\n=== EMPLEADOS CON TEMPLATES BIOMÉTRICOS ===');
        employees.forEach(e => {
            console.log(`  - ${e.firstName} ${e.lastName} (Legajo: ${e.legajo || 'N/A'}) - Template ID: ${e.template_id}`);
        });
        console.log(`Total: ${employees.length} empleados con biometría`);

        // Kiosks de la empresa
        const [kiosks] = await sequelize.query(`
            SELECT id, name, device_id, is_active, location
            FROM kiosks
            WHERE company_id = ${companyId}
        `);
        console.log('\n=== KIOSKS ISI ===');
        if (kiosks.length === 0) {
            console.log('  No hay kiosks configurados');
        } else {
            kiosks.forEach(k => {
                console.log(`  [${k.id}] ${k.name} - ${k.is_active ? 'ACTIVO' : 'INACTIVO'} - Device: ${k.device_id || 'N/A'}`);
            });
        }

        // Asistencias recientes
        const [recentAtt] = await sequelize.query(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN DATE(check_in) = CURRENT_DATE THEN 1 END) as hoy,
                COUNT(CASE WHEN DATE(check_in) >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as ultima_semana
            FROM attendances
            WHERE user_id::text IN (SELECT user_id::text FROM users WHERE company_id = ${companyId})
        `);
        console.log('\n=== ASISTENCIAS ===');
        console.log('Total histórico:', recentAtt[0].total);
        console.log('Hoy:', recentAtt[0].hoy);
        console.log('Última semana:', recentAtt[0].ultima_semana);

        // Detecciones biométricas
        const [detections] = await sequelize.query(`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN DATE(detection_timestamp) = CURRENT_DATE THEN 1 END) as hoy
            FROM biometric_detections
            WHERE company_id = ${companyId}
        `);
        console.log('\n=== DETECCIONES BIOMÉTRICAS ===');
        console.log('Total:', detections[0].total);
        console.log('Hoy:', detections[0].hoy);

        // Exportar datos para el stress test
        console.log('\n=== DATOS PARA STRESS TEST ===');
        const testData = {
            companyId: companyId,
            companyName: companies[0].name,
            totalEmployees: parseInt(employeeCount[0].total),
            activeEmployees: parseInt(activeCount[0].total),
            employeesWithBiometrics: employees.length,
            employees: employees.map(e => ({
                userId: e.user_id,
                name: `${e.firstName} ${e.lastName}`,
                legajo: e.legajo,
                templateId: e.template_id
            })),
            kiosks: kiosks
        };

        console.log(JSON.stringify(testData, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

getISIData();
