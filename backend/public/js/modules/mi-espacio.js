'use strict';

/**
 * MI ESPACIO - Módulo CORE para todos los empleados
 * DARK THEME EDITION
 *
 * Dashboard personal con acceso a:
 * - Mis Documentos (DMS)
 * - Mi Asistencia
 * - Mis Vacaciones
 * - Mis Notificaciones
 * - Mi Perfil 360°
 *
 * @version 2.0.0
 */

(function() {
    const MODULE_ID = 'mi-espacio';

    // Estado del módulo
    const state = {
        user: null,
        company: null,
        initialized: false
    };

    // Estilos CSS Dark Theme
    const styles = `
        /* ========== CONTENEDOR PRINCIPAL ========== */
        .mi-espacio-dashboard {
            min-height: 100vh;
            background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
            color: #e0e0e0;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            padding: 25px;
        }

        /* ========== HEADER DEL USUARIO ========== */
        .mi-espacio-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 30px;
            padding: 25px 30px;
            background: rgba(15, 15, 30, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
            flex-wrap: wrap;
        }

        .mi-espacio-user-info {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .mi-espacio-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            color: white;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        }

        .mi-espacio-greeting h2 {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 700;
            background: linear-gradient(135deg, #ffffff, #a0a0a0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .mi-espacio-greeting p {
            margin: 5px 0 0;
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.95rem;
        }

        .mi-espacio-greeting i {
            margin-right: 6px;
            opacity: 0.7;
        }

        /* ========== STATS BAR ========== */
        .mi-espacio-stats {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }

        .mi-espacio-stat {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px 18px;
            text-align: center;
            min-width: 80px;
        }

        .mi-espacio-stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #667eea;
        }

        .mi-espacio-stat-label {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.5);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* ========== SECCIÓN TÍTULO ========== */
        .mi-espacio-section-title {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 25px;
            font-size: 1.3rem;
            font-weight: 600;
            color: #ffffff;
        }

        .mi-espacio-section-title i {
            color: #667eea;
        }

        /* ========== GRID DE MÓDULOS ========== */
        .mi-espacio-modules-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
            margin-bottom: 35px;
        }

        /* ========== TARJETA DE MÓDULO ========== */
        .mi-espacio-module-card {
            background: rgba(15, 15, 30, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 25px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .mi-espacio-module-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--card-accent);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .mi-espacio-module-card:hover {
            transform: translateY(-5px);
            border-color: var(--card-accent);
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4), 0 0 20px var(--card-glow);
        }

        .mi-espacio-module-card:hover::before {
            opacity: 1;
        }

        .mi-espacio-module-card .badge-core {
            position: absolute;
            top: 12px;
            right: 12px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 4px 12px;
            font-size: 0.65rem;
            font-weight: 700;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .mi-espacio-module-card .module-icon {
            font-size: 2.5rem;
            margin-bottom: 15px;
            color: var(--card-accent);
            text-shadow: 0 0 20px var(--card-glow);
        }

        .mi-espacio-module-card h4 {
            margin: 0 0 10px;
            font-size: 1.2rem;
            font-weight: 600;
            color: #ffffff;
        }

        .mi-espacio-module-card p {
            margin: 0 0 15px;
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.6);
            line-height: 1.5;
        }

        .mi-espacio-module-card .module-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .mi-espacio-module-card .action-tag {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.7);
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .mi-espacio-module-card .action-tag i {
            color: var(--card-accent);
        }

        /* ========== ACCESOS RÁPIDOS ========== */
        .mi-espacio-quick-access {
            background: rgba(15, 15, 30, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 25px;
        }

        .mi-espacio-quick-buttons {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }

        .mi-espacio-quick-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 22px;
            border: none;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            color: white;
        }

        .mi-espacio-quick-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .mi-espacio-quick-btn.btn-documents {
            background: linear-gradient(135deg, #3498db, #2980b9);
        }

        .mi-espacio-quick-btn.btn-vacation {
            background: linear-gradient(135deg, #f39c12, #d68910);
        }

        .mi-espacio-quick-btn.btn-notifications {
            background: linear-gradient(135deg, #9b59b6, #8e44ad);
        }

        /* ========== BOTÓN VOLVER ========== */
        .mi-espacio-back-btn {
            position: fixed;
            top: 80px;
            left: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 14px 24px;
            border-radius: 30px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
            z-index: 1000;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .mi-espacio-back-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
        }

        /* ========== RESPONSIVE ========== */
        @media (max-width: 768px) {
            .mi-espacio-header {
                flex-direction: column;
                text-align: center;
            }

            .mi-espacio-user-info {
                flex-direction: column;
            }

            .mi-espacio-modules-grid {
                grid-template-columns: 1fr;
            }
        }
    `;

    /**
     * Inyectar estilos CSS
     */
    function injectStyles() {
        if (document.getElementById('mi-espacio-styles')) return;
        const styleSheet = document.createElement('style');
        styleSheet.id = 'mi-espacio-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    /**
     * Inicializar el módulo
     */
    function init() {
        console.log('👤 [MI-ESPACIO] Inicializando módulo dark theme...');

        injectStyles();

        state.user = window.currentUser || {};
        state.company = window.currentCompany || window.selectedCompany || {};

        render();

        // Aplicar visibilidad de módulos opcionales (plug & play)
        if (window.moduleHelper && typeof window.moduleHelper.applyModuleVisibility === 'function') {
            window.moduleHelper.applyModuleVisibility();
            console.log('🔌 [MI-ESPACIO] Aplicada visibilidad de módulos opcionales');
        }

        // Cargar estadísticas del usuario después de renderizar
        loadUserStats();

        state.initialized = true;

        console.log('✅ [MI-ESPACIO] Módulo inicializado');
    }

    /**
     * Cargar estadísticas del usuario para el header
     * (Documentos, Notificaciones, Vacaciones, Banco de Horas)
     */
    async function loadUserStats() {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Cargar todas las estadísticas en paralelo
        const promises = [];

        // 1. Documentos pendientes
        promises.push(
            fetch('/api/dms/employee/my-documents', { headers })
                .then(r => r.ok ? r.json() : { data: [] })
                .then(data => {
                    const count = data.data?.length || 0;
                    const el = document.getElementById('stat-documents');
                    if (el) el.textContent = count;
                })
                .catch(() => {
                    const el = document.getElementById('stat-documents');
                    if (el) el.textContent = '0';
                })
        );

        // 2. Notificaciones no leídas
        promises.push(
            fetch('/api/inbox/stats', { headers })
                .then(r => r.ok ? r.json() : { stats: { unread_messages: 0 } })
                .then(data => {
                    // El endpoint retorna: unread_messages, pending_responses, overdue_messages
                    const count = data.stats?.unread_messages || data.stats?.pending_responses || 0;
                    const el = document.getElementById('stat-notifications');
                    if (el) el.textContent = count;
                })
                .catch(() => {
                    const el = document.getElementById('stat-notifications');
                    if (el) el.textContent = '0';
                })
        );

        // 3. Días de vacaciones disponibles
        const userId = state.user.user_id || state.user.id;
        promises.push(
            fetch(`/api/v1/vacation/calculate-days/${userId}`, { headers })
                .then(r => r.ok ? r.json() : { available: 0 })
                .then(data => {
                    // El endpoint retorna available, entitled, used, pending
                    const days = data.available ?? data.data?.available ?? 0;
                    const el = document.getElementById('stat-vacation');
                    if (el) el.textContent = Math.floor(days);
                })
                .catch(() => {
                    const el = document.getElementById('stat-vacation');
                    if (el) el.textContent = '0';
                })
        );

        // 4. Saldo de Banco de Horas (solo si el módulo está activo)
        // Verificar si el elemento existe (puede estar oculto por moduleHelper)
        const hourBankStatEl = document.getElementById('stat-hourbank');
        if (hourBankStatEl && hourBankStatEl.offsetParent !== null) {
            promises.push(
                fetch('/api/hour-bank/my-summary', { headers })
                    .then(r => r.ok ? r.json() : { summary: { currentBalance: 0 } })
                    .then(data => {
                        const balance = data.summary?.currentBalance || data.currentBalance || 0;
                        const el = document.getElementById('stat-hourbank');
                        if (el) {
                            // Formatear como horas con signo
                            const formatted = balance >= 0 ? `+${balance.toFixed(1)}h` : `${balance.toFixed(1)}h`;
                            el.textContent = formatted;
                            // Color según saldo
                            el.style.color = balance >= 0 ? '#00e5a0' : '#ff5252';
                        }
                    })
                    .catch(() => {
                        const el = document.getElementById('stat-hourbank');
                        if (el) el.textContent = '0h';
                    })
            );
        }

        // Ejecutar todas las promesas
        await Promise.allSettled(promises);
        console.log('📊 [MI-ESPACIO] Estadísticas cargadas');
    }

    /**
     * Abrir submódulo con tracking para botón "Volver"
     * IMPORTANTE: Establece flag miEspacioSelfView para que los módulos
     * solo muestren datos del usuario logueado (no de todos los empleados)
     */
    function openSubmodule(moduleKey, moduleName) {
        console.log('📂 [MI-ESPACIO] Abriendo submódulo:', moduleKey);

        // Flag para volver a Mi Espacio
        window.miEspacioReturnTo = true;

        // FLAG CRÍTICO: Indica que los módulos deben filtrar por usuario logueado
        window.miEspacioSelfView = true;

        // Guardar ID del usuario actual para que los módulos lo usen
        const currentUser = window.currentUser || {};
        window.miEspacioUserId = currentUser.id || currentUser.user_id || null;
        window.miEspacioEmployeeId = currentUser.employeeId || currentUser.employee_id || null;

        console.log('🔒 [MI-ESPACIO] Self-view mode activado para usuario:', window.miEspacioUserId);

        if (typeof window.showModuleContent === 'function') {
            window.showModuleContent(moduleKey, moduleName);

            setTimeout(() => {
                addBackButton();
            }, 800);
        }
    }

    /**
     * Agregar botón "Volver a Mi Espacio"
     */
    function addBackButton() {
        if (document.getElementById('btnBackToMiEspacio')) return;

        const backBtn = document.createElement('button');
        backBtn.id = 'btnBackToMiEspacio';
        backBtn.className = 'mi-espacio-back-btn';
        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Volver a Mi Espacio';

        backBtn.onclick = () => {
            // Limpiar todos los flags de self-view
            window.miEspacioReturnTo = false;
            window.miEspacioSelfView = false;
            window.miEspacioUserId = null;
            window.miEspacioEmployeeId = null;
            console.log('🔓 [MI-ESPACIO] Self-view mode desactivado');
            backBtn.remove();
            init();
        };

        document.body.appendChild(backBtn);
        console.log('✅ [MI-ESPACIO] Botón "Volver" agregado');
    }

    /**
     * Abrir modal de Banco de Horas del empleado con sistema de canje
     */
    async function openHourBank() {
        console.log('🏦 [MI-ESPACIO] Abriendo Mi Banco de Horas');

        const currentUser = window.currentUser || {};
        const userId = currentUser.id || currentUser.user_id;
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');

        if (!userId) {
            alert('Error: No se pudo identificar el usuario');
            return;
        }

        // Estado del modal
        let activeTab = 'balance';
        let summaryData = null;
        let redemptionSummary = null;

        // Crear modal
        const modal = document.createElement('div');
        modal.id = 'hourBankModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        modal.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 16px;
                max-width: 1000px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255,255,255,0.1);
            ">
                <div style="
                    background: linear-gradient(135deg, #00897b 0%, #00695c 50%, #004d40 100%);
                    color: white;
                    padding: 20px 25px;
                    border-radius: 16px 16px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div>
                        <h3 style="margin: 0; font-size: 1.4rem;"><i class="fas fa-piggy-bank"></i> Mi Banco de Horas</h3>
                        <p style="margin: 5px 0 0; opacity: 0.9; font-size: 0.9rem;">Cuenta corriente · Solicitudes de canje · Historial</p>
                    </div>
                    <button onclick="document.getElementById('hourBankModal').remove()" style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 1.2rem;
                    ">&times;</button>
                </div>

                <!-- Tabs -->
                <div id="hourBankTabs" style="display: flex; gap: 5px; padding: 15px 25px 0; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <button class="hb-tab active" data-tab="balance" style="background: rgba(0,200,150,0.2); color: #00e5a0; border: none; padding: 10px 20px; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-wallet"></i> Mi Balance
                    </button>
                    <button class="hb-tab" data-tab="redeem" style="background: transparent; color: #888; border: none; padding: 10px 20px; border-radius: 8px 8px 0 0; cursor: pointer;">
                        <i class="fas fa-exchange-alt"></i> Solicitar Canje
                    </button>
                    <button class="hb-tab" data-tab="requests" style="background: transparent; color: #888; border: none; padding: 10px 20px; border-radius: 8px 8px 0 0; cursor: pointer;">
                        <i class="fas fa-list"></i> Mis Solicitudes
                    </button>
                    <button class="hb-tab" data-tab="statement" style="background: transparent; color: #888; border: none; padding: 10px 20px; border-radius: 8px 8px 0 0; cursor: pointer;">
                        <i class="fas fa-file-invoice"></i> Estado de Cuenta
                    </button>
                </div>

                <div id="hourBankContent" style="padding: 25px;">
                    <div style="text-align: center; padding: 40px;">
                        <div class="spinner-border text-primary" role="status"></div>
                        <p style="margin-top: 15px; color: #888;">Cargando datos...</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Cerrar al hacer click fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Setup tabs
        const tabs = modal.querySelectorAll('.hb-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => {
                    t.style.background = 'transparent';
                    t.style.color = '#888';
                    t.classList.remove('active');
                });
                tab.style.background = 'rgba(0,200,150,0.2)';
                tab.style.color = '#00e5a0';
                tab.classList.add('active');
                activeTab = tab.dataset.tab;
                renderTabContent();
            });
        });

        // Funciones de renderizado
        async function renderTabContent() {
            const content = document.getElementById('hourBankContent');

            if (activeTab === 'balance') {
                await renderBalanceTab(content);
            } else if (activeTab === 'redeem') {
                await renderRedeemTab(content);
            } else if (activeTab === 'requests') {
                await renderRequestsTab(content);
            } else if (activeTab === 'statement') {
                await renderStatementTab(content);
            }
        }

        // Variable para estado de préstamos
        let loanStatus = null;

        async function renderBalanceTab(content) {
            try {
                // Cargar datos en paralelo
                if (!summaryData) {
                    const response = await fetch('/api/hour-bank/my-summary', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error('Error al cargar datos');
                    summaryData = await response.json();
                }

                // Cargar estado de préstamos
                if (!loanStatus) {
                    try {
                        const loanResponse = await fetch('/api/hour-bank/loans/my-status', {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (loanResponse.ok) {
                            loanStatus = await loanResponse.json();
                        }
                    } catch (e) {
                        console.log('Sin datos de préstamos');
                    }
                }

                const summary = summaryData.data || {};
                const health = summary.health || {};
                const transactions = summary.transactions || [];
                const loans = loanStatus?.loanStatus || {};
                const hasDebt = loans.hasActiveLoans && loans.totals?.totalRemaining > 0;

                content.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 25px;">
                        <div style="background: rgba(0,200,150,0.1); border: 1px solid rgba(0,200,150,0.3); border-radius: 12px; padding: 20px; text-align: center;">
                            <i class="fas fa-wallet fa-2x" style="color: #00e5a0; margin-bottom: 10px;"></i>
                            <h2 style="color: #00e5a0; margin: 0;">${(summary.balance || 0).toFixed(1)}h</h2>
                            <small style="color: #888;">Balance Total</small>
                        </div>
                        <div style="background: rgba(102,126,234,0.1); border: 1px solid rgba(102,126,234,0.3); border-radius: 12px; padding: 20px; text-align: center;">
                            <i class="fas fa-check-circle fa-2x" style="color: #667eea; margin-bottom: 10px;"></i>
                            <h2 style="color: #667eea; margin: 0;">${(summary.available || summary.balance || 0).toFixed(1)}h</h2>
                            <small style="color: #888;">Disponible para Canje</small>
                        </div>
                        <div style="background: rgba(255,193,7,0.1); border: 1px solid rgba(255,193,7,0.3); border-radius: 12px; padding: 20px; text-align: center;">
                            <i class="fas fa-clock fa-2x" style="color: #ffc107; margin-bottom: 10px;"></i>
                            <h2 style="color: #ffc107; margin: 0;">${(summary.pending || 0).toFixed(1)}h</h2>
                            <small style="color: #888;">Pendientes</small>
                        </div>
                        <div style="background: ${health.health_score >= 80 ? 'rgba(0,200,150,0.1)' : health.health_score >= 60 ? 'rgba(255,193,7,0.1)' : 'rgba(255,82,82,0.1)'}; border: 1px solid ${health.health_score >= 80 ? 'rgba(0,200,150,0.3)' : health.health_score >= 60 ? 'rgba(255,193,7,0.3)' : 'rgba(255,82,82,0.3)'}; border-radius: 12px; padding: 20px; text-align: center;">
                            <i class="fas fa-heartbeat fa-2x" style="color: ${health.health_score >= 80 ? '#00e5a0' : health.health_score >= 60 ? '#ffc107' : '#ff5252'}; margin-bottom: 10px;"></i>
                            <h2 style="color: ${health.health_score >= 80 ? '#00e5a0' : health.health_score >= 60 ? '#ffc107' : '#ff5252'}; margin: 0;">${health.health_score || 0}</h2>
                            <small style="color: #888;">Salud de Cuenta</small>
                        </div>
                    </div>

                    ${hasDebt ? `
                        <div style="background: rgba(255,152,0,0.15); border: 1px solid rgba(255,152,0,0.4); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                                <div>
                                    <h5 style="color: #ff9800; margin: 0;"><i class="fas fa-hand-holding-usd"></i> Préstamos Activos</h5>
                                    <p style="color: #ccc; margin: 5px 0 0; font-size: 0.9rem;">Tienes horas prestadas que debes devolver con horas extra</p>
                                </div>
                                <div style="text-align: right;">
                                    <span style="display: block; color: #ff9800; font-size: 1.5rem; font-weight: 700;">${loans.totals.totalRemaining.toFixed(1)}h</span>
                                    <small style="color: #888;">deuda pendiente</small>
                                </div>
                            </div>
                            <div style="margin-top: 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
                                <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                                    <span style="color: #ff9800; font-weight: 600;">${loans.totals.totalBorrowed.toFixed(1)}h</span>
                                    <small style="display: block; color: #888;">prestadas</small>
                                </div>
                                <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                                    <span style="color: #00e5a0; font-weight: 600;">${loans.totals.totalRepaid.toFixed(1)}h</span>
                                    <small style="display: block; color: #888;">devueltas</small>
                                </div>
                                <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                                    <span style="color: #667eea; font-weight: 600;">${loans.activeLoans?.length || 0}</span>
                                    <small style="display: block; color: #888;">préstamos</small>
                                </div>
                            </div>
                            ${loans.isAtWarningLevel ? `
                                <div style="margin-top: 10px; background: rgba(255,82,82,0.2); padding: 8px 12px; border-radius: 6px; color: #ff5252; font-size: 0.85rem;">
                                    <i class="fas fa-exclamation-triangle"></i> Estás cerca del límite de deuda permitido
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    ${health.recommendations?.length ? `
                        <div style="background: rgba(255,193,7,0.1); border: 1px solid rgba(255,193,7,0.3); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                            <h6 style="color: #ffc107; margin: 0 0 10px;"><i class="fas fa-lightbulb"></i> Recomendaciones</h6>
                            <ul style="margin: 0; padding-left: 20px; color: #ccc;">${health.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
                        </div>
                    ` : ''}

                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden;">
                        <div style="background: rgba(0,0,0,0.2); padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <h6 style="margin: 0; color: #fff;"><i class="fas fa-history"></i> Últimos Movimientos</h6>
                        </div>
                        <div style="max-height: 250px; overflow-y: auto;">
                            ${transactions.length ? `
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead><tr style="background: rgba(0,0,0,0.2); color: #888; font-size: 0.85rem;">
                                        <th style="padding: 10px; text-align: left;">Fecha</th>
                                        <th style="padding: 10px; text-align: left;">Tipo</th>
                                        <th style="padding: 10px; text-align: right;">Horas</th>
                                    </tr></thead>
                                    <tbody>${transactions.slice(0, 10).map(tx => `
                                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                            <td style="padding: 10px; color: #ccc;">${new Date(tx.transaction_date || tx.created_at).toLocaleDateString('es-AR')}</td>
                                            <td style="padding: 10px;">
                                                <span style="background: ${tx.transaction_type === 'accrual' ? 'rgba(0,200,150,0.2)' : 'rgba(255,152,0,0.2)'}; color: ${tx.transaction_type === 'accrual' ? '#00e5a0' : '#ffb74d'}; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem;">
                                                    <i class="fas fa-${tx.transaction_type === 'accrual' ? 'plus' : 'minus'}"></i> ${tx.transaction_type === 'accrual' ? 'Acumulación' : tx.transaction_type === 'redemption' ? 'Canje' : 'Uso'}
                                                </span>
                                            </td>
                                            <td style="padding: 10px; text-align: right; color: ${(tx.hours_amount || tx.hours_final) >= 0 ? '#00e5a0' : '#ff5252'}; font-weight: 600;">
                                                ${(tx.hours_amount || tx.hours_final) >= 0 ? '+' : ''}${((tx.hours_amount || tx.hours_final) || 0).toFixed(1)}h
                                            </td>
                                        </tr>
                                    `).join('')}</tbody>
                                </table>
                            ` : '<div style="text-align: center; padding: 40px; color: #888;"><i class="fas fa-inbox fa-2x"></i><p>Sin movimientos</p></div>'}
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('Error:', error);
                content.innerHTML = `<div style="text-align: center; padding: 40px; color: #ff5252;"><i class="fas fa-exclamation-triangle fa-3x"></i><p>Error al cargar datos</p></div>`;
            }
        }

        async function renderRedeemTab(content) {
            try {
                // Cargar resumen de canje
                const response = await fetch('/api/hour-bank/redemption/summary', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = response.ok ? await response.json() : { summary: { balance: { available: 0, pending: 0, maxPerEvent: 8 } } };
                redemptionSummary = data.summary || { balance: { available: 0, pending: 0, maxPerEvent: 8 } };

                // Cargar estado de préstamos si no está cargado
                if (!loanStatus) {
                    try {
                        const loanResponse = await fetch('/api/hour-bank/loans/my-status', {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (loanResponse.ok) {
                            loanStatus = await loanResponse.json();
                        }
                    } catch (e) { }
                }

                const balance = redemptionSummary.balance || {};
                const loans = loanStatus?.loanStatus || {};
                const canLoan = loans.limits?.maxLoanHours > 0 && loans.availableToLoan > 0;
                const minDate = new Date();
                minDate.setDate(minDate.getDate() + 1); // Mínimo mañana

                content.innerHTML = `
                    <div style="background: rgba(102,126,234,0.1); border: 1px solid rgba(102,126,234,0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                            <div>
                                <h4 style="margin: 0; color: #667eea;"><i class="fas fa-exchange-alt"></i> Solicitar Canje de Horas</h4>
                                <p style="margin: 5px 0 0; color: #888; font-size: 0.9rem;">Solicita usar horas de tu banco para salir temprano</p>
                            </div>
                            <div style="text-align: right;">
                                <span style="display: block; color: #00e5a0; font-size: 1.4rem; font-weight: 700;">${(balance.available || 0).toFixed(1)}h</span>
                                <small style="color: #888;">disponibles</small>
                                ${balance.pending > 0 ? `<span style="display: block; color: #ffc107; font-size: 0.85rem;">(${balance.pending.toFixed(1)}h pendientes)</span>` : ''}
                            </div>
                        </div>
                        ${canLoan ? `
                            <div style="margin-top: 15px; background: rgba(255,152,0,0.15); border: 1px solid rgba(255,152,0,0.3); border-radius: 8px; padding: 12px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <i class="fas fa-hand-holding-usd" style="color: #ff9800;"></i>
                                    <div>
                                        <span style="color: #ff9800; font-weight: 600;">Préstamo disponible: ${loans.availableToLoan.toFixed(1)}h</span>
                                        <p style="margin: 3px 0 0; color: #ccc; font-size: 0.85rem;">
                                            Puedes solicitar más horas de las que tienes (se descontará de horas extra futuras)
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <form id="redemptionForm" style="display: grid; gap: 20px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <label style="display: block; color: #ccc; margin-bottom: 8px; font-size: 0.9rem;">
                                    <i class="fas fa-clock"></i> Horas a canjear *
                                </label>
                                <input type="number" id="hoursRequested" name="hoursRequested" min="0.5" max="${balance.maxPerEvent || 8}" step="0.5" required
                                    style="width: 100%; padding: 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(0,0,0,0.3); color: #fff; font-size: 1rem;"
                                    placeholder="Ej: 2.5">
                                <small style="color: #888; margin-top: 4px; display: block;">Máximo: ${balance.maxPerEvent || 8}h por solicitud</small>
                            </div>
                            <div>
                                <label style="display: block; color: #ccc; margin-bottom: 8px; font-size: 0.9rem;">
                                    <i class="fas fa-calendar"></i> Fecha a utilizar *
                                </label>
                                <input type="date" id="scheduledDate" name="scheduledDate" min="${minDate.toISOString().split('T')[0]}" required
                                    style="width: 100%; padding: 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(0,0,0,0.3); color: #fff; font-size: 1rem;">
                            </div>
                        </div>

                        <div>
                            <label style="display: block; color: #ccc; margin-bottom: 8px; font-size: 0.9rem;">
                                <i class="fas fa-sign-out-alt"></i> Tipo de canje
                            </label>
                            <select id="redemptionType" name="redemptionType"
                                style="width: 100%; padding: 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(0,0,0,0.3); color: #fff; font-size: 1rem;">
                                <option value="early_departure">🚪 Salida anticipada (salir más temprano)</option>
                                <option value="late_arrival">⏰ Entrada tardía (llegar más tarde)</option>
                                <option value="full_day">📅 Día completo (todo el día)</option>
                            </select>
                        </div>

                        <div>
                            <label style="display: block; color: #ccc; margin-bottom: 8px; font-size: 0.9rem;">
                                <i class="fas fa-comment"></i> Motivo (opcional)
                            </label>
                            <textarea id="reason" name="reason" rows="2" placeholder="Ej: Turno médico, trámite personal..."
                                style="width: 100%; padding: 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(0,0,0,0.3); color: #fff; font-size: 1rem; resize: vertical;"></textarea>
                        </div>

                        <div id="loanJustificationDiv" style="display: none;">
                            <label style="display: block; color: #ff9800; margin-bottom: 8px; font-size: 0.9rem;">
                                <i class="fas fa-hand-holding-usd"></i> Justificación del préstamo (requerido) *
                            </label>
                            <textarea id="loanJustification" name="loanJustification" rows="2" placeholder="Explica por qué necesitas un préstamo de horas..."
                                style="width: 100%; padding: 12px; border: 1px solid rgba(255,152,0,0.4); border-radius: 8px; background: rgba(255,152,0,0.1); color: #fff; font-size: 1rem; resize: vertical;"></textarea>
                            <small style="color: #ff9800; margin-top: 4px; display: block;">
                                <i class="fas fa-info-circle"></i> Estás solicitando más horas de las disponibles. Las horas prestadas se descontarán de tus futuras horas extra.
                            </small>
                        </div>

                        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px;">
                            <button type="submit" id="btnSubmitRedemption" style="
                                background: linear-gradient(135deg, #00897b, #004d40);
                                color: white;
                                border: none;
                                padding: 12px 30px;
                                border-radius: 8px;
                                font-weight: 600;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            "><i class="fas fa-paper-plane"></i> Enviar Solicitud</button>
                        </div>
                    </form>

                    <div id="redemptionResult" style="margin-top: 20px;"></div>

                    ${redemptionSummary.upcomingRedemptions?.length ? `
                        <div style="margin-top: 25px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden;">
                            <div style="background: rgba(0,0,0,0.2); padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <h6 style="margin: 0; color: #fff;"><i class="fas fa-calendar-check"></i> Próximos Canjes Programados</h6>
                            </div>
                            <div style="padding: 15px;">
                                ${redemptionSummary.upcomingRedemptions.map(r => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(0,200,150,0.1); border-radius: 8px; margin-bottom: 8px;">
                                        <span style="color: #ccc;"><i class="fas fa-calendar"></i> ${new Date(r.scheduled_date).toLocaleDateString('es-AR')}</span>
                                        <span style="color: #00e5a0; font-weight: 600;">${r.hours_approved}h</span>
                                        <span style="color: #888; font-size: 0.85rem;"><i class="fas fa-sign-out-alt"></i> Salida: ${r.expected_checkout_time || '--:--'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                `;

                // Mostrar/ocultar campo de justificación de préstamo según horas solicitadas
                const hoursInput = document.getElementById('hoursRequested');
                const loanJustDiv = document.getElementById('loanJustificationDiv');
                const availableHours = balance.available || 0;

                hoursInput.addEventListener('input', () => {
                    const requested = parseFloat(hoursInput.value) || 0;
                    if (requested > availableHours && canLoan) {
                        loanJustDiv.style.display = 'block';
                        document.getElementById('loanJustification').required = true;
                    } else {
                        loanJustDiv.style.display = 'none';
                        document.getElementById('loanJustification').required = false;
                    }
                });

                // Setup form submission
                document.getElementById('redemptionForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btn = document.getElementById('btnSubmitRedemption');
                    const resultDiv = document.getElementById('redemptionResult');

                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

                    try {
                        const hoursRequested = parseFloat(document.getElementById('hoursRequested').value);
                        const isLoanRequest = hoursRequested > availableHours;

                        const formData = {
                            hoursRequested,
                            scheduledDate: document.getElementById('scheduledDate').value,
                            redemptionType: document.getElementById('redemptionType').value,
                            reason: document.getElementById('reason').value
                        };

                        // Agregar justificación si es préstamo
                        if (isLoanRequest) {
                            formData.loanJustification = document.getElementById('loanJustification').value;
                        }

                        const response = await fetch('/api/hour-bank/redemption', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(formData)
                        });

                        const result = await response.json();

                        if (result.success) {
                            let successMessage = result.message;
                            let loanInfo = '';
                            if (result.isLoan && result.loanDetails) {
                                loanInfo = `
                                    <div style="margin-top: 15px; background: rgba(255,152,0,0.15); padding: 10px 15px; border-radius: 8px;">
                                        <p style="color: #ff9800; margin: 0; font-size: 0.9rem;">
                                            <i class="fas fa-hand-holding-usd"></i> Préstamo: ${result.loanDetails.loanAmount}h ·
                                            Deuda total: ${result.loanDetails.totalDebtAfter}h
                                        </p>
                                    </div>
                                `;
                            }
                            resultDiv.innerHTML = `
                                <div style="background: rgba(0,200,150,0.1); border: 1px solid rgba(0,200,150,0.3); border-radius: 8px; padding: 20px; text-align: center;">
                                    <i class="fas fa-check-circle fa-3x" style="color: #00e5a0; margin-bottom: 15px;"></i>
                                    <h4 style="color: #00e5a0; margin: 0 0 10px;">¡Solicitud Enviada!</h4>
                                    <p style="color: #ccc; margin: 0;">${successMessage}</p>
                                    ${result.supervisor ? `<p style="color: #888; font-size: 0.9rem; margin-top: 10px;">Supervisor: ${result.supervisor.name}</p>` : ''}
                                    ${loanInfo}
                                </div>
                            `;
                            e.target.reset();
                            loanJustDiv.style.display = 'none';
                            redemptionSummary = null; // Force refresh
                            loanStatus = null; // Force refresh loan status
                        } else {
                            // Mostrar info de préstamo si el error es por saldo insuficiente
                            let loanSuggestion = '';
                            if (result.errorCode === 'INSUFFICIENT_BALANCE' && canLoan) {
                                loanSuggestion = `
                                    <div style="margin-top: 10px; background: rgba(255,152,0,0.1); padding: 10px; border-radius: 6px; color: #ff9800; font-size: 0.85rem;">
                                        <i class="fas fa-lightbulb"></i> Tip: Puedes solicitar un préstamo de horas si necesitas más de lo disponible.
                                    </div>
                                `;
                            }
                            resultDiv.innerHTML = `
                                <div style="background: rgba(255,82,82,0.1); border: 1px solid rgba(255,82,82,0.3); border-radius: 8px; padding: 20px;">
                                    <h5 style="color: #ff5252; margin: 0 0 10px;"><i class="fas fa-exclamation-triangle"></i> No se pudo crear la solicitud</h5>
                                    <p style="color: #ccc; margin: 0;">${result.error}</p>
                                    ${result.details ? `<p style="color: #888; font-size: 0.85rem; margin-top: 10px;">Balance: ${result.details.currentBalance}h | Disponible: ${result.details.available}h</p>` : ''}
                                    ${loanSuggestion}
                                </div>
                            `;
                        }
                    } catch (error) {
                        resultDiv.innerHTML = `<div style="background: rgba(255,82,82,0.1); border: 1px solid rgba(255,82,82,0.3); border-radius: 8px; padding: 15px; color: #ff5252;"><i class="fas fa-exclamation-triangle"></i> Error: ${error.message}</div>`;
                    } finally {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Solicitud';
                    }
                });
            } catch (error) {
                console.error('Error:', error);
                content.innerHTML = `<div style="text-align: center; padding: 40px; color: #ff5252;"><i class="fas fa-exclamation-triangle fa-3x"></i><p>Error al cargar formulario</p></div>`;
            }
        }

        async function renderRequestsTab(content) {
            try {
                const response = await fetch('/api/hour-bank/redemption/my-requests', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = response.ok ? await response.json() : { requests: [] };
                const requests = data.requests || [];

                const statusLabels = {
                    pending_supervisor: { label: 'Pendiente Supervisor', color: '#ffc107', icon: 'clock' },
                    approved_supervisor: { label: 'Aprobado por Supervisor', color: '#64b5f6', icon: 'user-check' },
                    pending_hr: { label: 'Pendiente RRHH', color: '#ffc107', icon: 'clock' },
                    approved: { label: 'Aprobado', color: '#00e5a0', icon: 'check-circle' },
                    rejected_supervisor: { label: 'Rechazado', color: '#ff5252', icon: 'times-circle' },
                    rejected_hr: { label: 'Rechazado por RRHH', color: '#ff5252', icon: 'times-circle' },
                    cancelled: { label: 'Cancelado', color: '#888', icon: 'ban' },
                    executed: { label: 'Ejecutado', color: '#00e5a0', icon: 'check-double' }
                };

                content.innerHTML = `
                    <div style="background: rgba(102,126,234,0.1); border: 1px solid rgba(102,126,234,0.3); border-radius: 12px; padding: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h5 style="margin: 0; color: #667eea;"><i class="fas fa-list"></i> Mis Solicitudes de Canje</h5>
                            <small style="color: #888;">Historial de solicitudes enviadas</small>
                        </div>
                        <span style="background: rgba(255,255,255,0.1); padding: 8px 15px; border-radius: 20px; color: #ccc;">${requests.length} solicitudes</span>
                    </div>

                    ${requests.length ? `
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${requests.map(req => {
                                const status = statusLabels[req.status] || { label: req.status, color: '#888', icon: 'question' };
                                const canCancel = ['pending_supervisor', 'approved_supervisor'].includes(req.status);
                                return `
                                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 15px;">
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                                            <div>
                                                <span style="background: ${status.color}22; color: ${status.color}; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">
                                                    <i class="fas fa-${status.icon}"></i> ${status.label}
                                                </span>
                                                <div style="margin-top: 10px;">
                                                    <span style="color: #fff; font-weight: 600; font-size: 1.1rem;">${req.hours_requested}h</span>
                                                    <span style="color: #888; margin-left: 10px;"><i class="fas fa-calendar"></i> ${new Date(req.scheduled_date).toLocaleDateString('es-AR')}</span>
                                                </div>
                                                ${req.reason ? `<p style="color: #888; font-size: 0.85rem; margin: 8px 0 0;"><i class="fas fa-comment"></i> ${req.reason}</p>` : ''}
                                            </div>
                                            <div style="text-align: right;">
                                                <small style="color: #666;">Solicitado: ${new Date(req.created_at).toLocaleDateString('es-AR')}</small>
                                                ${canCancel ? `
                                                    <button onclick="window.MiEspacio.cancelRedemption('${req.id}')" style="
                                                        background: rgba(255,82,82,0.2);
                                                        color: #ff5252;
                                                        border: none;
                                                        padding: 6px 12px;
                                                        border-radius: 6px;
                                                        cursor: pointer;
                                                        font-size: 0.8rem;
                                                        margin-top: 8px;
                                                        display: block;
                                                    "><i class="fas fa-times"></i> Cancelar</button>
                                                ` : ''}
                                            </div>
                                        </div>
                                        ${req.supervisor_comments || req.hr_comments ? `
                                            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
                                                ${req.supervisor_comments ? `<p style="color: #888; font-size: 0.85rem; margin: 0;"><i class="fas fa-user-tie"></i> Supervisor: ${req.supervisor_comments}</p>` : ''}
                                                ${req.hr_comments ? `<p style="color: #888; font-size: 0.85rem; margin: 5px 0 0;"><i class="fas fa-user-shield"></i> RRHH: ${req.hr_comments}</p>` : ''}
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 60px; color: #888;">
                            <i class="fas fa-inbox fa-4x" style="opacity: 0.3; margin-bottom: 20px;"></i>
                            <h4>No tienes solicitudes</h4>
                            <p>Ve a la pestaña "Solicitar Canje" para crear tu primera solicitud</p>
                        </div>
                    `}
                `;
            } catch (error) {
                console.error('Error:', error);
                content.innerHTML = `<div style="text-align: center; padding: 40px; color: #ff5252;"><i class="fas fa-exclamation-triangle fa-3x"></i><p>Error al cargar solicitudes</p></div>`;
            }
        }

        async function renderStatementTab(content) {
            try {
                const response = await fetch('/api/hour-bank/account-statement', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = response.ok ? await response.json() : { statement: { movements: [], totals: {}, finalBalance: 0 } };
                const statement = data.statement || { movements: [], totals: {}, finalBalance: 0 };

                content.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                        <div style="background: rgba(0,200,150,0.1); border: 1px solid rgba(0,200,150,0.3); border-radius: 12px; padding: 20px; text-align: center;">
                            <i class="fas fa-plus-circle fa-2x" style="color: #00e5a0; margin-bottom: 10px;"></i>
                            <h3 style="color: #00e5a0; margin: 0;">+${(statement.totals?.totalCredits || 0).toFixed(1)}h</h3>
                            <small style="color: #888;">Total Créditos</small>
                        </div>
                        <div style="background: rgba(255,152,0,0.1); border: 1px solid rgba(255,152,0,0.3); border-radius: 12px; padding: 20px; text-align: center;">
                            <i class="fas fa-minus-circle fa-2x" style="color: #ffb74d; margin-bottom: 10px;"></i>
                            <h3 style="color: #ffb74d; margin: 0;">-${(statement.totals?.totalDebits || 0).toFixed(1)}h</h3>
                            <small style="color: #888;">Total Débitos</small>
                        </div>
                        <div style="background: rgba(102,126,234,0.1); border: 1px solid rgba(102,126,234,0.3); border-radius: 12px; padding: 20px; text-align: center;">
                            <i class="fas fa-balance-scale fa-2x" style="color: #667eea; margin-bottom: 10px;"></i>
                            <h3 style="color: #667eea; margin: 0;">${(statement.finalBalance || 0).toFixed(1)}h</h3>
                            <small style="color: #888;">Saldo Final</small>
                        </div>
                    </div>

                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden;">
                        <div style="background: rgba(0,0,0,0.2); padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                            <h6 style="margin: 0; color: #fff;"><i class="fas fa-file-invoice"></i> Estado de Cuenta</h6>
                            <span style="color: #888; font-size: 0.85rem;">${statement.movements?.length || 0} movimientos</span>
                        </div>
                        <div style="max-height: 400px; overflow-y: auto;">
                            ${statement.movements?.length ? `
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background: rgba(0,0,0,0.2); color: #888; font-size: 0.85rem; position: sticky; top: 0;">
                                            <th style="padding: 10px; text-align: left;">Fecha</th>
                                            <th style="padding: 10px; text-align: left;">Concepto</th>
                                            <th style="padding: 10px; text-align: right;">Débito</th>
                                            <th style="padding: 10px; text-align: right;">Crédito</th>
                                            <th style="padding: 10px; text-align: right;">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${statement.movements.map(m => `
                                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                <td style="padding: 10px; color: #ccc;">${new Date(m.tx_date || m.movement_date).toLocaleDateString('es-AR')}</td>
                                                <td style="padding: 10px; color: #fff;">${m.tx_desc || m.description}</td>
                                                <td style="padding: 10px; text-align: right; color: #ff5252;">${parseFloat(m.hours_debit || 0) > 0 ? '-' + parseFloat(m.hours_debit).toFixed(1) + 'h' : ''}</td>
                                                <td style="padding: 10px; text-align: right; color: #00e5a0;">${parseFloat(m.hours_credit || 0) > 0 ? '+' + parseFloat(m.hours_credit).toFixed(1) + 'h' : ''}</td>
                                                <td style="padding: 10px; text-align: right; color: #fff; font-weight: 600;">${parseFloat(m.balance_after || 0).toFixed(1)}h</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : `
                                <div style="text-align: center; padding: 60px; color: #888;">
                                    <i class="fas fa-file-invoice fa-4x" style="opacity: 0.3; margin-bottom: 20px;"></i>
                                    <h4>Sin movimientos en el periodo</h4>
                                </div>
                            `}
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('Error:', error);
                content.innerHTML = `<div style="text-align: center; padding: 40px; color: #ff5252;"><i class="fas fa-exclamation-triangle fa-3x"></i><p>Error al cargar estado de cuenta</p></div>`;
            }
        }

        // Cargar datos iniciales
        renderTabContent();
    }

    // Función para cancelar solicitud de canje
    async function cancelRedemption(requestId) {
        if (!confirm('¿Estás seguro de cancelar esta solicitud?')) return;

        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        try {
            const response = await fetch(`/api/hour-bank/redemption/${requestId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                alert('Solicitud cancelada exitosamente');
                openHourBank(); // Refresh modal
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('Error al cancelar: ' + error.message);
        }
    }

    /**
     * Renderizar el dashboard
     */
    function render() {
        const container = document.getElementById('mainContent');
        if (!container) {
            console.error('❌ [MI-ESPACIO] Container mainContent no encontrado');
            return;
        }

        // Limpiar botón de volver si existe
        const oldBtn = document.getElementById('btnBackToMiEspacio');
        if (oldBtn) oldBtn.remove();

        const user = state.user;
        const company = state.company;
        const userName = user.firstName || user.usuario || user.name || 'Empleado';
        const userEmail = user.email || '';
        const companyName = company.name || company.nombre || 'Mi Empresa';

        container.innerHTML = `
            <div class="mi-espacio-dashboard">

                <!-- Header del Usuario -->
                <div class="mi-espacio-header">
                    <div class="mi-espacio-user-info">
                        <div class="mi-espacio-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="mi-espacio-greeting">
                            <h2>¡Hola, ${userName}!</h2>
                            <p><i class="fas fa-building"></i>${companyName}</p>
                            <p><i class="fas fa-envelope"></i>${userEmail}</p>
                        </div>
                    </div>
                    <div class="mi-espacio-stats">
                        <div class="mi-espacio-stat">
                            <div class="mi-espacio-stat-value" id="stat-documents">
                                <i class="fas fa-spinner fa-spin" style="font-size: 14px;"></i>
                            </div>
                            <div class="mi-espacio-stat-label">Documentos</div>
                        </div>
                        <div class="mi-espacio-stat">
                            <div class="mi-espacio-stat-value" id="stat-notifications">
                                <i class="fas fa-spinner fa-spin" style="font-size: 14px;"></i>
                            </div>
                            <div class="mi-espacio-stat-label">Notificaciones</div>
                        </div>
                        <div class="mi-espacio-stat">
                            <div class="mi-espacio-stat-value" id="stat-vacation">
                                <i class="fas fa-spinner fa-spin" style="font-size: 14px;"></i>
                            </div>
                            <div class="mi-espacio-stat-label">Días Vacaciones</div>
                        </div>
                        <div class="mi-espacio-stat" data-module="hour-bank" style="border-left: 2px solid rgba(0,229,160,0.3);">
                            <div class="mi-espacio-stat-value" id="stat-hourbank" style="color: #00e5a0;">
                                <i class="fas fa-spinner fa-spin" style="font-size: 14px;"></i>
                            </div>
                            <div class="mi-espacio-stat-label" style="color: #00e5a0;">Banco Horas</div>
                        </div>
                    </div>
                </div>

                <!-- Sección de Módulos -->
                <div class="mi-espacio-section-title">
                    <i class="fas fa-th-large"></i>
                    <span>Mis Módulos</span>
                </div>

                <div class="mi-espacio-modules-grid">

                    <!-- Card: Mis Documentos -->
                    <div class="mi-espacio-module-card"
                         style="--card-accent: #3498db; --card-glow: rgba(52, 152, 219, 0.3);"
                         onclick="window.MiEspacio.openSubmodule('dms-dashboard', 'Mis Documentos')">
                        <span class="badge-core">CORE</span>
                        <div class="module-icon"><i class="fas fa-folder-open"></i></div>
                        <h4>Mis Documentos</h4>
                        <p>Accede a tus documentos personales, sube documentación solicitada y revisa vencimientos.</p>
                        <div class="module-actions">
                            <span class="action-tag"><i class="fas fa-file"></i> Ver</span>
                            <span class="action-tag"><i class="fas fa-upload"></i> Subir</span>
                            <span class="action-tag"><i class="fas fa-clock"></i> Vencimientos</span>
                        </div>
                    </div>

                    <!-- Card: Mi Asistencia -->
                    <div class="mi-espacio-module-card"
                         style="--card-accent: #27ae60; --card-glow: rgba(39, 174, 96, 0.3);"
                         onclick="window.MiEspacio.openSubmodule('attendance', 'Mi Asistencia')">
                        <div class="module-icon"><i class="fas fa-clipboard-check"></i></div>
                        <h4>Mi Asistencia</h4>
                        <p>Consulta tu historial de asistencia, horarios asignados y marcaciones realizadas.</p>
                        <div class="module-actions">
                            <span class="action-tag"><i class="fas fa-history"></i> Historial</span>
                            <span class="action-tag"><i class="fas fa-calendar-alt"></i> Horarios</span>
                        </div>
                    </div>

                    <!-- Card: Mis Vacaciones -->
                    <div class="mi-espacio-module-card"
                         style="--card-accent: #f39c12; --card-glow: rgba(243, 156, 18, 0.3);"
                         onclick="window.MiEspacio.openSubmodule('vacation-management', 'Mis Vacaciones')">
                        <div class="module-icon"><i class="fas fa-umbrella-beach"></i></div>
                        <h4>Mis Vacaciones</h4>
                        <p>Solicita vacaciones, consulta días disponibles y revisa el estado de tus solicitudes.</p>
                        <div class="module-actions">
                            <span class="action-tag"><i class="fas fa-paper-plane"></i> Solicitar</span>
                            <span class="action-tag"><i class="fas fa-chart-pie"></i> Disponibles</span>
                        </div>
                    </div>

                    <!-- Card: Mis Notificaciones -->
                    <div class="mi-espacio-module-card"
                         style="--card-accent: #9b59b6; --card-glow: rgba(155, 89, 182, 0.3);"
                         onclick="window.MiEspacio.openSubmodule('inbox', 'Mis Notificaciones')">
                        <div class="module-icon"><i class="fas fa-bell"></i></div>
                        <h4>Mis Notificaciones</h4>
                        <p>Revisa tus notificaciones, mensajes de RRHH y comunicados importantes de la empresa.</p>
                        <div class="module-actions">
                            <span class="action-tag"><i class="fas fa-inbox"></i> Bandeja</span>
                            <span class="action-tag"><i class="fas fa-bullhorn"></i> Comunicados</span>
                        </div>
                    </div>

                    <!-- Card: Mi Perfil 360° -->
                    <div class="mi-espacio-module-card"
                         style="--card-accent: #e74c3c; --card-glow: rgba(231, 76, 60, 0.3);"
                         onclick="window.MiEspacio.openSubmodule('employee-360', 'Mi Perfil 360°')">
                        <div class="module-icon"><i class="fas fa-id-card"></i></div>
                        <h4>Mi Perfil 360°</h4>
                        <p>Vista completa de tu información personal, evaluaciones de desempeño y datos laborales.</p>
                        <div class="module-actions">
                            <span class="action-tag"><i class="fas fa-user-cog"></i> Datos</span>
                            <span class="action-tag"><i class="fas fa-chart-line"></i> Evaluaciones</span>
                        </div>
                    </div>

                    <!-- Card: Mis Procedimientos -->
                    <div class="mi-espacio-module-card"
                         style="--card-accent: #1abc9c; --card-glow: rgba(26, 188, 156, 0.3);"
                         onclick="window.MiEspacio.openSubmodule('my-procedures', 'Mis Procedimientos')">
                        <div class="module-icon"><i class="fas fa-book"></i></div>
                        <h4>Mis Procedimientos</h4>
                        <p>Consulta los instructivos y procedimientos asignados a tu rol. Da acuse de recibo de nuevos documentos.</p>
                        <div class="module-actions">
                            <span class="action-tag"><i class="fas fa-file-alt"></i> Instructivos</span>
                            <span class="action-tag"><i class="fas fa-check-circle"></i> Acuses</span>
                        </div>
                    </div>

                    <!-- Card: Mi Banco de Horas (módulo opcional) -->
                    <div class="mi-espacio-module-card" data-module="hour-bank"
                         style="--card-accent: #00897b; --card-glow: rgba(0, 137, 123, 0.3);"
                         onclick="window.MiEspacio.openHourBank()">
                        <span class="badge-optional" style="background: linear-gradient(135deg, #00897b, #00695c);">OPCIONAL</span>
                        <div class="module-icon"><i class="fas fa-piggy-bank"></i></div>
                        <h4>Mi Banco de Horas</h4>
                        <p>Consulta tu balance de horas extras acumuladas, solicita devolución y revisa el historial de movimientos.</p>
                        <div class="module-actions">
                            <span class="action-tag"><i class="fas fa-wallet"></i> Balance</span>
                            <span class="action-tag"><i class="fas fa-exchange-alt"></i> Movimientos</span>
                        </div>
                    </div>

                </div>

                <!-- Accesos Rápidos -->
                <div class="mi-espacio-section-title">
                    <i class="fas fa-bolt"></i>
                    <span>Accesos Rápidos</span>
                </div>

                <div class="mi-espacio-quick-access">
                    <div class="mi-espacio-quick-buttons">
                        <button class="mi-espacio-quick-btn btn-documents"
                                onclick="window.MiEspacio.openSubmodule('dms-dashboard', 'Subir Documento')">
                            <i class="fas fa-cloud-upload-alt"></i>
                            Subir Documento
                        </button>
                        <button class="mi-espacio-quick-btn btn-vacation"
                                onclick="window.MiEspacio.openSubmodule('vacation-management', 'Solicitar Vacaciones')">
                            <i class="fas fa-plane-departure"></i>
                            Solicitar Vacaciones
                        </button>
                        <button class="mi-espacio-quick-btn btn-notifications"
                                onclick="window.MiEspacio.openSubmodule('inbox', 'Ver Notificaciones')">
                            <i class="fas fa-bell"></i>
                            Ver Notificaciones
                        </button>
                    </div>
                </div>

            </div>
        `;

        console.log('✅ [MI-ESPACIO] Dashboard dark theme renderizado');
    }

    // Función para mostrar contenido (compatible con legacy)
    function showMiEspacioContent() {
        init();
    }

    // Registrar módulo
    if (!window.Modules) window.Modules = {};
    window.Modules[MODULE_ID] = { init, render, openSubmodule, openHourBank, cancelRedemption };

    // Exponer globalmente
    window.showMiEspacioContent = showMiEspacioContent;
    window.MiEspacio = { init, render, openSubmodule, openHourBank, cancelRedemption };

    console.log('📦 [MI-ESPACIO] Módulo dark theme registrado');
})();
