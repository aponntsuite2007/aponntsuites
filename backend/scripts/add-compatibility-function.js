#!/usr/bin/env node
/**
 * Script para agregar la funcion renderTaskCompatibilityHTML al employee-360.js
 */
const fs = require('fs');

const filePath = 'C:/Bio/sistema_asistencia_biometrico/backend/public/js/modules/employee-360.js';

const compatibilityFunction = `
    /** COMPATIBILIDAD DE TAREAS Y REEMPLAZOS - Quien puede cubrir este puesto */
    function renderTaskCompatibilityHTML(report) {
        const compatibility = report.taskCompatibility || report.completeUserData?.taskCompatibility || {};
        const replacements = compatibility.replacements || [];
        const canReplace = compatibility.canReplace || [];
        const hasModule = compatibility.hasModule !== false;
        if (!hasModule) return '';
        const hasReplacements = replacements.length > 0;
        const alertLevel = hasReplacements ? (replacements.some(r => r.compatibilityScore >= 80) ? 'success' : 'warning') : 'danger';
        return '<div class="card mb-4"><div class="card-header" style="background:linear-gradient(135deg,#2980b9,#3498db);color:white;"><i class="fas fa-users-cog"></i> COMPATIBILIDAD DE TAREAS Y REEMPLAZOS <span class="badge badge-light float-right">'+(hasReplacements?replacements.length+' reemplazos disponibles':'SIN REEMPLAZO')+'</span></div><div class="card-body">'+(hasReplacements?'':'<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> <strong>ALERTA:</strong> Este puesto NO tiene reemplazos asignados. Si el empleado se ausenta, no hay quien cubra sus tareas. Considere asignar personal de respaldo.</div>')+'<div class="row"><div class="col-md-6"><h6><i class="fas fa-user-friends"></i> Quienes pueden REEMPLAZAR a este empleado:</h6>'+(replacements.length>0?'<div class="list-group">'+replacements.slice(0,5).map(r=>'<div class="list-group-item d-flex justify-content-between align-items-center"><div><strong>'+r.coverName+'</strong><br><small class="text-muted">'+r.position+'</small>'+(r.coverableTasks&&r.coverableTasks.length>0?'<br><small>Tareas: '+r.coverableTasks.slice(0,3).join(', ')+'</small>':'')+'</div><div class="text-right"><span class="badge badge-'+(r.compatibilityScore>=80?'success':r.compatibilityScore>=50?'warning':'secondary')+' badge-pill">'+(r.compatibilityScore||0)+'%</span><br><small>'+r.successfulCoverages+' coberturas</small></div></div>').join('')+'</div>':'<p class="text-muted">No hay reemplazos configurados</p>')+'</div><div class="col-md-6"><h6><i class="fas fa-hands-helping"></i> A quienes puede REEMPLAZAR este empleado:</h6>'+(canReplace.length>0?'<div class="list-group">'+canReplace.slice(0,5).map(r=>'<div class="list-group-item d-flex justify-content-between align-items-center"><div><strong>'+r.primaryName+'</strong><br><small class="text-muted">'+r.position+'</small></div><span class="badge badge-'+(r.compatibilityScore>=80?'success':r.compatibilityScore>=50?'warning':'secondary')+' badge-pill">'+(r.compatibilityScore||0)+'%</span></div>').join('')+'</div>':'<p class="text-muted">Este empleado no esta asignado como reemplazo</p>')+'</div></div><div class="text-center mt-3"><small class="text-muted"><i class="fas fa-info-circle"></i> La compatibilidad se calcula en base a habilidades, experiencia y rendimiento en coberturas anteriores. Un score mayor a 80% indica alta compatibilidad.</small></div></div></div>';
    }

`;

// Leer archivo
let content = fs.readFileSync(filePath, 'utf8');

// Verificar si ya existe la funcion
if (content.includes('renderTaskCompatibilityHTML')) {
    console.log('La funcion renderTaskCompatibilityHTML ya existe en el archivo.');
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
content = content.slice(0, insertIndex) + compatibilityFunction + content.slice(insertIndex);

// Guardar
fs.writeFileSync(filePath, content, 'utf8');
console.log('Funcion renderTaskCompatibilityHTML agregada exitosamente!');
