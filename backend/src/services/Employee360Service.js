/**
 * ============================================================================
 * SERVICIO: Employee360Service - Expediente 360° con Análisis IA
 * ============================================================================
 *
 * Sistema integral de análisis de empleados que consolida:
 * - Datos personales y cambios
 * - Asistencia y puntualidad
 * - Historial médico con estadísticas de diagnósticos
 * - Sanciones disciplinarias
 * - Vacaciones y licencias
 * - Capacitaciones
 * - Evaluaciones de desempeño
 * - ANÁLISIS DE PATRONES DE CONDUCTA (v1.1)
 * - ROLES ADICIONALES INTERNOS (v1.1)
 * - DATOS MÉDICOS AVANZADOS (v2.0): antropométricos, cirugías, psiquiatría, deportes, hábitos
 * - SISTEMA SALARIAL AVANZADO (v2.0): convenios CCT, categorías, liquidaciones, historial
 *
 * Integrado con Ollama + Llama 3.1 para análisis inteligente
 *
 * @version 2.0.0
 * @date 2025-11-26
 * ============================================================================
 */

const {
    User,
    UserAuditLog,
    Attendance,
    Sanction,
    VacationRequest,
    Training,
    TrainingAssignment,
    MedicalCertificate,
    Department,
    Company,
    sequelize
} = require('../config/database');
const { Op } = require('sequelize');

class Employee360Service {
    constructor() {
        this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    }

    // =========================================================================
    // MÉTODO PRINCIPAL: Obtener Expediente 360° completo
    // =========================================================================
    async getFullReport(userId, companyId, options = {}) {
        const {
            dateFrom = new Date(new Date().setMonth(new Date().getMonth() - 12)),
            dateTo = new Date(),
            includeAIAnalysis = true
        } = options;

        console.log(`📊 [360°] Generando expediente para usuario ${userId}`);

        try {
            // 1. Obtener DATA SHEET COMPLETO del empleado (v2.0)
            const employee = await this.getEmployeeBasicInfo(userId, companyId);
            if (!employee) {
                throw new Error('Empleado no encontrado');
            }

            // 2. Recopilar datos de todos los módulos en paralelo
            const [
                auditHistory,
                attendanceData,
                sanctionsData,
                vacationsData,
                trainingData,
                medicalData,
                allUserData  // ← NUEVO: Todos los datos adicionales del usuario
            ] = await Promise.all([
                this.getAuditHistory(userId, companyId, dateFrom, dateTo),
                this.getAttendanceAnalysis(userId, companyId, dateFrom, dateTo),
                this.getSanctionsHistory(userId, companyId, dateFrom, dateTo),
                this.getVacationsHistory(userId, companyId, dateFrom, dateTo),
                this.getTrainingHistory(userId, companyId, dateFrom, dateTo),
                this.getMedicalHistory(userId, companyId, dateFrom, dateTo),
                this.getAllUserData(userId, companyId, dateFrom, dateTo)  // ← NUEVO
            ]);

            // 3. Preparar datos consolidados para análisis
            const consolidatedData = {
                employee,
                attendance: attendanceData,
                sanctions: sanctionsData,
                vacations: vacationsData,
                training: trainingData,
                medical: medicalData,
                additionalRoles: employee.additionalRoles || []
            };

            // 4. Calcular scoring por categoría (6 dimensiones + bonus por roles)
            const scoring = this.calculateScoring(consolidatedData);

            // 5. Calcular ÍNDICE DE RIESGO DE FUGA (v2.0 - Algoritmo Predictivo)
            const flightRisk = this.calculateFlightRisk(consolidatedData);

            // 6. Detectar PATRONES DE COMPORTAMIENTO
            const behaviorPatterns = this.detectBehaviorPatterns(consolidatedData);

            // 7. Generar TIMELINE UNIFICADO de eventos
            const timeline = this.generateUnifiedTimeline({
                auditHistory,
                attendanceData,
                sanctionsData,
                vacationsData,
                trainingData,
                medicalData
            });

            // 8. Análisis IA con Ollama (si está habilitado y disponible)
            let aiAnalysis = null;
            if (includeAIAnalysis) {
                aiAnalysis = await this.generateAIAnalysis(employee, {
                    scoring,
                    attendanceData,
                    sanctionsData,
                    vacationsData,
                    trainingData
                });
            }

            // 9. Compilar EXPEDIENTE 360° PREMIUM
            const report = {
                generatedAt: new Date().toISOString(),
                period: {
                    from: dateFrom,
                    to: dateTo
                },

                // === DATA SHEET COMPLETO DEL EMPLEADO ===
                employee: {
                    // Identificación
                    id: employee.id,
                    employeeId: employee.employeeId,
                    legajo: employee.legajo,
                    usuario: employee.usuario,

                    // Datos Personales
                    firstName: employee.firstName,
                    lastName: employee.lastName,
                    fullName: employee.fullName,
                    email: employee.email,
                    phone: employee.phone,
                    dni: employee.dni,
                    cuil: employee.cuil,
                    birthDate: employee.birthDate,
                    age: employee.age,
                    address: employee.address,

                    // Datos Laborales
                    position: employee.position,
                    role: employee.role,
                    department: employee.department,
                    company: employee.company,
                    hireDate: employee.hireDate,
                    tenure: employee.tenure,
                    salary: employee.salary,
                    workSchedule: employee.workSchedule,
                    hasFlexibleSchedule: employee.hasFlexibleSchedule,

                    // Contacto de Emergencia
                    emergencyContact: employee.emergencyContact,

                    // Estado y Permisos
                    isActive: employee.isActive,
                    accountStatus: employee.accountStatus,
                    permissions: employee.permissions,

                    // Autorizaciones
                    canAuthorizeLateArrivals: employee.canAuthorizeLateArrivals,
                    authorizedDepartments: employee.authorizedDepartments,
                    canUseMobileApp: employee.canUseMobileApp,
                    canUseKiosk: employee.canUseKiosk,
                    canUseAllKiosks: employee.canUseAllKiosks,

                    // Datos Biométricos
                    photo: employee.biometricPhotoUrl || null,
                    hasFingerprint: employee.hasFingerprint,
                    hasFacialData: employee.hasFacialData,
                    biometricLastUpdated: employee.biometricLastUpdated,

                    // Roles Adicionales
                    additionalRoles: employee.additionalRoles,

                    // Seguridad
                    lastLogin: employee.lastLogin,
                    twoFactorEnabled: employee.twoFactorEnabled,

                    // Preferencias
                    settings: employee.settings,
                    notificationPreference: employee.notificationPreference
                },

                // === SCORING CON 6 DIMENSIONES ===
                scoring: {
                    total: scoring.total,
                    baseScore: scoring.baseScore,
                    grade: this.getGrade(scoring.total),
                    categories: scoring.categories,
                    additionalRolesBonus: scoring.additionalRolesBonus,
                    trend: scoring.trend
                },

                // === ÍNDICE DE RIESGO DE FUGA ===
                flightRisk: {
                    score: flightRisk.score,
                    level: flightRisk.level,
                    label: flightRisk.label,
                    color: flightRisk.color,
                    insight: flightRisk.insight,
                    factors: flightRisk.factors,
                    recommendations: flightRisk.recommendation
                },

                // === PATRONES DE COMPORTAMIENTO ===
                behaviorPatterns,

                // === SECCIONES DETALLADAS (MÓDULOS CORE) ===
                sections: {
                    attendance: attendanceData,
                    sanctions: sanctionsData,
                    vacations: vacationsData,
                    training: trainingData,
                    medical: medicalData,
                    changes: auditHistory
                },

                // === DATOS COMPLETOS DEL USUARIO (TODOS LOS TABS) ===
                completeUserData: {
                    // FAMILIA Y GRUPO FAMILIAR
                    family: allUserData.family,

                    // EDUCACIÓN
                    education: allUserData.education,

                    // INFORMACIÓN MÉDICA COMPLETA
                    medicalComplete: allUserData.medicalComplete,

                    // DOCUMENTOS (generales, médicos, licencias)
                    documents: allUserData.documents,

                    // HISTORIAL LABORAL PREVIO
                    previousWorkHistory: allUserData.previousWorkHistory,

                    // INFORMACIÓN SINDICAL Y LEGAL
                    unionAndLegal: allUserData.unionAndLegal,

                    // CONFIGURACIÓN SALARIAL
                    salary: allUserData.salary,

                    // TURNOS ASIGNADOS
                    assignedShifts: allUserData.assignedShifts,

                    // ÚLTIMOS REGISTROS DE ASISTENCIA
                    recentAttendance: allUserData.recentAttendance,

                    // TAREAS ASIGNADAS
                    tasks: allUserData.tasks,

                    // CONSENTIMIENTOS
                    consents: allUserData.consents,

                    // SOLICITUDES DE PERMISOS
                    permissionRequests: allUserData.permissionRequests
                },

                // === TIMELINE DE EVENTOS ===
                timeline: timeline.slice(0, 50), // Últimos 50 eventos

                // === ANÁLISIS IA ===
                aiAnalysis,

                // === METADATA ===
                metadata: {
                    version: '3.0',  // ← Expediente 360° COMPLETO
                    totalEvents: timeline.length,
                    dataCompleteness: this.calculateDataCompleteness({
                        attendanceData,
                        sanctionsData,
                        vacationsData,
                        trainingData,
                        medicalData
                    }),
                    reportFeatures: {
                        hasFlightRisk: true,
                        hasBehaviorPatterns: true,
                        has6DimensionScoring: true,
                        hasAIAnalysis: aiAnalysis !== null,
                        hasTimeline: timeline.length > 0,
                        // NUEVO: Indicadores de datos completos
                        hasFamilyData: allUserData.family?.totalMembers > 0,
                        hasEducationData: allUserData.education?.totalRecords > 0,
                        hasMedicalComplete: allUserData.medicalComplete?.summary?.totalAllergies > 0 ||
                                           allUserData.medicalComplete?.summary?.totalConditions > 0,
                        hasDocuments: allUserData.documents?.summary?.totalDocuments > 0,
                        hasPreviousWorkHistory: allUserData.previousWorkHistory?.totalRecords > 0,
                        hasUnionInfo: allUserData.unionAndLegal?.isUnionMember,
                        hasSalaryConfig: allUserData.salary?.hasConfiguredSalary,
                        hasShiftsAssigned: allUserData.assignedShifts?.totalAssigned > 0,
                        hasTasks: allUserData.tasks?.pendingTasks > 0 || allUserData.tasks?.completedTasks > 0
                    },
                    dataSections: {
                        core: ['attendance', 'sanctions', 'vacations', 'training', 'medical', 'changes'],
                        extended: ['family', 'education', 'medicalComplete', 'documents', 'previousWorkHistory',
                                   'unionAndLegal', 'salary', 'assignedShifts', 'recentAttendance', 'tasks',
                                   'consents', 'permissionRequests']
                    }
                }
            };

            console.log(`✅ [360°] Expediente PREMIUM generado para ${employee.fullName}`);
            console.log(`   📊 Score: ${scoring.total}/100 (Grado ${this.getGrade(scoring.total).letter})`);
            console.log(`   🚀 Riesgo de Fuga: ${flightRisk.score}% (${flightRisk.label})`);
            console.log(`   📈 Patrones: ${behaviorPatterns.length} detectados`);
            console.log(`   🤖 AI: ${aiAnalysis?.generated ? 'Ollama' : 'Fallback'}`);
            return report;

        } catch (error) {
            console.error('❌ [360°] Error generando expediente:', error.message);
            throw error;
        }
    }

    // =========================================================================
    // DATA SHEET COMPLETO DEL EMPLEADO (v2.0 - Expediente 360° Premium)
    // =========================================================================
    async getEmployeeBasicInfo(userId, companyId) {
        const employee = await User.findOne({
            where: {
                user_id: userId,
                company_id: companyId
            },
            include: [
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name']
                },
                {
                    model: Company,
                    as: 'company',
                    attributes: ['company_id', 'name', 'slug']
                }
            ]
        });

        if (!employee) return null;

        // Calcular antigüedad
        const hireDate = employee.hireDate ? new Date(employee.hireDate) : null;
        const tenure = hireDate ? this.calculateTenure(hireDate) : null;

        // Calcular edad
        const birthDate = employee.birthDate ? new Date(employee.birthDate) : null;
        const age = birthDate ? this.calculateAge(birthDate) : null;

        return {
            // === DATOS DE IDENTIFICACIÓN ===
            id: employee.user_id,
            employeeId: employee.employeeId,
            legajo: employee.legajo,
            usuario: employee.usuario,

            // === DATOS PERSONALES ===
            firstName: employee.firstName,
            lastName: employee.lastName,
            fullName: `${employee.firstName} ${employee.lastName}`,
            email: employee.email,
            phone: employee.phone,
            dni: employee.dni,
            cuil: employee.cuil,
            birthDate: employee.birthDate,
            age: age,
            address: employee.address,

            // === DATOS LABORALES ===
            position: employee.position,
            role: employee.role,
            department: employee.department ? {
                id: employee.department.id,
                name: employee.department.name
            } : null,
            company: employee.company ? {
                id: employee.company.company_id,
                name: employee.company.name,
                slug: employee.company.slug
            } : null,
            hireDate: employee.hireDate,
            tenure: tenure,
            salary: employee.salary,
            workSchedule: employee.workSchedule,
            hasFlexibleSchedule: employee.has_flexible_schedule,
            flexibleScheduleNotes: employee.flexible_schedule_notes,

            // === CONTACTO DE EMERGENCIA ===
            emergencyContact: employee.emergencyContact,

            // === ESTADO Y PERMISOS ===
            isActive: employee.isActive,
            accountStatus: employee.account_status,
            emailVerified: employee.email_verified,
            permissions: employee.permissions,

            // === AUTORIZACIONES ===
            canAuthorizeLateArrivals: employee.can_authorize_late_arrivals,
            authorizedDepartments: employee.authorized_departments,
            canUseMobileApp: employee.can_use_mobile_app,
            canUseKiosk: employee.can_use_kiosk,
            canUseAllKiosks: employee.can_use_all_kiosks,
            authorizedKiosks: employee.authorized_kiosks,

            // === DATOS BIOMÉTRICOS ===
            biometricPhotoUrl: employee.biometricPhotoUrl,
            hasFingerprint: employee.hasFingerprint,
            hasFacialData: employee.hasFacialData,
            biometricLastUpdated: employee.biometricLastUpdated,

            // === ROLES ADICIONALES ===
            additionalRoles: employee.additionalRoles || [],

            // === SEGURIDAD ===
            lastLogin: employee.lastLogin,
            twoFactorEnabled: employee.twoFactorEnabled,

            // === PREFERENCIAS ===
            settings: employee.settings,
            notificationPreference: employee.notification_preference_late_arrivals
        };
    }

    // Calcular antigüedad en años, meses y días
    calculateTenure(hireDate) {
        const now = new Date();
        const hire = new Date(hireDate);

        let years = now.getFullYear() - hire.getFullYear();
        let months = now.getMonth() - hire.getMonth();
        let days = now.getDate() - hire.getDate();

        if (days < 0) {
            months--;
            days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        const totalDays = Math.floor((now - hire) / (1000 * 60 * 60 * 24));

        return {
            years,
            months,
            days,
            totalDays,
            formatted: years > 0
                ? `${years} año${years !== 1 ? 's' : ''} ${months} mes${months !== 1 ? 'es' : ''}`
                : `${months} mes${months !== 1 ? 'es' : ''} ${days} día${days !== 1 ? 's' : ''}`
        };
    }

    // Calcular edad
    calculateAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    // =========================================================================
    // HISTORIAL DE CAMBIOS (AUDITORÍA)
    // =========================================================================
    async getAuditHistory(userId, companyId, dateFrom, dateTo) {
        try {
            const logs = await UserAuditLog.findAll({
                where: {
                    user_id: userId,
                    company_id: companyId,
                    created_at: {
                        [Op.between]: [dateFrom, dateTo]
                    }
                },
                order: [['created_at', 'DESC']],
                limit: 100
            });

            // Agrupar por tipo de acción
            const byAction = {};
            logs.forEach(log => {
                if (!byAction[log.action]) byAction[log.action] = [];
                byAction[log.action].push(log);
            });

            return {
                total: logs.length,
                byAction,
                recent: logs.slice(0, 10),
                summary: {
                    updates: byAction['UPDATE']?.length || 0,
                    roleChanges: byAction['ROLE_CHANGE']?.length || 0,
                    departmentChanges: byAction['DEPARTMENT_CHANGE']?.length || 0,
                    passwordResets: byAction['PASSWORD_RESET']?.length || 0
                }
            };
        } catch (error) {
            console.error('Error obteniendo historial de auditoría:', error);
            return { total: 0, byAction: {}, recent: [], summary: {} };
        }
    }

    // =========================================================================
    // ANÁLISIS DE ASISTENCIA + PATRONES DE CONDUCTA
    // =========================================================================
    async getAttendanceAnalysis(userId, companyId, dateFrom, dateTo) {
        try {
            // Usar SQL raw para manejar los nombres de columna correctos de la tabla
            const attendances = await sequelize.query(`
                SELECT
                    id,
                    "UserId" as user_id,
                    date,
                    "checkInTime" as "checkIn",
                    "checkOutTime" as "checkOut",
                    "checkInMethod",
                    "checkOutMethod",
                    status,
                    "workingHours" as "hoursWorked",
                    notes,
                    "BranchId" as branch_id,
                    "createdAt",
                    "updatedAt"
                FROM attendances
                WHERE "UserId" = :userId
                AND date BETWEEN :dateFrom AND :dateTo
                ORDER BY date DESC
            `, {
                replacements: {
                    userId,
                    dateFrom: dateFrom.toISOString().split('T')[0],
                    dateTo: dateTo.toISOString().split('T')[0]
                },
                type: sequelize.QueryTypes.SELECT
            });

            // Calcular métricas básicas
            let totalDays = attendances.length;
            let lateArrivals = 0;
            let earlyDepartures = 0;
            let absences = 0;
            let totalHoursWorked = 0;
            let overtimeHours = 0;

            const lateByDayOfWeek = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
            const absentByDayOfWeek = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

            // =========================================================================
            // ANÁLISIS DE PATRONES DE CONDUCTA (v1.1)
            // =========================================================================
            let lastToCheckIn = 0;      // Veces que fue el último en marcar entrada
            let firstToCheckOut = 0;    // Veces que fue el primero en marcar salida
            let consecutiveLates = 0;   // Tardanzas consecutivas
            let maxConsecutiveLates = 0;
            let fridayAbsences = 0;     // Faltas los viernes
            let mondayAbsences = 0;     // Faltas los lunes (patrón "fin de semana largo")
            let preWeekendAbsences = 0; // Faltas viernes o antes de feriado
            let postWeekendAbsences = 0; // Faltas lunes o después de feriado

            // Para calcular si es último/primero, necesitamos comparar con otros empleados del mismo día
            const dailyCheckTimes = {};

            attendances.forEach(att => {
                const dayOfWeek = new Date(att.date).getDay();
                const dateStr = att.date?.toISOString?.()?.split('T')[0] || String(att.date).split('T')[0];

                // Registrar tiempos de check-in/out por día
                if (!dailyCheckTimes[dateStr]) {
                    dailyCheckTimes[dateStr] = { checkIns: [], checkOuts: [] };
                }
                if (att.checkIn) dailyCheckTimes[dateStr].checkIns.push(att.checkIn);
                if (att.checkOut) dailyCheckTimes[dateStr].checkOuts.push(att.checkOut);

                // Tardanzas
                if (att.status === 'late' || att.isLate) {
                    lateArrivals++;
                    lateByDayOfWeek[dayOfWeek]++;
                    consecutiveLates++;
                    if (consecutiveLates > maxConsecutiveLates) {
                        maxConsecutiveLates = consecutiveLates;
                    }
                } else {
                    consecutiveLates = 0;
                }

                // Ausencias
                if (att.status === 'absent') {
                    absences++;
                    absentByDayOfWeek[dayOfWeek]++;

                    // Patrón: Faltas cercanas al fin de semana
                    if (dayOfWeek === 5) { // Viernes
                        fridayAbsences++;
                        preWeekendAbsences++;
                    }
                    if (dayOfWeek === 1) { // Lunes
                        mondayAbsences++;
                        postWeekendAbsences++;
                    }
                    // Jueves también cuenta como pre-weekend
                    if (dayOfWeek === 4) preWeekendAbsences++;
                }

                // Salidas tempranas
                if (att.earlyDeparture || att.status === 'early_departure') {
                    earlyDepartures++;
                }

                if (att.hoursWorked) totalHoursWorked += parseFloat(att.hoursWorked) || 0;
                if (att.overtime) overtimeHours += parseFloat(att.overtime) || 0;
            });

            // Detectar patrón de tardanzas por día
            const worstDay = Object.entries(lateByDayOfWeek)
                .sort((a, b) => b[1] - a[1])[0];
            const worstAbsentDay = Object.entries(absentByDayOfWeek)
                .sort((a, b) => b[1] - a[1])[0];
            const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

            // =========================================================================
            // INDICADORES DE CONDUCTA PROBLEMÁTICA
            // =========================================================================
            const behavioralPatterns = {
                // Recurrencia de tardanzas
                lateRecurrence: {
                    isRecurrent: lateArrivals >= 5, // 5+ tardanzas = recurrente
                    frequency: totalDays > 0 ? ((lateArrivals / totalDays) * 100).toFixed(1) : 0,
                    maxConsecutive: maxConsecutiveLates,
                    worstDay: worstDay ? dayNames[parseInt(worstDay[0])] : 'N/A',
                    worstDayCount: worstDay ? worstDay[1] : 0,
                    alert: lateArrivals >= 10 ? 'CRÍTICO' : (lateArrivals >= 5 ? 'MODERADO' : 'BAJO')
                },

                // Patrón "fin de semana largo" - faltas viernes/lunes
                weekendPattern: {
                    detected: (fridayAbsences + mondayAbsences) >= 3,
                    fridayAbsences,
                    mondayAbsences,
                    preWeekendAbsences,
                    postWeekendAbsences,
                    totalWeekendRelated: fridayAbsences + mondayAbsences,
                    percentageOfAbsences: absences > 0
                        ? (((fridayAbsences + mondayAbsences) / absences) * 100).toFixed(1)
                        : 0,
                    alert: (fridayAbsences + mondayAbsences) >= 5 ? 'CRÍTICO' :
                           ((fridayAbsences + mondayAbsences) >= 3 ? 'MODERADO' : 'BAJO')
                },

                // Patrón último en llegar / primero en irse
                minEffortPattern: {
                    lastToCheckIn,
                    firstToCheckOut,
                    earlyDepartures,
                    avgHoursVsExpected: totalDays > 0 ? (totalHoursWorked / totalDays).toFixed(1) : 0,
                    alert: earlyDepartures >= 10 ? 'CRÍTICO' : (earlyDepartures >= 5 ? 'MODERADO' : 'BAJO')
                },

                // Ausencias por día de la semana
                absencesByDay: {
                    data: absentByDayOfWeek,
                    worstDay: worstAbsentDay ? dayNames[parseInt(worstAbsentDay[0])] : 'N/A',
                    worstDayCount: worstAbsentDay ? worstAbsentDay[1] : 0
                },

                // Resumen de alertas
                overallConductAlert: this.calculateConductAlert(lateArrivals, absences, fridayAbsences + mondayAbsences, earlyDepartures)
            };

            return {
                totalDays,
                presentDays: totalDays - absences,
                lateArrivals,
                earlyDepartures,
                absences,
                attendanceRate: totalDays > 0 ? ((totalDays - absences) / totalDays * 100).toFixed(1) : 0,
                punctualityRate: totalDays > 0 ? ((totalDays - lateArrivals) / totalDays * 100).toFixed(1) : 0,
                totalHoursWorked: totalHoursWorked.toFixed(1),
                overtimeHours: overtimeHours.toFixed(1),
                averageHoursPerDay: totalDays > 0 ? (totalHoursWorked / totalDays).toFixed(1) : 0,
                patterns: {
                    worstDayForLate: {
                        day: dayNames[parseInt(worstDay[0])],
                        count: worstDay[1]
                    },
                    lateByDayOfWeek
                },
                // ✅ NUEVO: Patrones de conducta detallados
                behavioralPatterns,
                recentRecords: attendances.slice(0, 10).map(a => ({
                    date: a.date,
                    checkIn: a.checkIn,
                    checkOut: a.checkOut,
                    status: a.status,
                    hoursWorked: a.hoursWorked
                }))
            };
        } catch (error) {
            console.error('Error analizando asistencia:', error);
            return {
                totalDays: 0, presentDays: 0, lateArrivals: 0,
                absences: 0, attendanceRate: 0, punctualityRate: 0,
                behavioralPatterns: null
            };
        }
    }

    // Calcular nivel de alerta de conducta general
    calculateConductAlert(lates, absences, weekendAbsences, earlyDepartures) {
        let score = 0;

        // Tardanzas: +1 por cada 3
        score += Math.floor(lates / 3);

        // Ausencias: +2 por cada una
        score += absences * 2;

        // Patrón fin de semana: +3 por cada falta viernes/lunes
        score += weekendAbsences * 3;

        // Salidas tempranas: +1 por cada 5
        score += Math.floor(earlyDepartures / 5);

        if (score >= 15) return { level: 'CRÍTICO', color: '#dc3545', emoji: '🔴', description: 'Requiere intervención inmediata de RRHH' };
        if (score >= 10) return { level: 'ALTO', color: '#fd7e14', emoji: '🟠', description: 'Patrones preocupantes detectados' };
        if (score >= 5) return { level: 'MODERADO', color: '#ffc107', emoji: '🟡', description: 'Monitorear de cerca' };
        return { level: 'BAJO', color: '#28a745', emoji: '🟢', description: 'Sin patrones problemáticos' };
    }

    // =========================================================================
    // HISTORIAL DE SANCIONES
    // =========================================================================
    async getSanctionsHistory(userId, companyId, dateFrom, dateTo) {
        try {
            // Usar SQL raw para las tablas nuevas
            const sanctions = await sequelize.query(`
                SELECT
                    id, company_id, user_id, employee_id, employee_name, employee_department,
                    sanction_type as type, severity, title, description,
                    sanction_date, expiration_date, status, points_deducted,
                    is_automatic, created_by, created_at, updated_at
                FROM sanctions
                WHERE user_id = :userId
                AND company_id = :companyId
                AND created_at BETWEEN :dateFrom AND :dateTo
                ORDER BY created_at DESC
            `, {
                replacements: {
                    userId,
                    companyId,
                    dateFrom: dateFrom.toISOString(),
                    dateTo: dateTo.toISOString()
                },
                type: sequelize.QueryTypes.SELECT
            });

            // Agrupar por tipo
            const byType = {};
            sanctions.forEach(s => {
                const type = s.type || 'other';
                if (!byType[type]) byType[type] = [];
                byType[type].push(s);
            });

            return {
                total: sanctions.length,
                byType,
                severity: {
                    warnings: sanctions.filter(s => s.severity === 'warning' || s.severity === 'written_warning').length,
                    minor: sanctions.filter(s => s.severity === 'low' || s.severity === 'minor').length,
                    major: sanctions.filter(s => s.severity === 'medium' || s.severity === 'high' || s.severity === 'major').length,
                    severe: sanctions.filter(s => s.severity === 'critical' || s.severity === 'severe' || s.severity === 'dismissal').length
                },
                recent: sanctions.slice(0, 5).map(s => ({
                    date: s.created_at,
                    type: s.type,
                    severity: s.severity,
                    description: s.description,
                    status: s.status
                })),
                hasActiveSanction: sanctions.some(s => s.status === 'active'),
                lastSanctionDate: sanctions.length > 0 ? sanctions[0].created_at : null
            };
        } catch (error) {
            console.error('Error obteniendo sanciones:', error);
            return { total: 0, byType: {}, severity: {}, recent: [] };
        }
    }

    // =========================================================================
    // HISTORIAL DE VACACIONES
    // =========================================================================
    async getVacationsHistory(userId, companyId, dateFrom, dateTo) {
        try {
            // Usar SQL raw para la tabla vacation_requests
            const vacations = await sequelize.query(`
                SELECT
                    id, company_id, user_id, request_type as type,
                    start_date, end_date, total_days as days,
                    reason, status, approved_by, approval_date,
                    approval_comments, source, created_at, updated_at
                FROM vacation_requests
                WHERE user_id = :userId
                AND company_id = :companyId
                AND created_at BETWEEN :dateFrom AND :dateTo
                ORDER BY created_at DESC
            `, {
                replacements: {
                    userId,
                    companyId,
                    dateFrom: dateFrom.toISOString(),
                    dateTo: dateTo.toISOString()
                },
                type: sequelize.QueryTypes.SELECT
            });

            let totalDaysRequested = 0;
            let totalDaysApproved = 0;

            vacations.forEach(v => {
                totalDaysRequested += v.days || 0;
                if (v.status === 'approved') {
                    totalDaysApproved += v.days || 0;
                }
            });

            return {
                totalRequests: vacations.length,
                approved: vacations.filter(v => v.status === 'approved').length,
                pending: vacations.filter(v => v.status === 'pending').length,
                rejected: vacations.filter(v => v.status === 'rejected').length,
                totalDaysRequested,
                totalDaysApproved,
                recent: vacations.slice(0, 5).map(v => ({
                    dateFrom: v.start_date,
                    dateTo: v.end_date,
                    days: v.days,
                    status: v.status,
                    type: v.type
                }))
            };
        } catch (error) {
            console.error('Error obteniendo vacaciones:', error);
            return { totalRequests: 0, approved: 0, pending: 0, rejected: 0 };
        }
    }

    // =========================================================================
    // HISTORIAL DE CAPACITACIONES
    // =========================================================================
    async getTrainingHistory(userId, companyId, dateFrom, dateTo) {
        try {
            // Usar SQL raw para las tablas de capacitaciones
            const assignments = await sequelize.query(`
                SELECT
                    ta.id, ta.company_id, ta.training_id, ta.user_id,
                    ta.status, ta.progress_percentage as progress,
                    ta.time_spent_minutes, ta.assigned_at, ta.started_at,
                    ta.completed_at, ta.due_date, ta.score, ta.notes,
                    ta.created_at, ta.updated_at,
                    t.title, t.description as training_description,
                    t.category, t.duration, t.is_mandatory
                FROM training_assignments ta
                LEFT JOIN trainings t ON ta.training_id = t.id
                WHERE ta.user_id = :userId
                AND ta.company_id = :companyId
                AND ta.created_at BETWEEN :dateFrom AND :dateTo
                ORDER BY ta.created_at DESC
            `, {
                replacements: {
                    userId,
                    companyId,
                    dateFrom: dateFrom.toISOString(),
                    dateTo: dateTo.toISOString()
                },
                type: sequelize.QueryTypes.SELECT
            });

            let totalHours = 0;
            let completedCount = 0;

            assignments.forEach(a => {
                if (a.status === 'completed') {
                    completedCount++;
                    if (a.duration) {
                        totalHours += (parseFloat(a.duration) || 0) / 60; // duración en minutos, convertir a horas
                    }
                }
            });

            // Agrupar por categoría
            const byCategory = {};
            assignments.forEach(a => {
                const cat = a.category || 'other';
                if (!byCategory[cat]) byCategory[cat] = [];
                byCategory[cat].push(a);
            });

            return {
                totalAssigned: assignments.length,
                completed: completedCount,
                inProgress: assignments.filter(a => a.status === 'in_progress').length,
                pending: assignments.filter(a => a.status === 'pending').length,
                completionRate: assignments.length > 0
                    ? (completedCount / assignments.length * 100).toFixed(1)
                    : 0,
                totalTrainingHours: totalHours.toFixed(1),
                byCategory,
                recent: assignments.slice(0, 5).map(a => ({
                    title: a.title || 'Sin título',
                    category: a.category,
                    status: a.status,
                    progress: a.progress,
                    completedAt: a.completed_at
                }))
            };
        } catch (error) {
            console.error('Error obteniendo capacitaciones:', error);
            return { totalAssigned: 0, completed: 0, completionRate: 0 };
        }
    }

    // =========================================================================
    // HISTORIAL MÉDICO + ESTADÍSTICAS DE DIAGNÓSTICOS (v1.1)
    // =========================================================================
    async getMedicalHistory(userId, companyId, dateFrom, dateTo) {
        try {
            // Usar SQL raw para la tabla medical_certificates
            const certificates = await sequelize.query(`
                SELECT
                    id, company_id, user_id, certificate_number,
                    issue_date, start_date, end_date, requested_days as days,
                    diagnosis_code, diagnosis, symptoms, has_visited_doctor,
                    medical_center, attending_physician as doctor_name,
                    medical_prescription, status, auditor_id, auditor_response,
                    final_diagnosis, diagnosis_category, doctor_observations as observations,
                    medical_recommendations, follow_up_required, follow_up_date,
                    treating_physician, treating_physician_license, medical_institution,
                    notify_art, art_notified, art_notification_date,
                    approved_days, needs_audit, is_justified, audit_date,
                    attachments, created_by, last_modified_by,
                    created_at, updated_at
                FROM medical_certificates
                WHERE user_id = :userId
                AND company_id = :companyId
                AND created_at BETWEEN :dateFrom AND :dateTo
                ORDER BY created_at DESC
            `, {
                replacements: {
                    userId,
                    companyId,
                    dateFrom: dateFrom.toISOString(),
                    dateTo: dateTo.toISOString()
                },
                type: sequelize.QueryTypes.SELECT
            });

            let totalDaysOff = 0;
            const byDiagnosis = {};           // Estadísticas por diagnóstico
            const byDoctor = {};              // Estadísticas por médico
            const doctorObservations = [];    // Observaciones del médico
            const byMonth = {};               // Distribución mensual

            certificates.forEach(c => {
                totalDaysOff += c.days || 0;

                // Agrupar por diagnóstico
                const diagnosis = c.diagnosis || c.type || 'Sin especificar';
                if (!byDiagnosis[diagnosis]) {
                    byDiagnosis[diagnosis] = { count: 0, totalDays: 0, certificates: [] };
                }
                byDiagnosis[diagnosis].count++;
                byDiagnosis[diagnosis].totalDays += c.days || 0;
                byDiagnosis[diagnosis].certificates.push({
                    date: c.created_at,
                    days: c.days,
                    doctor: c.doctor_name || c.doctorName
                });

                // Agrupar por médico
                const doctorName = c.doctor_name || c.doctorName || 'No registrado';
                if (!byDoctor[doctorName]) {
                    byDoctor[doctorName] = { count: 0, totalDays: 0 };
                }
                byDoctor[doctorName].count++;
                byDoctor[doctorName].totalDays += c.days || 0;

                // Recopilar observaciones del médico
                if (c.observations || c.doctor_observations || c.medicalObservations) {
                    doctorObservations.push({
                        date: c.created_at,
                        diagnosis: diagnosis,
                        doctor: doctorName,
                        observation: c.observations || c.doctor_observations || c.medicalObservations,
                        days: c.days
                    });
                }

                // Distribución mensual
                const month = new Date(c.created_at).toISOString().slice(0, 7); // YYYY-MM
                if (!byMonth[month]) byMonth[month] = { count: 0, days: 0 };
                byMonth[month].count++;
                byMonth[month].days += c.days || 0;
            });

            // =========================================================================
            // ANÁLISIS ESTADÍSTICO DE DIAGNÓSTICOS
            // =========================================================================
            const diagnosisStats = Object.entries(byDiagnosis)
                .map(([diagnosis, data]) => ({
                    diagnosis,
                    count: data.count,
                    totalDays: data.totalDays,
                    avgDaysPerCase: data.count > 0 ? (data.totalDays / data.count).toFixed(1) : 0,
                    percentage: certificates.length > 0
                        ? ((data.count / certificates.length) * 100).toFixed(1)
                        : 0
                }))
                .sort((a, b) => b.count - a.count);

            // Diagnóstico más frecuente
            const mostFrequentDiagnosis = diagnosisStats[0] || null;

            // =========================================================================
            // PATRONES DE AUSENCIAS MÉDICAS
            // =========================================================================
            const medicalPatterns = {
                // Frecuencia: ¿Cuántos certificados por mes en promedio?
                avgCertificatesPerMonth: Object.keys(byMonth).length > 0
                    ? (certificates.length / Object.keys(byMonth).length).toFixed(1)
                    : 0,

                // ¿Hay concentración de ausencias en ciertos meses?
                peakMonth: Object.entries(byMonth)
                    .sort((a, b) => b[1].count - a[1].count)[0] || null,

                // Duración promedio de licencias
                avgDuration: certificates.length > 0
                    ? (totalDaysOff / certificates.length).toFixed(1)
                    : 0,

                // ¿Patrón de ausencias cortas frecuentes? (posible abuso)
                shortAbsencesPattern: certificates.filter(c => (c.days || 0) <= 2).length,
                shortAbsencesPercentage: certificates.length > 0
                    ? ((certificates.filter(c => (c.days || 0) <= 2).length / certificates.length) * 100).toFixed(1)
                    : 0,

                // ¿Patrón de licencias largas? (posible problema de salud crónico)
                longAbsencesPattern: certificates.filter(c => (c.days || 0) >= 5).length,

                // Alerta por frecuencia
                frequencyAlert: this.calculateMedicalFrequencyAlert(certificates.length, totalDaysOff, dateFrom, dateTo)
            };

            return {
                totalCertificates: certificates.length,
                totalDaysOff,
                byType: {
                    illness: certificates.filter(c => c.type === 'illness').length,
                    injury: certificates.filter(c => c.type === 'injury').length,
                    checkup: certificates.filter(c => c.type === 'checkup').length,
                    other: certificates.filter(c => !['illness', 'injury', 'checkup'].includes(c.type)).length
                },
                // ✅ NUEVO: Estadísticas por diagnóstico
                diagnosisStats,
                mostFrequentDiagnosis,
                // ✅ NUEVO: Estadísticas por médico
                byDoctor: Object.entries(byDoctor).map(([doctor, data]) => ({
                    doctor,
                    certificatesIssued: data.count,
                    totalDays: data.totalDays
                })).sort((a, b) => b.certificatesIssued - a.certificatesIssued),
                // ✅ NUEVO: Observaciones del médico
                doctorObservations: doctorObservations.slice(0, 10),
                totalObservations: doctorObservations.length,
                // ✅ NUEVO: Distribución mensual
                byMonth: Object.entries(byMonth).map(([month, data]) => ({
                    month,
                    count: data.count,
                    days: data.days
                })).sort((a, b) => b.month.localeCompare(a.month)),
                // ✅ NUEVO: Patrones detectados
                medicalPatterns,
                recent: certificates.slice(0, 5).map(c => ({
                    date: c.created_at,
                    type: c.type,
                    diagnosis: c.diagnosis || c.type,
                    days: c.days,
                    description: c.description,
                    doctor: c.doctor_name || c.doctorName,
                    observations: c.observations || c.doctor_observations
                })),
                averageDaysPerCertificate: certificates.length > 0
                    ? (totalDaysOff / certificates.length).toFixed(1)
                    : 0
            };
        } catch (error) {
            console.error('Error obteniendo historial médico:', error);
            return { totalCertificates: 0, totalDaysOff: 0, byType: {}, diagnosisStats: [], medicalPatterns: null };
        }
    }

    // Calcular alerta por frecuencia de ausencias médicas
    calculateMedicalFrequencyAlert(totalCertificates, totalDays, dateFrom, dateTo) {
        // Calcular meses en el período
        const monthsInPeriod = Math.max(1,
            (new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24 * 30)
        );

        const certsPerMonth = totalCertificates / monthsInPeriod;
        const daysPerMonth = totalDays / monthsInPeriod;

        // Umbrales de alerta
        if (certsPerMonth >= 2 || daysPerMonth >= 5) {
            return {
                level: 'ALTO',
                color: '#dc3545',
                emoji: '🔴',
                description: 'Frecuencia de ausencias médicas significativamente alta',
                certsPerMonth: certsPerMonth.toFixed(1),
                daysPerMonth: daysPerMonth.toFixed(1)
            };
        }
        if (certsPerMonth >= 1 || daysPerMonth >= 3) {
            return {
                level: 'MODERADO',
                color: '#ffc107',
                emoji: '🟡',
                description: 'Frecuencia de ausencias médicas por encima del promedio',
                certsPerMonth: certsPerMonth.toFixed(1),
                daysPerMonth: daysPerMonth.toFixed(1)
            };
        }
        return {
            level: 'NORMAL',
            color: '#28a745',
            emoji: '🟢',
            description: 'Frecuencia de ausencias médicas dentro de parámetros normales',
            certsPerMonth: certsPerMonth.toFixed(1),
            daysPerMonth: daysPerMonth.toFixed(1)
        };
    }

    // =========================================================================
    // CÁLCULO DE SCORING (v2.0 - 6 Dimensiones como promete el marketing)
    // =========================================================================
    calculateScoring(data) {
        // 6 dimensiones como se muestra en index.html
        const weights = {
            attendance: 0.20,      // 20% - Asistencia
            punctuality: 0.20,     // 20% - Puntualidad
            discipline: 0.15,      // 15% - Disciplina (sanciones)
            training: 0.15,        // 15% - Capacitación
            stability: 0.15,       // 15% - Estabilidad (antigüedad, vacaciones)
            health: 0.15           // 15% - Salud (certificados médicos)
        };

        const categories = {};

        // Score Asistencia (0-100)
        categories.attendance = {
            score: Math.min(100, parseFloat(data.attendance.attendanceRate) || 0),
            weight: weights.attendance,
            label: 'Asistencia'
        };

        // Score Puntualidad (0-100)
        categories.punctuality = {
            score: Math.min(100, parseFloat(data.attendance.punctualityRate) || 0),
            weight: weights.punctuality,
            label: 'Puntualidad'
        };

        // Score Disciplina (0-100) - Menos sanciones = mejor score
        const sanctionPenalty = (data.sanctions.total || 0) * 10;
        categories.discipline = {
            score: Math.max(0, 100 - sanctionPenalty),
            weight: weights.discipline,
            label: 'Disciplina'
        };

        // Score Capacitación (0-100)
        categories.training = {
            score: Math.min(100, parseFloat(data.training.completionRate) || 0),
            weight: weights.training,
            label: 'Capacitación'
        };

        // Score Estabilidad (0-100) - Antigüedad y consistencia
        // Basado en antigüedad: +1 año = mejor estabilidad
        const tenureDays = data.employee?.tenure?.totalDays || 0;
        const tenureScore = Math.min(100, tenureDays / 365 * 25); // Max 100 a los 4 años
        const vacationRejections = data.vacations?.rejected || 0;
        const stabilityBase = Math.max(0, 100 - (vacationRejections * 5));
        categories.stability = {
            score: Math.min(100, (stabilityBase + tenureScore) / 2),
            weight: weights.stability,
            label: 'Estabilidad'
        };

        // Score Salud (0-100) - Nueva dimensión
        // Menos días de licencia médica = mejor score
        // 0 días = 100%, 30+ días = 0%
        const medicalDays = data.medical.totalDaysOff || 0;
        const healthScore = Math.max(0, 100 - (medicalDays / 30 * 100));
        const certificatePatternPenalty = (data.medical.suspiciousPatterns || 0) * 10;
        categories.health = {
            score: Math.max(0, Math.min(100, healthScore - certificatePatternPenalty)),
            weight: weights.health,
            label: 'Salud'
        };

        // Calcular score total ponderado
        let total = 0;
        Object.values(categories).forEach(cat => {
            total += cat.score * cat.weight;
        });

        // =========================================================================
        // BONUS POR ROLES ADICIONALES v1.1
        // Los roles adicionales dan un bonus sobre el score base (max +15%)
        // Cada rol tiene un scoringBonus definido (ej: bombero_interno = +8%)
        // =========================================================================
        const additionalRoles = data.additionalRoles || [];
        let rolesBonusDetails = [];
        let totalRolesBonus = 0;

        if (additionalRoles.length > 0) {
            // Bonus base por tipo de rol (si no viene de BD)
            const defaultBonuses = {
                bombero_interno: 0.08,
                brigadista: 0.06,
                coordinador_evacuacion: 0.05,
                primeros_auxilios: 0.07,
                auxiliar_medico: 0.05,
                capacitador_interno: 0.10,
                mentor: 0.05,
                instructor_seguridad: 0.08,
                auditor_interno: 0.10,
                inspector_seguridad: 0.07,
                auditor_calidad: 0.08,
                lider_equipo: 0.06,
                coordinador_turno: 0.07,
                delegado_sindical: 0.03,
                representante_cymat: 0.05,
                responsable_ambiental: 0.05,
                padrino_5s: 0.04
            };

            // Calcular bonus por cada rol activo
            additionalRoles.forEach(role => {
                if (role.isActive !== false) { // Solo roles activos
                    const roleKey = role.roleKey || role.role_key;
                    const bonus = role.scoringBonus || role.scoring_bonus || defaultBonuses[roleKey] || 0.03;

                    // Verificar si la certificación no está vencida
                    let isCertificationValid = true;
                    if (role.certificationExpiry) {
                        isCertificationValid = new Date(role.certificationExpiry) > new Date();
                    }

                    if (isCertificationValid) {
                        totalRolesBonus += bonus;
                        rolesBonusDetails.push({
                            roleKey,
                            roleName: role.roleName || role.role_name || roleKey,
                            bonus: bonus,
                            bonusPercent: (bonus * 100).toFixed(1) + '%',
                            certificationValid: isCertificationValid,
                            certificationExpiry: role.certificationExpiry
                        });
                    }
                }
            });

            // Cap máximo: +15% de bonus
            totalRolesBonus = Math.min(totalRolesBonus, 0.15);
        }

        // Aplicar bonus al score total
        const baseScore = total;
        const bonusPoints = baseScore * totalRolesBonus;
        total = Math.min(100, total + bonusPoints); // Cap a 100

        return {
            total: Math.round(total),
            baseScore: Math.round(baseScore),
            categories,
            // Detalle del bonus por roles adicionales
            additionalRolesBonus: {
                applied: totalRolesBonus > 0,
                totalBonusPercent: (totalRolesBonus * 100).toFixed(1) + '%',
                bonusPoints: Math.round(bonusPoints),
                rolesCount: rolesBonusDetails.length,
                details: rolesBonusDetails
            },
            trend: 'stable' // TODO: Calcular tendencia comparando con período anterior
        };
    }

    // =========================================================================
    // ÍNDICE DE RIESGO DE FUGA (v2.0 - Algoritmo Predictivo)
    // Como se muestra en index.html: 0-25% BAJO, 26-50% MEDIO, 51-75% ALTO, 76-100% CRÍTICO
    // =========================================================================
    calculateFlightRisk(data) {
        let riskScore = 0;
        const riskFactors = [];

        // === FACTOR 1: Antigüedad (0-15 puntos) ===
        // Menos de 6 meses = alto riesgo
        const tenureDays = data.employee?.tenure?.totalDays || 0;
        if (tenureDays < 90) {
            riskScore += 15;
            riskFactors.push({ factor: 'Antigüedad muy baja', impact: 15, detail: 'Menos de 3 meses en la empresa' });
        } else if (tenureDays < 180) {
            riskScore += 10;
            riskFactors.push({ factor: 'Antigüedad baja', impact: 10, detail: 'Menos de 6 meses en la empresa' });
        } else if (tenureDays < 365) {
            riskScore += 5;
            riskFactors.push({ factor: 'Primer año', impact: 5, detail: 'Menos de 1 año en la empresa' });
        }

        // === FACTOR 2: Patrón de ausencias los lunes/viernes (0-20 puntos) ===
        // Patrón "fin de semana largo" es un indicador fuerte
        const fridayAbsences = data.attendance?.behaviorPatterns?.fridayAbsences || 0;
        const mondayAbsences = data.attendance?.behaviorPatterns?.mondayAbsences || 0;
        const weekendPattern = fridayAbsences + mondayAbsences;
        if (weekendPattern >= 5) {
            riskScore += 20;
            riskFactors.push({ factor: 'Patrón fin de semana largo', impact: 20, detail: `${weekendPattern} ausencias viernes/lunes`, status: 'critical' });
        } else if (weekendPattern >= 3) {
            riskScore += 12;
            riskFactors.push({ factor: 'Patrón fin de semana largo', impact: 12, detail: `${weekendPattern} ausencias viernes/lunes`, status: 'warning' });
        } else if (weekendPattern >= 1) {
            riskScore += 5;
            riskFactors.push({ factor: 'Posible patrón fin de semana', impact: 5, detail: `${weekendPattern} ausencias viernes/lunes`, status: 'monitor' });
        }

        // === FACTOR 3: Tardanzas consecutivas (0-15 puntos) ===
        const maxConsecutiveLates = data.attendance?.behaviorPatterns?.maxConsecutiveLates || 0;
        if (maxConsecutiveLates >= 5) {
            riskScore += 15;
            riskFactors.push({ factor: 'Tardanzas consecutivas frecuentes', impact: 15, detail: `${maxConsecutiveLates} tardanzas consecutivas`, status: 'critical' });
        } else if (maxConsecutiveLates >= 3) {
            riskScore += 8;
            riskFactors.push({ factor: 'Tardanzas consecutivas', impact: 8, detail: `${maxConsecutiveLates} tardanzas consecutivas`, status: 'warning' });
        }

        // === FACTOR 4: Sanciones recientes (0-20 puntos) ===
        const totalSanctions = data.sanctions?.total || 0;
        const severeSanctions = (data.sanctions?.severity?.suspension || 0) + (data.sanctions?.severity?.written || 0);
        if (severeSanctions >= 2) {
            riskScore += 20;
            riskFactors.push({ factor: 'Sanciones graves múltiples', impact: 20, detail: `${severeSanctions} sanciones graves`, status: 'critical' });
        } else if (totalSanctions >= 3) {
            riskScore += 12;
            riskFactors.push({ factor: 'Historial disciplinario', impact: 12, detail: `${totalSanctions} sanciones en el período`, status: 'warning' });
        } else if (totalSanctions >= 1) {
            riskScore += 5;
            riskFactors.push({ factor: 'Sanciones leves', impact: 5, detail: `${totalSanctions} sanción(es)`, status: 'monitor' });
        }

        // === FACTOR 5: Sin capacitaciones completadas (0-10 puntos) ===
        const trainingCompleted = data.training?.completed || 0;
        const trainingAssigned = data.training?.assigned || 0;
        if (trainingAssigned > 0 && trainingCompleted === 0) {
            riskScore += 10;
            riskFactors.push({ factor: 'Sin capacitaciones completadas', impact: 10, detail: `${trainingAssigned} pendientes`, status: 'warning' });
        } else if (trainingAssigned > trainingCompleted * 2) {
            riskScore += 5;
            riskFactors.push({ factor: 'Baja participación en capacitaciones', impact: 5, detail: `${trainingCompleted}/${trainingAssigned} completadas`, status: 'monitor' });
        }

        // === FACTOR 6: Certificados médicos frecuentes (0-15 puntos) ===
        const totalCertificates = data.medical?.totalCertificates || 0;
        const totalDaysOff = data.medical?.totalDaysOff || 0;
        if (totalCertificates >= 5) {
            riskScore += 15;
            riskFactors.push({ factor: 'Certificados médicos frecuentes', impact: 15, detail: `${totalCertificates} certificados (${totalDaysOff} días)`, status: 'critical' });
        } else if (totalCertificates >= 3) {
            riskScore += 8;
            riskFactors.push({ factor: 'Varios certificados médicos', impact: 8, detail: `${totalCertificates} certificados`, status: 'warning' });
        }

        // === FACTOR 7: Sin actualización de datos biométricos (0-5 puntos) ===
        if (!data.employee?.hasFingerprint && !data.employee?.hasFacialData) {
            riskScore += 5;
            riskFactors.push({ factor: 'Sin datos biométricos', impact: 5, detail: 'Huella ni rostro registrado', status: 'low' });
        }

        // Limitar a 100
        riskScore = Math.min(100, riskScore);

        // Determinar nivel de riesgo
        let riskLevel, riskLabel, riskColor, insight;
        if (riskScore <= 25) {
            riskLevel = 'low';
            riskLabel = 'BAJO';
            riskColor = '#22c55e';
            insight = 'Alta estabilidad. Recomendar programa de desarrollo para retener talento.';
        } else if (riskScore <= 50) {
            riskLevel = 'medium';
            riskLabel = 'MEDIO';
            riskColor = '#f59e0b';
            insight = 'Monitorear patrones de comportamiento. Considerar reunión 1:1 preventiva.';
        } else if (riskScore <= 75) {
            riskLevel = 'high';
            riskLabel = 'ALTO';
            riskColor = '#ef4444';
            insight = 'Riesgo significativo de rotación. Acción inmediata recomendada: entrevista de retención.';
        } else {
            riskLevel = 'critical';
            riskLabel = 'CRÍTICO';
            riskColor = '#dc2626';
            insight = 'Riesgo inminente de salida. Requiere intervención urgente de RRHH.';
        }

        return {
            score: riskScore,
            level: riskLevel,
            label: riskLabel,
            color: riskColor,
            insight: insight,
            factors: riskFactors,
            recommendation: this.getFlightRiskRecommendation(riskLevel, riskFactors)
        };
    }

    // Generar recomendaciones basadas en el riesgo de fuga
    getFlightRiskRecommendation(riskLevel, factors) {
        const recommendations = [];

        if (riskLevel === 'critical' || riskLevel === 'high') {
            recommendations.push({
                priority: 'ALTA',
                action: 'Programar entrevista de retención inmediata',
                timeframe: 'Esta semana'
            });
        }

        // Recomendaciones específicas por factor
        factors.forEach(f => {
            if (f.factor.includes('fin de semana')) {
                recommendations.push({
                    priority: f.status === 'critical' ? 'ALTA' : 'MEDIA',
                    action: 'Investigar causa de ausencias cercanas al fin de semana',
                    timeframe: 'Próximos 15 días'
                });
            }
            if (f.factor.includes('capacitaciones')) {
                recommendations.push({
                    priority: 'MEDIA',
                    action: 'Revisar plan de desarrollo y capacitación del empleado',
                    timeframe: 'Próximo mes'
                });
            }
            if (f.factor.includes('Sanciones')) {
                recommendations.push({
                    priority: 'ALTA',
                    action: 'Reunión con supervisor para evaluar clima laboral',
                    timeframe: 'Próximos 7 días'
                });
            }
        });

        if (recommendations.length === 0) {
            recommendations.push({
                priority: 'BAJA',
                action: 'Mantener seguimiento regular del empleado',
                timeframe: 'Trimestral'
            });
        }

        return recommendations;
    }

    // =========================================================================
    // DETECCIÓN DE PATRONES DE COMPORTAMIENTO
    // =========================================================================
    detectBehaviorPatterns(data) {
        const patterns = [];

        // Patrón 1: Tardanzas recurrentes
        const lateArrivals = data.attendance?.lateArrivals || 0;
        const totalDays = data.attendance?.totalDays || 1;
        const lateRate = (lateArrivals / totalDays) * 100;
        if (lateRate > 20) {
            patterns.push({
                name: 'Recurrencia de Tardanzas',
                status: lateRate > 40 ? 'critical' : 'warning',
                statusLabel: lateRate > 40 ? 'CRÍTICO' : 'MONITOREAR',
                stats: `${lateArrivals} tardanzas en ${totalDays} días | ${lateRate.toFixed(0)}%`
            });
        } else {
            patterns.push({
                name: 'Recurrencia de Tardanzas',
                status: 'ok',
                statusLabel: 'ÓPTIMO',
                stats: `${lateArrivals} tardanzas en ${totalDays} días | Promedio: ${data.attendance?.avgLateMinutes || 0} min`
            });
        }

        // Patrón 2: Fin de semana largo
        const weekendAbsences = (data.attendance?.behaviorPatterns?.fridayAbsences || 0) +
                               (data.attendance?.behaviorPatterns?.mondayAbsences || 0);
        if (weekendAbsences >= 3) {
            patterns.push({
                name: 'Patrón Fin de Semana Largo',
                status: weekendAbsences >= 5 ? 'critical' : 'warning',
                statusLabel: weekendAbsences >= 5 ? 'CRÍTICO' : 'MONITOREAR',
                stats: `${weekendAbsences} ausencias viernes/lunes en el período`
            });
        } else {
            patterns.push({
                name: 'Patrón Fin de Semana Largo',
                status: 'ok',
                statusLabel: 'NO DETECTADO',
                stats: weekendAbsences > 0 ? `${weekendAbsences} ausencia(s) - dentro de lo normal` : 'Sin ausencias cercanas al fin de semana'
            });
        }

        // Patrón 3: Mínimo esfuerzo (salidas tempranas recurrentes)
        const earlyDepartures = data.attendance?.earlyDepartures || 0;
        const avgOvertimeHours = data.attendance?.avgOvertimeHours || 0;
        if (earlyDepartures > 5 && avgOvertimeHours <= 0) {
            patterns.push({
                name: 'Patrón Mínimo Esfuerzo',
                status: 'warning',
                statusLabel: 'DETECTADO',
                stats: `${earlyDepartures} salidas tempranas | Sin horas extra`
            });
        } else if (avgOvertimeHours > 0) {
            patterns.push({
                name: 'Patrón Mínimo Esfuerzo',
                status: 'ok',
                statusLabel: 'NO DETECTADO',
                stats: `+${avgOvertimeHours.toFixed(0)} min promedio sobre horario`
            });
        } else {
            patterns.push({
                name: 'Patrón Mínimo Esfuerzo',
                status: 'ok',
                statusLabel: 'NO DETECTADO',
                stats: 'Cumplimiento de horario normal'
            });
        }

        // Patrón 4: Frecuencia de certificados médicos
        const certificatesPerYear = data.medical?.totalCertificates || 0;
        const avgCertificatesForPosition = 2; // Promedio normal por puesto
        if (certificatesPerYear > avgCertificatesForPosition * 2) {
            patterns.push({
                name: 'Frecuencia de Certificados',
                status: 'warning',
                statusLabel: 'ELEVADA',
                stats: `${certificatesPerYear} certificados/año | Promedio del puesto: ${avgCertificatesForPosition}`
            });
        } else {
            patterns.push({
                name: 'Frecuencia de Certificados',
                status: 'ok',
                statusLabel: 'NORMAL',
                stats: `${certificatesPerYear} certificados/año | Normal para el puesto`
            });
        }

        return patterns;
    }

    // =========================================================================
    // TIMELINE UNIFICADO
    // =========================================================================
    generateUnifiedTimeline(data) {
        const events = [];

        // Agregar eventos de auditoría
        if (data.auditHistory?.recent) {
            data.auditHistory.recent.forEach(log => {
                events.push({
                    date: log.created_at,
                    type: 'audit',
                    category: log.action,
                    title: log.description || `${log.action}: ${log.field_name}`,
                    icon: '📝',
                    color: '#6c757d'
                });
            });
        }

        // Agregar eventos de asistencia (tardanzas, ausencias)
        if (data.attendanceData?.recentRecords) {
            data.attendanceData.recentRecords.forEach(att => {
                if (att.status === 'late') {
                    events.push({
                        date: att.date,
                        type: 'attendance',
                        category: 'late',
                        title: `Llegada tardía: ${att.checkIn}`,
                        icon: '⏰',
                        color: '#ffc107'
                    });
                } else if (att.status === 'absent') {
                    events.push({
                        date: att.date,
                        type: 'attendance',
                        category: 'absent',
                        title: 'Ausencia registrada',
                        icon: '❌',
                        color: '#dc3545'
                    });
                }
            });
        }

        // Agregar sanciones
        if (data.sanctionsData?.recent) {
            data.sanctionsData.recent.forEach(s => {
                events.push({
                    date: s.date,
                    type: 'sanction',
                    category: s.severity,
                    title: `Sanción: ${s.description || s.type}`,
                    icon: '⚠️',
                    color: '#dc3545'
                });
            });
        }

        // Agregar vacaciones
        if (data.vacationsData?.recent) {
            data.vacationsData.recent.forEach(v => {
                events.push({
                    date: v.dateFrom,
                    type: 'vacation',
                    category: v.status,
                    title: `Vacaciones: ${v.days} días (${v.status})`,
                    icon: '🏖️',
                    color: '#17a2b8'
                });
            });
        }

        // Agregar capacitaciones
        if (data.trainingData?.recent) {
            data.trainingData.recent.forEach(t => {
                events.push({
                    date: t.completedAt || new Date(),
                    type: 'training',
                    category: t.status,
                    title: `Capacitación: ${t.title}`,
                    icon: '📚',
                    color: '#28a745'
                });
            });
        }

        // Ordenar por fecha descendente
        events.sort((a, b) => new Date(b.date) - new Date(a.date));

        return events;
    }

    // =========================================================================
    // ANÁLISIS CON IA (OLLAMA) - Con timeout para evitar bloqueos
    // =========================================================================
    async generateAIAnalysis(employee, data) {
        try {
            // Timeout de 5 segundos para health check
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            // Verificar si Ollama está disponible
            let healthCheck;
            try {
                healthCheck = await fetch(`${this.ollamaBaseUrl}/api/tags`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
            } catch (fetchError) {
                clearTimeout(timeoutId);
                console.log('⚠️ [360°] Ollama no disponible (timeout o conexión rechazada), omitiendo análisis IA');
                return this.generateFallbackAnalysis(data);
            }

            if (!healthCheck.ok) {
                console.log('⚠️ [360°] Ollama no disponible, omitiendo análisis IA');
                return this.generateFallbackAnalysis(data);
            }

            const prompt = `Eres un analista de RRHH experto. Analiza el siguiente perfil de empleado y genera un resumen ejecutivo en español.

EMPLEADO: ${employee.firstName} ${employee.lastName}
PUESTO: ${employee.position || 'No especificado'}
ANTIGÜEDAD: ${this.calculateTenure(employee.hireDate)}

MÉTRICAS DEL PERÍODO:
- Score Total: ${data.scoring.total}/100
- Asistencia: ${data.scoring.categories.attendance?.score || 0}%
- Puntualidad: ${data.scoring.categories.punctuality?.score || 0}%
- Disciplina: ${data.scoring.categories.discipline?.score || 0}/100
- Capacitación: ${data.scoring.categories.training?.score || 0}%

DATOS DETALLADOS:
- Tardanzas: ${data.attendanceData?.lateArrivals || 0}
- Ausencias: ${data.attendanceData?.absences || 0}
- Sanciones: ${data.sanctionsData?.total || 0}
- Capacitaciones completadas: ${data.trainingData?.completed || 0}

Genera un análisis que incluya:
1. RESUMEN (2-3 oraciones sobre el desempeño general)
2. FORTALEZAS (lista 2-3 puntos positivos)
3. ÁREAS DE MEJORA (lista 2-3 puntos a mejorar)
4. RECOMENDACIONES (lista 2-3 acciones sugeridas)

Sé objetivo, profesional y constructivo.`;

            // Timeout de 30 segundos para generación
            const genController = new AbortController();
            const genTimeoutId = setTimeout(() => genController.abort(), 30000);

            let response;
            try {
                response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: this.ollamaModel,
                        prompt,
                        stream: false,
                        options: {
                            temperature: 0.7,
                            num_predict: 500
                        }
                    }),
                    signal: genController.signal
                });
                clearTimeout(genTimeoutId);
            } catch (genError) {
                clearTimeout(genTimeoutId);
                console.log('⚠️ [360°] Timeout en generación IA, usando fallback');
                return {
                    generated: false,
                    error: 'Timeout en análisis IA',
                    fallback: this.generateFallbackAnalysis(data)
                };
            }

            if (!response.ok) {
                throw new Error('Error en respuesta de Ollama');
            }

            const result = await response.json();

            return {
                generated: true,
                model: this.ollamaModel,
                analysis: result.response,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('⚠️ [360°] Error generando análisis IA:', error.message);
            return {
                generated: false,
                error: error.message,
                fallback: this.generateFallbackAnalysis(data)
            };
        }
    }

    // Análisis de respaldo sin IA
    generateFallbackAnalysis(data) {
        const score = data.scoring.total;
        let summary = '';
        let strengths = [];
        let improvements = [];

        if (score >= 80) {
            summary = 'Empleado con excelente desempeño general. Mantiene altos estándares en la mayoría de las áreas evaluadas.';
            strengths = ['Alto nivel de asistencia', 'Buen historial disciplinario', 'Compromiso con la capacitación'];
        } else if (score >= 60) {
            summary = 'Empleado con desempeño satisfactorio. Muestra áreas de fortaleza junto con oportunidades de mejora.';
            strengths = ['Cumple con requisitos básicos', 'Potencial de crecimiento identificado'];
            improvements = ['Mejorar puntualidad', 'Completar capacitaciones pendientes'];
        } else {
            summary = 'Empleado que requiere atención en varias áreas. Se recomienda seguimiento cercano y plan de mejora.';
            improvements = ['Mejorar asistencia', 'Reducir tardanzas', 'Completar capacitaciones obligatorias'];
        }

        return { summary, strengths, improvements };
    }

    // =========================================================================
    // UTILIDADES
    // =========================================================================
    calculateTenure(hireDate) {
        if (!hireDate) return 'No disponible';

        const hire = new Date(hireDate);
        const now = new Date();
        const years = Math.floor((now - hire) / (365.25 * 24 * 60 * 60 * 1000));
        const months = Math.floor(((now - hire) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));

        if (years > 0) {
            return `${years} año${years > 1 ? 's' : ''}, ${months} mes${months > 1 ? 'es' : ''}`;
        }
        return `${months} mes${months > 1 ? 'es' : ''}`;
    }

    getGrade(score) {
        if (score >= 90) return { letter: 'A', label: 'Excelente', color: '#28a745' };
        if (score >= 80) return { letter: 'B', label: 'Muy Bueno', color: '#20c997' };
        if (score >= 70) return { letter: 'C', label: 'Bueno', color: '#17a2b8' };
        if (score >= 60) return { letter: 'D', label: 'Regular', color: '#ffc107' };
        return { letter: 'F', label: 'Necesita Mejora', color: '#dc3545' };
    }

    calculateDataCompleteness(data) {
        let complete = 0;
        let total = 5;

        if (data.attendanceData?.totalDays > 0) complete++;
        if (data.sanctionsData?.total !== undefined) complete++;
        if (data.vacationsData?.totalRequests !== undefined) complete++;
        if (data.trainingData?.totalAssigned !== undefined) complete++;
        if (data.medicalData?.totalCertificates !== undefined) complete++;

        return Math.round((complete / total) * 100);
    }

    // =========================================================================
    // COMPARACIÓN ENTRE EMPLEADOS
    // =========================================================================
    async compareEmployees(userIds, companyId, options = {}) {
        const reports = await Promise.all(
            userIds.map(userId => this.getFullReport(userId, companyId, { ...options, includeAIAnalysis: false }))
        );

        return {
            employees: reports.map(r => ({
                id: r.employee.id,
                name: r.employee.fullName,
                department: r.employee.department,
                score: r.scoring.total,
                grade: r.scoring.grade
            })),
            comparison: {
                averageScore: reports.reduce((sum, r) => sum + r.scoring.total, 0) / reports.length,
                bestPerformer: reports.sort((a, b) => b.scoring.total - a.scoring.total)[0]?.employee.fullName,
                categories: this.compareByCategory(reports)
            }
        };
    }

    compareByCategory(reports) {
        const categories = ['attendance', 'punctuality', 'discipline', 'training', 'stability'];
        const comparison = {};

        categories.forEach(cat => {
            const scores = reports.map(r => r.scoring.categories[cat]?.score || 0);
            comparison[cat] = {
                average: scores.reduce((a, b) => a + b, 0) / scores.length,
                min: Math.min(...scores),
                max: Math.max(...scores)
            };
        });

        return comparison;
    }

    // =========================================================================
    // DATOS COMPLETOS DEL USUARIO (TODOS LOS TABS)
    // =========================================================================

    /**
     * Obtiene información del grupo familiar
     */
    async getFamilyInfo(userId, companyId) {
        try {
            const query = `
                SELECT
                    fm.id, fm.relation, fm.first_name, fm.last_name, fm.birth_date,
                    fm.dni, fm.occupation, fm.phone, fm.is_emergency_contact, fm.is_beneficiary,
                    fm.healthcare_provider, fm.healthcare_number
                FROM user_family_members fm
                WHERE fm.user_id = $1
                ORDER BY fm.relation, fm.birth_date
            `;
            const result = await sequelize.query(query, {
                bind: [userId],
                type: sequelize.QueryTypes.SELECT
            });

            // Obtener hijos específicamente
            const childrenQuery = `
                SELECT id, first_name, last_name, birth_date, gender, school_name, school_grade,
                       has_disability, disability_description, healthcare_provider
                FROM user_children
                WHERE user_id = $1
                ORDER BY birth_date
            `;
            const children = await sequelize.query(childrenQuery, {
                bind: [userId],
                type: sequelize.QueryTypes.SELECT
            });

            // Estado civil
            const maritalQuery = `
                SELECT status, marriage_date, spouse_name, spouse_dni, spouse_occupation
                FROM user_marital_status
                WHERE user_id = $1
            `;
            const maritalResult = await sequelize.query(maritalQuery, {
                bind: [userId],
                type: sequelize.QueryTypes.SELECT
            });

            return {
                familyMembers: result || [],
                children: children || [],
                maritalStatus: maritalResult[0] || null,
                totalMembers: (result?.length || 0) + (children?.length || 0)
            };
        } catch (error) {
            console.log(`⚠️ [360°] getFamilyInfo error (tabla puede no existir): ${error.message}`);
            return { familyMembers: [], children: [], maritalStatus: null, totalMembers: 0 };
        }
    }

    /**
     * Obtiene información educativa
     */
    async getEducationInfo(userId, companyId) {
        try {
            const query = `
                SELECT id, institution, degree, field_of_study, start_date, end_date,
                       is_completed, grade_average, document_url, notes
                FROM user_education
                WHERE user_id = $1
                ORDER BY end_date DESC NULLS FIRST
            `;
            const result = await sequelize.query(query, {
                bind: [userId],
                type: sequelize.QueryTypes.SELECT
            });

            return {
                education: result || [],
                highestDegree: result[0]?.degree || 'No especificado',
                totalRecords: result?.length || 0
            };
        } catch (error) {
            console.log(`⚠️ [360°] getEducationInfo error: ${error.message}`);
            return { education: [], highestDegree: 'No especificado', totalRecords: 0 };
        }
    }

    /**
     * Obtiene información médica completa (alergias, condiciones, medicamentos, vacunas)
     */
    async getCompleteMedicalInfo(userId, companyId) {
        try {
            // Alergias
            const allergiesQuery = `SELECT id, allergy_type, allergen, severity, reaction_description, diagnosed_date FROM user_allergies WHERE user_id = $1`;
            const allergies = await sequelize.query(allergiesQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Condiciones crónicas
            const conditionsQuery = `SELECT id, condition_name, diagnosis_date, severity, is_controlled, treating_doctor, notes FROM user_chronic_conditions WHERE user_id = $1`;
            const conditions = await sequelize.query(conditionsQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Medicamentos
            const medicationsQuery = `SELECT id, medication_name, dosage, frequency, start_date, end_date, prescribed_by, reason FROM user_medications WHERE user_id = $1`;
            const medications = await sequelize.query(medicationsQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Vacunas
            const vaccinationsQuery = `SELECT id, vaccine_name, date_administered, dose_number, administered_by, next_dose_date, batch_number FROM user_vaccinations WHERE user_id = $1`;
            const vaccinations = await sequelize.query(vaccinationsQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Restricciones de actividad
            const activityRestrictionsQuery = `SELECT id, restriction_type, description, start_date, end_date, is_permanent, prescribed_by FROM user_activity_restrictions WHERE user_id = $1`;
            const activityRestrictions = await sequelize.query(activityRestrictionsQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Restricciones laborales
            const workRestrictionsQuery = `SELECT id, restriction_type, description, start_date, end_date, is_permanent, medical_certificate_url FROM user_work_restrictions WHERE user_id = $1`;
            const workRestrictions = await sequelize.query(workRestrictionsQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Médico de cabecera
            const physicianQuery = `SELECT name, specialty, phone, email, clinic_name, clinic_address FROM user_primary_physician WHERE user_id = $1`;
            const physician = await sequelize.query(physicianQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Exámenes médicos
            const examsQuery = `SELECT id, exam_type, exam_date, result, next_exam_date, performed_by, notes, document_url FROM user_medical_exams WHERE user_id = $1 ORDER BY exam_date DESC`;
            const exams = await sequelize.query(examsQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // =====================================================================
            // NUEVOS DATOS MÉDICOS AVANZADOS (v2.0 - Enero 2025)
            // =====================================================================

            // Datos antropométricos (peso, altura, IMC, circunferencias)
            const anthropometricQuery = `
                SELECT id, weight_kg, height_cm, bmi, bmi_category, waist_circumference_cm,
                       hip_circumference_cm, body_fat_percentage, muscle_mass_percentage,
                       blood_pressure_systolic, blood_pressure_diastolic, resting_heart_rate,
                       measurement_date, measured_by, notes
                FROM user_anthropometric_data
                WHERE user_id = $1
                ORDER BY measurement_date DESC
                LIMIT 10
            `;
            const anthropometricData = await sequelize.query(anthropometricQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Historial de cirugías
            const surgeriesQuery = `
                SELECT id, surgery_type, surgery_name, surgery_date, hospital_name, surgeon_name,
                       anesthesia_type, outcome, complications, recovery_days, follow_up_required,
                       follow_up_date, notes, document_url
                FROM user_surgeries
                WHERE user_id = $1
                ORDER BY surgery_date DESC
            `;
            const surgeries = await sequelize.query(surgeriesQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Tratamientos psiquiátricos/psicológicos
            const psychiatricQuery = `
                SELECT id, treatment_type, condition_name, diagnosis_date, treating_professional,
                       professional_specialty, treatment_status, current_medications,
                       session_frequency, start_date, end_date, is_work_related,
                       requires_accommodation, notes
                FROM user_psychiatric_treatments
                WHERE user_id = $1
                ORDER BY start_date DESC
            `;
            const psychiatricTreatments = await sequelize.query(psychiatricQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Actividades deportivas
            const sportsQuery = `
                SELECT id, sport_name, sport_category, practice_level, is_federated,
                       federation_name, license_number, weekly_hours, years_practicing,
                       competition_level, achievements, is_extreme_sport, risk_level,
                       insurance_required, last_medical_clearance, notes
                FROM user_sports_activities
                WHERE user_id = $1
                ORDER BY is_extreme_sport DESC, weekly_hours DESC
            `;
            const sportsActivities = await sequelize.query(sportsQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Hábitos saludables
            const habitsQuery = `
                SELECT id, smoking_status, cigarettes_per_day, years_smoking, quit_date,
                       alcohol_consumption, drinks_per_week, sleep_hours_average, sleep_quality,
                       diet_type, diet_restrictions, water_intake_liters, caffeine_cups_per_day,
                       practices_extreme_sports, extreme_sports_list, last_checkup_date,
                       checkup_frequency, notes
                FROM user_healthy_habits
                WHERE user_id = $1
            `;
            const healthyHabits = await sequelize.query(habitsQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Calcular métricas avanzadas
            const latestAnthropometric = anthropometricData[0] || null;
            const activeSports = sportsActivities?.filter(s => s.practice_level !== 'inactive') || [];
            const activePsychiatric = psychiatricTreatments?.filter(t => t.treatment_status === 'active') || [];
            const habits = healthyHabits[0] || null;

            return {
                allergies: allergies || [],
                chronicConditions: conditions || [],
                currentMedications: medications || [],
                vaccinations: vaccinations || [],
                activityRestrictions: activityRestrictions || [],
                workRestrictions: workRestrictions || [],
                primaryPhysician: physician[0] || null,
                medicalExams: exams || [],
                // Nuevos datos avanzados
                anthropometricData: {
                    current: latestAnthropometric,
                    history: anthropometricData || [],
                    bmiTrend: anthropometricData?.length > 1 ?
                        (latestAnthropometric?.bmi - anthropometricData[anthropometricData.length-1]?.bmi).toFixed(1) : null
                },
                surgeries: surgeries || [],
                psychiatricTreatments: {
                    all: psychiatricTreatments || [],
                    active: activePsychiatric,
                    historical: psychiatricTreatments?.filter(t => t.treatment_status !== 'active') || []
                },
                sportsActivities: {
                    all: sportsActivities || [],
                    active: activeSports,
                    extremeSports: sportsActivities?.filter(s => s.is_extreme_sport) || [],
                    totalWeeklyHours: activeSports.reduce((sum, s) => sum + (parseFloat(s.weekly_hours) || 0), 0)
                },
                healthyHabits: habits,
                summary: {
                    totalAllergies: allergies?.length || 0,
                    totalConditions: conditions?.length || 0,
                    totalMedications: medications?.length || 0,
                    totalVaccinations: vaccinations?.length || 0,
                    hasRestrictions: (activityRestrictions?.length || 0) + (workRestrictions?.length || 0) > 0,
                    // Nuevas métricas
                    totalSurgeries: surgeries?.length || 0,
                    activePsychiatricTreatments: activePsychiatric.length,
                    activeSportsCount: activeSports.length,
                    practicesExtremeSports: habits?.practices_extreme_sports || false,
                    smokingStatus: habits?.smoking_status || 'unknown',
                    bmiCategory: latestAnthropometric?.bmi_category || 'unknown'
                }
            };
        } catch (error) {
            console.log(`⚠️ [360°] getCompleteMedicalInfo error: ${error.message}`);
            return {
                allergies: [], chronicConditions: [], currentMedications: [], vaccinations: [],
                activityRestrictions: [], workRestrictions: [], primaryPhysician: null, medicalExams: [],
                anthropometricData: { current: null, history: [], bmiTrend: null },
                surgeries: [], psychiatricTreatments: { all: [], active: [], historical: [] },
                sportsActivities: { all: [], active: [], extremeSports: [], totalWeeklyHours: 0 },
                healthyHabits: null,
                summary: {
                    totalAllergies: 0, totalConditions: 0, totalMedications: 0, totalVaccinations: 0,
                    hasRestrictions: false, totalSurgeries: 0, activePsychiatricTreatments: 0,
                    activeSportsCount: 0, practicesExtremeSports: false, smokingStatus: 'unknown', bmiCategory: 'unknown'
                }
            };
        }
    }

    /**
     * Obtiene documentos del empleado
     */
    async getDocuments(userId, companyId) {
        try {
            // Documentos generales
            const docsQuery = `
                SELECT id, document_type, document_name, file_url, upload_date, expiration_date,
                       is_verified, verified_by, notes
                FROM user_documents
                WHERE user_id = $1
                ORDER BY upload_date DESC
            `;
            const documents = await sequelize.query(docsQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Documentos médicos
            const medDocsQuery = `
                SELECT id, document_type, document_name, file_url, upload_date, issued_by, notes
                FROM user_medical_documents
                WHERE user_id = $1
                ORDER BY upload_date DESC
            `;
            const medicalDocuments = await sequelize.query(medDocsQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Licencias de conducir
            const driverLicenseQuery = `
                SELECT id, license_number, category, issue_date, expiration_date, issuing_authority, is_active
                FROM user_driver_license
                WHERE user_id = $1
            `;
            const driverLicense = await sequelize.query(driverLicenseQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Licencias profesionales
            const profLicenseQuery = `
                SELECT id, license_type, license_number, profession, issue_date, expiration_date, issuing_body, is_active
                FROM user_professional_license
                WHERE user_id = $1
            `;
            const professionalLicenses = await sequelize.query(profLicenseQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            return {
                generalDocuments: documents || [],
                medicalDocuments: medicalDocuments || [],
                driverLicense: driverLicense || [],
                professionalLicenses: professionalLicenses || [],
                summary: {
                    totalDocuments: (documents?.length || 0) + (medicalDocuments?.length || 0),
                    expiringSoon: documents?.filter(d => d.expiration_date && new Date(d.expiration_date) <= new Date(Date.now() + 30*24*60*60*1000)).length || 0,
                    hasDriverLicense: (driverLicense?.length || 0) > 0,
                    hasProfessionalLicense: (professionalLicenses?.length || 0) > 0
                }
            };
        } catch (error) {
            console.log(`⚠️ [360°] getDocuments error: ${error.message}`);
            return {
                generalDocuments: [], medicalDocuments: [], driverLicense: [], professionalLicenses: [],
                summary: { totalDocuments: 0, expiringSoon: 0, hasDriverLicense: false, hasProfessionalLicense: false }
            };
        }
    }

    /**
     * Obtiene historial laboral previo del empleado
     */
    async getPreviousWorkHistory(userId, companyId) {
        try {
            const query = `
                SELECT id, company_name, position, start_date, end_date, reason_for_leaving,
                       salary, supervisor_name, supervisor_contact, responsibilities, achievements
                FROM user_work_history
                WHERE user_id = $1
                ORDER BY end_date DESC NULLS FIRST
            `;
            const result = await sequelize.query(query, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            return {
                previousJobs: result || [],
                totalExperience: this.calculateTotalExperience(result || []),
                totalRecords: result?.length || 0
            };
        } catch (error) {
            console.log(`⚠️ [360°] getPreviousWorkHistory error: ${error.message}`);
            return { previousJobs: [], totalExperience: '0 años', totalRecords: 0 };
        }
    }

    calculateTotalExperience(jobs) {
        let totalMonths = 0;
        jobs.forEach(job => {
            if (job.start_date) {
                const start = new Date(job.start_date);
                const end = job.end_date ? new Date(job.end_date) : new Date();
                totalMonths += (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            }
        });
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        return years > 0 ? `${years} años${months > 0 ? `, ${months} meses` : ''}` : `${months} meses`;
    }

    /**
     * Obtiene información sindical y legal
     */
    async getUnionAndLegalInfo(userId, companyId) {
        try {
            // Afiliación sindical
            const unionQuery = `
                SELECT id, union_name, membership_number, join_date, is_delegate, delegate_since, notes
                FROM user_union_affiliation
                WHERE user_id = $1
            `;
            const union = await sequelize.query(unionQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Problemas legales (si existe la tabla)
            const legalQuery = `
                SELECT id, issue_type, description, status, start_date, resolution_date, lawyer_name
                FROM user_legal_issue
                WHERE user_id = $1
            `;
            let legal = [];
            try {
                legal = await sequelize.query(legalQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });
            } catch (e) { /* tabla puede no existir */ }

            return {
                unionAffiliation: union[0] || null,
                legalIssues: legal || [],
                isUnionMember: (union?.length || 0) > 0,
                isDelegate: union[0]?.is_delegate || false
            };
        } catch (error) {
            console.log(`⚠️ [360°] getUnionAndLegalInfo error: ${error.message}`);
            return { unionAffiliation: null, legalIssues: [], isUnionMember: false, isDelegate: false };
        }
    }

    /**
     * Obtiene configuración salarial del empleado
     * v2.0 - Incluye convenios laborales, categorías, historial y liquidaciones
     */
    async getSalaryInfo(userId, companyId) {
        try {
            // Config salarial básica (legacy)
            const legacyQuery = `
                SELECT id, base_salary, currency, payment_frequency, bank_name, bank_account,
                       cbu, additional_compensation, deductions, last_raise_date, last_raise_amount,
                       notes, updated_at
                FROM user_salary_config
                WHERE user_id = $1
            `;
            const legacyResult = await sequelize.query(legacyQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // =====================================================================
            // SISTEMA SALARIAL AVANZADO V2 (Enero 2025)
            // =====================================================================

            // Config salarial v2 con convenio y categoría (actual)
            const configV2Query = `
                SELECT usc.id, usc.user_id, usc.company_id,
                       usc.labor_agreement_id, usc.salary_category_id,
                       usc.salary_type, usc.base_salary, usc.hourly_rate,
                       usc.overtime_50_rate, usc.overtime_100_rate,
                       usc.seniority_bonus, usc.attendance_bonus, usc.travel_allowance,
                       usc.food_allowance, usc.other_bonuses, usc.bonuses_detail,
                       usc.previous_base_salary, usc.salary_increase_percentage,
                       usc.salary_increase_reason, usc.last_salary_update,
                       usc.cbu, usc.bank_alias, usc.bank_name, usc.bank_account_type,
                       usc.cuil, usc.obra_social, usc.sindicato,
                       usc.effective_from, usc.effective_to, usc.is_current,
                       la.name as labor_agreement_name, la.code as labor_agreement_code, la.industry,
                       sc.category_code, sc.category_name, sc.base_salary_min, sc.base_salary_max
                FROM user_salary_config_v2 usc
                LEFT JOIN labor_agreements_catalog la ON usc.labor_agreement_id = la.id
                LEFT JOIN salary_categories sc ON usc.salary_category_id = sc.id
                WHERE usc.user_id = $1 AND usc.is_current = true
            `;
            const configV2Result = await sequelize.query(configV2Query, { bind: [userId], type: sequelize.QueryTypes.SELECT });
            const currentConfigV2 = configV2Result[0] || null;

            // Historial de configuraciones salariales (últimos 5)
            const salaryHistoryQuery = `
                SELECT usc.id, usc.base_salary, usc.salary_type,
                       usc.salary_increase_percentage, usc.salary_increase_reason,
                       usc.effective_from, usc.effective_to, usc.is_current,
                       la.name as labor_agreement_name, sc.category_name
                FROM user_salary_config_v2 usc
                LEFT JOIN labor_agreements_catalog la ON usc.labor_agreement_id = la.id
                LEFT JOIN salary_categories sc ON usc.salary_category_id = sc.id
                WHERE usc.user_id = $1
                ORDER BY usc.effective_from DESC
                LIMIT 5
            `;
            const salaryHistory = await sequelize.query(salaryHistoryQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Últimas liquidaciones (12 meses)
            const currentYear = new Date().getFullYear();
            const payrollQuery = `
                SELECT id, period_year, period_month, status,
                       base_salary, seniority_bonus, attendance_bonus, travel_allowance,
                       overtime_50_hours, overtime_50_amount, overtime_100_hours, overtime_100_amount,
                       other_earnings, gross_total,
                       jubilacion_deduction, obra_social_deduction, pami_deduction,
                       sindicato_deduction, ganancias_deduction, other_deductions, deductions_total,
                       net_salary, payment_date, receipt_number
                FROM user_payroll_records
                WHERE user_id = $1
                ORDER BY period_year DESC, period_month DESC
                LIMIT 12
            `;
            const payrollRecords = await sequelize.query(payrollQuery, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            // Calcular totales del año
            const yearPayrolls = payrollRecords?.filter(p => p.period_year === currentYear) || [];
            const yearTotals = yearPayrolls.reduce((acc, p) => {
                acc.grossTotal += parseFloat(p.gross_total || 0);
                acc.netTotal += parseFloat(p.net_salary || 0);
                acc.deductionsTotal += parseFloat(p.deductions_total || 0);
                acc.overtimeHours += parseFloat(p.overtime_50_hours || 0) + parseFloat(p.overtime_100_hours || 0);
                acc.overtimeAmount += parseFloat(p.overtime_50_amount || 0) + parseFloat(p.overtime_100_amount || 0);
                return acc;
            }, { grossTotal: 0, netTotal: 0, deductionsTotal: 0, overtimeHours: 0, overtimeAmount: 0 });

            return {
                // Legacy support
                currentSalary: legacyResult[0] || null,
                hasConfiguredSalary: (legacyResult?.length || 0) > 0 || currentConfigV2 !== null,
                // Sistema v2
                currentConfigV2,
                hasAdvancedSalaryConfig: currentConfigV2 !== null,
                salaryHistory: salaryHistory || [],
                payrollRecords: payrollRecords || [],
                // Resumen
                summary: {
                    baseSalary: currentConfigV2?.base_salary || legacyResult[0]?.base_salary || null,
                    salaryType: currentConfigV2?.salary_type || legacyResult[0]?.payment_frequency || null,
                    laborAgreement: currentConfigV2?.labor_agreement_name || null,
                    category: currentConfigV2?.category_name || null,
                    lastUpdate: currentConfigV2?.last_salary_update || legacyResult[0]?.updated_at || null,
                    lastIncreasePercent: currentConfigV2?.salary_increase_percentage || null,
                    lastIncreaseReason: currentConfigV2?.salary_increase_reason || null,
                    yearToDate: {
                        year: currentYear,
                        monthsProcessed: yearPayrolls.length,
                        ...yearTotals,
                        averageMonthlyGross: yearPayrolls.length > 0 ? (yearTotals.grossTotal / yearPayrolls.length).toFixed(2) : 0,
                        averageMonthlyNet: yearPayrolls.length > 0 ? (yearTotals.netTotal / yearPayrolls.length).toFixed(2) : 0
                    }
                }
            };
        } catch (error) {
            console.log(`⚠️ [360°] getSalaryInfo error: ${error.message}`);
            return {
                currentSalary: null, hasConfiguredSalary: false,
                currentConfigV2: null, hasAdvancedSalaryConfig: false,
                salaryHistory: [], payrollRecords: [],
                summary: {
                    baseSalary: null, salaryType: null, laborAgreement: null, category: null,
                    lastUpdate: null, lastIncreasePercent: null, lastIncreaseReason: null,
                    yearToDate: { year: new Date().getFullYear(), monthsProcessed: 0, grossTotal: 0, netTotal: 0, deductionsTotal: 0, overtimeHours: 0, overtimeAmount: 0, averageMonthlyGross: 0, averageMonthlyNet: 0 }
                }
            };
        }
    }

    /**
     * Obtiene turnos asignados al empleado
     */
    async getAssignedShifts(userId, companyId) {
        try {
            const query = `
                SELECT
                    usa.id, usa.shift_id, usa.start_date, usa.end_date, usa.is_primary,
                    s.name as shift_name, s.start_time, s.end_time, s.break_minutes,
                    s.is_night_shift, s.tolerance_minutes
                FROM user_shift_assignments usa
                LEFT JOIN shifts s ON usa.shift_id = s.id
                WHERE usa.user_id = $1
                ORDER BY usa.is_primary DESC, usa.start_date DESC
            `;
            const result = await sequelize.query(query, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            return {
                shifts: result || [],
                primaryShift: result?.find(s => s.is_primary) || null,
                totalAssigned: result?.length || 0
            };
        } catch (error) {
            console.log(`⚠️ [360°] getAssignedShifts error: ${error.message}`);
            return { shifts: [], primaryShift: null, totalAssigned: 0 };
        }
    }

    /**
     * Obtiene últimos registros de asistencia detallados
     */
    async getRecentAttendanceRecords(userId, companyId, limit = 30) {
        try {
            const query = `
                SELECT
                    id, date, check_in_time, check_out_time, status, work_hours,
                    is_late, late_minutes, is_early_departure, early_minutes,
                    overtime_minutes, location_check_in, location_check_out,
                    notes, modified_by, modified_reason
                FROM attendance
                WHERE user_id = $1 AND company_id = $2
                ORDER BY date DESC
                LIMIT $3
            `;
            const result = await sequelize.query(query, {
                bind: [userId, companyId, limit],
                type: sequelize.QueryTypes.SELECT
            });

            return {
                recentRecords: result || [],
                totalRecords: result?.length || 0
            };
        } catch (error) {
            console.log(`⚠️ [360°] getRecentAttendanceRecords error: ${error.message}`);
            return { recentRecords: [], totalRecords: 0 };
        }
    }

    /**
     * Obtiene tareas asignadas al empleado
     */
    async getAssignedTasks(userId, companyId) {
        try {
            const query = `
                SELECT id, task_name, task_type, description, status, priority,
                       due_date, completed_date, assigned_by, notes
                FROM user_assigned_tasks
                WHERE user_id = $1
                ORDER BY due_date ASC NULLS LAST
            `;
            const result = await sequelize.query(query, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            return {
                tasks: result || [],
                pendingTasks: result?.filter(t => t.status === 'pending').length || 0,
                completedTasks: result?.filter(t => t.status === 'completed').length || 0,
                overdueTasks: result?.filter(t => t.status === 'pending' && t.due_date && new Date(t.due_date) < new Date()).length || 0
            };
        } catch (error) {
            console.log(`⚠️ [360°] getAssignedTasks error: ${error.message}`);
            return { tasks: [], pendingTasks: 0, completedTasks: 0, overdueTasks: 0 };
        }
    }

    /**
     * Obtiene consentimientos del empleado
     */
    async getConsents(userId, companyId) {
        try {
            const query = `
                SELECT id, consent_type, is_granted, granted_date, revoked_date,
                       consent_method, ip_address, notes
                FROM user_consents
                WHERE user_id = $1
                ORDER BY granted_date DESC
            `;
            const result = await sequelize.query(query, { bind: [userId], type: sequelize.QueryTypes.SELECT });

            return {
                consents: result || [],
                hasEmotionalAnalysisConsent: result?.find(c => c.consent_type === 'emotional_analysis' && c.is_granted) || false,
                hasBiometricConsent: result?.find(c => c.consent_type === 'biometric' && c.is_granted) || false
            };
        } catch (error) {
            console.log(`⚠️ [360°] getConsents error: ${error.message}`);
            return { consents: [], hasEmotionalAnalysisConsent: false, hasBiometricConsent: false };
        }
    }

    /**
     * Obtiene solicitudes de permisos
     */
    async getPermissionRequests(userId, companyId, dateFrom, dateTo) {
        try {
            const query = `
                SELECT id, request_type, reason, start_date, end_date, status,
                       requested_at, reviewed_by, reviewed_at, reviewer_notes
                FROM user_permission_requests
                WHERE user_id = $1 AND requested_at BETWEEN $2 AND $3
                ORDER BY requested_at DESC
            `;
            const result = await sequelize.query(query, {
                bind: [userId, dateFrom, dateTo],
                type: sequelize.QueryTypes.SELECT
            });

            return {
                requests: result || [],
                approved: result?.filter(r => r.status === 'approved').length || 0,
                rejected: result?.filter(r => r.status === 'rejected').length || 0,
                pending: result?.filter(r => r.status === 'pending').length || 0
            };
        } catch (error) {
            console.log(`⚠️ [360°] getPermissionRequests error: ${error.message}`);
            return { requests: [], approved: 0, rejected: 0, pending: 0 };
        }
    }

    /**
     * Método maestro: Obtiene TODA la información del usuario para el Expediente 360° Completo
     */
    async getAllUserData(userId, companyId, dateFrom, dateTo) {
        console.log(`📋 [360°] Recopilando TODOS los datos del usuario ${userId}...`);

        const [
            familyInfo,
            educationInfo,
            medicalInfo,
            documents,
            workHistory,
            unionLegalInfo,
            salaryInfo,
            shiftsInfo,
            recentAttendance,
            tasksInfo,
            consentsInfo,
            permissionRequests
        ] = await Promise.all([
            this.getFamilyInfo(userId, companyId),
            this.getEducationInfo(userId, companyId),
            this.getCompleteMedicalInfo(userId, companyId),
            this.getDocuments(userId, companyId),
            this.getPreviousWorkHistory(userId, companyId),
            this.getUnionAndLegalInfo(userId, companyId),
            this.getSalaryInfo(userId, companyId),
            this.getAssignedShifts(userId, companyId),
            this.getRecentAttendanceRecords(userId, companyId, 30),
            this.getAssignedTasks(userId, companyId),
            this.getConsents(userId, companyId),
            this.getPermissionRequests(userId, companyId, dateFrom, dateTo)
        ]);

        console.log(`✅ [360°] Datos completos recopilados para usuario ${userId}`);

        return {
            family: familyInfo,
            education: educationInfo,
            medicalComplete: medicalInfo,
            documents: documents,
            previousWorkHistory: workHistory,
            unionAndLegal: unionLegalInfo,
            salary: salaryInfo,
            assignedShifts: shiftsInfo,
            recentAttendance: recentAttendance,
            tasks: tasksInfo,
            consents: consentsInfo,
            permissionRequests: permissionRequests
        };
    }
}

module.exports = new Employee360Service();
