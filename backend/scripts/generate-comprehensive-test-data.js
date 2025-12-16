/**
 * ============================================================================
 * GENERADOR COMPLETO DE DATOS DE PRUEBA - Sistema de Asistencia
 * ============================================================================
 *
 * Este script genera datos realistas para evaluar TODAS las métricas del sistema:
 *
 * ESCENARIOS SIMULADOS:
 * - Turnos: Mañana (6-14), Tarde (14-22), Noche (22-6)
 * - Climas: Tropical, Subtropical, Templado, Frío (basado en GPS de kioscos)
 * - Patrones de comportamiento: Puntual, Ocasional tarde, Crónico tarde
 * - Días especiales: Fines de semana, Feriados, Fin de año
 * - Condiciones climáticas: Soleado, Lluvioso, Frío extremo, Calor extremo
 * - Ausencias: Enfermedad, Justificadas, Injustificadas
 * - Horas extras: Regulares, Fines de semana, Feriados
 *
 * @version 2.0.0
 * @date 2025-12-15
 * ============================================================================
 */

require('dotenv').config();
const { Sequelize, QueryTypes, Op } = require('sequelize');

// Configuración de conexión
const sequelize = new Sequelize(
    process.env.POSTGRES_DB || process.env.DB_NAME || 'attendance_system',
    process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    {
        host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
        dialect: 'postgres',
        logging: false
    }
);

// ============================================================================
// CONFIGURACIÓN DE SIMULACIÓN
// ============================================================================

const CONFIG = {
    // Período a generar (últimos N días)
    DAYS_TO_GENERATE: 90,

    // Distribución de empleados por comportamiento
    EMPLOYEE_BEHAVIOR: {
        PUNCTUAL: 0.60,        // 60% siempre puntuales
        OCCASIONAL_LATE: 0.25, // 25% ocasionalmente tarde
        CHRONIC_LATE: 0.10,    // 10% crónicamente tarde
        PROBLEMATIC: 0.05      // 5% problemáticos (muchas ausencias)
    },

    // Probabilidades base de tardanza por día
    LATE_PROBABILITY: {
        MONDAY: 0.20,     // Lunes: más tardanzas (efecto fin de semana)
        TUESDAY: 0.08,
        WEDNESDAY: 0.06,
        THURSDAY: 0.07,
        FRIDAY: 0.15,     // Viernes: más tardanzas
        SATURDAY: 0.25,   // Fin de semana: más tardanzas
        SUNDAY: 0.30
    },

    // Multiplicadores por condición climática
    WEATHER_LATE_MULTIPLIER: {
        SUNNY: 1.0,
        CLOUDY: 1.1,
        RAINY: 1.8,       // Lluvia: 80% más tardanzas
        STORMY: 2.5,      // Tormenta: 150% más tardanzas
        COLD: 1.4,        // Frío extremo
        HOT: 1.3,         // Calor extremo
        SNOW: 3.0         // Nieve: 200% más tardanzas
    },

    // Multiplicadores por período del año
    SEASONAL_LATE_MULTIPLIER: {
        NORMAL: 1.0,
        END_OF_YEAR: 1.5,      // Dic 15-31: más tardanzas
        START_OF_YEAR: 1.3,    // Ene 1-15: regreso de vacaciones
        WINTER_PEAK: 1.4,      // Julio: frío en hemisferio sur
        SUMMER_PEAK: 1.2       // Enero: calor
    },

    // Turnos
    SHIFTS: {
        MORNING: { start: '06:00', end: '14:00', name: 'Mañana' },
        AFTERNOON: { start: '14:00', end: '22:00', name: 'Tarde' },
        NIGHT: { start: '22:00', end: '06:00', name: 'Noche' }
    },

    // Zonas climáticas por latitud
    CLIMATE_ZONES: {
        TROPICAL: { latMin: -23.5, latMax: 23.5, baseTemp: 28, tempVariation: 5 },
        SUBTROPICAL: { latMin: -35, latMax: -23.5, baseTemp: 22, tempVariation: 10 },
        TEMPERATE: { latMin: -45, latMax: -35, baseTemp: 15, tempVariation: 15 },
        COLD: { latMin: -90, latMax: -45, baseTemp: 5, tempVariation: 20 }
    },

    // Feriados Argentina 2025 (ejemplo)
    HOLIDAYS_2025: [
        '2025-01-01', // Año nuevo
        '2025-03-03', '2025-03-04', // Carnaval
        '2025-03-24', // Memoria
        '2025-04-02', // Malvinas
        '2025-04-18', '2025-04-19', // Semana Santa
        '2025-05-01', // Trabajo
        '2025-05-25', // Revolución
        '2025-06-20', // Bandera
        '2025-07-09', // Independencia
        '2025-08-17', // San Martín
        '2025-10-12', // Diversidad
        '2025-11-20', // Soberanía
        '2025-12-08', // Inmaculada
        '2025-12-25'  // Navidad
    ],

    // ============================================================================
    // CONFIGURACIÓN DE COBERTURA DE FERIADOS Y HORAS EXTRAS
    // ============================================================================

    // Porcentaje de personal que trabaja en feriados (skeleton crew)
    HOLIDAY_SKELETON_CREW_PERCENT: 0.20, // 20% del personal trabaja feriados

    // Porcentaje de trabajadores que cubren ausencias de otros
    COVERAGE_WORKERS_PERCENT: 0.10, // 10% dispuesto a cubrir

    // Horas extra en feriados (más largas que días normales)
    HOLIDAY_OVERTIME: {
        MIN_HOURS: 2,    // Mínimo 2 horas extra en feriado
        MAX_HOURS: 6,    // Máximo 6 horas extra
        PROBABILITY: 0.70 // 70% hace horas extra en feriado
    },

    // Multiplicadores de pago por horas extra
    OVERTIME_MULTIPLIERS: {
        NORMAL_DAY: 1.5,      // Día normal: 50% extra
        WEEKEND: 1.5,         // Fin de semana: 50% extra
        HOLIDAY: 2.0,         // Feriado: 100% extra (pago doble)
        NIGHT_SHIFT: 1.3      // Turno nocturno: 30% extra adicional
    },

    // Tipos de cobertura
    COVERAGE_TYPES: {
        HOLIDAY_SKELETON: 'holiday_skeleton',  // Guardia mínima en feriado
        ABSENT_REPLACEMENT: 'absent_coverage', // Reemplazo por ausencia
        EXTRA_DEMAND: 'extra_demand',          // Demanda extra (fin de mes, etc.)
        EMERGENCY: 'emergency_call'            // Llamada de emergencia
    }
};

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function weightedRandom(weights) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * total;

    for (const [key, weight] of Object.entries(weights)) {
        random -= weight;
        if (random <= 0) return key;
    }
    return Object.keys(weights)[0];
}

function addMinutes(time, minutes) {
    const [h, m] = time.split(':').map(Number);
    let totalMinutes = h * 60 + m + minutes;

    // Manejar valores negativos (wrap around al día siguiente/anterior)
    while (totalMinutes < 0) {
        totalMinutes += 24 * 60;
    }

    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = Math.abs(totalMinutes % 60);
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`;
}

function isWeekend(date) {
    const day = new Date(date).getDay();
    return day === 0 || day === 6;
}

function isHoliday(date) {
    const dateStr = new Date(date).toISOString().split('T')[0];
    return CONFIG.HOLIDAYS_2025.includes(dateStr);
}

function getDayName(date) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[new Date(date).getDay()];
}

function getSeasonalMultiplier(date) {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();

    // Fin de año (15-31 Dic)
    if (month === 12 && day >= 15) return CONFIG.SEASONAL_LATE_MULTIPLIER.END_OF_YEAR;

    // Inicio de año (1-15 Ene)
    if (month === 1 && day <= 15) return CONFIG.SEASONAL_LATE_MULTIPLIER.START_OF_YEAR;

    // Pico invierno (Junio-Agosto en hemisferio sur)
    if (month >= 6 && month <= 8) return CONFIG.SEASONAL_LATE_MULTIPLIER.WINTER_PEAK;

    // Pico verano (Diciembre-Febrero)
    if (month === 12 || month <= 2) return CONFIG.SEASONAL_LATE_MULTIPLIER.SUMMER_PEAK;

    return CONFIG.SEASONAL_LATE_MULTIPLIER.NORMAL;
}

function getClimateZone(latitude) {
    const lat = Math.abs(latitude || -34.6); // Default Buenos Aires

    if (lat <= 23.5) return 'TROPICAL';
    if (lat <= 35) return 'SUBTROPICAL';
    if (lat <= 45) return 'TEMPERATE';
    return 'COLD';
}

function generateWeatherForDate(date, climateZone) {
    const zone = CONFIG.CLIMATE_ZONES[climateZone] || CONFIG.CLIMATE_ZONES.TEMPERATE;
    const month = new Date(date).getMonth();

    // Ajustar temperatura por mes (hemisferio sur)
    const monthTempOffset = [15, 12, 8, 3, -2, -5, -8, -5, 0, 5, 10, 14][month];
    const baseTemp = zone.baseTemp + monthTempOffset + randomFloat(-zone.tempVariation/2, zone.tempVariation/2);

    // Determinar condición climática
    const rand = Math.random();
    let condition = 'SUNNY';

    if (rand < 0.05) condition = 'STORMY';
    else if (rand < 0.15) condition = 'RAINY';
    else if (rand < 0.30) condition = 'CLOUDY';

    // Condiciones extremas por temperatura
    if (baseTemp < 5) condition = 'COLD';
    else if (baseTemp > 35) condition = 'HOT';

    // Nieve en zonas frías y temperatura bajo 0
    if (climateZone === 'COLD' && baseTemp < 2 && Math.random() < 0.3) {
        condition = 'SNOW';
    }

    return {
        condition,
        temperature: Math.round(baseTemp * 10) / 10,
        humidity: randomBetween(40, 90),
        windSpeed: randomBetween(5, 40)
    };
}

function calculateLateMinutes(behavior, dayName, weather, seasonalMult, isWeekendDay, isHolidayDay) {
    // Probabilidad base de tardanza según día
    let baseProbability = CONFIG.LATE_PROBABILITY[dayName] || 0.10;

    // Ajustar por comportamiento del empleado
    switch (behavior) {
        case 'PUNCTUAL':
            baseProbability *= 0.2; // 80% menos probable
            break;
        case 'OCCASIONAL_LATE':
            baseProbability *= 1.0;
            break;
        case 'CHRONIC_LATE':
            baseProbability *= 2.5; // 150% más probable
            break;
        case 'PROBLEMATIC':
            baseProbability *= 4.0; // 300% más probable
            break;
    }

    // Multiplicar por clima
    baseProbability *= CONFIG.WEATHER_LATE_MULTIPLIER[weather.condition] || 1.0;

    // Multiplicar por estacionalidad
    baseProbability *= seasonalMult;

    // Fin de semana o feriado: más tardanzas
    if (isWeekendDay) baseProbability *= 1.3;
    if (isHolidayDay) baseProbability *= 1.5;

    // Determinar si llegó tarde
    if (Math.random() > baseProbability) {
        return 0; // Puntual
    }

    // Calcular minutos de tardanza (distribución exponencial-like)
    let lateMinutes;
    const rand = Math.random();

    if (rand < 0.50) {
        lateMinutes = randomBetween(1, 10);    // 50%: 1-10 min (tardanza leve)
    } else if (rand < 0.80) {
        lateMinutes = randomBetween(11, 30);   // 30%: 11-30 min (tardanza moderada)
    } else if (rand < 0.95) {
        lateMinutes = randomBetween(31, 60);   // 15%: 31-60 min (tardanza significativa)
    } else {
        lateMinutes = randomBetween(61, 180);  // 5%: 1-3 horas (tardanza grave)
    }

    return lateMinutes;
}

function shouldBeAbsent(behavior, dayName, weather, isWeekendDay) {
    let baseProbability = 0.02; // 2% base

    switch (behavior) {
        case 'PUNCTUAL':
            baseProbability = 0.01;
            break;
        case 'OCCASIONAL_LATE':
            baseProbability = 0.03;
            break;
        case 'CHRONIC_LATE':
            baseProbability = 0.05;
            break;
        case 'PROBLEMATIC':
            baseProbability = 0.15; // 15% ausencias
            break;
    }

    // Lunes y viernes más ausencias
    if (dayName === 'MONDAY' || dayName === 'FRIDAY') {
        baseProbability *= 1.5;
    }

    // Clima extremo aumenta ausencias
    if (['STORMY', 'SNOW', 'COLD', 'HOT'].includes(weather.condition)) {
        baseProbability *= 2.0;
    }

    return Math.random() < baseProbability;
}

function generateAbsenceReason() {
    const rand = Math.random();
    if (rand < 0.40) return { type: 'sick', justified: true, reason: 'Enfermedad' };
    if (rand < 0.60) return { type: 'medical', justified: true, reason: 'Turno médico' };
    if (rand < 0.75) return { type: 'family', justified: true, reason: 'Asunto familiar' };
    if (rand < 0.85) return { type: 'personal', justified: false, reason: 'Sin aviso' };
    return { type: 'unknown', justified: false, reason: 'No justificada' };
}

/**
 * Determina si un empleado es parte del skeleton crew para feriados
 * Basado en departamento y rol
 */
function isSkeletonCrewMember(user, allUsers) {
    // El 20% del personal está asignado a skeleton crew
    const userIndex = allUsers.findIndex(u => u.user_id === user.user_id);
    return userIndex < Math.ceil(allUsers.length * CONFIG.HOLIDAY_SKELETON_CREW_PERCENT);
}

/**
 * Determina si un empleado puede cubrir ausencias
 */
function isCoverageWorker(user, allUsers) {
    const userIndex = allUsers.findIndex(u => u.user_id === user.user_id);
    const skeletonCount = Math.ceil(allUsers.length * CONFIG.HOLIDAY_SKELETON_CREW_PERCENT);
    const coverageStart = skeletonCount;
    const coverageEnd = skeletonCount + Math.ceil(allUsers.length * CONFIG.COVERAGE_WORKERS_PERCENT);
    return userIndex >= coverageStart && userIndex < coverageEnd;
}

/**
 * Calcula horas extra para feriados y coberturas
 */
function calculateHolidayOvertime(isHolidayDay, isWeekendDay, isCoverage, shiftName) {
    let overtimeMinutes = 0;
    let overtimeType = 'none';
    let multiplier = CONFIG.OVERTIME_MULTIPLIERS.NORMAL_DAY;

    if (isHolidayDay) {
        // Feriado: alta probabilidad de horas extra
        if (Math.random() < CONFIG.HOLIDAY_OVERTIME.PROBABILITY) {
            const extraHours = randomFloat(
                CONFIG.HOLIDAY_OVERTIME.MIN_HOURS,
                CONFIG.HOLIDAY_OVERTIME.MAX_HOURS
            );
            overtimeMinutes = Math.round(extraHours * 60);
            overtimeType = CONFIG.COVERAGE_TYPES.HOLIDAY_SKELETON;
            multiplier = CONFIG.OVERTIME_MULTIPLIERS.HOLIDAY;
        }
    } else if (isCoverage) {
        // Cobertura de ausencia: horas extra moderadas
        if (Math.random() < 0.60) {
            overtimeMinutes = randomBetween(60, 180); // 1-3 horas
            overtimeType = CONFIG.COVERAGE_TYPES.ABSENT_REPLACEMENT;
            multiplier = isWeekendDay ? CONFIG.OVERTIME_MULTIPLIERS.WEEKEND : CONFIG.OVERTIME_MULTIPLIERS.NORMAL_DAY;
        }
    } else if (isWeekendDay && Math.random() < 0.30) {
        // Fin de semana normal: baja probabilidad de horas extra
        overtimeMinutes = randomBetween(30, 120);
        overtimeType = 'weekend_overtime';
        multiplier = CONFIG.OVERTIME_MULTIPLIERS.WEEKEND;
    }

    // Turno nocturno tiene multiplicador adicional
    if (shiftName && shiftName.toLowerCase().includes('noche')) {
        multiplier *= CONFIG.OVERTIME_MULTIPLIERS.NIGHT_SHIFT;
    }

    return {
        overtimeMinutes,
        overtimeType,
        multiplier: Math.round(multiplier * 100) / 100
    };
}

function calculateWorkHours(checkIn, checkOut, shiftConfig, isHolidayDay, isWeekendDay) {
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);

    let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Turno nocturno

    // Descontar break (30 min si trabajó más de 6 horas)
    if (totalMinutes > 360) totalMinutes -= 30;

    const totalHours = totalMinutes / 60;
    const expectedHours = 8;

    let normalHours = Math.min(totalHours, expectedHours);
    let overtimeHours = Math.max(0, totalHours - expectedHours);

    // Calcular multiplicadores
    let overtimeMultiplier = 1.5;
    if (isWeekendDay) overtimeMultiplier = 1.5;
    if (isHolidayDay) overtimeMultiplier = 2.0;

    return {
        totalHours: Math.round(totalHours * 100) / 100,
        normalHours: Math.round(normalHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        overtimeMultiplier
    };
}

// ============================================================================
// BIOMETRÍA ANALÍTICA AGREGADA (NIVEL DEPARTAMENTO/TURNO - NO INDIVIDUAL)
// ============================================================================

/**
 * Genera datos agregados de biometría analítica por departamento/turno
 * IMPORTANTE: Estos datos son PROMEDIOS GRUPALES, no individuales
 * Simulan lo que Azure Face API podría detectar de forma agregada
 */
function generateAggregatedBiometrics(dateStr, departmentId, shiftId, weather, isHolidayDay, isWeekendDay) {
    const dayOfWeek = new Date(dateStr).getDay();
    const month = new Date(dateStr).getMonth();

    // Factores base que afectan métricas grupales
    const mondayEffect = dayOfWeek === 1 ? 0.15 : 0;      // Lunes: más fatiga
    const fridayEffect = dayOfWeek === 5 ? 0.10 : 0;      // Viernes: más estrés
    const winterEffect = (month >= 5 && month <= 7) ? 0.12 : 0; // Invierno: más fatiga
    const holidayEffect = isHolidayDay ? -0.20 : 0;       // Feriado trabajando: menos fatiga inicial pero más estrés
    const weatherEffect = ['STORMY', 'COLD', 'HOT'].includes(weather.condition) ? 0.10 : 0;

    // NIVEL DE FATIGA GRUPAL (0-100)
    // Promedio del departamento/turno basado en factores contextuales
    let baseFatigue = 25 + randomFloat(-10, 15);
    baseFatigue += mondayEffect * 100;
    baseFatigue += winterEffect * 100;
    baseFatigue -= holidayEffect * 50; // Personal de guardia suele estar más descansado
    baseFatigue += weatherEffect * 50;
    baseFatigue = Math.max(5, Math.min(85, baseFatigue));

    // NIVEL DE ESTRÉS GRUPAL (0-100)
    let baseStress = 30 + randomFloat(-12, 18);
    baseStress += fridayEffect * 100;
    baseStress += (isHolidayDay ? 15 : 0); // Trabajar feriado = más estrés
    baseStress += (dayOfWeek === 1 ? 10 : 0); // Lunes = más estrés
    baseStress += weatherEffect * 30;
    baseStress = Math.max(5, Math.min(90, baseStress));

    // DISTRIBUCIÓN EMOCIONAL GRUPAL (suma 100%)
    // Simula promedios de emociones detectadas por Azure Face
    const emotionBase = {
        neutral: 45 + randomFloat(-15, 20),
        happy: 25 + randomFloat(-10, 15),
        sad: 8 + randomFloat(-5, 8),
        angry: 5 + randomFloat(-3, 5),
        surprised: 7 + randomFloat(-4, 6),
        fearful: 5 + randomFloat(-3, 5),
        disgusted: 3 + randomFloat(-2, 3),
        contempt: 2 + randomFloat(-1, 2)
    };

    // Normalizar para que sume 100
    const emotionTotal = Object.values(emotionBase).reduce((a, b) => a + b, 0);
    const emotions = {};
    Object.keys(emotionBase).forEach(key => {
        emotions[key] = Math.round((emotionBase[key] / emotionTotal) * 1000) / 10; // 1 decimal
    });

    // ÍNDICE DE BIENESTAR GRUPAL (0-100)
    // Fórmula: mayor felicidad + menor estrés/fatiga = mayor bienestar
    const wellbeingIndex = Math.round(
        (emotions.happy * 1.5) + (emotions.neutral * 0.8) - (baseStress * 0.3) - (baseFatigue * 0.2)
    );

    return {
        // Métricas agregadas a nivel de grupo
        aggregation_level: 'department_shift', // Nivel de agregación
        sample_size: randomBetween(5, 25),     // Número de detecciones promediadas
        confidence_score: randomFloat(0.75, 0.95), // Confianza del modelo

        // Métricas de fatiga/estrés grupales
        fatigue_level: Math.round(baseFatigue * 10) / 10,
        stress_level: Math.round(baseStress * 10) / 10,
        wellbeing_index: Math.max(10, Math.min(90, wellbeingIndex)),

        // Distribución emocional del grupo
        emotion_distribution: emotions,

        // Factores contextuales que influyeron
        contextual_factors: {
            weather_impact: weatherEffect > 0,
            day_of_week_impact: dayOfWeek === 1 || dayOfWeek === 5,
            seasonal_impact: winterEffect > 0,
            holiday_impact: isHolidayDay
        },

        // Metadatos
        measurement_date: dateStr,
        department_id: departmentId,
        shift_id: shiftId
    };
}

/**
 * Genera tabla de biometría analítica agregada para inserción masiva
 */
async function generateBiometricAnalytics(sequelize, companyId, dates, departments, shifts) {
    console.log('\n📊 Generando datos de biometría analítica agregada...');
    console.log('   ⚠️ NOTA: Datos agregados a nivel departamento/turno (NO individuales)');

    // Verificar si existe la tabla
    const [tableExists] = await sequelize.query(`
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'biometric_analytics_aggregated'
        )
    `);

    // Siempre recrear la tabla para asegurar tipos correctos
    console.log('   📋 Creando/recreando tabla biometric_analytics_aggregated...');
    await sequelize.query(`DROP TABLE IF EXISTS biometric_analytics_aggregated CASCADE`);
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS biometric_analytics_aggregated (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL,
                measurement_date DATE NOT NULL,
                department_id TEXT,
                shift_id TEXT,
                aggregation_level VARCHAR(50) DEFAULT 'department_shift',
                sample_size INTEGER DEFAULT 0,
                confidence_score DECIMAL(3,2) DEFAULT 0.80,
                fatigue_level DECIMAL(5,2) DEFAULT 0,
                stress_level DECIMAL(5,2) DEFAULT 0,
                wellbeing_index DECIMAL(5,2) DEFAULT 0,
                emotion_neutral DECIMAL(5,2) DEFAULT 0,
                emotion_happy DECIMAL(5,2) DEFAULT 0,
                emotion_sad DECIMAL(5,2) DEFAULT 0,
                emotion_angry DECIMAL(5,2) DEFAULT 0,
                emotion_surprised DECIMAL(5,2) DEFAULT 0,
                emotion_fearful DECIMAL(5,2) DEFAULT 0,
                emotion_disgusted DECIMAL(5,2) DEFAULT 0,
                emotion_contempt DECIMAL(5,2) DEFAULT 0,
                weather_impact BOOLEAN DEFAULT false,
                day_impact BOOLEAN DEFAULT false,
                seasonal_impact BOOLEAN DEFAULT false,
                holiday_impact BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(company_id, measurement_date, department_id, shift_id)
            )
        `);

    // Limpiar datos anteriores del período (no necesario si recreamos la tabla)
    await sequelize.query(`
        DELETE FROM biometric_analytics_aggregated
        WHERE company_id = :companyId
        AND measurement_date >= :startDate
    `, {
        replacements: {
            companyId,
            startDate: dates[0]
        }
    });

    let insertedCount = 0;
    const batchSize = 100;
    let batchValues = [];

    for (const dateStr of dates) {
        const isWeekendDay = isWeekend(dateStr);
        const isHolidayDay = isHoliday(dateStr);
        const climateZone = 'TEMPERATE'; // Default
        const weather = generateWeatherForDate(dateStr, climateZone);

        // Generar métricas para cada combinación departamento/turno
        for (const dept of departments) {
            for (const shift of shifts) {
                const biometrics = generateAggregatedBiometrics(
                    dateStr, dept.id, shift.id, weather, isHolidayDay, isWeekendDay
                );

                batchValues.push(`(
                    ${companyId},
                    '${dateStr}',
                    ${dept.id ? `'${dept.id}'` : 'NULL'},
                    ${shift.id ? `'${shift.id}'` : 'NULL'},
                    '${biometrics.aggregation_level}',
                    ${biometrics.sample_size},
                    ${biometrics.confidence_score.toFixed(2)},
                    ${biometrics.fatigue_level},
                    ${biometrics.stress_level},
                    ${biometrics.wellbeing_index},
                    ${biometrics.emotion_distribution.neutral},
                    ${biometrics.emotion_distribution.happy},
                    ${biometrics.emotion_distribution.sad},
                    ${biometrics.emotion_distribution.angry},
                    ${biometrics.emotion_distribution.surprised},
                    ${biometrics.emotion_distribution.fearful},
                    ${biometrics.emotion_distribution.disgusted},
                    ${biometrics.emotion_distribution.contempt},
                    ${biometrics.contextual_factors.weather_impact},
                    ${biometrics.contextual_factors.day_of_week_impact},
                    ${biometrics.contextual_factors.seasonal_impact},
                    ${biometrics.contextual_factors.holiday_impact},
                    NOW()
                )`);

                insertedCount++;

                if (batchValues.length >= batchSize) {
                    await sequelize.query(`
                        INSERT INTO biometric_analytics_aggregated (
                            company_id, measurement_date, department_id, shift_id,
                            aggregation_level, sample_size, confidence_score,
                            fatigue_level, stress_level, wellbeing_index,
                            emotion_neutral, emotion_happy, emotion_sad, emotion_angry,
                            emotion_surprised, emotion_fearful, emotion_disgusted, emotion_contempt,
                            weather_impact, day_impact, seasonal_impact, holiday_impact,
                            created_at
                        ) VALUES ${batchValues.join(',\n')}
                        ON CONFLICT DO NOTHING
                    `);
                    batchValues = [];
                    process.stdout.write(`\r   📊 Biometría agregada: ${insertedCount} registros...`);
                }
            }
        }
    }

    // Insertar resto
    if (batchValues.length > 0) {
        await sequelize.query(`
            INSERT INTO biometric_analytics_aggregated (
                company_id, measurement_date, department_id, shift_id,
                aggregation_level, sample_size, confidence_score,
                fatigue_level, stress_level, wellbeing_index,
                emotion_neutral, emotion_happy, emotion_sad, emotion_angry,
                emotion_surprised, emotion_fearful, emotion_disgusted, emotion_contempt,
                weather_impact, day_impact, seasonal_impact, holiday_impact,
                created_at
            ) VALUES ${batchValues.join(',\n')}
            ON CONFLICT DO NOTHING
        `);
    }

    console.log(`\n   ✅ Biometría analítica agregada: ${insertedCount} registros`);
    return insertedCount;
}

// ============================================================================
// GENERADOR PRINCIPAL
// ============================================================================

async function generateComprehensiveTestData() {
    console.log('='.repeat(70));
    console.log('🚀 GENERADOR COMPLETO DE DATOS DE PRUEBA');
    console.log('='.repeat(70));
    console.log(`📅 Período: últimos ${CONFIG.DAYS_TO_GENERATE} días`);
    console.log('');

    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL');

        // Obtener empresa con más empleados (mínimo 10)
        const [companiesWithUsers] = await sequelize.query(`
            SELECT c.company_id as id, c.name, c.slug, COUNT(u.user_id) as user_count
            FROM companies c
            JOIN users u ON u.company_id = c.company_id
            WHERE u.role IN ('employee', 'supervisor', 'manager', 'admin')
            GROUP BY c.company_id, c.name, c.slug
            HAVING COUNT(u.user_id) >= 10
            ORDER BY COUNT(u.user_id) DESC
            LIMIT 1
        `);

        if (companiesWithUsers.length === 0) {
            // Fallback a cualquier empresa con usuarios
            const [fallbackCompanies] = await sequelize.query(`
                SELECT c.company_id as id, c.name, c.slug, COUNT(u.user_id) as user_count
                FROM companies c
                JOIN users u ON u.company_id = c.company_id
                GROUP BY c.company_id, c.name, c.slug
                ORDER BY COUNT(u.user_id) DESC
                LIMIT 1
            `);

            if (fallbackCompanies.length === 0) {
                throw new Error('No se encontró ninguna empresa con usuarios');
            }
            companiesWithUsers.push(fallbackCompanies[0]);
        }

        const company = companiesWithUsers[0];
        console.log(`🏢 Empresa: ${company.name} (ID: ${company.id}) - ${company.user_count} usuarios`);

        // Obtener usuarios de la empresa (incluyendo admin para tener más datos)
        const [users] = await sequelize.query(`
            SELECT user_id, "firstName", "lastName", department_id
            FROM users
            WHERE company_id = :companyId AND role IN ('employee', 'supervisor', 'manager', 'admin')
            ORDER BY user_id
        `, { replacements: { companyId: company.id } });

        console.log(`👥 Empleados encontrados: ${users.length}`);

        if (users.length === 0) {
            throw new Error('No se encontraron empleados');
        }

        // Obtener kioscos con GPS
        const [kiosks] = await sequelize.query(`
            SELECT id, name, gps_lat, gps_lng, device_id
            FROM kiosks
            WHERE company_id = :companyId AND is_active = true
        `, { replacements: { companyId: company.id } });

        console.log(`📟 Kioscos activos: ${kiosks.length}`);

        // Obtener o crear turnos
        let [shifts] = await sequelize.query(`
            SELECT id, name, "startTime", "endTime"
            FROM shifts
            WHERE company_id = :companyId AND "isActive" = true
        `, { replacements: { companyId: company.id } });

        if (shifts.length === 0) {
            console.log('⚠️ No hay turnos, creando turnos de ejemplo...');

            // Crear turnos básicos
            for (const [key, shift] of Object.entries(CONFIG.SHIFTS)) {
                await sequelize.query(`
                    INSERT INTO shifts (company_id, name, "startTime", "endTime", "isActive", created_at, updated_at)
                    VALUES (:companyId, :name, :startTime, :endTime, true, NOW(), NOW())
                    ON CONFLICT DO NOTHING
                `, {
                    replacements: {
                        companyId: company.id,
                        name: shift.name,
                        startTime: shift.start + ':00',
                        endTime: shift.end + ':00'
                    }
                });
            }

            [shifts] = await sequelize.query(`
                SELECT id, name, "startTime", "endTime"
                FROM shifts
                WHERE company_id = :companyId AND "isActive" = true
            `, { replacements: { companyId: company.id } });
        }

        console.log(`⏰ Turnos disponibles: ${shifts.map(s => s.name).join(', ')}`);

        // Asignar comportamiento a cada empleado
        const employeeBehaviors = {};
        users.forEach(user => {
            employeeBehaviors[user.user_id] = weightedRandom(CONFIG.EMPLOYEE_BEHAVIOR);
        });

        const behaviorCounts = {};
        Object.values(employeeBehaviors).forEach(b => {
            behaviorCounts[b] = (behaviorCounts[b] || 0) + 1;
        });
        console.log('📊 Distribución de comportamientos:', behaviorCounts);

        // Asignar turno a cada empleado (round-robin)
        const employeeShifts = {};
        users.forEach((user, idx) => {
            employeeShifts[user.user_id] = shifts[idx % shifts.length];
        });

        // Generar fechas
        const today = new Date();
        const dates = [];
        for (let i = CONFIG.DAYS_TO_GENERATE; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }

        console.log(`📆 Fechas a generar: ${dates[0]} a ${dates[dates.length - 1]}`);

        // Limpiar registros anteriores del período
        console.log('\n🧹 Limpiando registros anteriores...');
        const [deleteResult] = await sequelize.query(`
            DELETE FROM attendances
            WHERE company_id = :companyId
            AND date >= :startDate
            AND date <= :endDate
        `, {
            replacements: {
                companyId: company.id,
                startDate: dates[0],
                endDate: dates[dates.length - 1]
            }
        });
        console.log('✅ Registros anteriores eliminados');

        // Estadísticas de generación
        const stats = {
            total: 0,
            onTime: 0,
            late: 0,
            absent: 0,
            holidayWorkers: 0,
            coverageWorkers: 0,
            overtimeHours: 0,
            byWeather: {},
            byDayType: { normal: 0, weekend: 0, holiday: 0 },
            byShift: {},
            byBehavior: {},
            byOvertimeType: {}
        };

        // Generar registros
        console.log('\n📝 Generando registros de asistencia...\n');
        console.log('   🗓️ Incluye: Feriados con skeleton crew + Cobertura de ausencias + Horas extras\n');

        let batchValues = [];
        const BATCH_SIZE = 500;

        // Track de ausentes del día para cobertura
        let dailyAbsences = [];

        for (const dateStr of dates) {
            const dayName = getDayName(dateStr);
            const isWeekendDay = isWeekend(dateStr);
            const isHolidayDay = isHoliday(dateStr);
            const seasonalMult = getSeasonalMultiplier(dateStr);

            // Determinar tipo de día para stats
            let dayType = 'normal';
            if (isHolidayDay) dayType = 'holiday';
            else if (isWeekendDay) dayType = 'weekend';

            // Reset ausentes del día
            dailyAbsences = [];

            for (const user of users) {
                const behavior = employeeBehaviors[user.user_id];
                const shift = employeeShifts[user.user_id];
                const kiosk = kiosks[randomBetween(0, kiosks.length - 1)] || { id: null };

                // Determinar zona climática del kiosko
                const climateZone = getClimateZone(kiosk.gps_lat);
                const weather = generateWeatherForDate(dateStr, climateZone);

                // ============================================================
                // LÓGICA ESPECIAL PARA FERIADOS
                // ============================================================
                if (isHolidayDay) {
                    const isSkeletonCrew = isSkeletonCrewMember(user, users);

                    // Solo skeleton crew trabaja en feriados
                    if (!isSkeletonCrew) {
                        // Día libre por feriado (no es ausencia, es día no laborable)
                        stats.byDayType[dayType]++;
                        continue;
                    }

                    // Skeleton crew trabaja con horas extras
                    const lateMinutes = calculateLateMinutes(
                        behavior, dayName, weather, seasonalMult, isWeekendDay, true
                    );
                    const isLate = lateMinutes > 0;

                    const shiftStart = shift.startTime || '08:00:00';
                    const checkInTime = addMinutes(shiftStart.substring(0, 5), lateMinutes);

                    // HORAS EXTRAS EN FERIADO (2x)
                    const overtime = calculateHolidayOvertime(true, isWeekendDay, false, shift.name);
                    let workMinutes = 8 * 60 + overtime.overtimeMinutes;

                    let checkOutTime = addMinutes(shiftStart.substring(0, 5), lateMinutes + workMinutes);
                    checkOutTime = addMinutes(checkOutTime.substring(0, 5), randomBetween(-10, 20));

                    const status = isLate ? 'late' : 'present';

                    batchValues.push({
                        company_id: company.id,
                        UserId: user.user_id,
                        date: dateStr,
                        status: status,
                        is_late: isLate,
                        late_minutes: lateMinutes,
                        kiosk_id: kiosk.id,
                        checkInTime: checkInTime,
                        checkOutTime: checkOutTime,
                        weather_condition: weather.condition,
                        weather_temperature: weather.temperature,
                        climate_zone: climateZone,
                        shift_id: shift.id,
                        overtime_minutes: overtime.overtimeMinutes,
                        overtime_type: overtime.overtimeType,
                        overtime_multiplier: overtime.multiplier
                    });

                    stats.total++;
                    stats.holidayWorkers++;
                    stats.overtimeHours += overtime.overtimeMinutes / 60;
                    if (isLate) stats.late++;
                    else stats.onTime++;

                    stats.byWeather[weather.condition] = (stats.byWeather[weather.condition] || 0) + 1;
                    stats.byDayType[dayType]++;
                    stats.byShift[shift.name] = (stats.byShift[shift.name] || 0) + 1;
                    stats.byBehavior[behavior] = (stats.byBehavior[behavior] || 0) + 1;
                    stats.byOvertimeType[overtime.overtimeType] = (stats.byOvertimeType[overtime.overtimeType] || 0) + 1;

                    continue;
                }

                // ============================================================
                // LÓGICA PARA DÍAS NORMALES Y FINES DE SEMANA
                // ============================================================

                // ¿Debería estar ausente?
                if (shouldBeAbsent(behavior, dayName, weather, isWeekendDay)) {
                    const absence = generateAbsenceReason();

                    batchValues.push({
                        company_id: company.id,
                        UserId: user.user_id,
                        date: dateStr,
                        status: 'absent',
                        is_late: false,
                        kiosk_id: null,
                        checkInTime: null,
                        checkOutTime: null,
                        absence_type: absence.type,
                        absence_justified: absence.justified,
                        absence_reason: absence.reason,
                        weather_condition: weather.condition,
                        weather_temperature: weather.temperature,
                        climate_zone: climateZone
                    });

                    // Agregar a lista de ausentes para posible cobertura
                    dailyAbsences.push({
                        user,
                        shift,
                        absence
                    });

                    stats.absent++;
                    stats.byDayType[dayType]++;
                    stats.byBehavior[behavior] = (stats.byBehavior[behavior] || 0) + 1;
                    continue;
                }

                // ¿Es trabajador de cobertura y hay ausentes que cubrir?
                const isCoverage = isCoverageWorker(user, users);
                const needsCoverage = dailyAbsences.length > 0 && isCoverage && Math.random() < 0.40;

                // Calcular tardanza
                const lateMinutes = calculateLateMinutes(
                    behavior, dayName, weather, seasonalMult, isWeekendDay, false
                );
                const isLate = lateMinutes > 0;

                // Calcular hora de entrada
                const shiftStart = shift.startTime || '08:00:00';
                const checkInTime = addMinutes(shiftStart.substring(0, 5), lateMinutes);

                // Calcular hora de salida (8h + posible overtime)
                let workMinutes = 8 * 60;
                let overtime = { overtimeMinutes: 0, overtimeType: 'none', multiplier: 1.0 };

                if (needsCoverage) {
                    // Trabajador de cobertura: horas extra por cubrir ausencia
                    overtime = calculateHolidayOvertime(false, isWeekendDay, true, shift.name);
                    workMinutes += overtime.overtimeMinutes;
                    stats.coverageWorkers++;
                } else if (Math.random() < 0.15) {
                    // 15% hace horas extra normales
                    overtime.overtimeMinutes = randomBetween(30, 180);
                    overtime.overtimeType = isWeekendDay ? 'weekend_overtime' : 'normal_overtime';
                    overtime.multiplier = isWeekendDay ? 1.5 : 1.5;
                    workMinutes += overtime.overtimeMinutes;
                }

                if (overtime.overtimeMinutes > 0) {
                    stats.overtimeHours += overtime.overtimeMinutes / 60;
                    stats.byOvertimeType[overtime.overtimeType] = (stats.byOvertimeType[overtime.overtimeType] || 0) + 1;
                }

                let checkOutTime = addMinutes(shiftStart.substring(0, 5), lateMinutes + workMinutes);

                // Variación aleatoria en salida (-15 a +30 min)
                checkOutTime = addMinutes(checkOutTime.substring(0, 5), randomBetween(-15, 30));

                const status = isLate ? 'late' : 'present';

                batchValues.push({
                    company_id: company.id,
                    UserId: user.user_id,
                    date: dateStr,
                    status: status,
                    is_late: isLate,
                    late_minutes: lateMinutes,
                    kiosk_id: kiosk.id,
                    checkInTime: checkInTime,
                    checkOutTime: checkOutTime,
                    weather_condition: weather.condition,
                    weather_temperature: weather.temperature,
                    climate_zone: climateZone,
                    shift_id: shift.id,
                    overtime_minutes: overtime.overtimeMinutes,
                    overtime_type: overtime.overtimeType,
                    overtime_multiplier: overtime.multiplier
                });

                // Actualizar estadísticas
                stats.total++;
                if (isLate) stats.late++;
                else stats.onTime++;

                stats.byWeather[weather.condition] = (stats.byWeather[weather.condition] || 0) + 1;
                stats.byDayType[dayType]++;
                stats.byShift[shift.name] = (stats.byShift[shift.name] || 0) + 1;
                stats.byBehavior[behavior] = (stats.byBehavior[behavior] || 0) + 1;

                // Insertar en batch
                if (batchValues.length >= BATCH_SIZE) {
                    await insertBatch(batchValues);
                    process.stdout.write(`\r   📊 Insertados: ${stats.total + stats.absent} registros...`);
                    batchValues = [];
                }
            }
        }

        // Insertar registros restantes
        if (batchValues.length > 0) {
            await insertBatch(batchValues);
        }

        console.log(`\n\n✅ Generación completada!`);
        console.log('');
        console.log('='.repeat(70));
        console.log('📊 RESUMEN DE DATOS GENERADOS');
        console.log('='.repeat(70));
        console.log(`   Total registros: ${stats.total + stats.absent}`);
        console.log(`   ✅ A tiempo: ${stats.onTime} (${((stats.onTime / stats.total) * 100).toFixed(1)}%)`);
        console.log(`   ⏰ Tarde: ${stats.late} (${((stats.late / stats.total) * 100).toFixed(1)}%)`);
        console.log(`   ❌ Ausentes: ${stats.absent}`);
        console.log('');
        console.log('🗓️ Feriados y Cobertura:');
        console.log(`   👷 Trabajadores en feriados (skeleton crew): ${stats.holidayWorkers}`);
        console.log(`   🔄 Trabajadores cubriendo ausencias: ${stats.coverageWorkers}`);
        console.log(`   ⏱️ Total horas extra generadas: ${stats.overtimeHours.toFixed(1)}h`);
        console.log('');
        console.log('📅 Por tipo de día:');
        Object.entries(stats.byDayType).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });
        console.log('');
        console.log('💰 Por tipo de horas extra:');
        Object.entries(stats.byOvertimeType).forEach(([type, count]) => {
            if (type !== 'none') {
                console.log(`   ${type}: ${count} registros`);
            }
        });
        console.log('');
        console.log('🌤️ Por condición climática:');
        Object.entries(stats.byWeather).forEach(([weather, count]) => {
            console.log(`   ${weather}: ${count}`);
        });
        console.log('');
        console.log('⏰ Por turno:');
        Object.entries(stats.byShift).forEach(([shift, count]) => {
            console.log(`   ${shift}: ${count}`);
        });
        console.log('');
        console.log('👤 Por comportamiento:');
        Object.entries(stats.byBehavior).forEach(([behavior, count]) => {
            console.log(`   ${behavior}: ${count}`);
        });
        console.log('');
        console.log('='.repeat(70));

        // Actualizar campos adicionales en attendances
        console.log('\n🔄 Actualizando campos calculados...');

        await sequelize.query(`
            UPDATE attendances a
            SET
                "workingHours" = EXTRACT(EPOCH FROM ("checkOutTime"::time - "checkInTime"::time)) / 3600,
                is_late = CASE WHEN minutes_late > 0 THEN true ELSE false END
            WHERE company_id = :companyId
            AND date >= :startDate
        `, {
            replacements: {
                companyId: company.id,
                startDate: dates[0]
            }
        });

        console.log('✅ Campos calculados actualizados');

        // Verificar datos generados
        console.log('\n🔍 Verificando datos generados...');

        const [verification] = await sequelize.query(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'late' OR is_late = true THEN 1 END) as late,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                COUNT(DISTINCT "UserId") as unique_users,
                COUNT(DISTINCT date) as unique_dates,
                MIN(date) as first_date,
                MAX(date) as last_date,
                AVG(minutes_late) FILTER (WHERE minutes_late > 0) as avg_late_minutes
            FROM attendances
            WHERE company_id = :companyId
            AND date >= :startDate
        `, {
            replacements: {
                companyId: company.id,
                startDate: dates[0]
            }
        });

        const v = verification[0];
        console.log('');
        console.log('📋 VERIFICACIÓN EN BASE DE DATOS:');
        console.log(`   Total registros: ${v.total}`);
        console.log(`   Presentes: ${v.present}`);
        console.log(`   Tarde: ${v.late}`);
        console.log(`   Ausentes: ${v.absent}`);
        console.log(`   Usuarios únicos: ${v.unique_users}`);
        console.log(`   Fechas únicas: ${v.unique_dates}`);
        console.log(`   Rango: ${v.first_date} a ${v.last_date}`);
        console.log(`   Promedio tardanza: ${parseFloat(v.avg_late_minutes || 0).toFixed(1)} min`);

        // ============================================================
        // GENERAR BIOMETRÍA ANALÍTICA AGREGADA (NO INDIVIDUAL)
        // ============================================================

        // Obtener departamentos
        const [departments] = await sequelize.query(`
            SELECT id, name FROM departments
            WHERE company_id = :companyId
        `, { replacements: { companyId: company.id } });

        if (departments.length > 0 && shifts.length > 0) {
            await generateBiometricAnalytics(sequelize, company.id, dates, departments, shifts);
        } else {
            console.log('\n⚠️ No se generó biometría analítica: faltan departamentos o turnos');
        }

        console.log('\n🎉 ¡Datos de prueba generados exitosamente!');
        console.log('   Ahora puedes probar todas las métricas del dashboard.');
        console.log('');
        console.log('📊 DATOS GENERADOS:');
        console.log('   ✅ Asistencias (90 días)');
        console.log('   ✅ Tardanzas con patrones realistas');
        console.log('   ✅ Ausencias con razones');
        console.log('   ✅ Horas extra en feriados (2x)');
        console.log('   ✅ Cobertura de ausencias');
        console.log('   ✅ Biometría analítica AGREGADA (fatiga, estrés, emociones por depto/turno)');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

async function insertBatch(records) {
    if (records.length === 0) return;

    const values = records.map(r => {
        // Convertir shift_id UUID a NULL si no es numérico (la columna es bigint)
        const shiftId = r.shift_id ? (typeof r.shift_id === 'number' ? r.shift_id : 'NULL') : 'NULL';

        // Calcular fecha de salida (día siguiente si turno nocturno)
        let checkOutDate = r.date;
        if (r.checkInTime && r.checkOutTime) {
            const checkInHour = parseInt(r.checkInTime.split(':')[0]);
            const checkOutHour = parseInt(r.checkOutTime.split(':')[0]);
            // Si checkOut es antes que checkIn (ej: entrada 22:00, salida 06:00)
            // significa que la salida es al día siguiente
            if (checkOutHour < checkInHour && checkInHour >= 18) {
                const nextDay = new Date(r.date);
                nextDay.setDate(nextDay.getDate() + 1);
                checkOutDate = nextDay.toISOString().split('T')[0];
            }
        }

        return `(
            gen_random_uuid(),
            ${r.company_id},
            '${r.UserId}',
            '${r.date}',
            '${r.status}',
            ${r.is_late},
            ${r.late_minutes || 0},
            ${r.kiosk_id || 'NULL'},
            ${r.checkInTime ? `'${r.date} ${r.checkInTime}'` : 'NULL'},
            ${r.checkOutTime ? `'${checkOutDate} ${r.checkOutTime}'` : 'NULL'},
            ${shiftId},
            NOW(),
            NOW()
        )`;
    }).join(',\n');

    await sequelize.query(`
        INSERT INTO attendances (
            id, company_id, "UserId", date, status, is_late, minutes_late,
            kiosk_id, "checkInTime", "checkOutTime",
            shift_id, "createdAt", "updatedAt"
        ) VALUES ${values}
        ON CONFLICT DO NOTHING
    `);
}

// Ejecutar
generateComprehensiveTestData()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
