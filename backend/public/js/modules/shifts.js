// Shifts Module - v7.0 SISTEMA AVANZADO DE TURNOS FLEXIBLES
console.log('🕐 [SHIFTS] Módulo turnos avanzado v7.0 cargado - Sistema flexible completo');

// Variables globales para turnos
let currentShifts = [];
let currentAssignments = [];
let shiftTypes = {
    'standard': '📅 Estándar',
    'rotative': '🔄 Rotativo',
    'permanent': '📌 Permanente', 
    'flash': '⚡ Flash'
};

// Configuración de horas por defecto (parametrizable)
let hourlyConfig = {
    normal: { rate: 1.0, name: 'Normales' },
    extra50: { rate: 1.5, name: 'Extras 50%' },
    extra100: { rate: 2.0, name: 'Extras 100%' },
    extra150: { rate: 2.5, name: 'Extras 150%' },
    weekend: { rate: 1.5, name: 'Fin de Semana' },
    holiday: { rate: 2.0, name: 'Feriados' }
};

// Función principal para mostrar contenido de turnos
function showShiftsContent() {
    console.log('🎯 [SHIFTS-FUNC] showShiftsContent() INICIADA');

    const content = document.getElementById('mainContent');
    console.log('🔍 [SHIFTS-FUNC] mainContent element:', content);

    if (!content) {
        console.error('❌ [SHIFTS-FUNC] mainContent NO ENCONTRADO - ABORTANDO');
        return;
    }

    console.log('✅ [SHIFTS-FUNC] mainContent encontrado, estableciendo innerHTML...');

    content.innerHTML = `
        <div class="tab-content active" id="shifts">
            <div class="card">
                <h2 data-translate="shifts.title">🕐 Sistema Avanzado de Turnos Flexibles</h2>
                <div class="quick-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 20px;">
                    <button class="btn btn-primary" onclick="showAdvancedShiftCreator()" data-translate="shifts.buttons.create_advanced">➕ Crear Turno Avanzado</button>
                    <button class="btn btn-success" onclick="loadAdvancedShifts()" data-translate="shifts.buttons.list">📋 Lista de Turnos</button>
                    <button class="btn btn-info" onclick="showShiftCalendar()" data-translate="shifts.buttons.calendar">📅 Calendario Visual</button>
                    <button class="btn btn-secondary" onclick="showHourlyConfiguration()" data-translate="shifts.buttons.config_hours">💰 Config. Horas</button>
                    <button class="btn btn-danger" onclick="showFlashShiftCreator()" data-translate="shifts.buttons.flash_shift">⚡ Turno Flash</button>
                </div>

                <!-- Tabs para diferentes vistas -->
                <div class="shift-tabs" style="margin-bottom: 20px;">
                    <button class="shift-tab active" onclick="showShiftTab('list')" data-translate="shifts.tabs.list">📋 Lista</button>
                    <button class="shift-tab" onclick="showShiftTab('calendar')" data-translate="shifts.tabs.calendar">📅 Calendario</button>
                    <button class="shift-tab" onclick="showShiftTab('config')" data-translate="shifts.tabs.config">⚙️ Configuración</button>
                </div>
                
                <!-- Contenedor principal -->
                <div id="shifts-main-container">
                    <!-- Lista de turnos -->
                    <div id="shifts-list-tab" class="shift-tab-content active">
                        <div id="shifts-summary" class="stats-grid" style="margin-bottom: 20px;">
                            <div class="stat-item">
                                <div class="stat-value" id="total-shifts">--</div>
                                <div class="stat-label" data-translate="shifts.stats.total_shifts">Total Turnos</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="active-shifts">--</div>
                                <div class="stat-label" data-translate="shifts.stats.active_shifts">Turnos <span data-translate="common.active">Activo</span>s</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="assigned-employees">--</div>
                                <div class="stat-label" data-translate="shifts.stats.assigned_employees">Empleados Asignados</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="flash-shifts">--</div>
                                <div class="stat-label" data-translate="shifts.stats.flash_shifts">Turnos Flash</div>
                            </div>
                        </div>

                        <div id="shifts-list" class="server-info" data-translate="shifts.list.load_prompt">
                            Presiona "Lista de Turnos" para cargar los turnos configurados...
                        </div>
                    </div>

                    <!-- Calendario -->
                    <div id="shifts-calendar-tab" class="shift-tab-content">
                        <div id="calendar-container">
                            <h3 data-translate="shifts.calendar.title">📅 Calendario de Turnos</h3>
                            <div id="shift-calendar" style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; min-height: 400px;">
                                <div style="text-align: center; color: #666; margin-top: 150px;">
                                    <span data-translate="shifts.calendar.visual_calendar">📅 Calendario visual en desarrollo</span><br>
                                    <span data-translate="shifts.calendar.description">Mostrará turnos por día con código de colores</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Configuración -->
                    <div id="shifts-config-tab" class="shift-tab-content">
                        <div id="hourly-config-container">
                            <h3 data-translate="shifts.hourly_config.title">💰 Configuración de Horas y Tarifas</h3>
                            <div id="hourly-config-content" data-translate="shifts.hourly_config.description">
                                Configuración de tarifas por tipo de hora...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Inyectar estilos dinámicamente en el head
    if (!document.getElementById('shifts-module-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'shifts-module-styles';
        styleElement.textContent = `
            .shift-tabs {
                display: flex;
                gap: 5px;
                border-bottom: 2px solid #eee;
            }
            .shift-tab {
                padding: 10px 20px;
                border: none;
                background: #f5f5f5;
                cursor: pointer;
                border-radius: 5px 5px 0 0;
                transition: all 0.3s;
            }
            .shift-tab.active {
                background: #0066CC;
                color: white;
            }
            .shift-tab:hover {
                background: #0088ff;
                color: white;
            }
            .shift-tab-content {
                display: none;
                margin-top: 20px;
            }
            .shift-tab-content.active {
                display: block;
            }
            .shift-type-badge {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.8em;
                font-weight: bold;
            }
            .shift-type-standard { background: #e3f2fd; color: #1976d2; }
            .shift-type-rotative { background: #fff3e0; color: #f57c00; }
            .shift-type-permanent { background: #e8f5e8; color: #388e3c; }
            .shift-type-flash { background: #fce4ec; color: #c2185b; }
        `;
        document.head.appendChild(styleElement);
    }

    console.log('✅ [SHIFTS-FUNC] innerHTML establecido correctamente');
    console.log('🔍 [SHIFTS-FUNC] Longitud HTML:', content.innerHTML.length, 'caracteres');

    // Auto load shifts on tab show
    console.log('⏱️ [SHIFTS-FUNC] Llamando loadAdvancedShifts en 300ms...');
    setTimeout(loadAdvancedShifts, 300);

    console.log('✅ [SHIFTS-FUNC] showShiftsContent() COMPLETADA');
}

// Función para cambiar entre tabs
function showShiftTab(tabName) {
    // Ocultar todas las tabs
    document.querySelectorAll('.shift-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.shift-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Mostrar la tab seleccionada
    const tabContent = document.getElementById(`shifts-${tabName}-tab`);
    const tabButton = event.target;
    
    if (tabContent) {
        tabContent.classList.add('active');
    }
    if (tabButton) {
        tabButton.classList.add('active');
    }
    
    // Cargar contenido según la tab
    switch(tabName) {
        case 'calendar':
            showAdvancedCalendar();
            break;
        case 'config':
            showAdvancedHourlyConfig();
            break;
    }
}

// Cargar turnos avanzados
async function loadAdvancedShifts() {
    console.log('🕐 [SHIFTS] Cargando turnos avanzados desde API...');
    
    const shiftsList = document.getElementById('shifts-list');
    if (!shiftsList) return;
    
    shiftsList.innerHTML = '<span data-translate="shifts.list.loading">🔄 Cargando turnos avanzados...</span>';
    
    try {
        // Obtener token de autenticación
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        
        let shifts = [];
        
        if (token) {
            // Intentar cargar desde API real
            try {
                // Verificar que progressiveAdmin esté disponible
                if (!window.progressiveAdmin || typeof window.progressiveAdmin.getApiUrl !== 'function') {
                    console.warn('⚠️ [SHIFTS] window.progressiveAdmin no disponible aún, usando fallback');
                    throw new Error('progressiveAdmin no disponible');
                }

                const apiUrl = window.progressiveAdmin.getApiUrl('/api/v1/shifts');
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const apiResponse = await response.json();
                    console.log('🕐 [SHIFTS] Turnos desde API:', apiResponse);

                    // ✅ FIX: Manejar diferentes formatos de respuesta
                    const apiShifts = Array.isArray(apiResponse) ? apiResponse :
                                     (apiResponse.shifts || apiResponse.data || []);

                    // Transformar datos de la API al formato esperado
                    shifts = apiShifts.map(shift => {
                        const shiftType = shift.shiftType || 'standard';
                        let patternInfo = '';
                        
                        // Crear info de patrón según el tipo
                        switch(shiftType) {
                            case 'rotative':
                                patternInfo = shift.rotationPattern || 'Rotativo';
                                break;
                            case 'flash':
                                patternInfo = `${shift.flashStartDate} → ${shift.flashEndDate}`;
                                break;
                            case 'permanent':
                                patternInfo = 'Permanente';
                                break;
                            default:
                                patternInfo = formatDays(shift.days);
                        }
                        
                        return {
                            id: shift.id,
                            name: shift.name,
                            type: shiftType,
                            startTime: shift.startTime,
                            endTime: shift.endTime,
                            breakStart: shift.breakStartTime,
                            breakEnd: shift.breakEndTime,
                            days: shift.days || [],
                            pattern: shift.rotationPattern,
                            cycleStartDate: shift.global_cycle_start_date || shift.cycleStartDate,
                            startDate: shift.flashStartDate,
                            endDate: shift.flashEndDate,
                            priority: shift.flashPriority || shift.permanentPriority,
                            isActive: shift.isActive,
                            employees: 0, // TODO: Obtener conteo real de asignaciones
                            hourlyRates: shift.hourlyRates || {
                                normal: 1.0,
                                overtime: 1.5,
                                weekend: 1.5,
                                holiday: 2.0
                            },
                            patternInfo: patternInfo
                        };
                    });
                    
                    console.log('🕐 [SHIFTS] Turnos procesados:', shifts);
                } else {
                    console.log('⚠️ [SHIFTS] API no disponible o error:', response.status);
                    throw new Error('API no disponible');
                }
            } catch (apiError) {
                console.log('⚠️ [SHIFTS] Error de API, usando datos de ejemplo:', apiError.message);
                throw apiError;
            }
        }
        
        // Si no hay token o falla la API, usar datos de ejemplo
        if (shifts.length === 0) {
            console.log('🕐 [SHIFTS] Usando datos de ejemplo...');
            shifts = [
                {
                    id: 'example-1',
                    name: 'Turno Mañana Estándar (Ejemplo)',
                    type: 'standard',
                    startTime: '08:00',
                    endTime: '17:00',
                    breakStart: '12:00',
                    breakEnd: '13:00',
                    days: [1,2,3,4,5],
                    isActive: true,
                    employees: 12,
                    hourlyRates: { normal: 1.0, overtime: 1.5, weekend: 1.5, holiday: 2.0 },
                    patternInfo: formatDays([1,2,3,4,5])
                },
                {
                    id: 'example-2',
                    name: 'Turno Flash - Proyecto Especial (Ejemplo)',
                    type: 'flash',
                    startTime: '20:00',
                    endTime: '04:00',
                    startDate: '2025-09-10',
                    endDate: '2025-09-25',
                    days: [1,2,3,4,5],
                    priority: 'high',
                    isActive: true,
                    employees: 3,
                    hourlyRates: { normal: 1.5, overtime: 2.5, weekend: 3.0, holiday: 3.5 },
                    patternInfo: '2025-09-10 → 2025-09-25'
                }
            ];
        }
        
        currentShifts = shifts;
        displayAdvancedShiftsTable(shifts);
        updateShiftStats(shifts);
        
    } catch (error) {
        console.error('❌ [SHIFTS] Error cargando turnos:', error);
        shiftsList.innerHTML = `<span data-translate="shifts.messages.error_loading">❌ Error cargando turnos</span>: ${error.message}`;
    }
}

// Mostrar tabla avanzada de turnos
async function displayAdvancedShiftsTable(shifts) {
    const shiftsList = document.getElementById('shifts-list');
    if (!shiftsList) return;
    
    if (!shifts || shifts.length === 0) {
        shiftsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;"><span data-translate="shifts.list.no_shifts_title">No hay turnos configurados</span></div>';
        return;
    }
    
    let tableHTML = `
        <div class="table-container" style="margin-top: 15px;">
            <table class="data-table" style="width: 100%;">
                <thead>
                    <tr>
                        <th data-translate="shifts.table.shift">🕐 Turno</th>
                        <th data-translate="shifts.table.type">📊 Tipo</th>
                        <th data-translate="shifts.table.schedule">⏰ Horario</th>
                        <th data-translate="shifts.table.pattern_days">📅 Patrón/Días</th>
                        <th data-translate="shifts.table.employees">👥 Empleados</th>
                        <th data-translate="shifts.table.rates">💰 Tarifas</th>
                        <th data-translate="shifts.table.status">📍 Estado</th>
                        <th data-translate="shifts.table.actions">⚙️ Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    shifts.forEach(shift => {
        const typeClass = `shift-type-${shift.type}`;
        const typeLabel = shiftTypes[shift.type] || shift.type;
        const statusClass = shift.isActive ? 'success' : 'error';
        
        // Usar patternInfo si existe, sino generar
        let patternInfo = shift.patternInfo || '';
        if (!patternInfo) {
            switch(shift.type) {
                case 'standard':
                    patternInfo = formatDays(shift.days);
                    break;
                case 'rotative':
                    const cycleStart = shift.global_cycle_start_date || shift.cycleStartDate;
                    patternInfo = `${shift.pattern || 'Rotativo'} ${cycleStart ? '(desde ' + cycleStart + ')' : ''}`;
                    break;
                case 'flash':
                    patternInfo = `${shift.startDate || ''} → ${shift.endDate || ''}`;
                    break;
                case 'permanent':
                    patternInfo = formatDays(shift.days) + ' (Permanente)';
                    break;
            }
        }
        
        // Formatear tarifas
        const rates = shift.hourlyRates;
        const rateInfo = `N:${rates.normal}x | E:${rates.overtime}x | W:${rates.weekend}x | H:${rates.holiday}x`;
        
        tableHTML += `
            <tr>
                <td><strong>${shift.name}</strong></td>
                <td><span class="shift-type-badge ${typeClass}">${typeLabel}</span></td>
                <td>${shift.startTime} - ${shift.endTime}${shift.breakStart ? '<br><small><span data-translate="shifts.table.break">Descanso:</span> ' + shift.breakStart + '-' + shift.breakEnd + '</small>' : ''}</td>
                <td>${patternInfo}</td>
                <td><span class="badge">${shift.employees} <span data-translate="shifts.table.employees_count">empleados</span></span></td>
                <td><small style="font-size: 0.75em;">${rateInfo}</small></td>
                <td><span class="status-badge ${statusClass}">${shift.isActive ? '<span data-translate="common.active">Activo</span>' : '<span data-translate="common.inactive">Inactivo</span>'}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editAdvancedShift('${shift.id}')" title="Editar">✏️</button>
                    <button class="btn btn-sm btn-info" onclick="viewAdvancedShift('${shift.id}')" title="Ver">👁️</button>
                    <button class="btn btn-sm" style="background-color: #4CAF50; color: white;" onclick="viewShiftCalendar('${shift.id}')" title="Ver Calendario">📅</button>
                    <button class="btn btn-sm btn-success" onclick="duplicateShift('${shift.id}')" title="Duplicar">📋</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAdvancedShift('${shift.id}')" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    shiftsList.innerHTML = tableHTML;
    showShiftMessage(`✅ ${shifts.length} ${await window.t('shifts.messages.loaded_count')}`, 'success');
}

// Actualizar estadísticas de turnos
function updateShiftStats(shifts) {
    if (!shifts) return;
    
    const totalShifts = shifts.length;
    const activeShifts = shifts.filter(s => s.isActive).length;
    const totalEmployees = shifts.reduce((sum, s) => sum + s.employees, 0);
    const flashShifts = shifts.filter(s => s.type === 'flash').length;
    
    document.getElementById('total-shifts').textContent = totalShifts;
    document.getElementById('active-shifts').textContent = activeShifts;
    document.getElementById('assigned-employees').textContent = totalEmployees;
    document.getElementById('flash-shifts').textContent = flashShifts;
}

// Formatear días de la semana
function formatDays(days) {
    if (!days || !Array.isArray(days)) return 'Sin días definidos';
    
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days.map(day => dayNames[day] || `D${day}`).join(', ');
}

// Mostrar creador avanzado de turnos
function showAdvancedShiftCreator() {
    console.log('➕ [SHIFTS] Mostrando creador avanzado de turnos...');
    
    const modal = document.createElement('div');
    modal.id = 'advancedShiftModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        overflow-y: auto;
        padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <h3 data-translate="shifts.form.modal_title_create">➕ Crear Turno Avanzado</h3>
            
            <!-- Selector de tipo de turno -->
            <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <h4 data-translate="shifts.form.type_section">📊 Tipo de Turno</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="shiftType" value="standard" checked onchange="updateShiftForm()"> 
                        <span style="margin-left: 8px;" data-translate="shifts.types.standard">📅 Estándar</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="shiftType" value="rotative" onchange="updateShiftForm()"> 
                        <span style="margin-left: 8px;" data-translate="shifts.types.rotative">🔄 Rotativo</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="shiftType" value="permanent" onchange="updateShiftForm()"> 
                        <span style="margin-left: 8px;" data-translate="shifts.types.permanent">📌 Permanente</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="shiftType" value="flash" onchange="updateShiftForm()"> 
                        <span style="margin-left: 8px;" data-translate="shifts.types.flash">⚡ Flash</span>
                    </label>
                </div>
            </div>
            
            <!-- Información básica -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                <div>
                    <label data-translate="shifts.form.name.label">🕐 Nombre del turno:</label>
                    <input type="text" id="advShiftName" value="Turno Test 24hs" style="width: 100%; padding: 8px; margin-top: 5px;" data-translate-placeholder="shifts.form.name.placeholder" placeholder="Ej: Turno Mañana">
                </div>
                <div>
                    <label data-translate="shifts.form.status.label">📊 Estado:</label>
                    <select id="advShiftStatus" style="width: 100%; padding: 8px; margin-top: 5px;">
                        <option value="true" data-translate="shifts.form.status.active"><span data-translate="common.active">Activo</span></option>
                        <option value="false" data-translate="shifts.form.status.inactive"><span data-translate="common.inactive">Inactivo</span></option>
                    </select>
                </div>
                <div>
                    <label data-translate="shifts.form.start_time.label">⏰ Hora inicio (24hs):</label>
                    <input type="time" id="advShiftStart" value="08:00" style="width: 100%; padding: 8px; margin-top: 5px;">
                </div>
                <div>
                    <label data-translate="shifts.form.end_time.label">⏰ Hora fin (24hs):</label>
                    <input type="time" id="advShiftEnd" value="17:00" style="width: 100%; padding: 8px; margin-top: 5px;">
                </div>
            </div>
            
            <!-- Descanso (opcional) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                <div>
                    <label data-translate="shifts.form.break_start.label">☕ Descanso inicio (opcional):</label>
                    <input type="time" id="advBreakStart" style="width: 100%; padding: 8px; margin-top: 5px;" placeholder="Opcional">
                </div>
                <div>
                    <label data-translate="shifts.form.break_end.label">☕ Descanso fin (opcional):</label>
                    <input type="time" id="advBreakEnd" style="width: 100%; padding: 8px; margin-top: 5px;" placeholder="Opcional">
                </div>
            </div>

            <!-- Tolerancia para marcado (Multi-tenant) -->
            <div style="margin: 20px 0; padding: 20px; background: #e8f5e8; border-radius: 8px;">
                <h4 data-translate="shifts.form.tolerance_section">⏱️ Tolerancia de Marcado (Parametrizable por Empresa)</h4>
                <p style="font-size: 0.9em; color: #666; margin: 5px 0 15px 0;">
                    Configure los minutos de tolerancia permitidos antes y después del horario establecido
                </p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div style="background: #fff; padding: 15px; border-radius: 8px; border: 2px solid #4CAF50;">
                        <h5 style="margin: 0 0 10px 0; color: #4CAF50;" data-translate="shifts.form.tolerance_entry">🔵 Ingreso</h5>
                        <div style="margin-bottom: 10px;">
                            <label data-translate="shifts.form.tolerance_before">⏰ Minutos antes (temprano):</label>
                            <input type="number" id="advToleranceEntryBefore" value="15" min="0" max="120" style="width: 100%; padding: 8px; margin-top: 5px;" placeholder="15">
                            <small style="color: #666;">Ej: 15 min = puede marcar desde las 07:45</small>
                        </div>
                        <div>
                            <label data-translate="shifts.form.tolerance_after">⏰ Minutos después (tardío):</label>
                            <input type="number" id="advToleranceEntryAfter" value="10" min="0" max="120" style="width: 100%; padding: 8px; margin-top: 5px;" placeholder="10">
                            <small style="color: #666;">Ej: 10 min = puede marcar hasta las 08:10</small>
                        </div>
                    </div>
                    <div style="background: #fff; padding: 15px; border-radius: 8px; border: 2px solid #FF9800;">
                        <h5 style="margin: 0 0 10px 0; color: #FF9800;" data-translate="shifts.form.tolerance_exit">🔴 Egreso</h5>
                        <div style="margin-bottom: 10px;">
                            <label data-translate="shifts.form.tolerance_before">⏰ Minutos antes (temprano):</label>
                            <input type="number" id="advToleranceExitBefore" value="10" min="0" max="120" style="width: 100%; padding: 8px; margin-top: 5px;" placeholder="10">
                            <small style="color: #666;">Ej: 10 min = puede salir desde las 16:50</small>
                        </div>
                        <div>
                            <label data-translate="shifts.form.tolerance_after">⏰ Minutos después (quedarse más):</label>
                            <input type="number" id="advToleranceExitAfter" value="30" min="0" max="240" style="width: 100%; padding: 8px; margin-top: 5px;" placeholder="30">
                            <small style="color: #666;">Ej: 30 min = puede salir hasta las 17:30</small>
                        </div>
                    </div>
                </div>
                <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 5px;">
                    <small><strong>💡 Importante:</strong> Estos valores son específicos para este turno y respetan la política multi-tenant. Cada empresa puede configurar sus propias tolerancias según su política laboral.</small>
                </div>
            </div>

            <!-- Sucursal y Feriados -->
            <div style="margin: 20px 0; padding: 20px; background: #f0f0ff; border-radius: 8px;">
                <h4>🏢 Sucursal y Feriados</h4>
                <p style="font-size: 0.9em; color: #666; margin: 5px 0 15px 0;">
                    Configure la sucursal del turno y el respeto a feriados nacionales/provinciales
                </p>
                <div style="margin-bottom: 15px;">
                    <label>🏢 Sucursal:</label>
                    <select id="advBranchId" style="width: 100%; padding: 8px; margin-top: 5px;">
                        <option value="">TODAS las sucursales</option>
                        <!-- Se llenará dinámicamente -->
                    </select>
                    <small style="color: #666;">Si no selecciona sucursal, el turno aplica a TODAS</small>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div style="background: #fff; padding: 15px; border-radius: 8px; border: 2px solid #2196F3;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="advRespectNationalHolidays" style="margin-right: 10px;">
                            <span>🎉 Respetar feriados nacionales</span>
                        </label>
                        <small style="color: #666; display: block; margin-top: 5px;">Excluye feriados nacionales del calendario del turno</small>
                    </div>
                    <div style="background: #fff; padding: 15px; border-radius: 8px; border: 2px solid #9C27B0;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="advRespectProvincialHolidays" style="margin-right: 10px;">
                            <span>📍 Respetar feriados provinciales</span>
                        </label>
                        <small style="color: #666; display: block; margin-top: 5px;">Excluye feriados provinciales/estatales del calendario</small>
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <label>📅 Días no laborables personalizados:</label>
                    <div style="margin-top: 5px;">
                        <input type="date" id="advCustomNonWorkingDay" style="padding: 8px; margin-right: 10px;">
                        <button onclick="addCustomNonWorkingDay()" style="padding: 8px 15px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            ➕ Agregar
                        </button>
                    </div>
                    <div id="customNonWorkingDaysList" style="margin-top: 10px; min-height: 40px; background: #fff; padding: 10px; border-radius: 5px; border: 1px solid #ddd;">
                        <small style="color: #999;">No hay días personalizados agregados</small>
                    </div>
                    <small style="color: #666;">Ej: Día del empleado, cierres especiales, etc.</small>
                </div>
            </div>

            <!-- Configuración específica por tipo -->
            <div id="shiftTypeConfig" style="margin: 20px 0; padding: 20px; background: #f0f8ff; border-radius: 8px;">
                <!-- Se llena dinámicamente según el tipo -->
            </div>
            
            <!-- Configuración de tarifas -->
            <div style="margin: 20px 0; padding: 20px; background: #fffbf0; border-radius: 8px;">
                <h4 data-translate="shifts.form.rates_section">💰 Tarifas Horarias (multiplicadores)</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                    <div>
                        <label data-translate="shifts.form.rate_normal">⏰ Normales:</label>
                        <input type="number" id="rateNormal" value="1.0" step="0.1" min="0.1" style="width: 100%; padding: 5px;">
                    </div>
                    <div>
                        <label data-translate="shifts.form.rate_overtime">⏰ Extras:</label>
                        <input type="number" id="rateOvertime" value="1.5" step="0.1" min="0.1" style="width: 100%; padding: 5px;">
                    </div>
                    <div>
                        <label data-translate="shifts.form.rate_weekend">🏖️ Fin Semana:</label>
                        <input type="number" id="rateWeekend" value="1.5" step="0.1" min="0.1" style="width: 100%; padding: 5px;">
                    </div>
                    <div>
                        <label data-translate="shifts.form.rate_holiday">🎉 Feriados:</label>
                        <input type="number" id="rateHoliday" value="2.0" step="0.1" min="0.1" style="width: 100%; padding: 5px;">
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn btn-primary" onclick="saveAdvancedShift()" style="margin-right: 10px;" data-translate="shifts.buttons.save_shift">💾 Crear Turno</button>
                <button class="btn btn-secondary" onclick="closeAdvancedShiftModal()" data-translate="shifts.buttons.cancel">❌ Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);

    // Add click outside modal to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAdvancedShiftModal();
        }
    });

    updateShiftForm(); // Inicializar form
    loadBranches(); // Cargar sucursales en dropdown
    window.customNonWorkingDays = []; // Reiniciar lista de días no laborables
}

// Actualizar formulario según tipo de turno
function updateShiftForm() {
    const shiftType = document.querySelector('input[name="shiftType"]:checked').value;
    const configDiv = document.getElementById('shiftTypeConfig');
    
    switch(shiftType) {
        case 'standard':
            configDiv.innerHTML = `
                <h4 data-translate="shifts.form.standard_config.title">📅 Turno Estándar</h4>
                <div style="margin: 15px 0;">
                    <label data-translate="shifts.form.standard_config.work_days">📅 Días de trabajo:</label>
                    <div style="display: flex; gap: 10px; margin-top: 5px; flex-wrap: wrap;">
                        <label><input type="checkbox" id="day0"> <span data-translate="shifts.form.days.sunday">Domingo</span></label>
                        <label><input type="checkbox" id="day1" checked> <span data-translate="shifts.form.days.monday">Lunes</span></label>
                        <label><input type="checkbox" id="day2" checked> <span data-translate="shifts.form.days.tuesday">Martes</span></label>
                        <label><input type="checkbox" id="day3" checked> <span data-translate="shifts.form.days.wednesday">Miércoles</span></label>
                        <label><input type="checkbox" id="day4" checked> <span data-translate="shifts.form.days.thursday">Jueves</span></label>
                        <label><input type="checkbox" id="day5" checked> <span data-translate="shifts.form.days.friday">Viernes</span></label>
                        <label><input type="checkbox" id="day6"> <span data-translate="shifts.form.days.saturday">Sábado</span></label>
                    </div>
                </div>
            `;
            break;
            
        case 'rotative':
            configDiv.innerHTML = `
                <h4 data-translate="shifts.form.rotative_config.title">🔄 Turno Rotativo</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label data-translate="shifts.form.rotative_config.pattern">🔄 Patrón de rotación:</label>
                        <select id="rotativePattern" style="width: 100%; padding: 8px; margin-top: 5px;">
                            <option value="12x4" data-translate="shifts.form.rotative_config.pattern_12x4">12 horas x 4 días descanso</option>
                            <option value="6x2" data-translate="shifts.form.rotative_config.pattern_6x2">6 horas x 2 días descanso</option>
                            <option value="8x1" data-translate="shifts.form.rotative_config.pattern_8x1">8 horas x 1 día descanso</option>
                            <option value="custom" data-translate="shifts.form.rotative_config.pattern_custom">Personalizado</option>
                        </select>
                    </div>
                    <div>
                        <label data-translate="shifts.form.rotative_config.cycle_start">📅 Fecha inicio ciclo:</label>
                        <input type="date" id="rotativeCycleStart" style="width: 100%; padding: 8px; margin-top: 5px;" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                </div>
                <div id="customRotativeConfig" style="margin-top: 15px; display: none;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label data-translate="shifts.form.rotative_config.work_days_label">Días trabajados:</label>
                            <input type="number" id="customWorkDays" min="1" max="30" value="12" style="width: 100%; padding: 8px;">
                        </div>
                        <div>
                            <label data-translate="shifts.form.rotative_config.rest_days_label">Días de descanso:</label>
                            <input type="number" id="customRestDays" min="1" max="30" value="4" style="width: 100%; padding: 8px;">
                        </div>
                    </div>
                </div>
                <script>
                document.getElementById('rotativePattern').addEventListener('change', function() {
                    document.getElementById('customRotativeConfig').style.display = 
                        this.value === 'custom' ? 'block' : 'none';
                });
                </script>
            `;
            break;
            
        case 'permanent':
            configDiv.innerHTML = `
                <h4 data-translate="shifts.form.permanent_config.title">📌 Turno Permanente</h4>
                <div style="margin: 15px 0;">
                    <label data-translate="shifts.form.permanent_config.assigned_days">📅 Días asignados:</label>
                    <div style="display: flex; gap: 10px; margin-top: 5px; flex-wrap: wrap;">
                        <label><input type="checkbox" id="day0"> <span data-translate="shifts.form.days.sunday">Domingo</span></label>
                        <label><input type="checkbox" id="day1"> Lunes</label>
                        <label><input type="checkbox" id="day2"> Martes</label>
                        <label><input type="checkbox" id="day3"> Miércoles</label>
                        <label><input type="checkbox" id="day4"> Jueves</label>
                        <label><input type="checkbox" id="day5"> Viernes</label>
                        <label><input type="checkbox" id="day6"> <span data-translate="shifts.form.days.saturday">Sábado</span></label>
                    </div>
                </div>
                <div style="margin: 15px 0;">
                    <label>🔒 Prioridad de asignación:</label>
                    <select id="permanentPriority" style="width: 100%; padding: 8px; margin-top: 5px;">
                        <option value="low" data-translate="shifts.form.permanent_config.priority_low">Baja</option>
                        <option value="normal" selected>Normal</option>
                        <option value="high" data-translate="shifts.form.permanent_config.priority_high">Alta</option>
                        <option value="critical" data-translate="shifts.form.permanent_config.priority_critical">Crítica</option>
                    </select>
                </div>
            `;
            break;
            
        case 'flash':
            configDiv.innerHTML = `
                <h4 data-translate="shifts.form.flash_config.title">⚡ Turno Flash (Temporal)</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label data-translate="shifts.form.flash_config.start_date">📅 Fecha inicio:</label>
                        <input type="date" id="flashStartDate" style="width: 100%; padding: 8px; margin-top: 5px;" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div>
                        <label data-translate="shifts.form.flash_config.end_date">📅 Fecha fin:</label>
                        <input type="date" id="flashEndDate" style="width: 100%; padding: 8px; margin-top: 5px;">
                    </div>
                </div>
                <div style="margin: 15px 0;">
                    <label data-translate="shifts.form.flash_config.specific_days">📅 Días específicos:</label>
                    <div style="display: flex; gap: 10px; margin-top: 5px; flex-wrap: wrap;">
                        <label><input type="checkbox" id="day0"> <span data-translate="shifts.form.days.sunday">Domingo</span></label>
                        <label><input type="checkbox" id="day1" checked> <span data-translate="shifts.form.days.monday">Lunes</span></label>
                        <label><input type="checkbox" id="day2" checked> <span data-translate="shifts.form.days.tuesday">Martes</span></label>
                        <label><input type="checkbox" id="day3" checked> <span data-translate="shifts.form.days.wednesday">Miércoles</span></label>
                        <label><input type="checkbox" id="day4" checked> <span data-translate="shifts.form.days.thursday">Jueves</span></label>
                        <label><input type="checkbox" id="day5" checked> <span data-translate="shifts.form.days.friday">Viernes</span></label>
                        <label><input type="checkbox" id="day6"> <span data-translate="shifts.form.days.saturday">Sábado</span></label>
                    </div>
                </div>
                <div style="margin: 15px 0;">
                    <label>🔥 Prioridad flash:</label>
                    <select id="flashPriority" style="width: 100%; padding: 8px; margin-top: 5px;">
                        <option value="low" data-translate="shifts.form.permanent_config.priority_low">Baja</option>
                        <option value="normal" data-translate="shifts.form.permanent_config.priority_normal">Normal</option>
                        <option value="high" selected>Alta</option>
                        <option value="urgent" data-translate="shifts.form.flash_config.priority_urgent">Urgente</option>
                    </select>
                </div>
                <div style="margin: 15px 0;">
                    <label><input type="checkbox" id="flashOverride" checked> ⚡ Permitir sobreasignación (sobre turnos permanentes)</label>
                </div>
            `;
            break;
    }
}

// Funciones auxiliares para el sistema de turnos

function showAdvancedCalendar() {
    console.log('📅 [SHIFTS] Cargando calendario avanzado...');
    // Implementar calendario visual
}

function showAdvancedHourlyConfig() {
    console.log('💰 [SHIFTS] Cargando configuración de horas...');
    // Implementar configuración de tarifas
}

// Cerrar modal avanzado
function closeAdvancedShiftModal() {
    const modal = document.getElementById('advancedShiftModal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Guardar turno avanzado
async function saveAdvancedShift() {
    console.log('💾 [SHIFTS] Guardando turno avanzado...');
    
    try {
        // Verificar que el modal existe
        const modal = document.getElementById('advancedShiftModal');
        if (!modal) {
            showShiftMessage(await window.t('shifts.messages.error_modal_not_found'), 'error');
            return;
        }
        
        // Obtener tipo de turno seleccionado
        const shiftTypeElement = document.querySelector('input[name="shiftType"]:checked');
        if (!shiftTypeElement) {
            showShiftMessage(await window.t('shifts.messages.error_form_elements'), 'error');
            return;
        }
        const shiftType = shiftTypeElement.value;
        
        // Obtener datos básicos con validación de elementos
        const nameEl = document.getElementById('advShiftName');
        const statusEl = document.getElementById('advShiftStatus');
        const startEl = document.getElementById('advShiftStart');
        const endEl = document.getElementById('advShiftEnd');
        const breakStartEl = document.getElementById('advBreakStart');
        const breakEndEl = document.getElementById('advBreakEnd');
        
        if (!nameEl || !statusEl || !startEl || !endEl) {
            showShiftMessage(await window.t('shifts.messages.error_form_elements'), 'error');
            return;
        }
        
        const name = nameEl.value.trim();
        const isActive = statusEl.value === 'true';
        const startTime = startEl.value.trim();
        const endTime = endEl.value.trim();
        // Manejar descansos opcionales - solo si ambos están completos o ambos vacíos
        let breakStartTime = breakStartEl ? breakStartEl.value.trim() : '';
        let breakEndTime = breakEndEl ? breakEndEl.value.trim() : '';
        
        // Si solo uno está completo, limpiar ambos (debe ser ambos o ninguno)
        if ((breakStartTime && !breakEndTime) || (!breakStartTime && breakEndTime)) {
            breakStartTime = null;
            breakEndTime = null;
        } else if (breakStartTime && breakEndTime) {
            // Ambos completos, mantener
        } else {
            // Ambos vacíos
            breakStartTime = null;
            breakEndTime = null;
        }
        
        console.log('🔍 [DEBUG] Elementos encontrados:');
        console.log('  - nameEl:', nameEl);
        console.log('  - startEl:', startEl);
        console.log('  - endEl:', endEl);
        
        console.log('🔍 [DEBUG] Valores obtenidos:');
        console.log('  - name:', `"${name}"`);
        console.log('  - startTime:', `"${startTime}"`);
        console.log('  - endTime:', `"${endTime}"`);
        console.log('  - breakStartTime:', breakStartTime);
        console.log('  - breakEndTime:', breakEndTime);
        
        // Debugging adicional para startTime
        if (startEl) {
            console.log('🔍 [DEBUG] startEl.value antes de trim:', `"${startEl.value}"`);
            console.log('🔍 [DEBUG] startEl.value después de trim:', `"${startTime}"`);
            console.log('🔍 [DEBUG] startTime length:', startTime.length);
            console.log('🔍 [DEBUG] !startTime:', !startTime);
        }
        
        // Obtener tarifas con validación
        const rateNormalEl = document.getElementById('rateNormal');
        const rateOvertimeEl = document.getElementById('rateOvertime');
        const rateWeekendEl = document.getElementById('rateWeekend');
        const rateHolidayEl = document.getElementById('rateHoliday');
        
        const hourlyRates = {
            normal: rateNormalEl ? parseFloat(rateNormalEl.value) || 1.0 : 1.0,
            overtime: rateOvertimeEl ? parseFloat(rateOvertimeEl.value) || 1.5 : 1.5,
            weekend: rateWeekendEl ? parseFloat(rateWeekendEl.value) || 1.5 : 1.5,
            holiday: rateHolidayEl ? parseFloat(rateHolidayEl.value) || 2.0 : 2.0
        };

        // Obtener valores de tolerancia parametrizables (multi-tenant)
        const toleranceEntryBeforeEl = document.getElementById('advToleranceEntryBefore');
        const toleranceEntryAfterEl = document.getElementById('advToleranceEntryAfter');
        const toleranceExitBeforeEl = document.getElementById('advToleranceExitBefore');
        const toleranceExitAfterEl = document.getElementById('advToleranceExitAfter');

        const toleranceConfig = {
            entryBefore: toleranceEntryBeforeEl ? parseInt(toleranceEntryBeforeEl.value) || 15 : 15,
            entryAfter: toleranceEntryAfterEl ? parseInt(toleranceEntryAfterEl.value) || 10 : 10,
            exitBefore: toleranceExitBeforeEl ? parseInt(toleranceExitBeforeEl.value) || 10 : 10,
            exitAfter: toleranceExitAfterEl ? parseInt(toleranceExitAfterEl.value) || 30 : 30
        };

        console.log('⏱️ [SHIFTS] Configuración de tolerancia:', toleranceConfig);

        // Validaciones básicas con debugging específico
        if (!name) {
            console.error('❌ [VALIDATION] Nombre vacío');
            showShiftMessage(await window.t('shifts.validation.name_required'), 'warning');
            return;
        }
        
        if (!startTime || startTime === '') {
            console.error('❌ [VALIDATION] Hora de inicio vacía:', {
                startTime: startTime,
                startTimeLength: startTime.length,
                startEl: startEl,
                startElValue: startEl ? startEl.value : 'elemento no encontrado'
            });
            showShiftMessage(await window.t('shifts.validation.start_time_required'), 'warning');
            return;
        }
        
        if (!endTime || endTime === '') {
            console.error('❌ [VALIDATION] Hora de fin vacía');
            showShiftMessage(await window.t('shifts.validation.end_time_required'), 'warning');
            return;
        }
        
        console.log('✅ [VALIDATION] Validaciones básicas pasadas');
        
        // Preparar datos según tipo de turno
        let shiftData = {
            name,
            description: `Turno ${name} - ${shiftTypes[shiftType]}`,
            startTime,
            endTime,
            breakStartTime,
            breakEndTime,
            shiftType,
            isActive,
            hourlyRates,
            color: '#007bff',
            // Tolerancia parametrizable (multi-tenant - cada empresa define su política)
            toleranceMinutesEntry: toleranceConfig.entryAfter, // Mantener compatibilidad con código legacy
            toleranceMinutesExit: toleranceConfig.exitAfter,   // Mantener compatibilidad con código legacy
            // Nueva estructura detallada de tolerancias
            toleranceConfig: {
                entry: {
                    before: toleranceConfig.entryBefore,  // Minutos antes permitidos
                    after: toleranceConfig.entryAfter     // Minutos después permitidos (tarde)
                },
                exit: {
                    before: toleranceConfig.exitBefore,   // Minutos antes permitidos (salir temprano)
                    after: toleranceConfig.exitAfter      // Minutos después permitidos (quedarse más)
                }
            }
        };

        // Obtener datos de sucursal y feriados
        const branchIdEl = document.getElementById('advBranchId');
        const respectNationalHolidaysEl = document.getElementById('advRespectNationalHolidays');
        const respectProvincialHolidaysEl = document.getElementById('advRespectProvincialHolidays');

        shiftData.branch_id = branchIdEl && branchIdEl.value ? branchIdEl.value : null;
        shiftData.respect_national_holidays = respectNationalHolidaysEl ? respectNationalHolidaysEl.checked : false;
        shiftData.respect_provincial_holidays = respectProvincialHolidaysEl ? respectProvincialHolidaysEl.checked : false;
        shiftData.custom_non_working_days = window.customNonWorkingDays || [];

        console.log('🏢 [SHIFTS] Configuración de feriados:', {
            branch_id: shiftData.branch_id,
            respect_national_holidays: shiftData.respect_national_holidays,
            respect_provincial_holidays: shiftData.respect_provincial_holidays,
            custom_non_working_days: shiftData.custom_non_working_days
        });

        // Configuración específica según tipo
        switch(shiftType) {
            case 'standard':
                // Obtener días seleccionados
                const standardDays = [];
                for (let i = 0; i <= 6; i++) {
                    const dayCheckbox = document.getElementById(`day${i}`);
                    if (dayCheckbox && dayCheckbox.checked) {
                        standardDays.push(i);
                    }
                }
                shiftData.days = standardDays.length > 0 ? standardDays : [1,2,3,4,5];
                break;
                
            case 'rotative':
                const rotationPattern = document.getElementById('rotativePattern')?.value;
                const cycleStartDate = document.getElementById('rotativeCycleStart')?.value;
                
                if (!rotationPattern || !cycleStartDate) {
                    showShiftMessage(await window.t('shifts.validation.rotative_pattern_required'), 'warning');
                    return;
                }
                
                shiftData.rotationPattern = rotationPattern;
                shiftData.cycleStartDate = cycleStartDate;
                
                if (rotationPattern === 'custom') {
                    shiftData.workDays = parseInt(document.getElementById('customWorkDays')?.value) || 12;
                    shiftData.restDays = parseInt(document.getElementById('customRestDays')?.value) || 4;
                }
                break;
                
            case 'permanent':
                const permanentDays = [];
                for (let i = 0; i <= 6; i++) {
                    const dayCheckbox = document.getElementById(`day${i}`);
                    if (dayCheckbox && dayCheckbox.checked) {
                        permanentDays.push(i);
                    }
                }
                shiftData.days = permanentDays;
                shiftData.permanentPriority = document.getElementById('permanentPriority')?.value || 'normal';
                break;
                
            case 'flash':
                const flashStartDate = document.getElementById('flashStartDate')?.value;
                const flashEndDate = document.getElementById('flashEndDate')?.value;
                const flashPriority = document.getElementById('flashPriority')?.value;
                const allowOverride = document.getElementById('flashOverride')?.checked;
                
                if (!flashStartDate || !flashEndDate) {
                    showShiftMessage(await window.t('shifts.validation.flash_dates_required'), 'warning');
                    return;
                }
                
                const flashDays = [];
                for (let i = 0; i <= 6; i++) {
                    const dayCheckbox = document.getElementById(`day${i}`);
                    if (dayCheckbox && dayCheckbox.checked) {
                        flashDays.push(i);
                    }
                }
                
                shiftData.flashStartDate = flashStartDate;
                shiftData.flashEndDate = flashEndDate;
                shiftData.flashPriority = flashPriority || 'high';
                shiftData.allowOverride = allowOverride;
                shiftData.days = flashDays.length > 0 ? flashDays : [1,2,3,4,5];
                break;
        }
        
        console.log('💾 [SHIFTS] Datos del turno a enviar:', shiftData);
        
        // Obtener token de autenticación
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            showShiftMessage(await window.t('shifts.messages.no_auth_token'), 'error');
            return;
        }
        
        // Verificar que progressiveAdmin está disponible
        if (!window.progressiveAdmin || typeof window.progressiveAdmin.getApiUrl !== 'function') {
            console.error('❌ [SHIFTS] window.progressiveAdmin no disponible');
            showShiftMessage(await window.t('shifts.messages.error_system_not_initialized'), 'error');
            return;
        }
        
        // Llamar a la API
        const apiUrl = window.progressiveAdmin.getApiUrl('/api/v1/shifts');
        console.log('🔗 [SHIFTS] API URL:', apiUrl);
        console.log('🔑 [SHIFTS] Token disponible:', token ? 'Sí' : 'No');
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(shiftData)
        });
        
        console.log('💾 [SHIFTS] Response status:', response.status);
        console.log('💾 [SHIFTS] Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ [SHIFTS] Turno creado:', result);
            showShiftMessage(`✅ ${await window.t('shifts.messages.success_created')}`, 'success');
            closeAdvancedShiftModal();
            
            // Recargar lista de turnos
            setTimeout(() => {
                loadAdvancedShifts();
            }, 500);
        } else {
            let errorData;
            try {
                errorData = await response.json();
                console.error('❌ [SHIFTS] Error JSON del servidor:', errorData);
            } catch (e) {
                const errorText = await response.text();
                console.error('❌ [SHIFTS] Error de texto del servidor:', errorText);
                errorData = { error: `HTTP ${response.status}: ${errorText}` };
            }
            
            console.error('❌ [SHIFTS] Response completo:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                headers: Object.fromEntries(response.headers.entries()),
                data: errorData
            });
            
            showShiftMessage(`❌ ${await window.t('shifts.messages.error_creating')}: ${errorData.error || response.statusText || await window.t('shifts.messages.error_connection')}`, 'error');
        }
        
    } catch (error) {
        console.error('❌ [SHIFTS] Error guardando turno:', error);
        showShiftMessage(`❌ ${await window.t('shifts.messages.error_connection')}: ${error.message}`, 'error');
    }
}

// Funciones de gestión de turnos
async function editAdvancedShift(shiftId) {
    console.log('✏️ [SHIFTS] Editando turno avanzado:', shiftId);
    
    try {
        // Buscar el turno en la lista actual
        const shift = currentShifts.find(s => s.id === shiftId);
        if (!shift) {
            showShiftMessage(await window.t('shifts.messages.error_not_found'), 'error');
            return;
        }
        
        console.log('📋 [SHIFTS] Datos del turno a editar:', shift);
        
        // Mostrar modal de edición (reutilizar el modal de creación)
        showAdvancedShiftCreator();
        
        // Esperar a que el modal se cargue
        setTimeout(() => {
            populateEditForm(shift);
            
            // Cambiar el título y botón
            const modal = document.getElementById('advancedShiftModal');
            if (modal) {
                const title = modal.querySelector('h3');
                if (title) title.textContent = '✏️ Editar Turno Avanzado';
                
                const saveButton = modal.querySelector('button[onclick="saveAdvancedShift()"]');
                if (saveButton) {
                    saveButton.textContent = '✏️ Actualizar Turno';
                    saveButton.onclick = () => updateAdvancedShift(shiftId);
                }
            }
        }, 200);
        
    } catch (error) {
        console.error('❌ [SHIFTS] Error editando turno:', error);
        showShiftMessage(await window.t('shifts.messages.error_loading'), 'error');
    }
}

// Función para poblar el formulario con datos del turno
function populateEditForm(shift) {
    console.log('📝 [SHIFTS] Poblando formulario con datos:', shift);
    
    try {
        // Datos básicos
        const nameEl = document.getElementById('advShiftName');
        const statusEl = document.getElementById('advShiftStatus');
        const startEl = document.getElementById('advShiftStart');
        const endEl = document.getElementById('advShiftEnd');
        const breakStartEl = document.getElementById('advBreakStart');
        const breakEndEl = document.getElementById('advBreakEnd');
        
        if (nameEl) nameEl.value = shift.name || '';
        if (statusEl) statusEl.value = shift.isActive ? 'true' : 'false';
        if (startEl) startEl.value = shift.startTime || '';
        if (endEl) endEl.value = shift.endTime || '';
        if (breakStartEl) breakStartEl.value = shift.breakStartTime || '';
        if (breakEndEl) breakEndEl.value = shift.breakEndTime || '';
        
        // Seleccionar tipo de turno
        const shiftTypeRadio = document.querySelector(`input[name="shiftType"][value="${shift.shiftType || 'standard'}"]`);
        if (shiftTypeRadio) {
            shiftTypeRadio.checked = true;
            updateShiftForm(); // Actualizar formulario según tipo
        }
        
        // Tarifas horarias
        const rateNormalEl = document.getElementById('rateNormal');
        const rateOvertimeEl = document.getElementById('rateOvertime');
        const rateWeekendEl = document.getElementById('rateWeekend');
        const rateHolidayEl = document.getElementById('rateHoliday');
        
        if (rateNormalEl && shift.hourlyRates) rateNormalEl.value = shift.hourlyRates.normal || 1.0;
        if (rateOvertimeEl && shift.hourlyRates) rateOvertimeEl.value = shift.hourlyRates.overtime || 1.5;
        if (rateWeekendEl && shift.hourlyRates) rateWeekendEl.value = shift.hourlyRates.weekend || 1.5;
        if (rateHolidayEl && shift.hourlyRates) rateHolidayEl.value = shift.hourlyRates.holiday || 2.0;
        
        // Esperar a que el formulario específico se cargue y luego poblar datos específicos
        setTimeout(() => {
            populateSpecificFields(shift);
        }, 300);
        
    } catch (error) {
        console.error('❌ [SHIFTS] Error poblando formulario:', error);
    }
}

// Función para poblar campos específicos según tipo de turno
function populateSpecificFields(shift) {
    const shiftType = shift.shiftType || 'standard';
    
    switch(shiftType) {
        case 'standard':
        case 'permanent':
            // Seleccionar días
            if (shift.days && Array.isArray(shift.days)) {
                shift.days.forEach(day => {
                    const dayCheckbox = document.getElementById(`day${day}`);
                    if (dayCheckbox) dayCheckbox.checked = true;
                });
            }
            
            if (shiftType === 'permanent') {
                const priorityEl = document.getElementById('permanentPriority');
                if (priorityEl) priorityEl.value = shift.permanentPriority || 'normal';
            }
            break;
            
        case 'rotative':
            const patternEl = document.getElementById('rotativePattern');
            const cycleStartEl = document.getElementById('rotativeCycleStart');

            if (patternEl) patternEl.value = shift.rotationPattern || '12x4';
            if (cycleStartEl) cycleStartEl.value = shift.global_cycle_start_date || shift.cycleStartDate || '';
            
            if (shift.workDays && shift.restDays) {
                const workDaysEl = document.getElementById('customWorkDays');
                const restDaysEl = document.getElementById('customRestDays');
                if (workDaysEl) workDaysEl.value = shift.workDays;
                if (restDaysEl) restDaysEl.value = shift.restDays;
            }
            break;
            
        case 'flash':
            const flashStartEl = document.getElementById('flashStartDate');
            const flashEndEl = document.getElementById('flashEndDate');
            const flashPriorityEl = document.getElementById('flashPriority');
            const flashOverrideEl = document.getElementById('flashOverride');
            
            if (flashStartEl) flashStartEl.value = shift.flashStartDate || '';
            if (flashEndEl) flashEndEl.value = shift.flashEndDate || '';
            if (flashPriorityEl) flashPriorityEl.value = shift.flashPriority || 'high';
            if (flashOverrideEl) flashOverrideEl.checked = shift.allowOverride || false;
            
            // Seleccionar días
            if (shift.days && Array.isArray(shift.days)) {
                shift.days.forEach(day => {
                    const dayCheckbox = document.getElementById(`day${day}`);
                    if (dayCheckbox) dayCheckbox.checked = true;
                });
            }
            break;
    }
}

// Función para actualizar turno existente
async function updateAdvancedShift(shiftId) {
    console.log('🔄 [SHIFTS] Actualizando turno:', shiftId);
    
    try {
        // Obtener datos del formulario (reutilizamos la lógica de saveAdvancedShift)
        const modal = document.getElementById('advancedShiftModal');
        if (!modal) {
            showShiftMessage(await window.t('shifts.messages.error_modal_not_found'), 'error');
            return;
        }
        
        const shiftTypeElement = document.querySelector('input[name="shiftType"]:checked');
        if (!shiftTypeElement) {
            showShiftMessage(await window.t('shifts.messages.error_form_elements'), 'error');
            return;
        }
        const shiftType = shiftTypeElement.value;
        
        // Obtener datos básicos con validación
        const nameEl = document.getElementById('advShiftName');
        const statusEl = document.getElementById('advShiftStatus');
        const startEl = document.getElementById('advShiftStart');
        const endEl = document.getElementById('advShiftEnd');
        const breakStartEl = document.getElementById('advBreakStart');
        const breakEndEl = document.getElementById('advBreakEnd');
        
        if (!nameEl || !statusEl || !startEl || !endEl) {
            showShiftMessage(await window.t('shifts.messages.error_form_elements'), 'error');
            return;
        }
        
        const name = nameEl.value.trim();
        const isActive = statusEl.value === 'true';
        const startTime = startEl.value.trim();
        const endTime = endEl.value.trim();
        const breakStartTime = breakStartEl ? breakStartEl.value.trim() : '';
        const breakEndTime = breakEndEl ? breakEndEl.value.trim() : '';
        
        // Validaciones básicas
        if (!name || !startTime || !endTime) {
            showShiftMessage(await window.t('shifts.validation.required_fields'), 'warning');
            return;
        }
        
        // Obtener tarifas
        const rateNormalEl = document.getElementById('rateNormal');
        const rateOvertimeEl = document.getElementById('rateOvertime');
        const rateWeekendEl = document.getElementById('rateWeekend');
        const rateHolidayEl = document.getElementById('rateHoliday');
        
        const hourlyRates = {
            normal: rateNormalEl ? parseFloat(rateNormalEl.value) || 1.0 : 1.0,
            overtime: rateOvertimeEl ? parseFloat(rateOvertimeEl.value) || 1.5 : 1.5,
            weekend: rateWeekendEl ? parseFloat(rateWeekendEl.value) || 1.5 : 1.5,
            holiday: rateHolidayEl ? parseFloat(rateHolidayEl.value) || 2.0 : 2.0
        };
        
        // Preparar datos actualizados
        let updateData = {
            name,
            description: `Turno ${name} - ${shiftTypes[shiftType]}`,
            startTime,
            endTime,
            breakStartTime: breakStartTime || null,
            breakEndTime: breakEndTime || null,
            shiftType,
            isActive,
            hourlyRates,
            updatedAt: new Date().toISOString()
        };
        
        // Configuración específica según tipo (similar a saveAdvancedShift)
        switch(shiftType) {
            case 'standard':
            case 'permanent':
                const days = [];
                for (let i = 0; i <= 6; i++) {
                    const dayCheckbox = document.getElementById(`day${i}`);
                    if (dayCheckbox && dayCheckbox.checked) {
                        days.push(i);
                    }
                }
                updateData.days = days.length > 0 ? days : [1,2,3,4,5];
                
                if (shiftType === 'permanent') {
                    const priorityEl = document.getElementById('permanentPriority');
                    updateData.permanentPriority = priorityEl?.value || 'normal';
                }
                break;
                
            case 'rotative':
                updateData.rotationPattern = document.getElementById('rotativePattern')?.value;
                updateData.cycleStartDate = document.getElementById('rotativeCycleStart')?.value;
                if (updateData.rotationPattern === 'custom') {
                    updateData.workDays = parseInt(document.getElementById('customWorkDays')?.value) || 12;
                    updateData.restDays = parseInt(document.getElementById('customRestDays')?.value) || 4;
                }
                break;
                
            case 'flash':
                updateData.flashStartDate = document.getElementById('flashStartDate')?.value;
                updateData.flashEndDate = document.getElementById('flashEndDate')?.value;
                updateData.flashPriority = document.getElementById('flashPriority')?.value || 'high';
                updateData.allowOverride = document.getElementById('flashOverride')?.checked;
                
                const flashDays = [];
                for (let i = 0; i <= 6; i++) {
                    const dayCheckbox = document.getElementById(`day${i}`);
                    if (dayCheckbox && dayCheckbox.checked) {
                        flashDays.push(i);
                    }
                }
                updateData.days = flashDays.length > 0 ? flashDays : [1,2,3,4,5];
                break;
        }
        
        console.log('🔄 [SHIFTS] Datos de actualización:', updateData);
        
        // Llamar a la API de actualización
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const apiUrl = window.progressiveAdmin.getApiUrl(`/api/v1/shifts/${shiftId}`);
        
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ [SHIFTS] Turno actualizado:', result);
            showShiftMessage(`✅ ${await window.t('shifts.messages.success_updated')}`, 'success');
            closeAdvancedShiftModal();
            
            // Recargar lista de turnos
            setTimeout(() => {
                loadAdvancedShifts();
            }, 500);
        } else {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                const errorText = await response.text();
                errorData = { error: `HTTP ${response.status}: ${errorText}` };
            }
            
            console.error('❌ [SHIFTS] Error actualizando turno:', errorData);
            showShiftMessage(`❌ ${await window.t('shifts.messages.error_updating')}: ${errorData.error || await window.t('shifts.messages.error_connection')}`, 'error');
        }
        
    } catch (error) {
        console.error('❌ [SHIFTS] Error en actualización:', error);
        showShiftMessage(`❌ ${await window.t('shifts.messages.error_connection')}: ${error.message}`, 'error');
    }
}

async function viewAdvancedShift(shiftId) {
    console.log('👁️ [SHIFTS] Viendo turno avanzado:', shiftId);
    
    try {
        // Buscar el turno
        const shift = currentShifts.find(s => s.id === shiftId);
        if (!shift) {
            showShiftMessage(await window.t('shifts.messages.error_not_found'), 'error');
            return;
        }
        
        // Crear modal de vista
        const modal = document.createElement('div');
        modal.id = 'viewShiftModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            overflow-y: auto;
            padding: 20px;
        `;
        
        const daysText = shift.days ? formatDays(shift.days) : 'Sin días definidos';
        const typeText = shiftTypes[shift.shiftType] || shift.shiftType;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <h3>👁️ Vista Detallada del Turno</h3>
                
                <div style="margin: 20px 0;">
                    <h4 data-translate="shifts.view.basic_info">📋 Información Básica</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">🕐 Nombre:</td><td style="padding: 8px; border: 1px solid #ddd;">${shift.name}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">📊 Tipo:</td><td style="padding: 8px; border: 1px solid #ddd;">${typeText}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">⏰ Horario:</td><td style="padding: 8px; border: 1px solid #ddd;">${shift.startTime} - ${shift.endTime}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">☕ <span data-translate="shifts.table.break">Descanso:</span></td><td style="padding: 8px; border: 1px solid #ddd;">${shift.breakStartTime && shift.breakEndTime ? shift.breakStartTime + ' - ' + shift.breakEndTime : 'Sin descanso'}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">📅 Días:</td><td style="padding: 8px; border: 1px solid #ddd;">${daysText}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">📍 Estado:</td><td style="padding: 8px; border: 1px solid #ddd;"><span style="color: ${shift.isActive ? '#4CAF50' : '#f44336'}">${shift.isActive ? '✅ <span data-translate="common.active">Activo</span>' : '❌ <span data-translate="common.inactive">Inactivo</span>'}</span></td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">👥 Empleados:</td><td style="padding: 8px; border: 1px solid #ddd;">${shift.employees || 0} asignados</td></tr>
                    </table>
                </div>
                
                ${shift.shiftType === 'flash' ? `
                <div style="margin: 20px 0;">
                    <h4>⚡ Configuración Flash</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">📅 Fecha inicio:</td><td style="padding: 8px; border: 1px solid #ddd;">${shift.flashStartDate || 'No definida'}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">📅 Fecha fin:</td><td style="padding: 8px; border: 1px solid #ddd;">${shift.flashEndDate || 'No definida'}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">🔥 Prioridad:</td><td style="padding: 8px; border: 1px solid #ddd;">${shift.flashPriority || 'Normal'}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">⚡ Sobreasignación:</td><td style="padding: 8px; border: 1px solid #ddd;">${shift.allowOverride ? 'Permitida' : 'No permitida'}</td></tr>
                    </table>
                </div>
                ` : ''}
                
                ${shift.hourlyRates ? `
                <div style="margin: 20px 0;">
                    <h4>💰 Tarifas Horarias</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">⏰ Normales:</td><td style="padding: 8px; border: 1px solid #ddd;">${shift.hourlyRates.normal}x</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">⏰ Extras:</td><td style="padding: 8px; border: 1px solid #ddd;">${shift.hourlyRates.overtime}x</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">🏖️ Fin de semana:</td><td style="padding: 8px; border: 1px solid #ddd;">${shift.hourlyRates.weekend}x</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">🎉 Feriados:</td><td style="padding: 8px; border: 1px solid #ddd;">${shift.hourlyRates.holiday}x</td></tr>
                    </table>
                </div>
                ` : ''}
                
                <div style="margin: 20px 0;">
                    <h4>📝 Información Adicional</h4>
                    <p><strong>🆔 ID:</strong> ${shift.id}</p>
                    ${shift.createdAt ? `<p><strong>📅 Creado:</strong> ${new Date(shift.createdAt).toLocaleString()}</p>` : ''}
                    ${shift.updatedAt ? `<p><strong>🔄 Actualizado:</strong> ${new Date(shift.updatedAt).toLocaleString()}</p>` : ''}
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <button class="btn btn-primary" onclick="closeViewShiftModal(); editAdvancedShift('${shift.id}')" style="margin-right: 10px;">✏️ Editar</button>
                    <button class="btn btn-secondary" onclick="closeViewShiftModal()">❌ Cerrar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('❌ [SHIFTS] Error viendo turno:', error);
        showShiftMessage(await window.t('shifts.messages.error_loading'), 'error');
    }
}

// Función para cerrar modal de vista
function closeViewShiftModal() {
    const modal = document.getElementById('viewShiftModal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

async function duplicateShift(shiftId) {
    console.log('📋 [SHIFTS] Duplicando turno:', shiftId);

    try {
        // Buscar el turno a duplicar
        const shift = currentShifts.find(s => s.id === shiftId);
        if (!shift) {
            showShiftMessage(await window.t('shifts.messages.error_not_found'), 'error');
            return;
        }
        
        // Mostrar modal de creación con datos del turno duplicado
        showAdvancedShiftCreator();
        
        // Esperar a que el modal se cargue y poblar con datos
        setTimeout(() => {
            const duplicatedData = {
                ...shift,
                name: `${shift.name} (Copia)`,
                id: undefined // Será generado nuevo
            };
            
            populateEditForm(duplicatedData);
            
            // Cambiar el título
            const modal = document.getElementById('advancedShiftModal');
            if (modal) {
                const title = modal.querySelector('h3');
                if (title) title.setAttribute('data-translate', 'shifts.form.modal_title_duplicate');
            }
        }, 200);

    } catch (error) {
        console.error('❌ [SHIFTS] Error duplicando turno:', error);
        showShiftMessage(await window.t('shifts.messages.error_loading'), 'error');
    }
}

async function deleteAdvancedShift(shiftId) {
    // Buscar el turno para mostrar nombre en confirmación
    const shift = currentShifts.find(s => s.id === shiftId);
    const shiftName = shift ? shift.name : 'este turno';

    const confirmMsg = `${await window.t('shifts.confirm.delete_title', { name: shiftName })}\n\n${await window.t('shifts.confirm.delete_warning')}`;
    if (confirm(confirmMsg)) {
        console.log('🗑️ [SHIFTS] Eliminando turno:', shiftId);
        
        try {
            // Verificar si es un turno de ejemplo
            if (shiftId.startsWith('example-')) {
                showShiftMessage(await window.t('shifts.messages.example_cannot_delete'), 'error');
                return;
            }
            
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const apiUrl = window.progressiveAdmin.getApiUrl(`/api/v1/shifts/${shiftId}`);
            
            const response = await fetch(apiUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ [SHIFTS] Turno eliminado:', result);
                showShiftMessage(`🗑️ ${await window.t('shifts.messages.success_deleted')}`, 'success');
                
                // Recargar lista de turnos
                setTimeout(() => {
                    loadAdvancedShifts();
                }, 500);
            } else {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    const errorText = await response.text();
                    errorData = { error: `HTTP ${response.status}: ${errorText}` };
                }
                
                console.error('❌ [SHIFTS] Error eliminando turno:', errorData);
                showShiftMessage(`❌ ${await window.t('shifts.messages.error_deleting')}: ${errorData.error || await window.t('shifts.messages.error_connection')}`, 'error');
            }
            
        } catch (error) {
            console.error('❌ [SHIFTS] Error en eliminación:', error);
            showShiftMessage(`❌ ${await window.t('shifts.messages.error_connection')}: ${error.message}`, 'error');
        }
    }
}

// Funciones específicas
function showFlashShiftCreator() {
    // Pre-seleccionar tipo flash y abrir modal
    showAdvancedShiftCreator();
    setTimeout(() => {
        document.querySelector('input[value="flash"]').checked = true;
        updateShiftForm();
    }, 100);
}

function showShiftCalendar() {
    showShiftTab('calendar');
}

function showHourlyConfiguration() {
    showShiftTab('config');
}

// Mantener funciones originales por compatibilidad
function loadShifts() {
    loadAdvancedShifts();
}

function showAddShift() {
    showAdvancedShiftCreator();
}

// Función de mensajes (mantener original)
function showShiftMessage(message, type) {
    let messageElement = document.getElementById('shiftMessage');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'shiftMessage';
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

// 📅 Ver calendario de turno rotativo
async function viewShiftCalendar(shiftId) {
    console.log('📅 [SHIFT-CALENDAR] Abriendo calendario del turno:', shiftId);

    try {
        // Store shiftId globally
        window.currentViewShiftId = shiftId;

        // Cargar el script del calendario si no está cargado
        if (!window.ShiftCalendarView) {
            console.log('📦 [SHIFT-CALENDAR] Cargando script shift-calendar-view.js...');
            await loadCalendarScript('/js/modules/shift-calendar-view.js');
            console.log('✅ [SHIFT-CALENDAR] Script cargado');
        }

        // Crear modal para mostrar el calendario
        const modal = document.createElement('div');
        modal.id = 'shiftCalendarModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            overflow-y: auto;
            padding: 20px;
        `;

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; max-width: 1200px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative;">
                <div style="position: sticky; top: 0; background: white; border-bottom: 1px solid #ddd; padding: 20px; z-index: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0;">📅 Calendario del Turno Rotativo</h2>
                        <button onclick="closeShiftCalendarModal()" style="background: #f44336; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 16px;">✕ Cerrar</button>
                    </div>
                </div>
                <div id="shift-calendar-content" style="padding: 20px;">
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <div style="font-size: 48px; margin-bottom: 15px;">📅</div>
                        <p>Cargando calendario del turno...</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Cargar y renderizar el calendario
        console.log('🎨 [SHIFT-CALENDAR] Renderizando calendario...');

        // Crear instancia global para que los botones onclick funcionen
        window.shiftCalendarView = new ShiftCalendarView();
        const html = await window.shiftCalendarView.render(shiftId);

        const container = document.getElementById('shift-calendar-content');
        if (container) {
            container.innerHTML = html;
        }

        console.log('✅ [SHIFT-CALENDAR] Calendario cargado exitosamente');
    } catch (error) {
        console.error('❌ [SHIFT-CALENDAR] Error cargando calendario:', error);
        showShiftMessage(`Error al cargar calendario: ${error.message}`, 'error');
    }
}

// Cerrar modal de calendario
function closeShiftCalendarModal() {
    const modal = document.getElementById('shiftCalendarModal');
    if (modal && modal.parentNode) {
        modal.parentNode.removeChild(modal);
    }
}

// Helper para cargar scripts dinámicamente
function loadCalendarScript(src) {
    return new Promise((resolve, reject) => {
        // Verificar si ya está cargado
        if (document.querySelector(`script[src="${src}"]`)) {
            console.log(`📦 Script ${src} ya estaba cargado`);
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            console.log(`✅ Script ${src} cargado`);
            resolve();
        };
        script.onerror = () => {
            console.error(`❌ Error cargando script ${src}`);
            reject(new Error(`No se pudo cargar ${src}`));
        };
        document.head.appendChild(script);
    });
}

// ============ FUNCIONES DE GESTIÓN DE FERIADOS Y SUCURSALES ============

// Variable global para días no laborables custom
window.customNonWorkingDays = [];

// Cargar sucursales y poblar dropdown
async function loadBranches() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/branches', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('⚠️ [SHIFTS] No se pudieron cargar sucursales');
            return;
        }

        const data = await response.json();
        const branches = data.branches || data.data || [];

        const branchSelect = document.getElementById('advBranchId');
        if (!branchSelect) return;

        // Limpiar opciones existentes excepto "TODAS"
        branchSelect.innerHTML = '<option value="">TODAS las sucursales</option>';

        // Agregar sucursales
        branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.id;
            option.textContent = branch.name || branch.nombre || `Sucursal ${branch.id}`;
            branchSelect.appendChild(option);
        });

        console.log(`✅ [SHIFTS] ${branches.length} sucursales cargadas`);
    } catch (error) {
        console.error('❌ [SHIFTS] Error cargando sucursales:', error);
    }
}

// Agregar día no laborable personalizado
function addCustomNonWorkingDay() {
    const dateInput = document.getElementById('advCustomNonWorkingDay');
    if (!dateInput || !dateInput.value) {
        alert('Por favor seleccione una fecha');
        return;
    }

    const date = dateInput.value;

    // Verificar si ya existe
    if (window.customNonWorkingDays.includes(date)) {
        alert('Esta fecha ya está en la lista');
        return;
    }

    // Agregar a la lista
    window.customNonWorkingDays.push(date);
    window.customNonWorkingDays.sort();

    // Actualizar UI
    renderCustomNonWorkingDays();

    // Limpiar input
    dateInput.value = '';

    console.log('✅ [SHIFTS] Día no laborable agregado:', date);
}

// Remover día no laborable personalizado
function removeCustomNonWorkingDay(date) {
    const index = window.customNonWorkingDays.indexOf(date);
    if (index > -1) {
        window.customNonWorkingDays.splice(index, 1);
        renderCustomNonWorkingDays();
        console.log('✅ [SHIFTS] Día no laborable eliminado:', date);
    }
}

// Renderizar lista de días no laborables
function renderCustomNonWorkingDays() {
    const listContainer = document.getElementById('customNonWorkingDaysList');
    if (!listContainer) return;

    if (window.customNonWorkingDays.length === 0) {
        listContainer.innerHTML = '<small style="color: #999;">No hay días personalizados agregados</small>';
        return;
    }

    listContainer.innerHTML = window.customNonWorkingDays.map(date => `
        <div style="display: inline-flex; align-items: center; background: #e3f2fd; padding: 5px 10px; border-radius: 5px; margin: 2px;">
            <span style="margin-right: 8px;">${date}</span>
            <button onclick="removeCustomNonWorkingDay('${date}')" style="background: #f44336; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 0.8em;">
                ✕
            </button>
        </div>
    `).join('');
}

// ✅ EXPOSICIÓN GLOBAL (requerido para panel-empresa.html) (Legacy)
window.showShiftsContent = showShiftsContent;
window.viewShiftCalendar = viewShiftCalendar;
window.closeShiftCalendarModal = closeShiftCalendarModal;
window.addCustomNonWorkingDay = addCustomNonWorkingDay;
window.removeCustomNonWorkingDay = removeCustomNonWorkingDay;

// ✅ EXPORTACIÓN UNIFICADA (Sistema de Auto-Conocimiento v3.0)
if (!window.Modules) window.Modules = {};
window.Modules.shifts = {
    init: showShiftsContent
};

console.log('✅ [SHIFTS] Módulo turnos avanzado v7.0 configurado - Sistema flexible completo');
console.log('🧠 [SHIFTS] Exportación unificada registrada: window.Modules.shifts');