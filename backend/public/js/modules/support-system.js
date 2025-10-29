/**
 * MÓDULO: Sistema de Soporte V2.0
 *
 * Cliente API y utilidades comunes para el sistema de soporte
 * Incluye: API calls, formateo, validaciones, helpers
 *
 * @version 2.0.0
 * @date 2025-01-23
 */

const SupportSystem = {
  // Base URL para API
  API_BASE: '/api/support/v2',

  // Token de autenticación (se obtiene de localStorage)
  getAuthToken() {
    return localStorage.getItem('authToken');
  },

  // Headers comunes para requests
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAuthToken()}`
    };
  },

  // =========================================================================
  // API CLIENT - TICKETS
  // =========================================================================

  /**
   * Crear nuevo ticket
   */
  async createTicket(ticketData) {
    try {
      const response = await fetch(`${this.API_BASE}/tickets`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(ticketData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error creating ticket');
      }

      return data;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  },

  /**
   * Listar tickets (con filtros opcionales)
   */
  async listTickets(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`${this.API_BASE}/tickets?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error listing tickets');
      }

      return data;
    } catch (error) {
      console.error('Error listing tickets:', error);
      throw error;
    }
  },

  /**
   * Obtener detalles de un ticket
   */
  async getTicket(ticketId) {
    try {
      const response = await fetch(`${this.API_BASE}/tickets/${ticketId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error getting ticket');
      }

      return data;
    } catch (error) {
      console.error('Error getting ticket:', error);
      throw error;
    }
  },

  /**
   * Agregar mensaje a un ticket
   */
  async addMessage(ticketId, messageData) {
    try {
      const response = await fetch(`${this.API_BASE}/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(messageData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error adding message');
      }

      return data;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  },

  /**
   * Actualizar estado de un ticket
   */
  async updateTicketStatus(ticketId, status) {
    try {
      const response = await fetch(`${this.API_BASE}/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error updating ticket status');
      }

      return data;
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  },

  /**
   * Evaluar soporte (1-5 estrellas)
   */
  async rateTicket(ticketId, rating, ratingComment = '') {
    try {
      const response = await fetch(`${this.API_BASE}/tickets/${ticketId}/rate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ rating, rating_comment: ratingComment })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error rating ticket');
      }

      return data;
    } catch (error) {
      console.error('Error rating ticket:', error);
      throw error;
    }
  },

  /**
   * Escalar ticket a supervisor
   */
  async escalateTicket(ticketId, escalationData) {
    try {
      const response = await fetch(`${this.API_BASE}/tickets/${ticketId}/escalate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(escalationData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error escalating ticket');
      }

      return data;
    } catch (error) {
      console.error('Error escalating ticket:', error);
      throw error;
    }
  },

  /**
   * Obtener log de actividad de un ticket
   */
  async getTicketActivity(ticketId) {
    try {
      const response = await fetch(`${this.API_BASE}/tickets/${ticketId}/activity`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error getting activity log');
      }

      return data;
    } catch (error) {
      console.error('Error getting activity log:', error);
      throw error;
    }
  },

  // =========================================================================
  // API CLIENT - SLA PLANS
  // =========================================================================

  /**
   * Listar planes SLA disponibles
   */
  async listSLAPlans() {
    try {
      const response = await fetch(`${this.API_BASE}/sla-plans`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error listing SLA plans');
      }

      return data;
    } catch (error) {
      console.error('Error listing SLA plans:', error);
      throw error;
    }
  },

  // =========================================================================
  // HELPERS - FORMATEO
  // =========================================================================

  /**
   * Formatear fecha relativa (ej: "Hace 2 horas", "Hace 3 días")
   */
  formatRelativeTime(date) {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'Hace un momento';
    } else if (diffMinutes < 60) {
      return `Hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 30) {
      return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else {
      return past.toLocaleDateString('es-ES');
    }
  },

  /**
   * Formatear fecha absoluta (ej: "23 Ene 2025, 14:30")
   */
  formatAbsoluteTime(date) {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Formatear tiempo restante hasta deadline
   */
  formatTimeRemaining(deadline) {
    const now = new Date();
    const end = new Date(deadline);
    const diffMs = end - now;

    if (diffMs < 0) {
      return { text: 'Vencido', class: 'text-danger', icon: '⏰' };
    }

    const diffMinutes = Math.floor(diffMs / 1000 / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return {
        text: `${diffDays} día${diffDays > 1 ? 's' : ''}`,
        class: diffDays > 1 ? 'text-success' : 'text-warning',
        icon: '⏳'
      };
    } else if (diffHours > 0) {
      return {
        text: `${diffHours} hora${diffHours > 1 ? 's' : ''}`,
        class: diffHours > 4 ? 'text-warning' : 'text-danger',
        icon: '⏰'
      };
    } else {
      return {
        text: `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`,
        class: 'text-danger',
        icon: '🚨'
      };
    }
  },

  /**
   * Traducir estado de ticket
   */
  translateStatus(status) {
    const translations = {
      'open': 'Abierto',
      'in_progress': 'En Progreso',
      'waiting_customer': 'Esperando Cliente',
      'resolved': 'Resuelto',
      'closed': 'Cerrado'
    };
    return translations[status] || status;
  },

  /**
   * Color de badge según estado
   */
  getStatusBadgeClass(status) {
    const classes = {
      'open': 'badge bg-primary',
      'in_progress': 'badge bg-info',
      'waiting_customer': 'badge bg-warning',
      'resolved': 'badge bg-success',
      'closed': 'badge bg-secondary'
    };
    return classes[status] || 'badge bg-light';
  },

  /**
   * Traducir prioridad
   */
  translatePriority(priority) {
    const translations = {
      'low': 'Baja',
      'medium': 'Media',
      'high': 'Alta',
      'urgent': 'Urgente'
    };
    return translations[priority] || priority;
  },

  /**
   * Color de badge según prioridad
   */
  getPriorityBadgeClass(priority) {
    const classes = {
      'low': 'badge bg-secondary',
      'medium': 'badge bg-info',
      'high': 'badge bg-warning',
      'urgent': 'badge bg-danger'
    };
    return classes[priority] || 'badge bg-light';
  },

  /**
   * Renderizar estrellas de rating
   */
  renderStars(rating, maxStars = 5) {
    let html = '';
    for (let i = 1; i <= maxStars; i++) {
      if (i <= rating) {
        html += '<i class="bi bi-star-fill text-warning"></i>';
      } else {
        html += '<i class="bi bi-star text-muted"></i>';
      }
    }
    return html;
  },

  /**
   * Renderizar estrellas interactivas (para rating)
   */
  renderInteractiveStars(containerId, onRate) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('i');
      star.className = 'bi bi-star text-warning';
      star.style.cursor = 'pointer';
      star.style.fontSize = '1.5rem';
      star.style.marginRight = '0.25rem';
      star.dataset.rating = i;

      // Hover effect
      star.addEventListener('mouseenter', () => {
        for (let j = 1; j <= 5; j++) {
          const s = container.querySelector(`[data-rating="${j}"]`);
          if (j <= i) {
            s.classList.remove('bi-star');
            s.classList.add('bi-star-fill');
          } else {
            s.classList.remove('bi-star-fill');
            s.classList.add('bi-star');
          }
        }
      });

      // Click event
      star.addEventListener('click', () => {
        onRate(i);
      });

      container.appendChild(star);
    }

    // Reset on mouse leave
    container.addEventListener('mouseleave', () => {
      for (let j = 1; j <= 5; j++) {
        const s = container.querySelector(`[data-rating="${j}"]`);
        s.classList.remove('bi-star-fill');
        s.classList.add('bi-star');
      }
    });
  },

  // =========================================================================
  // HELPERS - VALIDACIÓN
  // =========================================================================

  /**
   * Validar datos de ticket
   */
  validateTicketData(data) {
    const errors = [];

    if (!data.subject || data.subject.trim().length < 5) {
      errors.push('El asunto debe tener al menos 5 caracteres');
    }

    if (!data.description || data.description.trim().length < 20) {
      errors.push('La descripción debe tener al menos 20 caracteres');
    }

    if (!data.module_name) {
      errors.push('Debes seleccionar un módulo');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validar mensaje
   */
  validateMessage(message) {
    if (!message || message.trim().length < 1) {
      return { isValid: false, error: 'El mensaje no puede estar vacío' };
    }

    if (message.trim().length > 5000) {
      return { isValid: false, error: 'El mensaje es demasiado largo (máx 5000 caracteres)' };
    }

    return { isValid: true };
  },

  // =========================================================================
  // HELPERS - UI
  // =========================================================================

  /**
   * Mostrar toast notification
   */
  showToast(message, type = 'info') {
    // Verificar si existe un contenedor de toasts
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
      toastContainer.style.zIndex = '9999';
      document.body.appendChild(toastContainer);
    }

    const toastId = `toast-${Date.now()}`;
    const bgClass = type === 'success' ? 'bg-success' :
                    type === 'error' ? 'bg-danger' :
                    type === 'warning' ? 'bg-warning' : 'bg-info';

    const toastHTML = `
      <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
    toast.show();

    // Eliminar del DOM después de ocultarse
    toastElement.addEventListener('hidden.bs.toast', () => {
      toastElement.remove();
    });
  },

  /**
   * Mostrar loading spinner
   */
  showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-3 text-muted">Cargando...</p>
      </div>
    `;
  },

  /**
   * Mostrar mensaje de error
   */
  showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        ${message}
      </div>
    `;
  },

  /**
   * Mostrar mensaje de vacío
   */
  showEmpty(containerId, message, icon = 'inbox') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-${icon}" style="font-size: 3rem;"></i>
        <p class="mt-3">${message}</p>
      </div>
    `;
  }
};

// Exportar para uso global
window.SupportSystem = SupportSystem;

console.log('✅ [SUPPORT-SYSTEM] Módulo base cargado');
