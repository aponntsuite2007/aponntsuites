/**
 * COMPANY NEWS - Noticias de la Empresa
 *
 * Módulo para visualizar noticias, anuncios, logros y mejoras implementadas
 * Vinculadas con experiencias del Voice Platform
 *
 * @version 1.0.0
 * @date 2025-12-24
 */

// ============================================================================
// GUARD
// ============================================================================
if (window._companyNewsLoaded) {
  console.log('⚠️ [COMPANY-NEWS] Ya cargado');
} else {
window._companyNewsLoaded = true;

console.log('%c 📰 COMPANY NEWS v1.0 ', 'background: linear-gradient(90deg, #3B82F6 0%, #2563EB 100%); color: white; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

const CompanyNews = {
  API_BASE: '/api/voice-platform',

  state: {
    news: [],
    filters: {
      type: '',
      sortBy: 'recent'
    },
    selectedNews: null
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
  // RENDER MAIN VIEW
  // =========================================================================
  render() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    container.innerHTML = `
      <div class="company-news-container">
        <div class="news-header">
          <h2>
            <i class="bi bi-newspaper"></i> Noticias de la Empresa
          </h2>
          <p class="text-muted">
            Mantente informado sobre logros, mejoras implementadas y anuncios importantes
          </p>
        </div>

        <!-- Filtros -->
        <div class="news-filters">
          <div class="filter-group">
            <label>Tipo de Noticia</label>
            <select class="form-control" id="newsFilterType">
              <option value="">Todas</option>
              <option value="IMPLEMENTATION">✅ Mejoras Implementadas</option>
              <option value="RECOGNITION">🏆 Reconocimientos</option>
              <option value="ANNOUNCEMENT">📢 Anuncios</option>
              <option value="MILESTONE">🎯 Hitos Importantes</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Ordenar por</label>
            <select class="form-control" id="newsFilterSort">
              <option value="recent">Más Recientes</option>
              <option value="oldest">Más Antiguas</option>
            </select>
          </div>
        </div>

        <!-- Loading -->
        <div id="newsLoading" style="display: none;">
          <div class="text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-3 text-muted">Cargando noticias...</p>
          </div>
        </div>

        <!-- Lista de noticias -->
        <div id="newsGrid" class="news-grid"></div>

        <style>
          .company-news-container {
            padding: 20px;
            max-width: 1400px;
            margin: 0 auto;
          }
          .news-header {
            margin-bottom: 30px;
          }
          .news-header h2 {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .news-filters {
            display: flex;
            gap: 15px;
            margin-bottom: 30px;
            flex-wrap: wrap;
          }
          .filter-group {
            flex: 1;
            min-width: 250px;
          }
          .filter-group label {
            display: block;
            font-weight: 600;
            margin-bottom: 5px;
            font-size: 0.9rem;
          }
          .news-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 25px;
          }
          .news-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
          }
          .news-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
          }
          .news-card-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .news-card-content {
            padding: 20px;
          }
          .news-type-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 10px;
          }
          .news-title {
            font-size: 1.3rem;
            font-weight: bold;
            margin-bottom: 10px;
            color: #1f2937;
          }
          .news-summary {
            color: #6b7280;
            margin-bottom: 15px;
            line-height: 1.6;
          }
          .news-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            font-size: 0.9rem;
            color: #9ca3af;
          }
          .news-date {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .news-related {
            display: flex;
            align-items: center;
            gap: 5px;
          }

          /* Modal de detalle */
          .news-detail-modal .modal-header {
            background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
            color: white;
          }
          .news-detail-content {
            padding: 20px 0;
          }
          .news-detail-image {
            width: 100%;
            max-height: 400px;
            object-fit: cover;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .related-experiences {
            margin-top: 30px;
            padding-top: 30px;
            border-top: 2px solid #e5e7eb;
          }
          .related-exp-card {
            background: #f9fafb;
            border-left: 4px solid #3B82F6;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 4px;
          }
        </style>
      </div>
    `;

    this.attachListeners();
    this.loadNews();
  },

  attachListeners() {
    document.getElementById('newsFilterType')?.addEventListener('change', () => {
      this.state.filters.type = document.getElementById('newsFilterType').value;
      this.loadNews();
    });

    document.getElementById('newsFilterSort')?.addEventListener('change', () => {
      this.state.filters.sortBy = document.getElementById('newsFilterSort').value;
      this.loadNews();
    });
  },

  async loadNews() {
    try {
      document.getElementById('newsLoading').style.display = 'block';
      document.getElementById('newsGrid').innerHTML = '';

      const params = new URLSearchParams({
        type: this.state.filters.type,
        sortBy: this.state.filters.sortBy
      });

      const response = await fetch(`${this.API_BASE}/news?${params}`, {
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (data.success && data.news) {
        this.state.news = data.news;
        this.renderNewsGrid(data.news);
      } else {
        this.showEmptyState();
      }

    } catch (error) {
      console.error('[COMPANY-NEWS] Error loading news:', error);
      this.showError();
    } finally {
      document.getElementById('newsLoading').style.display = 'none';
    }
  },

  renderNewsGrid(news) {
    const container = document.getElementById('newsGrid');

    if (!news || news.length === 0) {
      this.showEmptyState();
      return;
    }

    container.innerHTML = news.map(item => this.renderNewsCard(item)).join('');
  },

  renderNewsCard(news) {
    const typeConfig = {
      'IMPLEMENTATION': { bg: '#D1FAE5', color: '#059669', icon: '✅', label: 'Mejora Implementada' },
      'RECOGNITION': { bg: '#FEF3C7', color: '#D97706', icon: '🏆', label: 'Reconocimiento' },
      'ANNOUNCEMENT': { bg: '#DBEAFE', color: '#2563EB', icon: '📢', label: 'Anuncio' },
      'MILESTONE': { bg: '#E0E7FF', color: '#6366F1', icon: '🎯', label: 'Hito' }
    };

    const config = typeConfig[news.type] || typeConfig['ANNOUNCEMENT'];

    const imageUrl = news.image_url || 'https://via.placeholder.com/400x200?text=Noticia';
    const relatedCount = news.related_experience_ids?.length || 0;

    return `
      <div class="news-card" onclick="CompanyNews.showDetail('${news.id}')">
        <img src="${imageUrl}" alt="${news.title}" class="news-card-image">
        <div class="news-card-content">
          <span class="news-type-badge" style="background: ${config.bg}; color: ${config.color};">
            ${config.icon} ${config.label}
          </span>
          <h3 class="news-title">${news.title}</h3>
          <p class="news-summary">${news.summary || news.content.substring(0, 150) + '...'}</p>
          <div class="news-meta">
            <div class="news-date">
              <i class="bi bi-calendar"></i>
              <span>${this.formatDate(news.published_at)}</span>
            </div>
            ${relatedCount > 0 ? `
              <div class="news-related">
                <i class="bi bi-link-45deg"></i>
                <span>${relatedCount} ${relatedCount === 1 ? 'experiencia' : 'experiencias'}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  async showDetail(newsId) {
    try {
      const response = await fetch(`${this.API_BASE}/news/${newsId}`, {
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (data.success && data.news) {
        this.renderDetailModal(data.news, data.relatedExperiences || []);
      }

    } catch (error) {
      console.error('[COMPANY-NEWS] Error loading detail:', error);
      this.showToast('Error al cargar detalle de la noticia', 'error');
    }
  },

  renderDetailModal(news, relatedExperiences) {
    const typeConfig = {
      'IMPLEMENTATION': { bg: '#D1FAE5', color: '#059669', icon: '✅', label: 'Mejora Implementada' },
      'RECOGNITION': { bg: '#FEF3C7', color: '#D97706', icon: '🏆', label: 'Reconocimiento' },
      'ANNOUNCEMENT': { bg: '#DBEAFE', color: '#2563EB', icon: '📢', label: 'Anuncio' },
      'MILESTONE': { bg: '#E0E7FF', color: '#6366F1', icon: '🎯', label: 'Hito' }
    };

    const config = typeConfig[news.type] || typeConfig['ANNOUNCEMENT'];

    const modalHTML = `
      <div class="modal fade news-detail-modal" id="newsDetailModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-newspaper"></i> Noticia Completa
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <span class="news-type-badge" style="background: ${config.bg}; color: ${config.color};">
                ${config.icon} ${config.label}
              </span>

              <h2 style="margin-top: 15px; margin-bottom: 20px;">${news.title}</h2>

              ${news.image_url ? `<img src="${news.image_url}" alt="${news.title}" class="news-detail-image">` : ''}

              <div class="news-detail-content">
                <p style="white-space: pre-wrap; line-height: 1.8;">${news.content}</p>
              </div>

              <div class="news-meta" style="margin-top: 20px;">
                <div class="news-date">
                  <i class="bi bi-calendar"></i>
                  <span>${this.formatDate(news.published_at)}</span>
                </div>
                <div class="news-date">
                  <i class="bi bi-person"></i>
                  <span>${news.publisher_name || 'Sistema'}</span>
                </div>
              </div>

              ${relatedExperiences.length > 0 ? `
                <div class="related-experiences">
                  <h4><i class="bi bi-link-45deg"></i> Experiencias Relacionadas</h4>
                  ${relatedExperiences.map(exp => `
                    <div class="related-exp-card">
                      <h6>${exp.title}</h6>
                      <p class="mb-0 text-muted" style="font-size: 0.9rem;">${exp.description?.substring(0, 100)}...</p>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('newsDetailModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Insert and show
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('newsDetailModal'));
    modal.show();
  },

  showEmptyState() {
    const container = document.getElementById('newsGrid');
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
        <i class="bi bi-inbox" style="font-size: 4rem; color: #d1d5db;"></i>
        <h4 style="margin-top: 20px; color: #6b7280;">No hay noticias para mostrar</h4>
        <p class="text-muted">Aún no se han publicado noticias en esta categoría</p>
      </div>
    `;
  },

  showError() {
    const container = document.getElementById('newsGrid');
    container.innerHTML = `
      <div style="grid-column: 1 / -1;">
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle"></i>
          Error al cargar noticias. Por favor, intenta recargar la página.
        </div>
      </div>
    `;
  },

  formatDate(dateStr) {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;

    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  showToast(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'error' ? 'danger' : 'success'}`;
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    toast.innerHTML = `
      <i class="bi bi-${type === 'error' ? 'x-circle' : 'check-circle'}"></i>
      ${message}
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  },

  init() {
    this.render();
  }
};

// Exportar
window.CompanyNews = CompanyNews;

// Auto-init si se carga como módulo
if (typeof window.Modules !== 'undefined') {
  window.Modules['company-news'] = CompanyNews;
}

console.log('✅ [COMPANY-NEWS] Módulo cargado');

} // Guard
