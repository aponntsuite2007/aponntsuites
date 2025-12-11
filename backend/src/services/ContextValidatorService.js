/**
 * ============================================================================
 * CONTEXT VALIDATOR SERVICE - Validación de Prerequisitos & Blockchain
 * ============================================================================
 *
 * Valida si un usuario tiene TODA la cadena de prerequisitos necesaria
 * para realizar una acción específica.
 *
 * Ejemplo: Para pedir cambio de turno, el usuario DEBE tener:
 * - ✅ Sucursal asignada (branch)
 * - ✅ Departamento asignado (department)
 * - ✅ Sector asignado (sector)
 * - ✅ Posición en organigrama (organizational_structure)
 * - ✅ Turno asignado (shift)
 * - ✅ Calendario asociado a su turno (shift_calendar)
 *
 * Si falta CUALQUIER elemento de la cadena, NO puede realizar la acción.
 *
 * @version 1.0.0
 * @date 2025-12-10
 * ============================================================================
 */

const { QueryTypes } = require('sequelize');

class ContextValidatorService {
    constructor(sequelize) {
        this.db = sequelize;

        // DEFINICIÓN DE PREREQUISITOS POR ACCIÓN
        this.actionPrerequisites = {
            'shift-swap': {
                name: 'Cambio de Turno',
                requiredChain: [
                    { entity: 'company', field: 'id', description: 'Empresa activa' },
                    { entity: 'branch', field: 'id', description: 'Sucursal asignada', table: 'branches', userField: 'branch_id' },
                    { entity: 'department', field: 'id', description: 'Departamento asignado', table: 'departments', userField: 'department_id' },
                    { entity: 'sector', field: 'id', description: 'Sector asignado', table: 'sectors', userField: 'sector_id' },
                    { entity: 'organizational_position', field: 'id', description: 'Posición en organigrama', table: 'organizational_structure', userField: 'position_id' },
                    { entity: 'shift', field: 'id', description: 'Turno asignado', table: 'shifts', userField: 'shift_id' },
                    { entity: 'shift_calendar', field: 'id', description: 'Calendario de turno', table: 'shift_calendars', joinOn: 'shift_id' }
                ],
                requiredModules: ['shifts', 'organizational-structure'],
                optionalModules: ['notifications-enterprise']
            },

            'vacation-request': {
                name: 'Solicitud de Vacaciones',
                requiredChain: [
                    { entity: 'company', field: 'id', description: 'Empresa activa' },
                    { entity: 'branch', field: 'id', description: 'Sucursal asignada', table: 'branches', userField: 'branch_id' },
                    { entity: 'department', field: 'id', description: 'Departamento asignado', table: 'departments', userField: 'department_id' },
                    { entity: 'organizational_position', field: 'id', description: 'Posición en organigrama (para saber a quién reporta)', table: 'organizational_structure', userField: 'position_id' }
                ],
                requiredModules: ['vacation-management'],
                alternativeModules: {
                    fallback: 'notifications-enterprise',
                    message: 'Su empresa no tiene contratado el módulo de Gestión de Vacaciones. Puede usar el sistema de Notificaciones para enviar su solicitud.'
                }
            },

            'time-off-request': {
                name: 'Solicitud de Ausencia',
                requiredChain: [
                    { entity: 'company', field: 'id', description: 'Empresa activa' },
                    { entity: 'department', field: 'id', description: 'Departamento asignado', table: 'departments', userField: 'department_id' },
                    { entity: 'organizational_position', field: 'id', description: 'Posición en organigrama', table: 'organizational_structure', userField: 'position_id' }
                ],
                requiredModules: [],
                alternativeModules: {
                    fallback: 'notifications-enterprise',
                    message: 'Puede enviar su solicitud de ausencia mediante el sistema de Notificaciones.'
                }
            },

            'overtime-request': {
                name: 'Solicitud de Horas Extra',
                requiredChain: [
                    { entity: 'company', field: 'id', description: 'Empresa activa' },
                    { entity: 'branch', field: 'id', description: 'Sucursal asignada', table: 'branches', userField: 'branch_id' },
                    { entity: 'department', field: 'id', description: 'Departamento asignado', table: 'departments', userField: 'department_id' },
                    { entity: 'shift', field: 'id', description: 'Turno asignado', table: 'shifts', userField: 'shift_id' }
                ],
                requiredModules: ['attendance', 'overtime-management'],
                optionalModules: ['payroll-liquidation']
            },

            'medical-appointment': {
                name: 'Turno Médico',
                requiredChain: [
                    { entity: 'company', field: 'id', description: 'Empresa activa' },
                    { entity: 'branch', field: 'id', description: 'Sucursal asignada (ubicación del servicio médico)', table: 'branches', userField: 'branch_id' }
                ],
                requiredModules: ['medical-service'],
                optionalModules: []
            }
        };
    }

    /**
     * Valida si un usuario cumple TODOS los prerequisitos para una acción
     */
    async validateUserContext(userId, companyId, actionKey) {
        console.log(`\n🔍 [CONTEXT VALIDATOR] Validando contexto para acción: ${actionKey}`);
        console.log(`   Usuario ID: ${userId} | Empresa ID: ${companyId}\n`);

        const action = this.actionPrerequisites[actionKey];
        if (!action) {
            return {
                valid: false,
                action: null,
                error: `Acción "${actionKey}" no está definida en el sistema`
            };
        }

        const validation = {
            action: action.name,
            valid: true,
            missingPrerequisites: [],
            fulfilledPrerequisites: [],
            missingModules: [],
            availableAlternatives: null,
            userData: {}
        };

        try {
            // 1. OBTENER DATOS DEL USUARIO
            const user = await this.db.query(
                `SELECT u.*, c.name as company_name, c.active_modules
                 FROM users u
                 JOIN companies c ON c.company_id = u.company_id
                 WHERE u.user_id = :userId AND u.company_id = :companyId`,
                {
                    replacements: { userId, companyId },
                    type: QueryTypes.SELECT
                }
            );

            if (!user || user.length === 0) {
                return {
                    valid: false,
                    error: 'Usuario no encontrado o no pertenece a esta empresa'
                };
            }

            const userData = user[0];
            validation.userData = {
                id: userData.id,
                username: userData.username,
                company: userData.company_name,
                role: userData.role
            };

            // 2. VALIDAR CADENA DE PREREQUISITOS
            for (const prereq of action.requiredChain) {
                const checkResult = await this.checkPrerequisite(userData, prereq);

                if (checkResult.fulfilled) {
                    validation.fulfilledPrerequisites.push({
                        entity: prereq.entity,
                        description: prereq.description,
                        value: checkResult.value
                    });
                } else {
                    validation.valid = false;
                    validation.missingPrerequisites.push({
                        entity: prereq.entity,
                        description: prereq.description,
                        reason: checkResult.reason,
                        howToFix: checkResult.howToFix
                    });
                }
            }

            // 3. VALIDAR MÓDULOS REQUERIDOS
            const activeModules = this.parseActiveModules(userData.active_modules);

            for (const requiredModule of action.requiredModules) {
                if (!activeModules.includes(requiredModule)) {
                    validation.missingModules.push(requiredModule);

                    // Si hay alternativa, sugerirla
                    if (action.alternativeModules && action.alternativeModules.fallback) {
                        if (activeModules.includes(action.alternativeModules.fallback)) {
                            validation.availableAlternatives = {
                                module: action.alternativeModules.fallback,
                                message: action.alternativeModules.message
                            };
                        }
                    }
                }
            }

            // Si faltan módulos requeridos y no hay alternativa, no es válido
            if (validation.missingModules.length > 0 && !validation.availableAlternatives) {
                validation.valid = false;
            }

            return validation;

        } catch (error) {
            console.error('❌ Error validando contexto:', error.message);
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Verifica un prerequisito individual
     */
    async checkPrerequisite(userData, prereq) {
        try {
            // Caso especial: company siempre se cumple si el usuario existe
            if (prereq.entity === 'company') {
                return {
                    fulfilled: true,
                    value: { id: userData.company_id, name: userData.company_name }
                };
            }

            // Obtener el valor del campo del usuario
            const userValue = userData[prereq.userField];

            if (!userValue || userValue === null) {
                return {
                    fulfilled: false,
                    reason: `Usuario no tiene ${prereq.description} asignado`,
                    howToFix: `Contactar a RRHH para asignar ${prereq.description}`
                };
            }

            // Verificar que el registro existe en la tabla correspondiente
            if (prereq.table) {
                const exists = await this.db.query(
                    `SELECT id, name FROM ${prereq.table} WHERE id = :value AND company_id = :companyId LIMIT 1`,
                    {
                        replacements: { value: userValue, companyId: userData.company_id },
                        type: QueryTypes.SELECT
                    }
                );

                if (!exists || exists.length === 0) {
                    return {
                        fulfilled: false,
                        reason: `${prereq.description} asignado no existe en el sistema`,
                        howToFix: `El ${prereq.description} con ID ${userValue} fue eliminado. Contactar a RRHH para reasignación`
                    };
                }

                return {
                    fulfilled: true,
                    value: { id: exists[0].id, name: exists[0].name }
                };
            }

            return {
                fulfilled: true,
                value: userValue
            };

        } catch (error) {
            console.error(`Error verificando prerequisito ${prereq.entity}:`, error.message);
            return {
                fulfilled: false,
                reason: `Error del sistema al verificar ${prereq.description}`,
                howToFix: 'Contactar soporte técnico'
            };
        }
    }

    /**
     * Parsea active_modules (puede ser JSON o string)
     */
    parseActiveModules(activeModules) {
        if (!activeModules) return [];

        if (typeof activeModules === 'string') {
            try {
                return JSON.parse(activeModules);
            } catch (e) {
                return activeModules.split(',').map(m => m.trim());
            }
        }

        if (Array.isArray(activeModules)) {
            return activeModules;
        }

        return [];
    }

    /**
     * Obtiene todas las acciones disponibles y sus estados para un usuario
     */
    async getUserAvailableActions(userId, companyId) {
        const availableActions = [];

        for (const [actionKey, actionDef] of Object.entries(this.actionPrerequisites)) {
            const validation = await this.validateUserContext(userId, companyId, actionKey);

            availableActions.push({
                key: actionKey,
                name: actionDef.name,
                available: validation.valid,
                missingCount: validation.missingPrerequisites?.length || 0,
                hasAlternative: !!validation.availableAlternatives
            });
        }

        return availableActions;
    }
}

module.exports = ContextValidatorService;
