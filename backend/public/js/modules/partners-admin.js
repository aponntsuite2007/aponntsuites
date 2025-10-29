/**
 * partners-admin.js
 *
 * Frontend Admin Panel para gestión del Sistema de Partners Marketplace
 *
 * Características:
 * - Listado de partners (pendientes, aprobados, rechazados)
 * - Aprobación/Rechazo de solicitudes
 * - Vista de documentos y verificación
 * - Estadísticas y métricas
 * - Gestión de roles de partners
 * - Sistema de reviews y ratings
 */

class PartnersAdminPanel {
  constructor() {
    this.partners = [];
    this.partnerRoles = [];
    this.currentPartner = null;
    this.currentFilter = 'pending'; // pending, approved, rejected, all
    this.apiBase = '/api/partners';

    this.init();
  }

  async init() {
    try {
      await this.loadPartnerRoles();
      await this.loadPartners();
      this.setupEventListeners();
      this.renderDashboard();
    } catch (error) {
      console.error('Error inicializando Partners Admin Panel:', error);
      this.showError('Error al cargar el panel de administración');
    }
  }

  setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.partner-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentFilter = e.target.dataset.filter;
        this.renderPartnersList();
      });
    });

    // Search
    const searchInput = document.getElementById('partners-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchPartners(e.target.value);
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('partners-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadPartners());
    }
  }

  async loadPartnerRoles() {
    try {
      // Los roles están pre-cargados en la BD
      // Por ahora los definimos aquí, luego se puede crear un endpoint
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
    } catch (error) {
      console.error('Error cargando roles:', error);
    }
  }

  async loadPartners() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.apiBase}?status=all&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al cargar partners');

      const data = await response.json();
      this.partners = data.partners || [];

      this.renderPartnersList();
      this.renderStats();
    } catch (error) {
      console.error('Error cargando partners:', error);
      this.showError('Error al cargar partners');
    }
  }

  renderDashboard() {
    const container = document.getElementById('partners-admin-container');
    if (!container) return;

    container.innerHTML = `
      <div class="partners-admin-panel">
        <!-- Header -->
        <div class="panel-header">
          <h2>🤝 Sistema de Partners Marketplace</h2>
          <button id="partners-refresh" class="btn btn-secondary">
            <i class="fas fa-sync-alt"></i> Actualizar
          </button>
        </div>

        <!-- Stats Cards -->
        <div id="partners-stats" class="stats-container"></div>

        <!-- Filters and Search -->
        <div class="panel-controls">
          <div class="filter-buttons">
            <button class="partner-filter-btn active" data-filter="pending">
              ⏳ Pendientes
            </button>
            <button class="partner-filter-btn" data-filter="approved">
              ✅ Aprobados
            </button>
            <button class="partner-filter-btn" data-filter="rejected">
              ❌ Rechazados
            </button>
            <button class="partner-filter-btn" data-filter="all">
              📋 Todos
            </button>
          </div>
          <div class="search-box">
            <input
              type="text"
              id="partners-search"
              placeholder="Buscar por nombre, email, rol..."
              class="form-control"
            />
          </div>
        </div>

        <!-- Partners List -->
        <div id="partners-list" class="partners-list"></div>

        <!-- Partner Details Modal -->
        <div id="partner-details-modal" class="modal" style="display: none;">
          <div class="modal-content"></div>
        </div>
      </div>
    `;

    this.renderStats();
    this.renderPartnersList();
  }

  renderStats() {
    const statsContainer = document.getElementById('partners-stats');
    if (!statsContainer) return;

    const pending = this.partners.filter(p => p.status === 'pending').length;
    const approved = this.partners.filter(p => p.status === 'approved').length;
    const rejected = this.partners.filter(p => p.status === 'rejected').length;
    const avgRating = this.calculateAvgRating();

    statsContainer.innerHTML = `
      <div class="stat-card pending">
        <div class="stat-icon">⏳</div>
        <div class="stat-info">
          <div class="stat-value">${pending}</div>
          <div class="stat-label">Pendientes</div>
        </div>
      </div>
      <div class="stat-card approved">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <div class="stat-value">${approved}</div>
          <div class="stat-label">Aprobados</div>
        </div>
      </div>
      <div class="stat-card rejected">
        <div class="stat-icon">❌</div>
        <div class="stat-info">
          <div class="stat-value">${rejected}</div>
          <div class="stat-label">Rechazados</div>
        </div>
      </div>
      <div class="stat-card rating">
        <div class="stat-icon">⭐</div>
        <div class="stat-info">
          <div class="stat-value">${avgRating.toFixed(1)}</div>
          <div class="stat-label">Rating Promedio</div>
        </div>
      </div>
    `;
  }

  calculateAvgRating() {
    const approved = this.partners.filter(p => p.status === 'approved' && p.rating > 0);
    if (approved.length === 0) return 0;
    const sum = approved.reduce((acc, p) => acc + parseFloat(p.rating || 0), 0);
    return sum / approved.length;
  }

  renderPartnersList() {
    const listContainer = document.getElementById('partners-list');
    if (!listContainer) return;

    let filtered = this.partners;

    // Apply status filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(p => p.status === this.currentFilter);
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-user-friends fa-3x"></i>
          <p>No hay partners ${this.currentFilter !== 'all' ? this.currentFilter + 's' : ''}</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = `
      <table class="partners-table">
        <thead>
          <tr>
            <th>Partner</th>
            <th>Rol</th>
            <th>Contacto</th>
            <th>Rating</th>
            <th>Estado</th>
            <th>Fecha Registro</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(partner => this.renderPartnerRow(partner)).join('')}
        </tbody>
      </table>
    `;

    // Add event listeners to action buttons
    this.setupPartnerActions();
  }

  renderPartnerRow(partner) {
    const role = this.partnerRoles.find(r => r.id === partner.partner_role_id);
    const roleName = role ? role.role_name : 'Sin rol';
    const statusBadge = this.getStatusBadge(partner.status);
    const ratingStars = this.getRatingStars(partner.rating || 0);

    return `
      <tr data-partner-id="${partner.id}">
        <td>
          <div class="partner-info">
            <div class="partner-avatar">
              ${partner.profile_photo_url
                ? `<img src="${partner.profile_photo_url}" alt="${partner.first_name}">`
                : `<div class="avatar-placeholder">${partner.first_name?.charAt(0) || 'P'}</div>`
              }
            </div>
            <div>
              <div class="partner-name">${partner.first_name} ${partner.last_name || ''}</div>
              ${partner.company_name ? `<div class="partner-company">${partner.company_name}</div>` : ''}
            </div>
          </div>
        </td>
        <td>
          <span class="role-badge ${role?.category || ''}">${roleName}</span>
        </td>
        <td>
          <div class="contact-info">
            <div>${partner.email}</div>
            ${partner.phone ? `<div class="phone">${partner.phone}</div>` : ''}
          </div>
        </td>
        <td>
          <div class="rating-display">
            ${ratingStars}
            <span class="rating-value">${(partner.rating || 0).toFixed(1)}</span>
            ${partner.total_reviews > 0 ? `<span class="review-count">(${partner.total_reviews})</span>` : ''}
          </div>
        </td>
        <td>${statusBadge}</td>
        <td>${new Date(partner.created_at).toLocaleDateString('es-AR')}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon view-partner" data-partner-id="${partner.id}" title="Ver detalles">
              <i class="fas fa-eye"></i>
            </button>
            ${partner.status === 'pending' ? `
              <button class="btn-icon approve-partner" data-partner-id="${partner.id}" title="Aprobar">
                <i class="fas fa-check" style="color: #28a745;"></i>
              </button>
              <button class="btn-icon reject-partner" data-partner-id="${partner.id}" title="Rechazar">
                <i class="fas fa-times" style="color: #dc3545;"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  getStatusBadge(status) {
    const badges = {
      'pending': '<span class="status-badge pending">⏳ Pendiente</span>',
      'approved': '<span class="status-badge approved">✅ Aprobado</span>',
      'rejected': '<span class="status-badge rejected">❌ Rechazado</span>',
      'suspended': '<span class="status-badge suspended">⛔ Suspendido</span>'
    };
    return badges[status] || status;
  }

  getRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return '⭐'.repeat(fullStars) +
           (hasHalfStar ? '✨' : '') +
           '☆'.repeat(emptyStars);
  }

  setupPartnerActions() {
    // View details
    document.querySelectorAll('.view-partner').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const partnerId = parseInt(e.currentTarget.dataset.partnerId);
        this.showPartnerDetails(partnerId);
      });
    });

    // Approve
    document.querySelectorAll('.approve-partner').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const partnerId = parseInt(e.currentTarget.dataset.partnerId);
        await this.approvePartner(partnerId);
      });
    });

    // Reject
    document.querySelectorAll('.reject-partner').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const partnerId = parseInt(e.currentTarget.dataset.partnerId);
        await this.rejectPartner(partnerId);
      });
    });
  }

  async showPartnerDetails(partnerId) {
    const partner = this.partners.find(p => p.id === partnerId);
    if (!partner) return;

    const role = this.partnerRoles.find(r => r.id === partner.partner_role_id);

    const modal = document.getElementById('partner-details-modal');
    const modalContent = modal.querySelector('.modal-content');

    modalContent.innerHTML = `
      <div class="modal-header">
        <h3>Detalles del Partner</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="partner-detail-section">
          <h4>Información Personal</h4>
          <div class="detail-grid">
            <div><strong>Nombre:</strong> ${partner.first_name} ${partner.last_name || ''}</div>
            <div><strong>Email:</strong> ${partner.email}</div>
            <div><strong>Teléfono:</strong> ${partner.phone || 'No especificado'}</div>
            <div><strong>Rol:</strong> ${role?.role_name || 'Sin rol'}</div>
          </div>
        </div>

        ${partner.company_name ? `
          <div class="partner-detail-section">
            <h4>Información de Empresa</h4>
            <div class="detail-grid">
              <div><strong>Empresa:</strong> ${partner.company_name}</div>
              <div><strong>CUIT:</strong> ${partner.tax_id || 'No especificado'}</div>
            </div>
          </div>
        ` : ''}

        <div class="partner-detail-section">
          <h4>Ubicación</h4>
          <div class="detail-grid">
            <div><strong>Dirección:</strong> ${partner.address || 'No especificada'}</div>
            <div><strong>Ciudad:</strong> ${partner.city || 'No especificada'}</div>
            <div><strong>Provincia:</strong> ${partner.province || 'No especificada'}</div>
          </div>
        </div>

        <div class="partner-detail-section">
          <h4>Experiencia Profesional</h4>
          <div class="detail-grid">
            <div><strong>Años de experiencia:</strong> ${partner.years_experience || 'No especificado'}</div>
            <div><strong>Idiomas:</strong> ${partner.languages?.join(', ') || 'Español'}</div>
          </div>
          ${partner.specializations?.length ? `
            <div><strong>Especializaciones:</strong> ${partner.specializations.join(', ')}</div>
          ` : ''}
          ${partner.bio ? `
            <div><strong>Bio:</strong><br>${partner.bio}</div>
          ` : ''}
        </div>

        ${partner.has_insurance ? `
          <div class="partner-detail-section">
            <h4>Seguro Profesional</h4>
            <div class="detail-grid">
              <div><strong>Aseguradora:</strong> ${partner.insurance_provider}</div>
              <div><strong>Póliza:</strong> ${partner.insurance_policy_number}</div>
              <div><strong>Vencimiento:</strong> ${new Date(partner.insurance_expiry_date).toLocaleDateString('es-AR')}</div>
            </div>
          </div>
        ` : ''}

        <div class="partner-detail-section">
          <h4>Estado y Estadísticas</h4>
          <div class="detail-grid">
            <div><strong>Estado:</strong> ${this.getStatusBadge(partner.status)}</div>
            <div><strong>Rating:</strong> ${this.getRatingStars(partner.rating || 0)} ${(partner.rating || 0).toFixed(1)}</div>
            <div><strong>Total Reviews:</strong> ${partner.total_reviews || 0}</div>
            <div><strong>Servicios completados:</strong> ${partner.total_services || 0}</div>
            <div><strong>Fecha de registro:</strong> ${new Date(partner.created_at).toLocaleDateString('es-AR')}</div>
          </div>
        </div>

        ${partner.status === 'pending' ? `
          <div class="partner-detail-section">
            <h4>Acciones de Aprobación</h4>
            <div class="approval-actions">
              <button class="btn btn-success" onclick="partnersAdmin.approvePartner(${partner.id})">
                ✅ Aprobar Partner
              </button>
              <button class="btn btn-danger" onclick="partnersAdmin.rejectPartner(${partner.id})">
                ❌ Rechazar Solicitud
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Show modal
    modal.style.display = 'block';

    // Close button
    modalContent.querySelector('.modal-close').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  async approvePartner(partnerId) {
    if (!confirm('¿Estás seguro de aprobar este partner? Podrá acceder al marketplace.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.apiBase}/${partnerId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al aprobar partner');

      this.showSuccess('Partner aprobado exitosamente');
      await this.loadPartners();

      // Close modal if open
      document.getElementById('partner-details-modal').style.display = 'none';
    } catch (error) {
      console.error('Error aprobando partner:', error);
      this.showError('Error al aprobar partner');
    }
  }

  async rejectPartner(partnerId) {
    const reason = prompt('Ingresa la razón del rechazo (opcional):');

    if (reason === null) return; // User cancelled

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.apiBase}/${partnerId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) throw new Error('Error al rechazar partner');

      this.showSuccess('Partner rechazado');
      await this.loadPartners();

      // Close modal if open
      document.getElementById('partner-details-modal').style.display = 'none';
    } catch (error) {
      console.error('Error rechazando partner:', error);
      this.showError('Error al rechazar partner');
    }
  }

  searchPartners(query) {
    if (!query) {
      this.renderPartnersList();
      return;
    }

    const filtered = this.partners.filter(p => {
      const searchStr = `${p.first_name} ${p.last_name} ${p.email} ${p.company_name || ''}`.toLowerCase();
      return searchStr.includes(query.toLowerCase());
    });

    // Temporarily replace partners for rendering
    const originalPartners = this.partners;
    this.partners = filtered;
    this.renderPartnersList();
    this.partners = originalPartners;
  }

  showSuccess(message) {
    // Simple toast notification - you can use a library like Toastify
    alert('✅ ' + message);
  }

  showError(message) {
    alert('❌ ' + message);
  }
}

// Initialize on page load
let partnersAdmin;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    partnersAdmin = new PartnersAdminPanel();
  });
} else {
  partnersAdmin = new PartnersAdminPanel();
}

// Export for use in HTML
window.PartnersAdminPanel = PartnersAdminPanel;
window.partnersAdmin = partnersAdmin;
