/**
 * 🧠 EMOTIONAL ANALYSIS MODULE
 * Sistema profesional con Azure Face API - Ley 25.326 Compliant
 */

let currentView = 'dashboard';

async function showEmotionalAnalysisContent() {
    console.log('🧠 Cargando módulo de análisis emocional...');

    const content = document.getElementById('mainContent');
    if (!content) return;

    content.innerHTML = `
        <div class="emotional-analysis-container" style="padding: 20px;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                <div>
                    <h2 style="margin: 0; color: #1f2937;">🧠 Análisis Emocional Profesional</h2>
                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">
                        Sistema con Azure Face API - Cumplimiento Ley 25.326
                    </p>
                </div>
                <button onclick="emotionalAnalysis.refreshData()"
                        style="padding: 10px 20px; background: #8B5CF6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
                    🔄 Actualizar
                </button>
            </div>

            <!-- Navigation Tabs -->
            <div style="display: flex; gap: 10px; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb;">
                <button id="tab-dashboard" onclick="emotionalAnalysis.switchView('dashboard')"
                        class="tab-btn active" style="padding: 12px 24px; background: none; border: none; border-bottom: 3px solid #8B5CF6; color: #8B5CF6; font-weight: 600; cursor: pointer;">
                    📊 Dashboard
                </button>
                <button id="tab-reports" onclick="emotionalAnalysis.switchView('reports')"
                        class="tab-btn" style="padding: 12px 24px; background: none; border: none; border-bottom: 3px solid transparent; color: #6b7280; font-weight: 600; cursor: pointer;">
                    📈 Reportes
                </button>
                <button id="tab-compliance" onclick="emotionalAnalysis.switchView('compliance')"
                        class="tab-btn" style="padding: 12px 24px; background: none; border: none; border-bottom: 3px solid transparent; color: #6b7280; font-weight: 600; cursor: pointer;">
                    ✅ Cumplimiento Legal
                </button>
            </div>

            <!-- Content Area -->
            <div id="emotional-content-area"></div>
        </div>

        <!-- Modal Container - pointer-events:none para no bloquear clicks cuando está vacío -->
        <div id="emotional-modal-container" style="pointer-events: none;"></div>
    `;

    // Load initial view
    await emotionalAnalysis.loadDashboard();
}

// Global emotional analysis object
window.emotionalAnalysis = {
    async refreshData() {
        const currentView = window.emotionalAnalysis.currentView || 'dashboard';
        switch(currentView) {
            case 'dashboard':
                await emotionalAnalysis.loadDashboard();
                break;
            case 'reports':
                await emotionalAnalysis.loadReports();
                break;
            case 'compliance':
                await emotionalAnalysis.loadCompliance();
                break;
        }
    },

    switchView(view) {
        // Update tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.style.borderBottom = '3px solid transparent';
            btn.style.color = '#6b7280';
        });
        document.getElementById(`tab-${view}`).style.borderBottom = '3px solid #8B5CF6';
        document.getElementById(`tab-${view}`).style.color = '#8B5CF6';

        window.emotionalAnalysis.currentView = view;

        // Load view
        switch(view) {
            case 'dashboard':
                emotionalAnalysis.loadDashboard();
                break;
            case 'reports':
                emotionalAnalysis.loadReports();
                break;
            case 'compliance':
                emotionalAnalysis.loadCompliance();
                break;
        }
    },

    async loadDashboard() {
        const contentArea = document.getElementById('emotional-content-area');
        contentArea.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">🔄</div>
                <p style="color: #6b7280;">Cargando dashboard...</p>
            </div>
        `;

        try {
            // Fetch wellness data (simulado por ahora)
            contentArea.innerHTML = `
                <!-- Stats Cards -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 10px;">👥 Usuarios Analizados</div>
                        <div style="font-size: 32px; font-weight: bold;">0</div>
                        <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">Últimos 7 días</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 25px; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 10px;">😊 Bienestar Promedio</div>
                        <div style="font-size: 32px; font-weight: bold;">--</div>
                        <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">Sin datos disponibles</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 25px; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 10px;">⚡ Nivel de Fatiga</div>
                        <div style="font-size: 32px; font-weight: bold;">--</div>
                        <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">Sin datos disponibles</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 25px; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 10px;">📊 Análisis Hoy</div>
                        <div style="font-size: 32px; font-weight: bold;">0</div>
                        <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">Escaneos realizados</div>
                    </div>
                </div>

                <!-- Info Panel -->
                <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 20px 0; color: #1f2937;">📋 Sistema de Análisis Emocional</h3>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px;">
                        <div>
                            <h4 style="color: #8B5CF6; margin: 0 0 15px 0;">🔬 Tecnología Azure Face API</h4>
                            <ul style="color: #6b7280; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Detección de emociones en tiempo real</li>
                                <li>Análisis de fatiga y estrés</li>
                                <li>Indicadores de bienestar</li>
                                <li>Procesamiento seguro y encriptado</li>
                            </ul>
                        </div>

                        <div>
                            <h4 style="color: #10b981; margin: 0 0 15px 0;">⚖️ Cumplimiento Legal</h4>
                            <ul style="color: #6b7280; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Ley 25.326 (Argentina)</li>
                                <li>Consentimiento explícito requerido</li>
                                <li>Retención de datos: 90 días</li>
                                <li>Derecho a revocación inmediata</li>
                            </ul>
                        </div>

                        <div>
                            <h4 style="color: #f59e0b; margin: 0 0 15px 0;">🔐 Seguridad y Privacidad</h4>
                            <ul style="color: #6b7280; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Datos anonimizados en reportes</li>
                                <li>Auditoría completa de accesos</li>
                                <li>Eliminación automática de datos</li>
                                <li>Reportes agregados (mín. 10 usuarios)</li>
                            </ul>
                        </div>
                    </div>

                    <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
                        <strong style="color: #92400e;">⚠️ Importante:</strong>
                        <p style="margin: 10px 0 0 0; color: #78350f;">
                            Para comenzar a usar el análisis emocional, los usuarios deben otorgar su consentimiento explícito
                            en el módulo <strong>Centro Comando Biométrico → Consentimientos Biométricos</strong>.
                            Los datos solo se recopilan de usuarios que han aceptado el análisis biométrico.
                        </p>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading dashboard:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 40px; background: #fee2e2; border-radius: 12px;">
                    <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
                    <p style="color: #991b1b; margin: 0;">Error al cargar el dashboard</p>
                    <p style="color: #dc2626; margin: 10px 0 0 0; font-size: 14px;">${error.message}</p>
                </div>
            `;
        }
    },

    async loadReports() {
        const contentArea = document.getElementById('emotional-content-area');
        contentArea.innerHTML = `
            <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
                <div style="font-size: 64px; margin-bottom: 20px;">📈</div>
                <h3 style="margin: 0 0 15px 0; color: #1f2937;">Reportes en Desarrollo</h3>
                <p style="color: #6b7280; margin: 0;">
                    Los reportes de análisis emocional estarán disponibles próximamente.<br>
                    Incluirán tendencias, métricas por departamento y análisis históricos.
                </p>
            </div>
        `;
    },

    async loadCompliance() {
        const contentArea = document.getElementById('emotional-content-area');
        contentArea.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">🔄</div>
                <p style="color: #6b7280;">Cargando reporte de cumplimiento...</p>
            </div>
        `;

        try {
            const token = localStorage.getItem('authToken');

            if (!token) {
                console.warn('⚠️ No hay token de autenticación');
                contentArea.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: #fef3c7; border-radius: 12px;">
                        <div style="font-size: 48px; margin-bottom: 15px;">🔒</div>
                        <p style="color: #92400e; margin: 0; font-weight: 600;">Sesión no válida</p>
                        <p style="color: #78350f; margin: 10px 0 0 0; font-size: 14px;">Por favor, recarga la página para iniciar sesión</p>
                    </div>
                `;
                return;
            }

            const response = await fetch('/api/v1/biometric/consents/compliance-report', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                console.warn('⚠️ Token expirado (401)');
                localStorage.removeItem('authToken');
                contentArea.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: #fee2e2; border-radius: 12px;">
                        <div style="font-size: 48px; margin-bottom: 15px;">⏰</div>
                        <p style="color: #991b1b; margin: 0; font-weight: 600;">Sesión expirada</p>
                        <p style="color: #dc2626; margin: 10px 0 0 0; font-size: 14px;">Por favor, recarga la página para iniciar sesión nuevamente</p>
                    </div>
                `;
                return;
            }

            if (!response.ok) throw new Error('Error al cargar reporte');

            const data = await response.json();

            contentArea.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 25px 0; color: #1f2937;">✅ Reporte de Cumplimiento Legal</h3>

                    <!-- Compliance Badges -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
                        <div style="background: #d1fae5; padding: 15px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 24px; margin-bottom: 8px;">⚖️</div>
                            <div style="font-size: 13px; color: #065f46; font-weight: 600;">Ley 25.326</div>
                            <div style="font-size: 12px; color: #059669; margin-top: 5px;">Cumplimiento Total</div>
                        </div>
                        <div style="background: #dbeafe; padding: 15px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 24px; margin-bottom: 8px;">🌍</div>
                            <div style="font-size: 13px; color: #1e40af; font-weight: 600;">GDPR</div>
                            <div style="font-size: 12px; color: #2563eb; margin-top: 5px;">Compatible</div>
                        </div>
                        <div style="background: #fef3c7; padding: 15px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 24px; margin-bottom: 8px;">🔐</div>
                            <div style="font-size: 13px; color: #92400e; font-weight: 600;">BIPA</div>
                            <div style="font-size: 12px; color: #d97706; margin-top: 5px;">Compliant</div>
                        </div>
                        <div style="background: #e0e7ff; padding: 15px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
                            <div style="font-size: 13px; color: #3730a3; font-weight: 600;">Retención</div>
                            <div style="font-size: 12px; color: #4f46e5; margin-top: 5px;">90 días máx.</div>
                        </div>
                    </div>

                    <!-- Summary Stats -->
                    <div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
                        <h4 style="margin: 0 0 15px 0; color: #1f2937;">📊 Resumen de Consentimientos</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                            <div>
                                <div style="font-size: 13px; color: #6b7280; margin-bottom: 5px;">Total de Usuarios</div>
                                <div style="font-size: 24px; font-weight: bold; color: #1f2937;">${data.summary?.total_users || 0}</div>
                            </div>
                            <div>
                                <div style="font-size: 13px; color: #6b7280; margin-bottom: 5px;">Con Consentimiento</div>
                                <div style="font-size: 24px; font-weight: bold; color: #10b981;">${data.summary?.users_with_consent || 0}</div>
                            </div>
                            <div>
                                <div style="font-size: 13px; color: #6b7280; margin-bottom: 5px;">Revocados</div>
                                <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${data.summary?.users_revoked || 0}</div>
                            </div>
                            <div>
                                <div style="font-size: 13px; color: #6b7280; margin-bottom: 5px;">Tasa de Adopción</div>
                                <div style="font-size: 24px; font-weight: bold; color: #8B5CF6;">${data.summary?.consent_rate || 0}%</div>
                            </div>
                        </div>
                    </div>

                    <!-- Legal Requirements -->
                    <div>
                        <h4 style="margin: 0 0 15px 0; color: #1f2937;">📋 Requisitos Legales Implementados</h4>
                        <div style="display: grid; gap: 12px;">
                            <div style="display: flex; align-items: start; gap: 12px;">
                                <div style="font-size: 20px;">✅</div>
                                <div>
                                    <strong style="color: #1f2937;">Consentimiento Explícito</strong>
                                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">
                                        Se requiere validación biométrica (facial o huella) para otorgar consentimiento
                                    </p>
                                </div>
                            </div>
                            <div style="display: flex; align-items: start; gap: 12px;">
                                <div style="font-size: 20px;">✅</div>
                                <div>
                                    <strong style="color: #1f2937;">Derecho de Revocación</strong>
                                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">
                                        Los usuarios pueden revocar su consentimiento en cualquier momento
                                    </p>
                                </div>
                            </div>
                            <div style="display: flex; align-items: start; gap: 12px;">
                                <div style="font-size: 20px;">✅</div>
                                <div>
                                    <strong style="color: #1f2937;">Retención Limitada</strong>
                                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">
                                        Los datos se eliminan automáticamente después de 90 días
                                    </p>
                                </div>
                            </div>
                            <div style="display: flex; align-items: start; gap: 12px;">
                                <div style="font-size: 20px;">✅</div>
                                <div>
                                    <strong style="color: #1f2937;">Auditoría Completa</strong>
                                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">
                                        Todos los cambios de consentimiento se registran con IP, fecha y hora
                                    </p>
                                </div>
                            </div>
                            <div style="display: flex; align-items: start; gap: 12px;">
                                <div style="font-size: 20px;">✅</div>
                                <div>
                                    <strong style="color: #1f2937;">Datos Agregados</strong>
                                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">
                                        Reportes solo con mínimo 10 usuarios para garantizar anonimato
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 25px; padding: 15px; background: #dbeafe; border-left: 4px solid #2563eb; border-radius: 8px;">
                        <strong style="color: #1e40af;">ℹ️ Fecha del Reporte:</strong>
                        <span style="color: #1e3a8a; margin-left: 10px;">
                            ${new Date(data.reportDate).toLocaleString('es-AR')}
                        </span>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading compliance:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 40px; background: #fee2e2; border-radius: 12px;">
                    <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
                    <p style="color: #991b1b; margin: 0;">Error al cargar reporte de cumplimiento</p>
                    <p style="color: #dc2626; margin: 10px 0 0 0; font-size: 14px;">${error.message}</p>
                </div>
            `;
        }
    }
};

console.log('✅ Módulo de análisis emocional cargado');
