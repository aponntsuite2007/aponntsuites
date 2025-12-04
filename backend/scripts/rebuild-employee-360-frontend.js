#!/usr/bin/env node
/**
 * Script para reconstruir completamente el frontend employee-360.js
 * con implementacion ENTERPRISE verdadera
 */
const fs = require('fs');

const filePath = 'C:/Bio/sistema_asistencia_biometrico/backend/public/js/modules/employee-360.js';

const newContent = `/**
 * ============================================================================
 * MODULO: Expediente 360 ENTERPRISE v3.1 - Analisis Integral Predictivo
 * ============================================================================
 * Sistema premium con:
 * - Scoring 6D multidimensional
 * - Indice de Riesgo de Fuga predictivo
 * - Patrones de comportamiento detectados
 * - Analisis biometrico emocional con CORRELACIONES
 * - Compatibilidad de tareas y reemplazos
 * - Timeline unificado de eventos
 * - Analisis IA con Ollama
 * - Datos completos del empleado (CT Scan laboral)
 * ============================================================================
 */

(function() {
    'use strict';

    const MODULE_KEY = 'employee-360';
    const API_BASE = '/api/employee-360';

    let currentEmployee = null;
    let employeesList = [];
    let currentReport = null;

    // =========================================================================
    // ESTILOS CSS ENTERPRISE
    // =========================================================================
    function injectStyles() {
        if (document.getElementById('employee-360-styles')) return;

        const style = document.createElement('style');
        style.id = 'employee-360-styles';
        style.textContent = \`
            :root {
                --e360-bg-primary: #0f0f1a;
                --e360-bg-secondary: #1a1a2e;
                --e360-bg-tertiary: #252542;
                --e360-bg-card: #1e1e35;
                --e360-border: #2d2d4a;
                --e360-text-primary: #e8e8f0;
                --e360-text-secondary: #a0a0b8;
                --e360-text-muted: #6b6b80;
                --e360-accent-blue: #00d4ff;
                --e360-accent-green: #00e676;
                --e360-accent-yellow: #ffc107;
                --e360-accent-red: #ff5252;
                --e360-accent-purple: #b388ff;
                --e360-accent-orange: #ff9100;
            }

            .employee-360-wrapper {
                background: var(--e360-bg-primary);
                min-height: 100vh;
                color: var(--e360-text-primary);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                padding: 20px;
            }

            .e360-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 24px;
                background: linear-gradient(135deg, var(--e360-bg-secondary), var(--e360-bg-tertiary));
                border-radius: 12px;
                margin-bottom: 20px;
                border: 1px solid var(--e360-border);
            }

            .e360-header-left { display: flex; align-items: center; gap: 16px; }

            .e360-logo {
                width: 50px; height: 50px;
                background: linear-gradient(135deg, var(--e360-accent-blue), var(--e360-accent-purple));
                border-radius: 12px;
                display: flex; align-items: center; justify-content: center;
                font-size: 24px;
            }

            .e360-title { font-size: 22px; font-weight: 700; }
            .e360-subtitle { font-size: 12px; color: var(--e360-text-muted); }

            .e360-search-container { display: flex; gap: 12px; align-items: center; }

            .e360-search-input {
                background: var(--e360-bg-tertiary);
                border: 1px solid var(--e360-border);
                border-radius: 8px;
                padding: 10px 16px;
                color: var(--e360-text-primary);
                width: 300px;
            }

            .e360-btn {
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }

            .e360-btn-primary {
                background: linear-gradient(135deg, var(--e360-accent-blue), var(--e360-accent-purple));
                color: white;
            }

            .e360-card {
                background: var(--e360-bg-card);
                border: 1px solid var(--e360-border);
                border-radius: 12px;
                margin-bottom: 20px;
                overflow: hidden;
            }

            .e360-card-header {
                padding: 16px 20px;
                border-bottom: 1px solid var(--e360-border);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .e360-card-title {
                font-size: 16px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .e360-card-body { padding: 20px; }

            /* TABS */
            .e360-tabs {
                display: flex;
                gap: 4px;
                padding: 12px 20px;
                background: var(--e360-bg-secondary);
                border-bottom: 1px solid var(--e360-border);
                flex-wrap: wrap;
            }

            .e360-tab {
                padding: 10px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                color: var(--e360-text-secondary);
                transition: all 0.2s;
                border: 1px solid transparent;
            }

            .e360-tab:hover { background: var(--e360-bg-tertiary); }

            .e360-tab.active {
                background: var(--e360-accent-blue);
                color: white;
                font-weight: 600;
            }

            .e360-tab-content { display: none; }
            .e360-tab-content.active { display: block; }

            /* SCORING GAUGE */
            .e360-score-gauge {
                width: 180px; height: 180px;
                position: relative;
                margin: 0 auto 20px;
            }

            .e360-score-circle {
                width: 100%; height: 100%;
                border-radius: 50%;
                background: conic-gradient(
                    var(--gauge-color) calc(var(--gauge-percent) * 3.6deg),
                    var(--e360-bg-tertiary) 0
                );
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .e360-score-inner {
                width: 140px; height: 140px;
                background: var(--e360-bg-card);
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            .e360-score-value { font-size: 36px; font-weight: 700; }
            .e360-score-label { font-size: 12px; color: var(--e360-text-muted); }

            /* FLIGHT RISK */
            .e360-risk-indicator {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 16px;
            }

            .e360-risk-low { background: rgba(0, 230, 118, 0.15); border: 1px solid var(--e360-accent-green); }
            .e360-risk-medium { background: rgba(255, 193, 7, 0.15); border: 1px solid var(--e360-accent-yellow); }
            .e360-risk-high { background: rgba(255, 145, 0, 0.15); border: 1px solid var(--e360-accent-orange); }
            .e360-risk-critical { background: rgba(255, 82, 82, 0.15); border: 1px solid var(--e360-accent-red); }

            .e360-risk-score { font-size: 32px; font-weight: 700; }
            .e360-risk-label { font-size: 14px; font-weight: 600; }

            /* PATTERNS */
            .e360-pattern-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background: var(--e360-bg-tertiary);
                border-radius: 8px;
                margin-bottom: 8px;
            }

            .e360-pattern-status {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
            }

            .e360-pattern-ok { background: rgba(0, 230, 118, 0.2); color: var(--e360-accent-green); }
            .e360-pattern-warning { background: rgba(255, 193, 7, 0.2); color: var(--e360-accent-yellow); }
            .e360-pattern-critical { background: rgba(255, 82, 82, 0.2); color: var(--e360-accent-red); }

            /* TIMELINE */
            .e360-timeline {
                max-height: 500px;
                overflow-y: auto;
                padding-right: 10px;
            }

            .e360-timeline-item {
                display: flex;
                gap: 16px;
                padding: 12px 0;
                border-bottom: 1px solid var(--e360-border);
            }

            .e360-timeline-icon {
                width: 40px; height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                flex-shrink: 0;
            }

            .e360-timeline-content { flex: 1; }
            .e360-timeline-title { font-weight: 600; margin-bottom: 4px; }
            .e360-timeline-date { font-size: 12px; color: var(--e360-text-muted); }

            /* CORRELATIONS */
            .e360-correlation-card {
                background: linear-gradient(135deg, rgba(179, 136, 255, 0.1), rgba(0, 212, 255, 0.1));
                border: 1px solid var(--e360-accent-purple);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
            }

            .e360-correlation-significance {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 700;
            }

            .e360-correlation-high { background: var(--e360-accent-red); color: white; }
            .e360-correlation-medium { background: var(--e360-accent-yellow); color: black; }

            /* ALERTS */
            .e360-alert {
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 12px;
                display: flex;
                gap: 12px;
                align-items: flex-start;
            }

            .e360-alert-danger { background: rgba(255, 82, 82, 0.15); border-left: 4px solid var(--e360-accent-red); }
            .e360-alert-warning { background: rgba(255, 193, 7, 0.15); border-left: 4px solid var(--e360-accent-yellow); }
            .e360-alert-info { background: rgba(0, 212, 255, 0.15); border-left: 4px solid var(--e360-accent-blue); }

            /* METRICS ROW */
            .e360-metrics-row {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 20px;
            }

            .e360-metric-card {
                background: var(--e360-bg-tertiary);
                border-radius: 8px;
                padding: 16px;
                text-align: center;
            }

            .e360-metric-value { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
            .e360-metric-label { font-size: 12px; color: var(--e360-text-muted); }

            /* REPLACEMENT LIST */
            .e360-replacement-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background: var(--e360-bg-tertiary);
                border-radius: 8px;
                margin-bottom: 8px;
            }

            .e360-replacement-score {
                padding: 6px 14px;
                border-radius: 20px;
                font-weight: 700;
            }

            .e360-replacement-score-high { background: var(--e360-accent-green); color: black; }
            .e360-replacement-score-medium { background: var(--e360-accent-yellow); color: black; }
            .e360-replacement-score-low { background: var(--e360-text-muted); color: white; }

            /* LOADING */
            .e360-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 60px;
            }

            .e360-spinner {
                width: 50px; height: 50px;
                border: 4px solid var(--e360-border);
                border-top-color: var(--e360-accent-blue);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin { to { transform: rotate(360deg); } }

            /* GRID LAYOUTS */
            .e360-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .e360-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }

            @media (max-width: 1024px) {
                .e360-grid-2, .e360-grid-3 { grid-template-columns: 1fr; }
            }

            /* BADGES */
            .e360-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
            }

            .e360-badge-success { background: var(--e360-accent-green); color: black; }
            .e360-badge-warning { background: var(--e360-accent-yellow); color: black; }
            .e360-badge-danger { background: var(--e360-accent-red); color: white; }
            .e360-badge-info { background: var(--e360-accent-blue); color: white; }

            /* DATA SHEET */
            .e360-data-row {
                display: flex;
                padding: 10px 0;
                border-bottom: 1px solid var(--e360-border);
            }

            .e360-data-label { width: 200px; color: var(--e360-text-muted); font-size: 13px; }
            .e360-data-value { flex: 1; font-weight: 500; }

            /* CATEGORY SCORES */
            .e360-category-bar {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }

            .e360-category-name { width: 140px; font-size: 13px; }

            .e360-category-progress {
                flex: 1;
                height: 8px;
                background: var(--e360-bg-tertiary);
                border-radius: 4px;
                overflow: hidden;
            }

            .e360-category-fill {
                height: 100%;
                border-radius: 4px;
                transition: width 0.5s;
            }

            .e360-category-score { width: 50px; text-align: right; font-weight: 600; }
        \`;
        document.head.appendChild(style);
    }

    // =========================================================================
    // INICIALIZACION
    // =========================================================================
    function init() {
        console.log('[E360] Inicializando Expediente 360 Enterprise v3.1...');
        injectStyles();
    }

    function render(container) {
        container.innerHTML = \`
            <div class="employee-360-wrapper">
                <div class="e360-header">
                    <div class="e360-header-left">
                        <div class="e360-logo">360</div>
                        <div>
                            <div class="e360-title">Expediente 360 ENTERPRISE</div>
                            <div class="e360-subtitle">Analisis Integral Predictivo v3.1</div>
                        </div>
                    </div>
                    <div class="e360-search-container">
                        <select id="e360-employee-select" class="e360-search-input">
                            <option value="">-- Seleccionar empleado --</option>
                        </select>
                        <button id="e360-generate-btn" class="e360-btn e360-btn-primary">
                            Generar Expediente
                        </button>
                    </div>
                </div>

                <div id="e360-content">
                    <div class="e360-loading">
                        <p style="color: var(--e360-text-muted);">Seleccione un empleado para generar el expediente 360</p>
                    </div>
                </div>
            </div>
        \`;

        loadEmployees();
        bindEvents();
    }

    // =========================================================================
    // CARGA DE EMPLEADOS
    // =========================================================================
    async function loadEmployees() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/users?limit=500', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            employeesList = data.data || data.users || data || [];

            const select = document.getElementById('e360-employee-select');
            if (select) {
                select.innerHTML = '<option value="">-- Seleccionar empleado --</option>';
                employeesList.forEach(emp => {
                    const name = emp.firstName + ' ' + emp.lastName;
                    select.innerHTML += '<option value="' + emp.user_id + '">' + name + ' (' + (emp.position || 'N/A') + ')</option>';
                });
            }
        } catch (e) {
            console.error('[E360] Error cargando empleados:', e);
        }
    }

    function bindEvents() {
        const btn = document.getElementById('e360-generate-btn');
        if (btn) {
            btn.addEventListener('click', async () => {
                const select = document.getElementById('e360-employee-select');
                if (select && select.value) {
                    await generateReport(select.value);
                }
            });
        }
    }

    // =========================================================================
    // GENERAR REPORTE
    // =========================================================================
    async function generateReport(userId) {
        const content = document.getElementById('e360-content');
        content.innerHTML = '<div class="e360-loading"><div class="e360-spinner"></div><p style="margin-top:16px;color:var(--e360-text-muted);">Generando expediente 360...</p></div>';

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(API_BASE + '/' + userId + '/report', {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Error generando reporte');

            currentReport = result.report;
            currentEmployee = result.report.employee;

            renderFullReport(currentReport);

        } catch (e) {
            console.error('[E360] Error:', e);
            content.innerHTML = '<div class="e360-alert e360-alert-danger"><strong>Error:</strong> ' + e.message + '</div>';
        }
    }

    // =========================================================================
    // RENDER REPORTE COMPLETO
    // =========================================================================
    function renderFullReport(report) {
        const content = document.getElementById('e360-content');

        content.innerHTML = \`
            <div class="e360-card">
                <div class="e360-tabs">
                    <div class="e360-tab active" data-tab="overview">Resumen Ejecutivo</div>
                    <div class="e360-tab" data-tab="predictive">Analisis Predictivo</div>
                    <div class="e360-tab" data-tab="biometric">Biometrico</div>
                    <div class="e360-tab" data-tab="compatibility">Reemplazos</div>
                    <div class="e360-tab" data-tab="timeline">Timeline</div>
                    <div class="e360-tab" data-tab="data">Ficha Completa</div>
                    <div class="e360-tab" data-tab="salary">Salario</div>
                </div>

                <div id="e360-tab-overview" class="e360-tab-content active">
                    \${renderOverviewTab(report)}
                </div>

                <div id="e360-tab-predictive" class="e360-tab-content">
                    \${renderPredictiveTab(report)}
                </div>

                <div id="e360-tab-biometric" class="e360-tab-content">
                    \${renderBiometricTab(report)}
                </div>

                <div id="e360-tab-compatibility" class="e360-tab-content">
                    \${renderCompatibilityTab(report)}
                </div>

                <div id="e360-tab-timeline" class="e360-tab-content">
                    \${renderTimelineTab(report)}
                </div>

                <div id="e360-tab-data" class="e360-tab-content">
                    \${renderDataTab(report)}
                </div>

                <div id="e360-tab-salary" class="e360-tab-content">
                    \${renderSalaryTab(report)}
                </div>
            </div>
        \`;

        // Tab switching
        document.querySelectorAll('.e360-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.e360-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.e360-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('e360-tab-' + tab.dataset.tab).classList.add('active');
            });
        });
    }

    // =========================================================================
    // TAB: RESUMEN EJECUTIVO
    // =========================================================================
    function renderOverviewTab(report) {
        const emp = report.employee || {};
        const scoring = report.scoring || {};
        const flightRisk = report.flightRisk || {};

        const scoreColor = scoring.total >= 80 ? '#00e676' : scoring.total >= 60 ? '#ffc107' : scoring.total >= 40 ? '#ff9100' : '#ff5252';
        const riskClass = flightRisk.level === 'low' ? 'low' : flightRisk.level === 'medium' ? 'medium' : flightRisk.level === 'high' ? 'high' : 'critical';
        const riskColor = flightRisk.color || '#ff5252';

        let categoriesHTML = '';
        if (scoring.categories) {
            Object.entries(scoring.categories).forEach(([key, data]) => {
                const barColor = data.score >= 80 ? '#00e676' : data.score >= 60 ? '#ffc107' : data.score >= 40 ? '#ff9100' : '#ff5252';
                categoriesHTML += \`
                    <div class="e360-category-bar">
                        <div class="e360-category-name">\${data.label || key}</div>
                        <div class="e360-category-progress">
                            <div class="e360-category-fill" style="width:\${data.score}%;background:\${barColor}"></div>
                        </div>
                        <div class="e360-category-score" style="color:\${barColor}">\${data.score}/100</div>
                    </div>
                \`;
            });
        }

        return \`
            <div class="e360-card-body">
                <div class="e360-grid-2">
                    <div>
                        <h4 style="margin-bottom:16px">Empleado</h4>
                        <div style="display:flex;gap:16px;align-items:center;margin-bottom:20px">
                            <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--e360-accent-blue),var(--e360-accent-purple));display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700">
                                \${(emp.firstName || '?')[0]}\${(emp.lastName || '?')[0]}
                            </div>
                            <div>
                                <div style="font-size:20px;font-weight:700">\${emp.fullName || 'N/A'}</div>
                                <div style="color:var(--e360-text-muted)">\${emp.position || 'Sin cargo'}</div>
                                <div style="color:var(--e360-text-muted)">\${emp.department?.name || 'Sin departamento'}</div>
                                <div style="margin-top:8px">
                                    <span class="e360-badge e360-badge-info">\${emp.tenure?.formatted || 'N/A'}</span>
                                    <span class="e360-badge" style="background:var(--e360-bg-tertiary)">Legajo: \${emp.legajo || emp.employeeId || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <h4 style="margin:20px 0 16px">Scoring por Dimension (6D)</h4>
                        \${categoriesHTML}

                        \${scoring.additionalRolesBonus?.applied ? \`
                            <div class="e360-alert e360-alert-info">
                                <strong>Bonus por Roles Adicionales:</strong> +\${scoring.additionalRolesBonus.bonusPoints} pts (\${scoring.additionalRolesBonus.totalBonusPercent})
                            </div>
                        \` : ''}
                    </div>

                    <div>
                        <h4 style="margin-bottom:16px">Score General</h4>
                        <div class="e360-score-gauge" style="--gauge-percent:\${scoring.total || 0};--gauge-color:\${scoreColor}">
                            <div class="e360-score-circle">
                                <div class="e360-score-inner">
                                    <div class="e360-score-value" style="color:\${scoreColor}">\${scoring.total || 0}</div>
                                    <div class="e360-score-label">/ 100 puntos</div>
                                    <div style="font-weight:600;margin-top:4px">Grado \${scoring.grade?.letter || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        <h4 style="margin:20px 0 16px">Indice de Riesgo de Fuga</h4>
                        <div class="e360-risk-indicator e360-risk-\${riskClass}">
                            <div class="e360-risk-score" style="color:\${riskColor}">\${flightRisk.score || 0}%</div>
                            <div>
                                <div class="e360-risk-label" style="color:\${riskColor}">\${flightRisk.label || 'N/A'}</div>
                                <div style="font-size:12px;color:var(--e360-text-secondary);margin-top:4px">\${flightRisk.insight || ''}</div>
                            </div>
                        </div>

                        \${flightRisk.factors && flightRisk.factors.length > 0 ? \`
                            <h5 style="margin:16px 0 8px">Factores de Riesgo:</h5>
                            \${flightRisk.factors.map(f => \`
                                <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--e360-bg-tertiary);border-radius:6px;margin-bottom:6px;font-size:13px">
                                    <span>\${f.factor}</span>
                                    <span style="color:\${f.status === 'critical' ? 'var(--e360-accent-red)' : f.status === 'warning' ? 'var(--e360-accent-yellow)' : 'var(--e360-text-muted)'}">\${f.impact} pts</span>
                                </div>
                            \`).join('')}
                        \` : ''}
                    </div>
                </div>

                \${report.aiAnalysis ? \`
                    <div class="e360-card" style="margin-top:24px;background:linear-gradient(135deg,rgba(179,136,255,0.1),rgba(0,212,255,0.1));border:1px solid var(--e360-accent-purple)">
                        <div class="e360-card-header">
                            <div class="e360-card-title">Analisis IA</div>
                            <span class="e360-badge e360-badge-info">\${report.aiAnalysis.generated ? 'Ollama' : 'Fallback'}</span>
                        </div>
                        <div class="e360-card-body">
                            <p style="white-space:pre-wrap">\${report.aiAnalysis.content || report.aiAnalysis.analysis || 'Sin analisis disponible'}</p>
                        </div>
                    </div>
                \` : ''}
            </div>
        \`;
    }

    // =========================================================================
    // TAB: ANALISIS PREDICTIVO
    // =========================================================================
    function renderPredictiveTab(report) {
        const patterns = report.behaviorPatterns || [];
        const flightRisk = report.flightRisk || {};

        let patternsHTML = patterns.map(p => {
            const statusClass = p.status === 'ok' ? 'ok' : p.status === 'warning' ? 'warning' : 'critical';
            return \`
                <div class="e360-pattern-item">
                    <div>
                        <div style="font-weight:600">\${p.name}</div>
                        <div style="font-size:12px;color:var(--e360-text-muted)">\${p.stats}</div>
                    </div>
                    <span class="e360-pattern-status e360-pattern-\${statusClass}">\${p.statusLabel}</span>
                </div>
            \`;
        }).join('');

        let recommendationsHTML = '';
        if (flightRisk.recommendations && flightRisk.recommendations.length > 0) {
            recommendationsHTML = flightRisk.recommendations.map(r => \`
                <div class="e360-alert e360-alert-\${r.priority === 'ALTA' ? 'danger' : r.priority === 'MEDIA' ? 'warning' : 'info'}">
                    <div>
                        <span class="e360-badge e360-badge-\${r.priority === 'ALTA' ? 'danger' : r.priority === 'MEDIA' ? 'warning' : 'info'}">\${r.priority}</span>
                        <strong style="margin-left:8px">\${r.action}</strong>
                        <div style="font-size:12px;color:var(--e360-text-muted);margin-top:4px">Plazo: \${r.timeframe}</div>
                    </div>
                </div>
            \`).join('');
        }

        return \`
            <div class="e360-card-body">
                <div class="e360-grid-2">
                    <div>
                        <h4 style="margin-bottom:16px">Patrones de Comportamiento Detectados</h4>
                        \${patternsHTML || '<p style="color:var(--e360-text-muted)">No se detectaron patrones</p>'}
                    </div>
                    <div>
                        <h4 style="margin-bottom:16px">Recomendaciones de Accion</h4>
                        \${recommendationsHTML || '<p style="color:var(--e360-text-muted)">Sin recomendaciones activas</p>'}
                    </div>
                </div>
            </div>
        \`;
    }

    // =========================================================================
    // TAB: BIOMETRICO
    // =========================================================================
    function renderBiometricTab(report) {
        const bio = report.biometricAnalysis || {};

        if (!bio.hasModule) {
            return '<div class="e360-card-body"><p style="color:var(--e360-text-muted)">No hay datos biometricos disponibles para este empleado.</p></div>';
        }

        const metrics = bio.metrics || {};
        const correlations = bio.correlations || [];
        const alerts = bio.alerts || [];

        let alertsHTML = alerts.map(a => \`
            <div class="e360-alert e360-alert-\${a.severity === 'critical' ? 'danger' : 'warning'}">
                <div>
                    <strong>\${a.type}</strong>
                    <p style="margin:4px 0">\${a.message}</p>
                    <small style="color:var(--e360-text-muted)">\${a.recommendation}</small>
                </div>
            </div>
        \`).join('');

        let correlationsHTML = correlations.map(c => \`
            <div class="e360-correlation-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                    <span class="e360-correlation-significance e360-correlation-\${c.significance}">\${c.significance.toUpperCase()}</span>
                    <span style="font-size:12px;color:var(--e360-text-muted)">\${formatDate(c.event.event_date)}</span>
                </div>
                <div style="font-weight:600;margin-bottom:8px">\${c.event.event_type === 'medical_leave' ? 'Licencia Medica' : c.event.event_type === 'sanction' ? 'Sancion' : c.event.event_type}</div>
                <p style="font-size:13px;color:var(--e360-text-secondary)">\${c.insight}</p>
                <div style="margin-top:12px;display:flex;gap:12px">
                    <span class="e360-badge" style="background:var(--e360-bg-tertiary)">Fatiga: \${(c.avgFatigue * 100).toFixed(0)}%</span>
                    <span class="e360-badge" style="background:var(--e360-bg-tertiary)">Estres: \${(c.avgStress * 100).toFixed(0)}%</span>
                    <span class="e360-badge" style="background:var(--e360-bg-tertiary)">\${c.priorScansCount} scans previos</span>
                </div>
            </div>
        \`).join('');

        const trendIcon = metrics.trend === 'increasing_fatigue' ? '&#8599; Aumentando' :
                          metrics.trend === 'decreasing_fatigue' ? '&#8600; Disminuyendo' : '&#8594; Estable';

        return \`
            <div class="e360-card-body">
                \${alertsHTML}

                <h4 style="margin-bottom:16px">Metricas Biometricas Agregadas</h4>
                <div class="e360-metrics-row">
                    <div class="e360-metric-card">
                        <div class="e360-metric-value" style="color:\${metrics.avgFatigue > 0.6 ? 'var(--e360-accent-red)' : metrics.avgFatigue > 0.4 ? 'var(--e360-accent-yellow)' : 'var(--e360-accent-green)'}">\${(metrics.avgFatigue * 100).toFixed(0)}%</div>
                        <div class="e360-metric-label">Fatiga Promedio</div>
                    </div>
                    <div class="e360-metric-card">
                        <div class="e360-metric-value" style="color:var(--e360-accent-blue)">\${(metrics.avgHappiness * 100).toFixed(0)}%</div>
                        <div class="e360-metric-label">Felicidad Promedio</div>
                    </div>
                    <div class="e360-metric-card">
                        <div class="e360-metric-value" style="color:\${metrics.avgStress > 0.6 ? 'var(--e360-accent-red)' : 'var(--e360-accent-green)'}">\${(metrics.avgStress * 100).toFixed(0)}%</div>
                        <div class="e360-metric-label">Estres Promedio</div>
                    </div>
                    <div class="e360-metric-card">
                        <div class="e360-metric-value">\${metrics.avgWellness?.toFixed(0) || 'N/A'}</div>
                        <div class="e360-metric-label">Wellness Score</div>
                    </div>
                    <div class="e360-metric-card">
                        <div class="e360-metric-value">\${metrics.totalSamples || 0}</div>
                        <div class="e360-metric-label">Total Muestras</div>
                    </div>
                    <div class="e360-metric-card">
                        <div class="e360-metric-value">\${trendIcon}</div>
                        <div class="e360-metric-label">Tendencia Fatiga</div>
                    </div>
                </div>

                \${metrics.dominantEmotions && metrics.dominantEmotions.length > 0 ? \`
                    <h5 style="margin:20px 0 12px">Emociones Dominantes</h5>
                    <div style="display:flex;gap:12px;flex-wrap:wrap">
                        \${metrics.dominantEmotions.slice(0, 5).map(e => \`
                            <span class="e360-badge" style="background:var(--e360-bg-tertiary);padding:8px 16px;font-size:13px">
                                \${e.emotion}: \${e.percent}%
                            </span>
                        \`).join('')}
                    </div>
                \` : ''}

                \${correlations.length > 0 ? \`
                    <h4 style="margin:24px 0 16px">Correlaciones Biometrico-Eventos Detectadas</h4>
                    <p style="color:var(--e360-text-muted);font-size:13px;margin-bottom:16px">
                        El sistema analiza patrones biometricos previos a eventos significativos para detectar correlaciones predictivas.
                    </p>
                    \${correlationsHTML}
                \` : '<p style="color:var(--e360-text-muted);margin-top:20px">No se detectaron correlaciones significativas entre datos biometricos y eventos.</p>'}
            </div>
        \`;
    }

    // =========================================================================
    // TAB: COMPATIBILIDAD/REEMPLAZOS
    // =========================================================================
    function renderCompatibilityTab(report) {
        const tc = report.taskCompatibility || {};

        if (!tc.hasModule) {
            return '<div class="e360-card-body"><p style="color:var(--e360-text-muted)">El modulo de compatibilidad de tareas no esta disponible.</p></div>';
        }

        const replacements = tc.replacements || [];
        const canReplace = tc.canReplace || [];

        let replacementsHTML = replacements.length > 0 ? replacements.map(r => {
            const scoreClass = r.compatibilityScore >= 80 ? 'high' : r.compatibilityScore >= 50 ? 'medium' : 'low';
            return \`
                <div class="e360-replacement-item">
                    <div>
                        <div style="font-weight:600">\${r.coverName}</div>
                        <div style="font-size:12px;color:var(--e360-text-muted)">\${r.position || 'Sin cargo'}</div>
                        <div style="font-size:11px;color:var(--e360-text-muted);margin-top:4px">\${r.successfulCoverages} coberturas exitosas</div>
                    </div>
                    <span class="e360-replacement-score e360-replacement-score-\${scoreClass}">\${r.compatibilityScore}%</span>
                </div>
            \`;
        }).join('') : '<p style="color:var(--e360-text-muted)">No hay reemplazos configurados</p>';

        let canReplaceHTML = canReplace.length > 0 ? canReplace.map(r => {
            const scoreClass = r.compatibilityScore >= 80 ? 'high' : r.compatibilityScore >= 50 ? 'medium' : 'low';
            return \`
                <div class="e360-replacement-item">
                    <div>
                        <div style="font-weight:600">\${r.primaryName}</div>
                        <div style="font-size:12px;color:var(--e360-text-muted)">\${r.position || 'Sin cargo'}</div>
                    </div>
                    <span class="e360-replacement-score e360-replacement-score-\${scoreClass}">\${r.compatibilityScore}%</span>
                </div>
            \`;
        }).join('') : '<p style="color:var(--e360-text-muted)">Este empleado no esta asignado como reemplazo</p>';

        return \`
            <div class="e360-card-body">
                \${tc.hasNoReplacement ? \`
                    <div class="e360-alert e360-alert-danger">
                        <div>
                            <strong>ALERTA: SIN REEMPLAZO</strong>
                            <p style="margin:4px 0">\${tc.alert}</p>
                        </div>
                    </div>
                \` : ''}

                <div class="e360-grid-2">
                    <div>
                        <h4 style="margin-bottom:16px">Quienes pueden REEMPLAZAR a este empleado</h4>
                        \${replacementsHTML}
                    </div>
                    <div>
                        <h4 style="margin-bottom:16px">A quienes puede REEMPLAZAR este empleado</h4>
                        \${canReplaceHTML}
                    </div>
                </div>

                <div style="margin-top:24px;padding:16px;background:var(--e360-bg-tertiary);border-radius:8px">
                    <p style="font-size:13px;color:var(--e360-text-muted)">
                        La compatibilidad se calcula en base a habilidades, experiencia, rendimiento en coberturas anteriores y disponibilidad.
                        Un score mayor a 80% indica alta compatibilidad para cobertura de tareas.
                    </p>
                </div>
            </div>
        \`;
    }

    // =========================================================================
    // TAB: TIMELINE
    // =========================================================================
    function renderTimelineTab(report) {
        const timeline = report.timeline || [];

        if (timeline.length === 0) {
            return '<div class="e360-card-body"><p style="color:var(--e360-text-muted)">No hay eventos en el timeline.</p></div>';
        }

        const timelineHTML = timeline.map(evt => {
            const bgColor = evt.color || '#6c757d';
            return \`
                <div class="e360-timeline-item">
                    <div class="e360-timeline-icon" style="background:\${bgColor}22;color:\${bgColor}">
                        \${evt.icon || '?'}
                    </div>
                    <div class="e360-timeline-content">
                        <div class="e360-timeline-title">\${evt.title}</div>
                        <div class="e360-timeline-date">\${formatDate(evt.date)} - \${evt.category || evt.type}</div>
                    </div>
                </div>
            \`;
        }).join('');

        return \`
            <div class="e360-card-body">
                <h4 style="margin-bottom:16px">Timeline Unificado de Eventos (\${timeline.length})</h4>
                <div class="e360-timeline">
                    \${timelineHTML}
                </div>
            </div>
        \`;
    }

    // =========================================================================
    // TAB: FICHA COMPLETA
    // =========================================================================
    function renderDataTab(report) {
        const emp = report.employee || {};
        const complete = report.completeUserData || {};

        const fields = [
            { label: 'Nombre Completo', value: emp.fullName },
            { label: 'DNI', value: emp.dni },
            { label: 'CUIL', value: emp.cuil },
            { label: 'Fecha Nacimiento', value: formatDate(emp.birthDate) },
            { label: 'Edad', value: emp.age ? emp.age + ' anos' : 'N/A' },
            { label: 'Email', value: emp.email },
            { label: 'Telefono', value: emp.phone },
            { label: 'Direccion', value: emp.address },
            { label: 'Cargo', value: emp.position },
            { label: 'Departamento', value: emp.department?.name },
            { label: 'Empresa', value: emp.company?.name },
            { label: 'Fecha Ingreso', value: formatDate(emp.hireDate) },
            { label: 'Antiguedad', value: emp.tenure?.formatted },
            { label: 'Legajo', value: emp.legajo || emp.employeeId },
            { label: 'Rol', value: emp.role },
            { label: 'Contacto Emergencia', value: emp.emergencyContact },
            { label: 'Ultimo Login', value: formatDate(emp.lastLogin) },
            { label: 'Huella Digital', value: emp.hasFingerprint ? 'Si' : 'No' },
            { label: 'Datos Faciales', value: emp.hasFacialData ? 'Si' : 'No' },
        ];

        const fieldsHTML = fields.map(f => \`
            <div class="e360-data-row">
                <div class="e360-data-label">\${f.label}</div>
                <div class="e360-data-value">\${f.value || 'N/A'}</div>
            </div>
        \`).join('');

        let familyHTML = '';
        if (complete.family && complete.family.members && complete.family.members.length > 0) {
            familyHTML = \`
                <h5 style="margin:24px 0 12px">Grupo Familiar</h5>
                \${complete.family.members.map(m => \`
                    <div class="e360-data-row">
                        <div class="e360-data-label">\${m.relationship}</div>
                        <div class="e360-data-value">\${m.name} (\${m.age || '?'} anos)</div>
                    </div>
                \`).join('')}
            \`;
        }

        let educationHTML = '';
        if (complete.education && complete.education.records && complete.education.records.length > 0) {
            educationHTML = \`
                <h5 style="margin:24px 0 12px">Educacion</h5>
                \${complete.education.records.map(e => \`
                    <div class="e360-data-row">
                        <div class="e360-data-label">\${e.level}</div>
                        <div class="e360-data-value">\${e.institution} - \${e.title || 'N/A'}</div>
                    </div>
                \`).join('')}
            \`;
        }

        return \`
            <div class="e360-card-body">
                <h4 style="margin-bottom:16px">Ficha del Empleado</h4>
                \${fieldsHTML}
                \${familyHTML}
                \${educationHTML}

                \${emp.additionalRoles && emp.additionalRoles.length > 0 ? \`
                    <h5 style="margin:24px 0 12px">Roles Adicionales</h5>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                        \${emp.additionalRoles.map(r => '<span class="e360-badge e360-badge-info">' + r + '</span>').join('')}
                    </div>
                \` : ''}
            </div>
        \`;
    }

    // =========================================================================
    // TAB: SALARIO
    // =========================================================================
    function renderSalaryTab(report) {
        const salary = report.completeUserData?.salary || {};
        const sections = report.sections || {};

        if (!salary.hasConfiguredSalary && !sections.salary) {
            return '<div class="e360-card-body"><p style="color:var(--e360-text-muted)">No hay informacion salarial disponible.</p></div>';
        }

        const current = salary.current || sections.salary || {};
        const history = salary.history || current.salaryHistory || [];
        const payroll = salary.payrollRecords || current.payrollRecords || [];

        return \`
            <div class="e360-card-body">
                <div class="e360-grid-2">
                    <div>
                        <h4 style="margin-bottom:16px">Salario Actual</h4>
                        <div class="e360-metric-card" style="margin-bottom:16px">
                            <div class="e360-metric-value" style="color:var(--e360-accent-green)">$\${(current.baseSalary || current.current?.baseSalary || 0).toLocaleString()}</div>
                            <div class="e360-metric-label">Salario Base</div>
                        </div>
                        <div class="e360-data-row">
                            <div class="e360-data-label">Categoria</div>
                            <div class="e360-data-value">\${current.categoryName || current.current?.categoryName || 'N/A'}</div>
                        </div>
                        <div class="e360-data-row">
                            <div class="e360-data-label">Convenio</div>
                            <div class="e360-data-value">\${current.cctCode || current.current?.cctCode || 'N/A'}</div>
                        </div>
                        <div class="e360-data-row">
                            <div class="e360-data-label">Tipo Contrato</div>
                            <div class="e360-data-value">\${current.contractType || current.current?.contractType || 'N/A'}</div>
                        </div>
                    </div>

                    <div>
                        <h4 style="margin-bottom:16px">Historial de Cambios Salariales</h4>
                        \${history.length > 0 ? history.slice(0, 10).map(h => \`
                            <div class="e360-data-row">
                                <div class="e360-data-label">\${formatDate(h.effectiveDate || h.date)}</div>
                                <div class="e360-data-value">
                                    $\${(h.newSalary || h.amount || 0).toLocaleString()}
                                    \${h.reason ? '<small style="color:var(--e360-text-muted)"> - ' + h.reason + '</small>' : ''}
                                </div>
                            </div>
                        \`).join('') : '<p style="color:var(--e360-text-muted)">Sin historial de cambios</p>'}
                    </div>
                </div>

                \${payroll.length > 0 ? \`
                    <h4 style="margin:24px 0 16px">Ultimas Liquidaciones</h4>
                    <table style="width:100%;border-collapse:collapse">
                        <thead>
                            <tr style="border-bottom:2px solid var(--e360-border)">
                                <th style="text-align:left;padding:12px;color:var(--e360-text-muted)">Periodo</th>
                                <th style="text-align:right;padding:12px;color:var(--e360-text-muted)">Bruto</th>
                                <th style="text-align:right;padding:12px;color:var(--e360-text-muted)">Deducciones</th>
                                <th style="text-align:right;padding:12px;color:var(--e360-text-muted)">Neto</th>
                            </tr>
                        </thead>
                        <tbody>
                            \${payroll.slice(0, 12).map(p => \`
                                <tr style="border-bottom:1px solid var(--e360-border)">
                                    <td style="padding:12px">\${p.period || p.month + '/' + p.year}</td>
                                    <td style="padding:12px;text-align:right">$\${(p.grossAmount || p.gross || 0).toLocaleString()}</td>
                                    <td style="padding:12px;text-align:right;color:var(--e360-accent-red)">-$\${(p.totalDeductions || p.deductions || 0).toLocaleString()}</td>
                                    <td style="padding:12px;text-align:right;font-weight:700;color:var(--e360-accent-green)">$\${(p.netAmount || p.net || 0).toLocaleString()}</td>
                                </tr>
                            \`).join('')}
                        </tbody>
                    </table>
                \` : ''}
            </div>
        \`;
    }

    // =========================================================================
    // HELPERS
    // =========================================================================
    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    }

    // =========================================================================
    // REGISTRO DEL MODULO
    // =========================================================================
    if (typeof window.ModuleManager !== 'undefined') {
        window.ModuleManager.register(MODULE_KEY, { init, render });
    } else {
        window.Employee360Module = { init, render };
    }

    console.log('[E360] Modulo Employee 360 Enterprise v3.1 cargado');
})();
`;

// Escribir archivo
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Frontend employee-360.js reconstruido exitosamente!');
console.log('Version: Enterprise v3.1');
console.log('Archivo:', filePath);
