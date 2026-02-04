/**
 * MARKETPLACE MODULE v1.0
 * Sistema de Marketplace de servicios y productos para empleados
 * Beneficios corporativos, descuentos y más.
 *
 * Arquitectura: Multi-tenant, Dark Theme Enterprise, PostgreSQL
 *
 * @author Sistema Biometrico Enterprise
 * @version 1.0.0
 */

// Evitar doble carga del módulo
if (window.MarketplaceModuleLoaded) {
    console.log('[MARKETPLACE] Modulo ya cargado, usando instancia existente');
}
window.MarketplaceModuleLoaded = true;

console.log('%c MARKETPLACE v1.0 ', 'background: linear-gradient(90deg, #1a1a2e 0%, #8B5CF6 100%); color: #ffffff; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
window.MarketplaceState = window.MarketplaceState || {
    currentView: 'catalog',
    products: [],
    categories: [],
    cart: [],
    orders: [],
    favorites: [],
    filters: {
        category: null,
        priceRange: null,
        search: ''
    },
    isLoading: false
};
var MarketplaceState = window.MarketplaceState;

// ============================================================================
// CONSTANTS
// ============================================================================
window.MARKETPLACE_CONSTANTS = window.MARKETPLACE_CONSTANTS || {
    CATEGORIES: {
        TECHNOLOGY: { label: 'Tecnologia', color: '#8B5CF6', icon: '💻' },
        HEALTH: { label: 'Salud y Bienestar', color: '#10B981', icon: '🏥' },
        EDUCATION: { label: 'Educacion', color: '#3B82F6', icon: '📚' },
        ENTERTAINMENT: { label: 'Entretenimiento', color: '#F59E0B', icon: '🎬' },
        FOOD: { label: 'Alimentacion', color: '#EF4444', icon: '🍔' },
        TRAVEL: { label: 'Viajes', color: '#06B6D4', icon: '✈️' },
        FITNESS: { label: 'Fitness', color: '#84CC16', icon: '🏋️' },
        SERVICES: { label: 'Servicios', color: '#EC4899', icon: '🛠️' }
    },
    ORDER_STATUS: {
        PENDING: { label: 'Pendiente', color: '#F59E0B', icon: '⏳' },
        APPROVED: { label: 'Aprobado', color: '#10B981', icon: '✅' },
        DELIVERED: { label: 'Entregado', color: '#3B82F6', icon: '📦' },
        CANCELLED: { label: 'Cancelado', color: '#EF4444', icon: '❌' }
    }
};

window.MarketplaceEngine = true;

// ============================================================================
// STYLES
// ============================================================================
function injectMarketplaceStyles() {
    if (document.getElementById('marketplace-styles')) return;

    const style = document.createElement('style');
    style.id = 'marketplace-styles';
    style.textContent = `
        .marketplace-container {
            background: rgba(15, 15, 30, 0.8);
            border-radius: 12px;
            padding: 25px;
            color: var(--text-primary, #e6edf3);
            min-height: 600px;
        }

        .marketplace-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 2px solid rgba(139, 92, 246, 0.3);
        }

        .marketplace-header h2 {
            margin: 0;
            font-size: 1.8rem;
            background: linear-gradient(135deg, #ffffff, #8B5CF6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .marketplace-tabs {
            display: flex;
            gap: 10px;
            margin: 20px 0;
            border-bottom: 2px solid rgba(255,255,255,0.1);
            flex-wrap: wrap;
            padding-bottom: 10px;
        }

        .marketplace-tab-btn {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: rgba(255,255,255,0.7);
            padding: 12px 24px;
            border-radius: 8px 8px 0 0;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
        }

        .marketplace-tab-btn:hover {
            background: rgba(255,255,255,0.1);
            border-color: rgba(139, 92, 246, 0.3);
            color: #8B5CF6;
        }

        .marketplace-tab-btn.active {
            background: linear-gradient(135deg, #8B5CF6, #7C3AED);
            border-color: #8B5CF6;
            color: white;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
        }

        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .product-card {
            background: rgba(30, 30, 50, 0.8);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .product-card:hover {
            transform: translateY(-5px);
            border-color: rgba(139, 92, 246, 0.5);
            box-shadow: 0 10px 30px rgba(139, 92, 246, 0.2);
        }

        .product-image {
            height: 180px;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 4rem;
        }

        .product-info {
            padding: 15px;
        }

        .product-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 8px;
            color: #fff;
        }

        .product-description {
            font-size: 0.85rem;
            color: rgba(255,255,255,0.6);
            margin-bottom: 10px;
            line-height: 1.4;
        }

        .product-price {
            font-size: 1.3rem;
            font-weight: 700;
            color: #10B981;
            margin-bottom: 10px;
        }

        .product-discount {
            background: linear-gradient(135deg, #EF4444, #DC2626);
            color: white;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 10px;
        }

        .product-actions {
            display: flex;
            gap: 10px;
        }

        .btn-add-cart {
            flex: 1;
            background: linear-gradient(135deg, #8B5CF6, #7C3AED);
            border: none;
            color: white;
            padding: 10px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .btn-add-cart:hover {
            transform: scale(1.02);
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
        }

        .btn-favorite {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: #fff;
            width: 44px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .btn-favorite:hover, .btn-favorite.active {
            background: rgba(239, 68, 68, 0.2);
            border-color: #EF4444;
            color: #EF4444;
        }

        .category-filters {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 20px;
        }

        .category-chip {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: rgba(255,255,255,0.7);
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 0.9rem;
        }

        .category-chip:hover, .category-chip.active {
            background: rgba(139, 92, 246, 0.2);
            border-color: #8B5CF6;
            color: #8B5CF6;
        }

        .search-bar {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }

        .search-input {
            flex: 1;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: #fff;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 1rem;
        }

        .search-input::placeholder {
            color: rgba(255,255,255,0.4);
        }

        .cart-badge {
            position: relative;
        }

        .cart-count {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #EF4444;
            color: white;
            font-size: 0.75rem;
            padding: 2px 6px;
            border-radius: 10px;
            font-weight: 600;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: rgba(255,255,255,0.5);
        }

        .empty-state-icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }

        .stats-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }

        .stat-card {
            background: rgba(30, 30, 50, 0.6);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            background: linear-gradient(135deg, #8B5CF6, #3B82F6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .stat-label {
            color: rgba(255,255,255,0.6);
            font-size: 0.9rem;
            margin-top: 5px;
        }
    `;
    document.head.appendChild(style);
}

// ============================================================================
// API FUNCTIONS
// ============================================================================
async function fetchMarketplaceProducts() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const response = await fetch('/api/marketplace/products', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            return await response.json();
        }
        return { products: [] };
    } catch (error) {
        console.log('[MARKETPLACE] API no disponible, usando datos de demo');
        return { products: getDemoProducts() };
    }
}

function getDemoProducts() {
    return [
        {
            id: 1,
            name: 'Descuento Gimnasio FitLife',
            description: '50% de descuento en membresia anual para empleados',
            category: 'FITNESS',
            price: 15000,
            discount: 50,
            icon: '🏋️',
            provider: 'FitLife Gym'
        },
        {
            id: 2,
            name: 'Curso Online - Data Science',
            description: 'Acceso completo a plataforma de cursos tecnicos',
            category: 'EDUCATION',
            price: 25000,
            discount: 30,
            icon: '📚',
            provider: 'TechAcademy'
        },
        {
            id: 3,
            name: 'Plan de Salud Premium',
            description: 'Cobertura medica ampliada para familia',
            category: 'HEALTH',
            price: 45000,
            discount: 20,
            icon: '🏥',
            provider: 'MediCorp'
        },
        {
            id: 4,
            name: 'Netflix Corporativo',
            description: 'Suscripcion premium para empleados',
            category: 'ENTERTAINMENT',
            price: 2500,
            discount: 40,
            icon: '🎬',
            provider: 'Netflix'
        },
        {
            id: 5,
            name: 'Voucher Restaurantes',
            description: 'Credito mensual en red de restaurantes asociados',
            category: 'FOOD',
            price: 8000,
            discount: 15,
            icon: '🍔',
            provider: 'FoodPass'
        },
        {
            id: 6,
            name: 'MacBook Pro - Leasing',
            description: 'Plan de leasing para equipamiento tecnologico',
            category: 'TECHNOLOGY',
            price: 150000,
            discount: 25,
            icon: '💻',
            provider: 'TechLease'
        },
        {
            id: 7,
            name: 'Paquete Vacaciones',
            description: 'Descuentos exclusivos en hoteles y vuelos',
            category: 'TRAVEL',
            price: 80000,
            discount: 35,
            icon: '✈️',
            provider: 'TravelCorp'
        },
        {
            id: 8,
            name: 'Servicio de Lavanderia',
            description: 'Servicio mensual de lavado y planchado',
            category: 'SERVICES',
            price: 5000,
            discount: 20,
            icon: '🧺',
            provider: 'CleanPro'
        }
    ];
}

// ============================================================================
// RENDER FUNCTIONS
// ============================================================================
function renderMarketplace() {
    // Buscar contenedor en orden de prioridad
    const container = document.getElementById('mainContent') || document.getElementById('module-content');
    if (!container) {
        console.error('[MARKETPLACE] No se encontró contenedor (mainContent ni module-content)');
        return;
    }
    console.log('[MARKETPLACE] Usando contenedor:', container.id);

    injectMarketplaceStyles();

    container.innerHTML = `
        <div class="marketplace-container">
            <div class="marketplace-header">
                <h2>🛒 Marketplace Corporativo</h2>
                <div class="cart-badge">
                    <button class="btn-add-cart" onclick="MarketplaceModule.showCart()">
                        🛒 Mi Carrito
                    </button>
                    <span class="cart-count" id="cart-count">${MarketplaceState.cart.length}</span>
                </div>
            </div>

            <div class="stats-row">
                <div class="stat-card">
                    <div class="stat-value" id="stat-products">0</div>
                    <div class="stat-label">Productos Disponibles</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="stat-savings">$0</div>
                    <div class="stat-label">Ahorro Potencial</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="stat-categories">0</div>
                    <div class="stat-label">Categorias</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="stat-orders">0</div>
                    <div class="stat-label">Mis Pedidos</div>
                </div>
            </div>

            <div class="marketplace-tabs">
                <button class="marketplace-tab-btn active" onclick="MarketplaceModule.switchTab('catalog')">
                    📦 Catalogo
                </button>
                <button class="marketplace-tab-btn" onclick="MarketplaceModule.switchTab('favorites')">
                    ❤️ Favoritos
                </button>
                <button class="marketplace-tab-btn" onclick="MarketplaceModule.switchTab('orders')">
                    📋 Mis Pedidos
                </button>
                <button class="marketplace-tab-btn" onclick="MarketplaceModule.switchTab('cart')">
                    🛒 Carrito
                </button>
            </div>

            <div class="search-bar">
                <input type="text" class="search-input" placeholder="Buscar productos, servicios, beneficios..."
                       onkeyup="MarketplaceModule.handleSearch(this.value)">
            </div>

            <div class="category-filters" id="category-filters">
                ${renderCategoryFilters()}
            </div>

            <div id="marketplace-content">
                <div class="products-grid" id="products-grid">
                    <!-- Products will be loaded here -->
                </div>
            </div>
        </div>
    `;

    loadMarketplaceData();
}

function renderCategoryFilters() {
    const categories = window.MARKETPLACE_CONSTANTS.CATEGORIES;
    let html = `<span class="category-chip active" onclick="MarketplaceModule.filterByCategory(null)">Todos</span>`;

    for (const [key, cat] of Object.entries(categories)) {
        html += `<span class="category-chip" data-category="${key}" onclick="MarketplaceModule.filterByCategory('${key}')">${cat.icon} ${cat.label}</span>`;
    }

    return html;
}

function renderProducts(products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    if (!products || products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">🛒</div>
                <h3>No hay productos disponibles</h3>
                <p>Pronto agregaremos nuevos beneficios y servicios para ti</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = products.map(product => {
        const category = window.MARKETPLACE_CONSTANTS.CATEGORIES[product.category] || { icon: '📦', label: 'Otro' };
        const discountedPrice = product.discount ? product.price * (1 - product.discount / 100) : product.price;
        const isFavorite = MarketplaceState.favorites.includes(product.id);

        return `
            <div class="product-card">
                <div class="product-image">${product.icon || category.icon}</div>
                <div class="product-info">
                    ${product.discount ? `<span class="product-discount">-${product.discount}%</span>` : ''}
                    <div class="product-title">${product.name}</div>
                    <div class="product-description">${product.description}</div>
                    <div class="product-price">
                        $${discountedPrice.toLocaleString()}
                        ${product.discount ? `<small style="text-decoration:line-through;color:#888;margin-left:8px;">$${product.price.toLocaleString()}</small>` : ''}
                    </div>
                    <div class="product-actions">
                        <button class="btn-add-cart" onclick="MarketplaceModule.addToCart(${product.id})">
                            Agregar 🛒
                        </button>
                        <button class="btn-favorite ${isFavorite ? 'active' : ''}" onclick="MarketplaceModule.toggleFavorite(${product.id})">
                            ${isFavorite ? '❤️' : '🤍'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateStats() {
    const products = MarketplaceState.products;
    const totalSavings = products.reduce((sum, p) => {
        if (p.discount) {
            return sum + (p.price * p.discount / 100);
        }
        return sum;
    }, 0);

    const categories = new Set(products.map(p => p.category));

    document.getElementById('stat-products').textContent = products.length;
    document.getElementById('stat-savings').textContent = `$${totalSavings.toLocaleString()}`;
    document.getElementById('stat-categories').textContent = categories.size;
    document.getElementById('stat-orders').textContent = MarketplaceState.orders.length;
}

// ============================================================================
// DATA LOADING
// ============================================================================
async function loadMarketplaceData() {
    MarketplaceState.isLoading = true;

    try {
        const data = await fetchMarketplaceProducts();
        MarketplaceState.products = data.products || getDemoProducts();
        renderProducts(MarketplaceState.products);
        updateStats();
    } catch (error) {
        console.error('[MARKETPLACE] Error cargando datos:', error);
        MarketplaceState.products = getDemoProducts();
        renderProducts(MarketplaceState.products);
        updateStats();
    }

    MarketplaceState.isLoading = false;
}

// ============================================================================
// MODULE ACTIONS
// ============================================================================
const MarketplaceModule = {
    init: function() {
        console.log('[MARKETPLACE] Inicializando modulo...');
        renderMarketplace();
    },

    switchTab: function(tab) {
        MarketplaceState.currentView = tab;

        document.querySelectorAll('.marketplace-tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        const content = document.getElementById('marketplace-content');

        switch(tab) {
            case 'catalog':
                content.innerHTML = `<div class="products-grid" id="products-grid"></div>`;
                renderProducts(MarketplaceState.products);
                break;
            case 'favorites':
                const favProducts = MarketplaceState.products.filter(p => MarketplaceState.favorites.includes(p.id));
                content.innerHTML = `<div class="products-grid" id="products-grid"></div>`;
                renderProducts(favProducts.length ? favProducts : []);
                break;
            case 'orders':
                this.showOrders();
                break;
            case 'cart':
                this.showCart();
                break;
        }
    },

    filterByCategory: function(category) {
        MarketplaceState.filters.category = category;

        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.classList.remove('active');
            if ((category === null && !chip.dataset.category) || chip.dataset.category === category) {
                chip.classList.add('active');
            }
        });

        let filtered = MarketplaceState.products;
        if (category) {
            filtered = filtered.filter(p => p.category === category);
        }
        if (MarketplaceState.filters.search) {
            const search = MarketplaceState.filters.search.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(search) ||
                p.description.toLowerCase().includes(search)
            );
        }

        renderProducts(filtered);
    },

    handleSearch: function(value) {
        MarketplaceState.filters.search = value;
        this.filterByCategory(MarketplaceState.filters.category);
    },

    addToCart: function(productId) {
        const product = MarketplaceState.products.find(p => p.id === productId);
        if (product) {
            MarketplaceState.cart.push(product);
            document.getElementById('cart-count').textContent = MarketplaceState.cart.length;
            this.showNotification(`${product.name} agregado al carrito`, 'success');
        }
    },

    toggleFavorite: function(productId) {
        const index = MarketplaceState.favorites.indexOf(productId);
        if (index > -1) {
            MarketplaceState.favorites.splice(index, 1);
            this.showNotification('Eliminado de favoritos', 'info');
        } else {
            MarketplaceState.favorites.push(productId);
            this.showNotification('Agregado a favoritos', 'success');
        }

        if (MarketplaceState.currentView === 'catalog') {
            renderProducts(MarketplaceState.products);
        } else if (MarketplaceState.currentView === 'favorites') {
            const favProducts = MarketplaceState.products.filter(p => MarketplaceState.favorites.includes(p.id));
            renderProducts(favProducts);
        }
    },

    showCart: function() {
        const content = document.getElementById('marketplace-content');

        if (MarketplaceState.cart.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🛒</div>
                    <h3>Tu carrito esta vacio</h3>
                    <p>Explora el catalogo y agrega productos</p>
                </div>
            `;
            return;
        }

        const total = MarketplaceState.cart.reduce((sum, p) => {
            const price = p.discount ? p.price * (1 - p.discount / 100) : p.price;
            return sum + price;
        }, 0);

        content.innerHTML = `
            <div style="background: rgba(30,30,50,0.6); border-radius: 12px; padding: 20px;">
                <h3 style="margin-bottom: 20px;">Tu Carrito (${MarketplaceState.cart.length} items)</h3>
                ${MarketplaceState.cart.map((p, idx) => `
                    <div style="display: flex; align-items: center; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 10px;">
                        <span style="font-size: 2rem; margin-right: 15px;">${p.icon || '📦'}</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">${p.name}</div>
                            <div style="color: #10B981; font-size: 1.1rem;">$${(p.discount ? p.price * (1 - p.discount / 100) : p.price).toLocaleString()}</div>
                        </div>
                        <button onclick="MarketplaceModule.removeFromCart(${idx})" style="background: rgba(239,68,68,0.2); border: none; color: #EF4444; padding: 8px 15px; border-radius: 6px; cursor: pointer;">
                            Eliminar
                        </button>
                    </div>
                `).join('')}
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: rgba(255,255,255,0.6);">Total:</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #10B981;">$${total.toLocaleString()}</div>
                    </div>
                    <button class="btn-add-cart" onclick="MarketplaceModule.checkout()">
                        Solicitar Beneficios 🎉
                    </button>
                </div>
            </div>
        `;
    },

    removeFromCart: function(index) {
        MarketplaceState.cart.splice(index, 1);
        document.getElementById('cart-count').textContent = MarketplaceState.cart.length;
        this.showCart();
    },

    showOrders: function() {
        const content = document.getElementById('marketplace-content');

        if (MarketplaceState.orders.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h3>No tienes pedidos aun</h3>
                    <p>Solicita beneficios del catalogo para verlos aqui</p>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div style="background: rgba(30,30,50,0.6); border-radius: 12px; padding: 20px;">
                <h3 style="margin-bottom: 20px;">Mis Pedidos</h3>
                ${MarketplaceState.orders.map(order => `
                    <div style="padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="font-weight: 600;">Pedido #${order.id}</span>
                            <span style="background: ${order.statusColor}; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem;">${order.status}</span>
                        </div>
                        <div style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">${order.date}</div>
                        <div style="color: #10B981; font-weight: 600; margin-top: 5px;">$${order.total.toLocaleString()}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    checkout: function() {
        if (MarketplaceState.cart.length === 0) return;

        const total = MarketplaceState.cart.reduce((sum, p) => {
            const price = p.discount ? p.price * (1 - p.discount / 100) : p.price;
            return sum + price;
        }, 0);

        const order = {
            id: Date.now(),
            items: [...MarketplaceState.cart],
            total: total,
            status: 'Pendiente',
            statusColor: 'rgba(245, 158, 11, 0.3)',
            date: new Date().toLocaleDateString()
        };

        MarketplaceState.orders.push(order);
        MarketplaceState.cart = [];
        document.getElementById('cart-count').textContent = '0';

        this.showNotification('Solicitud enviada exitosamente!', 'success');
        this.switchTab('orders');
        updateStats();
    },

    showNotification: function(message, type = 'info') {
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            info: '#3B82F6',
            warning: '#F59E0B'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// Make globally available
window.MarketplaceModule = MarketplaceModule;

// ✅ Función de inicialización estándar para el sistema de módulos
function showMarketplaceContent() {
    console.log('[MARKETPLACE] showMarketplaceContent ejecutándose...');
    const container = document.getElementById('mainContent') || document.getElementById('module-content');
    if (container) {
        MarketplaceModule.init();
    } else {
        console.error('[MARKETPLACE] No se encontró contenedor para el módulo');
    }
}

// ✅ Exportar función de inicialización a window
window.showMarketplaceContent = showMarketplaceContent;

// ✅ Registrar en sistema de módulos unificado
if (!window.Modules) window.Modules = {};
window.Modules.marketplace = {
    init: showMarketplaceContent,
    name: 'Marketplace',
    version: '1.0.0'
};

console.log('✅ [MARKETPLACE] Módulo cargado y registrado correctamente');
