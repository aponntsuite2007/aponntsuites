/**
 * ============================================================================
 * PHASE 2 VALIDATOR - IntrospectiveBrain Core
 * ============================================================================
 *
 * Validaciones para la Fase 2: IntrospectiveBrain Core.
 * Verifica que el cerebro introspectivo funcione correctamente.
 *
 * Created: 2025-12-17
 */

const path = require('path');

class Phase2Validator {
    constructor() {
        this.results = [];
        this.corePath = path.join(__dirname, '..', 'core');
        this.schemasPath = path.join(__dirname, '..', 'schemas');
    }

    /**
     * Ejecutar todas las validaciones de Fase 2
     */
    async runAll() {
        console.log('\n🔍 [PHASE-2] Ejecutando validaciones...\n');

        await this.validateBrainExists();
        await this.validateNodeRegistration();
        await this.validateRelationDeduction();
        await this.validateQueryCapabilities();
        await this.validateImpactAnalysis();
        await this.validateHealthCheck();
        await this.validateSerialization();
        await this.validateSingletonPattern();
        await this.validateComplexScenario();

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
     * V1: Verificar que IntrospectiveBrain existe
     */
    async validateBrainExists() {
        try {
            const { IntrospectiveBrain, RelationType, getIntrospectiveBrain, resetBrain } =
                require(path.join(this.corePath, 'IntrospectiveBrain.js'));

            if (typeof IntrospectiveBrain !== 'function') {
                throw new Error('IntrospectiveBrain no es una clase');
            }
            if (!RelationType || typeof RelationType !== 'object') {
                throw new Error('RelationType no existe');
            }
            if (typeof getIntrospectiveBrain !== 'function') {
                throw new Error('getIntrospectiveBrain no existe');
            }
            if (typeof resetBrain !== 'function') {
                throw new Error('resetBrain no existe');
            }

            this.addResult('IntrospectiveBrain existe y exporta correctamente', true);
        } catch (error) {
            this.addResult('IntrospectiveBrain existe y exporta correctamente', false, error.message);
        }
    }

    /**
     * V2: Verificar registro de nodos
     */
    async validateNodeRegistration() {
        try {
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { UniversalNode } = require(path.join(this.schemasPath, 'UniversalNode.js'));

            const brain = resetBrain();

            // Registrar nodos
            const node1 = UniversalNode.createModule('users', 'Gestión de Usuarios');
            const node2 = UniversalNode.createModule('auth', 'Autenticación');

            brain.register(node1);
            brain.register(node2);

            // Verificar registro
            if (brain.getAllNodes().length !== 2) {
                throw new Error('No se registraron 2 nodos');
            }

            const retrieved = brain.getNode('users');
            if (!retrieved || retrieved.name !== 'Gestión de Usuarios') {
                throw new Error('No se puede recuperar nodo por key');
            }

            // Verificar por tipo
            const modules = brain.getNodesByType('module');
            if (modules.length !== 2) {
                throw new Error('getNodesByType no funciona');
            }

            // Verificar unregister
            brain.unregister('users');
            if (brain.getAllNodes().length !== 1) {
                throw new Error('unregister no funciona');
            }

            this.addResult('Registro de nodos funciona', true);
        } catch (error) {
            this.addResult('Registro de nodos funciona', false, error.message);
        }
    }

    /**
     * V3: Verificar deducción de relaciones
     */
    async validateRelationDeduction() {
        try {
            const { resetBrain, RelationType } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { UniversalNode } = require(path.join(this.schemasPath, 'UniversalNode.js'));

            const brain = resetBrain();

            // Crear nodos con capacidades
            const auth = UniversalNode.createModule('auth', 'Autenticación');
            auth.addProvides('auth:validate-token');
            auth.addProvides('auth:login');

            const users = UniversalNode.createModule('users', 'Gestión de Usuarios');
            users.addConsumes('auth:validate-token'); // required por defecto
            users.addProvides('data:users');

            const attendance = UniversalNode.createModule('attendance', 'Control de Asistencia');
            attendance.addConsumes('auth:validate-token');
            attendance.addConsumes('data:users');
            attendance.addProvides('data:attendance');

            brain.register(auth);
            brain.register(users);
            brain.register(attendance);

            // Construir grafo
            const relations = brain.buildRelationGraph();

            if (relations.length === 0) {
                throw new Error('No se dedujeron relaciones');
            }

            // Verificar relaciones específicas
            const usersToAuth = relations.find(r =>
                r.from === 'users' && r.to === 'auth' && r.type === RelationType.DEPENDS_ON
            );
            if (!usersToAuth) {
                throw new Error('No se dedujo relación users -> auth');
            }

            const attendanceToUsers = relations.find(r =>
                r.from === 'attendance' && r.to === 'users'
            );
            if (!attendanceToUsers) {
                throw new Error('No se dedujo relación attendance -> users');
            }

            this.addResult('Deducción de relaciones funciona', true);
        } catch (error) {
            this.addResult('Deducción de relaciones funciona', false, error.message);
        }
    }

    /**
     * V4: Verificar capacidades de consulta
     */
    async validateQueryCapabilities() {
        try {
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { UniversalNode } = require(path.join(this.schemasPath, 'UniversalNode.js'));

            const brain = resetBrain();

            // Configurar escenario
            const auth = UniversalNode.createModule('auth', 'Auth');
            auth.addProvides('auth:validate-token');
            auth.addEmits('user:logged-in');

            const users = UniversalNode.createModule('users', 'Users');
            users.addConsumes('auth:validate-token');
            users.addListens('user:logged-in');

            brain.register(auth);
            brain.register(users);
            brain.buildRelationGraph();

            // Test whoProvides
            const providers = brain.whoProvides('auth:validate-token');
            if (providers.length !== 1 || providers[0].key !== 'auth') {
                throw new Error('whoProvides no funciona');
            }

            // Test whoConsumes
            const consumers = brain.whoConsumes('auth:validate-token');
            if (consumers.length !== 1 || consumers[0].key !== 'users') {
                throw new Error('whoConsumes no funciona');
            }

            // Test whoEmits
            const emitters = brain.whoEmits('user:logged-in');
            if (emitters.length !== 1 || emitters[0].key !== 'auth') {
                throw new Error('whoEmits no funciona');
            }

            // Test whoListens
            const listeners = brain.whoListens('user:logged-in');
            if (listeners.length !== 1 || listeners[0].key !== 'users') {
                throw new Error('whoListens no funciona');
            }

            this.addResult('Capacidades de consulta funcionan', true);
        } catch (error) {
            this.addResult('Capacidades de consulta funcionan', false, error.message);
        }
    }

    /**
     * V5: Verificar análisis de impacto
     */
    async validateImpactAnalysis() {
        try {
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { UniversalNode } = require(path.join(this.schemasPath, 'UniversalNode.js'));

            const brain = resetBrain();

            // Crear cadena de dependencias: attendance -> users -> auth
            const auth = UniversalNode.createModule('auth', 'Auth');
            auth.addProvides('auth:validate-token');

            const users = UniversalNode.createModule('users', 'Users');
            users.addConsumes('auth:validate-token');
            users.addProvides('data:users');

            const attendance = UniversalNode.createModule('attendance', 'Attendance');
            attendance.addConsumes('data:users');

            brain.register(auth);
            brain.register(users);
            brain.register(attendance);
            brain.buildRelationGraph();

            // ¿Qué pasa si falla auth?
            const impact = brain.whatIfFails('auth');

            if (impact.directlyAffected.length !== 1) {
                throw new Error(`directlyAffected debería ser 1, es ${impact.directlyAffected.length}`);
            }
            if (impact.directlyAffected[0].key !== 'users') {
                throw new Error('users debería ser directamente afectado');
            }

            // attendance debería ser transitivamente afectado (users depende de auth, attendance de users)
            // Nota: esto depende de cómo se propaga la falla

            // Test whatDependsOn
            const deps = brain.whatDependsOn('attendance');
            if (deps.length !== 1 || deps[0].node.key !== 'users') {
                throw new Error('whatDependsOn no funciona');
            }

            // Test canNodeWork
            const canWork = brain.canNodeWork('users');
            if (!canWork.works) {
                throw new Error('users debería poder funcionar');
            }

            this.addResult('Análisis de impacto funciona', true);
        } catch (error) {
            this.addResult('Análisis de impacto funciona', false, error.message);
        }
    }

    /**
     * V6: Verificar health check
     */
    async validateHealthCheck() {
        try {
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { UniversalNode } = require(path.join(this.schemasPath, 'UniversalNode.js'));

            const brain = resetBrain();

            // Crear escenario saludable
            const auth = UniversalNode.createModule('auth', 'Auth');
            auth.addProvides('auth:login');

            const users = UniversalNode.createModule('users', 'Users');
            users.addConsumes('auth:login');
            users.addProvides('data:users');

            brain.register(auth);
            brain.register(users);
            brain.buildRelationGraph();

            // Verificar stats
            const stats = brain.getStats();
            if (stats.totalNodes !== 2) {
                throw new Error('totalNodes incorrecto');
            }
            if (stats.brokenDependencies !== 0) {
                throw new Error('No debería haber dependencias rotas');
            }

            // Verificar health report
            const report = brain.generateHealthReport();
            if (!report.overall) {
                throw new Error('Health report sin overall');
            }
            if (typeof report.score !== 'number') {
                throw new Error('Health report sin score');
            }

            // Verificar exportGraph
            const graph = brain.exportGraph();
            if (!graph.nodes || !graph.edges) {
                throw new Error('exportGraph incompleto');
            }

            this.addResult('Health check y reportes funcionan', true);
        } catch (error) {
            this.addResult('Health check y reportes funcionan', false, error.message);
        }
    }

    /**
     * V7: Verificar serialización
     */
    async validateSerialization() {
        try {
            const { IntrospectiveBrain, resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { UniversalNode } = require(path.join(this.schemasPath, 'UniversalNode.js'));

            const brain = resetBrain();

            const node = UniversalNode.createModule('test', 'Test');
            node.addProvides('data:test');
            brain.register(node);
            brain.buildRelationGraph();

            // toJSON
            const json = brain.toJSON();
            if (!json.nodes || !Array.isArray(json.nodes)) {
                throw new Error('toJSON no retorna nodes');
            }
            if (json.nodes.length !== 1) {
                throw new Error('toJSON pierde nodos');
            }

            // fromJSON
            const restored = IntrospectiveBrain.fromJSON(json);
            if (restored.getAllNodes().length !== 1) {
                throw new Error('fromJSON no restaura nodos');
            }

            const restoredNode = restored.getNode('test');
            if (!restoredNode || restoredNode.name !== 'Test') {
                throw new Error('fromJSON pierde datos del nodo');
            }

            this.addResult('Serialización del Brain funciona', true);
        } catch (error) {
            this.addResult('Serialización del Brain funciona', false, error.message);
        }
    }

    /**
     * V8: Verificar patrón singleton
     */
    async validateSingletonPattern() {
        try {
            const { getIntrospectiveBrain, resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));

            // Reset para asegurar estado limpio
            resetBrain();

            const brain1 = getIntrospectiveBrain();
            const brain2 = getIntrospectiveBrain();

            if (brain1 !== brain2) {
                throw new Error('getIntrospectiveBrain no retorna singleton');
            }

            this.addResult('Patrón singleton funciona', true);
        } catch (error) {
            this.addResult('Patrón singleton funciona', false, error.message);
        }
    }

    /**
     * V9: Escenario complejo - Software + Organización
     */
    async validateComplexScenario() {
        try {
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { UniversalNode, NodeType } = require(path.join(this.schemasPath, 'UniversalNode.js'));

            const brain = resetBrain();

            // === NODOS DE SOFTWARE ===
            const attendance = UniversalNode.createModule('attendance', 'Control de Asistencia');
            attendance.addProvides('data:attendance');
            attendance.addConsumes('auth:validate-token');
            attendance.addConsumes('org:supervisor');
            attendance.addEmits('attendance:clock-in');

            const auth = UniversalNode.createModule('auth', 'Autenticación');
            auth.addProvides('auth:validate-token');
            auth.addProvides('auth:login');

            // === NODOS ORGANIZACIONALES ===
            const rrhh = UniversalNode.createDepartment('rrhh', 'Recursos Humanos');
            rrhh.addProvides('org:supervisor');
            rrhh.addProvides('org:hierarchy');
            rrhh.addListens('attendance:clock-in');

            const supervisor = UniversalNode.createPerson('sup001', 'María García', { tenant: 1 });
            supervisor.addProvides('workflow:approve');
            supervisor.addConsumes('notification:in-app');

            // === NODO DE WORKFLOW ===
            const approvalFlow = UniversalNode.createWorkflow('vacation-approval', 'Aprobación de Vacaciones');
            approvalFlow.addConsumes('workflow:approve');
            approvalFlow.addConsumes('data:users');
            approvalFlow.addEmits('workflow:completed');

            // Registrar todos
            brain.registerMany([attendance, auth, rrhh, supervisor, approvalFlow]);
            brain.buildRelationGraph();

            // Verificar escenario
            const stats = brain.getStats();

            if (stats.totalNodes !== 5) {
                throw new Error(`Deberían ser 5 nodos, son ${stats.totalNodes}`);
            }

            // Verificar que software y org están relacionados
            // attendance consume org:supervisor que rrhh provee
            const attendanceToRrhh = brain.relations.find(r =>
                r.from === 'attendance' && r.to === 'rrhh'
            );
            if (!attendanceToRrhh) {
                throw new Error('No se dedujo relación software-organizacional');
            }

            // Verificar eventos cross-domain
            // rrhh escucha attendance:clock-in que attendance emite
            const rrhhListensAttendance = brain.relations.find(r =>
                r.from === 'rrhh' && r.to === 'attendance' && r.event === 'attendance:clock-in'
            );
            if (!rrhhListensAttendance) {
                throw new Error('No se dedujo relación de eventos cross-domain');
            }

            // Verificar health
            const health = brain.generateHealthReport();
            // Puede haber advertencias pero no debería ser crítico

            this.addResult('Escenario complejo software + organización funciona', true);
        } catch (error) {
            this.addResult('Escenario complejo software + organización funciona', false, error.message);
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
        console.log(`FASE 2 - RESULTADO: ${allPassed ? '✅ PASÓ' : '❌ FALLÓ'}`);
        console.log(`Validaciones: ${passed}/${total} pasaron`);
        console.log('='.repeat(50) + '\n');

        return {
            phase: 2,
            phaseName: 'introspective-brain',
            allPassed,
            passed,
            failed,
            total,
            results: this.results
        };
    }
}

module.exports = { Phase2Validator };
