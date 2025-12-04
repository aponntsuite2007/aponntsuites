/**
 * ConceptDependencyService
 * Servicio para gestión del sistema de dependencias de conceptos de liquidación
 * Multi-tenant: todas las operaciones están aisladas por company_id
 */

const db = require('../config/database');
const { Op } = require('sequelize');

class ConceptDependencyService {

    // =========================================================================
    // DEPENDENCY TYPES (Sistema - Solo lectura para empresas)
    // =========================================================================

    /**
     * Obtener todos los tipos de dependencia del sistema
     */
    async getDependencyTypes() {
        try {
            const types = await db.DependencyType.findAll({
                where: { is_active: true },
                order: [['display_order', 'ASC'], ['type_name', 'ASC']]
            });
            return { success: true, data: types };
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error getting dependency types:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // COMPANY DEPENDENCIES (Multi-tenant CRUD)
    // =========================================================================

    /**
     * Obtener todas las dependencias de una empresa
     */
    async getCompanyDependencies(companyId, filters = {}) {
        try {
            const where = { company_id: companyId };

            if (filters.is_active !== undefined) {
                where.is_active = filters.is_active;
            }

            if (filters.dependency_type_id) {
                where.dependency_type_id = filters.dependency_type_id;
            }

            if (filters.search) {
                where[Op.or] = [
                    { dependency_name: { [Op.iLike]: `%${filters.search}%` } },
                    { dependency_code: { [Op.iLike]: `%${filters.search}%` } }
                ];
            }

            const dependencies = await db.CompanyDependency.findAll({
                where,
                include: [
                    { model: db.DependencyType, as: 'dependencyType' },
                    { model: db.User, as: 'creator', attributes: ['user_id', 'firstName', 'lastName'] }
                ],
                order: [['display_order', 'ASC'], ['dependency_name', 'ASC']]
            });

            return { success: true, data: dependencies };
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error getting company dependencies:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener una dependencia específica
     */
    async getCompanyDependencyById(companyId, dependencyId) {
        try {
            const dependency = await db.CompanyDependency.findOne({
                where: { id: dependencyId, company_id: companyId },
                include: [
                    { model: db.DependencyType, as: 'dependencyType' },
                    { model: db.User, as: 'creator', attributes: ['user_id', 'firstName', 'lastName'] },
                    {
                        model: db.ConceptDependency,
                        as: 'conceptDependencies',
                        include: [{ model: db.PayrollTemplateConcept, as: 'concept' }]
                    }
                ]
            });

            if (!dependency) {
                return { success: false, error: 'Dependency not found', status: 404 };
            }

            return { success: true, data: dependency };
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error getting dependency:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Crear nueva dependencia para una empresa
     */
    async createCompanyDependency(companyId, data, userId) {
        try {
            // Verificar que el código no exista en esta empresa
            const existing = await db.CompanyDependency.findOne({
                where: {
                    company_id: companyId,
                    dependency_code: data.dependency_code
                }
            });

            if (existing) {
                return {
                    success: false,
                    error: `El código "${data.dependency_code}" ya existe en esta empresa`,
                    status: 409
                };
            }

            // Verificar que el tipo de dependencia existe
            const depType = await db.DependencyType.findByPk(data.dependency_type_id);
            if (!depType) {
                return { success: false, error: 'Tipo de dependencia no válido', status: 400 };
            }

            const dependency = await db.CompanyDependency.create({
                company_id: companyId,
                dependency_code: data.dependency_code,
                dependency_name: data.dependency_name,
                dependency_name_i18n: data.dependency_name_i18n || {},
                description: data.description,
                dependency_type_id: data.dependency_type_id,
                config: data.config || {},
                icon: data.icon,
                color_hex: data.color_hex,
                display_order: data.display_order || 0,
                is_active: data.is_active !== false,
                created_by: userId
            });

            // Recargar con asociaciones
            const created = await this.getCompanyDependencyById(companyId, dependency.id);
            return created;
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error creating dependency:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Actualizar dependencia existente
     */
    async updateCompanyDependency(companyId, dependencyId, data) {
        try {
            const dependency = await db.CompanyDependency.findOne({
                where: { id: dependencyId, company_id: companyId }
            });

            if (!dependency) {
                return { success: false, error: 'Dependency not found', status: 404 };
            }

            // Si cambia el código, verificar que no exista
            if (data.dependency_code && data.dependency_code !== dependency.dependency_code) {
                const existing = await db.CompanyDependency.findOne({
                    where: {
                        company_id: companyId,
                        dependency_code: data.dependency_code,
                        id: { [Op.ne]: dependencyId }
                    }
                });

                if (existing) {
                    return {
                        success: false,
                        error: `El código "${data.dependency_code}" ya existe`,
                        status: 409
                    };
                }
            }

            await dependency.update({
                dependency_code: data.dependency_code ?? dependency.dependency_code,
                dependency_name: data.dependency_name ?? dependency.dependency_name,
                dependency_name_i18n: data.dependency_name_i18n ?? dependency.dependency_name_i18n,
                description: data.description ?? dependency.description,
                dependency_type_id: data.dependency_type_id ?? dependency.dependency_type_id,
                config: data.config ?? dependency.config,
                icon: data.icon ?? dependency.icon,
                color_hex: data.color_hex ?? dependency.color_hex,
                display_order: data.display_order ?? dependency.display_order,
                is_active: data.is_active ?? dependency.is_active
            });

            return await this.getCompanyDependencyById(companyId, dependencyId);
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error updating dependency:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Eliminar dependencia (soft delete - desactivar)
     */
    async deleteCompanyDependency(companyId, dependencyId, hardDelete = false) {
        try {
            const dependency = await db.CompanyDependency.findOne({
                where: { id: dependencyId, company_id: companyId }
            });

            if (!dependency) {
                return { success: false, error: 'Dependency not found', status: 404 };
            }

            // Verificar si tiene conceptos vinculados activos
            const linkedConcepts = await db.ConceptDependency.count({
                where: { dependency_id: dependencyId, is_active: true }
            });

            if (linkedConcepts > 0 && hardDelete) {
                return {
                    success: false,
                    error: `No se puede eliminar: ${linkedConcepts} conceptos dependen de esta dependencia`,
                    status: 409
                };
            }

            if (hardDelete) {
                await dependency.destroy();
            } else {
                await dependency.update({ is_active: false });
            }

            return { success: true, message: 'Dependency deleted successfully' };
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error deleting dependency:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // CONCEPT DEPENDENCIES (Vincular conceptos a dependencias)
    // =========================================================================

    /**
     * Vincular una dependencia a un concepto de liquidación
     */
    async linkDependencyToConcept(companyId, data) {
        try {
            // Verificar que el concepto existe y pertenece a la empresa
            const concept = await db.PayrollTemplateConcept.findByPk(data.concept_id);
            if (!concept) {
                return { success: false, error: 'Concepto no encontrado', status: 404 };
            }

            // Verificar que la dependencia existe y pertenece a la empresa
            const dependency = await db.CompanyDependency.findOne({
                where: { id: data.dependency_id, company_id: companyId }
            });
            if (!dependency) {
                return { success: false, error: 'Dependencia no encontrada', status: 404 };
            }

            // Verificar si ya existe el vínculo
            const existing = await db.ConceptDependency.findOne({
                where: { concept_id: data.concept_id, dependency_id: data.dependency_id }
            });

            if (existing) {
                return { success: false, error: 'Este vínculo ya existe', status: 409 };
            }

            const link = await db.ConceptDependency.create({
                company_id: companyId,
                concept_id: data.concept_id,
                dependency_id: data.dependency_id,
                on_failure: data.on_failure || 'SKIP',
                failure_message: data.failure_message,
                multiplier_mode: data.multiplier_mode || 'NONE',
                evaluation_order: data.evaluation_order || 0,
                is_active: true
            });

            return { success: true, data: link };
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error linking dependency:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Desvincular una dependencia de un concepto
     */
    async unlinkDependencyFromConcept(companyId, conceptId, dependencyId) {
        try {
            const link = await db.ConceptDependency.findOne({
                where: {
                    company_id: companyId,
                    concept_id: conceptId,
                    dependency_id: dependencyId
                }
            });

            if (!link) {
                return { success: false, error: 'Vínculo no encontrado', status: 404 };
            }

            await link.destroy();
            return { success: true, message: 'Vínculo eliminado correctamente' };
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error unlinking dependency:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener dependencias de un concepto
     */
    async getConceptDependencies(companyId, conceptId) {
        try {
            const dependencies = await db.ConceptDependency.findAll({
                where: { company_id: companyId, concept_id: conceptId, is_active: true },
                include: [
                    {
                        model: db.CompanyDependency,
                        as: 'dependency',
                        include: [{ model: db.DependencyType, as: 'dependencyType' }]
                    }
                ],
                order: [['evaluation_order', 'ASC']]
            });

            return { success: true, data: dependencies };
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error getting concept dependencies:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // EMPLOYEE DOCUMENTS (Documentos subidos por empleados)
    // =========================================================================

    /**
     * Obtener documentos de un empleado
     */
    async getEmployeeDocuments(companyId, userId, filters = {}) {
        try {
            const where = { company_id: companyId, user_id: userId };

            if (filters.dependency_id) {
                where.dependency_id = filters.dependency_id;
            }

            if (filters.status) {
                where.status = filters.status;
            }

            if (filters.is_current !== undefined) {
                where.is_current = filters.is_current;
            }

            if (filters.family_member_type) {
                where.family_member_type = filters.family_member_type;
            }

            const documents = await db.EmployeeDependencyDocument.findAll({
                where,
                include: [
                    {
                        model: db.CompanyDependency,
                        as: 'dependency',
                        include: [{ model: db.DependencyType, as: 'dependencyType' }]
                    },
                    { model: db.User, as: 'uploader', attributes: ['user_id', 'firstName', 'lastName'] },
                    { model: db.User, as: 'reviewer', attributes: ['user_id', 'firstName', 'lastName'] }
                ],
                order: [['created_at', 'DESC']]
            });

            return { success: true, data: documents };
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error getting employee documents:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Crear documento de empleado
     */
    async createEmployeeDocument(companyId, userId, data, uploaderId) {
        try {
            // Verificar que la dependencia existe y pertenece a la empresa
            const dependency = await db.CompanyDependency.findOne({
                where: { id: data.dependency_id, company_id: companyId }
            });

            if (!dependency) {
                return { success: false, error: 'Dependencia no encontrada', status: 404 };
            }

            // Si hay documento previo vigente para la misma dependencia/familiar, marcarlo como reemplazado
            if (data.family_member_type && data.family_member_id) {
                await db.EmployeeDependencyDocument.update(
                    { is_current: false },
                    {
                        where: {
                            company_id: companyId,
                            user_id: userId,
                            dependency_id: data.dependency_id,
                            family_member_type: data.family_member_type,
                            family_member_id: data.family_member_id,
                            is_current: true
                        }
                    }
                );
            }

            const document = await db.EmployeeDependencyDocument.create({
                company_id: companyId,
                user_id: userId,
                dependency_id: data.dependency_id,
                family_member_type: data.family_member_type || 'SELF',
                family_member_id: data.family_member_id,
                family_member_name: data.family_member_name,
                issue_date: data.issue_date,
                expiration_date: data.expiration_date,
                file_url: data.file_url,
                file_name: data.file_name,
                file_size: data.file_size,
                file_mime_type: data.file_mime_type,
                notes: data.notes,
                uploaded_by: uploaderId,
                status: data.expiration_date ? 'VALID' : 'PENDING_REVIEW',
                is_current: true
            });

            // Calcular status si tiene fecha de vencimiento
            if (document.updateStatus) {
                document.updateStatus();
                await document.save();
            }

            return { success: true, data: document };
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error creating employee document:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Actualizar documento de empleado
     */
    async updateEmployeeDocument(companyId, documentId, data, reviewerId = null) {
        try {
            const document = await db.EmployeeDependencyDocument.findOne({
                where: { id: documentId, company_id: companyId }
            });

            if (!document) {
                return { success: false, error: 'Documento no encontrado', status: 404 };
            }

            const updateData = {
                issue_date: data.issue_date ?? document.issue_date,
                expiration_date: data.expiration_date ?? document.expiration_date,
                notes: data.notes ?? document.notes,
                status: data.status ?? document.status
            };

            // Si se está revisando el documento
            if (data.status && reviewerId) {
                updateData.reviewed_by = reviewerId;
                updateData.reviewed_at = new Date();
                updateData.review_notes = data.review_notes;
            }

            await document.update(updateData);

            // Recalcular status si tiene fecha de vencimiento
            if (document.updateStatus && document.expiration_date) {
                document.updateStatus();
                await document.save();
            }

            return { success: true, data: document };
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error updating employee document:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Eliminar documento de empleado
     */
    async deleteEmployeeDocument(companyId, documentId) {
        try {
            const document = await db.EmployeeDependencyDocument.findOne({
                where: { id: documentId, company_id: companyId }
            });

            if (!document) {
                return { success: false, error: 'Documento no encontrado', status: 404 };
            }

            await document.destroy();
            return { success: true, message: 'Documento eliminado correctamente' };
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error deleting employee document:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // EVALUACIÓN DE DEPENDENCIAS (Para el calculador de liquidación)
    // =========================================================================

    /**
     * Evaluar si un empleado cumple con las dependencias de un concepto
     * Retorna: { applies: boolean, amount: number, reason: string, details: {} }
     */
    async evaluateConceptDependencies(companyId, userId, conceptId, originalAmount, payrollPeriod = null) {
        try {
            // Obtener las dependencias del concepto
            const conceptDeps = await db.ConceptDependency.findAll({
                where: { company_id: companyId, concept_id: conceptId, is_active: true },
                include: [{
                    model: db.CompanyDependency,
                    as: 'dependency',
                    include: [{ model: db.DependencyType, as: 'dependencyType' }]
                }],
                order: [['evaluation_order', 'ASC']]
            });

            if (conceptDeps.length === 0) {
                // Sin dependencias = aplicar siempre
                return {
                    applies: true,
                    amount: originalAmount,
                    reason: 'Sin dependencias configuradas',
                    evaluations: []
                };
            }

            const evaluations = [];
            let finalAmount = originalAmount;
            let applies = true;
            let mainReason = '';

            for (const conceptDep of conceptDeps) {
                const dep = conceptDep.dependency;
                const depType = dep.dependencyType;

                // Evaluar según el tipo de dependencia
                const evalResult = await this._evaluateSingleDependency(
                    companyId, userId, dep, depType
                );

                // Registrar evaluación
                const evaluation = {
                    dependency_id: dep.id,
                    dependency_name: dep.dependency_name,
                    result: evalResult.passed,
                    details: evalResult.details,
                    action: null,
                    original_amount: originalAmount,
                    final_amount: originalAmount
                };

                if (!evalResult.passed) {
                    // Dependencia no cumplida - aplicar acción según configuración
                    switch (conceptDep.on_failure) {
                        case 'SKIP':
                            applies = false;
                            finalAmount = 0;
                            mainReason = conceptDep.failure_message ||
                                `No cumple: ${dep.dependency_name}`;
                            evaluation.action = 'SKIPPED';
                            evaluation.final_amount = 0;
                            break;

                        case 'REDUCE_PROPORTIONAL':
                            // Reducir proporcionalmente según cuántos válidos hay
                            const ratio = evalResult.validCount / evalResult.totalCount || 0;
                            finalAmount = originalAmount * ratio;
                            mainReason = `Reducido ${Math.round((1-ratio)*100)}%: ${evalResult.message}`;
                            evaluation.action = 'REDUCED';
                            evaluation.final_amount = finalAmount;
                            break;

                        case 'WARN_ONLY':
                            // Solo advertir, aplicar de todas formas
                            mainReason = `Advertencia: ${evalResult.message}`;
                            evaluation.action = 'WARNED';
                            break;
                    }
                } else {
                    evaluation.action = 'APPLIED';

                    // Si el modo es PER_VALID, multiplicar por cantidad de válidos
                    if (conceptDep.multiplier_mode === 'PER_VALID' && evalResult.validCount) {
                        finalAmount = originalAmount * evalResult.validCount;
                        evaluation.final_amount = finalAmount;
                    }
                }

                evaluations.push(evaluation);

                // Si se omitió, no seguir evaluando
                if (!applies) break;
            }

            // Guardar evaluaciones en auditoría
            if (payrollPeriod) {
                await this._saveEvaluations(companyId, userId, conceptId, evaluations, payrollPeriod);
            }

            return {
                applies,
                amount: finalAmount,
                reason: mainReason || 'Todas las dependencias cumplidas',
                evaluations
            };
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error evaluating dependencies:', error);
            return {
                applies: false,
                amount: 0,
                reason: `Error evaluando dependencias: ${error.message}`,
                evaluations: []
            };
        }
    }

    /**
     * Evaluar una dependencia individual
     */
    async _evaluateSingleDependency(companyId, userId, dependency, depType) {
        const typeCode = depType.type_code;
        const config = dependency.config || {};

        switch (typeCode) {
            case 'DOCUMENT_VALID':
                return await this._evaluateDocumentDependency(companyId, userId, dependency.id, config);

            case 'ATTENDANCE_RULE':
                return await this._evaluateAttendanceRule(companyId, userId, config);

            case 'FAMILY_CONDITION':
                return await this._evaluateFamilyCondition(companyId, userId, config);

            case 'CUSTOM_FORMULA':
                return await this._evaluateCustomFormula(companyId, userId, config);

            default:
                return { passed: true, details: { message: 'Tipo no evaluable' } };
        }
    }

    /**
     * Evaluar dependencia de documento válido
     */
    async _evaluateDocumentDependency(companyId, userId, dependencyId, config) {
        // Buscar documentos vigentes para esta dependencia
        const documents = await db.EmployeeDependencyDocument.findAll({
            where: {
                company_id: companyId,
                user_id: userId,
                dependency_id: dependencyId,
                is_current: true,
                status: { [Op.in]: ['VALID', 'EXPIRING_SOON'] }
            }
        });

        // Si config especifica que debe aplicar a familiares
        if (config.applies_to_family) {
            const familyDocs = documents.filter(d => d.family_member_type !== 'SELF');
            const validCount = familyDocs.length;
            const totalCount = config.expected_count || 1;

            return {
                passed: validCount >= totalCount,
                validCount,
                totalCount,
                message: `${validCount} de ${totalCount} documentos válidos para familiares`,
                details: { documents: familyDocs.map(d => ({
                    id: d.id,
                    family_member: d.family_member_name,
                    expires: d.expiration_date
                }))}
            };
        }

        // Documento del empleado mismo
        const valid = documents.length > 0;
        return {
            passed: valid,
            validCount: valid ? 1 : 0,
            totalCount: 1,
            message: valid ? 'Documento válido encontrado' : 'Documento no encontrado o vencido',
            details: { documents: documents.map(d => ({ id: d.id, expires: d.expiration_date })) }
        };
    }

    /**
     * Evaluar regla de asistencia
     */
    async _evaluateAttendanceRule(companyId, userId, config) {
        // Implementación básica - puede extenderse
        // Ejemplo: config = { min_attendance_percent: 80, period_days: 30 }

        const periodDays = config.period_days || 30;
        const minPercent = config.min_attendance_percent || 80;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        // Contar asistencias en el período
        const attendances = await db.Attendance.count({
            where: {
                user_id: userId,
                timestamp: { [Op.gte]: startDate },
                status: 'present'
            }
        });

        // Calcular días hábiles (simplificado - excluye fines de semana)
        const workDays = Math.round(periodDays * 5 / 7);
        const percent = (attendances / workDays) * 100;

        return {
            passed: percent >= minPercent,
            validCount: attendances,
            totalCount: workDays,
            message: `Asistencia ${percent.toFixed(1)}% (requerido: ${minPercent}%)`,
            details: { attendances, workDays, percent }
        };
    }

    /**
     * Evaluar condición familiar
     */
    async _evaluateFamilyCondition(companyId, userId, config) {
        // Ejemplo: config = { requires_children: true, min_age: 0, max_age: 18 }

        if (config.requires_children) {
            // Buscar hijos en el rango de edad
            const children = await db.sequelize.query(`
                SELECT id, name, birthdate
                FROM user_children
                WHERE user_id = :userId
                  AND birthdate IS NOT NULL
            `, {
                replacements: { userId },
                type: db.sequelize.QueryTypes.SELECT
            }).catch(() => []);

            const today = new Date();
            const validChildren = children.filter(child => {
                const birth = new Date(child.birthdate);
                const age = (today - birth) / (365.25 * 24 * 60 * 60 * 1000);
                return age >= (config.min_age || 0) && age <= (config.max_age || 99);
            });

            return {
                passed: validChildren.length > 0,
                validCount: validChildren.length,
                totalCount: children.length,
                message: `${validChildren.length} hijos en rango de edad`,
                details: { children: validChildren }
            };
        }

        return { passed: true, details: {} };
    }

    /**
     * Evaluar fórmula personalizada
     */
    async _evaluateCustomFormula(companyId, userId, config) {
        // Las fórmulas personalizadas se evalúan según la expresión en config.formula
        // Por ahora retornamos true - se puede implementar un parser de fórmulas

        if (config.formula) {
            // TODO: Implementar parser de fórmulas seguro
            console.log('[DEPENDENCY-SERVICE] Custom formula evaluation not implemented:', config.formula);
        }

        return { passed: true, details: { note: 'Custom formula - auto-pass' } };
    }

    /**
     * Guardar evaluaciones en auditoría
     */
    async _saveEvaluations(companyId, userId, conceptId, evaluations, payrollPeriod) {
        try {
            for (const evalItem of evaluations) {
                await db.DependencyEvaluation.create({
                    company_id: companyId,
                    user_id: userId,
                    concept_id: conceptId,
                    dependency_id: evalItem.dependency_id,
                    payroll_period: payrollPeriod,
                    evaluation_result: evalItem.result,
                    evaluation_details: evalItem.details,
                    action_taken: evalItem.action,
                    original_amount: evalItem.original_amount,
                    final_amount: evalItem.final_amount,
                    reduction_reason: evalItem.result ? null : evalItem.details?.message
                });
            }
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error saving evaluations:', error);
        }
    }

    // =========================================================================
    // REPORTES Y ESTADÍSTICAS
    // =========================================================================

    /**
     * Obtener documentos próximos a vencer
     */
    async getExpiringDocuments(companyId, daysAhead = 30) {
        try {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysAhead);

            const documents = await db.EmployeeDependencyDocument.findAll({
                where: {
                    company_id: companyId,
                    is_current: true,
                    expiration_date: {
                        [Op.lte]: futureDate,
                        [Op.gte]: new Date()
                    }
                },
                include: [
                    { model: db.User, as: 'employee', attributes: ['user_id', 'firstName', 'lastName', 'email'] },
                    { model: db.CompanyDependency, as: 'dependency' }
                ],
                order: [['expiration_date', 'ASC']]
            });

            return { success: true, data: documents };
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error getting expiring documents:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener estadísticas de dependencias de la empresa
     */
    async getDependencyStats(companyId) {
        try {
            const [
                totalDependencies,
                totalDocuments,
                validDocuments,
                expiringDocuments,
                expiredDocuments
            ] = await Promise.all([
                db.CompanyDependency.count({ where: { company_id: companyId, is_active: true } }),
                db.EmployeeDependencyDocument.count({ where: { company_id: companyId, is_current: true } }),
                db.EmployeeDependencyDocument.count({ where: { company_id: companyId, is_current: true, status: 'VALID' } }),
                db.EmployeeDependencyDocument.count({ where: { company_id: companyId, is_current: true, status: 'EXPIRING_SOON' } }),
                db.EmployeeDependencyDocument.count({ where: { company_id: companyId, is_current: true, status: 'EXPIRED' } })
            ]);

            return {
                success: true,
                data: {
                    totalDependencies,
                    totalDocuments,
                    validDocuments,
                    expiringDocuments,
                    expiredDocuments,
                    complianceRate: totalDocuments > 0
                        ? Math.round((validDocuments / totalDocuments) * 100)
                        : 100
                }
            };
        } catch (error) {
            console.error('[DEPENDENCY-SERVICE] Error getting stats:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new ConceptDependencyService();
