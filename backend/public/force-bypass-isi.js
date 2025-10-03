// 🚫 BYPASS TOTAL ISI - SCRIPT INDEPENDIENTE
console.log('🚫 [BYPASS] Iniciando bypass total ISI');

// 1. Configurar variables globales INMEDIATAMENTE
window.selectedCompany = {id: 11, name: 'ISI', slug: 'isi'};
window.companyAuthToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA1OTNmOTcxLTg0NjEtNGU2Ny04MGExLTFmZGRkMTg5MzJmNCIsImVtYWlsIjoiYWRtaW5AdGVzdC1jb21wYW55LmNvbSIsImNvbXBhbnlfaWQiOjQsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1ODgxMTk1OSwiZXhwIjoxNzU4ODk4MzU5fQ.4wskIaStFAas4kVF4L6Mn3z_SXNZKfLbi97L1bem2Hc';
window.isAuthenticated = true;
window.authToken = window.companyAuthToken;

// 2. Bloquear TODA función de login
window.showLoginForm = function() {
    console.log('🚫 [BYPASS] showLoginForm bloqueado');
    return false;
};

// 3. Ocultar login al cargar DOM
function hideAllLogin() {
    const selectors = [
        '.company-login-modal',
        '#companyLoginModal',
        '#loginForm',
        '.login-form',
        '[id*="login"]',
        '[class*="login"]'
    ];

    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (el) {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
                el.style.zIndex = '-9999';
                el.style.position = 'fixed';
                el.style.top = '-9999px';
                el.style.left = '-9999px';
                el.style.pointerEvents = 'none';
                el.style.transform = 'scale(0)';
            }
        });
    });
}

// 4. Mostrar contenido principal
function showMainContent() {
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.style.display = 'block';
        mainContent.style.visibility = 'visible';
        mainContent.style.opacity = '1';
        mainContent.style.zIndex = '1000';
    }

    // Mostrar container principal también
    const container = document.querySelector('.container');
    if (container) {
        container.style.display = 'block';
        container.style.visibility = 'visible';
    }
}

// 5. Auto-ejecutar al cargar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚫 [BYPASS] DOM listo - aplicando bypass');
        hideAllLogin();
        showMainContent();

        // Cargar interfaz después de un momento
        setTimeout(() => {
            if (typeof loadCoreInterface === 'function') {
                console.log('🚫 [BYPASS] Cargando loadCoreInterface()');
                loadCoreInterface();
            }
        }, 200);
    });
} else {
    // DOM ya cargado
    hideAllLogin();
    showMainContent();
    setTimeout(() => {
        if (typeof loadCoreInterface === 'function') {
            loadCoreInterface();
        }
    }, 200);
}

console.log('✅ [BYPASS] Bypass ISI configurado completamente');