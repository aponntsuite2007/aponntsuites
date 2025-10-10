// Kiosks Module - Gestión de kioscos físicos de control de asistencia
console.log('📟 [KIOSKS] Módulo de kioscos cargado');

// Variables globales (usar var para evitar error de redeclaración si se recarga el módulo)
if (typeof window.kiosksList === 'undefined') {
    window.kiosksList = [];
}
if (typeof window.editingKiosk === 'undefined') {
    window.editingKiosk = null;
}

// Referencias locales
var kiosksList = window.kiosksList;
var editingKiosk = window.editingKiosk;

// Función principal para mostrar contenido del módulo
async function showKiosksContent() {
    console.log('📟 [KIOSKS] Mostrando contenido de kioscos');

    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="module-container">
            <div class="module-header">
                <div class="module-header-text">
                    <h2>📟 Gestión de Kioscos</h2>
                    <p>Administra los kioscos físicos para control de asistencia</p>
                </div>
                <div class="module-header-actions" style="display: flex; gap: 10px;">
                    <a href="/downloads/kiosk-app.apk" download class="btn btn-success btn-sm" style="text-decoration: none;">
                        📱 Descargar APK Kiosko
                    </a>
                    <button onclick="showAddKioskModal()" class="btn btn-primary btn-sm">
                        ➕ Nuevo Kiosko
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>📟 Nombre</th>
                                    <th>📍 Ubicación</th>
                                    <th>🔧 Device ID</th>
                                    <th>📡 GPS</th>
                                    <th>✅ Configurado</th>
                                    <th>🟢 Estado</th>
                                    <th>⚙️ Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="kiosksTableBody">
                                <tr>
                                    <td colspan="7" class="text-center">
                                        <div class="spinner-border" role="status">
                                            <span class="visually-hidden">Cargando...</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal para Agregar/Editar Kiosko -->
        <div class="modal fade" id="kioskModal" tabindex="-1" style="z-index: 9999; display: none;" aria-hidden="true">
            <div class="modal-dialog modal-lg" style="margin: 30px auto 20px; max-width: 800px;">
                <div class="modal-content" style="max-height: calc(100vh - 60px); display: flex; flex-direction: column;">
                    <div class="modal-header" style="flex-shrink: 0; padding: 1rem;">
                        <h5 class="modal-title" id="kioskModalTitle">Nuevo Kiosko</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" onclick="closeModal('kioskModal')" aria-label="Cerrar"></button>
                    </div>
                    <div class="modal-body" style="overflow-y: auto; flex: 1 1 auto; padding: 1rem;">
                        <form id="kioskForm">
                            <div class="mb-3">
                                <label class="form-label">Nombre del Kiosko *</label>
                                <input type="text" class="form-control" id="kioskName" required>
                                <small class="form-text text-muted">Ej: Recepción Principal, Planta 2, etc.</small>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">Descripción General</label>
                                <textarea class="form-control" id="kioskDescription" rows="2" placeholder="Descripción breve del kiosko"></textarea>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">📍 Ubicación Física *</label>
                                <textarea class="form-control" id="kioskLocation" rows="3" required placeholder="Ej: Kiosko ubicado en nave norte sobre calle Leguizamón, al lado de la entrada principal"></textarea>
                                <small class="form-text text-muted">Descripción detallada de dónde está ubicado físicamente el kiosko</small>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">Device ID (Opcional)</label>
                                <input type="text" class="form-control" id="kioskDeviceId" placeholder="Se auto-completa cuando el kiosko se conecta">
                                <small class="form-text text-muted">Identificador único del dispositivo (MAC, serial, etc.)</small>
                            </div>

                            <div class="alert alert-info" id="gpsInfoSection" style="display: none;">
                                <strong>📍 Coordenadas GPS</strong><br>
                                <div class="row mt-2">
                                    <div class="col-md-6">
                                        <label class="form-label">Latitud</label>
                                        <input type="text" class="form-control" id="kioskLatDisplay" readonly>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Longitud</label>
                                        <input type="text" class="form-control" id="kioskLngDisplay" readonly>
                                    </div>
                                </div>
                                <small class="text-muted mt-2 d-block">Las coordenadas GPS se capturan automáticamente cuando el kiosko físico se conecta por primera vez.</small>
                            </div>

                            <div class="alert alert-warning">
                                <strong>ℹ️ Importante</strong><br>
                                Las coordenadas GPS se configurarán automáticamente cuando instale el dispositivo kiosko en su ubicación física y este se conecte al sistema.
                            </div>

                            <div class="mb-3" style="background: #e8f5e9; padding: 15px; border-radius: 8px;">
                                <label class="form-label"><strong>👥 Departamentos Autorizados Extra (Opcional)</strong></label>
                                <div id="kioskDepartmentsCheckboxes" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; background: white; border-radius: 5px;">
                                    <p class="text-muted" style="margin: 0;">Cargando departamentos...</p>
                                </div>
                                <small class="form-text text-muted d-block mt-2">
                                    📍 Selecciona qué departamentos pueden usar este kiosk además de su kiosk por defecto
                                </small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer" style="flex-shrink: 0; padding: 0.75rem 1rem;">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" onclick="closeModal('kioskModal')">Cancelar</button>
                        <button type="button" onclick="saveKiosk()" class="btn btn-primary">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Agregar estilos para el módulo y modal
    if (!document.getElementById('kiosk-modal-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'kiosk-modal-styles';
        styleElement.textContent = `
            /* Estilos del header del módulo */
            .module-header {
                display: flex !important;
                justify-content: space-between !important;
                align-items: flex-start !important;
                gap: 2rem !important;
                margin-bottom: 1.5rem !important;
                padding: 1.25rem 1.5rem !important;
                background: #f8f9fa;
                border-radius: 8px;
            }
            .module-header-text {
                flex: 1;
                min-width: 0;
            }
            .module-header h2 {
                margin: 0 0 0.5rem 0 !important;
                font-size: 1.5rem !important;
                font-weight: 600 !important;
                line-height: 1.3 !important;
            }
            .module-header p {
                margin: 0 !important;
                color: #6c757d;
                font-size: 0.9rem !important;
                line-height: 1.5 !important;
                max-width: 500px;
            }
            .module-header-actions {
                flex-shrink: 0;
                display: flex;
                align-items: flex-start;
                padding-top: 0.25rem;
            }

            /* Estilos del modal */
            .modal-backdrop {
                z-index: 9998 !important;
            }
            #kioskModal {
                z-index: 9999 !important;
            }
            /* FORZAR cierre inicial del modal */
            #kioskModal:not(.force-show) {
                display: none !important;
                opacity: 0 !important;
            }
        `;
        document.head.appendChild(styleElement);
    }

    // Cargar kioscos
    await loadKiosks();

    // IMPORTANTE: Asegurar que el modal esté cerrado al inicio
    const kioskModal = document.getElementById('kioskModal');
    if (kioskModal) {
        kioskModal.classList.remove('show');
        kioskModal.style.setProperty('display', 'none', 'important');
        kioskModal.setAttribute('aria-hidden', 'true');

        // Limpiar cualquier backdrop residual
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());

        console.log('✅ [KIOSKS] Modal asegurado como cerrado al inicio');

        // AGREGAR LISTENERS PARA DETECTAR APERTURA AUTOMÁTICA
        setTimeout(() => {
            console.log('🔍 [KIOSKS] Verificando estado del modal después de 500ms');
            if (kioskModal.classList.contains('show') || kioskModal.style.display !== 'none') {
                console.error('⚠️ [KIOSKS] EL MODAL SE ABRIÓ AUTOMÁTICAMENTE!');
                console.log('Clases del modal:', kioskModal.className);
                console.log('Display del modal:', kioskModal.style.display);
            } else {
                console.log('✅ [KIOSKS] Modal sigue cerrado correctamente');
            }
        }, 500);
    }
}

// Helper para obtener token válido
async function getValidToken() {
    // Intentar obtener token de localStorage o sessionStorage
    let token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || window.authToken;

    if (!token) {
        console.log('🔑 [KIOSKS] No hay token, ejecutando auto-login...');
        // Si hay función de auto-login disponible, usarla
        if (typeof initializeAdmin === 'function') {
            await initializeAdmin();
            token = localStorage.getItem('authToken') || window.authToken;
        }
    }

    return token;
}

// Cargar lista de kioscos desde API
async function loadKiosks() {
    try {
        console.log('📟 [KIOSKS] Cargando kioscos desde API...');

        // Obtener token válido
        const token = await getValidToken();
        if (!token) {
            throw new Error('No se pudo obtener token de autenticación');
        }

        const response = await fetch('/api/v1/kiosks', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Error cargando kioscos');
        }

        kiosksList = data.kiosks || [];
        console.log(`✅ [KIOSKS] Cargados ${kiosksList.length} kioscos`);

        renderKiosksTable();

    } catch (error) {
        console.error('❌ [KIOSKS] Error cargando kioscos:', error);

        const tbody = document.getElementById('kiosksTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        Error cargando kioscos: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

// Renderizar tabla de kioscos
function renderKiosksTable() {
    const tbody = document.getElementById('kiosksTableBody');
    if (!tbody) return;

    if (kiosksList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    No hay kioscos registrados. Haz clic en "Nuevo Kiosko" para agregar uno.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = kiosksList.map(kiosk => {
        const locationText = kiosk.location || (kiosk.description || '--');

        const gpsText = kiosk.gpsLocation?.lat && kiosk.gpsLocation?.lng
            ? `<span class="badge bg-success" title="GPS configurado">✓ GPS</span>`
            : '<span class="badge bg-secondary" title="GPS pendiente">--</span>';

        const configuredBadge = kiosk.isConfigured
            ? '<span class="badge bg-success">Sí</span>'
            : '<span class="badge bg-warning">No</span>';

        const statusBadge = kiosk.isActive
            ? '<span class="badge bg-success">Activo</span>'
            : '<span class="badge bg-secondary">Inactivo</span>';

        return `
            <tr>
                <td><strong>${kiosk.name}</strong></td>
                <td style="max-width: 300px;">${locationText}</td>
                <td>${kiosk.deviceId || '<span class="text-muted">Pendiente</span>'}</td>
                <td>${gpsText}</td>
                <td>${configuredBadge}</td>
                <td>${statusBadge}</td>
                <td>
                    <button onclick="viewKiosk(${kiosk.id})" class="btn btn-sm btn-info" title="Ver detalles">
                        👁️
                    </button>
                    <button onclick="editKiosk(${kiosk.id})" class="btn btn-sm btn-primary" title="Editar">
                        ✏️
                    </button>
                    <button onclick="deleteKiosk(${kiosk.id})" class="btn btn-sm btn-danger" title="Eliminar">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Cargar departamentos para checkboxes (multi-select)
async function loadDepartmentsForCheckboxes() {
    try {
        console.log('👥 [KIOSKS] Cargando departamentos para checkboxes...');

        const token = await getValidToken();
        if (!token) {
            throw new Error('No se pudo obtener token de autenticación');
        }

        const response = await fetch('/api/v1/departments', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.departments) {
            const activeDepts = data.departments.filter(d => d.is_active);
            console.log(`✅ [KIOSKS] ${activeDepts.length} departamentos activos cargados para checkboxes`);
            return activeDepts;
        }

        return [];
    } catch (error) {
        console.error('❌ [KIOSKS] Error cargando departamentos:', error);
        return [];
    }
}

// Poblar checkboxes de departamentos en modal kiosk
async function populateKioskDepartmentCheckboxes(selectedDepartmentIds = []) {
    const container = document.getElementById('kioskDepartmentsCheckboxes');
    if (!container) {
        console.warn('⚠️ [KIOSKS] Container kioskDepartmentsCheckboxes no encontrado');
        return;
    }

    // Mostrar loading
    container.innerHTML = '<p class="text-muted" style="margin: 0;">Cargando departamentos...</p>';

    const departments = await loadDepartmentsForCheckboxes();

    if (departments.length === 0) {
        container.innerHTML = '<p class="text-muted" style="margin: 0;">No hay departamentos disponibles</p>';
        return;
    }

    // Generar checkboxes
    container.innerHTML = departments.map(dept => {
        const isChecked = selectedDepartmentIds.includes(dept.id);
        return `
            <div class="form-check" style="margin-bottom: 8px;">
                <input class="form-check-input" type="checkbox" value="${dept.id}"
                       id="dept_${dept.id}" ${isChecked ? 'checked' : ''}>
                <label class="form-check-label" for="dept_${dept.id}">
                    ${dept.name}
                </label>
            </div>
        `;
    }).join('');

    console.log(`✅ [KIOSKS] ${departments.length} departamentos renderizados como checkboxes (${selectedDepartmentIds.length} pre-seleccionados)`);
}

// Helper para abrir modal (compatible con Bootstrap 3, 4, 5 y jQuery)
function openModal(modalId) {
    console.log('🔓 [KIOSKS] openModal() llamado para:', modalId);
    console.trace('Stack trace de apertura:');

    const modalEl = document.getElementById(modalId);

    // AGREGAR CLASE PARA FORZAR VISIBILIDAD
    modalEl.classList.add('force-show');

    if (typeof $ !== 'undefined' && $.fn.modal) {
        // jQuery + Bootstrap
        $('#' + modalId).modal('show');
    } else if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        // Bootstrap 5 nativo
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } else {
        // Fallback manual
        modalEl.classList.add('show');
        modalEl.style.setProperty('display', 'block', 'important');
        document.body.classList.add('modal-open');
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);
    }
}

// Helper para cerrar modal (compatible con Bootstrap 3, 4, 5 y jQuery)
function closeModal(modalId) {
    const modalEl = document.getElementById(modalId);

    console.log('🔒 [KIOSKS] Cerrando modal:', modalId);

    // REMOVER CLASE FORCE-SHOW INMEDIATAMENTE
    modalEl.classList.remove('force-show');

    // Intentar con jQuery si está disponible
    if (typeof $ !== 'undefined' && $.fn && $.fn.modal) {
        try {
            $('#' + modalId).modal('hide');
            console.log('✅ [KIOSKS] Modal cerrado con jQuery');
        } catch (e) {
            console.warn('⚠️ jQuery modal.hide falló:', e);
        }
    }

    // Intentar con Bootstrap nativo si está disponible
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        try {
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) {
                modalInstance.hide();
                console.log('✅ [KIOSKS] Modal cerrado con Bootstrap (getInstance)');
            }
        } catch (e) {
            console.warn('⚠️ Bootstrap getInstance falló:', e);
        }
    }

    // Fallback manual SIEMPRE (por si los otros fallan)
    setTimeout(() => {
        console.log('🔧 [KIOSKS] Ejecutando cierre manual forzado');

        // Remover clases y display
        modalEl.classList.remove('show');
        modalEl.classList.remove('force-show'); // Por si acaso
        modalEl.style.setProperty('display', 'none', 'important');
        modalEl.setAttribute('aria-hidden', 'true');
        modalEl.removeAttribute('aria-modal');

        // Limpiar body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        // Remover TODOS los backdrops
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => {
            backdrop.remove();
        });

        console.log('✅ [KIOSKS] Modal cerrado manualmente (forzado)');
    }, 100);
}

// Mostrar modal para agregar kiosko
async function showAddKioskModal() {
    console.log('🔔 [KIOSKS] showAddKioskModal() llamado');
    console.trace('Stack trace:'); // Para ver desde dónde se llama

    editingKiosk = null;
    document.getElementById('kioskModalTitle').textContent = 'Nuevo Kiosko';
    document.getElementById('kioskForm').reset();

    // Ocultar sección GPS para nuevo kiosko
    document.getElementById('gpsInfoSection').style.setProperty('display', 'none', 'important');

    // Habilitar campos para nuevo registro
    document.getElementById('kioskName').disabled = false;
    document.getElementById('kioskDescription').disabled = false;
    document.getElementById('kioskLocation').disabled = false;
    document.getElementById('kioskDeviceId').disabled = false;

    // Mostrar botón guardar
    const saveBtn = document.querySelector('#kioskModal button[onclick="saveKiosk()"]');
    if (saveBtn) saveBtn.style.display = '';

    openModal('kioskModal');

    // Poblar checkboxes de departamentos (sin pre-seleccionar ninguno)
    await populateKioskDepartmentCheckboxes([]);
}

// Editar kiosko
async function editKiosk(kioskId) {
    const kiosk = kiosksList.find(k => k.id === kioskId);
    if (!kiosk) {
        alert('Kiosko no encontrado');
        return;
    }

    editingKiosk = kiosk;
    document.getElementById('kioskModalTitle').textContent = 'Editar Kiosko';
    document.getElementById('kioskName').value = kiosk.name || '';
    document.getElementById('kioskDescription').value = kiosk.description || '';
    document.getElementById('kioskLocation').value = kiosk.location || '';
    document.getElementById('kioskDeviceId').value = kiosk.deviceId || '';

    // Mostrar GPS solo si existe
    if (kiosk.gpsLocation?.lat && kiosk.gpsLocation?.lng) {
        document.getElementById('gpsInfoSection').style.setProperty('display', 'block', 'important');
        document.getElementById('kioskLatDisplay').value = kiosk.gpsLocation.lat.toFixed(8);
        document.getElementById('kioskLngDisplay').value = kiosk.gpsLocation.lng.toFixed(8);
    } else {
        document.getElementById('gpsInfoSection').style.setProperty('display', 'none', 'important');
    }

    openModal('kioskModal');

    // Habilitar campos para edición
    document.getElementById('kioskName').disabled = false;
    document.getElementById('kioskDescription').disabled = false;
    document.getElementById('kioskLocation').disabled = false;
    document.getElementById('kioskDeviceId').disabled = false;

    // Mostrar botón guardar
    const saveBtn = document.querySelector('#kioskModal button[onclick="saveKiosk()"]');
    if (saveBtn) saveBtn.style.display = '';

    // Poblar checkboxes de departamentos con los departamentos autorizados
    const authorizedDepts = kiosk.authorizedDepartments || kiosk.authorized_departments || [];
    await populateKioskDepartmentCheckboxes(authorizedDepts);
}

// Ver kiosko (modo solo lectura)
function viewKiosk(kioskId) {
    console.log('👁️ [KIOSKS] viewKiosk() llamado para ID:', kioskId);

    const kiosk = kiosksList.find(k => k.id === kioskId);
    if (!kiosk) {
        alert('Kiosko no encontrado');
        return;
    }

    editingKiosk = null; // No estamos editando, solo viendo
    document.getElementById('kioskModalTitle').textContent = '👁️ Ver Kiosko (Solo lectura)';
    document.getElementById('kioskName').value = kiosk.name || '';
    document.getElementById('kioskDescription').value = kiosk.description || '';
    document.getElementById('kioskLocation').value = kiosk.location || '';
    document.getElementById('kioskDeviceId').value = kiosk.deviceId || '';

    // Mostrar GPS solo si existe
    if (kiosk.gpsLocation?.lat && kiosk.gpsLocation?.lng) {
        document.getElementById('gpsInfoSection').style.setProperty('display', 'block', 'important');
        document.getElementById('kioskLatDisplay').value = kiosk.gpsLocation.lat.toFixed(8);
        document.getElementById('kioskLngDisplay').value = kiosk.gpsLocation.lng.toFixed(8);
    } else {
        document.getElementById('gpsInfoSection').style.setProperty('display', 'none', 'important');
    }

    // DESHABILITAR todos los campos (solo lectura)
    document.getElementById('kioskName').disabled = true;
    document.getElementById('kioskDescription').disabled = true;
    document.getElementById('kioskLocation').disabled = true;
    document.getElementById('kioskDeviceId').disabled = true;

    // OCULTAR botón guardar
    const saveBtn = document.querySelector('#kioskModal button[onclick="saveKiosk()"]');
    if (saveBtn) saveBtn.style.setProperty('display', 'none', 'important');

    openModal('kioskModal');
}

// Guardar kiosko (crear o actualizar)
async function saveKiosk() {
    try {
        const name = document.getElementById('kioskName').value.trim();
        const description = document.getElementById('kioskDescription').value.trim();
        const location = document.getElementById('kioskLocation').value.trim();
        const deviceId = document.getElementById('kioskDeviceId').value.trim();

        // Validaciones
        if (!name) {
            alert('El nombre del kiosko es requerido');
            return;
        }

        if (!location) {
            alert('La ubicación física del kiosko es requerida');
            return;
        }

        // Obtener token válido
        const token = await getValidToken();
        if (!token) {
            alert('⚠️ No se pudo obtener token de autenticación. Por favor, recarga la página.');
            return;
        }

        // Obtener departamentos autorizados seleccionados
        const checkboxes = document.querySelectorAll('#kioskDepartmentsCheckboxes input[type="checkbox"]:checked');
        const authorizedDepartments = Array.from(checkboxes).map(cb => parseInt(cb.value));

        const kioskData = {
            name,
            description,
            location,
            deviceId: deviceId || null,
            authorized_departments: authorizedDepartments
        };

        const url = editingKiosk
            ? `/api/v1/kiosks/${editingKiosk.id}`
            : '/api/v1/kiosks';

        const method = editingKiosk ? 'PUT' : 'POST';

        console.log(`📟 [KIOSKS] ${method} ${url}`, kioskData);

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(kioskData)
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Error guardando kiosko');
        }

        console.log('✅ [KIOSKS] Kiosko guardado exitosamente');

        // Cerrar modal
        closeModal('kioskModal');

        // Recargar tabla
        await loadKiosks();

        alert(editingKiosk ? 'Kiosko actualizado exitosamente' : 'Kiosko creado exitosamente');

    } catch (error) {
        console.error('❌ [KIOSKS] Error guardando kiosko:', error);
        alert('Error guardando kiosko: ' + error.message);
    }
}

// Eliminar kiosko
async function deleteKiosk(kioskId) {
    const kiosk = kiosksList.find(k => k.id === kioskId);
    if (!kiosk) return;

    if (!confirm(`¿Está seguro que desea eliminar el kiosko "${kiosk.name}"?`)) {
        return;
    }

    try {
        console.log(`📟 [KIOSKS] Eliminando kiosko ${kioskId}`);

        // Obtener token válido
        const token = await getValidToken();
        if (!token) {
            alert('⚠️ No se pudo obtener token de autenticación. Por favor, recarga la página.');
            return;
        }

        const response = await fetch(`/api/v1/kiosks/${kioskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Error eliminando kiosko');
        }

        console.log('✅ [KIOSKS] Kiosko eliminado exitosamente');

        // Recargar tabla
        await loadKiosks();

        alert('Kiosko eliminado exitosamente');

    } catch (error) {
        console.error('❌ [KIOSKS] Error eliminando kiosko:', error);
        alert('Error eliminando kiosko: ' + error.message);
    }
}

// Exponer funciones globalmente
window.showKiosksContent = showKiosksContent;
window.showAddKioskModal = showAddKioskModal;
window.viewKiosk = viewKiosk;
window.editKiosk = editKiosk;
window.saveKiosk = saveKiosk;
window.deleteKiosk = deleteKiosk;

console.log('✅ [KIOSKS] Módulo de kioscos completamente cargado');
