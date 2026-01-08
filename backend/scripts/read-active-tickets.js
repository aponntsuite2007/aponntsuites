/**
 * 🎯 READ ACTIVE DEV TICKETS
 *
 * Script helper para leer dev tickets activos desde engineering-metadata.js
 *
 * Uso:
 *   node backend/scripts/read-active-tickets.js
 *   node backend/scripts/read-active-tickets.js --id=DEV-E2E-ADVANCED-001
 *   node backend/scripts/read-active-tickets.js --status=IN_PROGRESS
 *   node backend/scripts/read-active-tickets.js --resume
 */

const fs = require('fs');
const path = require('path');

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Parse args
const args = process.argv.slice(2);
const options = {};

args.forEach(arg => {
    if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        options[key] = value || true;
    }
});

// Leer engineering-metadata.js
function readMetadata() {
    try {
        const metadataPath = path.join(__dirname, '../engineering-metadata.js');

        // Cargar el módulo directamente con require
        // Limpiar caché para obtener versión fresca
        delete require.cache[metadataPath];
        const metadata = require(metadataPath);

        return metadata.activeDevTickets || {};
    } catch (error) {
        console.error(`${colors.red}❌ Error leyendo metadata:${colors.reset}`, error.message);
        return {};
    }
}

// Formatear prioridad con color
function formatPriority(priority) {
    const colorMap = {
        HIGH: colors.red,
        MEDIUM: colors.yellow,
        LOW: colors.cyan
    };
    const color = colorMap[priority] || colors.reset;
    return `${color}${priority}${colors.reset}`;
}

// Formatear status con color
function formatStatus(status) {
    const colorMap = {
        PLANNED: colors.cyan,
        IN_PROGRESS: colors.yellow,
        BLOCKED: colors.red,
        COMPLETED: colors.green
    };
    const color = colorMap[status] || colors.reset;
    return `${color}${status}${colors.reset}`;
}

// Mostrar lista de tickets
function showTicketList(tickets, filterStatus = null) {
    const ticketsArray = Object.values(tickets);

    if (ticketsArray.length === 0) {
        console.log(`${colors.yellow}📋 No hay dev tickets creados aún${colors.reset}\n`);
        return;
    }

    // Filtrar por status
    const filtered = filterStatus
        ? ticketsArray.filter(t => t.status === filterStatus)
        : ticketsArray;

    if (filtered.length === 0) {
        console.log(`${colors.yellow}📋 No hay tickets con status: ${filterStatus}${colors.reset}\n`);
        return;
    }

    // Ordenar por prioridad y fecha
    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    filtered.sort((a, b) => {
        const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    console.log(`\n${colors.bright}${colors.cyan}========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}🎯 DEV TICKETS ACTIVOS${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}\n`);

    filtered.forEach((ticket, idx) => {
        console.log(`${colors.bright}${idx + 1}. ${ticket.title}${colors.reset}`);
        console.log(`   ID: ${colors.blue}${ticket.id}${colors.reset}`);
        console.log(`   Status: ${formatStatus(ticket.status)}`);
        console.log(`   Priority: ${formatPriority(ticket.priority)}`);
        console.log(`   Progress: ${colors.green}${ticket.metrics.progressPercent}%${colors.reset} (${ticket.metrics.completedTasks}/${ticket.metrics.totalTasks} tareas)`);
        console.log(`   Created: ${new Date(ticket.createdAt).toLocaleString('es-ES')}\n`);
    });

    // Estadísticas
    console.log(`${colors.bright}${colors.magenta}📊 ESTADÍSTICAS${colors.reset}`);
    console.log(`Total tickets: ${ticketsArray.length}`);
    console.log(`PLANNED: ${colors.cyan}${ticketsArray.filter(t => t.status === 'PLANNED').length}${colors.reset}`);
    console.log(`IN_PROGRESS: ${colors.yellow}${ticketsArray.filter(t => t.status === 'IN_PROGRESS').length}${colors.reset}`);
    console.log(`BLOCKED: ${colors.red}${ticketsArray.filter(t => t.status === 'BLOCKED').length}${colors.reset}`);
    console.log(`COMPLETED: ${colors.green}${ticketsArray.filter(t => t.status === 'COMPLETED').length}${colors.reset}\n`);
}

// Mostrar detalle de un ticket
function showTicketDetail(ticket) {
    console.log(`\n${colors.bright}${colors.cyan}========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}🎯 ${ticket.title}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}\n`);

    console.log(`${colors.bright}ID:${colors.reset} ${ticket.id}`);
    console.log(`${colors.bright}Status:${colors.reset} ${formatStatus(ticket.status)}`);
    console.log(`${colors.bright}Priority:${colors.reset} ${formatPriority(ticket.priority)}`);
    console.log(`${colors.bright}Created:${colors.reset} ${new Date(ticket.createdAt).toLocaleString('es-ES')}`);
    console.log(`${colors.bright}Progress:${colors.reset} ${colors.green}${ticket.metrics.progressPercent}%${colors.reset} (${ticket.metrics.completedTasks}/${ticket.metrics.totalTasks} tareas)\n`);

    console.log(`${colors.bright}${colors.yellow}📋 OBJETIVO:${colors.reset}`);
    console.log(ticket.objective.trim() + '\n');

    // Checklist
    const completedTasks = ticket.checklist.filter(c => c.done);
    const pendingTasks = ticket.checklist.filter(c => !c.done);

    if (completedTasks.length > 0) {
        console.log(`${colors.bright}${colors.green}✅ TAREAS COMPLETADAS (${completedTasks.length}):${colors.reset}`);
        completedTasks.forEach(t => {
            console.log(`  [x] ${colors.green}${t.phase}${colors.reset} - ${t.task}`);
            if (t.completedAt) {
                console.log(`      ✓ ${new Date(t.completedAt).toLocaleString('es-ES')}`);
            }
        });
        console.log('');
    }

    if (pendingTasks.length > 0) {
        console.log(`${colors.bright}${colors.yellow}⏳ TAREAS PENDIENTES (${pendingTasks.length}):${colors.reset}`);
        pendingTasks.forEach((t, idx) => {
            const isCurrent = t.id === ticket.currentStep;
            const prefix = isCurrent ? `${colors.red}🔴${colors.reset}` : '  ';
            const suffix = isCurrent ? ` ${colors.red}← ESTÁS AQUÍ${colors.reset}` : '';
            console.log(`${prefix} [ ] ${colors.yellow}${t.phase}${colors.reset} - ${t.task}${suffix}`);
        });
        console.log('');
    } else {
        console.log(`${colors.green}🎉 Todas las tareas completadas!${colors.reset}\n`);
    }

    // Próximos pasos
    if (ticket.nextSteps.length > 0) {
        console.log(`${colors.bright}${colors.cyan}🚀 PRÓXIMOS PASOS:${colors.reset}`);
        ticket.nextSteps.forEach((step, idx) => {
            console.log(`  ${idx + 1}. ${step}`);
        });
        console.log('');
    }

    // Archivos involucrados
    if (ticket.filesInvolved.length > 0) {
        console.log(`${colors.bright}${colors.magenta}📁 ARCHIVOS INVOLUCRADOS:${colors.reset}`);
        ticket.filesInvolved.forEach(f => {
            console.log(`  - ${f}`);
        });
        console.log('');
    }

    // Bloqueadores
    const activeBlockers = ticket.context.blockers.filter(b => !b.resolved);
    if (activeBlockers.length > 0) {
        console.log(`${colors.bright}${colors.red}⚠️ BLOQUEADORES ACTIVOS:${colors.reset}`);
        activeBlockers.forEach(b => {
            console.log(`  🔴 ${b.description}`);
            console.log(`     Desde: ${new Date(b.addedAt).toLocaleString('es-ES')}`);
        });
        console.log('');
    }

    // Contexto
    console.log(`${colors.bright}${colors.blue}📊 CONTEXTO:${colors.reset}`);
    console.log(`  Líneas implementadas: ${ticket.context.totalLinesImplemented || 0}`);
    console.log(`  Tiempo estimado restante: ${ticket.context.estimatedTimeRemaining || 'No estimado'}`);
    if (ticket.context.dependencies.external.length > 0) {
        console.log(`  Dependencias externas: ${ticket.context.dependencies.external.join(', ')}`);
    }
    if (ticket.context.dependencies.internal.length > 0) {
        console.log(`  Dependencias internas: ${ticket.context.dependencies.internal.join(', ')}`);
    }
    console.log('');

    // Historial de sesiones
    if (ticket.sessionHistory.length > 0) {
        console.log(`${colors.bright}${colors.magenta}📜 HISTORIAL DE SESIONES:${colors.reset}`);
        ticket.sessionHistory.forEach(s => {
            const isActive = !s.endedAt;
            const statusIcon = isActive ? '🟢' : '⚪';
            console.log(`  ${statusIcon} ${s.sessionId} ${isActive ? colors.green + '(EN CURSO)' + colors.reset : ''}`);
            console.log(`     Inicio: ${new Date(s.startedAt).toLocaleString('es-ES')}`);
            if (s.endedAt) {
                console.log(`     Fin: ${new Date(s.endedAt).toLocaleString('es-ES')}`);
            }
            if (s.tasksCompleted.length > 0) {
                console.log(`     Tareas: ${s.tasksCompleted.join(', ')}`);
            }
            console.log(`     Líneas escritas: ${s.linesWritten}`);
            if (s.summary) {
                console.log(`     Resumen: ${s.summary}`);
            }
            console.log('');
        });
    }
}

// Mostrar resumen ejecutivo
function showResume(tickets) {
    const ticketsArray = Object.values(tickets);

    if (ticketsArray.length === 0) {
        console.log(`${colors.yellow}📋 No hay dev tickets creados aún${colors.reset}\n`);
        return;
    }

    // Encontrar ticket IN_PROGRESS con mayor prioridad
    const inProgress = ticketsArray
        .filter(t => t.status === 'IN_PROGRESS')
        .sort((a, b) => {
            const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
            return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        });

    if (inProgress.length === 0) {
        console.log(`${colors.yellow}📋 No hay tickets IN_PROGRESS. Sugerencia: Revisa tickets PLANNED${colors.reset}\n`);
        showTicketList(tickets, 'PLANNED');
        return;
    }

    const current = inProgress[0];

    console.log(`\n${colors.bright}${colors.green}========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.green}🎯 RESUMEN EJECUTIVO - DEV TICKETS${colors.reset}`);
    console.log(`${colors.bright}${colors.green}========================================${colors.reset}\n`);

    console.log(`${colors.bright}🔴 TICKET ACTUAL:${colors.reset} ${current.title}`);
    console.log(`${colors.bright}ID:${colors.reset} ${colors.blue}${current.id}${colors.reset}`);
    console.log(`${colors.bright}Priority:${colors.reset} ${formatPriority(current.priority)}`);
    console.log(`${colors.bright}Progress:${colors.reset} ${colors.green}${current.metrics.progressPercent}%${colors.reset}\n`);

    // Próxima tarea
    const nextTask = current.checklist.find(c => c.id === current.currentStep);
    if (nextTask) {
        console.log(`${colors.bright}${colors.red}🔴 PRÓXIMA TAREA:${colors.reset}`);
        console.log(`   ${colors.yellow}${nextTask.phase}${colors.reset} - ${nextTask.task}\n`);
    }

    // Próximos pasos
    if (current.nextSteps.length > 0) {
        console.log(`${colors.bright}${colors.cyan}🚀 PRÓXIMOS PASOS:${colors.reset}`);
        current.nextSteps.slice(0, 3).forEach((step, idx) => {
            console.log(`   ${idx + 1}. ${step}`);
        });
        console.log('');
    }

    // Bloqueadores
    const activeBlockers = current.context.blockers.filter(b => !b.resolved);
    if (activeBlockers.length > 0) {
        console.log(`${colors.bright}${colors.red}⚠️ BLOQUEADORES:${colors.reset}`);
        activeBlockers.forEach(b => {
            console.log(`   🔴 ${b.description}`);
        });
        console.log('');
    }

    console.log(`${colors.bright}💡 COMANDOS ÚTILES:${colors.reset}`);
    console.log(`   Ver detalle completo: ${colors.cyan}node backend/scripts/read-active-tickets.js --id=${current.id}${colors.reset}`);
    console.log(`   Ver todos los tickets: ${colors.cyan}node backend/scripts/read-active-tickets.js${colors.reset}\n`);
}

// Main
function main() {
    const tickets = readMetadata();

    if (options.id) {
        // Mostrar detalle de ticket específico
        const ticket = tickets[options.id];
        if (!ticket) {
            console.error(`${colors.red}❌ Ticket no encontrado: ${options.id}${colors.reset}\n`);
            process.exit(1);
        }
        showTicketDetail(ticket);
    } else if (options.resume) {
        // Mostrar resumen ejecutivo
        showResume(tickets);
    } else if (options.status) {
        // Mostrar tickets filtrados por status
        showTicketList(tickets, options.status);
    } else {
        // Mostrar lista de todos los tickets
        showTicketList(tickets);
    }
}

main();
