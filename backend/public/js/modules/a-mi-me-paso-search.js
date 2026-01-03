/**
 * A MI ME PASO - Búsqueda Inteligente Multi-Fuente
 *
 * Integración con Voice Platform para búsqueda inteligente de soluciones
 * Busca en: experiencias resueltas, mis aportes, noticias, procedimientos
 *
 * @version 1.0.0
 * @date 2025-12-24
 */

// ============================================================================
// GUARD: Evitar carga duplicada
// ============================================================================
if (window._aMiMePasoLoaded) {
  console.log('⚠️ [A-MI-ME-PASO] Ya cargado, omitiendo');
} else {
window._aMiMePasoLoaded = true;

console.log('%c 🎯 A MI ME PASO v1.0 ', 'background: linear-gradient(90deg, #FF6B6B 0%, #FFA500 100%); color: white; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

const AMiMePaso = {
  // API Base
  API_BASE: '/api/a-mi-me-paso',

  // Estado
  state: {
    currentSearchId: null,
    lastQuery: '',
    results: {
      exact: [],
      high: [],
      medium: [],
      low: []
    }
  },

  // =========================================================================
  // AUTH TOKEN
  // =========================================================================
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
  // API: BÚSQUEDA
  // =========================================================================
  async search(query) {
    if (!query || query.trim().length < 3) {
      this.showError('La búsqueda debe tener al menos 3 caracteres');
      return;
    }

    try {
      this.showSearchLoading();

      const response = await fetch(`${this.API_BASE}/search`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ query: query.trim() })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error en la búsqueda');
      }

      this.state.lastQuery = query;
      this.state.results = data.results;
      this.state.currentSearchId = data.searchId;

      this.renderResults(data);

    } catch (error) {
      console.error('[A-MI-ME-PASO] Error en búsqueda:', error);
      this.showError(error.message);
    }
  },

  // =========================================================================
  // API: FEEDBACK
  // =========================================================================
  async submitFeedback(searchId, wasHelpful, comment = null) {
    try {
      const response = await fetch(`${this.API_BASE}/feedback`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          searchId,
          wasHelpful,
          feedbackComment: comment
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al enviar feedback');
      }

      this.showSuccess('¡Gracias por tu feedback!');

    } catch (error) {
      console.error('[A-MI-ME-PASO] Error en feedback:', error);
      this.showError('No se pudo enviar el feedback');
    }
  },

  // =========================================================================
  // UI: MODAL DE BÚSQUEDA
  // =========================================================================
  showSearchModal() {
    const modalHTML = `
      <div class="modal fade" id="aMiMePasoModal" tabindex="-1">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header" style="background: linear-gradient(135deg, #FF6B6B 0%, #FFA500 100%); color: white;">
              <h5 class="modal-title">
                <i class="bi bi-search"></i> 🎯 A MI ME PASO
                <small class="d-block mt-1" style="font-size: 0.85rem; opacity: 0.9;">
                  Búsqueda inteligente en experiencias, procedimientos y noticias
                </small>
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <!-- Barra de búsqueda -->
              <div class="search-bar mb-4">
                <div class="input-group input-group-lg">
                  <span class="input-group-text">
                    <i class="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control"
                    id="aMiMePasoSearchInput"
                    placeholder="¿Qué te pasó? Ej: 'Cómo hacer entrega de turno', 'Sistema no carga', etc."
                    autocomplete="off"
                  >
                  <button class="btn btn-primary" id="btnExecuteSearch">
                    Buscar
                  </button>
                </div>
                <div class="mt-2 text-muted small">
                  💡 Tip: Describe tu situación con palabras clave simples
                </div>
              </div>

              <!-- Loading -->
              <div id="aMiMePasoLoading" style="display: none;">
                <div class="text-center py-5">
                  <div class="spinner-border text-primary" role="status"></div>
                  <p class="mt-3 text-muted">Buscando en todas las fuentes...</p>
                </div>
              </div>

              <!-- Resultados -->
              <div id="aMiMePasoResults"></div>

            </div>
          </div>
        </div>
      </div>
    `;

    // Eliminar modal anterior si existe
    document.querySelector('#aMiMePasoModal')?.remove();

    // Insertar modal en el DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('aMiMePasoModal'));
    modal.show();

    // Event listeners
    this.attachSearchListeners();
  },

  attachSearchListeners() {
    // Enter en input
    document.getElementById('aMiMePasoSearchInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.executeSearch();
      }
    });

    // Botón buscar
    document.getElementById('btnExecuteSearch')?.addEventListener('click', () => {
      this.executeSearch();
    });
  },

  executeSearch() {
    const input = document.getElementById('aMiMePasoSearchInput');
    const query = input?.value.trim();

    if (query) {
      this.search(query);
    }
  },

  // =========================================================================
  // UI: MOSTRAR RESULTADOS
  // =========================================================================
  showSearchLoading() {
    document.getElementById('aMiMePasoLoading').style.display = 'block';
    document.getElementById('aMiMePasoResults').innerHTML = '';
  },

  renderResults(data) {
    document.getElementById('aMiMePasoLoading').style.display = 'none';

    const container = document.getElementById('aMiMePasoResults');
    const { exact, high, medium, low } = data.results;
    const totalResults = exact.length + high.length + medium.length + low.length;

    if (totalResults === 0) {
      container.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle"></i>
          No encontramos resultados para "${this.state.lastQuery}".
          <hr>
          <p class="mb-0 small">
            💡 Intenta con otras palabras clave o pregunta en el dashboard principal
          </p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="results-header mb-4">
        <h6>
          Encontramos <strong>${totalResults}</strong> resultado${totalResults !== 1 ? 's' : ''}
          para <strong>"${this.state.lastQuery}"</strong>
        </h6>
        <div class="mt-2">
          <small class="text-muted">
            Tiempo de búsqueda: ${data.searchTime}s
          </small>
        </div>
      </div>
    `;

    // Renderizar cada categoría
    if (exact.length > 0) {
      html += this.renderResultCategory('EXACT', '🎯 Coincidencia Exacta', exact, '#10B981');
    }
    if (high.length > 0) {
      html += this.renderResultCategory('HIGH', '✅ Alta Relevancia', high, '#3B82F6');
    }
    if (medium.length > 0) {
      html += this.renderResultCategory('MEDIUM', '📌 Relevancia Media', medium, '#F59E0B');
    }
    if (low.length > 0) {
      html += this.renderResultCategory('LOW', '💡 Podría Ayudar', low, '#9CA3AF');
    }

    // Botones de feedback general
    html += `
      <div class="mt-4 text-center">
        <p class="text-muted mb-2">¿Te fue útil esta búsqueda?</p>
        <button class="btn btn-success btn-sm" onclick="AMiMePaso.submitFeedback('${data.searchId}', true)">
          <i class="bi bi-hand-thumbs-up"></i> Sí, me ayudó
        </button>
        <button class="btn btn-outline-secondary btn-sm ms-2" onclick="AMiMePaso.submitFeedback('${data.searchId}', false)">
          <i class="bi bi-hand-thumbs-down"></i> No me sirvió
        </button>
      </div>
    `;

    container.innerHTML = html;
  },

  renderResultCategory(level, title, results, color) {
    return `
      <div class="result-category mb-4">
        <h6 style="color: ${color}; font-weight: bold;">
          ${title} (${results.length})
        </h6>
        <div class="results-list">
          ${results.map(r => this.renderResultCard(r, level, color)).join('')}
        </div>
      </div>
    `;
  },

  renderResultCard(result, level, color) {
    const sourceIcon = {
      'experience_resolved': '💡',
      'my_experience': '📝',
      'news': '📰',
      'procedure': '📋'
    }[result.source] || '📄';

    const sourceLabel = {
      'experience_resolved': 'Experiencia Implementada',
      'my_experience': 'Mi Aporte',
      'news': 'Noticia',
      'procedure': 'Procedimiento'
    }[result.source] || 'Documento';

    return `
      <div class="card mb-3" style="border-left: 4px solid ${color};">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="card-title mb-0">
              ${sourceIcon} ${result.title || 'Sin título'}
            </h6>
            <span class="badge" style="background-color: ${color};">
              ${Math.round(result.score)}% match
            </span>
          </div>

          <p class="card-text text-muted small mb-2">
            ${result.description || result.content?.substring(0, 200) || ''}
          </p>

          <div class="mt-2">
            <span class="badge bg-light text-dark">
              <i class="bi bi-tag"></i> ${sourceLabel}
            </span>
            ${result.department_name ? `
              <span class="badge bg-light text-dark ms-1">
                <i class="bi bi-building"></i> ${result.department_name}
              </span>
            ` : ''}
          </div>

          ${result.relevance_explanation ? `
            <div class="alert alert-light mt-2 mb-0 small">
              <strong>Por qué es relevante:</strong> ${result.relevance_explanation}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  // =========================================================================
  // UI: MENSAJES
  // =========================================================================
  showSuccess(message) {
    this.showToast(message, 'success');
  },

  showError(message) {
    const container = document.getElementById('aMiMePasoResults');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle"></i> ${message}
        </div>
      `;
    }
    document.getElementById('aMiMePasoLoading').style.display = 'none';
  },

  showToast(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`;
    toast.style.zIndex = '9999';
    toast.innerHTML = `<i class="bi bi-check-circle"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
};

// Exportar globalmente
window.AMiMePaso = AMiMePaso;

console.log('✅ [A-MI-ME-PASO] Módulo cargado correctamente');

} // Cierre del guard
