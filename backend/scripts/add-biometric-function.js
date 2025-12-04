#!/usr/bin/env node
/**
 * Script para agregar la funcion renderBiometricTimelineHTML al employee-360.js
 */
const fs = require('fs');

const filePath = 'C:/Bio/sistema_asistencia_biometrico/backend/public/js/modules/employee-360.js';

const biometricFunction = `
    /** ANALISIS BIOMETRICO CRONOLOGICO - Correlacion con eventos (datos ya existen de fichajes) */
    function renderBiometricTimelineHTML(report) {
        const biometric = report.biometricAnalysis || report.completeUserData?.biometricEmotional || {};
        const emotionalHistory = biometric.emotionalHistory || [];
        const correlatedEvents = biometric.correlatedEvents || [];
        const correlations = biometric.correlations || [];
        const metrics = biometric.metrics || {};
        const alerts = biometric.alerts || [];
        if (emotionalHistory.length === 0 && correlatedEvents.length === 0) return '';
        let timelineItems = [];
        emotionalHistory.slice(0, 50).forEach(bio => {
            const fatigueScore = parseFloat(bio.fatigue_score) || 0;
            const sadness = parseFloat(bio.emotion_sadness) || 0;
            const anger = parseFloat(bio.emotion_anger) || 0;
            const happiness = parseFloat(bio.emotion_happiness) || 0;
            if (fatigueScore > 0.5 || sadness > 0.3 || anger > 0.25 || happiness > 0.7) {
                let mainIndicator='', iconClass='', color='', severity='normal';
                if (fatigueScore > 0.7) { mainIndicator='Fatiga Alta'; iconClass='fas fa-bed'; color='#e74c3c'; severity='high'; }
                else if (fatigueScore > 0.5) { mainIndicator='Fatiga Moderada'; iconClass='fas fa-battery-half'; color='#f39c12'; severity='medium'; }
                else if (sadness > 0.4) { mainIndicator='Bajo Animo'; iconClass='fas fa-frown'; color='#9b59b6'; severity='medium'; }
                else if (anger > 0.35) { mainIndicator='Irritabilidad'; iconClass='fas fa-angry'; color='#e74c3c'; severity='medium'; }
                else if (happiness > 0.7) { mainIndicator='Estado Positivo'; iconClass='fas fa-smile-beam'; color='#27ae60'; severity='positive'; }
                else if (bio.dominant_emotion) { mainIndicator=bio.dominant_emotion; iconClass='fas fa-meh'; color='#3498db'; }
                if (mainIndicator) timelineItems.push({ date: bio.scan_timestamp, type: 'biometric', icon: iconClass, color, title: mainIndicator, details: { fatigue: (fatigueScore*100).toFixed(0)+'%', happiness: (happiness*100).toFixed(0)+'%' }, severity });
            }
        });
        correlatedEvents.forEach(evt => {
            let iconClass='', color='', title='';
            if (evt.event_type==='medical_leave') { iconClass='fas fa-hospital'; color='#e74c3c'; title='Licencia Medica'; }
            else if (evt.event_type==='sanction') { iconClass='fas fa-exclamation-triangle'; color='#c0392b'; title='Sancion: '+(evt.category||'Disciplinaria'); }
            else if (evt.event_type==='vacation') { iconClass='fas fa-umbrella-beach'; color='#16a085'; title='Vacaciones'; }
            else if (evt.event_type==='absence') { iconClass='fas fa-user-slash'; color='#7f8c8d'; title='Ausencia'; }
            else { iconClass='fas fa-calendar-alt'; color='#95a5a6'; title=evt.event_type; }
            timelineItems.push({ date: evt.event_date, type: 'event', icon: iconClass, color, title, subtitle: evt.description||'', days: evt.days });
        });
        timelineItems.sort((a, b) => new Date(b.date) - new Date(a.date));
        const correlationsHTML = correlations.length > 0 ? '<div class="alert alert-info" style="background:rgba(52,152,219,0.1);border:1px solid #3498db;margin-bottom:15px;"><h6><i class="fas fa-link"></i> CORRELACIONES DETECTADAS POR IA</h6>'+correlations.slice(0,5).map(c=>'<div style="margin:8px 0;padding:8px;background:rgba(255,255,255,0.5);border-radius:4px;"><strong>'+(c.event.event_type==='medical_leave'?'Licencia Medica':c.event.event_type)+'</strong> ('+formatDate(c.event.event_date)+') <span class="badge badge-'+(c.significance==='high'?'danger':'warning')+'">'+(c.significance==='high'?'Alta':'Media')+' correlacion</span>'+(c.insight?'<br><small><i class="fas fa-brain"></i> '+c.insight+'</small>':'')+'</div>').join('')+'</div>' : '';
        const alertsHTML = alerts.length > 0 ? '<div class="alert alert-warning" style="margin-bottom:15px;"><h6><i class="fas fa-exclamation-circle"></i> ALERTAS BIOMETRICAS</h6>'+alerts.map(a=>'<div style="margin:5px 0;"><span class="badge badge-'+(a.severity==='warning'?'danger':'warning')+'">'+a.type+'</span> '+a.message+(a.recommendation?'<br><small class="text-info"><i class="fas fa-lightbulb"></i> '+a.recommendation+'</small>':'')+'</div>').join('')+'</div>' : '';
        const metricsHTML = metrics.totalSamples > 0 ? '<div class="row text-center mb-3"><div class="col-3"><div class="card card-body p-2" style="background:'+(metrics.avgFatigue>0.5?'rgba(231,76,60,0.1)':'rgba(46,204,113,0.1)')+';"><small class="text-muted">Fatiga Prom.</small><h4 class="mb-0" style="color:'+(metrics.avgFatigue>0.5?'#e74c3c':'#27ae60')+';">'+(metrics.avgFatigue*100).toFixed(0)+'%</h4></div></div><div class="col-3"><div class="card card-body p-2" style="background:rgba(52,152,219,0.1);"><small class="text-muted">Felicidad Prom.</small><h4 class="mb-0" style="color:#3498db;">'+(metrics.avgHappiness*100).toFixed(0)+'%</h4></div></div><div class="col-3"><div class="card card-body p-2"><small class="text-muted">Emocion Dominante</small><h6 class="mb-0">'+(metrics.dominantEmotions?.[0]?.emotion||'N/A')+'</h6></div></div><div class="col-3"><div class="card card-body p-2"><small class="text-muted">Tendencia</small><h6 class="mb-0">'+(metrics.trend==='increasing_fatigue'?'<i class="fas fa-arrow-up text-danger"></i> Fatiga':metrics.trend==='decreasing_fatigue'?'<i class="fas fa-arrow-down text-success"></i> Mejora':'<i class="fas fa-minus text-muted"></i> Estable')+'</h6></div></div></div>' : '';
        return '<div class="card mb-4"><div class="card-header" style="background:linear-gradient(135deg,#8e44ad,#9b59b6);color:white;"><i class="fas fa-brain"></i> ANALISIS BIOMETRICO CRONOLOGICO - Correlacion de Eventos <span class="badge badge-light float-right">'+emotionalHistory.length+' registros | '+correlatedEvents.length+' eventos</span></div><div class="card-body">'+metricsHTML+alertsHTML+correlationsHTML+'<div class="biometric-timeline" style="max-height:400px;overflow-y:auto;">'+(timelineItems.length>0?timelineItems.slice(0,30).map(item=>'<div class="timeline-row" style="display:flex;align-items:flex-start;margin-bottom:15px;padding:10px;background:'+(item.type==='event'?'rgba(255,235,235,0.5)':'rgba(240,248,255,0.5)')+';border-radius:8px;border-left:4px solid '+item.color+';"><div style="min-width:50px;text-align:center;margin-right:15px;"><div style="width:40px;height:40px;border-radius:50%;background:'+item.color+';color:white;display:flex;align-items:center;justify-content:center;margin:0 auto 5px;"><i class="'+item.icon+'"></i></div><small class="text-muted">'+formatDate(item.date)+'</small></div><div style="flex:1;"><strong>'+item.title+'</strong>'+(item.subtitle?'<br><small>'+item.subtitle+'</small>':'')+(item.type==='biometric'&&item.details?'<div class="mt-1"><span class="badge badge-secondary">Fatiga: '+item.details.fatigue+'</span> <span class="badge badge-info">Felicidad: '+item.details.happiness+'</span></div>':'')+(item.type==='event'&&item.days?'<span class="badge badge-dark">'+item.days+' dias</span>':'')+'</div>'+(item.severity==='high'?'<span class="badge badge-danger">ATENCION</span>':'')+'</div>').join(''):'<p class="text-muted text-center">No hay datos biometricos disponibles.</p>')+'</div><div class="text-center mt-3"><small class="text-muted"><i class="fas fa-info-circle"></i> Los datos provienen de analisis facial en cada fichaje. La correlacion con eventos permite detectar patrones predictivos.</small></div></div></div>';
    }

`;

// Leer archivo
let content = fs.readFileSync(filePath, 'utf8');

// Verificar si ya existe la funcion
if (content.includes('renderBiometricTimelineHTML')) {
    console.log('La funcion renderBiometricTimelineHTML ya existe en el archivo.');
    process.exit(0);
}

// Buscar donde insertar (antes de renderOverviewTab)
const searchPattern = '    function renderOverviewTab(report) {';
const insertIndex = content.indexOf(searchPattern);

if (insertIndex === -1) {
    console.log('No se encontro renderOverviewTab');
    process.exit(1);
}

// Insertar la nueva funcion
content = content.slice(0, insertIndex) + biometricFunction + content.slice(insertIndex);

// Guardar
fs.writeFileSync(filePath, content, 'utf8');
console.log('Funcion renderBiometricTimelineHTML agregada exitosamente!');
