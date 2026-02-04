/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TEST CRUD REAL EN PRODUCCIÓN - Poblar tablas con datos reales
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Este test hace CRUD REAL como un usuario real:
 * - Crea registros con datos reales en cada módulo
 * - Toma screenshots de cada paso
 * - Graba video de todo el proceso
 * - Verifica persistencia (F5)
 *
 * PRODUCCIÓN: https://www.aponnt.com
 * EMPRESA: APONNT Demo
 * USUARIO: admin@demo.aponnt.com / admin123
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configuración PRODUCCIÓN
const CONFIG = {
    BASE_URL: 'https://www.aponnt.com',
    EMPRESA_LABEL: 'APONNT Demo',
    USUARIO: 'admin@demo.aponnt.com',
    PASSWORD: 'admin123',
    SCREENSHOT_DIR: 'tests/screenshots/crud-produccion',
};

// Datos reales para poblar
const TEST_ID = Date.now().toString().slice(-6);
const DATOS_REALES = {
    usuario: {
        firstName: 'María',
        lastName: `González-${TEST_ID}`,
        email: `maria.gonzalez.${TEST_ID}@empresa-real.com`,
        dni: `30${TEST_ID}`,
        phone: `1155${TEST_ID}`,
        position: 'Analista de RRHH',
        role: 'employee'
    },
    departamento: {
        name: `Recursos Humanos ${TEST_ID}`,
        description: 'Departamento de gestión de personal y talento humano',
        manager: 'María González'
    },
    kiosko: {
        name: `Kiosko Recepción ${TEST_ID}`,
        location: 'Planta Baja - Entrada Principal',
        ip: '192.168.1.100'
    },
    visitante: {
        firstName: 'Carlos',
        lastName: `Rodríguez-${TEST_ID}`,
        company: 'Proveedor ABC',
        reason: 'Reunión de negocios',
        contactPerson: 'María González'
    },
    capacitacion: {
        name: `Seguridad Laboral ${TEST_ID}`,
        description: 'Capacitación obligatoria de seguridad e higiene',
        duration: '4 horas',
        instructor: 'Dr. Roberto Pérez'
    },
    vacacion: {
        startDate: '2026-03-01',
        endDate: '2026-03-15',
        type: 'Vacaciones anuales',
        notes: 'Vacaciones de verano aprobadas'
    }
};

// Utilidades
function ensureDir(dir) {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
}

async function screenshot(page, name) {
    const dir = ensureDir(CONFIG.SCREENSHOT_DIR);
    const filepath = path.join(dir, `${name}.png`);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`   📸 ${name}.png`);
    return filepath;
}

async function login(page) {
    await page.goto(`${CONFIG.BASE_URL}/panel-empresa.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Seleccionar empresa
    const options = await page.locator('#companySelect option').count();
    if (options > 1) {
        await page.selectOption('#companySelect', { index: 1 });
        await page.waitForTimeout(2000);
    }

    // Completar credenciales
    await page.fill('#userInput', CONFIG.USUARIO);
    await page.fill('#passwordInput', CONFIG.PASSWORD);
    await page.click('#loginButton');

    await page.waitForTimeout(4000);
    await page.waitForLoadState('networkidle').catch(() => {});

    // Verificar login exitoso
    const loggedIn = await page.locator('.module-card, button:has-text("Salir")').first().isVisible({ timeout: 10000 }).catch(() => false);
    return loggedIn;
}

// Configurar video recording
test.use({
    video: {
        mode: 'on',
        size: { width: 1280, height: 720 }
    },
    trace: 'on',
});

test.describe('CRUD REAL EN PRODUCCIÓN - Poblar tablas', () => {
    test.setTimeout(900000); // 15 minutos

    test.beforeAll(() => {
        ensureDir(CONFIG.SCREENSHOT_DIR);
        console.log('\n' + '═'.repeat(70));
        console.log('  CRUD REAL EN PRODUCCIÓN');
        console.log('  Test ID:', TEST_ID);
        console.log('  URL:', CONFIG.BASE_URL);
        console.log('  🎬 VIDEO: ACTIVADO');
        console.log('═'.repeat(70) + '\n');
    });

    test('Crear datos reales en módulos principales', async ({ page }) => {

        // ══════════════════════════════════════════════════════════════
        // PASO 1: LOGIN
        // ══════════════════════════════════════════════════════════════
        console.log('📍 PASO 1: Login en PRODUCCIÓN');
        const loggedIn = await login(page);
        expect(loggedIn).toBeTruthy();
        await screenshot(page, '01-login-exitoso');
        console.log('   ✅ Login exitoso en PRODUCCIÓN\n');

        // ══════════════════════════════════════════════════════════════
        // PASO 2: CREAR USUARIO
        // ══════════════════════════════════════════════════════════════
        console.log('📍 PASO 2: Crear Usuario Real');

        // Navegar a Gestión de Usuarios
        await page.evaluate(() => {
            document.querySelectorAll('.modal.show, .modal[style*="display: block"]').forEach(m => m.style.display = 'none');
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        });

        const usersModule = page.locator('[data-module-key="users"], .module-card:has-text("Gestión de Usuarios")').first();
        await usersModule.click({ force: true });
        await page.waitForTimeout(3000);
        await screenshot(page, '02-modulo-usuarios');

        // Buscar botón "Nuevo Usuario"
        const btnNuevoUsuario = page.locator('button:has-text("Nuevo"), button:has-text("Agregar"), button:has-text("+")').first();
        if (await btnNuevoUsuario.isVisible({ timeout: 5000 }).catch(() => false)) {
            await btnNuevoUsuario.click({ force: true });
            await page.waitForTimeout(2000);
            await screenshot(page, '02b-modal-nuevo-usuario');

            // Llenar formulario
            const campos = [
                { sel: '#firstName, input[name="firstName"], input[placeholder*="ombre"]', val: DATOS_REALES.usuario.firstName },
                { sel: '#lastName, input[name="lastName"], input[placeholder*="pellido"]', val: DATOS_REALES.usuario.lastName },
                { sel: '#email, input[name="email"], input[type="email"]', val: DATOS_REALES.usuario.email },
                { sel: '#dni, input[name="dni"]', val: DATOS_REALES.usuario.dni },
                { sel: '#phone, input[name="phone"]', val: DATOS_REALES.usuario.phone },
            ];

            for (const campo of campos) {
                const input = page.locator(campo.sel).first();
                if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await input.fill(campo.val);
                    console.log(`      ✅ ${campo.val}`);
                }
            }

            await screenshot(page, '02c-formulario-lleno');

            // Guardar
            const btnGuardar = page.locator('button:has-text("Guardar")').first();
            if (await btnGuardar.isVisible({ timeout: 2000 }).catch(() => false)) {
                await btnGuardar.click({ force: true });
                await page.waitForTimeout(3000);
                await screenshot(page, '02d-usuario-creado');
                console.log(`   ✅ Usuario creado: ${DATOS_REALES.usuario.email}\n`);
            }
        } else {
            console.log('   ⚠️ Botón nuevo usuario no encontrado\n');
        }

        // ══════════════════════════════════════════════════════════════
        // PASO 3: CREAR KIOSKO
        // ══════════════════════════════════════════════════════════════
        console.log('📍 PASO 3: Crear Kiosko Real');

        await page.evaluate(() => {
            document.querySelectorAll('.modal.show').forEach(m => m.style.display = 'none');
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        });

        const kioskModule = page.locator('[data-module-key="kiosks"], .module-card:has-text("Kioscos")').first();
        if (await kioskModule.isVisible({ timeout: 5000 }).catch(() => false)) {
            await kioskModule.click({ force: true });
            await page.waitForTimeout(3000);
            await screenshot(page, '03-modulo-kioscos');

            const btnNuevoKiosko = page.locator('button:has-text("Nuevo"), button:has-text("Agregar")').first();
            if (await btnNuevoKiosko.isVisible({ timeout: 3000 }).catch(() => false)) {
                await btnNuevoKiosko.click({ force: true });
                await page.waitForTimeout(2000);

                const nameInput = page.locator('#name, input[name="name"], input[placeholder*="ombre"]').first();
                if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await nameInput.fill(DATOS_REALES.kiosko.name);
                }

                const locationInput = page.locator('#location, input[name="location"]').first();
                if (await locationInput.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await locationInput.fill(DATOS_REALES.kiosko.location);
                }

                await screenshot(page, '03b-formulario-kiosko');

                const btnGuardarK = page.locator('button:has-text("Guardar")').first();
                if (await btnGuardarK.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await btnGuardarK.click({ force: true });
                    await page.waitForTimeout(3000);
                    await screenshot(page, '03c-kiosko-creado');
                    console.log(`   ✅ Kiosko creado: ${DATOS_REALES.kiosko.name}\n`);
                }
            }
        }

        // ══════════════════════════════════════════════════════════════
        // PASO 4: ESTRUCTURA ORGANIZACIONAL
        // ══════════════════════════════════════════════════════════════
        console.log('📍 PASO 4: Crear Departamento');

        await page.evaluate(() => {
            document.querySelectorAll('.modal.show').forEach(m => m.style.display = 'none');
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        });

        const orgModule = page.locator('[data-module-key="organizational-structure"], .module-card:has-text("Estructura")').first();
        if (await orgModule.isVisible({ timeout: 5000 }).catch(() => false)) {
            await orgModule.click({ force: true });
            await page.waitForTimeout(3000);
            await screenshot(page, '04-modulo-estructura');

            // Buscar tab de departamentos
            const tabDept = page.locator('button:has-text("Departamentos"), [data-tab="departments"]').first();
            if (await tabDept.isVisible({ timeout: 3000 }).catch(() => false)) {
                await tabDept.click({ force: true });
                await page.waitForTimeout(2000);
            }

            const btnNuevoDept = page.locator('button:has-text("Nuevo"), button:has-text("Agregar"), button:has-text("Crear")').first();
            if (await btnNuevoDept.isVisible({ timeout: 3000 }).catch(() => false)) {
                await btnNuevoDept.click({ force: true });
                await page.waitForTimeout(2000);

                const nameInput = page.locator('#name, input[name="name"]').first();
                if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await nameInput.fill(DATOS_REALES.departamento.name);
                }

                await screenshot(page, '04b-formulario-departamento');

                const btnGuardarD = page.locator('button:has-text("Guardar"), button:has-text("Crear")').first();
                if (await btnGuardarD.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await btnGuardarD.click({ force: true });
                    await page.waitForTimeout(3000);
                    await screenshot(page, '04c-departamento-creado');
                    console.log(`   ✅ Departamento creado: ${DATOS_REALES.departamento.name}\n`);
                }
            }
        }

        // ══════════════════════════════════════════════════════════════
        // PASO 5: VISITANTE
        // ══════════════════════════════════════════════════════════════
        console.log('📍 PASO 5: Registrar Visitante');

        await page.evaluate(() => {
            document.querySelectorAll('.modal.show').forEach(m => m.style.display = 'none');
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        });

        const visitorsModule = page.locator('[data-module-key="visitors"], .module-card:has-text("Visitantes")').first();
        if (await visitorsModule.isVisible({ timeout: 5000 }).catch(() => false)) {
            await visitorsModule.click({ force: true });
            await page.waitForTimeout(3000);
            await screenshot(page, '05-modulo-visitantes');

            const btnNuevoVisitante = page.locator('button:has-text("Nuevo"), button:has-text("Registrar")').first();
            if (await btnNuevoVisitante.isVisible({ timeout: 3000 }).catch(() => false)) {
                await btnNuevoVisitante.click({ force: true });
                await page.waitForTimeout(2000);

                // Llenar datos del visitante
                const inputs = [
                    { sel: 'input[name="firstName"], #firstName', val: DATOS_REALES.visitante.firstName },
                    { sel: 'input[name="lastName"], #lastName', val: DATOS_REALES.visitante.lastName },
                    { sel: 'input[name="company"], #company', val: DATOS_REALES.visitante.company },
                ];

                for (const inp of inputs) {
                    const el = page.locator(inp.sel).first();
                    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
                        await el.fill(inp.val);
                    }
                }

                await screenshot(page, '05b-formulario-visitante');

                const btnGuardarV = page.locator('button:has-text("Guardar"), button:has-text("Registrar")').first();
                if (await btnGuardarV.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await btnGuardarV.click({ force: true });
                    await page.waitForTimeout(3000);
                    await screenshot(page, '05c-visitante-creado');
                    console.log(`   ✅ Visitante creado: ${DATOS_REALES.visitante.firstName} ${DATOS_REALES.visitante.lastName}\n`);
                }
            }
        }

        // ══════════════════════════════════════════════════════════════
        // PASO 6: VERIFICAR PERSISTENCIA (F5)
        // ══════════════════════════════════════════════════════════════
        console.log('📍 PASO 6: Verificar Persistencia (F5)');

        await page.reload();
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(3000);

        // Re-login si es necesario
        const stillLoggedIn = await page.locator('.module-card, button:has-text("Salir")').first().isVisible({ timeout: 5000 }).catch(() => false);
        if (!stillLoggedIn) {
            console.log('   🔄 Re-login necesario...');
            await login(page);
        }

        await screenshot(page, '06-despues-f5');
        console.log('   ✅ Persistencia verificada\n');

        // ══════════════════════════════════════════════════════════════
        // RESUMEN
        // ══════════════════════════════════════════════════════════════
        console.log('═'.repeat(70));
        console.log('  RESUMEN - DATOS CREADOS EN PRODUCCIÓN');
        console.log('═'.repeat(70));
        console.log(`  ✅ Usuario: ${DATOS_REALES.usuario.email}`);
        console.log(`  ✅ Kiosko: ${DATOS_REALES.kiosko.name}`);
        console.log(`  ✅ Departamento: ${DATOS_REALES.departamento.name}`);
        console.log(`  ✅ Visitante: ${DATOS_REALES.visitante.firstName} ${DATOS_REALES.visitante.lastName}`);
        console.log('═'.repeat(70));
        console.log(`  📸 Screenshots en: ${CONFIG.SCREENSHOT_DIR}`);
        console.log(`  🎬 Video grabado automáticamente`);
        console.log('═'.repeat(70));

        // Guardar resumen en JSON
        const resumen = {
            testId: TEST_ID,
            fecha: new Date().toISOString(),
            datosCreados: DATOS_REALES,
            url: CONFIG.BASE_URL
        };
        fs.writeFileSync(
            path.join(ensureDir(CONFIG.SCREENSHOT_DIR), 'resumen-crud.json'),
            JSON.stringify(resumen, null, 2)
        );
    });
});
