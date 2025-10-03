console.log('📋 [LICENSING] Módulo de administración de licencias cargado');

let licensingData = {
    companies: [],
    modules: [],
    selectedCompany: null,
    currentView: 'companies'
};

async function showLicensingManagementContent() {
    console.log('📋 [LICENSING] Mostrando contenido de administración de licencias');
    
    const container = document.getElementById('mainContent');
    if (!container) return;

    // Show loading first
    container.innerHTML = `
        <div class="licensing-content" style="padding: 20px; max-width: 1200px; margin: 0 auto;">
            <h2>🏢 Administración de Licencias</h2>
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner"></div>
                <p>Cargando sistema de licencias...</p>
            </div>
        </div>
        <style>
        .loading-spinner {
            display: inline-block;
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #0066CC;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        </style>
    `;

    try {
        await loadLicensingData();
        renderLicensingInterface();
    } catch (error) {
        console.error('❌ [LICENSING] Error:', error);
        showLicensingError(error.message);
    }
}

async function loadLicensingData() {
    console.log('📊 [LICENSING] Cargando datos de licencias...');
    
    const apiUrl = window.getApiUrl ? window.getApiUrl('/api/v1/licensing') : '/api/v1/licensing';
    
    // Load companies and modules in parallel
    const [companiesRes, modulesRes] = await Promise.all([
        fetch(`${apiUrl}/companies`),
        fetch(`${apiUrl}/modules`)
    ]);

    if (!companiesRes.ok) throw new Error('Error loading companies');
    if (!modulesRes.ok) throw new Error('Error loading modules');

    const companiesData = await companiesRes.json();
    const modulesData = await modulesRes.json();

    licensingData.companies = companiesData.companies || [];
    licensingData.modules = modulesData.modules || [];

    console.log(`✅ [LICENSING] Datos cargados: ${licensingData.companies.length} empresas, ${licensingData.modules.length} módulos`);
}

function renderLicensingInterface() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    container.innerHTML = `
        <div class="licensing-content" style="padding: 20px; max-width: 1400px; margin: 0 auto;">
            <div class="licensing-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e0e7ff;">
                <div>
                    <h2 style="color: #0066CC; margin: 0; font-size: 2em;">🏢 Administración de Licencias</h2>
                    <p style="color: #666; margin: 5px 0 0 0;">Gestionar empresas licenciadas y sus módulos contratados</p>
                </div>
                <button onclick="showAddCompanyModal()" 
                        style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 12px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
                    ➕ Nueva Empresa
                </button>
            </div>

            <div class="licensing-tabs" style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="licensing-tab ${licensingData.currentView === 'companies' ? 'active' : ''}" 
                        onclick="switchLicensingView('companies')"
                        style="padding: 10px 20px; border: 2px solid #0066CC; background: ${licensingData.currentView === 'companies' ? '#0066CC' : 'white'}; color: ${licensingData.currentView === 'companies' ? 'white' : '#0066CC'}; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    🏢 Empresas (${licensingData.companies.length})
                </button>
                <button class="licensing-tab ${licensingData.currentView === 'modules' ? 'active' : ''}" 
                        onclick="switchLicensingView('modules')"
                        style="padding: 10px 20px; border: 2px solid #0066CC; background: ${licensingData.currentView === 'modules' ? '#0066CC' : 'white'}; color: ${licensingData.currentView === 'modules' ? 'white' : '#0066CC'}; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    📦 Módulos Sistema (${licensingData.modules.length})
                </button>
                <button class="licensing-tab ${licensingData.currentView === 'billing' ? 'active' : ''}" 
                        onclick="switchLicensingView('billing')"
                        style="padding: 10px 20px; border: 2px solid #0066CC; background: ${licensingData.currentView === 'billing' ? '#0066CC' : 'white'}; color: ${licensingData.currentView === 'billing' ? 'white' : '#0066CC'}; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    💰 Facturación
                </button>
            </div>

            <div id="licensingViewContent">
                ${renderCurrentView()}
            </div>
        </div>

        <!-- Modal para agregar empresa -->
        <div id="addCompanyModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
            <div class="modal-content" style="position: relative; margin: 5% auto; width: 90%; max-width: 800px; background: white; border-radius: 12px; max-height: 85vh; overflow-y: auto;">
                <div class="modal-header" style="padding: 20px 30px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #0066CC;">➕ Agregar Nueva Empresa</h3>
                    <button onclick="closeAddCompanyModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    <form id="addCompanyForm">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Nombre de la Empresa *</label>
                                <input type="text" id="companyName" required style="width: 100%; padding: 12px; border: 2px solid #e0e7ff; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Slug (Identificador) *</label>
                                <input type="text" id="companySlug" required style="width: 100%; padding: 12px; border: 2px solid #e0e7ff; border-radius: 6px;">
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Email de Contacto *</label>
                                <input type="email" id="contactEmail" required style="width: 100%; padding: 12px; border: 2px solid #e0e7ff; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Teléfono</label>
                                <input type="text" id="contactPhone" style="width: 100%; padding: 12px; border: 2px solid #e0e7ff; border-radius: 6px;">
                            </div>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600;">Dirección de Facturación</label>
                            <textarea id="billingAddress" rows="3" style="width: 100%; padding: 12px; border: 2px solid #e0e7ff; border-radius: 6px; resize: vertical;"></textarea>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo de Licencia</label>
                                <select id="licenseType" style="width: 100%; padding: 12px; border: 2px solid #e0e7ff; border-radius: 6px;">
                                    <option value="standard">Estándar</option>
                                    <option value="premium">Premium</option>
                                    <option value="enterprise">Enterprise</option>
                                    <option value="custom">Personalizada</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Moneda de Facturación</label>
                                <select id="billingCurrency" style="width: 100%; padding: 12px; border: 2px solid #e0e7ff; border-radius: 6px;">
                                    <option value="ARS">Peso Argentino (ARS)</option>
                                    <option value="USD">Dólar Americano (USD)</option>
                                    <option value="EUR">Euro (EUR)</option>
                                </select>
                            </div>
                        </div>

                        <div style="margin-bottom: 30px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #0066CC;">🌍 Idioma Predeterminado de la Licencia</label>
                            <select id="defaultLanguage" style="width: 100%; padding: 12px; border: 2px solid #e0e7ff; border-radius: 6px; background: #f8faff;">
                                <option value="es">🇪🇸 Español</option>
                                <option value="en">🇺🇸 English</option>
                                <option value="pt">🇧🇷 Português</option>
                                <option value="de">🇩🇪 Deutsch</option>
                                <option value="it">🇮🇹 Italiano</option>
                                <option value="fr">🇫🇷 Français</option>
                            </select>
                            <div style="font-size: 0.8em; color: #666; margin-top: 5px;">Este será el idioma por defecto para todos los usuarios de esta empresa. Los usuarios podrán cambiarlo individualmente.</div>
                        </div>

                        <div style="margin-bottom: 30px;">
                            <h4 style="margin-bottom: 15px; color: #0066CC;">📦 Módulos Contratados</h4>
                            <div id="moduleSelection" style="max-height: 300px; overflow-y: auto; border: 2px solid #e0e7ff; border-radius: 6px; padding: 15px;">
                                ${renderModuleSelection()}
                            </div>
                        </div>

                        <div style="display: flex; gap: 15px; justify-content: flex-end;">
                            <button type="button" onclick="closeAddCompanyModal()" 
                                    style="padding: 12px 25px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                Cancelar
                            </button>
                            <button type="submit" 
                                    style="padding: 12px 25px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                                💾 Crear Empresa
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <style>
        .company-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
            border: 1px solid #e0e7ff;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,102,204,0.1);
            transition: all 0.3s ease;
        }
        .company-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0,102,204,0.15);
        }
        .module-category {
            background: #f1f5f9;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .module-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            margin: 5px 0;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        .modal {
            animation: fadeIn 0.3s ease;
        }
        .modal-content {
            animation: slideIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        </style>
    `;

    // Setup form auto-slug generation
    setupCompanySlugGeneration();
}

function renderCurrentView() {
    switch (licensingData.currentView) {
        case 'companies':
            return renderCompaniesView();
        case 'modules':
            return renderModulesView();
        case 'billing':
            return renderBillingView();
        default:
            return '<p>Vista no encontrada</p>';
    }
}

function renderCompaniesView() {
    if (licensingData.companies.length === 0) {
        return `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, #f8faff 0%, #e0f2fe 100%); border-radius: 12px; border: 2px dashed #0066CC;">
                <div style="font-size: 4em; margin-bottom: 20px;">🏢</div>
                <h3 style="color: #0066CC; margin-bottom: 15px;">No hay empresas registradas</h3>
                <p style="color: #666; margin-bottom: 25px;">Comience agregando la primera empresa licenciada al sistema</p>
                <button onclick="showAddCompanyModal()" 
                        style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 15px 25px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1.1em;">
                    ➕ Agregar Primera Empresa
                </button>
            </div>
        `;
    }

    return `
        <div class="companies-grid">
            ${licensingData.companies.map(company => `
                <div class="company-card">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <div>
                            <h3 style="margin: 0 0 5px 0; color: #0066CC; font-size: 1.3em;">${company.company_name}</h3>
                            <div style="color: #666; font-size: 0.9em;">🔗 ${company.company_slug}</div>
                        </div>
                        <div style="text-align: right;">
                            <div class="license-badge" style="background: ${getLicenseTypeColor(company.license_type)}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8em; font-weight: 600; margin-bottom: 5px;">
                                ${company.license_type?.toUpperCase() || 'STANDARD'}
                            </div>
                            <div style="font-size: 0.8em; color: #666;">
                                ${company.billing_currency} ${formatCurrency(getCostForCurrency(company, company.billing_currency))}/mes
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <div style="display: grid; grid-template-columns: auto auto; gap: 15px; font-size: 0.9em;">
                            <div><strong>📧</strong> ${company.contact_email}</div>
                            <div><strong>📞</strong> ${company.contact_phone || 'No especificado'}</div>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 15px; font-size: 0.9em;">
                            <div><strong>📦 Módulos:</strong> ${company.active_modules || 0}</div>
                            <div><strong>📅 Desde:</strong> ${formatDate(company.created_at)}</div>
                            <div class="status-badge" style="background: ${company.is_active ? '#10B981' : '#ef4444'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">
                                ${company.is_active ? '✅ Activa' : '❌ Inactiva'}
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button onclick="editCompany(${company.company_id})" 
                                style="background: #3b82f6; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; font-size: 0.9em;">
                            ✏️ Editar
                        </button>
                        <button onclick="manageCompanyModules(${company.company_id})" 
                                style="background: #8b5cf6; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; font-size: 0.9em;">
                            📦 Módulos
                        </button>
                        <button onclick="viewCompanyBilling(${company.company_id})" 
                                style="background: #10b981; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; font-size: 0.9em;">
                            💰 Facturación
                        </button>
                        <button onclick="toggleCompanyStatus(${company.company_id}, ${company.is_active})" 
                                style="background: ${company.is_active ? '#ef4444' : '#10b981'}; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; font-size: 0.9em;">
                            ${company.is_active ? '🚫 Desactivar' : '✅ Activar'}
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderModulesView() {
    // Group modules by category
    const modulesByCategory = licensingData.modules.reduce((acc, module) => {
        const category = module.category || 'General';
        if (!acc[category]) acc[category] = [];
        acc[category].push(module);
        return acc;
    }, {});

    return `
        <div class="modules-view">
            <div style="margin-bottom: 20px; text-align: center;">
                <h3 style="color: #0066CC;">📦 Módulos del Sistema (${licensingData.modules.length})</h3>
                <p style="color: #666;">Configuración de precios y disponibilidad de módulos</p>
            </div>
            
            ${Object.entries(modulesByCategory).map(([category, modules]) => `
                <div class="module-category">
                    <h4 style="margin: 0 0 15px 0; color: #0066CC; font-size: 1.2em;">
                        ${getCategoryIcon(category)} ${category} (${modules.length})
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 15px;">
                        ${modules.map(module => `
                            <div class="module-item">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: #333; margin-bottom: 5px;">${module.module_name}</div>
                                    <div style="font-size: 0.85em; color: #666; margin-bottom: 8px;">${module.description}</div>
                                    <div style="display: flex; gap: 15px; font-size: 0.85em;">
                                        <span><strong>ARS:</strong> $${formatNumber(module.price_ars)}</span>
                                        <span><strong>USD:</strong> $${formatNumber(module.price_usd)}</span>
                                        <span><strong>EUR:</strong> €${formatNumber(module.price_eur)}</span>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div class="status-badge" style="background: ${module.is_active ? '#10B981' : '#ef4444'}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; margin-bottom: 5px;">
                                        ${module.is_active ? 'Activo' : 'Inactivo'}
                                    </div>
                                    <div style="font-size: 0.75em; color: #666;">${module.module_key}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderBillingView() {
    const totalRevenue = {
        ARS: licensingData.companies.reduce((sum, c) => sum + (c.monthly_cost_ars || 0), 0),
        USD: licensingData.companies.reduce((sum, c) => sum + (c.monthly_cost_usd || 0), 0),
        EUR: licensingData.companies.reduce((sum, c) => sum + (c.monthly_cost_eur || 0), 0)
    };

    return `
        <div class="billing-view">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="metric-card" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 25px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 2.5em; margin-bottom: 10px;">💰</div>
                    <div style="font-size: 1.5em; font-weight: 600; margin-bottom: 5px;">ARS $${formatNumber(totalRevenue.ARS)}</div>
                    <div style="opacity: 0.9;">Ingresos Mensuales (Pesos)</div>
                </div>
                <div class="metric-card" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 25px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 2.5em; margin-bottom: 10px;">💵</div>
                    <div style="font-size: 1.5em; font-weight: 600; margin-bottom: 5px;">USD $${formatNumber(totalRevenue.USD)}</div>
                    <div style="opacity: 0.9;">Ingresos Mensuales (Dólares)</div>
                </div>
                <div class="metric-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 25px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 2.5em; margin-bottom: 10px;">💶</div>
                    <div style="font-size: 1.5em; font-weight: 600; margin-bottom: 5px;">EUR €${formatNumber(totalRevenue.EUR)}</div>
                    <div style="opacity: 0.9;">Ingresos Mensuales (Euros)</div>
                </div>
            </div>

            <div style="background: white; border-radius: 12px; padding: 25px; border: 1px solid #e0e7ff;">
                <h3 style="margin: 0 0 20px 0; color: #0066CC;">📊 Resumen por Empresa</h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8faff;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e7ff;">Empresa</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e0e7ff;">Módulos</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e0e7ff;">ARS</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e0e7ff;">USD</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e0e7ff;">EUR</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e0e7ff;">Moneda</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${licensingData.companies.map(company => `
                                <tr style="border-bottom: 1px solid #f0f0f0;">
                                    <td style="padding: 12px;">
                                        <div style="font-weight: 600;">${company.company_name}</div>
                                        <div style="font-size: 0.8em; color: #666;">${company.company_slug}</div>
                                    </td>
                                    <td style="padding: 12px; text-align: center;">${company.active_modules || 0}</td>
                                    <td style="padding: 12px; text-align: right;">$${formatNumber(company.monthly_cost_ars || 0)}</td>
                                    <td style="padding: 12px; text-align: right;">$${formatNumber(company.monthly_cost_usd || 0)}</td>
                                    <td style="padding: 12px; text-align: right;">€${formatNumber(company.monthly_cost_eur || 0)}</td>
                                    <td style="padding: 12px; text-align: center;">
                                        <span style="background: #e0e7ff; color: #0066CC; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; font-weight: 600;">
                                            ${company.billing_currency}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderModuleSelection() {
    const modulesByCategory = licensingData.modules.reduce((acc, module) => {
        const category = module.category || 'General';
        if (!acc[category]) acc[category] = [];
        acc[category].push(module);
        return acc;
    }, {});

    return Object.entries(modulesByCategory).map(([category, modules]) => `
        <div style="margin-bottom: 20px;">
            <h5 style="margin: 0 0 10px 0; color: #0066CC; font-size: 1em; font-weight: 600;">
                ${getCategoryIcon(category)} ${category}
            </h5>
            <div style="padding-left: 20px;">
                ${modules.map(module => `
                    <label style="display: flex; align-items: center; gap: 10px; padding: 8px 0; cursor: pointer;">
                        <input type="checkbox" name="selectedModules" value="${module.id}" style="transform: scale(1.1);">
                        <div style="flex: 1;">
                            <div style="font-weight: 500;">${module.module_name}</div>
                            <div style="font-size: 0.8em; color: #666; margin-top: 2px;">${module.description}</div>
                            <div style="font-size: 0.8em; color: #999; margin-top: 3px;">
                                ARS: $${formatNumber(module.price_ars)} | USD: $${formatNumber(module.price_usd)} | EUR: €${formatNumber(module.price_eur)}
                            </div>
                        </div>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Event handlers and utility functions
function switchLicensingView(view) {
    licensingData.currentView = view;
    
    const content = document.getElementById('licensingViewContent');
    if (content) {
        content.innerHTML = renderCurrentView();
    }
    
    // Update tab styles
    document.querySelectorAll('.licensing-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.onclick.toString().includes(view)) {
            tab.classList.add('active');
        }
    });
}

function showAddCompanyModal() {
    const modal = document.getElementById('addCompanyModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeAddCompanyModal() {
    const modal = document.getElementById('addCompanyModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        document.getElementById('addCompanyForm').reset();
    }
}

function setupCompanySlugGeneration() {
    const nameInput = document.getElementById('companyName');
    const slugInput = document.getElementById('companySlug');
    
    if (nameInput && slugInput) {
        nameInput.addEventListener('input', function() {
            const slug = this.value
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
            slugInput.value = slug;
        });
    }
}

// Handle form submission
document.addEventListener('submit', function(e) {
    if (e.target.id === 'addCompanyForm') {
        e.preventDefault();
        handleAddCompany();
    }
});

async function handleAddCompany() {
    const formData = new FormData(document.getElementById('addCompanyForm'));
    const selectedModules = Array.from(document.querySelectorAll('input[name="selectedModules"]:checked'))
        .map(cb => parseInt(cb.value));
    
    const companyData = {
        company_name: formData.get('companyName') || document.getElementById('companyName').value,
        company_slug: formData.get('companySlug') || document.getElementById('companySlug').value,
        contact_email: formData.get('contactEmail') || document.getElementById('contactEmail').value,
        contact_phone: formData.get('contactPhone') || document.getElementById('contactPhone').value,
        billing_address: formData.get('billingAddress') || document.getElementById('billingAddress').value,
        license_type: formData.get('licenseType') || document.getElementById('licenseType').value,
        billing_currency: formData.get('billingCurrency') || document.getElementById('billingCurrency').value,
        default_language: formData.get('defaultLanguage') || document.getElementById('defaultLanguage').value,
        selected_modules: selectedModules
    };

    console.log('📤 [LICENSING] Enviando datos de empresa:', companyData);

    try {
        const apiUrl = window.getApiUrl ? window.getApiUrl('/api/v1/licensing') : '/api/v1/licensing';
        const response = await fetch(`${apiUrl}/companies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(companyData)
        });

        const result = await response.json();

        if (result.success) {
            alert('✅ Empresa creada exitosamente');
            
            // Set license default language in translation system
            if (window.translator && companyData.default_language) {
                window.translator.setLicenseDefaultLanguage(companyData.default_language);
            }
            
            closeAddCompanyModal();
            await loadLicensingData();
            renderLicensingInterface();
        } else {
            throw new Error(result.error || 'Error creating company');
        }
    } catch (error) {
        console.error('❌ [LICENSING] Error creating company:', error);
        alert(`❌ Error: ${error.message}`);
    }
}

// Utility functions
function getLicenseTypeColor(type) {
    const colors = {
        'standard': '#6b7280',
        'premium': '#3b82f6',
        'enterprise': '#8b5cf6',
        'custom': '#10b981'
    };
    return colors[type] || colors.standard;
}

function getCostForCurrency(company, currency) {
    switch (currency) {
        case 'USD': return company.monthly_cost_usd || 0;
        case 'EUR': return company.monthly_cost_eur || 0;
        default: return company.monthly_cost_ars || 0;
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-AR').format(amount);
}

function formatNumber(number) {
    return new Intl.NumberFormat('es-AR').format(number);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-AR');
}

function getCategoryIcon(category) {
    const icons = {
        'Core': '🏛️',
        'RRHH': '👥',
        'Biometría': '👆',
        'Médico': '🏥',
        'Legal': '⚖️',
        'Finanzas': '💰',
        'Reporting': '📊',
        'Configuración': '⚙️',
        'General': '📋'
    };
    return icons[category] || '📦';
}

function showLicensingError(message) {
    const container = document.getElementById('mainContent');
    if (container) {
        container.innerHTML = `
            <div class="licensing-content" style="padding: 20px; max-width: 800px; margin: 0 auto;">
                <div style="background: #fee; border: 1px solid #fcc; border-radius: 8px; padding: 20px; text-align: center;">
                    <div style="font-size: 3em; margin-bottom: 15px;">❌</div>
                    <h3 style="color: #c53030; margin-bottom: 10px;">Error al cargar licencias</h3>
                    <p style="color: #666; margin-bottom: 20px;">${message}</p>
                    <button onclick="showLicensingManagementContent()" 
                            style="background: #0066CC; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                        🔄 Reintentar
                    </button>
                </div>
            </div>
        `;
    }
}

// Export main function for tab system
window.showLicensingManagementContent = showLicensingManagementContent;

console.log('✅ [LICENSING] Módulo de administración de licencias registrado');