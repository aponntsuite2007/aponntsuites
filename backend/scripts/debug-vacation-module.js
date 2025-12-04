#!/usr/bin/env node
/**
 * Script de diagnóstico para depurar el módulo de vacaciones
 */

require('dotenv').config();
const { chromium } = require('playwright');

const CONFIG = {
    companySlug: 'isi',
    username: 'admin',
    password: 'admin123',
    baseUrl: 'http://localhost:9998'
};

async function debug() {
    console.log('\n=== DEBUG: Módulo Vacaciones ===\n');

    const browser = await chromium.launch({ headless: false, slowMo: 200 });
    const page = await browser.newPage();

    // Capturar errores de consola
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
        console.log(`[BROWSER ${msg.type()}]`, msg.text());
    });

    page.on('pageerror', error => {
        console.error('[PAGE ERROR]', error.message);
        consoleErrors.push(error.message);
    });

    try {
        // 1. Ir a login
        console.log('1. Navegando a login...');
        await page.goto(`${CONFIG.baseUrl}/panel-empresa.html`);
        await page.waitForTimeout(2000);

        // 2. Login
        console.log('2. Haciendo login...');
        await page.click('#company-select');
        await page.waitForTimeout(500);
        const option = await page.$(`#company-select option[value="${CONFIG.companySlug}"]`);
        if (option) await option.click();
        await page.selectOption('#company-select', CONFIG.companySlug);
        await page.waitForTimeout(500);

        await page.fill('#username', CONFIG.username);
        await page.fill('#password', CONFIG.password);
        await page.click('#loginBtn, button[type="submit"], .login-btn');
        await page.waitForTimeout(3000);

        // 3. Verificar estado global
        console.log('\n3. Verificando estado global...');
        const globalState = await page.evaluate(() => {
            return {
                hasVacationState: typeof window.VacationState !== 'undefined',
                hasVacationAPI: typeof window.VacationAPI !== 'undefined',
                hasVacationEngine: typeof window.VacationEngine !== 'undefined',
                hasShowFunction: typeof window.showVacationManagementContent === 'function',
                mainContentExists: !!document.getElementById('mainContent'),
                vacationScriptLoaded: !!document.querySelector('script[src*="vacation-management"]')
            };
        });
        console.log('Estado global:', JSON.stringify(globalState, null, 2));

        // 4. Intentar cargar módulo vacaciones
        console.log('\n4. Abriendo módulo vacaciones...');

        // Buscar y hacer click en el botón del módulo
        const btnClicked = await page.evaluate(() => {
            const btn = document.querySelector('[onclick*="vacation-management"]');
            if (btn) {
                btn.click();
                return { found: true, onclick: btn.getAttribute('onclick') };
            }
            return { found: false };
        });
        console.log('Botón de vacaciones:', btnClicked);

        await page.waitForTimeout(3000);

        // 5. Verificar resultado
        console.log('\n5. Verificando resultado...');
        const result = await page.evaluate(() => {
            const checks = {
                vacationEnterprise: !!document.querySelector('.vacation-enterprise'),
                vacationApp: !!document.querySelector('#vacation-app'),
                veHeader: !!document.querySelector('.ve-header'),
                veKpiGrid: !!document.querySelector('.ve-kpi-grid'),
                veKpiCards: document.querySelectorAll('.ve-kpi-card').length,
                mainContentHTML: document.getElementById('mainContent')?.innerHTML?.substring(0, 500) || 'NOT FOUND'
            };
            return checks;
        });
        console.log('Resultado de renderizado:', JSON.stringify(result, null, 2));

        // 6. Intentar ejecutar manualmente showVacationManagementContent
        console.log('\n6. Ejecutando showVacationManagementContent manualmente...');
        const manualResult = await page.evaluate(() => {
            try {
                if (typeof showVacationManagementContent === 'function') {
                    showVacationManagementContent();
                    return { success: true };
                }
                return { success: false, error: 'function not found' };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });
        console.log('Resultado manual:', manualResult);

        await page.waitForTimeout(3000);

        // 7. Verificar de nuevo
        console.log('\n7. Verificando de nuevo después de llamada manual...');
        const finalResult = await page.evaluate(() => {
            return {
                veKpiCards: document.querySelectorAll('.ve-kpi-card').length,
                veContent: !!document.querySelector('#ve-content'),
                hasContent: document.getElementById('mainContent')?.innerHTML?.length || 0
            };
        });
        console.log('Resultado final:', finalResult);

        // 8. Mostrar errores
        if (consoleErrors.length > 0) {
            console.log('\n=== ERRORES DE CONSOLA ===');
            consoleErrors.forEach(e => console.log('  -', e));
        }

        console.log('\n=== DEBUG COMPLETO ===');
        console.log('Mantén el navegador abierto para inspección manual.');
        console.log('Presiona Ctrl+C para cerrar.\n');

        // Mantener abierto por 60 segundos
        await page.waitForTimeout(60000);

    } catch (error) {
        console.error('Error durante debug:', error.message);
    } finally {
        await browser.close();
    }
}

debug();
