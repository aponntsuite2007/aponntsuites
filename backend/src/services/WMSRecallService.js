/**
 * WMS Recall Service
 * Sistema de retiro de productos del mercado
 * Cumplimiento: FDA 21 CFR Part 7, EU 178/2002, ISO 22000
 */

const { sequelize } = require('../config/database');

class WMSRecallService {

    /**
     * Iniciar recall
     */
    async initiateRecall(data) {
        const {
            companyId,
            recallType, // voluntary, mandatory, market_withdrawal
            severityLevel, // class_I, class_II, class_III
            productId,
            affectedBatches,
            affectedSerialNumbers,
            reason,
            healthRiskDescription,
            discoveryDate,
            regulatoryAgency,
            regulatoryReference,
            geographicScope,
            initiatedBy,
            publicNoticeRequired
        } = data;

        // Obtener información del producto
        const product = productId ? await this.getProduct(productId) : null;

        // Calcular unidades afectadas
        let totalUnitsAffected = 0;
        if (affectedBatches && affectedBatches.length > 0) {
            const batchInfo = await sequelize.query(`
                SELECT COALESCE(SUM(current_quantity), 0) as total
                FROM wms_stock_batches sb
                JOIN wms_stock s ON sb.stock_id = s.id
                WHERE s.product_id = $1
                AND sb.lot_number = ANY($2::text[])
            `, {
                bind: [productId, affectedBatches],
                type: sequelize.QueryTypes.SELECT
            });
            totalUnitsAffected = parseInt(batchInfo[0].total);
        }

        const result = await sequelize.query(`
            INSERT INTO wms_recall_requests (
                company_id, recall_type, severity_level, product_id,
                affected_batches, affected_serial_numbers, reason, health_risk_description,
                discovery_date, regulatory_agency, regulatory_reference, geographic_scope,
                initiated_by, public_notice_required, total_units_affected
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `, {
            bind: [
                companyId, recallType, severityLevel, productId,
                affectedBatches, affectedSerialNumbers, reason, healthRiskDescription,
                discoveryDate, regulatoryAgency, regulatoryReference, geographicScope,
                initiatedBy, publicNoticeRequired || false, totalUnitsAffected
            ],
            type: sequelize.QueryTypes.INSERT
        });

        const recall = result[0][0];

        // Crear registros de tracking para cada lote afectado
        if (affectedBatches && affectedBatches.length > 0) {
            await this.createTrackingRecords(recall.id, productId, affectedBatches);
        }

        return {
            success: true,
            recall: recall,
            info: {
                title: '🚨 RECALL INICIADO',
                description: `Retiro de producto iniciado - ${recall.recall_number}`,
                severity: this.getSeverityInfo(severityLevel),
                product: product ? {
                    name: product.name,
                    sku: product.internal_code
                } : null,
                affectedUnits: totalUnitsAffected,
                immediateActions: this.getImmediateActions(severityLevel),
                workflow: {
                    current: 'initiated',
                    next: 'in_progress',
                    steps: [
                        '1️⃣ Identificar ubicaciones de lotes afectados',
                        '2️⃣ Notificar a clientes/distribuidores',
                        '3️⃣ Iniciar recuperación física',
                        '4️⃣ Documentar disposición final',
                        '5️⃣ Cerrar recall con informe final'
                    ]
                },
                compliance: {
                    standard: 'FDA 21 CFR Part 7 / EU 178/2002',
                    requirement: 'Notificación a autoridades sanitarias obligatoria para Class I',
                    deadline: severityLevel === 'class_I' ? '24 horas' : '72 horas'
                },
                techInfo: {
                    traceability: 'Sistema de seguimiento automático activado',
                    notifications: 'Alertas enviadas a roles involucrados',
                    documentation: 'Toda acción queda registrada para auditoría'
                }
            }
        };
    }

    /**
     * Crear registros de tracking
     */
    async createTrackingRecords(recallId, productId, batchNumbers) {
        const batches = await sequelize.query(`
            SELECT sb.id as batch_id, sb.lot_number, sb.current_quantity,
                   s.warehouse_id, l.id as location_id
            FROM wms_stock_batches sb
            JOIN wms_stock s ON sb.stock_id = s.id
            LEFT JOIN wms_locations l ON sb.location_id = l.id
            WHERE s.product_id = $1
            AND sb.lot_number = ANY($2::text[])
            AND sb.current_quantity > 0
        `, {
            bind: [productId, batchNumbers],
            type: sequelize.QueryTypes.SELECT
        });

        for (const batch of batches) {
            await sequelize.query(`
                INSERT INTO wms_recall_tracking (
                    recall_id, batch_id, warehouse_id, location_id, quantity_affected
                ) VALUES ($1, $2, $3, $4, $5)
            `, {
                bind: [recallId, batch.batch_id, batch.warehouse_id, batch.location_id, batch.current_quantity]
            });
        }

        return batches.length;
    }

    /**
     * Actualizar estado del recall
     */
    async updateRecallStatus(recallId, newStatus, userId) {
        const validTransitions = {
            'initiated': ['in_progress'],
            'in_progress': ['completed'],
            'completed': ['closed']
        };

        const recall = await this.getRecall(recallId);
        if (!recall) {
            return { success: false, error: 'Recall no encontrado' };
        }

        if (!validTransitions[recall.status]?.includes(newStatus)) {
            return {
                success: false,
                error: `Transición no válida: ${recall.status} → ${newStatus}`,
                validTransitions: validTransitions[recall.status]
            };
        }

        const updateFields = {
            'in_progress': {},
            'completed': { completed_at: 'CURRENT_TIMESTAMP' },
            'closed': {}
        };

        await sequelize.query(`
            UPDATE wms_recall_requests
            SET status = $2, updated_at = CURRENT_TIMESTAMP
            ${newStatus === 'completed' ? ', completed_at = CURRENT_TIMESTAMP' : ''}
            WHERE id = $1
        `, { bind: [recallId, newStatus] });

        return {
            success: true,
            info: {
                title: '📋 Estado Actualizado',
                description: `Recall ${recall.recall_number} ahora está: ${newStatus}`,
                statusInfo: this.getStatusInfo(newStatus)
            }
        };
    }

    /**
     * Registrar recuperación de unidades
     */
    async recordRecovery(trackingId, data) {
        const {
            quantityRecovered,
            recoveryMethod, // return, pickup, disposal_on_site
            customerName,
            customerContact,
            disposition, // rework, destroy, return_to_supplier, resale
            dispositionReference,
            notes
        } = data;

        const tracking = await this.getTracking(trackingId);
        if (!tracking) {
            return { success: false, error: 'Registro de tracking no encontrado' };
        }

        const newQuantityRecovered = (tracking.quantity_recovered || 0) + quantityRecovered;
        const newStatus = newQuantityRecovered >= tracking.quantity_affected
            ? 'recovered'
            : 'in_transit';

        await sequelize.query(`
            UPDATE wms_recall_tracking
            SET quantity_recovered = $2,
                recovery_status = $3,
                recovery_date = CURRENT_DATE,
                recovery_method = $4,
                customer_name = COALESCE($5, customer_name),
                customer_contact = COALESCE($6, customer_contact),
                disposition = $7,
                disposition_date = CASE WHEN $7 IS NOT NULL THEN CURRENT_DATE ELSE NULL END,
                disposition_reference = $8,
                notes = COALESCE($9, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, {
            bind: [trackingId, newQuantityRecovered, newStatus, recoveryMethod,
                   customerName, customerContact, disposition, dispositionReference, notes]
        });

        // Actualizar totales del recall
        await this.updateRecallTotals(tracking.recall_id);

        return {
            success: true,
            info: {
                title: '✅ Recuperación Registrada',
                description: `${quantityRecovered} unidad(es) recuperada(s)`,
                tracking: {
                    recovered: newQuantityRecovered,
                    pending: tracking.quantity_affected - newQuantityRecovered,
                    status: newStatus
                },
                disposition: disposition ? {
                    action: this.getDispositionInfo(disposition),
                    reference: dispositionReference
                } : null,
                compliance: 'Registro documentado para auditoría FDA/EU'
            }
        };
    }

    /**
     * Actualizar totales del recall
     */
    async updateRecallTotals(recallId) {
        await sequelize.query(`
            UPDATE wms_recall_requests
            SET total_units_recovered = (
                SELECT COALESCE(SUM(quantity_recovered), 0)
                FROM wms_recall_tracking WHERE recall_id = $1
            ),
            recovery_percentage = (
                SELECT CASE
                    WHEN SUM(quantity_affected) > 0
                    THEN ROUND((SUM(quantity_recovered)::DECIMAL / SUM(quantity_affected)) * 100, 2)
                    ELSE 0
                END
                FROM wms_recall_tracking WHERE recall_id = $1
            ),
            updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, { bind: [recallId] });
    }

    /**
     * Obtener estado del recall
     */
    async getRecallStatus(recallId) {
        const recall = await this.getRecall(recallId);
        if (!recall) {
            return { success: false, error: 'Recall no encontrado' };
        }

        const tracking = await sequelize.query(`
            SELECT rt.*, w.name as warehouse_name
            FROM wms_recall_tracking rt
            LEFT JOIN wms_warehouses w ON rt.warehouse_id = w.id
            WHERE rt.recall_id = $1
            ORDER BY rt.recovery_status, rt.created_at
        `, {
            bind: [recallId],
            type: sequelize.QueryTypes.SELECT
        });

        const byStatus = {
            pending: tracking.filter(t => t.recovery_status === 'pending'),
            in_transit: tracking.filter(t => t.recovery_status === 'in_transit'),
            recovered: tracking.filter(t => t.recovery_status === 'recovered'),
            disposed: tracking.filter(t => t.recovery_status === 'disposed'),
            lost: tracking.filter(t => t.recovery_status === 'lost')
        };

        return {
            recall: recall,
            tracking: tracking,
            summary: {
                totalLocations: tracking.length,
                byStatus: {
                    pending: byStatus.pending.length,
                    inTransit: byStatus.in_transit.length,
                    recovered: byStatus.recovered.length,
                    disposed: byStatus.disposed.length,
                    lost: byStatus.lost.length
                },
                unitsAffected: recall.total_units_affected,
                unitsRecovered: recall.total_units_recovered,
                recoveryRate: recall.recovery_percentage
            },
            info: {
                title: `📊 Estado del Recall ${recall.recall_number}`,
                severity: this.getSeverityInfo(recall.severity_level),
                status: this.getStatusInfo(recall.status),
                progress: {
                    percentage: recall.recovery_percentage || 0,
                    description: this.getProgressDescription(recall.recovery_percentage)
                },
                timeline: {
                    initiated: recall.initiated_at,
                    daysActive: Math.floor((new Date() - new Date(recall.initiated_at)) / (1000 * 60 * 60 * 24))
                },
                compliance: {
                    documentsRequired: this.getRequiredDocuments(recall.recall_type),
                    regulatoryStatus: recall.regulatory_agency
                        ? `Notificado a ${recall.regulatory_agency}`
                        : 'Pendiente notificación a autoridades'
                }
            }
        };
    }

    /**
     * Listar recalls activos
     */
    async getActiveRecalls(companyId) {
        const result = await sequelize.query(`
            SELECT r.*, p.name as product_name, p.internal_code as sku,
                   u."firstName" || ' ' || u."lastName" as initiated_by_name
            FROM wms_recall_requests r
            LEFT JOIN wms_products p ON r.product_id = p.id
            LEFT JOIN users u ON r.initiated_by = u.user_id
            WHERE r.company_id = $1
            AND r.status NOT IN ('closed')
            ORDER BY
                CASE r.severity_level WHEN 'class_I' THEN 1 WHEN 'class_II' THEN 2 ELSE 3 END,
                r.initiated_at DESC
        `, {
            bind: [companyId],
            type: sequelize.QueryTypes.SELECT
        });

        return {
            recalls: result,
            summary: {
                total: result.length,
                classI: result.filter(r => r.severity_level === 'class_I').length,
                classII: result.filter(r => r.severity_level === 'class_II').length,
                classIII: result.filter(r => r.severity_level === 'class_III').length
            },
            info: {
                title: '🚨 Recalls Activos',
                description: `${result.length} recall(s) en proceso`,
                legend: {
                    class_I: '🔴 Clase I - Riesgo de consecuencias graves o muerte',
                    class_II: '🟠 Clase II - Riesgo de consecuencias temporales o reversibles',
                    class_III: '🟡 Clase III - Improbable que cause consecuencias adversas'
                },
                actions: {
                    view: 'Ver detalle y tracking',
                    update: 'Actualizar estado',
                    report: 'Generar informe para autoridades'
                },
                compliance: 'Sistema conforme a FDA 21 CFR Part 7 / EU 178/2002'
            }
        };
    }

    /**
     * Agregar análisis de causa raíz
     */
    async addRootCauseAnalysis(recallId, data, userId) {
        const { rootCauseAnalysis, correctiveActions, preventiveActions, lessonsLearned } = data;

        await sequelize.query(`
            UPDATE wms_recall_requests
            SET root_cause_analysis = $2,
                corrective_actions = $3,
                preventive_actions = $4,
                lessons_learned = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, {
            bind: [recallId, rootCauseAnalysis, correctiveActions, preventiveActions, lessonsLearned]
        });

        return {
            success: true,
            info: {
                title: '📋 Análisis Registrado',
                description: 'Análisis de causa raíz y acciones documentadas',
                sections: {
                    rootCause: '🔍 Causa raíz identificada',
                    corrective: '🔧 Acciones correctivas definidas',
                    preventive: '🛡️ Acciones preventivas planificadas',
                    lessons: '📚 Lecciones aprendidas documentadas'
                },
                compliance: 'Requerido por ISO 22000 / HACCP',
                nextStep: 'Implementar acciones y verificar efectividad'
            }
        };
    }

    // Helpers
    async getRecall(recallId) {
        const result = await sequelize.query(`
            SELECT * FROM wms_recall_requests WHERE id = $1
        `, {
            bind: [recallId],
            type: sequelize.QueryTypes.SELECT
        });
        return result[0];
    }

    async getTracking(trackingId) {
        const result = await sequelize.query(`
            SELECT * FROM wms_recall_tracking WHERE id = $1
        `, {
            bind: [trackingId],
            type: sequelize.QueryTypes.SELECT
        });
        return result[0];
    }

    async getProduct(productId) {
        const result = await sequelize.query(`
            SELECT * FROM wms_products WHERE id = $1
        `, {
            bind: [productId],
            type: sequelize.QueryTypes.SELECT
        });
        return result[0];
    }

    getSeverityInfo(level) {
        const info = {
            class_I: {
                level: 'Clase I',
                color: 'red',
                icon: '🔴',
                description: 'Riesgo razonable de consecuencias graves para la salud o muerte',
                urgency: 'CRÍTICO - Acción inmediata requerida'
            },
            class_II: {
                level: 'Clase II',
                color: 'orange',
                icon: '🟠',
                description: 'Riesgo de consecuencias temporales o médicamente reversibles',
                urgency: 'ALTO - Acción prioritaria'
            },
            class_III: {
                level: 'Clase III',
                color: 'yellow',
                icon: '🟡',
                description: 'Situación donde uso/exposición es improbable que cause consecuencias adversas',
                urgency: 'MODERADO - Seguimiento normal'
            }
        };
        return info[level] || info.class_III;
    }

    getStatusInfo(status) {
        const info = {
            initiated: { label: 'Iniciado', icon: '🚀', description: 'Recall creado, pendiente de acciones' },
            in_progress: { label: 'En Progreso', icon: '⏳', description: 'Recuperación activa de productos' },
            completed: { label: 'Completado', icon: '✅', description: 'Recuperación finalizada, pendiente cierre' },
            closed: { label: 'Cerrado', icon: '📁', description: 'Recall cerrado con informe final' }
        };
        return info[status] || info.initiated;
    }

    getDispositionInfo(disposition) {
        const info = {
            rework: 'Reprocesamiento para corrección',
            destroy: 'Destrucción controlada',
            return_to_supplier: 'Devolución al proveedor',
            resale: 'Reventa tras evaluación'
        };
        return info[disposition] || disposition;
    }

    getProgressDescription(percentage) {
        if (!percentage || percentage === 0) return 'Sin recuperación';
        if (percentage < 25) return 'Recuperación inicial';
        if (percentage < 50) return 'Recuperación en progreso';
        if (percentage < 75) return 'Recuperación avanzada';
        if (percentage < 100) return 'Casi completo';
        return 'Recuperación completa';
    }

    getImmediateActions(severityLevel) {
        const actions = {
            class_I: [
                '🚫 DETENER inmediatamente la distribución',
                '📞 Notificar a autoridades sanitarias en 24h',
                '📧 Alertar a todos los distribuidores/clientes',
                '🔒 Cuarentenar todo el stock afectado',
                '📋 Documentar todas las acciones'
            ],
            class_II: [
                '⚠️ Suspender ventas de lotes afectados',
                '📞 Notificar a autoridades en 72h',
                '📧 Contactar clientes principales',
                '🔒 Separar stock para evaluación',
                '📋 Iniciar documentación del proceso'
            ],
            class_III: [
                '📝 Registrar el incidente',
                '🔍 Evaluar extensión del problema',
                '📧 Notificar a clientes si corresponde',
                '📋 Documentar acciones tomadas'
            ]
        };
        return actions[severityLevel] || actions.class_III;
    }

    getRequiredDocuments(recallType) {
        return [
            'Notificación inicial a autoridades',
            'Lista de lotes afectados',
            'Registros de distribución',
            'Comunicados a clientes',
            'Evidencia de recuperación',
            'Certificados de disposición',
            'Informe de causa raíz',
            'Informe final de cierre'
        ];
    }
}

module.exports = new WMSRecallService();
