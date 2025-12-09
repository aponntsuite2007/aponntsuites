'use strict';

const { Op, fn, col, literal } = require('sequelize');

/**
 * DocumentAuditService - Servicio de auditoría y trazabilidad DMS
 *
 * Maneja logs inmutables, reportes de auditoría y cumplimiento GDPR
 */
class DocumentAuditService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Registrar acción de auditoría
   */
  async logAction(data, transaction = null) {
    const {
      document_id,
      company_id,
      user_id,
      action,
      version_number = null,
      details = {},
      ip_address = null,
      user_agent = null
    } = data;

    return this.models.DocumentAccessLog.create({
      document_id,
      company_id,
      user_id,
      action,
      version_number,
      action_details: details,
      ip_address,
      user_agent
    }, { transaction });
  }

  /**
   * Obtener historial de auditoría de un documento
   */
  async getDocumentAuditLog(documentId, companyId, options = {}) {
    const {
      page = 1,
      limit = 50,
      action_filter = null,
      date_from = null,
      date_to = null
    } = options;

    const where = {
      document_id: documentId,
      company_id: companyId
    };

    if (action_filter) {
      where.action = Array.isArray(action_filter) ? { [Op.in]: action_filter } : action_filter;
    }

    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = new Date(date_from);
      if (date_to) where.created_at[Op.lte] = new Date(date_to);
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await this.models.DocumentAccessLog.findAndCountAll({
      where,
      include: [{
        model: this.models.User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      logs: rows,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Obtener historial de auditoría de un usuario
   */
  async getUserAuditLog(userId, companyId, options = {}) {
    const {
      page = 1,
      limit = 50,
      action_filter = null,
      date_from = null,
      date_to = null
    } = options;

    const where = {
      user_id: userId,
      company_id: companyId
    };

    if (action_filter) {
      where.action = Array.isArray(action_filter) ? { [Op.in]: action_filter } : action_filter;
    }

    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = new Date(date_from);
      if (date_to) where.created_at[Op.lte] = new Date(date_to);
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await this.models.DocumentAccessLog.findAndCountAll({
      where,
      include: [{
        model: this.models.Document,
        as: 'document',
        attributes: ['id', 'title', 'document_number', 'status']
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      logs: rows,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Obtener reporte de actividad de empresa
   */
  async getCompanyActivityReport(companyId, options = {}) {
    const {
      date_from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 días
      date_to = new Date(),
      group_by = 'day' // day, week, month
    } = options;

    // Formato de agrupación
    const dateFormat = group_by === 'day' ? 'YYYY-MM-DD' :
                       group_by === 'week' ? 'IYYY-IW' :
                       'YYYY-MM';

    // Actividad por período
    const activityByPeriod = await this.models.DocumentAccessLog.findAll({
      where: {
        company_id: companyId,
        created_at: { [Op.between]: [date_from, date_to] }
      },
      attributes: [
        [fn('to_char', col('created_at'), dateFormat), 'period'],
        [fn('COUNT', col('id')), 'total_actions']
      ],
      group: [fn('to_char', col('created_at'), dateFormat)],
      order: [[fn('to_char', col('created_at'), dateFormat), 'ASC']]
    });

    // Actividad por tipo de acción
    const activityByAction = await this.models.DocumentAccessLog.findAll({
      where: {
        company_id: companyId,
        created_at: { [Op.between]: [date_from, date_to] }
      },
      attributes: [
        'action',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['action'],
      order: [[fn('COUNT', col('id')), 'DESC']]
    });

    // Usuarios más activos
    const topUsers = await this.models.DocumentAccessLog.findAll({
      where: {
        company_id: companyId,
        created_at: { [Op.between]: [date_from, date_to] }
      },
      attributes: [
        'user_id',
        [fn('COUNT', col('id')), 'action_count']
      ],
      include: [{
        model: this.models.User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name']
      }],
      group: ['user_id', 'user.id', 'user.first_name', 'user.last_name'],
      order: [[fn('COUNT', col('DocumentAccessLog.id')), 'DESC']],
      limit: 10
    });

    // Documentos más accedidos
    const topDocuments = await this.models.DocumentAccessLog.findAll({
      where: {
        company_id: companyId,
        document_id: { [Op.ne]: null },
        action: { [Op.in]: ['view', 'download'] },
        created_at: { [Op.between]: [date_from, date_to] }
      },
      attributes: [
        'document_id',
        [fn('COUNT', col('id')), 'access_count']
      ],
      include: [{
        model: this.models.Document,
        as: 'document',
        attributes: ['id', 'title', 'document_number']
      }],
      group: ['document_id', 'document.id', 'document.title', 'document.document_number'],
      order: [[fn('COUNT', col('DocumentAccessLog.id')), 'DESC']],
      limit: 10
    });

    return {
      period: { from: date_from, to: date_to },
      activity_by_period: activityByPeriod,
      activity_by_action: activityByAction,
      top_users: topUsers,
      top_documents: topDocuments
    };
  }

  /**
   * Generar reporte de cumplimiento GDPR
   */
  async generateGDPRComplianceReport(companyId, userId = null) {
    const where = { company_id: companyId };
    if (userId) where.owner_id = userId;

    // Documentos del usuario/empresa
    const documents = await this.models.Document.findAll({
      where: {
        ...where,
        is_deleted: false
      },
      attributes: [
        'id', 'title', 'document_number', 'document_type_id',
        'created_at', 'updated_at', 'expiration_date', 'status'
      ]
    });

    // Accesos del usuario a sus documentos
    const accessLogs = userId ? await this.models.DocumentAccessLog.findAll({
      where: {
        user_id: userId,
        company_id: companyId
      },
      order: [['created_at', 'DESC']],
      limit: 100
    }) : [];

    // Permisos otorgados
    const permissions = userId ? await this.models.DocumentPermission.findAll({
      where: {
        grantee_id: userId,
        is_active: true
      },
      include: [{
        model: this.models.Document,
        as: 'document',
        attributes: ['id', 'title', 'document_number']
      }]
    }) : [];

    // Solicitudes de documentos
    const requests = userId ? await this.models.DocumentRequest.findAll({
      where: {
        [Op.or]: [
          { requested_from_id: userId },
          { requested_by: userId }
        ],
        company_id: companyId
      }
    }) : [];

    return {
      generated_at: new Date(),
      company_id: companyId,
      user_id: userId,
      gdpr_summary: {
        total_documents: documents.length,
        documents_by_status: this.groupBy(documents, 'status'),
        total_access_logs: accessLogs.length,
        active_permissions: permissions.length,
        pending_requests: requests.filter(r => r.status === 'pending').length
      },
      documents,
      recent_access_logs: accessLogs,
      permissions,
      requests
    };
  }

  /**
   * Exportar datos de usuario (GDPR - Derecho de portabilidad)
   */
  async exportUserData(userId, companyId, format = 'json') {
    // Obtener todos los documentos del usuario
    const documents = await this.models.Document.findAll({
      where: {
        company_id: companyId,
        [Op.or]: [
          { owner_id: userId },
          { created_by: userId }
        ]
      },
      include: [
        { model: this.models.DocumentMetadata, as: 'metadata' },
        { model: this.models.DocumentVersion, as: 'versions' }
      ]
    });

    // Historial de acceso
    const accessLogs = await this.models.DocumentAccessLog.findAll({
      where: {
        user_id: userId,
        company_id: companyId
      },
      order: [['created_at', 'DESC']]
    });

    // Permisos
    const permissions = await this.models.DocumentPermission.findAll({
      where: {
        [Op.or]: [
          { grantee_id: userId },
          { granted_by: userId }
        ]
      }
    });

    // Alertas
    const alerts = await this.models.DocumentAlert.findAll({
      where: {
        user_id: userId,
        company_id: companyId
      }
    });

    // Solicitudes
    const requests = await this.models.DocumentRequest.findAll({
      where: {
        [Op.or]: [
          { requested_from_id: userId },
          { requested_by: userId }
        ],
        company_id: companyId
      }
    });

    const exportData = {
      export_date: new Date().toISOString(),
      user_id: userId,
      company_id: companyId,
      documents: documents.map(d => ({
        id: d.id,
        title: d.title,
        document_number: d.document_number,
        status: d.status,
        created_at: d.created_at,
        metadata: d.metadata,
        versions: d.versions?.length || 0
      })),
      access_history: accessLogs.map(l => ({
        action: l.action,
        document_id: l.document_id,
        timestamp: l.created_at,
        details: l.action_details
      })),
      permissions: permissions.map(p => ({
        document_id: p.document_id,
        permission_level: p.permission_level,
        granted_at: p.granted_at,
        valid_until: p.valid_until
      })),
      alerts: alerts.map(a => ({
        type: a.alert_type,
        title: a.title,
        created_at: a.created_at,
        read: a.is_read
      })),
      requests: requests.map(r => ({
        type: r.type_code,
        status: r.status,
        created_at: r.created_at,
        due_date: r.due_date
      }))
    };

    // Registrar exportación
    await this.logAction({
      document_id: null,
      company_id: companyId,
      user_id: userId,
      action: 'gdpr_export',
      details: {
        documents_count: documents.length,
        format
      }
    });

    if (format === 'json') {
      return exportData;
    }

    // TODO: Implementar exportación CSV/XML si se necesita
    return exportData;
  }

  /**
   * Registrar solicitud de eliminación (GDPR - Derecho al olvido)
   */
  async requestDataDeletion(userId, companyId, reason) {
    // Registrar solicitud
    await this.logAction({
      document_id: null,
      company_id: companyId,
      user_id: userId,
      action: 'gdpr_deletion_request',
      details: { reason }
    });

    // Crear alerta para admin
    const admins = await this.models.User.findAll({
      where: {
        company_id: companyId,
        role: 'admin',
        is_active: true
      }
    });

    for (const admin of admins) {
      await this.models.DocumentAlert.create({
        company_id: companyId,
        user_id: admin.id,
        alert_type: 'gdpr_request',
        severity: 'warning',
        title: 'Solicitud de eliminación de datos (GDPR)',
        message: `El usuario ${userId} ha solicitado la eliminación de sus datos. Razón: ${reason}`
      });
    }

    return {
      success: true,
      message: 'Solicitud registrada. Un administrador revisará su caso.',
      request_date: new Date()
    };
  }

  /**
   * Obtener documentos por expirar
   */
  async getExpiringDocuments(companyId, daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.models.Document.findAll({
      where: {
        company_id: companyId,
        is_deleted: false,
        expiration_date: {
          [Op.between]: [new Date(), futureDate]
        }
      },
      include: [{
        model: this.models.User,
        as: 'creator',
        attributes: ['user_id', 'firstName', 'lastName', 'email']
      }],
      order: [['expiration_date', 'ASC']]
    });
  }

  /**
   * Generar alertas de vencimiento
   */
  async generateExpirationAlerts(companyId) {
    const expiringDocs = await this.getExpiringDocuments(companyId, 30);
    let alertsCreated = 0;

    for (const doc of expiringDocs) {
      const daysToExpire = Math.ceil(
        (new Date(doc.expiration_date) - new Date()) / (1000 * 60 * 60 * 24)
      );

      // Determinar severidad
      let severity = 'info';
      if (daysToExpire <= 7) severity = 'error';
      else if (daysToExpire <= 14) severity = 'warning';

      // Verificar si ya existe alerta reciente
      const existingAlert = await this.models.DocumentAlert.findOne({
        where: {
          document_id: doc.id,
          alert_type: 'expiration',
          is_dismissed: false,
          created_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      if (!existingAlert) {
        // Alertar al creador
        await this.models.DocumentAlert.create({
          document_id: doc.id,
          company_id: companyId,
          user_id: doc.created_by,
          alert_type: 'expiration',
          severity,
          title: `Documento próximo a vencer`,
          message: `El documento "${doc.title}" vence en ${daysToExpire} días (${doc.expiration_date}).`,
          trigger_date: doc.expiration_date
        });
        alertsCreated++;

        // Si es propietario diferente, alertar también
        if (doc.owner_id && doc.owner_id !== doc.created_by) {
          await this.models.DocumentAlert.create({
            document_id: doc.id,
            company_id: companyId,
            user_id: doc.owner_id,
            alert_type: 'expiration',
            severity,
            title: `Su documento está próximo a vencer`,
            message: `El documento "${doc.title}" vence en ${daysToExpire} días.`,
            trigger_date: doc.expiration_date
          });
          alertsCreated++;
        }
      }
    }

    return { alerts_created: alertsCreated };
  }

  /**
   * Obtener estadísticas de retención
   */
  async getRetentionStatistics(companyId) {
    // Documentos por tiempo de retención
    const byRetention = await this.models.Document.sequelize.query(`
      SELECT
        CASE
          WHEN expiration_date IS NULL THEN 'indefinido'
          WHEN expiration_date < NOW() THEN 'expirado'
          WHEN expiration_date < NOW() + INTERVAL '30 days' THEN '0-30 días'
          WHEN expiration_date < NOW() + INTERVAL '90 days' THEN '30-90 días'
          WHEN expiration_date < NOW() + INTERVAL '365 days' THEN '3-12 meses'
          ELSE 'más de 1 año'
        END as retention_period,
        COUNT(*) as count
      FROM dms_documents
      WHERE company_id = :companyId AND is_deleted = false
      GROUP BY retention_period
      ORDER BY
        CASE retention_period
          WHEN 'expirado' THEN 1
          WHEN '0-30 días' THEN 2
          WHEN '30-90 días' THEN 3
          WHEN '3-12 meses' THEN 4
          WHEN 'más de 1 año' THEN 5
          ELSE 6
        END
    `, {
      replacements: { companyId },
      type: this.models.Document.sequelize.QueryTypes.SELECT
    });

    // Documentos eliminados (para posible recuperación)
    const deletedCount = await this.models.Document.count({
      where: {
        company_id: companyId,
        is_deleted: true
      }
    });

    return {
      by_retention_period: byRetention,
      deleted_documents: deletedCount
    };
  }

  // ========================================
  // MÉTODOS AUXILIARES
  // ========================================

  /**
   * Agrupar array por campo
   */
  groupBy(array, field) {
    return array.reduce((acc, item) => {
      const key = item[field] || 'undefined';
      if (!acc[key]) acc[key] = 0;
      acc[key]++;
      return acc;
    }, {});
  }
}

module.exports = DocumentAuditService;
