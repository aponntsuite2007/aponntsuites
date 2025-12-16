/**
 * ============================================================================
 * BIOMETRIC STRESS TEST MODULE - INDEX
 * ============================================================================
 *
 * Exporta todos los componentes del sistema de testing biométrico masivo.
 *
 * @version 1.0.0
 * @date 2024-12-14
 * ============================================================================
 */

const BiometricStressTestOrchestrator = require('./BiometricStressTestOrchestrator');
const BiometricScenarioEngine = require('./BiometricScenarioEngine');
const BiometricMockFactory = require('./BiometricMockFactory');
const BiometricConsistencyValidator = require('./BiometricConsistencyValidator');

module.exports = {
    BiometricStressTestOrchestrator,
    BiometricScenarioEngine,
    BiometricMockFactory,
    BiometricConsistencyValidator,

    // Helper para crear instancia configurada
    createStressTest: (options = {}) => {
        return new BiometricStressTestOrchestrator({
            scenarioCount: options.count || 1000,
            parallelWorkers: options.workers || 10,
            companyId: options.companyId || 1,
            verbose: options.verbose !== false,
            baseUrl: options.baseUrl || process.env.BASE_URL || 'http://localhost:9998',
            ...options
        });
    }
};
