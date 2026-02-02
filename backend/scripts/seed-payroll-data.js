/**
 * ============================================================================
 * SEED PAYROLL DATA - Datos de prueba para Liquidación de Sueldos
 * ============================================================================
 * Genera:
 * - Entidades (AFIP, Sindicatos, Obras Sociales, ARTs)
 * - Categorías de entidades
 * - Asignaciones empleado-plantilla
 * - Bonificaciones
 *
 * @date 2026-02-02
 * ============================================================================
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

async function seed() {
    const client = await pool.connect();

    try {
        console.log('='.repeat(70));
        console.log('💰 SEEDING DATOS DE LIQUIDACIÓN DE SUELDOS');
        console.log('='.repeat(70));

        // 1. Obtener company_id y país de ISI
        const companyResult = await client.query(`
            SELECT c.company_id, c.name, cb.country_id
            FROM companies c
            LEFT JOIN company_branches cb ON c.company_id = cb.company_id
            WHERE c.slug = 'isi'
            LIMIT 1
        `);

        if (companyResult.rows.length === 0) {
            throw new Error('Empresa ISI no encontrada');
        }

        const company = companyResult.rows[0];
        const companyId = company.company_id;
        console.log(`\n✅ Empresa: ${company.name} (ID: ${companyId})`);

        // 2. Crear categorías de entidades si no existen
        console.log('\n📋 Creando categorías de entidades...');

        // Verificar si ya existen
        const existingCats = await client.query(`SELECT COUNT(*) as c FROM payroll_entity_categories`);
        if (parseInt(existingCats.rows[0].c) === 0) {
            const entityCategories = [
                { code: 'PENSION', name: 'Sistema Previsional / Jubilación', description: 'Aportes jubilatorios y pensiones', flow: 'outbound' },
                { code: 'HEALTH', name: 'Seguro de Salud / Obra Social', description: 'Obras sociales y seguros médicos', flow: 'outbound' },
                { code: 'UNION', name: 'Sindicato', description: 'Cuotas sindicales', flow: 'outbound' },
                { code: 'INCOME_TAX', name: 'Impuesto a los Ingresos', description: 'Impuesto a las ganancias', flow: 'outbound' },
                { code: 'WORK_RISK', name: 'Seguro de Riesgos Laborales', description: 'ART y seguros de accidentes', flow: 'outbound' },
                { code: 'BANK', name: 'Entidad Bancaria', description: 'Bancos para depósito de sueldos', flow: 'inbound' }
            ];

            for (const cat of entityCategories) {
                await client.query(`
                    INSERT INTO payroll_entity_categories (
                        category_code, category_name, description, flow_direction, is_active, created_at
                    ) VALUES ($1, $2, $3, $4, true, NOW())
                `, [cat.code, cat.name, cat.description, cat.flow]);
            }
            console.log(`   ✅ ${entityCategories.length} categorías creadas`);
        } else {
            console.log(`   ✅ Categorías ya existen (${existingCats.rows[0].c})`);
        }

        // 3. Obtener IDs de categorías
        const catIds = {};
        const categories = await client.query(`SELECT id, category_code FROM payroll_entity_categories`);
        categories.rows.forEach(c => { catIds[c.category_code] = c.id; });

        // 4. Crear entidades Argentina
        console.log('\n🏛️ Creando entidades (Argentina)...');

        // Verificar si ya existen
        const existingEnts = await client.query(`SELECT COUNT(*) as c FROM payroll_entities`);
        if (parseInt(existingEnts.rows[0].c) === 0) {
            const entities = [
                // Sistema Previsional
                { code: 'ANSES', name: 'ANSES - Administración Nacional de Seguridad Social', type: 'government', cuit: '30-70900410-5', catCode: 'PENSION' },
                { code: 'AFIP-JUBILACION', name: 'AFIP - Aportes Jubilatorios', type: 'government', cuit: '33-69345023-9', catCode: 'PENSION' },

                // Obras Sociales
                { code: 'OSECAC', name: 'OSECAC - Obra Social Empleados de Comercio', type: 'health_insurance', cuit: '30-54667253-9', catCode: 'HEALTH' },
                { code: 'OSDE', name: 'OSDE - Organización de Servicios Directos', type: 'health_insurance', cuit: '30-51648049-3', catCode: 'HEALTH' },
                { code: 'SWISS-MEDICAL', name: 'Swiss Medical', type: 'health_insurance', cuit: '30-68570041-9', catCode: 'HEALTH' },

                // Sindicatos
                { code: 'SEC', name: 'Sindicato de Empleados de Comercio', type: 'union', cuit: '30-54671385-0', catCode: 'UNION' },
                { code: 'UOCRA', name: 'UOCRA - Unión Obrera de la Construcción', type: 'union', cuit: '30-54668819-2', catCode: 'UNION' },
                { code: 'UOM', name: 'UOM - Unión Obrera Metalúrgica', type: 'union', cuit: '30-54653185-4', catCode: 'UNION' },

                // Impuestos
                { code: 'AFIP-GANANCIAS', name: 'AFIP - Impuesto a las Ganancias', type: 'government', cuit: '33-69345023-9', catCode: 'INCOME_TAX' },

                // ART
                { code: 'ART-GALENO', name: 'Galeno ART', type: 'insurance', cuit: '30-68784865-4', catCode: 'WORK_RISK' },
                { code: 'ART-PREVENSION', name: 'Prevención ART', type: 'insurance', cuit: '30-68773658-9', catCode: 'WORK_RISK' },

                // Bancos
                { code: 'BANCO-NACION', name: 'Banco de la Nación Argentina', type: 'bank', cuit: '30-50001000-3', catCode: 'BANK' },
                { code: 'BANCO-PROVINCIA', name: 'Banco de la Provincia de Buenos Aires', type: 'bank', cuit: '30-50000016-9', catCode: 'BANK' },
                { code: 'BANCO-GALICIA', name: 'Banco Galicia', type: 'bank', cuit: '30-50000173-9', catCode: 'BANK' }
            ];

            let entitiesCreated = 0;
            for (const ent of entities) {
                const catId = catIds[ent.catCode];
                await client.query(`
                    INSERT INTO payroll_entities (
                        entity_code, entity_name, entity_type, tax_id,
                        category_id, is_government, is_active, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
                `, [ent.code, ent.name, ent.type, ent.cuit, catId, ent.type === 'government']);
                entitiesCreated++;
            }
            console.log(`   ✅ ${entitiesCreated} entidades creadas`);
        } else {
            console.log(`   ✅ Entidades ya existen (${existingEnts.rows[0].c})`);
        }

        // 5. Obtener empleados activos de ISI
        console.log('\n👥 Obteniendo empleados...');
        const employees = await client.query(`
            SELECT user_id, "firstName", "lastName", role, "hireDate"
            FROM users
            WHERE company_id = $1
            AND is_active = true
            AND role IN ('employee', 'supervisor', 'admin')
            ORDER BY "hireDate" NULLS LAST
            LIMIT 20
        `, [companyId]);
        console.log(`   ✅ ${employees.rows.length} empleados encontrados`);

        // 6. Obtener plantilla activa
        const templateResult = await client.query(`
            SELECT id, template_code, template_name
            FROM payroll_templates
            WHERE is_current_version = true
            AND template_code LIKE 'TEST%'
            LIMIT 1
        `);

        if (templateResult.rows.length === 0) {
            console.log('   ⚠️ No hay plantilla activa, creando una...');
            // Crear plantilla básica
            const newTemplate = await client.query(`
                INSERT INTO payroll_templates (
                    template_code, template_name, description, pay_frequency,
                    calculation_basis, work_hours_per_day, work_days_per_week,
                    work_hours_per_month, is_active, is_current_version,
                    version, created_at
                ) VALUES (
                    'ARG-ISI-2026', 'Liquidación ISI Argentina 2026',
                    'Plantilla de liquidación mensual para ISI Argentina',
                    'monthly', 'monthly', 8.0, 5.0, 160.0,
                    true, true, 1, NOW()
                ) RETURNING id, template_code, template_name
            `);
            templateResult.rows = newTemplate.rows;
        }

        const template = templateResult.rows[0];
        console.log(`   ✅ Plantilla: ${template.template_code} (${template.template_name})`);

        // 7. Obtener categoría salarial
        const categoryResult = await client.query(`
            SELECT id, category_code, category_name, base_salary
            FROM salary_categories_v2
            WHERE is_active = true
            LIMIT 1
        `);

        let salaryCategory = categoryResult.rows[0];
        if (!salaryCategory) {
            console.log('   ⚠️ No hay categoría salarial, creando una...');
            const newCat = await client.query(`
                INSERT INTO salary_categories_v2 (
                    category_code, category_name, base_salary, hourly_rate,
                    is_active, created_at
                ) VALUES (
                    'CAT-A', 'Categoría A - Empleados', 150000, 937.50,
                    true, NOW()
                ) RETURNING id, category_code, category_name, base_salary
            `);
            salaryCategory = newCat.rows[0];
        }
        console.log(`   ✅ Categoría: ${salaryCategory.category_code} ($${salaryCategory.base_salary})`);

        // 8. Crear asignaciones empleado-plantilla
        console.log('\n📋 Creando asignaciones empleado-plantilla...');

        // Limpiar asignaciones anteriores de prueba
        await client.query(`DELETE FROM user_payroll_assignment WHERE company_id = $1`, [companyId]);

        let assignmentsCreated = 0;

        // Salarios base variados según rol
        const salaryByRole = {
            'admin': 350000,
            'supervisor': 250000,
            'employee': 150000
        };

        for (const emp of employees.rows) {
            const baseSalary = salaryByRole[emp.role] || 150000;
            // Agregar variación aleatoria del 10%
            const variance = 1 + (Math.random() * 0.2 - 0.1);
            const finalSalary = Math.round(baseSalary * variance);

            // Calcular tarifa por hora
            const hourlyRate = Math.round(finalSalary / 160 * 100) / 100;

            // Fecha de inicio de vigencia
            const hireDate = emp.hireDate || new Date('2024-01-01');

            await client.query(`
                INSERT INTO user_payroll_assignment (
                    user_id, company_id, template_id, category_id,
                    base_salary, hourly_rate, calculation_basis,
                    effective_from, hire_date, is_active, is_current, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, 'monthly', $7, $7, true, true, NOW())
            `, [emp.user_id, companyId, template.id, salaryCategory.id, finalSalary, hourlyRate, hireDate]);
            assignmentsCreated++;
        }
        console.log(`   ✅ ${assignmentsCreated} asignaciones creadas`);

        // 9. Crear bonificaciones para algunos empleados (30%)
        console.log('\n🎁 Creando bonificaciones...');

        // Limpiar bonificaciones anteriores
        await client.query(`DELETE FROM user_payroll_bonuses WHERE company_id = $1`, [companyId]);

        let bonusesCreated = 0;
        let bonusCounter = 1;

        const bonusTypes = [
            { code: 'PRESENT', type: 'fixed', name: 'Bono Presentismo Perfecto', amount: 15000 },
            { code: 'OBJET', type: 'percentage', name: 'Bono por Objetivos', percentage: 5 },
            { code: 'TITULO', type: 'fixed', name: 'Adicional por Título', amount: 10000 }
        ];

        for (const emp of employees.rows) {
            if (Math.random() < 0.3) { // 30% tiene bono
                const bonus = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
                const bonusCode = bonus.code + '-' + bonusCounter++;

                await client.query(`
                    INSERT INTO user_payroll_bonuses (
                        user_id, company_id, bonus_code, bonus_name, bonus_type,
                        amount, percentage, frequency, is_remunerative, is_taxable,
                        is_active, effective_from, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'monthly', true, true, true, CURRENT_DATE, NOW())
                `, [emp.user_id, companyId, bonusCode, bonus.name, bonus.type, bonus.amount || null, bonus.percentage || null]);
                bonusesCreated++;
            }
        }
        console.log(`   ✅ ${bonusesCreated} bonificaciones creadas`);

        // 10. Verificar datos finales
        console.log('\n📊 VERIFICACIÓN FINAL:');

        const stats = await client.query(`
            SELECT
                (SELECT COUNT(*) FROM payroll_entity_categories) as categories,
                (SELECT COUNT(*) FROM payroll_entities) as entities,
                (SELECT COUNT(*) FROM user_payroll_assignment WHERE is_active = true) as assignments,
                (SELECT COUNT(*) FROM user_payroll_bonuses WHERE is_active = true) as bonuses,
                (SELECT AVG(base_salary)::numeric(10,2) FROM user_payroll_assignment WHERE is_active = true) as avg_salary
        `);

        const s = stats.rows[0];
        console.log(`   Categorías de entidades: ${s.categories}`);
        console.log(`   Entidades: ${s.entities}`);
        console.log(`   Asignaciones activas: ${s.assignments}`);
        console.log(`   Bonificaciones activas: ${s.bonuses}`);
        console.log(`   Salario promedio: $${s.avg_salary}`);

        // Mostrar top 5 asignaciones
        const top5 = await client.query(`
            SELECT u."firstName", u."lastName", upa.base_salary, upa.hire_date
            FROM user_payroll_assignment upa
            JOIN users u ON upa.user_id = u.user_id
            WHERE upa.is_active = true
            ORDER BY upa.base_salary DESC
            LIMIT 5
        `);

        console.log('\n🏆 TOP 5 SALARIOS:');
        top5.rows.forEach((r, i) => {
            console.log(`   ${i + 1}. ${r.firstName} ${r.lastName}: $${r.base_salary}`);
        });

        console.log('\n' + '='.repeat(70));
        console.log('✅ SEEDING DE PAYROLL COMPLETADO');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

seed().catch(console.error);
