/**
 * MEDICAL WORKFLOW COLLECTOR - Prueba flujos médicos completos
 *
 * - Solicitudes de certificados médicos
 * - Aprobación/rechazo de certificados
 * - Validación de fechas y períodos
 * - Control de ausencias justificadas
 * - Notificaciones a RRHH
 * - Estadísticas médicas
 * - Historial médico del empleado
 * - Validación de documentación adjunta
 * - Workflow de extensión de certificados
 * - Integración con asistencias
 *
 * @version 1.0.0
 */

const axios = require('axios');

class MedicalWorkflowCollector {
  constructor(database, systemRegistry) {
    this.database = database;
    this.registry = systemRegistry;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:9998';
  }

  async collect(execution_id, config) {
    console.log('  🏥 [MEDICAL] Iniciando pruebas de flujos médicos...');

    const results = [];
    const token = await this._generateTestToken(config.company_id);

    // Test 1: Crear solicitud de certificado médico
    results.push(await this._testCreateMedicalCertificate(execution_id, token, config.company_id));

    // Test 2: Listar certificados médicos
    results.push(await this._testListMedicalCertificates(execution_id, token));

    // Test 3: Aprobar certificado médico
    results.push(await this._testApproveMedicalCertificate(execution_id, token, config.company_id));

    // Test 4: Rechazar certificado médico
    results.push(await this._testRejectMedicalCertificate(execution_id, token, config.company_id));

    // Test 5: Validar fechas y períodos
    results.push(await this._testDateValidation(execution_id, token, config.company_id));

    // Test 6: Adjuntar documentación
    results.push(await this._testAttachDocumentation(execution_id, token, config.company_id));

    // Test 7: Historial médico del empleado
    results.push(await this._testEmployeeMedicalHistory(execution_id, token, config.company_id));

    // Test 8: Estadísticas médicas
    results.push(await this._testMedicalStatistics(execution_id, token));

    // Test 9: Extensión de certificado
    results.push(await this._testExtendCertificate(execution_id, token, config.company_id));

    // Test 10: Integración con asistencias
    results.push(await this._testAttendanceIntegration(execution_id, token, config.company_id));

    // Test 11: Notificaciones a RRHH
    results.push(await this._testHRNotifications(execution_id, token, config.company_id));

    // Test 12: Validación de superposición de certificados
    results.push(await this._testCertificateOverlap(execution_id, token, config.company_id));

    console.log(`  ✅ [MEDICAL] Completados ${results.length} tests`);
    return results;
  }

  async _testCreateMedicalCertificate(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'medical_workflow',
      module_name: 'medical',
      test_name: 'Crear certificado médico',
      test_description: 'Prueba creación de solicitud de certificado médico',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 3); // 3 días de reposo

      const response = await axios.post(
        `${this.baseUrl}/api/medical/certificates`,
        {
          employee_id: 1, // Usuario de test
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          diagnosis: 'Gripe estacional - TEST',
          doctor_name: 'Dr. Test Auditor',
          doctor_license: 'MP 12345',
          certificate_type: 'reposo',
          notes: 'Certificado de prueba generado por auditor'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 201 || response.status === 200) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: { certificate_id: response.data.id },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: response.status,
          warning_message: `Status inesperado: ${response.status}`,
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'high',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testListMedicalCertificates(execution_id, token) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'medical_workflow',
      module_name: 'medical',
      test_name: 'Listar certificados médicos',
      test_description: 'Prueba listado de certificados con filtros',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/medical/certificates?status=pending&limit=10`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200 && Array.isArray(response.data)) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: { count: response.data.length },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'failed',
          response_time_ms: duration,
          response_status: response.status,
          error_message: 'Response no es un array',
          severity: 'medium',
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'medium',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testApproveMedicalCertificate(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'medical_workflow',
      module_name: 'medical',
      test_name: 'Aprobar certificado médico',
      test_description: 'Prueba aprobación de certificado por RRHH',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      // Primero crear un certificado
      const createResponse = await axios.post(
        `${this.baseUrl}/api/medical/certificates`,
        {
          employee_id: 1,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          diagnosis: 'Test para aprobación',
          doctor_name: 'Dr. Test',
          doctor_license: 'MP 99999',
          certificate_type: 'reposo'
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const certificateId = createResponse.data.id;

      // Aprobar certificado
      const response = await axios.patch(
        `${this.baseUrl}/api/medical/certificates/${certificateId}/approve`,
        {
          approved_by: 'Auditor Automático',
          hr_notes: 'Aprobado automáticamente en auditoría'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: { certificate_id: certificateId, approved: true },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: response.status,
          warning_message: `Status inesperado: ${response.status}`,
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'high',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testRejectMedicalCertificate(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'medical_workflow',
      module_name: 'medical',
      test_name: 'Rechazar certificado médico',
      test_description: 'Prueba rechazo de certificado con razón',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      // Crear certificado para rechazar
      const createResponse = await axios.post(
        `${this.baseUrl}/api/medical/certificates`,
        {
          employee_id: 1,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          diagnosis: 'Test para rechazo',
          doctor_name: 'Dr. Test',
          doctor_license: 'MP 88888',
          certificate_type: 'reposo'
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const certificateId = createResponse.data.id;

      // Rechazar certificado
      const response = await axios.patch(
        `${this.baseUrl}/api/medical/certificates/${certificateId}/reject`,
        {
          rejected_by: 'Auditor Automático',
          rejection_reason: 'Documentación incompleta (test)',
          hr_notes: 'Rechazado automáticamente en auditoría'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: { certificate_id: certificateId, rejected: true },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: response.status,
          warning_message: `Status inesperado: ${response.status}`,
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'medium',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testDateValidation(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'medical_workflow',
      module_name: 'medical',
      test_name: 'Validación de fechas',
      test_description: 'Prueba validación de fechas inválidas (fecha fin antes de inicio)',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() - 1); // Fecha fin ANTES de inicio (inválido)

      const response = await axios.post(
        `${this.baseUrl}/api/medical/certificates`,
        {
          employee_id: 1,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          diagnosis: 'Test validación fechas',
          doctor_name: 'Dr. Test',
          doctor_license: 'MP 77777',
          certificate_type: 'reposo'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      // Debería FALLAR (400 Bad Request) por fechas inválidas
      if (response.status === 400 || response.status === 422) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: { validation_working: true },
          completed_at: new Date()
        });
      } else if (response.status === 201 || response.status === 200) {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: response.status,
          warning_message: 'Sistema aceptó fechas inválidas (debería rechazar)',
          severity: 'medium',
          completed_at: new Date()
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      // Si error es 400/422, es el comportamiento ESPERADO
      if (error.response && (error.response.status === 400 || error.response.status === 422)) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: error.response.status,
          metadata: { validation_working: true, error_caught: true },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'failed',
          response_time_ms: duration,
          error_type: error.code || 'UNKNOWN',
          error_message: error.message,
          error_stack: error.stack,
          severity: 'low',
          completed_at: new Date()
        });
      }
    }

    return log;
  }

  async _testAttachDocumentation(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'medical_workflow',
      module_name: 'medical',
      test_name: 'Adjuntar documentación',
      test_description: 'Prueba adjuntar archivo al certificado médico',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      // Crear certificado primero
      const createResponse = await axios.post(
        `${this.baseUrl}/api/medical/certificates`,
        {
          employee_id: 1,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          diagnosis: 'Test adjuntar doc',
          doctor_name: 'Dr. Test',
          doctor_license: 'MP 66666',
          certificate_type: 'reposo'
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const certificateId = createResponse.data.id;

      // Adjuntar documentación (simulado con metadata)
      const response = await axios.post(
        `${this.baseUrl}/api/medical/certificates/${certificateId}/attachments`,
        {
          file_name: 'certificado-test.pdf',
          file_type: 'application/pdf',
          file_size: 102400,
          file_url: '/uploads/test-certificate.pdf', // Simulado
          description: 'Certificado médico escaneado - TEST'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 201 || response.status === 200) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: { certificate_id: certificateId, attachment_added: true },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: response.status,
          warning_message: `Status inesperado: ${response.status}`,
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'medium',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testEmployeeMedicalHistory(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'medical_workflow',
      module_name: 'medical',
      test_name: 'Historial médico empleado',
      test_description: 'Prueba obtener historial médico completo de empleado',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const employeeId = 1;
      const response = await axios.get(
        `${this.baseUrl}/api/medical/employees/${employeeId}/history?include_approved=true&include_rejected=true`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200 && response.data) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: {
            employee_id: employeeId,
            history_count: response.data.length || 0
          },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'failed',
          response_time_ms: duration,
          response_status: response.status,
          error_message: 'Response inválido para historial médico',
          severity: 'medium',
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'medium',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testMedicalStatistics(execution_id, token) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'medical_workflow',
      module_name: 'medical',
      test_name: 'Estadísticas médicas',
      test_description: 'Prueba endpoint de estadísticas y métricas médicas',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/medical/statistics?period=month`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200 && response.data) {
        const hasStats = response.data.total_certificates !== undefined;

        await log.update({
          status: hasStats ? 'passed' : 'warning',
          response_time_ms: duration,
          response_status: response.status,
          metadata: response.data,
          warning_message: hasStats ? null : 'Estadísticas incompletas',
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'failed',
          response_time_ms: duration,
          response_status: response.status,
          error_message: 'Response inválido de estadísticas',
          severity: 'low',
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'low',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testExtendCertificate(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'medical_workflow',
      module_name: 'medical',
      test_name: 'Extensión de certificado',
      test_description: 'Prueba extensión de período de reposo',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      // Crear certificado original
      const createResponse = await axios.post(
        `${this.baseUrl}/api/medical/certificates`,
        {
          employee_id: 1,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
          diagnosis: 'Test para extensión',
          doctor_name: 'Dr. Test',
          doctor_license: 'MP 55555',
          certificate_type: 'reposo'
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const certificateId = createResponse.data.id;

      // Extender certificado
      const newEndDate = new Date(Date.now() + 5 * 86400000); // +5 días
      const response = await axios.patch(
        `${this.baseUrl}/api/medical/certificates/${certificateId}/extend`,
        {
          new_end_date: newEndDate.toISOString().split('T')[0],
          extension_reason: 'Complicaciones (test)',
          doctor_notes: 'Se extiende reposo por auditoría'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: { certificate_id: certificateId, extended: true },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: response.status,
          warning_message: `Status inesperado: ${response.status}`,
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'medium',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testAttendanceIntegration(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'medical_workflow',
      module_name: 'medical',
      test_name: 'Integración con asistencias',
      test_description: 'Prueba que certificado médico justifica ausencias',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const employeeId = 1;
      const date = new Date().toISOString().split('T')[0];

      // Verificar si la ausencia está justificada por certificado médico
      const response = await axios.get(
        `${this.baseUrl}/api/medical/attendance-justification?employee_id=${employeeId}&date=${date}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: {
            employee_id: employeeId,
            date,
            justified: response.data.justified || false
          },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: response.status,
          warning_message: `Status inesperado: ${response.status}`,
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'high',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testHRNotifications(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'medical_workflow',
      module_name: 'medical',
      test_name: 'Notificaciones a RRHH',
      test_description: 'Prueba que RRHH recibe notificación de nuevo certificado',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      // Crear certificado (debería generar notificación automática)
      const createResponse = await axios.post(
        `${this.baseUrl}/api/medical/certificates`,
        {
          employee_id: 1,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          diagnosis: 'Test notificaciones RRHH',
          doctor_name: 'Dr. Test',
          doctor_license: 'MP 44444',
          certificate_type: 'reposo'
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const certificateId = createResponse.data.id;

      // Verificar que se generó notificación
      const response = await axios.get(
        `${this.baseUrl}/api/v1/enterprise/notifications?related_to=certificate&related_id=${certificateId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      if (response.status === 200) {
        const notificationSent = Array.isArray(response.data) && response.data.length > 0;

        await log.update({
          status: notificationSent ? 'passed' : 'warning',
          response_time_ms: duration,
          response_status: response.status,
          metadata: {
            certificate_id: certificateId,
            notification_sent: notificationSent
          },
          warning_message: notificationSent ? null : 'No se generó notificación automática',
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'failed',
          response_time_ms: duration,
          response_status: response.status,
          error_message: 'Error verificando notificaciones',
          severity: 'medium',
          completed_at: new Date()
        });
      }
    } catch (error) {
      await log.update({
        status: 'failed',
        response_time_ms: Date.now() - startTime,
        error_type: error.code || 'UNKNOWN',
        error_message: error.message,
        error_stack: error.stack,
        severity: 'medium',
        completed_at: new Date()
      });
    }

    return log;
  }

  async _testCertificateOverlap(execution_id, token, company_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'medical_workflow',
      module_name: 'medical',
      test_name: 'Validación de superposición',
      test_description: 'Prueba detección de certificados superpuestos en fechas',
      status: 'in_progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 3);

      // Crear primer certificado
      await axios.post(
        `${this.baseUrl}/api/medical/certificates`,
        {
          employee_id: 1,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          diagnosis: 'Certificado 1',
          doctor_name: 'Dr. Test',
          doctor_license: 'MP 33333',
          certificate_type: 'reposo'
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // Intentar crear segundo certificado superpuesto (debería fallar o advertir)
      const overlapStart = new Date(startDate);
      overlapStart.setDate(overlapStart.getDate() + 1); // Dentro del rango del primero
      const overlapEnd = new Date(overlapStart);
      overlapEnd.setDate(overlapEnd.getDate() + 2);

      const response = await axios.post(
        `${this.baseUrl}/api/medical/certificates`,
        {
          employee_id: 1,
          start_date: overlapStart.toISOString().split('T')[0],
          end_date: overlapEnd.toISOString().split('T')[0],
          diagnosis: 'Certificado 2 superpuesto',
          doctor_name: 'Dr. Test',
          doctor_license: 'MP 33333',
          certificate_type: 'reposo'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      // Debería rechazar (409 Conflict) o advertir
      if (response.status === 409 || response.status === 422) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: response.status,
          metadata: { overlap_detected: true },
          completed_at: new Date()
        });
      } else if (response.status === 201 || response.status === 200) {
        await log.update({
          status: 'warning',
          response_time_ms: duration,
          response_status: response.status,
          warning_message: 'Sistema no detectó superposición de certificados',
          severity: 'medium',
          completed_at: new Date()
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      // Si error es 409/422, es comportamiento ESPERADO
      if (error.response && (error.response.status === 409 || error.response.status === 422)) {
        await log.update({
          status: 'passed',
          response_time_ms: duration,
          response_status: error.response.status,
          metadata: { overlap_detected: true, error_caught: true },
          completed_at: new Date()
        });
      } else {
        await log.update({
          status: 'failed',
          response_time_ms: duration,
          error_type: error.code || 'UNKNOWN',
          error_message: error.message,
          error_stack: error.stack,
          severity: 'low',
          completed_at: new Date()
        });
      }
    }

    return log;
  }

  async _generateTestToken(company_id) {
    try {
      const { User } = this.database;

      const testUser = await User.findOne({
        where: { company_id, role: 'admin' }
      });

      if (!testUser) {
        console.warn('  ⚠️  No se encontró usuario admin, usando token de prueba genérico');
        return 'test-token-medical-collector';
      }

      return `test-token-${testUser.id}`;

    } catch (error) {
      console.error('  ❌ Error generando token de prueba:', error.message);
      return 'test-token-fallback';
    }
  }
}

module.exports = MedicalWorkflowCollector;
