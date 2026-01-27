/**
 * =============================================================================
 * QUOTES MANAGEMENT MODULE - Gestión de Presupuestos
 * =============================================================================
 *
 * Módulo para visualizar y gestionar presupuestos creados desde leads.
 * Incluye: envío por email, generación de PDF, tracking de estados.
 */

window.QuotesManagement = (function() {
    'use strict';

    // Estado del módulo
    let quotes = [];
    let currentQuote = null;
    let filters = {
        status: '',
        search: ''
    };

    // Configuración de estados
    const statusConfig = {
        draft: { label: 'Borrador', color: '#6c757d', icon: '📝' },
        sent: { label: 'Enviado', color: '#17a2b8', icon: '📧' },
        in_trial: { label: 'En Trial', color: '#ffc107', icon: '🧪' },
        accepted: { label: 'Aceptado', color: '#28a745', icon: '✅' },
        active: { label: 'Activo', color: '#007bff', icon: '🟢' },
        rejected: { label: 'Rechazado', color: '#dc3545', icon: '❌' },
        expired: { label: 'Expirado', color: '#6c757d', icon: '⏰' },
        superseded: { label: 'Reemplazado', color: '#6c757d', icon: '🔄' }
    };

    /**
     * Inicializar módulo
     */
    async function init() {
        console.log('📋 [QUOTES] Inicializando módulo de presupuestos...');
        render();
        await loadQuotes();
    }

    /**
     * Renderizar vista principal
     */
    function render() {
        const container = document.getElementById('module-content');
        if (!container) return;

        container.innerHTML = getMainHTML();
        attachEventListeners();
    }

    /**
     * HTML principal
     */
    function getMainHTML() {
        return [
            '<div class="quotes-module">',
                '<div class="quotes-header">',
                    '<h2><span style="font-size: 1.5em;">📋</span> Gestión de Presupuestos</h2>',
                    '<div class="header-actions">',
                        '<button class="btn btn-secondary" onclick="QuotesManagement.loadQuotes()">',
                            '<span style="margin-right: 5px;">🔄</span> Actualizar',
                        '</button>',
                    '</div>',
                '</div>',

                '<div class="quotes-filters">',
                    '<div class="filter-group">',
                        '<input type="text" id="quote-search" placeholder="Buscar por número o empresa..." ',
                               'class="form-control" onkeyup="QuotesManagement.applyFilters()">',
                    '</div>',
                    '<div class="filter-group">',
                        '<select id="quote-status-filter" class="form-control" onchange="QuotesManagement.applyFilters()">',
                            '<option value="">Todos los estados</option>',
                            '<option value="draft">Borrador</option>',
                            '<option value="sent">Enviado</option>',
                            '<option value="in_trial">En Trial</option>',
                            '<option value="accepted">Aceptado</option>',
                            '<option value="active">Activo</option>',
                            '<option value="rejected">Rechazado</option>',
                            '<option value="expired">Expirado</option>',
                        '</select>',
                    '</div>',
                '</div>',

                '<div class="quotes-stats" id="quotes-stats"></div>',

                '<div class="quotes-list" id="quotes-list">',
                    '<div class="loading">Cargando presupuestos...</div>',
                '</div>',
            '</div>',

            '<style>',
                getStyles(),
            '</style>'
        ].join('');
    }

    /**
     * Estilos CSS
     */
    function getStyles() {
        return [
            '.quotes-module { padding: 20px; }',
            '.quotes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }',
            '.quotes-header h2 { margin: 0; display: flex; align-items: center; gap: 10px; }',
            '.quotes-filters { display: flex; gap: 15px; margin-bottom: 20px; }',
            '.filter-group { flex: 1; }',
            '.quotes-stats { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }',
            '.stat-card { background: #f8f9fa; border-radius: 8px; padding: 15px 20px; min-width: 120px; text-align: center; }',
            '.stat-card .stat-value { font-size: 24px; font-weight: bold; }',
            '.stat-card .stat-label { font-size: 12px; color: #666; }',
            '.quotes-list { }',
            '.quote-card { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 15px; transition: box-shadow 0.2s; }',
            '.quote-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }',
            '.quote-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }',
            '.quote-number { font-size: 18px; font-weight: bold; color: #333; }',
            '.quote-status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; color: white; }',
            '.quote-company { font-size: 16px; color: #666; margin-bottom: 10px; }',
            '.quote-modules { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; }',
            '.module-chip { background: #e3f2fd; color: #1976d2; padding: 4px 10px; border-radius: 15px; font-size: 12px; }',
            '.quote-total { font-size: 20px; font-weight: bold; color: #28a745; margin-bottom: 15px; }',
            '.quote-meta { display: flex; gap: 20px; font-size: 12px; color: #888; margin-bottom: 15px; }',
            '.quote-actions { display: flex; gap: 10px; flex-wrap: wrap; }',
            '.btn { padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 5px; }',
            '.btn-primary { background: #007bff; color: white; }',
            '.btn-primary:hover { background: #0056b3; }',
            '.btn-success { background: #28a745; color: white; }',
            '.btn-success:hover { background: #1e7e34; }',
            '.btn-warning { background: #ffc107; color: #212529; }',
            '.btn-warning:hover { background: #e0a800; }',
            '.btn-danger { background: #dc3545; color: white; }',
            '.btn-danger:hover { background: #bd2130; }',
            '.btn-secondary { background: #6c757d; color: white; }',
            '.btn-secondary:hover { background: #545b62; }',
            '.btn-outline { background: transparent; border: 1px solid #ddd; color: #333; }',
            '.btn-outline:hover { background: #f8f9fa; }',
            '.empty-state { text-align: center; padding: 60px 20px; color: #666; }',
            '.empty-state-icon { font-size: 64px; margin-bottom: 20px; }',
            '.loading { text-align: center; padding: 40px; color: #666; }',
            '.form-control { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }',
            '.form-control:focus { outline: none; border-color: #007bff; }',

            '/* Modal styles */',
            '.quote-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }',
            '.quote-modal { background: white; border-radius: 12px; max-width: 700px; width: 90%; max-height: 90vh; overflow-y: auto; }',
            '.quote-modal-header { padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }',
            '.quote-modal-header h3 { margin: 0; }',
            '.quote-modal-body { padding: 20px; }',
            '.quote-modal-footer { padding: 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 10px; }',
            '.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #666; }',
            '.close-btn:hover { color: #333; }',

            '.detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }',
            '.detail-label { color: #666; }',
            '.detail-value { font-weight: 500; }',
            '.modules-table { width: 100%; border-collapse: collapse; margin: 15px 0; }',
            '.modules-table th, .modules-table td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }',
            '.modules-table th { background: #f8f9fa; font-weight: 600; }',
            '.modules-table .price { text-align: right; }',
        ].join('\n');
    }

    /**
     * Cargar presupuestos
     */
    async function loadQuotes() {
        try {
            const token = localStorage.getItem('aponnt_token_staff') || sessionStorage.getItem('aponnt_token_staff');
            const response = await fetch('/api/quotes', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar presupuestos');
            }

            const data = await response.json();
            quotes = data.quotes || data || [];

            renderStats();
            renderQuotesList();

        } catch (error) {
            console.error('[QUOTES] Error:', error);
            document.getElementById('quotes-list').innerHTML =
                '<div class="empty-state">' +
                    '<div class="empty-state-icon">⚠️</div>' +
                    '<p>Error al cargar presupuestos: ' + error.message + '</p>' +
                '</div>';
        }
    }

    /**
     * Renderizar estadísticas
     */
    function renderStats() {
        const container = document.getElementById('quotes-stats');
        if (!container) return;

        const stats = {
            total: quotes.length,
            draft: quotes.filter(q => q.status === 'draft').length,
            sent: quotes.filter(q => q.status === 'sent').length,
            accepted: quotes.filter(q => ['accepted', 'active'].includes(q.status)).length,
            totalAmount: quotes.reduce((sum, q) => sum + parseFloat(q.total_amount || 0), 0)
        };

        container.innerHTML = [
            '<div class="stat-card">',
                '<div class="stat-value">' + stats.total + '</div>',
                '<div class="stat-label">Total</div>',
            '</div>',
            '<div class="stat-card">',
                '<div class="stat-value" style="color: #6c757d;">' + stats.draft + '</div>',
                '<div class="stat-label">Borradores</div>',
            '</div>',
            '<div class="stat-card">',
                '<div class="stat-value" style="color: #17a2b8;">' + stats.sent + '</div>',
                '<div class="stat-label">Enviados</div>',
            '</div>',
            '<div class="stat-card">',
                '<div class="stat-value" style="color: #28a745;">' + stats.accepted + '</div>',
                '<div class="stat-label">Aceptados</div>',
            '</div>',
            '<div class="stat-card">',
                '<div class="stat-value" style="color: #007bff;">$' + stats.totalAmount.toLocaleString('es-AR') + '</div>',
                '<div class="stat-label">Monto Total</div>',
            '</div>'
        ].join('');
    }

    /**
     * Renderizar lista de presupuestos
     */
    function renderQuotesList() {
        const container = document.getElementById('quotes-list');
        if (!container) return;

        // Aplicar filtros
        let filtered = quotes;

        if (filters.status) {
            filtered = filtered.filter(q => q.status === filters.status);
        }

        if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(q =>
                (q.quote_number || '').toLowerCase().includes(search) ||
                (q.company_name || '').toLowerCase().includes(search)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML =
                '<div class="empty-state">' +
                    '<div class="empty-state-icon">📋</div>' +
                    '<p>No hay presupuestos' + (filters.status || filters.search ? ' con los filtros aplicados' : '') + '</p>' +
                    '<p style="font-size: 14px; color: #999;">Los presupuestos se crean desde el módulo de Leads</p>' +
                '</div>';
            return;
        }

        container.innerHTML = filtered.map(function(quote) {
            return renderQuoteCard(quote);
        }).join('');
    }

    /**
     * Renderizar tarjeta de presupuesto
     */
    function renderQuoteCard(quote) {
        const status = statusConfig[quote.status] || statusConfig.draft;
        const modules = parseModules(quote.modules_data);

        var html = '<div class="quote-card" data-id="' + quote.id + '">';

        // Header
        html += '<div class="quote-card-header">';
        html += '<div>';
        html += '<div class="quote-number">' + status.icon + ' ' + (quote.quote_number || 'Sin número') + '</div>';
        html += '<div class="quote-company">' + (quote.company_name || 'Empresa ID: ' + quote.company_id) + '</div>';
        html += '</div>';
        html += '<span class="quote-status" style="background: ' + status.color + ';">' + status.label + '</span>';
        html += '</div>';

        // Módulos
        if (modules.length > 0) {
            html += '<div class="quote-modules">';
            modules.forEach(function(mod) {
                html += '<span class="module-chip">' + (mod.module_name || mod.module_key) + '</span>';
            });
            html += '</div>';
        }

        // Total
        html += '<div class="quote-total">$' + parseFloat(quote.total_amount || 0).toLocaleString('es-AR') + '/mes</div>';

        // Meta info
        html += '<div class="quote-meta">';
        html += '<span>Creado: ' + formatDate(quote.created_at) + '</span>';
        if (quote.sent_date) {
            html += '<span>Enviado: ' + formatDate(quote.sent_date) + '</span>';
        }
        if (quote.valid_until) {
            html += '<span>Válido hasta: ' + formatDate(quote.valid_until) + '</span>';
        }
        html += '</div>';

        // Acciones
        html += '<div class="quote-actions">';
        html += '<button class="btn btn-outline" onclick="QuotesManagement.viewQuote(' + quote.id + ')"><span>👁️</span> Ver</button>';

        if (quote.status === 'draft') {
            html += '<button class="btn btn-primary" onclick="QuotesManagement.sendQuote(' + quote.id + ')"><span>📧</span> Enviar</button>';
            html += '<button class="btn btn-secondary" onclick="QuotesManagement.editQuote(' + quote.id + ')"><span>✏️</span> Editar</button>';
        }

        if (quote.status === 'sent' || quote.status === 'draft') {
            html += '<button class="btn btn-warning" onclick="QuotesManagement.downloadPDF(' + quote.id + ')"><span>📄</span> PDF</button>';
        }

        if (quote.status === 'accepted') {
            html += '<button class="btn btn-success" onclick="QuotesManagement.activateQuote(' + quote.id + ')"><span>🚀</span> Activar</button>';
        }

        html += '</div>';
        html += '</div>';

        return html;
    }

    /**
     * Ver detalle de presupuesto
     */
    async function viewQuote(id) {
        const quote = quotes.find(function(q) { return q.id === id; });
        if (!quote) return;

        currentQuote = quote;
        const status = statusConfig[quote.status] || statusConfig.draft;
        const modules = parseModules(quote.modules_data);

        var html = '<div class="quote-modal-overlay" onclick="QuotesManagement.closeModal(event)">';
        html += '<div class="quote-modal" onclick="event.stopPropagation()">';

        // Header
        html += '<div class="quote-modal-header">';
        html += '<h3>' + status.icon + ' ' + (quote.quote_number || 'Presupuesto') + '</h3>';
        html += '<button class="close-btn" onclick="QuotesManagement.closeModal()">&times;</button>';
        html += '</div>';

        // Body
        html += '<div class="quote-modal-body">';

        // Info general
        html += '<div class="detail-row"><span class="detail-label">Estado</span><span class="detail-value" style="color: ' + status.color + ';">' + status.label + '</span></div>';
        html += '<div class="detail-row"><span class="detail-label">Empresa</span><span class="detail-value">' + (quote.company_name || 'ID: ' + quote.company_id) + '</span></div>';
        html += '<div class="detail-row"><span class="detail-label">Creado</span><span class="detail-value">' + formatDate(quote.created_at) + '</span></div>';

        if (quote.sent_date) {
            html += '<div class="detail-row"><span class="detail-label">Enviado</span><span class="detail-value">' + formatDate(quote.sent_date) + '</span></div>';
        }

        // Módulos
        html += '<h4 style="margin: 20px 0 10px;">Módulos incluidos</h4>';
        html += '<table class="modules-table">';
        html += '<thead><tr><th>Módulo</th><th class="price">Precio/mes</th></tr></thead>';
        html += '<tbody>';

        modules.forEach(function(mod) {
            html += '<tr>';
            html += '<td>' + (mod.module_name || mod.module_key) + '</td>';
            html += '<td class="price">$' + parseFloat(mod.price || 0).toLocaleString('es-AR') + '</td>';
            html += '</tr>';
        });

        html += '<tr style="font-weight: bold; background: #f8f9fa;">';
        html += '<td>TOTAL</td>';
        html += '<td class="price">$' + parseFloat(quote.total_amount || 0).toLocaleString('es-AR') + '/mes</td>';
        html += '</tr>';
        html += '</tbody></table>';

        // Notas
        if (quote.notes) {
            html += '<h4 style="margin: 20px 0 10px;">Notas</h4>';
            html += '<p style="color: #666;">' + quote.notes + '</p>';
        }

        html += '</div>';

        // Footer
        html += '<div class="quote-modal-footer">';
        if (quote.status === 'draft') {
            html += '<button class="btn btn-primary" onclick="QuotesManagement.sendQuote(' + quote.id + ')"><span>📧</span> Enviar por Email</button>';
        }
        html += '<button class="btn btn-warning" onclick="QuotesManagement.downloadPDF(' + quote.id + ')"><span>📄</span> Descargar PDF</button>';
        html += '<button class="btn btn-secondary" onclick="QuotesManagement.closeModal()">Cerrar</button>';
        html += '</div>';

        html += '</div></div>';

        document.body.insertAdjacentHTML('beforeend', html);
    }

    /**
     * Cerrar modal
     */
    function closeModal(event) {
        if (event && event.target.className !== 'quote-modal-overlay') return;
        var overlay = document.querySelector('.quote-modal-overlay');
        if (overlay) overlay.remove();
    }

    /**
     * Enviar presupuesto por email
     */
    async function sendQuote(id) {
        if (!confirm('¿Enviar este presupuesto por email al cliente?')) return;

        try {
            const token = localStorage.getItem('aponnt_token_staff') || sessionStorage.getItem('aponnt_token_staff');
            const response = await fetch('/api/quotes/' + id + '/send-email', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                showToast('Presupuesto enviado correctamente', 'success');
                closeModal();
                await loadQuotes();
            } else {
                showToast('Error: ' + (data.error || 'No se pudo enviar'), 'error');
            }

        } catch (error) {
            console.error('[QUOTES] Error enviando:', error);
            showToast('Error al enviar: ' + error.message, 'error');
        }
    }

    /**
     * Descargar PDF
     */
    async function downloadPDF(id) {
        try {
            const token = localStorage.getItem('aponnt_token_staff') || sessionStorage.getItem('aponnt_token_staff');
            const response = await fetch('/api/quotes/' + id + '/pdf', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (!response.ok) {
                throw new Error('Error al generar PDF');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'presupuesto-' + id + '.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            showToast('PDF descargado', 'success');

        } catch (error) {
            console.error('[QUOTES] Error descargando PDF:', error);
            showToast('Error al descargar PDF: ' + error.message, 'error');
        }
    }

    /**
     * Activar presupuesto (convertir en contrato)
     */
    async function activateQuote(id) {
        if (!confirm('¿Activar este presupuesto? Se creará un contrato activo.')) return;

        try {
            const token = localStorage.getItem('aponnt_token_staff') || sessionStorage.getItem('aponnt_token_staff');
            const response = await fetch('/api/quotes/' + id + '/activate', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                showToast('Presupuesto activado - Contrato creado', 'success');
                await loadQuotes();
            } else {
                showToast('Error: ' + (data.error || 'No se pudo activar'), 'error');
            }

        } catch (error) {
            console.error('[QUOTES] Error activando:', error);
            showToast('Error al activar: ' + error.message, 'error');
        }
    }

    /**
     * Aplicar filtros
     */
    function applyFilters() {
        filters.search = document.getElementById('quote-search')?.value || '';
        filters.status = document.getElementById('quote-status-filter')?.value || '';
        renderQuotesList();
    }

    /**
     * Adjuntar event listeners
     */
    function attachEventListeners() {
        // Los eventos se manejan con onclick inline
    }

    // =========================================================================
    // UTILIDADES
    // =========================================================================

    function parseModules(modulesData) {
        if (!modulesData) return [];
        if (typeof modulesData === 'string') {
            try {
                return JSON.parse(modulesData);
            } catch (e) {
                return [];
            }
        }
        return Array.isArray(modulesData) ? modulesData : [];
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }

    function showToast(message, type) {
        var toast = document.createElement('div');
        toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; padding: 15px 25px; border-radius: 8px; color: white; font-weight: 500; z-index: 9999; animation: slideIn 0.3s ease;';
        toast.style.background = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 4000);
    }

    // =========================================================================
    // API PÚBLICA
    // =========================================================================

    return {
        init: init,
        loadQuotes: loadQuotes,
        viewQuote: viewQuote,
        sendQuote: sendQuote,
        downloadPDF: downloadPDF,
        activateQuote: activateQuote,
        applyFilters: applyFilters,
        closeModal: closeModal
    };

})();
