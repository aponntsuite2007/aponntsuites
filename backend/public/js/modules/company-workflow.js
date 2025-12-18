/**
 * COMPANY WORKFLOW - Sistema de Alta y Gestión de Empresas
 * Adaptado al Dark Theme con estructura de TABS
 *
 * WORKFLOW:
 * 1. Nueva Empresa → Modal con datos + módulos → Presupuesto PENDIENTE
 * 2. Cliente aprueba → Presupuesto APROBADO
 * 3. Generar Contrato → Cliente firma → Presupuesto VIGENTE
 * 4. Modificar Empresa → Nuevo Presupuesto (usa VIGENTE como plantilla)
 * 5. Al firmar nuevo contrato → Anterior CADUCADO, Nuevo VIGENTE
 */

(function() {
    'use strict';

    // Estado del workflow
    const workflowState = {
        availableModules: [],
        selectedModules: new Set(),
        currentCompany: null,
        currentBudget: null,
        isEditing: false,
        employeeCount: 1,
        maxEmployees: 50,
        activeTab: 'datos',
        branches: [],
        users: [],
        provinces: {},
        cities: {}
    };

    // Tiers de pricing
    const PRICING_TIERS = [
        { min: 1, max: 50, name: '1-50 empleados', discount: 0, color: '#22c55e' },
        { min: 51, max: 150, name: '51-150 empleados', discount: 5, color: '#3b82f6' },
        { min: 151, max: 500, name: '151-500 empleados', discount: 10, color: '#8b5cf6' },
        { min: 501, max: 1000, name: '501-1000 empleados', discount: 15, color: '#f59e0b' },
        { min: 1001, max: Infinity, name: '1000+ empleados', discount: 20, color: '#ef4444' }
    ];

    // API
    const WorkflowAPI = {
        baseUrl: '/api/aponnt/dashboard',

        getHeaders() {
            const token = localStorage.getItem('aponnt_token_staff');
            return {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            };
        },

        async getModules() {
            try {
                const res = await fetch(`${this.baseUrl}/modules-pricing`, { headers: this.getHeaders() });
                if (!res.ok) {
                    // Fallback: cargar desde registry
                    const registryRes = await fetch('/api/audit/registry', { headers: this.getHeaders() });
                    if (registryRes.ok) {
                        const data = await registryRes.json();
                        return Object.values(data.modules || {}).map(m => ({
                            key: m.key,
                            name: m.name,
                            icon: m.icon || '📦',
                            category: m.category || 'general',
                            is_core: m.commercial?.is_core || false,
                            base_price: m.commercial?.base_price || 0,
                            price_per_employee: m.commercial?.price_per_employee || 0,
                            description: m.description || ''
                        }));
                    }
                    return [];
                }
                return await res.json();
            } catch (e) {
                console.error('[WORKFLOW] Error loading modules:', e);
                return [];
            }
        },

        async getCompanyBranches(companyId) {
            try {
                const res = await fetch(`${this.baseUrl}/companies/${companyId}/branches`, { headers: this.getHeaders() });
                if (!res.ok) return [];
                return await res.json();
            } catch (e) {
                console.error('[WORKFLOW] Error loading branches:', e);
                return [];
            }
        },

        async getCompanyUsers(companyId) {
            try {
                const res = await fetch(`${this.baseUrl}/companies/${companyId}/users`, { headers: this.getHeaders() });
                if (!res.ok) return [];
                return await res.json();
            } catch (e) {
                console.error('[WORKFLOW] Error loading users:', e);
                return [];
            }
        },

        async createCompanyWithBudget(companyData, modules, employeeCount) {
            const res = await fetch(`${this.baseUrl}/companies`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    ...companyData,
                    modules: Array.from(modules),
                    contracted_employees: employeeCount,
                    create_budget: true
                })
            });
            if (!res.ok) throw new Error('Error al crear empresa');
            return await res.json();
        },

        async updateCompany(companyId, companyData) {
            const res = await fetch(`${this.baseUrl}/companies/${companyId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(companyData)
            });
            if (!res.ok) throw new Error('Error al actualizar empresa');
            return await res.json();
        },

        async createBudget(companyId, modules, employeeCount) {
            const res = await fetch(`${this.baseUrl}/budgets`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    company_id: companyId,
                    modules: Array.from(modules),
                    contracted_employees: employeeCount
                })
            });
            if (!res.ok) throw new Error('Error al crear presupuesto');
            return await res.json();
        },

        async saveBranch(companyId, branchData) {
            const method = branchData.id ? 'PUT' : 'POST';
            const url = branchData.id
                ? `${this.baseUrl}/branches/${branchData.id}`
                : `${this.baseUrl}/companies/${companyId}/branches`;

            const res = await fetch(url, {
                method,
                headers: this.getHeaders(),
                body: JSON.stringify(branchData)
            });
            if (!res.ok) throw new Error('Error al guardar sucursal');
            return await res.json();
        },

        async deleteBranch(branchId) {
            const res = await fetch(`${this.baseUrl}/branches/${branchId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            if (!res.ok) throw new Error('Error al eliminar sucursal');
            return true;
        }
    };

    // Funciones de UI
    function getTier(employeeCount) {
        return PRICING_TIERS.find(t => employeeCount >= t.min && employeeCount <= t.max) || PRICING_TIERS[0];
    }

    function calculatePricing() {
        const employeeCount = parseInt(workflowState.employeeCount) || 1;
        const tier = getTier(employeeCount);
        let subtotal = 0;

        workflowState.selectedModules.forEach(moduleKey => {
            const module = workflowState.availableModules.find(m => m.key === moduleKey);
            if (module) {
                const basePrice = parseFloat(module.base_price) || 0;
                const perEmployee = parseFloat(module.price_per_employee) || 0;
                subtotal += basePrice + (perEmployee * employeeCount);
            }
        });

        const discount = subtotal * (tier.discount / 100);
        const subtotalWithDiscount = subtotal - discount;
        const tax = subtotalWithDiscount * 0.21;
        const total = subtotalWithDiscount + tax;

        return { subtotal, discount, subtotalWithDiscount, tax, total, tier };
    }

    // ========== RENDER TABS ==========
    function renderTabsNavigation() {
        const tabs = [
            { id: 'datos', icon: '🏢', label: 'Datos' },
            { id: 'modulos', icon: '📦', label: 'Módulos' },
            { id: 'sucursales', icon: '🏪', label: 'Sucursales' },
            { id: 'usuarios', icon: '👤', label: 'Usuarios' }
        ];

        return `
            <div class="wf-tabs-nav">
                ${tabs.map(tab => `
                    <button class="wf-tab-btn ${workflowState.activeTab === tab.id ? 'active' : ''}"
                            onclick="CompanyWorkflow.switchTab('${tab.id}')"
                            data-tab="${tab.id}">
                        <span class="wf-tab-icon">${tab.icon}</span>
                        <span class="wf-tab-label">${tab.label}</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    // ========== TAB 1: DATOS DE LA EMPRESA ==========
    // NOTA: Ubicación (país, dirección, etc.) va por SUCURSAL, no por empresa
    // Una empresa puede tener sucursales en diferentes países
    function renderTabDatos(company = null) {
        return `
            <div class="wf-tab-content ${workflowState.activeTab === 'datos' ? 'active' : ''}" id="wf-tab-datos">
                <div class="wf-section">
                    <h4>🏢 Información de la Empresa</h4>
                    <div class="wf-fields-grid">
                        <div class="wf-field">
                            <label>Nombre Comercial *</label>
                            <input type="text" id="wf-companyName" value="${company?.name || ''}" required
                                   placeholder="Nombre con el que opera la empresa">
                        </div>
                        <div class="wf-field">
                            <label>Razón Social</label>
                            <input type="text" id="wf-legalName" value="${company?.legal_name || ''}"
                                   placeholder="Razón social según registro">
                        </div>
                        <div class="wf-field">
                            <label>Identificación Fiscal *</label>
                            <input type="text" id="wf-taxId" value="${company?.tax_id || ''}" required
                                   placeholder="CUIT, NIF, RFC, RUT según país">
                        </div>
                        <div class="wf-field">
                            <label>Estado del Presupuesto</label>
                            <div class="wf-status-badge ${company ? 'editing' : 'new'}">
                                ${company ? `
                                    <span class="wf-status-icon">${company.status === 'VIGENTE' ? '✅' : company.status === 'APROBADO' ? '👍' : company.status === 'PENDIENTE' ? '⏳' : '📝'}</span>
                                    <span class="wf-status-text">${company.status || 'VIGENTE'}</span>
                                    <small class="wf-status-note">Al guardar se generará nuevo presupuesto PENDIENTE</small>
                                ` : `
                                    <span class="wf-status-icon">⏳</span>
                                    <span class="wf-status-text">PENDIENTE</span>
                                    <small class="wf-status-note">Estado automático al crear empresa</small>
                                `}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="wf-section">
                    <h4>📧 Contacto Principal</h4>
                    <p class="wf-section-note">Contacto comercial de la empresa (decisor de compra)</p>
                    <div class="wf-fields-grid">
                        <div class="wf-field">
                            <label>Email de Contacto *</label>
                            <input type="email" id="wf-email" value="${company?.contact_email || ''}" required
                                   placeholder="contacto@empresa.com">
                        </div>
                        <div class="wf-field">
                            <label>Teléfono</label>
                            <input type="text" id="wf-phone" value="${company?.contact_phone || company?.phone || ''}"
                                   placeholder="+54 11 1234-5678">
                        </div>
                        <div class="wf-field">
                            <label>Nombre del Contacto</label>
                            <input type="text" id="wf-contactName" value="${company?.contact_name || ''}"
                                   placeholder="Nombre del responsable">
                        </div>
                        <div class="wf-field">
                            <label>Cargo</label>
                            <input type="text" id="wf-contactPosition" value="${company?.contact_position || ''}"
                                   placeholder="Ej: Gerente de RRHH">
                        </div>
                    </div>
                </div>

                <div class="wf-section">
                    <h4>⚙️ Configuración de Contrato</h4>
                    <div class="wf-fields-grid">
                        <div class="wf-field">
                            <label>Tipo de Licencia Soporte</label>
                            <select id="wf-licenseType">
                                <option value="basic" ${company?.license_type === 'basic' ? 'selected' : ''}>🥉 Básica - Email (48hs)</option>
                                <option value="premium" ${company?.license_type === 'premium' ? 'selected' : ''}>🥈 Premium - Chat + Email (24hs)</option>
                                <option value="enterprise" ${company?.license_type === 'enterprise' ? 'selected' : ''}>🥇 Empresarial - Dedicado (4hs)</option>
                            </select>
                        </div>
                        <div class="wf-field">
                            <label>Empleados Contratados</label>
                            <input type="number" id="wf-employees" value="${company?.contracted_employees || workflowState.employeeCount}"
                                   min="1" max="10000" onchange="CompanyWorkflow.onEmployeeChange()">
                            <small class="wf-field-help">Cantidad por la que se factura mensualmente</small>
                        </div>
                        <div class="wf-field">
                            <label>Límite Máximo</label>
                            <input type="number" id="wf-maxEmployees" value="${company?.max_employees || workflowState.maxEmployees}" min="1" max="10000">
                            <small class="wf-field-help">Límite técnico del sistema</small>
                        </div>
                    </div>
                </div>

                <div class="wf-info-box" style="margin-top: 20px;">
                    <strong>📍 Ubicación:</strong> Los datos de dirección, país, ciudad, etc. se configuran por <strong>Sucursal</strong>
                    en la pestaña correspondiente. Una empresa puede tener sucursales en diferentes países, y cada sucursal
                    determina la configuración regional de sus módulos (idioma, zona horaria, moneda, legislación laboral, etc.).
                </div>

                <div class="wf-workflow-info" style="margin-top: 15px;">
                    <h5>🔄 Workflow de Presupuestos (Automático)</h5>
                    <div class="wf-workflow-steps">
                        <div class="wf-workflow-step">
                            <span class="wf-step-icon">⏳</span>
                            <span class="wf-step-label">PENDIENTE</span>
                            <span class="wf-step-desc">Al crear empresa</span>
                        </div>
                        <span class="wf-workflow-arrow">→</span>
                        <div class="wf-workflow-step">
                            <span class="wf-step-icon">👍</span>
                            <span class="wf-step-label">APROBADO</span>
                            <span class="wf-step-desc">Cliente acepta</span>
                        </div>
                        <span class="wf-workflow-arrow">→</span>
                        <div class="wf-workflow-step">
                            <span class="wf-step-icon">✅</span>
                            <span class="wf-step-label">VIGENTE</span>
                            <span class="wf-step-desc">Contrato firmado</span>
                        </div>
                        <span class="wf-workflow-arrow">→</span>
                        <div class="wf-workflow-step">
                            <span class="wf-step-icon">📦</span>
                            <span class="wf-step-label">CADUCADO</span>
                            <span class="wf-step-desc">Nuevo contrato</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== TAB 2: MÓDULOS COMERCIALES ==========
    function renderTabModulos() {
        const modules = workflowState.availableModules;

        // Agrupar por categoría
        const categories = {};
        modules.forEach(m => {
            const cat = m.category || 'general';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(m);
        });

        const categoryNames = {
            'core': '🔧 Core (Obligatorios)',
            'rrhh': '👥 RRHH',
            'medical': '⚕️ Médico',
            'compliance': '⚖️ Compliance',
            'ai': '🤖 Inteligencia Artificial',
            'hardware': '📟 Hardware',
            'analytics': '📊 Analytics',
            'communication': '📬 Comunicación',
            'security': '🔐 Seguridad',
            'payroll': '💰 Nómina',
            'siac': '📋 ERP SIAC',
            'admin': '💼 Administración',
            'support': '🎫 Soporte',
            'general': '📦 General'
        };

        const categoryOrder = ['core', 'rrhh', 'payroll', 'medical', 'compliance', 'analytics', 'ai', 'hardware', 'communication', 'security', 'admin', 'support', 'siac', 'general'];
        const sortedCategories = categoryOrder.filter(c => categories[c]);

        return `
            <div class="wf-tab-content ${workflowState.activeTab === 'modulos' ? 'active' : ''}" id="wf-tab-modulos">
                <div class="wf-modules-layout">
                    <!-- Panel izquierdo: Selector de módulos -->
                    <div class="wf-modules-selector">
                        <div class="wf-modules-header">
                            <h4>📦 Seleccionar Módulos</h4>
                            <div class="wf-modules-filters">
                                <button class="wf-filter-btn active" onclick="CompanyWorkflow.filterModules('all')" data-filter="all">Todos</button>
                                <button class="wf-filter-btn" onclick="CompanyWorkflow.filterModules('contracted')" data-filter="contracted">Contratados</button>
                                <button class="wf-filter-btn" onclick="CompanyWorkflow.filterModules('available')" data-filter="available">Disponibles</button>
                            </div>
                        </div>

                        <div class="wf-modules-scroll">
                            ${modules.length === 0 ? '<p class="wf-no-modules">Cargando módulos...</p>' :
                                sortedCategories.map(cat => {
                                    const catModules = categories[cat];
                                    return `
                                        <div class="wf-category" data-category="${cat}">
                                            <h5 class="wf-category-title">${categoryNames[cat] || cat}</h5>
                                            <div class="wf-modules-grid">
                                                ${catModules.map(m => {
                                                    const isSelected = workflowState.selectedModules.has(m.key);
                                                    const isCore = m.is_core;
                                                    const price = parseFloat(m.base_price) || 0;
                                                    const perEmp = parseFloat(m.price_per_employee) || 0;

                                                    return `
                                                        <div class="wf-module-card ${isSelected ? 'selected' : ''} ${isCore ? 'is-core' : ''}"
                                                             onclick="CompanyWorkflow.toggleModule('${m.key}')"
                                                             data-module="${m.key}"
                                                             data-contracted="${isSelected}">
                                                            <div class="wf-module-header">
                                                                <span class="wf-module-icon">${m.icon || '📦'}</span>
                                                                <span class="wf-module-name">${m.name}</span>
                                                                ${isCore ? '<span class="wf-badge core">CORE</span>' : ''}
                                                            </div>
                                                            <div class="wf-module-desc">${m.description || ''}</div>
                                                            <div class="wf-module-price">
                                                                ${price > 0 ? `$${price.toFixed(2)}` : 'Incluido'}
                                                                ${perEmp > 0 ? ` + $${perEmp.toFixed(2)}/emp` : ''}
                                                            </div>
                                                            <div class="wf-module-check">${isSelected ? '✓' : ''}</div>
                                                        </div>
                                                    `;
                                                }).join('')}
                                            </div>
                                        </div>
                                    `;
                                }).join('')
                            }
                        </div>
                    </div>

                    <!-- Panel derecho: Cotización (sticky) -->
                    <div class="wf-pricing-panel">
                        ${renderPricingSidebar()}
                    </div>
                </div>
            </div>
        `;
    }

    function renderPricingSidebar() {
        const pricing = calculatePricing();
        const selectedList = Array.from(workflowState.selectedModules).map(key => {
            const m = workflowState.availableModules.find(mod => mod.key === key);
            return m ? { name: m.name, icon: m.icon || '📦' } : { name: key, icon: '📦' };
        });

        return `
            <div class="wf-pricing" id="wf-pricing-content">
                <h4>💰 Cotización</h4>

                <div class="wf-tier-badge" style="background: ${pricing.tier.color}20; border-color: ${pricing.tier.color};">
                    <span style="color: ${pricing.tier.color};">${pricing.tier.name}</span>
                    ${pricing.tier.discount > 0 ? `<span class="wf-discount-badge">-${pricing.tier.discount}%</span>` : ''}
                </div>

                <div class="wf-employee-input">
                    <label>Empleados:</label>
                    <input type="number" id="wf-employees-pricing" value="${workflowState.employeeCount}"
                           min="1" max="10000" onchange="CompanyWorkflow.onEmployeeChange(this.value)">
                </div>

                <div class="wf-pricing-lines">
                    <div class="wf-pricing-line">
                        <span>Subtotal:</span>
                        <span>$${pricing.subtotal.toFixed(2)}</span>
                    </div>
                    ${pricing.discount > 0 ? `
                        <div class="wf-pricing-line discount">
                            <span>Descuento (${pricing.tier.discount}%):</span>
                            <span>-$${pricing.discount.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="wf-pricing-line">
                        <span>IVA (21%):</span>
                        <span>$${pricing.tax.toFixed(2)}</span>
                    </div>
                    <div class="wf-pricing-total">
                        <span>Total Mensual:</span>
                        <span>$${pricing.total.toFixed(2)}</span>
                    </div>
                </div>

                <div class="wf-selected-modules">
                    <h5>Módulos (${workflowState.selectedModules.size}):</h5>
                    <div class="wf-selected-list">
                        ${selectedList.length > 0
                            ? selectedList.map(m => `<span class="wf-selected-tag">${m.icon} ${m.name}</span>`).join('')
                            : '<span class="wf-no-selection">Ninguno seleccionado</span>'
                        }
                    </div>
                </div>
            </div>
        `;
    }

    // ========== TAB 3: SUCURSALES ==========
    function renderTabSucursales() {
        const branches = workflowState.branches || [];

        return `
            <div class="wf-tab-content ${workflowState.activeTab === 'sucursales' ? 'active' : ''}" id="wf-tab-sucursales">
                <div class="wf-section">
                    <div class="wf-section-header">
                        <h4>🏪 Sucursales <span class="wf-required-badge">OBLIGATORIO</span></h4>
                        <button type="button" class="wf-btn wf-btn-primary" onclick="CompanyWorkflow.showBranchModal()">
                            ➕ ${branches.length === 0 ? 'Agregar Sucursal Central' : 'Nueva Sucursal'}
                        </button>
                    </div>

                    <div class="wf-info-box wf-info-warning" style="margin-bottom: 20px;">
                        <strong>⚠️ Obligatorio:</strong> Toda empresa debe tener al menos <strong>una sucursal</strong>.
                        Si la empresa opera desde una sola ubicación, créela como "Central" o "Casa Matriz".
                        La ubicación (país, ciudad, dirección) se configura aquí y determina la zona horaria, moneda y legislación laboral.
                    </div>

                    <div class="wf-branches-container">
                        ${branches.length === 0 ? `
                            <div class="wf-empty-state wf-empty-warning">
                                <div class="wf-empty-icon">⚠️</div>
                                <h5>Debe agregar al menos una sucursal</h5>
                                <p>Haz clic en "Agregar Sucursal Central" para continuar</p>
                                <button type="button" class="wf-btn wf-btn-primary" style="margin-top: 15px;" onclick="CompanyWorkflow.showBranchModal({name: 'Central', is_main: true})">
                                    🏢 Crear Sucursal Central
                                </button>
                            </div>
                        ` : `
                            <div class="wf-branches-grid">
                                ${branches.map(branch => `
                                    <div class="wf-branch-card">
                                        <div class="wf-branch-header">
                                            <span class="wf-branch-icon">🏪</span>
                                            <span class="wf-branch-name">${branch.name}</span>
                                            ${branch.is_main ? '<span class="wf-badge main">PRINCIPAL</span>' : ''}
                                        </div>
                                        <div class="wf-branch-info">
                                            <p><strong>Dirección:</strong> ${branch.address || 'No especificada'}</p>
                                            <p><strong>Ciudad:</strong> ${branch.city || '-'}, ${branch.province || '-'}</p>
                                            ${branch.phone ? `<p><strong>Teléfono:</strong> ${branch.phone}</p>` : ''}
                                        </div>
                                        <div class="wf-branch-actions">
                                            <button type="button" class="wf-btn-small wf-btn-outline"
                                                    onclick="CompanyWorkflow.editBranch(${branch.id})">
                                                ✏️ Editar
                                            </button>
                                            ${!branch.is_main ? `
                                                <button type="button" class="wf-btn-small wf-btn-danger"
                                                        onclick="CompanyWorkflow.deleteBranch(${branch.id})">
                                                    🗑️ Eliminar
                                                </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>

                ${workflowState.isEditing ? '' : `
                    <div class="wf-info-box">
                        <strong>ℹ️ Nota:</strong> Las sucursales se pueden agregar después de crear la empresa.
                        Por ahora puede continuar sin agregar sucursales.
                    </div>
                `}
            </div>
        `;
    }

    // ========== TAB 4: USUARIOS ==========
    function renderTabUsuarios() {
        const users = workflowState.users || [];

        return `
            <div class="wf-tab-content ${workflowState.activeTab === 'usuarios' ? 'active' : ''}" id="wf-tab-usuarios">
                <div class="wf-section">
                    <div class="wf-section-header">
                        <h4>👤 Usuarios del Sistema</h4>
                        ${workflowState.isEditing ? `
                            <div style="display: flex; gap: 10px;">
                                <button type="button" class="wf-btn wf-btn-secondary" onclick="CompanyWorkflow.refreshUsers()">
                                    🔄 Actualizar
                                </button>
                                <button type="button" class="wf-btn wf-btn-outline" onclick="CompanyWorkflow.resetAdminPassword()">
                                    🔑 Reset Pass Admin
                                </button>
                            </div>
                        ` : ''}
                    </div>

                    <div class="wf-users-container">
                        ${!workflowState.isEditing ? `
                            <div class="wf-info-box wf-info-success">
                                <strong>✅ Usuarios Automáticos:</strong> Al crear la empresa se generarán automáticamente los siguientes usuarios:
                            </div>

                            <div class="wf-auto-users-grid">
                                <div class="wf-auto-user-card">
                                    <div class="wf-auto-user-icon">👤</div>
                                    <div class="wf-auto-user-info">
                                        <div class="wf-auto-user-title">Usuario Administrador</div>
                                        <div class="wf-auto-user-detail">
                                            <span class="wf-label">Usuario:</span>
                                            <span class="wf-value">admin</span>
                                        </div>
                                        <div class="wf-auto-user-detail">
                                            <span class="wf-label">Contraseña:</span>
                                            <span class="wf-value">admin123</span>
                                        </div>
                                        <div class="wf-auto-user-note">
                                            ⚠️ El cliente DEBE cambiar esta contraseña en su primer acceso
                                        </div>
                                    </div>
                                    <div class="wf-auto-user-badge admin">ADMIN</div>
                                </div>

                                <div class="wf-auto-user-card wf-auto-user-hidden">
                                    <div class="wf-auto-user-icon">🔧</div>
                                    <div class="wf-auto-user-info">
                                        <div class="wf-auto-user-title">Usuario Soporte Técnico</div>
                                        <div class="wf-auto-user-detail">
                                            <span class="wf-label">Usuario:</span>
                                            <span class="wf-value">soporte</span>
                                        </div>
                                        <div class="wf-auto-user-detail">
                                            <span class="wf-label">Contraseña:</span>
                                            <span class="wf-value wf-hidden-value">••••••••</span>
                                        </div>
                                        <div class="wf-auto-user-note">
                                            🔒 Usuario oculto para cliente - Solo uso interno de testing/soporte
                                        </div>
                                    </div>
                                    <div class="wf-auto-user-badge soporte">OCULTO</div>
                                </div>
                            </div>

                            <div class="wf-info-box" style="margin-top: 20px;">
                                <strong>ℹ️ Nota:</strong> El usuario <code>soporte</code> NO aparece en el listado de usuarios
                                del cliente ni del vendedor. Es exclusivo para el equipo técnico de APONNT para testing y diagnóstico.
                            </div>
                        ` : users.length === 0 ? `
                            <div class="wf-empty-state">
                                <div class="wf-empty-icon">👤</div>
                                <h5>No hay usuarios registrados</h5>
                                <p>Haga clic en "Actualizar" para cargar los usuarios</p>
                            </div>
                        ` : `
                            <div class="wf-users-grid">
                                ${users.map(user => `
                                    <div class="wf-user-card">
                                        <div class="wf-user-avatar">
                                            ${user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div class="wf-user-info">
                                            <div class="wf-user-name">${user.name || 'Sin nombre'}</div>
                                            <div class="wf-user-email">${user.email}</div>
                                            <div class="wf-user-role">${user.role || 'Usuario'}</div>
                                        </div>
                                        <div class="wf-user-status ${user.is_active ? 'active' : 'inactive'}">
                                            ${user.is_active ? '✅ Activo' : '❌ Inactivo'}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    // ========== MODAL PRINCIPAL ==========
    function renderModalContent(company = null) {
        return `
            ${renderTabsNavigation()}
            <div class="wf-tabs-content">
                ${renderTabDatos(company)}
                ${renderTabModulos()}
                ${renderTabSucursales()}
                ${renderTabUsuarios()}
            </div>
        `;
    }

    function showModal(title, company = null, onSave) {
        closeModal();

        const modal = document.createElement('div');
        modal.id = 'workflow-modal-overlay';
        modal.className = 'wf-modal-overlay';
        modal.innerHTML = `
            <div class="wf-modal">
                <div class="wf-modal-header">
                    <h3>${title}</h3>
                    <button class="wf-modal-close" onclick="CompanyWorkflow.closeModal()">×</button>
                </div>
                <div class="wf-modal-body">
                    ${renderModalContent(company)}
                </div>
                <div class="wf-modal-footer">
                    <button class="wf-btn wf-btn-secondary" onclick="CompanyWorkflow.closeModal()">
                        ❌ Cancelar
                    </button>
                    <button class="wf-btn wf-btn-primary" id="wf-saveBtn">
                        💾 ${workflowState.isEditing ? 'Generar Presupuesto' : 'Crear Empresa'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('wf-saveBtn').onclick = onSave;

        // Seleccionar módulos core por defecto si es nueva empresa
        if (!workflowState.isEditing) {
            workflowState.availableModules.filter(m => m.is_core).forEach(m => {
                workflowState.selectedModules.add(m.key);
            });
            updateModulesUI();
        }
    }

    function closeModal() {
        const modal = document.getElementById('workflow-modal-overlay');
        if (modal) modal.remove();
    }

    function updateModulesUI() {
        document.querySelectorAll('.wf-module-card').forEach(card => {
            const key = card.dataset.module;
            if (workflowState.selectedModules.has(key)) {
                card.classList.add('selected');
                card.querySelector('.wf-module-check').textContent = '✓';
                card.dataset.contracted = 'true';
            } else {
                card.classList.remove('selected');
                card.querySelector('.wf-module-check').textContent = '';
                card.dataset.contracted = 'false';
            }
        });

        // Actualizar pricing
        const pricingPanel = document.querySelector('.wf-pricing-panel');
        if (pricingPanel) {
            pricingPanel.innerHTML = renderPricingSidebar();
        }
    }

    // ========== MODAL DE SUCURSAL ==========
    function showBranchModal(branch = null) {
        const isEdit = branch && branch.id;
        const defaults = branch || {};

        // Lista de países
        const countries = ['Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Ecuador',
            'El Salvador', 'España', 'Guatemala', 'Honduras', 'México', 'Nicaragua',
            'Panamá', 'Paraguay', 'Perú', 'Uruguay', 'Venezuela', 'Estados Unidos', 'Otro'];

        const modalHtml = `
            <div class="wf-modal-overlay wf-branch-modal-overlay" id="branch-modal-overlay">
                <div class="wf-modal wf-modal-small">
                    <div class="wf-modal-header">
                        <h3>${isEdit ? '✏️ Editar Sucursal' : '🏪 Nueva Sucursal'}</h3>
                        <button class="wf-modal-close" onclick="CompanyWorkflow.closeBranchModal()">×</button>
                    </div>
                    <div class="wf-modal-body">
                        <div class="wf-fields-grid">
                            <div class="wf-field full">
                                <label>Nombre de la Sucursal *</label>
                                <input type="text" id="wf-branchName" value="${defaults.name || ''}"
                                       placeholder="Ej: Central, Casa Matriz, Sucursal Norte" required>
                            </div>
                            <div class="wf-field full">
                                <label>Dirección *</label>
                                <input type="text" id="wf-branchAddress" value="${defaults.address || ''}"
                                       placeholder="Calle, número, piso, depto" required>
                            </div>
                            <div class="wf-field">
                                <label>País *</label>
                                <select id="wf-branchCountry" required>
                                    <option value="">Seleccione...</option>
                                    ${countries.map(c => `<option value="${c}" ${defaults.country === c ? 'selected' : ''}>${c}</option>`).join('')}
                                </select>
                            </div>
                            <div class="wf-field">
                                <label>Provincia/Estado</label>
                                <input type="text" id="wf-branchProvince" value="${defaults.province || ''}"
                                       placeholder="Provincia o estado">
                            </div>
                            <div class="wf-field">
                                <label>Ciudad *</label>
                                <input type="text" id="wf-branchCity" value="${defaults.city || ''}"
                                       placeholder="Ciudad" required>
                            </div>
                            <div class="wf-field">
                                <label>Código Postal</label>
                                <input type="text" id="wf-branchPostalCode" value="${defaults.postal_code || ''}"
                                       placeholder="CP">
                            </div>
                            <div class="wf-field">
                                <label>Teléfono</label>
                                <input type="text" id="wf-branchPhone" value="${defaults.phone || ''}"
                                       placeholder="+54 11 1234-5678">
                            </div>
                            <div class="wf-field">
                                <label>Email</label>
                                <input type="email" id="wf-branchEmail" value="${defaults.email || ''}"
                                       placeholder="sucursal@empresa.com">
                            </div>
                            <div class="wf-field">
                                <label>Latitud</label>
                                <input type="number" id="wf-branchLat" step="any" value="${defaults.latitude || ''}"
                                       placeholder="Ej: -34.6037">
                            </div>
                            <div class="wf-field">
                                <label>Longitud</label>
                                <input type="number" id="wf-branchLng" step="any" value="${defaults.longitude || ''}"
                                       placeholder="Ej: -58.3816">
                            </div>
                            <div class="wf-field full">
                                <label class="wf-checkbox-label">
                                    <input type="checkbox" id="wf-branchMain" ${defaults.is_main ? 'checked' : ''}>
                                    Sucursal Principal (Casa Matriz)
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="wf-modal-footer">
                        <button class="wf-btn wf-btn-secondary" onclick="CompanyWorkflow.closeBranchModal()">
                            Cancelar
                        </button>
                        <button class="wf-btn wf-btn-primary" onclick="CompanyWorkflow.saveBranch(${isEdit ? defaults.id : 'null'})">
                            💾 Guardar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    function closeBranchModal() {
        const modal = document.getElementById('branch-modal-overlay');
        if (modal) modal.remove();
    }

    // ========== API PÚBLICA ==========
    const CompanyWorkflow = {
        async init() {
            console.log('[WORKFLOW] Inicializando...');
            workflowState.availableModules = await WorkflowAPI.getModules();
            console.log('[WORKFLOW] Módulos cargados:', workflowState.availableModules.length);
            this.injectStyles();
        },

        async showNewCompanyModal() {
            workflowState.isEditing = false;
            workflowState.currentCompany = null;
            workflowState.selectedModules = new Set();
            workflowState.employeeCount = 1;
            workflowState.maxEmployees = 50;
            workflowState.activeTab = 'datos';
            workflowState.branches = [];
            workflowState.users = [];

            if (workflowState.availableModules.length === 0) {
                await this.init();
            }

            showModal('🏢 Nueva Empresa + Presupuesto', null, this.saveNewCompany.bind(this));
        },

        async showEditCompanyModal(company) {
            workflowState.isEditing = true;
            workflowState.currentCompany = company;
            workflowState.employeeCount = company.contracted_employees || 1;
            workflowState.maxEmployees = company.max_employees || 50;
            workflowState.activeTab = 'datos';
            workflowState.selectedModules = new Set(company.active_modules || []);

            if (workflowState.availableModules.length === 0) {
                await this.init();
            }

            // Cargar sucursales y usuarios si es edición
            const companyId = company.company_id || company.id;
            workflowState.branches = await WorkflowAPI.getCompanyBranches(companyId);
            workflowState.users = await WorkflowAPI.getCompanyUsers(companyId);

            showModal(`📝 Editar - ${company.name}`, company, this.saveEditCompany.bind(this));
        },

        switchTab(tabId) {
            workflowState.activeTab = tabId;

            // Actualizar navegación
            document.querySelectorAll('.wf-tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabId);
            });

            // Actualizar contenido
            document.querySelectorAll('.wf-tab-content').forEach(tab => {
                tab.classList.toggle('active', tab.id === `wf-tab-${tabId}`);
            });
        },

        toggleModule(moduleKey) {
            const module = workflowState.availableModules.find(m => m.key === moduleKey);

            // No permitir deseleccionar módulos CORE
            if (module?.is_core && workflowState.selectedModules.has(moduleKey)) {
                return;
            }

            if (workflowState.selectedModules.has(moduleKey)) {
                workflowState.selectedModules.delete(moduleKey);
            } else {
                workflowState.selectedModules.add(moduleKey);
            }

            updateModulesUI();
        },

        filterModules(filter) {
            document.querySelectorAll('.wf-filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === filter);
            });

            document.querySelectorAll('.wf-module-card').forEach(card => {
                const isContracted = card.dataset.contracted === 'true';
                let show = true;

                if (filter === 'contracted') show = isContracted;
                else if (filter === 'available') show = !isContracted;

                card.style.display = show ? '' : 'none';
            });
        },

        onEmployeeChange(value) {
            const newValue = parseInt(value || document.getElementById('wf-employees')?.value || document.getElementById('wf-employees-pricing')?.value) || 1;
            workflowState.employeeCount = newValue;

            // Sincronizar inputs
            const input1 = document.getElementById('wf-employees');
            const input2 = document.getElementById('wf-employees-pricing');
            if (input1) input1.value = newValue;
            if (input2) input2.value = newValue;

            updateModulesUI();
        },

        onCountryChange() {
            // Placeholder para cargar provincias según país
        },

        geocodeAddress() {
            const address = document.getElementById('wf-address')?.value;
            const city = document.getElementById('wf-city')?.value;
            const country = document.getElementById('wf-country')?.value;

            if (!address) {
                alert('Por favor ingrese una dirección primero');
                return;
            }

            // Aquí iría la lógica de geocoding (integración con Google Maps o similar)
            alert('Función de geocoding pendiente de implementar');
        },

        showMap() {
            const lat = document.getElementById('wf-latitude')?.value;
            const lng = document.getElementById('wf-longitude')?.value;

            if (!lat || !lng) {
                alert('Por favor ingrese coordenadas primero');
                return;
            }

            window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
        },

        showBranchModal(branch = null) {
            showBranchModal(branch);
        },

        closeBranchModal() {
            closeBranchModal();
        },

        async saveBranch(branchId) {
            const branchData = {
                id: branchId,
                name: document.getElementById('wf-branchName')?.value?.trim(),
                address: document.getElementById('wf-branchAddress')?.value?.trim(),
                country: document.getElementById('wf-branchCountry')?.value,
                province: document.getElementById('wf-branchProvince')?.value?.trim(),
                city: document.getElementById('wf-branchCity')?.value?.trim(),
                postal_code: document.getElementById('wf-branchPostalCode')?.value?.trim(),
                phone: document.getElementById('wf-branchPhone')?.value?.trim(),
                email: document.getElementById('wf-branchEmail')?.value?.trim(),
                latitude: parseFloat(document.getElementById('wf-branchLat')?.value) || null,
                longitude: parseFloat(document.getElementById('wf-branchLng')?.value) || null,
                is_main: document.getElementById('wf-branchMain')?.checked || false
            };

            // Validar campos obligatorios de sucursal
            const missingFields = [];
            if (!branchData.name) missingFields.push('Nombre de la Sucursal');
            if (!branchData.address) missingFields.push('Dirección');
            if (!branchData.country) missingFields.push('País');
            if (!branchData.city) missingFields.push('Ciudad');

            if (missingFields.length > 0) {
                alert(`❌ Campos obligatorios faltantes:\n\n• ${missingFields.join('\n• ')}`);
                return;
            }

            if (workflowState.isEditing && workflowState.currentCompany) {
                try {
                    const companyId = workflowState.currentCompany.company_id || workflowState.currentCompany.id;
                    await WorkflowAPI.saveBranch(companyId, branchData);
                    workflowState.branches = await WorkflowAPI.getCompanyBranches(companyId);
                    closeBranchModal();

                    // Re-renderizar tab de sucursales
                    const tabContent = document.getElementById('wf-tab-sucursales');
                    if (tabContent) {
                        tabContent.outerHTML = renderTabSucursales();
                    }
                } catch (error) {
                    alert('Error al guardar sucursal: ' + error.message);
                }
            } else {
                // Para nueva empresa, guardar en memoria
                if (branchId) {
                    const idx = workflowState.branches.findIndex(b => b.id === branchId);
                    if (idx >= 0) workflowState.branches[idx] = { ...branchData, id: branchId };
                } else {
                    workflowState.branches.push({ ...branchData, id: Date.now() });
                }
                closeBranchModal();

                const tabContent = document.getElementById('wf-tab-sucursales');
                if (tabContent) {
                    tabContent.outerHTML = renderTabSucursales();
                }
            }
        },

        editBranch(branchId) {
            const branch = workflowState.branches.find(b => b.id === branchId);
            if (branch) {
                showBranchModal(branch);
            }
        },

        async deleteBranch(branchId) {
            if (!confirm('¿Está seguro de eliminar esta sucursal?')) return;

            if (workflowState.isEditing && workflowState.currentCompany) {
                try {
                    await WorkflowAPI.deleteBranch(branchId);
                    const companyId = workflowState.currentCompany.company_id || workflowState.currentCompany.id;
                    workflowState.branches = await WorkflowAPI.getCompanyBranches(companyId);
                } catch (error) {
                    alert('Error al eliminar sucursal: ' + error.message);
                    return;
                }
            } else {
                workflowState.branches = workflowState.branches.filter(b => b.id !== branchId);
            }

            const tabContent = document.getElementById('wf-tab-sucursales');
            if (tabContent) {
                tabContent.outerHTML = renderTabSucursales();
            }
        },

        async refreshUsers() {
            if (workflowState.currentCompany) {
                const companyId = workflowState.currentCompany.company_id || workflowState.currentCompany.id;
                workflowState.users = await WorkflowAPI.getCompanyUsers(companyId);

                const tabContent = document.getElementById('wf-tab-usuarios');
                if (tabContent) {
                    tabContent.outerHTML = renderTabUsuarios();
                }
            }
        },

        async resetAdminPassword() {
            if (!workflowState.currentCompany) {
                alert('Error: No hay empresa seleccionada');
                return;
            }

            if (!confirm('¿Está seguro de resetear la contraseña del usuario admin a "admin123"?\n\nEsto es útil si el cliente olvidó su contraseña.')) {
                return;
            }

            const companyId = workflowState.currentCompany.company_id || workflowState.currentCompany.id;

            try {
                const res = await fetch(`${WorkflowAPI.baseUrl}/companies/${companyId}/reset-admin-password`, {
                    method: 'POST',
                    headers: WorkflowAPI.getHeaders()
                });

                if (!res.ok) throw new Error('Error al resetear contraseña');

                alert('✅ Contraseña del usuario admin reseteada a: admin123\n\nEl cliente deberá cambiarla en su próximo acceso.');
            } catch (error) {
                console.error('[WORKFLOW] Error:', error);
                alert('❌ Error al resetear contraseña: ' + error.message);
            }
        },

        async saveNewCompany() {
            const name = document.getElementById('wf-companyName')?.value?.trim();
            const email = document.getElementById('wf-email')?.value?.trim();
            const taxId = document.getElementById('wf-taxId')?.value?.trim();

            // Validación de campos obligatorios en Tab Datos
            const missingFields = [];
            if (!name) missingFields.push('Nombre Comercial');
            if (!email) missingFields.push('Email de Contacto');
            if (!taxId) missingFields.push('Identificación Fiscal');

            if (missingFields.length > 0) {
                alert(`❌ Campos obligatorios faltantes:\n\n• ${missingFields.join('\n• ')}\n\nComplete todos los campos marcados con * en la pestaña "Datos".`);
                this.switchTab('datos');
                return;
            }

            // Validar email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('❌ El email ingresado no tiene un formato válido');
                this.switchTab('datos');
                return;
            }

            // Validación de módulos
            if (workflowState.selectedModules.size === 0) {
                alert('❌ Debe seleccionar al menos un módulo comercial');
                this.switchTab('modulos');
                return;
            }

            // Validación de sucursales - OBLIGATORIO al menos una
            if (workflowState.branches.length === 0) {
                alert('❌ Debe agregar al menos una sucursal\n\nToda empresa requiere una ubicación física.\nSi es una sola sede, créela como "Central" o "Casa Matriz".');
                this.switchTab('sucursales');
                return;
            }

            // Validar que la sucursal tenga datos mínimos
            const mainBranch = workflowState.branches[0];
            const branchMissing = [];
            if (!mainBranch.name) branchMissing.push('Nombre');
            if (!mainBranch.address) branchMissing.push('Dirección');
            if (!mainBranch.country) branchMissing.push('País');
            if (!mainBranch.city) branchMissing.push('Ciudad');

            if (branchMissing.length > 0) {
                alert(`❌ La sucursal "${mainBranch.name || 'Sin nombre'}" tiene campos faltantes:\n\n• ${branchMissing.join('\n• ')}\n\nEdite la sucursal para completar los datos.`);
                this.switchTab('sucursales');
                return;
            }

            // Datos de empresa (ubicación va por sucursal, no por empresa)
            // NOTA: El estado del presupuesto es AUTOMÁTICO según el workflow:
            // Nueva empresa → PENDIENTE → (cliente aprueba) → APROBADO → (firma contrato) → VIGENTE
            const companyData = {
                name,
                legalName: document.getElementById('wf-legalName')?.value || '',
                taxId: taxId,
                contactEmail: email,
                contactPhone: document.getElementById('wf-phone')?.value || '',
                contactName: document.getElementById('wf-contactName')?.value || '',
                contactPosition: document.getElementById('wf-contactPosition')?.value || '',
                licenseType: document.getElementById('wf-licenseType')?.value || 'basic',
                maxEmployees: parseInt(document.getElementById('wf-maxEmployees')?.value) || 50,
                // Estado SIEMPRE es PENDIENTE al crear - NO es manual
                // El workflow automático lo cambia: PENDIENTE → APROBADO → VIGENTE → CADUCADO
                create_auto_users: true,  // El backend crea admin (admin123) + soporte oculto (admin123)
                // 🏢 SUCURSALES - Obligatorias para cada empresa
                branches: workflowState.branches.map(branch => ({
                    name: branch.name,
                    address: branch.address,
                    city: branch.city,
                    province: branch.province,
                    country: branch.country,
                    postal_code: branch.postal_code,
                    phone: branch.phone,
                    email: branch.email,
                    latitude: branch.latitude,
                    longitude: branch.longitude,
                    is_main: branch.is_main || false
                }))
            };

            try {
                const result = await WorkflowAPI.createCompanyWithBudget(
                    companyData,
                    workflowState.selectedModules,
                    workflowState.employeeCount
                );

                // Mostrar información completa del resultado
                const budgetInfo = result.budget
                    ? `\n📋 Presupuesto: ${result.budget.budget_code} (PENDIENTE)\n   Total: $${result.budget.total_monthly}/mes`
                    : '\n📋 Presupuesto: PENDIENTE';
                const branchesInfo = result.branches && result.branches.length > 0
                    ? `\n🏢 Sucursales: ${result.branches.map(b => b.name).join(', ')}`
                    : '';

                alert(`✅ Empresa "${name}" creada exitosamente!${budgetInfo}${branchesInfo}\n👤 Usuario admin: admin / admin123\n🔧 Usuario soporte: creado (oculto)\n\nEl cliente recibirá el presupuesto para su aprobación.`);
                closeModal();

                if (typeof VendorDashboard !== 'undefined') {
                    VendorDashboard.refresh();
                }
            } catch (error) {
                console.error('[WORKFLOW] Error:', error);
                alert('❌ Error al crear la empresa: ' + error.message);
            }
        },

        async saveEditCompany() {
            if (!workflowState.currentCompany) {
                alert('Error: No hay empresa seleccionada');
                return;
            }

            if (workflowState.selectedModules.size === 0) {
                alert('Debe seleccionar al menos un módulo');
                this.switchTab('modulos');
                return;
            }

            const companyId = workflowState.currentCompany.company_id || workflowState.currentCompany.id;

            try {
                // Actualizar datos de la empresa (ubicación va por sucursal)
                const companyData = {
                    name: document.getElementById('wf-companyName')?.value,
                    legal_name: document.getElementById('wf-legalName')?.value || '',
                    tax_id: document.getElementById('wf-taxId')?.value,
                    contact_email: document.getElementById('wf-email')?.value,
                    contact_phone: document.getElementById('wf-phone')?.value || '',
                    contact_name: document.getElementById('wf-contactName')?.value || '',
                    contact_position: document.getElementById('wf-contactPosition')?.value || '',
                    license_type: document.getElementById('wf-licenseType')?.value || 'basic',
                    max_employees: parseInt(document.getElementById('wf-maxEmployees')?.value) || 50,
                    contracted_employees: workflowState.employeeCount
                };

                await WorkflowAPI.updateCompany(companyId, companyData);

                // Crear nuevo presupuesto
                const result = await WorkflowAPI.createBudget(
                    companyId,
                    workflowState.selectedModules,
                    workflowState.employeeCount
                );

                alert(`✅ Empresa actualizada y nuevo presupuesto generado para "${workflowState.currentCompany.name}"!\n\nEstado: PENDIENTE\nEl presupuesto anterior sigue VIGENTE hasta que el cliente apruebe y firme el nuevo contrato.`);
                closeModal();

                if (typeof VendorDashboard !== 'undefined') {
                    VendorDashboard.refresh();
                }
            } catch (error) {
                console.error('[WORKFLOW] Error:', error);
                alert('❌ Error al actualizar: ' + error.message);
            }
        },

        closeModal,

        injectStyles() {
            if (document.getElementById('wf-styles')) return;

            const style = document.createElement('style');
            style.id = 'wf-styles';
            style.textContent = `
                /* ========== MODAL OVERLAY ========== */
                .wf-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 20px;
                }

                .wf-modal {
                    background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    width: 100%;
                    max-width: 1400px;
                    max-height: 95vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8);
                }

                .wf-modal-small {
                    max-width: 600px;
                }

                .wf-modal-header {
                    padding: 20px 25px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(245, 158, 11, 0.1);
                    border-radius: 20px 20px 0 0;
                }

                .wf-modal-header h3 {
                    margin: 0;
                    font-size: 1.4rem;
                    color: #f59e0b;
                }

                .wf-modal-close {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 2rem;
                    cursor: pointer;
                    padding: 0 10px;
                    line-height: 1;
                    transition: all 0.2s;
                }

                .wf-modal-close:hover {
                    color: #ef4444;
                }

                .wf-modal-body {
                    flex: 1;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .wf-modal-footer {
                    padding: 15px 25px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    justify-content: flex-end;
                    gap: 15px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 0 0 20px 20px;
                }

                /* ========== TABS NAVIGATION ========== */
                .wf-tabs-nav {
                    display: flex;
                    gap: 5px;
                    padding: 15px 25px;
                    background: rgba(0, 0, 0, 0.3);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .wf-tab-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 20px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    color: rgba(255, 255, 255, 0.6);
                    cursor: pointer;
                    transition: all 0.3s;
                    font-size: 0.95rem;
                }

                .wf-tab-btn:hover {
                    background: rgba(245, 158, 11, 0.1);
                    border-color: rgba(245, 158, 11, 0.3);
                    color: #f59e0b;
                }

                .wf-tab-btn.active {
                    background: rgba(245, 158, 11, 0.2);
                    border-color: #f59e0b;
                    color: #f59e0b;
                }

                .wf-tab-icon {
                    font-size: 1.2rem;
                }

                .wf-tabs-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 25px;
                }

                .wf-tab-content {
                    display: none;
                }

                .wf-tab-content.active {
                    display: block;
                }

                /* ========== SECTIONS ========== */
                .wf-section {
                    margin-bottom: 25px;
                    padding: 20px;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 15px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .wf-section h4 {
                    color: #f59e0b;
                    margin: 0 0 20px;
                    font-size: 1.1rem;
                    padding-bottom: 10px;
                    border-bottom: 1px solid rgba(245, 158, 11, 0.2);
                }

                .wf-section h5 {
                    color: rgba(255, 255, 255, 0.8);
                    margin: 0 0 15px;
                    font-size: 1rem;
                }

                .wf-section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .wf-section-header h4 {
                    margin: 0;
                    border: none;
                    padding: 0;
                }

                /* ========== FORM FIELDS ========== */
                .wf-fields-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                }

                .wf-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .wf-field.full {
                    grid-column: 1 / -1;
                }

                .wf-field label {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.85rem;
                    font-weight: 500;
                }

                .wf-field input,
                .wf-field select {
                    background: rgba(15, 15, 30, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 8px;
                    color: #e0e0e0;
                    padding: 10px 12px;
                    font-size: 0.95rem;
                    transition: all 0.2s;
                }

                .wf-field input:focus,
                .wf-field select:focus {
                    outline: none;
                    border-color: #f59e0b;
                    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
                }

                .wf-field input::placeholder {
                    color: rgba(255, 255, 255, 0.3);
                }

                .wf-geo-buttons {
                    display: flex;
                    gap: 10px;
                    margin-top: 5px;
                }

                .wf-checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    color: rgba(255, 255, 255, 0.8);
                }

                .wf-checkbox-label input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }

                /* ========== MODULES TAB LAYOUT ========== */
                .wf-modules-layout {
                    display: grid;
                    grid-template-columns: 1fr 350px;
                    gap: 25px;
                    height: calc(95vh - 250px);
                    min-height: 500px;
                }

                @media (max-width: 1000px) {
                    .wf-modules-layout {
                        grid-template-columns: 1fr;
                    }
                    .wf-pricing-panel {
                        position: relative !important;
                    }
                }

                .wf-modules-selector {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .wf-modules-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    flex-wrap: wrap;
                    gap: 10px;
                }

                .wf-modules-header h4 {
                    margin: 0;
                    color: #f59e0b;
                }

                .wf-modules-filters {
                    display: flex;
                    gap: 5px;
                }

                .wf-filter-btn {
                    padding: 6px 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    color: rgba(255, 255, 255, 0.6);
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s;
                }

                .wf-filter-btn:hover {
                    background: rgba(245, 158, 11, 0.1);
                }

                .wf-filter-btn.active {
                    background: rgba(245, 158, 11, 0.2);
                    border-color: #f59e0b;
                    color: #f59e0b;
                }

                .wf-modules-scroll {
                    flex: 1;
                    overflow-y: auto;
                    padding-right: 10px;
                }

                .wf-no-modules {
                    color: rgba(255, 255, 255, 0.5);
                    text-align: center;
                    padding: 40px;
                }

                /* ========== MODULE CARDS ========== */
                .wf-category {
                    margin-bottom: 20px;
                }

                .wf-category-title {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 0.9rem;
                    margin-bottom: 10px;
                    padding-left: 5px;
                }

                .wf-modules-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: 10px;
                }

                .wf-module-card {
                    background: rgba(15, 15, 30, 0.6);
                    border: 2px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    padding: 12px 15px;
                    cursor: pointer;
                    transition: all 0.3s;
                    position: relative;
                }

                .wf-module-card:hover {
                    border-color: rgba(245, 158, 11, 0.4);
                    background: rgba(245, 158, 11, 0.05);
                }

                .wf-module-card.selected {
                    border-color: #22c55e;
                    background: rgba(34, 197, 94, 0.1);
                }

                .wf-module-card.is-core {
                    border-color: rgba(139, 92, 246, 0.4);
                    background: rgba(139, 92, 246, 0.08);
                }

                .wf-module-card.is-core.selected {
                    border-color: #8b5cf6;
                    background: rgba(139, 92, 246, 0.15);
                }

                .wf-module-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 5px;
                }

                .wf-module-icon {
                    font-size: 1.2rem;
                }

                .wf-module-name {
                    font-weight: 600;
                    color: #fff;
                    font-size: 0.85rem;
                    flex: 1;
                }

                .wf-badge {
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 0.6rem;
                    font-weight: 700;
                    text-transform: uppercase;
                }

                .wf-badge.core {
                    background: rgba(139, 92, 246, 0.3);
                    color: #a78bfa;
                }

                .wf-badge.main {
                    background: rgba(245, 158, 11, 0.3);
                    color: #f59e0b;
                }

                .wf-module-desc {
                    color: rgba(255, 255, 255, 0.4);
                    font-size: 0.7rem;
                    line-height: 1.3;
                    margin-bottom: 8px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .wf-module-price {
                    color: #22c55e;
                    font-weight: 600;
                    font-size: 0.8rem;
                }

                .wf-module-check {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: #22c55e;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: bold;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .wf-module-card.selected .wf-module-check {
                    opacity: 1;
                }

                /* ========== PRICING PANEL ========== */
                .wf-pricing-panel {
                    position: sticky;
                    top: 0;
                    height: fit-content;
                }

                .wf-pricing {
                    background: rgba(34, 197, 94, 0.05);
                    border: 1px solid rgba(34, 197, 94, 0.2);
                    border-radius: 15px;
                    padding: 20px;
                }

                .wf-pricing h4 {
                    color: #22c55e;
                    margin: 0 0 20px;
                    font-size: 1.2rem;
                }

                .wf-tier-badge {
                    padding: 10px 15px;
                    border-radius: 10px;
                    border: 1px solid;
                    margin-bottom: 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .wf-discount-badge {
                    background: #22c55e;
                    color: white;
                    padding: 3px 10px;
                    border-radius: 15px;
                    font-size: 0.8rem;
                    font-weight: 700;
                }

                .wf-employee-input {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 15px;
                    padding: 10px;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 8px;
                }

                .wf-employee-input label {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.9rem;
                }

                .wf-employee-input input {
                    flex: 1;
                    background: rgba(15, 15, 30, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 6px;
                    color: #e0e0e0;
                    padding: 8px 10px;
                    font-size: 0.9rem;
                    max-width: 100px;
                }

                .wf-pricing-lines {
                    margin-bottom: 20px;
                }

                .wf-pricing-line {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.9rem;
                }

                .wf-pricing-line.discount {
                    color: #22c55e;
                }

                .wf-pricing-total {
                    display: flex;
                    justify-content: space-between;
                    padding-top: 15px;
                    margin-top: 10px;
                    border-top: 2px solid rgba(34, 197, 94, 0.3);
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #22c55e;
                }

                .wf-selected-modules h5 {
                    color: rgba(255, 255, 255, 0.6);
                    margin: 0 0 10px;
                    font-size: 0.85rem;
                }

                .wf-selected-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    max-height: 150px;
                    overflow-y: auto;
                }

                .wf-selected-tag {
                    background: rgba(34, 197, 94, 0.2);
                    color: #22c55e;
                    padding: 4px 10px;
                    border-radius: 15px;
                    font-size: 0.7rem;
                }

                .wf-no-selection {
                    color: rgba(255, 255, 255, 0.4);
                    font-size: 0.85rem;
                }

                /* ========== BRANCHES ========== */
                .wf-branches-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 15px;
                }

                .wf-branch-card {
                    background: rgba(139, 92, 246, 0.05);
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    border-radius: 12px;
                    padding: 15px;
                }

                .wf-branch-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                }

                .wf-branch-icon {
                    font-size: 1.5rem;
                }

                .wf-branch-name {
                    font-weight: 600;
                    color: #fff;
                    flex: 1;
                }

                .wf-branch-info {
                    margin-bottom: 15px;
                }

                .wf-branch-info p {
                    margin: 5px 0;
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 0.85rem;
                }

                .wf-branch-actions {
                    display: flex;
                    gap: 10px;
                }

                /* ========== USERS ========== */
                .wf-users-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 15px;
                }

                .wf-user-card {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    background: rgba(59, 130, 246, 0.05);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    border-radius: 12px;
                    padding: 15px;
                }

                .wf-user-avatar {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.3rem;
                    font-weight: 700;
                    color: white;
                }

                .wf-user-info {
                    flex: 1;
                }

                .wf-user-name {
                    font-weight: 600;
                    color: #fff;
                    margin-bottom: 3px;
                }

                .wf-user-email {
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 0.85rem;
                }

                .wf-user-role {
                    color: #3b82f6;
                    font-size: 0.8rem;
                    margin-top: 3px;
                }

                .wf-user-status {
                    font-size: 0.75rem;
                    padding: 4px 10px;
                    border-radius: 10px;
                }

                .wf-user-status.active {
                    background: rgba(34, 197, 94, 0.2);
                    color: #22c55e;
                }

                .wf-user-status.inactive {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                }

                /* ========== EMPTY STATE ========== */
                .wf-empty-state {
                    text-align: center;
                    padding: 40px;
                    color: rgba(255, 255, 255, 0.5);
                }

                .wf-empty-icon {
                    font-size: 3rem;
                    margin-bottom: 15px;
                }

                .wf-empty-state h5 {
                    color: rgba(255, 255, 255, 0.7);
                    margin-bottom: 10px;
                }

                /* ========== INFO BOX ========== */
                .wf-info-box {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 10px;
                    padding: 15px;
                    color: rgba(255, 255, 255, 0.8);
                    font-size: 0.9rem;
                }

                .wf-info-box strong {
                    color: #3b82f6;
                }

                /* ========== BUTTONS ========== */
                .wf-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.9rem;
                }

                .wf-btn-primary {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                }

                .wf-btn-primary:hover {
                    background: linear-gradient(135deg, #d97706, #b45309);
                    transform: translateY(-2px);
                }

                .wf-btn-secondary {
                    background: rgba(107, 114, 128, 0.3);
                    color: rgba(255, 255, 255, 0.8);
                }

                .wf-btn-secondary:hover {
                    background: rgba(107, 114, 128, 0.5);
                }

                .wf-btn-small {
                    padding: 6px 12px;
                    font-size: 0.8rem;
                }

                .wf-btn-outline {
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: rgba(255, 255, 255, 0.7);
                }

                .wf-btn-outline:hover {
                    border-color: #f59e0b;
                    color: #f59e0b;
                }

                .wf-btn-danger {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                }

                .wf-btn-danger:hover {
                    background: rgba(239, 68, 68, 0.3);
                }

                /* ========== SECTION NOTES ========== */
                .wf-section-note {
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 0.85rem;
                    margin: -10px 0 15px;
                }

                .wf-field-help {
                    color: rgba(255, 255, 255, 0.4);
                    font-size: 0.75rem;
                    margin-top: 4px;
                }

                /* ========== STATUS BADGE (Automático) ========== */
                .wf-status-badge {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    padding: 12px 15px;
                    border-radius: 10px;
                    background: rgba(245, 158, 11, 0.1);
                    border: 1px solid rgba(245, 158, 11, 0.3);
                }

                .wf-status-badge.new {
                    background: rgba(59, 130, 246, 0.1);
                    border-color: rgba(59, 130, 246, 0.3);
                }

                .wf-status-badge.editing {
                    background: rgba(139, 92, 246, 0.1);
                    border-color: rgba(139, 92, 246, 0.3);
                }

                .wf-status-badge .wf-status-icon {
                    font-size: 1.5rem;
                }

                .wf-status-badge .wf-status-text {
                    font-weight: 700;
                    color: #f59e0b;
                    font-size: 1rem;
                }

                .wf-status-badge.new .wf-status-text {
                    color: #3b82f6;
                }

                .wf-status-badge.editing .wf-status-text {
                    color: #8b5cf6;
                }

                .wf-status-badge .wf-status-note {
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 0.75rem;
                    font-style: italic;
                }

                /* ========== WORKFLOW VISUAL ========== */
                .wf-workflow-info {
                    background: rgba(139, 92, 246, 0.05);
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    border-radius: 12px;
                    padding: 15px;
                }

                .wf-workflow-info h5 {
                    color: #8b5cf6;
                    margin: 0 0 15px;
                    font-size: 0.95rem;
                }

                .wf-workflow-steps {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 10px;
                }

                .wf-workflow-step {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 5px;
                    padding: 10px 15px;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 10px;
                    min-width: 80px;
                }

                .wf-step-icon {
                    font-size: 1.5rem;
                }

                .wf-step-label {
                    font-weight: 700;
                    color: #fff;
                    font-size: 0.75rem;
                }

                .wf-step-desc {
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 0.65rem;
                }

                .wf-workflow-arrow {
                    color: rgba(255, 255, 255, 0.3);
                    font-size: 1.2rem;
                }

                @media (max-width: 600px) {
                    .wf-workflow-steps {
                        flex-direction: column;
                    }
                    .wf-workflow-arrow {
                        transform: rotate(90deg);
                    }
                }

                /* ========== INFO BOX VARIANTS ========== */
                .wf-info-box.wf-info-success {
                    background: rgba(34, 197, 94, 0.1);
                    border-color: rgba(34, 197, 94, 0.3);
                }

                .wf-info-box.wf-info-success strong {
                    color: #22c55e;
                }

                .wf-info-box.wf-info-warning {
                    background: rgba(245, 158, 11, 0.1);
                    border-color: rgba(245, 158, 11, 0.3);
                }

                .wf-info-box.wf-info-warning strong {
                    color: #f59e0b;
                }

                /* ========== REQUIRED BADGE ========== */
                .wf-required-badge {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                    padding: 3px 10px;
                    border-radius: 10px;
                    font-size: 0.65rem;
                    font-weight: 700;
                    margin-left: 10px;
                    vertical-align: middle;
                }

                /* ========== EMPTY STATE WARNING ========== */
                .wf-empty-state.wf-empty-warning {
                    background: rgba(245, 158, 11, 0.05);
                    border: 1px dashed rgba(245, 158, 11, 0.3);
                    border-radius: 12px;
                    padding: 30px;
                }

                .wf-empty-state.wf-empty-warning .wf-empty-icon {
                    color: #f59e0b;
                }

                .wf-empty-state.wf-empty-warning h5 {
                    color: #f59e0b;
                }

                .wf-info-box code {
                    background: rgba(0, 0, 0, 0.3);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-family: monospace;
                    color: #f59e0b;
                }

                /* ========== AUTO USERS GRID ========== */
                .wf-auto-users-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    margin-top: 20px;
                }

                .wf-auto-user-card {
                    background: rgba(34, 197, 94, 0.05);
                    border: 1px solid rgba(34, 197, 94, 0.2);
                    border-radius: 12px;
                    padding: 20px;
                    position: relative;
                    display: flex;
                    gap: 15px;
                }

                .wf-auto-user-card.wf-auto-user-hidden {
                    background: rgba(107, 114, 128, 0.1);
                    border-color: rgba(107, 114, 128, 0.3);
                }

                .wf-auto-user-icon {
                    font-size: 2.5rem;
                }

                .wf-auto-user-info {
                    flex: 1;
                }

                .wf-auto-user-title {
                    font-weight: 600;
                    color: #fff;
                    margin-bottom: 10px;
                    font-size: 1rem;
                }

                .wf-auto-user-detail {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 5px;
                    font-size: 0.9rem;
                }

                .wf-auto-user-detail .wf-label {
                    color: rgba(255, 255, 255, 0.5);
                }

                .wf-auto-user-detail .wf-value {
                    color: #22c55e;
                    font-family: monospace;
                    background: rgba(0, 0, 0, 0.2);
                    padding: 2px 8px;
                    border-radius: 4px;
                }

                .wf-auto-user-detail .wf-value.wf-hidden-value {
                    color: rgba(255, 255, 255, 0.3);
                }

                .wf-auto-user-note {
                    font-size: 0.8rem;
                    color: rgba(255, 255, 255, 0.5);
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .wf-auto-user-badge {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    padding: 4px 10px;
                    border-radius: 10px;
                    font-size: 0.7rem;
                    font-weight: 700;
                }

                .wf-auto-user-badge.admin {
                    background: rgba(34, 197, 94, 0.2);
                    color: #22c55e;
                }

                .wf-auto-user-badge.soporte {
                    background: rgba(107, 114, 128, 0.3);
                    color: rgba(255, 255, 255, 0.5);
                }

                /* ========== SCROLLBAR ========== */
                .wf-modules-scroll::-webkit-scrollbar,
                .wf-tabs-content::-webkit-scrollbar,
                .wf-selected-list::-webkit-scrollbar {
                    width: 8px;
                }

                .wf-modules-scroll::-webkit-scrollbar-track,
                .wf-tabs-content::-webkit-scrollbar-track,
                .wf-selected-list::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                }

                .wf-modules-scroll::-webkit-scrollbar-thumb,
                .wf-tabs-content::-webkit-scrollbar-thumb,
                .wf-selected-list::-webkit-scrollbar-thumb {
                    background: rgba(245, 158, 11, 0.3);
                    border-radius: 4px;
                }

                .wf-modules-scroll::-webkit-scrollbar-thumb:hover,
                .wf-tabs-content::-webkit-scrollbar-thumb:hover,
                .wf-selected-list::-webkit-scrollbar-thumb:hover {
                    background: rgba(245, 158, 11, 0.5);
                }
            `;

            document.head.appendChild(style);
        }
    };

    // Exportar
    window.CompanyWorkflow = CompanyWorkflow;

    console.log('[COMPANY-WORKFLOW] Módulo v2.0 con TABS cargado');
})();
