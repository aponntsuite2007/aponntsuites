/**
 * MIS PROCEDIMIENTOS - Vista del Empleado
 * Integración con Mi Espacio
 *
 * Muestra los procedimientos e instructivos asignados al rol del empleado
 * Permite dar acuse de recibo
 *
 * @version 1.0.0
 * @date 2025-12-07
 */

window.MyProcedures = (function() {
    'use strict';

    const CONFIG = {
        API_BASE: '/api/procedures',
        TYPES: {
            procedimiento: { label: 'Procedimiento', icon: 'bi-file-earmark-text', color: 'primary' },
            instructivo: { label: 'Instructivo', icon: 'bi-list-check', color: 'success' },
            manual: { label: 'Manual', icon: 'bi-book', color: 'info' },
            politica: { label: 'Política', icon: 'bi-shield-check', color: 'warning' }
        }
    };

    let state = {
        procedures: [],
        pending: [],
        summary: null
    };

    // =========================================================================
    // API
    // =========================================================================

    const API = {
        async request(endpoint) {
            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.json();
        },

        getMyProcedures: () => API.request('/employee/my-procedures'),
        getMyPending: () => API.request('/employee/my-pending'),
        getMySummary: () => API.request('/employee/my-summary'),

        async acknowledge(procedureId) {
            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.API_BASE}/${procedureId}/acknowledge`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ method: 'web' })
            });
            return response.json();
        }
    };

    // =========================================================================
    // HELPERS
    // =========================================================================

    function formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    function getTypeBadge(type) {
        const t = CONFIG.TYPES[type] || CONFIG.TYPES.instructivo;
        return `<span class="badge bg-${t.color}"><i class="bi ${t.icon} me-1"></i>${t.label}</span>`;
    }

    function showToast(message, type = 'success') {
        if (window.Toastify) {
            Toastify({
                text: message,
                duration: 3000,
                gravity: 'top',
                position: 'right',
                backgroundColor: type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ffc107'
            }).showToast();
        } else {
            alert(message);
        }
    }

    // =========================================================================
    // RENDER
    // =========================================================================

    async function render(containerId = 'module-content') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="my-procedures-module p-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h4 class="mb-1"><i class="bi bi-book me-2"></i>Mis Procedimientos</h4>
                        <small class="text-muted">Instructivos y procedimientos asignados a tu rol</small>
                    </div>
                </div>

                <!-- Stats -->
                <div id="my-procedures-stats" class="row g-3 mb-4"></div>

                <!-- Pendientes de Acuse -->
                <div id="my-procedures-pending" class="mb-4"></div>

                <!-- Lista de Procedimientos -->
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-folder me-2"></i>Todos mis procedimientos</h5>
                    </div>
                    <div class="card-body p-0">
                        <div id="my-procedures-list" class="list-group list-group-flush">
                            <div class="text-center py-4">
                                <div class="spinner-border text-primary" role="status"></div>
                                <p class="mt-2 text-muted">Cargando...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal Ver Procedimiento -->
                ${renderViewModal()}
            </div>
        `;

        await loadData();
    }

    function renderViewModal() {
        return `
            <div class="modal fade" id="viewMyProcedureModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="viewMyProcedureTitle">
                                <i class="bi bi-file-earmark-text me-2"></i>Procedimiento
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="viewMyProcedureContent"></div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-success" id="btnAcknowledge" style="display:none;">
                                <i class="bi bi-check-lg me-1"></i>Confirmar Lectura
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function loadData() {
        try {
            const [summaryRes, proceduresRes, pendingRes] = await Promise.all([
                API.getMySummary(),
                API.getMyProcedures(),
                API.getMyPending()
            ]);

            if (summaryRes.success) state.summary = summaryRes;
            if (proceduresRes.success) state.procedures = proceduresRes.procedures || [];
            if (pendingRes.success) state.pending = pendingRes.procedures || [];

            renderStats();
            renderPending();
            renderList();
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Error al cargar procedimientos', 'error');
        }
    }

    function renderStats() {
        const container = document.getElementById('my-procedures-stats');
        if (!container) return;

        const summary = state.summary || {};
        const stats = summary.stats || { total: 0, pending: 0, acknowledged: 0 };

        container.innerHTML = `
            <div class="col-md-4">
                <div class="card bg-primary text-white h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h2 class="mb-0">${stats.total || 0}</h2>
                                <small>Total Asignados</small>
                            </div>
                            <i class="bi bi-files fs-1 opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card bg-warning text-dark h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h2 class="mb-0">${stats.pending || 0}</h2>
                                <small>Pendientes de Lectura</small>
                            </div>
                            <i class="bi bi-hourglass-split fs-1 opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card bg-success text-white h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h2 class="mb-0">${stats.acknowledged || 0}</h2>
                                <small>Leídos</small>
                            </div>
                            <i class="bi bi-check2-all fs-1 opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderPending() {
        const container = document.getElementById('my-procedures-pending');
        if (!container) return;

        if (state.pending.length === 0) {
            container.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle me-2"></i>
                    <strong>Todo al día</strong> - No tienes procedimientos pendientes de lectura.
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="alert alert-warning mb-3">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Atención:</strong> Tienes ${state.pending.length} procedimiento(s) pendiente(s) de lectura.
            </div>
            <div class="row g-3">
                ${state.pending.map(proc => `
                    <div class="col-md-6 col-lg-4">
                        <div class="card border-warning h-100">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <span class="badge bg-warning text-dark">PENDIENTE</span>
                                    ${getTypeBadge(proc.type)}
                                </div>
                                <h6 class="card-title">${proc.code}</h6>
                                <p class="card-text small">${proc.title}</p>
                                <p class="card-text"><small class="text-muted">Versión ${proc.version_label}</small></p>
                            </div>
                            <div class="card-footer">
                                <button class="btn btn-warning btn-sm w-100" onclick="MyProcedures.viewProcedure('${proc.id}', true)">
                                    <i class="bi bi-eye me-1"></i>Leer y Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderList() {
        const container = document.getElementById('my-procedures-list');
        if (!container) return;

        if (state.procedures.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-folder-x fs-1 text-muted d-block mb-3"></i>
                    <p class="text-muted">No tienes procedimientos asignados</p>
                </div>
            `;
            return;
        }

        container.innerHTML = state.procedures.map(proc => `
            <a href="#" class="list-group-item list-group-item-action" onclick="MyProcedures.viewProcedure('${proc.id}', false); return false;">
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <strong class="text-primary">${proc.code}</strong>
                            ${getTypeBadge(proc.type)}
                            <span class="badge bg-light text-dark">${proc.version_label}</span>
                            ${proc.is_critical ? '<span class="badge bg-danger">Crítico</span>' : ''}
                        </div>
                        <h6 class="mb-1">${proc.title}</h6>
                        <small class="text-muted">
                            ${proc.scope_type === 'must_execute' ? '<i class="bi bi-play-circle me-1"></i>Debes ejecutar' :
                              proc.scope_type === 'must_supervise' ? '<i class="bi bi-person-check me-1"></i>Debes supervisar' :
                              '<i class="bi bi-eye me-1"></i>Debes conocer'}
                        </small>
                    </div>
                    <div class="text-end">
                        ${proc.acknowledged_at
                            ? `<span class="badge bg-success"><i class="bi bi-check me-1"></i>Leído</span>
                               <br><small class="text-muted">${formatDate(proc.acknowledged_at)}</small>`
                            : '<span class="badge bg-warning text-dark">Pendiente</span>'
                        }
                    </div>
                </div>
            </a>
        `).join('');
    }

    // =========================================================================
    // VIEW & ACKNOWLEDGE
    // =========================================================================

    let currentProcedureId = null;
    let isPending = false;

    async function viewProcedure(id, needsAck = false) {
        currentProcedureId = id;
        isPending = needsAck;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.API_BASE}/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                renderProcedureView(data.procedure, needsAck);
                const modal = new bootstrap.Modal(document.getElementById('viewMyProcedureModal'));
                modal.show();
            }
        } catch (error) {
            showToast('Error al cargar el procedimiento', 'error');
        }
    }

    function renderProcedureView(proc, needsAck) {
        document.getElementById('viewMyProcedureTitle').innerHTML =
            `<i class="bi bi-file-earmark-text me-2"></i>${proc.code} - ${proc.title}`;

        const content = document.getElementById('viewMyProcedureContent');
        content.innerHTML = `
            <div class="mb-4">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Tipo:</strong> ${getTypeBadge(proc.type)}</p>
                        <p><strong>Versión:</strong> ${proc.version_label}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Fecha de Vigencia:</strong> ${formatDate(proc.effective_date)}</p>
                        <p><strong>Publicado:</strong> ${formatDate(proc.published_at)}</p>
                    </div>
                </div>
            </div>

            <div class="accordion" id="procedureContent">
                ${proc.objective ? renderSection('objective', 'Objetivo', proc.objective, true) : ''}
                ${proc.scope ? renderSection('scope', 'Alcance', proc.scope) : ''}
                ${proc.definitions ? renderSection('definitions', 'Definiciones', proc.definitions) : ''}
                ${proc.responsibilities ? renderSection('responsibilities', 'Responsabilidades', proc.responsibilities) : ''}
                ${proc.procedure_content ? renderSection('content', 'Descripción del Procedimiento', proc.procedure_content, true) : ''}
                ${proc.references ? renderSection('references', 'Referencias', proc.references) : ''}
                ${proc.annexes ? renderSection('annexes', 'Anexos', proc.annexes) : ''}
            </div>
        `;

        // Show/hide acknowledge button
        const ackBtn = document.getElementById('btnAcknowledge');
        if (needsAck) {
            ackBtn.style.display = 'inline-block';
            ackBtn.onclick = () => acknowledgeReading(proc.id);
        } else {
            ackBtn.style.display = 'none';
        }
    }

    function renderSection(id, title, content, expanded = false) {
        return `
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button ${expanded ? '' : 'collapsed'}" type="button"
                        data-bs-toggle="collapse" data-bs-target="#section-${id}">
                        ${title}
                    </button>
                </h2>
                <div id="section-${id}" class="accordion-collapse collapse ${expanded ? 'show' : ''}"
                    data-bs-parent="#procedureContent">
                    <div class="accordion-body">
                        ${content.replace(/\n/g, '<br>')}
                    </div>
                </div>
            </div>
        `;
    }

    async function acknowledgeReading(id) {
        if (!confirm('¿Confirmas que has leído y comprendido este procedimiento?')) return;

        try {
            const result = await API.acknowledge(id);
            if (result.success) {
                showToast('Lectura confirmada correctamente');
                bootstrap.Modal.getInstance(document.getElementById('viewMyProcedureModal')).hide();
                await loadData(); // Reload data
            } else {
                showToast(result.message || 'Error al confirmar lectura', 'error');
            }
        } catch (error) {
            showToast('Error al confirmar lectura', 'error');
        }
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    return {
        render,
        viewProcedure,
        acknowledgeReading
    };

})();

// ============================================================================
// FUNCIÓN DE INICIALIZACIÓN PARA SISTEMA DINÁMICO
// ============================================================================

function showMyProceduresContent() {
    const content = document.getElementById('mainContent');
    if (!content) {
        console.error('[MY-PROCEDURES] mainContent not found');
        return;
    }

    content.innerHTML = '<div id="module-content" style="padding: 20px;"></div>';

    if (typeof MyProcedures !== 'undefined' && MyProcedures.render) {
        MyProcedures.render('module-content');
    }
}

// ============================================================================
// EXPORTS
// ============================================================================
if (typeof window !== 'undefined') {
    window.showMyProceduresContent = showMyProceduresContent;
    window.MyProcedures = MyProcedures;

    window.Modules = window.Modules || {};
    window.Modules['my-procedures'] = {
        init: showMyProceduresContent,
        render: MyProcedures.render
    };
}

console.log('%c MY PROCEDURES READY ', 'background: #1abc9c; color: #000; padding: 4px 8px; border-radius: 4px;');
