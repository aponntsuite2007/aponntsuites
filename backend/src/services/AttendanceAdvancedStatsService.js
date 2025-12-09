/**
 * AttendanceAdvancedStatsService.js
 *
 * Servicio de Estadísticas Avanzadas para Asistencia
 * Sistema de Ecosistema Inteligente - MULTI-IDIOMA / MULTI-PAÍS
 *
 * CARACTERÍSTICAS:
 * - Zonificación climática DINÁMICA basada en latitud de kioscos (NO hardcodeado)
 * - Media acotada (trimmed mean) para eliminar outliers
 * - Desviación estándar, percentiles, distribución Gaussiana
 * - Estadísticas médicas consolidadas (CIE-10, días licencia, diagnósticos)
 * - Métricas biométricas/emocionales (fatiga, estrés, emociones Azure Face)
 * - Correlaciones con clima (weatherConditions de fichajes)
 * - Análisis por turno (mañana, tarde, noche)
 * - Tendencias predictivas basadas en patrones históricos
 * - Comparativas SOLO entre kioscos/sucursales de misma zona climática
 * - Referencia a kiosk con reverse geocoding (país, provincia, ciudad)
 *
 * IMPORTANTE: NO VENDEMOS HUMO - Solo métricas calculables con datos reales
 */

const { Op, fn, col, literal } = require('sequelize');
const ShiftCalculatorService = require('./ShiftCalculatorService');

// ============================================================================
// ZONIFICACIÓN CLIMÁTICA DINÁMICA POR LATITUD
// No hardcodeamos países/provincias - calculamos por latitud absoluta
// ============================================================================
const CLIMATE_ZONES_BY_LATITUDE = {
    TROPICAL: {
        name: 'Tropical',
        code: 'TROPICAL',
        minLat: -23.5,
        maxLat: 23.5,
        description: 'Zona tropical ecuatorial, temperaturas altas todo el año',
        winterImpact: 'minimal',
        summerImpact: 'high_heat'
    },
    SUBTROPICAL: {
        name: 'Subtropical',
        code: 'SUBTROPICAL',
        minLat: -35,
        maxLat: -23.5,
        minLatNorth: 23.5,
        maxLatNorth: 35,
        description: 'Zona subtropical, inviernos suaves, veranos calurosos',
        winterImpact: 'mild',
        summerImpact: 'hot'
    },
    TEMPERATE: {
        name: 'Templado',
        code: 'TEMPERATE',
        minLat: -55,
        maxLat: -35,
        minLatNorth: 35,
        maxLatNorth: 55,
        description: 'Zona templada, cuatro estaciones marcadas',
        winterImpact: 'cold',
        summerImpact: 'warm'
    },
    COLD: {
        name: 'Frío',
        code: 'COLD',
        minLat: -90,
        maxLat: -55,
        minLatNorth: 55,
        maxLatNorth: 90,
        description: 'Zona fría/polar, inviernos extremos',
        winterImpact: 'extreme_cold',
        summerImpact: 'cool'
    }
};

// Estaciones según hemisferio
const SEASONS = {
    SOUTH: {
        SUMMER: { months: [12, 1, 2], name: 'Verano' },
        AUTUMN: { months: [3, 4, 5], name: 'Otoño' },
        WINTER: { months: [6, 7, 8], name: 'Invierno' },
        SPRING: { months: [9, 10, 11], name: 'Primavera' }
    },
    NORTH: {
        SUMMER: { months: [6, 7, 8], name: 'Summer' },
        AUTUMN: { months: [9, 10, 11], name: 'Fall' },
        WINTER: { months: [12, 1, 2], name: 'Winter' },
        SPRING: { months: [3, 4, 5], name: 'Spring' }
    }
};

class AttendanceAdvancedStatsService {
    constructor(db) {
        this.db = db;
    }

    // ========================================================================
    // CÁLCULOS ESTADÍSTICOS ACADÉMICOS
    // ========================================================================

    trimmedMean(values, trimPercent = 0.10) {
        if (!values || values.length === 0) return 0;
        if (values.length < 4) return this.mean(values);

        const sorted = [...values].sort((a, b) => a - b);
        const trimCount = Math.floor(sorted.length * trimPercent);
        if (trimCount === 0) return this.mean(values);

        const trimmed = sorted.slice(trimCount, -trimCount);
        return this.mean(trimmed);
    }

    mean(values) {
        if (!values || values.length === 0) return 0;
        return values.reduce((sum, v) => sum + v, 0) / values.length;
    }

    standardDeviation(values) {
        if (!values || values.length < 2) return 0;
        const avg = this.mean(values);
        const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
        return Math.sqrt(this.mean(squaredDiffs));
    }

    coefficientOfVariation(values) {
        const avg = this.mean(values);
        if (avg === 0) return 0;
        return (this.standardDeviation(values) / Math.abs(avg)) * 100;
    }

    percentiles(values, points = [25, 50, 75, 90, 95]) {
        if (!values || values.length === 0) {
            return points.reduce((acc, p) => ({ ...acc, [`p${p}`]: 0 }), {});
        }
        const sorted = [...values].sort((a, b) => a - b);
        const result = {};
        for (const p of points) {
            const index = (p / 100) * (sorted.length - 1);
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            const weight = index - lower;
            result[`p${p}`] = upper >= sorted.length
                ? sorted[sorted.length - 1]
                : sorted[lower] * (1 - weight) + sorted[upper] * weight;
        }
        return result;
    }

    distribution(values, numBins = 10) {
        if (!values || values.length === 0) return [];
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binWidth = (max - min) / numBins || 1;
        const bins = Array(numBins).fill(0).map((_, i) => ({
            rangeStart: min + (i * binWidth),
            rangeEnd: min + ((i + 1) * binWidth),
            count: 0,
            percentage: 0
        }));
        for (const value of values) {
            const binIndex = Math.min(Math.floor((value - min) / binWidth), numBins - 1);
            bins[binIndex].count++;
        }
        const total = values.length;
        bins.forEach(bin => { bin.percentage = (bin.count / total) * 100; });
        return bins;
    }

    detectOutliers(values) {
        if (!values || values.length < 4) return { outliers: [], iqr: 0 };
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - (1.5 * iqr);
        const upperBound = q3 + (1.5 * iqr);
        const outliers = values.filter(v => v < lowerBound || v > upperBound);
        return { q1, q3, iqr, lowerBound, upperBound, outliers, outlierCount: outliers.length, outlierPercentage: (outliers.length / values.length) * 100 };
    }

    // ========================================================================
    // ZONIFICACIÓN CLIMÁTICA INTELIGENTE
    // ========================================================================

    getClimateZoneByLatitude(latitude) {
        if (latitude == null) return null;
        const lat = parseFloat(latitude);
        const absLat = Math.abs(lat);

        if (absLat <= 23.5) return CLIMATE_ZONES_BY_LATITUDE.TROPICAL;
        if (absLat <= 35) return CLIMATE_ZONES_BY_LATITUDE.SUBTROPICAL;
        if (absLat <= 55) return CLIMATE_ZONES_BY_LATITUDE.TEMPERATE;
        return CLIMATE_ZONES_BY_LATITUDE.COLD;
    }

    getHemisphere(latitude) {
        return latitude >= 0 ? 'NORTH' : 'SOUTH';
    }

    getSeason(date, latitude) {
        const month = new Date(date).getMonth() + 1;
        const hemisphere = this.getHemisphere(latitude || -34); // Default sur
        const seasons = SEASONS[hemisphere];

        for (const [key, season] of Object.entries(seasons)) {
            if (season.months.includes(month)) {
                return { code: key, ...season };
            }
        }
        return seasons.SUMMER;
    }

    // ========================================================================
    // REVERSE GEOCODING SIMULADO (basado en latitud/longitud)
    // En producción usar Google Maps API o similar
    // ========================================================================

    async getLocationFromCoordinates(lat, lng) {
        // En producción, llamar a Google Maps Geocoding API o similar
        // Por ahora, retornamos la zona climática y coordenadas
        const zone = this.getClimateZoneByLatitude(lat);
        const hemisphere = this.getHemisphere(lat);

        return {
            latitude: lat,
            longitude: lng,
            hemisphere,
            climateZone: zone,
            // En producción estos vendrían del API de geocoding
            formattedAddress: `Lat: ${lat?.toFixed(4)}, Lng: ${lng?.toFixed(4)}`,
            note: 'Integrar Google Maps Geocoding API para obtener país/provincia/ciudad'
        };
    }

    // ========================================================================
    // ESTADÍSTICAS COMPLETAS
    // ========================================================================

    async getAdvancedStats(companyId, dateRange = {}) {
        const startDate = dateRange.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const endDate = dateRange.endDate || new Date();

        try {
            // Cargar datos en paralelo
            const [
                attendanceStats,
                kioskStats,
                medicalStats,
                emotionalStats,
                shiftStats,
                weatherCorrelations
            ] = await Promise.all([
                this._getAttendanceStats(companyId, startDate, endDate),
                this._getKioskLocationStats(companyId),
                this._getMedicalStats(companyId, startDate, endDate),
                this._getEmotionalStats(companyId, startDate, endDate),
                this._getShiftStats(companyId, startDate, endDate),
                this._getWeatherCorrelations(companyId, startDate, endDate)
            ]);

            // Agrupar kioscos por zona climática
            const kiosksByZone = this._groupKiosksByClimateZone(kioskStats.kiosks || []);

            // Calcular estadísticas por zona climática
            const statsByZone = await this._calculateStatsByZone(companyId, kiosksByZone, startDate, endDate);

            // Tendencias predictivas
            const predictions = await this._calculatePredictiveTrends(companyId, startDate, endDate);

            return {
                success: true,
                companyId,
                period: {
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    totalDays: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
                },

                // Estadísticas de asistencia
                attendance: attendanceStats,

                // Kioscos con ubicación y zona climática
                kiosks: kioskStats,

                // Estadísticas por zona climática
                byClimateZone: statsByZone,

                // Estadísticas médicas consolidadas
                medical: medicalStats,

                // Métricas biométricas/emocionales
                emotional: emotionalStats,

                // Análisis por turno
                shifts: shiftStats,

                // Correlaciones con clima
                weather: weatherCorrelations,

                // Tendencias predictivas
                predictions,

                // Metodología
                methodology: {
                    statisticalMethods: [
                        { name: 'Trimmed Mean', description: 'Media acotada eliminando 10% extremos', formula: 'mean(sorted[10%..90%])' },
                        { name: 'Standard Deviation', description: 'Dispersión respecto a la media', formula: 'σ = √(Σ(xi-μ)²/n)' },
                        { name: 'IQR Outliers', description: 'Detección de valores atípicos', formula: 'outlier if x < Q1-1.5*IQR or x > Q3+1.5*IQR' },
                        { name: 'Percentiles', description: 'Distribución por cuartiles', formula: 'P50 = mediana' }
                    ],
                    climateZoning: 'Basada en latitud absoluta del kiosk, no en países/provincias',
                    dataSource: 'Fichajes reales con timestamp, GPS de kiosk, datos médicos CIE-10',
                    minimumSampleSize: 10,
                    engine: 'AttendanceAdvancedStatsService v2.0'
                }
            };

        } catch (error) {
            console.error('❌ Error en getAdvancedStats:', error);
            throw error;
        }
    }

    // ========================================================================
    // ESTADÍSTICAS DE ASISTENCIA
    // ========================================================================

    async _getAttendanceStats(companyId, startDate, endDate) {
        const { Attendance } = this.db;
        if (!Attendance) return { available: false };

        try {
            const attendances = await Attendance.findAll({
                attributes: ['id', 'user_id', 'check_in', 'check_out', 'status', 'date', 'workingHours', 'kiosk_id'],
                where: {
                    company_id: companyId,
                    date: { [Op.between]: [startDate, endDate] }
                },
                raw: true
            });

            if (attendances.length === 0) {
                return { available: true, sampleSize: 0, message: 'Sin datos en el período' };
            }

            // Calcular minutos de tardanza
            const lateMinutes = attendances
                .filter(a => (a.status || '').toLowerCase() === 'late' && a.check_in)
                .map(a => {
                    const checkIn = new Date(a.check_in);
                    const expected = new Date(a.date);
                    expected.setHours(9, 0, 0, 0);
                    return Math.max(0, (checkIn - expected) / (1000 * 60));
                })
                .filter(m => m > 0 && m < 480); // Max 8 horas

            // Horas trabajadas
            const workedHours = attendances
                .filter(a => a.workingHours && parseFloat(a.workingHours) > 0)
                .map(a => parseFloat(a.workingHours));

            // Conteos por estado
            const statusCounts = attendances.reduce((acc, a) => {
                const status = (a.status || 'unknown').toLowerCase();
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});

            const total = attendances.length;
            const lateCount = statusCounts.late || 0;
            const absentCount = statusCounts.absent || 0;
            const presentCount = (statusCounts.present || 0) + (statusCounts.on_time || 0);

            // Análisis por día de semana
            const byWeekday = this._analyzeByWeekday(attendances);

            // Distribución de llegadas
            const arrivalMinutes = attendances
                .filter(a => a.check_in)
                .map(a => {
                    const checkIn = new Date(a.check_in);
                    return checkIn.getHours() * 60 + checkIn.getMinutes();
                });

            return {
                available: true,
                sampleSize: total,
                rates: {
                    present: (presentCount / total) * 100,
                    late: (lateCount / total) * 100,
                    absent: (absentCount / total) * 100
                },
                lateMinutes: {
                    rawMean: this.mean(lateMinutes),
                    trimmedMean: this.trimmedMean(lateMinutes),
                    stdDev: this.standardDeviation(lateMinutes),
                    cv: this.coefficientOfVariation(lateMinutes),
                    percentiles: this.percentiles(lateMinutes),
                    outliers: this.detectOutliers(lateMinutes)
                },
                workedHours: workedHours.length > 0 ? {
                    rawMean: this.mean(workedHours),
                    trimmedMean: this.trimmedMean(workedHours),
                    stdDev: this.standardDeviation(workedHours)
                } : null,
                byWeekday,
                arrivalDistribution: {
                    sampleSize: arrivalMinutes.length,
                    meanTime: this._minutesToTime(this.mean(arrivalMinutes)),
                    trimmedMeanTime: this._minutesToTime(this.trimmedMean(arrivalMinutes)),
                    distribution: this.distribution(arrivalMinutes, 12)
                }
            };

        } catch (error) {
            console.error('Error en _getAttendanceStats:', error);
            return { available: false, error: error.message };
        }
    }

    _analyzeByWeekday(attendances) {
        const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const byDay = Array(7).fill(null).map(() => ({ total: 0, late: 0, absent: 0 }));

        for (const att of attendances) {
            if (!att.date) continue;
            const day = new Date(att.date).getDay();
            byDay[day].total++;
            const status = (att.status || '').toLowerCase();
            if (status === 'late') byDay[day].late++;
            else if (status === 'absent') byDay[day].absent++;
        }

        return byDay.map((data, i) => ({
            day: i,
            dayName: weekdays[i],
            records: data.total,
            lateRate: data.total > 0 ? (data.late / data.total) * 100 : 0,
            absentRate: data.total > 0 ? (data.absent / data.total) * 100 : 0
        }));
    }

    // ========================================================================
    // ESTADÍSTICAS DE KIOSCOS CON UBICACIÓN
    // ========================================================================

    async _getKioskLocationStats(companyId) {
        const { Kiosk } = this.db;
        if (!Kiosk) return { available: false };

        try {
            const kiosks = await Kiosk.findAll({
                where: { company_id: companyId, is_active: true },
                raw: true
            });

            const kioskData = await Promise.all(kiosks.map(async (k) => {
                const location = await this.getLocationFromCoordinates(k.gps_lat, k.gps_lng);
                return {
                    id: k.id,
                    name: k.name,
                    deviceId: k.device_id,
                    location: k.location,
                    gps: {
                        latitude: k.gps_lat,
                        longitude: k.gps_lng
                    },
                    climateZone: location.climateZone,
                    hemisphere: location.hemisphere,
                    isConfigured: k.is_configured
                };
            }));

            return {
                available: true,
                total: kiosks.length,
                configured: kiosks.filter(k => k.is_configured).length,
                withGPS: kiosks.filter(k => k.gps_lat && k.gps_lng).length,
                kiosks: kioskData
            };

        } catch (error) {
            console.error('Error en _getKioskLocationStats:', error);
            return { available: false, error: error.message };
        }
    }

    _groupKiosksByClimateZone(kiosks) {
        const byZone = {};
        for (const kiosk of kiosks) {
            if (!kiosk.climateZone) continue;
            const zoneCode = kiosk.climateZone.code;
            if (!byZone[zoneCode]) {
                byZone[zoneCode] = {
                    zone: kiosk.climateZone,
                    kiosks: []
                };
            }
            byZone[zoneCode].kiosks.push(kiosk);
        }
        return byZone;
    }

    // ========================================================================
    // ESTADÍSTICAS MÉDICAS CONSOLIDADAS (CIE-10)
    // ========================================================================

    async _getMedicalStats(companyId, startDate, endDate) {
        const { MedicalCertificate, User } = this.db;
        if (!MedicalCertificate) return { available: false, reason: 'Modelo MedicalCertificate no disponible' };

        try {
            const certificates = await MedicalCertificate.findAll({
                where: {
                    issueDate: { [Op.between]: [startDate, endDate] }
                },
                include: [{
                    model: User,
                    as: 'employee',
                    where: { company_id: companyId },
                    required: true,
                    attributes: ['user_id', 'firstName', 'lastName']
                }],
                raw: true,
                nest: true
            });

            if (certificates.length === 0) {
                return { available: true, sampleSize: 0, message: 'Sin certificados médicos en el período' };
            }

            // Días aprobados
            const approvedDays = certificates
                .filter(c => c.approvedDays > 0)
                .map(c => c.approvedDays);

            // Por categoría de diagnóstico
            const byCategory = certificates.reduce((acc, c) => {
                const cat = c.diagnosisCategory || 'Sin categoría';
                if (!acc[cat]) acc[cat] = { count: 0, totalDays: 0, codes: new Set() };
                acc[cat].count++;
                acc[cat].totalDays += c.approvedDays || 0;
                if (c.diagnosisCode) acc[cat].codes.add(c.diagnosisCode);
                return acc;
            }, {});

            // Por estado
            const byStatus = certificates.reduce((acc, c) => {
                const status = c.status || 'unknown';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});

            // Empleados con más licencias (frecuentes)
            const byEmployee = certificates.reduce((acc, c) => {
                const empId = c.employee?.user_id;
                if (!empId) return acc;
                if (!acc[empId]) acc[empId] = { count: 0, totalDays: 0, name: `${c.employee?.firstName || ''} ${c.employee?.lastName || ''}` };
                acc[empId].count++;
                acc[empId].totalDays += c.approvedDays || 0;
                return acc;
            }, {});

            const frequentAbsentees = Object.entries(byEmployee)
                .map(([id, data]) => ({ userId: id, ...data }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            return {
                available: true,
                sampleSize: certificates.length,
                totalDaysLost: approvedDays.reduce((s, d) => s + d, 0),
                averageDaysPerCertificate: {
                    raw: this.mean(approvedDays),
                    trimmed: this.trimmedMean(approvedDays),
                    stdDev: this.standardDeviation(approvedDays)
                },
                byCategory: Object.entries(byCategory).map(([cat, data]) => ({
                    category: cat,
                    count: data.count,
                    totalDays: data.totalDays,
                    avgDays: data.count > 0 ? data.totalDays / data.count : 0,
                    uniqueCodes: data.codes.size
                })).sort((a, b) => b.count - a.count),
                byStatus,
                frequentAbsentees,
                riskIndicators: {
                    highFrequencyEmployees: frequentAbsentees.filter(e => e.count >= 3).length,
                    longTermAbsences: certificates.filter(c => c.approvedDays >= 15).length,
                    pendingAudit: byStatus.pending || 0
                }
            };

        } catch (error) {
            console.error('Error en _getMedicalStats:', error);
            return { available: false, error: error.message };
        }
    }

    // ========================================================================
    // MÉTRICAS BIOMÉTRICAS/EMOCIONALES (Azure Face, TensorFlow, MediaPipe)
    // ========================================================================

    async _getEmotionalStats(companyId, startDate, endDate) {
        const { EmotionalAnalysis } = this.db;
        if (!EmotionalAnalysis) return { available: false, reason: 'Modelo EmotionalAnalysis no disponible' };

        try {
            const analyses = await EmotionalAnalysis.findAll({
                where: {
                    companyId,
                    scanTimestamp: { [Op.between]: [startDate, endDate] }
                },
                raw: true
            });

            if (analyses.length === 0) {
                return { available: true, sampleSize: 0, message: 'Sin análisis emocionales en el período' };
            }

            // Scores de fatiga y estrés
            const fatigueScores = analyses.filter(a => a.fatigueScore != null).map(a => parseFloat(a.fatigueScore));
            const stressScores = analyses.filter(a => a.stressScore != null).map(a => parseFloat(a.stressScore));
            const wellnessScores = analyses.filter(a => a.wellnessScore != null).map(a => parseFloat(a.wellnessScore));

            // Emociones dominantes
            const dominantEmotions = analyses.reduce((acc, a) => {
                const emotion = a.dominantEmotion || 'unknown';
                acc[emotion] = (acc[emotion] || 0) + 1;
                return acc;
            }, {});

            // Por hora del día
            const byTimeOfDay = analyses.reduce((acc, a) => {
                const time = a.timeOfDay || 'unknown';
                if (!acc[time]) acc[time] = { count: 0, avgFatigue: [], avgStress: [] };
                acc[time].count++;
                if (a.fatigueScore) acc[time].avgFatigue.push(parseFloat(a.fatigueScore));
                if (a.stressScore) acc[time].avgStress.push(parseFloat(a.stressScore));
                return acc;
            }, {});

            // Por día de semana
            const byDayOfWeek = analyses.reduce((acc, a) => {
                const day = a.dayOfWeek != null ? a.dayOfWeek : new Date(a.scanTimestamp).getDay();
                if (!acc[day]) acc[day] = { count: 0, avgFatigue: [], avgStress: [] };
                acc[day].count++;
                if (a.fatigueScore) acc[day].avgFatigue.push(parseFloat(a.fatigueScore));
                if (a.stressScore) acc[day].avgStress.push(parseFloat(a.stressScore));
                return acc;
            }, {});

            return {
                available: true,
                sampleSize: analyses.length,
                technology: 'Azure Face API + TensorFlow + MediaPipe',
                fatigue: {
                    rawMean: this.mean(fatigueScores),
                    trimmedMean: this.trimmedMean(fatigueScores),
                    stdDev: this.standardDeviation(fatigueScores),
                    percentiles: this.percentiles(fatigueScores),
                    highFatigueRate: fatigueScores.length > 0
                        ? (fatigueScores.filter(f => f > 0.7).length / fatigueScores.length) * 100
                        : 0
                },
                stress: {
                    rawMean: this.mean(stressScores),
                    trimmedMean: this.trimmedMean(stressScores),
                    stdDev: this.standardDeviation(stressScores),
                    highStressRate: stressScores.length > 0
                        ? (stressScores.filter(s => s > 0.7).length / stressScores.length) * 100
                        : 0
                },
                wellness: wellnessScores.length > 0 ? {
                    rawMean: this.mean(wellnessScores),
                    trimmedMean: this.trimmedMean(wellnessScores)
                } : null,
                dominantEmotions: Object.entries(dominantEmotions)
                    .map(([emotion, count]) => ({ emotion, count, percentage: (count / analyses.length) * 100 }))
                    .sort((a, b) => b.count - a.count),
                byTimeOfDay: Object.entries(byTimeOfDay).map(([time, data]) => ({
                    time,
                    scans: data.count,
                    avgFatigue: this.mean(data.avgFatigue),
                    avgStress: this.mean(data.avgStress)
                })),
                byDayOfWeek: Object.entries(byDayOfWeek).map(([day, data]) => ({
                    day: parseInt(day),
                    scans: data.count,
                    avgFatigue: this.mean(data.avgFatigue),
                    avgStress: this.mean(data.avgStress)
                })).sort((a, b) => a.day - b.day)
            };

        } catch (error) {
            console.error('Error en _getEmotionalStats:', error);
            return { available: false, error: error.message };
        }
    }

    // ========================================================================
    // ANÁLISIS POR TURNO (Mañana, Tarde, Noche)
    // ========================================================================

    async _getShiftStats(companyId, startDate, endDate) {
        // Nota: La tabla attendance no tiene columna shift_id en esta instalación
        // Análisis de turnos basado en hora de check_in
        const { Attendance, Shift } = this.db;
        if (!Attendance) return { available: false, reason: 'Modelo Attendance no disponible' };

        try {
            // Obtener asistencias con check_in
            const attendances = await Attendance.findAll({
                attributes: ['id', 'user_id', 'check_in', 'status', 'date'],
                where: {
                    company_id: companyId,
                    date: { [Op.between]: [startDate, endDate] },
                    check_in: { [Op.ne]: null }
                },
                raw: true
            });

            if (attendances.length === 0) {
                return { available: true, sampleSize: 0, message: 'Sin registros de asistencia' };
            }

            // Clasificar por hora de check_in
            const classifyByCheckInHour = (checkIn) => {
                const hour = new Date(checkIn).getHours();
                if (hour >= 5 && hour < 12) return 'morning';
                if (hour >= 12 && hour < 18) return 'afternoon';
                return 'night';
            };

            const byShiftType = { morning: [], afternoon: [], night: [] };
            for (const att of attendances) {
                if (!att.check_in) continue;
                const type = classifyByCheckInHour(att.check_in);
                byShiftType[type].push(att);
            }

            const calculateShiftStats = (atts) => {
                if (atts.length === 0) return { records: 0, lateRate: 0, absentRate: 0 };
                const lateCount = atts.filter(a => (a.status || '').toLowerCase() === 'late').length;
                return {
                    records: atts.length,
                    lateRate: (lateCount / atts.length) * 100,
                    absentRate: 0 // No podemos calcular ausencias sin shift_id
                };
            };

            return {
                available: true,
                sampleSize: attendances.length,
                note: 'Análisis basado en hora de check_in (shift_id no disponible en BD)',
                byType: {
                    morning: {
                        name: 'Turno Mañana (05:00-12:00)',
                        ...calculateShiftStats(byShiftType.morning)
                    },
                    afternoon: {
                        name: 'Turno Tarde (12:00-18:00)',
                        ...calculateShiftStats(byShiftType.afternoon)
                    },
                    night: {
                        name: 'Turno Noche (18:00-05:00)',
                        ...calculateShiftStats(byShiftType.night)
                    }
                }
            };

        } catch (error) {
            console.error('Error en _getShiftStats:', error);
            return { available: false, error: error.message };
        }
    }

    // ========================================================================
    // CORRELACIONES CON CLIMA (weatherConditions)
    // ========================================================================

    async _getWeatherCorrelations(companyId, startDate, endDate) {
        const { EmployeeLocation, Attendance } = this.db;
        if (!EmployeeLocation) return { available: false, reason: 'Modelo EmployeeLocation no disponible' };

        try {
            const locations = await EmployeeLocation.findAll({
                where: {
                    company_id: companyId,
                    reportedAt: { [Op.between]: [startDate, endDate] },
                    weatherConditions: { [Op.ne]: null }
                },
                raw: true
            });

            if (locations.length === 0) {
                return { available: true, sampleSize: 0, message: 'Sin datos de clima en el período' };
            }

            // Agrupar por condición climática
            const byCondition = locations.reduce((acc, loc) => {
                const weather = loc.weatherConditions;
                if (!weather) return acc;

                const condition = typeof weather === 'string'
                    ? JSON.parse(weather).condition
                    : weather.condition;

                if (!condition) return acc;

                if (!acc[condition]) acc[condition] = { count: 0, temperatures: [], humidities: [] };
                acc[condition].count++;

                const temp = typeof weather === 'string' ? JSON.parse(weather).temperature : weather.temperature;
                const hum = typeof weather === 'string' ? JSON.parse(weather).humidity : weather.humidity;

                if (temp != null) acc[condition].temperatures.push(parseFloat(temp));
                if (hum != null) acc[condition].humidities.push(parseFloat(hum));

                return acc;
            }, {});

            return {
                available: true,
                sampleSize: locations.length,
                byCondition: Object.entries(byCondition).map(([condition, data]) => ({
                    condition,
                    count: data.count,
                    percentage: (data.count / locations.length) * 100,
                    avgTemperature: this.mean(data.temperatures),
                    avgHumidity: this.mean(data.humidities)
                })).sort((a, b) => b.count - a.count),
                note: 'Correlacionar con tasas de tardanza/ausencia para insights'
            };

        } catch (error) {
            console.error('Error en _getWeatherCorrelations:', error);
            return { available: false, error: error.message };
        }
    }

    // ========================================================================
    // ESTADÍSTICAS POR ZONA CLIMÁTICA
    // ========================================================================

    async _calculateStatsByZone(companyId, kiosksByZone, startDate, endDate) {
        const { Attendance } = this.db;
        if (!Attendance) return {};

        const statsByZone = {};

        for (const [zoneCode, zoneData] of Object.entries(kiosksByZone)) {
            const kioskIds = zoneData.kiosks.map(k => k.id);

            if (kioskIds.length === 0) continue;

            try {
                const attendances = await Attendance.findAll({
                    attributes: ['id', 'user_id', 'company_id', 'check_in', 'check_out', 'status', 'date', 'kiosk_id'],
                    where: {
                        company_id: companyId,
                        kiosk_id: { [Op.in]: kioskIds },
                        date: { [Op.between]: [startDate, endDate] }
                    },
                    raw: true
                });

                if (attendances.length === 0) continue;

                const lateCount = attendances.filter(a => (a.status || '').toLowerCase() === 'late').length;
                const absentCount = attendances.filter(a => (a.status || '').toLowerCase() === 'absent').length;

                const lateMinutes = attendances
                    .filter(a => (a.status || '').toLowerCase() === 'late' && a.check_in)
                    .map(a => {
                        const checkIn = new Date(a.check_in);
                        const expected = new Date(a.date);
                        expected.setHours(9, 0, 0, 0);
                        return Math.max(0, (checkIn - expected) / (1000 * 60));
                    })
                    .filter(m => m > 0 && m < 480);

                statsByZone[zoneCode] = {
                    zone: zoneData.zone,
                    kiosks: zoneData.kiosks.length,
                    kioskNames: zoneData.kiosks.map(k => k.name),
                    records: attendances.length,
                    rates: {
                        late: (lateCount / attendances.length) * 100,
                        absent: (absentCount / attendances.length) * 100
                    },
                    lateMinutes: {
                        mean: this.mean(lateMinutes),
                        trimmedMean: this.trimmedMean(lateMinutes),
                        stdDev: this.standardDeviation(lateMinutes)
                    }
                };

            } catch (error) {
                console.error(`Error calculando stats para zona ${zoneCode}:`, error);
            }
        }

        return statsByZone;
    }

    // ========================================================================
    // TENDENCIAS PREDICTIVAS
    // ========================================================================

    async _calculatePredictiveTrends(companyId, startDate, endDate) {
        const { Attendance } = this.db;
        if (!Attendance) return { available: false };

        try {
            // Obtener últimos 6 meses para calcular tendencia
            const sixMonthsAgo = new Date(endDate);
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const attendances = await Attendance.findAll({
                attributes: ['id', 'user_id', 'company_id', 'status', 'date'],
                where: {
                    company_id: companyId,
                    date: { [Op.between]: [sixMonthsAgo, endDate] }
                },
                raw: true
            });

            if (attendances.length < 100) {
                return { available: true, message: 'Datos insuficientes para predicción (mín 100 registros)', sampleSize: attendances.length };
            }

            // Agrupar por mes
            const byMonth = attendances.reduce((acc, a) => {
                if (!a.date) return acc;
                const monthKey = typeof a.date === 'string' ? a.date.substring(0, 7) : new Date(a.date).toISOString().substring(0, 7); // YYYY-MM
                if (!acc[monthKey]) acc[monthKey] = { total: 0, late: 0, absent: 0 };
                acc[monthKey].total++;
                const status = (a.status || '').toLowerCase();
                if (status === 'late') acc[monthKey].late++;
                else if (status === 'absent') acc[monthKey].absent++;
                return acc;
            }, {});

            const monthlyData = Object.entries(byMonth)
                .map(([month, data]) => ({
                    month,
                    lateRate: (data.late / data.total) * 100,
                    absentRate: (data.absent / data.total) * 100
                }))
                .sort((a, b) => a.month.localeCompare(b.month));

            // Calcular tendencia (regresión lineal simple)
            const lateRates = monthlyData.map(d => d.lateRate);
            const absentRates = monthlyData.map(d => d.absentRate);

            const calculateTrend = (rates) => {
                if (rates.length < 2) return { slope: 0, direction: 'stable' };
                const n = rates.length;
                const sumX = (n * (n - 1)) / 2;
                const sumY = rates.reduce((s, r) => s + r, 0);
                const sumXY = rates.reduce((s, r, i) => s + (i * r), 0);
                const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

                const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

                return {
                    slope: slope,
                    direction: slope > 0.5 ? 'increasing' : slope < -0.5 ? 'decreasing' : 'stable',
                    interpretation: slope > 0.5
                        ? 'Tendencia al alza - requiere atención'
                        : slope < -0.5
                            ? 'Tendencia a la baja - mejorando'
                            : 'Estable'
                };
            };

            return {
                available: true,
                sampleSize: attendances.length,
                period: `${monthlyData[0]?.month} - ${monthlyData[monthlyData.length - 1]?.month}`,
                monthlyData,
                lateTrend: calculateTrend(lateRates),
                absentTrend: calculateTrend(absentRates),
                predictions: {
                    nextMonth: {
                        expectedLateRate: lateRates.length > 0 ? lateRates[lateRates.length - 1] + calculateTrend(lateRates).slope : null,
                        expectedAbsentRate: absentRates.length > 0 ? absentRates[absentRates.length - 1] + calculateTrend(absentRates).slope : null
                    }
                }
            };

        } catch (error) {
            console.error('Error en _calculatePredictiveTrends:', error);
            return { available: false, error: error.message };
        }
    }

    // ========================================================================
    // COMPARATIVA ENTRE KIOSCOS DE MISMA ZONA
    // ========================================================================

    async compareKiosksInSameZone(companyId, dateRange = {}) {
        const startDate = dateRange.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const endDate = dateRange.endDate || new Date();

        const kioskStats = await this._getKioskLocationStats(companyId);
        if (!kioskStats.available || kioskStats.kiosks.length === 0) {
            return { success: false, error: 'No hay kioscos configurados' };
        }

        const kiosksByZone = this._groupKiosksByClimateZone(kioskStats.kiosks);
        const { Attendance } = this.db;

        const comparisons = {};

        for (const [zoneCode, zoneData] of Object.entries(kiosksByZone)) {
            if (zoneData.kiosks.length < 2) {
                comparisons[zoneCode] = {
                    zone: zoneData.zone,
                    kioskCount: zoneData.kiosks.length,
                    comparison: null,
                    reason: 'Se necesitan al menos 2 kioscos en la misma zona para comparar'
                };
                continue;
            }

            const kioskRankings = [];

            for (const kiosk of zoneData.kiosks) {
                const attendances = await Attendance.findAll({
                    attributes: ['id', 'user_id', 'company_id', 'status', 'date', 'kiosk_id'],
                    where: {
                        company_id: companyId,
                        kiosk_id: kiosk.id,
                        date: { [Op.between]: [startDate, endDate] }
                    },
                    raw: true
                });

                if (attendances.length < 20) continue;

                const lateCount = attendances.filter(a => (a.status || '').toLowerCase() === 'late').length;
                const absentCount = attendances.filter(a => (a.status || '').toLowerCase() === 'absent').length;
                const presentCount = attendances.length - lateCount - absentCount;

                const presentRate = (presentCount / attendances.length) * 100;
                const lateRate = (lateCount / attendances.length) * 100;
                const absentRate = (absentCount / attendances.length) * 100;

                const score = presentRate - (lateRate * 0.5) - (absentRate * 1.5);

                kioskRankings.push({
                    kioskId: kiosk.id,
                    kioskName: kiosk.name,
                    location: kiosk.location,
                    gps: kiosk.gps,
                    records: attendances.length,
                    metrics: { presentRate, lateRate, absentRate },
                    score
                });
            }

            kioskRankings.sort((a, b) => b.score - a.score);
            kioskRankings.forEach((k, i) => {
                k.rank = i + 1;
                k.percentile = Math.round(((kioskRankings.length - i) / kioskRankings.length) * 100);
            });

            comparisons[zoneCode] = {
                zone: zoneData.zone,
                kioskCount: kioskRankings.length,
                rankings: kioskRankings,
                bestKiosk: kioskRankings[0],
                worstKiosk: kioskRankings[kioskRankings.length - 1],
                gap: kioskRankings.length >= 2 ? {
                    scoreDiff: kioskRankings[0].score - kioskRankings[kioskRankings.length - 1].score,
                    interpretation: kioskRankings[0].score - kioskRankings[kioskRankings.length - 1].score > 10
                        ? 'Brecha significativa entre kioscos'
                        : 'Desempeño homogéneo'
                } : null
            };
        }

        return {
            success: true,
            companyId,
            period: { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] },
            comparisons,
            methodology: {
                note: 'Comparativas SOLO entre kioscos de la misma zona climática',
                scoringFormula: 'score = presentRate - (lateRate * 0.5) - (absentRate * 1.5)',
                minimumRecords: 20,
                climateZoning: 'Basada en latitud GPS del kiosk'
            }
        };
    }

    // ========================================================================
    // ANÁLISIS DE AUSENTES BASADO EN TURNOS (SSOT)
    // ========================================================================

    /**
     * Obtiene los empleados ausentes para una fecha específica
     * Compara quiénes DEBERÍAN haber trabajado (según turno) vs quiénes asistieron
     *
     * @param {number} companyId - ID de la empresa
     * @param {string|Date} date - Fecha a consultar
     * @param {Object} filters - Filtros opcionales (department_id, branch_id, shift_id)
     * @returns {Object} Lista de ausentes con detalles de turno
     */
    async getAbsentEmployees(companyId, date, filters = {}) {
        const dateString = typeof date === 'string' ? date : date.toISOString().split('T')[0];

        try {
            // 1. Obtener quiénes DEBERÍAN haber trabajado según su turno
            const expectedToWork = await ShiftCalculatorService.getUsersExpectedToWork(
                companyId,
                dateString,
                filters
            );

            if (expectedToWork.length === 0) {
                return {
                    success: true,
                    date: dateString,
                    companyId,
                    message: 'No hay empleados programados para trabajar en esta fecha',
                    summary: {
                        expectedCount: 0,
                        presentCount: 0,
                        absentCount: 0,
                        absentRate: 0
                    },
                    absents: [],
                    presents: []
                };
            }

            // 2. Obtener quiénes efectivamente asistieron ese día
            const { Attendance } = this.db;
            const attendances = await Attendance.findAll({
                where: {
                    company_id: companyId,
                    date: dateString,
                    [Op.or]: [
                        { checkInTime: { [Op.ne]: null } },
                        { check_in: { [Op.ne]: null } }
                    ]
                },
                attributes: ['id', 'UserId', 'user_id', 'checkInTime', 'check_in', 'checkOutTime', 'check_out', 'status'],
                raw: true
            });

            // 3. Crear set de user_ids que asistieron
            const presentUserIds = new Set(
                attendances.map(a => a.UserId || a.user_id)
            );

            // 4. Separar ausentes y presentes
            const absents = [];
            const presents = [];

            for (const expected of expectedToWork) {
                const userId = expected.user?.user_id || expected.assignment?.user_id;
                const userData = {
                    userId,
                    firstName: expected.user?.firstName || '',
                    lastName: expected.user?.lastName || '',
                    legajo: expected.user?.legajo || '',
                    departmentId: expected.user?.departmentId || expected.user?.department_id,
                    departmentName: expected.user?.department?.name || '',
                    branchId: expected.user?.branch_id,
                    shift: {
                        id: expected.shift?.id,
                        name: expected.shift?.name,
                        type: expected.shift?.type,
                        startTime: expected.shift?.start_time,
                        endTime: expected.shift?.end_time
                    },
                    shiftCalculation: {
                        phase: expected.phase,
                        dayInCycle: expected.dayInCycle,
                        isWorkingDay: expected.isWorkingDay,
                        shiftType: expected.shiftType
                    }
                };

                if (presentUserIds.has(userId)) {
                    const attendance = attendances.find(a => (a.UserId || a.user_id) === userId);
                    presents.push({
                        ...userData,
                        attendance: {
                            id: attendance?.id,
                            checkIn: attendance?.checkInTime || attendance?.check_in,
                            checkOut: attendance?.checkOutTime || attendance?.check_out,
                            status: attendance?.status
                        }
                    });
                } else {
                    absents.push({
                        ...userData,
                        absenceReason: 'NO_CHECKIN', // Default - podría extenderse con justificaciones
                        absenceJustified: false
                    });
                }
            }

            // 5. Calcular métricas
            const expectedCount = expectedToWork.length;
            const presentCount = presents.length;
            const absentCount = absents.length;
            const absentRate = expectedCount > 0 ? (absentCount / expectedCount) * 100 : 0;

            // 6. Agrupar ausentes por departamento
            const absentsByDepartment = absents.reduce((acc, emp) => {
                const deptName = emp.departmentName || 'Sin Departamento';
                if (!acc[deptName]) {
                    acc[deptName] = {
                        name: deptName,
                        count: 0,
                        employees: []
                    };
                }
                acc[deptName].count++;
                acc[deptName].employees.push({
                    userId: emp.userId,
                    name: `${emp.firstName} ${emp.lastName}`,
                    legajo: emp.legajo,
                    shift: emp.shift.name
                });
                return acc;
            }, {});

            // 7. Agrupar ausentes por turno
            const absentsByShift = absents.reduce((acc, emp) => {
                const shiftName = emp.shift?.name || 'Sin Turno';
                if (!acc[shiftName]) {
                    acc[shiftName] = {
                        name: shiftName,
                        type: emp.shift?.type || 'unknown',
                        count: 0,
                        employees: []
                    };
                }
                acc[shiftName].count++;
                acc[shiftName].employees.push({
                    userId: emp.userId,
                    name: `${emp.firstName} ${emp.lastName}`,
                    legajo: emp.legajo,
                    department: emp.departmentName
                });
                return acc;
            }, {});

            return {
                success: true,
                date: dateString,
                companyId,
                calculatedAt: new Date().toISOString(),
                source: 'SHIFT_CALCULATOR_SSOT',
                summary: {
                    expectedCount,
                    presentCount,
                    absentCount,
                    absentRate: Math.round(absentRate * 100) / 100,
                    presentRate: Math.round((100 - absentRate) * 100) / 100
                },
                absents,
                presents,
                byDepartment: Object.values(absentsByDepartment).sort((a, b) => b.count - a.count),
                byShift: Object.values(absentsByShift).sort((a, b) => b.count - a.count),
                methodology: {
                    description: 'Ausentes calculados comparando turno esperado vs check-in real',
                    shiftSource: 'user_shift_assignments + shifts',
                    attendanceSource: 'attendances table',
                    note: 'Solo considera ausentes a quienes tenían turno asignado y no ficharon'
                }
            };

        } catch (error) {
            console.error('❌ Error en getAbsentEmployees:', error);
            return {
                success: false,
                date: dateString,
                companyId,
                error: error.message,
                absents: [],
                presents: []
            };
        }
    }

    /**
     * Obtiene resumen de ausentes para un rango de fechas
     *
     * @param {number} companyId - ID de la empresa
     * @param {string|Date} startDate - Fecha inicio
     * @param {string|Date} endDate - Fecha fin
     * @param {Object} filters - Filtros opcionales
     * @returns {Object} Resumen con tendencias de ausentismo
     */
    async getAbsenteeismReport(companyId, startDate, endDate, filters = {}) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dailyData = [];

        const current = new Date(start);
        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];

            // Saltar fines de semana si no hay filtro específico de turno
            const dayOfWeek = current.getDay();
            if (!filters.includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
                current.setDate(current.getDate() + 1);
                continue;
            }

            const dayResult = await this.getAbsentEmployees(companyId, dateStr, filters);

            if (dayResult.success && dayResult.summary.expectedCount > 0) {
                dailyData.push({
                    date: dateStr,
                    dayOfWeek,
                    ...dayResult.summary
                });
            }

            current.setDate(current.getDate() + 1);
        }

        // Calcular métricas agregadas
        const totalExpected = dailyData.reduce((sum, d) => sum + d.expectedCount, 0);
        const totalAbsent = dailyData.reduce((sum, d) => sum + d.absentCount, 0);
        const avgAbsentRate = dailyData.length > 0
            ? dailyData.reduce((sum, d) => sum + d.absentRate, 0) / dailyData.length
            : 0;

        // Detectar días críticos (alto ausentismo)
        const criticalDays = dailyData
            .filter(d => d.absentRate > 10) // Más del 10% de ausentes
            .sort((a, b) => b.absentRate - a.absentRate);

        // Tendencia por día de semana
        const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const byWeekday = dailyData.reduce((acc, d) => {
            if (!acc[d.dayOfWeek]) {
                acc[d.dayOfWeek] = {
                    day: d.dayOfWeek,
                    name: weekdayNames[d.dayOfWeek],
                    totalExpected: 0,
                    totalAbsent: 0,
                    count: 0
                };
            }
            acc[d.dayOfWeek].totalExpected += d.expectedCount;
            acc[d.dayOfWeek].totalAbsent += d.absentCount;
            acc[d.dayOfWeek].count++;
            return acc;
        }, {});

        const weekdayTrend = Object.values(byWeekday).map(w => ({
            ...w,
            avgAbsentRate: w.totalExpected > 0
                ? Math.round((w.totalAbsent / w.totalExpected) * 10000) / 100
                : 0
        })).sort((a, b) => b.avgAbsentRate - a.avgAbsentRate);

        return {
            success: true,
            companyId,
            period: {
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
                totalDays: dailyData.length
            },
            summary: {
                totalExpected,
                totalAbsent,
                totalPresent: totalExpected - totalAbsent,
                avgAbsentRate: Math.round(avgAbsentRate * 100) / 100,
                avgPresentRate: Math.round((100 - avgAbsentRate) * 100) / 100
            },
            dailyData,
            criticalDays,
            weekdayTrend,
            methodology: {
                source: 'SHIFT_CALCULATOR_SSOT',
                description: 'Ausentismo calculado según turnos asignados vs fichajes reales'
            }
        };
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    _minutesToTime(minutes) {
        if (minutes == null || isNaN(minutes)) return '--:--';
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
}

module.exports = AttendanceAdvancedStatsService;
module.exports.CLIMATE_ZONES_BY_LATITUDE = CLIMATE_ZONES_BY_LATITUDE;
module.exports.SEASONS = SEASONS;
