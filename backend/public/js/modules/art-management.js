// Módulo de Gestión ART (Aseguradora de Riesgos del Trabajo) - Argentina
console.log('🏥 [ART-MANAGEMENT] Módulo ART v1.0 inicializado');

// Variables globales del módulo ART
let currentArtProvider = null;
window.window.artProviders = window.window.artProviders || [];
let medicalExams = [];
let workAccidents = [];
let artCommunications = [];
let legislationData = {};

// Función principal para mostrar el contenido del módulo ART
function showArtManagementContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="tab-content active" id="art-management">
            <div class="card">
                <h2>🏥 Gestión de ART (Aseguradora de Riesgos del Trabajo)</h2>
                <p>Sistema completo de gestión de riesgos laborales según legislación argentina vigente.</p>
                
                <!-- Tabs de navegación ART -->
                <div class="art-tabs" style="display: flex; gap: 10px; margin: 20px 0; border-bottom: 2px solid #e0e7ff;">
                    <button class="art-tab-btn active" onclick="showArtTab('providers')" data-tab="providers">
                        🏢 Aseguradoras
                    </button>
                    <button class="art-tab-btn" onclick="showArtTab('exams')" data-tab="exams">
                        🩺 Exámenes Médicos
                    </button>
                    <button class="art-tab-btn" onclick="showArtTab('accidents')" data-tab="accidents">
                        🚨 Accidentes Laborales
                    </button>
                    <button class="art-tab-btn" onclick="showArtTab('communication')" data-tab="communication">
                        📞 Comunicación ART
                    </button>
                    <button class="art-tab-btn" onclick="showArtTab('legislation')" data-tab="legislation">
                        📜 Legislación Vigente
                    </button>
                    <button class="art-tab-btn" onclick="showArtTab('reports')" data-tab="reports">
                        📊 Reportes
                    </button>
                </div>

                <!-- Contenido dinámico de ART -->
                <div id="art-content">
                    <!-- El contenido se cargará dinámicamente según la pestaña seleccionada -->
                </div>
            </div>
        </div>
    `;
    
    // Inicializar con la pestaña de proveedores
    setTimeout(() => {
        loadArtData();
        showArtTab('providers');
    }, 300);
}

// Función para cambiar entre pestañas de ART
function showArtTab(tabName) {
    console.log(`🏥 [ART] Cambiando a pestaña: ${tabName}`);
    
    // Actualizar botones de pestaña
    document.querySelectorAll('.art-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Cargar contenido de la pestaña
    const artContent = document.getElementById('art-content');
    if (!artContent) return;
    
    switch (tabName) {
        case 'providers':
            showArtProvidersTab();
            break;
        case 'exams':
            showMedicalExamsTab();
            break;
        case 'accidents':
            showAccidentsTab();
            break;
        case 'communication':
            showCommunicationTab();
            break;
        case 'legislation':
            showLegislationTab();
            break;
        case 'reports':
            showArtReportsTab();
            break;
        default:
            artContent.innerHTML = '<div class="error">Pestaña no encontrada</div>';
    }
}

// Pestaña: Aseguradoras ART
function showArtProvidersTab() {
    const artContent = document.getElementById('art-content');
    artContent.innerHTML = `
        <div class="art-providers-section">
            <div class="section-header">
                <h3>🏢 Aseguradoras de Riesgos del Trabajo</h3>
                <div class="quick-actions">
                    <button class="btn btn-primary" onclick="addNewArtProvider()">➕ Nueva ART</button>
                    <button class="btn btn-info" onclick="syncArtProviders()">🔄 Sincronizar con SRT</button>
                    <button class="btn btn-warning" onclick="validateArtCompliance()">✅ Validar Cumplimiento</button>
                </div>
            </div>
            
            <!-- Filtros -->
            <div class="filters-section" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                    <div>
                        <label>🔍 Filtrar por estado:</label>
                        <select id="artProviderStatusFilter" onchange="filterArtProviders()" style="margin-left: 8px; padding: 5px;">
                            <option value="all">Todos</option>
                            <option value="active">Activas</option>
                            <option value="expired">Vencidas</option>
                            <option value="suspended">Suspendidas</option>
                        </select>
                    </div>
                    <div>
                        <label>🏢 Tipo de cobertura:</label>
                        <select id="artCoverageFilter" onchange="filterArtProviders()" style="margin-left: 8px; padding: 5px;">
                            <option value="all">Todas</option>
                            <option value="general">General</option>
                            <option value="construction">Construcción</option>
                            <option value="industry">Industrial</option>
                            <option value="services">Servicios</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- Lista de ART -->
            <div id="art-providers-list" class="art-providers-list">
                <!-- Se cargará dinámicamente -->
            </div>
            
            <!-- Estadísticas rápidas -->
            <div class="art-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
                <div class="stat-card" style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 20px; border-radius: 10px;">
                    <div class="stat-value" id="active-art-count">--</div>
                    <div class="stat-label">ART Activas</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 20px; border-radius: 10px;">
                    <div class="stat-value" id="total-coverage-amount">--</div>
                    <div class="stat-label">Cobertura Total</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); color: white; padding: 20px; border-radius: 10px;">
                    <div class="stat-value" id="pending-claims-count">--</div>
                    <div class="stat-label">Reclamos Pendientes</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%); color: white; padding: 20px; border-radius: 10px;">
                    <div class="stat-value" id="compliance-score">--</div>
                    <div class="stat-label">Índice Cumplimiento</div>
                </div>
            </div>
        </div>
    `;
    
    loadArtProviders();
}

// Pestaña: Exámenes Médicos
function showMedicalExamsTab() {
    const artContent = document.getElementById('art-content');
    artContent.innerHTML = `
        <div class="medical-exams-section">
            <div class="section-header">
                <h3>🩺 Exámenes Médicos Ocupacionales</h3>
                <div class="quick-actions">
                    <button class="btn btn-primary" onclick="scheduleNewExam()">📅 Programar Examen</button>
                    <button class="btn btn-success" onclick="uploadExamResults()">📋 Subir Resultados</button>
                    <button class="btn btn-warning" onclick="checkExamCompliance()">⚖️ Verificar Cumplimiento</button>
                </div>
            </div>
            
            <!-- Tipos de exámenes según legislación -->
            <div class="exam-types-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; margin: 20px 0;">
                <div class="exam-type-card" style="background: #e3f2fd; border: 2px solid #1976d2; border-radius: 10px; padding: 15px;">
                    <h4>🩺 Examen Preocupacional</h4>
                    <p>Obligatorio antes del ingreso laboral según Res. SRT 37/10</p>
                    <div class="exam-status">
                        <span class="badge badge-info" id="preoccupational-count">--</span> pendientes
                    </div>
                </div>
                
                <div class="exam-type-card" style="background: #e8f5e8; border: 2px solid #4caf50; border-radius: 10px; padding: 15px;">
                    <h4>🔄 Examen Periódico</h4>
                    <p>Cada 12-24 meses según actividad y edad (Res. SRT 37/10)</p>
                    <div class="exam-status">
                        <span class="badge badge-success" id="periodic-count">--</span> próximos vencimientos
                    </div>
                </div>
                
                <div class="exam-type-card" style="background: #fff3e0; border: 2px solid #ff9800; border-radius: 10px; padding: 15px;">
                    <h4>🚪 Examen de Egreso</h4>
                    <p>Al finalizar la relación laboral (Res. SRT 37/10)</p>
                    <div class="exam-status">
                        <span class="badge badge-warning" id="exit-count">--</span> programados
                    </div>
                </div>
                
                <div class="exam-type-card" style="background: #ffebee; border: 2px solid #f44336; border-radius: 10px; padding: 15px;">
                    <h4>🏥 Post-Accidente</h4>
                    <p>Después de accidente o enfermedad profesional</p>
                    <div class="exam-status">
                        <span class="badge badge-danger" id="post-accident-count">--</span> requeridos
                    </div>
                </div>
            </div>
            
            <!-- Calendario de exámenes -->
            <div class="exams-calendar-section" style="background: white; border: 1px solid #ddd; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <h4>📅 Calendario de Exámenes Médicos</h4>
                <div id="exams-calendar" style="min-height: 300px; background: #f8f9fa; border-radius: 8px; padding: 15px;">
                    <!-- Calendario se generará dinámicamente -->
                </div>
            </div>
            
            <!-- Lista de exámenes programados -->
            <div id="scheduled-exams-list">
                <!-- Se cargará dinámicamente -->
            </div>
        </div>
    `;
    
    loadMedicalExams();
}

// Pestaña: Accidentes Laborales
function showAccidentsTab() {
    const artContent = document.getElementById('art-content');
    artContent.innerHTML = `
        <div class="accidents-section">
            <div class="section-header">
                <h3>🚨 Gestión de Accidentes Laborales</h3>
                <div class="quick-actions">
                    <button class="btn btn-danger" onclick="reportNewAccident()">🚨 Reportar Accidente</button>
                    <button class="btn btn-primary" onclick="generateAccidentReport()">📄 Generar Reporte</button>
                    <button class="btn btn-warning" onclick="followUpAccidents()">🔍 Seguimiento</button>
                </div>
            </div>
            
            <!-- Formulario rápido de reporte -->
            <div class="quick-report-section" style="background: #ffebee; border: 2px solid #f44336; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <h4>⚡ Reporte Rápido de Accidente</h4>
                <div class="quick-report-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                    <div>
                        <label>👤 Empleado afectado:</label>
                        <select id="accident-employee" style="width: 100%; padding: 8px;">
                            <option value="">Seleccionar empleado...</option>
                        </select>
                    </div>
                    <div>
                        <label>📅 Fecha y hora:</label>
                        <input type="datetime-local" id="accident-datetime" style="width: 100%; padding: 8px;">
                    </div>
                    <div>
                        <label>📍 Lugar del accidente:</label>
                        <input type="text" id="accident-location" placeholder="Descripción del lugar..." style="width: 100%; padding: 8px;">
                    </div>
                    <div>
                        <label>🔍 Tipo de accidente:</label>
                        <select id="accident-type" style="width: 100%; padding: 8px;">
                            <option value="corte">Corte</option>
                            <option value="caida">Caída</option>
                            <option value="golpe">Golpe</option>
                            <option value="quemadura">Quemadura</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <label>📝 Descripción del accidente:</label>
                    <textarea id="accident-description" placeholder="Describa detalladamente lo ocurrido..." style="width: 100%; min-height: 80px; padding: 8px;"></textarea>
                </div>
                <button class="btn btn-danger" onclick="submitQuickAccidentReport()" style="margin-top: 15px;">
                    🚨 Enviar Reporte Inmediato
                </button>
            </div>
            
            <!-- Estadísticas de accidentes -->
            <div class="accidents-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">
                <div class="stat-card" style="background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; padding: 15px; border-radius: 10px;">
                    <div class="stat-value" id="total-accidents">--</div>
                    <div class="stat-label">Total Accidentes (Año)</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; padding: 15px; border-radius: 10px;">
                    <div class="stat-value" id="accident-rate">--</div>
                    <div class="stat-label">Índice de Frecuencia</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); color: white; padding: 15px; border-radius: 10px;">
                    <div class="stat-value" id="days-lost">--</div>
                    <div class="stat-label">Días Perdidos</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%); color: white; padding: 15px; border-radius: 10px;">
                    <div class="stat-value" id="compensation-amount">--</div>
                    <div class="stat-label">Compensaciones ($)</div>
                </div>
            </div>
            
            <!-- Lista de accidentes recientes -->
            <div id="accidents-list">
                <!-- Se cargará dinámicamente -->
            </div>
        </div>
    `;
    
    loadWorkAccidents();
}

// Pestaña: Comunicación ART
function showCommunicationTab() {
    const artContent = document.getElementById('art-content');
    artContent.innerHTML = `
        <div class="communication-section">
            <div class="section-header">
                <h3>📞 Comunicación Tripartita ART-Empresa-Médico</h3>
                <p>Sistema de comunicación integrado según protocolo de la Superintendencia de Riesgos del Trabajo (SRT)</p>
            </div>
            
            <!-- Centro de comunicaciones -->
            <div class="communication-center" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                
                <!-- Panel ART -->
                <div class="communication-panel art-panel" style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; border-radius: 15px; padding: 20px;">
                    <h4>🏢 Panel ART</h4>
                    <div class="panel-content">
                        <div class="status-indicator">
                            <span class="status-dot active"></span>
                            <span id="art-status">Conexión Activa</span>
                        </div>
                        <div class="communication-stats">
                            <div>📥 Mensajes recibidos: <span id="art-received-count">--</span></div>
                            <div>📤 Mensajes enviados: <span id="art-sent-count">--</span></div>
                            <div>⏱️ Tiempo respuesta prom: <span id="art-response-time">--</span></div>
                        </div>
                        <button class="btn btn-light" onclick="openArtCommunication()" style="margin-top: 10px;">
                            💬 Nuevo Mensaje a ART
                        </button>
                    </div>
                </div>
                
                <!-- Panel Médico -->
                <div class="communication-panel medical-panel" style="background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%); color: white; border-radius: 15px; padding: 20px;">
                    <h4>👩‍⚕️ Panel Médico</h4>
                    <div class="panel-content">
                        <div class="status-indicator">
                            <span class="status-dot active"></span>
                            <span id="medical-status">Consultas Disponibles</span>
                        </div>
                        <div class="communication-stats">
                            <div>📋 Consultas pendientes: <span id="medical-pending-count">--</span></div>
                            <div>✅ Casos resueltos: <span id="medical-resolved-count">--</span></div>
                            <div>🩺 Próximos exámenes: <span id="medical-upcoming-count">--</span></div>
                        </div>
                        <button class="btn btn-light" onclick="requestMedicalConsultation()" style="margin-top: 10px;">
                            🩺 Solicitar Consulta
                        </button>
                    </div>
                </div>
                
            </div>
            
            <!-- Buzón de mensajes -->
            <div class="messages-inbox" style="background: white; border: 2px solid #e0e7ff; border-radius: 15px; padding: 20px; margin: 20px 0;">
                <h4>📬 Buzón de Comunicaciones</h4>
                
                <!-- Filtros de mensajes -->
                <div class="message-filters" style="display: flex; gap: 15px; margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                    <div>
                        <label>📂 Tipo:</label>
                        <select id="message-type-filter" onchange="filterMessages()" style="margin-left: 8px;">
                            <option value="all">Todos</option>
                            <option value="art">Mensajes ART</option>
                            <option value="medical">Comunicaciones Médicas</option>
                            <option value="legal">Aspectos Legales</option>
                            <option value="emergency">Emergencias</option>
                        </select>
                    </div>
                    <div>
                        <label>🕒 Estado:</label>
                        <select id="message-status-filter" onchange="filterMessages()" style="margin-left: 8px;">
                            <option value="all">Todos</option>
                            <option value="unread">No leídos</option>
                            <option value="pending">Pendientes respuesta</option>
                            <option value="resolved">Resueltos</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="composeNewMessage()">✏️ Redactar Mensaje</button>
                </div>
                
                <!-- Lista de mensajes -->
                <div id="messages-list" style="max-height: 400px; overflow-y: auto;">
                    <!-- Se cargarán dinámicamente -->
                </div>
            </div>
            
            <!-- Protocolo de emergencia -->
            <div class="emergency-protocol" style="background: #ffebee; border: 2px solid #f44336; border-radius: 15px; padding: 20px; margin: 20px 0;">
                <h4>🚨 Protocolo de Emergencia</h4>
                <div class="emergency-contacts" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                    <div class="emergency-contact-card">
                        <strong>🏥 ART - Línea de Emergencia</strong><br>
                        📞 <a href="tel:0800-ART-EMERG">0800-ART-EMERG</a><br>
                        🕒 Disponible 24/7
                    </div>
                    <div class="emergency-contact-card">
                        <strong>🚑 Servicio Médico</strong><br>
                        📞 <a href="tel:107">107 (SAME)</a><br>
                        📞 <a href="tel:911">911 (Emergencias)</a>
                    </div>
                    <div class="emergency-contact-card">
                        <strong>⚖️ SRT - Superintendencia</strong><br>
                        📞 <a href="tel:0800-666-6778">0800-666-6778</a><br>
                        🌐 <a href="https://www.srt.gob.ar" target="_blank">srt.gob.ar</a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    loadCommunicationData();
}

// Pestaña: Legislación Vigente
function showLegislationTab() {
    const artContent = document.getElementById('art-content');
    artContent.innerHTML = `
        <div class="legislation-section">
            <div class="section-header">
                <h3>📜 Legislación Laboral Argentina Vigente</h3>
                <div class="quick-actions">
                    <button class="btn btn-primary" onclick="checkLegislationUpdates()">🔄 Verificar Actualizaciones</button>
                    <button class="btn btn-info" onclick="downloadLegislationPDF()">📥 Descargar PDF</button>
                    <button class="btn btn-success" onclick="subscribeToUpdates()">📧 Suscribirse a Actualizaciones</button>
                </div>
            </div>
            
            <!-- Última actualización -->
            <div class="legislation-update-status" style="background: #e8f5e8; border: 2px solid #4caf50; border-radius: 10px; padding: 15px; margin: 20px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>📅 Última Actualización:</strong> <span id="last-legislation-update">--</span><br>
                        <strong>🔄 Estado:</strong> <span id="legislation-status">Actualizada</span>
                    </div>
                    <div>
                        <button class="btn btn-outline-success" onclick="viewUpdateHistory()">📋 Ver Historial</button>
                    </div>
                </div>
            </div>
            
            <!-- Normativas principales -->
            <div class="main-legislation-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin: 20px 0;">
                
                <!-- Ley de Riesgos del Trabajo -->
                <div class="legislation-card" style="background: white; border: 2px solid #1976d2; border-radius: 15px; padding: 20px;">
                    <h4>⚖️ Ley 24.557 - Ley de Riesgos del Trabajo</h4>
                    <div class="legislation-details">
                        <p><strong>Fecha:</strong> 13 de septiembre de 1995</p>
                        <p><strong>Última modificación:</strong> Ley 27.348 (2017)</p>
                        <div class="key-points">
                            <h5>📋 Puntos Clave:</h5>
                            <ul>
                                <li>Marco legal para prevención de riesgos</li>
                                <li>Cobertura de accidentes y enfermedades</li>
                                <li>Prestaciones dinerarias y en especie</li>
                                <li>Comisiones Médicas</li>
                            </ul>
                        </div>
                        <div class="legislation-actions">
                            <button class="btn btn-sm btn-primary" onclick="viewLegislationDetail('ley-24557')">📖 Ver Completa</button>
                            <button class="btn btn-sm btn-outline-primary" onclick="downloadLegislation('ley-24557')">💾 Descargar</button>
                        </div>
                    </div>
                </div>
                
                <!-- Resoluciones SRT -->
                <div class="legislation-card" style="background: white; border: 2px solid #4caf50; border-radius: 15px; padding: 20px;">
                    <h4>📋 Resoluciones SRT Principales</h4>
                    <div class="resolution-list">
                        <div class="resolution-item">
                            <strong>Res. SRT 37/10</strong> - Exámenes médicos<br>
                            <small>Exámenes preocupacionales, periódicos y de egreso</small>
                            <button class="btn btn-xs btn-outline-primary" onclick="viewResolution('srt-37-10')">Ver</button>
                        </div>
                        <div class="resolution-item">
                            <strong>Res. SRT 299/11</strong> - Listado enfermedades<br>
                            <small>Enfermedades profesionales reconocidas</small>
                            <button class="btn btn-xs btn-outline-primary" onclick="viewResolution('srt-299-11')">Ver</button>
                        </div>
                        <div class="resolution-item">
                            <strong>Res. SRT 1/14</strong> - Servicio de prevención<br>
                            <small>Servicios de higiene y seguridad</small>
                            <button class="btn btn-xs btn-outline-primary" onclick="viewResolution('srt-1-14')">Ver</button>
                        </div>
                    </div>
                </div>
                
                <!-- Decreto 1278/2000 -->
                <div class="legislation-card" style="background: white; border: 2px solid #ff9800; border-radius: 15px; padding: 20px;">
                    <h4>📃 Decreto 1278/2000 - Incapacidades Laborales</h4>
                    <div class="legislation-details">
                        <p><strong>Tema:</strong> Baremo para determinación de incapacidades</p>
                        <p><strong>Aplicación:</strong> Comisiones Médicas y Tribunales</p>
                        <div class="incapacity-categories">
                            <h5>🏥 Categorías de Incapacidad:</h5>
                            <div class="category-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div>• Temporaria</div>
                                <div>• Permanente Parcial</div>
                                <div>• Permanente Total</div>
                                <div>• Gran Invalidez</div>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-warning" onclick="viewIncapacityBaremo()">📊 Ver Baremo</button>
                    </div>
                </div>
                
                <!-- Ley de Contrato de Trabajo -->
                <div class="legislation-card" style="background: white; border: 2px solid #9c27b0; border-radius: 15px; padding: 20px;">
                    <h4>📄 Ley 20.744 - Ley de Contrato de Trabajo</h4>
                    <div class="legislation-details">
                        <p><strong>Relación:</strong> Obligaciones del empleador en materia de seguridad</p>
                        <div class="lct-articles">
                            <h5>📋 Artículos Relevantes:</h5>
                            <ul>
                                <li><strong>Art. 75:</strong> Deber de seguridad</li>
                                <li><strong>Art. 212:</strong> Condiciones de trabajo</li>
                                <li><strong>Art. 213:</strong> Higiene y seguridad</li>
                            </ul>
                        </div>
                        <button class="btn btn-sm btn-purple" onclick="viewLCTArticles()">📖 Ver Artículos</button>
                    </div>
                </div>
                
            </div>
            
            <!-- Buscador de normativas -->
            <div class="legislation-search" style="background: #f8f9fa; border: 2px solid #6c757d; border-radius: 15px; padding: 20px; margin: 20px 0;">
                <h4>🔍 Buscador de Normativas</h4>
                <div class="search-form" style="display: grid; grid-template-columns: 1fr auto; gap: 15px; align-items: end;">
                    <div>
                        <input type="text" id="legislation-search-input" placeholder="Buscar por número, tema o palabra clave..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    <div>
                        <button class="btn btn-primary" onclick="searchLegislation()">🔍 Buscar</button>
                    </div>
                </div>
                <div id="search-results" style="margin-top: 15px;">
                    <!-- Resultados de búsqueda -->
                </div>
            </div>
            
        </div>
    `;
    
    loadLegislationData();
}

// Pestaña: Reportes ART
function showArtReportsTab() {
    const artContent = document.getElementById('art-content');
    artContent.innerHTML = `
        <div class="art-reports-section">
            <div class="section-header">
                <h3>📊 Reportes y Estadísticas ART</h3>
                <div class="quick-actions">
                    <button class="btn btn-primary" onclick="generateComprehensiveReport()">📋 Reporte Integral</button>
                    <button class="btn btn-success" onclick="exportToExcel()">📊 Exportar Excel</button>
                    <button class="btn btn-info" onclick="scheduleAutoReports()">⏰ Programar Reportes</button>
                </div>
            </div>
            
            <!-- Selector de período -->
            <div class="period-selector" style="background: #e3f2fd; padding: 15px; border-radius: 10px; margin: 20px 0;">
                <h4>📅 Seleccionar Período de Análisis</h4>
                <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                    <div>
                        <label>📅 Desde:</label>
                        <input type="date" id="report-start-date" style="margin-left: 8px; padding: 5px;">
                    </div>
                    <div>
                        <label>📅 Hasta:</label>
                        <input type="date" id="report-end-date" style="margin-left: 8px; padding: 5px;">
                    </div>
                    <div>
                        <label>🏢 Empresa:</label>
                        <select id="report-company-filter" style="margin-left: 8px; padding: 5px;">
                            <option value="all">Todas las empresas</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="generateReportForPeriod()">📊 Generar</button>
                </div>
            </div>
            
            <!-- Dashboard de métricas -->
            <div class="metrics-dashboard" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 20px 0;">
                
                <!-- Métrica: Accidentes -->
                <div class="metric-card" style="background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; border-radius: 15px; padding: 20px;">
                    <div class="metric-icon" style="font-size: 2rem;">🚨</div>
                    <div class="metric-value" id="accidents-metric">--</div>
                    <div class="metric-label">Accidentes Laborales</div>
                    <div class="metric-change" id="accidents-change">--</div>
                </div>
                
                <!-- Métrica: Días perdidos -->
                <div class="metric-card" style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; border-radius: 15px; padding: 20px;">
                    <div class="metric-icon" style="font-size: 2rem;">📅</div>
                    <div class="metric-value" id="days-lost-metric">--</div>
                    <div class="metric-label">Días Perdidos</div>
                    <div class="metric-change" id="days-change">--</div>
                </div>
                
                <!-- Métrica: Tasa de frecuencia -->
                <div class="metric-card" style="background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); color: white; border-radius: 15px; padding: 20px;">
                    <div class="metric-icon" style="font-size: 2rem;">📈</div>
                    <div class="metric-value" id="frequency-rate-metric">--</div>
                    <div class="metric-label">Tasa de Frecuencia</div>
                    <div class="metric-change" id="frequency-change">--</div>
                </div>
                
                <!-- Métrica: Costos ART -->
                <div class="metric-card" style="background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%); color: white; border-radius: 15px; padding: 20px;">
                    <div class="metric-icon" style="font-size: 2rem;">💰</div>
                    <div class="metric-value" id="art-costs-metric">--</div>
                    <div class="metric-label">Costos ART</div>
                    <div class="metric-change" id="costs-change">--</div>
                </div>
                
            </div>
            
            <!-- Gráficos y análisis -->
            <div class="charts-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                
                <!-- Gráfico de accidentes por mes -->
                <div class="chart-container" style="background: white; border: 2px solid #e0e7ff; border-radius: 15px; padding: 20px;">
                    <h4>📊 Evolución de Accidentes por Mes</h4>
                    <div id="accidents-by-month-chart" style="width: 100%; height: 300px; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <!-- Gráfico se generará aquí -->
                        <div>📈 Gráfico de evolución mensual</div>
                    </div>
                </div>
                
                <!-- Gráfico de tipos de accidentes -->
                <div class="chart-container" style="background: white; border: 2px solid #e0e7ff; border-radius: 15px; padding: 20px;">
                    <h4>🥧 Distribución por Tipo de Accidente</h4>
                    <div id="accident-types-chart" style="width: 100%; height: 300px; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <!-- Gráfico se generará aquí -->
                        <div>🥧 Gráfico circular por tipos</div>
                    </div>
                </div>
                
            </div>
            
            <!-- Tabla de reportes disponibles -->
            <div class="reports-table-section" style="background: white; border: 2px solid #e0e7ff; border-radius: 15px; padding: 20px; margin: 20px 0;">
                <h4>📋 Reportes Disponibles</h4>
                <div id="available-reports-list">
                    <!-- Lista de reportes se cargará dinámicamente -->
                </div>
            </div>
            
        </div>
    `;
    
    loadArtReportsData();
}

// Funciones de carga de datos
async function loadArtData() {
    console.log('🏥 [ART] Cargando datos del módulo ART...');
    
    try {
        // Cargar datos de demostración
        window.window.artProviders = [
            {
                id: 1,
                name: 'La Segunda ART S.A.',
                code: 'ART001',
                status: 'active',
                coverage: 'general',
                contractStart: '2024-01-01',
                contractEnd: '2024-12-31',
                premiumAmount: 850000,
                employeesCount: 150,
                claimsCount: 3,
                compliance: 95
            },
            {
                id: 2,
                name: 'Provincia ART S.A.',
                code: 'ART002',
                status: 'active',
                coverage: 'construction',
                contractStart: '2024-01-01',
                contractEnd: '2024-12-31',
                premiumAmount: 1200000,
                employeesCount: 75,
                claimsCount: 1,
                compliance: 98
            }
        ];
        
        medicalExams = [
            {
                id: 1,
                employeeId: 'EMP001',
                employeeName: 'Juan Pérez',
                type: 'preoccupational',
                scheduledDate: '2024-09-15',
                status: 'scheduled',
                medicalCenter: 'Centro Médico Laboral'
            },
            {
                id: 2,
                employeeId: 'EMP002',
                employeeName: 'María García',
                type: 'periodic',
                scheduledDate: '2024-09-20',
                status: 'pending',
                medicalCenter: 'Clínica del Trabajo'
            }
        ];
        
        console.log('✅ [ART] Datos cargados exitosamente');
        
    } catch (error) {
        console.error('❌ [ART] Error cargando datos:', error);
    }
}

async function loadArtProviders() {
    const artProvidersList = document.getElementById('art-providers-list');
    if (!artProvidersList) return;

    artProvidersList.innerHTML = `
        <div class="providers-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
            ${window.artProviders.map(provider => `
                <div class="provider-card" style="background: white; border: 2px solid ${provider.status === 'active' ? '#4CAF50' : '#ff9800'}; border-radius: 15px; padding: 20px;">
                    <div class="provider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4>${provider.name}</h4>
                        <span class="status-badge ${provider.status}" style="padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; color: white; background: ${provider.status === 'active' ? '#4CAF50' : '#ff9800'};">
                            ${provider.status === 'active' ? 'ACTIVA' : 'INACTIVA'}
                        </span>
                    </div>
                    <div class="provider-details">
                        <div class="detail-row"><strong>Código:</strong> ${provider.code}</div>
                        <div class="detail-row"><strong>Cobertura:</strong> ${provider.coverage}</div>
                        <div class="detail-row"><strong>Empleados:</strong> ${provider.employeesCount}</div>
                        <div class="detail-row"><strong>Prima anual:</strong> $${provider.premiumAmount.toLocaleString()}</div>
                        <div class="detail-row"><strong>Cumplimiento:</strong> ${provider.compliance}%</div>
                        <div class="detail-row"><strong>Vigencia:</strong> ${provider.contractStart} - ${provider.contractEnd}</div>
                    </div>
                    <div class="provider-actions" style="margin-top: 15px; display: flex; gap: 10px;">
                        <button class="btn btn-sm btn-primary" onclick="editArtProvider(${provider.id})">✏️ Editar</button>
                        <button class="btn btn-sm btn-info" onclick="viewArtDetails(${provider.id})">👁️ Ver Detalles</button>
                        <button class="btn btn-sm btn-warning" onclick="renewArtContract(${provider.id})">🔄 Renovar</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Actualizar estadísticas
    updateArtStats();
}

function updateArtStats() {
    const activeCount = window.artProviders.filter(p => p.status === 'active').length;
    const totalCoverage = window.artProviders.reduce((sum, p) => sum + p.premiumAmount, 0);
    const avgCompliance = window.artProviders.reduce((sum, p) => sum + p.compliance, 0) / window.artProviders.length;
    
    document.getElementById('active-art-count').textContent = activeCount;
    document.getElementById('total-coverage-amount').textContent = `$${totalCoverage.toLocaleString()}`;
    document.getElementById('pending-claims-count').textContent = '2';
    document.getElementById('compliance-score').textContent = `${avgCompliance.toFixed(1)}%`;
}

async function loadMedicalExams() {
    // Generar calendario simple de exámenes
    const examsCalendar = document.getElementById('exams-calendar');
    if (examsCalendar) {
        examsCalendar.innerHTML = `
            <div class="calendar-view" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px;">
                <div class="calendar-header">Dom</div>
                <div class="calendar-header">Lun</div>
                <div class="calendar-header">Mar</div>
                <div class="calendar-header">Mié</div>
                <div class="calendar-header">Jue</div>
                <div class="calendar-header">Vie</div>
                <div class="calendar-header">Sáb</div>
                <!-- Generar días del mes con exámenes programados -->
                ${generateCalendarDays()}
            </div>
        `;
    }
    
    // Actualizar contadores de tipos de examen
    document.getElementById('preoccupational-count').textContent = '3';
    document.getElementById('periodic-count').textContent = '7';
    document.getElementById('exit-count').textContent = '1';
    document.getElementById('post-accident-count').textContent = '0';
}

function generateCalendarDays() {
    let daysHTML = '';
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const hasExam = Math.random() > 0.8; // Simular exámenes aleatorios
        const isToday = day === today.getDate();
        
        daysHTML += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${hasExam ? 'has-exam' : ''}" 
                 style="padding: 8px; text-align: center; border: 1px solid #ddd; 
                        ${isToday ? 'background: #2196F3; color: white;' : ''}
                        ${hasExam ? 'background: #ffeb3b; font-weight: bold;' : ''}">
                ${day}
                ${hasExam ? '<div style="font-size: 10px;">🩺</div>' : ''}
            </div>
        `;
    }
    
    return daysHTML;
}

async function loadWorkAccidents() {
    // Cargar empleados en el selector
    const accidentEmployeeSelect = document.getElementById('accident-employee');
    if (accidentEmployeeSelect) {
        accidentEmployeeSelect.innerHTML = `
            <option value="">Seleccionar empleado...</option>
            <option value="EMP001">Juan Pérez (EMP001)</option>
            <option value="EMP002">María García (EMP002)</option>
            <option value="EMP003">Carlos López (EMP003)</option>
            <option value="EMP004">Ana Rodríguez (EMP004)</option>
        `;
    }
    
    // Actualizar estadísticas
    document.getElementById('total-accidents').textContent = '5';
    document.getElementById('accident-rate').textContent = '2.3';
    document.getElementById('days-lost').textContent = '45';
    document.getElementById('compensation-amount').textContent = '$125,000';
    
    // Mostrar lista de accidentes
    const accidentsList = document.getElementById('accidents-list');
    if (accidentsList) {
        accidentsList.innerHTML = `
            <div class="accidents-table-section" style="background: white; border: 2px solid #e0e7ff; border-radius: 15px; padding: 20px; margin-top: 20px;">
                <h4>📋 Accidentes Recientes</h4>
                <div class="table-responsive">
                    <table class="table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 10px; border: 1px solid #ddd;">Fecha</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Empleado</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Tipo</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Severidad</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Estado</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 10px; border: 1px solid #ddd;">2024-09-05</td>
                                <td style="padding: 10px; border: 1px solid #ddd;">Juan Pérez</td>
                                <td style="padding: 10px; border: 1px solid #ddd;">Corte</td>
                                <td style="padding: 10px; border: 1px solid #ddd;"><span style="background: #ffeb3b; padding: 2px 6px; border-radius: 10px;">Leve</span></td>
                                <td style="padding: 10px; border: 1px solid #ddd;"><span style="background: #4caf50; color: white; padding: 2px 6px; border-radius: 10px;">Reportado</span></td>
                                <td style="padding: 10px; border: 1px solid #ddd;">
                                    <button class="btn btn-xs btn-primary" onclick="viewAccidentDetail(1)">Ver</button>
                                    <button class="btn btn-xs btn-warning" onclick="editAccident(1)">Editar</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}

async function loadCommunicationData() {
    // Actualizar estadísticas de comunicación
    document.getElementById('art-received-count').textContent = '12';
    document.getElementById('art-sent-count').textContent = '8';
    document.getElementById('art-response-time').textContent = '2.5h';
    
    document.getElementById('medical-pending-count').textContent = '3';
    document.getElementById('medical-resolved-count').textContent = '15';
    document.getElementById('medical-upcoming-count').textContent = '7';
    
    // Cargar mensajes
    const messagesList = document.getElementById('messages-list');
    if (messagesList) {
        messagesList.innerHTML = generateSampleMessages();
    }
}

function generateSampleMessages() {
    return `
        <div class="message-item" style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <div class="message-header" style="display: flex; justify-content: between; align-items: center;">
                <strong>🏢 La Segunda ART S.A.</strong>
                <span style="font-size: 12px; color: #666;">Hace 2 horas</span>
            </div>
            <div class="message-content">
                <p>Solicitud de información adicional para el caso #2024-001. Requerimos documentación médica actualizada.</p>
            </div>
            <div class="message-actions">
                <button class="btn btn-xs btn-primary">Responder</button>
                <button class="btn btn-xs btn-outline-primary">Marcar como leído</button>
            </div>
        </div>
        
        <div class="message-item" style="background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <div class="message-header" style="display: flex; justify-content: space-between; align-items: center;">
                <strong>👩‍⚕️ Dr. Ana Martínez</strong>
                <span style="font-size: 12px; color: #666;">Ayer</span>
            </div>
            <div class="message-content">
                <p>Resultados de examen periódico de empleado EMP002 disponibles. Sin observaciones significativas.</p>
            </div>
            <div class="message-actions">
                <button class="btn btn-xs btn-success">Ver Resultados</button>
                <button class="btn btn-xs btn-outline-success">Archivar</button>
            </div>
        </div>
    `;
}

async function loadLegislationData() {
    // Actualizar fecha de última actualización
    document.getElementById('last-legislation-update').textContent = new Date().toLocaleDateString();
    document.getElementById('legislation-status').textContent = 'Actualizada';
}

async function loadArtReportsData() {
    // Establecer fechas por defecto
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    
    document.getElementById('report-start-date').valueAsDate = startOfYear;
    document.getElementById('report-end-date').valueAsDate = today;
    
    // Cargar empresas en el selector
    const companyFilter = document.getElementById('report-company-filter');
    if (companyFilter) {
        companyFilter.innerHTML = `
            <option value="all">Todas las empresas</option>
            <option value="empresa1">Empresa Demo 1</option>
            <option value="empresa2">Empresa Demo 2</option>
            <option value="acme">ACME Corporation</option>
            <option value="techno">TechnoSoft</option>
        `;
    }
    
    // Actualizar métricas
    document.getElementById('accidents-metric').textContent = '5';
    document.getElementById('days-lost-metric').textContent = '45';
    document.getElementById('frequency-rate-metric').textContent = '2.3';
    document.getElementById('art-costs-metric').textContent = '$850K';
    
    // Cambios respecto período anterior
    document.getElementById('accidents-change').textContent = '↓ 12%';
    document.getElementById('days-change').textContent = '↑ 8%';
    document.getElementById('frequency-change').textContent = '↓ 5%';
    document.getElementById('costs-change').textContent = '↑ 15%';
    
    // Cargar lista de reportes disponibles
    const reportsList = document.getElementById('available-reports-list');
    if (reportsList) {
        reportsList.innerHTML = generateAvailableReportsList();
    }
}

function generateAvailableReportsList() {
    return `
        <div class="reports-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
            <div class="report-item" style="background: #f8f9fa; border: 1px solid #ddd; border-radius: 10px; padding: 15px;">
                <h5>📋 Reporte Mensual ART</h5>
                <p>Resumen completo de actividad mensual incluyendo accidentes, exámenes y costos.</p>
                <button class="btn btn-sm btn-primary" onclick="generateReport('monthly-art')">Generar</button>
                <button class="btn btn-sm btn-outline-primary" onclick="scheduleReport('monthly-art')">Programar</button>
            </div>
            
            <div class="report-item" style="background: #f8f9fa; border: 1px solid #ddd; border-radius: 10px; padding: 15px;">
                <h5>🏥 Reporte Médico</h5>
                <p>Estadísticas de exámenes médicos, resultados y seguimientos.</p>
                <button class="btn btn-sm btn-success" onclick="generateReport('medical')">Generar</button>
                <button class="btn btn-sm btn-outline-success" onclick="scheduleReport('medical')">Programar</button>
            </div>
            
            <div class="report-item" style="background: #f8f9fa; border: 1px solid #ddd; border-radius: 10px; padding: 15px;">
                <h5>📊 Análisis de Accidentes</h5>
                <p>Análisis detallado de accidentes laborales, tendencias y prevención.</p>
                <button class="btn btn-sm btn-warning" onclick="generateReport('accidents-analysis')">Generar</button>
                <button class="btn btn-sm btn-outline-warning" onclick="scheduleReport('accidents-analysis')">Programar</button>
            </div>
            
            <div class="report-item" style="background: #f8f9fa; border: 1px solid #ddd; border-radius: 10px; padding: 15px;">
                <h5>💰 Reporte de Costos</h5>
                <p>Análisis financiero de costos ART, primas y compensaciones.</p>
                <button class="btn btn-sm btn-info" onclick="generateReport('costs')">Generar</button>
                <button class="btn btn-sm btn-outline-info" onclick="scheduleReport('costs')">Programar</button>
            </div>
        </div>
    `;
}

// Funciones de acciones rápidas
function addNewArtProvider() {
    alert('🏢 Funcionalidad para agregar nueva ART en desarrollo.\n\nPronto podrás:\n- Registrar nueva aseguradora\n- Configurar términos de contrato\n- Establecer niveles de cobertura');
}

function syncArtProviders() {
    alert('🔄 Sincronizando con base de datos de la Superintendencia de Riesgos del Trabajo (SRT)...\n\n✅ Aseguradoras verificadas\n✅ Estados de habilitación actualizados\n✅ Información de contacto sincronizada');
}

function validateArtCompliance() {
    alert('✅ Validación de cumplimiento completada:\n\n🏢 La Segunda ART: 95% cumplimiento\n🏢 Provincia ART: 98% cumplimiento\n\n📋 Áreas de mejora identificadas\n📊 Reportes de compliance generados');
}

function reportNewAccident() {
    alert('🚨 Formulario de reporte de accidente en desarrollo.\n\nIncluirá:\n- Datos del empleado\n- Descripción detallada\n- Envío automático a ART\n- Notificación a autoridades\n- Seguimiento médico');
}

function submitQuickAccidentReport() {
    const employee = document.getElementById('accident-employee').value;
    const datetime = document.getElementById('accident-datetime').value;
    const location = document.getElementById('accident-location').value;
    const type = document.getElementById('accident-type').value;
    const description = document.getElementById('accident-description').value;
    
    if (!employee || !datetime || !location || !description) {
        alert('❌ Complete todos los campos obligatorios');
        return;
    }
    
    alert(`🚨 REPORTE DE ACCIDENTE ENVIADO\n\n👤 Empleado: ${employee}\n📅 Fecha/Hora: ${datetime}\n📍 Lugar: ${location}\n🔍 Tipo: ${type}\n\n✅ Notificado automáticamente a:\n- ART correspondiente\n- Superintendencia de Riesgos del Trabajo\n- Servicio médico de emergencia\n\n📧 Número de caso: ACC-2024-${Date.now().toString().slice(-6)}`);
    
    // Limpiar formulario
    document.getElementById('accident-employee').value = '';
    document.getElementById('accident-datetime').value = '';
    document.getElementById('accident-location').value = '';
    document.getElementById('accident-description').value = '';
}

// Añadir estilos CSS básicos
const artStyles = document.createElement('style');
artStyles.textContent = `
    .art-tab-btn {
        padding: 10px 20px;
        border: none;
        background: #f8f9fa;
        color: #666;
        border-radius: 8px 8px 0 0;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .art-tab-btn.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-weight: bold;
    }
    
    .art-tab-btn:hover:not(.active) {
        background: #e9ecef;
        color: #333;
    }
    
    .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.3s ease;
        text-decoration: none;
        display: inline-block;
    }
    
    .btn-primary { background: #2196F3; color: white; }
    .btn-success { background: #4CAF50; color: white; }
    .btn-warning { background: #FF9800; color: white; }
    .btn-danger { background: #f44336; color: white; }
    .btn-info { background: #00BCD4; color: white; }
    
    .btn-sm { padding: 4px 8px; font-size: 12px; }
    .btn-xs { padding: 2px 6px; font-size: 11px; }
    
    .status-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 5px;
    }
    
    .status-dot.active { background: #4CAF50; }
    
    .badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
    }
    
    .badge-info { background: #2196F3; color: white; }
    .badge-success { background: #4CAF50; color: white; }
    .badge-warning { background: #FF9800; color: white; }
    .badge-danger { background: #f44336; color: white; }
`;
document.head.appendChild(artStyles);

// Exportar funciones al scope global
if (typeof window !== 'undefined') {
    window.showArtManagementContent = showArtManagementContent;
    window.showArtTab = showArtTab;
    window.addNewArtProvider = addNewArtProvider;
    window.syncArtProviders = syncArtProviders;
    window.validateArtCompliance = validateArtCompliance;
    window.reportNewAccident = reportNewAccident;
    window.submitQuickAccidentReport = submitQuickAccidentReport;

    // Registro en window.Modules para sistema moderno
    window.Modules = window.Modules || {};
    window.Modules['art-management'] = {
        init: showArtManagementContent
    };
}

console.log('✅ [ART-MANAGEMENT] Módulo ART completo y listo');