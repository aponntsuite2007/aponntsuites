/**
 * hse-management.js
 * Modulo de Seguridad e Higiene Laboral (HSE)
 * Frontend Enterprise Dark Theme
 *
 * Tabs:
 * 1. Dashboard - KPIs y alertas
 * 2. Catalogo EPP - CRUD de elementos
 * 3. Matriz Rol-EPP - Asignacion por posicion
 * 4. Entregas - Registro y tracking
 * 5. Inspecciones - Checklist y acciones
 * 6. Configuracion - Estandares y alertas
 *
 * @version 1.0.0
 * @date 2025-12-07
 */

// ============================================================================
// ESTADO GLOBAL (usando var para evitar error de redeclaracion)
// ============================================================================
var hseState = window.hseState || {
    currentTab: 'dashboard',
    categories: [],
    catalog: [],
    requirements: [],
    deliveries: [],
    inspections: [],
    config: null,
    positions: [],
    employees: [],
    dashboardKPIs: null
};

// ============================================================================
// SISTEMA DE AYUDA CONTEXTUAL - REGISTRO EN ModuleHelpSystem
// ============================================================================
if (typeof ModuleHelpSystem !== 'undefined') {
    ModuleHelpSystem.registerModule('hse-management', {
        moduleName: 'Seguridad e Higiene Laboral (HSE)',
        moduleDescription: 'Gestion integral de Equipos de Proteccion Personal (EPP), matriz de riesgos por rol, entregas con firma digital, inspecciones periodicas y notificaciones automaticas de vencimiento.',
        contexts: {
            dashboard: {
                title: 'Dashboard de HSE',
                description: 'Vista general del estado de seguridad e higiene. Muestra KPIs criticos, EPP proximos a vencer y alertas prioritarias.',
                tips: [
                    'Los EPP en rojo requieren atencion inmediata - estan vencidos o por vencer en menos de 7 dias',
                    'El porcentaje de cumplimiento ideal es >95% para evitar riesgos legales',
                    'Puede exportar reportes a Excel/PDF desde el boton de cada seccion'
                ],
                warnings: [
                    'Los EPP vencidos pueden generar multas y responsabilidades legales',
                    'Verifique que todos los empleados tengan su EPP antes de ingresar a areas de riesgo'
                ],
                helpTopics: [
                    '¿Como interpretar los KPIs del dashboard?',
                    '¿Que hacer cuando un EPP esta vencido?',
                    '¿Como programar inspecciones periodicas?'
                ],
                fieldHelp: {
                    'kpi-total': 'Cantidad total de EPP entregados actualmente activos',
                    'kpi-expiring': 'EPP que venceran en los proximos 30 dias',
                    'kpi-expired': 'EPP ya vencidos que requieren reemplazo urgente',
                    'kpi-compliance': 'Porcentaje de empleados con todo su EPP al dia'
                }
            },
            catalog: {
                title: 'Catalogo de EPP',
                description: 'Administre el inventario de Equipos de Proteccion Personal disponibles para su empresa.',
                tips: [
                    'Cada EPP debe tener certificaciones validas (SRT, NOM-017, NR-6 segun region)',
                    'La vida util se calcula desde la fecha de entrega, no de fabricacion',
                    'Puede vincular instructivos de uso desde el modulo de Procedimientos'
                ],
                warnings: [
                    'No elimine EPP que tengan entregas activas - desactivelo en su lugar',
                    'Verifique las certificaciones antes de agregar nuevos EPP'
                ],
                helpTopics: [
                    '¿Como agregar un nuevo EPP al catalogo?',
                    '¿Que certificaciones son validas en mi pais?',
                    '¿Como calcular la vida util correcta?'
                ],
                fieldHelp: {
                    'code': 'Codigo unico para identificar el EPP (ej: CASCO-01, GUANTE-NITRILO-M)',
                    'name': 'Nombre descriptivo del equipo de proteccion',
                    'category': 'Tipo de proteccion: Cabeza, Ojos, Manos, Pies, etc.',
                    'brand': 'Marca del fabricante (3M, MSA, Honeywell, etc.)',
                    'model': 'Modelo especifico del producto',
                    'certifications': 'Certificaciones de calidad (separadas por coma)',
                    'lifespan': 'Dias de vida util desde la entrega (ej: 365 para 1 año)',
                    'sizes': 'Talles disponibles: S, M, L, XL, etc.'
                }
            },
            matrix: {
                title: 'Matriz Rol-EPP',
                description: 'Defina que EPP requiere cada puesto de trabajo segun su nivel de riesgo.',
                tips: [
                    'Vincule con posiciones del modulo Estructura Organizacional para consistencia',
                    'Marque como "Obligatorio" los EPP criticos para el puesto',
                    'Puede definir vida util especial si un rol tiene desgaste mayor'
                ],
                warnings: [
                    'Los cambios en la matriz afectan los requerimientos de todos los empleados del rol',
                    'Asegurese de notificar a los afectados cuando modifique requisitos'
                ],
                helpTopics: [
                    '¿Como asignar EPP a un puesto de trabajo?',
                    '¿Que es la prioridad de EPP?',
                    '¿Como definir vida util especial por rol?'
                ],
                fieldHelp: {
                    'position': 'Puesto de trabajo que requiere el EPP',
                    'epp': 'Equipo de proteccion a asignar',
                    'mandatory': 'Si esta marcado, el empleado NO puede trabajar sin este EPP',
                    'priority': 'Critico=1, Importante=2, Complementario=3',
                    'quantity': 'Cantidad de unidades (ej: 2 pares de guantes)',
                    'custom_lifespan': 'Vida util especifica para este rol (override del catalogo)'
                }
            },
            deliveries: {
                title: 'Entregas de EPP',
                description: 'Registre y gestione las entregas de EPP a empleados con firma digital.',
                tips: [
                    'La fecha de reemplazo se calcula automaticamente segun vida util',
                    'Use firma digital para mayor validez legal',
                    'Puede ver el historial completo de entregas por empleado'
                ],
                warnings: [
                    'Verifique el talle correcto antes de confirmar la entrega',
                    'Las entregas firmadas no pueden modificarse, solo reemplazarse'
                ],
                helpTopics: [
                    '¿Como registrar una nueva entrega?',
                    '¿Como obtener la firma del empleado?',
                    '¿Como reemplazar un EPP danado?'
                ],
                fieldHelp: {
                    'employee': 'Empleado que recibe el EPP',
                    'epp': 'Equipo de proteccion a entregar',
                    'delivery_date': 'Fecha de entrega (por defecto hoy)',
                    'size': 'Talle del EPP entregado',
                    'serial_number': 'Numero de serie del EPP (si aplica)',
                    'batch': 'Lote de fabricacion para trazabilidad',
                    'signature': 'Firma digital del empleado confirmando recepcion'
                }
            },
            inspections: {
                title: 'Inspecciones de EPP',
                description: 'Programe y registre inspecciones periodicas del estado de los EPP.',
                tips: [
                    'Se recomienda inspeccionar EPP criticos cada 90 dias',
                    'Documente con fotos cualquier dano encontrado',
                    'Complete las acciones correctivas en el plazo indicado'
                ],
                warnings: [
                    'Los EPP en mal estado deben retirarse de circulacion inmediatamente',
                    'Las inspecciones vencidas pueden afectar el cumplimiento normativo'
                ],
                helpTopics: [
                    '¿Cada cuanto debo inspeccionar los EPP?',
                    '¿Que checklist usar para cada tipo de EPP?',
                    '¿Como documentar defectos encontrados?'
                ],
                fieldHelp: {
                    'delivery': 'EPP entregado a inspeccionar',
                    'condition': 'Estado: Bueno, Regular, Malo, Danado, Inutilizable',
                    'compliant': 'Cumple con normativas de seguridad?',
                    'checklist': 'Items verificados en la inspeccion',
                    'action': 'Accion requerida: Ninguna, Reparar, Reemplazar, Capacitar',
                    'photos': 'Fotos del estado del EPP'
                }
            },
            config: {
                title: 'Configuracion de HSE',
                description: 'Configure estandares, alertas y notificaciones del modulo.',
                tips: [
                    'Seleccione el estandar primario segun su ubicacion geografica',
                    'Configure los dias de alerta para anticipar vencimientos',
                    'Active notificaciones a supervisores para mayor control'
                ],
                warnings: [
                    'Cambiar el estandar puede afectar los requisitos de documentacion',
                    'Desactivar notificaciones puede causar vencimientos no detectados'
                ],
                helpTopics: [
                    '¿Que estandar debo seleccionar?',
                    '¿Como configurar alertas de vencimiento?',
                    '¿Quienes reciben las notificaciones?'
                ],
                fieldHelp: {
                    'standard': 'Estandar normativo: SRT (Argentina), NOM-017 (Mexico), NR-6 (Brasil)',
                    'alert_days': 'Dias antes del vencimiento para enviar alertas (30, 15, 7, 1)',
                    'notify_employee': 'Notificar al empleado sobre sus EPP por vencer',
                    'notify_supervisor': 'Notificar al supervisor directo',
                    'notify_hse': 'Notificar al responsable de HSE',
                    'block_work': 'Bloquear fichaje si el empleado tiene EPP vencido',
                    'inspection_freq': 'Frecuencia de inspecciones automaticas en dias'
                }
            }
        },
        fallbackResponses: {
            'epp': 'EPP significa Equipo de Proteccion Personal. Incluye cascos, guantes, lentes, zapatos de seguridad, etc.',
            'vencimiento': 'Los EPP tienen fecha de vencimiento calculada desde la entrega. Use las alertas para anticipar reemplazos.',
            'certificacion': 'Las certificaciones validas dependen del pais: SRT en Argentina, NOM-017 en Mexico, NR-6 en Brasil.',
            'inspeccion': 'Las inspecciones verifican el estado del EPP. Se recomiendan cada 90 dias para EPP criticos.',
            'matriz': 'La matriz Rol-EPP define que equipos necesita cada puesto de trabajo segun su nivel de riesgo.',
            'firma': 'La firma digital del empleado confirma la recepcion del EPP y tiene validez legal.',
            'reemplazo': 'Para reemplazar un EPP, registre la devolucion del anterior y cree una nueva entrega.',
            'multa': 'El incumplimiento de normas HSE puede generar multas de la SRT y responsabilidades civiles.',
            'srt': 'La SRT (Superintendencia de Riesgos del Trabajo) regula la seguridad laboral en Argentina.'
        }
    });
    console.log('[HSE] Modulo registrado en ModuleHelpSystem');
} else {
    console.warn('[HSE] ModuleHelpSystem no disponible - ayuda contextual deshabilitada');
}

// ============================================================================
// INICIALIZACION
// ============================================================================

async function initHseManagement(container) {
    console.log('[HSE] Inicializando modulo de Seguridad e Higiene Laboral...');

    if (!container) {
        console.error('[HSE] Container no proporcionado');
        return;
    }

    // Inyectar estilos al head (solo una vez)
    injectHseStyles();

    // Renderizar estructura base
    container.innerHTML = getHseBaseHTML();

    // Cargar datos iniciales
    await loadHseInitialData();

    // Configurar event listeners
    setupHseEventListeners();

    // Inicializar sistema de ayuda contextual
    if (typeof ModuleHelpSystem !== 'undefined') {
        ModuleHelpSystem.init('hse-management', { initialContext: 'dashboard' });
        console.log('[HSE] ModuleHelpSystem inicializado');
    }

    // Mostrar tab inicial
    showHseTab('dashboard');

    console.log('[HSE] Modulo inicializado correctamente');
}

// ============================================================================
// HTML BASE
// ============================================================================

function getHseBaseHTML() {
    return `
    <div class="hse-module" style="background: #1a1a2e; min-height: 100vh; padding: 20px;">
        <!-- Header -->
        <div class="hse-header" style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2 style="color: #fff; margin: 0; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-shield-halved" style="font-size: 28px; color: #e74c3c;"></i>
                        Seguridad e Higiene Laboral
                    </h2>
                    <p style="color: #888; margin: 5px 0 0 0;">
                        <strong style="color: #aaa;">EPP</strong> = Equipos de Proteccion Personal (cascos, guantes, lentes, arnes, etc.)
                    </p>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <!-- Dropdown Exportar -->
                    <div class="hse-export-dropdown" style="position: relative;">
                        <button id="hse-export-btn" class="hse-btn" style="background: #2196F3; color: white; padding: 8px 15px; display: flex; align-items: center; gap: 8px;" onclick="toggleExportMenu()">
                            📤 Exportar
                            <span style="font-size: 10px;">▼</span>
                        </button>
                        <div id="hse-export-menu" style="display: none; position: absolute; top: 100%; right: 0; background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 8px 0; min-width: 180px; z-index: 1000; margin-top: 5px;">
                            <button class="hse-export-option" onclick="exportHseReport('excel')" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 15px; background: none; border: none; color: #e2e8f0; cursor: pointer; text-align: left;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='none'">
                                📊 Exportar a Excel
                            </button>
                            <button class="hse-export-option" onclick="exportHseReport('pdf')" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 15px; background: none; border: none; color: #e2e8f0; cursor: pointer; text-align: left;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='none'">
                                📄 Exportar a PDF
                            </button>
                            <button class="hse-export-option" onclick="exportHseReport('word')" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 15px; background: none; border: none; color: #e2e8f0; cursor: pointer; text-align: left;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='none'">
                                📝 Exportar a Word
                            </button>
                        </div>
                    </div>
                    <!-- Badges -->
                    <div class="hse-standards-badges" style="display: flex; gap: 8px;">
                        <span class="badge" style="background: #e74c3c; color: white; padding: 5px 12px; border-radius: 15px; font-size: 11px;">HSE</span>
                        <span class="badge" style="background: #FF9800; color: white; padding: 5px 12px; border-radius: 15px; font-size: 11px;">SRT Argentina</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="hse-tabs" style="display: flex; gap: 5px; margin-bottom: 20px; background: #16213e; padding: 8px; border-radius: 12px;">
            <button class="hse-tab active" data-tab="dashboard" style="flex: 1; padding: 12px 20px; background: #0f3460; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.3s;">
                📊 Dashboard
            </button>
            <button class="hse-tab" data-tab="catalog" style="flex: 1; padding: 12px 20px; background: transparent; color: #888; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.3s;">
                📦 Catalogo EPP
            </button>
            <button class="hse-tab" data-tab="matrix" style="flex: 1; padding: 12px 20px; background: transparent; color: #888; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.3s;">
                🎯 Matriz Rol-EPP
            </button>
            <button class="hse-tab" data-tab="deliveries" style="flex: 1; padding: 12px 20px; background: transparent; color: #888; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.3s;">
                📋 Entregas
            </button>
            <button class="hse-tab" data-tab="inspections" style="flex: 1; padding: 12px 20px; background: transparent; color: #888; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.3s;">
                🔍 Inspecciones
            </button>
            <button class="hse-tab" data-tab="config" style="flex: 1; padding: 12px 20px; background: transparent; color: #888; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.3s;">
                ⚙️ Configuracion
            </button>
        </div>

        <!-- Tab Content Container -->
        <div class="hse-content" id="hse-content-area" style="background: #16213e; border-radius: 12px; padding: 20px; min-height: 500px;">
            <div class="hse-loading" style="text-align: center; padding: 50px;">
                <div class="spinner" style="border: 3px solid #333; border-top: 3px solid #4CAF50; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p style="color: #888; margin-top: 15px;">Cargando...</p>
            </div>
        </div>
    </div>
    `;
}

// ============================================================================
// INYECCION DE ESTILOS AL HEAD
// ============================================================================
function injectHseStyles() {
    // Verificar si ya se inyectaron los estilos
    if (document.getElementById('hse-module-styles')) {
        return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'hse-module-styles';
    styleElement.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .hse-tab:hover {
            background: #1a3a6e !important;
            color: #fff !important;
        }
        .hse-tab.active {
            background: #0f3460 !important;
            color: #fff !important;
        }
        .hse-card {
            background: #1a1a2e;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
        }
        .hse-table {
            width: 100%;
            border-collapse: collapse;
        }
        .hse-table th, .hse-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #2a2a4a;
            color: #fff;
        }
        .hse-table th {
            background: #0f3460;
            color: #4CAF50;
            font-weight: 600;
        }
        .hse-table tr:hover {
            background: #1a3a6e;
        }
        .hse-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s;
        }
        .hse-btn-primary {
            background: #4CAF50;
            color: white;
        }
        .hse-btn-primary:hover {
            background: #45a049;
        }
        .hse-btn-danger {
            background: #f44336;
            color: white;
        }
        .hse-btn-danger:hover {
            background: #da190b;
        }
        .hse-btn-secondary {
            background: #2196F3;
            color: white;
        }
        .hse-input {
            width: 100%;
            padding: 10px 12px;
            background: #1a1a2e;
            border: 1px solid #2a2a4a;
            border-radius: 6px;
            color: #fff;
            font-size: 14px;
        }
        .hse-input:focus {
            outline: none;
            border-color: #4CAF50;
        }
        .hse-select {
            width: 100%;
            padding: 10px 12px;
            background: #1a1a2e;
            border: 1px solid #2a2a4a;
            border-radius: 6px;
            color: #fff;
            font-size: 14px;
        }
        .hse-kpi-card {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid #2a2a4a;
        }
        .hse-kpi-value {
            font-size: 36px;
            font-weight: bold;
            color: #4CAF50;
        }
        .hse-kpi-label {
            color: #888;
            font-size: 14px;
            margin-top: 8px;
        }
        .status-active { color: #4CAF50; }
        .status-expiring { color: #FF9800; }
        .status-expired { color: #f44336; }
        .status-returned { color: #9E9E9E; }
    `;
    document.head.appendChild(styleElement);
    console.log('[HSE] Estilos inyectados al head');
}

// ============================================================================
// CARGA DE DATOS
// ============================================================================

async function loadHseInitialData() {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        // Cargar en paralelo
        const [categoriesRes, catalogRes, dashboardRes] = await Promise.all([
            fetch('/api/v1/hse/categories', { headers }),
            fetch('/api/v1/hse/catalog', { headers }),
            fetch('/api/v1/hse/dashboard', { headers })
        ]);

        if (categoriesRes.ok) {
            const data = await categoriesRes.json();
            hseState.categories = data.categories || [];
        }

        if (catalogRes.ok) {
            const data = await catalogRes.json();
            hseState.catalog = data.catalog || [];
        }

        if (dashboardRes.ok) {
            const data = await dashboardRes.json();
            hseState.dashboardKPIs = data;
        }

        // Cargar posiciones organizacionales
        const positionsRes = await fetch('/api/v1/organizational/positions', { headers });
        if (positionsRes.ok) {
            const data = await positionsRes.json();
            hseState.positions = data.positions || data || [];
        }

    } catch (error) {
        console.error('[HSE] Error cargando datos:', error);
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupHseEventListeners() {
    // Tab navigation
    document.querySelectorAll('.hse-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            showHseTab(tabName);
        });
    });
}

function showHseTab(tabName) {
    hseState.currentTab = tabName;

    // Actualizar contexto en sistema de ayuda
    if (typeof ModuleHelpSystem !== 'undefined') {
        ModuleHelpSystem.setContext(tabName);
    }

    // Update tab buttons
    document.querySelectorAll('.hse-tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
            tab.style.background = '#0f3460';
            tab.style.color = '#fff';
        } else {
            tab.classList.remove('active');
            tab.style.background = 'transparent';
            tab.style.color = '#888';
        }
    });

    // Render tab content
    const contentArea = document.getElementById('hse-content-area');
    switch (tabName) {
        case 'dashboard':
            renderDashboardTab(contentArea);
            break;
        case 'catalog':
            renderCatalogTab(contentArea);
            break;
        case 'matrix':
            renderMatrixTab(contentArea);
            break;
        case 'deliveries':
            renderDeliveriesTab(contentArea);
            break;
        case 'inspections':
            renderInspectionsTab(contentArea);
            break;
        case 'config':
            renderConfigTab(contentArea);
            break;
    }
}

// ============================================================================
// TAB 1: DASHBOARD
// ============================================================================

async function renderDashboardTab(container) {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    // Recargar KPIs
    try {
        const res = await fetch('/api/v1/hse/dashboard', { headers });
        if (res.ok) {
            hseState.dashboardKPIs = await res.json();
        }
    } catch (e) { console.error('[HSE] Error cargando dashboard:', e); }

    const kpis = hseState.dashboardKPIs || {};

    container.innerHTML = `
        <div class="dashboard-tab">
            <!-- KPIs Row -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 25px;">
                <div class="hse-kpi-card">
                    <div class="hse-kpi-value" style="color: #4CAF50;">${kpis.totalActiveEpp || 0}</div>
                    <div class="hse-kpi-label">EPP Activos</div>
                </div>
                <div class="hse-kpi-card">
                    <div class="hse-kpi-value" style="color: #FF9800;">${kpis.expiringNext30 || 0}</div>
                    <div class="hse-kpi-label">Vencen en 30 dias</div>
                </div>
                <div class="hse-kpi-card">
                    <div class="hse-kpi-value" style="color: #f44336;">${kpis.expiredCount || 0}</div>
                    <div class="hse-kpi-label">Vencidos</div>
                </div>
                <div class="hse-kpi-card">
                    <div class="hse-kpi-value" style="color: #2196F3;">${kpis.compliancePercentage || 0}%</div>
                    <div class="hse-kpi-label">Cumplimiento</div>
                </div>
            </div>

            <!-- Alertas y Acciones Rapidas -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                <!-- Alertas de Vencimiento -->
                <div class="hse-card">
                    <h3 style="color: #FF9800; margin-top: 0; display: flex; align-items: center; gap: 8px;">
                        ⚠️ Proximos Vencimientos
                    </h3>
                    <div id="hse-expiring-list" style="max-height: 300px; overflow-y: auto;">
                        ${renderExpiringList(kpis.expiringItems || [])}
                    </div>
                </div>

                <!-- Acciones Rapidas -->
                <div class="hse-card">
                    <h3 style="color: #4CAF50; margin-top: 0;">🚀 Acciones Rapidas</h3>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button class="hse-btn hse-btn-primary" onclick="showHseTab('deliveries'); setTimeout(() => openDeliveryModal(), 300);" style="width: 100%;">
                            ➕ Nueva Entrega EPP
                        </button>
                        <button class="hse-btn hse-btn-secondary" onclick="showHseTab('inspections'); setTimeout(() => openInspectionModal(), 300);" style="width: 100%;">
                            🔍 Nueva Inspeccion
                        </button>
                        <button class="hse-btn" onclick="exportHseReport()" style="width: 100%; background: #9C27B0; color: white;">
                            📄 Exportar Reporte
                        </button>
                    </div>
                </div>
            </div>

            <!-- Grafico de Categorias -->
            <div class="hse-card" style="margin-top: 20px;">
                <h3 style="color: #fff; margin-top: 0;">📊 Distribucion por Categoria</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                    ${renderCategoryDistribution(kpis.categoryDistribution || [])}
                </div>
            </div>
        </div>
    `;
}

function renderExpiringList(items) {
    if (!items || items.length === 0) {
        return '<p style="color: #888; text-align: center;">No hay EPP proximos a vencer</p>';
    }

    return items.slice(0, 10).map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #1a1a2e; border-radius: 8px; margin-bottom: 8px;">
            <div>
                <strong style="color: #fff;">${item.epp_name || item.name}</strong>
                <br><small style="color: #888;">${item.employee_name || 'N/A'}</small>
            </div>
            <div style="text-align: right;">
                <span style="color: ${item.days_remaining <= 7 ? '#f44336' : '#FF9800'}; font-weight: bold;">
                    ${item.days_remaining} dias
                </span>
                <br><small style="color: #888;">${formatDate(item.calculated_replacement_date)}</small>
            </div>
        </div>
    `).join('');
}

function renderCategoryDistribution(categories) {
    if (!categories || categories.length === 0) {
        return '<p style="color: #888;">Sin datos de distribucion</p>';
    }

    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#f44336', '#00BCD4', '#8BC34A', '#E91E63'];

    return categories.map((cat, i) => `
        <div style="background: ${colors[i % colors.length]}20; border: 1px solid ${colors[i % colors.length]}; border-radius: 8px; padding: 15px; min-width: 120px; text-align: center;">
            <div style="font-size: 24px; color: ${colors[i % colors.length]}; font-weight: bold;">${cat.count || 0}</div>
            <div style="color: #888; font-size: 12px;">${cat.category_name || cat.name}</div>
        </div>
    `).join('');
}

// ============================================================================
// TAB 2: CATALOGO EPP
// ============================================================================

async function renderCatalogTab(container) {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    // Recargar catalogo
    try {
        const res = await fetch('/api/v1/hse/catalog', { headers });
        if (res.ok) {
            const data = await res.json();
            hseState.catalog = data.catalog || [];
        }
    } catch (e) { console.error('[HSE] Error cargando catalogo:', e); }

    container.innerHTML = `
        <div class="catalog-tab">
            <!-- Header con filtros -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div style="display: flex; gap: 15px; align-items: center;">
                    <select id="hse-catalog-category-filter" class="hse-select" style="width: 200px;" onchange="filterCatalog()">
                        <option value="">Todas las categorias</option>
                        ${hseState.categories.map(c => `<option value="${c.id}">${c.name_es}</option>`).join('')}
                    </select>
                    <input type="text" id="hse-catalog-search" class="hse-input" placeholder="Buscar EPP..." style="width: 250px;" onkeyup="filterCatalog()">
                </div>
                <button class="hse-btn hse-btn-primary" onclick="openCatalogModal()">
                    ➕ Nuevo EPP
                </button>
            </div>

            <!-- Tabla de Catalogo -->
            <div style="overflow-x: auto;">
                <table class="hse-table">
                    <thead>
                        <tr>
                            <th>Codigo</th>
                            <th>Nombre</th>
                            <th>Categoria</th>
                            <th>Marca/Modelo</th>
                            <th>Vida Util</th>
                            <th>Certificaciones</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="hse-catalog-body">
                        ${renderCatalogRows(hseState.catalog)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderCatalogRows(items) {
    if (!items || items.length === 0) {
        return '<tr><td colspan="8" style="text-align: center; color: #888;">No hay EPP en el catalogo</td></tr>';
    }

    return items.map(item => `
        <tr>
            <td><code style="background: #0f3460; padding: 3px 8px; border-radius: 4px;">${item.code}</code></td>
            <td>${item.name}</td>
            <td>
                <span style="background: #4CAF5030; color: #4CAF50; padding: 3px 8px; border-radius: 4px; font-size: 12px;">
                    ${getCategoryName(item.category_id)}
                </span>
            </td>
            <td>${item.brand || '-'} ${item.model || ''}</td>
            <td>${item.default_lifespan_days || '-'} dias</td>
            <td>${formatCertifications(item.certifications)}</td>
            <td>
                <span class="status-${item.is_active ? 'active' : 'returned'}">
                    ${item.is_active ? '✓ Activo' : '✗ Inactivo'}
                </span>
            </td>
            <td>
                <button class="hse-btn" style="background: #2196F3; color: white; padding: 5px 10px; font-size: 12px;" onclick="editCatalogItem(${item.id})">
                    ✏️
                </button>
                <button class="hse-btn" style="background: #f44336; color: white; padding: 5px 10px; font-size: 12px;" onclick="deleteCatalogItem(${item.id})">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

function getCategoryName(categoryId) {
    const cat = hseState.categories.find(c => c.id === categoryId);
    return cat ? cat.name_es : 'Sin categoria';
}

function formatCertifications(certs) {
    if (!certs || certs.length === 0) return '-';
    const arr = Array.isArray(certs) ? certs : JSON.parse(certs);
    return arr.slice(0, 2).map(c =>
        `<span style="background: #2196F330; color: #2196F3; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-right: 4px;">${c}</span>`
    ).join('') + (arr.length > 2 ? `<span style="color: #888;">+${arr.length - 2}</span>` : '');
}

async function filterCatalog() {
    const categoryId = document.getElementById('hse-catalog-category-filter').value;
    const search = document.getElementById('hse-catalog-search').value;

    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (search) params.append('search', search);

    try {
        const res = await fetch(`/api/v1/hse/catalog?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            document.getElementById('hse-catalog-body').innerHTML = renderCatalogRows(data.catalog || []);
        }
    } catch (e) {
        console.error('[HSE] Error filtrando catalogo:', e);
    }
}

// ============================================================================
// TAB 3: MATRIZ ROL-EPP
// ============================================================================

async function renderMatrixTab(container) {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    // Cargar requirements
    try {
        const res = await fetch('/api/v1/hse/requirements/matrix', { headers });
        if (res.ok) {
            const data = await res.json();
            hseState.requirements = data.matrix || data.requirements || [];
        }
    } catch (e) { console.error('[HSE] Error cargando matriz:', e); }

    container.innerHTML = `
        <div class="matrix-tab">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <h3 style="color: #fff; margin: 0;">🎯 Matriz de Requerimientos EPP por Posicion</h3>
                    <p style="color: #888; margin: 5px 0 0 0;">Define que EPP necesita cada puesto de trabajo</p>
                </div>
                <button class="hse-btn hse-btn-primary" onclick="openRequirementModal()">
                    ➕ Asignar EPP a Posicion
                </button>
            </div>

            <!-- Selector de Posicion -->
            <div class="hse-card" style="margin-bottom: 20px;">
                <label style="color: #888; display: block; margin-bottom: 8px;">Filtrar por Posicion Organizacional:</label>
                <select id="hse-matrix-position-filter" class="hse-select" style="width: 400px;" onchange="filterMatrixByPosition()">
                    <option value="">Todas las posiciones</option>
                    ${hseState.positions.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
            </div>

            <!-- Tabla de Requirements -->
            <div style="overflow-x: auto;">
                <table class="hse-table">
                    <thead>
                        <tr>
                            <th>Posicion</th>
                            <th>EPP Requerido</th>
                            <th>Categoria</th>
                            <th>Obligatorio</th>
                            <th>Cantidad</th>
                            <th>Vida Util Custom</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="hse-matrix-body">
                        ${renderMatrixRows(hseState.requirements)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderMatrixRows(requirements) {
    if (!requirements || requirements.length === 0) {
        return '<tr><td colspan="7" style="text-align: center; color: #888;">No hay requerimientos definidos</td></tr>';
    }

    return requirements.map(req => `
        <tr>
            <td>
                <strong style="color: #fff;">${req.position_name || 'N/A'}</strong>
            </td>
            <td>${req.epp_name || req.catalog?.name || 'N/A'}</td>
            <td>
                <span style="background: #4CAF5030; color: #4CAF50; padding: 3px 8px; border-radius: 4px; font-size: 12px;">
                    ${req.category_name || 'N/A'}
                </span>
            </td>
            <td>
                ${req.is_mandatory
                    ? '<span style="color: #f44336; font-weight: bold;">⚠️ Obligatorio</span>'
                    : '<span style="color: #888;">Recomendado</span>'}
            </td>
            <td>${req.quantity_required || 1}</td>
            <td>${req.custom_lifespan_days ? `${req.custom_lifespan_days} dias` : '-'}</td>
            <td>
                <button class="hse-btn" style="background: #2196F3; color: white; padding: 5px 10px; font-size: 12px;" onclick="editRequirement(${req.id})">
                    ✏️
                </button>
                <button class="hse-btn" style="background: #f44336; color: white; padding: 5px 10px; font-size: 12px;" onclick="deleteRequirement(${req.id})">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================================================
// TAB 4: ENTREGAS
// ============================================================================

async function renderDeliveriesTab(container) {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    // Cargar entregas
    try {
        const res = await fetch('/api/v1/hse/deliveries', { headers });
        if (res.ok) {
            const data = await res.json();
            hseState.deliveries = data.deliveries || [];
        }
    } catch (e) { console.error('[HSE] Error cargando entregas:', e); }

    container.innerHTML = `
        <div class="deliveries-tab">
            <!-- Header con filtros -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div style="display: flex; gap: 15px; align-items: center;">
                    <select id="hse-deliveries-status-filter" class="hse-select" style="width: 180px;" onchange="filterDeliveries()">
                        <option value="">Todos los estados</option>
                        <option value="active">Activos</option>
                        <option value="expiring">Por vencer</option>
                        <option value="expired">Vencidos</option>
                        <option value="returned">Devueltos</option>
                    </select>
                    <input type="text" id="hse-deliveries-search" class="hse-input" placeholder="Buscar empleado..." style="width: 250px;" onkeyup="filterDeliveries()">
                </div>
                <button class="hse-btn hse-btn-primary" onclick="openDeliveryModal()">
                    ➕ Nueva Entrega
                </button>
            </div>

            <!-- Tabla de Entregas -->
            <div style="overflow-x: auto;">
                <table class="hse-table">
                    <thead>
                        <tr>
                            <th>Empleado</th>
                            <th>EPP</th>
                            <th>Fecha Entrega</th>
                            <th>Fecha Reemplazo</th>
                            <th>Dias Restantes</th>
                            <th>Estado</th>
                            <th>Firmado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="hse-deliveries-body">
                        ${renderDeliveriesRows(hseState.deliveries)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderDeliveriesRows(deliveries) {
    if (!deliveries || deliveries.length === 0) {
        return '<tr><td colspan="8" style="text-align: center; color: #888;">No hay entregas registradas</td></tr>';
    }

    return deliveries.map(d => {
        const daysLeft = calculateDaysRemaining(d.calculated_replacement_date);
        const statusClass = getDeliveryStatusClass(d.status, daysLeft);

        return `
        <tr>
            <td>
                <strong style="color: #fff;">${d.employee_name || d.employee?.name || 'N/A'}</strong>
            </td>
            <td>${d.epp_name || d.catalog?.name || 'N/A'}</td>
            <td>${formatDate(d.delivery_date)}</td>
            <td>${formatDate(d.calculated_replacement_date)}</td>
            <td>
                <span class="${statusClass}" style="font-weight: bold;">
                    ${daysLeft > 0 ? `${daysLeft} dias` : (daysLeft === 0 ? 'HOY' : 'VENCIDO')}
                </span>
            </td>
            <td>
                <span class="status-${d.status}">
                    ${getStatusLabel(d.status)}
                </span>
            </td>
            <td>
                ${d.employee_signature_date
                    ? '<span style="color: #4CAF50;">✓ Firmado</span>'
                    : '<span style="color: #FF9800;">Pendiente</span>'}
            </td>
            <td>
                ${d.status === 'active' ? `
                    <button class="hse-btn" style="background: #FF9800; color: white; padding: 5px 10px; font-size: 12px;" onclick="replaceDelivery(${d.id})" title="Reemplazar">
                        🔄
                    </button>
                    <button class="hse-btn" style="background: #9E9E9E; color: white; padding: 5px 10px; font-size: 12px;" onclick="returnDelivery(${d.id})" title="Devolver">
                        ↩️
                    </button>
                ` : ''}
                ${!d.employee_signature_date && d.status === 'active' ? `
                    <button class="hse-btn" style="background: #4CAF50; color: white; padding: 5px 10px; font-size: 12px;" onclick="signDelivery(${d.id})" title="Firmar">
                        ✍️
                    </button>
                ` : ''}
            </td>
        </tr>
        `;
    }).join('');
}

function calculateDaysRemaining(dateStr) {
    if (!dateStr) return -999;
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
}

function getDeliveryStatusClass(status, daysLeft) {
    if (status === 'expired' || daysLeft < 0) return 'status-expired';
    if (status === 'returned') return 'status-returned';
    if (daysLeft <= 30) return 'status-expiring';
    return 'status-active';
}

function getStatusLabel(status) {
    const labels = {
        active: '✓ Activo',
        expired: '✗ Vencido',
        replaced: '🔄 Reemplazado',
        lost: '❓ Perdido',
        damaged: '💥 Danado',
        returned: '↩️ Devuelto'
    };
    return labels[status] || status;
}

// ============================================================================
// TAB 5: INSPECCIONES
// ============================================================================

async function renderInspectionsTab(container) {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const res = await fetch('/api/v1/hse/inspections', { headers });
        if (res.ok) {
            const data = await res.json();
            hseState.inspections = data.inspections || [];
        }
    } catch (e) { console.error('[HSE] Error cargando inspecciones:', e); }

    container.innerHTML = `
        <div class="inspections-tab">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div style="display: flex; gap: 15px; align-items: center;">
                    <select id="hse-inspections-condition-filter" class="hse-select" style="width: 180px;" onchange="filterInspections()">
                        <option value="">Todas las condiciones</option>
                        <option value="good">Bueno</option>
                        <option value="fair">Regular</option>
                        <option value="poor">Malo</option>
                        <option value="damaged">Danado</option>
                        <option value="unusable">Inutilizable</option>
                    </select>
                    <label style="color: #888; display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="hse-inspections-pending" onchange="filterInspections()">
                        Solo con acciones pendientes
                    </label>
                </div>
                <button class="hse-btn hse-btn-primary" onclick="openInspectionModal()">
                    ➕ Nueva Inspeccion
                </button>
            </div>

            <!-- Tabla de Inspecciones -->
            <div style="overflow-x: auto;">
                <table class="hse-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>EPP / Empleado</th>
                            <th>Inspector</th>
                            <th>Condicion</th>
                            <th>Cumple Normativa</th>
                            <th>Accion Requerida</th>
                            <th>Estado Accion</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="hse-inspections-body">
                        ${renderInspectionsRows(hseState.inspections)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderInspectionsRows(inspections) {
    if (!inspections || inspections.length === 0) {
        return '<tr><td colspan="8" style="text-align: center; color: #888;">No hay inspecciones registradas</td></tr>';
    }

    return inspections.map(insp => `
        <tr>
            <td>${formatDate(insp.inspection_date)}</td>
            <td>
                <strong style="color: #fff;">${insp.epp_name || 'N/A'}</strong>
                <br><small style="color: #888;">${insp.employee_name || 'N/A'}</small>
            </td>
            <td>${insp.inspector_name || 'N/A'}</td>
            <td>
                <span style="color: ${getConditionColor(insp.condition)}; font-weight: bold;">
                    ${getConditionLabel(insp.condition)}
                </span>
            </td>
            <td>
                ${insp.is_compliant
                    ? '<span style="color: #4CAF50;">✓ Si</span>'
                    : '<span style="color: #f44336;">✗ No</span>'}
            </td>
            <td>
                ${insp.action_required && insp.action_required !== 'none'
                    ? `<span style="color: #FF9800;">${getActionLabel(insp.action_required)}</span>`
                    : '<span style="color: #888;">Ninguna</span>'}
            </td>
            <td>
                ${insp.action_required && insp.action_required !== 'none'
                    ? (insp.action_completed
                        ? '<span style="color: #4CAF50;">✓ Completada</span>'
                        : '<span style="color: #f44336;">⏳ Pendiente</span>')
                    : '-'}
            </td>
            <td>
                ${insp.action_required && insp.action_required !== 'none' && !insp.action_completed ? `
                    <button class="hse-btn hse-btn-primary" style="padding: 5px 10px; font-size: 12px;" onclick="completeInspectionAction(${insp.id})">
                        ✓ Completar
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function getConditionColor(condition) {
    const colors = {
        good: '#4CAF50',
        fair: '#FF9800',
        poor: '#f44336',
        damaged: '#f44336',
        unusable: '#9E9E9E'
    };
    return colors[condition] || '#888';
}

function getConditionLabel(condition) {
    const labels = {
        good: '✓ Bueno',
        fair: '⚠ Regular',
        poor: '✗ Malo',
        damaged: '💥 Danado',
        unusable: '🚫 Inutilizable'
    };
    return labels[condition] || condition;
}

function getActionLabel(action) {
    const labels = {
        none: 'Ninguna',
        repair: '🔧 Reparar',
        replace: '🔄 Reemplazar',
        training: '📚 Capacitacion'
    };
    return labels[action] || action;
}

// ============================================================================
// TAB 6: CONFIGURACION
// ============================================================================

async function renderConfigTab(container) {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const res = await fetch('/api/v1/hse/config', { headers });
        if (res.ok) {
            const data = await res.json();
            hseState.config = data.config || data;
        }
    } catch (e) { console.error('[HSE] Error cargando config:', e); }

    const config = hseState.config || {};

    container.innerHTML = `
        <div class="config-tab">
            <form id="hse-config-form" onsubmit="saveHseConfig(event)">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <!-- Estandares -->
                    <div class="hse-card">
                        <h3 style="color: #4CAF50; margin-top: 0;">🏛️ Estandares Aplicables</h3>

                        <div style="margin-bottom: 15px;">
                            <label style="color: #888; display: block; margin-bottom: 5px;">Estandar Primario</label>
                            <select name="primary_standard" class="hse-select">
                                <option value="SRT" ${config.primary_standard === 'SRT' ? 'selected' : ''}>SRT (Argentina)</option>
                                <option value="NOM_017_STPS" ${config.primary_standard === 'NOM_017_STPS' ? 'selected' : ''}>NOM-017-STPS (Mexico)</option>
                                <option value="NR6" ${config.primary_standard === 'NR6' ? 'selected' : ''}>NR-6 (Brasil)</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="color: #888; display: block; margin-bottom: 5px;">Frecuencia de Inspeccion (dias)</label>
                            <input type="number" name="inspection_frequency_days" class="hse-input"
                                   value="${config.inspection_frequency_days || 90}" min="7" max="365">
                        </div>
                    </div>

                    <!-- Alertas -->
                    <div class="hse-card">
                        <h3 style="color: #FF9800; margin-top: 0;">⏰ Alertas de Vencimiento</h3>

                        <p style="color: #888; font-size: 13px; margin-bottom: 15px;">
                            Dias antes del vencimiento para enviar alertas (separados por coma):
                        </p>
                        <input type="text" name="alert_days_before" class="hse-input"
                               value="${(config.alert_days_before || [30, 15, 7, 1]).join(', ')}"
                               placeholder="30, 15, 7, 1">
                    </div>

                    <!-- Notificaciones -->
                    <div class="hse-card">
                        <h3 style="color: #2196F3; margin-top: 0;">🔔 Destinatarios de Notificaciones</h3>

                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <label style="color: #fff; display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                <input type="checkbox" name="notify_employee" ${config.notify_employee !== false ? 'checked' : ''}>
                                Notificar al Empleado
                            </label>
                            <label style="color: #fff; display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                <input type="checkbox" name="notify_supervisor" ${config.notify_supervisor !== false ? 'checked' : ''}>
                                Notificar al Supervisor
                            </label>
                            <label style="color: #fff; display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                <input type="checkbox" name="notify_hse_manager" ${config.notify_hse_manager !== false ? 'checked' : ''}>
                                Notificar al Responsable HSE
                            </label>
                            <label style="color: #fff; display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                <input type="checkbox" name="notify_hr" ${config.notify_hr ? 'checked' : ''}>
                                Notificar a RRHH
                            </label>
                        </div>
                    </div>

                    <!-- Reglas de Negocio -->
                    <div class="hse-card">
                        <h3 style="color: #9C27B0; margin-top: 0;">⚙️ Reglas de Negocio</h3>

                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <label style="color: #fff; display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                <input type="checkbox" name="require_signature_on_delivery" ${config.require_signature_on_delivery !== false ? 'checked' : ''}>
                                Requerir firma al entregar EPP
                            </label>
                            <label style="color: #fff; display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                <input type="checkbox" name="auto_schedule_inspections" ${config.auto_schedule_inspections !== false ? 'checked' : ''}>
                                Programar inspecciones automaticamente
                            </label>
                            <label style="color: #f44336; display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                <input type="checkbox" name="block_work_without_epp" ${config.block_work_without_epp ? 'checked' : ''}>
                                ⚠️ Bloquear fichaje si EPP vencido
                            </label>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 20px; text-align: right;">
                    <button type="submit" class="hse-btn hse-btn-primary" style="padding: 12px 30px; font-size: 16px;">
                        💾 Guardar Configuracion
                    </button>
                </div>
            </form>
        </div>
    `;
}

async function saveHseConfig(event) {
    event.preventDefault();

    const form = event.target;
    const alertDaysStr = form.alert_days_before.value;
    const alertDays = alertDaysStr.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));

    const config = {
        primary_standard: form.primary_standard.value,
        inspection_frequency_days: parseInt(form.inspection_frequency_days.value),
        alert_days_before: alertDays,
        notify_employee: form.notify_employee.checked,
        notify_supervisor: form.notify_supervisor.checked,
        notify_hse_manager: form.notify_hse_manager.checked,
        notify_hr: form.notify_hr.checked,
        require_signature_on_delivery: form.require_signature_on_delivery.checked,
        auto_schedule_inspections: form.auto_schedule_inspections.checked,
        block_work_without_epp: form.block_work_without_epp.checked
    };

    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/v1/hse/config', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        if (res.ok) {
            showNotification('Configuracion guardada correctamente', 'success');
        } else {
            const error = await res.json();
            showNotification(error.error || 'Error guardando configuracion', 'error');
        }
    } catch (e) {
        console.error('[HSE] Error guardando config:', e);
        showNotification('Error de conexion', 'error');
    }
}

// ============================================================================
// MODALES Y ACCIONES CRUD
// ============================================================================

function openCatalogModal(item = null) {
    const isEdit = !!item;

    const modalHtml = `
    <div id="hse-catalog-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
        <div style="background: #1a1a2e; border-radius: 12px; padding: 25px; width: 600px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #fff; margin: 0;">${isEdit ? '✏️ Editar EPP' : '➕ Nuevo EPP en Catalogo'}</h3>
                <button onclick="closeModal('hse-catalog-modal')" style="background: none; border: none; color: #888; font-size: 24px; cursor: pointer;">&times;</button>
            </div>

            <form id="hse-catalog-form" onsubmit="saveCatalogItem(event, ${item?.id || 'null'})">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="color: #888; display: block; margin-bottom: 5px;" title="Codigo interno unico para identificar este EPP en el sistema">Codigo * <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                        <input type="text" name="code" class="hse-input" required value="${item?.code || ''}" placeholder="CASCO-01" title="Ingrese un codigo unico, ej: CASCO-01, GUANTE-NITRILO-M, ARNES-FULL" data-help="code">
                    </div>
                    <div>
                        <label style="color: #888; display: block; margin-bottom: 5px;" title="Tipo de proteccion que brinda el EPP">Categoria * <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                        <select name="category_id" class="hse-select" required title="Seleccione la zona del cuerpo que protege: Cabeza, Ojos, Manos, etc." data-help="category">
                            <option value="">Seleccionar...</option>
                            ${hseState.categories.map(c => `<option value="${c.id}" ${item?.category_id === c.id ? 'selected' : ''}>${c.name_es}</option>`).join('')}
                        </select>
                    </div>
                    <div style="grid-column: span 2;">
                        <label style="color: #888; display: block; margin-bottom: 5px;" title="Nombre descriptivo completo del EPP">Nombre * <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                        <input type="text" name="name" class="hse-input" required value="${item?.name || ''}" placeholder="Casco de seguridad tipo I" title="Nombre descriptivo del equipo, ej: Casco de seguridad clase E con suspension de 6 puntos" data-help="name">
                    </div>
                    <div>
                        <label style="color: #888; display: block; margin-bottom: 5px;" title="Fabricante del EPP">Marca <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                        <input type="text" name="brand" class="hse-input" value="${item?.brand || ''}" placeholder="3M, MSA, Honeywell..." title="Fabricante o marca comercial: 3M, MSA, Honeywell, DuPont, etc." data-help="brand">
                    </div>
                    <div>
                        <label style="color: #888; display: block; margin-bottom: 5px;" title="Modelo especifico del fabricante">Modelo <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                        <input type="text" name="model" class="hse-input" value="${item?.model || ''}" placeholder="V-Gard 500, H-700..." title="Numero de modelo del fabricante, ej: V-Gard 500, SecureFit SF400" data-help="model">
                    </div>
                    <div>
                        <label style="color: #888; display: block; margin-bottom: 5px;" title="Cantidad de dias que el EPP es valido desde su entrega">Vida Util (dias) <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                        <input type="number" name="default_lifespan_days" class="hse-input" value="${item?.default_lifespan_days || 365}" min="1" title="Dias de vida util: 365 (1 ano), 180 (6 meses), 730 (2 anos). El sistema alertara antes del vencimiento." data-help="lifespan">
                    </div>
                    <div>
                        <label style="color: #888; display: block; margin-bottom: 5px;" title="Precio unitario para control de costos">Costo Unitario <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                        <input type="number" name="unit_cost" class="hse-input" value="${item?.unit_cost || ''}" step="0.01" min="0" placeholder="0.00" title="Costo de adquisicion por unidad en moneda local. Util para calcular presupuestos de EPP." data-help="cost">
                    </div>
                    <div style="grid-column: span 2;">
                        <label style="color: #888; display: block; margin-bottom: 5px;" title="Normas y estandares que cumple el EPP">Certificaciones <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                        <input type="text" name="certifications" class="hse-input" value="${item?.certifications?.join(', ') || ''}" placeholder="EN 397, ANSI Z89.1, IRAM 3620" title="Separar con comas. Ejemplos: EN 397 (EU), ANSI Z89.1 (USA), IRAM (Argentina), NOM (Mexico)" data-help="certifications">
                    </div>
                    <div style="grid-column: span 2;">
                        <label style="color: #888; display: block; margin-bottom: 5px;" title="Informacion adicional sobre el EPP">Descripcion <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                        <textarea name="description" class="hse-input" rows="3" style="resize: vertical;" title="Caracteristicas, materiales, indicaciones de uso, condiciones de almacenamiento, etc." data-help="description">${item?.description || ''}</textarea>
                    </div>
                </div>

                <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" onclick="closeModal('hse-catalog-modal')" class="hse-btn" style="background: #444;">Cancelar</button>
                    <button type="submit" class="hse-btn hse-btn-primary">${isEdit ? 'Actualizar' : 'Crear'} EPP</button>
                </div>
            </form>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function saveCatalogItem(event, itemId) {
    event.preventDefault();

    const form = event.target;
    const certsStr = form.certifications.value;
    const certifications = certsStr ? certsStr.split(',').map(c => c.trim()).filter(c => c) : [];

    const data = {
        code: form.code.value,
        category_id: parseInt(form.category_id.value),
        name: form.name.value,
        brand: form.brand.value || null,
        model: form.model.value || null,
        default_lifespan_days: parseInt(form.default_lifespan_days.value) || 365,
        unit_cost: form.unit_cost.value ? parseFloat(form.unit_cost.value) : null,
        certifications: certifications,
        description: form.description.value || null
    };

    const token = localStorage.getItem('token');
    const url = itemId ? `/api/v1/hse/catalog/${itemId}` : '/api/v1/hse/catalog';
    const method = itemId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            showNotification(`EPP ${itemId ? 'actualizado' : 'creado'} correctamente`, 'success');
            closeModal('hse-catalog-modal');
            showHseTab('catalog'); // Refresh
        } else {
            const error = await res.json();
            showNotification(error.error || 'Error guardando EPP', 'error');
        }
    } catch (e) {
        console.error('[HSE] Error guardando EPP:', e);
        showNotification('Error de conexion', 'error');
        closeModal('hse-catalog-modal');
    }
}

async function editCatalogItem(id) {
    const item = hseState.catalog.find(c => c.id === id);
    if (item) {
        openCatalogModal(item);
    }
}

async function deleteCatalogItem(id) {
    if (!confirm('¿Desactivar este EPP del catalogo?')) return;

    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/v1/hse/catalog/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showNotification('EPP desactivado', 'success');
            showHseTab('catalog');
        } else {
            const error = await res.json();
            showNotification(error.error || 'Error desactivando EPP', 'error');
        }
    } catch (e) {
        console.error('[HSE] Error eliminando EPP:', e);
        showNotification('Error de conexion', 'error');
    }
}

function openDeliveryModal() {
    const modalHtml = `
    <div id="hse-delivery-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
        <div style="background: #1a1a2e; border-radius: 12px; padding: 25px; width: 500px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #fff; margin: 0;">📋 Nueva Entrega de EPP</h3>
                <button onclick="closeModal('hse-delivery-modal')" style="background: none; border: none; color: #888; font-size: 24px; cursor: pointer;">&times;</button>
            </div>

            <form id="hse-delivery-form" onsubmit="saveDelivery(event)">
                <div style="margin-bottom: 15px;">
                    <label style="color: #888; display: block; margin-bottom: 5px;" title="Persona que recibira el EPP">Empleado * <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                    <select name="employee_id" class="hse-select" required id="hse-delivery-employee" title="Seleccione el empleado que recibira el equipo de proteccion" data-help="employee">
                        <option value="">Seleccionar empleado...</option>
                    </select>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="color: #888; display: block; margin-bottom: 5px;" title="Equipo de proteccion a entregar">EPP a Entregar * <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                    <select name="epp_catalog_id" class="hse-select" required title="Seleccione el EPP del catalogo. La fecha de reemplazo se calculara automaticamente segun la vida util." data-help="epp_catalog">
                        <option value="">Seleccionar EPP...</option>
                        ${hseState.catalog.filter(c => c.is_active).map(c => `<option value="${c.id}">${c.code} - ${c.name}</option>`).join('')}
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="color: #888; display: block; margin-bottom: 5px;" title="Fecha en que se realiza la entrega">Fecha Entrega <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                        <input type="date" name="delivery_date" class="hse-input" value="${new Date().toISOString().split('T')[0]}" title="Fecha de entrega efectiva. Por defecto es hoy. La fecha de vencimiento se calcula desde esta fecha." data-help="delivery_date">
                    </div>
                    <div>
                        <label style="color: #888; display: block; margin-bottom: 5px;" title="Numero de unidades entregadas">Cantidad <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                        <input type="number" name="quantity_delivered" class="hse-input" value="1" min="1" title="Cantidad de unidades del mismo EPP entregadas. Ej: 2 pares de guantes." data-help="quantity">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="color: #888; display: block; margin-bottom: 5px;" title="Tamano del EPP entregado">Talle <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                        <select name="size_delivered" class="hse-select" title="Seleccione el talle del EPP si aplica. Dejar N/A para EPP sin talle (ej: arnes, casco ajustable)" data-help="size">
                            <option value="">N/A</option>
                            <option value="XS">XS</option>
                            <option value="S">S</option>
                            <option value="M">M</option>
                            <option value="L">L</option>
                            <option value="XL">XL</option>
                            <option value="XXL">XXL</option>
                        </select>
                    </div>
                    <div>
                        <label style="color: #888; display: block; margin-bottom: 5px;" title="Identificador unico del EPP">N° Serie <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                        <input type="text" name="serial_number" class="hse-input" placeholder="Opcional" title="Numero de serie del fabricante si el EPP lo tiene. Util para trazabilidad y garantias." data-help="serial">
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="color: #888; display: block; margin-bottom: 5px;" title="Observaciones adicionales">Notas <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                    <textarea name="notes" class="hse-input" rows="2" style="resize: vertical;" title="Comentarios adicionales: estado del EPP, motivo de entrega, capacitacion realizada, etc." data-help="notes"></textarea>
                </div>

                <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" onclick="closeModal('hse-delivery-modal')" class="hse-btn" style="background: #444;">Cancelar</button>
                    <button type="submit" class="hse-btn hse-btn-primary">Registrar Entrega</button>
                </div>
            </form>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Cargar empleados
    loadEmployeesForDelivery();
}

async function loadEmployeesForDelivery() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/v1/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const employees = data.users || data || [];
            const select = document.getElementById('hse-delivery-employee');
            if (select) {
                select.innerHTML = '<option value="">Seleccionar empleado...</option>' +
                    employees.map(e => `<option value="${e.user_id || e.id}">${e.name || e.full_name} (${e.employee_id || 'N/A'})</option>`).join('');
            }
        }
    } catch (e) {
        console.error('[HSE] Error cargando empleados:', e);
    }
}

async function saveDelivery(event) {
    event.preventDefault();

    const form = event.target;
    const data = {
        employee_id: form.employee_id.value,
        epp_catalog_id: parseInt(form.epp_catalog_id.value),
        delivery_date: form.delivery_date.value,
        quantity_delivered: parseInt(form.quantity_delivered.value),
        size_delivered: form.size_delivered.value || null,
        serial_number: form.serial_number.value || null,
        notes: form.notes.value || null
    };

    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/v1/hse/deliveries', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            showNotification('Entrega registrada correctamente', 'success');
            closeModal('hse-delivery-modal');
            showHseTab('deliveries');
        } else {
            const error = await res.json();
            showNotification(error.error || 'Error registrando entrega', 'error');
        }
    } catch (e) {
        console.error('[HSE] Error guardando entrega:', e);
        showNotification('Error de conexion', 'error');
        closeModal('hse-delivery-modal');
    }
}

function openInspectionModal() {
    const modalHtml = `
    <div id="hse-inspection-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
        <div style="background: #1a1a2e; border-radius: 12px; padding: 25px; width: 500px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #fff; margin: 0;">🔍 Nueva Inspeccion</h3>
                <button onclick="closeModal('hse-inspection-modal')" style="background: none; border: none; color: #888; font-size: 24px; cursor: pointer;">&times;</button>
            </div>

            <form id="hse-inspection-form" onsubmit="saveInspection(event)">
                <div style="margin-bottom: 15px;">
                    <label style="color: #888; display: block; margin-bottom: 5px;" title="EPP entregado que sera inspeccionado">Entrega de EPP a Inspeccionar * <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                    <select name="delivery_id" class="hse-select" required title="Seleccione la entrega activa que desea inspeccionar. Se muestra: Empleado - EPP" data-help="delivery">
                        <option value="">Seleccionar...</option>
                        ${hseState.deliveries.filter(d => d.status === 'active').map(d =>
                            `<option value="${d.id}">${d.employee_name || 'N/A'} - ${d.epp_name || 'N/A'}</option>`
                        ).join('')}
                    </select>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="color: #888; display: block; margin-bottom: 5px;" title="Estado fisico actual del EPP">Condicion * <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                    <select name="condition" class="hse-select" required title="Evalua el estado fisico: Bueno (sin danos), Regular (desgaste menor), Malo (desgaste significativo), Danado (requiere reparacion), Inutilizable (reemplazar)" data-help="condition">
                        <option value="good">✓ Bueno</option>
                        <option value="fair">⚠ Regular</option>
                        <option value="poor">✗ Malo</option>
                        <option value="damaged">💥 Danado</option>
                        <option value="unusable">🚫 Inutilizable</option>
                    </select>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="color: #fff; display: flex; align-items: center; gap: 10px; cursor: pointer;" title="Indica si el EPP cumple con los estandares de seguridad requeridos">
                        <input type="checkbox" name="is_compliant" checked title="Marcar si el EPP cumple con los requisitos de normativa (certificaciones, estado, funcionalidad)" data-help="compliant">
                        Cumple con normativa <span style="color: #3498db; cursor: help;">&#9432;</span>
                    </label>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="color: #888; display: block; margin-bottom: 5px;" title="Accion necesaria segun el resultado de la inspeccion">Accion Requerida <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                    <select name="action_required" class="hse-select" title="Ninguna: EPP OK. Reparar: Puede ser reparado. Reemplazar: Requiere nuevo EPP. Capacitacion: Usuario necesita entrenamiento." data-help="action">
                        <option value="none">Ninguna</option>
                        <option value="repair">🔧 Reparar</option>
                        <option value="replace">🔄 Reemplazar</option>
                        <option value="training">📚 Capacitacion</option>
                    </select>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="color: #888; display: block; margin-bottom: 5px;" title="Detalles sobre la accion a realizar">Notas de la Accion <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                    <textarea name="action_notes" class="hse-input" rows="2" style="resize: vertical;" title="Describa los detalles de la accion: tipo de reparacion, motivo del reemplazo, fecha limite, responsable, etc." data-help="action_notes"></textarea>
                </div>

                <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" onclick="closeModal('hse-inspection-modal')" class="hse-btn" style="background: #444;">Cancelar</button>
                    <button type="submit" class="hse-btn hse-btn-primary">Registrar Inspeccion</button>
                </div>
            </form>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function saveInspection(event) {
    event.preventDefault();

    const form = event.target;
    const data = {
        delivery_id: parseInt(form.delivery_id.value),
        condition: form.condition.value,
        is_compliant: form.is_compliant.checked,
        action_required: form.action_required.value,
        action_notes: form.action_notes.value || null
    };

    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/v1/hse/inspections', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            showNotification('Inspeccion registrada correctamente', 'success');
            closeModal('hse-inspection-modal');
            showHseTab('inspections');
        } else {
            const error = await res.json();
            showNotification(error.error || 'Error registrando inspeccion', 'error');
        }
    } catch (e) {
        console.error('[HSE] Error guardando inspeccion:', e);
        showNotification('Error de conexion', 'error');
        closeModal('hse-inspection-modal');
    }
}

async function completeInspectionAction(id) {
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/v1/hse/inspections/${id}/complete`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showNotification('Accion marcada como completada', 'success');
            showHseTab('inspections');
        } else {
            const error = await res.json();
            showNotification(error.error || 'Error completando accion', 'error');
        }
    } catch (e) {
        console.error('[HSE] Error completando accion:', e);
        showNotification('Error de conexion', 'error');
    }
}

async function signDelivery(id) {
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/v1/hse/deliveries/${id}/sign`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ signatureMethod: 'digital' })
        });

        if (res.ok) {
            showNotification('Entrega firmada correctamente', 'success');
            showHseTab('deliveries');
        } else {
            const error = await res.json();
            showNotification(error.error || 'Error firmando entrega', 'error');
        }
    } catch (e) {
        console.error('[HSE] Error firmando entrega:', e);
        showNotification('Error de conexion', 'error');
    }
}

async function returnDelivery(id) {
    const reason = prompt('Razon de devolucion:', 'Fin de uso / Cambio de talle');
    if (!reason) return;

    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/v1/hse/deliveries/${id}/return`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ return_reason: reason })
        });

        if (res.ok) {
            showNotification('Devolucion registrada', 'success');
            showHseTab('deliveries');
        } else {
            const error = await res.json();
            showNotification(error.error || 'Error registrando devolucion', 'error');
        }
    } catch (e) {
        console.error('[HSE] Error registrando devolucion:', e);
        showNotification('Error de conexion', 'error');
    }
}

async function replaceDelivery(id) {
    if (!confirm('¿Registrar reemplazo de este EPP?')) return;

    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/v1/hse/deliveries/${id}/replace`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (res.ok) {
            showNotification('EPP reemplazado - Nueva entrega creada', 'success');
            showHseTab('deliveries');
        } else {
            const error = await res.json();
            showNotification(error.error || 'Error reemplazando EPP', 'error');
        }
    } catch (e) {
        console.error('[HSE] Error reemplazando EPP:', e);
        showNotification('Error de conexion', 'error');
    }
}

// ============================================================================
// UTILIDADES
// ============================================================================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function showNotification(message, type = 'info') {
    // Intentar usar el sistema de notificaciones existente
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else if (typeof Swal !== 'undefined') {
        Swal.fire({
            text: message,
            icon: type === 'error' ? 'error' : type === 'success' ? 'success' : 'info',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    } else {
        alert(message);
    }
}

// ============================================================================
// FUNCIONES DE EXPORTACION DE REPORTES
// ============================================================================

/**
 * Toggle del menu de exportacion
 */
function toggleExportMenu() {
    const menu = document.getElementById('hse-export-menu');
    if (menu) {
        const isVisible = menu.style.display !== 'none';
        menu.style.display = isVisible ? 'none' : 'block';

        // Cerrar al hacer click fuera
        if (!isVisible) {
            const closeOnOutsideClick = (e) => {
                if (!e.target.closest('.hse-export-dropdown')) {
                    menu.style.display = 'none';
                    document.removeEventListener('click', closeOnOutsideClick);
                }
            };
            setTimeout(() => document.addEventListener('click', closeOnOutsideClick), 100);
        }
    }
}

/**
 * Exportar reporte HSE en diferentes formatos
 * @param {string} format - Formato de exportacion: 'excel', 'pdf', 'word'
 */
async function exportHseReport(format = 'excel') {
    const menu = document.getElementById('hse-export-menu');
    if (menu) menu.style.display = 'none';

    showNotification(`Generando reporte ${format.toUpperCase()}...`, 'info');

    try {
        const token = localStorage.getItem('token');
        const currentTab = hseState.currentTab || 'dashboard';

        // Recopilar datos segun la tab actual
        let reportData = {
            title: 'Reporte HSE - Seguridad e Higiene Laboral',
            generatedAt: new Date().toISOString(),
            section: currentTab,
            companyName: localStorage.getItem('company_name') || 'Empresa'
        };

        // Obtener datos segun la seccion actual
        switch (currentTab) {
            case 'dashboard':
                reportData.title = 'Dashboard HSE - Resumen General';
                reportData.data = await getHseDashboardData();
                break;
            case 'catalog':
                reportData.title = 'Catalogo de EPP';
                reportData.data = hseState.catalogItems || [];
                break;
            case 'matrix':
                reportData.title = 'Matriz Rol-EPP';
                reportData.data = hseState.requirements || [];
                break;
            case 'deliveries':
                reportData.title = 'Entregas de EPP';
                reportData.data = await getDeliveriesForExport();
                break;
            case 'inspections':
                reportData.title = 'Inspecciones de EPP';
                reportData.data = await getInspectionsForExport();
                break;
            case 'config':
                reportData.title = 'Configuracion HSE';
                reportData.data = hseState.config || {};
                break;
        }

        // Generar segun formato
        switch (format) {
            case 'excel':
                await generateExcelReport(reportData);
                break;
            case 'pdf':
                await generatePdfReport(reportData);
                break;
            case 'word':
                await generateWordReport(reportData);
                break;
            default:
                showNotification('Formato no soportado', 'error');
        }

    } catch (error) {
        console.error('[HSE] Error exportando reporte:', error);
        showNotification('Error al generar el reporte: ' + error.message, 'error');
    }
}

/**
 * Obtener datos del dashboard para exportacion
 */
async function getHseDashboardData() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/v1/hse/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.error('[HSE] Error obteniendo dashboard:', e);
    }
    return {};
}

/**
 * Obtener entregas para exportacion
 */
async function getDeliveriesForExport() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/v1/hse/deliveries', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            return data.deliveries || [];
        }
    } catch (e) {
        console.error('[HSE] Error obteniendo entregas:', e);
    }
    return [];
}

/**
 * Obtener inspecciones para exportacion
 */
async function getInspectionsForExport() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/v1/hse/inspections', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            return data.inspections || [];
        }
    } catch (e) {
        console.error('[HSE] Error obteniendo inspecciones:', e);
    }
    return [];
}

/**
 * Generar reporte Excel usando SheetJS (si disponible) o CSV
 */
async function generateExcelReport(reportData) {
    const { title, data, section, companyName, generatedAt } = reportData;

    // Si hay SheetJS disponible, usar formato XLSX
    if (typeof XLSX !== 'undefined') {
        const wb = XLSX.utils.book_new();

        // Crear hoja con datos
        let wsData = [];
        wsData.push([title]);
        wsData.push([`Empresa: ${companyName}`]);
        wsData.push([`Generado: ${new Date(generatedAt).toLocaleString()}`]);
        wsData.push([]);

        if (Array.isArray(data) && data.length > 0) {
            // Headers
            const headers = Object.keys(data[0]);
            wsData.push(headers);

            // Rows
            data.forEach(item => {
                wsData.push(headers.map(h => item[h] || ''));
            });
        } else if (typeof data === 'object') {
            // Para objetos como config o dashboard
            Object.entries(data).forEach(([key, value]) => {
                wsData.push([key, typeof value === 'object' ? JSON.stringify(value) : value]);
            });
        }

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, section);
        XLSX.writeFile(wb, `HSE_${section}_${Date.now()}.xlsx`);
        showNotification('Reporte Excel generado exitosamente', 'success');
    } else {
        // Fallback a CSV
        await generateCsvReport(reportData);
    }
}

/**
 * Fallback: Generar CSV
 */
async function generateCsvReport(reportData) {
    const { title, data, section, companyName, generatedAt } = reportData;

    let csv = `"${title}"\n`;
    csv += `"Empresa: ${companyName}"\n`;
    csv += `"Generado: ${new Date(generatedAt).toLocaleString()}"\n\n`;

    if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        csv += headers.map(h => `"${h}"`).join(',') + '\n';

        data.forEach(item => {
            csv += headers.map(h => {
                const val = item[h];
                if (val === null || val === undefined) return '""';
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(',') + '\n';
        });
    }

    downloadFile(csv, `HSE_${section}_${Date.now()}.csv`, 'text/csv;charset=utf-8');
    showNotification('Reporte CSV generado exitosamente', 'success');
}

/**
 * Generar reporte PDF
 */
async function generatePdfReport(reportData) {
    const { title, data, section, companyName, generatedAt } = reportData;

    // Si hay jsPDF disponible
    if (typeof jspdf !== 'undefined' || typeof jsPDF !== 'undefined') {
        const doc = new (jspdf?.jsPDF || jsPDF)();

        doc.setFontSize(18);
        doc.text(title, 20, 20);

        doc.setFontSize(10);
        doc.text(`Empresa: ${companyName}`, 20, 30);
        doc.text(`Generado: ${new Date(generatedAt).toLocaleString()}`, 20, 36);

        let yPos = 50;

        if (Array.isArray(data) && data.length > 0) {
            const headers = Object.keys(data[0]).slice(0, 5); // Max 5 columnas

            // Headers
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            headers.forEach((h, i) => {
                doc.text(String(h).substring(0, 15), 20 + (i * 35), yPos);
            });

            yPos += 8;
            doc.setFont(undefined, 'normal');

            // Rows
            data.slice(0, 30).forEach(item => { // Max 30 filas
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                headers.forEach((h, i) => {
                    const val = item[h] || '';
                    doc.text(String(val).substring(0, 18), 20 + (i * 35), yPos);
                });
                yPos += 6;
            });
        }

        doc.save(`HSE_${section}_${Date.now()}.pdf`);
        showNotification('Reporte PDF generado exitosamente', 'success');
    } else {
        // Fallback: abrir ventana de impresion
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #1e3a5f; }
                    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background: #1e3a5f; color: white; }
                    .meta { color: #666; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <div class="meta">
                    <p>Empresa: ${companyName}</p>
                    <p>Generado: ${new Date(generatedAt).toLocaleString()}</p>
                </div>
                ${generateHtmlTable(data)}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
        showNotification('Ventana de impresion abierta - Seleccione "Guardar como PDF"', 'info');
    }
}

/**
 * Generar reporte Word (DOCX)
 */
async function generateWordReport(reportData) {
    const { title, data, section, companyName, generatedAt } = reportData;

    // Si hay docx disponible
    if (typeof docx !== 'undefined') {
        // Usar libreria docx si esta disponible
        showNotification('Generando documento Word...', 'info');
        // ... implementacion con docx
    } else {
        // Fallback: generar HTML y descargar como .doc
        const html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office"
                  xmlns:w="urn:schemas-microsoft-com:office:word">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; }
                    h1 { color: #1e3a5f; }
                    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                    th, td { border: 1px solid #000; padding: 8px; }
                    th { background: #1e3a5f; color: white; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <p><strong>Empresa:</strong> ${companyName}</p>
                <p><strong>Generado:</strong> ${new Date(generatedAt).toLocaleString()}</p>
                ${generateHtmlTable(data)}
            </body>
            </html>
        `;

        downloadFile(html, `HSE_${section}_${Date.now()}.doc`, 'application/msword');
        showNotification('Reporte Word generado exitosamente', 'success');
    }
}

/**
 * Generar tabla HTML para reportes
 */
function generateHtmlTable(data) {
    if (!Array.isArray(data) || data.length === 0) {
        if (typeof data === 'object') {
            return `<table>
                <tr><th>Parametro</th><th>Valor</th></tr>
                ${Object.entries(data).map(([k, v]) =>
                    `<tr><td>${k}</td><td>${typeof v === 'object' ? JSON.stringify(v) : v}</td></tr>`
                ).join('')}
            </table>`;
        }
        return '<p>No hay datos para mostrar</p>';
    }

    const headers = Object.keys(data[0]);
    return `
        <table>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
            ${data.map(item =>
                `<tr>${headers.map(h => `<td>${item[h] || ''}</td>`).join('')}</tr>`
            ).join('')}
        </table>
    `;
}

/**
 * Descargar archivo
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Filtros adicionales
async function filterDeliveries() {
    const status = document.getElementById('hse-deliveries-status-filter')?.value;
    const search = document.getElementById('hse-deliveries-search')?.value;

    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    try {
        const res = await fetch(`/api/v1/hse/deliveries?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            let deliveries = data.deliveries || [];

            // Filtro local por busqueda
            if (search) {
                const searchLower = search.toLowerCase();
                deliveries = deliveries.filter(d =>
                    (d.employee_name || '').toLowerCase().includes(searchLower) ||
                    (d.epp_name || '').toLowerCase().includes(searchLower)
                );
            }

            document.getElementById('hse-deliveries-body').innerHTML = renderDeliveriesRows(deliveries);
        }
    } catch (e) {
        console.error('[HSE] Error filtrando entregas:', e);
    }
}

async function filterInspections() {
    const condition = document.getElementById('hse-inspections-condition-filter')?.value;
    const pendingOnly = document.getElementById('hse-inspections-pending')?.checked;

    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (condition) params.append('condition', condition);
    if (pendingOnly) params.append('actionRequired', 'true');

    try {
        const res = await fetch(`/api/v1/hse/inspections?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            document.getElementById('hse-inspections-body').innerHTML = renderInspectionsRows(data.inspections || []);
        }
    } catch (e) {
        console.error('[HSE] Error filtrando inspecciones:', e);
    }
}

async function filterMatrixByPosition() {
    const positionId = document.getElementById('hse-matrix-position-filter')?.value;

    const token = localStorage.getItem('token');
    const url = positionId
        ? `/api/v1/hse/requirements/position/${positionId}`
        : '/api/v1/hse/requirements/matrix';

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            document.getElementById('hse-matrix-body').innerHTML = renderMatrixRows(data.matrix || data.requirements || []);
        }
    } catch (e) {
        console.error('[HSE] Error filtrando matriz:', e);
    }
}

// Requirement modal
function openRequirementModal() {
    const modalHtml = `
    <div id="hse-requirement-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
        <div style="background: #1a1a2e; border-radius: 12px; padding: 25px; width: 500px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #fff; margin: 0;">🎯 Asignar EPP a Posicion</h3>
                <button onclick="closeModal('hse-requirement-modal')" style="background: none; border: none; color: #888; font-size: 24px; cursor: pointer;">&times;</button>
            </div>

            <form id="hse-requirement-form" onsubmit="saveRequirement(event)">
                <div style="margin-bottom: 15px;">
                    <label style="color: #888; display: block; margin-bottom: 5px;" title="Cargo o rol que requiere este EPP">Posicion Organizacional * <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                    <select name="position_id" class="hse-select" required title="Seleccione el puesto de trabajo que requiere este EPP. La matriz se aplica a todos los empleados con esta posicion." data-help="position">
                        <option value="">Seleccionar posicion...</option>
                        ${hseState.positions.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                    </select>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="color: #888; display: block; margin-bottom: 5px;" title="EPP que debe tener esta posicion">EPP Requerido * <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                    <select name="epp_catalog_id" class="hse-select" required title="Seleccione el EPP del catalogo que es necesario para este puesto de trabajo." data-help="epp_required">
                        <option value="">Seleccionar EPP...</option>
                        ${hseState.catalog.filter(c => c.is_active).map(c => `<option value="${c.id}">${c.code} - ${c.name}</option>`).join('')}
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="color: #888; display: block; margin-bottom: 5px;" title="Cuantas unidades necesita cada empleado">Cantidad <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                        <input type="number" name="quantity_required" class="hse-input" value="1" min="1" title="Numero de unidades requeridas por empleado. Ej: 2 pares de guantes, 1 casco." data-help="quantity_req">
                    </div>
                    <div>
                        <label style="color: #888; display: block; margin-bottom: 5px;" title="Vida util especifica para este rol">Vida Util Custom (dias) <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                        <input type="number" name="custom_lifespan_days" class="hse-input" placeholder="Dejar vacio para usar default" title="Si este rol tiene mayor desgaste del EPP, especifique dias de vida util menores. Vacio = usar default del catalogo." data-help="custom_lifespan">
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="color: #fff; display: flex; align-items: center; gap: 10px; cursor: pointer;" title="Define si es obligatorio o solo recomendado">
                        <input type="checkbox" name="is_mandatory" checked title="Obligatorio: El empleado debe tener este EPP para trabajar. Recomendado: Sugerido pero no mandatorio." data-help="mandatory">
                        Es obligatorio (vs recomendado) <span style="color: #3498db; cursor: help;">&#9432;</span>
                    </label>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="color: #888; display: block; margin-bottom: 5px;" title="Restricciones o situaciones en que se aplica">Condiciones especiales <span style="color: #3498db; cursor: help;">&#9432;</span></label>
                    <textarea name="conditions" class="hse-input" rows="2" style="resize: vertical;" placeholder="Ej: Solo para trabajo en altura" title="Especifique cuando se requiere este EPP: trabajo en altura, zonas de riesgo electrico, exposicion a quimicos, etc." data-help="conditions"></textarea>
                </div>

                <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" onclick="closeModal('hse-requirement-modal')" class="hse-btn" style="background: #444;">Cancelar</button>
                    <button type="submit" class="hse-btn hse-btn-primary">Asignar EPP</button>
                </div>
            </form>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function saveRequirement(event) {
    event.preventDefault();

    const form = event.target;
    const data = {
        position_id: parseInt(form.position_id.value),
        epp_catalog_id: parseInt(form.epp_catalog_id.value),
        quantity_required: parseInt(form.quantity_required.value),
        custom_lifespan_days: form.custom_lifespan_days.value ? parseInt(form.custom_lifespan_days.value) : null,
        is_mandatory: form.is_mandatory.checked,
        conditions: form.conditions.value || null
    };

    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/v1/hse/requirements', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            showNotification('Requerimiento creado correctamente', 'success');
            closeModal('hse-requirement-modal');
            showHseTab('matrix');
        } else {
            const error = await res.json();
            showNotification(error.error || 'Error creando requerimiento', 'error');
        }
    } catch (e) {
        console.error('[HSE] Error guardando requerimiento:', e);
        showNotification('Error de conexion', 'error');
        closeModal('hse-requirement-modal');
    }
}

async function deleteRequirement(id) {
    if (!confirm('¿Eliminar este requerimiento?')) return;

    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/v1/hse/requirements/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showNotification('Requerimiento eliminado', 'success');
            showHseTab('matrix');
        } else {
            const error = await res.json();
            showNotification(error.error || 'Error eliminando requerimiento', 'error');
        }
    } catch (e) {
        console.error('[HSE] Error eliminando requerimiento:', e);
        showNotification('Error de conexion', 'error');
    }
}

// Exportar para uso global
window.initHseManagement = initHseManagement;
window.showHseTab = showHseTab;
window.openCatalogModal = openCatalogModal;
window.saveCatalogItem = saveCatalogItem;
window.editCatalogItem = editCatalogItem;
window.deleteCatalogItem = deleteCatalogItem;
window.filterCatalog = filterCatalog;
window.openDeliveryModal = openDeliveryModal;
window.saveDelivery = saveDelivery;
window.signDelivery = signDelivery;
window.returnDelivery = returnDelivery;
window.replaceDelivery = replaceDelivery;
window.filterDeliveries = filterDeliveries;
window.openInspectionModal = openInspectionModal;
window.saveInspection = saveInspection;
window.completeInspectionAction = completeInspectionAction;
window.filterInspections = filterInspections;
window.openRequirementModal = openRequirementModal;
window.saveRequirement = saveRequirement;
window.deleteRequirement = deleteRequirement;
window.filterMatrixByPosition = filterMatrixByPosition;
window.saveHseConfig = saveHseConfig;
window.exportHseReport = exportHseReport;
window.toggleExportMenu = toggleExportMenu;
window.closeModal = closeModal;

console.log('[HSE] Modulo hse-management.js cargado');

// ============================================================================
// REGISTRO EN window.Modules (para carga dinamica)
// ============================================================================
window.Modules = window.Modules || {};
window.Modules['hse-management'] = {
    init: function() {
        // El sistema de carga dinamica llama init() sin parametros
        // Debemos encontrar el container nosotros mismos
        const container = document.getElementById('mainContent') ||
                         document.getElementById('module-content') ||
                         document.getElementById('hse-container');
        if (container) {
            initHseManagement(container);
        } else {
            console.error('[HSE] No se encontro container (mainContent/module-content/hse-container)');
        }
    }
};
console.log('[HSE] Registrado en window.Modules');
