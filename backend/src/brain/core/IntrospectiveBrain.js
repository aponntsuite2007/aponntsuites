/**
 * ============================================================================
 * INTROSPECTIVE BRAIN
 * ============================================================================
 *
 * El cerebro introspectivo es el núcleo del sistema. Su función principal es:
 *
 * 1. REGISTRAR NODOS - Almacena todos los UniversalNodes del ecosistema
 * 2. DEDUCIR RELACIONES - Matchea provides/consumes/emits/listens automáticamente
 * 3. MANTENER GRAFO - Construye y mantiene el grafo de relaciones
 * 4. DETECTAR PROBLEMAS - Identifica dependencias rotas, ciclos, etc.
 * 5. RESPONDER PREGUNTAS - ¿Quién provee X? ¿Quién consume Y? ¿Qué pasa si falla Z?
 *
 * PRINCIPIO CLAVE: El Brain NO tiene relaciones hardcodeadas.
 * Las relaciones son DEDUCIDAS de las capacidades declaradas por cada nodo.
 *
 * Created: 2025-12-17
 * Phase: 2 - IntrospectiveBrain Core
 */

const { UniversalNode, NodeType, NodeStatus } = require('../schemas/UniversalNode');
const { CapabilitiesVocabulary, STANDARD_EVENTS } = require('../schemas/CapabilitiesVocabulary');

/**
 * Tipos de relación deducida
 */
const RelationType = {
    PROVIDES_TO: 'provides_to',       // A provee algo que B consume
    CONSUMES_FROM: 'consumes_from',   // A consume algo que B provee
    EMITS_TO: 'emits_to',             // A emite eventos que B escucha
    LISTENS_FROM: 'listens_from',     // A escucha eventos que B emite
    DEPENDS_ON: 'depends_on',         // A depende de B (consume required)
    OPTIONAL_OF: 'optional_of',       // A opcionalmente usa B (consume optional)
    HIERARCHY: 'hierarchy'            // A es padre/hijo de B (org structure)
};

/**
 * Clase IntrospectiveBrain - El cerebro del ecosistema
 */
class IntrospectiveBrain {
    constructor() {
        // Almacén de nodos por key
        this.nodes = new Map();

        // Almacén de nodos por tipo
        this.nodesByType = new Map();

        // Grafo de relaciones deducidas
        this.relations = [];

        // Cache de búsquedas
        this.cache = {
            providers: new Map(),      // capability -> [nodeKeys]
            consumers: new Map(),      // capability -> [nodeKeys]
            emitters: new Map(),       // event -> [nodeKeys]
            listeners: new Map(),      // event -> [nodeKeys]
            lastBuild: null
        };

        // Estadísticas
        this.stats = {
            totalNodes: 0,
            totalRelations: 0,
            orphanNodes: 0,
            brokenDependencies: 0,
            lastAnalysis: null
        };

        // Configuración
        this.config = {
            autoRebuildCache: true,
            detectCycles: true,
            strictValidation: false
        };
    }

    // =========================================================================
    // REGISTRO DE NODOS
    // =========================================================================

    /**
     * Registrar un nuevo nodo en el Brain
     * @param {UniversalNode} node - Nodo a registrar
     */
    register(node) {
        if (!(node instanceof UniversalNode)) {
            // Convertir desde objeto plano
            node = UniversalNode.fromJSON(node);
        }

        if (!node.key) {
            throw new Error('Nodo debe tener una key');
        }

        // Validar si está configurado
        if (this.config.strictValidation) {
            const validation = node.validate();
            if (!validation.valid) {
                throw new Error(`Nodo inválido: ${validation.errors.join(', ')}`);
            }
        }

        // Almacenar por key
        this.nodes.set(node.key, node);

        // Almacenar por tipo
        if (!this.nodesByType.has(node.type)) {
            this.nodesByType.set(node.type, new Set());
        }
        this.nodesByType.get(node.type).add(node.key);

        // Invalidar cache
        this.cache.lastBuild = null;

        // Actualizar estadísticas
        this.stats.totalNodes = this.nodes.size;

        console.log(`🧠 [BRAIN] Nodo registrado: ${node.key} (${node.type})`);
        return node;
    }

    /**
     * Registrar múltiples nodos
     * @param {Array<UniversalNode>} nodes
     */
    registerMany(nodes) {
        for (const node of nodes) {
            this.register(node);
        }
        return this;
    }

    /**
     * Desregistrar un nodo
     * @param {string} key
     */
    unregister(key) {
        const node = this.nodes.get(key);
        if (node) {
            this.nodes.delete(key);
            this.nodesByType.get(node.type)?.delete(key);
            this.cache.lastBuild = null;
            this.stats.totalNodes = this.nodes.size;
            console.log(`🧠 [BRAIN] Nodo eliminado: ${key}`);
        }
        return this;
    }

    /**
     * Obtener un nodo por key
     * @param {string} key
     */
    getNode(key) {
        return this.nodes.get(key);
    }

    /**
     * Obtener todos los nodos de un tipo
     * @param {string} type - NodeType
     */
    getNodesByType(type) {
        const keys = this.nodesByType.get(type);
        if (!keys) return [];
        return Array.from(keys).map(key => this.nodes.get(key));
    }

    /**
     * Obtener todos los nodos
     */
    getAllNodes() {
        return Array.from(this.nodes.values());
    }

    // =========================================================================
    // CONSTRUCCIÓN DEL GRAFO DE RELACIONES
    // =========================================================================

    /**
     * Construir/reconstruir el grafo de relaciones
     * Deduce TODAS las relaciones basándose en provides/consumes/emits/listens
     */
    buildRelationGraph() {
        console.log('🧠 [BRAIN] Construyendo grafo de relaciones...');

        // Limpiar relaciones previas
        this.relations = [];
        this.cache.providers.clear();
        this.cache.consumers.clear();
        this.cache.emitters.clear();
        this.cache.listeners.clear();

        // Fase 1: Indexar capacidades
        this._indexCapabilities();

        // Fase 2: Deducir relaciones provides/consumes
        this._deduceProvidesConsumesRelations();

        // Fase 3: Deducir relaciones emits/listens
        this._deduceEmitsListensRelations();

        // Fase 4: Detectar problemas
        this._detectProblems();

        // Actualizar cache
        this.cache.lastBuild = new Date().toISOString();

        // Actualizar estadísticas
        this.stats.totalRelations = this.relations.length;
        this.stats.lastAnalysis = this.cache.lastBuild;

        console.log(`🧠 [BRAIN] Grafo construido: ${this.stats.totalRelations} relaciones`);

        return this.relations;
    }

    /**
     * Indexar todas las capacidades para búsqueda rápida
     */
    _indexCapabilities() {
        for (const node of this.nodes.values()) {
            // Indexar provides
            for (const p of node.provides) {
                if (!this.cache.providers.has(p.capability)) {
                    this.cache.providers.set(p.capability, []);
                }
                this.cache.providers.get(p.capability).push(node.key);
            }

            // Indexar consumes
            for (const c of node.consumes) {
                if (!this.cache.consumers.has(c.capability)) {
                    this.cache.consumers.set(c.capability, []);
                }
                this.cache.consumers.get(c.capability).push(node.key);
            }

            // Indexar emits
            for (const e of node.emits) {
                if (!this.cache.emitters.has(e.event)) {
                    this.cache.emitters.set(e.event, []);
                }
                this.cache.emitters.get(e.event).push(node.key);
            }

            // Indexar listens
            for (const l of node.listens) {
                if (!this.cache.listeners.has(l.event)) {
                    this.cache.listeners.set(l.event, []);
                }
                this.cache.listeners.get(l.event).push(node.key);
            }
        }
    }

    /**
     * Deducir relaciones provides/consumes
     */
    _deduceProvidesConsumesRelations() {
        for (const [capability, consumerKeys] of this.cache.consumers) {
            // Buscar quién provee esta capacidad
            const providerKeys = this._findCompatibleProviders(capability);

            for (const consumerKey of consumerKeys) {
                const consumer = this.nodes.get(consumerKey);
                const consumeInfo = consumer.consumes.find(c => c.capability === capability);

                for (const providerKey of providerKeys) {
                    // No auto-relación
                    if (providerKey === consumerKey) continue;

                    // Crear relación
                    this.relations.push({
                        type: consumeInfo.required ? RelationType.DEPENDS_ON : RelationType.OPTIONAL_OF,
                        from: consumerKey,
                        to: providerKey,
                        capability,
                        required: consumeInfo.required,
                        deducedAt: new Date().toISOString()
                    });
                }
            }
        }
    }

    /**
     * Buscar providers compatibles para una capacidad
     */
    _findCompatibleProviders(capability) {
        const exact = this.cache.providers.get(capability) || [];
        const compatible = [];

        // Buscar wildcards (ej: data:* provee data:read)
        for (const [provCap, providers] of this.cache.providers) {
            if (provCap !== capability && CapabilitiesVocabulary.isCompatible(provCap, capability)) {
                compatible.push(...providers);
            }
        }

        return [...new Set([...exact, ...compatible])];
    }

    /**
     * Deducir relaciones emits/listens
     */
    _deduceEmitsListensRelations() {
        for (const [event, listenerKeys] of this.cache.listeners) {
            const emitterKeys = this.cache.emitters.get(event) || [];

            for (const listenerKey of listenerKeys) {
                for (const emitterKey of emitterKeys) {
                    // No auto-relación
                    if (emitterKey === listenerKey) continue;

                    // Crear relación
                    this.relations.push({
                        type: RelationType.LISTENS_FROM,
                        from: listenerKey,
                        to: emitterKey,
                        event,
                        deducedAt: new Date().toISOString()
                    });
                }
            }
        }
    }

    /**
     * Detectar problemas en el grafo
     */
    _detectProblems() {
        this.stats.brokenDependencies = 0;
        this.stats.orphanNodes = 0;

        for (const node of this.nodes.values()) {
            let hasRelations = false;

            // Verificar dependencias requeridas rotas
            for (const consume of node.consumes) {
                if (!consume.required) continue;

                const providers = this._findCompatibleProviders(consume.capability);
                if (providers.length === 0) {
                    this.stats.brokenDependencies++;
                    console.warn(`⚠️ [BRAIN] Dependencia rota: ${node.key} consume '${consume.capability}' pero nadie lo provee`);
                } else {
                    hasRelations = true;
                }
            }

            // Verificar si es huérfano (no tiene relaciones)
            if (!hasRelations && node.consumes.length === 0 && node.provides.length === 0) {
                this.stats.orphanNodes++;
            }
        }
    }

    // =========================================================================
    // CONSULTAS AL GRAFO
    // =========================================================================

    /**
     * ¿Quién provee una capacidad?
     * @param {string} capability
     */
    whoProvides(capability) {
        this._ensureCacheBuilt();
        const keys = this._findCompatibleProviders(capability);
        return keys.map(key => this.nodes.get(key));
    }

    /**
     * ¿Quién consume una capacidad?
     * @param {string} capability
     */
    whoConsumes(capability) {
        this._ensureCacheBuilt();
        const keys = this.cache.consumers.get(capability) || [];
        return keys.map(key => this.nodes.get(key));
    }

    /**
     * ¿Quién emite un evento?
     * @param {string} event
     */
    whoEmits(event) {
        this._ensureCacheBuilt();
        const keys = this.cache.emitters.get(event) || [];
        return keys.map(key => this.nodes.get(key));
    }

    /**
     * ¿Quién escucha un evento?
     * @param {string} event
     */
    whoListens(event) {
        this._ensureCacheBuilt();
        const keys = this.cache.listeners.get(event) || [];
        return keys.map(key => this.nodes.get(key));
    }

    /**
     * ¿De qué depende un nodo? (dependencias directas)
     * @param {string} nodeKey
     */
    whatDependsOn(nodeKey) {
        this._ensureCacheBuilt();
        return this.relations
            .filter(r => r.from === nodeKey && (r.type === RelationType.DEPENDS_ON || r.type === RelationType.OPTIONAL_OF))
            .map(r => ({
                node: this.nodes.get(r.to),
                capability: r.capability,
                required: r.required
            }));
    }

    /**
     * ¿Qué depende de un nodo? (dependientes directos)
     * @param {string} nodeKey
     */
    whatDependsFrom(nodeKey) {
        this._ensureCacheBuilt();
        return this.relations
            .filter(r => r.to === nodeKey && (r.type === RelationType.DEPENDS_ON || r.type === RelationType.OPTIONAL_OF))
            .map(r => ({
                node: this.nodes.get(r.from),
                capability: r.capability,
                required: r.required
            }));
    }

    /**
     * ¿Qué pasa si falla un nodo? (análisis de impacto)
     * @param {string} nodeKey
     */
    whatIfFails(nodeKey) {
        this._ensureCacheBuilt();

        const affected = {
            directlyAffected: [],
            transitivelyAffected: [],
            eventSubscribers: []
        };

        const node = this.nodes.get(nodeKey);
        if (!node) return affected;

        // Dependientes directos (solo required)
        affected.directlyAffected = this.relations
            .filter(r => r.to === nodeKey && r.type === RelationType.DEPENDS_ON)
            .map(r => this.nodes.get(r.from));

        // Dependientes transitivos
        const visited = new Set([nodeKey]);
        const queue = [...affected.directlyAffected.map(n => n.key)];

        while (queue.length > 0) {
            const currentKey = queue.shift();
            if (visited.has(currentKey)) continue;
            visited.add(currentKey);

            const transitive = this.relations
                .filter(r => r.to === currentKey && r.type === RelationType.DEPENDS_ON)
                .map(r => r.from);

            for (const key of transitive) {
                if (!visited.has(key)) {
                    affected.transitivelyAffected.push(this.nodes.get(key));
                    queue.push(key);
                }
            }
        }

        // Suscriptores de eventos (si el nodo emite eventos)
        for (const emit of node.emits) {
            const listeners = this.whoListens(emit.event);
            affected.eventSubscribers.push(...listeners);
        }

        // Eliminar duplicados
        affected.transitivelyAffected = [...new Set(affected.transitivelyAffected)];
        affected.eventSubscribers = [...new Set(affected.eventSubscribers)];

        return affected;
    }

    /**
     * Obtener todas las relaciones de un nodo
     * @param {string} nodeKey
     */
    getNodeRelations(nodeKey) {
        this._ensureCacheBuilt();
        return {
            outgoing: this.relations.filter(r => r.from === nodeKey),
            incoming: this.relations.filter(r => r.to === nodeKey)
        };
    }

    /**
     * Verificar si un nodo puede funcionar (todas las dependencias satisfechas)
     * @param {string} nodeKey
     */
    canNodeWork(nodeKey) {
        this._ensureCacheBuilt();

        const node = this.nodes.get(nodeKey);
        if (!node) return { works: false, reason: 'Nodo no encontrado' };

        const missing = [];
        for (const consume of node.consumes) {
            if (!consume.required) continue;

            const providers = this._findCompatibleProviders(consume.capability);
            if (providers.length === 0) {
                missing.push(consume.capability);
            }
        }

        return {
            works: missing.length === 0,
            missing,
            reason: missing.length > 0 ? `Faltan: ${missing.join(', ')}` : 'OK'
        };
    }

    /**
     * Asegurar que el cache está construido
     */
    _ensureCacheBuilt() {
        if (!this.cache.lastBuild && this.config.autoRebuildCache) {
            this.buildRelationGraph();
        }
    }

    // =========================================================================
    // ANÁLISIS Y REPORTES
    // =========================================================================

    /**
     * Obtener estadísticas del Brain
     */
    getStats() {
        this._ensureCacheBuilt();

        return {
            ...this.stats,
            nodesByType: Object.fromEntries(
                Array.from(this.nodesByType.entries()).map(([type, keys]) => [type, keys.size])
            ),
            uniqueCapabilities: {
                provides: this.cache.providers.size,
                consumes: this.cache.consumers.size,
                emits: this.cache.emitters.size,
                listens: this.cache.listeners.size
            }
        };
    }

    /**
     * Generar grafo exportable (para visualización)
     */
    exportGraph() {
        this._ensureCacheBuilt();

        return {
            nodes: Array.from(this.nodes.values()).map(node => ({
                id: node.key,
                label: node.name,
                type: node.type,
                category: node.category,
                status: node.status,
                provides: node.provides.length,
                consumes: node.consumes.length,
                emits: node.emits.length,
                listens: node.listens.length
            })),
            edges: this.relations.map((rel, idx) => ({
                id: `e${idx}`,
                source: rel.from,
                target: rel.to,
                type: rel.type,
                label: rel.capability || rel.event,
                required: rel.required
            })),
            stats: this.getStats()
        };
    }

    /**
     * Generar reporte de salud del ecosistema
     */
    generateHealthReport() {
        this._ensureCacheBuilt();

        const report = {
            timestamp: new Date().toISOString(),
            overall: 'healthy',
            score: 100,
            issues: [],
            warnings: [],
            recommendations: []
        };

        // Verificar dependencias rotas
        if (this.stats.brokenDependencies > 0) {
            report.score -= this.stats.brokenDependencies * 10;
            report.issues.push(`${this.stats.brokenDependencies} dependencias rotas`);
        }

        // Verificar nodos huérfanos
        if (this.stats.orphanNodes > 0) {
            report.warnings.push(`${this.stats.orphanNodes} nodos sin relaciones`);
        }

        // Buscar nodos sin provides (solo consumen)
        let onlyConsumers = 0;
        for (const node of this.nodes.values()) {
            if (node.provides.length === 0 && node.consumes.length > 0) {
                onlyConsumers++;
            }
        }
        if (onlyConsumers > 5) {
            report.warnings.push(`${onlyConsumers} nodos solo consumen, no proveen`);
        }

        // Determinar estado overall
        if (report.score < 50) {
            report.overall = 'critical';
        } else if (report.score < 80) {
            report.overall = 'degraded';
        }

        // Recomendaciones
        if (report.issues.length > 0) {
            report.recommendations.push('Revisar módulos con dependencias rotas');
        }
        if (this.stats.orphanNodes > 0) {
            report.recommendations.push('Documentar capacidades de nodos huérfanos');
        }

        return report;
    }

    /**
     * Imprimir estado del Brain
     */
    print() {
        this._ensureCacheBuilt();

        console.log('\n' + '='.repeat(60));
        console.log('🧠 INTROSPECTIVE BRAIN STATUS');
        console.log('='.repeat(60));

        const stats = this.getStats();
        console.log(`\nNodos: ${stats.totalNodes}`);
        console.log(`Relaciones: ${stats.totalRelations}`);
        console.log(`Dependencias rotas: ${stats.brokenDependencies}`);
        console.log(`Nodos huérfanos: ${stats.orphanNodes}`);

        console.log('\nNodos por tipo:');
        for (const [type, count] of Object.entries(stats.nodesByType)) {
            console.log(`  ${type}: ${count}`);
        }

        console.log('\nCapacidades únicas:');
        console.log(`  Provides: ${stats.uniqueCapabilities.provides}`);
        console.log(`  Consumes: ${stats.uniqueCapabilities.consumes}`);
        console.log(`  Emits: ${stats.uniqueCapabilities.emits}`);
        console.log(`  Listens: ${stats.uniqueCapabilities.listens}`);

        console.log('\n' + '='.repeat(60) + '\n');
    }

    // =========================================================================
    // SERIALIZACIÓN
    // =========================================================================

    /**
     * Exportar todo el Brain a JSON
     */
    toJSON() {
        return {
            nodes: Array.from(this.nodes.values()).map(n => n.toJSON()),
            relations: this.relations,
            stats: this.stats,
            config: this.config,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Importar desde JSON
     * @param {Object} data
     */
    static fromJSON(data) {
        const brain = new IntrospectiveBrain();

        if (data.config) {
            brain.config = { ...brain.config, ...data.config };
        }

        if (data.nodes) {
            for (const nodeData of data.nodes) {
                brain.register(UniversalNode.fromJSON(nodeData));
            }
        }

        if (data.relations) {
            brain.relations = data.relations;
        }

        return brain;
    }
}

// Singleton instance
let brainInstance = null;

/**
 * Obtener instancia singleton del Brain
 */
const getIntrospectiveBrain = () => {
    if (!brainInstance) {
        brainInstance = new IntrospectiveBrain();
    }
    return brainInstance;
};

/**
 * Resetear el Brain (para testing)
 */
const resetBrain = () => {
    brainInstance = new IntrospectiveBrain();
    return brainInstance;
};

module.exports = {
    IntrospectiveBrain,
    RelationType,
    getIntrospectiveBrain,
    resetBrain
};
