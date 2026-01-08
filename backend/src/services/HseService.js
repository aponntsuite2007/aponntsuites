/**
 * HseService.js
 * Servicio de Seguridad e Higiene Laboral (HSE) - ISO 45001
 * Gestion completa de EPP/PPE con integracion SSOT
 *
 * @version 1.0.0
 */

const { Op } = require('sequelize');
const {
    sequelize,
    EppCategory,
    EppCatalog,
    EppRoleRequirement,
    EppDelivery,
    EppInspection,
    HseCompanyConfig,
    OrganizationalPosition,
    User,
    Company
} = require('../config/database');
const NotificationCentralExchange = require('./NotificationCentralExchange');

class HseService {

    // =========================================================================
    // CATEGORIAS DE EPP (Globales)
    // =========================================================================

    /**
     * Obtener todas las categorias de EPP
     */
    async getCategories() {
        try {
            const categories = await EppCategory.findAll({
                where: { is_active: true },
                order: [['sort_order', 'ASC']]
            });
            return { success: true, categories };
        } catch (error) {
            console.error('[HseService] Error getCategories:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // CATALOGO DE EPP (Por empresa)
    // =========================================================================

    /**
     * Obtener catalogo de EPP de una empresa
     */
    async getCatalog(companyId, filters = {}) {
        try {
            const where = { company_id: companyId };

            if (filters.categoryId) where.category_id = filters.categoryId;
            if (filters.isActive !== undefined) where.is_active = filters.isActive;
            if (filters.search) {
                where[Op.or] = [
                    { name: { [Op.iLike]: `%${filters.search}%` } },
                    { code: { [Op.iLike]: `%${filters.search}%` } },
                    { brand: { [Op.iLike]: `%${filters.search}%` } }
                ];
            }

            const catalog = await EppCatalog.findAll({
                where,
                include: [{
                    model: EppCategory,
                    as: 'category',
                    attributes: ['id', 'code', 'name_es', 'name_en', 'icon', 'body_zone']
                }],
                order: [['category_id', 'ASC'], ['name', 'ASC']]
            });

            return { success: true, catalog };
        } catch (error) {
            console.error('[HseService] Error getCatalog:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Crear EPP en catalogo
     */
    async createCatalogItem(companyId, data) {
        try {
            const item = await EppCatalog.create({
                company_id: companyId,
                category_id: data.category_id,
                code: data.code,
                name: data.name,
                description: data.description,
                brand: data.brand,
                model: data.model,
                certifications: data.certifications || [],
                default_lifespan_days: data.default_lifespan_days,
                lifespan_unit: data.lifespan_unit || 'days',
                max_uses: data.max_uses,
                available_sizes: data.available_sizes,
                unit_cost: data.unit_cost,
                min_stock_alert: data.min_stock_alert || 5,
                usage_instructions: data.usage_instructions,
                maintenance_instructions: data.maintenance_instructions,
                storage_instructions: data.storage_instructions,
                disposal_instructions: data.disposal_instructions,
                procedure_id: data.procedure_id,
                is_active: true
            });

            return { success: true, item };
        } catch (error) {
            console.error('[HseService] Error createCatalogItem:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                return { success: false, error: 'Ya existe un EPP con ese codigo' };
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Actualizar EPP del catalogo
     */
    async updateCatalogItem(companyId, itemId, data) {
        try {
            const item = await EppCatalog.findOne({
                where: { id: itemId, company_id: companyId }
            });

            if (!item) {
                return { success: false, error: 'EPP no encontrado' };
            }

            await item.update(data);
            return { success: true, item };
        } catch (error) {
            console.error('[HseService] Error updateCatalogItem:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Desactivar EPP del catalogo
     */
    async deleteCatalogItem(companyId, itemId) {
        try {
            const item = await EppCatalog.findOne({
                where: { id: itemId, company_id: companyId }
            });

            if (!item) {
                return { success: false, error: 'EPP no encontrado' };
            }

            await item.update({ is_active: false });
            return { success: true, message: 'EPP desactivado' };
        } catch (error) {
            console.error('[HseService] Error deleteCatalogItem:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // MATRIZ ROL-EPP
    // =========================================================================

    /**
     * Obtener requerimientos de EPP por posicion
     */
    async getRequirementsByPosition(companyId, positionId) {
        try {
            const requirements = await EppRoleRequirement.findAll({
                where: { company_id: companyId, position_id: positionId },
                include: [{
                    model: EppCatalog,
                    as: 'catalog',
                    include: [{
                        model: EppCategory,
                        as: 'category'
                    }]
                }],
                order: [['priority', 'ASC'], ['is_mandatory', 'DESC']]
            });

            return { success: true, requirements };
        } catch (error) {
            console.error('[HseService] Error getRequirementsByPosition:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener matriz completa de EPP por rol
     */
    async getRequirementsMatrix(companyId) {
        try {
            // Obtener todas las posiciones con sus requerimientos
            const positions = await OrganizationalPosition.findAll({
                where: { company_id: companyId, is_active: true },
                attributes: ['id', 'position_name', 'position_code', 'work_environment', 'risk_exposure_level'],
                order: [['position_name', 'ASC']]
            });

            const requirements = await EppRoleRequirement.findAll({
                where: { company_id: companyId },
                include: [{
                    model: EppCatalog,
                    as: 'catalog',
                    include: [{ model: EppCategory, as: 'category' }]
                }]
            });

            // Agrupar por posicion
            const matrix = positions.map(pos => {
                const posReqs = requirements.filter(r => r.position_id === pos.id);
                return {
                    position: pos,
                    requirements: posReqs,
                    totalEpp: posReqs.length,
                    mandatoryCount: posReqs.filter(r => r.is_mandatory).length
                };
            });

            return { success: true, matrix };
        } catch (error) {
            console.error('[HseService] Error getRequirementsMatrix:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Asignar EPP a posicion
     */
    async createRequirement(companyId, data, userId) {
        try {
            const requirement = await EppRoleRequirement.create({
                company_id: companyId,
                position_id: data.position_id,
                epp_catalog_id: data.epp_catalog_id,
                is_mandatory: data.is_mandatory !== false,
                priority: data.priority || 1,
                quantity_required: data.quantity_required || 1,
                custom_lifespan_days: data.custom_lifespan_days,
                conditions: data.conditions,
                applicable_work_environments: data.applicable_work_environments,
                specific_procedure_id: data.specific_procedure_id,
                created_by: userId
            });

            return { success: true, requirement };
        } catch (error) {
            console.error('[HseService] Error createRequirement:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                return { success: false, error: 'Este EPP ya esta asignado a esta posicion' };
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Actualizar requerimiento
     */
    async updateRequirement(companyId, requirementId, data) {
        try {
            const requirement = await EppRoleRequirement.findOne({
                where: { id: requirementId, company_id: companyId }
            });

            if (!requirement) {
                return { success: false, error: 'Requerimiento no encontrado' };
            }

            await requirement.update(data);
            return { success: true, requirement };
        } catch (error) {
            console.error('[HseService] Error updateRequirement:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Eliminar requerimiento
     */
    async deleteRequirement(companyId, requirementId) {
        try {
            const deleted = await EppRoleRequirement.destroy({
                where: { id: requirementId, company_id: companyId }
            });

            if (!deleted) {
                return { success: false, error: 'Requerimiento no encontrado' };
            }

            return { success: true, message: 'Requerimiento eliminado' };
        } catch (error) {
            console.error('[HseService] Error deleteRequirement:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // ENTREGAS DE EPP
    // =========================================================================

    /**
     * Obtener entregas con filtros
     */
    async getDeliveries(companyId, filters = {}) {
        try {
            const where = { company_id: companyId };

            if (filters.employeeId) where.employee_id = filters.employeeId;
            if (filters.status) where.status = filters.status;
            if (filters.eppCatalogId) where.epp_catalog_id = filters.eppCatalogId;

            const deliveries = await EppDelivery.findAll({
                where,
                include: [
                    {
                        model: EppCatalog,
                        as: 'catalog',
                        include: [{ model: EppCategory, as: 'category' }]
                    },
                    {
                        model: User,
                        as: 'employee',
                        attributes: ['user_id', 'firstName', 'lastName', 'employeeId']
                    },
                    {
                        model: User,
                        as: 'deliveredBy',
                        attributes: ['user_id', 'firstName', 'lastName']
                    }
                ],
                order: [['delivery_date', 'DESC']]
            });

            return { success: true, deliveries };
        } catch (error) {
            console.error('[HseService] Error getDeliveries:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener entregas de un empleado
     */
    async getEmployeeDeliveries(companyId, employeeId) {
        try {
            const deliveries = await EppDelivery.findAll({
                where: { company_id: companyId, employee_id: employeeId },
                include: [{
                    model: EppCatalog,
                    as: 'catalog',
                    include: [{ model: EppCategory, as: 'category' }]
                }],
                order: [['delivery_date', 'DESC']]
            });

            return { success: true, deliveries };
        } catch (error) {
            console.error('[HseService] Error getEmployeeDeliveries:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener EPP proximos a vencer
     */
    async getExpiringDeliveries(companyId, daysAhead = 30) {
        try {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + daysAhead);

            const deliveries = await EppDelivery.findAll({
                where: {
                    company_id: companyId,
                    status: 'active',
                    calculated_replacement_date: {
                        [Op.lte]: targetDate
                    }
                },
                include: [
                    {
                        model: EppCatalog,
                        as: 'catalog',
                        include: [{ model: EppCategory, as: 'category' }]
                    },
                    {
                        model: User,
                        as: 'employee',
                        attributes: ['user_id', 'firstName', 'lastName', 'employeeId', 'email']
                    }
                ],
                order: [['calculated_replacement_date', 'ASC']]
            });

            // Calcular dias restantes
            const today = new Date();
            const result = deliveries.map(d => {
                const daysRemaining = Math.ceil((new Date(d.calculated_replacement_date) - today) / (1000 * 60 * 60 * 24));
                return {
                    ...d.toJSON(),
                    days_remaining: daysRemaining,
                    urgency: daysRemaining <= 0 ? 'expired' : daysRemaining <= 7 ? 'critical' : daysRemaining <= 15 ? 'warning' : 'normal'
                };
            });

            return { success: true, deliveries: result };
        } catch (error) {
            console.error('[HseService] Error getExpiringDeliveries:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Registrar entrega de EPP
     */
    async createDelivery(companyId, data, deliveredBy) {
        try {
            // Obtener vida util del catalogo
            const catalogItem = await EppCatalog.findByPk(data.epp_catalog_id);
            if (!catalogItem) {
                return { success: false, error: 'EPP no encontrado en catalogo' };
            }

            // Calcular fecha de reemplazo
            const deliveryDate = data.delivery_date ? new Date(data.delivery_date) : new Date();
            const lifespanDays = data.custom_lifespan_days || catalogItem.default_lifespan_days || 365;
            const replacementDate = new Date(deliveryDate);
            replacementDate.setDate(replacementDate.getDate() + lifespanDays);

            const delivery = await EppDelivery.create({
                company_id: companyId,
                employee_id: data.employee_id,
                epp_catalog_id: data.epp_catalog_id,
                requirement_id: data.requirement_id,
                delivery_date: deliveryDate,
                delivered_by: deliveredBy,
                quantity_delivered: data.quantity_delivered || 1,
                size_delivered: data.size_delivered,
                serial_number: data.serial_number,
                batch_number: data.batch_number,
                manufacture_date: data.manufacture_date,
                expiration_date: data.expiration_date,
                calculated_replacement_date: replacementDate,
                status: 'active',
                notes: data.notes
            });

            return { success: true, delivery };
        } catch (error) {
            console.error('[HseService] Error createDelivery:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Registrar firma del empleado
     */
    async signDelivery(companyId, deliveryId, signatureMethod) {
        try {
            const delivery = await EppDelivery.findOne({
                where: { id: deliveryId, company_id: companyId }
            });

            if (!delivery) {
                return { success: false, error: 'Entrega no encontrada' };
            }

            await delivery.update({
                employee_signature_date: new Date(),
                employee_signature_method: signatureMethod || 'digital'
            });

            return { success: true, delivery };
        } catch (error) {
            console.error('[HseService] Error signDelivery:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Registrar devolucion de EPP
     */
    async returnDelivery(companyId, deliveryId, data) {
        try {
            const delivery = await EppDelivery.findOne({
                where: { id: deliveryId, company_id: companyId }
            });

            if (!delivery) {
                return { success: false, error: 'Entrega no encontrada' };
            }

            await delivery.update({
                status: 'returned',
                return_date: new Date(),
                return_reason: data.reason,
                return_notes: data.notes
            });

            return { success: true, delivery };
        } catch (error) {
            console.error('[HseService] Error returnDelivery:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Reemplazar EPP vencido
     */
    async replaceDelivery(companyId, oldDeliveryId, newDeliveryData, deliveredBy) {
        const transaction = await sequelize.transaction();

        try {
            // Marcar entrega antigua como reemplazada
            const oldDelivery = await EppDelivery.findOne({
                where: { id: oldDeliveryId, company_id: companyId },
                transaction
            });

            if (!oldDelivery) {
                await transaction.rollback();
                return { success: false, error: 'Entrega original no encontrada' };
            }

            // Crear nueva entrega
            const newDeliveryResult = await this.createDelivery(companyId, {
                ...newDeliveryData,
                employee_id: oldDelivery.employee_id,
                epp_catalog_id: oldDelivery.epp_catalog_id,
                requirement_id: oldDelivery.requirement_id
            }, deliveredBy);

            if (!newDeliveryResult.success) {
                await transaction.rollback();
                return newDeliveryResult;
            }

            // Actualizar entrega antigua
            await oldDelivery.update({
                status: 'replaced',
                replaced_by_delivery_id: newDeliveryResult.delivery.id
            }, { transaction });

            await transaction.commit();

            return {
                success: true,
                oldDelivery,
                newDelivery: newDeliveryResult.delivery
            };
        } catch (error) {
            await transaction.rollback();
            console.error('[HseService] Error replaceDelivery:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // INSPECCIONES
    // =========================================================================

    /**
     * Obtener inspecciones
     */
    async getInspections(companyId, filters = {}) {
        try {
            const where = {};
            const deliveryWhere = { company_id: companyId };

            if (filters.deliveryId) where.delivery_id = filters.deliveryId;
            if (filters.condition) where.condition = filters.condition;
            if (filters.actionRequired) where.action_required = filters.actionRequired;

            const inspections = await EppInspection.findAll({
                where,
                include: [{
                    model: EppDelivery,
                    as: 'delivery',
                    where: deliveryWhere,
                    include: [
                        { model: EppCatalog, as: 'catalog' },
                        { model: User, as: 'employee', attributes: ['user_id', 'firstName', 'lastName'] }
                    ]
                }],
                order: [['inspection_date', 'DESC']]
            });

            return { success: true, inspections };
        } catch (error) {
            console.error('[HseService] Error getInspections:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener inspecciones pendientes (acciones no completadas)
     */
    async getPendingInspections(companyId) {
        try {
            const inspections = await EppInspection.findAll({
                where: {
                    action_required: { [Op.not]: null },
                    action_completed: false
                },
                include: [{
                    model: EppDelivery,
                    as: 'delivery',
                    where: { company_id: companyId },
                    include: [
                        { model: EppCatalog, as: 'catalog' },
                        { model: User, as: 'employee', attributes: ['user_id', 'firstName', 'lastName'] }
                    ]
                }],
                order: [['action_deadline', 'ASC']]
            });

            return { success: true, inspections };
        } catch (error) {
            console.error('[HseService] Error getPendingInspections:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Crear inspeccion
     */
    async createInspection(deliveryId, data, inspectorId) {
        try {
            const inspection = await EppInspection.create({
                delivery_id: deliveryId,
                inspection_date: data.inspection_date || new Date(),
                inspector_id: inspectorId,
                condition: data.condition,
                is_compliant: data.is_compliant !== false,
                checklist_results: data.checklist_results || {},
                action_required: data.action_required,
                action_notes: data.action_notes,
                action_deadline: data.action_deadline,
                photos: data.photos || []
            });

            // Si el EPP esta en mala condicion, actualizar status de la entrega
            if (data.condition === 'unusable' || data.condition === 'damaged') {
                await EppDelivery.update(
                    { status: data.condition },
                    { where: { id: deliveryId } }
                );
            }

            // Obtener delivery para datos de notificación
            const delivery = await EppDelivery.findByPk(deliveryId, {
                include: [
                    { model: User, as: 'employee', attributes: ['user_id', 'firstName', 'lastName', 'email', 'company_id'] },
                    { model: EppCatalog, as: 'eppItem', attributes: ['name', 'code'] }
                ]
            });

            // Notificar inspección programada
            if (delivery && delivery.employee) {
                try {
                    await NotificationCentralExchange.send({
                        companyId: delivery.employee.company_id,
                        module: 'hse',
                        workflowKey: 'hse_inspection_scheduled',
                        recipientType: 'user',
                        recipientId: delivery.employee.user_id,
                        title: 'Inspección de EPP programada',
                        message: `Se ha programado una inspección de su EPP "${delivery.eppItem?.name}" para el ${new Date(data.inspection_date).toLocaleDateString()}.`,
                        priority: data.action_required ? 'high' : 'normal',
                        channels: ['email', 'inbox', 'websocket'],
                        originType: 'hse_inspection',
                        originId: inspection.id.toString(),
                        metadata: {
                            inspection_id: inspection.id,
                            delivery_id: deliveryId,
                            epp_name: delivery.eppItem?.name,
                            inspector_id: inspectorId,
                            inspection_date: data.inspection_date
                        }
                    });
                } catch (notifError) {
                    console.error('[HseService] Error enviando notificación de inspección:', notifError);
                }
            }

            // Si hay no conformidad, enviar notificación adicional
            if (!data.is_compliant || data.condition === 'unusable' || data.condition === 'damaged') {
                try {
                    await NotificationCentralExchange.send({
                        companyId: delivery.employee.company_id,
                        module: 'hse',
                        workflowKey: 'hse_non_conformity',
                        recipientType: 'user',
                        recipientId: delivery.employee.user_id,
                        title: 'No conformidad detectada en EPP',
                        message: `Se detectó una no conformidad en su EPP "${delivery.eppItem?.name}". Estado: ${data.condition}. ${data.action_notes || ''}`,
                        priority: 'urgent',
                        requiresAction: data.action_required || false,
                        channels: ['email', 'push', 'inbox', 'websocket'],
                        originType: 'hse_non_conformity',
                        originId: inspection.id.toString(),
                        metadata: {
                            inspection_id: inspection.id,
                            delivery_id: deliveryId,
                            epp_name: delivery.eppItem?.name,
                            condition: data.condition,
                            is_compliant: data.is_compliant,
                            action_required: data.action_required,
                            action_deadline: data.action_deadline
                        }
                    });
                } catch (notifError) {
                    console.error('[HseService] Error enviando notificación de no conformidad:', notifError);
                }
            }

            return { success: true, inspection };
        } catch (error) {
            console.error('[HseService] Error createInspection:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Completar accion de inspeccion
     */
    async completeInspectionAction(inspectionId) {
        try {
            const inspection = await EppInspection.findByPk(inspectionId);

            if (!inspection) {
                return { success: false, error: 'Inspeccion no encontrada' };
            }

            await inspection.update({ action_completed: true });
            return { success: true, inspection };
        } catch (error) {
            console.error('[HseService] Error completeInspectionAction:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // CONFIGURACION
    // =========================================================================

    /**
     * Obtener configuracion HSE de empresa
     */
    async getConfig(companyId) {
        try {
            let config = await HseCompanyConfig.findOne({
                where: { company_id: companyId }
            });

            // Crear configuracion por defecto si no existe
            if (!config) {
                config = await HseCompanyConfig.create({
                    company_id: companyId,
                    primary_standard: 'ISO45001',
                    alert_days_before: [30, 15, 7, 1],
                    notify_employee: true,
                    notify_supervisor: true,
                    notify_hse_manager: true,
                    notify_hr: false,
                    block_work_without_epp: false,
                    require_signature_on_delivery: true,
                    auto_schedule_inspections: true,
                    inspection_frequency_days: 90
                });
            }

            return { success: true, config };
        } catch (error) {
            console.error('[HseService] Error getConfig:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Actualizar configuracion HSE
     */
    async updateConfig(companyId, data) {
        try {
            const [config] = await HseCompanyConfig.upsert({
                company_id: companyId,
                ...data
            }, {
                returning: true
            });

            return { success: true, config };
        } catch (error) {
            console.error('[HseService] Error updateConfig:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // DASHBOARD Y REPORTES
    // =========================================================================

    /**
     * Obtener KPIs del dashboard HSE
     */
    async getDashboardKPIs(companyId) {
        try {
            // Usar funcion SQL para obtener KPIs
            const [results] = await sequelize.query(
                'SELECT * FROM get_hse_dashboard_kpis($1)',
                { bind: [companyId] }
            );

            const kpis = results[0] || {
                total_active_deliveries: 0,
                expiring_30_days: 0,
                expiring_7_days: 0,
                expired: 0,
                compliance_rate: 100,
                total_inspections_pending: 0,
                total_epp_in_catalog: 0,
                total_positions_with_epp: 0
            };

            return { success: true, kpis };
        } catch (error) {
            console.error('[HseService] Error getDashboardKPIs:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener cumplimiento de EPP de un empleado
     */
    async getEmployeeCompliance(companyId, employeeId) {
        try {
            // Obtener posicion del empleado
            const employee = await User.findOne({
                where: { user_id: employeeId, company_id: companyId },
                attributes: ['user_id', 'first_name', 'last_name', 'organizational_position_id']
            });

            if (!employee) {
                return { success: false, error: 'Empleado no encontrado' };
            }

            if (!employee.organizational_position_id) {
                return {
                    success: true,
                    compliance: {
                        employee,
                        hasPosition: false,
                        required: [],
                        delivered: [],
                        missing: [],
                        expired: [],
                        complianceRate: 100
                    }
                };
            }

            // Obtener EPP requeridos por posicion
            const requirements = await EppRoleRequirement.findAll({
                where: {
                    company_id: companyId,
                    position_id: employee.organizational_position_id,
                    is_mandatory: true
                },
                include: [{ model: EppCatalog, as: 'catalog' }]
            });

            // Obtener entregas activas del empleado
            const deliveries = await EppDelivery.findAll({
                where: {
                    company_id: companyId,
                    employee_id: employeeId,
                    status: 'active'
                }
            });

            // Calcular cumplimiento
            const today = new Date();
            const required = requirements.map(r => r.epp_catalog_id);
            const delivered = deliveries.map(d => d.epp_catalog_id);
            const missing = required.filter(r => !delivered.includes(r));
            const expired = deliveries.filter(d => new Date(d.calculated_replacement_date) < today);

            const complianceRate = required.length > 0
                ? Math.round(((required.length - missing.length - expired.length) / required.length) * 100)
                : 100;

            return {
                success: true,
                compliance: {
                    employee,
                    hasPosition: true,
                    required: requirements,
                    delivered: deliveries,
                    missing,
                    expired,
                    complianceRate: Math.max(0, complianceRate)
                }
            };
        } catch (error) {
            console.error('[HseService] Error getEmployeeCompliance:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Reporte de vencimientos
     */
    async getExpirationReport(companyId, daysAhead = 30) {
        try {
            const [results] = await sequelize.query(
                'SELECT * FROM get_expiring_epp($1, $2)',
                { bind: [companyId, daysAhead] }
            );

            return { success: true, report: results };
        } catch (error) {
            console.error('[HseService] Error getExpirationReport:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new HseService();
