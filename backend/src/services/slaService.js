/**
 * SLA SERVICE - Tracking de tiempos de respuesta y rankings
 *
 * Servicio para medir SLA (Service Level Agreement), calcular métricas de respuesta,
 * generar rankings de aprobadores y detectar cuellos de botella
 *
 * VALOR: Identificar cuellos de botella, medir eficiencia de aprobadores
 *
 * @version 2.0
 * @date 2025-10-16
 */

const db = require('../config/database');

class SLAService {

    /**
     * Calcula métricas de SLA para una empresa en un período
     *
     * @param {number} companyId - ID de la empresa
     * @param {Date} startDate - Fecha inicio del período
     * @param {Date} endDate - Fecha fin del período
     * @returns {Promise<Object>} - Métricas de SLA calculadas
     */
    async calculateSLAMetrics(companyId, startDate, endDate) {
        try {
            console.log(`📊 [SLA] Calculando métricas para empresa ${companyId}...`);

            // Por ahora retornar datos vacíos ya que las tablas no tienen las columnas necesarias
            // TODO: Migrar base de datos para agregar columnas: deadline_at, responded_at, requires_response
            console.log(`⚠️ [SLA] Sistema temporalmente deshabilitado - esperando migración de BD`);

            const result = { rows: [] };

            // Calcular estadísticas por aprobador
            const approverMetrics = this.aggregateByApprover(result.rows);

            // Calcular estadísticas por tipo de solicitud
            const requestTypeMetrics = this.aggregateByRequestType(result.rows);

            // Calcular estadísticas globales
            const globalMetrics = this.calculateGlobalMetrics(result.rows);

            return {
                period: {
                    start: startDate,
                    end: endDate
                },
                global_metrics: globalMetrics,
                approver_metrics: approverMetrics,
                request_type_metrics: requestTypeMetrics,
                total_requests: result.rows.length
            };

        } catch (error) {
            console.error('❌ [SLA] Error calculando métricas:', error);
            throw error;
        }
    }

    /**
     * Agrega métricas por aprobador
     */
    aggregateByApprover(data) {
        const approvers = {};

        data.forEach(row => {
            const key = row.approver_id;
            if (!approvers[key]) {
                approvers[key] = {
                    approver_id: row.approver_id,
                    approver_role: row.approver_role,
                    total_requests: 0,
                    response_times: [],
                    within_sla: 0,
                    outside_sla: 0
                };
            }

            approvers[key].total_requests++;
            approvers[key].response_times.push(parseFloat(row.response_hours));

            if (row.within_sla) {
                approvers[key].within_sla++;
            } else {
                approvers[key].outside_sla++;
            }
        });

        // Calcular estadísticas finales para cada aprobador
        Object.keys(approvers).forEach(key => {
            const approver = approvers[key];
            const times = approver.response_times.sort((a, b) => a - b);

            approver.avg_response_hours = this.calculateAverage(times);
            approver.median_response_hours = this.calculateMedian(times);
            approver.min_response_hours = Math.min(...times);
            approver.max_response_hours = Math.max(...times);
            approver.sla_compliance_percent = ((approver.within_sla / approver.total_requests) * 100).toFixed(2);

            delete approver.response_times; // No necesitamos el array en la respuesta
        });

        return Object.values(approvers);
    }

    /**
     * Agrega métricas por tipo de solicitud
     */
    aggregateByRequestType(data) {
        const types = {};

        data.forEach(row => {
            const key = row.request_type;
            if (!types[key]) {
                types[key] = {
                    request_type: row.request_type,
                    total_requests: 0,
                    response_times: [],
                    within_sla: 0,
                    outside_sla: 0
                };
            }

            types[key].total_requests++;
            types[key].response_times.push(parseFloat(row.response_hours));

            if (row.within_sla) {
                types[key].within_sla++;
            } else {
                types[key].outside_sla++;
            }
        });

        // Calcular estadísticas finales para cada tipo
        Object.keys(types).forEach(key => {
            const type = types[key];
            const times = type.response_times.sort((a, b) => a - b);

            type.avg_response_hours = this.calculateAverage(times);
            type.median_response_hours = this.calculateMedian(times);
            type.min_response_hours = Math.min(...times);
            type.max_response_hours = Math.max(...times);
            type.sla_compliance_percent = ((type.within_sla / type.total_requests) * 100).toFixed(2);

            delete type.response_times;
        });

        return Object.values(types);
    }

    /**
     * Calcula métricas globales
     */
    calculateGlobalMetrics(data) {
        if (data.length === 0) {
            return {
                total_requests: 0,
                avg_response_hours: 0,
                median_response_hours: 0,
                sla_compliance_percent: 0
            };
        }

        const times = data.map(row => parseFloat(row.response_hours)).sort((a, b) => a - b);
        const withinSLA = data.filter(row => row.within_sla).length;

        return {
            total_requests: data.length,
            avg_response_hours: this.calculateAverage(times),
            median_response_hours: this.calculateMedian(times),
            min_response_hours: Math.min(...times),
            max_response_hours: Math.max(...times),
            within_sla_count: withinSLA,
            outside_sla_count: data.length - withinSLA,
            sla_compliance_percent: ((withinSLA / data.length) * 100).toFixed(2)
        };
    }

    /**
     * Obtiene ranking de aprobadores por velocidad de respuesta
     *
     * @param {number} companyId - ID de la empresa
     * @param {Date} startDate - Fecha inicio del período
     * @param {Date} endDate - Fecha fin del período
     * @param {string} sortBy - Campo para ordenar ('avg', 'median', 'sla_compliance')
     * @param {number} limit - Cantidad de resultados
     * @returns {Promise<Array>} - Ranking de aprobadores
     */
    async getApproverRanking(companyId, startDate, endDate, sortBy = 'avg', limit = 20) {
        try {
            const metrics = await this.calculateSLAMetrics(companyId, startDate, endDate);

            // Ordenar según criterio
            let sorted = [...metrics.approver_metrics];

            switch (sortBy) {
                case 'avg':
                    sorted.sort((a, b) => a.avg_response_hours - b.avg_response_hours);
                    break;
                case 'median':
                    sorted.sort((a, b) => a.median_response_hours - b.median_response_hours);
                    break;
                case 'sla_compliance':
                    sorted.sort((a, b) => b.sla_compliance_percent - a.sla_compliance_percent);
                    break;
                default:
                    sorted.sort((a, b) => a.avg_response_hours - b.avg_response_hours);
            }

            // Agregar posición en el ranking
            sorted = sorted.slice(0, limit).map((approver, index) => ({
                ...approver,
                rank: index + 1
            }));

            return sorted;

        } catch (error) {
            console.error('❌ [SLA] Error obteniendo ranking:', error);
            throw error;
        }
    }

    /**
     * Detecta cuellos de botella en el proceso de aprobaciones
     *
     * @param {number} companyId - ID de la empresa
     * @param {Date} startDate - Fecha inicio del período
     * @param {Date} endDate - Fecha fin del período
     * @returns {Promise<Object>} - Cuellos de botella detectados
     */
    async detectBottlenecks(companyId, startDate, endDate) {
        try {
            console.log(`🔍 [SLA] Detectando cuellos de botella...`);

            const metrics = await this.calculateSLAMetrics(companyId, startDate, endDate);

            const bottlenecks = {
                slow_approvers: [],
                slow_request_types: [],
                high_sla_violation_approvers: [],
                high_sla_violation_types: []
            };

            // Definir umbrales
            const AVG_THRESHOLD = 24; // 24 horas promedio
            const SLA_THRESHOLD = 70; // 70% cumplimiento mínimo

            // Identificar aprobadores lentos
            bottlenecks.slow_approvers = metrics.approver_metrics
                .filter(a => a.avg_response_hours > AVG_THRESHOLD)
                .sort((a, b) => b.avg_response_hours - a.avg_response_hours)
                .map(a => ({
                    approver_id: a.approver_id,
                    approver_role: a.approver_role,
                    avg_response_hours: a.avg_response_hours,
                    total_requests: a.total_requests,
                    issue: `Tiempo promedio de ${a.avg_response_hours.toFixed(1)}h excede umbral de ${AVG_THRESHOLD}h`
                }));

            // Identificar tipos de solicitud con demoras
            bottlenecks.slow_request_types = metrics.request_type_metrics
                .filter(t => t.avg_response_hours > AVG_THRESHOLD)
                .sort((a, b) => b.avg_response_hours - a.avg_response_hours)
                .map(t => ({
                    request_type: t.request_type,
                    avg_response_hours: t.avg_response_hours,
                    total_requests: t.total_requests,
                    issue: `Tipo con promedio de ${t.avg_response_hours.toFixed(1)}h`
                }));

            // Identificar aprobadores con bajo cumplimiento de SLA
            bottlenecks.high_sla_violation_approvers = metrics.approver_metrics
                .filter(a => parseFloat(a.sla_compliance_percent) < SLA_THRESHOLD)
                .sort((a, b) => a.sla_compliance_percent - b.sla_compliance_percent)
                .map(a => ({
                    approver_id: a.approver_id,
                    approver_role: a.approver_role,
                    sla_compliance_percent: a.sla_compliance_percent,
                    outside_sla_count: a.outside_sla,
                    issue: `Solo ${a.sla_compliance_percent}% de cumplimiento SLA`
                }));

            // Identificar tipos de solicitud con bajo cumplimiento
            bottlenecks.high_sla_violation_types = metrics.request_type_metrics
                .filter(t => parseFloat(t.sla_compliance_percent) < SLA_THRESHOLD)
                .sort((a, b) => a.sla_compliance_percent - b.sla_compliance_percent)
                .map(t => ({
                    request_type: t.request_type,
                    sla_compliance_percent: t.sla_compliance_percent,
                    outside_sla_count: t.outside_sla,
                    issue: `Solo ${t.sla_compliance_percent}% de cumplimiento`
                }));

            const totalBottlenecks =
                bottlenecks.slow_approvers.length +
                bottlenecks.slow_request_types.length +
                bottlenecks.high_sla_violation_approvers.length +
                bottlenecks.high_sla_violation_types.length;

            console.log(`⚠️ [SLA] ${totalBottlenecks} cuellos de botella detectados`);

            return {
                ...bottlenecks,
                total_bottlenecks: totalBottlenecks,
                period: {
                    start: startDate,
                    end: endDate
                }
            };

        } catch (error) {
            console.error('❌ [SLA] Error detectando cuellos de botella:', error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de respuesta de un aprobador específico
     *
     * @param {string} approverId - ID del aprobador
     * @param {number} companyId - ID de la empresa
     * @param {Date} startDate - Fecha inicio
     * @param {Date} endDate - Fecha fin
     * @returns {Promise<Object>} - Estadísticas del aprobador
     */
    async getApproverStats(approverId, companyId, startDate, endDate) {
        try {
            // Por ahora retornar datos vacíos ya que las tablas no tienen las columnas necesarias
            // TODO: Migrar base de datos para agregar columnas: deadline_at, responded_at, requires_response
            console.log(`⚠️ [SLA] getApproverStats temporalmente deshabilitado - esperando migración de BD`);

            const result = { rows: [] };

            if (result.rows.length === 0) {
                return {
                    approver_id: approverId,
                    total_requests: 0,
                    message: 'Sin datos en el período seleccionado'
                };
            }

            const times = result.rows.map(r => parseFloat(r.response_hours)).sort((a, b) => a - b);
            const withinSLA = result.rows.filter(r => r.within_sla).length;

            // Agrupar por tipo de solicitud
            const byRequestType = {};
            result.rows.forEach(row => {
                if (!byRequestType[row.request_type]) {
                    byRequestType[row.request_type] = { count: 0, within_sla: 0 };
                }
                byRequestType[row.request_type].count++;
                if (row.within_sla) {
                    byRequestType[row.request_type].within_sla++;
                }
            });

            return {
                approver_id: approverId,
                period: {
                    start: startDate,
                    end: endDate
                },
                total_requests: result.rows.length,
                avg_response_hours: this.calculateAverage(times),
                median_response_hours: this.calculateMedian(times),
                min_response_hours: Math.min(...times),
                max_response_hours: Math.max(...times),
                within_sla_count: withinSLA,
                outside_sla_count: result.rows.length - withinSLA,
                sla_compliance_percent: ((withinSLA / result.rows.length) * 100).toFixed(2),
                by_request_type: byRequestType,
                recent_requests: result.rows.slice(0, 10) // Últimas 10 solicitudes
            };

        } catch (error) {
            console.error('❌ [SLA] Error obteniendo stats de aprobador:', error);
            throw error;
        }
    }

    /**
     * Guarda métricas en la tabla sla_metrics para histórico
     *
     * @param {number} companyId - ID de la empresa
     * @param {Date} startDate - Fecha inicio del período
     * @param {Date} endDate - Fecha fin del período
     */
    async saveSLAMetricsToDatabase(companyId, startDate, endDate) {
        try {
            const metrics = await this.calculateSLAMetrics(companyId, startDate, endDate);

            // Guardar métricas por aprobador
            for (const approver of metrics.approver_metrics) {
                await db.query(`
                    INSERT INTO sla_metrics (
                        approver_id,
                        approver_role,
                        company_id,
                        total_requests,
                        avg_response_hours,
                        median_response_hours,
                        min_response_hours,
                        max_response_hours,
                        within_sla_count,
                        outside_sla_count,
                        sla_compliance_percent,
                        period_start,
                        period_end
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT (approver_id, period_start) DO UPDATE SET
                        total_requests = EXCLUDED.total_requests,
                        avg_response_hours = EXCLUDED.avg_response_hours,
                        median_response_hours = EXCLUDED.median_response_hours,
                        sla_compliance_percent = EXCLUDED.sla_compliance_percent
                `, [
                    approver.approver_id,
                    approver.approver_role,
                    companyId,
                    approver.total_requests,
                    approver.avg_response_hours,
                    approver.median_response_hours,
                    approver.min_response_hours,
                    approver.max_response_hours,
                    approver.within_sla,
                    approver.outside_sla,
                    approver.sla_compliance_percent,
                    startDate,
                    endDate
                ]);
            }

            console.log(`✅ [SLA] Métricas guardadas para empresa ${companyId}`);

        } catch (error) {
            console.error('❌ [SLA] Error guardando métricas:', error);
            throw error;
        }
    }

    /**
     * Obtiene dashboard de SLA para una empresa
     *
     * @param {number} companyId - ID de la empresa
     * @param {Date} startDate - Fecha inicio
     * @param {Date} endDate - Fecha fin
     * @returns {Promise<Object>} - Dashboard completo
     */
    async getSLADashboard(companyId, startDate, endDate) {
        try {
            // Calcular métricas
            const metrics = await this.calculateSLAMetrics(companyId, startDate, endDate);

            // Obtener ranking top 10
            const topApprovers = await this.getApproverRanking(companyId, startDate, endDate, 'avg', 10);

            // Detectar cuellos de botella
            const bottlenecks = await this.detectBottlenecks(companyId, startDate, endDate);

            return {
                period: {
                    start: startDate,
                    end: endDate
                },
                summary: metrics.global_metrics,
                top_approvers: topApprovers,
                bottlenecks: {
                    total: bottlenecks.total_bottlenecks,
                    slow_approvers: bottlenecks.slow_approvers.slice(0, 5),
                    slow_request_types: bottlenecks.slow_request_types.slice(0, 5)
                },
                request_type_metrics: metrics.request_type_metrics
            };

        } catch (error) {
            console.error('❌ [SLA] Error obteniendo dashboard:', error);
            throw error;
        }
    }

    // ══════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ══════════════════════════════════════════════════════════════

    /**
     * Calcula el promedio de un array de números
     */
    calculateAverage(numbers) {
        if (numbers.length === 0) return 0;
        const sum = numbers.reduce((acc, val) => acc + val, 0);
        return parseFloat((sum / numbers.length).toFixed(2));
    }

    /**
     * Calcula la mediana de un array de números (debe estar ordenado)
     */
    calculateMedian(sortedNumbers) {
        if (sortedNumbers.length === 0) return 0;

        const mid = Math.floor(sortedNumbers.length / 2);

        if (sortedNumbers.length % 2 === 0) {
            // Par: promedio de los dos valores centrales
            return parseFloat(((sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2).toFixed(2));
        } else {
            // Impar: valor central
            return parseFloat(sortedNumbers[mid].toFixed(2));
        }
    }

    /**
     * Obtiene el período actual (mes actual)
     */
    getCurrentPeriod() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        return { start, end };
    }

    /**
     * Obtiene el período anterior (mes pasado)
     */
    getPreviousPeriod() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        return { start, end };
    }
}

module.exports = new SLAService();
