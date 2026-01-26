/**
 * COMPANY OFFBOARDING EVENT MODEL
 * Registra todos los eventos del proceso de baja de una empresa
 *
 * @version 1.0.0
 * @date 2026-01-24
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CompanyOffboardingEvent = sequelize.define('CompanyOffboardingEvent', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'companies', key: 'company_id' }
    },

    event_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [[
          'overdue_detected',
          'warning_sent',
          'grace_period_started',
          'grace_reminder_sent',
          'export_started',
          'export_completed',
          'export_failed',
          'drive_uploaded',
          'drive_upload_failed',
          'client_notified_export',
          'baja_confirmed',
          'purge_started',
          'purge_phase_completed',
          'purge_completed',
          'purge_failed',
          'offboarding_cancelled',
          'payment_received'
        ]]
      }
    },

    triggered_by_staff_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'NULL si fue automático (cron)'
    },

    invoice_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Factura que originó el proceso'
    },

    export_file_path: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Ruta local del ZIP generado'
    },

    drive_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'URL pública del Drive'
    },

    drive_file_id: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'ID del archivo en Google Drive'
    },

    records_exported: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Conteo de registros exportados por tabla: {users: 50, attendances: 12000, ...}'
    },

    records_deleted: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Conteo de registros borrados por tabla en purge'
    },

    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mensaje de error si falló algún paso'
    },

    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Datos adicionales del evento'
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'company_offboarding_events',
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ['company_id'] },
      { fields: ['event_type'] },
      { fields: ['created_at'] }
    ]
  });

  CompanyOffboardingEvent.associate = (models) => {
    CompanyOffboardingEvent.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company'
    });
  };

  // Helper: obtener timeline de eventos de una empresa
  CompanyOffboardingEvent.getTimeline = async function (companyId) {
    return this.findAll({
      where: { company_id: companyId },
      order: [['created_at', 'DESC']],
      limit: 50
    });
  };

  // Helper: registrar evento
  CompanyOffboardingEvent.logEvent = async function (data) {
    return this.create({
      company_id: data.companyId,
      event_type: data.eventType,
      triggered_by_staff_id: data.staffId || null,
      invoice_id: data.invoiceId || null,
      export_file_path: data.exportFilePath || null,
      drive_url: data.driveUrl || null,
      drive_file_id: data.driveFileId || null,
      records_exported: data.recordsExported || {},
      records_deleted: data.recordsDeleted || {},
      error_message: data.errorMessage || null,
      metadata: data.metadata || {}
    });
  };

  return CompanyOffboardingEvent;
};
