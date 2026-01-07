/**
 * ============================================================================
 * TEST NOTIFICATION CIRCUITS
 * ============================================================================
 *
 * Script para probar el sistema de notificaciones enviando una notificación
 * de cada tipo de circuito para verificar que el threading conversacional
 * funciona correctamente.
 *
 * Uso: node scripts/test-notification-circuits.js
 * ============================================================================
 */

require('dotenv').config();
const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');
const NCE = require('../src/services/NotificationCentralExchange');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

/**
 * Obtener usuarios reales de la base de datos
 */
async function getTestUsers(companyId) {
    const users = await sequelize.query(`
        SELECT user_id, email, "firstName", "lastName"
        FROM users
        WHERE company_id = :companyId
          AND is_active = true
          AND account_status = 'active'
        LIMIT 5
    `, {
        replacements: { companyId },
        type: QueryTypes.SELECT
    });

    if (users.length === 0) {
        throw new Error('No se encontraron usuarios activos para la empresa');
    }

    return users;
}

/**
 * Enviar notificación de circuito médico
 */
async function sendMedicalCircuit(companyId, users) {
    console.log(`${colors.cyan}📋 [1/7] Circuito MÉDICO - Examen médico próximo a vencer${colors.reset}`);

    const result = await NCE.send({
        companyId,
        module: 'medical',
        workflowKey: 'medical_aptitude_expiring',

        recipientType: 'user',
        recipientId: users[0].user_id,

        title: 'Apto médico próximo a vencer',
        message: `Su apto médico ocupacional vence en 15 días (30/01/2026). Por favor, coordine la renovación con el departamento de RRHH.`,

        priority: 'high',
        requiresAction: true,
        actionType: 'acknowledgement',
        slaHours: 72,

        channels: ['email', 'inbox', 'websocket'],

        originType: 'medical_exam',
        originId: 'EXAM-2026-001',

        metadata: {
            exam_type: 'Periódico',
            expiry_date: '2026-01-30',
            employee_name: `${users[0].firstName} ${users[0].lastName}`,
            department: 'Administración'
        }
    });

    console.log(`${colors.green}✅ Enviada - Group ID: ${result.groupId}${colors.reset}\n`);
    return result;
}

/**
 * Enviar notificación de circuito vacaciones
 */
async function sendVacationCircuit(companyId, users) {
    console.log(`${colors.cyan}🏖️ [2/7] Circuito VACACIONES - Solicitud de aprobación${colors.reset}`);

    const result = await NCE.send({
        companyId,
        module: 'vacation',
        workflowKey: 'vacation_request_created',

        recipientType: 'hierarchy',
        recipientId: users[1].user_id,

        title: 'Solicitud de vacaciones requiere aprobación',
        message: `${users[1].firstName} ${users[1].lastName} solicita 5 días de vacaciones del 10/02/2026 al 14/02/2026.`,

        priority: 'high',
        requiresAction: true,
        actionType: 'approval',
        slaHours: 48,

        channels: ['email', 'push', 'inbox', 'websocket'],

        originType: 'vacation_request',
        originId: 'VAC-2026-042',

        actionButtons: [
            { label: 'Aprobar', action: 'approve', style: 'success' },
            { label: 'Rechazar', action: 'reject', style: 'danger' }
        ],

        metadata: {
            employee_id: users[1].user_id,
            employee_name: `${users[1].firstName} ${users[1].lastName}`,
            start_date: '2026-02-10',
            end_date: '2026-02-14',
            days_requested: 5,
            available_days: 12
        }
    });

    console.log(`${colors.green}✅ Enviada - Group ID: ${result.groupId}${colors.reset}\n`);
    return result;
}

/**
 * Enviar notificación de circuito compras
 */
async function sendProcurementCircuit(companyId, users) {
    console.log(`${colors.cyan}🛒 [3/7] Circuito COMPRAS - Orden de compra requiere aprobación${colors.reset}`);

    const result = await NCE.send({
        companyId,
        module: 'suppliers',
        workflowKey: 'suppliers.purchase_order_notification',

        recipientType: 'role',
        recipientId: 'finance_manager',

        title: 'Orden de compra #PO-2026-158 requiere aprobación',
        message: `Nueva orden de compra por $45,780.00 para proveedor "Equipos Industriales SA". Artículos: 3 unidades de Equipamiento de seguridad.`,

        priority: 'urgent',
        requiresAction: true,
        actionType: 'approval',
        slaHours: 24,

        channels: ['email', 'sms', 'push', 'inbox', 'websocket'],

        originType: 'purchase_order',
        originId: 'PO-2026-158',

        actionButtons: [
            { label: 'Aprobar', action: 'approve', style: 'success' },
            { label: 'Rechazar', action: 'reject', style: 'danger' },
            { label: 'Solicitar cambios', action: 'request_changes', style: 'warning' }
        ],

        attachments: [
            {
                url: 'https://example.com/attachments/po-2026-158.pdf',
                name: 'Orden_Compra_PO-2026-158.pdf',
                type: 'application/pdf',
                size: 156789
            }
        ],

        metadata: {
            order_number: 'PO-2026-158',
            supplier: 'Equipos Industriales SA',
            total_amount: 45780.00,
            currency: 'ARS',
            items_count: 3,
            requested_by: users[2].email
        }
    });

    console.log(`${colors.green}✅ Enviada - Group ID: ${result.groupId}${colors.reset}\n`);
    return result;
}

/**
 * Enviar notificación de circuito legal
 */
async function sendLegalCircuit(companyId, users) {
    console.log(`${colors.cyan}⚖️ [4/7] Circuito LEGAL - Documento legal requiere revisión${colors.reset}`);

    const result = await NCE.send({
        companyId,
        module: 'legal',
        workflowKey: 'legal_contract_review',

        recipientType: 'user',
        recipientId: users[0].user_id,

        title: 'Documento legal requiere revisión urgente',
        message: `El contrato de renovación con cliente "Empresa XYZ SA" requiere su revisión y firma antes del 20/01/2026.`,

        priority: 'urgent',
        requiresAction: true,
        actionType: 'review',
        slaHours: 48,

        channels: ['email', 'inbox', 'websocket'],

        originType: 'legal_document',
        originId: 'DOC-LEGAL-2026-089',

        richContent: {
            html: '<p>El <strong>contrato de renovación</strong> con cliente <em>Empresa XYZ SA</em> requiere su revisión urgente.</p><ul><li>Plazo: 20/01/2026</li><li>Tipo: Renovación anual</li><li>Monto: $250,000</li></ul>'
        },

        attachments: [
            {
                url: 'https://example.com/legal/contrato-xyz-2026.pdf',
                name: 'Contrato_Renovacion_XYZ_2026.pdf',
                type: 'application/pdf',
                size: 2456789
            }
        ],

        metadata: {
            document_type: 'Contrato de Renovación',
            client: 'Empresa XYZ SA',
            deadline: '2026-01-20',
            contract_value: 250000,
            legal_responsible: users[0].email
        }
    });

    console.log(`${colors.green}✅ Enviada - Group ID: ${result.groupId}${colors.reset}\n`);
    return result;
}

/**
 * Enviar notificación de circuito asistencia
 */
async function sendAttendanceCircuit(companyId, users) {
    console.log(`${colors.cyan}⏰ [5/7] Circuito ASISTENCIA - Llegada tardía detectada${colors.reset}`);

    const result = await NCE.send({
        companyId,
        module: 'attendance',
        workflowKey: 'attendance_late_arrival',

        recipientType: 'user',
        recipientId: users[3].user_id,

        title: 'Llegada tardía registrada',
        message: `Se registró su ingreso a las 09:47 hs (47 minutos de retraso). Por favor, justifique su llegada tardía.`,

        priority: 'normal',
        requiresAction: true,
        actionType: 'response',
        slaHours: 24,

        channels: ['push', 'inbox', 'websocket'],

        originType: 'attendance_event',
        originId: 'ATT-2026-07-001',

        actionButtons: [
            { label: 'Justificar', action: 'justify', style: 'primary' }
        ],

        metadata: {
            employee_id: users[3].user_id,
            employee_name: `${users[3].firstName} ${users[3].lastName}`,
            date: '2026-01-07',
            scheduled_time: '09:00',
            actual_time: '09:47',
            delay_minutes: 47
        }
    });

    console.log(`${colors.green}✅ Enviada - Group ID: ${result.groupId}${colors.reset}\n`);
    return result;
}

/**
 * Enviar notificación de circuito liquidación
 */
async function sendPayrollCircuit(companyId, users) {
    console.log(`${colors.cyan}💰 [6/7] Circuito LIQUIDACIÓN - Recibo de sueldo disponible${colors.reset}`);

    const result = await NCE.send({
        companyId,
        module: 'payroll',
        workflowKey: 'payroll.receipt_available',

        recipientType: 'user',
        recipientId: users[4].user_id,

        title: 'Recibo de sueldo disponible - Enero 2026',
        message: `Su recibo de sueldo correspondiente al período Enero 2026 ya está disponible para descarga en el sistema.`,

        priority: 'normal',
        requiresAction: false,

        channels: ['email', 'push', 'inbox', 'websocket'],

        originType: 'payroll_receipt',
        originId: 'RECIBO-2026-01-' + users[4].user_id,

        imageUrl: 'https://example.com/images/payroll-notification.jpg',

        attachments: [
            {
                url: `https://example.com/payroll/recibo-${users[4].user_id}-2026-01.pdf`,
                name: 'Recibo_Sueldo_Enero_2026.pdf',
                type: 'application/pdf',
                size: 89456
            }
        ],

        metadata: {
            employee_id: users[4].user_id,
            employee_name: `${users[4].firstName} ${users[4].lastName}`,
            period: '2026-01',
            gross_salary: 450000,
            net_salary: 356780,
            payment_date: '2026-01-05'
        }
    });

    console.log(`${colors.green}✅ Enviada - Group ID: ${result.groupId}${colors.reset}\n`);
    return result;
}

/**
 * Enviar notificación de circuito sistema
 */
async function sendSystemCircuit(companyId, users) {
    console.log(`${colors.cyan}🔧 [7/7] Circuito SISTEMA - Mantenimiento programado${colors.reset}`);

    const result = await NCE.send({
        companyId,
        module: 'platform',
        workflowKey: 'platform_maintenance',

        recipientType: 'company_broadcast',
        recipientId: companyId.toString(),

        title: 'Mantenimiento programado del sistema',
        message: `El sistema estará en mantenimiento el sábado 11/01/2026 de 02:00 a 06:00 hs. Durante este período no estará disponible el acceso.`,

        priority: 'normal',
        requiresAction: false,

        channels: ['email', 'inbox', 'websocket'],

        originType: 'system_announcement',
        originId: 'MAINT-2026-01-11',

        imageUrl: 'https://example.com/images/maintenance.jpg',

        metadata: {
            maintenance_type: 'Actualización de sistema',
            start_time: '2026-01-11T02:00:00Z',
            end_time: '2026-01-11T06:00:00Z',
            affected_services: ['Web', 'APK', 'API'],
            impact: 'Total downtime'
        }
    });

    console.log(`${colors.green}✅ Enviada - Group ID: ${result.groupId}${colors.reset}\n`);
    return result;
}

/**
 * Verificar grupos creados en la base de datos
 */
async function verifyInboxGroups(companyId) {
    console.log(`${colors.blue}📊 Verificando grupos creados en notification_groups...${colors.reset}`);

    const groups = await sequelize.query(`
        SELECT
            id,
            group_type,
            subject,
            priority,
            status,
            metadata->>'origin_type' as origin_type,
            metadata->>'origin_id' as origin_id,
            metadata->>'workflow_key' as workflow_key,
            (SELECT COUNT(*) FROM notification_messages WHERE group_id = ng.id) as message_count,
            created_at
        FROM notification_groups ng
        WHERE company_id = :companyId
          AND created_at > NOW() - INTERVAL '10 minutes'
        ORDER BY created_at DESC
    `, {
        replacements: { companyId },
        type: QueryTypes.SELECT
    });

    console.log(`${colors.green}✅ Se crearon ${groups.length} grupos:${colors.reset}\n`);

    groups.forEach((group, index) => {
        console.log(`${colors.yellow}  ${index + 1}. ${group.subject}${colors.reset}`);
        console.log(`     - Group ID: ${group.id}`);
        console.log(`     - Tipo: ${group.origin_type} / ${group.origin_id}`);
        console.log(`     - Workflow: ${group.workflow_key}`);
        console.log(`     - Mensajes: ${group.message_count}`);
        console.log(`     - Estado: ${group.status}`);
        console.log('');
    });

    return groups;
}

/**
 * Main execution
 */
async function main() {
    try {
        console.log(`${colors.blue}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.blue}║  TEST DE CIRCUITOS DE NOTIFICACIÓN - Threading Conversacional  ║${colors.reset}`);
        console.log(`${colors.blue}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

        // Conectar a la base de datos
        await sequelize.authenticate();
        console.log(`${colors.green}✅ Conectado a PostgreSQL${colors.reset}\n`);

        // Usar empresa de prueba (ID 11 = aponnt-empresa-demo)
        const companyId = 11;

        // Obtener usuarios reales
        console.log(`${colors.blue}📋 Obteniendo usuarios de prueba...${colors.reset}`);
        const users = await getTestUsers(companyId);
        console.log(`${colors.green}✅ Se encontraron ${users.length} usuarios activos${colors.reset}\n`);

        // Enviar notificaciones de cada circuito
        const results = [];

        results.push(await sendMedicalCircuit(companyId, users));
        results.push(await sendVacationCircuit(companyId, users));
        results.push(await sendProcurementCircuit(companyId, users));
        results.push(await sendLegalCircuit(companyId, users));
        results.push(await sendAttendanceCircuit(companyId, users));
        results.push(await sendPayrollCircuit(companyId, users));
        results.push(await sendSystemCircuit(companyId, users));

        // Verificar grupos en la base de datos
        console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
        const groups = await verifyInboxGroups(companyId);

        // Resumen final
        console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
        console.log(`${colors.green}✅ TEST COMPLETADO EXITOSAMENTE${colors.reset}\n`);
        console.log(`${colors.cyan}Resultados:${colors.reset}`);
        console.log(`  - Notificaciones enviadas: ${results.length}`);
        console.log(`  - Grupos conversacionales creados: ${groups.length}`);
        console.log(`  - Mensajes totales: ${groups.reduce((sum, g) => sum + parseInt(g.message_count), 0)}`);
        console.log('');
        console.log(`${colors.yellow}🔍 Para ver los resultados en el frontend:${colors.reset}`);
        console.log(`  1. Abrir: http://localhost:9998/panel-empresa.html`);
        console.log(`  2. Login con: aponnt-empresa-demo / administrador / admin123`);
        console.log(`  3. Ir a: Módulos del Sistema → Centro de Notificaciones`);
        console.log(`  4. Verificar que aparecen los 7 hilos conversacionales`);
        console.log('');

    } catch (error) {
        console.error(`${colors.red}❌ Error:${colors.reset}`, error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

// Ejecutar
main();
