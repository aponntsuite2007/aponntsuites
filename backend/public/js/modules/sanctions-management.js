// Sanctions Management Module - Sistema de Gestión de Sanciones y Medidas Disciplinarias
console.log('🚨 [SANCTIONS-MANAGEMENT] Módulo de gestión de sanciones cargado');

// Main function to show sanctions content
function showSanctionsManagementContent() {
    console.log('🚨 [SANCTIONS-MANAGEMENT] Ejecutando showSanctionsManagementContent()');

    const content = document.getElementById('mainContent');
    if (!content) {
        console.error('❌ [SANCTIONS-MANAGEMENT] mainContent no encontrado');
        return;
    }

    content.style.setProperty('display', 'block', 'important');

    content.innerHTML = `
        <div class="tab-content active">
            <div class="card" style="padding: 0; overflow: hidden;">
                <!-- Header del módulo -->
                <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; font-size: 28px;">🚨 Gestión de Sanciones y Medidas Disciplinarias</h2>
                            <p style="margin: 5px 0 0 0; opacity: 0.9;">Sistema integral de sanciones basado en scoring y cumplimiento</p>
                        </div>
                        <button onclick="showNewSanctionModal()"
                                style="background: rgba(255,255,255,0.2); border: 2px solid white; color: white; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            ⚠️ Nueva Sanción
                        </button>
                    </div>
                </div>

                <!-- Tabs de navegación -->
                <div style="background: #f8f9fa; border-bottom: 1px solid #e9ecef;">
                    <div style="display: flex; padding: 0 25px;">
                        <button onclick="switchSanctionTab('active')" id="tab-active"
                                class="sanction-tab active-sanction-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid #e74c3c;">
                            🚨 Sanciones Activas
                        </button>
                        <button onclick="switchSanctionTab('history')" id="tab-history"
                                class="sanction-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            📜 Historial
                        </button>
                        <button onclick="switchSanctionTab('automatic')" id="tab-automatic"
                                class="sanction-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            🤖 Sanciones Automáticas
                        </button>
                        <button onclick="switchSanctionTab('appeals')" id="tab-appeals"
                                class="sanction-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            ⚖️ Apelaciones
                        </button>
                        <button onclick="switchSanctionTab('analytics')" id="tab-analytics"
                                class="sanction-tab"
                                style="padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid transparent;">
                            📊 Análisis
                        </button>
                    </div>
                </div>

                <!-- Contenido de las pestañas -->
                <div style="padding: 25px;" id="sanctionTabContent">
                    ${getActiveSanctionsContent()}
                </div>
            </div>
        </div>

        <!-- Modal para nueva sanción -->
        <div id="newSanctionModal" class="modal" style="display: none !important; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9997;">
            <div class="modal-content" style="position: relative; margin: 1% auto; width: 95%; max-width: 1200px; background: white; border-radius: 12px; max-height: 95vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 20px 30px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">🚨 Nueva Sanción Disciplinaria</h3>
                    <button onclick="closeNewSanctionModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    ${getNewSanctionForm()}
                </div>
            </div>
        </div>

        <!-- Modal para detalles de sanción -->
        <div id="sanctionDetailsModal" class="modal" style="display: none !important; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9997;">
            <div class="modal-content" style="position: relative; margin: 2% auto; width: 90%; max-width: 900px; background: white; border-radius: 12px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 20px 30px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">📋 Detalles de Sanción</h3>
                    <button onclick="closeSanctionDetailsModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 30px;" id="sanctionDetailsContent">
                    <!-- Content will be populated when opening -->
                </div>
            </div>
        </div>
    `;

    console.log('✅ [SANCTIONS-MANAGEMENT] Contenido renderizado exitosamente');

    // FORCE HIDE ALL MODALS (fix for Render cache issue)
    setTimeout(() => {
        const modals = document.querySelectorAll('#sanctionDetailsModal, #newSanctionModal, #editSanctionModal');
        modals.forEach(modal => {
            if (modal) {
                modal.style.setProperty('display', 'none', 'important');
                console.log('🔒 [FORCE-HIDE] Modal ocultado:', modal.id);
            }
        });
    }, 100);

    // Initialize sanctions data
    loadActiveSanctions();
}

// Switch between sanction tabs
function switchSanctionTab(tabName) {
    // Update tab styles
    document.querySelectorAll('.sanction-tab').forEach(tab => {
        tab.style.borderBottom = '3px solid transparent';
        tab.classList.remove('active-sanction-tab');
    });

    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) {
        activeTab.style.borderBottom = '3px solid #e74c3c';
        activeTab.classList.add('active-sanction-tab');
    }

    // Update content
    const contentDiv = document.getElementById('sanctionTabContent');
    if (!contentDiv) return;

    switch(tabName) {
        case 'active':
            contentDiv.innerHTML = getActiveSanctionsContent();
            loadActiveSanctions();
            break;
        case 'history':
            contentDiv.innerHTML = getSanctionHistoryContent();
            loadSanctionHistory();
            break;
        case 'automatic':
            contentDiv.innerHTML = getAutomaticSanctionsContent();
            loadAutomaticSanctions();
            break;
        case 'appeals':
            contentDiv.innerHTML = getSanctionAppealsContent();
            loadSanctionAppeals();
            break;
        case 'analytics':
            contentDiv.innerHTML = getSanctionAnalyticsContent();
            loadSanctionAnalytics();
            break;
    }
}

// Get active sanctions content
function getActiveSanctionsContent() {
    return `
        <div class="active-sanctions-container">
            <!-- Filtros y búsqueda -->
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 25px; gap: 15px; flex-wrap: wrap;">
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <select id="sanctionSeverityFilter" onchange="filterSanctions()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="all">Todas las severidades</option>
                        <option value="warning">Advertencia</option>
                        <option value="minor">Sanción Menor</option>
                        <option value="major">Sanción Mayor</option>
                        <option value="suspension">Suspensión</option>
                        <option value="termination">Despido</option>
                    </select>

                    <select id="sanctionTypeFilter" onchange="filterSanctions()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="all">Todos los tipos</option>
                        <option value="attendance">Asistencia</option>
                        <option value="training">Capacitaciones</option>
                        <option value="behavior">Comportamiento</option>
                        <option value="performance">Desempeño</option>
                        <option value="safety">Seguridad</option>
                    </select>

                    <select id="sanctionStatusFilter" onchange="filterSanctions()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="all">Todos los estados</option>
                        <option value="active">Activa</option>
                        <option value="appealed">En apelación</option>
                        <option value="expired">Vencida</option>
                    </select>
                </div>

                <input type="text" id="sanctionSearch" placeholder="Buscar empleado..."
                       onkeyup="searchSanctions()"
                       style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; min-width: 200px;">
            </div>

            <!-- Resumen estadísticas -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <div style="background: #fff3cd; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #f39c12;">
                    <div style="font-size: 2rem; font-weight: bold; color: #f39c12;">12</div>
                    <div style="color: #8d6e08; font-weight: 600;">Sanciones Activas</div>
                </div>
                <div style="background: #f8d7da; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #e74c3c;">
                    <div style="font-size: 2rem; font-weight: bold; color: #e74c3c;">5</div>
                    <div style="color: #a12622; font-weight: 600;">Sanciones Mayores</div>
                </div>
                <div style="background: #d1ecf1; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #17a2b8;">
                    <div style="font-size: 2rem; font-weight: bold; color: #17a2b8;">3</div>
                    <div style="color: #105a68; font-weight: 600;">En Apelación</div>
                </div>
                <div style="background: #d4edda; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #28a745;">
                    <div style="font-size: 2rem; font-weight: bold; color: #28a745;">8</div>
                    <div style="color: #1d5929; font-weight: 600;">Automáticas por IA</div>
                </div>
            </div>

            <!-- Lista de sanciones activas -->
            <div id="sanctions-list">
                <div style="text-align: center; padding: 40px;">
                    🔄 Cargando sanciones activas...
                </div>
            </div>
        </div>
    `;
}

// Get sanction history content
function getSanctionHistoryContent() {
    return `
        <div class="sanction-history-container">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 25px; gap: 15px;">
                <div style="display: flex; gap: 15px;">
                    <select id="historyPeriod" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="month">Último mes</option>
                        <option value="quarter" selected>Último trimestre</option>
                        <option value="year">Último año</option>
                        <option value="all">Todo el historial</option>
                    </select>

                    <select id="historyType" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="all">Todos los tipos</option>
                        <option value="completed">Completadas</option>
                        <option value="revoked">Revocadas</option>
                        <option value="appealed">Apeladas</option>
                    </select>
                </div>

                <button onclick="exportSanctionHistory()"
                        style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                    📊 Exportar Historial
                </button>
            </div>

            <div id="sanction-history-list">
                <div style="text-align: center; padding: 40px;">
                    📊 Seleccione los parámetros para ver el historial
                </div>
            </div>
        </div>
    `;
}

// Get automatic sanctions content
function getAutomaticSanctionsContent() {
    return `
        <div class="automatic-sanctions-container">
            <div style="background: #e8f5e8; border: 2px solid #28a745; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #1e7e34; margin: 0 0 10px 0;">🤖 Sistema de Sanciones Automáticas por IA</h3>
                <p style="margin: 0; color: #155724;">Este sistema aplica sanciones automáticamente basado en el scoring del empleado, cumplimiento de capacitaciones, asistencia y detección biométrica de comportamientos inadecuados.</p>
            </div>

            <!-- Configuración de reglas automáticas -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 25px;">
                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #e74c3c;">⚙️ Reglas de Asistencia</h4>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Faltas injustificadas en 30 días:</label>
                        <input type="number" value="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <small style="color: #666;">Sanción: Advertencia escrita</small>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Llegadas tarde en 30 días:</label>
                        <input type="number" value="5" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <small style="color: #666;">Sanción: Advertencia verbal</small>
                    </div>
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #e74c3c;">📚 Reglas de Capacitaciones</h4>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Capacitaciones no completadas:</label>
                        <input type="number" value="2" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <small style="color: #666;">Sanción: Suspensión de beneficios</small>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Score mínimo requerido:</label>
                        <input type="number" value="70" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <small style="color: #666;">Sanción: Plan de mejora</small>
                    </div>
                </div>
            </div>

            <!-- Sanciones automáticas recientes -->
            <div id="automatic-sanctions-list">
                <div style="text-align: center; padding: 40px;">
                    🔄 Cargando sanciones automáticas...
                </div>
            </div>
        </div>
    `;
}

// Get sanction appeals content
function getSanctionAppealsContent() {
    return `
        <div class="sanction-appeals-container">
            <div style="background: #d1ecf1; border: 2px solid #17a2b8; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #0c5460; margin: 0 0 10px 0;">⚖️ Proceso de Apelaciones</h3>
                <p style="margin: 0; color: #105a68;">Los empleados pueden apelar sanciones dentro de 15 días hábiles. Las apelaciones son revisadas por un comité independiente.</p>
            </div>

            <!-- Lista de apelaciones pendientes -->
            <div id="appeals-list">
                <div style="text-align: center; padding: 40px;">
                    🔄 Cargando apelaciones...
                </div>
            </div>
        </div>
    `;
}

// Get sanction analytics content
function getSanctionAnalyticsContent() {
    return `
        <div class="sanction-analytics-container">
            <h3 style="margin: 0 0 20px 0;">📊 Análisis de Sanciones y Tendencias</h3>

            <!-- Gráficos de análisis -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 25px;">
                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #e74c3c;">📈 Tendencia de Sanciones</h4>
                    <div id="sanction-trend-chart" style="height: 300px; display: flex; align-items: center; justify-content: center; color: #666;">
                        Gráfico de tendencias de sanciones
                    </div>
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #f39c12;">🎯 Sanciones por Categoría</h4>
                    <div id="sanction-category-chart" style="height: 300px; display: flex; align-items: center; justify-content: center; color: #666;">
                        Gráfico por categorías
                    </div>
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #8e44ad;">👥 Departamentos más Sancionados</h4>
                    <div id="department-sanctions-chart" style="height: 300px; display: flex; align-items: center; justify-content: center; color: #666;">
                        Análisis por departamentos
                    </div>
                </div>

                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 15px 0; color: #17a2b8;">🔄 Efectividad de Sanciones</h4>
                    <div id="sanction-effectiveness-chart" style="height: 300px; display: flex; align-items: center; justify-content: center; color: #666;">
                        Análisis de efectividad
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Get new sanction form
function getNewSanctionForm() {
    return `
        <form onsubmit="submitNewSanction(event)">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                <div>
                    <h4 style="margin: 0 0 15px 0; color: #e74c3c;">👤 Información del Empleado</h4>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Empleado:</label>
                        <select name="employeeId" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">Seleccionar empleado...</option>
                            <option value="1">Juan Pérez - EMP001</option>
                            <option value="2">María González - EMP002</option>
                            <option value="3">Carlos Rodriguez - EMP003</option>
                            <option value="4">Ana Martínez - EMP004</option>
                            <option value="5">Luis López - EMP005</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo de Sanción:</label>
                        <select name="sanctionType" required onchange="updateSanctionOptions(this.value)" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">Seleccionar tipo...</option>
                            <option value="attendance">Asistencia</option>
                            <option value="training">Capacitaciones</option>
                            <option value="behavior">Comportamiento</option>
                            <option value="performance">Desempeño</option>
                            <option value="safety">Seguridad</option>
                            <option value="other">Otro</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Severidad:</label>
                        <select name="severity" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="warning">Advertencia Verbal</option>
                            <option value="written_warning">Advertencia Escrita</option>
                            <option value="minor">Sanción Menor</option>
                            <option value="major">Sanción Mayor</option>
                            <option value="suspension">Suspensión</option>
                            <option value="termination">Despido</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Supervisor Responsable:</label>
                        <select name="supervisorId" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">Seleccionar supervisor...</option>
                            <option value="1">Roberto Manager</option>
                            <option value="2">Patricia Supervisor</option>
                            <option value="3">Antonio Jefe</option>
                        </select>
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 15px 0; color: #e74c3c;">📋 Detalles de la Sanción</h4>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Motivo Detallado:</label>
                        <textarea name="reason" required placeholder="Describa detalladamente el motivo de la sanción..."
                                  style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; height: 100px; resize: vertical;"></textarea>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Evidencia/Documentación:</label>
                        <textarea name="evidence" placeholder="Referencias a evidencia, testigos, documentos..."
                                  style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; height: 80px; resize: vertical;"></textarea>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Fecha de Aplicación:</label>
                        <input type="date" name="effectiveDate" required
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Duración (días):</label>
                        <input type="number" name="duration" min="1" max="365" placeholder="Días de vigencia"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        <small style="color: #666;">Dejar vacío para sanciones permanentes</small>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Impacto en Scoring:</label>
                        <select name="scoringImpact" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="0">Sin impacto</option>
                            <option value="-5">-5 puntos</option>
                            <option value="-10">-10 puntos</option>
                            <option value="-15">-15 puntos</option>
                            <option value="-20">-20 puntos</option>
                            <option value="-25">-25 puntos</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <label style="display: flex; align-items: center; font-weight: 600;">
                            <input type="checkbox" name="notifyEmployee" checked style="margin-right: 8px;">
                            Notificar al empleado inmediatamente
                        </label>
                        <label style="display: flex; align-items: center; font-weight: 600; margin-top: 8px;">
                            <input type="checkbox" name="appealable" checked style="margin-right: 8px;">
                            Permitir apelación
                        </label>
                    </div>
                    <div>
                        <button type="button" onclick="closeNewSanctionModal()"
                                style="background: #95a5a6; color: white; border: none; padding: 12px 24px; margin-right: 10px; border-radius: 6px; cursor: pointer;">
                            Cancelar
                        </button>
                        <button type="submit"
                                style="background: #e74c3c; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">
                            🚨 Aplicar Sanción
                        </button>
                    </div>
                </div>
            </div>
        </form>
    `;
}

// Modal functions
function showNewSanctionModal() {
    const modal = document.getElementById('newSanctionModal');
    modal.style.setProperty('display', 'block', 'important');
}

function closeNewSanctionModal() {
    const modal = document.getElementById('newSanctionModal');
    modal.style.setProperty('display', 'none', 'important');
}

function showSanctionDetails(sanctionId) {
    const modal = document.getElementById('sanctionDetailsModal');
    const content = document.getElementById('sanctionDetailsContent');

    // Mock sanction data
    const sanction = {
        id: sanctionId,
        employee: 'Carlos Rodriguez',
        legajo: 'EMP003',
        type: 'training',
        severity: 'major',
        reason: 'No completó capacitaciones obligatorias de seguridad dentro del plazo establecido',
        evidence: 'Sistema de capacitaciones muestra 3 módulos vencidos. Notificaciones enviadas sin respuesta.',
        supervisor: 'Roberto Manager',
        effectiveDate: '2025-09-15',
        duration: '30',
        scoringImpact: '-15',
        status: 'active'
    };

    content.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
            <div>
                <h4 style="margin: 0 0 15px 0; color: #e74c3c;">👤 Información del Empleado</h4>
                <p><strong>Nombre:</strong> ${sanction.employee}</p>
                <p><strong>Legajo:</strong> ${sanction.legajo}</p>
                <p><strong>Supervisor:</strong> ${sanction.supervisor}</p>

                <h4 style="margin: 20px 0 15px 0; color: #e74c3c;">📋 Detalles de la Sanción</h4>
                <p><strong>Tipo:</strong> ${getSanctionTypeText(sanction.type)}</p>
                <p><strong>Severidad:</strong> ${getSanctionSeverityText(sanction.severity)}</p>
                <p><strong>Estado:</strong> ${getSanctionStatusText(sanction.status)}</p>
                <p><strong>Fecha de Aplicación:</strong> ${sanction.effectiveDate}</p>
                <p><strong>Duración:</strong> ${sanction.duration} días</p>
                <p><strong>Impacto en Scoring:</strong> ${sanction.scoringImpact} puntos</p>
            </div>

            <div>
                <h4 style="margin: 0 0 15px 0; color: #e74c3c;">📝 Motivo y Evidencia</h4>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                    <strong>Motivo:</strong><br>
                    ${sanction.reason}
                </div>

                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                    <strong>Evidencia:</strong><br>
                    ${sanction.evidence}
                </div>

                <h4 style="margin: 20px 0 15px 0; color: #e74c3c;">⚖️ Acciones Disponibles</h4>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button onclick="modifySanction('${sanction.id}')" style="background: #f39c12; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer;">
                        ✏️ Modificar Sanción
                    </button>
                    <button onclick="revokeSanction('${sanction.id}')" style="background: #28a745; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer;">
                        ❌ Revocar Sanción
                    </button>
                    <button onclick="extendSanction('${sanction.id}')" style="background: #e74c3c; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer;">
                        ⏰ Extender Duración
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.style.setProperty('display', 'block', 'important');
}

function closeSanctionDetailsModal() {
    const modal = document.getElementById('sanctionDetailsModal');
    modal.style.setProperty('display', 'none', 'important');
}

// Load functions
async function loadActiveSanctions() {
    console.log('🚨 [SANCTIONS-MANAGEMENT] Cargando sanciones activas...');

    const container = document.getElementById('sanctions-list');
    if (!container) return;

    // Mock data
    const sanctions = [
        {
            id: 1,
            employee: 'Carlos Rodriguez',
            legajo: 'EMP003',
            type: 'training',
            severity: 'major',
            reason: 'No completó capacitaciones obligatorias de seguridad',
            supervisor: 'Roberto Manager',
            effectiveDate: '2025-09-15',
            duration: 30,
            scoringImpact: -15,
            status: 'active',
            daysRemaining: 22
        },
        {
            id: 2,
            employee: 'María González',
            legajo: 'EMP002',
            type: 'attendance',
            severity: 'minor',
            reason: 'Llegadas tarde reiteradas (5 en 30 días)',
            supervisor: 'Patricia Supervisor',
            effectiveDate: '2025-09-10',
            duration: 15,
            scoringImpact: -10,
            status: 'active',
            daysRemaining: 8
        },
        {
            id: 3,
            employee: 'Luis López',
            legajo: 'EMP005',
            type: 'behavior',
            severity: 'major',
            reason: 'Comportamiento inadecuado detectado por IA biométrica',
            supervisor: 'Antonio Jefe',
            effectiveDate: '2025-09-18',
            duration: 45,
            scoringImpact: -20,
            status: 'appealed',
            daysRemaining: 40
        }
    ];

    displayActiveSanctions(sanctions);
}

function displayActiveSanctions(sanctions) {
    const container = document.getElementById('sanctions-list');
    if (!container || !sanctions.length) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No hay sanciones activas</div>';
        return;
    }

    container.innerHTML = sanctions.map(sanction => `
        <div class="sanction-card" style="border: 2px solid ${getSeverityColor(sanction.severity)}; padding: 20px; margin-bottom: 15px; border-radius: 10px; background: white;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div>
                    <h4 style="margin: 0 0 5px 0; color: #2c3e50;">${sanction.employee} (${sanction.legajo})</h4>
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <span style="background: ${getSanctionTypeColor(sanction.type)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                            ${getSanctionTypeText(sanction.type)}
                        </span>
                        <span style="background: ${getSeverityColor(sanction.severity)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                            ${getSanctionSeverityText(sanction.severity)}
                        </span>
                        <span style="background: ${getStatusColor(sanction.status)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                            ${getSanctionStatusText(sanction.status)}
                        </span>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 18px; font-weight: bold; color: ${sanction.scoringImpact < 0 ? '#e74c3c' : '#27ae60'};">${sanction.scoringImpact}</div>
                    <div style="font-size: 12px; color: #666;">Impacto Score</div>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <strong>Motivo:</strong> ${sanction.reason}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div>
                    <strong>Supervisor:</strong> ${sanction.supervisor}<br>
                    <strong>Fecha:</strong> ${sanction.effectiveDate}
                </div>
                <div style="text-align: right;">
                    <div style="color: ${sanction.daysRemaining <= 5 ? '#e74c3c' : '#f39c12'}; font-weight: bold;">
                        ${sanction.daysRemaining} días restantes
                    </div>
                    <div style="font-size: 12px; color: #666;">de ${sanction.duration} días total</div>
                </div>
            </div>

            <div style="text-align: right;">
                <button onclick="showSanctionDetails(${sanction.id})"
                        style="background: #3498db; color: white; border: none; padding: 8px 16px; margin-right: 10px; border-radius: 4px; cursor: pointer;">
                    👁️ Ver Detalles
                </button>
                ${sanction.status === 'appealed' ? `
                    <button onclick="reviewAppeal(${sanction.id})"
                            style="background: #f39c12; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        ⚖️ Revisar Apelación
                    </button>
                ` : `
                    <button onclick="modifySanction(${sanction.id})"
                            style="background: #95a5a6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        ✏️ Modificar
                    </button>
                `}
            </div>
        </div>
    `).join('');
}

// Utility functions
function getSeverityColor(severity) {
    switch(severity) {
        case 'warning': return '#f39c12';
        case 'written_warning': return '#e67e22';
        case 'minor': return '#e74c3c';
        case 'major': return '#c0392b';
        case 'suspension': return '#8e44ad';
        case 'termination': return '#2c3e50';
        default: return '#95a5a6';
    }
}

function getSanctionSeverityText(severity) {
    switch(severity) {
        case 'warning': return 'Advertencia';
        case 'written_warning': return 'Advertencia Escrita';
        case 'minor': return 'Sanción Menor';
        case 'major': return 'Sanción Mayor';
        case 'suspension': return 'Suspensión';
        case 'termination': return 'Despido';
        default: return 'No Definido';
    }
}

function getSanctionTypeColor(type) {
    switch(type) {
        case 'attendance': return '#e74c3c';
        case 'training': return '#f39c12';
        case 'behavior': return '#8e44ad';
        case 'performance': return '#e67e22';
        case 'safety': return '#c0392b';
        default: return '#95a5a6';
    }
}

function getSanctionTypeText(type) {
    switch(type) {
        case 'attendance': return 'Asistencia';
        case 'training': return 'Capacitaciones';
        case 'behavior': return 'Comportamiento';
        case 'performance': return 'Desempeño';
        case 'safety': return 'Seguridad';
        default: return 'Otro';
    }
}

function getStatusColor(status) {
    switch(status) {
        case 'active': return '#e74c3c';
        case 'appealed': return '#f39c12';
        case 'expired': return '#95a5a6';
        case 'revoked': return '#27ae60';
        default: return '#95a5a6';
    }
}

function getSanctionStatusText(status) {
    switch(status) {
        case 'active': return 'Activa';
        case 'appealed': return 'En Apelación';
        case 'expired': return 'Vencida';
        case 'revoked': return 'Revocada';
        default: return 'No Definido';
    }
}

// Action functions
function submitNewSanction(event) {
    event.preventDefault();

    console.log('🚨 [SANCTIONS-MANAGEMENT] Creando nueva sanción...');

    const formData = new FormData(event.target);
    const sanctionData = Object.fromEntries(formData.entries());

    // Here would go the API call to create sanction and update employee scoring
    updateEmployeeScoringForSanction(sanctionData.employeeId, sanctionData.scoringImpact);

    alert('✅ Sanción aplicada exitosamente. Se ha notificado al empleado y actualizado su scoring.');
    closeNewSanctionModal();
    loadActiveSanctions();
}

function updateEmployeeScoringForSanction(employeeId, scoringImpact) {
    console.log(`🎯 [SANCTIONS-MANAGEMENT] Actualizando scoring del empleado ${employeeId}: ${scoringImpact} puntos`);

    // This function integrates with the scoring system from training-management
    // Here would go the API call to update employee scoring
}

function modifySanction(sanctionId) {
    console.log('✏️ [SANCTIONS-MANAGEMENT] Modificando sanción:', sanctionId);

    // Here would go the logic to modify sanction
    alert('🔧 Función de modificación de sanción en desarrollo');
}

function revokeSanction(sanctionId) {
    console.log('❌ [SANCTIONS-MANAGEMENT] Revocando sanción:', sanctionId);

    if (confirm('¿Está seguro de que desea revocar esta sanción? Esta acción restaurará el scoring del empleado.')) {
        // Here would go the API call to revoke sanction and restore scoring
        alert('✅ Sanción revocada exitosamente. Se ha notificado al empleado.');
        loadActiveSanctions();
    }
}

function extendSanction(sanctionId) {
    console.log('⏰ [SANCTIONS-MANAGEMENT] Extendiendo duración de sanción:', sanctionId);

    const days = prompt('¿Cuántos días adicionales desea agregar?');
    if (days && !isNaN(days) && parseInt(days) > 0) {
        // Here would go the API call to extend sanction
        alert(`✅ Sanción extendida por ${days} días adicionales.`);
        loadActiveSanctions();
    }
}

function reviewAppeal(sanctionId) {
    console.log('⚖️ [SANCTIONS-MANAGEMENT] Revisando apelación de sanción:', sanctionId);

    // Here would go the logic to review appeal
    alert('⚖️ Función de revisión de apelación en desarrollo');
}

// Integration with other modules
function initializeSanctionsIntegration() {
    console.log('🔗 [SANCTIONS-MANAGEMENT] Inicializando integración con otros módulos...');

    // Integration with training module for automatic sanctions
    window.applySanctionForTrainingViolation = function(employeeId, violationType) {
        console.log(`📚 [SANCTIONS-MANAGEMENT] Aplicando sanción automática por capacitaciones: ${employeeId} - ${violationType}`);

        // Auto-create sanction based on training violations
        const sanctionData = {
            employeeId: employeeId,
            type: 'training',
            severity: violationType === 'missed_deadline' ? 'minor' : 'major',
            reason: `Violación automática detectada: ${violationType}`,
            effectiveDate: new Date().toISOString().split('T')[0],
            duration: violationType === 'missed_deadline' ? 15 : 30,
            scoringImpact: violationType === 'missed_deadline' ? -10 : -20,
            automatic: true
        };

        // Here would go the API call to create automatic sanction
        console.log('🤖 [SANCTIONS-MANAGEMENT] Sanción automática creada:', sanctionData);
    };

    // Integration with biometric AI for behavioral sanctions
    window.applySanctionForBehaviorViolation = function(employeeId, behaviorType, riskLevel) {
        console.log(`🤖 [SANCTIONS-MANAGEMENT] Aplicando sanción automática por comportamiento: ${employeeId} - ${behaviorType}`);

        const severity = riskLevel > 80 ? 'major' : 'minor';
        const sanctionData = {
            employeeId: employeeId,
            type: 'behavior',
            severity: severity,
            reason: `Comportamiento inadecuado detectado por IA: ${behaviorType}`,
            effectiveDate: new Date().toISOString().split('T')[0],
            duration: riskLevel > 80 ? 45 : 15,
            scoringImpact: riskLevel > 80 ? -25 : -15,
            automatic: true,
            requiresReview: riskLevel > 90
        };

        // Here would go the API call to create automatic sanction
        console.log('🚨 [SANCTIONS-MANAGEMENT] Sanción automática por IA creada:', sanctionData);
    };
}

// Export functions for global access
window.showSanctionsManagementContent = showSanctionsManagementContent;
window.switchSanctionTab = switchSanctionTab;
window.showNewSanctionModal = showNewSanctionModal;
window.closeNewSanctionModal = closeNewSanctionModal;
window.showSanctionDetails = showSanctionDetails;
window.closeSanctionDetailsModal = closeSanctionDetailsModal;
window.submitNewSanction = submitNewSanction;
window.modifySanction = modifySanction;
window.revokeSanction = revokeSanction;
window.extendSanction = extendSanction;
window.reviewAppeal = reviewAppeal;

// Initialize integrations when module loads
initializeSanctionsIntegration();

console.log('✅ [SANCTIONS-MANAGEMENT] Módulo completamente cargado y funcional');