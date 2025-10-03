// CONFIGURACIÓN DINÁMICA DE PUERTOS - ÚNICA FUENTE DE VERDAD
window.DYNAMIC_CONFIG = {
    port: null,
    baseUrl: null,
    apiUrl: null,
    initialized: false
};

// Detectar puerto actual automáticamente
window.DYNAMIC_CONFIG.port = window.location.port || '3000';
window.DYNAMIC_CONFIG.baseUrl = `${window.location.protocol}//${window.location.hostname}:${window.DYNAMIC_CONFIG.port}`;
window.DYNAMIC_CONFIG.apiUrl = `${window.DYNAMIC_CONFIG.baseUrl}/api/v1`;
window.DYNAMIC_CONFIG.initialized = true;

console.log('🔧 [DYNAMIC-CONFIG] Puerto detectado automáticamente:', window.DYNAMIC_CONFIG.port);
console.log('🌐 [DYNAMIC-CONFIG] Base URL:', window.DYNAMIC_CONFIG.baseUrl);
console.log('🚀 [DYNAMIC-CONFIG] API URL:', window.DYNAMIC_CONFIG.apiUrl);

// Función para obtener URL completa
window.getDynamicUrl = function(endpoint) {
    if (!window.DYNAMIC_CONFIG.initialized) {
        console.error('❌ [DYNAMIC-CONFIG] Configuración no inicializada');
        return endpoint;
    }

    if (endpoint.startsWith('/api/')) {
        return window.DYNAMIC_CONFIG.baseUrl + endpoint;
    }

    if (endpoint.startsWith('http')) {
        return endpoint;
    }

    return window.DYNAMIC_CONFIG.baseUrl + endpoint;
};

console.log('✅ [DYNAMIC-CONFIG] Sistema de puertos dinámicos inicializado');