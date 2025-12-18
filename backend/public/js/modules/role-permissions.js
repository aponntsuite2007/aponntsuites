/**
 * ROLE PERMISSIONS - APONNT Admin Panel
 * Mapeo de roles a secciones del menú y permisos
 *
 * @version 1.0.0
 * @date 2025-12-16
 */

const RolePermissions = (function() {
    'use strict';

    // ==================== CONFIGURACIÓN DE SECCIONES ====================

    /**
     * Definición de todas las secciones disponibles en el panel
     * Cada sección tiene: id, icon, label, subsections (opcional), badge (opcional)
     */
    const ALL_SECTIONS = {
        // ========== VENDEDORES ==========
        'mi-dashboard': {
            id: 'mi-dashboard',
            icon: '📊',
            label: 'Mi Dashboard',
            description: 'KPIs personales y métricas',
            component: 'VendorDashboard'
        },
        'mis-empresas': {
            id: 'mis-empresas',
            icon: '🏢',
            label: 'Mis Empresas',
            description: 'Empresas asignadas',
            component: 'MyCompanies'
        },
        'comercial': {
            id: 'comercial',
            icon: '💰',
            label: 'Comercial',
            description: 'Módulos, precios y bundles',
            subsections: ['modulos-precios', 'bundles'],
            component: 'CommercialModule'
        },
        'presupuestos': {
            id: 'presupuestos',
            icon: '📄',
            label: 'Presupuestos',
            description: 'Gestión de presupuestos',
            component: 'BudgetsModule'
        },
        'contratos': {
            id: 'contratos',
            icon: '📑',
            label: 'Contratos',
            description: 'Contratos vigentes y vencidos',
            component: 'ContractsModule'
        },
        'mis-comisiones': {
            id: 'mis-comisiones',
            icon: '💵',
            label: 'Mis Comisiones',
            description: 'Comisiones pendientes y cobradas',
            component: 'MyCommissions'
        },
        'mis-notificaciones': {
            id: 'mis-notificaciones',
            icon: '🔔',
            label: 'Notificaciones',
            description: 'Bandeja de notificaciones comerciales',
            badge: 'unread_notifications',
            component: 'NotificationsInbox'
        },
        'mis-tickets': {
            id: 'mis-tickets',
            icon: '🎫',
            label: 'Tickets Soporte',
            description: 'Tickets de mis empresas',
            condition: 'empresa_tiene_soporte',
            component: 'MyTickets'
        },
        'capacitaciones': {
            id: 'capacitaciones',
            icon: '🎓',
            label: 'Capacitaciones',
            description: 'Tutoriales y autoevaluaciones',
            subsections: ['tutoriales', 'autoevaluaciones'],
            component: 'TrainingModule'
        },

        // ========== SOPORTE ==========
        'todos-tickets': {
            id: 'todos-tickets',
            icon: '🎫',
            label: 'Todos los Tickets',
            description: 'Vista completa de tickets',
            badge: 'pending_tickets',
            component: 'AllTickets'
        },
        'metricas-soporte': {
            id: 'metricas-soporte',
            icon: '📈',
            label: 'Métricas Soporte',
            description: 'SLA, tiempos, escalamientos',
            component: 'SupportMetrics'
        },
        'bandeja-central': {
            id: 'bandeja-central',
            icon: '📬',
            label: 'Bandeja Central',
            description: 'Notificaciones de soporte',
            badge: 'unread_support',
            component: 'CentralInbox'
        },
        'empresas-contexto': {
            id: 'empresas-contexto',
            icon: '🏢',
            label: 'Empresas',
            description: 'Vista de contexto (solo lectura)',
            readOnly: true,
            component: 'CompaniesReadOnly'
        },

        // ========== ADMINISTRACIÓN ==========
        'aponnt-billing': {
            id: 'aponnt-billing',
            icon: '📋',
            label: 'Pre-facturación',
            description: 'Pre-facturas pendientes y aprobadas',
            subsections: ['pendientes', 'aprobadas'],
            component: 'PreBillingDashboard'
        },
        'facturacion': {
            id: 'facturacion',
            icon: '🧾',
            label: 'Facturación',
            description: 'Facturas emitidas con detalle expandible',
            subsections: ['lista'],
            component: 'BillingModule'
        },
        'todos-presupuestos': {
            id: 'todos-presupuestos',
            icon: '📄',
            label: 'Presupuestos',
            description: 'Todos los presupuestos',
            component: 'AllBudgets'
        },
        'todos-contratos': {
            id: 'todos-contratos',
            icon: '📑',
            label: 'Contratos',
            description: 'Todos los contratos',
            component: 'AllContracts'
        },
        'comisiones-pago': {
            id: 'comisiones-pago',
            icon: '💵',
            label: 'Comisiones',
            description: 'Liquidación y pago de comisiones',
            subsections: ['pendientes-pago', 'pagadas', 'liquidacion'],
            component: 'CommissionsPayment'
        },
        'empresas-admin': {
            id: 'empresas-admin',
            icon: '🏢',
            label: 'Empresas',
            description: 'Vista administrativa',
            component: 'CompaniesAdmin'
        },
        'reportes-financieros': {
            id: 'reportes-financieros',
            icon: '📊',
            label: 'Reportes',
            description: 'Reportes financieros',
            component: 'FinancialReports'
        },

        // ========== INGENIERÍA ==========
        'engineering': {
            id: 'engineering',
            icon: '🏗️',
            label: 'Ingeniería 3D',
            description: 'Dashboard de ingeniería completo',
            component: 'EngineeringDashboard'
        },
        'brain-ecosystem': {
            id: 'brain-ecosystem',
            icon: '🧠',
            label: 'Brain Ecosystem',
            description: 'Auto-conocimiento y registry',
            subsections: ['registry', 'workflows', 'auto-knowledge'],
            component: 'BrainEcosystem'
        },
        'debugging': {
            id: 'debugging',
            icon: '🔧',
            label: 'Debugging',
            description: 'Auditor, logs, performance',
            subsections: ['auditor', 'logs', 'performance'],
            component: 'DebuggingTools'
        },
        'metricas-tech': {
            id: 'metricas-tech',
            icon: '📡',
            label: 'Métricas Técnicas',
            description: 'Métricas del sistema',
            component: 'TechMetrics'
        },

        // ========== GERENCIA ==========
        'gestion-staff': {
            id: 'gestion-staff',
            icon: '👥',
            label: 'Gestión Staff',
            description: 'Alta/baja y asignaciones',
            subsections: ['alta-baja', 'asignaciones', 'revocaciones'],
            component: 'StaffManagement'
        },
        'pago-comisiones': {
            id: 'pago-comisiones',
            icon: '💳',
            label: 'Pago Comisiones',
            description: 'Autorizar pagos de comisiones',
            component: 'CommissionsApproval'
        },
        'reportes-consolidados': {
            id: 'reportes-consolidados',
            icon: '📋',
            label: 'Reportes Consolidados',
            description: 'Vista ejecutiva consolidada',
            component: 'ConsolidatedReports'
        },
        'organigrama': {
            id: 'organigrama',
            icon: '🏛️',
            label: 'Organigrama',
            description: 'Estructura organizacional APONNT',
            component: 'OrgChart'
        },

        // ========== SECCIONES ADICIONALES PARA ADMINISTRACIÓN ==========
        'vendedores': {
            id: 'vendedores',
            icon: '👥',
            label: 'Vendedores',
            description: 'Gestión de vendedores y asignaciones',
            subsections: ['lista', 'nuevo', 'asignaciones', 'comisiones'],
            component: 'VendorsManagement'
        },
        'staff-aponnt': {
            id: 'staff-aponnt',
            icon: '👔',
            label: 'Staff Aponnt',
            description: 'Personal administrativo, soporte y desarrollo',
            subsections: ['lista', 'nuevo', 'areas'],
            component: 'StaffAponntManagement'
        },
        'staff-roles': {
            id: 'staff-roles',
            icon: '🎭',
            label: 'Roles de Staff',
            description: 'Gestión de roles y permisos del staff',
            subsections: ['roles', 'permisos', 'niveles'],
            component: 'StaffRolesManagement'
        },
        'tareas-admin': {
            id: 'tareas-admin',
            icon: '📝',
            label: 'Tareas',
            description: 'Comisiones y liquidaciones',
            subsections: ['comisiones', 'liquidacion'],
            component: 'TasksManagement'
        },
        'configuracion': {
            id: 'configuracion',
            icon: '⚙️',
            label: 'Configuración',
            description: 'Configuración general del sistema',
            subsections: ['general', 'notificaciones', 'integraciones'],
            component: 'SystemConfig'
        },

        // ========== MARKETING (TODOS LOS ROLES) ==========
        'marketing': {
            id: 'marketing',
            icon: '📢',
            label: 'Marketing',
            description: 'Leads y flyers "Preguntale a tu IA"',
            component: 'MarketingLeadsModule'
        },
        'sales-orchestration': {
            id: 'sales-orchestration',
            icon: '🧠',
            label: 'Sales Brain',
            description: 'Orquestación inteligente de ventas',
            component: 'SalesOrchestrationDashboard'
        }
    };

    // ==================== MAPEO DE ROLES A SECCIONES ====================

    /**
     * Configuración de menú por tipo de rol
     * Agrupa las secciones en categorías para el sidebar
     */
    const ROLE_MENU_CONFIG = {
        // ========== VENDEDORES (VEND, LV) ==========
        VENDEDOR: {
            roleCodes: ['VEND', 'LV'],
            areas: ['ventas'],
            levels: [3, 4],
            defaultSection: 'mi-dashboard',
            // Permisos: Ve SOLO sus datos, puede crear presupuestos y agregar módulos a SUS empresas
            dataScope: 'own',        // Solo ve sus datos
            canEdit: true,           // Puede editar sus propios datos
            canAddModules: true,     // Puede agregar/quitar módulos a sus empresas
            canCreateBudgets: true,  // Puede crear presupuestos
            groups: [
                {
                    title: '📊 Principal',
                    sections: ['mi-dashboard']  // Todo integrado aquí
                },
                {
                    title: '📢 Marketing',
                    sections: ['marketing', 'sales-orchestration']
                },
                {
                    title: '🎫 Soporte',
                    sections: ['mis-tickets']
                },
                {
                    title: '🎓 Capacitación',
                    sections: ['capacitaciones']
                }
            ]
        },

        // ========== SUPERVISOR VENTAS (SV area ventas) ==========
        SUPERVISOR_VENTAS: {
            roleCodes: ['SV'],
            areas: ['ventas'],
            levels: [2],
            defaultSection: 'mi-dashboard',
            // Permisos: Ve datos de su equipo de vendedores
            dataScope: 'team',       // Ve datos de su equipo
            canEdit: true,           // Puede editar
            canAddModules: true,     // Puede agregar módulos
            canCreateBudgets: true,
            groups: [
                {
                    title: '📊 Principal',
                    sections: ['mi-dashboard']  // Dashboard con filtro por vendedor
                },
                {
                    title: '📢 Marketing',
                    sections: ['marketing', 'sales-orchestration']
                },
                {
                    title: '🎫 Soporte',
                    sections: ['mis-tickets']
                }
            ]
        },

        // ========== SUPERVISOR SOPORTE ==========
        SUPERVISOR_SOPORTE: {
            roleCodes: ['SV', 'JS'],
            areas: ['soporte'],
            levels: [2, 3],
            defaultSection: 'todos-tickets',
            // Permisos: Ve todos los tickets, empresas solo contexto (read-only)
            dataScope: 'all',
            canEdit: false,          // No edita datos comerciales
            canEditTickets: true,    // Pero sí puede gestionar tickets
            groups: [
                {
                    title: '🎫 Soporte',
                    sections: ['todos-tickets', 'metricas-soporte', 'bandeja-central']
                },
                {
                    title: '📢 Marketing',
                    sections: ['marketing', 'sales-orchestration']
                }
            ]
        },

        // ========== ADMINISTRACIÓN ==========
        ADMINISTRACION: {
            roleCodes: ['GA', 'JFC', 'JCI', 'FACT', 'COB', 'CONT', 'LIQ-IMP'],
            areas: ['admin'],
            levels: [1, 2, 4],
            defaultSection: 'mi-dashboard',
            // Permisos: Ve TODO pero solo lectura (excepto facturación)
            dataScope: 'all',
            canEdit: false,          // Solo lectura en datos comerciales
            canEditBilling: true,    // Puede generar facturas
            canViewCommissions: true,// Ve comisiones pero no paga
            canManageStaff: true,    // Puede gestionar staff
            groups: [
                {
                    title: '📊 Principal',
                    sections: ['mi-dashboard']
                },
                {
                    title: '💰 Administración',
                    sections: ['aponnt-billing', 'facturacion', 'tareas-admin', 'configuracion']
                },
                {
                    title: '👥 Staff',
                    sections: ['vendedores', 'staff-aponnt', 'staff-roles', 'organigrama']
                },
                {
                    title: '📢 Marketing',
                    sections: ['marketing', 'sales-orchestration']
                },
                {
                    title: '📋 Reportes',
                    sections: ['reportes-financieros']
                }
            ]
        },

        // ========== INGENIERÍA ==========
        INGENIERIA: {
            roleCodes: ['GD', 'JI', 'ING-SR', 'DEV-FE', 'DEV-BE', 'DBA-SR', 'DBA-JR'],
            areas: ['desarrollo'],
            levels: [1, 2, 3, 4],
            defaultSection: 'engineering',
            // Permisos: Solo ve ingeniería, no ve datos comerciales
            dataScope: 'none',       // No ve datos comerciales
            canEdit: false,
            groups: [
                {
                    title: '🔧 Ingeniería',
                    sections: ['engineering', 'brain-ecosystem', 'debugging', 'metricas-tech']
                },
                {
                    title: '📢 Marketing',
                    sections: ['marketing', 'sales-orchestration']
                }
            ]
        },

        // ========== GERENTE REGIONAL ==========
        GERENCIA: {
            roleCodes: ['GR'],
            areas: ['direccion'],
            levels: [1],
            defaultSection: 'mi-dashboard',
            hasFullAccess: true,
            // Permisos: Ve todo, puede editar casi todo EXCEPTO módulos de empresas
            dataScope: 'all',
            canEdit: true,
            canAddModules: false,    // NO puede agregar/quitar módulos (eso es del vendedor)
            canCreateBudgets: true,  // Puede crear presupuestos
            canPayCommissions: true, // Puede autorizar pagos
            canManageStaff: true,    // Puede gestionar staff
            groups: [
                {
                    title: '📊 Principal',
                    sections: ['mi-dashboard']
                },
                {
                    title: '💰 Facturación',
                    sections: ['aponnt-billing']
                },
                {
                    title: '💳 Pagos',
                    sections: ['pago-comisiones']
                },
                {
                    title: '👥 Staff',
                    sections: ['gestion-staff', 'organigrama']
                },
                {
                    title: '📢 Marketing',
                    sections: ['marketing', 'sales-orchestration']
                },
                {
                    title: '🎫 Soporte',
                    sections: ['todos-tickets', 'metricas-soporte']
                },
                {
                    title: '🔧 Ingeniería',
                    sections: ['engineering', 'brain-ecosystem']
                }
            ]
        },

        // ========== GERENTE GENERAL ==========
        GERENTE_GENERAL: {
            roleCodes: ['GG'],
            areas: ['direccion'],
            levels: [0],
            defaultSection: 'mi-dashboard',
            hasFullAccess: true,
            // Permisos: TODO sin restricciones
            dataScope: 'all',
            canEdit: true,
            canAddModules: true,      // Puede todo
            canCreateBudgets: true,   // Puede crear presupuestos
            canPayCommissions: true,  // Puede pagar comisiones
            canManageStaff: true,     // Puede gestionar staff
            groups: [
                {
                    title: '📊 Principal',
                    sections: ['mi-dashboard']
                },
                {
                    title: '💰 Facturación',
                    sections: ['aponnt-billing']
                },
                {
                    title: '💳 Pagos',
                    sections: ['pago-comisiones']
                },
                {
                    title: '👥 Staff',
                    sections: ['gestion-staff', 'organigrama']
                },
                {
                    title: '📢 Marketing',
                    sections: ['marketing', 'sales-orchestration']
                },
                {
                    title: '🎫 Soporte',
                    sections: ['todos-tickets', 'metricas-soporte']
                },
                {
                    title: '🔧 Ingeniería',
                    sections: ['engineering', 'brain-ecosystem', 'debugging']
                }
            ]
        },

        // ========== SUPERADMIN (Backdoor) ==========
        SUPERADMIN: {
            roleCodes: ['SUPERADMIN'],
            areas: ['*'],
            levels: [-1],
            defaultSection: 'mi-dashboard',
            hasFullAccess: true,
            dataScope: 'all',           // Ve TODAS las empresas
            canEdit: true,              // Puede editar TODO
            canAddModules: true,        // Puede agregar módulos
            canCreateBudgets: true,     // Puede crear presupuestos
            canPayCommissions: true,    // Puede pagar comisiones
            canManageStaff: true,       // Puede gestionar staff
            groups: [
                {
                    title: '📊 Mi Dashboard',
                    sections: ['mi-dashboard']
                },
                {
                    title: '💰 Administración',
                    sections: ['aponnt-billing', 'facturacion', 'tareas-admin', 'configuracion']
                },
                {
                    title: '👥 Staff',
                    sections: ['vendedores', 'staff-aponnt', 'staff-roles', 'organigrama']
                },
                {
                    title: '📢 Marketing',
                    sections: ['marketing', 'sales-orchestration']
                },
                {
                    title: '🎫 Soporte',
                    sections: ['todos-tickets']
                },
                {
                    title: '🔧 Ingeniería',
                    sections: ['engineering', 'brain-ecosystem', 'debugging', 'metricas-tech']
                },
                {
                    title: '📋 Reportes',
                    sections: ['reportes-financieros']
                }
            ]
        }
    };

    // ==================== FUNCIONES PÚBLICAS ====================

    /**
     * Determina el tipo de rol basado en role_code, area y level
     * @param {Object} staff - Datos del staff { role: { role_code }, area, level }
     * @returns {string} Tipo de rol (VENDEDOR, SUPERVISOR_SOPORTE, etc.)
     */
    function getRoleType(staff) {
        if (!staff || !staff.role) {
            console.warn('[ROLE-PERMISSIONS] Staff data missing');
            return null;
        }

        const roleCode = staff.role.role_code || staff.role_code;
        const area = staff.area || staff.role.area || '';
        const level = staff.level !== undefined ? staff.level : (staff.role.level || 4);

        // SUPERADMIN tiene prioridad
        if (roleCode === 'SUPERADMIN' || level === -1) {
            return 'SUPERADMIN';
        }

        // Gerente General (nivel 0, máximo poder)
        if (level === 0 || roleCode === 'GG') {
            return 'GERENTE_GENERAL';
        }

        // Gerente Regional (nivel 1, casi todo excepto módulos)
        if (level === 1 && (area === 'direccion' || roleCode === 'GR')) {
            return 'GERENCIA';
        }

        // Ingeniería (area desarrollo)
        if (area === 'desarrollo') {
            return 'INGENIERIA';
        }

        // Administración (area admin)
        if (area === 'admin') {
            return 'ADMINISTRACION';
        }

        // Soporte (area soporte)
        if (area === 'soporte') {
            return 'SUPERVISOR_SOPORTE';
        }

        // Supervisor de ventas
        if (area === 'ventas' && level <= 2) {
            return 'SUPERVISOR_VENTAS';
        }

        // Vendedor por defecto si es area ventas
        if (area === 'ventas') {
            return 'VENDEDOR';
        }

        // Fallback: vendedor
        console.warn(`[ROLE-PERMISSIONS] Unknown role type for ${roleCode}/${area}/${level}, defaulting to VENDEDOR`);
        return 'VENDEDOR';
    }

    /**
     * Obtiene la configuración de menú para un staff
     * @param {Object} staff - Datos del staff
     * @returns {Object} Configuración del menú con grupos y secciones
     */
    function getMenuForStaff(staff) {
        const roleType = getRoleType(staff);
        if (!roleType) {
            return { groups: [], defaultSection: null };
        }

        const config = ROLE_MENU_CONFIG[roleType];
        if (!config) {
            console.error(`[ROLE-PERMISSIONS] No config for role type: ${roleType}`);
            return { groups: [], defaultSection: null };
        }

        // Expandir secciones con datos completos
        const expandedGroups = config.groups.map(group => ({
            title: group.title,
            sections: group.sections.map(sectionId => ALL_SECTIONS[sectionId]).filter(Boolean)
        })).filter(g => g.sections.length > 0);

        return {
            roleType,
            defaultSection: config.defaultSection,
            hasFullAccess: config.hasFullAccess || false,
            groups: expandedGroups
        };
    }

    /**
     * Verifica si un staff puede acceder a una sección específica
     * @param {Object} staff - Datos del staff
     * @param {string} sectionId - ID de la sección
     * @returns {boolean}
     */
    function canAccessSection(staff, sectionId) {
        const roleType = getRoleType(staff);
        const config = ROLE_MENU_CONFIG[roleType];

        if (!config) return false;

        // Full access tiene acceso a todo
        if (config.hasFullAccess) return true;

        // Verificar si la sección está en algún grupo del rol
        if (Array.isArray(config.groups)) {
            return config.groups.some(group =>
                group.sections.includes(sectionId)
            );
        }

        return false;
    }

    /**
     * Obtiene la sección por defecto para un staff
     * @param {Object} staff - Datos del staff
     * @returns {string} ID de la sección por defecto
     */
    function getDefaultSection(staff) {
        const roleType = getRoleType(staff);
        const config = ROLE_MENU_CONFIG[roleType];
        return config ? config.defaultSection : 'mi-dashboard';
    }

    /**
     * Obtiene los datos de una sección por ID
     * @param {string} sectionId - ID de la sección
     * @returns {Object} Datos de la sección
     */
    function getSectionData(sectionId) {
        return ALL_SECTIONS[sectionId] || null;
    }

    /**
     * Obtiene todas las secciones disponibles
     * @returns {Object} Todas las secciones
     */
    function getAllSections() {
        return { ...ALL_SECTIONS };
    }

    /**
     * Obtiene el nombre legible del tipo de rol
     * @param {string} roleType - Tipo de rol (VENDEDOR, GERENCIA, etc.)
     * @returns {string} Nombre legible
     */
    function getRoleTypeName(roleType) {
        const names = {
            'VENDEDOR': 'Vendedor',
            'SUPERVISOR_VENTAS': 'Supervisor de Ventas',
            'SUPERVISOR_SOPORTE': 'Supervisor de Soporte',
            'ADMINISTRACION': 'Administración',
            'INGENIERIA': 'Ingeniería',
            'GERENCIA': 'Gerente Regional',
            'GERENTE_GENERAL': 'Gerente General',
            'SUPERADMIN': 'Super Admin'
        };
        return names[roleType] || roleType;
    }

    /**
     * Obtiene el color del badge según el tipo de rol
     * @param {string} roleType - Tipo de rol
     * @returns {string} Color CSS
     */
    function getRoleColor(roleType) {
        const colors = {
            'VENDEDOR': '#22c55e',        // green
            'SUPERVISOR_VENTAS': '#3b82f6', // blue
            'SUPERVISOR_SOPORTE': '#f59e0b', // amber
            'ADMINISTRACION': '#8b5cf6',   // purple
            'INGENIERIA': '#06b6d4',       // cyan
            'GERENCIA': '#ef4444',         // red
            'GERENTE_GENERAL': '#dc2626',  // dark red
            'SUPERADMIN': '#ec4899'        // pink
        };
        return colors[roleType] || '#6b7280';
    }

    /**
     * Obtiene los permisos de un rol
     * @param {Object} staff - Datos del staff
     * @returns {Object} Permisos del rol
     */
    function getPermissions(staff) {
        const roleType = getRoleType(staff);
        const config = ROLE_MENU_CONFIG[roleType];

        if (!config) {
            return {
                dataScope: 'own',
                canEdit: false,
                canAddModules: false,
                canCreateBudgets: false,
                canPayCommissions: false,
                canManageStaff: false,
                canEditBilling: false,
                canEditTickets: false
            };
        }

        return {
            dataScope: config.dataScope || 'own',
            canEdit: config.canEdit || false,
            canAddModules: config.canAddModules || false,
            canCreateBudgets: config.canCreateBudgets || false,
            canPayCommissions: config.canPayCommissions || false,
            canManageStaff: config.canManageStaff || false,
            canEditBilling: config.canEditBilling || false,
            canEditTickets: config.canEditTickets || false,
            canViewCommissions: config.canViewCommissions || false,
            hasFullAccess: config.hasFullAccess || false,
            roleType: roleType
        };
    }

    // ==================== API PÚBLICA ====================
    return {
        getRoleType,
        getMenuForStaff,
        canAccessSection,
        getDefaultSection,
        getSectionData,
        getAllSections,
        getRoleTypeName,
        getRoleColor,
        getPermissions,  // Nueva función para obtener permisos detallados
        // Exponer configuraciones para debugging
        _ROLE_MENU_CONFIG: ROLE_MENU_CONFIG,
        _ALL_SECTIONS: ALL_SECTIONS
    };

})();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RolePermissions;
}
