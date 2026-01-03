/**
 * ============================================================================
 * EMPLOYEE VOICE PLATFORM - FRONTEND MODULE
 * ============================================================================
 *
 * Sistema de Experiencias y Sugerencias con:
 * - Formulario de sugerencias con categorización
 * - Exploración de experiencias de la empresa
 * - Sistema de votación (upvote/downvote)
 * - Comentarios
 * - Gamificación (puntos, badges, leaderboards)
 * - Dashboard admin
 *
 * @version 1.0.0
 * @date 2025-12-22
 * ============================================================================
 */

const VoicePlatformModule = (() => {
    const API_BASE = '/api/voice-platform';

    let currentView = 'my-experiences';
    let currentUser = null;
    let authToken = null;
    let experiences = [];
    let myStats = null;

    // ========================================================================
    // INICIALIZACIÓN
    // ========================================================================

    function init() {
        console.log('🎤 [VOICE-PLATFORM] Inicializando módulo...');

        // Obtener usuario y token
        currentUser = window.currentUser;
        authToken = window.authToken || localStorage.getItem('authToken');

        if (!currentUser || !authToken) {
            console.error('❌ [VOICE-PLATFORM] Usuario no autenticado');
            return;
        }

        render();
        loadMyStats();
    }

    // ========================================================================
    // API CALLS
    // ========================================================================

    async function apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                    ...options.headers
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Error ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`❌ [API] Error en ${endpoint}:`, error.message);
            showNotification(error.message, 'error');
            throw error;
        }
    }

    async function loadMyExperiences() {
        const data = await apiCall('/experiences/my');
        experiences = data.experiences || [];
        renderExperiencesList(experiences, 'my');
    }

    async function loadAllExperiences(filters = {}) {
        const params = new URLSearchParams(filters);
        const data = await apiCall(`/experiences?${params}`);
        experiences = data.experiences || [];
        renderExperiencesList(experiences, 'all');
    }

    async function loadMyStats() {
        const data = await apiCall('/gamification/my-stats');
        myStats = data.stats;
        renderStatsWidget();
    }

    async function loadLeaderboard(type = 'global') {
        const data = await apiCall(`/gamification/leaderboard?type=${type}&limit=20`);
        renderLeaderboard(data.leaderboard, type);
    }

    async function createExperience(formData) {
        const data = await apiCall('/experiences', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        showNotification('✅ Sugerencia creada. Analizando con IA...', 'success');
        return data;
    }

    async function voteExperience(experienceId, voteType) {
        await apiCall(`/experiences/${experienceId}/vote`, {
            method: 'POST',
            body: JSON.stringify({ vote_type: voteType })
        });
        showNotification(`Voto registrado: ${voteType === 'UPVOTE' ? '👍' : '👎'}`, 'success');
    }

    async function addComment(experienceId, content) {
        await apiCall(`/experiences/${experienceId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        showNotification('💬 Comentario agregado', 'success');
    }

    // ========================================================================
    // RENDER PRINCIPAL
    // ========================================================================

    function render() {
        const container = document.getElementById('contentArea');

        container.innerHTML = `
            <div class="voice-platform-container" style="
                background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
                min-height: 100vh;
                padding: 30px;
                color: #e0e0e0;
            ">
                <!-- Header -->
                <div class="voice-header" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 30px;
                    border-radius: 16px;
                    margin-bottom: 30px;
                    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">
                                🎤 Voice Platform
                            </h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">
                                Comparte tus ideas, mejora la organización
                            </p>
                        </div>
                        <div id="statsWidget"></div>
                    </div>
                </div>

                <!-- Navigation Tabs -->
                <div class="voice-tabs" style="
                    background: #2d2d3d;
                    border-radius: 12px;
                    padding: 8px;
                    margin-bottom: 24px;
                    display: flex;
                    gap: 8px;
                ">
                    <button onclick="VoicePlatformModule.switchView('my-experiences')"
                        id="tab-my-experiences"
                        class="voice-tab ${currentView === 'my-experiences' ? 'active' : ''}"
                        style="flex: 1; padding: 12px 20px; border: none; border-radius: 8px; background: ${currentView === 'my-experiences' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'}; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s;">
                        📝 Mis Sugerencias
                    </button>
                    <button onclick="VoicePlatformModule.switchView('explore')"
                        id="tab-explore"
                        class="voice-tab ${currentView === 'explore' ? 'active' : ''}"
                        style="flex: 1; padding: 12px 20px; border: none; border-radius: 8px; background: ${currentView === 'explore' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'}; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s;">
                        🔍 Explorar Experiencias
                    </button>
                    <button onclick="VoicePlatformModule.switchView('leaderboard')"
                        id="tab-leaderboard"
                        class="voice-tab ${currentView === 'leaderboard' ? 'active' : ''}"
                        style="flex: 1; padding: 12px 20px; border: none; border-radius: 8px; background: ${currentView === 'leaderboard' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'}; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s;">
                        🏆 Ranking
                    </button>
                    ${currentUser.role === 'admin' ? `
                    <button onclick="VoicePlatformModule.switchView('admin')"
                        id="tab-admin"
                        class="voice-tab ${currentView === 'admin' ? 'active' : ''}"
                        style="flex: 1; padding: 12px 20px; border: none; border-radius: 8px; background: ${currentView === 'admin' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'}; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s;">
                        ⚙️ Admin
                    </button>
                    ` : ''}
                </div>

                <!-- Content Area -->
                <div id="voiceContent"></div>
            </div>
        `;

        switchView(currentView);
    }

    function switchView(view) {
        currentView = view;

        // Update tabs
        document.querySelectorAll('.voice-tab').forEach(tab => {
            const isActive = tab.id === `tab-${view}`;
            tab.style.background = isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent';
        });

        const content = document.getElementById('voiceContent');

        switch (view) {
            case 'my-experiences':
                renderMyExperiences();
                break;
            case 'explore':
                renderExplore();
                break;
            case 'leaderboard':
                renderLeaderboardView();
                break;
            case 'admin':
                renderAdminView();
                break;
        }
    }

    // ========================================================================
    // STATS WIDGET
    // ========================================================================

    function renderStatsWidget() {
        const widget = document.getElementById('statsWidget');
        if (!widget || !myStats) return;

        const levelColor = {
            'BRONZE': '#cd7f32',
            'SILVER': '#c0c0c0',
            'GOLD': '#ffd700',
            'PLATINUM': '#e5e4e2'
        }[myStats.current_level] || '#667eea';

        widget.innerHTML = `
            <div style="
                background: rgba(0,0,0,0.3);
                padding: 20px 30px;
                border-radius: 12px;
                text-align: center;
                backdrop-filter: blur(10px);
            ">
                <div style="font-size: 36px; font-weight: 700; color: ${levelColor}; margin-bottom: 5px;">
                    ${myStats.total_points || 0}
                </div>
                <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 8px;">
                    puntos
                </div>
                <div style="
                    background: ${levelColor};
                    color: #1a1a2e;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 700;
                    display: inline-block;
                ">
                    ${myStats.current_level || 'BRONZE'}
                </div>
            </div>
        `;
    }

    // ========================================================================
    // MIS EXPERIENCIAS
    // ========================================================================

    function renderMyExperiences() {
        const content = document.getElementById('voiceContent');

        content.innerHTML = `
            <div style="display: grid; gap: 24px;">
                <!-- Botón Crear Nueva -->
                <button onclick="VoicePlatformModule.showCreateForm()" style="
                    background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
                    color: white;
                    border: none;
                    padding: 18px 30px;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 4px 16px rgba(78, 205, 196, 0.4);
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                    ✨ Nueva Sugerencia / Experiencia
                </button>

                <!-- Lista de Experiencias -->
                <div id="experiencesList"></div>
            </div>
        `;

        loadMyExperiences();
    }

    function showCreateForm() {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
            " onclick="if(event.target === this) this.remove()">
                <div style="
                    background: linear-gradient(135deg, #2d2d3d 0%, #1a1a2e 100%);
                    border-radius: 20px;
                    padding: 40px;
                    max-width: 700px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                " onclick="event.stopPropagation()">
                    <h2 style="color: white; margin: 0 0 24px 0; font-size: 28px; font-weight: 700;">
                        ✨ Nueva Experiencia
                    </h2>

                    <form id="createExperienceForm" onsubmit="VoicePlatformModule.handleCreateSubmit(event); return false;">
                        <!-- Tipo -->
                        <div style="margin-bottom: 20px;">
                            <label style="color: #b0b0b0; display: block; margin-bottom: 8px; font-weight: 600;">
                                Tipo de Experiencia
                            </label>
                            <select name="type" required style="
                                width: 100%;
                                padding: 12px;
                                background: #3d3d4d;
                                border: 2px solid #4d4d5d;
                                border-radius: 8px;
                                color: white;
                                font-size: 15px;
                            ">
                                <option value="SUGGESTION">💡 Sugerencia de Mejora</option>
                                <option value="PROBLEM">⚠️ Problema Detectado</option>
                                <option value="SOLUTION">✅ Solución Propuesta</option>
                            </select>
                        </div>

                        <!-- Título -->
                        <div style="margin-bottom: 20px;">
                            <label style="color: #b0b0b0; display: block; margin-bottom: 8px; font-weight: 600;">
                                Título *
                            </label>
                            <input type="text" name="title" required maxlength="200" placeholder="Ej: Mejorar ventilación en planta" style="
                                width: 100%;
                                padding: 12px;
                                background: #3d3d4d;
                                border: 2px solid #4d4d5d;
                                border-radius: 8px;
                                color: white;
                                font-size: 15px;
                            ">
                        </div>

                        <!-- Descripción -->
                        <div style="margin-bottom: 20px;">
                            <label style="color: #b0b0b0; display: block; margin-bottom: 8px; font-weight: 600;">
                                Descripción Detallada *
                            </label>
                            <textarea name="description" required rows="5" placeholder="Describe tu sugerencia con el mayor detalle posible..." style="
                                width: 100%;
                                padding: 12px;
                                background: #3d3d4d;
                                border: 2px solid #4d4d5d;
                                border-radius: 8px;
                                color: white;
                                font-size: 15px;
                                resize: vertical;
                            "></textarea>
                        </div>

                        <!-- Área -->
                        <div style="margin-bottom: 20px;">
                            <label style="color: #b0b0b0; display: block; margin-bottom: 8px; font-weight: 600;">
                                Área
                            </label>
                            <select name="area" style="
                                width: 100%;
                                padding: 12px;
                                background: #3d3d4d;
                                border: 2px solid #4d4d5d;
                                border-radius: 8px;
                                color: white;
                                font-size: 15px;
                            ">
                                <option value="">-- Seleccionar --</option>
                                <option value="PRODUCTION">🏭 Producción</option>
                                <option value="ADMINISTRATION">📊 Administración</option>
                                <option value="HR">👥 Recursos Humanos</option>
                                <option value="IT">💻 IT / Sistemas</option>
                                <option value="LOGISTICS">🚚 Logística</option>
                                <option value="QUALITY">✅ Calidad</option>
                                <option value="SAFETY">🛡️ Seguridad</option>
                                <option value="OTHER">📌 Otro</option>
                            </select>
                        </div>

                        <!-- Prioridad -->
                        <div style="margin-bottom: 20px;">
                            <label style="color: #b0b0b0; display: block; margin-bottom: 8px; font-weight: 600;">
                                Prioridad
                            </label>
                            <select name="priority" style="
                                width: 100%;
                                padding: 12px;
                                background: #3d3d4d;
                                border: 2px solid #4d4d5d;
                                border-radius: 8px;
                                color: white;
                                font-size: 15px;
                            ">
                                <option value="LOW">🟢 Baja</option>
                                <option value="MEDIUM" selected>🟡 Media</option>
                                <option value="HIGH">🔴 Alta</option>
                            </select>
                        </div>

                        <!-- Visibilidad -->
                        <div style="margin-bottom: 24px;">
                            <label style="color: #b0b0b0; display: block; margin-bottom: 8px; font-weight: 600;">
                                Visibilidad
                            </label>
                            <select name="visibility" style="
                                width: 100%;
                                padding: 12px;
                                background: #3d3d4d;
                                border: 2px solid #4d4d5d;
                                border-radius: 8px;
                                color: white;
                                font-size: 15px;
                            ">
                                <option value="ADMIN_ONLY" selected>🔒 Solo Administradores</option>
                                <option value="PUBLIC">🌐 Pública (todos pueden ver)</option>
                                <option value="ANONYMOUS">👤 Anónima (nadie ve mi nombre)</option>
                            </select>
                            <div style="margin-top: 8px; padding: 8px 12px; background: rgba(102, 126, 234, 0.2); border-radius: 6px; font-size: 13px; color: #b0b0b0;">
                                💡 Las sugerencias anónimas permiten reportar problemas sensibles sin revelar tu identidad
                            </div>
                        </div>

                        <!-- Buttons -->
                        <div style="display: flex; gap: 12px;">
                            <button type="button" onclick="this.closest('[style*=fixed]').remove()" style="
                                flex: 1;
                                padding: 14px;
                                background: #4d4d5d;
                                color: white;
                                border: none;
                                border-radius: 8px;
                                font-size: 15px;
                                font-weight: 600;
                                cursor: pointer;
                            ">
                                Cancelar
                            </button>
                            <button type="submit" style="
                                flex: 2;
                                padding: 14px;
                                background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
                                color: white;
                                border: none;
                                border-radius: 8px;
                                font-size: 15px;
                                font-weight: 600;
                                cursor: pointer;
                                box-shadow: 0 4px 16px rgba(78, 205, 196, 0.4);
                            ">
                                ✨ Crear Sugerencia
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    async function handleCreateSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const data = {
            title: formData.get('title'),
            description: formData.get('description'),
            type: formData.get('type'),
            area: formData.get('area') || null,
            priority: formData.get('priority'),
            visibility: formData.get('visibility')
        };

        try {
            await createExperience(data);
            form.closest('[style*=fixed]').remove();
            loadMyExperiences();
            loadMyStats();
        } catch (error) {
            console.error('Error creando experiencia:', error);
        }
    }

    // ========================================================================
    // LISTA DE EXPERIENCIAS
    // ========================================================================

    function renderExperiencesList(experiences, context = 'my') {
        const listContainer = document.getElementById('experiencesList');
        if (!listContainer) return;

        if (experiences.length === 0) {
            listContainer.innerHTML = `
                <div style="
                    background: #2d2d3d;
                    padding: 60px 30px;
                    border-radius: 12px;
                    text-align: center;
                    color: #888;
                ">
                    <div style="font-size: 64px; margin-bottom: 16px;">📭</div>
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">
                        ${context === 'my' ? 'No tienes sugerencias aún' : 'No hay experiencias para mostrar'}
                    </div>
                    <div style="font-size: 14px;">
                        ${context === 'my' ? '¡Crea tu primera sugerencia y comienza a acumular puntos!' : 'Intenta cambiar los filtros'}
                    </div>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = experiences.map(exp => renderExperienceCard(exp)).join('');
    }

    function renderExperienceCard(exp) {
        const statusColors = {
            'PENDING': { bg: 'rgba(255, 193, 7, 0.2)', color: '#ffc107', icon: '⏳', text: 'Pendiente' },
            'IN_REVIEW': { bg: 'rgba(0, 123, 255, 0.2)', color: '#007bff', icon: '👀', text: 'En Revisión' },
            'APPROVED': { bg: 'rgba(40, 167, 69, 0.2)', color: '#28a745', icon: '✅', text: 'Aprobada' },
            'IN_PILOT': { bg: 'rgba(102, 126, 234, 0.2)', color: '#667eea', icon: '🧪', text: 'En Piloto' },
            'IMPLEMENTED': { bg: 'rgba(78, 205, 196, 0.2)', color: '#4ecdc4', icon: '🎉', text: 'Implementada' },
            'REJECTED': { bg: 'rgba(220, 53, 69, 0.2)', color: '#dc3545', icon: '❌', text: 'Rechazada' }
        };

        const typeIcons = {
            'SUGGESTION': '💡',
            'PROBLEM': '⚠️',
            'SOLUTION': '✅'
        };

        const status = statusColors[exp.status] || statusColors.PENDING;
        const typeIcon = typeIcons[exp.type] || '📝';

        return `
            <div class="experience-card" style="
                background: linear-gradient(135deg, #2d2d3d 0%, #252535 100%);
                border-radius: 16px;
                padding: 24px;
                margin-bottom: 16px;
                border: 2px solid transparent;
                transition: all 0.3s;
                cursor: pointer;
            " onmouseover="this.style.borderColor='#667eea'; this.style.transform='translateY(-2px)'"
               onmouseout="this.style.borderColor='transparent'; this.style.transform='translateY(0)'"
               onclick="VoicePlatformModule.showExperienceDetail('${exp.id}')">

                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <span style="font-size: 28px;">${typeIcon}</span>
                            <h3 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">
                                ${exp.title}
                            </h3>
                        </div>
                        <div style="color: #b0b0b0; font-size: 14px; line-height: 1.6;">
                            ${exp.description.substring(0, 150)}${exp.description.length > 150 ? '...' : ''}
                        </div>
                    </div>

                    <div style="
                        background: ${status.bg};
                        color: ${status.color};
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-size: 13px;
                        font-weight: 700;
                        white-space: nowrap;
                        margin-left: 16px;
                    ">
                        ${status.icon} ${status.text}
                    </div>
                </div>

                <!-- Footer -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; gap: 20px; font-size: 14px; color: #888;">
                        <span>👍 ${exp.upvotes || 0}</span>
                        <span>👎 ${exp.downvotes || 0}</span>
                        <span>💬 ${exp.comments_count || 0}</span>
                        ${exp.cluster ? `<span style="color: #667eea;">🎯 Cluster: ${exp.cluster.name}</span>` : ''}
                    </div>
                    <div style="font-size: 12px; color: #666;">
                        ${new Date(exp.created_at).toLocaleDateString('es-AR')}
                    </div>
                </div>
            </div>
        `;
    }

    // ========================================================================
    // EXPLORAR EXPERIENCIAS
    // ========================================================================

    function renderExplore() {
        const content = document.getElementById('voiceContent');

        content.innerHTML = `
            <div>
                <!-- Filtros -->
                <div style="
                    background: #2d2d3d;
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 24px;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                ">
                    <select id="filterType" onchange="VoicePlatformModule.applyFilters()" style="
                        padding: 10px;
                        background: #3d3d4d;
                        border: 2px solid #4d4d5d;
                        border-radius: 8px;
                        color: white;
                    ">
                        <option value="">Todos los tipos</option>
                        <option value="SUGGESTION">💡 Sugerencias</option>
                        <option value="PROBLEM">⚠️ Problemas</option>
                        <option value="SOLUTION">✅ Soluciones</option>
                    </select>

                    <select id="filterStatus" onchange="VoicePlatformModule.applyFilters()" style="
                        padding: 10px;
                        background: #3d3d4d;
                        border: 2px solid #4d4d5d;
                        border-radius: 8px;
                        color: white;
                    ">
                        <option value="">Todos los estados</option>
                        <option value="PENDING">⏳ Pendientes</option>
                        <option value="IMPLEMENTED">🎉 Implementadas</option>
                    </select>

                    <select id="filterArea" onchange="VoicePlatformModule.applyFilters()" style="
                        padding: 10px;
                        background: #3d3d4d;
                        border: 2px solid #4d4d5d;
                        border-radius: 8px;
                        color: white;
                    ">
                        <option value="">Todas las áreas</option>
                        <option value="PRODUCTION">🏭 Producción</option>
                        <option value="ADMINISTRATION">📊 Administración</option>
                        <option value="HR">👥 RRHH</option>
                        <option value="IT">💻 IT</option>
                    </select>
                </div>

                <div id="experiencesList"></div>
            </div>
        `;

        loadAllExperiences();
    }

    function applyFilters() {
        const filters = {
            type: document.getElementById('filterType')?.value || '',
            status: document.getElementById('filterStatus')?.value || '',
            area: document.getElementById('filterArea')?.value || ''
        };

        // Remover filtros vacíos
        Object.keys(filters).forEach(key => {
            if (!filters[key]) delete filters[key];
        });

        loadAllExperiences(filters);
    }

    // ========================================================================
    // LEADERBOARD
    // ========================================================================

    function renderLeaderboardView() {
        const content = document.getElementById('voiceContent');

        content.innerHTML = `
            <div>
                <!-- Selector de Tipo -->
                <div style="
                    background: #2d2d3d;
                    padding: 16px;
                    border-radius: 12px;
                    margin-bottom: 24px;
                    display: flex;
                    gap: 12px;
                ">
                    <button onclick="VoicePlatformModule.loadLeaderboard('global')" style="
                        padding: 10px 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                    ">
                        🌐 Global
                    </button>
                    <button onclick="VoicePlatformModule.loadLeaderboard('monthly')" style="
                        padding: 10px 20px;
                        background: #4d4d5d;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                    ">
                        📅 Este Mes
                    </button>
                </div>

                <div id="leaderboardList"></div>
            </div>
        `;

        loadLeaderboard('global');
    }

    function renderLeaderboard(leaderboard, type) {
        const container = document.getElementById('leaderboardList');
        if (!container) return;

        if (!leaderboard || leaderboard.length === 0) {
            container.innerHTML = `
                <div style="
                    background: #2d2d3d;
                    padding: 40px;
                    border-radius: 12px;
                    text-align: center;
                    color: #888;
                ">
                    No hay datos para mostrar
                </div>
            `;
            return;
        }

        const medals = ['🥇', '🥈', '🥉'];

        container.innerHTML = leaderboard.map((entry, index) => `
            <div style="
                background: ${index < 3 ? 'linear-gradient(135deg, #3d3d4d 0%, #2d2d3d 100%)' : '#2d2d3d'};
                padding: 20px 24px;
                border-radius: 12px;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 20px;
                border: ${index < 3 ? '2px solid rgba(255, 215, 0, 0.3)' : '2px solid transparent'};
            ">
                <!-- Rank -->
                <div style="
                    min-width: 50px;
                    text-align: center;
                    font-size: ${index < 3 ? '32px' : '20px'};
                    font-weight: 700;
                    color: ${index < 3 ? '#ffd700' : '#888'};
                ">
                    ${index < 3 ? medals[index] : `#${index + 1}`}
                </div>

                <!-- Info -->
                <div style="flex: 1;">
                    <div style="color: white; font-size: 18px; font-weight: 700; margin-bottom: 4px;">
                        ${entry.user_name}
                    </div>
                    <div style="color: #888; font-size: 14px;">
                        ${entry.department_name || 'Sin departamento'}
                    </div>
                </div>

                <!-- Stats -->
                <div style="text-align: right;">
                    <div style="color: #4ecdc4; font-size: 24px; font-weight: 700;">
                        ${entry.total_points || entry.monthly_points || 0}
                    </div>
                    <div style="color: #888; font-size: 12px;">
                        puntos
                    </div>
                </div>

                <!-- Level Badge -->
                ${entry.current_level ? `
                <div style="
                    background: ${
                        entry.current_level === 'PLATINUM' ? '#e5e4e2' :
                        entry.current_level === 'GOLD' ? '#ffd700' :
                        entry.current_level === 'SILVER' ? '#c0c0c0' : '#cd7f32'
                    };
                    color: #1a1a2e;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 700;
                ">
                    ${entry.current_level}
                </div>
                ` : ''}
            </div>
        `).join('');
    }

    // ========================================================================
    // ADMIN VIEW
    // ========================================================================

    function renderAdminView() {
        const content = document.getElementById('voiceContent');

        content.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #888;">
                <div style="font-size: 64px; margin-bottom: 16px;">🚧</div>
                <div style="font-size: 20px; font-weight: 600;">
                    Dashboard Admin - En Desarrollo
                </div>
                <div style="font-size: 14px; margin-top: 8px;">
                    Revisar, aprobar e implementar sugerencias
                </div>
            </div>
        `;
    }

    // ========================================================================
    // DETALLE DE EXPERIENCIA
    // ========================================================================

    function showExperienceDetail(experienceId) {
        console.log('🔍 Ver detalle de experiencia:', experienceId);
        // TODO: Implementar modal de detalle con comentarios y votación
        showNotification('🚧 Vista de detalle en desarrollo', 'info');
    }

    // ========================================================================
    // UTILIDADES
    // ========================================================================

    function showNotification(message, type = 'info') {
        const colors = {
            'success': '#4ecdc4',
            'error': '#ff6b6b',
            'info': '#667eea',
            'warning': '#ffc107'
        };

        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${colors[type]};
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10001;
                font-weight: 600;
                animation: slideIn 0.3s ease-out;
            ">
                ${message}
            </div>
            <style>
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ========================================================================
    // API PÚBLICA
    // ========================================================================

    return {
        init,
        switchView,
        showCreateForm,
        handleCreateSubmit,
        applyFilters,
        loadLeaderboard,
        showExperienceDetail
    };
})();

// Auto-init cuando se llama desde el sistema de módulos
if (typeof window !== 'undefined') {
    window.VoicePlatformModule = VoicePlatformModule;
}
