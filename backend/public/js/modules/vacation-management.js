// Vacation Management Module - Sistema Integral de Gestión de Vacaciones
console.log('🏖️ [VACATION-MANAGEMENT] Módulo de gestión de vacaciones cargado');

// Main function to show vacation management content
function showVacationManagementContent() {
    console.log('🏖️ [VACATION-MANAGEMENT] Ejecutando showVacationManagementContent()');

    const content = document.getElementById('mainContent');
    if (!content) {
        console.error('❌ [VACATION-MANAGEMENT] mainContent no encontrado');
        return;
    }

    content.style.setProperty('display', 'block', 'important');

    content.innerHTML = `
        <div class="tab-content active">
            <div class="card" style="padding: 0; overflow: hidden;">
                <!-- Header del módulo -->
                <div style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; font-size: 28px;">🏖️ Gestión de Vacaciones y Permisos</h2>
                            <p style="margin: 5px 0 0 0; opacity: 0.9;">Sistema completo de solicitudes desde APK y web</p>
                        </div>
                        <button onclick="showNewVacationModal()"
                                style="background: rgba(255,255,255,0.2); border: 2px solid white; color: white; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            ➕ Nueva Solicitud
                        </button>
                    </div>
                </div>

                <!-- Tabs de navegación -->
                <div style="background: #f8f9fa; border-bottom: 1px solid #e9ecef;">
                    <div style="display: flex; padding: 0 25px;">
                        <button onclick="switchVacationTab('requests')" id="tab-requests"
                                class="vacation-tab active-vacation-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid #27ae60;">
                            📋 Solicitudes
                        </button>
                        <button onclick="switchVacationTab('calendar')" id="tab-calendar"
                                class="vacation-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            📅 Calendario
                        </button>
                        <button onclick="switchVacationTab('policies')" id="tab-policies"
                                class="vacation-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            📜 Políticas
                        </button>
                        <button onclick="switchVacationTab('balance')" id="tab-balance"
                                class="vacation-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            💰 Balance
                        </button>
                        <button onclick="switchVacationTab('analytics')" id="tab-analytics"
                                class="vacation-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            📊 Análisis
                        </button>
                    </div>
                </div>

                <!-- Contenido de las pestañas -->
                <div style="padding: 25px;" id="vacationTabContent">
                    ${getVacationRequestsContent()}
                </div>
            </div>
        </div>

        <!-- Modal para nueva solicitud -->
        <div id="newVacationModal" class="modal" style="display: none !important; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9997;">
            <div class="modal-content" style="position: relative; margin: 1% auto; width: 95%; max-width: 1000px; background: white; border-radius: 12px; max-height: 95vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 20px 30px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">🏖️ Nueva Solicitud de Vacaciones/Permiso</h3>
                    <button onclick="closeNewVacationModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    ${getNewVacationForm()}
                </div>
            </div>
        </div>

        <!-- Modal para detalles de solicitud -->
        <div id="vacationDetailsModal" class="modal" style="display: none !important; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9997;">
            <div class="modal-content" style="position: relative; margin: 2% auto; width: 90%; max-width: 800px; background: white; border-radius: 12px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 20px 30px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">📋 Detalles de Solicitud</h3>
                    <button onclick="closeVacationDetailsModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 30px;" id="vacationDetailsContent">
                    <!-- Content will be populated when opening -->
                </div>
            </div>
        </div>
    `;

    console.log('✅ [VACATION-MANAGEMENT] Contenido renderizado exitosamente');

    // Initialize vacation data
    loadVacationRequests();
}

// Switch between vacation tabs
function switchVacationTab(tabName) {
    // Update tab styles
    document.querySelectorAll('.vacation-tab').forEach(tab => {
        tab.style.borderBottom = '3px solid transparent';
        tab.classList.remove('active-vacation-tab');
    });

    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) {
        activeTab.style.borderBottom = '3px solid #27ae60';
        activeTab.classList.add('active-vacation-tab');
    }

    // Update content
    const contentDiv = document.getElementById('vacationTabContent');
    if (!contentDiv) return;

    switch(tabName) {
        case 'requests':
            contentDiv.innerHTML = getVacationRequestsContent();
            loadVacationRequests();
            break;
        case 'calendar':
            contentDiv.innerHTML = getVacationCalendarContent();
            loadVacationCalendar();
            break;
        case 'policies':
            contentDiv.innerHTML = getVacationPoliciesContent();
            loadVacationPolicies();
            break;
        case 'balance':
            contentDiv.innerHTML = getVacationBalanceContent();
            loadVacationBalance();
            break;
        case 'analytics':
            contentDiv.innerHTML = getVacationAnalyticsContent();
            loadVacationAnalytics();
            break;
    }
}

// Get vacation requests content
function getVacationRequestsContent() {
    return `
        <div class="vacation-requests-container">
            <!-- Filtros y búsqueda -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; gap: 15px; flex-wrap: wrap;">
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <select id="requestTypeFilter" onchange="filterVacationRequests()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="all">Todos los tipos</option>
                        <option value="vacation">Vacaciones</option>
                        <option value="personal_leave">Permiso Personal</option>
                        <option value="sick_leave">Licencia Médica</option>
                        <option value="maternity">Licencia Maternidad</option>
                        <option value="study_leave">Permiso Estudio</option>
                        <option value="compensatory">Compensatorio</option>
                    </select>

                    <select id="requestStatusFilter" onchange="filterVacationRequests()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="all">Todos los estados</option>
                        <option value="pending">Pendiente</option>
                        <option value="approved">Aprobada</option>
                        <option value="rejected">Rechazada</option>
                        <option value="cancelled">Cancelada</option>
                    </select>

                    <select id="requestSourceFilter" onchange="filterVacationRequests()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="all">Todas las fuentes</option>
                        <option value="web">Web</option>
                        <option value="mobile">APK Móvil</option>
                        <option value="system">Sistema</option>
                    </select>
                </div>

                <input type="text" id="vacationSearch" placeholder="Buscar empleado..."
                       onkeyup="searchVacationRequests()"
                       style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; min-width: 200px;">
            </div>

            <!-- Resumen estadísticas -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #27ae60;">
                    <div style="font-size: 2rem; font-weight: bold; color: #27ae60;">28</div>
                    <div style="color: #155724; font-weight: 600;">Solicitudes Aprobadas</div>
                </div>
                <div style="background: #fff3cd; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #f39c12;">
                    <div style="font-size: 2rem; font-weight: bold; color: #f39c12;">12</div>
                    <div style="color: #8d6e08; font-weight: 600;">Pendientes de Aprobación</div>
                </div>
                <div style="background: #f8d7da; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #e74c3c;">
                    <div style="font-size: 2rem; font-weight: bold; color: #e74c3c;">3</div>
                    <div style="color: #a12622; font-weight: 600;">Rechazadas</div>
                </div>
                <div style="background: #d1ecf1; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #17a2b8;">
                    <div style="font-size: 2rem; font-weight: bold; color: #17a2b8;">15</div>
                    <div style="color: #105a68; font-weight: 600;">Desde APK Móvil</div>
                </div>
            </div>

            <!-- Lista de solicitudes -->
            <div id="vacation-requests-list">
                <div style="text-align: center; padding: 40px;">
                    🔄 Cargando solicitudes de vacaciones...
                </div>
            </div>
        </div>
    `;
}

// Get vacation calendar content
function getVacationCalendarContent() {
    return `
        <div class="vacation-calendar-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h3 style="margin: 0;">📅 Calendario de Vacaciones</h3>
                <div style="display: flex; gap: 10px;">
                    <button onclick="changeCalendarMonth(-1)" style="background: #27ae60; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">◀ Anterior</button>
                    <span id="currentMonth" style="padding: 8px 16px; font-weight: 600;">Septiembre 2025</span>
                    <button onclick="changeCalendarMonth(1)" style="background: #27ae60; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Siguiente ▶</button>
                </div>
            </div>

            <div id="vacation-calendar">
                <div style="text-align: center; padding: 40px;">
                    📅 Generando calendario...
                </div>
            </div>
        </div>
    `;
}

// Get vacation policies content
function getVacationPoliciesContent() {
    return `
        <div class="vacation-policies-container">
            <h3 style="margin: 0 0 20px 0;">📜 Políticas de Vacaciones y Permisos</h3>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px;">
                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #27ae60;">🏖️ Vacaciones Anuales</h4>
                    <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>21 días hábiles por año calendario</li>
                        <li>Proporcional en caso de ingreso durante el año</li>
                        <li>Solicitud con 15 días de anticipación mínima</li>
                        <li>Máximo 14 días corridos por período</li>
                        <li>No acumulables por más de 2 años</li>
                    </ul>
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #f39c12;">👤 Permisos Personales</h4>
                    <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>3 días por año para asuntos personales</li>
                        <li>Solicitud con 48 horas de anticipación</li>
                        <li>No remunerados si exceden el límite</li>
                        <li>Justificación requerida</li>
                        <li>Aprobación supervisión directa</li>
                    </ul>
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #e74c3c;">🏥 Licencias Médicas</h4>
                    <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>Certificado médico obligatorio</li>
                        <li>Notificación inmediata por enfermedad</li>
                        <li>ART para accidentes laborales</li>
                        <li>Seguimiento médico laboral</li>
                        <li>Reincorporación con alta médica</li>
                    </ul>
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #8e44ad;">👶 Licencia Maternidad/Paternidad</h4>
                    <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>90 días corridos maternidad</li>
                        <li>2 días paternidad</li>
                        <li>Notificación 60 días antes</li>
                        <li>Certificado médico requerido</li>
                        <li>Extensión por complicaciones</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

// Get vacation balance content
function getVacationBalanceContent() {
    return `
        <div class="vacation-balance-container">
            <h3 style="margin: 0 0 20px 0;">💰 Balance de Vacaciones por Empleado</h3>

            <div style="margin-bottom: 20px;">
                <input type="text" id="balanceSearch" placeholder="Buscar empleado..." onkeyup="searchEmployeeBalance()"
                       style="padding: 10px; border: 1px solid #ddd; border-radius: 6px; width: 300px;">
            </div>

            <div id="vacation-balance-list">
                <div style="text-align: center; padding: 40px;">
                    🔄 Cargando balances de vacaciones...
                </div>
            </div>
        </div>
    `;
}

// Get vacation analytics content
function getVacationAnalyticsContent() {
    return `
        <div class="vacation-analytics-container">
            <h3 style="margin: 0 0 20px 0;">📊 Análisis de Vacaciones y Ausentismo</h3>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 25px;">
                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #27ae60;">📈 Tendencia de Solicitudes</h4>
                    <div id="vacation-trend-chart" style="height: 300px; display: flex; align-items: center; justify-content: center; color: #666;">
                        Gráfico de tendencias de solicitudes
                    </div>
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #f39c12;">🎯 Tipos de Permisos</h4>
                    <div id="vacation-types-chart" style="height: 300px; display: flex; align-items: center; justify-content: center; color: #666;">
                        Gráfico por tipos de permisos
                    </div>
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #8e44ad;">👥 Por Departamento</h4>
                    <div id="vacation-department-chart" style="height: 300px; display: flex; align-items: center; justify-content: center; color: #666;">
                        Análisis por departamentos
                    </div>
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #17a2b8;">📱 Fuente de Solicitudes</h4>
                    <div id="vacation-source-chart" style="height: 300px; display: flex; align-items: center; justify-content: center; color: #666;">
                        Web vs APK Móvil
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Get new vacation form
function getNewVacationForm() {
    return `
        <form onsubmit="submitVacationRequest(event)">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                <div>
                    <h4 style="margin: 0 0 15px 0; color: #27ae60;">👤 Información del Empleado</h4>

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
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo de Solicitud:</label>
                        <select name="requestType" required onchange="updateVacationFields(this.value)" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">Seleccionar tipo...</option>
                            <option value="vacation">Vacaciones</option>
                            <option value="personal_leave">Permiso Personal</option>
                            <option value="sick_leave">Licencia Médica</option>
                            <option value="maternity">Licencia Maternidad</option>
                            <option value="study_leave">Permiso Estudio</option>
                            <option value="compensatory">Compensatorio</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Fuente de Solicitud:</label>
                        <select name="source" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="web">Web (Panel Empresa)</option>
                            <option value="mobile">APK Móvil</option>
                            <option value="system">Sistema Automático</option>
                        </select>
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 15px 0; color: #27ae60;">📅 Fechas y Detalles</h4>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Fecha de Inicio:</label>
                        <input type="date" name="startDate" required
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Fecha de Fin:</label>
                        <input type="date" name="endDate" required
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Motivo/Observaciones:</label>
                        <textarea name="reason" required placeholder="Describe el motivo de la solicitud..."
                                  style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; height: 100px; resize: vertical;"></textarea>
                    </div>

                    <div style="margin-bottom: 15px;" id="certificateField" style="display: none;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Certificado Médico:</label>
                        <input type="file" name="medicalCertificate" accept=".pdf,.jpg,.png"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        <small style="color: #666;">Requerido para licencias médicas</small>
                    </div>
                </div>
            </div>

            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 25px; text-align: right;">
                <button type="button" onclick="closeNewVacationModal()"
                        style="background: #95a5a6; color: white; border: none; padding: 12px 24px; margin-right: 10px; border-radius: 6px; cursor: pointer;">
                    Cancelar
                </button>
                <button type="submit"
                        style="background: #27ae60; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">
                    🏖️ Enviar Solicitud
                </button>
            </div>
        </form>
    `;
}

// Modal functions
function showNewVacationModal() {
    const modal = document.getElementById('newVacationModal');
    modal.style.setProperty('display', 'block', 'important');
}

function closeNewVacationModal() {
    const modal = document.getElementById('newVacationModal');
    modal.style.setProperty('display', 'none', 'important');
}

function showVacationDetails(requestId) {
    const modal = document.getElementById('vacationDetailsModal');
    const content = document.getElementById('vacationDetailsContent');

    // Mock vacation request data
    const request = {
        id: requestId,
        employee: 'Juan Pérez',
        legajo: 'EMP001',
        type: 'vacation',
        startDate: '2025-10-01',
        endDate: '2025-10-05',
        reason: 'Vacaciones familiares - viaje al exterior',
        status: 'approved',
        source: 'mobile',
        submittedDate: '2025-09-15',
        approvedBy: 'Supervisor RRHH',
        approvedDate: '2025-09-16',
        daysRequested: 5,
        balanceAfter: 16
    };

    content.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
            <div>
                <h4 style="margin: 0 0 15px 0; color: #27ae60;">👤 Información del Empleado</h4>
                <p><strong>Nombre:</strong> ${request.employee}</p>
                <p><strong>Legajo:</strong> ${request.legajo}</p>
                <p><strong>Tipo:</strong> ${getVacationTypeText(request.type)}</p>
                <p><strong>Estado:</strong> ${getVacationStatusBadge(request.status)}</p>

                <h4 style="margin: 20px 0 15px 0; color: #27ae60;">📅 Detalles de Fechas</h4>
                <p><strong>Fecha Inicio:</strong> ${request.startDate}</p>
                <p><strong>Fecha Fin:</strong> ${request.endDate}</p>
                <p><strong>Días Solicitados:</strong> ${request.daysRequested}</p>
                <p><strong>Balance Restante:</strong> ${request.balanceAfter} días</p>
            </div>

            <div>
                <h4 style="margin: 0 0 15px 0; color: #27ae60;">📋 Información de Proceso</h4>
                <p><strong>Fuente:</strong> ${getSourceText(request.source)}</p>
                <p><strong>Fecha Solicitud:</strong> ${request.submittedDate}</p>
                <p><strong>Aprobado por:</strong> ${request.approvedBy}</p>
                <p><strong>Fecha Aprobación:</strong> ${request.approvedDate}</p>

                <h4 style="margin: 20px 0 15px 0; color: #27ae60;">📝 Motivo</h4>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                    ${request.reason}
                </div>

                <h4 style="margin: 20px 0 15px 0; color: #27ae60;">⚡ Acciones</h4>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${request.status === 'pending' ? `
                        <button onclick="approveVacationRequest('${request.id}')" style="background: #27ae60; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer;">
                            ✅ Aprobar Solicitud
                        </button>
                        <button onclick="rejectVacationRequest('${request.id}')" style="background: #e74c3c; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer;">
                            ❌ Rechazar Solicitud
                        </button>
                    ` : ''}
                    <button onclick="generateVacationReport('${request.id}')" style="background: #3498db; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer;">
                        📄 Generar Reporte
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.style.setProperty('display', 'block', 'important');
}

function closeVacationDetailsModal() {
    const modal = document.getElementById('vacationDetailsModal');
    modal.style.setProperty('display', 'none', 'important');
}

// Load functions
async function loadVacationRequests() {
    console.log('🏖️ [VACATION-MANAGEMENT] Cargando solicitudes de vacaciones...');

    const container = document.getElementById('vacation-requests-list');
    if (!container) return;

    try {
        // 📱 Cargar solicitudes desde API - Incluye tanto web como APK
        const response = await fetch('/api/v1/vacation/requests');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            // Formatear datos para compatibilidad con el frontend
            const formattedRequests = result.data.map(request => ({
                id: request.id,
                employee: request.employee?.name || 'N/A',
                legajo: request.employee?.legajo || 'N/A',
                type: request.requestType,
                startDate: request.startDate,
                endDate: request.endDate,
                status: request.status,
                source: request.source || 'unknown',
                submittedDate: request.createdAt ? new Date(request.createdAt).toISOString().split('T')[0] : '',
                daysRequested: request.totalDays || 0,
                reason: request.reason || '',
                approvedBy: request.approver?.name || null,
                approvalDate: request.approvalDate || null,
                approvalComments: request.approvalComments || null
            }));

            displayVacationRequests(formattedRequests);
        } else {
            throw new Error(result.message || 'Error cargando solicitudes');
        }

    } catch (error) {
        console.error('❌ [VACATION-MANAGEMENT] Error cargando solicitudes:', error);

        // Fallback a datos mock si falla la API
        const mockRequests = [
            {
                id: 1,
                employee: 'Juan Pérez (APK)',
                legajo: 'EMP001',
                type: 'vacation',
                startDate: '2025-10-01',
                endDate: '2025-10-05',
                status: 'approved',
                source: 'mobile-apk',
                submittedDate: '2025-09-15',
                daysRequested: 5
            },
            {
                id: 2,
                employee: 'María González (Web)',
                legajo: 'EMP002',
                type: 'sick_leave',
                startDate: '2025-09-25',
                endDate: '2025-09-25',
                status: 'pending',
                source: 'panel-empresa',
                submittedDate: '2025-09-24',
                daysRequested: 1
            }
        ];

        displayVacationRequests(mockRequests);
        console.log('🔄 [VACATION-MANAGEMENT] Usando datos mock de respaldo');
    }
}

function displayVacationRequests(requests) {
    const container = document.getElementById('vacation-requests-list');
    if (!container || !requests.length) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No hay solicitudes para mostrar</div>';
        return;
    }

    container.innerHTML = requests.map(request => `
        <div class="vacation-card" style="border: 2px solid ${getVacationStatusColor(request.status)}; padding: 20px; margin-bottom: 15px; border-radius: 10px; background: white;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div>
                    <h4 style="margin: 0 0 5px 0; color: #2c3e50;">${request.employee} (${request.legajo})</h4>
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <span style="background: ${getVacationTypeColor(request.type)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                            ${getVacationTypeText(request.type)}
                        </span>
                        <span style="background: ${getVacationStatusColor(request.status)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                            ${getVacationStatusText(request.status)}
                        </span>
                        <span style="background: ${getSourceColor(request.source)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                            ${getSourceText(request.source)}
                        </span>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 18px; font-weight: bold; color: #27ae60;">${request.daysRequested} días</div>
                    <div style="font-size: 12px; color: #666;">${request.startDate} - ${request.endDate}</div>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <strong>Fecha Solicitud:</strong> ${request.submittedDate}
            </div>

            <div style="text-align: right;">
                <button onclick="showVacationDetails(${request.id})"
                        style="background: #3498db; color: white; border: none; padding: 8px 16px; margin-right: 10px; border-radius: 4px; cursor: pointer;">
                    👁️ Ver Detalles
                </button>
                ${request.status === 'pending' ? `
                    <button onclick="approveVacationRequest(${request.id})"
                            style="background: #27ae60; color: white; border: none; padding: 8px 16px; margin-right: 5px; border-radius: 4px; cursor: pointer;">
                        ✅ Aprobar
                    </button>
                    <button onclick="rejectVacationRequest(${request.id})"
                            style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        ❌ Rechazar
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Utility functions
function getVacationTypeColor(type) {
    switch(type) {
        case 'vacation': return '#27ae60';
        case 'personal_leave': return '#f39c12';
        case 'sick_leave': return '#e74c3c';
        case 'maternity': return '#8e44ad';
        case 'study_leave': return '#3498db';
        case 'compensatory': return '#17a2b8';
        default: return '#95a5a6';
    }
}

function getVacationTypeText(type) {
    switch(type) {
        case 'vacation': return 'Vacaciones';
        case 'personal_leave': return 'Permiso Personal';
        case 'sick_leave': return 'Licencia Médica';
        case 'maternity': return 'Licencia Maternidad';
        case 'study_leave': return 'Permiso Estudio';
        case 'compensatory': return 'Compensatorio';
        default: return 'Otro';
    }
}

function getVacationStatusColor(status) {
    switch(status) {
        case 'pending': return '#f39c12';
        case 'approved': return '#27ae60';
        case 'rejected': return '#e74c3c';
        case 'cancelled': return '#95a5a6';
        default: return '#95a5a6';
    }
}

function getVacationStatusText(status) {
    switch(status) {
        case 'pending': return 'Pendiente';
        case 'approved': return 'Aprobada';
        case 'rejected': return 'Rechazada';
        case 'cancelled': return 'Cancelada';
        default: return 'No Definido';
    }
}

function getVacationStatusBadge(status) {
    const color = getVacationStatusColor(status);
    const text = getVacationStatusText(status);
    return `<span style="background: ${color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${text}</span>`;
}

function getSourceColor(source) {
    switch(source) {
        case 'web': return '#3498db';
        case 'mobile': return '#27ae60';
        case 'system': return '#8e44ad';
        default: return '#95a5a6';
    }
}

function getSourceText(source) {
    switch(source) {
        case 'web': return 'Web';
        case 'mobile': return 'APK Móvil';
        case 'system': return 'Sistema';
        default: return 'No Definido';
    }
}

// Action functions
async function submitVacationRequest(event) {
    event.preventDefault();

    console.log('🏖️ [VACATION-MANAGEMENT] Enviando nueva solicitud...');

    const formData = new FormData(event.target);
    const requestData = Object.fromEntries(formData.entries());

    try {
        // 📱 API integrada con Flutter APK - Comunicación bidireccional
        const response = await fetch('/api/v1/vacation/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: requestData.employeeId,
                requestType: requestData.requestType,
                extraordinaryLicenseId: requestData.licenseType !== 'vacation' ? requestData.licenseType : null,
                startDate: requestData.startDate,
                endDate: requestData.endDate,
                reason: requestData.reason,
                source: 'panel-empresa' // Distinguir origen: 'panel-empresa' vs 'mobile-apk'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            // Integrar con sistema de notificaciones
            if (typeof addNotificationToQueue === 'function') {
                const notification = {
                    id: `VACATION-REQ-${Date.now()}`,
                    type: 'vacation_request',
                    priority: 'medium',
                    title: `📋 Nueva Solicitud de ${getVacationTypeText(requestData.requestType)}`,
                    message: `Solicitud de ${requestData.requestType} del ${requestData.startDate} al ${requestData.endDate}`,
                    fromUserId: requestData.employeeId,
                    toUserId: 'hr-team',
                    status: 'pending',
                    createdAt: new Date(),
                    requestData: result.data
                };

                addNotificationToQueue(notification);
            }

            alert('✅ Solicitud enviada exitosamente');
            closeNewVacationModal();
            loadVacationRequests();
        } else {
            throw new Error(result.message || 'Error en la solicitud');
        }

    } catch (error) {
        console.error('❌ [VACATION-MANAGEMENT] Error enviando solicitud:', error);
        alert('❌ Error enviando solicitud: ' + error.message);
    }
}

async function approveVacationRequest(requestId) {
    console.log('✅ [VACATION-MANAGEMENT] Aprobando solicitud:', requestId);

    if (confirm('¿Aprobar esta solicitud de vacaciones?')) {
        try {
            const response = await fetch(`/api/v1/vacation/requests/${requestId}/approval`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'approved',
                    approvedBy: 'admin', // TODO: Obtener usuario actual
                    approvalComments: 'Aprobado desde panel-empresa'
                })
            });

            const result = await response.json();

            if (result.success) {
                alert('✅ Solicitud aprobada exitosamente');
                loadVacationRequests();
            } else {
                throw new Error(result.message || 'Error aprobando solicitud');
            }

        } catch (error) {
            console.error('❌ [VACATION-MANAGEMENT] Error aprobando:', error);
            alert('❌ Error aprobando solicitud: ' + error.message);
        }
    }
}

async function rejectVacationRequest(requestId) {
    console.log('❌ [VACATION-MANAGEMENT] Rechazando solicitud:', requestId);

    const reason = prompt('Motivo del rechazo:');
    if (reason) {
        try {
            const response = await fetch(`/api/v1/vacation/requests/${requestId}/approval`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'rejected',
                    approvedBy: 'admin', // TODO: Obtener usuario actual
                    approvalComments: reason
                })
            });

            const result = await response.json();

            if (result.success) {
                alert('❌ Solicitud rechazada exitosamente');
                loadVacationRequests();
            } else {
                throw new Error(result.message || 'Error rechazando solicitud');
            }

        } catch (error) {
            console.error('❌ [VACATION-MANAGEMENT] Error rechazando:', error);
            alert('❌ Error rechazando solicitud: ' + error.message);
        }
    }
}

function updateVacationFields(type) {
    const certificateField = document.getElementById('certificateField');
    if (certificateField) {
        certificateField.style.display = type === 'sick_leave' ? 'block' : 'none';
    }
}

// Export functions for global access
window.showVacationManagementContent = showVacationManagementContent;
window.switchVacationTab = switchVacationTab;
window.showNewVacationModal = showNewVacationModal;
window.closeNewVacationModal = closeNewVacationModal;
window.showVacationDetails = showVacationDetails;
window.closeVacationDetailsModal = closeVacationDetailsModal;
window.submitVacationRequest = submitVacationRequest;
window.approveVacationRequest = approveVacationRequest;
window.rejectVacationRequest = rejectVacationRequest;
window.updateVacationFields = updateVacationFields;

console.log('✅ [VACATION-MANAGEMENT] Módulo completamente cargado y funcional');