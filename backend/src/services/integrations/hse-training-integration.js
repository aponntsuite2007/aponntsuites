/**
 * ============================================================================
 * INTEGRACIÓN: HSE → Training
 * ============================================================================
 *
 * CIRCUITO DE INTEGRACIÓN:
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │                        HSE → TRAINING                                 │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │                                                                       │
 *  │  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐ │
 *  │  │ DETECCIÓN   │ ──▶ │   CASO      │ ──▶ │    CAPACITACIÓN         │ │
 *  │  │ PPE Faltante│     │   HSE       │     │    ASIGNADA             │ │
 *  │  └─────────────┘     └─────────────┘     └─────────────────────────┘ │
 *  │        │                   │                       │                 │
 *  │        ▼                   ▼                       ▼                 │
 *  │  • Cámara detecta    • Se crea caso      • Training se asigna       │
 *  │    violación EPP     • Se registra        automáticamente           │
 *  │  • Azure CV          violación           • Prioridad HIGH          │
 *  │    identifica       • Threshold          • Mandatory TRUE          │
 *  │    elementos         alcanzado           • Notificación NCE        │
 *  │                                                                      │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 * TRIGGERS:
 * 1. Caso HSE confirmado con violación
 * 2. Detección PPE con threshold alcanzado
 * 3. Inspección con hallazgo crítico
 *
 * @version 1.0.0
 * @date 2026-02-01
 */

const TrainingEcosystemHub = require('./TrainingEcosystemHub');

class HSETrainingIntegration {

    /**
     * Hook: Cuando un caso HSE es confirmado
     * Llamar desde: HSECaseService.confirmViolation()
     */
    static async onCaseConfirmed(hseCase, violations, confirmedBy) {
        console.log(`🛡️ [HSE→TRAINING] Caso confirmado: ${hseCase.case_number}`);

        const results = [];

        for (const violation of violations) {
            const result = await TrainingEcosystemHub.onHSEViolation({
                violationCode: violation.code || violation.violation_code,
                userId: hseCase.reported_user_id,
                companyId: hseCase.company_id,
                caseId: hseCase.id,
                caseNumber: hseCase.case_number
            });

            results.push({
                violation: violation.code,
                ...result
            });
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ [HSE→TRAINING] ${successCount}/${violations.length} capacitaciones asignadas`);

        return {
            success: successCount > 0,
            totalViolations: violations.length,
            trainingsAssigned: successCount,
            results
        };
    }

    /**
     * Hook: Cuando una detección PPE alcanza el threshold
     * Llamar desde: PPEDetectionService.processViolation()
     */
    static async onPPEDetectionThreshold(detection, thresholdData) {
        console.log(`📷 [HSE→TRAINING] Detección PPE threshold: Usuario ${detection.user_id}`);

        if (!thresholdData.requiresTraining) {
            return { success: false, reason: 'No requiere training según threshold' };
        }

        const violationCodes = detection.violations.map(v => v.code);

        // Asignar capacitación para la violación principal
        const primaryViolation = violationCodes[0];

        return TrainingEcosystemHub.onHSEViolation({
            violationCode: primaryViolation,
            userId: detection.user_id,
            companyId: detection.company_id,
            caseId: detection.id,
            caseNumber: `PPE-${detection.id}`
        });
    }

    /**
     * Hook: Cuando una inspección detecta EPP en mal estado
     * Llamar desde: HSE Inspections cuando condition = 'malo' o 'inutilizable'
     */
    static async onInspectionCritical(inspection, employeeId, companyId) {
        console.log(`🔍 [HSE→TRAINING] Inspección crítica: ${inspection.id}`);

        return TrainingEcosystemHub.assignFromExternalModule({
            userId: employeeId,
            companyId,
            sourceModule: 'hse',
            sourceEntityType: 'hse_inspection',
            sourceEntityId: inspection.id,
            trainingCategory: 'safety',
            keywords: ['EPP', 'uso correcto', 'mantenimiento'],
            priority: 'high',
            mandatory: true,
            reason: `EPP en mal estado detectado en inspección #${inspection.id}`
        });
    }

    /**
     * Obtener capacitaciones pendientes generadas por HSE para un usuario
     */
    static async getPendingHSETrainings(userId, companyId) {
        const { TrainingAssignment, Training } = require('../../config/database');

        const assignments = await TrainingAssignment.findAll({
            where: {
                user_id: userId,
                company_id: companyId,
                source_module: 'hse',
                status: ['assigned', 'in_progress']
            },
            include: [{
                model: Training,
                as: 'training',
                attributes: ['id', 'title', 'category', 'duration']
            }],
            order: [['priority', 'DESC'], ['due_date', 'ASC']]
        });

        return assignments.map(a => ({
            assignmentId: a.id,
            trainingId: a.training_id,
            title: a.training?.title,
            category: a.training?.category,
            duration: a.training?.duration,
            priority: a.priority,
            dueDate: a.due_date,
            sourceType: a.source_entity_type,
            sourceId: a.source_entity_id,
            reason: a.assignment_reason
        }));
    }
}

module.exports = HSETrainingIntegration;
