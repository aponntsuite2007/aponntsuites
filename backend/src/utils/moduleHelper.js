/**
 * MODULE HELPER - Sistema Plug & Play Universal
 *
 * Verifica si una empresa tiene un módulo específico contratado y activo.
 * Si NO tiene el módulo, las funcionalidades se omiten sin romper el sistema.
 *
 * @version 1.0.0
 * @date 2025-10-19
 */

const { CompanyModule, SystemModule } = require('../config/database');

/**
 * Verifica si un módulo está activo para una empresa
 *
 * @param {number|string} companyId - ID de la empresa
 * @param {string} moduleKey - Clave del módulo (ej: 'notifications-enterprise', 'roles-advanced')
 * @returns {Promise<boolean>} - true si el módulo está operacional, false si no
 */
async function isModuleActive(companyId, moduleKey) {
  try {
    // 1. Buscar el módulo del sistema por su clave
    const systemModule = await SystemModule.findOne({
      where: { moduleKey, isActive: true }
    });

    if (!systemModule) {
      console.log(`ℹ️  [MODULE-HELPER] Módulo "${moduleKey}" no existe en system_modules`);
      return false;
    }

    // 2. Si es módulo CORE, está siempre activo (incluido en todos los planes)
    if (systemModule.isCore) {
      console.log(`✅ [MODULE-HELPER] Módulo "${moduleKey}" es CORE - Siempre activo`);
      return true;
    }

    // 3. Buscar si la empresa tiene contratado este módulo
    const companyModule = await CompanyModule.findOne({
      where: {
        companyId,
        systemModuleId: systemModule.id
      }
    });

    if (!companyModule) {
      console.log(`⚠️  [MODULE-HELPER] Empresa ${companyId} NO tiene contratado "${moduleKey}"`);
      return false;
    }

    // 4. Verificar que el módulo esté operacional (activo + no expirado + no suspendido)
    const isOperational = companyModule.isOperational();

    if (!isOperational) {
      console.log(`⚠️  [MODULE-HELPER] Módulo "${moduleKey}" de empresa ${companyId} NO está operacional`);
      console.log(`   - isActive: ${companyModule.isActive}`);
      console.log(`   - isExpired: ${companyModule.isExpired()}`);
      console.log(`   - isSuspended: ${companyModule.isSuspended()}`);
      return false;
    }

    console.log(`✅ [MODULE-HELPER] Módulo "${moduleKey}" está ACTIVO para empresa ${companyId}`);
    return true;

  } catch (error) {
    console.error(`❌ [MODULE-HELPER] Error verificando módulo "${moduleKey}":`, error.message);
    return false;  // En caso de error, asumir que no está activo
  }
}

/**
 * Obtiene la configuración de un módulo para una empresa
 *
 * @param {number|string} companyId - ID de la empresa
 * @param {string} moduleKey - Clave del módulo
 * @returns {Promise<object|null>} - Configuración del módulo o null
 */
async function getModuleConfiguration(companyId, moduleKey) {
  try {
    const systemModule = await SystemModule.findOne({
      where: { moduleKey, isActive: true }
    });

    if (!systemModule) return null;

    const companyModule = await CompanyModule.findOne({
      where: {
        companyId,
        systemModuleId: systemModule.id
      }
    });

    if (!companyModule || !companyModule.isOperational()) return null;

    return companyModule.configuration || {};

  } catch (error) {
    console.error(`❌ [MODULE-HELPER] Error obteniendo configuración de "${moduleKey}":`, error.message);
    return null;
  }
}

/**
 * Middleware universal para ejecutar funcionalidad SOLO si el módulo está activo
 *
 * @param {number|string} companyId - ID de la empresa
 * @param {string} moduleKey - Clave del módulo requerido
 * @param {Function} callback - Función a ejecutar si el módulo está activo
 * @param {Function} [fallback] - Función a ejecutar si el módulo NO está activo (opcional)
 * @returns {Promise<any>} - Resultado del callback o fallback
 *
 * @example
 * // Enviar notificación SOLO si módulo está activo
 * await useModuleIfAvailable(companyId, 'notifications-enterprise', async () => {
 *   return sendNotification(data);
 * }, () => {
 *   console.log('Notificaciones no disponibles - Omitiendo');
 *   return null;
 * });
 */
async function useModuleIfAvailable(companyId, moduleKey, callback, fallback = null) {
  const moduleActive = await isModuleActive(companyId, moduleKey);

  if (moduleActive) {
    console.log(`🔌 [PLUG&PLAY] Ejecutando funcionalidad de "${moduleKey}"`);
    return await callback();
  } else {
    console.log(`⏭️  [PLUG&PLAY] Módulo "${moduleKey}" no activo - Omitiendo sin error`);
    return fallback ? await fallback() : null;
  }
}

/**
 * Verifica múltiples módulos a la vez
 *
 * @param {number|string} companyId - ID de la empresa
 * @param {string[]} moduleKeys - Array de claves de módulos
 * @returns {Promise<object>} - Objeto con estado de cada módulo
 *
 * @example
 * const modules = await checkMultipleModules(companyId, [
 *   'notifications-enterprise',
 *   'roles-advanced',
 *   'workflows'
 * ]);
 * // Resultado: { 'notifications-enterprise': true, 'roles-advanced': false, 'workflows': true }
 */
async function checkMultipleModules(companyId, moduleKeys) {
  const results = {};

  await Promise.all(
    moduleKeys.map(async (moduleKey) => {
      results[moduleKey] = await isModuleActive(companyId, moduleKey);
    })
  );

  return results;
}

/**
 * Obtiene todos los módulos activos de una empresa
 *
 * @param {number|string} companyId - ID de la empresa
 * @returns {Promise<Array>} - Array de módulos operacionales
 */
async function getActiveModules(companyId) {
  try {
    const companyModules = await CompanyModule.findAll({
      where: { companyId },
      include: [{
        model: SystemModule,
        where: { isActive: true },
        required: true
      }]
    });

    // Filtrar solo los operacionales
    return companyModules
      .filter(cm => cm.isOperational())
      .map(cm => ({
        moduleKey: cm.SystemModule.moduleKey,
        moduleName: cm.SystemModule.name,
        category: cm.SystemModule.category,
        configuration: cm.configuration,
        contractedAt: cm.contractedAt,
        expiresAt: cm.expiresAt
      }));

  } catch (error) {
    console.error(`❌ [MODULE-HELPER] Error obteniendo módulos activos:`, error.message);
    return [];
  }
}

module.exports = {
  isModuleActive,
  getModuleConfiguration,
  useModuleIfAvailable,
  checkMultipleModules,
  getActiveModules
};
