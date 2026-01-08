/**
 * ============================================================================
 * ENGINEERING DASHBOARD - Sistema Completo de Testing e Ingeniería
 * ============================================================================
 *
 * SOLAPA E2E TESTING ADVANCED:
 * - Gestión completa de procesos de testing
 * - Dashboard de tickets en tiempo real
 * - Auto-resolución con Brain
 * - Programación de ejecuciones
 * - Exportación de prompts para Claude Code
 *
 * @version 2.0.0 - Sistema Híbrido Definitivo
 * @date 2026-01-07
 * @author Claude Code Assistant
 * ============================================================================
 */

const EngineeringDashboard = {
    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================
    state: {
        currentTab: 'overview',
        currentCompanyId: null,
        tickets: [],
        processes: [],
        executions: [],
        websocket: null,
        filters: {
            priority: 'all',
            status: 'all',
            module: 'all',
            dateRange: 'last7days'
        },
        autoRefresh: true,
        refreshInterval: null
    },

    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    async init(companyId) {
        console.log('🏗️ [ENGINEERING] Inicializando Engineering Dashboard...');

        this.state.currentCompanyId = companyId;

        await this.loadProcesses();
        await this.loadTickets();
        await this.loadExecutions();
        this.setupWebSocket();
        this.setupAutoRefresh();
        this.render();

        console.log('✅ [ENGINEERING] Dashboard inicializado');
    },

    // ========================================================================
    // DATA LOADING
    // ========================================================================
    async loadProcesses() {
        try {
            const response = await fetch('/api/e2e-advanced/processes');
            const data = await response.json();
            this.state.processes = data.processes || [];
        } catch (error) {
            console.error('Error cargando procesos:', error);
            this.state.processes = this.getDefaultProcesses();
        }
    },

    async loadTickets() {
        try {
            const { status, priority, module } = this.state.filters;
            const params = new URLSearchParams({
                status,
                priority,
                module,
                page: 1,
                limit: 100,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            });

            const response = await fetch(`/api/brain/tickets?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.state.tickets = data.data || []; // API retorna en data.data
            console.log(`📊 Tickets cargados: ${this.state.tickets.length}`);
        } catch (error) {
            console.error('❌ Error cargando tickets:', error);
            this.state.tickets = [];
            this.showToast('Error cargando tickets. Verifica tu conexión.', 'error');
        }
    },

    async loadExecutions() {
        try {
            const response = await fetch('/api/e2e-advanced/executions?limit=50');
            const data = await response.json();
            this.state.executions = data.executions || [];
        } catch (error) {
            console.error('Error cargando ejecuciones:', error);
            this.state.executions = [];
        }
    },

    // ========================================================================
    // PROCESOS DE TESTING (DEFINIDOS Y VIGENTES)
    // ========================================================================
    getDefaultProcesses() {
        return [
            // ================================================================
            // PROCESO 1: E2E FUNCTIONAL TESTING (Playwright)
            // ================================================================
            {
                id: 'e2e-functional',
                name: 'E2E Functional Testing',
                description: 'Tests funcionales end-to-end con Playwright',
                category: 'functional',
                status: 'active',
                weight: 0.25, // 25% del confidence score
                phases: [
                    {
                        id: 'e2e-setup',
                        name: 'Setup del ambiente',
                        description: 'Verificar servidor, BD, servicios',
                        automated: true,
                        duration: '30s',
                        brainVerify: true,
                        commands: [
                            'Verificar servidor en puerto 9998',
                            'Verificar conexión PostgreSQL',
                            'Verificar servicios externos (Ollama, etc)'
                        ]
                    },
                    {
                        id: 'e2e-execution',
                        name: 'Ejecución de tests Playwright',
                        description: 'Ejecutar suite completo de tests E2E',
                        automated: true,
                        duration: '5-10min',
                        brainVerify: true,
                        tool: 'Playwright',
                        commands: [
                            'npx playwright test',
                            'Capturar screenshots on failure',
                            'Generar HTML report'
                        ]
                    },
                    {
                        id: 'e2e-analysis',
                        name: 'Análisis de resultados',
                        description: 'Analizar failures con Brain',
                        automated: true,
                        duration: '1-2min',
                        brainVerify: true,
                        aiPowered: true,
                        commands: [
                            'Brain analiza failures',
                            'Genera tickets si necesario',
                            'Intenta auto-reparación'
                        ]
                    }
                ],
                selectable: true,
                canRunAlone: true,
                dependencies: []
            },

            // ================================================================
            // PROCESO 2: LOAD & PERFORMANCE TESTING (k6)
            // ================================================================
            {
                id: 'load-testing',
                name: 'Load & Performance Testing',
                description: 'Tests de carga y performance con k6',
                category: 'performance',
                status: 'active',
                weight: 0.15, // 15% del confidence score
                phases: [
                    {
                        id: 'load-warmup',
                        name: 'Warm-up del sistema',
                        description: 'Precalentar servidor y conexiones',
                        automated: true,
                        duration: '1min',
                        brainVerify: true,
                        commands: [
                            'Ejecutar requests de warm-up',
                            'Verificar respuesta inicial',
                            'Establecer baseline'
                        ]
                    },
                    {
                        id: 'load-execution',
                        name: 'Ejecución de tests k6',
                        description: 'Ejecutar escenarios de carga',
                        automated: true,
                        duration: '3-5min',
                        brainVerify: true,
                        tool: 'k6',
                        commands: [
                            'k6 run load-test.js',
                            'Medir P95, P99 latency',
                            'Verificar thresholds'
                        ]
                    },
                    {
                        id: 'load-analysis',
                        name: 'Análisis de performance',
                        description: 'Detectar degradación',
                        automated: true,
                        duration: '1min',
                        brainVerify: true,
                        aiPowered: true,
                        commands: [
                            'Comparar con baseline',
                            'Detectar degradación >10%',
                            'Generar ticket si degrada'
                        ]
                    }
                ],
                selectable: true,
                canRunAlone: true,
                dependencies: ['e2e-functional']
            },

            // ================================================================
            // PROCESO 3: SECURITY TESTING (OWASP ZAP)
            // ================================================================
            {
                id: 'security-testing',
                name: 'Security Testing',
                description: 'Escaneo de seguridad con OWASP ZAP',
                category: 'security',
                status: 'active',
                weight: 0.20, // 20% del confidence score
                phases: [
                    {
                        id: 'security-spider',
                        name: 'Spider del sitio',
                        description: 'Descubrir todos los endpoints',
                        automated: true,
                        duration: '2-3min',
                        brainVerify: true,
                        tool: 'OWASP ZAP',
                        commands: [
                            'ZAP spider http://localhost:9998',
                            'Descubrir endpoints',
                            'Mapear sitio completo'
                        ]
                    },
                    {
                        id: 'security-scan',
                        name: 'Active scan',
                        description: 'Escaneo activo de vulnerabilidades',
                        automated: true,
                        duration: '10-15min',
                        brainVerify: true,
                        tool: 'OWASP ZAP',
                        commands: [
                            'ZAP active scan',
                            'Detectar SQL injection, XSS, etc',
                            'Generar report HTML/JSON'
                        ]
                    },
                    {
                        id: 'security-triage',
                        name: 'Triage de vulnerabilidades',
                        description: 'Clasificar y priorizar',
                        automated: true,
                        duration: '1-2min',
                        brainVerify: true,
                        aiPowered: true,
                        commands: [
                            'Brain analiza vulnerabilidades',
                            'Filtra false positives',
                            'Genera tickets por severidad'
                        ]
                    }
                ],
                selectable: true,
                canRunAlone: true,
                dependencies: []
            },

            // ================================================================
            // PROCESO 4: MULTI-TENANT ISOLATION
            // ================================================================
            {
                id: 'multi-tenant-testing',
                name: 'Multi-Tenant Isolation Testing',
                description: 'Verificar aislamiento entre empresas',
                category: 'integrity',
                status: 'active',
                weight: 0.15, // 15% del confidence score
                phases: [
                    {
                        id: 'tenant-seed',
                        name: 'Seed de datos multi-tenant',
                        description: 'Crear 10 empresas virtuales',
                        automated: true,
                        duration: '1min',
                        brainVerify: true,
                        commands: [
                            'Crear 10 empresas con datos',
                            'Generar usuarios por empresa',
                            'Crear registros de asistencia'
                        ]
                    },
                    {
                        id: 'tenant-isolation',
                        name: 'Tests de aislamiento',
                        description: 'Verificar no hay data leakage',
                        automated: true,
                        duration: '3-5min',
                        brainVerify: true,
                        commands: [
                            'Login como empresa A',
                            'Intentar acceder datos empresa B',
                            'Verificar queries tienen WHERE company_id'
                        ]
                    },
                    {
                        id: 'tenant-cleanup',
                        name: 'Cleanup de datos',
                        description: 'Eliminar datos de prueba',
                        automated: true,
                        duration: '30s',
                        brainVerify: true,
                        commands: [
                            'Eliminar empresas virtuales',
                            'Verificar cascadas DELETE',
                            'Validar BD limpia'
                        ]
                    }
                ],
                selectable: true,
                canRunAlone: false, // Requiere E2E primero
                dependencies: ['e2e-functional']
            },

            // ================================================================
            // PROCESO 5: DATABASE INTEGRITY
            // ================================================================
            {
                id: 'database-integrity',
                name: 'Database Integrity Testing',
                description: 'Verificar integridad de base de datos',
                category: 'integrity',
                status: 'active',
                weight: 0.10, // 10% del confidence score
                phases: [
                    {
                        id: 'db-orphans',
                        name: 'Detección de orphan records',
                        description: 'Buscar registros huérfanos',
                        automated: true,
                        duration: '1-2min',
                        brainVerify: true,
                        commands: [
                            'Verificar FKs sin parent',
                            'Buscar registros inconsistentes',
                            'Generar report de orphans'
                        ]
                    },
                    {
                        id: 'db-constraints',
                        name: 'Validación de constraints',
                        description: 'Verificar todas las constraints',
                        automated: true,
                        duration: '1min',
                        brainVerify: true,
                        commands: [
                            'Verificar FKs válidas',
                            'Verificar UNIQUEs',
                            'Verificar CHECKs'
                        ]
                    },
                    {
                        id: 'db-indexes',
                        name: 'Performance de índices',
                        description: 'Verificar índices efectivos',
                        automated: true,
                        duration: '1min',
                        brainVerify: true,
                        commands: [
                            'EXPLAIN ANALYZE queries lentas',
                            'Verificar índices usados',
                            'Sugerir índices faltantes'
                        ]
                    }
                ],
                selectable: true,
                canRunAlone: true,
                dependencies: []
            },

            // ================================================================
            // PROCESO 6: MONITORING & OBSERVABILITY
            // ================================================================
            {
                id: 'monitoring-testing',
                name: 'Monitoring & Observability',
                description: 'Verificar sistemas de monitoreo',
                category: 'observability',
                status: 'active',
                weight: 0.05, // 5% del confidence score
                phases: [
                    {
                        id: 'mon-logs',
                        name: 'Verificar logs estructurados',
                        description: 'Validar logs JSON',
                        automated: true,
                        duration: '30s',
                        brainVerify: true,
                        commands: [
                            'Generar eventos de prueba',
                            'Verificar logs en formato JSON',
                            'Validar campos obligatorios'
                        ]
                    },
                    {
                        id: 'mon-metrics',
                        name: 'Verificar métricas',
                        description: 'Validar métricas exportadas',
                        automated: true,
                        duration: '30s',
                        brainVerify: true,
                        commands: [
                            'Verificar /metrics endpoint',
                            'Validar formato Prometheus',
                            'Verificar métricas críticas'
                        ]
                    }
                ],
                selectable: true,
                canRunAlone: true,
                dependencies: []
            },

            // ================================================================
            // PROCESO 7: EDGE CASES & BOUNDARIES
            // ================================================================
            {
                id: 'edge-cases-testing',
                name: 'Edge Cases & Boundaries',
                description: 'Tests de casos extremos',
                category: 'robustness',
                status: 'active',
                weight: 0.10, // 10% del confidence score
                phases: [
                    {
                        id: 'edge-unicode',
                        name: 'Unicode & Emoji',
                        description: 'Validar soporte Unicode completo',
                        automated: true,
                        duration: '1min',
                        brainVerify: true,
                        commands: [
                            'Crear registros con emoji',
                            'Probar CJK, árabe, cirílico',
                            'Verificar búsqueda funciona'
                        ]
                    },
                    {
                        id: 'edge-timezones',
                        name: 'Timezones',
                        description: 'Validar 24 zonas horarias',
                        automated: true,
                        duration: '2min',
                        brainVerify: true,
                        commands: [
                            'Probar TZ: UTC, America/Buenos_Aires, etc',
                            'Verificar marcas de asistencia correctas',
                            'Validar reportes por TZ'
                        ]
                    },
                    {
                        id: 'edge-boundaries',
                        name: 'Valores extremos',
                        description: 'Probar límites',
                        automated: true,
                        duration: '1min',
                        brainVerify: true,
                        commands: [
                            'Probar MAX_INT, MIN_INT',
                            'Strings muy largos (10MB)',
                            'Arrays vacíos, nulls'
                        ]
                    }
                ],
                selectable: true,
                canRunAlone: true,
                dependencies: []
            }
        ];
    },

    // ========================================================================
    // WEBSOCKET REAL-TIME
    // ========================================================================
    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/engineering`;

        try {
            this.state.websocket = new WebSocket(wsUrl);

            this.state.websocket.onopen = () => {
                console.log('🔌 [ENGINEERING] WebSocket conectado');
            };

            this.state.websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.state.websocket.onerror = (error) => {
                console.error('❌ [ENGINEERING] WebSocket error:', error);
            };

            this.state.websocket.onclose = () => {
                console.log('🔌 [ENGINEERING] WebSocket desconectado, reconectando...');
                setTimeout(() => this.setupWebSocket(), 5000);
            };
        } catch (error) {
            console.error('Error configurando WebSocket:', error);
        }
    },

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'ticket_created':
                this.state.tickets.unshift(data.ticket);
                this.updateTicketsView();
                this.showToast(`🎫 Nuevo ticket: ${data.ticket.title}`, 'info');
                break;

            case 'ticket_updated':
                const ticketIndex = this.state.tickets.findIndex(t => t.id === data.ticket.id);
                if (ticketIndex >= 0) {
                    this.state.tickets[ticketIndex] = data.ticket;
                    this.updateTicketsView();
                }
                break;

            case 'ticket_resolved':
                const resolvedIndex = this.state.tickets.findIndex(t => t.id === data.ticketId);
                if (resolvedIndex >= 0) {
                    this.state.tickets[resolvedIndex].status = 'resolved';
                    this.updateTicketsView();
                    this.showToast(`✅ Ticket resuelto: ${data.ticketId}`, 'success');
                }
                break;

            case 'execution_started':
                this.showToast(`🚀 Ejecución iniciada: ${data.processName}`, 'info');
                break;

            case 'execution_progress':
                this.updateExecutionProgress(data);
                break;

            case 'execution_completed':
                this.state.executions.unshift(data.execution);
                this.updateExecutionsView();
                this.showToast(`✅ Ejecución completada: ${data.execution.overall_score}% confidence`, 'success');
                break;
        }
    },

    // ========================================================================
    // AUTO-REFRESH
    // ========================================================================
    setupAutoRefresh() {
        if (this.state.autoRefresh) {
            this.state.refreshInterval = setInterval(() => {
                this.loadTickets();
                this.loadExecutions();
            }, 10000); // Cada 10 segundos
        }
    },

    // ========================================================================
    // MAIN RENDER
    // ========================================================================
    render() {
        const container = document.getElementById('engineering-dashboard-container');
        if (!container) {
            console.error('Container no encontrado');
            return;
        }

        container.innerHTML = `
            <div class="engineering-dashboard">
                <!-- HEADER -->
                <div class="dashboard-header">
                    <h2>🏗️ Engineering Dashboard</h2>
                    <div class="header-actions">
                        <button class="btn btn-success" onclick="EngineeringDashboard.runFullSuite()">
                            <i class="fas fa-play"></i> Ejecutar Suite Completo
                        </button>
                        <button class="btn btn-primary" onclick="EngineeringDashboard.showScheduler()">
                            <i class="fas fa-calendar"></i> Programar Ejecución
                        </button>
                        <button class="btn btn-secondary" onclick="EngineeringDashboard.toggleAutoRefresh()">
                            <i class="fas fa-sync ${this.state.autoRefresh ? 'fa-spin' : ''}"></i>
                            Auto-refresh: ${this.state.autoRefresh ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>

                <!-- TABS -->
                <div class="dashboard-tabs">
                    <button class="tab ${this.state.currentTab === 'overview' ? 'active' : ''}"
                            onclick="EngineeringDashboard.switchTab('overview')">
                        📊 Overview
                    </button>
                    <button class="tab ${this.state.currentTab === 'processes' ? 'active' : ''}"
                            onclick="EngineeringDashboard.switchTab('processes')">
                        ⚙️ Procesos de Testing
                    </button>
                    <button class="tab ${this.state.currentTab === 'tickets' ? 'active' : ''}"
                            onclick="EngineeringDashboard.switchTab('tickets')">
                        🎫 Gestión de Tickets
                        ${this.state.tickets.filter(t => t.status === 'open').length > 0 ?
                            `<span class="badge">${this.state.tickets.filter(t => t.status === 'open').length}</span>` : ''}
                    </button>
                    <button class="tab ${this.state.currentTab === 'executions' ? 'active' : ''}"
                            onclick="EngineeringDashboard.switchTab('executions')">
                        📈 Historial de Ejecuciones
                    </button>
                    <button class="tab ${this.state.currentTab === 'scheduler' ? 'active' : ''}"
                            onclick="EngineeringDashboard.switchTab('scheduler')">
                        🕐 Programador
                    </button>
                </div>

                <!-- CONTENT -->
                <div class="dashboard-content">
                    ${this.renderTabContent()}
                </div>
            </div>

            <!-- MODALES -->
            <div id="engineering-modals"></div>
        `;

        this.attachEventListeners();
    },

    renderTabContent() {
        switch (this.state.currentTab) {
            case 'overview':
                return this.renderOverviewTab();
            case 'processes':
                return this.renderProcessesTab();
            case 'tickets':
                return this.renderTicketsTab();
            case 'executions':
                return this.renderExecutionsTab();
            case 'scheduler':
                return this.renderSchedulerTab();
            default:
                return '<p>Tab no encontrado</p>';
        }
    },

    // ========================================================================
    // TAB: OVERVIEW
    // ========================================================================
    renderOverviewTab() {
        const lastExecution = this.state.executions[0];
        const openTickets = this.state.tickets.filter(t => t.status === 'open').length;
        const criticalTickets = this.state.tickets.filter(t => t.priority === 'critical' && t.status === 'open').length;

        return `
            <div class="overview-tab">
                <div class="stats-grid">
                    <div class="stat-card ${lastExecution?.production_ready ? 'success' : 'warning'}">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-value">${lastExecution?.overall_score || 0}%</div>
                        <div class="stat-label">Confidence Score</div>
                        <div class="stat-status">
                            ${lastExecution?.production_ready ? '✅ Production Ready' : '⚠️ Requiere mejoras'}
                        </div>
                    </div>

                    <div class="stat-card ${openTickets === 0 ? 'success' : 'warning'}">
                        <div class="stat-icon">🎫</div>
                        <div class="stat-value">${openTickets}</div>
                        <div class="stat-label">Tickets Abiertos</div>
                        <div class="stat-status">
                            ${criticalTickets > 0 ? `🔴 ${criticalTickets} críticos` : ''}
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">⚙️</div>
                        <div class="stat-value">${this.state.processes.length}</div>
                        <div class="stat-label">Procesos Activos</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div class="stat-value">${this.state.executions.length}</div>
                        <div class="stat-label">Ejecuciones (Últimos 30d)</div>
                    </div>
                </div>

                <!-- ÚLTIMA EJECUCIÓN -->
                ${lastExecution ? `
                    <div class="last-execution-card">
                        <h3>📊 Última Ejecución</h3>
                        <div class="execution-details">
                            <div class="detail-row">
                                <span class="label">Fecha:</span>
                                <span class="value">${new Date(lastExecution.created_at).toLocaleString()}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Duración:</span>
                                <span class="value">${(lastExecution.duration / 1000).toFixed(2)}s</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Tests:</span>
                                <span class="value">
                                    ✅ ${lastExecution.tests_passed} passed /
                                    ❌ ${lastExecution.tests_failed} failed
                                </span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Fases ejecutadas:</span>
                                <span class="value">${lastExecution.phases_executed?.join(', ')}</span>
                            </div>
                        </div>

                        <div class="confidence-breakdown">
                            <h4>Desglose de Confidence Score</h4>
                            ${this.renderConfidenceBreakdown(lastExecution)}
                        </div>
                    </div>
                ` : '<p>No hay ejecuciones recientes</p>'}

                <!-- TICKETS CRÍTICOS -->
                ${criticalTickets > 0 ? `
                    <div class="critical-tickets-alert">
                        <h3>🚨 Tickets Críticos Pendientes</h3>
                        <div class="critical-tickets-list">
                            ${this.state.tickets
                                .filter(t => t.priority === 'critical' && t.status === 'open')
                                .slice(0, 5)
                                .map(ticket => `
                                    <div class="critical-ticket-item">
                                        <div class="ticket-title">${ticket.title}</div>
                                        <div class="ticket-meta">
                                            Creado: ${new Date(ticket.createdAt).toLocaleString()} -
                                            Módulo: ${ticket.technical?.module || 'N/A'}
                                        </div>
                                        <button class="btn btn-sm btn-primary"
                                                onclick="EngineeringDashboard.viewTicket('${ticket.id}')">
                                            Ver Detalles
                                        </button>
                                    </div>
                                `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    renderConfidenceBreakdown(execution) {
        const phases = [
            { name: 'E2E Functional', key: 'e2e', weight: 0.25 },
            { name: 'Load Testing', key: 'load', weight: 0.15 },
            { name: 'Security', key: 'security', weight: 0.20 },
            { name: 'Multi-Tenant', key: 'multiTenant', weight: 0.15 },
            { name: 'Database', key: 'database', weight: 0.10 },
            { name: 'Monitoring', key: 'monitoring', weight: 0.05 },
            { name: 'Edge Cases', key: 'edgeCases', weight: 0.10 }
        ];

        return phases.map(phase => {
            const score = execution[`${phase.key}_score`] || 0;
            const contribution = (score * phase.weight).toFixed(1);

            return `
                <div class="confidence-phase">
                    <div class="phase-name">${phase.name}</div>
                    <div class="phase-bar">
                        <div class="phase-fill ${this.getScoreClass(score)}"
                             style="width: ${score}%">
                            ${score}%
                        </div>
                    </div>
                    <div class="phase-contribution">
                        Contribución: ${contribution}% (peso ${(phase.weight * 100)}%)
                    </div>
                </div>
            `;
        }).join('');
    },

    getScoreClass(score) {
        if (score >= 95) return 'score-excellent';
        if (score >= 85) return 'score-good';
        if (score >= 70) return 'score-warning';
        return 'score-danger';
    },

    // ========================================================================
    // TAB: PROCESOS DE TESTING (CONTINUARÁ EN SIGUIENTE ARCHIVO...)
    // ========================================================================
    renderProcessesTab() {
        return `
            <div class="processes-tab">
                <div class="processes-header">
                    <h3>⚙️ Procesos de Testing Vigentes</h3>
                    <p class="subtitle">
                        Selecciona los procesos a ejecutar. Brain verificará que cada proceso esté vigente antes de ejecutar.
                    </p>
                </div>

                <div class="processes-grid">
                    ${this.state.processes.map(process => this.renderProcessCard(process)).join('')}
                </div>

                <!-- BOTONES DE ACCIÓN -->
                <div class="processes-actions">
                    <button class="btn btn-lg btn-success" onclick="EngineeringDashboard.runSelectedProcesses()">
                        <i class="fas fa-play-circle"></i>
                        Ejecutar Procesos Seleccionados
                    </button>
                    <button class="btn btn-lg btn-primary" onclick="EngineeringDashboard.runFullSuite()">
                        <i class="fas fa-rocket"></i>
                        Ejecutar Suite Completo (7 procesos)
                    </button>
                </div>
            </div>
        `;
    },

    renderProcessCard(process) {
        const isSelected = process.selected || false;
        const canRun = process.dependencies.length === 0 || process.dependencies.every(dep =>
            this.state.processes.find(p => p.id === dep)?.selected
        );

        return `
            <div class="process-card ${isSelected ? 'selected' : ''} ${!canRun && isSelected ? 'disabled' : ''}">
                <div class="process-header">
                    <div class="process-title">
                        <input type="checkbox"
                               id="process-${process.id}"
                               ${isSelected ? 'checked' : ''}
                               ${!canRun ? 'disabled' : ''}
                               onchange="EngineeringDashboard.toggleProcess('${process.id}')">
                        <label for="process-${process.id}">
                            <strong>${process.name}</strong>
                        </label>
                    </div>
                    <div class="process-status">
                        <span class="badge badge-${process.status === 'active' ? 'success' : 'secondary'}">
                            ${process.status === 'active' ? '✅ Activo' : '⚠️ Inactivo'}
                        </span>
                    </div>
                </div>

                <div class="process-description">
                    ${process.description}
                </div>

                <div class="process-meta">
                    <div class="meta-item">
                        <span class="meta-label">Categoría:</span>
                        <span class="meta-value">${process.category}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Peso en score:</span>
                        <span class="meta-value">${(process.weight * 100)}%</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Fases:</span>
                        <span class="meta-value">${process.phases.length} fases</span>
                    </div>
                </div>

                ${process.dependencies.length > 0 ? `
                    <div class="process-dependencies">
                        <span class="dependencies-label">⚠️ Requiere:</span>
                        ${process.dependencies.map(dep => {
                            const depProcess = this.state.processes.find(p => p.id === dep);
                            return `<span class="dependency-badge">${depProcess?.name || dep}</span>`;
                        }).join('')}
                    </div>
                ` : ''}

                <!-- FASES DEL PROCESO -->
                <div class="process-phases">
                    <button class="btn btn-sm btn-secondary"
                            onclick="EngineeringDashboard.togglePhases('${process.id}')">
                        Ver ${process.phases.length} fases
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="phases-list" id="phases-${process.id}" style="display: none;">
                        ${process.phases.map((phase, index) => `
                            <div class="phase-item">
                                <div class="phase-number">${index + 1}</div>
                                <div class="phase-details">
                                    <div class="phase-name">${phase.name}</div>
                                    <div class="phase-description">${phase.description}</div>
                                    <div class="phase-meta">
                                        ${phase.automated ? '🤖 Automatizado' : '👤 Manual'} |
                                        ⏱️ ${phase.duration} |
                                        ${phase.brainVerify ? '🧠 Brain verifica' : ''} |
                                        ${phase.aiPowered ? '🤖 AI-Powered' : ''} |
                                        ${phase.tool ? `🔧 ${phase.tool}` : ''}
                                    </div>
                                    ${phase.commands && phase.commands.length > 0 ? `
                                        <div class="phase-commands">
                                            <small>Comandos:</small>
                                            <ul>
                                                ${phase.commands.map(cmd => `<li><code>${cmd}</code></li>`).join('')}
                                            </ul>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- ACCIONES DEL PROCESO -->
                <div class="process-actions">
                    ${process.canRunAlone ? `
                        <button class="btn btn-sm btn-primary"
                                onclick="EngineeringDashboard.runSingleProcess('${process.id}')"
                                ${!canRun ? 'disabled' : ''}>
                            <i class="fas fa-play"></i>
                            Ejecutar Solo
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-info"
                            onclick="EngineeringDashboard.viewProcessDetails('${process.id}')">
                        <i class="fas fa-info-circle"></i>
                        Detalles
                    </button>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // TAB: TICKETS (Gestión en Tiempo Real)
    // ========================================================================
    renderTicketsTab() {
        const openTickets = this.state.tickets.filter(t => t.status === 'open');
        const inProgressTickets = this.state.tickets.filter(t => t.status === 'in_progress');
        const resolvedTickets = this.state.tickets.filter(t => t.status === 'resolved');

        return `
            <div class="tickets-tab">
                <!-- HEADER CON FILTROS -->
                <div class="tickets-header">
                    <h3>🎫 Gestión de Tickets en Tiempo Real</h3>
                    <div class="tickets-filters">
                        <select id="filter-priority" onchange="EngineeringDashboard.filterTickets()">
                            <option value="all">Todas las prioridades</option>
                            <option value="critical">🔴 Críticas</option>
                            <option value="high">🟠 Altas</option>
                            <option value="medium">🟡 Medias</option>
                            <option value="low">🟢 Bajas</option>
                        </select>

                        <select id="filter-status" onchange="EngineeringDashboard.filterTickets()">
                            <option value="open">Abiertos</option>
                            <option value="in_progress">En Progreso</option>
                            <option value="resolved">Resueltos</option>
                            <option value="all">Todos</option>
                        </select>

                        <select id="filter-module" onchange="EngineeringDashboard.filterTickets()">
                            <option value="all">Todos los módulos</option>
                            <option value="users">Users</option>
                            <option value="attendance">Attendance</option>
                            <option value="departments">Departments</option>
                            <option value="medical">Medical</option>
                        </select>
                    </div>
                </div>

                <!-- STATS RÁPIDAS -->
                <div class="tickets-stats">
                    <div class="ticket-stat">
                        <div class="stat-number ${openTickets.length > 0 ? 'warning' : 'success'}">
                            ${openTickets.length}
                        </div>
                        <div class="stat-label">Abiertos</div>
                    </div>
                    <div class="ticket-stat">
                        <div class="stat-number info">${inProgressTickets.length}</div>
                        <div class="stat-label">En Progreso</div>
                    </div>
                    <div class="ticket-stat">
                        <div class="stat-number success">${resolvedTickets.length}</div>
                        <div class="stat-label">Resueltos (Hoy)</div>
                    </div>
                    <div class="ticket-stat">
                        <div class="stat-number">${this.state.tickets.length}</div>
                        <div class="stat-label">Total</div>
                    </div>
                </div>

                <!-- LISTA DE TICKETS -->
                <div class="tickets-list" id="tickets-list">
                    ${this.state.tickets.length === 0 ?
                        '<p class="empty-state">✅ No hay tickets. ¡Sistema funcionando correctamente!</p>' :
                        this.state.tickets.map(ticket => this.renderTicketCard(ticket)).join('')
                    }
                </div>
            </div>
        `;
    },

    renderTicketCard(ticket) {
        const priorityColors = {
            critical: 'danger',
            high: 'warning',
            medium: 'info',
            low: 'success'
        };

        const statusColors = {
            open: 'danger',
            in_progress: 'warning',
            resolved: 'success'
        };

        const autoRepairStatus = ticket.technical?.autoRepairAttempts || 0;
        const canAutoRepair = ticket.technical?.aiDiagnosis?.suggestedFix && ticket.status !== 'resolved';

        return `
            <div class="ticket-card priority-${ticket.priority} status-${ticket.status}">
                <div class="ticket-card-header">
                    <div class="ticket-id-badge">
                        <span class="ticket-id">${ticket.id}</span>
                        <span class="ticket-priority badge-${priorityColors[ticket.priority]}">
                            ${ticket.priority}
                        </span>
                        <span class="ticket-status badge-${statusColors[ticket.status]}">
                            ${ticket.status === 'in_progress' ? '⏳ En progreso' :
                              ticket.status === 'resolved' ? '✅ Resuelto' : '🔴 Abierto'}
                        </span>
                    </div>
                    <div class="ticket-date">
                        ${new Date(ticket.createdAt).toLocaleString()}
                    </div>
                </div>

                <div class="ticket-title">${ticket.title}</div>

                <div class="ticket-meta">
                    <span>📦 Módulo: <strong>${ticket.technical?.module || 'N/A'}</strong></span>
                    ${ticket.technical?.errorType ?
                        `<span>⚠️ Tipo: <strong>${ticket.technical.errorType}</strong></span>` : ''}
                </div>

                <!-- AUTO-RESOLUTION STATUS (TIEMPO REAL) -->
                ${autoRepairStatus > 0 || ticket.status === 'in_progress' ? `
                    <div class="auto-resolution-section">
                        <div class="auto-resolution-header">
                            🤖 Auto-Reparación ${ticket.status === 'in_progress' ? '(En curso)' : ''}
                        </div>
                        <div class="auto-resolution-timeline">
                            ${autoRepairStatus > 0 ? `
                                <div class="timeline-item">
                                    <span class="timeline-icon">🔄</span>
                                    <span class="timeline-text">
                                        ${autoRepairStatus} ${autoRepairStatus === 1 ? 'intento' : 'intentos'} de auto-reparación
                                    </span>
                                </div>
                            ` : ''}

                            ${ticket.status === 'in_progress' ? `
                                <div class="timeline-item active">
                                    <span class="timeline-icon spinner">⟳</span>
                                    <span class="timeline-text">
                                        Reparando... Brain ejecutando fix
                                    </span>
                                </div>
                            ` : ''}

                            ${ticket.technical?.aiDiagnosis ? `
                                <div class="timeline-item">
                                    <span class="timeline-icon">🧠</span>
                                    <span class="timeline-text">
                                        Diagnóstico IA: ${ticket.technical.aiDiagnosis.rootCause}
                                    </span>
                                </div>
                            ` : ''}

                            ${ticket.technical?.timeline ? `
                                ${ticket.technical.timeline.slice(-3).map(t => `
                                    <div class="timeline-item small">
                                        <span class="timeline-time">
                                            ${new Date(t.timestamp).toLocaleTimeString()}
                                        </span>
                                        <span class="timeline-text">${t.action}</span>
                                    </div>
                                `).join('')}
                            ` : ''}
                        </div>

                        <!-- PROGRESS BAR si está en progreso -->
                        ${ticket.status === 'in_progress' ? `
                            <div class="auto-repair-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${ticket.progress || 30}%"></div>
                                </div>
                                <div class="progress-text">
                                    ${ticket.currentStep || 'Analizando código...'}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                <!-- ACCIONES DEL TICKET -->
                <div class="ticket-actions">
                    <button class="btn btn-sm btn-info"
                            onclick="EngineeringDashboard.viewTicketDetails('${ticket.id}')">
                        <i class="fas fa-eye"></i>
                        Ver Detalles
                    </button>

                    ${canAutoRepair ? `
                        <button class="btn btn-sm btn-primary"
                                onclick="EngineeringDashboard.retryAutoRepair('${ticket.id}')">
                            <i class="fas fa-redo"></i>
                            Reintentar Auto-reparación
                        </button>
                    ` : ''}

                    <button class="btn btn-sm btn-success"
                            onclick="EngineeringDashboard.exportToClaudeCode('${ticket.id}')">
                        <i class="fas fa-file-export"></i>
                        Exportar para Claude Code
                    </button>

                    ${ticket.status === 'open' || ticket.status === 'in_progress' ? `
                        <button class="btn btn-sm btn-secondary"
                                onclick="EngineeringDashboard.markAsResolved('${ticket.id}')">
                            <i class="fas fa-check"></i>
                            Marcar Resuelto
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    // ========================================================================
    // TAB: EXECUTIONS (Historial)
    // ========================================================================
    renderExecutionsTab() {
        return `
            <div class="executions-tab">
                <div class="executions-header">
                    <h3>📈 Historial de Ejecuciones</h3>
                    <div class="executions-filters">
                        <select id="filter-date-range" onchange="EngineeringDashboard.filterExecutions()">
                            <option value="last7days">Últimos 7 días</option>
                            <option value="last30days">Últimos 30 días</option>
                            <option value="last90days">Últimos 90 días</option>
                            <option value="all">Todas</option>
                        </select>
                    </div>
                </div>

                <div class="executions-list">
                    ${this.state.executions.length === 0 ?
                        '<p class="empty-state">No hay ejecuciones registradas</p>' :
                        this.state.executions.map(exec => this.renderExecutionCard(exec)).join('')
                    }
                </div>
            </div>
        `;
    },

    renderExecutionCard(execution) {
        const isPassed = execution.production_ready;
        const score = execution.overall_score || 0;

        return `
            <div class="execution-card ${isPassed ? 'passed' : 'failed'}">
                <div class="execution-header">
                    <div class="execution-id">
                        <span class="execution-number">#${execution.execution_id?.substring(0, 8)}</span>
                        <span class="execution-date">${new Date(execution.created_at).toLocaleString()}</span>
                    </div>
                    <div class="execution-score ${this.getScoreClass(score)}">
                        ${score}%
                    </div>
                </div>

                <div class="execution-details">
                    <div class="detail-item">
                        <span class="detail-label">Modo:</span>
                        <span class="detail-value">${execution.mode}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Duración:</span>
                        <span class="detail-value">${(execution.duration / 1000).toFixed(2)}s</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Tests:</span>
                        <span class="detail-value">
                            ✅ ${execution.tests_passed} / ❌ ${execution.tests_failed}
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Fases:</span>
                        <span class="detail-value">
                            ${execution.phases_executed?.join(', ') || 'N/A'}
                        </span>
                    </div>
                </div>

                <div class="execution-actions">
                    <button class="btn btn-sm btn-info"
                            onclick="EngineeringDashboard.viewExecutionDetails('${execution.execution_id}')">
                        <i class="fas fa-chart-bar"></i>
                        Ver Detalles
                    </button>
                    <button class="btn btn-sm btn-secondary"
                            onclick="EngineeringDashboard.compareWithBaseline('${execution.execution_id}')">
                        <i class="fas fa-balance-scale"></i>
                        Comparar con Baseline
                    </button>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // TAB: SCHEDULER (Programador)
    // ========================================================================
    renderSchedulerTab() {
        return `
            <div class="scheduler-tab">
                <div class="scheduler-header">
                    <h3>🕐 Programador de Ejecuciones</h3>
                    <button class="btn btn-success" onclick="EngineeringDashboard.showScheduleModal()">
                        <i class="fas fa-plus"></i>
                        Nueva Ejecución Programada
                    </button>
                </div>

                <div class="scheduled-jobs">
                    ${this.renderScheduledJobs()}
                </div>

                <!-- QUICK SCHEDULE PRESETS -->
                <div class="quick-schedule">
                    <h4>⚡ Programaciones Rápidas</h4>
                    <div class="quick-schedule-buttons">
                        <button class="btn btn-primary" onclick="EngineeringDashboard.scheduleQuick('daily-full')">
                            📅 Suite Completo Diario (2am)
                        </button>
                        <button class="btn btn-primary" onclick="EngineeringDashboard.scheduleQuick('hourly-e2e')">
                            ⏰ E2E cada hora
                        </button>
                        <button class="btn btn-primary" onclick="EngineeringDashboard.scheduleQuick('weekly-security')">
                            🔒 Security semanal (Domingo 3am)
                        </button>
                        <button class="btn btn-primary" onclick="EngineeringDashboard.scheduleQuick('pre-deploy')">
                            🚀 Pre-Deploy (Ejecutar antes de deploy)
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderScheduledJobs() {
        // TODO: Cargar desde backend
        const scheduledJobs = [
            {
                id: 'job-1',
                name: 'Suite Completo Diario',
                processes: ['all'],
                schedule: '0 2 * * *', // Cron: 2am todos los días
                nextRun: new Date(Date.now() + 86400000),
                active: true
            }
        ];

        if (scheduledJobs.length === 0) {
            return '<p class="empty-state">No hay ejecuciones programadas</p>';
        }

        return `
            <div class="jobs-list">
                ${scheduledJobs.map(job => `
                    <div class="job-card ${job.active ? 'active' : 'inactive'}">
                        <div class="job-header">
                            <div class="job-name">${job.name}</div>
                            <div class="job-toggle">
                                <label class="switch">
                                    <input type="checkbox" ${job.active ? 'checked' : ''}
                                           onchange="EngineeringDashboard.toggleJob('${job.id}')">
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                        <div class="job-details">
                            <div class="job-schedule">
                                <span class="label">Próxima ejecución:</span>
                                <span class="value">${new Date(job.nextRun).toLocaleString()}</span>
                            </div>
                            <div class="job-processes">
                                <span class="label">Procesos:</span>
                                <span class="value">${job.processes.join(', ')}</span>
                            </div>
                        </div>
                        <div class="job-actions">
                            <button class="btn btn-sm btn-primary"
                                    onclick="EngineeringDashboard.runJobNow('${job.id}')">
                                <i class="fas fa-play"></i>
                                Ejecutar Ahora
                            </button>
                            <button class="btn btn-sm btn-secondary"
                                    onclick="EngineeringDashboard.editJob('${job.id}')">
                                <i class="fas fa-edit"></i>
                                Editar
                            </button>
                            <button class="btn btn-sm btn-danger"
                                    onclick="EngineeringDashboard.deleteJob('${job.id}')">
                                <i class="fas fa-trash"></i>
                                Eliminar
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // ========================================================================
    // EVENT HANDLERS & ACTIONS
    // ========================================================================
    switchTab(tab) {
        this.state.currentTab = tab;
        this.render();
    },

    toggleProcess(processId) {
        const process = this.state.processes.find(p => p.id === processId);
        if (process) {
            process.selected = !process.selected;
            this.render();
        }
    },

    togglePhases(processId) {
        const phasesElement = document.getElementById(`phases-${processId}`);
        if (phasesElement) {
            phasesElement.style.display = phasesElement.style.display === 'none' ? 'block' : 'none';
        }
    },

    async runSelectedProcesses() {
        const selectedProcesses = this.state.processes.filter(p => p.selected);

        if (selectedProcesses.length === 0) {
            this.showToast('⚠️ Selecciona al menos un proceso', 'warning');
            return;
        }

        this.showToast(`🚀 Iniciando ejecución de ${selectedProcesses.length} procesos...`, 'info');

        try {
            const response = await fetch('/api/e2e-advanced/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    processes: selectedProcesses.map(p => p.id),
                    mode: 'custom'
                })
            });

            const data = await response.json();
            this.showToast(`✅ Ejecución iniciada: ${data.execution_id}`, 'success');
        } catch (error) {
            console.error('Error ejecutando procesos:', error);
            this.showToast('❌ Error al iniciar ejecución', 'error');
        }
    },

    async runFullSuite() {
        this.showToast('🚀 Iniciando Suite Completo (7 procesos)...', 'info');

        try {
            const response = await fetch('/api/e2e-advanced/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'full' })
            });

            const data = await response.json();
            this.showToast(`✅ Suite completo iniciado: ${data.execution_id}`, 'success');
        } catch (error) {
            console.error('Error ejecutando suite:', error);
            this.showToast('❌ Error al iniciar suite completo', 'error');
        }
    },

    async runSingleProcess(processId) {
        this.showToast(`🚀 Iniciando proceso: ${processId}...`, 'info');

        try {
            const response = await fetch('/api/e2e-advanced/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    processes: [processId],
                    mode: 'single'
                })
            });

            const data = await response.json();
            this.showToast(`✅ Proceso iniciado: ${data.execution_id}`, 'success');
        } catch (error) {
            console.error('Error ejecutando proceso:', error);
            this.showToast('❌ Error al iniciar proceso', 'error');
        }
    },

    filterTickets() {
        const priority = document.getElementById('filter-priority')?.value || 'all';
        const status = document.getElementById('filter-status')?.value || 'all';
        const module = document.getElementById('filter-module')?.value || 'all';

        this.state.filters = { ...this.state.filters, priority, status, module };
        this.loadTickets();
    },

    async retryAutoRepair(ticketId) {
        this.showToast(`🔄 Reintentando auto-reparación del ticket ${ticketId}...`, 'info');

        try {
            const response = await fetch(`/api/brain/tickets/${ticketId}/retry-repair`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.showToast('✅ Auto-reparación iniciada', 'success');
                // Recargar tickets para ver el cambio de status
                await this.loadTickets();
            } else {
                this.showToast(`⚠️ ${data.message || 'No se pudo iniciar auto-reparación'}`, 'warning');
            }
        } catch (error) {
            console.error('❌ Error retry auto-repair:', error);
            this.showToast('❌ Error al reintentar auto-reparación', 'error');
        }
    },

    async exportToClaudeCode(ticketId) {
        this.showToast(`📝 Generando prompt de Claude Code para ticket ${ticketId}...`, 'info');

        try {
            // Usar el endpoint backend que genera el prompt completo
            const response = await fetch(`/api/brain/tickets/${ticketId}/export-claude-code`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error generando prompt');
            }

            const prompt = data.data.prompt;
            const filename = data.data.filename;

            // Copiar al portapapeles
            await navigator.clipboard.writeText(prompt);
            this.showToast('✅ Prompt copiado al portapapeles', 'success');

            // También descargar como archivo
            const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showToast('📥 Archivo descargado: claude-code-' + ticketId + '.md', 'info');
        } catch (error) {
            console.error('Error exportando prompt:', error);
            this.showToast('❌ Error al exportar prompt', 'error');
        }
    },

    async markAsResolved(ticketId) {
        try {
            const response = await fetch(`/api/brain/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'resolved',
                    addTimelineEntry: {
                        action: 'manually_resolved',
                        details: {
                            resolvedBy: 'user_manual_action',
                            timestamp: new Date().toISOString()
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.showToast('✅ Ticket marcado como resuelto', 'success');
                await this.loadTickets();
            } else {
                throw new Error(data.message || 'Error desconocido');
            }
        } catch (error) {
            console.error('❌ Error marking ticket as resolved:', error);
            this.showToast('❌ Error al marcar ticket como resuelto', 'error');
        }
    },

    viewTicketDetails(ticketId) {
        const ticket = this.state.tickets.find(t => t.id === ticketId);

        if (!ticket) {
            this.showToast('❌ Ticket no encontrado', 'error');
            return;
        }

        // Mostrar modal con detalles completos
        const modalHTML = `
            <div class="modal-overlay" onclick="EngineeringDashboard.closeModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>🎫 Detalles del Ticket</h3>
                        <button class="btn-close" onclick="EngineeringDashboard.closeModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="ticket-detail-section">
                            <h4>Información General</h4>
                            <p><strong>ID:</strong> ${ticket.id}</p>
                            <p><strong>Título:</strong> ${ticket.title}</p>
                            <p><strong>Prioridad:</strong> ${ticket.priority}</p>
                            <p><strong>Estado:</strong> ${ticket.status}</p>
                            <p><strong>Creado:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
                        </div>

                        <div class="ticket-detail-section">
                            <h4>Detalles Técnicos</h4>
                            <p><strong>Módulo:</strong> ${ticket.technical?.module || 'N/A'}</p>
                            <p><strong>Tipo de Error:</strong> ${ticket.technical?.errorType || 'N/A'}</p>
                            <p><strong>Mensaje:</strong></p>
                            <pre>${ticket.technical?.errorMessage || 'N/A'}</pre>
                        </div>

                        ${ticket.technical?.aiDiagnosis ? `
                            <div class="ticket-detail-section">
                                <h4>🧠 Diagnóstico IA</h4>
                                <p><strong>Root Cause:</strong> ${ticket.technical.aiDiagnosis.rootCause}</p>
                                <p><strong>Suggested Fix:</strong> ${ticket.technical.aiDiagnosis.suggestedFix}</p>
                                <p><strong>Confidence:</strong> ${(ticket.technical.aiDiagnosis.confidence * 100).toFixed(1)}%</p>
                            </div>
                        ` : ''}

                        ${ticket.technical?.codeSnippet ? `
                            <div class="ticket-detail-section">
                                <h4>📝 Código (Context)</h4>
                                <pre><code>${ticket.technical.codeSnippet}</code></pre>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="EngineeringDashboard.closeModal()">
                            Cerrar
                        </button>
                        <button class="btn btn-success" onclick="EngineeringDashboard.exportToClaudeCode('${ticket.id}')">
                            📤 Exportar para Claude Code
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('engineering-modals').innerHTML = modalHTML;
    },

    closeModal() {
        document.getElementById('engineering-modals').innerHTML = '';
    },

    viewProcessDetails(processId) {
        const process = this.state.processes.find(p => p.id === processId);
        // TODO: Implementar modal de detalles del proceso
        console.log('View process details:', process);
    },

    viewExecutionDetails(executionId) {
        // TODO: Implementar modal de detalles de ejecución
        console.log('View execution details:', executionId);
    },

    compareWithBaseline(executionId) {
        // TODO: Implementar comparación con baseline
        console.log('Compare with baseline:', executionId);
    },

    showScheduleModal() {
        // TODO: Implementar modal de programación
        console.log('Show schedule modal');
    },

    scheduleQuick(preset) {
        // TODO: Implementar programación rápida
        console.log('Schedule quick:', preset);
        this.showToast(`⏰ Programando: ${preset}...`, 'info');
    },

    toggleJob(jobId) {
        // TODO: Implementar toggle de job
        console.log('Toggle job:', jobId);
    },

    runJobNow(jobId) {
        // TODO: Implementar ejecución inmediata de job
        console.log('Run job now:', jobId);
    },

    editJob(jobId) {
        // TODO: Implementar edición de job
        console.log('Edit job:', jobId);
    },

    deleteJob(jobId) {
        // TODO: Implementar eliminación de job
        console.log('Delete job:', jobId);
    },

    toggleAutoRefresh() {
        this.state.autoRefresh = !this.state.autoRefresh;

        if (this.state.autoRefresh) {
            this.setupAutoRefresh();
            this.showToast('✅ Auto-refresh activado', 'success');
        } else {
            if (this.state.refreshInterval) {
                clearInterval(this.state.refreshInterval);
            }
            this.showToast('⏸️ Auto-refresh desactivado', 'info');
        }

        this.render();
    },

    showToast(message, type = 'info') {
        const colors = {
            info: '#17a2b8',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545'
        };

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 4px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s;
        `;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    updateTicketsView() {
        if (this.state.currentTab === 'tickets') {
            const ticketsList = document.getElementById('tickets-list');
            if (ticketsList) {
                ticketsList.innerHTML = this.state.tickets.map(ticket =>
                    this.renderTicketCard(ticket)
                ).join('');
            }
        }
    },

    updateExecutionsView() {
        if (this.state.currentTab === 'executions') {
            this.render();
        }
    },

    updateExecutionProgress(data) {
        // TODO: Actualizar progress bar en tiempo real
        console.log('Update execution progress:', data);
    },

    filterExecutions() {
        // TODO: Implementar filtro de ejecuciones
        console.log('Filter executions');
    },

    attachEventListeners() {
        // Attach any additional event listeners if needed
        console.log('✅ Event listeners attached');
    }
};

// ============================================================================
// ESTILOS CSS (CONTINUACIÓN CON NUEVOS COMPONENTES)
// ============================================================================
const engineeringStyles = `
<style>
.engineering-dashboard {
    padding: 20px;
    max-width: 1400px;
    margin: 0 auto;
}

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid #e0e0e0;
}

.dashboard-header h2 {
    margin: 0;
    color: #333;
}

.header-actions {
    display: flex;
    gap: 10px;
}

.dashboard-tabs {
    display: flex;
    gap: 5px;
    margin-bottom: 20px;
    border-bottom: 2px solid #e0e0e0;
}

.dashboard-tabs .tab {
    padding: 12px 20px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-weight: 500;
    color: #666;
    border-bottom: 3px solid transparent;
    transition: all 0.3s;
    position: relative;
}

.dashboard-tabs .tab:hover {
    background: #f5f5f5;
    color: #333;
}

.dashboard-tabs .tab.active {
    color: #007bff;
    border-bottom-color: #007bff;
}

.dashboard-tabs .tab .badge {
    position: absolute;
    top: 5px;
    right: 5px;
    background: #dc3545;
    color: white;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 11px;
}

/* STATS GRID */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.stat-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-card.success {
    border-left: 4px solid #28a745;
}

.stat-card.warning {
    border-left: 4px solid #ffc107;
}

.stat-card.danger {
    border-left: 4px solid #dc3545;
}

.stat-icon {
    font-size: 48px;
    margin-bottom: 10px;
}

.stat-value {
    font-size: 36px;
    font-weight: bold;
    color: #333;
    margin-bottom: 5px;
}

.stat-label {
    color: #666;
    font-size: 14px;
    margin-bottom: 10px;
}

.stat-status {
    font-size: 13px;
    color: #888;
}

/* PROCESSES GRID */
.processes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.process-card {
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    transition: all 0.3s;
}

.process-card.selected {
    border-color: #007bff;
    box-shadow: 0 4px 8px rgba(0,123,255,0.2);
}

.process-card.disabled {
    opacity: 0.6;
    pointer-events: none;
}

.process-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 15px;
}

.process-title {
    display: flex;
    align-items: center;
    gap: 10px;
}

.process-title input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
}

.process-description {
    color: #666;
    font-size: 14px;
    margin-bottom: 15px;
}

.process-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 15px;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 4px;
}

.meta-item {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
}

.meta-label {
    color: #666;
    font-weight: 500;
}

.meta-value {
    color: #333;
}

.process-dependencies {
    margin-bottom: 15px;
    padding: 10px;
    background: #fff3cd;
    border-radius: 4px;
    font-size: 13px;
}

.dependency-badge {
    display: inline-block;
    background: #ffc107;
    color: #333;
    padding: 2px 8px;
    border-radius: 4px;
    margin-left: 5px;
    font-size: 12px;
}

.process-phases {
    margin-bottom: 15px;
}

.phases-list {
    margin-top: 10px;
    border-left: 3px solid #007bff;
    padding-left: 15px;
}

.phase-item {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid #e0e0e0;
}

.phase-item:last-child {
    border-bottom: none;
}

.phase-number {
    width: 30px;
    height: 30px;
    background: #007bff;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    flex-shrink: 0;
}

.phase-details {
    flex: 1;
}

.phase-name {
    font-weight: 600;
    color: #333;
    margin-bottom: 5px;
}

.phase-description {
    font-size: 13px;
    color: #666;
    margin-bottom: 5px;
}

.phase-meta {
    font-size: 12px;
    color: #888;
}

.phase-commands {
    margin-top: 10px;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 4px;
}

.phase-commands ul {
    margin: 5px 0 0 0;
    padding-left: 20px;
}

.phase-commands code {
    font-size: 12px;
    color: #d63384;
}

.process-actions {
    display: flex;
    gap: 10px;
}

.processes-actions {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 30px;
}

/* CONFIDENCE BREAKDOWN */
.confidence-breakdown {
    margin-top: 20px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
}

.confidence-phase {
    margin-bottom: 15px;
}

.phase-name {
    font-weight: 600;
    margin-bottom: 5px;
}

.phase-bar {
    height: 24px;
    background: #e9ecef;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 5px;
}

.phase-fill {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 12px;
    font-weight: bold;
    transition: width 0.5s;
}

.score-excellent {
    background: linear-gradient(90deg, #28a745, #20c997);
}

.score-good {
    background: linear-gradient(90deg, #17a2b8, #20c997);
}

.score-warning {
    background: linear-gradient(90deg, #ffc107, #fd7e14);
}

.score-danger {
    background: linear-gradient(90deg, #dc3545, #e83e8c);
}

.phase-contribution {
    font-size: 12px;
    color: #666;
}

/* BUTTONS */
.btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s;
}

.btn-sm {
    padding: 5px 10px;
    font-size: 12px;
}

.btn-lg {
    padding: 12px 24px;
    font-size: 16px;
}

.btn-primary {
    background: #007bff;
    color: white;
}

.btn-primary:hover {
    background: #0056b3;
}

.btn-success {
    background: #28a745;
    color: white;
}

.btn-success:hover {
    background: #1e7e34;
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-secondary:hover {
    background: #545b62;
}

.btn-info {
    background: #17a2b8;
    color: white;
}

.btn-info:hover {
    background: #117a8b;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-danger {
    background: #dc3545;
    color: white;
}

.btn-danger:hover {
    background: #bd2130;
}

/* TICKETS TAB */
.tickets-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.tickets-filters {
    display: flex;
    gap: 10px;
}

.tickets-filters select {
    padding: 8px 12px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 14px;
}

.tickets-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
    margin-bottom: 30px;
}

.ticket-stat {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 15px;
    text-align: center;
}

.stat-number {
    font-size: 32px;
    font-weight: bold;
    margin-bottom: 5px;
}

.stat-number.success {
    color: #28a745;
}

.stat-number.warning {
    color: #ffc107;
}

.stat-number.info {
    color: #17a2b8;
}

.stat-label {
    color: #666;
    font-size: 13px;
}

.tickets-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.ticket-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-left: 4px solid #6c757d;
    border-radius: 8px;
    padding: 20px;
    transition: all 0.3s;
}

.ticket-card.priority-critical {
    border-left-color: #dc3545;
}

.ticket-card.priority-high {
    border-left-color: #ffc107;
}

.ticket-card.priority-medium {
    border-left-color: #17a2b8;
}

.ticket-card.priority-low {
    border-left-color: #28a745;
}

.ticket-card:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.ticket-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.ticket-id-badge {
    display: flex;
    gap: 10px;
    align-items: center;
}

.ticket-id {
    font-family: monospace;
    font-size: 12px;
    color: #666;
}

.ticket-priority, .ticket-status {
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
}

.badge-danger {
    background: #dc3545;
    color: white;
}

.badge-warning {
    background: #ffc107;
    color: #333;
}

.badge-info {
    background: #17a2b8;
    color: white;
}

.badge-success {
    background: #28a745;
    color: white;
}

.ticket-date {
    color: #888;
    font-size: 13px;
}

.ticket-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 10px;
}

.ticket-meta {
    display: flex;
    gap: 20px;
    margin-bottom: 15px;
    font-size: 13px;
    color: #666;
}

.auto-resolution-section {
    background: #f8f9fa;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 15px;
}

.auto-resolution-header {
    font-weight: 600;
    margin-bottom: 10px;
    color: #495057;
}

.auto-resolution-timeline {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.timeline-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    background: white;
    border-radius: 4px;
}

.timeline-item.active {
    background: #fff3cd;
    border-left: 3px solid #ffc107;
}

.timeline-item.small {
    font-size: 12px;
    padding: 5px 8px;
}

.timeline-icon {
    font-size: 16px;
}

.timeline-icon.spinner {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.timeline-time {
    color: #6c757d;
    font-size: 11px;
    min-width: 60px;
}

.timeline-text {
    color: #495057;
    flex: 1;
}

.auto-repair-progress {
    margin-top: 10px;
}

.progress-bar {
    height: 20px;
    background: #e9ecef;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 5px;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #17a2b8, #28a745);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 11px;
    font-weight: bold;
    transition: width 0.3s;
}

.progress-text {
    font-size: 12px;
    color: #6c757d;
    text-align: center;
}

.ticket-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #6c757d;
    font-size: 16px;
}

/* EXECUTIONS TAB */
.executions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.executions-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.execution-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-left: 4px solid #6c757d;
    border-radius: 8px;
    padding: 20px;
}

.execution-card.passed {
    border-left-color: #28a745;
}

.execution-card.failed {
    border-left-color: #dc3545;
}

.execution-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.execution-id {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.execution-number {
    font-family: monospace;
    font-weight: 600;
    color: #333;
}

.execution-date {
    font-size: 12px;
    color: #888;
}

.execution-score {
    font-size: 36px;
    font-weight: bold;
}

.execution-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 15px;
}

.detail-item {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 4px;
}

.detail-label {
    color: #666;
    font-size: 13px;
}

.detail-value {
    color: #333;
    font-weight: 500;
    font-size: 13px;
}

.execution-actions {
    display: flex;
    gap: 10px;
}

/* SCHEDULER TAB */
.scheduler-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.jobs-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: 30px;
}

.job-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
}

.job-card.active {
    border-left: 4px solid #28a745;
}

.job-card.inactive {
    border-left: 4px solid #6c757d;
    opacity: 0.7;
}

.job-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.job-name {
    font-size: 16px;
    font-weight: 600;
    color: #333;
}

.job-toggle .switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 24px;
}

.job-toggle .switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.job-toggle .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 24px;
}

.job-toggle .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
}

.job-toggle input:checked + .slider {
    background-color: #28a745;
}

.job-toggle input:checked + .slider:before {
    transform: translateX(26px);
}

.job-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 15px;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 4px;
}

.job-schedule, .job-processes {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
}

.job-actions {
    display: flex;
    gap: 8px;
}

.quick-schedule {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
}

.quick-schedule h4 {
    margin-bottom: 15px;
}

.quick-schedule-buttons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 10px;
}

/* MODALS */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.modal-content {
    background: white;
    border-radius: 8px;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
    margin: 0;
}

.btn-close {
    background: none;
    border: none;
    font-size: 28px;
    color: #666;
    cursor: pointer;
    line-height: 1;
}

.btn-close:hover {
    color: #333;
}

.modal-body {
    padding: 20px;
}

.ticket-detail-section {
    margin-bottom: 20px;
}

.ticket-detail-section h4 {
    margin-bottom: 10px;
    color: #333;
}

.ticket-detail-section p {
    margin: 5px 0;
}

.ticket-detail-section pre {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 13px;
    max-height: 300px;
    overflow-y: auto;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 20px;
    border-top: 1px solid #e0e0e0;
}

/* ANIMATIONS */
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOut {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

/* LAST EXECUTION CARD */
.last-execution-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
}

.last-execution-card h3 {
    margin-bottom: 15px;
}

.execution-details {
    margin-bottom: 20px;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
}

.detail-row:last-child {
    border-bottom: none;
}

/* CRITICAL TICKETS ALERT */
.critical-tickets-alert {
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 8px;
    padding: 20px;
}

.critical-tickets-alert h3 {
    color: #856404;
    margin-bottom: 15px;
}

.critical-tickets-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.critical-ticket-item {
    background: white;
    padding: 15px;
    border-radius: 4px;
    border-left: 4px solid #dc3545;
}

.critical-ticket-item .ticket-title {
    font-weight: 600;
    margin-bottom: 8px;
}

.critical-ticket-item .ticket-meta {
    font-size: 12px;
    color: #666;
    margin-bottom: 10px;
}

/* PROCESSES HEADER */
.processes-header {
    margin-bottom: 20px;
}

.processes-header h3 {
    margin-bottom: 5px;
}

.processes-header .subtitle {
    color: #666;
    font-size: 14px;
}
</style>
`;

// Inyectar estilos
document.head.insertAdjacentHTML('beforeend', engineeringStyles);

// Exportar globalmente
window.EngineeringDashboard = EngineeringDashboard;
