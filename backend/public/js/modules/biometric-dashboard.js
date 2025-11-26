/**
 * ============================================================================
 * DASHBOARD BIOMÉTRICO - Centro de Control
 * ============================================================================
 *
 * Dashboard que agrupa todos los módulos biométricos del sistema:
 * - Registro Biométrico de Empleados
 * - Análisis Emocional
 * - Consentimientos Biométricos
 * - Evaluación Biométrica
 *
 * @version 1.0.0
 * @date 2025-01-31
 */

function showBiometricDashboardContent() {
  const contentArea = document.getElementById('mainContent') || document.getElementById('contentArea');
  if (!contentArea) {
    console.error('❌ contentArea/mainContent no encontrado');
    return;
  }

  // Inyectar estilos en el head si no existen
  if (!document.getElementById('biometric-dashboard-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'biometric-dashboard-styles';
    styleEl.textContent = `
      .biometric-dashboard-container {
        padding: 20px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .page-header {
        margin-bottom: 30px;
      }

      .page-header h2 {
        font-size: 28px;
        color: #2c3e50;
        margin-bottom: 10px;
      }

      .page-header h2 i {
        color: #3498db;
        margin-right: 10px;
      }

      .biometric-modules-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
      }

      .biometric-card {
        background: white;
        border-radius: 12px;
        padding: 25px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        cursor: pointer;
        transition: all 0.3s ease;
        border: 2px solid transparent;
      }

      .biometric-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        border-color: #3498db;
      }

      .card-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 15px;
      }

      .card-icon i {
        font-size: 28px;
        color: white;
      }

      .card-icon.registration {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      .card-icon.emotional {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }

      .card-icon.consent {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }

      .card-icon.evaluation {
        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      }

      .card-content h3 {
        font-size: 18px;
        color: #2c3e50;
        margin-bottom: 10px;
      }

      .card-content p {
        font-size: 14px;
        color: #7f8c8d;
        margin-bottom: 15px;
        line-height: 1.5;
      }

      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 15px;
        border-top: 1px solid #ecf0f1;
      }

      .card-footer i {
        color: #3498db;
        font-size: 18px;
      }

      .biometric-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-top: 30px;
      }

      .stat-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        display: flex;
        align-items: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .stat-icon {
        width: 50px;
        height: 50px;
        border-radius: 10px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 15px;
      }

      .stat-icon i {
        font-size: 24px;
        color: white;
      }

      .stat-content {
        display: flex;
        flex-direction: column;
      }

      .stat-value {
        font-size: 24px;
        font-weight: bold;
        color: #2c3e50;
      }

      .stat-label {
        font-size: 12px;
        color: #7f8c8d;
        margin-top: 5px;
      }

      @media (max-width: 768px) {
        .biometric-modules-grid {
          grid-template-columns: 1fr;
        }

        .biometric-stats {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `;
    document.head.appendChild(styleEl);
  }

  contentArea.innerHTML = `
    <div class="biometric-dashboard-container">
      <div class="page-header">
        <h2>
          <i class="fas fa-fingerprint"></i>
          Dashboard Biométrico
        </h2>
        <p class="text-muted">Centro de control de todos los módulos biométricos del sistema</p>
      </div>

      <div class="biometric-modules-grid">
        <!-- Registro Biométrico -->
        <div class="biometric-card" onclick="openBiometricModule('registration')">
          <div class="card-icon registration">
            <i class="fas fa-user-plus"></i>
          </div>
          <div class="card-content">
            <h3>Registro Biométrico</h3>
            <p>Captura y almacenamiento de templates biométricos de empleados</p>
            <div class="card-footer">
              <span class="badge badge-primary">Activo</span>
              <i class="fas fa-arrow-right"></i>
            </div>
          </div>
        </div>

        <!-- Análisis Emocional -->
        <div class="biometric-card" onclick="openBiometricModule('emotional')">
          <div class="card-icon emotional">
            <i class="fas fa-smile"></i>
          </div>
          <div class="card-content">
            <h3>Análisis Emocional</h3>
            <p>Análisis de estados emocionales mediante reconocimiento facial</p>
            <div class="card-footer">
              <span class="badge badge-primary">Activo</span>
              <i class="fas fa-arrow-right"></i>
            </div>
          </div>
        </div>

        <!-- Consentimientos Biométricos -->
        <div class="biometric-card" onclick="openBiometricModule('consent')">
          <div class="card-icon consent">
            <i class="fas fa-file-contract"></i>
          </div>
          <div class="card-content">
            <h3>Consentimientos Biométricos</h3>
            <p>Gestión de consentimientos legales para uso de datos biométricos</p>
            <div class="card-footer">
              <span class="badge badge-success">Legal</span>
              <i class="fas fa-arrow-right"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Estadísticas Rápidas -->
      <div class="biometric-stats">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-users"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value" id="totalRegisteredUsers">-</span>
            <span class="stat-label">Usuarios Registrados</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-fingerprint"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value" id="totalBiometricTemplates">-</span>
            <span class="stat-label">Templates Almacenados</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value" id="totalConsents">-</span>
            <span class="stat-label">Consentimientos</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-clock"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value" id="lastSync">-</span>
            <span class="stat-label">Última Sincronización</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Cargar estadísticas
  loadBiometricStats();
}

/**
 * Abre un módulo biométrico específico
 */
function openBiometricModule(moduleType) {
  console.log(`🔍 Abriendo módulo biométrico: ${moduleType}`);

  // Usar el router principal de panel-empresa.html
  switch (moduleType) {
    case 'registration':
      // Redirigir al módulo de registro biométrico
      if (typeof showModuleContent === 'function') {
        showModuleContent('biometric-simple', 'Registro Biométrico');
      } else {
        console.error('❌ Router no disponible');
      }
      break;

    case 'emotional':
      // Redirigir al módulo de análisis emocional
      if (typeof showModuleContent === 'function') {
        showModuleContent('emotional-analysis', 'Análisis Emocional');
      } else {
        console.error('❌ Router no disponible');
      }
      break;

    case 'consent':
      // Redirigir al módulo de consentimientos
      if (typeof showModuleContent === 'function') {
        showModuleContent('biometric-consent', 'Consentimientos Biométricos');
      } else {
        console.error('❌ Router no disponible');
      }
      break;

    default:
      console.error('❌ Módulo desconocido:', moduleType);
  }
}

/**
 * Carga estadísticas del dashboard biométrico
 */
async function loadBiometricStats() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No hay token');
      return;
    }

    // Obtener estadísticas básicas
    const companyData = JSON.parse(localStorage.getItem('company') || '{}');
    const companyId = companyData.company_id || companyData.companyId;

    // Actualizar stats (valores placeholder por ahora)
    document.getElementById('totalRegisteredUsers').textContent = '-';
    document.getElementById('totalBiometricTemplates').textContent = '-';
    document.getElementById('totalConsents').textContent = '-';
    document.getElementById('lastSync').textContent = 'Hace 5 min';

    console.log('✅ Estadísticas cargadas');
  } catch (error) {
    console.error('❌ Error cargando estadísticas:', error);
  }
}

// Exportar usando el patrón moderno (window.Modules)
window.Modules = window.Modules || {};
window.Modules['biometric-dashboard'] = {
  init: showBiometricDashboardContent
};

// También mantener compatibilidad legacy
window.showBiometricDashboardContent = showBiometricDashboardContent;

console.log('✅ Módulo biometric-dashboard.js cargado');
