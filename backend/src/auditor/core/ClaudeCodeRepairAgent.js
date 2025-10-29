/**
 * CLAUDE CODE REPAIR AGENT
 *
 * Agente que genera archivos de reparación (.repair.md) para Claude Code
 * Claude Code lee estos archivos y aplica las reparaciones
 *
 * Proceso:
 * 1. Recibe análisis de Ollama
 * 2. Identifica archivos afectados
 * 3. Genera archivo .repair.md con instrucciones detalladas
 * 4. Claude Code (si está activo) lee el archivo y repara
 * 5. Retorna acciones tomadas
 *
 * @version 1.0.0
 * @date 2025-01-23
 */

const fs = require('fs').promises;
const path = require('path');

class ClaudeCodeRepairAgent {
  constructor() {
    this.repairDir = path.join(__dirname, '../../../.claude-repairs');
    this.projectRoot = path.join(__dirname, '../../../');
  }

  /**
   * Intentar reparación basada en análisis de Ollama
   */
  async attemptRepair(errorData, ollamaAnalysis) {
    const { module_name, errors, error_context } = errorData;

    console.log(`  🛠️ [CLAUDE-REPAIR] Generando reparación para ${module_name}...`);

    try {
      // Crear directorio de reparaciones si no existe
      await this.ensureRepairDir();

      // Identificar archivos a reparar
      const filesToRepair = this.identifyFilesToRepair(module_name, errors, error_context);

      // Generar archivo de reparación
      const repairFileName = `${module_name}-${Date.now()}.repair.md`;
      const repairFilePath = path.join(this.repairDir, repairFileName);

      const repairInstructions = this.generateRepairInstructions(
        module_name,
        errors,
        error_context,
        ollamaAnalysis,
        filesToRepair
      );

      // Escribir archivo de reparación
      await fs.writeFile(repairFilePath, repairInstructions, 'utf-8');

      console.log(`  📝 [CLAUDE-REPAIR] Archivo de reparación creado: ${repairFileName}`);

      // Notificación a Claude Code (si está monitoreando el directorio)
      await this.notifyClaudeCode(repairFilePath);

      return {
        repair_file: repairFilePath,
        files_modified: filesToRepair,
        actions_taken: `Archivo de reparación generado: ${repairFileName}\n\nArchivos a reparar:\n${filesToRepair.map(f => `- ${f}`).join('\n')}\n\n**Esperando a Claude Code para aplicar reparación...**`,
        status: 'repair_generated'
      };

    } catch (error) {
      console.error('❌ [CLAUDE-REPAIR] Error generando reparación:', error);
      return {
        repair_file: null,
        files_modified: [],
        actions_taken: `Error generando reparación: ${error.message}`,
        status: 'error'
      };
    }
  }

  /**
   * Asegurar que existe el directorio de reparaciones
   */
  async ensureRepairDir() {
    try {
      await fs.access(this.repairDir);
    } catch (error) {
      await fs.mkdir(this.repairDir, { recursive: true });
      console.log(`  📁 [CLAUDE-REPAIR] Directorio de reparaciones creado: ${this.repairDir}`);
    }
  }

  /**
   * Identificar archivos que necesitan reparación
   */
  identifyFilesToRepair(module_name, errors, error_context) {
    const files = [];

    // Archivos del módulo frontend
    const frontendFile = `public/js/modules/${module_name}.js`;
    files.push(frontendFile);

    // Archivo de rutas si hay errores HTTP
    if (error_context && error_context.http_errors && error_context.http_errors.length > 0) {
      const routeFile = `src/routes/${module_name}Routes.js`;
      files.push(routeFile);
    }

    // Archivo de modelo si hay errores de BD
    const modelFile = `src/models/${this.capitalize(module_name)}.js`;
    files.push(modelFile);

    return files;
  }

  /**
   * Generar instrucciones de reparación en formato Markdown
   */
  generateRepairInstructions(module_name, errors, error_context, ollamaAnalysis, filesToRepair) {
    let md = `# REPAIR REQUEST - ${module_name.toUpperCase()}\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n`;
    md += `**Module:** ${module_name}\n`;
    md += `**Priority:** HIGH\n\n`;
    md += `---\n\n`;

    // Diagnóstico de Ollama
    md += `## 🧠 Ollama Analysis\n\n`;
    md += `**Confidence:** ${(ollamaAnalysis.confidence * 100).toFixed(1)}%\n`;
    md += `**Source:** ${ollamaAnalysis.source}\n\n`;
    md += `### Diagnosis:\n\n`;
    md += `${ollamaAnalysis.diagnosis}\n\n`;
    md += `---\n\n`;

    // Errores detectados
    md += `## ❌ Detected Errors\n\n`;
    errors.forEach((error, index) => {
      md += `### ${index + 1}. ${error.test}\n\n`;
      md += `**Error:** ${error.error}\n\n`;
      if (error.suggestion) {
        md += `**Suggestion:** ${error.suggestion}\n\n`;
      }
    });
    md += `---\n\n`;

    // Contexto de errores
    if (error_context) {
      md += `## 🔍 Error Context\n\n`;

      if (error_context.http_errors && error_context.http_errors.length > 0) {
        md += `### HTTP Errors:\n\n`;
        error_context.http_errors.forEach(err => {
          md += `- **${err.status} ${err.statusText}**: \`${err.url}\`\n`;
        });
        md += `\n`;
      }

      if (error_context.console_errors && error_context.console_errors.length > 0) {
        md += `### Console Errors:\n\n`;
        md += `\`\`\`\n`;
        error_context.console_errors.slice(0, 5).forEach(err => {
          md += `${err.message}\n`;
        });
        md += `\`\`\`\n\n`;
      }

      if (error_context.network_errors && error_context.network_errors.length > 0) {
        md += `### Network Errors:\n\n`;
        error_context.network_errors.slice(0, 5).forEach(err => {
          md += `- **${err.error}**: \`${err.url}\`\n`;
        });
        md += `\n`;
      }

      md += `---\n\n`;
    }

    // Archivos a reparar
    md += `## 📁 Files to Repair\n\n`;
    filesToRepair.forEach(file => {
      md += `- \`${file}\`\n`;
    });
    md += `\n`;
    md += `---\n\n`;

    // Instrucciones para Claude Code
    md += `## 🤖 Instructions for Claude Code\n\n`;
    md += `**IMPORTANT:** This is an automated repair request from the Auditor System.\n\n`;
    md += `### Steps to Fix:\n\n`;
    md += `1. **Read the files** listed above\n`;
    md += `2. **Analyze the errors** and Ollama's diagnosis\n`;
    md += `3. **Apply fixes** based on the suggestions\n`;
    md += `4. **Test the module** after applying fixes\n`;
    md += `5. **Report results** in this file (append your actions below)\n\n`;

    md += `### Common Fix Patterns:\n\n`;
    md += `- **401/403 errors**: Check authentication, token handling\n`;
    md += `- **500 errors**: Check server-side logic, database queries\n`;
    md += `- **Console errors**: Check JavaScript syntax, undefined variables\n`;
    md += `- **Network errors**: Check endpoints, CORS, network connectivity\n`;
    md += `- **Modal not opening**: Check modal ID, Bootstrap initialization\n`;
    md += `- **Buttons not working**: Check onclick handlers, event listeners\n\n`;

    md += `---\n\n`;
    md += `## 📝 Claude Code Report\n\n`;
    md += `**Status:** Pending\n\n`;
    md += `*(Claude Code: Please append your repair actions and results below)*\n\n`;
    md += `\`\`\`\n`;
    md += `Actions taken:\n`;
    md += `- \n\n`;
    md += `Files modified:\n`;
    md += `- \n\n`;
    md += `Test results:\n`;
    md += `- \n\n`;
    md += `Status: [SUCCESS / PARTIAL / FAILED]\n`;
    md += `\`\`\`\n`;

    return md;
  }

  /**
   * Notificar a Claude Code sobre nuevo archivo de reparación
   */
  async notifyClaudeCode(repairFilePath) {
    // Crear archivo de notificación
    const notificationFile = path.join(this.repairDir, '.pending-repairs');

    try {
      let pendingRepairs = [];

      // Leer reparaciones pendientes existentes
      try {
        const content = await fs.readFile(notificationFile, 'utf-8');
        pendingRepairs = JSON.parse(content);
      } catch (error) {
        // Archivo no existe o está vacío
      }

      // Agregar nueva reparación
      pendingRepairs.push({
        file: path.basename(repairFilePath),
        timestamp: new Date().toISOString(),
        status: 'pending'
      });

      // Guardar
      await fs.writeFile(notificationFile, JSON.stringify(pendingRepairs, null, 2), 'utf-8');

      console.log(`  🔔 [CLAUDE-REPAIR] Notificación enviada a Claude Code`);
    } catch (error) {
      console.error('⚠️  [CLAUDE-REPAIR] Error notificando:', error.message);
    }
  }

  /**
   * Verificar si Claude Code completó la reparación
   */
  async checkRepairStatus(repairFilePath) {
    try {
      const content = await fs.readFile(repairFilePath, 'utf-8');

      // Buscar la sección de reporte de Claude Code
      const reportMatch = content.match(/Status: \[(SUCCESS|PARTIAL|FAILED)\]/);

      if (reportMatch) {
        const status = reportMatch[1];
        return {
          completed: true,
          status: status.toLowerCase(),
          report: content
        };
      }

      return {
        completed: false,
        status: 'pending',
        report: null
      };
    } catch (error) {
      console.error('❌ [CLAUDE-REPAIR] Error verificando estado:', error);
      return {
        completed: false,
        status: 'error',
        report: null
      };
    }
  }

  /**
   * Capitalizar primera letra
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = ClaudeCodeRepairAgent;
