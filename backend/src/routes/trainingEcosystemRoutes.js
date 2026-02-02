/**
 * ============================================================================
 * RUTAS API: Ecosistema de Capacitaciones
 * ============================================================================
 *
 * Endpoints para gestionar las integraciones del ecosistema de capacitaciones
 * con los módulos afluentes: HSE, Medical, ART, Procedures, Risk Intelligence
 *
 * @version 1.0.0
 * @date 2026-02-01
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Importar servicios de integración
const TrainingEcosystemHub = require('../services/integrations/TrainingEcosystemHub');
const HSETrainingIntegration = require('../services/integrations/hse-training-integration');
const MedicalTrainingIntegration = require('../services/integrations/medical-training-integration');
const ARTTrainingIntegration = require('../services/integrations/art-training-integration');
const ProceduresTrainingIntegration = require('../services/integrations/procedures-training-integration');
const RiskTrainingIntegration = require('../services/integrations/risk-training-integration');

// ============================================================================
// ESTADÍSTICAS DEL ECOSISTEMA
// ============================================================================

/**
 * @route GET /api/v1/training-ecosystem/stats
 * @desc Obtener estadísticas de asignaciones por módulo origen
 */
router.get('/stats', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id || 11;

        const stats = await TrainingEcosystemHub.getAssignmentsBySource(companyId);

        // Calcular totales
        const totals = {
            total: 0,
            completed: 0,
            in_progress: 0,
            pending: 0,
            auto_assigned: 0
        };

        for (const row of stats) {
            totals.total += parseInt(row.total_assignments) || 0;
            totals.completed += parseInt(row.completed) || 0;
            totals.in_progress += parseInt(row.in_progress) || 0;
            totals.pending += parseInt(row.pending) || 0;
            totals.auto_assigned += parseInt(row.auto_assigned_count) || 0;
        }

        res.json({
            success: true,
            stats: {
                bySource: stats,
                totals,
                autoAssignedPercentage: totals.total > 0
                    ? Math.round((totals.auto_assigned / totals.total) * 100)
                    : 0
            }
        });

    } catch (error) {
        console.error('❌ [ECOSYSTEM] Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas del ecosistema'
        });
    }
});

/**
 * @route GET /api/v1/training-ecosystem/integration-log
 * @desc Obtener historial de integraciones
 */
router.get('/integration-log', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id || 11;
        const { source_module, limit = 50, offset = 0 } = req.query;

        const log = await TrainingEcosystemHub.getIntegrationHistory(companyId, {
            sourceModule: source_module,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            log,
            count: log.length
        });

    } catch (error) {
        console.error('❌ [ECOSYSTEM] Error obteniendo log:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo historial de integraciones'
        });
    }
});

/**
 * @route GET /api/v1/training-ecosystem/circuits
 * @desc Obtener información de los circuitos de integración
 */
router.get('/circuits', auth, async (req, res) => {
    try {
        // Información estática de los circuitos
        const circuits = {
            hse: {
                name: 'HSE → Training',
                description: 'Violaciones de seguridad disparan capacitaciones de EPP',
                trigger: 'Caso HSE confirmado o detección de PPE faltante',
                priority: 'HIGH',
                active: true,
                mappings: [
                    { code: 'NO_HELMET', training: 'Protección cabeza' },
                    { code: 'NO_GLOVES', training: 'Protección manos' },
                    { code: 'NO_GOGGLES', training: 'Protección visual' },
                    { code: 'NO_HARNESS', training: 'Trabajo en altura' }
                ]
            },
            medical: {
                name: 'Medical → Training',
                description: 'Deficiencias médicas generan capacitaciones remediales',
                trigger: 'Examen médico con deficiencia detectada',
                priority: 'NORMAL',
                active: true,
                validatesEligibility: true,
                mappings: [
                    { deficiency: 'audiometry_deficient', training: 'Protección auditiva' },
                    { deficiency: 'visual_impaired', training: 'Seguridad visual' },
                    { deficiency: 'ergonomic_problems', training: 'Ergonomía' }
                ]
            },
            art: {
                name: 'ART → Training',
                description: 'Accidentes generan capacitaciones de reinserción y prevención',
                trigger: 'Cierre de accidente / Alta médica',
                priority: 'CRITICAL',
                active: true,
                affectsArea: true,
                mappings: [
                    { accident: 'caida_altura', training: 'Trabajo en altura' },
                    { accident: 'atrapamiento', training: 'LOTO' },
                    { accident: 'electrico', training: 'Riesgo eléctrico' }
                ]
            },
            procedures: {
                name: 'Procedures → Training',
                description: 'Nuevos procedimientos requieren capacitación obligatoria',
                trigger: 'Procedimiento publicado o actualizado con cambios críticos',
                priority: 'HIGH',
                active: true,
                retrainOnUpdate: true
            },
            risk_intelligence: {
                name: 'Risk Intelligence → Training',
                description: 'Scores de riesgo altos priorizan capacitaciones preventivas',
                trigger: 'Score ≥ 80 o alerta de riesgo activa',
                priority: 'Variable según score',
                active: true,
                thresholds: {
                    critical: 80,
                    high: 60,
                    normal: 40
                }
            }
        };

        res.json({
            success: true,
            circuits
        });

    } catch (error) {
        console.error('❌ [ECOSYSTEM] Error obteniendo circuitos:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo información de circuitos'
        });
    }
});

// ============================================================================
// ENDPOINTS DE INTEGRACIÓN MANUAL (para testing y casos especiales)
// ============================================================================

/**
 * @route POST /api/v1/training-ecosystem/trigger/hse
 * @desc Disparar integración HSE manualmente
 */
router.post('/trigger/hse', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id || 11;
        const { userId, violationCode, caseId, caseNumber } = req.body;

        if (!userId || !violationCode) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere userId y violationCode'
            });
        }

        const result = await TrainingEcosystemHub.onHSEViolation({
            violationCode,
            userId,
            companyId,
            caseId: caseId || 0,
            caseNumber: caseNumber || 'MANUAL'
        });

        res.json({
            success: result.success,
            result
        });

    } catch (error) {
        console.error('❌ [ECOSYSTEM] Error en trigger HSE:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route POST /api/v1/training-ecosystem/trigger/medical
 * @desc Disparar integración Medical manualmente
 */
router.post('/trigger/medical', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id || 11;
        const { userId, deficiencyType, examId, examType } = req.body;

        if (!userId || !deficiencyType) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere userId y deficiencyType'
            });
        }

        const result = await TrainingEcosystemHub.onMedicalDeficiency({
            deficiencyType,
            userId,
            companyId,
            examId: examId || 0,
            examType: examType || 'general'
        });

        res.json({
            success: result.success,
            result
        });

    } catch (error) {
        console.error('❌ [ECOSYSTEM] Error en trigger Medical:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route POST /api/v1/training-ecosystem/trigger/art
 * @desc Disparar integración ART manualmente
 */
router.post('/trigger/art', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id || 11;
        const { userId, accidentType, accidentId, denunciaNumber, departmentId } = req.body;

        if (!userId || !accidentType) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere userId y accidentType'
            });
        }

        const result = await TrainingEcosystemHub.onARTAccident({
            accidentType,
            userId,
            companyId,
            accidentId: accidentId || 0,
            denunciaNumber: denunciaNumber || 'MANUAL',
            affectedArea: departmentId
        });

        res.json({
            success: result.success,
            result
        });

    } catch (error) {
        console.error('❌ [ECOSYSTEM] Error en trigger ART:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route POST /api/v1/training-ecosystem/trigger/risk
 * @desc Disparar integración Risk Intelligence manualmente
 */
router.post('/trigger/risk', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id || 11;
        const { userId, riskCategory, riskScore, alertId } = req.body;

        if (!userId || !riskCategory || !riskScore) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere userId, riskCategory y riskScore'
            });
        }

        const result = await TrainingEcosystemHub.onCriticalRiskScore({
            userId,
            companyId,
            riskCategory,
            riskScore,
            alertId: alertId || 0
        });

        res.json({
            success: result.success,
            result
        });

    } catch (error) {
        console.error('❌ [ECOSYSTEM] Error en trigger Risk:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// VALIDACIÓN Y ELEGIBILIDAD
// ============================================================================

/**
 * @route GET /api/v1/training-ecosystem/eligibility/:trainingId/:userId
 * @desc Verificar elegibilidad médica de un usuario para una capacitación
 */
router.get('/eligibility/:trainingId/:userId', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id || 11;
        const { trainingId, userId } = req.params;

        const eligibility = await MedicalTrainingIntegration.validateEligibility(
            parseInt(userId),
            parseInt(trainingId),
            companyId
        );

        res.json({
            success: true,
            eligibility
        });

    } catch (error) {
        console.error('❌ [ECOSYSTEM] Error verificando elegibilidad:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route GET /api/v1/training-ecosystem/recommendations/:userId
 * @desc Obtener recomendaciones de capacitación basadas en riesgo
 */
router.get('/recommendations/:userId', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id || 11;
        const { userId } = req.params;

        const recommendations = await RiskTrainingIntegration.getTrainingRecommendations(
            parseInt(userId),
            companyId
        );

        res.json({
            success: true,
            recommendations
        });

    } catch (error) {
        console.error('❌ [ECOSYSTEM] Error obteniendo recomendaciones:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// REPORTES ESPECÍFICOS
// ============================================================================

/**
 * @route GET /api/v1/training-ecosystem/report/post-accident
 * @desc Obtener estadísticas de capacitaciones post-accidente
 */
router.get('/report/post-accident', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id || 11;
        const { from, to } = req.query;

        const dateFrom = from ? new Date(from) : new Date(new Date().setMonth(new Date().getMonth() - 12));
        const dateTo = to ? new Date(to) : new Date();

        const stats = await ARTTrainingIntegration.getPostAccidentStats(companyId, dateFrom, dateTo);

        res.json({
            success: true,
            period: { from: dateFrom, to: dateTo },
            stats
        });

    } catch (error) {
        console.error('❌ [ECOSYSTEM] Error en reporte post-accidente:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route GET /api/v1/training-ecosystem/report/procedure-compliance
 * @desc Obtener estadísticas de cumplimiento de procedimientos
 */
router.get('/report/procedure-compliance', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id || 11;
        const { procedureId } = req.query;

        const stats = await ProceduresTrainingIntegration.getProcedureComplianceStats(
            companyId,
            procedureId ? parseInt(procedureId) : null
        );

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ [ECOSYSTEM] Error en reporte de compliance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route GET /api/v1/training-ecosystem/report/expiring-medical
 * @desc Obtener certificados médicos por vencer que afectan capacitaciones
 */
router.get('/report/expiring-medical', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id || 11;
        const { days = 30 } = req.query;

        const expiring = await MedicalTrainingIntegration.getExpiringCertificatesWithTrainingImpact(
            companyId,
            parseInt(days)
        );

        res.json({
            success: true,
            daysAhead: parseInt(days),
            expiring,
            count: expiring.length
        });

    } catch (error) {
        console.error('❌ [ECOSYSTEM] Error en reporte de certificados:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route GET /api/v1/training-ecosystem/report/risk-dashboard
 * @desc Dashboard de riesgo vs capacitaciones
 */
router.get('/report/risk-dashboard', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id || 11;

        const dashboard = await RiskTrainingIntegration.getRiskTrainingDashboard(companyId);

        res.json({
            success: true,
            dashboard
        });

    } catch (error) {
        console.error('❌ [ECOSYSTEM] Error en dashboard de riesgo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// ACCIONES DE MANTENIMIENTO
// ============================================================================

/**
 * @route POST /api/v1/training-ecosystem/reprioritize/:userId
 * @desc Re-priorizar capacitaciones de un usuario basado en riesgo actual
 */
router.post('/reprioritize/:userId', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id || 11;
        const { userId } = req.params;

        const result = await RiskTrainingIntegration.reprioritizeByRisk(
            parseInt(userId),
            companyId
        );

        res.json({
            success: result.success,
            result
        });

    } catch (error) {
        console.error('❌ [ECOSYSTEM] Error re-priorizando:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route POST /api/v1/training-ecosystem/notify-expiring
 * @desc Enviar notificaciones de certificados por vencer
 */
router.post('/notify-expiring', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id || 11;

        const result = await MedicalTrainingIntegration.notifyExpiringCertificates(companyId);

        res.json({
            success: true,
            notified: result.notified
        });

    } catch (error) {
        console.error('❌ [ECOSYSTEM] Error notificando:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
