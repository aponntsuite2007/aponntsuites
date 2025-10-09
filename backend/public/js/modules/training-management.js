// Training Management Module - v1.0 SISTEMA INTEGRAL DE CAPACITACIONES
console.log('📚 [TRAINING] Módulo integral de capacitaciones cargado');

// Global variables for training management
let allTrainings = [];
let allEvaluations = [];
let allIndependentEvaluations = []; // 🆕 Evaluaciones independientes (sin capacitación vinculada)
let employeeTrainings = [];

// LocalStorage keys for persistence (LEGACY - ahora usa API)
const STORAGE_KEYS = {
    TRAININGS: 'aponnt_trainings',
    EVALUATIONS: 'aponnt_evaluations',
    INDEPENDENT_EVALUATIONS: 'aponnt_independent_evaluations',
    EMPLOYEE_TRAININGS: 'aponnt_employee_trainings'
};

// ===============================================
// 🌐 FUNCIONES DE API REST (NUEVA IMPLEMENTACIÓN)
// ===============================================

// Helper: Get API base URL
function getApiUrl(endpoint) {
    if (typeof window.progressiveAdmin !== 'undefined' && window.progressiveAdmin.getApiUrl) {
        return window.progressiveAdmin.getApiUrl(endpoint);
    }
    return endpoint;
}

// GET - Obtener todas las capacitaciones
async function fetchTrainingsFromAPI() {
    try {
        console.log('🌐 [TRAINING-API] Cargando capacitaciones desde servidor...');
        const response = await fetch(getApiUrl('/api/v1/trainings'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ [TRAINING-API] Capacitaciones cargadas:', data.count);
        return data.trainings || [];
    } catch (error) {
        console.error('❌ [TRAINING-API] Error cargando capacitaciones:', error);
        showTrainingMessage('❌ Error cargando capacitaciones del servidor', 'error');
        return [];
    }
}

// POST - Crear nueva capacitación
async function createTrainingAPI(trainingData) {
    try {
        console.log('🌐 [TRAINING-API] Creando capacitación:', trainingData.title);
        const response = await fetch(getApiUrl('/api/v1/trainings'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(trainingData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ [TRAINING-API] Capacitación creada:', data.training.id);
        return data.training;
    } catch (error) {
        console.error('❌ [TRAINING-API] Error creando capacitación:', error);
        showTrainingMessage('❌ Error creando capacitación en el servidor', 'error');
        return null;
    }
}

// PUT - Actualizar capacitación existente
async function updateTrainingAPI(trainingId, trainingData) {
    try {
        console.log('🌐 [TRAINING-API] Actualizando capacitación:', trainingId);
        const response = await fetch(getApiUrl(`/api/v1/trainings/${trainingId}`), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(trainingData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ [TRAINING-API] Capacitación actualizada:', trainingId);
        return data.training;
    } catch (error) {
        console.error('❌ [TRAINING-API] Error actualizando capacitación:', error);
        showTrainingMessage('❌ Error actualizando capacitación en el servidor', 'error');
        return null;
    }
}

// DELETE - Eliminar capacitación
async function deleteTrainingAPI(trainingId) {
    try {
        console.log('🌐 [TRAINING-API] Eliminando capacitación:', trainingId);
        const response = await fetch(getApiUrl(`/api/v1/trainings/${trainingId}`), {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ [TRAINING-API] Capacitación eliminada:', trainingId);
        return true;
    } catch (error) {
        console.error('❌ [TRAINING-API] Error eliminando capacitación:', error);
        showTrainingMessage('❌ Error eliminando capacitación del servidor', 'error');
        return false;
    }
}

// GET - Obtener estadísticas de dashboard
async function fetchTrainingStatsAPI() {
    try {
        const response = await fetch(getApiUrl('/api/v1/trainings/stats/dashboard'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.stats || {};
    } catch (error) {
        console.error('❌ [TRAINING-API] Error cargando estadísticas:', error);
        return {};
    }
}

// ===============================================
// 💾 FUNCIONES DE PERSISTENCIA DE DATOS (LEGACY)
// ===============================================

// Guardar datos en localStorage
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`💾 [STORAGE] Datos guardados en ${key}:`, data.length || 'N/A', 'elementos');
    } catch (error) {
        console.error(`❌ [STORAGE] Error guardando en ${key}:`, error);
        showTrainingMessage('❌ Error guardando datos. Verifique el espacio de almacenamiento.', 'error');
    }
}

// Cargar datos de localStorage
function loadFromStorage(key, defaultValue = []) {
    try {
        const data = localStorage.getItem(key);
        if (data) {
            const parsed = JSON.parse(data);
            console.log(`📂 [STORAGE] Datos cargados de ${key}:`, parsed.length || 'N/A', 'elementos');
            return parsed;
        }
        return defaultValue;
    } catch (error) {
        console.error(`❌ [STORAGE] Error cargando de ${key}:`, error);
        return defaultValue;
    }
}

// Guardar todas las capacitaciones
function saveTrainingsToStorage() {
    saveToStorage(STORAGE_KEYS.TRAININGS, allTrainings);
}

// Cargar todas las capacitaciones
function loadTrainingsFromStorage() {
    allTrainings = loadFromStorage(STORAGE_KEYS.TRAININGS, []);
}

// Guardar todas las evaluaciones
function saveEvaluationsToStorage() {
    saveToStorage(STORAGE_KEYS.EVALUATIONS, allEvaluations);
}

// Cargar todas las evaluaciones
function loadEvaluationsFromStorage() {
    allEvaluations = loadFromStorage(STORAGE_KEYS.EVALUATIONS, []);
}

// Guardar evaluaciones independientes
function saveIndependentEvaluationsToStorage() {
    saveToStorage(STORAGE_KEYS.INDEPENDENT_EVALUATIONS, allIndependentEvaluations);
}

// Cargar evaluaciones independientes
function loadIndependentEvaluationsFromStorage() {
    allIndependentEvaluations = loadFromStorage(STORAGE_KEYS.INDEPENDENT_EVALUATIONS, []);
}

// Guardar datos de empleados
function saveEmployeeTrainingsToStorage() {
    saveToStorage(STORAGE_KEYS.EMPLOYEE_TRAININGS, employeeTrainings);
}

// Cargar datos de empleados
function loadEmployeeTrainingsFromStorage() {
    employeeTrainings = loadFromStorage(STORAGE_KEYS.EMPLOYEE_TRAININGS, []);
}

// Cargar todos los datos del módulo
function loadAllTrainingData() {
    console.log('📚 [TRAINING] Cargando todos los datos del módulo');
    loadTrainingsFromStorage();
    loadEvaluationsFromStorage();
    loadIndependentEvaluationsFromStorage();
    loadEmployeeTrainingsFromStorage();
    
    // Si no hay datos, inicializar con datos de demostración
    if (allTrainings.length === 0) {
        console.log('🔄 [TRAINING] Inicializando datos de demostración');
        initializeTrainingDemo();
    }
    if (allIndependentEvaluations.length === 0) {
        console.log('🔄 [TRAINING] Inicializando evaluaciones independientes de demostración');
        initializeIndependentEvaluationsDemo();
    }
}

// Guardar todos los datos del módulo
function saveAllTrainingData() {
    console.log('💾 [TRAINING] Guardando todos los datos del módulo');
    saveTrainingsToStorage();
    saveEvaluationsToStorage();
    saveIndependentEvaluationsToStorage();
    saveEmployeeTrainingsToStorage();
}

// Limpiar todos los datos del módulo
function clearAllTrainingData() {
    if (confirm('⚠️ ¿Está seguro de eliminar TODOS los datos de capacitaciones? Esta acción NO se puede deshacer.')) {
        localStorage.removeItem(STORAGE_KEYS.TRAININGS);
        localStorage.removeItem(STORAGE_KEYS.EVALUATIONS);
        localStorage.removeItem(STORAGE_KEYS.INDEPENDENT_EVALUATIONS);
        localStorage.removeItem(STORAGE_KEYS.EMPLOYEE_TRAININGS);
        
        allTrainings = [];
        allEvaluations = [];
        allIndependentEvaluations = [];
        employeeTrainings = [];
        
        showTrainingMessage('🗑️ Todos los datos de capacitaciones han sido eliminados', 'success');
        
        // Recargar la vista actual
        const activeView = document.querySelector('.training-nav-btn.active')?.getAttribute('data-view') || 'dashboard';
        switchTrainingView(activeView);
    }
}

// Exportar datos como JSON
function exportTrainingData() {
    const exportData = {
        trainings: allTrainings,
        evaluations: allEvaluations,
        independentEvaluations: allIndependentEvaluations,
        employeeTrainings: employeeTrainings,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aponnt_capacitaciones_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showTrainingMessage('📤 Datos exportados exitosamente', 'success');
}

// Importar datos desde JSON
function importTrainingData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            if (confirm('⚠️ ¿Desea reemplazar todos los datos actuales con los datos importados?')) {
                allTrainings = importData.trainings || [];
                allEvaluations = importData.evaluations || [];
                allIndependentEvaluations = importData.independentEvaluations || [];
                employeeTrainings = importData.employeeTrainings || [];
                
                saveAllTrainingData();
                
                showTrainingMessage('📥 Datos importados exitosamente', 'success');
                
                // Recargar la vista actual
                const activeView = document.querySelector('.training-nav-btn.active')?.getAttribute('data-view') || 'dashboard';
                switchTrainingView(activeView);
            }
        } catch (error) {
            console.error('❌ [IMPORT] Error importando datos:', error);
            showTrainingMessage('❌ Error importando datos. Verifique que el archivo sea válido.', 'error');
        }
    };
    reader.readAsText(file);
}

let trainingCategories = [
    { id: 'safety', name: 'Seguridad Laboral', color: '#dc3545', icon: '🛡️' },
    { id: 'technical', name: 'Técnicas', color: '#007bff', icon: '🔧' },
    { id: 'soft_skills', name: 'Habilidades Blandas', color: '#28a745', icon: '🤝' },
    { id: 'compliance', name: 'Cumplimiento Legal', color: '#6f42c1', icon: '⚖️' },
    { id: 'leadership', name: 'Liderazgo', color: '#fd7e14', icon: '👑' },
    { id: 'quality', name: 'Calidad', color: '#20c997', icon: '⭐' }
];

// Training states
const TrainingStatus = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    EXPIRED: 'expired',
    SUSPENDED: 'suspended'
};

// Training types
const TrainingTypes = {
    PRESENTIAL: 'presential',
    VIRTUAL: 'virtual',
    VIDEO: 'video',
    PDF: 'pdf',
    EXTERNAL_LINK: 'external_link',
    MIXED: 'mixed'
};

// Evaluation types
const EvaluationTypes = {
    MULTIPLE_CHOICE: 'multiple_choice',
    TRUE_FALSE: 'true_false',
    TEXT: 'text',
    PRACTICAL: 'practical'
};

// Employee training progress
const EmployeeTrainingStatus = {
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    APPROVED: 'approved',
    FAILED: 'failed',
    EXPIRED: 'expired'
};

// Main function - Sistema de Capacitaciones
function showTrainingManagementContent() {
    console.log('📚 [TRAINING] Ejecutando showTrainingManagementContent()');
    
    const content = document.getElementById('mainContent');
    if (!content) {
        console.error('❌ [TRAINING] mainContent no encontrado');
        return;
    }
    
    content.innerHTML = `
        <div class="tab-content active" id="training-management">
            <div class="card">
                <div class="training-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; font-size: 28px;">📚 Sistema Integral de Capacitaciones</h2>
                            <p style="margin: 5px 0 0 0; opacity: 0.9;">Gestión completa de capacitaciones, evaluaciones y desarrollo profesional</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 14px; opacity: 0.9;">📊 Total capacitaciones: <span id="total-trainings">0</span></div>
                            <div style="font-size: 12px; opacity: 0.8;">👥 Empleados participando: <span id="active-participants">0</span></div>
                        </div>
                    </div>
                </div>
                
                <!-- Navigation tabs -->
                <div class="training-nav" style="display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto;">
                    <button class="training-nav-btn active" onclick="switchTrainingView('dashboard')" data-view="dashboard">
                        📊 Dashboard
                    </button>
                    <button class="training-nav-btn" onclick="switchTrainingView('trainings')" data-view="trainings">
                        📚 Capacitaciones
                    </button>
                    <button class="training-nav-btn" onclick="switchTrainingView('evaluations')" data-view="evaluations">
                        📋 Evaluaciones (Capacitaciones)
                    </button>
                    <button class="training-nav-btn" onclick="switchTrainingView('independent-evaluations')" data-view="independent-evaluations">
                        🎯 Evaluaciones Independientes
                    </button>
                    <button class="training-nav-btn" onclick="switchTrainingView('employees')" data-view="employees">
                        👥 Seguimiento Empleados
                    </button>
                    <button class="training-nav-btn" onclick="switchTrainingView('reports')" data-view="reports">
                        📈 Reportes
                    </button>
                    <button class="training-nav-btn" onclick="switchTrainingView('calendar')" data-view="calendar">
                        📅 Calendario
                    </button>
                </div>
                
                <!-- Main content area -->
                <div id="training-content-area">
                    <!-- Content will be loaded here -->
                </div>
            </div>
        </div>
        
        <!-- Training Creation Modal -->
        <div id="trainingModal" class="modal" style="display: none;">
            <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3 id="trainingModalTitle">📚 Nueva Capacitación</h3>
                    <button onclick="closeModal('trainingModal')" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="trainingForm" onsubmit="saveTraining(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Título *</label>
                                <input type="text" id="training-title" required placeholder="Título de la capacitación">
                            </div>
                            <div class="form-group">
                                <label>Categoría *</label>
                                <select id="training-category" required>
                                    <option value="">Seleccionar categoría...</option>
                                    ${trainingCategories.map(cat => 
                                        `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Descripción</label>
                            <textarea id="training-description" placeholder="Descripción detallada de la capacitación" rows="3"></textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Tipo *</label>
                                <select id="training-type" required onchange="toggleTypeFields()">
                                    <option value="">Seleccionar tipo...</option>
                                    <option value="presential">🏢 Presencial</option>
                                    <option value="virtual">💻 Virtual</option>
                                    <option value="video">🎥 Video</option>
                                    <option value="pdf">📄 PDF</option>
                                    <option value="external_link">🔗 Enlace Externo</option>
                                    <option value="mixed">🔄 Mixto</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Duración (horas)</label>
                                <input type="number" id="training-duration" step="0.5" min="0.5" placeholder="2.5">
                            </div>
                        </div>
                        
                        <!-- Dynamic fields based on type -->
                        <div id="type-specific-fields"></div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Fecha inicio</label>
                                <input type="datetime-local" id="training-start-date">
                            </div>
                            <div class="form-group">
                                <label>Fecha límite</label>
                                <input type="datetime-local" id="training-deadline">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Instructor/Facilitador</label>
                                <input type="text" id="training-instructor" placeholder="Nombre del instructor">
                            </div>
                            <div class="form-group">
                                <label>Puntaje máximo</label>
                                <input type="number" id="training-max-score" value="100" min="1">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Puntaje mínimo aprobación</label>
                                <input type="number" id="training-min-score" value="70" min="1">
                            </div>
                            <div class="form-group">
                                <label>Intentos permitidos</label>
                                <input type="number" id="training-attempts" value="2" min="1">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Asignación</label>
                            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                                <label style="display: flex; align-items: center; gap: 5px;">
                                    <input type="radio" name="assignment-type" value="all" checked onchange="toggleAssignmentFields()">
                                    Todos los empleados
                                </label>
                                <label style="display: flex; align-items: center; gap: 5px;">
                                    <input type="radio" name="assignment-type" value="department" onchange="toggleAssignmentFields()">
                                    Por departamento
                                </label>
                                <label style="display: flex; align-items: center; gap: 5px;">
                                    <input type="radio" name="assignment-type" value="specific" onchange="toggleAssignmentFields()">
                                    Empleados específicos
                                </label>
                            </div>
                            <div id="assignment-fields" style="display: none;"></div>
                        </div>
                        
                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" id="training-mandatory">
                                Capacitación obligatoria
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" id="training-certificate">
                                Generar certificado al completar
                            </label>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" onclick="closeModal('trainingModal')" class="btn btn-secondary">Cancelar</button>
                            <button type="button" onclick="saveTraining(event, 'draft')" class="btn btn-warning">Guardar como Borrador</button>
                            <button type="submit" class="btn btn-primary">Crear y Activar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <!-- Evaluation Modal -->
        <div id="evaluationModal" class="modal" style="display: none;">
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>📋 Crear Evaluación</h3>
                    <button onclick="closeModal('evaluationModal')" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="evaluationForm" onsubmit="saveEvaluation(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Capacitación *</label>
                                <select id="eval-training" required>
                                    <option value="">Seleccionar capacitación...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Título de la evaluación *</label>
                                <input type="text" id="eval-title" required placeholder="Evaluación final">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Instrucciones</label>
                            <textarea id="eval-instructions" placeholder="Instrucciones para la evaluación" rows="2"></textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Tiempo límite (minutos)</label>
                                <input type="number" id="eval-time-limit" value="60" min="5">
                            </div>
                            <div class="form-group">
                                <label>Preguntas aleatorias</label>
                                <input type="checkbox" id="eval-randomize">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <h4>Preguntas</h4>
                            <div id="questions-container">
                                <!-- Questions will be added here -->
                            </div>
                            <button type="button" onclick="addQuestion()" class="btn btn-info">➕ Agregar Pregunta</button>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" onclick="closeModal('evaluationModal')" class="btn btn-secondary">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Crear Evaluación</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <!-- Employee Progress Modal -->
        <div id="employeeProgressModal" class="modal" style="display: none;">
            <div class="modal-content" style="max-width: 1000px;">
                <div class="modal-header">
                    <h3>👤 Progreso del Empleado</h3>
                    <button onclick="closeModal('employeeProgressModal')" class="close-btn">&times;</button>
                </div>
                <div class="modal-body" id="employee-progress-content">
                    <!-- Employee progress content -->
                </div>
            </div>
        </div>
    `;
    
    // Add custom styles
    addTrainingStyles();
    
    // Initialize with dashboard view
    switchTrainingView('dashboard');
    
    // Load initial data
    loadTrainingData();
}

// Add custom styles for training module
function addTrainingStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .training-nav-btn {
            padding: 10px 15px;
            border: 2px solid #dee2e6;
            background: white;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
            white-space: nowrap;
            font-weight: 500;
        }
        
        .training-nav-btn:hover {
            border-color: #667eea;
            color: #667eea;
        }
        
        .training-nav-btn.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-color: #667eea;
        }
        
        .training-card {
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            transition: all 0.3s;
            background: white;
        }
        
        .training-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        
        .training-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .status-active { background: #d4edda; color: #155724; }
        .status-draft { background: #fff3cd; color: #856404; }
        .status-completed { background: #d1ecf1; color: #0c5460; }
        .status-expired { background: #f8d7da; color: #721c24; }
        .status-suspended { background: #e2e3e5; color: #383d41; }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            transition: width 0.3s;
        }
        
        .stat-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border: 1px solid #dee2e6;
            transition: all 0.3s;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .question-item {
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 10px;
            background: #f8f9fa;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        @media (max-width: 768px) {
            .form-row {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(style);
}

// Switch between different training views
function switchTrainingView(view) {
    console.log('📚 [TRAINING] Cambiando a vista:', view);
    
    // Update nav buttons
    document.querySelectorAll('.training-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    
    // Load content based on view
    const contentArea = document.getElementById('training-content-area');
    
    switch (view) {
        case 'dashboard':
            showTrainingDashboard();
            break;
        case 'trainings':
            showTrainingsManagement();
            break;
        case 'evaluations':
            showEvaluationsManagement();
            break;
        case 'independent-evaluations':
            showIndependentEvaluationsManagement();
            break;
        case 'employees':
            showEmployeeTracking();
            break;
        case 'reports':
            showTrainingReports();
            break;
        case 'calendar':
            showTrainingCalendar();
            break;
        default:
            showTrainingDashboard();
    }
}

// Dashboard view
function showTrainingDashboard() {
    const contentArea = document.getElementById('training-content-area');
    
    contentArea.innerHTML = `
        <!-- Statistics cards -->
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div class="stat-card" style="border-left: 4px solid #667eea;">
                <div style="font-size: 2em; margin-bottom: 10px;">📚</div>
                <div style="font-size: 2em; font-weight: bold; color: #667eea;" id="dash-total-trainings">--</div>
                <div style="color: #6c757d;">Total Capacitaciones</div>
            </div>
            
            <div class="stat-card" style="border-left: 4px solid #28a745;">
                <div style="font-size: 2em; margin-bottom: 10px;">✅</div>
                <div style="font-size: 2em; font-weight: bold; color: #28a745;" id="dash-completed-trainings">--</div>
                <div style="color: #6c757d;">Completadas</div>
            </div>
            
            <div class="stat-card" style="border-left: 4px solid #ffc107;">
                <div style="font-size: 2em; margin-bottom: 10px;">⏳</div>
                <div style="font-size: 2em; font-weight: bold; color: #ffc107;" id="dash-pending-trainings">--</div>
                <div style="color: #6c757d;">En Progreso</div>
            </div>
            
            <div class="stat-card" style="border-left: 4px solid #dc3545;">
                <div style="font-size: 2em; margin-bottom: 10px;">🔔</div>
                <div style="font-size: 2em; font-weight: bold; color: #dc3545;" id="dash-overdue-trainings">--</div>
                <div style="color: #6c757d;">Vencidas</div>
            </div>
        </div>
        
        <!-- Recent activity and quick actions -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
            <!-- Recent trainings -->
            <div class="card">
                <h3>📋 Capacitaciones Recientes</h3>
                <div id="recent-trainings-list">
                    <div style="padding: 20px; text-align: center; color: #6c757d;">
                        Cargando capacitaciones recientes...
                    </div>
                </div>
            </div>
            
            <!-- Quick actions -->
            <div class="card">
                <h3>⚡ Acciones Rápidas</h3>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button onclick="showModal('trainingModal')" class="btn btn-primary">
                        ➕ Nueva Capacitación
                    </button>
                    <button onclick="showModal('evaluationModal')" class="btn btn-info">
                        📋 Nueva Evaluación
                    </button>
                    <button onclick="sendTrainingReminders()" class="btn btn-warning">
                        📢 Enviar Recordatorios
                    </button>
                    <button onclick="generateComplianceReport()" class="btn btn-success">
                        📊 Reporte Cumplimiento
                    </button>
                </div>
                
                <h4 style="margin-top: 20px;">📅 Próximos Vencimientos</h4>
                <div id="upcoming-deadlines">
                    <div style="padding: 20px; text-align: center; color: #6c757d; font-size: 14px;">
                        Cargando próximos vencimientos...
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Progress by category -->
        <div class="card" style="margin-top: 30px;">
            <h3>📊 Progreso por Categoría</h3>
            <div id="category-progress" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                <!-- Category progress will be loaded here -->
            </div>
        </div>
        
        <!-- Data Management Section -->
        <div class="card" style="margin-top: 30px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);">
            <h3 style="color: #495057; display: flex; align-items: center; gap: 10px;">
                💾 Administración de Datos
            </h3>
            <p style="color: #6c757d; margin-bottom: 20px;">
                Gestione la persistencia y respaldo de todos los datos del módulo de capacitaciones
            </p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <button onclick="saveAllTrainingData()" class="btn btn-primary" title="Guardar todos los datos en localStorage">
                    💾 Guardar Datos
                </button>
                <button onclick="exportTrainingData()" class="btn btn-info" title="Exportar datos como archivo JSON">
                    📤 Exportar Datos
                </button>
                <label class="btn btn-success" style="cursor: pointer; display: inline-block; text-align: center;" title="Importar datos desde archivo JSON">
                    📥 Importar Datos
                    <input type="file" accept=".json" onchange="importTrainingData(this.files[0])" style="display: none;">
                </label>
                <button onclick="clearAllTrainingData()" class="btn btn-danger" title="Eliminar todos los datos permanentemente">
                    🗑️ Limpiar Todo
                </button>
            </div>
            
            <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 5px; border-left: 4px solid #17a2b8;">
                <small style="color: #495057;">
                    <strong>💡 Información:</strong><br>
                    • Los datos se guardan automáticamente en localStorage<br>
                    • Use "Exportar" para crear respaldos<br>
                    • "Importar" reemplazará todos los datos actuales<br>
                    • "Limpiar Todo" eliminará permanentemente todos los datos
                </small>
            </div>
        </div>
    `;
    
    // Load dashboard data
    loadDashboardData();
}

// Trainings management view
function showTrainingsManagement() {
    const contentArea = document.getElementById('training-content-area');
    
    contentArea.innerHTML = `
        <!-- Filters and search -->
        <div class="card" style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                <h3>🔍 Filtros de Búsqueda</h3>
                <button onclick="showModal('trainingModal')" class="btn btn-primary">
                    ➕ Nueva Capacitación
                </button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div>
                    <label>🔍 Buscar:</label>
                    <input type="text" id="training-search" placeholder="Buscar capacitaciones..." onkeyup="filterTrainings()">
                </div>
                <div>
                    <label>📂 Categoría:</label>
                    <select id="category-filter" onchange="filterTrainings()">
                        <option value="">Todas las categorías</option>
                        ${trainingCategories.map(cat => 
                            `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`
                        ).join('')}
                    </select>
                </div>
                <div>
                    <label>🔄 Estado:</label>
                    <select id="status-filter" onchange="filterTrainings()">
                        <option value="">Todos los estados</option>
                        <option value="active">🟢 Activo</option>
                        <option value="draft">🟡 Borrador</option>
                        <option value="completed">🔵 Completado</option>
                        <option value="expired">🔴 Vencido</option>
                        <option value="suspended">⚪ Suspendido</option>
                    </select>
                </div>
                <div>
                    <label>📅 Tipo:</label>
                    <select id="type-filter" onchange="filterTrainings()">
                        <option value="">Todos los tipos</option>
                        <option value="presential">🏢 Presencial</option>
                        <option value="virtual">💻 Virtual</option>
                        <option value="video">🎥 Video</option>
                        <option value="pdf">📄 PDF</option>
                        <option value="external_link">🔗 Enlace</option>
                    </select>
                </div>
            </div>
        </div>
        
        <!-- Trainings list -->
        <div class="card">
            <h3>📚 Lista de Capacitaciones</h3>
            <div id="trainings-list">
                <div style="padding: 40px; text-align: center; color: #6c757d;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📚</div>
                    <div>Cargando capacitaciones...</div>
                </div>
            </div>
        </div>
    `;
    
    // Load trainings data
    loadTrainingsList();
}

// Load initial training data
async function loadTrainingData() {
    console.log('📚 [TRAINING] Cargando datos iniciales de capacitaciones');

    // Cargar datos desde API REST
    allTrainings = await fetchTrainingsFromAPI();

    // Actualizar contadores y vistas
    updateTrainingCounters();

    // Si no hay capacitaciones, mostrar mensaje de bienvenida
    if (allTrainings.length === 0) {
        console.log('ℹ️ [TRAINING] No hay capacitaciones. Base de datos vacía.');
    }
}

// Inicializar datos de demostración para capacitaciones
function initializeTrainingDemo() {
    // Mock data for demonstration
    allTrainings = [
        {
            id: 1,
            title: 'Seguridad Industrial Básica',
            category: 'safety',
            type: 'mixed',
            status: 'active',
            description: 'Capacitación fundamental sobre seguridad en el lugar de trabajo',
            instructor: 'Ing. María González',
            duration: 4,
            startDate: new Date(Date.now() + 24*60*60*1000),
            deadline: new Date(Date.now() + 7*24*60*60*1000),
            maxScore: 100,
            minScore: 80,
            attempts: 2,
            mandatory: true,
            certificate: true,
            participants: 45,
            completed: 23,
            progress: 51
        },
        {
            id: 2,
            title: 'Liderazgo Efectivo',
            category: 'leadership',
            type: 'virtual',
            status: 'active',
            description: 'Desarrollo de habilidades de liderazgo para supervisores',
            instructor: 'Lic. Carlos Mendez',
            duration: 6,
            startDate: new Date(Date.now() - 5*24*60*60*1000),
            deadline: new Date(Date.now() + 10*24*60*60*1000),
            maxScore: 100,
            minScore: 75,
            attempts: 3,
            mandatory: false,
            certificate: true,
            participants: 12,
            completed: 8,
            progress: 67
        },
        {
            id: 3,
            title: 'Primeros Auxilios',
            category: 'safety',
            type: 'presential',
            status: 'completed',
            description: 'Capacitación práctica en primeros auxilios',
            instructor: 'Dr. Ana Ruiz',
            duration: 8,
            startDate: new Date(Date.now() - 30*24*60*60*1000),
            deadline: new Date(Date.now() - 23*24*60*60*1000),
            maxScore: 100,
            minScore: 85,
            attempts: 1,
            mandatory: true,
            certificate: true,
            participants: 60,
            completed: 58,
            progress: 97
        }
    ];
    
    // Update counters
    updateTrainingCounters();
}

// Update training counters in header
function updateTrainingCounters() {
    const totalElement = document.getElementById('total-trainings');
    const participantsElement = document.getElementById('active-participants');
    
    if (totalElement) {
        totalElement.textContent = allTrainings.length;
    }
    
    if (participantsElement) {
        const totalParticipants = allTrainings.reduce((sum, training) => sum + training.participants, 0);
        participantsElement.textContent = totalParticipants;
    }
}

// Load dashboard data
function loadDashboardData() {
    // Update statistics
    const totalTrainings = allTrainings.length;
    const completedTrainings = allTrainings.filter(t => t.status === 'completed').length;
    const activeTrainings = allTrainings.filter(t => t.status === 'active').length;
    const overdueTrainings = allTrainings.filter(t => 
        t.status === 'active' && new Date(t.deadline) < new Date()
    ).length;
    
    // ✅ Validar que elementos existan antes de actualizar
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`⚠️ [TRAINING] Elemento ${id} no encontrado`);
        }
    };

    updateElement('dash-total-trainings', totalTrainings);
    updateElement('dash-completed-trainings', completedTrainings);
    updateElement('dash-pending-trainings', activeTrainings);
    updateElement('dash-overdue-trainings', overdueTrainings);
    
    // Load recent trainings
    loadRecentTrainings();
    
    // Load upcoming deadlines
    loadUpcomingDeadlines();
    
    // Load category progress
    loadCategoryProgress();
}

// Load recent trainings
function loadRecentTrainings() {
    const container = document.getElementById('recent-trainings-list');
    if (!container) return;
    
    const recentTrainings = allTrainings
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
        .slice(0, 5);
    
    if (recentTrainings.length === 0) {
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #6c757d;">
                📚 No hay capacitaciones recientes
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentTrainings.map(training => {
        const category = trainingCategories.find(c => c.id === training.category);
        const statusClass = `status-${training.status}`;
        
        return `
            <div class="training-card">
                <div style="display: flex; justify-content: between; align-items: flex-start; margin-bottom: 10px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                            <span style="font-size: 1.2em;">${category ? category.icon : '📚'}</span>
                            <h4 style="margin: 0; color: #333;">${training.title}</h4>
                        </div>
                        <p style="margin: 0; color: #6c757d; font-size: 14px;">${training.description}</p>
                    </div>
                    <span class="training-status ${statusClass}">
                        ${training.status === 'active' ? 'Activo' : 
                          training.status === 'completed' ? 'Completado' : 
                          training.status === 'draft' ? 'Borrador' : 'Vencido'}
                    </span>
                </div>
                
                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                    <div style="font-size: 12px; color: #6c757d;">
                        👤 ${training.instructor} • ⏱️ ${training.duration}h • 👥 ${training.participants} participantes
                    </div>
                    <div style="font-size: 12px; color: #6c757d;">
                        📅 ${new Date(training.deadline).toLocaleDateString()}
                    </div>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 3px;">
                        <span style="font-size: 12px; color: #6c757d;">Progreso</span>
                        <span style="font-size: 12px; font-weight: bold;">${training.progress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${training.progress}%"></div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="viewTrainingDetails(${training.id})" class="btn btn-sm btn-info">
                        👁️ Ver
                    </button>
                    <button onclick="editTraining(${training.id})" class="btn btn-sm btn-primary">
                        ✏️ Editar
                    </button>
                    <button onclick="viewTrainingParticipants(${training.id})" class="btn btn-sm btn-success">
                        👥 Participantes
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Load upcoming deadlines
function loadUpcomingDeadlines() {
    const container = document.getElementById('upcoming-deadlines');
    if (!container) return;
    
    const upcoming = allTrainings
        .filter(t => t.status === 'active' && new Date(t.deadline) > new Date())
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5);
    
    if (upcoming.length === 0) {
        container.innerHTML = `
            <div style="padding: 15px; text-align: center; color: #6c757d; font-size: 12px;">
                📅 No hay vencimientos próximos
            </div>
        `;
        return;
    }
    
    container.innerHTML = upcoming.map(training => {
        const daysUntilDeadline = Math.ceil((new Date(training.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        const urgencyClass = daysUntilDeadline <= 3 ? 'text-danger' : daysUntilDeadline <= 7 ? 'text-warning' : 'text-info';
        
        return `
            <div style="padding: 8px 12px; border-left: 3px solid ${daysUntilDeadline <= 3 ? '#dc3545' : daysUntilDeadline <= 7 ? '#ffc107' : '#17a2b8'}; margin-bottom: 8px; background: #f8f9fa; border-radius: 0 4px 4px 0;">
                <div style="font-weight: 600; font-size: 13px; color: #333;">${training.title}</div>
                <div style="font-size: 11px; color: #6c757d;">
                    📅 ${new Date(training.deadline).toLocaleDateString()}
                    <span class="${urgencyClass}" style="font-weight: bold; margin-left: 5px;">
                        (${daysUntilDeadline} día${daysUntilDeadline !== 1 ? 's' : ''})
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

// Load category progress
function loadCategoryProgress() {
    const container = document.getElementById('category-progress');
    if (!container) return;
    
    const categoryStats = trainingCategories.map(category => {
        const categoryTrainings = allTrainings.filter(t => t.category === category.id);
        const totalParticipants = categoryTrainings.reduce((sum, t) => sum + t.participants, 0);
        const totalCompleted = categoryTrainings.reduce((sum, t) => sum + t.completed, 0);
        const averageProgress = totalParticipants > 0 ? Math.round((totalCompleted / totalParticipants) * 100) : 0;
        
        return {
            ...category,
            trainings: categoryTrainings.length,
            participants: totalParticipants,
            completed: totalCompleted,
            progress: averageProgress
        };
    });
    
    container.innerHTML = categoryStats.map(cat => `
        <div class="stat-card" style="border-left: 4px solid ${cat.color};">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                <span style="font-size: 2em; margin-right: 10px;">${cat.icon}</span>
                <div style="text-align: left;">
                    <div style="font-weight: bold; color: ${cat.color};">${cat.name}</div>
                    <div style="font-size: 12px; color: #6c757d;">${cat.trainings} capacitacion${cat.trainings !== 1 ? 'es' : ''}</div>
                </div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: between; margin-bottom: 3px;">
                    <span style="font-size: 12px;">Progreso</span>
                    <span style="font-size: 12px; font-weight: bold;">${cat.progress}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${cat.progress}%; background: ${cat.color};"></div>
                </div>
            </div>
            
            <div style="display: flex; justify-content: between; font-size: 11px; color: #6c757d;">
                <span>👥 ${cat.participants}</span>
                <span>✅ ${cat.completed}</span>
            </div>
        </div>
    `).join('');
}

// Show modal function
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Focus first input
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

// Close modal function
function closeModal(modalId) {
    console.log(`🔄 [TRAINING] Cerrando modal: ${modalId}`);
    
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        
        // Restaurar scroll del body
        document.body.style.overflow = 'auto';
        document.body.style.position = 'static';
        document.documentElement.style.overflow = 'auto';
        
        // Reset form if exists
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
        
        // Remover cualquier overlay residual
        const overlays = document.querySelectorAll('.modal-overlay');
        overlays.forEach(overlay => {
            if (overlay.style.display !== 'none') {
                overlay.style.display = 'none';
            }
        });
        
        console.log(`✅ [TRAINING] Modal ${modalId} cerrado correctamente`);
    } else {
        console.warn(`⚠️ [TRAINING] Modal ${modalId} no encontrado`);
        
        // Forzar restauración del scroll como fallback
        document.body.style.overflow = 'auto';
        document.body.style.position = 'static';
        document.documentElement.style.overflow = 'auto';
    }
}

// Save training
async function saveTraining(event, status = 'active') {
    event.preventDefault();

    const form = document.getElementById('trainingForm');
    const editId = form.getAttribute('data-edit-id');
    const isEditing = editId && editId !== 'null';

    const formData = {
        title: document.getElementById('training-title').value,
        category: document.getElementById('training-category').value,
        description: document.getElementById('training-description').value,
        type: document.getElementById('training-type').value,
        duration: parseFloat(document.getElementById('training-duration').value) || 1,
        startDate: document.getElementById('training-start-date').value,
        deadline: document.getElementById('training-deadline').value,
        instructor: document.getElementById('training-instructor').value,
        maxScore: parseInt(document.getElementById('training-max-score').value) || 100,
        minScore: parseInt(document.getElementById('training-min-score').value) || 70,
        attempts: parseInt(document.getElementById('training-attempts').value) || 2,
        mandatory: document.getElementById('training-mandatory').checked,
        certificate: document.getElementById('training-certificate').checked,
        status: isEditing ? undefined : status
    };

    // Validate required fields
    if (!formData.title || !formData.category || !formData.type) {
        showTrainingMessage('❌ Complete los campos obligatorios', 'error');
        return;
    }

    if (isEditing) {
        // Update existing training via API
        const updatedTraining = await updateTrainingAPI(editId, formData);

        if (updatedTraining) {
            // Update local array
            const trainingIndex = allTrainings.findIndex(t => t.id == editId);
            if (trainingIndex > -1) {
                allTrainings[trainingIndex] = updatedTraining;
            }

            // Clear edit state
            form.removeAttribute('data-edit-id');
            document.getElementById('trainingModalTitle').textContent = '📚 Nueva Capacitación';

            closeModal('trainingModal');
            showTrainingMessage('✅ Capacitación actualizada exitosamente', 'success');
        }
    } else {
        // Create new training via API
        const newTraining = await createTrainingAPI(formData);

        if (newTraining) {
            // Add to local array
            allTrainings.push(newTraining);

            // Send notifications if active
            if (status === 'active') {
                sendTrainingAssignmentNotifications(newTraining);
                updateEmployeeScoringForTraining(newTraining);
            }

            closeModal('trainingModal');
            showTrainingMessage('✅ Capacitación creada exitosamente', 'success');
        }
    }

    // Refresh current view
    const activeView = document.querySelector('.training-nav-btn.active')?.getAttribute('data-view') || 'trainings';
    switchTrainingView(activeView);

    // Update counters
    updateTrainingCounters();
}

// Send training assignment notifications
function sendTrainingAssignmentNotifications(training) {
    console.log('📱 [TRAINING-NOTIFICATIONS] Enviando notificaciones de asignación:', training.title);
    
    // Integration with existing notification system
    if (typeof addNotificationToQueue === 'function') {
        const notification = {
            id: `TRAIN-${training.id}-${Date.now()}`,
            type: 'training_assignment',
            priority: training.mandatory ? 'high' : 'medium',
            title: `📚 Nueva Capacitación Asignada: ${training.title}`,
            message: `Se le ha asignado la capacitación "${training.title}". ${training.mandatory ? 'Esta capacitación es OBLIGATORIA.' : ''} Fecha límite: ${new Date(training.deadline).toLocaleDateString()}`,
            recipients: ['all'], // Will be filtered by assignment rules
            status: 'pending',
            createdAt: new Date(),
            trainingId: training.id,
            attachments: training.type === 'pdf' ? [training.contentUrl] : [],
            links: training.type === 'external_link' ? [training.contentUrl] : []
        };
        
        addNotificationToQueue(notification);
        
        // Schedule reminder notifications
        scheduleTrainingReminders(training);
    }
}

// Schedule training reminders
function scheduleTrainingReminders(training) {
    const deadline = new Date(training.deadline);
    const now = new Date();
    
    // Schedule reminders at 7 days, 3 days, and 1 day before deadline
    const reminderDays = [7, 3, 1];
    
    reminderDays.forEach(days => {
        const reminderDate = new Date(deadline.getTime() - (days * 24 * 60 * 60 * 1000));
        
        if (reminderDate > now) {
            console.log(`📅 [TRAINING-REMINDERS] Programando recordatorio para ${days} días antes:`, training.title);
            
            // In a real implementation, this would be scheduled in the backend
            // For now, we'll just log the scheduled reminder
            setTimeout(() => {
                if (typeof addNotificationToQueue === 'function') {
                    const reminderNotification = {
                        id: `REMIND-${training.id}-${days}D-${Date.now()}`,
                        type: 'training_reminder',
                        priority: days <= 1 ? 'urgent' : days <= 3 ? 'high' : 'medium',
                        title: `⏰ Recordatorio: ${training.title}`,
                        message: `Recordatorio: Tiene ${days} día${days !== 1 ? 's' : ''} para completar la capacitación "${training.title}". ${training.mandatory ? '¡Es obligatoria!' : ''}`,
                        recipients: ['assigned_employees'],
                        status: 'pending',
                        createdAt: new Date(),
                        trainingId: training.id
                    };
                    
                    addNotificationToQueue(reminderNotification);
                }
            }, reminderDate.getTime() - now.getTime());
        }
    });
}

// Update employee scoring for training
function updateEmployeeScoringForTraining(training) {
    console.log('⭐ [TRAINING-SCORING] Actualizando scoring por nueva capacitación:', training.title);

    // Integration with existing scoring system
    if (typeof window.updateEmployeeScoreForTraining === 'function') {
        // Simular asignación a empleados - en producción esto sería dinámico
        const mockEmployeeIds = [1, 2, 3, 4, 5]; // IDs de ejemplo

        mockEmployeeIds.forEach(employeeId => {
            const scoringData = {
                trainingId: training.id,
                title: training.title,
                status: 'assigned',
                assignedDate: new Date().toISOString(),
                deadline: training.deadline,
                mandatory: training.mandatory,
                category: training.category,
                type: training.type
            };
            
            // Actualizar el scoring del empleado
            window.updateEmployeeScoreForTraining(employeeId, scoringData);
        });
        
        console.log('⭐ [TRAINING-SCORING] Scoring actualizado para', mockEmployeeIds.length, 'empleados');
    } else {
        console.log('⚠️ [TRAINING-SCORING] Sistema de scoring no disponible');
    }

    // 🚨 INTEGRACIÓN CON SANCIONES - Si el empleado no completa capacitaciones
    checkTrainingComplianceForSanctions(training);
}

// Function to update scoring when training is completed
function updateScoringOnTrainingCompletion(employeeId, training, score, passed) {
    console.log('🎓 [TRAINING-COMPLETION] Actualizando scoring por completar capacitación:', training.title);
    
    if (typeof window.updateEmployeeScoreForTraining === 'function') {
        const completionData = {
            trainingId: training.id,
            title: training.title,
            status: passed ? 'completed' : 'failed',
            completedDate: new Date().toISOString(),
            deadline: training.deadline,
            score: score,
            passed: passed,
            certificateIssued: passed && training.certificate,
            mandatory: training.mandatory,
            category: training.category,
            type: training.type
        };
        
        window.updateEmployeeScoreForTraining(employeeId, completionData);
        
        // Enviar notificación de resultado
        if (typeof addNotificationToQueue === 'function') {
            const resultNotification = {
                id: `RESULT-${training.id}-${employeeId}-${Date.now()}`,
                type: passed ? 'training_completed' : 'training_failed',
                priority: passed ? 'medium' : 'high',
                title: `${passed ? '✅ Capacitación Completada' : '❌ Capacitación Reprobada'}: ${training.title}`,
                message: passed ? 
                    `¡Felicitaciones! Ha completado exitosamente la capacitación "${training.title}" con una calificación de ${score}%. ${training.certificate ? 'Su certificado estará disponible pronto.' : ''}` :
                    `Lamentablemente no ha aprobado la capacitación "${training.title}" (${score}% - Mínimo requerido: ${training.minScore}%). ${training.attempts > 1 ? 'Puede volver a intentarlo.' : ''}`,
                userId: employeeId,
                status: 'pending',
                createdAt: new Date(),
                trainingId: training.id
            };
            
            addNotificationToQueue(resultNotification);
        }
        
        console.log('🎓 [TRAINING-COMPLETION] Scoring y notificaciones actualizados para empleado:', employeeId);

        // 🚨 INTEGRACIÓN CON SANCIONES - Si el empleado reprueba capacitación obligatoria
        if (!passed && training.mandatory) {
            triggerSanctionForTrainingFailure(employeeId, training, score);
        }
    } else {
        console.log('⚠️ [TRAINING-COMPLETION] Sistema de scoring no disponible');
    }
}

// Show training message
function showTrainingMessage(message, type = 'info') {
    // Create message element if it doesn't exist
    let messageEl = document.getElementById('training-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'training-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(messageEl);
    }
    
    // Set message and style based on type
    messageEl.textContent = message;
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    messageEl.style.background = colors[type] || colors.info;
    messageEl.style.display = 'block';
    
    // Auto hide after 4 seconds
    setTimeout(() => {
        if (messageEl) {
            messageEl.style.display = 'none';
        }
    }, 4000);
}

// Load trainings list
function loadTrainingsList() {
    const container = document.getElementById('trainings-list');
    if (!container) return;
    
    if (allTrainings.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #6c757d;">
                <div style="font-size: 48px; margin-bottom: 15px;">📚</div>
                <div style="font-size: 18px; margin-bottom: 10px;">No hay capacitaciones creadas</div>
                <div style="margin-bottom: 20px;">Comienza creando tu primera capacitación</div>
                <button onclick="showModal('trainingModal')" class="btn btn-primary">
                    ➕ Crear Primera Capacitación
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allTrainings.map(training => {
        const category = trainingCategories.find(c => c.id === training.category);
        const statusClass = `status-${training.status}`;
        const statusText = {
            active: 'Activo',
            draft: 'Borrador',
            completed: 'Completado',
            expired: 'Vencido',
            suspended: 'Suspendido'
        };
        
        const typeIcons = {
            presential: '🏢',
            virtual: '💻',
            video: '🎥',
            pdf: '📄',
            external_link: '🔗',
            mixed: '🔄'
        };
        
        const isOverdue = training.status === 'active' && new Date(training.deadline) < new Date();
        
        return `
            <div class="training-card" style="${isOverdue ? 'border-left: 4px solid #dc3545;' : ''}">
                <div style="display: flex; justify-content: between; align-items: flex-start; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <span style="font-size: 1.4em;">${category ? category.icon : '📚'}</span>
                            <h3 style="margin: 0; color: #333;">${training.title}</h3>
                            <span style="font-size: 1.2em;">${typeIcons[training.type] || '📚'}</span>
                            ${training.mandatory ? '<span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">OBLIGATORIO</span>' : ''}
                        </div>
                        <p style="margin: 0 0 8px 0; color: #6c757d;">${training.description}</p>
                        <div style="display: flex; flex-wrap: wrap; gap: 15px; font-size: 13px; color: #6c757d;">
                            <span>👤 ${training.instructor}</span>
                            <span>⏱️ ${training.duration}h</span>
                            <span>👥 ${training.participants} participantes</span>
                            <span>✅ ${training.completed} completados</span>
                            <span>📅 Vence: ${new Date(training.deadline).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
                        <span class="training-status ${statusClass}">
                            ${statusText[training.status]}
                            ${isOverdue ? ' - VENCIDO' : ''}
                        </span>
                        <div style="font-size: 12px; color: #6c757d; text-align: right;">
                            Creado: ${new Date(training.createdAt || Date.now()).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 5px;">
                        <span style="font-size: 14px; font-weight: 500;">Progreso General</span>
                        <span style="font-size: 14px; font-weight: bold; color: ${training.progress >= 80 ? '#28a745' : training.progress >= 50 ? '#ffc107' : '#dc3545'};">
                            ${training.progress}%
                        </span>
                    </div>
                    <div class="progress-bar" style="height: 10px;">
                        <div class="progress-fill" style="width: ${training.progress}%; background: ${training.progress >= 80 ? '#28a745' : training.progress >= 50 ? '#ffc107' : '#dc3545'};"></div>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: between; align-items: center;">
                    <div style="display: flex; gap: 8px;">
                        <button onclick="viewTrainingDetails(${training.id})" class="btn btn-sm btn-info" title="Ver detalles">
                            👁️ Ver
                        </button>
                        <button onclick="editTraining(${training.id})" class="btn btn-sm btn-primary" title="Editar capacitación">
                            ✏️ Editar
                        </button>
                        <button onclick="viewTrainingParticipants(${training.id})" class="btn btn-sm btn-success" title="Ver participantes">
                            👥 Participantes
                        </button>
                        <button onclick="duplicateTraining(${training.id})" class="btn btn-sm btn-secondary" title="Duplicar capacitación">
                            📋 Duplicar
                        </button>
                        ${training.status === 'active' ? 
                            `<button onclick="simulateTrainingCompletion(${training.id})" class="btn btn-sm btn-info" title="Simular completación (Demo)">
                                🎯 Demo Completar
                            </button>` : ''
                        }
                    </div>
                    
                    <div style="display: flex; gap: 8px;">
                        ${training.status === 'active' ? 
                            `<button onclick="sendTrainingReminders(${training.id})" class="btn btn-sm btn-warning" title="Enviar recordatorios">
                                📢 Recordar
                            </button>` : ''
                        }
                        ${training.status === 'draft' ? 
                            `<button onclick="activateTraining(${training.id})" class="btn btn-sm btn-success" title="Activar capacitación">
                                ▶️ Activar
                            </button>` : ''
                        }
                        <button onclick="deleteTraining(${training.id})" class="btn btn-sm btn-danger" title="Eliminar capacitación">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Training action functions (placeholders for full functionality)
function viewTrainingDetails(trainingId) {
    const training = allTrainings.find(t => t.id === trainingId);
    if (!training) {
        showTrainingMessage('❌ Capacitación no encontrada', 'error');
        return;
    }
    
    const category = trainingCategories.find(c => c.id === training.category);
    const typeIcons = {
        presential: '🏢 Presencial',
        virtual: '💻 Virtual',
        video: '🎥 Video',
        pdf: '📄 PDF',
        external_link: '🔗 Enlace Externo',
        mixed: '🔄 Mixto'
    };
    
    const detailsHtml = `
        <div class="modal" id="trainingDetailsModal" style="display: block;">
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>${category?.icon || '📚'} Detalles: ${training.title}</h3>
                    <button onclick="closeModal('trainingDetailsModal')" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <!-- General Information -->
                    <div class="card" style="margin-bottom: 20px;">
                        <h4>ℹ️ Información General</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
                            <div><strong>Título:</strong> ${training.title}</div>
                            <div><strong>Categoría:</strong> ${category?.icon || ''} ${category?.name || 'N/A'}</div>
                            <div><strong>Tipo:</strong> ${typeIcons[training.type] || training.type}</div>
                            <div><strong>Estado:</strong> <span class="training-status status-${training.status}">${training.status}</span></div>
                            <div><strong>Duración:</strong> ${training.duration} horas</div>
                            <div><strong>Instructor:</strong> ${training.instructor || 'No asignado'}</div>
                            <div><strong>Obligatoria:</strong> ${training.mandatory ? '✅ Sí' : '❌ No'}</div>
                            <div><strong>Certificado:</strong> ${training.certificate ? '🏆 Sí' : '❌ No'}</div>
                        </div>
                        ${training.description ? `<div><strong>Descripción:</strong><br>${training.description}</div>` : ''}
                    </div>
                    
                    <!-- Dates and Deadlines -->
                    <div class="card" style="margin-bottom: 20px;">
                        <h4>📅 Fechas Importantes</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div><strong>Fecha de inicio:</strong> ${training.startDate ? new Date(training.startDate).toLocaleString() : 'No definida'}</div>
                            <div><strong>Fecha límite:</strong> ${training.deadline ? new Date(training.deadline).toLocaleString() : 'No definida'}</div>
                            <div><strong>Creada:</strong> ${new Date(training.createdAt || Date.now()).toLocaleString()}</div>
                            <div><strong>Modificada:</strong> ${new Date(training.updatedAt || Date.now()).toLocaleString()}</div>
                        </div>
                    </div>
                    
                    <!-- Scoring and Progress -->
                    <div class="card" style="margin-bottom: 20px;">
                        <h4>📊 Configuración de Evaluación</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
                            <div><strong>Puntaje máximo:</strong> ${training.maxScore} puntos</div>
                            <div><strong>Puntaje mínimo:</strong> ${training.minScore} puntos (${Math.round((training.minScore / training.maxScore) * 100)}%)</div>
                            <div><strong>Intentos permitidos:</strong> ${training.attempts}</div>
                            <div><strong>Progreso general:</strong> ${training.progress}%</div>
                        </div>
                        
                        <!-- Progress Bar -->
                        <div style="margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span>Progreso de Participantes</span>
                                <span><strong>${training.completed}/${training.participants}</strong> completados</span>
                            </div>
                            <div class="progress-bar" style="height: 12px;">
                                <div class="progress-fill" style="width: ${training.progress}%; background: ${training.progress >= 80 ? '#28a745' : training.progress >= 50 ? '#ffc107' : '#dc3545'};"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Participants Summary -->
                    <div class="card" style="margin-bottom: 20px;">
                        <h4>👥 Resumen de Participantes</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                            <div class="stat-card" style="background: linear-gradient(135deg, #007bff, #0056b3); color: white;">
                                <div style="font-size: 1.5em; margin-bottom: 5px;">${training.participants}</div>
                                <div style="font-size: 12px; opacity: 0.9;">Total Asignados</div>
                            </div>
                            <div class="stat-card" style="background: linear-gradient(135deg, #28a745, #1e7e34); color: white;">
                                <div style="font-size: 1.5em; margin-bottom: 5px;">${training.completed}</div>
                                <div style="font-size: 12px; opacity: 0.9;">Completados</div>
                            </div>
                            <div class="stat-card" style="background: linear-gradient(135deg, #ffc107, #e0a800); color: white;">
                                <div style="font-size: 1.5em; margin-bottom: 5px;">${training.participants - training.completed}</div>
                                <div style="font-size: 12px; opacity: 0.9;">Pendientes</div>
                            </div>
                            <div class="stat-card" style="background: linear-gradient(135deg, #17a2b8, #117a8b); color: white;">
                                <div style="font-size: 1.5em; margin-bottom: 5px;">${training.progress}%</div>
                                <div style="font-size: 12px; opacity: 0.9;">Progreso</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div style="text-align: center; margin-top: 20px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="editTraining(${training.id}); closeModal('trainingDetailsModal');" class="btn btn-primary">
                            ✏️ Editar Capacitación
                        </button>
                        <button onclick="viewTrainingParticipants(${training.id}); closeModal('trainingDetailsModal');" class="btn btn-success">
                            👥 Ver Participantes
                        </button>
                        <button onclick="generateTrainingReport(${training.id}); closeModal('trainingDetailsModal');" class="btn btn-info">
                            📊 Generar Reporte
                        </button>
                        ${training.certificate ? `
                            <button onclick="generateCertificates(${training.id}); closeModal('trainingDetailsModal');" class="btn btn-warning">
                                🏆 Generar Certificados
                            </button>
                        ` : ''}
                        <button onclick="closeModal('trainingDetailsModal')" class="btn btn-secondary">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', detailsHtml);
}

function editTraining(trainingId) {
    console.log('✏️ [TRAINING] Iniciando edición de capacitación:', trainingId);
    
    const training = allTrainings.find(t => t.id === trainingId);
    if (!training) {
        showTrainingMessage('❌ Capacitación no encontrada', 'error');
        return;
    }
    
    try {
        // Verificar que el modal de capacitación existe
        const modal = document.getElementById('trainingModal');
        if (!modal) {
            console.error('❌ [TRAINING] Modal de capacitación no encontrado');
            showTrainingMessage('❌ Error: Modal no disponible', 'error');
            return;
        }
        
        // Populate form with existing data - con validación de elementos
        const setFieldValue = (id, value, defaultValue = '') => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value || false;
                } else {
                    element.value = value || defaultValue;
                }
            } else {
                console.warn('⚠️ [TRAINING] Campo no encontrado:', id);
            }
        };
        
        setFieldValue('training-title', training.title);
        setFieldValue('training-category', training.category);
        setFieldValue('training-description', training.description);
        setFieldValue('training-type', training.type);
        setFieldValue('training-duration', training.duration);
        setFieldValue('training-instructor', training.instructor);
        setFieldValue('training-max-score', training.maxScore, '100');
        setFieldValue('training-min-score', training.minScore, '70');
        setFieldValue('training-attempts', training.attempts, '2');
        setFieldValue('training-mandatory', training.mandatory);
        setFieldValue('training-certificate', training.certificate);
    
        // Handle dates con validación
        if (training.startDate) {
            const startDate = new Date(training.startDate);
            setFieldValue('training-start-date', startDate.toISOString().slice(0, 16));
        }
        if (training.deadline) {
            const deadline = new Date(training.deadline);
            setFieldValue('training-deadline', deadline.toISOString().slice(0, 16));
        }
        
        // Update modal title and form behavior
        const modalTitle = document.getElementById('trainingModalTitle');
        if (modalTitle) {
            modalTitle.textContent = '✏️ Editar Capacitación';
        }
        
        // Store the training ID for updating
        const form = document.getElementById('trainingForm');
        if (form) {
            form.setAttribute('data-edit-id', trainingId);
        }
        
        // Show modal
        showModal('trainingModal');
        
        console.log('✅ [TRAINING] Capacitación cargada para edición:', training.title);
        
    } catch (error) {
        console.error('❌ [TRAINING] Error al editar capacitación:', error);
        showTrainingMessage('❌ Error al cargar los datos para edición', 'error');
    }
}

function viewTrainingParticipants(trainingId) {
    const training = allTrainings.find(t => t.id === trainingId);
    if (!training) {
        showTrainingMessage('❌ Capacitación no encontrada', 'error');
        return;
    }
    
    // Mock participant data - in a real system this would come from the backend
    const mockParticipants = [
        { id: 1, name: 'Juan Pérez', email: 'juan.perez@empresa.com', department: 'IT', status: 'completed', progress: 100, score: 95, completedDate: new Date(Date.now() - 2*24*60*60*1000) },
        { id: 2, name: 'María García', email: 'maria.garcia@empresa.com', department: 'RRHH', status: 'completed', progress: 100, score: 88, completedDate: new Date(Date.now() - 1*24*60*60*1000) },
        { id: 3, name: 'Carlos López', email: 'carlos.lopez@empresa.com', department: 'Ventas', status: 'failed', progress: 100, score: 65, completedDate: new Date(Date.now() - 1*24*60*60*1000) },
        { id: 4, name: 'Ana Martínez', email: 'ana.martinez@empresa.com', department: 'Operaciones', status: 'in_progress', progress: 75, score: null, completedDate: null },
        { id: 5, name: 'Luis Rodriguez', email: 'luis.rodriguez@empresa.com', department: 'Finanzas', status: 'assigned', progress: 0, score: null, completedDate: null },
        { id: 6, name: 'Sofia Hernández', email: 'sofia.hernandez@empresa.com', department: 'IT', status: 'completed', progress: 100, score: 92, completedDate: new Date(Date.now() - 3*24*60*60*1000) }
    ];
    
    const statusText = {
        assigned: 'Asignado',
        in_progress: 'En Progreso',
        completed: 'Completado',
        failed: 'Reprobado',
        expired: 'Vencido'
    };
    
    const statusColors = {
        assigned: '#6c757d',
        in_progress: '#ffc107',
        completed: '#28a745',
        failed: '#dc3545',
        expired: '#fd7e14'
    };
    
    const participantsHtml = `
        <div class="modal" id="trainingParticipantsModal" style="display: block;">
            <div class="modal-content" style="max-width: 1200px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>👥 Participantes: ${training.title}</h3>
                    <button onclick="closeModal('trainingParticipantsModal')" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <!-- Summary Statistics -->
                    <div class="card" style="margin-bottom: 20px;">
                        <h4>📊 Resumen de Participación</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 15px;">
                            <div class="stat-card" style="background: linear-gradient(135deg, #007bff, #0056b3); color: white;">
                                <div style="font-size: 1.8em; margin-bottom: 5px;">${mockParticipants.length}</div>
                                <div style="font-size: 11px; opacity: 0.9;">Total</div>
                            </div>
                            <div class="stat-card" style="background: linear-gradient(135deg, #28a745, #1e7e34); color: white;">
                                <div style="font-size: 1.8em; margin-bottom: 5px;">${mockParticipants.filter(p => p.status === 'completed').length}</div>
                                <div style="font-size: 11px; opacity: 0.9;">Completados</div>
                            </div>
                            <div class="stat-card" style="background: linear-gradient(135deg, #ffc107, #e0a800); color: white;">
                                <div style="font-size: 1.8em; margin-bottom: 5px;">${mockParticipants.filter(p => p.status === 'in_progress').length}</div>
                                <div style="font-size: 11px; opacity: 0.9;">En Progreso</div>
                            </div>
                            <div class="stat-card" style="background: linear-gradient(135deg, #6c757d, #545b62); color: white;">
                                <div style="font-size: 1.8em; margin-bottom: 5px;">${mockParticipants.filter(p => p.status === 'assigned').length}</div>
                                <div style="font-size: 11px; opacity: 0.9;">Asignados</div>
                            </div>
                            <div class="stat-card" style="background: linear-gradient(135deg, #dc3545, #c82333); color: white;">
                                <div style="font-size: 1.8em; margin-bottom: 5px;">${mockParticipants.filter(p => p.status === 'failed').length}</div>
                                <div style="font-size: 11px; opacity: 0.9;">Reprobados</div>
                            </div>
                            <div class="stat-card" style="background: linear-gradient(135deg, #17a2b8, #117a8b); color: white;">
                                <div style="font-size: 1.8em; margin-bottom: 5px;">${Math.round(mockParticipants.reduce((sum, p) => sum + p.progress, 0) / mockParticipants.length)}%</div>
                                <div style="font-size: 11px; opacity: 0.9;">Progreso Promedio</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Filters -->
                    <div class="card" style="margin-bottom: 20px;">
                        <h4>🔍 Filtros</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            <div>
                                <label>Buscar participante:</label>
                                <input type="text" id="participant-search" placeholder="Buscar por nombre..." onkeyup="filterParticipants()">
                            </div>
                            <div>
                                <label>Departamento:</label>
                                <select id="participant-department-filter" onchange="filterParticipants()">
                                    <option value="">Todos los departamentos</option>
                                    <option value="IT">IT</option>
                                    <option value="RRHH">RRHH</option>
                                    <option value="Ventas">Ventas</option>
                                    <option value="Operaciones">Operaciones</option>
                                    <option value="Finanzas">Finanzas</option>
                                </select>
                            </div>
                            <div>
                                <label>Estado:</label>
                                <select id="participant-status-filter" onchange="filterParticipants()">
                                    <option value="">Todos los estados</option>
                                    <option value="assigned">Asignado</option>
                                    <option value="in_progress">En Progreso</option>
                                    <option value="completed">Completado</option>
                                    <option value="failed">Reprobado</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Participants List -->
                    <div class="card">
                        <h4>👤 Lista de Participantes</h4>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                                <thead style="background: #f8f9fa;">
                                    <tr>
                                        <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Participante</th>
                                        <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Departamento</th>
                                        <th style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">Estado</th>
                                        <th style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">Progreso</th>
                                        <th style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">Puntuación</th>
                                        <th style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">Fecha Completado</th>
                                        <th style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="participants-table-body">
                                    ${mockParticipants.map(participant => `
                                        <tr style="border-bottom: 1px solid #dee2e6;">
                                            <td style="padding: 12px; border: 1px solid #dee2e6;">
                                                <div style="font-weight: 600;">${participant.name}</div>
                                                <div style="font-size: 12px; color: #6c757d;">${participant.email}</div>
                                            </td>
                                            <td style="padding: 12px; border: 1px solid #dee2e6;">
                                                <span style="background: #e9ecef; padding: 4px 8px; border-radius: 10px; font-size: 12px;">
                                                    ${participant.department}
                                                </span>
                                            </td>
                                            <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">
                                                <span style="background: ${statusColors[participant.status]}; color: white; padding: 4px 12px; border-radius: 15px; font-size: 12px; font-weight: bold;">
                                                    ${statusText[participant.status]}
                                                </span>
                                            </td>
                                            <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">
                                                <div style="display: flex; flex-direction: column; align-items: center;">
                                                    <div style="font-weight: bold; margin-bottom: 3px;">${participant.progress}%</div>
                                                    <div style="width: 60px; height: 6px; background: #e9ecef; border-radius: 3px;">
                                                        <div style="height: 100%; background: ${participant.progress >= 100 ? '#28a745' : participant.progress >= 50 ? '#ffc107' : '#dc3545'}; width: ${participant.progress}%; border-radius: 3px;"></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">
                                                ${participant.score !== null ? 
                                                    `<span style="font-weight: bold; color: ${participant.score >= training.minScore ? '#28a745' : '#dc3545'};">${participant.score}%</span>` : 
                                                    '<span style="color: #6c757d;">-</span>'
                                                }
                                            </td>
                                            <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center; font-size: 12px;">
                                                ${participant.completedDate ? participant.completedDate.toLocaleDateString() : '<span style="color: #6c757d;">-</span>'}
                                            </td>
                                            <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">
                                                <div style="display: flex; gap: 5px; justify-content: center;">
                                                    <button onclick="viewParticipantDetail(${participant.id}, ${trainingId})" class="btn btn-sm btn-info" title="Ver detalles">
                                                        👁️
                                                    </button>
                                                    ${participant.status === 'assigned' || participant.status === 'in_progress' ? `
                                                        <button onclick="sendParticipantReminder(${participant.id}, ${trainingId})" class="btn btn-sm btn-warning" title="Enviar recordatorio">
                                                            📢
                                                        </button>
                                                    ` : ''}
                                                    ${participant.status === 'completed' && training.certificate ? `
                                                        <button onclick="generateParticipantCertificate(${participant.id}, ${trainingId})" class="btn btn-sm btn-success" title="Generar certificado">
                                                            🏆
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div style="text-align: center; margin-top: 20px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="exportParticipantsList(${trainingId})" class="btn btn-info">
                            📤 Exportar Lista
                        </button>
                        <button onclick="sendBulkReminders(${trainingId})" class="btn btn-warning">
                            📢 Recordatorios Masivos
                        </button>
                        ${training.certificate ? `
                            <button onclick="generateBulkCertificates(${trainingId})" class="btn btn-success">
                                🏆 Generar Todos los Certificados
                            </button>
                        ` : ''}
                        <button onclick="closeModal('trainingParticipantsModal')" class="btn btn-secondary">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', participantsHtml);
}

function duplicateTraining(trainingId) {
    console.log('📋 [TRAINING] Duplicar capacitación:', trainingId);
    
    const training = allTrainings.find(t => t.id === trainingId);
    if (training) {
        const duplicatedTraining = {
            ...training,
            id: Date.now(),
            title: `${training.title} (Copia)`,
            status: 'draft',
            participants: 0,
            completed: 0,
            progress: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        allTrainings.push(duplicatedTraining);
        updateTrainingCounters();
        loadTrainingsList();
        
        showTrainingMessage('✅ Capacitación duplicada como borrador', 'success');
    }
}

function activateTraining(trainingId) {
    console.log('▶️ [TRAINING] Activar capacitación:', trainingId);
    
    const training = allTrainings.find(t => t.id === trainingId);
    if (training) {
        training.status = 'active';
        training.updatedAt = new Date();
        
        // Send notifications
        sendTrainingAssignmentNotifications(training);
        
        // Update scoring
        updateEmployeeScoringForTraining(training);
        
        loadTrainingsList();
        showTrainingMessage('✅ Capacitación activada y notificaciones enviadas', 'success');
    }
}

async function deleteTraining(trainingId) {
    console.log('🗑️ [TRAINING] Eliminar capacitación:', trainingId);

    if (confirm('¿Está seguro de eliminar esta capacitación? Esta acción no se puede deshacer.')) {
        const index = allTrainings.findIndex(t => t.id === trainingId);
        if (index > -1) {
            const deletedTraining = allTrainings[index];

            // Eliminar vía API
            const success = await deleteTrainingAPI(trainingId);

            if (success) {
                // Eliminar del array local
                allTrainings.splice(index, 1);

                updateTrainingCounters();
                loadTrainingsList();
                showTrainingMessage(`✅ Capacitación "${deletedTraining.title}" eliminada exitosamente`, 'success');
            }
        }
    }
}

function sendTrainingReminders(trainingId = null) {
    console.log('📢 [TRAINING] Enviar recordatorios de capacitación:', trainingId);
    
    if (trainingId) {
        const training = allTrainings.find(t => t.id === trainingId);
        if (training) {
            // Send reminder for specific training
            if (typeof addNotificationToQueue === 'function') {
                const reminderNotification = {
                    id: `MANUAL-REMIND-${training.id}-${Date.now()}`,
                    type: 'training_reminder',
                    priority: 'high',
                    title: `📢 Recordatorio Importante: ${training.title}`,
                    message: `Recordatorio manual: Debe completar la capacitación "${training.title}". Fecha límite: ${new Date(training.deadline).toLocaleDateString()}`,
                    recipients: ['assigned_employees'],
                    status: 'pending',
                    createdAt: new Date(),
                    trainingId: training.id
                };
                
                addNotificationToQueue(reminderNotification);
            }
            
            showTrainingMessage('✅ Recordatorio enviado a todos los participantes', 'success');
        }
    } else {
        // Send reminders for all active trainings
        const activeTrainings = allTrainings.filter(t => t.status === 'active');
        let reminderCount = 0;
        
        activeTrainings.forEach(training => {
            if (typeof addNotificationToQueue === 'function') {
                const reminderNotification = {
                    id: `BULK-REMIND-${training.id}-${Date.now()}`,
                    type: 'training_reminder',
                    priority: 'medium',
                    title: `📢 Recordatorio: ${training.title}`,
                    message: `No olvide completar la capacitación "${training.title}". Fecha límite: ${new Date(training.deadline).toLocaleDateString()}`,
                    recipients: ['assigned_employees'],
                    status: 'pending',
                    createdAt: new Date(),
                    trainingId: training.id
                };
                
                addNotificationToQueue(reminderNotification);
                reminderCount++;
            }
        });
        
        showTrainingMessage(`✅ ${reminderCount} recordatorios enviados`, 'success');
    }
}

// Simulate training completion for demo purposes
function simulateTrainingCompletion(trainingId) {
    console.log('🎯 [TRAINING-DEMO] Simulando completación de capacitación:', trainingId);
    
    const training = allTrainings.find(t => t.id === trainingId);
    if (!training) {
        showTrainingMessage('❌ Capacitación no encontrada', 'error');
        return;
    }
    
    // Simular múltiples empleados completando la capacitación
    const mockCompletions = [
        { employeeId: 1, employeeName: 'Juan Pérez', score: 95, passed: true },
        { employeeId: 2, employeeName: 'María García', score: 88, passed: true },
        { employeeId: 3, employeeName: 'Carlos López', score: 65, passed: false },
        { employeeId: 4, employeeName: 'Ana Martínez', score: 92, passed: true },
        { employeeId: 5, employeeName: 'Luis Rodriguez', score: 78, passed: true }
    ];
    
    let completedCount = 0;
    let passedCount = 0;
    
    mockCompletions.forEach((completion, index) => {
        setTimeout(() => {
            // Actualizar scoring del empleado
            updateScoringOnTrainingCompletion(completion.employeeId, training, completion.score, completion.passed);
            
            completedCount++;
            if (completion.passed) passedCount++;
            
            // Si es la última completación, actualizar estadísticas de la capacitación
            if (index === mockCompletions.length - 1) {
                training.completed = completedCount;
                training.progress = Math.round((completedCount / training.participants) * 100);
                
                // Si todos completaron, marcar como completada
                if (training.completed >= training.participants) {
                    training.status = 'completed';
                }
                
                // Actualizar la vista
                loadTrainingsList();
                updateTrainingCounters();
                
                // Mostrar resultados
                showTrainingMessage(
                    `🎯 Demo completado: ${completedCount} participantes terminaron, ${passedCount} aprobaron (${Math.round((passedCount/completedCount)*100)}% aprobación)`, 
                    'success'
                );
                
                // Generar notificación de certificados si corresponde
                if (training.certificate && passedCount > 0) {
                    setTimeout(() => {
                        if (typeof addNotificationToQueue === 'function') {
                            addNotificationToQueue({
                                id: `CERT-${training.id}-${Date.now()}`,
                                type: 'training_certificate',
                                priority: 'medium',
                                title: `🏆 Certificados Disponibles: ${training.title}`,
                                message: `Los certificados para la capacitación "${training.title}" están listos para descargar. ${passedCount} empleados han obtenido su certificación.`,
                                trainingId: training.id
                            });
                        }
                    }, 2000);
                }
            }
        }, index * 500); // Escalonar las completaciones
    });
    
    showTrainingMessage('🎯 Iniciando simulación de completación...', 'info');
}

// Evaluations management view - COMPLETE IMPLEMENTATION
function showEvaluationsManagement() {
    const contentArea = document.getElementById('training-content-area');
    
    contentArea.innerHTML = `
        <!-- Filters and search -->
        <div class="card" style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3>🔍 Evaluaciones</h3>
                <div style="display: flex; gap: 10px;">
                    <button onclick="showModal('evaluationModal'); prepareEvaluationModal()" class="btn btn-primary">
                        ➕ Nueva Evaluación
                    </button>
                    <button onclick="showExamFormGenerator()" class="btn btn-success">
                        🎯 Generar Formulario de Examen
                    </button>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div>
                    <label>🔍 Buscar:</label>
                    <input type="text" id="evaluation-search" placeholder="Buscar evaluaciones..." onkeyup="filterEvaluations()">
                </div>
                <div>
                    <label>📚 Capacitación:</label>
                    <select id="evaluation-training-filter" onchange="filterEvaluations()">
                        <option value="">Todas las capacitaciones</option>
                        ${allTrainings.map(training => 
                            `<option value="${training.id}">${training.title}</option>`
                        ).join('')}
                    </select>
                </div>
                <div>
                    <label>🔄 Estado:</label>
                    <select id="evaluation-status-filter" onchange="filterEvaluations()">
                        <option value="">Todos los estados</option>
                        <option value="active">🟢 Activa</option>
                        <option value="draft">🟡 Borrador</option>
                        <option value="completed">🔵 Completada</option>
                        <option value="disabled">⚪ Deshabilitada</option>
                    </select>
                </div>
            </div>
        </div>
        
        <!-- Evaluations list -->
        <div class="card">
            <h3>📋 Lista de Evaluaciones</h3>
            <div id="evaluations-list">
                <div style="padding: 40px; text-align: center; color: #6c757d;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📋</div>
                    <div>Cargando evaluaciones...</div>
                </div>
            </div>
        </div>
    `;
    
    // Load evaluations data
    loadEvaluationsList();
}

// 🆕 EVALUACIONES INDEPENDIENTES - Gestión de evaluaciones no vinculadas a capacitaciones
function showIndependentEvaluationsManagement() {
    const contentArea = document.getElementById('training-content-area');
    
    contentArea.innerHTML = `
        <!-- Header -->
        <div class="card" style="margin-bottom: 20px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white;">
            <div style="padding: 20px;">
                <h2 style="margin: 0; font-size: 24px; display: flex; align-items: center; gap: 10px;">
                    🎯 Evaluaciones Independientes
                </h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">
                    Evaluaciones que no están vinculadas a capacitaciones específicas - ideales para evaluaciones de conocimientos generales, 
                    exámenes de selección, tests psicotécnicos, evaluaciones de desempeño, etc.
                </p>
            </div>
        </div>

        <!-- Actions and filters -->
        <div class="card" style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3>🔍 Gestión de Evaluaciones Independientes</h3>
                <div style="display: flex; gap: 10px;">
                    <button onclick="showIndependentEvaluationModal()" class="btn btn-primary">
                        ➕ Nueva Evaluación Independiente
                    </button>
                    <button onclick="showIndependentExamFormGenerator()" class="btn btn-success">
                        🎯 Generar Formulario de Examen
                    </button>
                    <button onclick="importIndependentEvaluations()" class="btn btn-info">
                        📥 Importar Evaluaciones
                    </button>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div>
                    <label>🔍 Buscar:</label>
                    <input type="text" id="independent-evaluation-search" placeholder="Buscar evaluaciones independientes..." onkeyup="filterIndependentEvaluations()">
                </div>
                <div>
                    <label>📂 Categoría:</label>
                    <select id="independent-evaluation-category-filter" onchange="filterIndependentEvaluations()">
                        <option value="">Todas las categorías</option>
                        <option value="knowledge">🧠 Conocimientos Generales</option>
                        <option value="psychometric">🧪 Psicotécnicas</option>
                        <option value="performance">📊 Desempeño</option>
                        <option value="selection">👤 Selección de Personal</option>
                        <option value="certification">🏆 Certificaciones</option>
                        <option value="compliance">⚖️ Cumplimiento</option>
                        <option value="other">🔧 Otras</option>
                    </select>
                </div>
                <div>
                    <label>🔄 Estado:</label>
                    <select id="independent-evaluation-status-filter" onchange="filterIndependentEvaluations()">
                        <option value="">Todos los estados</option>
                        <option value="active">🟢 Activa</option>
                        <option value="draft">🟡 Borrador</option>
                        <option value="completed">🔵 Completada</option>
                        <option value="disabled">⚪ Deshabilitada</option>
                    </select>
                </div>
                <div>
                    <label>👥 Audiencia:</label>
                    <select id="independent-evaluation-audience-filter" onchange="filterIndependentEvaluations()">
                        <option value="">Todas las audiencias</option>
                        <option value="all_employees">👥 Todos los empleados</option>
                        <option value="new_candidates">🆕 Candidatos nuevos</option>
                        <option value="managers">👔 Gerentes</option>
                        <option value="specific_department">🏢 Departamento específico</option>
                        <option value="external">🌐 Externa (clientes/proveedores)</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Statistics cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div class="stat-card">
                <div class="stat-value" id="total-independent-evaluations">0</div>
                <div class="stat-label">Total Evaluaciones</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="active-independent-evaluations">0</div>
                <div class="stat-label">Activas</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="completed-independent-evaluations">0</div>
                <div class="stat-label">Completadas</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="participants-independent-evaluations">0</div>
                <div class="stat-label">Participantes</div>
            </div>
        </div>
        
        <!-- Independent Evaluations list -->
        <div class="card">
            <h3>🎯 Lista de Evaluaciones Independientes</h3>
            <div id="independent-evaluations-list">
                <div style="padding: 40px; text-align: center; color: #6c757d;">
                    <div style="font-size: 48px; margin-bottom: 15px;">🎯</div>
                    <div style="font-size: 18px; margin-bottom: 10px;">No hay evaluaciones independientes creadas</div>
                    <div style="margin-bottom: 20px;">
                        Las evaluaciones independientes son perfectas para:<br>
                        • Tests de conocimientos generales<br>
                        • Evaluaciones psicotécnicas<br>
                        • Exámenes de selección de personal<br>
                        • Evaluaciones de desempeño<br>
                        • Certificaciones internas
                    </div>
                    <button onclick="showIndependentEvaluationModal()" class="btn btn-primary">
                        ➕ Crear Primera Evaluación Independiente
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Load independent evaluations data
    loadIndependentEvaluationsList();
    updateIndependentEvaluationsStats();
}

// Prepare evaluation modal with training options
function prepareEvaluationModal() {
    const trainingSelect = document.getElementById('eval-training');
    if (trainingSelect) {
        trainingSelect.innerHTML = `
            <option value="">Seleccionar capacitación...</option>
            ${allTrainings.filter(t => t.status !== 'expired').map(training => 
                `<option value="${training.id}">${training.title}</option>`
            ).join('')}
        `;
    }
    
    // Clear questions container
    const questionsContainer = document.getElementById('questions-container');
    if (questionsContainer) {
        questionsContainer.innerHTML = '';
    }
    
    // Add first question automatically
    setTimeout(() => addQuestion(), 100);
}

// Load evaluations list
function loadEvaluationsList() {
    const container = document.getElementById('evaluations-list');
    if (!container) return;
    
    if (allEvaluations.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #6c757d;">
                <div style="font-size: 48px; margin-bottom: 15px;">📋</div>
                <div style="font-size: 18px; margin-bottom: 10px;">No hay evaluaciones creadas</div>
                <div style="margin-bottom: 20px;">Comienza creando tu primera evaluación</div>
                <button onclick="showModal('evaluationModal'); prepareEvaluationModal()" class="btn btn-primary">
                    ➕ Crear Primera Evaluación
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allEvaluations.map(evaluation => {
        const training = allTrainings.find(t => t.id === evaluation.trainingId);
        const statusClass = `status-${evaluation.status}`;
        const statusText = {
            active: 'Activa',
            draft: 'Borrador', 
            completed: 'Completada',
            disabled: 'Deshabilitada'
        };
        
        return `
            <div class="training-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <span style="font-size: 1.4em;">📋</span>
                            <h3 style="margin: 0; color: #333;">${evaluation.title}</h3>
                        </div>
                        <p style="margin: 0 0 8px 0; color: #6c757d;">${evaluation.instructions || 'Sin instrucciones especiales'}</p>
                        <div style="display: flex; flex-wrap: wrap; gap: 15px; font-size: 13px; color: #6c757d;">
                            <span>📚 ${training ? training.title : 'Capacitación eliminada'}</span>
                            <span>❓ ${evaluation.questions ? evaluation.questions.length : 0} preguntas</span>
                            <span>⏱️ ${evaluation.timeLimit || 60} min</span>
                            <span>🔀 ${evaluation.randomize ? 'Aleatorio' : 'Orden fijo'}</span>
                            <span>📅 ${new Date(evaluation.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <span class="training-status ${statusClass}">
                        ${statusText[evaluation.status]}
                    </span>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 8px;">
                        <button onclick="viewEvaluationDetails(${evaluation.id})" class="btn btn-sm btn-info" title="Ver detalles">
                            👁️ Ver
                        </button>
                        <button onclick="editEvaluation(${evaluation.id})" class="btn btn-sm btn-primary" title="Editar evaluación">
                            ✏️ Editar
                        </button>
                        <button onclick="previewEvaluation(${evaluation.id})" class="btn btn-sm btn-success" title="Vista previa">
                            👁️ Vista Previa
                        </button>
                        <button onclick="duplicateEvaluation(${evaluation.id})" class="btn btn-sm btn-secondary" title="Duplicar">
                            📋 Duplicar
                        </button>
                    </div>
                    
                    <div style="display: flex; gap: 8px;">
                        ${evaluation.status === 'draft' ? 
                            `<button onclick="activateEvaluation(${evaluation.id})" class="btn btn-sm btn-success" title="Activar">
                                ▶️ Activar
                            </button>` : ''
                        }
                        <button onclick="deleteEvaluation(${evaluation.id})" class="btn btn-sm btn-danger" title="Eliminar">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Add question to evaluation form
function addQuestion() {
    const container = document.getElementById('questions-container');
    if (!container) return;
    
    const questionIndex = container.children.length;
    const questionId = `question-${questionIndex}-${Date.now()}`;
    
    const questionHtml = `
        <div class="question-item" id="${questionId}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h5>Pregunta ${questionIndex + 1}</h5>
                <button type="button" onclick="removeQuestion('${questionId}')" class="btn btn-sm btn-danger">❌ Eliminar</button>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Tipo de pregunta *</label>
                    <select class="question-type" onchange="updateQuestionType(this, '${questionId}')" required>
                        <option value="">Seleccionar tipo...</option>
                        <option value="multiple_choice">Opción múltiple</option>
                        <option value="true_false">Verdadero/Falso</option>
                        <option value="text">Respuesta de texto</option>
                        <option value="practical">Evaluación práctica</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Puntos</label>
                    <input type="number" class="question-points" value="10" min="1">
                </div>
            </div>
            
            <div class="form-group">
                <label>Pregunta *</label>
                <textarea class="question-text" placeholder="Escriba la pregunta aquí..." rows="2" required></textarea>
            </div>
            
            <div class="question-options" id="${questionId}-options">
                <!-- Options will be generated based on question type -->
            </div>
            
            <div class="form-group" style="margin-top: 15px;">
                <label>Explicación (opcional)</label>
                <textarea class="question-explanation" placeholder="Explicación de la respuesta correcta..." rows="2"></textarea>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', questionHtml);
}

// Remove question from evaluation form
function removeQuestion(questionId) {
    const questionElement = document.getElementById(questionId);
    if (questionElement && confirm('¿Eliminar esta pregunta?')) {
        questionElement.remove();
        updateQuestionNumbers();
    }
}

// Update question numbers after removal
function updateQuestionNumbers() {
    const questions = document.querySelectorAll('.question-item');
    questions.forEach((question, index) => {
        const title = question.querySelector('h5');
        if (title) {
            title.textContent = `Pregunta ${index + 1}`;
        }
    });
}

// Update question type options
function updateQuestionType(select, questionId) {
    const optionsContainer = document.getElementById(`${questionId}-options`);
    if (!optionsContainer) return;
    
    const questionType = select.value;
    
    switch (questionType) {
        case 'multiple_choice':
            optionsContainer.innerHTML = `
                <label>Opciones de respuesta *</label>
                <div class="multiple-choice-options">
                    <div class="option-item" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <input type="radio" name="${questionId}-correct" value="0" required>
                        <input type="text" placeholder="Opción A" required style="flex: 1;">
                        <button type="button" onclick="removeOption(this)" class="btn btn-sm btn-danger">❌</button>
                    </div>
                    <div class="option-item" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <input type="radio" name="${questionId}-correct" value="1" required>
                        <input type="text" placeholder="Opción B" required style="flex: 1;">
                        <button type="button" onclick="removeOption(this)" class="btn btn-sm btn-danger">❌</button>
                    </div>
                </div>
                <button type="button" onclick="addOption('${questionId}')" class="btn btn-sm btn-info">➕ Agregar Opción</button>
                <p style="font-size: 12px; color: #6c757d; margin-top: 8px;">Seleccione la opción correcta</p>
            `;
            break;
            
        case 'true_false':
            optionsContainer.innerHTML = `
                <label>Respuesta correcta *</label>
                <div style="display: flex; gap: 20px;">
                    <label style="display: flex; align-items: center; gap: 5px;">
                        <input type="radio" name="${questionId}-correct" value="true" required>
                        Verdadero
                    </label>
                    <label style="display: flex; align-items: center; gap: 5px;">
                        <input type="radio" name="${questionId}-correct" value="false" required>
                        Falso
                    </label>
                </div>
            `;
            break;
            
        case 'text':
            optionsContainer.innerHTML = `
                <label>Palabras clave para evaluación automática (separadas por comas)</label>
                <input type="text" class="text-keywords" placeholder="palabra1, palabra2, concepto importante">
                <p style="font-size: 12px; color: #6c757d; margin-top: 5px;">Las respuestas que contengan estas palabras recibirán puntuación completa</p>
            `;
            break;
            
        case 'practical':
            optionsContainer.innerHTML = `
                <label>Instrucciones para evaluación práctica</label>
                <textarea class="practical-instructions" placeholder="Instrucciones específicas para el evaluador..." rows="3"></textarea>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <label style="display: flex; align-items: center; gap: 5px;">
                        <input type="checkbox" class="requires-evaluator">
                        Requiere evaluador humano
                    </label>
                </div>
            `;
            break;
            
        default:
            optionsContainer.innerHTML = '';
    }
}

// Add option to multiple choice question
function addOption(questionId) {
    const optionsContainer = document.querySelector(`#${questionId}-options .multiple-choice-options`);
    if (!optionsContainer) return;
    
    const optionIndex = optionsContainer.children.length;
    const optionLetter = String.fromCharCode(65 + optionIndex); // A, B, C, D...
    
    const optionHtml = `
        <div class="option-item" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <input type="radio" name="${questionId}-correct" value="${optionIndex}" required>
            <input type="text" placeholder="Opción ${optionLetter}" required style="flex: 1;">
            <button type="button" onclick="removeOption(this)" class="btn btn-sm btn-danger">❌</button>
        </div>
    `;
    
    optionsContainer.insertAdjacentHTML('beforeend', optionHtml);
}

// Remove option from multiple choice question
function removeOption(button) {
    const optionItem = button.closest('.option-item');
    const optionsContainer = button.closest('.multiple-choice-options');
    
    if (optionsContainer.children.length <= 2) {
        showTrainingMessage('❌ Debe haber al menos 2 opciones', 'error');
        return;
    }
    
    if (confirm('¿Eliminar esta opción?')) {
        optionItem.remove();
        updateOptionLabels(optionsContainer);
    }
}

// Update option labels after removal
function updateOptionLabels(container) {
    const options = container.querySelectorAll('.option-item');
    options.forEach((option, index) => {
        const input = option.querySelector('input[type="text"]');
        const radio = option.querySelector('input[type="radio"]');
        const letter = String.fromCharCode(65 + index);
        
        if (input) {
            input.placeholder = `Opción ${letter}`;
        }
        if (radio) {
            radio.value = index;
        }
    });
}

// Save evaluation
function saveEvaluation(event) {
    event.preventDefault();
    
    const formData = {
        trainingId: parseInt(document.getElementById('eval-training').value),
        title: document.getElementById('eval-title').value,
        instructions: document.getElementById('eval-instructions').value,
        timeLimit: parseInt(document.getElementById('eval-time-limit').value) || 60,
        randomize: document.getElementById('eval-randomize').checked
    };
    
    // Validate required fields
    if (!formData.trainingId || !formData.title) {
        showTrainingMessage('❌ Complete los campos obligatorios', 'error');
        return;
    }
    
    // Collect questions
    const questions = [];
    const questionElements = document.querySelectorAll('.question-item');
    
    if (questionElements.length === 0) {
        showTrainingMessage('❌ Debe agregar al menos una pregunta', 'error');
        return;
    }
    
    let hasErrors = false;
    
    questionElements.forEach((questionEl, index) => {
        const questionData = {
            id: `q${index + 1}`,
            type: questionEl.querySelector('.question-type').value,
            text: questionEl.querySelector('.question-text').value,
            points: parseInt(questionEl.querySelector('.question-points').value) || 10,
            explanation: questionEl.querySelector('.question-explanation').value
        };
        
        // Validate question data
        if (!questionData.type || !questionData.text) {
            hasErrors = true;
            return;
        }
        
        // Process question-specific data
        switch (questionData.type) {
            case 'multiple_choice':
                const options = [];
                const correctAnswer = questionEl.querySelector(`input[name*="correct"]:checked`);
                const optionInputs = questionEl.querySelectorAll('.option-item input[type="text"]');
                
                optionInputs.forEach((input, idx) => {
                    if (input.value.trim()) {
                        options.push(input.value.trim());
                    }
                });
                
                if (options.length < 2 || !correctAnswer) {
                    hasErrors = true;
                    return;
                }
                
                questionData.options = options;
                questionData.correctAnswer = parseInt(correctAnswer.value);
                break;
                
            case 'true_false':
                const tfCorrect = questionEl.querySelector(`input[name*="correct"]:checked`);
                if (!tfCorrect) {
                    hasErrors = true;
                    return;
                }
                questionData.correctAnswer = tfCorrect.value === 'true';
                break;
                
            case 'text':
                const keywords = questionEl.querySelector('.text-keywords')?.value || '';
                questionData.keywords = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
                break;
                
            case 'practical':
                const practicalInstructions = questionEl.querySelector('.practical-instructions')?.value || '';
                const requiresEvaluator = questionEl.querySelector('.requires-evaluator')?.checked || false;
                questionData.practicalInstructions = practicalInstructions;
                questionData.requiresEvaluator = requiresEvaluator;
                break;
        }
        
        questions.push(questionData);
    });
    
    if (hasErrors) {
        showTrainingMessage('❌ Complete todos los campos requeridos en las preguntas', 'error');
        return;
    }
    
    // Create new evaluation
    const newEvaluation = {
        id: Date.now(),
        ...formData,
        questions: questions,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
        questionsCount: questions.length
    };
    
    allEvaluations.push(newEvaluation);
    
    // Guardar en localStorage
    saveEvaluationsToStorage();
    
    closeModal('evaluationModal');
    showTrainingMessage('✅ Evaluación creada exitosamente', 'success');
    
    // Refresh evaluations list
    loadEvaluationsList();
}

// Filter evaluations
function filterEvaluations() {
    const searchTerm = document.getElementById('evaluation-search')?.value.toLowerCase() || '';
    const trainingFilter = document.getElementById('evaluation-training-filter')?.value || '';
    const statusFilter = document.getElementById('evaluation-status-filter')?.value || '';
    
    // This would filter the evaluations list in a real implementation
    console.log('🔍 [EVALUATIONS] Filtros aplicados:', { searchTerm, trainingFilter, statusFilter });
    // For now, just reload the list
    loadEvaluationsList();
}

// Evaluation action functions
function viewEvaluationDetails(evaluationId) {
    const evaluation = allEvaluations.find(e => e.id === evaluationId);
    if (!evaluation) {
        showTrainingMessage('❌ Evaluación no encontrada', 'error');
        return;
    }
    
    const training = allTrainings.find(t => t.id === evaluation.trainingId);
    
    const detailsHtml = `
        <div class="modal" id="evaluationDetailsModal" style="display: block;">
            <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>📋 Detalles de Evaluación: ${evaluation.title}</h3>
                    <button onclick="closeModal('evaluationDetailsModal')" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="card" style="margin-bottom: 20px;">
                        <h4>ℹ️ Información General</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div><strong>Capacitación:</strong> ${training ? training.title : 'N/A'}</div>
                            <div><strong>Estado:</strong> ${evaluation.status}</div>
                            <div><strong>Preguntas:</strong> ${evaluation.questionsCount}</div>
                            <div><strong>Puntos totales:</strong> ${evaluation.totalPoints}</div>
                            <div><strong>Tiempo límite:</strong> ${evaluation.timeLimit} minutos</div>
                            <div><strong>Orden aleatorio:</strong> ${evaluation.randomize ? 'Sí' : 'No'}</div>
                        </div>
                        ${evaluation.instructions ? `<div><strong>Instrucciones:</strong><br>${evaluation.instructions}</div>` : ''}
                    </div>
                    
                    <div class="card">
                        <h4>❓ Preguntas (${evaluation.questions.length})</h4>
                        ${evaluation.questions.map((question, index) => `
                            <div class="question-item" style="margin-bottom: 15px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <strong>Pregunta ${index + 1}</strong>
                                    <span style="background: #007bff; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px;">
                                        ${question.type} • ${question.points} pts
                                    </span>
                                </div>
                                <div style="margin-bottom: 10px;">${question.text}</div>
                                
                                ${question.type === 'multiple_choice' ? `
                                    <div style="margin-left: 20px;">
                                        ${question.options.map((option, idx) => `
                                            <div style="margin-bottom: 3px; ${idx === question.correctAnswer ? 'color: #28a745; font-weight: bold;' : ''}">
                                                ${idx === question.correctAnswer ? '✓' : '○'} ${String.fromCharCode(65 + idx)}. ${option}
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                
                                ${question.type === 'true_false' ? `
                                    <div style="margin-left: 20px; color: #28a745; font-weight: bold;">
                                        ✓ Respuesta correcta: ${question.correctAnswer ? 'Verdadero' : 'Falso'}
                                    </div>
                                ` : ''}
                                
                                ${question.type === 'text' && question.keywords?.length > 0 ? `
                                    <div style="margin-left: 20px;">
                                        <strong>Palabras clave:</strong> ${question.keywords.join(', ')}
                                    </div>
                                ` : ''}
                                
                                ${question.explanation ? `
                                    <div style="margin-left: 20px; margin-top: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 13px;">
                                        <strong>Explicación:</strong> ${question.explanation}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="closeModal('evaluationDetailsModal')" class="btn btn-primary">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', detailsHtml);
}

function editEvaluation(evaluationId) {
    console.log('✏️ [EVALUATIONS] Editar evaluación:', evaluationId);
    showTrainingMessage('✏️ Funcionalidad de edición en desarrollo', 'info');
}

function previewEvaluation(evaluationId) {
    const evaluation = allEvaluations.find(e => e.id === evaluationId);
    if (!evaluation) {
        showTrainingMessage('❌ Evaluación no encontrada', 'error');
        return;
    }
    
    // Create preview modal
    const previewHtml = `
        <div class="modal" id="evaluationPreviewModal" style="display: block;">
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>👁️ Vista Previa: ${evaluation.title}</h3>
                    <button onclick="closeModal('evaluationPreviewModal')" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="margin-top: 0;">📋 ${evaluation.title}</h4>
                        ${evaluation.instructions ? `<div style="margin-bottom: 10px;">${evaluation.instructions}</div>` : ''}
                        <div style="display: flex; gap: 20px; font-size: 14px; color: #6c757d;">
                            <span>⏱️ Tiempo: ${evaluation.timeLimit} minutos</span>
                            <span>❓ Preguntas: ${evaluation.questions.length}</span>
                            <span>💯 Puntos: ${evaluation.totalPoints}</span>
                        </div>
                    </div>
                    
                    <form id="previewEvaluationForm">
                        ${evaluation.questions.map((question, index) => {
                            return `
                                <div class="card" style="margin-bottom: 20px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                        <h5 style="margin: 0;">Pregunta ${index + 1}</h5>
                                        <span style="background: #007bff; color: white; padding: 3px 10px; border-radius: 15px; font-size: 12px;">
                                            ${question.points} puntos
                                        </span>
                                    </div>
                                    
                                    <div style="margin-bottom: 15px; font-size: 16px;">${question.text}</div>
                                    
                                    ${question.type === 'multiple_choice' ? `
                                        <div style="margin-left: 20px;">
                                            ${question.options.map((option, idx) => `
                                                <label style="display: block; margin-bottom: 8px; cursor: pointer;">
                                                    <input type="radio" name="preview-q${index}" value="${idx}" style="margin-right: 10px;">
                                                    ${String.fromCharCode(65 + idx)}. ${option}
                                                </label>
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                    
                                    ${question.type === 'true_false' ? `
                                        <div style="margin-left: 20px;">
                                            <label style="display: block; margin-bottom: 8px; cursor: pointer;">
                                                <input type="radio" name="preview-q${index}" value="true" style="margin-right: 10px;">
                                                Verdadero
                                            </label>
                                            <label style="display: block; margin-bottom: 8px; cursor: pointer;">
                                                <input type="radio" name="preview-q${index}" value="false" style="margin-right: 10px;">
                                                Falso
                                            </label>
                                        </div>
                                    ` : ''}
                                    
                                    ${question.type === 'text' ? `
                                        <textarea name="preview-q${index}" placeholder="Escriba su respuesta aquí..." rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                                    ` : ''}
                                    
                                    ${question.type === 'practical' ? `
                                        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
                                            <strong>📝 Evaluación Práctica</strong>
                                            ${question.practicalInstructions ? `<div style="margin-top: 8px;">${question.practicalInstructions}</div>` : ''}
                                            ${question.requiresEvaluator ? '<div style="margin-top: 8px; color: #1976d2;"><strong>⚠️ Requiere evaluación manual</strong></div>' : ''}
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </form>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                        <button onclick="closeModal('evaluationPreviewModal')" class="btn btn-secondary" style="margin-right: 10px;">Cerrar Vista Previa</button>
                        <button onclick="simulateEvaluationSubmission(${evaluation.id})" class="btn btn-primary">🎯 Simular Envío (Demo)</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', previewHtml);
}

function duplicateEvaluation(evaluationId) {
    const evaluation = allEvaluations.find(e => e.id === evaluationId);
    if (!evaluation) {
        showTrainingMessage('❌ Evaluación no encontrada', 'error');
        return;
    }
    
    const duplicatedEvaluation = {
        ...evaluation,
        id: Date.now(),
        title: `${evaluation.title} (Copia)`,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    allEvaluations.push(duplicatedEvaluation);
    
    // Guardar en localStorage
    saveEvaluationsToStorage();
    
    loadEvaluationsList();
    showTrainingMessage('✅ Evaluación duplicada como borrador', 'success');
}

function activateEvaluation(evaluationId) {
    const evaluation = allEvaluations.find(e => e.id === evaluationId);
    if (!evaluation) {
        showTrainingMessage('❌ Evaluación no encontrada', 'error');
        return;
    }
    
    evaluation.status = 'active';
    evaluation.updatedAt = new Date();
    
    // Guardar en localStorage
    saveEvaluationsToStorage();
    
    loadEvaluationsList();
    showTrainingMessage('✅ Evaluación activada', 'success');
}

function deleteEvaluation(evaluationId) {
    if (confirm('¿Está seguro de eliminar esta evaluación? Esta acción no se puede deshacer.')) {
        const index = allEvaluations.findIndex(e => e.id === evaluationId);
        if (index > -1) {
            const deletedEvaluation = allEvaluations[index];
            allEvaluations.splice(index, 1);
            
            // Guardar en localStorage
            saveEvaluationsToStorage();
            
            loadEvaluationsList();
            showTrainingMessage(`✅ Evaluación "${deletedEvaluation.title}" eliminada exitosamente`, 'success');
        }
    }
}

// Simulate evaluation submission
function simulateEvaluationSubmission(evaluationId) {
    const evaluation = allEvaluations.find(e => e.id === evaluationId);
    if (!evaluation) return;
    
    let score = 0;
    let totalPossible = 0;
    
    evaluation.questions.forEach((question, index) => {
        totalPossible += question.points;
        
        // Simulate random answers with 70% chance of correct
        const isCorrect = Math.random() > 0.3;
        if (isCorrect) {
            score += question.points;
        }
    });
    
    const percentage = Math.round((score / totalPossible) * 100);
    const passed = percentage >= 70; // Assuming 70% pass rate
    
    closeModal('evaluationPreviewModal');
    
    setTimeout(() => {
        showTrainingMessage(
            `🎯 Simulación completada: ${score}/${totalPossible} puntos (${percentage}%) - ${passed ? '✅ APROBADO' : '❌ REPROBADO'}`,
            passed ? 'success' : 'warning'
        );
    }, 500);
}

function showEmployeeTracking() {
    const contentArea = document.getElementById('training-content-area');
    
    contentArea.innerHTML = `
        <!-- Search and Filters -->
        <div class="card" style="margin-bottom: 20px;">
            <h3>👥 Seguimiento de Empleados</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                <div>
                    <label>🔍 Buscar empleado:</label>
                    <input type="text" id="employee-search" placeholder="Buscar por nombre o email..." onkeyup="filterEmployees()">
                </div>
                <div>
                    <label>🏢 Departamento:</label>
                    <select id="employee-department" onchange="filterEmployees()">
                        <option value="">Todos los departamentos</option>
                        <option value="IT">IT</option>
                        <option value="RRHH">RRHH</option>
                        <option value="Ventas">Ventas</option>
                        <option value="Operaciones">Operaciones</option>
                        <option value="Finanzas">Finanzas</option>
                    </select>
                </div>
                <div>
                    <label>📊 Estado de capacitación:</label>
                    <select id="employee-status" onchange="filterEmployees()">
                        <option value="">Todos los estados</option>
                        <option value="excellent">Excelente (90-100%)</option>
                        <option value="good">Bueno (75-89%)</option>
                        <option value="needs_improvement">Necesita mejora (<75%)</option>
                        <option value="overdue">Con vencimientos</option>
                    </select>
                </div>
                <div style="display: flex; align-items: end; gap: 10px;">
                    <button onclick="exportEmployeeReport()" class="btn btn-success">
                        📤 Exportar Reporte
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Summary Statistics -->
        <div class="card" style="margin-bottom: 20px;">
            <h4>📈 Estadísticas Generales</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                <div class="stat-card" style="background: linear-gradient(135deg, #28a745, #20c997); color: white;">
                    <div style="font-size: 2em; margin-bottom: 10px;">👥</div>
                    <div style="font-size: 1.8em; font-weight: bold;">156</div>
                    <div style="font-size: 12px; opacity: 0.9;">Empleados Totales</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white;">
                    <div style="font-size: 2em; margin-bottom: 10px;">📚</div>
                    <div style="font-size: 1.8em; font-weight: bold;">3.2</div>
                    <div style="font-size: 12px; opacity: 0.9;">Capacitaciones Promedio</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #ffc107, #fd7e14); color: white;">
                    <div style="font-size: 2em; margin-bottom: 10px;">🏆</div>
                    <div style="font-size: 1.8em; font-weight: bold;">87%</div>
                    <div style="font-size: 12px; opacity: 0.9;">Puntuación Promedio</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #17a2b8, #138496); color: white;">
                    <div style="font-size: 2em; margin-bottom: 10px;">✅</div>
                    <div style="font-size: 1.8em; font-weight: bold;">78%</div>
                    <div style="font-size: 12px; opacity: 0.9;">Tasa de Completación</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #dc3545, #c82333); color: white;">
                    <div style="font-size: 2em; margin-bottom: 10px;">⏰</div>
                    <div style="font-size: 1.8em; font-weight: bold;">12</div>
                    <div style="font-size: 12px; opacity: 0.9;">Con Vencimientos</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #6f42c1, #6610f2); color: white;">
                    <div style="font-size: 2em; margin-bottom: 10px;">🏅</div>
                    <div style="font-size: 1.8em; font-weight: bold;">89</div>
                    <div style="font-size: 12px; opacity: 0.9;">Certificados Activos</div>
                </div>
            </div>
        </div>
        
        <!-- Employee List -->
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h4>👤 Lista de Empleados</h4>
                <div>
                    <button onclick="viewTopPerformers()" class="btn btn-info">
                        🏆 Top Performers
                    </button>
                </div>
            </div>
            
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: #f8f9fa;">
                        <tr>
                            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Empleado</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">Departamento</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">Capacitaciones</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">Completadas</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">Promedio</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">Estado</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">Última Actividad</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="employees-table">
                        <!-- Employee data will be loaded here -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Load employee data
    setTimeout(() => {
        loadEmployeeTrackingData();
    }, 100);
}

// Employee tracking data and functions
function loadEmployeeTrackingData() {
    // Mock employee data
    const mockEmployees = [
        { 
            id: 1, 
            name: 'Juan Pérez', 
            email: 'juan.perez@empresa.com', 
            department: 'IT', 
            totalTrainings: 8, 
            completedTrainings: 7, 
            averageScore: 94, 
            lastActivity: new Date(Date.now() - 1*24*60*60*1000),
            overdueTrainings: 0,
            certificates: 6
        },
        { 
            id: 2, 
            name: 'María García', 
            email: 'maria.garcia@empresa.com', 
            department: 'RRHH', 
            totalTrainings: 6, 
            completedTrainings: 5, 
            averageScore: 91, 
            lastActivity: new Date(Date.now() - 2*24*60*60*1000),
            overdueTrainings: 1,
            certificates: 4
        },
        { 
            id: 3, 
            name: 'Carlos López', 
            email: 'carlos.lopez@empresa.com', 
            department: 'Ventas', 
            totalTrainings: 4, 
            completedTrainings: 2, 
            averageScore: 68, 
            lastActivity: new Date(Date.now() - 5*24*60*60*1000),
            overdueTrainings: 2,
            certificates: 1
        },
        { 
            id: 4, 
            name: 'Ana Martínez', 
            email: 'ana.martinez@empresa.com', 
            department: 'Operaciones', 
            totalTrainings: 7, 
            completedTrainings: 6, 
            averageScore: 85, 
            lastActivity: new Date(Date.now() - 3*24*60*60*1000),
            overdueTrainings: 0,
            certificates: 5
        },
        { 
            id: 5, 
            name: 'Luis Rodriguez', 
            email: 'luis.rodriguez@empresa.com', 
            department: 'Finanzas', 
            totalTrainings: 5, 
            completedTrainings: 4, 
            averageScore: 82, 
            lastActivity: new Date(Date.now() - 1*24*60*60*1000),
            overdueTrainings: 1,
            certificates: 3
        },
        { 
            id: 6, 
            name: 'Sofia Hernández', 
            email: 'sofia.hernandez@empresa.com', 
            department: 'IT', 
            totalTrainings: 9, 
            completedTrainings: 8, 
            averageScore: 96, 
            lastActivity: new Date(),
            overdueTrainings: 0,
            certificates: 7
        },
        { 
            id: 7, 
            name: 'Miguel Torres', 
            email: 'miguel.torres@empresa.com', 
            department: 'Ventas', 
            totalTrainings: 3, 
            completedTrainings: 1, 
            averageScore: 54, 
            lastActivity: new Date(Date.now() - 10*24*60*60*1000),
            overdueTrainings: 2,
            certificates: 0
        },
        { 
            id: 8, 
            name: 'Laura Jiménez', 
            email: 'laura.jimenez@empresa.com', 
            department: 'RRHH', 
            totalTrainings: 6, 
            completedTrainings: 5, 
            averageScore: 89, 
            lastActivity: new Date(Date.now() - 2*24*60*60*1000),
            overdueTrainings: 0,
            certificates: 4
        }
    ];
    
    renderEmployeeTable(mockEmployees);
}

function renderEmployeeTable(employees) {
    const tableBody = document.getElementById('employees-table');
    if (!tableBody) return;
    
    tableBody.innerHTML = employees.map(employee => {
        const completionRate = Math.round((employee.completedTrainings / employee.totalTrainings) * 100);
        const statusInfo = getEmployeeStatusInfo(employee);
        const daysSinceActivity = Math.floor((new Date() - employee.lastActivity) / (1000 * 60 * 60 * 24));
        
        return `
            <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 12px; border: 1px solid #dee2e6;">
                    <div style="font-weight: 600;">${employee.name}</div>
                    <div style="font-size: 12px; color: #6c757d;">${employee.email}</div>
                </td>
                <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">
                    <span style="background: #e9ecef; padding: 4px 8px; border-radius: 10px; font-size: 12px;">
                        ${employee.department}
                    </span>
                </td>
                <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">
                    <div style="font-weight: bold;">${employee.totalTrainings}</div>
                    <div style="font-size: 11px; color: #6c757d;">asignadas</div>
                </td>
                <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">
                    <div style="font-weight: bold; color: ${completionRate >= 80 ? '#28a745' : completionRate >= 60 ? '#ffc107' : '#dc3545'};">
                        ${employee.completedTrainings}/${employee.totalTrainings}
                    </div>
                    <div style="font-size: 11px; color: #6c757d;">${completionRate}%</div>
                </td>
                <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">
                    <div style="font-weight: bold; color: ${employee.averageScore >= 80 ? '#28a745' : employee.averageScore >= 70 ? '#ffc107' : '#dc3545'};">
                        ${employee.averageScore}%
                    </div>
                </td>
                <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">
                    <span style="background: ${statusInfo.color}; color: white; padding: 4px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">
                        ${statusInfo.text}
                    </span>
                    ${employee.overdueTrainings > 0 ? `
                        <div style="margin-top: 3px;">
                            <span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px;">
                                ${employee.overdueTrainings} vencida${employee.overdueTrainings > 1 ? 's' : ''}
                            </span>
                        </div>
                    ` : ''}
                </td>
                <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center; font-size: 12px;">
                    ${daysSinceActivity === 0 ? 'Hoy' : 
                      daysSinceActivity === 1 ? 'Ayer' : 
                      `${daysSinceActivity} días`}
                </td>
                <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">
                    <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="viewEmployeeProfile(${employee.id})" class="btn btn-sm btn-info" title="Ver perfil">
                            👁️
                        </button>
                        <button onclick="assignTrainingToEmployee(${employee.id})" class="btn btn-sm btn-primary" title="Asignar capacitación">
                            ➕
                        </button>
                        <button onclick="sendEmployeeReminder(${employee.id})" class="btn btn-sm btn-warning" title="Enviar recordatorio">
                            📢
                        </button>
                        ${employee.certificates > 0 ? `
                            <button onclick="viewEmployeeCertificates(${employee.id})" class="btn btn-sm btn-success" title="Ver certificados">
                                🏆
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getEmployeeStatusInfo(employee) {
    const completionRate = (employee.completedTrainings / employee.totalTrainings) * 100;
    
    if (employee.overdueTrainings > 0) {
        return { text: 'VENCIDO', color: '#dc3545' };
    } else if (employee.averageScore >= 90 && completionRate >= 90) {
        return { text: 'EXCELENTE', color: '#28a745' };
    } else if (employee.averageScore >= 75 && completionRate >= 75) {
        return { text: 'BUENO', color: '#17a2b8' };
    } else if (employee.averageScore >= 60 || completionRate >= 60) {
        return { text: 'REGULAR', color: '#ffc107' };
    } else {
        return { text: 'NECESITA MEJORA', color: '#fd7e14' };
    }
}

function filterEmployees() {
    console.log('🔍 [EMPLOYEE-TRACKING] Filtrando empleados...');
    // In a real implementation, this would filter the employee table
    showTrainingMessage('🔍 Filtros aplicados', 'info');
}

function exportEmployeeReport() {
    showTrainingMessage('📤 Exportando reporte de empleados...', 'info');
    
    setTimeout(() => {
        showTrainingMessage('📤 Reporte de empleados exportado exitosamente', 'success');
    }, 1500);
}

function viewTopPerformers() {
    const topPerformersHtml = `
        <div class="modal" id="topPerformersModal" style="display: block;">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>🏆 Top Performers del Mes</h3>
                    <button onclick="closeModal('topPerformersModal')" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="card">
                        <h4>🥇 Empleados Destacados</h4>
                        <div style="display: grid; gap: 15px;">
                            <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: linear-gradient(135deg, #ffd700, #ffed4e); border-radius: 10px; color: #333;">
                                <div style="font-size: 2em;">🥇</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: bold; font-size: 1.1em;">Sofia Hernández</div>
                                    <div style="font-size: 13px;">IT • 96% promedio • 8/9 completadas</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-weight: bold; font-size: 1.2em;">96%</div>
                                    <div style="font-size: 11px;">Puntuación</div>
                                </div>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: linear-gradient(135deg, #c0c0c0, #e5e5e5); border-radius: 10px; color: #333;">
                                <div style="font-size: 2em;">🥈</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: bold; font-size: 1.1em;">Juan Pérez</div>
                                    <div style="font-size: 13px;">IT • 94% promedio • 7/8 completadas</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-weight: bold; font-size: 1.2em;">94%</div>
                                    <div style="font-size: 11px;">Puntuación</div>
                                </div>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: linear-gradient(135deg, #cd7f32, #deb887); border-radius: 10px; color: #333;">
                                <div style="font-size: 2em;">🥉</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: bold; font-size: 1.1em;">María García</div>
                                    <div style="font-size: 13px;">RRHH • 91% promedio • 5/6 completadas</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-weight: bold; font-size: 1.2em;">91%</div>
                                    <div style="font-size: 11px;">Puntuación</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="closeModal('topPerformersModal')" class="btn btn-primary">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', topPerformersHtml);
}

function viewEmployeeProfile(employeeId) {
    console.log('👁️ [EMPLOYEE-TRACKING] Ver perfil del empleado:', employeeId);
    showTrainingMessage('👁️ Abriendo perfil de empleado...', 'info');
}

function assignTrainingToEmployee(employeeId) {
    console.log('➕ [EMPLOYEE-TRACKING] Asignar capacitación al empleado:', employeeId);
    showTrainingMessage('➕ Funcionalidad de asignación individual en desarrollo', 'info');
}

function sendEmployeeReminder(employeeId) {
    console.log('📢 [EMPLOYEE-TRACKING] Enviar recordatorio al empleado:', employeeId);
    showTrainingMessage('📢 Recordatorio enviado exitosamente', 'success');
}

function viewEmployeeCertificates(employeeId) {
    console.log('🏆 [EMPLOYEE-TRACKING] Ver certificados del empleado:', employeeId);
    showTrainingMessage('🏆 Abriendo certificados del empleado...', 'info');
}

function showTrainingReports() {
    const contentArea = document.getElementById('training-content-area');
    
    contentArea.innerHTML = `
        <!-- Report Controls -->
        <div class="card" style="margin-bottom: 20px;">
            <h3>📊 Centro de Reportes</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                <div>
                    <label>📅 Período de análisis:</label>
                    <select id="report-period" onchange="updateReportPeriod()">
                        <option value="week">Última semana</option>
                        <option value="month" selected>Último mes</option>
                        <option value="quarter">Último trimestre</option>
                        <option value="year">Último año</option>
                        <option value="custom">Período personalizado</option>
                    </select>
                </div>
                <div>
                    <label>📂 Categoría:</label>
                    <select id="report-category" onchange="updateReportCategory()">
                        <option value="">Todas las categorías</option>
                        ${trainingCategories.map(cat => 
                            `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`
                        ).join('')}
                    </select>
                </div>
                <div>
                    <label>📈 Tipo de reporte:</label>
                    <select id="report-type" onchange="updateReportType()">
                        <option value="overview">Vista general</option>
                        <option value="completion">Cumplimiento</option>
                        <option value="performance">Rendimiento</option>
                        <option value="compliance">Compliance</option>
                    </select>
                </div>
                <div style="display: flex; align-items: end; gap: 10px;">
                    <button onclick="generateReport()" class="btn btn-primary">
                        📊 Generar Reporte
                    </button>
                    <button onclick="exportReport()" class="btn btn-success">
                        📤 Exportar
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Key Metrics -->
        <div class="card" style="margin-bottom: 20px;">
            <h4>🎯 Métricas Clave</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
                <div class="stat-card" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white;">
                    <div style="font-size: 2.5em; margin-bottom: 10px;">📚</div>
                    <div style="font-size: 2em; font-weight: bold;" id="metrics-total-trainings">${allTrainings.length}</div>
                    <div style="font-size: 12px; opacity: 0.9;">Capacitaciones Totales</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #28a745, #20c997); color: white;">
                    <div style="font-size: 2.5em; margin-bottom: 10px;">✅</div>
                    <div style="font-size: 2em; font-weight: bold;" id="metrics-completion-rate">78%</div>
                    <div style="font-size: 12px; opacity: 0.9;">Tasa de Completación</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #ffc107, #fd7e14); color: white;">
                    <div style="font-size: 2.5em; margin-bottom: 10px;">🏆</div>
                    <div style="font-size: 2em; font-weight: bold;" id="metrics-avg-score">87%</div>
                    <div style="font-size: 12px; opacity: 0.9;">Puntuación Promedio</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #dc3545, #e74c3c); color: white;">
                    <div style="font-size: 2.5em; margin-bottom: 10px;">⏰</div>
                    <div style="font-size: 2em; font-weight: bold;" id="metrics-overdue">5</div>
                    <div style="font-size: 12px; opacity: 0.9;">Capacitaciones Vencidas</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #6f42c1, #6610f2); color: white;">
                    <div style="font-size: 2.5em; margin-bottom: 10px;">👥</div>
                    <div style="font-size: 2em; font-weight: bold;" id="metrics-active-participants">142</div>
                    <div style="font-size: 12px; opacity: 0.9;">Participantes Activos</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #17a2b8, #138496); color: white;">
                    <div style="font-size: 2.5em; margin-bottom: 10px;">🏅</div>
                    <div style="font-size: 2em; font-weight: bold;" id="metrics-certificates">89</div>
                    <div style="font-size: 12px; opacity: 0.9;">Certificados Emitidos</div>
                </div>
            </div>
        </div>
        
        <!-- Charts and Analytics -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <!-- Completion Trends -->
            <div class="card">
                <h4>📈 Tendencia de Completación</h4>
                <div id="completion-trend-chart" style="height: 250px; display: flex; align-items: center; justify-content: center; background: #f8f9fa; border-radius: 8px;">
                    <div style="text-align: center;">
                        <canvas id="completionChart" width="400" height="200"></canvas>
                        <div style="margin-top: 10px; font-size: 12px; color: #6c757d;">
                            Datos de los últimos 6 meses
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Category Distribution -->
            <div class="card">
                <h4>📊 Distribución por Categoría</h4>
                <div id="category-distribution-chart" style="height: 250px; display: flex; align-items: center; justify-content: center; background: #f8f9fa; border-radius: 8px;">
                    <div style="text-align: center;">
                        <canvas id="categoryChart" width="200" height="200"></canvas>
                        <div style="margin-top: 10px; font-size: 12px; color: #6c757d;">
                            Capacitaciones por categoría
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Performance Analysis -->
        <div class="card" style="margin-bottom: 20px;">
            <h4>🎯 Análisis de Rendimiento</h4>
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                <div>
                    <h5>📊 Top 5 Capacitaciones por Rendimiento</h5>
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 15px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 2px solid #dee2e6;">
                                    <th style="text-align: left; padding: 8px;">Capacitación</th>
                                    <th style="text-align: center; padding: 8px;">Participantes</th>
                                    <th style="text-align: center; padding: 8px;">Completación</th>
                                    <th style="text-align: center; padding: 8px;">Promedio</th>
                                </tr>
                            </thead>
                            <tbody id="top-trainings-table">
                                ${allTrainings.slice(0, 5).map((training, index) => `
                                    <tr style="border-bottom: 1px solid #dee2e6;">
                                        <td style="padding: 8px;">
                                            <div style="font-weight: 600;">${training.title}</div>
                                            <div style="font-size: 12px; color: #6c757d;">${trainingCategories.find(c => c.id === training.category)?.name || 'General'}</div>
                                        </td>
                                        <td style="text-align: center; padding: 8px;">${training.participants}</td>
                                        <td style="text-align: center; padding: 8px;">
                                            <span style="color: ${training.progress >= 80 ? '#28a745' : training.progress >= 50 ? '#ffc107' : '#dc3545'}; font-weight: bold;">
                                                ${training.progress}%
                                            </span>
                                        </td>
                                        <td style="text-align: center; padding: 8px;">
                                            <span style="font-weight: bold;">87%</span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div>
                    <h5>⚠️ Alertas y Recomendaciones</h5>
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 15px;">
                        <div style="margin-bottom: 15px; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                            <div style="font-weight: bold; color: #856404; margin-bottom: 5px;">⚠️ Atención Requerida</div>
                            <div style="font-size: 13px; color: #856404;">
                                5 capacitaciones tienen fechas vencidas
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 15px; padding: 10px; background: #d1ecf1; border-left: 4px solid #bee5eb; border-radius: 4px;">
                            <div style="font-weight: bold; color: #0c5460; margin-bottom: 5px;">💡 Recomendación</div>
                            <div style="font-size: 13px; color: #0c5460;">
                                Considera crear más contenido de Seguridad Laboral
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 15px; padding: 10px; background: #d4edda; border-left: 4px solid #c3e6cb; border-radius: 4px;">
                            <div style="font-weight: bold; color: #155724; margin-bottom: 5px;">✅ Excelente</div>
                            <div style="font-size: 13px; color: #155724;">
                                Tasa de completación está por encima del objetivo (75%)
                            </div>
                        </div>
                        
                        <div style="padding: 10px; background: #f8d7da; border-left: 4px solid #f5c6cb; border-radius: 4px;">
                            <div style="font-weight: bold; color: #721c24; margin-bottom: 5px;">🔴 Crítico</div>
                            <div style="font-size: 13px; color: #721c24;">
                                2 capacitaciones obligatorias tienen baja participación
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Detailed Reports -->
        <div class="card">
            <h4>📋 Reportes Detallados</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
                <div class="stat-card" onclick="generateDetailedReport('compliance')" style="cursor: pointer; border: 2px solid #e9ecef; transition: all 0.3s;">
                    <div style="font-size: 2em; margin-bottom: 10px;">⚖️</div>
                    <h5 style="margin-bottom: 10px;">Reporte de Cumplimiento</h5>
                    <p style="font-size: 13px; color: #6c757d; margin: 0;">
                        Análisis detallado de cumplimiento regulatorio y capacitaciones obligatorias
                    </p>
                </div>
                
                <div class="stat-card" onclick="generateDetailedReport('performance')" style="cursor: pointer; border: 2px solid #e9ecef; transition: all 0.3s;">
                    <div style="font-size: 2em; margin-bottom: 10px;">📈</div>
                    <h5 style="margin-bottom: 10px;">Reporte de Rendimiento</h5>
                    <p style="font-size: 13px; color: #6c757d; margin: 0;">
                        Análisis de calificaciones, tiempo de completación y efectividad
                    </p>
                </div>
                
                <div class="stat-card" onclick="generateDetailedReport('participation')" style="cursor: pointer; border: 2px solid #e9ecef; transition: all 0.3s;">
                    <div style="font-size: 2em; margin-bottom: 10px;">👥</div>
                    <h5 style="margin-bottom: 10px;">Reporte de Participación</h5>
                    <p style="font-size: 13px; color: #6c757d; margin: 0;">
                        Estadísticas de participación por departamento y empleado
                    </p>
                </div>
                
                <div class="stat-card" onclick="generateDetailedReport('certificates')" style="cursor: pointer; border: 2px solid #e9ecef; transition: all 0.3s;">
                    <div style="font-size: 2em; margin-bottom: 10px;">🏆</div>
                    <h5 style="margin-bottom: 10px;">Reporte de Certificaciones</h5>
                    <p style="font-size: 13px; color: #6c757d; margin: 0;">
                        Certificados emitidos, vigencias y renovaciones necesarias
                    </p>
                </div>
            </div>
        </div>
    `;
    
    // Initialize charts
    setTimeout(() => {
        initializeReportCharts();
    }, 100);
}

// Report support functions
function initializeReportCharts() {
    // Initialize completion trend chart
    const completionCtx = document.getElementById('completionChart');
    if (completionCtx) {
        const ctx = completionCtx.getContext('2d');
        
        // Simple line chart simulation
        ctx.clearRect(0, 0, 400, 200);
        
        // Draw axes
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, 170);
        ctx.lineTo(370, 170); // X axis
        ctx.moveTo(30, 20);
        ctx.lineTo(30, 170); // Y axis
        ctx.stroke();
        
        // Draw trend line
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const points = [
            {x: 50, y: 150},
            {x: 100, y: 140},
            {x: 150, y: 120},
            {x: 200, y: 110},
            {x: 250, y: 90},
            {x: 300, y: 70},
            {x: 350, y: 60}
        ];
        
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        
        // Draw data points
        ctx.fillStyle = '#667eea';
        points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        // Add labels
        ctx.fillStyle = '#6c757d';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'].forEach((label, index) => {
            ctx.fillText(label, 50 + index * 50, 185);
        });
    }
    
    // Initialize category pie chart
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
        const ctx = categoryCtx.getContext('2d');
        const centerX = 100;
        const centerY = 100;
        const radius = 80;
        
        // Calculate category distribution
        const categoryData = trainingCategories.map(category => {
            const count = allTrainings.filter(t => t.category === category.id).length;
            return { ...category, count };
        });
        
        const total = categoryData.reduce((sum, cat) => sum + cat.count, 0);
        let currentAngle = 0;
        
        categoryData.forEach(category => {
            if (category.count > 0) {
                const sliceAngle = (category.count / total) * 2 * Math.PI;
                
                // Draw slice
                ctx.fillStyle = category.color;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
                ctx.closePath();
                ctx.fill();
                
                // Draw label
                const labelAngle = currentAngle + sliceAngle / 2;
                const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
                const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
                
                ctx.fillStyle = 'white';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(category.count.toString(), labelX, labelY);
                
                currentAngle += sliceAngle;
            }
        });
    }
}

function updateReportPeriod() {
    const period = document.getElementById('report-period').value;
    console.log('📊 [REPORTS] Actualizando período:', period);
    showTrainingMessage(`📊 Período actualizado: ${period}`, 'info');
}

function updateReportCategory() {
    const category = document.getElementById('report-category').value;
    console.log('📊 [REPORTS] Actualizando categoría:', category);
    showTrainingMessage('📊 Filtros aplicados', 'info');
}

function updateReportType() {
    const type = document.getElementById('report-type').value;
    console.log('📊 [REPORTS] Actualizando tipo de reporte:', type);
    showTrainingMessage('📊 Tipo de reporte actualizado', 'info');
}

function generateReport() {
    const period = document.getElementById('report-period').value;
    const category = document.getElementById('report-category').value;
    const type = document.getElementById('report-type').value;
    
    console.log('📊 [REPORTS] Generando reporte:', { period, category, type });
    showTrainingMessage('📊 Generando reporte personalizado...', 'info');
    
    setTimeout(() => {
        showTrainingMessage('✅ Reporte generado exitosamente', 'success');
    }, 2000);
}

function exportReport() {
    showTrainingMessage('📤 Exportando reporte...', 'info');
    
    setTimeout(() => {
        showTrainingMessage('📤 Reporte exportado exitosamente', 'success');
    }, 1500);
}

function generateDetailedReport(reportType) {
    const reportTitles = {
        compliance: 'Cumplimiento Regulatorio',
        performance: 'Análisis de Rendimiento',
        participation: 'Estadísticas de Participación',
        certificates: 'Reporte de Certificaciones'
    };
    
    const title = reportTitles[reportType] || 'Reporte Detallado';
    
    showTrainingMessage(`📋 Generando ${title}...`, 'info');
    
    // Simulate report generation
    setTimeout(() => {
        const reportModal = `
            <div class="modal" id="detailedReportModal" style="display: block;">
                <div class="modal-content" style="max-width: 1000px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3>📋 ${title}</h3>
                        <button onclick="closeModal('detailedReportModal')" class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="card" style="margin-bottom: 20px;">
                            <h4>📊 Resumen Ejecutivo</h4>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                <p>Este reporte presenta un análisis detallado de <strong>${title.toLowerCase()}</strong> 
                                basado en los datos de capacitación del sistema.</p>
                                
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                                    <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
                                        <div style="font-size: 1.8em; font-weight: bold; color: #667eea;">78%</div>
                                        <div style="font-size: 12px; color: #6c757d;">Indicador Principal</div>
                                    </div>
                                    <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
                                        <div style="font-size: 1.8em; font-weight: bold; color: #28a745;">142</div>
                                        <div style="font-size: 12px; color: #6c757d;">Total Participantes</div>
                                    </div>
                                    <div style="text-align: center; padding: 10px; background: white; border-radius: 8px;">
                                        <div style="font-size: 1.8em; font-weight: bold; color: #ffc107;">89</div>
                                        <div style="font-size: 12px; color: #6c757d;">Completados</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card" style="margin-bottom: 20px;">
                            <h4>📈 Análisis Detallado</h4>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                ${getReportSpecificContent(reportType)}
                            </div>
                        </div>
                        
                        <div class="card">
                            <h4>💡 Recomendaciones</h4>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                ${getReportRecommendations(reportType)}
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 20px;">
                            <button onclick="exportDetailedReport('${reportType}')" class="btn btn-success" style="margin-right: 10px;">
                                📤 Exportar PDF
                            </button>
                            <button onclick="scheduleReport('${reportType}')" class="btn btn-info" style="margin-right: 10px;">
                                📅 Programar Reporte
                            </button>
                            <button onclick="closeModal('detailedReportModal')" class="btn btn-secondary">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', reportModal);
        showTrainingMessage(`✅ ${title} generado exitosamente`, 'success');
    }, 2000);
}

function getReportSpecificContent(reportType) {
    switch (reportType) {
        case 'compliance':
            return `
                <h5>⚖️ Estado de Cumplimiento</h5>
                <ul>
                    <li><strong>Capacitaciones Obligatorias:</strong> 8 activas, 6 completadas al 100%</li>
                    <li><strong>Cumplimiento Regulatorio:</strong> 92% de empleados al día</li>
                    <li><strong>Certificaciones Vencidas:</strong> 3 empleados requieren renovación</li>
                    <li><strong>Próximos Vencimientos:</strong> 12 certificaciones en los próximos 30 días</li>
                </ul>
            `;
        case 'performance':
            return `
                <h5>📈 Indicadores de Rendimiento</h5>
                <ul>
                    <li><strong>Puntuación Promedio:</strong> 87% (objetivo: 80%)</li>
                    <li><strong>Tiempo Promedio de Completación:</strong> 4.2 horas</li>
                    <li><strong>Tasa de Aprobación al Primer Intento:</strong> 73%</li>
                    <li><strong>Capacitaciones con Mayor Dificultad:</strong> Seguridad Industrial (65% aprobación)</li>
                </ul>
            `;
        case 'participation':
            return `
                <h5>👥 Análisis de Participación</h5>
                <ul>
                    <li><strong>Participación por Departamento:</strong> IT (95%), RRHH (88%), Ventas (76%)</li>
                    <li><strong>Empleados Más Activos:</strong> 25 empleados han completado +5 capacitaciones</li>
                    <li><strong>Tasa de Abandono:</strong> 12% (objetivo: <15%)</li>
                    <li><strong>Tiempo Promedio de Respuesta:</strong> 2.3 días</li>
                </ul>
            `;
        case 'certificates':
            return `
                <h5>🏆 Estado de Certificaciones</h5>
                <ul>
                    <li><strong>Certificados Emitidos:</strong> 89 en el último mes</li>
                    <li><strong>Certificados Vigentes:</strong> 234 activos</li>
                    <li><strong>Renovaciones Pendientes:</strong> 15 certificados</li>
                    <li><strong>Certificaciones por Categoría:</strong> Seguridad (35%), Técnicas (28%), Liderazgo (20%)</li>
                </ul>
            `;
        default:
            return '<p>Contenido del reporte en generación...</p>';
    }
}

function getReportRecommendations(reportType) {
    switch (reportType) {
        case 'compliance':
            return `
                <div style="padding: 10px; background: #d4edda; border-left: 4px solid #c3e6cb; border-radius: 4px; margin-bottom: 10px;">
                    <strong>✅ Recomendación Principal:</strong> Implementar recordatorios automáticos 30 días antes del vencimiento
                </div>
                <div style="padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                    <strong>⚠️ Atención Necesaria:</strong> Revisar proceso de renovación de certificaciones en Seguridad Industrial
                </div>
            `;
        case 'performance':
            return `
                <div style="padding: 10px; background: #d4edda; border-left: 4px solid #c3e6cb; border-radius: 4px; margin-bottom: 10px;">
                    <strong>✅ Excelente Rendimiento:</strong> Los objetivos de calificación se están superando consistentemente
                </div>
                <div style="padding: 10px; background: #d1ecf1; border-left: 4px solid #bee5eb; border-radius: 4px;">
                    <strong>💡 Oportunidad:</strong> Considerar aumentar la dificultad de evaluaciones básicas
                </div>
            `;
        case 'participation':
            return `
                <div style="padding: 10px; background: #d4edda; border-left: 4px solid #c3e6cb; border-radius: 4px; margin-bottom: 10px;">
                    <strong>✅ Buena Participación:</strong> La mayoría de departamentos superan el 75% de participación
                </div>
                <div style="padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                    <strong>⚠️ Mejorar:</strong> Implementar incentivos para el departamento de Ventas
                </div>
            `;
        case 'certificates':
            return `
                <div style="padding: 10px; background: #d4edda; border-left: 4px solid #c3e6cb; border-radius: 4px; margin-bottom: 10px;">
                    <strong>✅ Proceso Eficiente:</strong> El sistema de certificación está funcionando correctamente
                </div>
                <div style="padding: 10px; background: #d1ecf1; border-left: 4px solid #bee5eb; border-radius: 4px;">
                    <strong>💡 Sugerencia:</strong> Implementar certificaciones digitales con QR para verificación
                </div>
            `;
        default:
            return '<p>Recomendaciones específicas se generarán automáticamente...</p>';
    }
}

function exportDetailedReport(reportType) {
    showTrainingMessage(`📤 Exportando reporte de ${reportType}...`, 'info');
    
    setTimeout(() => {
        showTrainingMessage('📤 Reporte exportado como PDF', 'success');
    }, 1500);
}

function scheduleReport(reportType) {
    showTrainingMessage(`📅 Programando reporte de ${reportType}...`, 'info');
    
    setTimeout(() => {
        showTrainingMessage('📅 Reporte programado para generación automática', 'success');
    }, 1000);
}

function showTrainingCalendar() {
    const contentArea = document.getElementById('training-content-area');
    
    contentArea.innerHTML = `
        <!-- Calendar Controls -->
        <div class="card" style="margin-bottom: 20px;">
            <h3>📅 Calendario de Capacitaciones</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div style="display: flex; gap: 15px; align-items: center;">
                    <div>
                        <label>📅 Vista:</label>
                        <select id="calendar-view" onchange="changeCalendarView()">
                            <option value="month">Mes</option>
                            <option value="week">Semana</option>
                            <option value="day">Día</option>
                            <option value="list">Lista</option>
                        </select>
                    </div>
                    <div>
                        <label>📂 Filtrar por categoría:</label>
                        <select id="calendar-category" onchange="filterCalendarEvents()">
                            <option value="">Todas</option>
                            ${trainingCategories.map(cat => 
                                `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="goToPreviousMonth()" class="btn btn-sm btn-secondary">← Anterior</button>
                    <button onclick="goToToday()" class="btn btn-sm btn-info">Hoy</button>
                    <button onclick="goToNextMonth()" class="btn btn-sm btn-secondary">Siguiente →</button>
                </div>
            </div>
        </div>
        
        <!-- Calendar View -->
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h4 id="calendar-month-year" style="margin: 0; color: #667eea; font-size: 1.5em;"><!-- Month Year --></h4>
                <div style="display: flex; gap: 10px;">
                    <button onclick="showModal('trainingModal')" class="btn btn-primary">
                        ➕ Nueva Capacitación
                    </button>
                    <button onclick="exportCalendar()" class="btn btn-success">
                        📤 Exportar Calendario
                    </button>
                </div>
            </div>
            
            <!-- Calendar Grid -->
            <div id="calendar-container" style="background: white; border-radius: 8px; overflow: hidden;">
                <!-- Calendar will be rendered here -->
            </div>
            
            <!-- Legend -->
            <div style="display: flex; gap: 20px; justify-content: center; margin-top: 20px; flex-wrap: wrap;">
                ${trainingCategories.map(cat => `
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <div style="width: 12px; height: 12px; background: ${cat.color}; border-radius: 3px;"></div>
                        <span style="font-size: 13px;">${cat.icon} ${cat.name}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Today's Events -->
        <div class="card" style="margin-top: 20px;">
            <h4>🎯 Eventos de Hoy</h4>
            <div id="today-events">
                <!-- Today's events will be loaded here -->
            </div>
        </div>
        
        <!-- Upcoming Deadlines -->
        <div class="card" style="margin-top: 20px;">
            <h4>⏰ Próximos Vencimientos (7 días)</h4>
            <div id="upcoming-deadlines-calendar">
                <!-- Upcoming deadlines will be loaded here -->
            </div>
        </div>
    `;
    
    // Initialize calendar
    setTimeout(() => {
        initializeTrainingCalendar();
    }, 100);
}

// Calendar implementation
let currentCalendarDate = new Date();
let calendarEvents = [];

function initializeTrainingCalendar() {
    // Generate mock calendar events from trainings
    calendarEvents = allTrainings.map(training => {
        const startDate = new Date(training.startDate || Date.now());
        const deadline = new Date(training.deadline || Date.now() + 7*24*60*60*1000);
        const category = trainingCategories.find(c => c.id === training.category);
        
        return [
            {
                id: `start-${training.id}`,
                trainingId: training.id,
                title: `📚 Inicio: ${training.title}`,
                date: startDate,
                type: 'start',
                category: training.category,
                color: category?.color || '#667eea',
                training: training
            },
            {
                id: `deadline-${training.id}`,
                trainingId: training.id,
                title: `⏰ Vencimiento: ${training.title}`,
                date: deadline,
                type: 'deadline',
                category: training.category,
                color: '#dc3545',
                training: training
            }
        ];
    }).flat();
    
    // Add some additional events
    calendarEvents.push(
        {
            id: 'meeting-1',
            title: '👥 Reunión de Instructores',
            date: new Date(Date.now() + 3*24*60*60*1000),
            type: 'meeting',
            color: '#28a745'
        },
        {
            id: 'workshop-1',
            title: '🎯 Taller: Nuevas Metodologías',
            date: new Date(Date.now() + 5*24*60*60*1000),
            type: 'workshop',
            color: '#ffc107'
        }
    );
    
    renderCalendar();
    loadTodayEvents();
    loadUpcomingDeadlinesCalendar();
}

function renderCalendar() {
    const container = document.getElementById('calendar-container');
    const monthYearElement = document.getElementById('calendar-month-year');
    
    if (!container) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // Update month/year display
    monthYearElement.textContent = currentCalendarDate.toLocaleDateString('es-ES', { 
        month: 'long', 
        year: 'numeric' 
    }).toUpperCase();
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    // Calendar header
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    let calendarHTML = `
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #dee2e6;">
            ${weekDays.map(day => `
                <div style="background: #667eea; color: white; padding: 10px; text-align: center; font-weight: bold; font-size: 14px;">
                    ${day}
                </div>
            `).join('')}
    `;
    
    // Calendar days
    let dayCount = 1;
    let totalCells = Math.ceil((daysInMonth + startDayOfWeek) / 7) * 7;
    
    for (let i = 0; i < totalCells; i++) {
        const isCurrentMonth = i >= startDayOfWeek && dayCount <= daysInMonth;
        const isToday = isCurrentMonth && 
            dayCount === new Date().getDate() && 
            month === new Date().getMonth() && 
            year === new Date().getFullYear();
        
        let dayEvents = [];
        if (isCurrentMonth) {
            const currentDate = new Date(year, month, dayCount);
            dayEvents = calendarEvents.filter(event => 
                event.date.toDateString() === currentDate.toDateString()
            );
        }
        
        calendarHTML += `
            <div style="
                background: white; 
                min-height: 120px; 
                padding: 8px; 
                position: relative;
                ${isToday ? 'background: #e3f2fd; border: 2px solid #2196f3;' : ''}
                ${!isCurrentMonth ? 'background: #f8f9fa; color: #6c757d;' : ''}
            ">
                <div style="font-weight: ${isToday ? 'bold' : 'normal'}; color: ${isToday ? '#2196f3' : 'inherit'};">
                    ${isCurrentMonth ? dayCount : ''}
                </div>
                ${dayEvents.map(event => `
                    <div onclick="showEventDetails('${event.id}')" style="
                        background: ${event.color}; 
                        color: white; 
                        padding: 2px 6px; 
                        margin: 2px 0; 
                        border-radius: 3px; 
                        font-size: 10px; 
                        cursor: pointer;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    " title="${event.title}">
                        ${event.title}
                    </div>
                `).join('')}
            </div>
        `;
        
        if (isCurrentMonth) dayCount++;
    }
    
    calendarHTML += '</div>';
    container.innerHTML = calendarHTML;
}

function changeCalendarView() {
    const view = document.getElementById('calendar-view').value;
    console.log('📅 [CALENDAR] Cambiando vista:', view);
    
    // In a full implementation, this would switch between different calendar views
    showTrainingMessage(`📅 Vista cambiada a: ${view}`, 'info');
}

function filterCalendarEvents() {
    const category = document.getElementById('calendar-category').value;
    console.log('📅 [CALENDAR] Filtrando eventos por categoría:', category);
    
    // Re-render calendar with filtered events
    renderCalendar();
    showTrainingMessage('📅 Filtros aplicados al calendario', 'info');
}

function goToPreviousMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
}

function goToNextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
}

function goToToday() {
    currentCalendarDate = new Date();
    renderCalendar();
    loadTodayEvents();
}

function loadTodayEvents() {
    const container = document.getElementById('today-events');
    if (!container) return;
    
    const today = new Date();
    const todayEvents = calendarEvents.filter(event => 
        event.date.toDateString() === today.toDateString()
    );
    
    if (todayEvents.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #6c757d;">
                📅 No hay eventos programados para hoy
            </div>
        `;
        return;
    }
    
    container.innerHTML = todayEvents.map(event => `
        <div class="training-card" style="margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="
                    width: 4px; 
                    height: 50px; 
                    background: ${event.color}; 
                    border-radius: 2px;
                "></div>
                <div style="flex: 1;">
                    <h5 style="margin: 0 0 5px 0;">${event.title}</h5>
                    <div style="font-size: 13px; color: #6c757d;">
                        ${event.training ? `📚 ${event.training.instructor || 'Sin instructor'} • ⏱️ ${event.training.duration}h` : ''}
                    </div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 12px; color: #6c757d;">Hoy</div>
                    <div style="font-weight: bold;">${event.date.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}</div>
                </div>
            </div>
        </div>
    `).join('');
}

function loadUpcomingDeadlinesCalendar() {
    const container = document.getElementById('upcoming-deadlines-calendar');
    if (!container) return;
    
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const upcomingDeadlines = calendarEvents.filter(event => 
        event.type === 'deadline' && 
        event.date >= now && 
        event.date <= sevenDaysFromNow
    ).sort((a, b) => a.date - b.date);
    
    if (upcomingDeadlines.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #6c757d;">
                ✅ No hay vencimientos próximos en los próximos 7 días
            </div>
        `;
        return;
    }
    
    container.innerHTML = upcomingDeadlines.map(event => {
        const daysUntil = Math.ceil((event.date - now) / (1000 * 60 * 60 * 24));
        const urgencyClass = daysUntil <= 1 ? 'text-danger' : daysUntil <= 3 ? 'text-warning' : 'text-info';
        
        return `
            <div class="training-card" style="margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="
                        width: 4px; 
                        height: 50px; 
                        background: ${event.color}; 
                        border-radius: 2px;
                    "></div>
                    <div style="flex: 1;">
                        <h5 style="margin: 0 0 5px 0;">${event.training?.title || event.title}</h5>
                        <div style="font-size: 13px; color: #6c757d;">
                            📅 Vence: ${event.date.toLocaleDateString()}
                            ${event.training ? `• 👥 ${event.training.participants} participantes` : ''}
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div class="${urgencyClass}" style="font-weight: bold; font-size: 16px;">
                            ${daysUntil}
                        </div>
                        <div style="font-size: 12px; color: #6c757d;">
                            día${daysUntil !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function showEventDetails(eventId) {
    const event = calendarEvents.find(e => e.id === eventId);
    if (!event) return;
    
    const eventDetailsHtml = `
        <div class="modal" id="eventDetailsModal" style="display: block;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>📅 Detalles del Evento</h3>
                    <button onclick="closeModal('eventDetailsModal')" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="card">
                        <h4 style="color: ${event.color};">${event.title}</h4>
                        <div style="margin-bottom: 15px;">
                            <strong>📅 Fecha:</strong> ${event.date.toLocaleDateString('es-ES', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </div>
                        
                        ${event.training ? `
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                <h5>📚 Información de la Capacitación</h5>
                                <div style="margin-bottom: 10px;"><strong>Instructor:</strong> ${event.training.instructor || 'No asignado'}</div>
                                <div style="margin-bottom: 10px;"><strong>Duración:</strong> ${event.training.duration} horas</div>
                                <div style="margin-bottom: 10px;"><strong>Participantes:</strong> ${event.training.participants}</div>
                                <div style="margin-bottom: 10px;"><strong>Progreso:</strong> ${event.training.progress}%</div>
                                <div><strong>Obligatoria:</strong> ${event.training.mandatory ? 'Sí' : 'No'}</div>
                            </div>
                        ` : ''}
                        
                        <div style="text-align: center; margin-top: 20px;">
                            ${event.training ? `
                                <button onclick="viewTrainingDetails(${event.training.id}); closeModal('eventDetailsModal');" class="btn btn-primary" style="margin-right: 10px;">
                                    👁️ Ver Capacitación
                                </button>
                            ` : ''}
                            <button onclick="closeModal('eventDetailsModal')" class="btn btn-secondary">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', eventDetailsHtml);
}

function exportCalendar() {
    showTrainingMessage('📤 Exportando calendario...', 'info');
    
    setTimeout(() => {
        showTrainingMessage('📤 Calendario exportado exitosamente', 'success');
    }, 1500);
}

// Generate compliance report
function generateComplianceReport() {
    console.log('📊 [TRAINING] Generando reporte de cumplimiento');
    showTrainingMessage('📊 Generando reporte de cumplimiento...', 'info');
    
    // Simulate report generation
    setTimeout(() => {
        showTrainingMessage('✅ Reporte de cumplimiento generado', 'success');
    }, 2000);
}

// Certificate generation functions
function generateCertificates(trainingId) {
    const training = allTrainings.find(t => t.id === trainingId);
    if (!training) {
        showTrainingMessage('❌ Capacitación no encontrada', 'error');
        return;
    }
    
    if (!training.certificate) {
        showTrainingMessage('❌ Esta capacitación no genera certificados', 'error');
        return;
    }
    
    // Mock participants who completed the training successfully
    const completedParticipants = [
        { id: 1, name: 'Juan Pérez', email: 'juan.perez@empresa.com', score: 95, completedDate: new Date(Date.now() - 2*24*60*60*1000) },
        { id: 2, name: 'María García', email: 'maria.garcia@empresa.com', score: 88, completedDate: new Date(Date.now() - 1*24*60*60*1000) },
        { id: 6, name: 'Sofia Hernández', email: 'sofia.hernandez@empresa.com', score: 92, completedDate: new Date(Date.now() - 3*24*60*60*1000) }
    ].filter(p => p.score >= training.minScore);
    
    if (completedParticipants.length === 0) {
        showTrainingMessage('❌ No hay participantes que hayan completado exitosamente la capacitación', 'warning');
        return;
    }
    
    showTrainingMessage('🏆 Generando certificados...', 'info');
    
    // Simulate certificate generation
    setTimeout(() => {
        const certificateHtml = `
            <div class="modal" id="certificateGenerationModal" style="display: block;">
                <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3>🏆 Generación de Certificados</h3>
                        <button onclick="closeModal('certificateGenerationModal')" class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="card" style="margin-bottom: 20px;">
                            <h4>📋 Capacitación: ${training.title}</h4>
                            <p>Se generarán certificados para ${completedParticipants.length} participante(s) que completaron exitosamente la capacitación.</p>
                        </div>
                        
                        <div class="card" style="margin-bottom: 20px;">
                            <h4>✅ Certificados Generados</h4>
                            <div style="max-height: 300px; overflow-y: auto;">
                                ${completedParticipants.map(participant => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #dee2e6; border-radius: 5px; margin-bottom: 10px;">
                                        <div>
                                            <div style="font-weight: bold;">${participant.name}</div>
                                            <div style="font-size: 12px; color: #6c757d;">${participant.email}</div>
                                            <div style="font-size: 12px; color: #28a745;">
                                                Puntuación: ${participant.score}% • Completado: ${participant.completedDate.toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div style="display: flex; gap: 5px;">
                                            <button onclick="previewCertificate(${participant.id}, ${trainingId})" class="btn btn-sm btn-info" title="Vista previa">
                                                👁️ Preview
                                            </button>
                                            <button onclick="downloadCertificate(${participant.id}, ${trainingId})" class="btn btn-sm btn-success" title="Descargar">
                                                📥 Descargar
                                            </button>
                                            <button onclick="emailCertificate(${participant.id}, ${trainingId})" class="btn btn-sm btn-primary" title="Enviar por email">
                                                📧 Enviar
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 20px;">
                            <button onclick="downloadAllCertificates(${trainingId})" class="btn btn-success" style="margin-right: 10px;">
                                📦 Descargar Todos (ZIP)
                            </button>
                            <button onclick="emailAllCertificates(${trainingId})" class="btn btn-primary" style="margin-right: 10px;">
                                📧 Enviar Todos por Email
                            </button>
                            <button onclick="closeModal('certificateGenerationModal')" class="btn btn-secondary">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', certificateHtml);
        showTrainingMessage('🏆 Certificados generados exitosamente', 'success');
    }, 2000);
}

function generateParticipantCertificate(participantId, trainingId) {
    const training = allTrainings.find(t => t.id === trainingId);
    if (!training || !training.certificate) {
        showTrainingMessage('❌ No se puede generar certificado para esta capacitación', 'error');
        return;
    }
    
    // Mock participant data
    const participants = [
        { id: 1, name: 'Juan Pérez', email: 'juan.perez@empresa.com', score: 95 },
        { id: 2, name: 'María García', email: 'maria.garcia@empresa.com', score: 88 },
        { id: 6, name: 'Sofia Hernández', email: 'sofia.hernandez@empresa.com', score: 92 }
    ];
    
    const participant = participants.find(p => p.id === participantId);
    if (!participant) {
        showTrainingMessage('❌ Participante no encontrado', 'error');
        return;
    }
    
    if (participant.score < training.minScore) {
        showTrainingMessage('❌ El participante no ha aprobado la capacitación', 'error');
        return;
    }
    
    showTrainingMessage('🏆 Generando certificado para ' + participant.name + '...', 'info');
    
    setTimeout(() => {
        previewCertificate(participantId, trainingId);
        showTrainingMessage('🏆 Certificado generado para ' + participant.name, 'success');
    }, 1500);
}

function previewCertificate(participantId, trainingId) {
    const training = allTrainings.find(t => t.id === trainingId);
    const participants = [
        { id: 1, name: 'Juan Pérez', email: 'juan.perez@empresa.com', score: 95, department: 'IT' },
        { id: 2, name: 'María García', email: 'maria.garcia@empresa.com', score: 88, department: 'RRHH' },
        { id: 6, name: 'Sofia Hernández', email: 'sofia.hernandez@empresa.com', score: 92, department: 'IT' }
    ];
    
    const participant = participants.find(p => p.id === participantId);
    if (!participant || !training) return;
    
    const category = trainingCategories.find(c => c.id === training.category);
    const currentDate = new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const certificateHtml = `
        <div class="modal" id="certificatePreviewModal" style="display: block;">
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>🏆 Vista Previa del Certificado</h3>
                    <button onclick="closeModal('certificatePreviewModal')" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <!-- Certificate Design -->
                    <div id="certificate" style="
                        width: 100%; 
                        max-width: 700px; 
                        margin: 0 auto; 
                        padding: 40px; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        border: 10px solid #f8f9fa; 
                        border-radius: 15px; 
                        text-align: center; 
                        color: white; 
                        font-family: 'Georgia', serif;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    ">
                        <!-- Header -->
                        <div style="margin-bottom: 30px;">
                            <div style="font-size: 3em; margin-bottom: 10px;">🏆</div>
                            <h1 style="font-size: 2.5em; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                                CERTIFICADO DE CAPACITACIÓN
                            </h1>
                            <div style="width: 100px; height: 3px; background: #ffd700; margin: 15px auto;"></div>
                        </div>
                        
                        <!-- Content -->
                        <div style="margin-bottom: 30px;">
                            <p style="font-size: 1.2em; margin-bottom: 20px; opacity: 0.9;">
                                Por la presente se certifica que
                            </p>
                            
                            <div style="
                                background: rgba(255,255,255,0.1); 
                                padding: 15px; 
                                border-radius: 10px; 
                                margin: 20px 0; 
                                border: 2px solid rgba(255,255,255,0.2);
                            ">
                                <h2 style="font-size: 2.2em; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                                    ${participant.name}
                                </h2>
                            </div>
                            
                            <p style="font-size: 1.2em; margin: 20px 0; line-height: 1.6;">
                                Ha completado satisfactoriamente la capacitación
                            </p>
                            
                            <div style="
                                background: rgba(255,255,255,0.1); 
                                padding: 20px; 
                                border-radius: 10px; 
                                margin: 20px 0; 
                                border: 2px solid rgba(255,255,255,0.2);
                            ">
                                <h3 style="font-size: 1.8em; margin: 0 0 10px 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">
                                    ${category?.icon || '📚'} ${training.title}
                                </h3>
                                <p style="margin: 0; font-size: 1.1em; opacity: 0.9;">
                                    Categoría: ${category?.name || 'General'} • Duración: ${training.duration} horas
                                </p>
                            </div>
                            
                            <div style="display: flex; justify-content: center; gap: 40px; margin: 30px 0; flex-wrap: wrap;">
                                <div style="text-align: center;">
                                    <div style="font-size: 2em; font-weight: bold; color: #ffd700;">${participant.score}%</div>
                                    <div style="font-size: 0.9em; opacity: 0.9;">Calificación</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-size: 1.3em; font-weight: bold;">${currentDate}</div>
                                    <div style="font-size: 0.9em; opacity: 0.9;">Fecha de Emisión</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div style="border-top: 2px solid rgba(255,255,255,0.3); padding-top: 20px; margin-top: 30px;">
                            <div style="display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 20px;">
                                <div style="text-align: center;">
                                    <div style="border-bottom: 1px solid rgba(255,255,255,0.5); padding-bottom: 5px; margin-bottom: 5px; min-width: 150px;">
                                        ${training.instructor || 'Director de Capacitación'}
                                    </div>
                                    <div style="font-size: 0.9em; opacity: 0.8;">Instructor</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-size: 2em;">🏢</div>
                                    <div style="font-size: 0.9em; opacity: 0.8;">
                                        Sistema de Capacitaciones<br>
                                        Empresa
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Certificate ID -->
                        <div style="margin-top: 20px; text-align: center; opacity: 0.7; font-size: 0.8em;">
                            ID Certificado: CERT-${trainingId}-${participantId}-${Date.now()}
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div style="text-align: center; margin-top: 30px;">
                        <button onclick="downloadCertificate(${participantId}, ${trainingId})" class="btn btn-success" style="margin-right: 10px;">
                            📥 Descargar PDF
                        </button>
                        <button onclick="emailCertificate(${participantId}, ${trainingId})" class="btn btn-primary" style="margin-right: 10px;">
                            📧 Enviar por Email
                        </button>
                        <button onclick="printCertificate()" class="btn btn-info" style="margin-right: 10px;">
                            🖨️ Imprimir
                        </button>
                        <button onclick="closeModal('certificatePreviewModal')" class="btn btn-secondary">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', certificateHtml);
}

function downloadCertificate(participantId, trainingId) {
    showTrainingMessage('📥 Descargando certificado...', 'info');
    
    // Simulate download
    setTimeout(() => {
        showTrainingMessage('✅ Certificado descargado exitosamente', 'success');
    }, 1500);
}

function emailCertificate(participantId, trainingId) {
    const participants = [
        { id: 1, name: 'Juan Pérez', email: 'juan.perez@empresa.com' },
        { id: 2, name: 'María García', email: 'maria.garcia@empresa.com' },
        { id: 6, name: 'Sofia Hernández', email: 'sofia.hernandez@empresa.com' }
    ];
    
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;
    
    showTrainingMessage('📧 Enviando certificado por email...', 'info');
    
    // Simulate email sending
    setTimeout(() => {
        showTrainingMessage(`📧 Certificado enviado a ${participant.email}`, 'success');
    }, 2000);
}

function printCertificate() {
    // Open print dialog
    window.print();
}

function downloadAllCertificates(trainingId) {
    showTrainingMessage('📦 Preparando descarga masiva de certificados...', 'info');
    
    setTimeout(() => {
        showTrainingMessage('📦 Archivo ZIP con todos los certificados descargado', 'success');
    }, 3000);
}

function emailAllCertificates(trainingId) {
    showTrainingMessage('📧 Enviando certificados por email a todos los participantes...', 'info');
    
    setTimeout(() => {
        showTrainingMessage('📧 Certificados enviados por email exitosamente', 'success');
    }, 4000);
}

function generateBulkCertificates(trainingId) {
    generateCertificates(trainingId);
}

// Additional utility functions for participants
function filterParticipants() {
    console.log('🔍 [PARTICIPANTS] Filtrando participantes...');
    // In a real implementation, this would filter the participants table
}

function viewParticipantDetail(participantId, trainingId) {
    console.log('👁️ [PARTICIPANTS] Ver detalle del participante:', participantId);
    showTrainingMessage('👁️ Funcionalidad de detalle de participante en desarrollo', 'info');
}

function sendParticipantReminder(participantId, trainingId) {
    const participants = [
        { id: 1, name: 'Juan Pérez' },
        { id: 2, name: 'María García' },
        { id: 4, name: 'Ana Martínez' },
        { id: 5, name: 'Luis Rodriguez' }
    ];
    
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;
    
    showTrainingMessage(`📢 Recordatorio enviado a ${participant.name}`, 'success');
}

function exportParticipantsList(trainingId) {
    showTrainingMessage('📤 Exportando lista de participantes...', 'info');
    
    setTimeout(() => {
        showTrainingMessage('📤 Lista de participantes exportada exitosamente', 'success');
    }, 1500);
}

function sendBulkReminders(trainingId) {
    showTrainingMessage('📢 Enviando recordatorios masivos...', 'info');
    
    setTimeout(() => {
        showTrainingMessage('📢 Recordatorios enviados a todos los participantes pendientes', 'success');
    }, 2500);
}

function generateTrainingReport(trainingId) {
    const training = allTrainings.find(t => t.id === trainingId);
    if (!training) {
        showTrainingMessage('❌ Capacitación no encontrada', 'error');
        return;
    }
    
    showTrainingMessage('📊 Generando reporte de capacitación...', 'info');
    
    setTimeout(() => {
        showTrainingMessage(`📊 Reporte generado para "${training.title}"`, 'success');
    }, 2000);
}

// ===============================================
// GENERADOR DE FORMULARIOS DE EXAMEN PARA SERVIDOR
// ===============================================

function showExamFormGenerator() {
    console.log('🎯 [TRAINING] Mostrando generador de formularios de examen');
    
    const modal = document.createElement('div');
    modal.id = 'examFormGeneratorModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); display: flex; justify-content: center; 
        align-items: center; z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 15px; padding: 30px; max-width: 800px; width: 90%; max-height: 90%; overflow-y: auto; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #eee;">
                <h2 style="margin: 0; color: #28a745; display: flex; align-items: center; gap: 10px;">
                    🎯 Generador de Formularios de Examen
                </h2>
                <button onclick="closeExamFormGenerator()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            
            <!-- Configuración del Examen -->
            <div class="card" style="margin-bottom: 20px;">
                <h3>⚙️ Configuración del Examen</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <label><strong>📚 Capacitación:</strong></label>
                        <select id="exam-training-select" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="">Seleccionar capacitación...</option>
                            ${allTrainings.filter(t => t.status !== 'expired').map(training => 
                                `<option value="${training.id}">${training.title}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div>
                        <label><strong>⏱️ Tiempo límite (minutos):</strong></label>
                        <input type="number" id="exam-time-limit" min="5" max="180" value="60" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    <div>
                        <label><strong>🎯 Puntaje mínimo aprobatorio:</strong></label>
                        <input type="number" id="exam-min-score" min="0" max="100" value="70" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    <div>
                        <label><strong>🔄 Intentos permitidos:</strong></label>
                        <select id="exam-attempts" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="1">1 intento</option>
                            <option value="2" selected>2 intentos</option>
                            <option value="3">3 intentos</option>
                            <option value="unlimited">Ilimitados</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-top: 15px;">
                    <label><strong>📄 Instrucciones del examen:</strong></label>
                    <textarea id="exam-instructions" placeholder="Instrucciones para el empleado..." style="width: 100%; height: 80px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"></textarea>
                </div>
            </div>
            
            <!-- Configuración de Servidor -->
            <div class="card" style="margin-bottom: 20px;">
                <h3>🌐 Configuración del Servidor</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <label><strong>🖥️ URL del servidor:</strong></label>
                        <input type="url" id="exam-server-url" placeholder="https://examenes.empresa.com" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    <div>
                        <label><strong>📡 Endpoint de envío:</strong></label>
                        <input type="text" id="exam-endpoint" value="/api/exam/submit" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    <div>
                        <label><strong>🔑 API Key (opcional):</strong></label>
                        <input type="password" id="exam-api-key" placeholder="Clave de autenticación..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                </div>
                
                <div style="margin-top: 15px;">
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="exam-ssl-verify" checked>
                        <strong>🔒 Verificar certificado SSL</strong>
                    </label>
                </div>
            </div>
            
            <!-- Preguntas del Examen -->
            <div class="card" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3>❓ Preguntas del Examen</h3>
                    <button onclick="addExamQuestion()" class="btn btn-success">➕ Agregar Pregunta</button>
                </div>
                <div id="exam-questions-container">
                    <!-- Las preguntas se agregan dinámicamente aquí -->
                </div>
                <div id="exam-questions-empty" style="padding: 20px; text-align: center; color: #666; border: 2px dashed #ddd; border-radius: 8px;">
                    <div style="font-size: 24px; margin-bottom: 10px;">❓</div>
                    <div>No hay preguntas agregadas</div>
                    <div style="font-size: 12px; margin-top: 5px;">Haz clic en "➕ Agregar Pregunta" para comenzar</div>
                </div>
            </div>
            
            <!-- Botones de Acción -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 15px; margin-top: 25px; padding-top: 20px; border-top: 2px solid #eee;">
                <div style="display: flex; gap: 10px;">
                    <button onclick="previewExamForm()" class="btn btn-primary">👁️ Vista Previa</button>
                    <button onclick="testExamServer()" class="btn btn-warning">🧪 Probar Servidor</button>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="exportExamForm()" class="btn btn-success">📤 Exportar Formulario</button>
                    <button onclick="deployExamForm()" class="btn btn-danger" style="background: #dc3545;">🚀 Desplegar al Servidor</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Agregar primera pregunta automáticamente
    setTimeout(() => {
        addExamQuestion();
        updateExamQuestionsVisibility();
    }, 100);
}

function closeExamFormGenerator() {
    const modal = document.getElementById('examFormGeneratorModal');
    if (modal) {
        modal.remove();
    }
}

let examQuestionCounter = 0;

function addExamQuestion() {
    examQuestionCounter++;
    const container = document.getElementById('exam-questions-container');
    
    const questionHtml = `
        <div class="exam-question-item" id="exam-question-${examQuestionCounter}" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; position: relative;">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0; color: #495057;">Pregunta #${examQuestionCounter}</h4>
                <button onclick="removeExamQuestion(${examQuestionCounter})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 12px;">🗑️ Eliminar</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                    <label><strong>❓ Texto de la pregunta:</strong></label>
                    <textarea id="question-text-${examQuestionCounter}" placeholder="Escriba aquí la pregunta..." style="width: 100%; height: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;" required></textarea>
                </div>
                <div>
                    <label><strong>📊 Tipo de pregunta:</strong></label>
                    <select id="question-type-${examQuestionCounter}" onchange="updateQuestionOptions(${examQuestionCounter})" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                        <option value="multiple_choice">Opción múltiple</option>
                        <option value="true_false">Verdadero/Falso</option>
                        <option value="text">Respuesta abierta</option>
                        <option value="numeric">Respuesta numérica</option>
                    </select>
                    
                    <div style="margin-top: 10px;">
                        <label><strong>⭐ Puntos:</strong></label>
                        <input type="number" id="question-points-${examQuestionCounter}" min="1" value="10" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                </div>
            </div>
            
            <!-- Opciones dinámicas según el tipo -->
            <div id="question-options-${examQuestionCounter}">
                <!-- Se cargan dinámicamente según el tipo -->
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', questionHtml);
    updateQuestionOptions(examQuestionCounter);
    updateExamQuestionsVisibility();
    
    console.log(`➕ [EXAM] Pregunta #${examQuestionCounter} agregada`);
}

function removeExamQuestion(questionId) {
    const questionElement = document.getElementById(`exam-question-${questionId}`);
    if (questionElement) {
        questionElement.remove();
        updateExamQuestionsVisibility();
        console.log(`🗑️ [EXAM] Pregunta #${questionId} eliminada`);
    }
}

function updateQuestionOptions(questionId) {
    const questionType = document.getElementById(`question-type-${questionId}`).value;
    const optionsContainer = document.getElementById(`question-options-${questionId}`);
    
    let optionsHtml = '';
    
    switch (questionType) {
        case 'multiple_choice':
            optionsHtml = `
                <div>
                    <label><strong>📝 Opciones de respuesta:</strong></label>
                    <div id="options-container-${questionId}">
                        <div class="option-item" style="display: flex; align-items: center; gap: 10px; margin: 5px 0;">
                            <input type="radio" name="correct-option-${questionId}" value="0" checked>
                            <input type="text" placeholder="Opción 1 (correcta)" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                            <button onclick="removeOption(this)" style="background: #dc3545; color: white; border: none; padding: 5px; border-radius: 3px;">🗑️</button>
                        </div>
                        <div class="option-item" style="display: flex; align-items: center; gap: 10px; margin: 5px 0;">
                            <input type="radio" name="correct-option-${questionId}" value="1">
                            <input type="text" placeholder="Opción 2" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                            <button onclick="removeOption(this)" style="background: #dc3545; color: white; border: none; padding: 5px; border-radius: 3px;">🗑️</button>
                        </div>
                    </div>
                    <button onclick="addOption(${questionId})" style="background: #28a745; color: white; border: none; padding: 8px 15px; border-radius: 5px; margin-top: 10px;">➕ Agregar Opción</button>
                </div>
            `;
            break;
            
        case 'true_false':
            optionsHtml = `
                <div>
                    <label><strong>✅ Respuesta correcta:</strong></label>
                    <select id="correct-answer-${questionId}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                        <option value="true">✅ Verdadero</option>
                        <option value="false">❌ Falso</option>
                    </select>
                </div>
            `;
            break;
            
        case 'text':
            optionsHtml = `
                <div>
                    <label><strong>📝 Respuesta esperada (opcional):</strong></label>
                    <textarea id="expected-answer-${questionId}" placeholder="Respuesta modelo o palabras clave..." style="width: 100%; height: 60px; padding: 8px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"></textarea>
                    <div style="margin-top: 10px;">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="manual-review-${questionId}" checked>
                            <strong>👤 Requiere revisión manual</strong>
                        </label>
                    </div>
                </div>
            `;
            break;
            
        case 'numeric':
            optionsHtml = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label><strong>🎯 Respuesta correcta:</strong></label>
                        <input type="number" id="correct-numeric-${questionId}" step="any" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    <div>
                        <label><strong>📏 Margen de error (±):</strong></label>
                        <input type="number" id="numeric-margin-${questionId}" step="any" value="0" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                </div>
            `;
            break;
    }
    
    optionsContainer.innerHTML = optionsHtml;
}

function addOption(questionId) {
    const container = document.getElementById(`options-container-${questionId}`);
    const optionCount = container.children.length;
    
    const optionHtml = `
        <div class="option-item" style="display: flex; align-items: center; gap: 10px; margin: 5px 0;">
            <input type="radio" name="correct-option-${questionId}" value="${optionCount}">
            <input type="text" placeholder="Opción ${optionCount + 1}" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
            <button onclick="removeOption(this)" style="background: #dc3545; color: white; border: none; padding: 5px; border-radius: 3px;">🗑️</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', optionHtml);
}

function removeOption(button) {
    button.parentElement.remove();
}

function updateExamQuestionsVisibility() {
    const container = document.getElementById('exam-questions-container');
    const emptyState = document.getElementById('exam-questions-empty');
    
    if (container.children.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
    }
}

function previewExamForm() {
    const examData = collectExamFormData();
    if (!examData) return;
    
    // Mostrar preview del formulario
    const previewWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
    previewWindow.document.write(generateExamHTML(examData));
    previewWindow.document.close();
    
    console.log('👁️ [EXAM] Vista previa generada');
}

function testExamServer() {
    const serverUrl = document.getElementById('exam-server-url').value;
    const endpoint = document.getElementById('exam-endpoint').value;
    const apiKey = document.getElementById('exam-api-key').value;
    
    if (!serverUrl) {
        showTrainingMessage('❌ Ingrese la URL del servidor', 'error');
        return;
    }
    
    // Test de conectividad
    const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        source: 'Aponnt Training System'
    };
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    fetch(serverUrl + endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(testData)
    })
    .then(response => {
        if (response.ok) {
            showTrainingMessage('✅ Servidor conectado exitosamente', 'success');
            console.log('✅ [EXAM] Prueba de servidor exitosa');
        } else {
            showTrainingMessage('⚠️ Servidor responde pero con errores', 'warning');
            console.warn('⚠️ [EXAM] Servidor con errores:', response.status);
        }
    })
    .catch(error => {
        showTrainingMessage('❌ Error de conexión con el servidor', 'error');
        console.error('❌ [EXAM] Error de conexión:', error);
    });
}

function exportExamForm() {
    const examData = collectExamFormData();
    if (!examData) return;
    
    const examHTML = generateExamHTML(examData);
    const blob = new Blob([examHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `examen_${examData.trainingTitle.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showTrainingMessage('📤 Formulario exportado exitosamente', 'success');
    console.log('📤 [EXAM] Formulario exportado');
}

function deployExamForm() {
    const examData = collectExamFormData();
    if (!examData) return;
    
    const serverUrl = document.getElementById('exam-server-url').value;
    const apiKey = document.getElementById('exam-api-key').value;
    
    if (!serverUrl) {
        showTrainingMessage('❌ Ingrese la URL del servidor para desplegar', 'error');
        return;
    }
    
    // Generar el formulario y enviarlo al servidor
    const formData = {
        action: 'deploy_exam',
        exam: examData,
        html: generateExamHTML(examData),
        timestamp: new Date().toISOString()
    };
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    showTrainingMessage('🚀 Desplegando formulario al servidor...', 'info');
    
    fetch(serverUrl + '/api/exam/deploy', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showTrainingMessage('🎉 Formulario desplegado exitosamente', 'success');
            console.log('🚀 [EXAM] Despliegue exitoso:', data);
        } else {
            showTrainingMessage('❌ Error al desplegar: ' + data.message, 'error');
            console.error('❌ [EXAM] Error de despliegue:', data);
        }
    })
    .catch(error => {
        showTrainingMessage('❌ Error de conexión durante el despliegue', 'error');
        console.error('❌ [EXAM] Error de despliegue:', error);
    });
}

function collectExamFormData() {
    const trainingId = document.getElementById('exam-training-select').value;
    const timeLimit = document.getElementById('exam-time-limit').value;
    const minScore = document.getElementById('exam-min-score').value;
    const attempts = document.getElementById('exam-attempts').value;
    const instructions = document.getElementById('exam-instructions').value;
    const serverUrl = document.getElementById('exam-server-url').value;
    const endpoint = document.getElementById('exam-endpoint').value;
    const apiKey = document.getElementById('exam-api-key').value;
    
    if (!trainingId) {
        showTrainingMessage('❌ Seleccione una capacitación', 'error');
        return null;
    }
    
    const training = allTrainings.find(t => t.id === trainingId);
    const questions = [];
    
    // Recopilar preguntas
    const questionElements = document.querySelectorAll('.exam-question-item');
    for (let i = 0; i < questionElements.length; i++) {
        const questionEl = questionElements[i];
        const questionId = questionEl.id.split('-')[2];
        
        const questionText = document.getElementById(`question-text-${questionId}`)?.value;
        const questionType = document.getElementById(`question-type-${questionId}`)?.value;
        const points = document.getElementById(`question-points-${questionId}`)?.value;
        
        if (!questionText) {
            showTrainingMessage(`❌ Complete la pregunta #${parseInt(questionId)}`, 'error');
            return null;
        }
        
        const question = {
            id: questionId,
            text: questionText,
            type: questionType,
            points: parseInt(points) || 10
        };
        
        // Recopilar opciones según el tipo
        switch (questionType) {
            case 'multiple_choice':
                const options = [];
                const correctAnswers = [];
                const optionElements = document.querySelectorAll(`#options-container-${questionId} .option-item`);
                
                optionElements.forEach((optionEl, index) => {
                    const text = optionEl.querySelector('input[type="text"]').value;
                    const isCorrect = optionEl.querySelector('input[type="radio"]').checked;
                    
                    if (text) {
                        options.push(text);
                        if (isCorrect) correctAnswers.push(index);
                    }
                });
                
                question.options = options;
                question.correctAnswers = correctAnswers;
                break;
                
            case 'true_false':
                question.correctAnswer = document.getElementById(`correct-answer-${questionId}`)?.value === 'true';
                break;
                
            case 'text':
                question.expectedAnswer = document.getElementById(`expected-answer-${questionId}`)?.value;
                question.manualReview = document.getElementById(`manual-review-${questionId}`)?.checked;
                break;
                
            case 'numeric':
                question.correctAnswer = parseFloat(document.getElementById(`correct-numeric-${questionId}`)?.value);
                question.margin = parseFloat(document.getElementById(`numeric-margin-${questionId}`)?.value) || 0;
                break;
        }
        
        questions.push(question);
    }
    
    if (questions.length === 0) {
        showTrainingMessage('❌ Agregue al menos una pregunta', 'error');
        return null;
    }
    
    return {
        trainingId: trainingId,
        trainingTitle: training ? training.title : 'Examen',
        timeLimit: parseInt(timeLimit) || 60,
        minScore: parseInt(minScore) || 70,
        attempts: attempts === 'unlimited' ? -1 : parseInt(attempts) || 2,
        instructions: instructions,
        serverUrl: serverUrl,
        endpoint: endpoint,
        apiKey: apiKey,
        questions: questions,
        createdAt: new Date().toISOString()
    };
}

function generateExamHTML(examData) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Examen: ${examData.trainingTitle}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; line-height: 1.6; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .exam-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
        .exam-info { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .question-container { background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .question-header { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #495057; }
        .question-options { margin-top: 15px; }
        .option { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; cursor: pointer; transition: background 0.3s; }
        .option:hover { background: #e9ecef; }
        .option input { margin-right: 10px; }
        .submit-section { background: white; padding: 30px; border-radius: 8px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .btn-primary { background: #007bff; color: white; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer; font-size: 16px; }
        .btn-primary:hover { background: #0056b3; }
        .timer { position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 15px; border-radius: 8px; font-weight: bold; z-index: 1000; }
        .progress-bar { height: 6px; background: #e9ecef; border-radius: 3px; margin: 20px 0; }
        .progress-fill { height: 100%; background: #28a745; border-radius: 3px; transition: width 0.3s; width: 0%; }
        textarea, input[type="text"], input[type="number"] { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }
        textarea { height: 100px; resize: vertical; }
    </style>
</head>
<body>
    <div class="container">
        <div class="exam-header">
            <h1>📚 ${examData.trainingTitle}</h1>
            <p>Examen de Evaluación</p>
        </div>
        
        ${examData.timeLimit > 0 ? `<div class="timer" id="timer">⏱️ ${examData.timeLimit}:00</div>` : ''}
        
        <div class="exam-info">
            <h3>📋 Información del Examen</h3>
            ${examData.instructions ? `<p style="margin: 10px 0;"><strong>Instrucciones:</strong> ${examData.instructions}</p>` : ''}
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                <div><strong>⏱️ Tiempo:</strong> ${examData.timeLimit > 0 ? examData.timeLimit + ' minutos' : 'Sin límite'}</div>
                <div><strong>🎯 Puntaje mínimo:</strong> ${examData.minScore}%</div>
                <div><strong>🔄 Intentos:</strong> ${examData.attempts === -1 ? 'Ilimitados' : examData.attempts}</div>
                <div><strong>❓ Preguntas:</strong> ${examData.questions.length}</div>
            </div>
        </div>
        
        <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
        </div>
        
        <form id="exam-form" onsubmit="submitExam(event)">
            ${examData.questions.map((question, index) => {
                let questionHtml = `
                    <div class="question-container">
                        <div class="question-header">
                            Pregunta ${index + 1} de ${examData.questions.length} (${question.points} punto${question.points !== 1 ? 's' : ''})
                        </div>
                        <div style="font-size: 16px; margin-bottom: 15px;">${question.text}</div>
                        <div class="question-options">
                `;
                
                switch (question.type) {
                    case 'multiple_choice':
                        question.options.forEach((option, optIndex) => {
                            questionHtml += `
                                <div class="option">
                                    <label>
                                        <input type="radio" name="question_${question.id}" value="${optIndex}" onchange="updateProgress()">
                                        ${option}
                                    </label>
                                </div>
                            `;
                        });
                        break;
                        
                    case 'true_false':
                        questionHtml += `
                            <div class="option">
                                <label>
                                    <input type="radio" name="question_${question.id}" value="true" onchange="updateProgress()">
                                    ✅ Verdadero
                                </label>
                            </div>
                            <div class="option">
                                <label>
                                    <input type="radio" name="question_${question.id}" value="false" onchange="updateProgress()">
                                    ❌ Falso
                                </label>
                            </div>
                        `;
                        break;
                        
                    case 'text':
                        questionHtml += `
                            <textarea name="question_${question.id}" placeholder="Escriba su respuesta aquí..." onchange="updateProgress()"></textarea>
                        `;
                        break;
                        
                    case 'numeric':
                        questionHtml += `
                            <input type="number" name="question_${question.id}" step="any" placeholder="Ingrese su respuesta numérica..." onchange="updateProgress()">
                        `;
                        break;
                }
                
                questionHtml += '</div></div>';
                return questionHtml;
            }).join('')}
            
            <div class="submit-section">
                <h3>🎯 Finalizar Examen</h3>
                <p style="margin: 15px 0;">Revise sus respuestas antes de enviar. Una vez enviado, no podrá modificar sus respuestas.</p>
                <button type="submit" class="btn-primary" id="submit-btn" disabled>📤 Enviar Examen</button>
            </div>
        </form>
    </div>
    
    <script>
        const examData = ${JSON.stringify(examData)};
        let timeRemaining = ${examData.timeLimit * 60}; // en segundos
        let timerInterval;
        
        // Inicializar timer si es necesario
        ${examData.timeLimit > 0 ? `
        if (timeRemaining > 0) {
            timerInterval = setInterval(updateTimer, 1000);
        }
        
        function updateTimer() {
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                document.getElementById('timer').innerHTML = '⏰ Tiempo agotado';
                submitExam();
                return;
            }
            
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            document.getElementById('timer').innerHTML = 
                '⏱️ ' + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
            
            // Cambiar color cuando queden menos de 5 minutos
            if (timeRemaining < 300) {
                document.getElementById('timer').style.background = '#dc3545';
                if (timeRemaining < 60) {
                    document.getElementById('timer').style.animation = 'blink 1s infinite';
                }
            }
            
            timeRemaining--;
        }
        ` : ''}
        
        function updateProgress() {
            const totalQuestions = examData.questions.length;
            let answeredQuestions = 0;
            
            examData.questions.forEach(question => {
                const inputs = document.querySelectorAll(\`[name="question_\${question.id}"]\`);
                let answered = false;
                
                inputs.forEach(input => {
                    if ((input.type === 'radio' && input.checked) || 
                        ((input.type === 'text' || input.tagName === 'TEXTAREA' || input.type === 'number') && input.value.trim())) {
                        answered = true;
                    }
                });
                
                if (answered) answeredQuestions++;
            });
            
            const progress = (answeredQuestions / totalQuestions) * 100;
            document.getElementById('progress-fill').style.width = progress + '%';
            
            // Habilitar botón de envío si se respondieron todas las preguntas
            document.getElementById('submit-btn').disabled = answeredQuestions < totalQuestions;
        }
        
        function submitExam(event) {
            if (event) event.preventDefault();
            
            const formData = new FormData(document.getElementById('exam-form'));
            const answers = {};
            
            for (let [key, value] of formData.entries()) {
                answers[key] = value;
            }
            
            const submissionData = {
                examId: examData.trainingId,
                answers: answers,
                startTime: sessionStorage.getItem('examStartTime') || new Date().toISOString(),
                endTime: new Date().toISOString(),
                timeSpent: ${examData.timeLimit * 60} - timeRemaining,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };
            
            // Enviar al servidor
            ${examData.serverUrl ? `
            fetch('${examData.serverUrl}${examData.endpoint}', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ${examData.apiKey ? `'Authorization': 'Bearer ${examData.apiKey}',` : ''}
                },
                body: JSON.stringify(submissionData)
            })
            .then(response => response.json())
            .then(data => {
                alert('✅ Examen enviado exitosamente. Recibirá los resultados pronto.');
                console.log('Respuesta del servidor:', data);
            })
            .catch(error => {
                alert('❌ Error al enviar el examen. Por favor, contacte al administrador.');
                console.error('Error:', error);
            });
            ` : `
            alert('✅ Examen completado. Los datos se han guardado localmente.');
            console.log('Datos del examen:', submissionData);
            `}
            
            // Deshabilitar el formulario
            document.getElementById('exam-form').style.pointerEvents = 'none';
            document.getElementById('exam-form').style.opacity = '0.6';
        }
        
        // Marcar tiempo de inicio
        sessionStorage.setItem('examStartTime', new Date().toISOString());
        
        // Prevenir salir accidentalmente
        window.addEventListener('beforeunload', function (e) {
            const confirmationMessage = '¿Está seguro de que desea salir? Se perderá el progreso del examen.';
            e.returnValue = confirmationMessage;
            return confirmationMessage;
        });
        
        // CSS para animación de parpadeo
        const style = document.createElement('style');
        style.textContent = \`
            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0.5; }
            }
        \`;
        document.head.appendChild(style);
    </script>
</body>
</html>
    `;
}

// ===============================================
// 🆕 FUNCIONES PARA EVALUACIONES INDEPENDIENTES
// ===============================================

// Cargar lista de evaluaciones independientes
function loadIndependentEvaluationsList() {
    const container = document.getElementById('independent-evaluations-list');
    if (!container) return;
    
    if (allIndependentEvaluations.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #6c757d;">
                <div style="font-size: 48px; margin-bottom: 15px;">🎯</div>
                <div style="font-size: 18px; margin-bottom: 10px;">No hay evaluaciones independientes creadas</div>
                <div style="margin-bottom: 20px;">
                    Las evaluaciones independientes son perfectas para:<br>
                    • Tests de conocimientos generales<br>
                    • Evaluaciones psicotécnicas<br>
                    • Exámenes de selección de personal<br>
                    • Evaluaciones de desempeño<br>
                    • Certificaciones internas
                </div>
                <button onclick="showIndependentEvaluationModal()" class="btn btn-primary">
                    ➕ Crear Primera Evaluación Independiente
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allIndependentEvaluations.map(evaluation => {
        const statusClass = `status-${evaluation.status}`;
        const statusText = {
            active: '🟢 Activa',
            draft: '🟡 Borrador',
            completed: '🔵 Completada',
            disabled: '⚪ Deshabilitada'
        };
        
        const categoryText = {
            knowledge: '🧠 Conocimientos Generales',
            psychometric: '🧪 Psicotécnica',
            performance: '📊 Desempeño',
            selection: '👤 Selección de Personal',
            certification: '🏆 Certificación',
            compliance: '⚖️ Cumplimiento',
            other: '🔧 Otra'
        };
        
        const audienceText = {
            all_employees: '👥 Todos los empleados',
            new_candidates: '🆕 Candidatos nuevos',
            managers: '👔 Gerentes',
            specific_department: '🏢 Departamento específico',
            external: '🌐 Externa'
        };
        
        return `
            <div class="training-card" style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: between; align-items: flex-start; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <h4 style="margin: 0; color: #28a745; font-size: 18px;">🎯 ${evaluation.title}</h4>
                            <span class="training-status ${statusClass}">${statusText[evaluation.status]}</span>
                        </div>
                        <p style="margin: 0 0 10px 0; color: #6c757d; line-height: 1.4;">${evaluation.description || 'Sin descripción'}</p>
                        <div style="display: flex; flex-wrap: wrap; gap: 15px; font-size: 13px; color: #495057;">
                            <span><strong>📂 Categoría:</strong> ${categoryText[evaluation.category] || 'No especificada'}</span>
                            <span><strong>👥 Audiencia:</strong> ${audienceText[evaluation.audience] || 'No especificada'}</span>
                            <span><strong>⏱️ Duración:</strong> ${evaluation.timeLimit || 60} min</span>
                            <span><strong>🎯 Min. Aprobación:</strong> ${evaluation.minScore || 70}%</span>
                            <span><strong>📋 Preguntas:</strong> ${evaluation.questions ? evaluation.questions.length : 0}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                        <div style="font-size: 12px; color: #6c757d; text-align: right;">
                            <div>📅 Creada: ${evaluation.createdAt ? new Date(evaluation.createdAt).toLocaleDateString('es-ES') : 'N/A'}</div>
                            <div>👥 Participantes: ${evaluation.participants || 0}</div>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid #eee;">
                    <div style="display: flex; gap: 8px;">
                        <button onclick="viewIndependentEvaluationDetails(${evaluation.id})" class="btn btn-sm btn-info" title="Ver detalles">
                            👁️ Detalles
                        </button>
                        <button onclick="editIndependentEvaluation(${evaluation.id})" class="btn btn-sm btn-warning" title="Editar">
                            ✏️ Editar
                        </button>
                        <button onclick="duplicateIndependentEvaluation(${evaluation.id})" class="btn btn-sm btn-secondary" title="Duplicar">
                            📋 Duplicar
                        </button>
                        ${evaluation.status === 'draft' ? `
                            <button onclick="activateIndependentEvaluation(${evaluation.id})" class="btn btn-sm btn-success" title="Activar">
                                ▶️ Activar
                            </button>
                        ` : ''}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="viewIndependentEvaluationParticipants(${evaluation.id})" class="btn btn-sm btn-primary" title="Ver participantes">
                            👥 Participantes
                        </button>
                        <button onclick="generateIndependentEvaluationReport(${evaluation.id})" class="btn btn-sm btn-info" title="Generar reporte">
                            📊 Reporte
                        </button>
                        <button onclick="deleteIndependentEvaluation(${evaluation.id})" class="btn btn-sm btn-danger" title="Eliminar">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Actualizar estadísticas de evaluaciones independientes
function updateIndependentEvaluationsStats() {
    const total = allIndependentEvaluations.length;
    const active = allIndependentEvaluations.filter(e => e.status === 'active').length;
    const completed = allIndependentEvaluations.filter(e => e.status === 'completed').length;
    const totalParticipants = allIndependentEvaluations.reduce((sum, e) => sum + (e.participants || 0), 0);
    
    document.getElementById('total-independent-evaluations').textContent = total;
    document.getElementById('active-independent-evaluations').textContent = active;
    document.getElementById('completed-independent-evaluations').textContent = completed;
    document.getElementById('participants-independent-evaluations').textContent = totalParticipants;
}

// Mostrar modal de nueva evaluación independiente
function showIndependentEvaluationModal() {
    console.log('🎯 [INDEPENDENT-EVAL] Mostrando modal de evaluación independiente');
    
    const modal = document.createElement('div');
    modal.id = 'independentEvaluationModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); display: flex; justify-content: center; 
        align-items: center; z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 15px; padding: 30px; max-width: 700px; width: 90%; max-height: 90%; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #eee;">
                <h2 style="margin: 0; color: #28a745; display: flex; align-items: center; gap: 10px;">
                    🎯 Nueva Evaluación Independiente
                </h2>
                <button onclick="closeIndependentEvaluationModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            
            <form id="independentEvaluationForm" onsubmit="saveIndependentEvaluation(event)">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <label><strong>📝 Título de la Evaluación:</strong></label>
                        <input type="text" id="independent-eval-title" required placeholder="Ej: Test de Conocimientos Generales" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    <div>
                        <label><strong>📂 Categoría:</strong></label>
                        <select id="independent-eval-category" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="">Seleccionar categoría...</option>
                            <option value="knowledge">🧠 Conocimientos Generales</option>
                            <option value="psychometric">🧪 Psicotécnica</option>
                            <option value="performance">📊 Desempeño</option>
                            <option value="selection">👤 Selección de Personal</option>
                            <option value="certification">🏆 Certificación</option>
                            <option value="compliance">⚖️ Cumplimiento</option>
                            <option value="other">🔧 Otra</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label><strong>📄 Descripción:</strong></label>
                    <textarea id="independent-eval-description" rows="3" placeholder="Describe el propósito y contenido de esta evaluación..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;"></textarea>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <label><strong>👥 Audiencia:</strong></label>
                        <select id="independent-eval-audience" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="">Seleccionar audiencia...</option>
                            <option value="all_employees">👥 Todos los empleados</option>
                            <option value="new_candidates">🆕 Candidatos nuevos</option>
                            <option value="managers">👔 Gerentes</option>
                            <option value="specific_department">🏢 Departamento específico</option>
                            <option value="external">🌐 Externa</option>
                        </select>
                    </div>
                    <div>
                        <label><strong>⏱️ Tiempo límite (min):</strong></label>
                        <input type="number" id="independent-eval-time-limit" min="5" max="180" value="60" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    <div>
                        <label><strong>🎯 Puntaje mínimo (%):</strong></label>
                        <input type="number" id="independent-eval-min-score" min="0" max="100" value="70" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <label style="display: flex; align-items: center; gap: 5px;">
                            <input type="checkbox" id="independent-eval-multiple-attempts" checked>
                            <strong>🔄 Permitir múltiples intentos</strong>
                        </label>
                    </div>
                    <div>
                        <label style="display: flex; align-items: center; gap: 5px;">
                            <input type="checkbox" id="independent-eval-certificate">
                            <strong>🏆 Genera certificado</strong>
                        </label>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 25px;">
                    <button type="button" onclick="closeIndependentEvaluationModal()" class="btn btn-secondary" style="margin-right: 10px;">
                        ❌ Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary">
                        💾 Crear Evaluación
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Cerrar modal de evaluación independiente
function closeIndependentEvaluationModal() {
    const modal = document.getElementById('independentEvaluationModal');
    if (modal) modal.remove();
}

// Guardar evaluación independiente
function saveIndependentEvaluation(event) {
    event.preventDefault();
    
    const form = document.getElementById('independentEvaluationForm');
    const editId = form.getAttribute('data-edit-id');
    const isEditing = editId && editId !== 'null';
    
    const formData = {
        title: document.getElementById('independent-eval-title').value,
        category: document.getElementById('independent-eval-category').value,
        description: document.getElementById('independent-eval-description').value,
        audience: document.getElementById('independent-eval-audience').value,
        timeLimit: parseInt(document.getElementById('independent-eval-time-limit').value),
        minScore: parseInt(document.getElementById('independent-eval-min-score').value),
        multipleAttempts: document.getElementById('independent-eval-multiple-attempts').checked,
        certificate: document.getElementById('independent-eval-certificate').checked
    };
    
    if (!formData.title || !formData.category || !formData.audience) {
        showTrainingMessage('❌ Complete todos los campos obligatorios', 'error');
        return;
    }
    
    if (isEditing) {
        // Actualizar evaluación existente
        const evaluationIndex = allIndependentEvaluations.findIndex(e => e.id == editId);
        if (evaluationIndex > -1) {
            const existingEvaluation = allIndependentEvaluations[evaluationIndex];
            allIndependentEvaluations[evaluationIndex] = {
                ...existingEvaluation,
                ...formData,
                updatedAt: new Date()
            };
            
            // Limpiar estado de edición
            form.removeAttribute('data-edit-id');
            
            // Guardar en localStorage
            saveIndependentEvaluationsToStorage();
            
            closeIndependentEvaluationModal();
            loadIndependentEvaluationsList();
            updateIndependentEvaluationsStats();
            
            showTrainingMessage(`✅ Evaluación independiente "${formData.title}" actualizada exitosamente`, 'success');
        }
    } else {
        // Crear nueva evaluación
        const newEvaluation = {
            id: Date.now(),
            ...formData,
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
            participants: 0,
            questions: [],
            results: []
        };
        
        allIndependentEvaluations.push(newEvaluation);
        
        // Guardar en localStorage
        saveIndependentEvaluationsToStorage();
        
        closeIndependentEvaluationModal();
        loadIndependentEvaluationsList();
        updateIndependentEvaluationsStats();
        
        showTrainingMessage(`✅ Evaluación independiente "${newEvaluation.title}" creada exitosamente`, 'success');
    }
}

// Filtrar evaluaciones independientes
function filterIndependentEvaluations() {
    const searchTerm = document.getElementById('independent-evaluation-search')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('independent-evaluation-category-filter')?.value || '';
    const statusFilter = document.getElementById('independent-evaluation-status-filter')?.value || '';
    const audienceFilter = document.getElementById('independent-evaluation-audience-filter')?.value || '';
    
    console.log('🔍 [INDEPENDENT-EVAL] Filtros aplicados:', { searchTerm, categoryFilter, statusFilter, audienceFilter });
    loadIndependentEvaluationsList();
}

// Funciones de acción para evaluaciones independientes
function viewIndependentEvaluationDetails(evaluationId) {
    console.log('👁️ [INDEPENDENT-EVAL] Ver detalles de evaluación:', evaluationId);
    showTrainingMessage('👁️ Funcionalidad de detalles de evaluación independiente en desarrollo', 'info');
}

function editIndependentEvaluation(evaluationId) {
    console.log('✏️ [INDEPENDENT-EVAL] Editar evaluación independiente:', evaluationId);
    
    const evaluation = allIndependentEvaluations.find(e => e.id === evaluationId);
    if (!evaluation) {
        showTrainingMessage('❌ Evaluación no encontrada', 'error');
        return;
    }
    
    // Mostrar modal con datos precargados
    showIndependentEvaluationModal();
    
    // Precargar datos en el formulario
    setTimeout(() => {
        document.getElementById('independent-eval-title').value = evaluation.title || '';
        document.getElementById('independent-eval-category').value = evaluation.category || '';
        document.getElementById('independent-eval-description').value = evaluation.description || '';
        document.getElementById('independent-eval-audience').value = evaluation.audience || '';
        document.getElementById('independent-eval-time-limit').value = evaluation.timeLimit || 60;
        document.getElementById('independent-eval-min-score').value = evaluation.minScore || 70;
        document.getElementById('independent-eval-multiple-attempts').checked = evaluation.multipleAttempts || false;
        document.getElementById('independent-eval-certificate').checked = evaluation.certificate || false;
        
        // Cambiar el título del modal y botón
        const modalTitle = document.querySelector('#independentEvaluationModal h2');
        if (modalTitle) {
            modalTitle.innerHTML = '✏️ Editar Evaluación Independiente';
        }
        
        const submitButton = document.querySelector('#independentEvaluationModal button[type="submit"]');
        if (submitButton) {
            submitButton.innerHTML = '💾 Actualizar Evaluación';
        }
        
        // Marcar que estamos editando
        const form = document.getElementById('independentEvaluationForm');
        if (form) {
            form.setAttribute('data-edit-id', evaluationId);
        }
    }, 100);
}

function duplicateIndependentEvaluation(evaluationId) {
    const evaluation = allIndependentEvaluations.find(e => e.id === evaluationId);
    if (!evaluation) {
        showTrainingMessage('❌ Evaluación no encontrada', 'error');
        return;
    }
    
    const duplicated = {
        ...evaluation,
        id: Date.now(),
        title: evaluation.title + ' (Copia)',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: 0,
        results: []
    };
    
    allIndependentEvaluations.push(duplicated);
    
    // Guardar en localStorage
    saveIndependentEvaluationsToStorage();
    
    loadIndependentEvaluationsList();
    updateIndependentEvaluationsStats();
    
    showTrainingMessage(`📋 Evaluación "${evaluation.title}" duplicada exitosamente`, 'success');
}

function activateIndependentEvaluation(evaluationId) {
    const evaluation = allIndependentEvaluations.find(e => e.id === evaluationId);
    if (!evaluation) {
        showTrainingMessage('❌ Evaluación no encontrada', 'error');
        return;
    }
    
    evaluation.status = 'active';
    evaluation.updatedAt = new Date();
    
    // Guardar en localStorage
    saveIndependentEvaluationsToStorage();
    
    loadIndependentEvaluationsList();
    updateIndependentEvaluationsStats();
    
    showTrainingMessage(`▶️ Evaluación "${evaluation.title}" activada exitosamente`, 'success');
}

function deleteIndependentEvaluation(evaluationId) {
    const evaluation = allIndependentEvaluations.find(e => e.id === evaluationId);
    if (!evaluation) {
        showTrainingMessage('❌ Evaluación no encontrada', 'error');
        return;
    }
    
    if (confirm(`¿Está seguro de eliminar la evaluación "${evaluation.title}"? Esta acción no se puede deshacer.`)) {
        const index = allIndependentEvaluations.findIndex(e => e.id === evaluationId);
        if (index > -1) {
            allIndependentEvaluations.splice(index, 1);
            
            // Guardar en localStorage
            saveIndependentEvaluationsToStorage();
            
            loadIndependentEvaluationsList();
            updateIndependentEvaluationsStats();
            showTrainingMessage(`🗑️ Evaluación "${evaluation.title}" eliminada exitosamente`, 'success');
        }
    }
}

function viewIndependentEvaluationParticipants(evaluationId) {
    console.log('👥 [INDEPENDENT-EVAL] Ver participantes de evaluación:', evaluationId);
    showTrainingMessage('👥 Funcionalidad de participantes de evaluación independiente en desarrollo', 'info');
}

function generateIndependentEvaluationReport(evaluationId) {
    const evaluation = allIndependentEvaluations.find(e => e.id === evaluationId);
    if (!evaluation) {
        showTrainingMessage('❌ Evaluación no encontrada', 'error');
        return;
    }
    
    showTrainingMessage(`📊 Generando reporte para "${evaluation.title}"...`, 'info');
    
    setTimeout(() => {
        showTrainingMessage(`📊 Reporte generado exitosamente`, 'success');
    }, 2000);
}

function showIndependentExamFormGenerator() {
    console.log('🎯 [INDEPENDENT-EVAL] Mostrando generador de formularios independientes');
    showTrainingMessage('🎯 Generador de formularios para evaluaciones independientes en desarrollo', 'info');
}

function importIndependentEvaluations() {
    console.log('📥 [INDEPENDENT-EVAL] Importar evaluaciones independientes');
    showTrainingMessage('📥 Funcionalidad de importación de evaluaciones independientes en desarrollo', 'info');
}

// Inicializar algunos datos de demostración para evaluaciones independientes
function initializeIndependentEvaluationsDemo() {
    if (allIndependentEvaluations.length === 0) {
        allIndependentEvaluations.push(
            {
                id: 1001,
                title: 'Test de Conocimientos Generales IT',
                category: 'knowledge',
                description: 'Evaluación de conocimientos básicos de tecnología para todo el personal',
                audience: 'all_employees',
                timeLimit: 45,
                minScore: 75,
                multipleAttempts: true,
                certificate: false,
                status: 'active',
                createdAt: new Date('2024-11-01'),
                updatedAt: new Date('2024-11-01'),
                participants: 23,
                questions: [],
                results: []
            },
            {
                id: 1002,
                title: 'Evaluación Psicotécnica de Selección',
                category: 'psychometric',
                description: 'Test psicotécnico para proceso de selección de nuevos candidatos',
                audience: 'new_candidates',
                timeLimit: 90,
                minScore: 70,
                multipleAttempts: false,
                certificate: true,
                status: 'active',
                createdAt: new Date('2024-10-15'),
                updatedAt: new Date('2024-10-15'),
                participants: 8,
                questions: [],
                results: []
            }
        );
    }
}

// Export training functions for external use
window.trainingManagement = {
    showTrainingManagementContent,
    sendTrainingAssignmentNotifications,
    updateEmployeeScoringForTraining,
    scheduleTrainingReminders
};

// ===============================================
// 🚨 INTEGRACIÓN CON MÓDULO DE SANCIONES
// ===============================================

// Función para verificar el cumplimiento de capacitaciones y disparar sanciones
function checkTrainingComplianceForSanctions(training) {
    console.log('🚨 [TRAINING-SANCTIONS] Verificando cumplimiento de capacitación:', training.title);

    // Solo verificar capacitaciones obligatorias
    if (!training.mandatory) {
        console.log('⚠️ [TRAINING-SANCTIONS] Capacitación no obligatoria, sin verificación de sanciones');
        return;
    }

    // Simular empleados asignados
    const assignedEmployees = [1, 2, 3, 4, 5]; // En producción esto vendría de la API

    // Configurar timer para verificar vencimiento
    const checkDeadline = () => {
        const deadline = new Date(training.deadline);
        const now = new Date();

        if (now > deadline) {
            console.log('⏰ [TRAINING-SANCTIONS] Capacitación vencida, verificando empleados incumplidos');

            assignedEmployees.forEach(employeeId => {
                // Verificar si el empleado completó la capacitación
                const completed = Math.random() > 0.3; // Mock: 70% completada

                if (!completed) {
                    triggerSanctionForTrainingViolation(employeeId, training, 'missed_deadline');
                }
            });
        }
    };

    // Verificar inmediatamente si ya está vencida
    checkDeadline();

    // Configurar verificación periódica (en producción sería un job del backend)
    setTimeout(checkDeadline, 60000); // Verificar cada minuto
}

// Función para disparar sanción por incumplimiento de capacitación
function triggerSanctionForTrainingViolation(employeeId, training, violationType) {
    console.log(`🚨 [TRAINING-SANCTIONS] Disparando sanción para empleado ${employeeId} por: ${violationType}`);

    // Integración con el módulo de sanciones
    if (typeof window.applySanctionForTrainingViolation === 'function') {
        window.applySanctionForTrainingViolation(employeeId, violationType);
        console.log('✅ [TRAINING-SANCTIONS] Sanción automática aplicada');
    } else {
        console.log('⚠️ [TRAINING-SANCTIONS] Módulo de sanciones no disponible');
    }

    // Crear notificación de sanción
    if (typeof addNotificationToQueue === 'function') {
        const sanctionNotification = {
            id: `SANCTION-${training.id}-${employeeId}-${Date.now()}`,
            type: 'sanction_applied',
            priority: 'high',
            title: '🚨 Sanción Aplicada por Incumplimiento de Capacitación',
            message: `Se ha aplicado una sanción automática por no completar la capacitación obligatoria "${training.title}" dentro del plazo establecido. Su scoring ha sido afectado.`,
            userId: employeeId,
            status: 'pending',
            createdAt: new Date(),
            trainingId: training.id,
            violationType: violationType
        };

        addNotificationToQueue(sanctionNotification);
        console.log('📨 [TRAINING-SANCTIONS] Notificación de sanción enviada');
    }
}

// Función para disparar sanción por reprobar capacitación obligatoria
function triggerSanctionForTrainingFailure(employeeId, training, score) {
    console.log(`🚨 [TRAINING-SANCTIONS] Disparando sanción por reprobar capacitación obligatoria: empleado ${employeeId}, score: ${score}%`);

    const violationType = score < 40 ? 'severe_failure' : 'minor_failure';

    // Integración con el módulo de sanciones
    if (typeof window.applySanctionForTrainingViolation === 'function') {
        window.applySanctionForTrainingViolation(employeeId, violationType);
        console.log('✅ [TRAINING-SANCTIONS] Sanción automática aplicada por reprobación');
    } else {
        console.log('⚠️ [TRAINING-SANCTIONS] Módulo de sanciones no disponible');
    }

    // Crear notificación de sanción por reprobación
    if (typeof addNotificationToQueue === 'function') {
        const failureNotification = {
            id: `FAILURE-SANCTION-${training.id}-${employeeId}-${Date.now()}`,
            type: 'sanction_failure',
            priority: 'high',
            title: '🚨 Sanción por Reprobación de Capacitación Obligatoria',
            message: `Se ha aplicado una sanción por reprobar la capacitación obligatoria "${training.title}" (${score}% - Mínimo: ${training.minScore}%). Deberá repetir la capacitación y su scoring ha sido penalizado.`,
            userId: employeeId,
            status: 'pending',
            createdAt: new Date(),
            trainingId: training.id,
            score: score,
            violationType: violationType
        };

        addNotificationToQueue(failureNotification);
        console.log('📨 [TRAINING-SANCTIONS] Notificación de sanción por reprobación enviada');
    }
}

// Actualizar exports para incluir funciones de integración con sanciones
window.trainingManagement = {
    showTrainingManagementContent,
    sendTrainingAssignmentNotifications,
    updateEmployeeScoringForTraining,
    scheduleTrainingReminders,
    // 🚨 Funciones de integración con sanciones
    checkTrainingComplianceForSanctions,
    triggerSanctionForTrainingViolation,
    triggerSanctionForTrainingFailure
};

// Inicializar datos de demostración
initializeIndependentEvaluationsDemo();

console.log('✅ [TRAINING] Módulo de capacitaciones completamente cargado con integración de sanciones');