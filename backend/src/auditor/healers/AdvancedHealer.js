/**
 * ADVANCED HEALER - Sistema Avanzado de Auto-Reparación con IA
 *
 * Mejora del HybridHealer con capacidades extendidas:
 * - Auto-reparación de errores JavaScript comunes
 * - Detección de patrones anti-pattern y refactorización
 * - Reparación de SQL queries rotas
 * - Auto-aprendizaje de patrones de error recurrentes
 *
 * @version 2.0.0
 */

const fs = require('fs').promises;
const path = require('path');

class AdvancedHealer {
  constructor(database, systemRegistry) {
    this.database = database;
    this.registry = systemRegistry;
    this.learningDatabase = new Map(); // Cache de patrones aprendidos

    // Patrones extendidos de auto-reparación
    this.advancedPatterns = [
      // JavaScript Errors
      {
        id: 'undefined-variable',
        pattern: /(\w+) is not defined/,
        autoFix: true,
        strategy: 'fix-undefined-variable',
        confidence: 0.85
      },
      {
        id: 'promise-not-awaited',
        pattern: /Cannot read property.*of Promise/,
        autoFix: true,
        strategy: 'add-await-to-promise',
        confidence: 0.9
      },
      {
        id: 'callback-hell',
        pattern: /callback/i,
        autoFix: true,
        strategy: 'convert-to-async-await',
        confidence: 0.7
      },
      // SQL Errors
      {
        id: 'sql-column-not-exist',
        pattern: /column "?(\w+)"? does not exist/i,
        autoFix: true,
        strategy: 'fix-sql-column-name',
        confidence: 0.8
      },
      {
        id: 'sql-table-not-exist',
        pattern: /relation "?(\w+)"? does not exist/i,
        autoFix: false,
        strategy: 'suggest-create-table',
        confidence: 0.9
      },
      // Frontend Errors
      {
        id: 'dom-element-not-found',
        pattern: /Cannot read property.*of null.*querySelector/,
        autoFix: true,
        strategy: 'add-null-check-dom',
        confidence: 0.85
      },
      {
        id: 'module-not-loaded',
        pattern: /No se pudo navegar al módulo/,
        autoFix: true,
        strategy: 'fix-module-navigation',
        confidence: 0.75
      },
      // Función no existe
      {
        id: 'function-not-found',
        pattern: /(\w+) is not a function/,
        autoFix: true,
        strategy: 'create-missing-function',
        confidence: 0.7
      }
    ];
  }

  canHeal(failure) {
    if (!failure.error_message) return false;

    // Verificar si el error coincide con algún patrón avanzado
    const pattern = this._findBestPattern(failure.error_message);
    return pattern !== null;
  }

  async heal(failure, execution_id) {
    console.log(`  🔬 [ADVANCED-HEALER] Analizando fallo...`);

    const pattern = this._findBestPattern(failure.error_message);

    if (!pattern) {
      console.log(`  ⚠️  [ADVANCED-HEALER] No se encontró patrón aplicable`);
      return { success: false, reason: 'No matching pattern' };
    }

    console.log(`  ✅ [ADVANCED-HEALER] Patrón detectado: ${pattern.id} (confidence: ${pattern.confidence})`);

    if (pattern.autoFix && pattern.confidence >= 0.75) {
      return await this._autoRepair(failure, pattern, execution_id);
    } else {
      return await this._suggestFix(failure, pattern, execution_id);
    }
  }

  async _autoRepair(failure, pattern, execution_id) {
    console.log(`  🔧 [AUTO-REPAIR] Iniciando reparación automática...`);

    try {
      const repair = await this._generateRepair(failure, pattern);

      if (!repair) {
        return { success: false, reason: 'Could not generate repair' };
      }

      // Aplicar el repair
      if (repair.type === 'code-change' && failure.error_file) {
        await this._createBackup(failure.error_file);
        await this._applyCodeChange(failure.error_file, repair);
      } else if (repair.type === 'database-fix') {
        await this._applyDatabaseFix(repair);
      }

      // Registrar éxito
      console.log(`  ✅ [AUTO-REPAIR] Reparación aplicada: ${pattern.strategy}`);

      // Aprender de este éxito
      await this._learnFromSuccess(pattern, failure);

      return {
        success: true,
        type: 'auto-repair',
        strategy: pattern.strategy,
        confidence: pattern.confidence,
        changes_applied: repair
      };

    } catch (error) {
      console.error(`  ❌ [AUTO-REPAIR] Error:`, error.message);
      return { success: false, reason: error.message };
    }
  }

  async _generateRepair(failure, pattern) {
    switch (pattern.strategy) {
      case 'fix-undefined-variable':
        return await this._repairUndefinedVariable(failure);

      case 'add-await-to-promise':
        return await this._repairPromiseNotAwaited(failure);

      case 'convert-to-async-await':
        return await this._repairCallbackHell(failure);

      case 'fix-sql-column-name':
        return await this._repairSQLColumnName(failure);

      case 'add-null-check-dom':
        return await this._repairDOMNullAccess(failure);

      case 'fix-module-navigation':
        return await this._repairModuleNavigation(failure);

      case 'create-missing-function':
        return await this._repairMissingFunction(failure);

      default:
        return null;
    }
  }

  async _repairUndefinedVariable(failure) {
    const match = failure.error_message.match(/(\w+) is not defined/);
    if (!match) return null;

    const varName = match[1];

    // Buscar si es un typo de una variable cercana
    if (failure.error_file && failure.error_line) {
      const fileContent = await fs.readFile(failure.error_file, 'utf8');
      const lines = fileContent.split('\n');
      const contextStart = Math.max(0, failure.error_line - 10);
      const contextEnd = Math.min(lines.length, failure.error_line + 10);
      const context = lines.slice(contextStart, contextEnd).join('\n');

      // Buscar variables similares (Levenshtein distance)
      const similarVars = this._findSimilarVariables(varName, context);

      if (similarVars.length > 0) {
        const mostLikely = similarVars[0];
        return {
          type: 'code-change',
          action: 'replace',
          line: failure.error_line,
          find: varName,
          replace: mostLikely,
          reason: `Posible typo: ${varName} → ${mostLikely}`
        };
      }
    }

    // Si no es typo, sugerir declaración
    return {
      type: 'code-change',
      action: 'add-line',
      line: failure.error_line - 1,
      code: `const ${varName} = null; // TODO: Inicializar correctamente`,
      reason: `Variable ${varName} no estaba declarada`
    };
  }

  async _repairPromiseNotAwaited(failure) {
    if (!failure.error_file || !failure.error_line) return null;

    const fileContent = await fs.readFile(failure.error_file, 'utf8');
    const lines = fileContent.split('\n');
    const errorLine = lines[failure.error_line - 1];

    // Buscar llamadas que retornan Promise
    const promiseCalls = errorLine.match(/(\w+)\(/g);

    if (promiseCalls && promiseCalls.length > 0) {
      const fixed = errorLine.replace(/(\w+)\(/, 'await $1(');

      return {
        type: 'code-change',
        action: 'replace-line',
        line: failure.error_line,
        code: fixed,
        reason: 'Agregado await a Promise'
      };
    }

    return null;
  }

  async _repairCallbackHell(failure) {
    // Este es complejo - generar sugerencia en lugar de auto-fix
    return {
      type: 'suggestion',
      title: 'Convertir callbacks a async/await',
      description: 'Refactorizar código para usar async/await en lugar de callbacks anidados',
      example: `
// Antes:
fetchData((err, data) => {
  processData(data, (err, result) => {
    saveResult(result, (err) => {
      console.log('Done');
    });
  });
});

// Después:
async function handleData() {
  const data = await fetchData();
  const result = await processData(data);
  await saveResult(result);
  console.log('Done');
}
      `.trim()
    };
  }

  async _repairSQLColumnName(failure) {
    const match = failure.error_message.match(/column "?(\w+)"? does not exist/i);
    if (!match) return null;

    const wrongColumn = match[1];

    // Intentar encontrar el nombre correcto en la tabla
    // Esto requeriría inspeccionar el esquema de la BD
    return {
      type: 'suggestion',
      title: `Columna "${wrongColumn}" no existe`,
      description: `Verificar el nombre correcto de la columna en la tabla`,
      action: 'check-table-schema'
    };
  }

  async _repairDOMNullAccess(failure) {
    if (!failure.error_file || !failure.error_line) return null;

    const fileContent = await fs.readFile(failure.error_file, 'utf8');
    const lines = fileContent.split('\n');
    const errorLine = lines[failure.error_line - 1];

    // Buscar querySelector
    const match = errorLine.match(/(.+)\.querySelector\((.+)\)/);

    if (match) {
      const element = match[1];
      const selector = match[2];

      const fixed = `const el = ${element}.querySelector(${selector});\nif (el) { /* usar el */ }`;

      return {
        type: 'code-change',
        action: 'replace-line',
        line: failure.error_line,
        code: fixed,
        reason: 'Agregado null-check antes de acceder al elemento DOM'
      };
    }

    return null;
  }

  async _repairModuleNavigation(failure) {
    const match = failure.error_message.match(/No se pudo navegar al módulo (\w+)/);
    if (!match) return null;

    const moduleKey = match[1];
    const module = this.registry.getModule(moduleKey);

    if (!module) {
      return {
        type: 'suggestion',
        title: `Módulo "${moduleKey}" no existe en el registry`,
        description: 'Agregar el módulo al registry o verificar el nombre',
        action: 'add-to-registry'
      };
    }

    // Verificar que exista la función openModule
    return {
      type: 'code-change',
      action: 'verify-function-exists',
      function: 'openModule',
      parameter: moduleKey,
      reason: `Verificar que exista openModule('${moduleKey}') en panel-empresa.html`
    };
  }

  async _repairMissingFunction(failure) {
    const match = failure.error_message.match(/(\w+) is not a function/);
    if (!match) return null;

    const functionName = match[1];

    return {
      type: 'code-change',
      action: 'create-function',
      functionName,
      template: `
function ${functionName}() {
  // TODO: Implementar funcionalidad
  console.log('${functionName} llamado');
}
      `.trim(),
      reason: `Función ${functionName} no estaba definida`
    };
  }

  _findBestPattern(errorMessage) {
    if (!errorMessage) return null;

    let bestMatch = null;
    let highestConfidence = 0;

    for (const pattern of this.advancedPatterns) {
      if (pattern.pattern.test(errorMessage)) {
        if (pattern.confidence > highestConfidence) {
          highestConfidence = pattern.confidence;
          bestMatch = pattern;
        }
      }
    }

    return bestMatch;
  }

  _findSimilarVariables(target, context) {
    // Extraer todas las variables del contexto
    const varPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    const variables = new Set();
    let match;

    while ((match = varPattern.exec(context)) !== null) {
      variables.add(match[1]);
    }

    // Calcular Levenshtein distance y ordenar
    const scored = Array.from(variables)
      .map(v => ({
        name: v,
        distance: this._levenshtein(target, v)
      }))
      .filter(v => v.distance <= 3 && v.distance > 0) // Max 3 caracteres de diferencia
      .sort((a, b) => a.distance - b.distance);

    return scored.map(v => v.name);
  }

  _levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  async _createBackup(filePath) {
    const backupPath = `${filePath}.backup-${Date.now()}`;
    await fs.copyFile(filePath, backupPath);
    console.log(`  💾 [BACKUP] Creado: ${path.basename(backupPath)}`);
    return backupPath;
  }

  async _applyCodeChange(filePath, repair) {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');

    switch (repair.action) {
      case 'replace':
        lines[repair.line - 1] = lines[repair.line - 1].replace(repair.find, repair.replace);
        break;

      case 'replace-line':
        lines[repair.line - 1] = repair.code;
        break;

      case 'add-line':
        lines.splice(repair.line, 0, repair.code);
        break;

      case 'create-function':
        lines.push('', repair.template);
        break;
    }

    await fs.writeFile(filePath, lines.join('\n'), 'utf8');
    console.log(`  ✍️  [CODE-CHANGE] Aplicado: ${repair.reason}`);
  }

  async _applyDatabaseFix(repair) {
    console.log(`  🗄️  [DB-FIX] ${repair.description}`);
    // Aquí iría lógica para aplicar fixes de BD
  }

  async _suggestFix(failure, pattern, execution_id) {
    const repair = await this._generateRepair(failure, pattern);

    return {
      success: false,
      type: 'suggestion',
      pattern: pattern.id,
      confidence: pattern.confidence,
      suggestion: repair,
      requires_confirmation: true
    };
  }

  async _learnFromSuccess(pattern, failure) {
    const key = `${pattern.id}:${failure.error_message}`;

    if (!this.learningDatabase.has(key)) {
      this.learningDatabase.set(key, {
        pattern: pattern.id,
        successCount: 0,
        failCount: 0,
        lastSuccess: null
      });
    }

    const entry = this.learningDatabase.get(key);
    entry.successCount++;
    entry.lastSuccess = new Date();

    console.log(`  🧠 [LEARNING] Patrón ${pattern.id} ahora tiene ${entry.successCount} éxitos`);
  }
}

module.exports = AdvancedHealer;
