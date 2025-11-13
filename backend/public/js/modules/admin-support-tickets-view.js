/**
 * Admin Support Tickets View Module
 *
 * Purpose: Vendor/Admin interface for managing assigned support tickets from clients
 * Features:
 * - Kanban board / List / Calendar views
 * - Ticket details panel with chat
 * - SLA monitoring with real-time countdown
 * - Filters and search
 * - Real-time updates via WebSocket (if available)
 * - Quick actions and canned responses
 * - Escalation and assignment management
 *
 * @version 1.0.0
 * @date 2025-01-30
 */

console.log('🎫 [SUPPORT-ADMIN] Admin Support Tickets View Module v1.0.0 loaded');

class AdminSupportTicketsView {
    constructor() {
        this.tickets = [];
        this.filteredTickets = [];
        this.currentTicket = null;
        this.messages = [];
        this.vendors = [];
        this.companies = [];
        this.modules = [];
        this.ws = null;

        // View mode
        this.viewMode = 'kanban'; // 'kanban', 'list', 'calendar'

        // Filters
        this.filters = {
            status: 'all',
            priority: 'all',
            company: 'all',
            assignedTo: 'me',
            dateRange: 'all',
            module: 'all',
            search: ''
        };

        // Status definitions
        this.statuses = [
            { value: 'pending', label: 'Pendiente', color: '#ff9800', icon: '⏳' },
            { value: 'in_progress', label: 'En Progreso', color: '#2196f3', icon: '🔧' },
            { value: 'waiting_client', label: 'Esperando Cliente', color: '#9c27b0', icon: '⏰' },
            { value: 'resolved', label: 'Resuelto', color: '#4caf50', icon: '✅' },
            { value: 'escalated', label: 'Escalado', color: '#f44336', icon: '🚨' }
        ];

        // Priority definitions
        this.priorities = [
            { value: 'low', label: 'Baja', color: '#9e9e9e', icon: '🟢' },
            { value: 'medium', label: 'Media', color: '#ff9800', icon: '🟡' },
            { value: 'high', label: 'Alta', color: '#f44336', icon: '🔴' },
            { value: 'urgent', label: 'Urgente', color: '#d32f2f', icon: '🚨' }
        ];

        // Canned responses (quick reply templates)
        this.cannedResponses = [
            { id: 1, title: 'Saludo inicial', text: 'Hola, gracias por contactarnos. Estoy revisando tu ticket y te responderé a la brevedad.' },
            { id: 2, title: 'Solicitar más info', text: '¿Podrías proporcionarme más información sobre el problema? Por ejemplo:\n- ¿Qué pasos seguiste antes del error?\n- ¿Hay algún mensaje de error específico?\n- ¿Cuándo ocurrió por primera vez?' },
            { id: 3, title: 'En proceso', text: 'Estoy trabajando en tu solicitud. Te mantendré informado sobre el progreso.' },
            { id: 4, title: 'Necesita pruebas', text: 'He implementado una solución. ¿Podrías probar y confirmarme si el problema está resuelto?' },
            { id: 5, title: 'Problema resuelto', text: 'El problema ha sido resuelto. Si tienes alguna otra consulta, no dudes en contactarnos.' }
        ];

        // SLA intervals
        this.slaUpdateInterval = null;
    }

    /**
     * Initialize the module
     */
    async init() {
        console.log('🎫 [SUPPORT-ADMIN] Initializing...');
        await this.loadVendorAssignments();
        await this.loadCompanies();
        await this.loadModules();
        await this.loadTickets();
        this.setupWebSocket();
        this.setupEventListeners();
        this.renderTicketList();
        this.startSLAMonitoring();
        console.log('✅ [SUPPORT-ADMIN] Initialized successfully');
    }

    /**
     * Load vendor assignments (for multi-vendor support)
     */
    async loadVendorAssignments() {
        try {
            const token = this.getAuthToken();
            const response = await fetch('/api/support/v2/vendors', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.vendors = data.vendors || [];
                console.log(`✅ [SUPPORT-ADMIN] Loaded ${this.vendors.length} vendors`);
            }
        } catch (error) {
            console.warn('⚠️ [SUPPORT-ADMIN] Could not load vendors:', error);
            this.vendors = [];
        }
    }

    /**
     * Load companies
     */
    async loadCompanies() {
        try {
            const token = this.getAuthToken();
            const response = await fetch('/api/v1/companies', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.companies = data.companies || [];
                console.log(`✅ [SUPPORT-ADMIN] Loaded ${this.companies.length} companies`);
            }
        } catch (error) {
            console.warn('⚠️ [SUPPORT-ADMIN] Could not load companies:', error);
            this.companies = [];
        }
    }

    /**
     * Load modules
     */
    async loadModules() {
        try {
            const token = this.getAuthToken();
            const response = await fetch('/api/support/v2/modules', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.modules = data.modules || [];
            }
        } catch (error) {
            console.warn('⚠️ [SUPPORT-ADMIN] Could not load modules:', error);
            this.modules = [];
        }
    }

    /**
     * Load tickets
     */
    async loadTickets() {
        try {
            const token = this.getAuthToken();
            const vendorId = localStorage.getItem('vendor_id') || '';

            // Build query params
            const params = new URLSearchParams();
            if (this.filters.status !== 'all') params.append('status', this.filters.status);
            if (this.filters.priority !== 'all') params.append('priority', this.filters.priority);
            if (this.filters.company !== 'all') params.append('company_id', this.filters.company);
            if (this.filters.module !== 'all') params.append('module_id', this.filters.module);

            const url = vendorId ?
                `/api/support/v2/vendor/${vendorId}/tickets?${params.toString()}` :
                `/api/support/v2/tickets?${params.toString()}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.tickets = data.tickets || [];
            this.applyFilters();

            console.log(`✅ [SUPPORT-ADMIN] Loaded ${this.tickets.length} tickets`);
        } catch (error) {
            console.error('❌ [SUPPORT-ADMIN] Error loading tickets:', error);
            this.showNotification('Error cargando tickets: ' + error.message, 'error');
            this.tickets = [];
        }
    }

    /**
     * Apply filters
     */
    applyFilters() {
        let filtered = [...this.tickets];

        // Search filter
        if (this.filters.search) {
            const searchLower = this.filters.search.toLowerCase();
            filtered = filtered.filter(t =>
                t.ticket_number?.toLowerCase().includes(searchLower) ||
                t.subject?.toLowerCase().includes(searchLower) ||
                t.company_name?.toLowerCase().includes(searchLower)
            );
        }

        // Status filter
        if (this.filters.status !== 'all') {
            filtered = filtered.filter(t => t.status === this.filters.status);
        }

        // Priority filter
        if (this.filters.priority !== 'all') {
            filtered = filtered.filter(t => t.priority === this.filters.priority);
        }

        // Company filter
        if (this.filters.company !== 'all') {
            filtered = filtered.filter(t => t.company_id == this.filters.company);
        }

        // Module filter
        if (this.filters.module !== 'all') {
            filtered = filtered.filter(t => t.module_id == this.filters.module);
        }

        // Date range filter
        if (this.filters.dateRange !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            filtered = filtered.filter(t => {
                const ticketDate = new Date(t.created_at);
                switch (this.filters.dateRange) {
                    case 'today':
                        return ticketDate >= today;
                    case 'week':
                        const weekAgo = new Date(today);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return ticketDate >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(today);
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        return ticketDate >= monthAgo;
                    default:
                        return true;
                }
            });
        }

        this.filteredTickets = filtered;
    }

    /**
     * Render ticket list (based on view mode)
     */
    renderTicketList() {
        const container = document.getElementById('tickets-view-container');
        if (!container) {
            console.warn('⚠️ [SUPPORT-ADMIN] Tickets container not found');
            return;
        }

        switch (this.viewMode) {
            case 'kanban':
                this.renderKanbanView(container);
                break;
            case 'list':
                this.renderListView(container);
                break;
            case 'calendar':
                this.renderCalendarView(container);
                break;
            default:
                this.renderKanbanView(container);
        }
    }

    /**
     * Render Kanban board view
     */
    renderKanbanView(container) {
        const statusColumns = this.statuses.filter(s => s.value !== 'escalated'); // Escalated shown separately

        let html = `
            <div style="display: flex; gap: 20px; overflow-x: auto; padding: 20px 0;">
        `;

        statusColumns.forEach(status => {
            const columnTickets = this.filteredTickets.filter(t => t.status === status.value);

            html += `
                <div class="kanban-column" style="min-width: 320px; flex: 1; background: #f5f5f5; border-radius: 12px; padding: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4 style="margin: 0; color: ${status.color};">
                            ${status.icon} ${status.label}
                        </h4>
                        <span style="background: ${status.color}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                            ${columnTickets.length}
                        </span>
                    </div>
                    <div class="kanban-cards" style="display: flex; flex-direction: column; gap: 12px; max-height: 600px; overflow-y: auto;">
            `;

            if (columnTickets.length === 0) {
                html += `
                    <div style="padding: 30px; text-align: center; color: #999; background: white; border-radius: 8px; border: 2px dashed #ddd;">
                        No hay tickets en este estado
                    </div>
                `;
            } else {
                columnTickets.forEach(ticket => {
                    const priorityInfo = this.priorities.find(p => p.value === ticket.priority);
                    const slaStatus = this.calculateSLAStatus(ticket);

                    html += `
                        <div class="ticket-card" style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; border-left: 4px solid ${priorityInfo.color};"
                             onclick="adminTickets.openTicketDetails(${ticket.id})">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                                <div style="font-weight: bold; color: #333; font-size: 14px; flex: 1;">
                                    #${ticket.ticket_number}
                                </div>
                                <span style="background: ${priorityInfo.color}; color: white; padding: 2px 8px; border-radius: 8px; font-size: 10px; white-space: nowrap;">
                                    ${priorityInfo.icon} ${priorityInfo.label}
                                </span>
                            </div>

                            <div style="font-size: 13px; color: #333; margin-bottom: 8px; font-weight: 500;">
                                ${ticket.subject}
                            </div>

                            <div style="font-size: 11px; color: #666; margin-bottom: 8px;">
                                🏢 ${ticket.company_name || 'N/A'}
                            </div>

                            ${slaStatus.breached ?
                                `<div style="background: #ffebee; border-left: 3px solid #f44336; padding: 6px 10px; margin-bottom: 8px; border-radius: 4px;">
                                    <div style="font-size: 10px; font-weight: bold; color: #c62828;">
                                        ⚠️ SLA VENCIDO
                                    </div>
                                    <div style="font-size: 10px; color: #666;">
                                        ${slaStatus.overdue}
                                    </div>
                                </div>` :
                                `<div style="font-size: 10px; color: ${slaStatus.urgency === 'critical' ? '#f44336' : slaStatus.urgency === 'warning' ? '#ff9800' : '#4caf50'}; font-weight: bold;">
                                    ⏱️ SLA: ${slaStatus.remaining}
                                </div>`
                            }

                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                                <div style="font-size: 10px; color: #999;">
                                    ${this.formatDate(ticket.created_at)}
                                </div>
                                ${ticket.unread_messages > 0 ?
                                    `<span style="background: #f44336; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px;">
                                        💬 ${ticket.unread_messages}
                                    </span>` : ''
                                }
                            </div>
                        </div>
                    `;
                });
            }

            html += `
                    </div>
                </div>
            `;
        });

        html += `</div>`;

        container.innerHTML = html;
    }

    /**
     * Render list view
     */
    renderListView(container) {
        if (this.filteredTickets.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🎫</div>
                    <h3>No hay tickets</h3>
                    <p>No se encontraron tickets con los filtros aplicados.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div style="overflow-x: auto;">
                <table class="users-table" style="width: 100%; border-collapse: collapse;">
                    <thead class="table-dark">
                        <tr>
                            <th>🎫 Ticket #</th>
                            <th>📝 Asunto</th>
                            <th>🏢 Empresa</th>
                            <th style="text-align: center;">🚨 Prioridad</th>
                            <th style="text-align: center;">📊 Estado</th>
                            <th>👤 Asignado</th>
                            <th>📅 Creado</th>
                            <th style="text-align: center;">⏱️ SLA</th>
                            <th style="text-align: center;">⚙️ Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.filteredTickets.forEach(ticket => {
            const statusInfo = this.statuses.find(s => s.value === ticket.status);
            const priorityInfo = this.priorities.find(p => p.value === ticket.priority);
            const slaStatus = this.calculateSLAStatus(ticket);

            html += `
                <tr style="cursor: pointer;" onclick="adminTickets.openTicketDetails(${ticket.id})">
                    <td style="font-weight: bold; font-family: monospace;">
                        #${ticket.ticket_number}
                    </td>
                    <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${ticket.subject}
                    </td>
                    <td>
                        ${ticket.company_name || 'N/A'}
                    </td>
                    <td style="text-align: center;">
                        <span style="background: ${priorityInfo.color}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px;">
                            ${priorityInfo.icon} ${priorityInfo.label}
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <span style="background: ${statusInfo.color}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px;">
                            ${statusInfo.icon} ${statusInfo.label}
                        </span>
                    </td>
                    <td style="font-size: 12px;">
                        ${ticket.assigned_to_name || 'Sin asignar'}
                    </td>
                    <td style="font-size: 12px;">
                        ${this.formatDate(ticket.created_at)}
                    </td>
                    <td style="text-align: center;">
                        <span style="color: ${slaStatus.urgency === 'critical' ? '#f44336' : slaStatus.urgency === 'warning' ? '#ff9800' : '#4caf50'}; font-weight: bold; font-size: 12px;">
                            ${slaStatus.breached ? '⚠️ VENCIDO' : slaStatus.remaining}
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <button class="btn-mini btn-info" onclick="event.stopPropagation(); adminTickets.openTicketDetails(${ticket.id})" title="Ver detalles">👁️</button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Render calendar view (placeholder)
     */
    renderCalendarView(container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px;">📅</div>
                <h3>Vista de Calendario</h3>
                <p style="color: #666;">La vista de calendario estará disponible próximamente.</p>
                <button class="btn btn-primary" onclick="adminTickets.setViewMode('kanban')">
                    Volver a Kanban
                </button>
            </div>
        `;
    }

    /**
     * Open ticket details panel
     */
    async openTicketDetails(ticketId) {
        this.currentTicket = this.tickets.find(t => t.id === ticketId);
        if (!this.currentTicket) {
            this.showNotification('Ticket no encontrado', 'error');
            return;
        }

        // Load messages
        await this.loadMessages(ticketId);

        // Render modal
        this.renderTicketDetailsModal();
    }

    /**
     * Load messages for ticket
     */
    async loadMessages(ticketId) {
        try {
            const token = this.getAuthToken();
            const response = await fetch(`/api/support/v2/tickets/${ticketId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.messages = data.messages || [];
                console.log(`✅ [SUPPORT-ADMIN] Loaded ${this.messages.length} messages`);
            }
        } catch (error) {
            console.error('❌ [SUPPORT-ADMIN] Error loading messages:', error);
            this.messages = [];
        }
    }

    /**
     * Render ticket details modal
     */
    renderTicketDetailsModal() {
        const ticket = this.currentTicket;
        if (!ticket) return;

        const statusInfo = this.statuses.find(s => s.value === ticket.status);
        const priorityInfo = this.priorities.find(p => p.value === ticket.priority);
        const slaStatus = this.calculateSLAStatus(ticket);

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;';

        modal.innerHTML = `
            <div class="modal-content" style="background: white; padding: 0; border-radius: 15px; width: 95%; max-width: 1200px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
                <!-- Header -->
                <div style="padding: 20px 30px; border-bottom: 1px solid #ddd; background: #f8f9fa;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; color: #333;">🎫 Ticket #${ticket.ticket_number}</h2>
                            <div style="margin-top: 5px; font-size: 14px; color: #666;">
                                ${ticket.subject}
                            </div>
                        </div>
                        <button onclick="adminTickets.closeModal()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #999;">✖️</button>
                    </div>
                </div>

                <!-- Body -->
                <div style="display: flex; flex: 1; overflow: hidden;">
                    <!-- Left sidebar: Ticket Info -->
                    <div style="width: 320px; border-right: 1px solid #ddd; overflow-y: auto; padding: 20px; background: #f8f9fa;">
                        <h4 style="margin-top: 0;">📋 Información</h4>

                        <div style="margin-bottom: 15px;">
                            <label style="font-size: 12px; color: #666; display: block; margin-bottom: 5px;">Estado</label>
                            <select id="ticketStatus" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; background: ${statusInfo.color}; color: white; font-weight: bold;"
                                    onchange="adminTickets.updateTicketStatus(${ticket.id}, this.value)">
                                ${this.statuses.map(s => `
                                    <option value="${s.value}" ${ticket.status === s.value ? 'selected' : ''}>
                                        ${s.icon} ${s.label}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="font-size: 12px; color: #666; display: block; margin-bottom: 5px;">Prioridad</label>
                            <div style="background: ${priorityInfo.color}; color: white; padding: 8px 12px; border-radius: 6px; text-align: center; font-weight: bold;">
                                ${priorityInfo.icon} ${priorityInfo.label}
                            </div>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="font-size: 12px; color: #666; display: block; margin-bottom: 5px;">SLA</label>
                            <div style="padding: 10px; background: ${slaStatus.breached ? '#ffebee' : slaStatus.urgency === 'critical' ? '#fff3e0' : '#e8f5e9'}; border-radius: 6px;">
                                <div style="font-weight: bold; color: ${slaStatus.breached ? '#f44336' : slaStatus.urgency === 'critical' ? '#ff9800' : '#4caf50'};">
                                    ${slaStatus.breached ? '⚠️ VENCIDO' : `⏱️ ${slaStatus.remaining}`}
                                </div>
                                ${slaStatus.breached ?
                                    `<div style="font-size: 11px; color: #666; margin-top: 5px;">
                                        Hace ${slaStatus.overdue}
                                    </div>` : ''
                                }
                            </div>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="font-size: 12px; color: #666; display: block; margin-bottom: 5px;">Empresa</label>
                            <div style="font-weight: 500;">
                                🏢 ${ticket.company_name || 'N/A'}
                            </div>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="font-size: 12px; color: #666; display: block; margin-bottom: 5px;">Módulo</label>
                            <div style="font-weight: 500;">
                                📦 ${ticket.module_name || 'General'}
                            </div>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="font-size: 12px; color: #666; display: block; margin-bottom: 5px;">Asignado a</label>
                            <select id="assignedTo" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;"
                                    onchange="adminTickets.reassignTicket(${ticket.id}, this.value)">
                                <option value="">Sin asignar</option>
                                ${this.vendors.map(v => `
                                    <option value="${v.id}" ${ticket.assigned_to_vendor_id == v.id ? 'selected' : ''}>
                                        ${v.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="font-size: 12px; color: #666; display: block; margin-bottom: 5px;">Creado</label>
                            <div style="font-size: 13px;">
                                📅 ${this.formatDate(ticket.created_at)}
                            </div>
                        </div>

                        <hr style="margin: 20px 0;">

                        <h4>⚡ Acciones Rápidas</h4>

                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <button class="btn btn-warning btn-sm" onclick="adminTickets.escalateTicket(${ticket.id})">
                                🚨 Escalar
                            </button>
                            <button class="btn btn-success btn-sm" onclick="adminTickets.markAsResolved(${ticket.id})">
                                ✅ Marcar Resuelto
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="adminTickets.addInternalNote(${ticket.id})">
                                📝 Nota Interna
                            </button>
                        </div>
                    </div>

                    <!-- Right: Chat -->
                    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                        <!-- Messages -->
                        <div id="chatMessages" style="flex: 1; overflow-y: auto; padding: 20px; background: #fff;">
                            ${this.renderMessages()}
                        </div>

                        <!-- Message input -->
                        <div style="border-top: 1px solid #ddd; padding: 20px; background: #f8f9fa;">
                            <!-- Canned responses -->
                            <div style="margin-bottom: 10px;">
                                <select id="cannedResponse" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;"
                                        onchange="adminTickets.applyCannedResponse(this.value)">
                                    <option value="">💬 Respuestas rápidas...</option>
                                    ${this.cannedResponses.map(r => `
                                        <option value="${r.id}">${r.title}</option>
                                    `).join('')}
                                </select>
                            </div>

                            <form id="messageForm" onsubmit="adminTickets.sendMessage(event, ${ticket.id})">
                                <div style="display: flex; gap: 10px;">
                                    <textarea id="messageText" style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; resize: none; font-family: Arial;"
                                              rows="3" placeholder="Escribe tu mensaje..." required></textarea>
                                    <button type="submit" class="btn btn-primary" style="align-self: flex-end;">
                                        📤 Enviar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Auto-scroll to latest message
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    /**
     * Render messages
     */
    renderMessages() {
        if (this.messages.length === 0) {
            return `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 15px;">💬</div>
                    <p>No hay mensajes aún</p>
                </div>
            `;
        }

        let html = '';

        this.messages.forEach(msg => {
            const isVendor = msg.sender_type === 'vendor';
            const alignment = isVendor ? 'flex-end' : 'flex-start';
            const bgColor = isVendor ? '#e3f2fd' : '#f5f5f5';
            const textColor = '#333';

            html += `
                <div style="display: flex; justify-content: ${alignment}; margin-bottom: 15px;">
                    <div style="max-width: 70%; background: ${bgColor}; padding: 12px 16px; border-radius: 12px;">
                        <div style="font-weight: bold; font-size: 12px; color: #666; margin-bottom: 5px;">
                            ${isVendor ? '👤 ' + (msg.sender_name || 'Soporte') : '🏢 ' + (msg.sender_name || 'Cliente')}
                        </div>
                        <div style="color: ${textColor}; white-space: pre-wrap; word-wrap: break-word;">
                            ${msg.message}
                        </div>
                        <div style="font-size: 11px; color: #999; margin-top: 8px; text-align: right;">
                            ${this.formatDate(msg.created_at)}
                        </div>
                    </div>
                </div>
            `;
        });

        return html;
    }

    /**
     * Send message
     */
    async sendMessage(event, ticketId) {
        event.preventDefault();

        const messageText = document.getElementById('messageText').value.trim();
        if (!messageText) return;

        try {
            const token = this.getAuthToken();
            const response = await fetch('/api/support/v2/messages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ticket_id: ticketId,
                    message: messageText,
                    sender_type: 'vendor'
                })
            });

            if (!response.ok) throw new Error('Error enviando mensaje');

            const result = await response.json();

            // Add message to list
            this.messages.push(result.message);

            // Re-render messages
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.innerHTML = this.renderMessages();
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            // Clear input
            document.getElementById('messageText').value = '';
            document.getElementById('cannedResponse').value = '';

            this.showNotification('Mensaje enviado', 'success');

        } catch (error) {
            console.error('❌ [SUPPORT-ADMIN] Error sending message:', error);
            this.showNotification('Error enviando mensaje', 'error');
        }
    }

    /**
     * Apply canned response
     */
    applyCannedResponse(responseId) {
        if (!responseId) return;

        const response = this.cannedResponses.find(r => r.id == responseId);
        if (!response) return;

        const messageText = document.getElementById('messageText');
        if (messageText) {
            messageText.value = response.text;
            messageText.focus();
        }
    }

    /**
     * Update ticket status
     */
    async updateTicketStatus(ticketId, newStatus) {
        try {
            const token = this.getAuthToken();
            const response = await fetch(`/api/support/v2/tickets/${ticketId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) throw new Error('Error actualizando estado');

            this.showNotification('Estado actualizado', 'success');

            // Reload tickets
            await this.loadTickets();
            this.renderTicketList();

        } catch (error) {
            console.error('❌ [SUPPORT-ADMIN] Error updating status:', error);
            this.showNotification('Error actualizando estado', 'error');
        }
    }

    /**
     * Reassign ticket
     */
    async reassignTicket(ticketId, vendorId) {
        try {
            const token = this.getAuthToken();
            const response = await fetch(`/api/support/v2/tickets/${ticketId}/assign`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vendor_id: vendorId })
            });

            if (!response.ok) throw new Error('Error reasignando ticket');

            this.showNotification('Ticket reasignado', 'success');

        } catch (error) {
            console.error('❌ [SUPPORT-ADMIN] Error reassigning:', error);
            this.showNotification('Error reasignando ticket', 'error');
        }
    }

    /**
     * Escalate ticket
     */
    async escalateTicket(ticketId) {
        const reason = prompt('Motivo de la escalación:');
        if (!reason) return;

        try {
            const token = this.getAuthToken();
            const response = await fetch(`/api/support/v2/tickets/${ticketId}/escalate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ escalation_reason: reason })
            });

            if (!response.ok) throw new Error('Error escalando ticket');

            this.showNotification('Ticket escalado exitosamente', 'success');
            this.closeModal();
            await this.loadTickets();
            this.renderTicketList();

        } catch (error) {
            console.error('❌ [SUPPORT-ADMIN] Error escalating:', error);
            this.showNotification('Error escalando ticket', 'error');
        }
    }

    /**
     * Mark as resolved
     */
    async markAsResolved(ticketId) {
        const resolution = prompt('Nota de resolución (opcional):');

        try {
            const token = this.getAuthToken();
            const response = await fetch(`/api/support/v2/tickets/${ticketId}/resolve`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'resolved',
                    resolution_note: resolution
                })
            });

            if (!response.ok) throw new Error('Error marcando como resuelto');

            this.showNotification('Ticket marcado como resuelto', 'success');
            this.closeModal();
            await this.loadTickets();
            this.renderTicketList();

        } catch (error) {
            console.error('❌ [SUPPORT-ADMIN] Error resolving:', error);
            this.showNotification('Error marcando como resuelto', 'error');
        }
    }

    /**
     * Add internal note
     */
    async addInternalNote(ticketId) {
        const note = prompt('Nota interna (solo visible para el equipo de soporte):');
        if (!note) return;

        // For now, just show confirmation
        // In production, this would save to a separate notes table
        this.showNotification('Nota interna agregada', 'success');
    }

    /**
     * Calculate SLA status
     */
    calculateSLAStatus(ticket) {
        // Default SLA: 24 hours for normal, 4 hours for urgent
        const slaHours = ticket.priority === 'urgent' ? 4 : 24;
        const slaMs = slaHours * 60 * 60 * 1000;

        const createdAt = new Date(ticket.created_at);
        const now = new Date();
        const elapsed = now - createdAt;
        const remaining = slaMs - elapsed;

        if (remaining <= 0) {
            // SLA breached
            const overdueMs = Math.abs(remaining);
            return {
                breached: true,
                overdue: this.formatDuration(overdueMs),
                urgency: 'critical'
            };
        }

        // SLA not breached
        const remainingStr = this.formatDuration(remaining);

        let urgency = 'ok';
        if (remaining < 1 * 60 * 60 * 1000) {
            urgency = 'critical'; // Less than 1 hour
        } else if (remaining < 4 * 60 * 60 * 1000) {
            urgency = 'warning'; // Less than 4 hours
        }

        return {
            breached: false,
            remaining: remainingStr,
            urgency
        };
    }

    /**
     * Format duration
     */
    formatDuration(ms) {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    /**
     * Start SLA monitoring
     */
    startSLAMonitoring() {
        // Update SLA timers every minute
        if (this.slaUpdateInterval) {
            clearInterval(this.slaUpdateInterval);
        }

        this.slaUpdateInterval = setInterval(() => {
            if (this.viewMode === 'kanban' || this.viewMode === 'list') {
                this.renderTicketList();
            }
        }, 60000); // Update every minute
    }

    /**
     * Setup WebSocket for real-time updates
     */
    setupWebSocket() {
        try {
            const token = this.getAuthToken();
            if (!token) return;

            // Check if WebSocket is supported
            if (typeof WebSocket === 'undefined') {
                console.warn('⚠️ [SUPPORT-ADMIN] WebSocket not supported');
                return;
            }

            const wsUrl = `ws://${window.location.host}/ws/support?token=${token}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('✅ [SUPPORT-ADMIN] WebSocket connected');
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.ws.onerror = (error) => {
                console.warn('⚠️ [SUPPORT-ADMIN] WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.log('🔌 [SUPPORT-ADMIN] WebSocket disconnected');
                // Attempt reconnection after 5 seconds
                setTimeout(() => this.setupWebSocket(), 5000);
            };

        } catch (error) {
            console.warn('⚠️ [SUPPORT-ADMIN] Could not setup WebSocket:', error);
        }
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'new_ticket':
                this.handleNewTicket(data.ticket);
                break;
            case 'new_message':
                this.handleNewMessage(data.message);
                break;
            case 'status_changed':
                this.handleStatusChange(data.ticket);
                break;
            case 'escalated':
                this.handleEscalation(data.ticket);
                break;
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }

    handleNewTicket(ticket) {
        this.showNotification(`🎫 Nuevo ticket: #${ticket.ticket_number}`, 'info');
        this.loadTickets();
    }

    handleNewMessage(message) {
        if (this.currentTicket && message.ticket_id === this.currentTicket.id) {
            this.messages.push(message);
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.innerHTML = this.renderMessages();
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
        this.showNotification('💬 Nuevo mensaje recibido', 'info');
    }

    handleStatusChange(ticket) {
        this.loadTickets();
    }

    handleEscalation(ticket) {
        this.showNotification(`🚨 Ticket #${ticket.ticket_number} escalado`, 'warning');
        this.loadTickets();
    }

    /**
     * Set view mode
     */
    setViewMode(mode) {
        this.viewMode = mode;
        this.renderTicketList();

        // Update view mode buttons
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-view="${mode}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search filter
        const searchInput = document.getElementById('ticket-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.applyFilters();
                this.renderTicketList();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('ticket-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.applyFilters();
                this.renderTicketList();
            });
        }

        // Priority filter
        const priorityFilter = document.getElementById('ticket-priority-filter');
        if (priorityFilter) {
            priorityFilter.addEventListener('change', (e) => {
                this.filters.priority = e.target.value;
                this.applyFilters();
                this.renderTicketList();
            });
        }

        // Company filter
        const companyFilter = document.getElementById('ticket-company-filter');
        if (companyFilter) {
            companyFilter.addEventListener('change', (e) => {
                this.filters.company = e.target.value;
                this.applyFilters();
                this.renderTicketList();
            });
        }
    }

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
        this.currentTicket = null;
        this.messages = [];
    }

    /**
     * Get auth token
     */
    getAuthToken() {
        return localStorage.getItem('authToken') ||
               localStorage.getItem('adminToken') ||
               sessionStorage.getItem('authToken') ||
               '';
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10002;
            font-weight: 500;
            max-width: 400px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transition = 'opacity 0.3s';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Format date
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        // If less than 24 hours, show relative time
        if (diff < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (hours > 0) {
                return `Hace ${hours}h ${minutes}m`;
            } else {
                return `Hace ${minutes}m`;
            }
        }

        // Otherwise show date
        return date.toLocaleDateString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Initialize global instance
const adminTickets = new AdminSupportTicketsView();

// Make it available globally
window.adminTickets = adminTickets;

console.log('✅ [SUPPORT-ADMIN] Module loaded successfully');
