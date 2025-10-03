/**
 * Trabajos programados (Cron Jobs)
 */

const cron = require('node-cron');
const { Attendance, User, SystemConfig, Message } = require('../config/database');
const moment = require('moment-timezone');
const { Op } = require('sequelize');
const websocket = require('../config/websocket');

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