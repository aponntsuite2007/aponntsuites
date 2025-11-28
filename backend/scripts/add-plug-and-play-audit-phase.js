/**
 * Script para agregar la fase de Auditoría de Cadena de Dependencias (Plug & Play)
 * al engineering-metadata.js
 *
 * Ejecutar: node scripts/add-plug-and-play-audit-phase.js
 */

const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, '..', 'engineering-metadata.js');

// Nueva fase a agregar
const newPhase = {
    plugAndPlayDependencyAudit: {
        name: "Auditoría de Cadena de Dependencias - Sistema Plug & Play Inteligente",
        status: "IN_PROGRESS",
        startDate: "2025-11-27",
        estimatedCompletion: "2025-12-15",
        progress: 5,
        priority: "CRITICAL",
        lastUpdated: new Date().toISOString(),
        completedTasks: 0,
        totalTasks: 15,
        visionDocument: "backend/docs/VISION-SISTEMA-INTELIGENTE-PLUG-AND-PLAY.md",
        philosophy: {
            principle1: "DATO ÚNICO (Single Source of Truth) - Un dato se define en UN SOLO lugar",
            principle2: "PLUG & PLAY - Si módulo existe datos fluyen, si no hay fallback manual",
            principle3: "PARAMETRIZACIÓN INTELIGENTE - RRHH parametriza UNA VEZ, se replica automáticamente",
            principle4: "OLLAMA COMO POTENCIADOR - IA sugiere, valida, completa en cada eslabón"
        },
        tasks: [
            {
                id: "PP-1",
                name: "Auditar panel-administrativo: Creación de Empresa",
                description: "Verificar:\n- ¿Se puede asignar PAÍS a la empresa?\n- ¿Se puede definir si tiene/no tiene sucursales?\n- ¿Se pueden seleccionar MÓDULOS contratados?\n- ¿Se asigna CALENDARIO por defecto según país?",
                done: false,
                assignedTo: "Claude session",
                dependencies: [],
                estimatedEffort: "2-3 horas",
                auditType: "infraestructure",
                expectedOutput: "Lista de campos faltantes/existentes en companies"
            },
            {
                id: "PP-2",
                name: "Auditar módulo Sucursales (company_branches)",
                description: "Verificar:\n- ¿Heredan PAÍS de empresa o pueden definir propio? (multi-país)\n- ¿Tienen CALENDARIO asignable?\n- ¿Tienen PLANTILLA DE LIQUIDACIÓN default?",
                done: false,
                assignedTo: "Claude session",
                dependencies: ["PP-1"],
                estimatedEffort: "2-3 horas",
                auditType: "infraestructure"
            },
            {
                id: "PP-3",
                name: "Auditar módulo Turnos (shifts)",
                description: "Verificar:\n- ¿Hay turnos definidos con horarios?\n- ¿Tienen CALENDARIO asociado (días que aplica el turno)?\n- ¿Calculan HORAS NOCTURNAS automáticamente (21:00-06:00)?\n- ¿Definen tolerancia entrada/salida para llegadas tarde?\n- ¿Se pueden asignar a usuarios correctamente?",
                done: false,
                assignedTo: "Claude session",
                dependencies: ["PP-2"],
                estimatedEffort: "3-4 horas",
                auditType: "laboral"
            },
            {
                id: "PP-4",
                name: "Auditar ficha de Usuario (users)",
                description: "Verificar campos CRÍTICOS para liquidación:\n- ¿Tiene campo TURNO asignado? (shift_id o user_shift_assignments)\n- ¿Tiene campo CATEGORÍA SALARIAL?\n- ¿Tiene campo CONVENIO? (descriptivo)\n- ¿Tiene campo PLANTILLA DE LIQUIDACIÓN asignada?\n- ¿Tiene campo ROL para herencia de configuraciones?",
                done: false,
                assignedTo: "Claude session",
                dependencies: ["PP-3"],
                estimatedEffort: "3-4 horas",
                auditType: "employee"
            },
            {
                id: "PP-5",
                name: "Auditar módulo Asistencia (attendance)",
                description: "Verificar cálculos AUTOMÁTICOS:\n- ¿Calcula HORAS TRABAJADAS?\n- ¿Detecta HORAS EXTRAS (50% y 100%)?\n- ¿Detecta HORAS NOCTURNAS?\n- ¿Detecta LLEGADAS TARDE vs turno asignado?\n- ¿Tiene FALLBACK para justificar ausencias si no hay módulo médico?",
                done: false,
                assignedTo: "Claude session",
                dependencies: ["PP-4"],
                estimatedEffort: "4-5 horas",
                auditType: "operativo"
            },
            {
                id: "PP-6",
                name: "Auditar módulo Dashboard Médico",
                description: "Verificar flujo completo:\n- ¿Está implementado?\n- ¿Tiene flujo de APROBACIÓN de certificados?\n- ¿Los certificados aprobados JUSTIFICAN ausencias automáticamente?\n- ¿La justificación es DATO ÚNICO o está duplicada?",
                done: false,
                assignedTo: "Claude session",
                dependencies: ["PP-5"],
                estimatedEffort: "3-4 horas",
                auditType: "novedades"
            },
            {
                id: "PP-7",
                name: "Implementar FALLBACK: Justificación manual en Asistencia",
                description: "Si empresa NO tiene módulo médico contratado:\n- Agregar campo is_justified en attendance\n- Agregar campo absence_reason\n- Agregar UI para que RRHH justifique manualmente\n- Asegurar que liquidación LEE de este campo (DATO ÚNICO)",
                done: false,
                assignedTo: "Claude session",
                dependencies: ["PP-6"],
                estimatedEffort: "4-5 horas",
                auditType: "fallback"
            },
            {
                id: "PP-8",
                name: "Auditar Plantillas de Liquidación (payroll_templates)",
                description: "Verificar:\n- ¿Existen PLANTILLAS de conceptos?\n- ¿Se pueden asignar por PAÍS → EMPRESA → SUCURSAL → ROL → USUARIO?\n- ¿Hay herencia correcta?\n- ¿Tiene CONCEPTOS definidos (haberes, deducciones)?",
                done: false,
                assignedTo: "Claude session",
                dependencies: ["PP-7"],
                estimatedEffort: "3-4 horas",
                auditType: "rrhh"
            },
            {
                id: "PP-9",
                name: "Implementar asignación de Plantilla por ROL",
                description: "Nuevo campo: role_payroll_template_id\n- Cada ROL puede tener plantilla default asignada\n- Usuario hereda de rol si no tiene específica\n- UI en configuración de roles para asignar plantilla",
                done: false,
                assignedTo: "Claude session",
                dependencies: ["PP-8"],
                estimatedEffort: "4-5 horas",
                auditType: "feature"
            },
            {
                id: "PP-10",
                name: "Auditar Convenios Colectivos (labor_agreements)",
                description: "Verificar que sean DESCRIPTIVOS:\n- ¿Se asignan a ROLES?\n- ¿Se pueden override por USUARIO?\n- ¿Son solo etiquetas para mostrar en recibos?\n- ¿Los CÁLCULOS vienen de la PLANTILLA, no del convenio?",
                done: false,
                assignedTo: "Claude session",
                dependencies: ["PP-9"],
                estimatedEffort: "2-3 horas",
                auditType: "rrhh"
            },
            {
                id: "PP-11",
                name: "Auditar motor de Liquidación (PayrollCalculatorService)",
                description: "Verificar que VALIDE cadena antes de ejecutar:\n- ¿Verifica que usuario tiene PLANTILLA?\n- ¿Verifica que tiene TURNO asignado?\n- ¿Verifica que tiene CATEGORÍA?\n- ¿Lee ASISTENCIA correctamente?\n- ¿Lee AUSENCIAS JUSTIFICADAS de fuente única?\n- ¿ALERTA si falta dato crítico?",
                done: false,
                assignedTo: "Claude session",
                dependencies: ["PP-10"],
                estimatedEffort: "5-6 horas",
                auditType: "liquidacion"
            },
            {
                id: "PP-12",
                name: "Implementar Pre-Validación de Liquidación",
                description: "Antes de liquidar, sistema debe:\n1. Verificar TODOS los empleados a liquidar\n2. Generar reporte de DATOS FALTANTES por empleado\n3. NO permitir liquidar si hay datos críticos faltantes\n4. Mostrar UI con checklist de validación\n5. Permitir corregir datos antes de reintentar",
                done: false,
                assignedTo: "Claude session",
                dependencies: ["PP-11"],
                estimatedEffort: "6-8 horas",
                auditType: "feature"
            },
            {
                id: "PP-13",
                name: "Integrar Ollama en puntos críticos",
                description: "Agregar sugerencias IA en:\n- Creación de empresa: sugerir calendario según país\n- Asignación de turno: sugerir según historial del empleado\n- Pre-liquidación: alertar anomalías (horas extras excesivas, patrones)\n- Post-liquidación: reportar inconsistencias vs mes anterior",
                done: false,
                assignedTo: "Claude session",
                dependencies: ["PP-12"],
                estimatedEffort: "8-10 horas",
                auditType: "ia"
            },
            {
                id: "PP-14",
                name: "Documentar circuitos rotos y fallbacks implementados",
                description: "Generar documento final con:\n- Lista de todos los módulos auditados\n- Estado de cada eslabón de la cadena\n- Fallbacks implementados\n- Datos duplicados eliminados\n- Sugerencias de Ollama activas",
                done: false,
                assignedTo: "Claude session",
                dependencies: ["PP-13"],
                estimatedEffort: "3-4 horas",
                auditType: "documentacion"
            },
            {
                id: "PP-15",
                name: "Test E2E: Liquidación completa de 10 empleados",
                description: "Probar flujo completo:\n1. Crear empresa con país ARG\n2. Crear turnos con calendario\n3. Crear 10 usuarios con diferentes configuraciones\n4. Generar asistencias de 1 mes\n5. Agregar ausencias (justificadas y no)\n6. Ejecutar liquidación\n7. Verificar que NO hay errores\n8. Verificar que cálculos son correctos",
                done: false,
                assignedTo: "Claude session",
                dependencies: ["PP-14"],
                estimatedEffort: "6-8 horas",
                auditType: "testing"
            }
        ],
        dependencies: ["medicalAdvancedSalarySystem", "phase4_testing_auditor"],
        files: [
            "backend/docs/VISION-SISTEMA-INTELIGENTE-PLUG-AND-PLAY.md",
            "src/services/PayrollCalculatorService.js",
            "src/routes/payrollRoutes.js",
            "public/js/modules/payroll-liquidation.js",
            "public/js/modules/users.js",
            "public/js/modules/attendance.js"
        ],
        estimatedEffort: "60-80 horas totales",
        notes: [
            "Este roadmap audita TODOS los módulos que intervienen en liquidación",
            "Cada auditoría genera lista de datos faltantes/existentes",
            "Se implementan FALLBACKS donde corresponda",
            "Se eliminan DATOS DUPLICADOS (Single Source of Truth)",
            "Ollama potencia cada eslabón de la cadena",
            "Documento de visión: backend/docs/VISION-SISTEMA-INTELIGENTE-PLUG-AND-PLAY.md"
        ]
    }
};

async function addPhaseToMetadata() {
    try {
        console.log('📖 Leyendo engineering-metadata.js...');
        let content = fs.readFileSync(metadataPath, 'utf8');

        // Buscar la sección roadmap y agregar la nueva fase
        const roadmapStart = content.indexOf('"roadmap": {');
        if (roadmapStart === -1) {
            console.error('❌ No se encontró la sección roadmap');
            return;
        }

        // Encontrar el siguiente objeto después de roadmap: {
        const insertPoint = content.indexOf('{', roadmapStart + 10) + 1;

        // Crear el string de la nueva fase
        const newPhaseString = `
    "plugAndPlayDependencyAudit": ${JSON.stringify(newPhase.plugAndPlayDependencyAudit, null, 6).replace(/\n/g, '\n    ')},`;

        // Insertar la nueva fase
        content = content.slice(0, insertPoint) + newPhaseString + content.slice(insertPoint);

        // Actualizar lastUpdated del proyecto
        const today = new Date().toISOString();
        content = content.replace(
            /"lastUpdated": "[^"]+"/,
            `"lastUpdated": "${today}"`
        );

        // Agregar a latestChanges
        const latestChangesMatch = content.match(/"latestChanges": \[/);
        if (latestChangesMatch) {
            const insertIndex = content.indexOf(latestChangesMatch[0]) + latestChangesMatch[0].length;
            const newChange = `
      "🎯 PLUG & PLAY AUDIT: Nueva fase crítica - Auditoría de Cadena de Dependencias para Liquidación Inteligente (2025-11-27)",
      "📋 VISION DOC: backend/docs/VISION-SISTEMA-INTELIGENTE-PLUG-AND-PLAY.md - Filosofía Single Source of Truth + Fallbacks",
      "✅ 15 tareas de auditoría definidas: Empresa → Sucursal → Turnos → Usuario → Asistencia → Médico → RRHH → Liquidación",`;
            content = content.slice(0, insertIndex) + newChange + content.slice(insertIndex);
        }

        console.log('💾 Guardando cambios...');
        fs.writeFileSync(metadataPath, content, 'utf8');

        console.log('✅ Fase agregada exitosamente!');
        console.log('📄 Documento de visión: backend/docs/VISION-SISTEMA-INTELIGENTE-PLUG-AND-PLAY.md');
        console.log('📊 Nueva fase: plugAndPlayDependencyAudit (15 tareas)');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

addPhaseToMetadata();
