/**
 * ============================================================================
 * BASE MODULE COLLECTOR - Template Base para Testing de 35 Módulos
 * ============================================================================
 *
 * Clase abstracta que encapsula el patrón exitoso de EmployeeProfileCollector
 * (10/10 PASSED) para extenderlo a todos los módulos del sistema.
 *
 * PATRÓN PROBADO:
 * - Puppeteer con slowMo: 30ms (5x más rápido)
 * - JS native clicks (.evaluate())
 * - LearningEngine integrado
 * - Modal positioning optimizado
 * - Prefijos [TEST-AUTO] para datos de testing
 *
 * USO:
 * ```javascript
 * class AttendanceModuleCollector extends BaseModuleCollector {
 *     getModuleConfig() {
 *         return {
 *             moduleName: 'attendance',
 *             moduleURL: '/panel-empresa.html',
 *             testCategories: [
 *                 { name: 'manual_entry', func: this.testManualEntry.bind(this) },
 *                 { name: 'biometric_validation', func: this.testBiometric.bind(this) }
 *             ]
 *         };
 *     }
 *
 *     async testManualEntry(execution_id) {
 *         // Implementación específica del test
 *     }
 * }
 * ```
 *
 * @version 1.0.0
 * @date 2025-10-29
 * @author Sistema de Testing Global
 * ============================================================================
 */

const puppeteer = require('puppeteer');
const LearningEngine = require('../learning/LearningEngine');

class BaseModuleCollector {
    constructor(database, systemRegistry) {
        this.database = database;
        this.systemRegistry = systemRegistry;
        this.learningEngine = new LearningEngine();

        // Configuración base
        const port = process.env.PORT || '9998';
        this.baseURL = process.env.BASE_URL || `http://localhost:${port}`;

        this.browser = null;
        this.page = null;

        // Arrays para errores (patrón de EmployeeProfileCollector)
        this.consoleErrors = [];
        this.pageErrors = [];
        this.networkErrors = [];

        // Prefijo para datos de testing (cambiar en subclases si es necesario)
        this.TEST_PREFIX = '[TEST-AUTO]';

        console.log(`  🔧 [${this.getModuleName()}] Base URL: ${this.baseURL}`);
    }

    /**
     * MÉTODO ABSTRACTO - Debe ser implementado por subclases
     * Retorna la configuración específica del módulo
     */
    getModuleConfig() {
        throw new Error('getModuleConfig() debe ser implementado por la subclase');
    }

    /**
     * Helper para obtener nombre del módulo
     */
    getModuleName() {
        const config = this.getModuleConfig();
        return config.moduleName.toUpperCase();
    }

    /**
     * ========================================================================
     * MÉTODO PRINCIPAL - Compatible con AuditorEngine
     * ========================================================================
     */
    async collect(execution_id, config) {
        const moduleConfig = this.getModuleConfig();
        console.log(`\n🧪 [${this.getModuleName()}] Iniciando tests de módulo...\n`);

        const results = [];

        try {
            // 1. Iniciar navegador
            await this.initBrowser();

            // 2. Login como operador
            await this.login(config.company_id);

            // 3. Navegación específica del módulo (si es necesario)
            if (moduleConfig.navigateBeforeTests) {
                await moduleConfig.navigateBeforeTests.call(this);
            }

            // 4. Ejecutar tests de cada categoría
            const categories = moduleConfig.testCategories || [];

            for (const category of categories) {
                console.log(`\n📋 Testeando categoría: ${category.name}...`);

                try {
                    const result = await category.func(execution_id);
                    results.push(result);
                } catch (error) {
                    console.error(`❌ Error en categoría ${category.name}:`, error.message);

                    results.push(await this.database.AuditLog.create({
                        execution_id,
                        test_type: 'e2e',
                        module_name: moduleConfig.moduleName,
                        test_name: `frontend_${category.name}`,
                        status: 'fail',
                        error_message: error.message,
                        error_stack: error.stack,
                        completed_at: new Date()
                    }));
                }
            }

            // 5. Auto-aprendizaje con LearningEngine
            console.log(`\n🧠 [LEARNING] Analizando resultados para aprendizaje...`);
            const learningInsights = await this.learningEngine.analyzeTestResults(execution_id, {
                moduleName: moduleConfig.moduleName,
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
            console.error(`❌ Error general en ${this.getModuleName()}:`, error);

            results.push(await this.database.AuditLog.create({
                execution_id,
                test_type: 'e2e',
                module_name: moduleConfig.moduleName,
                test_name: 'frontend_crud_general',
                status: 'fail',
                error_message: error.message,
                error_stack: error.stack,
                completed_at: new Date()
            }));

        } finally {
            await this.closeBrowser();
        }

        // 6. Resumen final
        this.printTestSummary(results);

        return results;
    }

    /**
     * ========================================================================
     * NAVEGADOR - Puppeteer Configuration (patrón optimizado)
     * ========================================================================
     */
    async initBrowser() {
        console.log('🌐 Iniciando navegador VISIBLE (slowMo: 30ms)...');

        this.browser = await puppeteer.launch({
            headless: false,
            slowMo: 30, // 5x más rápido (patrón exitoso)
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

        // Interceptar errores de consola
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.consoleErrors.push(msg.text());
            }
        });

        // Interceptar errores de página
        this.page.on('pageerror', error => {
            this.pageErrors.push(error.message);
        });

        // Interceptar errores de red
        this.page.on('requestfailed', request => {
            this.networkErrors.push(`${request.url()} - ${request.failure().errorText}`);
        });

        console.log('✅ Navegador iniciado');
    }

    async closeBrowser() {
        if (this.browser) {
            console.log('\n🔒 Cerrando navegador...');
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }

    /**
     * ========================================================================
     * LOGIN - Sistema de 3 pasos (empresa → usuario → password)
     * ========================================================================
     */
    async login(company_id = 11) {
        console.log(`\n🔐 Iniciando login para company_id: ${company_id}...`);

        // Obtener datos de login desde BD
        const [company] = await this.database.sequelize.query(`
            SELECT slug FROM companies WHERE company_id = ?
        `, {
            replacements: [company_id],
            type: this.database.sequelize.QueryTypes.SELECT
        });

        if (!company) {
            throw new Error(`Empresa con ID ${company_id} no encontrada`);
        }

        const [user] = await this.database.sequelize.query(`
            SELECT usuario FROM users WHERE company_id = ? AND role = 'admin' LIMIT 1
        `, {
            replacements: [company_id],
            type: this.database.sequelize.QueryTypes.SELECT
        });

        if (!user) {
            throw new Error(`Usuario admin no encontrado para company_id ${company_id}`);
        }

        const companySlug = company.slug;
        const username = user.usuario;
        const password = 'admin123'; // Password por defecto

        console.log(`   📝 Empresa: ${companySlug}`);
        console.log(`   👤 Usuario: ${username}`);

        // Navegar a página de login
        await this.page.goto(`${this.baseURL}/panel-empresa.html`, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // PASO 1: Empresa
        await this.page.waitForSelector('#company-identifier', { visible: true, timeout: 10000 });
        await this.page.type('#company-identifier', companySlug);
        await this.page.click('button[onclick="checkCompany()"]');

        // Esperar transición
        await new Promise(resolve => setTimeout(resolve, 500));

        // PASO 2: Usuario
        await this.page.waitForSelector('#user-identifier', { visible: true, timeout: 10000 });
        await this.page.type('#user-identifier', username);
        await this.page.click('button[onclick="checkUsername()"]');

        // Esperar transición
        await new Promise(resolve => setTimeout(resolve, 500));

        // PASO 3: Password
        await this.page.waitForSelector('#password-field', { visible: true, timeout: 10000 });
        await this.page.type('#password-field', password);
        await this.page.click('button[onclick="performLogin()"]');

        // Esperar que cargue el dashboard
        await this.page.waitForSelector('#module-content', { visible: true, timeout: 30000 });

        console.log('✅ Login exitoso\n');
    }

    /**
     * ========================================================================
     * HELPERS COMUNES - Reutilizables en todos los módulos
     * ========================================================================
     */

    /**
     * Click usando JS nativo (patrón probado más confiable)
     */
    async clickElement(selector, description = 'elemento') {
        try {
            await this.page.evaluate((sel) => {
                const element = document.querySelector(sel);
                if (!element) {
                    throw new Error(`Elemento ${sel} no encontrado`);
                }
                element.click();
            }, selector);

            console.log(`   ✅ Click en ${description}`);
            await new Promise(resolve => setTimeout(resolve, 200)); // Delay reducido (5x más rápido)
        } catch (error) {
            console.error(`   ❌ Error haciendo click en ${description}:`, error.message);
            throw error;
        }
    }

    /**
     * Esperar y escribir en input
     */
    async typeInInput(selector, value, description = 'campo') {
        try {
            await this.page.waitForSelector(selector, { visible: true, timeout: 5000 });
            await this.page.type(selector, value, { delay: 10 }); // Delay muy reducido
            console.log(`   ✅ Escrito "${value}" en ${description}`);
        } catch (error) {
            console.error(`   ❌ Error escribiendo en ${description}:`, error.message);
            throw error;
        }
    }

    /**
     * Seleccionar opción en dropdown
     */
    async selectOption(selector, value, description = 'dropdown') {
        try {
            await this.page.waitForSelector(selector, { visible: true, timeout: 5000 });
            await this.page.select(selector, value);
            console.log(`   ✅ Seleccionado "${value}" en ${description}`);
        } catch (error) {
            console.error(`   ❌ Error seleccionando en ${description}:`, error.message);
            throw error;
        }
    }

    /**
     * Esperar navegación a tab/sección específica
     */
    async navigateToTab(tabSelector, tabName) {
        console.log(`\n📂 Navegando a tab: ${tabName}...`);

        await this.page.waitForSelector(tabSelector, { timeout: 5000 });
        await this.clickElement(tabSelector, `tab ${tabName}`);

        // Esperar que el contenido del tab cargue
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log(`✅ Tab ${tabName} abierto\n`);
    }

    /**
     * Crear log de test en BD
     */
    async createTestLog(execution_id, testName, status, details = {}) {
        const moduleConfig = this.getModuleConfig();

        return await this.database.AuditLog.create({
            execution_id,
            test_type: 'e2e',
            module_name: moduleConfig.moduleName,
            test_name: testName,
            status: status,
            error_message: details.error_message || null,
            error_stack: details.error_stack || null,
            metadata: JSON.stringify(details.metadata || {}),
            completed_at: new Date()
        });
    }

    /**
     * ========================================================================
     * REPORTING - Resumen de tests
     * ========================================================================
     */
    printTestSummary(results) {
        const passed = results.filter(r => r.status === 'passed' || r.status === 'pass').length;
        const failed = results.filter(r => r.status === 'failed' || r.status === 'fail').length;
        const warnings = results.filter(r => r.status === 'warning').length;
        const total = results.length;

        console.log('\n' + '='.repeat(60));
        console.log(`📊 RESUMEN - ${this.getModuleName()}`);
        console.log('='.repeat(60));
        console.log(`✅ PASSED: ${passed}/${total}`);
        console.log(`❌ FAILED: ${failed}/${total}`);
        console.log(`⚠️  WARNINGS: ${warnings}/${total}`);
        console.log(`📈 SUCCESS RATE: ${((passed / total) * 100).toFixed(1)}%`);
        console.log('='.repeat(60) + '\n');

        // Detalles de tests fallidos
        if (failed > 0) {
            console.log('❌ Tests que fallaron:');
            results.filter(r => r.status === 'failed' || r.status === 'fail').forEach(test => {
                console.log(`   - ${test.test_name}: ${test.error_message}`);
            });
            console.log('');
        }
    }

    /**
     * ========================================================================
     * VALIDACIÓN - Helpers de validación comunes
     * ========================================================================
     */

    /**
     * Verificar que un elemento existe en el DOM
     */
    async elementExists(selector) {
        try {
            await this.page.waitForSelector(selector, { timeout: 2000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Obtener texto de un elemento
     */
    async getElementText(selector) {
        try {
            await this.page.waitForSelector(selector, { timeout: 5000 });
            return await this.page.$eval(selector, el => el.textContent.trim());
        } catch (error) {
            console.error(`❌ Error obteniendo texto de ${selector}:`, error.message);
            return null;
        }
    }

    /**
     * Verificar que modal está visible
     */
    async isModalVisible(modalSelector = '.modal') {
        try {
            const modal = await this.page.$(modalSelector);
            if (!modal) return false;

            const isVisible = await this.page.evaluate((sel) => {
                const element = document.querySelector(sel);
                if (!element) return false;
                const style = window.getComputedStyle(element);
                return style.display !== 'none' && style.visibility !== 'hidden';
            }, modalSelector);

            return isVisible;
        } catch {
            return false;
        }
    }
}

module.exports = BaseModuleCollector;
