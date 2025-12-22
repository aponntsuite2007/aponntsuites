/**
 * ============================================================================
 * PHASE 6 VALIDATOR - Tutorial Generator
 * ============================================================================
 *
 * Validaciones para la Fase 6: TutorialGenerator.
 *
 * Created: 2025-12-17
 */

const path = require('path');

class Phase6Validator {
    constructor() {
        this.results = [];
        this.integrationsPath = path.join(__dirname, '..', 'integrations');
        this.corePath = path.join(__dirname, '..', 'core');
    }

    /**
     * Ejecutar todas las validaciones de Fase 6
     */
    async runAll() {
        console.log('\n🔍 [PHASE-6] Ejecutando validaciones...\n');

        await this.validateTutorialGeneratorExists();
        await this.validateModuleTutorial();
        await this.validateAssessmentGeneration();
        await this.validateOnboardingFlow();
        await this.validateTutorialContent();
        await this.validateExportAll();

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
     * V1: Verificar que TutorialGenerator existe
     */
    async validateTutorialGeneratorExists() {
        try {
            const { TutorialGenerator } = require(path.join(this.integrationsPath, 'TutorialGenerator.js'));

            if (typeof TutorialGenerator !== 'function') {
                throw new Error('TutorialGenerator no es una clase');
            }

            this.addResult('TutorialGenerator existe', true);
        } catch (error) {
            this.addResult('TutorialGenerator existe', false, error.message);
        }
    }

    /**
     * V2: Verificar generación de tutorial para un módulo
     */
    async validateModuleTutorial() {
        try {
            const { TutorialGenerator } = require(path.join(this.integrationsPath, 'TutorialGenerator.js'));
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

            // Inicializar Brain con módulos
            const brain = resetBrain();
            const migrator = new ModuleMigrator();
            const nodes = await migrator.migrateAll();
            for (const node of nodes) {
                brain.register(node);
            }
            brain.buildRelationGraph();

            // Crear generador
            const generator = new TutorialGenerator(brain);

            // Generar tutorial para un módulo
            const tutorial = generator.generateModuleTutorial('attendance');

            if (!tutorial || tutorial.error) {
                throw new Error(tutorial?.error || 'No se generó tutorial');
            }

            if (!tutorial.title || !tutorial.sections || tutorial.sections.length === 0) {
                throw new Error('Tutorial incompleto');
            }

            if (!tutorial.difficulty || !tutorial.estimatedTime) {
                throw new Error('Faltan metadatos del tutorial');
            }

            this.addResult(`Tutorial generado: ${tutorial.sections.length} secciones`, true);
        } catch (error) {
            this.addResult('Generación de tutorial', false, error.message);
        }
    }

    /**
     * V3: Verificar generación de assessment
     */
    async validateAssessmentGeneration() {
        try {
            const { TutorialGenerator } = require(path.join(this.integrationsPath, 'TutorialGenerator.js'));
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

            const brain = resetBrain();
            const migrator = new ModuleMigrator();
            const nodes = await migrator.migrateAll();
            for (const node of nodes) {
                brain.register(node);
            }
            brain.buildRelationGraph();

            const generator = new TutorialGenerator(brain);
            const assessment = generator.generateAssessment('users');

            if (!assessment) {
                throw new Error('No se generó assessment');
            }

            if (!assessment.questions || assessment.questions.length === 0) {
                throw new Error('Assessment sin preguntas');
            }

            if (!assessment.passingScore || !assessment.totalPoints) {
                throw new Error('Faltan puntuación del assessment');
            }

            this.addResult(`Assessment generado: ${assessment.questions.length} preguntas, ${assessment.totalPoints} puntos`, true);
        } catch (error) {
            this.addResult('Generación de assessment', false, error.message);
        }
    }

    /**
     * V4: Verificar flujo de onboarding
     */
    async validateOnboardingFlow() {
        try {
            const { TutorialGenerator } = require(path.join(this.integrationsPath, 'TutorialGenerator.js'));
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

            const brain = resetBrain();
            const migrator = new ModuleMigrator();
            const nodes = await migrator.migrateAll();
            for (const node of nodes) {
                brain.register(node);
            }
            brain.buildRelationGraph();

            const generator = new TutorialGenerator(brain);
            const flow = generator.generateOnboardingFlow();

            if (!flow || !flow.steps || flow.steps.length < 3) {
                throw new Error('Flujo de onboarding incompleto');
            }

            // Verificar estructura de pasos
            const hasWelcome = flow.steps.some(s => s.type === 'welcome');
            const hasCompletion = flow.steps.some(s => s.type === 'completion');
            const hasModules = flow.steps.some(s => s.type === 'module_intro');

            if (!hasWelcome || !hasCompletion || !hasModules) {
                throw new Error('Faltan tipos de pasos (welcome/completion/module_intro)');
            }

            this.addResult(`Onboarding flow: ${flow.steps.length} pasos, ~${flow.totalEstimatedTime} min`, true);
        } catch (error) {
            this.addResult('Flujo de onboarding', false, error.message);
        }
    }

    /**
     * V5: Verificar contenido del tutorial
     */
    async validateTutorialContent() {
        try {
            const { TutorialGenerator } = require(path.join(this.integrationsPath, 'TutorialGenerator.js'));
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

            const brain = resetBrain();
            const migrator = new ModuleMigrator();
            const nodes = await migrator.migrateAll();
            for (const node of nodes) {
                brain.register(node);
            }
            brain.buildRelationGraph();

            const generator = new TutorialGenerator(brain);

            // Usar 'attendance' que sabemos que existe
            const tutorial = generator.generateModuleTutorial('attendance');

            if (!tutorial || !tutorial.sections || !Array.isArray(tutorial.sections)) {
                throw new Error('Tutorial sin secciones válidas');
            }

            // Verificar secciones específicas
            const hasIntro = tutorial.sections.some(s => s.type === 'introduction');
            const hasQuickstart = tutorial.sections.some(s => s.type === 'quickstart');

            if (!hasIntro) {
                throw new Error('Falta sección de introducción');
            }

            if (!hasQuickstart) {
                throw new Error('Falta sección de quickstart');
            }

            // Verificar contenido de introducción
            const introSection = tutorial.sections.find(s => s.type === 'introduction');
            if (!introSection || !introSection.content) {
                throw new Error('Introducción sin contenido');
            }

            if (!introSection.content.overview || !introSection.content.benefits) {
                throw new Error('Contenido de introducción incompleto');
            }

            this.addResult('Contenido del tutorial verificado', true);
        } catch (error) {
            this.addResult('Contenido del tutorial', false, error.message);
        }
    }

    /**
     * V6: Verificar export de todos los tutoriales
     */
    async validateExportAll() {
        try {
            const { TutorialGenerator } = require(path.join(this.integrationsPath, 'TutorialGenerator.js'));
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

            const brain = resetBrain();
            const migrator = new ModuleMigrator();
            const nodes = await migrator.migrateAll();
            for (const node of nodes) {
                brain.register(node);
            }
            brain.buildRelationGraph();

            const generator = new TutorialGenerator(brain);
            const allTutorials = generator.exportAllTutorials();

            if (!allTutorials.tutorials || allTutorials.tutorials.length < 10) {
                throw new Error(`Solo ${allTutorials.tutorials?.length || 0} tutoriales (esperados >10)`);
            }

            if (!allTutorials.generatedAt) {
                throw new Error('Falta timestamp de generación');
            }

            this.addResult(`Export completo: ${allTutorials.totalTutorials} tutoriales`, true);
        } catch (error) {
            this.addResult('Export de tutoriales', false, error.message);
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
        console.log(`FASE 6 - RESULTADO: ${allPassed ? '✅ PASÓ' : '❌ FALLÓ'}`);
        console.log(`Validaciones: ${passed}/${total} pasaron`);
        console.log('='.repeat(50) + '\n');

        return {
            phase: 6,
            phaseName: 'tutorial-generator',
            allPassed,
            passed,
            failed,
            total,
            results: this.results
        };
    }
}

module.exports = { Phase6Validator };
