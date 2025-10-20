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

    // Patrones de errores SEGUROS (auto-fix)
    this.safePatterns = [
      {
        id: 'missing-import',
        pattern: /Cannot find module ['"](.+)['"]/,
        autoFix: true,
        strategy: 'add-import'
      },
      {
        id: 'typo-variable',
        pattern: /(\w+) is not defined/,
        autoFix: true,
        strategy: 'suggest-typo-fix'
      },
      {
        id: 'missing-semicolon',
        pattern: /Unexpected token/,
        autoFix: true,
        strategy: 'add-semicolon'
      },
      {
        id: 'async-await-missing',
        pattern: /await is only valid in async/,
        autoFix: true,
        strategy: 'add-async-keyword'
      }
    ];

    // Patrones de errores CRÍTICOS (requieren confirmación)
    this.criticalPatterns = [
      {
        id: 'logic-error',
        pattern: /Cannot read property ['"](\w+)['"] of undefined/,
        autoFix: false,
        strategy: 'suggest-null-check'
      },
      {
        id: 'database-error',
        pattern: /relation "(\w+)" does not exist/,
        autoFix: false,
        strategy: 'suggest-migration'
      },
      {
        id: 'jwt-expired',
        pattern: /jwt expired/,
        autoFix: false,
        strategy: 'suggest-token-refresh'
      }
    ];
  }

  canHeal(failure) {
    if (!failure.error_message) return false;

    // Verificar si coincide con algún patrón
    return this._findMatchingPattern(failure.error_message) !== null;
  }

  async heal(failure, execution_id) {
    const pattern = this._findMatchingPattern(failure.error_message);

    if (!pattern) {
      return { success: false, reason: 'No matching pattern' };
    }

    console.log(`  🔧 [HEALER] Patrón detectado: ${pattern.id}`);

    if (pattern.autoFix) {
      // Auto-fix automático para errores seguros
      return await this._applyAutoFix(failure, pattern, execution_id);
    } else {
      // Generar sugerencias para errores críticos
      return await this._generateSuggestions(failure, pattern, execution_id);
    }
  }

  async _applyAutoFix(failure, pattern, execution_id) {
    console.log(`  ⚡ [AUTO-FIX] Aplicando fix automático...`);

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

  async _generateSuggestions(failure, pattern, execution_id) {
    console.log(`  💡 [SUGGESTIONS] Generando sugerencias...`);

    const suggestions = [];

    switch (pattern.strategy) {
      case 'suggest-null-check':
        suggestions.push({
          title: 'Agregar validación null/undefined',
          description: 'Validar que el objeto exista antes de acceder a propiedades',
          code: await this._generateNullCheckFix(failure),
          risk: 'low',
          recommended: true
        });
        break;

      case 'suggest-migration':
        suggestions.push({
          title: 'Ejecutar migración de base de datos',
          description: 'La tabla no existe, necesita ejecutar migración',
          code: null,
          action: 'run-migration',
          risk: 'medium',
          recommended: true
        });
        break;

      case 'suggest-token-refresh':
        suggestions.push({
          title: 'Implementar renovación automática de token',
          description: 'Agregar lógica para renovar JWT cuando expire',
          code: await this._generateTokenRefreshFix(failure),
          risk: 'medium',
          recommended: true
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
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');

    switch (fix.type) {
      case 'add-line':
        lines.splice(fix.line - 1, 0, fix.code);
        break;

      case 'replace-line':
        lines[fix.line - 1] = fix.code;
        break;

      case 'add-to-line':
        lines[fix.line - 1] += fix.code;
        break;
    }

    await fs.writeFile(filePath, lines.join('\n'), 'utf8');
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
}

module.exports = HybridHealer;
