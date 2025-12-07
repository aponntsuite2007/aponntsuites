/**
 * LegalOllamaService.js
 * Integracion de IA (Ollama/Llama 3.1) con el modulo legal
 *
 * Funcionalidades:
 * - Analisis de riesgo de casos
 * - Monitoreo de vencimientos y alertas proactivas
 * - Deteccion de patrones en historial de empleados
 * - Recomendaciones basadas en jurisprudencia simulada
 * - Resumen automatico de expedientes
 * - Asistencia al abogado con consultas
 *
 * Se integra con el sistema de notificaciones central (SSOT)
 */

const axios = require('axios');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class LegalOllamaService {
    static OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    static OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    static TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT) || 60000;

    /**
     * Verifica si Ollama esta disponible
     */
    static async isAvailable() {
        try {
            const response = await axios.get(`${this.OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    /**
     * Realiza una consulta a Ollama
     */
    static async query(prompt, options = {}) {
        const startTime = Date.now();

        try {
            const response = await axios.post(
                `${this.OLLAMA_BASE_URL}/api/generate`,
                {
                    model: options.model || this.OLLAMA_MODEL,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: options.temperature || 0.3, // Bajo para respuestas mas precisas
                        num_predict: options.max_tokens || 1000
                    }
                },
                { timeout: this.TIMEOUT }
            );

            return {
                success: true,
                response: response.data.response,
                model: this.OLLAMA_MODEL,
                tokens_used: response.data.eval_count || 0,
                processing_time_ms: Date.now() - startTime
            };
        } catch (error) {
            console.error('[LegalOllama] Error en query:', error.message);
            return {
                success: false,
                error: error.message,
                processing_time_ms: Date.now() - startTime
            };
        }
    }

    /**
     * Analiza el riesgo de un caso legal
     */
    static async analyzeRisk(caseData, employee360) {
        const prompt = `
Eres un asistente legal especializado en derecho laboral.
Analiza el siguiente caso y proporciona una evaluacion de riesgo.

CASO:
- Tipo: ${caseData.case_type}
- Titulo: ${caseData.title}
- Descripcion: ${caseData.description || 'No especificada'}
- Monto reclamado: ${caseData.claimed_amount || 'No especificado'}
- Etapa actual: ${caseData.current_stage}
- Jurisdiccion: ${caseData.jurisdiction || 'No especificada'}

HISTORIAL DEL EMPLEADO:
- Antiguedad: ${this.calculateSeniority(employee360?.employment)}
- Sanciones previas: ${employee360?.disciplinary?.total_count || 0}
- Tasa de ausentismo: ${employee360?.statistics?.attendance?.absence_rate || 0}%
- Accidentes laborales: ${employee360?.medical?.summary?.total_accidents || 0}
- Indicadores de riesgo: ${JSON.stringify(employee360?.statistics?.risk_indicators || [])}

Por favor proporciona:
1. NIVEL DE RIESGO (bajo/medio/alto/muy_alto)
2. EXPOSICION ECONOMICA ESTIMADA (rango en moneda local)
3. PROBABILIDAD DE EXITO (porcentaje para la empresa)
4. PUNTOS FUERTES del caso para la empresa
5. PUNTOS DEBILES o vulnerabilidades
6. RECOMENDACIONES ESTRATEGICAS (3-5 acciones)
7. PLAZOS CRITICOS a considerar

Responde en formato estructurado y conciso.
`;

        const result = await this.query(prompt);

        if (result.success) {
            // Guardar analisis en BD
            await this.saveAnalysis(
                caseData.id,
                caseData.company_id,
                'risk_assessment',
                prompt,
                result.response,
                result
            );
        }

        return result;
    }

    /**
     * Genera resumen ejecutivo del caso
     */
    static async generateCaseSummary(caseData, timeline, documents) {
        const prompt = `
Eres un asistente legal. Genera un resumen ejecutivo del siguiente caso laboral.

DATOS DEL CASO:
- Numero: ${caseData.case_number}
- Tipo: ${caseData.case_type}
- Empleado: ${caseData.employee_name}
- Puesto: ${caseData.employee_position}
- Fecha del hecho: ${caseData.incident_date || 'No especificada'}
- Monto reclamado: ${caseData.claimed_amount || 'No especificado'}
- Etapa actual: ${caseData.current_stage}

LINEA DE TIEMPO (ultimos 10 eventos):
${timeline.slice(0, 10).map(e => `- ${e.event_date}: ${e.title}`).join('\n')}

DOCUMENTOS CLAVE (${documents.length} total):
${documents.slice(0, 5).map(d => `- ${d.document_type}: ${d.title}`).join('\n')}

Genera un resumen ejecutivo de 1 parrafo (maximo 200 palabras) que incluya:
- Situacion actual del caso
- Hechos relevantes
- Proximos pasos recomendados
`;

        const result = await this.query(prompt);

        if (result.success) {
            await this.saveAnalysis(
                caseData.id,
                caseData.company_id,
                'case_summary',
                prompt,
                result.response,
                result
            );
        }

        return result;
    }

    /**
     * Analiza el historial del empleado y detecta patrones
     */
    static async analyzeEmployeeHistory(employee360) {
        const prompt = `
Analiza el siguiente historial laboral de un empleado y detecta patrones relevantes para un posible litigio.

DATOS DEL EMPLEADO:
- Nombre: ${employee360.personal?.name}
- Antiguedad: ${this.calculateSeniority(employee360.employment)}
- Puesto: ${employee360.employment?.position}
- Departamento: ${employee360.employment?.department_name}

ESTADISTICAS:
- Asistencia:
  * Dias presentes: ${employee360.attendance?.summary?.days_present || 0}
  * Inasistencias: ${employee360.attendance?.summary?.days_absent || 0}
  * Llegadas tarde: ${employee360.attendance?.summary?.days_late || 0}
  * Minutos tarde promedio: ${employee360.attendance?.summary?.avg_late_minutes || 0}

- Disciplinario:
  * Total sanciones: ${employee360.disciplinary?.total_count || 0}
  * Tipos: ${employee360.disciplinary?.summary?.map(s => `${s.communication_type}: ${s.count}`).join(', ') || 'Ninguna'}

- Medico:
  * Examenes: ${employee360.medical?.summary?.total_exams || 0}
  * Dias de licencia: ${employee360.medical?.summary?.total_leave_days || 0}
  * Accidentes laborales: ${employee360.medical?.summary?.total_accidents || 0}

- Vacaciones:
  * Dias pendientes: ${employee360.vacations?.summary?.pending_days || 0}
  * Solicitudes rechazadas: ${employee360.vacations?.summary?.rejected_requests || 0}

INDICADORES DE RIESGO DETECTADOS:
${employee360.statistics?.risk_indicators?.map(r => `- ${r.type}: ${r.description}`).join('\n') || 'Ninguno'}

Analiza y responde:
1. PATRONES DETECTADOS (conductuales, de asistencia, medicos)
2. FACTORES DE RIESGO para la empresa
3. FORTALEZAS del legajo del empleado
4. POSIBLES ARGUMENTOS que podria usar el empleado en un litigio
5. RECOMENDACIONES para fortalecer la posicion de la empresa
`;

        const result = await this.query(prompt, { max_tokens: 1500 });

        if (result.success && employee360.employment?.user_id) {
            await this.saveAnalysis(
                null, // No case_id
                employee360.company_id,
                'employee_history',
                prompt,
                result.response,
                result
            );
        }

        return result;
    }

    /**
     * Genera alertas de vencimientos proximos
     */
    static async generateDeadlineAlerts(deadlines, companyId) {
        if (!deadlines || deadlines.length === 0) {
            return { success: true, alerts: [] };
        }

        const prompt = `
Eres un asistente legal. Analiza los siguientes vencimientos legales proximos y genera alertas priorizadas.

VENCIMIENTOS PROXIMOS:
${deadlines.map(d => `
- Caso: ${d.case_number}
- Tipo: ${d.deadline_type}
- Titulo: ${d.title}
- Vence: ${d.due_date}
- Dias restantes: ${d.days_remaining}
- Prioridad actual: ${d.priority}
`).join('\n---\n')}

Para cada vencimiento, indica:
1. URGENCIA (critica/alta/media/baja)
2. ACCION RECOMENDADA inmediata
3. CONSECUENCIAS de incumplimiento
4. QUIEN DEBE ACTUAR (abogado/RRHH/gerencia)

Ordena por urgencia de mayor a menor.
`;

        const result = await this.query(prompt, { max_tokens: 1200 });

        if (result.success) {
            await this.saveAnalysis(
                null,
                companyId,
                'deadline_alert',
                prompt,
                result.response,
                result
            );
        }

        return result;
    }

    /**
     * Asistente de consultas del abogado
     */
    static async assistLawyer(question, context = {}) {
        const contextText = context.case_number
            ? `
CONTEXTO DEL CASO:
- Numero: ${context.case_number}
- Tipo: ${context.case_type}
- Etapa: ${context.current_stage}
- Empleado: ${context.employee_name}
`
            : '';

        const prompt = `
Eres un asistente legal especializado en derecho laboral.
${contextText}

CONSULTA DEL ABOGADO:
${question}

Proporciona una respuesta clara, concisa y profesional.
Si la consulta requiere informacion especifica del caso que no tienes, indicalo.
Si hay plazos legales relevantes, mencionalos.
`;

        return await this.query(prompt, { max_tokens: 800 });
    }

    /**
     * Sugiere documentos a solicitar segun el tipo de caso
     */
    static async suggestDocuments(caseType, currentDocuments = []) {
        const currentDocs = currentDocuments.map(d => d.document_type).join(', ');

        const prompt = `
Para un caso laboral de tipo "${caseType}", sugiere los documentos esenciales que se deben recopilar.

DOCUMENTOS YA RECOPILADOS:
${currentDocs || 'Ninguno'}

Lista los documentos faltantes ordenados por importancia:
1. Nombre del documento
2. Por que es importante
3. Donde obtenerlo

Enfocate en documentos criticos para la defensa de la empresa.
`;

        return await this.query(prompt, { max_tokens: 600 });
    }

    /**
     * Calcula exposicion economica estimada
     */
    static async calculateExposure(caseData, employee360) {
        const prompt = `
Calcula la exposicion economica estimada para el siguiente caso laboral.

DATOS DEL CASO:
- Tipo: ${caseData.case_type}
- Monto reclamado: ${caseData.claimed_amount || 'No especificado'}
- Jurisdiccion: ${caseData.jurisdiction || 'No especificada'}

DATOS DEL EMPLEADO:
- Antiguedad: ${this.calculateSeniority(employee360?.employment)}
- Salario actual: ${employee360?.employment?.current_salary || 'No especificado'}
- Categoria: ${employee360?.employment?.salary_category || 'No especificada'}
- Convenio: ${employee360?.employment?.labor_agreement || 'No especificado'}

Considerando la legislacion laboral aplicable a la jurisdiccion indicada, estima:

1. INDEMNIZACION BASE (si corresponde)
   - Preaviso segun legislacion local
   - Antiguedad segun legislacion local
   - Aguinaldo/gratificacion proporcional
   - Vacaciones proporcionales

2. MULTAS POTENCIALES
   - Por empleo no registrado (si aplica)
   - Por irregularidades documentales
   - Otras multas aplicables en la jurisdiccion

3. RANGO DE EXPOSICION
   - Minimo esperado
   - Maximo esperado
   - Escenario mas probable

4. FACTORES QUE MODIFICAN LA EXPOSICION

Responde con numeros estimados en moneda local cuando sea posible.
`;

        const result = await this.query(prompt, { max_tokens: 1000 });

        if (result.success && caseData.id) {
            await this.saveAnalysis(
                caseData.id,
                caseData.company_id,
                'exposure_calculation',
                prompt,
                result.response,
                result
            );
        }

        return result;
    }

    /**
     * Analiza timeline y sugiere proximos pasos
     */
    static async analyzeTimelineAndSuggest(caseData, timeline) {
        const recentEvents = timeline.slice(0, 15);

        const prompt = `
Analiza la linea de tiempo del siguiente caso laboral y sugiere los proximos pasos.

CASO: ${caseData.case_number} (${caseData.case_type})
ETAPA ACTUAL: ${caseData.current_stage}

EVENTOS RECIENTES:
${recentEvents.map(e => `${e.event_date}: [${e.event_type}] ${e.title}`).join('\n')}

Basado en la evolucion del caso:
1. ESTADO ACTUAL del proceso
2. PROXIMOS PASOS ESPERADOS (3-5)
3. RIESGOS IDENTIFICADOS
4. OPORTUNIDADES para la empresa
5. TIMELINE PROYECTADO (estimacion de duracion restante)
`;

        const result = await this.query(prompt, { max_tokens: 800 });

        if (result.success && caseData.id) {
            await this.saveAnalysis(
                caseData.id,
                caseData.company_id,
                'timeline_analysis',
                prompt,
                result.response,
                result
            );
        }

        return result;
    }

    /**
     * Genera recomendaciones proactivas
     */
    static async generateProactiveRecommendations(companyId) {
        // Obtener casos activos y metricas
        const [activeCases] = await sequelize.query(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN current_stage = 'judicial' THEN 1 END) as judicial,
                COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical,
                SUM(COALESCE(estimated_exposure, 0)) as total_exposure
            FROM legal_cases
            WHERE company_id = :companyId AND is_active = TRUE
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        const [overdueDeadlines] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM legal_deadlines
            WHERE company_id = :companyId
              AND status = 'pending'
              AND due_date < NOW()
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        const prompt = `
Como asesor legal estrategico, genera recomendaciones proactivas para el departamento legal.

SITUACION ACTUAL:
- Casos activos: ${activeCases.total || 0}
- Casos en etapa judicial: ${activeCases.judicial || 0}
- Casos criticos: ${activeCases.critical || 0}
- Exposicion total estimada: $${activeCases.total_exposure || 0}
- Vencimientos vencidos: ${overdueDeadlines.count || 0}

Genera 5 recomendaciones estrategicas para:
1. Reducir exposicion legal
2. Mejorar gestion de casos
3. Prevenir nuevos litigios
4. Optimizar recursos del departamento
5. Cumplir plazos criticos

Se conciso y actionable.
`;

        return await this.query(prompt, { max_tokens: 600 });
    }

    // ============== HELPERS ==============

    /**
     * Calcula antiguedad del empleado
     */
    static calculateSeniority(employment) {
        if (!employment?.hire_date) return 'Desconocida';

        const hireDate = new Date(employment.hire_date);
        const endDate = employment.termination_date
            ? new Date(employment.termination_date)
            : new Date();

        const diffYears = (endDate - hireDate) / (1000 * 60 * 60 * 24 * 365);
        const years = Math.floor(diffYears);
        const months = Math.floor((diffYears - years) * 12);

        return `${years} años, ${months} meses`;
    }

    /**
     * Guarda analisis en BD
     */
    static async saveAnalysis(caseId, companyId, analysisType, prompt, result, metadata) {
        try {
            await sequelize.query(`
                INSERT INTO legal_ai_analysis (
                    case_id, company_id, analysis_type, prompt_used,
                    analysis_result, model_used, tokens_used, processing_time_ms
                ) VALUES (
                    :caseId, :companyId, :analysisType, :prompt,
                    :result, :model, :tokens, :time
                )
            `, {
                replacements: {
                    caseId,
                    companyId,
                    analysisType,
                    prompt,
                    result,
                    model: metadata.model || this.OLLAMA_MODEL,
                    tokens: metadata.tokens_used || 0,
                    time: metadata.processing_time_ms || 0
                },
                type: QueryTypes.INSERT
            });
        } catch (error) {
            console.error('[LegalOllama] Error guardando analisis:', error.message);
        }
    }

    /**
     * Obtiene analisis previos de un caso
     */
    static async getPreviousAnalyses(caseId, analysisType = null) {
        const where = analysisType
            ? 'AND analysis_type = :analysisType'
            : '';

        const analyses = await sequelize.query(`
            SELECT
                id, analysis_type, analysis_result, confidence_score,
                is_reviewed, created_at
            FROM legal_ai_analysis
            WHERE case_id = :caseId ${where}
            ORDER BY created_at DESC
            LIMIT 10
        `, {
            replacements: { caseId, analysisType },
            type: QueryTypes.SELECT
        });

        return analyses;
    }

    /**
     * Cron job: Revisa vencimientos y genera alertas
     * Debe ejecutarse diariamente
     */
    static async cronCheckDeadlinesAndAlert() {
        console.log('[LegalOllama] Iniciando revision de vencimientos...');

        try {
            // Obtener empresas con casos activos
            const companies = await sequelize.query(`
                SELECT DISTINCT company_id
                FROM legal_cases
                WHERE is_active = TRUE
            `, { type: QueryTypes.SELECT });

            for (const company of companies) {
                // Obtener vencimientos proximos (7 dias)
                const deadlines = await sequelize.query(`
                    SELECT
                        ld.id, ld.title, ld.deadline_type, ld.due_date,
                        ld.priority, ld.assigned_to,
                        lc.case_number, lc.case_type,
                        EXTRACT(DAY FROM ld.due_date - NOW())::INTEGER as days_remaining
                    FROM legal_deadlines ld
                    JOIN legal_cases lc ON ld.case_id = lc.id
                    WHERE ld.company_id = :companyId
                      AND ld.status = 'pending'
                      AND ld.due_date <= NOW() + INTERVAL '7 days'
                    ORDER BY ld.due_date ASC
                `, {
                    replacements: { companyId: company.company_id },
                    type: QueryTypes.SELECT
                });

                if (deadlines.length > 0) {
                    // Generar alertas con IA
                    const alertResult = await this.generateDeadlineAlerts(deadlines, company.company_id);

                    if (alertResult.success) {
                        // Crear notificaciones en sistema central
                        await this.createDeadlineNotifications(deadlines, company.company_id, alertResult.response);
                    }
                }
            }

            console.log('[LegalOllama] Revision de vencimientos completada');
        } catch (error) {
            console.error('[LegalOllama] Error en cron de vencimientos:', error);
        }
    }

    /**
     * Crea notificaciones de vencimientos en el sistema central
     */
    static async createDeadlineNotifications(deadlines, companyId, aiAnalysis) {
        try {
            // Agrupar por prioridad
            const critical = deadlines.filter(d => d.days_remaining <= 1);
            const urgent = deadlines.filter(d => d.days_remaining > 1 && d.days_remaining <= 3);
            const normal = deadlines.filter(d => d.days_remaining > 3);

            // Crear notificacion para criticos
            if (critical.length > 0) {
                await sequelize.query(`
                    INSERT INTO notification_groups (
                        company_id, notification_type, title, priority,
                        source_module, source_reference, metadata, status
                    ) VALUES (
                        :companyId, 'deadline_alert', :title, 'critical',
                        'legal', 'deadlines', :metadata, 'pending'
                    )
                `, {
                    replacements: {
                        companyId,
                        title: `⚠️ ${critical.length} vencimiento(s) legal(es) CRITICO(S)`,
                        metadata: JSON.stringify({
                            deadlines: critical,
                            ai_analysis: aiAnalysis
                        })
                    },
                    type: QueryTypes.INSERT
                });
            }

            // Crear notificacion para urgentes
            if (urgent.length > 0) {
                await sequelize.query(`
                    INSERT INTO notification_groups (
                        company_id, notification_type, title, priority,
                        source_module, source_reference, metadata, status
                    ) VALUES (
                        :companyId, 'deadline_alert', :title, 'high',
                        'legal', 'deadlines', :metadata, 'pending'
                    )
                `, {
                    replacements: {
                        companyId,
                        title: `📅 ${urgent.length} vencimiento(s) legal(es) urgente(s)`,
                        metadata: JSON.stringify({ deadlines: urgent })
                    },
                    type: QueryTypes.INSERT
                });
            }

        } catch (error) {
            console.error('[LegalOllama] Error creando notificaciones:', error.message);
        }
    }
}

module.exports = LegalOllamaService;
