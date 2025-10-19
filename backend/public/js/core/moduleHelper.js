/**
 * MODULE HELPER - Frontend Plug & Play System
 *
 * Permite al frontend verificar qué módulos tiene contratados/activos la empresa
 * y mostrar/ocultar funcionalidades dinámicamente.
 *
 * @version 1.0.0
 * @date 2025-10-19
 */

// Cache de módulos activos (se actualiza cada vez que el usuario inicia sesión)
let cachedModules = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene los módulos activos de la empresa actual
 *
 * @returns {Promise<Array>} - Array de módulos activos
 */
async function getActiveModules() {
    try {
        // Usar cache si está disponible y no expiró
        if (cachedModules && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
            console.log('🔌 [MODULE-HELPER] Usando módulos cacheados');
            return cachedModules;
        }

        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            console.warn('⚠️ [MODULE-HELPER] No hay token de autenticación');
            return [];
        }

        const apiUrl = window.progressiveAdmin ?
            window.progressiveAdmin.getApiUrl('/api/v1/company-modules/active') :
            '/api/v1/company-modules/active';

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            cachedModules = data.modules || [];
            cacheTimestamp = Date.now();

            console.log(`✅ [MODULE-HELPER] ${cachedModules.length} módulos activos obtenidos`);
            return cachedModules;
        } else {
            console.warn('⚠️ [MODULE-HELPER] Error obteniendo módulos, usando lista vacía');
            return [];
        }
    } catch (error) {
        console.error('❌ [MODULE-HELPER] Error obteniendo módulos activos:', error);
        return [];
    }
}

/**
 * Verifica si un módulo específico está activo
 *
 * @param {string} moduleKey - Clave del módulo (ej: 'notifications-enterprise', 'roles-advanced')
 * @returns {Promise<boolean>} - true si el módulo está activo
 */
async function isModuleActive(moduleKey) {
    const modules = await getActiveModules();
    const isActive = modules.some(m => m.moduleKey === moduleKey);

    console.log(`🔍 [MODULE-HELPER] Módulo "${moduleKey}": ${isActive ? '✅ ACTIVO' : '❌ NO ACTIVO'}`);
    return isActive;
}

/**
 * Verifica múltiples módulos a la vez
 *
 * @param {string[]} moduleKeys - Array de claves de módulos
 * @returns {Promise<object>} - Objeto con estado de cada módulo
 */
async function checkMultipleModules(moduleKeys) {
    const modules = await getActiveModules();
    const results = {};

    moduleKeys.forEach(key => {
        results[key] = modules.some(m => m.moduleKey === key);
    });

    return results;
}

/**
 * Muestra u oculta un elemento según si el módulo está activo
 *
 * @param {string} elementId - ID del elemento HTML
 * @param {string} moduleKey - Clave del módulo requerido
 */
async function showIfModuleActive(elementId, moduleKey) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const isActive = await isModuleActive(moduleKey);
    element.style.display = isActive ? '' : 'none';
}

/**
 * Agrega un atributo data-module a elementos que requieren un módulo
 * Luego los muestra/oculta según disponibilidad
 *
 * Uso: <button data-module="notifications-enterprise">Notificar</button>
 */
async function applyModuleVisibility() {
    const elements = document.querySelectorAll('[data-module]');

    if (elements.length === 0) return;

    console.log(`🔌 [MODULE-HELPER] Aplicando visibilidad a ${elements.length} elementos`);

    const modules = await getActiveModules();
    const moduleKeys = modules.map(m => m.moduleKey);

    elements.forEach(element => {
        const requiredModule = element.getAttribute('data-module');
        const isActive = moduleKeys.includes(requiredModule);

        if (isActive) {
            element.style.display = '';
            element.removeAttribute('disabled');
        } else {
            element.style.display = 'none';
            element.setAttribute('disabled', 'true');
        }
    });
}

/**
 * Invalida el cache de módulos (útil después de actualizar licencia)
 */
function invalidateModuleCache() {
    cachedModules = null;
    cacheTimestamp = null;
    console.log('🔄 [MODULE-HELPER] Cache de módulos invalidado');
}

/**
 * Obtiene configuración de un módulo específico
 *
 * @param {string} moduleKey - Clave del módulo
 * @returns {Promise<object|null>} - Configuración del módulo o null
 */
async function getModuleConfiguration(moduleKey) {
    const modules = await getActiveModules();
    const module = modules.find(m => m.moduleKey === moduleKey);

    return module ? module.configuration : null;
}

// Exportar funciones globalmente
window.moduleHelper = {
    getActiveModules,
    isModuleActive,
    checkMultipleModules,
    showIfModuleActive,
    applyModuleVisibility,
    invalidateModuleCache,
    getModuleConfiguration
};

console.log('🔌 [MODULE-HELPER] Frontend Plug & Play System loaded');
