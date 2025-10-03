// Document Management Module - v4.0 PROGRESSIVE
console.log('📄 [DOCUMENT-MANAGEMENT] Módulo document-management cargado');

// Document management functions - IMPORTANTE: nombre correcto sin mayúscula en 'management'
function showDocumentManagementContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="tab-content active" id="document-management">
            <div class="card">
                <h2>📄 Gestión de Documentos Médicos</h2>
                <p>Sistema integral de documentos médicos - solicitudes y archivos recibidos desde aplicaciones móviles.</p>
                
                <!-- Subtabs -->
                <div class="medical-tabs-container" style="margin-bottom: 20px;">
                    <div style="display: flex; border-bottom: 2px solid #e9ecef;">
                        <button class="medical-tab active" onclick="showDocumentTab('requests', this)" style="padding: 12px 20px; border: none; background: #667eea; color: white; font-weight: 500; border-radius: 5px 5px 0 0; margin-right: 5px;">📋 Solicitudes (<span id="requests-count">0</span>)</button>
                        <button class="medical-tab" onclick="showDocumentTab('documents', this)" style="padding: 12px 20px; border: none; background: #f8f9fa; color: #6c757d; font-weight: 500; border-radius: 5px 5px 0 0; margin-right: 5px;">📁 Documentos (<span id="documents-count">0</span>)</button>
                        <button class="medical-tab" onclick="showDocumentTab('statistics', this)" style="padding: 12px 20px; border: none; background: #f8f9fa; color: #6c757d; font-weight: 500; border-radius: 5px 5px 0 0;">📊 Estadísticas</button>
                    </div>
                </div>
                
                <!-- Document Requests Tab -->
                <div id="document-requests" class="medical-tab-content active">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3>📋 Solicitudes de Documentos</h3>
                        <button class="btn btn-primary" onclick="showCreateDocumentRequestDialog()">
                            ➕ Nueva Solicitud
                        </button>
                    </div>
                    
                    <!-- Filtros -->
                    <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
                        <input type="text" id="document-search" placeholder="🔍 Buscar empleado..." onkeyup="filterDocumentRequests()" style="flex: 1; min-width: 200px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        
                        <select id="document-status-filter" onchange="filterDocumentRequests()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">📊 Todos los estados</option>
                            <option value="pending">⏳ Pendientes</option>
                            <option value="completed">✅ Completadas</option>
                            <option value="expired">❌ Vencidas</option>
                        </select>
                        <select id="document-type-filter" onchange="filterDocumentRequests()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">📋 Todos los tipos</option>
                            <option value="certificates">🏥 Certificados</option>
                            <option value="medical_reports">📋 Informes Médicos</option>
                            <option value="lab_results">🧪 Laboratorio</option>
                            <option value="prescriptions">💊 Recetas</option>
                        </select>
                        
                        <button class="btn btn-success" onclick="exportDocumentRequests()">📊 Exportar CSV</button>
                        <button class="btn btn-info" onclick="loadDocumentRequests()">🔄 Actualizar</button>
                    </div>
                    
                    <!-- Tabla de solicitudes -->
                    <div class="table-container" style="max-height: 600px; overflow-y: auto;">
                        <table class="data-table" id="document-requests-table">
                            <thead>
                                <tr>
                                    <th>👤 Empleado</th>
                                    <th>📋 Tipo</th>
                                    <th>📝 Descripción</th>
                                    <th>⏰ Creada</th>
                                    <th>📅 Vencimiento</th>
                                    <th>📊 Estado</th>
                                    <th>🔧 Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="document-requests-tbody">
                                <tr>
                                    <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                                        📋 Cargando solicitudes de documentos...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Documents Tab -->
                <div id="document-documents" class="medical-tab-content" style="display: none;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3>📁 Documentos Recibidos</h3>
                        <div>
                            <button class="btn btn-warning" onclick="showBulkActionsDialog()">⚡ Acciones Masivas</button>
                            <button class="btn btn-info" onclick="loadDocuments()">🔄 Actualizar</button>
                        </div>
                    </div>
                    
                    <!-- Filtros para documentos -->
                    <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
                        <input type="text" id="docs-search" placeholder="🔍 Buscar archivo..." onkeyup="filterDocuments()" style="flex: 1; min-width: 200px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        
                        <select id="docs-type-filter" onchange="filterDocuments()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">📋 Todos los tipos</option>
                            <option value="certificates">🏥 Certificados</option>
                            <option value="medical_reports">📋 Informes</option>
                            <option value="lab_results">🧪 Laboratorio</option>
                            <option value="prescriptions">💊 Recetas</option>
                        </select>
                        
                        <select id="docs-date-filter" onchange="filterDocuments()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">📅 Todas las fechas</option>
                            <option value="today">📅 Hoy</option>
                            <option value="week">📅 Esta semana</option>
                            <option value="month">📅 Este mes</option>
                        </select>
                        
                        <button class="btn btn-success" onclick="exportDocuments()">📊 Exportar</button>
                    </div>
                    
                    <!-- Estadísticas rápidas -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                        <div class="stat-card">
                            <div class="stat-number" id="total-documents">0</div>
                            <div class="stat-label">📁 Total Documentos</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="documents-today">0</div>
                            <div class="stat-label">📅 Hoy</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="pending-review">0</div>
                            <div class="stat-label">⏳ Pendientes</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="storage-used">0 MB</div>
                            <div class="stat-label">💾 Almacenamiento</div>
                        </div>
                    </div>
                    
                    <!-- Grid de documentos -->
                    <div id="documents-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                        <div style="text-align: center; padding: 40px; color: #666; grid-column: 1/-1;">
                            📁 Cargando documentos...
                        </div>
                    </div>
                </div>
                
                <!-- Statistics Tab -->
                <div id="document-statistics" class="medical-tab-content" style="display: none;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3>📊 Estadísticas y Reportes</h3>
                        <button class="btn btn-primary" onclick="generateDocumentReport()">📋 Generar Reporte</button>
                    </div>
                    
                    <!-- Estadísticas principales -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                        <div class="stat-card">
                            <div class="stat-number" id="total-requests-stat">0</div>
                            <div class="stat-label">📋 Total Solicitudes</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="completed-requests-stat">0</div>
                            <div class="stat-label">✅ Completadas</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="pending-requests-stat">0</div>
                            <div class="stat-label">⏳ Pendientes</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="expired-requests-stat">0</div>
                            <div class="stat-label">❌ Vencidas</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="avg-response-time">0 días</div>
                            <div class="stat-label">⏱️ Tiempo Promedio</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="completion-rate">0%</div>
                            <div class="stat-label">📈 Tasa de Completación</div>
                        </div>
                    </div>
                    
                    <!-- Gráficos y análisis -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="card" style="padding: 20px;">
                            <h4>📈 Solicitudes por Tipo</h4>
                            <div id="requests-by-type-chart" style="height: 300px; display: flex; align-items: center; justify-content: center; color: #6c757d;">
                                Cargando gráfico...
                            </div>
                        </div>
                        <div class="card" style="padding: 20px;">
                            <h4>⏰ Tendencia Semanal</h4>
                            <div id="weekly-trend-chart" style="height: 300px; display: flex; align-items: center; justify-content: center; color: #6c757d;">
                                Cargando gráfico...
                            </div>
                        </div>
                    </div>
                    
                    <!-- Top empleados -->
                    <div class="card" style="margin-top: 20px; padding: 20px;">
                        <h4>👥 Empleados con Más Solicitudes</h4>
                        <div id="top-employees-list" style="color: #6c757d;">
                            Cargando estadísticas de empleados...
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Modal para crear solicitud -->
        <div id="create-request-modal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000;">
            <div class="modal-content" style="background: white; margin: 5% auto; padding: 20px; border-radius: 10px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header" style="border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                    <h3>➕ Nueva Solicitud de Documento</h3>
                    <span onclick="closeCreateRequestModal()" style="font-size: 24px; cursor: pointer; color: #999;">&times;</span>
                </div>
                
                <div class="modal-body">
                    <form id="create-request-form">
                        <div class="form-group">
                            <label for="request-employee">👤 Empleado:</label>
                            <select id="request-employee" style="width: 100%;" required>
                                <option value="">Seleccionar empleado...</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="request-type">📋 Tipo de Documento:</label>
                            <select id="request-type" style="width: 100%;" required>
                                <option value="">Seleccionar tipo...</option>
                                <option value="certificates">🏥 Certificado Médico</option>
                                <option value="medical_reports">📋 Informe Médico</option>
                                <option value="lab_results">🧪 Resultados de Laboratorio</option>
                                <option value="prescriptions">💊 Receta Médica</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="request-description">📝 Descripción:</label>
                            <textarea id="request-description" rows="3" placeholder="Descripción detallada del documento solicitado..." style="width: 100%;" required></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="request-due-date">📅 Fecha límite:</label>
                            <input type="date" id="request-due-date" style="width: 100%;" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="request-priority">⚡ Prioridad:</label>
                            <select id="request-priority" style="width: 100%;" required>
                                <option value="normal">Normal</option>
                                <option value="high">Alta</option>
                                <option value="urgent">Urgente</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="request-notes">📋 Notas adicionales:</label>
                            <textarea id="request-notes" rows="2" placeholder="Notas o instrucciones especiales..." style="width: 100%;"></textarea>
                        </div>
                    </form>
                </div>
                
                <div class="modal-footer" style="border-top: 1px solid #eee; padding-top: 15px; text-align: right; margin-top: 20px;">
                    <button onclick="closeCreateRequestModal()" class="btn btn-secondary" style="margin-right: 10px;">❌ Cancelar</button>
                    <button onclick="createDocumentRequest()" class="btn btn-primary">✅ Crear Solicitud</button>
                </div>
            </div>
        </div>
    `;
    
    console.log('📄 [DOCUMENT-MANAGEMENT] Interfaz cargada');
    loadDocumentRequests();
}

// Variables globales del módulo
let documentRequests = [];
let documents = [];
let currentDocumentFilter = 'all';

// Tab management
function showDocumentTab(tabName, element) {
    // Update tab buttons
    document.querySelectorAll('.medical-tab').forEach(tab => {
        tab.style.background = '#f8f9fa';
        tab.style.color = '#6c757d';
    });
    element.style.background = '#667eea';
    element.style.color = 'white';
    
    // Update tab content
    document.querySelectorAll('.medical-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(`document-${tabName}`).style.display = 'block';
    
    // Load data based on tab
    switch(tabName) {
        case 'requests':
            loadDocumentRequests();
            break;
        case 'documents':
            loadDocuments();
            break;
        case 'statistics':
            loadStatistics();
            break;
    }
}

// Cargar solicitudes de documentos
async function loadDocumentRequests() {
    try {
        showDocumentMessage('🔄 Cargando solicitudes de documentos...', 'info');
        
        // Simular datos de solicitudes
        documentRequests = [
            {
                id: 'req-1',
                employeeName: 'Juan Pérez',
                employeeId: 1,
                type: 'certificates',
                description: 'Certificado médico para justificar ausencias',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                status: 'pending',
                priority: 'high',
                notes: 'Necesario para RRHH',
                requestedBy: 'Sistema Automático'
            },
            {
                id: 'req-2',
                employeeName: 'María González',
                employeeId: 2,
                type: 'lab_results',
                description: 'Resultados de análisis de sangre completo',
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                status: 'completed',
                priority: 'normal',
                notes: 'Revisión anual',
                requestedBy: 'Dr. García',
                completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                documentPath: 'uploads/lab-results-002.pdf'
            },
            {
                id: 'req-3',
                employeeName: 'Carlos Rodriguez',
                employeeId: 3,
                type: 'medical_reports',
                description: 'Informe médico post-cirugía de rodilla',
                createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                status: 'expired',
                priority: 'urgent',
                notes: 'Para evaluación de rehabilitación',
                requestedBy: 'Área Médica'
            },
            {
                id: 'req-4',
                employeeName: 'Ana Martínez',
                employeeId: 4,
                type: 'prescriptions',
                description: 'Receta para medicación crónica',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'pending',
                priority: 'normal',
                notes: 'Renovación mensual',
                requestedBy: 'Empleado'
            }
        ];
        
        updateDocumentRequestsTable();
        updateDocumentRequestsCount();
        showDocumentMessage(`✅ ${documentRequests.length} solicitudes cargadas`, 'success');
        
    } catch (error) {
        showDocumentMessage('❌ Error cargando solicitudes: ' + error.message, 'error');
    }
}

// Actualizar tabla de solicitudes
function updateDocumentRequestsTable() {
    const tbody = document.getElementById('document-requests-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (documentRequests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">No hay solicitudes de documentos</td></tr>';
        return;
    }
    
    const typeIcons = {
        'certificates': '🏥',
        'medical_reports': '📋',
        'lab_results': '🧪',
        'prescriptions': '💊'
    };
    
    const typeNames = {
        'certificates': 'Certificados',
        'medical_reports': 'Informes Médicos',
        'lab_results': 'Laboratorio',
        'prescriptions': 'Recetas'
    };
    
    const statusBadges = {
        'pending': '<span class="status-badge warning">⏳ Pendiente</span>',
        'completed': '<span class="status-badge success">✅ Completada</span>',
        'expired': '<span class="status-badge error">❌ Vencida</span>'
    };
    
    const priorityColors = {
        'normal': '#6c757d',
        'high': '#ffc107',
        'urgent': '#dc3545'
    };
    
    // Ordenar por fecha de creación (más recientes primero)
    const sortedRequests = [...documentRequests].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    sortedRequests.forEach(request => {
        const createdDate = new Date(request.createdAt).toLocaleDateString('es-ES');
        const dueDate = new Date(request.dueDate).toLocaleDateString('es-ES');
        const isOverdue = new Date(request.dueDate) < new Date() && request.status !== 'completed';
        
        const row = document.createElement('tr');
        if (isOverdue && request.status === 'pending') {
            row.style.backgroundColor = '#fff5f5';
        }
        
        row.innerHTML = `
            <td><strong>${request.employeeName}</strong></td>
            <td>${typeIcons[request.type]} ${typeNames[request.type]}</td>
            <td title="${request.description}">${request.description.length > 50 ? request.description.substring(0, 50) + '...' : request.description}</td>
            <td>${createdDate}</td>
            <td style="color: ${isOverdue ? '#dc3545' : '#6c757d'};">${dueDate}</td>
            <td>${statusBadges[request.status]}</td>
            <td>
                <button onclick="viewRequestDetails('${request.id}')" class="btn-icon" style="background: #17a2b8; margin-right: 5px;">👁️</button>
                ${request.status === 'pending' ? 
                    '<button onclick="markRequestCompleted(\'' + request.id + '\')" class="btn-icon" style="background: #28a745; margin-right: 5px;">✅</button>' :
                    ''
                }
                <button onclick="deleteRequest('${request.id}')" class="btn-icon" style="background: #dc3545;">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Actualizar contador de solicitudes
function updateDocumentRequestsCount() {
    const count = documentRequests.length;
    document.getElementById('requests-count').textContent = count;
}

// Cargar documentos
async function loadDocuments() {
    try {
        showDocumentMessage('🔄 Cargando documentos...', 'info');
        
        // Simular datos de documentos
        documents = [
            {
                id: 'doc-1',
                employeeName: 'María González',
                employeeId: 2,
                type: 'lab_results',
                fileName: 'lab-results-002.pdf',
                filePath: 'uploads/lab-results-002.pdf',
                fileSize: 245760, // bytes
                uploadDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                status: 'reviewed',
                requestId: 'req-2',
                notes: 'Valores normales en todos los parámetros'
            },
            {
                id: 'doc-2',
                employeeName: 'Luis López',
                employeeId: 5,
                type: 'certificates',
                fileName: 'certificado-medico-005.pdf',
                filePath: 'uploads/certificado-medico-005.pdf',
                fileSize: 156432,
                uploadDate: new Date(Date.now() - 3 * 60 * 60 * 1000),
                status: 'pending',
                requestId: null,
                notes: ''
            },
            {
                id: 'doc-3',
                employeeName: 'Ana Martínez',
                employeeId: 4,
                type: 'prescriptions',
                fileName: 'receta-medicacion-004.pdf',
                filePath: 'uploads/receta-medicacion-004.pdf',
                fileSize: 98304,
                uploadDate: new Date(Date.now() - 6 * 60 * 60 * 1000),
                status: 'reviewed',
                requestId: 'req-4',
                notes: 'Medicación aprobada para 30 días'
            }
        ];
        
        updateDocumentsGrid();
        updateDocumentsCount();
        updateDocumentsStats();
        showDocumentMessage(`✅ ${documents.length} documentos cargados`, 'success');
        
    } catch (error) {
        showDocumentMessage('❌ Error cargando documentos: ' + error.message, 'error');
    }
}

// Actualizar grid de documentos
function updateDocumentsGrid() {
    const grid = document.getElementById('documents-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (documents.length === 0) {
        grid.innerHTML = '<div style="text-align: center; padding: 40px; color: #666; grid-column: 1/-1;">No hay documentos disponibles</div>';
        return;
    }
    
    const typeIcons = {
        'certificates': '🏥',
        'medical_reports': '📋',
        'lab_results': '🧪',
        'prescriptions': '💊'
    };
    
    const statusColors = {
        'pending': '#ffc107',
        'reviewed': '#28a745',
        'rejected': '#dc3545'
    };
    
    documents.forEach(doc => {
        const uploadDate = new Date(doc.uploadDate).toLocaleDateString('es-ES');
        const fileSize = (doc.fileSize / 1024).toFixed(1) + ' KB';
        
        const docCard = document.createElement('div');
        docCard.className = 'document-card';
        docCard.style.cssText = `
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
            cursor: pointer;
        `;
        
        docCard.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 15px;">${typeIcons[doc.type]}</div>
            <h5 style="margin: 0 0 10px 0; color: #2c3e50;">${doc.fileName}</h5>
            <p style="margin: 0 0 5px 0; color: #6c757d; font-size: 0.9rem;"><strong>${doc.employeeName}</strong></p>
            <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 0.8rem;">${uploadDate} • ${fileSize}</p>
            <span style="background: ${statusColors[doc.status]}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 500;">
                ${doc.status === 'pending' ? '⏳ Pendiente' : doc.status === 'reviewed' ? '✅ Revisado' : '❌ Rechazado'}
            </span>
            <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center;">
                <button onclick="downloadDocument('${doc.id}')" class="btn-icon" style="background: #17a2b8; padding: 8px 12px; font-size: 0.8rem;">📥 Descargar</button>
                <button onclick="viewDocument('${doc.id}')" class="btn-icon" style="background: #28a745; padding: 8px 12px; font-size: 0.8rem;">👁️ Ver</button>
            </div>
        `;
        
        docCard.onmouseenter = () => docCard.style.transform = 'translateY(-5px)';
        docCard.onmouseleave = () => docCard.style.transform = 'translateY(0)';
        
        grid.appendChild(docCard);
    });
}

// Actualizar contador de documentos
function updateDocumentsCount() {
    const count = documents.length;
    document.getElementById('documents-count').textContent = count;
}

// Actualizar estadísticas de documentos
function updateDocumentsStats() {
    const total = documents.length;
    const today = documents.filter(doc => {
        const docDate = new Date(doc.uploadDate).toDateString();
        const todayDate = new Date().toDateString();
        return docDate === todayDate;
    }).length;
    const pending = documents.filter(doc => doc.status === 'pending').length;
    const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, 0);
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(1);
    
    document.getElementById('total-documents').textContent = total;
    document.getElementById('documents-today').textContent = today;
    document.getElementById('pending-review').textContent = pending;
    document.getElementById('storage-used').textContent = sizeInMB + ' MB';
}

// Mostrar modal de crear solicitud
function showCreateDocumentRequestDialog() {
    // Llenar empleados
    const employeeSelect = document.getElementById('request-employee');
    employeeSelect.innerHTML = '<option value="">Seleccionar empleado...</option>';
    
    // Simular lista de empleados
    const employees = [
        { id: 1, name: 'Juan Pérez' },
        { id: 2, name: 'María González' },
        { id: 3, name: 'Carlos Rodriguez' },
        { id: 4, name: 'Ana Martínez' },
        { id: 5, name: 'Luis López' }
    ];
    
    employees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = emp.name;
        employeeSelect.appendChild(option);
    });
    
    // Configurar fecha mínima (mañana)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('request-due-date').min = tomorrow.toISOString().split('T')[0];
    
    document.getElementById('create-request-modal').style.display = 'block';
}

// Cerrar modal de crear solicitud
function closeCreateRequestModal() {
    document.getElementById('create-request-modal').style.display = 'none';
    document.getElementById('create-request-form').reset();
}

// Crear solicitud de documento
function createDocumentRequest() {
    const employeeId = document.getElementById('request-employee').value;
    const type = document.getElementById('request-type').value;
    const description = document.getElementById('request-description').value;
    const dueDate = document.getElementById('request-due-date').value;
    const priority = document.getElementById('request-priority').value;
    const notes = document.getElementById('request-notes').value;
    
    if (!employeeId || !type || !description || !dueDate) {
        showDocumentMessage('❌ Todos los campos obligatorios deben ser completados', 'error');
        return;
    }
    
    const employees = [
        { id: 1, name: 'Juan Pérez' },
        { id: 2, name: 'María González' },
        { id: 3, name: 'Carlos Rodriguez' },
        { id: 4, name: 'Ana Martínez' },
        { id: 5, name: 'Luis López' }
    ];
    
    const employee = employees.find(emp => emp.id == employeeId);
    
    const newRequest = {
        id: 'req-' + Date.now(),
        employeeName: employee.name,
        employeeId: parseInt(employeeId),
        type: type,
        description: description,
        createdAt: new Date(),
        dueDate: new Date(dueDate),
        status: 'pending',
        priority: priority,
        notes: notes,
        requestedBy: 'Admin Sistema'
    };
    
    documentRequests.unshift(newRequest);
    updateDocumentRequestsTable();
    updateDocumentRequestsCount();
    closeCreateRequestModal();
    
    showDocumentMessage(`✅ Solicitud creada para ${employee.name}`, 'success');
}

// Filtrar solicitudes
function filterDocumentRequests() {
    // Implementar lógica de filtrado basada en los selectores
    updateDocumentRequestsTable();
}

// Filtrar documentos
function filterDocuments() {
    // Implementar lógica de filtrado basada en los selectores
    updateDocumentsGrid();
}

// Exportar solicitudes
function exportDocumentRequests() {
    try {
        const csvContent = [
            ['Empleado', 'Tipo', 'Descripción', 'Creada', 'Vencimiento', 'Estado', 'Prioridad'],
            ...documentRequests.map(req => [
                req.employeeName,
                req.type,
                req.description,
                new Date(req.createdAt).toLocaleDateString('es-ES'),
                new Date(req.dueDate).toLocaleDateString('es-ES'),
                req.status,
                req.priority
            ])
        ].map(row => row.join(',')).join('\\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `solicitudes_documentos_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showDocumentMessage('✅ Solicitudes exportadas exitosamente', 'success');
    } catch (error) {
        showDocumentMessage('❌ Error exportando: ' + error.message, 'error');
    }
}

// Ver detalles de solicitud
function viewRequestDetails(requestId) {
    const request = documentRequests.find(req => req.id === requestId);
    if (!request) return;
    
    alert(`Detalles de solicitud:\\n\\nEmpleado: ${request.employeeName}\\nTipo: ${request.type}\\nDescripción: ${request.description}\\nEstado: ${request.status}`);
}

// Marcar solicitud como completada
function markRequestCompleted(requestId) {
    const request = documentRequests.find(req => req.id === requestId);
    if (!request) return;
    
    request.status = 'completed';
    request.completedAt = new Date();
    updateDocumentRequestsTable();
    showDocumentMessage(`✅ Solicitud de ${request.employeeName} marcada como completada`, 'success');
}

// Eliminar solicitud
function deleteRequest(requestId) {
    const request = documentRequests.find(req => req.id === requestId);
    if (!request) return;
    
    if (confirm(`¿Está seguro que desea eliminar la solicitud de ${request.employeeName}?`)) {
        documentRequests = documentRequests.filter(req => req.id !== requestId);
        updateDocumentRequestsTable();
        updateDocumentRequestsCount();
        showDocumentMessage(`✅ Solicitud eliminada`, 'success');
    }
}

// Descargar documento
function downloadDocument(docId) {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    
    showDocumentMessage(`📥 Descargando ${doc.fileName}...`, 'info');
    // Simular descarga
    setTimeout(() => {
        showDocumentMessage('✅ Descarga completada', 'success');
    }, 1500);
}

// Ver documento
function viewDocument(docId) {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    
    showDocumentMessage(`👁️ Abriendo ${doc.fileName} en nueva ventana...`, 'info');
}

// Cargar estadísticas
function loadStatistics() {
    // Simular carga de estadísticas
    setTimeout(() => {
        const totalReq = documentRequests.length;
        const completed = documentRequests.filter(req => req.status === 'completed').length;
        const pending = documentRequests.filter(req => req.status === 'pending').length;
        const expired = documentRequests.filter(req => req.status === 'expired').length;
        
        document.getElementById('total-requests-stat').textContent = totalReq;
        document.getElementById('completed-requests-stat').textContent = completed;
        document.getElementById('pending-requests-stat').textContent = pending;
        document.getElementById('expired-requests-stat').textContent = expired;
        document.getElementById('avg-response-time').textContent = '3.2 días';
        document.getElementById('completion-rate').textContent = totalReq > 0 ? Math.round((completed / totalReq) * 100) + '%' : '0%';
        
        // Simular gráficos
        document.getElementById('requests-by-type-chart').innerHTML = `
            <div style="text-align: center;">
                <p>🏥 Certificados: 45%</p>
                <p>📋 Informes: 25%</p>
                <p>🧪 Laboratorio: 20%</p>
                <p>💊 Recetas: 10%</p>
            </div>
        `;
        
        document.getElementById('weekly-trend-chart').innerHTML = `
            <div style="text-align: center;">
                <p>📈 Tendencia ascendente</p>
                <p>Promedio: 2.5 solicitudes/día</p>
            </div>
        `;
        
        document.getElementById('top-employees-list').innerHTML = `
            <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                    <span>👤 Juan Pérez</span>
                    <span><strong>8 solicitudes</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                    <span>👤 María González</span>
                    <span><strong>6 solicitudes</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                    <span>👤 Carlos Rodriguez</span>
                    <span><strong>4 solicitudes</strong></span>
                </div>
            </div>
        `;
    }, 1000);
}

// Mostrar mensajes
function showDocumentMessage(message, type) {
    console.log(`📄 [DOCUMENT-MANAGEMENT] ${message}`);
    if (window.progressiveAdmin && window.progressiveAdmin.updateLoadingStatus) {
        window.progressiveAdmin.updateLoadingStatus(message);
    }
}

// Export main function
window.showDocumentManagementContent = showDocumentManagementContent;

console.log('✅ [DOCUMENT-MANAGEMENT] Módulo configurado y función exportada');