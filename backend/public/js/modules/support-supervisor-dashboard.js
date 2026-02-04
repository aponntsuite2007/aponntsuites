/**
 * support-supervisor-dashboard.js
 * Dashboard para Supervisores de Soporte APONNT
 *
 * Características:
 * - Vista de todos los tickets de soporte
 * - Métricas SLA en tiempo real
 * - Tiempos de respuesta y resolución
 * - Asignación de tickets
 * - Escalamientos
 *
 * Solo visible para: SOPORTE, GERENCIA
 */

const SupportSupervisorDashboard = {
    // Estado
    _initialized: false,
    _tickets: [],
    _stats: null,
    _filters: {
        status: '',
        priority: '',
        assignee: '',
        search: ''
    },
    _apiBase: '/api/aponnt/dashboard',

    /**
     * Inicializa el dashboard
     */
    async init() {
        if (this._initialized) return;

        console.log('[SupportDashboard] Inicializando...');

        try {
            // Cargar datos iniciales en paralelo
            await Promise.all([
                this._loadStats(),
                this._loadTickets()
            ]);

            this._initialized = true;
            console.log('[SupportDashboard] Inicializado correctamente');

        } catch (error) {
            console.error('[SupportDashboard] Error de inicialización:', error);
        }
    },

    /**
     * Renderiza el dashboard completo de soporte
     */
    render() {
        return `
            <div class="support-dashboard">
                <!-- Header Stats -->
                ${this._renderStatsCards()}

                <!-- Tickets Section -->
                <div class="section-container" style="margin-top: 24px;">
                    <div class="section-header">
                        <div>
                            <h2>Tickets de Soporte</h2>
                            <p class="section-subtitle">Gestión y seguimiento de tickets</p>
                        </div>
                        <div class="section-actions">
                            <button class="btn btn-secondary" onclick="SupportSupervisorDashboard.exportTickets()">
                                <i class="fas fa-download"></i> Exportar
                            </button>
                            <button class="btn btn-primary" onclick="SupportSupervisorDashboard.refreshData()">
                                <i class="fas fa-sync-alt"></i> Actualizar
                            </button>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="filter-bar">
                        <input type="text"
                               id="ticket-search"
                               class="search-input"
                               placeholder="Buscar por ID, empresa o descripción..."
                               onkeyup="SupportSupervisorDashboard.handleSearch(event)">

                        <select id="filter-status" class="filter-select" onchange="SupportSupervisorDashboard.applyFilters()">
                            <option value="">Todos los estados</option>
                            <option value="open">Abierto</option>
                            <option value="in_progress">En Progreso</option>
                            <option value="waiting_customer">Esperando Cliente</option>
                            <option value="resolved">Resuelto</option>
                            <option value="closed">Cerrado</option>
                        </select>

                        <select id="filter-priority" class="filter-select" onchange="SupportSupervisorDashboard.applyFilters()">
                            <option value="">Todas las prioridades</option>
                            <option value="critical">Crítica</option>
                            <option value="high">Alta</option>
                            <option value="medium">Media</option>
                            <option value="low">Baja</option>
                        </select>

                        <select id="filter-assignee" class="filter-select" onchange="SupportSupervisorDashboard.applyFilters()">
                            <option value="">Todos los agentes</option>
                            <option value="unassigned">Sin asignar</option>
                            <!-- Se llena dinámicamente -->
                        </select>
                    </div>

                    <!-- Tickets Table -->
                    <div class="table-container" id="tickets-table">
                        ${this._renderTicketsTable()}
                    </div>
                </div>

                <!-- SLA Metrics Section -->
                <div class="section-container" style="margin-top: 24px;">
                    <div class="section-header">
                        <div>
                            <h2>Métricas SLA</h2>
                            <p class="section-subtitle">Cumplimiento de niveles de servicio</p>
                        </div>
                    </div>
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3>Cumplimiento SLA por Prioridad</h3>
                            <div id="sla-compliance-chart">
                                ${this._renderSLAComplianceChart()}
                            </div>
                        </div>
                        <div class="chart-card">
                            <h3>Tiempos Promedio de Respuesta</h3>
                            <div id="response-time-chart">
                                ${this._renderResponseTimeChart()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza las tarjetas de estadísticas
     */
    _renderStatsCards() {
        const stats = this._stats || {
            open: 0,
            inProgress: 0,
            resolved: 0,
            avgResponseTime: '0h',
            slaCompliance: 0
        };

        return `
            <div class="stats-row">
                <div class="stat-card stat-warning">
                    <span class="stat-label">Abiertos</span>
                    <span class="stat-value">${stats.open}</span>
                </div>
                <div class="stat-card" style="border-left: 4px solid #3b82f6;">
                    <span class="stat-label">En Progreso</span>
                    <span class="stat-value">${stats.inProgress}</span>
                </div>
                <div class="stat-card stat-success">
                    <span class="stat-label">Resueltos (Mes)</span>
                    <span class="stat-value">${stats.resolved}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Tiempo Resp. Prom.</span>
                    <span class="stat-value">${stats.avgResponseTime}</span>
                </div>
                <div class="stat-card ${stats.slaCompliance >= 90 ? 'stat-success' : stats.slaCompliance >= 70 ? 'stat-warning' : 'stat-danger'}">
                    <span class="stat-label">Cumplimiento SLA</span>
                    <span class="stat-value">${stats.slaCompliance}%</span>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza la tabla de tickets
     */
    _renderTicketsTable() {
        const filteredTickets = this._filterTickets();

        if (filteredTickets.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-ticket-alt"></i>
                    <h3>No hay tickets</h3>
                    <p>No se encontraron tickets con los filtros seleccionados</p>
                </div>
            `;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Empresa</th>
                        <th>Asunto</th>
                        <th>Prioridad</th>
                        <th>Estado</th>
                        <th>Asignado</th>
                        <th>SLA</th>
                        <th>Creado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredTickets.map(ticket => this._renderTicketRow(ticket)).join('')}
                </tbody>
            </table>
        `;
    },

    /**
     * Renderiza una fila de ticket
     */
    _renderTicketRow(ticket) {
        const priorityClasses = {
            critical: 'priority-critical',
            high: 'priority-high',
            medium: 'priority-medium',
            low: 'priority-low'
        };

        const statusLabels = {
            open: 'Abierto',
            in_progress: 'En Progreso',
            waiting_customer: 'Esperando',
            resolved: 'Resuelto',
            closed: 'Cerrado'
        };

        const priorityLabels = {
            critical: 'Crítica',
            high: 'Alta',
            medium: 'Media',
            low: 'Baja'
        };

        const slaStatus = this._getSLAStatus(ticket);

        return `
            <tr class="ticket-row" data-id="${ticket.id}">
                <td>
                    <a href="#" onclick="SupportSupervisorDashboard.viewTicket(${ticket.id}); return false;">
                        #${ticket.id}
                    </a>
                </td>
                <td>${ticket.company_name || 'N/A'}</td>
                <td class="ticket-subject">${this._truncate(ticket.subject, 40)}</td>
                <td>
                    <span class="priority-badge ${priorityClasses[ticket.priority] || ''}">
                        ${priorityLabels[ticket.priority] || ticket.priority}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${ticket.status}">
                        ${statusLabels[ticket.status] || ticket.status}
                    </span>
                </td>
                <td>${ticket.assigned_to_name || '<span class="unassigned">Sin asignar</span>'}</td>
                <td>
                    <span class="sla-indicator sla-${slaStatus.status}" title="${slaStatus.tooltip}">
                        ${slaStatus.icon} ${slaStatus.text}
                    </span>
                </td>
                <td>${this._formatDate(ticket.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="SupportSupervisorDashboard.viewTicket(${ticket.id})" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="SupportSupervisorDashboard.assignTicket(${ticket.id})" title="Asignar">
                            <i class="fas fa-user-plus"></i>
                        </button>
                        ${ticket.priority === 'critical' || ticket.priority === 'high' ? `
                            <button class="btn-icon btn-danger" onclick="SupportSupervisorDashboard.escalateTicket(${ticket.id})" title="Escalar">
                                <i class="fas fa-arrow-up"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    },

    /**
     * Renderiza el gráfico de cumplimiento SLA
     */
    _renderSLAComplianceChart() {
        // Datos de ejemplo - en producción vendrían del backend
        const data = [
            { priority: 'Crítica', compliance: 85, target: 95 },
            { priority: 'Alta', compliance: 92, target: 90 },
            { priority: 'Media', compliance: 95, target: 85 },
            { priority: 'Baja', compliance: 98, target: 80 }
        ];

        return `
            <div class="sla-chart">
                ${data.map(item => `
                    <div class="sla-bar-container">
                        <div class="sla-bar-label">${item.priority}</div>
                        <div class="sla-bar-wrapper">
                            <div class="sla-bar ${item.compliance >= item.target ? 'sla-ok' : 'sla-warning'}"
                                 style="width: ${item.compliance}%">
                                <span>${item.compliance}%</span>
                            </div>
                            <div class="sla-target" style="left: ${item.target}%" title="Objetivo: ${item.target}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Renderiza el gráfico de tiempos de respuesta
     */
    _renderResponseTimeChart() {
        // Datos de ejemplo
        const data = [
            { label: 'Primera Respuesta', current: '2.5h', target: '4h', status: 'ok' },
            { label: 'Resolución Crítica', current: '6h', target: '8h', status: 'ok' },
            { label: 'Resolución Alta', current: '18h', target: '24h', status: 'ok' },
            { label: 'Resolución Media', current: '52h', target: '48h', status: 'warning' }
        ];

        return `
            <div class="response-time-list">
                ${data.map(item => `
                    <div class="response-time-item">
                        <div class="response-time-label">${item.label}</div>
                        <div class="response-time-values">
                            <span class="current-time ${item.status}">${item.current}</span>
                            <span class="target-time">/ ${item.target}</span>
                        </div>
                        <span class="status-indicator ${item.status}">
                            ${item.status === 'ok' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-triangle"></i>'}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Carga estadísticas del servidor
     */
    async _loadStats() {
        try {
            const token = window.getMultiKeyToken();
            const response = await fetch(`${this._apiBase}/support/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this._stats = data.data;
                }
            }
        } catch (error) {
            console.error('[SupportDashboard] Error cargando stats:', error);
            // Usar datos de ejemplo
            this._stats = {
                open: 12,
                inProgress: 8,
                resolved: 45,
                avgResponseTime: '3.2h',
                slaCompliance: 89
            };
        }
    },

    /**
     * Carga tickets del servidor
     */
    async _loadTickets() {
        try {
            const token = window.getMultiKeyToken();
            const response = await fetch(`${this._apiBase}/support/tickets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this._tickets = data.data || [];
                }
            }
        } catch (error) {
            console.error('[SupportDashboard] Error cargando tickets:', error);
            // Datos de ejemplo para desarrollo
            this._tickets = this._getMockTickets();
        }
    },

    /**
     * Filtra tickets según los filtros activos
     */
    _filterTickets() {
        return this._tickets.filter(ticket => {
            if (this._filters.status && ticket.status !== this._filters.status) return false;
            if (this._filters.priority && ticket.priority !== this._filters.priority) return false;
            if (this._filters.assignee === 'unassigned' && ticket.assigned_to) return false;
            if (this._filters.assignee && this._filters.assignee !== 'unassigned' &&
                ticket.assigned_to != this._filters.assignee) return false;
            if (this._filters.search) {
                const search = this._filters.search.toLowerCase();
                return ticket.id.toString().includes(search) ||
                       (ticket.subject || '').toLowerCase().includes(search) ||
                       (ticket.company_name || '').toLowerCase().includes(search);
            }
            return true;
        });
    },

    /**
     * Aplica filtros y re-renderiza
     */
    applyFilters() {
        this._filters.status = document.getElementById('filter-status')?.value || '';
        this._filters.priority = document.getElementById('filter-priority')?.value || '';
        this._filters.assignee = document.getElementById('filter-assignee')?.value || '';

        const tableContainer = document.getElementById('tickets-table');
        if (tableContainer) {
            tableContainer.innerHTML = this._renderTicketsTable();
        }
    },

    /**
     * Maneja búsqueda con debounce
     */
    handleSearch(event) {
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => {
            this._filters.search = event.target.value;
            this.applyFilters();
        }, 300);
    },

    /**
     * Refresca datos
     */
    async refreshData() {
        await Promise.all([
            this._loadStats(),
            this._loadTickets()
        ]);

        // Re-renderizar todo
        const container = document.querySelector('.support-dashboard');
        if (container) {
            container.innerHTML = this.render();
        }
    },

    /**
     * Ver detalles de ticket
     */
    viewTicket(ticketId) {
        console.log('[SupportDashboard] Ver ticket:', ticketId);
        alert(`Ver ticket #${ticketId} - Modal por implementar`);
    },

    /**
     * Asignar ticket
     */
    assignTicket(ticketId) {
        console.log('[SupportDashboard] Asignar ticket:', ticketId);
        alert(`Asignar ticket #${ticketId} - Modal por implementar`);
    },

    /**
     * Escalar ticket
     */
    escalateTicket(ticketId) {
        console.log('[SupportDashboard] Escalar ticket:', ticketId);
        alert(`Escalar ticket #${ticketId} - Modal por implementar`);
    },

    /**
     * Exportar tickets
     */
    exportTickets() {
        console.log('[SupportDashboard] Exportar tickets');
        alert('Exportación de tickets - Por implementar');
    },

    /**
     * Obtiene estado SLA de un ticket
     */
    _getSLAStatus(ticket) {
        // Lógica simplificada - en producción calcularía basado en tiempos reales
        const hoursOpen = Math.floor((Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60));
        const slaLimits = { critical: 8, high: 24, medium: 48, low: 72 };
        const limit = slaLimits[ticket.priority] || 48;
        const percentage = Math.min(100, Math.round((hoursOpen / limit) * 100));

        if (ticket.status === 'resolved' || ticket.status === 'closed') {
            return { status: 'ok', icon: '✓', text: 'OK', tooltip: 'Resuelto dentro del SLA' };
        }
        if (percentage >= 100) {
            return { status: 'breached', icon: '⚠', text: 'Vencido', tooltip: `SLA vencido por ${hoursOpen - limit}h` };
        }
        if (percentage >= 75) {
            return { status: 'warning', icon: '⏱', text: `${100 - percentage}%`, tooltip: 'Próximo a vencer' };
        }
        return { status: 'ok', icon: '✓', text: `${100 - percentage}%`, tooltip: 'Dentro del SLA' };
    },

    /**
     * Formatea fecha
     */
    _formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    },

    /**
     * Trunca texto
     */
    _truncate(text, length) {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    },

    /**
     * Datos mock para desarrollo
     */
    _getMockTickets() {
        return [
            { id: 1001, company_name: 'Empresa ABC', subject: 'Error al generar reportes de asistencia', priority: 'high', status: 'open', assigned_to: null, assigned_to_name: null, created_at: new Date(Date.now() - 2*60*60*1000).toISOString() },
            { id: 1002, company_name: 'Tech Solutions', subject: 'Problema con reconocimiento facial', priority: 'critical', status: 'in_progress', assigned_to: 1, assigned_to_name: 'Juan Pérez', created_at: new Date(Date.now() - 5*60*60*1000).toISOString() },
            { id: 1003, company_name: 'Industrias XYZ', subject: 'Consulta sobre configuración de turnos', priority: 'low', status: 'waiting_customer', assigned_to: 2, assigned_to_name: 'María García', created_at: new Date(Date.now() - 24*60*60*1000).toISOString() },
            { id: 1004, company_name: 'Comercial 123', subject: 'No puedo agregar nuevos empleados', priority: 'medium', status: 'open', assigned_to: null, assigned_to_name: null, created_at: new Date(Date.now() - 8*60*60*1000).toISOString() },
            { id: 1005, company_name: 'Servicios Pro', subject: 'Integración con sistema de nómina', priority: 'high', status: 'resolved', assigned_to: 1, assigned_to_name: 'Juan Pérez', created_at: new Date(Date.now() - 72*60*60*1000).toISOString() }
        ];
    }
};

// Exportar
window.SupportSupervisorDashboard = SupportSupervisorDashboard;

// Estilos específicos del dashboard de soporte
const supportStyles = document.createElement('style');
supportStyles.textContent = `
    /* Priority badges */
    .priority-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
    }

    .priority-critical {
        background: rgba(239, 68, 68, 0.2);
        color: #fca5a5;
        animation: pulse-critical 2s infinite;
    }

    .priority-high {
        background: rgba(245, 158, 11, 0.2);
        color: #fcd34d;
    }

    .priority-medium {
        background: rgba(59, 130, 246, 0.2);
        color: #93c5fd;
    }

    .priority-low {
        background: rgba(34, 197, 94, 0.2);
        color: #86efac;
    }

    @keyframes pulse-critical {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }

    /* Status badges */
    .status-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .status-open { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
    .status-in_progress { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .status-waiting_customer { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; }
    .status-resolved { background: rgba(34, 197, 94, 0.2); color: #86efac; }
    .status-closed { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }

    /* SLA indicators */
    .sla-indicator {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .sla-ok { color: #86efac; }
    .sla-warning { color: #fcd34d; }
    .sla-breached { color: #fca5a5; }

    /* SLA Chart */
    .sla-chart {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px 0;
    }

    .sla-bar-container {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .sla-bar-label {
        width: 80px;
        font-size: 0.875rem;
        color: var(--text-secondary);
    }

    .sla-bar-wrapper {
        flex: 1;
        height: 24px;
        background: var(--dark-bg-primary);
        border-radius: 12px;
        position: relative;
        overflow: hidden;
    }

    .sla-bar {
        height: 100%;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding-right: 8px;
        transition: width 0.5s ease;
    }

    .sla-bar span {
        font-size: 0.75rem;
        font-weight: 600;
        color: #000;
    }

    .sla-bar.sla-ok { background: linear-gradient(90deg, #22c55e, #16a34a); }
    .sla-bar.sla-warning { background: linear-gradient(90deg, #f59e0b, #d97706); }

    .sla-target {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 3px;
        background: #fff;
        opacity: 0.7;
    }

    /* Response Time List */
    .response-time-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px 0;
    }

    .response-time-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--dark-bg-primary);
        border-radius: 8px;
    }

    .response-time-label {
        flex: 1;
        font-size: 0.875rem;
    }

    .response-time-values {
        display: flex;
        align-items: baseline;
        gap: 4px;
    }

    .current-time {
        font-size: 1.125rem;
        font-weight: 600;
    }

    .current-time.ok { color: #86efac; }
    .current-time.warning { color: #fcd34d; }

    .target-time {
        font-size: 0.75rem;
        color: var(--text-secondary);
    }

    .status-indicator {
        font-size: 1rem;
    }

    .status-indicator.ok { color: #22c55e; }
    .status-indicator.warning { color: #f59e0b; }

    /* Action buttons */
    .action-buttons {
        display: flex;
        gap: 4px;
    }

    .btn-icon {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .btn-icon:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary);
    }

    .btn-icon.btn-danger:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #fca5a5;
    }

    /* Unassigned label */
    .unassigned {
        color: var(--text-secondary);
        font-style: italic;
    }

    /* Ticket subject link */
    .ticket-subject {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* Empty state */
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px;
        color: var(--text-secondary);
        text-align: center;
    }

    .empty-state i {
        font-size: 3rem;
        margin-bottom: 16px;
        opacity: 0.5;
    }

    .empty-state h3 {
        margin: 0;
        color: var(--text-primary);
    }

    .empty-state p {
        margin: 8px 0 0 0;
    }
`;
document.head.appendChild(supportStyles);
