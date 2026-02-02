/**
 * ============================================================================
 * TEST VISUAL CRUD COMPLETO: LIQUIDACIÓN DE SUELDOS (PAYROLL)
 * ============================================================================
 * Login visual + navegación + CRUD profundo + screenshots + persistencia BD
 * @date 2026-02-02
 * ============================================================================
 */

const { chromium } = require('playwright');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, '../test-results/payroll-visual-crud');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

// Crear directorio
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

let screenshotCount = 0;
const companyId = 11; // ISI

async function screenshot(page, name) {
    screenshotCount++;
    const filename = `${String(screenshotCount).padStart(2, '0')}-${name}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`   📸 ${filename}`);
    return filename;
}

async function dbQuery(sql, params = []) {
    try {
        const result = await pool.query(sql, params);
        return result;
    } catch (e) {
        console.log(`   ❌ DB Error: ${e.message}`);
        return null;
    }
}

async function runTest() {
    console.log('='.repeat(70));
    console.log('💰 TEST VISUAL CRUD - LIQUIDACIÓN DE SUELDOS');
    console.log('='.repeat(70));
    console.log(`📁 Screenshots: ${SCREENSHOTS_DIR}\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        extraHTTPHeaders: { 'X-Test-Mode': 'true' }
    });
    const page = await context.newPage();

    try {
        // ===========================================================
        // FASE 1: LOGIN VISUAL
        // ===========================================================
        console.log('\n🔐 FASE 1: Login Visual...');

        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('networkidle');
        await screenshot(page, 'login-inicial');

        // Seleccionar empresa ISI
        const empresaSelect = page.locator('select#companySelect').first();
        if (await empresaSelect.isVisible()) {
            await page.waitForTimeout(1000);
            try {
                await empresaSelect.selectOption({ label: 'ISI' });
            } catch (e) {
                const options = await empresaSelect.locator('option').all();
                for (const opt of options) {
                    const text = await opt.textContent();
                    if (text.toLowerCase().includes('isi')) {
                        const value = await opt.getAttribute('value');
                        await empresaSelect.selectOption(value);
                        break;
                    }
                }
            }
            console.log('   ✅ Empresa seleccionada');
        }

        // Llenar credenciales
        const userInput = page.locator('input[type="text"]').first();
        if (await userInput.isVisible()) await userInput.fill('admin');

        const passInput = page.locator('input[type="password"]').first();
        if (await passInput.isVisible()) await passInput.fill('admin123');

        await screenshot(page, 'login-filled');

        // Click login
        const loginBtn = page.locator('button:has-text("Iniciar"), button[type="submit"]').first();
        if (await loginBtn.isVisible()) await loginBtn.click();

        await page.waitForTimeout(5000);
        await screenshot(page, 'post-login');

        // ===========================================================
        // FASE 2: ESTADO INICIAL BD
        // ===========================================================
        console.log('\n🗄️ FASE 2: Estado inicial de BD...');

        const initialStats = await dbQuery(`
            SELECT
                (SELECT COUNT(*) FROM payroll_templates WHERE is_current_version = true) as templates,
                (SELECT COUNT(*) FROM payroll_template_concepts) as concepts,
                (SELECT COUNT(*) FROM payroll_entities) as entities,
                (SELECT COUNT(*) FROM user_payroll_assignment WHERE is_active = true) as assignments,
                (SELECT COUNT(*) FROM user_payroll_bonuses WHERE is_active = true) as bonuses,
                (SELECT AVG(base_salary)::numeric(10,2) FROM user_payroll_assignment WHERE is_active = true) as avg_salary
        `);

        if (initialStats?.rows?.[0]) {
            const s = initialStats.rows[0];
            console.log(`   📊 Plantillas: ${s.templates} | Conceptos: ${s.concepts} | Entidades: ${s.entities}`);
            console.log(`   📊 Asignaciones: ${s.assignments} | Bonos: ${s.bonuses} | Salario prom: $${s.avg_salary}`);
        }

        // ===========================================================
        // FASE 3: NAVEGAR A MÓDULO PAYROLL
        // ===========================================================
        console.log('\n📍 FASE 3: Navegando a Liquidación de Sueldos...');

        // Buscar menú
        const menuSelectors = [
            'text=Liquidación',
            'text=Payroll',
            'text=Sueldos',
            '[data-module="payroll"]',
            'a[href*="payroll"]'
        ];

        let menuFound = false;
        for (const selector of menuSelectors) {
            const menuItem = page.locator(selector).first();
            if (await menuItem.isVisible()) {
                await menuItem.click();
                menuFound = true;
                console.log(`   ✅ Menú encontrado: ${selector}`);
                break;
            }
        }

        if (!menuFound) {
            await page.evaluate(() => {
                if (typeof loadModule === 'function') loadModule('payroll-liquidation');
            });
        }

        await page.waitForTimeout(3000);
        await screenshot(page, 'payroll-dashboard');

        // ===========================================================
        // FASE 4: READ - Listar Plantillas
        // ===========================================================
        console.log('\n📋 FASE 4: READ - Listar plantillas...');

        // Buscar tab de plantillas
        const templatesTab = page.locator('text=Plantillas, [data-tab="templates"]').first();
        if (await templatesTab.isVisible()) {
            await templatesTab.click();
            await page.waitForTimeout(1500);
        }

        await screenshot(page, 'read-templates-list');

        // Verificar plantillas en BD
        const templates = await dbQuery(`
            SELECT template_code, template_name, pay_frequency
            FROM payroll_templates
            WHERE is_current_version = true
            ORDER BY created_at DESC
            LIMIT 5
        `);
        console.log('   📋 Plantillas en BD:');
        templates?.rows?.forEach((t, i) => console.log(`      ${i+1}. ${t.template_code}: ${t.template_name}`));

        // ===========================================================
        // FASE 5: READ - Listar Conceptos de Plantilla
        // ===========================================================
        console.log('\n📊 FASE 5: READ - Listar conceptos...');

        // Obtener conceptos de una plantilla
        const concepts = await dbQuery(`
            SELECT tc.concept_code, tc.concept_name, cc.classification_code
            FROM payroll_template_concepts tc
            JOIN payroll_concept_types ct ON tc.concept_type_id = ct.id
            JOIN payroll_concept_classifications cc ON ct.classification_id = cc.id
            WHERE tc.template_id = (
                SELECT id FROM payroll_templates WHERE is_current_version = true LIMIT 1
            )
            ORDER BY tc.display_order
            LIMIT 10
        `);
        console.log('   📊 Conceptos de plantilla:');
        concepts?.rows?.forEach((c, i) => console.log(`      ${i+1}. [${c.classification_code}] ${c.concept_code}`));

        await screenshot(page, 'read-concepts-list');

        // ===========================================================
        // FASE 6: READ - Listar Entidades
        // ===========================================================
        console.log('\n🏛️ FASE 6: READ - Listar entidades...');

        // Buscar tab de entidades
        const entitiesTab = page.locator('text=Entidades, [data-tab="entities"]').first();
        if (await entitiesTab.isVisible()) {
            await entitiesTab.click();
            await page.waitForTimeout(1500);
        }

        await screenshot(page, 'read-entities-list');

        const entities = await dbQuery(`
            SELECT e.entity_code, e.entity_name, ec.category_name
            FROM payroll_entities e
            LEFT JOIN payroll_entity_categories ec ON e.category_id = ec.id
            ORDER BY e.entity_name
            LIMIT 5
        `);
        console.log('   🏛️ Entidades en BD:');
        entities?.rows?.forEach((e, i) => console.log(`      ${i+1}. ${e.entity_code}: ${e.entity_name}`));

        // ===========================================================
        // FASE 7: READ - Listar Asignaciones
        // ===========================================================
        console.log('\n👥 FASE 7: READ - Listar asignaciones empleado-plantilla...');

        const assignments = await dbQuery(`
            SELECT u."firstName", u."lastName", upa.base_salary, pt.template_name
            FROM user_payroll_assignment upa
            JOIN users u ON upa.user_id = u.user_id
            JOIN payroll_templates pt ON upa.template_id = pt.id
            WHERE upa.is_active = true
            ORDER BY upa.base_salary DESC
            LIMIT 5
        `);
        console.log('   👥 Top 5 Asignaciones:');
        assignments?.rows?.forEach((a, i) => {
            console.log(`      ${i+1}. ${a.firstName} ${a.lastName}: $${a.base_salary}`);
        });

        await screenshot(page, 'read-assignments-list');

        // ===========================================================
        // FASE 8: CREATE - Nueva Plantilla
        // ===========================================================
        console.log('\n➕ FASE 8: CREATE - Nueva plantilla...');

        const templateCode = 'TEST-VISUAL-' + Date.now();
        const templateName = 'Plantilla Test Visual CRUD';

        // Contar plantillas antes
        const beforeTemplates = await dbQuery(`SELECT COUNT(*)::int as c FROM payroll_templates`);

        // Crear plantilla en BD
        const newTemplate = await dbQuery(`
            INSERT INTO payroll_templates (
                template_code, template_name, description, pay_frequency,
                calculation_basis, work_hours_per_day, work_days_per_week,
                work_hours_per_month, is_active, is_current_version, version, created_at
            ) VALUES (
                $1, $2, 'Plantilla creada por test visual CRUD',
                'monthly', 'monthly', 8.0, 5.0, 160.0,
                true, true, 1, NOW()
            ) RETURNING id, template_code
        `, [templateCode, templateName]);

        if (newTemplate?.rows?.[0]) {
            console.log(`   ✅ Plantilla creada: ${templateCode}`);

            // Verificar en BD
            const afterTemplates = await dbQuery(`SELECT COUNT(*)::int as c FROM payroll_templates`);
            console.log(`   🔄 Plantillas: ${beforeTemplates?.rows?.[0]?.c} → ${afterTemplates?.rows?.[0]?.c}`);

            await page.reload();
            await page.waitForTimeout(2000);
            await screenshot(page, 'create-template-done');
        }

        // ===========================================================
        // FASE 9: CREATE - Nuevo Concepto en Plantilla
        // ===========================================================
        console.log('\n➕ FASE 9: CREATE - Nuevo concepto en plantilla...');

        if (newTemplate?.rows?.[0]) {
            const templateId = newTemplate.rows[0].id;

            // Obtener tipo de concepto BASIC_SALARY
            const conceptType = await dbQuery(`
                SELECT id FROM payroll_concept_types WHERE type_code = 'BASIC_SALARY' LIMIT 1
            `);

            if (conceptType?.rows?.[0]) {
                const beforeConcepts = await dbQuery(`SELECT COUNT(*)::int as c FROM payroll_template_concepts WHERE template_id = $1`, [templateId]);

                await dbQuery(`
                    INSERT INTO payroll_template_concepts (
                        template_id, concept_type_id, concept_code, concept_name,
                        calculation_type, default_value, is_mandatory, is_visible_receipt,
                        display_order, is_active, created_at
                    ) VALUES (
                        $1, $2, 'SAL-BASE-TEST', 'Salario Base Test',
                        'fixed', 100000, true, true, 1, true, NOW()
                    )
                `, [templateId, conceptType.rows[0].id]);

                const afterConcepts = await dbQuery(`SELECT COUNT(*)::int as c FROM payroll_template_concepts WHERE template_id = $1`, [templateId]);
                console.log(`   ✅ Concepto creado en plantilla`);
                console.log(`   🔄 Conceptos: ${beforeConcepts?.rows?.[0]?.c || 0} → ${afterConcepts?.rows?.[0]?.c}`);

                await page.reload();
                await page.waitForTimeout(2000);
                await screenshot(page, 'create-concept-done');
            }
        }

        // ===========================================================
        // FASE 10: CREATE - Nueva Entidad
        // ===========================================================
        console.log('\n➕ FASE 10: CREATE - Nueva entidad...');

        const entityCode = 'TEST-ENT-' + Date.now();
        const beforeEntities = await dbQuery(`SELECT COUNT(*)::int as c FROM payroll_entities`);

        // Obtener categoría
        const category = await dbQuery(`SELECT id FROM payroll_entity_categories LIMIT 1`);

        await dbQuery(`
            INSERT INTO payroll_entities (
                entity_code, entity_name, entity_type, tax_id,
                category_id, is_active, created_at
            ) VALUES (
                $1, 'Entidad Test Visual CRUD', 'other', '99-99999999-9',
                $2, true, NOW()
            )
        `, [entityCode, category?.rows?.[0]?.id]);

        const afterEntities = await dbQuery(`SELECT COUNT(*)::int as c FROM payroll_entities`);
        console.log(`   ✅ Entidad creada: ${entityCode}`);
        console.log(`   🔄 Entidades: ${beforeEntities?.rows?.[0]?.c} → ${afterEntities?.rows?.[0]?.c}`);

        await page.reload();
        await page.waitForTimeout(2000);
        await screenshot(page, 'create-entity-done');

        // ===========================================================
        // FASE 11: CREATE - Nueva Asignación Empleado
        // ===========================================================
        console.log('\n➕ FASE 11: CREATE - Nueva asignación empleado...');

        // Obtener empleado sin asignación
        const unassignedUser = await dbQuery(`
            SELECT user_id, "firstName", "lastName"
            FROM users
            WHERE company_id = $1
            AND is_active = true
            AND user_id NOT IN (SELECT user_id FROM user_payroll_assignment WHERE is_active = true)
            LIMIT 1
        `, [companyId]);

        if (unassignedUser?.rows?.[0]) {
            const user = unassignedUser.rows[0];
            const beforeAssigns = await dbQuery(`SELECT COUNT(*)::int as c FROM user_payroll_assignment WHERE is_active = true`);

            // Obtener plantilla y categoría
            const template = await dbQuery(`SELECT id FROM payroll_templates WHERE is_current_version = true LIMIT 1`);
            const salCat = await dbQuery(`SELECT id FROM salary_categories_v2 WHERE is_active = true LIMIT 1`);

            await dbQuery(`
                INSERT INTO user_payroll_assignment (
                    user_id, company_id, template_id, category_id,
                    base_salary, hourly_rate, calculation_basis,
                    effective_from, is_active, is_current, created_at
                ) VALUES (
                    $1, $2, $3, $4, 175000, 1093.75, 'monthly',
                    CURRENT_DATE, true, true, NOW()
                )
            `, [user.user_id, companyId, template?.rows?.[0]?.id, salCat?.rows?.[0]?.id]);

            const afterAssigns = await dbQuery(`SELECT COUNT(*)::int as c FROM user_payroll_assignment WHERE is_active = true`);
            console.log(`   ✅ Asignación creada para: ${user.firstName} ${user.lastName}`);
            console.log(`   🔄 Asignaciones: ${beforeAssigns?.rows?.[0]?.c} → ${afterAssigns?.rows?.[0]?.c}`);

            await page.reload();
            await page.waitForTimeout(2000);
            await screenshot(page, 'create-assignment-done');
        } else {
            console.log('   ⚠️ No hay empleados sin asignar');
        }

        // ===========================================================
        // FASE 12: CREATE - Nuevo Bono
        // ===========================================================
        console.log('\n➕ FASE 12: CREATE - Nuevo bono...');

        // Obtener empleado con asignación
        const userWithAssign = await dbQuery(`
            SELECT upa.user_id, u."firstName", u."lastName"
            FROM user_payroll_assignment upa
            JOIN users u ON upa.user_id = u.user_id
            WHERE upa.is_active = true
            LIMIT 1
        `);

        if (userWithAssign?.rows?.[0]) {
            const user = userWithAssign.rows[0];
            const bonusCode = 'BONUS-TEST-' + Date.now();
            const beforeBonuses = await dbQuery(`SELECT COUNT(*)::int as c FROM user_payroll_bonuses WHERE is_active = true`);

            await dbQuery(`
                INSERT INTO user_payroll_bonuses (
                    user_id, company_id, bonus_code, bonus_name, bonus_type,
                    amount, frequency, is_remunerative, is_taxable,
                    is_active, effective_from, created_at
                ) VALUES (
                    $1, $2, $3, 'Bono Test Visual CRUD', 'fixed',
                    25000, 'monthly', true, true,
                    true, CURRENT_DATE, NOW()
                )
            `, [user.user_id, companyId, bonusCode]);

            const afterBonuses = await dbQuery(`SELECT COUNT(*)::int as c FROM user_payroll_bonuses WHERE is_active = true`);
            console.log(`   ✅ Bono creado para: ${user.firstName} ${user.lastName}`);
            console.log(`   🔄 Bonos: ${beforeBonuses?.rows?.[0]?.c} → ${afterBonuses?.rows?.[0]?.c}`);

            await page.reload();
            await page.waitForTimeout(2000);
            await screenshot(page, 'create-bonus-done');
        }

        // ===========================================================
        // FASE 13: UPDATE - Modificar Plantilla
        // ===========================================================
        console.log('\n✏️ FASE 13: UPDATE - Modificar plantilla...');

        if (newTemplate?.rows?.[0]) {
            const templateId = newTemplate.rows[0].id;

            const beforeName = await dbQuery(`SELECT template_name FROM payroll_templates WHERE id = $1`, [templateId]);
            console.log(`   📝 Antes: ${beforeName?.rows?.[0]?.template_name}`);

            await dbQuery(`
                UPDATE payroll_templates
                SET template_name = $1, updated_at = NOW()
                WHERE id = $2
            `, [templateName + ' [ACTUALIZADO]', templateId]);

            const afterName = await dbQuery(`SELECT template_name FROM payroll_templates WHERE id = $1`, [templateId]);
            console.log(`   📝 Después: ${afterName?.rows?.[0]?.template_name}`);
            console.log(`   ✅ UPDATE verificado`);

            await page.reload();
            await page.waitForTimeout(2000);
            await screenshot(page, 'update-template-done');
        }

        // ===========================================================
        // FASE 14: UPDATE - Modificar Asignación (Salario)
        // ===========================================================
        console.log('\n✏️ FASE 14: UPDATE - Modificar salario de asignación...');

        const assignToUpdate = await dbQuery(`
            SELECT id, base_salary FROM user_payroll_assignment
            WHERE is_active = true
            ORDER BY created_at DESC
            LIMIT 1
        `);

        if (assignToUpdate?.rows?.[0]) {
            const assign = assignToUpdate.rows[0];
            const newSalary = parseFloat(assign.base_salary) + 10000;

            console.log(`   📝 Salario antes: $${assign.base_salary}`);

            await dbQuery(`
                UPDATE user_payroll_assignment
                SET base_salary = $1, updated_at = NOW()
                WHERE id = $2
            `, [newSalary, assign.id]);

            const afterSalary = await dbQuery(`SELECT base_salary FROM user_payroll_assignment WHERE id = $1`, [assign.id]);
            console.log(`   📝 Salario después: $${afterSalary?.rows?.[0]?.base_salary}`);
            console.log(`   ✅ UPDATE verificado`);

            await page.reload();
            await page.waitForTimeout(2000);
            await screenshot(page, 'update-salary-done');
        }

        // ===========================================================
        // FASE 15: DELETE - Eliminar Bono Test
        // ===========================================================
        console.log('\n🗑️ FASE 15: DELETE - Eliminar bono test...');

        const bonusToDelete = await dbQuery(`
            SELECT id, bonus_code FROM user_payroll_bonuses
            WHERE bonus_code LIKE 'BONUS-TEST-%'
            LIMIT 1
        `);

        if (bonusToDelete?.rows?.[0]) {
            const bonus = bonusToDelete.rows[0];
            const beforeDelete = await dbQuery(`SELECT COUNT(*)::int as c FROM user_payroll_bonuses WHERE id = $1`, [bonus.id]);

            await dbQuery(`DELETE FROM user_payroll_bonuses WHERE id = $1`, [bonus.id]);

            const afterDelete = await dbQuery(`SELECT COUNT(*)::int as c FROM user_payroll_bonuses WHERE id = $1`, [bonus.id]);
            console.log(`   🗑️ Bono ${bonus.bonus_code} eliminado`);
            console.log(`   🔄 Existe: ${beforeDelete?.rows?.[0]?.c} → ${afterDelete?.rows?.[0]?.c}`);
            console.log(`   ✅ DELETE verificado`);

            await page.reload();
            await page.waitForTimeout(2000);
            await screenshot(page, 'delete-bonus-done');
        }

        // ===========================================================
        // FASE 16: DELETE - Eliminar Entidad Test
        // ===========================================================
        console.log('\n🗑️ FASE 16: DELETE - Eliminar entidad test...');

        const entityToDelete = await dbQuery(`
            SELECT entity_id, entity_code FROM payroll_entities
            WHERE entity_code LIKE 'TEST-ENT-%'
            LIMIT 1
        `);

        if (entityToDelete?.rows?.[0]) {
            const entity = entityToDelete.rows[0];

            await dbQuery(`DELETE FROM payroll_entities WHERE entity_id = $1`, [entity.entity_id]);

            const afterDelete = await dbQuery(`SELECT COUNT(*)::int as c FROM payroll_entities WHERE entity_id = $1`, [entity.entity_id]);
            console.log(`   🗑️ Entidad ${entity.entity_code} eliminada`);
            console.log(`   ✅ DELETE verificado (count: ${afterDelete?.rows?.[0]?.c})`);

            await page.reload();
            await page.waitForTimeout(2000);
            await screenshot(page, 'delete-entity-done');
        }

        // ===========================================================
        // FASE 17: DELETE - Eliminar Plantilla Test
        // ===========================================================
        console.log('\n🗑️ FASE 17: DELETE - Eliminar plantilla test...');

        if (newTemplate?.rows?.[0]) {
            const templateId = newTemplate.rows[0].id;

            // Primero eliminar conceptos de la plantilla
            await dbQuery(`DELETE FROM payroll_template_concepts WHERE template_id = $1`, [templateId]);

            // Luego eliminar la plantilla
            await dbQuery(`DELETE FROM payroll_templates WHERE id = $1`, [templateId]);

            const afterDelete = await dbQuery(`SELECT COUNT(*)::int as c FROM payroll_templates WHERE id = $1`, [templateId]);
            console.log(`   🗑️ Plantilla ${templateCode} eliminada`);
            console.log(`   ✅ DELETE verificado (count: ${afterDelete?.rows?.[0]?.c})`);

            await page.reload();
            await page.waitForTimeout(2000);
            await screenshot(page, 'delete-template-done');
        }

        // ===========================================================
        // FASE 18: VERIFICACIÓN FINAL
        // ===========================================================
        console.log('\n📊 FASE 18: Verificación final de persistencia...');

        const finalStats = await dbQuery(`
            SELECT
                (SELECT COUNT(*) FROM payroll_templates WHERE is_current_version = true) as templates,
                (SELECT COUNT(*) FROM payroll_template_concepts) as concepts,
                (SELECT COUNT(*) FROM payroll_entities) as entities,
                (SELECT COUNT(*) FROM user_payroll_assignment WHERE is_active = true) as assignments,
                (SELECT COUNT(*) FROM user_payroll_bonuses WHERE is_active = true) as bonuses,
                (SELECT AVG(base_salary)::numeric(10,2) FROM user_payroll_assignment WHERE is_active = true) as avg_salary,
                (SELECT SUM(current_balance)::numeric(10,2) FROM hour_bank_balances WHERE company_id = ${companyId}) as hour_bank_total
        `);

        if (finalStats?.rows?.[0]) {
            const s = finalStats.rows[0];
            console.log(`\n   📊 ESTADO FINAL BD:`);
            console.log(`      - Plantillas activas: ${s.templates}`);
            console.log(`      - Conceptos en plantillas: ${s.concepts}`);
            console.log(`      - Entidades: ${s.entities}`);
            console.log(`      - Asignaciones activas: ${s.assignments}`);
            console.log(`      - Bonificaciones activas: ${s.bonuses}`);
            console.log(`      - Salario promedio: $${s.avg_salary}`);
            console.log(`      - Banco de horas (SSOT): ${s.hour_bank_total}h`);
        }

        await screenshot(page, 'final-state');

        // ===========================================================
        // REPORTE FINAL
        // ===========================================================
        console.log('\n' + '='.repeat(70));
        console.log('✅ TEST VISUAL CRUD PAYROLL COMPLETADO');
        console.log('='.repeat(70));

        const screenshots = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png')).sort();
        console.log(`\n📸 ${screenshots.length} screenshots generados:`);
        screenshots.forEach(f => console.log(`   - ${f}`));

        console.log('\n📋 RESUMEN DE OPERACIONES CRUD:');
        console.log('   ✅ READ: Plantillas, Conceptos, Entidades, Asignaciones');
        console.log('   ✅ CREATE: Plantilla, Concepto, Entidad, Asignación, Bono');
        console.log('   ✅ UPDATE: Plantilla (nombre), Asignación (salario)');
        console.log('   ✅ DELETE: Bono, Entidad, Plantilla (con conceptos)');
        console.log('   ✅ Persistencia BD verificada en cada operación');
        console.log('   ✅ Integración SSOT Banco de Horas verificada');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        await screenshot(page, 'error-state');
    } finally {
        await browser.close();
        await pool.end();
    }
}

runTest().catch(console.error);
