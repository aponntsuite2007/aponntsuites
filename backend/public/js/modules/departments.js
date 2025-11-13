// Departments Module - v1.0 PARAMETRIZABLE GPS
console.log('🏢 [DEPARTMENTS] Módulo departments v1.0 cargado - Sistema parametrizable con GPS');

// Variables globales
let currentDepartments = [];
let isLoadingDepartments = false;

// Función principal para mostrar contenido de departamentos
function showDepartmentsContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;

    content.innerHTML = `
        <div class="tab-content active" id="departments">
            <div class="card">
                <h2 data-translate="departments.title">🏢 Gestión de Departamentos</h2>
                <div class="quick-actions">
                    <button class="btn btn-primary" onclick="showAddDepartment()" data-translate="departments.buttons.create">➕ Crear Departamento</button>
                    <button class="btn btn-success" onclick="loadDepartments()" data-translate="departments.buttons.list">📋 Lista de Departamentos</button>
                    <button class="btn btn-warning" onclick="showDepartmentStats()" data-translate="departments.buttons.statistics">📊 Estadísticas</button>
                    <button class="btn btn-info" onclick="exportDepartments()" data-translate="departments.buttons.export">📤 Exportar</button>
                </div>

                <div id="departments-container">
                    <h3 data-translate="departments.list.title">📋 Lista de Departamentos</h3>
                    <div id="departments-list" class="server-info" data-translate="departments.list.load_prompt">
                        Presiona "Lista de Departamentos" para cargar...
                    </div>
                </div>

                <div id="dept-stats" class="stats-grid" style="margin-top: 20px;">
                    <div class="stat-item">
                        <div class="stat-value" id="total-departments">--</div>
                        <div class="stat-label" data-translate="departments.stats.total_departments">Departamentos Totales</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="gps-enabled-departments">--</div>
                        <div class="stat-label" data-translate="departments.stats.gps_configured">Con GPS Configurado</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="avg-coverage-radius">--</div>
                        <div class="stat-label" data-translate="departments.stats.avg_radius">Radio Promedio (m)</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Auto cargar estadísticas
    setTimeout(showDepartmentStats, 300);
}

// Cargar lista de departamentos
async function loadDepartments() {
    if (isLoadingDepartments) return;
    
    const container = document.getElementById('departments-list');
    if (!container) return;
    
    isLoadingDepartments = true;
    container.innerHTML = `<span data-translate="departments.list.loading">🔄 Cargando departamentos...</span>`;

    try {
        const response = await fetch('/api/v1/departments', {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.departments) {
            currentDepartments = data.departments;
            displayDepartmentsList(data.departments);
            updateDepartmentStats(data.departments);
        } else {
            throw new Error(data.message || await window.t('departments.messages.error_unknown'));
        }

    } catch (error) {
        console.error('Error cargando departamentos:', error);
        const errorTitle = await window.t('departments.messages.error_loading');
        const retryBtn = await window.t('departments.buttons.retry');
        container.innerHTML = `
            <div style="color: #f44336; padding: 20px; text-align: center;">
                <h3>❌ ${errorTitle}</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadDepartments()" data-translate="departments.buttons.retry">🔄 ${retryBtn}</button>
            </div>
        `;
    } finally {
        isLoadingDepartments = false;
    }
}

// Mostrar lista de departamentos
async function displayDepartmentsList(departments) {
    const container = document.getElementById('departments-list');
    if (!container) return;

    if (!departments || departments.length === 0) {
        const emptyTitle = await window.t('departments.list.empty_title');
        const emptyMessage = await window.t('departments.list.empty_message');
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <h3 data-translate="departments.list.empty_title">📂 ${emptyTitle}</h3>
                <p data-translate="departments.list.empty_message">${emptyMessage}</p>
            </div>
        `;
        return;
    }

    const nameHeader = await window.t('departments.table.name');
    const descHeader = await window.t('departments.table.description');
    const addressHeader = await window.t('departments.table.address');
    const gpsHeader = await window.t('departments.table.gps');
    const radiusHeader = await window.t('departments.table.radius');
    const createdHeader = await window.t('departments.table.created');
    const actionsHeader = await window.t('departments.table.actions');

    let html = `
        <div style="overflow-x: auto;">
            <table class="users-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead class="table-dark">
                    <tr>
                        <th data-translate="departments.table.name">🏢 ${nameHeader}</th>
                        <th data-translate="departments.table.description">📝 ${descHeader}</th>
                        <th data-translate="departments.table.address">📍 ${addressHeader}</th>
                        <th data-translate="departments.table.gps">🗺️ ${gpsHeader}</th>
                        <th data-translate="departments.table.radius">📏 ${radiusHeader}</th>
                        <th data-translate="departments.table.created">📅 ${createdHeader}</th>
                        <th data-translate="departments.table.actions">⚙️ ${actionsHeader}</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    const noDesc = await window.t('departments.table.no_description');
    const noAddress = await window.t('departments.table.no_address');
    const gpsConfigured = await window.t('departments.table.gps_configured');
    const gpsNotConfigured = await window.t('departments.table.gps_not_configured');
    const actionView = await window.t('departments.table.action_view');
    const actionEdit = await window.t('departments.table.action_edit');
    const actionDelete = await window.t('departments.table.action_delete');

    departments.forEach(dept => {
        const hasGPS = dept.gpsLocation?.lat && dept.gpsLocation?.lng;
        const gpsDisplay = hasGPS
            ? `✅ ${dept.gpsLocation.lat.toFixed(6)}, ${dept.gpsLocation.lng.toFixed(6)}`
            : `❌ ${gpsNotConfigured}`;

        const createdDate = new Date(dept.createdAt).toLocaleDateString('es-AR');

        html += `
            <tr>
                <td style="font-weight: bold; min-width: 120px;">${dept.name}</td>
                <td style="min-width: 250px; font-size: 0.9em;">${dept.description || noDesc}</td>
                <td style="min-width: 200px; font-size: 0.9em;">${dept.address || noAddress}</td>
                <td style="min-width: 150px;"><span style="font-size: 11px;">${gpsDisplay}</span></td>
                <td style="text-align: center; min-width: 80px;">
                    <span style="background: ${hasGPS ? '#4CAF50' : '#FFC107'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                        ${dept.coverageRadius}m
                    </span>
                </td>
                <td style="min-width: 90px; font-size: 0.85em;">${createdDate}</td>
                <td style="text-align: center; width: 80px;">
                    <div style="display: flex; flex-direction: column; gap: 1px; align-items: center;">
                        <button class="btn-mini btn-info" onclick="viewDepartment('${dept.id}')" title="${actionView}">👁️</button>
                        <button class="btn-mini btn-warning" onclick="editDepartment('${dept.id}')" title="${actionEdit}">✏️</button>
                        <button class="btn-mini btn-danger" onclick="deleteDepartment('${dept.id}')" title="${actionDelete}">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    const legendTitle = await window.t('departments.table.legend_title');
    const legendGpsConfigured = await window.t('departments.table.legend_gps_configured');
    const legendGpsNotConfigured = await window.t('departments.table.legend_gps_not_configured');
    const legendRadius = await window.t('departments.table.legend_radius');

    html += `
                </tbody>
            </table>
        </div>

        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h4 data-translate="departments.table.legend_title">📋 ${legendTitle}</h4>
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <span data-translate="departments.table.legend_gps_configured">✅ ${legendGpsConfigured}</span>
                <span data-translate="departments.table.legend_gps_not_configured">❌ ${legendGpsNotConfigured}</span>
                <span data-translate="departments.table.legend_radius">📏 ${legendRadius}</span>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// Mostrar estadísticas de departamentos
function updateDepartmentStats(departments) {
    const totalDepts = departments.length;
    const gpsEnabledDepts = departments.filter(d => d.gpsLocation?.lat && d.gpsLocation?.lng).length;
    const totalRadius = departments.reduce((sum, d) => sum + (d.coverageRadius || 0), 0);
    const avgRadius = totalDepts > 0 ? Math.round(totalRadius / totalDepts) : 0;

    console.log('📊 [DEPARTMENTS] Calculando estadísticas:');
    console.log(`   Departamentos: ${totalDepts}`);
    console.log(`   Radio total: ${totalRadius}m`);
    console.log(`   Promedio: ${avgRadius}m`);
    console.log('   Datos:', departments.map(d => `${d.name}: ${d.coverageRadius}m`));
    
    const totalElement = document.getElementById('total-departments');
    const gpsElement = document.getElementById('gps-enabled-departments');
    const avgElement = document.getElementById('avg-coverage-radius');

    if (totalElement) totalElement.textContent = totalDepts;
    if (gpsElement) gpsElement.textContent = gpsEnabledDepts;
    if (avgElement) avgElement.textContent = avgRadius;
}

// Función para mostrar estadísticas
function showDepartmentStats() {
    if (currentDepartments.length > 0) {
        updateDepartmentStats(currentDepartments);
    } else {
        loadDepartments();
    }
}

// Cargar sucursales de la empresa
async function loadBranches() {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            throw new Error('No hay token de autenticación');
        }

        const response = await fetch('/api/v1/companies/1/branches', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // Si el endpoint no existe aún, devolver array vacío
            if (response.status === 404) {
                return [];
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.success ? data.branches : [];
    } catch (error) {
        console.warn('⚠️ No se pudieron cargar las sucursales:', error.message);
        return [];
    }
}

// Mostrar modal para agregar departamento
async function showAddDepartment() {
    const modalTitle = await window.t('departments.form.modal_title_create');
    const branchLabel = await window.t('departments.form.branch_label');
    const branchSelectText = await window.t('departments.form.branch_select');
    const branchHelp = await window.t('departments.form.branch_help');
    const nameLabel = await window.t('departments.form.name_label');
    const namePlaceholder = await window.t('departments.form.name_placeholder');
    const descLabel = await window.t('departments.form.description_label');
    const descPlaceholder = await window.t('departments.form.description_placeholder');
    const addressLabel = await window.t('departments.form.address_label');
    const addressPlaceholder = await window.t('departments.form.address_placeholder');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;';

    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="margin: 0; color: #333;" data-translate="departments.form.modal_title_create">🏢 ${modalTitle}</h2>
                <button onclick="closeDepartmentModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">✖️</button>
            </div>

            <div id="branchSelectorContainer" style="margin-bottom: 20px; display: none;">
                <label data-translate="departments.form.branch_label"><strong>🏛️ ${branchLabel}:</strong></label>
                <select id="newDeptBranch" style="width: 100%; padding: 12px; margin-top: 8px; border: 1px solid #ddd; border-radius: 8px;">
                    <option value="" data-translate="departments.form.branch_select">${branchSelectText}</option>
                </select>
                <small style="color: #666; display: block; margin-top: 5px;" data-translate="departments.form.branch_help">
                    🏢 ${branchHelp}
                </small>
            </div>

            <div style="margin-bottom: 20px;">
                <label data-translate="departments.form.name_label"><strong>🏢 ${nameLabel}:</strong></label>
                <input type="text" id="newDeptName" style="width: 100%; padding: 12px; margin-top: 8px; border: 1px solid #ddd; border-radius: 8px;" placeholder="${namePlaceholder}" data-translate-placeholder="departments.form.name_placeholder">
            </div>

            <div style="margin-bottom: 20px;">
                <label data-translate="departments.form.description_label"><strong>📝 ${descLabel}:</strong></label>
                <textarea id="newDeptDescription" style="width: 100%; padding: 12px; margin-top: 8px; border: 1px solid #ddd; border-radius: 8px; rows: 3;" placeholder="${descPlaceholder}" data-translate-placeholder="departments.form.description_placeholder"></textarea>
            </div>

            <div style="margin-bottom: 20px;">
                <label data-translate="departments.form.address_label"><strong>📍 ${addressLabel}:</strong></label>
                <input type="text" id="newDeptAddress" style="width: 100%; padding: 12px; margin-top: 8px; border: 1px solid #ddd; border-radius: 8px;" placeholder="${addressPlaceholder}" data-translate-placeholder="departments.form.address_placeholder">
            </div>
            
            <!-- Checkbox: Permitir GPS desde APK -->
            <div style="margin-bottom: 25px; padding: 20px; background: #e8f5e9; border-radius: 8px; border-left: 4px solid #4caf50;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">
                    <input type="checkbox" id="deptAllowGpsAttendance" style="width: 20px; height: 20px; cursor: pointer;">
                    <span data-translate="departments.form.allow_gps_label">📱 ${await window.t('departments.form.allow_gps_label')}</span>
                </label>
                <small style="color: #666; display: block; margin-left: 30px;" data-translate="departments.form.allow_gps_help">
                    ${await window.t('departments.form.allow_gps_help')}
                </small>
            </div>

            <!-- Sección GPS (solo visible si se permite GPS) -->
            <div id="gpsConfigSection" style="display: none; margin-bottom: 25px; padding: 20px; background: #f0f8ff; border-radius: 8px;">
                <label data-translate="departments.form.gps_location_label"><strong>📍 ${await window.t('departments.form.gps_location_label')}:</strong></label>
                <small style="color: #666; display: block; margin-bottom: 15px;" data-translate="departments.form.gps_location_help">
                    ⚠️ ${await window.t('departments.form.gps_location_help')}
                </small>

                <!-- Mapa Google Maps -->
                <div id="departmentMap" style="width: 100%; height: 300px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 15px; position: relative;">
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #999;" data-translate="departments.form.map_loading">
                        🗺️ ${await window.t('departments.form.map_loading')}
                    </div>
                </div>

                <!-- Coordenadas manuales + Radio -->
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-size: 13px; color: #555; font-weight: bold;" data-translate="departments.form.latitude_label">${await window.t('departments.form.latitude_label')}:</label>
                        <input type="number" id="newDeptLat" step="0.00000001" placeholder="-34.603722" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-top: 5px;">
                    </div>
                    <div>
                        <label style="font-size: 13px; color: #555; font-weight: bold;" data-translate="departments.form.longitude_label">${await window.t('departments.form.longitude_label')}:</label>
                        <input type="number" id="newDeptLng" step="0.00000001" placeholder="-58.381592" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-top: 5px;">
                    </div>
                    <div>
                        <label style="font-size: 13px; color: #555; font-weight: bold;" data-translate="departments.form.radius_label">📏 ${await window.t('departments.form.radius_label')}:</label>
                        <input type="number" id="newDeptRadius" min="10" max="1000" value="50" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-top: 5px;">
                    </div>
                </div>

                <div style="padding: 12px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
                    <small style="color: #856404;" data-translate="departments.form.map_tip">
                        💡 ${await window.t('departments.form.map_tip')}
                    </small>
                </div>
            </div>

            <!-- Sección Kiosks Autorizados -->
            <div style="margin-bottom: 25px; padding: 20px; background: #e3f2fd; border-radius: 8px;">
                <label data-translate="departments.form.kiosks_label"><strong>🖥️ ${await window.t('departments.form.kiosks_label')}:</strong></label>
                <small style="color: #666; display: block; margin-bottom: 12px;" data-translate="departments.form.kiosks_help">
                    📍 ${await window.t('departments.form.kiosks_help')}
                </small>

                <div id="deptKiosksCheckboxContainer" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 12px; background: white; border-radius: 5px;">
                    <p style="margin: 0; color: #999;" data-translate="departments.form.kiosks_loading">${await window.t('departments.form.kiosks_loading')}</p>
                </div>

                <div style="margin-top: 12px; padding: 10px; background: #e1f5fe; border-radius: 5px;">
                    <small style="color: #01579b;" data-translate="departments.form.mixed_mode_info">
                        ℹ️ ${await window.t('departments.form.mixed_mode_info')}
                    </small>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 30px;">
                <button class="btn btn-secondary" onclick="closeDepartmentModal()" data-translate="departments.buttons.cancel">❌ ${await window.t('departments.buttons.cancel')}</button>
                <button class="btn btn-primary" onclick="saveNewDepartment()" data-translate="departments.buttons.save">💾 ${await window.t('departments.buttons.save')}</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);

    // Cargar sucursales y mostrar selector si es necesario
    const branches = await loadBranches();
    const branchContainer = document.getElementById('branchSelectorContainer');
    const branchSelect = document.getElementById('newDeptBranch');

    if (branches && branches.length > 0) {
        // La empresa tiene sucursales, mostrar selector
        branchContainer.style.setProperty('display', 'block', 'important');

        // Limpiar opciones existentes y agregar sucursales
        branchSelect.innerHTML = '<option value="">Seleccione una sucursal...</option>';
        branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.id;
            option.textContent = `${branch.name} (${branch.code || 'Sin código'})`;
            branchSelect.appendChild(option);
        });

        console.log(`✅ ${branches.length} sucursales cargadas`);
    } else {
        // Sin sucursales, ocultar selector
        branchContainer.style.setProperty('display', 'none', 'important');
        console.log('ℹ️ Empresa sin sucursales - modo tradicional');
    }

    // Cargar kiosks y generar checkboxes
    const kiosks = await loadKiosksForSelector();
    const kioskContainer = document.getElementById('deptKiosksCheckboxContainer');

    if (kiosks && kiosks.length > 0) {
        const allKiosksLabel = await window.t('departments.form.all_kiosks');

        // Agregar checkbox "Todos los kiosks"
        let checkboxesHTML = `
            <div style="margin-bottom: 12px; padding: 8px; background: #e8f5e9; border-radius: 4px; border-left: 3px solid #4caf50;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: bold;">
                    <input type="checkbox" id="deptAllKiosks" class="dept-kiosk-all" style="width: 18px; height: 18px; cursor: pointer;">
                    <span data-translate="departments.form.all_kiosks">✅ ${allKiosksLabel}</span>
                </label>
            </div>
            <hr style="margin: 12px 0; border-color: #ddd;">
        `;

        // Agregar checkboxes individuales
        kiosks.forEach(kiosk => {
            checkboxesHTML += `
                <div style="margin-bottom: 8px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: normal;">
                        <input type="checkbox" value="${kiosk.id}" class="dept-kiosk-checkbox" style="width: 18px; height: 18px; cursor: pointer;">
                        <span>${kiosk.name}${kiosk.location ? ' - ' + kiosk.location : ''}</span>
                    </label>
                </div>
            `;
        });

        kioskContainer.innerHTML = checkboxesHTML;
        console.log(`✅ ${kiosks.length} kiosks cargados como checkboxes`);

        // Lógica para "Todos los kiosks" marca/desmarca todos
        document.getElementById('deptAllKiosks').addEventListener('change', function(e) {
            const individualCheckboxes = document.querySelectorAll('.dept-kiosk-checkbox');
            individualCheckboxes.forEach(cb => {
                cb.checked = e.target.checked;
            });
        });

        // Lógica para desmarcar "Todos" si se desmarca alguno individual
        document.querySelectorAll('.dept-kiosk-checkbox').forEach(cb => {
            cb.addEventListener('change', function() {
                const allChecked = Array.from(document.querySelectorAll('.dept-kiosk-checkbox')).every(c => c.checked);
                document.getElementById('deptAllKiosks').checked = allChecked;
            });
        });
    } else {
        const noKiosksAvailable = await window.t('departments.form.no_kiosks_available');
        kioskContainer.innerHTML = `<p style="margin: 0; color: #999;" data-translate="departments.form.no_kiosks_available">${noKiosksAvailable}</p>`;
    }

    // Lógica para mostrar/ocultar sección GPS
    document.getElementById('deptAllowGpsAttendance').addEventListener('change', function(e) {
        const gpsSection = document.getElementById('gpsConfigSection');
        if (e.target.checked) {
            gpsSection.style.display = 'block';
            // Inicializar Google Maps si está disponible
            if (typeof google !== 'undefined' && google.maps) {
                initDepartmentMap();
            } else {
                console.warn('⚠️ Google Maps no está cargado. El mapa no estará disponible.');
            }
        } else {
            gpsSection.style.display = 'none';
        }
    });

    document.getElementById('newDeptName').focus();
}

// Variable global para el mapa
let departmentMap = null;
let departmentMarker = null;
let departmentCircle = null;

// Inicializar Google Maps
function initDepartmentMap() {
    const mapContainer = document.getElementById('departmentMap');
    if (!mapContainer) return;

    // Coordenadas por defecto (Buenos Aires - Obelisco)
    const defaultLat = -34.603722;
    const defaultLng = -58.381592;

    const lat = parseFloat(document.getElementById('newDeptLat').value) || defaultLat;
    const lng = parseFloat(document.getElementById('newDeptLng').value) || defaultLng;
    const radius = parseInt(document.getElementById('newDeptRadius').value) || 50;

    try {
        // Crear mapa
        departmentMap = new google.maps.Map(mapContainer, {
            center: { lat, lng },
            zoom: 18,
            mapTypeId: 'satellite', // Vista satelital para mejor precisión
            tilt: 0
        });

        // Crear marcador draggable
        departmentMarker = new google.maps.Marker({
            position: { lat, lng },
            map: departmentMap,
            draggable: true,
            title: 'Ubicación del Departamento'
        });

        // Crear círculo de cobertura
        departmentCircle = new google.maps.Circle({
            map: departmentMap,
            center: { lat, lng },
            radius: radius,
            strokeColor: '#FFC107',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FFC107',
            fillOpacity: 0.2
        });

        // Actualizar inputs al arrastrar marcador
        departmentMarker.addListener('dragend', function(event) {
            const newLat = event.latLng.lat();
            const newLng = event.latLng.lng();
            document.getElementById('newDeptLat').value = newLat.toFixed(8);
            document.getElementById('newDeptLng').value = newLng.toFixed(8);
            departmentCircle.setCenter({ lat: newLat, lng: newLng });
        });

        // Actualizar marcador y círculo al cambiar inputs manualmente
        document.getElementById('newDeptLat').addEventListener('input', updateMapFromInputs);
        document.getElementById('newDeptLng').addEventListener('input', updateMapFromInputs);
        document.getElementById('newDeptRadius').addEventListener('input', function() {
            const newRadius = parseInt(this.value) || 50;
            if (departmentCircle) {
                departmentCircle.setRadius(newRadius);
            }
        });

        console.log('✅ Google Maps inicializado correctamente');
    } catch (error) {
        console.error('❌ Error inicializando Google Maps:', error);
        mapContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">⚠️ Error cargando el mapa. Usa las coordenadas manuales.</div>';
    }
}

// Actualizar mapa desde inputs
function updateMapFromInputs() {
    const lat = parseFloat(document.getElementById('newDeptLat').value);
    const lng = parseFloat(document.getElementById('newDeptLng').value);

    if (!isNaN(lat) && !isNaN(lng) && departmentMarker && departmentMap && departmentCircle) {
        const newPos = { lat, lng };
        departmentMarker.setPosition(newPos);
        departmentCircle.setCenter(newPos);
        departmentMap.setCenter(newPos);
    }
}

// Cerrar modal de departamentos
function closeDepartmentModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Obtener ubicación actual del usuario
async function getCurrentLocation() {
    if (!navigator.geolocation) {
        alert(await window.t('departments.messages.geolocation_not_supported'));
        return;
    }

    const latInput = document.getElementById('newDeptLat') || document.getElementById('editDeptLat');
    const lngInput = document.getElementById('newDeptLng') || document.getElementById('editDeptLng');

    if (!latInput || !lngInput) return;

    const loadingMsg = await window.t('departments.messages.obtaining_location');
    const latPlaceholder = await window.t('departments.form.latitude_label');
    const lngPlaceholder = await window.t('departments.form.longitude_label');
    const errorMsg = await window.t('departments.messages.error_obtaining_location');

    // Mostrar estado de carga
    latInput.placeholder = loadingMsg;
    lngInput.placeholder = loadingMsg;

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            latInput.value = position.coords.latitude.toFixed(6);
            lngInput.value = position.coords.longitude.toFixed(6);
            latInput.placeholder = latPlaceholder;
            lngInput.placeholder = lngPlaceholder;
            alert(await window.t('departments.messages.location_obtained'));
        },
        async (error) => {
            console.error('Error obteniendo ubicación:', error);
            latInput.placeholder = errorMsg;
            lngInput.placeholder = errorMsg;
            alert(await window.t('departments.messages.error_obtaining_location') + ': ' + error.message);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }
    );
}

// Guardar nuevo departamento
async function saveNewDepartment() {
    const name = document.getElementById('newDeptName').value.trim();
    const description = document.getElementById('newDeptDescription').value.trim();
    const address = document.getElementById('newDeptAddress').value.trim();
    const lat = document.getElementById('newDeptLat').value;
    const lng = document.getElementById('newDeptLng').value;
    const radius = document.getElementById('newDeptRadius').value;
    const branchSelect = document.getElementById('newDeptBranch');
    const branchId = branchSelect.value;

    // Verificar si el selector de sucursales está visible (empresa tiene sucursales)
    const branchContainer = document.getElementById('branchSelectorContainer');
    const hasBranches = branchContainer.style.display !== 'none';

    // Recolectar opciones de asistencia
    const allowGpsAttendance = document.getElementById('deptAllowGpsAttendance')?.checked || false;
    const selectedKioskCheckboxes = document.querySelectorAll('.dept-kiosk-checkbox:checked');
    const authorizedKiosks = Array.from(selectedKioskCheckboxes).map(cb => parseInt(cb.value));

    // Validaciones
    if (hasBranches && !branchId) {
        alert(await window.t('departments.validation.branch_required'));
        branchSelect.focus();
        return;
    }

    if (!name) {
        alert(await window.t('departments.validation.name_required'));
        document.getElementById('newDeptName').focus();
        return;
    }

    if (name.length < 2) {
        alert(await window.t('departments.validation.name_min_length'));
        document.getElementById('newDeptName').focus();
        return;
    }

    // Validar que al menos UNA opción esté habilitada
    if (!allowGpsAttendance && authorizedKiosks.length === 0) {
        alert(await window.t('departments.validation.at_least_one_option'));
        return;
    }

    // Si se permite GPS, validar coordenadas y radio
    if (allowGpsAttendance) {
        if (!lat || !lng) {
            alert(await window.t('departments.validation.gps_coordinates_required'));
            document.getElementById('newDeptLat').focus();
            return;
        }
        if (!radius || radius < 10 || radius > 1000) {
            alert(await window.t('departments.validation.radius_range'));
            document.getElementById('newDeptRadius').focus();
            return;
        }
    }

    // Preparar datos
    const deptData = {
        name,
        description,
        address,
        coverageRadius: parseInt(radius) || 50,
        gpsLocation: {
            lat: lat ? parseFloat(lat) : null,
            lng: lng ? parseFloat(lng) : null
        },
        allow_gps_attendance: allowGpsAttendance,
        authorized_kiosks: authorizedKiosks
    };

    // Agregar branchId solo si la empresa tiene sucursales
    if (hasBranches && branchId) {
        deptData.branchId = branchId;
    }

    try {
        const response = await fetch('/api/v1/departments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(deptData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert(await window.t('departments.messages.success_created'));
            closeDepartmentModal();
            loadDepartments(); // Recargar lista
        } else {
            throw new Error(result.error || result.message || await window.t('departments.messages.error_unknown'));
        }

    } catch (error) {
        console.error('Error creando departamento:', error);
        alert(await window.t('departments.messages.error_creating') + ': ' + error.message);
    }
}

// Ver departamento
async function viewDepartment(deptId) {
    const dept = currentDepartments.find(d => d.id == deptId);
    if (!dept) {
        alert(await window.t('departments.messages.not_found'));
        return;
    }

    const hasGPS = dept.gpsLocation?.lat && dept.gpsLocation?.lng;

    const noDesc = await window.t('departments.view.no_description');
    const noAddress = await window.t('departments.view.no_address');
    const gpsNotConfigured = await window.t('departments.view.gps_not_configured');
    const descLabel = await window.t('departments.view.description');
    const addressLabel = await window.t('departments.view.address');
    const gpsLabel = await window.t('departments.view.gps');
    const radiusLabel = await window.t('departments.view.radius');
    const createdLabel = await window.t('departments.view.created');
    const updatedLabel = await window.t('departments.view.updated');
    const mapTitle = await window.t('departments.view.map_title');
    const coordinatesLabel = await window.t('departments.view.coordinates');
    const viewMapBtn = await window.t('departments.view.view_in_maps');
    const editBtn = await window.t('departments.buttons.edit');
    const closeBtn = await window.t('departments.buttons.close');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;';

    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="margin: 0; color: #333;">🏢 ${dept.name}</h2>
                <button onclick="closeDepartmentModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">✖️</button>
            </div>

            <div class="info-grid" style="display: grid; gap: 15px;">
                <div><strong data-translate="departments.view.description">📝 ${descLabel}:</strong><br>${dept.description || noDesc}</div>
                <div><strong data-translate="departments.view.address">📍 ${addressLabel}:</strong><br>${dept.address || noAddress}</div>
                <div><strong data-translate="departments.view.gps">🗺️ ${gpsLabel}:</strong><br>${hasGPS ? `✅ ${dept.gpsLocation.lat.toFixed(6)}, ${dept.gpsLocation.lng.toFixed(6)}` : `❌ ${gpsNotConfigured}`}</div>
                <div><strong data-translate="departments.view.radius">📏 ${radiusLabel}:</strong><br>${dept.coverageRadius} metros</div>
                <div><strong data-translate="departments.view.created">📅 ${createdLabel}:</strong><br>${new Date(dept.createdAt).toLocaleString('es-AR')}</div>
                ${dept.updatedAt ? `<div><strong data-translate="departments.view.updated">📝 ${updatedLabel}:</strong><br>${new Date(dept.updatedAt).toLocaleString('es-AR')}</div>` : ''}
            </div>

            ${hasGPS ? `
                <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 8px;">
                    <h4 data-translate="departments.view.map_title">🗺️ ${mapTitle}</h4>
                    <p data-translate="departments.view.coordinates">📍 ${coordinatesLabel}: ${dept.gpsLocation.lat.toFixed(6)}, ${dept.gpsLocation.lng.toFixed(6)}</p>
                    <a href="https://www.google.com/maps?q=${dept.gpsLocation.lat},${dept.gpsLocation.lng}" target="_blank" class="btn btn-info btn-sm" data-translate="departments.view.view_in_maps">
                        🗺️ ${viewMapBtn}
                    </a>
                </div>
            ` : ''}

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 30px;">
                <button class="btn btn-warning" onclick="closeDepartmentModal(); editDepartment('${dept.id}')" data-translate="departments.buttons.edit">✏️ ${editBtn}</button>
                <button class="btn btn-secondary" onclick="closeDepartmentModal()" data-translate="departments.buttons.close">✖️ ${closeBtn}</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Editar departamento
async function editDepartment(deptId) {
    const dept = currentDepartments.find(d => d.id == deptId);
    if (!dept) {
        alert(await window.t('departments.messages.not_found'));
        return;
    }

    const modalTitle = await window.t('departments.form.modal_title_edit');
    const nameLabel = await window.t('departments.form.name_label');
    const descLabel = await window.t('departments.form.description_label');
    const addressLabel = await window.t('departments.form.address_label');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;';

    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="margin: 0; color: #333;" data-translate="departments.form.modal_title_edit">✏️ ${modalTitle}</h2>
                <button onclick="closeDepartmentModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">✖️</button>
            </div>

            <div style="margin-bottom: 20px;">
                <label data-translate="departments.form.name_label"><strong>🏢 ${nameLabel}:</strong></label>
                <input type="text" id="editDeptName" value="${dept.name}" style="width: 100%; padding: 12px; margin-top: 8px; border: 1px solid #ddd; border-radius: 8px;">
            </div>

            <div style="margin-bottom: 20px;">
                <label data-translate="departments.form.description_label"><strong>📝 ${descLabel}:</strong></label>
                <textarea id="editDeptDescription" style="width: 100%; padding: 12px; margin-top: 8px; border: 1px solid #ddd; border-radius: 8px;" rows="3">${dept.description || ''}</textarea>
            </div>

            <div style="margin-bottom: 20px;">
                <label data-translate="departments.form.address_label"><strong>📍 ${addressLabel}:</strong></label>
                <input type="text" id="editDeptAddress" value="${dept.address || ''}" style="width: 100%; padding: 12px; margin-top: 8px; border: 1px solid #ddd; border-radius: 8px;">
            </div>

            <!-- Checkbox: Permitir GPS desde APK -->
            <div style="margin-bottom: 25px; padding: 20px; background: #e8f5e9; border-radius: 8px; border-left: 4px solid #4caf50;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">
                    <input type="checkbox" id="editDeptAllowGpsAttendance" style="width: 20px; height: 20px; cursor: pointer;" ${dept.allow_gps_attendance || dept.allowGpsAttendance ? 'checked' : ''}>
                    <span data-translate="departments.form.allow_gps_label">📱 ${await window.t('departments.form.allow_gps_label')}</span>
                </label>
                <small style="color: #666; display: block; margin-left: 30px;" data-translate="departments.form.allow_gps_help">
                    ${await window.t('departments.form.allow_gps_help')}
                </small>
            </div>

            <!-- Sección GPS (solo visible si se permite GPS) -->
            <div id="editGpsConfigSection" style="display: ${dept.allow_gps_attendance || dept.allowGpsAttendance ? 'block' : 'none'}; margin-bottom: 25px; padding: 20px; background: #f0f8ff; border-radius: 8px;">
                <label data-translate="departments.form.gps_location_label"><strong>📍 ${await window.t('departments.form.gps_location_label')}:</strong></label>
                <small style="color: #666; display: block; margin-bottom: 15px;" data-translate="departments.form.gps_location_help">
                    ⚠️ ${await window.t('departments.form.gps_location_help')}
                </small>

                <!-- Mapa Google Maps -->
                <div id="editDepartmentMap" style="width: 100%; height: 300px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 15px; position: relative;">
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #999;" data-translate="departments.form.map_loading">
                        🗺️ ${await window.t('departments.form.map_loading')}
                    </div>
                </div>

                <!-- Coordenadas manuales + Radio -->
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-size: 13px; color: #555; font-weight: bold;" data-translate="departments.form.latitude_label">${await window.t('departments.form.latitude_label')}:</label>
                        <input type="number" id="editDeptLat" step="0.00000001" value="${dept.gpsLocation?.lat || ''}" placeholder="-34.603722" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-top: 5px;">
                    </div>
                    <div>
                        <label style="font-size: 13px; color: #555; font-weight: bold;" data-translate="departments.form.longitude_label">${await window.t('departments.form.longitude_label')}:</label>
                        <input type="number" id="editDeptLng" step="0.00000001" value="${dept.gpsLocation?.lng || ''}" placeholder="-58.381592" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-top: 5px;">
                    </div>
                    <div>
                        <label style="font-size: 13px; color: #555; font-weight: bold;" data-translate="departments.form.radius_label">📏 ${await window.t('departments.form.radius_label')}:</label>
                        <input type="number" id="editDeptRadius" min="10" max="1000" value="${dept.coverageRadius || 50}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-top: 5px;">
                    </div>
                </div>

                <div style="padding: 12px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
                    <small style="color: #856404;" data-translate="departments.form.map_tip">
                        💡 ${await window.t('departments.form.map_tip')}
                    </small>
                </div>
            </div>

            <!-- Sección Kiosks Autorizados -->
            <div style="margin-bottom: 25px; padding: 20px; background: #e3f2fd; border-radius: 8px;">
                <label data-translate="departments.form.kiosks_label"><strong>🖥️ ${await window.t('departments.form.kiosks_label')}:</strong></label>
                <small style="color: #666; display: block; margin-bottom: 12px;" data-translate="departments.form.kiosks_help">
                    📍 ${await window.t('departments.form.kiosks_help')}
                </small>

                <div id="editDeptKiosksCheckboxContainer" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 12px; background: white; border-radius: 5px;">
                    <p style="margin: 0; color: #999;" data-translate="departments.form.kiosks_loading">${await window.t('departments.form.kiosks_loading')}</p>
                </div>

                <div style="margin-top: 12px; padding: 10px; background: #e1f5fe; border-radius: 5px;">
                    <small style="color: #01579b;" data-translate="departments.form.mixed_mode_info">
                        ℹ️ ${await window.t('departments.form.mixed_mode_info')}
                    </small>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 30px;">
                <button class="btn btn-secondary" onclick="closeDepartmentModal()" data-translate="departments.buttons.cancel">❌ ${await window.t('departments.buttons.cancel')}</button>
                <button class="btn btn-primary" onclick="updateDepartment('${dept.id}')" data-translate="departments.buttons.save">💾 ${await window.t('departments.buttons.save')}</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);

    // Cargar kiosks y poblar checkboxes
    (async () => {
        const kiosks = await loadKiosksForSelector();
        const kioskContainer = document.getElementById('editDeptKiosksCheckboxContainer');

        if (kiosks && kiosks.length > 0) {
            // Obtener kiosks autorizados del departamento
            const authorizedKiosks = dept.authorized_kiosks || dept.authorizedKiosks || [];
            const allKiosksLabel = await window.t('departments.form.all_kiosks');

            // Agregar checkbox "Todos los kiosks"
            let checkboxesHTML = `
                <div style="margin-bottom: 12px; padding: 8px; background: #e8f5e9; border-radius: 4px; border-left: 3px solid #4caf50;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: bold;">
                        <input type="checkbox" id="editDeptAllKiosks" class="edit-dept-kiosk-all" style="width: 18px; height: 18px; cursor: pointer;">
                        <span data-translate="departments.form.all_kiosks">✅ ${allKiosksLabel}</span>
                    </label>
                </div>
                <hr style="margin: 12px 0; border-color: #ddd;">
            `;

            // Agregar checkboxes individuales
            kiosks.forEach(kiosk => {
                const isChecked = authorizedKiosks.includes(kiosk.id);
                checkboxesHTML += `
                    <div style="margin-bottom: 8px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: normal;">
                            <input type="checkbox" value="${kiosk.id}" class="edit-dept-kiosk-checkbox" style="width: 18px; height: 18px; cursor: pointer;" ${isChecked ? 'checked' : ''}>
                            <span>${kiosk.name}${kiosk.location ? ' - ' + kiosk.location : ''}</span>
                        </label>
                    </div>
                `;
            });

            kioskContainer.innerHTML = checkboxesHTML;

            // Actualizar "Todos" si todos están marcados
            const allChecked = Array.from(document.querySelectorAll('.edit-dept-kiosk-checkbox')).every(c => c.checked);
            document.getElementById('editDeptAllKiosks').checked = allChecked;

            // Lógica para "Todos los kiosks"
            document.getElementById('editDeptAllKiosks').addEventListener('change', function(e) {
                document.querySelectorAll('.edit-dept-kiosk-checkbox').forEach(cb => {
                    cb.checked = e.target.checked;
                });
            });

            // Lógica para desmarcar "Todos" si se desmarca alguno individual
            document.querySelectorAll('.edit-dept-kiosk-checkbox').forEach(cb => {
                cb.addEventListener('change', function() {
                    const allChecked = Array.from(document.querySelectorAll('.edit-dept-kiosk-checkbox')).every(c => c.checked);
                    document.getElementById('editDeptAllKiosks').checked = allChecked;
                });
            });

            console.log(`✅ ${kiosks.length} kiosks cargados para edición (${authorizedKiosks.length} pre-seleccionados)`);
        } else {
            const noKiosksAvailable = await window.t('departments.form.no_kiosks_available');
            kioskContainer.innerHTML = `<p style="margin: 0; color: #999;" data-translate="departments.form.no_kiosks_available">${noKiosksAvailable}</p>`;
        }

        // Lógica toggle para mostrar/ocultar sección GPS
        document.getElementById('editDeptAllowGpsAttendance').addEventListener('change', function(e) {
            const gpsSection = document.getElementById('editGpsConfigSection');
            if (e.target.checked) {
                gpsSection.style.display = 'block';
                // Inicializar Google Maps si está disponible
                if (typeof google !== 'undefined' && google.maps) {
                    initEditDepartmentMap();
                } else {
                    console.warn('⚠️ Google Maps no está cargado');
                }
            } else {
                gpsSection.style.display = 'none';
            }
        });

        // Si ya tiene GPS habilitado, inicializar el mapa
        if (dept.allow_gps_attendance || dept.allowGpsAttendance) {
            if (typeof google !== 'undefined' && google.maps) {
                initEditDepartmentMap();
            }
        }
    })();

    document.getElementById('editDeptName').focus();
}

// Inicializar Google Maps para modal de EDICIÓN
function initEditDepartmentMap() {
    const mapContainer = document.getElementById('editDepartmentMap');
    if (!mapContainer) return;

    const defaultLat = -34.603722;
    const defaultLng = -58.381592;

    const lat = parseFloat(document.getElementById('editDeptLat').value) || defaultLat;
    const lng = parseFloat(document.getElementById('editDeptLng').value) || defaultLng;
    const radius = parseInt(document.getElementById('editDeptRadius').value) || 50;

    try {
        // Crear mapa
        departmentMap = new google.maps.Map(mapContainer, {
            center: { lat, lng },
            zoom: 18,
            mapTypeId: 'satellite',
            tilt: 0
        });

        // Crear marcador draggable
        departmentMarker = new google.maps.Marker({
            position: { lat, lng },
            map: departmentMap,
            draggable: true,
            title: 'Ubicación del Departamento'
        });

        // Crear círculo de cobertura
        departmentCircle = new google.maps.Circle({
            map: departmentMap,
            center: { lat, lng },
            radius: radius,
            strokeColor: '#FFC107',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FFC107',
            fillOpacity: 0.2
        });

        // Actualizar inputs al arrastrar marcador
        departmentMarker.addListener('dragend', function(event) {
            const newLat = event.latLng.lat();
            const newLng = event.latLng.lng();
            document.getElementById('editDeptLat').value = newLat.toFixed(8);
            document.getElementById('editDeptLng').value = newLng.toFixed(8);
            departmentCircle.setCenter({ lat: newLat, lng: newLng });
        });

        // Actualizar marcador y círculo al cambiar inputs manualmente
        document.getElementById('editDeptLat').addEventListener('input', updateMapFromEditInputs);
        document.getElementById('editDeptLng').addEventListener('input', updateMapFromEditInputs);
        document.getElementById('editDeptRadius').addEventListener('input', function() {
            const newRadius = parseInt(this.value) || 50;
            if (departmentCircle) {
                departmentCircle.setRadius(newRadius);
            }
        });

        console.log('✅ Google Maps (edición) inicializado correctamente');
    } catch (error) {
        console.error('❌ Error inicializando Google Maps (edición):', error);
        mapContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">⚠️ Error cargando el mapa. Usa las coordenadas manuales.</div>';
    }
}

// Actualizar mapa desde inputs (modal edición)
function updateMapFromEditInputs() {
    const lat = parseFloat(document.getElementById('editDeptLat').value);
    const lng = parseFloat(document.getElementById('editDeptLng').value);

    if (!isNaN(lat) && !isNaN(lng) && departmentMarker && departmentMap && departmentCircle) {
        const newPos = { lat, lng };
        departmentMarker.setPosition(newPos);
        departmentCircle.setCenter(newPos);
        departmentMap.setCenter(newPos);
    }
}

// Actualizar departamento
async function updateDepartment(deptId) {
    const name = document.getElementById('editDeptName').value.trim();
    const description = document.getElementById('editDeptDescription').value.trim();
    const address = document.getElementById('editDeptAddress').value.trim();
    const lat = document.getElementById('editDeptLat').value;
    const lng = document.getElementById('editDeptLng').value;
    const radius = document.getElementById('editDeptRadius').value;

    // Recoger nuevos campos de GPS y kiosks
    const allowGpsAttendance = document.getElementById('editDeptAllowGpsAttendance')?.checked || false;
    const selectedKioskCheckboxes = document.querySelectorAll('.edit-dept-kiosk-checkbox:checked');
    const authorizedKiosks = Array.from(selectedKioskCheckboxes).map(cb => parseInt(cb.value));

    // Validaciones
    if (!name) {
        alert(await window.t('departments.validation.name_required'));
        document.getElementById('editDeptName').focus();
        return;
    }

    if (!radius || radius < 10 || radius > 1000) {
        alert(await window.t('departments.validation.radius_range'));
        document.getElementById('editDeptRadius').focus();
        return;
    }

    // Validación: Si GPS está habilitado, coordenadas son obligatorias
    if (allowGpsAttendance) {
        if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
            alert(await window.t('departments.validation.gps_coordinates_required'));
            return;
        }
    }

    // Validación: Al menos UNA opción debe estar habilitada
    if (!allowGpsAttendance && authorizedKiosks.length === 0) {
        alert(await window.t('departments.validation.at_least_one_option'));
        return;
    }

    // Preparar datos
    const deptData = {
        name,
        description,
        address,
        coverageRadius: parseInt(radius),
        gpsLocation: {
            lat: lat ? parseFloat(lat) : null,
            lng: lng ? parseFloat(lng) : null
        },
        allow_gps_attendance: allowGpsAttendance,
        authorized_kiosks: authorizedKiosks
    };
    
    try {
        const response = await fetch(`/api/v1/departments/${deptId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(deptData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert(await window.t('departments.messages.success_updated'));
            closeDepartmentModal();
            loadDepartments(); // Recargar lista
        } else {
            throw new Error(result.error || result.message || await window.t('departments.messages.error_unknown'));
        }

    } catch (error) {
        console.error('Error actualizando departamento:', error);
        alert(await window.t('departments.messages.error_updating') + ': ' + error.message);
    }
}

// Eliminar departamento
async function deleteDepartment(deptId) {
    const dept = currentDepartments.find(d => d.id == deptId);
    if (!dept) {
        alert(await window.t('departments.messages.not_found'));
        return;
    }

    const confirmTitle = await window.t('departments.confirm.delete_title', { name: dept.name });
    const confirmWarning = await window.t('departments.confirm.delete_warning');

    const confirmDelete = confirm(`${confirmTitle}\n\n${confirmWarning}`);

    if (!confirmDelete) return;

    try {
        const response = await fetch(`/api/v1/departments/${deptId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert(await window.t('departments.messages.success_deleted'));
            loadDepartments(); // Recargar lista
        } else {
            throw new Error(result.error || result.message || await window.t('departments.messages.error_unknown'));
        }

    } catch (error) {
        console.error('Error eliminando departamento:', error);
        alert(await window.t('departments.messages.error_deleting') + ': ' + error.message);
    }
}

// Exportar departamentos
async function exportDepartments() {
    if (!currentDepartments || currentDepartments.length === 0) {
        alert(await window.t('departments.messages.no_departments_to_export'));
        return;
    }

    // Crear contenido CSV
    const csvContent = "data:text/csv;charset=utf-8,"
        + "ID,Nombre,Descripcion,Direccion,Latitud,Longitud,Radio_Cobertura,Fecha_Creacion\n"
        + currentDepartments.map(dept => {
            const lat = dept.gpsLocation?.lat || '';
            const lng = dept.gpsLocation?.lng || '';
            const createdDate = new Date(dept.createdAt).toLocaleDateString('es-AR');

            return `${dept.id},"${dept.name}","${dept.description || ''}","${dept.address || ''}",${lat},${lng},${dept.coverageRadius},"${createdDate}"`;
        }).join("\n");

    // Crear enlace de descarga
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `departamentos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(await window.t('departments.messages.success_exported'));
}

// Cargar kiosks para selector
async function loadKiosksForSelector() {
    try {
        console.log('🔍 [DEPARTMENTS] Cargando kiosks para selector...');

        // Obtener token válido (intentar múltiples fuentes)
        let token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || window.authToken || authToken;

        if (!token) {
            console.warn('⚠️ [DEPARTMENTS] No hay token disponible');
            return [];
        }

        const response = await fetch('/api/v1/kiosks', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`❌ [DEPARTMENTS] HTTP ${response.status} al cargar kiosks`);
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.kiosks) {
            const activeKiosks = data.kiosks.filter(k => k.is_active || k.isActive);
            console.log(`✅ [DEPARTMENTS] ${activeKiosks.length} kiosks activos cargados`);
            return activeKiosks;
        }

        console.warn('⚠️ [DEPARTMENTS] Respuesta sin kiosks:', data);
        return [];
    } catch (error) {
        console.error('❌ [DEPARTMENTS] Error cargando kiosks:', error);
        return [];
    }
}

console.log('🏢 [DEPARTMENTS] Todas las funciones de departamentos cargadas');

// ✅ HACER FUNCIÓN DISPONIBLE GLOBALMENTE (Legacy)
window.showDepartmentsContent = showDepartmentsContent;

// ✅ EXPORTACIÓN UNIFICADA (Sistema de Auto-Conocimiento v3.0)
if (!window.Modules) window.Modules = {};
window.Modules.departments = {
    init: showDepartmentsContent
};
console.log('🧠 [DEPARTMENTS] Exportación unificada registrada: window.Modules.departments');
