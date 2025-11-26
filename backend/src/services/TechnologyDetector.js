/**
 * ============================================================================
 * TECHNOLOGY DETECTOR - DETECCIÓN AUTOMÁTICA DE STACK TECNOLÓGICO
 * ============================================================================
 *
 * PROPÓSITO:
 * - Analizar código fuente automáticamente
 * - Detectar tecnologías usadas (frameworks, librerías, APIs, services)
 * - Generar descripción técnica (para programadores)
 * - Generar descripción marketing (para empresas/staff)
 * - Auto-actualizar cuando se agregan nuevas tecnologías
 *
 * EJEMPLOS:
 * - Detecta "require('azure-cognitiveservices-face')" → Azure Face API
 * - Detecta "Sequelize" → PostgreSQL ORM
 * - Detecta "socket.io" → WebSocket en tiempo real
 *
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

class TechnologyDetector {
  constructor() {
    this.backendRoot = path.join(__dirname, '../..');

    // Diccionario de tecnologías conocidas
    this.techDictionary = {
      // Backend - Node.js
      'express': {
        name: 'Express.js',
        category: 'backend',
        description: 'Framework web minimalista y flexible para Node.js',
        marketing: 'API REST robusta y escalable',
        icon: '⚡'
      },
      'sequelize': {
        name: 'Sequelize ORM',
        category: 'database',
        description: 'ORM moderno para PostgreSQL, MySQL, SQLite y SQL Server',
        marketing: 'Base de datos empresarial con integridad referencial',
        icon: '🗄️'
      },
      'socket.io': {
        name: 'Socket.IO',
        category: 'realtime',
        description: 'Biblioteca para comunicación en tiempo real bidireccional',
        marketing: 'Actualizaciones en tiempo real sin recargar',
        icon: '⚡'
      },
      'bcrypt': {
        name: 'bcrypt',
        category: 'security',
        description: 'Hashing seguro de contraseñas con salt',
        marketing: 'Seguridad bancaria para sus datos',
        icon: '🔒'
      },
      'jsonwebtoken': {
        name: 'JWT (JSON Web Tokens)',
        category: 'security',
        description: 'Tokens seguros para autenticación stateless',
        marketing: 'Autenticación segura sin comprometer velocidad',
        icon: '🔐'
      },
      'multer': {
        name: 'Multer',
        category: 'storage',
        description: 'Middleware para upload de archivos multipart/form-data',
        marketing: 'Carga de documentos y fotos sin límites',
        icon: '📁'
      },
      'nodemailer': {
        name: 'Nodemailer',
        category: 'communication',
        description: 'Envío de emails desde Node.js',
        marketing: 'Notificaciones automáticas por email',
        icon: '📧'
      },

      // AI & Machine Learning
      'azure-cognitiveservices-face': {
        name: 'Azure Face API',
        category: 'ai',
        description: 'Reconocimiento facial con IA de Microsoft Azure',
        marketing: 'Reconocimiento facial de nivel empresarial',
        icon: '🤖'
      },
      'ollama': {
        name: 'Ollama (Llama 3.1)',
        category: 'ai',
        description: 'LLM local para asistencia inteligente',
        marketing: 'Asistente IA 100% privado',
        icon: '🧠'
      },
      '@tensorflow': {
        name: 'TensorFlow.js',
        category: 'ai',
        description: 'Machine Learning en JavaScript',
        marketing: 'Inteligencia artificial integrada',
        icon: '🤖'
      },

      // Frontend
      'chart.js': {
        name: 'Chart.js',
        category: 'frontend',
        description: 'Gráficos interactivos HTML5',
        marketing: 'Visualización de datos profesional',
        icon: '📊'
      },
      'three.js': {
        name: 'Three.js',
        category: 'frontend',
        description: 'Gráficos 3D con WebGL',
        marketing: 'Dashboards 3D interactivos',
        icon: '🎨'
      },
      'fullcalendar': {
        name: 'FullCalendar',
        category: 'frontend',
        description: 'Calendario interactivo full-featured',
        marketing: 'Calendarios intuitivos y profesionales',
        icon: '📅'
      },
      'frappe-gantt': {
        name: 'Frappe Gantt',
        category: 'frontend',
        description: 'Diagramas Gantt interactivos',
        marketing: 'Gestión de proyectos visual',
        icon: '📊'
      },

      // Database
      'pg': {
        name: 'PostgreSQL',
        category: 'database',
        description: 'Base de datos relacional de código abierto más avanzada',
        marketing: 'Base de datos empresarial confiable',
        icon: '🐘'
      },
      'redis': {
        name: 'Redis',
        category: 'database',
        description: 'Base de datos en memoria para cache y sessions',
        marketing: 'Velocidad extrema en procesamiento',
        icon: '⚡'
      },

      // APIs & Services
      'axios': {
        name: 'Axios',
        category: 'api',
        description: 'Cliente HTTP basado en promesas',
        marketing: 'Integración con servicios externos',
        icon: '🔌'
      },
      'cors': {
        name: 'CORS',
        category: 'api',
        description: 'Cross-Origin Resource Sharing middleware',
        marketing: 'Acceso seguro desde cualquier dispositivo',
        icon: '🌐'
      },

      // Testing
      'jest': {
        name: 'Jest',
        category: 'testing',
        description: 'Framework de testing con cobertura integrada',
        marketing: 'Calidad garantizada con tests automáticos',
        icon: '✅'
      },
      'playwright': {
        name: 'Playwright',
        category: 'testing',
        description: 'Testing E2E multi-browser',
        marketing: 'Probado en todos los navegadores',
        icon: '🎭'
      },

      // DevOps
      'docker': {
        name: 'Docker',
        category: 'devops',
        description: 'Containerización de aplicaciones',
        marketing: 'Deploy rápido en cualquier servidor',
        icon: '🐳'
      },
      'pm2': {
        name: 'PM2',
        category: 'devops',
        description: 'Process manager para Node.js',
        marketing: '99.9% uptime garantizado',
        icon: '⚙️'
      }
    };
  }

  /**
   * ============================================================================
   * ANÁLISIS PRINCIPAL
   * ============================================================================
   */

  /**
   * Analiza un módulo específico y detecta tecnologías
   * @param {string} moduleKey - Clave del módulo
   * @param {Object} moduleData - Datos del módulo del metadata
   * @returns {Object} Tecnologías detectadas
   */
  async analyzeModule(moduleKey, moduleData) {
    console.log(`\n🔍 [TECH DETECTOR] Analizando módulo: ${moduleKey}...`);

    const technologies = {
      backend: [],
      frontend: [],
      database: [],
      ai: [],
      apis: [],
      security: [],
      realtime: [],
      testing: []
    };

    try {
      // Buscar archivos relacionados con el módulo
      const relatedFiles = await this.findRelatedFiles(moduleKey);

      // Analizar cada archivo
      for (const file of relatedFiles) {
        const detectedTechs = await this.analyzeFile(file);
        this.mergeTechnologies(technologies, detectedTechs);
      }

      // Agregar tecnologías base siempre presentes
      this.addBaseTechnologies(technologies);

      console.log(`   ✅ Tecnologías detectadas: ${this.countTechnologies(technologies)}`);

      return technologies;

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return technologies;
    }
  }

  /**
   * ============================================================================
   * BÚSQUEDA DE ARCHIVOS
   * ============================================================================
   */

  async findRelatedFiles(moduleKey) {
    const files = [];
    const searchDirs = [
      path.join(this.backendRoot, 'src/models'),
      path.join(this.backendRoot, 'src/routes'),
      path.join(this.backendRoot, 'src/services'),
      path.join(this.backendRoot, 'public/js/modules')
    ];

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;

      const dirFiles = fs.readdirSync(dir);

      for (const file of dirFiles) {
        if (!file.endsWith('.js')) continue;

        const fileName = file.toLowerCase();
        const moduleKeyLower = moduleKey.toLowerCase();

        // Buscar archivos relacionados por nombre
        if (fileName.includes(moduleKeyLower) ||
            fileName.includes(moduleKey) ||
            moduleKey.includes(fileName.replace('.js', ''))) {
          files.push(path.join(dir, file));
        }
      }
    }

    return files;
  }

  /**
   * ============================================================================
   * ANÁLISIS DE ARCHIVO
   * ============================================================================
   */

  async analyzeFile(filePath) {
    const technologies = {
      backend: [],
      frontend: [],
      database: [],
      ai: [],
      apis: [],
      security: [],
      realtime: [],
      testing: []
    };

    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Buscar imports/requires
      const requirePattern = /require\(['"]([^'"]+)['"]\)/g;
      const importPattern = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;

      let match;

      // Analizar requires
      while ((match = requirePattern.exec(content)) !== null) {
        const packageName = match[1];
        this.detectTechnology(packageName, technologies);
      }

      // Analizar imports
      while ((match = importPattern.exec(content)) !== null) {
        const packageName = match[1];
        this.detectTechnology(packageName, technologies);
      }

      // Detectar por palabras clave en código
      this.detectByKeywords(content, technologies);

    } catch (error) {
      console.warn(`   ⚠️  No se pudo leer: ${filePath}`);
    }

    return technologies;
  }

  /**
   * ============================================================================
   * DETECCIÓN DE TECNOLOGÍAS
   * ============================================================================
   */

  detectTechnology(packageName, technologies) {
    // Limpiar el nombre del paquete
    const cleanName = packageName.split('/')[0];

    // Buscar en diccionario
    for (const [key, tech] of Object.entries(this.techDictionary)) {
      if (cleanName.includes(key) || key.includes(cleanName)) {
        const category = this.mapCategory(tech.category);

        if (!technologies[category].find(t => t.name === tech.name)) {
          technologies[category].push({
            name: tech.name,
            description: tech.description,
            marketing: tech.marketing,
            icon: tech.icon,
            detected: 'import'
          });
        }
        break;
      }
    }
  }

  detectByKeywords(content, technologies) {
    const keywords = {
      'Socket.IO': { pattern: /socket\.io|WebSocket/i, tech: 'socket.io' },
      'PostgreSQL': { pattern: /PostgreSQL|Sequelize/i, tech: 'sequelize' },
      'JWT': { pattern: /jsonwebtoken|JWT/i, tech: 'jsonwebtoken' },
      'Azure Face': { pattern: /azure.*face|Face.*API/i, tech: 'azure-cognitiveservices-face' },
      'Ollama': { pattern: /ollama|llama|LLM/i, tech: 'ollama' },
      'Chart.js': { pattern: /Chart\.js|new Chart\(/i, tech: 'chart.js' },
      'Three.js': { pattern: /THREE\.|three\.js/i, tech: 'three.js' }
    };

    for (const [name, { pattern, tech }] of Object.entries(keywords)) {
      if (pattern.test(content)) {
        this.detectTechnology(tech, technologies);
      }
    }
  }

  /**
   * ============================================================================
   * TECNOLOGÍAS BASE
   * ============================================================================
   */

  addBaseTechnologies(technologies) {
    // Tecnologías siempre presentes en el sistema
    const baseTechs = {
      backend: ['express', 'sequelize'],
      database: ['pg'],
      security: ['bcrypt', 'jsonwebtoken'],
      apis: ['axios', 'cors']
    };

    for (const [category, techs] of Object.entries(baseTechs)) {
      for (const techKey of techs) {
        const tech = this.techDictionary[techKey];
        if (tech && !technologies[category].find(t => t.name === tech.name)) {
          technologies[category].push({
            name: tech.name,
            description: tech.description,
            marketing: tech.marketing,
            icon: tech.icon,
            detected: 'base'
          });
        }
      }
    }
  }

  /**
   * ============================================================================
   * UTILIDADES
   * ============================================================================
   */

  mapCategory(category) {
    const mapping = {
      'backend': 'backend',
      'frontend': 'frontend',
      'database': 'database',
      'ai': 'ai',
      'api': 'apis',
      'security': 'security',
      'realtime': 'realtime',
      'testing': 'testing',
      'storage': 'backend',
      'communication': 'apis',
      'devops': 'backend'
    };

    return mapping[category] || 'backend';
  }

  mergeTechnologies(target, source) {
    for (const [category, techs] of Object.entries(source)) {
      for (const tech of techs) {
        if (!target[category].find(t => t.name === tech.name)) {
          target[category].push(tech);
        }
      }
    }
  }

  countTechnologies(technologies) {
    return Object.values(technologies).reduce((sum, arr) => sum + arr.length, 0);
  }

  /**
   * ============================================================================
   * GENERACIÓN DE DESCRIPCIONES
   * ============================================================================
   */

  /**
   * Genera descripción técnica para programadores
   */
  generateTechnicalDescription(technologies) {
    const parts = [];

    if (technologies.backend.length > 0) {
      parts.push(`**Backend**: ${technologies.backend.map(t => t.name).join(', ')}`);
    }

    if (technologies.frontend.length > 0) {
      parts.push(`**Frontend**: ${technologies.frontend.map(t => t.name).join(', ')}`);
    }

    if (technologies.database.length > 0) {
      parts.push(`**Database**: ${technologies.database.map(t => t.name).join(', ')}`);
    }

    if (technologies.ai.length > 0) {
      parts.push(`**AI/ML**: ${technologies.ai.map(t => t.name).join(', ')}`);
    }

    if (technologies.security.length > 0) {
      parts.push(`**Security**: ${technologies.security.map(t => t.name).join(', ')}`);
    }

    return parts.join(' | ');
  }

  /**
   * Genera descripción marketing sutil
   */
  generateMarketingDescription(technologies) {
    const features = [];

    // Seleccionar las características más impactantes
    const allTechs = [
      ...technologies.ai,
      ...technologies.security,
      ...technologies.realtime,
      ...technologies.frontend
    ];

    // Tomar máximo 3-4 características destacadas
    for (const tech of allTechs.slice(0, 4)) {
      if (tech.marketing) {
        features.push(tech.marketing);
      }
    }

    return features.join('. ') + (features.length > 0 ? '.' : '');
  }
}

module.exports = new TechnologyDetector();
