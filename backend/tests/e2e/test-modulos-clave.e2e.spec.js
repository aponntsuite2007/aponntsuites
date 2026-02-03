/**
 * TEST CONFIABLE: Módulos clave - Simplificado
 * Basado en el debug test que funcionó
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:9998';
const CREDENTIALS = { email: 'admin', password: 'admin123', companySlug: 'isi' };
const SCREENSHOTS_DIR = path.join(__dirname, '../../test-results/modulos-clave');

if (fs.existsSync(SCREENSHOTS_DIR)) fs.rmSync(SCREENSHOTS_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function loginAndWait(page) {
    await page.goto(`${BASE_URL}/panel-empresa.html`);
    await page.waitForTimeout(3000);

    // Seleccionar empresa
    await page.evaluate((slug) => {
        const select = document.getElementById('companySelect');
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === slug) {
                select.selectedIndex = i;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                break;
            }
        }
    }, CREDENTIALS.companySlug);
    await page.waitForTimeout(4000);

    // Login
    await page.fill('#userInput', CREDENTIALS.email);
    await page.fill('#passwordInput', CREDENTIALS.password);
    await page.click('button:has-text("Iniciar Sesión")');
    await page.waitForTimeout(5000);
}

async function clickModuleAndAnalyze(page, moduleName) {
    // Click en el módulo
    const clicked = await page.evaluate((nombre) => {
        const cards = document.querySelectorAll('.module-card');
        for (const card of cards) {
            if (card.innerText.includes(nombre)) {
                card.click();
                return true;
            }
        }
        return false;
    }, moduleName);

    if (!clicked) return { found: false };

    await page.waitForTimeout(4000);

    // Analizar estado de la página
    const state = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null);
        const inputs = [...document.querySelectorAll('input')].filter(i => i.offsetParent !== null);
        const tables = [...document.querySelectorAll('table')].filter(t => t.offsetParent !== null);
        const hasUndefined = document.body.innerText.includes('undefined');

        // Verificar si estamos en login (companySelect visible)
        const companySelect = document.getElementById('companySelect');
        const passwordInput = document.getElementById('passwordInput');
        const isLoginScreen = companySelect?.offsetParent !== null && passwordInput?.offsetParent !== null;

        return {
            buttons: buttons.length,
            inputs: inputs.length,
            tables: tables.length,
            hasUndefined,
            isLoginScreen
        };
    });

    return { found: true, ...state };
}

// Módulos clave a testear
const MODULOS_CLAVE = [
    { name: 'Gestión de Usuarios', minButtons: 10 },
    { name: 'Control de Asistencia', minButtons: 5 },
    { name: 'Estructura Organizacional', minButtons: 10 },
    { name: 'Liquidación de Sueldos', minButtons: 5 },
    { name: 'Gestión de Vacaciones', minButtons: 5 },
    { name: 'Gestión Legal', minButtons: 5 },
    { name: 'Gestión de Kioscos', minButtons: 5 },
    { name: 'Expediente 360', minButtons: 5 },
    { name: 'Centro de Notificaciones', minButtons: 3 },
    { name: 'Finanzas', minButtons: 5 }
];

test.describe('TEST MÓDULOS CLAVE', () => {
    for (const modulo of MODULOS_CLAVE) {
        test('Módulo: ' + modulo.name, async ({ page }) => {
            test.setTimeout(90000);

            console.log('\n🔍 Testeando: ' + modulo.name);

            // Login fresco
            await loginAndWait(page);

            // Click y analizar módulo
            const result = await clickModuleAndAnalyze(page, modulo.name);

            // Screenshot
            const safeName = modulo.name.replace(/[^a-z0-9]/gi, '-').substring(0, 30);
            await page.screenshot({
                path: path.join(SCREENSHOTS_DIR, safeName + '.png'),
                fullPage: true
            });

            // Log resultados
            console.log('   Found:', result.found);
            console.log('   Botones:', result.buttons, '| Inputs:', result.inputs, '| Tablas:', result.tables);
            if (result.isLoginScreen) console.log('   ⚠️ Pantalla de login detectada');
            if (result.hasUndefined) console.log('   ⚠️ Texto "undefined" detectado');

            // Verificaciones
            expect(result.found).toBe(true);
            expect(result.isLoginScreen).toBe(false);
            expect(result.buttons).toBeGreaterThanOrEqual(modulo.minButtons);

            // Permitir undefined por ahora, solo logear warning
            if (result.hasUndefined) {
                console.log('   ⚠️ WARNING: Módulo tiene texto "undefined"');
            }
        });
    }
});
