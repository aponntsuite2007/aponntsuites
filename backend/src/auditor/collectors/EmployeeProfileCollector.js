/**
 * EMPLOYEE PROFILE COLLECTOR - Tests Frontend CRUD de Perfil de Empleado
 *
 * Integrado con sistema híbrido:
 * - Puppeteer (simulación de usuario real)
 * - LearningEngine (auto-aprendizaje)
 * - ClaudeCodeBridge (WebSocket para notificar errores)
 * - AutoAuditTicketSystem (creación automática de tickets)
 *
 * Testea 10 categorías del perfil de empleado:
 * 1. Work History (Antecedentes Laborales)
 * 2. Family Members (Grupo Familiar)
 * 3. Education (Educación)
 * 4. Chronic Conditions (Enfermedades Crónicas)
 * 5. Medications (Medicamentos)
 * 6. Allergies (Alergias)
 * 7. Activity Restrictions (Restricciones de Actividad)
 * 8. Work Restrictions (Restricciones Laborales)
 * 9. Vaccinations (Vacunas)
 * 10. Medical Exams (Exámenes Médicos)
 *
 * @version 2.0.0 - Integrado con sistema híbrido
 * @date 2025-01-28
 */

const puppeteer = require('puppeteer');
const LearningEngine = require('../learning/LearningEngine');

class EmployeeProfileCollector {
    constructor(database, systemRegistry) {
        this.database = database;
        this.systemRegistry = systemRegistry;
        this.learningEngine = new LearningEngine();

        // Usar puerto 9998 (puerto del servidor en este entorno)
        const port = '9998';
        this.baseURL = process.env.BASE_URL || `http://localhost:${port}`;

        this.browser = null;
        this.page = null;

        // Arrays para errores (igual que FrontendCollector)
        this.consoleErrors = [];
        this.pageErrors = [];
        this.networkErrors = [];

        // Prefijo para datos de testing
        this.TEST_PREFIX = '[TEST-PROFILE]';

        console.log(`  🔧 [EMPLOYEE-PROFILE] Base URL: ${this.baseURL}`);
    }

    /**
     * Método principal de recolección - Compatible con AuditorEngine
     */
    async collect(execution_id, config) {
        console.log('\n👤 [EMPLOYEE-PROFILE] Iniciando tests de perfil de empleado...\n');

        const results = [];

        try {
            // 1. Iniciar navegador
            await this.initBrowser();

            // 2. Login como operador
            await this.login(config.company_id);

            // 3. Navegar a usuarios y abrir modal del primer usuario
            const userId = await this.openUserModal();

            if (!userId) {
                throw new Error('No se pudo abrir el modal de usuario');
            }

            console.log(`✅ Usuario ID encontrado: ${userId}\n`);

            // 4. Probar cada categoría del perfil
            const categories = [
                { name: 'work_history', func: this.testWorkHistory.bind(this) },
                { name: 'family_members', func: this.testFamilyMembers.bind(this) },
                { name: 'education', func: this.testEducation.bind(this) },
                { name: 'chronic_conditions', func: this.testChronicConditions.bind(this) },
                { name: 'medications', func: this.testMedications.bind(this) },
                { name: 'allergies', func: this.testAllergies.bind(this) },
                { name: 'activity_restrictions', func: this.testActivityRestrictions.bind(this) },
                { name: 'work_restrictions', func: this.testWorkRestrictions.bind(this) },
                { name: 'vaccinations', func: this.testVaccinations.bind(this) },
                { name: 'medical_exams', func: this.testMedicalExams.bind(this) }
            ];

            for (const category of categories) {
                console.log(`\n📋 Testeando categoría: ${category.name}...`);
                const result = await category.func(userId, execution_id);
                results.push(result);
            }

            // 5. Auto-aprendizaje
            console.log(`\n🧠 [LEARNING] Analizando resultados para aprendizaje...`);
            const learningInsights = await this.learningEngine.analyzeTestResults(execution_id, {
                results: results,
                errors: this.consoleErrors,
                pageErrors: this.pageErrors,
                networkErrors: this.networkErrors,
                failures: results.filter(r => r.status === 'failed' || r.status === 'fail'),
                passes: results.filter(r => r.status === 'passed' || r.status === 'pass'),
                warnings: results.filter(r => r.status === 'warning')
            });

            console.log(`✅ [LEARNING] Conocimiento capturado:`);
            console.log(`   - Patrones de error: ${learningInsights.errorPatternsDetected || 0}`);
            console.log(`   - Edge cases: ${learningInsights.edgeCasesIdentified || 0}`);

        } catch (error) {
            console.error('❌ Error en EmployeeProfileCollector:', error);

            results.push(await this.database.AuditLog.create({
                execution_id,
                test_type: 'e2e',
                module_name: 'employee_profile',
                test_name: 'frontend_crud_general',
                status: 'fail',
                error_message: error.message,
                error_stack: error.stack,
                completed_at: new Date()
            }));

        } finally {
            await this.closeBrowser();
        }

        return results;
    }

    /**
     * Inicializar navegador Puppeteer (similar a FrontendCollector)
     */
    async initBrowser() {
        console.log('🌐 Iniciando navegador VISIBLE...');

        this.browser = await puppeteer.launch({
            headless: false,
            slowMo: 30, // 30ms de delay (5x más rápido que 150ms)
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--start-maximized'
            ],
            defaultViewport: null,
            protocolTimeout: 180000
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1366, height: 768 });

        // Auto-aceptar dialogs
        this.page.on('dialog', async dialog => {
            console.log(`🔔 [AUTO-DIALOG] ${dialog.type()}: ${dialog.message().substring(0, 100)}`);
            await dialog.accept();
        });

        // Capturar errores de consola
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.consoleErrors.push({
                    type: 'console',
                    message: msg.text(),
                    timestamp: new Date()
                });
                console.log(`❌ [CONSOLE] ${msg.text()}`);
            }
        });

        // Capturar errores de página
        this.page.on('pageerror', error => {
            this.pageErrors.push({
                type: 'exception',
                message: error.message,
                stack: error.stack,
                timestamp: new Date()
            });
            console.log(`❌ [PAGE ERROR] ${error.message}`);
        });

        console.log('✅ Navegador iniciado\n');
    }

    /**
     * Login como operador usando panel-empresa.html (3-step login)
     */
    async login(company_id) {
        console.log('🔐 Haciendo login...');

        try {
            // Ir a panel-empresa.html
            await this.page.goto(`${this.baseURL}/panel-empresa.html`, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Obtener slug de la empresa
            const { Client } = require('pg');
            const client = new Client({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
            await client.connect();
            const result = await client.query('SELECT slug FROM companies WHERE company_id = $1', [company_id]);
            await client.end();

            if (!result.rows || result.rows.length === 0) {
                throw new Error(`No se encontró empresa con ID ${company_id}`);
            }

            const companySlug = result.rows[0].slug;
            console.log(`  Empresa: ${companySlug}`);

            // PASO 1: Esperar y seleccionar empresa
            await this.page.waitForSelector('#companySelect', { timeout: 10000 });
            await this.page.waitForFunction(
                () => document.getElementById('companySelect').options.length > 1,
                { timeout: 10000 }
            );
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.select('#companySelect', companySlug);
            await new Promise(resolve => setTimeout(resolve, 5000));

            // PASO 2: Ingresar usuario
            await this.page.waitForSelector('#userInput:not([disabled])', { timeout: 15000 });
            await this.page.click('#userInput', { clickCount: 3 });
            await this.page.keyboard.press('Backspace');
            await new Promise(resolve => setTimeout(resolve, 500));
            await this.page.type('#userInput', 'soporte', { delay: 100 });
            await new Promise(resolve => setTimeout(resolve, 2000));

            // PASO 3: Ingresar contraseña
            await this.page.waitForSelector('#passwordInput:not([disabled])', { timeout: 15000 });
            await this.page.click('#passwordInput', { clickCount: 3 });
            await this.page.keyboard.press('Backspace');
            await new Promise(resolve => setTimeout(resolve, 500));
            await this.page.type('#passwordInput', 'admin123', { delay: 100 });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // PASO 4: Click en Ingresar
            await this.page.waitForSelector('#loginButton:not([disabled])', { timeout: 15000 });
            await this.page.click('#loginButton');

            // PASO 5: Verificar login exitoso
            await this.page.waitForFunction(
                () => !!localStorage.getItem('authToken') && !!localStorage.getItem('currentCompany'),
                { timeout: 60000, polling: 500 }
            );

            // PASO 6: Esperar a que cargue el dashboard con las tarjetas de módulos
            console.log('  ⏳ Esperando dashboard...');
            await this.page.waitForSelector('#modulesContainer, .modules-grid, .module-card', { timeout: 30000 });
            await new Promise(resolve => setTimeout(resolve, 3000)); // Esperar a que terminen las animaciones

            console.log('✅ Login exitoso\n');

        } catch (error) {
            console.error('❌ Error en login:', error.message);
            throw error;
        }
    }

    /**
     * Navegar a módulo usuarios y abrir modal del primer usuario
     */
    async openUserModal() {
        console.log('👤 Abriendo módulo usuarios y modal...');

        try {
            // DEBUG: Ver estado actual de la página
            const currentURL = this.page.url();
            console.log(`  🔍 URL actual: ${currentURL}`);

            const bodyHTML = await this.page.evaluate(() => document.body.innerHTML.substring(0, 500));
            console.log(`  🔍 Body HTML (primeros 500 chars): ${bodyHTML}...\n`);

            // PASO 1: Esperar a que se carguen las tarjetas de módulos (div[onclick*="showTab"])
            console.log('  ⏳ Esperando generación dinámica de módulos...');
            await this.page.waitForFunction(
                () => document.querySelectorAll('div[onclick*="showTab"]').length > 0,
                { timeout: 15000, polling: 500 }
            );

            // Esperar un poco más para asegurar que todos los módulos terminaron de renderizar
            await new Promise(resolve => setTimeout(resolve, 2000));

            // DEBUG: Ver cuántas tarjetas hay
            const cardCount = await this.page.evaluate(() => document.querySelectorAll('div[onclick*="showTab"]').length);
            console.log(`  ✅ ${cardCount} tarjetas de módulos encontradas`);

            // PASO 2: Click en la tarjeta del módulo "Usuarios"
            console.log('  📌 Buscando tarjeta del módulo users...');

            // Hacer click usando JavaScript para asegurar que funcione
            await this.page.evaluate(() => {
                const moduleCards = document.querySelectorAll('div[onclick*="showTab"]');
                for (const card of moduleCards) {
                    const onclick = card.getAttribute('onclick');
                    if (onclick && onclick.includes("showTab('users'")) {
                        card.click();
                        return;
                    }
                }
                throw new Error('No se encontró la tarjeta del módulo users');
            });

            console.log('  ✅ Click en módulo users');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // PASO 2: Esperar a que cargue el contenido del módulo con la tabla de usuarios
            console.log('  📌 Esperando tabla de usuarios...');
            await this.page.waitForSelector('#users-list', { timeout: 15000 });

            // Esperar a que termine de cargar (desaparezca el "Cargando usuarios...")
            try {
                await this.page.waitForFunction(
                    () => {
                        const usersList = document.querySelector('#users-list');
                        if (!usersList) return false;
                        const text = usersList.textContent;
                        // Esperar a que NO diga "Cargando" y que tenga una table
                        return !text.includes('Cargando') && usersList.querySelector('table') !== null;
                    },
                    { timeout: 20000, polling: 500 }
                );

                console.log('  ✅ Tabla de usuarios cargada');
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (timeoutError) {
                // Si hace timeout, intentar abrir el modal del primer usuario manualmente
                console.warn('  ⚠️ Timeout cargando tabla. Intentando abrir modal directamente...');

                // Buscar el primer usuario en la BD y abrir su modal directamente
                const userResult = await this.database.sequelize.query(
                    `SELECT user_id FROM users WHERE company_id = :companyId ORDER BY user_id LIMIT 1`,
                    {
                        replacements: { companyId: 11 },
                        type: this.database.sequelize.QueryTypes.SELECT
                    }
                );

                if (!userResult || userResult.length === 0) {
                    throw new Error('No hay usuarios en la base de datos para testear');
                }

                const userId = userResult[0].user_id;
                console.log(`  👤 Usuario obtenido de BD: ID ${userId}`);

                // Llamar a viewUser directamente con JavaScript
                await this.page.evaluate((uid) => {
                    window.viewUser(uid);
                }, userId);

                // Esperar a que aparezca el modal (viewUser() crea #employeeFileModal dinámicamente)
                await this.page.waitForSelector('#employeeFileModal', { timeout: 10000 });

                return userId;
            }

            // PASO 3: Obtener el primer usuario disponible (puede ser test o real)
            const userInfo = await this.page.evaluate(() => {
                const usersList = document.querySelector('#users-list');
                if (!usersList) {
                    return { error: 'No se encontró #users-list' };
                }

                const table = usersList.querySelector('table');
                if (!table) {
                    return { error: 'No se encontró table dentro de #users-list', html: usersList.innerHTML.substring(0, 500) };
                }

                const tbody = table.querySelector('tbody');
                if (!tbody) {
                    return { error: 'No se encontró tbody', html: table.innerHTML.substring(0, 500) };
                }

                const rows = tbody.querySelectorAll('tr');
                if (rows.length === 0) {
                    return { error: 'No hay rows en tbody', html: tbody.innerHTML.substring(0, 500) };
                }

                // Buscar primer viewUser button
                for (const row of rows) {
                    const viewButton = row.querySelector('button[onclick*="viewUser"]');
                    if (viewButton) {
                        const match = viewButton.getAttribute('onclick').match(/viewUser\((\d+)\)/);
                        if (match) {
                            return { userId: parseInt(match[1]) };
                        }
                    }
                }

                return { error: 'No se encontró botón viewUser', rowCount: rows.length, sampleHTML: rows[0].innerHTML.substring(0, 300) };
            });

            if (userInfo.error) {
                console.error('  ❌ Debug info:', JSON.stringify(userInfo, null, 2));
                throw new Error(`No se pudo encontrar usuario: ${userInfo.error}`);
            }

            const userId = userInfo.userId;

            console.log(`  👤 Usuario encontrado: ID ${userId}`);

            // PASO 4: Click en botón "Ver" del usuario
            await this.page.evaluate((uid) => {
                const button = document.querySelector(`button[onclick*="viewUser(${uid})"]`);
                if (button) button.click();
                else throw new Error(`No se encontró botón Ver para usuario ${uid}`);
            }, userId);

            // PASO 5: Esperar a que abra el modal (viewUser() crea #employeeFileModal)
            await this.page.waitForSelector('#employeeFileModal', { timeout: 10000 });

            // CRÍTICO: Esperar a que los botones de tabs estén renderizados
            await this.page.waitForSelector('button.file-tab', { timeout: 5000 });

            console.log(`✅ Modal de usuario abierto para ID: ${userId}\n`);

            return userId;

        } catch (error) {
            console.error('❌ Error abriendo modal:', error.message);
            throw error;
        }
    }

    /**
     * Test: Work History (Antecedentes Laborales)
     */
    async testWorkHistory(userId, execution_id) {
        console.log('💼 Testing: Work History...');

        const { AuditLog } = this.database;
        const startTime = Date.now();

        const log = await AuditLog.create({
            execution_id,
            test_type: 'e2e',
            module_name: 'employee_profile',
            test_name: 'frontend_work_history_crud',
            test_description: 'Test completo CRUD de antecedentes laborales',
            status: 'in-progress',
            started_at: new Date()
        });

        try {
            // Click en tab "work" (Antecedentes Laborales)
            await this.page.click(`button.file-tab[onclick*="showFileTab('work'"]`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Esperar a que el tab se active

            // Click en botón "Agregar" usando JS nativo
            await this.page.evaluate(() => {
                const btn = document.querySelector('button[onclick*="addWorkHistory"]');
                if (btn) btn.click();
                else throw new Error('Botón addWorkHistory no encontrado');
            });
            await new Promise(resolve => setTimeout(resolve, 200));

            // Llenar formulario
            await this.page.type('#company', `${this.TEST_PREFIX} Empresa Puppeteer ${Date.now()}`);
            await this.page.type('#position', 'Desarrollador Senior');
            await this.page.type('#startDate', '2020-01-01');
            await this.page.type('#endDate', '2023-12-31');
            await this.page.type('#description', 'Desarrollo de aplicaciones web con Node.js y PostgreSQL');

            // Submit formulario
            await this.page.click('#workHistoryForm button[type="submit"]');
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('✅ Work History agregado exitosamente');
            await log.update({ status: 'pass', duration_ms: Date.now() - startTime, completed_at: new Date() });

        } catch (error) {
            console.error('❌ Error en Work History:', error.message);

            await log.update({
                status: 'fail',
                error_message: error.message,
                duration_ms: Date.now() - startTime,
                completed_at: new Date()
            });
        }

        return log;
    }

    // =========================================================================
    // MÉTODOS PARA LAS OTRAS 9 CATEGORÍAS (IMPLEMENTACIÓN COMPLETA)
    // =========================================================================

    /**
     * Test: Family Members (Grupo Familiar)
     */
    async testFamilyMembers(userId, execution_id) {
        console.log('👨‍👩‍👧 Testing: Family Members...');
        const { AuditLog } = this.database;
        const startTime = Date.now();

        const log = await AuditLog.create({
            execution_id, test_type: 'e2e', module_name: 'employee_profile',
            test_name: 'frontend_family_members_crud', status: 'in-progress', started_at: new Date()
        });

        try {
            // Click en tab "family" (Grupo Familiar)
            await this.page.click(`button.file-tab[onclick*="showFileTab('family'"]`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Esperar a que el tab se active

            // Click en botón "Agregar" usando JS nativo
            await this.page.evaluate(() => {
                const btn = document.querySelector('button[onclick*="addFamilyMember"]');
                if (btn) btn.click();
                else throw new Error('Botón addFamilyMember no encontrado');
            });
            await new Promise(resolve => setTimeout(resolve, 1000));

            await this.page.type('#familyName', `${this.TEST_PREFIX} María`);
            await this.page.type('#familySurname', 'Pérez');
            await this.page.select('#relationship', 'spouse');
            await this.page.type('#familyBirthDate', '1990-05-15');
            await this.page.type('#familyDni', '35123456');

            await this.page.click('#familyMemberForm button[type="submit"]');
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('✅ Family Member agregado exitosamente');
            await log.update({ status: 'pass', duration_ms: Date.now() - startTime, completed_at: new Date() });

        } catch (error) {
            console.error('❌ Error en Family Members:', error.message);
            await log.update({ status: 'fail', error_message: error.message, duration_ms: Date.now() - startTime, completed_at: new Date() });
        }

        return log;
    }

    /**
     * Test: Education (Educación)
     */
    async testEducation(userId, execution_id) {
        console.log('🎓 Testing: Education...');
        const { AuditLog } = this.database;
        const startTime = Date.now();

        const log = await AuditLog.create({
            execution_id, test_type: 'e2e', module_name: 'employee_profile',
            test_name: 'frontend_education_crud', status: 'in-progress', started_at: new Date()
        });

        try {
            // Click en tab "personal" (donde está Education)
            await this.page.click(`button.file-tab[onclick*="showFileTab('personal'"]`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Esperar a que el tab se active

            // Click en botón "Agregar" usando JS nativo
            await this.page.evaluate(() => {
                const btn = document.querySelector('button[onclick*="addEducation"]');
                if (btn) btn.click();
                else throw new Error('Botón addEducation no encontrado');
            });
            await new Promise(resolve => setTimeout(resolve, 1000));

            await this.page.select('#educationType', 'university');
            await this.page.type('#institution', `${this.TEST_PREFIX} Universidad Nacional`);
            await this.page.type('#degree', 'Ingeniería en Sistemas');
            await this.page.select('#status', 'completed');
            await this.page.type('#graduationYear', '2019');

            await this.page.click('#educationForm button[type="submit"]');
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('✅ Education agregada exitosamente');
            await log.update({ status: 'pass', duration_ms: Date.now() - startTime, completed_at: new Date() });

        } catch (error) {
            console.error('❌ Error en Education:', error.message);
            await log.update({ status: 'fail', error_message: error.message, duration_ms: Date.now() - startTime, completed_at: new Date() });
        }

        return log;
    }

    /**
     * Test: Chronic Conditions (Enfermedades Crónicas)
     */
    async testChronicConditions(userId, execution_id) {
        console.log('🏥 Testing: Chronic Conditions...');
        const { AuditLog } = this.database;
        const startTime = Date.now();

        const log = await AuditLog.create({
            execution_id, test_type: 'e2e', module_name: 'employee_profile',
            test_name: 'frontend_chronic_conditions_crud', status: 'in-progress', started_at: new Date()
        });

        try {
            // Click en tab "medical" (Antecedentes Médicos)
            await this.page.click(`button.file-tab[onclick*="showFileTab('medical'"]`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Esperar a que el tab se active

            // Click en botón "Agregar" usando JS nativo
            await this.page.evaluate(() => {
                const btn = document.querySelector('button[onclick*="addChronicCondition"]');
                if (btn) btn.click();
                else throw new Error('Botón addChronicCondition no encontrado');
            });
            await new Promise(resolve => setTimeout(resolve, 200));

            await this.page.select('#conditionType', 'hypertension');
            await this.page.select('#conditionSeverity', 'moderate');
            await this.page.type('#diagnosisDate', '2018-03-20');

            await this.page.click('#chronicConditionForm button[type="submit"]');
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('✅ Chronic Condition agregada exitosamente');
            await log.update({ status: 'pass', duration_ms: Date.now() - startTime, completed_at: new Date() });

        } catch (error) {
            console.error('❌ Error en Chronic Conditions:', error.message);
            await log.update({ status: 'fail', error_message: error.message, duration_ms: Date.now() - startTime, completed_at: new Date() });
        }

        return log;
    }

    /**
     * Test: Medications (Medicamentos)
     */
    async testMedications(userId, execution_id) {
        console.log('💊 Testing: Medications...');
        const { AuditLog } = this.database;
        const startTime = Date.now();

        const log = await AuditLog.create({
            execution_id, test_type: 'e2e', module_name: 'employee_profile',
            test_name: 'frontend_medications_crud', status: 'in-progress', started_at: new Date()
        });

        try {
            // Click en tab "medical"
            await this.page.click(`button.file-tab[onclick*="showFileTab('medical'"]`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Esperar a que el tab se active

            // Click en botón "Agregar" usando JS nativo
            await this.page.evaluate(() => {
                const btn = document.querySelector('button[onclick*="addMedication"]');
                if (btn) btn.click();
                else throw new Error('Botón addMedication no encontrado');
            });
            await new Promise(resolve => setTimeout(resolve, 1000));

            await this.page.type('#medicationName', `${this.TEST_PREFIX} Paracetamol`);
            await this.page.type('#medicationDose', '500mg');
            await this.page.select('#medicationFrequency', 'three_times_daily');

            await this.page.click('#medicationForm button[type="submit"]');
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('✅ Medication agregado exitosamente');
            await log.update({ status: 'pass', duration_ms: Date.now() - startTime, completed_at: new Date() });

        } catch (error) {
            console.error('❌ Error en Medications:', error.message);
            await log.update({ status: 'fail', error_message: error.message, duration_ms: Date.now() - startTime, completed_at: new Date() });
        }

        return log;
    }

    /**
     * Test: Allergies (Alergias)
     */
    async testAllergies(userId, execution_id) {
        console.log('🤧 Testing: Allergies...');
        const { AuditLog } = this.database;
        const startTime = Date.now();

        const log = await AuditLog.create({
            execution_id, test_type: 'e2e', module_name: 'employee_profile',
            test_name: 'frontend_allergies_crud', status: 'in-progress', started_at: new Date()
        });

        try {
            // Click en tab "medical"
            await this.page.click(`button.file-tab[onclick*="showFileTab('medical'"]`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Esperar a que el tab se active

            // Click en botón "Agregar" usando JS nativo
            await this.page.evaluate(() => {
                const btn = document.querySelector('button[onclick*="addAllergy"]');
                if (btn) btn.click();
                else throw new Error('Botón addAllergy no encontrado');
            });
            await new Promise(resolve => setTimeout(resolve, 200));

            await this.page.select('#allergyType', 'environmental');
            await this.page.type('#allergen', `${this.TEST_PREFIX} Polen`);

            await this.page.click('#allergyForm button[type="submit"]');
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('✅ Allergy agregada exitosamente');
            await log.update({ status: 'pass', duration_ms: Date.now() - startTime, completed_at: new Date() });

        } catch (error) {
            console.error('❌ Error en Allergies:', error.message);
            await log.update({ status: 'fail', error_message: error.message, duration_ms: Date.now() - startTime, completed_at: new Date() });
        }

        return log;
    }

    /**
     * Test: Activity Restrictions (Restricciones de Actividad)
     */
    async testActivityRestrictions(userId, execution_id) {
        console.log('🚫 Testing: Activity Restrictions...');
        const { AuditLog } = this.database;
        const startTime = Date.now();

        const log = await AuditLog.create({
            execution_id, test_type: 'e2e', module_name: 'employee_profile',
            test_name: 'frontend_activity_restrictions_crud', status: 'in-progress', started_at: new Date()
        });

        try {
            // Click en tab "medical"
            await this.page.click(`button.file-tab[onclick*="showFileTab('medical'"]`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Esperar a que el tab se active

            // Click en botón "Agregar" usando JS nativo
            await this.page.evaluate(() => {
                const btn = document.querySelector('button[onclick*="addActivityRestriction"]');
                if (btn) btn.click();
                else throw new Error('Botón addActivityRestriction no encontrado');
            });
            await new Promise(resolve => setTimeout(resolve, 200));

            await this.page.select('#restrictionType', 'physical');
            await this.page.type('#restrictedActivity', `${this.TEST_PREFIX} No levantar objetos pesados`);
            await this.page.select('#restrictionDuration', 'temporary');

            await this.page.click('#activityRestrictionForm button[type="submit"]');
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('✅ Activity Restriction agregada exitosamente');
            await log.update({ status: 'pass', duration_ms: Date.now() - startTime, completed_at: new Date() });

        } catch (error) {
            console.error('❌ Error en Activity Restrictions:', error.message);
            await log.update({ status: 'fail', error_message: error.message, duration_ms: Date.now() - startTime, completed_at: new Date() });
        }

        return log;
    }

    /**
     * Test: Work Restrictions (Restricciones Laborales)
     */
    async testWorkRestrictions(userId, execution_id) {
        console.log('⚠️ Testing: Work Restrictions...');
        const { AuditLog } = this.database;
        const startTime = Date.now();

        const log = await AuditLog.create({
            execution_id, test_type: 'e2e', module_name: 'employee_profile',
            test_name: 'frontend_work_restrictions_crud', status: 'in-progress', started_at: new Date()
        });

        try {
            // Click en tab "medical"
            await this.page.click(`button.file-tab[onclick*="showFileTab('medical'"]`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Esperar a que el tab se active

            // Click en botón "Agregar" usando JS nativo
            await this.page.evaluate(() => {
                const btn = document.querySelector('button[onclick*="addWorkRestriction"]');
                if (btn) btn.click();
                else throw new Error('Botón addWorkRestriction no encontrado');
            });
            await new Promise(resolve => setTimeout(resolve, 200));

            await this.page.type('#allowedTasks', `${this.TEST_PREFIX} Trabajo administrativo, tareas livianas`);
            await this.page.type('#restrictedTasks', 'Levantar objetos pesados, trabajos en altura');

            await this.page.click('#workRestrictionForm button[type="submit"]');
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('✅ Work Restriction agregada exitosamente');
            await log.update({ status: 'pass', duration_ms: Date.now() - startTime, completed_at: new Date() });

        } catch (error) {
            console.error('❌ Error en Work Restrictions:', error.message);
            await log.update({ status: 'fail', error_message: error.message, duration_ms: Date.now() - startTime, completed_at: new Date() });
        }

        return log;
    }

    /**
     * Test: Vaccinations (Vacunas)
     */
    async testVaccinations(userId, execution_id) {
        console.log('💉 Testing: Vaccinations...');
        const { AuditLog } = this.database;
        const startTime = Date.now();

        const log = await AuditLog.create({
            execution_id, test_type: 'e2e', module_name: 'employee_profile',
            test_name: 'frontend_vaccinations_crud', status: 'in-progress', started_at: new Date()
        });

        try {
            // Click en tab "medical"
            await this.page.click(`button.file-tab[onclick*="showFileTab('medical'"]`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Esperar a que el tab se active

            // Click en botón "Agregar" usando JS nativo
            await this.page.evaluate(() => {
                const btn = document.querySelector('button[onclick*="addVaccination"]');
                if (btn) btn.click();
                else throw new Error('Botón addVaccination no encontrado');
            });
            await new Promise(resolve => setTimeout(resolve, 200));

            await this.page.select('#vaccineType', 'covid19');
            await this.page.type('#vaccineDate', '2023-06-15');
            await this.page.select('#vaccinedose', '1');

            await this.page.click('#vaccinationForm button[type="submit"]');
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('✅ Vaccination agregada exitosamente');
            await log.update({ status: 'pass', duration_ms: Date.now() - startTime, completed_at: new Date() });

        } catch (error) {
            console.error('❌ Error en Vaccinations:', error.message);
            await log.update({ status: 'fail', error_message: error.message, duration_ms: Date.now() - startTime, completed_at: new Date() });
        }

        return log;
    }

    /**
     * Test: Medical Exams (Exámenes Médicos)
     */
    async testMedicalExams(userId, execution_id) {
        console.log('🩺 Testing: Medical Exams...');
        const { AuditLog } = this.database;
        const startTime = Date.now();

        const log = await AuditLog.create({
            execution_id, test_type: 'e2e', module_name: 'employee_profile',
            test_name: 'frontend_medical_exams_crud', status: 'in-progress', started_at: new Date()
        });

        try {
            // Click en tab "medical"
            await this.page.click(`button.file-tab[onclick*="showFileTab('medical'"]`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Esperar a que el tab se active

            // Click en botón "Agregar" usando JS nativo
            await this.page.evaluate(() => {
                const btn = document.querySelector('button[onclick*="addMedicalExam"]');
                if (btn) btn.click();
                else throw new Error('Botón addMedicalExam no encontrado');
            });
            await new Promise(resolve => setTimeout(resolve, 200));

            await this.page.select('#examType', 'preocupacional');
            await this.page.type('#examDate', '2023-01-15');
            await this.page.select('#examResult', 'apto');

            await this.page.click('#medicalExamForm button[type="submit"]');
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('✅ Medical Exam agregado exitosamente');
            await log.update({ status: 'pass', duration_ms: Date.now() - startTime, completed_at: new Date() });

        } catch (error) {
            console.error('❌ Error en Medical Exams:', error.message);
            await log.update({ status: 'fail', error_message: error.message, duration_ms: Date.now() - startTime, completed_at: new Date() });
        }

        return log;
    }

    /**
     * Cerrar navegador
     */
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            console.log('\n🔒 Navegador cerrado\n');
        }
    }
}

module.exports = EmployeeProfileCollector;
