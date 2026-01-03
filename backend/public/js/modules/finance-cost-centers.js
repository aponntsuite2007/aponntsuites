/**
 * Finance Cost Centers Module
 * Centros de Costo con jerarquía de 4 niveles
 */

window.FinanceCostCenters = (function() {
    'use strict';

    const API_BASE = '/api/finance/accounts/cost-centers';
    let costCenters = [];
    let selectedCenter = null;

    // =============================================
    // INICIALIZACIÓN
    // =============================================

    async function init(container) {
        console.log('🏢 Inicializando Centros de Costo...');

        container.innerHTML = renderStructure();
        await loadCostCenters();

        console.log('✅ Centros de Costo inicializado');
    }

    function renderStructure() {
        return `
            <div class="finance-module">
                <div class="module-header">
                    <h2>🏢 Centros de Costo</h2>
                    <div class="header-actions">
                        <select id="center-type-filter" class="filter-select" onchange="FinanceCostCenters.filterCenters()">
                            <option value="">Todos los tipos</option>
                            <option value="segment">Segmento</option>
                            <option value="profit_center">Profit Center</option>
                            <option value="cost_center">Cost Center</option>
                            <option value="project">Proyecto</option>
                        </select>
                        <button onclick="FinanceCostCenters.syncWithDepartments()" class="btn-secondary">
                            🔄 Sincronizar con Departamentos
                        </button>
                        <button onclick="FinanceCostCenters.showCreateModal()" class="btn-primary">
                            + Nuevo Centro
                        </button>
                    </div>
                </div>

                <div class="module-content">
                    <div class="hierarchy-legend">
                        <span class="level-badge level-1">Nivel 1: Segmento</span>
                        <span class="level-badge level-2">Nivel 2: Profit Center</span>
                        <span class="level-badge level-3">Nivel 3: Cost Center</span>
                        <span class="level-badge level-4">Nivel 4: Proyecto</span>
                    </div>

                    <div class="tree-container" id="cost-centers-tree"></div>
                </div>

                <!-- Modal -->
                <div id="cost-center-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="cc-modal-title">Nuevo Centro de Costo</h3>
                            <button onclick="FinanceCostCenters.closeModal()" class="btn-close">&times;</button>
                        </div>
                        <form id="cost-center-form" onsubmit="return FinanceCostCenters.saveCostCenter(event)">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Código *</label>
                                    <input type="text" name="code" required placeholder="CC-001">
                                </div>
                                <div class="form-group">
                                    <label>Nombre *</label>
                                    <input type="text" name="name" required>
                                </div>
                                <div class="form-group">
                                    <label>Tipo *</label>
                                    <select name="center_type" required onchange="FinanceCostCenters.onTypeChange(this.value)">
                                        <option value="segment">Segmento (Nivel 1)</option>
                                        <option value="profit_center">Profit Center (Nivel 2)</option>
                                        <option value="cost_center">Cost Center (Nivel 3)</option>
                                        <option value="project">Proyecto (Nivel 4)</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Centro Padre</label>
                                    <select name="parent_id" id="cc-parent-select">
                                        <option value="">Sin padre (nivel raíz)</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Departamento (opcional)</label>
                                    <select name="department_id" id="cc-department-select">
                                        <option value="">Sin departamento</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Responsable</label>
                                    <select name="manager_id" id="cc-manager-select">
                                        <option value="">Sin responsable</option>
                                    </select>
                                </div>
                                <div class="form-group full-width">
                                    <label>Descripción</label>
                                    <textarea name="description" rows="2"></textarea>
                                </div>
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="has_budget" checked>
                                        Tiene Presupuesto
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="allows_posting" checked>
                                        Permite Imputación
                                    </label>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" onclick="FinanceCostCenters.closeModal()" class="btn-secondary">Cancelar</button>
                                <button type="submit" class="btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style>
                .hierarchy-legend { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
                .level-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
                .level-badge.level-1 { background: #e3f2fd; color: #1565c0; }
                .level-badge.level-2 { background: #e8f5e9; color: #2e7d32; }
                .level-badge.level-3 { background: #fff3e0; color: #e65100; }
                .level-badge.level-4 { background: #f3e5f5; color: #7b1fa2; }

                .tree-container { background: white; border-radius: 8px; padding: 16px; }
                .cc-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 6px; margin-bottom: 4px; cursor: pointer; transition: background 0.2s; }
                .cc-item:hover { background: #f5f5f5; }
                .cc-item.level-1 { margin-left: 0; background: #e3f2fd; }
                .cc-item.level-2 { margin-left: 28px; }
                .cc-item.level-3 { margin-left: 56px; }
                .cc-item.level-4 { margin-left: 84px; }
                .cc-item .cc-icon { font-size: 20px; }
                .cc-item .cc-code { font-family: monospace; color: #666; min-width: 80px; }
                .cc-item .cc-name { flex: 1; font-weight: 500; }
                .cc-item .cc-type { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #eee; }
                .cc-item .cc-status { font-size: 18px; }
            </style>
        `;
    }

    // =============================================
    // CARGA DE DATOS
    // =============================================

    async function loadCostCenters() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(API_BASE, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                costCenters = result.data;
                renderTree();
                populateParentSelect();
                await loadDepartments();
            }
        } catch (error) {
            console.error('Error loading cost centers:', error);
        }
    }

    function renderTree() {
        const container = document.getElementById('cost-centers-tree');
        if (!container) return;

        const typeFilter = document.getElementById('center-type-filter')?.value || '';

        let filtered = costCenters;
        if (typeFilter) {
            filtered = filtered.filter(c => c.center_type === typeFilter);
        }

        // Ordenar por path para mantener jerarquía
        filtered.sort((a, b) => (a.path || '').localeCompare(b.path || ''));

        const icons = {
            segment: '🏛️',
            profit_center: '💼',
            cost_center: '📊',
            project: '📁'
        };

        container.innerHTML = filtered.map(cc => `
            <div class="cc-item level-${cc.level}" onclick="FinanceCostCenters.selectCenter(${cc.id})">
                <span class="cc-icon">${icons[cc.center_type] || '📋'}</span>
                <span class="cc-code">${cc.code}</span>
                <span class="cc-name">${cc.name}</span>
                <span class="cc-type">${getTypeLabel(cc.center_type)}</span>
                <span class="cc-status">${cc.is_active ? '✅' : '❌'}</span>
                ${cc.department?.name ? `<span style="font-size: 11px; color: #999;">📍 ${cc.department.name}</span>` : ''}
            </div>
        `).join('') || '<div style="padding: 40px; text-align: center; color: #999;">No hay centros de costo</div>';
    }

    function populateParentSelect() {
        const select = document.getElementById('cc-parent-select');
        if (!select) return;

        select.innerHTML = '<option value="">Sin padre (nivel raíz)</option>' +
            costCenters
                .filter(cc => cc.level < 4)
                .map(cc => `<option value="${cc.id}">${cc.code} - ${cc.name}</option>`)
                .join('');
    }

    async function loadDepartments() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/v1/departments', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                const select = document.getElementById('cc-department-select');
                if (select) {
                    select.innerHTML = '<option value="">Sin departamento</option>' +
                        (result.data || []).map(d => `<option value="${d.id}">${d.name}</option>`).join('');
                }
            }
        } catch (error) {
            console.error('Error loading departments:', error);
        }
    }

    function getTypeLabel(type) {
        const labels = {
            segment: 'Segmento',
            profit_center: 'Profit Center',
            cost_center: 'Cost Center',
            project: 'Proyecto'
        };
        return labels[type] || type;
    }

    // =============================================
    // ACCIONES
    // =============================================

    function filterCenters() {
        renderTree();
    }

    function selectCenter(id) {
        selectedCenter = costCenters.find(c => c.id === id);
        showEditModal(selectedCenter);
    }

    function showCreateModal() {
        selectedCenter = null;
        document.getElementById('cc-modal-title').textContent = 'Nuevo Centro de Costo';
        document.getElementById('cost-center-form').reset();
        document.getElementById('cost-center-modal').style.display = 'flex';
    }

    function showEditModal(center) {
        document.getElementById('cc-modal-title').textContent = 'Editar Centro de Costo';
        const form = document.getElementById('cost-center-form');

        form.code.value = center.code;
        form.name.value = center.name;
        form.center_type.value = center.center_type;
        form.parent_id.value = center.parent_id || '';
        form.department_id.value = center.department_id || '';
        form.manager_id.value = center.manager_id || '';
        form.description.value = center.description || '';
        form.has_budget.checked = center.has_budget;
        form.allows_posting.checked = center.allows_posting;

        document.getElementById('cost-center-modal').style.display = 'flex';
    }

    function closeModal() {
        document.getElementById('cost-center-modal').style.display = 'none';
        selectedCenter = null;
    }

    function onTypeChange(type) {
        const levelMap = { segment: 1, profit_center: 2, cost_center: 3, project: 4 };
        // Auto-filter parent options based on type
    }

    async function saveCostCenter(event) {
        event.preventDefault();

        const form = event.target;
        const data = {
            code: form.code.value,
            name: form.name.value,
            center_type: form.center_type.value,
            parent_id: form.parent_id.value || null,
            department_id: form.department_id.value || null,
            manager_id: form.manager_id.value || null,
            description: form.description.value,
            has_budget: form.has_budget.checked,
            allows_posting: form.allows_posting.checked
        };

        try {
            const token = localStorage.getItem('token');
            const url = selectedCenter ? `${API_BASE}/${selectedCenter.id}` : API_BASE;
            const method = selectedCenter ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                closeModal();
                await loadCostCenters();
                alert(selectedCenter ? 'Centro actualizado' : 'Centro creado');
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving cost center:', error);
            alert('Error al guardar');
        }
    }

    async function syncWithDepartments() {
        if (!confirm('¿Sincronizar centros de costo con departamentos existentes?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/finance/sync-cost-centers', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (result.success) {
                await loadCostCenters();
                alert(`Sincronización completada: ${result.data.created} creados, ${result.data.updated} actualizados`);
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error syncing:', error);
            alert('Error al sincronizar');
        }
    }

    // =============================================
    // API PÚBLICA
    // =============================================

    return {
        init,
        filterCenters,
        selectCenter,
        showCreateModal,
        closeModal,
        saveCostCenter,
        syncWithDepartments,
        onTypeChange
    };

})();
