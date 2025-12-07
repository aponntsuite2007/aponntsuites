/**
 * ASSOCIATE SERVICE v1.0
 * Gestión del pool de asociados APONNT y contratos
 *
 * @version 1.0
 * @date 2025-12-06
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class AssociateService {

    // =====================================================
    // POOL DE ASOCIADOS
    // =====================================================

    /**
     * Buscar asociados por categoría y región
     *
     * @param {Object} filters - Filtros de búsqueda
     */
    static async searchAssociates(filters = {}) {
        try {
            const {
                category = null,
                region = null,
                specialty = null,
                minRating = 0,
                remoteAvailable = null,
                limit = 20,
                offset = 0
            } = filters;

            let whereClause = 'is_active = true AND is_verified = true';
            const params = [];
            let paramIndex = 1;

            if (category) {
                whereClause += ` AND category = $${paramIndex}`;
                params.push(category);
                paramIndex++;
            }

            if (region) {
                whereClause += ` AND $${paramIndex} = ANY(service_regions)`;
                params.push(region);
                paramIndex++;
            }

            if (specialty) {
                whereClause += ` AND (specialty ILIKE $${paramIndex} OR $${paramIndex} = ANY(sub_specialties))`;
                params.push(`%${specialty}%`);
                paramIndex++;
            }

            if (minRating > 0) {
                whereClause += ` AND rating_average >= $${paramIndex}`;
                params.push(minRating);
                paramIndex++;
            }

            if (remoteAvailable !== null) {
                whereClause += ` AND remote_available = $${paramIndex}`;
                params.push(remoteAvailable);
                paramIndex++;
            }

            params.push(limit, offset);

            const associates = await sequelize.query(`
                SELECT
                    id, first_name, last_name, email, phone,
                    photo_url, bio, category, specialty, sub_specialties,
                    license_number, license_issuer, certifications,
                    service_regions, remote_available,
                    hourly_rate, currency,
                    rating_average, rating_count, contracts_completed,
                    is_featured, tags
                FROM aponnt_associates
                WHERE ${whereClause}
                ORDER BY is_featured DESC, rating_average DESC, contracts_completed DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `, {
                bind: params,
                type: QueryTypes.SELECT
            });

            // Contar total
            const [countResult] = await sequelize.query(`
                SELECT COUNT(*) as total FROM aponnt_associates WHERE ${whereClause}
            `, { bind: params.slice(0, -2), type: QueryTypes.SELECT });

            return {
                associates,
                total: parseInt(countResult?.total || 0),
                limit,
                offset
            };

        } catch (error) {
            console.error('[ASSOCIATE] Error searching associates:', error);
            throw error;
        }
    }

    /**
     * Obtener detalle de un asociado
     *
     * @param {string} associateId - UUID del asociado
     */
    static async getAssociateDetail(associateId) {
        try {
            const [associate] = await sequelize.query(`
                SELECT a.*,
                       u."firstName" as user_first_name,
                       u."lastName" as user_last_name,
                       u.email as user_email
                FROM aponnt_associates a
                LEFT JOIN users u ON u.user_id = a.user_id
                WHERE a.id = $1
            `, {
                bind: [associateId],
                type: QueryTypes.SELECT
            });

            if (!associate) {
                return null;
            }

            // Obtener reviews/valoraciones (si existiera tabla)
            // Por ahora solo retornamos el asociado

            return associate;

        } catch (error) {
            console.error('[ASSOCIATE] Error getting associate detail:', error);
            throw error;
        }
    }

    /**
     * Obtener categorías disponibles
     */
    static async getCategories() {
        return [
            { key: 'medical', name: 'Médicos Laborales', icon: 'fa-stethoscope', color: '#20c997' },
            { key: 'legal', name: 'Abogados Laborales', icon: 'fa-balance-scale', color: '#fd7e14' },
            { key: 'safety', name: 'Seguridad Industrial', icon: 'fa-hard-hat', color: '#ffc107' },
            { key: 'audit', name: 'Auditores', icon: 'fa-clipboard-check', color: '#6f42c1' },
            { key: 'training', name: 'Capacitadores', icon: 'fa-chalkboard-teacher', color: '#17a2b8' },
            { key: 'psychologist', name: 'Psicólogos Laborales', icon: 'fa-brain', color: '#e83e8c' }
        ];
    }

    // =====================================================
    // CONTRATOS EMPRESA-ASOCIADO
    // =====================================================

    /**
     * Crear contrato entre empresa y asociado
     *
     * @param {number} companyId - ID de la empresa
     * @param {string} associateId - UUID del asociado
     * @param {Object} contractData - Datos del contrato
     */
    static async createContract(companyId, associateId, contractData) {
        try {
            const {
                contractType, // 'permanent' | 'eventual'
                scopeType = 'all_company', // 'all_company' | 'branches' | 'departments' | 'employees'
                assignedBranches = [],
                assignedDepartments = [],
                startDate = new Date().toISOString().split('T')[0],
                endDate = null,
                hourlyRateAgreed = null,
                currency = 'ARS',
                notes = null,
                createdBy = null
            } = contractData;

            // Verificar que no exista contrato activo
            const [existing] = await sequelize.query(`
                SELECT id FROM company_associate_contracts
                WHERE company_id = $1 AND associate_id = $2 AND status = 'active'
            `, { bind: [companyId, associateId], type: QueryTypes.SELECT });

            if (existing) {
                return {
                    success: false,
                    error: 'Ya existe un contrato activo con este profesional'
                };
            }

            // Obtener rol según categoría del asociado
            const [associate] = await sequelize.query(`
                SELECT category FROM aponnt_associates WHERE id = $1
            `, { bind: [associateId], type: QueryTypes.SELECT });

            const [role] = await sequelize.query(`
                SELECT id FROM role_definitions
                WHERE role_key = $1 AND company_id IS NULL
            `, { bind: [`associate_${associate?.category}`], type: QueryTypes.SELECT });

            // Crear contrato
            const [result] = await sequelize.query(`
                INSERT INTO company_associate_contracts (
                    company_id, associate_id, contract_type, scope_type,
                    assigned_branches, assigned_departments,
                    role_id, start_date, end_date,
                    hourly_rate_agreed, currency, notes,
                    status, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13)
                RETURNING *
            `, {
                bind: [
                    companyId,
                    associateId,
                    contractType,
                    scopeType,
                    assignedBranches,
                    assignedDepartments,
                    role?.id,
                    startDate,
                    endDate,
                    hourlyRateAgreed,
                    currency,
                    notes,
                    createdBy
                ],
                type: QueryTypes.INSERT
            });

            // Actualizar contador de contratos activos del asociado
            await sequelize.query(`
                UPDATE aponnt_associates
                SET active_contracts = active_contracts + 1
                WHERE id = $1
            `, { bind: [associateId] });

            return { success: true, contract: result[0] };

        } catch (error) {
            console.error('[ASSOCIATE] Error creating contract:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener contratos de una empresa
     *
     * @param {number} companyId - ID de la empresa
     * @param {string} status - Filtrar por estado
     */
    static async getCompanyContracts(companyId, status = null) {
        try {
            let whereClause = 'cac.company_id = $1';
            const params = [companyId];

            if (status) {
                whereClause += ' AND cac.status = $2';
                params.push(status);
            }

            const contracts = await sequelize.query(`
                SELECT
                    cac.*,
                    aa.first_name, aa.last_name, aa.email as associate_email,
                    aa.category, aa.specialty, aa.photo_url,
                    aa.rating_average, aa.license_number,
                    rd.role_name
                FROM company_associate_contracts cac
                JOIN aponnt_associates aa ON aa.id = cac.associate_id
                LEFT JOIN role_definitions rd ON rd.id = cac.role_id
                WHERE ${whereClause}
                ORDER BY cac.created_at DESC
            `, {
                bind: params,
                type: QueryTypes.SELECT
            });

            return contracts;

        } catch (error) {
            console.error('[ASSOCIATE] Error getting company contracts:', error);
            return [];
        }
    }

    /**
     * Obtener empresas donde trabaja un asociado
     *
     * @param {string} associateUserId - UUID del usuario asociado
     */
    static async getAssociateCompanies(associateUserId) {
        try {
            const companies = await sequelize.query(`
                SELECT
                    c.company_id, c.name as company_name, c.logo,
                    cac.contract_type, cac.scope_type, cac.status,
                    cac.start_date, cac.end_date,
                    cac.assigned_branches, cac.assigned_departments
                FROM company_associate_contracts cac
                JOIN companies c ON c.company_id = cac.company_id
                JOIN aponnt_associates aa ON aa.id = cac.associate_id
                WHERE aa.user_id = $1
                  AND cac.status = 'active'
                ORDER BY c.name
            `, {
                bind: [associateUserId],
                type: QueryTypes.SELECT
            });

            return companies;

        } catch (error) {
            console.error('[ASSOCIATE] Error getting associate companies:', error);
            return [];
        }
    }

    /**
     * Pausar/Reactivar contrato
     *
     * @param {number} contractId - ID del contrato
     * @param {string} action - 'pause' | 'activate'
     */
    static async toggleContractStatus(contractId, action) {
        try {
            const newStatus = action === 'pause' ? 'paused' : 'active';

            await sequelize.query(`
                UPDATE company_associate_contracts
                SET status = $1, updated_at = NOW()
                WHERE id = $2
            `, { bind: [newStatus, contractId] });

            return { success: true };

        } catch (error) {
            console.error('[ASSOCIATE] Error toggling contract status:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Terminar contrato
     *
     * @param {number} contractId - ID del contrato
     * @param {string} terminatedBy - UUID del usuario que termina
     * @param {string} reason - Motivo de terminación
     */
    static async terminateContract(contractId, terminatedBy, reason) {
        try {
            // Obtener datos del contrato
            const [contract] = await sequelize.query(`
                SELECT associate_id FROM company_associate_contracts WHERE id = $1
            `, { bind: [contractId], type: QueryTypes.SELECT });

            // Terminar contrato
            await sequelize.query(`
                UPDATE company_associate_contracts
                SET status = 'terminated',
                    terminated_at = NOW(),
                    terminated_by = $1,
                    termination_reason = $2,
                    updated_at = NOW()
                WHERE id = $3
            `, { bind: [terminatedBy, reason, contractId] });

            // Desactivar asignaciones de empleados
            await sequelize.query(`
                UPDATE associate_employee_assignments
                SET is_active = false, deactivated_at = NOW()
                WHERE contract_id = $1
            `, { bind: [contractId] });

            // Actualizar contador
            if (contract) {
                await sequelize.query(`
                    UPDATE aponnt_associates
                    SET active_contracts = GREATEST(0, active_contracts - 1),
                        contracts_completed = contracts_completed + 1
                    WHERE id = $1
                `, { bind: [contract.associate_id] });
            }

            return { success: true };

        } catch (error) {
            console.error('[ASSOCIATE] Error terminating contract:', error);
            return { success: false, error: error.message };
        }
    }

    // =====================================================
    // ASIGNACIÓN DE EMPLEADOS (para eventuales)
    // =====================================================

    /**
     * Asignar empleados a un contrato eventual
     *
     * @param {number} contractId - ID del contrato
     * @param {string[]} employeeIds - UUIDs de empleados
     * @param {string} assignedBy - UUID del usuario que asigna
     * @param {string} reason - Motivo de asignación
     */
    static async assignEmployees(contractId, employeeIds, assignedBy, reason = null) {
        try {
            const results = [];

            for (const employeeId of employeeIds) {
                try {
                    await sequelize.query(`
                        INSERT INTO associate_employee_assignments (
                            contract_id, employee_id, assignment_reason, assigned_by
                        ) VALUES ($1, $2, $3, $4)
                        ON CONFLICT (contract_id, employee_id) DO UPDATE SET
                            is_active = true,
                            deactivated_at = NULL,
                            assigned_at = NOW()
                    `, { bind: [contractId, employeeId, reason, assignedBy] });

                    results.push({ employeeId, success: true });
                } catch (e) {
                    results.push({ employeeId, success: false, error: e.message });
                }
            }

            return { success: true, results };

        } catch (error) {
            console.error('[ASSOCIATE] Error assigning employees:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Desasignar empleados de un contrato
     *
     * @param {number} contractId - ID del contrato
     * @param {string[]} employeeIds - UUIDs de empleados
     * @param {string} deactivatedBy - UUID del usuario que desasigna
     * @param {string} reason - Motivo
     */
    static async unassignEmployees(contractId, employeeIds, deactivatedBy, reason = null) {
        try {
            await sequelize.query(`
                UPDATE associate_employee_assignments
                SET is_active = false,
                    deactivated_at = NOW(),
                    deactivated_by = $1,
                    deactivation_reason = $2
                WHERE contract_id = $3 AND employee_id = ANY($4)
            `, { bind: [deactivatedBy, reason, contractId, employeeIds] });

            return { success: true };

        } catch (error) {
            console.error('[ASSOCIATE] Error unassigning employees:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener empleados asignados a un contrato
     *
     * @param {number} contractId - ID del contrato
     */
    static async getAssignedEmployees(contractId) {
        try {
            const employees = await sequelize.query(`
                SELECT
                    aea.*,
                    u.user_id, u."firstName", u."lastName", u.email,
                    u."employeeId", u.branch_id, u.department_id,
                    d.name as department_name,
                    b.name as branch_name
                FROM associate_employee_assignments aea
                JOIN users u ON u.user_id = aea.employee_id
                LEFT JOIN departments d ON d.id = u.department_id
                LEFT JOIN branches b ON b.id = u.branch_id
                WHERE aea.contract_id = $1 AND aea.is_active = true
                ORDER BY u."lastName", u."firstName"
            `, {
                bind: [contractId],
                type: QueryTypes.SELECT
            });

            return employees;

        } catch (error) {
            console.error('[ASSOCIATE] Error getting assigned employees:', error);
            return [];
        }
    }

    /**
     * Obtener empleados disponibles para asignar
     * (los que no están asignados al contrato)
     *
     * @param {number} contractId - ID del contrato
     * @param {number} companyId - ID de la empresa
     */
    static async getAvailableEmployees(contractId, companyId) {
        try {
            const employees = await sequelize.query(`
                SELECT
                    u.user_id, u."firstName", u."lastName", u.email,
                    u."employeeId", u.branch_id, u.department_id,
                    d.name as department_name,
                    b.name as branch_name
                FROM users u
                LEFT JOIN departments d ON d.id = u.department_id
                LEFT JOIN branches b ON b.id = u.branch_id
                WHERE u.company_id = $1
                  AND u.is_active = true
                  AND u.user_id NOT IN (
                      SELECT employee_id FROM associate_employee_assignments
                      WHERE contract_id = $2 AND is_active = true
                  )
                ORDER BY u."lastName", u."firstName"
            `, {
                bind: [companyId, contractId],
                type: QueryTypes.SELECT
            });

            return employees;

        } catch (error) {
            console.error('[ASSOCIATE] Error getting available employees:', error);
            return [];
        }
    }
}

module.exports = AssociateService;
