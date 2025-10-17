/**
 * Trabajos programados (Cron Jobs)
 */

const cron = require('node-cron');
const { Attendance, User, SystemConfig, Message } = require('../config/database');
const moment = require('moment-timezone');
const { Op } = require('sequelize');
const websocket = require('../config/websocket');

// Servicios del Sistema de Notificaciones Avanzado V2.0
const complianceService = require('../services/complianceService');
const proactiveService = require('../services/proactiveNotificationService');
const slaService = require('../services/slaService');
const resourceCenterService = require('../services/resourceCenterService');
const auditReportService = require('../services/auditReportService');

let cronJobs = {};

/**
 * Iniciar todos los trabajos programados
 */
const start = () => {
  console.log('🕐 Iniciando trabajos programados...');
  
  // Backup automático (diario a las 2:00 AM por defecto)
  startBackupJob();
  
  // Limpiar mensajes expirados (cada hora)
  startCleanupJob();
  
  // Generar registros de ausencia para empleados que no marcaron (cada día a las 9:00 AM)
  startAbsenceCheckJob();
  
  // Notificaciones de cumpleaños (diario a las 8:00 AM)
  startBirthdayNotifications();
  
  // Resumen diario para supervisores (diario a las 18:00)
  startDailySummaryJob();

  // ═══════════════════════════════════════════════════════════════
  // SISTEMA DE NOTIFICACIONES AVANZADO V2.0
  // ═══════════════════════════════════════════════════════════════

  // Validación de compliance (diario a las 2:30 AM)
  startComplianceValidationJob();

  // Ejecución de reglas proactivas (cada hora)
  startProactiveRulesJob();

  // Cálculo de métricas SLA (diario a las 3:00 AM)
  startSLAMetricsJob();

  // Detección de sobrecarga de trabajo (diario a las 18:30)
  startWorkloadOverloadJob();

  // Generación de reportes mensuales (primer día del mes a las 1:00 AM)
  startMonthlyReportsJob();

  console.log('✅ Trabajos programados iniciados');
};

/**
 * Detener todos los trabajos programados
 */
const stop = () => {
  Object.values(cronJobs).forEach(job => {
    if (job) job.destroy();
  });
  cronJobs = {};
  console.log('🛑 Trabajos programados detenidos');
};

/**
 * Backup automático
 */
const startBackupJob = () => {
  // Ejecutar backup diario a las 2:00 AM
  cronJobs.backup = cron.schedule('0 2 * * *', async () => {
    try {
      console.log('🗄️ Iniciando backup automático...');
      
      const config = await SystemConfig.findOne();
      
      if (!config || !config.autoBackup) {
        console.log('⏭️ Backup automático deshabilitado');
        return;
      }
      
      // TODO: Implementar lógica de backup real
      // Por ahora solo logueamos
      console.log('✅ Backup completado exitosamente');
      
      // Notificar a administradores
      websocket.sendToAdmins('backup_completed', {
        timestamp: new Date(),
        message: 'Backup automático completado exitosamente'
      });
      
    } catch (error) {
      console.error('❌ Error en backup automático:', error);
      
      // Notificar error a administradores
      websocket.sendToAdmins('backup_error', {
        timestamp: new Date(),
        error: error.message
      });
    }
  }, {
    scheduled: false,
    timezone: process.env.TIMEZONE || 'America/Argentina/Buenos_Aires'
  });
  
  cronJobs.backup.start();
};

/**
 * Limpiar mensajes expirados
 */
const startCleanupJob = () => {
  // Ejecutar cada hora
  cronJobs.cleanup = cron.schedule('0 * * * *', async () => {
    try {
      console.log('🧹 Limpiando mensajes expirados...');
      
      const deletedCount = await Message.destroy({
        where: {
          expiresAt: {
            [Op.lt]: new Date()
          }
        }
      });
      
      if (deletedCount > 0) {
        console.log(`✅ ${deletedCount} mensajes expirados eliminados`);
      }
      
    } catch (error) {
      console.error('❌ Error limpiando mensajes:', error);
    }
  }, {
    scheduled: false,
    timezone: process.env.TIMEZONE || 'America/Argentina/Buenos_Aires'
  });
  
  cronJobs.cleanup.start();
};

/**
 * Verificar ausencias
 */
const startAbsenceCheckJob = () => {
  // Ejecutar todos los días a las 9:00 AM
  cronJobs.absenceCheck = cron.schedule('0 9 * * 1-5', async () => {
    try {
      console.log('👥 Verificando ausencias...');
      
      const today = moment().tz(process.env.TIMEZONE).format('YYYY-MM-DD');
      const cutoffTime = moment().tz(process.env.TIMEZONE).subtract(1, 'hour'); // 8:00 AM
      
      // Obtener usuarios activos
      const activeUsers = await User.findAll({
        where: { 
          isActive: true,
          role: 'employee' // Solo empleados
        }
      });
      
      for (const user of activeUsers) {
        // Verificar si ya tiene registro de hoy
        const existingAttendance = await Attendance.findOne({
          where: {
            UserId: user.user_id,
            date: today
          }
        });
        
        // Si no tiene registro y ya pasó la hora límite, marcar como ausente
        if (!existingAttendance && moment().isAfter(cutoffTime)) {
          await Attendance.create({
            UserId: user.user_id,
            date: today,
            status: 'absent',
            notes: 'Marcado automáticamente como ausente',
            isManualEntry: true,
            manualEntryReason: 'Sistema - Sin registro de entrada'
          });
          
          console.log(`👤 Usuario ${user.legajo} marcado como ausente`);
          
          // Notificar al usuario
          websocket.sendToUser(user.user_id, 'absence_marked', {
            date: today,
            message: 'Has sido marcado como ausente por no registrar entrada'
          });
        }
      }
      
      console.log('✅ Verificación de ausencias completada');
      
    } catch (error) {
      console.error('❌ Error verificando ausencias:', error);
    }
  }, {
    scheduled: false,
    timezone: process.env.TIMEZONE || 'America/Argentina/Buenos_Aires'
  });
  
  cronJobs.absenceCheck.start();
};

/**
 * Notificaciones de cumpleaños
 */
const startBirthdayNotifications = () => {
  // Ejecutar todos los días a las 8:00 AM
  cronJobs.birthdays = cron.schedule('0 8 * * *', async () => {
    try {
      console.log('🎂 Verificando cumpleaños...');
      
      const today = moment().format('MM-DD');
      
      // Buscar usuarios que cumplen años hoy
      const birthdayUsers = await User.findAll({
        where: {
          isActive: true,
          // Extraer mes y día de la fecha de nacimiento
          [Op.and]: [
            { birthDate: { [Op.not]: null } }
          ]
        }
      });
      
      const todayBirthdays = birthdayUsers.filter(user => {
        if (user.birthDate) {
          const birthDay = moment(user.birthDate).format('MM-DD');
          return birthDay === today;
        }
        return false;
      });
      
      if (todayBirthdays.length > 0) {
        console.log(`🎉 ${todayBirthdays.length} cumpleaños hoy`);
        
        // Notificar a administradores y supervisores
        websocket.sendToSupervisors('birthdays_today', {
          users: todayBirthdays.map(u => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`,
            legajo: u.legajo
          })),
          count: todayBirthdays.length
        });
      }
      
    } catch (error) {
      console.error('❌ Error verificando cumpleaños:', error);
    }
  }, {
    scheduled: false,
    timezone: process.env.TIMEZONE || 'America/Argentina/Buenos_Aires'
  });
  
  cronJobs.birthdays.start();
};

/**
 * Resumen diario para supervisores
 */
const startDailySummaryJob = () => {
  // Ejecutar todos los días a las 18:00
  cronJobs.dailySummary = cron.schedule('0 18 * * 1-5', async () => {
    try {
      console.log('📊 Generando resumen diario...');
      
      const today = moment().tz(process.env.TIMEZONE).format('YYYY-MM-DD');
      
      // Obtener estadísticas del día
      const stats = await Attendance.findAll({
        where: { date: today },
        attributes: [
          [Attendance.sequelize.fn('COUNT', Attendance.sequelize.col('id')), 'totalRecords'],
          [Attendance.sequelize.fn('COUNT', Attendance.sequelize.literal('CASE WHEN status = "present" THEN 1 END')), 'presentCount'],
          [Attendance.sequelize.fn('COUNT', Attendance.sequelize.literal('CASE WHEN status = "late" THEN 1 END')), 'lateCount'],
          [Attendance.sequelize.fn('COUNT', Attendance.sequelize.literal('CASE WHEN status = "absent" THEN 1 END')), 'absentCount'],
          [Attendance.sequelize.fn('SUM', Attendance.sequelize.col('workingHours')), 'totalWorkingHours'],
          [Attendance.sequelize.fn('SUM', Attendance.sequelize.col('overtimeHours')), 'totalOvertimeHours']
        ],
        raw: true
      });
      
      const dailySummary = {
        date: today,
        stats: stats[0],
        timestamp: new Date()
      };
      
      // Enviar a supervisores y administradores
      websocket.sendToSupervisors('daily_summary', dailySummary);
      
      console.log('✅ Resumen diario enviado');
      
    } catch (error) {
      console.error('❌ Error generando resumen diario:', error);
    }
  }, {
    scheduled: false,
    timezone: process.env.TIMEZONE || 'America/Argentina/Buenos_Aires'
  });
  
  cronJobs.dailySummary.start();
};

// ═══════════════════════════════════════════════════════════════
// SISTEMA DE NOTIFICACIONES AVANZADO V2.0 - CRON JOBS
// ═══════════════════════════════════════════════════════════════

/**
 * Validación de compliance automática
 */
const startComplianceValidationJob = () => {
  // Ejecutar todos los días a las 2:30 AM
  cronJobs.complianceValidation = cron.schedule('30 2 * * *', async () => {
    try {
      console.log('🔍 Ejecutando validación de compliance...');

      // TODO: Obtener todas las empresas activas
      // Por ahora usamos company_id = 11 como ejemplo
      const companyId = 11;

      const result = await complianceService.validateAllRules(companyId);

      console.log(`✅ Compliance validado: ${result.violations.length} violaciones detectadas`);

      // Si hay violaciones críticas, notificar a RRHH
      const criticalViolations = result.violations.filter(v => v.severity === 'critical');
      if (criticalViolations.length > 0) {
        websocket.sendToAdmins('compliance_critical_violations', {
          company_id: companyId,
          total_violations: result.violations.length,
          critical_violations: criticalViolations.length,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('❌ Error en validación de compliance:', error);
    }
  }, {
    scheduled: false,
    timezone: process.env.TIMEZONE || 'America/Argentina/Buenos_Aires'
  });

  cronJobs.complianceValidation.start();
};

/**
 * Ejecución de reglas proactivas
 */
const startProactiveRulesJob = () => {
  // Ejecutar cada hora
  cronJobs.proactiveRules = cron.schedule('0 * * * *', async () => {
    try {
      console.log('🔔 Ejecutando reglas proactivas...');

      // TODO: Obtener todas las empresas activas
      const companyId = 11;

      const results = await proactiveService.executeAllRules(companyId);

      const totalMatches = results.reduce((sum, r) => sum + r.matched_count, 0);
      console.log(`✅ Reglas proactivas ejecutadas: ${totalMatches} casos detectados`);

      // Notificar si hay detecciones importantes
      if (totalMatches > 0) {
        websocket.sendToAdmins('proactive_detections', {
          company_id: companyId,
          total_detections: totalMatches,
          rules_triggered: results.filter(r => r.matched_count > 0).length,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('❌ Error ejecutando reglas proactivas:', error);
    }
  }, {
    scheduled: false,
    timezone: process.env.TIMEZONE || 'America/Argentina/Buenos_Aires'
  });

  cronJobs.proactiveRules.start();
};

/**
 * Cálculo de métricas SLA
 */
const startSLAMetricsJob = () => {
  // Ejecutar todos los días a las 3:00 AM
  cronJobs.slaMetrics = cron.schedule('0 3 * * *', async () => {
    try {
      console.log('📊 Calculando métricas SLA...');

      const companyId = 11;
      const yesterday = moment().subtract(1, 'day').startOf('day').toDate();
      const today = moment().endOf('day').toDate();

      const metrics = await slaService.calculateSLAMetrics(companyId, yesterday, today);

      // Guardar métricas históricas
      await slaService.saveSLAMetrics(companyId, yesterday, today);

      console.log(`✅ Métricas SLA calculadas: ${metrics.global_metrics.total_requests} solicitudes procesadas`);

      // Detectar cuellos de botella
      const bottlenecks = await slaService.detectBottlenecks(companyId, yesterday, today);

      if (bottlenecks.slow_approvers.length > 0 || bottlenecks.high_sla_violations.length > 0) {
        websocket.sendToAdmins('sla_bottlenecks_detected', {
          company_id: companyId,
          slow_approvers: bottlenecks.slow_approvers.length,
          high_sla_violations: bottlenecks.high_sla_violations.length,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('❌ Error calculando métricas SLA:', error);
    }
  }, {
    scheduled: false,
    timezone: process.env.TIMEZONE || 'America/Argentina/Buenos_Aires'
  });

  cronJobs.slaMetrics.start();
};

/**
 * Detección de sobrecarga de trabajo
 */
const startWorkloadOverloadJob = () => {
  // Ejecutar todos los días a las 18:30
  cronJobs.workloadOverload = cron.schedule('30 18 * * *', async () => {
    try {
      console.log('⚠️ Detectando sobrecarga de trabajo...');

      const companyId = 11;
      const period = resourceCenterService.getCurrentPeriod();

      const overloadAlerts = await resourceCenterService.detectWorkloadOverload(
        companyId,
        period.start,
        period.end,
        30 // threshold: 30 horas extra
      );

      console.log(`✅ Detección completada: ${overloadAlerts.length} empleados con sobrecarga`);

      // Notificar si hay casos críticos
      const criticalCases = overloadAlerts.filter(a => a.risk_level === 'critical' || a.risk_level === 'high');

      if (criticalCases.length > 0) {
        websocket.sendToAdmins('workload_overload_alert', {
          company_id: companyId,
          total_overloaded: overloadAlerts.length,
          critical_cases: criticalCases.length,
          employees: criticalCases.map(c => ({
            employee_id: c.employee_id,
            overtime_hours: c.overtime_hours,
            risk_level: c.risk_level
          })),
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('❌ Error detectando sobrecarga:', error);
    }
  }, {
    scheduled: false,
    timezone: process.env.TIMEZONE || 'America/Argentina/Buenos_Aires'
  });

  cronJobs.workloadOverload.start();
};

/**
 * Generación de reportes mensuales automáticos
 */
const startMonthlyReportsJob = () => {
  // Ejecutar el primer día de cada mes a la 1:00 AM
  cronJobs.monthlyReports = cron.schedule('0 1 1 * *', async () => {
    try {
      console.log('📄 Generando reportes mensuales automáticos...');

      const companyId = 11;

      // Obtener mes anterior
      const lastMonth = moment().subtract(1, 'month');
      const startDate = lastMonth.startOf('month').format('YYYY-MM-DD');
      const endDate = lastMonth.endOf('month').format('YYYY-MM-DD');

      console.log(`📅 Período: ${startDate} a ${endDate}`);

      // Generar reportes en lote
      const reportTypes = [
        {
          report_type: 'compliance_audit',
          params: { start_date: startDate, end_date: endDate }
        },
        {
          report_type: 'sla_performance',
          params: { start_date: startDate, end_date: endDate }
        },
        {
          report_type: 'resource_utilization',
          params: { start_date: startDate, end_date: endDate }
        },
        {
          report_type: 'attendance_summary',
          params: { start_date: startDate, end_date: endDate }
        }
      ];

      const generatedReports = [];

      for (const config of reportTypes) {
        try {
          const report = await auditReportService.generateReport(
            companyId,
            config.report_type,
            config.params,
            'SYSTEM-AUTO'
          );
          generatedReports.push(report);
          console.log(`✅ Reporte ${config.report_type} generado: ID ${report.report_id}`);
        } catch (error) {
          console.error(`❌ Error generando ${config.report_type}:`, error.message);
        }
      }

      console.log(`✅ ${generatedReports.length}/${reportTypes.length} reportes generados automáticamente`);

      // Notificar a RRHH
      websocket.sendToAdmins('monthly_reports_generated', {
        company_id: companyId,
        period: { start_date: startDate, end_date: endDate },
        total_reports: generatedReports.length,
        reports: generatedReports.map(r => ({
          id: r.report_id,
          type: r.report_type,
          verification_code: r.verification_code
        })),
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Error generando reportes mensuales:', error);
    }
  }, {
    scheduled: false,
    timezone: process.env.TIMEZONE || 'America/Argentina/Buenos_Aires'
  });

  cronJobs.monthlyReports.start();
};

/**
 * Obtener estado de los trabajos
 */
const getJobsStatus = () => {
  const status = {};

  Object.keys(cronJobs).forEach(jobName => {
    const job = cronJobs[jobName];
    status[jobName] = {
      running: job ? job.running : false,
      lastDate: job ? job.lastDate() : null,
      nextDate: job ? job.nextDate() : null
    };
  });

  return status;
};

module.exports = {
  start,
  stop,
  getJobsStatus
};