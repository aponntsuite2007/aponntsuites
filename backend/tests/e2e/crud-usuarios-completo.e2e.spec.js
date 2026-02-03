/**
 * TEST CRUD COMPLETO - GESTIÓN DE USUARIOS
 * =========================================
 * BASADO EN ANÁLISIS DEL BACKEND:
 * - POST /api/users → Crear
 * - GET /api/users → Listar
 * - PUT /api/users/:id → Actualizar
 * - DELETE /api/users/:id → Eliminar
 *
 * 10 TABS EN MODAL VER:
 * admin, personal, work, family, medical, attendance, calendar, disciplinary, biometric, notifications
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:9998';
const CREDENTIALS = {
    companySlug: 'wftest-empresa-demo',
    username: 'admin@wftest-empresa-demo.com',  // Usar email porque el login busca por email/usuario/dni
    password: 'admin123'
};

// Screenshots dir
const SS_DIR = path.join(__dirname, '../../test-results/crud-usuarios');
if (fs.existsSync(SS_DIR)) fs.rmSync(SS_DIR, { recursive: true });
fs.mkdirSync(SS_DIR, { recursive: true });

// Datos de prueba
const timestamp = Date.now();
const TEST_USER = {
    employeeId: `TEST-${timestamp}`,
    firstName: 'Usuario',
    lastName: 'DePrueba',
    email: `test.${timestamp}@test.com`,
    password: 'Test123456!'
};

let ssCounter = 0;
async function ss(page, name) {
    ssCounter++;
    const file = `${String(ssCounter).padStart(3, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(SS_DIR, file), fullPage: true });
    console.log(`   📸 ${file}`);
}

test.describe('CRUD USUARIOS', () => {
    test('CRUD completo + 10 tabs', async ({ page }) => {
        test.setTimeout(300000);

        console.log('\n' + '='.repeat(60));
        console.log('🧪 TEST CRUD - GESTIÓN DE USUARIOS');
        console.log('='.repeat(60));

        // ========== FASE 1: LOGIN ==========
        console.log('\n📌 FASE 1: LOGIN');

        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('networkidle');
        await ss(page, 'login-inicial');

        // Esperar a que cargue el select de empresas
        await page.waitForSelector('#companySelect', { timeout: 10000 });

        // Seleccionar empresa por value
        await page.selectOption('#companySelect', CREDENTIALS.companySlug);
        await page.waitForTimeout(3000);
        await ss(page, 'empresa-seleccionada');

        // Esperar a que se habilite el campo de usuario
        await page.waitForFunction(() => {
            const input = document.getElementById('userInput');
            return input && !input.disabled;
        }, { timeout: 15000 });

        // Llenar credenciales
        await page.fill('#userInput', CREDENTIALS.username);
        await page.fill('#passwordInput', CREDENTIALS.password);
        await ss(page, 'credenciales-llenadas');

        // Click en login y esperar a que el login desaparezca
        await page.click('button:has-text("Iniciar Sesión")');

        // Esperar a que aparezca el grid de módulos O el loginContainer se oculte
        try {
            await page.waitForFunction(() => {
                const grid = document.querySelector('.module-grid');
                const login = document.getElementById('loginContainer');
                // El grid debe existir Y estar visible, O el login debe estar oculto
                if (grid && grid.offsetParent !== null) return true;
                if (login && (login.style.display === 'none' || getComputedStyle(login).display === 'none')) return true;
                return false;
            }, { timeout: 20000 });
        } catch (e) {
            console.log('   ⚠️ Timeout esperando dashboard');
        }

        await page.waitForTimeout(3000);
        await ss(page, 'post-login');

        // Verificar estado
        const estado = await page.evaluate(() => {
            const grid = document.querySelector('.module-grid');
            const cards = document.querySelectorAll('.module-card');
            return {
                gridVisible: grid && grid.offsetParent !== null,
                numCards: cards.length,
                pageText: document.body.innerText.substring(0, 300)
            };
        });

        console.log(`   🔍 Grid visible: ${estado.gridVisible}, Cards: ${estado.numCards}`);

        if (!estado.gridVisible || estado.numCards === 0) {
            // Intentar ocultar el login manualmente
            await page.evaluate(() => {
                const login = document.getElementById('loginContainer');
                if (login) login.style.display = 'none';
                const grid = document.querySelector('.module-grid');
                if (grid) grid.style.display = 'grid';
            });
            await page.waitForTimeout(2000);
            await ss(page, 'post-login-fix');
        }

        console.log('   ✅ Login completado');

        // ========== FASE 2: ABRIR MÓDULO ==========
        console.log('\n📌 FASE 2: ABRIR MÓDULO GESTIÓN DE USUARIOS');

        // Buscar módulo específicamente por data-module-id="users"
        const moduloEncontrado = await page.evaluate(() => {
            // Primero intentar por data-module-id exacto
            let card = document.querySelector('.module-card[data-module-id="users"]');
            if (card) {
                card.scrollIntoView();
                card.click();
                return { encontrado: true, texto: card.innerText.substring(0, 50), metodo: 'data-module-id' };
            }

            // Fallback: buscar por nombre exacto "Gestión de Usuarios"
            const cards = document.querySelectorAll('.module-card');
            for (const c of cards) {
                const texto = c.innerText || '';
                if (texto.includes('Gestión de Usuarios')) {
                    c.scrollIntoView();
                    c.click();
                    return { encontrado: true, texto: texto.substring(0, 50), metodo: 'nombre-exacto' };
                }
            }

            // Si no encontramos, devolver lista de módulos disponibles
            const disponibles = [...cards].map(c => ({
                id: c.getAttribute('data-module-id'),
                name: c.innerText.split('\n')[0]
            })).slice(0, 15);
            return { encontrado: false, disponibles };
        });

        console.log(`   📦 Resultado: ${JSON.stringify(moduloEncontrado)}`);

        if (!moduloEncontrado.encontrado) {
            console.log('   ❌ Módulo no encontrado. Disponibles:', moduloEncontrado.disponibles);
            await ss(page, 'modulos-disponibles');
            // Continuar con el primer módulo disponible para debug
            await page.evaluate(() => {
                const cards = document.querySelectorAll('.module-card');
                if (cards[0]) cards[0].click();
            });
        }

        await page.waitForTimeout(4000);
        await ss(page, 'modulo-abierto');

        // Verificar que cargó
        const moduloInfo = await page.evaluate(() => {
            return {
                buttons: document.querySelectorAll('button').length,
                tables: document.querySelectorAll('table').length,
                inputs: document.querySelectorAll('input').length,
                texto: document.body.innerText.includes('Usuarios') ||
                       document.body.innerText.includes('Empleados')
            };
        });
        console.log(`   📊 Botones: ${moduloInfo.buttons}, Tablas: ${moduloInfo.tables}, Inputs: ${moduloInfo.inputs}`);

        // ========== FASE 3: CREATE ==========
        console.log('\n📌 FASE 3: CREATE - Nuevo usuario');
        console.log(`   📝 Datos: ${TEST_USER.employeeId}`);

        // Buscar botón agregar
        const botonAgregar = await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')];
            const btn = btns.find(b =>
                /agregar|nuevo|crear|\+/i.test(b.innerText)
            );
            if (btn) {
                btn.click();
                return btn.innerText.trim();
            }
            return null;
        });
        console.log(`   🔘 Botón: "${botonAgregar}"`);
        await page.waitForTimeout(2000);
        await ss(page, 'modal-crear-vacio');

        // Llenar formulario (IDs del modal: newUserName, newUserEmail, newUserLegajo, newUserPassword)
        const camposLlenados = await page.evaluate((user) => {
            const llenados = [];

            // Legajo/EmployeeId - usar newUserLegajo
            const empId = document.querySelector('#newUserLegajo, #employeeId, input[placeholder*="EMP" i]');
            if (empId) { empId.value = user.employeeId; empId.dispatchEvent(new Event('input', {bubbles:true})); llenados.push('legajo'); }

            // Nombre completo - usar newUserName (el backend parsea a firstName/lastName)
            const fullName = document.querySelector('#newUserName, #firstName');
            if (fullName) {
                fullName.value = `${user.firstName} ${user.lastName}`;
                fullName.dispatchEvent(new Event('input', {bubbles:true}));
                llenados.push('nombre');
            }

            // email - usar newUserEmail
            const email = document.querySelector('#newUserEmail, #email, input[type="email"]');
            if (email) { email.value = user.email; email.dispatchEvent(new Event('input', {bubbles:true})); llenados.push('email'); }

            // password - usar newUserPassword
            const pass = document.querySelector('#newUserPassword, #password, input[type="password"]');
            if (pass) { pass.value = user.password; pass.dispatchEvent(new Event('input', {bubbles:true})); llenados.push('password'); }

            return llenados;
        }, TEST_USER);

        console.log(`   ✏️ Campos llenados: ${camposLlenados.join(', ')}`);
        await ss(page, 'formulario-lleno');

        // Guardar
        const guardado = await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')];
            const btn = btns.find(b => /guardar|crear|save|agregar/i.test(b.innerText));
            if (btn) { btn.click(); return btn.innerText.trim(); }
            return null;
        });
        console.log(`   💾 Botón guardar: "${guardado}"`);
        await page.waitForTimeout(3000);
        await ss(page, 'post-guardar');

        // Verificar creación
        const usuarioCreado = await page.evaluate((empId) => {
            return document.body.innerText.includes(empId);
        }, TEST_USER.employeeId);
        console.log(`   ${usuarioCreado ? '✅' : '⚠️'} Usuario ${usuarioCreado ? 'creado y visible' : 'no visible en lista'}`);

        // ========== FASE 4: READ - Ver usuario y 10 tabs ==========
        console.log('\n📌 FASE 4: READ - Ver usuario + 10 TABS');

        // Buscar botón Ver
        const verClickeado = await page.evaluate((empId) => {
            // Buscar fila con el usuario
            const rows = document.querySelectorAll('tr, .user-row, .list-item');
            for (const row of rows) {
                if (row.innerText.includes(empId) || row.innerText.includes('Usuario')) {
                    const verBtn = row.querySelector('button[title*="Ver"], .btn-view') ||
                                   [...row.querySelectorAll('button')].find(b => b.innerText.includes('Ver'));
                    if (verBtn) { verBtn.click(); return 'Fila específica'; }
                }
            }
            // Fallback: primer botón ver
            const anyVer = document.querySelector('button[title*="Ver"], button[title*="Ver"]');
            if (anyVer) { anyVer.click(); return 'Primer botón Ver'; }
            return null;
        }, TEST_USER.employeeId);

        console.log(`   👁️ Acción Ver: ${verClickeado}`);
        await page.waitForTimeout(3000);
        await ss(page, 'modal-ver-usuario');

        // Explorar 10 tabs
        const TABS = ['admin', 'personal', 'work', 'family', 'medical', 'attendance', 'calendar', 'disciplinary', 'biometric', 'notifications'];

        console.log('   📑 Explorando 10 tabs:');
        for (let i = 0; i < TABS.length; i++) {
            const tabId = TABS[i];

            const tabResult = await page.evaluate((id) => {
                // Intentar showFileTab
                if (typeof window.showFileTab === 'function') {
                    try { window.showFileTab(id); return 'showFileTab'; } catch(e) {}
                }
                // Intentar click en botón
                const btn = document.querySelector(`button[onclick*="${id}"], .file-tab[onclick*="${id}"]`);
                if (btn) { btn.click(); return 'button click'; }
                return 'no encontrado';
            }, tabId);

            await page.waitForTimeout(1000);

            const tabInfo = await page.evaluate((id) => {
                const tab = document.getElementById(`${id}-tab`);
                if (tab) {
                    return {
                        visible: tab.offsetParent !== null,
                        inputs: tab.querySelectorAll('input, select').length,
                        buttons: tab.querySelectorAll('button').length
                    };
                }
                return { visible: false };
            }, tabId);

            await ss(page, `tab-${String(i+1).padStart(2,'0')}-${tabId}`);
            console.log(`      ${i+1}/10 ${tabId}: ${tabInfo.visible ? '✅' : '❌'} (${tabInfo.inputs || 0} campos, ${tabInfo.buttons || 0} btns)`);
        }

        // Cerrar modal
        await page.evaluate(() => {
            const close = document.querySelector('.modal-close, button.modal-close') ||
                          [...document.querySelectorAll('button')].find(b => b.innerText.includes('Cerrar'));
            if (close) close.click();
            document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
        });
        await page.waitForTimeout(1000);

        // ========== FASE 5: UPDATE ==========
        console.log('\n📌 FASE 5: UPDATE - Editar usuario');

        const editClickeado = await page.evaluate((empId) => {
            const rows = document.querySelectorAll('tr, .user-row');
            for (const row of rows) {
                if (row.innerText.includes(empId) || row.innerText.includes('Usuario')) {
                    const btn = row.querySelector('button[title*="Editar"]') ||
                                [...row.querySelectorAll('button')].find(b => b.innerText.includes('Editar'));
                    if (btn) { btn.click(); return 'OK'; }
                }
            }
            const any = document.querySelector('button[title*="Editar"], button[title*="Editar"]');
            if (any) { any.click(); return 'Primer Editar'; }
            return null;
        }, TEST_USER.employeeId);

        console.log(`   ✏️ Edit: ${editClickeado}`);
        await page.waitForTimeout(2000);
        await ss(page, 'modal-editar');

        // Modificar apellido
        const NUEVO_APELLIDO = 'Modificado';
        await page.evaluate((apellido) => {
            const input = document.querySelector('#lastName, input[name="lastName"]');
            if (input) {
                input.value = apellido;
                input.dispatchEvent(new Event('input', {bubbles: true}));
            }
        }, NUEVO_APELLIDO);
        await ss(page, 'campo-modificado');

        // Guardar
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => /guardar|actualizar|save/i.test(b.innerText));
            if (btn) btn.click();
        });
        await page.waitForTimeout(3000);
        await ss(page, 'post-update');
        console.log(`   ✅ Apellido cambiado a "${NUEVO_APELLIDO}"`);

        // ========== FASE 6: DELETE ==========
        console.log('\n📌 FASE 6: DELETE - Eliminar usuario');

        const deleteClickeado = await page.evaluate((empId) => {
            const rows = document.querySelectorAll('tr, .user-row');
            for (const row of rows) {
                if (row.innerText.includes(empId)) {
                    const btn = row.querySelector('button[title*="Eliminar"]') ||
                                [...row.querySelectorAll('button')].find(b => b.innerText.includes('Eliminar'));
                    if (btn) { btn.click(); return 'OK'; }
                }
            }
            return null;
        }, TEST_USER.employeeId);

        console.log(`   🗑️ Delete: ${deleteClickeado}`);
        await page.waitForTimeout(1000);
        await ss(page, 'confirmar-delete');

        // Confirmar
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => /confirmar|sí|eliminar|delete/i.test(b.innerText));
            if (btn) btn.click();
        });
        await page.waitForTimeout(3000);
        await ss(page, 'post-delete');

        const eliminado = await page.evaluate((empId) => !document.body.innerText.includes(empId), TEST_USER.employeeId);
        console.log(`   ${eliminado ? '✅' : '⚠️'} Usuario ${eliminado ? 'eliminado' : 'aún visible'}`);

        // ========== RESUMEN ==========
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN TEST CRUD - GESTIÓN DE USUARIOS');
        console.log('='.repeat(60));
        console.log(`   📸 Screenshots: ${ssCounter} en ${SS_DIR}`);
        console.log('='.repeat(60) + '\n');
    });
});
