/**
 * NotificationTemplateService.js
 *
 * Servicio para enviar notificaciones usando templates personalizables
 * Soporta personalización por empresa y variables dinámicas
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const NotificationCentralExchange = require('./NotificationCentralExchange');

class NotificationTemplateService {
  /**
   * Enviar notificación usando template personalizable
   *
   * @param {Object} params
   * @param {number} params.companyId - ID de la empresa
   * @param {string} params.module - Módulo (vacation, attendance, etc.)
   * @param {string} params.workflowKey - Clave del workflow
   * @param {string} params.recipientType - Tipo de destinatario (user, role, department)
   * @param {string} params.recipientId - ID del destinatario
   * @param {Object} params.variables - Variables para reemplazar en el template
   * @param {Object} params.options - Opciones adicionales (override channels, priority, etc.)
   */
  static async send({
    companyId,
    module,
    workflowKey,
    recipientType = 'user',
    recipientId,
    variables = {},
    options = {}
  }) {
    try {
      // Obtener template procesado con variables
      const [template] = await sequelize.query(`
        SELECT * FROM get_processed_template(
          :companyId,
          :module,
          :workflowKey,
          :variables::jsonb
        )
      `, {
        replacements: {
          companyId,
          module,
          workflowKey,
          variables: JSON.stringify(variables)
        },
        type: QueryTypes.SELECT
      });

      if (!template) {
        console.warn(`⚠️  [TEMPLATE] No se encontró template para ${module}.${workflowKey}`);
        // Fallback a valores por defecto
        template = {
          title: options.title || 'Notificación',
          message: options.message || 'Nueva notificación del sistema',
          channels: ['email', 'inbox'],
          priority: 'normal'
        };
      }

      // Permitir override de canales y prioridad
      const channels = options.channels || template.channels;
      const priority = options.priority || template.priority;

      // Enviar notificación via NCE
      await NotificationCentralExchange.send({
        companyId,
        module,
        workflowKey,
        recipientType,
        recipientId,
        title: template.title,
        message: template.message,
        priority,
        channels,
        originType: options.originType || `${module}_${workflowKey}`,
        originId: variables.originId || variables.id?.toString() || 'unknown',
        requiresAction: options.requiresAction || false,
        metadata: {
          ...variables,
          template_used: true
        }
      });

      console.log(`✅ [TEMPLATE] Notificación enviada: ${module}.${workflowKey}`);

      return { success: true, template };
    } catch (error) {
      console.error(`❌ [TEMPLATE] Error enviando notificación:`, error);
      throw error;
    }
  }

  /**
   * Obtener template para preview (sin enviar)
   */
  static async getTemplate({ companyId, module, workflowKey, variables = {} }) {
    try {
      const [template] = await sequelize.query(`
        SELECT * FROM get_processed_template(
          :companyId,
          :module,
          :workflowKey,
          :variables::jsonb
        )
      `, {
        replacements: {
          companyId,
          module,
          workflowKey,
          variables: JSON.stringify(variables)
        },
        type: QueryTypes.SELECT
      });

      return template;
    } catch (error) {
      console.error(`❌ [TEMPLATE] Error obteniendo template:`, error);
      return null;
    }
  }

  /**
   * Listar todos los templates disponibles para una empresa
   */
  static async listTemplates({ companyId, module = null }) {
    try {
      const where = module ? 'AND module = :module' : '';

      const templates = await sequelize.query(`
        SELECT
          id,
          company_id,
          module,
          workflow_key,
          title_template,
          message_template,
          available_variables,
          channels,
          priority,
          is_active,
          CASE
            WHEN company_id IS NULL THEN 'global'
            ELSE 'custom'
          END as template_type
        FROM notification_templates
        WHERE (company_id = :companyId OR company_id IS NULL)
          AND is_active = true
          ${where}
        ORDER BY module, workflow_key, company_id DESC NULLS LAST
      `, {
        replacements: { companyId, module },
        type: QueryTypes.SELECT
      });

      return templates;
    } catch (error) {
      console.error(`❌ [TEMPLATE] Error listando templates:`, error);
      return [];
    }
  }

  /**
   * Crear/actualizar template personalizado para una empresa
   */
  static async upsertTemplate({
    companyId,
    module,
    workflowKey,
    titleTemplate,
    messageTemplate,
    channels = null,
    priority = null,
    availableVariables = null
  }) {
    try {
      // Desactivar template anterior si existe
      await sequelize.query(`
        UPDATE notification_templates
        SET is_active = false
        WHERE company_id = :companyId
          AND module = :module
          AND workflow_key = :workflowKey
          AND is_active = true
      `, {
        replacements: { companyId, module, workflowKey },
        type: QueryTypes.UPDATE
      });

      // Crear nuevo template
      const [result] = await sequelize.query(`
        INSERT INTO notification_templates (
          company_id,
          module,
          workflow_key,
          title_template,
          message_template,
          channels,
          priority,
          available_variables,
          is_active
        ) VALUES (
          :companyId,
          :module,
          :workflowKey,
          :titleTemplate,
          :messageTemplate,
          :channels::jsonb,
          :priority,
          :availableVariables::jsonb,
          true
        )
        RETURNING id
      `, {
        replacements: {
          companyId,
          module,
          workflowKey,
          titleTemplate,
          messageTemplate,
          channels: channels ? JSON.stringify(channels) : null,
          priority: priority || 'normal',
          availableVariables: availableVariables ? JSON.stringify(availableVariables) : null
        },
        type: QueryTypes.INSERT
      });

      console.log(`✅ [TEMPLATE] Template personalizado creado/actualizado para empresa ${companyId}`);

      return { success: true, id: result[0].id };
    } catch (error) {
      console.error(`❌ [TEMPLATE] Error creando template:`, error);
      throw error;
    }
  }

  /**
   * Restaurar template a valores globales (eliminar personalización)
   */
  static async resetTemplate({ companyId, module, workflowKey }) {
    try {
      await sequelize.query(`
        UPDATE notification_templates
        SET is_active = false
        WHERE company_id = :companyId
          AND module = :module
          AND workflow_key = :workflowKey
          AND is_active = true
      `, {
        replacements: { companyId, module, workflowKey },
        type: QueryTypes.UPDATE
      });

      console.log(`✅ [TEMPLATE] Template restaurado a valores globales`);

      return { success: true };
    } catch (error) {
      console.error(`❌ [TEMPLATE] Error restaurando template:`, error);
      throw error;
    }
  }

  /**
   * Test de reemplazo de variables
   */
  static async testVariableReplacement(template, variables) {
    try {
      const [result] = await sequelize.query(`
        SELECT replace_template_variables(:template, :variables::jsonb) as result
      `, {
        replacements: {
          template,
          variables: JSON.stringify(variables)
        },
        type: QueryTypes.SELECT
      });

      return result.result;
    } catch (error) {
      console.error(`❌ [TEMPLATE] Error en test de variables:`, error);
      return null;
    }
  }
}

module.exports = NotificationTemplateService;
