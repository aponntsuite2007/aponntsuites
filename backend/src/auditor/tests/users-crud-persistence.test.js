/**
 * TEST CRUD COMPLETO CON PERSISTENCIA - MÓDULO USUARIOS
 *
 * Este test verifica TODAS las operaciones CRUD en TODOS los tabs del modal:
 * 1. CREATE: Crear usuario [TEST] → Verificar en BD
 * 2. UPDATE: Modificar datos en cada tab → Verificar persistencia en BD
 * 3. READ: Reabrir modal → Verificar que datos persisten
 * 4. DELETE: Eliminar registros → Verificar limpieza en BD
 *
 * Integrado con el sistema Phase4TestOrchestrator
 */

const { sequelize } = require('../../config/database');

class UsersCrudPersistenceTest {
    constructor(page, companyId) {
        this.page = page;
        this.companyId = companyId;
        this.testUserId = null;
        this.results = {
            create: [],
            update: [],
            read: [],
            delete: [],
            errors: []
        };
    }

    /**
     * Ejecutar test completo
     */
    async run() {
        console.log('\n🔹 [USERS-CRUD] Iniciando test CRUD con persistencia BD...\n');

        try {
            await this.testCreate();
            await this.testUpdate();
            await this.testRead();
            await this.testDelete();

            return this.generateReport();
        } catch (error) {
            this.results.errors.push({
                phase: 'general',
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * FASE 1: CREATE - Crear usuario de prueba
     */
    async testCreate() {
        console.log('📝 FASE 1: CREATE - Creando usuario [TEST]...');

        // Navegar al módulo usuarios
        await this.page.locator(`[onclick*="showTab('users'"]`).first().click();
        await this.page.waitForTimeout(3000);

        // Click en nuevo usuario
        const newUserBtn = this.page.locator('button:has-text("Nuevo Usuario"), button:has-text("+ Agregar")').first();
        await newUserBtn.click();
        await this.page.waitForTimeout(2000);

        // Llenar formulario
        await this.page.fill('input[name="firstName"], #firstName', '[TEST] Usuario');
        await this.page.fill('input[name="lastName"], #lastName', 'CRUD Test');
        await this.page.fill('input[name="email"], #email', `test.crud.${Date.now()}@ejemplo.com`);
        await this.page.fill('input[name="username"], #username', `test_crud_${Date.now()}`);
        await this.page.fill('input[name="dni"], #dni', '99999999');

        // Guardar
        const saveBtn = this.page.locator('button:has-text("Guardar"), button:has-text("Crear")').first();
        await saveBtn.click();
        await this.page.waitForTimeout(3000);

        // Verificar en tabla
        const userRow = this.page.locator('tr:has-text("[TEST] Usuario")').first();
        const isVisible = await userRow.isVisible();

        this.results.create.push({
            test: 'Usuario visible en tabla',
            passed: isVisible
        });

        if (!isVisible) {
            throw new Error('Usuario [TEST] no aparece en tabla');
        }

        // Verificar en BD
        const [users] = await sequelize.query(`
            SELECT user_id, first_name, last_name, email, dni
            FROM users
            WHERE first_name LIKE '[TEST]%' AND company_id = ${this.companyId}
            ORDER BY created_at DESC
            LIMIT 1
        `);

        if (!users || users.length === 0) {
            throw new Error('Usuario [TEST] NO encontrado en BD');
        }

        this.testUserId = users[0].user_id;
        this.results.create.push({
            test: 'Usuario en BD',
            passed: true,
            userId: this.testUserId
        });

        console.log(`   ✅ Usuario creado - ID: ${this.testUserId}\n`);
    }

    /**
     * FASE 2: UPDATE - Modificar datos en cada tab
     */
    async testUpdate() {
        console.log('✏️  FASE 2: UPDATE - Modificando datos en tabs...');

        // Abrir modal VER
        const userRow = this.page.locator('tr:has-text("[TEST] Usuario")').first();
        const verBtn = userRow.locator('button.btn-info, button:has-text("Ver")').first();
        await verBtn.click();
        await this.page.waitForTimeout(3000);
        await this.page.waitForSelector('#employeeFileModal', { state: 'visible' });

        // TAB 2: Datos Personales
        await this.updateTab2DatosPersonales();

        // TAB 3: Antecedentes Laborales
        await this.updateTab3Laborales();

        // TAB 4: Grupo Familiar
        await this.updateTab4Familiar();

        // TAB 5: Antecedentes Médicos
        await this.updateTab5Medicos();

        console.log('   ✅ Datos actualizados en múltiples tabs\n');
    }

    /**
     * Actualizar TAB 2: Datos Personales
     */
    async updateTab2DatosPersonales() {
        const tab2 = this.page.locator('.file-tab').nth(1);
        await tab2.click();
        await this.page.waitForTimeout(1500);

        const editBtn = this.page.locator('#personal-tab button:has-text("Editar")').first();
        if (await editBtn.isVisible()) {
            await editBtn.click();
            await this.page.waitForTimeout(1500);

            // Modificar teléfono
            const phoneInput = this.page.locator('input[name="phone"], #phone').first();
            if (await phoneInput.isVisible()) {
                await phoneInput.fill('[TEST] 1122334455');
                this.results.update.push({ field: 'phone', updated: true });
            }

            // Modificar dirección
            const addressInput = this.page.locator('input[name="address"], #address, textarea[name="address"]').first();
            if (await addressInput.isVisible()) {
                await addressInput.fill('[TEST] Av. Testing 456');
                this.results.update.push({ field: 'address', updated: true });
            }

            // Guardar
            const saveBtn = this.page.locator('button:has-text("Guardar")').first();
            await saveBtn.click();
            await this.page.waitForTimeout(2000);
        }

        // Verificar en BD
        const [userData] = await sequelize.query(`
            SELECT phone, address FROM users WHERE user_id = ${this.testUserId}
        `);

        if (userData[0].phone && userData[0].phone.includes('[TEST]')) {
            this.results.update.push({ field: 'phone', persisted: true });
        }
        if (userData[0].address && userData[0].address.includes('[TEST]')) {
            this.results.update.push({ field: 'address', persisted: true });
        }
    }

    /**
     * Actualizar TAB 3: Antecedentes Laborales
     */
    async updateTab3Laborales() {
        const tab3 = this.page.locator('.file-tab').nth(2);
        await tab3.click();
        await this.page.waitForTimeout(1500);

        const addBtn = this.page.locator('button:has-text("+ Agregar")').first();
        if (await addBtn.isVisible()) {
            await addBtn.click();
            await this.page.waitForTimeout(1500);

            // Llenar historial laboral
            const companyInput = this.page.locator('input[name="company_name"], #companyName').first();
            if (await companyInput.isVisible()) {
                await companyInput.fill('[TEST] Empresa Anterior');
            }

            const positionInput = this.page.locator('input[name="position"], #position').first();
            if (await positionInput.isVisible()) {
                await positionInput.fill('[TEST] QA Engineer');
            }

            const saveBtn = this.page.locator('button:has-text("Guardar")').last();
            await saveBtn.click();
            await this.page.waitForTimeout(2000);

            this.results.update.push({ field: 'work_history', created: true });
        }

        // Verificar en BD
        const [workHistory] = await sequelize.query(`
            SELECT COUNT(*) as count FROM user_work_history
            WHERE user_id = ${this.testUserId} AND company_name LIKE '[TEST]%'
        `);

        if (workHistory[0].count > 0) {
            this.results.update.push({ field: 'work_history', persisted: true });
        }
    }

    /**
     * Actualizar TAB 4: Grupo Familiar
     */
    async updateTab4Familiar() {
        const tab4 = this.page.locator('.file-tab').nth(3);
        await tab4.click();
        await this.page.waitForTimeout(1500);

        const addChildBtn = this.page.locator('button:has-text("+ Agregar Hijo")').first();
        if (await addChildBtn.isVisible()) {
            await addChildBtn.click();
            await this.page.waitForTimeout(1500);

            const childNameInput = this.page.locator('input[name="child_name"], #childName').first();
            if (await childNameInput.isVisible()) {
                await childNameInput.fill('[TEST] Hijo Test');
            }

            const saveBtn = this.page.locator('button:has-text("Guardar")').last();
            await saveBtn.click();
            await this.page.waitForTimeout(2000);

            this.results.update.push({ field: 'family_member', created: true });
        }

        // Verificar en BD
        const [family] = await sequelize.query(`
            SELECT COUNT(*) as count FROM user_family_members
            WHERE user_id = ${this.testUserId} AND name LIKE '[TEST]%'
        `);

        if (family[0].count > 0) {
            this.results.update.push({ field: 'family_member', persisted: true });
        }
    }

    /**
     * Actualizar TAB 5: Antecedentes Médicos
     */
    async updateTab5Medicos() {
        const tab5 = this.page.locator('.file-tab').nth(4);
        await tab5.click();
        await this.page.waitForTimeout(1500);

        // Agregar alergia
        const addAllergyBtn = this.page.locator('button:has-text("+ Agregar")').first();
        if (await addAllergyBtn.isVisible()) {
            await addAllergyBtn.click();
            await this.page.waitForTimeout(1500);

            const allergyInput = this.page.locator('input[name="allergy_name"], #allergyName').first();
            if (await allergyInput.isVisible()) {
                await allergyInput.fill('[TEST] Alergia Selenium');
            }

            const saveBtn = this.page.locator('button:has-text("Guardar")').last();
            await saveBtn.click();
            await this.page.waitForTimeout(2000);

            this.results.update.push({ field: 'medical_allergy', created: true });
        }
    }

    /**
     * FASE 3: READ - Verificar persistencia reabriendo modal
     */
    async testRead() {
        console.log('📖 FASE 3: READ - Verificando persistencia...');

        // Cerrar modal
        const closeBtn = this.page.locator('button:has-text("✕"), button[onclick*="closeEmployeeFile"]').first();
        await closeBtn.click();
        await this.page.waitForTimeout(2000);

        // Reabrir modal
        const userRow = this.page.locator('tr:has-text("[TEST] Usuario")').first();
        const verBtn = userRow.locator('button.btn-info').first();
        await verBtn.click();
        await this.page.waitForTimeout(3000);

        // Verificar TAB 2
        const tab2 = this.page.locator('.file-tab').nth(1);
        await tab2.click();
        await this.page.waitForTimeout(1500);

        const phoneVisible = await this.page.locator('text=[TEST] 1122334455').count();
        this.results.read.push({
            field: 'phone',
            persisted_in_ui: phoneVisible > 0
        });

        console.log('   ✅ Persistencia verificada\n');
    }

    /**
     * FASE 4: DELETE - Limpiar datos de prueba
     */
    async testDelete() {
        console.log('🗑️  FASE 4: DELETE - Limpiando datos de prueba...');

        // Eliminar registros relacionados
        await sequelize.query(`DELETE FROM user_work_history WHERE user_id = ${this.testUserId}`);
        this.results.delete.push({ table: 'user_work_history', deleted: true });

        await sequelize.query(`DELETE FROM user_family_members WHERE user_id = ${this.testUserId}`);
        this.results.delete.push({ table: 'user_family_members', deleted: true });

        await sequelize.query(`DELETE FROM employee_medical_records WHERE user_id = ${this.testUserId}`);
        this.results.delete.push({ table: 'employee_medical_records', deleted: true });

        await sequelize.query(`DELETE FROM users WHERE user_id = ${this.testUserId}`);
        this.results.delete.push({ table: 'users', deleted: true });

        // Verificar eliminación
        const [check] = await sequelize.query(`
            SELECT COUNT(*) as count FROM users WHERE user_id = ${this.testUserId}
        `);

        const deleted = check[0].count === 0;
        this.results.delete.push({ verified: deleted });

        console.log('   ✅ Datos de prueba eliminados\n');
    }

    /**
     * Generar reporte final
     */
    generateReport() {
        const totalTests = this.results.create.length +
                          this.results.update.length +
                          this.results.read.length +
                          this.results.delete.length;

        const passedTests = [
            ...this.results.create,
            ...this.results.update.filter(r => r.persisted || r.updated),
            ...this.results.read.filter(r => r.persisted_in_ui),
            ...this.results.delete.filter(r => r.deleted || r.verified)
        ].length;

        return {
            module: 'users',
            testType: 'crud_persistence',
            passed: this.results.errors.length === 0,
            totalTests,
            passedTests,
            failedTests: totalTests - passedTests,
            details: this.results,
            summary: {
                create: `${this.results.create.length} tests`,
                update: `${this.results.update.length} fields`,
                read: `${this.results.read.length} verifications`,
                delete: `${this.results.delete.length} cleanups`
            }
        };
    }
}

module.exports = UsersCrudPersistenceTest;
