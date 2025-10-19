/**
 * MODELO: NotificationTemplate
 * Plantillas reutilizables con placeholders para notificaciones
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NotificationTemplate = sequelize.define('NotificationTemplate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Multi-tenant (NULL = template global)
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'companies',
        key: 'company_id'
      },
      index: true,
      onDelete: 'CASCADE',
      comment: 'NULL = template global para todas las empresas'
    },

    // Identificación
    template_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      index: true,
      comment: 'Clave única del template (ej: attendance_late_arrival_approval)'
    },
    template_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nombre descriptivo del template'
    },
    module: {
      type: DataTypes.STRING(50),
      allowNull: false,
      index: true,
      comment: 'Módulo al que pertenece'
    },

    // Contenido con placeholders {{variable}}
    title_template: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Template del título con placeholders'
    },
    message_template: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Template del mensaje con placeholders'
    },
    short_message_template: {
      type: DataTypes.STRING(140),
      allowNull: true,
      comment: 'Template del mensaje corto para SMS/WhatsApp'
    },
    email_template: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Template HTML para email'
    },

    // Variables disponibles
    available_variables: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array de nombres de variables disponibles para este template'
    },

    // Configuración de canales por defecto
    default_send_email: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    default_send_whatsapp: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    default_send_sms: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // Estado
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      index: true
    },

    // Auditoría
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'notification_templates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['company_id', 'template_key'],
        name: 'unique_company_template_key'
      },
      {
        fields: ['module', 'is_active'],
        name: 'idx_notification_templates_module'
      }
    ]
  });

  // ================== MÉTODOS DE INSTANCIA ==================

  /**
   * Renderizar template con variables
   */
  NotificationTemplate.prototype.render = function(variables = {}) {
    const rendered = {
      title: this.renderString(this.title_template, variables),
      message: this.renderString(this.message_template, variables),
      short_message: this.renderString(this.short_message_template, variables),
      email_body: this.renderString(this.email_template, variables)
    };

    return rendered;
  };

  /**
   * Renderizar un string individual reemplazando placeholders
   */
  NotificationTemplate.prototype.renderString = function(template, variables) {
    if (!template) return '';

    let rendered = template;

    // Reemplazar variables {{variable_name}}
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(placeholder, value || '');
    }

    return rendered;
  };

  /**
   * Validar que todas las variables requeridas estén presentes
   */
  NotificationTemplate.prototype.validateVariables = function(variables) {
    const missing = [];

    for (const varName of this.available_variables) {
      if (variables[varName] === undefined || variables[varName] === null) {
        missing.push(varName);
      }
    }

    return {
      valid: missing.length === 0,
      missing: missing
    };
  };

  /**
   * Obtener preview con datos de ejemplo
   */
  NotificationTemplate.prototype.getPreview = function() {
    // Generar datos de ejemplo para cada variable
    const exampleData = {};
    for (const varName of this.available_variables) {
      exampleData[varName] = `[${varName}]`;
    }

    return this.render(exampleData);
  };

  /**
   * Formatear para API
   */
  NotificationTemplate.prototype.toAPI = function() {
    return {
      id: this.id,
      company_id: this.company_id,
      template_key: this.template_key,
      template_name: this.template_name,
      module: this.module,
      title_template: this.title_template,
      message_template: this.message_template,
      short_message_template: this.short_message_template,
      email_template: this.email_template,
      available_variables: this.available_variables,
      default_send_email: this.default_send_email,
      default_send_whatsapp: this.default_send_whatsapp,
      default_send_sms: this.default_send_sms,
      is_active: this.is_active,
      preview: this.getPreview()
    };
  };

  // ================== MÉTODOS ESTÁTICOS ==================

  /**
   * Buscar template por clave
   */
  NotificationTemplate.findByKey = async function(templateKey, companyId) {
    // Buscar primero en templates específicos de la empresa, luego en globales
    const template = await this.findOne({
      where: {
        template_key: templateKey,
        is_active: true,
        [sequelize.Sequelize.Op.or]: [
          { company_id: companyId },
          { company_id: null }
        ]
      },
      order: [
        // Priorizar templates específicos de la empresa sobre globales
        [sequelize.literal('CASE WHEN company_id IS NULL THEN 1 ELSE 0 END'), 'ASC']
      ]
    });

    return template;
  };

  /**
   * Obtener todos los templates activos
   */
  NotificationTemplate.getActiveForCompany = async function(companyId, module = null) {
    const where = {
      is_active: true,
      [sequelize.Sequelize.Op.or]: [
        { company_id: companyId },
        { company_id: null }
      ]
    };

    if (module) {
      where.module = module;
    }

    return await this.findAll({
      where,
      order: [['module', 'ASC'], ['template_name', 'ASC']]
    });
  };

  /**
   * Renderizar template por clave con variables
   */
  NotificationTemplate.renderByKey = async function(templateKey, companyId, variables) {
    const template = await this.findByKey(templateKey, companyId);

    if (!template) {
      throw new Error(`Template not found: ${templateKey}`);
    }

    // Validar variables
    const validation = template.validateVariables(variables);
    if (!validation.valid) {
      throw new Error(`Missing required variables: ${validation.missing.join(', ')}`);
    }

    return template.render(variables);
  };

  /**
   * Crear template personalizado para una empresa
   */
  NotificationTemplate.createCustom = async function(companyId, data) {
    return await this.create({
      company_id: companyId,
      template_key: data.templateKey,
      template_name: data.templateName,
      module: data.module,
      title_template: data.titleTemplate,
      message_template: data.messageTemplate,
      short_message_template: data.shortMessageTemplate,
      email_template: data.emailTemplate,
      available_variables: data.availableVariables || [],
      default_send_email: data.defaultSendEmail || false,
      default_send_whatsapp: data.defaultSendWhatsapp || false,
      default_send_sms: data.defaultSendSms || false,
      is_active: true
    });
  };

  return NotificationTemplate;
};
