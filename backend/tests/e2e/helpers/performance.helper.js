/**
 * ═══════════════════════════════════════════════════════════
 * PERFORMANCE HELPER - Sistema Unificado de Métricas
 * ═══════════════════════════════════════════════════════════
 *
 * Funciones para medir y reportar performance:
 * - Tiempos de carga
 * - Tiempos de respuesta API
 * - Uso de memoria
 * - First Contentful Paint
 * - Time to Interactive
 */

/**
 * Medir tiempo de carga de página
 * @param {Page} page
 * @param {string} url
 * @returns {Promise<object>} Métricas de performance
 */
async function measurePageLoad(page, url) {
  const startTime = Date.now();

  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');

  const loadTime = Date.now() - startTime;

  // Obtener métricas del navegador
  const metrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0];
    return {
      domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
      domComplete: perf.domComplete,
      loadComplete: perf.loadEventEnd - perf.loadEventStart,
      firstPaint: performance.getEntriesByType('paint')
        .find(e => e.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByType('paint')
        .find(e => e.name === 'first-contentful-paint')?.startTime || 0
    };
  });

  const result = {
    url,
    totalLoadTime: loadTime,
    ...metrics
  };

  console.log(`\n⏱️  [PERFORMANCE] Page Load:`);
  console.log(`   URL: ${url}`);
  console.log(`   Total: ${loadTime}ms`);
  console.log(`   DOM Content Loaded: ${metrics.domContentLoaded}ms`);
  console.log(`   First Paint: ${metrics.firstPaint}ms`);
  console.log(`   FCP: ${metrics.firstContentfulPaint}ms\n`);

  return result;
}

/**
 * Medir tiempo de respuesta de API
 * @param {Page} page
 * @param {string} method - GET, POST, etc.
 * @param {string} endpoint
 * @param {object} options - Headers, body, etc.
 * @returns {Promise<object>} Métricas + respuesta
 */
async function measureAPIResponse(page, method, endpoint, options = {}) {
  const startTime = Date.now();

  const response = await page.request[method.toLowerCase()](endpoint, options);

  const responseTime = Date.now() - startTime;

  const result = {
    endpoint,
    method,
    responseTime,
    status: response.status(),
    ok: response.ok()
  };

  console.log(`\n⏱️  [PERFORMANCE] API Response:`);
  console.log(`   ${method} ${endpoint}`);
  console.log(`   Time: ${responseTime}ms`);
  console.log(`   Status: ${response.status()}\n`);

  return { ...result, response };
}

/**
 * Medir tiempo de una acción en la UI
 * @param {Function} action - Función async a medir
 * @param {string} actionName - Nombre descriptivo
 * @returns {Promise<{duration: number, result: any}>}
 */
async function measureAction(action, actionName) {
  console.log(`   ⏱️  Midiendo: ${actionName}...`);

  const startTime = Date.now();
  const result = await action();
  const duration = Date.now() - startTime;

  console.log(`   ✅ ${actionName}: ${duration}ms`);

  return { duration, result };
}

/**
 * Obtener métricas de memoria del navegador
 * @param {Page} page
 * @returns {Promise<object>} Uso de memoria
 */
async function getMemoryUsage(page) {
  const memory = await page.evaluate(() => {
    if (performance.memory) {
      return {
        usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024), // MB
        totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024), // MB
        jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) // MB
      };
    }
    return null;
  });

  if (memory) {
    console.log(`\n💾 [MEMORY] Usage:`);
    console.log(`   Used: ${memory.usedJSHeapSize}MB`);
    console.log(`   Total: ${memory.totalJSHeapSize}MB`);
    console.log(`   Limit: ${memory.jsHeapSizeLimit}MB\n`);
  }

  return memory;
}

/**
 * Medir tiempo de carga de un módulo específico
 * @param {Page} page
 * @param {string} moduleKey
 * @returns {Promise<number>} Tiempo en ms
 */
async function measureModuleLoad(page, moduleKey) {
  console.log(`   ⏱️  Midiendo carga de módulo: ${moduleKey}...`);

  const startTime = Date.now();

  // Navegar al módulo
  const selector = `[data-module="${moduleKey}"]`;
  await page.click(selector);

  // Esperar que cargue el contenido del módulo
  await page.waitForTimeout(500); // Wait mínimo para animaciones
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

  const loadTime = Date.now() - startTime;

  console.log(`   ✅ Módulo ${moduleKey} cargó en: ${loadTime}ms`);

  return loadTime;
}

/**
 * Generar reporte de performance
 * @param {object} metrics - Métricas recopiladas
 * @param {string} testName - Nombre del test
 * @returns {object} Reporte formateado
 */
function generatePerformanceReport(metrics, testName) {
  const report = {
    testName,
    timestamp: new Date().toISOString(),
    metrics,
    summary: {
      totalDuration: metrics.reduce((sum, m) => sum + (m.duration || 0), 0),
      avgDuration: 0,
      slowest: null,
      fastest: null
    }
  };

  if (metrics.length > 0) {
    const durations = metrics.map(m => m.duration || 0).filter(d => d > 0);
    report.summary.avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    report.summary.slowest = metrics.reduce((prev, curr) =>
      (curr.duration || 0) > (prev.duration || 0) ? curr : prev
    );
    report.summary.fastest = metrics.reduce((prev, curr) =>
      (curr.duration || 0) < (prev.duration || 0) && curr.duration > 0 ? curr : prev
    );
  }

  return report;
}

/**
 * Validar que métricas cumplan con umbrales
 * @param {object} metrics
 * @param {object} thresholds - Umbrales máximos
 * @returns {object} Resultado de validación
 */
function validateThresholds(metrics, thresholds) {
  const violations = [];

  if (thresholds.pageLoad && metrics.totalLoadTime > thresholds.pageLoad) {
    violations.push({
      metric: 'Page Load Time',
      value: metrics.totalLoadTime,
      threshold: thresholds.pageLoad,
      message: `Page load ${metrics.totalLoadTime}ms exceeds threshold ${thresholds.pageLoad}ms`
    });
  }

  if (thresholds.apiResponse && metrics.responseTime > thresholds.apiResponse) {
    violations.push({
      metric: 'API Response Time',
      value: metrics.responseTime,
      threshold: thresholds.apiResponse,
      message: `API response ${metrics.responseTime}ms exceeds threshold ${thresholds.apiResponse}ms`
    });
  }

  if (thresholds.moduleLoad && metrics.moduleLoadTime > thresholds.moduleLoad) {
    violations.push({
      metric: 'Module Load Time',
      value: metrics.moduleLoadTime,
      threshold: thresholds.moduleLoad,
      message: `Module load ${metrics.moduleLoadTime}ms exceeds threshold ${thresholds.moduleLoad}ms`
    });
  }

  if (thresholds.memory && metrics.usedJSHeapSize > thresholds.memory) {
    violations.push({
      metric: 'Memory Usage',
      value: metrics.usedJSHeapSize,
      threshold: thresholds.memory,
      message: `Memory usage ${metrics.usedJSHeapSize}MB exceeds threshold ${thresholds.memory}MB`
    });
  }

  return {
    passed: violations.length === 0,
    violations
  };
}

/**
 * Umbrales por defecto (buenos valores para tu sistema)
 */
const DEFAULT_THRESHOLDS = {
  pageLoad: 3000,      // < 3 segundos
  apiResponse: 500,    // < 500ms
  moduleLoad: 2000,    // < 2 segundos
  memory: 50,          // < 50MB
  firstPaint: 1500,    // < 1.5 segundos
  firstContentfulPaint: 2000  // < 2 segundos
};

module.exports = {
  measurePageLoad,
  measureAPIResponse,
  measureAction,
  getMemoryUsage,
  measureModuleLoad,
  generatePerformanceReport,
  validateThresholds,
  DEFAULT_THRESHOLDS
};
