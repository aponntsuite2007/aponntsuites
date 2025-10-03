// Terms Conditions Module - v4.0 PROGRESSIVE
console.log('📋 [TERMS-CONDITIONS] Módulo terms-conditions cargado');

// Terms functions - IMPORTANTE: nombre correcto sin mayúscula en 'conditions'
function showTermsconditionsContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="tab-content active" id="terms-conditions">
            <div class="card">
                <h2>📋 Gestión de Términos y Condiciones</h2>
                <p>Administre las versiones de términos y condiciones que los empleados deben aceptar para comunicaciones fehacientes.</p>
                
                <!-- Editor de Términos Actuales -->
                <div style="display: grid; grid-template-columns: 1fr 300px; gap: 30px; margin-bottom: 30px;">
                    <div>
                        <h3>📝 Editor de Términos</h3>
                        <div class="form-group">
                            <label for="terms-version">🔄 Versión:</label>
                            <input type="text" id="terms-version" placeholder="1.0" value="1.0">
                        </div>
                        
                        <div class="form-group">
                            <label for="terms-title">📄 Título:</label>
                            <input type="text" id="terms-title" placeholder="Términos y Condiciones de Comunicaciones Fehacientes" 
                                   value="Términos y Condiciones de Comunicaciones Fehacientes">
                        </div>
                        
                        <div class="form-group">
                            <label for="terms-content">📋 Contenido:</label>
                            <textarea id="terms-content" rows="15" style="width: 100%; font-family: monospace; font-size: 0.9em;">TÉRMINOS Y CONDICIONES PARA COMUNICACIONES FEHACIENTES

1. ACEPTACIÓN DE LOS TÉRMINOS
Al aceptar estos términos y condiciones, el empleado otorga su consentimiento expreso e informado para recibir comunicaciones oficiales de la empresa a través de los medios digitales seleccionados (SMS, WhatsApp, Email).

2. NATURALEZA FEHACIENTE DE LAS COMUNICACIONES  
El empleado reconoce que:
• Las comunicaciones enviadas por estos medios tendrán valor probatorio y validez legal
• Constituyen notificaciones formales y fehacientes según la legislación argentina
• Su recepción se considerará acreditada mediante acuses de entrega automáticos
• El no acceso o lectura no exime de responsabilidades legales

3. DATOS DE CONTACTO
El empleado se compromete a:
• Mantener actualizados sus datos de contacto (teléfono, WhatsApp, email)  
• Notificar inmediatamente cualquier cambio en los mismos
• Asegurar el acceso regular a los medios de comunicación autorizados
• Responder en los plazos establecidos para cada tipo de comunicación

4. TIPOS DE COMUNICACIONES
Se utilizarán estos canales para:
• Solicitudes de documentación médica
• Notificaciones de cumplimiento o incumplimiento
• Requerimientos de información adicional
• Comunicaciones relacionadas con ausencias médicas
• Otras comunicaciones laborales de carácter formal

5. RESPONSABILIDADES DEL EMPLEADO
El empleado declara que:
• Los medios de comunicación proporcionados son de uso personal y exclusivo
• Mantendrá la confidencialidad de las comunicaciones recibidas
• Acusará recibo cuando sea requerido
• Cumplirá con los plazos y requerimientos comunicados

6. REVOCACIÓN DEL CONSENTIMIENTO
El empleado puede:
• Revocar su consentimiento en cualquier momento mediante comunicación escrita
• La revocación no afectará la validez de comunicaciones anteriores
• Deberá proporcionar un medio alternativo de notificación fehaciente

7. VIGENCIA Y MODIFICACIONES
• Estos términos rigen desde su aceptación hasta su revocación
• La empresa puede modificarlos previa notificación fehaciente
• Las modificaciones requieren nueva aceptación expresa

8. LEGISLACIÓN APLICABLE
Estos términos se rigen por la legislación argentina, especialmente:
• Código Civil y Comercial de la Nación
• Ley de Protección de Datos Personales N° 25.326
• Ley de Contrato de Trabajo N° 20.744

FECHA: _______________
EMPLEADO: _______________
FIRMA: _______________</textarea>
                        </div>
                        
                        <div class="form-group">
                            <button onclick="saveTermsAndConditions()" class="btn btn-primary" style="width: 100%;">
                                💾 Guardar Términos y Condiciones
                            </button>
                        </div>
                    </div>
                    
                    <!-- Panel Lateral de Control -->
                    <div>
                        <h3>⚙️ Control de Versiones</h3>
                        
                        <div class="stat-card" style="margin-bottom: 20px;">
                            <div class="stat-number" id="current-version">1.0</div>
                            <div class="stat-label">📋 Versión Actual</div>
                        </div>
                        
                        <div class="stat-card" style="margin-bottom: 20px;">
                            <div class="stat-number" id="acceptance-count">0</div>
                            <div class="stat-label">✅ Aceptaciones</div>
                        </div>
                        
                        <div class="form-group">
                            <label>🎯 Acciones Rápidas:</label>
                            <button onclick="previewTerms()" class="btn btn-info btn-sm" style="width: 100%; margin-bottom: 10px;">
                                👁️ Vista Previa
                            </button>
                            <button onclick="generateTermsPDF()" class="btn btn-secondary btn-sm" style="width: 100%; margin-bottom: 10px;">
                                📄 Generar PDF
                            </button>
                            <button onclick="notifyAllEmployees()" class="btn btn-warning btn-sm" style="width: 100%; margin-bottom: 10px;">
                                📧 Notificar a Todos
                            </button>
                        </div>
                        
                        <div class="form-group">
                            <label>📊 Estadísticas:</label>
                            <div style="font-size: 0.9em; line-height: 1.6;">
                                <p>• <strong>Pendientes:</strong> <span id="pending-acceptances">3</span></p>
                                <p>• <strong>Completados:</strong> <span id="completed-acceptances">1</span></p>
                                <p>• <strong>Última actualización:</strong> <span id="last-update">Nunca</span></p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Historial de Aceptaciones -->
                <div class="card">
                    <h3>📊 Historial de Aceptaciones</h3>
                    
                    <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                        <button onclick="showAllAcceptances()" class="btn btn-primary btn-sm">👥 Ver Todos</button>
                        <button onclick="showPendingAcceptances()" class="btn btn-warning btn-sm">⏳ Pendientes</button>
                        <button onclick="showCompletedAcceptances()" class="btn btn-success btn-sm">✅ Completados</button>
                        <button onclick="exportAcceptanceData()" class="btn btn-info btn-sm">📊 Exportar</button>
                    </div>
                    
                    <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>👤 Empleado</th>
                                    <th>📋 Estado</th>
                                    <th>📅 Fecha Aceptación</th>
                                    <th>🔄 Versión</th>
                                    <th>💻 Dispositivo</th>
                                    <th>🌐 IP</th>
                                    <th>⚙️ Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="acceptance-tbody">
                                <tr>
                                    <td colspan="7" style="text-align: center; padding: 20px;">
                                        🔄 Cargando historial de aceptaciones...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- Modal para Vista Previa de Términos -->
            <div id="terms-preview-modal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000;">
                <div class="modal-content" style="background: white; margin: 2% auto; padding: 20px; border-radius: 10px; max-width: 800px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header" style="border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                        <h3>👁️ Vista Previa de Términos y Condiciones</h3>
                        <span onclick="closeTermsPreview()" style="font-size: 24px; cursor: pointer; color: #999;">&times;</span>
                    </div>
                    
                    <div class="modal-body">
                        <div id="terms-preview-content" style="white-space: pre-wrap; line-height: 1.6; font-size: 0.95em; background: #f8f9fa; padding: 20px; border-radius: 5px;">
                            <!-- Se llenará dinámicamente -->
                        </div>
                    </div>
                    
                    <div class="modal-footer" style="border-top: 1px solid #eee; padding-top: 15px; text-align: right; margin-top: 20px;">
                        <button onclick="closeTermsPreview()" class="btn btn-secondary" style="margin-right: 10px;">❌ Cerrar</button>
                        <button onclick="generateTermsPDF()" class="btn btn-primary">📄 Generar PDF</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    console.log('📋 [TERMS-CONDITIONS] Interfaz cargada');
    loadTermsData();
}

// Variables globales del módulo
let termsData = {
    version: '1.0',
    title: 'Términos y Condiciones de Comunicaciones Fehacientes',
    content: '',
    lastUpdate: null,
    acceptances: []
};

let acceptanceHistory = [];
let currentAcceptanceFilter = 'all';

// Cargar datos de términos y condiciones
async function loadTermsData() {
    try {
        showTermsMessage('🔄 Cargando datos de términos y condiciones...', 'info');
        
        // Simular datos de aceptaciones
        acceptanceHistory = [
            {
                id: 1,
                employeeName: 'Juan Pérez',
                employeeId: 1,
                termsVersion: '1.0',
                acceptedDate: '2025-01-15',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                status: 'accepted',
                device: 'Windows PC'
            },
            {
                id: 2,
                employeeName: 'María González',
                employeeId: 2,
                termsVersion: null,
                acceptedDate: null,
                ipAddress: null,
                userAgent: null,
                status: 'pending',
                device: null
            },
            {
                id: 3,
                employeeName: 'Carlos Rodriguez',
                employeeId: 3,
                termsVersion: null,
                acceptedDate: null,
                ipAddress: null,
                userAgent: null,
                status: 'pending',
                device: null
            },
            {
                id: 4,
                employeeName: 'Ana Martínez',
                employeeId: 4,
                termsVersion: null,
                acceptedDate: null,
                ipAddress: null,
                userAgent: null,
                status: 'pending',
                device: null
            },
            {
                id: 5,
                employeeName: 'Luis López',
                employeeId: 5,
                termsVersion: '1.0',
                acceptedDate: '2025-01-18',
                ipAddress: '192.168.1.105',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)',
                status: 'accepted',
                device: 'iPhone'
            }
        ];
        
        updateAcceptanceTable();
        updateTermsStats();
        showTermsMessage(`✅ ${acceptanceHistory.length} empleados cargados`, 'success');
        
    } catch (error) {
        showTermsMessage('❌ Error cargando términos: ' + error.message, 'error');
    }
}

// Actualizar tabla de aceptaciones
function updateAcceptanceTable(filter = 'all') {
    const tbody = document.getElementById('acceptance-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    currentAcceptanceFilter = filter;
    
    let filteredAcceptances = acceptanceHistory;
    
    if (filter === 'pending') {
        filteredAcceptances = acceptanceHistory.filter(acc => acc.status === 'pending');
    } else if (filter === 'completed') {
        filteredAcceptances = acceptanceHistory.filter(acc => acc.status === 'accepted');
    }
    
    if (filteredAcceptances.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #6c757d;">No hay aceptaciones para mostrar</td></tr>';
        return;
    }
    
    filteredAcceptances.forEach(acceptance => {
        const statusBadge = acceptance.status === 'accepted' ? 
            '<span class="status-badge success">✅ Aceptado</span>' :
            '<span class="status-badge warning">⏳ Pendiente</span>';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${acceptance.employeeName}</strong></td>
            <td>${statusBadge}</td>
            <td>${acceptance.acceptedDate || '-'}</td>
            <td>${acceptance.termsVersion || '-'}</td>
            <td>${acceptance.device || '-'}</td>
            <td style="font-family: monospace; font-size: 0.8em;">${acceptance.ipAddress || '-'}</td>
            <td>
                <button onclick="viewAcceptanceDetails(${acceptance.id})" class="btn-icon" style="background: #007bff; margin-right: 5px;">📋</button>
                ${acceptance.status === 'pending' ? 
                    '<button onclick="sendTermsReminder(' + acceptance.employeeId + ')" class="btn-icon" style="background: #ffc107;">📧</button>' : 
                    '<button onclick="revokeAcceptance(' + acceptance.id + ')" class="btn-icon" style="background: #dc3545;">🗑️</button>'
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Actualizar estadísticas de términos
function updateTermsStats() {
    const acceptedCount = acceptanceHistory.filter(acc => acc.status === 'accepted').length;
    const pendingCount = acceptanceHistory.filter(acc => acc.status === 'pending').length;
    
    document.getElementById('acceptance-count').textContent = acceptedCount;
    document.getElementById('pending-acceptances').textContent = pendingCount;
    document.getElementById('completed-acceptances').textContent = acceptedCount;
}

// Funciones de filtrado
function showAllAcceptances() {
    updateAcceptanceTable('all');
}

function showPendingAcceptances() {
    updateAcceptanceTable('pending');
}

function showCompletedAcceptances() {
    updateAcceptanceTable('completed');
}

// Guardar términos y condiciones
async function saveTermsAndConditions() {
    try {
        showTermsMessage('💾 Guardando términos y condiciones...', 'info');
        
        const version = document.getElementById('terms-version').value;
        const title = document.getElementById('terms-title').value;
        const content = document.getElementById('terms-content').value;
        
        if (!version || !title || !content) {
            showTermsMessage('❌ Todos los campos son obligatorios', 'error');
            return;
        }
        
        termsData = {
            version: version,
            title: title,
            content: content,
            lastUpdate: new Date().toISOString().split('T')[0]
        };
        
        // Actualizar estadísticas
        document.getElementById('current-version').textContent = version;
        document.getElementById('last-update').textContent = termsData.lastUpdate;
        
        showTermsMessage('✅ Términos y condiciones guardados exitosamente', 'success');
        
    } catch (error) {
        showTermsMessage('❌ Error guardando términos: ' + error.message, 'error');
    }
}

// Vista previa de términos
function previewTerms() {
    const title = document.getElementById('terms-title').value;
    const content = document.getElementById('terms-content').value;
    const version = document.getElementById('terms-version').value;
    
    const previewContent = document.getElementById('terms-preview-content');
    previewContent.innerHTML = `<h2>${title}</h2><p><strong>Versión:</strong> ${version}</p><hr><div>${content}</div>`;
    
    document.getElementById('terms-preview-modal').style.display = 'block';
}

// Cerrar vista previa
function closeTermsPreview() {
    document.getElementById('terms-preview-modal').style.display = 'none';
}

// Generar PDF de términos
function generateTermsPDF() {
    showTermsMessage('📄 Generando PDF de términos...', 'info');
    // En un entorno real, esto generaría un PDF
    setTimeout(() => {
        showTermsMessage('✅ PDF generado exitosamente', 'success');
    }, 2000);
}

// Notificar a todos los empleados
function notifyAllEmployees() {
    const pendingEmployees = acceptanceHistory.filter(acc => acc.status === 'pending');
    showTermsMessage(`📧 Enviando notificación a ${pendingEmployees.length} empleados...`, 'info');
    
    setTimeout(() => {
        showTermsMessage(`✅ Notificaciones enviadas a ${pendingEmployees.length} empleados`, 'success');
    }, 3000);
}

// Ver detalles de aceptación
function viewAcceptanceDetails(acceptanceId) {
    const acceptance = acceptanceHistory.find(acc => acc.id === acceptanceId);
    if (!acceptance) return;
    
    const detailsHtml = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 20000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin-top: 0; color: #2c3e50;">📋 Detalles de Aceptación</h3>
                <h4 style="color: #3498db; margin-bottom: 25px;">👤 ${acceptance.employeeName}</h4>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div>
                            <strong>📊 Estado:</strong><br>
                            ${acceptance.status === 'accepted' ? 
                                '<span style="color: #28a745;">✅ Aceptado</span>' : 
                                '<span style="color: #ffc107;">⏳ Pendiente</span>'
                            }
                        </div>
                        <div>
                            <strong>📅 Fecha:</strong><br>
                            ${acceptance.acceptedDate || 'No aceptado'}
                        </div>
                        <div>
                            <strong>🔄 Versión:</strong><br>
                            ${acceptance.termsVersion || 'N/A'}
                        </div>
                        <div>
                            <strong>💻 Dispositivo:</strong><br>
                            ${acceptance.device || 'No registrado'}
                        </div>
                    </div>
                </div>
                
                ${acceptance.ipAddress ? `
                    <div style="margin-bottom: 20px;">
                        <p><strong>🌐 Dirección IP:</strong> ${acceptance.ipAddress}</p>
                        <p><strong>🔧 User Agent:</strong><br><small style="font-family: monospace; background: #f1f1f1; padding: 5px; border-radius: 3px;">${acceptance.userAgent}</small></p>
                    </div>
                ` : ''}
                
                ${acceptance.status === 'pending' ? `
                    <div style="margin-bottom: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                        <strong>⚠️ Acción Requerida:</strong><br>
                        Este empleado aún no ha aceptado los términos y condiciones.
                    </div>
                ` : ''}
                
                <div style="text-align: center;">
                    ${acceptance.status === 'pending' ? 
                        `<button onclick="sendTermsReminder(${acceptance.employeeId}); this.parentElement.parentElement.parentElement.remove();" 
                                style="margin-right: 10px; padding: 10px 20px; background: #ffc107; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            📧 Enviar Recordatorio
                        </button>` : ''
                    }
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        ✅ Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', detailsHtml);
}

// Enviar recordatorio de términos
function sendTermsReminder(employeeId) {
    const employee = acceptanceHistory.find(acc => acc.employeeId === employeeId);
    if (!employee) return;
    
    showTermsMessage(`📧 Enviando recordatorio a ${employee.employeeName}...`, 'info');
    
    setTimeout(() => {
        showTermsMessage(`✅ Recordatorio enviado a ${employee.employeeName}`, 'success');
    }, 2000);
}

// Revocar aceptación
function revokeAcceptance(acceptanceId) {
    const acceptance = acceptanceHistory.find(acc => acc.id === acceptanceId);
    if (!acceptance) return;
    
    if (confirm(`¿Está seguro que desea revocar la aceptación de ${acceptance.employeeName}?`)) {
        acceptance.status = 'pending';
        acceptance.acceptedDate = null;
        acceptance.termsVersion = null;
        acceptance.ipAddress = null;
        acceptance.userAgent = null;
        acceptance.device = null;
        
        updateAcceptanceTable(currentAcceptanceFilter);
        updateTermsStats();
        
        showTermsMessage(`✅ Aceptación revocada para ${acceptance.employeeName}`, 'success');
    }
}

// Exportar datos de aceptaciones
function exportAcceptanceData() {
    try {
        const csvContent = [
            ['Empleado', 'Estado', 'Fecha Aceptación', 'Versión', 'Dispositivo', 'IP', 'User Agent'],
            ...acceptanceHistory.map(acc => [
                acc.employeeName,
                acc.status === 'accepted' ? 'Aceptado' : 'Pendiente',
                acc.acceptedDate || '',
                acc.termsVersion || '',
                acc.device || '',
                acc.ipAddress || '',
                acc.userAgent || ''
            ])
        ].map(row => row.join(',')).join('\\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aceptaciones_terminos_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showTermsMessage('✅ Datos de aceptaciones exportados exitosamente', 'success');
    } catch (error) {
        showTermsMessage('❌ Error exportando datos: ' + error.message, 'error');
    }
}

// Mostrar mensajes de términos
function showTermsMessage(message, type) {
    console.log(`📋 [TERMS-CONDITIONS] ${message}`);
    // En un entorno real, esto podría usar el sistema de notificaciones global
    if (window.progressiveAdmin && window.progressiveAdmin.updateLoadingStatus) {
        window.progressiveAdmin.updateLoadingStatus(message);
    }
}