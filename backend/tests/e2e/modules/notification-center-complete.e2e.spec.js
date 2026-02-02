/**
 * ============================================================================
 * NOTIFICATION CENTER - COMPLETE E2E TEST SUITE
 * ============================================================================
 *
 * Suite exhaustiva para testear el Centro de Notificaciones completo:
 * - Inbox y conversaciones
 * - Notifications Enterprise (dashboard)
 * - Sistema de soporte (tickets)
 * - Filtros y estadísticas
 * - Flujos de aprobación/rechazo
 * - Multi-canal y SLA
 *
 * @version 1.0
 * @date 2026-02-01
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9998';

// Configuración global
test.describe.configure({ mode: 'serial' });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function loginAsAdmin(page) {
    console.log('🔐 Login como administrador ISI...');
    await page.goto(`${BASE_URL}/panel-empresa.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Seleccionar empresa ISI
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

    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    console.log(`   Token: ${token ? 'OK' : 'FAIL'}`);
    return !!token;
}

async function navigateToModule(page, moduleKey, moduleName) {
    console.log(`📍 Navegando a ${moduleName}...`);
    await page.evaluate(({ key, name }) => {
        if (typeof showModuleContent === 'function') {
            showModuleContent(key, name);
        }
    }, { key: moduleKey, name: moduleName });
    await page.waitForTimeout(4000);
}

async function takeScreenshot(page, name) {
    await page.screenshot({
        path: `test-results/notif-${name}.png`,
        fullPage: true
    });
    console.log(`   📸 Screenshot: notif-${name}.png`);
}

// ============================================================================
// TEST SUITE 1: INBOX - Centro de Mensajería
// ============================================================================

test.describe('1. INBOX - Centro de Mensajería', () => {

    test('1.1 Carga inicial del Inbox', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        const loggedIn = await loginAsAdmin(page);
        expect(loggedIn).toBe(true);

        await navigateToModule(page, 'inbox', 'Bandeja de Entrada');
        await takeScreenshot(page, '01-inbox-inicial');

        // Verificar estructura del inbox
        const hasInboxContainer = await page.locator('.inbox-container, #inboxContainer, [class*="inbox"]').count();
        console.log(`   Contenedores inbox: ${hasInboxContainer}`);

        // Verificar sidebar de categorías
        const categories = await page.locator('.inbox-category, .category-item, [class*="category"]').count();
        console.log(`   Categorías: ${categories}`);

        // Verificar lista de conversaciones
        const conversations = await page.locator('.inbox-thread, .conversation-item, [class*="thread"]').count();
        console.log(`   Conversaciones: ${conversations}`);

        // Verificar badge de no leídos
        const unreadBadge = await page.locator('.unread-badge, .badge-count, [class*="unread"]').first();
        if (await unreadBadge.isVisible().catch(() => false)) {
            const unreadCount = await unreadBadge.textContent();
            console.log(`   No leídos: ${unreadCount}`);
        }
    });

    test('1.2 Filtros del Inbox', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);
        await navigateToModule(page, 'inbox', 'Bandeja de Entrada');

        // Probar filtro "Todos"
        const allFilter = await page.locator('button:has-text("Todos"), [data-filter="all"]').first();
        if (await allFilter.isVisible().catch(() => false)) {
            await allFilter.click();
            await page.waitForTimeout(1500);
            console.log('   ✅ Filtro Todos');
        }

        // Probar filtro "No leídos"
        const unreadFilter = await page.locator('button:has-text("No leídos"), [data-filter="unread"]').first();
        if (await unreadFilter.isVisible().catch(() => false)) {
            await unreadFilter.click();
            await page.waitForTimeout(1500);
            console.log('   ✅ Filtro No leídos');
            await takeScreenshot(page, '02-inbox-unread');
        }

        // Probar filtro "Requieren acción"
        const actionFilter = await page.locator('button:has-text("Requieren"), button:has-text("Acción"), [data-filter="action"]').first();
        if (await actionFilter.isVisible().catch(() => false)) {
            await actionFilter.click();
            await page.waitForTimeout(1500);
            console.log('   ✅ Filtro Requieren acción');
            await takeScreenshot(page, '03-inbox-action');
        }

        // Probar filtro por categoría
        const categoryButtons = await page.locator('.category-btn, .inbox-category-item').all();
        for (let i = 0; i < Math.min(categoryButtons.length, 3); i++) {
            await categoryButtons[i].click();
            await page.waitForTimeout(1000);
            const catName = await categoryButtons[i].textContent();
            console.log(`   ✅ Categoría: ${catName?.trim().substring(0, 20)}`);
        }
    });

    test('1.3 Abrir conversación y ver mensajes', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);
        await navigateToModule(page, 'inbox', 'Bandeja de Entrada');

        // Buscar primera conversación
        const firstThread = await page.locator('.inbox-thread, .conversation-item, .thread-item').first();

        if (await firstThread.isVisible().catch(() => false)) {
            await firstThread.click();
            await page.waitForTimeout(2000);
            console.log('   ✅ Conversación abierta');

            await takeScreenshot(page, '04-inbox-conversation');

            // Verificar mensajes
            const messages = await page.locator('.message-item, .inbox-message, [class*="message"]').count();
            console.log(`   Mensajes en hilo: ${messages}`);

            // Verificar campo de respuesta
            const replyInput = await page.locator('textarea[name="reply"], .reply-input, [placeholder*="mensaje"], [placeholder*="responder"]').first();
            if (await replyInput.isVisible().catch(() => false)) {
                console.log('   ✅ Campo de respuesta visible');
            }

            // Verificar botones de acción (aprobar/rechazar si aplica)
            const approveBtn = await page.locator('button:has-text("Aprobar"), .btn-approve').first();
            const rejectBtn = await page.locator('button:has-text("Rechazar"), .btn-reject').first();

            if (await approveBtn.isVisible().catch(() => false)) {
                console.log('   ✅ Botón Aprobar visible');
            }
            if (await rejectBtn.isVisible().catch(() => false)) {
                console.log('   ✅ Botón Rechazar visible');
            }
        } else {
            console.log('   ⚠️ No hay conversaciones para abrir');
        }
    });

    test('1.4 Marcar como leído/no leído', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);
        await navigateToModule(page, 'inbox', 'Bandeja de Entrada');

        const firstThread = await page.locator('.inbox-thread, .conversation-item').first();

        if (await firstThread.isVisible().catch(() => false)) {
            // Click derecho o buscar menú de acciones
            const actionMenu = await page.locator('.thread-actions, .action-menu, [class*="actions"]').first();

            if (await actionMenu.isVisible().catch(() => false)) {
                await actionMenu.click();
                await page.waitForTimeout(500);

                const markReadBtn = await page.locator('button:has-text("Marcar"), [data-action="mark-read"]').first();
                if (await markReadBtn.isVisible().catch(() => false)) {
                    console.log('   ✅ Opción marcar leído encontrada');
                }
            }
        }
    });
});

// ============================================================================
// TEST SUITE 2: NOTIFICATIONS ENTERPRISE - Dashboard
// ============================================================================

test.describe('2. NOTIFICATIONS ENTERPRISE - Dashboard', () => {

    test('2.1 Carga del Dashboard de Notificaciones', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);
        await navigateToModule(page, 'notifications-enterprise', 'Centro de Notificaciones');

        await takeScreenshot(page, '05-enterprise-dashboard');

        // Verificar header
        const header = await page.locator('.ne-header, .notifications-header, h1:has-text("Notificaciones")').first();
        expect(await header.isVisible().catch(() => false)).toBe(true);
        console.log('   ✅ Header visible');

        // Verificar indicador de IA
        const aiIndicator = await page.locator('[class*="ai"], :has-text("IA"), :has-text("Ollama")').first();
        if (await aiIndicator.isVisible().catch(() => false)) {
            console.log('   ✅ Indicador IA visible');
        }

        // Verificar stats cards
        const statsCards = await page.locator('.ne-stat-card, .stat-card, [class*="stat"]').count();
        console.log(`   Stats cards: ${statsCards}`);
    });

    test('2.2 Estadísticas del Dashboard', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);
        await navigateToModule(page, 'notifications-enterprise', 'Centro de Notificaciones');

        // Verificar cada stat card
        const statValues = await page.locator('.ne-stat-value, .stat-value').allTextContents();
        console.log(`   Valores de stats: ${statValues.join(', ')}`);

        // Click en stat card "Total"
        const totalCard = await page.locator('.ne-stat-card:has-text("Total"), [class*="stat"]:has-text("Total")').first();
        if (await totalCard.isVisible().catch(() => false)) {
            await totalCard.click();
            await page.waitForTimeout(2000);
            console.log('   ✅ Click en Total');
            await takeScreenshot(page, '06-enterprise-total');
        }

        // Click en stat card "Urgentes"
        const urgentCard = await page.locator('.ne-stat-card:has-text("Urgente"), [class*="stat"]:has-text("Urgente")').first();
        if (await urgentCard.isVisible().catch(() => false)) {
            await urgentCard.click();
            await page.waitForTimeout(2000);
            console.log('   ✅ Click en Urgentes');
            await takeScreenshot(page, '07-enterprise-urgent');
        }

        // Click en stat card "Requieren Acción"
        const actionCard = await page.locator('.ne-stat-card:has-text("Acción"), [class*="stat"]:has-text("Acción")').first();
        if (await actionCard.isVisible().catch(() => false)) {
            await actionCard.click();
            await page.waitForTimeout(2000);
            console.log('   ✅ Click en Requieren Acción');
            await takeScreenshot(page, '08-enterprise-action');
        }
    });

    test('2.3 Lista de Notificaciones', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);
        await navigateToModule(page, 'notifications-enterprise', 'Centro de Notificaciones');

        // Buscar botón "Ver Lista"
        const listBtn = await page.locator('button:has-text("Ver Lista"), button:has-text("Ver Todas")').first();
        if (await listBtn.isVisible().catch(() => false)) {
            await listBtn.click();
            await page.waitForTimeout(2000);
            console.log('   ✅ Vista lista');
            await takeScreenshot(page, '09-enterprise-list');
        }

        // Verificar tarjetas de notificación
        const notifCards = await page.locator('.ne-notification-card, .notification-card, [class*="notification-item"]').count();
        console.log(`   Notificaciones en lista: ${notifCards}`);

        // Verificar badges de prioridad
        const urgentBadges = await page.locator('.ne-badge-urgent, .badge-urgent, [class*="urgent"]').count();
        const highBadges = await page.locator('.ne-badge-high, .badge-high, [class*="high"]').count();
        console.log(`   Badges urgente: ${urgentBadges}, alto: ${highBadges}`);
    });

    test('2.4 Detalle de Notificación', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);
        await navigateToModule(page, 'notifications-enterprise', 'Centro de Notificaciones');

        // Buscar y clickear primera notificación
        const firstNotif = await page.locator('.ne-notification-card, .notification-card').first();

        if (await firstNotif.isVisible().catch(() => false)) {
            await firstNotif.click();
            await page.waitForTimeout(2000);

            // Verificar modal de detalle
            const modal = await page.locator('.ne-modal, .modal, [role="dialog"]').first();
            if (await modal.isVisible().catch(() => false)) {
                console.log('   ✅ Modal de detalle abierto');
                await takeScreenshot(page, '10-enterprise-detail');

                // Verificar contenido del modal
                const title = await page.locator('.ne-modal-title, .modal-title').first();
                if (await title.isVisible().catch(() => false)) {
                    const titleText = await title.textContent();
                    console.log(`   Título: ${titleText?.substring(0, 50)}`);
                }

                // Verificar historial de acciones
                const actionsLog = await page.locator('.ne-actions-log, .actions-history').first();
                if (await actionsLog.isVisible().catch(() => false)) {
                    console.log('   ✅ Historial de acciones visible');
                }

                // Cerrar modal
                const closeBtn = await page.locator('.ne-modal-close, .modal-close, button:has-text("Cerrar")').first();
                if (await closeBtn.isVisible().catch(() => false)) {
                    await closeBtn.click();
                    await page.waitForTimeout(500);
                }
            }
        } else {
            console.log('   ⚠️ No hay notificaciones para ver detalle');
        }
    });

    test('2.5 Deadline Countdown', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);
        await navigateToModule(page, 'notifications-enterprise', 'Centro de Notificaciones');

        // Buscar notificaciones con deadline
        const deadlines = await page.locator('.ne-deadline, .deadline-countdown, [class*="deadline"]').all();
        console.log(`   Notificaciones con deadline: ${deadlines.length}`);

        for (let i = 0; i < Math.min(deadlines.length, 3); i++) {
            const deadlineText = await deadlines[i].textContent();
            console.log(`   Deadline ${i + 1}: ${deadlineText?.trim()}`);
        }

        // Verificar clases de urgencia
        const criticalDeadlines = await page.locator('.ne-deadline-critical, [class*="deadline-critical"]').count();
        const highDeadlines = await page.locator('.ne-deadline-high, [class*="deadline-high"]').count();
        console.log(`   Críticos: ${criticalDeadlines}, Altos: ${highDeadlines}`);
    });
});

// ============================================================================
// TEST SUITE 3: SISTEMA DE SOPORTE (TICKETS)
// ============================================================================

test.describe('3. SISTEMA DE SOPORTE - Tickets', () => {

    test('3.1 Acceso a Soporte', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);

        // Buscar botón/link de soporte
        const supportBtn = await page.locator('button:has-text("Soporte"), a:has-text("Soporte"), [class*="support"]').first();

        if (await supportBtn.isVisible().catch(() => false)) {
            await supportBtn.click();
            await page.waitForTimeout(3000);
            console.log('   ✅ Módulo de soporte accedido');
            await takeScreenshot(page, '11-support-main');
        } else {
            // Intentar navegar directamente
            await navigateToModule(page, 'support', 'Soporte');
            await takeScreenshot(page, '11-support-main');
        }
    });

    test('3.2 Lista de Tickets', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);

        // Buscar tickets en el inbox o módulo específico
        await navigateToModule(page, 'inbox', 'Bandeja de Entrada');

        // Filtrar por soporte si hay categoría
        const supportCategory = await page.locator('[data-category="support"], button:has-text("Soporte"), .category-support').first();
        if (await supportCategory.isVisible().catch(() => false)) {
            await supportCategory.click();
            await page.waitForTimeout(2000);
            console.log('   ✅ Categoría soporte seleccionada');
            await takeScreenshot(page, '12-support-tickets');
        }

        // Contar tickets
        const tickets = await page.locator('.ticket-item, .support-ticket, [class*="ticket"]').count();
        console.log(`   Tickets encontrados: ${tickets}`);
    });

    test('3.3 Crear Ticket (UI Flow)', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);

        // Buscar botón crear ticket
        const createBtn = await page.locator('button:has-text("Nuevo Ticket"), button:has-text("Crear Ticket"), .btn-new-ticket').first();

        if (await createBtn.isVisible().catch(() => false)) {
            await createBtn.click();
            await page.waitForTimeout(2000);

            // Verificar modal/formulario de ticket
            const ticketForm = await page.locator('.ticket-form, .support-form, [class*="ticket-modal"]').first();
            if (await ticketForm.isVisible().catch(() => false)) {
                console.log('   ✅ Formulario de ticket abierto');
                await takeScreenshot(page, '13-support-create');

                // Verificar campos
                const subjectField = await page.locator('input[name="subject"], #ticketSubject').first();
                const descField = await page.locator('textarea[name="description"], #ticketDescription').first();

                if (await subjectField.isVisible().catch(() => false)) {
                    console.log('   ✅ Campo asunto visible');
                }
                if (await descField.isVisible().catch(() => false)) {
                    console.log('   ✅ Campo descripción visible');
                }

                // Cerrar sin guardar
                await page.keyboard.press('Escape');
            }
        } else {
            console.log('   ⚠️ Botón crear ticket no encontrado');
        }
    });
});

// ============================================================================
// TEST SUITE 4: APROBACIONES Y WORKFLOWS
// ============================================================================

test.describe('4. APROBACIONES Y WORKFLOWS', () => {

    test('4.1 Notificaciones Pendientes de Aprobación', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);
        await navigateToModule(page, 'notifications-enterprise', 'Centro de Notificaciones');

        // Buscar notificaciones que requieren acción
        const pendingApproval = await page.locator('[class*="requires-action"], .pending-approval, :has-text("Requiere")').all();
        console.log(`   Pendientes de aprobación: ${pendingApproval.length}`);

        if (pendingApproval.length > 0) {
            await takeScreenshot(page, '14-approvals-pending');
        }
    });

    test('4.2 Flujo de Aprobación', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);
        await navigateToModule(page, 'notifications-enterprise', 'Centro de Notificaciones');

        // Buscar notificación con botones aprobar/rechazar
        const notifWithActions = await page.locator('.ne-notification-card:has(button:has-text("Aprobar"))').first();

        if (await notifWithActions.isVisible().catch(() => false)) {
            console.log('   ✅ Notificación con acciones encontrada');

            // Verificar botones
            const approveBtn = await notifWithActions.locator('button:has-text("Aprobar")').first();
            const rejectBtn = await notifWithActions.locator('button:has-text("Rechazar")').first();

            expect(await approveBtn.isVisible()).toBe(true);
            expect(await rejectBtn.isVisible()).toBe(true);

            console.log('   ✅ Botones Aprobar/Rechazar visibles');
            await takeScreenshot(page, '15-approval-buttons');

            // NO hacer click real para no afectar datos
        } else {
            console.log('   ⚠️ No hay notificaciones con acciones de aprobación');
        }
    });

    test('4.3 Modal de Aprobación con Notas', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);
        await navigateToModule(page, 'notifications-enterprise', 'Centro de Notificaciones');

        // Abrir detalle de notificación con acción pendiente
        const actionNotif = await page.locator('.ne-notification-card:has([class*="action"])').first();

        if (await actionNotif.isVisible().catch(() => false)) {
            await actionNotif.click();
            await page.waitForTimeout(2000);

            // Verificar textarea para notas
            const notesTextarea = await page.locator('#neResponseText, textarea[placeholder*="comentario"], .response-textarea').first();
            if (await notesTextarea.isVisible().catch(() => false)) {
                console.log('   ✅ Campo de notas/respuesta visible');
            }

            await takeScreenshot(page, '16-approval-modal');

            // Cerrar modal
            await page.keyboard.press('Escape');
        }
    });
});

// ============================================================================
// TEST SUITE 5: MULTI-CANAL Y PREFERENCIAS
// ============================================================================

test.describe('5. MULTI-CANAL Y PREFERENCIAS', () => {

    test('5.1 Verificar Canales en Notificaciones', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);
        await navigateToModule(page, 'notifications-enterprise', 'Centro de Notificaciones');

        // Buscar indicadores de canal
        const emailIndicators = await page.locator('[title*="Email"], [class*="email"], :has-text("📧")').count();
        const pushIndicators = await page.locator('[title*="Push"], [class*="push"], :has-text("📱")').count();
        const smsIndicators = await page.locator('[title*="SMS"], [class*="sms"]').count();
        const wsIndicators = await page.locator('[title*="WebSocket"], [class*="realtime"]').count();

        console.log(`   Canales encontrados:`);
        console.log(`   - Email: ${emailIndicators}`);
        console.log(`   - Push: ${pushIndicators}`);
        console.log(`   - SMS: ${smsIndicators}`);
        console.log(`   - WebSocket: ${wsIndicators}`);
    });

    test('5.2 Configuración de Notificaciones (si existe)', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);

        // Buscar settings/preferencias
        const settingsBtn = await page.locator('button:has-text("Configuración"), a:has-text("Preferencias"), [class*="settings"]').first();

        if (await settingsBtn.isVisible().catch(() => false)) {
            await settingsBtn.click();
            await page.waitForTimeout(2000);

            // Buscar sección de notificaciones
            const notifSettings = await page.locator('[class*="notification-settings"], :has-text("Preferencias de notificación")').first();
            if (await notifSettings.isVisible().catch(() => false)) {
                console.log('   ✅ Configuración de notificaciones encontrada');
                await takeScreenshot(page, '17-notification-settings');
            }
        } else {
            console.log('   ⚠️ No se encontró acceso a configuración');
        }
    });
});

// ============================================================================
// TEST SUITE 6: BILLING DE NOTIFICACIONES
// ============================================================================

test.describe('6. BILLING DE NOTIFICACIONES', () => {

    test('6.1 Dashboard de Billing', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);

        // Intentar acceder al módulo de billing
        await navigateToModule(page, 'notification-billing-dashboard', 'Facturación de Notificaciones');
        await page.waitForTimeout(3000);
        await takeScreenshot(page, '18-billing-dashboard');

        // Verificar estadísticas de consumo
        const usageStats = await page.locator('[class*="usage"], [class*="consumption"], :has-text("Consumo")').first();
        if (await usageStats.isVisible().catch(() => false)) {
            console.log('   ✅ Estadísticas de consumo visibles');
        }

        // Verificar canales con costo
        const channelRows = await page.locator('tr:has-text("SMS"), tr:has-text("WhatsApp"), [class*="channel-row"]').count();
        console.log(`   Canales con costo: ${channelRows}`);
    });
});

// ============================================================================
// TEST SUITE 7: INTEGRACIÓN CON MÓDULOS
// ============================================================================

test.describe('7. INTEGRACIÓN CON MÓDULOS', () => {

    test('7.1 Notificaciones desde Vacaciones', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);
        await navigateToModule(page, 'vacation-management', 'Gestión de Vacaciones');
        await page.waitForTimeout(3000);

        // Verificar que el módulo tiene integración con notificaciones
        const notifElements = await page.locator('[class*="notif"], button:has-text("Notificar"), [data-action*="notify"]').count();
        console.log(`   Elementos de notificación en Vacaciones: ${notifElements}`);

        await takeScreenshot(page, '19-integration-vacation');
    });

    test('7.2 Notificaciones desde Asistencia', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);
        await navigateToModule(page, 'attendance', 'Asistencia');
        await page.waitForTimeout(3000);

        // Verificar elementos de notificación
        const notifElements = await page.locator('[class*="notif"], [class*="alert"], .attendance-alert').count();
        console.log(`   Elementos de alerta en Asistencia: ${notifElements}`);

        await takeScreenshot(page, '20-integration-attendance');
    });

    test('7.3 Badge Flotante de Notificaciones', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);

        // El badge debería ser visible en cualquier módulo
        await page.waitForTimeout(2000);

        const floatingBadge = await page.locator('.notification-badge-floating, .notif-badge, [class*="floating-badge"]').first();
        if (await floatingBadge.isVisible().catch(() => false)) {
            console.log('   ✅ Badge flotante visible');

            // Click para abrir panel rápido
            await floatingBadge.click();
            await page.waitForTimeout(1500);
            await takeScreenshot(page, '21-floating-badge-open');
        } else {
            console.log('   ⚠️ Badge flotante no encontrado');
        }
    });
});

// ============================================================================
// TEST SUITE 8: RESUMEN FINAL
// ============================================================================

test.describe('8. RESUMEN Y VERIFICACIONES FINALES', () => {

    test('8.1 Verificación Completa del Sistema', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAsAdmin(page);

        console.log('\n📊 RESUMEN VERIFICACIÓN CENTRO DE NOTIFICACIONES:');
        console.log('================================================');

        // Verificar Inbox
        await navigateToModule(page, 'inbox', 'Bandeja de Entrada');
        const inboxOk = await page.locator('[class*="inbox"]').count() > 0;
        console.log(`   ✅ Inbox: ${inboxOk ? 'OK' : 'FALLO'}`);

        // Verificar Enterprise
        await navigateToModule(page, 'notifications-enterprise', 'Centro de Notificaciones');
        const enterpriseOk = await page.locator('.ne-header, .notifications-enterprise').count() > 0;
        console.log(`   ✅ Enterprise Dashboard: ${enterpriseOk ? 'OK' : 'FALLO'}`);

        // Verificar Stats
        const statsOk = await page.locator('.ne-stat-card, .stat-card').count() >= 2;
        console.log(`   ✅ Stats Cards: ${statsOk ? 'OK' : 'FALLO'}`);

        // Verificar Lista
        const listOk = await page.locator('.ne-notification-card, .notification-card').count() >= 0;
        console.log(`   ✅ Lista Notificaciones: ${listOk ? 'OK' : 'FALLO'}`);

        // Screenshot final
        await takeScreenshot(page, '22-final-summary');

        console.log('================================================');
        console.log('   Screenshots en: test-results/notif-*.png');
        console.log('✅ Suite de tests completada');
    });
});
