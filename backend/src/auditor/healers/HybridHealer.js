/**
 * HYBRID HEALER - Sistema Híbrido de Auto-Reparación
 *
 * OPCIÓN 3: Híbrido
 * - Errores SEGUROS → Auto-fix automático (typos, imports, etc)
 * - Errores CRÍTICOS → Sugerir + Requiere confirmación
 *
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');

class HybridHealer {
  constructor(database, systemRegistry) {
    this.database = database;
    this.registry = systemRegistry;

    // ✅✅✅ MEGA-UPGRADE: 50+ PATRONES DE AUTO-REPARACIÓN ✅✅✅

    // Patrones de errores SEGUROS (auto-fix automático)
    this.safePatterns = [
      // ==================== JAVASCRIPT SYNTAX ERRORS (10 patrones) ====================
      {
        id: 'missing-import',
        pattern: /Cannot find module ['"](.+)['"]/,
        autoFix: true,
        strategy: 'add-import',
        scope: 'global'
      },
      {
        id: 'typo-variable',
        pattern: /(\w+) is not defined/,
        autoFix: true,
        strategy: 'suggest-typo-fix',
        scope: 'global'
      },
      {
        id: 'missing-semicolon',
        pattern: /Unexpected token/,
        autoFix: true,
        strategy: 'add-semicolon',
        scope: 'global'
      },
      {
        id: 'async-await-missing',
        pattern: /await is only valid in async/,
        autoFix: true,
        strategy: 'add-async-keyword',
        scope: 'global'
      },
      {
        id: 'missing-closing-brace',
        pattern: /Unexpected end of input/i,
        autoFix: true,
        strategy: 'add-closing-brace',
        scope: 'global'
      },
      {
        id: 'illegal-return',
        pattern: /Illegal return statement/i,
        autoFix: true,
        strategy: 'wrap-in-function',
        scope: 'global'
      },
      {
        id: 'missing-parenthesis',
        pattern: /Missing \) after argument list/i,
        autoFix: true,
        strategy: 'add-closing-parenthesis',
        scope: 'global'
      },
      {
        id: 'invalid-assignment',
        pattern: /Invalid left-hand side in assignment/i,
        autoFix: true,
        strategy: 'fix-assignment',
        scope: 'global'
      },
      {
        id: 'unexpected-identifier',
        pattern: /Unexpected identifier/i,
        autoFix: true,
        strategy: 'add-semicolon-before',
        scope: 'global'
      },
      {
        id: 'unexpected-token-colon',
        pattern: /Unexpected token ':'/i,
        autoFix: true,
        strategy: 'fix-object-syntax',
        scope: 'global'
      },

      // ==================== TYPOS COMUNES (10 patrones) ====================
      {
        id: 'typo-length',
        pattern: /Cannot read propert(?:y|ies) ['"]lenght['"] of/i,
        autoFix: true,
        strategy: 'fix-typo-lenght',
        scope: 'global'
      },
      {
        id: 'typo-children',
        pattern: /Cannot read propert(?:y|ies) ['"]childern['"] of/i,
        autoFix: true,
        strategy: 'fix-typo-childern',
        scope: 'global'
      },
      {
        id: 'typo-document',
        pattern: /documnet is not defined/i,
        autoFix: true,
        strategy: 'fix-typo-documnet',
        scope: 'global'
      },
      {
        id: 'typo-function',
        pattern: /funtion is not defined/i,
        autoFix: true,
        strategy: 'fix-typo-funtion',
        scope: 'global'
      },
      {
        id: 'typo-console',
        pattern: /consol is not defined/i,
        autoFix: true,
        strategy: 'fix-typo-consol',
        scope: 'global'
      },
      {
        id: 'typo-return',
        pattern: /retrun is not defined/i,
        autoFix: true,
        strategy: 'fix-typo-retrun',
        scope: 'global'
      },
      {
        id: 'typo-response',
        pattern: /responce is not defined/i,
        autoFix: true,
        strategy: 'fix-typo-responce',
        scope: 'global'
      },
      {
        id: 'typo-request',
        pattern: /requ est is not defined/i,
        autoFix: true,
        strategy: 'fix-typo-request',
        scope: 'global'
      },
      {
        id: 'typo-callback',
        pattern: /cal[l]?back is not defined/i,
        autoFix: true,
        strategy: 'fix-typo-callback',
        scope: 'global'
      },
      {
        id: 'typo-undefined',
        pattern: /undefind is not defined/i,
        autoFix: true,
        strategy: 'fix-typo-undefined',
        scope: 'global'
      },

      // ==================== IMPORTS/REQUIRES (5 patrones) ====================
      {
        id: 'missing-axios-import',
        pattern: /axios is not defined/i,
        autoFix: true,
        strategy: 'add-axios-import',
        scope: 'global'
      },
      {
        id: 'missing-react-import',
        pattern: /React is not defined/i,
        autoFix: true,
        strategy: 'add-react-import',
        scope: 'global'
      },
      {
        id: 'missing-lodash-import',
        pattern: /_ is not defined/i,
        autoFix: true,
        strategy: 'add-lodash-import',
        scope: 'global'
      },
      {
        id: 'missing-jquery-import',
        pattern: /\$ is not defined/i,
        autoFix: true,
        strategy: 'add-jquery-import',
        scope: 'global'
      },
      {
        id: 'missing-moment-import',
        pattern: /moment is not defined/i,
        autoFix: true,
        strategy: 'add-moment-import',
        scope: 'global'
      },

      // ==================== NULL/UNDEFINED CHECKS (5 patrones) ====================
      {
        id: 'property-of-undefined',
        pattern: /Cannot read propert(?:y|ies) ['"](\w+)['"] of undefined/i,
        autoFix: true,
        strategy: 'add-undefined-check',
        scope: 'global'
      },
      {
        id: 'property-of-null',
        pattern: /Cannot read propert(?:y|ies) ['"](\w+)['"] of null/i,
        autoFix: true,
        strategy: 'add-null-check',
        scope: 'global'
      },
      {
        id: 'cannot-set-property',
        pattern: /Cannot set propert(?:y|ies) ['"](\w+)['"] of undefined/i,
        autoFix: true,
        strategy: 'add-existence-check',
        scope: 'global'
      },
      {
        id: 'cannot-convert-undefined',
        pattern: /Cannot convert undefined or null to object/i,
        autoFix: true,
        strategy: 'add-object-check',
        scope: 'global'
      },
      {
        id: 'undefined-is-not-function',
        pattern: /undefined is not a function/i,
        autoFix: true,
        strategy: 'add-function-existence-check',
        scope: 'global'
      }
    ];

    // Patrones de errores CRÍTICOS/REVIEW (requieren confirmación o revisión)
    this.criticalPatterns = [
      // ==================== SYNTAX ERRORS (5 patrones) ====================
      {
        id: 'unexpected-token-syntax',
        pattern: /Unexpected token ['"]?\)?['"]?/i,
        autoFix: false,
        strategy: 'suggest-syntax-fix',
        scope: 'global'
      },
      {
        id: 'function-not-found',
        pattern: /(función|function) ['"]?(\w+)['"]? (no encontrada|not found|is not a function)/i,
        autoFix: false,
        strategy: 'suggest-function-fix',
        scope: 'global'
      },
      {
        id: 'module-not-implemented',
        pattern: /Módulo (\w+): (función no encontrada|no está implementado)/i,
        autoFix: false,
        strategy: 'suggest-module-implementation',
        scope: 'global'
      },
      {
        id: 'infinite-loading',
        pattern: /Módulo ([\w-]+): Se quedó cargando indefinidamente/i,
        autoFix: false,
        strategy: 'suggest-infinite-loading-fix',
        scope: 'global'
      },
      {
        id: 'logic-error',
        pattern: /Cannot read property ['"](\w+)['"] of undefined/,
        autoFix: false,
        strategy: 'suggest-null-check',
        scope: 'global'
      },

      // ==================== FILE/RESOURCE ERRORS (5 patrones) ====================
      {
        id: 'file-not-found-404',
        pattern: /ARCHIVO NO EXISTE: (.+\.js) \(HTTP 404\)/i,
        autoFix: true,
        strategy: 'auto-fix-missing-file',
        scope: 'global'
      },
      {
        id: 'http-500-server-error',
        pattern: /500 Internal Server Error/i,
        autoFix: false,
        strategy: 'suggest-check-backend-logs',
        scope: 'global'
      },
      {
        id: 'http-401-unauthorized',
        pattern: /401 Unauthorized/i,
        autoFix: true,
        strategy: 'refresh-auth-token',
        scope: 'global'
      },
      {
        id: 'http-403-forbidden',
        pattern: /403 Forbidden/i,
        autoFix: false,
        strategy: 'suggest-check-permissions',
        scope: 'global'
      },
      {
        id: 'http-503-unavailable',
        pattern: /503 Service Unavailable/i,
        autoFix: false,
        strategy: 'suggest-retry-later',
        scope: 'global'
      },

      // ==================== DATABASE ERRORS (5 patrones) ====================
      {
        id: 'database-schema-error',
        pattern: /column "(\w+)" (of relation "(\w+)" )?does not exist/i,
        autoFix: false,
        strategy: 'suggest-migration',
        scope: 'global'
      },
      {
        id: 'database-connection-error',
        pattern: /ECONNREFUSED.*postgres/i,
        autoFix: false,
        strategy: 'suggest-check-database',
        scope: 'global'
      },
      {
        id: 'database-timeout',
        pattern: /Query timeout/i,
        autoFix: false,
        strategy: 'suggest-optimize-query',
        scope: 'global'
      },
      {
        id: 'database-deadlock',
        pattern: /deadlock detected/i,
        autoFix: false,
        strategy: 'suggest-transaction-review',
        scope: 'global'
      },
      {
        id: 'database-constraint',
        pattern: /violates (foreign key|unique) constraint/i,
        autoFix: false,
        strategy: 'suggest-check-data',
        scope: 'global'
      },

      // ==================== PROMISE/ASYNC ERRORS (5 patrones) ====================
      {
        id: 'unhandled-promise-rejection',
        pattern: /UnhandledPromiseRejection/i,
        autoFix: true,
        strategy: 'add-catch-block',
        scope: 'global'
      },
      {
        id: 'promise-rejection-handled',
        pattern: /PromiseRejectionHandled/i,
        autoFix: true,
        strategy: 'add-promise-handler',
        scope: 'global'
      },
      {
        id: 'async-without-await',
        pattern: /async function.*without await/i,
        autoFix: true,
        strategy: 'add-await-keyword',
        scope: 'global'
      },
      {
        id: 'promise-chain-error',
        pattern: /Promise chain.*error/i,
        autoFix: false,
        strategy: 'suggest-promise-chain-review',
        scope: 'global'
      },
      {
        id: 'callback-hell',
        pattern: /callback.*callback.*callback/i,
        autoFix: false,
        strategy: 'suggest-promisify',
        scope: 'global'
      },

      // ==================== NETWORK/CORS ERRORS (5 patrones) ====================
      {
        id: 'cors-blocked',
        pattern: /blocked by CORS|Access-Control-Allow-Origin/i,
        autoFix: true,
        strategy: 'add-cors-headers',
        scope: 'global'
      },
      {
        id: 'network-connection-refused',
        pattern: /net::ERR_CONNECTION_REFUSED/i,
        autoFix: false,
        strategy: 'suggest-check-server-running',
        scope: 'global'
      },
      {
        id: 'network-timeout',
        pattern: /net::ERR_CONNECTION_TIMED_OUT/i,
        autoFix: false,
        strategy: 'suggest-increase-timeout',
        scope: 'global'
      },
      {
        id: 'network-dns-error',
        pattern: /net::ERR_NAME_NOT_RESOLVED/i,
        autoFix: false,
        strategy: 'suggest-check-dns',
        scope: 'global'
      },
      {
        id: 'network-ssl-error',
        pattern: /net::ERR_SSL_PROTOCOL_ERROR/i,
        autoFix: false,
        strategy: 'suggest-check-ssl-certificate',
        scope: 'global'
      },

      // ==================== MODULE/IMPORT ERRORS (5 patrones) ====================
      {
        id: 'module-not-found',
        pattern: /Cannot find module ['"](.+)['"]/i,
        autoFix: true,
        strategy: 'npm-install-module',
        scope: 'global'
      },
      {
        id: 'circular-dependency',
        pattern: /Circular dependency detected/i,
        autoFix: false,
        strategy: 'suggest-refactor-imports',
        scope: 'global'
      },
      {
        id: 'import-syntax-error',
        pattern: /import.*outside.*module/i,
        autoFix: true,
        strategy: 'add-type-module',
        scope: 'global'
      },
      {
        id: 'require-es-module',
        pattern: /require\(\) of ES Module/i,
        autoFix: true,
        strategy: 'convert-to-import',
        scope: 'global'
      },
      {
        id: 'dynamic-import-error',
        pattern: /Cannot use import statement outside a module/i,
        autoFix: true,
        strategy: 'fix-module-type',
        scope: 'global'
      },
      {
        id: 'database-table-error',
        pattern: /relation "(\w+)" does not exist/,
        autoFix: false,
        strategy: 'suggest-migration',
        scope: 'global' // ✅ SCHEMA DB: Afecta a TODAS las empresas (CREATE TABLE)
      },
      {
        id: 'database-data-type-error',
        pattern: /invalid input syntax for type (\w+)/i,
        autoFix: false,
        strategy: 'suggest-data-type-fix',
        scope: 'global' // ✅ SCHEMA DB: Tipo de datos erróneo afecta a TODAS
      },
      {
        id: 'tenant-config-error',
        pattern: /company_id (\d+) configuration (invalid|missing)/i,
        autoFix: false,
        strategy: 'suggest-tenant-config-fix',
        scope: 'tenant' // ⚠️  CONFIGURACIÓN: Solo afecta a la empresa actual
      },
      {
        id: 'tenant-module-disabled',
        pattern: /module ['"](\w+)['"] is not active for company (\d+)/i,
        autoFix: false,
        strategy: 'suggest-enable-module',
        scope: 'tenant' // ⚠️  CONFIGURACIÓN: Solo afecta a la empresa actual
      },
      {
        id: 'jwt-expired',
        pattern: /jwt expired/,
        autoFix: false,
        strategy: 'suggest-token-refresh',
        scope: 'session' // 🔄 SESIÓN: No requiere fix, solo refresh
      }
    ];
  }

  canHeal(failure) {
    if (!failure.error_message) return false;

    // Verificar si coincide con algún patrón
    return this._findMatchingPattern(failure.error_message) !== null;
  }

  async heal(failure, execution_id, company_id) {
    const pattern = this._findMatchingPattern(failure.error_message);

    if (!pattern) {
      return { success: false, reason: 'No matching pattern' };
    }

    console.log(`  🔧 [HEALER] Patrón detectado: ${pattern.id}`);

    // ✅ IDENTIFICAR SCOPE DEL FIX
    if (pattern.scope === 'global') {
      console.log(`  🌍 [SCOPE] GLOBAL - Fix afectará a TODAS las empresas (${pattern.id})`);
      console.log(`      Razón: ${this._getScopeReason(pattern)}`);
    } else if (pattern.scope === 'tenant') {
      console.log(`  🏢 [SCOPE] TENANT - Fix solo para empresa ${company_id || 'actual'} (${pattern.id})`);
      console.log(`      Razón: ${this._getScopeReason(pattern)}`);
    } else if (pattern.scope === 'session') {
      console.log(`  🔄 [SCOPE] SESSION - No requiere fix permanente (${pattern.id})`);
    }

    if (pattern.autoFix) {
      // Auto-fix automático para errores seguros
      return await this._applyAutoFix(failure, pattern, execution_id, company_id);
    } else {
      // Generar sugerencias para errores críticos
      return await this._generateSuggestions(failure, pattern, execution_id, company_id);
    }
  }

  _getScopeReason(pattern) {
    const reasons = {
      'database-schema-error': 'ALTER TABLE afecta schema global de PostgreSQL',
      'database-table-error': 'CREATE TABLE afecta schema global de PostgreSQL',
      'database-data-type-error': 'Tipo de datos incorrecto en schema global',
      'missing-import': 'Código compartido por todas las empresas',
      'typo-variable': 'Código compartido por todas las empresas',
      'tenant-config-error': 'Configuración específica de empresa en tabla companies',
      'tenant-module-disabled': 'Módulos activos específicos por empresa',
      'unexpected-token-syntax': 'Error de sintaxis JS en código global del frontend',
      'function-not-found': 'Función faltante en código JavaScript compartido',
      'module-not-implemented': 'Módulo del sistema sin implementación completa'
    };
    return reasons[pattern.id] || 'N/A';
  }

  async _applyAutoFix(failure, pattern, execution_id, company_id) {
    console.log(`  ⚡ [AUTO-FIX] Aplicando fix automático...`);

    // ⚠️ VALIDACIÓN DE SCOPE
    if (pattern.scope === 'global') {
      console.log(`  ⚠️  [WARNING] Este fix afectará a TODAS las empresas del sistema`);
    }

    try {
      const fix = await this._generateFix(failure, pattern);

      if (!fix) {
        return { success: false, reason: 'Could not generate fix' };
      }

      // Crear backup del archivo
      if (failure.error_file) {
        await this._createBackup(failure.error_file);
      }

      // Aplicar el fix
      await this._applyFix(failure.error_file, fix);

      // Registrar en AuditLog
      await failure.update({
        fix_attempted: true,
        fix_strategy: pattern.strategy,
        fix_applied: fix.code,
        fix_result: 'success',
        fix_rollback_available: true
      });

      console.log(`  ✅ [AUTO-FIX] Fix aplicado exitosamente`);

      return {
        success: true,
        type: 'auto-fix',
        strategy: pattern.strategy,
        code: fix.code,
        backup_created: true
      };

    } catch (error) {
      console.error(`  ❌ [AUTO-FIX] Error aplicando fix:`, error.message);

      await failure.update({
        fix_attempted: true,
        fix_strategy: pattern.strategy,
        fix_result: 'failed',
        error_message: `${failure.error_message}\n\nFix failed: ${error.message}`
      });

      return { success: false, reason: error.message };
    }
  }

  async _generateSuggestions(failure, pattern, execution_id, company_id) {
    console.log(`  💡 [SUGGESTIONS] Generando sugerencias...`);

    // ⚠️ INDICAR SCOPE EN SUGERENCIAS
    if (pattern.scope === 'global') {
      console.log(`  ⚠️  [WARNING] Las sugerencias afectan a TODAS las empresas`);
    } else if (pattern.scope === 'tenant') {
      console.log(`  🏢 [INFO] Las sugerencias solo afectan a empresa ${company_id || 'actual'}`);
    }

    const suggestions = [];

    switch (pattern.strategy) {
      case 'suggest-null-check':
        suggestions.push({
          title: 'Agregar validación null/undefined',
          description: 'Validar que el objeto exista antes de acceder a propiedades',
          code: await this._generateNullCheckFix(failure),
          risk: 'low',
          recommended: true,
          scope: pattern.scope, // ✅ SCOPE: global/tenant/session
          scope_description: this._getScopeReason(pattern)
        });
        break;

      case 'suggest-migration':
        suggestions.push({
          title: 'Ejecutar migración de base de datos',
          description: 'La tabla no existe, necesita ejecutar migración',
          code: null,
          action: 'run-migration',
          risk: 'medium',
          recommended: true,
          scope: pattern.scope, // ✅ SCOPE: global (afecta a TODAS las empresas)
          scope_description: this._getScopeReason(pattern)
        });
        break;

      case 'suggest-token-refresh':
        suggestions.push({
          title: 'Implementar renovación automática de token',
          description: 'Agregar lógica para renovar JWT cuando expire',
          code: await this._generateTokenRefreshFix(failure),
          risk: 'medium',
          recommended: true,
          scope: pattern.scope, // ✅ SCOPE: session (no requiere fix permanente)
          scope_description: this._getScopeReason(pattern)
        });
        break;

      case 'suggest-syntax-fix':
        suggestions.push({
          title: 'Corregir error de sintaxis JavaScript',
          description: `Error en archivo ${failure.error_file || 'unknown'} línea ${failure.error_line || 'unknown'}`,
          code: `// Revisar manualmente el archivo y buscar:\n// - Paréntesis sin cerrar o de más\n// - Llaves sin cerrar\n// - Comillas sin cerrar\n\n// Error detectado: ${failure.error_message}`,
          risk: 'high',
          recommended: true,
          scope: pattern.scope,
          scope_description: 'Error de sintaxis afecta carga del módulo completo'
        });
        break;

      case 'suggest-function-fix':
        suggestions.push({
          title: 'Implementar función faltante',
          description: `La función no existe o no está definida en el scope correcto`,
          code: `// Verificar que la función esté definida antes de ser llamada\n// O importarla si está en otro archivo\n\n// Error: ${failure.error_message}`,
          risk: 'high',
          recommended: true,
          scope: pattern.scope,
          scope_description: 'Función faltante impide funcionalidad del módulo'
        });
        break;

      case 'suggest-module-implementation':
        const moduleMatch = failure.error_message.match(/Módulo (\w+)/);
        const moduleName = moduleMatch ? moduleMatch[1] : 'unknown';
        suggestions.push({
          title: `Implementar funcionalidad faltante en módulo ${moduleName}`,
          description: `El módulo existe pero falta implementar funcionalidad específica`,
          code: `// El archivo /public/js/modules/${moduleName}.js existe\n// pero falta implementar la función que se está llamando.\n\n// Pasos:\n// 1. Abrir ${moduleName}.js\n// 2. Buscar la función que se está intentando llamar\n// 3. Implementarla o verificar que esté correctamente expuesta`,
          risk: 'high',
          recommended: true,
          scope: pattern.scope,
          scope_description: 'Módulo incompleto afecta funcionalidad del sistema'
        });
        break;

      case 'suggest-infinite-loading-fix':
        const infiniteModuleMatch = failure.error_message.match(/Módulo ([\w-]+):/);
        const infiniteModuleName = infiniteModuleMatch ? infiniteModuleMatch[1] : 'unknown';
        suggestions.push({
          title: `Corregir carga infinita en módulo ${infiniteModuleName}`,
          description: `El módulo se queda en estado "Cargando funcionalidades..." indefinidamente`,
          code: `// Posibles causas de carga infinita:
// 1. Error JavaScript que impide completar la inicialización
// 2. Promise sin resolver o await sin catch
// 3. Función de inicialización no elimina el spinner de carga
// 4. Dependencia no cargada o función externa faltante

// Pasos de diagnóstico:
// 1. Abrir /public/js/modules/${infiniteModuleName}.js
// 2. Buscar la función de inicialización (init, load, etc.)
// 3. Verificar que elimine el mensaje "Cargando funcionalidades de..."
// 4. Revisar Console Errors en el navegador (F12)
// 5. Verificar que todas las Promises tengan .catch()

// Ejemplo de fix típico:
/*
async function init() {
  const loadingElement = document.getElementById('loading-message');
  try {
    await fetchData(); // ← Esto puede fallar
    loadingElement.style.display = 'none'; // ← Nunca se ejecuta si falla
  } catch (error) {
    console.error(error);
    loadingElement.style.display = 'none'; // ✅ AGREGAR ESTO
    showError('No se pudo cargar el módulo');
  }
}
*/`,
          risk: 'high',
          recommended: true,
          scope: pattern.scope,
          scope_description: 'Módulo inaccesible debido a carga infinita, afecta UX completamente'
        });
        break;

      case 'suggest-file-not-found-fix':
        const fileMatch = failure.error_message.match(/ARCHIVO NO EXISTE: (.+\.js)/);
        const missingFileName = fileMatch ? fileMatch[1] : 'unknown.js';
        suggestions.push({
          title: `CRÍTICO: Archivo JavaScript no existe - ${missingFileName}`,
          description: `El servidor retorna HTTP 404 (Not Found) para este archivo. El módulo NO puede funcionar sin él.`,
          code: `// ❌ ERROR CRÍTICO: ARCHIVO FALTANTE
// Archivo que se busca: /public/js/modules/${missingFileName}
// HTTP Status: 404 Not Found

// 🔍 DIAGNÓSTICO:
// 1. Verificar si el archivo existe en /public/js/modules/
// 2. Revisar el nombre correcto del archivo (puede ser diferente)
// 3. Buscar archivos similares en la carpeta

// ✅ POSIBLES SOLUCIONES:

// SOLUCIÓN 1: El archivo tiene otro nombre
// Buscar archivos con nombre similar en /public/js/modules/
// Ejemplo: Si busca "biometric.js", puede que exista:
//   - biometric-attendance-module.js
//   - biometric-consent.js
// FIX: Renombrar o crear symlink/copia con el nombre correcto

// SOLUCIÓN 2: El archivo fue eliminado accidentalmente
// Restaurar desde backup o desde git:
// git checkout HEAD -- public/js/modules/${missingFileName}

// SOLUCIÓN 3: El módulo no fue implementado
// Crear el archivo mínimo viable:
/*
// File: /public/js/modules/${missingFileName}
(function() {
  'use strict';

  window.${missingFileName.replace('.js', '').replace(/-/g, '_')} = {
    init: function() {
      console.log('Módulo cargado correctamente');
      // Implementar funcionalidad aquí
    }
  };
})();
*/

// PRIORIDAD: CRÍTICA - El módulo NO funcionará hasta resolver esto`,
          risk: 'critical',
          recommended: true,
          scope: pattern.scope,
          scope_description: 'Archivo JavaScript faltante impide carga completa del módulo - ERROR 404'
        });
        break;
    }

    await failure.update({
      fix_attempted: false,
      fix_strategy: pattern.strategy,
      fix_result: 'not-attempted',
      suggestions
    });

    console.log(`  💡 [SUGGESTIONS] ${suggestions.length} sugerencias generadas`);

    return {
      success: false, // No se aplicó fix automático
      type: 'suggestions',
      suggestions,
      requires_confirmation: true
    };
  }

  async _generateFix(failure, pattern) {
    switch (pattern.strategy) {
      case 'add-import':
        return await this._generateImportFix(failure, pattern);

      case 'add-async-keyword':
        return await this._generateAsyncFix(failure);

      case 'add-semicolon':
        return await this._generateSemicolonFix(failure);

      case 'auto-fix-missing-file':
        return await this._generateMissingFileFix(failure, pattern);

      default:
        return null;
    }
  }

  async _generateImportFix(failure, pattern) {
    const match = failure.error_message.match(pattern.pattern);
    if (!match) return null;

    const moduleName = match[1];
    const importStatement = `const ${moduleName} = require('${moduleName}');\n`;

    return {
      type: 'add-line',
      line: 1, // Agregar al inicio del archivo
      code: importStatement
    };
  }

  async _generateAsyncFix(failure) {
    // Detectar la función que falta async
    const fileContent = await fs.readFile(failure.error_file, 'utf8');
    const lines = fileContent.split('\n');
    const errorLine = failure.error_line - 1;

    // Buscar la función que contiene esa línea
    for (let i = errorLine; i >= 0; i--) {
      if (lines[i].includes('function')) {
        return {
          type: 'replace-line',
          line: i + 1,
          code: lines[i].replace('function', 'async function')
        };
      }
    }

    return null;
  }

  async _generateSemicolonFix(failure) {
    return {
      type: 'add-to-line',
      line: failure.error_line,
      code: ';'
    };
  }

  async _generateNullCheckFix(failure) {
    const match = failure.error_message.match(/Cannot read property ['"](\w+)['"] of undefined/);
    if (!match) return null;

    const propertyName = match[1];

    // Generar código de validación
    return `
// Agregar antes de la línea ${failure.error_line}:
if (!objeto || typeof objeto !== 'object') {
  console.error('Objeto indefinido o inválido');
  return; // o manejar error apropiadamente
}

// Si es un objeto anidado, usar optional chaining:
const valor = objeto?.${propertyName};
`;
  }

  async _generateTokenRefreshFix(failure) {
    return `
// Agregar middleware de renovación de token:
async function refreshTokenMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Si el token expira en menos de 5 minutos, renovar
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    if (expiresIn < 300) {
      const newToken = jwt.sign(
        { id: decoded.id, email: decoded.email, company_id: decoded.company_id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      res.setHeader('X-New-Token', newToken);
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', renew: true });
    }
    next(error);
  }
}
`;
  }

  async _applyFix(filePath, fix) {
    const fs = require('fs').promises;

    switch (fix.type) {
      case 'copy-file':
        // Copiar archivo similar al nombre requerido
        await fs.copyFile(fix.source, fix.target);
        console.log(`  ✅ [COPY] ${fix.source} → ${fix.target}`);
        break;

      case 'create-file':
        // Crear archivo nuevo con contenido mínimo
        await fs.writeFile(fix.target, fix.content, 'utf8');
        console.log(`  ✅ [CREATE] ${fix.target}`);
        break;

      case 'add-line':
      case 'replace-line':
      case 'add-to-line':
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');

        if (fix.type === 'add-line') {
          lines.splice(fix.line - 1, 0, fix.code);
        } else if (fix.type === 'replace-line') {
          lines[fix.line - 1] = fix.code;
        } else if (fix.type === 'add-to-line') {
          lines[fix.line - 1] += fix.code;
        }

        await fs.writeFile(filePath, lines.join('\n'), 'utf8');
        break;

      default:
        console.log(`  ⚠️  [APPLY-FIX] Tipo de fix no soportado: ${fix.type}`);
    }
  }

  async _createBackup(filePath) {
    const backupPath = `${filePath}.backup-${Date.now()}`;
    await fs.copyFile(filePath, backupPath);
    console.log(`  💾 [BACKUP] Creado: ${backupPath}`);
    return backupPath;
  }

  _findMatchingPattern(errorMessage) {
    // Buscar en patrones seguros primero
    for (const pattern of this.safePatterns) {
      if (pattern.pattern.test(errorMessage)) {
        return pattern;
      }
    }

    // Luego en patrones críticos
    for (const pattern of this.criticalPatterns) {
      if (pattern.pattern.test(errorMessage)) {
        return pattern;
      }
    }

    return null;
  }

  async _generateMissingFileFix(failure, pattern) {
    const match = failure.error_message.match(/ARCHIVO NO EXISTE: (.+\.js)/);
    if (!match) return null;

    const missingFile = match[1];
    const path = require('path');
    const fs = require('fs').promises;

    console.log(`  🔍 [AUTO-FIX] Buscando archivo similar a: ${missingFile}`);

    // Buscar archivos con nombres similares en /public/js/modules/
    const modulesDir = path.join(process.cwd(), 'public', 'js', 'modules');

    try {
      const files = await fs.readdir(modulesDir);
      const baseName = missingFile.replace('.js', '');

      // Buscar archivos que contengan el nombre base
      const similarFiles = files.filter(f =>
        f.includes(baseName) && f.endsWith('.js')
      );

      console.log(`  📁 [SEARCH] Archivos encontrados con nombre similar:`);
      similarFiles.forEach((f, i) => {
        console.log(`      ${i+1}. ${f}`);
      });

      if (similarFiles.length === 1) {
        // Si solo hay un archivo similar, usarlo automáticamente
        const sourceFile = similarFiles[0];
        const sourcePath = path.join(modulesDir, sourceFile);
        const targetPath = path.join(modulesDir, missingFile);

        console.log(`  ✅ [AUTO-FIX] Se copiará: ${sourceFile} → ${missingFile}`);

        return {
          type: 'copy-file',
          source: sourcePath,
          target: targetPath,
          action: 'copy',
          description: `Copiar ${sourceFile} como ${missingFile}`
        };
      } else if (similarFiles.length > 1) {
        // Si hay múltiples archivos, sugerir el más similar
        console.log(`  ⚠️  [AUTO-FIX] Múltiples archivos similares, se requiere selección manual`);

        return {
          type: 'suggest-files',
          files: similarFiles,
          target: missingFile,
          action: 'suggest',
          description: `Se encontraron ${similarFiles.length} archivos similares. Seleccione cuál usar.`
        };
      } else {
        // No se encontraron archivos similares, crear uno vacío
        console.log(`  📝 [AUTO-FIX] No se encontraron archivos similares, se creará archivo mínimo`);

        const minimalModule = `/**
 * Módulo: ${baseName}
 * Auto-generado por el sistema de auto-reparación
 * Fecha: ${new Date().toISOString()}
 */

(function() {
  'use strict';

  // Inicialización del módulo
  window.${baseName.replace(/-/g, '_')} = {
    init: function() {
      console.log('[${baseName}] Módulo cargado correctamente');
      // TODO: Implementar funcionalidad específica del módulo
    },

    load: function() {
      this.init();
    }
  };

  // Auto-inicializar si el DOM está listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      if (window.${baseName.replace(/-/g, '_')}) {
        window.${baseName.replace(/-/g, '_')}.load();
      }
    });
  }
})();
`;

        return {
          type: 'create-file',
          target: path.join(modulesDir, missingFile),
          content: minimalModule,
          action: 'create',
          description: `Crear archivo ${missingFile} con estructura mínima`
        };
      }
    } catch (error) {
      console.error(`  ❌ [AUTO-FIX] Error buscando archivos: ${error.message}`);
      return null;
    }
  }
}

module.exports = HybridHealer;
