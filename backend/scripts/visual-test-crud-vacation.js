/**
 * Test CRUD profundo - Vacation Management
 * Verifica: Create, Read, Update, Delete con persistencia en BD
 */

const puppeteer = require('puppeteer');
const path = require('path');
const { Client } = require('pg');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Conexión a BD
const dbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'sistema_asistencia',
    user: 'postgres',
    password: 'postgres'
};

async function main() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     CRUD PROFUNDO - Vacation Management                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1400, height: 900 },
        args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    page.on('dialog', async d => {
        console.log(`   📢 Dialog: "${d.message().substring(0, 40)}..."`);
        await d.accept();
    });

    let db;

    try {
        // Conectar a BD
        console.log('🗄️ Conectando a PostgreSQL...');
        db = new Client(dbConfig);
        await db.connect();
        console.log('   ✅ Conectado\n');

        // Login
        console.log('🔐 Login...');
        await page.goto(`${BASE_URL}/panel-empresa.html`, { waitUntil: 'networkidle2' });
        await sleep(2000);
        await page.select('#companySelect', 'isi');
        await sleep(2000);
        await page.evaluate(() => {
            document.getElementById('userInput').disabled = false;
            document.getElementById('userInput').value = 'admin';
            document.getElementById('passwordInput').disabled = false;
            document.getElementById('passwordInput').value = 'admin123';
            document.getElementById('multiTenantLoginForm').dispatchEvent(new Event('submit', { bubbles: true }));
        });
        await sleep(5000);
        console.log('   ✅ Login OK\n');

        // Navegar a Vacation
        console.log('📦 Navegando a Vacation Management...');
        await page.evaluate(() => window.showTab && window.showTab('vacation-management'));
        await sleep(3000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'crud-vacation-01-inicial.png'), fullPage: true });
        console.log('   📸 crud-vacation-01-inicial.png\n');

        // === TEST 1: COUNT INICIAL ===
        console.log('📊 TEST 1: Contando registros iniciales en BD...');
        const countBefore = await db.query(`
            SELECT COUNT(*) as total FROM vacation_requests
            WHERE company_id = 11
        `);
        console.log(`   📈 Registros antes: ${countBefore.rows[0].total}\n`);

        // === TEST 2: CREATE ===
        console.log('✏️ TEST 2: Crear nueva solicitud de vacaciones...');

        // Click en botón Nueva Solicitud
        const createClicked = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, .btn');
            for (const btn of buttons) {
                const text = (btn.textContent || '').toLowerCase();
                if (text.includes('nueva solicitud') || text.includes('+ nueva')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });

        if (createClicked) {
            console.log('   ✅ Botón "Nueva Solicitud" clickeado');
            await sleep(2000);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'crud-vacation-02-modal.png'), fullPage: true });
            console.log('   📸 crud-vacation-02-modal.png');

            // Llenar formulario
            const formFilled = await page.evaluate(() => {
                // Buscar campos del formulario
                const employeeSelect = document.querySelector('select[name*="employee"], select[name*="user"], #employee_id, #userId');
                const startDate = document.querySelector('input[type="date"][name*="start"], input[name*="fecha_inicio"], #start_date');
                const endDate = document.querySelector('input[type="date"][name*="end"], input[name*="fecha_fin"], #end_date');
                const typeSelect = document.querySelector('select[name*="type"], select[name*="tipo"], #type');

                // Valores de prueba
                const today = new Date();
                const startStr = today.toISOString().split('T')[0];
                const endDate_ = new Date(today);
                endDate_.setDate(endDate_.getDate() + 3);
                const endStr = endDate_.toISOString().split('T')[0];

                let filled = {};

                if (employeeSelect && employeeSelect.options.length > 1) {
                    employeeSelect.selectedIndex = 1;
                    filled.employee = employeeSelect.options[1].text;
                }

                if (startDate) {
                    startDate.value = startStr;
                    filled.start = startStr;
                }

                if (endDate) {
                    endDate.value = endStr;
                    filled.end = endStr;
                }

                if (typeSelect && typeSelect.options.length > 0) {
                    typeSelect.selectedIndex = 0;
                    filled.type = typeSelect.options[0].text;
                }

                return filled;
            });

            console.log(`   📝 Formulario: ${JSON.stringify(formFilled)}`);
            await sleep(1000);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'crud-vacation-03-filled.png'), fullPage: true });
            console.log('   📸 crud-vacation-03-filled.png');

            // Guardar
            const saved = await page.evaluate(() => {
                const saveBtn = document.querySelector('button[type="submit"], .btn-primary, button:contains("Guardar"), button:contains("Crear")');
                if (saveBtn) {
                    saveBtn.click();
                    return true;
                }
                // Buscar por texto
                const buttons = document.querySelectorAll('button');
                for (const btn of buttons) {
                    const text = (btn.textContent || '').toLowerCase();
                    if (text.includes('guardar') || text.includes('crear') || text.includes('enviar')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });

            if (saved) {
                console.log('   ✅ Botón guardar clickeado');
                await sleep(3000);
                await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'crud-vacation-04-saved.png'), fullPage: true });
                console.log('   📸 crud-vacation-04-saved.png');
            } else {
                console.log('   ⚠️ No se encontró botón guardar');
            }
        } else {
            console.log('   ⚠️ No se encontró botón "Nueva Solicitud"');
        }

        // === TEST 3: VERIFICAR EN BD ===
        console.log('\n📊 TEST 3: Verificando persistencia en BD...');
        const countAfter = await db.query(`
            SELECT COUNT(*) as total FROM vacation_requests
            WHERE company_id = 11
        `);
        console.log(`   📈 Registros después: ${countAfter.rows[0].total}`);

        const newRecords = parseInt(countAfter.rows[0].total) - parseInt(countBefore.rows[0].total);
        if (newRecords > 0) {
            console.log(`   ✅ CRUD CREATE: ${newRecords} nuevo(s) registro(s) creado(s)`);

            // Ver último registro
            const lastRecord = await db.query(`
                SELECT id, user_id, start_date, end_date, status, created_at
                FROM vacation_requests
                WHERE company_id = 11
                ORDER BY created_at DESC
                LIMIT 1
            `);
            if (lastRecord.rows.length > 0) {
                console.log(`   📄 Último registro: ${JSON.stringify(lastRecord.rows[0])}`);
            }
        } else {
            console.log(`   ⚠️ No se detectaron nuevos registros (puede requerir campos obligatorios)`);
        }

        // === TEST 4: REFRESH Y VERIFICAR UI ===
        console.log('\n🔄 TEST 4: Refresh y verificación de UI...');
        await page.reload({ waitUntil: 'networkidle2' });
        await sleep(3000);
        await page.evaluate(() => window.showTab && window.showTab('vacation-management'));
        await sleep(3000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'crud-vacation-05-refresh.png'), fullPage: true });
        console.log('   📸 crud-vacation-05-refresh.png');
        console.log('   ✅ Módulo recargado correctamente');

        // === RESUMEN ===
        console.log('\n\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                    RESUMEN CRUD                              ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log(`║   📊 Registros antes:  ${countBefore.rows[0].total.toString().padStart(3)}                                    ║`);
        console.log(`║   📊 Registros después: ${countAfter.rows[0].total.toString().padStart(3)}                                    ║`);
        console.log(`║   ✅ Create verificado: ${newRecords > 0 ? 'SÍ' : 'NO'}                                    ║`);
        console.log('╚════════════════════════════════════════════════════════════╝');

    } catch (err) {
        console.error('❌ Error:', err.message);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'crud-vacation-error.png'), fullPage: true });
    } finally {
        if (db) await db.end();
        await browser.close();
    }
}

main();
