// Legal Dashboard - Sistema de Comunicaciones Legales
// Basado en legislación argentina (LCT)

let legalDashboardData = {
    communications: [],
    communicationTypes: [],
    stats: {},
    currentPage: 1,
    itemsPerPage: 20,
    filters: {
        employee_id: '',
        type_id: '',
        status: '',
        date_from: '',
        date_to: ''
    }
};

async function showLegalDashboard() {
    try {
        console.log('🏛️ Cargando Dashboard Legal...');
        
        const container = document.getElementById('mainContent');
        if (!container) {
            console.error('Container mainContent no encontrado');
            return;
        }

        // Mostrar loading
        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>⚖️ Cargando Sistema Legal...</p>
            </div>
        `;

        // Cargar datos iniciales
        await Promise.all([
            loadCommunicationTypes(),
            loadDashboardStats(),
            loadCommunications()
        ]);

        // Renderizar dashboard
        renderLegalDashboard();

    } catch (error) {
        console.error('Error mostrando dashboard legal:', error);
        showError('Error cargando el dashboard legal');
    }
}

async function loadCommunicationTypes() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/v1/legal/communication-types', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            legalDashboardData.communicationTypes = data.data;
        }
    } catch (error) {
        console.error('Error cargando tipos de comunicación:', error);
    }
}

async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/v1/legal/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            legalDashboardData.stats = data.data;
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

async function loadCommunications() {
    try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({
            page: legalDashboardData.currentPage,
            limit: legalDashboardData.itemsPerPage,
            ...legalDashboardData.filters
        });

        const response = await fetch(`/api/v1/legal/communications?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            legalDashboardData.communications = data.data;
            legalDashboardData.pagination = data.pagination;
        }
    } catch (error) {
        console.error('Error cargando comunicaciones:', error);
    }
}

function renderLegalDashboard() {
    const container = document.getElementById('main-content');
    
    container.innerHTML = `
        <div class="legal-dashboard">
            <div class="dashboard-header">
                <h1>⚖️ Dashboard Legal</h1>
                <p>Sistema de Comunicaciones Legales - LCT Argentina</p>
                
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="showCreateCommunicationModal()">
                        <i class="fas fa-plus"></i> Nueva Comunicación
                    </button>
                    <button class="btn btn-secondary" onclick="showLegalReports()">
                        <i class="fas fa-chart-bar"></i> Informes
                    </button>
                </div>
            </div>

            <!-- Estadísticas Generales -->
            <div class="stats-grid">
                ${renderStatsCards()}
            </div>

            <!-- Filtros y Controles -->
            <div class="controls-section">
                <div class="filters-row">
                    ${renderFilters()}
                </div>
            </div>

            <!-- Tabla de Comunicaciones -->
            <div class="communications-section">
                <h3>📋 Comunicaciones Legales</h3>
                ${renderCommunicationsTable()}
            </div>

            <!-- Gráficos y Análisis -->
            <div class="analytics-section">
                <div class="row">
                    <div class="col-md-6">
                        ${renderCommunicationsByType()}
                    </div>
                    <div class="col-md-6">
                        ${renderMonthlyTrend()}
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal para Nueva Comunicación -->
        ${renderCreateCommunicationModal()}
    `;

    // Inicializar componentes
    initializeDashboardComponents();
}

function renderStatsCards() {
    const stats = legalDashboardData.stats.general || {};
    
    return `
        <div class="stat-card total">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
                <h3>${stats.total_communications || 0}</h3>
                <p>Total Comunicaciones</p>
            </div>
        </div>
        
        <div class="stat-card pending">
            <div class="stat-icon">📝</div>
            <div class="stat-content">
                <h3>${stats.draft_count || 0}</h3>
                <p>Borradores</p>
            </div>
        </div>
        
        <div class="stat-card sent">
            <div class="stat-icon">📤</div>
            <div class="stat-content">
                <h3>${stats.sent_count || 0}</h3>
                <p>Enviadas</p>
            </div>
        </div>
        
        <div class="stat-card delivered">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
                <h3>${stats.delivered_count || 0}</h3>
                <p>Entregadas</p>
            </div>
        </div>
        
        <div class="stat-card recent">
            <div class="stat-icon">🕒</div>
            <div class="stat-content">
                <h3>${stats.last_7_days || 0}</h3>
                <p>Últimos 7 días</p>
            </div>
        </div>
    `;
}

function renderFilters() {
    const typeOptions = legalDashboardData.communicationTypes.map(type => 
        `<option value="${type.id}">${type.name}</option>`
    ).join('');

    return `
        <div class="filter-group">
            <label>Tipo de Comunicación:</label>
            <select id="filter-type" onchange="updateFilter('type_id', this.value)">
                <option value="">Todos los tipos</option>
                ${typeOptions}
            </select>
        </div>
        
        <div class="filter-group">
            <label>Estado:</label>
            <select id="filter-status" onchange="updateFilter('status', this.value)">
                <option value="">Todos los estados</option>
                <option value="draft">Borrador</option>
                <option value="generated">Generado</option>
                <option value="sent">Enviado</option>
                <option value="delivered">Entregado</option>
                <option value="responded">Respondido</option>
                <option value="closed">Cerrado</option>
            </select>
        </div>
        
        <div class="filter-group">
            <label>Empleado ID:</label>
            <input type="text" id="filter-employee" placeholder="ID del empleado" 
                   onchange="updateFilter('employee_id', this.value)">
        </div>
        
        <div class="filter-group">
            <button class="btn btn-outline" onclick="clearFilters()">
                <i class="fas fa-times"></i> Limpiar Filtros
            </button>
            <button class="btn btn-primary" onclick="applyFilters()">
                <i class="fas fa-search"></i> Aplicar
            </button>
        </div>
    `;
}

function renderCommunicationsTable() {
    const communications = legalDashboardData.communications || [];
    
    if (communications.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-inbox fa-3x"></i>
                <h3>No hay comunicaciones</h3>
                <p>Crea una nueva comunicación legal para comenzar.</p>
            </div>
        `;
    }

    const rows = communications.map(comm => `
        <tr onclick="viewCommunication('${comm.id}')" class="clickable-row">
            <td>
                <div class="communication-info">
                    <strong>${comm.reference_number}</strong>
                    <br>
                    <small class="text-muted">${formatDate(comm.created_at)}</small>
                </div>
            </td>
            <td>
                <div class="employee-info">
                    <strong>${comm.employee_first_name} ${comm.employee_last_name}</strong>
                    <br>
                    <small>ID: ${comm.employee_code}</small>
                </div>
            </td>
            <td>
                <span class="communication-type ${comm.category}">
                    ${comm.type_name}
                </span>
                <br>
                <span class="severity ${comm.severity}">${comm.severity.toUpperCase()}</span>
            </td>
            <td>
                <span class="status-badge ${comm.status}">
                    ${getStatusText(comm.status)}
                </span>
            </td>
            <td>${comm.subject}</td>
            <td>
                <div class="action-buttons">
                    ${comm.pdf_path ? `
                        <button class="btn btn-sm btn-outline" onclick="downloadPDF('${comm.id}')" title="Descargar PDF">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-primary" onclick="editCommunication('${comm.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCommunication('${comm.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    return `
        <div class="table-container">
            <table class="communications-table">
                <thead>
                    <tr>
                        <th>Referencia</th>
                        <th>Empleado</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th>Asunto</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
        
        ${renderPagination()}
    `;
}

function renderCreateCommunicationModal() {
    const typeOptions = legalDashboardData.communicationTypes.map(type => `
        <option value="${type.id}" data-legal-basis="${type.legal_basis}">
            ${type.name} (${type.category.toUpperCase()})
        </option>
    `).join('');

    return `
        <div id="createCommunicationModal" class="modal">
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>📝 Nueva Comunicación Legal</h2>
                    <span class="close" onclick="closeModal('createCommunicationModal')">&times;</span>
                </div>
                
                <form id="createCommunicationForm" onsubmit="createCommunication(event)">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="employee-search">Empleado *</label>
                            <input type="text" id="employee-search" placeholder="Buscar por nombre o ID..." 
                                   oninput="searchEmployees(this.value)" required>
                            <div id="employee-results" class="search-results"></div>
                            <input type="hidden" id="selected-employee-id">
                        </div>
                        
                        <div class="form-group">
                            <label for="communication-type">Tipo de Comunicación *</label>
                            <select id="communication-type" onchange="updateLegalBasis()" required>
                                <option value="">Seleccionar tipo...</option>
                                ${typeOptions}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="legal-basis">Base Legal</label>
                        <textarea id="legal-basis" rows="2" readonly 
                                  placeholder="Se completará automáticamente según el tipo seleccionado"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="subject">Asunto *</label>
                        <input type="text" id="subject" placeholder="Asunto de la comunicación" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="description">Descripción</label>
                        <textarea id="description" rows="3" 
                                  placeholder="Descripción general de la comunicación"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="facts-description">Hechos que Motivan la Medida *</label>
                        <textarea id="facts-description" rows="4" required
                                  placeholder="Descripción detallada de los hechos que justifican esta comunicación legal..."></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="scheduled-date">Fecha Programada (opcional)</label>
                            <input type="datetime-local" id="scheduled-date">
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="generate-pdf" checked>
                                Generar PDF automáticamente
                            </label>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('createCommunicationModal')">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Crear Comunicación
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderCommunicationsByType() {
    const typeStats = legalDashboardData.stats.by_type || [];
    
    const data = typeStats.map(stat => ({
        name: stat.name,
        count: stat.count,
        severity: stat.severity
    }));

    return `
        <div class="chart-container">
            <h4>📊 Comunicaciones por Tipo</h4>
            <div id="typeChart" class="chart"></div>
        </div>
    `;
}

function renderMonthlyTrend() {
    return `
        <div class="chart-container">
            <h4>📈 Tendencia Mensual</h4>
            <div id="trendChart" class="chart"></div>
        </div>
    `;
}

function renderPagination() {
    const pagination = legalDashboardData.pagination;
    if (!pagination || pagination.totalPages <= 1) return '';

    let pages = '';
    for (let i = 1; i <= pagination.totalPages; i++) {
        pages += `
            <button class="page-btn ${i === pagination.page ? 'active' : ''}" 
                    onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }

    return `
        <div class="pagination">
            <button class="page-btn" onclick="changePage(${pagination.page - 1})" 
                    ${pagination.page <= 1 ? 'disabled' : ''}>
                ← Anterior
            </button>
            ${pages}
            <button class="page-btn" onclick="changePage(${pagination.page + 1})" 
                    ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>
                Siguiente →
            </button>
        </div>
    `;
}

// Event Handlers

async function showCreateCommunicationModal() {
    document.getElementById('createCommunicationModal').style.setProperty('display', 'block', 'important');
}

async function createCommunication(event) {
    event.preventDefault();
    
    const formData = {
        employee_id: document.getElementById('selected-employee-id').value,
        type_id: document.getElementById('communication-type').value,
        subject: document.getElementById('subject').value,
        description: document.getElementById('description').value,
        facts_description: document.getElementById('facts-description').value,
        scheduled_date: document.getElementById('scheduled-date').value || null,
        generate_pdf: document.getElementById('generate-pdf').checked
    };

    if (!formData.employee_id) {
        showError('Debe seleccionar un empleado');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/v1/legal/communications', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (result.success) {
            showSuccess('Comunicación legal creada exitosamente');
            closeModal('createCommunicationModal');
            await loadCommunications();
            renderLegalDashboard();
        } else {
            showError(result.error || 'Error creando comunicación');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión');
    }
}

async function searchEmployees(query) {
    if (!query || query.length < 2) {
        document.getElementById('employee-results').innerHTML = '';
        return;
    }

    try {
        // Esta función debería conectar con el endpoint de usuarios
        // Por ahora simulamos algunos resultados
        const results = `
            <div class="search-result-item" onclick="selectEmployee('emp-1', 'Juan Pérez', 'EMP001')">
                <strong>Juan Pérez</strong> - EMP001
            </div>
            <div class="search-result-item" onclick="selectEmployee('emp-2', 'María González', 'EMP002')">
                <strong>María González</strong> - EMP002
            </div>
        `;
        
        document.getElementById('employee-results').innerHTML = results;
    } catch (error) {
        console.error('Error buscando empleados:', error);
    }
}

function selectEmployee(id, name, code) {
    document.getElementById('employee-search').value = `${name} (${code})`;
    document.getElementById('selected-employee-id').value = id;
    document.getElementById('employee-results').innerHTML = '';
}

function updateLegalBasis() {
    const select = document.getElementById('communication-type');
    const selectedOption = select.options[select.selectedIndex];
    const legalBasis = selectedOption.getAttribute('data-legal-basis');
    
    document.getElementById('legal-basis').value = legalBasis || '';
}

async function updateFilter(filterName, value) {
    legalDashboardData.filters[filterName] = value;
}

async function applyFilters() {
    legalDashboardData.currentPage = 1;
    await loadCommunications();
    renderLegalDashboard();
}

function clearFilters() {
    legalDashboardData.filters = {
        employee_id: '',
        type_id: '',
        status: '',
        date_from: '',
        date_to: ''
    };
    
    // Reset form fields
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-employee').value = '';
    
    applyFilters();
}

async function changePage(page) {
    legalDashboardData.currentPage = page;
    await loadCommunications();
    renderLegalDashboard();
}

async function downloadPDF(communicationId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/v1/legal/communications/${communicationId}/pdf`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `comunicacion-legal-${communicationId}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            showError('Error descargando PDF');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión');
    }
}

function viewCommunication(id) {
    // TODO: Implementar modal de visualización detallada
    console.log('Ver comunicación:', id);
}

function editCommunication(id) {
    // TODO: Implementar modal de edición
    console.log('Editar comunicación:', id);
}

async function deleteCommunication(id) {
    if (!confirm('¿Está seguro de que desea eliminar esta comunicación?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/v1/legal/communications/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            showSuccess('Comunicación eliminada exitosamente');
            await loadCommunications();
            renderLegalDashboard();
        } else {
            showError('Error eliminando comunicación');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión');
    }
}

// Utility Functions

function initializeDashboardComponents() {
    // Inicializar gráficos si es necesario
    console.log('Dashboard legal inicializado');
}

function getStatusText(status) {
    const statusMap = {
        draft: 'Borrador',
        generated: 'Generado',
        sent: 'Enviado',
        delivered: 'Entregado',
        responded: 'Respondido',
        closed: 'Cerrado'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function closeModal(modalId) {
    document.getElementById(modalId).style.setProperty('display', 'none', 'important');
}

function showSuccess(message) {
    // TODO: Implementar sistema de notificaciones
    alert('✅ ' + message);
}

function showError(message) {
    // TODO: Implementar sistema de notificaciones
    alert('❌ ' + message);
}

// Exportar funciones globales
window.showLegalDashboard = showLegalDashboard;
window.showLegalDashboardContent = showLegalDashboard;