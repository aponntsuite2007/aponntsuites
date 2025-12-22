/**
 * ============================================================================
 * VISUALIZATION ADAPTER
 * ============================================================================
 *
 * Adaptador para conectar el Brain Introspectivo con la visualización 3D
 * existente en el Engineering Dashboard.
 *
 * Genera datos en formato optimizado para:
 * 1. Grafos de nodos (Force-directed graph)
 * 2. Dependency trees
 * 3. Cluster visualization
 * 4. Heat maps de actividad
 *
 * Created: 2025-12-17
 * Phase: 7 - Visualization 3D
 */

class VisualizationAdapter {
    constructor(brain) {
        this.brain = brain;
        this.colorScheme = {
            core: '#f59e0b',      // Amber for core modules
            rrhh: '#8b5cf6',      // Purple for HR
            finance: '#22c55e',   // Green for finance
            operations: '#3b82f6', // Blue for operations
            security: '#ef4444',   // Red for security
            support: '#06b6d4',    // Cyan for support
            ai: '#ec4899',         // Pink for AI
            default: '#64748b'     // Slate for default
        };
    }

    /**
     * Exportar datos para Force-Directed Graph (3D)
     */
    exportForceGraph() {
        const nodes = this.brain.getAllNodes() || [];
        const graphData = this.brain.exportGraph() || { edges: [], nodes: [] };
        const edges = graphData.edges || [];

        const visNodes = nodes.map(node => ({
            id: node.key,
            name: node.name,
            type: node.type,
            category: this._getCategory(node),
            color: this._getNodeColor(node),
            size: this._calculateNodeSize(node),
            description: node.description || '',
            provides: node.provides?.length || 0,
            consumes: node.consumes?.length || 0,
            emits: node.emits?.length || 0,
            listens: node.listens?.length || 0,
            // Metadata for tooltips
            metadata: {
                version: node.version,
                is_core: node.commercial?.is_core || false,
                endpoints: node.api?.endpoints?.length || 0,
                tables: node.database?.tables?.length || 0
            }
        }));

        const visLinks = edges.map(edge => ({
            source: edge.source,
            target: edge.target,
            type: edge.type,
            label: edge.label || edge.type,
            strength: this._calculateLinkStrength(edge),
            color: this._getLinkColor(edge.type),
            dashed: edge.type === 'event'
        }));

        return {
            nodes: visNodes,
            links: visLinks,
            metadata: {
                totalNodes: visNodes.length,
                totalLinks: visLinks.length,
                categories: [...new Set(visNodes.map(n => n.category))],
                generatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Exportar datos para árbol de dependencias
     */
    exportDependencyTree(rootKey = null) {
        const nodes = this.brain.getAllNodes() || [];

        // Si no hay root, usar módulos sin dependencias requeridas
        let roots;
        if (rootKey) {
            const rootNode = this.brain.getNode(rootKey);
            roots = rootNode ? [rootNode] : [];
        } else {
            // Buscar módulos que no dependen de otros (son raíces)
            roots = nodes.filter(n => {
                const consumes = n.consumes || [];
                return consumes.filter(c => c.required).length === 0;
            });

            // Si no hay raíces, usar los primeros 5 módulos core como raíces
            if (roots.length === 0) {
                roots = nodes.slice(0, 5);
            }
        }

        const buildTree = (node, visited = new Set(), depth = 0) => {
            if (!node || visited.has(node.key) || depth > 3) {
                return null;
            }
            visited.add(node.key);

            // Buscar quién depende de este nodo
            let dependents = [];
            try {
                dependents = this.brain.whatDependsFrom(node.key) || [];
            } catch (e) {
                dependents = [];
            }

            const children = dependents
                .slice(0, 10) // Limitar hijos
                .map(dep => {
                    const depNode = dep.node ? this.brain.getNode(dep.node) : null;
                    return buildTree(depNode, new Set(visited), depth + 1);
                })
                .filter(Boolean);

            return {
                id: node.key,
                name: node.name,
                color: this._getNodeColor(node),
                size: this._calculateNodeSize(node),
                children: children.length > 0 ? children : undefined,
                _collapsed: children.length > 5
            };
        };

        const trees = roots
            .slice(0, 20) // Limitar raíces
            .filter(Boolean)
            .map(root => buildTree(root, new Set(), 0))
            .filter(Boolean);

        return {
            name: 'System',
            children: trees.length > 0 ? trees : [{ id: 'empty', name: 'No data', color: '#ccc', size: 10 }],
            metadata: {
                rootCount: trees.length,
                generatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Exportar datos para visualización de clusters
     */
    exportClusterView() {
        const nodes = this.brain.getAllNodes() || [];
        const categories = {};

        // Agrupar por categoría
        for (const node of nodes) {
            const category = this._getCategory(node);
            if (!categories[category]) {
                categories[category] = {
                    name: category,
                    color: this.colorScheme[category] || this.colorScheme.default,
                    nodes: [],
                    internalLinks: 0,
                    externalLinks: 0
                };
            }
            categories[category].nodes.push({
                id: node.key,
                name: node.name,
                size: this._calculateNodeSize(node)
            });
        }

        // Calcular enlaces internos/externos
        const graphData = this.brain.exportGraph() || { edges: [] };
        const edges = graphData.edges || [];

        for (const edge of edges) {
            const fromNode = this.brain.getNode(edge.source);
            const toNode = this.brain.getNode(edge.target);
            const fromCategory = this._getCategory(fromNode);
            const toCategory = this._getCategory(toNode);

            if (fromCategory === toCategory) {
                if (categories[fromCategory]) {
                    categories[fromCategory].internalLinks++;
                }
            } else {
                if (categories[fromCategory]) categories[fromCategory].externalLinks++;
                if (categories[toCategory]) categories[toCategory].externalLinks++;
            }
        }

        // Calcular enlaces entre clusters
        const clusterLinks = [];
        const seenPairs = new Set();

        for (const edge of edges) {
            const fromNode = this.brain.getNode(edge.source);
            const toNode = this.brain.getNode(edge.target);
            const fromCategory = this._getCategory(fromNode);
            const toCategory = this._getCategory(toNode);

            if (fromCategory !== toCategory) {
                const pairKey = [fromCategory, toCategory].sort().join('->');
                if (!seenPairs.has(pairKey)) {
                    seenPairs.add(pairKey);
                    clusterLinks.push({
                        source: fromCategory,
                        target: toCategory,
                        strength: 1
                    });
                } else {
                    const link = clusterLinks.find(l =>
                        (l.source === fromCategory && l.target === toCategory) ||
                        (l.source === toCategory && l.target === fromCategory)
                    );
                    if (link) link.strength++;
                }
            }
        }

        return {
            clusters: Object.values(categories).map(c => ({
                ...c,
                nodeCount: c.nodes.length,
                cohesion: c.nodes.length > 0
                    ? (c.internalLinks / (c.internalLinks + c.externalLinks)) || 0
                    : 0
            })),
            links: clusterLinks,
            metadata: {
                totalClusters: Object.keys(categories).length,
                generatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Exportar heat map de actividad/importancia
     */
    exportHeatMap() {
        const nodes = this.brain.getAllNodes() || [];

        const heatData = nodes.map(node => {
            let dependents = [];
            let dependencies = [];
            try {
                dependents = this.brain.whatDependsFrom(node.key) || [];
                dependencies = this.brain.whatDependsOn(node.key) || [];
            } catch (e) {
                // Ignore errors
            }

            // Calcular "calor" basado en múltiples factores
            let heat = 0;
            heat += dependents.length * 10;  // Muy importante si muchos dependen de él
            heat += dependencies.length * 5;  // Moderado si depende de muchos
            heat += node.provides.length * 3;
            heat += node.consumes.length * 2;
            heat += node.emits.length * 2;
            heat += node.listens.length * 2;

            if (node.commercial?.is_core) heat += 30;

            return {
                id: node.key,
                name: node.name,
                category: this._getCategory(node),
                heat: Math.min(heat, 100), // Cap at 100
                dependents: dependents.length,
                dependencies: dependencies.length,
                x: this._hashToPosition(node.key, 'x'),
                y: this._hashToPosition(node.key, 'y')
            };
        });

        // Ordenar por heat
        heatData.sort((a, b) => b.heat - a.heat);

        return {
            data: heatData,
            maxHeat: Math.max(...heatData.map(d => d.heat)),
            criticalModules: heatData.filter(d => d.heat > 50),
            metadata: {
                totalModules: heatData.length,
                averageHeat: heatData.reduce((s, d) => s + d.heat, 0) / heatData.length,
                generatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Exportar timeline de impacto (what-if)
     */
    exportImpactTimeline(moduleKey) {
        const impact = this.brain.whatIfFails(moduleKey) || {};
        const node = this.brain.getNode(moduleKey);

        if (!node) {
            return { error: `Module ${moduleKey} not found` };
        }

        const timeline = [];

        // T0: Module fails
        timeline.push({
            t: 0,
            event: 'failure',
            module: moduleKey,
            description: `${node.name} fails`,
            severity: 'critical'
        });

        // T1: Direct dependencies affected
        let t = 1;
        const directlyAffected = impact.directlyAffected || [];
        for (const affected of directlyAffected) {
            const consumesFrom = affected.consumesFrom || [];
            timeline.push({
                t,
                event: 'cascade',
                module: affected.key,
                description: `${affected.name} loses ${consumesFrom.length > 0 ? consumesFrom.join(', ') : 'dependency'}`,
                severity: 'high'
            });
        }

        // T2: Event listeners affected
        t = 2;
        const eventListenersAffected = impact.eventListenersAffected || [];
        for (const listener of eventListenersAffected) {
            const events = listener.events || [];
            timeline.push({
                t,
                event: 'notification_lost',
                module: listener.key,
                description: `${listener.name} stops receiving ${events.length > 0 ? events.join(', ') : 'events'}`,
                severity: 'medium'
            });
        }

        // T3: Indirect impact
        t = 3;
        const indirectlyAffected = impact.indirectlyAffected || [];
        for (const indirect of indirectlyAffected) {
            timeline.push({
                t,
                event: 'indirect',
                module: indirect.key,
                description: `${indirect.name} affected through dependency chain`,
                severity: 'low'
            });
        }

        return {
            source: moduleKey,
            sourceName: node.name,
            timeline,
            totalAffected: impact.totalAffected || 0,
            risk: impact.recommendations?.[0] || 'Monitor closely',
            metadata: {
                generatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Exportar datos para mini-mapa de navegación
     */
    exportMiniMap() {
        const nodes = this.brain.getAllNodes() || [];

        return nodes.map(node => ({
            id: node.key,
            name: node.name,
            x: this._hashToPosition(node.key, 'x') * 100,
            y: this._hashToPosition(node.key, 'y') * 100,
            color: this._getNodeColor(node),
            size: Math.max(3, this._calculateNodeSize(node) / 5)
        }));
    }

    // ==================== HELPERS ====================

    /**
     * Obtener categoría de un nodo
     */
    _getCategory(node) {
        if (!node) return 'default';

        const key = node.key.toLowerCase();

        if (node.commercial?.is_core) return 'core';
        if (key.includes('ai') || key.includes('assistant') || key.includes('emotional')) return 'ai';
        if (key.includes('security') || key.includes('auth') || key.includes('consent')) return 'security';
        if (key.includes('payroll') || key.includes('budget') || key.includes('invoice') || key.includes('factur')) return 'finance';
        if (key.includes('user') || key.includes('vacation') || key.includes('medical') || key.includes('employee')) return 'rrhh';
        if (key.includes('support') || key.includes('help') || key.includes('ticket')) return 'support';
        if (key.includes('attendance') || key.includes('kiosk') || key.includes('visitor')) return 'operations';

        return 'default';
    }

    /**
     * Obtener color para un nodo
     */
    _getNodeColor(node) {
        const category = this._getCategory(node);
        return this.colorScheme[category] || this.colorScheme.default;
    }

    /**
     * Calcular tamaño de nodo
     */
    _calculateNodeSize(node) {
        if (!node) return 10;

        let size = 10;
        size += node.provides.length * 2;
        size += node.consumes.length * 1.5;
        size += node.emits.length;
        size += node.listens.length;

        if (node.commercial?.is_core) size += 15;

        return Math.min(size, 50);
    }

    /**
     * Calcular fuerza de enlace
     */
    _calculateLinkStrength(rel) {
        switch (rel.type) {
            case 'provides_to': return 3;
            case 'consumes_from': return 2;
            case 'event': return 1;
            default: return 1;
        }
    }

    /**
     * Obtener color para enlace
     */
    _getLinkColor(type) {
        switch (type) {
            case 'provides_to': return '#22c55e';   // Green
            case 'consumes_from': return '#f59e0b'; // Amber
            case 'event': return '#8b5cf6';         // Purple
            default: return '#64748b';              // Slate
        }
    }

    /**
     * Hash string a posición (para layout consistente)
     */
    _hashToPosition(str, axis) {
        let hash = 0;
        const offset = axis === 'x' ? 0 : 13;

        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i) + offset;
            hash = hash & hash;
        }

        return (Math.abs(hash) % 1000) / 1000;
    }

    /**
     * Export completo para el Engineering Dashboard
     */
    exportForEngineeringDashboard() {
        return {
            forceGraph: this.exportForceGraph(),
            dependencyTree: this.exportDependencyTree(),
            clusterView: this.exportClusterView(),
            heatMap: this.exportHeatMap(),
            miniMap: this.exportMiniMap(),
            metadata: {
                version: '2.0',
                source: 'IntrospectiveBrain',
                generatedAt: new Date().toISOString()
            }
        };
    }
}

module.exports = { VisualizationAdapter };
