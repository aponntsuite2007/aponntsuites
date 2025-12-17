/**
 * BENEFITS & AMENITIES MANAGEMENT SYSTEM v2.0
 * Sistema Enterprise de Gestión de Beneficios Laborales
 *
 * Arquitectura: Multi-tenant, Dark Theme Enterprise, PostgreSQL
 * Tecnologías: Node.js + PostgreSQL + Sequelize
 *
 * @author Sistema Biométrico Enterprise
 * @version 2.0.0
 */

// Evitar doble carga del módulo
if (window.BenefitsEngine) {
    console.log('[BENEFITS] Módulo ya cargado');
    throw new Error('BenefitsModule already loaded');
}

console.log('%c BENEFITS & AMENITIES v2.0 ', 'background: linear-gradient(90deg, #1a1a2e 0%, #10B981 100%); color: #ffffff; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

// ============================================================================
// STATE MANAGEMENT - Redux-like pattern
// ============================================================================
const BenefitsState = {
    currentView: 'dashboard',
    benefitTypes: [],
    companyPolicies: [],
    employeeBenefits: [],
    assignedAssets: [],
    contractTemplates: [],
    benefitStats: {},
    currentEmployeeFilter: null,
    currentBenefitFilter: null,
    isLoading: false
};

// ============================================================================
// CONSTANTS - Categorías y configuración
// ============================================================================
const BENEFITS_CONSTANTS = {
    CATEGORIES: {
        CHILDCARE: { label: 'Cuidado Infantil', color: '#FF6B6B', icon: '👶' },
        EDUCATION: { label: 'Educación', color: '#4ECDC4', icon: '📚' },
        HOUSING: { label: 'Vivienda', color: '#45B7D1', icon: '🏠' },
        TRANSPORTATION: { label: 'Transporte', color: '#FFA07A', icon: '🚗' },
        TECHNOLOGY: { label: 'Tecnología', color: '#98D8C8', icon: '💻' },
        HEALTH: { label: 'Salud', color: '#F7B731', icon: '🏥' },
        BONUS: { label: 'Bonos', color: '#5F27CD', icon: '💰' },
        INSURANCE: { label: 'Seguros', color: '#00D2D3', icon: '🛡️' },
        OTHER: { label: 'Otros', color: '#95A5A6', icon: '📦' }
    },
    BENEFIT_NATURES: {
        RECURRING: { label: 'Recurrente', icon: '🔄' },
        ONE_TIME: { label: 'Una vez', icon: '1️⃣' },
        ASSET_LOAN: { label: 'Préstamo de activo', icon: '🚗' },
        EXPENSE_ALLOWANCE: { label: 'Límite de gastos', icon: '💳' }
    },
    RECURRENCE_PERIODS: {
        MONTHLY: 'Mensual',
        BIWEEKLY: 'Quincenal',
        ANNUAL: 'Anual',
        SEMIANNUAL: 'Semestral'
    },
    ASSET_TYPES: {
        VEHICLE: { label: 'Vehículo', icon: '🚗' },
        MOBILE_PHONE: { label: 'Teléfono Móvil', icon: '📱' },
        LAPTOP: { label: 'Laptop', icon: '💻' },
        TABLET: { label: 'Tablet', icon: '📱' },
        DESKTOP: { label: 'Computadora de Escritorio', icon: '🖥️' },
        TOOL: { label: 'Herramienta', icon: '🔧' },
        EQUIPMENT: { label: 'Equipo', icon: '⚙️' },
        OTHER: { label: 'Otro', icon: '📦' }
    }
};

// Marcar el módulo como cargado
window.BenefitsEngine = true;

// ============================================================================
// INYECCIÓN DE ESTILOS EN HEAD (PATRÓN CORRECTO)
// ============================================================================
function injectBenefitsStyles() {
    // Evitar duplicados
    if (document.getElementById('benefits-management-styles')) return;

    const style = document.createElement('style');
    style.id = 'benefits-management-styles';
    style.textContent = `            /* Benefits Module Dark Theme Styles */
            .benefits-container {
                background: rgba(15, 15, 30, 0.8);
                border-radius: 12px;
                padding: 25px;
                color: var(--text-primary, #e6edf3);
            }

            .benefits-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 25px;
                padding-bottom: 20px;
                border-bottom: 2px solid rgba(245, 158, 11, 0.3);
            }

            .benefits-header h2 {
                margin: 0;
                font-size: 1.8rem;
                background: linear-gradient(135deg, #ffffff, #10B981);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .benefits-tabs {
                display: flex;
                gap: 10px;
                margin: 20px 0;
                border-bottom: 2px solid rgba(255,255,255,0.1);
                flex-wrap: wrap;
                overflow-x: auto;
                padding-bottom: 10px;
            }

            .benefits-tab-btn {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                color: rgba(255,255,255,0.7);
                padding: 12px 24px;
                border-radius: 8px 8px 0 0;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: 500;
                white-space: nowrap;
            }

            .benefits-tab-btn:hover {
                background: rgba(255,255,255,0.1);
                border-color: rgba(16, 185, 129, 0.3);
                color: #10B981;
            }

            .benefits-tab-btn.active {
                background: linear-gradient(135deg, #10B981, #059669);
                border-color: #10B981;
                color: white;
                box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
            }

            .dark-card {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                transition: all 0.3s ease;
            }

            .dark-card:hover {
                background: rgba(255,255,255,0.05);
                border-color: rgba(16, 185, 129, 0.3);
                box-shadow: 0 4px 20px rgba(16, 185, 129, 0.1);
            }

            .stat-card-dark {
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2));
                border: 1px solid rgba(16, 185, 129, 0.3);
                border-radius: 12px;
                padding: 25px;
                color: white;
                position: relative;
                overflow: hidden;
            }

            .stat-card-dark::before {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                width: 100px;
                height: 100px;
                background: radial-gradient(circle, rgba(255,255,255,0.1), transparent);
                border-radius: 50%;
            }

            .stat-value {
                font-size: 2.5rem;
                font-weight: 700;
                margin-bottom: 8px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }

            .stat-label {
                font-size: 0.95rem;
                opacity: 0.9;
                font-weight: 500;
            }

            .section-header-dark {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding: 15px;
                background: rgba(255,255,255,0.03);
                border-radius: 8px;
                border-left: 4px solid #10B981;
            }

            .section-header-dark h3 {
                margin: 0;
                color: #10B981;
                font-size: 1.4rem;
            }

            .benefit-type-card-dark {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 12px;
                padding: 20px;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .benefit-type-card-dark::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                background: var(--category-color, #10B981);
                opacity: 0.5;
            }

            .benefit-type-card-dark:hover {
                background: rgba(255,255,255,0.06);
                border-color: rgba(16, 185, 129, 0.3);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.15);
            }

            .category-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .btn-dark {
                background: linear-gradient(135deg, #10B981, #059669);
                border: none;
                color: white;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
            }

            .btn-dark:hover {
                background: linear-gradient(135deg, #059669, #047857);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                transform: translateY(-1px);
            }

            .btn-dark.btn-secondary {
                background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
                border: 1px solid rgba(255,255,255,0.2);
            }

            .btn-dark.btn-secondary:hover {
                background: rgba(255,255,255,0.15);
            }

            .empty-state-dark {
                text-align: center;
                padding: 60px 20px;
                background: rgba(255,255,255,0.03);
                border-radius: 12px;
                border: 2px dashed rgba(255,255,255,0.1);
            }

            .empty-state-dark .emoji {
                font-size: 4rem;
                margin-bottom: 20px;
                display: block;
            }

            .empty-state-dark h3 {
                color: rgba(255,255,255,0.7);
                margin-bottom: 10px;
            }

            .empty-state-dark p {
                color: rgba(255,255,255,0.5);
                margin-bottom: 25px;
            }

            .info-banner {
                background: rgba(16, 185, 129, 0.1);
                border: 1px solid rgba(16, 185, 129, 0.3);
                border-left: 4px solid #10B981;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
                color: rgba(255,255,255,0.9);
            }

            .warning-banner {
                background: rgba(245, 158, 11, 0.1);
                border: 1px solid rgba(245, 158, 11, 0.3);
                border-left: 4px solid #f59e0b;
            }

            .filter-section-dark {
                background: rgba(255,255,255,0.03);
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
                border: 1px solid rgba(255,255,255,0.1);
            }

            .filter-section-dark select,
            .filter-section-dark input {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                transition: all 0.3s ease;
            }

            .filter-section-dark select:focus,
            .filter-section-dark input:focus {
                outline: none;
                border-color: #10B981;
                box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
            }

            .policy-card-dark {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 12px;
                padding: 20px;
                position: relative;
            }

            .policy-card-dark.active {
                border-left: 4px solid #10B981;
            }

            .policy-card-dark.inactive {
                border-left: 4px solid rgba(255,255,255,0.3);
                opacity: 0.7;
            }

            .expiring-card-dark {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 12px;
                padding: 20px;
            }

            .expiring-card-dark.high-urgency {
                border-left: 4px solid #f44336;
            }

            .expiring-card-dark.medium-urgency {
                border-left: 4px solid #ff9800;
            }

            .expiring-card-dark.low-urgency {
                border-left: 4px solid #ffc107;
            }

            .modal-dark {
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(8px);
            }

            .modal-content-dark {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                padding: 30px;
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                color: white;
            }

            .modal-header-dark {
                border-bottom: 2px solid rgba(16, 185, 129, 0.3);
                padding-bottom: 15px;
                margin-bottom: 25px;
            }

            .modal-header-dark h3 {
                margin: 0;
                font-size: 1.6rem;
                background: linear-gradient(135deg, #ffffff, #10B981);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .form-group-dark {
                margin-bottom: 20px;
            }

            .form-group-dark label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: rgba(255,255,255,0.9);
            }

            .form-group-dark input,
            .form-group-dark select,
            .form-group-dark textarea {
                width: 100%;
                padding: 12px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 6px;
                color: white;
                font-size: 1rem;
                transition: all 0.3s ease;
            }

            .form-group-dark input:focus,
            .form-group-dark select:focus,
            .form-group-dark textarea:focus {
                outline: none;
                border-color: #10B981;
                box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
            }

            .form-group-dark input::placeholder,
            .form-group-dark textarea::placeholder {
                color: rgba(255,255,255,0.4);
            }

            .form-group-dark small {
                display: block;
                margin-top: 6px;
                color: rgba(255,255,255,0.6);
                font-size: 0.85rem;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }

            .notification-dark {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                z-index: 10001;
                animation: slideIn 0.3s ease;
                color: white;
                font-weight: 500;
                backdrop-filter: blur(10px);
            }

            .notification-dark.success {
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9));
                border-left: 4px solid #10B981;
            }

            .notification-dark.error {
                background: linear-gradient(135deg, rgba(244, 67, 54, 0.9), rgba(211, 47, 47, 0.9));
                border-left: 4px solid #f44336;
            }

            .notification-dark.info {
                background: linear-gradient(135deg, rgba(33, 150, 243, 0.9), rgba(25, 118, 210, 0.9));
                border-left: 4px solid #2196F3;
            }
`;

    document.head.appendChild(style);
    console.log('🎨 [BENEFITS] Estilos dark theme inyectados en <head>');
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================
function showBenefitsManagementContent() {
    // Inyectar estilos ANTES de renderizar contenido
    injectBenefitsStyles();

    const content = document.getElementById('mainContent');
    if (!content) return;

    content.innerHTML = `
        <div class="benefits-container">
            <div class="benefits-header">
                <h2>🎁 Beneficios y Amenidades Laborales</h2>
                <button class="btn-dark" onclick="refreshBenefitsData()">🔄 Actualizar</button>
            </div>

            <p style="color: rgba(255,255,255,0.7); margin-bottom: 25px;">
                Sistema Enterprise de gestión integral: viáticos, guarderías, vehículos, bonos, subsidios, tecnología y más.
            </p>

            <!-- Tabs de navegación -->
            <div class="benefits-tabs">
                <button class="benefits-tab-btn active" onclick="showBenefitsTab('dashboard')" data-tab="dashboard">
                    📊 Dashboard
                </button>
                <button class="benefits-tab-btn" onclick="showBenefitsTab('catalog')" data-tab="catalog">
                    📚 Catálogo
                </button>
                <button class="benefits-tab-btn" onclick="showBenefitsTab('policies')" data-tab="policies">
                    ⚙️ Políticas
                </button>
                <button class="benefits-tab-btn" onclick="showBenefitsTab('assignments')" data-tab="assignments">
                    👥 Asignaciones
                </button>
                <button class="benefits-tab-btn" onclick="showBenefitsTab('assets')" data-tab="assets">
                    🚗 Activos
                </button>
                <button class="benefits-tab-btn" onclick="showBenefitsTab('contracts')" data-tab="contracts">
                    📄 Contratos
                </button>
                <button class="benefits-tab-btn" onclick="showBenefitsTab('expiring')" data-tab="expiring">
                    ⏰ Vencimientos
                </button>
            </div>

            <!-- Contenido dinámico -->
            <div id="benefits-content" style="margin-top: 25px;">
                <!-- El contenido se cargará dinámicamente -->
            </div>
        </div>
    `;

    // Inicializar con el dashboard
    setTimeout(() => {
        loadBenefitsData();
        showBenefitsTab('dashboard');
    }, 300);
}

// ============================================================================
// TAB NAVIGATION
// ============================================================================
function showBenefitsTab(tabName) {
    console.log(`🎁 [BENEFITS] Cambiando a pestaña: ${tabName}`);

    // Actualizar botones de pestaña
    document.querySelectorAll('.benefits-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Cargar contenido de la pestaña
    const benefitsContent = document.getElementById('benefits-content');
    if (!benefitsContent) return;

    BenefitsState.currentView = tabName;

    switch (tabName) {
        case 'dashboard':
            showDashboardTab();
            break;
        case 'catalog':
            showCatalogTab();
            break;
        case 'policies':
            showPoliciesTab();
            break;
        case 'assignments':
            showAssignmentsTab();
            break;
        case 'assets':
            showAssetsTab();
            break;
        case 'contracts':
            showContractsTab();
            break;
        case 'expiring':
            showExpiringTab();
            break;
        default:
            benefitsContent.innerHTML = '<div class="empty-state-dark">Pestaña no encontrada</div>';
    }
}

// ============================================================================
// TAB 1: DASHBOARD
// ============================================================================
function showDashboardTab() {
    const benefitsContent = document.getElementById('benefits-content');
    benefitsContent.innerHTML = `
        <div class="section-header-dark">
            <h3>📊 Dashboard de Beneficios</h3>
        </div>

        <!-- Estadísticas principales -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 25px 0;">
            <div class="stat-card-dark" style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));">
                <div class="stat-value" id="total-benefits">--</div>
                <div class="stat-label">Total Beneficios Activos</div>
            </div>

            <div class="stat-card-dark" style="background: linear-gradient(135deg, rgba(240, 147, 251, 0.3), rgba(245, 87, 108, 0.3));">
                <div class="stat-value" id="employees-with-benefits">--</div>
                <div class="stat-label">Empleados con Beneficios</div>
            </div>

            <div class="stat-card-dark" style="background: linear-gradient(135deg, rgba(79, 172, 254, 0.3), rgba(0, 242, 254, 0.3));">
                <div class="stat-value" id="pending-approval">--</div>
                <div class="stat-label">Pendientes de Aprobación</div>
            </div>

            <div class="stat-card-dark" style="background: linear-gradient(135deg, rgba(67, 233, 123, 0.3), rgba(56, 249, 215, 0.3));">
                <div class="stat-value" id="total-amount">$0</div>
                <div class="stat-label">Monto Total Mensual</div>
            </div>
        </div>

        <!-- Beneficios por categoría -->
        <div class="dark-card" style="margin-top: 25px;">
            <h4 style="margin-bottom: 20px; color: #10B981;">📈 Distribución por Categoría</h4>
            <div id="category-chart-container" style="background: rgba(255,255,255,0.02); padding: 20px; border-radius: 8px;">
                <canvas id="category-chart" style="max-height: 300px;"></canvas>
            </div>
        </div>

        <!-- Acciones rápidas -->
        <div class="dark-card" style="margin-top: 25px;">
            <h4 style="margin-bottom: 15px; color: #10B981;">⚡ Acciones Rápidas</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <button class="btn-dark" onclick="showBenefitsTab('assignments'); setTimeout(() => openAssignBenefitModal(), 300);">
                    ➕ Asignar Beneficio
                </button>
                <button class="btn-dark" onclick="showBenefitsTab('policies'); setTimeout(() => openPolicyModal(), 300);">
                    ⚙️ Configurar Política
                </button>
                <button class="btn-dark" onclick="showBenefitsTab('expiring');">
                    ⏰ Ver Vencimientos
                </button>
                <button class="btn-dark" onclick="exportBenefitsReport();">
                    📊 Exportar Reporte
                </button>
            </div>
        </div>
    `;

    // Cargar estadísticas
    loadDashboardStats();
}

async function loadDashboardStats() {
    try {
        const companyId = window.currentCompany?.company_id || window.currentCompany?.id;
        if (!companyId) {
            console.error('No hay empresa seleccionada');
            return;
        }

        const response = await fetch(`/api/benefits/stats/${companyId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Error al cargar estadísticas');

        const data = await response.json();
        BenefitsState.benefitStats = data.stats || {};

        // Actualizar números
        document.getElementById('total-benefits').textContent = BenefitsState.benefitStats.active_benefits || 0;
        document.getElementById('employees-with-benefits').textContent = BenefitsState.benefitStats.employees_with_benefits || 0;
        document.getElementById('pending-approval').textContent = BenefitsState.benefitStats.pending_approval || 0;
        document.getElementById('total-amount').textContent = formatCurrency(BenefitsState.benefitStats.total_amount || 0);

        // Renderizar gráfico
        if (data.by_category && data.by_category.length > 0) {
            renderCategoryChart(data.by_category);
        }

    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        showNotification('Error al cargar estadísticas', 'error');
    }
}

function renderCategoryChart(categoryData) {
    const canvas = document.getElementById('category-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const labels = categoryData.map(item => BENEFITS_CONSTANTS.CATEGORIES[item.category]?.label || item.category);
    const counts = categoryData.map(item => item.count);
    const backgroundColors = categoryData.map(item => BENEFITS_CONSTANTS.CATEGORIES[item.category]?.color || '#95A5A6');

    // Simple bar chart usando canvas (sin dependencias)
    renderSimpleBarChart(ctx, labels, counts, backgroundColors);
}

function renderSimpleBarChart(ctx, labels, data, colors) {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const maxValue = Math.max(...data);
    const barWidth = Math.min((width / data.length) - 20, 80);
    const barGap = 20;

    data.forEach((value, index) => {
        const barHeight = (value / maxValue) * (height - 60);
        const x = index * (barWidth + barGap) + 20;
        const y = height - barHeight - 30;

        // Dibujar barra con gradiente
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, colors[index]);
        gradient.addColorStop(1, colors[index] + '80');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Dibujar valor
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(value, x + barWidth/2, y - 8);

        // Dibujar label
        ctx.save();
        ctx.translate(x + barWidth/2, height - 8);
        ctx.rotate(-Math.PI / 6);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(labels[index], 0, 0);
        ctx.restore();
    });
}

// ============================================================================
// TAB 2: CATÁLOGO DE BENEFICIOS
// ============================================================================
function showCatalogTab() {
    const benefitsContent = document.getElementById('benefits-content');
    benefitsContent.innerHTML = `
        <div class="section-header-dark">
            <h3>📚 Catálogo de Tipos de Beneficios</h3>
            <div>
                <select id="category-filter" onchange="filterCatalog()" style="padding: 8px 15px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 6px;">
                    <option value="all">Todas las categorías</option>
                    ${Object.entries(BENEFITS_CONSTANTS.CATEGORIES).map(([key, cat]) => `
                        <option value="${key}">${cat.icon} ${cat.label}</option>
                    `).join('')}
                </select>
            </div>
        </div>

        <div id="catalog-list" class="catalog-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; margin-top: 20px;">
            <!-- Se cargará dinámicamente -->
        </div>
    `;

    loadBenefitTypesData();
}

async function loadBenefitTypesData(category = null) {
    try {
        let url = '/api/benefits/types?active=true';
        if (category && category !== 'all') {
            url += `&category=${category}`;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Error al cargar tipos de beneficios');

        const data = await response.json();
        BenefitsState.benefitTypes = data.types || [];

        renderCatalogList();

    } catch (error) {
        console.error('Error cargando catálogo:', error);
        showNotification('Error al cargar catálogo de beneficios', 'error');
    }
}

function renderCatalogList() {
    const container = document.getElementById('catalog-list');
    if (!container) return;

    if (BenefitsState.benefitTypes.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dark" style="grid-column: 1 / -1;">
                <span class="emoji">📦</span>
                <h3>No hay tipos de beneficios disponibles</h3>
                <p>Configure los tipos de beneficios en el sistema</p>
            </div>
        `;
        return;
    }

    container.innerHTML = BenefitsState.benefitTypes.map(type => {
        const categoryInfo = BENEFITS_CONSTANTS.CATEGORIES[type.category] || BENEFITS_CONSTANTS.CATEGORIES.OTHER;
        return `
            <div class="benefit-type-card-dark" style="--category-color: ${categoryInfo.color};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <h4 style="margin: 0; color: white; flex: 1;">${categoryInfo.icon} ${type.name}</h4>
                    <span class="category-badge" style="background: ${categoryInfo.color}; color: white;">
                        ${categoryInfo.label}
                    </span>
                </div>

                <p style="color: rgba(255,255,255,0.7); font-size: 0.95rem; margin-bottom: 15px; min-height: 60px;">
                    ${type.description || 'Sin descripción'}
                </p>

                <div style="font-size: 0.9rem; color: rgba(255,255,255,0.8); margin-bottom: 15px;">
                    <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        <span style="color: #10B981;">●</span>
                        <strong>Naturaleza:</strong>
                        <span>${BENEFITS_CONSTANTS.BENEFIT_NATURES[type.benefit_nature]?.label || type.benefit_nature}</span>
                    </div>

                    ${type.recurrence_period ? `
                        <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                            <span style="color: #10B981;">●</span>
                            <strong>Frecuencia:</strong> ${BENEFITS_CONSTANTS.RECURRENCE_PERIODS[type.recurrence_period]}
                        </div>
                    ` : ''}

                    <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        <span style="color: #10B981;">●</span>
                        <strong>Aprobación:</strong> ${type.requires_approval ? '✅ Requiere' : '❌ No requiere'}
                    </div>

                    ${type.integrates_with_payroll ? `
                        <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px; color: #10B981;">
                            <span>●</span>
                            <strong>💰 Integra con nómina</strong>
                        </div>
                    ` : ''}
                </div>

                <div style="display: flex; gap: 10px;">
                    <button class="btn-dark" style="flex: 1;" onclick="assignBenefitFromCatalog(${type.id})">
                        ➕ Asignar
                    </button>
                    <button class="btn-dark btn-secondary" onclick="viewBenefitTypeDetails(${type.id})">
                        👁️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function filterCatalog() {
    const category = document.getElementById('category-filter').value;
    loadBenefitTypesData(category);
}

// ============================================================================
// TAB 3: POLÍTICAS DE EMPRESA
// ============================================================================
function showPoliciesTab() {
    const benefitsContent = document.getElementById('benefits-content');
    benefitsContent.innerHTML = `
        <div class="section-header-dark">
            <h3>⚙️ Políticas de Beneficios</h3>
            <button class="btn-dark" onclick="openPolicyModal()">➕ Nueva Política</button>
        </div>

        <div class="info-banner">
            <p style="margin: 0;">
                <strong>💡 Políticas de Beneficios:</strong> Configure qué beneficios ofrece la empresa, montos máximos, requisitos de antigüedad, roles elegibles y niveles de aprobación.
            </p>
        </div>

        <div id="policies-list" style="margin-top: 20px;">
            <!-- Se cargará dinámicamente -->
        </div>
    `;

    loadCompanyPolicies();
}

async function loadCompanyPolicies() {
    try {
        const companyId = window.currentCompany?.company_id || window.currentCompany?.id;
        if (!companyId) {
            showNotification('No hay empresa seleccionada', 'error');
            return;
        }

        const response = await fetch(`/api/benefits/policies/${companyId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Error al cargar políticas');

        const data = await response.json();
        BenefitsState.companyPolicies = data.policies || [];

        renderPoliciesList();

    } catch (error) {
        console.error('Error cargando políticas:', error);
        showNotification('Error al cargar políticas', 'error');
    }
}

function renderPoliciesList() {
    const container = document.getElementById('policies-list');
    if (!container) return;

    if (BenefitsState.companyPolicies.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dark">
                <span class="emoji">📋</span>
                <h3>No hay políticas configuradas</h3>
                <p>Cree su primera política para comenzar a ofrecer beneficios</p>
                <button class="btn-dark" onclick="openPolicyModal()">➕ Crear Primera Política</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="display: grid; gap: 15px;">
            ${BenefitsState.companyPolicies.map(policy => `
                <div class="policy-card-dark ${policy.is_enabled ? 'active' : 'inactive'}">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <h4 style="margin: 0; color: white;">${policy.benefit_name}</h4>
                                <span class="category-badge" style="background: ${policy.is_enabled ? '#10B981' : 'rgba(255,255,255,0.3)'};">
                                    ${policy.is_enabled ? '✅ Activa' : '⏸️ Inactiva'}
                                </span>
                            </div>

                            <div style="font-size: 0.9rem; color: rgba(255,255,255,0.8); margin-top: 15px;">
                                ${policy.max_amount ? `
                                    <div style="margin-bottom: 8px;">
                                        <strong>💰 Monto máximo:</strong> ${formatCurrency(policy.max_amount)}
                                    </div>
                                ` : ''}

                                ${policy.duration_months ? `
                                    <div style="margin-bottom: 8px;">
                                        <strong>📅 Duración:</strong> ${policy.duration_months} meses
                                    </div>
                                ` : ''}

                                <div style="margin-bottom: 8px;">
                                    <strong>✅ Aprobación:</strong> ${policy.requires_approval ? `Requiere ${policy.approval_levels || 1} nivel(es)` : 'No requiere'}
                                </div>

                                ${policy.min_seniority_months ? `
                                    <div style="margin-bottom: 8px;">
                                        <strong>⏱️ Antigüedad mínima:</strong> ${policy.min_seniority_months} meses
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <div style="display: flex; gap: 8px;">
                            <button class="btn-dark btn-secondary" onclick="editPolicy(${policy.id})" title="Editar">
                                ✏️
                            </button>
                            <button class="btn-dark ${policy.is_enabled ? 'btn-secondary' : ''}" onclick="togglePolicyStatus(${policy.id})" title="${policy.is_enabled ? 'Desactivar' : 'Activar'}">
                                ${policy.is_enabled ? '⏸️' : '▶️'}
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Continúa en el siguiente mensaje...
function openPolicyModal(policyId = null) {
    const policy = policyId ? BenefitsState.companyPolicies.find(p => p.id === policyId) : null;

    const modalHTML = `
        <form id="policy-form" style="max-width: 700px; margin: 0 auto;">
            <div class="form-group-dark">
                <label>Tipo de Beneficio *</label>
                <select id="policy-benefit-type" required>
                    <option value="">Seleccione un beneficio...</option>
                    ${BenefitsState.benefitTypes.map(type => {
                        const categoryInfo = BENEFITS_CONSTANTS.CATEGORIES[type.category] || BENEFITS_CONSTANTS.CATEGORIES.OTHER;
                        return `
                            <option value="${type.id}" ${policy && policy.benefit_type_id === type.id ? 'selected' : ''}>
                                ${categoryInfo.icon} ${type.name} (${categoryInfo.label})
                            </option>
                        `;
                    }).join('')}
                </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <label style="display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.9); cursor: pointer;">
                        <input type="checkbox" id="policy-enabled" ${policy?.is_enabled !== false ? 'checked' : ''}>
                        <span>Política activa</span>
                    </label>
                </div>

                <div>
                    <label style="display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.9); cursor: pointer;">
                        <input type="checkbox" id="policy-requires-approval" ${policy?.requires_approval !== false ? 'checked' : ''}>
                        <span>Requiere aprobación</span>
                    </label>
                </div>
            </div>

            <div class="form-group-dark">
                <label>💰 Monto máximo (opcional)</label>
                <input type="number" id="policy-max-amount" step="0.01" value="${policy?.max_amount || ''}" placeholder="Ej: 50000">
                <small>Dejar vacío si no tiene límite monetario</small>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="form-group-dark">
                    <label>📅 Duración (meses)</label>
                    <input type="number" id="policy-duration" value="${policy?.duration_months || 12}" min="1">
                </div>

                <div class="form-group-dark">
                    <label>✅ Niveles de aprobación</label>
                    <input type="number" id="policy-approval-levels" value="${policy?.approval_levels || 1}" min="1" max="5">
                </div>
            </div>

            <div class="form-group-dark">
                <label>⏱️ Antigüedad mínima (meses)</label>
                <input type="number" id="policy-min-seniority" value="${policy?.min_seniority_months || ''}" min="0" placeholder="0 = sin requisito">
                <small>0 = no requiere antigüedad mínima</small>
            </div>

            <div class="form-group-dark">
                <label>📋 Términos y condiciones (opcional)</label>
                <textarea id="policy-terms" rows="4" placeholder="Describe los términos y condiciones de este beneficio...">${policy?.terms_and_conditions || ''}</textarea>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 30px;">
                <button type="button" class="btn-dark btn-secondary" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn-dark">💾 Guardar Política</button>
            </div>
        </form>
    `;

    showModal('Configurar Política de Beneficio', modalHTML);

    setTimeout(() => {
        document.getElementById('policy-form').addEventListener('submit', (e) => {
            e.preventDefault();
            saveBenefitPolicy(policyId);
        });
    }, 100);
}

async function saveBenefitPolicy(policyId) {
    try {
        const companyId = window.currentCompany?.company_id || window.currentCompany?.id;

        const policyData = {
            company_id: companyId,
            benefit_type_id: parseInt(document.getElementById('policy-benefit-type').value),
            is_enabled: document.getElementById('policy-enabled').checked,
            max_amount: parseFloat(document.getElementById('policy-max-amount').value) || null,
            duration_months: parseInt(document.getElementById('policy-duration').value) || null,
            requires_approval: document.getElementById('policy-requires-approval').checked,
            approval_levels: parseInt(document.getElementById('policy-approval-levels').value) || 1,
            min_seniority_months: parseInt(document.getElementById('policy-min-seniority').value) || null,
            terms_and_conditions: document.getElementById('policy-terms').value || null
        };

        const response = await fetch('/api/benefits/policies', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(policyData)
        });

        if (!response.ok) throw new Error('Error al guardar política');

        const data = await response.json();

        showNotification(`Política ${data.action === 'created' ? 'creada' : 'actualizada'} exitosamente`, 'success');
        closeModal();
        loadCompanyPolicies();

    } catch (error) {
        console.error('Error guardando política:', error);
        showNotification('Error al guardar política', 'error');
    }
}

async function togglePolicyStatus(policyId) {
    const policy = BenefitsState.companyPolicies.find(p => p.id === policyId);
    if (!policy) return;

    policy.is_enabled = !policy.is_enabled;
    renderPoliciesList();
    showNotification(`Política ${policy.is_enabled ? 'activada' : 'desactivada'}`, 'success');
}

function editPolicy(policyId) {
    openPolicyModal(policyId);
}

// ============================================================================
// TAB 4: ASIGNACIONES
// ============================================================================
function showAssignmentsTab() {
    const benefitsContent = document.getElementById('benefits-content');
    benefitsContent.innerHTML = `
        <div class="section-header-dark">
            <h3>👥 Asignaciones de Beneficios</h3>
            <button class="btn-dark" onclick="openAssignBenefitModal()">➕ Asignar Beneficio</button>
        </div>

        <div class="filter-section-dark">
            <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                <div>
                    <label style="margin-right: 8px;">Estado:</label>
                    <select id="assignment-status-filter" onchange="filterAssignments()">
                        <option value="all">Todos</option>
                        <option value="active">Activos</option>
                        <option value="pending_approval">Pendientes</option>
                        <option value="expired">Vencidos</option>
                    </select>
                </div>
                <div>
                    <label style="margin-right: 8px;">Buscar empleado:</label>
                    <input type="text" id="employee-search" onkeyup="filterAssignments()" placeholder="Nombre...">
                </div>
            </div>
        </div>

        <div id="assignments-list" style="margin-top: 20px;">
            <!-- Se cargará dinámicamente -->
        </div>
    `;

    loadEmployeeBenefits();
}

async function loadEmployeeBenefits(userId = null, status = null) {
    try {
        const container = document.getElementById('assignments-list');
        if (container) {
            container.innerHTML = `
                <div class="empty-state-dark">
                    <span class="emoji">📋</span>
                    <h3>Lista de Asignaciones</h3>
                    <p>Aquí se mostrarán los beneficios asignados a empleados</p>
                    <button class="btn-dark" onclick="openAssignBenefitModal()">➕ Asignar Primer Beneficio</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando asignaciones:', error);
    }
}

async function openAssignBenefitModal() {
    try {
        const [usersResponse, typesResponse] = await Promise.all([
            fetch('/api/v1/users', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }),
            fetch('/api/benefits/types?active=true', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
        ]);

        const usersData = await usersResponse.json();
        const typesData = await typesResponse.json();

        const employees = usersData.users || [];
        const types = typesData.types || BenefitsState.benefitTypes;

        const today = new Date().toISOString().split('T')[0];
        const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

        const modalHTML = `
            <form id="assign-benefit-form" style="max-width: 700px; margin: 0 auto;">
                <div class="form-group-dark">
                    <label>👤 Empleado *</label>
                    <select id="benefit-employee" required>
                        <option value="">Seleccione un empleado...</option>
                        ${employees.map(emp => `
                            <option value="${emp.user_id}">${emp.firstName || ''} ${emp.lastName || ''} - ${emp.email}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group-dark">
                    <label>🎁 Tipo de Beneficio *</label>
                    <select id="benefit-type" required onchange="updateBenefitFields()">
                        <option value="">Seleccione un tipo...</option>
                        ${types.map(type => {
                            const categoryInfo = BENEFITS_CONSTANTS.CATEGORIES[type.category] || BENEFITS_CONSTANTS.CATEGORIES.OTHER;
                            return `
                                <option value="${type.id}" data-nature="${type.benefit_nature}" data-recurrence="${type.recurrence_period || ''}">
                                    ${categoryInfo.icon} ${type.name} (${categoryInfo.label})
                                </option>
                            `;
                        }).join('')}
                    </select>
                </div>

                <div class="form-group-dark">
                    <label>💰 Monto Asignado (ARS)</label>
                    <input type="number" id="benefit-amount" step="0.01" min="0" placeholder="0.00">
                    <small>Dejar en 0 si es un beneficio sin monto monetario</small>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="form-group-dark">
                        <label>📅 Vigencia Desde *</label>
                        <input type="date" id="benefit-from" value="${today}" required>
                    </div>
                    <div class="form-group-dark">
                        <label>📅 Vigencia Hasta *</label>
                        <input type="date" id="benefit-until" value="${nextYear}" required>
                    </div>
                </div>

                <div class="form-group-dark">
                    <label>📝 Notas / Observaciones</label>
                    <textarea id="benefit-notes" rows="4" placeholder="Información adicional sobre esta asignación..."></textarea>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 30px;">
                    <button type="button" class="btn-dark btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn-dark">✅ Asignar Beneficio</button>
                </div>
            </form>
        `;

        showModal('Asignar Beneficio a Empleado', modalHTML);

        setTimeout(() => {
            const form = document.getElementById('assign-benefit-form');
            if (form) {
                form.addEventListener('submit', handleAssignBenefit);
            }
        }, 100);

    } catch (error) {
        console.error('Error opening assign benefit modal:', error);
        showNotification('Error al cargar formulario de asignación', 'error');
    }
}

function updateBenefitFields() {
    const select = document.getElementById('benefit-type');
    const selectedOption = select.options[select.selectedIndex];
    const nature = selectedOption.dataset.nature;
    // Aquí se puede agregar lógica para mostrar/ocultar campos según la naturaleza del beneficio
}

async function handleAssignBenefit(e) {
    e.preventDefault();

    const userId = document.getElementById('benefit-employee').value;
    const benefitTypeId = document.getElementById('benefit-type').value;
    const amount = parseFloat(document.getElementById('benefit-amount').value) || 0;
    const effectiveFrom = document.getElementById('benefit-from').value;
    const effectiveUntil = document.getElementById('benefit-until').value;
    const notes = document.getElementById('benefit-notes').value;

    if (!userId || !benefitTypeId) {
        showNotification('Por favor complete todos los campos obligatorios', 'error');
        return;
    }

    try {
        const companyId = window.currentCompany?.company_id || window.currentCompany?.id;

        const response = await fetch('/api/benefits/assign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                user_id: userId,
                company_id: companyId,
                benefit_type_id: parseInt(benefitTypeId),
                assigned_amount: amount,
                effective_from: effectiveFrom,
                effective_until: effectiveUntil,
                notes: notes
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('✅ Beneficio asignado exitosamente', 'success');
            closeModal();
            loadEmployeeBenefits();
        } else {
            showNotification(data.error || 'Error al asignar beneficio', 'error');
        }
    } catch (error) {
        console.error('Error assigning benefit:', error);
        showNotification('Error al asignar beneficio', 'error');
    }
}

// ============================================================================
// TAB 5: ACTIVOS ASIGNADOS
// ============================================================================
function showAssetsTab() {
    const benefitsContent = document.getElementById('benefits-content');
    benefitsContent.innerHTML = `
        <div class="section-header-dark">
            <h3>🚗 Activos Asignados (Comodatos)</h3>
            <button class="btn-dark" onclick="openAssignAssetModal()">➕ Asignar Activo</button>
        </div>

        <div class="info-banner warning-banner">
            <p style="margin: 0;">
                <strong>💡 Gestión de Activos:</strong> Vehículos, teléfonos móviles, laptops y otros bienes en préstamo. Genera contratos de comodato automáticamente.
            </p>
        </div>

        <div id="assets-list" style="margin-top: 20px;">
            <div class="empty-state-dark">
                <span class="emoji">🚗📱💻</span>
                <h3>Control de Activos</h3>
                <p>Gestión de vehículos, tecnología y equipamiento asignado a empleados</p>
                <button class="btn-dark" onclick="openAssignAssetModal()">➕ Asignar Primer Activo</button>
            </div>
        </div>
    `;
}

async function openAssignAssetModal() {
    try {
        const usersResponse = await fetch('/api/v1/users', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const usersData = await usersResponse.json();
        const employees = usersData.users || [];

        const today = new Date().toISOString().split('T')[0];

        const modalHTML = `
            <form id="assign-asset-form" style="max-width: 700px; margin: 0 auto;">
                <div class="form-group-dark">
                    <label>👤 Empleado *</label>
                    <select id="asset-employee" required>
                        <option value="">Seleccione un empleado...</option>
                        ${employees.map(emp => `
                            <option value="${emp.user_id}">${emp.firstName || ''} ${emp.lastName || ''} - ${emp.email}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group-dark">
                    <label>🏷️ Tipo de Activo *</label>
                    <select id="asset-type" required onchange="toggleAssetFields()">
                        <option value="">Seleccione tipo...</option>
                        ${Object.entries(BENEFITS_CONSTANTS.ASSET_TYPES).map(([key, asset]) => `
                            <option value="${key}">${asset.icon} ${asset.label}</option>
                        `).join('')}
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="form-group-dark">
                        <label>🏭 Marca *</label>
                        <input type="text" id="asset-brand" required placeholder="Ej: Toyota, Apple, Dell...">
                    </div>
                    <div class="form-group-dark">
                        <label>📋 Modelo *</label>
                        <input type="text" id="asset-model" required placeholder="Ej: Corolla 2024, iPhone 14...">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="form-group-dark">
                        <label>🔢 Número de Serie / IMEI</label>
                        <input type="text" id="asset-serial" placeholder="Opcional">
                    </div>
                    <div class="form-group-dark" id="asset-plate-container" style="display: none;">
                        <label>🚘 Patente / Matrícula</label>
                        <input type="text" id="asset-plate" placeholder="Ej: AB123CD">
                    </div>
                </div>

                <div class="form-group-dark" id="asset-vin-container" style="display: none;">
                    <label>🔐 VIN (Número de Chasis)</label>
                    <input type="text" id="asset-vin" placeholder="Número de chasis del vehículo">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="form-group-dark">
                        <label>💵 Valor del Activo (ARS)</label>
                        <input type="number" id="asset-value" step="0.01" min="0" placeholder="0.00">
                    </div>
                    <div class="form-group-dark">
                        <label>📅 Fecha de Asignación *</label>
                        <input type="date" id="asset-assignment-date" value="${today}" required>
                    </div>
                </div>

                <div class="form-group-dark">
                    <label>📅 Fecha de Devolución Esperada</label>
                    <input type="date" id="asset-return-date">
                    <small>Opcional - para préstamos temporales</small>
                </div>

                <div class="form-group-dark">
                    <label>📝 Notas / Observaciones</label>
                    <textarea id="asset-notes" rows="4" placeholder="Estado del activo, accesorios incluidos, etc..."></textarea>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 30px;">
                    <button type="button" class="btn-dark btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn-dark">✅ Asignar Activo</button>
                </div>
            </form>
        `;

        showModal('Asignar Activo en Comodato', modalHTML);

        setTimeout(() => {
            const form = document.getElementById('assign-asset-form');
            if (form) {
                form.addEventListener('submit', handleAssignAsset);
            }
        }, 100);

    } catch (error) {
        console.error('Error opening assign asset modal:', error);
        showNotification('Error al cargar formulario de asignación de activos', 'error');
    }
}

function toggleAssetFields() {
    const assetType = document.getElementById('asset-type').value;
    const plateContainer = document.getElementById('asset-plate-container');
    const vinContainer = document.getElementById('asset-vin-container');

    if (assetType === 'VEHICLE') {
        plateContainer.style.display = 'block';
        vinContainer.style.display = 'block';
    } else {
        plateContainer.style.display = 'none';
        vinContainer.style.display = 'none';
    }
}

async function handleAssignAsset(e) {
    e.preventDefault();

    const userId = document.getElementById('asset-employee').value;
    const assetType = document.getElementById('asset-type').value;
    const brand = document.getElementById('asset-brand').value;
    const model = document.getElementById('asset-model').value;
    const serialNumber = document.getElementById('asset-serial').value;
    const plate = document.getElementById('asset-plate')?.value || null;
    const vin = document.getElementById('asset-vin')?.value || null;
    const value = parseFloat(document.getElementById('asset-value').value) || 0;
    const assignmentDate = document.getElementById('asset-assignment-date').value;
    const returnDate = document.getElementById('asset-return-date').value || null;
    const notes = document.getElementById('asset-notes').value;

    if (!userId || !assetType || !brand || !model) {
        showNotification('Por favor complete todos los campos obligatorios', 'error');
        return;
    }

    try {
        const response = await fetch('/api/benefits/assets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                user_id: userId,
                asset_type: assetType,
                asset_brand: brand,
                asset_model: model,
                asset_serial_number: serialNumber,
                asset_plate_number: plate,
                asset_vin: vin,
                asset_value: value,
                assignment_date: assignmentDate,
                expected_return_date: returnDate,
                notes: notes
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('✅ Activo asignado exitosamente', 'success');
            closeModal();
            showAssetsTab();
        } else {
            showNotification(data.error || 'Error al asignar activo', 'error');
        }
    } catch (error) {
        console.error('Error assigning asset:', error);
        showNotification('Error al asignar activo', 'error');
    }
}

// ============================================================================
// TAB 6: CONTRATOS
// ============================================================================
function showContractsTab() {
    const benefitsContent = document.getElementById('benefits-content');
    benefitsContent.innerHTML = `
        <div class="section-header-dark">
            <h3>📄 Generación de Contratos Legales</h3>
            <button class="btn-dark" onclick="openGenerateContractModal()">📝 Generar Contrato</button>
        </div>

        <div class="info-banner" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3);">
            <p style="margin: 0; color: rgba(255,255,255,0.9);">
                <strong>✅ Templates Disponibles:</strong> Comodato de Vehículo, Deslinde de Responsabilidad, Contrato de Vivienda (Argentina)
            </p>
        </div>

        <div id="contracts-list" style="margin-top: 20px;">
            <!-- Se cargará dinámicamente -->
        </div>
    `;

    loadContractTemplates();
}

async function loadContractTemplates() {
    try {
        const response = await fetch('/api/benefits/contract/templates', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Error al cargar templates');

        const data = await response.json();
        BenefitsState.contractTemplates = data.templates || [];

        renderContractTemplates();

    } catch (error) {
        console.error('Error cargando templates:', error);
        showNotification('Error al cargar templates de contratos', 'error');
    }
}

function renderContractTemplates() {
    const container = document.getElementById('contracts-list');
    if (!container) return;

    if (BenefitsState.contractTemplates.length === 0) {
        container.innerHTML = '<div class="empty-state-dark"><span class="emoji">📄</span><h3>No hay templates disponibles</h3></div>';
        return;
    }

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">
            ${BenefitsState.contractTemplates.map(template => `
                <div class="dark-card">
                    <div style="display: flex; align-items: start; gap: 15px; margin-bottom: 15px;">
                        <div style="font-size: 2.5rem;">📄</div>
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 8px 0; color: white;">${template.title}</h4>
                            <div style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">
                                <div style="margin-bottom: 4px;"><strong>País:</strong> ${getCountryFlag(template.country_code)} ${template.country_code}</div>
                                <div style="margin-bottom: 4px;"><strong>Versión:</strong> ${template.version}</div>
                                <div><strong>Categoría:</strong> ${template.category}</div>
                            </div>
                        </div>
                    </div>

                    ${template.legal_references ? `
                        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; font-size: 0.85rem; color: rgba(255,255,255,0.8); margin-bottom: 15px;">
                            <strong>Base legal:</strong> ${template.legal_references}
                        </div>
                    ` : ''}

                    <button class="btn-dark" style="width: 100%;" onclick="generateContractFromTemplate(${template.id}, '${template.template_type_code}')">
                        📝 Generar Contrato
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

function getCountryFlag(countryCode) {
    const flags = {
        'ARG': '🇦🇷',
        'MEX': '🇲🇽',
        'CHL': '🇨🇱',
        'COL': '🇨🇴',
        'PER': '🇵🇪'
    };
    return flags[countryCode] || '🌎';
}

async function openGenerateContractModal() {
    showNotification('🚧 Generación de contratos en desarrollo', 'info');
}

function generateContractFromTemplate(templateId, templateCode) {
    showNotification(`Generando ${templateCode}...`, 'info');
}

// ============================================================================
// TAB 7: VENCIMIENTOS
// ============================================================================
function showExpiringTab() {
    const benefitsContent = document.getElementById('benefits-content');
    benefitsContent.innerHTML = `
        <div class="section-header-dark">
            <h3>⏰ Beneficios Próximos a Vencer</h3>
            <div>
                <select id="expiring-days-filter" onchange="loadExpiringBenefits()" style="padding: 8px 15px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 6px;">
                    <option value="7">Próximos 7 días</option>
                    <option value="15">Próximos 15 días</option>
                    <option value="30" selected>Próximos 30 días</option>
                    <option value="60">Próximos 60 días</option>
                </select>
            </div>
        </div>

        <div id="expiring-list" style="margin-top: 20px;">
            <!-- Se cargará dinámicamente -->
        </div>
    `;

    loadExpiringBenefits();
}

async function loadExpiringBenefits() {
    try {
        const days = document.getElementById('expiring-days-filter')?.value || 30;
        const companyId = window.currentCompany?.company_id || window.currentCompany?.id;

        const response = await fetch(`/api/benefits/expiring/${days}?companyId=${companyId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Error al cargar vencimientos');

        const data = await response.json();
        const expiringBenefits = data.expiring_benefits || [];

        renderExpiringList(expiringBenefits);

    } catch (error) {
        console.error('Error cargando vencimientos:', error);
        showNotification('Error al cargar beneficios próximos a vencer', 'error');
    }
}

function renderExpiringList(benefits) {
    const container = document.getElementById('expiring-list');
    if (!container) return;

    if (benefits.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dark" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3);">
                <span class="emoji">✅</span>
                <h3 style="color: #10B981;">¡Todo al día!</h3>
                <p style="color: rgba(255,255,255,0.7);">No hay beneficios próximos a vencer en este período</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="display: grid; gap: 15px;">
            ${benefits.map(benefit => {
                const daysLeft = benefit.days_until_expiration;
                const urgencyClass = daysLeft <= 7 ? 'high-urgency' : daysLeft <= 15 ? 'medium-urgency' : 'low-urgency';
                const urgencyColor = daysLeft <= 7 ? '#f44336' : daysLeft <= 15 ? '#ff9800' : '#ffc107';

                return `
                    <div class="expiring-card-dark ${urgencyClass}">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1;">
                                <h4 style="margin: 0 0 8px 0; color: white;">${benefit.employee_name}</h4>
                                <div style="color: rgba(255,255,255,0.8); font-size: 0.95rem; margin-bottom: 12px;">
                                    <strong>${benefit.benefit_name}</strong>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                                    <span class="category-badge" style="background: ${urgencyColor}; color: white; font-weight: bold;">
                                        ${daysLeft} días restantes
                                    </span>
                                    <span style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">
                                        Vence: ${new Date(benefit.effective_until).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <button class="btn-dark" onclick="renewBenefitPrompt(${benefit.benefit_id})">
                                🔄 Renovar
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renewBenefitPrompt(benefitId) {
    showNotification('🚧 Renovación de beneficios en desarrollo', 'info');
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================
async function loadBenefitsData() {
    try {
        const typesResponse = await fetch('/api/benefits/types?active=true', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (typesResponse.ok) {
            const typesData = await typesResponse.json();
            BenefitsState.benefitTypes = typesData.types || [];
        }

        console.log('🎁 [BENEFITS] Datos iniciales cargados');

    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
    }
}

async function refreshBenefitsData() {
    showNotification('Actualizando datos...', 'info');
    await loadBenefitsData();

    const activeTab = document.querySelector('.benefits-tab-btn.active');
    if (activeTab) {
        const tabName = activeTab.dataset.tab;
        showBenefitsTab(tabName);
    }

    showNotification('Datos actualizados', 'success');
}

function assignBenefitFromCatalog(typeId) {
    const type = BenefitsState.benefitTypes.find(t => t.id === typeId);
    if (type) {
        showBenefitsTab('assignments');
        setTimeout(() => openAssignBenefitModal(), 300);
    }
}

function viewBenefitTypeDetails(typeId) {
    const type = BenefitsState.benefitTypes.find(t => t.id === typeId);
    if (!type) return;

    const categoryInfo = BENEFITS_CONSTANTS.CATEGORIES[type.category] || BENEFITS_CONSTANTS.CATEGORIES.OTHER;
    const natureInfo = BENEFITS_CONSTANTS.BENEFIT_NATURES[type.benefit_nature];

    const modalHTML = `
        <div style="max-width: 600px;">
            <div class="dark-card" style="margin-bottom: 20px;">
                <h4 style="color: #10B981; margin-bottom: 15px;">Información General</h4>
                <div style="color: rgba(255,255,255,0.9);">
                    <p style="margin-bottom: 10px;"><strong>Código:</strong> ${type.code}</p>
                    <p style="margin-bottom: 10px;"><strong>Categoría:</strong> ${categoryInfo.icon} ${categoryInfo.label}</p>
                    <p style="margin-bottom: 10px;"><strong>Naturaleza:</strong> ${natureInfo?.icon || ''} ${natureInfo?.label || type.benefit_nature}</p>
                    ${type.description ? `<p style="margin-bottom: 10px;"><strong>Descripción:</strong> ${type.description}</p>` : ''}
                </div>
            </div>

            <div class="dark-card">
                <h4 style="color: #10B981; margin-bottom: 15px;">Configuración</h4>
                <div style="color: rgba(255,255,255,0.9); line-height: 1.8;">
                    <p>✅ Requiere aprobación: ${type.requires_approval ? 'Sí' : 'No'}</p>
                    <p>📄 Documentación obligatoria: ${type.requires_documentation ? 'Sí' : 'No'}</p>
                    <p>⏱️ Tiene vencimiento: ${type.has_expiration ? 'Sí' : 'No'}</p>
                    <p>🔄 Requiere renovación: ${type.requires_renewal ? 'Sí' : 'No'}</p>
                    <p>💰 Integra con nómina: ${type.integrates_with_payroll ? 'Sí' : 'No'}</p>
                </div>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px;">
                <button class="btn-dark btn-secondary" onclick="closeModal()">Cerrar</button>
                <button class="btn-dark" onclick="closeModal(); assignBenefitFromCatalog(${type.id});">
                    ➕ Asignar este Beneficio
                </button>
            </div>
        </div>
    `;

    showModal(`Detalles: ${type.name}`, modalHTML);
}

function filterAssignments() {
    console.log('🔍 Filtrar asignaciones');
}

function exportBenefitsReport() {
    showNotification('🚧 Exportación de reportes en desarrollo', 'info');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    }).format(amount);
}

// ============================================================================
// MODAL & NOTIFICATION SYSTEM
// ============================================================================
function showModal(title, content) {
    const existingModal = document.getElementById('benefits-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'benefits-modal';
    modal.className = 'modal-dark';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    modal.innerHTML = `
        <div class="modal-content-dark">
            <div class="modal-header-dark">
                <h3>${title}</h3>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    document.body.appendChild(modal);
}

function closeModal() {
    const modal = document.getElementById('benefits-modal');
    if (modal) {
        modal.remove();
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification-dark ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================================================
// INITIALIZATION
// ============================================================================
console.log('🎁 [BENEFITS] Módulo Enterprise de Beneficios cargado completamente v2.0');
