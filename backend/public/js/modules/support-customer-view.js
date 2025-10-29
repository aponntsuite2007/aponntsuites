/**
 * MÓDULO: Vista de Cliente - Sistema de Soporte
 *
 * Permite a clientes:
 * - Crear tickets de soporte
 * - Ver sus tickets
 * - Chatear con soporte
 * - Evaluar soporte recibido
 *
 * @version 2.0.0
 * @date 2025-01-23
 */

const SupportCustomerView = {
  currentTicket: null,
  tickets: [],
  modules: [],

  /**
   * Inicializar vista
   */
  async init(containerIdOrElement) {
    console.log('🎫 [SUPPORT-CUSTOMER] Inicializando vista de cliente...');

    const container = typeof containerIdOrElement === 'string'
      ? document.getElementById(containerIdOrElement)
      : containerIdOrElement;

    if (!container) {
      console.error('[SUPPORT-CUSTOMER] Container not found');
      return;
    }

    this.container = container;

    // Renderizar estructura inicial
    this.renderLayout();

    // Cargar datos
    await this.loadTickets();
    await this.loadModules();

    // Setup event listeners
    this.setupEventListeners();

    console.log('✅ [SUPPORT-CUSTOMER] Vista de cliente inicializada');
  },

  /**
   * Renderizar layout principal
   */
  renderLayout() {
    this.container.innerHTML = `
      <div class="support-customer-view">
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 class="mb-1">
              <i class="bi bi-headset me-2"></i>
              Soporte Técnico
            </h4>
            <p class="text-muted mb-0">Gestiona tus tickets de soporte</p>
          </div>
          <button class="btn btn-primary" id="btn-new-ticket">
            <i class="bi bi-plus-circle me-2"></i>
            Nuevo Ticket
          </button>
        </div>

        <!-- Filtros y búsqueda -->
        <div class="card mb-4">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <input type="text" class="form-control" id="search-tickets" placeholder="Buscar tickets...">
              </div>
              <div class="col-md-3">
                <select class="form-select" id="filter-status">
                  <option value="">Todos los estados</option>
                  <option value="open">Abiertos</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="waiting_customer">Esperando mi respuesta</option>
                  <option value="resolved">Resueltos</option>
                  <option value="closed">Cerrados</option>
                </select>
              </div>
              <div class="col-md-3">
                <select class="form-select" id="filter-priority">
                  <option value="">Todas las prioridades</option>
                  <option value="urgent">Urgente</option>
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>
              </div>
              <div class="col-md-2">
                <button class="btn btn-outline-secondary w-100" id="btn-clear-filters">
                  <i class="bi bi-x-circle me-1"></i>
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Lista de tickets -->
        <div class="card">
          <div class="card-header bg-white">
            <h5 class="mb-0">Mis Tickets</h5>
          </div>
          <div class="card-body p-0">
            <div id="tickets-list"></div>
          </div>
        </div>

        <!-- Modal: Nuevo Ticket -->
        <div class="modal fade" id="modal-new-ticket" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="bi bi-plus-circle me-2"></i>
                  Crear Nuevo Ticket de Soporte
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <form id="form-new-ticket">
                  <!-- Módulo -->
                  <div class="mb-3">
                    <label class="form-label">Módulo <span class="text-danger">*</span></label>
                    <select class="form-select" id="ticket-module" required>
                      <option value="">Selecciona el módulo con problemas</option>
                    </select>
                    <div class="form-text">¿En qué módulo del sistema tienes el problema?</div>
                  </div>

                  <!-- Prioridad -->
                  <div class="mb-3">
                    <label class="form-label">Prioridad <span class="text-danger">*</span></label>
                    <select class="form-select" id="ticket-priority" required>
                      <option value="low">Baja - Consulta general</option>
                      <option value="medium" selected>Media - Problema que puedo evitar</option>
                      <option value="high">Alta - Problema que afecta mi trabajo</option>
                      <option value="urgent">Urgente - Sistema bloqueado</option>
                    </select>
                  </div>

                  <!-- Asunto -->
                  <div class="mb-3">
                    <label class="form-label">Asunto <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="ticket-subject"
                           placeholder="Ej: No puedo registrar asistencia"
                           required minlength="5" maxlength="200">
                    <div class="form-text">Breve resumen del problema (mín 5 caracteres)</div>
                  </div>

                  <!-- Descripción -->
                  <div class="mb-3">
                    <label class="form-label">Descripción del problema <span class="text-danger">*</span></label>
                    <textarea class="form-control" id="ticket-description" rows="5"
                              placeholder="Describe el problema con el mayor detalle posible:&#10;- ¿Qué estabas intentando hacer?&#10;- ¿Qué esperabas que pasara?&#10;- ¿Qué pasó en realidad?&#10;- ¿Hay algún mensaje de error?"
                              required minlength="20" maxlength="2000"></textarea>
                    <div class="form-text">Detalla el problema (mín 20 caracteres)</div>
                  </div>

                  <!-- Acceso temporal de soporte -->
                  <div class="mb-3">
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox" id="ticket-allow-access">
                      <label class="form-check-label" for="ticket-allow-access">
                        Autorizar acceso temporal al sistema para soporte técnico
                      </label>
                    </div>
                    <div class="form-text">
                      <i class="bi bi-info-circle me-1"></i>
                      Si autorizas, crearemos un usuario temporal para que el soporte técnico
                      pueda acceder a tu sistema y diagnosticar el problema. Este acceso expira
                      cuando se cierra el ticket.
                    </div>
                  </div>

                  <!-- Botón de Asistente IA (si está disponible) -->
                  <div class="alert alert-info" id="assistant-notice">
                    <i class="bi bi-robot me-2"></i>
                    <strong>Antes de crear el ticket:</strong> Nuestro asistente IA intentará
                    ayudarte a resolver el problema inmediatamente.
                  </div>

                  <div id="form-errors" class="alert alert-danger d-none"></div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" id="btn-submit-ticket">
                  <i class="bi bi-send me-2"></i>
                  Crear Ticket
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal: Ver Ticket (Chat) -->
        <div class="modal fade" id="modal-view-ticket" tabindex="-1">
          <div class="modal-dialog modal-xl">
            <div class="modal-content">
              <div class="modal-header">
                <div>
                  <h5 class="modal-title" id="ticket-title"></h5>
                  <small class="text-muted" id="ticket-subtitle"></small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <div class="row">
                  <!-- Columna izquierda: Info del ticket -->
                  <div class="col-md-4">
                    <div class="card mb-3">
                      <div class="card-header bg-light">
                        <h6 class="mb-0">Información del Ticket</h6>
                      </div>
                      <div class="card-body" id="ticket-info">
                        <!-- Se llena dinámicamente -->
                      </div>
                    </div>

                    <!-- Acciones -->
                    <div class="d-grid gap-2">
                      <button class="btn btn-success" id="btn-close-ticket" style="display: none;">
                        <i class="bi bi-check-circle me-2"></i>
                        Cerrar Ticket
                      </button>
                      <button class="btn btn-warning" id="btn-rate-ticket" style="display: none;">
                        <i class="bi bi-star me-2"></i>
                        Evaluar Soporte
                      </button>
                    </div>
                  </div>

                  <!-- Columna derecha: Chat -->
                  <div class="col-md-8">
                    <div class="card">
                      <div class="card-header bg-light">
                        <h6 class="mb-0">Conversación</h6>
                      </div>
                      <div class="card-body p-0">
                        <div id="chat-messages" style="height: 400px; overflow-y: auto; padding: 1rem;">
                          <!-- Mensajes se cargan aquí -->
                        </div>
                      </div>
                      <div class="card-footer" id="chat-input-container">
                        <form id="form-send-message">
                          <div class="input-group">
                            <textarea class="form-control" id="message-text"
                                     placeholder="Escribe tu mensaje..."
                                     rows="2" required></textarea>
                            <button class="btn btn-primary" type="submit">
                              <i class="bi bi-send"></i>
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal: Evaluar Soporte -->
        <div class="modal fade" id="modal-rate-ticket" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="bi bi-star me-2"></i>
                  Evaluar Soporte Recibido
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <p class="text-muted">¿Cómo fue la atención recibida?</p>

                <!-- Estrellas -->
                <div class="text-center mb-3">
                  <div id="rating-stars"></div>
                </div>

                <!-- Comentario -->
                <div class="mb-3">
                  <label class="form-label">Comentario (opcional)</label>
                  <textarea class="form-control" id="rating-comment" rows="3"
                            placeholder="Cuéntanos tu experiencia..."></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" id="btn-submit-rating">
                  <i class="bi bi-send me-2"></i>
                  Enviar Evaluación
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Botón nuevo ticket
    document.getElementById('btn-new-ticket').addEventListener('click', () => {
      this.showNewTicketModal();
    });

    // Submit nuevo ticket
    document.getElementById('btn-submit-ticket').addEventListener('click', () => {
      this.createTicket();
    });

    // Filtros
    document.getElementById('filter-status').addEventListener('change', () => {
      this.applyFilters();
    });

    document.getElementById('filter-priority').addEventListener('change', () => {
      this.applyFilters();
    });

    document.getElementById('search-tickets').addEventListener('input', (e) => {
      this.searchTickets(e.target.value);
    });

    document.getElementById('btn-clear-filters').addEventListener('click', () => {
      this.clearFilters();
    });

    // Chat: enviar mensaje
    const formSendMessage = document.getElementById('form-send-message');
    if (formSendMessage) {
      formSendMessage.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }

    // Cerrar ticket
    const btnCloseTicket = document.getElementById('btn-close-ticket');
    if (btnCloseTicket) {
      btnCloseTicket.addEventListener('click', () => {
        this.closeTicket();
      });
    }

    // Evaluar ticket
    const btnRateTicket = document.getElementById('btn-rate-ticket');
    if (btnRateTicket) {
      btnRateTicket.addEventListener('click', () => {
        this.showRatingModal();
      });
    }

    // Submit rating
    const btnSubmitRating = document.getElementById('btn-submit-rating');
    if (btnSubmitRating) {
      btnSubmitRating.addEventListener('click', () => {
        this.submitRating();
      });
    }
  },

  /**
   * Cargar tickets del usuario
   */
  async loadTickets() {
    SupportSystem.showLoading('tickets-list');

    try {
      const data = await SupportSystem.listTickets();
      this.tickets = data.tickets || [];
      this.renderTickets();
    } catch (error) {
      SupportSystem.showError('tickets-list', 'Error al cargar tickets: ' + error.message);
    }
  },

  /**
   * Cargar módulos disponibles
   */
  async loadModules() {
    try {
      // TODO: Implementar endpoint que retorne módulos activos de la empresa
      // Por ahora, lista hardcoded
      this.modules = [
        { name: 'users', display_name: 'Gestión de Usuarios' },
        { name: 'attendance', display_name: 'Registro de Asistencia' },
        { name: 'medical_appointments', display_name: 'Citas Médicas' },
        { name: 'vacations', display_name: 'Vacaciones' },
        { name: 'departments', display_name: 'Departamentos' },
        { name: 'kiosks', display_name: 'Kioscos Biométricos' },
        { name: 'reports', display_name: 'Reportes' },
        { name: 'notifications', display_name: 'Notificaciones' },
        { name: 'other', display_name: 'Otro / General' }
      ];
    } catch (error) {
      console.error('Error loading modules:', error);
    }
  },

  /**
   * Renderizar lista de tickets
   */
  renderTickets() {
    const container = document.getElementById('tickets-list');

    if (this.tickets.length === 0) {
      SupportSystem.showEmpty('tickets-list', 'No tienes tickets de soporte', 'inbox');
      return;
    }

    let html = '<div class="list-group list-group-flush">';

    this.tickets.forEach(ticket => {
      const statusBadge = SupportSystem.getStatusBadgeClass(ticket.status);
      const priorityBadge = SupportSystem.getPriorityBadgeClass(ticket.priority);
      const relativeTime = SupportSystem.formatRelativeTime(ticket.created_at);

      html += `
        <a href="#" class="list-group-item list-group-item-action" data-ticket-id="${ticket.ticket_id}">
          <div class="d-flex w-100 justify-content-between align-items-start">
            <div class="flex-grow-1">
              <div class="d-flex align-items-center mb-1">
                <h6 class="mb-0 me-2">${ticket.ticket_number}</h6>
                <span class="${statusBadge}">${SupportSystem.translateStatus(ticket.status)}</span>
                <span class="${priorityBadge} ms-2">${SupportSystem.translatePriority(ticket.priority)}</span>
              </div>
              <p class="mb-1 fw-bold">${ticket.subject}</p>
              <p class="mb-1 text-muted small">${ticket.module_display_name || ticket.module_name}</p>
              ${ticket.assignedVendor ? `
                <p class="mb-0 text-muted small">
                  <i class="bi bi-person me-1"></i>
                  Asignado a: ${ticket.assignedVendor.firstName} ${ticket.assignedVendor.lastName}
                </p>
              ` : ''}
            </div>
            <div class="text-end">
              <small class="text-muted">${relativeTime}</small>
              ${ticket.rating ? `
                <div class="mt-1">
                  ${SupportSystem.renderStars(ticket.rating)}
                </div>
              ` : ''}
            </div>
          </div>
        </a>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Event listeners para abrir tickets
    container.querySelectorAll('[data-ticket-id]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const ticketId = item.dataset.ticketId;
        this.viewTicket(ticketId);
      });
    });
  },

  /**
   * Aplicar filtros
   */
  applyFilters() {
    const status = document.getElementById('filter-status').value;
    const priority = document.getElementById('filter-priority').value;

    let filtered = [...this.tickets];

    if (status) {
      filtered = filtered.filter(t => t.status === status);
    }

    if (priority) {
      filtered = filtered.filter(t => t.priority === priority);
    }

    this.tickets = filtered;
    this.renderTickets();
  },

  /**
   * Buscar tickets
   */
  searchTickets(query) {
    if (!query || query.trim().length === 0) {
      this.loadTickets();
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = this.tickets.filter(t =>
      t.ticket_number.toLowerCase().includes(lowerQuery) ||
      t.subject.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      (t.module_display_name && t.module_display_name.toLowerCase().includes(lowerQuery))
    );

    const temp = this.tickets;
    this.tickets = filtered;
    this.renderTickets();
    this.tickets = temp;
  },

  /**
   * Limpiar filtros
   */
  clearFilters() {
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-priority').value = '';
    document.getElementById('search-tickets').value = '';
    this.loadTickets();
  },

  /**
   * Mostrar modal de nuevo ticket
   */
  showNewTicketModal() {
    // Llenar select de módulos
    const selectModule = document.getElementById('ticket-module');
    selectModule.innerHTML = '<option value="">Selecciona el módulo con problemas</option>';
    this.modules.forEach(mod => {
      selectModule.innerHTML += `<option value="${mod.name}">${mod.display_name}</option>`;
    });

    // Resetear form
    document.getElementById('form-new-ticket').reset();
    document.getElementById('form-errors').classList.add('d-none');

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modal-new-ticket'));
    modal.show();
  },

  /**
   * Crear ticket
   */
  async createTicket() {
    const module_name = document.getElementById('ticket-module').value;
    const module_display_name = this.modules.find(m => m.name === module_name)?.display_name || module_name;
    const priority = document.getElementById('ticket-priority').value;
    const subject = document.getElementById('ticket-subject').value;
    const description = document.getElementById('ticket-description').value;
    const allow_support_access = document.getElementById('ticket-allow-access').checked;

    const ticketData = {
      module_name,
      module_display_name,
      priority,
      subject,
      description,
      allow_support_access,
      user_question: description // Para intento del asistente IA
    };

    // Validar
    const validation = SupportSystem.validateTicketData(ticketData);
    if (!validation.isValid) {
      const errorsDiv = document.getElementById('form-errors');
      errorsDiv.innerHTML = validation.errors.join('<br>');
      errorsDiv.classList.remove('d-none');
      return;
    }

    // Deshabilitar botón
    const btnSubmit = document.getElementById('btn-submit-ticket');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creando...';

    try {
      const result = await SupportSystem.createTicket(ticketData);

      // Cerrar modal
      bootstrap.Modal.getInstance(document.getElementById('modal-new-ticket')).hide();

      // Mostrar resultado
      if (result.assistant_resolved) {
        SupportSystem.showToast('El asistente IA resolvió tu consulta. Ticket marcado como resuelto.', 'success');
      } else if (result.temp_access) {
        // Mostrar credenciales temporales
        alert(`Ticket creado exitosamente!\n\nCredenciales de acceso temporal para soporte:\nEmail: ${result.temp_access.email}\nPassword: ${result.temp_access.password}\n\nEstas credenciales expirarán cuando se cierre el ticket.`);
      } else {
        SupportSystem.showToast('Ticket creado exitosamente. El soporte te responderá pronto.', 'success');
      }

      // Recargar lista
      await this.loadTickets();

      // Abrir ticket creado
      if (result.ticket) {
        this.viewTicket(result.ticket.ticket_id);
      }
    } catch (error) {
      SupportSystem.showToast('Error al crear ticket: ' + error.message, 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="bi bi-send me-2"></i>Crear Ticket';
    }
  },

  /**
   * Ver ticket (abrir modal de chat)
   */
  async viewTicket(ticketId) {
    try {
      const data = await SupportSystem.getTicket(ticketId);
      this.currentTicket = data.ticket;

      // Renderizar info del ticket
      this.renderTicketInfo();

      // Renderizar mensajes
      this.renderMessages();

      // Mostrar modal
      const modal = new bootstrap.Modal(document.getElementById('modal-view-ticket'));
      modal.show();

      // Auto-scroll al último mensaje
      setTimeout(() => {
        const chatContainer = document.getElementById('chat-messages');
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 300);
    } catch (error) {
      SupportSystem.showToast('Error al cargar ticket: ' + error.message, 'error');
    }
  },

  /**
   * Renderizar información del ticket
   */
  renderTicketInfo() {
    const ticket = this.currentTicket;

    document.getElementById('ticket-title').textContent = ticket.ticket_number;
    document.getElementById('ticket-subtitle').textContent = ticket.subject;

    const statusBadge = SupportSystem.getStatusBadgeClass(ticket.status);
    const priorityBadge = SupportSystem.getPriorityBadgeClass(ticket.priority);

    let infoHTML = `
      <dl class="mb-0">
        <dt>Estado</dt>
        <dd><span class="${statusBadge}">${SupportSystem.translateStatus(ticket.status)}</span></dd>

        <dt>Prioridad</dt>
        <dd><span class="${priorityBadge}">${SupportSystem.translatePriority(ticket.priority)}</span></dd>

        <dt>Módulo</dt>
        <dd>${ticket.module_display_name || ticket.module_name}</dd>

        <dt>Creado</dt>
        <dd>${SupportSystem.formatAbsoluteTime(ticket.created_at)}</dd>

        ${ticket.assignedVendor ? `
          <dt>Asignado a</dt>
          <dd>${ticket.assignedVendor.firstName} ${ticket.assignedVendor.lastName}</dd>
        ` : ''}

        ${ticket.first_response_at ? `
          <dt>Primera respuesta</dt>
          <dd>${SupportSystem.formatAbsoluteTime(ticket.first_response_at)}</dd>
        ` : ''}

        ${ticket.closed_at ? `
          <dt>Cerrado</dt>
          <dd>${SupportSystem.formatAbsoluteTime(ticket.closed_at)}</dd>
        ` : ''}

        ${ticket.rating ? `
          <dt>Tu evaluación</dt>
          <dd>${SupportSystem.renderStars(ticket.rating)}</dd>
        ` : ''}
      </dl>
    `;

    document.getElementById('ticket-info').innerHTML = infoHTML;

    // Botones de acción
    const btnClose = document.getElementById('btn-close-ticket');
    const btnRate = document.getElementById('btn-rate-ticket');
    const chatInput = document.getElementById('chat-input-container');

    if (ticket.status === 'closed') {
      btnClose.style.display = 'none';
      chatInput.style.display = 'none';

      if (!ticket.rating) {
        btnRate.style.display = 'block';
      } else {
        btnRate.style.display = 'none';
      }
    } else {
      btnClose.style.display = 'block';
      btnRate.style.display = 'none';
      chatInput.style.display = 'block';
    }
  },

  /**
   * Renderizar mensajes del chat
   */
  renderMessages() {
    const ticket = this.currentTicket;
    const container = document.getElementById('chat-messages');

    if (!ticket.messages || ticket.messages.length === 0) {
      container.innerHTML = '<p class="text-muted text-center">No hay mensajes aún.</p>';
      return;
    }

    let html = '';

    ticket.messages.forEach(msg => {
      const isCustomer = msg.user_role === 'customer';
      const alignClass = isCustomer ? 'text-end' : 'text-start';
      const bgClass = isCustomer ? 'bg-primary text-white' : 'bg-light';
      const time = SupportSystem.formatAbsoluteTime(msg.created_at);

      html += `
        <div class="mb-3 ${alignClass}">
          <div class="d-inline-block ${bgClass} rounded p-3" style="max-width: 75%;">
            <div class="mb-1">
              <strong>${msg.author ? `${msg.author.firstName} ${msg.author.lastName}` : 'Usuario'}</strong>
              <small class="ms-2 opacity-75">${time}</small>
            </div>
            <div>${msg.message.replace(/\n/g, '<br>')}</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  /**
   * Enviar mensaje
   */
  async sendMessage() {
    const textarea = document.getElementById('message-text');
    const message = textarea.value.trim();

    const validation = SupportSystem.validateMessage(message);
    if (!validation.isValid) {
      SupportSystem.showToast(validation.error, 'error');
      return;
    }

    try {
      await SupportSystem.addMessage(this.currentTicket.ticket_id, { message });

      // Limpiar textarea
      textarea.value = '';

      // Recargar ticket
      await this.viewTicket(this.currentTicket.ticket_id);

      SupportSystem.showToast('Mensaje enviado', 'success');
    } catch (error) {
      SupportSystem.showToast('Error al enviar mensaje: ' + error.message, 'error');
    }
  },

  /**
   * Cerrar ticket
   */
  async closeTicket() {
    if (!confirm('¿Estás seguro de que quieres cerrar este ticket? Esto significa que tu problema está resuelto.')) {
      return;
    }

    try {
      await SupportSystem.updateTicketStatus(this.currentTicket.ticket_id, 'closed');

      SupportSystem.showToast('Ticket cerrado exitosamente', 'success');

      // Recargar ticket
      await this.viewTicket(this.currentTicket.ticket_id);

      // Recargar lista
      await this.loadTickets();
    } catch (error) {
      SupportSystem.showToast('Error al cerrar ticket: ' + error.message, 'error');
    }
  },

  /**
   * Mostrar modal de evaluación
   */
  showRatingModal() {
    let selectedRating = 0;

    // Renderizar estrellas interactivas
    SupportSystem.renderInteractiveStars('rating-stars', (rating) => {
      selectedRating = rating;
    });

    // Guardar rating seleccionado
    this.selectedRating = () => selectedRating;

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modal-rate-ticket'));
    modal.show();
  },

  /**
   * Enviar evaluación
   */
  async submitRating() {
    const rating = this.selectedRating ? this.selectedRating() : 0;
    const ratingComment = document.getElementById('rating-comment').value.trim();

    if (rating === 0) {
      SupportSystem.showToast('Por favor selecciona una calificación', 'error');
      return;
    }

    try {
      await SupportSystem.rateTicket(this.currentTicket.ticket_id, rating, ratingComment);

      // Cerrar modal
      bootstrap.Modal.getInstance(document.getElementById('modal-rate-ticket')).hide();

      SupportSystem.showToast('Gracias por tu evaluación', 'success');

      // Recargar ticket
      await this.viewTicket(this.currentTicket.ticket_id);

      // Recargar lista
      await this.loadTickets();
    } catch (error) {
      SupportSystem.showToast('Error al enviar evaluación: ' + error.message, 'error');
    }
  }
};

// Exportar para uso global
window.SupportCustomerView = SupportCustomerView;

console.log('✅ [SUPPORT-CUSTOMER] Módulo de vista de cliente cargado');
