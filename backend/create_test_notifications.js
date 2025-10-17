const database = require('./src/config/database');
const { QueryTypes } = require('sequelize');
const crypto = require('crypto');

function generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

async function createTestNotifications() {
    try {
        console.log('Connecting to database...');
        await database.sequelize.authenticate();
        console.log('Connected successfully\n');

        const companyId = 11; // ISI
        const adminUserId = '766de495-e4f3-4e91-a509-1a495c52e15c'; // Admin ISI

        console.log('Creating 5 test notification groups...\n');

        // CASE 1: Vacation Request - Medium Priority, Open
        console.log('1. Vacation Request - Juan Perez');
        const group1 = await database.sequelize.query(`
            INSERT INTO notification_groups (
                id, group_type, initiator_type, initiator_id, subject, status, priority,
                company_id, created_at, metadata
            ) VALUES (
                gen_random_uuid(),
                'vacation_request',
                'employee',
                'EMP-ISI-001',
                'Solicitud de Vacaciones - Juan Perez',
                'open',
                'medium',
                :companyId,
                NOW() - INTERVAL '2 hours',
                :metadata
            ) RETURNING id
        `, {
            replacements: {
                companyId,
                metadata: JSON.stringify({
                    participants: ['EMP-ISI-001', 'rrhh', adminUserId],
                    employee_name: 'Juan Perez',
                    request_type: 'vacation',
                    days: 7,
                    from: '2025-12-01',
                    to: '2025-12-07'
                })
            },
            type: QueryTypes.INSERT
        });

        const groupId1 = group1[0][0].id;

        const msg1 = 'Nueva solicitud de vacaciones recibida';
        const msg2 = 'Hola, solicito vacaciones del 1 al 7 de diciembre. Son 7 dias habiles.';
        const msg3 = 'Revisando tu solicitud Juan. Ya confirmaste con tu supervisor?';

        await database.sequelize.query(`
            INSERT INTO notification_messages (
                id, group_id, sequence_number, sender_type, sender_id, sender_name,
                recipient_type, recipient_id, recipient_name, message_type, subject,
                content, message_hash, created_at, requires_response, is_deleted, company_id, read_at
            ) VALUES
            (gen_random_uuid(), :groupId, 1, 'system', 'system', 'Sistema',
             'all', 'all', 'Todos', 'notification', 'Nueva solicitud',
             :msg1, :hash1, NOW() - INTERVAL '2 hours', false, false, :companyId, NOW() - INTERVAL '2 hours'),
            (gen_random_uuid(), :groupId, 2, 'employee', 'EMP-ISI-001', 'Juan Perez',
             'department', 'rrhh', 'Recursos Humanos', 'text', null,
             :msg2, :hash2, NOW() - INTERVAL '1 hour 50 min', true, false, :companyId, NOW() - INTERVAL '1 hour 50 min'),
            (gen_random_uuid(), :groupId, 3, 'department', 'rrhh', 'RRHH',
             'employee', 'EMP-ISI-001', 'Juan Perez', 'text', null,
             :msg3, :hash3, NOW() - INTERVAL '30 min', true, false, :companyId, NULL)
        `, {
            replacements: {
                groupId: groupId1,
                companyId,
                msg1, hash1: generateHash(msg1),
                msg2, hash2: generateHash(msg2),
                msg3, hash3: generateHash(msg3)
            },
            type: QueryTypes.INSERT
        });

        console.log('   Created group with 3 messages\n');

        // CASE 2: Late Arrival - Critical Priority, Pending
        console.log('2. Late Arrival - Maria Gonzalez (CRITICAL)');
        const group2 = await database.sequelize.query(`
            INSERT INTO notification_groups (
                id, group_type, initiator_type, initiator_id, subject, status, priority,
                company_id, created_at, metadata
            ) VALUES (
                gen_random_uuid(),
                'late_arrival',
                'system',
                'attendance_system',
                'Llegada Tardia - Maria Gonzalez',
                'pending',
                'critical',
                :companyId,
                NOW() - INTERVAL '5 hours',
                :metadata
            ) RETURNING id
        `, {
            replacements: {
                companyId,
                metadata: JSON.stringify({
                    participants: ['EMP-ISI-002', 'rrhh', adminUserId, 'supervisor'],
                    employee_name: 'Maria Gonzalez',
                    delay_minutes: 45,
                    date: '2025-10-16',
                    auto_generated: true
                })
            },
            type: QueryTypes.INSERT
        });

        const groupId2 = group2[0][0].id;

        const msgs2 = [
            'Llegada tardia detectada: 45 minutos de retraso',
            'Disculpen el retraso, hubo un accidente en la autopista y quede atrapada en el trafico',
            'Maria, tienes alguna evidencia del accidente? (foto, noticia, etc.)',
            'Si, adjunto captura de Waze mostrando el trafico',
            'Justificacion aceptada. No se aplicara descuento.',
            'La justificacion ha sido aprobada por RRHH'
        ];

        await database.sequelize.query(`
            INSERT INTO notification_messages (
                id, group_id, sequence_number, sender_type, sender_id, sender_name,
                recipient_type, recipient_id, recipient_name, message_type, subject,
                content, message_hash, created_at, requires_response, is_deleted, company_id, read_at
            ) VALUES
            (gen_random_uuid(), :groupId, 1, 'system', 'system', 'Sistema',
             'all', 'all', 'Todos', 'alert', 'Llegada tardia detectada',
             :m0, :h0, NOW() - INTERVAL '5 hours', false, false, :companyId, NOW() - INTERVAL '5 hours'),
            (gen_random_uuid(), :groupId, 2, 'employee', 'EMP-ISI-002', 'Maria Gonzalez',
             'department', 'rrhh', 'Recursos Humanos', 'text', null,
             :m1, :h1, NOW() - INTERVAL '4 hours', false, false, :companyId, NOW() - INTERVAL '4 hours'),
            (gen_random_uuid(), :groupId, 3, 'supervisor', 'supervisor', 'Supervisor',
             'employee', 'EMP-ISI-002', 'Maria Gonzalez', 'text', null,
             :m2, :h2, NOW() - INTERVAL '3 hours', true, false, :companyId, NOW() - INTERVAL '3 hours'),
            (gen_random_uuid(), :groupId, 4, 'employee', 'EMP-ISI-002', 'Maria Gonzalez',
             'supervisor', 'supervisor', 'Supervisor', 'text', null,
             :m3, :h3, NOW() - INTERVAL '2 hours 30 min', false, false, :companyId, NOW() - INTERVAL '2 hours 30 min'),
            (gen_random_uuid(), :groupId, 5, 'department', 'rrhh', 'RRHH',
             'employee', 'EMP-ISI-002', 'Maria Gonzalez', 'text', null,
             :m4, :h4, NOW() - INTERVAL '1 hour', false, false, :companyId, NULL),
            (gen_random_uuid(), :groupId, 6, 'system', 'system', 'Sistema',
             'all', 'all', 'Todos', 'notification', 'Solicitud aprobada',
             :m5, :h5, NOW() - INTERVAL '1 hour', false, false, :companyId, NULL)
        `, {
            replacements: {
                groupId: groupId2,
                companyId,
                m0: msgs2[0], h0: generateHash(msgs2[0]),
                m1: msgs2[1], h1: generateHash(msgs2[1]),
                m2: msgs2[2], h2: generateHash(msgs2[2]),
                m3: msgs2[3], h3: generateHash(msgs2[3]),
                m4: msgs2[4], h4: generateHash(msgs2[4]),
                m5: msgs2[5], h5: generateHash(msgs2[5])
            },
            type: QueryTypes.INSERT
        });

        console.log('   Created group with 6 messages\n');

        // CASE 3: Overtime Request - High Priority, Pending
        console.log('3. Overtime Request - Pedro Lopez');
        const group3 = await database.sequelize.query(`
            INSERT INTO notification_groups (
                id, group_type, initiator_type, initiator_id, subject, status, priority,
                company_id, created_at, metadata
            ) VALUES (
                gen_random_uuid(),
                'overtime_request',
                'employee',
                'EMP-ISI-003',
                'Solicitud de Horas Extra - Pedro Lopez',
                'pending',
                'high',
                :companyId,
                NOW() - INTERVAL '30 minutes',
                :metadata
            ) RETURNING id
        `, {
            replacements: {
                companyId,
                metadata: JSON.stringify({
                    participants: ['EMP-ISI-003', 'rrhh', adminUserId],
                    employee_name: 'Pedro Lopez',
                    hours: 4,
                    date: '2025-10-17',
                    reason: 'Cierre de proyecto urgente'
                })
            },
            type: QueryTypes.INSERT
        });

        const groupId3 = group3[0][0].id;

        const msgs3 = [
            'Nueva solicitud de horas extra',
            'Necesito 4 horas extra manana para terminar el deployment del proyecto SIAC. Es urgente.'
        ];

        await database.sequelize.query(`
            INSERT INTO notification_messages (
                id, group_id, sequence_number, sender_type, sender_id, sender_name,
                recipient_type, recipient_id, recipient_name, message_type, subject,
                content, message_hash, created_at, requires_response, is_deleted, company_id, read_at
            ) VALUES
            (gen_random_uuid(), :groupId, 1, 'system', 'system', 'Sistema',
             'all', 'all', 'Todos', 'notification', 'Nueva solicitud',
             :m0, :h0, NOW() - INTERVAL '30 min', false, false, :companyId, NOW() - INTERVAL '30 min'),
            (gen_random_uuid(), :groupId, 2, 'employee', 'EMP-ISI-003', 'Pedro Lopez',
             'department', 'rrhh', 'Recursos Humanos', 'text', null,
             :m1, :h1, NOW() - INTERVAL '25 min', true, false, :companyId, NULL)
        `, {
            replacements: {
                groupId: groupId3,
                companyId,
                m0: msgs3[0], h0: generateHash(msgs3[0]),
                m1: msgs3[1], h1: generateHash(msgs3[1])
            },
            type: QueryTypes.INSERT
        });

        console.log('   Created group with 2 messages (pending response)\n');

        // CASE 4: Shift Swap - Low Priority, Open
        console.log('4. Shift Swap - Ana Martinez');
        const group4 = await database.sequelize.query(`
            INSERT INTO notification_groups (
                id, group_type, initiator_type, initiator_id, subject, status, priority,
                company_id, created_at, metadata
            ) VALUES (
                gen_random_uuid(),
                'shift_swap',
                'employee',
                'EMP-ISI-004',
                'Solicitud de Cambio de Turno',
                'open',
                'low',
                :companyId,
                NOW() - INTERVAL '1 day',
                :metadata
            ) RETURNING id
        `, {
            replacements: {
                companyId,
                metadata: JSON.stringify({
                    participants: ['EMP-ISI-004', 'EMP-ISI-005', 'rrhh'],
                    requester: 'Ana Martinez',
                    target: 'Carlos Ruiz',
                    date: '2025-10-20'
                })
            },
            type: QueryTypes.INSERT
        });

        const groupId4 = group4[0][0].id;

        const msgs4 = [
            'Hola Carlos, podrias cubrirme el turno del sabado 20? Tengo un evento familiar.',
            'Hola Ana, si puedo. No hay problema.',
            'Gracias Carlos! RRHH, pueden aprobar el cambio?'
        ];

        await database.sequelize.query(`
            INSERT INTO notification_messages (
                id, group_id, sequence_number, sender_type, sender_id, sender_name,
                recipient_type, recipient_id, recipient_name, message_type, subject,
                content, message_hash, created_at, requires_response, is_deleted, company_id, read_at
            ) VALUES
            (gen_random_uuid(), :groupId, 1, 'employee', 'EMP-ISI-004', 'Ana Martinez',
             'employee', 'EMP-ISI-005', 'Carlos Ruiz', 'text', null,
             :m0, :h0, NOW() - INTERVAL '1 day', true, false, :companyId, NOW() - INTERVAL '1 day'),
            (gen_random_uuid(), :groupId, 2, 'employee', 'EMP-ISI-005', 'Carlos Ruiz',
             'employee', 'EMP-ISI-004', 'Ana Martinez', 'text', null,
             :m1, :h1, NOW() - INTERVAL '20 hours', false, false, :companyId, NOW() - INTERVAL '20 hours'),
            (gen_random_uuid(), :groupId, 3, 'employee', 'EMP-ISI-004', 'Ana Martinez',
             'department', 'rrhh', 'Recursos Humanos', 'text', null,
             :m2, :h2, NOW() - INTERVAL '19 hours', true, false, :companyId, NULL)
        `, {
            replacements: {
                groupId: groupId4,
                companyId,
                m0: msgs4[0], h0: generateHash(msgs4[0]),
                m1: msgs4[1], h1: generateHash(msgs4[1]),
                m2: msgs4[2], h2: generateHash(msgs4[2])
            },
            type: QueryTypes.INSERT
        });

        console.log('   Created group with 3 messages\n');

        // CASE 5: Training Mandatory - High Priority, Resolved/Closed
        console.log('5. Mandatory Training - All Employees (RESOLVED)');
        const group5 = await database.sequelize.query(`
            INSERT INTO notification_groups (
                id, group_type, initiator_type, initiator_id, subject, status, priority,
                company_id, created_at, closed_at, closed_by, metadata
            ) VALUES (
                gen_random_uuid(),
                'training_mandatory',
                'department',
                'rrhh',
                'Capacitacion Obligatoria - Prevencion de Riesgos',
                'resolved',
                'high',
                :companyId,
                NOW() - INTERVAL '3 days',
                NOW() - INTERVAL '1 day',
                'rrhh',
                :metadata
            ) RETURNING id
        `, {
            replacements: {
                companyId,
                metadata: JSON.stringify({
                    participants: ['all_employees', 'rrhh', adminUserId],
                    training_name: 'Prevencion de Riesgos Laborales',
                    date: '2025-10-15',
                    attendance: 28,
                    total: 30
                })
            },
            type: QueryTypes.INSERT
        });

        const groupId5 = group5[0][0].id;

        const msgs5 = [
            'Capacitacion obligatoria programada',
            'Recordatorio: Capacitacion de Prevencion de Riesgos manana a las 10:00 AM. Asistencia obligatoria.',
            'La capacitacion es presencial o virtual?',
            'Es presencial en el salon de conferencias. Duracion: 2 horas.',
            'Capacitacion completada. Asistieron 28 de 30 empleados.',
            'Capacitacion finalizada con exito. Se enviara certificado a los asistentes.'
        ];

        await database.sequelize.query(`
            INSERT INTO notification_messages (
                id, group_id, sequence_number, sender_type, sender_id, sender_name,
                recipient_type, recipient_id, recipient_name, message_type, subject,
                content, message_hash, created_at, requires_response, is_deleted, company_id, read_at
            ) VALUES
            (gen_random_uuid(), :groupId, 1, 'system', 'system', 'Sistema',
             'all', 'all_employees', 'Todos los empleados', 'notification', 'Capacitacion programada',
             :m0, :h0, NOW() - INTERVAL '3 days', false, false, :companyId, NOW() - INTERVAL '3 days'),
            (gen_random_uuid(), :groupId, 2, 'department', 'rrhh', 'RRHH',
             'all', 'all_employees', 'Todos los empleados', 'text', 'Recordatorio importante',
             :m1, :h1, NOW() - INTERVAL '2 days', false, false, :companyId, NOW() - INTERVAL '2 days'),
            (gen_random_uuid(), :groupId, 3, 'employee', 'EMP-ISI-001', 'Juan Perez',
             'department', 'rrhh', 'Recursos Humanos', 'text', null,
             :m2, :h2, NOW() - INTERVAL '2 days', true, false, :companyId, NOW() - INTERVAL '2 days'),
            (gen_random_uuid(), :groupId, 4, 'department', 'rrhh', 'RRHH',
             'employee', 'EMP-ISI-001', 'Juan Perez', 'text', null,
             :m3, :h3, NOW() - INTERVAL '1 day 23 hours', false, false, :companyId, NOW() - INTERVAL '1 day 23 hours'),
            (gen_random_uuid(), :groupId, 5, 'system', 'system', 'Sistema',
             'all', 'all', 'Todos', 'notification', 'Capacitacion completada',
             :m4, :h4, NOW() - INTERVAL '1 day', false, false, :companyId, NOW() - INTERVAL '1 day'),
            (gen_random_uuid(), :groupId, 6, 'department', 'rrhh', 'RRHH',
             'all', 'all_employees', 'Todos los empleados', 'text', 'Finalizacion',
             :m5, :h5, NOW() - INTERVAL '1 day', false, false, :companyId, NOW() - INTERVAL '1 day')
        `, {
            replacements: {
                groupId: groupId5,
                companyId,
                m0: msgs5[0], h0: generateHash(msgs5[0]),
                m1: msgs5[1], h1: generateHash(msgs5[1]),
                m2: msgs5[2], h2: generateHash(msgs5[2]),
                m3: msgs5[3], h3: generateHash(msgs5[3]),
                m4: msgs5[4], h4: generateHash(msgs5[4]),
                m5: msgs5[5], h5: generateHash(msgs5[5])
            },
            type: QueryTypes.INSERT
        });

        console.log('   Created group with 6 messages\n');

        // Summary
        console.log('SUMMARY OF CREATED DATA:\n');

        const summary = await database.sequelize.query(`
            SELECT
                ng.group_type,
                ng.status,
                ng.priority,
                ng.subject,
                COUNT(nm.id) as message_count,
                COUNT(nm.id) FILTER (WHERE nm.read_at IS NULL) as unread_count,
                ng.created_at
            FROM notification_groups ng
            LEFT JOIN notification_messages nm ON ng.id = nm.group_id
            WHERE ng.company_id = :companyId
            GROUP BY ng.id, ng.group_type, ng.status, ng.priority, ng.subject, ng.created_at
            ORDER BY ng.created_at DESC
            LIMIT 5
        `, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });

        summary.forEach((row, i) => {
            const priorityIcon = { critical: '🔴 CRITICAL', high: '🟠 HIGH', medium: '🟡 MEDIUM', low: '🟢 LOW' }[row.priority] || 'UNKNOWN';
            const statusIcon = { open: '📂 OPEN', pending: '⏳ PENDING', resolved: '✅ RESOLVED' }[row.status] || 'UNKNOWN';
            console.log(`${i + 1}. [${priorityIcon}] ${row.subject}`);
            console.log(`   Status: ${statusIcon} | Messages: ${row.message_count} | Unread: ${row.unread_count} | Type: ${row.group_type}`);
            console.log('');
        });

        console.log('✅ Test data created successfully!\n');
        console.log('You can now:');
        console.log('   1. Reload the panel with Ctrl+F5');
        console.log('   2. Go to Modules -> Notification Inbox');
        console.log('   3. You will see 5 test conversations ready to use');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await database.sequelize.close();
    }
}

createTestNotifications();
