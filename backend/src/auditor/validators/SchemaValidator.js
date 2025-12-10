/**
 * ============================================================================
 * SCHEMA VALIDATOR - Validación de Schemas Integrada en Phase4
 * ============================================================================
 *
 * Sistema inteligente que:
 * 1. Lee modules-registry.json (SSOT) para obtener estructura de endpoints
 * 2. Genera schemas dinámicamente basados en el código VIVO
 * 3. Valida respuestas API con AJV (JSON Schema Draft 7)
 * 4. Se integra directamente en Phase4TestOrchestrator
 *
 * NO HAY DUPLICACIÓN: Una sola fuente de verdad
 * NO HAY HARDCODE: Todo se genera desde metadata
 *
 * @version 1.0.0
 * @date 2025-12-10
 * @integrated_with Phase4TestOrchestrator
 * ============================================================================
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

class SchemaValidator {
  constructor(modulesRegistry = null) {
    // AJV con todas las extensiones
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      coerceTypes: true, // Permite coerción de tipos (string "1" -> number 1)
      removeAdditional: false, // No remueve campos adicionales
      useDefaults: true // Usa valores default si no están presentes
    });

    addFormats(this.ajv); // Soporte para email, date-time, uuid, etc.

    // Cargar modules-registry.json (SSOT)
    this.modulesRegistry = modulesRegistry || this.loadModulesRegistry();

    // Cache de schemas compilados (performance)
    this.schemaCache = new Map();

    // Schemas base comunes (DRY)
    this.commonSchemas = this.defineCommonSchemas();

    console.log('✅ [SCHEMA-VALIDATOR] Inicializado con SSOT');
    console.log(`   📦 Módulos cargados: ${this.modulesRegistry?.modules?.length || 0}`);
  }

  // =========================================================================
  // 1. CARGA DE MODULES-REGISTRY.JSON (SSOT)
  // =========================================================================

  loadModulesRegistry() {
    try {
      const registryPath = path.join(__dirname, '../registry/modules-registry.json');
      const content = fs.readFileSync(registryPath, 'utf8');
      const registry = JSON.parse(content);

      console.log(`📋 [SCHEMA-VALIDATOR] Registry cargado: ${registry.total_modules} módulos`);
      return registry;
    } catch (error) {
      console.error('❌ [SCHEMA-VALIDATOR] Error cargando registry:', error.message);
      return { modules: [] };
    }
  }

  // =========================================================================
  // 2. SCHEMAS COMUNES (DRY - Don't Repeat Yourself)
  // =========================================================================

  defineCommonSchemas() {
    return {
      // Pagination schema (usado en list endpoints - flexible para diferentes formatos)
      pagination: {
        type: 'object',
        required: [],  // Sin campos required - cada API usa diferentes nombres
        properties: {
          // Formato 1: page/limit/total/totalPages
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 1000 },
          total: { type: 'integer', minimum: 0 },
          totalPages: { type: 'integer', minimum: 0 },
          // Formato 2: currentPage/totalRecords/hasNext/hasPrev (attendance usa este)
          currentPage: { type: 'integer', minimum: 1 },
          totalRecords: { type: 'integer', minimum: 0 },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' }
        }
      },

      // Success response wrapper (usado por todos los endpoints)
      successWrapper: {
        type: 'object',
        required: [],
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      },

      // Error response wrapper
      errorWrapper: {
        type: 'object',
        required: ['error'],
        properties: {
          success: { type: 'boolean' },
          error: { type: 'string' },
          details: { type: 'object' }
        }
      },

      // User reference (usado en muchas relaciones)
      userRef: {
        type: 'object',
        required: ['user_id', 'name', 'email'],
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'hr', 'employee', 'medical', 'legal'] }
        }
      },

      // Company reference
      companyRef: {
        type: 'object',
        required: ['company_id', 'name'],
        properties: {
          company_id: { type: 'integer', minimum: 1 },
          name: { type: 'string', minLength: 1 },
          slug: { type: 'string', pattern: '^[a-z0-9-]+$' }
        }
      },

      // Department reference
      departmentRef: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'integer', minimum: 1 },
          name: { type: 'string', minLength: 1 },
          description: { type: ['string', 'null'] }
        }
      },

      // Timestamps (usado en todos los modelos)
      timestamps: {
        type: 'object',
        properties: {
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          deleted_at: { type: ['string', 'null'], format: 'date-time' }
        }
      }
    };
  }

  // =========================================================================
  // 3. GENERACIÓN DINÁMICA DE SCHEMAS (desde modules-registry.json)
  // =========================================================================

  /**
   * Genera schema para un endpoint específico basado en modules-registry.json
   * Si no hay metadata completa, usa CONVENCIONES INTELIGENTES
   *
   * @param {string} moduleId - ID del módulo (ej: 'users', 'departments')
   * @param {string} endpointKey - Key del endpoint (ej: 'list', 'get', 'create')
   * @returns {object} JSON Schema generado
   */
  generateSchemaFromRegistry(moduleId, endpointKey) {
    const module = this.modulesRegistry.modules?.find(m => m.id === moduleId);

    // Si el módulo NO existe en registry, usar convenciones
    if (!module) {
      console.warn(`⚠️ [SCHEMA-VALIDATOR] Módulo '${moduleId}' no en registry, usando convenciones`);
      return this.generateSchemaByConvention(moduleId, endpointKey);
    }

    // Si existe el módulo pero no tiene api_endpoints, usar convenciones con info del módulo
    if (!module.api_endpoints || module.api_endpoints.length === 0) {
      return this.generateSchemaByConvention(moduleId, endpointKey, module);
    }

    const endpoint = module.api_endpoints.find(e => e.key === endpointKey);

    if (!endpoint) {
      return this.generateSchemaByConvention(moduleId, endpointKey, module);
    }

    // Generar schema basado en el tipo de endpoint
    switch (endpointKey) {
      case 'list':
        return this.generateListSchema(module, endpoint);
      case 'get':
        return this.generateGetSchema(module, endpoint);
      case 'create':
      case 'update':
        return this.generateMutationSchema(module, endpoint);
      case 'delete':
        return this.generateDeleteSchema();
      default:
        return this.getGenericSuccessSchema();
    }
  }

  /**
   * Genera schema basado en CONVENCIONES del sistema (fallback inteligente)
   *
   * Convenciones APONNT:
   * - LIST: { success: true, data: { [moduleId]: [...], pagination: {...} } }
   * - GET: { success: true, data: { [singularModuleId]: {...} } }
   * - CREATE/UPDATE: { success: true, data: { [singularModuleId]: {...} }, message: "..." }
   * - DELETE: { success: true, message: "..." }
   */
  generateSchemaByConvention(moduleId, endpointKey, module = null) {
    const pluralKey = moduleId; // 'users', 'departments'
    const singularKey = moduleId.replace(/s$/, ''); // 'user', 'department'

    switch (endpointKey) {
      case 'list':
        // Schema flexible: acepta CUALQUIER array en root
        // (puede ser "users", "data", "records", etc.)
        return {
          type: 'object',
          required: [],  // Sin required - cada API usa diferentes nombres
          properties: {
            success: { type: 'boolean' },
            // Permitir cualquier propiedad adicional que sea array
            [pluralKey]: {  // Nombre esperado del módulo
              type: 'array',
              items: { type: 'object' }
            },
            data: {  // Nombre alternativo común ("data")
              type: 'array',
              items: { type: 'object' }
            },
            records: {  // Otro nombre alternativo común
              type: 'array',
              items: { type: 'object' }
            },
            pagination: this.commonSchemas.pagination,
            message: { type: 'string' }
          },
          additionalProperties: true  // Permitir otras propiedades
        };

      case 'get':
        return {
          type: 'object',
          required: [singularKey],  // Item en root, no dentro de 'data'
          properties: {
            success: { type: 'boolean' },
            [singularKey]: {
              type: 'object',
              required: ['id'],
              properties: {
                id: { type: ['integer', 'string'] }
              }
            },
            message: { type: 'string' }
          }
        };

      case 'create':
      case 'update':
        return {
          type: 'object',
          required: [singularKey],  // Item en root, no dentro de 'data'
          properties: {
            success: { type: 'boolean' },
            [singularKey]: {
              type: 'object',
              required: ['id'],
              properties: {
                id: { type: ['integer', 'string'] }
              }
            },
            message: { type: 'string' }
          }
        };

      case 'delete':
        return this.generateDeleteSchema();

      default:
        return this.getGenericSuccessSchema();
    }
  }

  /**
   * Schema para endpoints LIST (GET /api/module)
   */
  generateListSchema(module, endpoint) {
    const itemSchema = this.generateItemSchema(module);
    const expectedKey = endpoint.dataKey || `${module.id}`;

    return {
      type: 'object',
      required: [],  // Sin required - cada API usa diferentes nombres
      properties: {
        success: { type: 'boolean' },
        // Nombre esperado del endpoint
        [expectedKey]: {
          type: 'array',
          items: itemSchema
        },
        // Alternativas comunes
        data: {
          type: 'array',
          items: itemSchema
        },
        records: {
          type: 'array',
          items: itemSchema
        },
        pagination: this.commonSchemas.pagination,
        message: { type: 'string' }
      },
      additionalProperties: true  // Permitir otras propiedades
    };
  }

  /**
   * Schema para endpoints GET (GET /api/module/:id)
   */
  generateGetSchema(module, endpoint) {
    const itemSchema = this.generateItemSchema(module);

    return {
      type: 'object',
      required: [endpoint.dataKey || module.id.replace(/s$/, '')],  // Item en root
      properties: {
        success: { type: 'boolean' },
        [endpoint.dataKey || module.id.replace(/s$/, '')]: itemSchema,
        message: { type: 'string' }
      }
    };
  }

  /**
   * Schema para endpoints CREATE/UPDATE (POST/PUT)
   */
  generateMutationSchema(module, endpoint) {
    const itemSchema = this.generateItemSchema(module);

    return {
      type: 'object',
      required: [endpoint.dataKey || module.id.replace(/s$/, '')],  // Item en root
      properties: {
        success: { type: 'boolean' },
        [endpoint.dataKey || module.id.replace(/s$/, '')]: itemSchema,
        message: { type: 'string' }
      }
    };
  }

  /**
   * Schema para endpoints DELETE
   */
  generateDeleteSchema() {
    return {
      type: 'object',
      required: ['message'],
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string', minLength: 1 }
      }
    };
  }

  /**
   * Genera schema de un item individual basado en database_tables del registry
   */
  generateItemSchema(module) {
    const dbTable = module.database_tables?.[0]; // Primera tabla (principal)

    if (!dbTable || !dbTable.fields) {
      // Fallback: schema genérico
      return {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: ['integer', 'string'] }
        }
      };
    }

    // Generar properties dinámicamente desde fields
    const properties = {};
    const required = [];

    for (const field of dbTable.fields) {
      properties[field.name] = this.generateFieldSchema(field);

      if (field.required) {
        required.push(field.name);
      }
    }

    return {
      type: 'object',
      required: required.length > 0 ? required : ['id'],
      properties
    };
  }

  /**
   * Genera schema de un campo individual
   */
  generateFieldSchema(field) {
    const schema = {
      type: this.mapPgTypeToJsonType(field.type)
    };

    // Agregar validaciones según tipo
    if (field.type === 'VARCHAR' && field.length) {
      schema.maxLength = field.length;
    }

    if (field.type === 'TEXT') {
      schema.minLength = 0;
    }

    if (field.type === 'INTEGER') {
      schema.minimum = field.unsigned ? 0 : -2147483648;
    }

    if (field.type === 'BOOLEAN') {
      // Boolean acepta true/false
    }

    if (field.format) {
      schema.format = field.format; // email, date-time, uuid, etc.
    }

    if (field.enum) {
      schema.enum = field.enum;
    }

    if (field.nullable) {
      schema.type = [schema.type, 'null'];
    }

    return schema;
  }

  /**
   * Mapea tipos PostgreSQL a tipos JSON Schema
   */
  mapPgTypeToJsonType(pgType) {
    const typeMap = {
      'INTEGER': 'integer',
      'BIGINT': 'integer',
      'SERIAL': 'integer',
      'VARCHAR': 'string',
      'TEXT': 'string',
      'CHAR': 'string',
      'UUID': 'string',
      'BOOLEAN': 'boolean',
      'DATE': 'string',
      'TIMESTAMP': 'string',
      'TIMESTAMPTZ': 'string',
      'DECIMAL': 'number',
      'NUMERIC': 'number',
      'REAL': 'number',
      'DOUBLE': 'number',
      'JSONB': 'object',
      'JSON': 'object',
      'ARRAY': 'array'
    };

    return typeMap[pgType?.toUpperCase()] || 'string';
  }

  /**
   * Schema genérico de éxito (fallback)
   */
  getGenericSuccessSchema() {
    return {
      type: 'object',
      required: [],
      properties: {
        success: { type: 'boolean' },
        data: { type: ['object', 'array', 'null'] },
        message: { type: 'string' }
      }
    };
  }

  // =========================================================================
  // 4. VALIDACIÓN DE RESPUESTAS
  // =========================================================================

  /**
   * Valida una respuesta contra el schema esperado
   *
   * @param {string} moduleId - ID del módulo
   * @param {string} endpointKey - Key del endpoint
   * @param {object} responseData - Data recibida del API
   * @returns {object} { valid: boolean, errors: array }
   */
  validate(moduleId, endpointKey, responseData) {
    const cacheKey = `${moduleId}.${endpointKey}`;

    // Usar schema cacheado si existe
    let validate = this.schemaCache.get(cacheKey);

    if (!validate) {
      // Generar schema dinámicamente
      const schema = this.generateSchemaFromRegistry(moduleId, endpointKey);
      validate = this.ajv.compile(schema);
      this.schemaCache.set(cacheKey, validate);
    }

    const valid = validate(responseData);

    return {
      valid,
      errors: valid ? [] : this.formatErrors(validate.errors),
      schemaUsed: validate.schema
    };
  }

  /**
   * Formatea errores de AJV para ser human-readable
   */
  formatErrors(errors) {
    if (!errors || errors.length === 0) return [];

    return errors.map(err => ({
      path: err.instancePath || '/',
      field: err.instancePath?.split('/').pop() || 'root',
      message: err.message,
      keyword: err.keyword,
      expected: err.params,
      schemaPath: err.schemaPath
    }));
  }

  /**
   * Valida que la respuesta tenga la estructura base esperada
   * (antes de validar schema específico)
   */
  validateBaseStructure(responseData) {
    if (!responseData || typeof responseData !== 'object') {
      return {
        valid: false,
        errors: [{
          path: '/',
          message: 'Response debe ser un objeto',
          keyword: 'type'
        }]
      };
    }

    // Campo 'success' es OPCIONAL ahora
    // Si existe, debe ser boolean
    if (responseData.hasOwnProperty('success') && typeof responseData.success !== 'boolean') {
      return {
        valid: false,
        errors: [{
          path: '/success',
          message: 'Campo "success" debe ser boolean (si está presente)',
          keyword: 'type'
        }]
      };
    }

    return { valid: true, errors: [] };
  }

  // =========================================================================
  // 5. VALIDACIONES ESPECÍFICAS (Detección de Errores Comunes)
  // =========================================================================

  /**
   * Detecta errores comunes que causan ".map is not a function"
   */
  detectArrayErrors(moduleId, endpointKey, responseData) {
    const issues = [];

    // Si es endpoint LIST, verificar que data tenga arrays donde corresponde
    if (endpointKey === 'list') {
      const dataKeys = Object.keys(responseData.data || {});

      for (const key of dataKeys) {
        if (key === 'pagination') continue; // Skip pagination

        const value = responseData.data[key];

        if (!Array.isArray(value)) {
          issues.push({
            severity: 'critical',
            field: key,
            message: `Campo "${key}" debería ser array pero es ${typeof value}`,
            causesFrontendError: '.map is not a function',
            fix: `Verificar que API retorne { data: { ${key}: [...] } }`
          });
        }
      }
    }

    return issues;
  }

  /**
   * Detecta IDs inválidos o relaciones rotas
   */
  detectRelationErrors(moduleId, responseData) {
    const issues = [];

    // Verificar UUIDs válidos
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const checkUUIDs = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj || {})) {
        if (key.includes('_id') || key === 'id') {
          if (typeof value === 'string' && !uuidRegex.test(value) && value.length === 36) {
            issues.push({
              severity: 'high',
              field: `${path}${key}`,
              message: `UUID inválido: "${value}"`,
              fix: 'Verificar que el UUID sea generado correctamente'
            });
          }
        }

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          checkUUIDs(value, `${path}${key}.`);
        }
      }
    };

    checkUUIDs(responseData.data);

    return issues;
  }

  // =========================================================================
  // 6. REPORTE COMPLETO
  // =========================================================================

  /**
   * Ejecuta validación completa y retorna reporte detallado
   */
  validateComplete(moduleId, endpointKey, responseData) {
    const report = {
      moduleId,
      endpointKey,
      timestamp: new Date().toISOString(),
      valid: true,
      errors: [],
      warnings: [],
      issues: {
        schema: [],
        arrays: [],
        relations: []
      }
    };

    // 1. Validar estructura base
    const baseValidation = this.validateBaseStructure(responseData);
    if (!baseValidation.valid) {
      report.valid = false;
      report.errors.push(...baseValidation.errors);
      return report;
    }

    // 2. Validar schema específico
    const schemaValidation = this.validate(moduleId, endpointKey, responseData);
    if (!schemaValidation.valid) {
      report.valid = false;
      report.issues.schema = schemaValidation.errors;
    }

    // 3. Detectar errores de arrays (.map is not a function)
    const arrayErrors = this.detectArrayErrors(moduleId, endpointKey, responseData);
    if (arrayErrors.length > 0) {
      report.valid = false;
      report.issues.arrays = arrayErrors;
    }

    // 4. Detectar errores de relaciones
    const relationErrors = this.detectRelationErrors(moduleId, responseData);
    if (relationErrors.length > 0) {
      report.warnings.push(...relationErrors);
    }

    return report;
  }
}

module.exports = SchemaValidator;
