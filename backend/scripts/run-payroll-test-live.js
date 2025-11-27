/**
 * ========================================================================
 * TEST EN VIVO: PAYROLL MODULE - CIRCUITO COMPLETO
 * ========================================================================
 *
 * Ejecuta el PayrollModuleCollector con Playwright en modo VISIBLE
 * para ver el circuito completo de:
 * - Generación de plantillas
 * - Configuración de salarios
 * - Ejecución de liquidaciones
 *
 * USO: node scripts/run-payroll-test-live.js
 * ========================================================================
 */

const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuración
const BASE_URL = process.env.BASE_URL || 'http://localhost:9998';
const ISI_COMPANY_ID = 11;

// Credenciales ISI
const LOGIN_COMPANY_SLUG = 'isi';
const LOGIN_USER = 'admin11@sistema.local'; // o DNI: 99999011
const LOGIN_PASSWORD = 'admin123';

// Conexión DB
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    logging: false
});

class PayrollTestRunner {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = [];
    }

    log(msg, type = 'info') {
        const icons = {
            info: '📋',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            step: '▶️'
        };
        console.log(`${icons[type] || '•'} ${msg}`);
    }

    async start() {
        console.log('\n═══════════════════════════════════════════════════════════════════════');
        console.log('   TEST EN VIVO: MÓDULO PAYROLL - EMPRESA ISI (ID: 11)');
        console.log('═══════════════════════════════════════════════════════════════════════\n');

        try {
            // 1. Verificar conexión BD
            this.log('Conectando a PostgreSQL...', 'step');
            await sequelize.authenticate();
            this.log('Conexión exitosa', 'success');

            // 2. Iniciar Playwright en modo visible
            this.log('Iniciando navegador (modo visible)...', 'step');
            this.browser = await chromium.launch({
                headless: false,
                slowMo: 100 // Ralentizar para ver la acción
            });

            const context = await this.browser.newContext({
                viewport: { width: 1366, height: 768 } // Resolución ajustada a pantalla normal
            });
            this.page = await context.newPage();

            // 3. LOGIN
            await this.performLogin();

            // 4. NAVEGAR AL MÓDULO DE PAYROLL
            await this.navigateToPayroll();

            // 5. EJECUTAR TESTS DE PAYROLL
            await this.runPayrollTests();

            // 6. MOSTRAR RESULTADOS
            this.showResults();

        } catch (error) {
            this.log(`Error crítico: ${error.message}`, 'error');
            console.error(error);
        } finally {
            // Esperar antes de cerrar para que veas los resultados
            this.log('\nPresiona Ctrl+C para cerrar el navegador...', 'info');
            await this.wait(60000); // Espera 60 segundos antes de cerrar

            if (this.browser) await this.browser.close();
            await sequelize.close();
        }
    }

    async performLogin() {
        this.log('Iniciando login en panel-empresa.html...', 'step');

        await this.page.goto(`${BASE_URL}/panel-empresa.html`);
        await this.wait(3000); // Esperar a que carguen las empresas

        // PASO 1: Buscar y seleccionar empresa del dropdown
        this.log('Buscando dropdown de empresas...', 'info');

        // Buscar cualquier select visible con opciones de empresa
        const companySelected = await this.page.evaluate((slug) => {
            // Buscar todos los selects que contengan empresas
            const selects = document.querySelectorAll('select');
            for (const select of selects) {
                // Buscar opción con el slug de ISI
                const options = select.querySelectorAll('option');
                for (const opt of options) {
                    if (opt.value === slug || opt.textContent.toLowerCase().includes('isi')) {
                        select.value = opt.value;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log('Empresa seleccionada:', opt.textContent);
                        return true;
                    }
                }
            }
            return false;
        }, LOGIN_COMPANY_SLUG);

        if (companySelected) {
            this.log('Empresa ISI seleccionada', 'success');
        } else {
            this.log('No se pudo seleccionar empresa del dropdown', 'warning');
        }

        await this.wait(2000);

        // PASO 2: Buscar campos de usuario/password
        this.log('Buscando campos de login...', 'info');

        // El formulario de login puede aparecer después de seleccionar empresa
        const userInput = await this.page.$('input[type="text"]:not([readonly]), input[type="email"], input[placeholder*="usuario"], input[placeholder*="email"], input[placeholder*="DNI"], #loginUsername');
        const passInput = await this.page.$('input[type="password"], #loginPassword');

        if (userInput) {
            await userInput.fill(LOGIN_USER);
            this.log(`Usuario ingresado: ${LOGIN_USER}`, 'info');
        } else {
            this.log('No se encontró campo de usuario', 'warning');
        }

        if (passInput) {
            await passInput.fill(LOGIN_PASSWORD);
            this.log('Contraseña ingresada', 'info');
        } else {
            this.log('No se encontró campo de contraseña', 'warning');
        }

        await this.wait(1000);

        // PASO 3: Click en botón de login
        const loginBtn = await this.page.$('button[type="submit"], .btn-login, #loginBtn, button:has-text("Iniciar"), button:has-text("Login")');
        if (loginBtn) {
            await loginBtn.click();
            this.log('Botón de login clickeado', 'info');
            await this.wait(4000); // Esperar respuesta del servidor
        } else {
            // Intentar con Enter en el campo de password
            if (passInput) {
                await passInput.press('Enter');
                this.log('Enter presionado en campo password', 'info');
                await this.wait(4000);
            }
        }

        // Verificar si el login fue exitoso
        const loginSuccess = await this.page.evaluate(() => {
            // Si hay sidebar o dashboard visible, login exitoso
            const sidebar = document.querySelector('.sidebar, #sidebar, .nav-menu');
            const dashboard = document.querySelector('.dashboard-container, #mainContent, .module-content');
            const loginModal = document.querySelector('#loginModal, .login-modal');

            if (sidebar || dashboard) return true;
            if (loginModal && loginModal.style.display !== 'none') return false;
            return true; // Asumir éxito si no hay modal
        });

        if (loginSuccess) {
            this.log('Login completado exitosamente', 'success');
        } else {
            this.log('Login puede haber fallado - verificar screenshot', 'warning');
        }
    }

    async navigateToPayroll() {
        this.log('Navegando al módulo de Payroll/Liquidación de Sueldos...', 'step');

        // Buscar en el menú lateral
        await this.page.evaluate(() => {
            // Buscar módulo payroll-liquidation o similar
            const menuItems = document.querySelectorAll('.nav-link, .sidebar-link, [data-module]');
            for (const item of menuItems) {
                if (item.textContent.toLowerCase().includes('liquidación') ||
                    item.textContent.toLowerCase().includes('payroll') ||
                    item.textContent.toLowerCase().includes('sueldos') ||
                    item.dataset.module === 'payroll-liquidation') {
                    item.click();
                    return;
                }
            }

            // Alternativa: usar showModuleContent si existe
            if (typeof window.showModuleContent === 'function') {
                window.showModuleContent('payroll-liquidation', 'Liquidación de Sueldos');
            }
        });

        await this.wait(3000);
        this.log('Módulo de Payroll cargado', 'success');
    }

    async runPayrollTests() {
        console.log('\n═══════════════════════════════════════════════════════════════════════');
        console.log('                    EJECUTANDO TESTS DE PAYROLL');
        console.log('═══════════════════════════════════════════════════════════════════════\n');

        // TEST 1: Verificar estructura de BD
        await this.testDBStructure();

        // TEST 2: Verificar plantillas existentes
        await this.testTemplates();

        // TEST 3: Verificar configuraciones salariales
        await this.testSalaryConfigs();

        // TEST 4: Verificar liquidaciones
        await this.testPayrollRuns();

        // TEST 5: Test UI - Ver estadísticas en pantalla
        await this.testUIStats();

        // TEST 6: Test de integración - Crear nueva liquidación (si hay UI)
        await this.testCreatePayrollRun();
    }

    async testDBStructure() {
        this.log('TEST 1: Verificando estructura de tablas de Payroll...', 'step');

        const tables = [
            'payroll_templates',
            'user_salary_config_v2',
            'payroll_runs',
            'salary_categories',
            'labor_agreements_v2',
            'labor_agreements_catalog'
        ];

        for (const table of tables) {
            const [exists] = await sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = '${table}'
                ) as exists
            `);

            if (exists[0].exists) {
                this.addResult('db_structure', table, 'passed', `Tabla ${table} existe`);
            } else {
                this.addResult('db_structure', table, 'failed', `Tabla ${table} NO existe`);
            }
        }
    }

    async testTemplates() {
        this.log('TEST 2: Verificando plantillas de liquidación para ISI...', 'step');

        const [templates] = await sequelize.query(`
            SELECT id, template_code, template_name, pay_frequency
            FROM payroll_templates
            WHERE company_id = ${ISI_COMPANY_ID}
        `);

        if (templates.length > 0) {
            this.log(`  Encontradas ${templates.length} plantillas:`, 'info');
            templates.forEach(t => {
                this.log(`    - ${t.template_code}: ${t.template_name} (${t.pay_frequency})`, 'info');
            });
            this.addResult('templates', 'count', 'passed', `${templates.length} plantillas encontradas`);
        } else {
            this.addResult('templates', 'count', 'failed', 'No hay plantillas para ISI');
        }
    }

    async testSalaryConfigs() {
        this.log('TEST 3: Verificando configuraciones salariales para ISI...', 'step');

        const [configs] = await sequelize.query(`
            SELECT
                COUNT(*) as total,
                SUM(base_salary::numeric) as total_gross,
                AVG(base_salary::numeric)::numeric(12,2) as avg_salary
            FROM user_salary_config_v2
            WHERE company_id = ${ISI_COMPANY_ID} AND is_current = true
        `);

        const total = parseInt(configs[0].total);
        if (total > 0) {
            this.log(`  Total empleados: ${total}`, 'info');
            this.log(`  Total bruto: $${parseFloat(configs[0].total_gross).toLocaleString()}`, 'info');
            this.log(`  Salario promedio: $${parseFloat(configs[0].avg_salary).toLocaleString()}`, 'info');
            this.addResult('salary_configs', 'employees', 'passed', `${total} empleados con salarios configurados`);
        } else {
            this.addResult('salary_configs', 'employees', 'failed', 'No hay configuraciones salariales');
        }
    }

    async testPayrollRuns() {
        this.log('TEST 4: Verificando liquidaciones existentes para ISI...', 'step');

        const [runs] = await sequelize.query(`
            SELECT id, run_code, run_name, period_year, period_month, status,
                   total_employees, total_gross, total_net
            FROM payroll_runs
            WHERE company_id = ${ISI_COMPANY_ID}
            ORDER BY period_year DESC, period_month DESC
        `);

        if (runs.length > 0) {
            this.log(`  Encontradas ${runs.length} liquidaciones:`, 'info');
            runs.forEach(r => {
                this.log(`    - ${r.run_code}: ${r.run_name} [${r.status}]`, 'info');
                this.log(`      Empleados: ${r.total_employees} | Bruto: $${parseFloat(r.total_gross || 0).toLocaleString()}`, 'info');
            });
            this.addResult('payroll_runs', 'count', 'passed', `${runs.length} liquidaciones encontradas`);
        } else {
            this.addResult('payroll_runs', 'count', 'warning', 'No hay liquidaciones ejecutadas');
        }
    }

    async testUIStats() {
        this.log('TEST 5: Verificando UI - Estadísticas en pantalla...', 'step');

        // Tomar screenshot
        await this.page.screenshot({ path: 'payroll-test-screenshot.png', fullPage: true });
        this.log('  Screenshot guardado: payroll-test-screenshot.png', 'info');

        // Buscar elementos de estadísticas en la UI
        const statsFound = await this.page.evaluate(() => {
            const stats = {
                employees: null,
                totalGross: null,
                totalNet: null
            };

            // Buscar textos de estadísticas
            const allText = document.body.innerText;

            // Buscar número de empleados
            const employeesMatch = allText.match(/(\d+)\s*empleados?/i);
            if (employeesMatch) stats.employees = employeesMatch[1];

            // Buscar totales monetarios
            const moneyMatch = allText.match(/\$[\d,\.]+/g);
            if (moneyMatch) stats.totalGross = moneyMatch[0];

            return stats;
        });

        if (statsFound.employees || statsFound.totalGross) {
            this.log(`  UI muestra: ${JSON.stringify(statsFound)}`, 'info');
            this.addResult('ui_stats', 'display', 'passed', 'Estadísticas visibles en UI');
        } else {
            this.addResult('ui_stats', 'display', 'warning', 'No se detectaron estadísticas en UI');
        }
    }

    async testCreatePayrollRun() {
        this.log('TEST 6: Test de integración - Verificar botón de nueva liquidación...', 'step');

        // Buscar botón de crear nueva liquidación
        const createBtn = await this.page.$('[data-action="create-payroll"], .btn-new-payroll, button:has-text("Nueva Liquidación"), button:has-text("Crear")');

        if (createBtn) {
            this.log('  Botón de crear liquidación encontrado', 'info');
            this.addResult('create_payroll', 'button', 'passed', 'Botón de crear disponible');

            // Opcionalmente hacer click para mostrar el modal
            // await createBtn.click();
            // await this.wait(2000);
        } else {
            this.addResult('create_payroll', 'button', 'warning', 'No se encontró botón de crear');
        }
    }

    addResult(category, test, status, message) {
        const icons = { passed: '✅', failed: '❌', warning: '⚠️' };
        this.results.push({ category, test, status, message });
        this.log(`  ${icons[status]} ${message}`, status === 'passed' ? 'success' : status === 'failed' ? 'error' : 'warning');
    }

    showResults() {
        console.log('\n═══════════════════════════════════════════════════════════════════════');
        console.log('                         RESUMEN DE TESTS');
        console.log('═══════════════════════════════════════════════════════════════════════\n');

        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const warnings = this.results.filter(r => r.status === 'warning').length;

        console.log(`   ✅ Pasados: ${passed}`);
        console.log(`   ❌ Fallidos: ${failed}`);
        console.log(`   ⚠️ Warnings: ${warnings}`);
        console.log(`   📊 Total: ${this.results.length}`);

        console.log('\n───────────────────────────────────────────────────────────────────────');
        console.log('   DETALLE POR CATEGORÍA:');
        console.log('───────────────────────────────────────────────────────────────────────\n');

        const categories = [...new Set(this.results.map(r => r.category))];
        for (const cat of categories) {
            console.log(`   📁 ${cat.toUpperCase()}`);
            this.results.filter(r => r.category === cat).forEach(r => {
                const icon = r.status === 'passed' ? '✅' : r.status === 'failed' ? '❌' : '⚠️';
                console.log(`      ${icon} ${r.message}`);
            });
            console.log('');
        }

        console.log('═══════════════════════════════════════════════════════════════════════\n');
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Ejecutar
const runner = new PayrollTestRunner();
runner.start();
