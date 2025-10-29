/**
 * VENDOR INVOICING SYSTEM - JavaScript Module
 *
 * Sistema completo de gestión de vendedores, facturación y flujo comercial.
 *
 * FLUJO COMPLETO:
 * 1. Presupuesto/Cotización → 2. Contrato → 3. Factura → 4. Pago → 5. Comisión
 *
 * SUB-TABS:
 * - Vendedores (Vendors List)
 * - Presupuestos (Quotes)
 * - Contratos (Contracts)
 * - Facturas (Invoices)
 * - Pagos (Payments)
 * - Comisiones (Commissions)
 */

const VendorInvoicingSystem = {
  // Estado actual
  currentSubTab: 'vendors-list',
  currentData: {},
  stats: {},

  /**
   * Inicializa el sistema
   */
  init() {
    console.log('🏢 [VENDOR SYSTEM] Inicializando sistema de vendedores y facturación...');
    this.loadVendorStats();
    this.loadVendorsList();
  },

  /**
   * Cambia entre sub-tabs de vendedores
   */
  switchSubTab(subTabId) {
    console.log(`🔄 [VENDOR SYSTEM] Cambiando a sub-tab: ${subTabId}`);

    // Ocultar todos los sub-tabs
    document.querySelectorAll('.vendor-subtab-content').forEach(tab => {
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
      case 'vendors-list':
        await this.loadVendorsList();
        break;
      case 'quotes-list':
        await this.loadQuotes();
        break;
      case 'contracts-list':
        await this.loadContracts();
        break;
      case 'invoices-list':
        await this.loadInvoices();
        break;
      case 'payments-list':
        await this.loadPayments();
        break;
      case 'commissions-list':
        await this.loadCommissions();
        break;
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * ESTADÍSTICAS GENERALES
   * ═══════════════════════════════════════════════════════════
   */
  async loadVendorStats() {
    try {
      const response = await fetch('/api/vendors/stats', {
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
      showNotification('Error cargando estadísticas de vendedores', 'error');
    }
  },

  updateStatsUI(stats) {
    // Actualizar cards de estadísticas
    document.getElementById('totalVendors').textContent = stats.total_vendors || 0;
    document.getElementById('activeVendors').textContent = stats.active_vendors || 0;
    document.getElementById('totalRevenue').textContent = `$${parseFloat(stats.total_revenue || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    document.getElementById('pendingInvoices').textContent = stats.pending_invoices || 0;
    document.getElementById('overdueInvoices').textContent = stats.overdue_invoices || 0;
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * SUB-TAB 1: VENDEDORES
   * ═══════════════════════════════════════════════════════════
   */
  async loadVendorsList() {
    try {
      const response = await fetch('/api/vendors/partners?type=seller', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error cargando vendedores');

      const data = await response.json();
      this.renderVendorsList(data.partners);

    } catch (error) {
      console.error('❌ Error cargando vendedores:', error);
      showNotification('Error cargando lista de vendedores', 'error');
    }
  },

  renderVendorsList(vendors) {
    const tbody = document.querySelector('#vendors-list table tbody');
    if (!tbody) return;

    if (!vendors || vendors.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No hay vendedores registrados</td></tr>';
      return;
    }

    tbody.innerHTML = vendors.map(vendor => `
      <tr>
        <td>${vendor.id}</td>
        <td>
          <strong>${vendor.name}</strong><br>
          <small style="color: #6c757d;">${vendor.email}</small>
        </td>
        <td>${vendor.phone || '-'}</td>
        <td>${vendor.total_companies || 0}</td>
        <td>$${parseFloat(vendor.total_commissions || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td>
          <span class="score-badge ${this.getScoreClass(vendor.current_score)}">
            ${parseFloat(vendor.current_score || 0).toFixed(1)} ⭐
          </span>
        </td>
        <td>
          <span class="status-badge ${vendor.status === 'activo' ? 'active' : 'inactive'}">
            ${vendor.status === 'activo' ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 5px;">
            <button class="btn btn-sm btn-info" onclick="VendorInvoicingSystem.viewVendorDetails(${vendor.id})" title="Ver detalles">
              👁️
            </button>
            <button class="btn btn-sm btn-primary" onclick="VendorInvoicingSystem.viewVendorCompanies(${vendor.id})" title="Ver empresas">
              🏢
            </button>
            <button class="btn btn-sm btn-success" onclick="VendorInvoicingSystem.viewVendorCommissions(${vendor.id})" title="Ver comisiones">
              💰
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * SUB-TAB 2: PRESUPUESTOS/COTIZACIONES
   * ═══════════════════════════════════════════════════════════
   */
  async loadQuotes() {
    try {
      const status = document.getElementById('quoteFilterStatus')?.value || '';
      const month = document.getElementById('quoteFilterMonth')?.value || '';

      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (month) params.append('month', month);

      const response = await fetch(`/api/vendors/quotes?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error cargando presupuestos');

      const data = await response.json();
      this.renderQuotesList(data.quotes);

    } catch (error) {
      console.error('❌ Error cargando presupuestos:', error);
      showNotification('Error cargando presupuestos', 'error');
    }
  },

  renderQuotesList(quotes) {
    const container = document.getElementById('quotesTableContainer');
    if (!container) return;

    const tbody = container.querySelector('tbody');
    if (!tbody) return;

    if (!quotes || quotes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No hay presupuestos registrados</td></tr>';
      return;
    }

    tbody.innerHTML = quotes.map(quote => `
      <tr>
        <td><strong>${quote.quote_number}</strong></td>
        <td>${quote.company_name}</td>
        <td>${quote.seller_name}</td>
        <td>${new Date(quote.issue_date).toLocaleDateString('es-AR')}</td>
        <td>${new Date(quote.valid_until).toLocaleDateString('es-AR')}</td>
        <td><strong>$${parseFloat(quote.total_amount).toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong></td>
        <td>
          <span class="status-badge ${this.getQuoteStatusClass(quote.status)}">
            ${this.getQuoteStatusText(quote.status)}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 5px;">
            <button class="btn btn-sm btn-info" onclick="VendorInvoicingSystem.viewQuoteDetails(${quote.id})" title="Ver detalles">
              👁️
            </button>
            <button class="btn btn-sm btn-primary" onclick="VendorInvoicingSystem.downloadQuotePDF(${quote.id})" title="Descargar PDF">
              📄
            </button>
            ${quote.status === 'sent' ? `
              <button class="btn btn-sm btn-success" onclick="VendorInvoicingSystem.acceptQuote(${quote.id})" title="Aceptar">
                ✅
              </button>
              <button class="btn btn-sm btn-danger" onclick="VendorInvoicingSystem.rejectQuote(${quote.id})" title="Rechazar">
                ❌
              </button>
            ` : ''}
            ${quote.status === 'accepted' ? `
              <button class="btn btn-sm btn-success" onclick="VendorInvoicingSystem.convertQuoteToContract(${quote.id})" title="Generar contrato">
                📜 Contrato
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * SUB-TAB 3: CONTRATOS
   * ═══════════════════════════════════════════════════════════
   */
  async loadContracts() {
    try {
      const status = document.getElementById('contractFilterStatus')?.value || '';
      const month = document.getElementById('contractFilterMonth')?.value || '';

      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (month) params.append('month', month);

      const response = await fetch(`/api/vendors/contracts?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error cargando contratos');

      const data = await response.json();
      this.renderContractsList(data.contracts);

    } catch (error) {
      console.error('❌ Error cargando contratos:', error);
      showNotification('Error cargando contratos', 'error');
    }
  },

  renderContractsList(contracts) {
    const container = document.getElementById('contractsTableContainer');
    if (!container) return;

    const tbody = container.querySelector('tbody');
    if (!tbody) return;

    if (!contracts || contracts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px;">No hay contratos registrados</td></tr>';
      return;
    }

    tbody.innerHTML = contracts.map(contract => `
      <tr>
        <td><strong>${contract.contract_number}</strong></td>
        <td>${contract.company_name}</td>
        <td>${contract.seller_name}</td>
        <td>${new Date(contract.start_date).toLocaleDateString('es-AR')}</td>
        <td>${new Date(contract.end_date).toLocaleDateString('es-AR')}</td>
        <td><strong>$${parseFloat(contract.monthly_amount).toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong></td>
        <td>${contract.payment_day}</td>
        <td>
          <span class="status-badge ${this.getContractStatusClass(contract.status)}">
            ${this.getContractStatusText(contract.status)}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 5px;">
            <button class="btn btn-sm btn-info" onclick="VendorInvoicingSystem.viewContractDetails(${contract.id})" title="Ver detalles">
              👁️
            </button>
            <button class="btn btn-sm btn-primary" onclick="VendorInvoicingSystem.downloadContractPDF(${contract.id})" title="Descargar PDF">
              📄
            </button>
            ${contract.status === 'active' ? `
              <button class="btn btn-sm btn-warning" onclick="VendorInvoicingSystem.cancelContract(${contract.id})" title="Cancelar">
                🚫
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * SUB-TAB 4: FACTURAS
   * ═══════════════════════════════════════════════════════════
   */
  async loadInvoices() {
    try {
      const status = document.getElementById('invoiceFilterStatus')?.value || '';
      const month = document.getElementById('invoiceFilterMonth')?.value || '';

      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (month) params.append('month', month);

      const response = await fetch(`/api/vendors/invoices?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error cargando facturas');

      const data = await response.json();
      this.renderInvoicesList(data.invoices);

    } catch (error) {
      console.error('❌ Error cargando facturas:', error);
      showNotification('Error cargando facturas', 'error');
    }
  },

  renderInvoicesList(invoices) {
    const container = document.getElementById('invoicesTableContainer');
    if (!container) return;

    const tbody = container.querySelector('tbody');
    if (!tbody) return;

    if (!invoices || invoices.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px;">No hay facturas registradas</td></tr>';
      return;
    }

    tbody.innerHTML = invoices.map(invoice => `
      <tr>
        <td><strong>${invoice.invoice_number}</strong></td>
        <td>${invoice.company_name}</td>
        <td>${new Date(invoice.invoice_date).toLocaleDateString('es-AR')}</td>
        <td>${invoice.period_month}/${invoice.period_year}</td>
        <td>${new Date(invoice.due_date).toLocaleDateString('es-AR')}</td>
        <td><strong>$${parseFloat(invoice.total_amount).toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong></td>
        <td>
          <span class="status-badge ${this.getInvoiceStatusClass(invoice.status)}">
            ${this.getInvoiceStatusText(invoice.status)}
          </span>
        </td>
        <td>
          ${invoice.payment_date ? new Date(invoice.payment_date).toLocaleDateString('es-AR') : '-'}
        </td>
        <td>
          <div style="display: flex; gap: 5px;">
            <button class="btn btn-sm btn-info" onclick="VendorInvoicingSystem.viewInvoiceDetails(${invoice.id})" title="Ver detalles">
              👁️
            </button>
            <button class="btn btn-sm btn-primary" onclick="VendorInvoicingSystem.downloadInvoicePDF(${invoice.id})" title="Descargar PDF">
              📄
            </button>
            ${invoice.status === 'pending' || invoice.status === 'overdue' ? `
              <button class="btn btn-sm btn-success" onclick="VendorInvoicingSystem.openPaymentRegisterModal(${invoice.id})" title="Registrar pago">
                💳
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * SUB-TAB 5: PAGOS
   * ═══════════════════════════════════════════════════════════
   */
  async loadPayments() {
    try {
      const method = document.getElementById('paymentFilterMethod')?.value || '';
      const month = document.getElementById('paymentFilterMonth')?.value || '';

      const params = new URLSearchParams();
      if (method) params.append('method', method);
      if (month) params.append('month', month);

      const response = await fetch(`/api/vendors/payments?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error cargando pagos');

      const data = await response.json();
      this.renderPaymentsList(data.payments);

    } catch (error) {
      console.error('❌ Error cargando pagos:', error);
      showNotification('Error cargando pagos', 'error');
    }
  },

  renderPaymentsList(payments) {
    const container = document.getElementById('paymentsTableContainer');
    if (!container) return;

    const tbody = container.querySelector('tbody');
    if (!tbody) return;

    if (!payments || payments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No hay pagos registrados</td></tr>';
      return;
    }

    tbody.innerHTML = payments.map(payment => `
      <tr>
        <td>${payment.id}</td>
        <td><strong>${payment.invoice_number}</strong></td>
        <td>${payment.company_name}</td>
        <td>${new Date(payment.payment_date).toLocaleDateString('es-AR')}</td>
        <td><strong>$${parseFloat(payment.amount).toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong></td>
        <td>
          <span class="payment-method ${payment.payment_method}">
            ${this.getPaymentMethodText(payment.payment_method)}
          </span>
        </td>
        <td>${payment.receipt_number || '-'}</td>
        <td>
          <div style="display: flex; gap: 5px;">
            <button class="btn btn-sm btn-info" onclick="VendorInvoicingSystem.viewPaymentDetails(${payment.id})" title="Ver detalles">
              👁️
            </button>
            ${payment.receipt_file_path ? `
              <button class="btn btn-sm btn-primary" onclick="VendorInvoicingSystem.downloadReceipt('${payment.receipt_file_path}')" title="Ver comprobante">
                📎
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * SUB-TAB 6: COMISIONES
   * ═══════════════════════════════════════════════════════════
   */
  async loadCommissions() {
    try {
      const type = document.getElementById('commissionFilterType')?.value || '';
      const month = document.getElementById('commissionFilterMonth')?.value || '';

      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (month) params.append('month', month);

      const response = await fetch(`/api/vendors/commissions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error cargando comisiones');

      const data = await response.json();
      this.renderCommissionsList(data.commissions);

    } catch (error) {
      console.error('❌ Error cargando comisiones:', error);
      showNotification('Error cargando comisiones', 'error');
    }
  },

  renderCommissionsList(commissions) {
    const container = document.getElementById('commissionsTableContainer');
    if (!container) return;

    const tbody = container.querySelector('tbody');
    if (!tbody) return;

    if (!commissions || commissions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px;">No hay comisiones registradas</td></tr>';
      return;
    }

    tbody.innerHTML = commissions.map(comm => `
      <tr>
        <td>${comm.id}</td>
        <td>
          <span class="commission-type ${comm.commission_type}">
            ${this.getCommissionTypeText(comm.commission_type)}
          </span>
        </td>
        <td>${comm.company_name}</td>
        <td>${comm.partner_name}</td>
        <td>${comm.period_month}/${comm.period_year}</td>
        <td>$${parseFloat(comm.base_amount).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td>${parseFloat(comm.commission_rate).toFixed(2)}%</td>
        <td><strong>$${parseFloat(comm.commission_amount).toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong></td>
        <td>
          <span class="status-badge ${comm.payment_status === 'paid' ? 'paid' : 'pending'}">
            ${comm.payment_status === 'paid' ? 'Pagada' : 'Pendiente'}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-info" onclick="VendorInvoicingSystem.viewCommissionDetails(${comm.id})" title="Ver detalles">
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

  getQuoteStatusClass(status) {
    const classes = {
      'draft': 'draft',
      'sent': 'sent',
      'accepted': 'accepted',
      'rejected': 'rejected',
      'expired': 'expired'
    };
    return classes[status] || 'draft';
  },

  getQuoteStatusText(status) {
    const texts = {
      'draft': 'Borrador',
      'sent': 'Enviado',
      'accepted': 'Aceptado',
      'rejected': 'Rechazado',
      'expired': 'Vencido'
    };
    return texts[status] || status;
  },

  getContractStatusClass(status) {
    const classes = {
      'active': 'active',
      'cancelled': 'cancelled',
      'expired': 'expired'
    };
    return classes[status] || 'active';
  },

  getContractStatusText(status) {
    const texts = {
      'active': 'Activo',
      'cancelled': 'Cancelado',
      'expired': 'Vencido'
    };
    return texts[status] || status;
  },

  getInvoiceStatusClass(status) {
    const classes = {
      'pending': 'pending',
      'paid': 'paid',
      'overdue': 'overdue',
      'cancelled': 'cancelled'
    };
    return classes[status] || 'pending';
  },

  getInvoiceStatusText(status) {
    const texts = {
      'pending': 'Pendiente',
      'paid': 'Pagada',
      'overdue': 'Vencida',
      'cancelled': 'Cancelada'
    };
    return texts[status] || status;
  },

  getPaymentMethodText(method) {
    const texts = {
      'transfer': '🏦 Transferencia',
      'cash': '💵 Efectivo',
      'check': '📝 Cheque',
      'credit_card': '💳 Tarjeta',
      'debit_card': '💳 Débito',
      'mercadopago': '💚 MercadoPago',
      'other': '➕ Otro'
    };
    return texts[method] || method;
  },

  getCommissionTypeText(type) {
    const texts = {
      'sale': '💰 Venta',
      'support': '🛠️ Soporte',
      'leader': '👔 Líder'
    };
    return texts[type] || type;
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * ACCIONES DE BOTONES
   * ═══════════════════════════════════════════════════════════
   */
  viewVendorDetails(vendorId) {
    console.log('👁️ Ver detalles del vendedor:', vendorId);
    // TODO: Implementar modal de detalles
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  viewVendorCompanies(vendorId) {
    console.log('🏢 Ver empresas del vendedor:', vendorId);
    // TODO: Implementar modal de empresas
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  viewVendorCommissions(vendorId) {
    console.log('💰 Ver comisiones del vendedor:', vendorId);
    // TODO: Implementar modal de comisiones
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  viewQuoteDetails(quoteId) {
    console.log('👁️ Ver detalles del presupuesto:', quoteId);
    // TODO: Implementar modal de detalles
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  downloadQuotePDF(quoteId) {
    console.log('📄 Descargar PDF del presupuesto:', quoteId);
    window.open(`/api/vendors/quotes/${quoteId}/pdf`, '_blank');
  },

  async acceptQuote(quoteId) {
    if (!confirm('¿Aceptar este presupuesto?')) return;

    try {
      const response = await fetch(`/api/vendors/quotes/${quoteId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error aceptando presupuesto');

      showNotification('Presupuesto aceptado exitosamente', 'success');
      this.loadQuotes();

    } catch (error) {
      console.error('❌ Error:', error);
      showNotification('Error aceptando presupuesto', 'error');
    }
  },

  async rejectQuote(quoteId) {
    if (!confirm('¿Rechazar este presupuesto?')) return;

    try {
      const response = await fetch(`/api/vendors/quotes/${quoteId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error rechazando presupuesto');

      showNotification('Presupuesto rechazado', 'success');
      this.loadQuotes();

    } catch (error) {
      console.error('❌ Error:', error);
      showNotification('Error rechazando presupuesto', 'error');
    }
  },

  async convertQuoteToContract(quoteId) {
    if (!confirm('¿Generar contrato a partir de este presupuesto?')) return;

    try {
      const response = await fetch(`/api/vendors/quotes/${quoteId}/convert-to-contract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error generando contrato');

      const data = await response.json();
      showNotification('Contrato generado exitosamente', 'success');

      // Cambiar a tab de contratos
      this.switchSubTab('contracts-list');

    } catch (error) {
      console.error('❌ Error:', error);
      showNotification('Error generando contrato', 'error');
    }
  },

  viewContractDetails(contractId) {
    console.log('👁️ Ver detalles del contrato:', contractId);
    // TODO: Implementar modal de detalles
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  downloadContractPDF(contractId) {
    console.log('📄 Descargar PDF del contrato:', contractId);
    window.open(`/api/vendors/contracts/${contractId}/pdf`, '_blank');
  },

  async cancelContract(contractId) {
    if (!confirm('¿Cancelar este contrato?')) return;

    try {
      const response = await fetch(`/api/vendors/contracts/${contractId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error cancelando contrato');

      showNotification('Contrato cancelado exitosamente', 'success');
      this.loadContracts();

    } catch (error) {
      console.error('❌ Error:', error);
      showNotification('Error cancelando contrato', 'error');
    }
  },

  viewInvoiceDetails(invoiceId) {
    console.log('👁️ Ver detalles de la factura:', invoiceId);
    // TODO: Implementar modal de detalles
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  downloadInvoicePDF(invoiceId) {
    console.log('📄 Descargar PDF de la factura:', invoiceId);
    window.open(`/api/vendors/invoices/${invoiceId}/pdf`, '_blank');
  },

  openPaymentRegisterModal(invoiceId = null) {
    console.log('💳 Abrir modal de registro de pago:', invoiceId);
    // TODO: Implementar modal de registro de pago
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  viewPaymentDetails(paymentId) {
    console.log('👁️ Ver detalles del pago:', paymentId);
    // TODO: Implementar modal de detalles
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  downloadReceipt(filePath) {
    console.log('📎 Descargar comprobante:', filePath);
    window.open(`/uploads/receipts/${filePath}`, '_blank');
  },

  viewCommissionDetails(commissionId) {
    console.log('👁️ Ver detalles de la comisión:', commissionId);
    // TODO: Implementar modal de detalles
    showNotification('Funcionalidad en desarrollo', 'info');
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * FUNCIONES GLOBALES PARA BOTONES DEL HEADER
   * ═══════════════════════════════════════════════════════════
   */
  async generateMonthlyInvoices() {
    if (!confirm('¿Generar facturas mensuales para todas las empresas activas?')) return;

    try {
      const response = await fetch('/api/vendors/invoices/generate-monthly', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error generando facturas');

      const data = await response.json();
      showNotification(`${data.invoices_created} facturas generadas exitosamente`, 'success');

      // Cambiar a tab de facturas
      this.switchSubTab('invoices-list');

    } catch (error) {
      console.error('❌ Error:', error);
      showNotification('Error generando facturas mensuales', 'error');
    }
  }
};

// Exponer funciones globales para botones en HTML
window.switchVendorSubTab = (subTabId) => VendorInvoicingSystem.switchSubTab(subTabId);
window.openPaymentRegisterModal = (invoiceId) => VendorInvoicingSystem.openPaymentRegisterModal(invoiceId);
window.generateMonthlyInvoices = () => VendorInvoicingSystem.generateMonthlyInvoices();
window.loadQuotes = () => VendorInvoicingSystem.loadQuotes();
window.loadContracts = () => VendorInvoicingSystem.loadContracts();
window.loadInvoices = () => VendorInvoicingSystem.loadInvoices();
window.loadPayments = () => VendorInvoicingSystem.loadPayments();
window.loadCommissions = () => VendorInvoicingSystem.loadCommissions();

// Auto-inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ [VENDOR SYSTEM] Módulo cargado');
});
