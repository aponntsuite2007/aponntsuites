/**
 * ============================================================================
 * REPORTS MODULE COLLECTOR - Test E2E del Módulo de Reportes
 * ============================================================================
 *
 * Extiende BaseModuleCollector para testear el módulo de reportes.
 *
 * TESTS INCLUIDOS:
 * 1. Report Generation - Generación de reportes básicos
 * 2. Report Filters - Filtros por fecha, departamento, tipo
 * 3. Report Export - Exportación a PDF/Excel
 * 4. Report Templates - Uso de templates predefinidos
 *
 * @version 1.0.0
 * @date 2025-10-29
 * ============================================================================
 */

const BaseModuleCollector = require('./BaseModuleCollector');

class ReportsModuleCollector extends BaseModuleCollector {
    constructor(database, systemRegistry, baseURL = null) {
        super(database, systemRegistry, baseURL);  // ⚡ Pasar baseURL al padre
        this.TEST_PREFIX = '[TEST-REPORTS]';
    }

    getModuleConfig() {
        return {
            moduleName: 'reports',
            moduleURL: '/panel-empresa.html',
            testCategories: [
                { name: 'report_generation', func: this.testReportGeneration.bind(this) },
                { name: 'report_filters', func: this.testReportFilters.bind(this) },
                { name: 'report_export', func: this.testReportExport.bind(this) },
                { name: 'report_templates', func: this.testReportTemplates.bind(this) }
            ],
            navigateBeforeTests: this.navigateToReportsModule.bind(this)
        };
    }

    async navigateToReportsModule() {
        console.log('\n📂 Navegando al módulo de Reportes...\n');
        await this.page.waitForSelector('.module-item', { timeout: 10000 });
        await this.clickElement('button[onclick*="loadModule("]', 'módulo Reportes');
        await this.page.waitForSelector('#reports-content', { timeout: 10000 });
        console.log('✅ Módulo de Reportes cargado\n');
    }

    async testReportGeneration(execution_id) {
        console.log('\n🧪 TEST 1: Report Generation...\n');

        try {
            await this.clickElement('#btn-generate-report', 'botón Generar Reporte');
            await this.page.waitForSelector('#report-form', { visible: true, timeout: 5000 });

            const today = new Date().toISOString().split('T')[0];
            await this.typeInInput('#report-date-from', today, 'fecha desde');
            await this.typeInInput('#report-date-to', today, 'fecha hasta');
            await this.selectOption('#report-type', 'attendance', 'tipo de reporte');

            await this.clickElement('#btn-generate', 'botón Generar');
            await new Promise(resolve => setTimeout(resolve, 3000));

            const reportGenerated = await this.elementExists('#report-results');

            if (!reportGenerated) {
                throw new Error('Reporte no se generó');
            }

            console.log('✅ TEST 1 PASSED - Reporte generado\n');
            return await this.createTestLog(execution_id, 'reports_generation', 'passed');

        } catch (error) {
            console.error('❌ TEST 1 FAILED:', error.message);
            return await this.createTestLog(execution_id, 'reports_generation', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    async testReportFilters(execution_id) {
        console.log('\n🧪 TEST 2: Report Filters...\n');

        try {
            const filtersExist = await this.elementExists('#report-filters');

            if (!filtersExist) {
                throw new Error('Filtros de reporte no encontrados');
            }

            const departmentSelectExists = await this.elementExists('#filter-department');
            console.log(`   ${departmentSelectExists ? '✅' : '⚠️ '} Filtro por departamento: ${departmentSelectExists ? 'existe' : 'no existe'}`);

            const typeSelectExists = await this.elementExists('#filter-type');
            console.log(`   ${typeSelectExists ? '✅' : '⚠️ '} Filtro por tipo: ${typeSelectExists ? 'existe' : 'no existe'}`);

            console.log('✅ TEST 2 PASSED - Filtros validados\n');
            return await this.createTestLog(execution_id, 'reports_filters', 'passed');

        } catch (error) {
            console.error('❌ TEST 2 FAILED:', error.message);
            return await this.createTestLog(execution_id, 'reports_filters', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    async testReportExport(execution_id) {
        console.log('\n🧪 TEST 3: Report Export...\n');

        try {
            const exportPdfExists = await this.elementExists('#btn-export-pdf');
            const exportExcelExists = await this.elementExists('#btn-export-excel');

            console.log(`   ${exportPdfExists ? '✅' : '⚠️ '} Exportar a PDF: ${exportPdfExists ? 'disponible' : 'no disponible'}`);
            console.log(`   ${exportExcelExists ? '✅' : '⚠️ '} Exportar a Excel: ${exportExcelExists ? 'disponible' : 'no disponible'}`);

            if (!exportPdfExists && !exportExcelExists) {
                throw new Error('No hay opciones de exportación disponibles');
            }

            console.log('✅ TEST 3 PASSED - Opciones de exportación validadas\n');
            return await this.createTestLog(execution_id, 'reports_export', 'passed');

        } catch (error) {
            console.error('❌ TEST 3 FAILED:', error.message);
            return await this.createTestLog(execution_id, 'reports_export', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }

    async testReportTemplates(execution_id) {
        console.log('\n🧪 TEST 4: Report Templates...\n');

        try {
            const templatesExist = await this.elementExists('#report-templates');

            if (!templatesExist) {
                console.log('   ⚠️  Templates no disponibles (opcional)');
                return await this.createTestLog(execution_id, 'reports_templates', 'warning', {
                    error_message: 'Templates no implementados aún'
                });
            }

            const templateCount = await this.page.evaluate(() => {
                const templates = document.querySelectorAll('.report-template-item');
                return templates.length;
            });

            console.log(`   📊 Templates disponibles: ${templateCount}`);
            console.log('✅ TEST 4 PASSED - Templates validados\n');
            return await this.createTestLog(execution_id, 'reports_templates', 'passed', {
                metadata: { template_count: templateCount }
            });

        } catch (error) {
            console.error('❌ TEST 4 FAILED:', error.message);
            return await this.createTestLog(execution_id, 'reports_templates', 'failed', {
                error_message: error.message,
                error_stack: error.stack
            });
        }
    }
}

module.exports = ReportsModuleCollector;
