'use strict';

/**
 * MI ESPACIO - Módulo CORE para todos los empleados
 *
 * Este módulo es CORE y se carga para TODAS las empresas.
 * Según el rol del usuario, muestra acceso a:
 * - Mis Documentos (DMS)
 * - Mi Asistencia
 * - Mis Vacaciones
 * - Mis Notificaciones
 * - Mi Perfil 360°
 */

(function() {
    const MODULE_ID = 'mi-espacio';

    // Estado del módulo
    const state = {
        user: null,
        company: null,
        initialized: false
    };

    /**
     * Inicializar el módulo
     */
    function init() {
        console.log('👤 [MI-ESPACIO] Inicializando módulo...');

        // Obtener usuario y empresa actual
        state.user = window.currentUser || {};
        state.company = window.currentCompany || window.selectedCompany || {};

        render();
        state.initialized = true;

        console.log('✅ [MI-ESPACIO] Módulo inicializado');
    }

    /**
     * Abrir submódulo con tracking para botón "Volver"
     */
    function openSubmodule(moduleKey, moduleName) {
        console.log('📂 [MI-ESPACIO] Abriendo submódulo:', moduleKey);

        // Marcar que venimos de Mi Espacio
        window.miEspacioReturnTo = true;

        // Llamar a showModuleContent
        if (typeof window.showModuleContent === 'function') {
            window.showModuleContent(moduleKey, moduleName);

            // Agregar botón de volver después de un pequeño delay
            setTimeout(() => {
                addBackButton();
            }, 800);
        }
    }

    /**
     * Agregar botón "Volver a Mi Espacio" en el módulo actual
     */
    function addBackButton() {
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;

        // Verificar si ya existe el botón
        if (document.getElementById('btnBackToMiEspacio')) return;

        // Crear botón flotante
        const backBtn = document.createElement('button');
        backBtn.id = 'btnBackToMiEspacio';
        backBtn.innerHTML = '← Volver a Mi Espacio';
        backBtn.style.cssText = `
            position: fixed;
            top: 80px;
            left: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            z-index: 1000;
            transition: all 0.3s ease;
        `;
        backBtn.onmouseover = () => {
            backBtn.style.transform = 'scale(1.05)';
            backBtn.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
        };
        backBtn.onmouseout = () => {
            backBtn.style.transform = 'scale(1)';
            backBtn.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
        };
        backBtn.onclick = () => {
            window.miEspacioReturnTo = false;
            backBtn.remove();
            init(); // Volver a renderizar Mi Espacio
        };

        document.body.appendChild(backBtn);
        console.log('✅ [MI-ESPACIO] Botón "Volver" agregado');
    }

    /**
     * Renderizar el dashboard del empleado
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
            <div class="mi-espacio-dashboard" style="padding: 30px; min-height: calc(100vh - 120px); background: #f8f9fa;">

                <!-- Header del empleado -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; padding: 30px; margin-bottom: 30px; color: white; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);">
                    <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 2.5rem;">
                            <i class="fas fa-user-circle" style="font-size: 3rem;"></i>
                        </div>
                        <div style="flex: 1;">
                            <h2 style="margin: 0; font-size: 1.8rem;">¡Hola, ${userName}!</h2>
                            <p style="margin: 5px 0 0; opacity: 0.9;"><i class="fas fa-building"></i> ${companyName}</p>
                            <p style="margin: 5px 0 0; opacity: 0.8; font-size: 0.9rem;"><i class="fas fa-envelope"></i> ${userEmail}</p>
                        </div>
                    </div>
                </div>

                <!-- Módulos para empleados -->
                <h3 style="color: #2c3e50; margin-bottom: 25px; font-size: 1.4rem;"><i class="fas fa-th-large"></i> Mis Módulos</h3>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px;">

                    <!-- CARD: Mis Documentos (DMS) -->
                    <div class="employee-module-card" onclick="window.MiEspacio.openSubmodule('dms-dashboard', 'Mis Documentos')" style="
                        background: linear-gradient(145deg, #ffffff, #f8f9fa);
                        border-radius: 16px;
                        padding: 25px;
                        cursor: pointer;
                        border: 2px solid transparent;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                        transition: all 0.3s ease;
                        position: relative;
                    " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(52, 152, 219, 0.25)'; this.style.borderColor='#3498db';"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)'; this.style.borderColor='transparent';">
                        <div style="position: absolute; top: 0; right: 0; background: #3498db; color: white; padding: 5px 15px; font-size: 0.7rem; font-weight: bold; border-radius: 0 16px 0 12px;">
                            CORE
                        </div>
                        <div style="font-size: 3rem; margin-bottom: 15px; color: #3498db;"><i class="fas fa-folder-open"></i></div>
                        <h4 style="margin: 0 0 10px; color: #2c3e50; font-size: 1.3rem;">Mis Documentos</h4>
                        <p style="margin: 0; color: #7f8c8d; font-size: 0.9rem;">Accede a tus documentos personales, sube documentación solicitada y revisa vencimientos.</p>
                        <div style="margin-top: 15px; padding: 10px; background: rgba(52, 152, 219, 0.1); border-radius: 8px;">
                            <span style="color: #3498db; font-weight: 500; font-size: 0.85rem;"><i class="fas fa-file"></i> Ver • <i class="fas fa-upload"></i> Subir • <i class="fas fa-exclamation-triangle"></i> Vencimientos</span>
                        </div>
                    </div>

                    <!-- CARD: Mi Asistencia -->
                    <div class="employee-module-card" onclick="window.MiEspacio.openSubmodule('attendance', 'Mi Asistencia')" style="
                        background: linear-gradient(145deg, #ffffff, #f8f9fa);
                        border-radius: 16px;
                        padding: 25px;
                        cursor: pointer;
                        border: 2px solid transparent;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                        transition: all 0.3s ease;
                    " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(39, 174, 96, 0.25)'; this.style.borderColor='#27ae60';"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)'; this.style.borderColor='transparent';">
                        <div style="font-size: 3rem; margin-bottom: 15px; color: #27ae60;"><i class="fas fa-clipboard-check"></i></div>
                        <h4 style="margin: 0 0 10px; color: #2c3e50; font-size: 1.3rem;">Mi Asistencia</h4>
                        <p style="margin: 0; color: #7f8c8d; font-size: 0.9rem;">Consulta tu historial de asistencia, horarios y marcaciones.</p>
                        <div style="margin-top: 15px; padding: 10px; background: rgba(39, 174, 96, 0.1); border-radius: 8px;">
                            <span style="color: #27ae60; font-weight: 500; font-size: 0.85rem;"><i class="fas fa-clock"></i> Historial • <i class="fas fa-calendar-alt"></i> Horarios</span>
                        </div>
                    </div>

                    <!-- CARD: Mis Vacaciones -->
                    <div class="employee-module-card" onclick="window.MiEspacio.openSubmodule('vacation-management', 'Mis Vacaciones')" style="
                        background: linear-gradient(145deg, #ffffff, #f8f9fa);
                        border-radius: 16px;
                        padding: 25px;
                        cursor: pointer;
                        border: 2px solid transparent;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                        transition: all 0.3s ease;
                    " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(241, 196, 15, 0.25)'; this.style.borderColor='#f1c40f';"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)'; this.style.borderColor='transparent';">
                        <div style="font-size: 3rem; margin-bottom: 15px; color: #f39c12;"><i class="fas fa-umbrella-beach"></i></div>
                        <h4 style="margin: 0 0 10px; color: #2c3e50; font-size: 1.3rem;">Mis Vacaciones</h4>
                        <p style="margin: 0; color: #7f8c8d; font-size: 0.9rem;">Solicita vacaciones, consulta días disponibles y revisa el estado de tus solicitudes.</p>
                        <div style="margin-top: 15px; padding: 10px; background: rgba(241, 196, 15, 0.1); border-radius: 8px;">
                            <span style="color: #d68910; font-weight: 500; font-size: 0.85rem;"><i class="fas fa-paper-plane"></i> Solicitar • <i class="fas fa-chart-pie"></i> Días disponibles</span>
                        </div>
                    </div>

                    <!-- CARD: Notificaciones -->
                    <div class="employee-module-card" onclick="window.MiEspacio.openSubmodule('inbox', 'Mis Notificaciones')" style="
                        background: linear-gradient(145deg, #ffffff, #f8f9fa);
                        border-radius: 16px;
                        padding: 25px;
                        cursor: pointer;
                        border: 2px solid transparent;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                        transition: all 0.3s ease;
                    " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(155, 89, 182, 0.25)'; this.style.borderColor='#9b59b6';"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)'; this.style.borderColor='transparent';">
                        <div style="font-size: 3rem; margin-bottom: 15px; color: #9b59b6;"><i class="fas fa-bell"></i></div>
                        <h4 style="margin: 0 0 10px; color: #2c3e50; font-size: 1.3rem;">Mis Notificaciones</h4>
                        <p style="margin: 0; color: #7f8c8d; font-size: 0.9rem;">Revisa tus notificaciones, mensajes de RRHH y comunicados importantes.</p>
                        <div style="margin-top: 15px; padding: 10px; background: rgba(155, 89, 182, 0.1); border-radius: 8px;">
                            <span style="color: #9b59b6; font-weight: 500; font-size: 0.85rem;"><i class="fas fa-inbox"></i> Bandeja • <i class="fas fa-bullhorn"></i> Comunicados</span>
                        </div>
                    </div>

                    <!-- CARD: Mi Perfil -->
                    <div class="employee-module-card" onclick="window.MiEspacio.openSubmodule('employee-360', 'Mi Perfil')" style="
                        background: linear-gradient(145deg, #ffffff, #f8f9fa);
                        border-radius: 16px;
                        padding: 25px;
                        cursor: pointer;
                        border: 2px solid transparent;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                        transition: all 0.3s ease;
                    " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(52, 73, 94, 0.25)'; this.style.borderColor='#34495e';"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)'; this.style.borderColor='transparent';">
                        <div style="font-size: 3rem; margin-bottom: 15px; color: #34495e;"><i class="fas fa-id-card"></i></div>
                        <h4 style="margin: 0 0 10px; color: #2c3e50; font-size: 1.3rem;">Mi Perfil 360°</h4>
                        <p style="margin: 0; color: #7f8c8d; font-size: 0.9rem;">Vista completa de tu información personal, evaluaciones y datos laborales.</p>
                        <div style="margin-top: 15px; padding: 10px; background: rgba(52, 73, 94, 0.1); border-radius: 8px;">
                            <span style="color: #34495e; font-weight: 500; font-size: 0.85rem;"><i class="fas fa-user-cog"></i> Datos • <i class="fas fa-chart-line"></i> Evaluaciones</span>
                        </div>
                    </div>

                </div>

                <!-- Accesos rápidos -->
                <div style="margin-top: 40px; padding: 25px; background: white; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <h4 style="margin: 0 0 20px; color: #2c3e50;"><i class="fas fa-bolt"></i> Accesos Rápidos</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                        <button onclick="window.MiEspacio.openSubmodule('dms-dashboard', 'Subir Documento')" style="
                            background: #3498db; color: white; border: none; padding: 12px 20px; border-radius: 10px;
                            cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 8px;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">
                            <i class="fas fa-cloud-upload-alt"></i> Subir Documento
                        </button>
                        <button onclick="window.MiEspacio.openSubmodule('vacation-management', 'Solicitar Vacaciones')" style="
                            background: #f39c12; color: white; border: none; padding: 12px 20px; border-radius: 10px;
                            cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 8px;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.background='#d68910'" onmouseout="this.style.background='#f39c12'">
                            <i class="fas fa-plane-departure"></i> Solicitar Vacaciones
                        </button>
                        <button onclick="window.MiEspacio.openSubmodule('inbox', 'Ver Notificaciones')" style="
                            background: #9b59b6; color: white; border: none; padding: 12px 20px; border-radius: 10px;
                            cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 8px;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.background='#8e44ad'" onmouseout="this.style.background='#9b59b6'">
                            <i class="fas fa-bell"></i> Ver Notificaciones
                        </button>
                    </div>
                </div>
            </div>
        `;

        console.log('✅ [MI-ESPACIO] Dashboard renderizado');
    }

    // Función para mostrar contenido (compatible con legacy)
    function showMiEspacioContent() {
        init();
    }

    // Registrar módulo en el sistema
    if (!window.Modules) window.Modules = {};
    window.Modules[MODULE_ID] = {
        init,
        render,
        openSubmodule
    };

    // Exponer funciones globalmente
    window.showMiEspacioContent = showMiEspacioContent;
    window.MiEspacio = {
        init,
        render,
        openSubmodule
    };

    console.log('📦 [MI-ESPACIO] Módulo registrado');
})();
