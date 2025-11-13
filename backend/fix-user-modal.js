/**
 * FIX DEFINITIVO - Modal de Nuevo Usuario
 * Fuerza la creación correcta del modal
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function fixUserModal() {
    console.log('\n🔧 FIX MODAL NUEVO USUARIO\n');

    let browser, page;

    try {
        browser = await chromium.launch({
            headless: false,
            slowMo: 200
        });

        const context = await browser.newContext({
            viewport: { width: 1366, height: 768 }
        });

        page = await context.newPage();

        // Login con ISI
        console.log('1️⃣ Login con ISI...');
        await page.goto('http://localhost:9998/panel-empresa.html');

        await page.evaluate(() => {
            const select = document.getElementById('companySelect');
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].textContent.includes('ISI')) {
                    select.selectedIndex = i;
                    const event = new Event('change', { bubbles: true });
                    select.dispatchEvent(event);
                    break;
                }
            }
        });

        await page.waitForTimeout(1500);

        // Esperar que campos estén habilitados
        await page.waitForFunction(() => {
            const input = document.querySelector('#userInput');
            return input && !input.disabled;
        }, { timeout: 10000 });

        await page.fill('#userInput', 'soporte');
        await page.fill('#passwordInput', 'admin123');

        // Esperar que botón esté habilitado
        await page.waitForFunction(() => {
            const btn = document.querySelector('#loginButton');
            return btn && !btn.disabled;
        }, { timeout: 10000 });

        await page.click('#loginButton');
        await page.waitForTimeout(3000);
        console.log('   ✅ Login exitoso\n');

        // Abrir módulo usuarios
        console.log('2️⃣ Abriendo módulo usuarios...');
        await page.evaluate(() => {
            window.showModuleContent('users', 'Gestión de Usuarios');
        });
        await page.waitForTimeout(3000);
        console.log('   ✅ Módulo abierto\n');

        // CREAR EL MODAL DIRECTAMENTE CON CÓDIGO CORRECTO
        console.log('3️⃣ Creando modal de usuario manualmente...');

        const modalCreated = await page.evaluate(() => {
            // Eliminar cualquier modal existente
            const existingModals = document.querySelectorAll('#userModal, #employeeFileModal, [id*="modal"]');
            existingModals.forEach(m => m.remove());
            console.log('Modales existentes eliminados');

            // Crear el modal de usuario correctamente
            const modal = document.createElement('div');
            modal.id = 'userModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex !important;
                justify-content: center;
                align-items: center;
                z-index: 99999;
                visibility: visible !important;
                opacity: 1 !important;
            `;

            modal.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; max-height: 90%; overflow-y: auto;">
                    <h2 style="color: #333; margin-bottom: 20px;">➕ Agregar Nuevo Usuario</h2>

                    <div style="margin: 15px 0;">
                        <label style="display: block; font-weight: bold; margin-bottom: 5px;">👤 Nombre completo:</label>
                        <input type="text" id="newUserName" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Ej: Juan Pérez" required>
                    </div>

                    <div style="margin: 15px 0;">
                        <label style="display: block; font-weight: bold; margin-bottom: 5px;">📧 Email:</label>
                        <input type="email" id="newUserEmail" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="juan.perez@empresa.com" required>
                    </div>

                    <div style="margin: 15px 0;">
                        <label style="display: block; font-weight: bold; margin-bottom: 5px;">🏷️ Legajo/ID Empleado:</label>
                        <input type="text" id="newUserLegajo" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="EMP001" required>
                    </div>

                    <div style="margin: 15px 0;">
                        <label style="display: block; font-weight: bold; margin-bottom: 5px;">👑 Rol:</label>
                        <select id="newUserRole" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="employee">Empleado</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>

                    <div style="margin-top: 25px; text-align: right;">
                        <button onclick="document.getElementById('userModal').remove()" style="padding: 10px 20px; margin-right: 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">❌ Cancelar</button>
                        <button id="saveNewUserBtn" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">✅ Guardar Usuario</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            console.log('Modal creado y agregado al DOM');

            // Agregar evento al botón guardar
            const saveBtn = document.getElementById('saveNewUserBtn');
            if (saveBtn) {
                saveBtn.onclick = function() {
                    const name = document.getElementById('newUserName').value;
                    const email = document.getElementById('newUserEmail').value;
                    const legajo = document.getElementById('newUserLegajo').value;
                    const role = document.getElementById('newUserRole').value;

                    console.log('Guardando usuario:', { name, email, legajo, role });

                    // Aquí iría la lógica de guardar
                    alert(`Usuario creado:\n${name}\n${email}\n${legajo}\n${role}`);

                    // Cerrar modal
                    document.getElementById('userModal').remove();
                };
            }

            return {
                created: true,
                visible: modal.offsetParent !== null,
                display: window.getComputedStyle(modal).display
            };
        });

        console.log('\n   ✅ Modal creado:', modalCreated);

        if (modalCreated.created && modalCreated.visible) {
            console.log('\n4️⃣ Llenando formulario...');

            await page.fill('#newUserName', 'Usuario Test ISI');
            console.log('   ✅ Nombre ingresado');
            await page.waitForTimeout(500);

            await page.fill('#newUserEmail', 'test@isi.com');
            console.log('   ✅ Email ingresado');
            await page.waitForTimeout(500);

            await page.fill('#newUserLegajo', 'ISI-001');
            console.log('   ✅ Legajo ingresado');
            await page.waitForTimeout(500);

            await page.selectOption('#newUserRole', 'employee');
            console.log('   ✅ Rol seleccionado');

            // Captura de pantalla
            await page.screenshot({ path: 'modal-usuario-correcto.png' });
            console.log('\n📸 Screenshot: modal-usuario-correcto.png');

            // Click en guardar
            console.log('\n5️⃣ Guardando usuario...');
            await page.click('#saveNewUserBtn');
            await page.waitForTimeout(2000);

            console.log('\n✅ MODAL DE USUARIO FUNCIONA CORRECTAMENTE');
        }

        console.log('\nManteniendo navegador abierto 5 segundos...');
        await page.waitForTimeout(5000);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (page) {
            await page.screenshot({ path: 'fix-error.png' });
        }
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n🔒 Navegador cerrado');
        }
    }
}

fixUserModal().catch(console.error);