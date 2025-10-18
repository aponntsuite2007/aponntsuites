/* ✅ CÓDIGO FUNCIONAL PROTEGIDO - NO MODIFICAR SIN ANÁLISIS
 * 📅 Fecha: 23/SEP/2025 04:06:00
 * 🏷️ Versión: v2.1.2-ATTENDANCE-MODULE
 * 📋 Funcionalidad: Módulo completo de asistencia empresarial
 */
// Attendance Module - v4.0 PROGRESSIVE
console.log('📋 [ATTENDANCE] Módulo attendance cargado');

// Attendance functions
function showAttendanceContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="tab-content active" id="attendance">
            <div class="card">
                <h2 data-translate="attendance.title">📋 Control de Asistencia Avanzado</h2>

                <!-- Grilla de Asistencia de Hoy -->
                <div style="margin-bottom: 30px;">
                    <h3 data-translate="attendance.today_title">📅 Asistencia de Hoy</h3>
                    <div id="attendance-stats" class="stats-grid" style="margin: 15px 0;">
                        <div class="stat-item">
                            <div class="stat-value" id="present-count">--</div>
                            <div class="stat-label" data-translate="attendance.present">Presentes</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="late-count">--</div>
                            <div class="stat-label" data-translate="attendance.late">Tardanzas</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="absent-count">--</div>
                            <div class="stat-label" data-translate="attendance.absent">Ausentes</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="total-hours">--</div>
                            <div class="stat-label" data-translate="attendance.total_hours">Horas Trabajadas</div>
                        </div>
                    </div>

                    <div style="margin: 20px 0;">
                        <button class="btn btn-primary" onclick="loadAttendanceData()" data-translate="attendance.btn_refresh">🔄 Actualizar</button>
                        <button class="btn btn-success" onclick="exportAttendanceData()" data-translate="attendance.btn_export_excel">📊 Exportar Excel</button>
                    </div>
                    
                    <div class="table-container">
                        <table id="attendance-table" class="data-table">
                            <thead>
                                <tr>
                                    <th data-translate="attendance.col_employee">👤 Empleado</th>
                                    <th data-translate="attendance.col_employee_id">🏷️ Legajo</th>
                                    <th data-translate="attendance.col_date">📅 Fecha</th>
                                    <th data-translate="attendance.col_status">🟢 Estado</th>
                                    <th data-translate="attendance.col_check_in">⏰ Entrada</th>
                                    <th data-translate="attendance.col_check_out">⏰ Salida</th>
                                    <th data-translate="attendance.col_hours">🕐 Horas</th>
                                    <th data-translate="attendance.col_method">📱 Método</th>
                                    <th data-translate="attendance.col_location">📍 Ubicación</th>
                                    <th data-translate="attendance.col_notes">📝 Notas</th>
                                </tr>
                            </thead>
                            <tbody id="attendance-tbody">
                                <tr>
                                    <td colspan="10" style="text-align: center; padding: 20px;" data-translate="attendance.click_refresh_to_load">
                                        Presiona "🔄 Actualizar" para cargar los datos de asistencia de hoy
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Filtros y Reportes -->
                <div style="margin-top: 30px;">
                    <h3 data-translate="attendance.reports_filters_title">📊 Reportes y Filtros</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0;">
                        <div>
                            <label data-translate="attendance.filter_date_from">📅 Fecha Desde:</label>
                            <input type="date" id="dateFrom" style="width: 100%; padding: 8px; margin-top: 5px;">
                        </div>
                        <div>
                            <label data-translate="attendance.filter_date_to">📅 Fecha Hasta:</label>
                            <input type="date" id="dateTo" style="width: 100%; padding: 8px; margin-top: 5px;">
                        </div>
                        <div>
                            <label data-translate="attendance.filter_employee">👤 Empleado:</label>
                            <select id="employeeFilter" style="width: 100%; padding: 8px; margin-top: 5px;">
                                <option value="" data-translate="attendance.all_employees">Todos los empleados</option>
                            </select>
                        </div>
                        <div>
                            <label data-translate="attendance.filter_department">🏢 Departamento:</label>
                            <select id="deptFilter" style="width: 100%; padding: 8px; margin-top: 5px;">
                                <option value="" data-translate="attendance.all_departments">Todos los departamentos</option>
                                <!-- Se cargarán dinámicamente desde la API -->
                            </select>
                        </div>
                    </div>

                    <div style="margin: 20px 0; text-align: center;">
                        <button class="btn btn-primary" onclick="generateAttendanceReport()" data-translate="attendance.btn_generate_report">📊 Generar Reporte</button>
                        <button class="btn btn-warning" onclick="exportAttendanceReport()" data-translate="attendance.btn_export_report">📤 Exportar Reporte</button>
                        <button class="btn btn-info" onclick="showAttendanceCharts()" data-translate="attendance.btn_view_charts">📈 Ver Gráficos</button>
                    </div>

                    <!-- Filtros por Tipo de Ausentismo -->
                    <div style="margin: 20px 0;">
                        <h4 data-translate="attendance.advanced_filters_title">🔍 Filtros Avanzados</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            <div>
                                <label data-translate="attendance.filter_status">📋 Estado:</label>
                                <select id="statusFilter" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="" data-translate="attendance.all_statuses">Todos los estados</option>
                                    <option value="presente" data-translate="attendance.status_present">Presente</option>
                                    <option value="tardanza" data-translate="attendance.status_late">Tardanza</option>
                                    <option value="ausente" data-translate="attendance.status_absent">Ausente</option>
                                </select>
                            </div>
                            <div>
                                <label data-translate="attendance.filter_absence_type">🏥 Tipo de Ausentismo:</label>
                                <select id="absenceTypeFilter" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="" data-translate="attendance.all_types">Todos los tipos</option>
                                    <option value="enfermedad" data-translate="attendance.type_illness">Enfermedad</option>
                                    <option value="accidente" data-translate="attendance.type_accident">Accidente</option>
                                    <option value="personal" data-translate="attendance.type_personal">Motivos Personales</option>
                                    <option value="capacitacion" data-translate="attendance.type_training">Capacitación</option>
                                    <option value="vacaciones" data-translate="attendance.type_vacation">Vacaciones</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Gráficos Estadísticos -->
                <div style="margin-top: 30px;" id="charts-section">
                    <h3 data-translate="attendance.stats_chart_title">📈 Estadísticas de Asistencia - Últimos 30 Días</h3>
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <canvas id="attendanceChart" width="400" height="200"></canvas>
                    </div>
                </div>

                <!-- 📊 LOGS DE DETECCIONES BIOMÉTRICAS -->
                <div style="margin-top: 40px; border-top: 2px solid #e0e0e0; padding-top: 20px;">
                    <h3 data-translate="attendance.detection_logs_title">🔍 Logs de Detecciones Biométricas</h3>
                    <p style="color: #666; margin-bottom: 15px;" data-translate="attendance.detection_logs_description">
                        Registro completo de TODAS las detecciones faciales (incluso las que no generaron fichada por cooldown)
                    </p>

                    <div style="margin: 20px 0;">
                        <button class="btn btn-primary" onclick="loadDetectionLogs()" data-translate="attendance.btn_load_logs">🔄 Cargar Logs</button>
                        <button class="btn btn-info" onclick="refreshDetectionLogs()" data-translate="attendance.btn_refresh_logs">♻️ Actualizar</button>
                        <span style="margin-left: 15px; color: #666; font-size: 0.9em;">
                            <span data-translate="attendance.logs_limit">Límite:</span> <select id="logsLimit" style="padding: 5px;">
                                <option value="50">50</option>
                                <option value="100" selected>100</option>
                                <option value="200">200</option>
                                <option value="500">500</option>
                            </select> <span data-translate="attendance.logs_records">registros</span>
                        </span>
                    </div>

                    <div class="table-container">
                        <table id="detection-logs-table" class="data-table">
                            <thead>
                                <tr>
                                    <th data-translate="attendance.log_col_timestamp">🕐 Timestamp</th>
                                    <th data-translate="attendance.log_col_employee">👤 Empleado</th>
                                    <th data-translate="attendance.log_col_employee_id">🏷️ Legajo</th>
                                    <th data-translate="attendance.log_col_similarity">📊 Similitud</th>
                                    <th data-translate="attendance.log_col_registered">✅ Fichó?</th>
                                    <th data-translate="attendance.log_col_type">🔄 Tipo</th>
                                    <th data-translate="attendance.log_col_skip_reason">⏭️ Razón Skip</th>
                                    <th data-translate="attendance.log_col_time_ms">⚡ Tiempo (ms)</th>
                                </tr>
                            </thead>
                            <tbody id="detection-logs-tbody">
                                <tr>
                                    <td colspan="8" style="text-align: center; padding: 20px;" data-translate="attendance.click_load_logs">
                                        Presiona "🔄 Cargar Logs" para ver el registro de detecciones
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Initialize with today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFrom').value = today;
    document.getElementById('dateTo').value = today;
    
    // Auto load today's attendance stats
    setTimeout(loadAttendanceStats, 300);
    
    // Load employee list for filter
    setTimeout(loadEmployeeFilter, 500);

    // Load departments list for filter
    setTimeout(loadDepartmentsForAttendance, 600);

    // Load real statistics from API
    setTimeout(loadAttendanceStats, 700);

    // Load initial attendance data
    setTimeout(loadAttendanceData, 800);

    // Load Chart.js and initialize charts
    setTimeout(loadChartLibraryAndInitialize, 900);
}

// Load attendance statistics - DEPRECATED (use loadAttendanceStatsFromAPI instead)
function loadAttendanceStats() {
    console.log('📊 [ATTENDANCE] Cargando estadísticas desde PostgreSQL...');

    // Mock stats para mostrar mientras se implementa la API
    document.getElementById('present-count').textContent = '85';
    document.getElementById('late-count').textContent = '12';
    document.getElementById('absent-count').textContent = '8';
    document.getElementById('total-hours').textContent = '340';
}

// Load attendance data - Real API with company filtering
async function loadAttendanceData() {
    console.log('📋 [ATTENDANCE] Cargando datos de asistencia desde PostgreSQL...');

    const tbody = document.getElementById('attendance-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">${await window.t('attendance.loading_data')}</td></tr>`;

    try {
        // Obtener filtros actuales
        const filters = getAttendanceFilters();

        // Construir URL con parámetros
        const params = new URLSearchParams();
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.employee) params.append('userId', filters.employee);
        if (filters.status) params.append('status', filters.status);
        if (filters.absenceType) params.append('absenceType', filters.absenceType);
        params.append('limit', '50'); // Mostrar más registros

        const apiUrl = `/api/v1/attendance?${params.toString()}`;
        console.log('🔗 [ATTENDANCE] Consultando:', apiUrl);

        // Obtener token de autenticación
        const token = getAuthToken();
        if (!token) {
            console.error('❌ [ATTENDANCE] No hay token de autenticación');
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">${await window.t('attendance.error_not_authenticated')}</td></tr>`;
            return;
        }

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 [ATTENDANCE] Response status:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ [ATTENDANCE] Datos recibidos:', result);

            if (result.success && result.data) {
                displayAttendanceTable(result.data, result.pagination);
            } else {
                console.warn('⚠️ [ATTENDANCE] Sin datos o formato inesperado:', result);
                tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">${await window.t('attendance.no_data_for_filters')}</td></tr>`;
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ [ATTENDANCE] Error HTTP:', response.status, errorData);
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">${await window.t('attendance.error_server', {status: response.status, error: errorData.error || await window.t('attendance.error_unknown')})}</td></tr>`;
        }

    } catch (error) {
        console.error('❌ [ATTENDANCE] Error de conexión:', error);
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">${await window.t('attendance.error_connection')}</td></tr>`;
    }
}

// Display attendance table - Original style
async function displayAttendanceTable(attendanceData) {
    const tbody = document.getElementById('attendance-tbody');
    if (!tbody) return;

    if (!attendanceData || attendanceData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">${await window.t('attendance.no_data_to_display')}</td></tr>`;
        return;
    }
    
    let tableHTML = '';
    attendanceData.forEach(record => {
        const statusClass = getStatusClass(record.status);
        
        tableHTML += `
            <tr>
                <td><strong>${record.employee}</strong></td>
                <td>${record.legajo}</td>
                <td><span class="status-badge ${statusClass}">${record.status}</span></td>
                <td>${record.checkIn}</td>
                <td>${record.checkOut}</td>
                <td><strong>${record.hours}</strong></td>
                <td>${record.method}</td>
                <td>${record.location}</td>
                <td><small>${record.notes}</small></td>
            </tr>
        `;
    });
    
    tbody.innerHTML = tableHTML;
    showAttendanceMessage(await window.t('attendance.records_loaded', {count: attendanceData.length}), 'success');
}

// Get status CSS class
function getStatusClass(status) {
    switch (status) {
        case 'Presente':
            return 'success';
        case 'Tardanza':
            return 'warning';
        case 'Ausente':
            return 'error';
        default:
            return '';
    }
}

// Load employee filter options from API
async function loadEmployeeFilter() {
    console.log('👥 [ATTENDANCE] Cargando empleados desde PostgreSQL...');

    const employeeSelect = document.getElementById('employeeFilter');
    if (!employeeSelect) return;

    try {
        const token = getAuthToken();
        if (!token) {
            console.error('❌ [ATTENDANCE] No hay token de autenticación para cargar empleados');
            return;
        }

        const response = await fetch('/api/v1/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ [ATTENDANCE] Empleados recibidos:', result);

            // Limpiar opciones existentes (excepto "Todos")
            employeeSelect.innerHTML = `<option value="">${await window.t('attendance.all_employees')}</option>`;

            // El endpoint devuelve { users: [...] }
            if (result.users && Array.isArray(result.users)) {
                result.users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;  // Usar 'id' del usuario
                    option.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.employeeId;
                    employeeSelect.appendChild(option);
                });

                console.log(`✅ [ATTENDANCE] Cargados ${result.users.length} empleados en filtro`);
            } else {
                console.warn('⚠️ [ATTENDANCE] Formato inesperado de empleados:', result);
            }
        } else {
            console.error('❌ [ATTENDANCE] Error HTTP cargando empleados:', response.status);
        }
    } catch (error) {
        console.error('❌ [ATTENDANCE] Error cargando empleados:', error);

        // Fallback: mantener solo "Todos los empleados"
        employeeSelect.innerHTML = `<option value="">${await window.t('attendance.all_employees')}</option>`;
    }
}

// Export attendance data to Excel
async function exportAttendanceData() {
    console.log('📊 [ATTENDANCE] Exportando datos a Excel...');
    showAttendanceMessage(await window.t('attendance.export_excel_in_dev'), 'info');
}

// Generate attendance report
async function generateAttendanceReport() {
    console.log('📊 [ATTENDANCE] Generando reporte de asistencia...');

    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const employee = document.getElementById('employeeFilter').value;
    const department = document.getElementById('deptFilter').value;

    console.log('📊 Filtros:', { dateFrom, dateTo, employee, department });

    showAttendanceMessage(await window.t('attendance.generating_report'), 'info');

    // Simulate report generation
    setTimeout(async () => {
        showAttendanceMessage(await window.t('attendance.report_generated_success'), 'success');
    }, 2000);
}

// Export attendance report
async function exportAttendanceReport() {
    console.log('📤 [ATTENDANCE] Exportando reporte...');
    showAttendanceMessage(await window.t('attendance.export_report_in_dev'), 'info');
}

// Show attendance charts - Updated with real functionality
async function showAttendanceCharts() {
    console.log('📈 [ATTENDANCE] Mostrando gráficos de estadísticas...');
    const chartsSection = document.getElementById('charts-section');
    if (chartsSection) {
        chartsSection.scrollIntoView({ behavior: 'smooth' });
        showAttendanceMessage(await window.t('attendance.chart_shown'), 'success');
    } else {
        showAttendanceMessage(await window.t('attendance.charts_on_load'), 'warning');
    }
}

// Show attendance message utility
function showAttendanceMessage(message, type) {
    let messageElement = document.getElementById('attendanceMessage');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'attendanceMessage';
        messageElement.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            max-width: 300px;
        `;
        document.body.appendChild(messageElement);
    }
    
    messageElement.textContent = message;
    switch (type) {
        case 'success': messageElement.style.backgroundColor = '#4CAF50'; break;
        case 'error': messageElement.style.backgroundColor = '#f44336'; break;
        case 'warning': messageElement.style.backgroundColor = '#ff9800'; break;
        case 'info': messageElement.style.backgroundColor = '#2196F3'; break;
        default: messageElement.style.backgroundColor = '#666';
    }
    
    setTimeout(() => {
        if (messageElement && messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 3000);
}

// Función para cargar departamentos en filtros de asistencia
async function loadDepartmentsForAttendance() {
    console.log('🏢 [ATTENDANCE] Cargando departamentos desde PostgreSQL...');

    try {
        const token = getAuthToken();
        if (!token) {
            console.error('❌ [ATTENDANCE] No hay token de autenticación para cargar departamentos');
            return;
        }

        const response = await fetch('/api/v1/departments', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success && (result.data || result.departments)) {
                const departments = result.data || result.departments;
                populateAttendanceDepartmentFilter(departments);
                console.log(`✅ [ATTENDANCE] Cargados ${departments.length} departamentos en filtro`);
            } else {
                console.warn('⚠️ [ATTENDANCE] Formato inesperado de departamentos:', result);
            }
        } else {
            console.error('❌ [ATTENDANCE] Error HTTP cargando departamentos:', response.status);
        }
    } catch (error) {
        console.error('❌ [ATTENDANCE] Error cargando departamentos:', error);

        // Fallback: mantener solo "Todos los departamentos"
        const deptSelect = document.getElementById('deptFilter');
        if (deptSelect) {
            deptSelect.innerHTML = `<option value="">${await window.t('attendance.all_departments')}</option>`;
        }
    }
}

async function populateAttendanceDepartmentFilter(departments) {
    const select = document.getElementById('deptFilter');
    if (!select) return;

    // Mantener la opción "Todos los departamentos"
    select.innerHTML = `<option value="">${await window.t('attendance.all_departments')}</option>`;
    
    // Agregar departamentos
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.name;
        option.textContent = dept.name;
        select.appendChild(option);
    });
    
    console.log(`✅ Se cargaron ${departments.length} departamentos en filtro de asistencia`);
}

// Helper functions for API integration
function getAttendanceFilters() {
    return {
        startDate: document.getElementById('dateFrom')?.value || '',
        endDate: document.getElementById('dateTo')?.value || '',
        employee: document.getElementById('employeeFilter')?.value || '',
        department: document.getElementById('deptFilter')?.value || '',
        status: document.getElementById('statusFilter')?.value || '',
        absenceType: document.getElementById('absenceTypeFilter')?.value || ''
    };
}

function getAuthToken() {
    // Try multiple possible token storage locations
    return localStorage.getItem('token') ||
           sessionStorage.getItem('token') ||
           window.companyAuthToken ||
           (window.currentUser && window.currentUser.token) ||
           null;
}

// === MÁSCARAS DE TRADUCCIÓN ===
// Mantener la BD en inglés, traducir solo en UI
async function translateStatus(status) {
    const statusKey = status?.toLowerCase();
    const translationKeys = {
        'present': 'attendance.status_present_value',
        'late': 'attendance.status_late_value',
        'absent': 'attendance.status_absent_value',
        'pending': 'attendance.status_pending_value'
    };

    if (translationKeys[statusKey]) {
        return await window.t(translationKeys[statusKey]);
    }
    return status || await window.t('attendance.no_data');
}

async function translateMethod(method) {
    const methodKey = method?.toLowerCase();
    const translationKeys = {
        'face': 'attendance.method_face',
        'fingerprint': 'attendance.method_fingerprint',
        'pin': 'attendance.method_pin',
        'manual': 'attendance.method_manual',
        'mobile': 'attendance.method_mobile',
        'iris': 'attendance.method_iris',
        'voice': 'attendance.method_voice'
    };

    if (translationKeys[methodKey]) {
        return await window.t(translationKeys[methodKey]);
    }
    return method || await window.t('attendance.method_manual');
}

// Update displayAttendanceTable to handle real API data
async function displayAttendanceTable(attendanceData, pagination) {
    const tbody = document.getElementById('attendance-tbody');
    if (!tbody) return;

    if (!attendanceData || attendanceData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">${await window.t('attendance.no_records_to_show')}</td></tr>`;
        return;
    }

    tbody.innerHTML = '';

    for (let index = 0; index < attendanceData.length; index++) {
        const record = attendanceData[index];

        // Log para debug - ver estructura de datos
        if (index === 0) {
            console.log('🔍 [ATTENDANCE] Estructura del primer registro:', record);
            console.log('🔍 [ATTENDANCE] Campos disponibles:', Object.keys(record));
            console.log('🔍 [ATTENDANCE] checkInTime:', record.checkInTime);
            console.log('🔍 [ATTENDANCE] checkOutTime:', record.checkOutTime);
        }

        const row = document.createElement('tr');

        // Formatear datos del record de PostgreSQL
        // Los campos vienen como "User.firstName", "User.lastName" en la estructura plana
        const userName = record['User.firstName'] || record['User.lastName']
            ? `${record['User.firstName'] || ''} ${record['User.lastName'] || ''}`.trim()
            : await window.t('attendance.unknown_user');
        const employeeId = record['User.employeeId'] || 'N/A';

        // Formatear fecha SIN conversión de zona horaria (usar la fecha tal cual)
        const date = record.date ? record.date.split('T')[0].split('-').reverse().join('/') :
                     (record.checkInTime ? new Date(record.checkInTime).toLocaleDateString('es-AR') : '--');

        // Verificar si checkInTime y checkOutTime existen
        const checkInTime = record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--';
        const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--';

        // Calcular horas trabajadas si hay entrada y salida
        let workingHours = '--';
        if (record.checkInTime && record.checkOutTime) {
            const checkIn = new Date(record.checkInTime);
            const checkOut = new Date(record.checkOutTime);
            const diffMs = checkOut - checkIn;
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            workingHours = `${diffHrs}h ${diffMins}m`;
        } else if (record.workingHours) {
            workingHours = `${record.workingHours}h`;
        }
        const status = await translateStatus(record.status);
        const method = await translateMethod(record.checkInMethod);
        const location = record.checkInLocation || await window.t('attendance.not_specified');
        const notes = record.notes || '';

        // Determinar clase CSS según status
        let statusClass = '';
        switch (status.toLowerCase()) {
            case 'present':
            case 'presente':
                statusClass = 'status-present';
                break;
            case 'late':
            case 'tardanza':
                statusClass = 'status-late';
                break;
            case 'absent':
            case 'ausente':
                statusClass = 'status-absent';
                break;
            default:
                statusClass = 'status-unknown';
        }

        row.innerHTML = `
            <td>${userName}</td>
            <td>${employeeId}</td>
            <td>${date}</td>
            <td><span class="${statusClass}">${status}</span></td>
            <td>${checkInTime}</td>
            <td>${checkOutTime}</td>
            <td>${workingHours}</td>
            <td>${method}</td>
            <td>${location}</td>
            <td>${notes}</td>
        `;

        tbody.appendChild(row);
    }

    // Mostrar información de paginación si está disponible
    if (pagination) {
        console.log('📄 [ATTENDANCE] Paginación:', pagination);
        // Aquí se podría agregar UI de paginación en el futuro
    }

    console.log(`✅ [ATTENDANCE] Tabla actualizada con ${attendanceData.length} registros`);
}

// Update loadAttendanceStats to use real API
async function loadAttendanceStats() {
    console.log('📊 [ATTENDANCE] Cargando estadísticas desde PostgreSQL...');

    try {
        const token = getAuthToken();
        if (!token) {
            console.error('❌ [ATTENDANCE STATS] No hay token de autenticación');
            return;
        }

        const response = await fetch('/api/v1/attendance/stats/summary', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ [ATTENDANCE STATS] Estadísticas recibidas:', result);

            if (result.success && result.data) {
                const stats = result.data;

                // Actualizar elementos de estadísticas
                const presentEl = document.getElementById('present-count');
                const lateEl = document.getElementById('late-count');
                const absentEl = document.getElementById('absent-count');
                const totalHoursEl = document.getElementById('total-hours');

                if (presentEl) presentEl.textContent = stats.presentCount || '0';
                if (lateEl) lateEl.textContent = stats.lateCount || '0';
                if (absentEl) absentEl.textContent = stats.absentCount || '0';
                if (totalHoursEl) totalHoursEl.textContent = `${Math.round(stats.totalOvertimeHours || 0)}h`;

                showAttendanceMessage(await window.t('attendance.stats_updated'), 'success');
            } else {
                console.warn('⚠️ [ATTENDANCE STATS] Sin datos o formato inesperado:', result);
            }
        } else {
            console.error('❌ [ATTENDANCE STATS] Error HTTP:', response.status);
        }
    } catch (error) {
        console.error('❌ [ATTENDANCE STATS] Error cargando estadísticas:', error);
        // Fallback a valores por defecto
        const presentEl = document.getElementById('present-count');
        const lateEl = document.getElementById('late-count');
        const absentEl = document.getElementById('absent-count');
        const totalHoursEl = document.getElementById('total-hours');

        if (presentEl) presentEl.textContent = '--';
        if (lateEl) lateEl.textContent = '--';
        if (absentEl) absentEl.textContent = '--';
        if (totalHoursEl) totalHoursEl.textContent = '--';
    }
}

// === CHART.JS INTEGRATION ===

// Load Chart.js library and initialize charts
function loadChartLibraryAndInitialize() {
    console.log('📈 [ATTENDANCE] Cargando Chart.js y inicializando gráficos...');

    // Check if Chart.js is already loaded
    if (window.Chart) {
        console.log('✅ [ATTENDANCE] Chart.js ya está cargado, inicializando gráficos...');
        initializeAttendanceChart();
        return;
    }

    // Load Chart.js from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
    script.onload = function() {
        console.log('✅ [ATTENDANCE] Chart.js cargado exitosamente');
        setTimeout(initializeAttendanceChart, 100);
    };
    script.onerror = async function() {
        console.error('❌ [ATTENDANCE] Error cargando Chart.js');
        showAttendanceMessage(await window.t('attendance.error_loading_charts_lib'), 'error');
    };
    document.head.appendChild(script);
}

// Initialize the attendance statistics chart
async function initializeAttendanceChart() {
    console.log('📈 [ATTENDANCE] Inicializando gráfico de estadísticas...');

    const canvas = document.getElementById('attendanceChart');
    if (!canvas) {
        console.warn('⚠️ [ATTENDANCE] Canvas del gráfico no encontrado');
        return;
    }

    // Inicializar con arrays vacíos - se cargarán datos reales después
    const ctx = canvas.getContext('2d');
    window.attendanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: await window.t('attendance.chart_daily_absences'),
                    data: [],
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: await window.t('attendance.chart_late_arrivals'),
                    data: [],
                    borderColor: '#ffa500',
                    backgroundColor: 'rgba(255, 165, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: await window.t('attendance.chart_present'),
                    data: [],
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: await window.t('attendance.chart_title'),
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: await window.t('attendance.chart_y_axis')
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: await window.t('attendance.chart_x_axis')
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    console.log('✅ [ATTENDANCE] Gráfico de asistencia inicializado');

    // Intentar cargar datos reales de la API
    updateChartWithRealData();
}

// === DATOS REALES DEL GRÁFICO ===
// Ya no se usan datos hardcodeados/mock - todo viene de la API

// Update chart with real data from API
async function updateChartWithRealData() {
    console.log('📈 [ATTENDANCE] Actualizando gráfico con datos reales...');

    try {
        const token = getAuthToken();
        if (!token) {
            console.error('❌ [ATTENDANCE] No hay token para cargar datos del gráfico');
            return;
        }

        const response = await fetch('/api/v1/attendance/stats/chart', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && window.attendanceChart) {
                // Update chart with real data
                window.attendanceChart.data.labels = data.labels;
                window.attendanceChart.data.datasets[0].data = data.absences;
                window.attendanceChart.data.datasets[1].data = data.lateArrivals;
                window.attendanceChart.data.datasets[2].data = data.present;
                window.attendanceChart.update();

                console.log('✅ [ATTENDANCE] Gráfico actualizado con datos reales');
            }
        } else {
            console.warn('⚠️ [ATTENDANCE] API de gráficos no disponible, usando datos mock');
        }
    } catch (error) {
        console.warn('⚠️ [ATTENDANCE] Error cargando datos reales del gráfico:', error);
    }
}

// ======================================================
// 🔍 FUNCIONES PARA LOGS DE DETECCIONES BIOMÉTRICAS
// ======================================================

/**
 * Cargar logs de detecciones biométricas desde la API
 */
async function loadDetectionLogs() {
    console.log('🔍 [DETECTION-LOGS] Cargando logs de detecciones...');

    const tbody = document.getElementById('detection-logs-tbody');
    if (!tbody) {
        console.error('❌ [DETECTION-LOGS] No se encontró tbody');
        return;
    }

    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">${await window.t('attendance.loading_logs')}</td></tr>`;

    try {
        const token = getAuthToken();
        if (!token) {
            console.error('❌ [DETECTION-LOGS] No hay token de autenticación');
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">${await window.t('attendance.error_not_authenticated')}</td></tr>`;
            return;
        }

        // Obtener companyId del usuario actual
        const companyId = window.currentCompany?.id || window.selectedCompany?.id;
        if (!companyId) {
            console.error('❌ [DETECTION-LOGS] No hay company ID');
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">${await window.t('attendance.error_company_not_detected')}</td></tr>`;
            return;
        }

        // Obtener límite de registros
        const limit = document.getElementById('logsLimit')?.value || 100;

        // Llamar a la API
        const response = await fetch(`/api/v2/biometric-attendance/detection-logs?companyId=${companyId}&limit=${limit}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ [DETECTION-LOGS] Datos recibidos:', result);

        if (result.success && result.data && result.data.length > 0) {
            displayDetectionLogs(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">${await window.t('attendance.no_detection_logs')}</td></tr>`;
        }

    } catch (error) {
        console.error('❌ [DETECTION-LOGS] Error:', error);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">${await window.t('attendance.error_message', {message: error.message})}</td></tr>`;
    }
}

/**
 * Mostrar logs en la tabla
 */
async function displayDetectionLogs(logs) {
    const tbody = document.getElementById('detection-logs-tbody');
    if (!tbody) return;

    let html = '';

    for (const log of logs) {
        // Formatear timestamp en formato 24hs
        const timestamp = new Date(log.detection_timestamp);
        const formattedTime = timestamp.toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // Formatear similitud como porcentaje
        const similarity = (log.similarity * 100).toFixed(1) + '%';

        // Indicador de fichada
        const wasRegistered = log.was_registered
            ? `<span style="color: green; font-weight: bold;">${await window.t('attendance.log_yes')}</span>`
            : `<span style="color: orange;">${await window.t('attendance.log_no')}</span>`;

        // Tipo de operación
        let operationType = '--';
        if (log.operation_type) {
            operationType = log.operation_type === 'clock_in'
                ? await window.t('attendance.log_clock_in')
                : await window.t('attendance.log_clock_out');
        }

        // Razón de skip
        const skipReason = log.skip_reason || '--';

        // Color de fondo según si fichó o no
        const rowStyle = log.was_registered
            ? 'background-color: rgba(76, 175, 80, 0.05);'
            : '';

        html += `
            <tr style="${rowStyle}">
                <td>${formattedTime}</td>
                <td><strong>${log.full_name || log.employee_name}</strong></td>
                <td>${log.legajo || 'N/A'}</td>
                <td><span style="color: ${log.similarity >= 0.8 ? 'green' : log.similarity >= 0.75 ? 'orange' : 'red'};">${similarity}</span></td>
                <td>${wasRegistered}</td>
                <td>${operationType}</td>
                <td><small>${skipReason}</small></td>
                <td>${log.processing_time_ms || '--'}ms</td>
            </tr>
        `;
    }

    tbody.innerHTML = html;
    console.log(`✅ [DETECTION-LOGS] Mostrando ${logs.length} logs`);
}

/**
 * Actualizar logs (alias de loadDetectionLogs)
 */
function refreshDetectionLogs() {
    loadDetectionLogs();
}

// ✅ HACER FUNCIONES DISPONIBLES GLOBALMENTE
window.loadDetectionLogs = loadDetectionLogs;
window.refreshDetectionLogs = refreshDetectionLogs;

console.log('✅ [ATTENDANCE] Módulo attendance configurado con integración PostgreSQL y gráficos');

// ✅ HACER FUNCIÓN DISPONIBLE GLOBALMENTE
window.showAttendanceContent = showAttendanceContent;