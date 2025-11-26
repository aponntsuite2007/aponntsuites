// Attendance Module - v6.0 PLUG & PLAY SYSTEM (Pattern: users.js)
console.log('📋 [ATTENDANCE] Módulo attendance v6.0 - PLUG & PLAY SYSTEM INTEGRADO');

// Global variables for attendance
let allAttendances = [];
let filteredAttendances = [];

// 📄 PAGINATION VARIABLES
let currentPage = 1;
let itemsPerPage = 25; // Default: 25 attendance records per page
let totalPages = 1;

// Attendance functions
async function showAttendanceContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;

    content.innerHTML = `
        <div class="tab-content active" id="attendance">
            <div class="card">
                <h2>📋 Control de Asistencias</h2>
                <div class="quick-actions">
                    <button class="btn btn-primary" onclick="showAddAttendance()">➕ Agregar Asistencia</button>
                    <button class="btn btn-success" onclick="loadAttendances()">📋 Lista de Asistencias</button>
                    <button class="btn btn-warning" onclick="showAttendanceStats()">📊 Actualizar Estadísticas</button>
                    <button class="btn btn-info" onclick="exportAttendances()">📤 Exportar CSV</button>
                </div>

                <div id="attendances-container">
                    <h3 data-translate="attendance.list_title">📋 Lista de Asistencias</h3>

                    <!-- Campos de búsqueda -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #dee2e6;">
                        <div style="display: flex; gap: 15px; align-items: flex-end; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 200px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #495057;">🔍 Buscar por Empleado:</label>
                                <input type="text" id="searchEmployee" placeholder="Buscar por nombre de empleado..."
                                       style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px;"
                                       onkeyup="filterAttendances()" />
                            </div>
                            <div style="flex: 1; min-width: 200px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #495057;">📅 Buscar por Fecha:</label>
                                <input type="date" id="searchDate"
                                       style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px;"
                                       onchange="filterAttendances()" />
                            </div>
                            <div style="display: flex; flex-direction: column; justify-content: flex-end; gap: 5px; align-items: center; height: 60px;">
                                <button class="btn btn-sm btn-secondary" onclick="clearAttendanceFilters()" title="Limpiar filtros" style="margin-top: 8px;">🧹 Limpiar</button>
                                <span id="filterResultsAttendance" style="font-size: 12px; color: #6c757d; white-space: nowrap;"></span>
                            </div>
                        </div>
                    </div>

                    <!-- 📄 PAGINATION CONTROLS TOP -->
                    <div id="pagination-top" style="display: none; margin: 15px 0;"></div>

                    <div id="attendances-list" class="server-info">
                        Presiona "Lista de Asistencias" para cargar...
                    </div>

                    <!-- 📄 PAGINATION CONTROLS BOTTOM -->
                    <div id="pagination-bottom" style="display: none; margin: 15px 0;"></div>
                </div>

                <div id="attendance-stats" class="stats-grid" style="margin-top: 20px;">
                    <div class="stat-item">
                        <div class="stat-value" id="total-attendances">--</div>
                        <div class="stat-label">Asistencias Totales</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="present-count">--</div>
                        <div class="stat-label">Presentes Hoy</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="late-count">--</div>
                        <div class="stat-label">Llegadas Tarde</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="absent-count">--</div>
                        <div class="stat-label">Ausentes Hoy</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Auto load attendance stats on tab show
    setTimeout(showAttendanceStats, 300);

    // 🔥 AUTO-LOAD attendances table when tab opens
    setTimeout(async () => {
        await loadAttendances();
    }, 500);
}

// Load attendances list
async function loadAttendances() {
    console.log('📋 [ATTENDANCE] Cargando lista de asistencias...');

    const listContainer = document.getElementById('attendances-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<p>⏳ Cargando asistencias...</p>';

    try {
        const response = await fetch('/api/v1/attendance', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        allAttendances = data.attendances || data.data || [];

        console.log(`✅ [ATTENDANCE] ${allAttendances.length} asistencias cargadas`);

        // Reset to page 1
        currentPage = 1;

        displayAttendancesTable(allAttendances);

    } catch (error) {
        console.error('❌ [ATTENDANCE] Error cargando asistencias:', error);
        listContainer.innerHTML = `<p style="color: red;">❌ Error al cargar asistencias: ${error.message}</p>`;
    }
}

// Display attendances table with pagination
function displayAttendancesTable(attendances) {
    const listContainer = document.getElementById('attendances-list');
    if (!listContainer) return;

    if (!attendances || attendances.length === 0) {
        listContainer.innerHTML = '<p>No hay asistencias registradas</p>';
        hidePaginationControls();
        return;
    }

    // 📄 CALCULATE PAGINATION
    totalPages = Math.ceil(attendances.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedAttendances = attendances.slice(startIndex, endIndex);

    // Build table HTML
    let tableHTML = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>👤 Empleado</th>
                        <th>🏷️ Legajo</th>
                        <th>📅 Fecha</th>
                        <th>🕐 Hora Entrada</th>
                        <th>🕐 Hora Salida</th>
                        <th>⏱️ Horas Trabajadas</th>
                        <th>📍 Estado</th>
                        <th>⚙️ Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    paginatedAttendances.forEach(att => {
        const statusClass = att.status === 'present' ? 'success' : att.status === 'late' ? 'warning' : 'error';
        const statusText = att.status === 'present' ? '✅ Presente' : att.status === 'late' ? '⚠️ Tarde' : '❌ Ausente';

        const hoursWorked = att.hours_worked || calculateHoursWorked(att.check_in, att.check_out);

        tableHTML += `
            <tr>
                <td><strong>${att.user_name || att.employee_name || 'N/A'}</strong></td>
                <td>${att.legajo || att.employee_id || 'N/A'}</td>
                <td>${formatDate(att.date || att.attendance_date)}</td>
                <td>${formatTime(att.check_in || att.time_in)}</td>
                <td>${formatTime(att.check_out || att.time_out)}</td>
                <td>${hoursWorked}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td style="white-space: nowrap;">
                    <button class="btn-mini btn-info" onclick="viewAttendance('${att.id || att.attendance_id}')" title="Ver">👁️</button>
                    <button class="btn-mini btn-warning" onclick="editAttendance('${att.id || att.attendance_id}')" title="Editar">✏️</button>
                    <button class="btn-mini btn-danger" onclick="deleteAttendance('${att.id || att.attendance_id}')" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    listContainer.innerHTML = tableHTML;

    // 📄 RENDER PAGINATION CONTROLS
    renderPaginationControls(attendances.length, startIndex, Math.min(endIndex, attendances.length));
}

// 📄 ========== PAGINATION FUNCTIONS ==========

function renderPaginationControls(totalAttendances, startIndex, endIndex) {
    const paginationHTML = createPaginationHTML(totalAttendances, startIndex, endIndex);

    const topControls = document.getElementById('pagination-top');
    const bottomControls = document.getElementById('pagination-bottom');

    if (topControls) {
        topControls.innerHTML = paginationHTML;
        topControls.style.display = 'block';
    }

    if (bottomControls) {
        bottomControls.innerHTML = paginationHTML;
        bottomControls.style.display = 'block';
    }
}

function createPaginationHTML(totalAttendances, startIndex, endIndex) {
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    let pagesHTML = '';
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'background: #2c5aa0; color: white; font-weight: bold;' : 'background: #f8f9fa; color: #495057;';
        pagesHTML += `
            <button onclick="goToPage(${i})"
                    style="padding: 6px 12px; margin: 0 2px; border: 1px solid #dee2e6; border-radius: 4px; cursor: pointer; ${activeClass}">
                ${i}
            </button>
        `;
    }

    return `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;">
            <div style="font-size: 14px; color: #495057;">
                Mostrando <strong>${startIndex + 1}</strong> a <strong>${endIndex}</strong> de <strong>${totalAttendances}</strong> asistencias
            </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <label style="font-size: 14px; color: #495057;">Por página:</label>
                    <select onchange="changeItemsPerPage(this.value)"
                            style="padding: 6px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px;">
                        <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option>
                        <option value="25" ${itemsPerPage === 25 ? 'selected' : ''}>25</option>
                        <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100</option>
                    </select>
                </div>

                <div style="display: flex; gap: 5px;">
                    <button onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''}
                            style="padding: 6px 12px; border: 1px solid #dee2e6; border-radius: 4px; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; background: ${currentPage === 1 ? '#e9ecef' : '#fff'};">
                        ⏮️ Primera
                    </button>
                    <button onclick="previousPage()" ${currentPage === 1 ? 'disabled' : ''}
                            style="padding: 6px 12px; border: 1px solid #dee2e6; border-radius: 4px; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; background: ${currentPage === 1 ? '#e9ecef' : '#fff'};">
                        ◀️ Anterior
                    </button>

                    ${pagesHTML}

                    <button onclick="nextPage()" ${currentPage === totalPages ? 'disabled' : ''}
                            style="padding: 6px 12px; border: 1px solid #dee2e6; border-radius: 4px; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; background: ${currentPage === totalPages ? '#e9ecef' : '#fff'};">
                        Siguiente ▶️
                    </button>
                    <button onclick="goToPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}
                            style="padding: 6px 12px; border: 1px solid #dee2e6; border-radius: 4px; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; background: ${currentPage === totalPages ? '#e9ecef' : '#fff'};">
                        Última ⏭️
                    </button>
                </div>
            </div>
        </div>
    `;
}

function hidePaginationControls() {
    const topControls = document.getElementById('pagination-top');
    const bottomControls = document.getElementById('pagination-bottom');

    if (topControls) topControls.style.display = 'none';
    if (bottomControls) bottomControls.style.display = 'none';
}

function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    displayAttendancesTable(filteredAttendances.length > 0 ? filteredAttendances : allAttendances);
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        displayAttendancesTable(filteredAttendances.length > 0 ? filteredAttendances : allAttendances);
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayAttendancesTable(filteredAttendances.length > 0 ? filteredAttendances : allAttendances);
    }
}

function changeItemsPerPage(value) {
    itemsPerPage = parseInt(value);
    currentPage = 1;
    displayAttendancesTable(filteredAttendances.length > 0 ? filteredAttendances : allAttendances);
}

// Filter attendances
function filterAttendances() {
    const searchEmployee = document.getElementById('searchEmployee')?.value.toLowerCase() || '';
    const searchDate = document.getElementById('searchDate')?.value || '';

    filteredAttendances = allAttendances.filter(att => {
        const employeeName = (att.user_name || att.employee_name || '').toLowerCase();
        const attDate = att.date || att.attendance_date || '';

        const matchesEmployee = employeeName.includes(searchEmployee);
        const matchesDate = !searchDate || attDate.startsWith(searchDate);

        return matchesEmployee && matchesDate;
    });

    currentPage = 1;
    displayAttendancesTable(filteredAttendances);

    const filterResults = document.getElementById('filterResultsAttendance');
    if (filterResults) {
        if (filteredAttendances.length < allAttendances.length) {
            filterResults.textContent = `${filteredAttendances.length} de ${allAttendances.length} registros`;
        } else {
            filterResults.textContent = '';
        }
    }
}

function clearAttendanceFilters() {
    document.getElementById('searchEmployee').value = '';
    document.getElementById('searchDate').value = '';

    filteredAttendances = [];
    currentPage = 1;
    displayAttendancesTable(allAttendances);

    const filterResults = document.getElementById('filterResultsAttendance');
    if (filterResults) {
        filterResults.textContent = '';
    }
}

// Show attendance stats
async function showAttendanceStats() {
    console.log('📊 [ATTENDANCE] Cargando estadísticas...');

    try {
        const response = await fetch('/api/v1/attendance/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }

        const stats = await response.json();

        document.getElementById('total-attendances').textContent = stats.total || allAttendances.length || 0;
        document.getElementById('present-count').textContent = stats.present || 0;
        document.getElementById('late-count').textContent = stats.late || 0;
        document.getElementById('absent-count').textContent = stats.absent || 0;

        console.log('✅ [ATTENDANCE] Estadísticas cargadas');

    } catch (error) {
        console.error('❌ [ATTENDANCE] Error cargando estadísticas:', error);
        // Fallback: calculate from loaded data
        document.getElementById('total-attendances').textContent = allAttendances.length;
        document.getElementById('present-count').textContent = allAttendances.filter(a => a.status === 'present').length;
        document.getElementById('late-count').textContent = allAttendances.filter(a => a.status === 'late').length;
        document.getElementById('absent-count').textContent = allAttendances.filter(a => a.status === 'absent').length;
    }
}

// Export attendances to CSV
function exportAttendances() {
    console.log('📤 [ATTENDANCE] Exportando asistencias a CSV...');

    if (allAttendances.length === 0) {
        alert('No hay asistencias para exportar');
        return;
    }

    const dataToExport = filteredAttendances.length > 0 ? filteredAttendances : allAttendances;

    let csv = 'Empleado,Legajo,Fecha,Entrada,Salida,Horas,Estado\n';

    dataToExport.forEach(att => {
        const name = att.user_name || att.employee_name || 'N/A';
        const legajo = att.legajo || att.employee_id || 'N/A';
        const date = att.date || att.attendance_date || '';
        const timeIn = att.check_in || att.time_in || '';
        const timeOut = att.check_out || att.time_out || '';
        const hours = att.hours_worked || calculateHoursWorked(timeIn, timeOut);
        const status = att.status || '';

        csv += `"${name}","${legajo}","${date}","${timeIn}","${timeOut}","${hours}","${status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asistencias_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    console.log(`✅ [ATTENDANCE] ${dataToExport.length} asistencias exportadas`);
}

// Show add attendance modal
function showAddAttendance() {
    console.log('➕ [ATTENDANCE] Abriendo modal de agregar asistencia...');

    const modal = document.createElement('div');
    modal.id = 'attendanceModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10000;';

    modal.innerHTML = `
        <div style="background: white; border-radius: 10px; padding: 30px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;">
            <h3>➕ Agregar Asistencia Manual</h3>
            <form id="addAttendanceForm" onsubmit="saveNewAttendance(event); return false;">
                <div style="margin: 15px 0;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">👤 Empleado:</label>
                    <select id="newAttendanceUserId" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="">Seleccionar empleado...</option>
                    </select>
                </div>

                <div style="margin: 15px 0;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">📅 Fecha:</label>
                    <input type="date" id="newAttendanceDate" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>

                <div style="margin: 15px 0;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">🕐 Hora Entrada:</label>
                    <input type="time" id="newAttendanceTimeIn" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>

                <div style="margin: 15px 0;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">🕐 Hora Salida:</label>
                    <input type="time" id="newAttendanceTimeOut" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>

                <div style="margin: 15px 0;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">📍 Estado:</label>
                    <select id="newAttendanceStatus" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="present">✅ Presente</option>
                        <option value="late">⚠️ Tarde</option>
                        <option value="absent">❌ Ausente</option>
                    </select>
                </div>

                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="closeAttendanceModal()" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">💾 Guardar</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Load employees for dropdown
    loadEmployeesForAttendance();

    // Set default date to today
    document.getElementById('newAttendanceDate').valueAsDate = new Date();
}

// Load employees for attendance dropdown
async function loadEmployeesForAttendance() {
    try {
        const response = await fetch('/api/v1/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const employees = data.users || data.data || [];

            const select = document.getElementById('newAttendanceUserId');
            if (select) {
                employees.forEach(emp => {
                    const option = document.createElement('option');
                    option.value = emp.id || emp.user_id;
                    option.textContent = `${emp.name} (${emp.legajo || emp.employee_id || 'N/A'})`;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

// Save new attendance
async function saveNewAttendance(event) {
    event.preventDefault();

    const userId = document.getElementById('newAttendanceUserId').value;
    const date = document.getElementById('newAttendanceDate').value;
    const timeIn = document.getElementById('newAttendanceTimeIn').value;
    const timeOut = document.getElementById('newAttendanceTimeOut').value;
    const status = document.getElementById('newAttendanceStatus').value;

    console.log('💾 [ATTENDANCE] Guardando nueva asistencia...');

    try {
        const response = await fetch('/api/v1/attendance', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                date,
                time_in: timeIn,
                time_out: timeOut,
                status
            })
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }

        console.log('✅ [ATTENDANCE] Asistencia guardada');
        alert('✅ Asistencia registrada exitosamente');

        closeAttendanceModal();
        loadAttendances();

    } catch (error) {
        console.error('❌ [ATTENDANCE] Error guardando asistencia:', error);
        alert(`❌ Error al guardar asistencia: ${error.message}`);
    }
}

// Close attendance modal
function closeAttendanceModal() {
    const modal = document.getElementById('attendanceModal');
    if (modal) {
        modal.remove();
    }
}

// View attendance details
function viewAttendance(id) {
    console.log('👁️ [ATTENDANCE] Ver asistencia:', id);
    alert(`Ver detalles de asistencia ${id}`);
    // TODO: Implement view modal
}

// Edit attendance
function editAttendance(id) {
    console.log('✏️ [ATTENDANCE] Editar asistencia:', id);
    alert(`Editar asistencia ${id}`);
    // TODO: Implement edit modal
}

// Delete attendance
async function deleteAttendance(id) {
    if (!confirm('¿Estás seguro de eliminar esta asistencia?')) {
        return;
    }

    console.log('🗑️ [ATTENDANCE] Eliminando asistencia:', id);

    try {
        const response = await fetch(`/api/v1/attendance/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }

        console.log('✅ [ATTENDANCE] Asistencia eliminada');
        alert('✅ Asistencia eliminada exitosamente');
        loadAttendances();

    } catch (error) {
        console.error('❌ [ATTENDANCE] Error eliminando asistencia:', error);
        alert(`❌ Error al eliminar asistencia: ${error.message}`);
    }
}

// Helper functions
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR');
}

function formatTime(timeStr) {
    if (!timeStr) return '--:--';
    if (timeStr.includes(':')) {
        return timeStr.substring(0, 5); // HH:MM
    }
    return timeStr;
}

function calculateHoursWorked(timeIn, timeOut) {
    if (!timeIn || !timeOut) return '0.0h';

    try {
        const [h1, m1] = timeIn.split(':').map(Number);
        const [h2, m2] = timeOut.split(':').map(Number);

        const minutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        const hours = (minutes / 60).toFixed(1);

        return `${hours}h`;
    } catch (error) {
        return '0.0h';
    }
}

console.log('✅ [ATTENDANCE] Módulo attendance v6.0 cargado completamente');
