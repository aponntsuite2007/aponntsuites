/**
 * Script para crear datos completos de Payroll para empresa ISI (company_id = 11)
 *
 * ARQUITECTURA DE TABLAS:
 * - labor_agreements_catalog: Catálogo GLOBAL de convenios (para salary_categories, user_salary_config_v2)
 * - labor_agreements_v2: Convenios PER-COMPANY (para payroll_templates)
 * - salary_categories: FK → labor_agreements_catalog
 * - user_salary_config_v2: FK → labor_agreements_catalog
 * - payroll_templates: FK → labor_agreements_v2
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    logging: false
});

const ISI_COMPANY_ID = 11;

async function seedPayrollISI() {
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('   SEED PAYROLL DATA - EMPRESA ISI (ID: 11)');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL\n');

        // Obtener country_id (Argentina)
        let countryId = 1;
        const [countries] = await sequelize.query(`
            SELECT id FROM payroll_countries
            WHERE country_code = 'ARG' OR country_name ILIKE '%argentina%'
            LIMIT 1
        `);
        if (countries.length > 0) countryId = countries[0].id;
        console.log('   País: Argentina (ID: ' + countryId + ')\n');

        // ====================================================================
        // 1. CREAR CONVENIO EN labor_agreements_catalog (GLOBAL)
        //    Para: salary_categories, user_salary_config_v2
        // ====================================================================
        console.log('📋 1. Creando Convenio en Catálogo Global (labor_agreements_catalog)...');
        const [existingCatalogAgreement] = await sequelize.query(`
            SELECT id FROM labor_agreements_catalog WHERE code = 'CCT-ISI-2025' LIMIT 1
        `);

        let catalogAgreementId;
        if (existingCatalogAgreement.length === 0) {
            const [newCatalogAgreement] = await sequelize.query(`
                INSERT INTO labor_agreements_catalog (code, name, industry, description, is_active, created_at)
                VALUES ('CCT-ISI-2025', 'CCT Tecnología e Informática', 'Tecnología', 'Convenio Colectivo para empresas de tecnología e informática', true, NOW())
                RETURNING id
            `);
            catalogAgreementId = newCatalogAgreement[0].id;
            console.log('   ✅ Convenio catálogo creado (ID: ' + catalogAgreementId + ')');
        } else {
            catalogAgreementId = existingCatalogAgreement[0].id;
            console.log('   ⚠️ Convenio catálogo ya existe (ID: ' + catalogAgreementId + ')');
        }

        // ====================================================================
        // 2. CREAR CONVENIO EN labor_agreements_v2 (PER-COMPANY)
        //    Para: payroll_templates
        // ====================================================================
        console.log('\n📋 2. Creando Convenio Per-Company (labor_agreements_v2)...');
        const [existingV2Agreement] = await sequelize.query(`
            SELECT id FROM labor_agreements_v2 WHERE company_id = ${ISI_COMPANY_ID} LIMIT 1
        `);

        let v2AgreementId;
        if (existingV2Agreement.length === 0) {
            const [newV2Agreement] = await sequelize.query(`
                INSERT INTO labor_agreements_v2 (
                    country_id, company_id, code, name, short_name, industry,
                    effective_date, base_work_hours_weekly, base_work_hours_daily,
                    overtime_threshold_daily, overtime_50_multiplier, overtime_100_multiplier,
                    night_shift_multiplier, vacation_days_by_seniority, is_active, created_at
                ) VALUES (
                    ${countryId}, ${ISI_COMPANY_ID}, 'CCT-ISI-2025', 'CCT Tecnología e Informática ISI',
                    'CCT TEC', 'Tecnología',
                    '2025-01-01', 44, 8, 8, 1.5, 2.0, 1.3,
                    '{"0-5": 14, "5-10": 21, "10-20": 28, "20+": 35}',
                    true, NOW()
                )
                RETURNING id
            `);
            v2AgreementId = newV2Agreement[0].id;
            console.log('   ✅ Convenio v2 creado (ID: ' + v2AgreementId + ')');
        } else {
            v2AgreementId = existingV2Agreement[0].id;
            console.log('   ⚠️ Convenio v2 ya existe (ID: ' + v2AgreementId + ')');
        }

        // ====================================================================
        // 3. CREAR CATEGORÍAS SALARIALES (usa catalogAgreementId)
        // ====================================================================
        console.log('\n📋 3. Creando Categorías Salariales...');
        const categories = [
            { code: 'TEC-JR', name: 'Desarrollador Junior', salary: 800000, description: 'Desarrollador con menos de 2 años de experiencia' },
            { code: 'TEC-SSR', name: 'Desarrollador Semi-Senior', salary: 1200000, description: 'Desarrollador con 2-4 años de experiencia' },
            { code: 'TEC-SR', name: 'Desarrollador Senior', salary: 1800000, description: 'Desarrollador con más de 4 años de experiencia' },
            { code: 'TEC-TL', name: 'Tech Lead', salary: 2200000, description: 'Líder técnico de equipo' },
            { code: 'TEC-ADM', name: 'Administrativo IT', salary: 700000, description: 'Personal administrativo área IT' },
            { code: 'TEC-GER', name: 'Gerente Tecnología', salary: 3000000, description: 'Gerente de área tecnología' }
        ];

        const categoryIds = {};
        for (const cat of categories) {
            const [existing] = await sequelize.query(`
                SELECT id FROM salary_categories WHERE category_code = '${cat.code}' LIMIT 1
            `);

            if (existing.length === 0) {
                const [newCat] = await sequelize.query(`
                    INSERT INTO salary_categories (category_code, category_name, base_salary_reference, description, labor_agreement_id, is_active, created_at)
                    VALUES ('${cat.code}', '${cat.name}', ${cat.salary}, '${cat.description}', ${catalogAgreementId}, true, NOW())
                    RETURNING id
                `);
                categoryIds[cat.code] = newCat[0].id;
                console.log('   ✅ Categoría: ' + cat.name + ' ($' + cat.salary.toLocaleString() + ')');
            } else {
                categoryIds[cat.code] = existing[0].id;
                console.log('   ⚠️ Ya existe: ' + cat.name + ' (ID: ' + existing[0].id + ')');
            }
        }

        // ====================================================================
        // 4. CREAR PLANTILLA DE LIQUIDACIÓN (usa v2AgreementId)
        // ====================================================================
        console.log('\n📋 4. Creando Plantilla de Liquidación para ISI...');
        const [existingTemplate] = await sequelize.query(`
            SELECT id FROM payroll_templates WHERE company_id = ${ISI_COMPANY_ID} LIMIT 1
        `);

        let templateId;
        if (existingTemplate.length === 0) {
            const [newTemplate] = await sequelize.query(`
                INSERT INTO payroll_templates (
                    template_code, template_name, company_id, country_id, labor_agreement_id,
                    pay_frequency, description, work_hours_per_day, work_days_per_week,
                    is_active, created_at
                ) VALUES (
                    'LIQ-ISI-2025', 'Liquidación Mensual ISI', ${ISI_COMPANY_ID}, ${countryId}, ${v2AgreementId},
                    'monthly', 'Plantilla de liquidación mensual para empleados de ISI Tecnología', 8, 5,
                    true, NOW()
                )
                RETURNING id
            `);
            templateId = newTemplate[0].id;
            console.log('   ✅ Plantilla creada: Liquidación Mensual ISI (ID: ' + templateId + ')');
        } else {
            templateId = existingTemplate[0].id;
            console.log('   ⚠️ Plantilla ya existe (ID: ' + templateId + ')');
        }

        // ====================================================================
        // 5. ASIGNAR CONFIGURACIÓN SALARIAL A USUARIOS (usa catalogAgreementId)
        // ====================================================================
        console.log('\n📋 5. Asignando Salarios a Usuarios de ISI...');
        const [users] = await sequelize.query(`
            SELECT user_id, "firstName", "lastName" FROM users WHERE company_id = ${ISI_COMPANY_ID}
        `);

        console.log('   Usuarios encontrados: ' + users.length);

        const assignedCount = { created: 0, existing: 0 };

        for (let i = 0; i < users.length; i++) {
            const user = users[i];

            // Asignar categoría según posición
            let catCode;
            if (i === 0) catCode = 'TEC-TL';
            else if (i === 1) catCode = 'TEC-SR';
            else if (i < 4) catCode = 'TEC-SSR';
            else if (i < 7) catCode = 'TEC-JR';
            else if (i === users.length - 1) catCode = 'TEC-GER';
            else catCode = 'TEC-ADM';

            const catId = categoryIds[catCode];
            if (!catId) {
                console.log('   ⚠️ Categoría no encontrada: ' + catCode);
                continue;
            }

            const [catInfo] = await sequelize.query(`SELECT base_salary_reference FROM salary_categories WHERE id = ${catId}`);
            const baseSalary = parseFloat(catInfo[0]?.base_salary_reference) || 800000;

            // Verificar si ya tiene config
            const [existingConfig] = await sequelize.query(`
                SELECT id FROM user_salary_config_v2 WHERE user_id = '${user.user_id}' AND is_current = true LIMIT 1
            `);

            if (existingConfig.length === 0) {
                const hourlyRate = Math.round(baseSalary / 200);
                await sequelize.query(`
                    INSERT INTO user_salary_config_v2 (
                        user_id, company_id, salary_category_id, labor_agreement_id,
                        payment_type, base_salary, gross_salary, hourly_rate, overtime_rate_50, overtime_rate_100,
                        is_current, effective_from, created_at
                    ) VALUES (
                        '${user.user_id}', ${ISI_COMPANY_ID}, ${catId}, ${catalogAgreementId},
                        'monthly', ${baseSalary}, ${baseSalary}, ${hourlyRate}, ${Math.round(hourlyRate * 1.5)}, ${hourlyRate * 2},
                        true, CURRENT_DATE, NOW()
                    )
                `);
                console.log('   ✅ ' + (user.firstName || 'Usuario') + ' ' + (user.lastName || i) + ' → ' + catCode + ' ($' + baseSalary.toLocaleString() + ')');
                assignedCount.created++;
            } else {
                console.log('   ⚠️ ' + (user.firstName || 'Usuario') + ' ya tiene config salarial');
                assignedCount.existing++;
            }
        }

        // ====================================================================
        // 6. CREAR LIQUIDACIÓN DE EJEMPLO
        // ====================================================================
        console.log('\n📋 6. Creando Liquidación de Ejemplo...');
        const [existingRun] = await sequelize.query(`
            SELECT id FROM payroll_runs WHERE company_id = ${ISI_COMPANY_ID} LIMIT 1
        `);

        if (existingRun.length === 0) {
            const now = new Date();
            const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            // Calcular totales
            const [totals] = await sequelize.query(`
                SELECT COUNT(*) as employees, COALESCE(SUM(base_salary::numeric), 0) as total_gross
                FROM user_salary_config_v2
                WHERE company_id = ${ISI_COMPANY_ID} AND is_current = true
            `);

            const totalEmployees = parseInt(totals[0].employees) || 0;
            const totalGross = parseFloat(totals[0].total_gross) || 0;
            const totalDeductions = Math.round(totalGross * 0.17);
            const totalNet = totalGross - totalDeductions;
            const totalEmployerCost = Math.round(totalGross * 1.23);

            await sequelize.query(`
                INSERT INTO payroll_runs (
                    company_id, run_code, run_name, period_year, period_month,
                    period_start, period_end, payment_date,
                    total_employees, total_gross, total_deductions, total_net, total_employer_cost,
                    status, created_at
                ) VALUES (
                    ${ISI_COMPANY_ID}, 'RUN-ISI-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}',
                    'Liquidación Noviembre 2025',
                    ${now.getFullYear()}, ${now.getMonth() + 1},
                    '${periodStart.toISOString().split('T')[0]}', '${periodEnd.toISOString().split('T')[0]}',
                    '${new Date(now.getFullYear(), now.getMonth() + 1, 5).toISOString().split('T')[0]}',
                    ${totalEmployees}, ${totalGross}, ${totalDeductions}, ${totalNet}, ${totalEmployerCost},
                    'draft', NOW()
                )
            `);
            console.log('   ✅ Liquidación creada: Noviembre 2025');
            console.log('      - Empleados: ' + totalEmployees);
            console.log('      - Total Bruto: $' + totalGross.toLocaleString());
            console.log('      - Deducciones (17%): $' + totalDeductions.toLocaleString());
            console.log('      - Total Neto: $' + totalNet.toLocaleString());
            console.log('      - Costo Empleador: $' + totalEmployerCost.toLocaleString());
        } else {
            console.log('   ⚠️ Ya existe liquidación para ISI');
        }

        // ====================================================================
        // RESUMEN FINAL
        // ====================================================================
        console.log('\n═══════════════════════════════════════════════════════════════════════');
        console.log('                            RESUMEN');
        console.log('═══════════════════════════════════════════════════════════════════════');
        console.log('   🏢 Empresa: ISI (ID: 11)');
        console.log('   📄 Convenio Catálogo: CCT Tecnología (ID: ' + catalogAgreementId + ')');
        console.log('   📄 Convenio V2: CCT ISI (ID: ' + v2AgreementId + ')');
        console.log('   📊 Categorías: ' + Object.keys(categoryIds).length);
        console.log('   📋 Plantilla: Liquidación Mensual ISI (ID: ' + templateId + ')');
        console.log('   👥 Usuarios: ' + assignedCount.created + ' configurados, ' + assignedCount.existing + ' ya existían');
        console.log('═══════════════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
}

seedPayrollISI();
