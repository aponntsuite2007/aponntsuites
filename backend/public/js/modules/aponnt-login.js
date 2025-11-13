/**
 * =====================================================================
 * MÓDULO: Aponnt Login (Staff + Partners)
 * =====================================================================
 *
 * Sistema de autenticación para:
 * - Personal de Aponnt (admin, supervisor, vendor, soporte, etc.)
 * - Partners (médicos, abogados, etc.)
 *
 * Uso:
 * 1. Incluir en panel-administrativo.html
 * 2. URL: panel-administrativo.html?userType=staff|partner
 */

class AponntLogin {
  constructor(userType = null) {
    this.apiBaseUrl = '/api/v1/auth/aponnt';
    // Si se pasa userType como parámetro, usarlo; si no, obtenerlo de la URL
    this.userType = userType || this.getUserTypeFromURL();
    this.token = null;
    this.user = null;

    console.log('🔐 [APONNT-LOGIN] Constructor - userType:', this.userType);
  }

  /**
   * Obtener tipo de usuario desde URL
   */
  getUserTypeFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('userType') || null;
  }

  /**
   * Verificar si hay sesión activa
   */
  isAuthenticated() {
    const token = localStorage.getItem(`aponnt_token_${this.userType}`);
    const userData = localStorage.getItem(`aponnt_user_${this.userType}`);

    if (token && userData) {
      this.token = token;
      this.user = JSON.parse(userData);
      return true;
    }

    return false;
  }

  /**
   * Mostrar modal de login
   */
  showLoginModal() {
    console.log('🔐 [APONNT-LOGIN] showLoginModal() llamado');
    console.log('🔐 [APONNT-LOGIN] this.userType:', this.userType);
    console.log('🔐 [APONNT-LOGIN] this.isAuthenticated():', this.isAuthenticated());

    // Verificar si ya está autenticado
    if (this.isAuthenticated()) {
      console.log('✅ [APONNT-LOGIN] Usuario ya autenticado');
      this.handleLoginSuccess();
      return;
    }

    // Si no hay userType, redirigir a index.html
    if (!this.userType) {
      console.error('❌ [APONNT-LOGIN] ERROR: Sin userType, redirigiendo a index.html');
      console.error('❌ [APONNT-LOGIN] Constructor recibió:', this.userType);
      console.error('❌ [APONNT-LOGIN] URL actual:', window.location.href);
      alert('ERROR: No se pudo determinar el tipo de usuario. Redirigiendo a inicio.');
      window.location.href = '/index.html';
      return;
    }

    console.log('✅ [APONNT-LOGIN] userType válido, mostrando modal');

    const modalHTML = `
      <div id="aponnt-login-modal" class="login-modal-overlay" style="display: flex;">
        <div class="login-modal">
          <div class="login-header">
            <h2>
              ${this.userType === 'staff' ? '🏢 Acceso Staff Aponnt' : '🤝 Acceso Asociados'}
            </h2>
            <p class="login-subtitle">
              ${this.userType === 'staff'
                ? 'Ingrese sus credenciales de personal'
                : 'Ingrese sus credenciales de asociado'}
            </p>
          </div>

          <form id="aponnt-login-form" class="login-form">
            <div class="form-group">
              <label for="login-username">Usuario</label>
              <input
                type="text"
                id="login-username"
                placeholder="${this.userType === 'staff' ? 'Usuario o email' : 'DNI, usuario o email'}"
                autocomplete="username"
                required
              >
            </div>

            <div class="form-group">
              <label for="login-password">Contraseña</label>
              <input
                type="password"
                id="login-password"
                placeholder="Contraseña"
                autocomplete="current-password"
                required
              >
            </div>

            <div id="login-error" class="login-error" style="display: none;"></div>

            <div class="login-buttons">
              <button type="submit" class="btn-login" id="btn-submit-login">
                <span class="btn-text">Iniciar Sesión</span>
                <span class="btn-loading" style="display: none;">
                  <span class="spinner"></span> Verificando...
                </span>
              </button>
              <button type="button" class="btn-cancel" id="btn-cancel-login">
                Cancelar
              </button>
            </div>

            ${this.userType === 'partner' ? `
              <div class="login-footer">
                <p>¿No tiene cuenta? <a href="/partner-register.html">Registrarse como Asociado</a></p>
              </div>
            ` : ''}
          </form>
        </div>
      </div>
    `;

    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Agregar estilos
    this.injectStyles();

    // Agregar event listener al formulario
    document.getElementById('aponnt-login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    // Agregar event listener al botón cancelar
    document.getElementById('btn-cancel-login').addEventListener('click', () => {
      console.log('🔐 [APONNT-LOGIN] Login cancelado por el usuario');
      this.hideModal();
    });

    console.log(`🔐 [APONNT-LOGIN] Modal de login mostrado - Tipo: ${this.userType}`);
  }

  /**
   * Manejar login
   */
  async handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
      this.showError('Por favor complete todos los campos');
      return;
    }

    this.showLoading(true);
    this.hideError();

    try {
      const endpoint = this.userType === 'staff'
        ? `${this.apiBaseUrl}/staff/login`
        : `${this.apiBaseUrl}/partner/login`;

      console.log(`🔐 [APONNT-LOGIN] Enviando request a: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el login');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido');
      }

      console.log('✅ [APONNT-LOGIN] Login exitoso:', data);

      // Guardar token y datos en localStorage
      const userKey = this.userType === 'staff' ? 'staff' : 'partner';
      const userData = data[userKey];

      localStorage.setItem(`aponnt_token_${this.userType}`, data.token);
      localStorage.setItem(`aponnt_refresh_token_${this.userType}`, data.refreshToken);
      localStorage.setItem(`aponnt_user_${this.userType}`, JSON.stringify(userData));
      localStorage.setItem(`aponnt_user_type`, this.userType);

      // Compatibilidad con el resto del sistema (configurador-modulos, auditor, etc.)
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userData));

      // Si es staff, guardar empresas asignadas
      if (this.userType === 'staff' && data.assigned_companies) {
        localStorage.setItem('aponnt_assigned_companies', JSON.stringify(data.assigned_companies));
      }

      // Si es staff, guardar permisos
      if (this.userType === 'staff' && data.permissions) {
        localStorage.setItem('aponnt_permissions', JSON.stringify(data.permissions));
      }

      this.token = data.token;
      this.user = userData;

      // Verificar si es primer login
      if (userData.first_login) {
        this.showChangePasswordModal();
      } else {
        this.handleLoginSuccess();
      }

    } catch (error) {
      console.error('❌ [APONNT-LOGIN] Error:', error);
      this.showError(error.message || 'Error al iniciar sesión');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Manejar login exitoso
   */
  handleLoginSuccess() {
    console.log('✅ [APONNT-LOGIN] Manejando login exitoso');

    // Cerrar modal
    const modal = document.getElementById('aponnt-login-modal');
    if (modal) {
      modal.remove();
    }

    // Si es partner, mostrar dashboard de partner
    if (this.userType === 'partner') {
      console.log('🤝 [APONNT-LOGIN] Mostrando dashboard de partner');
      this.showPartnerDashboard();
      return;
    }

    // Si es staff, mostrar panel administrativo completo
    if (this.userType === 'staff') {
      console.log('🏢 [APONNT-LOGIN] Mostrando panel administrativo completo');
      this.showAdminPanel();
      return;
    }
  }

  /**
   * Mostrar dashboard de partner (modal)
   */
  showPartnerDashboard() {
    // TODO: Implementar dashboard de partner
    const dashboardHTML = `
      <div class="partner-dashboard-container">
        <div class="partner-dashboard-header">
          <h1>👋 Bienvenido/a, ${this.user.first_name} ${this.user.last_name}</h1>
          <button onclick="aponntLogin.logout()" class="btn-logout">Cerrar Sesión</button>
        </div>

        <div class="partner-dashboard-content">
          <div class="dashboard-card">
            <h3>📊 Dashboard de Asociado</h3>
            <p>Funcionalidad en desarrollo...</p>
            <p>DNI: ${this.user.dni}</p>
            <p>Email: ${this.user.email}</p>
          </div>
        </div>
      </div>
    `;

    document.body.innerHTML = dashboardHTML;
  }

  /**
   * Mostrar panel administrativo (staff)
   */
  showAdminPanel() {
    // Recargar la página sin parámetro userType para que cargue con el token del localStorage
    console.log('🔄 [APONNT-LOGIN] Recargando panel con sesión autenticada');

    // Remover parámetro userType de la URL y recargar
    const urlWithoutParams = window.location.pathname;
    window.location.href = urlWithoutParams;
  }

  showAdminPanelOld() {
    // Ocultar todos los elementos del dashboard inicialmente ocultos
    const contentElements = document.querySelectorAll('.dashboard-container, .dashboard-header');
    contentElements.forEach(el => {
      el.style.display = 'block';
    });

    // Agregar información del usuario logueado al header
    const header = document.querySelector('.dashboard-header');
    if (header) {
      const userInfo = document.createElement('div');
      userInfo.className = 'user-info';
      userInfo.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
          <div>
            <strong>${this.user.first_name} ${this.user.last_name}</strong>
            <span style="margin-left: 10px; opacity: 0.8;">
              ${this.getRoleDisplayName(this.user.role)}
            </span>
          </div>
          <button onclick="aponntLogin.logout()" class="btn-logout-header">
            Cerrar Sesión
          </button>
        </div>
      `;
      header.appendChild(userInfo);
    }

    // Aplicar restricciones por rol
    this.applyRoleRestrictions();

    console.log('✅ [APONNT-LOGIN] Panel administrativo mostrado');
  }

  /**
   * Aplicar restricciones por rol
   */
  applyRoleRestrictions() {
    const permissions = JSON.parse(localStorage.getItem('aponnt_permissions') || '{}');

    // Ocultar secciones según permisos
    if (!permissions.can_manage_staff) {
      // Ocultar opciones de gestión de staff
      console.log('⚠️ [APONNT-LOGIN] Usuario sin permisos de gestión de staff');
    }

    if (!permissions.can_view_all_companies) {
      // Aplicar filtro de empresas
      console.log('⚠️ [APONNT-LOGIN] Usuario con acceso limitado a empresas');
    }
  }

  /**
   * Mostrar modal de cambio de contraseña
   */
  showChangePasswordModal() {
    const modalHTML = `
      <div id="change-password-modal" class="login-modal-overlay" style="display: flex;">
        <div class="login-modal">
          <div class="login-header">
            <h2>🔐 Cambio de Contraseña Obligatorio</h2>
            <p class="login-subtitle">Es su primer login. Por favor cambie su contraseña.</p>
          </div>

          <form id="change-password-form" class="login-form">
            <div class="form-group">
              <label for="current-password">Contraseña Actual</label>
              <input type="password" id="current-password" required>
            </div>

            <div class="form-group">
              <label for="new-password">Nueva Contraseña (mínimo 6 caracteres)</label>
              <input type="password" id="new-password" required minlength="6">
            </div>

            <div class="form-group">
              <label for="confirm-password">Confirmar Nueva Contraseña</label>
              <input type="password" id="confirm-password" required minlength="6">
            </div>

            <div id="change-password-error" class="login-error" style="display: none;"></div>

            <button type="submit" class="btn-login">Cambiar Contraseña</button>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('change-password-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleChangePassword();
    });
  }

  /**
   * Manejar cambio de contraseña
   */
  async handleChangePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
      this.showError('Las contraseñas no coinciden', 'change-password-error');
      return;
    }

    if (newPassword.length < 6) {
      this.showError('La contraseña debe tener al menos 6 caracteres', 'change-password-error');
      return;
    }

    try {
      const endpoint = this.userType === 'staff'
        ? `${this.apiBaseUrl}/staff/change-password`
        : `${this.apiBaseUrl}/partner/change-password`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: this.user.username,
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar contraseña');
      }

      console.log('✅ [APONNT-LOGIN] Contraseña cambiada exitosamente');

      // Actualizar first_login
      this.user.first_login = false;
      localStorage.setItem(`aponnt_user_${this.userType}`, JSON.stringify(this.user));

      // Cerrar modal y continuar
      document.getElementById('change-password-modal').remove();
      this.handleLoginSuccess();

    } catch (error) {
      console.error('❌ [APONNT-LOGIN] Error:', error);
      this.showError(error.message, 'change-password-error');
    }
  }

  /**
   * Cerrar sesión
   */
  logout() {
    localStorage.removeItem(`aponnt_token_${this.userType}`);
    localStorage.removeItem(`aponnt_refresh_token_${this.userType}`);
    localStorage.removeItem(`aponnt_user_${this.userType}`);
    localStorage.removeItem('aponnt_user_type');
    localStorage.removeItem('aponnt_assigned_companies');
    localStorage.removeItem('aponnt_permissions');

    console.log('👋 [APONNT-LOGIN] Sesión cerrada');
    window.location.href = '/index.html';
  }

  /**
   * Obtener nombre de rol para mostrar
   */
  getRoleDisplayName(role) {
    const roles = {
      'admin': 'Administrador',
      'supervisor': 'Supervisor',
      'leader': 'Líder de Equipo',
      'vendor': 'Vendedor',
      'soporte': 'Soporte',
      'administrativo': 'Administrativo',
      'marketing': 'Marketing'
    };
    return roles[role] || role;
  }

  /**
   * Mostrar error
   */
  showError(message, errorDivId = 'login-error') {
    const errorDiv = document.getElementById(errorDivId);
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  /**
   * Ocultar error
   */
  hideError(errorDivId = 'login-error') {
    const errorDiv = document.getElementById(errorDivId);
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }

  /**
   * Mostrar/ocultar loading
   */
  showLoading(show) {
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    const btnSubmit = document.getElementById('btn-submit-login');

    if (btnText && btnLoading && btnSubmit) {
      btnText.style.display = show ? 'none' : 'inline';
      btnLoading.style.display = show ? 'inline' : 'none';
      btnSubmit.disabled = show;
    }
  }

  /**
   * Inyectar estilos CSS
   */
  injectStyles() {
    const existingStyles = document.getElementById('aponnt-login-styles');
    if (existingStyles) return;

    const styles = document.createElement('style');
    styles.id = 'aponnt-login-styles';
    styles.textContent = `
      .login-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
      }

      .login-modal {
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        width: 90%;
        max-width: 450px;
        padding: 2.5rem;
        animation: slideDown 0.3s ease;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .login-header {
        text-align: center;
        margin-bottom: 2rem;
      }

      .login-header h2 {
        font-size: 1.8rem;
        color: #667eea;
        margin-bottom: 0.5rem;
      }

      .login-subtitle {
        color: #666;
        font-size: 0.95rem;
      }

      .login-form .form-group {
        margin-bottom: 1.5rem;
      }

      .login-form label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: #333;
        font-size: 0.9rem;
      }

      .login-form input {
        width: 100%;
        padding: 0.8rem 1rem;
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        font-size: 1rem;
        transition: border-color 0.3s ease;
      }

      .login-form input:focus {
        outline: none;
        border-color: #667eea;
      }

      .btn-login {
        width: 100%;
        padding: 1rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s ease;
        margin-top: 1rem;
      }

      .btn-login:hover:not(:disabled) {
        transform: translateY(-2px);
      }

      .btn-login:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .login-buttons {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
      }

      .login-buttons .btn-login {
        flex: 1;
        margin-top: 0;
      }

      .btn-cancel {
        flex: 1;
        padding: 1rem;
        background: #f5f5f5;
        color: #666;
        border: 2px solid #ddd;
        border-radius: 10px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-cancel:hover {
        background: #e0e0e0;
        border-color: #bbb;
        color: #333;
        transform: translateY(-2px);
      }

      .login-error {
        background: #fee;
        color: #c33;
        padding: 0.8rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        font-size: 0.9rem;
        border-left: 4px solid #c33;
      }

      .login-footer {
        text-align: center;
        margin-top: 1.5rem;
        color: #666;
        font-size: 0.9rem;
      }

      .login-footer a {
        color: #667eea;
        text-decoration: none;
        font-weight: 600;
      }

      .login-footer a:hover {
        text-decoration: underline;
      }

      .spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .btn-logout-header {
        padding: 0.6rem 1.5rem;
        background: rgba(255,255,255,0.2);
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background 0.3s ease;
      }

      .btn-logout-header:hover {
        background: rgba(255,255,255,0.3);
      }

      .partner-dashboard-container {
        max-width: 1200px;
        margin: 2rem auto;
        padding: 2rem;
      }

      .partner-dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e0e0e0;
      }

      .dashboard-card {
        background: white;
        padding: 2rem;
        border-radius: 15px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      }

      .btn-logout {
        padding: 0.8rem 1.5rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
      }

      .btn-logout:hover {
        opacity: 0.9;
      }
    `;

    document.head.appendChild(styles);
  }
}

// Instancia global (se crea manualmente cuando se necesita)
let aponntLogin = null;

console.log('✅ [APONNT-LOGIN] Módulo de login cargado (sin auto-inicialización)');
