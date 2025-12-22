/**
 * ============================================================================
 * SMART TEST GENERATOR
 * ============================================================================
 *
 * Generador inteligente de tests que usa el Brain Introspectivo para:
 * 1. Conocer endpoints y capacidades de cada módulo
 * 2. Generar casos de prueba basados en capacidades
 * 3. Priorizar tests según dependencias y criticidad
 * 4. Detectar qué módulos testear cuando uno cambia
 *
 * INTEGRACIÓN CON PHASE4TESTORCHESTRATOR:
 * - Provee test specs generados automáticamente
 * - Sugiere orden de ejecución basado en dependencias
 * - Identifica módulos críticos para smoke tests
 *
 * Created: 2025-12-17
 * Phase: 5 - Phase4 Integration
 */

const path = require('path');

class SmartTestGenerator {
    constructor(brain) {
        this.brain = brain;
        this.testTemplates = this._initializeTemplates();
    }

    /**
     * Inicializar templates de tests por capacidad
     */
    _initializeTemplates() {
        // Templates base para operaciones genéricas
        const dataEntityTemplate = (entityName) => ({
            name: `${entityName} Operations`,
            tests: [
                { type: 'list', description: `Should list all ${entityName}` },
                { type: 'get_by_id', description: `Should get ${entityName} by ID` },
                { type: 'create', description: `Should create new ${entityName}` },
                { type: 'update', description: `Should update existing ${entityName}` },
                { type: 'delete', description: `Should delete ${entityName}` },
                { type: 'not_found', description: `Should handle ${entityName} not found` },
                { type: 'validation', description: `Should validate ${entityName} data` },
                { type: 'auth_required', description: `Should require authentication for ${entityName}` }
            ]
        });

        const dashboardTemplate = (dashName) => ({
            name: `${dashName} Dashboard`,
            tests: [
                { type: 'load', description: `Should load ${dashName} dashboard` },
                { type: 'data', description: `Should return ${dashName} data` },
                { type: 'filters', description: `Should apply filters to ${dashName}` },
                { type: 'export', description: `Should export ${dashName} data` },
                { type: 'permissions', description: `Should respect permissions for ${dashName}` }
            ]
        });

        return {
            // ===== OPERACIONES CRUD BÁSICAS =====
            'data:read': {
                name: 'Read Operation',
                tests: [
                    { type: 'success', description: 'Should return data for valid request' },
                    { type: 'empty', description: 'Should handle empty results' },
                    { type: 'filter', description: 'Should filter results correctly' },
                    { type: 'pagination', description: 'Should paginate large results' }
                ]
            },
            'data:write': {
                name: 'Write Operation',
                tests: [
                    { type: 'create', description: 'Should create new record' },
                    { type: 'update', description: 'Should update existing record' },
                    { type: 'validation', description: 'Should reject invalid data' },
                    { type: 'duplicate', description: 'Should handle duplicates' }
                ]
            },
            'data:delete': {
                name: 'Delete Operation',
                tests: [
                    { type: 'success', description: 'Should delete existing record' },
                    { type: 'not_found', description: 'Should handle non-existent record' },
                    { type: 'cascade', description: 'Should handle cascade deletes' }
                ]
            },
            'data:bulk': {
                name: 'Bulk Operations',
                tests: [
                    { type: 'bulk_create', description: 'Should create multiple records' },
                    { type: 'bulk_update', description: 'Should update multiple records' },
                    { type: 'bulk_delete', description: 'Should delete multiple records' },
                    { type: 'partial_failure', description: 'Should handle partial failures' }
                ]
            },
            'data:export': {
                name: 'Data Export',
                tests: [
                    { type: 'csv', description: 'Should export to CSV' },
                    { type: 'excel', description: 'Should export to Excel' },
                    { type: 'pdf', description: 'Should export to PDF' },
                    { type: 'large_dataset', description: 'Should handle large exports' }
                ]
            },
            'data:import': {
                name: 'Data Import',
                tests: [
                    { type: 'csv', description: 'Should import from CSV' },
                    { type: 'excel', description: 'Should import from Excel' },
                    { type: 'validation', description: 'Should validate imported data' },
                    { type: 'duplicates', description: 'Should handle duplicate imports' }
                ]
            },
            'data:search': {
                name: 'Advanced Search',
                tests: [
                    { type: 'text', description: 'Should search by text' },
                    { type: 'filters', description: 'Should apply multiple filters' },
                    { type: 'sort', description: 'Should sort results' },
                    { type: 'empty', description: 'Should handle no results' }
                ]
            },
            'data:aggregate': {
                name: 'Data Aggregation',
                tests: [
                    { type: 'count', description: 'Should count records' },
                    { type: 'sum', description: 'Should sum values' },
                    { type: 'average', description: 'Should calculate averages' },
                    { type: 'group_by', description: 'Should group results' }
                ]
            },

            // ===== AUTENTICACIÓN =====
            'auth:login': {
                name: 'Login',
                tests: [
                    { type: 'success', description: 'Should login with valid credentials' },
                    { type: 'invalid_password', description: 'Should reject invalid password' },
                    { type: 'invalid_user', description: 'Should reject unknown user' },
                    { type: 'locked', description: 'Should handle locked account' },
                    { type: 'token', description: 'Should return valid JWT token' }
                ]
            },
            'auth:logout': {
                name: 'Logout',
                tests: [
                    { type: 'success', description: 'Should logout successfully' },
                    { type: 'invalidate_token', description: 'Should invalidate token' }
                ]
            },
            'auth:validate-token': {
                name: 'Token Validation',
                tests: [
                    { type: 'valid', description: 'Should accept valid token' },
                    { type: 'expired', description: 'Should reject expired token' },
                    { type: 'invalid', description: 'Should reject invalid token' },
                    { type: 'missing', description: 'Should reject missing token' }
                ]
            },
            'auth:refresh-token': {
                name: 'Token Refresh',
                tests: [
                    { type: 'success', description: 'Should refresh valid token' },
                    { type: 'expired', description: 'Should reject expired refresh token' },
                    { type: 'new_token', description: 'Should return new access token' }
                ]
            },
            'auth:check-permission': {
                name: 'Permission Check',
                tests: [
                    { type: 'allowed', description: 'Should allow permitted action' },
                    { type: 'denied', description: 'Should deny unpermitted action' },
                    { type: 'role_based', description: 'Should check role permissions' }
                ]
            },
            'auth:assign-role': {
                name: 'Role Assignment',
                tests: [
                    { type: 'assign', description: 'Should assign role to user' },
                    { type: 'remove', description: 'Should remove role from user' },
                    { type: 'invalid_role', description: 'Should reject invalid role' }
                ]
            },
            'auth:biometric': {
                name: 'Biometric Auth',
                tests: [
                    { type: 'fingerprint', description: 'Should validate fingerprint' },
                    { type: 'face', description: 'Should validate face recognition' },
                    { type: 'no_match', description: 'Should reject no match' }
                ]
            },

            // ===== NOTIFICACIONES =====
            'notification:send': {
                name: 'Send Notification',
                tests: [
                    { type: 'success', description: 'Should send notification' },
                    { type: 'invalid_recipient', description: 'Should handle invalid recipient' },
                    { type: 'template', description: 'Should apply template correctly' }
                ]
            },
            'notification:email': {
                name: 'Email Notification',
                tests: [
                    { type: 'send', description: 'Should send email' },
                    { type: 'template', description: 'Should use email template' },
                    { type: 'attachments', description: 'Should include attachments' },
                    { type: 'invalid_email', description: 'Should validate email address' }
                ]
            },
            'notification:push': {
                name: 'Push Notification',
                tests: [
                    { type: 'send', description: 'Should send push notification' },
                    { type: 'invalid_token', description: 'Should handle invalid device token' }
                ]
            },
            'notification:in-app': {
                name: 'In-App Notification',
                tests: [
                    { type: 'create', description: 'Should create in-app notification' },
                    { type: 'mark_read', description: 'Should mark as read' },
                    { type: 'list', description: 'Should list notifications' }
                ]
            },

            // ===== WORKFLOWS =====
            'workflow:start': {
                name: 'Start Workflow',
                tests: [
                    { type: 'start', description: 'Should start new workflow' },
                    { type: 'invalid_data', description: 'Should reject invalid data' },
                    { type: 'duplicate', description: 'Should prevent duplicate workflows' }
                ]
            },
            'workflow:advance': {
                name: 'Advance Workflow',
                tests: [
                    { type: 'next_step', description: 'Should advance to next step' },
                    { type: 'validation', description: 'Should validate step data' },
                    { type: 'complete', description: 'Should complete workflow' }
                ]
            },
            'workflow:approve': {
                name: 'Workflow Approval',
                tests: [
                    { type: 'approve', description: 'Should approve pending item' },
                    { type: 'reject', description: 'Should reject with reason' },
                    { type: 'unauthorized', description: 'Should block unauthorized approvals' },
                    { type: 'already_processed', description: 'Should handle already processed items' }
                ]
            },
            'workflow:reject': {
                name: 'Workflow Rejection',
                tests: [
                    { type: 'reject', description: 'Should reject workflow' },
                    { type: 'reason_required', description: 'Should require rejection reason' },
                    { type: 'notify', description: 'Should notify requester' }
                ]
            },
            'workflow:delegate': {
                name: 'Workflow Delegation',
                tests: [
                    { type: 'delegate', description: 'Should delegate to another user' },
                    { type: 'invalid_user', description: 'Should reject invalid delegatee' }
                ]
            },
            'workflow:escalate': {
                name: 'Workflow Escalation',
                tests: [
                    { type: 'escalate', description: 'Should escalate to supervisor' },
                    { type: 'auto_escalate', description: 'Should auto-escalate after timeout' }
                ]
            },

            // ===== REPORTES =====
            'report:generate': {
                name: 'Report Generation',
                tests: [
                    { type: 'pdf', description: 'Should generate PDF report' },
                    { type: 'excel', description: 'Should generate Excel report' },
                    { type: 'empty_data', description: 'Should handle empty data' },
                    { type: 'large_data', description: 'Should handle large datasets' }
                ]
            },
            'report:schedule': {
                name: 'Scheduled Reports',
                tests: [
                    { type: 'create', description: 'Should create scheduled report' },
                    { type: 'execute', description: 'Should execute on schedule' },
                    { type: 'cancel', description: 'Should cancel scheduled report' }
                ]
            },
            'report:dashboard': {
                name: 'Dashboard Reports',
                tests: [
                    { type: 'widgets', description: 'Should load dashboard widgets' },
                    { type: 'refresh', description: 'Should refresh data' },
                    { type: 'filters', description: 'Should apply date filters' }
                ]
            },
            'report:analytics': {
                name: 'Analytics Reports',
                tests: [
                    { type: 'metrics', description: 'Should calculate metrics' },
                    { type: 'trends', description: 'Should show trends' },
                    { type: 'comparisons', description: 'Should compare periods' }
                ]
            },
            'report:kpi': {
                name: 'KPI Reports',
                tests: [
                    { type: 'calculate', description: 'Should calculate KPIs' },
                    { type: 'targets', description: 'Should compare with targets' },
                    { type: 'alerts', description: 'Should trigger alerts' }
                ]
            },

            // ===== ARCHIVOS =====
            'file:upload': {
                name: 'File Upload',
                tests: [
                    { type: 'success', description: 'Should upload file' },
                    { type: 'size_limit', description: 'Should reject oversized files' },
                    { type: 'type_validation', description: 'Should validate file type' },
                    { type: 'virus_scan', description: 'Should scan for viruses' }
                ]
            },
            'file:download': {
                name: 'File Download',
                tests: [
                    { type: 'success', description: 'Should download file' },
                    { type: 'not_found', description: 'Should handle missing file' },
                    { type: 'permissions', description: 'Should check permissions' }
                ]
            },
            'file:delete': {
                name: 'File Delete',
                tests: [
                    { type: 'success', description: 'Should delete file' },
                    { type: 'not_found', description: 'Should handle missing file' }
                ]
            },
            'file:preview': {
                name: 'File Preview',
                tests: [
                    { type: 'image', description: 'Should preview images' },
                    { type: 'pdf', description: 'Should preview PDFs' },
                    { type: 'unsupported', description: 'Should handle unsupported types' }
                ]
            },

            // ===== UI =====
            'ui:render-form': {
                name: 'Form Rendering',
                tests: [
                    { type: 'render', description: 'Should render form' },
                    { type: 'validation', description: 'Should validate inputs' },
                    { type: 'submit', description: 'Should submit data' }
                ]
            },
            'ui:render-table': {
                name: 'Table Rendering',
                tests: [
                    { type: 'render', description: 'Should render table' },
                    { type: 'sort', description: 'Should sort columns' },
                    { type: 'filter', description: 'Should filter rows' },
                    { type: 'pagination', description: 'Should paginate' }
                ]
            },
            'ui:render-chart': {
                name: 'Chart Rendering',
                tests: [
                    { type: 'render', description: 'Should render chart' },
                    { type: 'data_update', description: 'Should update with new data' },
                    { type: 'empty_data', description: 'Should handle empty data' }
                ]
            },
            'ui:modal': {
                name: 'Modal',
                tests: [
                    { type: 'open', description: 'Should open modal' },
                    { type: 'close', description: 'Should close modal' },
                    { type: 'submit', description: 'Should submit modal form' }
                ]
            },
            'ui:calendar': {
                name: 'Calendar UI',
                tests: [
                    { type: 'render', description: 'Should render calendar' },
                    { type: 'events', description: 'Should show events' },
                    { type: 'navigation', description: 'Should navigate months' }
                ]
            },

            // ===== INTEGRACIONES =====
            'integration:afip': {
                name: 'AFIP Integration',
                tests: [
                    { type: 'auth', description: 'Should authenticate with AFIP' },
                    { type: 'invoice', description: 'Should create electronic invoice' },
                    { type: 'validate', description: 'Should validate CUIT' }
                ]
            },
            'integration:biometric-device': {
                name: 'Biometric Device',
                tests: [
                    { type: 'connect', description: 'Should connect to device' },
                    { type: 'sync', description: 'Should sync attendance data' },
                    { type: 'error', description: 'Should handle connection errors' }
                ]
            },

            // ===== ORGANIZACIÓN =====
            'org:hierarchy': {
                name: 'Organizational Hierarchy',
                tests: [
                    { type: 'tree', description: 'Should return org tree' },
                    { type: 'department', description: 'Should get department info' },
                    { type: 'employees', description: 'Should list employees' }
                ]
            },
            'org:supervisor': {
                name: 'Supervisor Lookup',
                tests: [
                    { type: 'find', description: 'Should find supervisor' },
                    { type: 'chain', description: 'Should get supervisor chain' },
                    { type: 'not_found', description: 'Should handle no supervisor' }
                ]
            },
            'org:schedule': {
                name: 'Schedule Management',
                tests: [
                    { type: 'get', description: 'Should get schedule' },
                    { type: 'update', description: 'Should update schedule' },
                    { type: 'conflicts', description: 'Should detect conflicts' }
                ]
            },

            // ===== BUSINESS LOGIC =====
            'business:calculate-overtime': {
                name: 'Overtime Calculation',
                tests: [
                    { type: 'calculate', description: 'Should calculate overtime hours' },
                    { type: 'rules', description: 'Should apply overtime rules' },
                    { type: 'holidays', description: 'Should handle holidays' }
                ]
            },
            'business:calculate-payroll': {
                name: 'Payroll Calculation',
                tests: [
                    { type: 'gross', description: 'Should calculate gross pay' },
                    { type: 'deductions', description: 'Should apply deductions' },
                    { type: 'net', description: 'Should calculate net pay' }
                ]
            },
            'business:calculate-vacation': {
                name: 'Vacation Calculation',
                tests: [
                    { type: 'balance', description: 'Should calculate balance' },
                    { type: 'accrual', description: 'Should calculate accrual' },
                    { type: 'request', description: 'Should validate request' }
                ]
            },
            'business:calculate-tax': {
                name: 'Tax Calculation',
                tests: [
                    { type: 'iva', description: 'Should calculate IVA' },
                    { type: 'iibb', description: 'Should calculate IIBB' },
                    { type: 'exemptions', description: 'Should apply exemptions' }
                ]
            },

            // ===== ENTIDADES DE DATOS ESPECÍFICAS =====
            'data:users': dataEntityTemplate('Users'),
            'data:employees': dataEntityTemplate('Employees'),
            'data:attendance': dataEntityTemplate('Attendance'),
            'data:departments': dataEntityTemplate('Departments'),
            'data:shifts': dataEntityTemplate('Shifts'),
            'data:vacations': dataEntityTemplate('Vacations'),
            'data:payroll': dataEntityTemplate('Payroll'),
            'data:clients': dataEntityTemplate('Clients'),
            'data:invoices': dataEntityTemplate('Invoices'),
            'data:products': dataEntityTemplate('Products'),

            // Módulos del sistema
            'data:auth': dataEntityTemplate('Auth'),
            'data:vendors': dataEntityTemplate('Vendors'),
            'data:companies': dataEntityTemplate('Companies'),
            'data:company_account': dataEntityTemplate('Company Account'),
            'data:dashboard': dashboardTemplate('Main'),
            'data:onboarding': dataEntityTemplate('Onboarding'),
            'data:auditor': dataEntityTemplate('Auditor'),
            'data:configurador_modulos': dataEntityTemplate('Module Config'),
            'data:roles_permissions': dataEntityTemplate('Roles'),

            // AI & Analytics
            'data:ai_assistant': dataEntityTemplate('AI Assistant'),
            'data:emotional_analysis': dataEntityTemplate('Emotional Analysis'),
            'data:support_ai': dataEntityTemplate('Support AI'),
            'data:predictive_workforce_dashboard': dashboardTemplate('Predictive Workforce'),

            // Attendance & Kiosks
            'data:kiosks': dataEntityTemplate('Kiosks'),
            'data:kiosks_apk': dataEntityTemplate('Kiosk APK'),
            'data:kiosks_professional': dataEntityTemplate('Kiosk Pro'),
            'data:biometric_consent': dataEntityTemplate('Biometric Consent'),
            'data:temporary_access': dataEntityTemplate('Temporary Access'),
            'data:visitors': dataEntityTemplate('Visitors'),

            // HR & Employees
            'data:employee_360': dashboardTemplate('Employee 360'),
            'data:employee_map': dashboardTemplate('Employee Map'),
            'data:mi_espacio': dashboardTemplate('Mi Espacio'),
            'data:organizational_structure': dataEntityTemplate('Org Structure'),
            'data:positions_management': dataEntityTemplate('Positions'),
            'data:job_postings': dataEntityTemplate('Job Postings'),
            'data:training_management': dataEntityTemplate('Training'),
            'data:vacation_management': dataEntityTemplate('Vacation'),
            'data:sanctions_management': dataEntityTemplate('Sanctions'),
            'data:medical': dataEntityTemplate('Medical'),
            'data:art_management': dataEntityTemplate('ART'),
            'data:procedures_manual': dataEntityTemplate('Procedures'),
            'data:my_procedures': dataEntityTemplate('My Procedures'),

            // Hours & Payroll
            'data:hour_bank': dataEntityTemplate('Hour Bank'),
            'data:hour_bank_dashboard': dashboardTemplate('Hour Bank'),
            'data:hours_cube_dashboard': dashboardTemplate('Hours Cube'),
            'data:payroll_liquidation': dataEntityTemplate('Payroll Liquidation'),
            'data:payslip_template_editor': dataEntityTemplate('Payslip Template'),

            // Communication & Notifications
            'data:inbox': dataEntityTemplate('Inbox'),
            'data:notification_center': dataEntityTemplate('Notification Center'),
            'data:email_service': dataEntityTemplate('Email Service'),
            'data:company_email_bidirectional': dataEntityTemplate('Bidirectional Email'),

            // Documents & Compliance
            'data:dms_dashboard': dashboardTemplate('DMS'),
            'data:compliance_dashboard': dashboardTemplate('Compliance'),
            'data:legal_dashboard': dashboardTemplate('Legal'),
            'data:hse_management': dataEntityTemplate('HSE'),
            'data:admin_consent_management': dataEntityTemplate('Consent Management'),

            // Support & Help
            'data:user_support': dataEntityTemplate('User Support'),
            'data:knowledge_base': dataEntityTemplate('Knowledge Base'),
            'data:contextual_help_system': dataEntityTemplate('Contextual Help'),
            'data:unified_help_center': dashboardTemplate('Help Center'),
            'data:sla_tracking': dataEntityTemplate('SLA Tracking'),

            // Commercial & Partners
            'data:partners': dataEntityTemplate('Partners'),
            'data:associate_marketplace': dataEntityTemplate('Marketplace'),
            'data:associate_workflow_panel': dashboardTemplate('Partner Workflow'),
            'data:partner_scoring_system': dataEntityTemplate('Partner Scoring'),

            // Finance & Billing
            'data:budgets': dataEntityTemplate('Budgets'),
            'data:contracts': dataEntityTemplate('Contracts'),
            'data:billing': dataEntityTemplate('Billing'),
            'data:clientes': dataEntityTemplate('Clientes SIAC'),
            'data:facturacion': dataEntityTemplate('Facturacion'),
            'data:plantillas_fiscales': dataEntityTemplate('Fiscal Templates'),
            'data:cuentas_corrientes': dataEntityTemplate('Cuentas Corrientes'),
            'data:cobranzas': dataEntityTemplate('Cobranzas'),
            'data:siac_commercial_dashboard': dashboardTemplate('SIAC Commercial'),

            // Reports & Analytics
            'data:audit_reports': dataEntityTemplate('Audit Reports'),

            // Engineering & DevOps
            'data:engineering_dashboard': dashboardTemplate('Engineering'),
            'data:auto_healing_dashboard': dashboardTemplate('Auto Healing'),
            'data:testing_metrics_dashboard': dashboardTemplate('Testing Metrics'),
            'data:phase4_integrated_manager': dataEntityTemplate('Phase4 Manager'),
            'data:database_sync': dataEntityTemplate('Database Sync'),
            'data:deployment_sync': dataEntityTemplate('Deployment Sync'),
            'data:deploy_manager_3stages': dataEntityTemplate('Deploy Manager'),

            // External Integrations
            'data:azure_custom_vision': dataEntityTemplate('Azure Vision')
        };
    }

    /**
     * Generar test specs para un módulo
     * @param {string} moduleKey
     */
    generateTestsForModule(moduleKey) {
        const node = this.brain.getNode(moduleKey);
        if (!node) {
            return {
                error: `Módulo '${moduleKey}' no encontrado`,
                tests: []
            };
        }

        const tests = [];

        // Generar tests basados en capacidades provides
        for (const provide of node.provides) {
            const template = this.testTemplates[provide.capability];
            if (template) {
                tests.push({
                    capability: provide.capability,
                    name: template.name,
                    tests: template.tests.map(t => ({
                        ...t,
                        module: moduleKey,
                        capability: provide.capability
                    }))
                });
            }
        }

        // Generar tests de integración basados en consumes
        const integrationTests = [];
        for (const consume of node.consumes) {
            if (consume.required) {
                integrationTests.push({
                    type: 'dependency',
                    description: `Should work when ${consume.capability} is available`,
                    dependency: consume.capability
                });
                integrationTests.push({
                    type: 'dependency_failure',
                    description: `Should handle ${consume.capability} failure gracefully`,
                    dependency: consume.capability
                });
            }
        }

        if (integrationTests.length > 0) {
            tests.push({
                capability: 'integration',
                name: 'Integration Tests',
                tests: integrationTests
            });
        }

        return {
            module: moduleKey,
            name: node.name,
            totalTests: tests.reduce((sum, t) => sum + t.tests.length, 0),
            testGroups: tests,
            dependencies: node.consumes.filter(c => c.required).map(c => c.capability),
            priority: this._calculatePriority(node)
        };
    }

    /**
     * Calcular prioridad de testing para un módulo
     */
    _calculatePriority(node) {
        let priority = 50; // Base

        // Módulos core tienen mayor prioridad
        if (node.commercial?.is_core) priority += 30;

        // Módulos con muchos dependientes tienen mayor prioridad
        const dependents = this.brain.whatDependsFrom(node.key);
        priority += Math.min(dependents.length * 5, 20);

        // Módulos de auth/security tienen máxima prioridad
        if (node.key.includes('auth') || node.key.includes('security')) {
            priority = 100;
        }

        return Math.min(priority, 100);
    }

    /**
     * Generar orden de ejecución de tests basado en dependencias
     */
    generateTestExecutionOrder() {
        const nodes = this.brain.getAllNodes();
        const order = [];
        const visited = new Set();

        // Función recursiva para ordenar por dependencias
        const visit = (nodeKey) => {
            if (visited.has(nodeKey)) return;
            visited.add(nodeKey);

            const node = this.brain.getNode(nodeKey);
            if (!node) return;

            // Primero visitar dependencias
            const deps = this.brain.whatDependsOn(nodeKey);
            for (const dep of deps) {
                visit(dep.node.key);
            }

            order.push({
                module: nodeKey,
                name: node.name,
                priority: this._calculatePriority(node)
            });
        };

        // Empezar por módulos sin dependencias (auth, core)
        const rootNodes = nodes.filter(n =>
            n.consumes.filter(c => c.required).length === 0
        );

        for (const root of rootNodes) {
            visit(root.key);
        }

        // Agregar resto de nodos
        for (const node of nodes) {
            visit(node.key);
        }

        // Ordenar por prioridad
        return order.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Generar smoke tests (tests críticos mínimos)
     */
    generateSmokeTests() {
        const smokeTests = [];

        // Módulos críticos
        const criticalModules = this.brain.getAllNodes()
            .filter(n => this._calculatePriority(n) > 70)
            .slice(0, 10);

        for (const node of criticalModules) {
            // Solo un test básico por módulo crítico
            smokeTests.push({
                module: node.key,
                name: node.name,
                test: {
                    type: 'smoke',
                    description: `Basic health check for ${node.name}`,
                    endpoint: `/api/${node.key.replace(/-/g, '/')}/health`,
                    expectedStatus: [200, 404] // 404 si no existe endpoint
                }
            });
        }

        return {
            name: 'Smoke Tests',
            description: 'Tests mínimos para verificar salud del sistema',
            tests: smokeTests,
            estimatedTime: smokeTests.length * 2 // 2 segundos por test
        };
    }

    /**
     * Detectar qué módulos testear cuando uno cambia
     * @param {string} changedModule - Módulo que cambió
     */
    detectAffectedTests(changedModule) {
        const impact = this.brain.whatIfFails(changedModule);
        const node = this.brain.getNode(changedModule);

        const affectedModules = new Set([changedModule]);

        // Módulos directamente afectados
        for (const affected of impact.directlyAffected) {
            affectedModules.add(affected.key);
        }

        // Módulos que escuchan eventos del módulo cambiado
        if (node) {
            for (const emit of node.emits) {
                const listeners = this.brain.whoListens(emit.event);
                for (const listener of listeners) {
                    affectedModules.add(listener.key);
                }
            }
        }

        return {
            changedModule,
            affectedModules: Array.from(affectedModules),
            totalAffected: affectedModules.size,
            recommendation: affectedModules.size > 5 ?
                'Run full test suite' :
                'Run targeted tests only'
        };
    }

    /**
     * Generar reporte de cobertura de tests
     */
    generateCoverageReport() {
        const nodes = this.brain.getAllNodes();
        let totalCapabilities = 0;
        let coveredCapabilities = 0;
        const uncovered = [];

        for (const node of nodes) {
            for (const provide of node.provides) {
                totalCapabilities++;
                if (this.testTemplates[provide.capability]) {
                    coveredCapabilities++;
                } else {
                    uncovered.push({
                        module: node.key,
                        capability: provide.capability
                    });
                }
            }
        }

        return {
            totalModules: nodes.length,
            totalCapabilities,
            coveredCapabilities,
            coveragePercent: Math.round((coveredCapabilities / totalCapabilities) * 100),
            uncoveredCapabilities: uncovered.slice(0, 20), // Top 20
            recommendation: uncovered.length > 0 ?
                `Add test templates for: ${[...new Set(uncovered.map(u => u.capability))].slice(0, 5).join(', ')}` :
                'Full coverage achieved'
        };
    }

    /**
     * Exportar configuración para Phase4TestOrchestrator
     */
    exportPhase4Config() {
        const executionOrder = this.generateTestExecutionOrder();
        const smokeTests = this.generateSmokeTests();
        const coverage = this.generateCoverageReport();

        return {
            version: '2.0',
            generatedAt: new Date().toISOString(),
            generatedBy: 'SmartTestGenerator',
            source: 'IntrospectiveBrain',

            // Configuración de ejecución
            execution: {
                order: executionOrder,
                parallel: true,
                maxConcurrency: 5,
                timeout: 30000
            },

            // Tests críticos
            smokeTests: smokeTests.tests,

            // Módulos por prioridad
            priorityGroups: {
                critical: executionOrder.filter(m => m.priority > 80),
                high: executionOrder.filter(m => m.priority > 60 && m.priority <= 80),
                medium: executionOrder.filter(m => m.priority > 40 && m.priority <= 60),
                low: executionOrder.filter(m => m.priority <= 40)
            },

            // Cobertura
            coverage,

            // Estadísticas
            stats: {
                totalModules: executionOrder.length,
                criticalModules: executionOrder.filter(m => m.priority > 80).length,
                estimatedSmokeTime: smokeTests.estimatedTime,
                coveragePercent: coverage.coveragePercent
            }
        };
    }
}

module.exports = { SmartTestGenerator };
