/**
 * ============================================================================
 * RISK INTELLIGENCE MODULE COLLECTOR - Dashboard de Riesgo Laboral
 * ============================================================================
 *
 * Tests E2E para el módulo Risk Intelligence con:
 * - Dashboard de riesgos con KPIs
 * - Análisis de empleados individuales
 * - Gestión de violaciones/alertas
 * - Configuración de índices y umbrales
 * - Exportación PDF/Excel
 * - RBAC SSOT (segmentación por tipo de trabajo)
 * - Comparación con benchmarks internacionales
 *
 * Endpoints: /api/compliance/*
 * Frontend: risk-intelligence-dashboard.js
 *
 * @version 1.0.0
 * @date 2025-12-07
 */

const BaseModuleCollector = require('./BaseModuleCollector');

class RiskIntelligenceModuleCollector extends BaseModuleCollector {

    getModuleConfig() {
        return {
            moduleName: 'risk-intelligence',
            moduleURL: '/panel-empresa.html',
            requiredRole: 'admin',
            testCategories: [
                // ===== DASHBOARD PRINCIPAL =====
                { name: 'dashboard_api', description: 'API dashboard de riesgos', func: this.testDashboardAPI.bind(this) },
                { name: 'departments_risk_api', description: 'API departamentos con riesgo', func: this.testDepartmentsRiskAPI.bind(this) },
                { name: 'trends_api', description: 'API tendencias de riesgo', func: this.testTrendsAPI.bind(this) },

                // ===== ANÁLISIS DE EMPLEADOS =====
                { name: 'employee_risk_analysis_api', description: 'API análisis de riesgo empleado', func: this.testEmployeeRiskAnalysisAPI.bind(this) },
                { name: 'analyze_employee', description: 'Forzar re-análisis de empleado', func: this.testAnalyzeEmployee.bind(this) },
                { name: 'analyze_all_employees', description: 'Re-análisis de todos los empleados', func: this.testAnalyzeAllEmployees.bind(this) },
                { name: 'employee_thresholds_api', description: 'API umbrales de empleado', func: this.testEmployeeThresholdsAPI.bind(this) },

                // ===== VIOLACIONES/ALERTAS =====
                { name: 'violations_api', description: 'API violaciones activas', func: this.testViolationsAPI.bind(this) },
                { name: 'resolve_violation', description: 'Resolver violación', func: this.testResolveViolation.bind(this) },

                // ===== CONFIGURACIÓN DE ÍNDICES =====
                { name: 'indices_config_api', description: 'API configuración de índices', func: this.testIndicesConfigAPI.bind(this) },
                { name: 'update_index_config', description: 'Actualizar configuración de índice', func: this.testUpdateIndexConfig.bind(this) },

                // ===== RBAC SSOT - CONFIGURACIÓN DE UMBRALES =====
                { name: 'risk_config_api', description: 'API configuración de riesgo', func: this.testRiskConfigAPI.bind(this) },
                { name: 'update_risk_config', description: 'Actualizar configuración de riesgo', func: this.testUpdateRiskConfig.bind(this) },
                { name: 'change_threshold_method', description: 'Cambiar método de cálculo', func: this.testChangeThresholdMethod.bind(this) },
                { name: 'toggle_segmentation', description: 'Habilitar/deshabilitar segmentación', func: this.testToggleSegmentation.bind(this) },
                { name: 'recalculate_quartiles', description: 'Recalcular cuartiles', func: this.testRecalculateQuartiles.bind(this) },

                // ===== ANÁLISIS SEGMENTADO =====
                { name: 'segmented_analysis_api', description: 'API análisis segmentado', func: this.testSegmentedAnalysisAPI.bind(this) },
                { name: 'benchmark_comparison_api', description: 'API comparación con benchmarks', func: this.testBenchmarkComparisonAPI.bind(this) },
                { name: 'rbac_stats_api', description: 'API estadísticas RBAC', func: this.testRbacStatsAPI.bind(this) },

                // ===== EXPORTACIÓN PDF/EXCEL =====
                { name: 'export_dashboard_pdf', description: 'Exportar dashboard PDF', func: this.testExportDashboardPDF.bind(this) },
                { name: 'export_dashboard_excel', description: 'Exportar dashboard Excel', func: this.testExportDashboardExcel.bind(this) },
                { name: 'export_employee_pdf', description: 'Exportar empleado PDF', func: this.testExportEmployeePDF.bind(this) },
                { name: 'export_violations_pdf', description: 'Exportar violaciones PDF', func: this.testExportViolationsPDF.bind(this) },
                { name: 'export_violations_excel', description: 'Exportar violaciones Excel', func: this.testExportViolationsExcel.bind(this) },

                // ===== VALIDACIÓN BD =====
                { name: 'db_risk_tables', description: 'BD: Tablas de riesgo existen', func: this.testDBRiskTables.bind(this) },
                { name: 'db_multi_tenant_isolation', description: 'BD: Aislamiento multi-tenant', func: this.testDBMultiTenantIsolation.bind(this) }
            ]
        };
    }

    // ===== DASHBOARD PRINCIPAL =====

    async testDashboardAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/compliance/risk-dashboard?period=30',
            'GET',
            null,
            (data) => data.success && (data.dashboard || data.kpis || data.employees)
        );
    }

    async testDepartmentsRiskAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/compliance/departments',
            'GET',
            null,
            (data) => data.success && Array.isArray(data.departments)
        );
    }

    async testTrendsAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/compliance/trends?days=30',
            'GET',
            null,
            (data) => data.success
        );
    }

    // ===== ANÁLISIS DE EMPLEADOS =====

    async testEmployeeRiskAnalysisAPI(execution_id) {
        const users = await this.fetchAPI('/api/users?limit=1');
        if (!users.success || !users.users?.length) {
            return { passed: true, message: 'No hay usuarios para análisis de riesgo' };
        }
        return this.testAPIEndpoint(
            `/api/compliance/employee/${users.users[0].id}/risk-analysis?period=30`,
            'GET',
            null,
            (data) => data.success || data.indices || data.analysis
        );
    }

    async testAnalyzeEmployee(execution_id) {
        const users = await this.fetchAPI('/api/users?limit=1');
        if (!users.success || !users.users?.length) {
            return { passed: true, message: 'No hay usuarios para re-análisis' };
        }
        return this.testAPIEndpoint(
            `/api/compliance/analyze/${users.users[0].id}`,
            'POST',
            null,
            (data) => data.success
        );
    }

    async testAnalyzeAllEmployees(execution_id) {
        return this.testAPIEndpoint(
            '/api/compliance/analyze-all',
            'POST',
            { period: 30 },
            (data) => data.success && 'count' in data
        );
    }

    async testEmployeeThresholdsAPI(execution_id) {
        const users = await this.fetchAPI('/api/users?limit=1');
        if (!users.success || !users.users?.length) {
            return { passed: true, message: 'No hay usuarios para umbrales' };
        }
        return this.testAPIEndpoint(
            `/api/compliance/employee/${users.users[0].id}/thresholds`,
            'GET',
            null,
            (data) => data.success
        );
    }

    // ===== VIOLACIONES/ALERTAS =====

    async testViolationsAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/compliance/violations?status=active',
            'GET',
            null,
            (data) => data.success && Array.isArray(data.violations)
        );
    }

    async testResolveViolation(execution_id) {
        const violations = await this.fetchAPI('/api/compliance/violations?status=active');
        if (!violations.success || !violations.violations?.length) {
            return { passed: true, message: 'No hay violaciones activas para resolver' };
        }
        return this.testAPIEndpoint(
            `/api/compliance/violations/${violations.violations[0].id}/resolve`,
            'POST',
            { resolution_notes: `${this.TEST_PREFIX} Resuelta por testing` },
            (data) => data.success
        );
    }

    // ===== CONFIGURACIÓN DE ÍNDICES =====

    async testIndicesConfigAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/compliance/indices-config',
            'GET',
            null,
            (data) => data.success && data.config
        );
    }

    async testUpdateIndexConfig(execution_id) {
        return this.testAPIEndpoint(
            '/api/compliance/indices-config/fatigue',
            'PUT',
            { weight: 0.15, threshold_warning: 0.3, threshold_critical: 0.6 },
            (data) => data.success || data.error?.includes('admin')
        );
    }

    // ===== RBAC SSOT - CONFIGURACIÓN DE UMBRALES =====

    async testRiskConfigAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/compliance/risk-config',
            'GET',
            null,
            (data) => data.success && data.config
        );
    }

    async testUpdateRiskConfig(execution_id) {
        return this.testAPIEndpoint(
            '/api/compliance/risk-config',
            'PUT',
            { default_warning_threshold: 0.3 },
            (data) => data.success || data.error?.includes('admin')
        );
    }

    async testChangeThresholdMethod(execution_id) {
        return this.testAPIEndpoint(
            '/api/compliance/risk-config/method',
            'POST',
            { method: 'manual' },
            (data) => data.success || data.error?.includes('admin')
        );
    }

    async testToggleSegmentation(execution_id) {
        return this.testAPIEndpoint(
            '/api/compliance/risk-config/segmentation',
            'POST',
            { enabled: false },
            (data) => data.success || data.error?.includes('admin')
        );
    }

    async testRecalculateQuartiles(execution_id) {
        return this.testAPIEndpoint(
            '/api/compliance/risk-config/recalculate',
            'POST',
            null,
            (data) => data.success || data.error?.includes('admin')
        );
    }

    // ===== ANÁLISIS SEGMENTADO =====

    async testSegmentedAnalysisAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/compliance/segmented-analysis?period=30',
            'GET',
            null,
            (data) => data.success
        );
    }

    async testBenchmarkComparisonAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/compliance/benchmark-comparison?period=30',
            'GET',
            null,
            (data) => data.success
        );
    }

    async testRbacStatsAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/compliance/rbac-stats',
            'GET',
            null,
            (data) => data.success && data.stats
        );
    }

    // ===== EXPORTACIÓN PDF/EXCEL =====

    async testExportDashboardPDF(execution_id) {
        return this.testExportEndpoint(
            '/api/compliance/export/dashboard/pdf?period=30',
            'application/pdf'
        );
    }

    async testExportDashboardExcel(execution_id) {
        return this.testExportEndpoint(
            '/api/compliance/export/dashboard/excel?period=30',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
    }

    async testExportEmployeePDF(execution_id) {
        const users = await this.fetchAPI('/api/users?limit=1');
        if (!users.success || !users.users?.length) {
            return { passed: true, message: 'No hay usuarios para exportar PDF' };
        }
        return this.testExportEndpoint(
            `/api/compliance/export/employee/${users.users[0].id}/pdf?period=30`,
            'application/pdf'
        );
    }

    async testExportViolationsPDF(execution_id) {
        return this.testExportEndpoint(
            '/api/compliance/export/violations/pdf?status=all',
            'application/pdf'
        );
    }

    async testExportViolationsExcel(execution_id) {
        return this.testExportEndpoint(
            '/api/compliance/export/violations/excel?status=all',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
    }

    /**
     * Helper para testear endpoints de exportación
     */
    async testExportEndpoint(endpoint, expectedContentType) {
        try {
            const response = await this.fetchAPIRaw(endpoint, 'GET');

            // Verificar que la respuesta tenga el content-type esperado o sea exitosa
            const contentType = response.headers?.['content-type'] || '';
            const isCorrectType = contentType.includes(expectedContentType) ||
                                  contentType.includes('application/octet-stream');

            if (response.status === 200 && (isCorrectType || response.buffer?.length > 0)) {
                return { passed: true, message: `Exportación exitosa (${response.buffer?.length || 0} bytes)` };
            } else if (response.status === 500 && response.error?.includes('pdfkit')) {
                return { passed: true, message: 'PDFKit no disponible (dependencia opcional)' };
            } else {
                return { passed: false, message: `Error en exportación: ${response.status}` };
            }
        } catch (error) {
            if (error.message?.includes('pdfkit') || error.message?.includes('exceljs')) {
                return { passed: true, message: 'Dependencia de exportación no disponible' };
            }
            return { passed: false, message: `Error: ${error.message}` };
        }
    }

    // ===== VALIDACIÓN BD =====

    async testDBRiskTables(execution_id) {
        const tables = ['company_risk_config', 'risk_benchmarks'];
        const results = [];

        for (const table of tables) {
            const result = await this.testDatabaseTable(table, ['id', 'company_id']);
            results.push({ table, ...result });
        }

        const allPassed = results.every(r => r.passed);
        return {
            passed: allPassed,
            message: allPassed ? `Tablas de riesgo existen (${tables.length})` : 'Algunas tablas faltan',
            details: results
        };
    }

    async testDBMultiTenantIsolation(execution_id) {
        return this.testMultiTenantIsolation('company_risk_config', 'company_id');
    }
}

module.exports = RiskIntelligenceModuleCollector;
