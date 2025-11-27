/**
 * Playwright Test: Ver liquidaciones detalladas en UI
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:9998';
const LOGIN_URL = `${BASE_URL}/panel-administrativo.html`;
const LOGIN_COMPANY_SLUG = 'isi';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class PayrollDetailTest {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async init() {
        console.log('🎭 Iniciando Playwright...');
        this.browser = await chromium.launch({
            headless: false, // Mostrar navegador
            slowMo: 200
        });

        const context = await this.browser.newContext({
            viewport: { width: 1366, height: 768 }
        });

        this.page = await context.newPage();
        console.log('✅ Navegador iniciado');
    }

    async login() {
        console.log('🔐 Navegando a panel administrativo...');
        await this.page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
        await sleep(1000);

        // Si ya está logueado, puede que el panel cargue directamente
        const title = await this.page.title();
        console.log(`   Título: ${title}`);

        // Check if we need to login
        const loginForm = await this.page.$('#login-form, .login-form, form[action*="login"]');
        if (loginForm) {
            console.log('   Formulario de login detectado');

            // Look for company input/select
            const companyInput = await this.page.$('#company, input[name="company"], select[name="company"]');
            if (companyInput) {
                const tagName = await companyInput.evaluate(el => el.tagName);
                if (tagName === 'SELECT') {
                    // Try to select ISI company
                    const selected = await this.page.evaluate((slug) => {
                        const selects = document.querySelectorAll('select');
                        for (const select of selects) {
                            const options = select.querySelectorAll('option');
                            for (const opt of options) {
                                if (opt.value.toLowerCase().includes('isi') ||
                                    opt.textContent.toLowerCase().includes('isi')) {
                                    select.value = opt.value;
                                    select.dispatchEvent(new Event('change', { bubbles: true }));
                                    return true;
                                }
                            }
                        }
                        return false;
                    }, LOGIN_COMPANY_SLUG);
                    console.log(`   Empresa seleccionada: ${selected}`);
                } else {
                    await companyInput.fill(LOGIN_COMPANY_SLUG);
                }
            }

            // Fill username
            const usernameInput = await this.page.$('#username, input[name="username"]');
            if (usernameInput) {
                await usernameInput.fill('admin');
            }

            // Fill password
            const passwordInput = await this.page.$('#password, input[name="password"]');
            if (passwordInput) {
                await passwordInput.fill('admin123');
            }

            // Submit
            const submitBtn = await this.page.$('button[type="submit"], input[type="submit"], .btn-login');
            if (submitBtn) {
                await submitBtn.click();
                await sleep(2000);
            }
        }

        console.log('✅ Login completado');
    }

    async navigateToPayroll() {
        console.log('📊 Navegando a Liquidación de Sueldos...');

        // Click on Liquidación de Sueldos module
        const payrollLink = await this.page.$('text=Liquidación de Sueldos');
        if (payrollLink) {
            await payrollLink.click();
            await sleep(2000);
            console.log('✅ Módulo Liquidación de Sueldos abierto');
        } else {
            // Try by clicking on sidebar or menu
            const sidebarLink = await this.page.$('[data-module="payroll-liquidation"], a[href*="payroll"], .module-card:has-text("Liquidación")');
            if (sidebarLink) {
                await sidebarLink.click();
                await sleep(2000);
            } else {
                console.log('⚠️ No se encontró el enlace a Liquidación');
                // Take screenshot anyway
            }
        }
    }

    async takeScreenshot(name) {
        const path = `C:/Bio/sistema_asistencia_biometrico/backend/${name}.png`;
        await this.page.screenshot({ path, fullPage: false });
        console.log(`📸 Screenshot guardado: ${path}`);
        return path;
    }

    async viewPayrollDetails() {
        console.log('📋 Buscando detalles de liquidación...');

        // Wait for the dashboard to load
        await sleep(2000);

        // Try to find the employees tab or list
        const empleadosTab = await this.page.$('text=Empleados, [data-tab="empleados"], .tab:has-text("Empleados")');
        if (empleadosTab) {
            await empleadosTab.click();
            await sleep(1500);
            console.log('   Tab Empleados clickeado');
        }

        // Scroll down to see more content
        await this.page.evaluate(() => window.scrollTo(0, 500));
        await sleep(500);

        // Take screenshot of payroll view
        await this.takeScreenshot('payroll-detail-screenshot');
    }

    async close() {
        console.log('🔒 Cerrando navegador en 10 segundos...');
        await sleep(10000);
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            await this.init();
            await this.login();
            await sleep(2000);
            await this.takeScreenshot('payroll-after-login');
            await this.navigateToPayroll();
            await this.viewPayrollDetails();
            await this.close();
            console.log('\n✅ Test completado exitosamente');
        } catch (error) {
            console.error('❌ Error:', error.message);
            await this.takeScreenshot('payroll-error');
            if (this.browser) await this.browser.close();
        }
    }
}

const test = new PayrollDetailTest();
test.run();
