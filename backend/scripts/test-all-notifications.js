/**
 * Script de Testing Completo - Sistema de Notificaciones
 *
 * Prueba las notificaciones de TODOS los 21 módulos integrados
 * con datos de ejemplo realistas
 */

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

// Importar todas las clases de notificaciones
const VacationNotifications = require('../src/services/integrations/vacation-notifications');
const AttendanceNotifications = require('../src/services/integrations/attendance-notifications');
const PayrollNotifications = require('../src/services/integrations/payroll-notifications');
const StaffNotifications = require('../src/services/integrations/staff-notifications');
const SuppliersNotifications = require('../src/services/integrations/suppliers-notifications');
const TrainingNotifications = require('../src/services/integrations/training-notifications');
const PerformanceNotifications = require('../src/services/integrations/performance-notifications');
const DocumentsNotifications = require('../src/services/integrations/documents-notifications');
const ProceduresNotifications = require('../src/services/integrations/procedures-notifications');
const CommercialNotifications = require('../src/services/integrations/commercial-notifications');
const OnboardingNotifications = require('../src/services/integrations/onboarding-notifications');
const EngineeringNotifications = require('../src/services/integrations/engineering-notifications');
const SecurityNotifications = require('../src/services/integrations/security-notifications');
const PlatformNotifications = require('../src/services/integrations/platform-notifications');
const AlertsNotifications = require('../src/services/integrations/alerts-notifications');

// Estadísticas de testing
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  byModule: {}
};

async function testModule(moduleName, testFunction) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📦 TESTING MÓDULO: ${moduleName.toUpperCase()}`);
  console.log('='.repeat(70));

  stats.byModule[moduleName] = { total: 0, success: 0, failed: 0 };

  try {
    await testFunction();
  } catch (error) {
    console.error(`❌ Error general en módulo ${moduleName}:`, error.message);
  }

  const moduleStats = stats.byModule[moduleName];
  console.log(`\n📊 Resultado ${moduleName}: ${moduleStats.success}/${moduleStats.total} exitosos`);
}

async function testNotification(moduleName, workflowName, notificationFunc, data) {
  stats.total++;
  stats.byModule[moduleName].total++;

  try {
    console.log(`\n  🔔 Testing: ${workflowName}`);
    await notificationFunc(data);

    // Verificar que se creó en la base de datos
    const [notification] = await sequelize.query(`
      SELECT id, title, message, status, channels
      FROM notifications
      WHERE company_id = :companyId
        AND module = :module
      ORDER BY created_at DESC
      LIMIT 1
    `, {
      replacements: {
        companyId: data.companyId,
        module: moduleName
      },
      type: QueryTypes.SELECT
    });

    if (notification) {
      console.log(`    ✅ Notificación creada (ID: ${notification.id})`);
      console.log(`    📧 Canales: ${notification.channels.join(', ')}`);
      console.log(`    📝 Título: ${notification.title}`);
      stats.success++;
      stats.byModule[moduleName].success++;
    } else {
      console.log(`    ⚠️  No se encontró la notificación en BD`);
      stats.failed++;
      stats.byModule[moduleName].failed++;
    }
  } catch (error) {
    console.log(`    ❌ Error: ${error.message}`);
    stats.failed++;
    stats.byModule[moduleName].failed++;
  }
}

async function runTests() {
  console.log('\n🧪 TESTING COMPLETO DEL SISTEMA DE NOTIFICACIONES');
  console.log('='.repeat(70));

  await sequelize.authenticate();

  // Obtener datos reales de la BD para testing
  const [testCompany] = await sequelize.query(`
    SELECT id, name FROM companies WHERE is_active = true LIMIT 1
  `, { type: QueryTypes.SELECT });

  const [testUser] = await sequelize.query(`
    SELECT user_id, "firstName", "lastName", email, company_id
    FROM users
    WHERE company_id = :companyId AND is_active = true
    LIMIT 1
  `, {
    replacements: { companyId: testCompany.id },
    type: QueryTypes.SELECT
  });

  if (!testCompany || !testUser) {
    console.error('❌ No se encontraron datos de prueba en la BD');
    console.error('   Asegúrate de tener al menos 1 empresa y 1 usuario activos');
    process.exit(1);
  }

  console.log(`\n✅ Datos de prueba obtenidos:`);
  console.log(`   Empresa: ${testCompany.name} (ID: ${testCompany.id})`);
  console.log(`   Usuario: ${testUser.firstName} ${testUser.lastName} (${testUser.email})`);

  const baseData = {
    companyId: testCompany.id,
    recipientId: testUser.user_id,
    data: {
      id: 999999,
      originId: '999999',
      employee_name: `${testUser.firstName} ${testUser.lastName}`
    }
  };

  // ============================================================================
  // 1. VACATION MODULE
  // ============================================================================
  await testModule('vacation', async () => {
    await testNotification('vacation', 'vacation_request_created',
      VacationNotifications.notifyRequestCreated,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Solicitud de 10 días de vacaciones desde 01/02/2026 hasta 14/02/2026',
          total_days: 10,
          start_date: '01/02/2026',
          end_date: '14/02/2026',
          request_type: 'vacation'
        }
      }
    );

    await testNotification('vacation', 'vacation_approved',
      VacationNotifications.notifyApproved,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Tu solicitud de vacaciones ha sido APROBADA',
          status: 'APROBADA'
        }
      }
    );

    await testNotification('vacation', 'vacation_rejected',
      VacationNotifications.notifyRejected,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Tu solicitud de vacaciones ha sido RECHAZADA',
          status: 'RECHAZADA'
        }
      }
    );
  });

  // ============================================================================
  // 2. ATTENDANCE MODULE
  // ============================================================================
  await testModule('attendance', async () => {
    await testNotification('attendance', 'attendance_late_arrival',
      AttendanceNotifications.notifyLateArrival,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Llegada tarde detectada: 25 minutos de retraso',
          minutes_late: 25,
          check_in_time: '09:25',
          expected_time: '09:00'
        }
      }
    );

    await testNotification('attendance', 'attendance_absence',
      AttendanceNotifications.notifyAbsence,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Ausencia sin justificar registrada',
          date: new Date().toLocaleDateString('es-AR')
        }
      }
    );
  });

  // ============================================================================
  // 3. PAYROLL MODULE
  // ============================================================================
  await testModule('payroll', async () => {
    await testNotification('payroll', 'payroll_liquidation_generated',
      PayrollNotifications.notifyLiquidationGenerated,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Liquidación de sueldo generada para enero 2026',
          period: 'Enero 2026',
          total_amount: 250000,
          payment_date: '05/02/2026'
        }
      }
    );

    await testNotification('payroll', 'payroll_receipt',
      PayrollNotifications.notifyReceipt,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Tu recibo de sueldo está disponible',
          period: 'Enero 2026'
        }
      }
    );
  });

  // ============================================================================
  // 4. STAFF MODULE
  // ============================================================================
  await testModule('staff', async () => {
    await testNotification('staff', 'staff_training_assigned',
      StaffNotifications.notifyTrainingAssigned,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Nueva capacitación asignada: Seguridad e Higiene',
          training_name: 'Seguridad e Higiene',
          start_date: '10/02/2026'
        }
      }
    );
  });

  // ============================================================================
  // 5. SUPPLIERS MODULE
  // ============================================================================
  await testModule('suppliers', async () => {
    await testNotification('suppliers', 'suppliers_purchase_order',
      SuppliersNotifications.notifyPurchaseOrder,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Nueva orden de compra: OC-2026-001',
          order_number: 'OC-2026-001',
          total_amount: 150000
        }
      }
    );
  });

  // ============================================================================
  // 6. TRAINING MODULE
  // ============================================================================
  await testModule('training', async () => {
    await testNotification('training', 'training_enrollment',
      TrainingNotifications.notifyEnrollment,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Inscripción confirmada en curso: Primeros Auxilios',
          course_name: 'Primeros Auxilios',
          start_date: '15/02/2026'
        }
      }
    );
  });

  // ============================================================================
  // 7. PERFORMANCE MODULE
  // ============================================================================
  await testModule('performance', async () => {
    await testNotification('performance', 'performance_evaluation_created',
      PerformanceNotifications.notifyEvaluationCreated,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Nueva evaluación de desempeño asignada',
          evaluation_period: 'Q1 2026'
        }
      }
    );
  });

  // ============================================================================
  // 8. DOCUMENTS MODULE
  // ============================================================================
  await testModule('documents', async () => {
    await testNotification('documents', 'documents_expiration',
      DocumentsNotifications.notifyExpiration,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Documento próximo a vencer: Certificado médico',
          document_name: 'Certificado médico',
          expiration_date: '28/02/2026'
        }
      }
    );
  });

  // ============================================================================
  // 9. PROCEDURES MODULE
  // ============================================================================
  await testModule('procedures', async () => {
    await testNotification('procedures', 'procedures_approval',
      ProceduresNotifications.notifyApproval,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Nuevo procedimiento requiere tu aprobación',
          procedure_name: 'Protocolo de emergencias'
        }
      }
    );
  });

  // ============================================================================
  // 10. COMMERCIAL MODULE
  // ============================================================================
  await testModule('commercial', async () => {
    await testNotification('commercial', 'commercial_opportunity_created',
      CommercialNotifications.notifyOpportunityCreated,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Nueva oportunidad comercial: Cliente ABC Corp',
          opportunity_name: 'Cliente ABC Corp',
          estimated_value: 500000
        }
      }
    );
  });

  // ============================================================================
  // 11. ONBOARDING MODULE
  // ============================================================================
  await testModule('onboarding', async () => {
    await testNotification('onboarding', 'onboarding_started',
      OnboardingNotifications.notifyStarted,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Proceso de inducción iniciado',
          start_date: '07/01/2026'
        }
      }
    );
  });

  // ============================================================================
  // 12. ENGINEERING MODULE
  // ============================================================================
  await testModule('engineering', async () => {
    await testNotification('engineering', 'engineering_task_assigned',
      EngineeringNotifications.notifyTaskAssigned,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Nueva tarea de ingeniería asignada',
          task_name: 'Implementar autenticación 2FA',
          due_date: '31/01/2026'
        }
      }
    );
  });

  // ============================================================================
  // 13. SECURITY MODULE
  // ============================================================================
  await testModule('security', async () => {
    await testNotification('security', 'security_access_granted',
      SecurityNotifications.notifyAccessGranted,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Acceso concedido a zona restringida',
          zone: 'Sala de servidores'
        }
      }
    );
  });

  // ============================================================================
  // 14. PLATFORM MODULE
  // ============================================================================
  await testModule('platform', async () => {
    await testNotification('platform', 'platform_maintenance_scheduled',
      PlatformNotifications.notifyMaintenanceScheduled,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'Mantenimiento programado para el 15/01/2026',
          scheduled_date: '15/01/2026 02:00',
          duration: '2 horas'
        }
      }
    );
  });

  // ============================================================================
  // 15. ALERTS MODULE
  // ============================================================================
  await testModule('alerts', async () => {
    await testNotification('alerts', 'alerts_critical',
      AlertsNotifications.notifyCritical,
      {
        ...baseData,
        data: {
          ...baseData.data,
          message: 'ALERTA CRÍTICA: Fallo en sistema de respaldo',
          alert_type: 'system_failure'
        }
      }
    );
  });

  // ============================================================================
  // REPORTE FINAL
  // ============================================================================
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 REPORTE FINAL DE TESTING');
  console.log('='.repeat(70));

  console.log(`\n✅ Total de notificaciones probadas: ${stats.total}`);
  console.log(`✅ Exitosas: ${stats.success} (${((stats.success/stats.total)*100).toFixed(1)}%)`);
  console.log(`❌ Fallidas: ${stats.failed} (${((stats.failed/stats.total)*100).toFixed(1)}%)`);

  console.log(`\n📦 Resultados por módulo:`);
  console.log('─'.repeat(70));

  for (const [module, moduleStats] of Object.entries(stats.byModule)) {
    const percentage = moduleStats.total > 0
      ? ((moduleStats.success / moduleStats.total) * 100).toFixed(0)
      : 0;

    const status = percentage === '100' ? '✅' : percentage >= '50' ? '⚠️' : '❌';

    console.log(
      `${status} ${module.padEnd(15)} | ` +
      `${moduleStats.success}/${moduleStats.total} exitosos (${percentage}%)`
    );
  }

  console.log('\n' + '='.repeat(70));

  if (stats.failed === 0) {
    console.log('🎉 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!');
  } else {
    console.log(`⚠️  ${stats.failed} tests fallaron. Revisa los logs arriba.`);
  }

  console.log('='.repeat(70) + '\n');

  process.exit(stats.failed === 0 ? 0 : 1);
}

runTests().catch(err => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});
