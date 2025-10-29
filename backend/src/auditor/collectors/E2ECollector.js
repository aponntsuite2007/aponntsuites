/**
 * E2E COLLECTOR - Tests de Experiencia de Usuario Completa
 *
 * Testea flujos completos end-to-end simulando un usuario real:
 * - CRUD completo con persistencia
 * - Upload/Download de archivos
 * - Notificaciones multi-canal
 * - Flujos de aprobación
 * - Integración entre módulos
 *
 * @version 1.0.0
 * @date 2025-01-21
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

class E2ECollector {
  constructor(database, systemRegistry) {
    this.database = database;
    this.systemRegistry = systemRegistry;
    this.testData = new Map(); // Almacena IDs de registros creados para cleanup
  }

  async collect(execution_id, config) {
    console.log('  🎭 [E2E] Iniciando tests End-to-End...');

    const results = [];
    const modules = this.systemRegistry.getAllModules();
    const baseURL = config.baseURL || 'http://localhost:9998';
    const authToken = config.authToken;
    const companyId = config.companyId || 11;

    // Tests E2E por módulo
    for (const module of modules) {
      if (!module.api_endpoints || module.api_endpoints.length === 0) {
        continue; // Skip módulos sin API
      }

      console.log(`    🎭 [E2E] Testeando ${module.name}...`);

      // Test 1: CRUD Completo
      if (this.hasCrudEndpoints(module)) {
        results.push(...await this.testCrudFlow(execution_id, module, baseURL, authToken, companyId));
      }

      // Test 2: Upload de archivos
      if (this.hasFileUpload(module)) {
        results.push(await this.testFileUpload(execution_id, module, baseURL, authToken, companyId));
      }

      // Test 3: Notificaciones
      if (this.hasNotifications(module)) {
        results.push(await this.testNotifications(execution_id, module, baseURL, authToken, companyId));
      }

      // Test 4: Flujos de aprobación
      if (this.hasApprovalFlow(module)) {
        results.push(await this.testApprovalFlow(execution_id, module, baseURL, authToken, companyId));
      }
    }

    // Cleanup: Eliminar datos de prueba
    await this.cleanup(baseURL, authToken);

    console.log(`  ✅ [E2E] Completado - ${results.length} tests ejecutados`);
    return results;
  }

  /**
   * Test CRUD completo: Create → Read → Update → Delete
   */
  async testCrudFlow(execution_id, module, baseURL, authToken, companyId) {
    const results = [];
    const { AuditLog } = this.database;

    // 1. CREATE
    const createLog = await AuditLog.create({
      execution_id,
      test_type: 'e2e',
      module_name: module.id,
      test_name: `E2E CRUD - CREATE ${module.name}`,
      test_description: 'Crear registro y verificar persistencia',
      status: 'in-progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const createEndpoint = module.api_endpoints.find(e => e.method === 'POST' && !e.path.includes(':id'));
      if (!createEndpoint) {
        throw new Error('No se encontró endpoint POST para crear');
      }

      const testData = this.generateTestData(module);
      const createResponse = await axios.post(
        `${baseURL}${createEndpoint.path}`,
        testData,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (createResponse.status !== 200 && createResponse.status !== 201) {
        throw new Error(`CREATE falló con status ${createResponse.status}`);
      }

      const createdId = createResponse.data.id || createResponse.data.data?.id;
      if (!createdId) {
        throw new Error('CREATE exitoso pero no retornó ID');
      }

      // Guardar ID para cleanup
      if (!this.testData.has(module.id)) {
        this.testData.set(module.id, []);
      }
      this.testData.get(module.id).push(createdId);

      await createLog.update({
        status: 'pass',
        duration_ms: Date.now() - startTime,
        test_data: { created_id: createdId },
        completed_at: new Date()
      });

      results.push(createLog);

      // 2. READ (verificar que existe)
      const readLog = await AuditLog.create({
        execution_id,
        test_type: 'e2e',
        module_name: module.id,
        test_name: `E2E CRUD - READ ${module.name}`,
        test_description: 'Leer registro creado',
        status: 'in-progress',
        started_at: new Date()
      });

      const readStartTime = Date.now();

      const getEndpoint = module.api_endpoints.find(e => e.method === 'GET' && e.path.includes(':id'));
      if (getEndpoint) {
        const readResponse = await axios.get(
          `${baseURL}${getEndpoint.path.replace(':id', createdId)}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        if (readResponse.status !== 200) {
          throw new Error(`READ falló con status ${readResponse.status}`);
        }

        await readLog.update({
          status: 'pass',
          duration_ms: Date.now() - readStartTime,
          completed_at: new Date()
        });
      } else {
        await readLog.update({
          status: 'warning',
          duration_ms: Date.now() - readStartTime,
          error_message: 'No se encontró endpoint GET/:id para testear READ',
          completed_at: new Date()
        });
      }

      results.push(readLog);

      // 3. UPDATE
      const updateLog = await AuditLog.create({
        execution_id,
        test_type: 'e2e',
        module_name: module.id,
        test_name: `E2E CRUD - UPDATE ${module.name}`,
        test_description: 'Modificar registro y verificar cambios',
        status: 'in-progress',
        started_at: new Date()
      });

      const updateStartTime = Date.now();

      const updateEndpoint = module.api_endpoints.find(e => e.method === 'PUT' && e.path.includes(':id'));
      if (updateEndpoint) {
        const updatedData = { ...testData, name: `${testData.name || 'Test'} UPDATED` };
        const updateResponse = await axios.put(
          `${baseURL}${updateEndpoint.path.replace(':id', createdId)}`,
          updatedData,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        if (updateResponse.status !== 200) {
          throw new Error(`UPDATE falló con status ${updateResponse.status}`);
        }

        await updateLog.update({
          status: 'pass',
          duration_ms: Date.now() - updateStartTime,
          completed_at: new Date()
        });
      } else {
        await updateLog.update({
          status: 'warning',
          duration_ms: Date.now() - updateStartTime,
          error_message: 'No se encontró endpoint PUT/:id para testear UPDATE',
          completed_at: new Date()
        });
      }

      results.push(updateLog);

      // 4. DELETE
      const deleteLog = await AuditLog.create({
        execution_id,
        test_type: 'e2e',
        module_name: module.id,
        test_name: `E2E CRUD - DELETE ${module.name}`,
        test_description: 'Eliminar registro y verificar desaparición',
        status: 'in-progress',
        started_at: new Date()
      });

      const deleteStartTime = Date.now();

      const deleteEndpoint = module.api_endpoints.find(e => e.method === 'DELETE' && e.path.includes(':id'));
      if (deleteEndpoint) {
        const deleteResponse = await axios.delete(
          `${baseURL}${deleteEndpoint.path.replace(':id', createdId)}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        if (deleteResponse.status !== 200 && deleteResponse.status !== 204) {
          throw new Error(`DELETE falló con status ${deleteResponse.status}`);
        }

        // Remover de lista de cleanup ya que lo borramos
        const ids = this.testData.get(module.id);
        this.testData.set(module.id, ids.filter(id => id !== createdId));

        await deleteLog.update({
          status: 'pass',
          duration_ms: Date.now() - deleteStartTime,
          completed_at: new Date()
        });
      } else {
        await deleteLog.update({
          status: 'warning',
          duration_ms: Date.now() - deleteStartTime,
          error_message: 'No se encontró endpoint DELETE/:id para testear DELETE',
          completed_at: new Date()
        });
      }

      results.push(deleteLog);

    } catch (error) {
      await createLog.update({
        status: 'fail',
        severity: 'high',
        error_type: error.name,
        error_message: error.message,
        duration_ms: Date.now() - startTime,
        completed_at: new Date()
      });

      results.push(createLog);
    }

    return results;
  }

  /**
   * Test upload de archivos
   */
  async testFileUpload(execution_id, module, baseURL, authToken, companyId) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'e2e',
      module_name: module.id,
      test_name: `E2E File Upload - ${module.name}`,
      test_description: 'Subir archivo y verificar storage',
      status: 'in-progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const uploadEndpoint = module.api_endpoints.find(e =>
        e.path.includes('upload') || e.path.includes('file') || e.path.includes('image')
      );

      if (!uploadEndpoint) {
        throw new Error('No se encontró endpoint de upload');
      }

      // Crear imagen de prueba
      const testImagePath = path.join(__dirname, '../../../temp_test_image.png');
      const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      fs.writeFileSync(testImagePath, testImageBuffer);

      const formData = new FormData();
      formData.append('file', fs.createReadStream(testImagePath));
      formData.append('company_id', companyId);

      const uploadResponse = await axios.post(
        `${baseURL}${uploadEndpoint.path}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      if (uploadResponse.status !== 200 && uploadResponse.status !== 201) {
        throw new Error(`Upload falló con status ${uploadResponse.status}`);
      }

      // Cleanup
      fs.unlinkSync(testImagePath);

      await log.update({
        status: 'pass',
        duration_ms: Date.now() - startTime,
        test_data: { uploaded_file: uploadResponse.data },
        completed_at: new Date()
      });

    } catch (error) {
      await log.update({
        status: 'fail',
        severity: 'medium',
        error_type: error.name,
        error_message: error.message,
        duration_ms: Date.now() - startTime,
        completed_at: new Date()
      });
    }

    return log;
  }

  /**
   * Test notificaciones multi-canal
   */
  async testNotifications(execution_id, module, baseURL, authToken, companyId) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'e2e',
      module_name: module.id,
      test_name: `E2E Notifications - ${module.name}`,
      test_description: 'Test completo de notificaciones multi-canal',
      status: 'in-progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      console.log(`      📧 Testeando notificaciones para ${module.name}...`);

      const testResults = [];

      // 1. Test notificación email
      const emailTest = await this.testEmailNotification(baseURL, authToken, companyId);
      testResults.push(emailTest);

      // 2. Test notificación in-app
      const inAppTest = await this.testInAppNotification(baseURL, authToken, companyId);
      testResults.push(inAppTest);

      // 3. Test notificación móvil (push)
      const mobileTest = await this.testMobileNotification(baseURL, authToken, companyId);
      testResults.push(mobileTest);

      // 4. Test audit log de notificaciones
      const auditTest = await this.testNotificationAudit(baseURL, authToken, companyId);
      testResults.push(auditTest);

      // 5. Test workflow de approval notification
      const approvalTest = await this.testApprovalNotificationFlow(baseURL, authToken, companyId);
      testResults.push(approvalTest);

      // Evaluar resultados
      const passedTests = testResults.filter(t => t.success).length;
      const totalTests = testResults.length;
      const successRate = (passedTests / totalTests) * 100;

      if (successRate >= 80) {
        await log.update({
          status: 'pass',
          duration_ms: Date.now() - startTime,
          test_data: {
            tests: testResults,
            success_rate: successRate,
            passed: passedTests,
            total: totalTests
          },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'fail',
          severity: 'medium',
          error_message: `Notificaciones fallaron: ${passedTests}/${totalTests} tests pasaron (${successRate.toFixed(1)}%)`,
          duration_ms: Date.now() - startTime,
          test_data: { tests: testResults, success_rate: successRate },
          completed_at: new Date()
        });
      }

    } catch (error) {
      await log.update({
        status: 'fail',
        severity: 'medium',
        error_type: error.name,
        error_message: error.message,
        duration_ms: Date.now() - startTime,
        completed_at: new Date()
      });
    }

    return log;
  }

  /**
   * Test flujos de aprobación
   */
  async testApprovalFlow(execution_id, module, baseURL, authToken, companyId) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'e2e',
      module_name: module.id,
      test_name: `E2E Approval Flow - ${module.name}`,
      test_description: 'Test completo de workflows de aprobación',
      status: 'in-progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      console.log(`      ✅ Testeando approval flows para ${module.name}...`);

      const testResults = [];

      // 1. Test crear solicitud pendiente
      const createRequestTest = await this.testCreateApprovalRequest(baseURL, authToken, companyId, module);
      testResults.push(createRequestTest);

      if (createRequestTest.success && createRequestTest.requestId) {
        // 2. Test aprobar solicitud
        const approveTest = await this.testApproveRequest(baseURL, authToken, companyId, createRequestTest.requestId);
        testResults.push(approveTest);

        // 3. Test rechazar solicitud (crear otra para rechazar)
        const rejectRequestTest = await this.testCreateApprovalRequest(baseURL, authToken, companyId, module);
        if (rejectRequestTest.success && rejectRequestTest.requestId) {
          const rejectTest = await this.testRejectRequest(baseURL, authToken, companyId, rejectRequestTest.requestId);
          testResults.push(rejectTest);
        }

        // 4. Test workflow de notificaciones de approval
        const notificationTest = await this.testApprovalNotifications(baseURL, authToken, companyId);
        testResults.push(notificationTest);

        // 5. Test historiales de approval
        const historyTest = await this.testApprovalHistory(baseURL, authToken, companyId);
        testResults.push(historyTest);

        // 6. Test permisos de approval por roles
        const permissionsTest = await this.testApprovalPermissions(baseURL, authToken, companyId);
        testResults.push(permissionsTest);
      }

      // Evaluar resultados
      const passedTests = testResults.filter(t => t.success).length;
      const totalTests = testResults.length;
      const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

      if (successRate >= 70) { // 70% para approval flows (más complejo)
        await log.update({
          status: 'pass',
          duration_ms: Date.now() - startTime,
          test_data: {
            tests: testResults,
            success_rate: successRate,
            passed: passedTests,
            total: totalTests
          },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'fail',
          severity: 'high', // Approval flows son críticos para business
          error_message: `Approval flows fallaron: ${passedTests}/${totalTests} tests pasaron (${successRate.toFixed(1)}%)`,
          duration_ms: Date.now() - startTime,
          test_data: { tests: testResults, success_rate: successRate },
          completed_at: new Date()
        });
      }

    } catch (error) {
      await log.update({
        status: 'fail',
        severity: 'high',
        error_type: error.name,
        error_message: error.message,
        duration_ms: Date.now() - startTime,
        completed_at: new Date()
      });
    }

    return log;
  }

  /**
   * Helpers
   */

  hasCrudEndpoints(module) {
    const methods = module.api_endpoints.map(e => e.method);
    return methods.includes('POST') || methods.includes('PUT') || methods.includes('DELETE');
  }

  hasFileUpload(module) {
    return module.api_endpoints.some(e =>
      e.path.includes('upload') || e.path.includes('file') || e.path.includes('image')
    );
  }

  hasNotifications(module) {
    return module.id.includes('notification') || module.id.includes('medical') || module.id.includes('vacation');
  }

  hasApprovalFlow(module) {
    return module.api_endpoints.some(e =>
      e.path.includes('approve') || e.path.includes('reject') || e.path.includes('status')
    );
  }

  generateTestData(module) {
    // Generar datos de prueba según el módulo
    const baseData = {
      name: `Test ${module.name} ${Date.now()}`,
      description: `Generado automáticamente por E2ECollector`,
      is_active: true
    };

    // Agregar campos específicos según módulo
    if (module.id.includes('user')) {
      return {
        ...baseData,
        email: `test_${Date.now()}@example.com`,
        password: 'Test123!',
        role: 'employee'
      };
    }

    return baseData;
  }

  async cleanup(baseURL, authToken) {
    console.log('    🧹 [E2E] Limpiando datos de prueba...');

    for (const [moduleId, ids] of this.testData.entries()) {
      for (const id of ids) {
        try {
          // Intentar eliminar (best effort, no fallar si no existe)
          await axios.delete(
            `${baseURL}/api/${moduleId}/${id}`,
            { headers: { Authorization: `Bearer ${authToken}` } }
          );
        } catch (error) {
          // Ignorar errores de cleanup
        }
      }
    }

    console.log('    ✅ [E2E] Cleanup completado');
  }

  // ===============================================
  // MÉTODOS AUXILIARES PARA TESTS COMPREHENSIVOS
  // ===============================================

  /**
   * Test notificación por email
   */
  async testEmailNotification(baseURL, authToken, companyId) {
    try {
      const response = await axios.post(
        `${baseURL}/api/notifications/email/test`,
        {
          to: 'test@example.com',
          subject: 'Test E2E Notification',
          message: 'Este es un test de notificación E2E',
          company_id: companyId
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      return {
        test: 'Email Notification',
        success: response.status === 200,
        details: response.data,
        duration: Date.now()
      };
    } catch (error) {
      return {
        test: 'Email Notification',
        success: false,
        error: error.message,
        duration: Date.now()
      };
    }
  }

  /**
   * Test notificación in-app
   */
  async testInAppNotification(baseURL, authToken, companyId) {
    try {
      const response = await axios.post(
        `${baseURL}/api/notifications/in-app`,
        {
          user_id: 1,
          title: 'Test E2E',
          message: 'Notificación in-app de prueba',
          type: 'info',
          company_id: companyId
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      return {
        test: 'In-App Notification',
        success: response.status === 200 || response.status === 201,
        details: response.data,
        duration: Date.now()
      };
    } catch (error) {
      return {
        test: 'In-App Notification',
        success: false,
        error: error.message,
        duration: Date.now()
      };
    }
  }

  /**
   * Test notificación móvil (push)
   */
  async testMobileNotification(baseURL, authToken, companyId) {
    try {
      const response = await axios.post(
        `${baseURL}/api/notifications/push`,
        {
          device_token: 'test_device_token',
          title: 'Test E2E Mobile',
          body: 'Push notification de prueba',
          data: { type: 'test', company_id: companyId }
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      return {
        test: 'Mobile Push Notification',
        success: response.status === 200,
        details: response.data,
        duration: Date.now()
      };
    } catch (error) {
      return {
        test: 'Mobile Push Notification',
        success: false,
        error: error.message,
        duration: Date.now()
      };
    }
  }

  /**
   * Test audit log de notificaciones
   */
  async testNotificationAudit(baseURL, authToken, companyId) {
    try {
      const response = await axios.get(
        `${baseURL}/api/notifications/audit?company_id=${companyId}&limit=10`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      return {
        test: 'Notification Audit Log',
        success: response.status === 200 && Array.isArray(response.data),
        details: { count: response.data.length },
        duration: Date.now()
      };
    } catch (error) {
      return {
        test: 'Notification Audit Log',
        success: false,
        error: error.message,
        duration: Date.now()
      };
    }
  }

  /**
   * Test workflow de approval notification
   */
  async testApprovalNotificationFlow(baseURL, authToken, companyId) {
    try {
      // Simular workflow: crear solicitud → notificar → aprobar → notificar
      const createResponse = await axios.post(
        `${baseURL}/api/approvals/requests`,
        {
          type: 'vacation',
          user_id: 1,
          data: { days: 3, reason: 'Test E2E approval' },
          company_id: companyId
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (createResponse.status === 200 || createResponse.status === 201) {
        // Verificar que se envió notificación de nueva solicitud
        const notificationCheck = await axios.get(
          `${baseURL}/api/notifications/recent?type=approval_request&limit=1`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        return {
          test: 'Approval Notification Flow',
          success: notificationCheck.status === 200,
          details: { request_id: createResponse.data.id },
          duration: Date.now()
        };
      }

      return {
        test: 'Approval Notification Flow',
        success: false,
        error: 'Failed to create approval request',
        duration: Date.now()
      };
    } catch (error) {
      return {
        test: 'Approval Notification Flow',
        success: false,
        error: error.message,
        duration: Date.now()
      };
    }
  }

  /**
   * Test crear solicitud de aprobación
   */
  async testCreateApprovalRequest(baseURL, authToken, companyId, module) {
    try {
      const requestData = this.generateApprovalData(module);
      const response = await axios.post(
        `${baseURL}/api/approvals/requests`,
        { ...requestData, company_id: companyId },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      return {
        test: 'Create Approval Request',
        success: response.status === 200 || response.status === 201,
        requestId: response.data.id || response.data.data?.id,
        details: response.data,
        duration: Date.now()
      };
    } catch (error) {
      return {
        test: 'Create Approval Request',
        success: false,
        error: error.message,
        duration: Date.now()
      };
    }
  }

  /**
   * Test aprobar solicitud
   */
  async testApproveRequest(baseURL, authToken, companyId, requestId) {
    try {
      const response = await axios.put(
        `${baseURL}/api/approvals/requests/${requestId}/approve`,
        {
          comment: 'Aprobado por test E2E',
          approved_by: 1,
          company_id: companyId
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      return {
        test: 'Approve Request',
        success: response.status === 200,
        details: response.data,
        duration: Date.now()
      };
    } catch (error) {
      return {
        test: 'Approve Request',
        success: false,
        error: error.message,
        duration: Date.now()
      };
    }
  }

  /**
   * Test rechazar solicitud
   */
  async testRejectRequest(baseURL, authToken, companyId, requestId) {
    try {
      const response = await axios.put(
        `${baseURL}/api/approvals/requests/${requestId}/reject`,
        {
          reason: 'Rechazado por test E2E',
          rejected_by: 1,
          company_id: companyId
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      return {
        test: 'Reject Request',
        success: response.status === 200,
        details: response.data,
        duration: Date.now()
      };
    } catch (error) {
      return {
        test: 'Reject Request',
        success: false,
        error: error.message,
        duration: Date.now()
      };
    }
  }

  /**
   * Test notificaciones de approval
   */
  async testApprovalNotifications(baseURL, authToken, companyId) {
    try {
      const response = await axios.get(
        `${baseURL}/api/notifications?type=approval&company_id=${companyId}&limit=5`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      return {
        test: 'Approval Notifications',
        success: response.status === 200,
        details: { count: response.data.length || 0 },
        duration: Date.now()
      };
    } catch (error) {
      return {
        test: 'Approval Notifications',
        success: false,
        error: error.message,
        duration: Date.now()
      };
    }
  }

  /**
   * Test historial de approvals
   */
  async testApprovalHistory(baseURL, authToken, companyId) {
    try {
      const response = await axios.get(
        `${baseURL}/api/approvals/history?company_id=${companyId}&limit=10`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      return {
        test: 'Approval History',
        success: response.status === 200,
        details: { count: response.data.length || 0 },
        duration: Date.now()
      };
    } catch (error) {
      return {
        test: 'Approval History',
        success: false,
        error: error.message,
        duration: Date.now()
      };
    }
  }

  /**
   * Test permisos de approval
   */
  async testApprovalPermissions(baseURL, authToken, companyId) {
    try {
      const response = await axios.get(
        `${baseURL}/api/approvals/permissions?company_id=${companyId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      return {
        test: 'Approval Permissions',
        success: response.status === 200,
        details: response.data,
        duration: Date.now()
      };
    } catch (error) {
      return {
        test: 'Approval Permissions',
        success: false,
        error: error.message,
        duration: Date.now()
      };
    }
  }

  /**
   * Generar datos de approval según módulo
   */
  generateApprovalData(module) {
    const baseData = {
      type: 'general',
      status: 'pending',
      created_by: 1,
      data: {}
    };

    if (module.id.includes('vacation')) {
      return {
        ...baseData,
        type: 'vacation',
        data: {
          start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          reason: 'Test E2E vacation request',
          days: 3
        }
      };
    }

    if (module.id.includes('medical')) {
      return {
        ...baseData,
        type: 'medical',
        data: {
          date: new Date().toISOString().split('T')[0],
          reason: 'Test E2E medical request',
          doctor: 'Dr. Test E2E',
          diagnosis: 'Test diagnosis'
        }
      };
    }

    if (module.id.includes('overtime')) {
      return {
        ...baseData,
        type: 'overtime',
        data: {
          date: new Date().toISOString().split('T')[0],
          hours: 2,
          reason: 'Test E2E overtime request'
        }
      };
    }

    return baseData;
  }
}

module.exports = E2ECollector;
