/**
 * Seed Legal Test Cases
 * Crea casos de prueba realistas con documentos y diferentes estados de workflow
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

async function seedLegalCases() {
    const client = await pool.connect();

    try {
        console.log('🏛️ Iniciando seed de casos legales de prueba...\n');

        // Obtener company_id y empleados
        const companyRes = await client.query(`SELECT company_id FROM companies WHERE slug = 'isi' OR name = 'ISI' LIMIT 1`);
        const companyId = companyRes.rows[0]?.company_id || 11;

        const employeesRes = await client.query(`
            SELECT user_id, "firstName", "lastName", role
            FROM users WHERE company_id = $1 AND role = 'employee' LIMIT 3
        `, [companyId]);

        const adminRes = await client.query(`
            SELECT user_id FROM users WHERE company_id = $1 AND role = 'admin' LIMIT 1
        `, [companyId]);

        const adminId = adminRes.rows[0]?.user_id;
        const employees = employeesRes.rows;

        if (employees.length === 0) {
            console.log('❌ No hay empleados para crear casos');
            return;
        }

        console.log(`📋 Empresa: ${companyId}, Empleados: ${employees.length}, Admin: ${adminId}\n`);

        // ========== CASO 1: Sanción con workflow completo ==========
        console.log('📁 Creando Caso 1: Sanción por llegadas tardías...');

        const case1 = await client.query(`
            INSERT INTO legal_cases (
                company_id, case_type, employee_id, employee_name, employee_position,
                title, description, current_stage, priority, risk_assessment,
                incident_date, notification_date, created_by, assigned_to
            ) VALUES (
                $1, 'wrongful_termination', $2, $3, 'Operario',
                'Sanción por llegadas tardías reiteradas - López, Carlos',
                'El empleado Carlos López ha acumulado 15 llegadas tardías en los últimos 2 meses. Se procede a aplicar sanción disciplinaria según art. 67 LCT.',
                'prejudicial', 'normal', 'low',
                '2024-11-15', '2024-11-20', $4, $4
            ) RETURNING id, case_number
        `, [companyId, employees[0].user_id, `${employees[0].firstName} ${employees[0].lastName}`, adminId]);

        const case1Id = case1.rows[0].id;
        const case1Number = case1.rows[0].case_number;
        console.log(`   ✅ Caso creado: ${case1Number} (ID: ${case1Id})`);

        // Documentos del caso 1
        await client.query(`
            INSERT INTO legal_case_documents (
                case_id, document_type, file_name, file_path, title, description,
                document_date, source, expects_response, response_type, response_deadline,
                edit_window_hours, uploaded_by
            ) VALUES
            -- Carta documento inicial (espera acuse)
            ($1, 'carta_documento', 'CD-2024-001.pdf', '/uploads/legal/casos/${case1Id}/CD-2024-001.pdf',
             'Carta Documento - Apercibimiento por llegadas tardías',
             'Comunicación formal al empleado notificando las llegadas tardías y solicitando regularización.',
             '2024-11-20', 'internal', true, 'acuse_recibo', '2024-11-27', 72, $2),

            -- Informe de asistencia (sin espera respuesta)
            ($1, 'attendance_report', 'informe-asistencia-lopez.pdf', '/uploads/legal/casos/${case1Id}/informe-asistencia.pdf',
             'Informe de Asistencia - Octubre/Noviembre 2024',
             'Reporte detallado de horarios de ingreso del empleado durante el período.',
             '2024-11-19', 'auto_generated', false, null, null, 24, $2),

            -- Acuse de recibo (respuesta recibida)
            ($1, 'acuse_recibo', 'acuse-CD-2024-001.pdf', '/uploads/legal/casos/${case1Id}/acuse-CD-2024-001.pdf',
             'Acuse de Recibo - Carta Documento recibida',
             'Constancia de recepción firmada por el empleado.',
             '2024-11-22', 'employee', false, null, null, 24, $2)
        `, [case1Id, adminId]);

        // Marcar que el acuse fue recibido
        await client.query(`
            UPDATE legal_case_documents
            SET response_received = true, response_received_at = '2024-11-22 10:30:00'
            WHERE case_id = $1 AND document_type = 'carta_documento'
        `, [case1Id]);

        console.log('   📎 3 documentos agregados (carta documento + acuse recibido)\n');

        // ========== CASO 2: Mediación en curso ==========
        console.log('📁 Creando Caso 2: Reclamo salarial en mediación...');

        const case2 = await client.query(`
            INSERT INTO legal_cases (
                company_id, case_type, employee_id, employee_name, employee_position,
                title, description, current_stage, priority, risk_assessment,
                claimed_amount, currency, incident_date, notification_date, filing_date,
                jurisdiction, plaintiff_lawyer, created_by, assigned_to
            ) VALUES (
                $1, 'labor_claim', $2, $3, 'Administrativo',
                'Reclamo por diferencias salariales - Pérez, Juan',
                'El empleado reclama diferencias salariales por horas extras no abonadas durante 2024. Monto reclamado: $850.000.',
                'mediation', 'high', 'medium',
                850000.00, 'ARS', '2024-08-01', '2024-10-15', '2024-10-20',
                'SECLO CABA', 'Dr. Roberto Martínez', $4, $4
            ) RETURNING id, case_number
        `, [companyId, employees[1]?.user_id || employees[0].user_id,
            employees[1] ? `${employees[1].firstName} ${employees[1].lastName}` : `${employees[0].firstName} ${employees[0].lastName}`,
            adminId]);

        const case2Id = case2.rows[0].id;
        const case2Number = case2.rows[0].case_number;
        console.log(`   ✅ Caso creado: ${case2Number} (ID: ${case2Id})`);

        // Documentos del caso 2
        await client.query(`
            INSERT INTO legal_case_documents (
                case_id, document_type, file_name, file_path, title, description,
                document_date, source, expects_response, response_type, response_deadline,
                uploaded_by
            ) VALUES
            -- Telegrama de reclamo
            ($1, 'telegrama', 'telegrama-reclamo-perez.pdf', '/uploads/legal/casos/${case2Id}/telegrama-reclamo.pdf',
             'Telegrama Laboral - Reclamo horas extras',
             'TCL enviado por el empleado intimando al pago de horas extras adeudadas.',
             '2024-10-15', 'employee', true, 'contestacion_extrajudicial', '2024-10-20', $2),

            -- Contestación de la empresa
            ($1, 'carta_documento', 'contestacion-empresa.pdf', '/uploads/legal/casos/${case2Id}/contestacion-empresa.pdf',
             'Carta Documento - Contestación al reclamo',
             'Respuesta formal de la empresa rechazando el reclamo por improcedente.',
             '2024-10-18', 'internal', true, 'acuse_recibo', '2024-10-25', $2),

            -- Citación a mediación (ESPERA RESPUESTA - SIN RESOLVER)
            ($1, 'citacion_mediacion', 'citacion-seclo.pdf', '/uploads/legal/casos/${case2Id}/citacion-seclo.pdf',
             'Citación SECLO - Audiencia de Mediación',
             'Citación oficial del SECLO para audiencia de mediación obligatoria.',
             '2024-11-01', 'court', true, 'notificacion_judicial', '2024-11-15', $2),

            -- Recibos de sueldo como prueba
            ($1, 'salary_receipt', 'recibos-2024.pdf', '/uploads/legal/casos/${case2Id}/recibos-2024.pdf',
             'Recibos de Sueldo Enero-Octubre 2024',
             'Comprobantes de haberes del período reclamado.',
             '2024-10-19', 'internal', false, null, null, $2)
        `, [case2Id, adminId]);

        console.log('   📎 4 documentos agregados (incluye citación PENDIENTE de acuse)\n');

        // Crear alerta por acuse faltante
        await client.query(`
            INSERT INTO legal_document_alerts (document_id, case_id, company_id, alert_type, message, severity, due_date)
            SELECT id, case_id, $1, 'missing_acuse',
                   'Falta confirmación de notificación para: Citación SECLO - Audiencia de Mediación',
                   'warning', '2024-11-15'
            FROM legal_case_documents
            WHERE case_id = $2 AND document_type = 'citacion_mediacion'
        `, [companyId, case2Id]);

        console.log('   ⚠️ Alerta creada: Acuse pendiente para citación SECLO\n');

        // ========== CASO 3: Juicio en apelación ==========
        console.log('📁 Creando Caso 3: Despido con causa - Etapa judicial/apelación...');

        const case3 = await client.query(`
            INSERT INTO legal_cases (
                company_id, case_type, employee_id, employee_name, employee_position,
                title, description, current_stage, priority, risk_assessment,
                claimed_amount, currency, incident_date, notification_date, filing_date,
                jurisdiction, jurisdiction_code, judge_name,
                plaintiff_lawyer, defendant_lawyer,
                created_by, assigned_to
            ) VALUES (
                $1, 'wrongful_termination', $2, $3, 'Vendedor Senior',
                'Despido con causa - González, María - Expediente 45678/2024',
                'La ex-empleada demanda por despido injustificado. Alega que las causas invocadas son falsas. Sentencia de primera instancia favorable a la empresa. La actora apeló.',
                'appeal', 'critical', 'high',
                2500000.00, 'ARS', '2024-03-15', '2024-03-20', '2024-04-10',
                'Juzgado Nacional del Trabajo N° 45', 'JNT-45',
                'Dra. Susana Fernández',
                'Dr. Alejandro Vega (actora)', 'Estudio Jurídico ABC',
                $4, $4
            ) RETURNING id, case_number
        `, [companyId, employees[2]?.user_id || employees[0].user_id,
            employees[2] ? `${employees[2].firstName} ${employees[2].lastName}` : `${employees[0].firstName} ${employees[0].lastName}`,
            adminId]);

        const case3Id = case3.rows[0].id;
        const case3Number = case3.rows[0].case_number;
        console.log(`   ✅ Caso creado: ${case3Number} (ID: ${case3Id})`);

        // Documentos completos del caso judicial
        await client.query(`
            INSERT INTO legal_case_documents (
                case_id, document_type, file_name, file_path, title, description,
                document_date, source, expects_response, response_type, response_deadline,
                is_locked, locked_at, lock_reason, uploaded_by
            ) VALUES
            -- Carta de despido (bloqueada - documento histórico)
            ($1, 'termination_letter', 'carta-despido-gonzalez.pdf', '/uploads/legal/casos/${case3Id}/carta-despido.pdf',
             'Carta de Despido con Causa',
             'Comunicación de despido con causa por pérdida de confianza.',
             '2024-03-15', 'internal', true, 'contestacion_extrajudicial', '2024-03-22',
             true, '2024-03-25', 'Documento presentado como prueba judicial', $2),

            -- Demanda (bloqueada)
            ($1, 'demanda', 'demanda-gonzalez.pdf', '/uploads/legal/casos/${case3Id}/demanda.pdf',
             'Demanda Laboral - Despido Injustificado',
             'Escrito de demanda presentado por la actora reclamando indemnización completa.',
             '2024-04-10', 'opposing_party', false, null, null,
             true, '2024-04-15', 'Documento judicial oficial', $2),

            -- Contestación de demanda (bloqueada)
            ($1, 'contestacion', 'contestacion-demanda.pdf', '/uploads/legal/casos/${case3Id}/contestacion.pdf',
             'Contestación de Demanda',
             'Escrito de contestación rechazando los hechos alegados por la actora.',
             '2024-05-15', 'internal', false, null, null,
             true, '2024-05-20', 'Documento judicial oficial', $2),

            -- Sentencia de primera instancia (bloqueada)
            ($1, 'sentencia', 'sentencia-1ra-instancia.pdf', '/uploads/legal/casos/${case3Id}/sentencia.pdf',
             'Sentencia de Primera Instancia',
             'Fallo favorable a la demandada. Se rechaza la demanda por acreditarse la justa causa del despido.',
             '2024-09-20', 'court', true, 'apelacion', '2024-10-05',
             true, '2024-09-25', 'Sentencia judicial', $2),

            -- Recurso de apelación (espera resolución de Cámara)
            ($1, 'recurso', 'recurso-apelacion.pdf', '/uploads/legal/casos/${case3Id}/recurso-apelacion.pdf',
             'Recurso de Apelación - Actora',
             'La actora interpone recurso de apelación contra la sentencia de primera instancia.',
             '2024-10-01', 'opposing_party', true, 'resolucion', '2025-03-01',
             false, null, null, $2),

            -- Pruebas testimoniales
            ($1, 'prueba_testimonial', 'actas-testimoniales.pdf', '/uploads/legal/casos/${case3Id}/testimoniales.pdf',
             'Actas de Declaraciones Testimoniales',
             'Transcripciones de las declaraciones de testigos en audiencia.',
             '2024-07-10', 'court', false, null, null,
             true, '2024-07-15', 'Documento judicial oficial', $2),

            -- Expediente completo
            ($1, 'expediente_completo', 'expediente-45678-2024.pdf', '/uploads/legal/casos/${case3Id}/expediente-completo.pdf',
             'Expediente Judicial Completo N° 45678/2024',
             'Copia certificada del expediente judicial completo.',
             '2024-11-01', 'court', false, null, null,
             true, '2024-11-05', 'Expediente judicial certificado', $2)
        `, [case3Id, adminId]);

        console.log('   📎 7 documentos agregados (expediente judicial completo)');
        console.log('   🔒 5 documentos bloqueados (inmutables por ser prueba judicial)\n');

        // Registrar etapas del caso 3
        await client.query(`
            INSERT INTO legal_case_stages (case_id, stage, started_at, ended_at, notes, created_by) VALUES
            ($1, 'prejudicial', '2024-03-15', '2024-03-25', 'Despido comunicado, empleada no acepta', $2),
            ($1, 'mediation', '2024-03-26', '2024-04-08', 'Mediación fracasada en SECLO', $2),
            ($1, 'judicial', '2024-04-10', '2024-09-30', 'Proceso judicial completo, sentencia favorable', $2),
            ($1, 'appeal', '2024-10-01', null, 'Actora apeló la sentencia, pendiente resolución de Cámara', $2)
        `, [case3Id, adminId]);

        console.log('   📊 4 etapas de workflow registradas\n');

        // Timeline de eventos del caso 3
        await client.query(`
            INSERT INTO legal_case_timeline_events (case_id, event_type, title, description, event_date, created_by) VALUES
            ($1, 'stage_change', 'Inicio del caso', 'Se comunica despido con causa a la empleada', '2024-03-15', $2),
            ($1, 'document', 'Carta de despido enviada', 'Notificación fehaciente del despido', '2024-03-15', $2),
            ($1, 'communication', 'Empleada rechaza causales', 'La empleada niega los hechos invocados', '2024-03-18', $2),
            ($1, 'stage_change', 'Inicio mediación SECLO', 'Se convoca a audiencia de mediación', '2024-03-26', $2),
            ($1, 'hearing', 'Audiencia SECLO - Fracaso', 'Las partes no llegan a acuerdo', '2024-04-08', $2),
            ($1, 'stage_change', 'Inicio etapa judicial', 'La actora presenta demanda', '2024-04-10', $2),
            ($1, 'document', 'Contestación de demanda', 'La empresa contesta rechazando pretensiones', '2024-05-15', $2),
            ($1, 'hearing', 'Audiencia de conciliación', 'Sin acuerdo', '2024-06-01', $2),
            ($1, 'hearing', 'Audiencia de prueba testimonial', 'Declararon 4 testigos', '2024-07-10', $2),
            ($1, 'document', 'Alegatos presentados', 'Ambas partes presentan alegatos', '2024-08-15', $2),
            ($1, 'resolution', 'Sentencia favorable', 'Se rechaza la demanda', '2024-09-20', $2),
            ($1, 'stage_change', 'Apelación de actora', 'La actora interpone recurso', '2024-10-01', $2)
        `, [case3Id, adminId]);

        console.log('   📅 12 eventos de timeline registrados\n');

        // Crear alerta por respuesta pendiente (resolución de Cámara)
        await client.query(`
            INSERT INTO legal_document_alerts (document_id, case_id, company_id, alert_type, message, severity, due_date)
            SELECT id, $1, $2, 'response_overdue',
                   'Pendiente resolución de Cámara de Apelaciones',
                   'info', '2025-03-01'
            FROM legal_case_documents
            WHERE case_id = $1 AND document_type = 'recurso'
        `, [case3Id, companyId]);

        // ========== Resumen ==========
        console.log('═══════════════════════════════════════════════════════════');
        console.log('✅ SEED COMPLETADO');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`📁 3 casos legales creados:`);
        console.log(`   1. ${case1Number} - Sanción (etapa: prejudicial)`);
        console.log(`   2. ${case2Number} - Reclamo salarial (etapa: mediación)`);
        console.log(`   3. ${case3Number} - Despido con causa (etapa: apelación)`);
        console.log(`\n📎 14 documentos totales con diferentes estados`);
        console.log(`🔒 6 documentos bloqueados (inmutables)`);
        console.log(`⚠️ 2 alertas de documentos pendientes`);
        console.log(`📅 12 eventos de timeline`);
        console.log(`📊 4 etapas de workflow registradas\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

seedLegalCases();
