/**
 * notification-billing-dashboard.js
 *
 * Dashboard de Gestión de Canales de Pago para Aponnt
 * Ubicación: Panel Administrativo → Módulos del Sistema → Gestión de Canales de Pago
 *
 * FUNCIONALIDADES:
 * - Dashboard general (costos Aponnt, revenue empresas, profit)
 * - Tarifación por empresa y canal
 * - Suspensión/habilitación de canales
 * - Facturación mensual
 * - Gráficos de consumo y costos
 * - Mensajes entrantes (respuestas SMS/WhatsApp)
 */

const NotificationBillingDashboard = {
  currentView: 'dashboard',
  currentPeriod: null, // {year, month}
  selectedCompany: null,

  async init() {
    console.log('💰 [BILLING-DASHBOARD] Inicializando...');

    // Inicializar período actual
    const now = new Date();
    this.currentPeriod = {
      year: now.getFullYear(),
      month: now.getMonth() + 1
    };

    // Render dashboard
    await this.renderDashboard();
  },

  async renderDashboard() {
    const container = document.getElementById('billing-dashboard-container');
    if (!container) {
      console.error('❌ Container #billing-dashboard-container no encontrado');
      return;
    }

    container.innerHTML = `
      <div class="billing-dashboard">
        <!-- Header -->
        <div class="billing-header">
          <h2>💰 Gestión de Canales de Pago</h2>
          <div class="period-selector">
            <button onclick="NotificationBillingDashboard.changePeriod(-1)">◀ Anterior</button>
            <span class="current-period">${this.formatPeriod()}</span>
            <button onclick="NotificationBillingDashboard.changePeriod(1)">Siguiente ▶</button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="billing-tabs">
          <button class="tab ${this.currentView === 'dashboard' ? 'active' : ''}"
                  onclick="NotificationBillingDashboard.switchView('dashboard')">
            📊 Dashboard
          </button>
          <button class="tab ${this.currentView === 'companies' ? 'active' : ''}"
                  onclick="NotificationBillingDashboard.switchView('companies')">
            🏢 Empresas
          </button>
          <button class="tab ${this.currentView === 'pricing' ? 'active' : ''}"
                  onclick="NotificationBillingDashboard.switchView('pricing')">
            💲 Tarifas
          </button>
          <button class="tab ${this.currentView === 'incoming' ? 'active' : ''}"
                  onclick="NotificationBillingDashboard.switchView('incoming')">
            📥 Mensajes Entrantes
          </button>
        </div>

        <!-- Content -->
        <div id="billing-content" class="billing-content">
          ${await this.renderContent()}
        </div>
      </div>

      <style>
        .billing-dashboard {
          padding: 20px;
          background: #f5f5f5;
          min-height: 100vh;
        }

        .billing-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .period-selector {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .period-selector button {
          padding: 8px 15px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .period-selector button:hover {
          background: #0056b3;
        }

        .current-period {
          font-weight: bold;
          font-size: 1.1em;
          min-width: 150px;
          text-align: center;
        }

        .billing-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .billing-tabs .tab {
          padding: 12px 24px;
          background: white;
          border: 2px solid #ddd;
          border-radius: 8px 8px 0 0;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }

        .billing-tabs .tab.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .billing-tabs .tab:hover:not(.active) {
          background: #f0f0f0;
        }

        .billing-content {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .metric-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .metric-card.green {
          background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%);
        }

        .metric-card.red {
          background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
        }

        .metric-card.blue {
          background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%);
        }

        .metric-card .metric-label {
          font-size: 0.9em;
          opacity: 0.9;
          margin-bottom: 10px;
        }

        .metric-card .metric-value {
          font-size: 2.5em;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .metric-card .metric-subtext {
          font-size: 0.85em;
          opacity: 0.8;
        }

        .companies-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        .companies-table th {
          background: #f8f9fa;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #dee2e6;
        }

        .companies-table td {
          padding: 12px;
          border-bottom: 1px solid #dee2e6;
        }

        .companies-table tr:hover {
          background: #f8f9fa;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.85em;
          font-weight: 600;
        }

        .status-badge.enabled {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.suspended {
          background: #f8d7da;
          color: #721c24;
        }

        .btn-action {
          padding: 6px 12px;
          margin: 0 4px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
          font-weight: 600;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-action:hover {
          opacity: 0.8;
        }

        .pricing-form {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 5px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1em;
        }

        .incoming-messages {
          max-height: 600px;
          overflow-y: auto;
        }

        .message-card {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 10px;
          border-left: 4px solid #007bff;
        }

        .message-card.whatsapp {
          border-left-color: #25D366;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 0.9em;
          color: #666;
        }

        .message-body {
          font-size: 1em;
          color: #333;
          margin-bottom: 10px;
        }
      </style>
    `;
  },

  async renderContent() {
    switch (this.currentView) {
      case 'dashboard':
        return await this.renderDashboardView();
      case 'companies':
        return await this.renderCompaniesView();
      case 'pricing':
        return await this.renderPricingView();
      case 'incoming':
        return await this.renderIncomingView();
      default:
        return '<p>Vista no encontrada</p>';
    }
  },

  async renderDashboardView() {
    try {
      const response = await fetch(`/api/notifications/billing/dashboard?year=${this.currentPeriod.year}&month=${this.currentPeriod.month}`, {
        headers: { 'Authorization': `Bearer ${this.getToken()}` }
      });

      if (!response.ok) throw new Error('Error cargando dashboard');

      const { data } = await response.json();

      return `
        <div class="dashboard-view">
          <h3>📊 Resumen General - ${this.formatPeriod()}</h3>

          <div class="metrics-grid">
            <!-- Métricas Aponnt (Costos) -->
            <div class="metric-card red">
              <div class="metric-label">💸 Costos Aponnt (Twilio + Firebase)</div>
              <div class="metric-value">$${data.aponnt.totalCost.toFixed(2)}</div>
              <div class="metric-subtext">${data.aponnt.totalSent.toLocaleString()} notificaciones enviadas</div>
            </div>

            <!-- Revenue (Facturación a empresas) -->
            <div class="metric-card blue">
              <div class="metric-label">💰 Revenue (Facturado a Empresas)</div>
              <div class="metric-value">$${data.billing.totalToInvoice.toFixed(2)}</div>
              <div class="metric-subtext">${data.aponnt.totalCompanies} empresas activas</div>
            </div>

            <!-- Profit -->
            <div class="metric-card green">
              <div class="metric-label">📈 Profit (Revenue - Costos)</div>
              <div class="metric-value">$${data.profit.profit.toFixed(2)}</div>
              <div class="metric-subtext">Margen: ${data.profit.margin}%</div>
            </div>

            <!-- Pendiente de facturar -->
            <div class="metric-card">
              <div class="metric-label">📄 Pendiente de Facturar</div>
              <div class="metric-value">$${data.billing.totalPending.toFixed(2)}</div>
              <div class="metric-subtext">Ya facturado: $${data.billing.totalInvoiced.toFixed(2)}</div>
            </div>
          </div>

          <!-- Desglose por Canal -->
          <h4>📡 Costos por Canal (Aponnt)</h4>
          <table class="companies-table">
            <thead>
              <tr>
                <th>Canal</th>
                <th>Enviadas</th>
                <th>Entregadas</th>
                <th>Fallidas</th>
                <th>Costo Aponnt</th>
              </tr>
            </thead>
            <tbody>
              ${data.aponnt.byChannel.map(ch => `
                <tr>
                  <td><strong>${this.getChannelIcon(ch.channel)} ${ch.channel.toUpperCase()}</strong></td>
                  <td>${ch.totalSent.toLocaleString()}</td>
                  <td>${ch.totalDelivered.toLocaleString()}</td>
                  <td>${ch.totalFailed.toLocaleString()}</td>
                  <td>$${ch.totalCost.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Top Empresas por Consumo -->
          <h4>🏢 Top 10 Empresas por Consumo</h4>
          <table class="companies-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Canal</th>
                <th>Enviadas</th>
                <th>Costo</th>
                <th>Facturado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${data.billing.companies.slice(0, 10).map(c => `
                <tr>
                  <td><strong>${c.companyName}</strong></td>
                  <td>${this.getChannelIcon(c.channel)} ${c.channel.toUpperCase()}</td>
                  <td>${c.totalSent.toLocaleString()}</td>
                  <td>$${c.totalCost.toFixed(2)}</td>
                  <td>
                    ${c.isInvoiced
                      ? `<span class="status-badge enabled">Facturado ${c.invoiceId || ''}</span>`
                      : `<span class="status-badge suspended">Pendiente</span>`
                    }
                  </td>
                  <td>
                    <button class="btn-action btn-primary" onclick="NotificationBillingDashboard.viewCompanyDetail(${c.companyId})">
                      Ver Detalle
                    </button>
                    ${!c.isInvoiced ? `
                      <button class="btn-action btn-success" onclick="NotificationBillingDashboard.markAsInvoiced(${c.companyId})">
                        Marcar Facturado
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      console.error('❌ Error renderizando dashboard:', error);
      return '<p class="error">Error cargando dashboard</p>';
    }
  },

  async renderCompaniesView() {
    // Vista de todas las empresas con filtros
    return `
      <div class="companies-view">
        <h3>🏢 Gestión por Empresa</h3>
        <p>En desarrollo...</p>
      </div>
    `;
  },

  async renderPricingView() {
    return `
      <div class="pricing-view">
        <h3>💲 Configuración de Tarifas</h3>

        <div class="pricing-form">
          <h4>Configurar Tarifa para Empresa</h4>
          <form onsubmit="NotificationBillingDashboard.savePricing(event)">
            <div class="form-group">
              <label>Empresa:</label>
              <select name="companyId" required>
                <option value="">Seleccione empresa...</option>
                <!-- TODO: Cargar empresas dinámicamente -->
              </select>
            </div>

            <div class="form-group">
              <label>Canal:</label>
              <select name="channel" required>
                <option value="sms">📱 SMS</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="push">🔔 Push Notification</option>
                <option value="email">📧 Email</option>
              </select>
            </div>

            <div class="form-group">
              <label>Precio por Unidad (USD):</label>
              <input type="number" name="pricePerUnit" step="0.0001" value="0.01" required>
            </div>

            <div class="form-group">
              <label>Cuota Mensual (dejar vacío = ilimitado):</label>
              <input type="number" name="monthlyQuota" placeholder="Ej: 1000">
            </div>

            <div class="form-group">
              <label>
                <input type="checkbox" name="isEnabled" checked>
                Canal habilitado
              </label>
            </div>

            <button type="submit" class="btn-action btn-primary">Guardar Tarifa</button>
          </form>
        </div>

        <!-- Tarifas estándar recomendadas -->
        <h4>💡 Tarifas Recomendadas (basadas en costos Twilio/Firebase)</h4>
        <table class="companies-table">
          <thead>
            <tr>
              <th>Canal</th>
              <th>Costo Aponnt</th>
              <th>Tarifa Sugerida (+50%)</th>
              <th>Tarifa Premium (+100%)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>📱 SMS</td>
              <td>$0.0075</td>
              <td>$0.011</td>
              <td>$0.015</td>
            </tr>
            <tr>
              <td>💬 WhatsApp</td>
              <td>$0.005</td>
              <td>$0.0075</td>
              <td>$0.01</td>
            </tr>
            <tr>
              <td>🔔 Push</td>
              <td>$0 (gratis)</td>
              <td>$0.002</td>
              <td>$0.005</td>
            </tr>
            <tr>
              <td>📧 Email</td>
              <td>$0 (SMTP propio)</td>
              <td>$0.001</td>
              <td>$0.003</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  },

  async renderIncomingView() {
    return `
      <div class="incoming-view">
        <h3>📥 Mensajes Entrantes (Respuestas SMS/WhatsApp)</h3>
        <p>En desarrollo...</p>
      </div>
    `;
  },

  // Utility methods
  getChannelIcon(channel) {
    const icons = {
      'sms': '📱',
      'whatsapp': '💬',
      'push': '🔔',
      'email': '📧',
      'websocket': '🔌',
      'inbox': '📥'
    };
    return icons[channel] || '📡';
  },

  formatPeriod() {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[this.currentPeriod.month - 1]} ${this.currentPeriod.year}`;
  },

  changePeriod(delta) {
    let newMonth = this.currentPeriod.month + delta;
    let newYear = this.currentPeriod.year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    this.currentPeriod = { year: newYear, month: newMonth };
    this.renderDashboard();
  },

  switchView(view) {
    this.currentView = view;
    this.renderDashboard();
  },

  getToken() {
    return localStorage.getItem('token');
  },

  // Actions
  async viewCompanyDetail(companyId) {
    this.selectedCompany = companyId;
    this.currentView = 'companies';
    await this.renderDashboard();
  },

  async markAsInvoiced(companyId) {
    const invoiceId = prompt('Ingrese número de factura:');
    if (!invoiceId) return;

    try {
      const response = await fetch('/api/notifications/billing/mark-invoiced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({
          companyId,
          year: this.currentPeriod.year,
          month: this.currentPeriod.month,
          invoiceId
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Período marcado como facturado');
        this.renderDashboard();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error marcando como facturado');
    }
  },

  async savePricing(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      const response = await fetch('/api/notifications/billing/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({
          companyId: parseInt(formData.get('companyId')),
          channel: formData.get('channel'),
          pricePerUnit: parseFloat(formData.get('pricePerUnit')),
          monthlyQuota: formData.get('monthlyQuota') ? parseInt(formData.get('monthlyQuota')) : null,
          isEnabled: formData.get('isEnabled') === 'on'
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Tarifa configurada');
        event.target.reset();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error guardando tarifa');
    }
  }
};

// Auto-inicializar si está en la página correcta
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('billing-dashboard-container')) {
      NotificationBillingDashboard.init();
    }
  });
} else {
  if (document.getElementById('billing-dashboard-container')) {
    NotificationBillingDashboard.init();
  }
}
