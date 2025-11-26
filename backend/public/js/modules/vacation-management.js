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
                        <button onclick="switchVacationTab('compatibility')" id="tab-compatibility"
                                class="vacation-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            🔄 Matriz Compatibilidad
                        </button>
                        <button onclick="switchVacationTab('scheduler')" id="tab-scheduler"
                                class="vacation-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            🤖 Programación Auto
                        </button>
                        <button onclick="switchVacationTab('config')" id="tab-config"
                                class="vacation-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            ⚙️ Configuración
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

    // FORCE HIDE ALL MODALS (fix for Render cache issue)
    setTimeout(() => {
        const modals = document.querySelectorAll('#newVacationModal, #vacationDetailsModal, #editVacationModal');
        modals.forEach(modal => {
            if (modal) {
                modal.style.setProperty('display', 'none', 'important');
                console.log('🔒 [FORCE-HIDE] Modal ocultado:', modal.id);
            }
        });
    }, 100);

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
        case 'compatibility':
            contentDiv.innerHTML = getCompatibilityMatrixContent();
            loadCompatibilityMatrix();
            break;
        case 'scheduler':
            contentDiv.innerHTML = getAutoSchedulerContent();
            break;
        case 'config':
            contentDiv.innerHTML = getVacationConfigContent();
            loadVacationConfig();
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

            <!-- Escalas de Vacaciones por Antigüedad -->
            <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h4 style="margin: 0; color: #27ae60;">📊 Escalas de Vacaciones por Antigüedad</h4>
                    <button onclick="addVacationScale()" style="background: #27ae60; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        ➕ Agregar Escala
                    </button>
                </div>
                <div id="vacation-scales-list">
                    <div style="text-align: center; padding: 20px; color: #666;">
                        🔄 Cargando escalas...
                    </div>
                </div>
            </div>

            <!-- Licencias Extraordinarias -->
            <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h4 style="margin: 0; color: #f39c12;">📋 Licencias Extraordinarias</h4>
                    <button onclick="addExtraordinaryLicense()" style="background: #f39c12; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        ➕ Agregar Licencia
                    </button>
                </div>
                <div id="extraordinary-licenses-list">
                    <div style="text-align: center; padding: 20px; color: #666;">
                        🔄 Cargando licencias...
                    </div>
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
window.loadCompatibilityMatrix = loadCompatibilityMatrix;
window.generateAutoSchedule = generateAutoSchedule;
window.addCompatibilityRule = addCompatibilityRule;

console.log('✅ [VACATION-MANAGEMENT] Módulo completamente cargado y funcional');
// ==================== FUNCIONALIDADES REALES CON BACKEND ====================

// Stub functions placeholder
function loadVacationCalendar() {
    console.log('📅 Cargando calendario');
}

function loadVacationPolicies() {
    console.log('📜 Cargando políticas');
}

function loadVacationBalance() {
    console.log('💰 Cargando balance');
    loadRealEmployeeBalance();
}

function loadVacationAnalytics() {
    console.log('📊 Cargando analytics');
}

function filterVacationRequests() {
    loadVacationRequests();
}

function searchVacationRequests() {
    loadVacationRequests();
}

function searchEmployeeBalance() {
    loadRealEmployeeBalance();
}

function generateVacationReport(id) {
    alert(`Generar reporte ${id} (próximamente)`);
}

function changeCalendarMonth(dir) {
    console.log('Cambiar mes:', dir);
}

// ==================== MATRIZ DE COMPATIBILIDAD ====================
function getCompatibilityMatrixContent() {
    return `
        <div class="compatibility-matrix-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <div>
                    <h3 style="margin: 0;">🔄 Matriz de Compatibilidad de Tareas</h3>
                    <p style="margin: 5px 0 0 0; color: #666;">Sistema de cobertura entre empleados basado en habilidades y roles</p>
                </div>
                <button onclick="addCompatibilityRule()" style="background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    ➕ Agregar Regla
                </button>
            </div>

            <div id="compatibility-matrix-list">
                <div style="text-align: center; padding: 40px;">
                    🔄 Cargando matriz de compatibilidad...
                </div>
            </div>
        </div>
    `;
}

async function loadCompatibilityMatrix() {
    const container = document.getElementById('compatibility-matrix-list');
    if (!container) return;

    try {
        const authToken = localStorage.getItem('token') || sessionStorage.getItem('authToken');
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        const companyId = userStr ? JSON.parse(userStr).company_id || 1 : 1;

        const response = await fetch(`/api/v1/vacation/compatibility-matrix?company_id=${companyId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Error cargando matriz');

        const result = await response.json();
        const matrix = result.data || [];

        if (matrix.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 10px;">
                    <h4>No hay reglas de compatibilidad configuradas</h4>
                    <p style="color: #666;">Agrega reglas para definir qué empleados pueden cubrir a otros durante vacaciones</p>
                    <p style="color: #999; margin-top: 10px;">Usa el botón "➕ Agregar Regla" en la parte superior</p>
                </div>
            `;
            return;
        }

        // Agrupar por usuario primario
        const grouped = {};
        matrix.forEach(item => {
            const primaryId = item.primaryUserId;
            if (!grouped[primaryId]) {
                grouped[primaryId] = {
                    user: item.primaryUser,
                    covers: []
                };
            }
            grouped[primaryId].covers.push({
                id: item.id,
                coverUser: item.coverUser,
                score: item.compatibilityScore,
                tasks: item.coverableTasks || [],
                maxHours: item.maxCoverageHours
            });
        });

        container.innerHTML = Object.values(grouped).map(group => `
            <div style="background: white; padding: 20px; margin-bottom: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 4px solid #27ae60;">
                <h4 style="margin: 0 0 15px 0; color: #2c3e50;">
                    👤 ${group.user.firstName} ${group.user.lastName} <span style="color: #666; font-size: 14px;">(${group.user.email})</span>
                </h4>

                <div style="margin-top: 10px;">
                    <strong>Puede ser cubierto por:</strong>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-top: 10px;">
                        ${group.covers.map(cover => `
                            <div style="background: ${getScoreColor(cover.score)}20; padding: 15px; border-radius: 8px; border-left: 3px solid ${getScoreColor(cover.score)}; position: relative;">
                                <button onclick="deleteCompatibilityRule(${cover.id})"
                                        style="position: absolute; top: 8px; right: 8px; background: #e74c3c; color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; line-height: 1; padding: 0;"
                                        title="Eliminar regla">
                                    ×
                                </button>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-right: 30px;">
                                    <strong>${cover.coverUser.firstName} ${cover.coverUser.lastName}</strong>
                                    <span style="background: ${getScoreColor(cover.score)}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 700;">
                                        ${cover.score}%
                                    </span>
                                </div>
                                <div style="font-size: 12px; color: #666;">
                                    ${cover.coverUser.email}
                                </div>
                                ${cover.maxHours ? `<div style="font-size: 11px; color: #888; margin-top: 5px;">Máx: ${cover.maxHours}h/día</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('❌ Error:', error);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #e74c3c;">Error cargando matriz. Verifica tu conexión.</div>';
    }
}

function getScoreColor(score) {
    if (score >= 80) return '#27ae60';
    if (score >= 60) return '#f39c12';
    if (score >= 40) return '#e67e22';
    return '#e74c3c';
}

async function addCompatibilityRule() {
    const authToken = localStorage.getItem('token') || sessionStorage.getItem('authToken');
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    const companyId = userStr ? JSON.parse(userStr).company_id || 1 : 1;

    // Obtener lista de empleados
    const response = await fetch(`/api/v1/users?company_id=${companyId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const usersResult = await response.json();
    const users = usersResult.users || usersResult.data || [];

    const modalHTML = `
        <div id="compatibilityRuleModal" class="modal" style="display: flex !important; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9998; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: white; border-radius: 12px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 20px 30px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">➕ Nueva Regla de Compatibilidad</h3>
                    <button onclick="closeCompatibilityRuleModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    <form id="compatibilityRuleForm">
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600;">Empleado Principal (que se ausenta):</label>
                            <select id="primaryUserId" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                                <option value="">Seleccionar empleado...</option>
                                ${users.map(u => `<option value="${u.id}">${u.firstName} ${u.lastName} (${u.email})</option>`).join('')}
                            </select>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600;">Empleado que Cubre:</label>
                            <select id="coverUserId" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                                <option value="">Seleccionar empleado...</option>
                                ${users.map(u => `<option value="${u.id}">${u.firstName} ${u.lastName} (${u.email})</option>`).join('')}
                            </select>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600;">Puntuación de Compatibilidad (0-100%):</label>
                            <input type="number" id="compatibilityScore" min="0" max="100" value="0" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <small style="color: #666;">Mayor puntuación = Mayor compatibilidad</small>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600;">Máximo de Horas de Cobertura por Día:</label>
                            <input type="number" id="maxCoverageHours" min="1" max="24" placeholder="Opcional" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600;">Máximo de Tareas Simultáneas:</label>
                            <input type="number" id="maxConcurrentTasks" min="1" value="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600;">Notas:</label>
                            <textarea id="manualNotes" rows="3" placeholder="Notas adicionales sobre esta compatibilidad..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit;"></textarea>
                        </div>

                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" onclick="closeCompatibilityRuleModal()" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">
                                Cancelar
                            </button>
                            <button type="submit" style="padding: 10px 20px; border: none; background: #27ae60; color: white; border-radius: 6px; cursor: pointer; font-weight: 600;">
                                ✓ Crear Regla
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('compatibilityRuleForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            company_id: companyId,
            primaryUserId: document.getElementById('primaryUserId').value,
            coverUserId: document.getElementById('coverUserId').value,
            compatibilityScore: parseFloat(document.getElementById('compatibilityScore').value),
            maxCoverageHours: document.getElementById('maxCoverageHours').value ? parseInt(document.getElementById('maxCoverageHours').value) : null,
            maxConcurrentTasks: parseInt(document.getElementById('maxConcurrentTasks').value),
            manualNotes: document.getElementById('manualNotes').value || null
        };

        try {
            const response = await fetch('/api/v1/vacation/compatibility-matrix', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert('✓ Regla de compatibilidad creada exitosamente');
                closeCompatibilityRuleModal();
                loadCompatibilityMatrix();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error creando regla:', error);
            alert('Error creando regla de compatibilidad');
        }
    });
}

function closeCompatibilityRuleModal() {
    const modal = document.getElementById('compatibilityRuleModal');
    if (modal) modal.remove();
}

async function deleteCompatibilityRule(ruleId) {
    if (!confirm('¿Está seguro de eliminar esta regla de compatibilidad?')) return;

    const authToken = localStorage.getItem('token') || sessionStorage.getItem('authToken');
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    const companyId = userStr ? JSON.parse(userStr).company_id || 1 : 1;

    try {
        const response = await fetch(`/api/v1/vacation/compatibility-matrix/${ruleId}?company_id=${companyId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const result = await response.json();

        if (result.success) {
            alert('✓ Regla eliminada exitosamente');
            loadCompatibilityMatrix();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error eliminando regla:', error);
        alert('Error eliminando regla de compatibilidad');
    }
}

// ==================== POLÍTICAS DE VACACIONES ====================

async function loadVacationPolicies() {
    const authToken = localStorage.getItem('token') || sessionStorage.getItem('authToken');
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    const companyId = userStr ? JSON.parse(userStr).company_id || 1 : 1;

    try {
        const response = await fetch(`/api/v1/vacation/config?company_id=${companyId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const result = await response.json();

        if (result.success) {
            displayVacationScales(result.data.vacationScales || []);
            displayExtraordinaryLicenses(result.data.extraordinaryLicenses || []);
        }
    } catch (error) {
        console.error('Error cargando políticas:', error);
    }
}

function displayVacationScales(scales) {
    const container = document.getElementById('vacation-scales-list');
    if (!container) return;

    if (scales.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                No hay escalas de vacaciones configuradas. Haga clic en "Agregar Escala" para crear una.
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                    <th style="padding: 12px; text-align: left;">Rango de Antigüedad</th>
                    <th style="padding: 12px; text-align: center;">Días de Vacaciones</th>
                    <th style="padding: 12px; text-align: center;">Prioridad</th>
                    <th style="padding: 12px; text-align: center;">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${scales.map(scale => `
                    <tr style="border-bottom: 1px solid #dee2e6;">
                        <td style="padding: 12px;">${scale.rangeDescription || `${scale.yearsFrom} - ${scale.yearsTo || '∞'} años`}</td>
                        <td style="padding: 12px; text-align: center; font-weight: 600; color: #27ae60;">${scale.vacationDays} días</td>
                        <td style="padding: 12px; text-align: center;">${scale.priority}</td>
                        <td style="padding: 12px; text-align: center;">
                            <button onclick="deleteVacationScale(${scale.id})" style="background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                                🗑️ Eliminar
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function displayExtraordinaryLicenses(licenses) {
    const container = document.getElementById('extraordinary-licenses-list');
    if (!container) return;

    if (licenses.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                No hay licencias extraordinarias configuradas. Haga clic en "Agregar Licencia" para crear una.
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                    <th style="padding: 12px; text-align: left;">Tipo</th>
                    <th style="padding: 12px; text-align: left;">Descripción</th>
                    <th style="padding: 12px; text-align: center;">Días</th>
                    <th style="padding: 12px; text-align: center;">Tipo de Día</th>
                    <th style="padding: 12px; text-align: center;">Requiere Aprobación</th>
                    <th style="padding: 12px; text-align: center;">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${licenses.map(license => `
                    <tr style="border-bottom: 1px solid #dee2e6;">
                        <td style="padding: 12px; font-weight: 600;">${license.type}</td>
                        <td style="padding: 12px;">${license.description || '-'}</td>
                        <td style="padding: 12px; text-align: center; font-weight: 600; color: #f39c12;">${license.days} días</td>
                        <td style="padding: 12px; text-align: center;">${license.dayType === 'habil' ? 'Hábiles' : 'Corridos'}</td>
                        <td style="padding: 12px; text-align: center;">${license.requiresApproval ? '✓ Sí' : '✗ No'}</td>
                        <td style="padding: 12px; text-align: center;">
                            <button onclick="deleteExtraordinaryLicense(${license.id})" style="background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                                🗑️ Eliminar
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function addVacationScale() {
    const authToken = localStorage.getItem('token') || sessionStorage.getItem('authToken');

    const modalHTML = `
        <div id="vacationScaleModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: white; padding: 30px; border-radius: 12px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
                <h3 style="margin: 0 0 20px 0; color: #27ae60;">📊 Agregar Escala de Vacaciones</h3>

                <form id="vacationScaleForm">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Años desde:</label>
                        <input type="number" id="yearsFrom" step="0.01" required
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                               placeholder="Ej: 0 (para inicio), 5, 10...">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Años hasta (dejar vacío para sin límite):</label>
                        <input type="number" id="yearsTo" step="0.01"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                               placeholder="Ej: 5, 10, 20... (vacío = sin límite)">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Descripción del rango:</label>
                        <input type="text" id="rangeDescription" required
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                               placeholder="Ej: '0 - 5 años', '5 - 10 años', 'Más de 20 años'">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Días de vacaciones:</label>
                        <input type="number" id="vacationDays" required min="1"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                               placeholder="Ej: 14, 21, 28...">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Prioridad (menor = mayor prioridad):</label>
                        <input type="number" id="priority" value="0"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" onclick="closeVacationScaleModal()"
                                style="background: #95a5a6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                            Cancelar
                        </button>
                        <button type="submit"
                                style="background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                            💾 Guardar Escala
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('vacationScaleForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        const companyId = userStr ? JSON.parse(userStr).company_id || 1 : 1;

        const data = {
            company_id: companyId,
            yearsFrom: parseFloat(document.getElementById('yearsFrom').value),
            yearsTo: document.getElementById('yearsTo').value ? parseFloat(document.getElementById('yearsTo').value) : null,
            rangeDescription: document.getElementById('rangeDescription').value,
            vacationDays: parseInt(document.getElementById('vacationDays').value),
            priority: parseInt(document.getElementById('priority').value)
        };

        try {
            const response = await fetch('/api/v1/vacation/scales', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert('✓ Escala de vacaciones creada exitosamente');
                closeVacationScaleModal();
                loadVacationPolicies();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error creando escala:', error);
            alert('Error creando escala de vacaciones');
        }
    });
}

function closeVacationScaleModal() {
    const modal = document.getElementById('vacationScaleModal');
    if (modal) modal.remove();
}

async function deleteVacationScale(scaleId) {
    if (!confirm('¿Está seguro de eliminar esta escala de vacaciones?')) return;

    const authToken = localStorage.getItem('token') || sessionStorage.getItem('authToken');

    try {
        const response = await fetch(`/api/v1/vacation/scales/${scaleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ isActive: false })
        });

        const result = await response.json();

        if (result.success) {
            alert('✓ Escala eliminada exitosamente');
            loadVacationPolicies();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error eliminando escala:', error);
        alert('Error eliminando escala de vacaciones');
    }
}

async function addExtraordinaryLicense() {
    const authToken = localStorage.getItem('token') || sessionStorage.getItem('authToken');

    const modalHTML = `
        <div id="extraordinaryLicenseModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: white; padding: 30px; border-radius: 12px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
                <h3 style="margin: 0 0 20px 0; color: #f39c12;">📋 Agregar Licencia Extraordinaria</h3>

                <form id="extraordinaryLicenseForm">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo de Licencia:</label>
                        <input type="text" id="licenseType" required
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                               placeholder="Ej: Matrimonio, Paternidad, Mudanza...">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Descripción:</label>
                        <textarea id="licenseDescription" rows="3"
                                  style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                                  placeholder="Descripción detallada de la licencia..."></textarea>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Días otorgados:</label>
                        <input type="number" id="licenseDays" required min="1"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                               placeholder="Ej: 1, 3, 10...">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo de días:</label>
                        <select id="licenseDayType" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="habil">Días Hábiles</option>
                            <option value="corrido">Días Corridos</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="requiresApproval" checked>
                            <span style="font-weight: 600;">Requiere aprobación previa</span>
                        </label>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="requiresDocumentation">
                            <span style="font-weight: 600;">Requiere documentación de respaldo</span>
                        </label>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Máximo por año (dejar vacío para sin límite):</label>
                        <input type="number" id="maxPerYear" min="1"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                               placeholder="Ej: 1, 2, 3... (vacío = sin límite)">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Días de antelación requeridos:</label>
                        <input type="number" id="advanceNoticeDays" value="0" min="0"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Base legal (opcional):</label>
                        <textarea id="legalBasis" rows="2"
                                  style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                                  placeholder="Ej: Art. 158 LCT, CCT 130/75..."></textarea>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" onclick="closeExtraordinaryLicenseModal()"
                                style="background: #95a5a6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                            Cancelar
                        </button>
                        <button type="submit"
                                style="background: #f39c12; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                            💾 Guardar Licencia
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('extraordinaryLicenseForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        const companyId = userStr ? JSON.parse(userStr).company_id || 1 : 1;

        const data = {
            company_id: companyId,
            type: document.getElementById('licenseType').value,
            description: document.getElementById('licenseDescription').value,
            days: parseInt(document.getElementById('licenseDays').value),
            dayType: document.getElementById('licenseDayType').value,
            requiresApproval: document.getElementById('requiresApproval').checked,
            requiresDocumentation: document.getElementById('requiresDocumentation').checked,
            maxPerYear: document.getElementById('maxPerYear').value ? parseInt(document.getElementById('maxPerYear').value) : null,
            advanceNoticeDays: parseInt(document.getElementById('advanceNoticeDays').value),
            legalBasis: document.getElementById('legalBasis').value
        };

        try {
            const response = await fetch('/api/v1/vacation/extraordinary-licenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert('✓ Licencia extraordinaria creada exitosamente');
                closeExtraordinaryLicenseModal();
                loadVacationPolicies();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error creando licencia:', error);
            alert('Error creando licencia extraordinaria');
        }
    });
}

function closeExtraordinaryLicenseModal() {
    const modal = document.getElementById('extraordinaryLicenseModal');
    if (modal) modal.remove();
}

async function deleteExtraordinaryLicense(licenseId) {
    if (!confirm('¿Está seguro de eliminar esta licencia extraordinaria?')) return;

    const authToken = localStorage.getItem('token') || sessionStorage.getItem('authToken');

    try {
        // Soft delete by setting isActive to false
        const response = await fetch(`/api/v1/vacation/extraordinary-licenses/${licenseId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ isActive: false })
        });

        const result = await response.json();

        if (result.success) {
            alert('✓ Licencia eliminada exitosamente');
            loadVacationPolicies();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error eliminando licencia:', error);
        alert('Error eliminando licencia extraordinaria');
    }
}

// ==================== PROGRAMACIÓN AUTOMÁTICA ====================
function getAutoSchedulerContent() {
    return `
        <div class="auto-scheduler-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <div>
                    <h3 style="margin: 0;">🤖 Programación Automática de Vacaciones</h3>
                    <p style="margin: 5px 0 0 0; color: #666;">Genera cronogramas óptimos considerando antigüedad, roles y cobertura</p>
                </div>
            </div>

            <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 25px;">
                <h4 style="margin: 0 0 15px 0;">⚙️ Generar Nuevo Cronograma</h4>

                <div style="display: flex; gap: 15px; align-items: end;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Año:</label>
                        <select id="scheduleYear" style="padding: 10px; border: 1px solid #ddd; border-radius: 6px; width: 150px;">
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                            <option value="2027">2027</option>
                        </select>
                    </div>

                    <button onclick="generateAutoSchedule()" style="background: #27ae60; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        🚀 Generar Cronograma
                    </button>
                </div>
            </div>

            <div id="auto-schedule-result">
                <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 10px;">
                    <h4>Selecciona un año y genera el cronograma automático</h4>
                    <p style="color: #666;">El sistema considerará antigüedad, compatibilidad de tareas y dotación mínima</p>
                </div>
            </div>
        </div>
    `;
}

async function generateAutoSchedule() {
    const yearSelect = document.getElementById('scheduleYear');
    const resultDiv = document.getElementById('auto-schedule-result');

    if (!yearSelect || !resultDiv) return;

    const year = yearSelect.value;

    resultDiv.innerHTML = '<div style="text-align: center; padding: 40px;">🔄 Generando cronograma automático...</div>';

    try {
        const authToken = localStorage.getItem('token') || sessionStorage.getItem('authToken');
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        const companyId = userStr ? JSON.parse(userStr).company_id || 1 : 1;

        const response = await fetch(`/api/v1/vacation/generate-schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ year: parseInt(year), company_id: companyId })
        });

        if (!response.ok) throw new Error('Error generando cronograma');

        const result = await response.json();
        const schedule = result.data.schedule || [];

        resultDiv.innerHTML = `
            <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <h4 style="margin: 0 0 20px 0;">📊 Cronograma ${year} - ${result.data.totalEmployees} Empleados</h4>

                ${schedule.map(item => `
                    <div style="background: #f8f9fa; padding: 20px; margin-bottom: 15px; border-radius: 8px; border-left: 4px solid ${getScoreColor(item.compatibilityScore)};">
                        <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 15px;">
                            <div style="flex: 1;">
                                <h5 style="margin: 0 0 5px 0;">${item.userName}</h5>
                                <div style="font-size: 13px; color: #666;">
                                    Antigüedad: ${item.yearsOfService} años |
                                    Días asignados: ${item.vacationDays} |
                                    Score: <strong style="color: ${getScoreColor(item.compatibilityScore)};">${Math.round(item.compatibilityScore)}%</strong>
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: 10px;">
                            <strong>Períodos sugeridos:</strong>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px;">
                                ${item.suggestedPeriods.map(period => `
                                    <div style="background: white; padding: 10px 15px; border-radius: 6px; border: 1px solid #ddd;">
                                        <div style="font-weight: 600; color: #27ae60;">${period.days} días</div>
                                        <div style="font-size: 12px; color: #666;">${period.startDate} → ${period.endDate}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('❌ Error:', error);
        resultDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #e74c3c;">Error generando cronograma. Verifica tu conexión.</div>';
    }
}

// ==================== CONFIGURACIÓN ====================
function getVacationConfigContent() {
    return `
        <div class="vacation-config-container">
            <h3 style="margin: 0 0 20px 0;">⚙️ Configuración de Vacaciones</h3>

            <div id="vacation-config-form">
                <div style="text-align: center; padding: 40px;">
                    🔄 Cargando configuración...
                </div>
            </div>
        </div>
    `;
}

async function loadVacationConfig() {
    const container = document.getElementById('vacation-config-form');
    if (!container) return;

    try {
        const authToken = localStorage.getItem('token') || sessionStorage.getItem('authToken');
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        const companyId = userStr ? JSON.parse(userStr).company_id || 1 : 1;

        const response = await fetch(`/api/v1/vacation/config?company_id=${companyId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Error cargando configuración');

        const result = await response.json();
        const config = result.data.configuration || {};
        const scales = result.data.vacationScales || [];
        const licenses = result.data.extraordinaryLicenses || [];

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 25px;">
                <!-- Configuración General -->
                <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h4 style="margin: 0 0 20px 0; color: #27ae60;">📋 Configuración General</h4>

                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                            <span><strong>Vacaciones Interrumpibles:</strong></span>
                            <span style="color: ${config.vacationInterruptible ? '#27ae60' : '#e74c3c'}; font-weight: 700;">
                                ${config.vacationInterruptible ? '✅ Sí' : '❌ No'}
                            </span>
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                            <span><strong>Días Continuos Mínimos:</strong></span>
                            <span style="color: #27ae60; font-weight: 700;">${config.minContinuousDays || 7} días</span>
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                            <span><strong>Máximo de Fracciones:</strong></span>
                            <span style="color: #27ae60; font-weight: 700;">${config.maxFractions || 3}</span>
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                            <span><strong>Días de Anticipación:</strong></span>
                            <span style="color: #27ae60; font-weight: 700;">${config.minAdvanceNoticeDays || 15} días</span>
                        </div>
                    </div>

                    <div style="margin-bottom: 15px; padding: 15px; background: #fff3cd; border-radius: 6px; border-left: 4px solid #f39c12;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>🎯 Dotación Mínima</strong>
                                <div style="font-size: 12px; color: #666; margin-top: 3px;">Máximo % simultáneo de vacaciones</div>
                            </div>
                            <span style="color: #f39c12; font-weight: 700; font-size: 24px;">${config.maxSimultaneousPercentage || 30}%</span>
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                            <span><strong>Programación Automática:</strong></span>
                            <span style="color: ${config.autoSchedulingEnabled ? '#27ae60' : '#e74c3c'}; font-weight: 700;">
                                ${config.autoSchedulingEnabled ? '✅ Habilitada' : '❌ Deshabilitada'}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Escalas de Vacaciones -->
                <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h4 style="margin: 0 0 20px 0; color: #27ae60;">📈 Escalas de Vacaciones por Antigüedad</h4>

                    ${scales.length > 0 ? scales.map(scale => `
                        <div style="padding: 12px; background: #e8f5e8; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #27ae60;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong>${scale.rangeDescription || `${scale.yearsFrom}-${scale.yearsTo || '∞'} años`}</strong>
                                    <div style="font-size: 12px; color: #666;">Prioridad: ${scale.priority}</div>
                                </div>
                                <span style="background: #27ae60; color: white; padding: 6px 12px; border-radius: 12px; font-weight: 700;">
                                    ${scale.vacationDays} días
                                </span>
                            </div>
                        </div>
                    `).join('') : '<div style="text-align: center; color: #666;">No hay escalas configuradas</div>'}
                </div>

                <!-- Licencias Extraordinarias -->
                <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h4 style="margin: 0 0 20px 0; color: #27ae60;">📝 Licencias Extraordinarias</h4>

                    ${licenses.length > 0 ? licenses.map(license => `
                        <div style="padding: 12px; background: #f8f9fa; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #3498db;">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div style="flex: 1;">
                                    <strong>${license.type}</strong>
                                    <div style="font-size: 12px; color: #666; margin-top: 3px;">${license.description}</div>
                                    ${license.legalBasis ? `<div style="font-size: 11px; color: #888; margin-top: 3px;">Base legal: ${license.legalBasis}</div>` : ''}
                                </div>
                                <span style="background: #3498db; color: white; padding: 6px 12px; border-radius: 12px; font-weight: 700; white-space: nowrap; margin-left: 10px;">
                                    ${license.days} días
                                </span>
                            </div>
                        </div>
                    `).join('') : '<div style="text-align: center; color: #666;">No hay licencias extraordinarias configuradas</div>'}
                </div>
            </div>
        `;

    } catch (error) {
        console.error('❌ Error:', error);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #e74c3c;">Error cargando configuración. Verifica tu conexión.</div>';
    }
}

// ==================== BALANCE REAL POR EMPLEADO ====================
async function loadRealEmployeeBalance() {
    const container = document.getElementById('vacation-balance-list');
    if (!container) return;

    try {
        const authToken = localStorage.getItem('token') || sessionStorage.getItem('authToken');
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        const companyId = userStr ? JSON.parse(userStr).company_id || 1 : 1;

        // Obtener usuarios de la empresa
        const usersRes = await fetch(`/api/v1/users?company_id=${companyId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!usersRes.ok) throw new Error('Error cargando usuarios');

        const usersData = await usersRes.json();
        const users = usersData.users || usersData.data || [];

        // Calcular balance para cada usuario
        const balancePromises = users.map(async (user) => {
            try {
                const balanceRes = await fetch(`/api/v1/vacation/calculate-days/${user.id}?company_id=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });

                if (balanceRes.ok) {
                    const balanceData = await balanceRes.json();
                    return {
                        user,
                        balance: balanceData.data || {}
                    };
                }
            } catch (err) {
                console.error(`Error calculando balance para ${user.name}:`, err);
            }
            return null;
        });

        const balances = (await Promise.all(balancePromises)).filter(b => b !== null);

        // Mostrar balances
        container.innerHTML = balances.map(item => `
            <div style="background: white; padding: 20px; margin-bottom: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 4px solid ${item.balance.remainingDays > 10 ? '#27ae60' : item.balance.remainingDays > 5 ? '#f39c12' : '#e74c3c'};">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 5px 0; color: #2c3e50;">${item.user.firstName} ${item.user.lastName}</h4>
                        <div style="font-size: 13px; color: #666; margin-bottom: 10px;">
                            ${item.user.email} | Legajo: ${item.user.employeeId || 'N/A'}
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px;">
                            <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; text-align: center;">
                                <div style="font-size: 11px; color: #999; margin-bottom: 3px;">Antigüedad</div>
                                <div style="font-weight: 700; font-size: 16px; color: #3498db;">${item.balance.yearsOfService || 0} años</div>
                            </div>
                            <div style="background: #e8f5e8; padding: 10px; border-radius: 6px; text-align: center;">
                                <div style="font-size: 11px; color: #999; margin-bottom: 3px;">Total Anual</div>
                                <div style="font-weight: 700; font-size: 16px; color: #27ae60;">${item.balance.totalVacationDays || 0} días</div>
                            </div>
                            <div style="background: #fff3cd; padding: 10px; border-radius: 6px; text-align: center;">
                                <div style="font-size: 11px; color: #999; margin-bottom: 3px;">Usados</div>
                                <div style="font-weight: 700; font-size: 16px; color: #f39c12;">${item.balance.usedDays || 0} días</div>
                            </div>
                            <div style="background: #d1ecf1; padding: 10px; border-radius: 6px; text-align: center;">
                                <div style="font-size: 11px; color: #999; margin-bottom: 3px;">Disponibles</div>
                                <div style="font-weight: 700; font-size: 16px; color: #17a2b8;">${item.balance.remainingDays || 0} días</div>
                            </div>
                        </div>
                        ${item.balance.applicableScale ? `
                            <div style="margin-top: 10px; padding: 8px; background: #f0f0f0; border-radius: 4px; font-size: 12px;">
                                <strong>Escala:</strong> ${item.balance.applicableScale.rangeDescription} 
                                (${item.balance.applicableScale.yearsFrom}-${item.balance.applicableScale.yearsTo || '∞'} años → ${item.balance.applicableScale.vacationDays} días)
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('❌ Error:', error);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #e74c3c;">Error cargando balances. Verifica tu conexión.</div>';
    }
}

// ============================================================================
// EXPORTACIÓN DE MÓDULO
// ============================================================================

// Registro en window.Modules para sistema moderno
window.Modules = window.Modules || {};
window.Modules['vacation-management'] = {
    init: showVacationManagementContent
};

// Mantener compatibilidad legacy
window.showVacationManagementContent = showVacationManagementContent;

console.log('✅ [VACATION-MANAGEMENT] Módulo registrado y listo');

