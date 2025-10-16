/**
 * MODULE SERVICE - Sistema Plug & Play
 *
 * Servicio para gestionar módulos contratados por empresa (multi-tenant)
 * Verifica qué módulos están activos y ejecuta funciones condicionalmente
 *
 * REGLA UNIVERSAL:
 * - SI módulo activo → Ejecutar función
 * - SI módulo inactivo → Saltar y continuar
 *
 * @version 2.0
 * @date 2025-10-16
 */

const db = require('../config/database');

class ModuleService {

    /**
     * Verifica si un módulo está activo para una empresa
     *
     * @param {number} companyId - ID de la empresa
     * @param {string} moduleCode - Código del módulo (ej: 'shift_compatibility', 'art_integration')
     * @returns {Promise<boolean>} - true si el módulo está activo
     */
    async isModuleActive(companyId, moduleCode) {
        try {
            const result = await db.query(`
                SELECT
                    cm.is_active,
                    sm.is_core,
                    cm.license_expires_at
                FROM system_modules sm
                LEFT JOIN company_modules cm
                    ON sm.module_code = cm.module_code
                    AND cm.company_id = $1
                WHERE sm.module_code = $2
            `, [companyId, moduleCode]);

            if (!result || result.rows.length === 0) {
                console.log(`⚠️ [MODULE] Módulo "${moduleCode}" no encontrado en catálogo`);
                return false;
            }

            const module = result.rows[0];

            // Los módulos CORE siempre están activos
            if (module.is_core) {
                return true;
            }

            // Los módulos premium solo si están contratados y activos
            if (!module.is_active) {
                return false;
            }

            // Verificar expiración de licencia
            if (module.license_expires_at) {
                const now = new Date();
                const expiresAt = new Date(module.license_expires_at);

                if (now > expiresAt) {
                    console.log(`⚠️ [MODULE] Licencia del módulo "${moduleCode}" expirada para empresa ${companyId}`);
                    return false;
                }
            }

            return true;

        } catch (error) {
            console.error(`❌ [MODULE] Error verificando módulo "${moduleCode}":`, error);
            return false;
        }
    }

    /**
     * Ejecuta una función solo si el módulo está activo
     *
     * @param {number} companyId - ID de la empresa
     * @param {string} moduleCode - Código del módulo
     * @param {Function} callback - Función a ejecutar si el módulo está activo
     * @param {Function|null} fallback - Función alternativa si el módulo está inactivo
     * @returns {Promise<any>} - Resultado de callback o fallback
     */
    async executeIfModuleActive(companyId, moduleCode, callback, fallback = null) {
        const isActive = await this.isModuleActive(companyId, moduleCode);

        if (isActive) {
            console.log(`✅ [MODULE] Módulo "${moduleCode}" activo → Ejecutando`);
            return await callback();
        } else {
            console.log(`⏭️ [MODULE] Módulo "${moduleCode}" inactivo → Saltando`);

            if (fallback) {
                return await fallback();
            }

            return { skipped: true, reason: 'module_not_active', module_code: moduleCode };
        }
    }

    /**
     * Obtiene todos los módulos activos de una empresa
     *
     * @param {number} companyId - ID de la empresa
     * @returns {Promise<Array>} - Lista de módulos activos
     */
    async getActiveModules(companyId) {
        try {
            const result = await db.query(`
                SELECT
                    sm.module_code,
                    sm.module_name,
                    sm.description,
                    sm.category,
                    sm.version,
                    sm.api_endpoints,
                    cm.is_active,
                    cm.licensed_since,
                    cm.license_expires_at,
                    cm.user_limit,
                    cm.usage_count
                FROM system_modules sm
                LEFT JOIN company_modules cm
                    ON sm.module_code = cm.module_code
                    AND cm.company_id = $1
                WHERE
                    sm.is_core = true
                    OR (
                        cm.is_active = true
                        AND (cm.license_expires_at IS NULL OR cm.license_expires_at > NOW())
                    )
                ORDER BY sm.category, sm.module_name
            `, [companyId]);

            return result.rows;

        } catch (error) {
            console.error(`❌ [MODULE] Error obteniendo módulos activos:`, error);
            return [];
        }
    }

    /**
     * Obtiene todos los módulos disponibles (catálogo completo)
     *
     * @returns {Promise<Array>} - Catálogo de módulos
     */
    async getAllModules() {
        try {
            const result = await db.query(`
                SELECT
                    module_code,
                    module_name,
                    description,
                    category,
                    is_core,
                    requires_license,
                    depends_on_modules,
                    optional_for_modules,
                    version
                FROM system_modules
                WHERE active = true
                ORDER BY
                    CASE
                        WHEN is_core = true THEN 1
                        WHEN category = 'premium' THEN 2
                        WHEN category = 'integration' THEN 3
                        ELSE 4
                    END,
                    module_name
            `);

            return result.rows;

        } catch (error) {
            console.error(`❌ [MODULE] Error obteniendo catálogo de módulos:`, error);
            return [];
        }
    }

    /**
     * Activa un módulo para una empresa (contratar módulo)
     *
     * @param {number} companyId - ID de la empresa
     * @param {string} moduleCode - Código del módulo
     * @param {Object} config - Configuración del módulo
     * @param {Date|null} expiresAt - Fecha de expiración de la licencia
     * @param {number|null} userLimit - Límite de usuarios (null = ilimitado)
     * @returns {Promise<Object>} - Módulo activado
     */
    async activateModule(companyId, moduleCode, config = {}, expiresAt = null, userLimit = null) {
        try {
            // Verificar que el módulo existe
            const moduleExists = await db.query(`
                SELECT module_code, is_core
                FROM system_modules
                WHERE module_code = $1
            `, [moduleCode]);

            if (!moduleExists || moduleExists.rows.length === 0) {
                throw new Error(`Módulo "${moduleCode}" no encontrado en catálogo`);
            }

            if (moduleExists.rows[0].is_core) {
                throw new Error(`El módulo "${moduleCode}" es CORE y siempre está activo`);
            }

            // Insertar o actualizar
            const result = await db.query(`
                INSERT INTO company_modules
                (company_id, module_code, is_active, licensed_since, license_expires_at, module_config, user_limit)
                VALUES ($1, $2, true, NOW(), $3, $4, $5)
                ON CONFLICT (company_id, module_code)
                DO UPDATE SET
                    is_active = true,
                    license_expires_at = EXCLUDED.license_expires_at,
                    module_config = EXCLUDED.module_config,
                    user_limit = EXCLUDED.user_limit
                RETURNING *
            `, [companyId, moduleCode, expiresAt, JSON.stringify(config), userLimit]);

            console.log(`✅ [MODULE] Módulo "${moduleCode}" activado para empresa ${companyId}`);

            return result.rows[0];

        } catch (error) {
            console.error(`❌ [MODULE] Error activando módulo:`, error);
            throw error;
        }
    }

    /**
     * Desactiva un módulo para una empresa
     *
     * @param {number} companyId - ID de la empresa
     * @param {string} moduleCode - Código del módulo
     * @returns {Promise<boolean>} - true si se desactivó correctamente
     */
    async deactivateModule(companyId, moduleCode) {
        try {
            const result = await db.query(`
                UPDATE company_modules
                SET is_active = false
                WHERE company_id = $1 AND module_code = $2
                RETURNING *
            `, [companyId, moduleCode]);

            if (result.rows.length === 0) {
                throw new Error(`Módulo "${moduleCode}" no encontrado para empresa ${companyId}`);
            }

            console.log(`⏸️ [MODULE] Módulo "${moduleCode}" desactivado para empresa ${companyId}`);

            return true;

        } catch (error) {
            console.error(`❌ [MODULE] Error desactivando módulo:`, error);
            throw error;
        }
    }

    /**
     * Verifica dependencias de un módulo
     *
     * @param {number} companyId - ID de la empresa
     * @param {string} moduleCode - Código del módulo
     * @returns {Promise<Object>} - Estado de dependencias
     */
    async checkDependencies(companyId, moduleCode) {
        try {
            const result = await db.query(`
                SELECT depends_on_modules
                FROM system_modules
                WHERE module_code = $1
            `, [moduleCode]);

            if (!result || result.rows.length === 0) {
                throw new Error(`Módulo "${moduleCode}" no encontrado`);
            }

            const dependencies = result.rows[0].depends_on_modules || [];

            if (dependencies.length === 0) {
                return { satisfied: true, missing: [] };
            }

            // Verificar cada dependencia
            const missingDependencies = [];

            for (const depCode of dependencies) {
                const isActive = await this.isModuleActive(companyId, depCode);
                if (!isActive) {
                    missingDependencies.push(depCode);
                }
            }

            return {
                satisfied: missingDependencies.length === 0,
                missing: missingDependencies,
                required: dependencies
            };

        } catch (error) {
            console.error(`❌ [MODULE] Error verificando dependencias:`, error);
            throw error;
        }
    }

    /**
     * Incrementa el contador de uso de un módulo
     *
     * @param {number} companyId - ID de la empresa
     * @param {string} moduleCode - Código del módulo
     * @returns {Promise<number>} - Nuevo contador de uso
     */
    async incrementUsage(companyId, moduleCode) {
        try {
            const result = await db.query(`
                UPDATE company_modules
                SET usage_count = usage_count + 1
                WHERE company_id = $1 AND module_code = $2
                RETURNING usage_count, user_limit
            `, [companyId, moduleCode]);

            if (result.rows.length === 0) {
                return 0;
            }

            const { usage_count, user_limit } = result.rows[0];

            // Verificar límite de usuarios
            if (user_limit !== null && usage_count > user_limit) {
                console.warn(`⚠️ [MODULE] Empresa ${companyId} excedió límite de uso del módulo "${moduleCode}" (${usage_count}/${user_limit})`);
            }

            return usage_count;

        } catch (error) {
            console.error(`❌ [MODULE] Error incrementando uso:`, error);
            return 0;
        }
    }

    /**
     * Obtiene información de un módulo para una empresa
     *
     * @param {number} companyId - ID de la empresa
     * @param {string} moduleCode - Código del módulo
     * @returns {Promise<Object>} - Información del módulo
     */
    async getModuleInfo(companyId, moduleCode) {
        try {
            const result = await db.query(`
                SELECT
                    sm.*,
                    cm.is_active,
                    cm.licensed_since,
                    cm.license_expires_at,
                    cm.module_config,
                    cm.user_limit,
                    cm.usage_count
                FROM system_modules sm
                LEFT JOIN company_modules cm
                    ON sm.module_code = cm.module_code
                    AND cm.company_id = $1
                WHERE sm.module_code = $2
            `, [companyId, moduleCode]);

            if (!result || result.rows.length === 0) {
                return null;
            }

            return result.rows[0];

        } catch (error) {
            console.error(`❌ [MODULE] Error obteniendo info del módulo:`, error);
            return null;
        }
    }
}

module.exports = new ModuleService();
