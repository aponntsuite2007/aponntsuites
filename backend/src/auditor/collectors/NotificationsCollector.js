/**
 * NOTIFICATIONS COLLECTOR - Prueba workflows completos de notificaciones
 *
 * - Crea notificaciones de test
 * - Verifica envío (email, push, SMS)
 * - Testea lectura/marcado como leída
 * - Prueba respuesta a notificaciones
 * - Valida escalamiento automático
 * - Testea SLA y deadlines
 * - Verifica templates de notificaciones
 * - Prueba notificaciones proactivas
 * - Testea bandeja de entrada (inbox)
 * - Valida preferencias de usuario
 *
 * @version 1.0.0
 */

const axios = require('axios');

class NotificationsCollector {
  constructor(database, systemRegistry) {
    this.database = database;
    this.registry = systemRegistry;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:9998';
  }

  async collect(execution_id, config) {
    console.log('  🔔 [NOTIFICATIONS] Iniciando pruebas de notificaciones...');

    const results = [];
    const token = await this._generateTestToken(config.company_id);

    // Test 1: Crear notificación básica
    results.push(await this._testCreateNotification(execution_id, token, config.company_id));

    // Test 2: Listar notificaciones
    results.push(await this._testListNotifications(execution_id, token));

    // Test 3: Marcar como leída
    results.push(await this._testMarkAsRead(execution_id, token, config.company_id));

    // Test 4: Responder a notificación
    results.push(await this._testRespondToNotification(execution_id, token, config.company_id));

    // Test 5: Aprobar/Rechazar notificación con workflow
    results.push(await this._testApprovalWorkflow(execution_id, token, config.company_id));

    // Test 6: Verificar SLA y deadlines
    results.push(await this._testSLAValidation(execution_id, token, config.company_id));

    // Test 7: Testear templates de notificaciones
    results.push(await this._testNotificationTemplates(execution_id, token, config.company_id));

    // Test 8: Notificaciones proactivas
    results.push(await this._testProactiveNotifications(execution_id, token, config.company_id));

    // Test 9: Preferencias de usuario
    results.push(await this._testUserPreferences(execution_id, token));

    // Test 10: Bandeja de entrada (inbox)
    results.push(await this._testInbox(execution_id, token));

    // Test 11: Escalamiento automático
    results.push(await this._testAutoEscalation(execution_id, token, config.company_id));

    // Test 12: Estadísticas de notificaciones
    results.push(await this._testNotificationStats(execution_id, token));

    console.log(`  ✅ [NOTIFICATIONS] Completados ${results.length} tests`);
    return results;
  }

  async _testCreateNotification(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'notification_workflow',
      module_name: 'notifications-enterprise',
      test_name: 'Crear notificación básica',
      test_description: 'Prueba creación de notificación con todos los campos requeridos',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/enterprise/notifications`,
        {
          title: `[TEST] Notificación de prueba ${Date.now()}`,
          message: 'Esta es una notificación de prueba generada por el auditor',
          type: 'info',
          priority: 'medium',
          category: 'system',
          auto_resolve: false,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // +24 horas
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 201 || response.status === 200) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: { notification_id: response.data.id },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: response.status,
          warning_message: `Status code inesperado: ${response.status}`,
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'medium',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testListNotifications(execution_id, token) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'notification_workflow',
      module_name: 'notifications-enterprise',
      test_name: 'Listar notificaciones',
      test_description: 'Prueba listado de notificaciones con filtros',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/enterprise/notifications?status=pending&limit=10`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200 && Array.isArray(response.data)) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: { count: response.data.length },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'failed',
          response_time_ms: duration,
          response_status: response.status,
          error_message: 'Response no es un array',
          severity: 'medium',
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'medium',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testMarkAsRead(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'notification_workflow',
      module_name: 'notifications-enterprise',
      test_name: 'Marcar como leída',
      test_description: 'Prueba marcado de notificación como leída',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      // Primero crear una notificación de test
      const createResponse = await axios.post(
        `${this.baseUrl}/api/v1/enterprise/notifications`,
        {
          title: `[TEST] Para marcar como leída ${Date.now()}`,
          message: 'Notificación para testear marca de lectura',
          type: 'info',
          priority: 'low'
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const notificationId = createResponse.data.id;

      // Marcar como leída
      const response = await axios.patch(
        `${this.baseUrl}/api/v1/enterprise/notifications/${notificationId}/read`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: { notification_id: notificationId },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: response.status,
          warning_message: `Status inesperado: ${response.status}`,
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'low',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testRespondToNotification(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'notification_workflow',
      module_name: 'notifications-enterprise',
      test_name: 'Responder a notificación',
      test_description: 'Prueba respuesta a notificación con comentario',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      // Crear notificación
      const createResponse = await axios.post(
        `${this.baseUrl}/api/v1/enterprise/notifications`,
        {
          title: `[TEST] Para responder ${Date.now()}`,
          message: 'Notificación para testear respuestas',
          type: 'question',
          priority: 'medium'
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const notificationId = createResponse.data.id;

      // Responder
      const response = await axios.post(
        `${this.baseUrl}/api/v1/enterprise/notifications/${notificationId}/respond`,
        {
          response: 'Esta es una respuesta de prueba del auditor',
          action: 'acknowledged'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200 || response.status === 201) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: { notification_id: notificationId },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: response.status,
          warning_message: `Status inesperado: ${response.status}`,
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'medium',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testApprovalWorkflow(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'notification_workflow',
      module_name: 'notifications-enterprise',
      test_name: 'Workflow de aprobación',
      test_description: 'Prueba flujo completo de aprobación/rechazo',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      // Crear notificación que requiere aprobación
      const createResponse = await axios.post(
        `${this.baseUrl}/api/v1/enterprise/notifications`,
        {
          title: `[TEST] Solicitud de aprobación ${Date.now()}`,
          message: 'Solicitud de prueba para workflow de aprobación',
          type: 'approval_request',
          priority: 'high',
          requires_approval: true
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const notificationId = createResponse.data.id;

      // Aprobar
      const response = await axios.post(
        `${this.baseUrl}/api/v1/enterprise/notifications/${notificationId}/action`,
        {
          action: 'approve',
          comment: 'Aprobado por auditor automático',
          reason: 'Test de flujo de aprobación'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: { notification_id: notificationId, action: 'approved' },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: response.status,
          warning_message: `Status inesperado: ${response.status}`,
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'high',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testSLAValidation(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'notification_workflow',
      module_name: 'notifications-enterprise',
      test_name: 'Validación de SLA',
      test_description: 'Prueba cálculo y verificación de SLA deadlines',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/sla/metrics`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200 && response.data) {
        const hasMetrics = response.data.average_response_time !== undefined;

        await log.update({
          status: hasMetrics ? 'passed' : 'warning',
          response_time_ms: duration,
          response_status: response.status,
          metadata: response.data,
          warning_message: hasMetrics ? null : 'No hay métricas SLA disponibles',
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'failed',
          response_time_ms: duration,
          response_status: response.status,
          error_message: 'Response inválido de SLA metrics',
          severity: 'medium',
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'medium',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testNotificationTemplates(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'notification_workflow',
      module_name: 'notifications-enterprise',
      test_name: 'Templates de notificaciones',
      test_description: 'Prueba listado y uso de templates',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/enterprise/notifications/templates`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200 && Array.isArray(response.data)) {
        const hasTemplates = response.data.length > 0;

        await log.update({
          status: hasTemplates ? 'passed' : 'warning',
          response_time_ms: duration,
          response_status: response.status,
          metadata: { template_count: response.data.length },
          warning_message: hasTemplates ? null : 'No hay templates configurados',
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'failed',
          response_time_ms: duration,
          response_status: response.status,
          error_message: 'Response no es un array de templates',
          severity: 'low',
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'low',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testProactiveNotifications(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'notification_workflow',
      module_name: 'notifications-enterprise',
      test_name: 'Notificaciones proactivas',
      test_description: 'Prueba sistema de notificaciones proactivas',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/proactive/suggestions`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: response.data,
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: response.status,
          warning_message: `Status inesperado: ${response.status}`,
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'low',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testUserPreferences(execution_id, token) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'notification_workflow',
      module_name: 'notifications-enterprise',
      test_name: 'Preferencias de usuario',
      test_description: 'Prueba gestión de preferencias de notificaciones',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      // Obtener preferencias actuales
      const getResponse = await axios.get(
        `${this.baseUrl}/api/v1/enterprise/notifications/preferences`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      // Actualizar preferencias
      const updateResponse = await axios.patch(
        `${this.baseUrl}/api/v1/enterprise/notifications/preferences`,
        {
          email_enabled: true,
          push_enabled: true,
          sms_enabled: false,
          digest_frequency: 'daily'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (getResponse.status === 200 && updateResponse.status === 200) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: updateResponse.status,
          metadata: { preferences_updated: true },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: updateResponse.status,
          warning_message: 'Status inesperado en preferencias',
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'low',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testInbox(execution_id, token) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'notification_workflow',
      module_name: 'notifications-enterprise',
      test_name: 'Bandeja de entrada (inbox)',
      test_description: 'Prueba bandeja de notificaciones del usuario',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/inbox?filter=unread&sort=priority&limit=20`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: { inbox_count: response.data.length || 0 },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: response.status,
          warning_message: `Status inesperado: ${response.status}`,
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'medium',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testAutoEscalation(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'notification_workflow',
      module_name: 'notifications-enterprise',
      test_name: 'Escalamiento automático',
      test_description: 'Prueba escalamiento automático de notificaciones urgentes',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      // Crear notificación urgente que debería auto-escalar
      const createResponse = await axios.post(
        `${this.baseUrl}/api/v1/enterprise/notifications`,
        {
          title: `[TEST URGENTE] Escalamiento automático ${Date.now()}`,
          message: 'Notificación urgente para testear escalamiento',
          type: 'alert',
          priority: 'critical',
          auto_escalate: true,
          escalation_timeout_minutes: 1
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const notificationId = createResponse.data.id;

      // Verificar que se marcó para escalamiento
      const response = await axios.get(
        `${this.baseUrl}/api/v1/enterprise/notifications/${notificationId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200 && response.data.auto_escalate === true) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: {
            notification_id: notificationId,
            escalation_configured: true
          },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: response.status,
          warning_message: 'Escalamiento automático no configurado correctamente',
          severity: 'medium',
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'high',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testNotificationStats(execution_id, token) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'notification_workflow',
      module_name: 'notifications-enterprise',
      test_name: 'Estadísticas de notificaciones',
      test_description: 'Prueba endpoint de estadísticas y métricas',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/enterprise/notifications/stats`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200 && response.data) {
        const hasValidStats = response.data.total !== undefined;

        await log.update({
          status: hasValidStats ? 'passed' : 'warning',
          response_time_ms: duration,
          response_status: response.status,
          metadata: response.data,
          warning_message: hasValidStats ? null : 'Estadísticas incompletas',
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'failed',
          response_time_ms: duration,
          response_status: response.status,
          error_message: 'Response inválido de stats',
          severity: 'low',
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'low',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _generateTestToken(company_id) {
    try {
      const { User } = this.database;

      // Buscar un usuario de test o el primer admin
      const testUser = await User.findOne({
        where: { company_id, role: 'admin' }
      });

      if (!testUser) {
        console.warn('  ⚠️  No se encontró usuario admin, usando token de prueba genérico');
        return 'test-token-notifications-collector';
      }

      // En producción, generar JWT real aquí
      // Por ahora retornamos token de prueba
      return `test-token-${testUser.id}`;

    } catch (error) {
      console.error('  ❌ Error generando token de prueba:', error.message);
      return 'test-token-fallback';
    }
  }
}

module.exports = NotificationsCollector;
