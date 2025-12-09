// SIAC - Módulo de Facturación (DARK THEME + AFIP + 5 TABS)
console.log('🧾 [FACTURACIÓN] Módulo de Facturación SIAC v3.0 cargado (Dark Theme + AFIP + 5 Tabs)');

// ============================================
// DARK THEME PALETTE (COMPARTIDA CON CLIENTES)
// ============================================
const DARK_COLORS_FACT = {
    background: '#0f1419',
    cardBg: '#1a1f2e',
    cardBgHover: '#242938',
    headerBg: 'linear-gradient(135deg, #1e3a5f 0%, #2c5f8d 100%)',
    primary: '#4a9eff',
    primaryHover: '#6bb3ff',
    success: '#3dd56d',
    warning: '#ffb84d',
    danger: '#ff6b6b',
    text: '#e8eaed',
    textSecondary: '#9aa0a6',
    border: '#2d3748',
    inputBg: '#151a23',
    inputBorder: '#3a4556',
    purple: '#a855f7',
    cyan: '#22d3ee'
};

// ============================================
// ESTADO GLOBAL DEL MÓDULO
// ============================================
let facturacionState = {
    currentTab: 'facturacion', // facturacion, facturas-emitidas, config-afip
    currentMode: 'manual', // manual, ocasional, recurrente (solo para tab facturacion)
    facturasTemporales: [],
    presupuestos: [],
    tiposComprobante: ['Factura A', 'Factura B', 'Factura C', 'Nota de Crédito', 'Nota de Débito'],
    condicionesVenta: ['Contado', '30 días', '60 días', '90 días'],
    sessionId: null,
    terminalId: 'WEB01',
    companyId: parseInt(localStorage.getItem('company_id') || '4'),
    token: localStorage.getItem('token')
};

// ============================================
// SISTEMA DE AYUDA CONTEXTUAL
// ============================================
const FacturacionHelpSystem = {
    moduleName: 'Sistema de Facturación SIAC',
    contexts: {
        facturacion: {
            title: 'Facturación - 3 Modos',
            tips: [
                '📝 MODO MANUAL: Factura directa sin presupuesto (para ventas ad-hoc).',
                '📋 MODO OCASIONAL: Presupuesto → Factura 1 vez (proyectos únicos).',
                '🔄 MODO RECURRENTE: Presupuesto → Facturas periódicas (servicios continuos).'
            ]
        },
        facturasEmitidas: {
            title: 'Facturas Emitidas',
            tips: [
                '💡 Aquí se listan TODAS las facturas emitidas, independientemente del modo de creación.',
                '🔍 Usa los filtros para buscar por cliente, número de factura, rango de fechas, o estado AFIP.',
                '📜 Haz clic en "Ver CAE" para visualizar el Código de Autorización Electrónica de AFIP.'
            ],
            warnings: [
                '⚠️ Facturas con estado AFIP "PENDIENTE" aún no tienen CAE. Debes solicitarlo manualmente.',
                '⚠️ Solo facturas con CAE aprobado son válidas fiscalmente.'
            ]
        },
        configAfip: {
            title: 'Configuración AFIP',
            tips: [
                '🔐 Sube el certificado digital (.p12) y clave privada de tu empresa (provisto por AFIP).',
                '📍 Configura puntos de venta por sucursal (cada sucursal puede tener múltiples puntos de venta).',
                '🔑 El token WSAA se renueva automáticamente cada 12 horas.',
                '🧪 Puedes alternar entre ambiente de TESTING y PRODUCCIÓN.'
            ],
            warnings: [
                '⚠️ Nunca compartas tu certificado digital con terceros.',
                '⚠️ Verifica que el punto de venta esté correctamente registrado en AFIP antes de facturar.'
            ]
        }
    },

    renderBanner(context) {
        const ctx = this.contexts[context];
        if (!ctx) return '';

        return `
            <div style="background: ${DARK_COLORS_FACT.cardBg}; border: 1px solid ${DARK_COLORS_FACT.primary}; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="font-size: 24px; flex-shrink: 0;">💡</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: ${DARK_COLORS_FACT.text}; margin-bottom: 8px;">${ctx.title}</div>
                        ${ctx.tips.map(tip => `<div style="color: ${DARK_COLORS_FACT.textSecondary}; font-size: 13px; margin-bottom: 4px;">${tip}</div>`).join('')}
                        ${ctx.warnings && ctx.warnings.length > 0 ? ctx.warnings.map(warn => `<div style="color: ${DARK_COLORS_FACT.warning}; font-size: 13px; margin-top: 8px;">${warn}</div>`).join('') : ''}
                    </div>
                </div>
            </div>
        `;
    }
};

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================
function showFacturacionContent() {
    console.log('🧾 [FACTURACIÓN] Iniciando módulo de facturación SIAC v3.0');

    let content = document.getElementById('mainContent');
    if (!content) {
        content = document.querySelector('.content');
        if (!content) {
            content = document.createElement('div');
            content.id = 'facturacionContainer';
            content.style.cssText = `padding: 20px; width: 100%; min-height: 500px; background: ${DARK_COLORS_FACT.background};`;
            document.body.appendChild(content);
        }
    }

    content.style.setProperty('display', 'block', 'important');
    content.style.setProperty('background', DARK_COLORS_FACT.background, 'important');
    content.style.visibility = 'visible';
    content.style.opacity = '1';

    content.innerHTML = `
        <div class="tab-content active">
            <div class="facturacion-container" style="padding: 20px;">
                <!-- Back Button -->
                <div style="margin-bottom: 20px;">
                    <button onclick="goBackToModules()" style="background: ${DARK_COLORS_FACT.cardBg}; color: ${DARK_COLORS_FACT.text}; padding: 10px 20px; border: 1px solid ${DARK_COLORS_FACT.border}; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s;">
                        ← Volver a Módulos
                    </button>
                </div>

                <!-- Header -->
                <div class="facturacion-header" style="background: ${DARK_COLORS_FACT.headerBg}; color: ${DARK_COLORS_FACT.text}; padding: 25px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; font-size: 28px; color: ${DARK_COLORS_FACT.text};">🧾 Sistema de Facturación</h2>
                            <p style="margin: 10px 0 0 0; opacity: 0.9; color: ${DARK_COLORS_FACT.textSecondary};">Sistema Integrado de Administración Comercial - SIAC v3.0</p>
                            <div style="font-size: 12px; opacity: 0.7; margin-top: 5px; color: ${DARK_COLORS_FACT.textSecondary};">
                                Terminal: <strong id="terminalInfo">${facturacionState.terminalId}</strong> |
                                Sesión: <strong id="sessionInfo">Cargando...</strong> |
                                AFIP Ready 🇦🇷
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 32px; font-weight: bold; color: ${DARK_COLORS_FACT.primary};" id="facturasEnCurso">0</div>
                            <div style="font-size: 12px; opacity: 0.9; color: ${DARK_COLORS_FACT.textSecondary};">En Curso</div>
                        </div>
                    </div>
                </div>

                <!-- TAB SELECTOR (5 TABS) -->
                <div class="tab-selector" style="display: flex; gap: 10px; margin-bottom: 25px; overflow-x: auto;">
                    <button onclick="switchTab('facturacion')" id="tabFacturacion" class="tab-btn active-tab" style="flex: 1; padding: 15px 20px; border: 2px solid ${DARK_COLORS_FACT.success}; border-radius: 10px; cursor: pointer; background: ${DARK_COLORS_FACT.cardBg}; color: ${DARK_COLORS_FACT.text}; transition: all 0.3s; min-width: 180px;">
                        <div style="font-size: 24px; margin-bottom: 5px;">🧾</div>
                        <div style="font-weight: bold;">Facturación</div>
                        <div style="font-size: 11px; opacity: 0.8;">3 Modos</div>
                    </button>
                    <button onclick="switchTab('facturas-emitidas')" id="tabFacturasEmitidas" class="tab-btn" style="flex: 1; padding: 15px 20px; border: 2px solid ${DARK_COLORS_FACT.border}; border-radius: 10px; cursor: pointer; background: ${DARK_COLORS_FACT.cardBg}; color: ${DARK_COLORS_FACT.text}; transition: all 0.3s; min-width: 180px;">
                        <div style="font-size: 24px; margin-bottom: 5px;">📜</div>
                        <div style="font-weight: bold;">Facturas Emitidas</div>
                        <div style="font-size: 11px; opacity: 0.8;">Historial + CAE</div>
                    </button>
                    <button onclick="switchTab('config-afip')" id="tabConfigAfip" class="tab-btn" style="flex: 1; padding: 15px 20px; border: 2px solid ${DARK_COLORS_FACT.border}; border-radius: 10px; cursor: pointer; background: ${DARK_COLORS_FACT.cardBg}; color: ${DARK_COLORS_FACT.text}; transition: all 0.3s; min-width: 180px;">
                        <div style="font-size: 24px; margin-bottom: 5px;">⚙️</div>
                        <div style="font-weight: bold;">Configuración AFIP</div>
                        <div style="font-size: 11px; opacity: 0.8;">Certificados + Ptos Venta</div>
                    </button>
                </div>

                <!-- CONTENT AREA DINÁMICO -->
                <div id="tabContentArea">
                    <!-- Se llenará dinámicamente según tab activo -->
                </div>
            </div>
        </div>
    `;

    // Inicializar el sistema
    initializeFacturacionSystem();
    switchTab('facturacion'); // Cargar tab Facturación por defecto
}

// ============================================
// INICIALIZAR SISTEMA
// ============================================
function initializeFacturacionSystem() {
    facturacionState.sessionId = generateFacturacionSessionId();

    const sessionInfo = document.getElementById('sessionInfo');
    if (sessionInfo) {
        sessionInfo.textContent = facturacionState.sessionId.substring(0, 16) + '...';
    }

    console.log('✅ [FACTURACIÓN] Sistema inicializado con sessionId:', facturacionState.sessionId);
}

function generateFacturacionSessionId() {
    const timestamp = Date.now();
    return `FACT_${facturacionState.companyId}_${facturacionState.terminalId}_${timestamp}`;
}

// ============================================
// SWITCH TAB (FACTURACIÓN / FACTURAS EMITIDAS / CONFIG AFIP)
// ============================================
function switchTab(tab) {
    facturacionState.currentTab = tab;

    // Actualizar botones de tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.style.borderColor = DARK_COLORS_FACT.border;
        btn.style.background = DARK_COLORS_FACT.cardBg;
        btn.style.transform = 'scale(1)';
    });

    const activeBtn = document.getElementById(`tab${tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`);
    if (activeBtn) {
        activeBtn.style.borderColor = DARK_COLORS_FACT.success;
        activeBtn.style.background = DARK_COLORS_FACT.cardBgHover;
        activeBtn.style.transform = 'scale(1.03)';
    }

    // Cargar contenido según tab
    switch (tab) {
        case 'facturacion':
            loadFacturacionTab();
            break;
        case 'facturas-emitidas':
            loadFacturasEmitidasTab();
            break;
        case 'config-afip':
            loadConfigAfipTab();
            break;
    }
}

// ============================================
// TAB 1: FACTURACIÓN (3 MODOS)
// ============================================
function loadFacturacionTab() {
    const contentArea = document.getElementById('tabContentArea');
    contentArea.innerHTML = `
        <!-- Help Banner -->
        ${FacturacionHelpSystem.renderBanner('facturacion')}

        <!-- Mode Selector (3 MODOS) -->
        <div class="mode-selector" style="display: flex; gap: 15px; margin-bottom: 25px;">
            <button onclick="switchMode('manual')" id="btnModeManual" class="mode-btn active-mode" style="flex: 1; padding: 20px; border: 2px solid ${DARK_COLORS_FACT.success}; border-radius: 12px; cursor: pointer; background: ${DARK_COLORS_FACT.inputBg}; transition: all 0.3s;">
                <div style="font-size: 32px; margin-bottom: 10px;">📝</div>
                <div style="font-weight: bold; color: ${DARK_COLORS_FACT.text}; margin-bottom: 5px;">MODO MANUAL</div>
                <div style="font-size: 13px; color: ${DARK_COLORS_FACT.textSecondary};">Factura directa sin presupuesto</div>
            </button>
            <button onclick="switchMode('ocasional')" id="btnModeOcasional" class="mode-btn" style="flex: 1; padding: 20px; border: 2px solid ${DARK_COLORS_FACT.border}; border-radius: 12px; cursor: pointer; background: ${DARK_COLORS_FACT.inputBg}; transition: all 0.3s;">
                <div style="font-size: 32px; margin-bottom: 10px;">📋</div>
                <div style="font-weight: bold; color: ${DARK_COLORS_FACT.text}; margin-bottom: 5px;">MODO OCASIONAL</div>
                <div style="font-size: 13px; color: ${DARK_COLORS_FACT.textSecondary};">Presupuesto → Factura 1 vez</div>
            </button>
            <button onclick="switchMode('recurrente')" id="btnModeRecurrente" class="mode-btn" style="flex: 1; padding: 20px; border: 2px solid ${DARK_COLORS_FACT.border}; border-radius: 12px; cursor: pointer; background: ${DARK_COLORS_FACT.inputBg}; transition: all 0.3s;">
                <div style="font-size: 32px; margin-bottom: 10px;">🔄</div>
                <div style="font-weight: bold; color: ${DARK_COLORS_FACT.text}; margin-bottom: 5px;">MODO RECURRENTE</div>
                <div style="font-size: 13px; color: ${DARK_COLORS_FACT.textSecondary};">Presupuesto → Facturas periódicas</div>
            </button>
        </div>

        <!-- Content Area (Dinámico según modo) -->
        <div id="modeContentArea">
            <!-- Se llenará dinámicamente según modo activo -->
        </div>
    `;

    switchMode('manual'); // Cargar modo MANUAL por defecto
}

// ============================================
// SWITCH MODE (MANUAL / OCASIONAL / RECURRENTE)
// ============================================
function switchMode(mode) {
    facturacionState.currentMode = mode;

    // Actualizar botones de modo
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.style.borderColor = DARK_COLORS_FACT.border;
        btn.style.background = DARK_COLORS_FACT.inputBg;
        btn.style.transform = 'scale(1)';
    });

    const activeBtn = document.getElementById(`btnMode${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    if (activeBtn) {
        activeBtn.style.borderColor = mode === 'manual' ? DARK_COLORS_FACT.success : mode === 'ocasional' ? DARK_COLORS_FACT.cyan : DARK_COLORS_FACT.purple;
        activeBtn.style.background = DARK_COLORS_FACT.cardBg;
        activeBtn.style.transform = 'scale(1.05)';
    }

    // Cargar contenido según modo
    switch (mode) {
        case 'manual':
            loadManualMode();
            break;
        case 'ocasional':
            loadOcasionalMode();
            break;
        case 'recurrente':
            loadRecurrenteMode();
            break;
    }
}

// ============================================
// MODO MANUAL (SIMPLIFICADO - DARK THEME)
// ============================================
function loadManualMode() {
    const contentArea = document.getElementById('modeContentArea');
    contentArea.innerHTML = `
        <div class="quick-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
            <button onclick="nuevaFacturaManual()" class="action-btn" style="background: ${DARK_COLORS_FACT.success}; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s; box-shadow: 0 2px 8px rgba(61,213,109,0.3);">
                <span style="font-size: 20px;">📝</span> Nueva Factura Manual
            </button>
        </div>

        <div style="background: ${DARK_COLORS_FACT.cardBg}; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
            <h3 style="margin: 0 0 15px 0; color: ${DARK_COLORS_FACT.text};">📋 Facturas Manuales Pendientes</h3>
            <div style="text-align: center; padding: 40px; color: ${DARK_COLORS_FACT.textSecondary};">
                <div style="font-size: 48px; margin-bottom: 10px;">📝</div>
                <div>Modo MANUAL simplificado</div>
                <div style="font-size: 13px; margin-top: 5px;">Haz clic en "Nueva Factura Manual" para comenzar</div>
            </div>
        </div>
    `;
}

function nuevaFacturaManual() {
    alert('📝 Nueva Factura Manual\n\n(Modal de creación - Próximamente)');
}

// ============================================
// MODO OCASIONAL (SIMPLIFICADO - DARK THEME)
// ============================================
function loadOcasionalMode() {
    const contentArea = document.getElementById('modeContentArea');
    contentArea.innerHTML = `
        <div class="quick-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
            <button onclick="nuevoPresupuestoOcasional()" class="action-btn" style="background: ${DARK_COLORS_FACT.cyan}; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s; box-shadow: 0 2px 8px rgba(34,211,238,0.3);">
                <span style="font-size: 20px;">📋</span> Nuevo Presupuesto OCASIONAL
            </button>
        </div>

        <div style="background: ${DARK_COLORS_FACT.cardBg}; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
            <h3 style="margin: 0 0 15px 0; color: ${DARK_COLORS_FACT.text};">📋 Presupuestos OCASIONALES</h3>
            <div style="text-align: center; padding: 40px; color: ${DARK_COLORS_FACT.textSecondary};">
                <div style="font-size: 48px; margin-bottom: 10px;">📋</div>
                <div>No hay presupuestos OCASIONALES</div>
                <div style="font-size: 13px; margin-top: 5px;">Crea tu primer presupuesto</div>
            </div>
        </div>
    `;
}

function nuevoPresupuestoOcasional() {
    alert('📋 Nuevo Presupuesto OCASIONAL\n\n(Modal de creación - Próximamente)');
}

// ============================================
// MODO RECURRENTE (SIMPLIFICADO - DARK THEME)
// ============================================
function loadRecurrenteMode() {
    const contentArea = document.getElementById('modeContentArea');
    contentArea.innerHTML = `
        <div class="quick-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
            <button onclick="nuevoPresupuestoRecurrente()" class="action-btn" style="background: ${DARK_COLORS_FACT.purple}; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s; box-shadow: 0 2px 8px rgba(168,85,247,0.3);">
                <span style="font-size: 20px;">🔄</span> Nuevo Presupuesto RECURRENTE
            </button>
        </div>

        <div style="background: ${DARK_COLORS_FACT.cardBg}; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
            <h3 style="margin: 0 0 15px 0; color: ${DARK_COLORS_FACT.text};">🔄 Presupuestos RECURRENTES</h3>
            <div style="text-align: center; padding: 40px; color: ${DARK_COLORS_FACT.textSecondary};">
                <div style="font-size: 48px; margin-bottom: 10px;">🔄</div>
                <div>No hay presupuestos RECURRENTES</div>
                <div style="font-size: 13px; margin-top: 5px;">Crea tu primer presupuesto recurrente</div>
            </div>
        </div>
    `;
}

function nuevoPresupuestoRecurrente() {
    alert('🔄 Nuevo Presupuesto RECURRENTE\n\n(Modal de creación - Próximamente)');
}

// ============================================
// TAB 2: FACTURAS EMITIDAS (NUEVO)
// ============================================
function loadFacturasEmitidasTab() {
    const contentArea = document.getElementById('tabContentArea');
    contentArea.innerHTML = `
        <!-- Help Banner -->
        ${FacturacionHelpSystem.renderBanner('facturasEmitidas')}

        <!-- Filtros -->
        <div class="search-filters" style="background: ${DARK_COLORS_FACT.cardBg}; border-radius: 12px; padding: 20px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 15px; align-items: center;">
                <input type="text" id="searchFacturas" placeholder="🔍 Buscar por cliente, número de factura..." style="padding: 12px; border: 1px solid ${DARK_COLORS_FACT.inputBorder}; background: ${DARK_COLORS_FACT.inputBg}; color: ${DARK_COLORS_FACT.text}; border-radius: 6px; font-size: 14px;">
                <select id="estadoAfipFilter" style="padding: 12px; border: 1px solid ${DARK_COLORS_FACT.inputBorder}; background: ${DARK_COLORS_FACT.inputBg}; color: ${DARK_COLORS_FACT.text}; border-radius: 6px;">
                    <option value="">Todos los estados AFIP</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="APROBADO">APROBADO</option>
                    <option value="RECHAZADO">RECHAZADO</option>
                </select>
                <input type="date" id="fechaDesde" style="padding: 12px; border: 1px solid ${DARK_COLORS_FACT.inputBorder}; background: ${DARK_COLORS_FACT.inputBg}; color: ${DARK_COLORS_FACT.text}; border-radius: 6px;">
                <input type="date" id="fechaHasta" style="padding: 12px; border: 1px solid ${DARK_COLORS_FACT.inputBorder}; background: ${DARK_COLORS_FACT.inputBg}; color: ${DARK_COLORS_FACT.text}; border-radius: 6px;">
                <button onclick="buscarFacturasEmitidas()" style="background: ${DARK_COLORS_FACT.primary}; color: white; padding: 12px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    🔍 Buscar
                </button>
            </div>
        </div>

        <!-- Tabla de Facturas Emitidas -->
        <div class="facturas-table" style="background: ${DARK_COLORS_FACT.cardBg}; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: ${DARK_COLORS_FACT.text};">📜 Facturas Emitidas</h3>
                <span id="facturasCount" style="color: ${DARK_COLORS_FACT.textSecondary}; font-size: 14px;">0 facturas encontradas</span>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: ${DARK_COLORS_FACT.inputBg}; border-bottom: 2px solid ${DARK_COLORS_FACT.border};">
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: ${DARK_COLORS_FACT.textSecondary};">Número</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: ${DARK_COLORS_FACT.textSecondary};">Fecha</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: ${DARK_COLORS_FACT.textSecondary};">Cliente</th>
                            <th style="padding: 12px; text-align: right; font-weight: 600; color: ${DARK_COLORS_FACT.textSecondary};">Total</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600; color: ${DARK_COLORS_FACT.textSecondary};">Estado AFIP</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600; color: ${DARK_COLORS_FACT.textSecondary};">CAE</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600; color: ${DARK_COLORS_FACT.textSecondary};">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="facturasEmitidasTableBody">
                        <!-- Se llenará dinámicamente -->
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Cargar facturas
    cargarFacturasEmitidas();
}

async function cargarFacturasEmitidas() {
    const tbody = document.getElementById('facturasEmitidasTableBody');
    if (!tbody) return;

    try {
        const response = await fetch(`/api/siac/facturacion/invoices?company_id=${facturacionState.companyId}`, {
            headers: { 'Authorization': `Bearer ${facturacionState.token}` }
        });

        const result = await response.json();

        if (result.success && result.invoices && result.invoices.length > 0) {
            tbody.innerHTML = result.invoices.map(factura => `
                <tr style="border-bottom: 1px solid ${DARK_COLORS_FACT.border}; transition: background-color 0.2s;" onmouseover="this.style.background='${DARK_COLORS_FACT.cardBgHover}'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px; font-weight: 500; color: ${DARK_COLORS_FACT.text};">${factura.numero_completo || factura.invoice_number || `#${factura.id}`}</td>
                    <td style="padding: 12px; color: ${DARK_COLORS_FACT.textSecondary};">${new Date(factura.fecha_factura).toLocaleDateString()}</td>
                    <td style="padding: 12px; color: ${DARK_COLORS_FACT.text};">${factura.cliente_razon_social || factura.cliente?.razon_social || 'N/A'}</td>
                    <td style="padding: 12px; text-align: right; color: ${DARK_COLORS_FACT.primary};">$${parseFloat(factura.total_factura).toFixed(2)}</td>
                    <td style="padding: 12px; text-align: center;">
                        <span style="background: ${getEstadoAfipColor(factura.estado_afip)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                            ${factura.estado_afip || 'PENDIENTE'}
                        </span>
                    </td>
                    <td style="padding: 12px; text-align: center; font-family: monospace; color: ${DARK_COLORS_FACT.success};">
                        ${factura.cae || 'Sin CAE'}
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        ${factura.cae ? `<button onclick="verCAE('${factura.cae}')" style="background: ${DARK_COLORS_FACT.primary}; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px;">👁️ Ver CAE</button>` : ''}
                        ${!factura.cae && factura.estado_afip === 'PENDIENTE' ? `<button onclick="solicitarCAE(${factura.id})" style="background: ${DARK_COLORS_FACT.warning}; color: #1a1f2e; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">📩 Solicitar CAE</button>` : ''}
                    </td>
                </tr>
            `).join('');

            document.getElementById('facturasCount').textContent = `${result.invoices.length} facturas encontradas`;
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 60px; color: ${DARK_COLORS_FACT.textSecondary};">
                        <div style="font-size: 48px; margin-bottom: 10px;">📜</div>
                        <div>No hay facturas emitidas</div>
                        <div style="font-size: 13px; margin-top: 5px;">Ve a la tab "Facturación" para crear una</div>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error al cargar facturas emitidas:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: ${DARK_COLORS_FACT.danger};">Error de conexión</td></tr>`;
    }
}

function getEstadoAfipColor(estado) {
    const colors = {
        'PENDIENTE': DARK_COLORS_FACT.warning,
        'APROBADO': DARK_COLORS_FACT.success,
        'RECHAZADO': DARK_COLORS_FACT.danger
    };
    return colors[estado] || DARK_COLORS_FACT.textSecondary;
}

function buscarFacturasEmitidas() {
    alert('🔍 Buscar facturas\n\n(Implementar filtrado - Próximamente)');
    cargarFacturasEmitidas();
}

function verCAE(cae) {
    alert(`📜 CAE - Código de Autorización Electrónica\n\nCAE: ${cae}\n\nEste código es válido ante AFIP.`);
}

async function solicitarCAE(invoiceId) {
    if (!confirm(`¿Solicitar CAE a AFIP para la factura #${invoiceId}?\n\nEsto enviará la factura a AFIP para obtener el Código de Autorización Electrónica.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/afip/cae/solicitar/${invoiceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${facturacionState.token}`
            }
        });

        const result = await response.json();

        if (result.success) {
            alert(`✅ CAE obtenido exitosamente\n\nCAE: ${result.cae.cae}\nVencimiento: ${result.cae.cae_fch_vto}\n\nLa factura ya es válida fiscalmente.`);
            cargarFacturasEmitidas(); // Recargar tabla
        } else {
            alert(`❌ Error al solicitar CAE:\n${result.error}`);
        }
    } catch (error) {
        console.error('Error al solicitar CAE:', error);
        alert('❌ Error de conexión al solicitar CAE');
    }
}

// ============================================
// TAB 3: CONFIGURACIÓN AFIP (NUEVO)
// ============================================
function loadConfigAfipTab() {
    const contentArea = document.getElementById('tabContentArea');
    contentArea.innerHTML = `
        <!-- Help Banner -->
        ${FacturacionHelpSystem.renderBanner('configAfip')}

        <!-- Sección 1: Certificados Digitales -->
        <div style="background: ${DARK_COLORS_FACT.cardBg}; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
            <h3 style="margin: 0 0 20px 0; color: ${DARK_COLORS_FACT.text}; display: flex; align-items: center; gap: 10px;">
                <span>🔐</span> Certificados Digitales AFIP
            </h3>

            <div style="background: ${DARK_COLORS_FACT.inputBg}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: center;">
                    <div>
                        <label style="display: block; margin-bottom: 10px; color: ${DARK_COLORS_FACT.text}; font-weight: 500;">Archivo de Certificado (.p12 o .pem)</label>
                        <input type="file" id="certificateFile" accept=".p12,.pem" style="padding: 10px; border: 1px solid ${DARK_COLORS_FACT.inputBorder}; background: ${DARK_COLORS_FACT.background}; color: ${DARK_COLORS_FACT.text}; border-radius: 6px; width: 100%;">
                    </div>
                    <button onclick="subirCertificado()" style="background: ${DARK_COLORS_FACT.success}; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; height: fit-content;">
                        ⬆️ Subir Certificado
                    </button>
                </div>

                <div id="certificadoStatus" style="margin-top: 15px; padding: 10px; background: ${DARK_COLORS_FACT.background}; border-radius: 6px; color: ${DARK_COLORS_FACT.textSecondary}; font-size: 13px;">
                    📌 Estado: Sin certificado configurado
                </div>
            </div>

            <div style="background: ${DARK_COLORS_FACT.inputBg}; padding: 20px; border-radius: 8px;">
                <h4 style="margin: 0 0 15px 0; color: ${DARK_COLORS_FACT.text};">🔑 Token WSAA Actual</h4>
                <div style="font-family: monospace; background: ${DARK_COLORS_FACT.background}; padding: 10px; border-radius: 6px; color: ${DARK_COLORS_FACT.primary}; font-size: 12px; overflow-x: auto;" id="tokenWsaa">
                    Sin token disponible. Sube tu certificado primero.
                </div>
                <div style="margin-top: 10px; color: ${DARK_COLORS_FACT.textSecondary}; font-size: 12px;" id="tokenExpiracion">
                    Expiración: N/A
                </div>
            </div>
        </div>

        <!-- Sección 2: Puntos de Venta -->
        <div style="background: ${DARK_COLORS_FACT.cardBg}; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: ${DARK_COLORS_FACT.text}; display: flex; align-items: center; gap: 10px;">
                    <span>📍</span> Puntos de Venta
                </h3>
                <button onclick="agregarPuntoVenta()" style="background: ${DARK_COLORS_FACT.primary}; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    + Agregar Punto de Venta
                </button>
            </div>

            <div id="puntosVentaList">
                <!-- Se llenará dinámicamente -->
            </div>
        </div>

        <!-- Sección 3: Configuración General -->
        <div style="background: ${DARK_COLORS_FACT.cardBg}; border-radius: 12px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
            <h3 style="margin: 0 0 20px 0; color: ${DARK_COLORS_FACT.text}; display: flex; align-items: center; gap: 10px;">
                <span>⚙️</span> Configuración General
            </h3>

            <div style="background: ${DARK_COLORS_FACT.inputBg}; padding: 20px; border-radius: 8px;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: ${DARK_COLORS_FACT.text}; font-weight: 500;">Ambiente AFIP</label>
                    <select id="afipEnvironment" style="width: 100%; padding: 12px; border: 1px solid ${DARK_COLORS_FACT.inputBorder}; background: ${DARK_COLORS_FACT.background}; color: ${DARK_COLORS_FACT.text}; border-radius: 6px;">
                        <option value="TESTING">🧪 TESTING (Homologación)</option>
                        <option value="PRODUCTION">🚀 PRODUCCIÓN</option>
                    </select>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: ${DARK_COLORS_FACT.text}; font-weight: 500;">CUIT de la Empresa</label>
                    <input type="text" id="empresaCuit" placeholder="30-12345678-9" style="width: 100%; padding: 12px; border: 1px solid ${DARK_COLORS_FACT.inputBorder}; background: ${DARK_COLORS_FACT.background}; color: ${DARK_COLORS_FACT.text}; border-radius: 6px;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 8px; color: ${DARK_COLORS_FACT.text}; font-weight: 500;">Razón Social</label>
                    <input type="text" id="empresaRazonSocial" style="width: 100%; padding: 12px; border: 1px solid ${DARK_COLORS_FACT.inputBorder}; background: ${DARK_COLORS_FACT.background}; color: ${DARK_COLORS_FACT.text}; border-radius: 6px;">
                </div>

                <div style="margin-top: 20px;">
                    <button onclick="guardarConfigAfip()" style="background: ${DARK_COLORS_FACT.success}; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        ✅ Guardar Configuración
                    </button>
                </div>
            </div>
        </div>
    `;

    // Cargar puntos de venta
    cargarPuntosVenta();
    cargarConfigAfip();
}

async function subirCertificado() {
    const fileInput = document.getElementById('certificateFile');
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('⚠️ Por favor selecciona un archivo de certificado');
        return;
    }

    const formData = new FormData();
    formData.append('certificate', fileInput.files[0]);

    try {
        const response = await fetch('/api/afip/certificates/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${facturacionState.token}`
            },
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert('✅ Certificado subido exitosamente');
            document.getElementById('certificadoStatus').innerHTML = `✅ Certificado activo | Vencimiento: ${result.expiration || 'N/A'}`;
            cargarConfigAfip(); // Recargar config para obtener token
        } else {
            alert(`❌ Error al subir certificado:\n${result.error}`);
        }
    } catch (error) {
        console.error('Error al subir certificado:', error);
        alert('❌ Error de conexión');
    }
}

async function cargarPuntosVenta() {
    const container = document.getElementById('puntosVentaList');
    if (!container) return;

    try {
        const response = await fetch(`/api/afip/puntos-venta?company_id=${facturacionState.companyId}`, {
            headers: { 'Authorization': `Bearer ${facturacionState.token}` }
        });

        const result = await response.json();

        if (result.success && result.puntos_venta && result.puntos_venta.length > 0) {
            container.innerHTML = result.puntos_venta.map(pv => `
                <div style="background: ${DARK_COLORS_FACT.inputBg}; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; color: ${DARK_COLORS_FACT.text};">Punto de Venta: ${pv.punto_venta}</div>
                        <div style="color: ${DARK_COLORS_FACT.textSecondary}; font-size: 13px; margin-top: 4px;">
                            Domicilio: ${pv.domicilio_fiscal || 'No configurado'}
                        </div>
                        <div style="color: ${DARK_COLORS_FACT.primary}; font-size: 12px; margin-top: 4px;">
                            Último Nº Factura A: ${pv.ultimo_numero_factura_a || 0} | B: ${pv.ultimo_numero_factura_b || 0}
                        </div>
                    </div>
                    <button onclick="editarPuntoVenta(${pv.id})" style="background: ${DARK_COLORS_FACT.primary}; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        ✏️ Editar
                    </button>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: ${DARK_COLORS_FACT.textSecondary};">
                    <div style="font-size: 48px; margin-bottom: 10px;">📍</div>
                    <div>No hay puntos de venta configurados</div>
                    <div style="font-size: 13px; margin-top: 5px;">Haz clic en "+ Agregar Punto de Venta"</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar puntos de venta:', error);
        container.innerHTML = `<div style="color: ${DARK_COLORS_FACT.danger}; text-align: center;">Error de conexión</div>`;
    }
}

async function cargarConfigAfip() {
    try {
        const response = await fetch(`/api/afip/config?company_id=${facturacionState.companyId}`, {
            headers: { 'Authorization': `Bearer ${facturacionState.token}` }
        });

        const result = await response.json();

        if (result.success && result.config) {
            const config = result.config;

            // Actualizar campos
            document.getElementById('afipEnvironment').value = config.afip_environment || 'TESTING';
            document.getElementById('empresaCuit').value = config.cuit || '';
            document.getElementById('empresaRazonSocial').value = config.razon_social || '';

            // Token WSAA
            if (config.cached_token) {
                document.getElementById('tokenWsaa').textContent = config.cached_token.substring(0, 50) + '...';
                document.getElementById('tokenExpiracion').textContent = `Expiración: ${new Date(config.token_expiration).toLocaleString()}`;
            }

            // Estado certificado
            if (config.certificate_expiration) {
                document.getElementById('certificadoStatus').innerHTML = `✅ Certificado activo | Vencimiento: ${new Date(config.certificate_expiration).toLocaleDateString()}`;
            }
        }
    } catch (error) {
        console.error('Error al cargar config AFIP:', error);
    }
}

async function guardarConfigAfip() {
    const configData = {
        company_id: facturacionState.companyId,
        afip_environment: document.getElementById('afipEnvironment').value,
        cuit: document.getElementById('empresaCuit').value,
        razon_social: document.getElementById('empresaRazonSocial').value
    };

    try {
        const response = await fetch('/api/afip/config', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${facturacionState.token}`
            },
            body: JSON.stringify(configData)
        });

        const result = await response.json();

        if (result.success) {
            alert('✅ Configuración AFIP guardada exitosamente');
        } else {
            alert(`❌ Error al guardar configuración:\n${result.error}`);
        }
    } catch (error) {
        console.error('Error al guardar config AFIP:', error);
        alert('❌ Error de conexión');
    }
}

function agregarPuntoVenta() {
    const puntoVenta = prompt('Número de Punto de Venta (1-9999):', '1');
    const domicilio = prompt('Domicilio Fiscal:');

    if (!puntoVenta || !domicilio) {
        alert('⚠️ Ambos campos son obligatorios');
        return;
    }

    // Guardar punto de venta
    fetch('/api/afip/puntos-venta', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${facturacionState.token}`
        },
        body: JSON.stringify({
            company_id: facturacionState.companyId,
            punto_venta: parseInt(puntoVenta),
            domicilio_fiscal: domicilio
        })
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            alert('✅ Punto de venta agregado');
            cargarPuntosVenta();
        } else {
            alert(`❌ Error: ${result.error}`);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('❌ Error de conexión');
    });
}

function editarPuntoVenta(id) {
    alert(`✏️ Editar Punto de Venta ID: ${id}\n\n(Próximamente)`);
}

// ============================================
// VOLVER AL GRID DE MÓDULOS
// ============================================
function goBackToModules() {
    const mainContent = document.getElementById('mainContent');
    const moduleGrid = document.querySelector('.module-grid');

    if (mainContent) {
        mainContent.style.setProperty('display', 'none', 'important');
    }

    if (moduleGrid) {
        moduleGrid.style.display = 'grid';
    }
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================
window.showFacturacionContent = showFacturacionContent;
window.goBackToModules = goBackToModules;
window.switchTab = switchTab;
window.switchMode = switchMode;

// Modo MANUAL
window.nuevaFacturaManual = nuevaFacturaManual;

// Modo OCASIONAL
window.nuevoPresupuestoOcasional = nuevoPresupuestoOcasional;

// Modo RECURRENTE
window.nuevoPresupuestoRecurrente = nuevoPresupuestoRecurrente;

// Facturas Emitidas
window.cargarFacturasEmitidas = cargarFacturasEmitidas;
window.buscarFacturasEmitidas = buscarFacturasEmitidas;
window.verCAE = verCAE;
window.solicitarCAE = solicitarCAE;

// Config AFIP
window.subirCertificado = subirCertificado;
window.cargarPuntosVenta = cargarPuntosVenta;
window.cargarConfigAfip = cargarConfigAfip;
window.guardarConfigAfip = guardarConfigAfip;
window.agregarPuntoVenta = agregarPuntoVenta;
window.editarPuntoVenta = editarPuntoVenta;

console.log('✅ [FACTURACIÓN] Sistema de Facturación SIAC v3.0 cargado (Dark Theme + AFIP + 5 Tabs)');
