const express = require('express');
const { dbManager } = require('../config/database-next-gen');
const { aiEngine } = require('../services/ai-biometric-engine');
const cron = require('node-cron');
const Bull = require('bull');

// 📊 SERVICIO DE ANALYTICS IA NEXT-GEN
class NextGenAnalyticsService {
  constructor() {
    this.app = express();
    this.analysisQueue = new Bull('analytics processing', {
      redis: { host: 'localhost', port: 6379 }
    });

    // Configuraciones de análisis
    this.emotionalPatterns = {
      normalBaseline: {
        happiness: { min: 0.3, max: 0.7 },
        neutral: { min: 0.2, max: 0.6 },
        sadness: { min: 0.0, max: 0.2 },
        anger: { min: 0.0, max: 0.1 },
        surprise: { min: 0.0, max: 0.3 },
        fear: { min: 0.0, max: 0.1 },
        disgust: { min: 0.0, max: 0.1 }
      },
      alertThresholds: {
        depression: { sadness: 0.6, happiness: 0.1 },
        anger: { anger: 0.4 },
        anxiety: { fear: 0.3, surprise: 0.5 },
        apathy: { neutral: 0.8, happiness: 0.1 }
      }
    };

    this.wellnessWeights = {
      emotional: 0.35,
      fatigue: 0.25,
      stress: 0.25,
      attendance: 0.10,
      productivity: 0.05
    };

    this.initializeMiddleware();
    this.initializeJobProcessors();
    this.initializeRoutes();
    this.initializeCronJobs();
  }

  // 🚀 MIDDLEWARE
  initializeMiddleware() {
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  // ⚙️ PROCESADORES DE COLAS
  initializeJobProcessors() {
    // Procesador de análisis individual
    this.analysisQueue.process('analyze-employee', 5, async (job) => {
      const { tenantId, userId, period } = job.data;
      return await this.performEmployeeAnalysis(tenantId, userId, period);
    });

    // Procesador de análisis grupal
    this.analysisQueue.process('analyze-group', 3, async (job) => {
      const { tenantId, companyId, departmentId, period } = job.data;
      return await this.performGroupAnalysis(tenantId, companyId, departmentId, period);
    });

    // Procesador de predicciones
    this.analysisQueue.process('generate-predictions', 2, async (job) => {
      const { tenantId, targetId, targetType, timeframe } = job.data;
      return await this.generatePredictions(tenantId, targetId, targetType, timeframe);
    });

    // Procesador de alertas inteligentes
    this.analysisQueue.process('smart-alerts', 10, async (job) => {
      const { tenantId, biometricData } = job.data;
      return await this.processSmartAlerts(tenantId, biometricData);
    });
  }

  // 🌐 RUTAS REST API
  initializeRoutes() {
    // 📊 ANÁLISIS INDIVIDUAL DE EMPLEADO
    this.app.get('/analytics/:tenantId/employee/:userId', async (req, res) => {
      try {
        const { tenantId, userId } = req.params;
        const { period = '30d', includeDetails = false } = req.query;

        const analysis = await this.getEmployeeAnalytics(tenantId, userId, period, includeDetails);

        res.json({
          success: true,
          employee: analysis.employee,
          analytics: analysis.data,
          period,
          generatedAt: new Date()
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 👥 ANÁLISIS GRUPAL (EMPRESA/DEPARTAMENTO)
    this.app.get('/analytics/:tenantId/group', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const {
          companyId,
          departmentId,
          period = '30d',
          groupBy = 'department',
          includeIndividuals = false
        } = req.query;

        const analysis = await this.getGroupAnalytics(
          tenantId,
          companyId,
          departmentId,
          period,
          groupBy,
          includeIndividuals
        );

        res.json({
          success: true,
          group: analysis.group,
          analytics: analysis.data,
          period,
          groupBy,
          generatedAt: new Date()
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 🔮 PREDICCIONES Y TENDENCIAS
    this.app.get('/analytics/:tenantId/predictions', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const {
          targetId,
          targetType = 'employee',
          timeframe = '7d',
          predictionTypes = 'wellness,risk,productivity'
        } = req.query;

        const predictions = await this.generateAdvancedPredictions(
          tenantId,
          targetId,
          targetType,
          timeframe,
          predictionTypes.split(',')
        );

        res.json({
          success: true,
          predictions,
          timeframe,
          confidence: predictions.overallConfidence,
          generatedAt: new Date()
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 🚨 ALERTAS INTELIGENTES Y PATRONES
    this.app.get('/analytics/:tenantId/alerts', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const {
          severity = 'all',
          type = 'all',
          period = '24h',
          includeResolved = false
        } = req.query;

        const alerts = await this.getIntelligentAlerts(
          tenantId,
          severity,
          type,
          period,
          includeResolved
        );

        res.json({
          success: true,
          alerts: alerts.data,
          summary: alerts.summary,
          period,
          generatedAt: new Date()
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 📈 DASHBOARD EJECUTIVO
    this.app.get('/analytics/:tenantId/executive-dashboard', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const { companyId, period = '30d' } = req.query;

        const dashboard = await this.generateExecutiveDashboard(tenantId, companyId, period);

        res.json({
          success: true,
          dashboard,
          period,
          generatedAt: new Date()
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 🧠 ANÁLISIS DE PATRONES EMOCIONALES
    this.app.get('/analytics/:tenantId/emotional-patterns', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const {
          userId,
          companyId,
          period = '30d',
          patternType = 'all'
        } = req.query;

        const patterns = await this.analyzeEmotionalPatterns(
          tenantId,
          userId,
          companyId,
          period,
          patternType
        );

        res.json({
          success: true,
          patterns,
          period,
          generatedAt: new Date()
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 📊 MÉTRICAS DE BIENESTAR
    this.app.get('/analytics/:tenantId/wellness-metrics', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const {
          scope = 'company',
          targetId,
          period = '30d',
          granularity = 'daily'
        } = req.query;

        const metrics = await this.getWellnessMetrics(
          tenantId,
          scope,
          targetId,
          period,
          granularity
        );

        res.json({
          success: true,
          metrics,
          scope,
          period,
          granularity,
          generatedAt: new Date()
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 🔄 PROCESAMIENTO MANUAL
    this.app.post('/analytics/:tenantId/process', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const {
          analysisType,
          targetId,
          targetType = 'employee',
          period = '30d',
          priority = 'normal'
        } = req.body;

        const jobOptions = {
          priority: priority === 'high' ? 1 : 5,
          delay: priority === 'low' ? 10000 : 0
        };

        let jobId;
        switch (analysisType) {
          case 'employee':
            jobId = await this.analysisQueue.add('analyze-employee', {
              tenantId,
              userId: targetId,
              period
            }, jobOptions);
            break;

          case 'group':
            jobId = await this.analysisQueue.add('analyze-group', {
              tenantId,
              companyId: targetId,
              period
            }, jobOptions);
            break;

          case 'predictions':
            jobId = await this.analysisQueue.add('generate-predictions', {
              tenantId,
              targetId,
              targetType,
              timeframe: period
            }, jobOptions);
            break;

          default:
            throw new Error(`Tipo de análisis no válido: ${analysisType}`);
        }

        res.json({
          success: true,
          jobId: jobId.id,
          message: `Análisis ${analysisType} programado`,
          estimatedCompletion: new Date(Date.now() + (priority === 'high' ? 30000 : 120000))
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 📊 HEALTH CHECK
    this.app.get('/analytics/health', (req, res) => {
      res.json({
        service: 'analytics-service',
        status: 'healthy',
        timestamp: new Date(),
        queueStats: {
          waiting: this.analysisQueue.waiting(),
          active: this.analysisQueue.active(),
          completed: this.analysisQueue.completed(),
          failed: this.analysisQueue.failed()
        }
      });
    });
  }

  // 📊 ANÁLISIS INDIVIDUAL DE EMPLEADO
  async getEmployeeAnalytics(tenantId, userId, period, includeDetails = false) {
    const connection = await dbManager.getTenantConnection(tenantId);

    // Obtener información del empleado
    const employees = await connection.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.employee_id,
             c.name as company_name, d.name as department_name,
             u.created_at as hire_date
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = :userId AND u.tenant_id = :tenantId
    `, {
      replacements: { userId, tenantId },
      type: connection.QueryTypes.SELECT
    });

    if (employees.length === 0) {
      throw new Error('Empleado no encontrado');
    }

    const employee = employees[0];

    // Obtener datos biométricos del período
    const timeFilter = this.buildTimeFilter(period);
    const biometricData = await connection.query(`
      SELECT scan_data, timestamp, wellness_score
      FROM biometric_scans
      WHERE user_id = :userId AND tenant_id = :tenantId ${timeFilter}
      ORDER BY timestamp DESC
    `, {
      replacements: { userId, tenantId },
      type: connection.QueryTypes.SELECT
    });

    // Procesar datos
    const processedData = await this.processEmployeeBiometricData(biometricData);

    // Análisis avanzado
    const analytics = {
      wellnessOverview: processedData.wellness,
      emotionalProfile: processedData.emotional,
      fatigueAnalysis: processedData.fatigue,
      stressAnalysis: processedData.stress,
      productivityCorrelation: await this.calculateProductivityCorrelation(tenantId, userId, period),
      riskAssessment: await this.calculateRiskAssessment(processedData),
      recommendations: await this.generatePersonalizedRecommendations(employee, processedData),
      trends: processedData.trends
    };

    if (includeDetails) {
      analytics.rawData = biometricData.map(d => ({
        ...JSON.parse(d.scan_data),
        timestamp: d.timestamp
      }));
    }

    return { employee, data: analytics };
  }

  // 👥 ANÁLISIS GRUPAL
  async getGroupAnalytics(tenantId, companyId, departmentId, period, groupBy, includeIndividuals) {
    const connection = await dbManager.getTenantConnection(tenantId);

    let groupFilter = '';
    let groupInfo = {};

    if (companyId) {
      groupFilter = 'AND u.company_id = :companyId';
      const companies = await connection.query(`
        SELECT company_id, name, description FROM companies WHERE company_id = :companyId
      `, {
        replacements: { companyId },
        type: connection.QueryTypes.SELECT
      });
      groupInfo = { type: 'company', ...companies[0] };
    }

    if (departmentId) {
      groupFilter += ' AND u.department_id = :departmentId';
      const departments = await connection.query(`
        SELECT id, name, description FROM departments WHERE id = :departmentId
      `, {
        replacements: { departmentId },
        type: connection.QueryTypes.SELECT
      });
      groupInfo = { type: 'department', ...departments[0] };
    }

    const timeFilter = this.buildTimeFilter(period);

    // Obtener datos agregados del grupo
    const groupData = await connection.query(`
      SELECT
        COUNT(DISTINCT bs.user_id) as total_employees,
        AVG(bs.wellness_score) as avg_wellness,
        COUNT(bs.id) as total_scans,
        AVG(EXTRACT(EPOCH FROM (bs.timestamp - LAG(bs.timestamp) OVER (PARTITION BY bs.user_id ORDER BY bs.timestamp)))) as avg_scan_interval
      FROM biometric_scans bs
      JOIN users u ON bs.user_id = u.user_id
      WHERE bs.tenant_id = :tenantId ${timeFilter} ${groupFilter}
    `, {
      replacements: { tenantId, companyId, departmentId },
      type: connection.QueryTypes.SELECT
    });

    // Análisis de distribución emocional
    const emotionalDistribution = await this.calculateGroupEmotionalDistribution(
      tenantId, companyId, departmentId, period
    );

    // Análisis de tendencias
    const trends = await this.calculateGroupTrends(
      tenantId, companyId, departmentId, period, groupBy
    );

    // Identificar empleados en riesgo
    const riskEmployees = await this.identifyRiskEmployees(
      tenantId, companyId, departmentId, period
    );

    const analytics = {
      overview: groupData[0],
      emotionalDistribution,
      trends,
      riskEmployees,
      recommendations: await this.generateGroupRecommendations(groupData[0], emotionalDistribution, riskEmployees)
    };

    if (includeIndividuals) {
      analytics.individuals = await this.getGroupIndividualAnalytics(
        tenantId, companyId, departmentId, period
      );
    }

    return { group: groupInfo, data: analytics };
  }

  // 🔮 PREDICCIONES AVANZADAS
  async generateAdvancedPredictions(tenantId, targetId, targetType, timeframe, predictionTypes) {
    const predictions = {};
    const confidence = {};

    for (const type of predictionTypes) {
      switch (type) {
        case 'wellness':
          predictions.wellness = await this.predictWellnessTrend(tenantId, targetId, targetType, timeframe);
          confidence.wellness = predictions.wellness.confidence;
          break;

        case 'risk':
          predictions.risk = await this.predictRiskFactors(tenantId, targetId, targetType, timeframe);
          confidence.risk = predictions.risk.confidence;
          break;

        case 'productivity':
          predictions.productivity = await this.predictProductivity(tenantId, targetId, targetType, timeframe);
          confidence.productivity = predictions.productivity.confidence;
          break;

        case 'emotional':
          predictions.emotional = await this.predictEmotionalTrends(tenantId, targetId, targetType, timeframe);
          confidence.emotional = predictions.emotional.confidence;
          break;
      }
    }

    const overallConfidence = Object.values(confidence).reduce((sum, conf) => sum + conf, 0) / Object.values(confidence).length;

    return {
      ...predictions,
      overallConfidence,
      confidence,
      validUntil: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 horas
    };
  }

  // 🧠 ANÁLISIS DE PATRONES EMOCIONALES
  async analyzeEmotionalPatterns(tenantId, userId, companyId, period, patternType) {
    const connection = await dbManager.getTenantConnection(tenantId);
    const timeFilter = this.buildTimeFilter(period);

    let userFilter = '';
    if (userId) {
      userFilter = 'AND bs.user_id = :userId';
    } else if (companyId) {
      userFilter = 'AND u.company_id = :companyId';
    }

    // Obtener datos emocionales
    const emotionalData = await connection.query(`
      SELECT bs.user_id, bs.scan_data, bs.timestamp,
             u.first_name, u.last_name, u.role
      FROM biometric_scans bs
      JOIN users u ON bs.user_id = u.user_id
      WHERE bs.tenant_id = :tenantId ${timeFilter} ${userFilter}
      ORDER BY bs.timestamp ASC
    `, {
      replacements: { tenantId, userId, companyId },
      type: connection.QueryTypes.SELECT
    });

    // Procesar patrones
    const patterns = {};

    if (patternType === 'all' || patternType === 'daily') {
      patterns.daily = await this.analyzeDailyEmotionalPatterns(emotionalData);
    }

    if (patternType === 'all' || patternType === 'weekly') {
      patterns.weekly = await this.analyzeWeeklyEmotionalPatterns(emotionalData);
    }

    if (patternType === 'all' || patternType === 'anomalies') {
      patterns.anomalies = await this.detectEmotionalAnomalies(emotionalData);
    }

    if (patternType === 'all' || patternType === 'correlations') {
      patterns.correlations = await this.findEmotionalCorrelations(emotionalData);
    }

    return patterns;
  }

  // 📊 MÉTRICAS DE BIENESTAR
  async getWellnessMetrics(tenantId, scope, targetId, period, granularity) {
    const connection = await dbManager.getTenantConnection(tenantId);
    const timeFilter = this.buildTimeFilter(period);

    let scopeFilter = '';
    if (scope === 'employee' && targetId) {
      scopeFilter = 'AND bs.user_id = :targetId';
    } else if (scope === 'company' && targetId) {
      scopeFilter = 'AND u.company_id = :targetId';
    } else if (scope === 'department' && targetId) {
      scopeFilter = 'AND u.department_id = :targetId';
    }

    const dateGrouping = this.buildDateGrouping(granularity);

    const metrics = await connection.query(`
      SELECT
        ${dateGrouping} as period,
        AVG(bs.wellness_score) as avg_wellness,
        MIN(bs.wellness_score) as min_wellness,
        MAX(bs.wellness_score) as max_wellness,
        COUNT(bs.id) as scan_count,
        COUNT(DISTINCT bs.user_id) as active_users,
        AVG(CASE WHEN JSON_EXTRACT(bs.scan_data, '$.fatigueLevel.score') > 70 THEN 1 ELSE 0 END) as fatigue_rate,
        AVG(CASE WHEN JSON_EXTRACT(bs.scan_data, '$.stressIndicators.score') > 70 THEN 1 ELSE 0 END) as stress_rate
      FROM biometric_scans bs
      JOIN users u ON bs.user_id = u.user_id
      WHERE bs.tenant_id = :tenantId ${timeFilter} ${scopeFilter}
      GROUP BY ${dateGrouping}
      ORDER BY period ASC
    `, {
      replacements: { tenantId, targetId },
      type: connection.QueryTypes.SELECT
    });

    // Calcular tendencias
    const trends = this.calculateMetricTrends(metrics);

    return {
      data: metrics,
      trends,
      summary: {
        totalScans: metrics.reduce((sum, m) => sum + parseInt(m.scan_count), 0),
        avgWellness: metrics.reduce((sum, m) => sum + parseFloat(m.avg_wellness), 0) / metrics.length,
        overallTrend: trends.wellness.direction
      }
    };
  }

  // 🕐 JOBS CRON PROGRAMADOS
  initializeCronJobs() {
    // Análisis diario a las 6:00 AM
    cron.schedule('0 6 * * *', async () => {
      console.log('🕕 Ejecutando análisis diario automatizado...');
      await this.runDailyAnalysis();
    });

    // Análisis semanal los lunes a las 8:00 AM
    cron.schedule('0 8 * * 1', async () => {
      console.log('📅 Ejecutando análisis semanal automatizado...');
      await this.runWeeklyAnalysis();
    });

    // Análisis de alertas cada 30 minutos
    cron.schedule('*/30 * * * *', async () => {
      console.log('🚨 Verificando alertas inteligentes...');
      await this.runSmartAlertsCheck();
    });

    // Limpieza de datos antiguos diariamente a las 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Ejecutando limpieza de datos antiguos...');
      await this.cleanupOldData();
    });
  }

  // 🧮 FUNCIONES DE UTILIDAD

  buildTimeFilter(period) {
    const timeFilters = {
      '1h': "AND timestamp >= NOW() - INTERVAL '1 hour'",
      '24h': "AND timestamp >= NOW() - INTERVAL '1 day'",
      '7d': "AND timestamp >= NOW() - INTERVAL '7 days'",
      '30d': "AND timestamp >= NOW() - INTERVAL '30 days'",
      '90d': "AND timestamp >= NOW() - INTERVAL '90 days'",
      '1y': "AND timestamp >= NOW() - INTERVAL '1 year'"
    };
    return timeFilters[period] || timeFilters['30d'];
  }

  buildDateGrouping(granularity) {
    const groupings = {
      'hourly': "DATE_TRUNC('hour', bs.timestamp)",
      'daily': "DATE_TRUNC('day', bs.timestamp)",
      'weekly': "DATE_TRUNC('week', bs.timestamp)",
      'monthly': "DATE_TRUNC('month', bs.timestamp)"
    };
    return groupings[granularity] || groupings['daily'];
  }

  // 📊 PROCESAMIENTO DE DATOS BIOMÉTRICOS
  async processEmployeeBiometricData(biometricData) {
    const processedScans = biometricData.map(scan => ({
      ...JSON.parse(scan.scan_data),
      timestamp: scan.timestamp,
      wellness_score: scan.wellness_score
    }));

    return {
      wellness: this.calculateWellnessMetrics(processedScans),
      emotional: this.calculateEmotionalMetrics(processedScans),
      fatigue: this.calculateFatigueMetrics(processedScans),
      stress: this.calculateStressMetrics(processedScans),
      trends: this.calculateTrendMetrics(processedScans)
    };
  }

  calculateWellnessMetrics(scans) {
    if (scans.length === 0) return { average: 0, trend: 'stable', variance: 0 };

    const scores = scans.map(s => s.overallWellness || s.wellness_score || 0);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Calcular tendencia (últimos 7 días vs anteriores)
    const midpoint = Math.floor(scans.length / 2);
    const recent = scores.slice(0, midpoint);
    const older = scores.slice(midpoint);

    const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
    const olderAvg = older.reduce((sum, score) => sum + score, 0) / older.length;

    let trend = 'stable';
    const diff = recentAvg - olderAvg;
    if (diff > 5) trend = 'improving';
    else if (diff < -5) trend = 'declining';

    // Calcular varianza
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;

    return {
      average: Math.round(average),
      trend,
      variance: Math.round(variance),
      min: Math.min(...scores),
      max: Math.max(...scores),
      consistency: variance < 100 ? 'high' : variance < 200 ? 'medium' : 'low'
    };
  }

  calculateEmotionalMetrics(scans) {
    if (scans.length === 0) return {};

    const emotions = ['happiness', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral'];
    const emotionalData = {};

    emotions.forEach(emotion => {
      const values = scans
        .filter(s => s.emotionalState?.basic?.[emotion] !== undefined)
        .map(s => s.emotionalState.basic[emotion]);

      if (values.length > 0) {
        emotionalData[emotion] = {
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          max: Math.max(...values),
          trend: this.calculateEmotionTrend(values)
        };
      }
    });

    // Detectar patrones anómalos
    const anomalies = this.detectEmotionalAnomaliesInData(emotionalData);

    return {
      distribution: emotionalData,
      dominantEmotion: this.getDominantEmotion(emotionalData),
      stability: this.calculateEmotionalStability(emotionalData),
      anomalies
    };
  }

  calculateFatigueMetrics(scans) {
    const fatigueScores = scans
      .filter(s => s.fatigueLevel?.score !== undefined)
      .map(s => s.fatigueLevel.score);

    if (fatigueScores.length === 0) return { average: 0, risk: 'low' };

    const average = fatigueScores.reduce((sum, score) => sum + score, 0) / fatigueScores.length;
    const highFatigueCount = fatigueScores.filter(score => score > 70).length;
    const riskPercentage = (highFatigueCount / fatigueScores.length) * 100;

    return {
      average: Math.round(average),
      risk: riskPercentage > 20 ? 'high' : riskPercentage > 10 ? 'medium' : 'low',
      highFatigueEvents: highFatigueCount,
      riskPercentage: Math.round(riskPercentage),
      trend: this.calculateTrend(fatigueScores)
    };
  }

  calculateStressMetrics(scans) {
    const stressScores = scans
      .filter(s => s.stressIndicators?.score !== undefined)
      .map(s => s.stressIndicators.score);

    if (stressScores.length === 0) return { average: 0, risk: 'low' };

    const average = stressScores.reduce((sum, score) => sum + score, 0) / stressScores.length;
    const highStressCount = stressScores.filter(score => score > 70).length;
    const riskPercentage = (highStressCount / stressScores.length) * 100;

    return {
      average: Math.round(average),
      risk: riskPercentage > 15 ? 'high' : riskPercentage > 8 ? 'medium' : 'low',
      highStressEvents: highStressCount,
      riskPercentage: Math.round(riskPercentage),
      trend: this.calculateTrend(stressScores)
    };
  }

  // 🚀 INICIAR SERVICIO
  start(port = 3003) {
    this.app.listen(port, () => {
      console.log(`📊 Analytics Service iniciado en puerto ${port}`);
    });
  }

  // 🧹 FUNCIONES DE MANTENIMIENTO
  async runDailyAnalysis() {
    // Implementar análisis diario automatizado
    console.log('Ejecutando análisis diario...');
  }

  async runWeeklyAnalysis() {
    // Implementar análisis semanal automatizado
    console.log('Ejecutando análisis semanal...');
  }

  async runSmartAlertsCheck() {
    // Implementar verificación de alertas inteligentes
    console.log('Verificando alertas inteligentes...');
  }

  async cleanupOldData() {
    // Implementar limpieza de datos antiguos
    console.log('Limpiando datos antiguos...');
  }
}

// 🌟 EXPORT SINGLETON
const analyticsService = new NextGenAnalyticsService();

module.exports = {
  NextGenAnalyticsService,
  analyticsService,

  // Funciones de utilidad para otros servicios
  analyzeEmployee: (tenantId, userId, period) => analyticsService.getEmployeeAnalytics(tenantId, userId, period),
  analyzeGroup: (tenantId, companyId, period) => analyticsService.getGroupAnalytics(tenantId, companyId, null, period),
  generatePredictions: (tenantId, targetId, targetType, timeframe) => analyticsService.generateAdvancedPredictions(tenantId, targetId, targetType, timeframe, ['wellness', 'risk'])
};