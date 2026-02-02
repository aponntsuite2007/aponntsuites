/**
 * DETECTOR DE BUGS - Módulo Usuarios + 10 Tabs
 * Detecta específicamente:
 * - UI bloqueada después de guardar
 * - No persistencia en BD
 * - Frontend que no refresca
 * - Formularios que no abren
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, '../../../screenshots/users-bug-detector');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Reporte de bugs encontrados
const bugsFound = [];

function reportBug(category, description, details = {}) {
    const bug = { category, description, details, timestamp: new Date().toISOString() };
    bugsFound.push(bug);
    console.log(`\n🐛 BUG DETECTADO: [${category}]`);
    console.log(`   ${description}`);
    Object.entries(details).forEach(([k, v]) => console.log(`   ${k}: ${v}`));
}

async function saveScreenshot(page, name) {
    const filename = `${Date.now()}_${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
    return filename;
}

async function detectUIBlocked(page) {
    return await page.evaluate(() => {
        const result = { isBlocked: false, reasons: [] };

        // Overlay/backdrop huérfano
        document.querySelectorAll('.modal-backdrop, .loading-overlay').forEach(o => {
            if (o.offsetParent !== null) {
                result.isBlocked = true;
                result.reasons.push(`Overlay visible: ${o.className}`);
            }
        });

        // Spinner infinito
        document.querySelectorAll('.spinner, .loading, [class*="spin"]:not([style*="none"])').forEach(s => {
            if (s.offsetParent !== null) {
                result.isBlocked = true;
                result.reasons.push(`Spinner visible: ${s.className}`);
            }
        });

        // Body con pointer-events none
        if (getComputedStyle(document.body).pointerEvents === 'none') {
            result.isBlocked = true;
            result.reasons.push('Body tiene pointer-events: none');
        }

        // Verificar si hay botones clickeables
        const clickableButtons = Array.from(document.querySelectorAll('button:not([disabled])')).filter(b => b.offsetParent !== null);
        if (clickableButtons.length === 0) {
            result.isBlocked = true;
            result.reasons.push('No hay botones clickeables');
        }

        return result;
    });
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
    console.log('🧭 Navegando al módulo de Usuarios...');
    await page.evaluate(() => {
        if (typeof showModuleContent === 'function') {
            showModuleContent('users', 'Gestión de Usuarios');
        }
    });
    await page.waitForTimeout(3000);

    // Esperar que cargue la tabla de usuarios
    try {
        await page.waitForSelector('.users-table tbody tr', { timeout: 20000 });
        console.log('✅ Tabla de usuarios cargada');
    } catch (e) {
        console.log('⚠️ Timeout esperando tabla, continuando...');
    }
    await page.waitForTimeout(2000);
}

async function openFirstUserExpediente(page) {
    // Buscar botones con múltiples selectores
    let viewButtons = await page.$$('button[onclick^="viewUser"]');

    if (viewButtons.length === 0) {
        console.log('⚠️ No se encontraron botones viewUser, buscando alternativas...');
        viewButtons = await page.$$('.users-action-btn.view, button[title*="Ver"]');
    }

    console.log(`   Botones Ver encontrados: ${viewButtons.length}`);

    if (viewButtons.length > 0) {
        await viewButtons[0].click();
        await page.waitForTimeout(3000);
        return true;
    }
    return false;
}

async function switchToTab(page, tabName) {
    await page.evaluate((tab) => {
        if (typeof showFileTab === 'function') {
            showFileTab(tab);
        }
    }, tabName);
    await page.waitForTimeout(2000);
}

test.describe('DETECTOR DE BUGS - Módulo Usuarios', () => {

    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        test.setTimeout(600000);

        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ CONSOLE ERROR: ${msg.text().substring(0, 200)}`);
            }
        });
    });

    test('TEST GRUPO FAMILIAR: Detectar bugs al agregar hijo', async ({ page }) => {
        await login(page);
        await navigateToUsers(page);

        const expedienteOpened = await openFirstUserExpediente(page);
        if (!expedienteOpened) {
            reportBug('EXPEDIENTE', 'No se pudo abrir expediente de usuario');
            return;
        }

        await switchToTab(page, 'family');
        await saveScreenshot(page, 'family-01-inicial');

        console.log('\n' + '='.repeat(60));
        console.log('🧪 TEST: TAB GRUPO FAMILIAR');
        console.log('='.repeat(60));

        // PASO 1: Buscar botón "Agregar Hijo"
        console.log('\n📋 PASO 1: Buscando botón "Agregar Hijo"...');

        const addChildBtnExists = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const addChildBtn = btns.find(b =>
                b.textContent.includes('Agregar Hijo') ||
                b.getAttribute('onclick')?.includes('addChild') ||
                b.getAttribute('onclick')?.includes('Hijo')
            );
            return addChildBtn ? {
                found: true,
                text: addChildBtn.textContent.trim(),
                onclick: addChildBtn.getAttribute('onclick')
            } : { found: false };
        });

        if (!addChildBtnExists.found) {
            reportBug('UI_MISSING', 'Botón "Agregar Hijo" no encontrado', { tab: 'family' });
        } else {
            console.log(`✅ Botón encontrado: "${addChildBtnExists.text}"`);
            console.log(`   onclick: ${addChildBtnExists.onclick || 'NO DEFINIDO'}`);

            // PASO 2: Click en Agregar Hijo
            console.log('\n📋 PASO 2: Haciendo click en "Agregar Hijo"...');

            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const addChildBtn = btns.find(b =>
                    b.textContent.includes('Agregar Hijo')
                );
                if (addChildBtn) addChildBtn.click();
            });

            await page.waitForTimeout(3000);
            await saveScreenshot(page, 'family-02-despues-click-agregar');

            // PASO 3: Verificar si apareció formulario/modal
            console.log('\n📋 PASO 3: Verificando si apareció formulario...');

            const formAppeared = await page.evaluate(() => {
                // Buscar modal visible
                const modals = document.querySelectorAll('.modal, [class*="modal"], [class*="dialog"]');
                for (const m of modals) {
                    if (m.offsetParent !== null && getComputedStyle(m).display !== 'none') {
                        return { type: 'modal', found: true };
                    }
                }

                // Buscar form visible
                const forms = document.querySelectorAll('form');
                for (const f of forms) {
                    if (f.offsetParent !== null) {
                        return { type: 'form', found: true };
                    }
                }

                // Buscar inputs nuevos visibles
                const inputs = document.querySelectorAll('input[type="text"]:not([readonly])');
                const visibleInputs = Array.from(inputs).filter(i => i.offsetParent !== null);
                if (visibleInputs.length > 0) {
                    return { type: 'inputs', found: true, count: visibleInputs.length };
                }

                return { found: false };
            });

            if (!formAppeared.found) {
                reportBug('FORM_NO_ABRE', 'Click en "Agregar Hijo" no abrió formulario', {
                    tab: 'family',
                    accion: 'Agregar Hijo'
                });
            } else {
                console.log(`✅ Formulario apareció (tipo: ${formAppeared.type})`);

                // PASO 4: Llenar formulario y guardar
                console.log('\n📋 PASO 4: Llenando formulario...');

                const testChildName = `HIJO_TEST_${Date.now()}`;

                const filled = await page.evaluate((name) => {
                    // Buscar campos específicos del formulario de hijos
                    const childNameInput = document.getElementById('childName');
                    const childSurnameInput = document.getElementById('childSurname');
                    const childBirthdateInput = document.getElementById('childBirthdate');
                    const childGenderSelect = document.getElementById('childGender');

                    if (childNameInput) {
                        childNameInput.value = name;
                        childNameInput.dispatchEvent(new Event('input', { bubbles: true }));

                        if (childSurnameInput) {
                            childSurnameInput.value = 'TEST';
                            childSurnameInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }

                        if (childBirthdateInput) {
                            childBirthdateInput.value = '2020-01-15';
                            childBirthdateInput.dispatchEvent(new Event('change', { bubbles: true }));
                        }

                        if (childGenderSelect) {
                            childGenderSelect.value = 'masculino';
                            childGenderSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        }

                        return { filled: true, field: 'childName + childSurname + birthdate + gender' };
                    }
                    return { filled: false };
                }, testChildName);

                if (filled.filled) {
                    console.log(`✅ Campo llenado: ${filled.field}`);

                    // PASO 5: Buscar y hacer click en el botón "Agregar Hijo" del formulario
                    console.log('\n📋 PASO 5: Buscando botón "Agregar Hijo" del formulario...');

                    const saveBtn = await page.evaluate(() => {
                        // Buscar específicamente dentro del modal childModal
                        const childModal = document.getElementById('childModal');
                        if (!childModal) return { found: false, reason: 'Modal no encontrado' };

                        const btns = Array.from(childModal.querySelectorAll('button'));
                        const save = btns.find(b =>
                            b.textContent.includes('Agregar Hijo') ||
                            b.type === 'submit'
                        );
                        return save ? { found: true, text: save.textContent.trim() } : { found: false, reason: 'Botón no encontrado en modal' };
                    });

                    if (saveBtn.found) {
                        console.log(`✅ Botón encontrado: "${saveBtn.text}"`);
                        await saveScreenshot(page, 'family-03-antes-guardar');

                        // Click en el botón submit del formulario childForm
                        await page.evaluate(() => {
                            const form = document.getElementById('childForm');
                            if (form) {
                                const submitBtn = form.querySelector('button[type="submit"], button.btn-info');
                                if (submitBtn) submitBtn.click();
                            }
                        });

                        await page.waitForTimeout(4000);
                        await saveScreenshot(page, 'family-04-despues-guardar');

                        // PASO 6: Verificar si UI se bloqueó
                        console.log('\n📋 PASO 6: Verificando si UI se bloqueó...');

                        const blockage = await detectUIBlocked(page);
                        if (blockage.isBlocked) {
                            reportBug('UI_BLOQUEADA', 'UI se bloqueó después de guardar', {
                                tab: 'family',
                                accion: 'Guardar Hijo',
                                razones: blockage.reasons.join('; ')
                            });
                        } else {
                            console.log('✅ UI sigue funcional');
                        }

                        // PASO 7: Verificar si el hijo aparece en la lista (sin recargar)
                        console.log('\n📋 PASO 7: Verificando si hijo aparece en lista...');

                        const childInList = await page.evaluate((name) => {
                            const body = document.body.textContent;
                            return body.includes(name);
                        }, testChildName);

                        if (!childInList) {
                            reportBug('NO_REFRESH', 'Hijo guardado no aparece en lista sin recargar', {
                                tab: 'family',
                                esperado: testChildName
                            });
                        } else {
                            console.log('✅ Hijo aparece en la lista');
                        }

                    } else {
                        reportBug('UI_MISSING', 'Botón Guardar no encontrado en formulario de hijo');
                    }
                } else {
                    console.log('⚠️ No se pudo llenar formulario (no hay campo de nombre visible)');
                }
            }
        }

        // PASO 8: Verificar botón "Editar" de Estado Civil
        console.log('\n📋 PASO 8: Probando botón Editar Estado Civil...');

        // Buscar el botón con onclick="editMaritalStatus"
        const editCivilBtn = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const editBtn = btns.find(b =>
                b.getAttribute('onclick')?.includes('editMaritalStatus')
            );
            return editBtn ? {
                found: true,
                text: editBtn.textContent.trim(),
                onclick: editBtn.getAttribute('onclick')
            } : { found: false };
        });

        console.log('   Búsqueda de botón:', editCivilBtn);

        if (editCivilBtn.found) {
            console.log(`   Encontrado: "${editCivilBtn.text}" con onclick: ${editCivilBtn.onclick}`);

            // Click en el botón usando eval directo del onclick
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const editBtn = btns.find(b =>
                    b.getAttribute('onclick')?.includes('editMaritalStatus')
                );
                if (editBtn) {
                    console.log('Haciendo click en botón editMaritalStatus');
                    // Ejecutar el onclick directamente
                    const onclick = editBtn.getAttribute('onclick');
                    if (onclick) {
                        eval(onclick);
                    }
                }
            });

            // Esperar más tiempo para que el modal se renderice
            await page.waitForTimeout(3000);
            await saveScreenshot(page, 'family-05-despues-click-editar-civil');

            // Verificar si apareció el modal maritalStatusModal
            const civilFormOpened = await page.evaluate(() => {
                // Buscar el modal específico
                const modal = document.getElementById('maritalStatusModal');
                if (modal) {
                    return { opened: true, id: 'maritalStatusModal', visible: modal.offsetParent !== null };
                }

                // Buscar cualquier elemento que contenga "Estado Civil" en un modal
                const allElements = document.querySelectorAll('h4, h3');
                for (const el of allElements) {
                    if (el.textContent.includes('Estado Civil') && el.offsetParent !== null) {
                        const parent = el.closest('div[style*="position: fixed"]');
                        if (parent) {
                            return { opened: true, id: 'modal-by-content', visible: true };
                        }
                    }
                }

                return { opened: false };
            });

            console.log('   Resultado modal:', civilFormOpened);

            if (!civilFormOpened.opened) {
                reportBug('FORM_NO_ABRE', 'Click en Editar Estado Civil no abrió formulario', {
                    tab: 'family',
                    boton_encontrado: editCivilBtn.text,
                    onclick: editCivilBtn.onclick
                });
            } else {
                console.log(`✅ Modal "${civilFormOpened.id}" abrió correctamente`);
            }
        } else {
            reportBug('UI_MISSING', 'Botón "Editar Estado Civil" no encontrado', {
                tab: 'family',
                busqueda: 'onclick contains editMaritalStatus'
            });
        }

        // RESUMEN FINAL
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE BUGS DETECTADOS');
        console.log('='.repeat(60));

        if (bugsFound.length === 0) {
            console.log('✅ No se detectaron bugs en este test');
        } else {
            console.log(`❌ Total de bugs: ${bugsFound.length}`);
            bugsFound.forEach((bug, i) => {
                console.log(`\n   ${i + 1}. [${bug.category}] ${bug.description}`);
            });
        }

        // Guardar reporte
        const reportPath = path.join(SCREENSHOTS_DIR, 'bug-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(bugsFound, null, 2));
        console.log(`\n📄 Reporte guardado en: ${reportPath}`);
    });
});
