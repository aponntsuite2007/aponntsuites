/**
 * ============================================================================
 * BRAIN ADVANCED ANALYZER - Análisis Profundo del Ecosistema
 * ============================================================================
 *
 * Extiende las capacidades del EcosystemBrain con:
 * 1. Análisis de Imports/Dependencias
 * 2. Detección de Código Muerto
 * 3. Integración con Git
 * 4. Análisis de Complejidad
 * 5. Auto-Generación de Tests
 * 6. Contract Testing
 * 7. Security Scan
 * 8. Métricas y Dashboard
 *
 * @version 1.0.0
 * @date 2025-12-09
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BrainAdvancedAnalyzer {
  constructor(brainService, baseDir = null) {
    this.brainService = brainService;
    this.baseDir = baseDir || path.join(__dirname, '../..');

    // Cache para análisis
    this.dependencyGraph = new Map();
    this.deadCodeCache = [];
    this.complexityCache = new Map();
    this.securityIssues = [];
    this.contractSnapshots = new Map();

    // Configuración
    this.config = {
      complexityThreshold: 10,  // Complejidad ciclomática máxima
      deadCodeConfidence: 0.8,  // Confianza mínima para reportar código muerto
      securityPatterns: this._getSecurityPatterns()
    };

    console.log('🧠 [BRAIN-ANALYZER] Advanced Analyzer inicializado');
  }

  // =========================================================================
  // 1. ANÁLISIS DE IMPORTS/DEPENDENCIAS
  // =========================================================================

  /**
   * Analiza todos los imports de un archivo
   */
  analyzeFileImports(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const imports = [];

      // Detectar require()
      const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
      let match;
      while ((match = requireRegex.exec(content)) !== null) {
        imports.push({
          type: 'require',
          module: match[1],
          isLocal: match[1].startsWith('.') || match[1].startsWith('/'),
          line: content.substring(0, match.index).split('\n').length
        });
      }

      // Detectar import ES6
      const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"`]([^'"`]+)['"`]/g;
      while ((match = importRegex.exec(content)) !== null) {
        imports.push({
          type: 'import',
          module: match[1],
          isLocal: match[1].startsWith('.') || match[1].startsWith('/'),
          line: content.substring(0, match.index).split('\n').length
        });
      }

      return imports;
    } catch (error) {
      return [];
    }
  }

  /**
   * Construye el grafo de dependencias completo
   */
  async buildDependencyGraph() {
    console.log('🔗 [BRAIN-ANALYZER] Construyendo grafo de dependencias...');

    const graph = new Map();
    const backendFiles = await this.brainService.scanBackendFiles();

    const allFiles = [
      ...(backendFiles?.categories?.routes?.files || []),
      ...(backendFiles?.categories?.services?.files || []),
      ...(backendFiles?.categories?.models?.files || []),
      ...(backendFiles?.categories?.middleware?.files || []),
      ...(backendFiles?.categories?.config?.files || [])
    ];

    for (const file of allFiles) {
      const filePath = file.path || file;
      const fileName = path.basename(filePath, '.js');
      const imports = this.analyzeFileImports(filePath);

      graph.set(fileName, {
        path: filePath,
        imports: imports,
        importedBy: [],  // Se llena después
        localDependencies: imports.filter(i => i.isLocal).map(i => {
          const depName = path.basename(i.module, '.js').replace(/^\.\//, '');
          return depName;
        }),
        externalDependencies: imports.filter(i => !i.isLocal).map(i => i.module)
      });
    }

    // Segunda pasada: llenar importedBy
    for (const [fileName, data] of graph) {
      for (const dep of data.localDependencies) {
        const depEntry = graph.get(dep);
        if (depEntry) {
          depEntry.importedBy.push(fileName);
        }
      }
    }

    this.dependencyGraph = graph;
    console.log(`   ✅ ${graph.size} archivos analizados`);

    return graph;
  }

  /**
   * Obtiene dependencias de un módulo específico
   */
  getModuleDependencies(moduleName) {
    if (this.dependencyGraph.size === 0) {
      return { error: 'Grafo no construido. Ejecutar buildDependencyGraph() primero.' };
    }

    // Buscar por nombre parcial
    let entry = this.dependencyGraph.get(moduleName);
    if (!entry) {
      for (const [key, value] of this.dependencyGraph) {
        if (key.toLowerCase().includes(moduleName.toLowerCase())) {
          entry = value;
          break;
        }
      }
    }

    if (!entry) {
      return { error: `Módulo ${moduleName} no encontrado` };
    }

    return {
      module: moduleName,
      path: entry.path,
      uses: entry.localDependencies,
      usedBy: entry.importedBy,
      external: entry.externalDependencies,
      breakingImpact: entry.importedBy.length > 3 ? 'HIGH' :
                      entry.importedBy.length > 1 ? 'MEDIUM' : 'LOW',
      impactCount: entry.importedBy.length
    };
  }

  // =========================================================================
  // 2. DETECCIÓN DE CÓDIGO MUERTO
  // =========================================================================

  /**
   * Detecta funciones exportadas que nadie importa
   */
  async findDeadCode() {
    console.log('💀 [BRAIN-ANALYZER] Buscando código muerto...');

    if (this.dependencyGraph.size === 0) {
      await this.buildDependencyGraph();
    }

    const deadCode = [];

    for (const [fileName, data] of this.dependencyGraph) {
      // Si nadie importa este archivo y no es un entry point
      const isEntryPoint = fileName.includes('server') ||
                          fileName.includes('index') ||
                          fileName.includes('Routes');

      if (data.importedBy.length === 0 && !isEntryPoint) {
        // Verificar si es un archivo de configuración o especial
        const isSpecial = fileName.includes('config') ||
                         fileName.includes('migration') ||
                         fileName.includes('seed') ||
                         fileName.includes('test');

        if (!isSpecial) {
          deadCode.push({
            file: fileName,
            path: data.path,
            reason: 'No imports found',
            confidence: 0.85,
            suggestion: 'Verificar si este archivo aún es necesario'
          });
        }
      }
    }

    // Buscar funciones exportadas no usadas dentro de archivos
    for (const [fileName, data] of this.dependencyGraph) {
      try {
        const content = fs.readFileSync(data.path, 'utf8');
        const exports = this._extractExports(content);

        // Ver si esas exportaciones son usadas en otros archivos
        for (const exp of exports) {
          let isUsed = false;

          for (const [otherFile, otherData] of this.dependencyGraph) {
            if (otherFile === fileName) continue;

            try {
              const otherContent = fs.readFileSync(otherData.path, 'utf8');
              if (otherContent.includes(exp.name)) {
                isUsed = true;
                break;
              }
            } catch (e) {}
          }

          if (!isUsed && exp.type === 'function') {
            deadCode.push({
              file: fileName,
              path: data.path,
              function: exp.name,
              line: exp.line,
              reason: 'Exported function not used elsewhere',
              confidence: 0.7,
              suggestion: `Verificar si ${exp.name}() aún es necesaria`
            });
          }
        }
      } catch (e) {}
    }

    this.deadCodeCache = deadCode;
    console.log(`   ✅ ${deadCode.length} items de código potencialmente muerto`);

    return deadCode;
  }

  _extractExports(content) {
    const exports = [];

    // module.exports = { func1, func2 }
    const moduleExportsMatch = content.match(/module\.exports\s*=\s*\{([^}]+)\}/);
    if (moduleExportsMatch) {
      const items = moduleExportsMatch[1].split(',').map(s => s.trim());
      items.forEach(item => {
        if (item && !item.includes(':')) {
          exports.push({ name: item, type: 'unknown', line: 0 });
        }
      });
    }

    // exports.funcName =
    const exportsRegex = /exports\.(\w+)\s*=/g;
    let match;
    while ((match = exportsRegex.exec(content)) !== null) {
      exports.push({
        name: match[1],
        type: 'function',
        line: content.substring(0, match.index).split('\n').length
      });
    }

    return exports;
  }

  // =========================================================================
  // 3. GIT INTEGRATION
  // =========================================================================

  /**
   * Obtiene cambios recientes del repositorio
   */
  getRecentChanges(days = 7) {
    console.log(`📊 [BRAIN-ANALYZER] Analizando cambios de los últimos ${days} días...`);

    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().split('T')[0];

      // Obtener commits recientes
      const logCmd = `git log --since="${sinceStr}" --pretty=format:"%H|%an|%ae|%s|%ci" --name-only`;
      const logOutput = execSync(logCmd, {
        cwd: this.baseDir,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const commits = [];
      const fileChanges = new Map();

      const blocks = logOutput.split('\n\n').filter(b => b.trim());

      for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length === 0) continue;

        const [hash, author, email, message, date] = (lines[0] || '').split('|');

        if (hash) {
          commits.push({ hash, author, email, message, date });

          // Archivos modificados
          for (let i = 1; i < lines.length; i++) {
            const file = lines[i].trim();
            if (file && file.endsWith('.js')) {
              const current = fileChanges.get(file) || { changes: 0, authors: new Set() };
              current.changes++;
              current.authors.add(author);
              fileChanges.set(file, current);
            }
          }
        }
      }

      // Calcular riesgo por archivo
      const filesWithRisk = [];
      for (const [file, data] of fileChanges) {
        const risk = data.changes > 10 ? 'HIGH' :
                     data.changes > 5 ? 'MEDIUM' : 'LOW';
        filesWithRisk.push({
          file,
          changes: data.changes,
          authors: Array.from(data.authors),
          risk
        });
      }

      filesWithRisk.sort((a, b) => b.changes - a.changes);

      return {
        period: `${days} days`,
        totalCommits: commits.length,
        filesChanged: filesWithRisk.length,
        hotFiles: filesWithRisk.slice(0, 10),
        recentCommits: commits.slice(0, 5)
      };

    } catch (error) {
      console.log(`   ⚠️ Error leyendo git: ${error.message}`);
      return { error: error.message, commits: [], files: [] };
    }
  }

  /**
   * Obtiene archivos modificados desde el último deploy
   */
  getChangesSinceLastDeploy() {
    try {
      // Intentar obtener el último tag o commit de deploy
      const lastDeployCmd = 'git describe --tags --abbrev=0 2>/dev/null || git rev-parse HEAD~10';
      const lastDeploy = execSync(lastDeployCmd, {
        cwd: this.baseDir,
        encoding: 'utf8'
      }).trim();

      const diffCmd = `git diff --name-only ${lastDeploy} HEAD`;
      const files = execSync(diffCmd, {
        cwd: this.baseDir,
        encoding: 'utf8'
      }).split('\n').filter(f => f.trim());

      return {
        since: lastDeploy,
        filesChanged: files.length,
        files: files.filter(f => f.endsWith('.js'))
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Prioriza testing basado en cambios de git
   */
  prioritizeTestingByRisk() {
    const changes = this.getRecentChanges(7);

    if (changes.error) {
      return { error: changes.error };
    }

    // Mapear archivos a módulos
    const modulePriority = new Map();

    for (const file of changes.hotFiles) {
      // Extraer nombre de módulo del path
      const parts = file.file.split('/');
      const fileName = parts[parts.length - 1].replace('.js', '');

      // Determinar módulo
      let module = fileName.replace('Routes', '')
                          .replace('Service', '')
                          .replace('Controller', '')
                          .toLowerCase();

      const current = modulePriority.get(module) || { changes: 0, risk: 'LOW' };
      current.changes += file.changes;
      current.risk = file.risk === 'HIGH' ? 'HIGH' :
                     (file.risk === 'MEDIUM' && current.risk !== 'HIGH') ? 'MEDIUM' :
                     current.risk;
      modulePriority.set(module, current);
    }

    // Ordenar por riesgo y cambios
    const sorted = Array.from(modulePriority.entries())
      .sort((a, b) => {
        const riskOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const riskDiff = riskOrder[b[1].risk] - riskOrder[a[1].risk];
        return riskDiff !== 0 ? riskDiff : b[1].changes - a[1].changes;
      })
      .map(([module, data]) => ({ module, ...data }));

    return {
      prioritizedModules: sorted,
      recommendation: sorted.slice(0, 5).map(m => m.module)
    };
  }

  // =========================================================================
  // 4. ANÁLISIS DE COMPLEJIDAD
  // =========================================================================

  /**
   * Calcula complejidad ciclomática de un archivo
   */
  analyzeComplexity(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Contar puntos de decisión
      const decisionPoints = [
        /\bif\s*\(/g,
        /\belse\s+if\s*\(/g,
        /\bfor\s*\(/g,
        /\bwhile\s*\(/g,
        /\bswitch\s*\(/g,
        /\bcase\s+/g,
        /\bcatch\s*\(/g,
        /\?\s*[^:]+\s*:/g,  // Ternario
        /&&/g,
        /\|\|/g
      ];

      let complexity = 1;  // Base

      for (const pattern of decisionPoints) {
        const matches = content.match(pattern);
        if (matches) {
          complexity += matches.length;
        }
      }

      // Detectar funciones y calcular complejidad por función
      const functions = [];
      const funcRegex = /(?:async\s+)?(?:function\s+(\w+)|(\w+)\s*[=:]\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/g;
      let match;

      while ((match = funcRegex.exec(content)) !== null) {
        const funcName = match[1] || match[2];
        const startIndex = match.index;

        // Encontrar el final de la función (aproximado)
        let braceCount = 0;
        let endIndex = startIndex;
        let started = false;

        for (let i = startIndex; i < content.length && i < startIndex + 5000; i++) {
          if (content[i] === '{') {
            braceCount++;
            started = true;
          } else if (content[i] === '}') {
            braceCount--;
            if (started && braceCount === 0) {
              endIndex = i;
              break;
            }
          }
        }

        const funcBody = content.substring(startIndex, endIndex);
        let funcComplexity = 1;

        for (const pattern of decisionPoints) {
          const matches = funcBody.match(pattern);
          if (matches) {
            funcComplexity += matches.length;
          }
        }

        functions.push({
          name: funcName,
          complexity: funcComplexity,
          line: content.substring(0, startIndex).split('\n').length,
          isComplex: funcComplexity > this.config.complexityThreshold
        });
      }

      const fileName = path.basename(filePath);
      const result = {
        file: fileName,
        path: filePath,
        totalComplexity: complexity,
        lineCount: content.split('\n').length,
        functions: functions.sort((a, b) => b.complexity - a.complexity),
        complexFunctions: functions.filter(f => f.isComplex),
        rating: complexity > 50 ? 'HIGH' : complexity > 20 ? 'MEDIUM' : 'LOW'
      };

      this.complexityCache.set(fileName, result);
      return result;

    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Analiza complejidad de todos los archivos
   */
  async analyzeAllComplexity() {
    console.log('📐 [BRAIN-ANALYZER] Analizando complejidad del código...');

    const backendFiles = await this.brainService.scanBackendFiles();
    const results = [];

    const allFiles = [
      ...(backendFiles?.categories?.routes?.files || []),
      ...(backendFiles?.categories?.services?.files || [])
    ];

    for (const file of allFiles) {
      const filePath = file.path || file;
      const analysis = this.analyzeComplexity(filePath);
      if (!analysis.error) {
        results.push(analysis);
      }
    }

    results.sort((a, b) => b.totalComplexity - a.totalComplexity);

    console.log(`   ✅ ${results.length} archivos analizados`);

    return {
      total: results.length,
      highComplexity: results.filter(r => r.rating === 'HIGH'),
      mediumComplexity: results.filter(r => r.rating === 'MEDIUM'),
      lowComplexity: results.filter(r => r.rating === 'LOW'),
      mostComplex: results.slice(0, 10),
      complexFunctions: results.flatMap(r => r.complexFunctions)
        .sort((a, b) => b.complexity - a.complexity)
        .slice(0, 20)
    };
  }

  // =========================================================================
  // 5. AUTO-GENERACIÓN DE TESTS
  // =========================================================================

  /**
   * Genera tests automáticos para un módulo basado en sus endpoints
   */
  async generateTestsFor(moduleName) {
    console.log(`🧪 [BRAIN-ANALYZER] Generando tests para ${moduleName}...`);

    // Obtener datos del Brain sobre el módulo
    const backendFiles = await this.brainService.scanBackendFiles();
    const routeFiles = backendFiles?.categories?.routes?.files || [];

    // Buscar archivo de rutas del módulo
    const routeFile = routeFiles.find(f => {
      const fileName = path.basename(f.path || f, '.js').toLowerCase();
      return fileName.includes(moduleName.toLowerCase());
    });

    if (!routeFile) {
      return { error: `No se encontró archivo de rutas para ${moduleName}` };
    }

    const filePath = routeFile.path || routeFile;
    const content = fs.readFileSync(filePath, 'utf8');

    // Extraer endpoints
    const endpoints = this._extractEndpoints(content);

    // Detectar middleware de autenticación
    const requiresAuth = content.includes('authMiddleware') ||
                         content.includes('authenticate') ||
                         content.includes('verifyToken');

    // Generar código de test
    const testCode = this._generateTestCode(moduleName, endpoints, requiresAuth);

    return {
      module: moduleName,
      routeFile: filePath,
      endpointsFound: endpoints.length,
      endpoints: endpoints,
      requiresAuth,
      generatedTest: testCode,
      testFilePath: `tests/auto-generated/${moduleName}.test.js`
    };
  }

  _extractEndpoints(content) {
    const endpoints = [];

    // router.get('/path', ...)
    const routeRegex = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
    let match;

    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const path = match[2];
      const line = content.substring(0, match.index).split('\n').length;

      // Detectar parámetros
      const params = (path.match(/:(\w+)/g) || []).map(p => p.substring(1));

      // Detectar si es async
      const surrounding = content.substring(match.index, match.index + 200);
      const isAsync = surrounding.includes('async');

      // Detectar validaciones (body params)
      const bodyParams = [];
      const reqBodyMatch = surrounding.match(/req\.body\.(\w+)/g);
      if (reqBodyMatch) {
        reqBodyMatch.forEach(m => bodyParams.push(m.replace('req.body.', '')));
      }

      endpoints.push({
        method,
        path,
        line,
        params,
        bodyParams,
        isAsync
      });
    }

    return endpoints;
  }

  _generateTestCode(moduleName, endpoints, requiresAuth) {
    const testCases = [];

    for (const endpoint of endpoints) {
      const testName = `${endpoint.method} ${endpoint.path}`;

      // Generar path con valores de ejemplo para params
      let testPath = endpoint.path;
      for (const param of endpoint.params) {
        testPath = testPath.replace(`:${param}`, `1`);  // Usar 1 como valor de ejemplo
      }

      // Generar body para POST/PUT
      let bodyCode = '';
      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.bodyParams.length > 0) {
        const bodyObj = {};
        for (const param of endpoint.bodyParams) {
          bodyObj[param] = `'test_${param}'`;
        }
        bodyCode = `.send(${JSON.stringify(bodyObj).replace(/"/g, '')})`;
      }

      // Generar test case
      const testCase = `
    it('${testName} - should respond correctly', async () => {
      const response = await request(app)
        .${endpoint.method.toLowerCase()}('/api/${moduleName}${testPath}')
        ${requiresAuth ? ".set('Authorization', 'Bearer ' + authToken)" : ''}
        ${bodyCode};

      expect(response.status).to.be.oneOf([200, 201, 400, 401, 404]);

      if (response.status === 200 || response.status === 201) {
        expect(response.body).to.have.property('success');
      }
    });`;

      testCases.push(testCase);
    }

    // Generar archivo completo
    return `/**
 * AUTO-GENERATED TESTS for ${moduleName}
 * Generated by BrainAdvancedAnalyzer
 * Date: ${new Date().toISOString()}
 *
 * These tests are automatically generated based on detected endpoints.
 * Review and customize as needed.
 */

const request = require('supertest');
const { expect } = require('chai');
const app = require('../../server');

describe('${moduleName.toUpperCase()} Module - Auto-Generated Tests', () => {
  ${requiresAuth ? `
  let authToken;

  before(async () => {
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'test123' });
    authToken = loginResponse.body.token;
  });
  ` : ''}
  ${testCases.join('\n')}
});
`;
  }

  // =========================================================================
  // 6. CONTRACT TESTING
  // =========================================================================

  /**
   * Captura snapshot de respuesta de un endpoint
   */
  async captureContractSnapshot(endpoint, method, response) {
    const key = `${method} ${endpoint}`;

    const snapshot = {
      endpoint,
      method,
      capturedAt: new Date().toISOString(),
      statusCode: response.status || response.statusCode,
      headers: response.headers || {},
      bodyStructure: this._getObjectStructure(response.body || response.data),
      bodyExample: response.body || response.data
    };

    this.contractSnapshots.set(key, snapshot);

    // Guardar en archivo
    const snapshotDir = path.join(this.baseDir, 'tests', 'contracts');
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }

    const fileName = `${method.toLowerCase()}_${endpoint.replace(/\//g, '_').replace(/:/g, '')}.json`;
    fs.writeFileSync(
      path.join(snapshotDir, fileName),
      JSON.stringify(snapshot, null, 2)
    );

    return snapshot;
  }

  /**
   * Compara respuesta actual con snapshot guardado
   */
  async compareWithContract(endpoint, method, currentResponse) {
    const key = `${method} ${endpoint}`;

    // Cargar snapshot
    const snapshotDir = path.join(this.baseDir, 'tests', 'contracts');
    const fileName = `${method.toLowerCase()}_${endpoint.replace(/\//g, '_').replace(/:/g, '')}.json`;
    const snapshotPath = path.join(snapshotDir, fileName);

    if (!fs.existsSync(snapshotPath)) {
      return { hasSnapshot: false, message: 'No contract snapshot found' };
    }

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    const currentStructure = this._getObjectStructure(currentResponse.body || currentResponse.data);

    // Comparar estructuras
    const differences = this._compareStructures(snapshot.bodyStructure, currentStructure);

    return {
      hasSnapshot: true,
      endpoint,
      method,
      snapshotDate: snapshot.capturedAt,
      isCompatible: differences.length === 0,
      differences,
      breakingChanges: differences.filter(d => d.type === 'removed' || d.type === 'type_changed')
    };
  }

  _getObjectStructure(obj, prefix = '') {
    const structure = {};

    if (obj === null || obj === undefined) {
      return { type: 'null' };
    }

    if (Array.isArray(obj)) {
      return {
        type: 'array',
        itemType: obj.length > 0 ? this._getObjectStructure(obj[0]) : 'unknown'
      };
    }

    if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        structure[key] = {
          type: typeof obj[key],
          structure: typeof obj[key] === 'object' ? this._getObjectStructure(obj[key]) : null
        };
      }
      return { type: 'object', properties: structure };
    }

    return { type: typeof obj };
  }

  _compareStructures(expected, actual, path = '') {
    const differences = [];

    if (expected.type !== actual.type) {
      differences.push({
        path,
        type: 'type_changed',
        expected: expected.type,
        actual: actual.type
      });
      return differences;
    }

    if (expected.type === 'object' && expected.properties && actual.properties) {
      // Check for removed properties
      for (const key of Object.keys(expected.properties)) {
        if (!actual.properties[key]) {
          differences.push({
            path: path ? `${path}.${key}` : key,
            type: 'removed'
          });
        } else {
          const subDiffs = this._compareStructures(
            expected.properties[key],
            actual.properties[key],
            path ? `${path}.${key}` : key
          );
          differences.push(...subDiffs);
        }
      }

      // Check for new properties (not breaking, but notable)
      for (const key of Object.keys(actual.properties)) {
        if (!expected.properties[key]) {
          differences.push({
            path: path ? `${path}.${key}` : key,
            type: 'added'
          });
        }
      }
    }

    return differences;
  }

  // =========================================================================
  // 7. SECURITY SCAN
  // =========================================================================

  _getSecurityPatterns() {
    return [
      {
        name: 'SQL Injection',
        pattern: /(\$\{.*\}|`.*\$\{.*\}.*`)\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE)/i,
        severity: 'HIGH',
        description: 'Potential SQL injection via string interpolation'
      },
      {
        name: 'SQL Injection (concat)',
        pattern: /['"`]\s*\+\s*(?:req\.body|req\.query|req\.params)/i,
        severity: 'HIGH',
        description: 'Potential SQL injection via string concatenation'
      },
      {
        name: 'XSS',
        pattern: /innerHTML\s*=|document\.write\s*\(|\.html\s*\(\s*(?:req\.|data\.)/i,
        severity: 'MEDIUM',
        description: 'Potential XSS vulnerability'
      },
      {
        name: 'Hardcoded Secret',
        pattern: /(?:password|secret|api_key|apikey|token)\s*[:=]\s*['"`][^'"`]{8,}/i,
        severity: 'MEDIUM',
        description: 'Potential hardcoded secret'
      },
      {
        name: 'Eval Usage',
        pattern: /\beval\s*\(/,
        severity: 'HIGH',
        description: 'Use of eval() is dangerous'
      },
      {
        name: 'Command Injection',
        pattern: /exec\s*\(\s*(?:req\.|`.*\$\{)/i,
        severity: 'HIGH',
        description: 'Potential command injection'
      },
      {
        name: 'Path Traversal',
        pattern: /(?:readFile|createReadStream|require)\s*\(\s*(?:req\.|path\.join\s*\([^)]*req\.)/i,
        severity: 'MEDIUM',
        description: 'Potential path traversal vulnerability'
      },
      {
        name: 'Insecure Randomness',
        pattern: /Math\.random\s*\(\)/,
        severity: 'LOW',
        description: 'Math.random() is not cryptographically secure'
      },
      {
        name: 'No Rate Limiting',
        pattern: /router\.(post|put|delete)\s*\([^)]+(?!rateLimit)/,
        severity: 'LOW',
        description: 'Endpoint without rate limiting'
      }
    ];
  }

  /**
   * Escanea un archivo por vulnerabilidades
   */
  scanFileForSecurity(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const issues = [];
      const fileName = path.basename(filePath);

      for (const pattern of this.config.securityPatterns) {
        const regex = new RegExp(pattern.pattern, 'gim');
        let match;

        while ((match = regex.exec(content)) !== null) {
          const line = content.substring(0, match.index).split('\n').length;

          issues.push({
            file: fileName,
            path: filePath,
            line,
            vulnerability: pattern.name,
            severity: pattern.severity,
            description: pattern.description,
            code: match[0].substring(0, 100)
          });
        }
      }

      return issues;
    } catch (error) {
      return [];
    }
  }

  /**
   * Escanea todo el código por vulnerabilidades
   */
  async runSecurityScan() {
    console.log('🔒 [BRAIN-ANALYZER] Ejecutando security scan...');

    const backendFiles = await this.brainService.scanBackendFiles();
    const allIssues = [];

    const allFiles = [
      ...(backendFiles?.categories?.routes?.files || []),
      ...(backendFiles?.categories?.services?.files || []),
      ...(backendFiles?.categories?.middleware?.files || [])
    ];

    for (const file of allFiles) {
      const filePath = file.path || file;
      const issues = this.scanFileForSecurity(filePath);
      allIssues.push(...issues);
    }

    this.securityIssues = allIssues;

    // Agrupar por severidad
    const grouped = {
      HIGH: allIssues.filter(i => i.severity === 'HIGH'),
      MEDIUM: allIssues.filter(i => i.severity === 'MEDIUM'),
      LOW: allIssues.filter(i => i.severity === 'LOW')
    };

    console.log(`   ✅ Scan completado: ${allIssues.length} issues encontrados`);
    console.log(`      🔴 HIGH: ${grouped.HIGH.length}`);
    console.log(`      🟠 MEDIUM: ${grouped.MEDIUM.length}`);
    console.log(`      🟡 LOW: ${grouped.LOW.length}`);

    return {
      total: allIssues.length,
      ...grouped,
      summary: {
        high: grouped.HIGH.length,
        medium: grouped.MEDIUM.length,
        low: grouped.LOW.length
      }
    };
  }

  // =========================================================================
  // 8. MÉTRICAS Y DASHBOARD
  // =========================================================================

  /**
   * Genera reporte completo de salud del sistema
   */
  async getHealthDashboard() {
    console.log('📊 [BRAIN-ANALYZER] Generando dashboard de salud...');

    // Ejecutar todos los análisis
    const [
      dependencies,
      deadCode,
      gitChanges,
      complexity,
      security
    ] = await Promise.all([
      this.buildDependencyGraph(),
      this.findDeadCode(),
      this.getRecentChanges(7),
      this.analyzeAllComplexity(),
      this.runSecurityScan()
    ]);

    // Calcular métricas
    const totalFiles = dependencies.size;
    const filesWithDependencies = Array.from(dependencies.values())
      .filter(d => d.importedBy.length > 0).length;

    const coverageEstimate = filesWithDependencies / totalFiles * 100;

    // Calcular score de salud
    const healthScore = this._calculateHealthScore({
      deadCodeCount: deadCode.length,
      securityHighCount: security.HIGH?.length || 0,
      securityMediumCount: security.MEDIUM?.length || 0,
      complexFunctionsCount: complexity.complexFunctions?.length || 0,
      totalFiles
    });

    return {
      generatedAt: new Date().toISOString(),

      overview: {
        healthScore,
        healthRating: healthScore > 80 ? 'EXCELLENT' :
                      healthScore > 60 ? 'GOOD' :
                      healthScore > 40 ? 'NEEDS_ATTENTION' : 'CRITICAL',
        totalFiles,
        totalEndpoints: this._countEndpoints(dependencies)
      },

      dependencies: {
        graphSize: dependencies.size,
        averageImports: this._avgImports(dependencies),
        mostDepended: this._getMostDepended(dependencies, 5),
        orphanFiles: Array.from(dependencies.values())
          .filter(d => d.importedBy.length === 0)
          .map(d => d.path)
          .slice(0, 10)
      },

      codeQuality: {
        deadCodeItems: deadCode.length,
        deadCodeFiles: [...new Set(deadCode.map(d => d.file))].length,
        topDeadCode: deadCode.slice(0, 5),

        complexityHigh: complexity.highComplexity?.length || 0,
        complexityMedium: complexity.mediumComplexity?.length || 0,
        mostComplexFiles: complexity.mostComplex?.slice(0, 5) || [],
        mostComplexFunctions: complexity.complexFunctions?.slice(0, 5) || []
      },

      security: {
        totalIssues: security.total,
        highSeverity: security.HIGH?.length || 0,
        mediumSeverity: security.MEDIUM?.length || 0,
        lowSeverity: security.LOW?.length || 0,
        topIssues: security.HIGH?.slice(0, 5) || []
      },

      gitActivity: {
        commitsLast7Days: gitChanges.totalCommits || 0,
        filesChangedLast7Days: gitChanges.filesChanged || 0,
        hotFiles: gitChanges.hotFiles?.slice(0, 5) || [],
        testingPriority: this.prioritizeTestingByRisk().recommendation || []
      },

      recommendations: this._generateRecommendations({
        deadCode, complexity, security, gitChanges
      })
    };
  }

  _calculateHealthScore({ deadCodeCount, securityHighCount, securityMediumCount, complexFunctionsCount, totalFiles }) {
    let score = 100;

    // Penalizar por código muerto (max -10)
    score -= Math.min(10, deadCodeCount * 0.5);

    // Penalizar por issues de seguridad
    score -= securityHighCount * 5;  // -5 por cada HIGH
    score -= securityMediumCount * 2; // -2 por cada MEDIUM

    // Penalizar por funciones complejas (max -15)
    score -= Math.min(15, complexFunctionsCount * 1);

    return Math.max(0, Math.round(score));
  }

  _avgImports(dependencies) {
    const values = Array.from(dependencies.values());
    const total = values.reduce((sum, d) => sum + d.localDependencies.length, 0);
    return (total / values.length).toFixed(2);
  }

  _getMostDepended(dependencies, count) {
    return Array.from(dependencies.entries())
      .sort((a, b) => b[1].importedBy.length - a[1].importedBy.length)
      .slice(0, count)
      .map(([name, data]) => ({
        module: name,
        dependents: data.importedBy.length,
        importedBy: data.importedBy.slice(0, 5)
      }));
  }

  _countEndpoints(dependencies) {
    let count = 0;
    for (const [name, data] of dependencies) {
      if (name.toLowerCase().includes('route')) {
        try {
          const content = fs.readFileSync(data.path, 'utf8');
          const matches = content.match(/router\.(get|post|put|patch|delete)\s*\(/gi);
          count += matches ? matches.length : 0;
        } catch (e) {}
      }
    }
    return count;
  }

  _generateRecommendations({ deadCode, complexity, security, gitChanges }) {
    const recommendations = [];

    if (security.HIGH?.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        area: 'Security',
        message: `${security.HIGH.length} vulnerabilidades de alta severidad detectadas`,
        action: 'Revisar y corregir inmediatamente'
      });
    }

    if (complexity.complexFunctions?.length > 5) {
      recommendations.push({
        priority: 'HIGH',
        area: 'Code Quality',
        message: `${complexity.complexFunctions.length} funciones exceden el umbral de complejidad`,
        action: 'Refactorizar funciones complejas para mejorar mantenibilidad'
      });
    }

    if (deadCode.length > 10) {
      recommendations.push({
        priority: 'MEDIUM',
        area: 'Maintenance',
        message: `${deadCode.length} archivos/funciones potencialmente no utilizados`,
        action: 'Revisar y eliminar código muerto'
      });
    }

    if (gitChanges.hotFiles?.some(f => f.risk === 'HIGH')) {
      recommendations.push({
        priority: 'MEDIUM',
        area: 'Testing',
        message: 'Archivos con muchos cambios recientes detectados',
        action: 'Priorizar testing en archivos modificados frecuentemente'
      });
    }

    return recommendations;
  }
}

module.exports = BrainAdvancedAnalyzer;
