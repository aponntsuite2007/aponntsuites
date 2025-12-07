/**
 * MANUAL DE PROCEDIMIENTOS
 * Sistema de Control Documental de Instructivos y Procedimientos
 *
 * Dark Enterprise Theme - Estilo similar a Payroll Engine
 *
 * JERARQUÍA DOCUMENTAL ESTRICTA:
 * 📜 POLÍTICA (nivel 1) - Raíz, sin padre
 * └── 📕 MANUAL (nivel 2) - DEBE pertenecer a una Política
 *     └── 📋 PROCEDIMIENTO (nivel 3) - DEBE pertenecer a un Manual
 *         └── 📝 INSTRUCTIVO (nivel 4) - DEBE pertenecer a un Procedimiento
 *
 * FEATURES v2.4.0:
 * - Sistema de ayuda contextual integrado (ModuleHelpSystem)
 * - Árbol jerárquico visual interactivo con diagrama de flujo
 * - Guía visual de jerarquía en dashboard
 * - Tooltips de ayuda en campos con data-help
 * - Jerarquía documental estricta con validación en frontend y backend
 * - Selector dinámico de documento padre según tipo
 * - Breadcrumb visual de ubicación en jerarquía
 * - Validación antes de guardar (no se permiten documentos "anárquicos")
 * - Funciones PostgreSQL para navegación de árbol (get_procedure_tree, etc.)
 *
 * @version 2.4.0
 * @date 2025-12-07
 */

// IIFE para evitar conflictos de doble carga
(function() {
'use strict';

// Guard: Evitar doble ejecución
if (window._proceduresManualLoaded) {
    console.log('[PROCEDURES] Script ya cargado, ignorando re-carga');
    return;
}
window._proceduresManualLoaded = true;

// ============================================================================
// STATE & CONFIG
// ============================================================================
const ProceduresState = {
    procedures: [],
    filters: { status: '', type: '', search: '' },
    pagination: { page: 1, limit: 20, total: 0 },
    currentView: 'dashboard',
    stats: null
};

const ProceduresConfig = {
    API_BASE: '/api/procedures',
    TYPES: {
        procedimiento: { label: 'Procedimiento', color: '#00d4ff' },
        instructivo: { label: 'Instructivo', color: '#00e676' },
        manual: { label: 'Manual', color: '#b388ff' },
        politica: { label: 'Política', color: '#ffc107' }
    },
    STATUS: {
        draft: { label: 'Borrador', color: '#6b6b80' },
        pending_review: { label: 'En Revisión', color: '#ffc107' },
        approved: { label: 'Aprobado', color: '#00d4ff' },
        published: { label: 'Publicado', color: '#00e676' },
        obsolete: { label: 'Obsoleto', color: '#ff5252' }
    },
    SCOPE_TYPES: {
        company: { label: 'Empresa Completa', icon: '🏢', description: 'Aplica a todos los empleados' },
        branch: { label: 'Sucursales', icon: '🏪', description: 'Seleccionar sucursales específicas' },
        department: { label: 'Departamentos', icon: '📁', description: 'Seleccionar departamentos específicos' },
        sector: { label: 'Sectores', icon: '📋', description: 'Seleccionar sectores específicos' },
        role: { label: 'Roles', icon: '👥', description: 'Seleccionar roles (admin, supervisor, etc.)' },
        position: { label: 'Cargos', icon: '💼', description: 'Seleccionar cargos organizacionales' },
        users: { label: 'Personas Específicas', icon: '👤', description: 'Seleccionar usuarios individuales' }
    },
    // JERARQUÍA DOCUMENTAL ESTRICTA
    HIERARCHY: {
        politica: {
            level: 1,
            icon: '📜',
            name: 'Política',
            parent: null,
            color: '#ffc107',
            description: 'Define el "qué" y "por qué" - Nivel raíz'
        },
        manual: {
            level: 2,
            icon: '📕',
            name: 'Manual',
            parent: 'politica',
            color: '#b388ff',
            description: 'Agrupa procedimientos relacionados'
        },
        procedimiento: {
            level: 3,
            icon: '📋',
            name: 'Procedimiento',
            parent: 'manual',
            color: '#00d4ff',
            description: 'Define el "cómo" detallado'
        },
        instructivo: {
            level: 4,
            icon: '📝',
            name: 'Instructivo',
            parent: 'procedimiento',
            color: '#00e676',
            description: 'Pasos específicos de una tarea'
        }
    },
    HIERARCHY_RULES: [
        'Solo las POLÍTICAS pueden existir sin documento padre',
        'Los MANUALES deben pertenecer a una POLÍTICA',
        'Los PROCEDIMIENTOS deben pertenecer a un MANUAL',
        'Los INSTRUCTIVOS deben pertenecer a un PROCEDIMIENTO',
        'No se puede eliminar un documento que tenga hijos'
    ]
};

// ============================================================================
// SISTEMA DE AYUDA CONTEXTUAL
// ============================================================================
const ProceduresHelpContent = {
    moduleName: 'Manual de Procedimientos',
    moduleDescription: 'Sistema de gestión documental con jerarquía estricta: Políticas > Manuales > Procedimientos > Instructivos',
    contexts: {
        dashboard: {
            title: 'Panel Principal',
            description: 'Vista general del sistema de procedimientos. Aquí puedes ver estadísticas, crear nuevos documentos y acceder a todas las funcionalidades.',
            tips: [
                'Los KPIs muestran el estado actual de todos tus documentos',
                'Usa "Nuevo Procedimiento" para crear cualquier tipo de documento (política, manual, procedimiento o instructivo)',
                'Los documentos siguen una jerarquía estricta: primero crea una Política, luego Manuales dentro de ella, etc.',
                'El árbol visual te permite ver toda la estructura documental de un vistazo'
            ],
            warnings: ['Los documentos obsoletos no aparecen en el contador principal'],
            helpTopics: [
                '¿Cómo creo una nueva política?',
                '¿Qué diferencia hay entre procedimiento e instructivo?',
                '¿Cómo funciona la jerarquía documental?',
                '¿Cómo publico un procedimiento?'
            ],
            fieldHelp: {
                total: 'Cantidad total de documentos activos en el sistema',
                borradores: 'Documentos en estado borrador que aún no han sido enviados a revisión',
                revision: 'Documentos esperando aprobación de un supervisor',
                publicados: 'Documentos aprobados y disponibles para todos los usuarios'
            }
        },
        hierarchy: {
            title: 'Árbol de Jerarquía Documental',
            description: 'Visualización gráfica de la estructura de documentos. Cada documento debe estar correctamente ubicado en la jerarquía.',
            tips: [
                '📜 POLÍTICAS son la raíz - definen el "qué" y "por qué"',
                '📕 MANUALES agrupan procedimientos relacionados bajo una política',
                '📋 PROCEDIMIENTOS detallan el "cómo" hacer las cosas',
                '📝 INSTRUCTIVOS son pasos específicos de una tarea concreta',
                'Haz clic en cualquier nodo para expandir/colapsar sus hijos'
            ],
            helpTopics: [
                '¿Por qué no puedo crear un manual sin política?',
                '¿Cómo muevo un documento a otro padre?',
                '¿Qué pasa si elimino un documento con hijos?'
            ]
        },
        list: {
            title: 'Lista de Documentos',
            description: 'Todos los documentos del sistema organizados en una tabla con filtros y búsqueda.',
            tips: [
                'Usa los filtros para encontrar documentos por estado o tipo',
                'El código de color indica el tipo de documento',
                'Haz clic en el ojo para ver detalles, en el lápiz para editar',
                'Los documentos publicados no pueden editarse directamente'
            ],
            helpTopics: [
                '¿Cómo filtro por tipo de documento?',
                '¿Cómo busco un procedimiento específico?'
            ]
        },
        crear: {
            title: 'Crear Nuevo Documento',
            description: 'Formulario para crear políticas, manuales, procedimientos o instructivos.',
            tips: [
                'Selecciona primero el TIPO de documento - esto determinará qué padres están disponibles',
                'Solo las Políticas pueden existir sin padre',
                'El alcance define quiénes deben conocer/cumplir este documento',
                'Los campos obligatorios están marcados con asterisco (*)'
            ],
            warnings: ['No podrás guardar sin seleccionar un documento padre (excepto para políticas)'],
            helpTopics: [
                '¿Qué es el alcance del documento?',
                '¿Puedo cambiar el tipo después de crear?',
                '¿Cómo defino quién debe leer este documento?'
            ],
            fieldHelp: {
                tipo: 'Política (raíz), Manual (agrupa), Procedimiento (detalla cómo), Instructivo (pasos específicos)',
                padre: 'Documento padre en la jerarquía. Las políticas no necesitan padre.',
                codigo: 'Identificador único del documento (ej: POL-001, MAN-RRHH-002)',
                titulo: 'Nombre descriptivo del documento',
                alcance: 'A quiénes aplica: toda la empresa, departamentos específicos, roles, etc.',
                contenido: 'Cuerpo principal del documento con el procedimiento detallado'
            }
        },
        editar: {
            title: 'Editar Documento',
            description: 'Modifica el contenido de un documento existente.',
            tips: [
                'Los cambios se guardan como borrador hasta que se publiquen',
                'Puedes cambiar el alcance sin afectar el contenido',
                'El historial de versiones se mantiene automáticamente',
                'Si alguien más está editando, verás un mensaje de bloqueo'
            ],
            warnings: ['Los documentos publicados requieren crear una nueva versión para editar']
        }
    },
    fallbackResponses: {
        politica: 'Las POLÍTICAS son documentos de nivel raíz que establecen los lineamientos generales. Son el "qué" y el "por qué" de las directrices de la empresa. No requieren documento padre.',
        manual: 'Los MANUALES agrupan procedimientos relacionados bajo una política específica. Deben pertenecer siempre a una política existente.',
        procedimiento: 'Los PROCEDIMIENTOS detallan el "cómo" se realizan las actividades. Deben pertenecer a un manual y pueden contener instructivos.',
        instructivo: 'Los INSTRUCTIVOS son pasos específicos y detallados de una tarea concreta. Siempre deben estar bajo un procedimiento.',
        jerarquia: 'La jerarquía documental es: 📜 Política > 📕 Manual > 📋 Procedimiento > 📝 Instructivo. No se permiten documentos "huérfanos".',
        crear: 'Para crear un documento: 1) Selecciona el tipo, 2) Si no es política, selecciona el padre, 3) Completa código y título, 4) Guarda como borrador.',
        publicar: 'Para publicar: 1) El documento debe estar en borrador, 2) Envíalo a revisión, 3) Un supervisor lo aprueba, 4) Luego puede publicarse.',
        alcance: 'El alcance define a quiénes aplica el documento: puede ser toda la empresa, sucursales específicas, departamentos, roles o personas individuales.'
    }
};

// Registrar en ModuleHelpSystem si está disponible
if (typeof window !== 'undefined' && window.ModuleHelpSystem) {
    window.ModuleHelpSystem.registerModule('procedures-manual', ProceduresHelpContent);
}

// ============================================================================
// API CLIENT
// ============================================================================
const ProceduresAPI = {
    getToken: () => localStorage.getItem('token') || localStorage.getItem('authToken'),

    async request(endpoint, options = {}) {
        try {
            const token = this.getToken();
            if (!token) {
                console.warn('[PROCEDURES] No token found');
                return { success: false, message: 'No autenticado' };
            }

            const response = await fetch(`${ProceduresConfig.API_BASE}${endpoint}`, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            // Handle 401 gracefully without blocking
            if (response.status === 401) {
                console.warn('[PROCEDURES] Token expired or invalid');
                return { success: false, message: 'Sesión expirada', authError: true };
            }

            return response.json();
        } catch (error) {
            console.error('[PROCEDURES] API Error:', error);
            return { success: false, message: error.message };
        }
    },

    list: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return ProceduresAPI.request(`?${qs}`);
    },
    get: (id) => ProceduresAPI.request(`/${id}`),
    create: (data) => ProceduresAPI.request('', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => ProceduresAPI.request(`/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => ProceduresAPI.request(`/${id}`, { method: 'DELETE' }),

    getStats: () => ProceduresAPI.request('/stats/dashboard'),
    submitForReview: (id) => ProceduresAPI.request(`/${id}/submit-review`, { method: 'POST' }),
    approve: (id) => ProceduresAPI.request(`/${id}/approve`, { method: 'POST' }),
    publish: (id) => ProceduresAPI.request(`/${id}/publish`, { method: 'POST' }),
    obsolete: (id) => ProceduresAPI.request(`/${id}/obsolete`, { method: 'POST' }),

    getRoles: (id) => ProceduresAPI.request(`/${id}/roles`),
    setRoles: (id, roles) => ProceduresAPI.request(`/${id}/roles`, { method: 'POST', body: JSON.stringify({ roles }) }),
    getTargetUsers: (id) => ProceduresAPI.request(`/${id}/target-users`),
    getAcknowledgements: (id) => ProceduresAPI.request(`/${id}/acknowledgements`),
    sendReminders: (id) => ProceduresAPI.request(`/${id}/send-reminders`, { method: 'POST' }),

    getVersions: (id) => ProceduresAPI.request(`/${id}/versions`),
    createNewVersion: (id, data) => ProceduresAPI.request(`/${id}/new-version`, { method: 'POST', body: JSON.stringify(data) }),

    // Scope API
    getScopeEntities: (scopeType) => ProceduresAPI.request(`/scope/entities/${scopeType}`),
    previewScopeUsers: (scopeType, scopeEntities) => ProceduresAPI.request('/scope/preview', {
        method: 'POST',
        body: JSON.stringify({ scope_type: scopeType, scope_entities: scopeEntities })
    }),
    getScopeUsers: (id) => ProceduresAPI.request(`/${id}/scope-users`),

    // Draft Lock API
    getDraftLockStatus: (id) => ProceduresAPI.request(`/${id}/lock-status`),
    lockDraft: (id) => ProceduresAPI.request(`/${id}/lock`, { method: 'POST' }),
    unlockDraft: (id) => ProceduresAPI.request(`/${id}/unlock`, { method: 'POST' }),
    getDraftLockHistory: (id) => ProceduresAPI.request(`/${id}/lock-history`),

    // Hierarchy API - JERARQUÍA DOCUMENTAL
    getHierarchyTree: (rootId = null) => ProceduresAPI.request(`/hierarchy/tree${rootId ? `?root_id=${rootId}` : ''}`),
    getHierarchyView: () => ProceduresAPI.request('/hierarchy/view'),
    getAvailableParents: (documentType, excludeId = null) =>
        ProceduresAPI.request(`/hierarchy/parents/${documentType}${excludeId ? `?exclude_id=${excludeId}` : ''}`),
    validateHierarchy: (documentType, parentId) => ProceduresAPI.request('/hierarchy/validate', {
        method: 'POST',
        body: JSON.stringify({ document_type: documentType, parent_id: parentId })
    }),
    getChildren: (id, recursive = false) => ProceduresAPI.request(`/${id}/children?recursive=${recursive}`),
    getAncestors: (id) => ProceduresAPI.request(`/${id}/ancestors`),
    canDelete: (id) => ProceduresAPI.request(`/${id}/can-delete`),
    moveToParent: (id, newParentId) => ProceduresAPI.request(`/${id}/move`, {
        method: 'POST',
        body: JSON.stringify({ new_parent_id: newParentId })
    })
};

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================
function showProceduresManualContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;

    // Evitar re-renderizado si ya está cargado
    if (document.getElementById('procedures-enterprise')) {
        console.log('[PROCEDURES] Ya renderizado, refrescando dashboard...');
        ProceduresEngine.refresh();
        return;
    }

    console.log('[PROCEDURES] Renderizando módulo...');
    content.innerHTML = `
        <div id="procedures-enterprise" class="procedures-enterprise">
            <!-- Header Enterprise -->
            <header class="pm-header">
                <div class="pm-header-left">
                    <div class="pm-logo">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                        </svg>
                    </div>
                    <div class="pm-title-block">
                        <h1 class="pm-title">MANUAL DE PROCEDIMIENTOS</h1>
                        <span class="pm-subtitle">Sistema de Control Documental</span>
                    </div>
                </div>
                <div class="pm-header-center">
                    <div class="pm-tech-badges">
                        <span class="pm-badge pm-badge-db" title="PostgreSQL Database">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4z"/></svg>
                            PostgreSQL
                        </span>
                        <span class="pm-badge pm-badge-ver" title="Control de Versiones">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/></svg>
                            Versionado
                        </span>
                        <span class="pm-badge pm-badge-doc" title="Control Documental">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                            Docs
                        </span>
                    </div>
                </div>
                <div class="pm-header-right">
                    <button onclick="ProceduresEngine.refresh()" class="pm-btn pm-btn-icon" title="Refresh">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                    </button>
                    <button onclick="ProceduresEngine.showCreateModal()" class="pm-btn pm-btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                        Nuevo
                    </button>
                </div>
            </header>

            <!-- Navigation Tabs -->
            <nav class="pm-nav">
                <button class="pm-nav-item active" data-view="dashboard" onclick="ProceduresEngine.showView('dashboard')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    Dashboard
                </button>
                <button class="pm-nav-item" data-view="list" onclick="ProceduresEngine.showView('list')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                    Procedimientos
                </button>
                <button class="pm-nav-item" data-view="pending" onclick="ProceduresEngine.showView('pending')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    Pendientes
                </button>
                <button class="pm-nav-item" data-view="published" onclick="ProceduresEngine.showView('published')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                    Publicados
                </button>
            </nav>

            <!-- Main Content Area -->
            <main class="pm-main" id="pm-content">
                <div class="pm-loading">
                    <div class="pm-spinner"></div>
                    <span>Cargando datos...</span>
                </div>
            </main>
        </div>
    `;

    injectProceduresStyles();

    // IMPORTANTE: Crear modal FUERA del #mainContent para evitar CSS !important de .authenticated
    // El CSS de panel-empresa.html tiene: #mainContent.authenticated > * { display: block !important; }
    // Esto causaba que el modal se mostrara automáticamente
    if (!document.getElementById('procedureModal')) {
        const modalHTML = `
            <div class="pm-modal-overlay" id="procedureModal">
                <div class="pm-modal">
                    <div class="pm-modal-header">
                        <h3 id="modalTitle">Formulario</h3>
                        <button class="pm-modal-close" onclick="ProceduresEngine.closeModal()">&times;</button>
                    </div>
                    <div class="pm-modal-body" id="modalBody"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    ProceduresEngine.init();
}

// ============================================================================
// PROCEDURES ENGINE
// ============================================================================
const ProceduresEngine = {
    currentProcedure: null,

    async init() {
        // Asegurar que el modal esté cerrado al iniciar
        const modal = document.getElementById('procedureModal');
        if (modal) {
            modal.classList.remove('active');
            // No manipulamos style.display - usamos solo clases CSS
        }

        // Inicializar sistema de ayuda contextual
        if (window.ModuleHelpSystem) {
            window.ModuleHelpSystem.registerModule('procedures-manual', ProceduresHelpContent);
            window.ModuleHelpSystem.init('procedures-manual', { initialContext: 'dashboard' });
        }

        await this.showView('dashboard');
    },

    async refresh() {
        await this.showView(ProceduresState.currentView);
    },

    async showView(view) {
        ProceduresState.currentView = view;

        // Update nav
        document.querySelectorAll('.pm-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Actualizar contexto de ayuda
        if (window.ModuleHelpSystem) {
            const contextMap = {
                'dashboard': 'dashboard',
                'list': 'list',
                'pending': 'list',
                'published': 'list',
                'hierarchy': 'hierarchy'
            };
            window.ModuleHelpSystem.setContext(contextMap[view] || 'dashboard');
        }

        const content = document.getElementById('pm-content');
        content.innerHTML = '<div class="pm-loading"><div class="pm-spinner"></div><span>Cargando...</span></div>';

        switch(view) {
            case 'dashboard': await this.renderDashboard(); break;
            case 'list': await this.renderList(); break;
            case 'pending': await this.renderList('pending_review'); break;
            case 'published': await this.renderList('published'); break;
            case 'hierarchy': await this.renderHierarchyTree(); break;
        }
    },

    async renderDashboard() {
        const content = document.getElementById('pm-content');
        let stats = { total: 0, draft: 0, pending_review: 0, published: 0, obsolete: 0 };

        try {
            const result = await ProceduresAPI.getStats();
            if (result.success) stats = result.stats || stats;
        } catch (e) {
            console.error('Error loading stats:', e);
        }

        // Generar banner de ayuda si está disponible
        const helpBanner = window.ModuleHelpSystem
            ? window.ModuleHelpSystem.renderBanner('dashboard')
            : '';

        content.innerHTML = `
            <div class="pm-dashboard">
                <!-- Banner de Ayuda Contextual -->
                ${helpBanner}

                <!-- Guía Rápida de Jerarquía -->
                <div class="pm-hierarchy-guide">
                    <div class="pm-hierarchy-guide-header">
                        <span class="pm-hierarchy-guide-icon">📊</span>
                        <h4>Jerarquía Documental</h4>
                        <button class="pm-hierarchy-guide-btn" onclick="ProceduresEngine.showView('hierarchy')">
                            Ver Árbol Completo →
                        </button>
                    </div>
                    <div class="pm-hierarchy-flow">
                        <div class="pm-hierarchy-node" style="--node-color: #ffc107;" data-help="dashboard.politica">
                            <span class="pm-node-icon">📜</span>
                            <span class="pm-node-label">Política</span>
                            <span class="pm-node-desc">Define "qué" y "por qué"</span>
                        </div>
                        <div class="pm-hierarchy-arrow">→</div>
                        <div class="pm-hierarchy-node" style="--node-color: #b388ff;" data-help="dashboard.manual">
                            <span class="pm-node-icon">📕</span>
                            <span class="pm-node-label">Manual</span>
                            <span class="pm-node-desc">Agrupa procedimientos</span>
                        </div>
                        <div class="pm-hierarchy-arrow">→</div>
                        <div class="pm-hierarchy-node" style="--node-color: #00d4ff;" data-help="dashboard.procedimiento">
                            <span class="pm-node-icon">📋</span>
                            <span class="pm-node-label">Procedimiento</span>
                            <span class="pm-node-desc">Detalla el "cómo"</span>
                        </div>
                        <div class="pm-hierarchy-arrow">→</div>
                        <div class="pm-hierarchy-node" style="--node-color: #00e676;" data-help="dashboard.instructivo">
                            <span class="pm-node-icon">📝</span>
                            <span class="pm-node-label">Instructivo</span>
                            <span class="pm-node-desc">Pasos específicos</span>
                        </div>
                    </div>
                </div>

                <!-- KPI Cards -->
                <div class="pm-kpi-grid">
                    <div class="pm-kpi-card" data-help="dashboard.total">
                        <div class="pm-kpi-icon" style="background: linear-gradient(135deg, #00d4ff, #0099cc);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>
                        </div>
                        <div class="pm-kpi-info">
                            <span class="pm-kpi-value">${stats.total || 0}</span>
                            <span class="pm-kpi-label">Total Documentos</span>
                        </div>
                    </div>
                    <div class="pm-kpi-card" data-help="dashboard.borradores">
                        <div class="pm-kpi-icon" style="background: linear-gradient(135deg, #6b6b80, #4a4a5a);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </div>
                        <div class="pm-kpi-info">
                            <span class="pm-kpi-value">${stats.draft || 0}</span>
                            <span class="pm-kpi-label">Borradores</span>
                        </div>
                    </div>
                    <div class="pm-kpi-card" data-help="dashboard.revision">
                        <div class="pm-kpi-icon" style="background: linear-gradient(135deg, #ffc107, #cc9900);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        </div>
                        <div class="pm-kpi-info">
                            <span class="pm-kpi-value">${stats.pending_review || 0}</span>
                            <span class="pm-kpi-label">En Revisión</span>
                        </div>
                    </div>
                    <div class="pm-kpi-card" data-help="dashboard.publicados">
                        <div class="pm-kpi-icon" style="background: linear-gradient(135deg, #00e676, #00b359);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                        </div>
                        <div class="pm-kpi-info">
                            <span class="pm-kpi-value">${stats.published || 0}</span>
                            <span class="pm-kpi-label">Publicados</span>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="pm-section">
                    <h3 class="pm-section-title">Acciones Rápidas</h3>
                    <div class="pm-quick-actions">
                        <button class="pm-action-card" onclick="ProceduresEngine.showCreateModal()">
                            <div class="pm-action-icon" style="background: rgba(0, 212, 255, 0.2); color: #00d4ff;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                            </div>
                            <span>Nuevo Documento</span>
                        </button>
                        <button class="pm-action-card" onclick="ProceduresEngine.showView('hierarchy')">
                            <div class="pm-action-icon" style="background: rgba(139, 92, 246, 0.2); color: #8b5cf6;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                            </div>
                            <span>Ver Árbol Jerárquico</span>
                        </button>
                        <button class="pm-action-card" onclick="ProceduresEngine.showView('pending')">
                            <div class="pm-action-icon" style="background: rgba(255, 193, 7, 0.2); color: #ffc107;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            </div>
                            <span>Ver Pendientes</span>
                        </button>
                        <button class="pm-action-card" onclick="ProceduresEngine.showView('list')">
                            <div class="pm-action-icon" style="background: rgba(179, 136, 255, 0.2); color: #b388ff;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>
                            </div>
                            <span>Ver Todos</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    async renderList(statusFilter = null) {
        const content = document.getElementById('pm-content');

        try {
            const params = statusFilter ? { status: statusFilter } : {};
            const result = await ProceduresAPI.list(params);

            let procedures = [];
            if (result.success) {
                procedures = Array.isArray(result.procedures) ? result.procedures : [result.procedures].filter(Boolean);
            }

            if (procedures.length === 0) {
                content.innerHTML = `
                    <div class="pm-empty">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3;">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                            <path d="M14 2v6h6M9 15h6M9 11h6"/>
                        </svg>
                        <h3>No hay procedimientos</h3>
                        <p>Crea tu primer procedimiento o instructivo</p>
                        <button class="pm-btn pm-btn-primary" onclick="ProceduresEngine.showCreateModal()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                            Crear Procedimiento
                        </button>
                    </div>
                `;
                return;
            }

            content.innerHTML = `
                <div class="pm-list-header">
                    <h3>${statusFilter ? ProceduresConfig.STATUS[statusFilter]?.label || 'Procedimientos' : 'Todos los Procedimientos'}</h3>
                    <span class="pm-badge pm-badge-count">${procedures.length}</span>
                </div>
                <div class="pm-table-container">
                    <table class="pm-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Título</th>
                                <th>Tipo</th>
                                <th>Versión</th>
                                <th>Estado</th>
                                <th>Fecha</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${procedures.map(proc => this.renderProcedureRow(proc)).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Error loading procedures:', error);
            content.innerHTML = `
                <div class="pm-error">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff5252" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
                    </svg>
                    <h3>Error al cargar</h3>
                    <p>${error.message}</p>
                    <button class="pm-btn pm-btn-primary" onclick="ProceduresEngine.refresh()">Reintentar</button>
                </div>
            `;
        }
    },

    renderProcedureRow(proc) {
        const type = ProceduresConfig.TYPES[proc.type] || ProceduresConfig.TYPES.instructivo;
        const status = ProceduresConfig.STATUS[proc.status] || ProceduresConfig.STATUS.draft;
        const date = proc.published_at || proc.created_at;
        const formattedDate = date ? new Date(date).toLocaleDateString('es-AR') : '-';

        return `
            <tr>
                <td><code class="pm-code">${proc.code}</code></td>
                <td>
                    <div class="pm-proc-title">
                        ${proc.title}
                        ${proc.is_critical ? '<span class="pm-badge pm-badge-danger">Crítico</span>' : ''}
                    </div>
                </td>
                <td><span class="pm-type-badge" style="background: ${type.color}20; color: ${type.color};">${type.label}</span></td>
                <td><span class="pm-version">${proc.version_label || '1.0'}</span></td>
                <td><span class="pm-status-badge" style="background: ${status.color}20; color: ${status.color};">${status.label}</span></td>
                <td><span class="pm-date">${formattedDate}</span></td>
                <td>
                    <div class="pm-actions">
                        <button class="pm-btn-icon-sm" onclick="ProceduresEngine.viewProcedure('${proc.id}')" title="Ver">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button class="pm-btn-icon-sm" onclick="ProceduresEngine.editProcedure('${proc.id}')" title="Editar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        ${this.renderWorkflowButtons(proc)}
                    </div>
                </td>
            </tr>
        `;
    },

    renderWorkflowButtons(proc) {
        const buttons = [];

        if (proc.status === 'draft') {
            buttons.push(`<button class="pm-btn-icon-sm pm-btn-warning" onclick="ProceduresEngine.submitForReview('${proc.id}')" title="Enviar a Revisión">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>`);
        }

        if (proc.status === 'pending_review') {
            buttons.push(`<button class="pm-btn-icon-sm pm-btn-success" onclick="ProceduresEngine.approveProcedure('${proc.id}')" title="Aprobar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
            </button>`);
        }

        if (proc.status === 'approved') {
            buttons.push(`<button class="pm-btn-icon-sm pm-btn-primary" onclick="ProceduresEngine.publishProcedure('${proc.id}')" title="Publicar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>`);
        }

        return buttons.join('');
    },

    // =========================================================================
    // ÁRBOL JERÁRQUICO VISUAL
    // =========================================================================
    async renderHierarchyTree() {
        const content = document.getElementById('pm-content');

        try {
            const result = await ProceduresAPI.getHierarchyTree();

            if (!result.success) {
                content.innerHTML = `<div class="pm-error">Error cargando jerarquía: ${result.message}</div>`;
                return;
            }

            const tree = result.tree || [];

            // Generar banner de ayuda si está disponible
            const helpBanner = window.ModuleHelpSystem
                ? window.ModuleHelpSystem.renderBanner('hierarchy')
                : '';

            // Organizar por niveles para el diagrama
            const byLevel = { 1: [], 2: [], 3: [], 4: [] };
            tree.forEach(item => {
                const level = item.hierarchy_level || 1;
                if (byLevel[level]) byLevel[level].push(item);
            });

            content.innerHTML = `
                <div class="pm-hierarchy-view">
                    ${helpBanner}

                    <div class="pm-hierarchy-header">
                        <h3>📊 Árbol de Jerarquía Documental</h3>
                        <p class="pm-hierarchy-subtitle">Visualización de la estructura completa de documentos</p>
                        <div class="pm-hierarchy-legend">
                            <span class="pm-legend-item" style="--color: #ffc107;">📜 Política</span>
                            <span class="pm-legend-item" style="--color: #b388ff;">📕 Manual</span>
                            <span class="pm-legend-item" style="--color: #00d4ff;">📋 Procedimiento</span>
                            <span class="pm-legend-item" style="--color: #00e676;">📝 Instructivo</span>
                        </div>
                    </div>

                    ${tree.length === 0 ? `
                        <div class="pm-hierarchy-empty">
                            <div class="pm-hierarchy-empty-icon">🌱</div>
                            <h4>Sin documentos aún</h4>
                            <p>Comienza creando una <strong>Política</strong> como documento raíz.</p>
                            <button class="pm-btn pm-btn-primary" onclick="ProceduresEngine.showCreateModal()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                                Crear Primera Política
                            </button>
                        </div>
                    ` : `
                        <div class="pm-hierarchy-diagram">
                            ${this.renderTreeNodes(tree)}
                        </div>

                        <!-- Tabla de resumen -->
                        <div class="pm-hierarchy-summary">
                            <h4>Resumen por Nivel</h4>
                            <div class="pm-summary-grid">
                                <div class="pm-summary-item" style="--color: #ffc107;">
                                    <span class="pm-summary-count">${byLevel[1].length}</span>
                                    <span class="pm-summary-label">📜 Políticas</span>
                                </div>
                                <div class="pm-summary-item" style="--color: #b388ff;">
                                    <span class="pm-summary-count">${byLevel[2].length}</span>
                                    <span class="pm-summary-label">📕 Manuales</span>
                                </div>
                                <div class="pm-summary-item" style="--color: #00d4ff;">
                                    <span class="pm-summary-count">${byLevel[3].length}</span>
                                    <span class="pm-summary-label">📋 Procedimientos</span>
                                </div>
                                <div class="pm-summary-item" style="--color: #00e676;">
                                    <span class="pm-summary-count">${byLevel[4].length}</span>
                                    <span class="pm-summary-label">📝 Instructivos</span>
                                </div>
                            </div>
                        </div>
                    `}
                </div>
            `;

        } catch (error) {
            console.error('Error loading hierarchy:', error);
            content.innerHTML = `<div class="pm-error">Error cargando jerarquía: ${error.message}</div>`;
        }
    },

    renderTreeNodes(tree) {
        // Construir estructura de árbol con padres e hijos
        const map = {};
        const roots = [];

        tree.forEach(item => {
            map[item.id] = { ...item, children: [] };
        });

        tree.forEach(item => {
            if (item.parent_id && map[item.parent_id]) {
                map[item.parent_id].children.push(map[item.id]);
            } else if (!item.parent_id) {
                roots.push(map[item.id]);
            }
        });

        const renderNode = (node, depth = 0) => {
            const config = ProceduresConfig.HIERARCHY[node.type] || {};
            const icon = config.icon || '📄';
            const color = config.color || '#6b6b80';
            const statusConfig = ProceduresConfig.STATUS[node.status] || {};

            const childrenHtml = node.children.length > 0
                ? `<div class="pm-tree-children">${node.children.map(c => renderNode(c, depth + 1)).join('')}</div>`
                : '';

            return `
                <div class="pm-tree-node" style="--depth: ${depth}; --node-color: ${color};">
                    <div class="pm-tree-node-content" onclick="ProceduresEngine.viewProcedure('${node.id}')">
                        <span class="pm-tree-icon">${icon}</span>
                        <div class="pm-tree-info">
                            <span class="pm-tree-code">${node.code}</span>
                            <span class="pm-tree-title">${node.title}</span>
                        </div>
                        <span class="pm-tree-status" style="background: ${statusConfig.color || '#6b6b80'}20; color: ${statusConfig.color || '#6b6b80'};">
                            ${statusConfig.label || node.status}
                        </span>
                        ${node.children.length > 0 ? `<span class="pm-tree-children-count">${node.children.length}</span>` : ''}
                    </div>
                    ${childrenHtml}
                </div>
            `;
        };

        return roots.map(root => renderNode(root)).join('');
    },

    showCreateModal() {
        console.log('[PROCEDURES] Opening create modal...');
        this.currentProcedure = null;
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modal = document.getElementById('procedureModal');

        if (!modalTitle || !modalBody || !modal) {
            console.error('[PROCEDURES] Modal elements not found:', { modalTitle, modalBody, modal });
            return;
        }

        modalTitle.textContent = 'Nuevo Procedimiento';
        const formHtml = this.renderForm();
        console.log('[PROCEDURES] Form HTML length:', formHtml?.length || 0);
        modalBody.innerHTML = formHtml;

        // Mostrar modal usando solo clase CSS (evitar style.display que puede ser sobrescrito)
        modal.classList.add('active');
        console.log('[PROCEDURES] Modal opened successfully');

        // Inicializar selector de padres para el tipo por defecto (instructivo)
        setTimeout(() => {
            const typeSelect = document.querySelector('select[name="type"]');
            if (typeSelect) {
                this.onDocumentTypeChange(typeSelect.value);
            }
        }, 100);
    },

    async editProcedure(id) {
        try {
            const result = await ProceduresAPI.get(id);
            if (result.success) {
                this.currentProcedure = result.procedure;
                const modal = document.getElementById('procedureModal');
                document.getElementById('modalTitle').textContent = 'Editar Procedimiento';
                document.getElementById('modalBody').innerHTML = this.renderForm(result.procedure);
                modal.classList.add('active');

                // Inicializar selector de padres con el tipo del procedimiento
                setTimeout(() => {
                    const typeSelect = document.querySelector('select[name="type"]');
                    if (typeSelect) {
                        this.onDocumentTypeChange(typeSelect.value);
                    }
                }, 100);
            }
        } catch (error) {
            this.showToast('Error al cargar procedimiento', 'error');
        }
    },

    async viewProcedure(id) {
        try {
            const result = await ProceduresAPI.get(id);
            if (result.success) {
                const proc = result.procedure;
                const modal = document.getElementById('procedureModal');
                document.getElementById('modalTitle').textContent = `${proc.code} - ${proc.title}`;
                document.getElementById('modalBody').innerHTML = this.renderViewContent(proc);
                modal.classList.add('active');
            }
        } catch (error) {
            this.showToast('Error al cargar procedimiento', 'error');
        }
    },

    renderViewContent(proc) {
        const type = ProceduresConfig.TYPES[proc.type] || {};
        const status = ProceduresConfig.STATUS[proc.status] || {};

        return `
            <div class="pm-view-content">
                <div class="pm-view-header">
                    <span class="pm-type-badge" style="background: ${type.color}20; color: ${type.color};">${type.label}</span>
                    <span class="pm-status-badge" style="background: ${status.color}20; color: ${status.color};">${status.label}</span>
                    <span class="pm-version">v${proc.version_label}</span>
                </div>

                ${proc.objective ? `<div class="pm-view-section"><h4>Objetivo</h4><p>${proc.objective}</p></div>` : ''}
                ${proc.scope ? `<div class="pm-view-section"><h4>Alcance</h4><p>${proc.scope}</p></div>` : ''}
                ${proc.definitions ? `<div class="pm-view-section"><h4>Definiciones</h4><p>${proc.definitions}</p></div>` : ''}
                ${proc.responsibilities ? `<div class="pm-view-section"><h4>Responsabilidades</h4><p>${proc.responsibilities}</p></div>` : ''}
                ${proc.procedure_content ? `<div class="pm-view-section"><h4>Descripción del Procedimiento</h4><p>${proc.procedure_content}</p></div>` : ''}
                ${proc.references ? `<div class="pm-view-section"><h4>Referencias</h4><p>${proc.references}</p></div>` : ''}
            </div>
        `;
    },

    renderForm(proc = {}) {
        // Obtener información del usuario logueado
        const currentUser = this.getCurrentUser();
        const now = new Date();
        const isNew = !proc.id;
        const version = proc.version_label || '1.0';

        // Propietarios/Creadores existentes o nuevo
        const owners = proc.owners || [];
        if (isNew && currentUser) {
            owners.push({
                user_id: currentUser.id,
                name: currentUser.name || currentUser.username,
                department: currentUser.department || 'Sin asignar',
                sector: currentUser.sector || '',
                action: 'Creación',
                date: now.toISOString()
            });
        }

        return `
            <form id="procedureForm" onsubmit="ProceduresEngine.saveProcedure(event)">
                <!-- Información del Documento -->
                <div class="pm-doc-info">
                    <div class="pm-doc-info-grid">
                        <div class="pm-doc-info-item">
                            <div class="pm-doc-info-label">Versión</div>
                            <div class="pm-doc-info-value version">Ver. ${version}</div>
                        </div>
                        <div class="pm-doc-info-item">
                            <div class="pm-doc-info-label">Creación</div>
                            <div class="pm-doc-info-value">${proc.created_at ? new Date(proc.created_at).toLocaleString('es-AR') : now.toLocaleString('es-AR')}</div>
                        </div>
                        <div class="pm-doc-info-item">
                            <div class="pm-doc-info-label">Última Modificación</div>
                            <div class="pm-doc-info-value">${proc.updated_at ? new Date(proc.updated_at).toLocaleString('es-AR') : '-'}</div>
                        </div>
                    </div>
                </div>

                <div class="pm-form-grid">
                    <div class="pm-form-group">
                        <label>Código</label>
                        <input type="text" name="code" value="${proc.code || ''}" placeholder="PRO-PROD-001" class="pm-input">
                    </div>
                    <div class="pm-form-group">
                        <label>Tipo de Documento *</label>
                        <select name="type" class="pm-select" required onchange="ProceduresEngine.onDocumentTypeChange(this.value)">
                            ${Object.entries(ProceduresConfig.HIERARCHY).map(([key, val]) => `
                                <option value="${key}" ${(proc.type || 'instructivo') === key ? 'selected' : ''}>${val.icon} ${val.name}</option>
                            `).join('')}
                        </select>
                        <small class="pm-scope-hint" id="typeHint">${ProceduresConfig.HIERARCHY[proc.type || 'instructivo']?.description || ''}</small>
                    </div>
                </div>

                <!-- JERARQUÍA DOCUMENTAL - Selector de Padre Obligatorio -->
                <div id="parentSelectorContainer" class="pm-hierarchy-section" style="display: ${(proc.type && proc.type !== 'politica') || !proc.type ? 'block' : 'none'};">
                    <div class="pm-hierarchy-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3V3z"/><path d="M9 3v18"/><path d="M9 9h12"/></svg>
                        Documento Padre <span class="pm-required">*</span>
                    </div>
                    <p class="pm-hierarchy-desc" id="parentHelpText">
                        ${this.getParentHelpText(proc.type || 'instructivo')}
                    </p>

                    <div class="pm-form-group">
                        <label id="parentLabel">Seleccionar ${ProceduresConfig.HIERARCHY[ProceduresConfig.HIERARCHY[proc.type || 'instructivo']?.parent]?.name || 'Padre'}</label>
                        <select name="parent_id" id="parentSelect" class="pm-select" ${(proc.type || 'instructivo') !== 'politica' ? 'required' : ''}>
                            <option value="">-- Cargando documentos padre... --</option>
                        </select>
                        <small class="pm-hierarchy-hint" id="parentHint"></small>
                    </div>

                    <!-- Breadcrumb de jerarquía -->
                    <div id="hierarchyBreadcrumb" class="pm-hierarchy-breadcrumb" style="display: none;">
                        <span class="pm-breadcrumb-label">Ubicación en jerarquía:</span>
                        <div id="breadcrumbPath" class="pm-breadcrumb-path"></div>
                    </div>
                </div>

                <div class="pm-form-group">
                    <label>Título *</label>
                    <input type="text" name="title" value="${proc.title || ''}" required class="pm-input" placeholder="Ej: Procedimiento de Control de Calidad">
                </div>

                <div class="pm-form-group">
                    <label>Objetivo</label>
                    <textarea name="objective" rows="2" class="pm-textarea" placeholder="Describe el propósito de este procedimiento...">${proc.objective || ''}</textarea>
                </div>

                <div class="pm-form-group">
                    <label>Alcance</label>
                    <textarea name="scope" rows="2" class="pm-textarea" placeholder="A qué áreas, procesos o actividades aplica...">${proc.scope || ''}</textarea>
                </div>

                <div class="pm-form-group">
                    <label>Definiciones y Terminología</label>
                    <textarea name="definitions" rows="3" class="pm-textarea" placeholder="Define términos técnicos o específicos del sector utilizados en este documento...">${proc.definitions || ''}</textarea>
                </div>

                <div class="pm-form-group">
                    <label>Responsabilidades</label>
                    <textarea name="responsibilities" rows="2" class="pm-textarea" placeholder="Quiénes son responsables y de qué...">${proc.responsibilities || ''}</textarea>
                </div>

                <div class="pm-form-group">
                    <label>Descripción del Procedimiento</label>
                    <textarea name="procedure_content" rows="6" class="pm-textarea" placeholder="Detalla paso a paso el procedimiento o instructivo...">${proc.procedure_content || ''}</textarea>
                </div>

                <div class="pm-form-grid">
                    <div class="pm-form-group">
                        <label>Fecha de Vigencia</label>
                        <input type="date" name="effective_date" value="${proc.effective_date || ''}" class="pm-input">
                    </div>
                    <div class="pm-form-group">
                        <label>Fecha de Caducidad (opcional)</label>
                        <input type="date" name="expiry_date" value="${proc.expiry_date || ''}" class="pm-input">
                    </div>
                </div>

                <!-- Alcance Parametrizable -->
                <div class="pm-scope-section">
                    <div class="pm-scope-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                        Alcance del Documento
                    </div>
                    <p class="pm-scope-desc">Define quiénes deben conocer y cumplir este procedimiento. El sistema notificará automáticamente a los usuarios según el alcance definido.</p>

                    <div class="pm-form-group">
                        <label>Tipo de Alcance</label>
                        <select name="scope_type" class="pm-select" onchange="ProceduresEngine.onScopeTypeChange(this.value)">
                            ${Object.entries(ProceduresConfig.SCOPE_TYPES).map(([key, val]) => `
                                <option value="${key}" ${(proc.scope_type || 'company') === key ? 'selected' : ''}>${val.icon} ${val.label}</option>
                            `).join('')}
                        </select>
                        <small class="pm-scope-hint" id="scopeHint">${ProceduresConfig.SCOPE_TYPES[proc.scope_type || 'company']?.description || ''}</small>
                    </div>

                    <!-- Contenedor dinámico para entidades -->
                    <div id="scopeEntitiesContainer" class="pm-scope-entities" style="display: ${(proc.scope_type && proc.scope_type !== 'company') ? 'block' : 'none'};">
                        <label>Seleccionar Entidades</label>
                        <div id="scopeEntitiesList" class="pm-scope-entities-list">
                            ${this.renderScopeEntities(proc.scope_type, proc.scope_entities)}
                        </div>
                    </div>

                    <!-- Preview de usuarios alcanzados -->
                    <div class="pm-scope-preview" id="scopePreview">
                        <div class="pm-scope-preview-icon">👥</div>
                        <div class="pm-scope-preview-text">
                            <span class="pm-scope-preview-count" id="scopeUserCount">-</span>
                            <span class="pm-scope-preview-label">usuarios serán notificados</span>
                        </div>
                        <button type="button" class="pm-btn-sm" onclick="ProceduresEngine.updateScopePreview()">Actualizar</button>
                    </div>
                </div>

                <div class="pm-form-check">
                    <label>
                        <input type="checkbox" name="is_critical" ${proc.is_critical ? 'checked' : ''}>
                        Procedimiento Crítico
                    </label>
                </div>

                <!-- Propietarios/Creadores -->
                <div class="pm-owners-section">
                    <div class="pm-owners-title">Propietarios / Creadores</div>
                    ${this.renderOwners(owners, isNew, currentUser)}
                </div>

                <div class="pm-form-actions">
                    <button type="button" class="pm-btn pm-btn-secondary" onclick="ProceduresEngine.closeModal()">Cancelar</button>
                    <button type="submit" class="pm-btn pm-btn-primary">Guardar</button>
                </div>
            </form>
        `;
    },

    getCurrentUser() {
        // Obtener usuario logueado del localStorage o contexto global
        try {
            const userData = localStorage.getItem('userData');
            if (userData) {
                return JSON.parse(userData);
            }
            // Fallback: obtener de variables globales
            if (window.currentUser) return window.currentUser;
            if (window.selectedEmployee) return window.selectedEmployee;

            // Fallback mínimo
            return {
                id: 'current',
                name: 'Usuario Actual',
                department: window.selectedCompany?.name || 'Empresa',
                sector: ''
            };
        } catch (e) {
            return { id: 'current', name: 'Usuario', department: '', sector: '' };
        }
    },

    renderOwners(owners = [], isNew = false, currentUser = null) {
        if (!owners.length && isNew && currentUser) {
            return `
                <div class="pm-owner-item">
                    <div class="pm-owner-avatar">${(currentUser.name || 'U').charAt(0).toUpperCase()}</div>
                    <div class="pm-owner-info">
                        <div class="pm-owner-name">${currentUser.name || 'Usuario Actual'}</div>
                        <div class="pm-owner-dept">${currentUser.department || ''} ${currentUser.sector ? '• ' + currentUser.sector : ''}</div>
                    </div>
                    <div class="pm-owner-date">Creación • Ahora</div>
                </div>
            `;
        }

        return owners.map((owner, idx) => `
            <div class="pm-owner-item">
                <div class="pm-owner-avatar">${(owner.name || 'U').charAt(0).toUpperCase()}</div>
                <div class="pm-owner-info">
                    <div class="pm-owner-name">${owner.name}</div>
                    <div class="pm-owner-dept">${owner.department || ''} ${owner.sector ? '• ' + owner.sector : ''}</div>
                </div>
                <div class="pm-owner-date">${owner.action || 'Edición'} • ${new Date(owner.date).toLocaleString('es-AR')}</div>
            </div>
        `).join('');
    },

    // ========== SCOPE MANAGEMENT ==========
    scopeEntitiesCache: {},
    selectedScopeEntities: [],

    renderScopeEntities(scopeType, scopeEntities = []) {
        if (!scopeType || scopeType === 'company') {
            return '<p class="pm-scope-company-note">Se notificará a todos los empleados de la empresa.</p>';
        }

        this.selectedScopeEntities = scopeEntities || [];

        // Renderizar placeholder mientras cargamos
        return `<div class="pm-scope-loading">Cargando opciones...</div>`;
    },

    async onScopeTypeChange(scopeType) {
        const container = document.getElementById('scopeEntitiesContainer');
        const list = document.getElementById('scopeEntitiesList');
        const hint = document.getElementById('scopeHint');

        // Actualizar hint
        if (hint && ProceduresConfig.SCOPE_TYPES[scopeType]) {
            hint.textContent = ProceduresConfig.SCOPE_TYPES[scopeType].description;
        }

        // Si es empresa completa, ocultar selector
        if (scopeType === 'company') {
            container.style.display = 'none';
            this.selectedScopeEntities = [];
            this.updateScopePreview();
            return;
        }

        // Mostrar contenedor
        container.style.display = 'block';
        list.innerHTML = '<div class="pm-scope-loading"><div class="pm-spinner-sm"></div> Cargando opciones...</div>';

        try {
            // Obtener entidades del backend
            const result = await ProceduresAPI.getScopeEntities(scopeType);

            if (result.success && result.entities) {
                this.scopeEntitiesCache[scopeType] = result.entities;
                this.renderEntityCheckboxes(result.entities, scopeType);
            } else {
                list.innerHTML = '<p class="pm-scope-error">No se encontraron opciones disponibles</p>';
            }
        } catch (error) {
            console.error('Error loading scope entities:', error);
            list.innerHTML = '<p class="pm-scope-error">Error al cargar opciones</p>';
        }
    },

    renderEntityCheckboxes(entities, scopeType) {
        const list = document.getElementById('scopeEntitiesList');

        if (!entities || entities.length === 0) {
            list.innerHTML = '<p class="pm-scope-empty">No hay opciones disponibles para este tipo de alcance</p>';
            return;
        }

        const html = `
            <div class="pm-scope-select-all">
                <label>
                    <input type="checkbox" onchange="ProceduresEngine.toggleAllEntities(this.checked)">
                    Seleccionar todos (${entities.length})
                </label>
            </div>
            <div class="pm-scope-checkboxes">
                ${entities.map(entity => {
                    const isSelected = this.selectedScopeEntities.some(e => e.id == entity.id);
                    return `
                        <label class="pm-scope-checkbox ${isSelected ? 'selected' : ''}">
                            <input type="checkbox" value="${entity.id}" data-name="${entity.name || entity.label}"
                                ${isSelected ? 'checked' : ''}
                                onchange="ProceduresEngine.toggleEntity(this)">
                            <span>${entity.name || entity.label}</span>
                            ${entity.count !== undefined ? `<small>(${entity.count} usuarios)</small>` : ''}
                        </label>
                    `;
                }).join('')}
            </div>
        `;

        list.innerHTML = html;
    },

    toggleAllEntities(checked) {
        const checkboxes = document.querySelectorAll('.pm-scope-checkboxes input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = checked;
            cb.closest('label').classList.toggle('selected', checked);
        });

        if (checked) {
            const scopeType = document.querySelector('select[name="scope_type"]').value;
            const entities = this.scopeEntitiesCache[scopeType] || [];
            this.selectedScopeEntities = entities.map(e => ({ id: e.id, name: e.name || e.label }));
        } else {
            this.selectedScopeEntities = [];
        }

        this.updateScopePreview();
    },

    toggleEntity(checkbox) {
        const id = checkbox.value;
        const name = checkbox.dataset.name;
        const label = checkbox.closest('label');

        if (checkbox.checked) {
            label.classList.add('selected');
            if (!this.selectedScopeEntities.some(e => e.id == id)) {
                this.selectedScopeEntities.push({ id, name });
            }
        } else {
            label.classList.remove('selected');
            this.selectedScopeEntities = this.selectedScopeEntities.filter(e => e.id != id);
        }

        this.updateScopePreview();
    },

    async updateScopePreview() {
        const countEl = document.getElementById('scopeUserCount');
        if (!countEl) return;

        const scopeType = document.querySelector('select[name="scope_type"]')?.value || 'company';

        countEl.textContent = '...';

        try {
            const result = await ProceduresAPI.previewScopeUsers(scopeType, this.selectedScopeEntities);

            if (result.success) {
                countEl.textContent = result.user_count || 0;
            } else {
                countEl.textContent = '?';
            }
        } catch (error) {
            console.error('Error previewing scope users:', error);
            countEl.textContent = '?';
        }
    },

    async saveProcedure(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        // Obtener usuario actual para agregar como propietario
        const currentUser = this.getCurrentUser();
        const documentType = formData.get('type');
        const parentId = formData.get('parent_id') || null;

        // ========== VALIDACIÓN DE JERARQUÍA ==========
        const hierarchyValidation = await this.validateHierarchyBeforeSave(documentType, parentId);
        if (!hierarchyValidation.valid) {
            this.showToast(hierarchyValidation.error, 'error');
            // Resaltar el campo de padre
            const parentSelect = document.getElementById('parentSelect');
            if (parentSelect) {
                parentSelect.style.borderColor = '#ff5252';
                parentSelect.focus();
                setTimeout(() => {
                    parentSelect.style.borderColor = '';
                }, 3000);
            }
            return;
        }

        const data = {
            code: formData.get('code'),
            title: formData.get('title'),
            type: documentType,
            // JERARQUÍA DOCUMENTAL - parent_id obligatorio para non-políticas
            parent_id: parentId,
            objective: formData.get('objective'),
            scope: formData.get('scope'),
            definitions: formData.get('definitions'),
            responsibilities: formData.get('responsibilities'),
            procedure_content: formData.get('procedure_content'),
            effective_date: formData.get('effective_date') || null,
            expiry_date: formData.get('expiry_date') || null,
            is_critical: formData.get('is_critical') === 'on',
            // Scope parametrizable
            scope_type: formData.get('scope_type') || 'company',
            scope_entities: this.selectedScopeEntities || []
        };

        // Agregar propietario actual a la lista
        if (currentUser) {
            data.current_editor = {
                user_id: currentUser.id,
                name: currentUser.name || currentUser.username,
                department: currentUser.department || '',
                sector: currentUser.sector || ''
            };
        }

        try {
            let result;
            if (this.currentProcedure) {
                result = await ProceduresAPI.update(this.currentProcedure.id, data);
            } else {
                result = await ProceduresAPI.create(data);
            }

            if (result.success) {
                this.showToast('Procedimiento guardado correctamente', 'success');
                this.closeModal();
                this.refresh();
            } else {
                this.showToast(result.message || 'Error al guardar', 'error');
            }
        } catch (error) {
            this.showToast('Error al guardar procedimiento', 'error');
        }
    },

    async submitForReview(id) {
        if (!confirm('¿Enviar este procedimiento a revisión?')) return;
        try {
            const result = await ProceduresAPI.submitForReview(id);
            if (result.success) {
                this.showToast('Enviado a revisión', 'success');
                this.refresh();
            }
        } catch (error) {
            this.showToast('Error', 'error');
        }
    },

    async approveProcedure(id) {
        if (!confirm('¿Aprobar este procedimiento?')) return;
        try {
            const result = await ProceduresAPI.approve(id);
            if (result.success) {
                this.showToast('Procedimiento aprobado', 'success');
                this.refresh();
            }
        } catch (error) {
            this.showToast('Error', 'error');
        }
    },

    async publishProcedure(id) {
        if (!confirm('¿Publicar este procedimiento? Se enviará a todos los usuarios afectados.')) return;
        try {
            const result = await ProceduresAPI.publish(id);
            if (result.success) {
                this.showToast('Procedimiento publicado', 'success');
                this.refresh();
            }
        } catch (error) {
            this.showToast('Error', 'error');
        }
    },

    closeModal() {
        const modal = document.getElementById('procedureModal');
        if (modal) {
            modal.classList.remove('active');
            // CSS .pm-modal-overlay sin .active tiene display: none !important
        }
        this.currentProcedure = null;
    },

    showToast(message, type = 'info') {
        const colors = {
            success: '#00e676',
            error: '#ff5252',
            warning: '#ffc107',
            info: '#00d4ff'
        };

        const toast = document.createElement('div');
        toast.className = 'pm-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: ${colors[type]};
            color: #000;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 500;
            z-index: 10001;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    },

    // ========== HIERARCHY MANAGEMENT (Jerarquía Documental Estricta) ==========

    /**
     * Obtiene texto de ayuda según el tipo de documento
     */
    getParentHelpText(documentType) {
        const hierarchy = ProceduresConfig.HIERARCHY;
        const docInfo = hierarchy[documentType];

        if (!docInfo) {
            return 'Selecciona el tipo de documento para ver las opciones de jerarquía.';
        }

        if (documentType === 'politica') {
            return '📜 Las Políticas son documentos raíz. No requieren un documento padre y definen el "qué" y "por qué" a nivel estratégico.';
        }

        const parentType = docInfo.parent;
        const parentInfo = hierarchy[parentType];

        if (!parentInfo) {
            return `El documento tipo "${docInfo.name}" requiere un documento padre.`;
        }

        const icons = {
            politica: '📜',
            manual: '📕',
            procedimiento: '📋',
            instructivo: '📝'
        };

        return `${icons[documentType]} Los ${docInfo.name}s deben pertenecer a un ${parentInfo.name}. Selecciona el ${parentInfo.name} padre de la lista.`;
    },

    /**
     * Manejador del cambio de tipo de documento
     */
    async onDocumentTypeChange(newType) {
        const parentContainer = document.getElementById('parentSelectorContainer');
        const parentSelect = document.getElementById('parentSelect');
        const parentHelpText = document.getElementById('parentHelpText');
        const parentLabel = document.getElementById('parentLabel');
        const typeHint = document.getElementById('typeHint');
        const breadcrumb = document.getElementById('hierarchyBreadcrumb');

        // Actualizar hint del tipo
        if (typeHint && ProceduresConfig.HIERARCHY[newType]) {
            typeHint.textContent = ProceduresConfig.HIERARCHY[newType].description;
        }

        // Si es política, ocultar selector de padre
        if (newType === 'politica') {
            if (parentContainer) parentContainer.style.display = 'none';
            if (parentSelect) {
                parentSelect.required = false;
                parentSelect.innerHTML = '<option value="">-- No aplica --</option>';
            }
            if (breadcrumb) breadcrumb.style.display = 'none';
            return;
        }

        // Mostrar contenedor de padre
        if (parentContainer) parentContainer.style.display = 'block';
        if (parentSelect) parentSelect.required = true;

        // Actualizar texto de ayuda
        if (parentHelpText) {
            parentHelpText.textContent = this.getParentHelpText(newType);
        }

        // Actualizar label del selector
        const parentType = ProceduresConfig.HIERARCHY[newType]?.parent;
        const parentInfo = ProceduresConfig.HIERARCHY[parentType];
        if (parentLabel && parentInfo) {
            parentLabel.textContent = `Seleccionar ${parentInfo.name} *`;
        }

        // Cargar padres disponibles
        await this.loadAvailableParents(newType);
    },

    /**
     * Carga los padres disponibles para el tipo de documento seleccionado
     */
    async loadAvailableParents(documentType, excludeId = null) {
        const parentSelect = document.getElementById('parentSelect');
        if (!parentSelect) return;

        const parentType = ProceduresConfig.HIERARCHY[documentType]?.parent;
        const parentInfo = ProceduresConfig.HIERARCHY[parentType];

        if (!parentInfo) {
            parentSelect.innerHTML = '<option value="">-- No hay padres disponibles --</option>';
            return;
        }

        // Mostrar loading
        parentSelect.innerHTML = `<option value="">Cargando ${parentInfo.name}s...</option>`;
        parentSelect.disabled = true;

        try {
            const result = await ProceduresAPI.getAvailableParents(documentType, excludeId);

            if (result.success && result.parents && result.parents.length > 0) {
                const options = result.parents.map(parent => {
                    const icon = ProceduresConfig.HIERARCHY[parent.type]?.icon || '📄';
                    return `<option value="${parent.id}" data-code="${parent.code}" data-title="${parent.title}" data-type="${parent.type}">
                        ${icon} ${parent.code} - ${parent.title}
                    </option>`;
                }).join('');

                parentSelect.innerHTML = `
                    <option value="">-- Seleccionar ${parentInfo.name} --</option>
                    ${options}
                `;

                // Si hay un padre pre-seleccionado (edit mode)
                if (this.currentProcedure?.parent_id) {
                    parentSelect.value = this.currentProcedure.parent_id;
                    this.updateHierarchyBreadcrumb(this.currentProcedure.parent_id);
                }
            } else {
                parentSelect.innerHTML = `
                    <option value="">⚠️ No hay ${parentInfo.name}s disponibles</option>
                `;
                // Mostrar mensaje de advertencia
                const hint = document.getElementById('parentHint');
                if (hint) {
                    hint.innerHTML = `<span style="color: #ffc107;">⚠️ Primero debes crear un ${parentInfo.name} para poder agregar este ${ProceduresConfig.HIERARCHY[documentType]?.name}.</span>`;
                }
            }
        } catch (error) {
            console.error('[PROCEDURES] Error loading parents:', error);
            parentSelect.innerHTML = `<option value="">❌ Error al cargar padres</option>`;
        } finally {
            parentSelect.disabled = false;

            // Agregar evento change para actualizar breadcrumb
            parentSelect.onchange = (e) => {
                this.updateHierarchyBreadcrumb(e.target.value);
            };
        }
    },

    /**
     * Actualiza el breadcrumb de jerarquía
     */
    async updateHierarchyBreadcrumb(parentId) {
        const breadcrumb = document.getElementById('hierarchyBreadcrumb');
        const breadcrumbPath = document.getElementById('breadcrumbPath');

        if (!breadcrumb || !breadcrumbPath) return;

        if (!parentId) {
            breadcrumb.style.display = 'none';
            return;
        }

        breadcrumb.style.display = 'block';
        breadcrumbPath.innerHTML = '<span class="pm-breadcrumb-loading">Cargando jerarquía...</span>';

        try {
            // Obtener ancestros del padre seleccionado
            const result = await ProceduresAPI.getAncestors(parentId);

            if (result.success && result.ancestors) {
                const ancestors = result.ancestors;

                // Construir breadcrumb: Política > Manual > Procedimiento > [Nuevo]
                const pathHtml = ancestors.map(ancestor => {
                    const info = ProceduresConfig.HIERARCHY[ancestor.type] || {};
                    return `
                        <span class="pm-breadcrumb-item" style="color: ${info.color || '#00d4ff'}">
                            ${info.icon || '📄'} ${ancestor.code}
                            <span class="pm-breadcrumb-title">${ancestor.title}</span>
                        </span>
                    `;
                }).join('<span class="pm-breadcrumb-separator">›</span>');

                // Agregar el nuevo documento al final
                const currentType = document.querySelector('select[name="type"]')?.value || 'instructivo';
                const currentInfo = ProceduresConfig.HIERARCHY[currentType] || {};
                const newDocHtml = `
                    <span class="pm-breadcrumb-separator">›</span>
                    <span class="pm-breadcrumb-item pm-breadcrumb-new" style="color: ${currentInfo.color || '#00d4ff'}">
                        ${currentInfo.icon || '📄'} <em>Nuevo ${currentInfo.name}</em>
                    </span>
                `;

                breadcrumbPath.innerHTML = pathHtml + newDocHtml;
            } else {
                breadcrumbPath.innerHTML = '<span class="pm-breadcrumb-error">No se pudo cargar la jerarquía</span>';
            }
        } catch (error) {
            console.error('[PROCEDURES] Error loading breadcrumb:', error);
            breadcrumbPath.innerHTML = '<span class="pm-breadcrumb-error">Error al cargar</span>';
        }
    },

    /**
     * Valida la jerarquía antes de guardar
     */
    async validateHierarchyBeforeSave(documentType, parentId) {
        // Las políticas no necesitan padre
        if (documentType === 'politica') {
            return { valid: true };
        }

        // Otros documentos DEBEN tener padre
        if (!parentId) {
            const docInfo = ProceduresConfig.HIERARCHY[documentType];
            const parentType = docInfo?.parent;
            const parentInfo = ProceduresConfig.HIERARCHY[parentType];
            return {
                valid: false,
                error: `Los ${docInfo?.name || 'documentos'} deben pertenecer a un ${parentInfo?.name || 'documento padre'}. Selecciona un documento padre.`
            };
        }

        // Validar con el backend
        try {
            const result = await ProceduresAPI.validateHierarchy(documentType, parentId);
            return {
                valid: result.success && result.valid,
                error: result.error || result.message
            };
        } catch (error) {
            return {
                valid: false,
                error: 'Error al validar jerarquía: ' + error.message
            };
        }
    }
};

// ============================================================================
// INJECT STYLES
// ============================================================================
function injectProceduresStyles() {
    if (document.getElementById('pm-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'pm-styles';
    styles.textContent = `
        /* CSS Variables - Dark Enterprise Theme */
        :root {
            --pm-bg-primary: #0f0f1a;
            --pm-bg-secondary: #1a1a2e;
            --pm-bg-tertiary: #252542;
            --pm-bg-card: #1e1e35;
            --pm-border: #2d2d4a;
            --pm-text-primary: #e8e8f0;
            --pm-text-secondary: #a0a0b8;
            --pm-text-muted: #6b6b80;
            --pm-accent-blue: #00d4ff;
            --pm-accent-green: #00e676;
            --pm-accent-yellow: #ffc107;
            --pm-accent-red: #ff5252;
            --pm-accent-purple: #b388ff;
        }

        .procedures-enterprise {
            background: var(--pm-bg-primary);
            min-height: 100vh;
            color: var(--pm-text-primary);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* Header */
        .pm-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 24px;
            background: var(--pm-bg-secondary);
            border-bottom: 1px solid var(--pm-border);
        }

        .pm-header-left { display: flex; align-items: center; gap: 12px; }

        .pm-logo {
            width: 40px; height: 40px;
            background: linear-gradient(135deg, var(--pm-accent-blue), var(--pm-accent-green));
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            color: white;
        }

        .pm-title {
            font-size: 18px; font-weight: 700;
            letter-spacing: 1px; margin: 0;
            background: linear-gradient(90deg, var(--pm-accent-blue), var(--pm-accent-green));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .pm-subtitle {
            font-size: 11px;
            color: var(--pm-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .pm-tech-badges { display: flex; gap: 8px; }

        .pm-badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 4px 10px; border-radius: 12px;
            font-size: 11px; font-weight: 500;
        }

        .pm-badge-iso { background: rgba(0, 230, 118, 0.15); color: var(--pm-accent-green); border: 1px solid rgba(0, 230, 118, 0.3); }
        .pm-badge-db { background: rgba(0, 212, 255, 0.15); color: var(--pm-accent-blue); border: 1px solid rgba(0, 212, 255, 0.3); }
        .pm-badge-ver { background: rgba(179, 136, 255, 0.15); color: var(--pm-accent-purple); border: 1px solid rgba(179, 136, 255, 0.3); }
        .pm-badge-count { background: var(--pm-bg-tertiary); color: var(--pm-text-primary); padding: 4px 12px; }
        .pm-badge-danger { background: rgba(255, 82, 82, 0.2); color: var(--pm-accent-red); font-size: 10px; margin-left: 8px; }

        .pm-header-right { display: flex; align-items: center; gap: 12px; }

        /* Navigation */
        .pm-nav {
            display: flex; gap: 4px;
            padding: 8px 24px;
            background: var(--pm-bg-secondary);
            border-bottom: 1px solid var(--pm-border);
            overflow-x: auto;
        }

        .pm-nav-item {
            display: flex; align-items: center; gap: 8px;
            padding: 10px 16px;
            background: transparent; border: none;
            color: var(--pm-text-secondary);
            font-size: 13px; font-weight: 500;
            cursor: pointer; border-radius: 6px;
            transition: all 0.2s; white-space: nowrap;
        }

        .pm-nav-item:hover { background: var(--pm-bg-tertiary); color: var(--pm-text-primary); }

        .pm-nav-item.active {
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(0, 230, 118, 0.2));
            color: var(--pm-accent-blue);
            border: 1px solid rgba(0, 212, 255, 0.3);
        }

        /* Main */
        .pm-main { padding: 24px; max-width: 1400px; margin: 0 auto; }

        .pm-loading {
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            padding: 60px; color: var(--pm-text-muted);
        }

        .pm-spinner {
            width: 40px; height: 40px;
            border: 3px solid var(--pm-border);
            border-top-color: var(--pm-accent-blue);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 12px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        /* KPI Cards */
        .pm-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px; margin-bottom: 24px;
        }

        .pm-kpi-card {
            background: var(--pm-bg-card);
            border: 1px solid var(--pm-border);
            border-radius: 12px; padding: 20px;
            display: flex; align-items: center; gap: 16px;
        }

        .pm-kpi-icon {
            width: 48px; height: 48px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            color: white;
        }

        .pm-kpi-value { font-size: 28px; font-weight: 700; display: block; }
        .pm-kpi-label { font-size: 12px; color: var(--pm-text-muted); text-transform: uppercase; }

        /* Sections */
        .pm-section { margin-bottom: 24px; }
        .pm-section-title { font-size: 14px; font-weight: 600; color: var(--pm-text-secondary); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }

        .pm-quick-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }

        .pm-action-card {
            background: var(--pm-bg-card); border: 1px solid var(--pm-border);
            border-radius: 12px; padding: 20px;
            display: flex; flex-direction: column; align-items: center; gap: 12px;
            cursor: pointer; transition: all 0.2s; color: var(--pm-text-primary);
        }

        .pm-action-card:hover { border-color: var(--pm-accent-blue); transform: translateY(-2px); }

        .pm-action-icon {
            width: 48px; height: 48px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
        }

        /* Empty State */
        .pm-empty, .pm-error {
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            padding: 60px; text-align: center;
        }

        .pm-empty h3, .pm-error h3 { margin: 16px 0 8px; color: var(--pm-text-primary); }
        .pm-empty p, .pm-error p { color: var(--pm-text-muted); margin-bottom: 24px; }

        /* Table */
        .pm-list-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .pm-list-header h3 { margin: 0; font-size: 16px; }

        .pm-table-container {
            background: var(--pm-bg-card);
            border: 1px solid var(--pm-border);
            border-radius: 12px; overflow: hidden;
        }

        .pm-table { width: 100%; border-collapse: collapse; }
        .pm-table th, .pm-table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid var(--pm-border); }
        .pm-table th { background: var(--pm-bg-tertiary); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--pm-text-muted); font-weight: 600; }
        .pm-table tr:last-child td { border-bottom: none; }
        .pm-table tr:hover td { background: rgba(0, 212, 255, 0.05); }

        .pm-code { background: var(--pm-bg-tertiary); padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 12px; }
        .pm-proc-title { display: flex; align-items: center; }
        .pm-type-badge, .pm-status-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; }
        .pm-version { font-family: monospace; font-size: 12px; color: var(--pm-text-muted); }
        .pm-date { font-size: 12px; color: var(--pm-text-muted); }

        .pm-actions { display: flex; gap: 8px; }

        /* Buttons */
        .pm-btn {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 10px 16px; border-radius: 8px;
            font-size: 13px; font-weight: 500;
            cursor: pointer; border: none; transition: all 0.2s;
        }

        .pm-btn-primary { background: linear-gradient(135deg, var(--pm-accent-blue), var(--pm-accent-green)); color: #000; }
        .pm-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3); }
        .pm-btn-secondary { background: var(--pm-bg-tertiary); color: var(--pm-text-primary); border: 1px solid var(--pm-border); }

        .pm-btn-icon {
            width: 36px; height: 36px; padding: 0;
            background: var(--pm-bg-tertiary); border: 1px solid var(--pm-border);
            border-radius: 8px; color: var(--pm-text-secondary);
            display: flex; align-items: center; justify-content: center; cursor: pointer;
        }

        .pm-btn-icon:hover { border-color: var(--pm-accent-blue); color: var(--pm-accent-blue); }

        .pm-btn-icon-sm {
            width: 32px; height: 32px; padding: 0;
            background: transparent; border: 1px solid var(--pm-border);
            border-radius: 6px; color: var(--pm-text-secondary);
            display: flex; align-items: center; justify-content: center; cursor: pointer;
        }

        .pm-btn-icon-sm:hover { border-color: var(--pm-accent-blue); color: var(--pm-accent-blue); }
        .pm-btn-icon-sm.pm-btn-warning:hover { border-color: var(--pm-accent-yellow); color: var(--pm-accent-yellow); }
        .pm-btn-icon-sm.pm-btn-success:hover { border-color: var(--pm-accent-green); color: var(--pm-accent-green); }
        .pm-btn-icon-sm.pm-btn-primary:hover { border-color: var(--pm-accent-blue); color: var(--pm-accent-blue); }

        /* Modal - FUERA de #mainContent para evitar CSS !important de .authenticated */
        .pm-modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: none !important;
            align-items: center; justify-content: center;
            z-index: 10000;
            /* Variables CSS para el modal (ya que está fuera del container principal) */
            --pm-bg-primary: #0f0f1a;
            --pm-bg-secondary: #1a1a2e;
            --pm-bg-tertiary: #252542;
            --pm-bg-card: #1e1e35;
            --pm-border: #2d2d4a;
            --pm-text-primary: #e8e8f0;
            --pm-text-secondary: #a0a0b8;
            --pm-text-muted: #6b6b80;
            --pm-accent-blue: #00d4ff;
            --pm-accent-green: #00e676;
        }
        .pm-modal-overlay.active {
            display: flex !important;
        }

        .pm-modal {
            background: #1a1a2e;
            border: 1px solid #2d2d4a;
            border-radius: 16px; width: 90%; max-width: 800px;
            max-height: 90vh; min-height: 300px;
            display: flex; flex-direction: column;
            color: #e8e8f0;
        }

        .pm-modal-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 20px 24px;
            background: #252542;
            border-bottom: 1px solid #2d2d4a;
            border-radius: 16px 16px 0 0;
        }

        .pm-modal-header h3 { margin: 0; font-size: 18px; color: #e8e8f0; font-weight: 600; }

        .pm-modal-close {
            width: 32px; height: 32px;
            background: transparent; border: none;
            color: #a0a0b8; font-size: 24px;
            cursor: pointer; border-radius: 6px;
        }

        .pm-modal-close:hover { background: #1e1e35; color: #e8e8f0; }

        .pm-modal-body {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
            min-height: 200px;
            background: #1a1a2e;
            color: #e8e8f0;
        }

        #procedureForm {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: #e8e8f0;
        }

        /* Form */
        .pm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .pm-form-group { margin-bottom: 16px; }
        .pm-form-group label { display: block; font-size: 12px; color: #a0a0b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }

        .pm-input, .pm-select, .pm-textarea {
            width: 100%; padding: 12px;
            background: #252542;
            border: 1px solid #2d2d4a;
            border-radius: 8px; color: #e8e8f0;
            font-size: 14px;
        }

        .pm-input::placeholder, .pm-textarea::placeholder { color: #6b6b80; }
        .pm-input:focus, .pm-select:focus, .pm-textarea:focus { outline: none; border-color: #00d4ff; }
        .pm-textarea { resize: vertical; min-height: 80px; }
        .pm-select option { background: #252542; color: #e8e8f0; }

        .pm-form-check { margin-bottom: 24px; }
        .pm-form-check label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #a0a0b8; }
        .pm-form-check input { width: 18px; height: 18px; }

        .pm-form-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px; border-top: 1px solid #2d2d4a; }

        /* Sección de información del documento */
        .pm-doc-info {
            background: #252542;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
            border: 1px solid #2d2d4a;
        }
        .pm-doc-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .pm-doc-info-item { }
        .pm-doc-info-label { font-size: 10px; color: #6b6b80; text-transform: uppercase; margin-bottom: 4px; }
        .pm-doc-info-value { font-size: 13px; color: #e8e8f0; font-weight: 500; }
        .pm-doc-info-value.version { color: #00d4ff; }

        /* Propietarios/Creadores */
        .pm-owners-section { margin-top: 20px; padding-top: 16px; border-top: 1px solid #2d2d4a; }
        .pm-owners-title { font-size: 12px; color: #a0a0b8; text-transform: uppercase; margin-bottom: 12px; }
        .pm-owner-item {
            display: flex; align-items: center; gap: 12px;
            padding: 10px 12px; background: #1e1e35;
            border-radius: 6px; margin-bottom: 8px;
        }
        .pm-owner-avatar {
            width: 32px; height: 32px;
            background: linear-gradient(135deg, #00d4ff, #00e676);
            border-radius: 50%; display: flex;
            align-items: center; justify-content: center;
            font-size: 12px; font-weight: 600; color: white;
        }
        .pm-owner-info { flex: 1; }
        .pm-owner-name { font-size: 13px; color: #e8e8f0; font-weight: 500; }
        .pm-owner-dept { font-size: 11px; color: #6b6b80; }
        .pm-owner-date { font-size: 10px; color: #6b6b80; text-align: right; }

        /* View Content */
        .pm-view-content { color: var(--pm-text-primary); }
        .pm-view-header { display: flex; gap: 8px; margin-bottom: 24px; }
        .pm-view-section { margin-bottom: 20px; }
        .pm-view-section h4 { font-size: 13px; color: var(--pm-accent-blue); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .pm-view-section p { color: var(--pm-text-secondary); line-height: 1.6; white-space: pre-wrap; }

        /* Scope Section */
        .pm-scope-section {
            margin: 24px 0; padding: 20px;
            background: rgba(0, 212, 255, 0.05);
            border: 1px solid rgba(0, 212, 255, 0.2);
            border-radius: 12px;
        }
        .pm-scope-title {
            display: flex; align-items: center; gap: 10px;
            font-size: 14px; font-weight: 600;
            color: #00d4ff; margin-bottom: 8px;
        }
        .pm-scope-desc {
            font-size: 12px; color: #a0a0b8;
            margin-bottom: 16px; line-height: 1.5;
        }
        .pm-scope-hint {
            display: block; font-size: 11px;
            color: #6b6b80; margin-top: 6px;
            font-style: italic;
        }
        .pm-scope-entities {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #2d2d4a;
        }
        .pm-scope-entities label {
            display: block; font-size: 12px;
            color: #a0a0b8; margin-bottom: 10px;
            text-transform: uppercase;
        }
        .pm-scope-entities-list {
            max-height: 200px;
            overflow-y: auto;
            background: #1e1e35;
            border-radius: 8px;
            padding: 12px;
        }
        .pm-scope-select-all {
            padding: 8px 0;
            border-bottom: 1px solid #2d2d4a;
            margin-bottom: 10px;
        }
        .pm-scope-select-all label {
            display: flex; align-items: center; gap: 8px;
            cursor: pointer; color: #00d4ff;
            text-transform: none; font-weight: 500;
        }
        .pm-scope-checkboxes {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 8px;
        }
        .pm-scope-checkbox {
            display: flex; align-items: center; gap: 8px;
            padding: 8px 12px;
            background: #252542;
            border: 1px solid #2d2d4a;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: none;
        }
        .pm-scope-checkbox:hover {
            border-color: #00d4ff;
        }
        .pm-scope-checkbox.selected {
            background: rgba(0, 212, 255, 0.15);
            border-color: #00d4ff;
        }
        .pm-scope-checkbox span {
            font-size: 13px; color: #e8e8f0;
        }
        .pm-scope-checkbox small {
            font-size: 10px; color: #6b6b80;
            margin-left: auto;
        }
        .pm-scope-preview {
            display: flex; align-items: center; gap: 12px;
            margin-top: 16px; padding: 12px 16px;
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 230, 118, 0.1));
            border: 1px solid rgba(0, 212, 255, 0.3);
            border-radius: 8px;
        }
        .pm-scope-preview-icon {
            font-size: 24px;
        }
        .pm-scope-preview-text {
            flex: 1;
        }
        .pm-scope-preview-count {
            font-size: 24px; font-weight: 700;
            color: #00d4ff; display: block;
        }
        .pm-scope-preview-label {
            font-size: 12px; color: #a0a0b8;
        }
        .pm-btn-sm {
            padding: 6px 12px;
            font-size: 11px;
            background: #252542;
            border: 1px solid #2d2d4a;
            color: #a0a0b8;
            border-radius: 6px;
            cursor: pointer;
        }
        .pm-btn-sm:hover {
            border-color: #00d4ff;
            color: #00d4ff;
        }
        .pm-scope-loading {
            display: flex; align-items: center; gap: 8px;
            padding: 20px; color: #6b6b80;
            justify-content: center;
        }
        .pm-spinner-sm {
            width: 16px; height: 16px;
            border: 2px solid #2d2d4a;
            border-top-color: #00d4ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        .pm-scope-error, .pm-scope-empty {
            text-align: center; padding: 20px;
            color: #6b6b80; font-size: 13px;
        }
        .pm-scope-company-note {
            text-align: center; padding: 12px;
            color: #00e676; font-size: 13px;
            background: rgba(0, 230, 118, 0.1);
            border-radius: 6px;
        }

        /* ========== HIERARCHY SECTION (Jerarquía Documental) ========== */
        .pm-hierarchy-section {
            margin: 24px 0; padding: 20px;
            background: rgba(179, 136, 255, 0.05);
            border: 1px solid rgba(179, 136, 255, 0.25);
            border-radius: 12px;
        }
        .pm-hierarchy-title {
            display: flex; align-items: center; gap: 10px;
            font-size: 14px; font-weight: 600;
            color: #b388ff; margin-bottom: 8px;
        }
        .pm-hierarchy-title svg {
            color: #b388ff;
        }
        .pm-required {
            color: #ff5252;
            font-weight: bold;
        }
        .pm-hierarchy-desc {
            font-size: 12px; color: #a0a0b8;
            margin-bottom: 16px; line-height: 1.5;
        }
        .pm-hierarchy-hint {
            display: block; font-size: 11px;
            color: #6b6b80; margin-top: 6px;
        }

        /* Breadcrumb de jerarquía */
        .pm-hierarchy-breadcrumb {
            margin-top: 16px; padding: 12px 16px;
            background: rgba(179, 136, 255, 0.1);
            border-radius: 8px;
            border: 1px dashed rgba(179, 136, 255, 0.3);
        }
        .pm-breadcrumb-label {
            display: block;
            font-size: 10px;
            color: #6b6b80;
            text-transform: uppercase;
            margin-bottom: 8px;
        }
        .pm-breadcrumb-path {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 4px;
        }
        .pm-breadcrumb-item {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        .pm-breadcrumb-title {
            font-size: 11px;
            color: #a0a0b8;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .pm-breadcrumb-separator {
            color: #6b6b80;
            font-size: 16px;
            margin: 0 2px;
        }
        .pm-breadcrumb-new {
            background: rgba(179, 136, 255, 0.2);
            border: 1px dashed rgba(179, 136, 255, 0.5);
        }
        .pm-breadcrumb-new em {
            font-style: italic;
        }
        .pm-breadcrumb-loading {
            color: #6b6b80;
            font-size: 12px;
        }
        .pm-breadcrumb-error {
            color: #ff5252;
            font-size: 12px;
        }

        /* Indicadores visuales de jerarquía en la tabla */
        .pm-hierarchy-indicator {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            background: rgba(179, 136, 255, 0.1);
        }
        .pm-hierarchy-level {
            font-weight: bold;
        }

        /* ========== HIERARCHY GUIDE (Dashboard) ========== */
        .pm-hierarchy-guide {
            background: linear-gradient(135deg, rgba(179, 136, 255, 0.08), rgba(0, 212, 255, 0.05));
            border: 1px solid rgba(179, 136, 255, 0.2);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
        }
        .pm-hierarchy-guide-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        .pm-hierarchy-guide-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 15px;
            font-weight: 600;
            color: #e0e0e8;
        }
        .pm-hierarchy-guide-icon {
            font-size: 20px;
        }
        .pm-hierarchy-guide-btn {
            padding: 8px 16px;
            background: rgba(179, 136, 255, 0.15);
            border: 1px solid rgba(179, 136, 255, 0.4);
            border-radius: 8px;
            color: #b388ff;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .pm-hierarchy-guide-btn:hover {
            background: rgba(179, 136, 255, 0.25);
            transform: translateY(-2px);
        }

        /* ========== HIERARCHY FLOW (Horizontal Diagram) ========== */
        .pm-hierarchy-flow {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
            padding: 16px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
        }
        .pm-hierarchy-node {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.03);
            border: 2px solid var(--node-color, #6b6b80);
            border-radius: 10px;
            min-width: 100px;
            transition: all 0.3s ease;
            cursor: help;
        }
        .pm-hierarchy-node:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(var(--node-color), 0.3);
            background: rgba(255, 255, 255, 0.06);
        }
        .pm-hierarchy-node-icon {
            font-size: 24px;
        }
        .pm-hierarchy-node-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--node-color, #e0e0e8);
        }
        .pm-hierarchy-node-level {
            font-size: 10px;
            color: #6b6b80;
        }
        .pm-hierarchy-arrow {
            font-size: 20px;
            color: #6b6b80;
            animation: arrowPulse 1.5s ease-in-out infinite;
        }
        @keyframes arrowPulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
        }

        /* ========== HIERARCHY VIEW (Full Tree Page) ========== */
        .pm-hierarchy-view {
            padding: 24px;
        }
        .pm-hierarchy-header {
            text-align: center;
            margin-bottom: 24px;
        }
        .pm-hierarchy-header h3 {
            font-size: 20px;
            font-weight: 600;
            color: #e0e0e8;
            margin: 0 0 8px 0;
        }
        .pm-hierarchy-subtitle {
            font-size: 14px;
            color: #a0a0b8;
            margin: 0 0 16px 0;
        }
        .pm-hierarchy-legend {
            display: flex;
            justify-content: center;
            gap: 16px;
            flex-wrap: wrap;
            padding: 12px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
        }
        .pm-legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
        }
        .pm-legend-color {
            width: 12px;
            height: 12px;
            border-radius: 3px;
        }

        /* ========== HIERARCHY EMPTY STATE ========== */
        .pm-hierarchy-empty {
            text-align: center;
            padding: 60px 20px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 12px;
            border: 2px dashed rgba(107, 107, 128, 0.3);
        }
        .pm-hierarchy-empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        .pm-hierarchy-empty h4 {
            font-size: 18px;
            font-weight: 600;
            color: #e0e0e8;
            margin: 0 0 8px 0;
        }
        .pm-hierarchy-empty p {
            font-size: 14px;
            color: #a0a0b8;
            margin: 0;
        }

        /* ========== HIERARCHY DIAGRAM (Tree View) ========== */
        .pm-hierarchy-diagram {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 12px;
            padding: 24px;
            overflow-x: auto;
        }

        /* ========== TREE NODES ========== */
        .pm-tree-root {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .pm-tree-node {
            position: relative;
            padding: 12px 16px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
            border: 1px solid var(--node-color, rgba(107, 107, 128, 0.3));
            border-left: 4px solid var(--node-color, #6b6b80);
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        .pm-tree-node:hover {
            background: rgba(255, 255, 255, 0.05);
            transform: translateX(4px);
        }
        .pm-tree-node-header {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .pm-tree-node-icon {
            font-size: 20px;
        }
        .pm-tree-node-info {
            flex: 1;
        }
        .pm-tree-node-code {
            font-size: 12px;
            font-weight: 600;
            color: var(--node-color, #b388ff);
            margin-bottom: 2px;
        }
        .pm-tree-node-title {
            font-size: 14px;
            color: #e0e0e8;
        }
        .pm-tree-node-status {
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: 500;
        }
        .pm-tree-node-children {
            font-size: 11px;
            color: #6b6b80;
            padding: 3px 8px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }
        .pm-tree-children {
            margin-top: 12px;
            padding-left: 24px;
            border-left: 2px solid rgba(107, 107, 128, 0.2);
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        /* ========== HIERARCHY SUMMARY GRID ========== */
        .pm-hierarchy-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
            margin-top: 24px;
        }
        .pm-summary-card {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            padding: 16px;
            text-align: center;
            border: 1px solid rgba(107, 107, 128, 0.2);
            transition: all 0.3s ease;
        }
        .pm-summary-card:hover {
            transform: translateY(-4px);
            border-color: var(--card-color, rgba(179, 136, 255, 0.4));
        }
        .pm-summary-icon {
            font-size: 28px;
            margin-bottom: 8px;
        }
        .pm-summary-count {
            font-size: 24px;
            font-weight: 700;
            color: var(--card-color, #e0e0e8);
        }
        .pm-summary-label {
            font-size: 12px;
            color: #a0a0b8;
            margin-top: 4px;
        }

        /* ========== HELP SYSTEM INTEGRATION ========== */
        .pm-help-banner {
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(179, 136, 255, 0.05));
            border: 1px solid rgba(0, 212, 255, 0.2);
            border-radius: 10px;
            padding: 16px 20px;
            margin-bottom: 20px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }
        .pm-help-banner-icon {
            font-size: 24px;
            flex-shrink: 0;
        }
        .pm-help-banner-content {
            flex: 1;
        }
        .pm-help-banner-title {
            font-size: 14px;
            font-weight: 600;
            color: #00d4ff;
            margin: 0 0 6px 0;
        }
        .pm-help-banner-tips {
            font-size: 13px;
            color: #a0a0b8;
            line-height: 1.5;
        }
        .pm-help-banner-tips li {
            margin-bottom: 4px;
        }
        .pm-help-banner-close {
            background: none;
            border: none;
            color: #6b6b80;
            font-size: 18px;
            cursor: pointer;
            padding: 4px;
        }
        .pm-help-banner-close:hover {
            color: #a0a0b8;
        }

        /* Tooltips de ayuda */
        [data-help] {
            position: relative;
        }
        [data-help]::after {
            content: '?';
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            height: 14px;
            font-size: 10px;
            font-weight: bold;
            background: rgba(0, 212, 255, 0.2);
            color: #00d4ff;
            border-radius: 50%;
            margin-left: 6px;
            cursor: help;
            opacity: 0.7;
            transition: opacity 0.3s;
        }
        [data-help]:hover::after {
            opacity: 1;
        }
    `;
    document.head.appendChild(styles);
}

// ============================================================================
// EXPORTS
// ============================================================================
if (typeof window !== 'undefined') {
    window.showProceduresManualContent = showProceduresManualContent;
    window.ProceduresEngine = ProceduresEngine;
    window.ProceduresManual = { render: showProceduresManualContent };

    window.Modules = window.Modules || {};
    window.Modules['procedures-manual'] = {
        init: showProceduresManualContent,
        render: showProceduresManualContent
    };
}

console.log('%c MANUAL DE PROCEDIMIENTOS v2.4.0 READY (Ayuda Contextual + Árbol Jerárquico) ', 'background: linear-gradient(135deg, #b388ff, #00d4ff); color: #000; padding: 4px 12px; border-radius: 4px; font-weight: bold;');

})(); // Fin del IIFE
