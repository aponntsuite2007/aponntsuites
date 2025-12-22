/**
 * ============================================================================
 * DEEP MODULE ANALYZER - Analizador Profundo de Modulos
 * ============================================================================
 *
 * Sistema de introspección de código que extrae capacidades reales de los
 * servicios del sistema para generar llm-context.json rico y actualizado.
 *
 * CAPACIDADES:
 * - Lee y analiza archivos de servicios (.js)
 * - Extrae métodos, parámetros, integraciones
 * - Detecta fórmulas y algoritmos en comentarios
 * - Identifica dependencies a otros módulos
 * - Genera fullCapabilities detallados
 *
 * @version 1.0.0
 * @date 2025-12-19
 * ============================================================================
 */

const fs = require('fs').promises;
const path = require('path');

class DeepModuleAnalyzer {

    constructor() {
        this.projectRoot = path.join(__dirname, '../../../');
        this.servicesPath = path.join(this.projectRoot, 'src/services');
        this.routesPath = path.join(this.projectRoot, 'src/routes');
        this.migrationsPath = path.join(this.projectRoot, 'migrations');
    }

    // ========================================================================
    // ANALIZAR UN MÓDULO COMPLETO
    // ========================================================================

    /**
     * Analiza un módulo y extrae todas sus capacidades reales
     * @param {string} moduleKey - Key del módulo (ej: "hour-bank")
     * @param {Object} registryData - Metadata del registry
     * @returns {Object} fullCapabilities del módulo
     */
    async analyzeModule(moduleKey, registryData) {
        console.log(`\n📊 Analizando módulo: ${moduleKey}...`);

        try {
            // 1. Encontrar archivos relacionados
            const relatedFiles = await this._findRelatedFiles(moduleKey, registryData);
            console.log(`   ✅ Encontrados ${relatedFiles.length} archivos relacionados`);

            // 2. Analizar cada archivo
            const analysisResults = await Promise.all(
                relatedFiles.map(file => this._analyzeFile(file))
            );

            // 3. Consolidar análisis
            const consolidated = this._consolidateAnalysis(moduleKey, registryData, analysisResults);

            console.log(`   ✅ Análisis completado: ${consolidated.methods?.length || 0} métodos, ${consolidated.integrations?.length || 0} integraciones`);

            return consolidated;

        } catch (error) {
            console.error(`   ❌ Error analizando ${moduleKey}:`, error.message);
            return this._generateFallbackCapabilities(moduleKey, registryData);
        }
    }

    // ========================================================================
    // ENCONTRAR ARCHIVOS RELACIONADOS
    // ========================================================================

    async _findRelatedFiles(moduleKey, registryData) {
        const files = [];

        // Intentar múltiples patrones de nombres
        const patterns = this._generateFilePatterns(moduleKey, registryData);

        for (const pattern of patterns) {
            // Buscar en services/
            const servicePath = path.join(this.servicesPath, pattern);
            if (await this._fileExists(servicePath)) {
                files.push({ path: servicePath, type: 'service' });
            }

            // Buscar en routes/
            const routePath = path.join(this.routesPath, pattern);
            if (await this._fileExists(routePath)) {
                files.push({ path: routePath, type: 'route' });
            }
        }

        return files;
    }

    _generateFilePatterns(moduleKey, registryData) {
        const patterns = [];

        // Patrón 1: moduleKey directo (hour-bank → HourBankService.js)
        const camelCase = this._toCamelCase(moduleKey);
        patterns.push(`${camelCase}Service.js`);
        patterns.push(`${camelCase}.js`);
        patterns.push(`${moduleKey}.js`);

        // Patrón 2: nombre del módulo (registryData.name)
        if (registryData.name) {
            const nameCamel = this._toCamelCase(registryData.name);
            patterns.push(`${nameCamel}Service.js`);
            patterns.push(`${nameCamel}.js`);
        }

        // Patrón 3: Routes
        patterns.push(`${moduleKey}Routes.js`);
        patterns.push(`${camelCase}Routes.js`);

        return [...new Set(patterns)]; // Eliminar duplicados
    }

    _toCamelCase(str) {
        return str
            .split(/[-_\s]/)
            .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
            .join('')
            .replace(/^\w/, c => c.toUpperCase());
    }

    async _fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    // ========================================================================
    // ANALIZAR UN ARCHIVO DE CÓDIGO
    // ========================================================================

    async _analyzeFile(fileInfo) {
        const { path: filePath, type } = fileInfo;

        try {
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n');

            return {
                filePath,
                type,
                header: this._extractHeader(lines),
                methods: this._extractMethods(lines, content),
                integrations: this._extractIntegrations(lines, content),
                formulas: this._extractFormulas(lines),
                algorithms: this._extractAlgorithms(lines),
                businessFlows: this._extractBusinessFlows(lines),
                dependencies: this._extractDependencies(lines, content),
                standards: this._extractStandards(lines),
                features: this._extractFeatures(lines),
                tables: this._extractTables(content),
                endpoints: type === 'route' ? this._extractEndpoints(lines, content) : []
            };

        } catch (error) {
            console.error(`   ⚠️  Error leyendo ${filePath}:`, error.message);
            return null;
        }
    }

    // ========================================================================
    // EXTRACTORES ESPECÍFICOS
    // ========================================================================

    _extractHeader(lines) {
        const headerLines = lines.slice(0, 30).join('\n');
        const versionMatch = headerLines.match(/@version\s+([\d.]+)/);
        const dateMatch = headerLines.match(/@date\s+([\d-]+)/);
        const descMatch = headerLines.match(/\*\s*([^*\n]{20,200})/);

        return {
            version: versionMatch ? versionMatch[1] : null,
            date: dateMatch ? dateMatch[1] : null,
            description: descMatch ? descMatch[1].trim() : null
        };
    }

    _extractMethods(lines, content) {
        const methods = [];
        const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g;
        let match;

        while ((match = methodRegex.exec(content)) !== null) {
            const methodName = match[1];

            // Ignorar constructores y métodos privados obvios
            if (methodName === 'constructor' || methodName.startsWith('_')) {
                continue;
            }

            // Buscar JSDoc antes del método
            const methodLine = content.substring(0, match.index).split('\n').length;
            const jsDoc = this._extractJSDocForLine(lines, methodLine);

            methods.push({
                name: methodName,
                description: jsDoc?.description || null,
                params: jsDoc?.params || [],
                returns: jsDoc?.returns || null
            });
        }

        return methods;
    }

    _extractJSDocForLine(lines, targetLine) {
        // Buscar hacia atrás desde targetLine
        let jsDocLines = [];
        for (let i = targetLine - 2; i >= Math.max(0, targetLine - 20); i--) {
            const line = lines[i].trim();
            if (line.startsWith('*') || line.startsWith('/**')) {
                jsDocLines.unshift(line);
            } else if (jsDocLines.length > 0) {
                break;
            }
        }

        if (jsDocLines.length === 0) return null;

        const jsDocText = jsDocLines.join('\n');
        const descMatch = jsDocText.match(/\*\s+([^@*\n][^*\n]{10,})/);
        const params = [...jsDocText.matchAll(/@param\s+\{([^}]+)\}\s+(\w+)\s*-?\s*(.+)/g)].map(m => ({
            type: m[1],
            name: m[2],
            description: m[3].trim()
        }));
        const returnsMatch = jsDocText.match(/@returns?\s+\{([^}]+)\}\s+(.+)/);

        return {
            description: descMatch ? descMatch[1].trim() : null,
            params,
            returns: returnsMatch ? { type: returnsMatch[1], description: returnsMatch[2].trim() } : null
        };
    }

    _extractIntegrations(lines, content) {
        const integrations = new Set();

        // Buscar requires de otros servicios
        const requireRegex = /require\(['"]\.\.\/(?:services|workflows|routes)\/(\w+)/g;
        let match;
        while ((match = requireRegex.exec(content)) !== null) {
            integrations.add(match[1]);
        }

        // Buscar llamadas a otros servicios
        const serviceCallRegex = /(\w+Service|NotificationWorkflowService|AuditorEngine)\./g;
        while ((match = serviceCallRegex.exec(content)) !== null) {
            integrations.add(match[1]);
        }

        return Array.from(integrations);
    }

    _extractFormulas(lines) {
        const formulas = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Detectar fórmulas en comentarios
            if (line.includes('Fórmula:') || line.includes('Formula:') || line.includes('IRA =') || line.includes('Z-Score')) {
                const formula = line.replace(/^[*\s/]+/, '').trim();
                formulas.push(formula);
            }

            // Detectar ecuaciones matemáticas
            if (/[a-zA-Z]\s*=\s*[^=]+[+\-*/]/.test(line) && line.includes('//')) {
                const formula = line.split('//')[1]?.trim();
                if (formula) formulas.push(formula);
            }
        }

        return formulas;
    }

    _extractAlgorithms(lines) {
        const algorithms = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes('ALGORITMO') || line.includes('Algorithm') ||
                line.includes('METODOLOGÍA') || line.includes('MODELO')) {
                // Capturar las siguientes líneas hasta encontrar una línea vacía
                let algo = line.replace(/^[*\s/]+/, '').trim();
                for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                    const nextLine = lines[j].replace(/^[*\s/]+/, '').trim();
                    if (nextLine.length === 0 || nextLine === '*') break;
                    algo += ' ' + nextLine;
                }
                algorithms.push(algo);
            }
        }

        return algorithms;
    }

    _extractBusinessFlows(lines) {
        const flows = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes('FLUJO') || line.includes('WORKFLOW') || line.includes('PROCESO')) {
                let flow = line.replace(/^[*\s/]+/, '').trim();
                flows.push(flow);
            }
        }

        return flows;
    }

    _extractDependencies(lines, content) {
        const deps = new Set();

        // Buscar imports/requires
        const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
        let match;
        while ((match = requireRegex.exec(content)) !== null) {
            const req = match[1];
            if (req.startsWith('../models/')) {
                deps.add('models/' + req.split('/').pop());
            } else if (req.startsWith('../services/')) {
                deps.add('services/' + req.split('/').pop());
            } else if (!req.startsWith('.') && !req.includes('/')) {
                deps.add('npm/' + req);
            }
        }

        return Array.from(deps);
    }

    _extractStandards(lines) {
        const standards = [];
        const standardRegex = /ISO\s+\d+|ANSI\s+\w+|RFC\s+\d+|LCT|Art\.\s*\d+/gi;

        for (const line of lines) {
            const matches = line.match(standardRegex);
            if (matches) {
                standards.push(...matches);
            }
        }

        return [...new Set(standards)];
    }

    _extractFeatures(lines) {
        const features = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Buscar bullet points de características
            if (/^\s*[*-]\s+[A-Z]/.test(line)) {
                const feature = line.replace(/^[*\s-]+/, '').trim();
                if (feature.length > 10 && feature.length < 200) {
                    features.push(feature);
                }
            }
        }

        return features;
    }

    _extractTables(content) {
        const tables = new Set();

        // Buscar menciones de tablas en queries
        const tableRegex = /FROM\s+(\w+)|JOIN\s+(\w+)|UPDATE\s+(\w+)|INSERT INTO\s+(\w+)/gi;
        let match;
        while ((match = tableRegex.exec(content)) !== null) {
            const tableName = match[1] || match[2] || match[3] || match[4];
            if (tableName && !['SELECT', 'WHERE', 'SET'].includes(tableName.toUpperCase())) {
                tables.add(tableName);
            }
        }

        return Array.from(tables);
    }

    _extractEndpoints(lines, content) {
        const endpoints = [];
        const routeRegex = /router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
        let match;

        while ((match = routeRegex.exec(content)) !== null) {
            endpoints.push({
                method: match[1].toUpperCase(),
                path: match[2]
            });
        }

        return endpoints;
    }

    // ========================================================================
    // CONSOLIDAR ANÁLISIS
    // ========================================================================

    _consolidateAnalysis(moduleKey, registryData, analysisResults) {
        const validResults = analysisResults.filter(r => r !== null);

        if (validResults.length === 0) {
            return this._generateFallbackCapabilities(moduleKey, registryData);
        }

        // Consolidar de todos los archivos analizados
        const allMethods = validResults.flatMap(r => r.methods || []);
        const allIntegrations = [...new Set(validResults.flatMap(r => r.integrations || []))];
        const allFormulas = [...new Set(validResults.flatMap(r => r.formulas || []))];
        const allAlgorithms = [...new Set(validResults.flatMap(r => r.algorithms || []))];
        const allBusinessFlows = [...new Set(validResults.flatMap(r => r.businessFlows || []))];
        const allDependencies = [...new Set(validResults.flatMap(r => r.dependencies || []))];
        const allStandards = [...new Set(validResults.flatMap(r => r.standards || []))];
        const allFeatures = [...new Set(validResults.flatMap(r => r.features || []))];
        const allTables = [...new Set(validResults.flatMap(r => r.tables || []))];
        const allEndpoints = validResults.flatMap(r => r.endpoints || []);

        // Obtener header del archivo principal
        const mainHeader = validResults[0]?.header || {};

        return {
            moduleKey,
            moduleName: registryData.name,
            category: registryData.category,
            version: mainHeader.version || registryData.version,
            description: registryData.description,
            analysisDate: new Date().toISOString(),

            // Capacidades extraídas del código real
            methods: allMethods.slice(0, 20), // Top 20 métodos
            integrations: allIntegrations,
            formulas: allFormulas,
            algorithms: allAlgorithms,
            businessFlows: allBusinessFlows,
            dependencies: allDependencies,
            standards: allStandards,
            features: allFeatures.slice(0, 15), // Top 15 features
            tables: allTables,
            endpoints: allEndpoints.slice(0, 30), // Top 30 endpoints

            // Stats
            stats: {
                totalMethods: allMethods.length,
                totalIntegrations: allIntegrations.length,
                totalFormulas: allFormulas.length,
                totalEndpoints: allEndpoints.length,
                filesAnalyzed: validResults.length,
                linesAnalyzed: validResults.reduce((sum, r) => {
                    return sum + (r.methods?.length || 0) * 10; // Estimado
                }, 0)
            }
        };
    }

    _generateFallbackCapabilities(moduleKey, registryData) {
        return {
            moduleKey,
            moduleName: registryData.name,
            category: registryData.category,
            version: registryData.version,
            description: registryData.description,
            analysisDate: new Date().toISOString(),
            methods: [],
            integrations: [],
            formulas: [],
            algorithms: [],
            businessFlows: [],
            dependencies: [],
            standards: [],
            features: [],
            tables: [],
            endpoints: [],
            stats: {
                totalMethods: 0,
                totalIntegrations: 0,
                totalFormulas: 0,
                totalEndpoints: 0,
                filesAnalyzed: 0,
                linesAnalyzed: 0
            },
            fallback: true,
            reason: 'No se encontraron archivos de código relacionados'
        };
    }
}

module.exports = DeepModuleAnalyzer;
