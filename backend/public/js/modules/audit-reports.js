/**
 * AUDIT REPORTS MODULE
 * Generación de Reportes con Validez Legal
 *
 * @version 1.0
 * @date 2025-10-16
 */

const AuditReports = {
    reportTypes: [],
    history: [],

    init() {
        console.log('📄 Iniciando Audit Reports...');
        this.renderDashboard();
        this.attachEventListeners();
        this.loadReportTypes();
        this.loadHistory();
    },

    renderDashboard() {
        const container = document.getElementById('mainContent');
        container.innerHTML = `
            <div class="audit-reports">
                <div class="header">
                    <h2><i class="fas fa-file-pdf"></i> Reportes de Auditoría</h2>
                    <div class="header-actions">
                        <button class="btn btn-success" id="generateReport"><i class="fas fa-plus"></i> Generar Reporte</button>
                        <button class="btn btn-info" id="batchGenerate"><i class="fas fa-layer-group"></i> Generación en Lote</button>
                        <button class="btn btn-secondary" id="verifyReport"><i class="fas fa-check-circle"></i> Verificar Reporte</button>
                    </div>
                </div>

                <div id="reportLoading" class="loading-overlay" style="display: none;">
                    <div class="spinner"></div>
                    <p>Generando reporte PDF...</p>
                </div>

                <!-- Report Types -->
                <div class="report-types-section">
                    <h3>Tipos de Reportes Disponibles</h3>
                    <div id="reportTypesGrid"></div>
                </div>

                <!-- Generator Form -->
                <div class="generator-section" id="generatorSection" style="display: none;">
                    <h3>Generar Nuevo Reporte</h3>
                    <div class="form-group">
                        <label>Tipo de Reporte:</label>
                        <select id="reportType" class="form-control"></select>
                    </div>
                    <div class="form-group">
                        <label>Fecha de Inicio:</label>
                        <input type="date" id="reportStartDate" class="form-control" />
                    </div>
                    <div class="form-group">
                        <label>Fecha de Fin:</label>
                        <input type="date" id="reportEndDate" class="form-control" />
                    </div>
                    <div class="form-group" id="employeeIdGroup" style="display: none;">
                        <label>ID de Empleado:</label>
                        <input type="text" id="reportEmployeeId" class="form-control" placeholder="EMP-ISI-001" />
                    </div>
                    <button class="btn btn-primary" id="submitReport"><i class="fas fa-file-pdf"></i> Generar PDF</button>
                    <button class="btn btn-secondary" id="cancelReport">Cancelar</button>
                </div>

                <!-- History -->
                <div class="history-section">
                    <h3>Historial de Reportes Generados</h3>
                    <div id="historyTable"></div>
                </div>
            </div>

            <style>
                .audit-reports { padding: 20px; }
                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0; }
                .header-actions { display: flex; gap: 10px; }
                .report-types-section, .generator-section, .history-section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .report-types-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin-top: 15px; }
                .report-type-card { background: #f8f9fa; border-radius: 8px; padding: 15px; cursor: pointer; transition: all 0.3s; border-left: 4px solid #007bff; }
                .report-type-card:hover { background: #e9ecef; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                .report-type-card h4 { margin: 0 0 10px 0; color: #007bff; }
                .report-type-card p { margin: 0; font-size: 14px; color: #666; }
                .form-group { margin-bottom: 15px; }
                .form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
                .form-control { width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; }
                .history-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                .history-table th { background: #f8f9fa; padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; }
                .history-table td { padding: 12px; border-bottom: 1px solid #dee2e6; }
                .history-table tr:hover { background: #f8f9fa; }
                .qr-code-preview { width: 100px; height: 100px; }
            </style>
        `;
    },

    attachEventListeners() {
        document.getElementById('generateReport').addEventListener('click', () => this.showGeneratorForm());
        document.getElementById('batchGenerate').addEventListener('click', () => this.batchGenerate());
        document.getElementById('verifyReport').addEventListener('click', () => this.verifyReport());
        document.getElementById('submitReport').addEventListener('click', () => this.submitReport());
        document.getElementById('cancelReport').addEventListener('click', () => this.hideGeneratorForm());
        document.getElementById('reportType').addEventListener('change', (e) => {
            const employeeGroup = document.getElementById('employeeIdGroup');
            employeeGroup.style.display = e.target.value === 'employee_performance' ? 'block' : 'none';
        });
    },

    async loadReportTypes() {
        try {
            const response = await fetch('/api/audit-reports/types', {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar tipos de reportes');

            const data = await response.json();
            this.reportTypes = data.report_types || [];
            this.renderReportTypes(this.reportTypes);
            this.populateTypeSelect(this.reportTypes);
        } catch (error) {
            console.error('Error:', error);
        }
    },

    renderReportTypes(types) {
        const container = document.getElementById('reportTypesGrid');
        if (!types || types.length === 0) {
            container.innerHTML = '<div class="no-data">No hay tipos de reportes disponibles</div>';
            return;
        }

        let html = '';
        types.forEach(type => {
            html += `
                <div class="report-type-card" onclick="AuditReports.quickGenerate('${type.type}')">
                    <h4>${type.name}</h4>
                    <p>${type.description}</p>
                    <p style="margin-top: 10px; font-size: 12px; color: #999;"><strong>Requiere:</strong> ${type.required_params.join(', ')}</p>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    populateTypeSelect(types) {
        const select = document.getElementById('reportType');
        select.innerHTML = types.map(t => `<option value="${t.type}">${t.name}</option>`).join('');
    },

    showGeneratorForm() {
        document.getElementById('generatorSection').style.display = 'block';
    },

    hideGeneratorForm() {
        document.getElementById('generatorSection').style.display = 'none';
    },

    quickGenerate(type) {
        document.getElementById('reportType').value = type;
        this.showGeneratorForm();
    },

    async submitReport() {
        const reportType = document.getElementById('reportType').value;
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        const employeeId = document.getElementById('reportEmployeeId').value;

        if (!startDate || !endDate) {
            alert('Por favor complete las fechas');
            return;
        }

        if (reportType === 'employee_performance' && !employeeId) {
            alert('Para reporte de desempeño individual se requiere ID de empleado');
            return;
        }

        const params = { start_date: startDate, end_date: endDate };
        if (employeeId) params.employee_id = employeeId;

        this.showLoading();

        try {
            const response = await fetch('/api/audit-reports/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-employee-id': sessionStorage.getItem('employee_id') || 'EMP-ISI-001',
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                },
                body: JSON.stringify({
                    report_type: reportType,
                    params: params
                })
            });

            if (!response.ok) throw new Error('Error al generar reporte');

            const data = await response.json();
            this.showReportResult(data.report);
            this.hideGeneratorForm();
            this.loadHistory();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al generar el reporte');
        } finally {
            this.hideLoading();
        }
    },

    showReportResult(report) {
        alert(`✅ Reporte generado exitosamente!\n\n` +
              `ID: ${report.report_id}\n` +
              `Tipo: ${report.report_type}\n` +
              `Tamaño: ${report.file_size_kb} KB\n\n` +
              `Código de Verificación:\n${report.verification_code}\n\n` +
              `URL de Verificación:\n${report.verification_url}`);
    },

    async batchGenerate() {
        const startDate = prompt('Fecha de inicio (YYYY-MM-DD):');
        const endDate = prompt('Fecha de fin (YYYY-MM-DD):');

        if (!startDate || !endDate) return;

        this.showLoading();

        try {
            const reports = [
                { report_type: 'compliance_audit', params: { start_date: startDate, end_date: endDate } },
                { report_type: 'sla_performance', params: { start_date: startDate, end_date: endDate } },
                { report_type: 'resource_utilization', params: { start_date: startDate, end_date: endDate } },
                { report_type: 'attendance_summary', params: { start_date: startDate, end_date: endDate } }
            ];

            const response = await fetch('/api/audit-reports/batch-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-employee-id': sessionStorage.getItem('employee_id') || 'EMP-ISI-001',
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                },
                body: JSON.stringify({ reports })
            });

            if (!response.ok) throw new Error('Error al generar reportes en lote');

            const data = await response.json();
            alert(`✅ Generación en lote completada\n\n` +
                  `Reportes generados: ${data.total_generated}\n` +
                  `Errores: ${data.total_errors}`);
            this.loadHistory();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al generar reportes en lote');
        } finally {
            this.hideLoading();
        }
    },

    async verifyReport() {
        const code = prompt('Ingrese el código de verificación (32 caracteres):');
        if (!code || code.length !== 32) {
            alert('Código de verificación inválido');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch(`/api/audit-reports/verify/${code}`);

            if (!response.ok) throw new Error('Error al verificar reporte');

            const data = await response.json();
            if (data.verified) {
                alert(`✅ Reporte Válido\n\n` +
                      `ID: ${data.report.id}\n` +
                      `Tipo: ${data.report.type}\n` +
                      `Generado: ${new Date(data.report.generated_at).toLocaleString()}\n` +
                      `Generado por: ${data.report.generated_by}\n\n` +
                      `${data.message}`);
            } else {
                alert(`❌ Reporte Inválido\n\n${data.error || data.message}`);
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al verificar el reporte');
        } finally {
            this.hideLoading();
        }
    },

    async loadHistory() {
        try {
            const response = await fetch('/api/audit-reports/history?limit=50', {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar historial');

            const data = await response.json();
            this.history = data.reports || [];
            this.renderHistory(this.history);
        } catch (error) {
            console.error('Error:', error);
        }
    },

    renderHistory(reports) {
        const container = document.getElementById('historyTable');

        if (!reports || reports.length === 0) {
            container.innerHTML = '<div class="no-data">No hay reportes generados aún</div>';
            return;
        }

        let html = `
            <table class="history-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Tipo</th>
                        <th>Generado</th>
                        <th>Generado por</th>
                        <th>Código de Verificación</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        reports.forEach(r => {
            html += `
                <tr>
                    <td>${r.id}</td>
                    <td>${r.report_type}</td>
                    <td>${new Date(r.generated_at).toLocaleString()}</td>
                    <td>${r.generated_by}</td>
                    <td><code>${r.verification_code}</code></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="AuditReports.downloadReport(${r.id})">
                            <i class="fas fa-download"></i> Descargar
                        </button>
                        <button class="btn btn-sm btn-info" onclick="AuditReports.showReportInfo(${r.id})">
                            <i class="fas fa-info-circle"></i> Info
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    },

    downloadReport(reportId) {
        window.open(`/api/audit-reports/download/${reportId}`, '_blank');
    },

    async showReportInfo(reportId) {
        try {
            const response = await fetch(`/api/audit-reports/${reportId}/info`, {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar información');

            const data = await response.json();
            const report = data.report;

            alert(`Información del Reporte\n\n` +
                  `ID: ${report.id}\n` +
                  `Tipo: ${report.type}\n` +
                  `Generado: ${new Date(report.generated_at).toLocaleString()}\n` +
                  `Generado por: ${report.generated_by}\n` +
                  `Código de Verificación: ${report.verification_code}\n\n` +
                  `URL de Verificación:\n${report.verification_url}\n\n` +
                  `Parámetros:\n${JSON.stringify(report.parameters, null, 2)}`);
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar la información');
        }
    },

    showLoading() {
        document.getElementById('reportLoading').style.display = 'flex';
    },

    hideLoading() {
        document.getElementById('reportLoading').style.display = 'none';
    },

    showError(message) {
        alert('❌ ' + message);
    }
};

window.AuditReports = AuditReports;
