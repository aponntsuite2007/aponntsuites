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
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT) || 30000;

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
    const mentionsOriginalErrors = errors.some(err =>
      diagnosis.toLowerCase().includes(err.error.toLowerCase().substring(0, 30))
    );
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
}

module.exports = OllamaAnalyzer;
