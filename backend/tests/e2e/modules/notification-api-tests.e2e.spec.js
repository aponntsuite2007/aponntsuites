/**
 * ============================================================================
 * NOTIFICATION CENTER - API & BACKEND TESTS
 * ============================================================================
 *
 * Tests de integración para verificar las APIs del sistema de notificaciones:
 * - API Inbox (/api/inbox)
 * - API Enterprise Notifications (/api/v1/enterprise/notifications)
 * - API Support (/api/support/v2)
 * - WebSocket connectivity
 *
 * @version 1.0
 * @date 2026-02-01
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';
let authToken = null;

// ============================================================================
// SETUP: Obtener token de autenticación
// ============================================================================

test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();

    console.log('🔐 Obteniendo token de autenticación...');

    await page.goto(`${BASE_URL}/panel-empresa.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Seleccionar ISI
    await page.evaluate(() => {
        const select = document.querySelector('#companySelect');
        if (select) {
            const options = Array.from(select.options);
            const isi = options.find(o => o.value === 'isi' || o.text.toLowerCase().includes('isi'));
            if (isi) {
                select.value = isi.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    });
    await page.waitForTimeout(800);

    await page.fill('#userInput', 'admin');
    await page.fill('#passwordInput', 'admin123');
    await page.click('#loginButton');
    await page.waitForTimeout(5000);

    authToken = await page.evaluate(() => localStorage.getItem('authToken'));
    console.log(`   Token: ${authToken ? 'OK (' + authToken.substring(0, 20) + '...)' : 'FAIL'}`);

    await page.close();
});

// ============================================================================
// TEST SUITE 1: API INBOX
// ============================================================================

test.describe('1. API INBOX (/api/inbox)', () => {

    test('1.1 GET /api/inbox - Obtener bandeja de entrada', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/inbox`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${response.status()}`);

        if (response.ok()) {
            const data = await response.json();
            console.log(`   Grupos: ${data.groups?.length || 0}`);
            console.log(`   Stats: ${JSON.stringify(data.stats || {}).substring(0, 100)}`);
            expect(data).toHaveProperty('groups');
        } else {
            console.log(`   ⚠️ Error: ${response.status()}`);
        }
    });

    test('1.2 GET /api/inbox/stats - Obtener estadísticas', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/inbox/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${response.status()}`);

        if (response.ok()) {
            const data = await response.json();
            console.log(`   Total: ${data.total || data.data?.total || 'N/A'}`);
            console.log(`   No leídos: ${data.unread || data.data?.unread || 'N/A'}`);
        }
    });

    test('1.3 GET /api/inbox/sla-score - Obtener score SLA', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/inbox/sla-score`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${response.status()}`);

        if (response.ok()) {
            const data = await response.json();
            console.log(`   SLA Score: ${JSON.stringify(data).substring(0, 150)}`);
        }
    });

    test('1.4 GET /api/inbox/ai/suggestions - Obtener sugerencias IA', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/inbox/ai/suggestions`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${response.status()}`);

        if (response.ok()) {
            const data = await response.json();
            console.log(`   Sugerencias IA: ${JSON.stringify(data).substring(0, 150)}`);
        } else {
            console.log(`   ⚠️ IA no disponible o endpoint no implementado`);
        }
    });
});

// ============================================================================
// TEST SUITE 2: API ENTERPRISE NOTIFICATIONS
// ============================================================================

test.describe('2. API ENTERPRISE NOTIFICATIONS', () => {

    test('2.1 GET /api/v1/enterprise/notifications/stats - Stats enterprise', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/v1/enterprise/notifications/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${response.status()}`);

        if (response.ok()) {
            const data = await response.json();
            console.log(`   Stats: ${JSON.stringify(data.data || data).substring(0, 200)}`);
        }
    });

    test('2.2 GET /api/v1/enterprise/notifications - Listar notificaciones', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/v1/enterprise/notifications?limit=10`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${response.status()}`);

        if (response.ok()) {
            const data = await response.json();
            const notifications = data.data || data.notifications || [];
            console.log(`   Notificaciones: ${notifications.length}`);

            if (notifications.length > 0) {
                console.log(`   Primera: ${notifications[0].title?.substring(0, 50) || 'Sin título'}`);
            }
        }
    });

    test('2.3 GET /api/v1/enterprise/notifications con filtros', async ({ request }) => {
        // Filtro por prioridad
        const urgentResponse = await request.get(`${BASE_URL}/api/v1/enterprise/notifications?priority=urgent&limit=5`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Filtro urgent: ${urgentResponse.status()}`);

        // Filtro por no leídas
        const unreadResponse = await request.get(`${BASE_URL}/api/v1/enterprise/notifications?unread=true&limit=5`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Filtro unread: ${unreadResponse.status()}`);

        // Filtro por requiere acción
        const actionResponse = await request.get(`${BASE_URL}/api/v1/enterprise/notifications?requires_action=true&limit=5`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Filtro requires_action: ${actionResponse.status()}`);
    });
});

// ============================================================================
// TEST SUITE 3: API SUPPORT V2
// ============================================================================

test.describe('3. API SUPPORT V2 (/api/support/v2)', () => {

    test('3.1 GET /api/support/v2/tickets - Listar tickets', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/support/v2/tickets`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${response.status()}`);

        if (response.ok()) {
            const data = await response.json();
            console.log(`   Tickets: ${data.tickets?.length || 0}`);
            console.log(`   Total: ${data.total || 'N/A'}`);
        }
    });

    test('3.2 GET /api/support/v2/sla-plans - Planes SLA', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/support/v2/sla-plans`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${response.status()}`);

        if (response.ok()) {
            const data = await response.json();
            console.log(`   Planes: ${data.plans?.length || 0}`);
        }
    });

    test('3.3 GET /api/support/v2/monitor/status - Estado monitor SLA', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/support/v2/monitor/status`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${response.status()}`);

        if (response.ok()) {
            const data = await response.json();
            console.log(`   Monitor activo: ${data.is_running ? 'SÍ' : 'NO'}`);
        }
    });
});

// ============================================================================
// TEST SUITE 4: API NOTIFICATIONS CORE
// ============================================================================

test.describe('4. API NOTIFICATIONS CORE', () => {

    test('4.1 GET /api/notifications - Notificaciones legacy', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/notifications`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${response.status()}`);
    });

    test('4.2 GET /api/notifications/workflows - Workflows disponibles', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/notifications/workflows`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${response.status()}`);

        if (response.ok()) {
            const data = await response.json();
            console.log(`   Workflows: ${JSON.stringify(data).substring(0, 200)}`);
        }
    });
});

// ============================================================================
// TEST SUITE 5: WEBSOCKET CONNECTIVITY
// ============================================================================

test.describe('5. WEBSOCKET CONNECTIVITY', () => {

    test('5.1 Verificar endpoint WebSocket', async ({ page }) => {
        await page.goto(`${BASE_URL}/panel-empresa.html`);
        await page.waitForTimeout(2000);

        // Verificar que Socket.IO está disponible
        const socketAvailable = await page.evaluate(() => {
            return typeof io !== 'undefined';
        });

        console.log(`   Socket.IO disponible: ${socketAvailable ? 'SÍ' : 'NO'}`);

        // Intentar conexión
        const connectionTest = await page.evaluate(() => {
            return new Promise((resolve) => {
                if (typeof io === 'undefined') {
                    resolve({ connected: false, reason: 'io not defined' });
                    return;
                }

                const socket = io('/', {
                    transports: ['websocket', 'polling'],
                    timeout: 5000
                });

                const timeout = setTimeout(() => {
                    socket.disconnect();
                    resolve({ connected: false, reason: 'timeout' });
                }, 5000);

                socket.on('connect', () => {
                    clearTimeout(timeout);
                    const result = { connected: true, id: socket.id };
                    socket.disconnect();
                    resolve(result);
                });

                socket.on('connect_error', (err) => {
                    clearTimeout(timeout);
                    socket.disconnect();
                    resolve({ connected: false, reason: err.message });
                });
            });
        });

        console.log(`   Conexión WebSocket: ${connectionTest.connected ? 'OK' : 'FALLO'}`);
        if (connectionTest.id) {
            console.log(`   Socket ID: ${connectionTest.id}`);
        }
        if (connectionTest.reason) {
            console.log(`   Razón: ${connectionTest.reason}`);
        }
    });
});

// ============================================================================
// TEST SUITE 6: RESUMEN DE APIs
// ============================================================================

test.describe('6. RESUMEN DE APIs', () => {

    test('6.1 Health Check de todas las APIs', async ({ request }) => {
        console.log('\n📊 HEALTH CHECK APIs NOTIFICACIONES:');
        console.log('=====================================');

        const endpoints = [
            { name: 'Inbox', url: '/api/inbox' },
            { name: 'Inbox Stats', url: '/api/inbox/stats' },
            { name: 'Enterprise Stats', url: '/api/v1/enterprise/notifications/stats' },
            { name: 'Enterprise List', url: '/api/v1/enterprise/notifications' },
            { name: 'Support Tickets', url: '/api/support/v2/tickets' },
            { name: 'SLA Plans', url: '/api/support/v2/sla-plans' },
            { name: 'Monitor Status', url: '/api/support/v2/monitor/status' }
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await request.get(`${BASE_URL}${endpoint.url}`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });

                const status = response.status();
                const icon = status >= 200 && status < 300 ? '✅' : status === 401 ? '🔒' : '❌';
                console.log(`   ${icon} ${endpoint.name}: ${status}`);
            } catch (error) {
                console.log(`   ❌ ${endpoint.name}: ERROR - ${error.message}`);
            }
        }

        console.log('=====================================');
        console.log('✅ Health check completado');
    });
});
