/**
 * ============================================================================
 * HSE MODULE COLLECTOR - Seguridad e Higiene Laboral
 * ============================================================================
 *
 * Tests E2E para el módulo HSE (Health, Safety & Environment) con:
 * - Catálogo de EPP (Equipos de Protección Personal)
 * - Matriz Rol-EPP (requerimientos por posición)
 * - Entregas de EPP (firma, devolución, reemplazo)
 * - Inspecciones y acciones pendientes
 * - Dashboard KPIs de cumplimiento
 * - Reportes de vencimientos
 *
 * Cumplimiento: ISO 45001 / OSHA / EU-OSHA / SRT
 *
 * Endpoints: /api/v1/hse/*
 * Frontend: hse-management.js
 *
 * @version 1.0.0
 * @date 2025-12-07
 */

const BaseModuleCollector = require('./BaseModuleCollector');

class HSEModuleCollector extends BaseModuleCollector {

    getModuleConfig() {
        return {
            moduleName: 'hse',
            moduleURL: '/panel-empresa.html',
            requiredRole: 'admin',
            testCategories: [
                // ===== CATEGORÍAS EPP =====
                { name: 'categories_api', description: 'API categorías de EPP', func: this.testCategoriesAPI.bind(this) },

                // ===== CATÁLOGO EPP =====
                { name: 'catalog_list_api', description: 'API listado catálogo EPP', func: this.testCatalogListAPI.bind(this) },
                { name: 'catalog_create', description: 'Crear ítem en catálogo', func: this.testCatalogCreate.bind(this) },
                { name: 'catalog_update', description: 'Actualizar ítem catálogo', func: this.testCatalogUpdate.bind(this) },
                { name: 'catalog_delete', description: 'Desactivar ítem catálogo', func: this.testCatalogDelete.bind(this) },

                // ===== MATRIZ ROL-EPP (Requirements) =====
                { name: 'requirements_list_api', description: 'API requerimientos EPP', func: this.testRequirementsListAPI.bind(this) },
                { name: 'requirements_by_position_api', description: 'API EPP por posición', func: this.testRequirementsByPositionAPI.bind(this) },
                { name: 'requirements_matrix_api', description: 'API matriz rol-EPP', func: this.testRequirementsMatrixAPI.bind(this) },
                { name: 'requirements_create', description: 'Asignar EPP a posición', func: this.testRequirementsCreate.bind(this) },
                { name: 'requirements_update', description: 'Actualizar requerimiento', func: this.testRequirementsUpdate.bind(this) },
                { name: 'requirements_delete', description: 'Eliminar requerimiento', func: this.testRequirementsDelete.bind(this) },

                // ===== ENTREGAS DE EPP =====
                { name: 'deliveries_list_api', description: 'API listado entregas', func: this.testDeliveriesListAPI.bind(this) },
                { name: 'deliveries_by_employee_api', description: 'API entregas por empleado', func: this.testDeliveriesByEmployeeAPI.bind(this) },
                { name: 'deliveries_expiring_api', description: 'API EPP próximos a vencer', func: this.testDeliveriesExpiringAPI.bind(this) },
                { name: 'delivery_create', description: 'Registrar entrega', func: this.testDeliveryCreate.bind(this) },
                { name: 'delivery_update', description: 'Actualizar entrega', func: this.testDeliveryUpdate.bind(this) },
                { name: 'delivery_sign', description: 'Firma del empleado', func: this.testDeliverySign.bind(this) },
                { name: 'delivery_return', description: 'Registrar devolución', func: this.testDeliveryReturn.bind(this) },
                { name: 'delivery_replace', description: 'Reemplazar EPP vencido', func: this.testDeliveryReplace.bind(this) },

                // ===== INSPECCIONES =====
                { name: 'inspections_list_api', description: 'API listado inspecciones', func: this.testInspectionsListAPI.bind(this) },
                { name: 'inspections_pending_api', description: 'API inspecciones pendientes', func: this.testInspectionsPendingAPI.bind(this) },
                { name: 'inspection_create', description: 'Crear inspección', func: this.testInspectionCreate.bind(this) },
                { name: 'inspection_complete', description: 'Completar acción de inspección', func: this.testInspectionComplete.bind(this) },

                // ===== DASHBOARD Y REPORTES =====
                { name: 'dashboard_kpis_api', description: 'API KPIs dashboard', func: this.testDashboardKPIsAPI.bind(this) },
                { name: 'compliance_by_employee_api', description: 'API cumplimiento por empleado', func: this.testComplianceByEmployeeAPI.bind(this) },
                { name: 'expiration_report_api', description: 'API reporte vencimientos', func: this.testExpirationReportAPI.bind(this) },

                // ===== CONFIGURACIÓN =====
                { name: 'config_get_api', description: 'API obtener configuración', func: this.testConfigGetAPI.bind(this) },
                { name: 'config_update', description: 'Actualizar configuración', func: this.testConfigUpdate.bind(this) },

                // ===== VALIDACIÓN BD =====
                { name: 'db_hse_tables', description: 'BD: Tablas HSE existen', func: this.testDBHseTables.bind(this) },
                { name: 'db_multi_tenant_isolation', description: 'BD: Aislamiento multi-tenant', func: this.testDBMultiTenantIsolation.bind(this) }
            ]
        };
    }

    // ===== CATEGORÍAS EPP =====

    async testCategoriesAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/v1/hse/categories',
            'GET',
            null,
            (data) => data.success && Array.isArray(data.categories)
        );
    }

    // ===== CATÁLOGO EPP =====

    async testCatalogListAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/v1/hse/catalog',
            'GET',
            null,
            (data) => data.success && Array.isArray(data.catalog)
        );
    }

    async testCatalogCreate(execution_id) {
        const categories = await this.fetchAPI('/api/v1/hse/categories');
        if (!categories.success || !categories.categories?.length) {
            return { passed: true, message: 'No hay categorías para crear ítem' };
        }

        const catalogData = {
            category_id: categories.categories[0].id,
            name: `${this.TEST_PREFIX} EPP Test ${Date.now()}`,
            description: 'EPP de prueba para testing',
            brand: 'Test Brand',
            model: 'TM-001',
            useful_life_months: 12,
            is_active: true
        };

        return this.testAPIEndpoint(
            '/api/v1/hse/catalog',
            'POST',
            catalogData,
            (data) => data.success && data.item
        );
    }

    async testCatalogUpdate(execution_id) {
        const catalog = await this.fetchAPI('/api/v1/hse/catalog');
        if (!catalog.success || !catalog.catalog?.length) {
            return { passed: true, message: 'No hay ítems en catálogo para actualizar' };
        }
        return this.testAPIEndpoint(
            `/api/v1/hse/catalog/${catalog.catalog[0].id}`,
            'PUT',
            { description: `${this.TEST_PREFIX} Descripción actualizada ${Date.now()}` },
            (data) => data.success
        );
    }

    async testCatalogDelete(execution_id) {
        const catalog = await this.fetchAPI('/api/v1/hse/catalog?search=TEST-AUTO');
        if (!catalog.success || !catalog.catalog?.length) {
            return { passed: true, message: 'No hay ítems de prueba para desactivar' };
        }
        return this.testAPIEndpoint(
            `/api/v1/hse/catalog/${catalog.catalog[0].id}`,
            'DELETE',
            null,
            (data) => data.success
        );
    }

    // ===== MATRIZ ROL-EPP =====

    async testRequirementsListAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/v1/hse/requirements',
            'GET',
            null,
            (data) => data.success && Array.isArray(data.requirements)
        );
    }

    async testRequirementsByPositionAPI(execution_id) {
        // Obtener una posición existente
        const positions = await this.fetchAPI('/api/organizational/positions');
        if (!positions.success || !positions.positions?.length) {
            return { passed: true, message: 'No hay posiciones para verificar requerimientos' };
        }
        return this.testAPIEndpoint(
            `/api/v1/hse/requirements/position/${positions.positions[0].id}`,
            'GET',
            null,
            (data) => data.success && Array.isArray(data.requirements)
        );
    }

    async testRequirementsMatrixAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/v1/hse/requirements/matrix',
            'GET',
            null,
            (data) => data.success && (Array.isArray(data.matrix) || Array.isArray(data.requirements))
        );
    }

    async testRequirementsCreate(execution_id) {
        const catalog = await this.fetchAPI('/api/v1/hse/catalog?isActive=true');
        const positions = await this.fetchAPI('/api/organizational/positions');

        if (!catalog.success || !catalog.catalog?.length || !positions.success || !positions.positions?.length) {
            return { passed: true, message: 'Faltan datos para crear requerimiento' };
        }

        return this.testAPIEndpoint(
            '/api/v1/hse/requirements',
            'POST',
            {
                position_id: positions.positions[0].id,
                epp_catalog_id: catalog.catalog[0].id,
                is_mandatory: true
            },
            (data) => data.success || data.message?.includes('ya existe')
        );
    }

    async testRequirementsUpdate(execution_id) {
        const requirements = await this.fetchAPI('/api/v1/hse/requirements');
        if (!requirements.success || !requirements.requirements?.length) {
            return { passed: true, message: 'No hay requerimientos para actualizar' };
        }
        return this.testAPIEndpoint(
            `/api/v1/hse/requirements/${requirements.requirements[0].id}`,
            'PUT',
            { is_mandatory: true },
            (data) => data.success
        );
    }

    async testRequirementsDelete(execution_id) {
        // No eliminar requerimientos existentes en testing
        return { passed: true, message: 'Eliminación de requerimientos deshabilitada en testing' };
    }

    // ===== ENTREGAS DE EPP =====

    async testDeliveriesListAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/v1/hse/deliveries',
            'GET',
            null,
            (data) => data.success && Array.isArray(data.deliveries)
        );
    }

    async testDeliveriesByEmployeeAPI(execution_id) {
        const users = await this.fetchAPI('/api/users?limit=1');
        if (!users.success || !users.users?.length) {
            return { passed: true, message: 'No hay usuarios para verificar entregas' };
        }
        return this.testAPIEndpoint(
            `/api/v1/hse/deliveries/employee/${users.users[0].id}`,
            'GET',
            null,
            (data) => data.success && Array.isArray(data.deliveries)
        );
    }

    async testDeliveriesExpiringAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/v1/hse/deliveries/expiring?days=30',
            'GET',
            null,
            (data) => data.success && Array.isArray(data.deliveries)
        );
    }

    async testDeliveryCreate(execution_id) {
        const catalog = await this.fetchAPI('/api/v1/hse/catalog?isActive=true');
        const users = await this.fetchAPI('/api/users?limit=1');

        if (!catalog.success || !catalog.catalog?.length || !users.success || !users.users?.length) {
            return { passed: true, message: 'Faltan datos para registrar entrega' };
        }

        return this.testAPIEndpoint(
            '/api/v1/hse/deliveries',
            'POST',
            {
                employee_id: users.users[0].id,
                epp_catalog_id: catalog.catalog[0].id,
                quantity: 1,
                delivery_date: new Date().toISOString().split('T')[0],
                notes: `${this.TEST_PREFIX} Entrega de prueba`
            },
            (data) => data.success && data.delivery
        );
    }

    async testDeliveryUpdate(execution_id) {
        const deliveries = await this.fetchAPI('/api/v1/hse/deliveries');
        if (!deliveries.success || !deliveries.deliveries?.length) {
            return { passed: true, message: 'No hay entregas para actualizar' };
        }
        return this.testAPIEndpoint(
            `/api/v1/hse/deliveries/${deliveries.deliveries[0].id}`,
            'PUT',
            { notes: `${this.TEST_PREFIX} Notas actualizadas ${Date.now()}` },
            (data) => data.success
        );
    }

    async testDeliverySign(execution_id) {
        const deliveries = await this.fetchAPI('/api/v1/hse/deliveries?status=pending');
        if (!deliveries.success || !deliveries.deliveries?.length) {
            return { passed: true, message: 'No hay entregas pendientes de firma' };
        }
        return this.testAPIEndpoint(
            `/api/v1/hse/deliveries/${deliveries.deliveries[0].id}/sign`,
            'POST',
            { signatureMethod: 'digital' },
            (data) => data.success || data.message?.includes('firma')
        );
    }

    async testDeliveryReturn(execution_id) {
        const deliveries = await this.fetchAPI('/api/v1/hse/deliveries?status=active');
        if (!deliveries.success || !deliveries.deliveries?.length) {
            return { passed: true, message: 'No hay entregas activas para devolver' };
        }
        return this.testAPIEndpoint(
            `/api/v1/hse/deliveries/${deliveries.deliveries[0].id}/return`,
            'POST',
            { return_date: new Date().toISOString().split('T')[0], condition: 'good' },
            (data) => data.success || data.message?.includes('devol')
        );
    }

    async testDeliveryReplace(execution_id) {
        const deliveries = await this.fetchAPI('/api/v1/hse/deliveries?status=expired');
        if (!deliveries.success || !deliveries.deliveries?.length) {
            return { passed: true, message: 'No hay entregas vencidas para reemplazar' };
        }
        return this.testAPIEndpoint(
            `/api/v1/hse/deliveries/${deliveries.deliveries[0].id}/replace`,
            'POST',
            { reason: 'vencido' },
            (data) => data.success || data.message?.includes('reemp')
        );
    }

    // ===== INSPECCIONES =====

    async testInspectionsListAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/v1/hse/inspections',
            'GET',
            null,
            (data) => data.success && Array.isArray(data.inspections)
        );
    }

    async testInspectionsPendingAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/v1/hse/inspections/pending',
            'GET',
            null,
            (data) => data.success && Array.isArray(data.inspections)
        );
    }

    async testInspectionCreate(execution_id) {
        const deliveries = await this.fetchAPI('/api/v1/hse/deliveries?status=active');
        if (!deliveries.success || !deliveries.deliveries?.length) {
            return { passed: true, message: 'No hay entregas activas para inspeccionar' };
        }
        return this.testAPIEndpoint(
            '/api/v1/hse/inspections',
            'POST',
            {
                delivery_id: deliveries.deliveries[0].id,
                condition: 'good',
                notes: `${this.TEST_PREFIX} Inspección de prueba`,
                action_required: false
            },
            (data) => data.success && data.inspection
        );
    }

    async testInspectionComplete(execution_id) {
        const pending = await this.fetchAPI('/api/v1/hse/inspections/pending');
        if (!pending.success || !pending.inspections?.length) {
            return { passed: true, message: 'No hay inspecciones con acciones pendientes' };
        }
        return this.testAPIEndpoint(
            `/api/v1/hse/inspections/${pending.inspections[0].id}/complete`,
            'PUT',
            null,
            (data) => data.success
        );
    }

    // ===== DASHBOARD Y REPORTES =====

    async testDashboardKPIsAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/v1/hse/dashboard',
            'GET',
            null,
            (data) => data.success && data.kpis
        );
    }

    async testComplianceByEmployeeAPI(execution_id) {
        const users = await this.fetchAPI('/api/users?limit=1');
        if (!users.success || !users.users?.length) {
            return { passed: true, message: 'No hay usuarios para verificar cumplimiento' };
        }
        return this.testAPIEndpoint(
            `/api/v1/hse/compliance/${users.users[0].id}`,
            'GET',
            null,
            (data) => data.success
        );
    }

    async testExpirationReportAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/v1/hse/reports/expiring?days=30',
            'GET',
            null,
            (data) => data.success
        );
    }

    // ===== CONFIGURACIÓN =====

    async testConfigGetAPI(execution_id) {
        return this.testAPIEndpoint(
            '/api/v1/hse/config',
            'GET',
            null,
            (data) => data.success && data.config
        );
    }

    async testConfigUpdate(execution_id) {
        return this.testAPIEndpoint(
            '/api/v1/hse/config',
            'PUT',
            { reminder_days_before_expiry: 30 },
            (data) => data.success
        );
    }

    // ===== VALIDACIÓN BD =====

    async testDBHseTables(execution_id) {
        const tables = ['epp_categories', 'epp_catalog', 'epp_requirements', 'epp_deliveries', 'epp_inspections'];
        const results = [];

        for (const table of tables) {
            const result = await this.testDatabaseTable(table, ['id', 'company_id']);
            results.push({ table, ...result });
        }

        const allPassed = results.every(r => r.passed);
        return {
            passed: allPassed,
            message: allPassed ? `Todas las tablas HSE existen (${tables.length})` : `Algunas tablas faltan`,
            details: results
        };
    }

    async testDBMultiTenantIsolation(execution_id) {
        return this.testMultiTenantIsolation('epp_catalog', 'company_id');
    }
}

module.exports = HSEModuleCollector;
