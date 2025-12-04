/**
 * Script para agregar tabs de Biometrico y Reemplazos al Employee 360
 * Sin romper el codigo existente
 */
const fs = require('fs');
const f = 'C:/Bio/sistema_asistencia_biometrico/backend/public/js/modules/employee-360.js';
let c = fs.readFileSync(f, 'utf8');

// 1. Agregar CSS enterprise para las nuevas tabs
const cssToAdd = `
            /* === ENTERPRISE TABS: BIOMETRICO Y REEMPLAZOS === */
            .e360-biometric-card {
                background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
                border: 1px solid rgba(139, 92, 246, 0.3);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 16px;
            }
            .e360-correlation-card {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(249, 115, 22, 0.1));
                border: 1px solid rgba(239, 68, 68, 0.3);
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
                text-transform: uppercase;
            }
            .e360-correlation-high { background: #ef4444; color: white; }
            .e360-correlation-medium { background: #f59e0b; color: black; }
            .e360-metric-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 16px;
                margin-bottom: 20px;
            }
            .e360-metric-box {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                padding: 16px;
                text-align: center;
            }
            .e360-metric-value { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
            .e360-metric-label { font-size: 12px; opacity: 0.7; }
            .e360-replacement-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                margin-bottom: 8px;
            }
            .e360-replacement-score {
                padding: 6px 14px;
                border-radius: 20px;
                font-weight: 700;
                font-size: 14px;
            }
            .e360-score-high { background: #22c55e; color: white; }
            .e360-score-medium { background: #f59e0b; color: black; }
            .e360-score-low { background: #6b7280; color: white; }
            .e360-alert-danger {
                background: rgba(239, 68, 68, 0.15);
                border-left: 4px solid #ef4444;
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 16px;
            }
            .e360-no-data {
                text-align: center;
                padding: 40px;
                color: #9ca3af;
                font-style: italic;
            }
`;

if (!c.includes('e360-biometric-card')) {
    // Buscar donde termina el CSS existente (antes del cierre del template string)
    const cssEndPattern = /(\s*\`;[\s\n]*document\.head\.appendChild\(style\);)/;
    if (cssEndPattern.test(c)) {
        c = c.replace(cssEndPattern, cssToAdd + '$1');
        console.log('OK: CSS enterprise agregado');
    } else {
        console.log('WARN: No se encontro patron para agregar CSS');
    }
}

// 2. Agregar los tabs en el HTML (despues de tab-ai-analysis)
const tabButtonsToAdd = `
                        <button class="e360-tab-button" data-tab="biometric">Biometrico</button>
                        <button class="e360-tab-button" data-tab="compatibility">Reemplazos</button>`;

const tabDivsToAdd = `
                <div id="tab-biometric" class="e360-tab-content" style="display: none;"></div>
                <div id="tab-compatibility" class="e360-tab-content" style="display: none;"></div>`;

// Agregar botones de tab
if (!c.includes('data-tab="biometric"')) {
    c = c.replace(
        /data-tab="ai-analysis">.*?<\/button>/g,
        match => match + tabButtonsToAdd
    );
    console.log('OK: Botones de tab agregados');
}

// Agregar divs de contenido
if (!c.includes('tab-biometric')) {
    c = c.replace(
        /<div id="tab-ai-analysis" class="e360-tab-content" style="display: none;"><\/div>/g,
        match => match + tabDivsToAdd
    );
    console.log('OK: Divs de contenido agregados');
}

// 3. Agregar funciones de render (antes del cierre de la IIFE)
const renderFunctions = `

    // =========================================================================
    // RENDER TAB: BIOMETRICO EMOCIONAL (Enterprise v3.1)
    // =========================================================================
    function renderBiometricTab(report) {
        const container = document.getElementById('tab-biometric');
        if (!container) return;

        const bio = report.biometricAnalysis || {};

        if (!bio.hasModule && (!bio.emotionalHistory || bio.emotionalHistory.length === 0)) {
            container.innerHTML = '<div class="e360-no-data">No hay datos biometricos disponibles para este empleado.</div>';
            return;
        }

        const metrics = bio.metrics || {};
        const correlations = bio.correlations || [];
        const alerts = bio.alerts || [];

        let alertsHTML = alerts.map(a => \`
            <div class="e360-alert-danger">
                <strong>\${a.type || 'Alerta'}</strong>
                <p style="margin:4px 0">\${a.message}</p>
                <small style="opacity:0.7">\${a.recommendation || ''}</small>
            </div>
        \`).join('');

        let correlationsHTML = correlations.length > 0 ? correlations.map(cor => \`
            <div class="e360-correlation-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                    <span class="e360-correlation-significance e360-correlation-\${cor.significance || 'medium'}">\${(cor.significance || 'medio').toUpperCase()}</span>
                    <span style="font-size:12px;opacity:0.7">\${cor.event?.event_date ? new Date(cor.event.event_date).toLocaleDateString('es-AR') : 'N/A'}</span>
                </div>
                <div style="font-weight:600;margin-bottom:8px">\${cor.event?.event_type === 'medical_leave' ? 'Licencia Medica' : cor.event?.event_type === 'sanction' ? 'Sancion' : cor.event?.event_type || 'Evento'}</div>
                <p style="font-size:13px;opacity:0.8">\${cor.insight || 'Sin detalle'}</p>
                <div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap">
                    <span style="background:rgba(255,255,255,0.1);padding:4px 12px;border-radius:20px;font-size:12px">Fatiga: \${((cor.avgFatigue || 0) * 100).toFixed(0)}%</span>
                    <span style="background:rgba(255,255,255,0.1);padding:4px 12px;border-radius:20px;font-size:12px">Estres: \${((cor.avgStress || 0) * 100).toFixed(0)}%</span>
                    <span style="background:rgba(255,255,255,0.1);padding:4px 12px;border-radius:20px;font-size:12px">\${cor.priorScansCount || 0} scans previos</span>
                </div>
            </div>
        \`).join('') : '<div class="e360-no-data">No se detectaron correlaciones significativas</div>';

        const fatigueColor = (metrics.avgFatigue || 0) > 0.6 ? '#ef4444' : (metrics.avgFatigue || 0) > 0.4 ? '#f59e0b' : '#22c55e';
        const stressColor = (metrics.avgStress || 0) > 0.6 ? '#ef4444' : '#22c55e';

        container.innerHTML = \`
            <div class="e360-section">
                <h3 style="margin-bottom:16px">Analisis Biometrico Emocional</h3>
                \${alertsHTML}

                <div class="e360-metric-grid">
                    <div class="e360-metric-box">
                        <div class="e360-metric-value" style="color:\${fatigueColor}">\${((metrics.avgFatigue || 0) * 100).toFixed(0)}%</div>
                        <div class="e360-metric-label">Fatiga Promedio</div>
                    </div>
                    <div class="e360-metric-box">
                        <div class="e360-metric-value" style="color:#3b82f6">\${((metrics.avgHappiness || 0) * 100).toFixed(0)}%</div>
                        <div class="e360-metric-label">Felicidad Promedio</div>
                    </div>
                    <div class="e360-metric-box">
                        <div class="e360-metric-value" style="color:\${stressColor}">\${((metrics.avgStress || 0) * 100).toFixed(0)}%</div>
                        <div class="e360-metric-label">Estres Promedio</div>
                    </div>
                    <div class="e360-metric-box">
                        <div class="e360-metric-value">\${metrics.avgWellness?.toFixed(0) || 'N/A'}</div>
                        <div class="e360-metric-label">Wellness Score</div>
                    </div>
                    <div class="e360-metric-box">
                        <div class="e360-metric-value">\${metrics.totalSamples || 0}</div>
                        <div class="e360-metric-label">Total Muestras</div>
                    </div>
                    <div class="e360-metric-box">
                        <div class="e360-metric-value">\${metrics.trend === 'increasing_fatigue' ? '&#8599;' : metrics.trend === 'decreasing_fatigue' ? '&#8600;' : '&#8594;'}</div>
                        <div class="e360-metric-label">Tendencia Fatiga</div>
                    </div>
                </div>

                \${metrics.dominantEmotions && metrics.dominantEmotions.length > 0 ? \`
                    <h4 style="margin:20px 0 12px">Emociones Dominantes</h4>
                    <div style="display:flex;gap:12px;flex-wrap:wrap">
                        \${metrics.dominantEmotions.slice(0, 5).map(e => \`
                            <span style="background:rgba(139,92,246,0.2);padding:8px 16px;border-radius:20px;font-size:13px">
                                \${e.emotion}: \${e.percent}%
                            </span>
                        \`).join('')}
                    </div>
                \` : ''}

                <h4 style="margin:24px 0 16px">Correlaciones Biometrico-Eventos</h4>
                <p style="opacity:0.7;font-size:13px;margin-bottom:16px">
                    El sistema analiza patrones biometricos previos a eventos significativos para detectar correlaciones predictivas.
                </p>
                \${correlationsHTML}
            </div>
        \`;
    }

    // =========================================================================
    // RENDER TAB: COMPATIBILIDAD Y REEMPLAZOS (Enterprise v3.1)
    // =========================================================================
    function renderCompatibilityTab(report) {
        const container = document.getElementById('tab-compatibility');
        if (!container) return;

        const tc = report.taskCompatibility || {};

        if (!tc.hasModule && (!tc.replacements || tc.replacements.length === 0) && (!tc.canReplace || tc.canReplace.length === 0)) {
            container.innerHTML = '<div class="e360-no-data">El modulo de compatibilidad de tareas no esta disponible o no hay datos.</div>';
            return;
        }

        const replacements = tc.replacements || [];
        const canReplace = tc.canReplace || [];

        let replacementsHTML = replacements.length > 0 ? replacements.map(r => {
            const scoreClass = r.compatibilityScore >= 80 ? 'high' : r.compatibilityScore >= 50 ? 'medium' : 'low';
            return \`
                <div class="e360-replacement-item">
                    <div>
                        <div style="font-weight:600">\${r.coverName || 'N/A'}</div>
                        <div style="font-size:12px;opacity:0.7">\${r.position || 'Sin cargo'}</div>
                        <div style="font-size:11px;opacity:0.5;margin-top:4px">\${r.successfulCoverages || 0} coberturas exitosas</div>
                    </div>
                    <span class="e360-replacement-score e360-score-\${scoreClass}">\${r.compatibilityScore || 0}%</span>
                </div>
            \`;
        }).join('') : '<div class="e360-no-data">No hay reemplazos configurados</div>';

        let canReplaceHTML = canReplace.length > 0 ? canReplace.map(r => {
            const scoreClass = r.compatibilityScore >= 80 ? 'high' : r.compatibilityScore >= 50 ? 'medium' : 'low';
            return \`
                <div class="e360-replacement-item">
                    <div>
                        <div style="font-weight:600">\${r.primaryName || 'N/A'}</div>
                        <div style="font-size:12px;opacity:0.7">\${r.position || 'Sin cargo'}</div>
                    </div>
                    <span class="e360-replacement-score e360-score-\${scoreClass}">\${r.compatibilityScore || 0}%</span>
                </div>
            \`;
        }).join('') : '<div class="e360-no-data">Este empleado no esta asignado como reemplazo</div>';

        container.innerHTML = \`
            <div class="e360-section">
                <h3 style="margin-bottom:16px">Compatibilidad de Tareas y Reemplazos</h3>

                \${tc.hasNoReplacement ? \`
                    <div class="e360-alert-danger">
                        <strong>ALERTA: SIN REEMPLAZO</strong>
                        <p style="margin:4px 0">\${tc.alert || 'Este empleado no tiene reemplazo configurado. Riesgo operativo alto.'}</p>
                    </div>
                \` : ''}

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
                    <div>
                        <h4 style="margin-bottom:16px">Quienes pueden REEMPLAZAR a este empleado</h4>
                        \${replacementsHTML}
                    </div>
                    <div>
                        <h4 style="margin-bottom:16px">A quienes puede REEMPLAZAR este empleado</h4>
                        \${canReplaceHTML}
                    </div>
                </div>

                <div style="margin-top:24px;padding:16px;background:rgba(255,255,255,0.05);border-radius:8px">
                    <p style="font-size:13px;opacity:0.7;margin:0">
                        La compatibilidad se calcula en base a habilidades, experiencia, rendimiento en coberturas anteriores y disponibilidad.
                        Un score mayor a 80% indica alta compatibilidad para cobertura de tareas.
                    </p>
                </div>
            </div>
        \`;
    }

`;

// Buscar donde agregar las funciones (antes del registro del modulo)
if (!c.includes('renderBiometricTab')) {
    const registerPattern = /(\/\/ ={10,}[\s\n]*\/\/ REGISTRO DEL MODULO)/;
    if (registerPattern.test(c)) {
        c = c.replace(registerPattern, renderFunctions + '\n    $1');
        console.log('OK: Funciones de render agregadas');
    } else {
        console.log('WARN: No se encontro patron para agregar funciones');
    }
}

// 4. Agregar llamadas a las funciones de render en displayReport
const renderCallsToAdd = `
            renderBiometricTab(report);
            renderCompatibilityTab(report);`;

// Buscar donde se llaman las otras funciones de render
if (!c.includes('renderBiometricTab(report)')) {
    // Buscar patron como "renderTimelineSection(report)" o similar
    const renderPattern = /(renderAiAnalysisSection\(report\);)/;
    if (renderPattern.test(c)) {
        c = c.replace(renderPattern, '$1' + renderCallsToAdd);
        console.log('OK: Llamadas a render agregadas');
    } else {
        // Intentar otro patron
        const altPattern = /(setupTabNavigation\(\);)/;
        if (altPattern.test(c)) {
            c = c.replace(altPattern, renderCallsToAdd + '\n            $1');
            console.log('OK: Llamadas a render agregadas (alt)');
        } else {
            console.log('WARN: No se encontro patron para llamadas a render');
        }
    }
}

fs.writeFileSync(f, c);
console.log('\\n=== COMPLETADO ===');
console.log('Tabs de Biometrico y Reemplazos agregadas al frontend');
