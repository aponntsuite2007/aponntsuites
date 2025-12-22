/**
 * ============================================================================
 * PHASE 1 VALIDATOR - Schema UniversalNode + Vocabulario
 * ============================================================================
 *
 * Validaciones para la Fase 1: Schema y Vocabulario de capacidades.
 * Verifica que UniversalNode y CapabilitiesVocabulary funcionan correctamente.
 *
 * Created: 2025-12-17
 */

const path = require('path');

class Phase1Validator {
    constructor() {
        this.results = [];
        this.schemasPath = path.join(__dirname, '..', 'schemas');
    }

    /**
     * Ejecutar todas las validaciones de Fase 1
     */
    async runAll() {
        console.log('\n🔍 [PHASE-1] Ejecutando validaciones...\n');

        await this.validateUniversalNodeExists();
        await this.validateNodeCreation();
        await this.validateNodeCapabilities();
        await this.validateNodeSerialization();
        await this.validateVocabularyExists();
        await this.validateVocabularyStructure();
        await this.validateCapabilityValidation();
        await this.validateCompatibilityCheck();
        await this.validateStandardEvents();
        await this.validateIntegration();

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
     * V1: Verificar que UniversalNode existe
     */
    async validateUniversalNodeExists() {
        try {
            const { UniversalNode, NodeType, NodeStatus } = require(path.join(this.schemasPath, 'UniversalNode.js'));

            if (typeof UniversalNode !== 'function') {
                throw new Error('UniversalNode no es una clase');
            }
            if (!NodeType || typeof NodeType !== 'object') {
                throw new Error('NodeType no existe');
            }
            if (!NodeStatus || typeof NodeStatus !== 'object') {
                throw new Error('NodeStatus no existe');
            }

            // Verificar tipos de nodo
            const expectedTypes = ['MODULE', 'PERSON', 'DEPARTMENT', 'WORKFLOW', 'SERVICE'];
            for (const type of expectedTypes) {
                if (!NodeType[type]) {
                    throw new Error(`NodeType.${type} no existe`);
                }
            }

            this.addResult('UniversalNode existe y exporta correctamente', true);
        } catch (error) {
            this.addResult('UniversalNode existe y exporta correctamente', false, error.message);
        }
    }

    /**
     * V2: Verificar creación de nodos
     */
    async validateNodeCreation() {
        try {
            const { UniversalNode, NodeType } = require(path.join(this.schemasPath, 'UniversalNode.js'));

            // Crear nodo básico
            const node = new UniversalNode({
                key: 'test-module',
                name: 'Test Module',
                type: NodeType.MODULE,
                description: 'Módulo de prueba'
            });

            if (!node.id) throw new Error('Nodo sin ID');
            if (node.key !== 'test-module') throw new Error('Key incorrecto');
            if (node.type !== NodeType.MODULE) throw new Error('Type incorrecto');

            // Crear usando factory methods
            const moduleNode = UniversalNode.createModule('users', 'Gestión de Usuarios');
            if (moduleNode.domain !== 'software') throw new Error('Domain incorrecto para módulo');

            const personNode = UniversalNode.createPerson('emp001', 'Juan Pérez');
            if (personNode.domain !== 'organization') throw new Error('Domain incorrecto para persona');

            const deptNode = UniversalNode.createDepartment('rrhh', 'Recursos Humanos');
            if (deptNode.type !== NodeType.DEPARTMENT) throw new Error('Type incorrecto para departamento');

            this.addResult('Creación de nodos funciona', true);
        } catch (error) {
            this.addResult('Creación de nodos funciona', false, error.message);
        }
    }

    /**
     * V3: Verificar gestión de capacidades
     */
    async validateNodeCapabilities() {
        try {
            const { UniversalNode } = require(path.join(this.schemasPath, 'UniversalNode.js'));

            const node = UniversalNode.createModule('users', 'Gestión de Usuarios');

            // Agregar capacidades
            node.addProvides('data:users', { access: 'full' });
            node.addProvides('data:read');
            node.addConsumes('auth:validate-token');
            node.addConsumes('notification:send', { required: false });
            node.addEmits('entity:created', { entity: 'user' });
            node.addListens('user:logged-in');

            // Verificar
            if (!node.doesProvide('data:users')) throw new Error('doesProvide no funciona');
            if (!node.doesConsume('auth:validate-token')) throw new Error('doesConsume no funciona');
            if (!node.doesEmit('entity:created')) throw new Error('doesEmit no funciona');
            if (!node.doesListen('user:logged-in')) throw new Error('doesListen no funciona');

            // Verificar required vs optional
            const required = node.getRequiredCapabilities();
            const optional = node.getOptionalCapabilities();

            if (!required.includes('auth:validate-token')) throw new Error('Required no incluye auth');
            if (!optional.includes('notification:send')) throw new Error('Optional no incluye notification');

            this.addResult('Gestión de capacidades funciona', true);
        } catch (error) {
            this.addResult('Gestión de capacidades funciona', false, error.message);
        }
    }

    /**
     * V4: Verificar serialización
     */
    async validateNodeSerialization() {
        try {
            const { UniversalNode } = require(path.join(this.schemasPath, 'UniversalNode.js'));

            const node = UniversalNode.createModule('test', 'Test');
            node.addProvides('data:read');
            node.addConsumes('auth:login');

            // toJSON
            const json = node.toJSON();
            if (typeof json !== 'object') throw new Error('toJSON no retorna objeto');
            if (json.key !== 'test') throw new Error('toJSON pierde key');
            if (json.provides.length !== 1) throw new Error('toJSON pierde provides');

            // fromJSON
            const restored = UniversalNode.fromJSON(json);
            if (restored.key !== node.key) throw new Error('fromJSON no restaura key');
            if (restored.provides.length !== node.provides.length) throw new Error('fromJSON pierde provides');

            // Stringify completo
            const str = JSON.stringify(node.toJSON());
            const parsed = UniversalNode.fromJSON(JSON.parse(str));
            if (parsed.key !== 'test') throw new Error('Ciclo completo de serialización falló');

            this.addResult('Serialización JSON funciona', true);
        } catch (error) {
            this.addResult('Serialización JSON funciona', false, error.message);
        }
    }

    /**
     * V5: Verificar que CapabilitiesVocabulary existe
     */
    async validateVocabularyExists() {
        try {
            const { CapabilitiesVocabulary, CAPABILITIES, STANDARD_EVENTS } =
                require(path.join(this.schemasPath, 'CapabilitiesVocabulary.js'));

            if (typeof CapabilitiesVocabulary !== 'function' && typeof CapabilitiesVocabulary !== 'object') {
                throw new Error('CapabilitiesVocabulary no existe');
            }
            if (!CAPABILITIES || typeof CAPABILITIES !== 'object') {
                throw new Error('CAPABILITIES no existe');
            }
            if (!STANDARD_EVENTS || typeof STANDARD_EVENTS !== 'object') {
                throw new Error('STANDARD_EVENTS no existe');
            }

            this.addResult('CapabilitiesVocabulary existe y exporta correctamente', true);
        } catch (error) {
            this.addResult('CapabilitiesVocabulary existe y exporta correctamente', false, error.message);
        }
    }

    /**
     * V6: Verificar estructura del vocabulario
     */
    async validateVocabularyStructure() {
        try {
            const { CAPABILITIES } = require(path.join(this.schemasPath, 'CapabilitiesVocabulary.js'));

            // Verificar dominios esperados
            const expectedDomains = ['DATA', 'AUTH', 'NOTIFICATION', 'FILE', 'REPORT', 'INTEGRATION', 'WORKFLOW', 'UI', 'ORG', 'BUSINESS'];
            for (const domain of expectedDomains) {
                if (!CAPABILITIES[domain]) {
                    throw new Error(`Dominio '${domain}' no existe`);
                }
            }

            // Verificar que hay capacidades en cada dominio
            for (const domain of expectedDomains) {
                const count = Object.keys(CAPABILITIES[domain]).length;
                if (count === 0) {
                    throw new Error(`Dominio '${domain}' está vacío`);
                }
            }

            // Verificar estructura de una capacidad
            const dataRead = CAPABILITIES.DATA['data:read'];
            if (!dataRead.name) throw new Error('Capability sin name');
            if (!dataRead.description) throw new Error('Capability sin description');

            this.addResult('Estructura del vocabulario es válida', true);
        } catch (error) {
            this.addResult('Estructura del vocabulario es válida', false, error.message);
        }
    }

    /**
     * V7: Verificar validación de capacidades
     */
    async validateCapabilityValidation() {
        try {
            const { CapabilitiesVocabulary } = require(path.join(this.schemasPath, 'CapabilitiesVocabulary.js'));

            // Capacidades válidas
            if (!CapabilitiesVocabulary.isValid('data:read')) {
                throw new Error('data:read debería ser válido');
            }
            if (!CapabilitiesVocabulary.isValid('auth:login')) {
                throw new Error('auth:login debería ser válido');
            }

            // Capacidades inválidas
            if (CapabilitiesVocabulary.isValid('fake:capability')) {
                throw new Error('fake:capability no debería ser válido');
            }
            if (CapabilitiesVocabulary.isValid('invalid')) {
                throw new Error('invalid no debería ser válido');
            }

            // getDefinition
            const def = CapabilitiesVocabulary.getDefinition('data:read');
            if (!def || !def.name) {
                throw new Error('getDefinition no retorna definición');
            }

            this.addResult('Validación de capacidades funciona', true);
        } catch (error) {
            this.addResult('Validación de capacidades funciona', false, error.message);
        }
    }

    /**
     * V8: Verificar chequeo de compatibilidad
     */
    async validateCompatibilityCheck() {
        try {
            const { CapabilitiesVocabulary } = require(path.join(this.schemasPath, 'CapabilitiesVocabulary.js'));

            // Coincidencia exacta
            if (!CapabilitiesVocabulary.isCompatible('data:read', 'data:read')) {
                throw new Error('Coincidencia exacta debería ser compatible');
            }

            // write implica read
            if (!CapabilitiesVocabulary.isCompatible('data:write', 'data:read')) {
                throw new Error('data:write debería satisfacer data:read');
            }

            // No compatible
            if (CapabilitiesVocabulary.isCompatible('auth:login', 'data:read')) {
                throw new Error('auth:login no debería satisfacer data:read');
            }

            this.addResult('Chequeo de compatibilidad funciona', true);
        } catch (error) {
            this.addResult('Chequeo de compatibilidad funciona', false, error.message);
        }
    }

    /**
     * V9: Verificar eventos estándar
     */
    async validateStandardEvents() {
        try {
            const { STANDARD_EVENTS } = require(path.join(this.schemasPath, 'CapabilitiesVocabulary.js'));

            // Verificar eventos importantes
            const expectedEvents = [
                'entity:created',
                'entity:updated',
                'entity:deleted',
                'user:logged-in',
                'workflow:started',
                'attendance:clock-in',
                'invoice:created'
            ];

            for (const event of expectedEvents) {
                if (!STANDARD_EVENTS[event]) {
                    throw new Error(`Evento '${event}' no existe`);
                }
                if (!STANDARD_EVENTS[event].description) {
                    throw new Error(`Evento '${event}' sin description`);
                }
                if (!STANDARD_EVENTS[event].payload) {
                    throw new Error(`Evento '${event}' sin payload`);
                }
            }

            this.addResult('Eventos estándar definidos correctamente', true);
        } catch (error) {
            this.addResult('Eventos estándar definidos correctamente', false, error.message);
        }
    }

    /**
     * V10: Verificar integración UniversalNode + Vocabulary
     */
    async validateIntegration() {
        try {
            const { UniversalNode } = require(path.join(this.schemasPath, 'UniversalNode.js'));
            const { CapabilitiesVocabulary } = require(path.join(this.schemasPath, 'CapabilitiesVocabulary.js'));

            // Crear nodo con capacidades del vocabulario
            const node = UniversalNode.createModule('attendance', 'Control de Asistencia');
            node.addProvides('data:attendance');
            node.addConsumes('auth:validate-token');
            node.addConsumes('data:users');
            node.addEmits('attendance:clock-in');
            node.addListens('user:logged-in');

            // Validar el nodo
            const validation = node.validate();
            if (!validation.valid) {
                throw new Error(`Validación falló: ${validation.errors.join(', ')}`);
            }

            // Verificar que otro nodo puede satisfacer lo que este consume
            const authNode = UniversalNode.createModule('auth', 'Autenticación');
            authNode.addProvides('auth:validate-token');
            authNode.addProvides('auth:login');

            // auth provee lo que attendance consume
            const authProvides = authNode.provides.map(p => p.capability);
            const attendanceConsumes = node.consumes.map(c => c.capability);

            const canSatisfy = attendanceConsumes.some(c =>
                authProvides.some(p => CapabilitiesVocabulary.isCompatible(p, c))
            );

            if (!canSatisfy) {
                throw new Error('Auth debería poder satisfacer algo de attendance');
            }

            this.addResult('Integración UniversalNode + Vocabulary funciona', true);
        } catch (error) {
            this.addResult('Integración UniversalNode + Vocabulary funciona', false, error.message);
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
        console.log(`FASE 1 - RESULTADO: ${allPassed ? '✅ PASÓ' : '❌ FALLÓ'}`);
        console.log(`Validaciones: ${passed}/${total} pasaron`);
        console.log('='.repeat(50) + '\n');

        return {
            phase: 1,
            phaseName: 'schema-vocabulary',
            allPassed,
            passed,
            failed,
            total,
            results: this.results
        };
    }
}

module.exports = { Phase1Validator };
