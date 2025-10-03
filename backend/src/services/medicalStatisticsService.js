const { Op } = require('sequelize');
const MedicalCertificate = require('../models/MedicalCertificate');
const MedicalHistory = require('../models/MedicalHistory');
const MedicalStatistics = require('../models/MedicalStatistics');
const EmployeeMedicalRecord = require('../models/EmployeeMedicalRecord');
const MedicalStudyRequest = require('../models/MedicalStudyRequest');
const User = require('../models/User');

class MedicalStatisticsService {
  
  async calculateEmployeeStatistics(userId, options = {}) {
    const {
      periodType = 'yearly',
      periodStart = new Date(new Date().getFullYear(), 0, 1),
      periodEnd = new Date(new Date().getFullYear(), 11, 31),
      companyId = null
    } = options;

    try {
      // Obtener certificados médicos del período
      const certificates = await MedicalCertificate.findAll({
        where: {
          userId,
          createdAt: {
            [Op.between]: [periodStart, periodEnd]
          },
          ...(companyId && { companyId })
        },
        include: [
          {
            model: User,
            as: 'employee',
            attributes: ['firstName', 'lastName', 'companyId']
          }
        ]
      });

      // Obtener historial médico del período
      const medicalHistory = await MedicalHistory.findAll({
        where: {
          userId,
          episodeDate: {
            [Op.between]: [periodStart, periodEnd]
          }
        }
      });

      // Calcular estadísticas básicas
      const totalAbsences = certificates.length;
      const totalDaysAbsent = certificates.reduce((sum, cert) => sum + cert.requestedDays, 0);
      const averageAbsenceDuration = totalAbsences > 0 ? totalDaysAbsent / totalAbsences : 0;

      // Estadísticas por tipo de episodio
      const episodesByType = this._groupByField(medicalHistory, 'episodeType');
      
      // Estadísticas por diagnóstico
      const diagnosisStatistics = this._groupByField([...certificates, ...medicalHistory], 'primaryDiagnosis');
      
      // Estadísticas por severidad
      const severityDistribution = this._groupByField(medicalHistory, 'severity');
      
      // Casos relacionados con trabajo
      const workRelatedCases = certificates.filter(cert => cert.isWorkRelated).length;
      const accidentCases = medicalHistory.filter(h => h.episodeType === 'accident').length;
      const occupationalDiseases = medicalHistory.filter(h => h.workRelated).length;

      // Medicación estadísticas
      const medicationStatistics = this._calculateMedicationStatistics(medicalHistory);

      // Condiciones recurrentes
      const recurringConditions = this._identifyRecurringConditions(medicalHistory);

      // Seguimiento médico
      const followUpRequired = medicalHistory.filter(h => h.followUpRequired).length;
      const followUpCompleted = medicalHistory.filter(h => h.followUpCompleted).length;

      // Estudios médicos
      const studyRequests = await MedicalStudyRequest.findAll({
        where: {
          userId,
          createdAt: {
            [Op.between]: [periodStart, periodEnd]
          }
        }
      });

      const studiesRequested = studyRequests.length;
      const studiesCompleted = studyRequests.filter(sr => sr.status === 'completed').length;

      // Desglose mensual
      const monthlyBreakdown = this._calculateMonthlyBreakdown(certificates, medicalHistory, periodStart, periodEnd);

      // Indicadores de riesgo
      const riskIndicators = this._calculateRiskIndicators(certificates, medicalHistory, userId);

      // Crear o actualizar estadísticas
      const statisticsData = {
        userId,
        companyId,
        periodType,
        periodStart,
        periodEnd,
        totalAbsences,
        totalDaysAbsent,
        averageAbsenceDuration,
        episodesByType,
        diagnosisStatistics,
        severityDistribution,
        workRelatedCases,
        accidentCases,
        occupationalDiseases,
        medicationStatistics,
        recurringConditions,
        followUpRequired,
        followUpCompleted,
        studiesRequested,
        studiesCompleted,
        monthlyBreakdown,
        riskIndicators,
        lastCalculated: new Date()
      };

      const [statistics, created] = await MedicalStatistics.upsert(statisticsData, {
        where: {
          userId,
          periodType,
          periodStart,
          periodEnd
        }
      });

      return statistics;

    } catch (error) {
      console.error('Error calculating employee statistics:', error);
      throw error;
    }
  }

  async getCompanyStatistics(companyId, options = {}) {
    const {
      periodType = 'yearly',
      periodStart = new Date(new Date().getFullYear(), 0, 1),
      periodEnd = new Date(new Date().getFullYear(), 11, 31)
    } = options;

    try {
      // Obtener todas las estadísticas de empleados de la empresa
      const employeeStats = await MedicalStatistics.findAll({
        where: {
          companyId,
          periodType,
          periodStart,
          periodEnd
        },
        include: [
          {
            model: User,
            as: 'employee',
            attributes: ['firstName', 'lastName', 'dni', 'role']
          }
        ]
      });

      // Agregar estadísticas
      const aggregated = {
        totalEmployees: employeeStats.length,
        totalAbsences: employeeStats.reduce((sum, stat) => sum + stat.totalAbsences, 0),
        totalDaysAbsent: employeeStats.reduce((sum, stat) => sum + stat.totalDaysAbsent, 0),
        averageAbsenceDuration: 0,
        workRelatedCases: employeeStats.reduce((sum, stat) => sum + stat.workRelatedCases, 0),
        accidentCases: employeeStats.reduce((sum, stat) => sum + stat.accidentCases, 0),
        occupationalDiseases: employeeStats.reduce((sum, stat) => sum + stat.occupationalDiseases, 0),
        highRiskEmployees: employeeStats.filter(stat => 
          Object.values(stat.riskIndicators || {}).some(indicator => indicator === true)
        ).length,
        employeeBreakdown: employeeStats.map(stat => ({
          userId: stat.userId,
          employeeName: stat.employee ? `${stat.employee.firstName} ${stat.employee.lastName}` : 'N/A',
          totalAbsences: stat.totalAbsences,
          totalDaysAbsent: stat.totalDaysAbsent,
          riskLevel: this._calculateEmployeeRiskLevel(stat.riskIndicators || {})
        })),
        diagnosisDistribution: this._mergeStatistics(employeeStats, 'diagnosisStatistics'),
        episodeTypeDistribution: this._mergeStatistics(employeeStats, 'episodesByType'),
        monthlyTrends: this._calculateCompanyMonthlyTrends(employeeStats)
      };

      aggregated.averageAbsenceDuration = aggregated.totalEmployees > 0 
        ? aggregated.totalDaysAbsent / aggregated.totalAbsences 
        : 0;

      return aggregated;

    } catch (error) {
      console.error('Error calculating company statistics:', error);
      throw error;
    }
  }

  async getPatientCubeStatistics(userId) {
    try {
      // Obtener estadísticas históricas del paciente
      const allTimeStats = await this.calculateEmployeeStatistics(userId, {
        periodType: 'all_time',
        periodStart: new Date('2000-01-01'),
        periodEnd: new Date()
      });

      // Obtener estadísticas del último año
      const yearlyStats = await this.calculateEmployeeStatistics(userId, {
        periodType: 'yearly'
      });

      // Obtener información médica detallada
      const medicalRecord = await EmployeeMedicalRecord.findOne({
        where: { userId },
        include: [
          {
            model: User,
            as: 'employee',
            attributes: ['firstName', 'lastName', 'dni', 'birthDate']
          }
        ]
      });

      // Obtener historial de medicación
      const medicationHistory = await MedicalHistory.findAll({
        where: { userId },
        attributes: ['medications', 'episodeDate', 'primaryDiagnosis'],
        order: [['episodeDate', 'DESC']]
      });

      // Procesar medicación regular vs medicación por episodios
      const regularMedication = medicalRecord?.currentMedications || [];
      const episodeMedications = this._processMedicationHistory(medicationHistory);

      // Calcular patrones de ausencia
      const absencePatterns = this._calculateAbsencePatterns(userId);

      return {
        employee: medicalRecord?.employee || null,
        summary: {
          totalAbsences: allTimeStats.totalAbsences,
          totalDaysAbsent: allTimeStats.totalDaysAbsent,
          averageDuration: allTimeStats.averageAbsenceDuration,
          lastAbsence: await this._getLastAbsenceDate(userId)
        },
        yearlyComparison: {
          thisYear: yearlyStats,
          trends: await this._calculateYearlyTrends(userId)
        },
        medicalProfile: {
          regularMedication,
          chronicDiseases: medicalRecord?.chronicDiseases || [],
          allergies: medicalRecord?.allergies || [],
          bmi: medicalRecord?.bmi || null,
          fitnessForWork: medicalRecord?.fitnessForWork || 'unknown'
        },
        medicationAnalysis: {
          episodeMedications,
          medicationFrequency: this._calculateMedicationFrequency(medicationHistory),
          drugInteractions: [] // TODO: Implementar análisis de interacciones
        },
        diagnosisPatterns: allTimeStats.diagnosisStatistics,
        riskFactors: this._identifyRiskFactors(allTimeStats, medicalRecord),
        absencePatterns
      };

    } catch (error) {
      console.error('Error getting patient cube statistics:', error);
      throw error;
    }
  }

  // Métodos auxiliares privados
  _groupByField(array, field) {
    return array.reduce((acc, item) => {
      const value = item[field] || 'No especificado';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  _calculateMedicationStatistics(medicalHistory) {
    const medications = {};
    medicalHistory.forEach(history => {
      if (history.medications) {
        history.medications.forEach(med => {
          medications[med] = (medications[med] || 0) + 1;
        });
      }
    });
    return medications;
  }

  _identifyRecurringConditions(medicalHistory) {
    const conditionCounts = this._groupByField(medicalHistory, 'primaryDiagnosis');
    return Object.entries(conditionCounts)
      .filter(([condition, count]) => count > 1)
      .reduce((acc, [condition, count]) => {
        acc[condition] = count;
        return acc;
      }, {});
  }

  _calculateMonthlyBreakdown(certificates, medicalHistory, periodStart, periodEnd) {
    const months = {};
    const current = new Date(periodStart);
    
    while (current <= periodEnd) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      months[monthKey] = {
        certificates: 0,
        episodes: 0,
        totalDays: 0
      };
      current.setMonth(current.getMonth() + 1);
    }

    certificates.forEach(cert => {
      const monthKey = `${cert.createdAt.getFullYear()}-${String(cert.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (months[monthKey]) {
        months[monthKey].certificates++;
        months[monthKey].totalDays += cert.requestedDays;
      }
    });

    medicalHistory.forEach(history => {
      const monthKey = `${history.episodeDate.getFullYear()}-${String(history.episodeDate.getMonth() + 1).padStart(2, '0')}`;
      if (months[monthKey]) {
        months[monthKey].episodes++;
      }
    });

    return months;
  }

  _calculateRiskIndicators(certificates, medicalHistory, userId) {
    const totalAbsences = certificates.length;
    const totalEpisodes = medicalHistory.length;
    const workRelatedCount = certificates.filter(c => c.isWorkRelated).length + 
                           medicalHistory.filter(h => h.workRelated).length;
    
    const recurringConditions = this._identifyRecurringConditions(medicalHistory);
    const hasRecurring = Object.keys(recurringConditions).length > 0;
    
    const longTermAbsences = certificates.filter(c => c.requestedDays > 15).length;
    
    return {
      high_frequency_employee: totalAbsences > 6, // Más de 6 ausencias por año
      recurring_conditions: hasRecurring,
      long_term_absences: longTermAbsences > 2, // Más de 2 ausencias largas
      work_related_pattern: workRelatedCount > 2 // Más de 2 casos relacionados con trabajo
    };
  }

  _mergeStatistics(employeeStats, field) {
    const merged = {};
    employeeStats.forEach(stat => {
      const fieldData = stat[field] || {};
      Object.entries(fieldData).forEach(([key, value]) => {
        merged[key] = (merged[key] || 0) + value;
      });
    });
    return merged;
  }

  _calculateCompanyMonthlyTrends(employeeStats) {
    const trends = {};
    employeeStats.forEach(stat => {
      const monthlyData = stat.monthlyBreakdown || {};
      Object.entries(monthlyData).forEach(([month, data]) => {
        if (!trends[month]) {
          trends[month] = { certificates: 0, episodes: 0, totalDays: 0, employees: 0 };
        }
        trends[month].certificates += data.certificates || 0;
        trends[month].episodes += data.episodes || 0;
        trends[month].totalDays += data.totalDays || 0;
        if ((data.certificates || 0) > 0 || (data.episodes || 0) > 0) {
          trends[month].employees++;
        }
      });
    });
    return trends;
  }

  _calculateEmployeeRiskLevel(riskIndicators) {
    const trueCount = Object.values(riskIndicators).filter(v => v === true).length;
    if (trueCount >= 3) return 'high';
    if (trueCount >= 2) return 'medium';
    if (trueCount >= 1) return 'low';
    return 'none';
  }

  _processMedicationHistory(medicationHistory) {
    return medicationHistory.map(history => ({
      date: history.episodeDate,
      diagnosis: history.primaryDiagnosis,
      medications: history.medications || []
    })).filter(item => item.medications.length > 0);
  }

  async _getLastAbsenceDate(userId) {
    const lastCertificate = await MedicalCertificate.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
    return lastCertificate?.createdAt || null;
  }

  async _calculateYearlyTrends(userId) {
    const currentYear = new Date().getFullYear();
    const trends = [];
    
    for (let year = currentYear - 2; year <= currentYear; year++) {
      const stats = await this.calculateEmployeeStatistics(userId, {
        periodType: 'yearly',
        periodStart: new Date(year, 0, 1),
        periodEnd: new Date(year, 11, 31)
      });
      trends.push({
        year,
        absences: stats.totalAbsences,
        days: stats.totalDaysAbsent
      });
    }
    
    return trends;
  }

  _calculateMedicationFrequency(medicationHistory) {
    const frequency = {};
    medicationHistory.forEach(history => {
      (history.medications || []).forEach(medication => {
        frequency[medication] = (frequency[medication] || 0) + 1;
      });
    });
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .reduce((acc, [med, freq]) => {
        acc[med] = freq;
        return acc;
      }, {});
  }

  _identifyRiskFactors(stats, medicalRecord) {
    const factors = [];
    
    if (stats.totalAbsences > 6) {
      factors.push('Frecuencia alta de ausencias');
    }
    
    if (stats.averageAbsenceDuration > 10) {
      factors.push('Ausencias prolongadas');
    }
    
    if (stats.workRelatedCases > 2) {
      factors.push('Múltiples casos laborales');
    }
    
    if (Object.keys(stats.recurringConditions || {}).length > 0) {
      factors.push('Condiciones recurrentes');
    }
    
    if (medicalRecord?.hasChronicDiseases) {
      factors.push('Enfermedades crónicas');
    }
    
    return factors;
  }

  async _calculateAbsencePatterns(userId) {
    const certificates = await MedicalCertificate.findAll({
      where: { userId },
      order: [['createdAt', 'ASC']]
    });

    // Analizar patrones temporales
    const dayOfWeekPattern = {};
    const monthPattern = {};
    const seasonPattern = { spring: 0, summer: 0, autumn: 0, winter: 0 };

    certificates.forEach(cert => {
      const date = cert.createdAt;
      const dayOfWeek = date.getDay();
      const month = date.getMonth();
      
      dayOfWeekPattern[dayOfWeek] = (dayOfWeekPattern[dayOfWeek] || 0) + 1;
      monthPattern[month] = (monthPattern[month] || 0) + 1;
      
      // Determinar estación (hemisferio sur)
      if (month >= 9 || month <= 2) seasonPattern.summer++;
      else if (month >= 3 && month <= 5) seasonPattern.autumn++;
      else if (month >= 6 && month <= 8) seasonPattern.winter++;
      else seasonPattern.spring++;
    });

    return {
      dayOfWeekPattern,
      monthPattern,
      seasonPattern,
      totalPatternAnalyzed: certificates.length
    };
  }
}

module.exports = new MedicalStatisticsService();