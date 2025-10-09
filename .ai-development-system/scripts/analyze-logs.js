#!/usr/bin/env node

/**
 * 🔬 LOG ANALYSIS SCRIPT
 * =====================
 * Analiza logs de Flutter/Android con detección inteligente de patrones
 */

const fs = require('fs');
const path = require('path');

class LogAnalyzer {
  constructor(logs) {
    this.logs = logs;
    this.lines = logs.split('\n').filter(line => line.trim().length > 0);
  }

  /**
   * Análisis completo de logs
   */
  analyze() {
    return {
      summary: this.getSummary(),
      errors: this.findErrors(),
      warnings: this.findWarnings(),
      success: this.findSuccess(),
      patterns: this.detectPatterns(),
      timeline: this.buildTimeline(),
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Resumen general
   */
  getSummary() {
    return {
      totalLines: this.lines.length,
      errorCount: this.findErrors().length,
      warningCount: this.findWarnings().length,
      successCount: this.findSuccess().length
    };
  }

  /**
   * Encontrar errores
   */
  findErrors() {
    const errorPatterns = [
      /❌/,
      /\[ERROR\]/i,
      /Exception/i,
      /Error:/i,
      /Failed/i,
      /Cannot/i,
      /no existe/i,
      /null check operator/i,
      /Connection refused/i,
      /timeout/i
    ];

    return this.lines.filter(line =>
      errorPatterns.some(pattern => pattern.test(line))
    ).map(line => ({
      line: line.trim(),
      type: this.classifyError(line),
      severity: this.getErrorSeverity(line)
    }));
  }

  /**
   * Clasificar tipo de error
   */
  classifyError(line) {
    if (line.includes('SharedPreferences') || line.includes('config_')) return 'CONFIG';
    if (line.includes('Connection') || line.includes('timeout')) return 'NETWORK';
    if (line.includes('null check') || line.includes('null pointer')) return 'NULL_ERROR';
    if (line.includes('database') || line.includes('SQL')) return 'DATABASE';
    if (line.includes('Camera') || line.includes('biometric')) return 'BIOMETRIC';
    if (line.includes('login') || line.includes('auth')) return 'AUTH';
    return 'UNKNOWN';
  }

  /**
   * Obtener severidad del error
   */
  getErrorSeverity(line) {
    if (line.includes('Fatal') || line.includes('Critical')) return 'CRITICAL';
    if (line.includes('Exception')) return 'HIGH';
    if (line.includes('Error')) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Encontrar advertencias
   */
  findWarnings() {
    const warningPatterns = [
      /⚠️/,
      /\[WARN\]/i,
      /Warning:/i,
      /Deprecated/i
    ];

    return this.lines.filter(line =>
      warningPatterns.some(pattern => pattern.test(line))
    ).map(line => line.trim());
  }

  /**
   * Encontrar mensajes de éxito
   */
  findSuccess() {
    const successPatterns = [
      /✅/,
      /\[SUCCESS\]/i,
      /Successfully/i,
      /OK/i,
      /Connected/i,
      /Initialized/i
    ];

    return this.lines.filter(line =>
      successPatterns.some(pattern => pattern.test(line))
    ).map(line => line.trim());
  }

  /**
   * Detectar patrones específicos del sistema
   */
  detectPatterns() {
    const patterns = {
      STARTUP: 0,
      LOGIN: 0,
      KIOSK: 0,
      CAMERA: 0,
      CAPTURE: 0,
      BIOMETRIC: 0,
      CONFIG: 0,
      DATABASE: 0,
      NETWORK: 0
    };

    this.lines.forEach(line => {
      if (line.includes('STARTUP')) patterns.STARTUP++;
      if (line.includes('LOGIN')) patterns.LOGIN++;
      if (line.includes('KIOSK')) patterns.KIOSK++;
      if (line.includes('Camera') || line.includes('cámara')) patterns.CAMERA++;
      if (line.includes('Capturando') || line.includes('Captured')) patterns.CAPTURE++;
      if (line.includes('biometric') || line.includes('facial')) patterns.BIOMETRIC++;
      if (line.includes('config') || line.includes('Config')) patterns.CONFIG++;
      if (line.includes('database') || line.includes('SQL')) patterns.DATABASE++;
      if (line.includes('http') || line.includes('request')) patterns.NETWORK++;
    });

    return patterns;
  }

  /**
   * Construir línea de tiempo de eventos
   */
  buildTimeline() {
    const events = [];

    this.lines.forEach(line => {
      // Detectar eventos importantes
      if (line.includes('STARTUP')) {
        events.push({ event: 'App Started', line: line.trim() });
      } else if (line.includes('LOGIN')) {
        events.push({ event: 'Login Attempt', line: line.trim() });
      } else if (line.includes('KIOSK')) {
        events.push({ event: 'Kiosk Screen', line: line.trim() });
      } else if (line.includes('Camera') && line.includes('inicializada')) {
        events.push({ event: 'Camera Initialized', line: line.trim() });
      } else if (line.includes('Capturando')) {
        events.push({ event: 'Face Capture', line: line.trim() });
      }
    });

    return events;
  }

  /**
   * Generar recomendaciones basadas en análisis
   */
  getRecommendations() {
    const recommendations = [];
    const errors = this.findErrors();
    const patterns = this.detectPatterns();

    // Recomendaciones por tipo de error
    const errorsByType = {};
    errors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    });

    if (errorsByType.CONFIG > 0) {
      recommendations.push({
        type: 'CONFIG',
        message: 'Revisar ConfigService y claves de SharedPreferences',
        priority: 'HIGH'
      });
    }

    if (errorsByType.NETWORK > 0) {
      recommendations.push({
        type: 'NETWORK',
        message: 'Verificar conectividad backend y URLs',
        priority: 'HIGH'
      });
    }

    if (errorsByType.NULL_ERROR > 0) {
      recommendations.push({
        type: 'NULL_ERROR',
        message: 'Agregar validaciones null-safety',
        priority: 'MEDIUM'
      });
    }

    if (patterns.CAMERA === 0 && patterns.KIOSK > 0) {
      recommendations.push({
        type: 'CAMERA',
        message: 'Cámara no se inicializó correctamente',
        priority: 'CRITICAL'
      });
    }

    if (patterns.CAPTURE === 0 && patterns.CAMERA > 0) {
      recommendations.push({
        type: 'CAPTURE',
        message: 'No hay capturas biométricas, revisar timer',
        priority: 'HIGH'
      });
    }

    return recommendations;
  }

  /**
   * Generar reporte en texto
   */
  generateReport() {
    const analysis = this.analyze();

    let report = '\n';
    report += '═'.repeat(60) + '\n';
    report += '  📊 REPORTE DE ANÁLISIS DE LOGS\n';
    report += '═'.repeat(60) + '\n\n';

    // Resumen
    report += '📈 RESUMEN:\n';
    report += `   Total líneas: ${analysis.summary.totalLines}\n`;
    report += `   ✅ Éxitos: ${analysis.summary.successCount}\n`;
    report += `   ❌ Errores: ${analysis.summary.errorCount}\n`;
    report += `   ⚠️  Advertencias: ${analysis.summary.warningCount}\n\n`;

    // Patrones detectados
    report += '🔍 PATRONES DETECTADOS:\n';
    Object.entries(analysis.patterns).forEach(([pattern, count]) => {
      if (count > 0) {
        report += `   ${pattern}: ${count}\n`;
      }
    });
    report += '\n';

    // Errores críticos
    if (analysis.errors.length > 0) {
      report += '🐛 ERRORES DETECTADOS:\n';
      const criticalErrors = analysis.errors.filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH');
      const displayErrors = criticalErrors.length > 0 ? criticalErrors : analysis.errors;

      displayErrors.slice(0, 10).forEach((error, i) => {
        report += `   ${i + 1}. [${error.type}][${error.severity}] ${error.line}\n`;
      });
      report += '\n';
    }

    // Línea de tiempo
    if (analysis.timeline.length > 0) {
      report += '⏱️  LÍNEA DE TIEMPO:\n';
      analysis.timeline.forEach((event, i) => {
        report += `   ${i + 1}. ${event.event}\n`;
      });
      report += '\n';
    }

    // Recomendaciones
    if (analysis.recommendations.length > 0) {
      report += '💡 RECOMENDACIONES:\n';
      analysis.recommendations.forEach((rec, i) => {
        report += `   ${i + 1}. [${rec.priority}] ${rec.message}\n`;
      });
      report += '\n';
    }

    report += '═'.repeat(60) + '\n';

    return report;
  }
}

/**
 * Analizar archivo de logs
 */
function analyzeLogFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Archivo no encontrado: ${filePath}`);
    return null;
  }

  const logs = fs.readFileSync(filePath, 'utf-8');
  const analyzer = new LogAnalyzer(logs);

  return analyzer.analyze();
}

/**
 * Analizar logs desde texto
 */
function analyzeLogs(logs) {
  const analyzer = new LogAnalyzer(logs);
  return analyzer.analyze();
}

// Si se ejecuta directamente
if (require.main === module) {
  const filePath = process.argv[2];

  if (!filePath) {
    console.log('Uso: node analyze-logs.js <archivo-logs>');
    process.exit(1);
  }

  const logs = fs.readFileSync(filePath, 'utf-8');
  const analyzer = new LogAnalyzer(logs);

  console.log(analyzer.generateReport());

  // Guardar JSON
  const analysis = analyzer.analyze();
  const outputPath = filePath.replace(/\.(txt|log)$/, '-analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
  console.log(`\n📄 Análisis guardado: ${outputPath}\n`);
}

module.exports = { LogAnalyzer, analyzeLogFile, analyzeLogs };
