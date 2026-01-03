/**
 * VOICE PLATFORM FEED - Vista Pública de Experiencias
 *
 * Feed público para que los empleados exploren experiencias compartidas
 * Funciones: Ver, votar, comentar, filtrar
 *
 * @version 1.0.0
 * @date 2025-12-24
 */

// ============================================================================
// GUARD
// ============================================================================
if (window._voicePlatformFeedLoaded) {
  console.log('⚠️ [VOICE-FEED] Ya cargado');
} else {
window._voicePlatformFeedLoaded = true;

console.log('%c 📰 VOICE FEED v1.0 ', 'background: linear-gradient(90deg, #10B981 0%, #059669 100%); color: white; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

const VoicePlatformFeed = {
  API_BASE: '/api/voice-platform',

  state: {
    experiences: [],
    filters: {
      type: '',
      status: '',
      sortBy: 'recent'
    }
  },

  getAuthToken() {
    return localStorage.getItem('authToken') ||
           sessionStorage.getItem('authToken') ||
           localStorage.getItem('token');
  },

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAuthToken()}`
    };
  },

  // =========================================================================
  // RENDER FEED
  // =========================================================================
  render() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    container.innerHTML = `
      <div class="voice-feed-container">
        <div class="feed-header">
          <h2>
            <i class="bi bi-stream"></i> Feed de Experiencias
          </h2>
          <p class="text-muted">
            Explora las experiencias compartidas por tus compañeros
          </p>
        </div>

        <!-- Filtros -->
        <div class="feed-filters">
          <div class="filter-group">
            <label>Tipo</label>
            <select class="form-control" id="feedFilterType">
              <option value="">Todos</option>
              <option value="SUGGESTION">💡 Sugerencias</option>
              <option value="PROBLEM">⚠️ Problemas</option>
              <option value="SOLUTION">✅ Soluciones</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Estado</label>
            <select class="form-control" id="feedFilterStatus">
              <option value="">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="UNDER_REVIEW">En Revisión</option>
              <option value="APPROVED">Aprobado</option>
              <option value="IMPLEMENTED">✅ Implementado</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Ordenar por</label>
            <select class="form-control" id="feedFilterSort">
              <option value="recent">Más Recientes</option>
              <option value="popular">Más Populares</option>
              <option value="upvotes">Más Votados</option>
              <option value="comments">Más Comentados</option>
            </select>
          </div>
        </div>

        <!-- Loading -->
        <div id="feedLoading" style="display: none;">
          <div class="text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-3 text-muted">Cargando experiencias...</p>
          </div>
        </div>

        <!-- Feed de experiencias -->
        <div id="feedExperiencesList"></div>

        <style>
          .voice-feed-container {
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
          }
          .feed-header {
            margin-bottom: 30px;
          }
          .feed-header h2 {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .feed-filters {
            display: flex;
            gap: 15px;
            margin-bottom: 30px;
            flex-wrap: wrap;
          }
          .filter-group {
            flex: 1;
            min-width: 200px;
          }
          .filter-group label {
            display: block;
            font-weight: 600;
            margin-bottom: 5px;
            font-size: 0.9rem;
          }
          .experience-feed-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .experience-feed-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          }
          .exp-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 15px;
          }
          .exp-type-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
          }
          .exp-stats {
            display: flex;
            gap: 20px;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
          }
          .exp-stat {
            display: flex;
            align-items: center;
            gap: 5px;
            color: #6b7280;
            font-size: 0.9rem;
          }
        </style>
      </div>
    `;

    this.attachListeners();
    this.loadExperiences();
  },

  attachListeners() {
    document.getElementById('feedFilterType')?.addEventListener('change', () => {
      this.state.filters.type = document.getElementById('feedFilterType').value;
      this.loadExperiences();
    });

    document.getElementById('feedFilterStatus')?.addEventListener('change', () => {
      this.state.filters.status = document.getElementById('feedFilterStatus').value;
      this.loadExperiences();
    });

    document.getElementById('feedFilterSort')?.addEventListener('change', () => {
      this.state.filters.sortBy = document.getElementById('feedFilterSort').value;
      this.loadExperiences();
    });
  },

  async loadExperiences() {
    try {
      document.getElementById('feedLoading').style.display = 'block';
      document.getElementById('feedExperiencesList').innerHTML = '';

      const params = new URLSearchParams({
        type: this.state.filters.type,
        status: this.state.filters.status,
        sortBy: this.state.filters.sortBy
      });

      const response = await fetch(`${this.API_BASE}/experiences?${params}`, {
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (data.success && data.experiences) {
        this.state.experiences = data.experiences;
        this.renderExperiences(data.experiences);
      }

    } catch (error) {
      console.error('[VOICE-FEED] Error loading experiences:', error);
      document.getElementById('feedExperiencesList').innerHTML = `
        <div class="alert alert-danger">
          Error al cargar experiencias. Intenta recargar la página.
        </div>
      `;
    } finally {
      document.getElementById('feedLoading').style.display = 'none';
    }
  },

  renderExperiences(experiences) {
    const container = document.getElementById('feedExperiencesList');

    if (!experiences || experiences.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-inbox" style="font-size: 3rem;"></i>
          <p class="mt-3">No hay experiencias para mostrar</p>
        </div>
      `;
      return;
    }

    container.innerHTML = experiences.map(exp => this.renderExperienceCard(exp)).join('');
  },

  renderExperienceCard(exp) {
    const typeColors = {
      'SUGGESTION': { bg: '#EBF5FF', color: '#2563EB', icon: '💡' },
      'PROBLEM': { bg: '#FEF3C7', color: '#D97706', icon: '⚠️' },
      'SOLUTION': { bg: '#D1FAE5', color: '#059669', icon: '✅' }
    };

    const typeConfig = typeColors[exp.type] || typeColors['SUGGESTION'];

    const statusLabels = {
      'PENDING': 'Pendiente',
      'UNDER_REVIEW': 'En Revisión',
      'APPROVED': 'Aprobado',
      'IMPLEMENTED': '✅ Implementado'
    };

    return `
      <div class="experience-feed-card">
        <div class="exp-header">
          <div>
            <span class="exp-type-badge" style="background: ${typeConfig.bg}; color: ${typeConfig.color};">
              ${typeConfig.icon} ${exp.type === 'SUGGESTION' ? 'Sugerencia' : exp.type === 'PROBLEM' ? 'Problema' : 'Solución'}
            </span>
            ${exp.status ? `
              <span class="badge bg-secondary ms-2">
                ${statusLabels[exp.status] || exp.status}
              </span>
            ` : ''}
          </div>
          <small class="text-muted">
            ${this.formatDate(exp.created_at)}
          </small>
        </div>

        <h4 style="margin-bottom: 10px;">${exp.title || 'Sin título'}</h4>
        <p class="text-muted">${exp.description?.substring(0, 200) || ''}${exp.description?.length > 200 ? '...' : ''}</p>

        ${exp.area ? `
          <div class="mt-2">
            <span class="badge bg-light text-dark">
              <i class="bi bi-tag"></i> ${exp.area}
            </span>
          </div>
        ` : ''}

        <div class="exp-stats">
          <div class="exp-stat">
            <i class="bi bi-hand-thumbs-up"></i>
            <span>${exp.upvotes || 0}</span>
          </div>
          <div class="exp-stat">
            <i class="bi bi-chat"></i>
            <span>${exp.comments_count || 0}</span>
          </div>
          <div class="exp-stat">
            <i class="bi bi-eye"></i>
            <span>${exp.views || 0}</span>
          </div>
        </div>
      </div>
    `;
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `Hace ${diffMins} minutos`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} horas`;
    return `Hace ${Math.floor(diffMins / 1440)} días`;
  },

  init() {
    this.render();
  }
};

// Exportar
window.VoicePlatformFeed = VoicePlatformFeed;

// Auto-init si se carga como módulo
if (typeof window.Modules !== 'undefined') {
  window.Modules['voice-platform-feed'] = VoicePlatformFeed;
}

console.log('✅ [VOICE-FEED] Módulo cargado');

} // Guard
