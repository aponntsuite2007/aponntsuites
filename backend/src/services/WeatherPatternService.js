/**
 * ============================================================================
 * SERVICIO DE PATRONES CLIMÁTICOS
 * ============================================================================
 *
 * Sistema simplificado de clasificación climática para análisis de asistencia.
 *
 * PATRONES DEFINIDOS:
 * - FAVORABLE      : Día, sin lluvia, temp 10-30°C
 * - ADVERSO_LLUVIA : Lluvia o tormenta (cualquier hora)
 * - ADVERSO_FRIO   : Temperatura < 10°C (sin lluvia)
 * - NOCTURNO       : Hora entre 20:00 y 06:00 (cualquier clima)
 * - UNKNOWN        : No se pudo determinar
 *
 * NOTA: Este servicio captura el clima 15 minutos antes del inicio/fin de turno
 * y lo asigna a la fichada para permitir análisis estadístico posterior.
 *
 * @version 1.0.0
 * @date 2025-12-15
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Configuración de umbrales
const CONFIG = {
    // Umbrales de temperatura (en °C)
    TEMP_COLD_THRESHOLD: 10,    // Por debajo = ADVERSO_FRIO
    TEMP_HOT_THRESHOLD: 30,     // Por encima = podría ser ADVERSO_CALOR (futuro)

    // Horario nocturno
    NIGHT_START_HOUR: 20,       // 20:00
    NIGHT_END_HOUR: 6,          // 06:00

    // Condiciones de lluvia
    RAIN_CONDITIONS: ['rain', 'rainy', 'drizzle', 'shower', 'thunderstorm', 'storm', 'stormy'],
    SNOW_CONDITIONS: ['snow', 'snowy', 'sleet', 'hail']
};

class WeatherPatternService {

    /**
     * Clasifica las condiciones climáticas en un patrón simple
     * @param {Object} weather - Datos del clima
     * @param {number} weather.temperature - Temperatura en °C
     * @param {string} weather.condition - Condición (sunny, rainy, etc.)
     * @param {Date|string} checkTime - Hora de la fichada
     * @returns {Object} { pattern, details }
     */
    static classifyWeather(weather, checkTime) {
        if (!weather) {
            return { pattern: 'UNKNOWN', details: { reason: 'No weather data' } };
        }

        const { temperature, condition } = weather;
        const isNight = this.isNightTime(checkTime);
        const isRainy = this.isRainyCondition(condition);
        const isSnowy = this.isSnowyCondition(condition);
        const isCold = temperature !== null && temperature < CONFIG.TEMP_COLD_THRESHOLD;

        // Prioridad de clasificación:
        // 1. ADVERSO_LLUVIA (más impactante en tardanzas)
        // 2. ADVERSO_FRIO (segundo más impactante)
        // 3. NOCTURNO (tercer factor)
        // 4. FAVORABLE (todo lo demás)

        let pattern = 'FAVORABLE';
        let reason = 'Condiciones normales';

        if (isRainy || isSnowy) {
            pattern = 'ADVERSO_LLUVIA';
            reason = isSnowy ? 'Nieve/granizo' : 'Lluvia/tormenta';
        } else if (isCold) {
            pattern = 'ADVERSO_FRIO';
            reason = `Temperatura baja (${temperature}°C)`;
        } else if (isNight) {
            pattern = 'NOCTURNO';
            reason = 'Horario nocturno';
        }

        return {
            pattern,
            details: {
                temperature,
                condition,
                isNight,
                isRainy,
                isSnowy,
                isCold,
                reason
            }
        };
    }

    /**
     * Determina si es horario nocturno
     * @param {Date|string} time - Hora a evaluar
     * @returns {boolean}
     */
    static isNightTime(time) {
        const date = new Date(time);
        const hour = date.getHours();
        return hour >= CONFIG.NIGHT_START_HOUR || hour < CONFIG.NIGHT_END_HOUR;
    }

    /**
     * Determina si la condición implica lluvia
     * @param {string} condition - Condición climática
     * @returns {boolean}
     */
    static isRainyCondition(condition) {
        if (!condition) return false;
        const lowerCondition = condition.toLowerCase();
        return CONFIG.RAIN_CONDITIONS.some(c => lowerCondition.includes(c));
    }

    /**
     * Determina si la condición implica nieve
     * @param {string} condition - Condición climática
     * @returns {boolean}
     */
    static isSnowyCondition(condition) {
        if (!condition) return false;
        const lowerCondition = condition.toLowerCase();
        return CONFIG.SNOW_CONDITIONS.some(c => lowerCondition.includes(c));
    }

    /**
     * Actualiza el patrón climático de una asistencia existente
     * @param {string|number} attendanceId - ID de la asistencia
     * @param {Object} weather - Datos del clima
     * @param {Date|string} checkTime - Hora de la fichada
     * @returns {Object} Resultado de la actualización
     */
    static async updateAttendanceWeather(attendanceId, weather, checkTime) {
        try {
            const { pattern, details } = this.classifyWeather(weather, checkTime);

            await sequelize.query(`
                UPDATE attendances
                SET
                    weather_pattern = :pattern,
                    weather_temperature = :temperature,
                    weather_condition = :condition,
                    weather_is_night = :isNight,
                    weather_captured_at = NOW()
                WHERE id = :attendanceId
            `, {
                replacements: {
                    attendanceId,
                    pattern,
                    temperature: weather?.temperature || null,
                    condition: weather?.condition || null,
                    isNight: details.isNight || false
                },
                type: QueryTypes.UPDATE
            });

            return {
                success: true,
                pattern,
                details
            };
        } catch (error) {
            console.error('[WeatherPattern] Error updating attendance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obtiene estadísticas de asistencia agrupadas por patrón climático
     * @param {number} companyId - ID de la empresa
     * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
     * @param {string} endDate - Fecha fin (YYYY-MM-DD)
     * @returns {Object} Estadísticas por patrón
     */
    static async getStatsByWeatherPattern(companyId, startDate, endDate) {
        try {
            const results = await sequelize.query(`
                SELECT
                    weather_pattern,
                    COUNT(*) as total_records,
                    COUNT(CASE WHEN is_late = true THEN 1 END) as late_count,
                    AVG(CASE WHEN is_late = true THEN minutes_late ELSE 0 END) as avg_late_minutes,
                    ROUND(
                        COUNT(CASE WHEN is_late = true THEN 1 END)::numeric /
                        NULLIF(COUNT(*), 0) * 100,
                        2
                    ) as late_percentage,
                    AVG(EXTRACT(EPOCH FROM ("checkOutTime" - "checkInTime")) / 3600) as avg_hours_worked
                FROM attendances
                WHERE company_id = :companyId
                  AND date >= :startDate
                  AND date <= :endDate
                  AND status IN ('present', 'late')
                GROUP BY weather_pattern
                ORDER BY total_records DESC
            `, {
                replacements: { companyId, startDate, endDate },
                type: QueryTypes.SELECT
            });

            // Formatear resultados
            const stats = {
                FAVORABLE: { total: 0, lateCount: 0, latePercent: 0, avgLateMinutes: 0, avgHoursWorked: 0 },
                ADVERSO_LLUVIA: { total: 0, lateCount: 0, latePercent: 0, avgLateMinutes: 0, avgHoursWorked: 0 },
                ADVERSO_FRIO: { total: 0, lateCount: 0, latePercent: 0, avgLateMinutes: 0, avgHoursWorked: 0 },
                NOCTURNO: { total: 0, lateCount: 0, latePercent: 0, avgLateMinutes: 0, avgHoursWorked: 0 },
                UNKNOWN: { total: 0, lateCount: 0, latePercent: 0, avgLateMinutes: 0, avgHoursWorked: 0 }
            };

            results.forEach(row => {
                const pattern = row.weather_pattern || 'UNKNOWN';
                if (stats[pattern]) {
                    stats[pattern] = {
                        total: parseInt(row.total_records) || 0,
                        lateCount: parseInt(row.late_count) || 0,
                        latePercent: parseFloat(row.late_percentage) || 0,
                        avgLateMinutes: parseFloat(row.avg_late_minutes) || 0,
                        avgHoursWorked: parseFloat(row.avg_hours_worked) || 0
                    };
                }
            });

            return {
                success: true,
                byPattern: stats,
                summary: {
                    totalRecords: Object.values(stats).reduce((sum, s) => sum + s.total, 0),
                    mostImpactfulPattern: this.findMostImpactfulPattern(stats)
                }
            };
        } catch (error) {
            console.error('[WeatherPattern] Error getting stats:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Encuentra el patrón con mayor impacto en tardanzas
     * @param {Object} stats - Estadísticas por patrón
     * @returns {Object} Patrón más impactante
     */
    static findMostImpactfulPattern(stats) {
        let maxImpact = { pattern: 'UNKNOWN', latePercent: 0, increase: 0 };
        const baselinePercent = stats.FAVORABLE?.latePercent || 0;

        for (const [pattern, data] of Object.entries(stats)) {
            if (pattern !== 'FAVORABLE' && pattern !== 'UNKNOWN' && data.total > 0) {
                const increase = data.latePercent - baselinePercent;
                if (increase > maxImpact.increase) {
                    maxImpact = {
                        pattern,
                        latePercent: data.latePercent,
                        increase,
                        increasePercent: baselinePercent > 0
                            ? Math.round((increase / baselinePercent) * 100)
                            : 0
                    };
                }
            }
        }

        return maxImpact;
    }

    /**
     * Asigna patrones climáticos simulados a los datos de prueba existentes
     * Basado en: hora del día + condición almacenada + temperatura simulada
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Resultado de la actualización masiva
     */
    static async assignSimulatedPatternsToTestData(companyId) {
        try {
            // Actualizar registros existentes basándose en la hora de fichada
            // y simulando condiciones climáticas realistas

            const result = await sequelize.query(`
                UPDATE attendances
                SET
                    weather_pattern = CASE
                        -- Nocturno: fichada entre 20:00 y 06:00
                        WHEN EXTRACT(HOUR FROM "checkInTime") >= 20
                             OR EXTRACT(HOUR FROM "checkInTime") < 6
                        THEN 'NOCTURNO'

                        -- Adverso Lluvia: simulamos 15% de días lluviosos
                        WHEN MOD(EXTRACT(DOY FROM date)::int, 7) = 0
                        THEN 'ADVERSO_LLUVIA'

                        -- Adverso Frío: meses de invierno (jun-ago hemisferio sur)
                        WHEN EXTRACT(MONTH FROM date) IN (6, 7, 8)
                             AND MOD(EXTRACT(DOY FROM date)::int, 3) = 0
                        THEN 'ADVERSO_FRIO'

                        -- El resto: Favorable
                        ELSE 'FAVORABLE'
                    END,
                    weather_is_night = CASE
                        WHEN EXTRACT(HOUR FROM "checkInTime") >= 20
                             OR EXTRACT(HOUR FROM "checkInTime") < 6
                        THEN true
                        ELSE false
                    END,
                    weather_captured_at = NOW()
                WHERE company_id = :companyId
                  AND weather_pattern = 'UNKNOWN'
                  AND "checkInTime" IS NOT NULL
            `, {
                replacements: { companyId },
                type: QueryTypes.UPDATE
            });

            console.log(`[WeatherPattern] Patrones asignados para company ${companyId}`);

            return {
                success: true,
                message: 'Patrones climáticos simulados asignados'
            };
        } catch (error) {
            console.error('[WeatherPattern] Error assigning patterns:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = WeatherPatternService;
