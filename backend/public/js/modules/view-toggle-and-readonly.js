/**
 * VIEW TOGGLE & READ-ONLY COMPANY VIEWER
 *
 * - Toggle entre Grid Enterprise y Tabla Tradicional
 * - Viewer de empresa solo lectura para usuarios sin permisos de edición
 */

// Variable global para la vista actual
window.currentCompanyView = localStorage.getItem('companyViewMode') || 'grid'; // 'grid' o 'table'

/**
 * Toggle entre vista Grid y Tabla
 */
function toggleCompanyView() {
    const newView = window.currentCompanyView === 'grid' ? 'table' : 'grid';
    window.currentCompanyView = newView;
    localStorage.setItem('companyViewMode', newView);

    console.log('🔄 Cambiando vista a:', newView);

    // Re-renderizar con la nueva vista
    renderCompaniesWithCurrentView();

    // Actualizar botón toggle
    updateToggleButton();
}

/**
 * Renderiza empresas según la vista actual
 */
function renderCompaniesWithCurrentView() {
    const container = document.getElementById('companiesContainer');
    if (!container) return;

    if (window.currentCompanyView === 'grid') {
        // Vista enterprise grid
        if (typeof EnterpriseCompaniesGrid !== 'undefined') {
            EnterpriseCompaniesGrid.render(companies, container);
        }
    } else {
        // Vista tabla tradicional
        renderCompaniesTableTraditional(container);
    }
}

/**
 * Renderiza tabla tradicional
 */
function renderCompaniesTableTraditional(container) {
    if (companies.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #7f8c8d;">
                <div style="font-size: 3em; margin-bottom: 1rem;">🏢</div>
                <h3>No hay empresas registradas</h3>
                <p>Comienza creando tu primera empresa</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="companies-table" style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <thead style="background: #f8f9fa;">
                <tr>
                    <th style="padding: 12px; text-align: left; font-size: 0.85rem; font-weight: 600; color: #495057;">Empresa</th>
                    <th style="padding: 12px; text-align: left; font-size: 0.85rem; font-weight: 600; color: #495057;">CUIT</th>
                    <th style="padding: 12px; text-align: left; font-size: 0.85rem; font-weight: 600; color: #495057;">Estado</th>
                    <th style="padding: 12px; text-align: left; font-size: 0.85rem; font-weight: 600; color: #495057;">Empleados</th>
                    <th style="padding: 12px; text-align: left; font-size: 0.85rem; font-weight: 600; color: #495057;">Módulos</th>
                    <th style="padding: 12px; text-align: left; font-size: 0.85rem; font-weight: 600; color: #495057;">Total Mensual</th>
                    <th style="padding: 12px; text-align: left; font-size: 0.85rem; font-weight: 600; color: #495057;">Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    companies.forEach(company => {
        html += `
            <tr style="border-bottom: 1px solid #e9ecef;">
                <td style="padding: 12px;">
                    <div style="font-weight: 600; font-size: 0.9rem; color: #212529;">${company.name}</div>
                    <div style="font-size: 0.75rem; color: #6c757d;">${company.contactEmail || 'N/A'}</div>
                </td>
                <td style="padding: 12px; font-size: 0.85rem; color: #495057;">${company.taxId}</td>
                <td style="padding: 12px;">
                    <span style="padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: ${company.status === 'active' ? '#d4edda' : '#fff3cd'}; color: ${company.status === 'active' ? '#155724' : '#856404'};">
                        ${company.status === 'active' ? 'Activa' : 'Prueba'}
                    </span>
                </td>
                <td style="padding: 12px; font-size: 0.85rem; color: #495057;">${company.currentEmployees || 0} / ${company.contractedEmployees || company.maxEmployees || 1}</td>
                <td style="padding: 12px; font-size: 0.85rem; color: #495057;">
                    ${company.modulesSummary ? `${company.modulesSummary.contractedModules}/${company.modulesSummary.totalSystemModules}` : 'N/A'}
                </td>
                <td style="padding: 12px; font-weight: 600; font-size: 0.9rem; color: #28a745;">
                    $${Math.floor(company.pricing?.monthlyTotal || 0).toLocaleString('en-US')}
                </td>
                <td style="padding: 12px;">
                    <button onclick="viewCompanyDetails(${company.company_id || company.id})"
                            style="padding: 6px 12px; margin-right: 4px; border: none; border-radius: 4px; background: #17a2b8; color: white; cursor: pointer; font-size: 0.8rem;">
                        👁️ Ver
                    </button>
                    <button onclick="editCompany(${company.company_id || company.id})"
                            style="padding: 6px 12px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer; font-size: 0.8rem;">
                        ✏️ Editar
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

/**
 * Actualiza el botón toggle
 */
function updateToggleButton() {
    const btn = document.getElementById('viewToggleBtn');
    if (btn) {
        btn.innerHTML = window.currentCompanyView === 'grid'
            ? '📊 Vista Tabla'
            : '🎨 Vista Grid';
    }
}

/**
 * Ver detalles de empresa (SOLO LECTURA) - ENTERPRISE PROFESSIONAL COMPLETO
 * Carga: Sucursales, Notificaciones multi-tenant, Todos los datos
 */
async function viewCompanyDetails(companyId) {
    console.log('👁️ Abriendo vista COMPLETA de empresa:', companyId);

    const company = companies.find(c => (c.company_id || c.id) == companyId);
    if (!company) {
        alert('Empresa no encontrada');
        return;
    }

    // Mostrar loading mientras cargamos datos completos
    const loadingHtml = `
        <div id="viewCompanyModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px);">
            <div style="background: white; border-radius: 12px; padding: 40px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 16px;">⏳</div>
                <div style="font-size: 1.2rem; color: #2c3e50; font-weight: 600;">Cargando datos completos...</div>
                <div style="font-size: 0.9rem; color: #7f8c8d; margin-top: 8px;">Sucursales, notificaciones, todo el detalle</div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHtml);

    try {
        // Fetch paralelo de todos los datos
        const [branchesRes, notificationsRes] = await Promise.all([
            fetch(`/api/aponnt/dashboard/companies/${companyId}/branches`).catch(() => null),
            fetch(`/api/v1/enterprise/notifications?company_id=${companyId}&limit=50`).catch(() => null)
        ]);

        const branches = branchesRes && branchesRes.ok ? await branchesRes.json() : [];
        const notificationsData = notificationsRes && notificationsRes.ok ? await notificationsRes.json() : { notifications: [] };
        const notifications = notificationsData.notifications || [];

        console.log('📊 Datos cargados:', { branches: branches.length, notifications: notifications.length });

        // Cerrar loading
        document.getElementById('viewCompanyModal').remove();

        // Renderizar modal completo
        renderFullCompanyModal(company, branches, notifications);

    } catch (error) {
        console.error('❌ Error cargando datos completos:', error);
        document.getElementById('viewCompanyModal').remove();
        alert('Error al cargar datos completos de la empresa');
    }
}

/**
 * Renderizar modal completo con TODOS los datos
 */
function renderFullCompanyModal(company, branches, notifications) {
    const companyId = company.company_id || company.id;

    // Procesar módulos contratados
    const activeModules = company.active_modules || company.activeModules || [];
    const modulesData = company.modules_data || company.modulesData || {};
    const modulesPricing = company.modules_pricing || company.modulesPricing || {};

    // Construir lista de módulos activos con pricing
    let modulesListHtml = '';
    if (activeModules.length > 0) {
        modulesListHtml = activeModules.map(moduleKey => {
            const moduleInfo = modulesData[moduleKey] || {};
            const pricing = modulesPricing[moduleKey] || {};
            return `
                <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 12px; font-size: 0.85rem; color: #212529;">
                        <div style="font-weight: 600;">${moduleInfo.name || moduleKey}</div>
                        <div style="font-size: 0.75rem; color: #6c757d; margin-top: 2px;">${moduleInfo.category || 'N/A'}</div>
                    </td>
                    <td style="padding: 12px; text-align: center; font-size: 0.85rem; color: #212529;">
                        ${pricing.monthly_price ? '$' + pricing.monthly_price.toLocaleString('en-US') : 'Incluido'}
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <span style="display: inline-block; padding: 3px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 600; background: #d4edda; color: #155724;">
                            ✓ Activo
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    } else {
        modulesListHtml = `
            <tr>
                <td colspan="3" style="padding: 24px; text-align: center; color: #6c757d; font-size: 0.85rem;">
                    No hay módulos contratados
                </td>
            </tr>
        `;
    }

    // Crear modal de solo lectura profesional
    const modalHtml = `
        <div id="viewCompanyModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px);">
            <div style="background: white; border-radius: 12px; max-width: 1200px; width: 95%; max-height: 92vh; overflow-y: auto; box-shadow: 0 24px 80px rgba(0,0,0,0.4);">

                <!-- Header Professional -->
                <div style="background: #2c3e50; padding: 28px 32px; border-bottom: 3px solid #3498db;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; color: white; font-size: 1.6rem; font-weight: 600; letter-spacing: -0.3px;">
                                ${company.name}
                            </h2>
                            <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.7); font-size: 0.85rem; font-weight: 500;">
                                Vista de Solo Lectura • ${company.taxId}
                            </p>
                        </div>
                        <button onclick="closeViewCompanyModal()" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: white; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; font-size: 1.3rem; transition: all 0.2s;">
                            ×
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div style="padding: 32px;">

                    <!-- Métricas Principales - ESTILO PROFESIONAL -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 32px;">

                        <!-- Métrica 1: Empleados -->
                        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                            <div style="font-size: 0.7rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 12px;">
                                Empleados
                            </div>
                            <div style="font-size: 2.8rem; font-weight: 700; color: #2c3e50; line-height: 1; margin-bottom: 8px;">
                                ${company.currentEmployees || 0}
                            </div>
                            <div style="font-size: 0.8rem; color: #95a5a6; font-weight: 500;">
                                de ${company.contractedEmployees || company.maxEmployees || 1} contratados
                            </div>
                        </div>

                        <!-- Métrica 2: Módulos -->
                        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                            <div style="font-size: 0.7rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 12px;">
                                Módulos Activos
                            </div>
                            <div style="font-size: 2.8rem; font-weight: 700; color: #2c3e50; line-height: 1; margin-bottom: 8px;">
                                ${activeModules.length}
                            </div>
                            <div style="font-size: 0.8rem; color: #95a5a6; font-weight: 500;">
                                de ${company.modulesSummary ? company.modulesSummary.totalSystemModules : 57} disponibles
                            </div>
                        </div>

                        <!-- Métrica 3: Revenue Mensual -->
                        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                            <div style="font-size: 0.7rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 12px;">
                                Revenue Mensual
                            </div>
                            <div style="font-size: 2.4rem; font-weight: 700; color: #27ae60; line-height: 1; margin-bottom: 8px;">
                                $${Math.floor(company.pricing?.monthlyTotal || 0).toLocaleString('en-US')}
                            </div>
                            <div style="font-size: 0.8rem; color: #95a5a6; font-weight: 500;">
                                con IVA incluido
                            </div>
                        </div>

                        <!-- Métrica 4: Estado -->
                        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                            <div style="font-size: 0.7rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 12px;">
                                Estado
                            </div>
                            <div style="font-size: 1.4rem; font-weight: 700; margin: 16px 0;">
                                <span style="display: inline-block; padding: 8px 20px; border-radius: 8px; font-size: 0.9rem; background: ${company.status === 'active' ? '#d4edda' : '#fff3cd'}; color: ${company.status === 'active' ? '#155724' : '#856404'};">
                                    ${company.status === 'active' ? '✓ Activa' : '⏱ Prueba'}
                                </span>
                            </div>
                            <div style="font-size: 0.8rem; color: #95a5a6; font-weight: 500;">
                                ${company.licenseType || 'Licencia Básica'}
                            </div>
                        </div>

                    </div>

                    <!-- Información General COMPLETA -->
                    <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 20px 0; font-size: 1rem; color: #2c3e50; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #3498db; padding-bottom: 8px;">
                            📋 Información General Completa
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
                            <div>
                                <div style="font-size: 0.7rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; font-weight: 600;">Razón Social</div>
                                <div style="font-size: 0.85rem; font-weight: 600; color: #2c3e50;">${company.legalName || company.name}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.7rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; font-weight: 600;">Email</div>
                                <div style="font-size: 0.85rem; color: #34495e;">${company.contactEmail}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.7rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; font-weight: 600;">Teléfono</div>
                                <div style="font-size: 0.85rem; color: #34495e;">${company.contactPhone || 'N/A'}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.7rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; font-weight: 600;">Dirección</div>
                                <div style="font-size: 0.85rem; color: #34495e;">${company.address || 'N/A'}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.7rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; font-weight: 600;">Ciudad</div>
                                <div style="font-size: 0.85rem; color: #34495e;">${company.city || 'N/A'}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.7rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; font-weight: 600;">Provincia</div>
                                <div style="font-size: 0.85rem; color: #34495e;">${company.province || 'N/A'}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.7rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; font-weight: 600;">País</div>
                                <div style="font-size: 0.85rem; color: #34495e;">${company.country || 'N/A'}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.7rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; font-weight: 600;">Código Postal</div>
                                <div style="font-size: 0.85rem; color: #34495e;">${company.postalCode || company.postal_code || 'N/A'}</div>
                            </div>
                            ${company.latitude && company.longitude ? `
                            <div>
                                <div style="font-size: 0.7rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; font-weight: 600;">Geolocalización</div>
                                <div style="font-size: 0.75rem; color: #34495e;">${company.latitude}, ${company.longitude}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Sucursales -->
                    ${branches.length > 0 ? `
                    <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                        <div style="background: #2c3e50; padding: 16px 24px; border-bottom: 2px solid #3498db;">
                            <h3 style="margin: 0; font-size: 1rem; color: white; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                🏪 Sucursales (${branches.length})
                            </h3>
                        </div>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #ecf0f1;">
                                <tr>
                                    <th style="padding: 14px 12px; text-align: left; font-size: 0.75rem; font-weight: 700; color: #2c3e50; text-transform: uppercase;">Nombre</th>
                                    <th style="padding: 14px 12px; text-align: left; font-size: 0.75rem; font-weight: 700; color: #2c3e50; text-transform: uppercase;">Dirección</th>
                                    <th style="padding: 14px 12px; text-align: left; font-size: 0.75rem; font-weight: 700; color: #2c3e50; text-transform: uppercase;">Ciudad</th>
                                    <th style="padding: 14px 12px; text-align: center; font-size: 0.75rem; font-weight: 700; color: #2c3e50; text-transform: uppercase;">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${branches.map(branch => `
                                <tr style="border-bottom: 1px solid #e9ecef;">
                                    <td style="padding: 12px; font-size: 0.85rem; color: #212529; font-weight: 600;">${branch.name}</td>
                                    <td style="padding: 12px; font-size: 0.85rem; color: #34495e;">${branch.address || 'N/A'}</td>
                                    <td style="padding: 12px; font-size: 0.85rem; color: #34495e;">${branch.city || 'N/A'}</td>
                                    <td style="padding: 12px; text-align: center;">
                                        <span style="display: inline-block; padding: 3px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 600; background: ${branch.isActive ? '#d4edda' : '#f8d7da'}; color: ${branch.isActive ? '#155724' : '#721c24'};">
                                            ${branch.isActive ? '✓ Activa' : '✕ Inactiva'}
                                        </span>
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}

                    <!-- Módulos Contratados - TABLA PROFESIONAL -->
                    <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                        <div style="background: #2c3e50; padding: 16px 24px; border-bottom: 2px solid #3498db;">
                            <h3 style="margin: 0; font-size: 1rem; color: white; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                📦 Módulos Contratados (${activeModules.length})
                            </h3>
                        </div>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #ecf0f1;">
                                <tr>
                                    <th style="padding: 14px 12px; text-align: left; font-size: 0.75rem; font-weight: 700; color: #2c3e50; text-transform: uppercase; letter-spacing: 0.5px;">Módulo</th>
                                    <th style="padding: 14px 12px; text-align: center; font-size: 0.75rem; font-weight: 700; color: #2c3e50; text-transform: uppercase; letter-spacing: 0.5px;">Precio Mensual</th>
                                    <th style="padding: 14px 12px; text-align: center; font-size: 0.75rem; font-weight: 700; color: #2c3e50; text-transform: uppercase; letter-spacing: 0.5px;">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${modulesListHtml}
                            </tbody>
                        </table>
                    </div>

                    <!-- Timeline de Notificaciones Multi-Tenant -->
                    ${notifications.length > 0 ? `
                    <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden;">
                        <div style="background: #2c3e50; padding: 16px 24px; border-bottom: 2px solid #3498db;">
                            <h3 style="margin: 0; font-size: 1rem; color: white; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                🔔 Timeline de Notificaciones (${notifications.length})
                            </h3>
                            <p style="margin: 8px 0 0 0; font-size: 0.75rem; color: rgba(255,255,255,0.7);">
                                Comunicaciones entre Vendedor, Cliente y Aponnt
                            </p>
                        </div>
                        <div style="padding: 24px; max-height: 600px; overflow-y: auto;">
                            ${notifications.map((notif, index) => {
                                const date = new Date(notif.created_at);
                                const dateStr = date.toLocaleDateString('es-AR') + ' ' + date.toLocaleTimeString('es-AR', {hour: '2-digit', minute: '2-digit'});

                                // Determinar ícono y color según tipo
                                let icon = '📢';
                                let bgColor = '#e3f2fd';
                                let borderColor = '#2196f3';

                                if (notif.notification_type?.includes('budget')) {
                                    icon = '💰';
                                    bgColor = '#fff3e0';
                                    borderColor = '#ff9800';
                                } else if (notif.notification_type?.includes('contract')) {
                                    icon = '📄';
                                    bgColor = '#f3e5f5';
                                    borderColor = '#9c27b0';
                                } else if (notif.notification_type?.includes('approved')) {
                                    icon = '✅';
                                    bgColor = '#e8f5e9';
                                    borderColor = '#4caf50';
                                } else if (notif.notification_type?.includes('rejected')) {
                                    icon = '❌';
                                    bgColor = '#ffebee';
                                    borderColor = '#f44336';
                                } else if (notif.notification_type?.includes('commission')) {
                                    icon = '💵';
                                    bgColor = '#e0f2f1';
                                    borderColor = '#009688';
                                }

                                return `
                                <div style="position: relative; padding-left: 32px; margin-bottom: ${index < notifications.length - 1 ? '24px' : '0'}; border-left: 2px solid ${borderColor};">
                                    <!-- Icono timeline -->
                                    <div style="position: absolute; left: -13px; top: 0; width: 24px; height: 24px; background: ${bgColor}; border: 2px solid ${borderColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;">
                                        ${icon}
                                    </div>

                                    <!-- Contenido -->
                                    <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 14px; margin-left: 8px;">
                                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                            <div style="font-weight: 700; font-size: 0.9rem; color: #2c3e50;">
                                                ${notif.title}
                                            </div>
                                            <div style="font-size: 0.7rem; color: #7f8c8d; white-space: nowrap; margin-left: 12px;">
                                                ${dateStr}
                                            </div>
                                        </div>
                                        <div style="font-size: 0.85rem; color: #34495e; line-height: 1.5; margin-bottom: 8px;">
                                            ${notif.message || notif.body}
                                        </div>
                                        <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 0.75rem;">
                                            <span style="padding: 3px 8px; background: rgba(0,0,0,0.1); border-radius: 4px; font-weight: 600;">
                                                Tipo: ${notif.notification_type || 'general'}
                                            </span>
                                            ${notif.priority ? `
                                            <span style="padding: 3px 8px; background: ${notif.priority === 'high' ? '#f44336' : notif.priority === 'medium' ? '#ff9800' : '#4caf50'}; color: white; border-radius: 4px; font-weight: 600;">
                                                ${notif.priority === 'high' ? '🔥 Alta' : notif.priority === 'medium' ? '⚠️ Media' : '✓ Baja'}
                                            </span>
                                            ` : ''}
                                            ${notif.sender_type ? `
                                            <span style="padding: 3px 8px; background: rgba(0,0,0,0.1); border-radius: 4px;">
                                                De: ${notif.sender_type === 'vendor' ? '👨‍💼 Vendedor' : notif.sender_type === 'aponnt' ? '🏢 Aponnt' : '👤 Cliente'}
                                            </span>
                                            ` : ''}
                                            ${notif.status ? `
                                            <span style="padding: 3px 8px; background: ${notif.status === 'read' ? '#d4edda' : '#fff3cd'}; border-radius: 4px;">
                                                ${notif.status === 'read' ? '👁️ Leída' : '📬 No leída'}
                                            </span>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    ` : `
                    <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 32px; text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 12px; opacity: 0.3;">🔔</div>
                        <div style="font-size: 1rem; color: #7f8c8d; font-weight: 600;">
                            No hay notificaciones registradas para esta empresa
                        </div>
                        <div style="font-size: 0.85rem; color: #95a5a6; margin-top: 8px;">
                            Las comunicaciones con vendedores y Aponnt aparecerán aquí
                        </div>
                    </div>
                    `}

                </div>

                <!-- Footer -->
                <div style="background: #f8f9fa; padding: 20px 32px; border-top: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 0.8rem; color: #7f8c8d;">
                        <span style="font-weight: 600;">Nota:</span> Vista de solo lectura. Para modificar, use el botón "Editar".
                    </div>
                    <button onclick="closeViewCompanyModal()" style="padding: 10px 28px; background: #2c3e50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Cierra modal de vista de empresa
 */
function closeViewCompanyModal() {
    const modal = document.getElementById('viewCompanyModal');
    if (modal) {
        modal.remove();
    }
}

// Exportar funciones
if (typeof window !== 'undefined') {
    window.toggleCompanyView = toggleCompanyView;
    window.viewCompanyDetails = viewCompanyDetails;
    window.closeViewCompanyModal = closeViewCompanyModal;
    window.renderCompaniesWithCurrentView = renderCompaniesWithCurrentView;
}
