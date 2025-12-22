/**
 * ============================================================================
 * MODULE MIGRATOR
 * ============================================================================
 *
 * Migrador que convierte módulos del registry existente (modules-registry.json)
 * a UniversalNodes para el nuevo Brain Introspectivo.
 *
 * PROCESO:
 * 1. Lee modules-registry.json (formato antiguo)
 * 2. Infiere capacidades provides/consumes/emits/listens de:
 *    - API endpoints
 *    - Database tables
 *    - Dependencies declaradas
 *    - Business flows
 * 3. Crea UniversalNodes con toda la metadata
 * 4. Registra en el IntrospectiveBrain
 *
 * Created: 2025-12-17
 * Phase: 3 - Migration
 */

const path = require('path');
const fs = require('fs').promises;
const { UniversalNode, NodeType, NodeStatus } = require('../schemas/UniversalNode');
const { CapabilitiesVocabulary } = require('../schemas/CapabilitiesVocabulary');

/**
 * Mapeo de categorías del registry a categorías del nuevo sistema
 */
const CATEGORY_MAP = {
    'HR': 'hr',
    'ATTENDANCE': 'attendance',
    'PAYROLL': 'payroll',
    'CORE': 'core',
    'COMMERCIAL': 'commercial',
    'DOCUMENTS': 'documents',
    'COMMUNICATION': 'communication',
    'ANALYTICS': 'analytics',
    'INFRASTRUCTURE': 'infrastructure',
    'INTEGRATION': 'integration'
};

/**
 * Mapeo de endpoints a capacidades
 */
const ENDPOINT_TO_CAPABILITY = {
    // CRUD patterns
    'GET /': 'data:read',
    'POST /': 'data:write',
    'PUT /': 'data:write',
    'PATCH /': 'data:write',
    'DELETE /': 'data:delete',

    // Auth patterns
    '/login': 'auth:login',
    '/logout': 'auth:logout',
    '/token': 'auth:validate-token',
    '/verify': 'auth:validate-token',

    // Export/Import patterns
    '/export': 'data:export',
    '/import': 'data:import',
    '/download': 'file:download',
    '/upload': 'file:upload',

    // Report patterns
    '/report': 'report:generate',
    '/dashboard': 'report:dashboard',
    '/stats': 'report:analytics',
    '/metrics': 'report:kpi',

    // Workflow patterns
    '/approve': 'workflow:approve',
    '/reject': 'workflow:reject',
    '/submit': 'workflow:start',

    // Notification patterns
    '/notify': 'notification:send',
    '/email': 'notification:email',
    '/sms': 'notification:sms'
};

/**
 * Mapeo de tablas a capacidades de datos
 */
const TABLE_TO_CAPABILITY = {
    'users': 'data:users',
    'employees': 'data:employees',
    'attendances': 'data:attendance',
    'departments': 'data:departments',
    'shifts': 'data:shifts',
    'vacations': 'data:vacations',
    'vacation_requests': 'data:vacations',
    'payroll': 'data:payroll',
    'liquidaciones': 'data:payroll',
    'siac_clientes': 'data:clients',
    'siac_facturas': 'data:invoices',
    'siac_productos': 'data:products'
};

/**
 * Eventos típicos por tipo de módulo
 */
const MODULE_EVENTS = {
    'users': {
        emits: ['entity:created', 'entity:updated', 'entity:deleted'],
        listens: ['user:logged-in']
    },
    'attendance': {
        emits: ['attendance:clock-in', 'attendance:clock-out', 'attendance:late-arrival'],
        listens: ['user:logged-in']
    },
    'vacation': {
        emits: ['workflow:started', 'workflow:completed'],
        listens: ['workflow:approval-pending']
    },
    'payroll': {
        emits: ['entity:created'],
        listens: []
    },
    'notifications': {
        emits: ['notification:sent'],
        listens: ['entity:created', 'workflow:completed', 'attendance:late-arrival']
    },
    'invoicing': {
        emits: ['invoice:created', 'invoice:paid'],
        listens: ['order:created', 'quote:approved']
    }
};

/**
 * Clase ModuleMigrator
 */
class ModuleMigrator {
    constructor() {
        this.registryPath = path.join(__dirname, '..', '..', 'auditor', 'registry', 'modules-registry.json');
        this.registry = null;
        this.migratedNodes = [];
        this.migrationLog = [];
    }

    /**
     * Cargar el registry existente
     */
    async loadRegistry() {
        try {
            const data = await fs.readFile(this.registryPath, 'utf8');
            this.registry = JSON.parse(data);
            console.log(`📚 [MIGRATOR] Registry cargado: ${Object.keys(this.registry.modules).length} módulos`);
            return true;
        } catch (error) {
            console.error('❌ [MIGRATOR] Error cargando registry:', error.message);
            return false;
        }
    }

    /**
     * Migrar todos los módulos
     */
    async migrateAll() {
        if (!this.registry) {
            await this.loadRegistry();
        }

        console.log('\n🔄 [MIGRATOR] Iniciando migración de módulos...\n');

        for (const [key, moduleData] of Object.entries(this.registry.modules)) {
            try {
                const node = this.migrateModule(key, moduleData);
                this.migratedNodes.push(node);
                this.log(key, 'success', `Migrado correctamente`);
            } catch (error) {
                this.log(key, 'error', error.message);
            }
        }

        console.log(`\n✅ [MIGRATOR] Migración completada: ${this.migratedNodes.length} nodos creados`);
        return this.migratedNodes;
    }

    /**
     * Migrar un módulo específico
     * @param {string} key - Clave del módulo
     * @param {Object} moduleData - Datos del módulo del registry
     */
    migrateModule(key, moduleData) {
        // Usar moduleData.id como key si está disponible (el registry usa índices numéricos)
        const nodeKey = moduleData.id || moduleData.key || key;
        console.log(`   🔄 Migrando: ${nodeKey}`);

        // Crear nodo base
        const node = new UniversalNode({
            key: nodeKey,
            name: moduleData.name || nodeKey,
            type: NodeType.MODULE,
            version: moduleData.version || '1.0.0',
            status: moduleData.is_active !== false ? NodeStatus.ACTIVE : NodeStatus.INACTIVE,
            category: CATEGORY_MAP[moduleData.category] || moduleData.category?.toLowerCase() || 'general',
            domain: 'software',
            description: moduleData.description || '',
            icon: moduleData.icon || 'fa-cube',
            color: moduleData.color || '#6b7280',
            tags: moduleData.tags || []
        });

        // Agregar PROVIDES explícitos si están declarados
        if (moduleData.provides_capabilities) {
            for (const cap of moduleData.provides_capabilities) {
                node.addProvides(cap, { explicit: true, source: 'registry' });
            }
        }

        // Inferir PROVIDES desde endpoints y tablas
        this._inferProvides(node, moduleData);

        // Inferir CONSUMES desde dependencies
        this._inferConsumes(node, moduleData);

        // Inferir EMITS y LISTENS
        this._inferEvents(node, moduleData);

        // Copiar ubicación de archivos
        if (moduleData.location) {
            node.location = {
                file: moduleData.location.main_file || null,
                routes: moduleData.location.routes || [],
                services: moduleData.location.services || [],
                frontend: moduleData.location.frontend || [],
                migrations: moduleData.location.migrations || []
            };
        }

        // Copiar info comercial
        if (moduleData.commercial) {
            node.commercial = {
                is_sellable: moduleData.commercial.is_core !== true,
                base_price: moduleData.commercial.base_price || 0,
                is_core: moduleData.commercial.is_core || false,
                bundles: moduleData.commercial.bundles || []
            };
        }

        // Copiar ayuda
        if (moduleData.help) {
            node.help = {
                quickStart: moduleData.help.quickStart || [],
                tips: moduleData.help.tips || [],
                warnings: moduleData.help.warnings || [],
                faqs: moduleData.help.faqs || []
            };
        }

        // Copiar dependencias explícitas (además de las inferidas)
        if (moduleData.dependencies) {
            node.dependencies = {
                required: moduleData.dependencies.required || [],
                optional: moduleData.dependencies.optional || [],
                conflicts: moduleData.dependencies.conflicts || []
            };
        }

        return node;
    }

    /**
     * Inferir capacidades PROVIDES desde endpoints y tablas
     */
    _inferProvides(node, moduleData) {
        const providedCapabilities = new Set();

        // Desde API endpoints
        if (moduleData.api_endpoints) {
            for (const endpoint of moduleData.api_endpoints) {
                const capability = this._endpointToCapability(endpoint);
                if (capability) {
                    providedCapabilities.add(capability);
                }
            }
        }

        // Desde tablas de base de datos
        if (moduleData.database_tables) {
            for (const table of moduleData.database_tables) {
                const tableName = typeof table === 'string' ? table : table.name;
                if (TABLE_TO_CAPABILITY[tableName]) {
                    providedCapabilities.add(TABLE_TO_CAPABILITY[tableName]);
                }
            }
        }

        // Capacidad genérica basada en key del módulo
        const moduleCapability = `data:${node.key.replace(/-/g, '_')}`;
        providedCapabilities.add(moduleCapability);

        // Agregar al nodo
        for (const cap of providedCapabilities) {
            node.addProvides(cap, { inferred: true, source: 'migration' });
        }
    }

    /**
     * Inferir capacidades CONSUMES desde dependencies
     */
    _inferConsumes(node, moduleData) {
        const consumedCapabilities = new Set();

        // Todos los módulos consumen auth por defecto
        consumedCapabilities.add('auth:validate-token');

        // Desde dependencies.required
        if (moduleData.dependencies?.required) {
            for (const dep of moduleData.dependencies.required) {
                // Convertir nombre de módulo a capacidad
                const capability = `data:${dep.replace(/-/g, '_')}`;
                consumedCapabilities.add(capability);
            }
        }

        // Desde dependencies.integrates_with
        if (moduleData.dependencies?.integrates_with) {
            for (const dep of moduleData.dependencies.integrates_with) {
                const capability = `data:${dep.replace(/-/g, '_')}`;
                node.addConsumes(capability, { required: false });
            }
        }

        // Agregar al nodo (required)
        for (const cap of consumedCapabilities) {
            node.addConsumes(cap, { required: true });
        }
    }

    /**
     * Inferir eventos EMITS y LISTENS
     */
    _inferEvents(node, moduleData) {
        // Buscar eventos predefinidos por tipo de módulo
        const keyLower = node.key.toLowerCase();

        for (const [moduleType, events] of Object.entries(MODULE_EVENTS)) {
            if (keyLower.includes(moduleType)) {
                for (const event of events.emits) {
                    node.addEmits(event, { inferred: true });
                }
                for (const event of events.listens) {
                    node.addListens(event);
                }
                break;
            }
        }

        // Inferir desde business_flows
        if (moduleData.business_flows && Array.isArray(moduleData.business_flows)) {
            for (const flow of moduleData.business_flows) {
                // Flows con approval implican workflow events
                if (flow.name?.toLowerCase().includes('approval') ||
                    flow.name?.toLowerCase().includes('aprobación')) {
                    node.addEmits('workflow:started');
                    node.addListens('workflow:approval-pending');
                }
                // Flows con notification implican notification events
                if (flow.name?.toLowerCase().includes('notif')) {
                    node.addEmits('notification:sent');
                }
            }
        }

        // CRUD events genéricos si tiene write capability
        if (node.provides.some(p => p.capability.includes('write'))) {
            node.addEmits('entity:created');
            node.addEmits('entity:updated');
        }
    }

    /**
     * Convertir endpoint a capability
     */
    _endpointToCapability(endpoint) {
        const endpointStr = typeof endpoint === 'string' ? endpoint : `${endpoint.method} ${endpoint.path}`;

        // Buscar coincidencias en el mapeo
        for (const [pattern, capability] of Object.entries(ENDPOINT_TO_CAPABILITY)) {
            if (endpointStr.includes(pattern)) {
                return capability;
            }
        }

        // Inferir desde método HTTP
        if (endpointStr.startsWith('GET')) return 'data:read';
        if (endpointStr.startsWith('POST')) return 'data:write';
        if (endpointStr.startsWith('PUT')) return 'data:write';
        if (endpointStr.startsWith('PATCH')) return 'data:write';
        if (endpointStr.startsWith('DELETE')) return 'data:delete';

        return null;
    }

    /**
     * Registrar en el log de migración
     */
    log(module, status, message) {
        this.migrationLog.push({
            module,
            status,
            message,
            timestamp: new Date().toISOString()
        });

        const icon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
        console.log(`      ${icon} ${module}: ${message}`);
    }

    /**
     * Obtener resumen de migración
     */
    getSummary() {
        const success = this.migrationLog.filter(l => l.status === 'success').length;
        const warnings = this.migrationLog.filter(l => l.status === 'warning').length;
        const errors = this.migrationLog.filter(l => l.status === 'error').length;

        return {
            total: this.migrationLog.length,
            success,
            warnings,
            errors,
            nodes: this.migratedNodes.length,
            log: this.migrationLog
        };
    }

    /**
     * Exportar nodos migrados a JSON
     */
    exportNodes() {
        return this.migratedNodes.map(n => n.toJSON());
    }

    /**
     * Guardar nodos migrados a archivo
     */
    async saveNodes(outputPath) {
        const data = {
            migratedAt: new Date().toISOString(),
            sourceRegistry: this.registryPath,
            totalNodes: this.migratedNodes.length,
            nodes: this.exportNodes()
        };

        await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
        console.log(`💾 [MIGRATOR] Nodos guardados en: ${outputPath}`);
    }

    /**
     * Cargar nodos desde archivo
     */
    static async loadNodes(inputPath) {
        const data = JSON.parse(await fs.readFile(inputPath, 'utf8'));
        return data.nodes.map(n => UniversalNode.fromJSON(n));
    }
}

module.exports = { ModuleMigrator };
