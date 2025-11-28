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
 * Ver detalles de empresa (SOLO LECTURA)
 * Para usuarios con permisos limitados
 */
function viewCompanyDetails(companyId) {
    console.log('👁️ Abriendo vista de solo lectura para empresa:', companyId);

    const company = companies.find(c => (c.company_id || c.id) == companyId);
    if (!company) {
        alert('Empresa no encontrada');
        return;
    }

    // Crear modal de solo lectura
    const modalHtml = `
        <div id="viewCompanyModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
            <div style="background: white; border-radius: 16px; max-width: 900px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 16px 16px 0 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; color: white; font-size: 1.5rem; font-weight: 700;">
                                👁️ ${company.name}
                            </h2>
                            <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.8); font-size: 0.9rem;">
                                Vista de solo lectura
                            </p>
                        </div>
                        <button onclick="closeViewCompanyModal()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; font-size: 1.2rem;">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div style="padding: 24px;">
                    <!-- Información General -->
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 16px 0; font-size: 1.1rem; color: #495057; display: flex; align-items: center; gap: 8px;">
                            <span>🏢</span> Información General
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                            <div>
                                <div style="font-size: 0.75rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Razón Social</div>
                                <div style="font-size: 0.95rem; font-weight: 600; color: #212529;">${company.legalName || company.name}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">CUIT</div>
                                <div style="font-size: 0.95rem; font-weight: 600; color: #212529;">${company.taxId}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Email</div>
                                <div style="font-size: 0.95rem; color: #212529;">${company.contactEmail}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Teléfono</div>
                                <div style="font-size: 0.95rem; color: #212529;">${company.contactPhone || 'N/A'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Estadísticas -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 20px; color: white;">
                            <div style="font-size: 0.75rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">👥 Empleados</div>
                            <div style="font-size: 2rem; font-weight: 700;">${company.currentEmployees || 0}</div>
                            <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 4px;">${company.contractedEmployees || company.maxEmployees || 1} contratados</div>
                        </div>

                        <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 12px; padding: 20px; color: white;">
                            <div style="font-size: 0.75rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">📦 Módulos</div>
                            <div style="font-size: 2rem; font-weight: 700;">${company.modulesSummary ? company.modulesSummary.contractedModules : 0}</div>
                            <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 4px;">de ${company.modulesSummary ? company.modulesSummary.totalSystemModules : 57} disponibles</div>
                        </div>

                        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; padding: 20px; color: white;">
                            <div style="font-size: 0.75rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">💰 Revenue Mensual</div>
                            <div style="font-size: 2rem; font-weight: 700;">$${Math.floor(company.pricing?.monthlyTotal || 0).toLocaleString('en-US')}</div>
                            <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 4px;">con IVA incluido</div>
                        </div>
                    </div>

                    <!-- Plan y Estado -->
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 20px;">
                        <h3 style="margin: 0 0 16px 0; font-size: 1.1rem; color: #495057; display: flex; align-items: center; gap: 8px;">
                            <span>⚙️</span> Plan y Estado
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                            <div>
                                <div style="font-size: 0.75rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Tipo de Licencia</div>
                                <div style="font-size: 0.95rem; font-weight: 600; color: #212529;">${company.licenseType || 'Básico'}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Capacidad Máxima</div>
                                <div style="font-size: 0.95rem; font-weight: 600; color: #212529;">${company.maxEmployees} empleados</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Estado</div>
                                <div style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; background: ${company.status === 'active' ? '#d4edda' : '#fff3cd'}; color: ${company.status === 'active' ? '#155724' : '#856404'};">
                                    ${company.status === 'active' ? '✓ Activa' : '⏱ Prueba'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background: #f8f9fa; padding: 20px 24px; border-radius: 0 0 16px 16px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 0.85rem; color: #6c757d;">
                        <span style="font-weight: 600;">Nota:</span> Esta es una vista de solo lectura. Para editar, usa el botón "Editar".
                    </div>
                    <button onclick="closeViewCompanyModal()" style="padding: 10px 24px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
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
