/**
 * partners-marketplace.js
 *
 * Frontend Marketplace para que empresas busquen y contraten Partners
 *
 * Características:
 * - Browse de partners aprobados
 * - Filtros por rol, ubicación, rating
 * - Vista de perfil completo
 * - Sistema de solicitud de servicio
 * - Reviews y ratings
 * - Tracking de servicios contratados
 */

class PartnersMarketplace {
  constructor() {
    this.partners = [];
    this.partnerRoles = [];
    this.myServiceRequests = [];
    this.currentView = 'browse'; // browse, profile, myServices
    this.selectedPartner = null;
    this.filters = {
      roleId: null,
      city: null,
      minRating: 0,
      search: ''
    };
    this.apiBase = '/api/partners';

    this.init();
  }

  async init() {
    try {
      await this.loadPartnerRoles();
      await this.loadPartners();
      this.setupEventListeners();
      this.renderMarketplace();
    } catch (error) {
      console.error('Error inicializando Partners Marketplace:', error);
      this.showError('Error al cargar el marketplace');
    }
  }

  setupEventListeners() {
    // View switcher
    document.querySelectorAll('.marketplace-view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentView = e.target.dataset.view;
        this.renderMarketplace();
      });
    });

    // Search
    const searchInput = document.getElementById('marketplace-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.applyFilters();
      });
    }

    // Filter by role
    const roleFilter = document.getElementById('filter-role');
    if (roleFilter) {
      roleFilter.addEventListener('change', (e) => {
        this.filters.roleId = e.target.value ? parseInt(e.target.value) : null;
        this.applyFilters();
      });
    }

    // Filter by rating
    const ratingFilter = document.getElementById('filter-rating');
    if (ratingFilter) {
      ratingFilter.addEventListener('change', (e) => {
        this.filters.minRating = parseFloat(e.target.value);
        this.applyFilters();
      });
    }

    // Clear filters
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearFilters();
      });
    }
  }

  async loadPartnerRoles() {
    // Same as admin panel
    this.partnerRoles = [
      { id: 1, role_name: 'Abogado Laboralista', category: 'legal' },
      { id: 2, role_name: 'Médico Laboral', category: 'medical' },
      { id: 3, role_name: 'Responsable de Seguridad e Higiene', category: 'safety' },
      { id: 4, role_name: 'Coach Empresarial', category: 'coaching' },
      { id: 5, role_name: 'Auditor Externo', category: 'audit' },
      { id: 6, role_name: 'Contador Público', category: 'audit' },
      { id: 7, role_name: 'Especialista en RRHH', category: 'coaching' },
      { id: 8, role_name: 'Técnico en Sistemas Biométricos', category: 'safety' },
      { id: 9, role_name: 'Consultor de Compliance', category: 'legal' },
      { id: 10, role_name: 'Psicólogo Organizacional', category: 'health' }
    ];
  }

  async loadPartners() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.apiBase}?status=approved&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al cargar partners');

      const data = await response.json();
      this.partners = data.partners || [];

      this.renderPartnersList();
    } catch (error) {
      console.error('Error cargando partners:', error);
      this.showError('Error al cargar partners');
    }
  }

  async loadMyServiceRequests() {
    try {
      const token = localStorage.getItem('token');
      const companyId = JSON.parse(localStorage.getItem('user'))?.companyId;

      // Este endpoint aún no existe, pero lo podemos crear después
      // Por ahora simulamos datos vacíos
      this.myServiceRequests = [];

      this.renderMyServices();
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
    }
  }

  renderMarketplace() {
    const container = document.getElementById('partners-marketplace-container');
    if (!container) return;

    container.innerHTML = `
      <div class="partners-marketplace">
        <!-- Header -->
        <div class="marketplace-header">
          <h2>🤝 Marketplace de Partners Profesionales</h2>
          <div class="view-switcher">
            <button class="marketplace-view-btn ${this.currentView === 'browse' ? 'active' : ''}" data-view="browse">
              🔍 Explorar Partners
            </button>
            <button class="marketplace-view-btn ${this.currentView === 'myServices' ? 'active' : ''}" data-view="myServices">
              📋 Mis Servicios
            </button>
          </div>
        </div>

        <!-- Content -->
        <div id="marketplace-content"></div>
      </div>
    `;

    if (this.currentView === 'browse') {
      this.renderBrowseView();
    } else if (this.currentView === 'myServices') {
      this.loadMyServiceRequests();
    }
  }

  renderBrowseView() {
    const contentDiv = document.getElementById('marketplace-content');
    if (!contentDiv) return;

    contentDiv.innerHTML = `
      <!-- Filters -->
      <div class="marketplace-filters">
        <div class="filter-group">
          <input
            type="text"
            id="marketplace-search"
            placeholder="🔍 Buscar por nombre, especialización..."
            class="form-control"
          />
        </div>
        <div class="filter-group">
          <select id="filter-role" class="form-control">
            <option value="">Todos los roles</option>
            ${this.partnerRoles.map(role =>
              `<option value="${role.id}">${role.role_name}</option>`
            ).join('')}
          </select>
        </div>
        <div class="filter-group">
          <select id="filter-rating" class="form-control">
            <option value="0">Todas las calificaciones</option>
            <option value="4">⭐ 4+ estrellas</option>
            <option value="4.5">⭐ 4.5+ estrellas</option>
          </select>
        </div>
        <button id="clear-filters" class="btn btn-secondary">Limpiar filtros</button>
      </div>

      <!-- Partners Grid -->
      <div id="partners-grid" class="partners-grid"></div>
    `;

    this.setupEventListeners();
    this.renderPartnersList();
  }

  renderPartnersList() {
    const gridContainer = document.getElementById('partners-grid');
    if (!gridContainer) return;

    let filtered = this.getFilteredPartners();

    if (filtered.length === 0) {
      gridContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search fa-3x"></i>
          <p>No se encontraron partners con los filtros aplicados</p>
          <button class="btn btn-primary" onclick="partnersMarketplace.clearFilters()">
            Limpiar filtros
          </button>
        </div>
      `;
      return;
    }

    gridContainer.innerHTML = filtered.map(partner => this.renderPartnerCard(partner)).join('');

    // Add event listeners to cards
    document.querySelectorAll('.partner-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.btn')) {
          const partnerId = parseInt(card.dataset.partnerId);
          this.showPartnerProfile(partnerId);
        }
      });
    });

    // Add event listeners to request buttons
    document.querySelectorAll('.btn-request-service').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const partnerId = parseInt(e.target.closest('.btn-request-service').dataset.partnerId);
        this.openServiceRequestModal(partnerId);
      });
    });
  }

  renderPartnerCard(partner) {
    const role = this.partnerRoles.find(r => r.id === partner.partner_role_id);
    const ratingStars = this.getRatingStars(partner.rating || 0);

    return `
      <div class="partner-card" data-partner-id="${partner.id}">
        <div class="partner-card-header">
          <div class="partner-card-avatar">
            ${partner.profile_photo_url
              ? `<img src="${partner.profile_photo_url}" alt="${partner.first_name}">`
              : `<div class="avatar-placeholder">${partner.first_name?.charAt(0) || 'P'}</div>`
            }
          </div>
          ${partner.rating >= 4.5 ? '<div class="featured-badge">⭐ Destacado</div>' : ''}
        </div>

        <div class="partner-card-body">
          <h3 class="partner-card-name">${partner.first_name} ${partner.last_name || ''}</h3>
          ${partner.company_name ? `<div class="partner-card-company">${partner.company_name}</div>` : ''}

          <div class="partner-card-role">
            <span class="role-badge ${role?.category || ''}">${role?.role_name || 'Partner'}</span>
          </div>

          <div class="partner-card-rating">
            ${ratingStars}
            <span class="rating-value">${(partner.rating || 0).toFixed(1)}</span>
            ${partner.total_reviews > 0 ? `<span class="review-count">(${partner.total_reviews} reviews)</span>` : ''}
          </div>

          ${partner.bio ? `
            <p class="partner-card-bio">${partner.bio.substring(0, 120)}${partner.bio.length > 120 ? '...' : ''}</p>
          ` : ''}

          <div class="partner-card-info">
            ${partner.years_experience ? `<div>📅 ${partner.years_experience} años de experiencia</div>` : ''}
            ${partner.city ? `<div>📍 ${partner.city}, ${partner.province || ''}</div>` : ''}
            ${partner.languages?.length ? `<div>🌐 ${partner.languages.join(', ')}</div>` : ''}
          </div>

          ${partner.total_services > 0 ? `
            <div class="partner-card-stats">
              <span>✅ ${partner.total_services} servicios completados</span>
            </div>
          ` : ''}
        </div>

        <div class="partner-card-footer">
          <button class="btn btn-primary btn-request-service" data-partner-id="${partner.id}">
            📝 Solicitar Servicio
          </button>
        </div>
      </div>
    `;
  }

  getFilteredPartners() {
    return this.partners.filter(partner => {
      // Role filter
      if (this.filters.roleId && partner.partner_role_id !== this.filters.roleId) {
        return false;
      }

      // Rating filter
      if (this.filters.minRating && (partner.rating || 0) < this.filters.minRating) {
        return false;
      }

      // Search filter
      if (this.filters.search) {
        const searchStr = `${partner.first_name} ${partner.last_name} ${partner.company_name || ''} ${partner.bio || ''}`.toLowerCase();
        if (!searchStr.includes(this.filters.search.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }

  clearFilters() {
    this.filters = {
      roleId: null,
      city: null,
      minRating: 0,
      search: ''
    };

    // Reset form inputs
    const searchInput = document.getElementById('marketplace-search');
    if (searchInput) searchInput.value = '';

    const roleFilter = document.getElementById('filter-role');
    if (roleFilter) roleFilter.value = '';

    const ratingFilter = document.getElementById('filter-rating');
    if (ratingFilter) ratingFilter.value = '0';

    this.renderPartnersList();
  }

  applyFilters() {
    this.renderPartnersList();
  }

  showPartnerProfile(partnerId) {
    const partner = this.partners.find(p => p.id === partnerId);
    if (!partner) return;

    const role = this.partnerRoles.find(r => r.id === partner.partner_role_id);
    const ratingStars = this.getRatingStars(partner.rating || 0);

    const contentDiv = document.getElementById('marketplace-content');
    contentDiv.innerHTML = `
      <div class="partner-profile">
        <button class="btn-back" onclick="partnersMarketplace.currentView='browse';partnersMarketplace.renderBrowseView()">
          ← Volver a la lista
        </button>

        <div class="profile-header">
          <div class="profile-avatar-large">
            ${partner.profile_photo_url
              ? `<img src="${partner.profile_photo_url}" alt="${partner.first_name}">`
              : `<div class="avatar-placeholder">${partner.first_name?.charAt(0) || 'P'}</div>`
            }
          </div>
          <div class="profile-header-info">
            <h2>${partner.first_name} ${partner.last_name || ''}</h2>
            ${partner.company_name ? `<div class="profile-company">${partner.company_name}</div>` : ''}
            <div class="profile-role">
              <span class="role-badge ${role?.category || ''}">${role?.role_name || 'Partner'}</span>
            </div>
            <div class="profile-rating">
              ${ratingStars}
              <span class="rating-value">${(partner.rating || 0).toFixed(1)}</span>
              ${partner.total_reviews > 0 ? `<span class="review-count">(${partner.total_reviews} reviews)</span>` : ''}
            </div>
            <button class="btn btn-primary btn-large" onclick="partnersMarketplace.openServiceRequestModal(${partner.id})">
              📝 Solicitar Servicio
            </button>
          </div>
        </div>

        <div class="profile-content">
          <div class="profile-section">
            <h3>📋 Sobre el profesional</h3>
            <p>${partner.bio || 'Sin descripción disponible'}</p>
          </div>

          <div class="profile-section">
            <h3>💼 Experiencia y Formación</h3>
            <div class="profile-details-grid">
              ${partner.years_experience ? `<div><strong>Años de experiencia:</strong> ${partner.years_experience}</div>` : ''}
              ${partner.specializations?.length ? `<div><strong>Especializaciones:</strong> ${partner.specializations.join(', ')}</div>` : ''}
              ${partner.languages?.length ? `<div><strong>Idiomas:</strong> ${partner.languages.join(', ')}</div>` : ''}
            </div>
          </div>

          ${partner.has_insurance ? `
            <div class="profile-section">
              <h3>🛡️ Seguro Profesional</h3>
              <p>✅ Este profesional cuenta con seguro de responsabilidad civil</p>
              <div class="profile-details-grid">
                <div><strong>Aseguradora:</strong> ${partner.insurance_provider}</div>
                <div><strong>Vigencia:</strong> hasta ${new Date(partner.insurance_expiry_date).toLocaleDateString('es-AR')}</div>
              </div>
            </div>
          ` : ''}

          <div class="profile-section">
            <h3>📊 Estadísticas</h3>
            <div class="stats-grid-small">
              <div class="stat-item">
                <div class="stat-number">${partner.total_services || 0}</div>
                <div class="stat-label">Servicios completados</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">${partner.total_reviews || 0}</div>
                <div class="stat-label">Reviews recibidos</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">${(partner.rating || 0).toFixed(1)}</div>
                <div class="stat-label">Rating promedio</div>
              </div>
            </div>
          </div>

          <div class="profile-section">
            <h3>📍 Ubicación y Contacto</h3>
            <div class="profile-details-grid">
              ${partner.city ? `<div><strong>Ciudad:</strong> ${partner.city}, ${partner.province || ''}</div>` : ''}
              ${partner.service_radius_km ? `<div><strong>Radio de servicio:</strong> ${partner.service_radius_km} km</div>` : ''}
              ${partner.website ? `<div><strong>Sitio web:</strong> <a href="${partner.website}" target="_blank">${partner.website}</a></div>` : ''}
              ${partner.linkedin_url ? `<div><strong>LinkedIn:</strong> <a href="${partner.linkedin_url}" target="_blank">Ver perfil</a></div>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  openServiceRequestModal(partnerId) {
    const partner = this.partners.find(p => p.id === partnerId);
    if (!partner) return;

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Solicitar Servicio</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="service-request-form">
            <div class="form-group">
              <label>Partner seleccionado:</label>
              <div class="selected-partner-info">
                <strong>${partner.first_name} ${partner.last_name || ''}</strong>
                ${partner.company_name ? ` - ${partner.company_name}` : ''}
              </div>
            </div>

            <div class="form-group">
              <label for="service-type">Tipo de servicio *</label>
              <select id="service-type" class="form-control" required>
                <option value="">Seleccionar...</option>
                <option value="consultoria">Consultoría</option>
                <option value="auditoria">Auditoría</option>
                <option value="capacitacion">Capacitación</option>
                <option value="asesoria">Asesoría</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div class="form-group">
              <label for="service-description">Descripción del servicio requerido *</label>
              <textarea
                id="service-description"
                class="form-control"
                rows="4"
                placeholder="Describe en detalle el servicio que necesitas..."
                required
              ></textarea>
            </div>

            <div class="form-group">
              <label for="scheduled-date">Fecha deseada</label>
              <input type="date" id="scheduled-date" class="form-control" />
            </div>

            <div class="form-group">
              <label for="additional-notes">Notas adicionales</label>
              <textarea
                id="additional-notes"
                class="form-control"
                rows="2"
                placeholder="Información adicional que consideres relevante..."
              ></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary modal-cancel">Cancelar</button>
              <button type="submit" class="btn btn-primary">Enviar Solicitud</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelector('#service-request-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitServiceRequest(partnerId, {
        serviceType: document.getElementById('service-type').value,
        serviceDescription: document.getElementById('service-description').value,
        scheduledDate: document.getElementById('scheduled-date').value,
        additionalNotes: document.getElementById('additional-notes').value
      });
      modal.remove();
    });
  }

  async submitServiceRequest(partnerId, data) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.apiBase}/service-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          partnerId,
          serviceType: data.serviceType,
          serviceDescription: data.serviceDescription,
          scheduledDate: data.scheduledDate || null
        })
      });

      if (!response.ok) throw new Error('Error al crear solicitud');

      this.showSuccess('¡Solicitud enviada! El partner será notificado y se pondrá en contacto contigo.');
    } catch (error) {
      console.error('Error enviando solicitud:', error);
      this.showError('Error al enviar la solicitud');
    }
  }

  renderMyServices() {
    const contentDiv = document.getElementById('marketplace-content');
    contentDiv.innerHTML = `
      <div class="my-services">
        <h3>Mis Servicios Contratados</h3>
        ${this.myServiceRequests.length === 0 ? `
          <div class="empty-state">
            <i class="fas fa-clipboard-list fa-3x"></i>
            <p>Aún no has solicitado ningún servicio</p>
            <button class="btn btn-primary" onclick="partnersMarketplace.currentView='browse';partnersMarketplace.renderBrowseView()">
              Explorar Partners
            </button>
          </div>
        ` : `
          <div class="services-list">
            ${this.myServiceRequests.map(req => this.renderServiceRequest(req)).join('')}
          </div>
        `}
      </div>
    `;
  }

  renderServiceRequest(request) {
    return `
      <div class="service-request-card">
        <div class="service-request-header">
          <h4>${request.serviceType}</h4>
          <span class="status-badge ${request.status}">${request.status}</span>
        </div>
        <div class="service-request-body">
          <p>${request.serviceDescription}</p>
          <div class="request-meta">
            <span>📅 ${new Date(request.created_at).toLocaleDateString('es-AR')}</span>
            <span>👤 ${request.partner.name}</span>
          </div>
        </div>
      </div>
    `;
  }

  getRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return '⭐'.repeat(fullStars) +
           (hasHalfStar ? '✨' : '') +
           '☆'.repeat(emptyStars);
  }

  showSuccess(message) {
    alert('✅ ' + message);
  }

  showError(message) {
    alert('❌ ' + message);
  }
}

// Initialize
let partnersMarketplace;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    partnersMarketplace = new PartnersMarketplace();
  });
} else {
  partnersMarketplace = new PartnersMarketplace();
}

window.PartnersMarketplace = PartnersMarketplace;
window.partnersMarketplace = partnersMarketplace;
