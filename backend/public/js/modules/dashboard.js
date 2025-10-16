// Dashboard Module - v4.0 PROGRESSIVE
(async () => {
    console.log(`📊 [DASHBOARD] ${await window.t('dashboard.console.module_loaded')}`);
})();

// Dashboard functions - Versión Genérica para Sistema Modular
function showDashboardContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;

    content.innerHTML = `
        <div class="tab-content active" id="dashboard">
            <!-- Dashboard vacío - contenido eliminado por solicitud del usuario -->
        </div>
    `;

    // Load company info and modules overview
    setTimeout(loadCompanyDashboardInfo, 300);
}

// Load company dashboard information
async function loadCompanyDashboardInfo() {
    console.log(`🏢 [DASHBOARD] ${await window.t('dashboard.console.loading_company_info')}`);

    try {
        // Load current company info
        if (typeof currentCompany !== 'undefined' && currentCompany) {
            await updateCompanyInfo(currentCompany);
        } else {
            await updateCompanyInfo({
                name: await window.t('dashboard.company.example_name'),
                info: await window.t('dashboard.company.not_available')
            });
        }

        // Load quick access modules
        await loadQuickAccessModules();

        // Load system notifications
        await loadSystemNotifications();

    } catch (error) {
        console.log(`ℹ️ [DASHBOARD] ${await window.t('dashboard.console.error_loading')}`);
    }
}

// Update company information display
async function updateCompanyInfo(company) {
    const nameEl = document.getElementById('companyName');
    const infoEl = document.getElementById('companyInfo');

    if (nameEl) {
        nameEl.textContent = company.name || await window.t('dashboard.company.default_name');
    }

    if (infoEl) {
        const info = [];
        if (company.address) info.push(company.address);
        if (company.contact_email) info.push(company.contact_email);
        if (company.phone) info.push(company.phone);

        infoEl.textContent = info.length > 0 ? info.join(' • ') : await window.t('dashboard.company.default_info');
    }
}

// Load quick access modules grid
async function loadQuickAccessModules() {
    const container = document.getElementById('quickAccessModules');
    if (!container) return;

    // Get available modules from the main module grid
    const availableModules = window.availableModules || [];
    const popularModules = ['users', 'attendance', 'biometric', 'medical'];

    const quickModules = availableModules
        .filter(module => popularModules.includes(module.id))
        .slice(0, 4);

    const quickAccessLabel = await window.t('dashboard.quick_access.quick_access_label');
    if (quickModules.length > 0) {
        container.innerHTML = quickModules.map(module => `
            <div class="quick-module-card" onclick="showTab('${module.id}', this)">
                <div class="module-icon">${module.icon}</div>
                <div class="module-name">${module.name}</div>
                <div class="module-desc">${quickAccessLabel}</div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `
            <div class="no-modules-message">
                <p data-translate="dashboard.quick_access.no_modules">${await window.t('dashboard.quick_access.no_modules')}</p>
            </div>
        `;
    }
}

// Load system notifications
async function loadSystemNotifications() {
    const container = document.getElementById('systemNotifications');
    if (!container) return;

    // Add any pending notifications based on system state
    const notifications = [
        {
            type: 'info',
            icon: 'ℹ️',
            title: await window.t('dashboard.notifications.system_active_title'),
            desc: await window.t('dashboard.notifications.system_active_desc')
        }
    ];

    // Check if user has modules available
    if (window.availableModules && window.availableModules.length > 0) {
        notifications.push({
            type: 'success',
            icon: '✅',
            title: await window.t('dashboard.notifications.modules_available_title', { count: window.availableModules.length }),
            desc: await window.t('dashboard.notifications.modules_available_desc')
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
async function showSystemGuide() {
    const title = await window.t('dashboard.help.guide_title');
    const content = await window.t('dashboard.help.guide_content');
    alert(`🔍 ${title}:\n\n${content}`);
}

async function contactSupport() {
    const title = await window.t('dashboard.help.support_title');
    const content = await window.t('dashboard.help.support_content');
    alert(`📞 ${title}:\n\n${content}`);
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

        const noActivity = await window.t('dashboard.activity.no_activity');
        activityContainer.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-time">${activity.time}</div>
                <div class="activity-desc">${activity.desc}</div>
            </div>
        `).join('') || `<div class="activity-item"><div class="activity-desc">${noActivity}</div></div>`;

    } catch (error) {
        console.error('❌ [DASHBOARD] Error cargando actividad:', error);
        const errorMsg = await window.t('dashboard.activity.error_loading');
        activityContainer.innerHTML = `<div class="activity-item"><div class="activity-desc">${errorMsg}</div></div>`;
    }
}

// Export dashboard report
async function exportDashboardReport() {
    console.log(`📊 [DASHBOARD] ${await window.t('dashboard.console.exporting')}`);
    alert(await window.t('dashboard.export.in_development'));
}

// Auto-refresh dashboard every 30 seconds
setInterval(() => {
    if (window.currentTab === 'dashboard') {
        loadDashboardStats();
    }
}, 30000);

(async () => {
    console.log(`✅ [DASHBOARD] ${await window.t('dashboard.console.configured')}`);
})();