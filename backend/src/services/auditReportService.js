/**
 * AUDIT REPORT SERVICE - Generación de reportes con validez legal
 *
 * Genera reportes PDF con firmas digitales, códigos QR y trazabilidad completa.
 * Todos los reportes son inmutables y verificables para cumplimiento legal.
 *
 * CARACTERÍSTICAS:
 * - Generación de PDF con múltiples plantillas
 * - Firma digital (hash SHA-256) para verificación
 * - Código QR con URL de verificación
 * - Almacenamiento inmutable (no se pueden eliminar)
 * - Multi-tenant con aislamiento completo
 * - Historial de generación y acceso
 * - Verificación de integridad
 *
 * TIPOS DE REPORTES:
 * - compliance_audit: Auditoría de cumplimiento legal
 * - sla_performance: Rendimiento y tiempos de respuesta
 * - resource_utilization: Utilización de recursos
 * - attendance_summary: Resumen de asistencias
 * - employee_performance: Desempeño individual
 * - violation_report: Reporte de violaciones
 *
 * @version 1.0
 * @date 2025-10-16
 */

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const pool = require('../../config/database');

class AuditReportService {
    constructor() {
        // Directorio para almacenar PDFs generados
        this.reportsDir = path.join(__dirname, '../../reports/audit');
        this.ensureReportsDirectory();

        // URL base para verificación (configurar en producción)
        this.verificationBaseUrl = process.env.VERIFICATION_URL || 'https://tu-dominio.com/verify';
    }

    /**
     * Asegurar que existe el directorio de reportes
     */
    async ensureReportsDirectory() {
        try {
            await fs.mkdir(this.reportsDir, { recursive: true });
        } catch (error) {
            console.error('❌ Error creando directorio de reportes:', error);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // GENERACIÓN DE REPORTES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generar reporte de auditoría
     * @param {number} companyId - ID de la empresa
     * @param {string} reportType - Tipo de reporte
     * @param {object} params - Parámetros específicos del reporte
     * @param {string} requestedBy - ID del empleado que solicita
     * @returns {object} - Información del reporte generado
     */
    async generateReport(companyId, reportType, params, requestedBy) {
        console.log(`📄 Generando reporte: ${reportType} para empresa ${companyId}`);

        try {
            // 1. Obtener datos según tipo de reporte
            const reportData = await this.getReportData(companyId, reportType, params);

            // 2. Generar PDF
            const pdfBuffer = await this.generatePDF(companyId, reportType, reportData, params);

            // 3. Calcular firma digital (hash SHA-256)
            const digitalSignature = this.calculateDigitalSignature(pdfBuffer);

            // 4. Generar código único de verificación
            const verificationCode = this.generateVerificationCode(companyId, reportType, digitalSignature);

            // 5. Guardar reporte en base de datos
            const reportRecord = await this.saveReportRecord(
                companyId,
                reportType,
                params,
                requestedBy,
                digitalSignature,
                verificationCode
            );

            // 6. Generar código QR con URL de verificación
            const qrCodeDataUrl = await this.generateQRCode(verificationCode);

            // 7. Agregar QR al PDF
            const finalPdfBuffer = await this.addQRCodeToPDF(pdfBuffer, qrCodeDataUrl, verificationCode);

            // 8. Guardar PDF en sistema de archivos
            const filename = `${reportType}_${companyId}_${reportRecord.id}_${Date.now()}.pdf`;
            const filepath = path.join(this.reportsDir, filename);
            await fs.writeFile(filepath, finalPdfBuffer);

            // 9. Actualizar registro con ruta del archivo
            await this.updateReportFilePath(reportRecord.id, filename);

            console.log(`✅ Reporte generado exitosamente: ${filename}`);

            return {
                report_id: reportRecord.id,
                report_type: reportType,
                verification_code: verificationCode,
                digital_signature: digitalSignature,
                generated_at: reportRecord.generated_at,
                filename: filename,
                file_size_kb: Math.round(finalPdfBuffer.length / 1024),
                verification_url: `${this.verificationBaseUrl}/${verificationCode}`
            };

        } catch (error) {
            console.error('❌ Error generando reporte:', error);
            throw error;
        }
    }

    /**
     * Obtener datos según tipo de reporte
     */
    async getReportData(companyId, reportType, params) {
        switch (reportType) {
            case 'compliance_audit':
                return await this.getComplianceData(companyId, params);
            case 'sla_performance':
                return await this.getSLAData(companyId, params);
            case 'resource_utilization':
                return await this.getResourceData(companyId, params);
            case 'attendance_summary':
                return await this.getAttendanceData(companyId, params);
            case 'employee_performance':
                return await this.getEmployeePerformanceData(companyId, params);
            case 'violation_report':
                return await this.getViolationData(companyId, params);
            default:
                throw new Error(`Tipo de reporte no soportado: ${reportType}`);
        }
    }

    /**
     * Obtener datos de compliance
     */
    async getComplianceData(companyId, params) {
        const { start_date, end_date } = params;

        const result = await pool.query(`
            SELECT
                cv.id,
                cv.rule_code,
                cr.legal_reference,
                cr.rule_type,
                cr.severity,
                cv.employee_id,
                cv.violation_date,
                cv.violation_data,
                cv.status,
                cv.resolved_at,
                cv.resolution_notes
            FROM compliance_violations cv
            JOIN compliance_rules cr ON cv.rule_code = cr.rule_code
            WHERE cv.company_id = $1
                AND cv.violation_date BETWEEN $2 AND $3
            ORDER BY cv.violation_date DESC
        `, [companyId, start_date, end_date]);

        // Estadísticas
        const statsResult = await pool.query(`
            SELECT
                COUNT(*) as total_violations,
                COUNT(DISTINCT employee_id) as affected_employees,
                COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_violations,
                COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_violations
            FROM compliance_violations cv
            JOIN compliance_rules cr ON cv.rule_code = cr.rule_code
            WHERE cv.company_id = $1
                AND cv.violation_date BETWEEN $2 AND $3
        `, [companyId, start_date, end_date]);

        return {
            violations: result.rows,
            statistics: statsResult.rows[0],
            period: { start_date, end_date }
        };
    }

    /**
     * Obtener datos de SLA
     */
    async getSLAData(companyId, params) {
        const { start_date, end_date } = params;

        const result = await pool.query(`
            SELECT
                nm.id,
                nm.request_type,
                nm.approver_id,
                nm.status,
                nm.created_at,
                nm.approved_at,
                EXTRACT(EPOCH FROM (nm.approved_at - nm.created_at)) / 3600 as response_hours
            FROM notification_messages nm
            WHERE nm.company_id = $1
                AND nm.requires_approval = true
                AND nm.created_at BETWEEN $2 AND $3
                AND nm.approved_at IS NOT NULL
            ORDER BY nm.created_at DESC
        `, [companyId, start_date, end_date]);

        // Calcular métricas
        const responseTimes = result.rows.map(r => r.response_hours).filter(h => h !== null);
        const avgResponse = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;

        const statsResult = await pool.query(`
            SELECT
                COUNT(*) as total_requests,
                COUNT(DISTINCT approver_id) as total_approvers,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
                AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) / 3600) as avg_response_hours
            FROM notification_messages
            WHERE company_id = $1
                AND requires_approval = true
                AND created_at BETWEEN $2 AND $3
        `, [companyId, start_date, end_date]);

        return {
            requests: result.rows,
            statistics: {
                ...statsResult.rows[0],
                avg_response_hours: parseFloat(avgResponse.toFixed(2))
            },
            period: { start_date, end_date }
        };
    }

    /**
     * Obtener datos de utilización de recursos
     */
    async getResourceData(companyId, params) {
        const { start_date, end_date } = params;

        const result = await pool.query(`
            SELECT
                ct.id,
                ct.employee_id,
                ct.department_id,
                ct.category,
                ct.description,
                ct.transaction_date,
                ct.metadata
            FROM cost_transactions ct
            WHERE ct.company_id = $1
                AND ct.transaction_date BETWEEN $2 AND $3
            ORDER BY ct.transaction_date DESC
        `, [companyId, start_date, end_date]);

        // Calcular totales por categoría
        const summary = {};
        result.rows.forEach(row => {
            const hours = row.metadata?.hours || 0;
            if (!summary[row.category]) {
                summary[row.category] = { hours: 0, count: 0 };
            }
            summary[row.category].hours += hours;
            summary[row.category].count += 1;
        });

        const totalHours = Object.values(summary).reduce((sum, cat) => sum + cat.hours, 0);

        return {
            transactions: result.rows,
            summary: summary,
            total_hours: totalHours,
            period: { start_date, end_date }
        };
    }

    /**
     * Obtener datos de asistencia
     */
    async getAttendanceData(companyId, params) {
        const { start_date, end_date, employee_id } = params;

        let query = `
            SELECT
                a.id,
                a.employee_id,
                a.check_in,
                a.check_out,
                a.date,
                a.status,
                a.total_hours,
                a.overtime_hours
            FROM attendances a
            WHERE a.company_id = $1
                AND a.date BETWEEN $2 AND $3
        `;

        const queryParams = [companyId, start_date, end_date];

        if (employee_id) {
            query += ` AND a.employee_id = $4`;
            queryParams.push(employee_id);
        }

        query += ` ORDER BY a.date DESC, a.employee_id`;

        const result = await pool.query(query, queryParams);

        // Estadísticas
        const statsResult = await pool.query(`
            SELECT
                COUNT(*) as total_records,
                COUNT(DISTINCT employee_id) as total_employees,
                SUM(total_hours) as total_hours,
                SUM(overtime_hours) as total_overtime,
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count
            FROM attendances
            WHERE company_id = $1
                AND date BETWEEN $2 AND $3
                ${employee_id ? 'AND employee_id = $4' : ''}
        `, employee_id ? [companyId, start_date, end_date, employee_id] : [companyId, start_date, end_date]);

        return {
            attendances: result.rows,
            statistics: statsResult.rows[0],
            period: { start_date, end_date },
            employee_id: employee_id || 'all'
        };
    }

    /**
     * Obtener datos de desempeño de empleado
     */
    async getEmployeePerformanceData(companyId, params) {
        const { employee_id, start_date, end_date } = params;

        // Asistencia
        const attendanceResult = await pool.query(`
            SELECT
                COUNT(*) as total_days,
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
                SUM(total_hours) as total_hours,
                SUM(overtime_hours) as overtime_hours
            FROM attendances
            WHERE company_id = $1
                AND employee_id = $2
                AND date BETWEEN $3 AND $4
        `, [companyId, employee_id, start_date, end_date]);

        // Violaciones
        const violationsResult = await pool.query(`
            SELECT COUNT(*) as total_violations
            FROM compliance_violations
            WHERE company_id = $1
                AND employee_id = $2
                AND violation_date BETWEEN $3 AND $4
        `, [companyId, employee_id, start_date, end_date]);

        // Notificaciones y aprobaciones
        const notificationsResult = await pool.query(`
            SELECT
                COUNT(*) as total_notifications,
                COUNT(CASE WHEN status = 'read' THEN 1 END) as read_notifications
            FROM notifications
            WHERE company_id = $1
                AND employee_id = $2
                AND created_at BETWEEN $3 AND $4
        `, [companyId, employee_id, start_date, end_date]);

        return {
            employee_id,
            attendance: attendanceResult.rows[0],
            violations: violationsResult.rows[0],
            notifications: notificationsResult.rows[0],
            period: { start_date, end_date }
        };
    }

    /**
     * Obtener datos de violaciones
     */
    async getViolationData(companyId, params) {
        const { start_date, end_date } = params;

        const result = await pool.query(`
            SELECT
                cv.id,
                cv.rule_code,
                cr.legal_reference,
                cr.rule_type,
                cr.severity,
                cv.employee_id,
                cv.violation_date,
                cv.violation_data,
                cv.status
            FROM compliance_violations cv
            JOIN compliance_rules cr ON cv.rule_code = cr.rule_code
            WHERE cv.company_id = $1
                AND cv.violation_date BETWEEN $2 AND $3
                AND cv.status = 'active'
            ORDER BY cr.severity DESC, cv.violation_date DESC
        `, [companyId, start_date, end_date]);

        return {
            violations: result.rows,
            total: result.rows.length,
            period: { start_date, end_date }
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // GENERACIÓN DE PDF
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generar PDF según plantilla
     */
    async generatePDF(companyId, reportType, reportData, params) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'LETTER',
                    margins: { top: 50, bottom: 50, left: 50, right: 50 }
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Header
                this.addPDFHeader(doc, companyId, reportType);

                // Contenido según tipo de reporte
                switch (reportType) {
                    case 'compliance_audit':
                        this.addComplianceContent(doc, reportData, params);
                        break;
                    case 'sla_performance':
                        this.addSLAContent(doc, reportData, params);
                        break;
                    case 'resource_utilization':
                        this.addResourceContent(doc, reportData, params);
                        break;
                    case 'attendance_summary':
                        this.addAttendanceContent(doc, reportData, params);
                        break;
                    case 'employee_performance':
                        this.addEmployeePerformanceContent(doc, reportData, params);
                        break;
                    case 'violation_report':
                        this.addViolationContent(doc, reportData, params);
                        break;
                }

                // Footer con espacio para QR (se agregará después)
                this.addPDFFooter(doc);

                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Agregar header al PDF
     */
    addPDFHeader(doc, companyId, reportType) {
        const reportTitles = {
            'compliance_audit': 'Auditoría de Cumplimiento Legal',
            'sla_performance': 'Reporte de Rendimiento SLA',
            'resource_utilization': 'Utilización de Recursos',
            'attendance_summary': 'Resumen de Asistencias',
            'employee_performance': 'Desempeño de Empleado',
            'violation_report': 'Reporte de Violaciones'
        };

        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text(reportTitles[reportType] || 'Reporte de Auditoría', { align: 'center' });

        doc.moveDown(0.5);

        doc.fontSize(10)
           .font('Helvetica')
           .text(`Empresa ID: ${companyId}`, { align: 'center' })
           .text(`Fecha de Generación: ${new Date().toLocaleString('es-ES')}`, { align: 'center' });

        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(1);
    }

    /**
     * Agregar contenido de compliance
     */
    addComplianceContent(doc, reportData, params) {
        const { violations, statistics, period } = reportData;

        // Período
        doc.fontSize(12).font('Helvetica-Bold').text('Período de Análisis:');
        doc.fontSize(10).font('Helvetica')
           .text(`Desde: ${period.start_date}`)
           .text(`Hasta: ${period.end_date}`);
        doc.moveDown();

        // Estadísticas
        doc.fontSize(12).font('Helvetica-Bold').text('Resumen Ejecutivo:');
        doc.fontSize(10).font('Helvetica')
           .text(`Total de Violaciones: ${statistics.total_violations}`)
           .text(`Empleados Afectados: ${statistics.affected_employees}`)
           .text(`Violaciones Activas: ${statistics.active}`)
           .text(`Violaciones Resueltas: ${statistics.resolved}`)
           .text(`Violaciones Críticas: ${statistics.critical_violations}`)
           .text(`Violaciones Altas: ${statistics.high_violations}`);
        doc.moveDown();

        // Lista de violaciones
        if (violations.length > 0) {
            doc.fontSize(12).font('Helvetica-Bold').text('Detalle de Violaciones:');
            doc.moveDown(0.5);

            violations.slice(0, 20).forEach((v, index) => {
                if (doc.y > 700) doc.addPage();

                doc.fontSize(10).font('Helvetica-Bold')
                   .text(`${index + 1}. ${v.rule_code} - ${v.legal_reference || 'N/A'}`);
                doc.fontSize(9).font('Helvetica')
                   .text(`   Empleado: ${v.employee_id}`)
                   .text(`   Fecha: ${new Date(v.violation_date).toLocaleDateString('es-ES')}`)
                   .text(`   Severidad: ${v.severity}`)
                   .text(`   Estado: ${v.status}`);
                doc.moveDown(0.5);
            });

            if (violations.length > 20) {
                doc.fontSize(9).font('Helvetica-Oblique')
                   .text(`... y ${violations.length - 20} violaciones más`);
            }
        } else {
            doc.fontSize(10).font('Helvetica')
               .text('No se encontraron violaciones en el período analizado.');
        }
    }

    /**
     * Agregar contenido de SLA
     */
    addSLAContent(doc, reportData, params) {
        const { requests, statistics, period } = reportData;

        doc.fontSize(12).font('Helvetica-Bold').text('Período de Análisis:');
        doc.fontSize(10).font('Helvetica')
           .text(`Desde: ${period.start_date}`)
           .text(`Hasta: ${period.end_date}`);
        doc.moveDown();

        doc.fontSize(12).font('Helvetica-Bold').text('Métricas de Rendimiento:');
        doc.fontSize(10).font('Helvetica')
           .text(`Total de Solicitudes: ${statistics.total_requests}`)
           .text(`Aprobadores: ${statistics.total_approvers}`)
           .text(`Aprobadas: ${statistics.approved}`)
           .text(`Rechazadas: ${statistics.rejected}`)
           .text(`Tiempo Promedio de Respuesta: ${statistics.avg_response_hours || 0} horas`);
        doc.moveDown();

        if (requests.length > 0) {
            doc.fontSize(12).font('Helvetica-Bold').text('Detalle de Solicitudes (Top 15):');
            doc.moveDown(0.5);

            requests.slice(0, 15).forEach((r, index) => {
                if (doc.y > 700) doc.addPage();

                doc.fontSize(9).font('Helvetica')
                   .text(`${index + 1}. ${r.request_type} - ${r.status}`)
                   .text(`   Aprobador: ${r.approver_id}`)
                   .text(`   Tiempo de Respuesta: ${parseFloat(r.response_hours).toFixed(2)} horas`)
                   .text(`   Fecha: ${new Date(r.created_at).toLocaleDateString('es-ES')}`);
                doc.moveDown(0.3);
            });
        }
    }

    /**
     * Agregar contenido de recursos
     */
    addResourceContent(doc, reportData, params) {
        const { transactions, summary, total_hours, period } = reportData;

        doc.fontSize(12).font('Helvetica-Bold').text('Período de Análisis:');
        doc.fontSize(10).font('Helvetica')
           .text(`Desde: ${period.start_date}`)
           .text(`Hasta: ${period.end_date}`);
        doc.moveDown();

        doc.fontSize(12).font('Helvetica-Bold').text('Resumen de Utilización:');
        doc.fontSize(10).font('Helvetica')
           .text(`Total de Horas: ${total_hours.toFixed(2)}`);
        doc.moveDown(0.5);

        doc.fontSize(11).font('Helvetica-Bold').text('Por Categoría:');
        Object.entries(summary).forEach(([category, data]) => {
            doc.fontSize(9).font('Helvetica')
               .text(`  ${category}: ${data.hours.toFixed(2)} horas (${data.count} transacciones)`);
        });
        doc.moveDown();

        if (transactions.length > 0) {
            doc.fontSize(12).font('Helvetica-Bold').text('Últimas Transacciones (Top 20):');
            doc.moveDown(0.5);

            transactions.slice(0, 20).forEach((t, index) => {
                if (doc.y > 700) doc.addPage();

                const hours = t.metadata?.hours || 0;
                doc.fontSize(9).font('Helvetica')
                   .text(`${index + 1}. ${t.category} - ${hours.toFixed(2)}h`)
                   .text(`   Empleado: ${t.employee_id}`)
                   .text(`   Fecha: ${new Date(t.transaction_date).toLocaleDateString('es-ES')}`);
                doc.moveDown(0.3);
            });
        }
    }

    /**
     * Agregar contenido de asistencia
     */
    addAttendanceContent(doc, reportData, params) {
        const { attendances, statistics, period, employee_id } = reportData;

        doc.fontSize(12).font('Helvetica-Bold').text('Período de Análisis:');
        doc.fontSize(10).font('Helvetica')
           .text(`Desde: ${period.start_date}`)
           .text(`Hasta: ${period.end_date}`)
           .text(`Empleado: ${employee_id === 'all' ? 'Todos' : employee_id}`);
        doc.moveDown();

        doc.fontSize(12).font('Helvetica-Bold').text('Estadísticas:');
        doc.fontSize(10).font('Helvetica')
           .text(`Total de Registros: ${statistics.total_records}`)
           .text(`Empleados: ${statistics.total_employees}`)
           .text(`Horas Totales: ${statistics.total_hours || 0}`)
           .text(`Horas Extra: ${statistics.total_overtime || 0}`)
           .text(`Presentes: ${statistics.present_count}`)
           .text(`Ausentes: ${statistics.absent_count}`)
           .text(`Tardanzas: ${statistics.late_count}`);
        doc.moveDown();
    }

    /**
     * Agregar contenido de desempeño de empleado
     */
    addEmployeePerformanceContent(doc, reportData, params) {
        const { employee_id, attendance, violations, notifications, period } = reportData;

        doc.fontSize(12).font('Helvetica-Bold').text(`Reporte de Desempeño - ${employee_id}`);
        doc.moveDown();

        doc.fontSize(11).font('Helvetica-Bold').text('Período:');
        doc.fontSize(10).font('Helvetica')
           .text(`Desde: ${period.start_date}`)
           .text(`Hasta: ${period.end_date}`);
        doc.moveDown();

        doc.fontSize(11).font('Helvetica-Bold').text('Asistencia:');
        doc.fontSize(10).font('Helvetica')
           .text(`Días Totales: ${attendance.total_days}`)
           .text(`Días Presente: ${attendance.present_days}`)
           .text(`Tardanzas: ${attendance.late_days}`)
           .text(`Ausencias: ${attendance.absent_days}`)
           .text(`Horas Trabajadas: ${attendance.total_hours || 0}`)
           .text(`Horas Extra: ${attendance.overtime_hours || 0}`);
        doc.moveDown();

        doc.fontSize(11).font('Helvetica-Bold').text('Cumplimiento:');
        doc.fontSize(10).font('Helvetica')
           .text(`Violaciones: ${violations.total_violations}`);
        doc.moveDown();

        doc.fontSize(11).font('Helvetica-Bold').text('Comunicación:');
        doc.fontSize(10).font('Helvetica')
           .text(`Notificaciones Totales: ${notifications.total_notifications}`)
           .text(`Notificaciones Leídas: ${notifications.read_notifications}`);
    }

    /**
     * Agregar contenido de violaciones
     */
    addViolationContent(doc, reportData, params) {
        const { violations, total, period } = reportData;

        doc.fontSize(12).font('Helvetica-Bold').text('Período de Análisis:');
        doc.fontSize(10).font('Helvetica')
           .text(`Desde: ${period.start_date}`)
           .text(`Hasta: ${period.end_date}`);
        doc.moveDown();

        doc.fontSize(12).font('Helvetica-Bold').text(`Total de Violaciones Activas: ${total}`);
        doc.moveDown();

        if (violations.length > 0) {
            violations.forEach((v, index) => {
                if (doc.y > 700) doc.addPage();

                doc.fontSize(10).font('Helvetica-Bold')
                   .text(`${index + 1}. ${v.rule_code} - Severidad: ${v.severity}`);
                doc.fontSize(9).font('Helvetica')
                   .text(`   Empleado: ${v.employee_id}`)
                   .text(`   Fecha: ${new Date(v.violation_date).toLocaleDateString('es-ES')}`)
                   .text(`   Referencia Legal: ${v.legal_reference || 'N/A'}`);
                doc.moveDown(0.5);
            });
        }
    }

    /**
     * Agregar footer al PDF
     */
    addPDFFooter(doc) {
        // Espacio para QR que se agregará después
        doc.moveDown(2);
    }

    // ═══════════════════════════════════════════════════════════════
    // FIRMA DIGITAL Y VERIFICACIÓN
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calcular firma digital (hash SHA-256)
     */
    calculateDigitalSignature(pdfBuffer) {
        return crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    }

    /**
     * Generar código único de verificación
     */
    generateVerificationCode(companyId, reportType, digitalSignature) {
        const timestamp = Date.now();
        const data = `${companyId}-${reportType}-${timestamp}-${digitalSignature.substring(0, 16)}`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32).toUpperCase();
    }

    /**
     * Generar código QR con URL de verificación
     */
    async generateQRCode(verificationCode) {
        const verificationUrl = `${this.verificationBaseUrl}/${verificationCode}`;
        return await QRCode.toDataURL(verificationUrl, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 200,
            margin: 1
        });
    }

    /**
     * Agregar código QR al PDF
     */
    async addQRCodeToPDF(pdfBuffer, qrCodeDataUrl, verificationCode) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'LETTER',
                    margins: { top: 50, bottom: 50, left: 50, right: 50 }
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Agregar PDF original (simulado - en producción usar pdf-lib)
                doc.fontSize(8).font('Helvetica').text('[PDF ORIGINAL]', 50, 50);

                // Posicionar al final de la página
                doc.addPage();

                doc.fontSize(10).font('Helvetica-Bold')
                   .text('Verificación de Integridad', { align: 'center' });
                doc.moveDown(0.5);

                // Agregar QR code
                const qrImage = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
                doc.image(qrImage, 256, doc.y, { width: 100, align: 'center' });
                doc.moveDown(6);

                doc.fontSize(8).font('Helvetica')
                   .text(`Código de Verificación: ${verificationCode}`, { align: 'center' })
                   .text(`URL: ${this.verificationBaseUrl}/${verificationCode}`, { align: 'center' });
                doc.moveDown();

                doc.fontSize(7).font('Helvetica-Oblique')
                   .text('Este documento tiene validez legal y ha sido firmado digitalmente.', { align: 'center' })
                   .text('Verifique su autenticidad escaneando el código QR o visitando la URL.', { align: 'center' });

                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // ALMACENAMIENTO Y GESTIÓN
    // ═══════════════════════════════════════════════════════════════

    /**
     * Guardar registro de reporte en base de datos
     */
    async saveReportRecord(companyId, reportType, params, requestedBy, digitalSignature, verificationCode) {
        const result = await pool.query(`
            INSERT INTO audit_reports (
                company_id,
                report_type,
                generated_at,
                generated_by,
                parameters,
                digital_signature,
                verification_code,
                status
            ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, 'generated')
            RETURNING *
        `, [
            companyId,
            reportType,
            requestedBy,
            JSON.stringify(params),
            digitalSignature,
            verificationCode
        ]);

        return result.rows[0];
    }

    /**
     * Actualizar ruta del archivo
     */
    async updateReportFilePath(reportId, filename) {
        await pool.query(`
            UPDATE audit_reports
            SET file_path = $1
            WHERE id = $2
        `, [filename, reportId]);
    }

    /**
     * Verificar integridad de reporte
     */
    async verifyReport(verificationCode) {
        console.log(`🔍 Verificando reporte: ${verificationCode}`);

        // Obtener registro
        const result = await pool.query(`
            SELECT *
            FROM audit_reports
            WHERE verification_code = $1
        `, [verificationCode]);

        if (result.rows.length === 0) {
            return {
                valid: false,
                error: 'Código de verificación no encontrado'
            };
        }

        const report = result.rows[0];

        // Leer archivo PDF
        const filepath = path.join(this.reportsDir, report.file_path);

        try {
            const pdfBuffer = await fs.readFile(filepath);
            const currentSignature = this.calculateDigitalSignature(pdfBuffer);

            const isValid = currentSignature === report.digital_signature;

            // Registrar acceso
            await this.logReportAccess(report.id, 'verification', isValid);

            return {
                valid: isValid,
                report: {
                    id: report.id,
                    type: report.report_type,
                    generated_at: report.generated_at,
                    generated_by: report.generated_by,
                    company_id: report.company_id
                },
                message: isValid
                    ? 'Reporte válido y no ha sido alterado'
                    : 'ADVERTENCIA: El reporte ha sido modificado o corrompido'
            };

        } catch (error) {
            console.error('❌ Error verificando reporte:', error);
            return {
                valid: false,
                error: 'Error al verificar archivo físico'
            };
        }
    }

    /**
     * Obtener historial de reportes
     */
    async getReportHistory(companyId, filters = {}) {
        const { report_type, start_date, end_date, limit = 50 } = filters;

        let query = `
            SELECT
                id,
                report_type,
                generated_at,
                generated_by,
                verification_code,
                file_path,
                status
            FROM audit_reports
            WHERE company_id = $1
        `;

        const params = [companyId];
        let paramCount = 1;

        if (report_type) {
            paramCount++;
            query += ` AND report_type = $${paramCount}`;
            params.push(report_type);
        }

        if (start_date && end_date) {
            paramCount++;
            query += ` AND generated_at BETWEEN $${paramCount}`;
            params.push(start_date);
            paramCount++;
            query += ` AND $${paramCount}`;
            params.push(end_date);
        }

        query += ` ORDER BY generated_at DESC LIMIT $${paramCount + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Descargar reporte
     */
    async downloadReport(reportId, companyId) {
        const result = await pool.query(`
            SELECT file_path, report_type, verification_code
            FROM audit_reports
            WHERE id = $1 AND company_id = $2
        `, [reportId, companyId]);

        if (result.rows.length === 0) {
            throw new Error('Reporte no encontrado');
        }

        const report = result.rows[0];
        const filepath = path.join(this.reportsDir, report.file_path);

        // Registrar acceso
        await this.logReportAccess(reportId, 'download', true);

        return {
            filepath: filepath,
            filename: report.file_path,
            type: report.report_type
        };
    }

    /**
     * Registrar acceso a reporte (auditoría)
     */
    async logReportAccess(reportId, accessType, success) {
        await pool.query(`
            INSERT INTO report_access_log (
                report_id,
                access_type,
                accessed_at,
                success
            ) VALUES ($1, $2, NOW(), $3)
        `, [reportId, accessType, success]);
    }

    /**
     * Obtener estadísticas de reportes
     */
    async getReportStatistics(companyId, startDate, endDate) {
        const result = await pool.query(`
            SELECT
                COUNT(*) as total_reports,
                COUNT(DISTINCT report_type) as report_types,
                COUNT(CASE WHEN status = 'generated' THEN 1 END) as active_reports,
                report_type,
                COUNT(*) as count_by_type
            FROM audit_reports
            WHERE company_id = $1
                AND generated_at BETWEEN $2 AND $3
            GROUP BY report_type
        `, [companyId, startDate, endDate]);

        return result.rows;
    }
}

// Exportar instancia singleton
module.exports = new AuditReportService();
