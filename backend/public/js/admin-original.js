// JavaScript Original Completo - Sistema Aponnt v3.3
console.log('🚀 [DEBUG] Panel de administración cargado - v3.3 ORIGINAL RESTORED');

// Configuración global
let savedNetworkConfig = {
    serverHost: 'localhost',  // FIX: Cambiado de 0.0.0.0 a localhost
    serverPort: '3001'
};

// Función para construir URLs de API (FIX APLICADO)
function getApiUrl(endpoint = '') {
    const host = getSelectedHost();
    const port = document.getElementById('server-port')?.value || '3001';
    return `http://${host}:${port}${endpoint}`;
}

// Obtener host seleccionado
function getSelectedHost() {
    return document.getElementById('server-host')?.value || 'localhost';
}

// === NAVEGACIÓN DE TABS ===
function switchTab(tabButton, tabId) {
    // Ocultar todos los contenidos
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Desactivar todos los tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Activar tab seleccionado
    tabButton.classList.add('active');
    document.getElementById(tabId).classList.add('active');
    
    // Cargar datos específicos del tab
    loadTabData(tabId);
}

function switchMedicalTab(tabButton, tabId) {
    // Ocultar todos los contenidos médicos
    document.querySelectorAll('#medical .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Desactivar todos los tabs médicos
    document.querySelectorAll('#medical .tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Activar tab médico seleccionado
    tabButton.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function loadTabData(tabId) {
    switch(tabId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'employees':
            // Se carga bajo demanda
            break;
        case 'attendance':
            loadAttendanceEmployees();
            break;
        case 'network':
            loadNetworkStatus();
            break;
        case 'system':
            loadSystemInfo();
            break;
    }
}

// === FUNCIONES DE SERVIDOR ===
async function loadServerInfo() {
    console.log('🔍 [DEBUG] loadServerInfo() iniciada');
    try {
        console.log('🔍 [DEBUG] Haciendo fetch a /health');
        const response = await fetch('/health');
        console.log('🔍 [DEBUG] Response status:', response.status, 'ok:', response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('🔍 [DEBUG] Data recibida:', data);
        
        // Actualizar dashboard
        const dashboardStatus = document.getElementById('server-status-dashboard');
        if (dashboardStatus) {
            dashboardStatus.className = 'alert alert-success';
            dashboardStatus.innerHTML = `✅ Servidor funcionando correctamente - ${data.status} - Uptime: ${Math.floor(data.uptime/60)} min`;
        }
        
        // Actualizar estadísticas
        updateServerStats(data);
        
        return data;
        
    } catch (error) {
        console.error('❌ [ERROR] Error en loadServerInfo():', error);
        const dashboardStatus = document.getElementById('server-status-dashboard');
        if (dashboardStatus) {
            dashboardStatus.className = 'alert alert-danger';
            dashboardStatus.innerHTML = `❌ Error: ${error.message}`;
        }
        throw error;
    }
}

function updateServerStats(data) {
    if (document.getElementById('server-uptime')) {
        document.getElementById('server-uptime').textContent = Math.floor(data.uptime/60) + 'm';
    }
    
    // Otros stats se cargarán con APIs específicas
}

// === FUNCIONES DE DASHBOARD ===
async function loadDashboardData() {
    console.log('🔍 [DEBUG] Cargando datos del dashboard');
    
    try {
        // Cargar información básica del servidor
        await loadServerInfo();
        
        // Cargar estadísticas
        await loadDashboardStats();
        
        // Cargar actividad reciente
        await loadRecentActivity();
        
        // Cargar notificaciones
        await loadNotifications();
        
    } catch (error) {
        console.error('❌ Error cargando dashboard:', error);
    }
}

async function loadDashboardStats() {
    try {
        // Simular carga de estadísticas (reemplazar con APIs reales)
        document.getElementById('total-employees-count').textContent = '45';
        document.getElementById('total-records-today').textContent = '127';
        document.getElementById('active-devices').textContent = '8';
        
    } catch (error) {
        console.error('❌ Error cargando estadísticas:', error);
    }
}

async function loadRecentActivity() {
    const container = document.getElementById('recent-activity');
    try {
        container.innerHTML = `
            <div class="timeline">
                <div class="timeline-item">
                    <div class="timeline-icon" style="background: #28a745;">✓</div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <h4 class="timeline-title">Registro de entrada</h4>
                            <span class="timeline-date">Hace 5 min</span>
                        </div>
                        <p class="timeline-description">Juan Pérez registró su entrada</p>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-icon" style="background: #007bff;">📊</div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <h4 class="timeline-title">Reporte generado</h4>
                            <span class="timeline-date">Hace 15 min</span>
                        </div>
                        <p class="timeline-description">Reporte mensual de asistencia</p>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<div class="alert alert-danger">Error cargando actividad</div>';
    }
}

async function loadNotifications() {
    const container = document.getElementById('notifications');
    try {
        container.innerHTML = `
            <div class="alert alert-warning">
                <strong>⚠️ Atención:</strong> 3 empleados sin registros hoy
            </div>
            <div class="alert alert-info">
                <strong>ℹ️ Info:</strong> Sistema funcionando correctamente
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<div class="alert alert-danger">Error cargando notificaciones</div>';
    }
}

// === FUNCIONES DE EMPLEADOS ===
async function loadEmployees() {
    const container = document.getElementById('employees-content');
    container.innerHTML = '<div class="loading">Cargando empleados...</div>';
    
    try {
        const response = await fetch(getApiUrl('/api/employees'));
        const employees = await response.json();
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Departamento</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${employees.map(emp => `
                        <tr>
                            <td>${emp.id}</td>
                            <td>${emp.name}</td>
                            <td>${emp.email}</td>
                            <td>${emp.department || 'N/A'}</td>
                            <td><span class="badge ${emp.active ? 'badge-success' : 'badge-danger'}">${emp.active ? 'Activo' : 'Inactivo'}</span></td>
                            <td>
                                <button class="btn btn-sm" onclick="editEmployee(${emp.id})">✏️</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${emp.id})">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        // Actualizar contador en dashboard
        if (document.getElementById('total-employees-count')) {
            document.getElementById('total-employees-count').textContent = employees.length;
        }
        
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">❌ Error cargando empleados: ${error.message}</div>`;
    }
}

// === FUNCIONES DE ASISTENCIA ===
async function loadAttendanceEmployees() {
    try {
        const response = await fetch(getApiUrl('/api/employees'));
        const employees = await response.json();
        
        const select = document.getElementById('attendance-employee');
        select.innerHTML = '<option value="">Todos los empleados</option>';
        employees.forEach(emp => {
            select.innerHTML += `<option value="${emp.id}">${emp.name}</option>`;
        });
        
    } catch (error) {
        console.error('Error cargando empleados para asistencia:', error);
    }
}

async function loadAttendance() {
    const container = document.getElementById('attendance-content');
    const date = document.getElementById('attendance-date').value;
    const employeeId = document.getElementById('attendance-employee').value;
    
    container.innerHTML = '<div class="loading">Cargando registros de asistencia...</div>';
    
    try {
        let url = getApiUrl('/api/attendance');
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        if (employeeId) params.append('employee_id', employeeId);
        if (params.toString()) url += '?' + params.toString();
        
        const response = await fetch(url);
        const records = await response.json();
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Empleado</th>
                        <th>Fecha</th>
                        <th>Entrada</th>
                        <th>Salida</th>
                        <th>Horas</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(record => `
                        <tr>
                            <td>${record.employee_name}</td>
                            <td>${new Date(record.date).toLocaleDateString()}</td>
                            <td>${record.check_in || '-'}</td>
                            <td>${record.check_out || '-'}</td>
                            <td>${record.hours || '-'}</td>
                            <td><span class="badge badge-${record.status === 'complete' ? 'success' : 'warning'}">${record.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">❌ Error: ${error.message}</div>`;
    }
}

// === FUNCIONES MÉDICAS (CON FIX APLICADO) ===
async function loadMedicalRecords() {
    const container = document.getElementById('medical-records-content');
    container.innerHTML = '<div class="loading">Cargando registros médicos...</div>';
    
    try {
        const response = await fetch(getApiUrl('/api/v1/medical/records'));  // FIX: usando getApiUrl()
        const records = await response.json();
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Empleado</th>
                        <th>Tipo</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(record => `
                        <tr>
                            <td>${record.id}</td>
                            <td>${record.employee_name}</td>
                            <td>${record.type}</td>
                            <td>${new Date(record.date).toLocaleDateString()}</td>
                            <td><span class="badge badge-${record.status === 'approved' ? 'success' : 'warning'}">${record.status}</span></td>
                            <td>
                                <button class="btn btn-sm" onclick="viewMedicalRecord(${record.id})">👁️</button>
                                <button class="btn btn-sm btn-warning" onclick="editMedicalRecord(${record.id})">✏️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">❌ Error: ${error.message}</div>`;
    }
}

async function loadMedicalCertificates() {
    const container = document.getElementById('medical-certificates-content');
    container.innerHTML = '<div class="loading">Cargando certificados médicos...</div>';
    
    try {
        const response = await fetch(getApiUrl('/api/v1/medical/certificates'));  // FIX: usando getApiUrl()
        const certificates = await response.json();
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Empleado</th>
                        <th>Tipo</th>
                        <th>Emisión</th>
                        <th>Vencimiento</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${certificates.map(cert => `
                        <tr>
                            <td>${cert.id}</td>
                            <td>${cert.employee_name}</td>
                            <td>${cert.type}</td>
                            <td>${new Date(cert.issue_date).toLocaleDateString()}</td>
                            <td>${new Date(cert.expiry_date).toLocaleDateString()}</td>
                            <td><span class="badge badge-${cert.valid ? 'success' : 'danger'}">${cert.valid ? 'Válido' : 'Vencido'}</span></td>
                            <td>
                                <button class="btn btn-sm" onclick="downloadCertificate(${cert.id})">📥</button>
                                <button class="btn btn-sm btn-warning" onclick="renewCertificate(${cert.id})">🔄</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">❌ Error: ${error.message}</div>`;
    }
}

// === FUNCIONES DE RED ===
async function loadNetworkStatus() {
    const container = document.getElementById('network-status');
    try {
        const response = await fetch('/health');
        const data = await response.json();
        
        container.className = 'alert alert-success';
        container.innerHTML = `✅ Conexión exitosa - Servidor: ${data.status} - Puerto: 3001`;
        
    } catch (error) {
        container.className = 'alert alert-danger';
        container.innerHTML = `❌ Error de conexión: ${error.message}`;
    }
}

async function testConnection() {
    const host = getSelectedHost();
    const port = document.getElementById('server-port').value;
    
    try {
        const response = await fetch(`http://${host}:${port}/health`);
        const data = await response.json();
        
        showMessage(`✅ Conexión exitosa!\nEstado: ${data.status}\nHost: ${host}:${port}`, 'success');
        
    } catch (error) {
        showMessage(`❌ Error de conexión:\n${error.message}\nHost: ${host}:${port}`, 'danger');
    }
}

function saveNetworkConfig() {
    const host = getSelectedHost();
    const port = document.getElementById('server-port').value;
    
    savedNetworkConfig = { serverHost: host, serverPort: port };
    localStorage.setItem('networkConfig', JSON.stringify(savedNetworkConfig));
    
    showMessage('✅ Configuración de red guardada correctamente', 'success');
}

// === FUNCIONES DE SISTEMA ===
async function loadSystemInfo() {
    const container = document.getElementById('system-info');
    container.innerHTML = '<div class="loading">Cargando información del sistema...</div>';
    
    try {
        const response = await fetch('/health');
        const data = await response.json();
        
        container.innerHTML = `
            <div class="grid grid-2">
                <div><strong>Estado:</strong> ${data.status}</div>
                <div><strong>Versión:</strong> ${data.version}</div>
                <div><strong>Entorno:</strong> ${data.environment}</div>
                <div><strong>Base de datos:</strong> ${data.database}</div>
                <div><strong>Uptime:</strong> ${Math.floor(data.uptime/60)} minutos</div>
                <div><strong>WebSocket:</strong> ${data.websocket} conexiones</div>
            </div>
        `;
        
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">❌ Error: ${error.message}</div>`;
    }
}

// === FUNCIONES DE UTILIDAD ===
function showMessage(message, type = 'info') {
    const container = document.getElementById('status-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type}`;
    messageDiv.innerHTML = message;
    
    container.appendChild(messageDiv);
    
    // Remover mensaje después de 5 segundos
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// === FUNCIONES PLACEHOLDER ===
function addEmployee() { showMessage('🚧 Función en desarrollo: Agregar Empleado', 'warning'); }
function editEmployee(id) { showMessage(`🚧 Función en desarrollo: Editar Empleado ${id}`, 'warning'); }
function deleteEmployee(id) { showMessage(`🚧 Función en desarrollo: Eliminar Empleado ${id}`, 'warning'); }
function exportEmployees() { showMessage('🚧 Función en desarrollo: Exportar Empleados', 'warning'); }
function generateReport() { showMessage('🚧 Función en desarrollo: Generar Reporte', 'warning'); }
function previewReport() { showMessage('🚧 Función en desarrollo: Vista Previa', 'warning'); }
function addMedicalRecord() { showMessage('🚧 Función en desarrollo: Nuevo Registro Médico', 'warning'); }
function addMedicalCertificate() { showMessage('🚧 Función en desarrollo: Nuevo Certificado', 'warning'); }
function generateMedicalReport() { showMessage('🚧 Función en desarrollo: Reporte Médico', 'warning'); }
function viewMedicalRecord(id) { showMessage(`🚧 Ver Registro Médico ${id}`, 'info'); }
function editMedicalRecord(id) { showMessage(`🚧 Editar Registro Médico ${id}`, 'warning'); }
function downloadCertificate(id) { showMessage(`🚧 Descargar Certificado ${id}`, 'info'); }
function renewCertificate(id) { showMessage(`🚧 Renovar Certificado ${id}`, 'warning'); }
function restartSystem() { showMessage('🚧 Función en desarrollo: Reiniciar Sistema', 'warning'); }
function shutdownSystem() { showMessage('🚧 Función en desarrollo: Apagar Sistema', 'warning'); }
function backupSystem() { showMessage('🚧 Función en desarrollo: Backup Sistema', 'warning'); }

// === INICIALIZACIÓN ===
window.onload = function() {
    console.log('🚀 [DEBUG] Window onload ejecutado - v3.3 ORIGINAL RESTORED');
    console.log('🔍 [DEBUG] Iniciando carga de datos inicial...');
    
    // Cargar configuración de red guardada
    const savedConfig = localStorage.getItem('networkConfig');
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (document.getElementById('server-host')) {
            document.getElementById('server-host').value = config.serverHost;
        }
        if (document.getElementById('server-port')) {
            document.getElementById('server-port').value = config.serverPort;
        }
        savedNetworkConfig = config;
    }
    
    // Cargar datos del dashboard por defecto
    loadDashboardData();
    
    console.log('🔍 [DEBUG] Inicialización completada');
};

console.log('🔍 [DEBUG] Script completamente cargado - v3.3 ORIGINAL RESTORED');