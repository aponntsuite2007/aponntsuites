/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PPE DETECTION SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Servicio de detección de EPP usando Azure Custom Vision.
 * Integra: Cámaras -> Azure CV -> BD -> Notificaciones -> Capacitaciones
 *
 * Dependencias:
 * - HSEViolationCatalogService (SSOT de violaciones)
 * - CountryRegulationService (regulaciones por país)
 * - NotificationService (alertas)
 */

const https = require('https');
const { URL } = require('url');

class PPEDetectionService {
  constructor(database, config = {}) {
    this.db = database;

    // Azure Custom Vision config
    this.azure = {
      predictionEndpoint: config.azurePredictionEndpoint || process.env.AZURE_CV_PREDICTION_ENDPOINT,
      predictionKey: config.azurePredictionKey || process.env.AZURE_CV_PREDICTION_KEY,
      projectId: config.azureProjectId || process.env.AZURE_CV_PROJECT_ID,
      publishedName: config.azurePublishedName || process.env.AZURE_CV_PUBLISHED_NAME || 'PPE-Detection'
    };

    // Servicios dependientes (se inyectan)
    this.violationCatalog = null;
    this.countryRegulation = null;
    this.notificationService = null;

    // Cache de configuraciones de zona
    this.zoneConfigCache = new Map();
    this.ZONE_CACHE_TTL = 5 * 60 * 1000;
  }

  /**
   * Inyectar servicios dependientes
   */
  setDependencies({ violationCatalog, countryRegulation, notificationService }) {
    this.violationCatalog = violationCatalog;
    this.countryRegulation = countryRegulation;
    this.notificationService = notificationService;
  }

  /**
   * Verificar si Azure está configurado
   */
  isAzureConfigured() {
    return !!(
      this.azure.predictionEndpoint &&
      this.azure.predictionKey &&
      this.azure.projectId
    );
  }

  /**
   * Detectar EPP en una imagen usando Azure Custom Vision
   * @param {Buffer|string} image - Imagen como buffer o URL
   * @param {Object} context - Contexto (companyId, branchId, zoneCode, employeeId)
   * @returns {Promise<Object>} Resultado de la detección
   */
  async detectPPE(image, context) {
    const startTime = Date.now();

    // 1. Verificar configuración Azure
    if (!this.isAzureConfigured()) {
      throw new Error('Azure Custom Vision no está configurado. Revisar variables de entorno.');
    }

    // 2. Obtener configuración de zona
    const zoneConfig = await this.getZoneConfig(context.companyId, context.branchId, context.zoneCode);
    if (!zoneConfig) {
      throw new Error(`Zona no configurada: ${context.zoneCode}`);
    }

    // 3. Obtener mapeo de tags IA -> códigos de violación
    const aiTags = await this.violationCatalog.getAIModelTags();

    // 4. Llamar a Azure Custom Vision
    const predictions = await this.callAzureCustomVision(image);

    // 5. Procesar predicciones
    const result = this.processPredictions(predictions, zoneConfig, aiTags);

    // 6. Determinar modo de alerta según regulación
    const alertMode = await this.countryRegulation.determineAlertMode(
      context.employeeId,
      context.branchId
    );

    // 7. Guardar detección en BD
    const detection = await this.saveDetection({
      ...context,
      ...result,
      alertMode: alertMode.mode,
      processingTime: Date.now() - startTime
    });

    // 8. Procesar alertas y acciones si hay violaciones
    if (result.hasViolations) {
      await this.processViolation(detection, context, alertMode);
    }

    return {
      success: true,
      detection,
      predictions: result,
      alertMode,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Llamar a Azure Custom Vision API
   */
  async callAzureCustomVision(image) {
    return new Promise((resolve, reject) => {
      const isUrl = typeof image === 'string' && image.startsWith('http');

      const endpoint = new URL(
        `/customvision/v3.0/Prediction/${this.azure.projectId}/${isUrl ? 'classify' : 'detect'}/iterations/${this.azure.publishedName}/${isUrl ? 'url' : 'image'}`,
        this.azure.predictionEndpoint
      );

      const options = {
        hostname: endpoint.hostname,
        path: endpoint.pathname + endpoint.search,
        method: 'POST',
        headers: {
          'Prediction-Key': this.azure.predictionKey,
          'Content-Type': isUrl ? 'application/json' : 'application/octet-stream'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Error parseando respuesta de Azure'));
            }
          } else {
            reject(new Error(`Azure CV error: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Timeout llamando a Azure Custom Vision'));
      });

      if (isUrl) {
        req.write(JSON.stringify({ url: image }));
      } else {
        req.write(image);
      }

      req.end();
    });
  }

  /**
   * Procesar predicciones de Azure
   */
  processPredictions(azureResponse, zoneConfig, aiTags) {
    const predictions = azureResponse.predictions || [];
    const requiredPPE = zoneConfig.required_ppe_codes || [];
    const minConfidence = zoneConfig.alert_config?.confidence_min || 0.70;

    const detectedPPE = {};
    const confidenceScores = {};

    // Procesar cada predicción
    for (const pred of predictions) {
      const tagInfo = aiTags[pred.tagName];
      if (tagInfo && pred.probability >= minConfidence) {
        detectedPPE[tagInfo.code] = true;
        confidenceScores[tagInfo.code] = pred.probability;
      }
    }

    // Determinar EPP faltantes
    const missingPPE = requiredPPE.filter(code => !detectedPPE[code]);

    // Calcular confianza promedio
    const scores = Object.values(confidenceScores);
    const confidenceAvg = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    return {
      detectedPPE,
      confidenceScores,
      missingPPE,
      confidenceAvg: Math.round(confidenceAvg * 100) / 100,
      hasViolations: missingPPE.length > 0,
      requiredPPE,
      totalPredictions: predictions.length
    };
  }

  /**
   * Guardar detección en BD
   */
  async saveDetection(data) {
    const query = `
      INSERT INTO hse_ppe_detections (
        company_id, branch_id, zone_config_id,
        detection_timestamp, camera_id, zone_name,
        detected_ppe, missing_ppe, confidence_scores, confidence_avg,
        employee_id, is_anonymous, alert_mode,
        image_url, status, processing_time_ms
      ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'NEW', $14)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      data.companyId,
      data.branchId,
      data.zoneConfigId,
      data.cameraId,
      data.zoneName,
      JSON.stringify(data.detectedPPE),
      data.missingPPE,
      JSON.stringify(data.confidenceScores),
      data.confidenceAvg,
      data.alertMode === 'INDIVIDUAL' ? data.employeeId : null,
      data.alertMode !== 'INDIVIDUAL',
      data.alertMode,
      data.imageUrl,
      data.processingTime
    ]);

    return result.rows[0];
  }

  /**
   * Procesar violación detectada
   */
  async processViolation(detection, context, alertMode) {
    // 1. Enviar notificación según modo de alerta
    if (this.notificationService) {
      await this.sendViolationAlert(detection, context, alertMode);
    }

    // 2. Verificar si requiere capacitación (umbral alcanzado)
    const threshold = await this.checkThresholds(context.employeeId, context.companyId);

    if (threshold.requiresTraining && alertMode.mode === 'INDIVIDUAL') {
      await this.assignTraining(detection, context);
    }

    if (threshold.requiresSanction && alertMode.mode === 'INDIVIDUAL') {
      await this.createSanctionRequest(detection, context);
    }

    // 3. Actualizar estadísticas diarias
    await this.updateDailyStats(context.companyId, context.branchId, detection.zone_name);
  }

  /**
   * Enviar alerta de violación
   */
  async sendViolationAlert(detection, context, alertMode) {
    const violations = await this.violationCatalog.getByCodes(detection.missing_ppe);
    const violationNames = violations.map(v => v.name).join(', ');

    let notification;

    if (alertMode.mode === 'INDIVIDUAL') {
      // Alerta individual al empleado
      notification = {
        type: 'EPP_VIOLATION',
        priority: 'HIGH',
        recipientId: context.employeeId,
        title: 'Incumplimiento de EPP Detectado',
        message: `Se detectó falta de: ${violationNames} en zona ${detection.zone_name}`,
        data: {
          detectionId: detection.id,
          missingPPE: detection.missing_ppe
        }
      };
    } else if (alertMode.mode === 'ANONYMOUS') {
      // Alerta al responsable HSE (anónima)
      notification = {
        type: 'EPP_ZONE_ALERT',
        priority: 'MEDIUM',
        recipientRole: 'HSE_RESPONSIBLE',
        companyId: context.companyId,
        title: 'Incumplimiento de EPP en Zona',
        message: `Se detectó incumplimiento de EPP en zona ${detection.zone_name}: ${violationNames}`,
        data: {
          detectionId: detection.id,
          zoneName: detection.zone_name,
          missingPPE: detection.missing_ppe,
          isAnonymous: true
        }
      };
    }
    // AGGREGATE_ONLY no genera alertas individuales

    if (notification && this.notificationService) {
      await this.notificationService.send(notification);

      // Actualizar detección con ID de notificación
      await this.db.query(
        'UPDATE hse_ppe_detections SET notification_sent = true, status = $1 WHERE id = $2',
        ['NOTIFIED', detection.id]
      );
    }
  }

  /**
   * Verificar umbrales de escalamiento
   */
  async checkThresholds(employeeId, companyId) {
    if (!employeeId) {
      return { requiresTraining: false, requiresSanction: false };
    }

    // Obtener configuración de umbrales de la empresa
    const configQuery = `
      SELECT alert_config
      FROM hse_zone_configurations
      WHERE company_id = $1 AND is_active = true
      LIMIT 1
    `;
    const configResult = await this.db.query(configQuery, [companyId]);
    const config = configResult.rows[0]?.alert_config || {
      threshold_training: 3,
      threshold_sanction: 5,
      period_days: 30
    };

    // Contar violaciones del empleado en el período
    const countQuery = `
      SELECT COUNT(*) as violation_count
      FROM hse_ppe_detections
      WHERE employee_id = $1
        AND array_length(missing_ppe, 1) > 0
        AND detection_timestamp >= NOW() - ($2 || ' days')::INTERVAL
    `;
    const countResult = await this.db.query(countQuery, [employeeId, config.period_days]);
    const violationCount = parseInt(countResult.rows[0]?.violation_count || 0);

    return {
      violationCount,
      periodDays: config.period_days,
      requiresTraining: violationCount >= config.threshold_training,
      requiresSanction: violationCount >= config.threshold_sanction,
      trainingThreshold: config.threshold_training,
      sanctionThreshold: config.threshold_sanction
    };
  }

  /**
   * Asignar capacitación obligatoria
   */
  async assignTraining(detection, context) {
    // Obtener template de capacitación según violación
    const violations = await this.violationCatalog.getByCodes(detection.missing_ppe);
    const trainingTemplateId = violations.find(v => v.default_training_template_id)?.default_training_template_id;

    if (!trainingTemplateId) {
      console.log('[HSE] No hay template de capacitación configurado para estas violaciones');
      return;
    }

    // TODO: Integrar con training-management para crear inscripción
    // Por ahora solo marcamos la detección
    await this.db.query(
      'UPDATE hse_ppe_detections SET training_assigned = true WHERE id = $1',
      [detection.id]
    );

    console.log(`[HSE] Capacitación asignada para empleado ${context.employeeId}`);
  }

  /**
   * Crear solicitud de sanción
   */
  async createSanctionRequest(detection, context) {
    // TODO: Integrar con sanctions-management
    await this.db.query(
      'UPDATE hse_ppe_detections SET sanction_created = true WHERE id = $1',
      [detection.id]
    );

    console.log(`[HSE] Solicitud de sanción creada para empleado ${context.employeeId}`);
  }

  /**
   * Actualizar estadísticas diarias
   */
  async updateDailyStats(companyId, branchId, zoneName) {
    const query = `SELECT update_daily_ppe_stats($1, $2, $3, CURRENT_DATE)`;
    await this.db.query(query, [companyId, branchId, zoneName]);
  }

  /**
   * Obtener configuración de zona (con cache)
   */
  async getZoneConfig(companyId, branchId, zoneCode) {
    const cacheKey = `${companyId}-${branchId}-${zoneCode}`;
    const cached = this.zoneConfigCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const query = `
      SELECT *
      FROM hse_zone_configurations
      WHERE company_id = $1
        AND (branch_id = $2 OR branch_id IS NULL)
        AND zone_code = $3
        AND is_active = true
      ORDER BY branch_id DESC NULLS LAST
      LIMIT 1
    `;
    const result = await this.db.query(query, [companyId, branchId, zoneCode]);

    if (result.rows.length === 0) {
      return null;
    }

    const config = result.rows[0];
    this.zoneConfigCache.set(cacheKey, {
      data: config,
      expiry: Date.now() + this.ZONE_CACHE_TTL
    });

    return config;
  }

  /**
   * Obtener historial de detecciones
   */
  async getDetectionHistory(filters = {}) {
    const {
      companyId,
      branchId,
      employeeId,
      zoneName,
      startDate,
      endDate,
      hasViolations,
      status,
      limit = 100,
      offset = 0
    } = filters;

    let whereClause = ['1=1'];
    const params = [];
    let paramIndex = 1;

    if (companyId) {
      whereClause.push(`company_id = $${paramIndex++}`);
      params.push(companyId);
    }
    if (branchId) {
      whereClause.push(`branch_id = $${paramIndex++}`);
      params.push(branchId);
    }
    if (employeeId) {
      whereClause.push(`employee_id = $${paramIndex++}`);
      params.push(employeeId);
    }
    if (zoneName) {
      whereClause.push(`zone_name = $${paramIndex++}`);
      params.push(zoneName);
    }
    if (startDate) {
      whereClause.push(`detection_timestamp >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      whereClause.push(`detection_timestamp <= $${paramIndex++}`);
      params.push(endDate);
    }
    if (hasViolations !== undefined) {
      if (hasViolations) {
        whereClause.push(`array_length(missing_ppe, 1) > 0`);
      } else {
        whereClause.push(`(missing_ppe IS NULL OR array_length(missing_ppe, 1) = 0)`);
      }
    }
    if (status) {
      whereClause.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    params.push(limit, offset);

    const query = `
      SELECT d.*, e.first_name, e.last_name
      FROM hse_ppe_detections d
      LEFT JOIN employees e ON d.employee_id = e.id
      WHERE ${whereClause.join(' AND ')}
      ORDER BY detection_timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Obtener estadísticas de EPP
   */
  async getStatistics(companyId, filters = {}) {
    const { branchId, startDate, endDate } = filters;

    let whereClause = ['company_id = $1'];
    const params = [companyId];
    let paramIndex = 2;

    if (branchId) {
      whereClause.push(`branch_id = $${paramIndex++}`);
      params.push(branchId);
    }
    if (startDate) {
      whereClause.push(`stat_date >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      whereClause.push(`stat_date <= $${paramIndex++}`);
      params.push(endDate);
    }

    const query = `
      SELECT
        SUM(total_checks) as total_checks,
        SUM(compliant_count) as compliant_count,
        SUM(violation_count) as violation_count,
        ROUND(AVG(compliance_rate), 2) as avg_compliance_rate,
        MIN(stat_date) as period_start,
        MAX(stat_date) as period_end
      FROM hse_ppe_stats
      WHERE ${whereClause.join(' AND ')}
    `;

    const result = await this.db.query(query, params);
    return result.rows[0];
  }
}

module.exports = PPEDetectionService;
