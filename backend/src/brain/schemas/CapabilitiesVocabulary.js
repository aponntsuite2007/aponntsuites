/**
 * ============================================================================
 * CAPABILITIES VOCABULARY
 * ============================================================================
 *
 * Vocabulario estandarizado de capacidades para el sistema introspectivo.
 * Todas las capacidades declaradas en provides/consumes deben estar aquí.
 *
 * El vocabulario está organizado por dominios:
 * - DATA: Operaciones con datos (CRUD, queries, etc.)
 * - AUTH: Autenticación y autorización
 * - NOTIFICATION: Sistema de notificaciones
 * - FILE: Manejo de archivos
 * - REPORT: Generación de reportes
 * - INTEGRATION: Integraciones externas
 * - WORKFLOW: Flujos de trabajo
 * - UI: Capacidades de interfaz de usuario
 * - ORG: Capacidades organizacionales
 * - BUSINESS: Lógica de negocio específica
 *
 * Created: 2025-12-17
 * Phase: 1 - Schema & Vocabulary
 */

/**
 * Vocabulario de capacidades del sistema
 */
const CAPABILITIES = {
    // =========================================================================
    // DATA - Operaciones con datos
    // =========================================================================
    DATA: {
        // CRUD básico
        'data:read': {
            name: 'Lectura de datos',
            description: 'Capacidad de leer registros',
            params: ['entity', 'filters']
        },
        'data:write': {
            name: 'Escritura de datos',
            description: 'Capacidad de crear/actualizar registros',
            params: ['entity', 'data']
        },
        'data:delete': {
            name: 'Eliminación de datos',
            description: 'Capacidad de eliminar registros',
            params: ['entity', 'id']
        },
        'data:bulk': {
            name: 'Operaciones masivas',
            description: 'Operaciones sobre múltiples registros',
            params: ['entity', 'operation', 'data']
        },
        'data:export': {
            name: 'Exportación de datos',
            description: 'Exportar datos a formatos externos',
            params: ['format', 'filters']
        },
        'data:import': {
            name: 'Importación de datos',
            description: 'Importar datos desde formatos externos',
            params: ['format', 'source']
        },
        'data:search': {
            name: 'Búsqueda avanzada',
            description: 'Búsqueda con filtros complejos',
            params: ['query', 'options']
        },
        'data:aggregate': {
            name: 'Agregación de datos',
            description: 'Operaciones de agregación (sum, avg, count)',
            params: ['entity', 'aggregations', 'groupBy']
        },

        // Entidades específicas
        'data:users': {
            name: 'Datos de usuarios',
            description: 'Acceso a información de usuarios',
            entity: 'users'
        },
        'data:employees': {
            name: 'Datos de empleados',
            description: 'Acceso a información de empleados',
            entity: 'employees'
        },
        'data:attendance': {
            name: 'Datos de asistencia',
            description: 'Registros de fichajes y asistencia',
            entity: 'attendances'
        },
        'data:departments': {
            name: 'Datos de departamentos',
            description: 'Estructura departamental',
            entity: 'departments'
        },
        'data:shifts': {
            name: 'Datos de turnos',
            description: 'Configuración de turnos de trabajo',
            entity: 'shifts'
        },
        'data:vacations': {
            name: 'Datos de vacaciones',
            description: 'Solicitudes y saldos de vacaciones',
            entity: 'vacations'
        },
        'data:payroll': {
            name: 'Datos de nómina',
            description: 'Información de liquidaciones',
            entity: 'payroll'
        },
        'data:clients': {
            name: 'Datos de clientes',
            description: 'Información de clientes comerciales',
            entity: 'siac_clientes'
        },
        'data:invoices': {
            name: 'Datos de facturas',
            description: 'Facturación electrónica',
            entity: 'siac_facturas'
        },
        'data:products': {
            name: 'Datos de productos',
            description: 'Catálogo de productos/servicios',
            entity: 'siac_productos'
        },

        // ===== MÓDULOS DEL SISTEMA =====
        // Core & Admin
        'data:auth': { name: 'Autenticación', description: 'Sistema de autenticación', entity: 'auth' },
        'data:vendors': { name: 'Vendedores', description: 'Gestión de vendedores comerciales', entity: 'aponnt_staff' },
        'data:companies': { name: 'Empresas', description: 'Gestión de empresas cliente', entity: 'companies' },
        'data:company_account': { name: 'Cuenta Empresa', description: 'Gestión de cuenta de empresa', entity: 'companies' },
        'data:dashboard': { name: 'Dashboard', description: 'Panel principal de estadísticas', entity: null },
        'data:onboarding': { name: 'Onboarding', description: 'Proceso de alta de nuevos usuarios', entity: 'onboarding_steps' },
        'data:auditor': { name: 'Auditor', description: 'Sistema de auditoría y testing', entity: 'audit_logs' },
        'data:configurador_modulos': { name: 'Configurador Módulos', description: 'Configuración de módulos del sistema', entity: 'company_modules' },
        'data:roles_permissions': { name: 'Roles y Permisos', description: 'Gestión de roles y permisos', entity: 'roles' },

        // AI & Analytics
        'data:ai_assistant': { name: 'Asistente IA', description: 'Chat con IA local (Ollama)', entity: 'assistant_knowledge_base' },
        'data:emotional_analysis': { name: 'Análisis Emocional', description: 'Detección de emociones por IA', entity: 'emotional_records' },
        'data:support_ai': { name: 'Soporte IA', description: 'Asistencia de soporte con IA', entity: 'support_tickets' },
        'data:predictive_workforce_dashboard': { name: 'Dashboard Predictivo', description: 'Predicciones de workforce', entity: 'workforce_predictions' },

        // Attendance & Kiosks
        'data:kiosks': { name: 'Kioscos', description: 'Terminales de fichaje', entity: 'kiosks' },
        'data:kiosks_apk': { name: 'Kioscos APK', description: 'Aplicación móvil de kiosco', entity: 'kiosks' },
        'data:kiosks_professional': { name: 'Kioscos Pro', description: 'Kioscos profesionales avanzados', entity: 'kiosks' },
        'data:biometric_consent': { name: 'Consentimiento Biométrico', description: 'Gestión de consentimientos GDPR', entity: 'biometric_consents' },
        'data:temporary_access': { name: 'Acceso Temporal', description: 'Permisos de acceso temporales', entity: 'temporary_access' },
        'data:visitors': { name: 'Visitantes', description: 'Control de visitantes', entity: 'visitors' },

        // HR & Employees
        'data:employee_360': { name: 'Empleado 360', description: 'Vista integral del empleado', entity: 'users' },
        'data:employee_map': { name: 'Mapa Empleados', description: 'Geolocalización de empleados', entity: 'user_locations' },
        'data:mi_espacio': { name: 'Mi Espacio', description: 'Portal del empleado', entity: 'users' },
        'data:organizational_structure': { name: 'Estructura Organizacional', description: 'Organigrama de la empresa', entity: 'organizational_units' },
        'data:positions_management': { name: 'Gestión de Cargos', description: 'Administración de puestos', entity: 'positions' },
        'data:job_postings': { name: 'Búsquedas Laborales', description: 'Publicación de vacantes', entity: 'job_postings' },
        'data:training_management': { name: 'Capacitaciones', description: 'Gestión de capacitaciones', entity: 'training_sessions' },
        'data:vacation_management': { name: 'Vacaciones', description: 'Gestión de vacaciones', entity: 'vacation_requests' },
        'data:sanctions_management': { name: 'Sanciones', description: 'Gestión de sanciones laborales', entity: 'sanctions' },
        'data:medical': { name: 'Legajos Médicos', description: 'Documentación médica', entity: 'medical_records' },
        'data:art_management': { name: 'ART', description: 'Gestión de ART y accidentes', entity: 'art_records' },
        'data:procedures_manual': { name: 'Manual de Procedimientos', description: 'Documentación de procesos', entity: 'procedures' },
        'data:my_procedures': { name: 'Mis Trámites', description: 'Trámites del empleado', entity: 'employee_procedures' },

        // Hours & Payroll
        'data:hour_bank': { name: 'Banco de Horas', description: 'Gestión de horas acumuladas', entity: 'hour_bank_balances' },
        'data:hour_bank_dashboard': { name: 'Dashboard Banco Horas', description: 'Visualización de banco de horas', entity: 'hour_bank_balances' },
        'data:hours_cube_dashboard': { name: 'Cubo de Horas', description: 'Análisis multidimensional de horas', entity: 'attendances' },
        'data:payroll_liquidation': { name: 'Liquidación Nómina', description: 'Proceso de liquidación', entity: 'payroll_liquidations' },
        'data:payslip_template_editor': { name: 'Editor Recibos', description: 'Diseñador de recibos de sueldo', entity: 'payslip_templates' },

        // Communication & Notifications
        'data:inbox': { name: 'Bandeja Entrada', description: 'Notificaciones y mensajes', entity: 'inbox_items' },
        'data:notification_center': { name: 'Centro Notificaciones', description: 'Gestión de notificaciones', entity: 'notifications' },
        'data:email_service': { name: 'Servicio Email', description: 'Envío de correos electrónicos', entity: 'email_logs' },
        'data:company_email_bidirectional': { name: 'Email Bidireccional', description: 'Emails entrantes y salientes', entity: 'inbound_emails' },

        // Documents & Compliance
        'data:dms_dashboard': { name: 'Dashboard DMS', description: 'Gestión documental', entity: 'documents' },
        'data:compliance_dashboard': { name: 'Dashboard Compliance', description: 'Cumplimiento normativo', entity: 'compliance_checks' },
        'data:legal_dashboard': { name: 'Dashboard Legal', description: 'Gestión legal', entity: 'legal_documents' },
        'data:hse_management': { name: 'HSE', description: 'Higiene, Seguridad y Medio Ambiente', entity: 'hse_records' },
        'data:admin_consent_management': { name: 'Gestión Consentimientos', description: 'Administración de consentimientos', entity: 'consent_records' },

        // Support & Help
        'data:user_support': { name: 'Soporte Usuario', description: 'Sistema de tickets de soporte', entity: 'support_tickets' },
        'data:knowledge_base': { name: 'Base Conocimiento', description: 'Artículos de ayuda', entity: 'knowledge_articles' },
        'data:contextual_help_system': { name: 'Ayuda Contextual', description: 'Ayuda in-app', entity: 'help_content' },
        'data:unified_help_center': { name: 'Centro Ayuda Unificado', description: 'Portal de ayuda', entity: 'help_content' },
        'data:sla_tracking': { name: 'Tracking SLA', description: 'Seguimiento de SLAs', entity: 'sla_records' },

        // Commercial & Partners
        'data:partners': { name: 'Partners', description: 'Gestión de socios comerciales', entity: 'partners' },
        'data:associate_marketplace': { name: 'Marketplace Asociados', description: 'Marketplace de partners', entity: 'marketplace_listings' },
        'data:associate_workflow_panel': { name: 'Panel Workflow Asociados', description: 'Workflows de partners', entity: 'partner_workflows' },
        'data:partner_scoring_system': { name: 'Scoring Partners', description: 'Evaluación de partners', entity: 'partner_scores' },

        // Finance & Billing
        'data:budgets': { name: 'Presupuestos', description: 'Gestión de presupuestos', entity: 'budgets' },
        'data:contracts': { name: 'Contratos', description: 'Gestión de contratos', entity: 'contracts' },
        'data:billing': { name: 'Facturación', description: 'Sistema de facturación', entity: 'invoices' },
        'data:clientes': { name: 'Clientes SIAC', description: 'Clientes del sistema comercial', entity: 'siac_clientes' },
        'data:facturacion': { name: 'Facturación SIAC', description: 'Facturación electrónica', entity: 'siac_facturas' },
        'data:plantillas_fiscales': { name: 'Plantillas Fiscales', description: 'Templates de facturación', entity: 'fiscal_templates' },
        'data:cuentas_corrientes': { name: 'Cuentas Corrientes', description: 'Estado de cuenta de clientes', entity: 'siac_cuenta_corriente' },
        'data:cobranzas': { name: 'Cobranzas', description: 'Gestión de cobranzas', entity: 'siac_cobranzas' },
        'data:siac_commercial_dashboard': { name: 'Dashboard Comercial SIAC', description: 'Vista comercial unificada', entity: null },

        // Reports & Analytics
        'data:audit_reports': { name: 'Reportes Auditoría', description: 'Informes de auditoría', entity: 'audit_logs' },

        // Engineering & DevOps
        'data:engineering_dashboard': { name: 'Dashboard Ingeniería', description: 'Panel de ingeniería 3D', entity: null },
        'data:auto_healing_dashboard': { name: 'Dashboard Auto-Healing', description: 'Auto-reparación del sistema', entity: 'auto_healing_logs' },
        'data:testing_metrics_dashboard': { name: 'Dashboard Testing', description: 'Métricas de testing', entity: 'test_results' },
        'data:phase4_integrated_manager': { name: 'Gestor Phase4', description: 'Orquestador de tests Phase4', entity: 'phase4_executions' },
        'data:database_sync': { name: 'Sync Base Datos', description: 'Sincronización de BD', entity: null },
        'data:deployment_sync': { name: 'Sync Deployment', description: 'Sincronización de despliegues', entity: null },
        'data:deploy_manager_3stages': { name: 'Deploy 3 Stages', description: 'Gestor de deploys en 3 etapas', entity: 'deployments' },

        // External Integrations
        'data:azure_custom_vision': { name: 'Azure Custom Vision', description: 'Integración con Azure Vision', entity: null }
    },

    // =========================================================================
    // AUTH - Autenticación y autorización
    // =========================================================================
    AUTH: {
        'auth:login': {
            name: 'Login',
            description: 'Autenticación de usuarios',
            params: ['credentials']
        },
        'auth:logout': {
            name: 'Logout',
            description: 'Cierre de sesión',
            params: ['token']
        },
        'auth:validate-token': {
            name: 'Validar token',
            description: 'Verificar validez de JWT',
            params: ['token']
        },
        'auth:refresh-token': {
            name: 'Refrescar token',
            description: 'Renovar token JWT',
            params: ['refreshToken']
        },
        'auth:check-permission': {
            name: 'Verificar permiso',
            description: 'Validar permiso para acción',
            params: ['user', 'permission', 'resource']
        },
        'auth:assign-role': {
            name: 'Asignar rol',
            description: 'Asignar rol a usuario',
            params: ['userId', 'roleId']
        },
        'auth:biometric': {
            name: 'Autenticación biométrica',
            description: 'Validar huella/rostro',
            params: ['biometricData', 'type']
        },
        'auth:2fa': {
            name: 'Autenticación 2FA',
            description: 'Segundo factor de autenticación',
            params: ['code', 'method']
        },
        'auth:sso': {
            name: 'Single Sign-On',
            description: 'Autenticación federada',
            params: ['provider', 'token']
        }
    },

    // =========================================================================
    // NOTIFICATION - Sistema de notificaciones
    // =========================================================================
    NOTIFICATION: {
        'notification:send': {
            name: 'Enviar notificación',
            description: 'Enviar notificación a usuario(s)',
            params: ['recipients', 'message', 'channel']
        },
        'notification:email': {
            name: 'Enviar email',
            description: 'Notificación por correo electrónico',
            params: ['to', 'subject', 'body']
        },
        'notification:push': {
            name: 'Push notification',
            description: 'Notificación push a dispositivo',
            params: ['deviceToken', 'title', 'body']
        },
        'notification:sms': {
            name: 'Enviar SMS',
            description: 'Notificación por mensaje de texto',
            params: ['phone', 'message']
        },
        'notification:whatsapp': {
            name: 'WhatsApp',
            description: 'Notificación por WhatsApp',
            params: ['phone', 'template', 'params']
        },
        'notification:in-app': {
            name: 'Notificación in-app',
            description: 'Notificación dentro de la aplicación',
            params: ['userId', 'notification']
        },
        'notification:broadcast': {
            name: 'Broadcast',
            description: 'Notificación masiva a grupo',
            params: ['group', 'message']
        },
        'notification:schedule': {
            name: 'Programar notificación',
            description: 'Notificación diferida',
            params: ['notification', 'scheduledAt']
        }
    },

    // =========================================================================
    // FILE - Manejo de archivos
    // =========================================================================
    FILE: {
        'file:upload': {
            name: 'Subir archivo',
            description: 'Carga de archivos al sistema',
            params: ['file', 'destination']
        },
        'file:download': {
            name: 'Descargar archivo',
            description: 'Descarga de archivos',
            params: ['fileId']
        },
        'file:delete': {
            name: 'Eliminar archivo',
            description: 'Eliminación de archivos',
            params: ['fileId']
        },
        'file:list': {
            name: 'Listar archivos',
            description: 'Listado de archivos',
            params: ['path', 'filters']
        },
        'file:preview': {
            name: 'Preview archivo',
            description: 'Vista previa de documentos',
            params: ['fileId']
        },
        'file:convert': {
            name: 'Convertir archivo',
            description: 'Conversión de formatos',
            params: ['fileId', 'targetFormat']
        },
        'file:sign': {
            name: 'Firmar documento',
            description: 'Firma digital de documentos',
            params: ['fileId', 'signature']
        },
        'file:ocr': {
            name: 'OCR',
            description: 'Reconocimiento de texto en imágenes',
            params: ['fileId']
        }
    },

    // =========================================================================
    // REPORT - Generación de reportes
    // =========================================================================
    REPORT: {
        'report:generate': {
            name: 'Generar reporte',
            description: 'Creación de reportes',
            params: ['type', 'filters', 'format']
        },
        'report:schedule': {
            name: 'Programar reporte',
            description: 'Reporte recurrente automático',
            params: ['reportConfig', 'schedule']
        },
        'report:export-pdf': {
            name: 'Exportar PDF',
            description: 'Generar reporte en PDF',
            params: ['data', 'template']
        },
        'report:export-excel': {
            name: 'Exportar Excel',
            description: 'Generar reporte en Excel',
            params: ['data', 'template']
        },
        'report:dashboard': {
            name: 'Dashboard',
            description: 'Datos para dashboard visual',
            params: ['widgets', 'filters']
        },
        'report:analytics': {
            name: 'Analytics',
            description: 'Métricas y análisis avanzado',
            params: ['metrics', 'period', 'grouping']
        },
        'report:kpi': {
            name: 'KPIs',
            description: 'Indicadores clave de rendimiento',
            params: ['kpiIds', 'period']
        }
    },

    // =========================================================================
    // INTEGRATION - Integraciones externas
    // =========================================================================
    INTEGRATION: {
        'integration:afip': {
            name: 'AFIP Argentina',
            description: 'Facturación electrónica AFIP',
            params: ['operation', 'data']
        },
        'integration:sii': {
            name: 'SII Chile',
            description: 'Facturación electrónica SII',
            params: ['operation', 'data']
        },
        'integration:sunat': {
            name: 'SUNAT Perú',
            description: 'Facturación electrónica SUNAT',
            params: ['operation', 'data']
        },
        'integration:payment-gateway': {
            name: 'Pasarela de pago',
            description: 'Procesamiento de pagos',
            params: ['gateway', 'transaction']
        },
        'integration:bank': {
            name: 'Integración bancaria',
            description: 'Conexión con sistemas bancarios',
            params: ['bank', 'operation']
        },
        'integration:erp': {
            name: 'ERP externo',
            description: 'Sincronización con ERP',
            params: ['system', 'operation']
        },
        'integration:google-workspace': {
            name: 'Google Workspace',
            description: 'Calendar, Drive, etc.',
            params: ['service', 'operation']
        },
        'integration:microsoft-365': {
            name: 'Microsoft 365',
            description: 'Outlook, Teams, etc.',
            params: ['service', 'operation']
        },
        'integration:biometric-device': {
            name: 'Dispositivo biométrico',
            description: 'Comunicación con reloj biométrico',
            params: ['deviceId', 'command']
        }
    },

    // =========================================================================
    // WORKFLOW - Flujos de trabajo
    // =========================================================================
    WORKFLOW: {
        'workflow:start': {
            name: 'Iniciar workflow',
            description: 'Comenzar un flujo de trabajo',
            params: ['workflowId', 'data']
        },
        'workflow:advance': {
            name: 'Avanzar paso',
            description: 'Pasar al siguiente paso',
            params: ['instanceId', 'action']
        },
        'workflow:approve': {
            name: 'Aprobar',
            description: 'Aprobar solicitud/paso',
            params: ['instanceId', 'comment']
        },
        'workflow:reject': {
            name: 'Rechazar',
            description: 'Rechazar solicitud/paso',
            params: ['instanceId', 'reason']
        },
        'workflow:delegate': {
            name: 'Delegar',
            description: 'Delegar a otro usuario',
            params: ['instanceId', 'toUserId']
        },
        'workflow:escalate': {
            name: 'Escalar',
            description: 'Escalar a nivel superior',
            params: ['instanceId', 'reason']
        },
        'workflow:cancel': {
            name: 'Cancelar workflow',
            description: 'Cancelar flujo en proceso',
            params: ['instanceId', 'reason']
        },
        'workflow:rollback': {
            name: 'Rollback',
            description: 'Volver a paso anterior',
            params: ['instanceId', 'toStep']
        }
    },

    // =========================================================================
    // UI - Capacidades de interfaz
    // =========================================================================
    UI: {
        'ui:render-form': {
            name: 'Renderizar formulario',
            description: 'Generar formulario dinámico',
            params: ['schema', 'data']
        },
        'ui:render-table': {
            name: 'Renderizar tabla',
            description: 'Tabla de datos con features',
            params: ['columns', 'data', 'options']
        },
        'ui:render-chart': {
            name: 'Renderizar gráfico',
            description: 'Visualización de datos',
            params: ['type', 'data', 'options']
        },
        'ui:modal': {
            name: 'Modal',
            description: 'Ventana modal',
            params: ['content', 'options']
        },
        'ui:toast': {
            name: 'Toast notification',
            description: 'Notificación temporal',
            params: ['message', 'type']
        },
        'ui:wizard': {
            name: 'Wizard',
            description: 'Formulario multi-paso',
            params: ['steps', 'data']
        },
        'ui:calendar': {
            name: 'Calendario',
            description: 'Vista de calendario',
            params: ['events', 'options']
        },
        'ui:kanban': {
            name: 'Kanban',
            description: 'Vista tipo Kanban',
            params: ['columns', 'cards']
        },
        'ui:gantt': {
            name: 'Gantt',
            description: 'Diagrama de Gantt',
            params: ['tasks', 'options']
        },
        'ui:tree': {
            name: 'Tree view',
            description: 'Vista jerárquica',
            params: ['nodes', 'options']
        }
    },

    // =========================================================================
    // ORG - Capacidades organizacionales
    // =========================================================================
    ORG: {
        'org:hierarchy': {
            name: 'Jerarquía organizacional',
            description: 'Estructura de la organización',
            params: ['companyId']
        },
        'org:supervisor': {
            name: 'Supervisor',
            description: 'Identificar supervisor de empleado',
            params: ['employeeId']
        },
        'org:subordinates': {
            name: 'Subordinados',
            description: 'Lista de subordinados',
            params: ['supervisorId']
        },
        'org:team': {
            name: 'Equipo',
            description: 'Miembros de un equipo',
            params: ['teamId']
        },
        'org:branch': {
            name: 'Sucursal',
            description: 'Información de sucursal',
            params: ['branchId']
        },
        'org:schedule': {
            name: 'Horario',
            description: 'Horario de trabajo',
            params: ['entityId', 'entityType']
        },
        'org:availability': {
            name: 'Disponibilidad',
            description: 'Disponibilidad de persona/recurso',
            params: ['entityId', 'period']
        }
    },

    // =========================================================================
    // BUSINESS - Lógica de negocio específica
    // =========================================================================
    BUSINESS: {
        'business:calculate-overtime': {
            name: 'Calcular horas extra',
            description: 'Cálculo de horas extraordinarias',
            params: ['employeeId', 'period']
        },
        'business:calculate-payroll': {
            name: 'Calcular nómina',
            description: 'Liquidación de sueldos',
            params: ['employeeIds', 'period']
        },
        'business:calculate-vacation': {
            name: 'Calcular vacaciones',
            description: 'Saldo de vacaciones',
            params: ['employeeId']
        },
        'business:calculate-commission': {
            name: 'Calcular comisión',
            description: 'Comisiones de ventas',
            params: ['salesData', 'rules']
        },
        'business:apply-discount': {
            name: 'Aplicar descuento',
            description: 'Cálculo de descuentos',
            params: ['items', 'rules']
        },
        'business:calculate-tax': {
            name: 'Calcular impuestos',
            description: 'Cálculo de IVA, IIBB, etc.',
            params: ['amount', 'taxType', 'jurisdiction']
        },
        'business:validate-fiscal': {
            name: 'Validar datos fiscales',
            description: 'Validación CUIT/RUT/RFC',
            params: ['fiscalId', 'country']
        },
        'business:price-list': {
            name: 'Lista de precios',
            description: 'Obtener precios vigentes',
            params: ['clientId', 'productIds']
        },
        'business:stock-check': {
            name: 'Verificar stock',
            description: 'Disponibilidad de inventario',
            params: ['productId', 'warehouseId']
        },
        'business:credit-check': {
            name: 'Verificar crédito',
            description: 'Estado de cuenta corriente',
            params: ['clientId']
        }
    }
};

/**
 * Clase para gestionar el vocabulario de capacidades
 */
class CapabilitiesVocabulary {
    /**
     * Obtener todas las capacidades como lista plana
     */
    static getAllCapabilities() {
        const all = [];
        for (const domain of Object.keys(CAPABILITIES)) {
            for (const key of Object.keys(CAPABILITIES[domain])) {
                all.push({
                    key,
                    domain,
                    ...CAPABILITIES[domain][key]
                });
            }
        }
        return all;
    }

    /**
     * Verificar si una capacidad existe en el vocabulario
     * @param {string} capability - Ej: 'data:users', 'auth:login'
     */
    static isValid(capability) {
        // Extraer dominio del capability (parte antes de ":")
        const parts = capability.split(':');
        if (parts.length < 2) return false;

        const domain = parts[0].toUpperCase();
        if (!CAPABILITIES[domain]) return false;

        return CAPABILITIES[domain].hasOwnProperty(capability);
    }

    /**
     * Obtener definición de una capacidad
     * @param {string} capability
     */
    static getDefinition(capability) {
        const parts = capability.split(':');
        if (parts.length < 2) return null;

        const domain = parts[0].toUpperCase();
        if (!CAPABILITIES[domain]) return null;

        return CAPABILITIES[domain][capability] || null;
    }

    /**
     * Obtener todas las capacidades de un dominio
     * @param {string} domain - Ej: 'DATA', 'AUTH', 'NOTIFICATION'
     */
    static getByDomain(domain) {
        const upperDomain = domain.toUpperCase();
        if (!CAPABILITIES[upperDomain]) return [];

        return Object.entries(CAPABILITIES[upperDomain]).map(([key, def]) => ({
            key,
            ...def
        }));
    }

    /**
     * Buscar capacidades que coincidan con un patrón
     * @param {string} pattern - Patrón de búsqueda
     */
    static search(pattern) {
        const regex = new RegExp(pattern, 'i');
        return this.getAllCapabilities().filter(cap =>
            regex.test(cap.key) || regex.test(cap.name) || regex.test(cap.description)
        );
    }

    /**
     * Verificar compatibilidad entre un provides y un consumes
     * @param {string} provides - Lo que ofrece un nodo
     * @param {string} consumes - Lo que necesita otro nodo
     */
    static isCompatible(provides, consumes) {
        // Coincidencia exacta
        if (provides === consumes) return true;

        // Coincidencia de dominio (ej: data:* provee data:read)
        const providesParts = provides.split(':');
        const consumesParts = consumes.split(':');

        // Si provides termina en *, es un wildcard de dominio
        if (providesParts[1] === '*' && providesParts[0] === consumesParts[0]) {
            return true;
        }

        // data:write también satisface data:read (write implica read)
        if (provides === 'data:write' && consumes === 'data:read') {
            return true;
        }

        return false;
    }

    /**
     * Obtener estadísticas del vocabulario
     */
    static getStats() {
        const stats = {
            totalDomains: Object.keys(CAPABILITIES).length,
            totalCapabilities: 0,
            byDomain: {}
        };

        for (const domain of Object.keys(CAPABILITIES)) {
            const count = Object.keys(CAPABILITIES[domain]).length;
            stats.byDomain[domain] = count;
            stats.totalCapabilities += count;
        }

        return stats;
    }

    /**
     * Imprimir el vocabulario completo
     */
    static print() {
        console.log('\n' + '='.repeat(70));
        console.log('CAPABILITIES VOCABULARY');
        console.log('='.repeat(70));

        for (const domain of Object.keys(CAPABILITIES)) {
            console.log(`\n📁 ${domain}`);
            console.log('-'.repeat(40));
            for (const [key, def] of Object.entries(CAPABILITIES[domain])) {
                console.log(`   ${key}`);
                console.log(`      ${def.description}`);
            }
        }

        const stats = this.getStats();
        console.log('\n' + '='.repeat(70));
        console.log(`Total: ${stats.totalCapabilities} capabilities in ${stats.totalDomains} domains`);
        console.log('='.repeat(70) + '\n');
    }
}

// Eventos estándar del sistema (para emits/listens)
const STANDARD_EVENTS = {
    // Eventos de datos
    'entity:created': { description: 'Entidad creada', payload: ['entity', 'data'] },
    'entity:updated': { description: 'Entidad actualizada', payload: ['entity', 'data', 'changes'] },
    'entity:deleted': { description: 'Entidad eliminada', payload: ['entity', 'id'] },

    // Eventos de autenticación
    'user:logged-in': { description: 'Usuario inició sesión', payload: ['userId', 'timestamp'] },
    'user:logged-out': { description: 'Usuario cerró sesión', payload: ['userId', 'timestamp'] },
    'user:session-expired': { description: 'Sesión expirada', payload: ['userId'] },

    // Eventos de workflow
    'workflow:started': { description: 'Workflow iniciado', payload: ['instanceId', 'workflowId'] },
    'workflow:completed': { description: 'Workflow completado', payload: ['instanceId'] },
    'workflow:step-changed': { description: 'Cambio de paso', payload: ['instanceId', 'step'] },
    'workflow:approval-pending': { description: 'Pendiente de aprobación', payload: ['instanceId', 'approvers'] },

    // Eventos de asistencia
    'attendance:clock-in': { description: 'Fichaje de entrada', payload: ['employeeId', 'timestamp', 'location'] },
    'attendance:clock-out': { description: 'Fichaje de salida', payload: ['employeeId', 'timestamp'] },
    'attendance:late-arrival': { description: 'Llegada tardía', payload: ['employeeId', 'minutesLate'] },
    'attendance:early-departure': { description: 'Salida anticipada', payload: ['employeeId', 'minutesEarly'] },
    'attendance:absence': { description: 'Ausencia detectada', payload: ['employeeId', 'date'] },

    // Eventos comerciales
    'invoice:created': { description: 'Factura creada', payload: ['invoiceId', 'amount'] },
    'invoice:paid': { description: 'Factura pagada', payload: ['invoiceId', 'paymentId'] },
    'invoice:overdue': { description: 'Factura vencida', payload: ['invoiceId', 'daysOverdue'] },
    'payment:received': { description: 'Pago recibido', payload: ['paymentId', 'amount'] },
    'order:created': { description: 'Pedido creado', payload: ['orderId'] },
    'quote:approved': { description: 'Presupuesto aprobado', payload: ['quoteId'] },

    // Eventos de sistema
    'system:error': { description: 'Error del sistema', payload: ['error', 'context'] },
    'system:warning': { description: 'Advertencia del sistema', payload: ['warning', 'context'] },
    'system:health-check': { description: 'Health check', payload: ['status', 'metrics'] },
    'system:backup-completed': { description: 'Backup completado', payload: ['backupId'] },

    // Eventos de notificación
    'notification:sent': { description: 'Notificación enviada', payload: ['notificationId', 'channel'] },
    'notification:read': { description: 'Notificación leída', payload: ['notificationId', 'userId'] },
    'notification:failed': { description: 'Fallo en notificación', payload: ['notificationId', 'error'] }
};

module.exports = {
    CapabilitiesVocabulary,
    CAPABILITIES,
    STANDARD_EVENTS
};
