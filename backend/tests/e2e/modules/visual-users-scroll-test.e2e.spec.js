/**
 * TEST ESPECÍFICO DE SCROLL EN LOS 10 TABS DEL EXPEDIENTE DE USUARIO
 * Verifica que todos los elementos sean accesibles via scroll
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, '../../../screenshots/users-scroll');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function saveScreenshot(page, name) {
    const filename = `${Date.now()}_${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
    console.log(`📸 ${filename}`);
    return filename;
}

async function login(page) {
    await page.goto(`${BASE_URL}/panel-empresa.html`);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.selectOption('#companySelect', 'isi');
    await page.waitForTimeout(1000);
    await page.fill('#userInput', 'admin');
    await page.fill('#passwordInput', 'admin123');
    await page.click('#loginButton');
    await page.waitForTimeout(6000);

    await page.evaluate(() => {
        const loginContainer = document.getElementById('loginContainer');
        if (loginContainer) loginContainer.style.cssText = 'display: none !important;';
        if (typeof showDashboard === 'function') showDashboard();
    });
    await page.waitForTimeout(2000);
}

async function navigateToUsers(page) {
    await page.evaluate(() => {
        if (typeof showModuleContent === 'function') {
            showModuleContent('users', 'Gestión de Usuarios');
        }
    });
    await page.waitForTimeout(5000);
}

test.describe('Test de Scroll en 10 Tabs del Expediente de Usuario', () => {

    test('Verificar scroll en cada tab del expediente', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(600000);

        await login(page);
        await navigateToUsers(page);

        // Esperar tabla y hacer click en primer usuario
        await page.waitForSelector('.users-table tbody tr', { timeout: 10000 });

        // Buscar y hacer click en botón Ver
        const viewButtons = await page.$$('button[onclick^="viewUser"]');
        if (viewButtons.length > 0) {
            await viewButtons[0].click();
            await page.waitForTimeout(3000);
        } else {
            // Alternativa: buscar por clase
            const altBtn = await page.$('.users-action-btn.view');
            if (altBtn) {
                await altBtn.click();
                await page.waitForTimeout(3000);
            }
        }

        await saveScreenshot(page, '00-expediente-abierto');

        // Verificar que el modal está abierto
        const modal = await page.$('#employeeFileModal');
        expect(modal).not.toBeNull();

        const tabs = [
            { name: 'admin', label: 'Administración' },
            { name: 'personal', label: 'Datos Personales' },
            { name: 'work', label: 'Antecedentes Laborales' },
            { name: 'family', label: 'Grupo Familiar' },
            { name: 'medical', label: 'Antecedentes Médicos' },
            { name: 'attendance', label: 'Asistencias/Permisos' },
            { name: 'calendar', label: 'Calendario' },
            { name: 'disciplinary', label: 'Disciplinarios' },
            { name: 'biometric', label: 'Registro Biométrico' },
            { name: 'notifications', label: 'Notificaciones' }
        ];

        console.log('\n' + '='.repeat(60));
        console.log('📜 ANÁLISIS DE SCROLL EN CADA TAB');
        console.log('='.repeat(60));

        for (const tab of tabs) {
            console.log(`\n📑 Tab: ${tab.label} (${tab.name})`);

            // Cambiar al tab
            await page.evaluate((tabName) => {
                if (typeof showFileTab === 'function') {
                    showFileTab(tabName);
                }
            }, tab.name);
            await page.waitForTimeout(1500);

            // Obtener el contenedor del tab
            const tabContent = await page.$(`#${tab.name}-tab`);

            if (tabContent) {
                // Verificar scroll del tab
                const scrollInfo = await tabContent.evaluate(el => {
                    return {
                        scrollHeight: el.scrollHeight,
                        clientHeight: el.clientHeight,
                        offsetHeight: el.offsetHeight,
                        hasVerticalScroll: el.scrollHeight > el.clientHeight,
                        scrollTop: el.scrollTop,
                        maxScroll: el.scrollHeight - el.clientHeight
                    };
                });

                console.log(`   ScrollHeight: ${scrollInfo.scrollHeight}px`);
                console.log(`   ClientHeight: ${scrollInfo.clientHeight}px`);
                console.log(`   Tiene scroll: ${scrollInfo.hasVerticalScroll ? '✅ SÍ' : '❌ NO'}`);

                if (scrollInfo.hasVerticalScroll) {
                    console.log(`   Max scroll: ${scrollInfo.maxScroll}px`);

                    // Screenshot al inicio
                    await saveScreenshot(page, `${tab.name}-01-top`);

                    // Scroll al 50%
                    await tabContent.evaluate(el => {
                        el.scrollTop = el.scrollHeight / 2;
                    });
                    await page.waitForTimeout(500);
                    await saveScreenshot(page, `${tab.name}-02-middle`);

                    // Scroll al final
                    await tabContent.evaluate(el => {
                        el.scrollTop = el.scrollHeight;
                    });
                    await page.waitForTimeout(500);
                    await saveScreenshot(page, `${tab.name}-03-bottom`);

                    // Contar elementos que están fuera de vista inicialmente
                    const elementsInfo = await tabContent.evaluate(el => {
                        const allElements = el.querySelectorAll('button, input, select, .info-card, h3, h4');
                        const viewportHeight = el.clientHeight;
                        let visibleAtTop = 0;
                        let hiddenBelowFold = 0;

                        allElements.forEach(elem => {
                            const rect = elem.getBoundingClientRect();
                            const elTop = elem.offsetTop;
                            if (elTop < viewportHeight) {
                                visibleAtTop++;
                            } else {
                                hiddenBelowFold++;
                            }
                        });

                        return {
                            totalElements: allElements.length,
                            visibleAtTop,
                            hiddenBelowFold
                        };
                    });

                    console.log(`   Total elementos: ${elementsInfo.totalElements}`);
                    console.log(`   Visibles al inicio: ${elementsInfo.visibleAtTop}`);
                    console.log(`   ⚠️ Ocultos (requieren scroll): ${elementsInfo.hiddenBelowFold}`);

                    // Volver al inicio
                    await tabContent.evaluate(el => el.scrollTop = 0);
                } else {
                    // Sin scroll, solo un screenshot
                    await saveScreenshot(page, `${tab.name}-01-full`);
                }

                // Verificar si hay secciones colapsadas
                const collapsedSections = await tabContent.$$eval('[style*="display: none"], .collapse:not(.show), .hidden', els => els.length);
                if (collapsedSections > 0) {
                    console.log(`   ⚠️ Secciones colapsadas/ocultas: ${collapsedSections}`);
                }

                // Buscar campos de formulario
                const formFields = await tabContent.$$eval('input, select, textarea', fields =>
                    fields.filter(f => f.offsetParent !== null).length
                );
                console.log(`   Campos de formulario visibles: ${formFields}`);

                // Buscar botones de acción
                const actionButtons = await tabContent.$$eval('button', btns =>
                    btns.filter(b => b.offsetParent !== null && b.textContent.trim()).length
                );
                console.log(`   Botones de acción: ${actionButtons}`);

            } else {
                console.log(`   ❌ Tab content no encontrado`);
            }
        }

        // Verificar scroll del modal principal
        console.log('\n' + '='.repeat(60));
        console.log('📜 ANÁLISIS DEL MODAL PRINCIPAL');
        console.log('='.repeat(60));

        const modalScrollInfo = await page.evaluate(() => {
            const modalContent = document.querySelector('#employeeFileModal > div');
            if (!modalContent) return null;

            return {
                scrollHeight: modalContent.scrollHeight,
                clientHeight: modalContent.clientHeight,
                hasScroll: modalContent.scrollHeight > modalContent.clientHeight,
                windowHeight: window.innerHeight
            };
        });

        if (modalScrollInfo) {
            console.log(`Modal ScrollHeight: ${modalScrollInfo.scrollHeight}px`);
            console.log(`Modal ClientHeight: ${modalScrollInfo.clientHeight}px`);
            console.log(`Window Height: ${modalScrollInfo.windowHeight}px`);
            console.log(`Modal tiene scroll: ${modalScrollInfo.hasScroll ? '✅ SÍ' : '❌ NO'}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ ANÁLISIS DE SCROLL COMPLETADO');
        console.log('='.repeat(60));
    });
});
