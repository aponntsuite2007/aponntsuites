/**
 * ============================================================================
 * SISTEMA DE AYUDA CONTEXTUAL: Ecosistema de Capacitaciones
 * ============================================================================
 *
 * Este módulo registra en ModuleHelpSystem toda la información contextual
 * para ayudar al usuario a entender:
 *
 * 1. Qué hace cada sección/tab del módulo
 * 2. Cómo funcionan los circuitos de integración
 * 3. De dónde vienen las capacitaciones auto-asignadas
 * 4. Qué significan los indicadores y badges
 * 5. Cómo interactúan los módulos afluentes
 *
 * @version 1.0.0
 * @date 2026-02-01
 */

// ============================================================================
// REGISTRO EN ModuleHelpSystem
// ============================================================================

if (typeof ModuleHelpSystem !== 'undefined') {
    ModuleHelpSystem.registerModule('training-management', {
        moduleName: 'Sistema Integral de Capacitaciones',
        moduleDescription: `
            Centro de gestión de capacitaciones que funciona como HUB conectando múltiples módulos:
            HSE (Seguridad), Exámenes Médicos, ART (Accidentes), Procedimientos y Risk Intelligence.
            Las capacitaciones pueden asignarse manualmente o generarse automáticamente desde estos módulos afluentes.
        `,

        // =====================================================================
        // CONTEXTOS POR VISTA/TAB
        // =====================================================================
        contexts: {

            // -----------------------------------------------------------------
            // DASHBOARD PRINCIPAL
            // -----------------------------------------------------------------
            dashboard: {
                title: 'Dashboard de Capacitaciones',
                description: `
                    Vista general del estado de capacitaciones en la empresa.
                    Muestra KPIs clave, capacitaciones activas, y un resumen
                    de asignaciones por origen (manual vs automático).
                `,
                tips: [
                    '📊 Los KPIs se actualizan en tiempo real al cargar el dashboard',
                    '🔗 El badge "Auto-asignadas" indica capacitaciones generadas automáticamente desde otros módulos',
                    '⚠️ Las capacitaciones con prioridad CRÍTICA aparecen en rojo y requieren atención inmediata',
                    '📈 El gráfico de tendencia muestra la evolución de completadas vs asignadas'
                ],
                warnings: [
                    'Si ve muchas capacitaciones auto-asignadas, revise los módulos de HSE, ART y Medical',
                    'Las capacitaciones vencidas afectan el compliance de la empresa'
                ],
                helpTopics: [
                    '¿De dónde vienen las capacitaciones auto-asignadas?',
                    '¿Qué significa cada KPI del dashboard?',
                    '¿Cómo interpretar el gráfico de tendencia?',
                    '¿Qué hacer si hay muchas capacitaciones vencidas?'
                ],
                fieldHelp: {
                    'kpi-total': 'Cantidad total de capacitaciones activas en el sistema',
                    'kpi-active': 'Empleados actualmente realizando capacitaciones',
                    'kpi-completed': 'Capacitaciones completadas este mes',
                    'kpi-pending': 'Capacitaciones asignadas pendientes de iniciar',
                    'kpi-auto': 'Capacitaciones generadas automáticamente por integración con otros módulos'
                },

                // CIRCUITOS DE INTEGRACIÓN
                circuits: {
                    title: 'Circuitos de Integración',
                    description: `
                        El módulo de Capacitaciones recibe asignaciones automáticas de 5 módulos afluentes:

                        ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                        │     HSE     │    │   MEDICAL   │    │     ART     │
                        │  Seguridad  │    │  Exámenes   │    │ Accidentes  │
                        └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
                               │                  │                  │
                               ▼                  ▼                  ▼
                           ╔═══════════════════════════════════════════════╗
                           ║         CAPACITACIONES (HUB CENTRAL)          ║
                           ╚═══════════════════════════════════════════════╝
                               ▲                  ▲                  ▲
                               │                  │                  │
                        ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐
                        │ PROCEDURES  │    │    RISK     │    │ ONBOARDING  │
                        │Procedimientos│    │Intelligence │    │  Inducción  │
                        └─────────────┘    └─────────────┘    └─────────────┘
                    `,
                    items: [
                        {
                            source: 'HSE (Seguridad e Higiene)',
                            trigger: 'Violación de EPP o caso HSE confirmado',
                            result: 'Capacitación de seguridad asignada automáticamente',
                            priority: 'HIGH',
                            example: 'Empleado sin casco → Capacitación "Uso correcto de EPP"'
                        },
                        {
                            source: 'Medical (Exámenes Médicos)',
                            trigger: 'Examen con deficiencia detectada',
                            result: 'Capacitación remedial específica',
                            priority: 'NORMAL',
                            example: 'Audiometría deficiente → Capacitación "Protección auditiva"'
                        },
                        {
                            source: 'ART (Accidentes)',
                            trigger: 'Cierre de accidente / Alta médica',
                            result: 'Capacitación de reinserción + Prevención para el área',
                            priority: 'CRITICAL',
                            example: 'Caída de altura → Capacitación "Trabajo en altura" para víctima y área'
                        },
                        {
                            source: 'Procedures (Procedimientos)',
                            trigger: 'Nuevo procedimiento publicado o actualizado',
                            result: 'Capacitación obligatoria para afectados',
                            priority: 'HIGH',
                            example: 'Nuevo SOP de seguridad → Todos los del área deben capacitarse'
                        },
                        {
                            source: 'Risk Intelligence',
                            trigger: 'Score de riesgo ≥ 80 o alerta activa',
                            result: 'Capacitación preventiva según categoría de riesgo',
                            priority: 'Variable según score',
                            example: 'Score asistencia 85% → Capacitación "Gestión del tiempo"'
                        }
                    ]
                }
            },

            // -----------------------------------------------------------------
            // LISTA DE CAPACITACIONES
            // -----------------------------------------------------------------
            trainings: {
                title: 'Gestión de Capacitaciones',
                description: `
                    Listado completo de capacitaciones disponibles.
                    Aquí puede crear, editar, duplicar y eliminar capacitaciones.
                    También puede ver qué empleados están asignados a cada una.
                `,
                tips: [
                    '➕ Use "Nueva Capacitación" para crear desde cero',
                    '📋 Use "Duplicar" para copiar una existente como base',
                    '🏷️ Las categorías determinan cómo se buscan las capacitaciones en auto-asignación',
                    '⚡ La columna "Origen" indica si fue creada manualmente o importada'
                ],
                warnings: [
                    'No elimine capacitaciones con asignaciones activas',
                    'Al cambiar la categoría puede afectar las integraciones automáticas'
                ],
                helpTopics: [
                    '¿Cómo crear una nueva capacitación?',
                    '¿Qué significan las categorías?',
                    '¿Cómo vincular una capacitación con HSE o procedimientos?',
                    '¿Cómo asignar empleados masivamente?'
                ],
                fieldHelp: {
                    'title': 'Nombre descriptivo de la capacitación (aparece en asignaciones)',
                    'category': 'Categoría para búsqueda automática: safety, compliance, quality, etc.',
                    'type': 'Formato del contenido: video, PDF, presentación, SCORM',
                    'duration': 'Duración estimada en horas',
                    'mandatory': 'Si está activo, el empleado NO puede omitir esta capacitación',
                    'requires_medical': 'Si está activo, valida certificado médico antes de inscribir',
                    'hse_codes': 'Códigos de violación HSE que disparan esta capacitación',
                    'risk_categories': 'Categorías de Risk Intelligence asociadas'
                }
            },

            // -----------------------------------------------------------------
            // EVALUACIONES VINCULADAS
            // -----------------------------------------------------------------
            evaluations: {
                title: 'Evaluaciones de Capacitaciones',
                description: `
                    Evaluaciones que están vinculadas a una capacitación específica.
                    El empleado debe aprobar la evaluación para completar la capacitación.
                `,
                tips: [
                    '📝 Configure el puntaje mínimo de aprobación (por defecto 70%)',
                    '🔄 Puede permitir múltiples intentos con el campo "Intentos permitidos"',
                    '📊 Vea las estadísticas de aprobación por capacitación',
                    '⏱️ Configure tiempo límite si la evaluación es cronometrada'
                ],
                warnings: [
                    'Cambiar preguntas después de que empleados rindieron puede afectar estadísticas',
                    'Las evaluaciones prácticas requieren validación manual del evaluador'
                ],
                helpTopics: [
                    '¿Cómo crear una evaluación para una capacitación?',
                    '¿Qué tipos de preguntas puedo usar?',
                    '¿Cómo configurar evaluación práctica?',
                    '¿Cómo ver resultados de una evaluación?'
                ]
            },

            // -----------------------------------------------------------------
            // EVALUACIONES INDEPENDIENTES
            // -----------------------------------------------------------------
            'independent-evaluations': {
                title: 'Evaluaciones Independientes',
                description: `
                    Evaluaciones que NO están vinculadas a ninguna capacitación.
                    Útiles para: tests de conocimiento, diagnósticos, evaluaciones periódicas.
                `,
                tips: [
                    '🎯 Use para evaluaciones de diagnóstico antes de asignar capacitaciones',
                    '📈 Útil para medir conocimiento base de un área',
                    '🔍 Puede vincular resultados con Risk Intelligence para detectar gaps',
                    '📅 Configure periodicidad para evaluaciones recurrentes'
                ],
                helpTopics: [
                    '¿Cuándo usar evaluación independiente vs vinculada?',
                    '¿Cómo programar evaluaciones periódicas?',
                    '¿Cómo exportar resultados?'
                ]
            },

            // -----------------------------------------------------------------
            // SEGUIMIENTO DE EMPLEADOS
            // -----------------------------------------------------------------
            employees: {
                title: 'Seguimiento de Empleados',
                description: `
                    Vista centrada en el empleado: todas sus asignaciones,
                    progreso, certificados obtenidos y pendientes.
                `,
                tips: [
                    '👤 Click en un empleado para ver su historial completo',
                    '📊 La barra de progreso muestra % de capacitaciones completadas',
                    '🏆 Los certificados se generan automáticamente al completar',
                    '🔔 Puede enviar recordatorios individuales o masivos'
                ],
                warnings: [
                    'Empleados con capacitaciones vencidas aparecen en rojo',
                    'Las capacitaciones de seguridad vencidas pueden bloquear el fichaje'
                ],
                helpTopics: [
                    '¿Cómo ver el historial de un empleado?',
                    '¿Cómo enviar recordatorio de capacitación pendiente?',
                    '¿Cómo generar reporte de cumplimiento?',
                    '¿Qué significa cada origen de asignación?'
                ],
                fieldHelp: {
                    'source_manual': 'Asignada manualmente por un administrador',
                    'source_hse': 'Auto-asignada por violación de seguridad (HSE)',
                    'source_medical': 'Auto-asignada por resultado de examen médico',
                    'source_art': 'Auto-asignada post-accidente laboral',
                    'source_procedures': 'Auto-asignada por nuevo/actualizado procedimiento',
                    'source_risk': 'Auto-asignada por alerta de Risk Intelligence',
                    'source_onboarding': 'Parte del proceso de inducción'
                }
            },

            // -----------------------------------------------------------------
            // REPORTES
            // -----------------------------------------------------------------
            reports: {
                title: 'Reportes y Estadísticas',
                description: `
                    Generación de reportes de capacitación para compliance,
                    auditorías, y análisis de efectividad.
                `,
                tips: [
                    '📊 Use "Reporte por Origen" para ver cuántas vienen de cada módulo',
                    '📅 Configure rango de fechas para reportes históricos',
                    '📤 Exporte a Excel/PDF para auditorías',
                    '🔍 El reporte de gaps muestra qué capacitaciones faltan por área'
                ],
                helpTopics: [
                    '¿Cómo generar reporte para auditoría SRT?',
                    '¿Cómo ver efectividad de capacitaciones?',
                    '¿Cómo exportar historial completo?',
                    '¿Qué métricas son importantes para compliance?'
                ],

                // INTERPRETACIÓN DE MÉTRICAS
                metrics: {
                    title: 'Interpretación de Métricas',
                    items: [
                        {
                            metric: 'Tasa de Completado',
                            description: '% de asignaciones completadas sobre el total',
                            good: '≥ 85%',
                            warning: '70-84%',
                            critical: '< 70%',
                            action: 'Si está bajo, revisar si hay bloqueos o falta de tiempo'
                        },
                        {
                            metric: 'Tiempo Promedio de Completado',
                            description: 'Días promedio entre asignación y completado',
                            good: '≤ 14 días',
                            warning: '15-30 días',
                            critical: '> 30 días',
                            action: 'Tiempos largos pueden indicar capacitaciones muy extensas'
                        },
                        {
                            metric: 'Tasa de Aprobación',
                            description: '% de evaluaciones aprobadas en primer intento',
                            good: '≥ 80%',
                            warning: '60-79%',
                            critical: '< 60%',
                            action: 'Tasa baja puede indicar contenido difícil o mal explicado'
                        },
                        {
                            metric: 'Auto-asignadas / Total',
                            description: 'Proporción de capacitaciones automáticas',
                            good: 'Variable',
                            info: 'Alto % indica buena integración con otros módulos'
                        }
                    ]
                }
            },

            // -----------------------------------------------------------------
            // CALENDARIO
            // -----------------------------------------------------------------
            calendar: {
                title: 'Calendario de Capacitaciones',
                description: `
                    Vista temporal de capacitaciones programadas, deadlines,
                    y sesiones presenciales.
                `,
                tips: [
                    '📅 Arrastre para crear nueva capacitación en fecha específica',
                    '🔴 Los puntos rojos indican capacitaciones con deadline ese día',
                    '🟡 Los amarillos indican capacitaciones próximas a vencer',
                    '👥 Click en evento para ver empleados asignados'
                ],
                helpTopics: [
                    '¿Cómo programar capacitación presencial?',
                    '¿Cómo ver todos los deadlines del mes?',
                    '¿Cómo reprogramar una capacitación?'
                ]
            },

            // -----------------------------------------------------------------
            // INTEGRACIÓN HSE
            // -----------------------------------------------------------------
            integration_hse: {
                title: 'Integración con HSE (Seguridad e Higiene)',
                description: `
                    Cuando ocurre una violación de seguridad o se confirma un caso HSE,
                    el sistema auto-asigna la capacitación correspondiente.
                `,

                circuit: {
                    title: 'Circuito HSE → Capacitación',
                    steps: [
                        {
                            step: 1,
                            name: 'Detección',
                            description: 'Cámara detecta EPP faltante o se reporta violación manualmente',
                            icon: '📷'
                        },
                        {
                            step: 2,
                            name: 'Caso HSE',
                            description: 'Se crea caso en módulo HSE con código de violación',
                            icon: '🛡️'
                        },
                        {
                            step: 3,
                            name: 'Confirmación',
                            description: 'Supervisor confirma la violación',
                            icon: '✅'
                        },
                        {
                            step: 4,
                            name: 'Auto-Asignación',
                            description: 'Sistema busca capacitación con keywords del código de violación',
                            icon: '🔗'
                        },
                        {
                            step: 5,
                            name: 'Notificación',
                            description: 'Empleado recibe notificación de capacitación asignada',
                            icon: '🔔'
                        }
                    ],
                    mappings: [
                        { violation: 'NO_HELMET', training: 'Uso correcto de EPP - Protección cabeza' },
                        { violation: 'NO_GLOVES', training: 'Seguridad en manipulación - Guantes' },
                        { violation: 'NO_GOGGLES', training: 'Protección visual en el trabajo' },
                        { violation: 'NO_HARNESS', training: 'Trabajo en altura y uso de arnés' },
                        { violation: 'UNSAFE_BEHAVIOR', training: 'Comportamiento seguro en el trabajo' }
                    ]
                },
                tips: [
                    '🔧 Configure los códigos HSE en cada capacitación para habilitar auto-asignación',
                    '📋 Las capacitaciones de seguridad tienen prioridad HIGH por defecto',
                    '⚠️ Si no hay capacitación mapeada, el sistema notifica pero no bloquea'
                ]
            },

            // -----------------------------------------------------------------
            // INTEGRACIÓN MEDICAL
            // -----------------------------------------------------------------
            integration_medical: {
                title: 'Integración con Exámenes Médicos',
                description: `
                    Cuando un examen médico detecta una deficiencia, se asigna
                    capacitación remedial. También valida elegibilidad médica
                    antes de inscribir en capacitaciones de alto riesgo.
                `,

                circuit: {
                    title: 'Circuito Medical → Capacitación',
                    flows: [
                        {
                            name: 'Deficiencia → Capacitación',
                            description: 'Examen detecta problema → Se asigna capacitación preventiva',
                            examples: [
                                'Audiometría deficiente → "Protección auditiva"',
                                'Problemas ergonómicos → "Ergonomía laboral"',
                                'Estrés elevado → "Gestión del estrés"'
                            ]
                        },
                        {
                            name: 'Validación de Elegibilidad',
                            description: 'Antes de inscribir, verifica certificado médico vigente',
                            examples: [
                                'Capacitación "Trabajo en altura" → Requiere apto físico',
                                'Capacitación "Manejo de maquinaria" → Requiere psicotécnico'
                            ]
                        }
                    ]
                },
                warnings: [
                    '🚫 Si el certificado médico está vencido, la inscripción será bloqueada',
                    '⚕️ Configure qué capacitaciones requieren validación médica en su ficha'
                ]
            },

            // -----------------------------------------------------------------
            // INTEGRACIÓN ART
            // -----------------------------------------------------------------
            integration_art: {
                title: 'Integración con Gestión de ART',
                description: `
                    Post-accidente, se asigna capacitación de reinserción al accidentado
                    y capacitación preventiva a toda el área.
                `,

                circuit: {
                    title: 'Circuito ART → Capacitación',
                    steps: [
                        { step: 1, description: 'Ocurre accidente', icon: '🚨' },
                        { step: 2, description: 'Se registra denuncia ART', icon: '📋' },
                        { step: 3, description: 'Alta médica / cierre de caso', icon: '🏥' },
                        { step: 4, description: 'Auto-asigna reinserción a víctima', icon: '👤' },
                        { step: 5, description: 'Auto-asigna prevención a toda el área', icon: '👥' }
                    ],
                    mappings: [
                        { accident: 'Caída de altura', training: 'Trabajo en altura + Uso de arnés' },
                        { accident: 'Atrapamiento', training: 'LOTO - Bloqueo y etiquetado' },
                        { accident: 'Corte/herida', training: 'Seguridad con herramientas' },
                        { accident: 'Eléctrico', training: 'Riesgo eléctrico + RCP' },
                        { accident: 'In itinere', training: 'Seguridad vial' }
                    ]
                },
                tips: [
                    '📎 El historial de capacitaciones se adjunta automáticamente a la denuncia ART',
                    '👥 La capacitación preventiva va a todos los del área excepto la víctima',
                    '⚡ Prioridad CRITICAL para víctima, HIGH para área'
                ]
            },

            // -----------------------------------------------------------------
            // INTEGRACIÓN PROCEDURES
            // -----------------------------------------------------------------
            integration_procedures: {
                title: 'Integración con Procedimientos',
                description: `
                    Cuando se publica un nuevo procedimiento o se actualiza uno existente,
                    se asigna capacitación automáticamente a los afectados.
                `,

                circuit: {
                    title: 'Circuito Procedures → Capacitación',
                    flows: [
                        {
                            trigger: 'Nuevo procedimiento publicado',
                            action: 'Asigna capacitación a todos los afectados por departamento/rol',
                            priority: 'HIGH'
                        },
                        {
                            trigger: 'Actualización con cambios críticos',
                            action: 'Re-capacita a quienes ya completaron la versión anterior',
                            priority: 'NORMAL'
                        },
                        {
                            trigger: 'Auditoría con no-conformidad',
                            action: 'Asigna capacitación correctiva al empleado',
                            priority: 'HIGH'
                        }
                    ],
                    criticalChanges: [
                        'Cambio en pasos críticos',
                        'Cambio en EPP requerido',
                        'Cambio en medidas de seguridad',
                        'Cambio en permisos/prerequisitos'
                    ]
                }
            },

            // -----------------------------------------------------------------
            // INTEGRACIÓN RISK INTELLIGENCE
            // -----------------------------------------------------------------
            integration_risk: {
                title: 'Integración con Risk Intelligence',
                description: `
                    Cuando un empleado alcanza score de riesgo crítico (≥80)
                    o se dispara una alerta, se asigna capacitación preventiva.
                `,

                circuit: {
                    title: 'Circuito Risk → Capacitación',
                    mapping: [
                        {
                            riskCategory: 'attendance_risk',
                            trigger: 'Múltiples tardanzas o ausencias',
                            training: 'Gestión del tiempo, Puntualidad'
                        },
                        {
                            riskCategory: 'safety_risk',
                            trigger: 'Violaciones HSE repetidas',
                            training: 'Seguridad laboral, EPP'
                        },
                        {
                            riskCategory: 'compliance_risk',
                            trigger: 'Incumplimiento de políticas',
                            training: 'Cumplimiento normativo'
                        },
                        {
                            riskCategory: 'performance_risk',
                            trigger: 'Bajo rendimiento sostenido',
                            training: 'Mejora de desempeño'
                        },
                        {
                            riskCategory: 'flight_risk',
                            trigger: 'Alto riesgo de renuncia',
                            training: 'Desarrollo de carrera, Engagement'
                        }
                    ],
                    priorityRules: [
                        { score: '≥ 80', priority: 'CRITICAL' },
                        { score: '60-79', priority: 'HIGH' },
                        { score: '40-59', priority: 'NORMAL' },
                        { score: '< 40', priority: 'Sin acción automática' }
                    ]
                }
            }
        },

        // =====================================================================
        // RESPUESTAS FALLBACK PARA PREGUNTAS COMUNES
        // =====================================================================
        fallbackResponses: {
            'auto-asignada': `
                Las capacitaciones auto-asignadas provienen de 5 módulos:
                - HSE: Violaciones de seguridad
                - Medical: Deficiencias en exámenes
                - ART: Post-accidente
                - Procedures: Nuevo/actualizado procedimiento
                - Risk Intelligence: Score crítico

                Puede ver el origen en la columna "Origen" de cada asignación.
            `,
            'prioridad': `
                Las prioridades determinan urgencia:
                - CRITICAL (rojo): Completar en 3 días
                - HIGH (naranja): Completar en 7 días
                - NORMAL (azul): Completar en 30 días
                - LOW (gris): Completar en 60 días

                Las auto-asignadas desde ART son siempre CRITICAL.
            `,
            'bloqueo': `
                Una capacitación puede bloquearse si:
                1. Requiere certificado médico y está vencido
                2. Tiene prerequisitos no completados
                3. Hay restricciones por aptitud médica

                Vea el mensaje de error para conocer la causa específica.
            `,
            'certificado': `
                Los certificados se generan automáticamente al completar
                una capacitación que tiene "Emite certificado" activado.

                Puede descargar desde: Seguimiento Empleados → Click empleado → Certificados
            `,
            'hse': `
                La integración con HSE funciona así:
                1. Se detecta violación de EPP (cámara o reporte)
                2. Se confirma el caso HSE
                3. Sistema busca capacitación con keywords del código
                4. Auto-asigna con prioridad HIGH
                5. Empleado recibe notificación

                Configure los códigos HSE en la ficha de cada capacitación.
            `,
            'medical': `
                La integración con Medical funciona en dos sentidos:
                1. Deficiencia → Capacitación remedial
                2. Training de riesgo → Valida certificado antes de inscribir

                Configure "Requiere aptitud médica" en capacitaciones de alto riesgo.
            `,
            'art': `
                Post-accidente, el sistema asigna:
                - A la víctima: Capacitación de reinserción (CRITICAL)
                - Al área: Capacitación preventiva (HIGH)

                El historial de trainings se adjunta a la denuncia ART.
            `,
            'procedures': `
                Cuando se publica un procedimiento:
                - Si "Requiere capacitación" está activo
                - Se asigna a todos los afectados (por depto o rol)
                - Cambios críticos disparan re-capacitación
            `,
            'risk': `
                Risk Intelligence asigna capacitaciones cuando:
                - Score ≥ 80: Prioridad CRITICAL
                - Score 60-79: Prioridad HIGH
                - Se activa alerta de riesgo

                Cada categoría de riesgo tiene capacitaciones específicas.
            `,
            'reportes': `
                Reportes disponibles:
                - Por origen: Cuántas de cada módulo
                - Por estado: Completadas vs pendientes
                - Por empleado: Cumplimiento individual
                - Para auditoría: Historial con evidencias
                - Gaps: Qué falta por área/rol
            `
        }
    });

    console.log('📚 [TRAINING-HELP] Sistema de ayuda contextual registrado');
} else {
    console.warn('📚 [TRAINING-HELP] ModuleHelpSystem no disponible');
}

// ============================================================================
// FUNCIONES DE AYUDA ADICIONALES
// ============================================================================

/**
 * Muestra tooltip con información del origen de asignación
 */
function showSourceTooltip(element, sourceModule, sourceEntityType, sourceEntityId) {
    const sourceInfo = {
        hse: {
            icon: '🛡️',
            name: 'Seguridad e Higiene',
            description: 'Auto-asignada por violación de seguridad o caso HSE'
        },
        medical: {
            icon: '⚕️',
            name: 'Exámenes Médicos',
            description: 'Auto-asignada por deficiencia detectada en examen'
        },
        art: {
            icon: '🏥',
            name: 'Gestión de ART',
            description: 'Auto-asignada post-accidente laboral'
        },
        procedures: {
            icon: '📋',
            name: 'Procedimientos',
            description: 'Auto-asignada por nuevo/actualizado procedimiento'
        },
        risk_intelligence: {
            icon: '📊',
            name: 'Risk Intelligence',
            description: 'Auto-asignada por score de riesgo crítico'
        },
        manual: {
            icon: '👤',
            name: 'Manual',
            description: 'Asignada manualmente por un administrador'
        },
        onboarding: {
            icon: '🎓',
            name: 'Inducción',
            description: 'Parte del proceso de onboarding'
        }
    };

    const info = sourceInfo[sourceModule] || sourceInfo.manual;

    const tooltip = document.createElement('div');
    tooltip.className = 'training-source-tooltip';
    tooltip.innerHTML = `
        <div style="padding: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; max-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            <div style="font-size: 16px; margin-bottom: 8px;">
                ${info.icon} <strong>${info.name}</strong>
            </div>
            <div style="font-size: 13px; color: #94a3b8; margin-bottom: 8px;">
                ${info.description}
            </div>
            ${sourceEntityId ? `
                <div style="font-size: 11px; color: #64748b;">
                    Ref: ${sourceEntityType} #${sourceEntityId}
                </div>
            ` : ''}
        </div>
    `;

    // Posicionar
    const rect = element.getBoundingClientRect();
    tooltip.style.position = 'fixed';
    tooltip.style.top = `${rect.bottom + 5}px`;
    tooltip.style.left = `${rect.left}px`;
    tooltip.style.zIndex = '9999';

    document.body.appendChild(tooltip);

    // Remover al salir
    element.addEventListener('mouseleave', () => {
        tooltip.remove();
    }, { once: true });
}

/**
 * Muestra panel de ayuda de circuitos
 */
function showCircuitsHelpPanel() {
    if (typeof ModuleHelpSystem !== 'undefined') {
        const context = ModuleHelpSystem.getContext('training-management', 'dashboard');
        if (context?.circuits) {
            // Mostrar modal con información de circuitos
            const modal = document.createElement('div');
            modal.innerHTML = `
                <div class="modal" style="display: block; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 10000;">
                    <div style="background: #1a1a2e; border: 1px solid #334155; border-radius: 12px; max-width: 800px; margin: 50px auto; max-height: 80vh; overflow-y: auto;">
                        <div style="padding: 20px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="color: #e2e8f0; margin: 0;">🔗 Circuitos de Integración</h3>
                            <button onclick="this.closest('.modal').remove()" style="background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer;">&times;</button>
                        </div>
                        <div style="padding: 20px; color: #e2e8f0;">
                            <pre style="background: #0f172a; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 12px; line-height: 1.5;">
${context.circuits.description}
                            </pre>

                            <h4 style="margin-top: 20px; color: #a5b4fc;">Integraciones Activas:</h4>
                            <div style="display: grid; gap: 15px; margin-top: 15px;">
                                ${context.circuits.items.map(item => `
                                    <div style="background: #16213e; padding: 15px; border-radius: 8px; border-left: 4px solid ${item.priority === 'CRITICAL' ? '#ef4444' : item.priority === 'HIGH' ? '#f97316' : '#22c55e'};">
                                        <div style="font-weight: bold; color: #f1f5f9;">${item.source}</div>
                                        <div style="color: #94a3b8; font-size: 13px; margin-top: 5px;">
                                            <strong>Trigger:</strong> ${item.trigger}<br>
                                            <strong>Resultado:</strong> ${item.result}<br>
                                            <strong>Ejemplo:</strong> ${item.example}
                                        </div>
                                        <span style="display: inline-block; margin-top: 8px; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: ${item.priority === 'CRITICAL' ? '#ef4444' : item.priority === 'HIGH' ? '#f97316' : '#22c55e'}; color: white;">
                                            Prioridad: ${item.priority}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal.firstElementChild);
        }
    }
}

// Exportar funciones para uso global
window.TrainingHelp = {
    showSourceTooltip,
    showCircuitsHelpPanel
};
