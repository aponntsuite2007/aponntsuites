/**
 * DASHBOARD BIOMÉTRICO - HUB CENTRAL
 * Módulo principal que integra todos los submódulos biométricos:
 * 1. Registro Biométrico de Empleados (Azure Face API)
 * 2. Consentimientos Biométricos
 * 3. Evaluación Biométrica
 */

console.log('🎭 [BIOMETRIC-DASHBOARD] Cargando Dashboard Biométrico...');

// Prevenir carga múltiple
if (window.BIOMETRIC_DASHBOARD_LOADED) {
    console.log('⚠️ [BIOMETRIC-DASHBOARD] Ya está cargado');
} else {
    window.BIOMETRIC_DASHBOARD_LOADED = true;
}

/**
 * Función principal que muestra el Dashboard Biométrico
 */
function showBiometricContent() {
    console.log('🎭 [BIOMETRIC-DASHBOARD] Mostrando contenido...');

    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        console.error('❌ [BIOMETRIC-DASHBOARD] No se encontró mainContent');
        return;
    }

    mainContent.innerHTML = `
        <div class="biometric-dashboard-container" style="padding: 20px;">
            <!-- HEADER -->
            <div class="dashboard-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                <h1 style="margin: 0 0 10px 0; font-size: 32px; display: flex; align-items: center; gap: 15px;">
                    <span style="font-size: 48px;">🎭</span>
                    Dashboard Biométrico
                </h1>
                <p style="margin: 0; font-size: 16px; opacity: 0.95;">
                    Centro de control para gestión biométrica con Azure Face API y análisis facial avanzado
                </p>
            </div>

            <!-- MÓDULOS BIOMÉTRICOS - GRID DE 3 CARDS -->
            <div class="biometric-modules-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 25px; margin-bottom: 30px;">

                <!-- CARD 1: REGISTRO BIOMÉTRICO -->
                <div class="biometric-card" onclick="openBiometricRegistration()" style="
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                    border-radius: 12px;
                    padding: 30px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    color: white;
                " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.2)';"
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)';">
                    <div style="font-size: 64px; margin-bottom: 15px; text-align: center;">📸</div>
                    <h2 style="margin: 0 0 10px 0; font-size: 24px; text-align: center;">Registro Biométrico</h2>
                    <p style="margin: 0; font-size: 14px; opacity: 0.95; text-align: center;">
                        Captura facial con Azure Face API
                    </p>
                    <ul style="margin: 15px 0 0 0; padding: 0; list-style: none; font-size: 13px;">
                        <li style="margin: 8px 0; display: flex; align-items: center; gap: 8px;">
                            <span>📷</span> Selección de cámaras
                        </li>
                        <li style="margin: 8px 0; display: flex; align-items: center; gap: 8px;">
                            <span>🎤</span> Configuración de micrófono
                        </li>
                        <li style="margin: 8px 0; display: flex; align-items: center; gap: 8px;">
                            <span>👆</span> Lector de huellas
                        </li>
                        <li style="margin: 8px 0; display: flex; align-items: center; gap: 8px;">
                            <span>☁️</span> Azure Face API
                        </li>
                    </ul>
                </div>

                <!-- CARD 2: CONSENTIMIENTOS BIOMÉTRICOS -->
                <div class="biometric-card" onclick="openBiometricConsent()" style="
                    background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
                    border-radius: 12px;
                    padding: 30px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    color: white;
                " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.2)';"
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)';">
                    <div style="font-size: 64px; margin-bottom: 15px; text-align: center;">📝</div>
                    <h2 style="margin: 0 0 10px 0; font-size: 24px; text-align: center;">Consentimientos</h2>
                    <p style="margin: 0; font-size: 14px; opacity: 0.95; text-align: center;">
                        Gestión legal de consentimientos
                    </p>
                    <ul style="margin: 15px 0 0 0; padding: 0; list-style: none; font-size: 13px;">
                        <li style="margin: 8px 0; display: flex; align-items: center; gap: 8px;">
                            <span>✅</span> Envío masivo
                        </li>
                        <li style="margin: 8px 0; display: flex; align-items: center; gap: 8px;">
                            <span>📋</span> Tracking de firmas
                        </li>
                        <li style="margin: 8px 0; display: flex; align-items: center; gap: 8px;">
                            <span>⚖️</span> Cumplimiento Ley 25.326
                        </li>
                        <li style="margin: 8px 0; display: flex; align-items: center; gap: 8px;">
                            <span>📧</span> Notificaciones automáticas
                        </li>
                    </ul>
                </div>

                <!-- CARD 3: EVALUACIÓN BIOMÉTRICA -->
                <div class="biometric-card" onclick="openBiometricEvaluation()" style="
                    background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);
                    border-radius: 12px;
                    padding: 30px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    color: white;
                " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.2)';"
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)';">
                    <div style="font-size: 64px; margin-bottom: 15px; text-align: center;">📊</div>
                    <h2 style="margin: 0 0 10px 0; font-size: 24px; text-align: center;">Análisis Biométrico</h2>
                    <p style="margin: 0; font-size: 14px; opacity: 0.95; text-align: center;">
                        Evaluación avanzada con Azure
                    </p>
                    <ul style="margin: 15px 0 0 0; padding: 0; list-style: none; font-size: 13px;">
                        <li style="margin: 8px 0; display: flex; align-items: center; gap: 8px;">
                            <span>🧼</span> WHO-GDHI Higiene
                        </li>
                        <li style="margin: 8px 0; display: flex; align-items: center; gap: 8px;">
                            <span>😊</span> FACS Emociones
                        </li>
                        <li style="margin: 8px 0; display: flex; align-items: center; gap: 8px;">
                            <span>😴</span> Stanford Fatiga
                        </li>
                        <li style="margin: 8px 0; display: flex; align-items: center; gap: 8px;">
                            <span>📈</span> Estadísticas y tendencias
                        </li>
                    </ul>
                </div>
            </div>

            <!-- ESTADÍSTICAS RÁPIDAS -->
            <div class="quick-stats" style="background: #f8f9fa; border-radius: 12px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <h3 style="margin: 0 0 20px 0; color: #333;">📊 Estado del Sistema Biométrico</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #4facfe;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Empleados Registrados</div>
                        <div style="font-size: 24px; font-weight: bold; color: #4facfe;">--</div>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #fa709a;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Consentimientos Activos</div>
                        <div style="font-size: 24px; font-weight: bold; color: #fa709a;">--</div>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #30cfd0;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Evaluaciones Completadas</div>
                        <div style="font-size: 24px; font-weight: bold; color: #30cfd0;">--</div>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Azure API Status</div>
                        <div style="font-size: 18px; font-weight: bold; color: #667eea;">🟢 Activo</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    console.log('✅ [BIOMETRIC-DASHBOARD] Contenido renderizado');
}

/**
 * Función para abrir Registro Biométrico
 */
function openBiometricRegistration() {
    console.log('📸 [BIOMETRIC-DASHBOARD] Abriendo Registro Biométrico...');

    // Verificar si existe el módulo biometric-attendance-module
    if (typeof BiometricAttendanceModule === 'function') {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = '<div id="biometric-registration-container"></div>';

        const module = new BiometricAttendanceModule({
            kioskMode: false,
            showQualityIndicators: true
        });
        module.initialize();
    } else {
        alert('⚠️ Módulo de Registro Biométrico no disponible.\n\nPor favor contacte al administrador.');
        console.error('❌ BiometricAttendanceModule no está cargado');
    }
}

/**
 * Función para abrir Consentimientos Biométricos
 */
function openBiometricConsent() {
    console.log('📝 [BIOMETRIC-DASHBOARD] Abriendo Consentimientos...');

    // Verificar si existe la función del módulo
    if (typeof showBiometricConsentContent === 'function') {
        showBiometricConsentContent();
    } else {
        alert('⚠️ Módulo de Consentimientos Biométricos no disponible.\n\nPor favor contacte al administrador.');
        console.error('❌ showBiometricConsentContent no está definida');
    }
}

/**
 * Función para abrir Evaluación Biométrica
 */
function openBiometricEvaluation() {
    console.log('📊 [BIOMETRIC-DASHBOARD] Abriendo Evaluación Biométrica...');

    // Verificar si existe la función del módulo
    if (typeof showEvaluacionBiometricaContent === 'function') {
        showEvaluacionBiometricaContent();
    } else {
        alert('⚠️ Módulo de Evaluación Biométrica no disponible.\n\nPor favor contacte al administrador.');
        console.error('❌ showEvaluacionBiometricaContent no está definida');
    }
}

console.log('✅ [BIOMETRIC-DASHBOARD] Módulo cargado completamente');
