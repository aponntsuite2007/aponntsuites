/**
 * SUSPENSION BLOCKING SERVICE v2.0
 * Servicio para verificar y gestionar bloqueos de fichaje por suspensión
 *
 * @version 2.0
 * @date 2025-12-03
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class SuspensionBlockingService {

    /**
     * Verificar si un empleado tiene un bloqueo activo
     * Se usa en el proceso de fichaje biométrico (check-in/check-out)
     *
     * @param {string} employeeId - UUID del empleado
     * @param {number} companyId - ID de la empresa
     * @param {Date} checkDate - Fecha a verificar (default: hoy)
     * @returns {Object} { isBlocked, blockInfo }
     */
    static async checkActiveBlock(employeeId, companyId, checkDate = new Date()) {
        try {
            // Usar la función SQL optimizada
            const [result] = await sequelize.query(`
                SELECT * FROM is_employee_suspended($1, $2, $3)
            `, {
                bind: [employeeId, companyId, checkDate.toISOString().split('T')[0]],
                type: QueryTypes.SELECT
            });

            if (result && result.is_blocked) {
                // Obtener detalles adicionales del bloqueo
                const [blockDetails] = await sequelize.query(`
                    SELECT sb.*,
                           s.title as sanction_title,
                           s.severity,
                           s.description as sanction_description,
                           u."firstName" || ' ' || u."lastName" as employee_name
                    FROM suspension_blocks sb
                    JOIN sanctions s ON s.id = sb.sanction_id
                    JOIN users u ON u.user_id = sb.employee_id
                    WHERE sb.id = $1
                `, {
                    bind: [result.block_id],
                    type: QueryTypes.SELECT
                });

                return {
                    isBlocked: true,
                    blockInfo: {
                        blockId: result.block_id,
                        sanctionId: result.sanction_id,
                        startDate: result.start_date,
                        endDate: result.end_date,
                        daysRemaining: result.days_remaining,
                        reason: result.block_reason,
                        title: blockDetails?.sanction_title,
                        severity: blockDetails?.severity,
                        totalDays: blockDetails?.total_work_days,
                        daysServed: blockDetails?.days_served
                    },
                    message: this._generateBlockMessage(result, blockDetails)
                };
            }

            return {
                isBlocked: false,
                blockInfo: null,
                message: null
            };

        } catch (error) {
            console.error('[SUSPENSION-BLOCK] Error checking block:', error);
            // En caso de error, NO bloquear (fail-safe)
            return {
                isBlocked: false,
                blockInfo: null,
                error: error.message
            };
        }
    }

    /**
     * Verificar si la fecha actual es un día laborable según el turno del empleado
     *
     * @param {string} employeeId - UUID del empleado
     * @param {Date} date - Fecha a verificar
     * @returns {boolean} true si es día laborable
     */
    static async isWorkDay(employeeId, date = new Date()) {
        try {
            const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayName = dayNames[dayOfWeek];

            // Obtener calendario del turno del empleado
            const [shiftAssignment] = await sequelize.query(`
                SELECT s.days
                FROM user_shift_assignments usa
                JOIN shifts s ON s.id = usa.shift_id
                WHERE usa.user_id = $1
                  AND usa.is_active = true
                  AND (usa.end_date IS NULL OR usa.end_date >= $2)
                ORDER BY usa.start_date DESC
                LIMIT 1
            `, {
                bind: [employeeId, date.toISOString().split('T')[0]],
                type: QueryTypes.SELECT
            });

            if (!shiftAssignment || !shiftAssignment.days) {
                // Sin turno asignado, asumir L-V
                return dayOfWeek >= 1 && dayOfWeek <= 5;
            }

            const shiftDays = typeof shiftAssignment.days === 'string'
                ? JSON.parse(shiftAssignment.days)
                : shiftAssignment.days;

            return shiftDays[dayName] === true;

        } catch (error) {
            console.error('[SUSPENSION-BLOCK] Error checking work day:', error);
            // Default: es día laborable (L-V)
            const dayOfWeek = date.getDay();
            return dayOfWeek >= 1 && dayOfWeek <= 5;
        }
    }

    /**
     * Actualizar días servidos de una suspensión
     * Se llama automáticamente al final de cada día o al cerrar el período
     *
     * @param {number} blockId - ID del bloqueo
     */
    static async updateDaysServed(blockId) {
        try {
            const [block] = await sequelize.query(`
                SELECT * FROM suspension_blocks WHERE id = $1
            `, {
                bind: [blockId],
                type: QueryTypes.SELECT
            });

            if (!block || !block.is_active) {
                return { success: false, error: 'Bloqueo no encontrado o inactivo' };
            }

            // Contar días laborables transcurridos
            const today = new Date();
            let daysServed = 0;
            let currentDate = new Date(block.start_date);

            while (currentDate <= today && currentDate <= new Date(block.end_date)) {
                const isWorkDay = await this.isWorkDay(block.employee_id, currentDate);
                if (isWorkDay) {
                    daysServed++;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }

            await sequelize.query(`
                UPDATE suspension_blocks
                SET days_served = $1, updated_at = NOW()
                WHERE id = $2
            `, {
                bind: [daysServed, blockId],
                type: QueryTypes.UPDATE
            });

            // Si se completaron todos los días, desactivar bloqueo
            if (today >= new Date(block.end_date)) {
                await this.deactivateBlock(blockId, null, 'Período de suspensión completado');
            }

            return {
                success: true,
                daysServed,
                totalDays: block.total_work_days,
                completed: daysServed >= block.total_work_days
            };

        } catch (error) {
            console.error('[SUSPENSION-BLOCK] Error updating days served:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Desactivar un bloqueo manualmente
     *
     * @param {number} blockId - ID del bloqueo
     * @param {string} userId - UUID del usuario que desactiva
     * @param {string} reason - Motivo de desactivación
     */
    static async deactivateBlock(blockId, userId = null, reason = null) {
        try {
            await sequelize.query(`
                UPDATE suspension_blocks
                SET is_active = false,
                    deactivated_at = NOW(),
                    deactivated_by = $1,
                    notes = COALESCE(notes || ' | ', '') || $2,
                    updated_at = NOW()
                WHERE id = $3
            `, {
                bind: [userId, reason || 'Desactivado manualmente', blockId],
                type: QueryTypes.UPDATE
            });

            console.log(`[SUSPENSION-BLOCK] Bloqueo #${blockId} desactivado`);
            return { success: true };

        } catch (error) {
            console.error('[SUSPENSION-BLOCK] Error deactivating block:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener todos los bloqueos activos de una empresa
     *
     * @param {number} companyId - ID de la empresa
     */
    static async getActiveBlocks(companyId) {
        try {
            const blocks = await sequelize.query(`
                SELECT sb.*,
                       s.title as sanction_title,
                       s.severity,
                       s.sanction_type,
                       u."firstName" || ' ' || u."lastName" as employee_name,
                       u."employeeId" as employee_code,
                       u.email as employee_email
                FROM suspension_blocks sb
                JOIN sanctions s ON s.id = sb.sanction_id
                JOIN users u ON u.user_id = sb.employee_id
                WHERE sb.company_id = $1
                  AND sb.is_active = true
                  AND sb.end_date >= CURRENT_DATE
                ORDER BY sb.start_date ASC
            `, {
                bind: [companyId],
                type: QueryTypes.SELECT
            });

            return { success: true, blocks };

        } catch (error) {
            console.error('[SUSPENSION-BLOCK] Error getting active blocks:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener historial de bloqueos de un empleado
     *
     * @param {string} employeeId - UUID del empleado
     * @param {number} companyId - ID de la empresa
     */
    static async getEmployeeBlockHistory(employeeId, companyId) {
        try {
            const blocks = await sequelize.query(`
                SELECT sb.*,
                       s.title as sanction_title,
                       s.severity,
                       s.sanction_type
                FROM suspension_blocks sb
                JOIN sanctions s ON s.id = sb.sanction_id
                WHERE sb.employee_id = $1
                  AND sb.company_id = $2
                ORDER BY sb.start_date DESC
            `, {
                bind: [employeeId, companyId],
                type: QueryTypes.SELECT
            });

            const stats = {
                total: blocks.length,
                active: blocks.filter(b => b.is_active).length,
                completed: blocks.filter(b => !b.is_active).length,
                total_days_suspended: blocks.reduce((sum, b) => sum + (b.total_work_days || 0), 0)
            };

            return { success: true, blocks, stats };

        } catch (error) {
            console.error('[SUSPENSION-BLOCK] Error getting employee block history:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Crear bloqueo manual (sin trigger)
     * Útil para casos especiales o migración de datos
     *
     * @param {Object} blockData - Datos del bloqueo
     */
    static async createManualBlock(blockData) {
        try {
            const {
                sanction_id,
                employee_id,
                company_id,
                start_date,
                end_date,
                total_work_days,
                notes
            } = blockData;

            const [result] = await sequelize.query(`
                INSERT INTO suspension_blocks (
                    sanction_id, employee_id, company_id,
                    start_date, end_date, total_work_days,
                    is_active, notes, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW(), NOW())
                RETURNING id
            `, {
                bind: [
                    sanction_id, employee_id, company_id,
                    start_date, end_date, total_work_days,
                    notes || 'Bloqueo creado manualmente'
                ],
                type: QueryTypes.INSERT
            });

            return { success: true, blockId: result[0].id };

        } catch (error) {
            console.error('[SUSPENSION-BLOCK] Error creating manual block:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generar mensaje de bloqueo para mostrar al empleado
     * @private
     */
    static _generateBlockMessage(result, details) {
        const endDateStr = new Date(result.end_date).toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let message = `Acceso bloqueado por suspensión disciplinaria.\n`;
        message += `Fecha de finalización: ${endDateStr}\n`;
        message += `Días restantes: ${result.days_remaining}`;

        if (details?.sanction_title) {
            message = `${details.sanction_title}\n${message}`;
        }

        return message;
    }

    /**
     * Verificación rápida para fichaje (optimizada para rendimiento)
     * Retorna solo boolean y mensaje corto
     *
     * @param {string} employeeId - UUID del empleado
     * @param {number} companyId - ID de la empresa
     */
    static async quickCheck(employeeId, companyId) {
        try {
            const [result] = await sequelize.query(`
                SELECT sb.end_date, sb.sanction_id,
                       (sb.end_date - CURRENT_DATE)::INTEGER as days_remaining
                FROM suspension_blocks sb
                WHERE sb.employee_id = $1
                  AND sb.company_id = $2
                  AND sb.is_active = true
                  AND CURRENT_DATE BETWEEN sb.start_date AND sb.end_date
                LIMIT 1
            `, {
                bind: [employeeId, companyId],
                type: QueryTypes.SELECT
            });

            if (result) {
                return {
                    blocked: true,
                    endDate: result.end_date,
                    daysRemaining: result.days_remaining,
                    sanctionId: result.sanction_id
                };
            }

            return { blocked: false };

        } catch (error) {
            console.error('[SUSPENSION-BLOCK] Error in quick check:', error);
            return { blocked: false, error: error.message };
        }
    }
}

module.exports = SuspensionBlockingService;
