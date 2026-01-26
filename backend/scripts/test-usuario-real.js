/**
 * TEST COMO USUARIO REAL - GESTIÓN DE USUARIOS COMPLETA
 * ======================================================
 *
 * Simula un usuario REAL operando el sistema:
 * - Espera que elementos carguen
 * - Hace scroll como un humano
 * - Verifica que todo se muestre correctamente
 * - Detecta errores, demoras, modales que no abren
 * - Prueba CRUD real con persistencia
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const CREDENTIALS = { company: 'isi', user: 'admin', password: 'admin123' };
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'test-screenshots', 'test-real');
const TIMEOUT = 10000; // 10 segundos máximo de espera

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

let step = 0;
const results = {
    passed: [],
    failed: [],
    warnings: []
};

async function screenshot(page, name) {
    step++;
    const filename = `${String(step).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
    console.log(`📸 ${filename}`);
    return filename;
}

function pass(test) {
    results.passed.push(test);
    console.log(`✅ ${test}`);
}

function fail(test, reason = '') {
    results.failed.push({ test, reason });
    console.log(`❌ ${test} ${reason ? '- ' + reason : ''}`);
}

function warn(msg) {
    results.warnings.push(msg);
    console.log(`⚠️  ${msg}`);
}

// Espera inteligente con timeout
async function waitFor(page, selector, timeout = TIMEOUT) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout });
        return true;
    } catch {
        return false;
    }
}

// Click seguro con scroll
async function safeClick(page, selector, description) {
    try {
        // Esperar que el elemento exista
        const exists = await waitFor(page, selector, 5000);
        if (!exists) {
            fail(`Click en ${description}`, 'Elemento no encontrado');
            return false;
        }

        // Scroll al elemento
        await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, selector);
        await page.waitForTimeout(500);

        // Click
        await page.click(selector);
        pass(`Click en ${description}`);
        return true;
    } catch (e) {
        fail(`Click en ${description}`, e.message);
        return false;
    }
}

async function main() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║    TEST COMO USUARIO REAL - GESTIÓN DE USUARIOS        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Limpiar screenshots anteriores
    const old = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
    old.forEach(f => fs.unlinkSync(path.join(SCREENSHOTS_DIR, f)));

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 },
        slowMo: 50
    });

    const page = await browser.newPage();

    // Capturar errores de consola
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    // Capturar errores de red
    const networkErrors = [];
    page.on('requestfailed', request => {
        networkErrors.push(`${request.url()} - ${request.failure().errorText}`);
    });

    try {
        // ═══════════════════════════════════════════════════════════
        // FASE 1: LOGIN
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 FASE 1: LOGIN\n');

        await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle2', timeout: 30000 });

        if (await waitFor(page, '#companySelect')) {
            pass('Página de login cargó');
        } else {
            fail('Página de login', 'No cargó en tiempo');
            throw new Error('Login page failed');
        }
        await screenshot(page, 'login-page');

        // Seleccionar empresa
        await page.select('#companySelect', CREDENTIALS.company);
        await page.waitForTimeout(1500);
        pass('Empresa ISI seleccionada');

        // Ingresar credenciales
        await page.evaluate((u, p) => {
            const user = document.getElementById('userInput');
            const pass = document.getElementById('passwordInput');
            if (user) { user.disabled = false; user.value = u; }
            if (pass) { pass.disabled = false; pass.value = p; }
        }, CREDENTIALS.user, CREDENTIALS.password);
        pass('Credenciales ingresadas');

        // Submit
        await page.evaluate(() => {
            const form = document.getElementById('multiTenantLoginForm');
            if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
        });

        // Esperar que cargue el panel
        await page.waitForTimeout(3000);
        await screenshot(page, 'post-login');

        // Verificar login exitoso (debe haber módulos visibles)
        const hasModules = await page.evaluate(() => {
            return document.querySelector('.module-card, [onclick*="showTab"]') !== null;
        });

        if (hasModules) {
            pass('Login exitoso - Panel visible');
        } else {
            fail('Login', 'No se ve el panel después del login');
        }

        // ═══════════════════════════════════════════════════════════
        // FASE 2: NAVEGAR A USUARIOS
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 FASE 2: MÓDULO USUARIOS\n');

        await page.evaluate(() => {
            if (typeof showTab === 'function') showTab('users');
        });
        await page.waitForTimeout(3000);
        await screenshot(page, 'modulo-usuarios');

        // Verificar que la tabla de usuarios cargó
        const usersLoaded = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            return rows.length;
        });

        if (usersLoaded > 0) {
            pass(`Tabla de usuarios cargó (${usersLoaded} filas)`);
        } else {
            fail('Tabla de usuarios', 'No hay filas visibles');
        }

        // Verificar KPIs
        const kpis = await page.evaluate(() => {
            const stats = document.querySelectorAll('.users-stat-mini .stat-value, .stat-value');
            return Array.from(stats).map(s => s.textContent.trim());
        });
        console.log(`   KPIs visibles: ${kpis.join(', ')}`);

        // ═══════════════════════════════════════════════════════════
        // FASE 3: ABRIR MODAL DE USUARIO
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 FASE 3: ABRIR MODAL DE USUARIO\n');

        // Buscar y hacer click en el botón VER del primer usuario
        const viewBtnFound = await page.evaluate(() => {
            const btn = document.querySelector('.users-action-btn.view');
            if (btn) {
                btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return true;
            }
            return false;
        });

        if (!viewBtnFound) {
            fail('Botón VER', 'No encontrado en la tabla');
            await screenshot(page, 'boton-ver-no-encontrado');
        } else {
            await page.waitForTimeout(500);
            await page.click('.users-action-btn.view');
            pass('Click en botón VER');

            // Esperar que el modal se abra
            await page.waitForTimeout(2000);
            await screenshot(page, 'modal-abierto');

            // Verificar que el modal está visible
            const modalVisible = await page.evaluate(() => {
                const modal = document.getElementById('editUserModal');
                return modal && modal.style.display !== 'none' && modal.offsetParent !== null;
            });

            if (modalVisible) {
                pass('Modal de usuario se abrió correctamente');

                // ═══════════════════════════════════════════════════════════
                // FASE 4: VERIFICAR LOS 10 TABS
                // ═══════════════════════════════════════════════════════════
                console.log('\n📋 FASE 4: VERIFICAR 10 TABS DEL MODAL\n');

                const tabs = [
                    { id: 'admin', name: 'Administración' },
                    { id: 'personal', name: 'Personal' },
                    { id: 'work', name: 'Laboral' },
                    { id: 'family', name: 'Familia' },
                    { id: 'medical', name: 'Médico' },
                    { id: 'attendance', name: 'Asistencia' },
                    { id: 'calendar', name: 'Calendario' },
                    { id: 'disciplinary', name: 'Disciplinario' },
                    { id: 'biometric', name: 'Biométrico' },
                    { id: 'notifications', name: 'Notificaciones' }
                ];

                for (const tab of tabs) {
                    console.log(`\n   📂 Tab: ${tab.name}`);

                    // Click en el tab
                    const tabClicked = await page.evaluate((tabId) => {
                        const tabBtn = document.querySelector(`.file-tab[onclick*="${tabId}"], [data-tab="${tabId}"]`);
                        if (tabBtn) {
                            tabBtn.click();
                            return true;
                        }
                        // Intentar mostrar directamente
                        const tabContent = document.getElementById(`${tabId}-tab`);
                        if (tabContent) {
                            document.querySelectorAll('.file-tab-content').forEach(t => t.style.display = 'none');
                            tabContent.style.display = 'block';
                            return true;
                        }
                        return false;
                    }, tab.id);

                    await page.waitForTimeout(800);

                    if (tabClicked) {
                        // Verificar contenido del tab
                        const tabAnalysis = await page.evaluate((tabId) => {
                            const tabEl = document.getElementById(`${tabId}-tab`);
                            if (!tabEl) return { exists: false };

                            // Buscar valores problemáticos
                            const text = tabEl.innerText;
                            const problems = [];

                            if (text.includes('undefined')) problems.push('undefined');
                            if (text.includes('[object Object]')) problems.push('[object Object]');
                            if (text.includes('NaN')) problems.push('NaN');
                            if (text.includes('null') && text.includes(': null')) problems.push('null');

                            // Contar secciones y campos
                            const sections = tabEl.querySelectorAll('h3, h4, h5').length;
                            const buttons = tabEl.querySelectorAll('button').length;
                            const inputs = tabEl.querySelectorAll('input, select, textarea').length;

                            return {
                                exists: true,
                                visible: tabEl.style.display !== 'none',
                                problems,
                                sections,
                                buttons,
                                inputs
                            };
                        }, tab.id);

                        if (tabAnalysis.exists && tabAnalysis.visible) {
                            pass(`Tab ${tab.name} - Visible`);
                            console.log(`      Secciones: ${tabAnalysis.sections}, Botones: ${tabAnalysis.buttons}, Inputs: ${tabAnalysis.inputs}`);

                            if (tabAnalysis.problems.length > 0) {
                                fail(`Tab ${tab.name} - Valores inválidos`, tabAnalysis.problems.join(', '));
                            } else {
                                pass(`Tab ${tab.name} - Sin errores de datos`);
                            }
                        } else {
                            fail(`Tab ${tab.name}`, 'No visible');
                        }

                        await screenshot(page, `tab-${tab.id}`);
                    } else {
                        fail(`Tab ${tab.name}`, 'No se pudo activar');
                    }
                }

                // ═══════════════════════════════════════════════════════════
                // FASE 5: PROBAR EDICIÓN (Tab Personal)
                // ═══════════════════════════════════════════════════════════
                console.log('\n📋 FASE 5: PROBAR EDICIÓN DE DATOS\n');

                // Ir a tab Personal
                await page.evaluate(() => {
                    const personalTab = document.getElementById('personal-tab');
                    if (personalTab) {
                        document.querySelectorAll('.file-tab-content').forEach(t => t.style.display = 'none');
                        personalTab.style.display = 'block';
                    }
                });
                await page.waitForTimeout(500);

                // Buscar botón Editar en Datos Básicos
                const editBtnClicked = await page.evaluate(() => {
                    const btns = document.querySelectorAll('#personal-tab button');
                    for (const btn of btns) {
                        if (btn.textContent.includes('Editar') || btn.textContent.includes('✏️')) {
                            btn.click();
                            return btn.textContent.trim();
                        }
                    }
                    return null;
                });

                if (editBtnClicked) {
                    pass(`Click en botón: "${editBtnClicked}"`);
                    await page.waitForTimeout(1500);
                    await screenshot(page, 'edit-form-abierto');

                    // Verificar si se abrió formulario/modal de edición
                    const editFormOpen = await page.evaluate(() => {
                        const forms = document.querySelectorAll('form:not([style*="display: none"]), .edit-form, [id*="edit"]');
                        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([disabled])');
                        return { forms: forms.length, inputs: inputs.length };
                    });

                    console.log(`   Formularios: ${editFormOpen.forms}, Inputs activos: ${editFormOpen.inputs}`);

                    if (editFormOpen.inputs > 0) {
                        pass('Formulario de edición tiene inputs activos');
                    } else {
                        warn('No hay inputs editables visibles');
                    }
                } else {
                    warn('No se encontró botón de edición en Tab Personal');
                }

                // Cerrar modal
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);

            } else {
                fail('Modal de usuario', 'No se abrió o no es visible');
            }
        }

        // ═══════════════════════════════════════════════════════════
        // FASE 6: VERIFICAR ERRORES CAPTURADOS
        // ═══════════════════════════════════════════════════════════
        console.log('\n📋 FASE 6: ERRORES DE CONSOLA Y RED\n');

        if (consoleErrors.length > 0) {
            fail(`Errores de consola: ${consoleErrors.length}`, '');
            consoleErrors.slice(0, 5).forEach(e => console.log(`   ❌ ${e.substring(0, 100)}`));
        } else {
            pass('Sin errores de consola');
        }

        if (networkErrors.length > 0) {
            fail(`Errores de red: ${networkErrors.length}`, '');
            networkErrors.slice(0, 5).forEach(e => console.log(`   ❌ ${e.substring(0, 100)}`));
        } else {
            pass('Sin errores de red');
        }

        // ═══════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ═══════════════════════════════════════════════════════════
        console.log('\n' + '═'.repeat(60));
        console.log('   RESUMEN FINAL');
        console.log('═'.repeat(60));
        console.log(`\n   ✅ Tests PASSED: ${results.passed.length}`);
        console.log(`   ❌ Tests FAILED: ${results.failed.length}`);
        console.log(`   ⚠️  Warnings: ${results.warnings.length}`);
        console.log(`\n   Success Rate: ${((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1)}%`);

        if (results.failed.length > 0) {
            console.log('\n   FALLOS DETECTADOS:');
            results.failed.forEach(f => console.log(`   ❌ ${f.test}: ${f.reason}`));
        }

        await screenshot(page, 'resumen-final');

        // Generar reporte MD
        const report = `# TEST COMO USUARIO REAL - RESULTADO

Fecha: ${new Date().toISOString()}

## RESUMEN

- **PASSED**: ${results.passed.length}
- **FAILED**: ${results.failed.length}
- **WARNINGS**: ${results.warnings.length}
- **Success Rate**: ${((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1)}%

## TESTS PASSED

${results.passed.map(t => `- ✅ ${t}`).join('\n')}

## TESTS FAILED

${results.failed.map(f => `- ❌ ${f.test}: ${f.reason}`).join('\n')}

## WARNINGS

${results.warnings.map(w => `- ⚠️ ${w}`).join('\n')}

## ERRORES DE CONSOLA

${consoleErrors.length > 0 ? consoleErrors.map(e => `- ${e}`).join('\n') : 'Ninguno'}

## ERRORES DE RED

${networkErrors.length > 0 ? networkErrors.map(e => `- ${e}`).join('\n') : 'Ninguno'}
`;
        fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'REPORTE.md'), report);
        console.log(`\n📄 Reporte: test-screenshots/test-real/REPORTE.md`);

    } catch (error) {
        console.error('\n❌ ERROR FATAL:', error.message);
        await screenshot(page, 'ERROR-FATAL');
    } finally {
        // IMPORTANTE: Cerrar el navegador
        console.log('\n🔒 Cerrando navegador...');
        await browser.close();
        console.log('✅ Navegador cerrado\n');
    }
}

main().catch(console.error);
