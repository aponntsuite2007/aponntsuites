/**
 * RBACService - Servicio Unificado de Roles, Permisos y Control de Acceso
 *
 * SSOT (Single Source of Truth) para:
 * - Roles del sistema (legacy + nuevo sistema)
 * - Posiciones organizacionales
 * - Permisos por módulo
 * - Segmentación de riesgo por tipo de trabajo
 * - Umbrales dinámicos (cuartiles, benchmarks)
 *
 * @version 2.0.0 - RBAC Unified SSOT
 * @date 2025-12-07
 */

const {
    User,
    OrganizationalPosition,
    RiskBenchmark,
    CompanyRiskConfig,
    Company,
    sequelize
} = require('../config/database');
const { Op } = require('sequelize');

class RBACService {
    // =========================================================================
    // CONSTANTES Y CONFIGURACIÓN
    // =========================================================================

    // Jerarquía de roles del sistema (legacy, mantener compatibilidad)
    static ROLE_HIERARCHY = {
        employee: 1,
        supervisor: 2,
        manager: 3,
        admin: 4,
        super_admin: 5,
        vendor: 0  // Rol especial, no en jerarquía
    };

    // Mapeo de roles a categorías de trabajo por defecto
    static ROLE_TO_CATEGORY = {
        employee: 'operativo',
        supervisor: 'tecnico',
        manager: 'gerencial',
        admin: 'administrativo',
        super_admin: 'gerencial',
        vendor: 'comercial'
    };

    // Permisos base por rol (legacy, mantener compatibilidad)
    static BASE_PERMISSIONS = {
        employee: ['attendance_self', 'profile_view', 'notifications_view'],
        supervisor: ['attendance_view', 'attendance_approve', 'team_view', 'reports_team'],
        manager: ['attendance_manage', 'users_view', 'reports_department', 'vacations_approve'],
        admin: ['*'],
        super_admin: ['*'],
        vendor: ['vendor_dashboard', 'auctions_view', 'commissions_view']
    };

    // =========================================================================
    // GESTIÓN DE USUARIOS Y POSICIONES
    // =========================================================================

    /**
     * Obtiene información completa de RBAC de un usuario
     */
    static async getUserRBAC(userId, companyId) {
        try {
            const user = await User.findOne({
                where: { user_id: userId, company_id: companyId },
                include: [
                    {
                        model: OrganizationalPosition,
                        as: 'organizationalPosition',
                        required: false
                    }
                ]
            });

            if (!user) {
                return null;
            }

            // Obtener configuración de riesgo de la empresa
            const riskConfig = await CompanyRiskConfig.findOne({
                where: { company_id: companyId }
            });

            // Calcular permisos efectivos
            const effectivePermissions = this.calculateEffectivePermissions(user);

            // Obtener umbrales efectivos para el usuario
            const thresholds = await this.getEffectiveThresholds(user, riskConfig);

            return {
                user_id: user.user_id,
                employee_id: user.employeeId,
                display_name: user.displayName || `${user.firstName} ${user.lastName}`,

                // Rol del sistema
                system_role: user.role,
                role_level: this.ROLE_HIERARCHY[user.role] || 0,

                // Posición organizacional (SSOT)
                position: user.organizationalPosition ? {
                    id: user.organizationalPosition.id,
                    code: user.organizationalPosition.position_code,
                    name: user.organizationalPosition.position_name,
                    level: user.organizationalPosition.level_order,
                    work_category: user.organizationalPosition.work_category,
                    work_environment: user.organizationalPosition.work_environment,
                    physical_demand: user.organizationalPosition.physical_demand_level,
                    cognitive_demand: user.organizationalPosition.cognitive_demand_level,
                    risk_exposure: user.organizationalPosition.risk_exposure_level,
                    applies_accident_risk: user.organizationalPosition.applies_accident_risk,
                    applies_fatigue_index: user.organizationalPosition.applies_fatigue_index,
                    ciuo_code: user.organizationalPosition.international_code_ciuo
                } : null,

                // Permisos
                permissions: effectivePermissions,
                additional_roles: user.additionalRoles || [],

                // Configuración de riesgo
                risk_config: {
                    thresholds: thresholds,
                    weights: user.organizationalPosition?.custom_risk_weights || riskConfig?.global_weights || null,
                    method: riskConfig?.threshold_method || 'manual',
                    segmentation_enabled: riskConfig?.enable_segmentation || false
                }
            };
        } catch (error) {
            console.error('[RBACService] Error getting user RBAC:', error);
            throw error;
        }
    }

    /**
     * Calcula permisos efectivos del usuario
     */
    static calculateEffectivePermissions(user) {
        const permissions = new Set();

        // 1. Agregar permisos base del rol
        const basePerms = this.BASE_PERMISSIONS[user.role] || [];
        basePerms.forEach(p => permissions.add(p));

        // 2. Si tiene herencia de rol, agregar permisos heredados
        const roleLevel = this.ROLE_HIERARCHY[user.role] || 0;
        Object.entries(this.ROLE_HIERARCHY).forEach(([role, level]) => {
            if (level < roleLevel && role !== 'vendor') {
                const inheritedPerms = this.BASE_PERMISSIONS[role] || [];
                inheritedPerms.forEach(p => permissions.add(p));
            }
        });

        // 3. Agregar permisos custom del usuario
        if (user.permissions && typeof user.permissions === 'object') {
            Object.entries(user.permissions).forEach(([key, value]) => {
                if (value === true) {
                    permissions.add(key);
                }
            });
        }

        // 4. Agregar permisos de roles adicionales
        if (Array.isArray(user.additionalRoles)) {
            user.additionalRoles.forEach(role => {
                if (role.isActive && role.permissions) {
                    role.permissions.forEach(p => permissions.add(p));
                }
            });
        }

        return Array.from(permissions);
    }

    /**
     * Verifica si un usuario tiene un permiso específico
     */
    static async hasPermission(userId, companyId, permission) {
        const rbac = await this.getUserRBAC(userId, companyId);
        if (!rbac) return false;

        // Super admin y admin tienen todos los permisos
        if (rbac.permissions.includes('*')) return true;

        return rbac.permissions.includes(permission);
    }

    /**
     * Verifica si un usuario puede acceder a un módulo
     */
    static async canAccessModule(userId, companyId, moduleKey) {
        const rbac = await this.getUserRBAC(userId, companyId);
        if (!rbac) return false;

        // Super admin y admin pueden acceder a todo
        if (rbac.permissions.includes('*')) return true;

        // Verificar permiso específico del módulo
        const modulePermission = `${moduleKey}_access`;
        return rbac.permissions.includes(modulePermission);
    }

    /**
     * Asigna una posición organizacional a un usuario
     */
    static async assignPosition(userId, positionId, companyId, updatedBy = null) {
        const transaction = await sequelize.transaction();

        try {
            const user = await User.findOne({
                where: { user_id: userId, company_id: companyId },
                transaction
            });

            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            const position = await OrganizationalPosition.findOne({
                where: { id: positionId, company_id: companyId, is_active: true },
                transaction
            });

            if (!position) {
                throw new Error('Posición organizacional no encontrada');
            }

            // Actualizar usuario
            await user.update({
                organizationalPositionId: positionId,
                position: position.position_name  // Sincronizar campo legacy
            }, { transaction });

            await transaction.commit();

            console.log(`[RBACService] Posición ${position.position_code} asignada a usuario ${userId}`);

            return {
                success: true,
                user_id: userId,
                position_id: positionId,
                position_name: position.position_name,
                work_category: position.work_category
            };
        } catch (error) {
            await transaction.rollback();
            console.error('[RBACService] Error assigning position:', error);
            throw error;
        }
    }

    // =========================================================================
    // GESTIÓN DE UMBRALES DE RIESGO (SEGMENTACIÓN)
    // =========================================================================

    /**
     * Obtiene umbrales efectivos para un usuario según método configurado
     */
    static async getEffectiveThresholds(user, riskConfig) {
        if (!riskConfig) {
            // Si no hay config, usar defaults
            return {
                fatigue: { low: 30, medium: 50, high: 70, critical: 85 },
                accident: { low: 30, medium: 50, high: 70, critical: 85 },
                legal_claim: { low: 30, medium: 50, high: 70, critical: 85 },
                performance: { low: 30, medium: 50, high: 70, critical: 85 },
                turnover: { low: 30, medium: 50, high: 70, critical: 85 }
            };
        }

        // Si la posición tiene umbrales custom, usarlos
        if (user.organizationalPosition?.custom_thresholds) {
            return user.organizationalPosition.custom_thresholds;
        }

        const method = riskConfig.threshold_method;
        const workCategory = user.organizationalPosition?.work_category || 'administrativo';

        switch (method) {
            case 'manual':
                return riskConfig.global_thresholds;

            case 'quartile':
                return this.getQuartileThresholds(riskConfig, workCategory);

            case 'benchmark':
                return await this.getBenchmarkThresholds(workCategory);

            case 'hybrid':
                return await this.getHybridThresholds(riskConfig, workCategory);

            default:
                return riskConfig.global_thresholds;
        }
    }

    /**
     * Obtiene umbrales basados en cuartiles calculados
     */
    static getQuartileThresholds(riskConfig, workCategory) {
        const quartiles = riskConfig.calculated_quartiles;
        if (!quartiles) return riskConfig.global_thresholds;

        // Si hay segmentación y cuartiles por categoría
        if (riskConfig.enable_segmentation && quartiles.by_category?.[workCategory]) {
            const categoryQ = quartiles.by_category[workCategory];
            return {
                fatigue: { low: categoryQ.fatigue?.q1 || 25, medium: categoryQ.fatigue?.q2 || 50, high: categoryQ.fatigue?.q3 || 75, critical: 90 },
                accident: { low: categoryQ.accident?.q1 || 25, medium: categoryQ.accident?.q2 || 50, high: categoryQ.accident?.q3 || 75, critical: 90 },
                legal_claim: { low: categoryQ.legal_claim?.q1 || 25, medium: categoryQ.legal_claim?.q2 || 50, high: categoryQ.legal_claim?.q3 || 75, critical: 90 },
                performance: riskConfig.global_thresholds.performance,
                turnover: riskConfig.global_thresholds.turnover
            };
        }

        // Cuartiles globales
        if (quartiles.global) {
            return {
                fatigue: { low: quartiles.global.fatigue?.q1 || 25, medium: quartiles.global.fatigue?.q2 || 50, high: quartiles.global.fatigue?.q3 || 75, critical: 90 },
                accident: { low: quartiles.global.accident?.q1 || 25, medium: quartiles.global.accident?.q2 || 50, high: quartiles.global.accident?.q3 || 75, critical: 90 },
                legal_claim: { low: quartiles.global.legal_claim?.q1 || 25, medium: quartiles.global.legal_claim?.q2 || 50, high: quartiles.global.legal_claim?.q3 || 75, critical: 90 },
                performance: riskConfig.global_thresholds.performance,
                turnover: riskConfig.global_thresholds.turnover
            };
        }

        return riskConfig.global_thresholds;
    }

    /**
     * Obtiene umbrales basados en benchmarks internacionales
     */
    static async getBenchmarkThresholds(workCategory) {
        try {
            const benchmark = await RiskBenchmark.findOne({
                where: {
                    work_category: workCategory,
                    is_active: true
                }
            });

            if (!benchmark) {
                // Fallback a benchmark general
                return {
                    fatigue: { low: 30, medium: 50, high: 70, critical: 85 },
                    accident: { low: 30, medium: 50, high: 70, critical: 85 },
                    legal_claim: { low: 30, medium: 50, high: 70, critical: 85 },
                    performance: { low: 30, medium: 50, high: 70, critical: 85 },
                    turnover: { low: 30, medium: 50, high: 70, critical: 85 }
                };
            }

            return {
                fatigue: {
                    low: parseFloat(benchmark.fatigue_p25) || 25,
                    medium: parseFloat(benchmark.fatigue_p50) || 50,
                    high: parseFloat(benchmark.fatigue_p75) || 75,
                    critical: parseFloat(benchmark.fatigue_p90) || 90
                },
                accident: {
                    low: parseFloat(benchmark.accident_p25) || 25,
                    medium: parseFloat(benchmark.accident_p50) || 50,
                    high: parseFloat(benchmark.accident_p75) || 75,
                    critical: parseFloat(benchmark.accident_p90) || 90
                },
                legal_claim: {
                    low: parseFloat(benchmark.legal_claim_p25) || 25,
                    medium: parseFloat(benchmark.legal_claim_p50) || 50,
                    high: parseFloat(benchmark.legal_claim_p75) || 75,
                    critical: parseFloat(benchmark.legal_claim_p90) || 90
                },
                turnover: {
                    low: parseFloat(benchmark.turnover_p25) || 25,
                    medium: parseFloat(benchmark.turnover_p50) || 50,
                    high: parseFloat(benchmark.turnover_p75) || 75,
                    critical: parseFloat(benchmark.turnover_p90) || 90
                },
                performance: { low: 30, medium: 50, high: 70, critical: 85 }
            };
        } catch (error) {
            console.error('[RBACService] Error getting benchmark thresholds:', error);
            return {
                fatigue: { low: 30, medium: 50, high: 70, critical: 85 },
                accident: { low: 30, medium: 50, high: 70, critical: 85 },
                legal_claim: { low: 30, medium: 50, high: 70, critical: 85 },
                performance: { low: 30, medium: 50, high: 70, critical: 85 },
                turnover: { low: 30, medium: 50, high: 70, critical: 85 }
            };
        }
    }

    /**
     * Obtiene umbrales híbridos (combinación ponderada)
     */
    static async getHybridThresholds(riskConfig, workCategory) {
        const weights = riskConfig.hybrid_weights || { manual: 0.3, quartile: 0.4, benchmark: 0.3 };

        const manual = riskConfig.global_thresholds;
        const quartile = this.getQuartileThresholds(riskConfig, workCategory);
        const benchmark = await this.getBenchmarkThresholds(workCategory);

        const indices = ['fatigue', 'accident', 'legal_claim', 'turnover'];
        const levels = ['low', 'medium', 'high', 'critical'];
        const result = {};

        for (const index of indices) {
            result[index] = {};
            for (const level of levels) {
                result[index][level] = Math.round(
                    (manual[index]?.[level] || 50) * weights.manual +
                    (quartile[index]?.[level] || 50) * weights.quartile +
                    (benchmark[index]?.[level] || 50) * weights.benchmark
                );
            }
        }

        result.performance = manual.performance;

        return result;
    }

    // =========================================================================
    // CÁLCULO DE CUARTILES
    // =========================================================================

    /**
     * Recalcula cuartiles de riesgo para una empresa
     */
    static async recalculateQuartiles(companyId) {
        try {
            // Usar función PostgreSQL si existe, sino calcular en JS
            const result = await sequelize.query(
                `SELECT calculate_company_risk_quartiles($1) as quartiles`,
                {
                    bind: [companyId],
                    type: sequelize.QueryTypes.SELECT
                }
            );

            if (result?.[0]?.quartiles) {
                return result[0].quartiles;
            }

            // Fallback: calcular en JavaScript
            return await this.calculateQuartilesJS(companyId);
        } catch (error) {
            console.error('[RBACService] Error recalculating quartiles:', error);
            // Fallback: calcular en JavaScript
            return await this.calculateQuartilesJS(companyId);
        }
    }

    /**
     * Calcula cuartiles en JavaScript (fallback)
     */
    static async calculateQuartilesJS(companyId) {
        // Implementación simplificada - en producción usar datos reales
        const now = new Date();

        const quartiles = {
            global: {
                fatigue: { q1: 25, q2: 45, q3: 65 },
                accident: { q1: 20, q2: 40, q3: 60 },
                legal_claim: { q1: 25, q2: 45, q3: 65 }
            },
            calculated_at: now,
            employee_count: 0
        };

        // Actualizar config de la empresa
        await CompanyRiskConfig.update(
            {
                calculated_quartiles: quartiles,
                last_quartile_calculation: now
            },
            { where: { company_id: companyId } }
        );

        return quartiles;
    }

    // =========================================================================
    // GESTIÓN DE POSICIONES ORGANIZACIONALES
    // =========================================================================

    /**
     * Obtiene todas las posiciones de una empresa
     */
    static async getCompanyPositions(companyId) {
        return await OrganizationalPosition.findAll({
            where: { company_id: companyId, is_active: true },
            order: [['level_order', 'DESC'], ['position_name', 'ASC']]
        });
    }

    /**
     * Crea una nueva posición organizacional
     */
    static async createPosition(companyId, positionData) {
        return await OrganizationalPosition.create({
            company_id: companyId,
            ...positionData
        });
    }

    /**
     * Actualiza una posición existente
     */
    static async updatePosition(positionId, companyId, updates) {
        const position = await OrganizationalPosition.findOne({
            where: { id: positionId, company_id: companyId }
        });

        if (!position) {
            throw new Error('Posición no encontrada');
        }

        return await position.update(updates);
    }

    /**
     * Obtiene usuarios por categoría de trabajo
     */
    static async getUsersByWorkCategory(companyId, workCategory) {
        return await User.findAll({
            where: { company_id: companyId, is_active: true },
            include: [
                {
                    model: OrganizationalPosition,
                    as: 'organizationalPosition',
                    where: { work_category: workCategory },
                    required: true
                }
            ]
        });
    }

    // =========================================================================
    // GESTIÓN DE CONFIGURACIÓN DE RIESGO
    // =========================================================================

    /**
     * Obtiene o crea configuración de riesgo para una empresa
     */
    static async getOrCreateRiskConfig(companyId) {
        const [config, created] = await CompanyRiskConfig.findOrCreate({
            where: { company_id: companyId },
            defaults: {
                threshold_method: 'manual',
                enable_segmentation: false
            }
        });

        if (created) {
            console.log(`[RBACService] Configuración de riesgo creada para empresa ${companyId}`);
        }

        return config;
    }

    /**
     * Actualiza configuración de riesgo de una empresa
     */
    static async updateRiskConfig(companyId, updates, updatedBy = null) {
        const config = await this.getOrCreateRiskConfig(companyId);

        return await config.update({
            ...updates,
            updated_by: updatedBy
        });
    }

    /**
     * Cambia el método de cálculo de umbrales
     */
    static async setThresholdMethod(companyId, method, hybridWeights = null, updatedBy = null) {
        const validMethods = ['manual', 'quartile', 'benchmark', 'hybrid'];
        if (!validMethods.includes(method)) {
            throw new Error(`Método inválido. Opciones: ${validMethods.join(', ')}`);
        }

        const updates = { threshold_method: method };

        if (method === 'hybrid' && hybridWeights) {
            updates.hybrid_weights = hybridWeights;
        }

        return await this.updateRiskConfig(companyId, updates, updatedBy);
    }

    /**
     * Habilita/deshabilita segmentación por tipo de trabajo
     */
    static async setSegmentation(companyId, enabled, updatedBy = null) {
        return await this.updateRiskConfig(companyId, {
            enable_segmentation: enabled
        }, updatedBy);
    }

    // =========================================================================
    // BENCHMARKS
    // =========================================================================

    /**
     * Obtiene todos los benchmarks disponibles
     */
    static async getAllBenchmarks() {
        return await RiskBenchmark.findAll({
            where: { is_active: true },
            order: [['work_category', 'ASC'], ['benchmark_name', 'ASC']]
        });
    }

    /**
     * Obtiene benchmark por categoría de trabajo
     */
    static async getBenchmarkByCategory(workCategory, countryCode = 'ARG') {
        return await RiskBenchmark.findOne({
            where: {
                work_category: workCategory,
                country_code: countryCode,
                is_active: true
            }
        });
    }

    // =========================================================================
    // ESTADÍSTICAS Y REPORTES
    // =========================================================================

    /**
     * Obtiene estadísticas de RBAC para una empresa
     */
    static async getCompanyRBACStats(companyId) {
        const users = await User.findAll({
            where: { company_id: companyId, is_active: true },
            include: [{
                model: OrganizationalPosition,
                as: 'organizationalPosition',
                required: false
            }]
        });

        const stats = {
            total_users: users.length,
            users_with_position: 0,
            users_without_position: 0,
            by_role: {},
            by_work_category: {},
            by_risk_exposure: { low: 0, medium: 0, high: 0, very_high: 0 }
        };

        users.forEach(user => {
            // Por rol
            stats.by_role[user.role] = (stats.by_role[user.role] || 0) + 1;

            if (user.organizationalPosition) {
                stats.users_with_position++;

                // Por categoría de trabajo
                const cat = user.organizationalPosition.work_category;
                stats.by_work_category[cat] = (stats.by_work_category[cat] || 0) + 1;

                // Por nivel de exposición al riesgo
                const riskLevel = user.organizationalPosition.risk_exposure_level;
                if (riskLevel <= 2) stats.by_risk_exposure.low++;
                else if (riskLevel === 3) stats.by_risk_exposure.medium++;
                else if (riskLevel === 4) stats.by_risk_exposure.high++;
                else stats.by_risk_exposure.very_high++;
            } else {
                stats.users_without_position++;
            }
        });

        return stats;
    }
}

module.exports = RBACService;
