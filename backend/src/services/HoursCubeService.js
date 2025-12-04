/**
 * HoursCubeService.js
 *
 * Servicio de Cubo de Horas Multidimensional
 * Sistema de Estadísticas Avanzadas v2.0
 *
 * DIMENSIONES DEL CUBO:
 * 1. Temporal (día, semana, mes, trimestre)
 * 2. Organizacional (empresa → sucursal → departamento)
 * 3. Operacional (tipo de turno, tipo de hora)
 *
 * MÉTRICAS:
 * - Horas normales totales
 * - Horas extras 50% totales
 * - Horas extras 100% totales
 * - Horas de reposición (illness/vacation coverage)
 * - Porcentajes de participación en cada nivel
 *
 * METODOLOGÍA:
 * - Agregaciones OLAP-style para drill-down
 * - Cálculo de porcentajes respecto a padre
 * - Comparativas entre períodos
 */

const { Op, fn, col, literal } = require('sequelize');

class HoursCubeService {
    constructor(db) {
        this.db = db;
        this.models = db.models || db;

        // =====================================================================
        // CONFIGURACIÓN DINÁMICA - Los multiplicadores vienen del TURNO asignado
        // Cada empresa configura sus propios multiplicadores en shift.hourlyRates
        // =====================================================================

        // Clasificación de turnos por hora de entrada (para visualización)
        this.SHIFT_CLASSIFICATIONS = {
            morning_early: { name: 'Turno Mañana Temprano', startHour: 5, endHour: 7, description: 'Entrada 05:00-06:59' },
            central: { name: 'Turno Central (8-17)', startHour: 7, endHour: 9, description: 'Jornada diurna estándar' },
            morning_late: { name: 'Turno Mañana', startHour: 9, endHour: 12, description: 'Entrada 09:00-11:59' },
            afternoon: { name: 'Turno Tarde', startHour: 12, endHour: 18, description: 'Entrada 12:00-17:59' },
            night: { name: 'Turno Noche', startHour: 18, endHour: 24, description: 'Jornada nocturna' },
            unknown: { name: 'Sin Clasificar', startHour: null, endHour: null, description: 'Sin hora de entrada registrada' }
        };

        // Multiplicadores por DEFECTO (solo se usan si el turno no tiene hourlyRates)
        // Cada turno puede tener sus propios multiplicadores configurados
        this.DEFAULT_HOUR_TYPES = {
            normal: { name: 'Horas Normales', multiplier: 1.0, color: '#4CAF50' },
            overtime: { name: 'Horas Extras', multiplier: 1.5, color: '#FF9800' },
            overtime50: { name: 'Horas Extras 50%', multiplier: 1.5, color: '#FF9800' },
            overtime100: { name: 'Horas Extras 100%', multiplier: 2.0, color: '#F44336' },
            holiday: { name: 'Feriado', multiplier: 2.0, color: '#9C27B0' },
            weekend: { name: 'Fin de Semana', multiplier: 1.5, color: '#2196F3' }
        };

        // Cache de feriados para evitar múltiples queries
        this._holidayCache = new Map();

        // Configuración de análisis
        this.ANALYSIS_CONFIG = {
            minRecordsForAnalysis: 10,
            outlierThresholdIQR: 1.5,
            overtimeAlertThreshold: 20,
            departmentOvertimeAlert: 30,
            shiftConcentrationAlert: 70
        };
    }

    // ============================================================================
    // OBTENCIÓN DE MULTIPLICADORES DESDE EL TURNO
    // ============================================================================

    /**
     * Obtiene los multiplicadores de un turno específico o usa defaults
     */
    _getMultipliersForShift(shiftHourlyRates) {
        const defaults = {
            normal: 1.0,
            overtime: 1.5,
            weekend: 1.5,
            holiday: 2.0
        };

        if (!shiftHourlyRates || typeof shiftHourlyRates !== 'object') {
            return defaults;
        }

        return {
            normal: shiftHourlyRates.normal ?? defaults.normal,
            overtime: shiftHourlyRates.overtime ?? defaults.overtime,
            overtime50: shiftHourlyRates.overtime ?? defaults.overtime,
            overtime100: (shiftHourlyRates.overtime ?? defaults.overtime) + 0.5,
            weekend: shiftHourlyRates.weekend ?? defaults.weekend,
            holiday: shiftHourlyRates.holiday ?? defaults.holiday
        };
    }

    // ============================================================================
    // SISTEMA DE FERIADOS DINÁMICO
    // ============================================================================

    /**
     * Verifica si una fecha es feriado según la ubicación de la sucursal
     */
    async _isHoliday(date, country, stateProvince = null, shiftConfig = {}) {
        // Verificar cache primero
        const cacheKey = `${date}_${country}_${stateProvince}`;
        if (this._holidayCache.has(cacheKey)) {
            return this._holidayCache.get(cacheKey);
        }

        try {
            const Holiday = this.models.Holiday;

            if (!Holiday) {
                // Fallback: usar query raw si el modelo no está disponible
                const [results] = await this.db.sequelize.query(`
                    SELECT id FROM holidays
                    WHERE date = :date
                      AND country = :country
                      AND (state_province IS NULL OR state_province = :stateProvince OR :stateProvince IS NULL)
                    LIMIT 1
                `, {
                    replacements: { date, country, stateProvince },
                    type: this.db.QueryTypes?.SELECT || 'SELECT'
                });
                const isHoliday = results && results.length > 0;
                this._holidayCache.set(cacheKey, isHoliday);
                return isHoliday;
            }

            // Usar el método del modelo Holiday
            const isHoliday = await Holiday.isHoliday(
                date,
                country,
                stateProvince,
                shiftConfig.respect_national_holidays !== false,  // Default: true
                shiftConfig.respect_provincial_holidays === true   // Default: false
            );

            this._holidayCache.set(cacheKey, isHoliday);
            return isHoliday;

        } catch (error) {
            console.warn('⚠️ Error verificando feriado:', error.message);
            return false;
        }
    }

    /**
     * Obtiene todos los feriados para un rango de fechas
     */
    async _getHolidaysInRange(startDate, endDate, country, stateProvince = null) {
        try {
            const Holiday = this.models.Holiday;

            if (Holiday && Holiday.getHolidaysInRange) {
                return await Holiday.getHolidaysInRange(startDate, endDate, country, stateProvince);
            }

            // Fallback: query raw
            const [results] = await this.db.sequelize.query(`
                SELECT date, name, is_national, is_provincial
                FROM holidays
                WHERE date BETWEEN :startDate AND :endDate
                  AND country = :country
                  AND (state_province IS NULL OR state_province = :stateProvince OR :stateProvince IS NULL)
                ORDER BY date
            `, {
                replacements: { startDate, endDate, country, stateProvince },
                type: this.db.QueryTypes?.SELECT || 'SELECT'
            });

            return results || [];
        } catch (error) {
            console.warn('⚠️ Error obteniendo feriados:', error.message);
            return [];
        }
    }

    /**
     * Verifica si una fecha es día no laborable personalizado del turno
     */
    _isCustomNonWorkingDay(date, customNonWorkingDays) {
        if (!customNonWorkingDays || !Array.isArray(customNonWorkingDays)) {
            return false;
        }
        const dateStr = typeof date === 'string' ? date.split('T')[0] : date.toISOString().split('T')[0];
        return customNonWorkingDays.includes(dateStr);
    }

    // ============================================================================
    // MÉTODO PRINCIPAL: Generar Cubo Completo
    // ============================================================================

    async generateHoursCube(companyId, dateRange = {}) {
        try {
            const startDate = dateRange.startDate || this._getDefaultStartDate();
            const endDate = dateRange.endDate || new Date();

            console.log(`📊 [HOURS CUBE] Generando cubo para empresa ${companyId}`);
            console.log(`   Período: ${startDate.toISOString().split('T')[0]} a ${endDate.toISOString().split('T')[0]}`);

            // 1. Obtener datos crudos de asistencia
            const rawData = await this._getRawAttendanceData(companyId, startDate, endDate);

            if (!rawData || rawData.length === 0) {
                return {
                    success: false,
                    message: 'No hay datos de asistencia en el período especificado',
                    companyId,
                    period: { startDate, endDate }
                };
            }

            // 2. Obtener estructura organizacional
            const orgStructure = await this._getOrganizationalStructure(companyId);

            // 3. Procesar y clasificar cada registro (usa multiplicadores del turno + holidays)
            const processedData = await this._processAttendanceData(rawData);

            // 4. Construir cubo con agregaciones
            const cube = this._buildCube(processedData, orgStructure);

            // 5. Calcular totales y porcentajes
            const enrichedCube = this._enrichWithPercentages(cube);

            // 6. Generar resumen ejecutivo
            const executiveSummary = this._generateExecutiveSummary(enrichedCube);

            return {
                success: true,
                companyId,
                period: {
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    daysInPeriod: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
                },
                recordsProcessed: rawData.length,
                executiveSummary,
                cube: enrichedCube,
                dimensions: {
                    branches: Object.keys(enrichedCube.byBranch || {}),
                    departments: Object.keys(enrichedCube.byDepartment || {}),
                    shiftTypes: Object.keys(enrichedCube.byShiftType || {}),
                    hourTypes: Object.keys(this.DEFAULT_HOUR_TYPES)
                },
                metadata: {
                    shiftClassifications: this.SHIFT_CLASSIFICATIONS,
                    hourTypes: this.DEFAULT_HOUR_TYPES,
                    note: 'Los multiplicadores reales vienen del turno asignado a cada empleado (shift.hourlyRates)',
                    holidaysSource: 'Tabla holidays filtrada por país/provincia de la sucursal',
                    generatedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('❌ [HOURS CUBE] Error:', error);
            return {
                success: false,
                error: error.message,
                companyId
            };
        }
    }

    // ============================================================================
    // OBTENCIÓN DE DATOS
    // ============================================================================

    async _getRawAttendanceData(companyId, startDate, endDate) {
        try {
            // Query enriquecido con datos del TURNO y SUCURSAL para multiplicadores y feriados
            const [results] = await this.db.sequelize.query(`
                SELECT
                    a.id,
                    a.user_id,
                    a.date,
                    a.check_in,
                    a.check_out,
                    a.status,
                    a.absence_type,
                    COALESCE(a.worked_hours, 0) as worked_hours,
                    COALESCE(a.scheduled_hours, 8) as scheduled_hours,
                    COALESCE(a.overtime_hours, 0) as overtime_hours,
                    COALESCE(a.overtime_type, 'overtime50') as overtime_type,
                    COALESCE(a.department_id, u.department_id) as department_id,
                    u.branch_id,
                    u.first_name,
                    u.last_name,
                    d.name as department_name,
                    b.name as branch_name,
                    b.country as branch_country,
                    b.state_province as branch_state,
                    EXTRACT(DOW FROM a.date) as day_of_week,
                    EXTRACT(HOUR FROM a.check_in) as check_in_hour,
                    -- Datos del TURNO asignado al usuario
                    s.id as shift_id,
                    s.name as shift_name,
                    s."hourlyRates" as shift_hourly_rates,
                    s.respect_national_holidays,
                    s.respect_provincial_holidays,
                    s.custom_non_working_days
                FROM attendance a
                JOIN users u ON a.user_id = u.id
                LEFT JOIN departments d ON COALESCE(a.department_id, u.department_id) = d.id
                LEFT JOIN branches b ON u.branch_id = b.id
                LEFT JOIN shifts s ON u.shift_id = s.id OR (
                    -- Fallback: buscar en user_shift_assignments si no hay shift directo
                    SELECT usa.shift_id FROM user_shift_assignments usa
                    WHERE usa.user_id = u.id AND usa.is_active = true
                    ORDER BY usa.created_at DESC LIMIT 1
                ) = s.id
                WHERE u.company_id = :companyId
                  AND a.date BETWEEN :startDate AND :endDate
                ORDER BY a.date, u.branch_id, d.id
            `, {
                replacements: { companyId, startDate, endDate },
                type: this.db.QueryTypes?.SELECT || 'SELECT'
            });

            return results || [];

        } catch (error) {
            console.error('Error obteniendo datos crudos:', error);
            return [];
        }
    }

    async _getOrganizationalStructure(companyId) {
        try {
            // Obtener sucursales
            const [branches] = await this.db.sequelize.query(`
                SELECT id, name, address, city
                FROM branches
                WHERE company_id = :companyId AND is_active = true
            `, {
                replacements: { companyId },
                type: this.db.QueryTypes?.SELECT || 'SELECT'
            });

            // Obtener departamentos
            const [departments] = await this.db.sequelize.query(`
                SELECT id, name, branch_id
                FROM departments
                WHERE company_id = :companyId AND is_active = true
            `, {
                replacements: { companyId },
                type: this.db.QueryTypes?.SELECT || 'SELECT'
            });

            return {
                branches: branches || [],
                departments: departments || [],
                branchMap: (branches || []).reduce((acc, b) => ({ ...acc, [b.id]: b }), {}),
                departmentMap: (departments || []).reduce((acc, d) => ({ ...acc, [d.id]: d }), {})
            };

        } catch (error) {
            console.error('Error obteniendo estructura organizacional:', error);
            return { branches: [], departments: [], branchMap: {}, departmentMap: {} };
        }
    }

    // ============================================================================
    // PROCESAMIENTO DE DATOS
    // ============================================================================

    /**
     * Procesa los datos de asistencia usando los multiplicadores del TURNO asignado
     * y verifica feriados según la ubicación de la sucursal
     */
    async _processAttendanceData(rawData) {
        // Precargar feriados para el rango de fechas (evitar N+1 queries)
        const dates = rawData.map(r => r.date);
        const minDate = dates.reduce((a, b) => a < b ? a : b);
        const maxDate = dates.reduce((a, b) => a > b ? a : b);

        // Obtener países únicos de las sucursales
        const countries = [...new Set(rawData.map(r => r.branch_country).filter(Boolean))];

        // Precargar todos los feriados del período
        const holidaysByCountry = {};
        for (const country of countries) {
            const holidays = await this._getHolidaysInRange(minDate, maxDate, country);
            holidaysByCountry[country] = new Set(holidays.map(h => {
                const d = h.date;
                return typeof d === 'string' ? d.split('T')[0] : d.toISOString().split('T')[0];
            }));
        }

        return rawData.map(record => {
            // Obtener multiplicadores del TURNO del empleado o usar defaults
            const shiftHourlyRates = record.shift_hourly_rates || {};
            const multipliers = this._getMultipliersForShift(shiftHourlyRates);

            // Clasificar tipo de turno por hora de entrada
            const shiftType = this._classifyShiftType(record.check_in_hour, record.day_of_week);

            // Detectar si es fin de semana
            const isWeekend = record.day_of_week === 0 || record.day_of_week === 6;

            // Detectar si es FERIADO (usando sistema dinámico)
            const dateStr = typeof record.date === 'string'
                ? record.date.split('T')[0]
                : record.date?.toISOString().split('T')[0];

            let isHoliday = false;
            const country = record.branch_country;

            // Verificar si es feriado (respetando config del turno)
            if (country && holidaysByCountry[country]) {
                const shouldCheckHolidays = record.respect_national_holidays !== false;
                if (shouldCheckHolidays) {
                    isHoliday = holidaysByCountry[country].has(dateStr);
                }
            }

            // Verificar días no laborables personalizados del turno
            const isCustomNonWorking = this._isCustomNonWorkingDay(
                dateStr,
                record.custom_non_working_days
            );

            // Calcular horas extras si no están explícitas
            let normalHours = 0;
            let overtime50 = 0;
            let overtime100 = 0;

            const workedHours = parseFloat(record.worked_hours) || 0;
            const scheduledHours = parseFloat(record.scheduled_hours) || 8;
            const explicitOvertime = parseFloat(record.overtime_hours) || 0;

            if (record.status === 'present') {
                if (explicitOvertime > 0) {
                    normalHours = Math.min(workedHours, scheduledHours);
                    if (record.overtime_type === 'overtime100') {
                        overtime100 = explicitOvertime;
                    } else {
                        overtime50 = explicitOvertime;
                    }
                } else if (workedHours > scheduledHours) {
                    normalHours = scheduledHours;
                    const extraHours = workedHours - scheduledHours;
                    // Primeras 2 horas extras son overtime normal, resto son overtime100
                    overtime50 = Math.min(extraHours, 2);
                    overtime100 = Math.max(0, extraHours - 2);
                } else {
                    normalHours = workedHours;
                }
            }

            // Calcular costo ponderado usando multiplicadores del TURNO
            let weightedCost = normalHours * multipliers.normal;

            // Si es feriado o día no laborable custom, usar multiplicador de feriado
            if (isHoliday || isCustomNonWorking) {
                weightedCost += (overtime50 + overtime100) * multipliers.holiday;
            } else if (isWeekend) {
                // Fin de semana: usar multiplicador de weekend
                weightedCost += (overtime50 + overtime100) * multipliers.weekend;
            } else {
                // Día normal: usar multiplicador de overtime
                weightedCost += overtime50 * multipliers.overtime;
                weightedCost += overtime100 * (multipliers.overtime100 || multipliers.overtime + 0.5);
            }

            return {
                ...record,
                shiftType,
                normalHours,
                overtime50,
                overtime100,
                isWeekend,
                isHoliday,
                isCustomNonWorking,
                totalHours: normalHours + overtime50 + overtime100,
                weightedCost,
                // Guardar multiplicadores usados para transparencia
                multipliersUsed: multipliers,
                shiftName: record.shift_name || 'Sin turno asignado'
            };
        });
    }

    _classifyShiftType(checkInHour, dayOfWeek) {
        if (checkInHour === null || checkInHour === undefined) {
            return 'unknown';
        }

        const hour = parseInt(checkInHour);

        // Turno central (8-17): entrada entre 7 y 9
        if (hour >= 7 && hour <= 9) {
            return 'central_8_17';
        }

        // Turno mañana temprano (5-7)
        if (hour >= 5 && hour < 7) {
            return 'morning_early';
        }

        // Turno mañana (9-12)
        if (hour > 9 && hour < 12) {
            return 'morning_late';
        }

        // Turno tarde (12-18)
        if (hour >= 12 && hour < 18) {
            return 'afternoon';
        }

        // Turno noche (18-23 o 0-5)
        if (hour >= 18 || hour < 5) {
            return 'night';
        }

        return 'unknown';
    }

    // ============================================================================
    // CONSTRUCCIÓN DEL CUBO
    // ============================================================================

    _buildCube(processedData, orgStructure) {
        const cube = {
            totals: {
                normalHours: 0,
                overtime50: 0,
                overtime100: 0,
                totalHours: 0,
                weightedCost: 0,
                recordCount: 0,
                presentCount: 0,
                absentCount: 0
            },
            byBranch: {},
            byDepartment: {},
            byShiftType: {},
            byHourType: {
                normal: 0,
                overtime50: 0,
                overtime100: 0
            },
            // Matriz cruzada: Branch x Department x ShiftType
            matrix: {}
        };

        processedData.forEach(record => {
            const branchId = record.branch_id || 'unassigned';
            const branchName = record.branch_name || 'Sin Sucursal';
            const deptId = record.department_id || 'unassigned';
            const deptName = record.department_name || 'Sin Departamento';
            const shiftType = record.shiftType || 'unknown';

            // Totales globales
            cube.totals.normalHours += record.normalHours;
            cube.totals.overtime50 += record.overtime50;
            cube.totals.overtime100 += record.overtime100;
            cube.totals.totalHours += record.totalHours;
            cube.totals.weightedCost += record.weightedCost;
            cube.totals.recordCount++;
            if (record.status === 'present') cube.totals.presentCount++;
            if (record.status === 'absent') cube.totals.absentCount++;

            // Por sucursal
            if (!cube.byBranch[branchId]) {
                cube.byBranch[branchId] = this._createEmptyNode(branchName);
                cube.byBranch[branchId].byDepartment = {};
            }
            this._addToNode(cube.byBranch[branchId], record);

            // Por departamento dentro de sucursal
            if (!cube.byBranch[branchId].byDepartment[deptId]) {
                cube.byBranch[branchId].byDepartment[deptId] = this._createEmptyNode(deptName);
                cube.byBranch[branchId].byDepartment[deptId].byShiftType = {};
            }
            this._addToNode(cube.byBranch[branchId].byDepartment[deptId], record);

            // Por tipo de turno dentro de departamento
            if (!cube.byBranch[branchId].byDepartment[deptId].byShiftType[shiftType]) {
                cube.byBranch[branchId].byDepartment[deptId].byShiftType[shiftType] =
                    this._createEmptyNode(this._getShiftTypeName(shiftType));
            }
            this._addToNode(cube.byBranch[branchId].byDepartment[deptId].byShiftType[shiftType], record);

            // Agregaciones planas (sin jerarquía)
            if (!cube.byDepartment[deptId]) {
                cube.byDepartment[deptId] = this._createEmptyNode(deptName);
            }
            this._addToNode(cube.byDepartment[deptId], record);

            if (!cube.byShiftType[shiftType]) {
                cube.byShiftType[shiftType] = this._createEmptyNode(this._getShiftTypeName(shiftType));
            }
            this._addToNode(cube.byShiftType[shiftType], record);

            // Acumuladores por tipo de hora
            cube.byHourType.normal += record.normalHours;
            cube.byHourType.overtime50 += record.overtime50;
            cube.byHourType.overtime100 += record.overtime100;
        });

        return cube;
    }

    _createEmptyNode(name) {
        return {
            name,
            normalHours: 0,
            overtime50: 0,
            overtime100: 0,
            totalHours: 0,
            weightedCost: 0,
            recordCount: 0,
            presentCount: 0,
            absentCount: 0
        };
    }

    _addToNode(node, record) {
        node.normalHours += record.normalHours;
        node.overtime50 += record.overtime50;
        node.overtime100 += record.overtime100;
        node.totalHours += record.totalHours;
        node.weightedCost += record.weightedCost;
        node.recordCount++;
        if (record.status === 'present') node.presentCount++;
        if (record.status === 'absent') node.absentCount++;
    }

    _getShiftTypeName(shiftType) {
        const names = {
            'central_8_17': 'Turno Central (8-17)',
            'morning_early': 'Turno Mañana Temprano',
            'morning_late': 'Turno Mañana',
            'afternoon': 'Turno Tarde',
            'night': 'Turno Noche',
            'unknown': 'No Clasificado'
        };
        return names[shiftType] || shiftType;
    }

    // ============================================================================
    // ENRIQUECIMIENTO CON PORCENTAJES
    // ============================================================================

    _enrichWithPercentages(cube) {
        const totals = cube.totals;

        // Función helper para calcular porcentajes
        const calcPercentages = (node, parent) => {
            node.percentOfParent = {
                normalHours: parent.normalHours > 0
                    ? (node.normalHours / parent.normalHours) * 100 : 0,
                overtime50: parent.overtime50 > 0
                    ? (node.overtime50 / parent.overtime50) * 100 : 0,
                overtime100: parent.overtime100 > 0
                    ? (node.overtime100 / parent.overtime100) * 100 : 0,
                totalHours: parent.totalHours > 0
                    ? (node.totalHours / parent.totalHours) * 100 : 0,
                weightedCost: parent.weightedCost > 0
                    ? (node.weightedCost / parent.weightedCost) * 100 : 0
            };

            node.percentOfTotal = {
                normalHours: totals.normalHours > 0
                    ? (node.normalHours / totals.normalHours) * 100 : 0,
                overtime50: totals.overtime50 > 0
                    ? (node.overtime50 / totals.overtime50) * 100 : 0,
                overtime100: totals.overtime100 > 0
                    ? (node.overtime100 / totals.overtime100) * 100 : 0,
                totalHours: totals.totalHours > 0
                    ? (node.totalHours / totals.totalHours) * 100 : 0,
                weightedCost: totals.weightedCost > 0
                    ? (node.weightedCost / totals.weightedCost) * 100 : 0
            };

            // Composición interna
            node.composition = {
                normalPercentage: node.totalHours > 0
                    ? (node.normalHours / node.totalHours) * 100 : 0,
                overtime50Percentage: node.totalHours > 0
                    ? (node.overtime50 / node.totalHours) * 100 : 0,
                overtime100Percentage: node.totalHours > 0
                    ? (node.overtime100 / node.totalHours) * 100 : 0
            };
        };

        // Enriquecer cada nivel
        Object.values(cube.byBranch).forEach(branch => {
            calcPercentages(branch, totals);

            Object.values(branch.byDepartment || {}).forEach(dept => {
                calcPercentages(dept, branch);

                Object.values(dept.byShiftType || {}).forEach(shift => {
                    calcPercentages(shift, dept);
                });
            });
        });

        Object.values(cube.byDepartment).forEach(dept => {
            calcPercentages(dept, totals);
        });

        Object.values(cube.byShiftType).forEach(shift => {
            calcPercentages(shift, totals);
        });

        return cube;
    }

    // ============================================================================
    // RESUMEN EJECUTIVO
    // ============================================================================

    _generateExecutiveSummary(cube) {
        const totals = cube.totals;

        // Top 3 sucursales por horas totales
        const topBranches = Object.entries(cube.byBranch)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.totalHours - a.totalHours)
            .slice(0, 3);

        // Top 3 departamentos por overtime
        const topOvertimeDepartments = Object.entries(cube.byDepartment)
            .map(([id, data]) => ({
                id,
                ...data,
                totalOvertime: data.overtime50 + data.overtime100
            }))
            .sort((a, b) => b.totalOvertime - a.totalOvertime)
            .slice(0, 3);

        // Distribución por tipo de turno
        const shiftDistribution = Object.entries(cube.byShiftType)
            .map(([type, data]) => ({
                type,
                name: data.name,
                hours: data.totalHours,
                percentage: data.percentOfTotal?.totalHours || 0
            }))
            .sort((a, b) => b.hours - a.hours);

        // Ratio de overtime
        const totalOvertime = totals.overtime50 + totals.overtime100;
        const overtimeRatio = totals.totalHours > 0
            ? (totalOvertime / totals.totalHours) * 100
            : 0;

        // Costo adicional por overtime
        const normalEquivalentCost = totals.totalHours * 1.0;
        const additionalCostFromOvertime = totals.weightedCost - normalEquivalentCost;
        const costIncreasePercentage = normalEquivalentCost > 0
            ? (additionalCostFromOvertime / normalEquivalentCost) * 100
            : 0;

        return {
            period: {
                totalRecords: totals.recordCount,
                presentDays: totals.presentCount,
                absentDays: totals.absentCount,
                attendanceRate: totals.recordCount > 0
                    ? (totals.presentCount / totals.recordCount) * 100
                    : 0
            },
            hours: {
                total: this._round(totals.totalHours),
                normal: this._round(totals.normalHours),
                overtime50: this._round(totals.overtime50),
                overtime100: this._round(totals.overtime100),
                overtimeTotal: this._round(totalOvertime),
                overtimeRatio: this._round(overtimeRatio)
            },
            costs: {
                weightedTotal: this._round(totals.weightedCost),
                normalEquivalent: this._round(normalEquivalentCost),
                additionalFromOvertime: this._round(additionalCostFromOvertime),
                costIncreasePercentage: this._round(costIncreasePercentage)
            },
            topBranches: topBranches.map(b => ({
                name: b.name,
                totalHours: this._round(b.totalHours),
                percentOfTotal: this._round(b.percentOfTotal?.totalHours || 0)
            })),
            topOvertimeDepartments: topOvertimeDepartments.map(d => ({
                name: d.name,
                totalOvertime: this._round(d.totalOvertime),
                overtimeRatio: d.totalHours > 0
                    ? this._round((d.totalOvertime / d.totalHours) * 100)
                    : 0
            })),
            shiftDistribution,
            alerts: this._generateAlerts(cube)
        };
    }

    _generateAlerts(cube) {
        const alerts = [];
        const totals = cube.totals;

        // Alerta: Overtime alto
        const totalOvertime = totals.overtime50 + totals.overtime100;
        const overtimeRatio = totals.totalHours > 0 ? (totalOvertime / totals.totalHours) * 100 : 0;

        if (overtimeRatio > 20) {
            alerts.push({
                type: 'warning',
                category: 'overtime',
                message: `Alto ratio de horas extras: ${this._round(overtimeRatio)}% del total`,
                threshold: 20,
                actual: this._round(overtimeRatio)
            });
        }

        // Alerta: Departamentos con >30% overtime
        Object.entries(cube.byDepartment).forEach(([id, dept]) => {
            const deptOvertime = dept.overtime50 + dept.overtime100;
            const deptOvertimeRatio = dept.totalHours > 0 ? (deptOvertime / dept.totalHours) * 100 : 0;

            if (deptOvertimeRatio > 30) {
                alerts.push({
                    type: 'critical',
                    category: 'department_overtime',
                    message: `Departamento "${dept.name}" con ${this._round(deptOvertimeRatio)}% de horas extras`,
                    departmentId: id,
                    threshold: 30,
                    actual: this._round(deptOvertimeRatio)
                });
            }
        });

        // Alerta: Concentración en un solo turno
        const shiftTypes = Object.values(cube.byShiftType);
        const maxShiftConcentration = Math.max(...shiftTypes.map(s => s.percentOfTotal?.totalHours || 0));

        if (maxShiftConcentration > 70) {
            const dominantShift = shiftTypes.find(s => (s.percentOfTotal?.totalHours || 0) === maxShiftConcentration);
            alerts.push({
                type: 'info',
                category: 'shift_concentration',
                message: `Alta concentración en ${dominantShift?.name}: ${this._round(maxShiftConcentration)}%`,
                threshold: 70,
                actual: this._round(maxShiftConcentration)
            });
        }

        return alerts;
    }

    // ============================================================================
    // DRILL-DOWN ESPECÍFICO
    // ============================================================================

    async getDrillDown(companyId, dateRange, dimension, dimensionId) {
        const fullCube = await this.generateHoursCube(companyId, dateRange);

        if (!fullCube.success) {
            return fullCube;
        }

        let drillDownData = null;

        switch (dimension) {
            case 'branch':
                drillDownData = fullCube.cube.byBranch[dimensionId];
                break;
            case 'department':
                drillDownData = fullCube.cube.byDepartment[dimensionId];
                break;
            case 'shiftType':
                drillDownData = fullCube.cube.byShiftType[dimensionId];
                break;
            default:
                return { success: false, error: `Dimensión desconocida: ${dimension}` };
        }

        if (!drillDownData) {
            return { success: false, error: `No se encontró ${dimension} con ID ${dimensionId}` };
        }

        return {
            success: true,
            dimension,
            dimensionId,
            data: drillDownData,
            companyTotals: fullCube.cube.totals
        };
    }

    // ============================================================================
    // COMPARATIVAS TEMPORALES
    // ============================================================================

    async comparePeriodsParallel(companyId, periods) {
        const results = await Promise.all(
            periods.map(period => this.generateHoursCube(companyId, period))
        );

        const comparison = {
            success: true,
            periods: periods.map((p, i) => ({
                ...p,
                data: results[i].success ? results[i].executiveSummary : null,
                error: results[i].success ? null : results[i].error
            })),
            variations: {}
        };

        // Calcular variaciones entre períodos consecutivos
        for (let i = 1; i < results.length; i++) {
            if (results[i].success && results[i - 1].success) {
                const prev = results[i - 1].executiveSummary.hours;
                const curr = results[i].executiveSummary.hours;

                comparison.variations[`period_${i - 1}_to_${i}`] = {
                    totalHours: this._calcVariation(prev.total, curr.total),
                    normalHours: this._calcVariation(prev.normal, curr.normal),
                    overtime: this._calcVariation(prev.overtimeTotal, curr.overtimeTotal)
                };
            }
        }

        return comparison;
    }

    _calcVariation(prev, curr) {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
    }

    // ============================================================================
    // UTILIDADES
    // ============================================================================

    _round(value, decimals = 2) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    _getDefaultStartDate() {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date;
    }
}

module.exports = HoursCubeService;
