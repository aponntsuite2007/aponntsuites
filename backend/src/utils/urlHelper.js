/**
 * URL Helper - Obtiene la BASE_URL correcta según el entorno
 *
 * Detecta automáticamente:
 * 1. Variable BASE_URL si está configurada
 * 2. Render (RENDER_EXTERNAL_HOSTNAME)
 * 3. Producción (NODE_ENV=production) → fallback a aponnt.onrender.com
 * 4. Desarrollo → localhost:9998
 */

function getBaseUrl() {
    // 1. Si hay BASE_URL configurado, usarlo
    if (process.env.BASE_URL) {
        return process.env.BASE_URL;
    }

    // 2. Si está en Render, usar el hostname externo
    if (process.env.RENDER_EXTERNAL_HOSTNAME) {
        return `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
    }

    // 3. Si está en producción (Render u otro), usar URL hardcoded
    if (process.env.RENDER || process.env.NODE_ENV === 'production') {
        return 'https://aponnt.onrender.com';
    }

    // 4. Desarrollo local
    return `http://localhost:${process.env.PORT || 9998}`;
}

/**
 * Obtiene la URL para el panel de empresa
 */
function getPanelEmpresaUrl() {
    return `${getBaseUrl()}/panel-empresa.html`;
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
