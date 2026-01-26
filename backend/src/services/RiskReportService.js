/**
 * RISK REPORT SERVICE v1.0
 * Servicio de generación de reportes para Risk Intelligence Dashboard
 *
 * Genera:
 * - PDF: Reportes ejecutivos, análisis individual, violaciones
 * - Excel: Datos completos con múltiples hojas
 *
 * @requires pdfkit
 * @requires exceljs
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const RiskIntelligenceService = require('./RiskIntelligenceService');
const DocumentHeaderService = require('./DocumentHeaderService');

class RiskReportService {

    // =========================================================================
    // CONFIGURACIÓN DE REPORTES
    // =========================================================================
    static CONFIG = {
        company: {
            name: 'Sistema Biométrico Enterprise',
            logo: null // Path al logo si existe
        },
        colors: {
            primary: '#1a1a2e',
            accent: '#e94560',
            success: '#00ff88',
            warning: '#f39c12',
            danger: '#e94560',
            critical: '#ff0000',
            high: '#f39c12',
            medium: '#f1c40f',
            low: '#00ff88'
        },
        riskLabels: {
            critical: 'CRÍTICO',
            high: 'ALTO',
            medium: 'MEDIO',
            low: 'BAJO'
        }
    };

    // =========================================================================
    // GENERACIÓN DE PDF - DASHBOARD EJECUTIVO
    // =========================================================================
    static async generateDashboardPDF(companyId, period = 30, companyName = 'Empresa') {
        const dashboard = await RiskIntelligenceService.getDashboard(companyId, period);
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Title: `Reporte de Riesgos - ${companyName}`,
                Author: 'Risk Intelligence Dashboard',
                Subject: 'Análisis de Riesgos Laborales',
                CreationDate: new Date()
            }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));

        // === HEADER con datos de empresa ===
        await this.addPDFHeader(doc, companyId, 'REPORTE EJECUTIVO DE RIESGOS');

        return new Promise((resolve, reject) => {
            try {
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // === RESUMEN EJECUTIVO ===
                doc.moveDown(1);
                doc.fontSize(14).fillColor('#1a1a2e').text('RESUMEN EJECUTIVO', { underline: true });
                doc.moveDown(0.5);

                const stats = dashboard.stats || {};
                doc.fontSize(10).fillColor('#333');
                doc.text(`Período analizado: Últimos ${period} días`);
                doc.text(`Fecha del reporte: ${new Date().toLocaleDateString('es-AR')}`);
                doc.text(`Total empleados analizados: ${stats.totalEmployees || 0}`);
                doc.moveDown(1);

                // === KPIs ===
                this.addPDFSection(doc, 'INDICADORES CLAVE (KPIs)');

                const kpiData = [
                    { label: 'Empleados en Riesgo Crítico', value: stats.criticalCount || 0, color: '#e94560' },
                    { label: 'Empleados en Riesgo Alto', value: stats.highCount || 0, color: '#f39c12' },
                    { label: 'Violaciones Activas', value: stats.activeViolations || 0, color: '#f1c40f' },
                    { label: 'Índice Promedio de Riesgo', value: `${stats.averageRisk || 0}%`, color: '#3498db' },
                    { label: 'Cumplimiento Legal', value: `${stats.compliancePercent || 100}%`, color: '#00ff88' }
                ];

                kpiData.forEach(kpi => {
                    doc.fontSize(10).fillColor('#666').text(`${kpi.label}: `, { continued: true });
                    doc.fillColor(kpi.color).text(String(kpi.value));
                });

                // === ÍNDICES GLOBALES ===
                doc.moveDown(1);
                this.addPDFSection(doc, 'ÍNDICES DE RIESGO GLOBALES');

                const indices = dashboard.indices || {};
                const indexConfig = [
                    { id: 'fatigue', name: 'Índice de Fatiga', icon: '😴' },
                    { id: 'accident', name: 'Riesgo de Accidente', icon: '⚠️' },
                    { id: 'legal_claim', name: 'Riesgo Legal', icon: '⚖️' },
                    { id: 'performance', name: 'Riesgo Rendimiento', icon: '📉' },
                    { id: 'turnover', name: 'Riesgo Rotación', icon: '🚪' }
                ];

                indexConfig.forEach(idx => {
                    const value = indices[idx.id] || 0;
                    const level = this.getRiskLevel(value);
                    doc.fontSize(10).fillColor('#333').text(`${idx.name}: `, { continued: true });
                    doc.fillColor(this.CONFIG.colors[level]).text(`${value}% (${this.CONFIG.riskLabels[level]})`);
                });

                // === TOP 10 EMPLEADOS EN RIESGO ===
                doc.addPage();
                this.addPDFHeader(doc, companyName, 'EMPLEADOS EN RIESGO');

                const employees = (dashboard.employees || []).slice(0, 10);
                if (employees.length > 0) {
                    this.addPDFTable(doc, {
                        headers: ['#', 'Empleado', 'Departamento', 'Riesgo', 'Nivel'],
                        rows: employees.map((emp, i) => [
                            String(i + 1),
                            emp.name || 'N/A',
                            emp.department || 'Sin depto.',
                            `${emp.risk_score || 0}%`,
                            this.CONFIG.riskLabels[this.getRiskLevel(emp.risk_score || 0)]
                        ]),
                        columnWidths: [30, 150, 120, 60, 80]
                    });
                } else {
                    doc.fontSize(10).fillColor('#666').text('No hay empleados con riesgo significativo.');
                }

                // === RECOMENDACIONES ===
                doc.moveDown(2);
                this.addPDFSection(doc, 'RECOMENDACIONES');

                const recommendations = this.generateExecutiveRecommendations(stats, indices);
                recommendations.forEach((rec, i) => {
                    doc.fontSize(10).fillColor('#333').text(`${i + 1}. ${rec}`);
                    doc.moveDown(0.3);
                });

                // === FOOTER ===
                this.addPDFFooter(doc);

                doc.end();

            } catch (error) {
                console.error('[RiskReport] Error generando PDF dashboard:', error);
                reject(error);
            }
        });
    }

    // =========================================================================
    // GENERACIÓN DE PDF - EMPLEADO INDIVIDUAL
    // =========================================================================
    static async generateEmployeePDF(userId, companyId, period = 30, companyName = 'Empresa') {
        return new Promise(async (resolve, reject) => {
            try {
                const analysis = await RiskIntelligenceService.getEmployeeRiskAnalysis(userId, companyId, period);
                const doc = new PDFDocument({
                    size: 'A4',
                    margin: 50,
                    info: {
                        Title: `Análisis de Riesgo - ${analysis.employee?.name || 'Empleado'}`,
                        Author: 'Risk Intelligence Dashboard',
                        CreationDate: new Date()
                    }
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                const emp = analysis.employee || {};

                // === HEADER ===
                this.addPDFHeader(doc, companyName, 'ANÁLISIS INDIVIDUAL DE RIESGO');

                // === DATOS DEL EMPLEADO ===
                doc.moveDown(1);
                this.addPDFSection(doc, 'DATOS DEL EMPLEADO');

                doc.fontSize(10).fillColor('#333');
                doc.text(`Nombre: ${emp.name || 'N/A'}`);
                doc.text(`ID Empleado: ${emp.employee_id || 'N/A'}`);
                doc.text(`Departamento: ${emp.department || 'Sin departamento'}`);
                doc.text(`Puesto: ${emp.position || 'N/A'}`);
                doc.text(`Fecha de ingreso: ${emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('es-AR') : 'N/A'}`);
                doc.moveDown(1);

                // === SCORE GENERAL ===
                const riskScore = emp.risk_score || 0;
                const riskLevel = this.getRiskLevel(riskScore);

                doc.fontSize(12).fillColor('#1a1a2e').text('PUNTUACIÓN DE RIESGO GENERAL', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(24).fillColor(this.CONFIG.colors[riskLevel]).text(`${riskScore}%`);
                doc.fontSize(12).text(`Nivel: ${this.CONFIG.riskLabels[riskLevel]}`);
                doc.moveDown(1);

                // === DESGLOSE DE ÍNDICES ===
                this.addPDFSection(doc, 'DESGLOSE DE ÍNDICES');

                const indices = emp.indices || {};
                const indexDetails = [
                    { id: 'fatigue', name: 'Índice de Fatiga', desc: 'Basado en horas trabajadas y descansos' },
                    { id: 'accident', name: 'Riesgo de Accidente', desc: 'Basado en fatiga y sanciones' },
                    { id: 'legal_claim', name: 'Riesgo Legal', desc: 'Basado en overtime y vacaciones' },
                    { id: 'performance', name: 'Riesgo Rendimiento', desc: 'Basado en puntualidad y ausencias' },
                    { id: 'turnover', name: 'Riesgo Rotación', desc: 'Basado en antigüedad y sanciones' }
                ];

                indexDetails.forEach(idx => {
                    const value = indices[idx.id] ?? 0;
                    const level = this.getRiskLevel(value);
                    doc.fontSize(10).fillColor('#333').text(`${idx.name}: `, { continued: true });
                    doc.fillColor(this.CONFIG.colors[level]).text(`${value}% (${this.CONFIG.riskLabels[level]})`);
                    doc.fontSize(8).fillColor('#888').text(`   ${idx.desc}`);
                });

                // === HISTORIAL DE SANCIONES ===
                if (analysis.sanctions && analysis.sanctions.length > 0) {
                    doc.moveDown(1);
                    this.addPDFSection(doc, 'HISTORIAL DE SANCIONES (Últimas 5)');

                    analysis.sanctions.forEach(s => {
                        doc.fontSize(9).fillColor('#333');
                        doc.text(`• ${s.type || 'Sanción'}: ${s.description || 'Sin descripción'}`);
                        doc.fontSize(8).fillColor('#888').text(`  Fecha: ${s.created_at ? new Date(s.created_at).toLocaleDateString('es-AR') : 'N/A'}`);
                    });
                }

                // === RECOMENDACIONES ===
                if (analysis.recommendations && analysis.recommendations.length > 0) {
                    doc.moveDown(1);
                    this.addPDFSection(doc, 'RECOMENDACIONES');

                    analysis.recommendations.forEach(rec => {
                        doc.fontSize(10).fillColor(rec.priority === 'high' ? '#e94560' : '#333');
                        doc.text(`• ${rec.message}`);
                        doc.fontSize(9).fillColor('#666').text(`  Acción: ${rec.action}`);
                    });
                }

                // === FOOTER ===
                this.addPDFFooter(doc);

                doc.end();

            } catch (error) {
                console.error('[RiskReport] Error generando PDF empleado:', error);
                reject(error);
            }
        });
    }

    // =========================================================================
    // GENERACIÓN DE PDF - VIOLACIONES
    // =========================================================================
    static async generateViolationsPDF(companyId, filters = {}, companyName = 'Empresa') {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await RiskIntelligenceService.getViolations(companyId, filters);
                const violations = result.violations || [];

                const doc = new PDFDocument({
                    size: 'A4',
                    layout: 'landscape',
                    margin: 40,
                    info: {
                        Title: `Reporte de Violaciones - ${companyName}`,
                        Author: 'Risk Intelligence Dashboard',
                        CreationDate: new Date()
                    }
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // === HEADER ===
                this.addPDFHeader(doc, companyName, 'REPORTE DE VIOLACIONES LABORALES');

                doc.moveDown(1);
                doc.fontSize(10).fillColor('#333');
                doc.text(`Total de violaciones: ${violations.length}`);
                doc.text(`Estado: ${filters.status || 'Todas'}`);
                doc.text(`Fecha del reporte: ${new Date().toLocaleDateString('es-AR')}`);
                doc.moveDown(1);

                if (violations.length > 0) {
                    this.addPDFTable(doc, {
                        headers: ['Empleado', 'Tipo', 'Descripción', 'Severidad', 'Fecha', 'Estado'],
                        rows: violations.map(v => [
                            v.employee_name || 'N/A',
                            v.type || 'N/A',
                            (v.description || 'N/A').substring(0, 40) + '...',
                            v.severity || 'N/A',
                            v.created_at ? new Date(v.created_at).toLocaleDateString('es-AR') : 'N/A',
                            v.resolved_at ? 'Resuelta' : 'Activa'
                        ]),
                        columnWidths: [120, 80, 180, 70, 80, 70]
                    });
                } else {
                    doc.fontSize(12).fillColor('#00ff88').text('No hay violaciones activas.');
                }

                this.addPDFFooter(doc);
                doc.end();

            } catch (error) {
                console.error('[RiskReport] Error generando PDF violaciones:', error);
                reject(error);
            }
        });
    }

    // =========================================================================
    // GENERACIÓN DE EXCEL - DASHBOARD COMPLETO
    // =========================================================================
    static async generateDashboardExcel(companyId, period = 30, companyName = 'Empresa') {
        try {
            const dashboard = await RiskIntelligenceService.getDashboard(companyId, period);
            const workbook = new ExcelJS.Workbook();

            workbook.creator = 'Risk Intelligence Dashboard';
            workbook.created = new Date();
            workbook.modified = new Date();

            // === HOJA 1: RESUMEN ===
            const summarySheet = workbook.addWorksheet('Resumen', {
                properties: { tabColor: { argb: 'FF1A1A2E' } }
            });

            // Título
            summarySheet.mergeCells('A1:E1');
            summarySheet.getCell('A1').value = `REPORTE DE RIESGOS - ${companyName}`;
            summarySheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF1A1A2E' } };
            summarySheet.getCell('A1').alignment = { horizontal: 'center' };

            summarySheet.getCell('A2').value = `Período: Últimos ${period} días`;
            summarySheet.getCell('A3').value = `Generado: ${new Date().toLocaleString('es-AR')}`;

            // KPIs
            const stats = dashboard.stats || {};
            summarySheet.getCell('A5').value = 'INDICADORES CLAVE';
            summarySheet.getCell('A5').font = { bold: true, size: 12 };

            const kpiRows = [
                ['Empleados Analizados', stats.totalEmployees || 0],
                ['Riesgo Crítico', stats.criticalCount || 0],
                ['Riesgo Alto', stats.highCount || 0],
                ['Violaciones Activas', stats.activeViolations || 0],
                ['Índice Promedio', `${stats.averageRisk || 0}%`],
                ['Cumplimiento Legal', `${stats.compliancePercent || 100}%`]
            ];

            kpiRows.forEach((row, i) => {
                summarySheet.getCell(`A${6 + i}`).value = row[0];
                summarySheet.getCell(`B${6 + i}`).value = row[1];
                summarySheet.getCell(`B${6 + i}`).font = { bold: true };
            });

            // Índices globales
            summarySheet.getCell('A13').value = 'ÍNDICES GLOBALES';
            summarySheet.getCell('A13').font = { bold: true, size: 12 };

            const indices = dashboard.indices || {};
            const indexRows = [
                ['Índice de Fatiga', `${indices.fatigue || 0}%`],
                ['Riesgo de Accidente', `${indices.accident || 0}%`],
                ['Riesgo Legal', `${indices.legal_claim || 0}%`],
                ['Riesgo Rendimiento', `${indices.performance || 0}%`],
                ['Riesgo Rotación', `${indices.turnover || 0}%`]
            ];

            indexRows.forEach((row, i) => {
                summarySheet.getCell(`A${14 + i}`).value = row[0];
                summarySheet.getCell(`B${14 + i}`).value = row[1];
            });

            summarySheet.columns = [
                { width: 25 },
                { width: 15 },
                { width: 15 },
                { width: 15 },
                { width: 15 }
            ];

            // === HOJA 2: EMPLEADOS ===
            const employeesSheet = workbook.addWorksheet('Empleados', {
                properties: { tabColor: { argb: 'FFE94560' } }
            });

            // Headers
            employeesSheet.columns = [
                { header: 'ID', key: 'id', width: 15 },
                { header: 'Nombre', key: 'name', width: 30 },
                { header: 'Departamento', key: 'department', width: 20 },
                { header: 'Puesto', key: 'position', width: 20 },
                { header: 'Riesgo Total', key: 'risk_score', width: 12 },
                { header: 'Nivel', key: 'level', width: 10 },
                { header: 'Fatiga', key: 'fatigue', width: 10 },
                { header: 'Accidente', key: 'accident', width: 10 },
                { header: 'Legal', key: 'legal', width: 10 },
                { header: 'Rendimiento', key: 'performance', width: 12 },
                { header: 'Rotación', key: 'turnover', width: 10 }
            ];

            // Estilo de header
            employeesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            employeesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };

            // Datos
            (dashboard.employees || []).forEach(emp => {
                const level = this.getRiskLevel(emp.risk_score || 0);
                employeesSheet.addRow({
                    id: emp.employee_id || emp.id,
                    name: emp.name || 'N/A',
                    department: emp.department || 'Sin depto.',
                    position: emp.position || 'N/A',
                    risk_score: emp.risk_score || 0,
                    level: this.CONFIG.riskLabels[level],
                    fatigue: emp.indices?.fatigue || 0,
                    accident: emp.indices?.accident || 0,
                    legal: emp.indices?.legal_claim || 0,
                    performance: emp.indices?.performance || 0,
                    turnover: emp.indices?.turnover || 0
                });
            });

            // Formato condicional para riesgo
            employeesSheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    const riskCell = row.getCell(5);
                    const riskValue = parseInt(riskCell.value) || 0;
                    if (riskValue >= 80) {
                        riskCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
                        riskCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                    } else if (riskValue >= 60) {
                        riskCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF39C12' } };
                    } else if (riskValue >= 40) {
                        riskCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1C40F' } };
                    }
                }
            });

            // === HOJA 3: ÍNDICES DETALLADOS ===
            const indicesSheet = workbook.addWorksheet('Índices Detallados', {
                properties: { tabColor: { argb: 'FF3498DB' } }
            });

            indicesSheet.columns = [
                { header: 'Empleado', key: 'name', width: 30 },
                { header: 'Departamento', key: 'department', width: 20 },
                { header: 'Fatiga', key: 'fatigue', width: 10 },
                { header: 'Fatiga Nivel', key: 'fatigue_level', width: 12 },
                { header: 'Accidente', key: 'accident', width: 10 },
                { header: 'Accidente Nivel', key: 'accident_level', width: 14 },
                { header: 'Legal', key: 'legal', width: 10 },
                { header: 'Legal Nivel', key: 'legal_level', width: 12 },
                { header: 'Rendimiento', key: 'performance', width: 12 },
                { header: 'Rendimiento Nivel', key: 'performance_level', width: 16 },
                { header: 'Rotación', key: 'turnover', width: 10 },
                { header: 'Rotación Nivel', key: 'turnover_level', width: 14 }
            ];

            indicesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            indicesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3498DB' } };

            (dashboard.employees || []).forEach(emp => {
                const indices = emp.indices || {};
                indicesSheet.addRow({
                    name: emp.name || 'N/A',
                    department: emp.department || 'Sin depto.',
                    fatigue: indices.fatigue || 0,
                    fatigue_level: this.CONFIG.riskLabels[this.getRiskLevel(indices.fatigue || 0)],
                    accident: indices.accident || 0,
                    accident_level: this.CONFIG.riskLabels[this.getRiskLevel(indices.accident || 0)],
                    legal: indices.legal_claim || 0,
                    legal_level: this.CONFIG.riskLabels[this.getRiskLevel(indices.legal_claim || 0)],
                    performance: indices.performance || 0,
                    performance_level: this.CONFIG.riskLabels[this.getRiskLevel(indices.performance || 0)],
                    turnover: indices.turnover || 0,
                    turnover_level: this.CONFIG.riskLabels[this.getRiskLevel(indices.turnover || 0)]
                });
            });

            return await workbook.xlsx.writeBuffer();

        } catch (error) {
            console.error('[RiskReport] Error generando Excel:', error);
            throw error;
        }
    }

    // =========================================================================
    // GENERACIÓN DE EXCEL - VIOLACIONES
    // =========================================================================
    static async generateViolationsExcel(companyId, filters = {}, companyName = 'Empresa') {
        try {
            const result = await RiskIntelligenceService.getViolations(companyId, filters);
            const violations = result.violations || [];

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Risk Intelligence Dashboard';
            workbook.created = new Date();

            const sheet = workbook.addWorksheet('Violaciones', {
                properties: { tabColor: { argb: 'FFE94560' } }
            });

            sheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Empleado', key: 'employee', width: 25 },
                { header: 'Departamento', key: 'department', width: 20 },
                { header: 'Tipo', key: 'type', width: 15 },
                { header: 'Descripción', key: 'description', width: 40 },
                { header: 'Severidad', key: 'severity', width: 12 },
                { header: 'Referencia Legal', key: 'legal_ref', width: 15 },
                { header: 'Fecha Detección', key: 'created_at', width: 15 },
                { header: 'Fecha Resolución', key: 'resolved_at', width: 15 },
                { header: 'Estado', key: 'status', width: 12 }
            ];

            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE94560' } };

            violations.forEach(v => {
                sheet.addRow({
                    id: v.id,
                    employee: v.employee_name || 'N/A',
                    department: v.department || 'N/A',
                    type: v.type || 'N/A',
                    description: v.description || 'N/A',
                    severity: v.severity || 'N/A',
                    legal_ref: v.legal_reference || 'N/A',
                    created_at: v.created_at ? new Date(v.created_at).toLocaleDateString('es-AR') : 'N/A',
                    resolved_at: v.resolved_at ? new Date(v.resolved_at).toLocaleDateString('es-AR') : '-',
                    status: v.resolved_at ? 'Resuelta' : 'Activa'
                });
            });

            return await workbook.xlsx.writeBuffer();

        } catch (error) {
            console.error('[RiskReport] Error generando Excel violaciones:', error);
            throw error;
        }
    }

    // =========================================================================
    // HELPERS PDF
    // =========================================================================
    /**
     * Agregar header al PDF usando DocumentHeaderService centralizado
     * @param {PDFDocument} doc - Documento PDF
     * @param {string|number} companyIdOrName - ID de empresa o nombre (backward compatible)
     * @param {string} title - Título del documento
     */
    static async addPDFHeader(doc, companyIdOrName, title) {
        // Si es un número, usar DocumentHeaderService completo
        if (typeof companyIdOrName === 'number') {
            const reportNumber = `RISK-${Date.now().toString(36).toUpperCase()}`;
            const currentY = await DocumentHeaderService.addPDFHeader(doc, {
                companyId: companyIdOrName,
                documentType: title,
                documentNumber: reportNumber,
                documentDate: new Date(),
                recipient: null
            });
            doc.y = currentY;
            return;
        }

        // Backward compatible: si es string (nombre), usar formato simple
        doc.fontSize(18).fillColor('#1a1a2e').text(companyIdOrName, { align: 'center' });
        doc.fontSize(14).fillColor('#e94560').text(title, { align: 'center' });
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e94560');
    }

    static addPDFSection(doc, title) {
        doc.fontSize(12).fillColor('#1a1a2e').text(title, { underline: true });
        doc.moveDown(0.5);
    }

    static addPDFTable(doc, { headers, rows, columnWidths }) {
        const startX = 50;
        let y = doc.y;
        const rowHeight = 20;
        const headerHeight = 25;

        // Header
        doc.fillColor('#1a1a2e').rect(startX, y, columnWidths.reduce((a, b) => a + b, 0), headerHeight).fill();

        let x = startX;
        headers.forEach((header, i) => {
            doc.fillColor('#ffffff').fontSize(9).text(header, x + 5, y + 7, { width: columnWidths[i] - 10 });
            x += columnWidths[i];
        });

        y += headerHeight;

        // Rows
        rows.forEach((row, rowIndex) => {
            if (y > 750) {
                doc.addPage();
                y = 50;
            }

            const bgColor = rowIndex % 2 === 0 ? '#f8f9fa' : '#ffffff';
            doc.fillColor(bgColor).rect(startX, y, columnWidths.reduce((a, b) => a + b, 0), rowHeight).fill();

            x = startX;
            row.forEach((cell, i) => {
                doc.fillColor('#333333').fontSize(8).text(String(cell), x + 5, y + 5, { width: columnWidths[i] - 10 });
                x += columnWidths[i];
            });

            y += rowHeight;
        });

        doc.y = y + 10;
    }

    static addPDFFooter(doc) {
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).fillColor('#888888');
            doc.text(
                `Risk Intelligence Dashboard - Página ${i + 1} de ${pages.count} - Generado: ${new Date().toLocaleString('es-AR')}`,
                50,
                doc.page.height - 30,
                { align: 'center', width: doc.page.width - 100 }
            );
        }
    }

    // =========================================================================
    // HELPERS GENERALES
    // =========================================================================
    static getRiskLevel(value) {
        if (value >= 85) return 'critical';
        if (value >= 70) return 'high';
        if (value >= 50) return 'medium';
        return 'low';
    }

    static generateExecutiveRecommendations(stats, indices) {
        const recommendations = [];

        if ((stats.criticalCount || 0) > 0) {
            recommendations.push(`Atención inmediata: ${stats.criticalCount} empleado(s) en riesgo crítico requieren intervención urgente.`);
        }

        if ((indices.fatigue || 0) > 60) {
            recommendations.push('Revisar distribución de cargas horarias y políticas de descanso.');
        }

        if ((indices.legal_claim || 0) > 50) {
            recommendations.push('Auditar cumplimiento de normativa laboral (LCT) para prevenir reclamos.');
        }

        if ((stats.activeViolations || 0) > 5) {
            recommendations.push(`Resolver las ${stats.activeViolations} violaciones activas para reducir exposición legal.`);
        }

        if ((indices.turnover || 0) > 50) {
            recommendations.push('Implementar programa de retención de talentos y entrevistas de clima.');
        }

        if ((stats.compliancePercent || 100) < 80) {
            recommendations.push('El cumplimiento legal está por debajo del 80%. Priorizar regularización.');
        }

        if (recommendations.length === 0) {
            recommendations.push('Los indicadores están dentro de parámetros normales. Mantener monitoreo preventivo.');
        }

        return recommendations;
    }
}

module.exports = RiskReportService;
