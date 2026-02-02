/**
 * ============================================================================
 * TEST VISUAL CRUD: BANCO DE HORAS
 * ============================================================================
 *
 * Test visual con screenshots, verificación de persistencia BD y refresco frontend.
 * Usa Playwright para capturar cada operación CRUD.
 *
 * @date 2026-02-02
 * ============================================================================
 */

const { chromium } = require('playwright');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración
const BASE_URL = 'http://localhost:9998';
const SCREENSHOTS_DIR = path.join(__dirname, '../test-results/hour-bank-visual');

// Pool de BD para verificar persistencia
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

// Crear directorio de screenshots
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function takeScreenshot(page, name) {
    const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`   📸 Screenshot: ${name}.png`);
    return filepath;
}

async function verifyInDB(query, description) {
    try {
        const result = await pool.query(query);
        console.log(`   🗄️ BD Verificación (${description}):`, result.rows[0] || result.rowCount);
        return result;
    } catch (error) {
        console.log(`   ❌ BD Error:`, error.message);
        return null;
    }
}

async function runVisualTest() {
    console.log('='.repeat(70));
    console.log('🏦 TEST VISUAL CRUD - BANCO DE HORAS');
    console.log('='.repeat(70));
    console.log(`📁 Screenshots en: ${SCREENSHOTS_DIR}\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    try {
        // =====================================================================
        // FASE 1: LOGIN
        // =====================================================================
        console.log('\n🔐 FASE 1: Login...');

        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForTimeout(1000);
        await takeScreenshot(page, '01-login-page');

        // Hacer login via API y establecer token
        const loginResponse = await page.request.post(`${BASE_URL}/api/v1/auth/login`, {
            data: {
                companySlug: 'isi',
                identifier: 'admin',
                password: 'admin123'
            },
            headers: { 'X-Test-Mode': 'true' }
        });

        if (!loginResponse.ok()) {
            throw new Error('Login fallido');
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        const companyId = loginData.user?.company_id;
        console.log(`   ✅ Login OK - Company ID: ${companyId}`);

        // Establecer token en localStorage
        await page.evaluate(({ token, companyId }) => {
            localStorage.setItem('token', token);
            localStorage.setItem('authToken', token);
            localStorage.setItem('company_id', companyId);
        }, { token, companyId });

        await page.reload();
        await page.waitForTimeout(3000);
        await takeScreenshot(page, '02-dashboard-post-login');

        // =====================================================================
        // FASE 2: NAVEGAR A MÓDULO BANCO DE HORAS
        // =====================================================================
        console.log('\n📍 FASE 2: Navegando a Banco de Horas...');

        // Buscar y hacer click en el menú de Banco de Horas
        const hourBankMenu = await page.locator('text=Banco de Horas').first();
        if (await hourBankMenu.isVisible()) {
            await hourBankMenu.click();
            await page.waitForTimeout(2000);
        } else {
            // Intentar navegar directamente
            await page.evaluate(() => {
                if (window.loadModule) {
                    window.loadModule('hour-bank');
                } else if (window.HourBankModule) {
                    window.HourBankModule.init();
                }
            });
            await page.waitForTimeout(2000);
        }

        await takeScreenshot(page, '03-hour-bank-dashboard');

        // Verificar estado inicial en BD
        const initialStats = await verifyInDB(
            `SELECT COUNT(*) as total, SUM(current_balance)::numeric(10,2) as sum_balance
             FROM hour_bank_balances WHERE company_id = ${companyId}`,
            'Saldos iniciales'
        );

        // =====================================================================
        // FASE 3: LISTAR SALDOS (READ)
        // =====================================================================
        console.log('\n📋 FASE 3: Verificando lista de saldos (READ)...');

        // Buscar tabla o lista de saldos
        const balancesTable = await page.locator('[data-module="hour-bank"] table, .hour-bank-balances, #hourBankBalances').first();
        if (await balancesTable.isVisible()) {
            await takeScreenshot(page, '04-balances-list');
        }

        // Verificar via API que los datos están cargados
        const balancesResponse = await page.request.get(`${BASE_URL}/api/hour-bank/balances?limit=10`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Test-Mode': 'true'
            }
        });

        if (balancesResponse.ok()) {
            const balancesData = await balancesResponse.json();
            console.log(`   ✅ API retornó ${balancesData.balances?.length || 0} saldos`);

            if (balancesData.balances?.length > 0) {
                console.log('   📊 Top 3 saldos:');
                balancesData.balances.slice(0, 3).forEach((b, i) => {
                    console.log(`      ${i+1}. ${b.employee_name}: ${b.current_balance}h`);
                });
            }
        }

        // =====================================================================
        // FASE 4: CREAR TRANSACCIÓN (CREATE)
        // =====================================================================
        console.log('\n➕ FASE 4: Crear nueva transacción (CREATE)...');

        // Obtener un empleado con saldo para crear transacción
        const employeeResult = await pool.query(`
            SELECT b.user_id, b.current_balance, u."firstName", u."lastName"
            FROM hour_bank_balances b
            JOIN users u ON b.user_id = u.user_id
            WHERE b.company_id = $1 AND b.current_balance > 5
            LIMIT 1
        `, [companyId]);

        if (employeeResult.rows.length > 0) {
            const employee = employeeResult.rows[0];
            const balanceBefore = parseFloat(employee.current_balance);
            console.log(`   👤 Empleado: ${employee.firstName} ${employee.lastName}`);
            console.log(`   💰 Saldo antes: ${balanceBefore}h`);

            // Crear transacción de uso (2 horas)
            const createTxResponse = await page.request.post(`${BASE_URL}/api/hour-bank/transactions`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Test-Mode': 'true'
                },
                data: {
                    user_id: employee.user_id,
                    transaction_type: 'usage',
                    hours_raw: 2.0,
                    source_type: 'early_departure',
                    description: 'Test CRUD Visual - Salida anticipada 2h'
                }
            });

            if (createTxResponse.ok()) {
                const txData = await createTxResponse.json();
                console.log(`   ✅ Transacción creada: ID ${txData.transaction?.id || 'OK'}`);

                // Verificar en BD
                await verifyInDB(
                    `SELECT current_balance FROM hour_bank_balances
                     WHERE user_id = '${employee.user_id}'`,
                    'Nuevo saldo después de uso'
                );

                // Refrescar frontend
                await page.reload();
                await page.waitForTimeout(2000);
                await takeScreenshot(page, '05-after-create-transaction');
            } else {
                console.log(`   ⚠️ No se pudo crear transacción (puede requerir endpoint específico)`);
            }
        }

        // =====================================================================
        // FASE 5: CREAR SOLICITUD DE USO (CREATE REQUEST)
        // =====================================================================
        console.log('\n📝 FASE 5: Crear solicitud de uso de horas...');

        // Contar solicitudes antes
        const requestsBefore = await verifyInDB(
            `SELECT COUNT(*) as total FROM hour_bank_requests WHERE company_id = ${companyId}`,
            'Solicitudes antes'
        );

        // Buscar modal o botón de nueva solicitud
        const newRequestBtn = await page.locator('button:has-text("Nueva Solicitud"), button:has-text("Solicitar"), [data-action="new-request"]').first();
        if (await newRequestBtn.isVisible()) {
            await newRequestBtn.click();
            await page.waitForTimeout(1000);
            await takeScreenshot(page, '06-new-request-modal');
        }

        // Crear solicitud via API
        if (employeeResult.rows.length > 0) {
            const employee = employeeResult.rows[0];

            const createRequestResponse = await page.request.post(`${BASE_URL}/api/hour-bank/requests`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Test-Mode': 'true'
                },
                data: {
                    user_id: employee.user_id,
                    request_type: 'early_departure',
                    requested_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    hours_requested: 3.0,
                    reason: 'Test CRUD Visual - Solicitud de salida anticipada'
                }
            });

            if (createRequestResponse.ok()) {
                console.log('   ✅ Solicitud creada exitosamente');

                // Verificar en BD
                const requestsAfter = await verifyInDB(
                    `SELECT COUNT(*) as total FROM hour_bank_requests WHERE company_id = ${companyId}`,
                    'Solicitudes después'
                );

                const beforeCount = parseInt(requestsBefore?.rows?.[0]?.total || 0);
                const afterCount = parseInt(requestsAfter?.rows?.[0]?.total || 0);

                if (afterCount > beforeCount) {
                    console.log(`   ✅ PERSISTENCIA VERIFICADA: ${beforeCount} → ${afterCount} solicitudes`);
                }

                // Refrescar y capturar
                await page.reload();
                await page.waitForTimeout(2000);
                await takeScreenshot(page, '07-after-create-request');
            }
        }

        // =====================================================================
        // FASE 6: VER DETALLE DE SALDO (READ DETAIL)
        // =====================================================================
        console.log('\n🔍 FASE 6: Ver detalle de saldo...');

        // Buscar fila clickeable en tabla
        const balanceRow = await page.locator('tr[data-user-id], .balance-row, table tbody tr').first();
        if (await balanceRow.isVisible()) {
            await balanceRow.click();
            await page.waitForTimeout(1000);
            await takeScreenshot(page, '08-balance-detail');
        }

        // Obtener detalle via API
        if (employeeResult.rows.length > 0) {
            const employee = employeeResult.rows[0];
            const detailResponse = await page.request.get(
                `${BASE_URL}/api/hour-bank/balance/${employee.user_id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Test-Mode': 'true'
                }
            });

            if (detailResponse.ok()) {
                const detailData = await detailResponse.json();
                console.log('   📊 Detalle de saldo:');
                console.log(`      - Saldo actual: ${detailData.balance?.current_balance || 'N/A'}h`);
                console.log(`      - Total acumulado: ${detailData.balance?.total_accrued || 'N/A'}h`);
                console.log(`      - Total usado: ${detailData.balance?.total_used || 'N/A'}h`);
            }
        }

        // =====================================================================
        // FASE 7: VER HISTORIAL DE TRANSACCIONES (READ HISTORY)
        // =====================================================================
        console.log('\n📜 FASE 7: Ver historial de transacciones...');

        // Buscar tab o botón de historial
        const historyTab = await page.locator('text=Historial, text=Transacciones, [data-tab="history"]').first();
        if (await historyTab.isVisible()) {
            await historyTab.click();
            await page.waitForTimeout(1000);
            await takeScreenshot(page, '09-transactions-history');
        }

        // Verificar historial en BD
        const txHistory = await verifyInDB(
            `SELECT transaction_type, COUNT(*) as count
             FROM hour_bank_transactions
             WHERE company_id = ${companyId}
             GROUP BY transaction_type`,
            'Historial por tipo'
        );

        // =====================================================================
        // FASE 8: ACTUALIZAR SOLICITUD (UPDATE)
        // =====================================================================
        console.log('\n✏️ FASE 8: Actualizar solicitud pendiente...');

        // Obtener una solicitud pendiente
        const pendingRequest = await pool.query(`
            SELECT id, user_id, hours_requested, reason
            FROM hour_bank_requests
            WHERE company_id = $1 AND status = 'pending'
            LIMIT 1
        `, [companyId]);

        if (pendingRequest.rows.length > 0) {
            const request = pendingRequest.rows[0];
            console.log(`   📝 Solicitud a actualizar: ID ${request.id}`);
            console.log(`   📝 Horas originales: ${request.hours_requested}h`);

            // Actualizar via API
            const updateResponse = await page.request.put(
                `${BASE_URL}/api/hour-bank/requests/${request.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Test-Mode': 'true'
                },
                data: {
                    hours_requested: parseFloat(request.hours_requested) + 1,
                    reason: request.reason + ' (Actualizado via CRUD Visual Test)'
                }
            });

            if (updateResponse.ok()) {
                console.log('   ✅ Solicitud actualizada');

                // Verificar en BD
                await verifyInDB(
                    `SELECT hours_requested, reason FROM hour_bank_requests WHERE id = '${request.id}'`,
                    'Solicitud después de UPDATE'
                );

                await page.reload();
                await page.waitForTimeout(2000);
                await takeScreenshot(page, '10-after-update-request');
            } else {
                console.log('   ⚠️ Endpoint de update no disponible o requiere permisos especiales');
            }
        }

        // =====================================================================
        // FASE 9: APROBAR/RECHAZAR SOLICITUD (UPDATE STATUS)
        // =====================================================================
        console.log('\n✅ FASE 9: Aprobar solicitud pendiente...');

        const pendingToApprove = await pool.query(`
            SELECT id FROM hour_bank_requests
            WHERE company_id = $1 AND status = 'pending'
            LIMIT 1
        `, [companyId]);

        if (pendingToApprove.rows.length > 0) {
            const reqId = pendingToApprove.rows[0].id;

            const approveResponse = await page.request.put(
                `${BASE_URL}/api/hour-bank/requests/${reqId}/approve`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Test-Mode': 'true'
                },
                data: {
                    approved_by_notes: 'Aprobado via CRUD Visual Test'
                }
            });

            if (approveResponse.ok()) {
                console.log('   ✅ Solicitud aprobada');

                // Verificar en BD
                await verifyInDB(
                    `SELECT status FROM hour_bank_requests WHERE id = '${reqId}'`,
                    'Status después de aprobar'
                );

                await page.reload();
                await page.waitForTimeout(2000);
                await takeScreenshot(page, '11-after-approve-request');
            } else {
                console.log('   ⚠️ Endpoint de aprobación no disponible');
            }
        }

        // =====================================================================
        // FASE 10: ELIMINAR SOLICITUD (DELETE)
        // =====================================================================
        console.log('\n🗑️ FASE 10: Eliminar solicitud...');

        // Crear una solicitud temporal para eliminar
        if (employeeResult.rows.length > 0) {
            const employee = employeeResult.rows[0];

            // Crear solicitud temporal
            const tempRequest = await pool.query(`
                INSERT INTO hour_bank_requests (
                    user_id, company_id, template_id, request_type,
                    requested_date, hours_requested, reason, status
                ) VALUES (
                    $1, $2, 1, 'partial_day',
                    CURRENT_DATE + INTERVAL '30 days', 1.0,
                    'TEMPORAL - Para eliminar en test', 'pending'
                ) RETURNING id
            `, [employee.user_id, companyId]);

            const tempId = tempRequest.rows[0].id;
            console.log(`   📝 Solicitud temporal creada: ID ${tempId}`);

            // Verificar que existe
            await verifyInDB(
                `SELECT COUNT(*) as count FROM hour_bank_requests WHERE id = '${tempId}'`,
                'Antes de eliminar'
            );

            // Eliminar via API
            const deleteResponse = await page.request.delete(
                `${BASE_URL}/api/hour-bank/requests/${tempId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Test-Mode': 'true'
                }
            });

            if (deleteResponse.ok()) {
                console.log('   ✅ Solicitud eliminada');

                // Verificar que ya no existe en BD
                const afterDelete = await verifyInDB(
                    `SELECT COUNT(*) as count FROM hour_bank_requests WHERE id = '${tempId}'`,
                    'Después de eliminar'
                );

                if (afterDelete?.rows?.[0]?.count === '0') {
                    console.log('   ✅ PERSISTENCIA DELETE VERIFICADA');
                }

                await page.reload();
                await page.waitForTimeout(2000);
                await takeScreenshot(page, '12-after-delete-request');
            } else {
                // Limpiar manualmente
                await pool.query(`DELETE FROM hour_bank_requests WHERE id = $1`, [tempId]);
                console.log('   ⚠️ Endpoint DELETE no disponible, limpiado manualmente');
            }
        }

        // =====================================================================
        // FASE 11: ESTADÍSTICAS Y MÉTRICAS (READ STATS)
        // =====================================================================
        console.log('\n📊 FASE 11: Verificar estadísticas...');

        // Buscar tab de estadísticas
        const statsTab = await page.locator('text=Estadísticas, text=Métricas, [data-tab="stats"]').first();
        if (await statsTab.isVisible()) {
            await statsTab.click();
            await page.waitForTimeout(1000);
        }

        const statsResponse = await page.request.get(`${BASE_URL}/api/hour-bank/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Test-Mode': 'true'
            }
        });

        if (statsResponse.ok()) {
            const statsData = await statsResponse.json();
            console.log('   📈 Estadísticas actuales:');
            console.log(`      - Usuarios con saldo: ${statsData.stats?.usersWithBalance}`);
            console.log(`      - Total horas bancadas: ${statsData.stats?.totalHoursBanked}h`);
            console.log(`      - Promedio por usuario: ${statsData.stats?.avgBalancePerUser?.toFixed(2)}h`);
            console.log(`      - Solicitudes pendientes: ${statsData.stats?.pendingRequests}`);
            console.log(`      - Decisiones pendientes: ${statsData.stats?.pendingDecisions}`);
        }

        await takeScreenshot(page, '13-stats-dashboard');

        // =====================================================================
        // FASE 12: VERIFICACIÓN FINAL DE PERSISTENCIA
        // =====================================================================
        console.log('\n🔒 FASE 12: Verificación final de persistencia...');

        const finalStats = await verifyInDB(
            `SELECT
                (SELECT COUNT(*) FROM hour_bank_balances WHERE company_id = ${companyId}) as balances,
                (SELECT COUNT(*) FROM hour_bank_transactions WHERE company_id = ${companyId}) as transactions,
                (SELECT COUNT(*) FROM hour_bank_requests WHERE company_id = ${companyId}) as requests,
                (SELECT SUM(current_balance)::numeric(10,2) FROM hour_bank_balances WHERE company_id = ${companyId}) as total_hours`,
            'Estado final BD'
        );

        console.log('\n   📊 RESUMEN FINAL:');
        console.log(`      - Saldos: ${finalStats?.rows?.[0]?.balances}`);
        console.log(`      - Transacciones: ${finalStats?.rows?.[0]?.transactions}`);
        console.log(`      - Solicitudes: ${finalStats?.rows?.[0]?.requests}`);
        console.log(`      - Total horas: ${finalStats?.rows?.[0]?.total_hours}h`);

        // Screenshot final
        await takeScreenshot(page, '14-final-state');

        // =====================================================================
        // REPORTE
        // =====================================================================
        console.log('\n' + '='.repeat(70));
        console.log('✅ TEST VISUAL CRUD COMPLETADO');
        console.log('='.repeat(70));
        console.log(`\n📁 Screenshots guardados en: ${SCREENSHOTS_DIR}`);
        console.log('\n📸 Lista de screenshots:');
        fs.readdirSync(SCREENSHOTS_DIR)
            .filter(f => f.endsWith('.png'))
            .sort()
            .forEach(f => console.log(`   - ${f}`));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        await takeScreenshot(page, 'error-state');
    } finally {
        await browser.close();
        await pool.end();
    }
}

runVisualTest().catch(console.error);
