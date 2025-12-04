#!/usr/bin/env node
/**
 * Script simple para verificar el módulo de vacaciones
 */
require('dotenv').config();
const { chromium } = require('playwright');

async function debug() {
    console.log('\n=== SIMPLE DEBUG: Módulo Vacaciones ===\n');

    const browser = await chromium.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();

    // Capturar errores
    page.on('pageerror', error => console.error('[PAGE ERROR]', error.message));
    page.on('console', msg => {
        if (msg.type() === 'error') console.log('[CONSOLE ERROR]', msg.text());
    });

    try {
        // Ir a la página
        await page.goto('http://localhost:9998/panel-empresa.html');
        await page.waitForTimeout(3000);

        // Login - usar los selectores del test original
        console.log('1. Buscando formulario de login...');

        // Seleccionar empresa ISI
        const companySelect = await page.$('#company-select');
        if (companySelect) {
            await companySelect.selectOption('isi');
            console.log('   Empresa ISI seleccionada');
        }
        await page.waitForTimeout(500);

        // Ingresar credenciales
        await page.fill('#username', 'admin');
        await page.fill('#password', 'admin123');
        console.log('   Credenciales ingresadas');

        // Hacer click en login
        const loginBtn = await page.$('#loginBtn, button[type="submit"]');
        if (loginBtn) await loginBtn.click();
        console.log('   Login clicked');

        await page.waitForTimeout(4000);

        // Verificar si estamos logueados
        const isLoggedIn = await page.evaluate(() => {
            return !!localStorage.getItem('authToken') || !!sessionStorage.getItem('authToken');
        });
        console.log('2. Sesión activa:', isLoggedIn);

        // Verificar estado del módulo vacation
        console.log('\n3. Verificando módulo vacation-management...');
        const moduleState = await page.evaluate(() => {
            return {
                VacationState: typeof window.VacationState !== 'undefined' ? 'DEFINED' : 'UNDEFINED',
                VacationAPI: typeof window.VacationAPI !== 'undefined' ? 'DEFINED' : 'UNDEFINED',
                VacationEngine: typeof window.VacationEngine !== 'undefined' ? 'DEFINED' : 'UNDEFINED',
                showVacationManagementContent: typeof window.showVacationManagementContent === 'function' ? 'FUNCTION' : 'NOT FUNCTION',
                mainContent: document.getElementById('mainContent') ? 'EXISTS' : 'NOT FOUND'
            };
        });
        console.log('   Estado:', JSON.stringify(moduleState, null, 2));

        // Si showVacationManagementContent no está definida, el problema está en la carga del módulo
        if (moduleState.showVacationManagementContent !== 'FUNCTION') {
            console.log('\n⚠️ showVacationManagementContent NO está disponible');
            console.log('   Esto indica que el módulo vacation-management.js NO exportó la función');

            // Ver qué scripts de vacation existen
            const scripts = await page.evaluate(() => {
                const all = Array.from(document.querySelectorAll('script'));
                return all.filter(s => s.src.includes('vacation')).map(s => s.src);
            });
            console.log('   Scripts vacation:', scripts);
        } else {
            console.log('\n✅ showVacationManagementContent está disponible');

            // Intentar llamar la función
            console.log('4. Llamando showVacationManagementContent()...');
            const result = await page.evaluate(() => {
                try {
                    window.showVacationManagementContent();
                    return { success: true };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            });
            console.log('   Resultado:', result);

            await page.waitForTimeout(3000);

            // Verificar si se renderizó el contenido
            const rendered = await page.evaluate(() => {
                return {
                    vacationEnterprise: !!document.querySelector('.vacation-enterprise'),
                    vacationApp: !!document.querySelector('#vacation-app'),
                    veHeader: !!document.querySelector('.ve-header'),
                    veKpiGrid: !!document.querySelector('.ve-kpi-grid'),
                    veKpiCards: document.querySelectorAll('.ve-kpi-card').length,
                    veContent: !!document.querySelector('#ve-content'),
                    mainContentLength: document.getElementById('mainContent')?.innerHTML?.length || 0
                };
            });
            console.log('5. Estado de renderizado:', JSON.stringify(rendered, null, 2));
        }

        console.log('\n=== FIN DEBUG ===');
        console.log('Navegador abierto. Presiona Ctrl+C para cerrar.\n');

        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
}

debug();
