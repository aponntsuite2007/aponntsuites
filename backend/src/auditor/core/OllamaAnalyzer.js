/**
 * OLLAMA ANALYZER V2.0 - SISTEMA HÍBRIDO INTELIGENTE
 *
 * Sistema multi-nivel que se adapta automáticamente:
 * - NIVEL 1: Ollama local (desarrollo) - llama3.1:8b o deepseek-r1:8b
 * - NIVEL 2: Ollama externo (producción) - servidor dedicado
 * - NIVEL 3: OpenAI API (fallback) - GPT-4o-mini
 * - NIVEL 4: Análisis por patrones (última opción)
 *
 * @version 2.0.0
 * @date 2025-01-23
 */

const axios = require('axios');

class OllamaAnalyzer {
  constructor() {
    // Configuración Ollama local/externo
    this.ollamaLocal = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.ollamaExternal = process.env.OLLAMA_EXTERNAL_URL; // Servidor dedicado (Hetzner/Railway)
    this.preferredModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    // Timeout largo: 5 minutos para análisis complejo. Solo timeout si Ollama NO responde nada.
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT) || 300000; // 5 minutos

    // Configuración OpenAI fallback
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    // Modelos disponibles en orden de prioridad
    this.availableModels = ['llama3.1:8b', 'deepseek-r1:8b', 'llama3.1:3b', 'llama3.1:1b'];
  }

  /**
   * Verificar disponibilidad de Ollama (local o externo)
   */
  async checkAvailability() {
    // Intenta local primero
    try {
      const response = await axios.get(`${this.ollamaLocal}/api/tags`, { timeout: 5000 });
      if (response.status === 200) {
        console.log('✅ [OLLAMA] Local disponible');
        return { available: true, source: 'local', url: this.ollamaLocal };
      }
    } catch (error) {
      console.warn('⚠️  [OLLAMA] Local no disponible:', error.message);
    }

    // Intenta externo si está configurado
    if (this.ollamaExternal) {
      try {
        const response = await axios.get(`${this.ollamaExternal}/api/tags`, { timeout: 5000 });
        if (response.status === 200) {
          console.log('✅ [OLLAMA] Externo disponible');
          return { available: true, source: 'external', url: this.ollamaExternal };
        }
      } catch (error) {
        console.warn('⚠️  [OLLAMA] Externo no disponible:', error.message);
      }
    }

    return { available: false, source: null, url: null };
  }

  /**
   * Obtener modelo disponible óptimo
   */
  async getBestAvailableModel(ollamaUrl) {
    try {
      const response = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 5000 });
      const installedModels = response.data.models.map(m => m.name);

      // Buscar el mejor modelo disponible en orden de prioridad
      for (const model of this.availableModels) {
        if (installedModels.includes(model)) {
          return model;
        }
      }

      // Si ninguno coincide, usar el primero instalado
      return installedModels[0] || this.preferredModel;
    } catch (error) {
      return this.preferredModel;
    }
  }

  /**
   * Analizar error usando sistema híbrido de 4 niveles
   *
   * @param {Object} errorData - Datos del error
   * @returns {Object} - Diagnóstico con métricas completas
   */
  async analyzeError(errorData) {
    const { module_name, errors, error_context } = errorData;
    const startTime = Date.now();

    console.log(`  🧠 [ANALYZER] Analizando errores del módulo ${module_name}...`);

    // NIVEL 1 y 2: Intentar Ollama (local o externo)
    const ollamaCheck = await this.checkAvailability();
    if (ollamaCheck.available) {
      const ollamaResult = await this.analyzeWithOllama(
        errorData,
        ollamaCheck.url,
        ollamaCheck.source
      );

      if (ollamaResult) {
        ollamaResult.duration_ms = Date.now() - startTime;
        ollamaResult.timestamp = new Date().toISOString();
        return ollamaResult;
      }
    }

    // NIVEL 3: Intentar OpenAI API si está configurado
    if (this.openaiKey) {
      console.log('  🌐 [ANALYZER] Intentando con OpenAI API...');
      const openaiResult = await this.analyzeWithOpenAI(errorData);

      if (openaiResult) {
        openaiResult.duration_ms = Date.now() - startTime;
        openaiResult.timestamp = new Date().toISOString();
        return openaiResult;
      }
    }

    // NIVEL 4: Análisis por patrones (fallback final)
    console.log('  📋 [ANALYZER] Usando análisis por patrones (fallback)...');
    const patternResult = this.analyzeWithPatterns(errorData);
    patternResult.duration_ms = Date.now() - startTime;
    patternResult.timestamp = new Date().toISOString();

    return patternResult;
  }

  /**
   * Analizar con Ollama (local o externo)
   */
  async analyzeWithOllama(errorData, ollamaUrl, source) {
    const { module_name, errors, error_context } = errorData;

    try {
      // Obtener mejor modelo disponible
      const model = await this.getBestAvailableModel(ollamaUrl);
      console.log(`  🤖 [OLLAMA-${source.toUpperCase()}] Usando modelo: ${model}`);

      // Construir prompt
      const prompt = this.buildAnalysisPrompt(module_name, errors, error_context);

      // Llamar a Ollama
      const response = await axios.post(
        `${ollamaUrl}/api/generate`,
        {
          model: model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 500
          }
        },
        { timeout: this.timeout }
      );

      const diagnosis = response.data.response;

      // Calcular métricas de calidad
      const metrics = this.calculateDiagnosisMetrics(diagnosis, errors);

      console.log(`  ✅ [OLLAMA-${source.toUpperCase()}] Análisis completado`);
      console.log(`     Confidence: ${(metrics.confidence * 100).toFixed(1)}%`);
      console.log(`     Specificity: ${(metrics.specificity * 100).toFixed(1)}%`);

      return {
        diagnosis: diagnosis,
        confidence: metrics.confidence,
        specificity: metrics.specificity,
        actionable: metrics.actionable,
        source: source === 'local' ? 'ollama-local' : 'ollama-external',
        model: model,
        level: source === 'local' ? 1 : 2
      };

    } catch (error) {
      console.error(`❌ [OLLAMA-${source.toUpperCase()}] Error:`, error.message);
      return null;
    }
  }

  /**
   * Analizar con OpenAI API
   */
  async analyzeWithOpenAI(errorData) {
    const { module_name, errors, error_context } = errorData;

    try {
      const prompt = this.buildAnalysisPrompt(module_name, errors, error_context);

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.openaiModel,
          messages: [
            {
              role: 'system',
              content: 'Eres un experto en debugging de aplicaciones Node.js + Express + Sequelize + PostgreSQL. Proporciona diagnósticos técnicos concisos y precisos en español.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      const diagnosis = response.data.choices[0].message.content;
      const metrics = this.calculateDiagnosisMetrics(diagnosis, errors);

      console.log(`  ✅ [OPENAI] Análisis completado`);
      console.log(`     Confidence: ${(metrics.confidence * 100).toFixed(1)}%`);

      return {
        diagnosis: diagnosis,
        confidence: metrics.confidence,
        specificity: metrics.specificity,
        actionable: metrics.actionable,
        source: 'openai',
        model: this.openaiModel,
        level: 3
      };

    } catch (error) {
      console.error('❌ [OPENAI] Error:', error.message);
      return null;
    }
  }

  /**
   * Construir prompt para análisis
   */
  buildAnalysisPrompt(module_name, errors, error_context) {
    let prompt = `Eres un experto en debugging de aplicaciones web Node.js + Express + Sequelize + PostgreSQL.\n\n`;
    prompt += `CONTEXTO:\n`;
    prompt += `- Módulo afectado: ${module_name}\n`;
    prompt += `- Aplicación: Sistema biométrico de asistencia multi-tenant\n`;
    prompt += `- Stack: Node.js, Express, Sequelize, PostgreSQL, Puppeteer\n\n`;

    prompt += `ERRORES DETECTADOS:\n`;
    errors.forEach((error, index) => {
      prompt += `${index + 1}. Test: ${error.test}\n`;
      prompt += `   Error: ${error.error}\n`;
      if (error.suggestion) {
        prompt += `   Sugerencia: ${error.suggestion}\n`;
      }
      prompt += `\n`;
    });

    if (error_context) {
      if (error_context.http_errors && error_context.http_errors.length > 0) {
        prompt += `ERRORES HTTP:\n`;
        error_context.http_errors.forEach(err => {
          prompt += `- ${err.status} ${err.statusText}: ${err.url}\n`;
        });
        prompt += `\n`;
      }

      if (error_context.console_errors && error_context.console_errors.length > 0) {
        prompt += `ERRORES DE CONSOLA:\n`;
        error_context.console_errors.slice(0, 3).forEach(err => {
          prompt += `- ${err.message}\n`;
        });
        prompt += `\n`;
      }
    }

    prompt += `TAREA:\n`;
    prompt += `Analiza estos errores y proporciona:\n`;
    prompt += `1. Diagnóstico del problema (causa raíz)\n`;
    prompt += `2. Archivos que probablemente necesitan modificación\n`;
    prompt += `3. Tipo de fix requerido (código, configuración, base de datos)\n`;
    prompt += `4. Pasos específicos para reparar\n\n`;
    prompt += `Responde de forma concisa y técnica en español.`;

    return prompt;
  }

  /**
   * Análisis por patrones mejorado (NIVEL 4)
   */
  analyzeWithPatterns(errorData) {
    const { module_name, errors, error_context } = errorData;

    let diagnosis = `## Análisis por Patrones\n\n`;
    diagnosis += `**Módulo:** ${module_name}\n\n`;

    // Analizar patrones de errores HTTP
    if (error_context?.http_errors && error_context.http_errors.length > 0) {
      diagnosis += `### Errores HTTP Detectados\n\n`;

      const statusGroups = {};
      error_context.http_errors.forEach(err => {
        const statusType = Math.floor(err.status / 100);
        if (!statusGroups[statusType]) statusGroups[statusType] = [];
        statusGroups[statusType].push(err);
      });

      if (statusGroups[4]) {
        diagnosis += `- **4xx (Errores de Cliente)**: ${statusGroups[4].length} errores\n`;
        diagnosis += `  - Causa probable: Autenticación, permisos o validación\n`;
        diagnosis += `  - Archivos a revisar: routes/${module_name}.js, middleware/auth.js\n\n`;
      }

      if (statusGroups[5]) {
        diagnosis += `- **5xx (Errores de Servidor)**: ${statusGroups[5].length} errores\n`;
        diagnosis += `  - Causa probable: Error en código backend o base de datos\n`;
        diagnosis += `  - Archivos a revisar: routes/${module_name}.js, models/\n\n`;
      }
    }

    // Analizar patrones de errores de consola
    if (error_context?.console_errors && error_context.console_errors.length > 0) {
      diagnosis += `### Errores de Consola\n\n`;

      const errorPatterns = {
        'undefined': { count: 0, suggestion: 'Verificar inicialización de variables y propiedades' },
        'null': { count: 0, suggestion: 'Agregar validaciones null/undefined' },
        'TypeError': { count: 0, suggestion: 'Revisar tipos de datos y conversiones' },
        'ReferenceError': { count: 0, suggestion: 'Verificar imports y definiciones' },
        'SyntaxError': { count: 0, suggestion: 'Revisar sintaxis de JavaScript' }
      };

      error_context.console_errors.forEach(err => {
        for (const pattern in errorPatterns) {
          if (err.message.includes(pattern)) {
            errorPatterns[pattern].count++;
          }
        }
      });

      for (const [pattern, data] of Object.entries(errorPatterns)) {
        if (data.count > 0) {
          diagnosis += `- **${pattern}**: ${data.count} ocurrencias\n`;
          diagnosis += `  - Sugerencia: ${data.suggestion}\n\n`;
        }
      }
    }

    // Analizar errores de red
    if (error_context?.network_errors && error_context.network_errors.length > 0) {
      diagnosis += `### Errores de Red\n\n`;
      diagnosis += `- Total de fallos de red: ${error_context.network_errors.length}\n`;
      diagnosis += `- Causa probable: Endpoints no disponibles o timeouts\n`;
      diagnosis += `- Acción: Verificar que el servidor backend esté corriendo\n\n`;
    }

    // Sugerencias generales
    diagnosis += `### Recomendaciones\n\n`;
    diagnosis += `1. Revisar logs del servidor backend\n`;
    diagnosis += `2. Verificar permisos del usuario actual\n`;
    diagnosis += `3. Comprobar que el módulo "${module_name}" está activo en la empresa\n`;
    diagnosis += `4. Validar esquema de base de datos\n\n`;

    diagnosis += `---\n\n`;
    diagnosis += `*Nota: Este es un análisis automatizado por patrones. Para diagnóstico más preciso, considera usar Ollama o OpenAI.*`;

    return {
      diagnosis: diagnosis,
      confidence: 0.60,
      specificity: 0.45,
      actionable: true,
      source: 'pattern-analysis',
      model: 'rule-based',
      level: 4
    };
  }

  /**
   * Calcular métricas de calidad del diagnóstico
   */
  calculateDiagnosisMetrics(diagnosis, errors) {
    let confidence = 0.70; // Base confidence
    let specificity = 0.50;
    let actionable = false;

    // Verificar si menciona archivos específicos
    const mentionsFiles = /(\w+\.(js|ts|sql|json))|routes\/|models\/|src\//i.test(diagnosis);
    if (mentionsFiles) {
      confidence += 0.10;
      specificity += 0.20;
      actionable = true;
    }

    // Verificar si menciona líneas de código o números
    const mentionsLines = /línea \d+|line \d+|\d+:/i.test(diagnosis);
    if (mentionsLines) {
      confidence += 0.05;
      specificity += 0.15;
    }

    // Verificar si proporciona pasos específicos
    const mentionsSteps = /paso \d+|step \d+|\d\./i.test(diagnosis);
    if (mentionsSteps) {
      confidence += 0.05;
      specificity += 0.10;
      actionable = true;
    }

    // Verificar si menciona los errores originales
    // ✅ FIX: Verificar que err.error exista antes de llamar toLowerCase()
    const mentionsOriginalErrors = errors.some(err => {
      const errorText = err.error || err.error_message || err.message || '';
      if (!errorText) return false;
      const errorSnippet = errorText.toString().toLowerCase().substring(0, 30);
      return diagnosis.toLowerCase().includes(errorSnippet);
    });
    if (mentionsOriginalErrors) {
      confidence += 0.05;
    }

    // Verificar longitud y detalle
    if (diagnosis.length > 200) {
      specificity += 0.05;
    }

    // Limitar a 0-1
    confidence = Math.min(confidence, 1.0);
    specificity = Math.min(specificity, 1.0);

    return {
      confidence,
      specificity,
      actionable
    };
  }

  /**
   * Analizar código de archivo específico
   */
  async analyzeCode(filePath, errorContext) {
    const available = await this.isAvailable();
    if (!available) {
      return {
        suggestions: [],
        confidence: 0,
        source: 'fallback'
      };
    }

    const prompt = `Analiza este archivo que tiene errores:\n\nArchivo: ${filePath}\n\nContexto del error:\n${JSON.stringify(errorContext, null, 2)}\n\n¿Qué modificaciones recomiendas?`;

    try {
      const response = await axios.post(
        `${this.ollamaUrl}/api/generate`,
        {
          model: this.model,
          prompt: prompt,
          stream: false,
          options: { temperature: 0.3, num_predict: 300 }
        },
        { timeout: this.timeout }
      );

      return {
        suggestions: response.data.response,
        confidence: 0.8,
        source: 'ollama'
      };
    } catch (error) {
      console.error('❌ [OLLAMA] Error analizando código:', error.message);
      return {
        suggestions: [],
        confidence: 0,
        source: 'error'
      };
    }
  }

  /**
   * ============================================================================
   * DIAGNOSE - Analizar test fallido y proporcionar diagnosis para auto-repair
   * ============================================================================
   *
   * @param {Object} failedTest - Test fallido con error y stack trace
   * @returns {Object} Diagnosis con root_cause, suggested_fix, files_to_modify
   */
  async diagnose(failedTest) {
    console.log(`\n🧠 [OLLAMA DIAGNOSIS] Analizando test fallido: ${failedTest.test_name}...\n`);

    const prompt = `Eres un experto en debugging de tests E2E con Puppeteer.

Test fallido:
- Módulo: ${failedTest.module_name}
- Test: ${failedTest.test_name}
- Error: ${failedTest.error_message}
- Stack trace: ${failedTest.error_stack || 'N/A'}

Analiza el error y proporciona:
1. Causa raíz del problema (específica)
2. Solución sugerida (paso a paso)
3. Archivos a modificar (paths relativos)
4. Código de ejemplo del fix (si aplica)

Responde SOLO en formato JSON válido:
{
    "root_cause": "descripción específica de la causa raíz",
    "suggested_fix": "solución paso a paso",
    "files_to_modify": ["path/to/file1.js", "path/to/file2.html"],
    "fix_code_example": "código de ejemplo del fix"
}`;

    try {
      // Intentar análisis con Ollama
      const response = await this.query(prompt);

      // Intentar parsear JSON
      try {
        // Buscar JSON en la respuesta (puede estar envuelto en markdown)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const diagnosis = JSON.parse(jsonMatch[0]);

          console.log(`✅ [DIAGNOSIS] Causa raíz: ${diagnosis.root_cause?.substring(0, 100)}...`);
          console.log(`💡 [DIAGNOSIS] Solución: ${diagnosis.suggested_fix?.substring(0, 100)}...`);

          return {
            root_cause: diagnosis.root_cause || 'Análisis de error E2E en Puppeteer',
            suggested_fix: diagnosis.suggested_fix || 'Revisar selector y esperar correctamente',
            files_to_modify: diagnosis.files_to_modify || [],
            fix_code_example: diagnosis.fix_code_example || ''
          };
        }
      } catch (parseError) {
        console.warn('⚠️  [DIAGNOSIS] No se pudo parsear JSON, usando análisis por patrones...');
      }

      // Fallback: Análisis por patrones
      return this.diagnoseByPatterns(failedTest, response);

    } catch (error) {
      console.error('❌ [DIAGNOSIS] Error en análisis Ollama:', error.message);

      // Fallback final: Análisis por patrones sin Ollama
      return this.diagnoseByPatterns(failedTest, '');
    }
  }

  /**
   * Diagnosis por patrones (fallback cuando Ollama no responde JSON válido)
   */
  diagnoseByPatterns(failedTest, ollamaResponse) {
    const errorMsg = failedTest.error_message || '';
    const stack = failedTest.error_stack || '';

    let root_cause = 'Error en test E2E';
    let suggested_fix = 'Revisar el código del test y el frontend';
    let files_to_modify = [];

    // Patrón 1: Timeout / Selector no encontrado
    if (errorMsg.includes('timeout') || errorMsg.includes('waiting for selector') || errorMsg.includes('not found')) {
      root_cause = 'Selector no encontrado o timeout esperando elemento';
      suggested_fix = 'Verificar que el selector CSS es correcto y que el elemento existe. Aumentar timeout si es necesario. Usar waitForSelector antes de interactuar con el elemento.';
      files_to_modify = [
        `src/auditor/collectors/${this.capitalizeFirst(failedTest.module_name)}ModuleCollector.js`
      ];
    }

    // Patrón 2: Modal no se cerró
    else if (errorMsg.includes('modal') || errorMsg.includes('Modal')) {
      root_cause = 'Modal no se cerró correctamente después de la operación';
      suggested_fix = 'Verificar que el botón de cerrar/guardar funciona correctamente. Agregar verificación isModalVisible() después de guardar. Usar Escape key como fallback.';
      files_to_modify = [
        `src/auditor/collectors/${this.capitalizeFirst(failedTest.module_name)}ModuleCollector.js`,
        `public/js/modules/${failedTest.module_name}.js`
      ];
    }

    // Patrón 3: Click failed / Element not interactable
    else if (errorMsg.includes('click') || errorMsg.includes('not interactable')) {
      root_cause = 'Elemento no es clickeable (puede estar oculto, cubierto o no renderizado)';
      suggested_fix = 'Usar clickElement() helper con JS native click (.evaluate()). Verificar que el elemento está visible antes de hacer click. Esperar que termine cualquier animación.';
      files_to_modify = [
        `src/auditor/collectors/${this.capitalizeFirst(failedTest.module_name)}ModuleCollector.js`
      ];
    }

    // Patrón 4: Navigation / Page load
    else if (errorMsg.includes('navigation') || errorMsg.includes('page') || errorMsg.includes('load')) {
      root_cause = 'Error al navegar a la página o cargar contenido';
      suggested_fix = 'Verificar que la URL es correcta. Usar waitUntil: "networkidle2". Aumentar timeout de navegación. Verificar que el servidor está corriendo.';
      files_to_modify = [
        `src/auditor/collectors/${this.capitalizeFirst(failedTest.module_name)}ModuleCollector.js`
      ];
    }

    // Patrón 5: Type / Input
    else if (errorMsg.includes('type') || errorMsg.includes('input')) {
      root_cause = 'Error al escribir en input (input no encontrado o no editable)';
      suggested_fix = 'Verificar selector del input. Usar typeInInput() helper. Esperar que el input esté visible y enabled antes de escribir.';
      files_to_modify = [
        `src/auditor/collectors/${this.capitalizeFirst(failedTest.module_name)}ModuleCollector.js`
      ];
    }

    // Intentar extraer insights de Ollama response si existe
    if (ollamaResponse) {
      // Si Ollama mencionó algo útil, agregarlo
      if (ollamaResponse.includes('selector')) {
        root_cause += ' (Ollama sugiere revisar selectores)';
      }
      if (ollamaResponse.includes('async') || ollamaResponse.includes('await')) {
        root_cause += ' (Ollama detectó posible problema de async/await)';
      }
    }

    console.log(`🔍 [PATTERN DIAGNOSIS] ${root_cause}`);

    return {
      root_cause,
      suggested_fix,
      files_to_modify,
      fix_code_example: ''
    };
  }

  /**
   * Capitalizar primera letra
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = OllamaAnalyzer;
