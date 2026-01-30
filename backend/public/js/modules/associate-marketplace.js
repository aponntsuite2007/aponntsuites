/**
 * ASSOCIATE MARKETPLACE v1.0
 * Marketplace para contratar asociados APONNT
 *
 * Profesionales: Médicos Laborales, Abogados, Seguridad Industrial, etc.
 *
 * @version 1.0
 * @date 2025-12-06
 */

window.AssociateMarketplace = (function() {
    'use strict';

    // Estado del módulo
    const state = {
        categories: [],
        associates: [],
        contracts: [],
        filters: {
            category: null,
            region: null,
            minRating: 0
        },
        selectedAssociate: null,
        isLoading: false
    };

    // Configuración
    const config = {
        apiBase: '/api/v1/associates'
    };

    // Colores por categoría
    const categoryColors = {
        'medical': { primary: '#20c997', gradient: 'linear-gradient(135deg, #20c997, #17a2b8)' },
        'legal': { primary: '#fd7e14', gradient: 'linear-gradient(135deg, #fd7e14, #e65c00)' },
        'safety': { primary: '#ffc107', gradient: 'linear-gradient(135deg, #ffc107, #e0a800)' },
        'audit': { primary: '#6f42c1', gradient: 'linear-gradient(135deg, #6f42c1, #5a32a3)' },
        'training': { primary: '#17a2b8', gradient: 'linear-gradient(135deg, #17a2b8, #138496)' },
        'psychologist': { primary: '#e83e8c', gradient: 'linear-gradient(135deg, #e83e8c, #d63384)' }
    };

    /**
     * Inicializar marketplace
     */
    async function init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[MARKETPLACE] Container not found:', containerId);
            return;
        }

        container.innerHTML = renderMainView();
        attachEventListeners(container);
        await loadCategories();
        await loadContracts();
    }

    /**
     * Renderizar vista principal
     */
    function renderMainView() {
        return `
            <div class="marketplace-container" style="
                background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
                min-height: 100%;
                padding: 20px;
                color: #e0e0e0;
            ">
                <!-- Header -->
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 25px;
                ">
                    <div>
                        <h2 style="margin: 0; color: #fff; font-size: 1.5rem;">
                            <i class="fas fa-store" style="color: #20c997; margin-right: 10px;"></i>
                            Marketplace de Asociados APONNT
                        </h2>
                        <p style="margin: 5px 0 0; color: #888; font-size: 0.85rem;">
                            Profesionales certificados listos para trabajar con su empresa
                        </p>
                    </div>
                </div>

                <!-- Tabs -->
                <div style="
                    display: flex;
                    gap: 5px;
                    margin-bottom: 20px;
                    background: rgba(255,255,255,0.03);
                    padding: 5px;
                    border-radius: 10px;
                ">
                    <button class="mp-tab active" data-tab="browse" style="
                        flex: 1;
                        padding: 12px;
                        background: rgba(32, 201, 151, 0.2);
                        border: 1px solid rgba(32, 201, 151, 0.3);
                        color: #20c997;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                    ">
                        <i class="fas fa-search"></i> Buscar Profesionales
                    </button>
                    <button class="mp-tab" data-tab="contracts" style="
                        flex: 1;
                        padding: 12px;
                        background: transparent;
                        border: 1px solid rgba(255,255,255,0.1);
                        color: #888;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                    ">
                        <i class="fas fa-file-contract"></i> Mis Contratos
                    </button>
                </div>

                <!-- Content -->
                <div id="mp-content" style="
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 12px;
                    padding: 20px;
                    min-height: 400px;
                ">
                    <div class="loading-spinner" style="text-align: center; padding: 50px;">
                        <i class="fas fa-spinner fa-spin fa-2x" style="color: #20c997;"></i>
                        <p style="margin-top: 15px; color: #888;">Cargando marketplace...</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar tab de búsqueda
     */
    function renderBrowseTab() {
        return `
            <!-- Categorías -->
            <div style="margin-bottom: 25px;">
                <h4 style="color: #20c997; margin-bottom: 15px; font-size: 0.95rem;">
                    <i class="fas fa-th-large"></i> Categorías de Profesionales
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px;">
                    ${state.categories.map(cat => `
                        <div class="category-card ${state.filters.category === cat.key ? 'selected' : ''}"
                             data-category="${cat.key}"
                             onclick="AssociateMarketplace.filterByCategory('${cat.key}')"
                             style="
                                background: ${state.filters.category === cat.key
                                    ? categoryColors[cat.key]?.gradient || 'linear-gradient(135deg, #3498db, #2980b9)'
                                    : 'rgba(255,255,255,0.03)'};
                                border: 1px solid ${state.filters.category === cat.key
                                    ? 'transparent'
                                    : 'rgba(255,255,255,0.08)'};
                                border-radius: 10px;
                                padding: 15px;
                                text-align: center;
                                cursor: pointer;
                                transition: all 0.2s ease;
                             "
                             onmouseover="if(!this.classList.contains('selected')) this.style.borderColor='${categoryColors[cat.key]?.primary || '#3498db'}'"
                             onmouseout="if(!this.classList.contains('selected')) this.style.borderColor='rgba(255,255,255,0.08)'">
                            <i class="fas ${cat.icon}" style="
                                font-size: 1.8rem;
                                color: ${state.filters.category === cat.key ? 'white' : categoryColors[cat.key]?.primary || '#3498db'};
                                margin-bottom: 8px;
                            "></i>
                            <div style="
                                color: ${state.filters.category === cat.key ? 'white' : '#e0e0e0'};
                                font-weight: 500;
                                font-size: 0.85rem;
                            ">${cat.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Filtros -->
            <div style="
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
                padding: 15px;
                background: rgba(255,255,255,0.02);
                border-radius: 10px;
            ">
                <div style="flex: 1;">
                    <label style="display: block; color: #888; font-size: 0.75rem; margin-bottom: 5px;">
                        Región
                    </label>
                    <select id="mp-filter-region" onchange="AssociateMarketplace.applyFilters()" style="
                        width: 100%;
                        padding: 10px;
                        background: rgba(255,255,255,0.08);
                        border: 1px solid rgba(255,255,255,0.15);
                        border-radius: 8px;
                        color: #000;
                    ">
                        <option value="">Todas las regiones</option>
                        <option value="CABA">CABA</option>
                        <option value="Buenos Aires">Buenos Aires</option>
                        <option value="Córdoba">Córdoba</option>
                        <option value="Santa Fe">Santa Fe</option>
                        <option value="Mendoza">Mendoza</option>
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="display: block; color: #888; font-size: 0.75rem; margin-bottom: 5px;">
                        Calificación mínima
                    </label>
                    <select id="mp-filter-rating" onchange="AssociateMarketplace.applyFilters()" style="
                        width: 100%;
                        padding: 10px;
                        background: rgba(255,255,255,0.08);
                        border: 1px solid rgba(255,255,255,0.15);
                        border-radius: 8px;
                        color: #000;
                    ">
                        <option value="0">Cualquier calificación</option>
                        <option value="3">3+ estrellas</option>
                        <option value="4">4+ estrellas</option>
                        <option value="4.5">4.5+ estrellas</option>
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="display: block; color: #888; font-size: 0.75rem; margin-bottom: 5px;">
                        Servicio remoto
                    </label>
                    <select id="mp-filter-remote" onchange="AssociateMarketplace.applyFilters()" style="
                        width: 100%;
                        padding: 10px;
                        background: rgba(255,255,255,0.08);
                        border: 1px solid rgba(255,255,255,0.15);
                        border-radius: 8px;
                        color: #000;
                    ">
                        <option value="">Cualquiera</option>
                        <option value="true">Disponible remoto</option>
                        <option value="false">Solo presencial</option>
                    </select>
                </div>
                <button onclick="AssociateMarketplace.clearFilters()" style="
                    align-self: flex-end;
                    padding: 10px 15px;
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.2);
                    color: #888;
                    border-radius: 8px;
                    cursor: pointer;
                ">
                    <i class="fas fa-times"></i> Limpiar
                </button>
            </div>

            <!-- Lista de asociados -->
            <div id="mp-associates-list">
                ${renderAssociatesList()}
            </div>
        `;
    }

    /**
     * Renderizar lista de asociados
     */
    function renderAssociatesList() {
        if (state.isLoading) {
            return `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin fa-2x" style="color: #20c997;"></i>
                    <p style="margin-top: 15px; color: #888;">Buscando profesionales...</p>
                </div>
            `;
        }

        if (state.associates.length === 0) {
            return `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <i class="fas fa-user-md fa-3x" style="opacity: 0.3;"></i>
                    <p style="margin-top: 15px;">
                        ${state.filters.category
                            ? 'No hay profesionales con estos criterios'
                            : 'Seleccione una categoría para ver profesionales'}
                    </p>
                </div>
            `;
        }

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 15px;">
                ${state.associates.map(associate => renderAssociateCard(associate)).join('')}
            </div>
        `;
    }

    /**
     * Renderizar tarjeta de asociado
     */
    function renderAssociateCard(associate) {
        const catColor = categoryColors[associate.category]?.primary || '#3498db';

        return `
            <div class="associate-card" onclick="AssociateMarketplace.showAssociateDetail('${associate.id}')" style="
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 12px;
                padding: 20px;
                cursor: pointer;
                transition: all 0.2s ease;
            " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 30px rgba(0,0,0,0.3)'"
               onmouseout="this.style.transform='none'; this.style.boxShadow='none'">

                <div style="display: flex; gap: 15px;">
                    <!-- Avatar -->
                    <div style="
                        width: 70px;
                        height: 70px;
                        border-radius: 12px;
                        background: ${categoryColors[associate.category]?.gradient || 'linear-gradient(135deg, #3498db, #2980b9)'};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                        ${associate.photo_url ? `background-image: url('${associate.photo_url}'); background-size: cover;` : ''}
                    ">
                        ${!associate.photo_url ? `
                            <span style="color: white; font-weight: bold; font-size: 1.3rem;">
                                ${associate.first_name?.[0]}${associate.last_name?.[0]}
                            </span>
                        ` : ''}
                    </div>

                    <!-- Info -->
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <h4 style="margin: 0; color: #fff; font-size: 1rem;">
                                    ${associate.first_name} ${associate.last_name}
                                </h4>
                                <span style="
                                    display: inline-block;
                                    font-size: 0.7rem;
                                    color: ${catColor};
                                    background: ${catColor}20;
                                    padding: 2px 8px;
                                    border-radius: 10px;
                                    margin-top: 3px;
                                ">${associate.specialty || associate.category}</span>
                            </div>
                            ${associate.is_featured ? `
                                <span style="
                                    font-size: 0.65rem;
                                    color: #f39c12;
                                    background: rgba(243, 156, 18, 0.2);
                                    padding: 3px 8px;
                                    border-radius: 10px;
                                ">
                                    <i class="fas fa-star"></i> Destacado
                                </span>
                            ` : ''}
                        </div>

                        <!-- Rating -->
                        <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
                            <div style="color: #f39c12;">
                                ${renderStars(associate.rating_average || 0)}
                            </div>
                            <span style="color: #888; font-size: 0.75rem;">
                                (${associate.rating_count || 0} reseñas)
                            </span>
                        </div>

                        <!-- License -->
                        ${associate.license_number ? `
                            <div style="margin-top: 5px; color: #888; font-size: 0.75rem;">
                                <i class="fas fa-id-card" style="color: #20c997;"></i>
                                Mat. ${associate.license_number}
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Bio -->
                ${associate.bio ? `
                    <p style="
                        margin: 12px 0 0;
                        color: #888;
                        font-size: 0.8rem;
                        line-height: 1.4;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                    ">${associate.bio}</p>
                ` : ''}

                <!-- Footer -->
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 15px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                ">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${associate.remote_available ? `
                            <span style="
                                font-size: 0.65rem;
                                color: #2ecc71;
                                background: rgba(46, 204, 113, 0.1);
                                padding: 3px 8px;
                                border-radius: 10px;
                            ">
                                <i class="fas fa-video"></i> Remoto
                            </span>
                        ` : ''}
                        <span style="
                            font-size: 0.65rem;
                            color: #3498db;
                            background: rgba(52, 152, 219, 0.1);
                            padding: 3px 8px;
                            border-radius: 10px;
                        ">
                            <i class="fas fa-handshake"></i> ${associate.contracts_completed || 0} contratos
                        </span>
                    </div>
                    ${associate.hourly_rate ? `
                        <span style="color: #2ecc71; font-weight: 600; font-size: 0.9rem;">
                            $${associate.hourly_rate}/h
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Renderizar estrellas
     */
    function renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalf = rating % 1 >= 0.5;
        let html = '';

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                html += '<i class="fas fa-star"></i>';
            } else if (i === fullStars && hasHalf) {
                html += '<i class="fas fa-star-half-alt"></i>';
            } else {
                html += '<i class="far fa-star" style="color: #444;"></i>';
            }
        }

        return html;
    }

    /**
     * Renderizar tab de contratos
     */
    function renderContractsTab() {
        if (state.contracts.length === 0) {
            return `
                <div style="text-align: center; padding: 50px; color: #888;">
                    <i class="fas fa-file-contract fa-3x" style="opacity: 0.3;"></i>
                    <p style="margin-top: 15px;">No tiene contratos activos con asociados</p>
                    <button onclick="AssociateMarketplace.switchTab('browse')" style="
                        margin-top: 15px;
                        background: rgba(32, 201, 151, 0.2);
                        border: 1px solid rgba(32, 201, 151, 0.4);
                        color: #20c997;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                    ">
                        <i class="fas fa-search"></i> Buscar Profesionales
                    </button>
                </div>
            `;
        }

        return `
            <div style="display: grid; gap: 15px;">
                ${state.contracts.map(contract => renderContractCard(contract)).join('')}
            </div>
        `;
    }

    /**
     * Renderizar tarjeta de contrato
     */
    function renderContractCard(contract) {
        const statusColors = {
            'active': { bg: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', label: 'Activo' },
            'paused': { bg: 'rgba(241, 196, 15, 0.2)', color: '#f1c40f', label: 'Pausado' },
            'terminated': { bg: 'rgba(231, 76, 60, 0.2)', color: '#e74c3c', label: 'Terminado' }
        };
        const status = statusColors[contract.status] || statusColors.active;
        const catColor = categoryColors[contract.category]?.primary || '#3498db';

        return `
            <div style="
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 12px;
                padding: 20px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex; gap: 15px;">
                        <div style="
                            width: 55px;
                            height: 55px;
                            border-radius: 10px;
                            background: ${categoryColors[contract.category]?.gradient || 'linear-gradient(135deg, #3498db, #2980b9)'};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            ${contract.photo_url ? `background-image: url('${contract.photo_url}'); background-size: cover;` : ''}
                        ">
                            ${!contract.photo_url ? `
                                <span style="color: white; font-weight: bold;">
                                    ${contract.first_name?.[0]}${contract.last_name?.[0]}
                                </span>
                            ` : ''}
                        </div>
                        <div>
                            <h4 style="margin: 0; color: #fff; font-size: 1rem;">
                                ${contract.first_name} ${contract.last_name}
                            </h4>
                            <span style="
                                display: inline-block;
                                font-size: 0.7rem;
                                color: ${catColor};
                                background: ${catColor}20;
                                padding: 2px 8px;
                                border-radius: 10px;
                                margin-top: 3px;
                            ">${contract.specialty || contract.category}</span>
                            ${contract.license_number ? `
                                <div style="margin-top: 5px; color: #888; font-size: 0.75rem;">
                                    Mat. ${contract.license_number}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span style="
                            font-size: 0.7rem;
                            padding: 4px 10px;
                            border-radius: 15px;
                            background: ${status.bg};
                            color: ${status.color};
                        ">${status.label}</span>
                        <div style="margin-top: 8px; color: #888; font-size: 0.75rem;">
                            ${contract.contract_type === 'permanent' ? 'Contrato Permanente' : 'Contrato Eventual'}
                        </div>
                    </div>
                </div>

                <!-- Detalles del contrato -->
                <div style="
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                ">
                    <div>
                        <div style="color: #666; font-size: 0.7rem;">Inicio</div>
                        <div style="color: #e0e0e0; font-size: 0.85rem;">
                            ${new Date(contract.start_date).toLocaleDateString('es-AR')}
                        </div>
                    </div>
                    <div>
                        <div style="color: #666; font-size: 0.7rem;">Alcance</div>
                        <div style="color: #e0e0e0; font-size: 0.85rem;">
                            ${contract.scope_type === 'all_company' ? 'Toda la empresa' :
                              contract.scope_type === 'branches' ? 'Por sucursal' : 'Empleados específicos'}
                        </div>
                    </div>
                    <div>
                        <div style="color: #666; font-size: 0.7rem;">Tarifa</div>
                        <div style="color: #2ecc71; font-size: 0.85rem; font-weight: 600;">
                            ${contract.hourly_rate_agreed ? `$${contract.hourly_rate_agreed}/h` : 'A convenir'}
                        </div>
                    </div>
                </div>

                <!-- Acciones -->
                <div style="
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                ">
                    ${contract.contract_type === 'eventual' ? `
                        <button onclick="AssociateMarketplace.manageEmployees(${contract.id})" style="
                            padding: 8px 15px;
                            background: rgba(52, 152, 219, 0.2);
                            border: 1px solid rgba(52, 152, 219, 0.4);
                            color: #3498db;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.8rem;
                        ">
                            <i class="fas fa-users"></i> Gestionar Empleados
                        </button>
                    ` : ''}
                    ${contract.status === 'active' ? `
                        <button onclick="AssociateMarketplace.pauseContract(${contract.id})" style="
                            padding: 8px 15px;
                            background: rgba(241, 196, 15, 0.2);
                            border: 1px solid rgba(241, 196, 15, 0.4);
                            color: #f1c40f;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.8rem;
                        ">
                            <i class="fas fa-pause"></i> Pausar
                        </button>
                    ` : contract.status === 'paused' ? `
                        <button onclick="AssociateMarketplace.activateContract(${contract.id})" style="
                            padding: 8px 15px;
                            background: rgba(46, 204, 113, 0.2);
                            border: 1px solid rgba(46, 204, 113, 0.4);
                            color: #2ecc71;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.8rem;
                        ">
                            <i class="fas fa-play"></i> Reactivar
                        </button>
                    ` : ''}
                    ${contract.status !== 'terminated' ? `
                        <button onclick="AssociateMarketplace.terminateContract(${contract.id})" style="
                            padding: 8px 15px;
                            background: transparent;
                            border: 1px solid rgba(231, 76, 60, 0.4);
                            color: #e74c3c;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.8rem;
                        ">
                            <i class="fas fa-times"></i> Terminar
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Cargar categorías
     */
    async function loadCategories() {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        try {
            const res = await fetch(`${config.apiBase}/categories`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                state.categories = data.categories || [];
                switchTab('browse');
            }
        } catch (error) {
            console.error('[MARKETPLACE] Error loading categories:', error);
        }
    }

    /**
     * Cargar contratos
     */
    async function loadContracts() {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        try {
            const res = await fetch(`${config.apiBase}/contracts/my-company`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                state.contracts = data.contracts || [];
            }
        } catch (error) {
            console.error('[MARKETPLACE] Error loading contracts:', error);
        }
    }

    /**
     * Buscar asociados
     */
    async function searchAssociates() {
        state.isLoading = true;
        renderAssociatesList();

        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const params = new URLSearchParams();

        if (state.filters.category) params.append('category', state.filters.category);
        if (state.filters.region) params.append('region', state.filters.region);
        if (state.filters.minRating > 0) params.append('minRating', state.filters.minRating);

        try {
            const res = await fetch(`${config.apiBase}/search?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                state.associates = data.associates || [];
            }
        } catch (error) {
            console.error('[MARKETPLACE] Error searching associates:', error);
        } finally {
            state.isLoading = false;
            document.getElementById('mp-associates-list').innerHTML = renderAssociatesList();
        }
    }

    /**
     * Filtrar por categoría
     */
    function filterByCategory(category) {
        state.filters.category = state.filters.category === category ? null : category;
        switchTab('browse');
        if (state.filters.category) {
            searchAssociates();
        }
    }

    /**
     * Aplicar filtros
     */
    function applyFilters() {
        state.filters.region = document.getElementById('mp-filter-region')?.value || null;
        state.filters.minRating = parseFloat(document.getElementById('mp-filter-rating')?.value || 0);
        searchAssociates();
    }

    /**
     * Limpiar filtros
     */
    function clearFilters() {
        state.filters = { category: null, region: null, minRating: 0 };
        state.associates = [];
        switchTab('browse');
    }

    /**
     * Mostrar detalle de asociado
     */
    async function showAssociateDetail(associateId) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');

        try {
            const res = await fetch(`${config.apiBase}/${associateId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Not found');

            const data = await res.json();
            const associate = data.associate;
            state.selectedAssociate = associate;

            const catColor = categoryColors[associate.category]?.primary || '#3498db';

            // Mostrar modal
            const modal = document.createElement('div');
            modal.id = 'associate-detail-modal';
            modal.innerHTML = `
                <div style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 20px;
                " onclick="if(event.target === this) this.remove()">
                    <div style="
                        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 15px;
                        width: 600px;
                        max-height: 85vh;
                        overflow-y: auto;
                        padding: 25px;
                    ">
                        <!-- Header -->
                        <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                            <div style="
                                width: 100px;
                                height: 100px;
                                border-radius: 15px;
                                background: ${categoryColors[associate.category]?.gradient || 'linear-gradient(135deg, #3498db, #2980b9)'};
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                flex-shrink: 0;
                                ${associate.photo_url ? `background-image: url('${associate.photo_url}'); background-size: cover;` : ''}
                            ">
                                ${!associate.photo_url ? `
                                    <span style="color: white; font-weight: bold; font-size: 2rem;">
                                        ${associate.first_name?.[0]}${associate.last_name?.[0]}
                                    </span>
                                ` : ''}
                            </div>
                            <div>
                                <h3 style="margin: 0; color: #fff;">
                                    ${associate.first_name} ${associate.last_name}
                                </h3>
                                <span style="
                                    display: inline-block;
                                    font-size: 0.8rem;
                                    color: ${catColor};
                                    background: ${catColor}20;
                                    padding: 4px 12px;
                                    border-radius: 15px;
                                    margin-top: 5px;
                                ">${associate.specialty || associate.category}</span>
                                <div style="margin-top: 10px; display: flex; align-items: center; gap: 10px;">
                                    <div style="color: #f39c12;">
                                        ${renderStars(associate.rating_average || 0)}
                                    </div>
                                    <span style="color: #888;">
                                        ${(associate.rating_average || 0).toFixed(1)} (${associate.rating_count || 0} reseñas)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Bio -->
                        ${associate.bio ? `
                            <div style="margin-bottom: 20px;">
                                <h5 style="color: #888; margin-bottom: 8px;">Sobre mí</h5>
                                <p style="color: #e0e0e0; font-size: 0.9rem; line-height: 1.6; margin: 0;">
                                    ${associate.bio}
                                </p>
                            </div>
                        ` : ''}

                        <!-- Info grid -->
                        <div style="
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 15px;
                            margin-bottom: 20px;
                            padding: 15px;
                            background: rgba(255,255,255,0.02);
                            border-radius: 10px;
                        ">
                            ${associate.license_number ? `
                                <div>
                                    <div style="color: #666; font-size: 0.75rem;">Matrícula</div>
                                    <div style="color: #e0e0e0; font-size: 0.9rem;">
                                        <i class="fas fa-id-card" style="color: #20c997;"></i>
                                        ${associate.license_number}
                                    </div>
                                </div>
                            ` : ''}
                            ${associate.hourly_rate ? `
                                <div>
                                    <div style="color: #666; font-size: 0.75rem;">Tarifa</div>
                                    <div style="color: #2ecc71; font-size: 0.9rem; font-weight: 600;">
                                        $${associate.hourly_rate}/hora
                                    </div>
                                </div>
                            ` : ''}
                            <div>
                                <div style="color: #666; font-size: 0.75rem;">Contratos completados</div>
                                <div style="color: #e0e0e0; font-size: 0.9rem;">
                                    <i class="fas fa-handshake" style="color: #3498db;"></i>
                                    ${associate.contracts_completed || 0}
                                </div>
                            </div>
                            <div>
                                <div style="color: #666; font-size: 0.75rem;">Servicio remoto</div>
                                <div style="color: ${associate.remote_available ? '#2ecc71' : '#e74c3c'}; font-size: 0.9rem;">
                                    <i class="fas ${associate.remote_available ? 'fa-check' : 'fa-times'}"></i>
                                    ${associate.remote_available ? 'Disponible' : 'No disponible'}
                                </div>
                            </div>
                        </div>

                        <!-- Regiones -->
                        ${associate.service_regions?.length > 0 ? `
                            <div style="margin-bottom: 20px;">
                                <h5 style="color: #888; margin-bottom: 8px;">Regiones de servicio</h5>
                                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                    ${associate.service_regions.map(r => `
                                        <span style="
                                            font-size: 0.75rem;
                                            padding: 5px 12px;
                                            background: rgba(52, 152, 219, 0.1);
                                            color: #3498db;
                                            border-radius: 15px;
                                        ">
                                            <i class="fas fa-map-marker-alt"></i> ${r}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Acciones -->
                        <div style="display: flex; gap: 10px; justify-content: flex-end; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                            <button onclick="this.closest('#associate-detail-modal').remove()" style="
                                padding: 12px 25px;
                                background: transparent;
                                border: 1px solid rgba(255,255,255,0.2);
                                color: #888;
                                border-radius: 8px;
                                cursor: pointer;
                            ">Cerrar</button>
                            <button onclick="AssociateMarketplace.showContractModal('${associate.id}')" style="
                                padding: 12px 25px;
                                background: linear-gradient(135deg, #20c997, #17a2b8);
                                border: none;
                                color: white;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: 500;
                            ">
                                <i class="fas fa-file-contract"></i> Contratar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

        } catch (error) {
            console.error('[MARKETPLACE] Error loading associate detail:', error);
            showNotification('Error cargando detalle del profesional', 'error');
        }
    }

    /**
     * Mostrar modal de contratación
     */
    function showContractModal(associateId) {
        document.getElementById('associate-detail-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'contract-modal';
        modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
            " onclick="if(event.target === this) this.remove()">
                <div style="
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 15px;
                    width: 500px;
                    padding: 25px;
                ">
                    <h3 style="margin: 0 0 20px; color: #fff;">
                        <i class="fas fa-file-contract" style="color: #20c997;"></i> Crear Contrato
                    </h3>

                    <form id="contract-form">
                        <input type="hidden" name="associateId" value="${associateId}">

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85rem;">
                                Tipo de Contrato *
                            </label>
                            <select name="contractType" required style="
                                width: 100%;
                                padding: 12px;
                                background: rgba(255,255,255,0.05);
                                border: 1px solid rgba(255,255,255,0.1);
                                border-radius: 8px;
                                color: #e0e0e0;
                            ">
                                <option value="permanent">Permanente (acceso a todos los empleados)</option>
                                <option value="eventual">Eventual (empleados asignados específicamente)</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85rem;">
                                Alcance *
                            </label>
                            <select name="scopeType" required style="
                                width: 100%;
                                padding: 12px;
                                background: rgba(255,255,255,0.05);
                                border: 1px solid rgba(255,255,255,0.1);
                                border-radius: 8px;
                                color: #e0e0e0;
                            ">
                                <option value="all_company">Toda la empresa</option>
                                <option value="branches">Por sucursales</option>
                                <option value="departments">Por departamentos</option>
                                <option value="employees">Empleados específicos</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85rem;">
                                Fecha de inicio
                            </label>
                            <input type="date" name="startDate" value="${new Date().toISOString().split('T')[0]}" style="
                                width: 100%;
                                padding: 12px;
                                background: rgba(255,255,255,0.05);
                                border: 1px solid rgba(255,255,255,0.1);
                                border-radius: 8px;
                                color: #e0e0e0;
                            ">
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85rem;">
                                Notas adicionales
                            </label>
                            <textarea name="notes" rows="3" style="
                                width: 100%;
                                padding: 12px;
                                background: rgba(255,255,255,0.05);
                                border: 1px solid rgba(255,255,255,0.1);
                                border-radius: 8px;
                                color: #e0e0e0;
                                resize: vertical;
                            " placeholder="Detalles adicionales del contrato..."></textarea>
                        </div>

                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" onclick="this.closest('#contract-modal').remove()" style="
                                padding: 12px 25px;
                                background: transparent;
                                border: 1px solid rgba(255,255,255,0.2);
                                color: #888;
                                border-radius: 8px;
                                cursor: pointer;
                            ">Cancelar</button>
                            <button type="submit" style="
                                padding: 12px 25px;
                                background: linear-gradient(135deg, #20c997, #17a2b8);
                                border: none;
                                color: white;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: 500;
                            ">
                                <i class="fas fa-check"></i> Crear Contrato
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Handler del form
        document.getElementById('contract-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await createContract(new FormData(e.target));
        });
    }

    /**
     * Crear contrato
     */
    async function createContract(formData) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const data = {
            associateId: formData.get('associateId'),
            contractType: formData.get('contractType'),
            scopeType: formData.get('scopeType'),
            startDate: formData.get('startDate'),
            notes: formData.get('notes')
        };

        try {
            const res = await fetch(`${config.apiBase}/contracts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (result.success) {
                document.getElementById('contract-modal')?.remove();
                await loadContracts();
                switchTab('contracts');
                showNotification('Contrato creado exitosamente', 'success');
            } else {
                showNotification(result.error || 'Error al crear contrato', 'error');
            }

        } catch (error) {
            console.error('[MARKETPLACE] Error creating contract:', error);
            showNotification('Error al crear contrato', 'error');
            document.getElementById('contract-modal')?.remove();
        }
    }

    /**
     * Pausar contrato
     */
    async function pauseContract(contractId) {
        if (!confirm('¿Está seguro de pausar este contrato?')) return;

        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        try {
            const res = await fetch(`${config.apiBase}/contracts/${contractId}/pause`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await res.json();
            if (result.success) {
                await loadContracts();
                switchTab('contracts');
                showNotification('Contrato pausado', 'success');
            } else {
                showNotification(result.error || 'Error', 'error');
            }
        } catch (error) {
            console.error('[MARKETPLACE] Error:', error);
            showNotification('Error pausando contrato', 'error');
        }
    }

    /**
     * Activar contrato
     */
    async function activateContract(contractId) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        try {
            const res = await fetch(`${config.apiBase}/contracts/${contractId}/activate`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await res.json();
            if (result.success) {
                await loadContracts();
                switchTab('contracts');
                showNotification('Contrato reactivado', 'success');
            } else {
                showNotification(result.error || 'Error', 'error');
            }
        } catch (error) {
            console.error('[MARKETPLACE] Error:', error);
            showNotification('Error activando contrato', 'error');
        }
    }

    /**
     * Terminar contrato
     */
    async function terminateContract(contractId) {
        const reason = prompt('Ingrese el motivo de terminación:');
        if (reason === null) return;

        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        try {
            const res = await fetch(`${config.apiBase}/contracts/${contractId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            const result = await res.json();
            if (result.success) {
                await loadContracts();
                switchTab('contracts');
                showNotification('Contrato terminado', 'success');
            } else {
                showNotification(result.error || 'Error', 'error');
            }
        } catch (error) {
            console.error('[MARKETPLACE] Error:', error);
            showNotification('Error terminando contrato', 'error');
        }
    }

    /**
     * Gestionar empleados de contrato eventual
     */
    function manageEmployees(contractId) {
        console.log('[MARKETPLACE] Manage employees for contract:', contractId);
        showNotification('Función de gestión de empleados próximamente', 'info');
        // TODO: Implementar modal de gestión de empleados
    }

    /**
     * Cambiar tab
     */
    function switchTab(tabName) {
        // Actualizar botones
        document.querySelectorAll('.mp-tab').forEach(btn => {
            const isActive = btn.dataset.tab === tabName;
            btn.style.background = isActive ? 'rgba(32, 201, 151, 0.2)' : 'transparent';
            btn.style.borderColor = isActive ? 'rgba(32, 201, 151, 0.3)' : 'rgba(255,255,255,0.1)';
            btn.style.color = isActive ? '#20c997' : '#888';
            btn.classList.toggle('active', isActive);
        });

        // Renderizar contenido
        const content = document.getElementById('mp-content');
        switch (tabName) {
            case 'browse':
                content.innerHTML = renderBrowseTab();
                break;
            case 'contracts':
                content.innerHTML = renderContractsTab();
                break;
        }
    }

    /**
     * Mostrar notificación
     */
    function showNotification(message, type = 'info') {
        const colors = {
            success: '#2ecc71',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#20c997'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${colors[type]};
            color: white;
            border-radius: 8px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            z-index: 10002;
        `;
        notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i> ${message}`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Adjuntar event listeners
     */
    function attachEventListeners(container) {
        container.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.mp-tab');
            if (tabBtn) {
                switchTab(tabBtn.dataset.tab);
            }
        });
    }

    // API pública
    return {
        init,
        switchTab,
        filterByCategory,
        applyFilters,
        clearFilters,
        showAssociateDetail,
        showContractModal,
        pauseContract,
        activateContract,
        terminateContract,
        manageEmployees
    };
})();

// Auto-inicializar
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('associate-marketplace-container');
    if (container) {
        AssociateMarketplace.init('associate-marketplace-container');
    }
});
