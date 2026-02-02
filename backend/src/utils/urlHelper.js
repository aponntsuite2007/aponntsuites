/**
 * URL Helper - Obtiene la BASE_URL correcta según el entorno
 *
 * Detecta automáticamente:
 * 1. Variable APP_URL o BASE_URL si está configurada
 * 2. Render (RENDER_EXTERNAL_HOSTNAME)
 * 3. Producción (NODE_ENV=production) → www.aponnt.com
 * 4. Desarrollo → localhost:9998
 *
 * CONFIGURACIÓN:
 * - Producción: APP_URL=https://www.aponnt.com
 * - Desarrollo: APP_URL=http://localhost:9998 (o se detecta automáticamente)
 */

const PRODUCTION_URL = 'https://www.aponnt.com';
const DEVELOPMENT_URL = 'http://localhost:9998';

function getBaseUrl() {
    // 1. Si hay APP_URL o BASE_URL configurado, usarlo (APP_URL tiene prioridad)
    if (process.env.APP_URL) {
        return process.env.APP_URL.replace(/\/$/, ''); // Remove trailing slash
    }
    if (process.env.BASE_URL) {
        return process.env.BASE_URL.replace(/\/$/, '');
    }

    // 2. Si está en Render, usar el hostname externo
    if (process.env.RENDER_EXTERNAL_HOSTNAME) {
        return `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
    }

    // 3. Si está en producción (Render u otro), usar URL de producción
    if (process.env.RENDER || process.env.NODE_ENV === 'production') {
        return PRODUCTION_URL;
    }

    // 4. Desarrollo local
    return `http://localhost:${process.env.PORT || 9998}`;
}

/**
 * Obtiene la URL para el panel de empresa
 * @param {string} companySlug - Slug de la empresa (opcional)
 */
function getPanelEmpresaUrl(companySlug) {
    const base = `${getBaseUrl()}/panel-empresa.html`;
    return companySlug ? `${base}?empresa=${companySlug}` : base;
}

/**
 * Obtiene la URL para el panel administrativo
 */
function getPanelAdminUrl() {
    return `${getBaseUrl()}/panel-administrativo.html`;
}

/**
 * Obtiene la URL para el portal de proveedores
 */
function getSupplierPortalUrl() {
    return `${getBaseUrl()}/panel-proveedores.html`;
}

/**
 * Genera una URL pública para un presupuesto
 */
function getQuotePublicUrl(token) {
    return `${getBaseUrl()}/presupuesto/${token}`;
}

/**
 * Genera una URL de aceptación de EULA
 */
function getEulaAcceptUrl(token, quoteId) {
    return `${getBaseUrl()}/accept-eula.html?token=${token}&quote=${quoteId}`;
}

module.exports = {
    getBaseUrl,
    getPanelEmpresaUrl,
    getPanelAdminUrl,
    getSupplierPortalUrl,
    getQuotePublicUrl,
    getEulaAcceptUrl
};
