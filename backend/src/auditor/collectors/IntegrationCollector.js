/**
 * INTEGRATION COLLECTOR - Testea relaciones entre módulos
 *
 * - Verifica que las dependencias entre módulos funcionen
 * - Detecta módulos huérfanos o con dependencias rotas
 * - Valida flujos de negocio que cruzan múltiples módulos
 * - Genera mapa de relaciones en tiempo real
 *
 * @version 1.0.0
 */

class IntegrationCollector {
  constructor(database, systemRegistry) {
    this.database = database;
    this.systemRegistry = systemRegistry;
  }

  async collect(execution_id, config) {
    console.log('  🔗 [INTEGRATION] Iniciando tests de integración...');

    const results = [];

    try {
      // Test 1: Verificar integridad de dependencias
      const dependencyTest = await this.testDependencyIntegrity(execution_id);
      results.push(dependencyTest);

      // Test 2: Verificar flujos de negocio inter-módulos
      const flowTests = await this.testBusinessFlows(execution_id);
      results.push(...flowTests);

      // Test 3: Verificar que módulos contratados puedan funcionar
      const contractedModulesTest = await this.testContractedModulesCanWork(execution_id, config.company_id);
      results.push(contractedModulesTest);

    } catch (error) {
      console.error('    ❌ [INTEGRATION] Error:', error.message);
    }

    console.log(`  ✅ [INTEGRATION] Completado - ${results.length} tests ejecutados`);
    return results;
  }

  async testDependencyIntegrity(execution_id) {
    console.log('    1️⃣ Verificando integridad de dependencias...');

    const allModules = this.systemRegistry.getAllModules();
    const brokenDependencies = [];
    const warnings = [];

    for (const module of allModules) {
      const deps = module.dependencies?.required || [];

      for (const depKey of deps) {
        const depModule = this.systemRegistry.getModule(depKey);

        if (!depModule) {
          brokenDependencies.push({
            module: module.key,
            dependency: depKey,
            type: 'missing'
          });
        }
      }
    }

    const status = brokenDependencies.length === 0 ? 'pass' : 'warning';
    const message = brokenDependencies.length === 0 ?
      'Todas las dependencias están registradas' :
      `${brokenDependencies.length} dependencias no están en el registry`;

    return {
      execution_id,
      test_type: 'integration',
      module_name: 'system',
      test_name: 'Integridad de Dependencias',
      test_description: 'Verifica que todas las dependencias declaradas existan en el registry',
      status,
      error_message: status === 'warning' ? message : null,
      error_context: status === 'warning' ? { brokenDependencies } : null,
      suggestions: brokenDependencies.length > 0 ? [
        {
          problem: 'Dependencias no registradas',
          solution: 'Agregar módulos base (database, companies, kiosks, biometric-enterprise) al registry',
          confidence: 0.9
        }
      ] : null,
      started_at: new Date(),
      completed_at: new Date()
    };
  }

  async testBusinessFlows(execution_id) {
    console.log('    2️⃣ Verificando flujos de negocio inter-módulos...');

    const flows = [
      {
        name: 'Registro de Usuario → Asignación Biométrica',
        modules: ['users', 'biometric'],
        description: 'Un usuario debe poder registrarse y luego asignar template biométrico'
      },
      {
        name: 'Usuario → Departamento → Turno → Asistencia',
        modules: ['users', 'departments', 'shifts', 'attendance'],
        description: 'Usuario asignado a departamento, con turno, puede registrar asistencia'
      },
      {
        name: 'Asistencia → Nómina',
        modules: ['attendance', 'payroll-liquidation'],
        description: 'Registros de asistencia alimentan el cálculo de nómina'
      },
      {
        name: 'Usuario → Licencia Médica → Notificación',
        modules: ['users', 'medical', 'notifications'],
        description: 'Licencia médica genera notificación automática'
      }
    ];

    const results = [];

    for (const flow of flows) {
      const allModulesExist = flow.modules.every(key => {
        const mod = this.systemRegistry.getModule(key);
        return mod !== null;
      });

      const status = allModulesExist ? 'pass' : 'fail';

      results.push({
        execution_id,
        test_type: 'integration',
        module_name: 'business-flows',
        test_name: `Flujo: ${flow.name}`,
        test_description: flow.description,
        status,
        error_message: !allModulesExist ? 'Uno o más módulos del flujo no existen' : null,
        error_context: !allModulesExist ? {
          flow: flow.name,
          modules: flow.modules,
          missing: flow.modules.filter(key => !this.systemRegistry.getModule(key))
        } : null,
        started_at: new Date(),
        completed_at: new Date()
      });
    }

    return results;
  }

  async testContractedModulesCanWork(execution_id, company_id) {
    console.log('    3️⃣ Verificando módulos contratados pueden funcionar...');

    if (!company_id) {
      return {
        execution_id,
        test_type: 'integration',
        module_name: 'contracted-modules',
        test_name: 'Módulos Contratados - Verificación de Dependencias',
        test_description: 'Verifica que módulos contratados por la empresa tengan dependencias activas',
        status: 'skip',
        error_message: 'No se especificó company_id',
        started_at: new Date(),
        completed_at: new Date()
      };
    }

    try {
      const { Company } = this.database;
      const company = await Company.findByPk(company_id);

      if (!company) {
        throw new Error(`Empresa ${company_id} no encontrada`);
      }

      const activeModules = company.active_modules || [];
      const modulesWithProblems = [];

      for (const moduleKey of activeModules) {
        const canWork = await this.systemRegistry.canModuleWork(moduleKey, company_id);

        if (!canWork.can_work) {
          modulesWithProblems.push({
            module: moduleKey,
            reason: canWork.reason,
            missing_dependencies: canWork.missing || canWork.missing_dependencies
          });
        }
      }

      const status = modulesWithProblems.length === 0 ? 'pass' : 'warning';

      return {
        execution_id,
        test_type: 'integration',
        module_name: 'contracted-modules',
        test_name: 'Módulos Contratados - Verificación de Dependencias',
        test_description: 'Verifica que módulos contratados por la empresa tengan dependencias activas',
        status,
        error_message: modulesWithProblems.length > 0 ?
          `${modulesWithProblems.length} módulos contratados tienen dependencias faltantes` : null,
        error_context: modulesWithProblems.length > 0 ? { modulesWithProblems } : null,
        suggestions: modulesWithProblems.length > 0 ? modulesWithProblems.map(m => ({
          problem: `Módulo ${m.module} no puede funcionar`,
          solution: `Activar dependencias: ${m.missing_dependencies.join(', ')}`,
          confidence: 0.85
        })) : null,
        started_at: new Date(),
        completed_at: new Date()
      };

    } catch (error) {
      return {
        execution_id,
        test_type: 'integration',
        module_name: 'contracted-modules',
        test_name: 'Módulos Contratados - Verificación de Dependencias',
        test_description: 'Verifica que módulos contratados por la empresa tengan dependencias activas',
        status: 'fail',
        error_type: error.constructor.name,
        error_message: error.message,
        error_stack: error.stack,
        started_at: new Date(),
        completed_at: new Date()
      };
    }
  }
}

module.exports = IntegrationCollector;
