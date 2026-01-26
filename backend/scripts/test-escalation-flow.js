/**
 * TEST FLUJO DE ESCALAMIENTO REAL
 * Simula: Tardanza → Solicitud → Timeout → Escalación → Aprobación
 */
const { Sequelize } = require('sequelize');
const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', { logging: false });

const COMPANY_ID = 11;

async function testEscalationFlow() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         TEST FLUJO DE ESCALAMIENTO DE TARDANZAS                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // 1. Obtener estructura organizacional
  console.log('═══ PASO 1: VERIFICAR ESTRUCTURA ORGANIZACIONAL ═══');
  const [positions] = await seq.query(`
    SELECT op.id, op.position_name, op.level_order, op.parent_position_id,
           parent.position_name as parent_name
    FROM organizational_positions op
    LEFT JOIN organizational_positions parent ON parent.id = op.parent_position_id
    WHERE op.company_id = ${COMPANY_ID}
    ORDER BY op.level_order, op.position_name
  `);

  console.log('   Jerarquía configurada:');
  positions.forEach(p => {
    const indent = '   '.repeat(p.level_order + 1);
    console.log(`${indent}${p.position_name} → reporta a: ${p.parent_name || 'NADIE (top)'}`);
  });

  // 2. Obtener aprobadores por nivel
  console.log('\n═══ PASO 2: APROBADORES POR NIVEL ═══');
  const [approvers] = await seq.query(`
    SELECT op.level_order, op.position_name, COUNT(u.user_id) as usuarios,
           STRING_AGG(u."firstName" || ' ' || u."lastName", ', ' ORDER BY u."firstName") as nombres
    FROM users u
    JOIN organizational_positions op ON op.id = u.organizational_position_id
    WHERE u.company_id = ${COMPANY_ID} AND u.can_authorize_late_arrivals = true
    GROUP BY op.level_order, op.position_name
    ORDER BY op.level_order
  `);

  approvers.forEach(a => {
    console.log(`   Nivel ${a.level_order} - ${a.position_name}: ${a.usuarios} aprobadores`);
  });

  // 3. Seleccionar un empleado operativo (nivel 4) para simular tardanza
  console.log('\n═══ PASO 3: SELECCIONAR EMPLEADO PARA SIMULACIÓN ═══');
  const [[employee]] = await seq.query(`
    SELECT u.user_id, u."firstName", u."lastName", u.email,
           op.position_name, op.level_order, op.parent_position_id
    FROM users u
    JOIN organizational_positions op ON op.id = u.organizational_position_id
    WHERE u.company_id = ${COMPANY_ID} AND op.level_order = 4
    LIMIT 1
  `);

  if (!employee) {
    console.log('   ❌ No hay empleados en nivel 4 para simular');
    return;
  }

  console.log(`   👤 Empleado: ${employee.firstName} ${employee.lastName}`);
  console.log(`   📍 Posición: ${employee.position_name} (nivel ${employee.level_order})`);

  // 4. Encontrar su supervisor directo (nivel 3)
  console.log('\n═══ PASO 4: IDENTIFICAR CADENA DE APROBACIÓN ═══');

  // Buscar supervisor directo por posición
  const [[supervisor]] = await seq.query(`
    SELECT u.user_id, u."firstName", u."lastName", u.email,
           op.position_name, op.level_order
    FROM users u
    JOIN organizational_positions op ON op.id = u.organizational_position_id
    WHERE op.id = ${employee.parent_position_id}
      AND u.can_authorize_late_arrivals = true
    LIMIT 1
  `);

  if (supervisor) {
    console.log(`   Nivel 3 (Supervisor): ${supervisor.firstName} ${supervisor.lastName} - ${supervisor.position_name}`);
  }

  // Buscar jefe (nivel 2)
  const [[manager]] = await seq.query(`
    SELECT u.user_id, u."firstName", u."lastName", op.position_name
    FROM users u
    JOIN organizational_positions op ON op.id = u.organizational_position_id
    WHERE op.level_order = 2 AND u.company_id = ${COMPANY_ID}
      AND u.can_authorize_late_arrivals = true
    LIMIT 1
  `);

  if (manager) {
    console.log(`   Nivel 2 (Jefe): ${manager.firstName} ${manager.lastName} - ${manager.position_name}`);
  }

  // Buscar gerente (nivel 1)
  const [[director]] = await seq.query(`
    SELECT u.user_id, u."firstName", u."lastName", op.position_name
    FROM users u
    JOIN organizational_positions op ON op.id = u.organizational_position_id
    WHERE op.level_order = 1 AND u.company_id = ${COMPANY_ID}
      AND u.can_authorize_late_arrivals = true
    LIMIT 1
  `);

  if (director) {
    console.log(`   Nivel 1 (Gerente): ${director.firstName} ${director.lastName} - ${director.position_name}`);
  }

  // 5. Crear solicitud de tardanza
  console.log('\n═══ PASO 5: CREAR SOLICITUD DE TARDANZA ═══');

  const lateAuthId = require('crypto').randomUUID();
  const now = new Date();
  const scheduledTime = '08:00:00';
  const actualTime = '08:35:00';
  const minutesLate = 35;

  await seq.query(`
    INSERT INTO late_arrival_authorizations (
      id, employee_id, company_id, request_date, scheduled_time, actual_arrival_time,
      minutes_late, reason, status, escalation_level,
      requested_authorizer_id, authorization_window_start, authorization_window_end,
      created_at, updated_at
    ) VALUES (
      :id, :employeeId, ${COMPANY_ID}, CURRENT_DATE, :scheduled, :actual,
      :minutes, :reason, 'pending', 0,
      :supervisorId, NOW(), NOW() + INTERVAL '2 hours',
      NOW(), NOW()
    )
  `, {
    replacements: {
      id: lateAuthId,
      employeeId: employee.user_id,
      scheduled: scheduledTime,
      actual: actualTime,
      minutes: minutesLate,
      reason: 'Tráfico intenso por accidente en autopista',
      supervisorId: supervisor?.user_id || null
    }
  });

  console.log(`   ✅ Solicitud creada: ${lateAuthId.substring(0, 8)}...`);
  console.log(`   📅 Fecha: ${now.toISOString().split('T')[0]}`);
  console.log(`   ⏰ Llegada: ${actualTime} (${minutesLate} min tarde)`);
  console.log(`   📤 Enviada a: ${supervisor?.firstName || 'Sin supervisor'} (nivel 3)`);

  // 6. Simular timeout y escalación a nivel 2
  console.log('\n═══ PASO 6: SIMULAR TIMEOUT Y ESCALACIÓN ═══');

  await seq.query(`
    UPDATE late_arrival_authorizations
    SET escalation_level = 1,
        escalated_at = NOW(),
        status = 'escalated',
        decision_reason = 'Timeout: supervisor no respondió en tiempo'
    WHERE id = :id
  `, { replacements: { id: lateAuthId } });

  console.log(`   ⏱️  Timeout expirado (supervisor no respondió)`);
  console.log(`   📤 Escalado a nivel 2: ${manager?.firstName || 'Jefe'}`);

  // 7. Simular aprobación por jefe
  console.log('\n═══ PASO 7: SIMULAR APROBACIÓN POR JEFE ═══');

  await seq.query(`
    UPDATE late_arrival_authorizations
    SET status = 'approved',
        actual_authorizer_id = :approverId,
        authorizer_position = :position,
        decision_timestamp = NOW(),
        decision_reason = 'Aprobado - justificación válida (accidente de tránsito)',
        completed_at = NOW()
    WHERE id = :id
  `, {
    replacements: {
      id: lateAuthId,
      approverId: manager?.user_id || director?.user_id,
      position: manager?.position_name || 'Gerente'
    }
  });

  console.log(`   ✅ APROBADO por: ${manager?.firstName || director?.firstName}`);
  console.log(`   💬 Motivo: Justificación válida (accidente de tránsito)`);

  // 8. Generar notificaciones del flujo
  console.log('\n═══ PASO 8: GENERAR NOTIFICACIONES DEL FLUJO ═══');

  const notifications = [
    {
      type: 'late_arrival_request',
      recipient: supervisor?.user_id,
      title: 'Nueva solicitud de autorización de tardanza',
      message: `${employee.firstName} ${employee.lastName} solicita autorización por ${minutesLate} minutos de tardanza`
    },
    {
      type: 'late_arrival_escalated',
      recipient: manager?.user_id,
      title: 'Solicitud de tardanza escalada',
      message: `La solicitud de ${employee.firstName} fue escalada por timeout del supervisor`
    },
    {
      type: 'late_arrival_approved',
      recipient: employee.user_id,
      title: 'Tardanza autorizada',
      message: `Tu solicitud de tardanza fue aprobada por ${manager?.firstName || 'tu jefe'}`
    }
  ];

  for (const notif of notifications) {
    if (!notif.recipient) continue;

    await seq.query(`
      INSERT INTO notifications (
        uuid, company_id, module, category, notification_type, priority,
        recipient_user_id, title, message, is_read, created_at
      ) VALUES (
        gen_random_uuid(), ${COMPANY_ID}, 'attendance', 'authorization', :type, 'medium',
        :recipient, :title, :message, false, NOW()
      )
    `, { replacements: notif });
  }

  console.log(`   ✅ ${notifications.filter(n => n.recipient).length} notificaciones generadas`);

  // 9. Verificar estado final
  console.log('\n═══ PASO 9: VERIFICAR ESTADO FINAL ═══');

  const [[finalState]] = await seq.query(`
    SELECT la.status, la.escalation_level, la.decision_reason,
           emp."firstName" || ' ' || emp."lastName" as empleado,
           auth."firstName" || ' ' || auth."lastName" as aprobador
    FROM late_arrival_authorizations la
    JOIN users emp ON emp.user_id = la.employee_id
    LEFT JOIN users auth ON auth.user_id = la.actual_authorizer_id
    WHERE la.id = :id
  `, { replacements: { id: lateAuthId } });

  console.log(`   Estado: ${finalState.status.toUpperCase()}`);
  console.log(`   Nivel escalación: ${finalState.escalation_level}`);
  console.log(`   Empleado: ${finalState.empleado}`);
  console.log(`   Aprobado por: ${finalState.aprobador}`);
  console.log(`   Motivo: ${finalState.decision_reason}`);

  // 10. Estadísticas finales
  console.log('\n═══ RESUMEN ESTADÍSTICAS ═══');

  const [[stats]] = await seq.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as aprobadas,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendientes,
      SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) as escaladas,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rechazadas,
      SUM(CASE WHEN escalation_level > 0 THEN 1 ELSE 0 END) as con_escalacion
    FROM late_arrival_authorizations WHERE company_id = ${COMPANY_ID}
  `);

  console.log(`   Total solicitudes: ${stats.total}`);
  console.log(`   ✅ Aprobadas: ${stats.aprobadas}`);
  console.log(`   ⏳ Pendientes: ${stats.pendientes}`);
  console.log(`   📤 Escaladas: ${stats.escaladas}`);
  console.log(`   ❌ Rechazadas: ${stats.rechazadas}`);
  console.log(`   📊 Con escalación: ${stats.con_escalacion}`);

  const [[notifStats]] = await seq.query(`
    SELECT COUNT(*) as total FROM notifications
    WHERE company_id = ${COMPANY_ID} AND module = 'attendance'
  `);
  console.log(`   🔔 Notificaciones attendance: ${notifStats.total}`);

  console.log('\n✅ FLUJO DE ESCALAMIENTO COMPLETADO EXITOSAMENTE');

  await seq.close();
}

testEscalationFlow().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
