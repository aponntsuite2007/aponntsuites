// Psychological Assessment Module - Sistema de Evaluación Psicológica Integral
console.log('🧠 [PSYCHOLOGICAL-ASSESSMENT] Módulo de evaluación psicológica cargado');

// Main function to show psychological assessment content
function showPsychologicalAssessmentContent() {
    console.log('🧠 [PSYCHOLOGICAL-ASSESSMENT] Ejecutando showPsychologicalAssessmentContent()');

    const content = document.getElementById('mainContent');
    if (!content) {
        console.error('❌ [PSYCHOLOGICAL-ASSESSMENT] mainContent no encontrado');
        return;
    }

    content.style.setProperty('display', 'block', 'important');

    content.innerHTML = `
        <div class="tab-content active">
            <div class="card" style="padding: 0; overflow: hidden;">
                <!-- Header del módulo -->
                <div style="background: linear-gradient(135deg, #8e44ad 0%, #6c3483 100%); color: white; padding: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; font-size: 28px;">🧠 Evaluación Psicológica Integral</h2>
                            <p style="margin: 5px 0 0 0; opacity: 0.9;">Sistema avanzado de assessment psicológico y detección temprana</p>
                        </div>
                        <button onclick="showNewAssessmentModal()"
                                style="background: rgba(255,255,255,0.2); border: 2px solid white; color: white; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            ➕ Nueva Evaluación
                        </button>
                    </div>
                </div>

                <!-- Tabs de navegación -->
                <div style="background: #f8f9fa; border-bottom: 1px solid #e9ecef;">
                    <div style="display: flex; padding: 0 25px;">
                        <button onclick="switchPsychTab('evaluations')" id="tab-evaluations"
                                class="psych-tab active-psych-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid #8e44ad;">
                            📋 Evaluaciones
                        </button>
                        <button onclick="switchPsychTab('alerts')" id="tab-alerts"
                                class="psych-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            🚨 Alertas Críticas
                        </button>
                        <button onclick="switchPsychTab('reports')" id="tab-reports"
                                class="psych-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            📊 Reportes
                        </button>
                        <button onclick="switchPsychTab('trends')" id="tab-trends"
                                class="psych-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            📈 Tendencias
                        </button>
                    </div>
                </div>

                <!-- Contenido de las pestañas -->
                <div style="padding: 25px;" id="psychTabContent">
                    ${getEvaluationsContent()}
                </div>
            </div>
        </div>

        <!-- Modal para nueva evaluación -->
        <div id="newAssessmentModal" class="modal" style="display: none !important; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9997;">
            <div class="modal-content" style="position: relative; margin: 1% auto; width: 95%; max-width: 1200px; background: white; border-radius: 12px; max-height: 95vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #8e44ad 0%, #6c3483 100%); color: white; padding: 20px 30px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">🧠 Nueva Evaluación Psicológica</h3>
                    <button onclick="closeNewAssessmentModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    ${getNewAssessmentForm()}
                </div>
            </div>
        </div>

        <!-- Modal para alertas críticas -->
        <div id="criticalAlertModal" class="modal" style="display: none !important; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9997;">
            <div class="modal-content" style="position: relative; margin: 2% auto; width: 95%; max-width: 800px; background: white; border-radius: 12px; max-height: 90vh; overflow-y: auto; border: 3px solid #e74c3c;">
                <div class="modal-header" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 20px 30px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">🚨 Alerta Crítica - Requiere Atención Inmediata</h3>
                    <button onclick="closeCriticalAlertModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 30px;" id="criticalAlertContent">
                    <!-- Content will be populated when opening -->
                </div>
            </div>
        </div>
    `;

    console.log('✅ [PSYCHOLOGICAL-ASSESSMENT] Contenido renderizado exitosamente');

    // Initialize assessment data
    loadPsychologicalAssessments();
}

// Switch between psychological tabs
function switchPsychTab(tabName) {
    // Update tab styles
    document.querySelectorAll('.psych-tab').forEach(tab => {
        tab.style.borderBottom = '3px solid transparent';
        tab.classList.remove('active-psych-tab');
    });

    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) {
        activeTab.style.borderBottom = '3px solid #8e44ad';
        activeTab.classList.add('active-psych-tab');
    }

    // Update content
    const contentDiv = document.getElementById('psychTabContent');
    if (!contentDiv) return;

    switch(tabName) {
        case 'evaluations':
            contentDiv.innerHTML = getEvaluationsContent();
            loadPsychologicalAssessments();
            break;
        case 'alerts':
            contentDiv.innerHTML = getCriticalAlertsContent();
            loadCriticalAlerts();
            break;
        case 'reports':
            contentDiv.innerHTML = getPsychologicalReportsContent();
            loadPsychologicalReports();
            break;
        case 'trends':
            contentDiv.innerHTML = getPsychologicalTrendsContent();
            loadPsychologicalTrends();
            break;
    }
}

// Get evaluations content
function getEvaluationsContent() {
    return `
        <div class="assessments-container">
            <!-- Filtros y búsqueda -->
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 25px; gap: 15px; flex-wrap: wrap;">
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <select id="assessmentFilter" onchange="filterAssessments()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="all">Todas las evaluaciones</option>
                        <option value="pending">Pendientes</option>
                        <option value="completed">Completadas</option>
                        <option value="critical">Críticas</option>
                        <option value="follow_up">Seguimiento</option>
                    </select>

                    <select id="riskFilter" onchange="filterAssessments()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="all">Todos los niveles</option>
                        <option value="low">Riesgo Bajo</option>
                        <option value="medium">Riesgo Medio</option>
                        <option value="high">Riesgo Alto</option>
                        <option value="critical">Riesgo Crítico</option>
                    </select>
                </div>

                <input type="text" id="assessmentSearch" placeholder="Buscar empleado..."
                       onkeyup="searchAssessments()"
                       style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; min-width: 200px;">
            </div>

            <!-- Resumen estadísticas -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #27ae60;">24</div>
                    <div style="color: #2d5a2d; font-weight: 600;">Evaluaciones Completadas</div>
                </div>
                <div style="background: #fff3cd; padding: 20px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #f39c12;">8</div>
                    <div style="color: #8d6e08; font-weight: 600;">En Seguimiento</div>
                </div>
                <div style="background: #f8d7da; padding: 20px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #e74c3c;">3</div>
                    <div style="color: #a12622; font-weight: 600;">Alertas Críticas</div>
                </div>
                <div style="background: #d1ecf1; padding: 20px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #17a2b8;">35</div>
                    <div style="color: #105a68; font-weight: 600;">Total Empleados</div>
                </div>
            </div>

            <!-- Lista de evaluaciones -->
            <div id="assessments-list">
                <div style="text-align: center; padding: 40px;">
                    🔄 Cargando evaluaciones psicológicas...
                </div>
            </div>
        </div>
    `;
}

// Get critical alerts content
function getCriticalAlertsContent() {
    return `
        <div class="critical-alerts-container">
            <div style="background: #ffe6e6; border: 2px solid #ff4757; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #c44569; margin: 0 0 10px 0;">🚨 Protocolo de Alertas Críticas</h3>
                <p style="margin: 0; color: #5a2b3d;">Este sistema detecta automáticamente signos de violencia, bullying y trauma a través de análisis biométrico facial avanzado con IA.</p>
            </div>

            <!-- Alertas activas -->
            <div id="critical-alerts-list">
                <div style="text-align: center; padding: 40px;">
                    🔄 Cargando alertas críticas...
                </div>
            </div>
        </div>
    `;
}

// Get psychological reports content
function getPsychologicalReportsContent() {
    return `
        <div class="reports-container">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 25px; gap: 15px;">
                <div style="display: flex; gap: 15px;">
                    <select id="reportPeriod" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="week">Última semana</option>
                        <option value="month" selected>Último mes</option>
                        <option value="quarter">Último trimestre</option>
                        <option value="year">Último año</option>
                    </select>

                    <select id="reportType" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="general">Reporte General</option>
                        <option value="risk">Análisis de Riesgo</option>
                        <option value="trends">Tendencias</option>
                        <option value="interventions">Intervenciones</option>
                    </select>
                </div>

                <button onclick="generatePsychologicalReport()"
                        style="background: #8e44ad; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                    📊 Generar Reporte
                </button>
            </div>

            <div id="psychological-reports">
                <div style="text-align: center; padding: 40px;">
                    📊 Seleccione los parámetros y genere un reporte
                </div>
            </div>
        </div>
    `;
}

// Get psychological trends content
function getPsychologicalTrendsContent() {
    return `
        <div class="trends-container">
            <h3 style="margin: 0 0 20px 0;">📈 Tendencias Psicológicas y Predictivas</h3>

            <!-- Gráficos de tendencias -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 25px;">
                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #8e44ad;">🧠 Bienestar Psicológico General</h4>
                    <div id="wellness-trend-chart" style="height: 300px; display: flex; align-items: center; justify-content: center; color: #666;">
                        Gráfico de tendencias de bienestar
                    </div>
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #e74c3c;">🚨 Alertas por Categoría</h4>
                    <div id="alerts-category-chart" style="height: 300px; display: flex; align-items: center; justify-content: center; color: #666;">
                        Gráfico de alertas por tipo
                    </div>
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #f39c12;">📊 Factores de Riesgo</h4>
                    <div id="risk-factors-chart" style="height: 300px; display: flex; align-items: center; justify-content: center; color: #666;">
                        Análisis de factores de riesgo
                    </div>
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #27ae60;">✅ Efectividad de Intervenciones</h4>
                    <div id="intervention-effectiveness-chart" style="height: 300px; display: flex; align-items: center; justify-content: center; color: #666;">
                        Efectividad de intervenciones
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Get new assessment form
function getNewAssessmentForm() {
    return `
        <form onsubmit="submitPsychologicalAssessment(event)">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                <div>
                    <h4 style="margin: 0 0 15px 0; color: #8e44ad;">👤 Información del Empleado</h4>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Empleado:</label>
                        <select name="employeeId" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">Seleccionar empleado...</option>
                            <option value="1">Juan Pérez - EMP001</option>
                            <option value="2">María González - EMP002</option>
                            <option value="3">Carlos Rodriguez - EMP003</option>
                            <option value="4">Ana Martínez - EMP004</option>
                            <option value="5">Luis López - EMP005</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo de Evaluación:</label>
                        <select name="assessmentType" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">Seleccionar tipo...</option>
                            <option value="routine">Evaluación de Rutina</option>
                            <option value="incident">Post-Incidente</option>
                            <option value="followup">Seguimiento</option>
                            <option value="emergency">Emergencia</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Psicólogo Evaluador:</label>
                        <select name="psychologistId" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">Seleccionar psicólogo...</option>
                            <option value="1">Dra. Elena Psicóloga</option>
                            <option value="2">Dr. Roberto Mente</option>
                            <option value="3">Lic. Patricia Salud</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Prioridad:</label>
                        <select name="priority" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="low">Baja</option>
                            <option value="medium" selected>Media</option>
                            <option value="high">Alta</option>
                            <option value="critical">Crítica</option>
                        </select>
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 15px 0; color: #8e44ad;">📋 Detalles de la Evaluación</h4>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Motivo de Evaluación:</label>
                        <textarea name="reason" required placeholder="Describa el motivo de la evaluación..."
                                  style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; height: 100px; resize: vertical;"></textarea>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Observaciones Iniciales:</label>
                        <textarea name="initialObservations" placeholder="Observaciones previas o síntomas detectados..."
                                  style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; height: 80px; resize: vertical;"></textarea>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Fecha de Evaluación:</label>
                        <input type="date" name="assessmentDate" required
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">
                            <input type="checkbox" name="confidential" style="margin-right: 8px;">
                            Evaluación Confidencial
                        </label>
                        <small style="color: #666;">Solo accesible por personal autorizado</small>
                    </div>
                </div>
            </div>

            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 25px; text-align: right;">
                <button type="button" onclick="closeNewAssessmentModal()"
                        style="background: #95a5a6; color: white; border: none; padding: 12px 24px; margin-right: 10px; border-radius: 6px; cursor: pointer;">
                    Cancelar
                </button>
                <button type="submit"
                        style="background: #8e44ad; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">
                    📋 Crear Evaluación
                </button>
            </div>
        </form>
    `;
}

// Modal functions
function showNewAssessmentModal() {
    document.getElementById('newAssessmentModal').style.setProperty('display', 'block', 'important');
}

function closeNewAssessmentModal() {
    document.getElementById('newAssessmentModal').style.setProperty('display', 'none', 'important');
}

function showCriticalAlertModal(alertData) {
    const modal = document.getElementById('criticalAlertModal');
    const content = document.getElementById('criticalAlertContent');

    content.innerHTML = `
        <div style="background: #ffe6e6; border: 1px solid #ff4757; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h4 style="color: #c44569; margin: 0 0 10px 0;">🚨 ${alertData.type}</h4>
            <p style="margin: 0; color: #5a2b3d;"><strong>Empleado:</strong> ${alertData.employee}</p>
            <p style="margin: 5px 0 0 0; color: #5a2b3d;"><strong>Nivel de Riesgo:</strong> ${alertData.risk}%</p>
        </div>

        <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0;">📊 Indicadores Detectados:</h4>
            <ul style="margin: 0; padding-left: 20px;">
                ${alertData.indicators.map(indicator => `<li style="margin-bottom: 5px;">${indicator}</li>`).join('')}
            </ul>
        </div>

        <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0;">🎯 Recomendaciones:</h4>
            <ul style="margin: 0; padding-left: 20px;">
                ${alertData.recommendations.map(rec => `<li style="margin-bottom: 5px;">${rec}</li>`).join('')}
            </ul>
        </div>

        <div style="text-align: right; border-top: 1px solid #eee; padding-top: 20px;">
            <button onclick="acknowledgeAlert('${alertData.id}')"
                    style="background: #e74c3c; color: white; border: none; padding: 12px 24px; margin-right: 10px; border-radius: 6px; cursor: pointer;">
                🚨 Reconocer Alerta
            </button>
            <button onclick="createEmergencyAssessment('${alertData.employeeId}')"
                    style="background: #8e44ad; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">
                📋 Evaluación Emergencia
            </button>
        </div>
    `;

    modal.style.setProperty('display', 'block', 'important');
}

function closeCriticalAlertModal() {
    document.getElementById('criticalAlertModal').style.setProperty('display', 'none', 'important');
}

// Load functions
async function loadPsychologicalAssessments() {
    console.log('🧠 [PSYCHOLOGICAL-ASSESSMENT] Cargando evaluaciones...');

    const container = document.getElementById('assessments-list');
    if (!container) return;

    // Mock data
    const assessments = [
        {
            id: 1,
            employee: 'Juan Pérez',
            legajo: 'EMP001',
            type: 'routine',
            status: 'completed',
            riskLevel: 'low',
            psychologist: 'Dra. Elena Psicóloga',
            date: '2025-09-15',
            score: 85,
            alerts: []
        },
        {
            id: 2,
            employee: 'María González',
            legajo: 'EMP002',
            type: 'incident',
            status: 'follow_up',
            riskLevel: 'medium',
            psychologist: 'Dr. Roberto Mente',
            date: '2025-09-10',
            score: 65,
            alerts: ['Estrés elevado', 'Ansiedad social']
        },
        {
            id: 3,
            employee: 'Carlos Rodriguez',
            legajo: 'EMP003',
            type: 'emergency',
            status: 'critical',
            riskLevel: 'critical',
            psychologist: 'Lic. Patricia Salud',
            date: '2025-09-18',
            score: 35,
            alerts: ['Riesgo de violencia detectado: 85%', 'Indicadores de trauma psicológico']
        }
    ];

    displayPsychologicalAssessments(assessments);
}

function displayPsychologicalAssessments(assessments) {
    const container = document.getElementById('assessments-list');
    if (!container || !assessments.length) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No hay evaluaciones para mostrar</div>';
        return;
    }

    container.innerHTML = assessments.map(assessment => `
        <div class="assessment-card" style="border: 2px solid ${getRiskColor(assessment.riskLevel)}; padding: 20px; margin-bottom: 15px; border-radius: 10px; background: white;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div>
                    <h4 style="margin: 0 0 5px 0; color: #2c3e50;">${assessment.employee} (${assessment.legajo})</h4>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <span style="background: ${getTypeColor(assessment.type)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                            ${getTypeText(assessment.type)}
                        </span>
                        <span style="background: ${getStatusColor(assessment.status)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                            ${getStatusText(assessment.status)}
                        </span>
                        <span style="background: ${getRiskColor(assessment.riskLevel)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                            ${getRiskText(assessment.riskLevel)}
                        </span>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 24px; font-weight: bold; color: ${getScoreColor(assessment.score)};">${assessment.score}/100</div>
                    <div style="font-size: 12px; color: #666;">${assessment.date}</div>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <strong>Psicólogo:</strong> ${assessment.psychologist}
            </div>

            ${assessment.alerts.length > 0 ? `
                <div style="background: #ffe6e6; border: 1px solid #ff4757; border-radius: 6px; padding: 15px; margin-bottom: 15px;">
                    <h5 style="margin: 0 0 10px 0; color: #c44569;">🚨 Alertas:</h5>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${assessment.alerts.map(alert => `<li style="margin-bottom: 5px; color: #5a2b3d;">${alert}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <div style="text-align: right;">
                <button onclick="viewAssessmentDetails(${assessment.id})"
                        style="background: #3498db; color: white; border: none; padding: 8px 16px; margin-right: 10px; border-radius: 4px; cursor: pointer;">
                    👁️ Ver Detalles
                </button>
                ${assessment.status === 'critical' ? `
                    <button onclick="showCriticalAlertModal({
                        id: '${assessment.id}',
                        type: 'Evaluación Crítica',
                        employee: '${assessment.employee}',
                        employeeId: '${assessment.id}',
                        risk: '${assessment.score}',
                        indicators: ${JSON.stringify(assessment.alerts).replace(/"/g, '&quot;')},
                        recommendations: ['Intervención psicológica inmediata', 'Notificar a recursos humanos', 'Monitoreo continuo']
                    })"
                            style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        🚨 Ver Alerta
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function loadCriticalAlerts() {
    console.log('🚨 [PSYCHOLOGICAL-ASSESSMENT] Cargando alertas críticas...');

    const container = document.getElementById('critical-alerts-list');
    if (!container) return;

    // Mock critical alerts data
    const criticalAlerts = [
        {
            id: 'ALERT-001',
            employee: 'Carlos Rodriguez',
            employeeId: 3,
            type: 'Riesgo de Violencia',
            riskLevel: 85,
            indicators: [
                'Asimetría facial inusual',
                'Microexpresiones de terror o sobresalto',
                'Evitación extrema del contacto visual'
            ],
            recommendations: [
                'Intervención inmediata del equipo psicológico',
                'Notificar a autoridades competentes',
                'Activar protocolo de protección'
            ],
            timestamp: '2025-09-21 14:30',
            severity: 'critical'
        }
    ];

    if (criticalAlerts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #27ae60;">
                <div style="font-size: 3rem; margin-bottom: 15px;">✅</div>
                <h3>No hay alertas críticas activas</h3>
                <p>Todos los empleados se encuentran en niveles de riesgo normales.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = criticalAlerts.map(alert => `
        <div style="border: 3px solid #e74c3c; background: #ffe6e6; padding: 20px; margin-bottom: 15px; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div>
                    <h4 style="margin: 0 0 5px 0; color: #c44569;">🚨 ${alert.type}</h4>
                    <div style="color: #5a2b3d;"><strong>Empleado:</strong> ${alert.employee}</div>
                    <div style="color: #5a2b3d;"><strong>Nivel de Riesgo:</strong> ${alert.riskLevel}%</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; color: #666;">${alert.timestamp}</div>
                    <span style="background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                        CRÍTICO
                    </span>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <strong style="color: #c44569;">Indicadores:</strong>
                <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                    ${alert.indicators.map(indicator => `<li style="margin-bottom: 3px; color: #5a2b3d;">${indicator}</li>`).join('')}
                </ul>
            </div>

            <div style="text-align: right;">
                <button onclick="showCriticalAlertModal(${JSON.stringify(alert).replace(/"/g, '&quot;')})"
                        style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    🚨 Ver Detalles Completos
                </button>
            </div>
        </div>
    `).join('');
}

// Utility functions
function getRiskColor(risk) {
    switch(risk) {
        case 'low': return '#27ae60';
        case 'medium': return '#f39c12';
        case 'high': return '#e67e22';
        case 'critical': return '#e74c3c';
        default: return '#95a5a6';
    }
}

function getRiskText(risk) {
    switch(risk) {
        case 'low': return 'Riesgo Bajo';
        case 'medium': return 'Riesgo Medio';
        case 'high': return 'Riesgo Alto';
        case 'critical': return 'Riesgo Crítico';
        default: return 'No Evaluado';
    }
}

function getTypeColor(type) {
    switch(type) {
        case 'routine': return '#3498db';
        case 'incident': return '#f39c12';
        case 'followup': return '#9b59b6';
        case 'emergency': return '#e74c3c';
        default: return '#95a5a6';
    }
}

function getTypeText(type) {
    switch(type) {
        case 'routine': return 'Rutina';
        case 'incident': return 'Post-Incidente';
        case 'followup': return 'Seguimiento';
        case 'emergency': return 'Emergencia';
        default: return 'No Definido';
    }
}

function getStatusColor(status) {
    switch(status) {
        case 'pending': return '#f39c12';
        case 'completed': return '#27ae60';
        case 'critical': return '#e74c3c';
        case 'follow_up': return '#9b59b6';
        default: return '#95a5a6';
    }
}

function getStatusText(status) {
    switch(status) {
        case 'pending': return 'Pendiente';
        case 'completed': return 'Completada';
        case 'critical': return 'Crítica';
        case 'follow_up': return 'Seguimiento';
        default: return 'No Definido';
    }
}

function getScoreColor(score) {
    if (score >= 80) return '#27ae60';
    if (score >= 60) return '#f39c12';
    if (score >= 40) return '#e67e22';
    return '#e74c3c';
}

// Action functions
function submitPsychologicalAssessment(event) {
    event.preventDefault();

    console.log('🧠 [PSYCHOLOGICAL-ASSESSMENT] Creando nueva evaluación...');

    // Here would go the API call to create assessment
    alert('✅ Evaluación psicológica creada exitosamente');
    closeNewAssessmentModal();
    loadPsychologicalAssessments();
}

function acknowledgeAlert(alertId) {
    console.log('🚨 [PSYCHOLOGICAL-ASSESSMENT] Reconociendo alerta:', alertId);

    // Here would go the API call to acknowledge alert
    alert('✅ Alerta reconocida. Se ha registrado la intervención.');
    closeCriticalAlertModal();
    loadCriticalAlerts();
}

function createEmergencyAssessment(employeeId) {
    console.log('📋 [PSYCHOLOGICAL-ASSESSMENT] Creando evaluación de emergencia para empleado:', employeeId);

    // Here would go the logic to create emergency assessment
    alert('🚨 Evaluación de emergencia creada. Psicólogo notificado.');
    closeCriticalAlertModal();
}

// Export functions for global access
window.showPsychologicalAssessmentContent = showPsychologicalAssessmentContent;
window.switchPsychTab = switchPsychTab;
window.showNewAssessmentModal = showNewAssessmentModal;
window.closeNewAssessmentModal = closeNewAssessmentModal;
window.showCriticalAlertModal = showCriticalAlertModal;
window.closeCriticalAlertModal = closeCriticalAlertModal;
window.submitPsychologicalAssessment = submitPsychologicalAssessment;
window.acknowledgeAlert = acknowledgeAlert;
window.createEmergencyAssessment = createEmergencyAssessment;

console.log('✅ [PSYCHOLOGICAL-ASSESSMENT] Módulo completamente cargado y funcional');