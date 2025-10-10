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
                <h2>🏢 Gestión de Departamentos</h2>
                <div class="quick-actions">
                    <button class="btn btn-primary" onclick="showAddDepartment()">➕ Crear Departamento</button>
                    <button class="btn btn-success" onclick="loadDepartments()">📋 Lista de Departamentos</button>
                    <button class="btn btn-warning" onclick="showDepartmentStats()">📊 Estadísticas</button>
                    <button class="btn btn-info" onclick="exportDepartments()">📤 Exportar</button>
                </div>
                
                <div id="departments-container">
                    <h3>📋 Lista de Departamentos</h3>
                    <div id="departments-list" class="server-info">
                        Presiona "Lista de Departamentos" para cargar...
                    </div>
                </div>
                
                <div id="dept-stats" class="stats-grid" style="margin-top: 20px;">
                    <div class="stat-item">
                        <div class="stat-value" id="total-departments">--</div>
                        <div class="stat-label">Departamentos Totales</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="gps-enabled-departments">--</div>
                        <div class="stat-label">Con GPS Configurado</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="avg-coverage-radius">--</div>
                        <div class="stat-label">Radio Promedio (m)</div>
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
    container.innerHTML = '🔄 Cargando departamentos...';
    
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
            throw new Error(data.message || 'Error desconocido');
        }
        
    } catch (error) {
        console.error('Error cargando departamentos:', error);
        container.innerHTML = `
            <div style="color: #f44336; padding: 20px; text-align: center;">
                <h3>❌ Error cargando departamentos</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadDepartments()">🔄 Reintentar</button>
            </div>
        `;
    } finally {
        isLoadingDepartments = false;
    }
}

// Mostrar lista de departamentos
function displayDepartmentsList(departments) {
    const container = document.getElementById('departments-list');
    if (!container) return;
    
    if (!departments || departments.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <h3>📂 No hay departamentos</h3>
                <p>Crea el primer departamento usando el botón "Crear Departamento"</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="users-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead class="table-dark">
                    <tr>
                        <th>🏢 Nombre</th>
                        <th>📝 Descripción</th>
                        <th>📍 Dirección</th>
                        <th>🗺️ GPS</th>
                        <th>📏 Radio (m)</th>
                        <th>📅 Creado</th>
                        <th>⚙️ Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    departments.forEach(dept => {
        const hasGPS = dept.gpsLocation?.lat && dept.gpsLocation?.lng;
        const gpsDisplay = hasGPS 
            ? `✅ ${dept.gpsLocation.lat.toFixed(6)}, ${dept.gpsLocation.lng.toFixed(6)}`
            : '❌ Sin configurar';
        
        const createdDate = new Date(dept.createdAt).toLocaleDateString('es-AR');
        
        html += `
            <tr>
                <td style="font-weight: bold; min-width: 120px;">${dept.name}</td>
                <td style="min-width: 250px; font-size: 0.9em;">${dept.description || 'Sin descripción'}</td>
                <td style="min-width: 200px; font-size: 0.9em;">${dept.address || 'Sin dirección'}</td>
                <td style="min-width: 150px;"><span style="font-size: 11px;">${gpsDisplay}</span></td>
                <td style="text-align: center; min-width: 80px;">
                    <span style="background: ${hasGPS ? '#4CAF50' : '#FFC107'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                        ${dept.coverageRadius}m
                    </span>
                </td>
                <td style="min-width: 90px; font-size: 0.85em;">${createdDate}</td>
                <td style="text-align: center; width: 80px;">
                    <div style="display: flex; flex-direction: column; gap: 1px; align-items: center;">
                        <button class="btn-mini btn-info" onclick="viewDepartment('${dept.id}')" title="Ver">👁️</button>
                        <button class="btn-mini btn-warning" onclick="editDepartment('${dept.id}')" title="Editar">✏️</button>
                        <button class="btn-mini btn-danger" onclick="deleteDepartment('${dept.id}')" title="Eliminar">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h4>📋 Leyenda:</h4>
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <span>✅ GPS Configurado</span>
                <span>❌ GPS Sin configurar</span>
                <span>📏 Radio de cobertura en metros</span>
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
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;';
    
    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="margin: 0; color: #333;">🏢 Crear Nuevo Departamento</h2>
                <button onclick="closeDepartmentModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">✖️</button>
            </div>
            
            <div id="branchSelectorContainer" style="margin-bottom: 20px; display: none;">
                <label><strong>🏛️ Sucursal *:</strong></label>
                <select id="newDeptBranch" style="width: 100%; padding: 12px; margin-top: 8px; border: 1px solid #ddd; border-radius: 8px;">
                    <option value="">Seleccione una sucursal...</option>
                </select>
                <small style="color: #666; display: block; margin-top: 5px;">
                    🏢 La empresa tiene múltiples sucursales. Seleccione a cuál pertenece este departamento.
                </small>
            </div>

            <div style="margin-bottom: 20px;">
                <label><strong>🏢 Nombre del Departamento *:</strong></label>
                <input type="text" id="newDeptName" style="width: 100%; padding: 12px; margin-top: 8px; border: 1px solid #ddd; border-radius: 8px;" placeholder="Ej: IT, RRHH, Ventas">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label><strong>📝 Descripción:</strong></label>
                <textarea id="newDeptDescription" style="width: 100%; padding: 12px; margin-top: 8px; border: 1px solid #ddd; border-radius: 8px; rows: 3;" placeholder="Descripción del departamento"></textarea>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label><strong>📍 Dirección física:</strong></label>
                <input type="text" id="newDeptAddress" style="width: 100%; padding: 12px; margin-top: 8px; border: 1px solid #ddd; border-radius: 8px;" placeholder="Ej: Oficina Principal - Piso 2">
            </div>
            
            <!-- Checkbox: Permitir GPS desde APK -->
            <div style="margin-bottom: 25px; padding: 20px; background: #e8f5e9; border-radius: 8px; border-left: 4px solid #4caf50;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">
                    <input type="checkbox" id="deptAllowGpsAttendance" style="width: 20px; height: 20px; cursor: pointer;">
                    <span>📱 Permitir marcado por GPS desde APK Empleado</span>
                </label>
                <small style="color: #666; display: block; margin-left: 30px;">
                    Si se activa, los empleados podrán marcar asistencia desde su celular (APK) cuando estén dentro del radio de cobertura del departamento
                </small>
            </div>

            <!-- Sección GPS (solo visible si se permite GPS) -->
            <div id="gpsConfigSection" style="display: none; margin-bottom: 25px; padding: 20px; background: #f0f8ff; border-radius: 8px;">
                <label><strong>📍 Ubicación GPS del Departamento:</strong></label>
                <small style="color: #666; display: block; margin-bottom: 15px;">
                    ⚠️ Selecciona la ubicación EXACTA del departamento físico (no tu ubicación actual). Usa el mapa o ingresa coordenadas manualmente.
                </small>

                <!-- Mapa Google Maps -->
                <div id="departmentMap" style="width: 100%; height: 300px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 15px; position: relative;">
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #999;">
                        🗺️ Cargando Google Maps...
                    </div>
                </div>

                <!-- Coordenadas manuales + Radio -->
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-size: 13px; color: #555; font-weight: bold;">Latitud:</label>
                        <input type="number" id="newDeptLat" step="0.00000001" placeholder="-34.603722" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-top: 5px;">
                    </div>
                    <div>
                        <label style="font-size: 13px; color: #555; font-weight: bold;">Longitud:</label>
                        <input type="number" id="newDeptLng" step="0.00000001" placeholder="-58.381592" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-top: 5px;">
                    </div>
                    <div>
                        <label style="font-size: 13px; color: #555; font-weight: bold;">📏 Radio (m):</label>
                        <input type="number" id="newDeptRadius" min="10" max="1000" value="50" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-top: 5px;">
                    </div>
                </div>

                <div style="padding: 12px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
                    <small style="color: #856404;">
                        💡 <strong>Tip:</strong> Arrastra el marcador 📍 en el mapa para ajustar la ubicación. El círculo amarillo muestra el radio de cobertura (área donde se puede marcar).
                    </small>
                </div>
            </div>

            <!-- Sección Kiosks Autorizados -->
            <div style="margin-bottom: 25px; padding: 20px; background: #e3f2fd; border-radius: 8px;">
                <label><strong>🖥️ Kiosks Físicos Autorizados (opcional):</strong></label>
                <small style="color: #666; display: block; margin-bottom: 12px;">
                    📍 Selecciona en qué kiosks físicos los empleados pueden marcar asistencia (además del GPS si está habilitado)
                </small>

                <div id="deptKiosksCheckboxContainer" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 12px; background: white; border-radius: 5px;">
                    <p style="margin: 0; color: #999;">Cargando kiosks...</p>
                </div>

                <div style="margin-top: 12px; padding: 10px; background: #e1f5fe; border-radius: 5px;">
                    <small style="color: #01579b;">
                        ℹ️ <strong>Modo Mixto:</strong> Puedes activar GPS + Kiosks. Los empleados podrán usar cualquier opción habilitada.
                    </small>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 30px;">
                <button class="btn btn-secondary" onclick="closeDepartmentModal()">❌ Cancelar</button>
                <button class="btn btn-primary" onclick="saveNewDepartment()">💾 Crear Departamento</button>
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
        // Agregar checkbox "Todos los kiosks"
        let checkboxesHTML = `
            <div style="margin-bottom: 12px; padding: 8px; background: #e8f5e9; border-radius: 4px; border-left: 3px solid #4caf50;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: bold;">
                    <input type="checkbox" id="deptAllKiosks" class="dept-kiosk-all" style="width: 18px; height: 18px; cursor: pointer;">
                    <span>✅ Todos los kiosks</span>
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
        kioskContainer.innerHTML = '<p style="margin: 0; color: #999;">No hay kiosks disponibles</p>';
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
function getCurrentLocation() {
    if (!navigator.geolocation) {
        alert('❌ Tu navegador no soporta geolocalización');
        return;
    }
    
    const latInput = document.getElementById('newDeptLat') || document.getElementById('editDeptLat');
    const lngInput = document.getElementById('newDeptLng') || document.getElementById('editDeptLng');
    
    if (!latInput || !lngInput) return;
    
    // Mostrar estado de carga
    latInput.placeholder = 'Obteniendo ubicación...';
    lngInput.placeholder = 'Obteniendo ubicación...';
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            latInput.value = position.coords.latitude.toFixed(6);
            lngInput.value = position.coords.longitude.toFixed(6);
            latInput.placeholder = 'Latitud';
            lngInput.placeholder = 'Longitud';
            alert('✅ Ubicación obtenida correctamente');
        },
        (error) => {
            console.error('Error obteniendo ubicación:', error);
            latInput.placeholder = 'Error obteniendo ubicación';
            lngInput.placeholder = 'Error obteniendo ubicación';
            alert('❌ Error obteniendo ubicación: ' + error.message);
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
        alert('❌ Debe seleccionar una sucursal. La empresa tiene múltiples sucursales.');
        branchSelect.focus();
        return;
    }

    if (!name) {
        alert('❌ El nombre del departamento es obligatorio');
        document.getElementById('newDeptName').focus();
        return;
    }
    
    if (name.length < 2) {
        alert('❌ El nombre debe tener al menos 2 caracteres');
        document.getElementById('newDeptName').focus();
        return;
    }

    // Validar que al menos UNA opción esté habilitada
    if (!allowGpsAttendance && authorizedKiosks.length === 0) {
        alert('❌ Debe habilitar al menos UNA opción:\n- Permitir GPS desde APK, O\n- Seleccionar al menos un kiosk físico autorizado');
        return;
    }

    // Si se permite GPS, validar coordenadas y radio
    if (allowGpsAttendance) {
        if (!lat || !lng) {
            alert('❌ Si permites GPS, debes ingresar las coordenadas de ubicación del departamento.\nUsa el mapa o ingresa las coordenadas manualmente.');
            document.getElementById('newDeptLat').focus();
            return;
        }
        if (!radius || radius < 10 || radius > 1000) {
            alert('❌ Si permites GPS, el radio de cobertura debe estar entre 10 y 1000 metros');
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
            alert('✅ Departamento creado exitosamente');
            closeDepartmentModal();
            loadDepartments(); // Recargar lista
        } else {
            throw new Error(result.error || result.message || 'Error desconocido');
        }
        
    } catch (error) {
        console.error('Error creando departamento:', error);
        alert('❌ Error creando departamento: ' + error.message);
    }
}

// Ver departamento
function viewDepartment(deptId) {
    const dept = currentDepartments.find(d => d.id == deptId);
    if (!dept) {
        alert('❌ Departamento no encontrado');
        return;
    }
    
    const hasGPS = dept.gpsLocation?.lat && dept.gpsLocation?.lng;
    
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
                <div><strong>📝 Descripción:</strong><br>${dept.description || 'Sin descripción'}</div>
                <div><strong>📍 Dirección:</strong><br>${dept.address || 'Sin dirección'}</div>
                <div><strong>🗺️ Ubicación GPS:</strong><br>${hasGPS ? `✅ ${dept.gpsLocation.lat.toFixed(6)}, ${dept.gpsLocation.lng.toFixed(6)}` : '❌ Sin configurar'}</div>
                <div><strong>📏 Radio de cobertura:</strong><br>${dept.coverageRadius} metros</div>
                <div><strong>📅 Creado:</strong><br>${new Date(dept.createdAt).toLocaleString('es-AR')}</div>
                ${dept.updatedAt ? `<div><strong>📝 Última modificación:</strong><br>${new Date(dept.updatedAt).toLocaleString('es-AR')}</div>` : ''}
            </div>
            
            ${hasGPS ? `
                <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 8px;">
                    <h4>🗺️ Ubicación en el mapa</h4>
                    <p>📍 Coordenadas: ${dept.gpsLocation.lat.toFixed(6)}, ${dept.gpsLocation.lng.toFixed(6)}</p>
                    <a href="https://www.google.com/maps?q=${dept.gpsLocation.lat},${dept.gpsLocation.lng}" target="_blank" class="btn btn-info btn-sm">
                        🗺️ Ver en Google Maps
                    </a>
                </div>
            ` : ''}
            
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 30px;">
                <button class="btn btn-warning" onclick="closeDepartmentModal(); editDepartment('${dept.id}')">✏️ Editar</button>
                <button class="btn btn-secondary" onclick="closeDepartmentModal()">✖️ Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Editar departamento
function editDepartment(deptId) {
    const dept = currentDepartments.find(d => d.id == deptId);
    if (!dept) {
        alert('❌ Departamento no encontrado');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;';
    
    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="margin: 0; color: #333;">✏️ Editar Departamento</h2>
                <button onclick="closeDepartmentModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">✖️</button>
            </div>

            <div style="margin-bottom: 20px;">
                <label><strong>🏢 Nombre del Departamento *:</strong></label>
                <input type="text" id="editDeptName" value="${dept.name}" style="width: 100%; padding: 12px; margin-top: 8px; border: 1px solid #ddd; border-radius: 8px;">
            </div>

            <div style="margin-bottom: 20px;">
                <label><strong>📝 Descripción:</strong></label>
                <textarea id="editDeptDescription" style="width: 100%; padding: 12px; margin-top: 8px; border: 1px solid #ddd; border-radius: 8px;" rows="3">${dept.description || ''}</textarea>
            </div>

            <div style="margin-bottom: 20px;">
                <label><strong>📍 Dirección física:</strong></label>
                <input type="text" id="editDeptAddress" value="${dept.address || ''}" style="width: 100%; padding: 12px; margin-top: 8px; border: 1px solid #ddd; border-radius: 8px;">
            </div>

            <!-- Checkbox: Permitir GPS desde APK -->
            <div style="margin-bottom: 25px; padding: 20px; background: #e8f5e9; border-radius: 8px; border-left: 4px solid #4caf50;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">
                    <input type="checkbox" id="editDeptAllowGpsAttendance" style="width: 20px; height: 20px; cursor: pointer;" ${dept.allow_gps_attendance || dept.allowGpsAttendance ? 'checked' : ''}>
                    <span>📱 Permitir marcado por GPS desde APK Empleado</span>
                </label>
                <small style="color: #666; display: block; margin-left: 30px;">
                    Si se activa, los empleados podrán marcar asistencia desde su celular (APK) cuando estén dentro del radio de cobertura del departamento
                </small>
            </div>

            <!-- Sección GPS (solo visible si se permite GPS) -->
            <div id="editGpsConfigSection" style="display: ${dept.allow_gps_attendance || dept.allowGpsAttendance ? 'block' : 'none'}; margin-bottom: 25px; padding: 20px; background: #f0f8ff; border-radius: 8px;">
                <label><strong>📍 Ubicación GPS del Departamento:</strong></label>
                <small style="color: #666; display: block; margin-bottom: 15px;">
                    ⚠️ Selecciona la ubicación EXACTA del departamento físico (no tu ubicación actual). Usa el mapa o ingresa coordenadas manualmente.
                </small>

                <!-- Mapa Google Maps -->
                <div id="editDepartmentMap" style="width: 100%; height: 300px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 15px; position: relative;">
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #999;">
                        🗺️ Cargando Google Maps...
                    </div>
                </div>

                <!-- Coordenadas manuales + Radio -->
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-size: 13px; color: #555; font-weight: bold;">Latitud:</label>
                        <input type="number" id="editDeptLat" step="0.00000001" value="${dept.gpsLocation?.lat || ''}" placeholder="-34.603722" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-top: 5px;">
                    </div>
                    <div>
                        <label style="font-size: 13px; color: #555; font-weight: bold;">Longitud:</label>
                        <input type="number" id="editDeptLng" step="0.00000001" value="${dept.gpsLocation?.lng || ''}" placeholder="-58.381592" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-top: 5px;">
                    </div>
                    <div>
                        <label style="font-size: 13px; color: #555; font-weight: bold;">📏 Radio (m):</label>
                        <input type="number" id="editDeptRadius" min="10" max="1000" value="${dept.coverageRadius || 50}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-top: 5px;">
                    </div>
                </div>

                <div style="padding: 12px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
                    <small style="color: #856404;">
                        💡 <strong>Tip:</strong> Arrastra el marcador 📍 en el mapa para ajustar la ubicación. El círculo amarillo muestra el radio de cobertura (área donde se puede marcar).
                    </small>
                </div>
            </div>

            <!-- Sección Kiosks Autorizados -->
            <div style="margin-bottom: 25px; padding: 20px; background: #e3f2fd; border-radius: 8px;">
                <label><strong>🖥️ Kiosks Físicos Autorizados (opcional):</strong></label>
                <small style="color: #666; display: block; margin-bottom: 12px;">
                    📍 Selecciona en qué kiosks físicos los empleados pueden marcar asistencia (además del GPS si está habilitado)
                </small>

                <div id="editDeptKiosksCheckboxContainer" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 12px; background: white; border-radius: 5px;">
                    <p style="margin: 0; color: #999;">Cargando kiosks...</p>
                </div>

                <div style="margin-top: 12px; padding: 10px; background: #e1f5fe; border-radius: 5px;">
                    <small style="color: #01579b;">
                        ℹ️ <strong>Modo Mixto:</strong> Puedes activar GPS + Kiosks. Los empleados podrán usar cualquier opción habilitada.
                    </small>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 30px;">
                <button class="btn btn-secondary" onclick="closeDepartmentModal()">❌ Cancelar</button>
                <button class="btn btn-primary" onclick="updateDepartment('${dept.id}')">💾 Guardar Cambios</button>
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

            // Agregar checkbox "Todos los kiosks"
            let checkboxesHTML = `
                <div style="margin-bottom: 12px; padding: 8px; background: #e8f5e9; border-radius: 4px; border-left: 3px solid #4caf50;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: bold;">
                        <input type="checkbox" id="editDeptAllKiosks" class="edit-dept-kiosk-all" style="width: 18px; height: 18px; cursor: pointer;">
                        <span>✅ Todos los kiosks</span>
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
            kioskContainer.innerHTML = '<p style="margin: 0; color: #999;">No hay kiosks disponibles</p>';
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
        alert('❌ El nombre del departamento es obligatorio');
        document.getElementById('editDeptName').focus();
        return;
    }

    if (!radius || radius < 10 || radius > 1000) {
        alert('❌ El radio de cobertura debe estar entre 10 y 1000 metros');
        document.getElementById('editDeptRadius').focus();
        return;
    }

    // Validación: Si GPS está habilitado, coordenadas son obligatorias
    if (allowGpsAttendance) {
        if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
            alert('❌ Si habilita marcado por GPS, debe proporcionar coordenadas válidas.');
            return;
        }
    }

    // Validación: Al menos UNA opción debe estar habilitada
    if (!allowGpsAttendance && authorizedKiosks.length === 0) {
        alert('❌ Debe habilitar al menos UNA opción:\n- Marcado por GPS desde APK\n- Al menos un kiosk autorizado');
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
            alert('✅ Departamento actualizado exitosamente');
            closeDepartmentModal();
            loadDepartments(); // Recargar lista
        } else {
            throw new Error(result.error || result.message || 'Error desconocido');
        }
        
    } catch (error) {
        console.error('Error actualizando departamento:', error);
        alert('❌ Error actualizando departamento: ' + error.message);
    }
}

// Eliminar departamento
async function deleteDepartment(deptId) {
    const dept = currentDepartments.find(d => d.id == deptId);
    if (!dept) {
        alert('❌ Departamento no encontrado');
        return;
    }
    
    const confirmDelete = confirm(
        `❓ ¿Estás seguro de que deseas eliminar el departamento "${dept.name}"?\n\n` +
        `⚠️ ATENCIÓN: Esta acción no se puede deshacer.\n` +
        `Los usuarios asignados a este departamento quedarán sin departamento asignado.`
    );
    
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
            alert('✅ Departamento eliminado exitosamente');
            loadDepartments(); // Recargar lista
        } else {
            throw new Error(result.error || result.message || 'Error desconocido');
        }
        
    } catch (error) {
        console.error('Error eliminando departamento:', error);
        alert('❌ Error eliminando departamento: ' + error.message);
    }
}

// Exportar departamentos
function exportDepartments() {
    if (!currentDepartments || currentDepartments.length === 0) {
        alert('❌ No hay departamentos para exportar');
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
    
    alert('✅ Departamentos exportados exitosamente');
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
// ✅ HACER FUNCIÓN DISPONIBLE GLOBALMENTE
window.showDepartmentsContent = showDepartmentsContent;
