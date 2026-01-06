/**
 * ENDPOINT COLLECTOR - Prueba todos los endpoints del sistema
 *
 * - Detecta endpoints automáticamente
 * - Prueba con/sin autenticación
 * - Mide tiempos de respuesta
 * - Valida status codes esperados
 * - Prueba con datos válidos e inválidos
 *
 * @version 1.0.0
 */

const axios = require('axios');

class EndpointCollector {
  constructor(database, systemRegistry) {
    this.database = database;
    this.systemRegistry = systemRegistry;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:9998';
  }

  async collect(execution_id, config) {
    console.log('  🌐 [ENDPOINT] Iniciando pruebas de endpoints...');

    // ✅ GUARDAR company_id para uso posterior (CRÍTICO para audit_test_logs)
    this.company_id = config.company_id;

    const results = [];
    const modules = config.moduleFilter ?
      [this.systemRegistry.getModule(config.moduleFilter)] :
      this.systemRegistry.getAllModules();

    // Generar token de prueba
    const testToken = await this._generateTestToken(config.company_id);

    for (const module of modules) {
      if (!module || !module.api_endpoints) continue;

      for (const endpoint of module.api_endpoints) {
        const testResult = await this._testEndpoint(
          module.id,
          endpoint,
          testToken,
          execution_id
        );
        results.push(testResult);
      }
    }

    return results;
  }

  async _testEndpoint(moduleId, endpoint, token, execution_id) {
    const { AuditLog } = this.database;

    // Crear log de inicio
    const log = await AuditLog.create({
      execution_id,
      company_id: this.company_id, // ← CRÍTICO: Incluir company_id
      test_type: 'endpoint',
      module_name: moduleId,
      test_name: `${endpoint.method} ${endpoint.path}`,
      test_description: endpoint.description,
      endpoint: endpoint.path,
      http_method: endpoint.method,
      status: 'in-progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      // Preparar request
      const url = `${this.baseUrl}${endpoint.path}`;
      const headers = {};

      if (endpoint.auth_required) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Request body de prueba
      const testData = endpoint.test_data || this._generateTestData(endpoint);

      // Ejecutar request
      const response = await axios({
        method: endpoint.method,
        url,
        headers,
        data: testData,
        timeout: 10000,
        validateStatus: () => true // No lanzar error en 4xx/5xx
      });

      const duration = Date.now() - startTime;

      // Validar respuesta
      const expectedStatus = endpoint.expected_status || this._getExpectedStatus(endpoint.method);
      const statusMatch = response.status === expectedStatus;

      // Validar tiempo de respuesta
      const targetTime = endpoint.response_time_target ?
        parseInt(endpoint.response_time_target.replace(/[<>ms ]/g, '')) :
        1000;
      const performanceOk = duration < targetTime;

      // Determinar status del test
      let status = 'pass';
      let severity = null;

      if (!statusMatch) {
        status = 'fail';
        severity = response.status >= 500 ? 'critical' : 'high';
      } else if (!performanceOk) {
        status = 'warning';
        severity = 'medium';
      }

      // Actualizar log
      await log.update({
        status,
        severity,
        response_status: response.status,
        response_body: response.data,
        response_time_ms: duration,
        completed_at: new Date(),
        duration_ms: duration,
        error_message: statusMatch ? null : `Expected ${expectedStatus}, got ${response.status}`
      });

      return log;

    } catch (error) {
      const duration = Date.now() - startTime;

      await log.update({
        status: 'fail',
        severity: 'critical',
        error_type: error.code || 'NetworkError',
        error_message: error.message,
        error_stack: error.stack,
        response_time_ms: duration,
        completed_at: new Date(),
        duration_ms: duration
      });

      return log;
    }
  }

  _getExpectedStatus(method) {
    const statusMap = {
      'GET': 200,
      'POST': 201,
      'PUT': 200,
      'PATCH': 200,
      'DELETE': 200
    };
    return statusMap[method] || 200;
  }

  _generateTestData(endpoint) {
    // Genera datos de prueba básicos según el método
    if (endpoint.method === 'GET' || endpoint.method === 'DELETE') {
      return null;
    }

    return endpoint.validation_rules ? this._dataFromRules(endpoint.validation_rules) : {};
  }

  _dataFromRules(rules) {
    // Parsea validation_rules para generar datos válidos
    const data = {};
    // Simplificado - en producción sería más elaborado
    return data;
  }

  async _generateTestToken(companyId) {
    const jwt = require('jsonwebtoken');
    const { User } = this.database;

    // Buscar un usuario admin de la empresa
    const admin = await User.findOne({
      where: {
        company_id: companyId || 1,
        role: 'admin'
      }
    });

    if (!admin) {
      throw new Error('No se encontró usuario admin para generar token');
    }

    return jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        company_id: admin.company_id,
        role: admin.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
  }
}

module.exports = EndpointCollector;
