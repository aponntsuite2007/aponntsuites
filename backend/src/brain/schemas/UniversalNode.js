/**
 * ============================================================================
 * UNIVERSAL NODE SCHEMA
 * ============================================================================
 *
 * El nodo universal es la unidad fundamental del sistema introspectivo.
 * Puede representar CUALQUIER entidad: módulo de software, persona, rol,
 * departamento, proceso, evento, recurso, etc.
 *
 * PRINCIPIO CLAVE: El nodo se describe a sí mismo mediante capacidades
 * (provides/consumes/emits/listens) - el Brain deduce las relaciones.
 *
 * Created: 2025-12-17
 * Phase: 1 - Schema & Vocabulary
 */

const { CapabilitiesVocabulary } = require('./CapabilitiesVocabulary');

/**
 * Tipos de nodos soportados
 */
const NodeType = {
    // Software
    MODULE: 'module',           // Módulo de software (users, attendance, etc.)
    ENDPOINT: 'endpoint',       // API endpoint
    SERVICE: 'service',         // Servicio backend
    DATABASE: 'database',       // Tabla/entidad de BD
    FRONTEND: 'frontend',       // Componente frontend
    WORKFLOW: 'workflow',       // Flujo de trabajo

    // Organizacional
    PERSON: 'person',           // Empleado, usuario
    ROLE: 'role',              // Rol (admin, supervisor, etc.)
    DEPARTMENT: 'department',   // Departamento
    COMPANY: 'company',         // Empresa/tenant
    BRANCH: 'branch',          // Sucursal
    TEAM: 'team',              // Equipo de trabajo

    // Abstractos
    PROCESS: 'process',         // Proceso de negocio
    EVENT: 'event',            // Evento del sistema
    RESOURCE: 'resource',       // Recurso (documento, archivo, etc.)
    CAPABILITY: 'capability',   // Capacidad abstracta
    POLICY: 'policy',          // Política/regla de negocio

    // Meta
    BRAIN: 'brain',            // El propio sistema Brain
    EXTERNAL: 'external'       // Sistema externo (AFIP, etc.)
};

/**
 * Estados posibles de un nodo
 */
const NodeStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    DEPRECATED: 'deprecated',
    BETA: 'beta',
    DRAFT: 'draft',
    ERROR: 'error'
};

/**
 * Clase UniversalNode - Entidad auto-descriptiva
 */
class UniversalNode {
    /**
     * Constructor del nodo universal
     * @param {Object} config - Configuración del nodo
     */
    constructor(config = {}) {
        // === IDENTIDAD ===
        this.id = config.id || this.generateId();
        this.key = config.key || null;                    // Clave única (ej: "users", "attendance")
        this.name = config.name || 'Unknown Node';
        this.type = config.type || NodeType.MODULE;
        this.version = config.version || '1.0.0';
        this.status = config.status || NodeStatus.ACTIVE;

        // === CONTEXTO ===
        this.category = config.category || 'general';     // Categoría (HR, COMMERCIAL, etc.)
        this.domain = config.domain || 'system';          // Dominio (software, organization, business)
        this.tenant = config.tenant || null;              // company_id si es multi-tenant
        this.parent = config.parent || null;              // Nodo padre (jerarquía)

        // === CAPACIDADES (el corazón del sistema) ===
        this.provides = config.provides || [];            // Lo que ofrece al ecosistema
        this.consumes = config.consumes || [];            // Lo que necesita de otros
        this.emits = config.emits || [];                  // Eventos que genera
        this.listens = config.listens || [];              // Eventos que escucha

        // === METADATA ===
        this.description = config.description || '';
        this.icon = config.icon || 'fa-cube';
        this.color = config.color || '#6b7280';
        this.tags = config.tags || [];

        // === UBICACIÓN (para software) ===
        this.location = config.location || {
            file: null,                                    // Archivo principal
            routes: [],                                    // Archivos de rutas
            services: [],                                  // Archivos de servicios
            frontend: [],                                  // Archivos frontend
            migrations: []                                 // Migraciones de BD
        };

        // === DEPENDENCIAS EXPLÍCITAS (opcional, Brain puede deducirlas) ===
        this.dependencies = config.dependencies || {
            required: [],                                  // Nodos requeridos
            optional: [],                                  // Nodos opcionales
            conflicts: []                                  // Nodos incompatibles
        };

        // === MÉTRICAS ===
        this.metrics = config.metrics || {
            health: 100,                                   // 0-100
            usage: 0,                                      // Frecuencia de uso
            errors: 0,                                     // Errores recientes
            lastActivity: null                             // Última actividad
        };

        // === COMERCIAL (para módulos vendibles) ===
        this.commercial = config.commercial || {
            is_sellable: false,
            base_price: 0,
            is_core: false,
            bundles: []
        };

        // === AYUDA ===
        this.help = config.help || {
            quickStart: [],
            tips: [],
            warnings: [],
            faqs: []
        };

        // === TIMESTAMPS ===
        this.createdAt = config.createdAt || new Date().toISOString();
        this.updatedAt = config.updatedAt || new Date().toISOString();

        // === INTROSPECCIÓN ===
        this._deducedRelations = [];                       // Relaciones deducidas por Brain
        this._validationErrors = [];                       // Errores de validación
    }

    /**
     * Generar ID único
     */
    generateId() {
        return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // =========================================================================
    // MÉTODOS DE CAPACIDADES
    // =========================================================================

    /**
     * Agregar una capacidad que el nodo provee
     * @param {string} capability - Capacidad del vocabulario
     * @param {Object} details - Detalles adicionales
     */
    addProvides(capability, details = {}) {
        if (!CapabilitiesVocabulary.isValid(capability)) {
            console.warn(`[UniversalNode] Capability '${capability}' no está en el vocabulario`);
        }

        const exists = this.provides.find(p => p.capability === capability);
        if (!exists) {
            this.provides.push({
                capability,
                details,
                addedAt: new Date().toISOString()
            });
            this.updatedAt = new Date().toISOString();
        }
        return this;
    }

    /**
     * Agregar una capacidad que el nodo consume
     * @param {string} capability - Capacidad requerida
     * @param {Object} options - Opciones (required, fallback, etc.)
     */
    addConsumes(capability, options = { required: true }) {
        if (!CapabilitiesVocabulary.isValid(capability)) {
            console.warn(`[UniversalNode] Capability '${capability}' no está en el vocabulario`);
        }

        const exists = this.consumes.find(c => c.capability === capability);
        if (!exists) {
            this.consumes.push({
                capability,
                required: options.required !== false,
                fallback: options.fallback || null,
                addedAt: new Date().toISOString()
            });
            this.updatedAt = new Date().toISOString();
        }
        return this;
    }

    /**
     * Agregar un evento que el nodo emite
     * @param {string} event - Nombre del evento
     * @param {Object} schema - Schema del payload
     */
    addEmits(event, schema = {}) {
        const exists = this.emits.find(e => e.event === event);
        if (!exists) {
            this.emits.push({
                event,
                schema,
                addedAt: new Date().toISOString()
            });
            this.updatedAt = new Date().toISOString();
        }
        return this;
    }

    /**
     * Agregar un evento que el nodo escucha
     * @param {string} event - Nombre del evento
     * @param {Function|string} handler - Handler o nombre de función
     */
    addListens(event, handler = null) {
        const exists = this.listens.find(l => l.event === event);
        if (!exists) {
            this.listens.push({
                event,
                handler: typeof handler === 'function' ? handler.name : handler,
                addedAt: new Date().toISOString()
            });
            this.updatedAt = new Date().toISOString();
        }
        return this;
    }

    // =========================================================================
    // MÉTODOS DE CONSULTA
    // =========================================================================

    /**
     * Verificar si el nodo provee una capacidad
     * @param {string} capability
     */
    doesProvide(capability) {
        return this.provides.some(p => p.capability === capability);
    }

    /**
     * Verificar si el nodo consume una capacidad
     * @param {string} capability
     */
    doesConsume(capability) {
        return this.consumes.some(c => c.capability === capability);
    }

    /**
     * Verificar si el nodo emite un evento
     * @param {string} event
     */
    doesEmit(event) {
        return this.emits.some(e => e.event === event);
    }

    /**
     * Verificar si el nodo escucha un evento
     * @param {string} event
     */
    doesListen(event) {
        return this.listens.some(l => l.event === event);
    }

    /**
     * Obtener todas las capacidades requeridas (consumes con required: true)
     */
    getRequiredCapabilities() {
        return this.consumes.filter(c => c.required).map(c => c.capability);
    }

    /**
     * Obtener capacidades opcionales
     */
    getOptionalCapabilities() {
        return this.consumes.filter(c => !c.required).map(c => c.capability);
    }

    // =========================================================================
    // VALIDACIÓN
    // =========================================================================

    /**
     * Validar la integridad del nodo
     */
    validate() {
        this._validationErrors = [];

        // Campos requeridos
        if (!this.key) {
            this._validationErrors.push('Campo "key" es requerido');
        }
        if (!this.name) {
            this._validationErrors.push('Campo "name" es requerido');
        }
        if (!Object.values(NodeType).includes(this.type)) {
            this._validationErrors.push(`Tipo "${this.type}" no es válido`);
        }

        // Validar capacidades contra vocabulario
        for (const p of this.provides) {
            if (!CapabilitiesVocabulary.isValid(p.capability)) {
                this._validationErrors.push(`Provides: "${p.capability}" no está en vocabulario`);
            }
        }
        for (const c of this.consumes) {
            if (!CapabilitiesVocabulary.isValid(c.capability)) {
                this._validationErrors.push(`Consumes: "${c.capability}" no está en vocabulario`);
            }
        }

        return {
            valid: this._validationErrors.length === 0,
            errors: this._validationErrors
        };
    }

    // =========================================================================
    // SERIALIZACIÓN
    // =========================================================================

    /**
     * Convertir a objeto plano (para JSON)
     */
    toJSON() {
        return {
            id: this.id,
            key: this.key,
            name: this.name,
            type: this.type,
            version: this.version,
            status: this.status,
            category: this.category,
            domain: this.domain,
            tenant: this.tenant,
            parent: this.parent,
            provides: this.provides,
            consumes: this.consumes,
            emits: this.emits,
            listens: this.listens,
            description: this.description,
            icon: this.icon,
            color: this.color,
            tags: this.tags,
            location: this.location,
            dependencies: this.dependencies,
            metrics: this.metrics,
            commercial: this.commercial,
            help: this.help,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Crear desde objeto plano
     * @param {Object} data
     */
    static fromJSON(data) {
        return new UniversalNode(data);
    }

    /**
     * Crear nodo de tipo módulo de software
     * @param {string} key
     * @param {string} name
     * @param {Object} options
     */
    static createModule(key, name, options = {}) {
        return new UniversalNode({
            key,
            name,
            type: NodeType.MODULE,
            domain: 'software',
            ...options
        });
    }

    /**
     * Crear nodo de tipo persona
     * @param {string} id
     * @param {string} name
     * @param {Object} options
     */
    static createPerson(id, name, options = {}) {
        return new UniversalNode({
            id,
            key: `person_${id}`,
            name,
            type: NodeType.PERSON,
            domain: 'organization',
            ...options
        });
    }

    /**
     * Crear nodo de tipo departamento
     * @param {string} key
     * @param {string} name
     * @param {Object} options
     */
    static createDepartment(key, name, options = {}) {
        return new UniversalNode({
            key,
            name,
            type: NodeType.DEPARTMENT,
            domain: 'organization',
            ...options
        });
    }

    /**
     * Crear nodo de tipo workflow
     * @param {string} key
     * @param {string} name
     * @param {Object} options
     */
    static createWorkflow(key, name, options = {}) {
        return new UniversalNode({
            key,
            name,
            type: NodeType.WORKFLOW,
            domain: 'business',
            ...options
        });
    }

    // =========================================================================
    // DEBUGGING
    // =========================================================================

    /**
     * Representación string del nodo
     */
    toString() {
        return `[${this.type.toUpperCase()}] ${this.name} (${this.key}) - ` +
               `P:${this.provides.length} C:${this.consumes.length} ` +
               `E:${this.emits.length} L:${this.listens.length}`;
    }

    /**
     * Imprimir resumen del nodo
     */
    print() {
        console.log('\n' + '='.repeat(60));
        console.log(`NODE: ${this.name}`);
        console.log('='.repeat(60));
        console.log(`  Key: ${this.key}`);
        console.log(`  Type: ${this.type}`);
        console.log(`  Status: ${this.status}`);
        console.log(`  Category: ${this.category}`);
        console.log('\n  PROVIDES:');
        this.provides.forEach(p => console.log(`    - ${p.capability}`));
        console.log('\n  CONSUMES:');
        this.consumes.forEach(c => console.log(`    - ${c.capability} (${c.required ? 'required' : 'optional'})`));
        console.log('\n  EMITS:');
        this.emits.forEach(e => console.log(`    - ${e.event}`));
        console.log('\n  LISTENS:');
        this.listens.forEach(l => console.log(`    - ${l.event}`));
        console.log('='.repeat(60) + '\n');
    }
}

module.exports = {
    UniversalNode,
    NodeType,
    NodeStatus
};
