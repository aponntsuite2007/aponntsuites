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
                <h2>📋 Control de Asistencia Avanzado</h2>
                
                <!-- Grilla de Asistencia de Hoy -->
                <div style="margin-bottom: 30px;">
                    <h3>📅 Asistencia de Hoy</h3>
                    <div id="attendance-stats" class="stats-grid" style="margin: 15px 0;">
                        <div class="stat-item">
                            <div class="stat-value" id="present-count">--</div>
                            <div class="stat-label">Presentes</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="late-count">--</div>
                            <div class="stat-label">Tardanzas</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="absent-count">--</div>
                            <div class="stat-label">Ausentes</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="total-hours">--</div>
                            <div class="stat-label">Horas Trabajadas</div>
                        </div>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <button class="btn btn-primary" onclick="loadAttendanceData()">🔄 Actualizar</button>
                        <button class="btn btn-success" onclick="exportAttendanceData()">📊 Exportar Excel</button>
                    </div>
                    
                    <div class="table-container">
                        <table id="attendance-table" class="data-table">
                            <thead>
                                <tr>
                                    <th>👤 Empleado</th>
                                    <th>🏷️ Legajo</th>
                                    <th>📅 Fecha</th>
                                    <th>🟢 Estado</th>
                                    <th>⏰ Entrada</th>
                                    <th>⏰ Salida</th>
                                    <th>🕐 Horas</th>
                                    <th>📱 Método</th>
                                    <th>📍 Ubicación</th>
                                    <th>📝 Notas</th>
                                </tr>
                            </thead>
                            <tbody id="attendance-tbody">
                                <tr>
                                    <td colspan="10" style="text-align: center; padding: 20px;">
                                        Presiona "🔄 Actualizar" para cargar los datos de asistencia de hoy
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Filtros y Reportes -->
                <div style="margin-top: 30px;">
                    <h3>📊 Reportes y Filtros</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0;">
                        <div>
                            <label>📅 Fecha Desde:</label>
                            <input type="date" id="dateFrom" style="width: 100%; padding: 8px; margin-top: 5px;">
                        </div>
                        <div>
                            <label>📅 Fecha Hasta:</label>
                            <input type="date" id="dateTo" style="width: 100%; padding: 8px; margin-top: 5px;">
                        </div>
                        <div>
                            <label>👤 Empleado:</label>
                            <select id="employeeFilter" style="width: 100%; padding: 8px; margin-top: 5px;">
                                <option value="">Todos los empleados</option>
                            </select>
                        </div>
                        <div>
                            <label>🏢 Departamento:</label>
                            <select id="deptFilter" style="width: 100%; padding: 8px; margin-top: 5px;">
                                <option value="">Todos los departamentos</option>
                                <!-- Se cargarán dinámicamente desde la API -->
                            </select>
                        </div>
                    </div>
                    
                    <div style="margin: 20px 0; text-align: center;">
                        <button class="btn btn-primary" onclick="generateAttendanceReport()">📊 Generar Reporte</button>
                        <button class="btn btn-warning" onclick="exportAttendanceReport()">📤 Exportar Reporte</button>
                        <button class="btn btn-info" onclick="showAttendanceCharts()">📈 Ver Gráficos</button>
                    </div>

                    <!-- Filtros por Tipo de Ausentismo -->
                    <div style="margin: 20px 0;">
                        <h4>🔍 Filtros Avanzados</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            <div>
                                <label>📋 Estado:</label>
                                <select id="statusFilter" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Todos los estados</option>
                                    <option value="presente">Presente</option>
                                    <option value="tardanza">Tardanza</option>
                                    <option value="ausente">Ausente</option>
                                </select>
                            </div>
                            <div>
                                <label>🏥 Tipo de Ausentismo:</label>
                                <select id="absenceTypeFilter" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Todos los tipos</option>
                                    <option value="enfermedad">Enfermedad</option>
                                    <option value="accidente">Accidente</option>
                                    <option value="personal">Motivos Personales</option>
                                    <option value="capacitacion">Capacitación</option>
                                    <option value="vacaciones">Vacaciones</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Gráficos Estadísticos -->
                <div style="margin-top: 30px;" id="charts-section">
                    <h3>📈 Estadísticas de Asistencia - Últimos 30 Días</h3>
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <canvas id="attendanceChart" width="400" height="200"></canvas>
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

    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">🔄 Cargando datos de asistencia...</td></tr>';

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
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">❌ No autenticado. Haga login nuevamente.</td></tr>';
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
                tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">ℹ️ No hay datos de asistencia para los filtros seleccionados</td></tr>';
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ [ATTENDANCE] Error HTTP:', response.status, errorData);
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">❌ Error del servidor (${response.status}): ${errorData.error || 'Error desconocido'}</td></tr>`;
        }

    } catch (error) {
        console.error('❌ [ATTENDANCE] Error de conexión:', error);
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">❌ Error de conexión. Verifique su conexión a internet.</td></tr>';
    }
}

// Display attendance table - Original style
function displayAttendanceTable(attendanceData) {
    const tbody = document.getElementById('attendance-tbody');
    if (!tbody) return;
    
    if (!attendanceData || attendanceData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">No hay datos de asistencia para mostrar</td></tr>';
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
    showAttendanceMessage(`✅ ${attendanceData.length} registros de asistencia cargados`, 'success');
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
            employeeSelect.innerHTML = '<option value="">Todos los empleados</option>';

            if (result.success && result.data && Array.isArray(result.data)) {
                result.data.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.user_id;
                    option.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.usuario;
                    employeeSelect.appendChild(option);
                });

                console.log(`✅ [ATTENDANCE] Cargados ${result.data.length} empleados en filtro`);
            } else {
                console.warn('⚠️ [ATTENDANCE] Formato inesperado de empleados:', result);
            }
        } else {
            console.error('❌ [ATTENDANCE] Error HTTP cargando empleados:', response.status);
        }
    } catch (error) {
        console.error('❌ [ATTENDANCE] Error cargando empleados:', error);

        // Fallback: mantener solo "Todos los empleados"
        employeeSelect.innerHTML = '<option value="">Todos los empleados</option>';
    }
}

// Export attendance data to Excel
function exportAttendanceData() {
    console.log('📊 [ATTENDANCE] Exportando datos a Excel...');
    showAttendanceMessage('📊 Función exportar Excel en desarrollo', 'info');
}

// Generate attendance report
function generateAttendanceReport() {
    console.log('📊 [ATTENDANCE] Generando reporte de asistencia...');
    
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const employee = document.getElementById('employeeFilter').value;
    const department = document.getElementById('deptFilter').value;
    
    console.log('📊 Filtros:', { dateFrom, dateTo, employee, department });
    
    showAttendanceMessage('📊 Generando reporte con filtros aplicados...', 'info');
    
    // Simulate report generation
    setTimeout(() => {
        showAttendanceMessage('✅ Reporte generado exitosamente (función en desarrollo)', 'success');
    }, 2000);
}

// Export attendance report
function exportAttendanceReport() {
    console.log('📤 [ATTENDANCE] Exportando reporte...');
    showAttendanceMessage('📤 Función exportar reporte en desarrollo', 'info');
}

// Show attendance charts - Updated with real functionality
function showAttendanceCharts() {
    console.log('📈 [ATTENDANCE] Mostrando gráficos de estadísticas...');
    const chartsSection = document.getElementById('charts-section');
    if (chartsSection) {
        chartsSection.scrollIntoView({ behavior: 'smooth' });
        showAttendanceMessage('📈 Gráfico de tendencias mostrado abajo', 'success');
    } else {
        showAttendanceMessage('⚠️ Gráficos disponibles al cargar el módulo', 'warning');
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
            deptSelect.innerHTML = '<option value="">Todos los departamentos</option>';
        }
    }
}

function populateAttendanceDepartmentFilter(departments) {
    const select = document.getElementById('deptFilter');
    if (!select) return;
    
    // Mantener la opción "Todos los departamentos"
    select.innerHTML = '<option value="">Todos los departamentos</option>';
    
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
function translateStatus(status) {
    const translations = {
        'present': 'Presente',
        'late': 'Tardanza',
        'absent': 'Ausente',
        'pending': 'Pendiente'
    };
    return translations[status?.toLowerCase()] || status || 'Sin datos';
}

function translateMethod(method) {
    const translations = {
        'face': 'Facial',
        'fingerprint': 'Huella',
        'pin': 'PIN',
        'manual': 'Manual',
        'mobile': 'Móvil',
        'iris': 'Iris',
        'voice': 'Voz'
    };
    return translations[method?.toLowerCase()] || method || 'Manual';
}

// Update displayAttendanceTable to handle real API data
function displayAttendanceTable(attendanceData, pagination) {
    const tbody = document.getElementById('attendance-tbody');
    if (!tbody) return;

    if (!attendanceData || attendanceData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">ℹ️ No hay registros de asistencia para mostrar</td></tr>';
        return;
    }

    tbody.innerHTML = '';

    attendanceData.forEach((record, index) => {
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
            : 'Usuario desconocido';
        const employeeId = record['User.employeeId'] || 'N/A';

        // Formatear fecha
        const date = record.date ? new Date(record.date).toLocaleDateString('es-AR') :
                     (record.checkInTime ? new Date(record.checkInTime).toLocaleDateString('es-AR') : '--');

        // Verificar si checkInTime y checkOutTime existen
        const checkInTime = record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--';
        const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--';
        const workingHours = record.workingHours ? `${record.workingHours}h` : '--';
        const status = translateStatus(record.status);
        const method = translateMethod(record.checkInMethod);
        const location = record.checkInLocation || 'No especificado';
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
    });

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

                showAttendanceMessage('📊 Estadísticas actualizadas desde base de datos', 'success');
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
    script.onerror = function() {
        console.error('❌ [ATTENDANCE] Error cargando Chart.js');
        showAttendanceMessage('❌ Error cargando librería de gráficos', 'error');
    };
    document.head.appendChild(script);
}

// Initialize the attendance statistics chart
function initializeAttendanceChart() {
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
                    label: 'Ausencias Diarias',
                    data: [],
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Llegadas Tarde',
                    data: [],
                    borderColor: '#ffa500',
                    backgroundColor: 'rgba(255, 165, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Presentes',
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
                    text: 'Tendencia de Asistencia - Últimos 30 Días (Datos Reales)',
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
                        text: 'Número de Empleados'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Fecha'
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

console.log('✅ [ATTENDANCE] Módulo attendance configurado con integración PostgreSQL y gráficos');

// ✅ HACER FUNCIÓN DISPONIBLE GLOBALMENTE
window.showAttendanceContent = showAttendanceContent;