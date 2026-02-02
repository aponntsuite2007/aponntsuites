/**
 * ============================================================================
 * SERVICIO: EmployeeLegal360Service - Expediente Legal 360° del Empleado
 * ============================================================================
 *
 * Sistema integral que consolida TODA la información legal de un empleado:
 * - Comunicaciones disciplinarias (SSOT: legal_communications)
 * - Asuntos judiciales/mediaciones (SSOT: user_legal_issues)
 * - Jurisdicción aplicable (detectada automáticamente)
 * - Timeline unificado de eventos legales
 * - Scoring de riesgo legal
 *
 * FUENTE ÚNICA DE VERDAD (SSOT):
 * - Disciplinario → legal_communications (tipo: disciplinaria, apercibimiento, suspension)
 * - Juicios/Mediaciones → user_legal_issues
 * - Jurisdicción → payroll_countries via company_branches
 *
 * @version 1.0.0
 * @date 2025-12-03
 * ============================================================================
 */

const { sequelize } = require('../config/database');
const LegalJurisdictionService = require('./LegalJurisdictionService');

class EmployeeLegal360Service {

    /**
     * Obtiene el expediente legal 360° completo de un empleado
     * @param {string} employeeId - UUID del empleado
     * @param {number} companyId - ID de la empresa
     * @returns {object} Expediente legal completo
     */
    static async getFullLegalReport(employeeId, companyId) {
        console.log(`⚖️ [LEGAL-360] Generando expediente legal para empleado ${employeeId}`);

        try {
            // 1. Obtener datos básicos del empleado y jurisdicción
            const [employeeData, jurisdiction] = await Promise.all([
                this.getEmployeeBasicInfo(employeeId, companyId),
                LegalJurisdictionService.getJurisdictionForEmployee(sequelize, employeeId)
            ]);

            if (!employeeData) {
                throw new Error('Empleado no encontrado');
            }

            // 2. Obtener datos legales de ambas fuentes SSOT
            const [
                disciplinaryRecords,
                judicialRecords,
                stats
            ] = await Promise.all([
                this.getDisciplinaryRecords(employeeId, companyId),
                this.getJudicialRecords(employeeId, companyId),
                this.getLegalStats(employeeId, companyId)
            ]);

            // 3. Generar timeline unificado
            const timeline = this.generateUnifiedTimeline(disciplinaryRecords, judicialRecords);

            // 4. Calcular scoring de riesgo legal
            const riskScoring = this.calculateLegalRiskScore(disciplinaryRecords, judicialRecords);

            // 5. Compilar expediente
            return {
                success: true,
                generatedAt: new Date().toISOString(),

                // Datos del empleado
                employee: employeeData,

                // Jurisdicción aplicable (detectada automáticamente)
                jurisdiction: {
                    countryCode: jurisdiction.countryCode,
                    countryName: jurisdiction.countryName,
                    region: jurisdiction.region,
                    laborLaw: jurisdiction.law ? {
                        name: jurisdiction.law.name,
                        code: jurisdiction.law.code,
                        fullName: jurisdiction.law.fullName,
                        disciplinaryArticles: jurisdiction.law.disciplinaryArticles,
                        dismissalArticles: jurisdiction.law.dismissalArticles,
                        authority: jurisdiction.law.authority,
                        requirements: jurisdiction.law.requirements
                    } : null,
                    source: jurisdiction.source
                },

                // Estadísticas consolidadas
                stats: {
                    ...stats,
                    riskScore: riskScoring.score,
                    riskLevel: riskScoring.level
                },

                // Tab: Disciplinarios (SSOT: legal_communications)
                disciplinary: {
                    total: disciplinaryRecords.length,
                    records: disciplinaryRecords,
                    summary: this.summarizeDisciplinary(disciplinaryRecords)
                },

                // Tab: Juicios y Mediaciones (SSOT: user_legal_issues)
                judicial: {
                    total: judicialRecords.length,
                    records: judicialRecords,
                    summary: this.summarizeJudicial(judicialRecords)
                },

                // Timeline unificado
                timeline: timeline,

                // Scoring y análisis de riesgo
                riskAnalysis: riskScoring
            };

        } catch (error) {
            console.error(`❌ [LEGAL-360] Error:`, error);
            throw error;
        }
    }

    /**
     * Obtiene información básica del empleado
     */
    static async getEmployeeBasicInfo(employeeId, companyId) {
        const result = await sequelize.query(`
            SELECT
                u.user_id as id,
                u.employee_id,
                u.first_name,
                u.last_name,
                u.email,
                u.dni,
                u.cuil,
                u.role,
                u.position,
                u.hire_date,
                u.is_active,
                d.name as department_name,
                c.name as company_name,
                cb.name as branch_name,
                pc.country_name,
                pc.country_code
            FROM users u
            LEFT JOIN departments d ON d.id = u.department_id
            LEFT JOIN companies c ON c.company_id = u.company_id
            LEFT JOIN company_branches cb ON cb.company_id = u.company_id AND cb.is_main = true
            LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
            WHERE u.user_id = :employeeId
            AND u.company_id = :companyId
        `, {
            replacements: { employeeId, companyId },
            type: sequelize.QueryTypes.SELECT
        });

        if (result.length === 0) return null;

        const emp = result[0];
        return {
            id: emp.id,
            employeeId: emp.employee_id,
            fullName: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
            firstName: emp.first_name,
            lastName: emp.last_name,
            email: emp.email,
            dni: emp.dni,
            cuil: emp.cuil,
            role: emp.role,
            position: emp.position,
            hireDate: emp.hire_date,
            isActive: emp.is_active,
            department: emp.department_name,
            company: emp.company_name,
            branch: emp.branch_name,
            country: emp.country_name,
            countryCode: emp.country_code
        };
    }

    /**
     * Obtiene registros disciplinarios (SSOT: legal_communications)
     * Incluye: apercibimientos, suspensiones, comunicaciones disciplinarias
     */
    static async getDisciplinaryRecords(employeeId, companyId) {
        const records = await sequelize.query(`
            SELECT
                lc.id,
                lc.reference_number,
                lc.subject,
                lc.description,
                lc.facts_description,
                lc.status,
                lc.created_at,
                lc.sent_date,
                lc.delivery_date,
                lc.response_date,
                lc.employee_response,
                lc.employee_accepted,
                lc.pdf_path,
                lc.notes,
                lct.id as type_id,
                lct.name as type_name,
                lct.category,
                lct.severity,
                lct.legal_basis,
                lct.creates_antecedent,
                creator.first_name || ' ' || creator.last_name as created_by_name
            FROM legal_communications lc
            JOIN legal_communication_types lct ON lct.id = lc.type_id
            LEFT JOIN users creator ON creator.user_id = lc.created_by
            WHERE lc.employee_id = :employeeId
            AND lc.company_id = :companyId
            ORDER BY lc.created_at DESC
        `, {
            replacements: { employeeId, companyId },
            type: sequelize.QueryTypes.SELECT
        });

        return records.map(r => ({
            id: r.id,
            referenceNumber: r.reference_number,
            subject: r.subject,
            description: r.description,
            factsDescription: r.facts_description,
            status: r.status,
            createdAt: r.created_at,
            sentDate: r.sent_date,
            deliveryDate: r.delivery_date,
            responseDate: r.response_date,
            employeeResponse: r.employee_response,
            employeeAccepted: r.employee_accepted,
            pdfPath: r.pdf_path,
            notes: r.notes,
            type: {
                id: r.type_id,
                name: r.type_name,
                category: r.category,
                severity: r.severity,
                legalBasis: r.legal_basis,
                createsAntecedent: r.creates_antecedent
            },
            createdByName: r.created_by_name,
            // Clasificación para UI
            severityClass: this.getSeverityClass(r.severity),
            statusClass: this.getStatusClass(r.status)
        }));
    }

    /**
     * Obtiene registros judiciales/mediaciones (SSOT: user_legal_issues)
     */
    static async getJudicialRecords(employeeId, companyId) {
        const records = await sequelize.query(`
            SELECT
                id,
                issue_type,
                issue_subtype,
                case_number,
                court,
                jurisdiction,
                filing_date,
                resolution_date,
                last_hearing_date,
                next_hearing_date,
                status,
                description,
                plaintiff,
                defendant,
                outcome,
                sentence_details,
                fine_amount,
                affects_employment,
                employment_restriction_details,
                document_url,
                notes,
                is_confidential,
                created_at,
                updated_at
            FROM user_legal_issues
            WHERE user_id = :employeeId
            AND company_id = :companyId
            ORDER BY filing_date DESC NULLS LAST, created_at DESC
        `, {
            replacements: { employeeId, companyId },
            type: sequelize.QueryTypes.SELECT
        });

        return records.map(r => ({
            id: r.id,
            issueType: r.issue_type,
            issueSubtype: r.issue_subtype,
            caseNumber: r.case_number,
            court: r.court,
            jurisdiction: r.jurisdiction,
            filingDate: r.filing_date,
            resolutionDate: r.resolution_date,
            lastHearingDate: r.last_hearing_date,
            nextHearingDate: r.next_hearing_date,
            status: r.status,
            description: r.description,
            plaintiff: r.plaintiff,
            defendant: r.defendant,
            outcome: r.outcome,
            sentenceDetails: r.sentence_details,
            fineAmount: r.fine_amount,
            affectsEmployment: r.affects_employment,
            employmentRestrictionDetails: r.employment_restriction_details,
            documentUrl: r.document_url,
            notes: r.notes,
            isConfidential: r.is_confidential,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            // Clasificación para UI
            typeLabel: this.getIssueTypeLabel(r.issue_type),
            statusClass: this.getJudicialStatusClass(r.status)
        }));
    }

    /**
     * Obtiene estadísticas legales consolidadas
     */
    static async getLegalStats(employeeId, companyId) {
        const stats = await sequelize.query(`
            SELECT
                -- Disciplinarios
                (SELECT COUNT(*) FROM legal_communications WHERE employee_id = :employeeId AND company_id = :companyId) as total_disciplinary,
                (SELECT COUNT(*) FROM legal_communications lc JOIN legal_communication_types lct ON lct.id = lc.type_id WHERE lc.employee_id = :employeeId AND lc.company_id = :companyId AND lct.severity = 'critical') as critical_count,
                (SELECT COUNT(*) FROM legal_communications lc JOIN legal_communication_types lct ON lct.id = lc.type_id WHERE lc.employee_id = :employeeId AND lc.company_id = :companyId AND lct.severity = 'high') as high_count,
                (SELECT COUNT(*) FROM legal_communications lc JOIN legal_communication_types lct ON lct.id = lc.type_id WHERE lc.employee_id = :employeeId AND lc.company_id = :companyId AND lct.category = 'disciplinaria') as sanctions_count,
                (SELECT COUNT(*) FROM legal_communications WHERE employee_id = :employeeId AND company_id = :companyId AND status = 'delivered') as delivered_count,
                -- Judiciales
                (SELECT COUNT(*) FROM user_legal_issues WHERE user_id = :employeeId AND company_id = :companyId) as total_judicial,
                (SELECT COUNT(*) FROM user_legal_issues WHERE user_id = :employeeId AND company_id = :companyId AND status = 'active') as active_judicial,
                (SELECT COUNT(*) FROM user_legal_issues WHERE user_id = :employeeId AND company_id = :companyId AND affects_employment = true) as affecting_employment,
                -- Últimos 12 meses
                (SELECT COUNT(*) FROM legal_communications WHERE employee_id = :employeeId AND company_id = :companyId AND created_at >= NOW() - INTERVAL '12 months') as disciplinary_last_year,
                (SELECT COUNT(*) FROM user_legal_issues WHERE user_id = :employeeId AND company_id = :companyId AND created_at >= NOW() - INTERVAL '12 months') as judicial_last_year
        `, {
            replacements: { employeeId, companyId },
            type: sequelize.QueryTypes.SELECT
        });

        const s = stats[0] || {};
        return {
            disciplinary: {
                total: parseInt(s.total_disciplinary) || 0,
                critical: parseInt(s.critical_count) || 0,
                high: parseInt(s.high_count) || 0,
                sanctions: parseInt(s.sanctions_count) || 0,
                delivered: parseInt(s.delivered_count) || 0,
                lastYear: parseInt(s.disciplinary_last_year) || 0
            },
            judicial: {
                total: parseInt(s.total_judicial) || 0,
                active: parseInt(s.active_judicial) || 0,
                affectingEmployment: parseInt(s.affecting_employment) || 0,
                lastYear: parseInt(s.judicial_last_year) || 0
            }
        };
    }

    /**
     * Genera timeline unificado de eventos legales
     */
    static generateUnifiedTimeline(disciplinaryRecords, judicialRecords) {
        const events = [];

        // Eventos disciplinarios
        disciplinaryRecords.forEach(r => {
            events.push({
                date: r.createdAt,
                type: 'disciplinary',
                category: r.type.category,
                severity: r.type.severity,
                title: r.type.name,
                description: r.subject,
                status: r.status,
                icon: this.getEventIcon('disciplinary', r.type.category),
                referenceId: r.id
            });

            // Si fue entregado, agregar ese evento también
            if (r.deliveryDate) {
                events.push({
                    date: r.deliveryDate,
                    type: 'disciplinary_delivered',
                    category: r.type.category,
                    severity: r.type.severity,
                    title: `${r.type.name} - Entregado`,
                    description: `Comunicación recibida por el empleado`,
                    status: 'delivered',
                    icon: '✅',
                    referenceId: r.id
                });
            }
        });

        // Eventos judiciales
        judicialRecords.forEach(r => {
            events.push({
                date: r.filingDate || r.createdAt,
                type: 'judicial',
                category: r.issueType,
                severity: r.affectsEmployment ? 'critical' : 'medium',
                title: r.typeLabel,
                description: r.description,
                status: r.status,
                icon: this.getEventIcon('judicial', r.issueType),
                referenceId: r.id
            });

            // Próxima audiencia
            if (r.nextHearingDate && new Date(r.nextHearingDate) > new Date()) {
                events.push({
                    date: r.nextHearingDate,
                    type: 'hearing_scheduled',
                    category: r.issueType,
                    severity: 'high',
                    title: 'Próxima Audiencia',
                    description: `${r.typeLabel} - ${r.court || 'Tribunal'}`,
                    status: 'scheduled',
                    icon: '📅',
                    referenceId: r.id
                });
            }
        });

        // Ordenar por fecha descendente
        return events.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Calcula score de riesgo legal
     */
    static calculateLegalRiskScore(disciplinaryRecords, judicialRecords) {
        let score = 0;
        const factors = [];

        // Factor: Cantidad de disciplinarios
        const totalDisciplinary = disciplinaryRecords.length;
        if (totalDisciplinary > 0) {
            score += Math.min(totalDisciplinary * 10, 30);
            factors.push({
                name: 'Antecedentes disciplinarios',
                value: totalDisciplinary,
                impact: Math.min(totalDisciplinary * 10, 30)
            });
        }

        // Factor: Severidad de disciplinarios
        const criticalCount = disciplinaryRecords.filter(r => r.type.severity === 'critical').length;
        const highCount = disciplinaryRecords.filter(r => r.type.severity === 'high').length;
        if (criticalCount > 0) {
            score += criticalCount * 20;
            factors.push({ name: 'Medidas críticas', value: criticalCount, impact: criticalCount * 20 });
        }
        if (highCount > 0) {
            score += highCount * 10;
            factors.push({ name: 'Medidas severas', value: highCount, impact: highCount * 10 });
        }

        // Factor: Juicios activos
        const activeJudicial = judicialRecords.filter(r => r.status === 'active').length;
        if (activeJudicial > 0) {
            score += activeJudicial * 25;
            factors.push({ name: 'Juicios activos', value: activeJudicial, impact: activeJudicial * 25 });
        }

        // Factor: Juicios que afectan empleo
        const affectingEmployment = judicialRecords.filter(r => r.affectsEmployment).length;
        if (affectingEmployment > 0) {
            score += affectingEmployment * 15;
            factors.push({ name: 'Restricciones laborales', value: affectingEmployment, impact: affectingEmployment * 15 });
        }

        // Normalizar a 0-100
        score = Math.min(score, 100);

        // Determinar nivel
        let level = 'low';
        if (score >= 70) level = 'critical';
        else if (score >= 50) level = 'high';
        else if (score >= 25) level = 'medium';

        return {
            score,
            level,
            factors,
            recommendation: this.getRiskRecommendation(level)
        };
    }

    /**
     * Resume registros disciplinarios
     */
    static summarizeDisciplinary(records) {
        if (records.length === 0) {
            return { hasRecords: false, message: 'Sin antecedentes disciplinarios' };
        }

        const byType = {};
        const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };

        records.forEach(r => {
            byType[r.type.name] = (byType[r.type.name] || 0) + 1;
            bySeverity[r.type.severity] = (bySeverity[r.type.severity] || 0) + 1;
        });

        return {
            hasRecords: true,
            total: records.length,
            byType,
            bySeverity,
            mostRecent: records[0] ? {
                date: records[0].createdAt,
                type: records[0].type.name
            } : null
        };
    }

    /**
     * Resume registros judiciales
     */
    static summarizeJudicial(records) {
        if (records.length === 0) {
            return { hasRecords: false, message: 'Sin antecedentes judiciales' };
        }

        const byType = {};
        const byStatus = {};

        records.forEach(r => {
            byType[r.issueType] = (byType[r.issueType] || 0) + 1;
            byStatus[r.status] = (byStatus[r.status] || 0) + 1;
        });

        const upcomingHearings = records
            .filter(r => r.nextHearingDate && new Date(r.nextHearingDate) > new Date())
            .sort((a, b) => new Date(a.nextHearingDate) - new Date(b.nextHearingDate));

        return {
            hasRecords: true,
            total: records.length,
            byType,
            byStatus,
            activeCount: records.filter(r => r.status === 'active').length,
            upcomingHearings: upcomingHearings.slice(0, 3).map(r => ({
                date: r.nextHearingDate,
                type: r.typeLabel,
                court: r.court
            }))
        };
    }

    // =========================================================================
    // HELPERS
    // =========================================================================
    static getSeverityClass(severity) {
        const map = { critical: 'danger', high: 'warning', medium: 'info', low: 'success' };
        return map[severity] || 'secondary';
    }

    static getStatusClass(status) {
        const map = { draft: 'secondary', sent: 'info', delivered: 'success', closed: 'dark' };
        return map[status] || 'secondary';
    }

    static getJudicialStatusClass(status) {
        const map = { activo: 'danger', en_proceso: 'warning', resuelto: 'success', archivado: 'secondary' };
        return map[status] || 'secondary';
    }

    static getIssueTypeLabel(type) {
        const map = {
            'juicio_laboral': 'Juicio Laboral',
            'mediacion': 'Mediación',
            'conciliacion': 'Conciliación',
            'denuncia_administrativa': 'Denuncia Administrativa',
            'reclamo_sindical': 'Reclamo Sindical',
            'demanda_civil': 'Demanda Civil',
            'otro': 'Otro'
        };
        return map[type] || type || 'Asunto Legal';
    }

    static getEventIcon(type, category) {
        if (type === 'judicial') {
            return category === 'mediacion' ? '🤝' : '⚖️';
        }
        const icons = {
            'disciplinaria': '⚠️',
            'despido': '🚫',
            'informativa': '📋',
            'contractual': '📝'
        };
        return icons[category] || '📄';
    }

    static getRiskRecommendation(level) {
        const recommendations = {
            critical: 'Atención inmediata requerida. Consultar con área legal antes de cualquier decisión.',
            high: 'Situación delicada. Documentar todas las acciones y considerar asesoría legal.',
            medium: 'Monitoreo recomendado. Mantener registro actualizado de incidentes.',
            low: 'Sin riesgo significativo. Continuar con procedimientos estándar.'
        };
        return recommendations[level] || recommendations.low;
    }
}

module.exports = EmployeeLegal360Service;
