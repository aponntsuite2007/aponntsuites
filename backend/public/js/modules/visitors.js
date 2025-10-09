// Módulo de gestión de visitantes
// Sistema de Control de Accesos - Panel Empresa

// Variables globales (evitar redeclaración)
if (typeof window.visitorsList === 'undefined') {
    window.visitorsList = [];
}
if (typeof window.currentVisitor === 'undefined') {
    window.currentVisitor = null;
}
if (typeof window.departmentsList === 'undefined') {
    window.departmentsList = [];
}
if (typeof window.employeesList === 'undefined') {
    window.employeesList = [];
}

var visitorsList = window.visitorsList;
var currentVisitor = window.currentVisitor;
var departmentsList = window.departmentsList;
var employeesList = window.employeesList;

// CSS del módulo
const visitorsStyleElement = document.createElement('style');
visitorsStyleElement.id = 'visitors-module-styles';
visitorsStyleElement.textContent = `
    /* Estilos del módulo de visitantes */
    .visitors-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: flex-start !important;
        gap: 2rem !important;
        margin-bottom: 2rem !important;
    }

    .visitors-header-left {
        flex: 1 !important;
    }

    .visitors-header h2 {
        font-size: 1.5rem !important;
        font-weight: bold !important;
        margin: 0 0 0.5rem 0 !important;
    }

    .visitors-header p {
        color: #6c757d !important;
        margin: 0 !important;
    }

    .visitor-status-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .visitor-status-pending {
        background-color: #fff3cd;
        color: #856404;
    }

    .visitor-status-authorized {
        background-color: #d4edda;
        color: #155724;
    }

    .visitor-status-rejected {
        background-color: #f8d7da;
        color: #721c24;
    }

    .visitor-status-completed {
        background-color: #d1ecf1;
        color: #0c5460;
    }

    .visitor-card {
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        background: white;
    }

    .visitor-card:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .visitor-card-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 0.5rem;
    }

    .visitor-card-title {
        font-weight: bold;
        font-size: 1.1rem;
        color: #212529;
    }

    .visitor-card-body {
        color: #6c757d;
        font-size: 0.9rem;
    }

    .visitor-card-actions {
        margin-top: 0.75rem;
        display: flex;
        gap: 0.5rem;
    }

    .visitor-filters {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
    }

    .visitor-filters .row {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .visitor-filters .col {
        flex: 1;
        min-width: 200px;
    }

    #visitorModal .modal-dialog {
        max-width: 700px !important;
    }

    #visitorModal:not(.force-show) {
        display: none !important;
        opacity: 0 !important;
    }

    #visitorModal.force-show {
        display: block !important;
        opacity: 1 !important;
    }

    .visitor-detail-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        margin-top: 1rem;
    }

    .visitor-detail-item label {
        font-weight: 600;
        color: #495057;
        display: block;
        margin-bottom: 0.25rem;
        font-size: 0.9rem;
    }

    .visitor-detail-item span {
        color: #212529;
        display: block;
    }

    .visitor-timeline {
        position: relative;
        padding-left: 2rem;
        margin-top: 1.5rem;
    }

    .visitor-timeline::before {
        content: '';
        position: absolute;
        left: 0.5rem;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #dee2e6;
    }

    .visitor-timeline-item {
        position: relative;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
    }

    .visitor-timeline-item::before {
        content: '';
        position: absolute;
        left: -1.625rem;
        top: 0.25rem;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #28a745;
        border: 2px solid white;
    }

    .visitor-timeline-item.pending::before {
        background: #ffc107;
    }

    .visitor-timeline-item.rejected::before {
        background: #dc3545;
    }
`;
document.head.appendChild(visitorsStyleElement);

/**
 * Función principal para mostrar el contenido del módulo de visitantes
 */
async function showVisitorsContent() {
    const content = document.getElementById('content');

    content.innerHTML = `
        <div class="visitors-container">
            <div class="visitors-header">
                <div class="visitors-header-left">
                    <h2>👥 Gestión de Visitantes</h2>
                    <p>Control de visitas con autorización y tracking GPS</p>
                </div>
                <button class="btn btn-primary btn-sm" onclick="openNewVisitorModal()">
                    ➕ Nueva Visita
                </button>
            </div>

            <!-- Filtros -->
            <div class="visitor-filters">
                <div class="row">
                    <div class="col">
                        <label>Estado</label>
                        <select class="form-control" id="filterStatus" onchange="applyVisitorFilters()">
                            <option value="">Todos</option>
                            <option value="pending">Pendientes</option>
                            <option value="authorized">Autorizadas</option>
                            <option value="rejected">Rechazadas</option>
                            <option value="completed">Completadas</option>
                        </select>
                    </div>
                    <div class="col">
                        <label>Fecha</label>
                        <input type="date" class="form-control" id="filterDate" onchange="applyVisitorFilters()">
                    </div>
                    <div class="col">
                        <label>Buscar</label>
                        <input type="text" class="form-control" id="filterSearch" placeholder="DNI, nombre..." onkeyup="applyVisitorFilters()">
                    </div>
                </div>
            </div>

            <!-- Lista de visitantes -->
            <div id="visitorsListContainer">
                <div class="text-center p-4">
                    <div class="spinner-border" role="status">
                        <span class="sr-only">Cargando...</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de visitante -->
        <div class="modal fade" id="visitorModal" tabindex="-1" role="dialog">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="visitorModalTitle">Nueva Visita</h5>
                        <button type="button" class="close" onclick="closeVisitorModal()">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body" id="visitorModalBody">
                        <!-- Contenido dinámico -->
                    </div>
                    <div class="modal-footer" id="visitorModalFooter">
                        <!-- Botones dinámicos -->
                    </div>
                </div>
            </div>
        </div>
    `;

    // Cargar datos iniciales
    await loadVisitorsData();
}

/**
 * Cargar lista de visitantes
 */
async function loadVisitorsData() {
    try {
        const token = await getValidToken();

        const response = await fetch('/api/v1/visitors', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Error al cargar visitantes');

        const data = await response.json();
        window.visitorsList = data.visitors || [];
        visitorsList = window.visitorsList;

        renderVisitorsList(visitorsList);

    } catch (error) {
        console.error('Error cargando visitantes:', error);
        document.getElementById('visitorsListContainer').innerHTML = `
            <div class="alert alert-danger">
                Error al cargar visitantes: ${error.message}
            </div>
        `;
    }
}

/**
 * Renderizar lista de visitantes
 */
function renderVisitorsList(visitors) {
    const container = document.getElementById('visitorsListContainer');

    if (!visitors || visitors.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                No hay visitantes registrados
            </div>
        `;
        return;
    }

    const html = visitors.map(visitor => `
        <div class="visitor-card">
            <div class="visitor-card-header">
                <div>
                    <div class="visitor-card-title">${visitor.fullName || visitor.firstName + ' ' + visitor.lastName}</div>
                    <div style="font-size: 0.85rem; color: #6c757d;">DNI: ${visitor.dni}</div>
                </div>
                <span class="visitor-status-badge visitor-status-${visitor.authorizationStatus}">
                    ${getStatusLabel(visitor.authorizationStatus)}
                </span>
            </div>
            <div class="visitor-card-body">
                <div><strong>Motivo:</strong> ${visitor.visitReason || 'N/A'}</div>
                <div><strong>Fecha programada:</strong> ${formatDateTime(visitor.scheduledVisitDate)}</div>
                ${visitor.responsibleEmployee ? `<div><strong>Responsable:</strong> ${visitor.responsibleEmployee.first_name} ${visitor.responsibleEmployee.last_name}</div>` : ''}
                ${visitor.checkIn ? `<div><strong>Ingresó:</strong> ${formatDateTime(visitor.checkIn)}</div>` : ''}
                ${visitor.checkOut ? `<div><strong>Salió:</strong> ${formatDateTime(visitor.checkOut)}</div>` : ''}
            </div>
            <div class="visitor-card-actions">
                <button class="btn btn-sm btn-info" onclick="viewVisitor(${visitor.id})">
                    👁️ Ver
                </button>
                ${visitor.authorizationStatus === 'pending' ? `
                    <button class="btn btn-sm btn-success" onclick="authorizeVisitor(${visitor.id})">
                        ✅ Autorizar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="rejectVisitor(${visitor.id})">
                        ❌ Rechazar
                    </button>
                ` : ''}
                ${visitor.authorizationStatus === 'authorized' && !visitor.checkIn ? `
                    <button class="btn btn-sm btn-primary" onclick="checkInVisitor(${visitor.id})">
                        📥 Check-in
                    </button>
                ` : ''}
                ${visitor.checkIn && !visitor.checkOut ? `
                    <button class="btn btn-sm btn-warning" onclick="checkOutVisitor(${visitor.id})">
                        📤 Check-out
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

/**
 * Aplicar filtros
 */
function applyVisitorFilters() {
    const status = document.getElementById('filterStatus').value;
    const date = document.getElementById('filterDate').value;
    const search = document.getElementById('filterSearch').value.toLowerCase();

    let filtered = visitorsList;

    if (status) {
        filtered = filtered.filter(v => v.authorizationStatus === status);
    }

    if (date) {
        filtered = filtered.filter(v => {
            const visitDate = new Date(v.scheduledVisitDate).toISOString().split('T')[0];
            return visitDate === date;
        });
    }

    if (search) {
        filtered = filtered.filter(v =>
            v.dni.toLowerCase().includes(search) ||
            (v.fullName || v.firstName + ' ' + v.lastName).toLowerCase().includes(search)
        );
    }

    renderVisitorsList(filtered);
}

/**
 * Abrir modal para nueva visita
 */
async function openNewVisitorModal() {
    // Cargar departamentos y empleados
    await loadDepartmentsAndEmployees();

    document.getElementById('visitorModalTitle').textContent = 'Nueva Solicitud de Visita';
    document.getElementById('visitorModalBody').innerHTML = `
        <form id="visitorForm">
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>DNI *</label>
                        <input type="text" class="form-control" id="visitorDni" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Nombre *</label>
                        <input type="text" class="form-control" id="visitorFirstName" required>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Apellido *</label>
                        <input type="text" class="form-control" id="visitorLastName" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" class="form-control" id="visitorEmail">
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input type="text" class="form-control" id="visitorPhone">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Departamento que visita</label>
                        <select class="form-control" id="visitorDepartment">
                            <option value="">-- Seleccione --</option>
                            ${departmentsList.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>Empleado Responsable *</label>
                <select class="form-control" id="visitorResponsible" required>
                    <option value="">-- Seleccione --</option>
                    ${employeesList.map(e => `<option value="${e.id}">${e.first_name} ${e.last_name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Motivo de la Visita *</label>
                <textarea class="form-control" id="visitorReason" rows="3" required></textarea>
            </div>
            <div class="row">
                <div class="col-md-8">
                    <div class="form-group">
                        <label>Fecha y Hora Programada *</label>
                        <input type="datetime-local" class="form-control" id="visitorScheduledDate" required>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label>Duración (min)</label>
                        <input type="number" class="form-control" id="visitorDuration" value="60">
                    </div>
                </div>
            </div>
            <div class="form-group">
                <div class="custom-control custom-checkbox">
                    <input type="checkbox" class="custom-control-input" id="visitorGpsTracking">
                    <label class="custom-control-label" for="visitorGpsTracking">
                        Habilitar tracking GPS (requiere llavero GPS)
                    </label>
                </div>
            </div>
            <div class="form-group">
                <label>Notas adicionales</label>
                <textarea class="form-control" id="visitorNotes" rows="2"></textarea>
            </div>
        </form>
    `;

    document.getElementById('visitorModalFooter').innerHTML = `
        <button type="button" class="btn btn-secondary" onclick="closeVisitorModal()">Cancelar</button>
        <button type="button" class="btn btn-primary" onclick="saveVisitor()">Guardar</button>
    `;

    openVisitorModal();
}

/**
 * Ver visitante
 */
async function viewVisitor(visitorId) {
    try {
        const token = await getValidToken();

        const response = await fetch(`/api/v1/visitors/${visitorId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Error al cargar visitante');

        const result = await response.json();
        const visitor = result.data;

        document.getElementById('visitorModalTitle').textContent = `Visita de ${visitor.fullName}`;
        document.getElementById('visitorModalBody').innerHTML = `
            <div class="visitor-detail-grid">
                <div class="visitor-detail-item">
                    <label>DNI:</label>
                    <span>${visitor.dni}</span>
                </div>
                <div class="visitor-detail-item">
                    <label>Nombre Completo:</label>
                    <span>${visitor.fullName}</span>
                </div>
                <div class="visitor-detail-item">
                    <label>Email:</label>
                    <span>${visitor.email || 'N/A'}</span>
                </div>
                <div class="visitor-detail-item">
                    <label>Teléfono:</label>
                    <span>${visitor.phone || 'N/A'}</span>
                </div>
                <div class="visitor-detail-item" style="grid-column: 1 / -1;">
                    <label>Motivo de la Visita:</label>
                    <span>${visitor.visitReason}</span>
                </div>
                <div class="visitor-detail-item">
                    <label>Fecha Programada:</label>
                    <span>${formatDateTime(visitor.scheduledVisitDate)}</span>
                </div>
                <div class="visitor-detail-item">
                    <label>Duración Esperada:</label>
                    <span>${visitor.expectedDurationMinutes} minutos</span>
                </div>
                <div class="visitor-detail-item">
                    <label>Estado:</label>
                    <span class="visitor-status-badge visitor-status-${visitor.authorizationStatus}">
                        ${getStatusLabel(visitor.authorizationStatus)}
                    </span>
                </div>
                <div class="visitor-detail-item">
                    <label>Tracking GPS:</label>
                    <span>${visitor.gpsTrackingEnabled ? '✅ Habilitado' : '❌ Deshabilitado'}</span>
                </div>
            </div>

            ${visitor.notes ? `
                <div style="margin-top: 1rem;">
                    <label><strong>Notas:</strong></label>
                    <p>${visitor.notes}</p>
                </div>
            ` : ''}

            <!-- Timeline -->
            <div class="visitor-timeline">
                <div class="visitor-timeline-item">
                    <strong>Solicitud creada</strong><br>
                    <small>${formatDateTime(visitor.createdAt)}</small>
                </div>
                ${visitor.authorizedAt ? `
                    <div class="visitor-timeline-item ${visitor.authorizationStatus}">
                        <strong>${visitor.authorizationStatus === 'authorized' ? 'Autorizada' : 'Rechazada'}</strong><br>
                        <small>${formatDateTime(visitor.authorizedAt)}</small>
                        ${visitor.rejectionReason ? `<br><small>Motivo: ${visitor.rejectionReason}</small>` : ''}
                    </div>
                ` : ''}
                ${visitor.checkIn ? `
                    <div class="visitor-timeline-item">
                        <strong>Ingreso registrado</strong><br>
                        <small>${formatDateTime(visitor.checkIn)}</small>
                    </div>
                ` : ''}
                ${visitor.checkOut ? `
                    <div class="visitor-timeline-item">
                        <strong>Salida registrada</strong><br>
                        <small>${formatDateTime(visitor.checkOut)}</small>
                    </div>
                ` : ''}
            </div>
        `;

        document.getElementById('visitorModalFooter').innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="closeVisitorModal()">Cerrar</button>
        `;

        openVisitorModal();

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar visitante');
    }
}

/**
 * Autorizar visitante
 */
async function authorizeVisitor(visitorId) {
    const keyringId = prompt('ID del llavero GPS (opcional, dejar en blanco si no aplica):');

    if (confirm('¿Confirma que desea autorizar esta visita?')) {
        try {
            const token = await getValidToken();

            const response = await fetch(`/api/v1/visitors/${visitorId}/authorize`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'authorize',
                    keyringId: keyringId || null
                })
            });

            if (!response.ok) throw new Error('Error al autorizar visita');

            alert('Visita autorizada exitosamente');
            await loadVisitorsData();

        } catch (error) {
            console.error('Error:', error);
            alert('Error al autorizar visita');
        }
    }
}

/**
 * Rechazar visitante
 */
async function rejectVisitor(visitorId) {
    const reason = prompt('Motivo del rechazo:');

    if (reason && confirm('¿Confirma que desea rechazar esta visita?')) {
        try {
            const token = await getValidToken();

            const response = await fetch(`/api/v1/visitors/${visitorId}/authorize`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'reject',
                    rejectionReason: reason
                })
            });

            if (!response.ok) throw new Error('Error al rechazar visita');

            alert('Visita rechazada exitosamente');
            await loadVisitorsData();

        } catch (error) {
            console.error('Error:', error);
            alert('Error al rechazar visita');
        }
    }
}

/**
 * Check-in visitante
 */
async function checkInVisitor(visitorId) {
    if (confirm('¿Confirma el ingreso de este visitante?')) {
        try {
            const token = await getValidToken();

            const response = await fetch(`/api/v1/visitors/${visitorId}/check-in`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (!response.ok) throw new Error('Error al registrar check-in');

            alert('Ingreso registrado exitosamente');
            await loadVisitorsData();

        } catch (error) {
            console.error('Error:', error);
            alert('Error al registrar ingreso');
        }
    }
}

/**
 * Check-out visitante
 */
async function checkOutVisitor(visitorId) {
    if (confirm('¿Confirma la salida de este visitante?')) {
        try {
            const token = await getValidToken();

            const response = await fetch(`/api/v1/visitors/${visitorId}/check-out`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (!response.ok) throw new Error('Error al registrar check-out');

            alert('Salida registrada exitosamente');
            await loadVisitorsData();

        } catch (error) {
            console.error('Error:', error);
            alert('Error al registrar salida');
        }
    }
}

/**
 * Guardar nuevo visitante
 */
async function saveVisitor() {
    const visitorData = {
        dni: document.getElementById('visitorDni').value,
        firstName: document.getElementById('visitorFirstName').value,
        lastName: document.getElementById('visitorLastName').value,
        email: document.getElementById('visitorEmail').value || null,
        phone: document.getElementById('visitorPhone').value || null,
        visitReason: document.getElementById('visitorReason').value,
        visitingDepartmentId: document.getElementById('visitorDepartment').value || null,
        responsibleEmployeeId: parseInt(document.getElementById('visitorResponsible').value),
        scheduledVisitDate: document.getElementById('visitorScheduledDate').value,
        expectedDurationMinutes: parseInt(document.getElementById('visitorDuration').value) || 60,
        gpsTrackingEnabled: document.getElementById('visitorGpsTracking').checked,
        notes: document.getElementById('visitorNotes').value || null
    };

    if (!visitorData.dni || !visitorData.firstName || !visitorData.lastName || !visitorData.visitReason || !visitorData.responsibleEmployeeId || !visitorData.scheduledVisitDate) {
        alert('Por favor complete todos los campos requeridos');
        return;
    }

    try {
        const token = await getValidToken();

        const response = await fetch('/api/v1/visitors', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(visitorData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar visitante');
        }

        alert('Solicitud de visita creada exitosamente');
        closeVisitorModal();
        await loadVisitorsData();

    } catch (error) {
        console.error('Error guardando visitante:', error);
        alert('Error guardando visitante: ' + error.message);
    }
}

/**
 * Cargar departamentos y empleados
 */
async function loadDepartmentsAndEmployees() {
    try {
        const token = await getValidToken();

        // Cargar departamentos
        const deptResponse = await fetch('/api/v1/departments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (deptResponse.ok) {
            const deptData = await deptResponse.json();
            window.departmentsList = deptData.departments || [];
            departmentsList = window.departmentsList;
        }

        // Cargar empleados
        const empResponse = await fetch('/api/v1/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (empResponse.ok) {
            const empData = await empResponse.json();
            window.employeesList = empData.users || [];
            employeesList = window.employeesList;
        }

    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

/**
 * Abrir modal
 */
function openVisitorModal() {
    const modal = document.getElementById('visitorModal');
    modal.classList.add('force-show');
    modal.style.setProperty('display', 'block', 'important');
    document.body.classList.add('modal-open');

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.id = 'visitorModalBackdrop';
    document.body.appendChild(backdrop);
}

/**
 * Cerrar modal
 */
function closeVisitorModal() {
    const modal = document.getElementById('visitorModal');
    modal.classList.remove('force-show');
    modal.style.setProperty('display', 'none', 'important');
    document.body.classList.remove('modal-open');

    const backdrop = document.getElementById('visitorModalBackdrop');
    if (backdrop) {
        backdrop.remove();
    }
}

/**
 * Helper functions
 */
function getStatusLabel(status) {
    const labels = {
        'pending': 'Pendiente',
        'authorized': 'Autorizada',
        'rejected': 'Rechazada',
        'completed': 'Completada'
    };
    return labels[status] || status;
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function getValidToken() {
    let token = localStorage.getItem('authToken') || window.authToken;
    if (!token && typeof initializeAdmin === 'function') {
        await initializeAdmin();
        token = localStorage.getItem('authToken');
    }
    return token;
}

// Exportar función principal
if (typeof window !== 'undefined') {
    window.showVisitorsContent = showVisitorsContent;
}
