/**
 * WORKFLOW CONFIG HELPER - Sistema de Receptores Configurables
 *
 * Permite configurar dinámicamente quién recibe notificaciones por tipo de solicitud.
 * NO hardcodea supervisores ni roles específicos.
 *
 * @version 1.0.0
 * @date 2025-10-19
 */

const { User, Department, CompanyModule, SystemModule } = require('../config/database');
const NotificationRecipientResolver = require('../services/NotificationRecipientResolver');

/**
 * SCHEMA DE CONFIGURACIÓN (guardado en CompanyModule.configuration)
 *
 * Ejemplo:
 * {
 *   workflows: {
 *     'vacation_request': {
 *       recipients: [
 *         { type: 'role', value: 'rrhh' },
 *         { type: 'supervisor', field: 'supervisor_id' }
 *       ],
 *       escalation_chain: [
 *         { type: 'role', value: 'manager', timeout_hours: 24 },
 *         { type: 'role', value: 'admin', timeout_hours: 48 }
 *       ],
 *       notify_employee: true
 *     },
 *     'medical_certificate': {
 *       recipients: [
 *         { type: 'role', value: 'rrhh' },
 *         { type: 'department', departmentName: 'Medicina Laboral' }
 *       ],
 *       escalation_chain: [
 *         { type: 'role', value: 'medical_director', timeout_hours: 72 }
 *       ]
 *     },
 *     'legal_communication': {
 *       recipients: [
 *         { type: 'user_specific', userId: null }  // Se resuelve dinámicamente
 *       ],
 *       escalation_chain: [],
 *       notify_employee: true
 *     }
 *   }
 * }
 */

/**
 * Obtiene la configuración de workflow para una empresa
 *
 * @param {number|string} companyId - ID de la empresa
 * @param {string} workflowKey - Clave del workflow (ej: 'vacation_request')
 * @returns {Promise<object|null>} - Configuración del workflow o null
 */
async function getWorkflowConfig(companyId, workflowKey) {
  try {
    // Buscar módulo de notificaciones enterprise
    const systemModule = await SystemModule.findOne({
      where: { moduleKey: 'notifications-enterprise', isActive: true }
    });

    if (!systemModule) {
      console.log(`⚠️  [WORKFLOW-CONFIG] Módulo notifications-enterprise no existe`);
      return null;
    }

    const companyModule = await CompanyModule.findOne({
      where: {
        companyId,
        systemModuleId: systemModule.id
      }
    });

    if (!companyModule || !companyModule.isOperational()) {
      console.log(`⚠️  [WORKFLOW-CONFIG] Empresa ${companyId} no tiene módulo activo`);
      return null;
    }

    // Extraer configuración del workflow
    const config = companyModule.configuration?.workflows?.[workflowKey];

    if (!config) {
      console.log(`ℹ️  [WORKFLOW-CONFIG] No hay configuración para "${workflowKey}"`);
      return getDefaultConfig(workflowKey);  // Fallback a configuración por defecto
    }

    console.log(`✅ [WORKFLOW-CONFIG] Configuración de "${workflowKey}" encontrada`);
    return config;

  } catch (error) {
    console.error(`❌ [WORKFLOW-CONFIG] Error obteniendo config de "${workflowKey}":`, error.message);
    return getDefaultConfig(workflowKey);  // Fallback a configuración por defecto
  }
}

/**
 * Resuelve receptores dinámicamente según configuración
 *
 * @param {number|string} companyId - ID de la empresa
 * @param {string} workflowKey - Clave del workflow
 * @param {object} context - Contexto adicional (entity, relatedUser, etc.)
 * @returns {Promise<Array>} - Array de user IDs que deben recibir la notificación
 */
async function resolveRecipients(companyId, workflowKey, context = {}) {
  try {
    const config = await getWorkflowConfig(companyId, workflowKey);

    if (!config || !config.recipients) {
      console.log(`⚠️  [WORKFLOW-CONFIG] Sin receptores configurados para "${workflowKey}"`);
      return [];
    }

    const resolvedRecipients = [];

    for (const recipient of config.recipients) {
      const users = await resolveRecipientType(recipient, companyId, context);
      resolvedRecipients.push(...users);
    }

    // Eliminar duplicados
    const uniqueRecipients = [...new Set(resolvedRecipients)];

    console.log(`✅ [WORKFLOW-CONFIG] Resueltos ${uniqueRecipients.length} receptores para "${workflowKey}"`);
    return uniqueRecipients;

  } catch (error) {
    console.error(`❌ [WORKFLOW-CONFIG] Error resolviendo receptores:`, error.message);
    return [];
  }
}

/**
 * Resuelve un tipo específico de receptor
 *
 * @param {object} recipient - Configuración del receptor
 * @param {number|string} companyId - ID de la empresa
 * @param {object} context - Contexto adicional
 * @returns {Promise<Array>} - Array de user IDs
 */
async function resolveRecipientType(recipient, companyId, context) {
  switch (recipient.type) {
    case 'role':
      return await resolveByRole(companyId, recipient.value);

    case 'supervisor':
      return await resolveSupervisor(companyId, context.relatedUserId, recipient.field);

    case 'department':
      return await resolveByDepartment(companyId, recipient.departmentName, recipient.role);

    case 'user_specific':
      return await resolveUserSpecific(recipient.userId || context.specificUserId);

    case 'evaluator_group':
      return await resolveEvaluatorGroup(companyId, recipient.groupName);

    case 'all_rrhh':
      return await resolveAllRRHH(companyId);

    default:
      console.warn(`⚠️  [WORKFLOW-CONFIG] Tipo de receptor desconocido: ${recipient.type}`);
      return [];
  }
}

/**
 * Resuelve receptores por ROL (ej: 'rrhh', 'admin', 'manager')
 */
async function resolveByRole(companyId, roleName) {
  try {
    const users = await User.findAll({
      where: {
        company_id: companyId,
        role: roleName,
        is_active: true
      },
      attributes: ['id']
    });

    const userIds = users.map(u => u.id);
    console.log(`  → Rol "${roleName}": ${userIds.length} usuarios`);
    return userIds;

  } catch (error) {
    console.error(`❌ Error resolviendo rol "${roleName}":`, error.message);
    return [];
  }
}

/**
 * Resuelve supervisor del usuario (usando supervisor_id o similar)
 */
async function resolveSupervisor(companyId, relatedUserId, field = 'supervisor_id') {
  try {
    if (!relatedUserId) {
      console.warn(`⚠️  Sin relatedUserId para resolver supervisor`);
      return [];
    }

    const employee = await User.findByPk(relatedUserId, {
      attributes: ['id', field]
    });

    if (!employee || !employee[field]) {
      console.warn(`⚠️  Usuario ${relatedUserId} no tiene ${field}`);
      return [];
    }

    const supervisorId = employee[field];
    console.log(`  → Supervisor (${field}): ${supervisorId}`);
    return [supervisorId];

  } catch (error) {
    console.error(`❌ Error resolviendo supervisor:`, error.message);
    return [];
  }
}

/**
 * Resuelve receptores por DEPARTAMENTO (ej: "Medicina Laboral")
 */
async function resolveByDepartment(companyId, departmentName, role = null) {
  try {
    const department = await Department.findOne({
      where: {
        company_id: companyId,
        name: departmentName,
        is_active: true
      }
    });

    if (!department) {
      console.warn(`⚠️  Departamento "${departmentName}" no encontrado`);
      return [];
    }

    const where = {
      company_id: companyId,
      department_id: department.id,
      is_active: true
    };

    if (role) {
      where.role = role;  // Filtrar por rol específico dentro del departamento
    }

    const users = await User.findAll({
      where,
      attributes: ['id']
    });

    const userIds = users.map(u => u.id);
    console.log(`  → Departamento "${departmentName}"${role ? ` (rol: ${role})` : ''}: ${userIds.length} usuarios`);
    return userIds;

  } catch (error) {
    console.error(`❌ Error resolviendo departamento "${departmentName}":`, error.message);
    return [];
  }
}

/**
 * Resuelve usuario ESPECÍFICO por ID
 */
async function resolveUserSpecific(userId) {
  if (!userId) {
    console.warn(`⚠️  Sin userId específico para resolver`);
    return [];
  }

  console.log(`  → Usuario específico: ${userId}`);
  return [userId];
}

/**
 * Resuelve grupo de EVALUADORES (custom para empresa)
 */
async function resolveEvaluatorGroup(companyId, groupName) {
  try {
    // Los grupos de evaluadores podrían estar guardados en una tabla custom
    // o en metadata de usuarios
    // Por ahora, buscamos usuarios con metadata que contenga el grupo

    const users = await User.findAll({
      where: {
        company_id: companyId,
        is_active: true,
        metadata: {
          evaluator_groups: {
            [sequelize.Op.contains]: [groupName]
          }
        }
      },
      attributes: ['id']
    });

    const userIds = users.map(u => u.id);
    console.log(`  → Grupo evaluador "${groupName}": ${userIds.length} usuarios`);
    return userIds;

  } catch (error) {
    console.error(`❌ Error resolviendo grupo evaluador "${groupName}":`, error.message);
    return [];
  }
}

/**
 * Resuelve TODOS los usuarios de RRHH
 * 🆕 ACTUALIZADO: Usa NotificationRecipientResolver como SSOT
 */
async function resolveAllRRHH(companyId) {
  try {
    // Usar NotificationRecipientResolver como fuente única de verdad
    const rrhhRecipients = await NotificationRecipientResolver.resolveRRHH(companyId, {
      maxRecipients: 10,
      includeUserDetails: false,
      fallbackToAdmins: true
    });

    const userIds = rrhhRecipients.map(r => r.userId);
    console.log(`  → Todos RRHH (via NotificationRecipientResolver): ${userIds.length} usuarios`);
    return userIds;

  } catch (error) {
    console.error(`❌ Error resolviendo todos RRHH:`, error.message);
    return [];
  }
}

/**
 * Obtiene configuración por DEFECTO si no hay custom
 *
 * @param {string} workflowKey - Clave del workflow
 * @returns {object} - Configuración por defecto
 */
function getDefaultConfig(workflowKey) {
  const defaults = {
    'vacation_request': {
      recipients: [
        { type: 'role', value: 'admin' }  // RRHH por defecto
      ],
      escalation_chain: [
        { type: 'role', value: 'manager', timeout_hours: 24 }
      ],
      notify_employee: true
    },

    'medical_certificate': {
      recipients: [
        { type: 'role', value: 'admin' }
      ],
      escalation_chain: [],
      notify_employee: true
    },

    'legal_communication': {
      recipients: [],  // Se envía directamente al empleado
      escalation_chain: [],
      notify_employee: true
    },

    'attendance_late_arrival': {
      recipients: [
        { type: 'role', value: 'supervisor' }
      ],
      escalation_chain: [
        { type: 'role', value: 'admin', timeout_hours: 2 }
      ],
      notify_employee: false
    }
  };

  return defaults[workflowKey] || {
    recipients: [{ type: 'role', value: 'admin' }],
    escalation_chain: [],
    notify_employee: true
  };
}

/**
 * Resuelve cadena de ESCALAMIENTO (similar a recipients pero con timeouts)
 *
 * @param {number|string} companyId - ID de la empresa
 * @param {string} workflowKey - Clave del workflow
 * @param {number} stepNumber - Número del paso (1, 2, 3...)
 * @param {object} context - Contexto adicional
 * @returns {Promise<object|null>} - Configuración del paso de escalamiento
 */
async function resolveEscalationStep(companyId, workflowKey, stepNumber, context = {}) {
  try {
    const config = await getWorkflowConfig(companyId, workflowKey);

    if (!config || !config.escalation_chain) {
      console.log(`ℹ️  [WORKFLOW-CONFIG] Sin cadena de escalamiento para "${workflowKey}"`);
      return null;
    }

    const stepIndex = stepNumber - 1;  // Array empieza en 0
    const stepConfig = config.escalation_chain[stepIndex];

    if (!stepConfig) {
      console.log(`ℹ️  [WORKFLOW-CONFIG] No hay paso ${stepNumber} en escalamiento de "${workflowKey}"`);
      return null;
    }

    // Resolver receptores de este paso
    const recipients = await resolveRecipientType(stepConfig, companyId, context);

    return {
      stepNumber: stepNumber,
      recipients: recipients,
      timeout_hours: stepConfig.timeout_hours || 24,
      timeout_minutes: (stepConfig.timeout_hours || 24) * 60,
      escalate_on_timeout: true
    };

  } catch (error) {
    console.error(`❌ [WORKFLOW-CONFIG] Error resolviendo escalamiento paso ${stepNumber}:`, error.message);
    return null;
  }
}

/**
 * Valida que una configuración de workflow sea correcta
 *
 * @param {object} config - Configuración a validar
 * @returns {object} - { valid: boolean, errors: Array }
 */
function validateWorkflowConfig(config) {
  const errors = [];

  if (!config.recipients || !Array.isArray(config.recipients)) {
    errors.push('recipients debe ser un array');
  }

  if (config.recipients) {
    config.recipients.forEach((recipient, idx) => {
      if (!recipient.type) {
        errors.push(`recipients[${idx}] debe tener un tipo`);
      }

      const validTypes = ['role', 'supervisor', 'department', 'user_specific', 'evaluator_group', 'all_rrhh'];
      if (recipient.type && !validTypes.includes(recipient.type)) {
        errors.push(`recipients[${idx}].type "${recipient.type}" no es válido`);
      }
    });
  }

  if (config.escalation_chain && !Array.isArray(config.escalation_chain)) {
    errors.push('escalation_chain debe ser un array');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

module.exports = {
  getWorkflowConfig,
  resolveRecipients,
  resolveEscalationStep,
  validateWorkflowConfig,
  getDefaultConfig
};
