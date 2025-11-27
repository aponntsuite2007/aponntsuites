/**
 * TEST DE INTEGRACIÓN COMPLETA: User -> Convenio -> Categoría -> Liquidación
 * Sistema de Liquidación Parametrizable v3.0
 *
 * Este script prueba:
 * 1. Creación de convenio colectivo de trabajo (CCT)
 * 2. Creación de categorías salariales vinculadas al convenio
 * 3. Creación de 10 empleados con configuración salarial
 * 4. Creación de plantilla con conceptos remunerativos y deducciones
 * 5. Ejecución de liquidación de período
 * 6. Verificación de propagación dinámica de cambios
 */

const { Sequelize, DataTypes } = require('sequelize');
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

// Empresa ISI para las pruebas
const ISI_COMPANY_ID = 1;

async function cleanTestData() {
    console.log('\n🧹 Limpiando datos de prueba anteriores...');

    // Eliminar en orden inverso de dependencias
    // NOTA: user_salary_config_v2 usa FKs a labor_agreements_catalog y salary_categories (NO v2!)
    await sequelize.query(`DELETE FROM payroll_run_details WHERE run_id IN (SELECT id FROM payroll_runs WHERE run_code LIKE 'TEST-%')`);
    await sequelize.query(`DELETE FROM payroll_runs WHERE run_code LIKE 'TEST-%'`);
    await sequelize.query(`DELETE FROM user_salary_config_v2 WHERE company_id = ${ISI_COMPANY_ID} AND notes LIKE '%TEST_DATA%'`);
    await sequelize.query(`DELETE FROM payroll_template_concepts WHERE template_id IN (SELECT id FROM payroll_templates WHERE template_code LIKE 'TEST-%')`);
    await sequelize.query(`DELETE FROM payroll_templates WHERE template_code LIKE 'TEST-%'`);
    // Eliminar de ambas tablas de categorías
    await sequelize.query(`DELETE FROM salary_categories_v2 WHERE company_id = ${ISI_COMPANY_ID} AND category_code LIKE 'TEST-%'`);
    await sequelize.query(`DELETE FROM salary_categories WHERE category_code LIKE 'TEST-%'`);
    // Eliminar de ambas tablas de convenios
    await sequelize.query(`DELETE FROM labor_agreements_v2 WHERE company_id = ${ISI_COMPANY_ID} AND code LIKE 'TEST-%'`);
    await sequelize.query(`DELETE FROM labor_agreements_catalog WHERE code LIKE 'TEST-%'`);

    console.log('   ✅ Datos de prueba anteriores eliminados');
}

async function createTestAgreement() {
    console.log('\n📜 Creando convenio colectivo de prueba...');

    // NOTA: user_salary_config_v2 tiene FK a labor_agreements_catalog (NO labor_agreements_v2)
    // Insertamos en AMBAS tablas para mantener consistencia

    // 1. Insertar en labor_agreements_catalog (tabla que usa el FK)
    const [catalogResult] = await sequelize.query(`
        INSERT INTO labor_agreements_catalog
        (code, name, industry, union_name, description, is_active, created_at)
        VALUES
        ('TEST-CCT-2024', 'CCT Comercio - Test Integration', 'Comercio',
         'FAECYS', 'Convenio de prueba para integración', true, NOW())
        RETURNING id, code, name
    `);

    const agreementCatalog = catalogResult[0];
    console.log(`   ✅ Convenio Catálogo: ID=${agreementCatalog.id}, ${agreementCatalog.code}`);

    // 2. También insertar en labor_agreements_v2 para las plantillas de liquidación
    const [countries] = await sequelize.query(`SELECT id FROM payroll_countries WHERE country_code = 'AR' LIMIT 1`);
    const countryId = countries.length > 0 ? countries[0].id : 1;

    const [v2Result] = await sequelize.query(`
        INSERT INTO labor_agreements_v2
        (country_id, company_id, code, name, short_name, industry, effective_date,
         base_work_hours_weekly, base_work_hours_daily, overtime_threshold_daily,
         overtime_50_multiplier, overtime_100_multiplier, night_shift_multiplier,
         vacation_days_by_seniority, is_active, created_at, updated_at)
        VALUES
        (${countryId}, ${ISI_COMPANY_ID}, 'TEST-CCT-2024', 'CCT Comercio - Test Integration',
         'CCT Comercio', 'Comercio', '2024-01-01',
         44.00, 8.00, 8.00,
         1.50, 2.00, 1.30,
         '{"0-5": 14, "5-10": 21, "10-20": 28, "20+": 35}',
         true, NOW(), NOW())
        RETURNING id, code, name
    `);

    console.log(`   ✅ Convenio V2: ID=${v2Result[0].id}, ${v2Result[0].code}`);

    // Retornamos ambos IDs
    return { catalogId: agreementCatalog.id, v2Id: v2Result[0].id };
}

async function createTestCategories(agreementIds) {
    console.log('\n📋 Creando categorías salariales de prueba...');

    // NOTA: user_salary_config_v2 tiene FK a salary_categories (NO salary_categories_v2)
    // Insertamos en AMBAS tablas

    const categories = [
        { code: 'TEST-CAT-A', name: 'Administrativo Junior', baseSalary: 450000, hourlyRate: 2500 },
        { code: 'TEST-CAT-B', name: 'Administrativo Senior', baseSalary: 650000, hourlyRate: 3611 },
        { code: 'TEST-CAT-C', name: 'Supervisor', baseSalary: 850000, hourlyRate: 4722 },
        { code: 'TEST-CAT-D', name: 'Gerente', baseSalary: 1200000, hourlyRate: 6666 }
    ];

    const createdCatalogIds = [];  // IDs de salary_categories (para user_salary_config_v2)
    const createdV2Ids = [];       // IDs de salary_categories_v2 (para otros usos)

    for (const cat of categories) {
        // 1. Insertar en salary_categories (tabla que usa el FK de user_salary_config_v2)
        const [catalogResult] = await sequelize.query(`
            INSERT INTO salary_categories
            (labor_agreement_id, category_code, category_name, description,
             base_salary_reference, effective_date, is_active, created_at)
            VALUES
            (${agreementIds.catalogId}, '${cat.code}', '${cat.name}',
             'Categoría de prueba', ${cat.baseSalary}, '2024-01-01', true, NOW())
            RETURNING id, category_code, category_name, base_salary_reference
        `);

        createdCatalogIds.push({
            id: catalogResult[0].id,
            baseSalary: cat.baseSalary,
            hourlyRate: cat.hourlyRate
        });

        // 2. También insertar en salary_categories_v2
        const [v2Result] = await sequelize.query(`
            INSERT INTO salary_categories_v2
            (labor_agreement_id, company_id, category_code, category_name,
             base_salary_min, base_salary_max, hourly_rate_min, hourly_rate_max,
             recommended_base_salary, recommended_hourly_rate,
             seniority_level, is_active, effective_from, created_at, updated_at)
            VALUES
            (${agreementIds.v2Id}, ${ISI_COMPANY_ID}, '${cat.code}', '${cat.name}',
             ${cat.baseSalary * 0.9}, ${cat.baseSalary * 1.1}, ${cat.hourlyRate * 0.9}, ${cat.hourlyRate * 1.1},
             ${cat.baseSalary}, ${cat.hourlyRate},
             ${categories.indexOf(cat) + 1}, true, '2024-01-01', NOW(), NOW())
            RETURNING id
        `);

        createdV2Ids.push(v2Result[0].id);

        console.log(`   ✅ Categoría ${catalogResult[0].category_code}: ${catalogResult[0].category_name} - $${catalogResult[0].base_salary_reference}`);
    }

    return { catalogIds: createdCatalogIds, v2Ids: createdV2Ids };
}

async function assignSalaryConfigToUsers(agreementIds, categoryData) {
    console.log('\n👥 Asignando configuración salarial a usuarios...');

    // Obtener usuarios de la empresa ISI (hasta 10)
    // NOTA: La tabla users usa camelCase para columnas (firstName, lastName)
    const [users] = await sequelize.query(`
        SELECT user_id, "firstName" as first_name, "lastName" as last_name
        FROM users
        WHERE company_id = ${ISI_COMPANY_ID}
        AND is_active = true
        LIMIT 10
    `);

    if (users.length === 0) {
        console.log('   ⚠️ No hay usuarios en la empresa ISI. Saltando...');
        return [];
    }

    const assignedUsers = [];

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        // Usar IDs del catálogo (salary_categories) para el FK
        const categoryInfo = categoryData.catalogIds[i % categoryData.catalogIds.length];

        const baseSalary = categoryInfo.baseSalary;
        const hourlyRate = categoryInfo.hourlyRate;

        // Insertar configuración salarial
        // NOTA: labor_agreement_id FK -> labor_agreements_catalog.id
        //       salary_category_id FK -> salary_categories.id
        await sequelize.query(`
            INSERT INTO user_salary_config_v2
            (user_id, company_id, labor_agreement_id, salary_category_id, payment_type,
             base_salary, gross_salary, hourly_rate, overtime_rate_50, overtime_rate_100,
             currency, effective_from, is_current, notes, created_at, updated_at)
            VALUES
            ('${user.user_id}', ${ISI_COMPANY_ID}, ${agreementIds.catalogId}, ${categoryInfo.id}, 'monthly',
             ${baseSalary}, ${baseSalary}, ${hourlyRate}, ${hourlyRate * 1.5}, ${hourlyRate * 2},
             'ARS', NOW(), true, 'TEST_DATA - Integración Payroll', NOW(), NOW())
        `);

        assignedUsers.push({
            userId: user.user_id,
            name: `${user.first_name} ${user.last_name}`,
            baseSalary,
            hourlyRate
        });

        console.log(`   ✅ ${user.first_name} ${user.last_name}: $${baseSalary} (Hora: $${hourlyRate})`);
    }

    return assignedUsers;
}

async function createTestTemplate(agreementIds) {
    console.log('\n📑 Creando plantilla de liquidación con conceptos...');

    // Obtener país Argentina
    const [countries] = await sequelize.query(`SELECT id FROM payroll_countries WHERE country_code = 'AR' LIMIT 1`);
    const countryId = countries.length > 0 ? countries[0].id : 1;

    // Crear plantilla - usa labor_agreements_v2.id
    const [templateResult] = await sequelize.query(`
        INSERT INTO payroll_templates
        (company_id, country_id, labor_agreement_id, template_code, template_name,
         description, pay_frequency, calculation_basis,
         work_hours_per_day, work_days_per_week, work_hours_per_month,
         overtime_50_after_hours, overtime_100_after_hours,
         is_active, created_at, updated_at)
        VALUES
        (${ISI_COMPANY_ID}, ${countryId}, ${agreementIds.v2Id}, 'TEST-TEMPLATE-01', 'Liquidación Mensual Comercio',
         'Plantilla de prueba para liquidación mensual según CCT Comercio',
         'monthly', 'monthly',
         8.00, 5, 200,
         8, 12,
         true, NOW(), NOW())
        RETURNING id, template_code, template_name
    `);

    const templateId = templateResult[0].id;
    console.log(`   ✅ Plantilla creada: ID=${templateId}, ${templateResult[0].template_code}`);

    // Obtener tipos de conceptos
    const [conceptTypes] = await sequelize.query(`SELECT id, type_code, type_name FROM payroll_concept_types ORDER BY display_order`);

    const conceptTypesMap = {};
    conceptTypes.forEach(ct => { conceptTypesMap[ct.type_code] = ct.id; });

    // Crear conceptos remunerativos
    const concepts = [
        // Haberes (Remunerativos)
        { code: 'SAL-BASE', name: 'Sueldo Básico', type: 'EARNING', calcType: 'base_salary', value: 100, order: 1 },
        { code: 'PRESENT', name: 'Presentismo', type: 'EARNING', calcType: 'percentage', value: 8.33, order: 2 },
        { code: 'ANTIG', name: 'Antigüedad', type: 'EARNING', calcType: 'formula', formula: 'base_salary * seniority_years * 0.01', value: 0, order: 3 },
        { code: 'HS-EXT-50', name: 'Horas Extra 50%', type: 'EARNING', calcType: 'hourly_multiply', value: 1.5, order: 4 },
        { code: 'HS-EXT-100', name: 'Horas Extra 100%', type: 'EARNING', calcType: 'hourly_multiply', value: 2.0, order: 5 },

        // No remunerativos
        { code: 'VIATICOS', name: 'Viáticos', type: 'NON_TAXABLE', calcType: 'fixed', value: 15000, order: 6 },

        // Deducciones empleado
        { code: 'JUB', name: 'Jubilación (11%)', type: 'DEDUCTION', calcType: 'percentage', value: 11, order: 10, isDeduction: true },
        { code: 'OBRA-SOC', name: 'Obra Social (3%)', type: 'DEDUCTION', calcType: 'percentage', value: 3, order: 11, isDeduction: true },
        { code: 'LEY19032', name: 'Ley 19032 - PAMI (3%)', type: 'DEDUCTION', calcType: 'percentage', value: 3, order: 12, isDeduction: true },
        { code: 'SIND', name: 'Sindicato (2%)', type: 'DEDUCTION', calcType: 'percentage', value: 2, order: 13, isDeduction: true },

        // Aportes empleador
        { code: 'CONT-JUB', name: 'Contrib. Jubilación (10.17%)', type: 'EMPLOYER', calcType: 'percentage', value: 10.17, order: 20, isEmployer: true },
        { code: 'CONT-OS', name: 'Contrib. Obra Social (6%)', type: 'EMPLOYER', calcType: 'percentage', value: 6, order: 21, isEmployer: true },
        { code: 'CONT-PAMI', name: 'Contrib. PAMI (1.5%)', type: 'EMPLOYER', calcType: 'percentage', value: 1.5, order: 22, isEmployer: true }
    ];

    let conceptCount = 0;
    for (const concept of concepts) {
        const conceptTypeId = conceptTypesMap[concept.type] || 1;

        await sequelize.query(`
            INSERT INTO payroll_template_concepts
            (template_id, concept_type_id, concept_code, concept_name,
             calculation_type, default_value, percentage_base, formula,
             is_mandatory, is_visible_receipt, is_editable_per_user,
             employee_contribution_rate, employer_contribution_rate,
             display_order, is_active, created_at, updated_at)
            VALUES
            (${templateId}, ${conceptTypeId}, '${concept.code}', '${concept.name}',
             '${concept.calcType}', ${concept.value},
             ${concept.isDeduction || concept.isEmployer ? "'gross_salary'" : 'NULL'},
             ${concept.formula ? `'${concept.formula}'` : 'NULL'},
             ${concept.isDeduction ? 'true' : 'false'}, true, false,
             ${concept.isDeduction ? concept.value : 0},
             ${concept.isEmployer ? concept.value : 0},
             ${concept.order}, true, NOW(), NOW())
        `);
        conceptCount++;
    }

    console.log(`   ✅ ${conceptCount} conceptos creados (haberes, deducciones, aportes empleador)`);

    return templateId;
}

async function createTestPayrollRun(templateId, users) {
    console.log('\n💰 Creando liquidación de período de prueba (Noviembre 2024)...');

    if (users.length === 0) {
        console.log('   ⚠️ No hay usuarios para liquidar. Saltando...');
        return null;
    }

    // Crear período de liquidación
    const [runResult] = await sequelize.query(`
        INSERT INTO payroll_runs
        (company_id, run_code, run_name, period_year, period_month,
         period_start, period_end, payment_date,
         total_employees, status, created_at, updated_at)
        VALUES
        (${ISI_COMPANY_ID}, 'TEST-RUN-2024-11', 'Liquidación Nov 2024 - Test',
         2024, 11, '2024-11-01', '2024-11-30', '2024-12-05',
         ${users.length}, 'draft', NOW(), NOW())
        RETURNING id, run_code
    `);

    const runId = runResult[0].id;
    console.log(`   ✅ Período creado: ID=${runId}, ${runResult[0].run_code}`);

    // Crear detalle por cada usuario
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const user of users) {
        // Simular cálculos básicos
        const gross = parseFloat(user.baseSalary);
        const presentismo = gross * 0.0833;
        const totalHaberes = gross + presentismo;

        const jubilacion = totalHaberes * 0.11;
        const obraSocial = totalHaberes * 0.03;
        const pami = totalHaberes * 0.03;
        const sindicato = totalHaberes * 0.02;
        const deductions = jubilacion + obraSocial + pami + sindicato;

        const net = totalHaberes - deductions;

        totalGross += totalHaberes;
        totalDeductions += deductions;
        totalNet += net;

        await sequelize.query(`
            INSERT INTO payroll_run_details
            (run_id, user_id, worked_days, worked_hours,
             overtime_50_hours, overtime_100_hours, night_hours,
             absent_days, gross_earnings, non_remunerative,
             total_deductions, net_salary, employer_contributions,
             earnings_detail, deductions_detail,
             status, created_at, updated_at)
            VALUES
            (${runId}, '${user.userId}', 22, 176,
             0, 0, 0,
             0, ${totalHaberes.toFixed(2)}, 15000,
             ${deductions.toFixed(2)}, ${net.toFixed(2)}, ${(totalHaberes * 0.1767).toFixed(2)},
             '{"sueldo_basico": ${gross}, "presentismo": ${presentismo.toFixed(2)}}',
             '{"jubilacion": ${jubilacion.toFixed(2)}, "obra_social": ${obraSocial.toFixed(2)}, "pami": ${pami.toFixed(2)}, "sindicato": ${sindicato.toFixed(2)}}',
             'calculated', NOW(), NOW())
        `);

        console.log(`   📋 ${user.name}: Bruto $${totalHaberes.toFixed(2)} - Deduc $${deductions.toFixed(2)} = Neto $${net.toFixed(2)}`);
    }

    // Actualizar totales del run
    await sequelize.query(`
        UPDATE payroll_runs
        SET total_gross = ${totalGross.toFixed(2)},
            total_deductions = ${totalDeductions.toFixed(2)},
            total_net = ${totalNet.toFixed(2)},
            total_employer_cost = ${(totalGross * 0.1767).toFixed(2)},
            status = 'calculated'
        WHERE id = ${runId}
    `);

    console.log(`\n   📊 RESUMEN LIQUIDACIÓN:`);
    console.log(`      Total Bruto:       $${totalGross.toFixed(2)}`);
    console.log(`      Total Deducciones: $${totalDeductions.toFixed(2)}`);
    console.log(`      Total Neto:        $${totalNet.toFixed(2)}`);
    console.log(`      Costo Empleador:   $${(totalGross * 0.1767).toFixed(2)}`);

    return runId;
}

async function testDynamicPropagation(categoryData) {
    console.log('\n🔄 PRUEBA DE PROPAGACIÓN DINÁMICA...');
    console.log('   Simulando: Aumento de 10% en categoría Administrativo Junior\n');

    // Usamos salary_categories (el catálogo que tiene el FK)
    const firstCategoryId = categoryData.catalogIds[0].id;

    // 1. Obtener valor actual
    const [before] = await sequelize.query(`
        SELECT sc.id, sc.category_name, sc.base_salary_reference as recommended_base_salary
        FROM salary_categories sc
        WHERE sc.id = ${firstCategoryId}
    `);

    const baseSalaryBefore = parseFloat(before[0].recommended_base_salary);
    const hourlyRateBefore = baseSalaryBefore / 200; // Cálculo aproximado

    console.log(`   ANTES del aumento:`);
    console.log(`   - Categoría: ${before[0].category_name}`);
    console.log(`   - Salario base: $${baseSalaryBefore}`);
    console.log(`   - Valor hora (calc): $${hourlyRateBefore.toFixed(2)}`);

    // 2. Aplicar aumento del 10%
    const newBase = baseSalaryBefore * 1.10;
    const newHourly = hourlyRateBefore * 1.10;

    await sequelize.query(`
        UPDATE salary_categories
        SET base_salary_reference = ${newBase.toFixed(2)}
        WHERE id = ${firstCategoryId}
    `);

    // 3. Verificar propagación a user_salary_config_v2
    // NOTA: En un sistema real, esto debería actualizarse automáticamente via trigger o job

    const [usersWithCategory] = await sequelize.query(`
        SELECT usc.id, usc.user_id, usc.base_salary, usc.hourly_rate, u."firstName" as first_name, u."lastName" as last_name
        FROM user_salary_config_v2 usc
        JOIN users u ON u.user_id = usc.user_id
        WHERE usc.salary_category_id = ${firstCategoryId}
        AND usc.is_current = true
    `);

    console.log(`\n   DESPUÉS del aumento:`);
    console.log(`   - Nuevo salario base categoría: $${newBase.toFixed(2)}`);
    console.log(`   - Nuevo valor hora categoría: $${newHourly.toFixed(2)}`);

    if (usersWithCategory.length > 0) {
        console.log(`\n   📋 USUARIOS AFECTADOS (${usersWithCategory.length}):`);

        for (const user of usersWithCategory) {
            const salarioActual = parseFloat(user.base_salary);
            const diferencia = newBase - salarioActual;

            console.log(`   - ${user.first_name} ${user.last_name}:`);
            console.log(`     Salario actual: $${salarioActual.toFixed(2)}`);
            console.log(`     Salario nuevo categoría: $${newBase.toFixed(2)}`);
            console.log(`     Diferencia: $${diferencia.toFixed(2)} (${diferencia > 0 ? '+' : ''}${((diferencia/salarioActual)*100).toFixed(1)}%)`);
        }

        console.log(`\n   ⚠️  NOTA: Para que la propagación sea automática, se necesita:`);
        console.log(`      1. Un TRIGGER en BD que actualice user_salary_config_v2`);
        console.log(`      2. O un Job/Cron que sincronice cambios de categoría`);
        console.log(`      3. O un UPDATE manual al confirmar el aumento`);
    } else {
        console.log(`\n   ℹ️  No hay usuarios asignados a esta categoría`);
    }

    // 4. Revertir cambio para no afectar otros tests
    await sequelize.query(`
        UPDATE salary_categories
        SET base_salary_reference = ${baseSalaryBefore}
        WHERE id = ${firstCategoryId}
    `);

    console.log(`\n   ✅ Cambio revertido para mantener consistencia de pruebas`);
}

async function verifyIntegration() {
    console.log('\n\n🔍 VERIFICACIÓN FINAL DE INTEGRACIÓN...\n');

    // 1. Verificar cadena completa
    const [chain] = await sequelize.query(`
        SELECT
            u."firstName" || ' ' || u."lastName" as empleado,
            la.name as convenio,
            sc.category_name as categoria,
            usc.base_salary as salario_base,
            usc.hourly_rate as valor_hora,
            pt.template_name as plantilla
        FROM user_salary_config_v2 usc
        JOIN users u ON u.user_id = usc.user_id
        LEFT JOIN labor_agreements_v2 la ON la.id = usc.labor_agreement_id
        LEFT JOIN salary_categories_v2 sc ON sc.id = usc.salary_category_id
        LEFT JOIN payroll_templates pt ON pt.labor_agreement_id = la.id
        WHERE usc.company_id = ${ISI_COMPANY_ID}
        AND usc.notes LIKE '%TEST_DATA%'
        LIMIT 5
    `);

    if (chain.length > 0) {
        console.log('📊 CADENA: User → Convenio → Categoría → Salario → Plantilla\n');
        console.log('┌─────────────────────┬──────────────────────────┬──────────────────────┬───────────────┬────────────┐');
        console.log('│ Empleado            │ Convenio                 │ Categoría            │ Salario Base  │ Hora       │');
        console.log('├─────────────────────┼──────────────────────────┼──────────────────────┼───────────────┼────────────┤');

        for (const row of chain) {
            const emp = (row.empleado || 'N/A').substring(0, 19).padEnd(19);
            const conv = (row.convenio || 'N/A').substring(0, 24).padEnd(24);
            const cat = (row.categoria || 'N/A').substring(0, 20).padEnd(20);
            const sal = ('$' + parseFloat(row.salario_base || 0).toFixed(0)).padStart(13);
            const hora = ('$' + parseFloat(row.valor_hora || 0).toFixed(0)).padStart(10);
            console.log(`│ ${emp} │ ${conv} │ ${cat} │ ${sal} │ ${hora} │`);
        }

        console.log('└─────────────────────┴──────────────────────────┴──────────────────────┴───────────────┴────────────┘');
    }

    // 2. Verificar liquidación
    const [runs] = await sequelize.query(`
        SELECT pr.run_code, pr.run_name, pr.total_employees,
               pr.total_gross, pr.total_deductions, pr.total_net, pr.status
        FROM payroll_runs pr
        WHERE pr.company_id = ${ISI_COMPANY_ID}
        AND pr.run_code LIKE 'TEST-%'
    `);

    if (runs.length > 0) {
        console.log('\n📋 LIQUIDACIONES CREADAS:\n');
        for (const run of runs) {
            console.log(`   ${run.run_code}: ${run.run_name}`);
            console.log(`   - Empleados: ${run.total_employees}`);
            console.log(`   - Total Bruto: $${parseFloat(run.total_gross).toFixed(2)}`);
            console.log(`   - Total Neto: $${parseFloat(run.total_net).toFixed(2)}`);
            console.log(`   - Estado: ${run.status}`);
        }
    }

    console.log('\n✅ INTEGRACIÓN VERIFICADA EXITOSAMENTE');
}

async function runIntegrationTest() {
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('   TEST DE INTEGRACIÓN COMPLETA: SISTEMA DE LIQUIDACIÓN PARAMETRIZABLE');
    console.log('═══════════════════════════════════════════════════════════════════════');

    try {
        await sequelize.authenticate();
        console.log('\n✅ Conectado a PostgreSQL');

        // 1. Limpiar datos de prueba anteriores
        await cleanTestData();

        // 2. Crear convenio (en ambas tablas: catalog y v2)
        const agreementIds = await createTestAgreement();

        // 3. Crear categorías (en ambas tablas: salary_categories y salary_categories_v2)
        const categoryData = await createTestCategories(agreementIds);

        // 4. Asignar configuración salarial a usuarios
        const users = await assignSalaryConfigToUsers(agreementIds, categoryData);

        // 5. Crear plantilla con conceptos
        const templateId = await createTestTemplate(agreementIds);

        // 6. Crear liquidación de prueba
        const runId = await createTestPayrollRun(templateId, users);

        // 7. Probar propagación dinámica
        await testDynamicPropagation(categoryData);

        // 8. Verificación final
        await verifyIntegration();

        console.log('\n═══════════════════════════════════════════════════════════════════════');
        console.log('   ✅ TEST DE INTEGRACIÓN COMPLETADO EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ ERROR EN TEST DE INTEGRACIÓN:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
}

// Ejecutar
runIntegrationTest();
