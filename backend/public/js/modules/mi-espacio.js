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
        state.initialized = true;

        console.log('✅ [MI-ESPACIO] Módulo inicializado');
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
                            <div class="mi-espacio-stat-value">--</div>
                            <div class="mi-espacio-stat-label">Documentos</div>
                        </div>
                        <div class="mi-espacio-stat">
                            <div class="mi-espacio-stat-value">--</div>
                            <div class="mi-espacio-stat-label">Notificaciones</div>
                        </div>
                        <div class="mi-espacio-stat">
                            <div class="mi-espacio-stat-value">--</div>
                            <div class="mi-espacio-stat-label">Días Vacaciones</div>
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
    window.Modules[MODULE_ID] = { init, render, openSubmodule };

    // Exponer globalmente
    window.showMiEspacioContent = showMiEspacioContent;
    window.MiEspacio = { init, render, openSubmodule };

    console.log('📦 [MI-ESPACIO] Módulo dark theme registrado');
})();
