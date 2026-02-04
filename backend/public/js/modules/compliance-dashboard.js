/**
 * RISK INTELLIGENCE DASHBOARD v2.0
 * Sistema de Análisis de Riesgo Laboral Inteligente
 *
 * Tecnologías: Node.js + PostgreSQL + Azure AI + Ollama
 * Arquitectura: Multi-tenant, Índices Dinámicos, SSOT
 *
 * @author Sistema Biométrico Enterprise
 * @version 2.0.0
 */

// Evitar doble carga
if (window.RiskIntelligence) {
    console.log('[RISK] Módulo ya cargado');
}

console.log('%c RISK INTELLIGENCE v2.0 ', 'background: linear-gradient(90deg, #1a1a2e 0%, #0f3460 100%); color: #e94560; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

// ============================================================================
// SISTEMA DE AYUDA CONTEXTUAL v2.0 (ModuleHelpSystem)
// ============================================================================
if (typeof ModuleHelpSystem !== 'undefined') {
    ModuleHelpSystem.registerModule('risk-intelligence', {
        moduleName: 'Inteligencia de Riesgos',
        moduleDescription: 'Sistema de análisis predictivo de riesgos laborales basado en datos reales de asistencia, sanciones, vacaciones y métricas de rendimiento.',

        contexts: {
            dashboard: {
                title: 'Panel de Riesgos',
                description: 'Vista general de índices de riesgo laboral de la empresa',
                tips: [
                    'Los índices se calculan automáticamente cada vez que accede al dashboard',
                    'El color de cada índice indica el nivel: verde (bajo), amarillo (medio), naranja (alto), rojo (crítico)',
                    'Haga clic en cualquier empleado para ver su análisis detallado',
                    'Use los filtros para segmentar por departamento o nivel de riesgo'
                ],
                warnings: [
                    'Los empleados en riesgo CRÍTICO requieren atención inmediata',
                    'Las violaciones activas pueden derivar en demandas laborales'
                ],
                helpTopics: [
                    '¿Cómo se calcula el índice de fatiga?',
                    '¿Qué significa cada nivel de riesgo?',
                    '¿Cómo puedo reducir el riesgo de un empleado?',
                    '¿Cada cuánto se actualizan los datos?'
                ],
                fieldHelp: {
                    'filter-department': 'Filtra empleados por departamento. "Todos" muestra toda la empresa.',
                    'filter-risk': 'Filtra por nivel de riesgo: Crítico (≥85%), Alto (≥70%), Medio (≥50%), Bajo (<50%)',
                    'filter-period': 'Período de análisis. Más días = más datos históricos pero cálculo más lento.'
                }
            },
            employeeDetail: {
                title: 'Detalle de Empleado',
                description: 'Análisis completo de riesgo individual con todos los índices',
                tips: [
                    'Cada índice tiene un peso diferente en el cálculo del riesgo total',
                    'Las recomendaciones se generan automáticamente según los índices',
                    'Puede re-analizar para obtener datos actualizados al momento'
                ],
                warnings: [
                    'Los índices en rojo requieren acción correctiva inmediata'
                ],
                helpTopics: [
                    '¿Por qué este empleado tiene alto índice de fatiga?',
                    '¿Cómo puedo ver el historial de cambios?',
                    '¿Qué acciones correctivas se recomiendan?'
                ],
                fieldHelp: {
                    'fatigue': 'Basado en: horas trabajadas, días >10h, trabajo en fines de semana, descanso entre jornadas',
                    'accident': 'Basado en: índice de fatiga + sanciones recientes + tipo de trabajo (no aplica a administrativos)',
                    'legal_claim': 'Basado en: horas extras frecuentes + vacaciones no tomadas + violaciones LCT',
                    'performance': 'Basado en: llegadas tarde + ausencias + sanciones por rendimiento',
                    'turnover': 'Basado en: antigüedad (nuevos y >5 años tienen más riesgo) + sanciones recientes'
                }
            },
            violations: {
                title: 'Violaciones Laborales',
                description: 'Incumplimientos detectados de la Ley de Contrato de Trabajo',
                tips: [
                    'Cada violación incluye la referencia legal específica (LCT Art. XXX)',
                    'Resuelva las violaciones críticas primero para reducir riesgo legal',
                    'Las violaciones resueltas se archivan pero mantienen historial'
                ],
                warnings: [
                    'Las violaciones no resueltas incrementan el índice de reclamo legal'
                ],
                helpTopics: [
                    '¿Qué es una violación de descanso mínimo?',
                    '¿Cómo resuelvo una violación de horas extras?',
                    '¿Las violaciones afectan a la empresa o al empleado?'
                ],
                fieldHelp: {
                    'severity': 'Crítico: multas altas, Alto: multas moderadas, Medio: apercibimiento, Bajo: recomendación'
                }
            },
            config: {
                title: 'Configuración de Índices',
                description: 'Ajuste los pesos y umbrales de cada índice de riesgo',
                tips: [
                    'Los pesos determinan cuánto influye cada índice en el riesgo total (deben sumar 100%)',
                    'Los umbrales definen cuándo un índice pasa de bajo a medio, alto o crítico',
                    'Solo administradores pueden modificar la configuración'
                ],
                warnings: [
                    'Cambiar umbrales afecta inmediatamente a todos los análisis'
                ],
                helpTopics: [
                    '¿Qué pesos se recomiendan?',
                    '¿Cómo restaurar valores por defecto?'
                ],
                fieldHelp: {
                    'weight': 'Peso del índice (0-100%). La suma de todos los pesos debe ser 100%.',
                    'threshold-low': 'Por debajo de este valor el riesgo es BAJO (verde)',
                    'threshold-medium': 'Entre low y medium el riesgo es MEDIO (amarillo)',
                    'threshold-critical': 'Por encima de este valor el riesgo es CRÍTICO (rojo)'
                }
            }
        },

        fallbackResponses: {
            'fatiga': 'El índice de fatiga se calcula analizando: promedio de horas diarias trabajadas, cantidad de días con jornadas >10h, trabajo en fines de semana, y total de horas en el período. Un índice alto indica sobrecarga laboral.',
            'accidente': 'El riesgo de accidente combina el índice de fatiga (50%), sanciones recientes (30%) y tipo de trabajo (20%). No aplica a puestos administrativos/remotos.',
            'legal': 'El riesgo de reclamo legal considera: frecuencia de horas extras (40%), vacaciones no tomadas (40%) y una base mínima (20%). Valores altos indican incumplimientos de la LCT.',
            'rendimiento': 'El riesgo de bajo rendimiento analiza: ratio de llegadas tarde (35%), ratio de ausencias (35%) y cantidad de sanciones (30%).',
            'rotacion': 'El riesgo de rotación considera antigüedad (empleados <6 meses o >5 años tienen mayor riesgo) y sanciones recientes.',
            'umbral': 'Los umbrales definen los niveles de riesgo: LOW (<30), MEDIUM (30-60), HIGH (60-85), CRITICAL (>85). Puede ajustarlos en Configuración.',
            'peso': 'Los pesos definen la importancia de cada índice en el cálculo total. Por defecto: Fatiga 25%, Accidente 25%, Legal 20%, Rendimiento 15%, Rotación 15%.',
            'error': 'Si ve errores en los datos, verifique que el empleado tenga registros de asistencia en el período seleccionado. Sin datos, los índices serán 0.',
            'actualizar': 'Los datos se actualizan cada vez que accede al dashboard. Use el botón "Actualizar" para forzar un recálculo inmediato.'
        }
    });
    console.log('[RISK] ModuleHelpSystem registrado correctamente');
} else {
    console.warn('[RISK] ModuleHelpSystem no disponible - ayuda contextual deshabilitada');
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
// Evitar redeclaración si el módulo se carga múltiples veces
if (typeof window.RiskState !== 'undefined') {
    console.log('⚖️ [RISK] Estado ya inicializado, usando instancia existente');
}
window.RiskState = window.RiskState || {
    employees: [],
    riskAnalysis: [],
    indices: {},
    filters: { department: 'all', riskLevel: 'all', period: '30d' },
    selectedEmployee: null,
    isLoading: false,
    lastUpdate: null,
    aiEnabled: true
};
// Local alias for backward compatibility (use var to allow redeclaration)
var RiskState = window.RiskState;

// ============================================================================
// ÍNDICES DE RIESGO - SE CARGAN DESDE BD (no hardcoded)
// ============================================================================
// Use var to allow redeclaration when module loads multiple times in SPA
if (typeof window.RISK_INDICES !== 'undefined') {
    console.log('⚠️ [RISK] RISK_INDICES ya existe, usando instancia existente');
}
window.RISK_INDICES = window.RISK_INDICES || {
    FATIGUE: {
        id: 'fatigue',
        name: 'Índice de Fatiga',
        icon: '😴',
        color: '#e94560',
        description: 'Evalúa agotamiento por horas extras, descanso insuficiente y jornadas prolongadas',
        weight: 0.25,  // Se actualiza desde BD
        sources: ['attendances', 'overtime', 'rest_periods'],
        thresholds: { low: 30, medium: 50, high: 70, critical: 85 } // Se actualiza desde BD
    },
    ACCIDENT: {
        id: 'accident',
        name: 'Riesgo de Accidente',
        icon: '⚠️',
        color: '#f39c12',
        description: 'Probabilidad de accidente según tipo de tarea, fatiga y antecedentes',
        weight: 0.25,
        sources: ['job_type', 'fatigue_index', 'medical_history', 'sanctions'],
        thresholds: { low: 30, medium: 50, high: 70, critical: 85 },
        excludeJobTypes: ['administrative', 'remote']
    },
    LEGAL_CLAIM: {
        id: 'legal_claim',
        name: 'Riesgo de Reclamo Legal',
        icon: '⚖️',
        color: '#9b59b6',
        description: 'Posibilidad de demanda laboral por condiciones de trabajo',
        weight: 0.20,
        sources: ['overtime_violations', 'rest_violations', 'vacation_pending', 'sanctions'],
        thresholds: { low: 30, medium: 50, high: 70, critical: 85 }
    },
    PERFORMANCE: {
        id: 'performance',
        name: 'Riesgo de Bajo Rendimiento',
        icon: '📉',
        color: '#3498db',
        description: 'Indicadores de posible baja en productividad',
        weight: 0.15,
        sources: ['late_arrivals', 'absences', 'sanctions', 'fatigue_index'],
        thresholds: { low: 30, medium: 50, high: 70, critical: 85 }
    },
    TURNOVER: {
        id: 'turnover',
        name: 'Riesgo de Rotación',
        icon: '🚪',
        color: '#1abc9c',
        description: 'Probabilidad de renuncia o abandono',
        weight: 0.15,
        sources: ['tenure', 'sanctions', 'performance_index', 'salary_position'],
        thresholds: { low: 30, medium: 50, high: 70, critical: 85 }
    }
};
// Local alias for backward compatibility (use var to allow redeclaration)
var RISK_INDICES = window.RISK_INDICES;

// Configuración cargada desde la BD
let CompanyRiskConfig = null;

// ============================================================================
// API SERVICE
// ============================================================================
const RiskAPI = {
    baseUrl: '/api/compliance',

    async request(endpoint, options = {}) {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

        // ✅ Verificar token ANTES de hacer la llamada para evitar 401 que redirige a login
        if (!token) {
            console.warn(`[RiskAPI] ${endpoint}: Sin token de autenticación`);
            throw new Error('Sesión no iniciada. Por favor inicie sesión primero.');
        }

        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);

            // ✅ Manejar 401 sin disparar redirección
            if (response.status === 401) {
                console.warn(`[RiskAPI] ${endpoint}: Token expirado o inválido`);
                throw new Error('Sesión expirada. Recargue la página e inicie sesión.');
            }

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'API Error');
            return data;
        } catch (error) {
            console.error(`[RiskAPI] ${endpoint}:`, error);
            throw error;
        }
    },

    // Dashboard
    getDashboard: () => RiskAPI.request('/risk-dashboard'),
    getEmployeeRisk: (id) => RiskAPI.request(`/employee/${id}/risk-analysis`),
    getRiskTrends: (days = 30) => RiskAPI.request(`/trends?days=${days}`),

    // Análisis
    analyzeEmployee: (id) => RiskAPI.request(`/analyze/${id}`, { method: 'POST' }),
    analyzeAll: () => RiskAPI.request('/analyze-all', { method: 'POST' }),

    // Violaciones
    getViolations: (filters = {}) => RiskAPI.request(`/violations?${new URLSearchParams(filters)}`),
    resolveViolation: (id, notes) => RiskAPI.request(`/violations/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution_notes: notes })
    }),

    // Configuración
    getIndicesConfig: () => RiskAPI.request('/indices-config'),
    updateIndexConfig: (indexId, config) => RiskAPI.request(`/indices-config/${indexId}`, {
        method: 'PUT',
        body: JSON.stringify(config)
    }),

    // RBAC SSOT - Configuración desde BD
    getRiskConfig: () => RiskAPI.request('/risk-config'),
    updateRiskConfig: (config) => RiskAPI.request('/risk-config', {
        method: 'PUT',
        body: JSON.stringify(config)
    }),
    setThresholdMethod: (method, hybridWeights) => RiskAPI.request('/risk-config/method', {
        method: 'POST',
        body: JSON.stringify({ method, hybrid_weights: hybridWeights })
    }),
    setSegmentation: (enabled) => RiskAPI.request('/risk-config/segmentation', {
        method: 'POST',
        body: JSON.stringify({ enabled })
    }),
    recalculateQuartiles: () => RiskAPI.request('/risk-config/recalculate', { method: 'POST' }),
    getSegmentedAnalysis: () => RiskAPI.request('/segmented-analysis'),
    getBenchmarkComparison: () => RiskAPI.request('/benchmark-comparison')
};

/**
 * HELPER: Cargar configuración de riesgo desde BD y actualizar RISK_INDICES
 */
async function loadRiskConfigFromDB() {
    try {
        const response = await RiskAPI.getRiskConfig();
        if (response.success && response.config) {
            CompanyRiskConfig = response.config;

            // Actualizar umbrales en RISK_INDICES desde BD
            const thresholds = response.config.global_thresholds || {};
            const weights = response.config.global_weights || {};

            if (thresholds.fatigue) RISK_INDICES.FATIGUE.thresholds = thresholds.fatigue;
            if (thresholds.accident) RISK_INDICES.ACCIDENT.thresholds = thresholds.accident;
            if (thresholds.legal_claim) RISK_INDICES.LEGAL_CLAIM.thresholds = thresholds.legal_claim;
            if (thresholds.performance) RISK_INDICES.PERFORMANCE.thresholds = thresholds.performance;
            if (thresholds.turnover) RISK_INDICES.TURNOVER.thresholds = thresholds.turnover;

            if (weights.fatigue) RISK_INDICES.FATIGUE.weight = weights.fatigue;
            if (weights.accident) RISK_INDICES.ACCIDENT.weight = weights.accident;
            if (weights.legal_claim) RISK_INDICES.LEGAL_CLAIM.weight = weights.legal_claim;
            if (weights.performance) RISK_INDICES.PERFORMANCE.weight = weights.performance;
            if (weights.turnover) RISK_INDICES.TURNOVER.weight = weights.turnover;

            console.log('[RISK] Configuración cargada desde BD:', response.config.threshold_method);
            return response;
        }
    } catch (error) {
        console.warn('[RISK] Error cargando config desde BD, usando defaults:', error.message);
    }
    return null;
}

// ============================================================================
// RISK INTELLIGENCE ENGINE
// ============================================================================
const RiskIntelligence = {

    async init() {
        console.log('🔍 Iniciando Inteligencia de Riesgos...');

        // ✅ VERIFICAR SESIÓN ANTES DE CUALQUIER COSA
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            console.warn('[RISK] No hay sesión activa - mostrando mensaje');
            this.injectStyles();
            this.showNoSessionMessage();
            return;
        }

        try {
            this.injectStyles();
            this.render();
            this.attachEventListeners();

            // Inicializar sistema de ayuda contextual
            if (typeof ModuleHelpSystem !== 'undefined') {
                ModuleHelpSystem.init('risk-intelligence');
                ModuleHelpSystem.setContext('dashboard');
            }

            // CARGAR CONFIGURACIÓN DESDE BD ANTES DE CARGAR DASHBOARD
            try {
                await loadRiskConfigFromDB();
            } catch (configError) {
                console.warn('[RISK] Error cargando config, usando defaults:', configError.message);
            }

            await this.loadDashboard();

        } catch (initError) {
            console.error('[RISK] Error en init():', initError);
            // Asegurar que el módulo muestre algo aunque falle
            const container = document.getElementById('content-area') ||
                             document.getElementById('module-content') ||
                             document.getElementById('mainContent');
            if (container && !container.querySelector('.ri-container')) {
                this.render(); // Renderizar al menos la estructura básica
            }
            this.showError('Error inicializando módulo. Verifique su sesión.');
        }
    },

    // ✅ Mostrar mensaje cuando no hay sesión (sin hacer llamadas API)
    showNoSessionMessage() {
        const container = document.getElementById('content-area') ||
                         document.getElementById('module-content') ||
                         document.getElementById('mainContent');

        if (!container) {
            console.error('[RISK] No se encontró contenedor para mensaje');
            return;
        }

        container.innerHTML = `
            <div class="ri-container" style="min-height: 100vh; display: flex; align-items: center; justify-content: center;">
                <div style="text-align: center; padding: 60px; background: rgba(233, 69, 96, 0.1); border-radius: 16px; border: 1px solid rgba(233, 69, 96, 0.3); max-width: 500px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🔐</div>
                    <h2 style="color: #e94560; margin: 0 0 15px 0;">Sesión Requerida</h2>
                    <p style="color: #a0aec0; font-size: 16px; margin: 0 0 25px 0;">
                        Debe iniciar sesión para acceder al módulo de Inteligencia de Riesgos.
                    </p>
                    <button onclick="location.reload()" style="padding: 12px 30px; background: linear-gradient(135deg, #e94560, #c73e54); border: none; border-radius: 8px; color: white; font-size: 16px; font-weight: 600; cursor: pointer;">
                        🔄 Recargar Página
                    </button>
                </div>
            </div>
        `;
    },

    // ========== ESTILOS DARK THEME ==========
    injectStyles() {
        const existingStyle = document.getElementById('risk-intelligence-styles');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'risk-intelligence-styles';
        style.textContent = `
            /* ===== RISK INTELLIGENCE DARK THEME ===== */
            .ri-container {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
                min-height: 100vh;
                padding: 25px;
                color: #e0e0e0;
            }

            /* Header */
            .ri-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .ri-header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                background: linear-gradient(90deg, #e94560, #f39c12);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .ri-header-badge {
                display: flex;
                gap: 8px;
                margin-top: 8px;
            }

            .ri-badge {
                font-size: 10px;
                padding: 4px 10px;
                border-radius: 12px;
                background: rgba(255,255,255,0.1);
                color: #aaa;
                font-weight: 500;
            }

            .ri-badge.ai { background: rgba(233,69,96,0.2); color: #e94560; }
            .ri-badge.realtime { background: rgba(0,212,255,0.2); color: #00d4ff; }
            .ri-badge.ssot { background: rgba(0,255,136,0.2); color: #00ff88; }

            .ri-header-actions {
                display: flex;
                gap: 12px;
            }

            /* Buttons */
            .ri-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .ri-btn-primary {
                background: linear-gradient(135deg, #e94560, #c73659);
                color: white;
            }

            .ri-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 20px rgba(233,69,96,0.4);
            }

            .ri-btn-secondary {
                background: rgba(255,255,255,0.1);
                color: #e0e0e0;
                border: 1px solid rgba(255,255,255,0.2);
            }

            .ri-btn-secondary:hover {
                background: rgba(255,255,255,0.15);
            }

            /* Stats Grid */
            .ri-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .ri-stat-card {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 16px;
                padding: 20px;
                position: relative;
                overflow: hidden;
            }

            .ri-stat-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                background: var(--accent-color, #e94560);
            }

            .ri-stat-card .icon {
                font-size: 32px;
                margin-bottom: 10px;
            }

            .ri-stat-card .label {
                font-size: 12px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
            }

            .ri-stat-card .value {
                font-size: 36px;
                font-weight: 700;
                color: #fff;
            }

            .ri-stat-card .sublabel {
                font-size: 11px;
                color: #666;
                margin-top: 5px;
            }

            .ri-stat-card.critical { --accent-color: #e94560; }
            .ri-stat-card.high { --accent-color: #f39c12; }
            .ri-stat-card.medium { --accent-color: #f1c40f; }
            .ri-stat-card.low { --accent-color: #00ff88; }

            /* Main Content */
            .ri-main {
                display: grid;
                grid-template-columns: 1fr 350px;
                gap: 25px;
            }

            @media (max-width: 1200px) {
                .ri-main { grid-template-columns: 1fr; }
            }

            /* Panels */
            .ri-panel {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 16px;
                overflow: hidden;
            }

            .ri-panel-header {
                padding: 18px 20px;
                border-bottom: 1px solid rgba(255,255,255,0.08);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .ri-panel-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .ri-panel-body {
                padding: 20px;
                max-height: 500px;
                overflow-y: auto;
            }

            /* Risk Indices Cards */
            .ri-indices-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 15px;
                margin-bottom: 25px;
            }

            .ri-index-card {
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 12px;
                padding: 18px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .ri-index-card:hover {
                background: rgba(255,255,255,0.05);
                transform: translateY(-3px);
            }

            .ri-index-card .index-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
            }

            .ri-index-card .index-icon {
                font-size: 24px;
            }

            .ri-index-card .index-name {
                font-size: 13px;
                font-weight: 600;
                color: #fff;
            }

            .ri-index-card .index-value {
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 8px;
            }

            .ri-index-card .index-bar {
                height: 6px;
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
                overflow: hidden;
            }

            .ri-index-card .index-bar-fill {
                height: 100%;
                border-radius: 3px;
                transition: width 0.5s ease;
            }

            /* Employee Risk List */
            .ri-employee-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                cursor: pointer;
                transition: background 0.2s;
            }

            .ri-employee-item:hover {
                background: rgba(255,255,255,0.03);
            }

            .ri-employee-item:last-child {
                border-bottom: none;
            }

            .ri-employee-avatar {
                width: 45px;
                height: 45px;
                border-radius: 12px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                font-weight: 600;
                color: white;
            }

            .ri-employee-info {
                flex: 1;
            }

            .ri-employee-name {
                font-weight: 600;
                color: #fff;
                margin-bottom: 3px;
            }

            .ri-employee-dept {
                font-size: 12px;
                color: #888;
            }

            .ri-employee-risk {
                text-align: right;
            }

            .ri-risk-score {
                font-size: 24px;
                font-weight: 700;
            }

            .ri-risk-score.critical { color: #e94560; }
            .ri-risk-score.high { color: #f39c12; }
            .ri-risk-score.medium { color: #f1c40f; }
            .ri-risk-score.low { color: #00ff88; }

            .ri-risk-label {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* Violations Table */
            .ri-violations-table {
                width: 100%;
                border-collapse: collapse;
            }

            .ri-violations-table th {
                text-align: left;
                padding: 12px 15px;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #888;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .ri-violations-table td {
                padding: 15px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                font-size: 13px;
            }

            .ri-violations-table tr:hover {
                background: rgba(255,255,255,0.02);
            }

            .ri-severity-badge {
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
            }

            .ri-severity-badge.critical { background: rgba(233,69,96,0.2); color: #e94560; }
            .ri-severity-badge.high { background: rgba(243,156,18,0.2); color: #f39c12; }
            .ri-severity-badge.medium { background: rgba(241,196,15,0.2); color: #f1c40f; }
            .ri-severity-badge.low { background: rgba(0,255,136,0.2); color: #00ff88; }

            /* Filters */
            .ri-filters {
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }

            .ri-filter-group {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .ri-filter-group label {
                font-size: 11px;
                color: #888;
                text-transform: uppercase;
            }

            .ri-select {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                padding: 10px 15px;
                color: #fff;
                font-size: 13px;
                min-width: 150px;
            }

            .ri-select:focus {
                outline: none;
                border-color: #e94560;
            }

            .ri-select option {
                background: #1a1a2e;
            }

            /* Loading */
            .ri-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 60px;
                color: #888;
            }

            .ri-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255,255,255,0.1);
                border-top-color: #e94560;
                border-radius: 50%;
                animation: ri-spin 1s linear infinite;
                margin-bottom: 15px;
            }

            @keyframes ri-spin {
                to { transform: rotate(360deg); }
            }

            /* AI Indicator */
            .ri-ai-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 15px;
                background: rgba(233,69,96,0.1);
                border: 1px solid rgba(233,69,96,0.3);
                border-radius: 20px;
                font-size: 12px;
                color: #e94560;
            }

            .ri-ai-dot {
                width: 8px;
                height: 8px;
                background: #e94560;
                border-radius: 50%;
                animation: ri-pulse 2s ease-in-out infinite;
            }

            @keyframes ri-pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(1.2); }
            }

            /* Empty State */
            .ri-empty {
                text-align: center;
                padding: 40px;
                color: #666;
            }

            .ri-empty-icon {
                font-size: 48px;
                margin-bottom: 15px;
                opacity: 0.5;
            }

            /* Tooltip */
            .ri-tooltip {
                position: relative;
            }

            .ri-tooltip::after {
                content: attr(data-tooltip);
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                padding: 8px 12px;
                background: #1a1a2e;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 6px;
                font-size: 11px;
                color: #fff;
                white-space: nowrap;
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s;
                z-index: 100;
            }

            .ri-tooltip:hover::after {
                opacity: 1;
                visibility: visible;
                bottom: calc(100% + 5px);
            }

            /* Modal */
            .ri-modal {
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
                backdrop-filter: blur(5px);
            }

            .ri-modal-content {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 20px;
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                overflow: hidden;
            }

            .ri-modal-header {
                padding: 25px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .ri-modal-title {
                font-size: 20px;
                font-weight: 700;
                color: #fff;
            }

            .ri-modal-close {
                background: none;
                border: none;
                color: #888;
                font-size: 24px;
                cursor: pointer;
                transition: color 0.2s;
            }

            .ri-modal-close:hover {
                color: #e94560;
            }

            .ri-modal-body {
                padding: 25px;
                max-height: 60vh;
                overflow-y: auto;
            }

            .ri-modal-footer {
                padding: 20px 25px;
                border-top: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }

            /* Help System Icons */
            .ri-help-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: rgba(99,102,241,0.2);
                color: #a5b4fc;
                font-size: 10px;
                font-weight: 600;
                cursor: help;
                margin-left: 6px;
                transition: all 0.2s;
            }

            .ri-help-icon:hover {
                background: rgba(99,102,241,0.4);
                color: #fff;
                transform: scale(1.1);
            }

            [data-help] {
                position: relative;
            }

            [data-help]:hover::after {
                content: attr(title);
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                padding: 8px 12px;
                background: #1e293b;
                border: 1px solid rgba(99,102,241,0.3);
                border-radius: 6px;
                font-size: 11px;
                color: #e2e8f0;
                white-space: nowrap;
                z-index: 1000;
                margin-bottom: 5px;
            }

            /* Export Dropdown Styles */
            .ri-btn-export {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
                border: none !important;
            }

            .ri-btn-export:hover {
                background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
            }

            .ri-export-menu {
                position: absolute;
                top: 100%;
                right: 0;
                margin-top: 8px;
                background: #1e293b;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                padding: 8px 0;
                min-width: 200px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                z-index: 1000;
            }

            .ri-export-menu button {
                display: block;
                width: 100%;
                padding: 10px 16px;
                background: none;
                border: none;
                color: #e2e8f0;
                font-size: 13px;
                text-align: left;
                cursor: pointer;
                transition: all 0.2s;
            }

            .ri-export-menu button:hover {
                background: rgba(99,102,241,0.2);
                color: #a5b4fc;
            }

            .ri-export-title {
                padding: 8px 16px 4px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                color: #64748b;
                letter-spacing: 1px;
            }

            .ri-export-divider {
                height: 1px;
                background: rgba(255,255,255,0.1);
                margin: 8px 0;
            }

            .ri-export-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 12px 16px;
                color: #10b981;
            }

            .ri-export-loading .spinner {
                width: 16px;
                height: 16px;
                border: 2px solid rgba(16,185,129,0.3);
                border-top-color: #10b981;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    },

    // ========== RENDER PRINCIPAL ==========
    render() {
        const container = document.getElementById('content-area') ||
                         document.getElementById('module-content') ||
                         document.getElementById('mainContent');

        if (!container) {
            console.error('[RISK] No se encontró contenedor');
            return;
        }

        container.innerHTML = `
            <div class="ri-container">
                <!-- Header -->
                <div class="ri-header">
                    <div>
                        <h1>
                            <span>🛡️</span>
                            Inteligencia de Riesgos
                        </h1>
                        <div class="ri-header-badge">
                            <span class="ri-badge ai">🧠 Azure AI</span>
                            <span class="ri-badge realtime">⚡ Real-time</span>
                            <span class="ri-badge ssot">🔗 SSOT</span>
                        </div>
                    </div>
                    <div class="ri-header-actions">
                        <div class="ri-ai-indicator">
                            <div class="ri-ai-dot"></div>
                            <span>IA Activa</span>
                        </div>
                        <button class="ri-btn ri-btn-primary" onclick="RiskIntelligence.runFullAnalysis()">
                            🔍 Analizar Todo
                        </button>
                        <button class="ri-btn ri-btn-secondary" onclick="RiskIntelligence.loadDashboard()">
                            🔄 Actualizar
                        </button>
                        <button class="ri-btn ri-btn-secondary" onclick="RiskIntelligence.showConfigModal()">
                            ⚙️ Configurar
                        </button>

                        <!-- Dropdown de Exportación -->
                        <div class="ri-export-dropdown" style="position: relative; display: inline-block;">
                            <button class="ri-btn ri-btn-export" onclick="RiskIntelligence.toggleExportMenu()">
                                📥 Exportar ▾
                            </button>
                            <div id="ri-export-menu" class="ri-export-menu" style="display: none;">
                                <div class="ri-export-title">Reporte Ejecutivo</div>
                                <button onclick="RiskIntelligence.exportDashboard('pdf')">
                                    📄 Descargar PDF
                                </button>
                                <button onclick="RiskIntelligence.exportDashboard('excel')">
                                    📊 Descargar Excel
                                </button>
                                <div class="ri-export-divider"></div>
                                <div class="ri-export-title">Violaciones</div>
                                <button onclick="RiskIntelligence.exportViolations('pdf')">
                                    📄 Violaciones PDF
                                </button>
                                <button onclick="RiskIntelligence.exportViolations('excel')">
                                    📊 Violaciones Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Banner de Ayuda Contextual -->
                <div id="ri-help-banner"></div>

                <!-- Stats Grid -->
                <div id="ri-stats" class="ri-stats-grid"></div>

                <!-- Indices Grid -->
                <div id="ri-indices" class="ri-indices-grid"></div>

                <!-- Main Content -->
                <div class="ri-main">
                    <!-- Left: Violations & Analysis -->
                    <div>
                        <!-- Filters -->
                        <div class="ri-filters">
                            <div class="ri-filter-group">
                                <label>Departamento <span class="ri-help-icon" data-help="dashboard.filter-department">?</span></label>
                                <select class="ri-select" id="filter-department" data-help="dashboard.filter-department" onchange="RiskIntelligence.applyFilters()">
                                    <option value="all">Todos</option>
                                </select>
                            </div>
                            <div class="ri-filter-group">
                                <label>Nivel de Riesgo <span class="ri-help-icon" data-help="dashboard.filter-risk">?</span></label>
                                <select class="ri-select" id="filter-risk" data-help="dashboard.filter-risk" onchange="RiskIntelligence.applyFilters()">
                                    <option value="all">Todos</option>
                                    <option value="critical">🔴 Crítico</option>
                                    <option value="high">🟠 Alto</option>
                                    <option value="medium">🟡 Medio</option>
                                    <option value="low">🟢 Bajo</option>
                                </select>
                            </div>
                            <div class="ri-filter-group">
                                <label>Período <span class="ri-help-icon" data-help="dashboard.filter-period">?</span></label>
                                <select class="ri-select" id="filter-period" data-help="dashboard.filter-period" onchange="RiskIntelligence.applyFilters()">
                                    <option value="7d">Últimos 7 días</option>
                                    <option value="30d" selected>Últimos 30 días</option>
                                    <option value="90d">Últimos 90 días</option>
                                    <option value="365d">Último año</option>
                                </select>
                            </div>
                        </div>

                        <!-- Violations Panel -->
                        <div class="ri-panel">
                            <div class="ri-panel-header">
                                <h3>⚠️ Violaciones Detectadas</h3>
                                <span id="violations-count" class="ri-badge">0</span>
                            </div>
                            <div class="ri-panel-body" id="ri-violations"></div>
                        </div>
                    </div>

                    <!-- Right: Employee Risk Ranking -->
                    <div class="ri-panel">
                        <div class="ri-panel-header">
                            <h3>👥 Empleados en Riesgo</h3>
                        </div>
                        <div class="ri-panel-body" id="ri-employees"></div>
                    </div>
                </div>
            </div>
        `;
    },

    // ========== EVENT LISTENERS ==========
    attachEventListeners() {
        // Click fuera del modal para cerrar
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('ri-modal')) {
                this.closeModal();
            }
        });
    },

    // ========== CARGAR DASHBOARD ==========
    async loadDashboard() {
        this.showLoading();

        try {
            // Cargar datos REALES del backend
            const [dashboardData, violationsData] = await Promise.all([
                RiskAPI.getDashboard(),
                RiskAPI.getViolations().catch(() => ({ violations: [] }))
            ]);

            if (!dashboardData || (!dashboardData.success && !dashboardData.employees)) {
                throw new Error(dashboardData?.error || 'Sin datos del servidor');
            }

            // Actualizar state con datos reales
            RiskState.riskAnalysis = dashboardData.employees || [];
            RiskState.indices = dashboardData.indices || {};
            RiskState.lastUpdate = dashboardData.lastUpdate || new Date();

            // Renderizar componentes con datos reales
            this.renderStats(dashboardData.stats || this.calculateStats(dashboardData));
            this.renderIndices(dashboardData.indices || this.getEmptyIndices());
            this.renderViolations(violationsData.violations || []);
            this.renderEmployeeRanking(dashboardData.employees || []);
            this.loadDepartments();

            // Renderizar banner de ayuda contextual
            this.renderHelpBanner('dashboard');

            console.log(`[RISK] Dashboard cargado: ${dashboardData.employees?.length || 0} empleados`);

        } catch (error) {
            console.error('[RISK] Error cargando dashboard:', error);
            this.showError('Error al cargar datos del servidor. Verifique la conexión.');

            // Mostrar datos vacíos (NO mock)
            this.renderStats(this.getEmptyStats());
            this.renderIndices(this.getEmptyIndices());
            this.renderViolations([]);
            this.renderEmployeeRanking([]);
        }
    },

    // ========== RENDER STATS ==========
    renderStats(stats) {
        const container = document.getElementById('ri-stats');

        container.innerHTML = `
            <div class="ri-stat-card critical" style="--accent-color: #e94560;">
                <div class="icon">🚨</div>
                <div class="label">Empleados en Riesgo Crítico</div>
                <div class="value">${stats.criticalCount || 0}</div>
                <div class="sublabel">Requieren atención inmediata</div>
            </div>

            <div class="ri-stat-card high" style="--accent-color: #f39c12;">
                <div class="icon">⚠️</div>
                <div class="label">Violaciones Activas</div>
                <div class="value">${stats.activeViolations || 0}</div>
                <div class="sublabel">LCT Arts. 196, 197, 201</div>
            </div>

            <div class="ri-stat-card medium" style="--accent-color: #3498db;">
                <div class="icon">📊</div>
                <div class="label">Índice Promedio</div>
                <div class="value">${stats.averageRisk || 0}%</div>
                <div class="sublabel">Riesgo general de la empresa</div>
            </div>

            <div class="ri-stat-card low" style="--accent-color: #00ff88;">
                <div class="icon">✅</div>
                <div class="label">Cumplimiento Legal</div>
                <div class="value">${stats.compliancePercent || 100}%</div>
                <div class="sublabel">Normativa laboral vigente</div>
            </div>

            <div class="ri-stat-card" style="--accent-color: #9b59b6;">
                <div class="icon">🧠</div>
                <div class="label">Análisis IA</div>
                <div class="value">${stats.aiAnalysisCount || 0}</div>
                <div class="sublabel">Empleados analizados hoy</div>
            </div>
        `;
    },

    // ========== RENDER INDICES ==========
    renderIndices(indices) {
        const container = document.getElementById('ri-indices');

        let html = '';

        Object.entries(RISK_INDICES).forEach(([key, config]) => {
            // SSOT: Usar solo datos reales del backend, 0 si no hay datos
            const value = indices[config.id] ?? 0;
            const level = this.getRiskLevel(value, config.thresholds);

            html += `
                <div class="ri-index-card ri-tooltip"
                     data-tooltip="${config.description}"
                     onclick="RiskIntelligence.showIndexDetail('${config.id}')">
                    <div class="index-header">
                        <span class="index-icon">${config.icon}</span>
                        <span class="index-name">${config.name}</span>
                    </div>
                    <div class="index-value" style="color: ${this.getLevelColor(level)}">${value}%</div>
                    <div class="index-bar">
                        <div class="index-bar-fill" style="width: ${value}%; background: ${config.color};"></div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    // ========== RENDER VIOLATIONS ==========
    renderViolations(violations) {
        const container = document.getElementById('ri-violations');
        const countBadge = document.getElementById('violations-count');

        countBadge.textContent = violations.length;

        if (violations.length === 0) {
            container.innerHTML = `
                <div class="ri-empty">
                    <div class="ri-empty-icon">✅</div>
                    <p>No hay violaciones activas</p>
                    <small>El sistema monitoreará automáticamente</small>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="ri-violations-table">
                <thead>
                    <tr>
                        <th>Empleado</th>
                        <th>Tipo</th>
                        <th>Referencia Legal</th>
                        <th>Severidad</th>
                        <th>Fecha</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    ${violations.map(v => `
                        <tr>
                            <td>${v.employee_name || v.employee_id}</td>
                            <td>${this.getViolationTypeLabel(v.rule_type)}</td>
                            <td>${v.legal_reference || 'N/A'}</td>
                            <td><span class="ri-severity-badge ${v.severity}">${this.getSeverityLabel(v.severity)}</span></td>
                            <td>${this.formatDate(v.violation_date)}</td>
                            <td>
                                <button class="ri-btn ri-btn-secondary" style="padding: 5px 10px; font-size: 11px;"
                                        onclick="RiskIntelligence.resolveViolation(${v.id})">
                                    ✅ Resolver
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    // ========== RENDER EMPLOYEE RANKING ==========
    renderEmployeeRanking(employees) {
        const container = document.getElementById('ri-employees');

        // Ordenar por riesgo descendente
        const sorted = [...employees].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
        const top10 = sorted.slice(0, 10);

        if (top10.length === 0) {
            container.innerHTML = `
                <div class="ri-empty">
                    <div class="ri-empty-icon">👥</div>
                    <p>No hay datos de empleados</p>
                </div>
            `;
            return;
        }

        container.innerHTML = top10.map(emp => {
            const level = this.getRiskLevelFromScore(emp.risk_score || 0);
            const initials = (emp.name || 'NN').split(' ').map(n => n[0]).join('').substring(0, 2);

            return `
                <div class="ri-employee-item" onclick="RiskIntelligence.showEmployeeDetail('${emp.id}')">
                    <div class="ri-employee-avatar">${initials}</div>
                    <div class="ri-employee-info">
                        <div class="ri-employee-name">${emp.name || 'Sin nombre'}</div>
                        <div class="ri-employee-dept">${emp.department || 'Sin departamento'}</div>
                    </div>
                    <div class="ri-employee-risk">
                        <div class="ri-risk-score ${level}">${emp.risk_score || 0}%</div>
                        <div class="ri-risk-label" style="color: ${this.getLevelColor(level)}">${this.getLevelLabel(level)}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ========== ANÁLISIS COMPLETO ==========
    async runFullAnalysis() {
        if (!confirm('¿Ejecutar análisis completo de riesgo para todos los empleados?')) return;

        this.showLoading();

        try {
            const result = await RiskAPI.analyzeAll();

            alert(`✅ Análisis completado:\n\n` +
                  `Empleados analizados: ${result.analyzed || 0}\n` +
                  `Riesgos críticos: ${result.critical || 0}\n` +
                  `Nuevas violaciones: ${result.new_violations || 0}`);

            await this.loadDashboard();

        } catch (error) {
            console.error('[RISK] Error en análisis:', error);
            alert('Error ejecutando análisis. Ver consola.');
        }
    },

    // ========== RESOLVER VIOLACIÓN ==========
    async resolveViolation(id) {
        const notes = prompt('Notas de resolución:');
        if (!notes) return;

        try {
            await RiskAPI.resolveViolation(id, notes);
            alert('✅ Violación resuelta');
            await this.loadDashboard();
        } catch (error) {
            alert('Error al resolver: ' + error.message);
        }
    },

    // ========== MODAL DETALLE EMPLEADO ==========
    showEmployeeDetail(employeeId) {
        // Cambiar contexto de ayuda
        if (typeof ModuleHelpSystem !== 'undefined') {
            ModuleHelpSystem.setContext('employeeDetail');
        }

        const emp = RiskState.riskAnalysis.find(e => e.id === employeeId);

        if (!emp) {
            console.warn('[RISK] Empleado no encontrado:', employeeId);
            return;
        }

        const modalHtml = `
            <div class="ri-modal" onclick="if(event.target === this) RiskIntelligence.closeModal()">
                <div class="ri-modal-content">
                    <div class="ri-modal-header">
                        <div class="ri-modal-title">📊 Análisis de Riesgo - ${emp.name}</div>
                        <button class="ri-modal-close" onclick="RiskIntelligence.closeModal()">✕</button>
                    </div>
                    <div class="ri-modal-body">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                            ${Object.entries(RISK_INDICES).map(([key, config]) => {
                                // SSOT: Usar solo datos reales del backend, 0 si no hay datos
                                const value = emp.indices?.[config.id] ?? 0;
                                return `
                                    <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px;">
                                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                            <span style="font-size: 24px;">${config.icon}</span>
                                            <span style="font-weight: 600; color: #fff;">${config.name}</span>
                                        </div>
                                        <div style="font-size: 32px; font-weight: 700; color: ${config.color};">${value}%</div>
                                        <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-top: 10px;">
                                            <div style="height: 100%; width: ${value}%; background: ${config.color}; border-radius: 3px;"></div>
                                        </div>
                                        <div style="font-size: 11px; color: #888; margin-top: 8px;">${config.description}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <div style="margin-top: 25px; padding: 15px; background: rgba(233,69,96,0.1); border-radius: 12px; border: 1px solid rgba(233,69,96,0.3);">
                            <div style="font-weight: 600; color: #e94560; margin-bottom: 10px;">🧠 Recomendaciones IA</div>
                            ${this.renderRecommendations(emp.indices, emp.risk_score)}
                        </div>
                    </div>
                    <div class="ri-modal-footer">
                        <button class="ri-btn ri-btn-secondary" onclick="RiskIntelligence.closeModal()">Cerrar</button>
                        <button class="ri-btn" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);" onclick="RiskIntelligence.exportEmployeePDF('${emp.id}')">
                            📄 Exportar PDF
                        </button>
                        <button class="ri-btn ri-btn-primary" onclick="RiskIntelligence.analyzeEmployee('${emp.id}')">
                            🔍 Re-analizar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    // ========== MODAL CONFIGURACIÓN v3.0 (RBAC SSOT) ==========
    async showConfigModal() {
        // Cambiar contexto de ayuda
        if (typeof ModuleHelpSystem !== 'undefined') {
            ModuleHelpSystem.setContext('config');
        }

        // Cargar configuración actual de la empresa
        let riskConfig = null;
        try {
            const result = await RiskAPI.request('/risk-config');
            if (result.success) {
                riskConfig = result.config;
                RiskState.availableBenchmarks = result.available_benchmarks;
                RiskState.thresholdMethods = result.methods;
            }
        } catch (error) {
            console.error('[RISK] Error cargando configuración:', error);
        }

        const config = riskConfig || {
            threshold_method: 'manual',
            enable_segmentation: false,
            hybrid_weights: { manual: 0.3, quartile: 0.4, benchmark: 0.3 }
        };

        const modalHtml = `
            <div class="ri-modal" onclick="if(event.target === this) RiskIntelligence.closeModal()">
                <div class="ri-modal-content" style="max-width: 800px;">
                    <div class="ri-modal-header">
                        <div class="ri-modal-title">⚙️ Configuración de Índices de Riesgo</div>
                        <button class="ri-modal-close" onclick="RiskIntelligence.closeModal()">✕</button>
                    </div>
                    <div class="ri-modal-body" style="max-height: 70vh; overflow-y: auto;">

                        <!-- SECCIÓN 1: MÉTODO DE CÁLCULO -->
                        <div style="background: linear-gradient(135deg, rgba(233,69,96,0.1), rgba(15,52,96,0.2)); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid rgba(233,69,96,0.3);">
                            <h3 style="color: #e94560; margin: 0 0 15px 0; font-size: 16px;">
                                🎯 Método de Cálculo de Umbrales
                            </h3>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                                <label style="display: flex; align-items: flex-start; gap: 10px; padding: 12px; background: ${config.threshold_method === 'manual' ? 'rgba(233,69,96,0.2)' : 'rgba(255,255,255,0.03)'}; border-radius: 8px; cursor: pointer; border: 1px solid ${config.threshold_method === 'manual' ? 'rgba(233,69,96,0.5)' : 'transparent'};">
                                    <input type="radio" name="threshold_method" value="manual" ${config.threshold_method === 'manual' ? 'checked' : ''} onchange="RiskIntelligence.onMethodChange(this.value)" style="margin-top: 2px;">
                                    <div>
                                        <strong style="color: #fff;">Manual (Paramétrico)</strong>
                                        <div style="font-size: 11px; color: #888;">Umbrales fijos definidos por administrador</div>
                                    </div>
                                </label>
                                <label style="display: flex; align-items: flex-start; gap: 10px; padding: 12px; background: ${config.threshold_method === 'quartile' ? 'rgba(233,69,96,0.2)' : 'rgba(255,255,255,0.03)'}; border-radius: 8px; cursor: pointer; border: 1px solid ${config.threshold_method === 'quartile' ? 'rgba(233,69,96,0.5)' : 'transparent'};">
                                    <input type="radio" name="threshold_method" value="quartile" ${config.threshold_method === 'quartile' ? 'checked' : ''} onchange="RiskIntelligence.onMethodChange(this.value)" style="margin-top: 2px;">
                                    <div>
                                        <strong style="color: #fff;">Cuartiles Dinámicos</strong>
                                        <div style="font-size: 11px; color: #888;">Calculados por datos estadísticos propios</div>
                                    </div>
                                </label>
                                <label style="display: flex; align-items: flex-start; gap: 10px; padding: 12px; background: ${config.threshold_method === 'benchmark' ? 'rgba(233,69,96,0.2)' : 'rgba(255,255,255,0.03)'}; border-radius: 8px; cursor: pointer; border: 1px solid ${config.threshold_method === 'benchmark' ? 'rgba(233,69,96,0.5)' : 'transparent'};">
                                    <input type="radio" name="threshold_method" value="benchmark" ${config.threshold_method === 'benchmark' ? 'checked' : ''} onchange="RiskIntelligence.onMethodChange(this.value)" style="margin-top: 2px;">
                                    <div>
                                        <strong style="color: #fff;">Benchmarks Internacionales</strong>
                                        <div style="font-size: 11px; color: #888;">Basados en OIT, OSHA, SRT Argentina</div>
                                    </div>
                                </label>
                                <label style="display: flex; align-items: flex-start; gap: 10px; padding: 12px; background: ${config.threshold_method === 'hybrid' ? 'rgba(233,69,96,0.2)' : 'rgba(255,255,255,0.03)'}; border-radius: 8px; cursor: pointer; border: 1px solid ${config.threshold_method === 'hybrid' ? 'rgba(233,69,96,0.5)' : 'transparent'};">
                                    <input type="radio" name="threshold_method" value="hybrid" ${config.threshold_method === 'hybrid' ? 'checked' : ''} onchange="RiskIntelligence.onMethodChange(this.value)" style="margin-top: 2px;">
                                    <div>
                                        <strong style="color: #fff;">Híbrido</strong>
                                        <div style="font-size: 11px; color: #888;">Combinación ponderada de los 3 métodos</div>
                                    </div>
                                </label>
                            </div>

                            <!-- Pesos híbridos (solo visible si método = hybrid) -->
                            <div id="hybrid-weights-section" style="display: ${config.threshold_method === 'hybrid' ? 'block' : 'none'}; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                                <div style="font-size: 13px; color: #fff; margin-bottom: 10px;">Pesos del método híbrido:</div>
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                                    <div>
                                        <label style="font-size: 11px; color: #888;">Manual</label>
                                        <input type="number" id="hybrid-manual" value="${(config.hybrid_weights?.manual || 0.3) * 100}" min="0" max="100" step="5"
                                               style="width: 100%; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff;">
                                    </div>
                                    <div>
                                        <label style="font-size: 11px; color: #888;">Cuartiles</label>
                                        <input type="number" id="hybrid-quartile" value="${(config.hybrid_weights?.quartile || 0.4) * 100}" min="0" max="100" step="5"
                                               style="width: 100%; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff;">
                                    </div>
                                    <div>
                                        <label style="font-size: 11px; color: #888;">Benchmark</label>
                                        <input type="number" id="hybrid-benchmark" value="${(config.hybrid_weights?.benchmark || 0.3) * 100}" min="0" max="100" step="5"
                                               style="width: 100%; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff;">
                                    </div>
                                </div>
                                <div style="font-size: 11px; color: #666; margin-top: 5px;">Los pesos deben sumar 100%</div>
                            </div>
                        </div>

                        <!-- SECCIÓN 2: SEGMENTACIÓN -->
                        <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <h3 style="color: #fff; margin: 0 0 5px 0; font-size: 16px;">
                                        📊 Segmentación por Tipo de Trabajo
                                    </h3>
                                    <p style="color: #888; font-size: 12px; margin: 0;">
                                        Aplicar umbrales diferentes según categoría: administrativo, operativo, técnico, comercial, gerencial
                                    </p>
                                </div>
                                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                    <span style="font-size: 12px; color: #888;">${config.enable_segmentation ? 'Activo' : 'Inactivo'}</span>
                                    <div style="position: relative; width: 50px; height: 26px;">
                                        <input type="checkbox" id="enable-segmentation" ${config.enable_segmentation ? 'checked' : ''} onchange="RiskIntelligence.onSegmentationChange(this.checked)"
                                               style="opacity: 0; width: 100%; height: 100%; position: absolute; cursor: pointer; z-index: 2;">
                                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: ${config.enable_segmentation ? '#e94560' : '#333'}; border-radius: 26px; transition: background 0.3s;"></div>
                                        <div style="position: absolute; top: 3px; left: ${config.enable_segmentation ? '27px' : '3px'}; width: 20px; height: 20px; background: #fff; border-radius: 50%; transition: left 0.3s;"></div>
                                    </div>
                                </label>
                            </div>

                            <div id="segmentation-info" style="display: ${config.enable_segmentation ? 'block' : 'none'}; margin-top: 15px; padding: 15px; background: rgba(233,69,96,0.1); border-radius: 8px;">
                                <div style="font-size: 13px; color: #e94560; margin-bottom: 10px;">
                                    <strong>✅ Segmentación activa</strong>
                                </div>
                                <div style="font-size: 12px; color: #888;">
                                    Los empleados serán evaluados con umbrales específicos según su categoría de trabajo asignada en la posición organizacional.
                                </div>
                            </div>
                        </div>

                        <!-- SECCIÓN 3: RECÁLCULO DE CUARTILES -->
                        <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <h3 style="color: #fff; margin: 0 0 5px 0; font-size: 16px;">
                                        🔄 Recálculo de Cuartiles
                                    </h3>
                                    <p style="color: #888; font-size: 12px; margin: 0;">
                                        Último cálculo: ${config.last_quartile_calculation ? new Date(config.last_quartile_calculation).toLocaleString() : 'Nunca'}
                                    </p>
                                </div>
                                <button class="ri-btn ri-btn-secondary" onclick="RiskIntelligence.recalculateQuartiles()" style="white-space: nowrap;">
                                    🔄 Recalcular ahora
                                </button>
                            </div>
                        </div>

                        <!-- SECCIÓN 4: UMBRALES MANUALES -->
                        <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px;">
                            <h3 style="color: #fff; margin: 0 0 15px 0; font-size: 16px;">
                                📐 Umbrales Manuales por Índice
                            </h3>

                            ${Object.entries(RISK_INDICES).map(([key, indexConfig]) => `
                                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <span style="font-size: 18px;">${indexConfig.icon}</span>
                                            <span style="font-weight: 600; color: #fff;">${indexConfig.name}</span>
                                        </div>
                                        <span style="font-size: 11px; color: #666;">Peso: ${indexConfig.weight * 100}%</span>
                                    </div>
                                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                                        <div>
                                            <label style="font-size: 10px; color: #4ade80;">Bajo</label>
                                            <input type="number" data-index="${key}" data-level="low" value="${indexConfig.thresholds.low}"
                                                   style="width: 100%; padding: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(74,222,128,0.3); border-radius: 4px; color: #4ade80; font-size: 12px;">
                                        </div>
                                        <div>
                                            <label style="font-size: 10px; color: #fbbf24;">Medio</label>
                                            <input type="number" data-index="${key}" data-level="medium" value="${indexConfig.thresholds.medium}"
                                                   style="width: 100%; padding: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(251,191,36,0.3); border-radius: 4px; color: #fbbf24; font-size: 12px;">
                                        </div>
                                        <div>
                                            <label style="font-size: 10px; color: #f97316;">Alto</label>
                                            <input type="number" data-index="${key}" data-level="high" value="${indexConfig.thresholds.high || 70}"
                                                   style="width: 100%; padding: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(249,115,22,0.3); border-radius: 4px; color: #f97316; font-size: 12px;">
                                        </div>
                                        <div>
                                            <label style="font-size: 10px; color: #ef4444;">Crítico</label>
                                            <input type="number" data-index="${key}" data-level="critical" value="${indexConfig.thresholds.critical}"
                                                   style="width: 100%; padding: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(239,68,68,0.3); border-radius: 4px; color: #ef4444; font-size: 12px;">
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="ri-modal-footer">
                        <button class="ri-btn ri-btn-secondary" onclick="RiskIntelligence.closeModal()">Cancelar</button>
                        <button class="ri-btn ri-btn-primary" onclick="RiskIntelligence.saveConfig()">
                            💾 Guardar Configuración
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    // Manejadores de cambio de método
    onMethodChange(method) {
        const hybridSection = document.getElementById('hybrid-weights-section');
        if (hybridSection) {
            hybridSection.style.display = method === 'hybrid' ? 'block' : 'none';
        }

        // Actualizar estilos de radio buttons
        document.querySelectorAll('input[name="threshold_method"]').forEach(radio => {
            const label = radio.closest('label');
            if (label) {
                label.style.background = radio.checked ? 'rgba(233,69,96,0.2)' : 'rgba(255,255,255,0.03)';
                label.style.borderColor = radio.checked ? 'rgba(233,69,96,0.5)' : 'transparent';
            }
        });
    },

    onSegmentationChange(enabled) {
        const infoSection = document.getElementById('segmentation-info');
        if (infoSection) {
            infoSection.style.display = enabled ? 'block' : 'none';
        }

        // Actualizar toggle visual
        const toggle = document.getElementById('enable-segmentation');
        if (toggle) {
            const bg = toggle.nextElementSibling;
            const knob = bg?.nextElementSibling;
            if (bg) bg.style.background = enabled ? '#e94560' : '#333';
            if (knob) knob.style.left = enabled ? '27px' : '3px';

            const label = toggle.closest('label').querySelector('span');
            if (label) label.textContent = enabled ? 'Activo' : 'Inactivo';
        }
    },

    async recalculateQuartiles() {
        try {
            const result = await RiskAPI.request('/risk-config/recalculate', { method: 'POST' });
            if (result.success) {
                alert('✅ Cuartiles recalculados correctamente');
            } else {
                alert('❌ Error: ' + (result.error || 'No se pudieron recalcular'));
            }
        } catch (error) {
            console.error('[RISK] Error recalculando cuartiles:', error);
            alert('❌ Error al recalcular cuartiles');
        }
    },

    closeModal() {
        const modal = document.querySelector('.ri-modal');
        if (modal) modal.remove();

        // Volver al contexto dashboard
        if (typeof ModuleHelpSystem !== 'undefined') {
            ModuleHelpSystem.setContext('dashboard');
        }
    },

    async saveConfig() {
        try {
            // Obtener método seleccionado
            const methodRadio = document.querySelector('input[name="threshold_method"]:checked');
            const method = methodRadio ? methodRadio.value : 'manual';

            // Obtener estado de segmentación
            const segmentationCheckbox = document.getElementById('enable-segmentation');
            const enableSegmentation = segmentationCheckbox ? segmentationCheckbox.checked : false;

            // Construir configuración a guardar
            const configToSave = {
                threshold_method: method,
                enable_segmentation: enableSegmentation
            };

            // Si es híbrido, obtener pesos
            if (method === 'hybrid') {
                const manualWeight = parseFloat(document.getElementById('hybrid-manual')?.value || 30) / 100;
                const quartileWeight = parseFloat(document.getElementById('hybrid-quartile')?.value || 40) / 100;
                const benchmarkWeight = parseFloat(document.getElementById('hybrid-benchmark')?.value || 30) / 100;

                // Validar que sumen 100%
                const total = manualWeight + quartileWeight + benchmarkWeight;
                if (Math.abs(total - 1) > 0.01) {
                    alert('⚠️ Los pesos del método híbrido deben sumar 100%');
                    return;
                }

                configToSave.hybrid_weights = {
                    manual: manualWeight,
                    quartile: quartileWeight,
                    benchmark: benchmarkWeight
                };
            }

            // Obtener umbrales manuales
            const globalThresholds = {};
            document.querySelectorAll('[data-index][data-level]').forEach(input => {
                const index = input.dataset.index;
                const level = input.dataset.level;
                const value = parseInt(input.value) || 0;

                if (!globalThresholds[index]) {
                    globalThresholds[index] = {};
                }
                globalThresholds[index][level] = value;
            });

            if (Object.keys(globalThresholds).length > 0) {
                configToSave.global_thresholds = globalThresholds;
            }

            console.log('[RISK] Guardando configuración:', configToSave);

            // Enviar al backend
            const result = await RiskAPI.request('/risk-config', {
                method: 'PUT',
                body: JSON.stringify(configToSave)
            });

            if (result.success) {
                alert('✅ Configuración guardada correctamente');
                this.closeModal();
                // Recargar dashboard para aplicar nueva configuración
                this.loadDashboard();
            } else {
                alert('❌ Error: ' + (result.error || 'No se pudo guardar'));
            }

        } catch (error) {
            console.error('[RISK] Error guardando configuración:', error);
            alert('❌ Error al guardar configuración');
        }
    },

    // ========== FILTROS ==========
    applyFilters() {
        RiskState.filters = {
            department: document.getElementById('filter-department').value,
            riskLevel: document.getElementById('filter-risk').value,
            period: document.getElementById('filter-period').value
        };

        // Re-cargar con filtros
        this.loadDashboard();
    },

    async loadDepartments() {
        const select = document.getElementById('filter-department');
        if (!select) return;

        try {
            // SSOT: Cargar departamentos reales desde API
            const result = await RiskAPI.request('/departments');

            let options = '<option value="all">Todos</option>';
            if (result.success && result.departments?.length > 0) {
                result.departments.forEach(dept => {
                    options += `<option value="${dept.id}">${dept.name} (${dept.employee_count || 0})</option>`;
                });
            } else {
                console.log('[RISK] No hay departamentos registrados');
            }
            select.innerHTML = options;

        } catch (error) {
            console.error('[RISK] Error cargando departamentos:', error);
            // Fallback: solo opción "Todos" si falla la API
            select.innerHTML = '<option value="all">Todos</option>';
        }
    },

    // ========== SISTEMA DE AYUDA CONTEXTUAL ==========
    renderHelpBanner(context) {
        const container = document.getElementById('ri-help-banner');
        if (!container) return;

        // Usar ModuleHelpSystem si está disponible
        if (typeof ModuleHelpSystem !== 'undefined') {
            const bannerHtml = ModuleHelpSystem.renderBanner(context);
            if (bannerHtml) {
                container.innerHTML = bannerHtml;
                return;
            }
        }

        // Fallback: Banner propio si ModuleHelpSystem no está disponible
        const helpContent = this.getHelpContent(context);
        if (!helpContent) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="ri-help-banner" style="
                background: linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%);
                border: 1px solid rgba(99,102,241,0.3);
                border-radius: 12px;
                padding: 16px 20px;
                margin-bottom: 20px;
                display: flex;
                align-items: flex-start;
                gap: 15px;
            ">
                <span style="font-size: 24px;">💡</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #a5b4fc; margin-bottom: 8px;">${helpContent.title}</div>
                    <div style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
                        ${helpContent.tips.map(tip => `<div style="margin-bottom: 4px;">• ${tip}</div>`).join('')}
                    </div>
                    ${helpContent.warnings?.length ? `
                        <div style="margin-top: 10px; padding: 8px 12px; background: rgba(239,68,68,0.1); border-radius: 6px; border-left: 3px solid #ef4444;">
                            <span style="color: #fca5a5; font-size: 12px;">⚠️ ${helpContent.warnings[0]}</span>
                        </div>
                    ` : ''}
                </div>
                <button onclick="document.getElementById('ri-help-banner').innerHTML=''" style="
                    background: none; border: none; color: #64748b; cursor: pointer; font-size: 18px;
                ">×</button>
            </div>
        `;
    },

    getHelpContent(context) {
        const content = {
            dashboard: {
                title: '🛡️ Panel de Riesgos',
                tips: [
                    'Los índices se calculan automáticamente con datos reales de asistencia, sanciones y vacaciones',
                    'El color indica nivel de riesgo: 🟢 bajo, 🟡 medio, 🟠 alto, 🔴 crítico',
                    'Haga clic en cualquier empleado para ver su análisis detallado'
                ],
                warnings: ['Los empleados en riesgo CRÍTICO requieren atención inmediata']
            },
            employeeDetail: {
                title: '👤 Análisis Individual',
                tips: [
                    'Cada índice contribuye al riesgo total según su peso configurado',
                    'Las recomendaciones se generan automáticamente según los índices reales'
                ],
                warnings: ['Los índices en rojo requieren acción correctiva']
            },
            config: {
                title: '⚙️ Configuración de Índices',
                tips: [
                    'Los pesos determinan la importancia de cada índice (deben sumar 100%)',
                    'Los umbrales definen los niveles de riesgo (bajo → medio → alto → crítico)'
                ],
                warnings: ['Cambiar umbrales afecta inmediatamente a todos los análisis']
            },
            violations: {
                title: '⚖️ Violaciones Laborales',
                tips: [
                    'Cada violación incluye referencia legal específica (LCT)',
                    'Resuelva las violaciones críticas primero para reducir riesgo legal'
                ],
                warnings: ['Las violaciones no resueltas incrementan el índice de reclamo legal']
            }
        };
        return content[context];
    },

    // ========== SISTEMA DE EXPORTACIÓN (PDF / Excel) ==========
    toggleExportMenu() {
        const menu = document.getElementById('ri-export-menu');
        if (menu) {
            const isVisible = menu.style.display !== 'none';
            menu.style.display = isVisible ? 'none' : 'block';

            // Cerrar al hacer click fuera
            if (!isVisible) {
                const closeHandler = (e) => {
                    if (!e.target.closest('.ri-export-dropdown')) {
                        menu.style.display = 'none';
                        document.removeEventListener('click', closeHandler);
                    }
                };
                setTimeout(() => document.addEventListener('click', closeHandler), 100);
            }
        }
    },

    async exportDashboard(format) {
        const menu = document.getElementById('ri-export-menu');
        if (menu) menu.style.display = 'none';

        const period = document.getElementById('filter-period')?.value || '30d';
        const periodDays = parseInt(period.replace('d', '')) || 30;

        try {
            this.showExportLoading(`Generando ${format.toUpperCase()}...`);

            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('token');
            const companyName = encodeURIComponent(window.currentCompanyName || 'Empresa');

            const response = await fetch(
                `/api/compliance/export/dashboard/${format}?period=${periodDays}&company_name=${companyName}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const filename = `reporte-riesgos-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;

            this.downloadBlob(blob, filename);
            this.hideExportLoading();
            this.showExportSuccess(`${format.toUpperCase()} descargado correctamente`);

        } catch (error) {
            console.error('[RISK] Error exportando:', error);
            this.hideExportLoading();
            alert(`Error al exportar: ${error.message}`);
        }
    },

    async exportViolations(format) {
        const menu = document.getElementById('ri-export-menu');
        if (menu) menu.style.display = 'none';

        try {
            this.showExportLoading(`Generando violaciones ${format.toUpperCase()}...`);

            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('token');
            const companyName = encodeURIComponent(window.currentCompanyName || 'Empresa');

            const response = await fetch(
                `/api/compliance/export/violations/${format}?company_name=${companyName}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const filename = `violaciones-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;

            this.downloadBlob(blob, filename);
            this.hideExportLoading();
            this.showExportSuccess(`Violaciones ${format.toUpperCase()} descargado`);

        } catch (error) {
            console.error('[RISK] Error exportando violaciones:', error);
            this.hideExportLoading();
            alert(`Error al exportar: ${error.message}`);
        }
    },

    async exportEmployeePDF(employeeId) {
        try {
            this.showExportLoading('Generando análisis PDF...');

            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('token');
            const period = document.getElementById('filter-period')?.value || '30d';
            const periodDays = parseInt(period.replace('d', '')) || 30;
            const companyName = encodeURIComponent(window.currentCompanyName || 'Empresa');

            const response = await fetch(
                `/api/compliance/export/employee/${employeeId}/pdf?period=${periodDays}&company_name=${companyName}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const filename = `analisis-riesgo-${employeeId}-${new Date().toISOString().split('T')[0]}.pdf`;

            this.downloadBlob(blob, filename);
            this.hideExportLoading();
            this.showExportSuccess('Análisis PDF descargado');

        } catch (error) {
            console.error('[RISK] Error exportando PDF empleado:', error);
            this.hideExportLoading();
            alert(`Error al exportar: ${error.message}`);
        }
    },

    downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    },

    showExportLoading(message) {
        // Mostrar indicador de carga en el botón de exportar
        const btn = document.querySelector('.ri-btn-export');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner" style="display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;"></span> ${message}`;
        }
    },

    hideExportLoading() {
        const btn = document.querySelector('.ri-btn-export');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '📥 Exportar ▾';
        }
    },

    showExportSuccess(message) {
        // Mostrar toast de éxito
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            box-shadow: 0 4px 20px rgba(16,185,129,0.4);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = `✅ ${message}`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // ========== UTILIDADES ==========
    showLoading() {
        const container = document.getElementById('ri-violations');
        if (container) {
            container.innerHTML = `
                <div class="ri-loading">
                    <div class="ri-spinner"></div>
                    <span>Cargando datos...</span>
                </div>
            `;
        }
    },

    showError(message) {
        console.error('[RISK]', message);
    },

    getRiskLevel(value, thresholds) {
        if (value >= thresholds.critical) return 'critical';
        if (value >= thresholds.high) return 'high';
        if (value >= thresholds.medium) return 'medium';
        return 'low';
    },

    getRiskLevelFromScore(score) {
        if (score >= 85) return 'critical';
        if (score >= 70) return 'high';
        if (score >= 50) return 'medium';
        return 'low';
    },

    getLevelColor(level) {
        const colors = {
            critical: '#e94560',
            high: '#f39c12',
            medium: '#f1c40f',
            low: '#00ff88'
        };
        return colors[level] || '#888';
    },

    getLevelLabel(level) {
        const labels = {
            critical: 'CRÍTICO',
            high: 'ALTO',
            medium: 'MEDIO',
            low: 'BAJO'
        };
        return labels[level] || level;
    },

    getSeverityLabel(severity) {
        const labels = {
            critical: '🔴 Crítico',
            high: '🟠 Alto',
            medium: '🟡 Medio',
            low: '🟢 Bajo'
        };
        return labels[severity] || severity;
    },

    getViolationTypeLabel(type) {
        const labels = {
            rest_period: '😴 Descanso',
            overtime_limit: '⏰ Horas Extra',
            vacation_expiry: '🏖️ Vacaciones',
            working_hours: '📅 Jornada',
            documentation: '📄 Documentación'
        };
        return labels[type] || type;
    },

    formatDate(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    // SSOT: Generar recomendaciones basadas en índices REALES
    renderRecommendations(indices, overallRisk) {
        const recommendations = [];

        // Generar recomendaciones basadas en índices reales
        if (indices?.fatigue > 70) {
            recommendations.push({
                icon: '😴',
                priority: 'high',
                message: 'Revisar distribución de horarios y carga de trabajo',
                action: 'Considerar redistribución de turnos o descanso compensatorio'
            });
        } else if (indices?.fatigue > 50) {
            recommendations.push({
                icon: '⏰',
                priority: 'medium',
                message: 'Monitorear horas trabajadas semanalmente',
                action: 'Verificar cumplimiento de descansos mínimos entre jornadas'
            });
        }

        if (indices?.accident > 60) {
            recommendations.push({
                icon: '⚠️',
                priority: 'high',
                message: 'Alto riesgo de accidente laboral detectado',
                action: 'Verificar EPP, capacitación en seguridad y condiciones del puesto'
            });
        }

        if (indices?.legal_claim > 60) {
            recommendations.push({
                icon: '⚖️',
                priority: 'high',
                message: 'Posibles incumplimientos normativos detectados',
                action: 'Revisar cumplimiento de LCT (horas extras, descansos, vacaciones)'
            });
        } else if (indices?.legal_claim > 40) {
            recommendations.push({
                icon: '📋',
                priority: 'medium',
                message: 'Revisar estado de vacaciones pendientes',
                action: 'Verificar que el empleado haya tomado vacaciones en el último año'
            });
        }

        if (indices?.performance > 65) {
            recommendations.push({
                icon: '📉',
                priority: 'medium',
                message: 'Indicadores de bajo rendimiento detectados',
                action: 'Evaluar motivación, capacitación adicional o reasignación de tareas'
            });
        }

        if (indices?.turnover > 60) {
            recommendations.push({
                icon: '🚪',
                priority: 'medium',
                message: 'Riesgo de rotación elevado',
                action: 'Considerar entrevista de retención y revisión de condiciones laborales'
            });
        }

        // Si no hay recomendaciones específicas
        if (recommendations.length === 0) {
            if (overallRisk && overallRisk > 30) {
                recommendations.push({
                    icon: '📊',
                    priority: 'low',
                    message: 'Continuar monitoreo preventivo',
                    action: 'Mantener seguimiento regular de indicadores'
                });
            } else {
                return `
                    <div style="text-align: center; color: #00ff88; padding: 10px;">
                        <span style="font-size: 24px;">✅</span>
                        <p style="margin: 10px 0 0 0;">Sin alertas críticas. Índices dentro de parámetros normales.</p>
                    </div>
                `;
            }
        }

        // Renderizar lista de recomendaciones
        const priorityColors = { high: '#e94560', medium: '#f39c12', low: '#00ff88' };
        return `
            <ul style="margin: 0; padding-left: 0; list-style: none; color: #bbb; font-size: 13px; line-height: 1.8;">
                ${recommendations.map(rec => `
                    <li style="margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.02); border-radius: 8px; border-left: 3px solid ${priorityColors[rec.priority]};">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                            <span>${rec.icon}</span>
                            <strong style="color: #fff;">${rec.message}</strong>
                        </div>
                        <div style="font-size: 12px; color: #888; padding-left: 26px;">→ ${rec.action}</div>
                    </li>
                `).join('')}
            </ul>
        `;
    },

    // ========== FALLBACK DATA (Solo si API falla completamente) ==========
    getEmptyDashboard() {
        return {
            stats: { criticalCount: 0, activeViolations: 0, averageRisk: 0, compliancePercent: 100, totalEmployees: 0 },
            indices: { fatigue: 0, accident: 0, legal_claim: 0, performance: 0, turnover: 0 },
            employees: []
        };
    },

    getEmptyStats() {
        return {
            criticalCount: 0,
            activeViolations: 0,
            averageRisk: 0,
            compliancePercent: 100,
            aiAnalysisCount: 0,
            totalEmployees: 0
        };
    },

    getEmptyIndices() {
        return { fatigue: 0, accident: 0, legal_claim: 0, performance: 0, turnover: 0 };
    },

    calculateStats(data) {
        if (!data || !data.employees || data.employees.length === 0) {
            return this.getEmptyStats();
        }
        const employees = data.employees;
        const criticalCount = employees.filter(e => e.risk_score >= 80).length;
        const averageRisk = Math.round(employees.reduce((sum, e) => sum + e.risk_score, 0) / employees.length);
        return {
            criticalCount,
            activeViolations: data.activeViolations || 0,
            averageRisk,
            compliancePercent: 100 - averageRisk,
            aiAnalysisCount: employees.length,
            totalEmployees: employees.length
        };
    }
};

// ============================================================================
// EXPORTS
// ============================================================================
window.RiskIntelligence = RiskIntelligence;
window.RiskAPI = RiskAPI;
window.RISK_INDICES = RISK_INDICES;

// ✅ Alias para compatibilidad con panel-empresa.html que busca ComplianceDashboard
window.ComplianceDashboard = {
    init: function() {
        console.log('🔄 [COMPLIANCE] ComplianceDashboard.init() ejecutándose');
        RiskIntelligence.init();
    }
};

// Función wrapper para panel-empresa.html
function showComplianceDashboardContent(container) {
    console.log('🔄 [MODULE] Ejecutando showComplianceDashboardContent()');
    RiskIntelligence.init();
}

window.showComplianceDashboardContent = showComplianceDashboardContent;

// ✅ Registrar en sistema de módulos unificado
if (!window.Modules) window.Modules = {};
window.Modules['compliance-dashboard'] = {
    init: function() { RiskIntelligence.init(); },
    name: 'Compliance Dashboard',
    version: '2.0.0'
};

console.log('✅ [COMPLIANCE] Módulo exportado: RiskIntelligence, ComplianceDashboard, showComplianceDashboardContent');
