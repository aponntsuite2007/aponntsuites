/**
 * 🧠 MÓDULO: ANÁLISIS EMOCIONAL PROFESIONAL
 * ========================================
 * Gestión completa de análisis emocional con Azure Face API
 * - Consentimientos legales (Ley 25.326)
 * - Dashboard de bienestar
 * - Gráficos de emociones y fatiga
 * - Reportes departamentales
 */

import { showNotification, showErrorModal, showConfirmModal } from './notifications.js';
import { getCurrentUser } from './utils.js';
import API from './api.js';

class EmotionalAnalysisManager {
    constructor() {
        this.currentCompany = null;
        this.currentUser = null;
        this.charts = {};
        this.consentStatus = {};
    }

    /**
     * Inicializar módulo
     */
    async init() {
        console.log('🧠 [EMOTIONAL-ANALYSIS] Inicializando módulo...');

        try {
            this.currentUser = getCurrentUser();
            this.currentCompany = this.currentUser.company_id;

            // Verificar estado de consentimientos
            await this.checkConsentStatus();

            // Cargar dashboard
            await this.loadDashboard();

            // Setup event listeners
            this.setupEventListeners();

            console.log('✅ [EMOTIONAL-ANALYSIS] Módulo inicializado');
        } catch (error) {
            console.error('❌ [EMOTIONAL-ANALYSIS] Error inicializando:', error);
            showNotification('Error al inicializar análisis emocional', 'error');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Botón solicitar consentimiento
        const btnRequestConsent = document.getElementById('btnRequestEmotionalConsent');
        if (btnRequestConsent) {
            btnRequestConsent.addEventListener('click', () => this.requestConsent());
        }

        // Botón revocar consentimiento
        const btnRevokeConsent = document.getElementById('btnRevokeEmotionalConsent');
        if (btnRevokeConsent) {
            btnRevokeConsent.addEventListener('click', () => this.revokeConsent());
        }

        // Botón ver historial
        const btnViewHistory = document.getElementById('btnViewEmotionalHistory');
        if (btnViewHistory) {
            btnViewHistory.addEventListener('click', () => this.viewHistory());
        }

        // Refresh dashboard
        const btnRefreshDashboard = document.getElementById('btnRefreshEmotionalDashboard');
        if (btnRefreshDashboard) {
            btnRefreshDashboard.addEventListener('click', () => this.loadDashboard());
        }
    }

    /**
     * Verificar estado de consentimientos
     */
    async checkConsentStatus() {
        try {
            const response = await API.get(
                `/consent/check/${this.currentUser.user_id}/emotional_analysis?companyId=${this.currentCompany}`
            );

            if (response.success && response.hasConsent) {
                this.consentStatus.emotional_analysis = {
                    active: true,
                    consentDate: new Date(response.consent.consentDate),
                    expiresAt: response.consent.expiresAt ? new Date(response.consent.expiresAt) : null
                };

                // Mostrar UI de consentimiento activo
                this.showConsentActive();
            } else {
                this.consentStatus.emotional_analysis = { active: false };
                this.showConsentInactive();
            }
        } catch (error) {
            console.error('Error verificando consentimiento:', error);
            this.showConsentInactive();
        }
    }

    /**
     * Mostrar UI de consentimiento activo
     */
    showConsentActive() {
        const statusDiv = document.getElementById('emotionalConsentStatus');
        if (!statusDiv) return;

        const consent = this.consentStatus.emotional_analysis;
        const expiresText = consent.expiresAt
            ? `Expira: ${consent.expiresAt.toLocaleDateString()}`
            : 'Sin expiración';

        statusDiv.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i>
                <strong>Consentimiento Activo</strong><br>
                <small>Otorgado: ${consent.consentDate.toLocaleDateString()}</small><br>
                <small>${expiresText}</small>
            </div>
        `;

        // Habilitar funcionalidades
        const btnRevokeConsent = document.getElementById('btnRevokeEmotionalConsent');
        if (btnRevokeConsent) {
            btnRevokeConsent.style.display = 'inline-block';
        }

        const btnRequestConsent = document.getElementById('btnRequestEmotionalConsent');
        if (btnRequestConsent) {
            btnRequestConsent.style.display = 'none';
        }

        // Mostrar dashboard
        const dashboardDiv = document.getElementById('emotionalDashboardContent');
        if (dashboardDiv) {
            dashboardDiv.style.display = 'block';
        }
    }

    /**
     * Mostrar UI de consentimiento inactivo
     */
    showConsentInactive() {
        const statusDiv = document.getElementById('emotionalConsentStatus');
        if (!statusDiv) return;

        statusDiv.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Consentimiento Requerido</strong><br>
                <small>Debe otorgar consentimiento para usar el análisis emocional</small>
            </div>
        `;

        // Deshabilitar funcionalidades
        const btnRevokeConsent = document.getElementById('btnRevokeEmotionalConsent');
        if (btnRevokeConsent) {
            btnRevokeConsent.style.display = 'none';
        }

        const btnRequestConsent = document.getElementById('btnRequestEmotionalConsent');
        if (btnRequestConsent) {
            btnRequestConsent.style.display = 'inline-block';
        }

        // Ocultar dashboard
        const dashboardDiv = document.getElementById('emotionalDashboardContent');
        if (dashboardDiv) {
            dashboardDiv.style.display = 'none';
        }
    }

    /**
     * Solicitar consentimiento
     */
    async requestConsent() {
        try {
            // 1. Obtener texto legal
            const response = await API.post('/consent/request', {
                userId: this.currentUser.user_id,
                companyId: this.currentCompany,
                consentType: 'emotional_analysis'
            });

            if (!response.success) {
                throw new Error(response.message || 'Error solicitando consentimiento');
            }

            // 2. Mostrar modal con texto legal
            await this.showConsentModal(response.consentText);

        } catch (error) {
            console.error('Error solicitando consentimiento:', error);
            showNotification('Error al solicitar consentimiento', 'error');
        }
    }

    /**
     * Mostrar modal de consentimiento con texto legal
     */
    async showConsentModal(consentText) {
        return new Promise((resolve) => {
            const modalHtml = `
                <div class="modal fade" id="consentModal" tabindex="-1" role="dialog">
                    <div class="modal-dialog modal-lg" role="document">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="fas fa-file-contract"></i>
                                    Consentimiento Informado - Ley 25.326
                                </h5>
                                <button type="button" class="close text-white" data-dismiss="modal">
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
                                <div class="alert alert-info">
                                    <i class="fas fa-info-circle"></i>
                                    Por favor lea cuidadosamente el siguiente texto legal antes de otorgar su consentimiento.
                                </div>
                                <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
                                    ${consentText}
                                </div>
                                <hr>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="consentAcceptCheckbox">
                                    <label class="form-check-label" for="consentAcceptCheckbox">
                                        <strong>He leído y acepto los términos del consentimiento informado</strong>
                                    </label>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                                <button type="button" class="btn btn-success" id="btnGrantConsent" disabled>
                                    <i class="fas fa-check"></i> Otorgar Consentimiento
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Agregar modal al DOM
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHtml;
            document.body.appendChild(modalContainer);

            const modal = $('#consentModal');

            // Habilitar botón solo si checkbox está marcado
            $('#consentAcceptCheckbox').on('change', function() {
                $('#btnGrantConsent').prop('disabled', !this.checked);
            });

            // Manejar otorgamiento de consentimiento
            $('#btnGrantConsent').on('click', async () => {
                try {
                    await this.grantConsent(consentText);
                    modal.modal('hide');
                    resolve(true);
                } catch (error) {
                    console.error('Error otorgando consentimiento:', error);
                    showNotification('Error al otorgar consentimiento', 'error');
                    resolve(false);
                }
            });

            // Limpiar al cerrar
            modal.on('hidden.bs.modal', function() {
                modalContainer.remove();
            });

            modal.modal('show');
        });
    }

    /**
     * Otorgar consentimiento
     */
    async grantConsent(consentText) {
        try {
            const response = await API.post('/consent/grant', {
                userId: this.currentUser.user_id,
                companyId: this.currentCompany,
                consentType: 'emotional_analysis',
                consentText: consentText
            });

            if (response.success) {
                showNotification('Consentimiento otorgado exitosamente', 'success');

                // Actualizar estado
                await this.checkConsentStatus();
                await this.loadDashboard();
            } else {
                throw new Error(response.message || 'Error otorgando consentimiento');
            }
        } catch (error) {
            console.error('Error otorgando consentimiento:', error);
            throw error;
        }
    }

    /**
     * Revocar consentimiento
     */
    async revokeConsent() {
        const confirmed = await showConfirmModal(
            'Revocar Consentimiento',
            '¿Está seguro que desea revocar su consentimiento? Se eliminarán todos sus datos de análisis emocional.'
        );

        if (!confirmed) return;

        try {
            const response = await API.delete('/consent/revoke', {
                userId: this.currentUser.user_id,
                companyId: this.currentCompany,
                consentType: 'emotional_analysis',
                reason: 'Usuario revocó consentimiento'
            });

            if (response.success) {
                showNotification('Consentimiento revocado exitosamente', 'success');

                // Actualizar estado
                await this.checkConsentStatus();
            } else {
                throw new Error(response.message || 'Error revocando consentimiento');
            }
        } catch (error) {
            console.error('Error revocando consentimiento:', error);
            showNotification('Error al revocar consentimiento', 'error');
        }
    }

    /**
     * Cargar dashboard de bienestar
     */
    async loadDashboard() {
        if (!this.consentStatus.emotional_analysis?.active) {
            console.log('⚠️ [EMOTIONAL-ANALYSIS] Consentimiento no activo, no se carga dashboard');
            return;
        }

        try {
            // Cargar historial del usuario
            const response = await API.get(
                `/emotional-analysis/history/${this.currentUser.user_id}?companyId=${this.currentCompany}&days=30`
            );

            if (response.success && response.data.length > 0) {
                this.renderDashboard(response.data);
            } else {
                this.showEmptyDashboard();
            }
        } catch (error) {
            console.error('Error cargando dashboard:', error);
            showNotification('Error al cargar dashboard de bienestar', 'error');
        }
    }

    /**
     * Renderizar dashboard con datos
     */
    renderDashboard(data) {
        // Obtener último análisis
        const latest = data[0];

        // Actualizar cards de resumen
        this.updateSummaryCards(latest);

        // Crear gráfico de tendencias
        this.createTrendsChart(data);

        // Crear gráfico de emociones
        this.createEmotionsChart(latest);

        // Mostrar recomendaciones
        this.showRecommendations(latest);
    }

    /**
     * Actualizar cards de resumen
     */
    updateSummaryCards(latest) {
        // Wellness Score
        const wellnessCard = document.getElementById('wellnessScoreCard');
        if (wellnessCard) {
            const score = latest.wellnessScore || 0;
            const color = score >= 70 ? 'success' : score >= 50 ? 'warning' : 'danger';
            wellnessCard.innerHTML = `
                <div class="card border-${color}">
                    <div class="card-body text-center">
                        <h6 class="card-title text-muted">Bienestar</h6>
                        <h2 class="text-${color}">${score}<small>/100</small></h2>
                        <small class="text-muted">Última actualización</small>
                    </div>
                </div>
            `;
        }

        // Fatigue Score
        const fatigueCard = document.getElementById('fatigueScoreCard');
        if (fatigueCard) {
            const score = Math.round((latest.fatigueScore || 0) * 100);
            const color = score < 30 ? 'success' : score < 60 ? 'warning' : 'danger';
            fatigueCard.innerHTML = `
                <div class="card border-${color}">
                    <div class="card-body text-center">
                        <h6 class="card-title text-muted">Fatiga</h6>
                        <h2 class="text-${color}">${score}<small>%</small></h2>
                        <small class="text-muted">Nivel detectado</small>
                    </div>
                </div>
            `;
        }

        // Stress Score
        const stressCard = document.getElementById('stressScoreCard');
        if (stressCard) {
            const score = Math.round((latest.stressScore || 0) * 100);
            const color = score < 30 ? 'success' : score < 60 ? 'warning' : 'danger';
            stressCard.innerHTML = `
                <div class="card border-${color}">
                    <div class="card-body text-center">
                        <h6 class="card-title text-muted">Estrés</h6>
                        <h2 class="text-${color}">${score}<small>%</small></h2>
                        <small class="text-muted">Nivel detectado</small>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Crear gráfico de tendencias
     */
    createTrendsChart(data) {
        const canvas = document.getElementById('trendsChart');
        if (!canvas) return;

        // Preparar datos (últimos 30 días, invertir para mostrar más reciente a la derecha)
        const chartData = data.slice(0, 30).reverse();
        const labels = chartData.map(d => new Date(d.scanTimestamp).toLocaleDateString());
        const wellnessData = chartData.map(d => d.wellnessScore || 0);
        const fatigueData = chartData.map(d => (d.fatigueScore || 0) * 100);
        const stressData = chartData.map(d => (d.stressScore || 0) * 100);

        // Destruir gráfico anterior si existe
        if (this.charts.trends) {
            this.charts.trends.destroy();
        }

        // Crear nuevo gráfico
        this.charts.trends = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Bienestar',
                        data: wellnessData,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Fatiga',
                        data: fatigueData,
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Estrés',
                        data: stressData,
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Tendencias de Bienestar (últimos 30 días)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    /**
     * Crear gráfico de emociones
     */
    createEmotionsChart(latest) {
        const canvas = document.getElementById('emotionsChart');
        if (!canvas) return;

        const emotions = {
            'Felicidad': (latest.emotionHappiness || 0) * 100,
            'Neutral': (latest.emotionNeutral || 0) * 100,
            'Tristeza': (latest.emotionSadness || 0) * 100,
            'Enojo': (latest.emotionAnger || 0) * 100,
            'Sorpresa': (latest.emotionSurprise || 0) * 100,
            'Miedo': (latest.emotionFear || 0) * 100,
            'Disgusto': (latest.emotionDisgust || 0) * 100,
            'Desprecio': (latest.emotionContempt || 0) * 100
        };

        // Destruir gráfico anterior si existe
        if (this.charts.emotions) {
            this.charts.emotions.destroy();
        }

        // Crear nuevo gráfico
        this.charts.emotions = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: Object.keys(emotions),
                datasets: [{
                    label: 'Intensidad (%)',
                    data: Object.values(emotions),
                    backgroundColor: [
                        '#28a745', // Felicidad
                        '#6c757d', // Neutral
                        '#17a2b8', // Tristeza
                        '#dc3545', // Enojo
                        '#ffc107', // Sorpresa
                        '#6f42c1', // Miedo
                        '#fd7e14', // Disgusto
                        '#e83e8c'  // Desprecio
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Análisis Emocional Actual'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    /**
     * Mostrar recomendaciones
     */
    showRecommendations(latest) {
        const container = document.getElementById('recommendationsContainer');
        if (!container) return;

        const recommendations = [];

        // Analizar fatiga
        if (latest.fatigueScore > 0.6) {
            recommendations.push({
                type: 'warning',
                icon: 'fa-exclamation-triangle',
                text: 'Nivel de fatiga elevado detectado. Se recomienda tomar un descanso.'
            });
        }

        // Analizar estrés
        if (latest.stressScore > 0.6) {
            recommendations.push({
                type: 'warning',
                icon: 'fa-heartbeat',
                text: 'Nivel de estrés alto. Considere técnicas de relajación.'
            });
        }

        // Analizar bienestar
        if (latest.wellnessScore < 50) {
            recommendations.push({
                type: 'danger',
                icon: 'fa-medkit',
                text: 'Bienestar bajo. Consulte con su supervisor o recursos humanos.'
            });
        } else if (latest.wellnessScore >= 70) {
            recommendations.push({
                type: 'success',
                icon: 'fa-smile',
                text: '¡Excelente nivel de bienestar! Siga cuidando su salud emocional.'
            });
        }

        if (recommendations.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    No hay recomendaciones especiales en este momento.
                </div>
            `;
        } else {
            container.innerHTML = recommendations.map(rec => `
                <div class="alert alert-${rec.type}">
                    <i class="fas ${rec.icon}"></i>
                    ${rec.text}
                </div>
            `).join('');
        }
    }

    /**
     * Mostrar dashboard vacío
     */
    showEmptyDashboard() {
        const container = document.getElementById('emotionalDashboardContent');
        if (!container) return;

        container.innerHTML = `
            <div class="alert alert-info text-center">
                <i class="fas fa-info-circle fa-3x mb-3"></i>
                <h5>No hay datos de análisis emocional</h5>
                <p>Los datos se generarán automáticamente cuando registre su asistencia biométrica.</p>
            </div>
        `;
    }

    /**
     * Ver historial completo
     */
    async viewHistory() {
        // TODO: Implementar modal con tabla de historial completo
        showNotification('Historial completo - Próximamente', 'info');
    }
}

// Exportar instancia única
const emotionalAnalysisManager = new EmotionalAnalysisManager();
export default emotionalAnalysisManager;
