/**
 * TEST COMPLETO DE ESCALAMIENTO
 * Ejecuta los 3 escenarios de escalamiento
 */

const { sequelize } = require('../src/config/database');

async function run() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETO DE ESCALAMIENTO DE SOPORTE');
    console.log('='.repeat(60));

    try {
        // 1. Obtener staff IDs
        const [staff] = await sequelize.query(`
            SELECT staff_id, first_name, last_name, email,
                   (SELECT role_code FROM aponnt_staff_roles WHERE role_id = aponnt_staff.role_id) as role
            FROM aponnt_staff
            WHERE email IN ('pablorivasjordan52@gmail.com', 'aponntcoordinacionsoporte@gmail.com', 'aponntsuite@gmail.com')
        `);

        console.log('\n=== STAFF DISPONIBLE ===');
        staff.forEach(s => console.log(`  ${s.role}: ${s.first_name} ${s.last_name} (${s.email})`));

        const pablo = staff.find(s => s.email === 'pablorivasjordan52@gmail.com');
        const coord = staff.find(s => s.email === 'aponntcoordinacionsoporte@gmail.com');
        const dir = staff.find(s => s.email === 'aponntsuite@gmail.com');

        if (!pablo || !coord || !dir) {
            throw new Error('No se encontraron todos los staff necesarios');
        }

        // 2. Asignar tickets a Pablo
        console.log('\n=== ASIGNANDO TICKETS A PABLO ===');
        await sequelize.query(`
            UPDATE support_tickets
            SET assigned_staff_id = :pabloId
            WHERE ticket_number IN ('TICKET-2025-000007', 'TICKET-2025-000008', 'TICKET-2025-000009')
        `, { replacements: { pabloId: pablo.staff_id }});
        console.log('  ✅ 3 tickets asignados a Pablo');

        // 3. Obtener ticket IDs
        const [tickets] = await sequelize.query(`
            SELECT ticket_id, ticket_number FROM support_tickets
            WHERE ticket_number IN ('TICKET-2025-000008', 'TICKET-2025-000009')
        `);

        const ticket8 = tickets.find(t => t.ticket_number === 'TICKET-2025-000008');
        const ticket9 = tickets.find(t => t.ticket_number === 'TICKET-2025-000009');

        // 4. ESCENARIO 2: Escalar ticket 8 a coordinador
        console.log('\n=== ESCENARIO 2: ESCALAMIENTO A COORDINADOR ===');

        await sequelize.query(`
            INSERT INTO support_ticket_escalations (ticket_id, from_level, to_level, from_staff_id, to_staff_id, escalation_type, reason, escalated_by)
            VALUES (:ticketId, 1, 2, :pabloId, :coordId, 'voluntary', 'Requiere revision de codigo de payroll', :pabloId)
        `, { replacements: { ticketId: ticket8.ticket_id, pabloId: pablo.staff_id, coordId: coord.staff_id }});

        await sequelize.query(`
            UPDATE support_tickets
            SET escalation_level = 2, assigned_staff_id = :coordId, escalated_at = NOW(), escalation_reason = 'Escalado a Coordinador de Soporte'
            WHERE ticket_id = :ticketId
        `, { replacements: { ticketId: ticket8.ticket_id, coordId: coord.staff_id }});

        console.log('  ✅ TICKET-2025-000008 escalado a Coordinador (nivel 2)');

        // 5. ESCENARIO 3: Escalar ticket 9 dos veces (a coord y a dirección)
        console.log('\n=== ESCENARIO 3: ESCALAMIENTO HASTA DIRECCIÓN ===');

        // Primer escalamiento: Pablo → Coordinador
        await sequelize.query(`
            INSERT INTO support_ticket_escalations (ticket_id, from_level, to_level, from_staff_id, to_staff_id, escalation_type, reason, escalated_by)
            VALUES (:ticketId, 1, 2, :pabloId, :coordId, 'voluntary', 'Sistema caido - requiere coordinacion inmediata', :pabloId)
        `, { replacements: { ticketId: ticket9.ticket_id, pabloId: pablo.staff_id, coordId: coord.staff_id }});

        await sequelize.query(`
            UPDATE support_tickets
            SET escalation_level = 2, assigned_staff_id = :coordId, escalated_at = NOW()
            WHERE ticket_id = :ticketId
        `, { replacements: { ticketId: ticket9.ticket_id, coordId: coord.staff_id }});

        console.log('  ✅ Escalamiento 1: Pablo → Coordinador (nivel 2)');

        // Segundo escalamiento: Coordinador → Dirección
        await sequelize.query(`
            INSERT INTO support_ticket_escalations (ticket_id, from_level, to_level, from_staff_id, to_staff_id, escalation_type, reason, escalated_by)
            VALUES (:ticketId, 2, 3, :coordId, :dirId, 'voluntary', 'Requiere autorizacion de gastos y decision ejecutiva', :coordId)
        `, { replacements: { ticketId: ticket9.ticket_id, coordId: coord.staff_id, dirId: dir.staff_id }});

        await sequelize.query(`
            UPDATE support_tickets
            SET escalation_level = 3, assigned_staff_id = :dirId, escalated_at = NOW(), escalation_reason = 'Escalado a Direccion General'
            WHERE ticket_id = :ticketId
        `, { replacements: { ticketId: ticket9.ticket_id, dirId: dir.staff_id }});

        console.log('  ✅ Escalamiento 2: Coordinador → Dirección (nivel 3)');

        // 6. Mostrar estado final
        console.log('\n' + '='.repeat(60));
        console.log('ESTADO FINAL DE TICKETS');
        console.log('='.repeat(60));

        const [final] = await sequelize.query(`
            SELECT ticket_number, subject, priority, escalation_level,
                   (SELECT email FROM aponnt_staff WHERE staff_id = assigned_staff_id) as assigned_to,
                   thread_id
            FROM support_tickets
            WHERE ticket_number LIKE 'TICKET-2025-00000%'
            ORDER BY ticket_number
        `);

        final.forEach(t => {
            console.log(`\n  📋 ${t.ticket_number} (${t.priority})`);
            console.log(`     Nivel: ${t.escalation_level}`);
            console.log(`     Asignado a: ${t.assigned_to || 'N/A'}`);
            console.log(`     Thread ID: ${t.thread_id || 'N/A'}`);
        });

        // 7. Verificar escalamientos
        console.log('\n' + '='.repeat(60));
        console.log('HISTORIAL DE ESCALAMIENTOS');
        console.log('='.repeat(60));

        const [escHistory] = await sequelize.query(`
            SELECT
                st.ticket_number,
                ste.from_level,
                ste.to_level,
                ste.escalation_type,
                ste.reason,
                (SELECT email FROM aponnt_staff WHERE staff_id = ste.from_staff_id) as from_email,
                (SELECT email FROM aponnt_staff WHERE staff_id = ste.to_staff_id) as to_email
            FROM support_ticket_escalations ste
            JOIN support_tickets st ON st.ticket_id = ste.ticket_id
            WHERE st.ticket_number LIKE 'TICKET-2025-00000%'
            ORDER BY st.ticket_number, ste.created_at
        `);

        escHistory.forEach(h => {
            console.log(`\n  ${h.ticket_number}: Nivel ${h.from_level} → ${h.to_level} (${h.escalation_type})`);
            console.log(`     De: ${h.from_email}`);
            console.log(`     A: ${h.to_email}`);
            console.log(`     Razón: ${h.reason}`);
        });

        // 8. Verificar notificaciones
        console.log('\n' + '='.repeat(60));
        console.log('TICKETS EN SISTEMA DE NOTIFICACIONES');
        console.log('='.repeat(60));

        const [notifications] = await sequelize.query(`
            SELECT
                st.ticket_number,
                nt.thread_type,
                nt.status as thread_status,
                nu.title as notification_title,
                nu.is_read
            FROM support_tickets st
            LEFT JOIN notification_threads nt ON st.thread_id = nt.thread_id
            LEFT JOIN notifications_unified nu ON st.notification_id = nu.notification_id
            WHERE st.ticket_number LIKE 'TICKET-2025-00000%'
            ORDER BY st.ticket_number
        `);

        notifications.forEach(n => {
            console.log(`\n  ${n.ticket_number}:`);
            console.log(`     Thread: ${n.thread_type || 'N/A'} (${n.thread_status || 'N/A'})`);
            console.log(`     Notif: ${n.notification_title || 'N/A'}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('✅ TEST COMPLETO EXITOSO');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

run();
