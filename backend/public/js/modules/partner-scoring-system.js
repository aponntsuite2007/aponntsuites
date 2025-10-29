/**
 * PARTNER SCORING SYSTEM - JavaScript Module
 *
 * Sistema completo de gestión de partners, scoring y subastas automáticas.
 *
 * CARACTERÍSTICAS:
 * - Scoring automático (5 métricas ponderadas)
 * - Paquetes de soporte
 * - Subastas AUTOMÁTICAS (cuando rating < 2.0 ⭐)
 * - Valoraciones de clientes
 * - Notificaciones masivas a partners con acepta_subastas = true
 *
 * SUB-TABS:
 * - Asociados (Partners List)
 * - Scoring Dashboard
 * - Paquetes de Soporte (Support Packages)
 * - Subastas Automáticas (Auctions)
 * - Valoraciones (Ratings)
 */

const PartnerScoringSystem = {
  // Estado actual
  currentSubTab: 'partners-list',
  currentData: {},
  stats: {},
  auctionTimers: {},

  /**
   * Inicializa el sistema
   */
  init() {
    console.log('🤝 [PARTNER SYSTEM] Inicializando sistema de partners y scoring...');
    this.loadPartnerStats();
    this.loadPartnersList();
  },

  /**
   * Cambia entre sub-tabs de partners
   */
  switchSubTab(subTabId) {
    console.log(`🔄 [PARTNER SYSTEM] Cambiando a sub-tab: ${subTabId}`);

    // Ocultar todos los sub-tabs
    document.querySelectorAll('.partner-subtab-content').forEach(tab => {
      tab.style.display = 'none';
    });

    // Remover clase active de todos los botones
    document.querySelectorAll('.nav-tab-secondary').forEach(btn => {
      btn.classList.remove('active');
    });

    // Mostrar sub-tab seleccionado
    const selectedTab = document.getElementById(subTabId);
    if (selectedTab) {
      selectedTab.style.display = 'block';
    }

    // Activar botón correspondiente
    event.target.classList.add('active');

    // Cargar datos del sub-tab
    this.currentSubTab = subTabId;
    this.loadSubTabData(subTabId);
  },

  /**
   * Carga datos según el sub-tab actual
   */
  async loadSubTabData(subTabId) {
    switch(subTabId) {
      case 'partners-list':
        await this.loadPartnersList();
        break;
      case 'scoring-dashboard':
        await this.loadScoringDashboard();
        break;
      case 'support-packages-list':
        await this.loadSupportPackages();
        break;
      case 'auctions-list':
        await this.loadAuctions();
        break;
      case 'ratings-list':
        await this.loadRatings();
        break;
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * ESTADÍSTICAS GENERALES
   * ═══════════════════════════════════════════════════════════
   */
  async loadPartnerStats() {
    try {
      const response = await fetch('/api/vendors/partners/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error cargando estadísticas');

      const data = await response.json();
      this.stats = data.stats;

      // Actualizar UI
      this.updateStatsUI(data.stats);

    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
      showNotification('Error cargando estadísticas de partners', 'error');
    }
  },

  updateStatsUI(stats) {
    // Actualizar cards de estadísticas
    document.getElementById('totalPartners').textContent = stats.total_partners || 0;
    document.getElementById('activePartners').textContent = stats.active_partners || 0;
    document.getElementById('avgScoring').textContent = `${parseFloat(stats.avg_scoring || 0).toFixed(1)} ⭐`;
    document.getElementById('activeSupportPackages').textContent = stats.active_packages || 0;
    document.getElementById('activeAuctions').textContent = stats.active_auctions || 0;
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * SUB-TAB 1: PARTNERS LIST
   * ═══════════════════════════════════════════════════════════
   */
  async loadPartnersList() {
    try {
      const response = await fetch('/api/vendors/partners', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error cargando partners');

      const data = await response.json();
      this.renderPartnersList(data.partners);

    } catch (error) {
      console.error('❌ Error cargando partners:', error);
      showNotification('Error cargando lista de partners', 'error');
    }
  },

  renderPartnersList(partners) {
    const tbody = document.querySelector('#partners-list table tbody');
    if (!tbody) return;

    if (!partners || partners.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No hay partners registrados</td></tr>';
      return;
    }

    tbody.innerHTML = partners.map(partner => `
      <tr>
        <td>${partner.id}</td>
        <td>
          <strong>${partner.name}</strong><br>
          <small style="color: #6c757d;">${partner.email}</small>
        </td>
        <td>${partner.phone || '-'}</td>
        <td>
          <span class="score-badge ${this.getScoreClass(partner.current_score)}">
            ${parseFloat(partner.current_score || 0).toFixed(1)} ⭐
          </span>
        </td>
        <td>${partner.support_packages_count || 0}</td>
        <td>$${parseFloat(partner.total_commissions || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td>
          <span class="status-badge ${partner.status === 'activo' ? 'active' : 'inactive'}">
            ${partner.status === 'activo' ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 5px;">
            <button class="btn btn-sm btn-info" onclick="PartnerScoringSystem.viewPartnerDetails(${partner.id})" title="Ver detalles">
              👁️
            </button>
            <button class="btn btn-sm btn-primary" onclick="PartnerScoringSystem.viewPartnerScoring(${partner.id})" title="Ver scoring">
              ⭐
            </button>
            <button class="btn btn-sm btn-success" onclick="PartnerScoringSystem.viewPartnerPackages(${partner.id})" title="Ver paquetes">
              📦
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * SUB-TAB 2: SCORING DASHBOARD
   * ═══════════════════════════════════════════════════════════
   */
  async loadScoringDashboard() {
    try {
      const response = await fetch('/api/vendors/partners/scoring/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error cargando scoring dashboard');

      const data = await response.json();
      this.renderScoringDashboard(data);

    } catch (error) {
      console.error('❌ Error cargando scoring dashboard:', error);
      showNotification('Error cargando scoring dashboard', 'error');
    }
  },

  renderScoringDashboard(data) {
    const container = document.getElementById('scoringDashboardContent');
    if (!container) return;

    // Tabla de partners con scoring
    const tbody = container.querySelector('tbody');
    if (!tbody) return;

    if (!data.partners || data.partners.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px;">No hay datos de scoring disponibles</td></tr>';
      return;
    }

    tbody.innerHTML = data.partners.map(partner => {
      const breakdown = partner.score_breakdown || {};
      return `
        <tr>
          <td>${partner.id}</td>
          <td><strong>${partner.name}</strong></td>
          <td>
            <span class="score-badge ${this.getScoreClass(partner.current_score)}">
              ${parseFloat(partner.current_score || 0).toFixed(1)} ⭐
            </span>
          </td>
          <td>${breakdown.rating?.avg_rating ? parseFloat(breakdown.rating.avg_rating).toFixed(1) : '-'}</td>
          <td>${breakdown.response_time?.avg_hours ? parseFloat(breakdown.response_time.avg_hours).toFixed(1) + 'h' : '-'}</td>
          <td>${breakdown.resolution?.resolution_rate ? parseFloat(breakdown.resolution.resolution_rate).toFixed(0) + '%' : '-'}</td>
          <td>${breakdown.sales?.companies_sold || 0}</td>
          <td>${breakdown.tenure?.months ? parseFloat(breakdown.tenure.months).toFixed(0) + 'm' : '-'}</td>
          <td>${partner.score_updated_at ? new Date(partner.score_updated_at).toLocaleDateString('es-AR') : '-'}</td>
          <td>
            <button class="btn btn-sm btn-info" onclick="PartnerScoringSystem.viewScoringDetails(${partner.id})" title="Ver detalles">
              📊
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * SUB-TAB 3: SUPPORT PACKAGES
   * ═══════════════════════════════════════════════════════════
   */
  async loadSupportPackages() {
    try {
      const status = document.getElementById('packageFilterStatus')?.value || '';
      const partner = document.getElementById('packageFilterPartner')?.value || '';

      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (partner) params.append('partner_id', partner);

      const response = await fetch(`/api/vendors/support-packages?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error cargando paquetes de soporte');

      const data = await response.json();
      this.renderSupportPackages(data.packages);

    } catch (error) {
      console.error('❌ Error cargando paquetes:', error);
      showNotification('Error cargando paquetes de soporte', 'error');
    }
  },

  renderSupportPackages(packages) {
    const container = document.getElementById('supportPackagesContainer');
    if (!container) return;

    const tbody = container.querySelector('tbody');
    if (!tbody) return;

    if (!packages || packages.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px;">No hay paquetes de soporte registrados</td></tr>';
      return;
    }

    tbody.innerHTML = packages.map(pkg => `
      <tr>
        <td>${pkg.id}</td>
        <td><strong>${pkg.company_name}</strong></td>
        <td>${pkg.current_support_name}</td>
        <td>${pkg.seller_name}</td>
        <td>
          <span class="score-badge ${this.getScoreClass(pkg.current_rating)}">
            ${parseFloat(pkg.current_rating || 0).toFixed(1)} ⭐
          </span>
          <br>
          <small style="color: #6c757d;">(${pkg.ratings_count || 0} valoraciones)</small>
        </td>
        <td>${parseFloat(pkg.monthly_commission_rate).toFixed(2)}%</td>
        <td><strong>$${parseFloat(pkg.estimated_monthly_amount).toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong></td>
        <td>
          <span class="status-badge ${pkg.status === 'active' ? 'active' : 'inactive'}">
            ${pkg.status === 'active' ? 'Activo' : pkg.status === 'lost' ? 'Perdido' : 'Inactivo'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 5px;">
            <button class="btn btn-sm btn-info" onclick="PartnerScoringSystem.viewPackageDetails(${pkg.id})" title="Ver detalles">
              👁️
            </button>
            ${pkg.status === 'active' ? `
              <button class="btn btn-sm btn-warning" onclick="PartnerScoringSystem.ratePackage(${pkg.id})" title="Valorar">
                ⭐
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * SUB-TAB 4: SUBASTAS AUTOMÁTICAS
   * ⚠️ IMPORTANTE: Subastas NO se crean manualmente
   * Se generan AUTOMÁTICAMENTE cuando partner llega a < 2.0 ⭐
   * ═══════════════════════════════════════════════════════════
   */
  async loadAuctions() {
    try {
      const status = document.getElementById('auctionFilterStatus')?.value || '';

      const params = new URLSearchParams();
      if (status) params.append('status', status);

      const response = await fetch(`/api/vendors/auctions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error cargando subastas');

      const data = await response.json();
      this.renderAuctions(data.auctions);

      // Iniciar timers de countdown
      this.startAuctionTimers(data.auctions);

    } catch (error) {
      console.error('❌ Error cargando subastas:', error);
      showNotification('Error cargando subastas', 'error');
    }
  },

  renderAuctions(auctions) {
    const container = document.getElementById('auctionsContainer');
    if (!container) return;

    const tbody = container.querySelector('tbody');
    if (!tbody) return;

    if (!auctions || auctions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="14" style="text-align: center; padding: 40px;">No hay subastas activas</td></tr>';
      return;
    }

    tbody.innerHTML = auctions.map(auction => {
      // Expandible con información del paquete
      const packageInfo = this.renderPackageInfo(auction);

      // Información de módulos contratados
      const modules = auction.active_modules ? JSON.parse(auction.active_modules) : [];
      const modulesDisplay = modules.length > 0
        ? modules.map(m => `<div style="padding: 2px 0;"><strong>${m.name}</strong>: $${parseFloat(m.price).toLocaleString('es-AR')}</div>`).join('')
        : '-';

      return `
        <tr>
          <td>${auction.id}</td>
          <td style="min-width: 200px;">
            <button class="btn btn-sm btn-info" onclick="PartnerScoringSystem.togglePackageInfo(${auction.id})" style="width: 100%;">
              📦 Ver Información Completa
            </button>
            <div id="packageInfo-${auction.id}" style="display: none; margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px; font-size: 0.85rem;">
              ${packageInfo}
            </div>
          </td>
          <td><strong>${auction.company_name}</strong></td>
          <td>
            ${auction.contracted_employees || 0} / ${auction.max_employees || 0}
          </td>
          <td style="max-width: 200px;">
            <details>
              <summary style="cursor: pointer; color: #667eea; font-weight: 600;">
                ${modules.length} módulos
              </summary>
              <div style="margin-top: 5px; padding: 5px; background: #f8f9fa; border-radius: 3px;">
                ${modulesDisplay}
              </div>
            </details>
          </td>
          <td>
            <strong>${auction.current_support_name}</strong><br>
            <small style="color: #6c757d;">${auction.current_support_email}</small>
          </td>
          <td>
            <span class="score-badge ${this.getScoreClass(auction.current_rating)}">
              ${parseFloat(auction.current_rating || 0).toFixed(1)} ⭐
            </span>
          </td>
          <td><small>${auction.auction_reason}</small></td>
          <td>${parseFloat(auction.starting_commission_rate).toFixed(2)}%</td>
          <td><strong>${parseFloat(auction.current_best_bid).toFixed(2)}%</strong></td>
          <td>${auction.total_bids || 0}</td>
          <td>
            <div class="auction-timer ${this.isAuctionEndingSoon(auction.auction_end_date) ? 'ending-soon' : ''}" id="timer-${auction.id}">
              ${this.calculateTimeRemaining(auction.auction_end_date)}
            </div>
          </td>
          <td>
            <span class="status-badge ${auction.auction_status === 'active' ? 'active' : 'completed'}">
              ${auction.auction_status === 'active' ? 'Activa' : 'Completada'}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 5px;">
              ${auction.auction_status === 'active' ? `
                <button class="btn btn-sm btn-success" onclick="PartnerScoringSystem.placeBid(${auction.id})" title="Ofertar">
                  💰 Ofertar
                </button>
              ` : ''}
              <button class="btn btn-sm btn-info" onclick="PartnerScoringSystem.viewAuctionDetails(${auction.id})" title="Ver detalles">
                👁️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Renderiza información completa del paquete de soporte
   */
  renderPackageInfo(auction) {
    const modules = auction.active_modules ? JSON.parse(auction.active_modules) : [];

    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <strong>🏢 Empresa:</strong> ${auction.company_name}<br>
          <strong>🆔 CUIT:</strong> ${auction.company_tax_id || '-'}<br>
          <strong>📍 Dirección:</strong> ${auction.company_address || '-'}<br>
          <strong>👥 Empleados:</strong> ${auction.contracted_employees}/${auction.max_employees}
        </div>
        <div>
          <strong>👤 Vendedor:</strong> ${auction.seller_name || '-'}<br>
          <strong>🛠️ Soporte Original:</strong> ${auction.original_support_name || '-'}<br>
          <strong>💰 Comisión Estimada:</strong> $${parseFloat(auction.estimated_monthly_amount || 0).toLocaleString('es-AR')}<br>
          <strong>📊 Comisión de Asistencia:</strong> $${parseFloat(auction.commission_from_attendance || 0).toLocaleString('es-AR')}
        </div>
      </div>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #dee2e6;">
        <strong>📦 Módulos Contratados (${modules.length}):</strong>
        <div style="margin-top: 5px; max-height: 150px; overflow-y: auto;">
          ${modules.map(m => `
            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #eee;">
              <span>${m.name}</span>
              <strong>$${parseFloat(m.price).toLocaleString('es-AR')}</strong>
            </div>
          `).join('')}
        </div>
        <div style="margin-top: 5px; text-align: right; font-size: 1.1rem;">
          <strong>Total Mensual: $${parseFloat(auction.monthly_total || 0).toLocaleString('es-AR')}</strong>
        </div>
      </div>
    `;
  },

  /**
   * Toggle de información del paquete
   */
  togglePackageInfo(auctionId) {
    const infoDiv = document.getElementById(`packageInfo-${auctionId}`);
    if (infoDiv) {
      infoDiv.style.display = infoDiv.style.display === 'none' ? 'block' : 'none';
    }
  },

  /**
   * Calcula tiempo restante para la subasta
   */
  calculateTimeRemaining(endDate) {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) {
      return '⏱️ Finalizada';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `⏱️ ${days}d ${hours}h`;
    } else if (hours > 0) {
      return `⏱️ ${hours}h ${minutes}m`;
    } else {
      return `⏱️ ${minutes}m`;
    }
  },

  /**
   * Verifica si la subasta está por finalizar (< 24 horas)
   */
  isAuctionEndingSoon(endDate) {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    const hoursRemaining = diff / (1000 * 60 * 60);
    return hoursRemaining > 0 && hoursRemaining < 24;
  },

  /**
   * Inicia timers de countdown para subastas activas
   */
  startAuctionTimers(auctions) {
    // Limpiar timers anteriores
    Object.values(this.auctionTimers).forEach(timer => clearInterval(timer));
    this.auctionTimers = {};

    // Crear nuevos timers
    auctions.filter(a => a.auction_status === 'active').forEach(auction => {
      this.auctionTimers[auction.id] = setInterval(() => {
        const timerElement = document.getElementById(`timer-${auction.id}`);
        if (timerElement) {
          const timeRemaining = this.calculateTimeRemaining(auction.auction_end_date);
          timerElement.textContent = timeRemaining;

          // Agregar clase ending-soon si corresponde
          if (this.isAuctionEndingSoon(auction.auction_end_date)) {
            timerElement.classList.add('ending-soon');
          }

          // Si finalizó, recargar subastas
          if (timeRemaining === '⏱️ Finalizada') {
            clearInterval(this.auctionTimers[auction.id]);
            this.loadAuctions();
          }
        } else {
          clearInterval(this.auctionTimers[auction.id]);
        }
      }, 60000); // Actualizar cada minuto
    });
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * SUB-TAB 5: VALORACIONES
   * ═══════════════════════════════════════════════════════════
   */
  async loadRatings() {
    try {
      const partner = document.getElementById('ratingFilterPartner')?.value || '';
      const month = document.getElementById('ratingFilterMonth')?.value || '';

      const params = new URLSearchParams();
      if (partner) params.append('partner_id', partner);
      if (month) params.append('month', month);

      const response = await fetch(`/api/vendors/ratings?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error cargando valoraciones');

      const data = await response.json();
      this.renderRatings(data.ratings);

    } catch (error) {
      console.error('❌ Error cargando valoraciones:', error);
      showNotification('Error cargando valoraciones', 'error');
    }
  },

  renderRatings(ratings) {
    const container = document.getElementById('ratingsTableContainer');
    if (!container) return;

    const tbody = container.querySelector('tbody');
    if (!tbody) return;

    if (!ratings || ratings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No hay valoraciones registradas</td></tr>';
      return;
    }

    tbody.innerHTML = ratings.map(rating => `
      <tr>
        <td>${rating.id}</td>
        <td><strong>${rating.rated_partner_name}</strong></td>
        <td>${rating.company_name}</td>
        <td>
          <span class="score-badge ${this.getScoreClass(rating.rating)}">
            ${parseFloat(rating.rating).toFixed(1)} ⭐
          </span>
        </td>
        <td style="max-width: 300px;">${rating.comment || '-'}</td>
        <td>${new Date(rating.created_at).toLocaleDateString('es-AR')}</td>
        <td>
          <button class="btn btn-sm btn-info" onclick="PartnerScoringSystem.viewRatingDetails(${rating.id})" title="Ver detalles">
            👁️
          </button>
        </td>
      </tr>
    `).join('');
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * FUNCIONES DE UTILIDAD
   * ═══════════════════════════════════════════════════════════
   */
  getScoreClass(score) {
    const s = parseFloat(score) || 0;
    if (s >= 4.5) return 'excellent';
    if (s >= 3.5) return 'good';
    if (s >= 2.5) return 'medium';
    if (s >= 1.5) return 'low';
    return 'critical';
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * ACCIONES DE BOTONES
   * ═══════════════════════════════════════════════════════════
   */
  viewPartnerDetails(partnerId) {
    console.log('👁️ Ver detalles del partner:', partnerId);
    // TODO: Implementar modal de detalles
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  viewPartnerScoring(partnerId) {
    console.log('⭐ Ver scoring del partner:', partnerId);
    // TODO: Implementar modal de scoring
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  viewPartnerPackages(partnerId) {
    console.log('📦 Ver paquetes del partner:', partnerId);
    // TODO: Implementar modal de paquetes
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  viewScoringDetails(partnerId) {
    console.log('📊 Ver detalles de scoring:', partnerId);
    // TODO: Implementar modal con gráficos
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  viewPackageDetails(packageId) {
    console.log('👁️ Ver detalles del paquete:', packageId);
    // TODO: Implementar modal de detalles
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  ratePackage(packageId) {
    console.log('⭐ Valorar paquete:', packageId);
    // TODO: Implementar modal de valoración
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  async placeBid(auctionId) {
    const bidRate = prompt('Ingrese su oferta de comisión (%) - debe ser menor a la actual:');
    if (!bidRate) return;

    const rate = parseFloat(bidRate);
    if (isNaN(rate) || rate <= 0) {
      showNotification('Tasa de comisión inválida', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/vendors/auctions/${auctionId}/bid`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bid_rate: rate })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error realizando oferta');
      }

      showNotification('Oferta realizada exitosamente', 'success');
      this.loadAuctions();

    } catch (error) {
      console.error('❌ Error:', error);
      showNotification(error.message || 'Error realizando oferta', 'error');
    }
  },

  viewAuctionDetails(auctionId) {
    console.log('👁️ Ver detalles de la subasta:', auctionId);
    // TODO: Implementar modal de detalles completo
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  viewRatingDetails(ratingId) {
    console.log('👁️ Ver detalles de la valoración:', ratingId);
    // TODO: Implementar modal de detalles
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * FUNCIONES GLOBALES PARA BOTONES DEL HEADER
   * ═══════════════════════════════════════════════════════════
   */
  async calculateAllScoring() {
    if (!confirm('¿Calcular scoring para todos los partners activos?')) return;

    try {
      showNotification('Calculando scoring... esto puede tardar unos segundos', 'info');

      const response = await fetch('/api/vendors/partners/scoring/calculate-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error calculando scoring');

      const data = await response.json();
      showNotification(`Scoring calculado: ${data.scores_updated} partners actualizados`, 'success');

      // Recargar datos
      this.loadPartnerStats();
      if (this.currentSubTab === 'scoring-dashboard') {
        this.loadScoringDashboard();
      }

    } catch (error) {
      console.error('❌ Error:', error);
      showNotification('Error calculando scoring', 'error');
    }
  },

  async viewLowScorePartners() {
    try {
      const response = await fetch('/api/vendors/partners/scoring/low-score', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error cargando partners con bajo scoring');

      const data = await response.json();

      if (data.partners.length === 0) {
        showNotification('✅ No hay partners con scoring bajo', 'success');
        return;
      }

      // TODO: Implementar modal con lista de partners
      alert(`Partners con scoring < 2.5:\n${data.partners.map(p => `- ${p.name}: ${p.current_score.toFixed(1)} ⭐`).join('\n')}`);

    } catch (error) {
      console.error('❌ Error:', error);
      showNotification('Error cargando partners con bajo scoring', 'error');
    }
  },

  showAuctionHelp() {
    const helpText = `
📋 CÓMO FUNCIONAN LAS SUBASTAS AUTOMÁTICAS

⚡ GENERACIÓN AUTOMÁTICA:
Las subastas NO se crean manualmente. Se generan automáticamente cuando un partner alcanza < 2.0 ⭐ de valoración.

🔄 FLUJO AUTOMÁTICO:
1️⃣ Partner llega a < 2.0 estrellas → Trigger automático (CRON diario 02:00 AM)
2️⃣ Sistema crea subasta del paquete de soporte (duración: 7 días)
3️⃣ Notificación MASIVA a todos los partners con "Acepta Subastas" = true
4️⃣ Partners ofertan con comisión más baja
5️⃣ Al finalizar → Paquete se transfiere al ganador

💰 OFERTAS:
- Debe ser MENOR a la comisión actual
- Se muestran todos los detalles del paquete
- El ganador es quien ofrezca la comisión más baja

📦 INFORMACIÓN DEL PAQUETE:
- Empresa completa (CUIT, dirección, empleados)
- Módulos contratados con precios
- Comisión estimada mensual
- Comisión generada por asistencia

✅ VENTAJAS PARA PARTNERS:
- Transparencia total
- Oportunidad de ganar clientes rentables
- Sistema justo basado en desempeño
    `;
    alert(helpText);
  }
};

// Exponer funciones globales para botones en HTML
window.switchPartnerSubTab = (subTabId) => PartnerScoringSystem.switchSubTab(subTabId);
window.calculateAllScoring = () => PartnerScoringSystem.calculateAllScoring();
window.viewLowScorePartners = () => PartnerScoringSystem.viewLowScorePartners();
window.showAuctionHelp = () => PartnerScoringSystem.showAuctionHelp();
window.loadAuctions = () => PartnerScoringSystem.loadAuctions();
window.loadSupportPackages = () => PartnerScoringSystem.loadSupportPackages();
window.loadRatings = () => PartnerScoringSystem.loadRatings();

// Hacer disponible el objeto globalmente
window.PartnerScoringSystem = PartnerScoringSystem;

// Auto-inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ [PARTNER SYSTEM] Módulo cargado');
});
