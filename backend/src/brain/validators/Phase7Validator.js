/**
 * ============================================================================
 * PHASE 7 VALIDATOR - Visualization 3D
 * ============================================================================
 *
 * Validaciones para la Fase 7: VisualizationAdapter.
 *
 * Created: 2025-12-17
 */

const path = require('path');

class Phase7Validator {
    constructor() {
        this.results = [];
        this.integrationsPath = path.join(__dirname, '..', 'integrations');
        this.corePath = path.join(__dirname, '..', 'core');
    }

    /**
     * Ejecutar todas las validaciones de Fase 7
     */
    async runAll() {
        console.log('\n🔍 [PHASE-7] Ejecutando validaciones...\n');

        await this.validateVisualizationAdapterExists();
        await this.validateForceGraph();
        await this.validateDependencyTree();
        await this.validateClusterView();
        await this.validateHeatMap();
        await this.validateImpactTimeline();
        await this.validateFullExport();

        return this.getSummary();
    }

    /**
     * Agregar resultado de validación
     */
    addResult(name, passed, error = null) {
        this.results.push({
            name,
            passed,
            error,
            timestamp: new Date().toISOString()
        });

        const icon = passed ? '✅' : '❌';
        console.log(`${icon} ${name}${error ? `: ${error}` : ''}`);
    }

    /**
     * Inicializar Brain para tests
     */
    async _initializeBrain() {
        const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
        const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

        const brain = resetBrain();
        const migrator = new ModuleMigrator();
        const nodes = await migrator.migrateAll();
        for (const node of nodes) {
            brain.register(node);
        }
        brain.buildRelationGraph();

        return brain;
    }

    /**
     * V1: Verificar que VisualizationAdapter existe
     */
    async validateVisualizationAdapterExists() {
        try {
            const { VisualizationAdapter } = require(path.join(this.integrationsPath, 'VisualizationAdapter.js'));

            if (typeof VisualizationAdapter !== 'function') {
                throw new Error('VisualizationAdapter no es una clase');
            }

            this.addResult('VisualizationAdapter existe', true);
        } catch (error) {
            this.addResult('VisualizationAdapter existe', false, error.message);
        }
    }

    /**
     * V2: Verificar exportación Force Graph
     */
    async validateForceGraph() {
        try {
            const { VisualizationAdapter } = require(path.join(this.integrationsPath, 'VisualizationAdapter.js'));
            const brain = await this._initializeBrain();

            const adapter = new VisualizationAdapter(brain);
            const graph = adapter.exportForceGraph();

            if (!graph.nodes || !Array.isArray(graph.nodes)) {
                throw new Error('No hay nodos en el grafo');
            }

            if (!graph.links || !Array.isArray(graph.links)) {
                throw new Error('No hay enlaces en el grafo');
            }

            if (graph.nodes.length < 10) {
                throw new Error(`Solo ${graph.nodes.length} nodos (esperados >10)`);
            }

            // Verificar estructura de nodo
            const node = graph.nodes[0];
            if (!node.id || !node.name || !node.color || typeof node.size !== 'number') {
                throw new Error('Estructura de nodo incorrecta');
            }

            this.addResult(`Force Graph: ${graph.nodes.length} nodos, ${graph.links.length} enlaces`, true);
        } catch (error) {
            this.addResult('Force Graph', false, error.message);
        }
    }

    /**
     * V3: Verificar árbol de dependencias
     */
    async validateDependencyTree() {
        try {
            const { VisualizationAdapter } = require(path.join(this.integrationsPath, 'VisualizationAdapter.js'));
            const brain = await this._initializeBrain();

            const adapter = new VisualizationAdapter(brain);
            const tree = adapter.exportDependencyTree();

            if (!tree.name || !tree.children) {
                throw new Error('Árbol incompleto');
            }

            if (tree.children.length === 0) {
                throw new Error('Árbol sin hijos');
            }

            // Verificar estructura de nodo hijo
            const child = tree.children[0];
            if (!child.id || !child.name) {
                throw new Error('Estructura de hijo incorrecta');
            }

            this.addResult(`Dependency Tree: ${tree.children.length} ramas raíz`, true);
        } catch (error) {
            this.addResult('Dependency Tree', false, error.message);
        }
    }

    /**
     * V4: Verificar vista de clusters
     */
    async validateClusterView() {
        try {
            const { VisualizationAdapter } = require(path.join(this.integrationsPath, 'VisualizationAdapter.js'));
            const brain = await this._initializeBrain();

            const adapter = new VisualizationAdapter(brain);
            const clusters = adapter.exportClusterView();

            if (!clusters.clusters || clusters.clusters.length === 0) {
                throw new Error('No hay clusters');
            }

            // Verificar estructura de cluster
            const cluster = clusters.clusters[0];
            if (!cluster.name || !cluster.color || !Array.isArray(cluster.nodes)) {
                throw new Error('Estructura de cluster incorrecta');
            }

            if (typeof cluster.cohesion !== 'number') {
                throw new Error('Falta métrica de cohesión');
            }

            this.addResult(`Cluster View: ${clusters.clusters.length} clusters`, true);
        } catch (error) {
            this.addResult('Cluster View', false, error.message);
        }
    }

    /**
     * V5: Verificar heat map
     */
    async validateHeatMap() {
        try {
            const { VisualizationAdapter } = require(path.join(this.integrationsPath, 'VisualizationAdapter.js'));
            const brain = await this._initializeBrain();

            const adapter = new VisualizationAdapter(brain);
            const heatMap = adapter.exportHeatMap();

            if (!heatMap.data || heatMap.data.length === 0) {
                throw new Error('Heat map sin datos');
            }

            // Verificar estructura
            const item = heatMap.data[0];
            if (typeof item.heat !== 'number' || !item.id || !item.name) {
                throw new Error('Estructura de heat map incorrecta');
            }

            if (typeof heatMap.maxHeat !== 'number') {
                throw new Error('Falta maxHeat');
            }

            if (!heatMap.criticalModules) {
                throw new Error('Faltan módulos críticos');
            }

            this.addResult(`Heat Map: ${heatMap.data.length} items, max heat ${heatMap.maxHeat}`, true);
        } catch (error) {
            this.addResult('Heat Map', false, error.message);
        }
    }

    /**
     * V6: Verificar timeline de impacto
     */
    async validateImpactTimeline() {
        try {
            const { VisualizationAdapter } = require(path.join(this.integrationsPath, 'VisualizationAdapter.js'));
            const brain = await this._initializeBrain();

            const adapter = new VisualizationAdapter(brain);
            const timeline = adapter.exportImpactTimeline('attendance');

            if (timeline.error) {
                throw new Error(timeline.error);
            }

            if (!timeline.source || !timeline.timeline) {
                throw new Error('Timeline incompleto');
            }

            if (timeline.timeline.length === 0) {
                throw new Error('Timeline sin eventos');
            }

            // Verificar estructura de evento
            const event = timeline.timeline[0];
            if (typeof event.t !== 'number' || !event.event || !event.module) {
                throw new Error('Estructura de evento incorrecta');
            }

            this.addResult(`Impact Timeline: ${timeline.timeline.length} eventos para attendance`, true);
        } catch (error) {
            this.addResult('Impact Timeline', false, error.message);
        }
    }

    /**
     * V7: Verificar export completo para Engineering Dashboard
     */
    async validateFullExport() {
        try {
            const { VisualizationAdapter } = require(path.join(this.integrationsPath, 'VisualizationAdapter.js'));
            const brain = await this._initializeBrain();

            const adapter = new VisualizationAdapter(brain);
            const fullExport = adapter.exportForEngineeringDashboard();

            // Verificar todas las partes
            const required = ['forceGraph', 'dependencyTree', 'clusterView', 'heatMap', 'miniMap', 'metadata'];
            const missing = required.filter(key => !fullExport[key]);

            if (missing.length > 0) {
                throw new Error(`Faltan secciones: ${missing.join(', ')}`);
            }

            if (fullExport.metadata.version !== '2.0') {
                throw new Error('Versión incorrecta');
            }

            if (fullExport.metadata.source !== 'IntrospectiveBrain') {
                throw new Error('Source incorrecto');
            }

            this.addResult('Export completo para Engineering Dashboard', true);
        } catch (error) {
            this.addResult('Export completo', false, error.message);
        }
    }

    /**
     * Obtener resumen de validaciones
     */
    getSummary() {
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;
        const total = this.results.length;
        const allPassed = failed === 0;

        console.log('\n' + '='.repeat(50));
        console.log(`FASE 7 - RESULTADO: ${allPassed ? '✅ PASÓ' : '❌ FALLÓ'}`);
        console.log(`Validaciones: ${passed}/${total} pasaron`);
        console.log('='.repeat(50) + '\n');

        return {
            phase: 7,
            phaseName: 'visualization-3d',
            allPassed,
            passed,
            failed,
            total,
            results: this.results
        };
    }
}

module.exports = { Phase7Validator };
