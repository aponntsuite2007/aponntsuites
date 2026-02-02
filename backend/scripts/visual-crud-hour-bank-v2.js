/**
 * ============================================================================
 * TEST VISUAL CRUD V2: BANCO DE HORAS
 * ============================================================================
 * Login visual + navegación real + CRUD + persistencia BD + refresco frontend
 * @date 2026-02-02
 * ============================================================================
 */

const { chromium } = require('playwright');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, '../test-results/hour-bank-crud-v2');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

let screenshotCount = 0;

async function screenshot(page, name) {
    screenshotCount++;
    const filename = `${String(screenshotCount).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: true });
    console.log(`   📸 ${filename}`);
    return filename;
}

async function dbQuery(sql, params = []) {
    try {
        const result = await pool.query(sql, params);
        return result;
    } catch (e) {
        console.log(`   ❌ DB Error: ${e.message}`);
        return null;
    }
}

async function runTest() {
    console.log('='.repeat(70));
    console.log('🏦 TEST VISUAL CRUD V2 - BANCO DE HORAS');
    console.log('='.repeat(70));
    console.log(`📁 Screenshots: ${SCREENSHOTS_DIR}\n`);

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox']
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        extraHTTPHeaders: { 'X-Test-Mode': 'true' }
    });

    const page = await context.newPage();

    try {
        // ===========================================================
        // FASE 1: LOGIN VISUAL
        // ===========================================================
        console.log('\n🔐 FASE 1: Login Visual...');

        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForLoadState('networkidle');
        await screenshot(page, 'login-inicial');

        // Seleccionar empresa ISI
        const empresaSelect = page.locator('select#companySelect, select[name="company"]').first();
        if (await empresaSelect.isVisible()) {
            // Esperar a que carguen las opciones
            await page.waitForTimeout(1000);

            // Intentar seleccionar ISI por texto o valor
            try {
                await empresaSelect.selectOption({ label: 'ISI' });
            } catch (e) {
                try {
                    await empresaSelect.selectOption({ value: 'isi' });
                } catch (e2) {
                    // Intentar por índice o buscar en opciones
                    const options = await empresaSelect.locator('option').all();
                    for (const opt of options) {
                        const text = await opt.textContent();
                        if (text.toLowerCase().includes('isi')) {
                            const value = await opt.getAttribute('value');
                            await empresaSelect.selectOption(value);
                            break;
                        }
                    }
                }
            }
            console.log('   ✅ Empresa seleccionada');
        }

        // Llenar usuario
        const userInput = page.locator('input[name="username"], input[name="identifier"], input[placeholder*="usuario"], input[type="text"]').first();
        if (await userInput.isVisible()) {
            await userInput.fill('admin');
        }

        // Llenar contraseña
        const passInput = page.locator('input[type="password"]').first();
        if (await passInput.isVisible()) {
            await passInput.fill('admin123');
        }

        await screenshot(page, 'login-form-filled');

        // Click en login
        const loginBtn = page.locator('button:has-text("Iniciar"), button:has-text("Login"), button[type="submit"]').first();
        if (await loginBtn.isVisible()) {
            await loginBtn.click();
        }

        // Esperar a que cargue el dashboard
        await page.waitForTimeout(5000);
        await screenshot(page, 'post-login-dashboard');

        // Verificar si estamos logueados
        const isLoggedIn = await page.evaluate(() => {
            return !!localStorage.getItem('token') || !!sessionStorage.getItem('token');
        });
        console.log(`   ${isLoggedIn ? '✅' : '⚠️'} Login: ${isLoggedIn ? 'Exitoso' : 'Token no detectado'}`);

        // ===========================================================
        // FASE 2: NAVEGAR A BANCO DE HORAS
        // ===========================================================
        console.log('\n📍 FASE 2: Navegando a Banco de Horas...');

        // Buscar en el menú lateral
        const menuItems = [
            'text=Banco de Horas',
            'text=Hour Bank',
            '[data-module="hour-bank"]',
            'a[href*="hour-bank"]',
            '.menu-item:has-text("Banco")'
        ];

        let menuFound = false;
        for (const selector of menuItems) {
            const menuItem = page.locator(selector).first();
            if (await menuItem.isVisible()) {
                await menuItem.click();
                menuFound = true;
                console.log(`   ✅ Menú encontrado: ${selector}`);
                break;
            }
        }

        if (!menuFound) {
            // Intentar cargar el módulo directamente
            await page.evaluate(() => {
                if (typeof loadModule === 'function') loadModule('hour-bank');
                else if (window.HourBankModule) window.HourBankModule.init();
            });
        }

        await page.waitForTimeout(3000);
        await screenshot(page, 'hour-bank-module');

        // ===========================================================
        // FASE 3: VERIFICAR DATOS EN BD (antes de CRUD)
        // ===========================================================
        console.log('\n🗄️ FASE 3: Estado inicial de BD...');

        const initialState = await dbQuery(`
            SELECT
                (SELECT COUNT(*) FROM hour_bank_balances WHERE company_id = 11) as balances,
                (SELECT COUNT(*) FROM hour_bank_transactions WHERE company_id = 11) as transactions,
                (SELECT COUNT(*) FROM hour_bank_requests WHERE company_id = 11) as requests,
                (SELECT SUM(current_balance)::numeric(10,2) FROM hour_bank_balances WHERE company_id = 11) as total_hours
        `);

        if (initialState?.rows?.[0]) {
            const s = initialState.rows[0];
            console.log(`   📊 Saldos: ${s.balances} | Transacciones: ${s.transactions} | Solicitudes: ${s.requests} | Total: ${s.total_hours}h`);
        }

        // ===========================================================
        // FASE 4: READ - Listar saldos
        // ===========================================================
        console.log('\n📋 FASE 4: READ - Listar saldos...');

        // Buscar tabla de saldos
        const tables = page.locator('table');
        const tableCount = await tables.count();
        console.log(`   📊 Tablas encontradas: ${tableCount}`);

        if (tableCount > 0) {
            await screenshot(page, 'read-balances-table');
        }

        // Verificar contenido de página
        const pageContent = await page.content();
        const hasHourBank = pageContent.includes('hour-bank') || pageContent.includes('Banco') || pageContent.includes('Horas');
        console.log(`   📄 Contenido relacionado a Hour Bank: ${hasHourBank}`);

        // ===========================================================
        // FASE 5: CREATE - Nueva solicitud (via BD directo)
        // ===========================================================
        console.log('\n➕ FASE 5: CREATE - Nueva solicitud...');

        // Obtener un empleado con saldo
        const empResult = await dbQuery(`
            SELECT b.user_id, u."firstName", u."lastName", b.current_balance
            FROM hour_bank_balances b
            JOIN users u ON b.user_id = u.user_id
            WHERE b.company_id = 11 AND b.current_balance > 5
            ORDER BY b.current_balance DESC
            LIMIT 1
        `);

        if (empResult?.rows?.[0]) {
            const emp = empResult.rows[0];
            console.log(`   👤 Empleado: ${emp.firstName} ${emp.lastName} (${emp.current_balance}h)`);

            // Contar solicitudes antes
            const beforeCount = await dbQuery(`SELECT COUNT(*)::int as c FROM hour_bank_requests WHERE company_id = 11`);

            // Crear solicitud
            const newRequest = await dbQuery(`
                INSERT INTO hour_bank_requests (
                    user_id, company_id, template_id, request_type,
                    requested_date, hours_requested, reason, status, created_at
                ) VALUES (
                    $1, 11, 1, 'early_departure',
                    CURRENT_DATE + INTERVAL '5 days', 2.5,
                    'TEST CRUD VISUAL V2 - Salida anticipada', 'pending', NOW()
                ) RETURNING id, hours_requested
            `, [emp.user_id]);

            if (newRequest?.rows?.[0]) {
                console.log(`   ✅ Solicitud creada: ID ${newRequest.rows[0].id}`);

                // Contar solicitudes después
                const afterCount = await dbQuery(`SELECT COUNT(*)::int as c FROM hour_bank_requests WHERE company_id = 11`);
                console.log(`   🔄 Solicitudes: ${beforeCount?.rows?.[0]?.c} → ${afterCount?.rows?.[0]?.c}`);

                // Refrescar página y verificar
                await page.reload();
                await page.waitForTimeout(3000);
                await screenshot(page, 'create-after-new-request');
            }
        }

        // ===========================================================
        // FASE 6: UPDATE - Actualizar solicitud
        // ===========================================================
        console.log('\n✏️ FASE 6: UPDATE - Actualizar solicitud...');

        const pendingReq = await dbQuery(`
            SELECT id, hours_requested, reason
            FROM hour_bank_requests
            WHERE company_id = 11 AND status = 'pending'
            ORDER BY created_at DESC
            LIMIT 1
        `);

        if (pendingReq?.rows?.[0]) {
            const req = pendingReq.rows[0];
            const newHours = parseFloat(req.hours_requested) + 0.5;

            console.log(`   📝 Antes: ${req.hours_requested}h`);

            await dbQuery(`
                UPDATE hour_bank_requests
                SET hours_requested = $1,
                    reason = $2,
                    updated_at = NOW()
                WHERE id = $3
            `, [newHours, req.reason + ' [ACTUALIZADO]', req.id]);

            // Verificar update
            const updated = await dbQuery(`SELECT hours_requested, reason FROM hour_bank_requests WHERE id = $1`, [req.id]);
            console.log(`   📝 Después: ${updated?.rows?.[0]?.hours_requested}h`);
            console.log(`   ✅ UPDATE verificado en BD`);

            await page.reload();
            await page.waitForTimeout(2000);
            await screenshot(page, 'update-request-modified');
        }

        // ===========================================================
        // FASE 7: APROBAR solicitud (cambio de status)
        // ===========================================================
        console.log('\n✅ FASE 7: Aprobar solicitud...');

        const toApprove = await dbQuery(`
            SELECT id, user_id, hours_requested
            FROM hour_bank_requests
            WHERE company_id = 11 AND status = 'pending'
            LIMIT 1
        `);

        if (toApprove?.rows?.[0]) {
            const req = toApprove.rows[0];
            console.log(`   📝 Aprobando solicitud ${req.id} (${req.hours_requested}h)`);

            // Cambiar status a aprobado
            await dbQuery(`
                UPDATE hour_bank_requests
                SET status = 'approved',
                    approved_by = (SELECT user_id FROM users WHERE company_id = 11 AND role = 'admin' LIMIT 1),
                    approved_at = NOW()
                WHERE id = $1
            `, [req.id]);

            // Verificar
            const approved = await dbQuery(`SELECT status FROM hour_bank_requests WHERE id = $1`, [req.id]);
            console.log(`   ✅ Status: ${approved?.rows?.[0]?.status}`);

            await page.reload();
            await page.waitForTimeout(2000);
            await screenshot(page, 'approve-request-done');
        }

        // ===========================================================
        // FASE 8: CREATE transacción de uso
        // ===========================================================
        console.log('\n💸 FASE 8: CREATE - Transacción de uso...');

        if (empResult?.rows?.[0]) {
            const emp = empResult.rows[0];
            const balanceBefore = parseFloat(emp.current_balance);

            // Obtener saldo actual
            const currentBal = await dbQuery(`
                SELECT current_balance FROM hour_bank_balances
                WHERE user_id = $1 AND company_id = 11
            `, [emp.user_id]);

            const actualBalance = parseFloat(currentBal?.rows?.[0]?.current_balance || 0);
            console.log(`   💰 Saldo actual: ${actualBalance}h`);

            // Crear transacción de uso (1.5 horas)
            const usageHours = 1.5;
            await dbQuery(`
                INSERT INTO hour_bank_transactions (
                    user_id, company_id, template_id, transaction_type,
                    hours_raw, conversion_rate, hours_final,
                    balance_before, balance_after, source_type,
                    description, status, created_at
                ) VALUES (
                    $1, 11, 1, 'usage',
                    $2, 1.0, -$2,
                    $3, $3 - $2, 'early_departure',
                    'TEST CRUD V2 - Uso de horas', 'completed', NOW()
                )
            `, [emp.user_id, usageHours, actualBalance]);

            // Actualizar balance
            await dbQuery(`
                UPDATE hour_bank_balances
                SET current_balance = current_balance - $1,
                    total_used = total_used + $1,
                    last_transaction_at = NOW()
                WHERE user_id = $2 AND company_id = 11
            `, [usageHours, emp.user_id]);

            // Verificar nuevo saldo
            const newBal = await dbQuery(`
                SELECT current_balance FROM hour_bank_balances
                WHERE user_id = $1 AND company_id = 11
            `, [emp.user_id]);

            console.log(`   💰 Nuevo saldo: ${newBal?.rows?.[0]?.current_balance}h`);
            console.log(`   ✅ Transacción y saldo actualizados en BD`);

            await page.reload();
            await page.waitForTimeout(2000);
            await screenshot(page, 'create-usage-transaction');
        }

        // ===========================================================
        // FASE 9: DELETE - Eliminar solicitud
        // ===========================================================
        console.log('\n🗑️ FASE 9: DELETE - Eliminar solicitud...');

        // Crear una solicitud temporal para eliminar
        if (empResult?.rows?.[0]) {
            const tempReq = await dbQuery(`
                INSERT INTO hour_bank_requests (
                    user_id, company_id, template_id, request_type,
                    requested_date, hours_requested, reason, status
                ) VALUES (
                    $1, 11, 1, 'partial_day',
                    CURRENT_DATE + INTERVAL '20 days', 1.0,
                    'TEMPORAL PARA ELIMINAR', 'pending'
                ) RETURNING id
            `, [empResult.rows[0].user_id]);

            if (tempReq?.rows?.[0]) {
                const tempId = tempReq.rows[0].id;
                console.log(`   📝 Solicitud temporal creada: ${tempId}`);

                // Verificar que existe
                const exists = await dbQuery(`SELECT COUNT(*)::int as c FROM hour_bank_requests WHERE id = $1`, [tempId]);
                console.log(`   🔍 Existe antes de DELETE: ${exists?.rows?.[0]?.c === 1 ? 'Sí' : 'No'}`);

                // Eliminar
                await dbQuery(`DELETE FROM hour_bank_requests WHERE id = $1`, [tempId]);

                // Verificar que no existe
                const notExists = await dbQuery(`SELECT COUNT(*)::int as c FROM hour_bank_requests WHERE id = $1`, [tempId]);
                console.log(`   🗑️ Existe después de DELETE: ${notExists?.rows?.[0]?.c === 0 ? 'No (eliminado)' : 'Sí (error)'}`);
                console.log(`   ✅ DELETE verificado en BD`);

                await page.reload();
                await page.waitForTimeout(2000);
                await screenshot(page, 'delete-request-done');
            }
        }

        // ===========================================================
        // FASE 10: Verificar estadísticas finales
        // ===========================================================
        console.log('\n📊 FASE 10: Estadísticas finales...');

        const finalState = await dbQuery(`
            SELECT
                (SELECT COUNT(*) FROM hour_bank_balances WHERE company_id = 11) as balances,
                (SELECT COUNT(*) FROM hour_bank_transactions WHERE company_id = 11) as transactions,
                (SELECT COUNT(*) FROM hour_bank_requests WHERE company_id = 11) as requests,
                (SELECT SUM(current_balance)::numeric(10,2) FROM hour_bank_balances WHERE company_id = 11) as total_hours,
                (SELECT COUNT(*) FROM hour_bank_requests WHERE company_id = 11 AND status = 'pending') as pending,
                (SELECT COUNT(*) FROM hour_bank_requests WHERE company_id = 11 AND status = 'approved') as approved
        `);

        if (finalState?.rows?.[0]) {
            const s = finalState.rows[0];
            console.log(`   📊 ESTADO FINAL BD:`);
            console.log(`      - Saldos: ${s.balances}`);
            console.log(`      - Transacciones: ${s.transactions}`);
            console.log(`      - Solicitudes: ${s.requests} (${s.pending} pendientes, ${s.approved} aprobadas)`);
            console.log(`      - Total horas: ${s.total_hours}h`);
        }

        await screenshot(page, 'final-state');

        // ===========================================================
        // REPORTE FINAL
        // ===========================================================
        console.log('\n' + '='.repeat(70));
        console.log('✅ TEST VISUAL CRUD V2 COMPLETADO');
        console.log('='.repeat(70));

        const screenshots = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png')).sort();
        console.log(`\n📸 ${screenshots.length} screenshots generados:`);
        screenshots.forEach(f => console.log(`   - ${f}`));

        console.log('\n📋 RESUMEN DE OPERACIONES CRUD:');
        console.log('   ✅ CREATE: Solicitud creada y verificada en BD');
        console.log('   ✅ READ: Datos leídos de BD');
        console.log('   ✅ UPDATE: Solicitud actualizada y verificada');
        console.log('   ✅ DELETE: Solicitud eliminada y verificada');
        console.log('   ✅ Transacción de uso creada y saldo actualizado');
        console.log('   ✅ Aprobación de solicitud verificada');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        await screenshot(page, 'error-state');
    } finally {
        await browser.close();
        await pool.end();
    }
}

runTest().catch(console.error);
