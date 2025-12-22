/**
 * ============================================================================
 * PREREQUISITE CHECKER SERVICE
 * ============================================================================
 * Verifica en tiempo real si un usuario/empresa tiene los prerrequisitos
 * necesarios para ejecutar una acción específica.
 *
 * PARTE DEL SISTEMA NERVIOSO DEL BRAIN
 * ============================================================================
 */

const path = require('path');
const { Pool } = require('pg');

class PrerequisiteChecker {
    constructor(database) {
        this.db = database;
        this.sequelize = database?.sequelize || database;
        this.prerequisites = null;
        this.processes = null;
        this.loadData();
    }

    /**
     * Ejecutar query en la base de datos
     * Convierte $1, $2, etc. a ? para Sequelize
     */
    async query(sql, params = []) {
        if (this.sequelize?.query) {
            // Convertir $1, $2, etc. a ? para Sequelize
            let paramIndex = 0;
            const convertedSql = sql.replace(/\$\d+/g, () => '?');

            const [rows] = await this.sequelize.query(convertedSql, {
                replacements: params,
                type: 'SELECT'
            });
            return { rows: Array.isArray(rows) ? rows : (rows ? [rows] : []) };
        }
        throw new Error('Database no configurada');
    }

    /**
     * Cargar datos de prerrequisitos y procesos
     */
    loadData() {
        try {
            const registryPath = path.join(__dirname, '../../auditor/registry');
            this.prerequisites = require(path.join(registryPath, 'action-prerequisites.json'));
            this.processes = require(path.join(registryPath, 'action-processes.json'));
            console.log(`✅ [PREREQUISITE-CHECKER] Cargados ${this.prerequisites.total_actions} prerrequisitos`);
        } catch (error) {
            console.error('❌ [PREREQUISITE-CHECKER] Error cargando datos:', error.message);
            this.prerequisites = { prerequisites: {} };
            this.processes = { processes: {} };
        }
    }

    /**
     * Obtener lista de todas las acciones disponibles
     */
    getAvailableActions() {
        return Object.keys(this.prerequisites.prerequisites).map(key => ({
            key,
            name: this.prerequisites.prerequisites[key].name,
            requiredModules: this.prerequisites.prerequisites[key].requiredModules || []
        }));
    }

    /**
     * Obtener prerrequisitos de una acción
     */
    getPrerequisites(actionKey) {
        return this.prerequisites.prerequisites[actionKey] || null;
    }

    /**
     * Obtener proceso/pasos de una acción
     */
    getProcess(actionKey) {
        return this.processes.processes[actionKey] || null;
    }

    /**
     * FUNCIÓN PRINCIPAL: Verificar si puede ejecutar una acción
     * @param {string} actionKey - Clave de la acción (ej: 'payroll-request')
     * @param {number} companyId - ID de la empresa
     * @param {string} userId - ID del usuario (opcional)
     * @returns {Object} Resultado de verificación
     */
    async checkPrerequisites(actionKey, companyId, userId = null) {
        const startTime = Date.now();
        const prereq = this.getPrerequisites(actionKey);
        const process = this.getProcess(actionKey);

        if (!prereq) {
            return {
                success: false,
                error: `Acción '${actionKey}' no encontrada`,
                availableActions: this.getAvailableActions().slice(0, 10)
            };
        }

        const result = {
            action: actionKey,
            actionName: prereq.name,
            canProceed: true,
            verified: [],
            missing: [],
            warnings: [],
            modules: {
                required: prereq.requiredModules || [],
                hasRequired: [],
                missingRequired: [],
                alternative: prereq.alternativeModules || null
            },
            process: process ? {
                steps: process.steps,
                estimatedTime: process.estimatedTimeMinutes,
                requiresApproval: process.requiresApproval
            } : null,
            checkedAt: new Date().toISOString(),
            checkDurationMs: 0
        };

        try {
            // 1. Verificar módulos requeridos
            await this.checkRequiredModules(result, companyId);

            // 2. Verificar cadena de prerrequisitos
            if (prereq.requiredChain && prereq.requiredChain.length > 0) {
                await this.checkRequiredChain(result, prereq.requiredChain, companyId, userId);
            }

            // 3. Determinar si puede proceder
            result.canProceed = result.missing.length === 0 && result.modules.missingRequired.length === 0;

            // 4. Si no puede proceder, sugerir alternativas
            if (!result.canProceed && result.modules.alternative) {
                result.alternativeSuggestion = {
                    module: result.modules.alternative.fallback,
                    message: result.modules.alternative.message
                };
            }

            // 5. Generar resumen humano
            result.summary = this.generateSummary(result);

        } catch (error) {
            console.error(`❌ [PREREQUISITE-CHECKER] Error verificando ${actionKey}:`, error);
            result.canProceed = false;
            result.error = error.message;
        }

        result.checkDurationMs = Date.now() - startTime;
        return result;
    }

    /**
     * Verificar si la empresa tiene los módulos requeridos activos
     */
    async checkRequiredModules(result, companyId) {
        if (!result.modules.required || result.modules.required.length === 0) {
            return;
        }

        try {
            // Obtener módulos activos de la empresa
            const query = `
                SELECT active_modules, modules_data
                FROM companies
                WHERE id = $1
            `;
            const { rows } = await this.query(query, [companyId]);

            if (rows.length === 0) {
                result.missing.push({
                    entity: 'company',
                    description: 'Empresa no encontrada',
                    critical: true
                });
                return;
            }

            const company = rows[0];
            let activeModules = [];

            // Parsear módulos activos
            if (company.active_modules) {
                if (typeof company.active_modules === 'string') {
                    try {
                        activeModules = JSON.parse(company.active_modules);
                    } catch (e) {
                        activeModules = company.active_modules.split(',').map(m => m.trim());
                    }
                } else if (Array.isArray(company.active_modules)) {
                    activeModules = company.active_modules;
                }
            }

            // Verificar cada módulo requerido
            for (const requiredModule of result.modules.required) {
                const hasModule = activeModules.some(m =>
                    m === requiredModule ||
                    m.toLowerCase() === requiredModule.toLowerCase() ||
                    m.includes(requiredModule)
                );

                if (hasModule) {
                    result.modules.hasRequired.push(requiredModule);
                    result.verified.push({
                        entity: 'module',
                        name: requiredModule,
                        description: `Módulo ${requiredModule} activo`
                    });
                } else {
                    result.modules.missingRequired.push(requiredModule);
                    result.missing.push({
                        entity: 'module',
                        name: requiredModule,
                        description: `Módulo ${requiredModule} no está contratado`,
                        critical: true,
                        action: 'contact_sales'
                    });
                }
            }

        } catch (error) {
            console.error('[PREREQUISITE-CHECKER] Error verificando módulos:', error);
            result.warnings.push({
                type: 'module_check_failed',
                message: 'No se pudo verificar módulos activos'
            });
        }
    }

    /**
     * Verificar cadena de prerrequisitos (empresa, sucursal, departamento, etc.)
     */
    async checkRequiredChain(result, requiredChain, companyId, userId) {
        for (const requirement of requiredChain) {
            try {
                const check = await this.checkSingleRequirement(requirement, companyId, userId);

                if (check.exists) {
                    result.verified.push({
                        entity: requirement.entity,
                        description: requirement.description,
                        value: check.value,
                        count: check.count
                    });
                } else {
                    result.missing.push({
                        entity: requirement.entity,
                        description: requirement.description,
                        reason: check.reason,
                        critical: this.isCritical(requirement.entity),
                        howToFix: this.getHowToFix(requirement.entity),
                        relatedModule: this.getRelatedModule(requirement.entity)
                    });
                }
            } catch (error) {
                result.warnings.push({
                    entity: requirement.entity,
                    message: `Error verificando: ${error.message}`
                });
            }
        }
    }

    /**
     * Verificar un solo requerimiento
     */
    async checkSingleRequirement(requirement, companyId, userId) {
        const { entity, table, userField } = requirement;

        switch (entity) {
            case 'company':
                return this.checkCompanyExists(companyId);

            case 'branch':
                return this.checkEntityExists('branches', companyId, userId, userField);

            case 'department':
                return this.checkEntityExists('departments', companyId, userId, userField);

            case 'sector':
                return this.checkEntityExists('sectors', companyId, userId, userField);

            case 'shift':
                return this.checkShiftsExist(companyId, userId);

            case 'organizational_position':
                return this.checkOrgPositionExists(companyId, userId);

            default:
                if (table) {
                    return this.checkEntityExists(table, companyId, userId, userField);
                }
                return { exists: true, reason: 'Verificación no implementada' };
        }
    }

    /**
     * Verificar que la empresa existe y está activa
     */
    async checkCompanyExists(companyId) {
        const query = `
            SELECT id, name, is_active
            FROM companies
            WHERE id = $1
        `;
        const { rows } = await this.query(query, [companyId]);

        if (rows.length === 0) {
            return { exists: false, reason: 'Empresa no encontrada' };
        }
        if (!rows[0].is_active) {
            return { exists: false, reason: 'Empresa inactiva' };
        }
        return { exists: true, value: rows[0].name };
    }

    /**
     * Verificar que existen registros en una tabla para la empresa
     */
    async checkEntityExists(table, companyId, userId, userField) {
        // Primero verificar si existen registros para la empresa
        const countQuery = `
            SELECT COUNT(*) as count
            FROM ${table}
            WHERE company_id = $1
        `;
        const { rows: countRows } = await this.query(countQuery, [companyId]);
        const count = parseInt(countRows[0].count);

        if (count === 0) {
            return {
                exists: false,
                reason: `No hay ${this.getEntityName(table)} configurados`,
                count: 0
            };
        }

        // Si hay usuario, verificar que tiene asignado
        if (userId && userField) {
            const userQuery = `
                SELECT ${userField}
                FROM users
                WHERE id = $1 AND company_id = $2
            `;
            const { rows: userRows } = await this.query(userQuery, [userId, companyId]);

            if (userRows.length > 0 && !userRows[0][userField]) {
                return {
                    exists: false,
                    reason: `Usuario no tiene ${this.getEntityName(table)} asignado`,
                    count
                };
            }
        }

        return { exists: true, count };
    }

    /**
     * Verificar turnos
     */
    async checkShiftsExist(companyId, userId) {
        const query = `
            SELECT COUNT(*) as count
            FROM shifts
            WHERE company_id = $1 AND is_active = true
        `;
        const { rows } = await this.query(query, [companyId]);
        const count = parseInt(rows[0].count);

        if (count === 0) {
            return {
                exists: false,
                reason: 'No hay turnos configurados',
                count: 0
            };
        }

        return { exists: true, count };
    }

    /**
     * Verificar posición en organigrama
     */
    async checkOrgPositionExists(companyId, userId) {
        // Verificar si hay estructura organizacional
        const query = `
            SELECT COUNT(*) as count
            FROM organizational_structure
            WHERE company_id = $1
        `;

        try {
            const { rows } = await this.query(query, [companyId]);
            const count = parseInt(rows[0].count);

            if (count === 0) {
                return {
                    exists: false,
                    reason: 'No hay estructura organizacional configurada',
                    count: 0
                };
            }

            return { exists: true, count };
        } catch (error) {
            // Tabla puede no existir
            return {
                exists: true,
                reason: 'Estructura organizacional opcional'
            };
        }
    }

    /**
     * Determinar si un prerrequisito es crítico
     */
    isCritical(entity) {
        const critical = ['company', 'module'];
        return critical.includes(entity);
    }

    /**
     * Obtener instrucciones de cómo solucionar
     */
    getHowToFix(entity) {
        const fixes = {
            'company': 'Contactar a soporte para activar la empresa',
            'branch': 'Ir a Configuración → Sucursales → Crear sucursal',
            'department': 'Ir a Configuración → Departamentos → Crear departamento',
            'sector': 'Ir a Configuración → Sectores → Crear sector',
            'shift': 'Ir a Configuración → Turnos → Crear turno',
            'organizational_position': 'Ir a RRHH → Organigrama → Configurar estructura',
            'module': 'Contactar a ventas para contratar el módulo'
        };
        return fixes[entity] || 'Configurar en el panel de administración';
    }

    /**
     * Obtener módulo relacionado con una entidad
     */
    getRelatedModule(entity) {
        const modules = {
            'branch': 'branches',
            'department': 'departments',
            'sector': 'organizational-structure',
            'shift': 'shifts',
            'organizational_position': 'organizational-structure'
        };
        return modules[entity] || null;
    }

    /**
     * Obtener nombre legible de una tabla
     */
    getEntityName(table) {
        const names = {
            'branches': 'sucursales',
            'departments': 'departamentos',
            'sectors': 'sectores',
            'shifts': 'turnos',
            'organizational_structure': 'posiciones organizacionales'
        };
        return names[table] || table;
    }

    /**
     * Generar resumen legible para humanos
     */
    generateSummary(result) {
        if (result.canProceed) {
            return {
                status: 'ready',
                emoji: '✅',
                title: '¡Todo listo!',
                message: `Puedes ejecutar "${result.actionName}". Todos los prerrequisitos están cumplidos.`,
                nextSteps: result.process ? result.process.steps.slice(0, 3) : []
            };
        }

        const criticalMissing = result.missing.filter(m => m.critical);
        const nonCriticalMissing = result.missing.filter(m => !m.critical);

        if (criticalMissing.length > 0) {
            return {
                status: 'blocked',
                emoji: '🚫',
                title: 'Acción bloqueada',
                message: `No puedes ejecutar "${result.actionName}" porque faltan prerrequisitos críticos.`,
                criticalIssues: criticalMissing.map(m => ({
                    issue: m.description,
                    fix: m.howToFix
                })),
                alternative: result.alternativeSuggestion
            };
        }

        // canProceed=false pero sin críticos = configuraciones faltantes
        return {
            status: 'incomplete',
            emoji: '⚠️',
            title: 'Configuración incompleta',
            message: `No puedes ejecutar "${result.actionName}" porque faltan configuraciones.`,
            missingConfigs: nonCriticalMissing.map(m => ({
                issue: m.description,
                fix: m.howToFix,
                module: m.relatedModule
            })),
            hint: 'Completa las configuraciones faltantes para habilitar esta acción.'
        };
    }

    /**
     * Verificar múltiples acciones a la vez
     */
    async checkMultipleActions(actionKeys, companyId, userId = null) {
        const results = {};
        for (const actionKey of actionKeys) {
            results[actionKey] = await this.checkPrerequisites(actionKey, companyId, userId);
        }
        return results;
    }

    /**
     * Obtener todas las acciones que el usuario puede ejecutar
     */
    async getAvailableActionsForUser(companyId, userId = null) {
        const allActions = this.getAvailableActions();
        const available = [];
        const blocked = [];

        for (const action of allActions) {
            const check = await this.checkPrerequisites(action.key, companyId, userId);
            if (check.canProceed) {
                available.push({
                    ...action,
                    process: check.process
                });
            } else {
                blocked.push({
                    ...action,
                    reason: check.summary?.message || 'Prerrequisitos no cumplidos',
                    missing: check.missing
                });
            }
        }

        return { available, blocked };
    }
}

module.exports = PrerequisiteChecker;
