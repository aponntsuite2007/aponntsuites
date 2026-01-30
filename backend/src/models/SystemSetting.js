/**
 * SYSTEM SETTING MODEL
 * Configuraciones del sistema parametrizables desde UI.
 *
 * Permite cambiar valores sin modificar código ni .env
 * Los valores de .env son defaults, la BD tiene prioridad.
 *
 * @version 1.0.0
 * @date 2026-01-28
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemSetting = sequelize.define('SystemSetting', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    // Categoría del setting (para agrupar en UI)
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [[
          'google_drive',      // Configuración de Google Drive
          'offboarding',       // Parámetros de baja de empresas
          'restoration',       // Parámetros de restauración
          'notifications',     // Configuración de notificaciones
          'security',          // Parámetros de seguridad
          'billing',           // Facturación y cobros
          'system',            // Sistema general
          'integrations'       // Integraciones externas
        ]]
      }
    },

    // Clave única del setting
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },

    // Valor actual (siempre string, se parsea según data_type)
    value: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Tipo de dato para parsear/validar
    data_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'string',
      validate: {
        isIn: [['string', 'number', 'boolean', 'json', 'password']]
      }
    },

    // Valor por defecto (del .env o hardcodeado)
    default_value: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Nombre para mostrar en UI
    display_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },

    // Descripción/ayuda
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Si es sensible (password, API key) - se enmascara en UI
    is_sensitive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // Si requiere reinicio del servidor para aplicar
    requires_restart: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // Validación (regex o valores permitidos)
    validation_regex: {
      type: DataTypes.STRING(500),
      allowNull: true
    },

    // Opciones para select (JSON array)
    options: {
      type: DataTypes.JSONB,
      defaultValue: null,
      comment: 'Para campos tipo select: [{value: "x", label: "X"}, ...]'
    },

    // Orden de aparición en UI
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    // Si está activo
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    // Quién lo modificó por última vez (UUID del staff)
    modified_by_staff_id: {
      type: DataTypes.UUID,
      allowNull: true
    },

    modified_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'system_settings',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['key'] },
      { fields: ['category'] },
      { fields: ['is_active'] }
    ]
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS ESTÁTICOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtener valor de un setting (con fallback a default)
   */
  SystemSetting.getValue = async function(key, defaultValue = null) {
    const setting = await this.findOne({ where: { key, is_active: true } });

    if (!setting) {
      return defaultValue;
    }

    const rawValue = setting.value !== null ? setting.value : setting.default_value;

    if (rawValue === null) {
      return defaultValue;
    }

    // Parsear según tipo
    switch (setting.data_type) {
      case 'number':
        return parseFloat(rawValue);
      case 'boolean':
        return rawValue === 'true' || rawValue === '1';
      case 'json':
        try { return JSON.parse(rawValue); } catch { return defaultValue; }
      default:
        return rawValue;
    }
  };

  /**
   * Establecer valor de un setting
   */
  SystemSetting.setValue = async function(key, value, staffId = null) {
    const setting = await this.findOne({ where: { key } });

    if (!setting) {
      throw new Error(`Setting '${key}' no encontrado`);
    }

    // Convertir a string para almacenar
    let stringValue;
    if (value === null || value === undefined) {
      stringValue = null;
    } else if (typeof value === 'object') {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    await setting.update({
      value: stringValue,
      modified_by_staff_id: staffId,
      modified_at: new Date()
    });

    return setting;
  };

  /**
   * Obtener todos los settings de una categoría
   */
  SystemSetting.getByCategory = async function(category) {
    return this.findAll({
      where: { category, is_active: true },
      order: [['sort_order', 'ASC'], ['display_name', 'ASC']]
    });
  };

  /**
   * Obtener todos los settings agrupados por categoría
   */
  SystemSetting.getAllGrouped = async function() {
    const settings = await this.findAll({
      where: { is_active: true },
      order: [['category', 'ASC'], ['sort_order', 'ASC']]
    });

    const grouped = {};
    for (const setting of settings) {
      if (!grouped[setting.category]) {
        grouped[setting.category] = [];
      }
      grouped[setting.category].push(setting);
    }

    return grouped;
  };

  /**
   * Seed de settings iniciales (solo crea si no existen)
   */
  SystemSetting.seedDefaults = async function() {
    const defaults = [
      // ═══════════════════════════════════════════════════════════════════════
      // GOOGLE DRIVE
      // ═══════════════════════════════════════════════════════════════════════
      {
        category: 'google_drive',
        key: 'GOOGLE_DRIVE_ENABLED',
        value: null,
        default_value: 'false',
        data_type: 'boolean',
        display_name: 'Google Drive Habilitado',
        description: 'Activar integración con Google Drive para exports de baja',
        is_sensitive: false,
        requires_restart: true,
        sort_order: 1
      },
      {
        category: 'google_drive',
        key: 'GOOGLE_DRIVE_ROOT_FOLDER_ID',
        value: null,
        default_value: '',
        data_type: 'string',
        display_name: 'ID del Folder Raíz',
        description: 'ID del folder en Google Drive donde se suben los exports (ej: 1ABC...xyz)',
        is_sensitive: false,
        requires_restart: false,
        sort_order: 2
      },
      {
        category: 'google_drive',
        key: 'GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL',
        value: null,
        default_value: '',
        data_type: 'string',
        display_name: 'Email del Service Account',
        description: 'Email del Service Account de Google (client_email del JSON)',
        is_sensitive: false,
        requires_restart: false,
        sort_order: 3
      },

      // ═══════════════════════════════════════════════════════════════════════
      // OFFBOARDING (BAJA DE EMPRESAS)
      // ═══════════════════════════════════════════════════════════════════════
      {
        category: 'offboarding',
        key: 'OFFBOARDING_INVOICE_OVERDUE_DAYS',
        value: null,
        default_value: '30',
        data_type: 'number',
        display_name: 'Días de Factura Vencida',
        description: 'Días de vencimiento de factura antes de iniciar proceso de baja',
        is_sensitive: false,
        requires_restart: false,
        sort_order: 1
      },
      {
        category: 'offboarding',
        key: 'OFFBOARDING_GRACE_PERIOD_DAYS',
        value: null,
        default_value: '7',
        data_type: 'number',
        display_name: 'Días de Gracia',
        description: 'Días hábiles de gracia después del warning antes de exportar datos',
        is_sensitive: false,
        requires_restart: false,
        sort_order: 2
      },
      {
        category: 'offboarding',
        key: 'OFFBOARDING_CRON_ENABLED',
        value: null,
        default_value: 'true',
        data_type: 'boolean',
        display_name: 'Cron Automático Habilitado',
        description: 'Ejecutar detección automática de facturas vencidas',
        is_sensitive: false,
        requires_restart: true,
        sort_order: 3
      },
      {
        category: 'offboarding',
        key: 'OFFBOARDING_CRON_HOUR',
        value: null,
        default_value: '8',
        data_type: 'number',
        display_name: 'Hora del Cron',
        description: 'Hora del día para ejecutar el cron de detección (0-23)',
        is_sensitive: false,
        requires_restart: true,
        sort_order: 4
      },
      {
        category: 'offboarding',
        key: 'OFFBOARDING_MIN_ROLE_LEVEL',
        value: null,
        default_value: '1',
        data_type: 'number',
        display_name: 'Nivel Mínimo para Confirmar Baja',
        description: 'Nivel de rol mínimo requerido (0=director, 1=gerente)',
        is_sensitive: false,
        requires_restart: false,
        sort_order: 5,
        options: [
          { value: '0', label: 'Director/Superadmin (level 0)' },
          { value: '1', label: 'Gerente o superior (level 1)' }
        ]
      },

      // ═══════════════════════════════════════════════════════════════════════
      // RESTORATION (RESTAURACIÓN)
      // ═══════════════════════════════════════════════════════════════════════
      {
        category: 'restoration',
        key: 'RESTORE_MIN_COMPATIBILITY_SCORE',
        value: null,
        default_value: '90',
        data_type: 'number',
        display_name: 'Score Mínimo de Compatibilidad (%)',
        description: 'Porcentaje mínimo de compatibilidad de schema requerido para restaurar',
        is_sensitive: false,
        requires_restart: false,
        sort_order: 1
      },
      {
        category: 'restoration',
        key: 'RESTORE_MIN_ROLE_LEVEL',
        value: null,
        default_value: '0',
        data_type: 'number',
        display_name: 'Nivel Mínimo para Restaurar',
        description: 'Nivel de rol mínimo requerido para restaurar empresas',
        is_sensitive: false,
        requires_restart: false,
        sort_order: 2,
        options: [
          { value: '0', label: 'Solo Director/Superadmin (level 0)' },
          { value: '1', label: 'Gerente o superior (level 1)' }
        ]
      },
      {
        category: 'restoration',
        key: 'RESTORE_REQUIRE_NEW_CONTRACT',
        value: null,
        default_value: 'true',
        data_type: 'boolean',
        display_name: 'Requiere Contrato Nuevo',
        description: 'Exigir que exista un contrato nuevo activo antes de restaurar',
        is_sensitive: false,
        requires_restart: false,
        sort_order: 3
      },

      // ═══════════════════════════════════════════════════════════════════════
      // NOTIFICATIONS
      // ═══════════════════════════════════════════════════════════════════════
      {
        category: 'notifications',
        key: 'NOTIFICATION_OFFBOARDING_EMAIL_ENABLED',
        value: null,
        default_value: 'true',
        data_type: 'boolean',
        display_name: 'Emails de Baja Habilitados',
        description: 'Enviar emails automáticos durante el proceso de baja',
        is_sensitive: false,
        requires_restart: false,
        sort_order: 1
      },
      {
        category: 'notifications',
        key: 'NOTIFICATION_OFFBOARDING_WHATSAPP_ENABLED',
        value: null,
        default_value: 'false',
        data_type: 'boolean',
        display_name: 'WhatsApp de Baja Habilitado',
        description: 'Enviar mensajes de WhatsApp durante el proceso de baja',
        is_sensitive: false,
        requires_restart: false,
        sort_order: 2
      },

      // ═══════════════════════════════════════════════════════════════════════
      // BILLING
      // ═══════════════════════════════════════════════════════════════════════
      {
        category: 'billing',
        key: 'BILLING_EXPORT_RETENTION_DAYS',
        value: null,
        default_value: '30',
        data_type: 'number',
        display_name: 'Días de Retención de Exports',
        description: 'Días que se mantienen los archivos ZIP de export antes de eliminarlos',
        is_sensitive: false,
        requires_restart: false,
        sort_order: 1
      }
    ];

    let created = 0;
    for (const setting of defaults) {
      const [instance, wasCreated] = await this.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
      if (wasCreated) created++;
    }

    console.log(`✅ [SystemSetting] Seed completado: ${created} settings creados`);
    return created;
  };

  return SystemSetting;
};
