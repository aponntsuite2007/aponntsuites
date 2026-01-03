/**
 * MÓDULO: Voice Platform - Sistema de Experiencias del Empleado
 *
 * Sistema de captura de sugerencias, problemas y soluciones con IA
 * Incluye: Clustering semántico, gamificación, analytics
 *
 * @version 1.0.0
 * @date 2025-12-23
 */

// ============================================================================
// GUARD: Evitar carga duplicada del script
// ============================================================================
if (window._voicePlatformLoaded) {
  console.log('⚠️ [VOICE-PLATFORM] Script ya cargado, omitiendo re-declaración');
} else {
window._voicePlatformLoaded = true;

console.log('%c VOICE PLATFORM v1.0 ', 'background: linear-gradient(90deg, #10B981 0%, #059669 100%); color: white; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

const VoicePlatform = {
  // Base URL para API
  API_BASE: '/api/voice-platform',

  // Estado del módulo
  state: {
    currentView: 'list',
    filters: {
      type: '',
      area: '',
      priority: '',
      status: '',
      search: ''
    },
    currentPage: 1,
    itemsPerPage: 20,
    experiences: [],
    clusters: [],
    myStats: null,
    leaderboard: []
  },

  // Token de autenticación
  getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('token');
  },

  // Headers comunes para requests
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAuthToken()}`
    };
  },

  // =========================================================================
  // API CLIENT - EXPERIENCIAS
  // =========================================================================

  /**
   * Listar experiencias (con filtros opcionales)
   */
  async listExperiences(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`${this.API_BASE}/experiences?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al listar experiencias');
      }

      this.state.experiences = data.experiences || [];
      return data;
    } catch (error) {
      console.error('[VoicePlatform] Error listing experiences:', error);
      throw error;
    }
  },

  /**
   * Crear nueva experiencia
   */
  async createExperience(experienceData) {
    try {
      const response = await fetch(`${this.API_BASE}/experiences`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(experienceData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al crear experiencia');
      }

      return data;
    } catch (error) {
      console.error('[VoicePlatform] Error creating experience:', error);
      throw error;
    }
  },

  /**
   * Obtener detalles de una experiencia
   */
  async getExperience(experienceId) {
    try {
      const response = await fetch(`${this.API_BASE}/experiences/${experienceId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener experiencia');
      }

      return data;
    } catch (error) {
      console.error('[VoicePlatform] Error getting experience:', error);
      throw error;
    }
  },

  /**
   * Actualizar estado de experiencia (admin only)
   */
  async updateExperienceStatus(experienceId, newStatus) {
    try {
      const response = await fetch(`${this.API_BASE}/experiences/${experienceId}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar estado');
      }

      return data;
    } catch (error) {
      console.error('[VoicePlatform] Error updating status:', error);
      throw error;
    }
  },

  // =========================================================================
  // API CLIENT - VOTACIÓN
  // =========================================================================

  /**
   * Votar experiencia (UPVOTE/DOWNVOTE)
   */
  async voteExperience(experienceId, voteType) {
    try {
      const response = await fetch(`${this.API_BASE}/experiences/${experienceId}/vote`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ vote_type: voteType })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al votar');
      }

      return data;
    } catch (error) {
      console.error('[VoicePlatform] Error voting:', error);
      throw error;
    }
  },

  /**
   * Eliminar voto
   */
  async removeVote(experienceId) {
    try {
      const response = await fetch(`${this.API_BASE}/experiences/${experienceId}/vote`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar voto');
      }

      return data;
    } catch (error) {
      console.error('[VoicePlatform] Error removing vote:', error);
      throw error;
    }
  },

  // =========================================================================
  // API CLIENT - COMENTARIOS
  // =========================================================================

  /**
   * Agregar comentario a experiencia
   */
  async addComment(experienceId, commentData) {
    try {
      const response = await fetch(`${this.API_BASE}/experiences/${experienceId}/comments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(commentData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al agregar comentario');
      }

      return data;
    } catch (error) {
      console.error('[VoicePlatform] Error adding comment:', error);
      throw error;
    }
  },

  // =========================================================================
  // API CLIENT - CLUSTERING & ANALYTICS
  // =========================================================================

  /**
   * Listar clusters semánticos
   */
  async listClusters() {
    try {
      const response = await fetch(`${this.API_BASE}/clusters`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al listar clusters');
      }

      this.state.clusters = data.clusters || [];
      return data;
    } catch (error) {
      console.error('[VoicePlatform] Error listing clusters:', error);
      throw error;
    }
  },

  /**
   * Obtener overview de analytics (admin only)
   */
  async getAnalyticsOverview() {
    try {
      const response = await fetch(`${this.API_BASE}/analytics/overview`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener analytics');
      }

      return data;
    } catch (error) {
      console.error('[VoicePlatform] Error getting analytics:', error);
      throw error;
    }
  },

  // =========================================================================
  // API CLIENT - GAMIFICACIÓN
  // =========================================================================

  /**
   * Obtener mis estadísticas personales
   */
  async getMyStats() {
    try {
      const response = await fetch(`${this.API_BASE}/gamification/my-stats`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener mis stats');
      }

      this.state.myStats = data;
      return data;
    } catch (error) {
      console.error('[VoicePlatform] Error getting my stats:', error);
      throw error;
    }
  },

  /**
   * Obtener leaderboard
   */
  async getLeaderboard(params = {}) {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await fetch(`${this.API_BASE}/gamification/leaderboard?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener leaderboard');
      }

      this.state.leaderboard = data.leaderboard || [];
      return data;
    } catch (error) {
      console.error('[VoicePlatform] Error getting leaderboard:', error);
      throw error;
    }
  },

  // =========================================================================
  // HELPERS - FORMATEO
  // =========================================================================

  /**
   * Traducir tipo de experiencia
   */
  translateType(type) {
    const translations = {
      'SUGGESTION': 'Sugerencia',
      'PROBLEM': 'Problema',
      'SOLUTION': 'Solución'
    };
    return translations[type] || type;
  },

  /**
   * Icono según tipo
   */
  getTypeIcon(type) {
    const icons = {
      'SUGGESTION': '💡',
      'PROBLEM': '⚠️',
      'SOLUTION': '✅'
    };
    return icons[type] || '📝';
  },

  /**
   * Color de badge según tipo
   */
  getTypeBadgeClass(type) {
    const classes = {
      'SUGGESTION': 'badge bg-primary',
      'PROBLEM': 'badge bg-warning',
      'SOLUTION': 'badge bg-success'
    };
    return classes[type] || 'badge bg-secondary';
  },

  /**
   * Traducir área
   */
  translateArea(area) {
    const translations = {
      'IT': 'Tecnología',
      'ADMIN': 'Administración',
      'PRODUCTION': 'Producción',
      'QUALITY': 'Calidad',
      'SAFETY': 'Seguridad',
      'LOGISTICS': 'Logística',
      'HR': 'RRHH',
      'FINANCE': 'Finanzas',
      'SALES': 'Ventas',
      'OTHER': 'Otro'
    };
    return translations[area] || area;
  },

  /**
   * Traducir prioridad
   */
  translatePriority(priority) {
    const translations = {
      'LOW': 'Baja',
      'MEDIUM': 'Media',
      'HIGH': 'Alta'
    };
    return translations[priority] || priority;
  },

  /**
   * Color de badge según prioridad
   */
  getPriorityBadgeClass(priority) {
    const classes = {
      'LOW': 'badge bg-secondary',
      'MEDIUM': 'badge bg-info',
      'HIGH': 'badge bg-danger'
    };
    return classes[priority] || 'badge bg-light';
  },

  /**
   * Traducir estado
   */
  translateStatus(status) {
    const translations = {
      'PENDING': 'Pendiente',
      'UNDER_REVIEW': 'En Revisión',
      'APPROVED': 'Aprobado',
      'REJECTED': 'Rechazado',
      'IMPLEMENTED': 'Implementado'
    };
    return translations[status] || status;
  },

  /**
   * Color de badge según estado
   */
  getStatusBadgeClass(status) {
    const classes = {
      'PENDING': 'badge bg-warning',
      'UNDER_REVIEW': 'badge bg-info',
      'APPROVED': 'badge bg-success',
      'REJECTED': 'badge bg-danger',
      'IMPLEMENTED': 'badge bg-primary'
    };
    return classes[status] || 'badge bg-light';
  },

  /**
   * Formatear fecha relativa
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
      return `Hace ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours}h`;
    } else if (diffDays < 30) {
      return `Hace ${diffDays}d`;
    } else {
      return past.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    }
  },

  /**
   * Formatear fecha absoluta
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
   * Renderizar barra de progreso de nivel
   */
  renderLevelProgress(currentPoints, levelThreshold, nextLevelThreshold) {
    const rangePoints = nextLevelThreshold - levelThreshold;
    const currentProgress = currentPoints - levelThreshold;
    const percentage = Math.min(100, Math.max(0, (currentProgress / rangePoints) * 100));

    return `
      <div class="progress" style="height: 8px;">
        <div class="progress-bar bg-success" role="progressbar"
             style="width: ${percentage}%"
             aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
        </div>
      </div>
      <small class="text-muted">${Math.round(percentage)}% al próximo nivel</small>
    `;
  },

  /**
   * Obtener badge de nivel
   */
  getLevelBadge(level) {
    if (level >= 10) return { icon: '🏆', color: 'gold', name: 'Experto' };
    if (level >= 7) return { icon: '⭐', color: 'purple', name: 'Avanzado' };
    if (level >= 4) return { icon: '🌟', color: 'blue', name: 'Intermedio' };
    return { icon: '🌱', color: 'green', name: 'Novato' };
  },

  // =========================================================================
  // HELPERS - UI
  // =========================================================================

  /**
   * Mostrar toast notification
   */
  showToast(message, type = 'info') {
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
        <p class="mt-3 text-muted">Cargando experiencias...</p>
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
  showEmpty(containerId, message = 'No hay experiencias', icon = 'inbox') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-${icon}" style="font-size: 3rem;"></i>
        <p class="mt-3">${message}</p>
      </div>
    `;
  },

  /**
   * Renderizar tarjeta de experiencia
   */
  renderExperienceCard(experience) {
    const typeIcon = this.getTypeIcon(experience.type);
    const typeBadge = this.getTypeBadgeClass(experience.type);
    const priorityBadge = this.getPriorityBadgeClass(experience.priority);
    const statusBadge = this.getStatusBadgeClass(experience.status);
    const timeAgo = this.formatRelativeTime(experience.created_at);

    return `
      <div class="card mb-3 experience-card" data-experience-id="${experience.id}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="card-title mb-0">
              ${typeIcon} ${experience.title}
            </h5>
            <div class="d-flex gap-2">
              <span class="${typeBadge}">${this.translateType(experience.type)}</span>
              <span class="${priorityBadge}">${this.translatePriority(experience.priority)}</span>
            </div>
          </div>

          <p class="card-text text-muted small mb-2">
            ${experience.description.substring(0, 150)}${experience.description.length > 150 ? '...' : ''}
          </p>

          <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex gap-3 align-items-center">
              <span class="badge bg-light text-dark">${this.translateArea(experience.area)}</span>
              <span class="${statusBadge}">${this.translateStatus(experience.status)}</span>
              <small class="text-muted">${timeAgo}</small>
            </div>

            <div class="d-flex gap-3 align-items-center">
              <button class="btn btn-sm btn-outline-success vote-btn" data-vote="upvote" data-experience-id="${experience.id}">
                <i class="bi bi-hand-thumbs-up"></i> ${experience.upvotes || 0}
              </button>
              <button class="btn btn-sm btn-outline-danger vote-btn" data-vote="downvote" data-experience-id="${experience.id}">
                <i class="bi bi-hand-thumbs-down"></i> ${experience.downvotes || 0}
              </button>
              <span class="text-muted">
                <i class="bi bi-chat"></i> ${experience.comments_count || 0}
              </span>
              <span class="text-muted">
                <i class="bi bi-eye"></i> ${experience.views || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // =========================================================================
  // RENDERIZADO DE INTERFAZ
  // =========================================================================

  /**
   * Inyectar estilos CSS del módulo
   */
  injectStyles() {
    const existingStyle = document.getElementById('voice-platform-styles');
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = 'voice-platform-styles';
    style.textContent = `
      /* DARK THEME - Voice Platform */
      .voice-platform {
        padding: 20px;
        background: #0f172a;
        min-height: 100vh;
        color: #e2e8f0;
      }

      .voice-platform .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 15px;
        border-bottom: 2px solid #1e293b;
      }

      .voice-platform .header h2 {
        color: #f1f5f9;
        font-weight: 600;
      }

      .voice-platform .filters-bar {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 20px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        border: 1px solid #334155;
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
      }

      .voice-platform .filter-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
        min-width: 150px;
      }

      .voice-platform .filter-group label {
        font-size: 12px;
        font-weight: 500;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .voice-platform .filter-group .form-control {
        background: #0f172a;
        border: 1px solid #334155;
        color: #e2e8f0;
        padding: 8px 12px;
        border-radius: 6px;
        transition: all 0.3s;
      }

      .voice-platform .filter-group .form-control:focus {
        background: #1e293b;
        border-color: #10B981;
        outline: none;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
      }

      .voice-platform .filter-group .form-control option {
        background: #1e293b;
        color: #e2e8f0;
      }

      .voice-platform .experiences-container {
        min-height: 400px;
      }

      .voice-platform .experience-card {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 1px solid #334155;
        border-radius: 12px;
        transition: all 0.3s;
        cursor: pointer;
        margin-bottom: 15px;
      }

      .voice-platform .experience-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(16, 185, 129, 0.2);
        border-color: #10B981;
      }

      .voice-platform .experience-card .card-body {
        background: transparent;
      }

      .voice-platform .experience-card .card-title {
        color: #f1f5f9;
        font-weight: 600;
      }

      .voice-platform .experience-card .card-text {
        color: #94a3b8;
      }

      .voice-platform .stats-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 20px;
        margin-bottom: 25px;
      }

      .voice-platform .stat-card {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        padding: 25px;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        border: 1px solid #334155;
        text-align: center;
        transition: all 0.3s;
      }

      .voice-platform .stat-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.4);
        border-color: #10B981;
      }

      .voice-platform .stat-card h3 {
        font-size: 2.5rem;
        margin: 10px 0;
        color: #10B981;
        font-weight: 700;
      }

      .voice-platform .stat-card p {
        margin: 0;
        color: #94a3b8;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .voice-platform .btn {
        transition: all 0.3s;
        border-radius: 8px;
        font-weight: 500;
        padding: 10px 20px;
      }

      .voice-platform .btn-primary {
        background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        border: none;
      }

      .voice-platform .btn-primary:hover {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      }

      .voice-platform .btn-info {
        background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
        border: none;
        color: white;
      }

      .voice-platform .btn-info:hover {
        background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }

      .voice-platform .btn-success {
        background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
        border: none;
      }

      .voice-platform .btn-success:hover {
        background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
      }

      .voice-platform .btn-secondary {
        background: #334155;
        border: 1px solid #475569;
        color: #e2e8f0;
      }

      .voice-platform .btn-secondary:hover {
        background: #475569;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(51, 65, 85, 0.3);
      }

      .voice-platform .badge {
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .voice-platform .spinner-border {
        color: #10B981;
      }

      .voice-platform .text-muted {
        color: #64748b !important;
      }

      .voice-platform .alert-danger {
        background: #dc2626;
        color: white;
        border: none;
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * Renderizar dashboard principal
   */
  renderDashboard() {
    const container = document.getElementById('mainContent');
    if (!container) {
      console.error('[VOICE-PLATFORM] No se encontró el contenedor #mainContent');
      return;
    }

    container.innerHTML = `
      <div class="voice-platform">
        <div class="header">
          <h2>🎤 Voice Platform - Experiencias del Empleado</h2>
          <div>
            <button class="btn btn-warning" id="btnAMiMePaso" style="background: linear-gradient(135deg, #FF6B6B 0%, #FFA500 100%); border: none; color: white; font-weight: bold;">
              <i class="bi bi-search"></i> 🎯 A MI ME PASO
            </button>
            <button class="btn btn-primary" id="btnCreateExperience">
              <i class="bi bi-plus-circle"></i> Nueva Experiencia
            </button>
            <button class="btn btn-info" id="btnViewStats">
              <i class="bi bi-graph-up"></i> Mis Stats
            </button>
            <button class="btn btn-success" id="btnLeaderboard">
              <i class="bi bi-trophy"></i> Leaderboard
            </button>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="stats-cards" id="statsCards">
          <div class="stat-card">
            <i class="bi bi-lightbulb" style="font-size: 2rem; color: #3B82F6;"></i>
            <h3 id="statSuggestions">-</h3>
            <p>Sugerencias</p>
          </div>
          <div class="stat-card">
            <i class="bi bi-exclamation-triangle" style="font-size: 2rem; color: #F59E0B;"></i>
            <h3 id="statProblems">-</h3>
            <p>Problemas</p>
          </div>
          <div class="stat-card">
            <i class="bi bi-check-circle" style="font-size: 2rem; color: #10B981;"></i>
            <h3 id="statSolutions">-</h3>
            <p>Soluciones</p>
          </div>
          <div class="stat-card">
            <i class="bi bi-hand-thumbs-up" style="font-size: 2rem; color: #8B5CF6;"></i>
            <h3 id="statMyPoints">-</h3>
            <p>Mis Puntos</p>
          </div>
        </div>

        <!-- Filtros -->
        <div class="filters-bar">
          <div class="filter-group">
            <label>Tipo</label>
            <select class="form-control" id="filterType">
              <option value="">Todos</option>
              <option value="SUGGESTION">Sugerencias</option>
              <option value="PROBLEM">Problemas</option>
              <option value="SOLUTION">Soluciones</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Área</label>
            <select class="form-control" id="filterArea">
              <option value="">Todas</option>
              <option value="IT">Tecnología</option>
              <option value="ADMIN">Administración</option>
              <option value="PRODUCTION">Producción</option>
              <option value="QUALITY">Calidad</option>
              <option value="SAFETY">Seguridad</option>
              <option value="LOGISTICS">Logística</option>
              <option value="HR">RRHH</option>
              <option value="FINANCE">Finanzas</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Prioridad</label>
            <select class="form-control" id="filterPriority">
              <option value="">Todas</option>
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Media</option>
              <option value="LOW">Baja</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Estado</label>
            <select class="form-control" id="filterStatus">
              <option value="">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="UNDER_REVIEW">En Revisión</option>
              <option value="APPROVED">Aprobado</option>
              <option value="IMPLEMENTED">Implementado</option>
            </select>
          </div>
          <div class="filter-group" style="min-width: 250px;">
            <label>Buscar</label>
            <input type="text" class="form-control" id="filterSearch" placeholder="Título o descripción...">
          </div>
          <div class="filter-group" style="align-items: flex-end;">
            <button class="btn btn-secondary" id="btnClearFilters">
              <i class="bi bi-x-circle"></i> Limpiar
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div id="experiencesLoading" style="display: none;">
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-3 text-muted">Cargando experiencias...</p>
          </div>
        </div>

        <!-- Lista de experiencias -->
        <div class="experiences-container" id="experiencesContainer">
          <!-- Se renderiza dinámicamente con renderExperiencesList() -->
        </div>
      </div>
    `;
  },

  /**
   * Registrar event listeners
   */
  attachEventListeners() {
    // Botones del header
    document.getElementById('btnAMiMePaso')?.addEventListener('click', () => {
      if (window.AMiMePaso) {
        window.AMiMePaso.showSearchModal();
      } else {
        console.error('[VOICE-PLATFORM] AMiMePaso no está cargado');
      }
    });
    document.getElementById('btnCreateExperience')?.addEventListener('click', () => {
      if (window.VoicePlatformWizard) {
        window.VoicePlatformWizard.start();
      } else {
        console.error('[VOICE-PLATFORM] Wizard no disponible');
      }
    });
    document.getElementById('btnViewStats')?.addEventListener('click', () => this.showMyStats());
    document.getElementById('btnLeaderboard')?.addEventListener('click', () => this.showLeaderboard());

    // Filtros
    document.getElementById('filterType')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('filterArea')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('filterPriority')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('filterStatus')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('filterSearch')?.addEventListener('input', () => this.applyFilters());
    document.getElementById('btnClearFilters')?.addEventListener('click', () => this.clearFilters());
  },

  /**
   * Renderizar lista de experiencias
   */
  renderExperiencesList(experiences) {
    const container = document.getElementById('experiencesContainer');
    if (!container) return;

    if (!experiences || experiences.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-inbox" style="font-size: 3rem;"></i>
          <p class="mt-3">No hay experiencias para mostrar</p>
          <button class="btn btn-primary mt-2" onclick="VoicePlatform.showCreateModal()">
            <i class="bi bi-plus-circle"></i> Crear Primera Experiencia
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = experiences.map(exp => this.renderExperienceCard(exp)).join('');

    // Agregar event listeners a las tarjetas
    container.querySelectorAll('.experience-card').forEach(card => {
      card.addEventListener('click', () => {
        const expId = card.dataset.experienceId;
        this.showExperienceDetail(expId);
      });
    });
  },

  /**
   * Cargar experiencias desde API
   */
  async loadExperiences() {
    try {
      document.getElementById('experiencesLoading').style.display = 'block';
      document.getElementById('experiencesContainer').style.display = 'none';

      const filters = {
        type: this.state.filters.type,
        area: this.state.filters.area,
        priority: this.state.filters.priority,
        status: this.state.filters.status,
        search: this.state.filters.search
      };

      const data = await this.listExperiences(filters);
      this.renderExperiencesList(data.experiences);
      this.updateStatsCards(data.stats);

    } catch (error) {
      console.error('[VOICE-PLATFORM] Error cargando experiencias:', error);
      this.showError('experiencesContainer', 'Error al cargar experiencias: ' + error.message);
    } finally {
      document.getElementById('experiencesLoading').style.display = 'none';
      document.getElementById('experiencesContainer').style.display = 'block';
    }
  },

  /**
   * Actualizar tarjetas de estadísticas
   */
  updateStatsCards(stats) {
    if (!stats) return;

    document.getElementById('statSuggestions').textContent = stats.suggestions_count || 0;
    document.getElementById('statProblems').textContent = stats.problems_count || 0;
    document.getElementById('statSolutions').textContent = stats.solutions_count || 0;
    document.getElementById('statMyPoints').textContent = stats.my_points || 0;
  },

  /**
   * Aplicar filtros
   */
  applyFilters() {
    this.state.filters.type = document.getElementById('filterType').value;
    this.state.filters.area = document.getElementById('filterArea').value;
    this.state.filters.priority = document.getElementById('filterPriority').value;
    this.state.filters.status = document.getElementById('filterStatus').value;
    this.state.filters.search = document.getElementById('filterSearch').value;

    this.loadExperiences();
  },

  /**
   * Limpiar filtros
   */
  clearFilters() {
    document.getElementById('filterType').value = '';
    document.getElementById('filterArea').value = '';
    document.getElementById('filterPriority').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterSearch').value = '';

    this.state.filters = {
      type: '',
      area: '',
      priority: '',
      status: '',
      search: ''
    };

    this.loadExperiences();
  },

  /**
   * Mostrar modal de crear experiencia
   */
  showCreateModal() {
    this.showToast('Modal de crear experiencia - Próximamente', 'info');
  },

  /**
   * Mostrar mis estadísticas
   */
  async showMyStats() {
    try {
      const stats = await this.getMyStats();
      this.showToast(`Mis puntos: ${stats.total_points} - Nivel: ${stats.current_level}`, 'success');
    } catch (error) {
      this.showToast('Error al cargar stats: ' + error.message, 'error');
    }
  },

  /**
   * Mostrar leaderboard
   */
  async showLeaderboard() {
    try {
      const data = await this.getLeaderboard();
      this.showToast(`Leaderboard: ${data.leaderboard.length} usuarios`, 'info');
    } catch (error) {
      this.showToast('Error al cargar leaderboard: ' + error.message, 'error');
    }
  },

  /**
   * Mostrar detalle de experiencia
   */
  showExperienceDetail(experienceId) {
    this.showToast('Detalle de experiencia - Próximamente', 'info');
  },

  // =========================================================================
  // INICIALIZACIÓN
  // =========================================================================

  /**
   * Inicializar módulo
   */
  init() {
  // 🔧 AUTO-REPAIR: Botón CREATE agregado por SYNAPSE
  const createButton = document.createElement('button');
  createButton.className = 'btn btn-primary btn-create';
  createButton.setAttribute('data-action', 'open');
  createButton.innerHTML = '<i class="fas fa-plus"></i> Crear Nuevo';
  createButton.onclick = () => {
    console.log('🔧 [AUTO-REPAIR] Click en botón CREATE - abrir modal');
    // TODO: Implementar apertura de modal
  };

  // Buscar contenedor y agregar botón
  const container = document.querySelector('#mainContent') || document.querySelector('.content');
  if (container && !container.querySelector('.btn-create')) {
    const btnContainer = document.createElement('div');
    btnContainer.className = 'mb-3';
    btnContainer.appendChild(createButton);
    container.insertBefore(btnContainer, container.firstChild);
  }

    console.log('🎤 [VOICE-PLATFORM] Módulo inicializado');

    this.injectStyles();
    this.renderDashboard();
    this.attachEventListeners();
    this.loadExperiences();

    return this;
  }
};

// Exportar para uso global
window.VoicePlatform = VoicePlatform;

console.log('✅ [VOICE-PLATFORM] Módulo base cargado correctamente');

} // Cierre del guard
