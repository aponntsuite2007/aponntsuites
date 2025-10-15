// Dashboard Module - v4.0 PROGRESSIVE
console.log('📊 [DASHBOARD] Módulo dashboard cargado');

// Dashboard functions - Versión Genérica para Sistema Modular
function showDashboardContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;

    content.innerHTML = `
        <div class="tab-content active" id="dashboard">
            <div class="welcome-section">
                <div class="company-info-card">
                    <div class="company-details">
                        <h3 id="companyName">Cargando información...</h3>
                        <p id="companyInfo">Obteniendo datos de la empresa</p>
                    </div>
                    <div class="system-status">
                        <div class="status-indicator online">
                            <div class="status-dot"></div>
                            <span>Sistema Operativo</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modules-overview">
                <h3>📋 Módulos Disponibles</h3>
                <p>Selecciona un módulo para acceder a sus funcionalidades específicas</p>

                <div class="quick-access-grid" id="quickAccessModules">
                    <!-- Se cargarán dinámicamente los módulos más usados -->
                </div>
            </div>

            <div class="notifications-section">
                <h3>🔔 Notificaciones del Sistema</h3>
                <div id="systemNotifications" class="notifications-container">
                    <div class="notification-item info">
                        <div class="notification-icon">ℹ️</div>
                        <div class="notification-content">
                            <div class="notification-title">Sistema Actualizado</div>
                            <div class="notification-desc">Nuevas funcionalidades disponibles en los módulos</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="help-section">
                <h3>❓ ¿Necesitas Ayuda?</h3>
                <div class="help-options">
                    <button class="btn secondary" onclick="showSystemGuide()">📖 Guía del Sistema</button>
                    <button class="btn secondary" onclick="contactSupport()">📞 Contactar Soporte</button>
                </div>
            </div>
        </div>
    `;

    // Load company info and modules overview
    setTimeout(loadCompanyDashboardInfo, 300);
}

// Load company dashboard information
async function loadCompanyDashboardInfo() {
    console.log('🏢 [DASHBOARD] Cargando información de la empresa...');

    try {
        // Load current company info
        if (typeof currentCompany !== 'undefined' && currentCompany) {
            updateCompanyInfo(currentCompany);
        } else {
            updateCompanyInfo({
                name: 'Empresa de Ejemplo',
                info: 'Información de empresa no disponible'
            });
        }

        // Load quick access modules
        loadQuickAccessModules();

        // Load system notifications
        loadSystemNotifications();

    } catch (error) {
        console.log('ℹ️ [DASHBOARD] Error cargando información, usando datos por defecto');
    }
}

// Update company information display
function updateCompanyInfo(company) {
    const nameEl = document.getElementById('companyName');
    const infoEl = document.getElementById('companyInfo');

    if (nameEl) {
        nameEl.textContent = company.name || 'Mi Empresa';
    }

    if (infoEl) {
        const info = [];
        if (company.address) info.push(company.address);
        if (company.contact_email) info.push(company.contact_email);
        if (company.phone) info.push(company.phone);

        infoEl.textContent = info.length > 0 ? info.join(' • ') : 'Sistema de gestión empresarial multi-módulo';
    }
}

// Load quick access modules grid
function loadQuickAccessModules() {
    const container = document.getElementById('quickAccessModules');
    if (!container) return;

    // Get available modules from the main module grid
    const availableModules = window.availableModules || [];
    const popularModules = ['users', 'attendance', 'biometric', 'medical'];

    const quickModules = availableModules
        .filter(module => popularModules.includes(module.id))
        .slice(0, 4);

    if (quickModules.length > 0) {
        container.innerHTML = quickModules.map(module => `
            <div class="quick-module-card" onclick="showTab('${module.id}', this)">
                <div class="module-icon">${module.icon}</div>
                <div class="module-name">${module.name}</div>
                <div class="module-desc">Acceso rápido</div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `
            <div class="no-modules-message">
                <p>Los módulos de acceso rápido se cargarán una vez que tengas módulos disponibles</p>
            </div>
        `;
    }
}

// Load system notifications
function loadSystemNotifications() {
    const container = document.getElementById('systemNotifications');
    if (!container) return;

    // Add any pending notifications based on system state
    const notifications = [
        {
            type: 'info',
            icon: 'ℹ️',
            title: 'Sistema Modular Activo',
            desc: 'Todos los módulos están funcionando correctamente'
        }
    ];

    // Check if user has modules available
    if (window.availableModules && window.availableModules.length > 0) {
        notifications.push({
            type: 'success',
            icon: '✅',
            title: `${window.availableModules.length} Módulos Disponibles`,
            desc: 'Haz clic en cualquier módulo para acceder a sus funcionalidades'
        });
    }

    container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.type}">
            <div class="notification-icon">${notif.icon}</div>
            <div class="notification-content">
                <div class="notification-title">${notif.title}</div>
                <div class="notification-desc">${notif.desc}</div>
            </div>
        </div>
    `).join('');
}

// Help and support functions
function showSystemGuide() {
    alert('🔍 Guía del Sistema:\n\n1. Utiliza los módulos en la barra superior\n2. Cada módulo tiene funcionalidades específicas\n3. Los datos están aislados por empresa\n4. Para soporte técnico, usa el botón de contacto');
}

function contactSupport() {
    alert('📞 Contacto de Soporte:\n\nPuedes contactar al soporte técnico a través de:\n- Email: soporte@empresa.com\n- Teléfono: +54 11 1234-5678\n- Sistema de tickets interno');
}

// Deprecated function - kept for compatibility
function updateDashboardStats(stats) {
    const presentToday = document.getElementById('presentToday');
    const absentToday = document.getElementById('absentToday');
    const avgHours = document.getElementById('avgHours');

    if (totalEmployees) totalEmployees.textContent = stats.totalEmployees || '-';
    if (presentToday) presentToday.textContent = stats.presentToday || '-';
    if (absentToday) absentToday.textContent = stats.absentToday || '-';
    if (avgHours) avgHours.textContent = stats.avgHours || '-';
}

// Load recent activity
async function loadRecentActivity() {
    const activityContainer = document.getElementById('recentActivity');
    if (!activityContainer) return;
    
    try {
        // Use mock data for now since recent-activity endpoint doesn't exist
        const activities = [
            { time: '09:15', desc: 'Juan Pérez - Entrada registrada', type: 'entry' },
            { time: '09:20', desc: 'María García - Entrada registrada', type: 'entry' },
            { time: '12:30', desc: 'Carlos López - Salida almuerzo', type: 'break' },
            { time: '13:45', desc: 'Ana Martín - Regreso almuerzo', type: 'return' }
        ];
        
        activityContainer.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-time">${activity.time}</div>
                <div class="activity-desc">${activity.desc}</div>
            </div>
        `).join('') || '<div class="activity-item"><div class="activity-desc">Sin actividad reciente</div></div>';
        
    } catch (error) {
        console.error('❌ [DASHBOARD] Error cargando actividad:', error);
        activityContainer.innerHTML = '<div class="activity-item"><div class="activity-desc">Error cargando actividad</div></div>';
    }
}

// Export dashboard report
function exportDashboardReport() {
    console.log('📊 [DASHBOARD] Exportando reporte...');
    alert('Función de exportación en desarrollo');
}

// Auto-refresh dashboard every 30 seconds
setInterval(() => {
    if (window.currentTab === 'dashboard') {
        loadDashboardStats();
    }
}, 30000);

console.log('✅ [DASHBOARD] Módulo dashboard configurado');