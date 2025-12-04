/**
 * COMPANY MODAL TABS REDESIGN
 * Transforma el modal de edición en un sistema de tabs profesional
 * Elimina scroll infinito, organiza datos de forma robusta
 */

(function() {
    console.log('🎨 [TABS] Company Modal Tabs Redesign loaded');

    // Guardar función original de editCompany
    const originalEditCompany = window.editCompany;

    // Override editCompany para aplicar tabs después de cargar
    window.editCompany = async function(companyId) {
        console.log('🎨 [TABS] editCompany called con ID:', companyId);

        // Llamar función original
        await originalEditCompany(companyId);

        // Esperar un momento para que el modal esté en el DOM
        setTimeout(() => {
            applyTabsRedesign(companyId);
        }, 400);
    };

    /**
     * Aplicar rediseño de tabs al modal
     */
    function applyTabsRedesign(companyId) {
        const modal = document.getElementById('companyModal');
        if (!modal) {
            console.warn('⚠️ [TABS] Modal no encontrado');
            return;
        }

        console.log('🎨 [TABS] Aplicando rediseño enterprise...');

        // Agregar clase para aplicar estilos
        modal.classList.add('tabs-redesign');

        // Obtener body del modal
        const modalBody = modal.querySelector('.modal-body');
        if (!modalBody) return;

        // Guardar contenido original
        const originalContent = modalBody.innerHTML;

        // Extraer secciones del contenido original
        const sections = extractSections(modalBody);

        // Construir HTML con tabs
        const tabsHTML = buildTabsHTML(sections);

        // Reemplazar contenido
        modalBody.innerHTML = tabsHTML;

        // Activar tab system
        initializeTabs();

        // Cargar sucursales usando la variable global currentEditingCompany
        if (typeof window.loadCompanyBranches === 'function' && window.currentEditingCompany) {
            const companyIdToLoad = window.currentEditingCompany.company_id || window.currentEditingCompany.id;
            console.log('🏢 [TABS] Cargando sucursales para empresa:', companyIdToLoad);
            setTimeout(() => {
                window.loadCompanyBranches(companyIdToLoad);
            }, 300);
        }

        console.log('✅ [TABS] Rediseño aplicado correctamente');
    }

    /**
     * Extraer secciones del formulario original
     */
    function extractSections(modalBody) {
        // Clonar para no modificar el original
        const clone = modalBody.cloneNode(true);

        // Buscar elementos clave
        const formGrid = clone.querySelector('.form-grid');
        const companyForm = clone.querySelector('.company-form');
        const pricingSidebar = clone.querySelector('.pricing-sidebar');

        return {
            basicInfo: companyForm || formGrid,
            pricing: pricingSidebar,
            fullContent: clone
        };
    }

    /**
     * Construir HTML con sistema de tabs
     */
    function buildTabsHTML(sections) {
        return `
            <!-- Tabs Navigation -->
            <div class="company-tabs-nav">
                <button class="company-tab-btn active" data-tab="general">
                    <span class="tab-icon">📋</span>
                    Información General
                </button>
                <button class="company-tab-btn" data-tab="branches">
                    <span class="tab-icon">🏪</span>
                    Sucursales
                </button>
                <button class="company-tab-btn" data-tab="modules">
                    <span class="tab-icon">📦</span>
                    Módulos y Precios
                </button>
                <button class="company-tab-btn" data-tab="config">
                    <span class="tab-icon">⚙️</span>
                    Configuración
                </button>
            </div>

            <!-- Tab 1: Información General -->
            <div class="company-tab-content active" data-tab-content="general">
                <div class="form-section">
                    <div class="form-section-header">
                        <div class="form-section-icon">🏢</div>
                        <div>
                            <h3 class="form-section-title">Datos de la Empresa</h3>
                            <p class="form-section-subtitle">Información básica y de contacto</p>
                        </div>
                    </div>

                    <div class="form-grid-2">
                        <div class="form-group">
                            <label class="form-label">Nombre de la Empresa *</label>
                            <input type="text" class="form-input" id="companyName" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Razón Social</label>
                            <input type="text" class="form-input" id="legalName">
                        </div>
                        <div class="form-group">
                            <label class="form-label">CUIT *</label>
                            <input type="text" class="form-input" id="taxId" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email *</label>
                            <input type="email" class="form-input" id="contactEmail" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Teléfono</label>
                            <input type="text" class="form-input" id="contactPhone">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tipo de Licencia</label>
                            <select class="form-select" id="licenseType">
                                <option value="basic">Básica</option>
                                <option value="professional">Profesional</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-section-header">
                        <div class="form-section-icon">📍</div>
                        <div>
                            <h3 class="form-section-title">Ubicación</h3>
                            <p class="form-section-subtitle">Dirección y geolocalización</p>
                        </div>
                    </div>

                    <div class="form-grid-2">
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label class="form-label">Dirección</label>
                            <input type="text" class="form-input" id="address">
                        </div>
                        <div class="form-group">
                            <label class="form-label">País</label>
                            <select class="form-select" id="country" onchange="loadProvinces()">
                                <option value="Argentina">Argentina</option>
                                <option value="Chile">Chile</option>
                                <option value="Uruguay">Uruguay</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Provincia</label>
                            <select class="form-select" id="province" onchange="loadCities()">
                                <option value="">Seleccionar...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ciudad</label>
                            <select class="form-select" id="city">
                                <option value="">Seleccionar...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Código Postal</label>
                            <input type="text" class="form-input" id="postalCode" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Latitud</label>
                            <input type="number" class="form-input" id="companyLatitude" step="any">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Longitud</label>
                            <input type="number" class="form-input" id="companyLongitude" step="any">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-section-header">
                        <div class="form-section-icon">👥</div>
                        <div>
                            <h3 class="form-section-title">Capacidad</h3>
                            <p class="form-section-subtitle">Empleados y límites</p>
                        </div>
                    </div>

                    <div class="form-grid-3">
                        <div class="form-group">
                            <label class="form-label">Empleados Contratados *</label>
                            <input type="number" class="form-input" id="contractedEmployees" required min="1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Capacidad Máxima</label>
                            <input type="number" class="form-input" id="maxEmployees" min="1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Estado</label>
                            <select class="form-select" id="status">
                                <option value="active">Activa</option>
                                <option value="trial">Prueba</option>
                                <option value="suspended">Suspendida</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab 2: Sucursales -->
            <div class="company-tab-content" data-tab-content="branches">
                <div class="form-section">
                    <div class="form-section-header">
                        <div class="form-section-icon">🏪</div>
                        <div>
                            <h3 class="form-section-title">Gestión de Sucursales</h3>
                            <p class="form-section-subtitle">Administrar ubicaciones de la empresa</p>
                        </div>
                    </div>

                    <div style="text-align: right; margin-bottom: 20px;">
                        <button type="button" class="btn btn-primary" onclick="openBranchModal()">
                            ➕ Agregar Sucursal
                        </button>
                    </div>

                    <div id="branchesTableContainer" class="branches-table-container">
                        <table class="branches-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Dirección</th>
                                    <th>Ciudad</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="branchesTableBody">
                                <tr>
                                    <td colspan="5" style="text-align: center; padding: 40px; color: #95a5a6;">
                                        No hay sucursales registradas
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Tab 3: Módulos y Pricing -->
            <div class="company-tab-content" data-tab-content="modules">
                <div style="display: grid; grid-template-columns: 1fr 380px; gap: 32px;">

                    <!-- Módulos -->
                    <div class="form-section" style="margin-bottom: 0;">
                        <div class="form-section-header">
                            <div class="form-section-icon">📦</div>
                            <div>
                                <h3 class="form-section-title">Selección de Módulos</h3>
                                <p class="form-section-subtitle">Seleccione los módulos a contratar</p>
                            </div>
                        </div>

                        <div id="modulesGridContainer" class="modules-grid">
                            <!-- Los módulos se cargarán aquí dinámicamente -->
                            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #95a5a6;">
                                Cargando módulos...
                            </div>
                        </div>
                    </div>

                    <!-- Resumen de Pricing -->
                    <div class="pricing-summary-box">
                        <h3 class="pricing-title">💰 Resumen de Pricing</h3>

                        <div class="pricing-row">
                            <span>Módulos:</span>
                            <span id="pricingSummaryModules">0</span>
                        </div>
                        <div class="pricing-row">
                            <span>Subtotal:</span>
                            <span id="pricingSummarySubtotal">$0</span>
                        </div>
                        <div class="pricing-row">
                            <span>IVA (21%):</span>
                            <span id="pricingSummaryIVA">$0</span>
                        </div>

                        <div class="pricing-total" id="pricingSummaryTotal">
                            $0
                        </div>
                        <div style="text-align: center; font-size: 0.75rem; color: rgba(255,255,255,0.7); margin-top: 8px;">
                            Total Mensual con IVA
                        </div>

                        <div style="margin-top: 24px; padding-top: 20px; border-top: 2px solid rgba(255,255,255,0.2);">
                            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.8); line-height: 1.6;">
                                <strong>Nota:</strong> Los precios se actualizan automáticamente al seleccionar módulos.
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <!-- Tab 4: Configuración -->
            <div class="company-tab-content" data-tab-content="config">
                <div class="form-section">
                    <div class="form-section-header">
                        <div class="form-section-icon">⚙️</div>
                        <div>
                            <h3 class="form-section-title">Configuración Avanzada</h3>
                            <p class="form-section-subtitle">Opciones adicionales y preferencias</p>
                        </div>
                    </div>

                    <div class="form-grid-2">
                        <div class="form-group">
                            <label class="form-label">Slug (URL Friendly)</label>
                            <input type="text" class="form-input" id="slug" placeholder="mi-empresa">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Zona Horaria</label>
                            <select class="form-select" id="timezone">
                                <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
                                <option value="America/Santiago">Santiago (GMT-4)</option>
                                <option value="America/Montevideo">Montevideo (GMT-3)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Idioma</label>
                            <select class="form-select" id="language">
                                <option value="es">Español</option>
                                <option value="en">English</option>
                                <option value="pt">Português</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Moneda</label>
                            <select class="form-select" id="currency">
                                <option value="ARS">ARS - Peso Argentino</option>
                                <option value="USD">USD - Dólar</option>
                                <option value="CLP">CLP - Peso Chileno</option>
                            </select>
                        </div>
                    </div>

                    <div style="margin-top: 28px; padding: 20px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px;">
                        <strong style="color: #856404;">⚠️ Advertencia:</strong>
                        <p style="margin: 8px 0 0 0; color: #856404; font-size: 0.9rem;">
                            Los cambios en esta sección pueden afectar el funcionamiento de la empresa. Proceda con precaución.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Inicializar sistema de tabs
     */
    function initializeTabs() {
        const tabButtons = document.querySelectorAll('.company-tab-btn');
        const tabContents = document.querySelectorAll('.company-tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');

                // Remover active de todos
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Activar el seleccionado
                button.classList.add('active');
                const targetContent = document.querySelector(`[data-tab-content="${tabName}"]`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }

                console.log(`🎨 [TABS] Cambiado a tab: ${tabName}`);
            });
        });

        console.log('✅ [TABS] Sistema de tabs inicializado');
    }

})();
