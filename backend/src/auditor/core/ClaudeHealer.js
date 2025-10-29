#!/usr/bin/env node

/**
 * ClaudeHealer - Healer que usa Claude API para generar fixes de código
 *
 * Capacidades:
 * - Analiza errores con Claude 3.5 Sonnet
 * - Genera código de reparación completo
 * - Aplica fixes automáticamente con backup
 * - Soporta errores de Frontend y Backend
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');

class ClaudeHealer {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
    this.maxTokens = parseInt(process.env.CLAUDE_MAX_TOKENS || '2048');
    this.temperature = parseFloat(process.env.CLAUDE_TEMPERATURE || '0.3');

    console.log('🤖 [CLAUDE-HEALER] Inicializado');
    console.log(`   Modelo: ${this.model}`);
    console.log(`   Max tokens: ${this.maxTokens}`);
  }

  /**
   * Verifica si este healer puede manejar el error
   */
  canHeal(failure) {
    // Claude puede intentar cualquier tipo de error
    // Pero solo si hay un error_message y file
    if (!failure.error_message) return false;
    if (!failure.file) return false;

    return true;
  }

  /**
   * Genera fixes para múltiples errores
   */
  async generateFixes(errors, execution_id) {
    console.log(`\n🔧 [CLAUDE-HEALER] Generando fixes para ${errors.length} errores...`);

    const fixes = [];

    for (let i = 0; i < errors.length; i++) {
      const error = errors[i];
      console.log(`\n   ${i + 1}/${errors.length} - ${error.module_name}: ${error.test_name}`);

      try {
        const fix = await this._generateSingleFix(error);

        if (fix) {
          fixes.push(fix);
          console.log(`   ✅ Fix generado (confidence: ${fix.confidence})`);
        } else {
          console.log(`   ⚠️  No se pudo generar fix (confidence < 0.8)`);
        }
      } catch (err) {
        console.error(`   ❌ Error generando fix: ${err.message}`);
      }

      // Rate limiting: esperar 1 segundo entre requests
      if (i < errors.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Guardar fixes en archivo JSON
    const fixesDir = path.join(__dirname, '../../../audit-reports');
    await fs.mkdir(fixesDir, { recursive: true });

    const fixesFile = path.join(fixesDir, `fixes-${execution_id}.json`);
    await fs.writeFile(fixesFile, JSON.stringify(fixes, null, 2), 'utf8');

    console.log(`\n✅ [CLAUDE-HEALER] ${fixes.length} fixes guardados en: ${fixesFile}`);

    return fixes;
  }

  /**
   * Genera un fix individual usando Claude API
   */
  async _generateSingleFix(error) {
    // Leer archivo con error
    let fileContent = '';
    try {
      fileContent = await fs.readFile(error.file, 'utf8');
    } catch (err) {
      console.error(`   ❌ No se pudo leer archivo: ${error.file}`);
      return null;
    }

    // Construir prompt detallado
    const prompt = `Analiza este error y genera un fix completo:

**ERROR**:
- Módulo: ${error.module_name}
- Test: ${error.test_name}
- Archivo: ${error.file}
- Línea: ${error.line || 'N/A'}
- Error: ${error.error_message}
${error.error_stack ? `- Stack: ${error.error_stack.substring(0, 500)}` : ''}

**CÓDIGO ACTUAL**:
\`\`\`javascript
${fileContent}
\`\`\`

**TAREA**:
Genera un fix completo para este error. Responde SOLO con un JSON válido (sin markdown):

{
  "diagnosis": "Descripción del problema",
  "solution": "Descripción de la solución",
  "confidence": 0.9,
  "action": "replace|insert|append",
  "file": "ruta/del/archivo.js",
  "line_number": 123,
  "search_string": "código a buscar (solo si action=replace)",
  "code": "código completo del fix",
  "explanation": "Por qué esta solución funciona"
}

**REGLAS**:
- action="replace" → Reemplazar search_string con code
- action="insert" → Insertar code en line_number
- action="append" → Agregar code al final del archivo
- search_string debe ser ÚNICO en el archivo (para replace)
- code debe ser código completo y funcional
- confidence debe ser 0.0-1.0 (solo acepto >= 0.8)
- Respeta indentación y estilo del código existente
- NO uses markdown, solo JSON puro`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const responseText = response.content[0].text.trim();

      // Limpiar markdown si viene envuelto
      let jsonText = responseText;
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }

      const fix = JSON.parse(jsonText);

      // Validar confidence
      if (fix.confidence < 0.8) {
        return null;
      }

      // Agregar metadata
      fix.error_id = error.id;
      fix.module_name = error.module_name;
      fix.test_name = error.test_name;
      fix.generated_at = new Date().toISOString();

      return fix;

    } catch (err) {
      console.error(`   ❌ Error llamando Claude API: ${err.message}`);
      return null;
    }
  }

  /**
   * Aplica un fix generado por Claude
   */
  async applyFix(fix) {
    console.log(`\n🔧 [CLAUDE-HEALER] Aplicando fix en: ${fix.file}`);
    console.log(`   Action: ${fix.action}`);
    console.log(`   Confidence: ${fix.confidence}`);

    try {
      // Crear backup
      await this._createBackup(fix.file);

      // Leer contenido actual
      let content = await fs.readFile(fix.file, 'utf8');

      // Aplicar fix según action
      switch (fix.action) {
        case 'replace':
          if (!content.includes(fix.search_string)) {
            throw new Error(`search_string no encontrado en archivo`);
          }
          content = content.replace(fix.search_string, fix.code);
          break;

        case 'insert':
          const lines = content.split('\n');
          lines.splice(fix.line_number, 0, fix.code);
          content = lines.join('\n');
          break;

        case 'append':
          content += '\n' + fix.code;
          break;

        default:
          throw new Error(`Action inválida: ${fix.action}`);
      }

      // Guardar archivo modificado
      await fs.writeFile(fix.file, content, 'utf8');

      console.log(`   ✅ Fix aplicado exitosamente`);

      return {
        success: true,
        file: fix.file,
        action: fix.action,
        backup: `${fix.file}.backup`
      };

    } catch (err) {
      console.error(`   ❌ Error aplicando fix: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Crea backup de archivo antes de modificar
   */
  async _createBackup(filePath) {
    const backupPath = `${filePath}.backup`;
    const content = await fs.readFile(filePath, 'utf8');
    await fs.writeFile(backupPath, content, 'utf8');
    console.log(`   📦 Backup creado: ${backupPath}`);
  }

  /**
   * Restaura archivo desde backup
   */
  async restoreBackup(filePath) {
    const backupPath = `${filePath}.backup`;
    try {
      const content = await fs.readFile(backupPath, 'utf8');
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`   ♻️  Archivo restaurado desde backup: ${filePath}`);
      return true;
    } catch (err) {
      console.error(`   ❌ Error restaurando backup: ${err.message}`);
      return false;
    }
  }

  /**
   * Limpia backups antiguos
   */
  async cleanupBackups(directory, daysOld = 7) {
    try {
      const files = await fs.readdir(directory);
      const backupFiles = files.filter(f => f.endsWith('.backup'));

      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;

      let deleted = 0;

      for (const file of backupFiles) {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          deleted++;
        }
      }

      console.log(`🧹 [CLAUDE-HEALER] ${deleted} backups antiguos eliminados`);

    } catch (err) {
      console.error(`❌ Error limpiando backups: ${err.message}`);
    }
  }
}

module.exports = ClaudeHealer;
