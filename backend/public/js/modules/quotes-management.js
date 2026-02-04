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
    let currentView = 'list'; // 'list' o 'pipeline'

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
        const container = document.getElementById('module-content') || document.getElementById('mainContent');
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
                    '<h2><span style="font-size: 1.5em;">📋</span> Pipeline de Altas</h2>',
                    '<div class="header-actions" style="display:flex;gap:10px;align-items:center;">',
                        '<div class="view-toggle" style="display:flex;border:1px solid #ddd;border-radius:6px;overflow:hidden;">',
                            '<button id="btn-view-list" class="btn-view active" onclick="QuotesManagement.switchView(\'list\')" style="padding:8px 14px;border:none;cursor:pointer;background:#007bff;color:white;font-size:13px;">📋 Lista</button>',
                            '<button id="btn-view-pipeline" class="btn-view" onclick="QuotesManagement.switchView(\'pipeline\')" style="padding:8px 14px;border:none;cursor:pointer;background:#f8f9fa;color:#333;font-size:13px;">📊 Pipeline</button>',
                        '</div>',
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

                '<div class="pipeline-view" id="pipeline-view" style="display:none;">',
                    '<div class="loading">Cargando pipeline...</div>',
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

            '/* Modal styles - Dark Theme */',
            '.quote-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }',
            '.quote-modal { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; max-width: 750px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); }',
            '.quote-modal-header { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%); border-radius: 16px 16px 0 0; }',
            '.quote-modal-header h3 { margin: 0; color: #f1f5f9; font-size: 18px; }',
            '.quote-modal-body { padding: 24px; color: #e2e8f0; }',
            '.quote-modal-body h4 { color: #f1f5f9; margin-top: 20px; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; }',
            '.quote-modal-footer { padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; background: rgba(0,0,0,0.2); border-radius: 0 0 16px 16px; }',
            '.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; transition: color 0.2s; }',
            '.close-btn:hover { color: #f1f5f9; }',

            '.detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }',
            '.detail-label { color: #94a3b8; font-weight: 500; font-size: 13px; }',
            '.detail-value { font-weight: 600; color: #f1f5f9; font-size: 13px; }',
            '.modules-table { width: 100%; border-collapse: collapse; margin: 15px 0; }',
            '.modules-table th, .modules-table td { padding: 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.08); color: #e2e8f0; font-size: 13px; }',
            '.modules-table th { background: rgba(255,255,255,0.05); font-weight: 600; color: #94a3b8; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }',
            '.modules-table .price { text-align: right; color: #10b981; }',
            '.modules-table tr:last-child { background: rgba(16,185,129,0.1); }',
            '.modules-table tr:last-child td { color: #10b981; font-weight: 700; border-bottom: none; }',

            '/* Pipeline Funnel */',
            '.pipeline-funnel { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-bottom: 15px; }',
            '.funnel-stage { background: #f8f9fa; border-radius: 8px; padding: 12px 16px; text-align: center; cursor: pointer; transition: all 0.2s; min-width: 90px; }',
            '.funnel-stage:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); transform: translateY(-2px); }',
            '.funnel-stage.funnel-active { box-shadow: 0 0 0 2px #007bff; background: #e8f4ff; }',
            '.funnel-count { font-size: 22px; font-weight: bold; }',
            '.funnel-label { font-size: 11px; color: #666; margin-top: 2px; }',
            '.funnel-mrr { font-size: 11px; color: #28a745; font-weight: 600; margin-top: 2px; }',
            '.funnel-arrow { color: #aaa; font-size: 13px; padding: 0 2px; white-space: nowrap; }',
            '.funnel-separator { color: #ccc; font-size: 20px; padding: 0 5px; }',
            '.funnel-clear { font-size: 12px; color: #007bff; cursor: pointer; padding: 5px 10px; }',
            '.pipeline-avg-days { font-size: 12px; color: #888; padding: 5px 0; }',

            '/* Stepper - Dark Theme */',
            '.quote-stepper { display: flex; align-items: center; gap: 0; margin-bottom: 20px; flex-wrap: wrap; }',
            '.stepper-step { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; }',
            '.stepper-step.step-done { background: rgba(16,185,129,0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }',
            '.stepper-step.step-current { background: rgba(251,191,36,0.2); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }',
            '.stepper-step.step-pending { background: rgba(255,255,255,0.05); color: #64748b; border: 1px solid rgba(255,255,255,0.1); }',
            '.stepper-arrow { color: #475569; margin: 0 2px; }',

            '/* Tabs - Dark Theme */',
            '.quote-tabs { display: flex; gap: 0; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px; }',
            '.quote-tab { padding: 12px 20px; cursor: pointer; font-size: 13px; font-weight: 500; color: #64748b; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.2s; }',
            '.quote-tab:hover { color: #e2e8f0; background: rgba(255,255,255,0.03); }',
            '.quote-tab.tab-active { color: #3b82f6; border-bottom-color: #3b82f6; background: rgba(59,130,246,0.1); }',
            '.tab-content { display: none; }',
            '.tab-content.tab-visible { display: block; }',

            '/* Buttons Dark Theme */',
            '.quote-modal-footer .btn { font-size: 12px; padding: 8px 14px; border-radius: 6px; font-weight: 500; transition: all 0.2s; }',
            '.quote-modal-footer .btn-primary { background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; color: white; }',
            '.quote-modal-footer .btn-primary:hover { background: linear-gradient(135deg, #2563eb, #1d4ed8); transform: translateY(-1px); }',
            '.quote-modal-footer .btn-success { background: linear-gradient(135deg, #10b981, #059669); border: none; color: white; }',
            '.quote-modal-footer .btn-success:hover { background: linear-gradient(135deg, #059669, #047857); transform: translateY(-1px); }',
            '.quote-modal-footer .btn-warning { background: linear-gradient(135deg, #f59e0b, #d97706); border: none; color: white; }',
            '.quote-modal-footer .btn-warning:hover { background: linear-gradient(135deg, #d97706, #b45309); transform: translateY(-1px); }',
            '.quote-modal-footer .btn-danger { background: linear-gradient(135deg, #ef4444, #dc2626); border: none; color: white; }',
            '.quote-modal-footer .btn-danger:hover { background: linear-gradient(135deg, #dc2626, #b91c1c); transform: translateY(-1px); }',
            '.quote-modal-footer .btn-secondary { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #e2e8f0; }',
            '.quote-modal-footer .btn-secondary:hover { background: rgba(255,255,255,0.15); }',
            '.quote-modal-footer .btn-outline { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #94a3b8; }',
            '.quote-modal-footer .btn-outline:hover { background: rgba(255,255,255,0.05); color: #e2e8f0; }',

            '/* Footer Layout Groups */',
            '.quote-modal-footer .footer-left { display: flex; gap: 8px; align-items: center; }',
            '.quote-modal-footer .footer-right { display: flex; gap: 8px; align-items: center; }',
            '.quote-modal-footer .status-badge { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }',

            '/* Responsive footer */',
            '@media (max-width: 600px) { .quote-modal-footer { flex-direction: column; gap: 12px; } .footer-left, .footer-right { width: 100%; justify-content: center; } }',
        ].join('\n');
    }

    /**
     * Cargar presupuestos
     */
    async function loadQuotes() {
        try {
            const token = window.getMultiKeyToken();
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

    // Pipeline stats from backend (avg_days, etc.)
    let pipelineStats = {};

    /**
     * Renderizar funnel visual de pipeline
     */
    function renderStats() {
        const container = document.getElementById('quotes-stats');
        if (!container) return;

        // Load pipeline stats async
        loadPipelineStats();

        var funnelStages = [
            { key: 'draft', label: 'Borrador', color: '#6c757d' },
            { key: 'sent', label: 'Enviado', color: '#17a2b8' },
            { key: 'in_trial', label: 'En Trial', color: '#ffc107' },
            { key: 'accepted', label: 'Aceptado', color: '#28a745' },
            { key: 'active', label: 'Activo', color: '#007bff' }
        ];
        var rejectedCount = quotes.filter(function(q) { return q.status === 'rejected'; }).length;
        var rejectedMRR = quotes.filter(function(q) { return q.status === 'rejected'; }).reduce(function(s, q) { return s + parseFloat(q.total_amount || 0); }, 0);

        var html = '<div class="pipeline-funnel">';

        funnelStages.forEach(function(stage, i) {
            var count = quotes.filter(function(q) { return q.status === stage.key; }).length;
            var mrr = quotes.filter(function(q) { return q.status === stage.key; }).reduce(function(s, q) { return s + parseFloat(q.total_amount || 0); }, 0);
            var nextStage = funnelStages[i + 1];
            var nextCount = nextStage ? quotes.filter(function(q) { return q.status === nextStage.key; }).length : 0;
            var convRate = count > 0 && nextStage ? Math.round((nextCount / count) * 100) : null;

            html += '<div class="funnel-stage' + (filters.status === stage.key ? ' funnel-active' : '') + '" ';
            html += 'style="border-top: 3px solid ' + stage.color + ';" ';
            html += 'onclick="QuotesManagement.filterByStatus(\'' + stage.key + '\')">';
            html += '<div class="funnel-count" style="color: ' + stage.color + ';">' + count + '</div>';
            html += '<div class="funnel-label">' + stage.label + '</div>';
            html += '<div class="funnel-mrr">$' + mrr.toLocaleString('es-AR') + '</div>';
            html += '</div>';

            if (nextStage) {
                html += '<div class="funnel-arrow">';
                html += convRate !== null ? convRate + '%' : '';
                html += ' →</div>';
            }
        });

        // Rejected
        html += '<div class="funnel-separator">|</div>';
        html += '<div class="funnel-stage' + (filters.status === 'rejected' ? ' funnel-active' : '') + '" ';
        html += 'style="border-top: 3px solid #dc3545; opacity: 0.7;" ';
        html += 'onclick="QuotesManagement.filterByStatus(\'rejected\')">';
        html += '<div class="funnel-count" style="color: #dc3545;">' + rejectedCount + '</div>';
        html += '<div class="funnel-label">Rechazado</div>';
        html += '<div class="funnel-mrr">$' + rejectedMRR.toLocaleString('es-AR') + '</div>';
        html += '</div>';

        // Clear filter
        if (filters.status) {
            html += '<div class="funnel-clear" onclick="QuotesManagement.filterByStatus(\'\')">[✕ Limpiar]</div>';
        }

        html += '</div>';

        // Pipeline avg days (from backend)
        html += '<div id="pipeline-avg-days" class="pipeline-avg-days"></div>';

        container.innerHTML = html;
    }

    async function loadPipelineStats() {
        try {
            var token = window.getMultiKeyToken();
            var resp = await fetch('/api/quotes/pipeline-stats', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            var data = await resp.json();
            if (data.success && data.stats) {
                pipelineStats = {};
                data.stats.forEach(function(s) { pipelineStats[s.status] = s; });
                var el = document.getElementById('pipeline-avg-days');
                if (el) {
                    var parts = data.stats.filter(function(s) { return s.avg_days; }).map(function(s) {
                        return '<span style="margin-right:15px;"><strong>' + (statusConfig[s.status]?.label || s.status) + ':</strong> ' + s.avg_days + 'd prom</span>';
                    });
                    el.innerHTML = parts.join('');
                }
            }
        } catch (e) { /* non-critical */ }
    }

    function filterByStatus(status) {
        filters.status = status;
        var selectEl = document.getElementById('quote-status-filter');
        if (selectEl) selectEl.value = status;
        renderStats();
        renderQuotesList();
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
     * Cambiar entre vista Lista y Pipeline
     */
    function switchView(view) {
        currentView = view;

        var btnList = document.getElementById('btn-view-list');
        var btnPipeline = document.getElementById('btn-view-pipeline');
        var listContainer = document.getElementById('quotes-list');
        var pipelineContainer = document.getElementById('pipeline-view');
        var filtersContainer = document.querySelector('.quotes-filters');

        if (view === 'list') {
            if (btnList) { btnList.style.background = '#007bff'; btnList.style.color = 'white'; }
            if (btnPipeline) { btnPipeline.style.background = '#f8f9fa'; btnPipeline.style.color = '#333'; }
            if (listContainer) listContainer.style.display = 'block';
            if (pipelineContainer) pipelineContainer.style.display = 'none';
            if (filtersContainer) filtersContainer.style.display = 'flex';
            renderQuotesList();
        } else {
            if (btnList) { btnList.style.background = '#f8f9fa'; btnList.style.color = '#333'; }
            if (btnPipeline) { btnPipeline.style.background = '#007bff'; btnPipeline.style.color = 'white'; }
            if (listContainer) listContainer.style.display = 'none';
            if (pipelineContainer) pipelineContainer.style.display = 'block';
            if (filtersContainer) filtersContainer.style.display = 'none';
            renderPipelineView();
        }
    }

    /**
     * Renderizar vista Pipeline Kanban
     */
    function renderPipelineView() {
        var container = document.getElementById('pipeline-view');
        if (!container) return;

        // Definir columnas del pipeline con fases de onboarding
        var pipelineColumns = [
            { key: 'draft', label: 'Borrador', color: '#6c757d', icon: '📝', actions: ['enviar'] },
            { key: 'sent', label: 'Enviado', color: '#17a2b8', icon: '📧', actions: ['reenviar'] },
            { key: 'in_trial', label: 'En Trial', color: '#ffc107', icon: '🧪', actions: ['aceptar', 'contrato'] },
            { key: 'accepted', label: 'Aceptado', color: '#28a745', icon: '✅', actions: ['contrato', 'prefactura'] },
            { key: 'invoiced', label: 'Facturado', color: '#fd7e14', icon: '📄', actions: ['confirmar_pago'] },
            { key: 'active', label: 'Activo', color: '#007bff', icon: '🟢', actions: [] }
        ];

        // Agregar estado "facturado" virtual basado en billing_status
        var quotesWithBilling = quotes.map(function(q) {
            var virtualStatus = q.status;
            // Si tiene factura y status es accepted, mostrar en "Facturado"
            if (q.status === 'accepted' && q.invoice_id) {
                virtualStatus = 'invoiced';
            }
            return Object.assign({}, q, { virtualStatus: virtualStatus });
        });

        var html = '<div class="pipeline-kanban">';

        // Stats bar superior
        var totalMRR = quotes.reduce(function(sum, q) {
            return sum + ((['accepted', 'active', 'in_trial'].includes(q.status)) ? parseFloat(q.total_amount || 0) : 0);
        }, 0);
        var totalPipeline = quotes.reduce(function(sum, q) { return sum + parseFloat(q.total_amount || 0); }, 0);
        var conversionRate = quotes.length > 0 ? Math.round((quotes.filter(function(q) { return q.status === 'active'; }).length / quotes.length) * 100) : 0;

        html += '<div class="pipeline-stats-bar" style="display:flex;gap:20px;padding:15px 20px;background:#f8fafc;border-radius:8px;margin-bottom:20px;flex-wrap:wrap;">';
        html += '<div style="text-align:center;"><div style="font-size:24px;font-weight:bold;color:#28a745;">$' + totalMRR.toLocaleString('es-AR') + '</div><div style="font-size:11px;color:#666;">MRR Comprometido</div></div>';
        html += '<div style="text-align:center;"><div style="font-size:24px;font-weight:bold;color:#007bff;">$' + totalPipeline.toLocaleString('es-AR') + '</div><div style="font-size:11px;color:#666;">Pipeline Total</div></div>';
        html += '<div style="text-align:center;"><div style="font-size:24px;font-weight:bold;color:#6c757d;">' + conversionRate + '%</div><div style="font-size:11px;color:#666;">Tasa Conversión</div></div>';
        html += '<div style="text-align:center;"><div style="font-size:24px;font-weight:bold;color:#17a2b8;">' + quotes.length + '</div><div style="font-size:11px;color:#666;">Total Presupuestos</div></div>';
        html += '</div>';

        // Columnas del kanban
        html += '<div class="pipeline-columns" style="display:flex;gap:12px;overflow-x:auto;padding-bottom:10px;">';

        pipelineColumns.forEach(function(col) {
            var columnQuotes = quotesWithBilling.filter(function(q) {
                return q.virtualStatus === col.key;
            });
            var columnMRR = columnQuotes.reduce(function(sum, q) { return sum + parseFloat(q.total_amount || 0); }, 0);

            html += '<div class="pipeline-column" style="min-width:220px;max-width:260px;flex:1;background:#f8f9fa;border-radius:8px;padding:12px;">';

            // Header de columna
            html += '<div class="column-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:3px solid ' + col.color + ';">';
            html += '<div style="font-weight:600;font-size:13px;">' + col.icon + ' ' + col.label + '</div>';
            html += '<div style="background:' + col.color + ';color:white;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600;">' + columnQuotes.length + '</div>';
            html += '</div>';

            // MRR de la columna
            html += '<div style="font-size:11px;color:#28a745;font-weight:600;margin-bottom:10px;">$' + columnMRR.toLocaleString('es-AR') + '/mes</div>';

            // Cards
            html += '<div class="column-cards" style="display:flex;flex-direction:column;gap:8px;max-height:calc(100vh - 350px);overflow-y:auto;">';

            if (columnQuotes.length === 0) {
                html += '<div style="text-align:center;padding:20px;color:#aaa;font-size:12px;">Sin presupuestos</div>';
            } else {
                columnQuotes.forEach(function(q) {
                    html += renderPipelineCard(q, col);
                });
            }

            html += '</div>'; // column-cards
            html += '</div>'; // pipeline-column
        });

        // Columna de rechazados (separada)
        var rejectedQuotes = quotes.filter(function(q) { return q.status === 'rejected'; });
        if (rejectedQuotes.length > 0) {
            html += '<div class="pipeline-column" style="min-width:200px;max-width:220px;background:#fff5f5;border-radius:8px;padding:12px;opacity:0.8;">';
            html += '<div class="column-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:3px solid #dc3545;">';
            html += '<div style="font-weight:600;font-size:13px;">❌ Rechazados</div>';
            html += '<div style="background:#dc3545;color:white;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600;">' + rejectedQuotes.length + '</div>';
            html += '</div>';
            html += '<div class="column-cards" style="display:flex;flex-direction:column;gap:8px;max-height:calc(100vh - 350px);overflow-y:auto;">';
            rejectedQuotes.forEach(function(q) {
                html += renderPipelineCard(q, { key: 'rejected', color: '#dc3545' });
            });
            html += '</div>';
            html += '</div>';
        }

        html += '</div>'; // pipeline-columns
        html += '</div>'; // pipeline-kanban

        container.innerHTML = html;
    }

    /**
     * Renderizar card compacta para el pipeline
     */
    function renderPipelineCard(quote, column) {
        var daysInStatus = Math.floor((new Date() - new Date(quote.updated_at || quote.created_at)) / (1000 * 60 * 60 * 24));
        var isStale = daysInStatus > 7 && !['active', 'rejected'].includes(quote.status);

        var html = '<div class="pipeline-card" style="background:white;border-radius:6px;padding:10px;box-shadow:0 1px 3px rgba(0,0,0,0.1);cursor:pointer;border-left:3px solid ' + column.color + ';' + (isStale ? 'border-right:3px solid #dc3545;' : '') + '" onclick="QuotesManagement.viewQuote(' + quote.id + ')">';

        // Empresa
        html += '<div style="font-weight:600;font-size:13px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (quote.company_name || 'Empresa #' + quote.company_id) + '</div>';

        // Número y monto
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
        html += '<span style="font-size:11px;color:#666;">' + (quote.quote_number || '') + '</span>';
        html += '<span style="font-size:12px;font-weight:600;color:#28a745;">$' + parseFloat(quote.total_amount || 0).toLocaleString('es-AR') + '</span>';
        html += '</div>';

        // Días y alertas
        html += '<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#888;">';
        html += '<span>' + daysInStatus + ' días</span>';
        if (isStale) {
            html += '<span style="color:#dc3545;font-weight:600;">⚠️ Estancado</span>';
        }
        html += '</div>';

        // Acción principal según columna
        var actionHtml = getPipelineAction(quote, column.key);
        if (actionHtml) {
            html += '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #eee;" onclick="event.stopPropagation();">';
            html += actionHtml;
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Obtener acción principal para cada fase del pipeline
     */
    function getPipelineAction(quote, columnKey) {
        var btnStyle = 'font-size:10px;padding:4px 8px;width:100%;';

        switch (columnKey) {
            case 'draft':
                return '<button class="btn btn-primary" style="' + btnStyle + '" onclick="QuotesManagement.sendQuote(' + quote.id + ')">📧 Enviar</button>';

            case 'sent':
                return '<button class="btn btn-secondary" style="' + btnStyle + '" onclick="QuotesManagement.sendQuote(' + quote.id + ')">🔄 Reenviar</button>';

            case 'in_trial':
                var html = '<div style="display:flex;gap:4px;">';
                html += '<button class="btn btn-success" style="' + btnStyle + '" onclick="QuotesManagement.changeStatus(' + quote.id + ', \'accepted\')">✅</button>';
                if (quote.contract_status !== 'signed') {
                    html += '<button class="btn btn-warning" style="' + btnStyle + '" onclick="QuotesManagement.sendContract(' + quote.id + ')">📜</button>';
                }
                html += '</div>';
                return html;

            case 'accepted':
                if (quote.contract_status === 'signed') {
                    return '<button class="btn btn-warning" style="' + btnStyle + '" onclick="QuotesManagement.generatePreInvoice(' + quote.id + ')">📄 Prefacturar</button>';
                } else {
                    return '<button class="btn btn-primary" style="' + btnStyle + '" onclick="QuotesManagement.sendContract(' + quote.id + ')">📜 Contrato</button>';
                }

            case 'invoiced':
                return '<button class="btn btn-success" style="' + btnStyle + '" onclick="QuotesManagement.confirmPayment(' + quote.id + ')">💰 Confirmar Pago</button>';

            case 'active':
                return '<span style="font-size:10px;color:#28a745;font-weight:600;">✅ Empresa Activa</span>';

            default:
                return '';
        }
    }

    /**
     * Confirmar pago y activar empresa
     */
    async function confirmPayment(quoteId) {
        if (!confirm('¿Confirmar que el pago fue recibido?\\n\\nEsto activará la empresa definitivamente.')) {
            return;
        }

        try {
            var token = window.getMultiKeyToken();

            // Primero obtener el trace_id del quote
            var quoteRes = await fetch('/api/quotes/' + quoteId, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            var quoteData = await quoteRes.json();
            var traceId = quoteData.trace_id || quoteData.quote?.trace_id;

            if (!traceId) {
                // Si no hay trace_id, usar el endpoint directo de activación
                var activateRes = await fetch('/api/quotes/' + quoteId + '/activate-company', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });
                var activateData = await activateRes.json();

                if (activateData.success) {
                    showToast('✅ Empresa activada correctamente', 'success');
                    await loadQuotes();
                    if (currentView === 'pipeline') renderPipelineView();
                } else {
                    showToast('Error: ' + (activateData.error || 'No se pudo activar'), 'error');
                }
                return;
            }

            // Confirmar pago via onboarding
            var paymentRes = await fetch('/api/onboarding/' + traceId + '/invoice/confirm-payment', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ payment_method: 'transfer', confirmed_by: 'admin' })
            });
            var paymentData = await paymentRes.json();

            if (!paymentData.success) {
                showToast('Error confirmando pago: ' + (paymentData.error || 'Error desconocido'), 'error');
                return;
            }

            // Activar empresa
            var activateRes2 = await fetch('/api/onboarding/' + traceId + '/activate', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });
            var activateData2 = await activateRes2.json();

            if (activateData2.success) {
                showToast('✅ Pago confirmado y empresa activada', 'success');
                await loadQuotes();
                if (currentView === 'pipeline') renderPipelineView();
            } else {
                showToast('Pago confirmado pero error al activar: ' + (activateData2.error || ''), 'warning');
            }

        } catch (error) {
            console.error('[QUOTES] Error confirmando pago:', error);
            showToast('Error: ' + error.message, 'error');
        }
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
        html += '<div class="quote-actions" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;">';
        html += '<button class="btn btn-outline" onclick="QuotesManagement.viewQuote(' + quote.id + ')" style="font-size:11px;padding:5px 8px;"><span>👁️</span> Ver</button>';

        var btnStyle = 'font-size:11px;padding:5px 8px;';

        if (quote.status === 'draft') {
            html += '<button class="btn btn-primary" onclick="QuotesManagement.sendQuote(' + quote.id + ')" style="' + btnStyle + '"><span>📧</span> Enviar</button>';
            html += '<button class="btn btn-secondary" onclick="QuotesManagement.editQuote(' + quote.id + ')" style="' + btnStyle + '"><span>✏️</span> Editar</button>';
        }

        if (quote.status === 'sent') {
            html += '<button class="btn btn-primary" onclick="QuotesManagement.sendQuote(' + quote.id + ')" style="' + btnStyle + '"><span>🔄</span> Reenviar</button>';
        }

        if (quote.status === 'sent' || quote.status === 'draft') {
            html += '<button class="btn btn-warning" onclick="QuotesManagement.downloadPDF(' + quote.id + ')" style="' + btnStyle + '"><span>📄</span> PDF</button>';
        }

        if (quote.status === 'accepted') {
            html += '<button class="btn btn-success" onclick="QuotesManagement.activateQuote(' + quote.id + ')" style="' + btnStyle + '"><span>🚀</span> Activar</button>';
        }

        // Cambiar estado manualmente (in_trial -> accepted)
        if (quote.status === 'in_trial') {
            html += '<button class="btn btn-success" onclick="QuotesManagement.changeStatus(' + quote.id + ', \'accepted\')" title="Marcar como Aceptado" style="' + btnStyle + '"><span>✅</span> Aceptar</button>';
        }

        // Revertir a Enviado (solo para in_trial, accepted, rejected)
        if (['in_trial', 'accepted', 'rejected'].includes(quote.status)) {
            html += '<button class="btn btn-outline" onclick="QuotesManagement.revertToSent(' + quote.id + ')" title="Revertir a Enviado" style="' + btnStyle + '"><span>↩️</span></button>';
        }

        // === CONTRATO EULA ===
        // Mostrar botón de contrato para quotes aceptados, activos o en trial
        var showContractBtn = ['accepted', 'active', 'in_trial'].includes(quote.status);
        if (showContractBtn) {
            html += renderContractButton(quote);
        }

        // === CIRCUITO FACTURACIÓN (para quotes accepted, active, e in_trial) ===
        if (['accepted', 'active', 'in_trial'].includes(quote.status)) {
            html += renderInvoiceCircuit(quote);
        }

        // Ver historial de estados
        html += '<button class="btn btn-outline" onclick="QuotesManagement.viewStatusHistory(' + quote.id + ')" title="Ver historial de cambios de estado" style="' + btnStyle + '"><span>📜</span></button>';

        html += '</div>';
        html += '</div>';

        return html;
    }

    /**
     * Ver detalle de presupuesto (enriquecido con full-context)
     */
    async function viewQuote(id) {
        const quote = quotes.find(function(q) { return q.id === id; });
        if (!quote) return;

        currentQuote = quote;
        const status = statusConfig[quote.status] || statusConfig.draft;
        const modules = parseModules(quote.modules_data);

        // Fetch full context
        var ctx = { contract: null, invoice: null, trials: [], lead: null, onboarding_phase: '' };
        try {
            var token = window.getMultiKeyToken();
            var resp = await fetch('/api/quotes/' + id + '/full-context', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            var ctxData = await resp.json();
            if (ctxData.success) {
                ctx = ctxData;
            }
        } catch (e) { /* fallback to basic view */ }

        var html = '<div class="quote-modal-overlay" onclick="QuotesManagement.closeModal(event)">';
        html += '<div class="quote-modal" onclick="event.stopPropagation()" style="max-width: 800px;">';

        // Header
        html += '<div class="quote-modal-header">';
        html += '<div>';
        html += '<h3>' + status.icon + ' ' + (quote.quote_number || 'Presupuesto') + '</h3>';
        if (ctx.onboarding_phase) {
            html += '<span style="font-size:12px;background:#e8f4ff;color:#1565c0;padding:3px 10px;border-radius:10px;">' + ctx.onboarding_phase + '</span>';
        }
        html += '</div>';
        html += '<button class="close-btn" onclick="QuotesManagement.closeModal()">&times;</button>';
        html += '</div>';

        // Stepper
        html += '<div style="padding: 15px 20px 0;">';
        html += renderStepper(quote, ctx);
        html += '</div>';

        // Tabs
        html += '<div style="padding: 0 20px;">';
        html += '<div class="quote-tabs">';
        html += '<div class="quote-tab tab-active" onclick="QuotesManagement.switchTab(\'presupuesto\', this)">Presupuesto</div>';
        html += '<div class="quote-tab" onclick="QuotesManagement.switchTab(\'ficha\', this)">Ficha de Alta</div>';
        html += '<div class="quote-tab" onclick="QuotesManagement.switchTab(\'contrato\', this)">Contrato & Pago</div>';
        html += '</div>';
        html += '</div>';

        // Body
        html += '<div class="quote-modal-body">';

        // TAB 1: Presupuesto
        html += '<div class="tab-content tab-visible" id="tab-presupuesto">';
        html += '<div class="detail-row"><span class="detail-label">Estado</span><span class="detail-value" style="color: ' + status.color + ';">' + status.label + '</span></div>';
        html += '<div class="detail-row"><span class="detail-label">Empresa</span><span class="detail-value">' + (quote.company_name || 'ID: ' + quote.company_id) + '</span></div>';
        html += '<div class="detail-row"><span class="detail-label">Creado</span><span class="detail-value">' + formatDate(quote.created_at) + '</span></div>';
        if (quote.sent_date) {
            html += '<div class="detail-row"><span class="detail-label">Enviado</span><span class="detail-value">' + formatDate(quote.sent_date) + '</span></div>';
        }
        if (ctx.lead) {
            html += '<div class="detail-row"><span class="detail-label">Lead origen</span><span class="detail-value">' + (ctx.lead.company_name || '') + ' (' + (ctx.lead.temperature || '') + ')</span></div>';
        }

        html += '<h4 style="margin: 20px 0 10px;">Módulos incluidos</h4>';
        html += '<table class="modules-table"><thead><tr><th>Módulo</th><th class="price">Precio/mes</th></tr></thead><tbody>';
        modules.forEach(function(mod) {
            html += '<tr><td>' + (mod.module_name || mod.module_key) + '</td><td class="price">$' + parseFloat(mod.price || 0).toLocaleString('es-AR') + '</td></tr>';
        });
        html += '<tr style="font-weight: bold; background: rgba(16,185,129,0.15);"><td style="color:#10b981;">TOTAL</td><td class="price" style="color:#10b981;font-size:15px;">$' + parseFloat(quote.total_amount || 0).toLocaleString('es-AR') + '/mes</td></tr>';
        html += '</tbody></table>';
        if (quote.notes) {
            html += '<h4 style="margin: 20px 0 10px;">Notas</h4><p style="color: #cbd5e1;">' + quote.notes + '</p>';
        }
        html += '</div>';

        // TAB 2: Ficha de Alta
        html += '<div class="tab-content" id="tab-ficha">';
        var hasOnboarding = quote.company_legal_name || quote.company_tax_id;
        if (hasOnboarding) {
            html += '<div style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);border-radius:8px;padding:14px;margin-bottom:10px;">';
            [{ label: 'Razón Social', val: quote.company_legal_name },
             { label: 'CUIT / Tax ID', val: quote.company_tax_id },
             { label: 'Dirección', val: quote.company_address },
             { label: 'Ciudad', val: quote.company_city },
             { label: 'Provincia', val: quote.company_province },
             { label: 'País', val: quote.company_country },
             { label: 'Teléfono', val: quote.company_phone }
            ].forEach(function(f) {
                if (f.val) html += '<div class="detail-row"><span class="detail-label">' + f.label + '</span><span class="detail-value">' + f.val + '</span></div>';
            });

            var meta = quote.company_metadata;
            if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch(e) { meta = null; } }
            if (meta && meta.onboarding_admin) {
                var admin = meta.onboarding_admin;
                html += '<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(59,130,246,0.25);">';
                html += '<strong style="color:#93c5fd;">👤 Administrador designado</strong>';
                if (admin.full_name) html += '<div class="detail-row"><span class="detail-label">Nombre</span><span class="detail-value">' + admin.full_name + '</span></div>';
                if (admin.email) html += '<div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">' + admin.email + '</span></div>';
                if (admin.phone) html += '<div class="detail-row"><span class="detail-label">Teléfono</span><span class="detail-value">' + admin.phone + '</span></div>';
                html += '</div>';
            }
            html += '</div>';
        } else {
            html += '<p style="color:#64748b;text-align:center;padding:20px;">El cliente aún no completó la ficha de alta.</p>';
        }
        // Trials
        if (ctx.trials && ctx.trials.length > 0) {
            html += '<h4 style="margin:15px 0 10px;">Trials de Módulos</h4>';
            ctx.trials.forEach(function(t) {
                var tColor = t.status === 'active' ? '#28a745' : t.status === 'expired' ? '#dc3545' : '#ffc107';
                html += '<div class="detail-row"><span class="detail-label">' + t.module_key + '</span><span class="detail-value" style="color:' + tColor + ';">' + t.status + ' (' + formatDate(t.start_date) + ' - ' + formatDate(t.end_date) + ')</span></div>';
            });
        }
        html += '</div>';

        // TAB 3: Contrato & Pago
        html += '<div class="tab-content" id="tab-contrato">';

        // Contrato existente
        if (ctx.contract) {
            html += '<h4>Contrato Firmado</h4>';
            html += '<div class="detail-row"><span class="detail-label">Estado</span><span class="detail-value">' + (ctx.contract.status || '-') + '</span></div>';
            html += '<div class="detail-row"><span class="detail-label">Fecha firma</span><span class="detail-value">' + formatDate(ctx.contract.signed_date) + '</span></div>';
            html += '<div class="detail-row"><span class="detail-label">Inicio</span><span class="detail-value">' + formatDate(ctx.contract.start_date) + '</span></div>';
            html += '<div class="detail-row"><span class="detail-label">Fin</span><span class="detail-value">' + formatDate(ctx.contract.end_date) + '</span></div>';
        }

        // Estado del contrato EULA
        var cs = quote.contract_status || 'none';
        var csColors = { none: '#6c757d', draft: '#ffc107', sent: '#17a2b8', signed: '#28a745' };
        var csLabels = { none: 'Sin generar', draft: 'Borrador', sent: 'Enviado al cliente', signed: 'Firmado' };

        html += '<div style="margin:15px 0;padding:15px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:8px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
        html += '<h4 style="margin:0;color:#a5b4fc;">EULA / Contrato MSA v2.0</h4>';
        html += '<span style="background:' + csColors[cs] + ';color:white;padding:3px 10px;border-radius:10px;font-size:12px;">' + csLabels[cs] + '</span>';
        html += '</div>';

        if (cs === 'signed') {
            html += '<div style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:6px;padding:10px;margin-bottom:10px;">';
            html += '<strong style="color:#34d399;">✅ EULA Aceptado</strong>';
            if (quote.contract_signed_at) html += '<br><small style="color:#6ee7b7;">Fecha: ' + formatDate(quote.contract_signed_at) + '</small>';
            if (quote.contract_signature_ip) html += '<br><small style="color:#6ee7b7;">IP: ' + quote.contract_signature_ip + '</small>';

            // Mostrar datos de aceptación EULA si existen
            var acceptData = quote.contract_acceptance_data;
            if (typeof acceptData === 'string') { try { acceptData = JSON.parse(acceptData); } catch(e) { acceptData = null; } }
            if (acceptData) {
                html += '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed rgba(16,185,129,0.3);font-size:11px;color:#a7f3d0;">';
                html += '<div><strong>ID Aceptacion:</strong> ' + (acceptData.acceptance_id || '-').substring(0, 8) + '...</div>';
                html += '<div><strong>Hash documento:</strong> ' + (acceptData.document_hash || '-').substring(0, 16) + '...</div>';
                html += '<div><strong>Version:</strong> ' + (acceptData.document_version || 'v2.0') + '</div>';
                html += '</div>';
            }
            html += '</div>';
        }
        if (cs === 'sent') {
            var sentData = quote.contract_acceptance_data;
            if (typeof sentData === 'string') { try { sentData = JSON.parse(sentData); } catch(e) { sentData = null; } }
            html += '<div style="background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);border-radius:6px;padding:10px;margin-bottom:10px;">';
            html += '<p style="font-size:12px;color:#93c5fd;margin:0;">📧 Enviado el ' + formatDate(quote.contract_sent_at) + '</p>';
            if (sentData && sentData.sent_to_email) {
                html += '<p style="font-size:12px;color:#93c5fd;margin:5px 0 0;"><strong>Email destino:</strong> ' + sentData.sent_to_email + '</p>';
            }
            html += '<p style="font-size:11px;color:#60a5fa;margin:5px 0 0;">El cliente debe hacer click en el link del email para aceptar.</p>';
            html += '</div>';
        }

        html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
        html += '<button class="btn btn-outline" onclick="QuotesManagement.showContractPreview(' + quote.id + ')" style="font-size:12px;">📄 Ver Contrato</button>';
        html += '<button class="btn btn-outline" onclick="QuotesManagement.downloadContractPDF(' + quote.id + ')" style="font-size:12px;">📥 PDF</button>';
        if (cs === 'none') {
            html += '<button class="btn btn-primary" onclick="QuotesManagement.generateContract(' + quote.id + ')" style="font-size:12px;">📝 Generar</button>';
        }
        if (cs === 'draft') {
            html += '<button class="btn btn-primary" onclick="QuotesManagement.sendContract(' + quote.id + ')" style="font-size:12px;">📨 Enviar al Cliente</button>';
        }
        if (cs === 'sent') {
            html += '<button class="btn btn-outline" onclick="QuotesManagement.sendContract(' + quote.id + ')" style="font-size:12px;">🔄 Reenviar</button>';
            html += '<button class="btn btn-success" onclick="QuotesManagement.markContractSigned(' + quote.id + ')" style="font-size:12px;">✍️ Registrar Firma</button>';
        }
        if (cs === 'signed') {
            html += '<button class="btn btn-outline" onclick="QuotesManagement.downloadContractPDF(' + quote.id + ')" style="font-size:12px;">📥 Descargar PDF Firmado</button>';
        }
        html += '</div>';
        html += '</div>';

        // Factura
        if (ctx.invoice) {
            html += '<h4 style="margin-top:15px;">Factura</h4>';
            var invColor = ctx.invoice.status === 'paid' ? '#28a745' : ctx.invoice.status === 'sent' ? '#17a2b8' : '#ffc107';
            html += '<div class="detail-row"><span class="detail-label">Numero</span><span class="detail-value">' + (ctx.invoice.invoice_number || '-') + '</span></div>';
            html += '<div class="detail-row"><span class="detail-label">Estado</span><span class="detail-value" style="color:' + invColor + ';">' + (ctx.invoice.status || '-') + '</span></div>';
            html += '<div class="detail-row"><span class="detail-label">Monto</span><span class="detail-value">$' + parseFloat(ctx.invoice.total_amount || 0).toLocaleString('es-AR') + '</span></div>';
            html += '<div class="detail-row"><span class="detail-label">Vencimiento</span><span class="detail-value">' + formatDate(ctx.invoice.due_date) + '</span></div>';
            if (ctx.invoice.paid_at) {
                html += '<div class="detail-row"><span class="detail-label">Pagada</span><span class="detail-value" style="color:#28a745;">' + formatDate(ctx.invoice.paid_at) + '</span></div>';
            }
        } else {
            html += '<p style="color:#888;margin-top:15px;">Sin factura generada.</p>';
        }
        html += '</div>';

        html += '</div>';

        // Footer - Reorganizado en grupos lógicos
        html += '<div class="quote-modal-footer" style="justify-content:space-between;align-items:center;">';

        // Grupo izquierdo: Acciones secundarias
        html += '<div class="footer-left" style="display:flex;gap:8px;align-items:center;">';
        html += '<button class="btn btn-outline" onclick="QuotesManagement.viewStatusHistory(' + quote.id + ')" title="Ver historial de cambios de estado"><span>📜</span> Historial</button>';
        if (['in_trial', 'accepted', 'rejected'].includes(quote.status)) {
            html += '<button class="btn btn-outline" onclick="QuotesManagement.revertToSent(' + quote.id + ')" title="Revertir el presupuesto al estado Enviado" style="color:#ef4444;border-color:rgba(239,68,68,0.3);"><span>↩️</span> Revertir</button>';
        }
        html += '</div>';

        // Grupo derecho: Acciones principales
        html += '<div class="footer-right" style="display:flex;gap:8px;align-items:center;">';

        // ALTA MANUAL - Solo para roles de alta gerencia
        var staffRole = getStaffRole();
        var companyActiveFromQuote = quote.company_is_active;
        var companyActiveFromCtx = ctx.quote && ctx.quote.company_is_active;
        var companyActive = companyActiveFromQuote || companyActiveFromCtx;
        var allowedRoles = ['GG', 'GERENTE_GENERAL', 'SUPERADMIN', 'superadmin', 'gerente_general', 'DIR', 'DIRECTOR'];
        var hasRole = allowedRoles.includes(staffRole);
        var hasCompanyId = !!quote.company_id;

        console.log('🔍 [QUOTES] Alta Manual check:', {
            staffRole, hasRole, companyActive, companyId: quote.company_id
        });

        // Estado de empresa / Alta Manual
        if (hasRole) {
            if (companyActive) {
                html += '<span class="status-badge success" style="background:rgba(16,185,129,0.2);color:#10b981;padding:6px 12px;border-radius:6px;font-size:12px;border:1px solid rgba(16,185,129,0.3);" title="La empresa ya está activa y operativa">✅ Empresa Activa</span>';
            } else if (hasCompanyId) {
                html += '<button class="btn btn-success" onclick="QuotesManagement.showManualOnboardingModal(' + quote.id + ', ' + quote.company_id + ')" title="Activar la empresa manualmente sin esperar el flujo automático"><span>🏢</span> Alta Manual</button>';
            } else {
                html += '<span class="status-badge warning" style="background:rgba(245,158,11,0.2);color:#f59e0b;padding:6px 12px;border-radius:6px;font-size:12px;border:1px solid rgba(245,158,11,0.3);" title="No hay empresa asociada a este presupuesto">⚠️ Sin empresa</span>';
            }
        }

        // Botón principal de envío según estado
        if (quote.status === 'draft') {
            html += '<button class="btn btn-primary" onclick="QuotesManagement.sendQuote(' + quote.id + ')" title="Enviar presupuesto al cliente por email"><span>📧</span> Enviar Presupuesto</button>';
        }
        if (quote.status === 'sent') {
            html += '<button class="btn btn-primary" onclick="QuotesManagement.sendQuote(' + quote.id + ')" title="Reenviar presupuesto al cliente"><span>🔄</span> Reenviar</button>';
        }

        html += '<button class="btn btn-secondary" onclick="QuotesManagement.closeModal()">Cerrar</button>';
        html += '</div>';

        html += '</div>';

        html += '</div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
    }

    /**
     * Render stepper visual
     */
    function renderStepper(quote, ctx) {
        var contractSigned = quote.contract_status === 'signed' || !!ctx.contract;
        var steps = [
            { label: 'Presupuesto', done: true },
            { label: 'Trial', done: ['in_trial', 'accepted', 'active'].includes(quote.status) },
            { label: 'Contrato', done: contractSigned },
            { label: 'Factura', done: !!ctx.invoice },
            { label: 'Pago', done: ctx.invoice && ctx.invoice.status === 'paid' },
            { label: 'Activo', done: quote.status === 'active' || (ctx.quote && ctx.quote.company_is_active) }
        ];

        // Find current step
        var currentIdx = 0;
        for (var i = steps.length - 1; i >= 0; i--) {
            if (steps[i].done) { currentIdx = i + 1; break; }
        }

        var html = '<div class="quote-stepper">';
        steps.forEach(function(step, idx) {
            var cls = step.done ? 'step-done' : (idx === currentIdx ? 'step-current' : 'step-pending');
            var icon = step.done ? '✅' : (idx === currentIdx ? '⏳' : '○');
            html += '<div class="stepper-step ' + cls + '">' + icon + ' ' + step.label + '</div>';
            if (idx < steps.length - 1) html += '<span class="stepper-arrow">→</span>';
        });
        html += '</div>';
        return html;
    }

    /**
     * Renderizar boton de contrato en la tarjeta del quote
     */
    function renderContractButton(quote) {
        var cs = quote.contract_status || 'none';
        var html = '';

        if (cs === 'none') {
            html += '<button class="btn btn-outline" onclick="event.stopPropagation(); QuotesManagement.generateContract(' + quote.id + ')" title="Generar contrato EULA">';
            html += '<span>📝</span> Generar Contrato</button>';
        } else if (cs === 'draft') {
            html += '<button class="btn btn-primary" onclick="event.stopPropagation(); QuotesManagement.sendContract(' + quote.id + ')" title="Enviar contrato al cliente para firma">';
            html += '<span>📨</span> Enviar Contrato</button>';
            html += '<button class="btn btn-outline" onclick="event.stopPropagation(); QuotesManagement.showContractPreview(' + quote.id + ')" title="Ver contrato">';
            html += '<span>📄</span> Ver</button>';
        } else if (cs === 'sent') {
            html += '<span class="quote-status" style="background:#17a2b8;font-size:11px;margin-right:5px;">Contrato Enviado</span>';
            html += '<button class="btn btn-outline" onclick="event.stopPropagation(); QuotesManagement.sendContract(' + quote.id + ')" title="Reenviar contrato">';
            html += '<span>🔄</span> Reenviar</button>';
            html += '<button class="btn btn-success" onclick="event.stopPropagation(); QuotesManagement.markContractSigned(' + quote.id + ')" title="Registrar firma del cliente">';
            html += '<span>✍️</span> Registrar Firma</button>';
            html += '<button class="btn btn-outline" onclick="event.stopPropagation(); QuotesManagement.showContractPreview(' + quote.id + ')">';
            html += '<span>📄</span> Ver</button>';
        } else if (cs === 'signed') {
            html += '<span class="quote-status" style="background:#28a745;font-size:11px;margin-right:5px;">Contrato Firmado ✅</span>';
            html += '<button class="btn btn-outline" onclick="event.stopPropagation(); QuotesManagement.showContractPreview(' + quote.id + ')">';
            html += '<span>📄</span> Ver</button>';
        }

        return html;
    }

    /**
     * Generar contrato (draft)
     */
    async function generateContract(quoteId) {
        try {
            var token = window.getMultiKeyToken();
            var resp = await fetch('/api/quotes/' + quoteId + '/contract/generate', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            var data = await resp.json();
            if (!data.success) throw new Error(data.error);
            showToast('Contrato generado. Revise y envie al cliente.', 'success');
            await loadQuotes();
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        }
    }

    /**
     * Enviar contrato al cliente por email
     */
    async function sendContract(quoteId) {
        if (!confirm('¿Enviar el contrato EULA por email al cliente?\n\nEl cliente recibira un link para aceptar los terminos.')) return;
        try {
            var token = window.getMultiKeyToken();
            var resp = await fetch('/api/quotes/' + quoteId + '/contract/send', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            var data = await resp.json();
            if (!data.success) throw new Error(data.error);

            // Mostrar resultado con link de aceptacion
            var msg = 'Email enviado a: ' + (data.sent_to || 'cliente');
            if (data.acceptance_link) {
                msg += '\n\nLink de aceptacion (valido 7 dias):\n' + data.acceptance_link;
                msg += '\n\n¿Copiar link al portapapeles?';
                if (confirm(msg)) {
                    navigator.clipboard.writeText(data.acceptance_link).then(function() {
                        showToast('Link copiado al portapapeles', 'success');
                    }).catch(function() {
                        prompt('Copie este link:', data.acceptance_link);
                    });
                }
            } else {
                showToast(msg, 'success');
            }

            await loadQuotes();
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        }
    }

    /**
     * Registrar aceptacion EULA del cliente
     * Los EULA funcionan con simple aceptacion de terminos + registro de metadatos
     */
    async function markContractSigned(quoteId) {
        // Confirmación simple - EULA es "Acepto los términos"
        if (!confirm('¿Confirmar que el cliente ACEPTO los terminos del contrato EULA MSA v2.0?\n\nSe registrara:\n- Timestamp de aceptacion\n- IP del cliente\n- Hash del documento (inmutabilidad)\n- User-Agent del navegador')) {
            return;
        }

        try {
            var token = window.getMultiKeyToken();
            var resp = await fetch('/api/quotes/' + quoteId + '/contract/sign', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // EULA: no necesita nombre/DNI, la identidad viene de la sesion
                    acceptance_type: 'eula_click',
                    user_agent: navigator.userAgent,
                    screen_resolution: window.screen.width + 'x' + window.screen.height,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                })
            });
            var data = await resp.json();
            if (!data.success) throw new Error(data.error);

            showToast('EULA aceptado. Registro inmutable creado. Proceder con facturacion.', 'success');
            await loadQuotes();
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        }
    }

    /**
     * Descargar contrato en PDF
     */
    async function downloadContractPDF(quoteId) {
        try {
            var token = window.getMultiKeyToken();
            var resp = await fetch('/api/quotes/' + quoteId + '/contract-pdf', {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (!resp.ok) {
                var err = await resp.json();
                throw new Error(err.error || 'Error generando PDF');
            }

            // Descargar el blob
            var blob = await resp.blob();
            var url = window.URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'contrato-eula-quote-' + quoteId + '.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            showToast('PDF descargado', 'success');
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        }
    }

    // Mantener para compatibilidad con test E2E
    async function confirmContractSign(quoteId) {
        return markContractSigned(quoteId);
    }

    /**
     * Mostrar preview del contrato EULA completo
     */
    async function showContractPreview(quoteId) {
        try {
            var token = window.getMultiKeyToken();
            var resp = await fetch('/api/quotes/' + quoteId + '/contract-preview', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            var data = await resp.json();
            if (!data.success) throw new Error(data.error || 'Error cargando contrato');

            var tpl = data.template;
            var q = data.quote;

            // Build replacements
            var replacements = {
                '{{APONNT_LEGAL_NAME}}': 'APONNT S.A.S.',
                '{{APONNT_ADDRESS}}': 'Ciudad Autonoma de Buenos Aires, Argentina',
                '{{APONNT_CUIT}}': '30-XXXXXXXX-X',
                '{{COMPANY_LEGAL_NAME}}': q.company_legal_name || q.company_name || 'EMPRESA',
                '{{COMPANY_ADDRESS}}': [q.company_address, q.company_city, q.company_province, q.company_country].filter(Boolean).join(', ') || '-',
                '{{COMPANY_CUIT}}': q.company_tax_id || '-'
            };

            var contractHtml = '<div class="quote-modal-overlay" onclick="QuotesManagement.closeContractPreview(event)" style="z-index:2000;">';
            contractHtml += '<div class="quote-modal" onclick="event.stopPropagation()" style="max-width:900px;max-height:95vh;">';
            contractHtml += '<div class="quote-modal-header" style="background:#1e3a5f;color:white;">';
            contractHtml += '<div><h3>' + tpl.header.title + '</h3>';
            contractHtml += '<p style="font-size:12px;margin:4px 0 0;opacity:0.8;">' + tpl.header.subtitle + ' - ' + tpl.header.version + '</p></div>';
            contractHtml += '<button class="close-btn" onclick="QuotesManagement.closeContractPreview()" style="color:white;">&times;</button>';
            contractHtml += '</div>';
            contractHtml += '<div class="quote-modal-body" style="padding:30px;font-size:13px;line-height:1.7;max-height:75vh;overflow-y:auto;">';

            // Secciones
            tpl.sections.forEach(function(sec) {
                var content = sec.content;
                Object.keys(replacements).forEach(function(k) {
                    content = content.split(k).join(replacements[k]);
                });
                contractHtml += '<div style="margin-bottom:25px;">';
                contractHtml += '<h4 style="color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:5px;margin-bottom:10px;">' + sec.id + '. ' + sec.title + '</h4>';
                contractHtml += '<div style="white-space:pre-wrap;color:#333;">' + content + '</div>';
                contractHtml += '</div>';
            });

            // Anexo A con datos del quote
            contractHtml += '<div style="margin-bottom:25px;background:#f8f9fa;padding:20px;border-radius:8px;border:2px solid #1e3a5f;">';
            contractHtml += '<h4 style="color:#1e3a5f;margin:0 0 15px;">ANEXO A: ORDER FORM</h4>';
            contractHtml += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';

            var annFields = [
                ['Razon Social', q.company_legal_name || q.company_name || '-'],
                ['CUIT', q.company_tax_id || '-'],
                ['Domicilio', replacements['{{COMPANY_ADDRESS}}']],
                ['Telefono', q.company_phone || '-']
            ];
            annFields.forEach(function(f) {
                contractHtml += '<tr><td style="padding:6px 10px;border-bottom:1px solid #ddd;font-weight:600;width:30%;">' + f[0] + '</td><td style="padding:6px 10px;border-bottom:1px solid #ddd;">' + f[1] + '</td></tr>';
            });

            // Modulos
            var mods = [];
            try { mods = typeof q.modules_data === 'string' ? JSON.parse(q.modules_data || '[]') : (q.modules_data || []); } catch(e) {}
            contractHtml += '<tr><td style="padding:6px 10px;font-weight:600;vertical-align:top;">Modulos Contratados</td><td style="padding:6px 10px;">';
            mods.forEach(function(m) {
                contractHtml += (m.module_name || m.module_key) + ' — $' + parseFloat(m.price || 0).toLocaleString('es-AR') + '/mes<br>';
            });
            contractHtml += '</td></tr>';
            contractHtml += '<tr style="background:#e2e8f0;font-weight:bold;"><td style="padding:8px 10px;">MONTO MENSUAL TOTAL</td><td style="padding:8px 10px;">$' + parseFloat(q.total_amount || 0).toLocaleString('es-AR') + '/mes</td></tr>';
            contractHtml += '</table>';
            contractHtml += '</div>';

            // Aceptacion electronica EULA (click-wrap)
            contractHtml += '<div style="margin-top:30px;background:#f0fdf4;border:2px solid #22c55e;border-radius:8px;padding:20px;">';
            contractHtml += '<h4 style="margin:0 0 10px;color:#166534;">ACEPTACION ELECTRONICA</h4>';
            contractHtml += '<p style="font-size:13px;color:#166534;margin:0 0 10px;">Este contrato se acepta electronicamente mediante el link enviado por email al cliente.</p>';
            contractHtml += '<p style="font-size:12px;color:#666;margin:0;">Al hacer click en "Acepto los Terminos", se registra automaticamente:</p>';
            contractHtml += '<ul style="font-size:11px;color:#666;margin:8px 0 0 20px;padding:0;">';
            contractHtml += '<li>Timestamp UTC de aceptacion</li>';
            contractHtml += '<li>Email del aceptante</li>';
            contractHtml += '<li>Direccion IP</li>';
            contractHtml += '<li>Hash SHA-256 del documento (inmutabilidad)</li>';
            contractHtml += '</ul>';
            contractHtml += '<p style="font-size:10px;color:#888;margin:10px 0 0;font-style:italic;">Conforme Ley 25.506 de Firma Digital</p>';
            contractHtml += '</div>';

            contractHtml += '</div>';
            contractHtml += '<div class="quote-modal-footer" style="display:flex;justify-content:space-between;">';
            contractHtml += '<button class="btn btn-primary" onclick="QuotesManagement.downloadContractPDF(' + quoteId + ')"><span>📥</span> Descargar PDF</button>';
            contractHtml += '<button class="btn btn-secondary" onclick="QuotesManagement.closeContractPreview()">Cerrar</button>';
            contractHtml += '</div>';
            contractHtml += '</div></div>';

            document.body.insertAdjacentHTML('beforeend', contractHtml);

        } catch (e) {
            alert('Error cargando contrato: ' + e.message);
        }
    }

    function closeContractPreview(event) {
        // Si se llama con evento, verificar que sea el overlay
        if (event && event.target && event.target !== event.currentTarget) return;
        // Buscar el overlay del contrato (el que tiene z-index 2000)
        var contractOverlay = document.querySelector('.quote-modal-overlay[style*="z-index:2000"], .quote-modal-overlay[style*="z-index: 2000"]');
        if (contractOverlay) {
            contractOverlay.remove();
        } else {
            // Fallback: remover el último overlay si hay más de uno
            var overlays = document.querySelectorAll('.quote-modal-overlay');
            if (overlays.length > 1) {
                overlays[overlays.length - 1].remove();
            }
        }
    }

    /**
     * Switch tab in modal
     */
    function switchTab(tabId, el) {
        document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('tab-visible'); });
        document.querySelectorAll('.quote-tab').forEach(function(t) { t.classList.remove('tab-active'); });
        var tab = document.getElementById('tab-' + tabId);
        if (tab) tab.classList.add('tab-visible');
        if (el) el.classList.add('tab-active');
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
            const token = window.getMultiKeyToken();
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
            const token = window.getMultiKeyToken();
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
            const token = window.getMultiKeyToken();
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
     * Revertir presupuesto a estado "Enviado"
     */
    async function revertToSent(id) {
        var reason = prompt('Razón para revertir este presupuesto a "Enviado":');
        if (!reason || reason.trim().length < 5) {
            if (reason !== null) showToast('La razón debe tener al menos 5 caracteres', 'error');
            return;
        }

        try {
            var token = window.getMultiKeyToken();
            var response = await fetch('/api/quotes/' + id + '/revert-to-sent', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: reason.trim() })
            });

            var data = await response.json();

            if (data.success) {
                showToast(data.message || 'Presupuesto revertido a Enviado', 'success');
                closeModal();
                await loadQuotes();
            } else {
                showToast('Error: ' + (data.error || 'No se pudo revertir'), 'error');
            }

        } catch (error) {
            console.error('[QUOTES] Error revirtiendo:', error);
            showToast('Error al revertir: ' + error.message, 'error');
        }
    }

    /**
     * Cambiar estado del presupuesto manualmente
     */
    async function changeStatus(id, newStatus) {
        var statusLabels = {
            'draft': 'Borrador',
            'sent': 'Enviado',
            'in_trial': 'En Trial',
            'accepted': 'Aceptado',
            'active': 'Activo',
            'rejected': 'Rechazado'
        };

        if (!confirm('¿Cambiar estado a "' + (statusLabels[newStatus] || newStatus) + '"?')) {
            return;
        }

        try {
            var token = window.getMultiKeyToken();
            var response = await fetch('/api/quotes/' + id + '/change-status', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ new_status: newStatus })
            });

            var data = await response.json();

            if (data.success) {
                showToast('Estado cambiado a ' + (statusLabels[newStatus] || newStatus), 'success');
                closeModal();
                await loadQuotes();
            } else {
                showToast('Error: ' + (data.error || 'No se pudo cambiar estado'), 'error');
            }

        } catch (error) {
            console.error('[QUOTES] Error cambiando estado:', error);
            showToast('Error: ' + error.message, 'error');
        }
    }

    /**
     * Ver historial de cambios de estado
     */
    async function viewStatusHistory(id) {
        try {
            var token = window.getMultiKeyToken();
            var response = await fetch('/api/quotes/' + id + '/status-history', {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            var data = await response.json();

            if (!data.success) {
                showToast('Error: ' + (data.error || 'No se pudo obtener historial'), 'error');
                return;
            }

            var history = data.status_history || [];

            // Build modal HTML
            var html = '<div class="quote-modal-overlay" onclick="QuotesManagement.closeHistoryModal(event)">';
            html += '<div class="quote-modal" onclick="event.stopPropagation()" style="max-width: 550px;">';
            html += '<div class="quote-modal-header">';
            html += '<h3>📜 Historial de Estados</h3>';
            html += '<button class="close-btn" onclick="QuotesManagement.closeHistoryModal()">&times;</button>';
            html += '</div>';
            html += '<div class="quote-modal-body">';

            if (history.length === 0) {
                html += '<p style="text-align: center; color: #888;">Sin cambios de estado registrados</p>';
            } else {
                html += '<div class="status-timeline">';
                for (var i = history.length - 1; i >= 0; i--) {
                    var entry = history[i];
                    var fromCfg = statusConfig[entry.from] || { label: entry.from, icon: '•', color: '#666' };
                    var toCfg = statusConfig[entry.to] || { label: entry.to, icon: '•', color: '#666' };
                    var dateStr = entry.changed_at ? formatDate(entry.changed_at) : '-';

                    html += '<div style="padding: 12px; border-left: 3px solid ' + toCfg.color + '; margin-bottom: 10px; background: #f8f9fa; border-radius: 0 8px 8px 0;">';
                    html += '<div style="font-weight: 600; color: #1a1a1a;">' + fromCfg.icon + ' ' + fromCfg.label + ' → ' + toCfg.icon + ' ' + toCfg.label + '</div>';
                    html += '<div style="font-size: 12px; color: #666; margin-top: 4px;">' + dateStr;
                    if (entry.changed_by) html += ' • Usuario ID: ' + entry.changed_by;
                    html += '</div>';
                    if (entry.reason) {
                        html += '<div style="font-size: 13px; color: #444; margin-top: 6px; font-style: italic;">"' + entry.reason + '"</div>';
                    }
                    html += '</div>';
                }
                html += '</div>';
            }

            html += '</div>';
            html += '<div class="quote-modal-footer">';
            html += '<button class="btn btn-secondary" onclick="QuotesManagement.closeHistoryModal()">Cerrar</button>';
            html += '</div>';
            html += '</div></div>';

            document.body.insertAdjacentHTML('beforeend', html);

        } catch (error) {
            console.error('[QUOTES] Error obteniendo historial:', error);
            showToast('Error al obtener historial: ' + error.message, 'error');
        }
    }

    /**
     * Cerrar modal de historial
     */
    function closeHistoryModal(event) {
        if (event && event.target.className !== 'quote-modal-overlay') return;
        var overlays = document.querySelectorAll('.quote-modal-overlay');
        if (overlays.length > 0) {
            overlays[overlays.length - 1].remove();
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
    // CIRCUITO: Quote → Factura → Pago → Alta Definitiva
    // =========================================================================

    /**
     * Renderiza los botones/status del circuito de facturación en la card
     * FLUJO: Generar Prefactura → Cargar Factura (CAE) → Enviar → Registrar Pago
     */
    function renderInvoiceCircuit(quote) {
        var btnStyle = 'font-size: 11px; padding: 6px 10px; display: inline-flex; align-items: center; gap: 4px;';

        var html = '<div class="invoice-circuit" style="margin-top: 12px; padding: 12px; background: linear-gradient(135deg, #e3f2fd 0%, #f0f7ff 100%); border-radius: 8px; border: 1px solid #90caf9;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">';
        html += '<span style="font-weight: 600; color: #1565c0; font-size: 13px;">💳 Facturación Inicial</span>';
        // Inline step indicator
        html += '<span id="circuit-steps-' + quote.id + '" style="font-size: 11px; color: #666;">Cargando...</span>';
        html += '</div>';
        // Auto-fetch status for inline indicator
        html += '<script>QuotesManagement.loadInlineSteps(' + quote.id + ')</script>';
        html += '<div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">';

        // Step 1: Generar Prefactura
        html += '<button class="btn btn-secondary" onclick="QuotesManagement.generatePreInvoice(' + quote.id + ')" style="' + btnStyle + '">';
        html += '📋 Prefactura</button>';

        // Step 2: Cargar Factura (upload real CAE invoice)
        html += '<button class="btn btn-primary" onclick="QuotesManagement.showUploadInvoiceModal(' + quote.id + ')" style="' + btnStyle + '">';
        html += '🧾 Cargar Factura</button>';

        // Step 3: Enviar factura
        html += '<button class="btn btn-warning" onclick="QuotesManagement.sendInvoiceEmail(' + quote.id + ')" style="' + btnStyle + '">';
        html += '📧 Enviar</button>';

        // Step 4: Registrar pago
        html += '<button class="btn btn-success" onclick="QuotesManagement.showPaymentModal(' + quote.id + ')" style="' + btnStyle + '">';
        html += '💰 Pago</button>';

        // Check status button
        html += '<button class="btn btn-outline" onclick="QuotesManagement.checkInvoiceStatus(' + quote.id + ')" style="' + btnStyle + '">';
        html += '🔍 Estado</button>';

        html += '</div>';
        html += '</div>';
        return html;
    }

    /**
     * Generar Prefactura desde quote
     * Crea una pre-factura en el módulo de billing
     */
    async function generatePreInvoice(quoteId) {
        var quote = quotes.find(function(q) { return q.id === quoteId; });
        if (!quote) {
            showToast('Presupuesto no encontrado', 'error');
            return;
        }

        if (!confirm('¿Generar prefactura inicial para ' + (quote.company_name || 'este cliente') + '?\n\nMonto: $' + parseFloat(quote.total_amount || 0).toLocaleString('es-AR'))) {
            return;
        }

        try {
            var token = window.getMultiKeyToken();
            var response = await fetch('/api/quotes/' + quoteId + '/generate-pre-invoice', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            var data = await response.json();

            if (data.success) {
                showToast('✅ Prefactura generada: ' + (data.pre_invoice_code || data.pre_invoice_number), 'success');
                await loadQuotes();
            } else {
                showToast('Error: ' + (data.error || 'No se pudo generar prefactura'), 'error');
            }
        } catch (error) {
            console.error('[QUOTES] Error generando prefactura:', error);
            showToast('Error: ' + error.message, 'error');
        }
    }

    /**
     * Mostrar modal para cargar factura (número CAE + PDF)
     * NOTA: La factura ya fue emitida en AFIP/sistema externo
     */
    function showUploadInvoiceModal(quoteId) {
        // Obtener datos del quote para prefill
        var quote = quotes.find(function(q) { return q.id === quoteId; });
        var prefillAmount = quote ? parseFloat(quote.total_amount || 0).toFixed(2) : '';

        var html = '<div class="quote-modal-overlay" onclick="QuotesManagement.closeUploadInvoiceModal(event)">';
        html += '<div class="quote-modal" onclick="event.stopPropagation()" style="max-width: 500px;">';
        html += '<div class="quote-modal-header" style="background: linear-gradient(135deg, #1565c0, #0d47a1);">';
        html += '<h3>🧾 Cargar Factura Emitida</h3>';
        html += '<button class="close-btn" onclick="QuotesManagement.closeUploadInvoiceModal()">&times;</button>';
        html += '</div>';
        html += '<div class="quote-modal-body">';

        html += '<div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px; margin-bottom: 16px;">';
        html += '<strong>💡 Nota:</strong> Cargue aquí la factura ya emitida en AFIP u otro sistema de facturación.';
        html += '</div>';

        html += '<form id="upload-invoice-form" onsubmit="QuotesManagement.submitUploadInvoice(event, ' + quoteId + ')">';

        // Número de factura
        html += '<div class="form-group" style="margin-bottom: 16px;">';
        html += '<label style="font-weight: 600; display: block; margin-bottom: 6px;">Número de Factura *</label>';
        html += '<input type="text" id="invoice-number" name="invoice_number" required placeholder="Ej: A-0001-00001234" ';
        html += 'style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">';
        html += '</div>';

        // Monto total
        html += '<div class="form-group" style="margin-bottom: 16px;">';
        html += '<label style="font-weight: 600; display: block; margin-bottom: 6px;">Monto Total *</label>';
        html += '<input type="number" id="invoice-amount" name="total_amount" required step="0.01" value="' + prefillAmount + '" ';
        html += 'style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">';
        html += '</div>';

        // Fecha de vencimiento
        html += '<div class="form-group" style="margin-bottom: 16px;">';
        html += '<label style="font-weight: 600; display: block; margin-bottom: 6px;">Fecha de Vencimiento *</label>';
        var defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 15);
        var dateStr = defaultDate.toISOString().split('T')[0];
        html += '<input type="date" id="invoice-due-date" name="due_date" required value="' + dateStr + '" ';
        html += 'style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">';
        html += '</div>';

        // Archivo PDF
        html += '<div class="form-group" style="margin-bottom: 16px;">';
        html += '<label style="font-weight: 600; display: block; margin-bottom: 6px;">Archivo PDF de Factura *</label>';
        html += '<input type="file" id="invoice-pdf" name="invoice_pdf" required accept=".pdf" ';
        html += 'style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; background: #f8f9fa;">';
        html += '</div>';

        // Notas opcionales
        html += '<div class="form-group" style="margin-bottom: 16px;">';
        html += '<label style="font-weight: 600; display: block; margin-bottom: 6px;">Notas (opcional)</label>';
        html += '<textarea id="invoice-notes" name="notes" rows="2" placeholder="Observaciones internas..." ';
        html += 'style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; resize: vertical;"></textarea>';
        html += '</div>';

        html += '</form>';

        html += '</div>';
        html += '<div class="quote-modal-footer">';
        html += '<button class="btn btn-secondary" onclick="QuotesManagement.closeUploadInvoiceModal()">Cancelar</button>';
        html += '<button class="btn btn-primary" onclick="document.getElementById(\'upload-invoice-form\').requestSubmit()">';
        html += '<span>📄</span> Cargar Factura</button>';
        html += '</div>';
        html += '</div></div>';

        document.body.insertAdjacentHTML('beforeend', html);
    }

    function closeUploadInvoiceModal(event) {
        if (event && event.target !== event.currentTarget) return;
        var overlay = document.querySelector('.quote-modal-overlay');
        if (overlay) overlay.remove();
    }

    /**
     * Enviar factura cargada al backend
     */
    async function submitUploadInvoice(event, quoteId) {
        event.preventDefault();

        var form = document.getElementById('upload-invoice-form');
        var formData = new FormData(form);
        formData.append('quote_id', quoteId);

        try {
            var token = window.getMultiKeyToken();
            var response = await fetch('/api/quotes/' + quoteId + '/upload-invoice', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            });

            var data = await response.json();

            if (data.success) {
                showToast('✅ Factura cargada: ' + data.invoice_number, 'success');
                closeUploadInvoiceModal();
                await loadQuotes();
            } else {
                showToast('Error: ' + (data.error || 'No se pudo cargar'), 'error');
            }
        } catch (error) {
            console.error('[QUOTES] Error cargando factura:', error);
            showToast('Error: ' + error.message, 'error');
        }
    }

    // Legacy function - kept for backwards compatibility
    async function uploadInvoicePDF(quoteId) {
        // Redirect to the new modal
        showUploadInvoiceModal(quoteId);
    }

    // Legacy function - kept for backwards compatibility
    async function generateInvoice(quoteId) {
        // Redirect to the new upload modal
        showUploadInvoiceModal(quoteId);
    }

    /**
     * Subir PDF adicional a factura existente (legacy)
     */
    async function uploadInvoicePDFLegacy(quoteId) {
        // First get the invoice
        try {
            var token = window.getMultiKeyToken();
            var resp = await fetch('/api/quotes/' + quoteId + '/invoice', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            var data = await resp.json();

            if (!data.success || !data.invoice) {
                showToast('Primero debe cargar la factura', 'error');
                return;
            }

            var invoiceId = data.invoice.id;

            // Create file input
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf';
            input.onchange = async function() {
                if (!input.files[0]) return;

                var formData = new FormData();
                formData.append('invoice_pdf', input.files[0]);

                try {
                    var uploadResp = await fetch('/api/invoicing/invoices/' + invoiceId + '/upload-pdf', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + token },
                        body: formData
                    });

                    var uploadData = await uploadResp.json();

                    if (uploadData.success) {
                        showToast('PDF subido correctamente', 'success');
                    } else {
                        showToast('Error: ' + (uploadData.error || 'No se pudo subir'), 'error');
                    }
                } catch (err) {
                    showToast('Error subiendo PDF: ' + err.message, 'error');
                }
            };
            input.click();

        } catch (error) {
            console.error('[QUOTES] Error:', error);
            showToast('Error: ' + error.message, 'error');
        }
    }

    /**
     * Enviar factura por email
     */
    async function sendInvoiceEmail(quoteId) {
        try {
            var token = window.getMultiKeyToken();
            var resp = await fetch('/api/quotes/' + quoteId + '/invoice', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            var data = await resp.json();

            if (!data.success || !data.invoice) {
                showToast('Primero debe generar la factura', 'error');
                return;
            }

            var invoiceId = data.invoice.id;

            if (!confirm('¿Enviar factura por email al cliente?')) return;

            var sendResp = await fetch('/api/invoicing/invoices/' + invoiceId + '/send-email', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            var sendData = await sendResp.json();

            if (sendData.success) {
                showToast(sendData.message || 'Factura enviada', 'success');
            } else {
                showToast('Error: ' + (sendData.error || 'No se pudo enviar'), 'error');
            }
        } catch (error) {
            console.error('[QUOTES] Error enviando factura:', error);
            showToast('Error: ' + error.message, 'error');
        }
    }

    /**
     * Mostrar modal de registro de pago
     */
    async function showPaymentModal(quoteId) {
        // Pre-fetch invoice to get amount
        var prefillAmount = '';
        try {
            var token = window.getMultiKeyToken();
            var resp = await fetch('/api/quotes/' + quoteId + '/invoice', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            var data = await resp.json();
            if (data.invoice && data.invoice.total_amount) {
                prefillAmount = parseFloat(data.invoice.total_amount).toFixed(2);
            }
        } catch (e) { /* ignore, user can type manually */ }

        var html = '<div class="quote-modal-overlay" onclick="QuotesManagement.closePaymentModal(event)">';
        html += '<div class="quote-modal" onclick="event.stopPropagation()" style="max-width: 500px;">';
        html += '<div class="quote-modal-header">';
        html += '<h3>💰 Registrar Pago</h3>';
        html += '<button class="close-btn" onclick="QuotesManagement.closePaymentModal()">&times;</button>';
        html += '</div>';
        html += '<div class="quote-modal-body">';

        html += '<div style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">Monto (USD)</label>';
        html += '<input type="number" id="payment-amount" class="form-control" step="0.01" placeholder="Monto del pago" value="' + prefillAmount + '">';
        html += '</div>';

        html += '<div style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">Método de Pago</label>';
        html += '<select id="payment-method" class="form-control">';
        html += '<option value="transfer">Transferencia Bancaria</option>';
        html += '<option value="cash">Efectivo</option>';
        html += '<option value="check">Cheque</option>';
        html += '<option value="credit_card">Tarjeta de Crédito</option>';
        html += '<option value="debit_card">Tarjeta de Débito</option>';
        html += '</select>';
        html += '</div>';

        html += '<div style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">Referencia / N° Operación</label>';
        html += '<input type="text" id="payment-reference" class="form-control" placeholder="N° de transferencia, cheque, etc.">';
        html += '</div>';

        html += '<div style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">Fecha de Pago</label>';
        html += '<input type="date" id="payment-date" class="form-control" value="' + new Date().toISOString().split('T')[0] + '">';
        html += '</div>';

        html += '<div style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">Comprobante (opcional)</label>';
        html += '<input type="file" id="payment-receipt" class="form-control" accept=".jpg,.jpeg,.png,.pdf">';
        html += '</div>';

        html += '<div style="margin-bottom: 15px;">';
        html += '<label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">Notas</label>';
        html += '<textarea id="payment-notes" class="form-control" rows="2" placeholder="Notas adicionales..."></textarea>';
        html += '</div>';

        html += '</div>';
        html += '<div class="quote-modal-footer">';
        html += '<button class="btn btn-success" onclick="QuotesManagement.submitPayment(' + quoteId + ')">💰 Confirmar Pago</button>';
        html += '<button class="btn btn-secondary" onclick="QuotesManagement.closePaymentModal()">Cancelar</button>';
        html += '</div>';
        html += '</div></div>';

        document.body.insertAdjacentHTML('beforeend', html);
    }

    /**
     * Enviar pago
     */
    async function submitPayment(quoteId) {
        var amount = document.getElementById('payment-amount')?.value;
        var method = document.getElementById('payment-method')?.value;
        var reference = document.getElementById('payment-reference')?.value;
        var date = document.getElementById('payment-date')?.value;
        var notes = document.getElementById('payment-notes')?.value;
        var receiptFile = document.getElementById('payment-receipt')?.files?.[0];

        if (!amount || parseFloat(amount) <= 0) {
            showToast('Ingrese un monto válido', 'error');
            return;
        }

        try {
            var token = window.getMultiKeyToken();

            var formData = new FormData();
            formData.append('amount', amount);
            formData.append('payment_method', method || 'transfer');
            formData.append('payment_reference', reference || '');
            formData.append('payment_date', date || new Date().toISOString().split('T')[0]);
            formData.append('notes', notes || '');
            if (receiptFile) {
                formData.append('receipt', receiptFile);
            }

            var response = await fetch('/api/quotes/' + quoteId + '/confirm-payment', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            });

            var data = await response.json();

            if (data.success) {
                showToast(data.already_paid ? 'Factura ya estaba pagada' : 'Pago registrado correctamente', 'success');
                closePaymentModal();
                await loadQuotes();
            } else {
                showToast('Error: ' + (data.error || 'No se pudo registrar el pago'), 'error');
            }
        } catch (error) {
            console.error('[QUOTES] Error registrando pago:', error);
            showToast('Error: ' + error.message, 'error');
        }
    }

    function closePaymentModal(event) {
        if (event && event.target.className !== 'quote-modal-overlay') return;
        var overlays = document.querySelectorAll('.quote-modal-overlay');
        if (overlays.length > 0) {
            overlays[overlays.length - 1].remove();
        }
    }

    /**
     * Check invoice status for a quote
     */
    async function checkInvoiceStatus(quoteId) {
        try {
            var token = window.getMultiKeyToken();
            var resp = await fetch('/api/quotes/' + quoteId + '/invoice', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            var data = await resp.json();

            var inv = data.invoice;

            var html = '<div class="quote-modal-overlay" onclick="QuotesManagement.closePaymentModal(event)">';
            html += '<div class="quote-modal" onclick="event.stopPropagation()" style="max-width: 450px;">';
            html += '<div class="quote-modal-header">';
            html += '<h3>🔍 Estado del Circuito</h3>';
            html += '<button class="close-btn" onclick="QuotesManagement.closePaymentModal()">&times;</button>';
            html += '</div>';
            html += '<div class="quote-modal-body">';

            // Try to get full billing status
            var preInv = null;
            try {
                var billingResp = await fetch('/api/quotes/' + quoteId + '/billing-status', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                var billingData = await billingResp.json();
                preInv = billingData.pre_invoice;
                if (billingData.invoice) inv = billingData.invoice;
            } catch (e) { /* fallback to inv from original call */ }

            var hasPreInvoice = !!preInv;
            var hasInvoice = inv && !!inv.invoice_number;
            var wasSent = inv && !!inv.sent_at;
            var isPaid = inv && inv.status === 'paid';

            // Mostrar datos si existen
            if (preInv) {
                html += '<div style="margin-bottom: 8px; padding: 8px; background: #e8f5e9; border-radius: 6px;">';
                html += '<strong>Prefactura:</strong> ' + (preInv.pre_invoice_code || preInv.id);
                html += '</div>';
            }
            if (inv && inv.invoice_number) {
                html += '<div style="margin-bottom: 8px; padding: 8px; background: #e3f2fd; border-radius: 6px;">';
                html += '<strong>Factura:</strong> ' + inv.invoice_number;
                if (inv.total_amount) {
                    html += ' | <strong>Monto:</strong> $' + parseFloat(inv.total_amount).toLocaleString('es-AR');
                }
                html += '</div>';
            }

            // Steps
            html += renderStep('1. Prefactura Generada', hasPreInvoice);
            html += renderStep('2. Factura Cargada', hasInvoice);
            html += renderStep('3. Enviada por Email', wasSent);
            html += renderStep('4. Pago Registrado', isPaid);

            if (!hasPreInvoice && !hasInvoice) {
                html += '<div style="margin-top: 12px; padding: 10px; background: #fff3cd; border-radius: 6px; font-size: 12px; color: #856404;">';
                html += '💡 Haga clic en <strong>Prefactura</strong> para iniciar el circuito de facturación.';
                html += '</div>';
            }

            if (isPaid) {
                html += '<div style="margin-top: 15px; padding: 12px; background: #d4edda; border-radius: 8px; color: #155724; font-weight: 600; text-align: center;">';
                html += '✅ Circuito Completo - Empresa Activa';
                html += '</div>';
            }

            html += '</div>';
            html += '<div class="quote-modal-footer">';
            html += '<button class="btn btn-secondary" onclick="QuotesManagement.closePaymentModal()">Cerrar</button>';
            html += '</div>';
            html += '</div></div>';

            document.body.insertAdjacentHTML('beforeend', html);

        } catch (error) {
            console.error('[QUOTES] Error:', error);
            showToast('Error: ' + error.message, 'error');
        }
    }

    async function loadInlineSteps(quoteId) {
        try {
            var token = window.getMultiKeyToken();

            // Fetch invoice and pre-invoice status
            var resp = await fetch('/api/quotes/' + quoteId + '/billing-status', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            var data = await resp.json();
            var el = document.getElementById('circuit-steps-' + quoteId);
            if (!el) return;

            var preInv = data.pre_invoice;
            var inv = data.invoice;

            // Calculate steps: 1=Prefactura, 2=Factura, 3=Enviada, 4=Pagada
            var steps = 0;
            if (preInv) steps = 1;
            if (inv && inv.invoice_number) steps = 2;
            if (inv && inv.sent_at) steps = 3;
            if (inv && inv.status === 'paid') steps = 4;

            var dots = '';
            for (var i = 1; i <= 4; i++) {
                dots += '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 2px;background:' + (i <= steps ? '#28a745' : '#ccc') + ';"></span>';
            }
            el.innerHTML = dots + ' <span style="color:' + (steps === 4 ? '#28a745' : '#1565c0') + ';font-weight:600;">' + steps + '/4</span>';

            // Actualizar botones según estado
            var container = el.closest('.invoice-circuit');
            if (container) {
                var btnStyle = 'font-size: 11px; padding: 6px 10px; display: inline-flex; align-items: center; gap: 4px;';
                var buttons = container.querySelectorAll('button');
                buttons.forEach(function(btn) {
                    var text = btn.textContent || '';

                    // Prefactura generada
                    if (text.includes('Prefactura') && preInv) {
                        btn.innerHTML = '✅ ' + (preInv.pre_invoice_code || 'Prefactura');
                        btn.className = 'btn btn-outline';
                        btn.style.cssText = btnStyle;
                        btn.disabled = true;
                    }

                    // Cargar factura ya cargada
                    if (text.includes('Cargar Factura') && inv && inv.invoice_number) {
                        btn.innerHTML = '✅ ' + inv.invoice_number;
                        btn.className = 'btn btn-outline';
                        btn.style.cssText = btnStyle;
                        btn.disabled = true;
                    }

                    // Enviar/Reenviar factura
                    if (text.includes('Enviar') && inv && inv.sent_at) {
                        btn.innerHTML = '🔄 Reenviar';
                        btn.className = 'btn btn-outline';
                        btn.style.cssText = btnStyle;
                    }

                    // Pago registrado
                    if (text.includes('Pago') && inv && inv.status === 'paid') {
                        btn.innerHTML = '✅ Pagada';
                        btn.className = 'btn btn-outline';
                        btn.style.cssText = btnStyle;
                        btn.disabled = true;
                    }
                });
            }
        } catch (e) {
            // Fallback: try old endpoint
            try {
                var token2 = window.getMultiKeyToken();
                var resp2 = await fetch('/api/quotes/' + quoteId + '/invoice', {
                    headers: { 'Authorization': 'Bearer ' + token2 }
                });
                var data2 = await resp2.json();
                var el2 = document.getElementById('circuit-steps-' + quoteId);
                if (!el2) return;

                if (!data2.invoice) {
                    el2.innerHTML = '<span style="color:#888;">0/4</span>';
                    return;
                }
                var inv2 = data2.invoice;
                var steps2 = 1; // assume prefactura done if invoice exists
                if (inv2.invoice_number) steps2 = 2;
                if (inv2.sent_at) steps2 = 3;
                if (inv2.status === 'paid') steps2 = 4;

                var dots2 = '';
                for (var j = 1; j <= 4; j++) {
                    dots2 += '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 2px;background:' + (j <= steps2 ? '#28a745' : '#ccc') + ';"></span>';
                }
                el2.innerHTML = dots2 + ' <span style="color:' + (steps2 === 4 ? '#28a745' : '#1565c0') + ';font-weight:600;">' + steps2 + '/4</span>';
            } catch (e2) {
                var el3 = document.getElementById('circuit-steps-' + quoteId);
                if (el3) el3.innerHTML = '<span style="color:#888;">0/4</span>';
            }
        }
    }

    function renderStep(label, done) {
        var icon = done ? '✅' : '⬜';
        var color = done ? '#155724' : '#666';
        return '<div style="padding: 8px 12px; margin: 4px 0; background: ' + (done ? '#d4edda' : '#f8f9fa') + '; border-radius: 6px; color: ' + color + ';">' + icon + ' ' + label + '</div>';
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

    /**
     * Obtener rol del staff actual
     */
    function getStaffRole() {
        try {
            // Opción 1: Decodificar JWT directamente (más confiable)
            var token = window.getMultiKeyToken();
            if (token) {
                var payload = JSON.parse(atob(token.split('.')[1]));
                console.log('[QUOTES] Rol desde JWT:', payload.role);
                return payload.role || '';
            }
            // Opción 2: AdminPanelController
            if (window.AdminPanelController && AdminPanelController._currentStaff) {
                var staff = AdminPanelController._currentStaff;
                var role = staff.role_code || (staff.role && staff.role.role_code) || '';
                console.log('[QUOTES] Rol desde AdminPanelController:', role);
                return role;
            }
        } catch (e) {
            console.warn('[QUOTES] No se pudo obtener rol del staff:', e);
        }
        return '';
    }

    // =========================================================================
    // ALTA MANUAL DE EMPRESA
    // =========================================================================

    /**
     * Mostrar modal de alta manual
     */
    function showManualOnboardingModal(quoteId, companyId) {
        // Obtener datos del presupuesto actual
        var quote = quotes.find(function(q) { return q.id === quoteId; }) || currentQuote || {};
        var quoteNotes = quote.notes || '';
        var companyName = quote.company_name || 'ID: ' + companyId;
        var quoteNumber = quote.quote_number || 'PRES-' + quoteId;

        var html = '<div class="quote-modal-overlay" onclick="QuotesManagement.closeManualOnboardingModal(event)" style="z-index:2000;">';
        html += '<div class="quote-modal" onclick="event.stopPropagation()" style="max-width: 550px;">';
        html += '<div class="quote-modal-header" style="background: linear-gradient(135deg, #059669, #047857);">';
        html += '<h3 style="color:white;">🏢 Alta Manual de Empresa</h3>';
        html += '<button class="close-btn" onclick="QuotesManagement.closeManualOnboardingModal()" style="color:rgba(255,255,255,0.8);">&times;</button>';
        html += '</div>';
        html += '<div class="quote-modal-body">';

        // Info del presupuesto
        html += '<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;margin-bottom:15px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span style="color:#94a3b8;font-size:12px;">Presupuesto:</span>';
        html += '<span style="color:#f1f5f9;font-weight:600;">' + quoteNumber + '</span>';
        html += '</div>';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">';
        html += '<span style="color:#94a3b8;font-size:12px;">Empresa:</span>';
        html += '<span style="color:#f1f5f9;font-weight:600;">' + companyName + '</span>';
        html += '</div>';
        html += '</div>';

        // Explicación de qué es Alta Manual
        html += '<div style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:14px;margin-bottom:15px;">';
        html += '<strong style="color:#10b981;font-size:13px;">¿Qué es el Alta Manual?</strong>';
        html += '<p style="font-size:13px;color:#a7f3d0;margin:8px 0 0;">Permite activar una empresa <strong>sin esperar</strong> a que complete el flujo normal: aceptar contrato → pagar factura → activación automática.</p>';
        html += '</div>';

        // Cuándo usar (colapsable)
        html += '<details style="background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);border-radius:8px;padding:14px;margin-bottom:15px;">';
        html += '<summary style="color:#60a5fa;font-size:13px;font-weight:600;cursor:pointer;">📋 ¿Cuándo usarlo? (click para ver ejemplos)</summary>';
        html += '<ul style="font-size:12px;color:#93c5fd;margin:8px 0 0;padding-left:20px;">';
        html += '<li>Cliente solicitó activación urgente por teléfono</li>';
        html += '<li>Pago confirmado por otro medio (transferencia, efectivo)</li>';
        html += '<li>Autorización especial de gerencia</li>';
        html += '<li>Período de prueba extendido acordado</li>';
        html += '</ul>';
        html += '</details>';

        // Notas existentes del presupuesto (si hay)
        if (quoteNotes && quoteNotes.trim().length > 0) {
            html += '<div style="background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.3);border-radius:8px;padding:12px;margin-bottom:15px;">';
            html += '<strong style="color:#a78bfa;font-size:12px;">📝 Notas del presupuesto:</strong>';
            html += '<p style="font-size:13px;color:#c4b5fd;margin:6px 0 0;font-style:italic;">"' + quoteNotes + '"</p>';
            html += '<button type="button" onclick="document.getElementById(\'manual-onboarding-reason\').value = \'Alta manual - \' + this.parentElement.querySelector(\'p\').textContent.replace(/^\"|\"$/g, \'\'); this.style.display=\'none\';" ';
            html += 'style="margin-top:8px;font-size:11px;padding:4px 8px;background:rgba(139,92,246,0.3);border:1px solid rgba(139,92,246,0.4);border-radius:4px;color:#c4b5fd;cursor:pointer;">📋 Usar como motivo</button>';
            html += '</div>';
        }

        // Advertencia
        html += '<div style="background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.3);border-radius:8px;padding:12px;margin-bottom:15px;">';
        html += '<strong style="color:#fbbf24;font-size:12px;">⚠️ Esta acción quedará registrada con tu usuario, fecha/hora y el motivo.</strong>';
        html += '</div>';

        // Campo de motivo
        var defaultReason = quoteNotes && quoteNotes.length > 10 ? 'Alta manual - ' + quoteNotes : '';
        html += '<div style="margin-bottom:15px;">';
        html += '<label style="display:block;font-weight:600;margin-bottom:8px;color:#e2e8f0;font-size:13px;">Motivo del alta manual *</label>';
        html += '<textarea id="manual-onboarding-reason" rows="3" style="width:100%;padding:12px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;font-size:14px;background:rgba(255,255,255,0.05);color:#e2e8f0;box-sizing:border-box;resize:none;" ';
        html += 'placeholder="Ej: Cliente solicitó activación urgente por teléfono.">' + defaultReason + '</textarea>';
        html += '<small style="color:#64748b;font-size:11px;">Mínimo 10 caracteres.</small>';
        html += '</div>';

        html += '</div>';
        html += '<div class="quote-modal-footer" style="justify-content:space-between;">';
        html += '<button class="btn btn-secondary" onclick="QuotesManagement.closeManualOnboardingModal()">Cancelar</button>';
        html += '<button class="btn btn-success" onclick="QuotesManagement.performManualOnboarding(' + quoteId + ', ' + companyId + ')">';
        html += '✅ Confirmar Alta</button>';
        html += '</div>';
        html += '</div></div>';

        document.body.insertAdjacentHTML('beforeend', html);
    }

    /**
     * Cerrar modal de alta manual
     */
    function closeManualOnboardingModal(event) {
        if (event && event.target.className.indexOf('quote-modal-overlay') === -1) return;
        var overlays = document.querySelectorAll('.quote-modal-overlay[style*="z-index:2000"], .quote-modal-overlay[style*="z-index: 2000"]');
        overlays.forEach(function(o) { o.remove(); });
    }

    /**
     * Ejecutar alta manual
     */
    async function performManualOnboarding(quoteId, companyId) {
        var reason = document.getElementById('manual-onboarding-reason');
        if (!reason || reason.value.trim().length < 10) {
            showToast('Debe indicar un motivo de al menos 10 caracteres', 'error');
            return;
        }

        try {
            var token = window.getMultiKeyToken();
            var resp = await fetch('/api/v1/companies/' + companyId + '/manual-onboarding', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'alta',
                    reason: reason.value.trim()
                })
            });

            var data = await resp.json();
            if (!resp.ok || !data.success) {
                throw new Error(data.error || 'Error al dar de alta la empresa');
            }

            closeManualOnboardingModal();
            closeModal();

            var msgHtml = '<div style="text-align:center;padding:20px;">';
            msgHtml += '<div style="font-size:48px;margin-bottom:15px;">🎉</div>';
            msgHtml += '<h3 style="color:#059669;margin-bottom:10px;">Empresa Activada</h3>';
            msgHtml += '<p>' + data.message + '</p>';
            if (data.admin_created && data.credentials) {
                msgHtml += '<div style="background:#f0f9ff;border:1px solid #0284c7;border-radius:8px;padding:15px;margin-top:15px;text-align:left;">';
                msgHtml += '<strong style="color:#0369a1;">Credenciales del Administrador:</strong>';
                msgHtml += '<p style="margin:10px 0 5px;"><strong>Usuario:</strong> <code style="background:#e0f2fe;padding:2px 6px;border-radius:4px;">' + data.credentials.username + '</code></p>';
                msgHtml += '<p style="margin:0;"><strong>Contraseña:</strong> <code style="background:#e0f2fe;padding:2px 6px;border-radius:4px;">' + data.credentials.password + '</code></p>';
                msgHtml += '<p style="margin:10px 0 0;font-size:12px;color:#f59e0b;">⚠️ El usuario deberá cambiar la contraseña en el primer login.</p>';
                msgHtml += '</div>';
            }
            msgHtml += '</div>';

            var successHtml = '<div class="quote-modal-overlay" onclick="this.remove()">';
            successHtml += '<div class="quote-modal" onclick="event.stopPropagation()" style="max-width:450px;">';
            successHtml += '<div class="quote-modal-header" style="background:#059669;color:white;">';
            successHtml += '<h3>Alta Completada</h3>';
            successHtml += '<button class="close-btn" onclick="this.closest(\'.quote-modal-overlay\').remove()" style="color:white;">&times;</button>';
            successHtml += '</div>';
            successHtml += '<div class="quote-modal-body">' + msgHtml + '</div>';
            successHtml += '<div class="quote-modal-footer">';
            successHtml += '<button class="btn btn-success" onclick="this.closest(\'.quote-modal-overlay\').remove()">Entendido</button>';
            successHtml += '</div></div></div>';

            document.body.insertAdjacentHTML('beforeend', successHtml);

            // Recargar datos
            await loadQuotes();

        } catch (error) {
            console.error('[QUOTES] Error en alta manual:', error);
            showToast('Error: ' + error.message, 'error');
        }
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
        revertToSent: revertToSent,
        viewStatusHistory: viewStatusHistory,
        closeHistoryModal: closeHistoryModal,
        applyFilters: applyFilters,
        filterByStatus: filterByStatus,
        switchTab: switchTab,
        generateContract: generateContract,
        sendContract: sendContract,
        markContractSigned: markContractSigned,
        confirmContractSign: confirmContractSign,
        showContractPreview: showContractPreview,
        closeContractPreview: closeContractPreview,
        downloadContractPDF: downloadContractPDF,
        closeModal: closeModal,
        // Invoice circuit
        generateInvoice: generateInvoice,
        uploadInvoicePDF: uploadInvoicePDF,
        sendInvoiceEmail: sendInvoiceEmail,
        showPaymentModal: showPaymentModal,
        submitPayment: submitPayment,
        closePaymentModal: closePaymentModal,
        checkInvoiceStatus: checkInvoiceStatus,
        loadInlineSteps: loadInlineSteps,
        // New invoice upload flow
        showUploadInvoiceModal: showUploadInvoiceModal,
        closeUploadInvoiceModal: closeUploadInvoiceModal,
        submitUploadInvoice: submitUploadInvoice,
        generatePreInvoice: generatePreInvoice,
        changeStatus: changeStatus,
        // Pipeline view
        switchView: switchView,
        confirmPayment: confirmPayment,
        // Alta manual
        showManualOnboardingModal: showManualOnboardingModal,
        closeManualOnboardingModal: closeManualOnboardingModal,
        performManualOnboarding: performManualOnboarding
    };

})();
