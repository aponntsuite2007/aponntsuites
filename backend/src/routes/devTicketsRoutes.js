const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { auth } = require('../middleware/auth');

// 📁 Path al archivo de metadata
const METADATA_PATH = path.join(__dirname, '../../engineering-metadata.js');

/**
 * Helper: Leer engineering-metadata.js y extraer activeDevTickets
 */
async function readDevTickets() {
    try {
        // Cargar el módulo directamente con require
        // Limpiar caché para obtener versión fresca
        const absolutePath = path.resolve(METADATA_PATH);
        delete require.cache[absolutePath];
        const metadata = require(absolutePath);

        return metadata.activeDevTickets || {};
    } catch (error) {
        console.error('❌ Error leyendo dev tickets:', error.message);
        return {};
    }
}

/**
 * Helper: Escribir activeDevTickets de vuelta a engineering-metadata.js
 */
async function writeDevTickets(tickets) {
    try {
        let content = await fs.readFile(METADATA_PATH, 'utf-8');

        // Buscar si ya existe la sección activeDevTickets
        const activeDevTicketsRegex = /activeDevTickets:\s*\{[\s\S]*?\n\s*\}/;
        const ticketsString = `activeDevTickets: ${JSON.stringify(tickets, null, 2)}`;

        if (activeDevTicketsRegex.test(content)) {
            // Reemplazar existente
            content = content.replace(activeDevTicketsRegex, ticketsString);
        } else {
            // Agregar antes del cierre del objeto principal
            const insertPosition = content.lastIndexOf('};');
            if (insertPosition !== -1) {
                content = content.slice(0, insertPosition) +
                         `  ,\n\n  // 🎯 DEVELOPMENT TICKETS SYSTEM - Tracking de desarrollo humano/Claude\n  ${ticketsString}\n` +
                         content.slice(insertPosition);
            }
        }

        await fs.writeFile(METADATA_PATH, content, 'utf-8');
        console.log('✅ Dev tickets escritos en engineering-metadata.js');
        return true;
    } catch (error) {
        console.error('❌ Error escribiendo dev tickets:', error.message);
        return false;
    }
}

/**
 * 🎯 GET /api/dev-tickets
 * Obtener todos los dev tickets activos
 */
router.get('/', auth, async (req, res) => {
    try {
        console.log('🎫 [DEV TICKETS] GET /api/dev-tickets');

        const tickets = await readDevTickets();
        const ticketsArray = Object.values(tickets);

        // Filtrar por status si se especifica
        const { status } = req.query;
        const filtered = status
            ? ticketsArray.filter(t => t.status === status)
            : ticketsArray;

        // Ordenar por prioridad y fecha
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        filtered.sort((a, b) => {
            const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Estadísticas
        const stats = {
            total: ticketsArray.length,
            byStatus: {
                PLANNED: ticketsArray.filter(t => t.status === 'PLANNED').length,
                IN_PROGRESS: ticketsArray.filter(t => t.status === 'IN_PROGRESS').length,
                BLOCKED: ticketsArray.filter(t => t.status === 'BLOCKED').length,
                COMPLETED: ticketsArray.filter(t => t.status === 'COMPLETED').length
            },
            byPriority: {
                HIGH: ticketsArray.filter(t => t.priority === 'HIGH').length,
                MEDIUM: ticketsArray.filter(t => t.priority === 'MEDIUM').length,
                LOW: ticketsArray.filter(t => t.priority === 'LOW').length
            }
        };

        res.json({
            success: true,
            data: filtered,
            stats
        });

    } catch (error) {
        console.error('❌ [DEV TICKETS] Error en GET /:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener dev tickets',
            details: error.message
        });
    }
});

/**
 * 🎯 GET /api/dev-tickets/:id
 * Obtener detalles de un dev ticket específico
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🎫 [DEV TICKETS] GET /api/dev-tickets/${id}`);

        const tickets = await readDevTickets();
        const ticket = tickets[id];

        if (!ticket) {
            return res.status(404).json({
                success: false,
                error: 'Dev ticket no encontrado',
                ticketId: id
            });
        }

        res.json({
            success: true,
            data: ticket
        });

    } catch (error) {
        console.error('❌ [DEV TICKETS] Error en GET /:id:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener dev ticket',
            details: error.message
        });
    }
});

/**
 * 🎯 POST /api/dev-tickets
 * Crear un nuevo dev ticket
 *
 * Body:
 * - title: string (requerido)
 * - objective: string (requerido)
 * - priority: HIGH | MEDIUM | LOW (default: MEDIUM)
 * - checklist: array de {id, phase, task, done}
 * - filesInvolved: array de strings
 * - nextSteps: array de strings
 */
router.post('/', auth, async (req, res) => {
    try {
        const { title, objective, priority = 'MEDIUM', checklist = [], filesInvolved = [], nextSteps = [] } = req.body;

        console.log('🎫 [DEV TICKETS] POST /api/dev-tickets');

        if (!title || !objective) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere title y objective'
            });
        }

        // Generar ID único
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9).toUpperCase();
        const id = `DEV-${timestamp}-${random}`;

        // Crear ticket
        const ticket = {
            id,
            title,
            status: 'PLANNED',
            priority,
            createdAt: new Date().toISOString(),
            objective,
            checklist: checklist.map((item, idx) => ({
                id: item.id || `CK-${idx + 1}`,
                phase: item.phase || 'General',
                task: item.task,
                done: item.done || false,
                completedAt: item.done ? new Date().toISOString() : null
            })),
            currentStep: checklist.find(c => !c.done)?.id || null,
            nextSteps,
            filesInvolved,
            context: {
                totalLinesImplemented: 0,
                estimatedTimeRemaining: '',
                blockers: [],
                dependencies: {
                    external: [],
                    internal: []
                }
            },
            sessionHistory: [],
            metrics: {
                totalTasks: checklist.length,
                completedTasks: checklist.filter(c => c.done).length,
                progressPercent: checklist.length > 0 ? Math.round((checklist.filter(c => c.done).length / checklist.length) * 100) : 0
            }
        };

        // Leer tickets existentes
        const tickets = await readDevTickets();
        tickets[id] = ticket;

        // Escribir de vuelta
        await writeDevTickets(tickets);

        console.log(`✅ Dev ticket creado: ${id}`);

        res.json({
            success: true,
            message: 'Dev ticket creado exitosamente',
            data: ticket
        });

    } catch (error) {
        console.error('❌ [DEV TICKETS] Error en POST /:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear dev ticket',
            details: error.message
        });
    }
});

/**
 * 🎯 PATCH /api/dev-tickets/:id
 * Actualizar un dev ticket
 *
 * Body:
 * - status: PLANNED | IN_PROGRESS | BLOCKED | COMPLETED
 * - updateChecklist: { checkId, done }
 * - addSessionHistory: { summary, tasksCompleted, linesWritten }
 * - updateMetrics: { totalLinesImplemented, estimatedTimeRemaining }
 * - addBlocker: string
 * - removeBlocker: string
 */
router.patch('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        console.log(`🎫 [DEV TICKETS] PATCH /api/dev-tickets/${id}`, updates);

        const tickets = await readDevTickets();
        const ticket = tickets[id];

        if (!ticket) {
            return res.status(404).json({
                success: false,
                error: 'Dev ticket no encontrado',
                ticketId: id
            });
        }

        // Actualizar status
        if (updates.status) {
            ticket.status = updates.status;

            if (updates.status === 'COMPLETED' && !ticket.completedAt) {
                ticket.completedAt = new Date().toISOString();
            }
        }

        // Actualizar checklist
        if (updates.updateChecklist) {
            const { checkId, done } = updates.updateChecklist;
            const checkItem = ticket.checklist.find(c => c.id === checkId);

            if (checkItem) {
                checkItem.done = done;
                checkItem.completedAt = done ? new Date().toISOString() : null;

                // Recalcular métricas
                ticket.metrics.completedTasks = ticket.checklist.filter(c => c.done).length;
                ticket.metrics.progressPercent = Math.round((ticket.metrics.completedTasks / ticket.metrics.totalTasks) * 100);

                // Actualizar currentStep al próximo pendiente
                const nextPending = ticket.checklist.find(c => !c.done);
                ticket.currentStep = nextPending ? nextPending.id : null;
            }
        }

        // Agregar entrada al session history
        if (updates.addSessionHistory) {
            const sessionId = `sess-${new Date().toISOString().split('T')[0]}-${ticket.sessionHistory.length + 1}`;

            ticket.sessionHistory.push({
                sessionId,
                startedAt: new Date().toISOString(),
                endedAt: updates.addSessionHistory.endedAt || null,
                tasksCompleted: updates.addSessionHistory.tasksCompleted || [],
                linesWritten: updates.addSessionHistory.linesWritten || 0,
                summary: updates.addSessionHistory.summary || ''
            });
        }

        // Actualizar métricas de contexto
        if (updates.updateMetrics) {
            Object.assign(ticket.context, updates.updateMetrics);
        }

        // Agregar blocker
        if (updates.addBlocker) {
            ticket.context.blockers.push({
                description: updates.addBlocker,
                addedAt: new Date().toISOString(),
                resolved: false
            });

            if (ticket.status !== 'BLOCKED') {
                ticket.status = 'BLOCKED';
            }
        }

        // Remover blocker
        if (updates.removeBlocker !== undefined) {
            const blockerIndex = updates.removeBlocker;
            if (ticket.context.blockers[blockerIndex]) {
                ticket.context.blockers[blockerIndex].resolved = true;
                ticket.context.blockers[blockerIndex].resolvedAt = new Date().toISOString();
            }

            // Si no hay más blockers sin resolver, cambiar status
            const unresolvedBlockers = ticket.context.blockers.filter(b => !b.resolved);
            if (unresolvedBlockers.length === 0 && ticket.status === 'BLOCKED') {
                ticket.status = 'IN_PROGRESS';
            }
        }

        // Actualizar nextSteps
        if (updates.nextSteps) {
            ticket.nextSteps = updates.nextSteps;
        }

        // Guardar cambios
        tickets[id] = ticket;
        await writeDevTickets(tickets);

        console.log(`✅ Dev ticket ${id} actualizado`);

        res.json({
            success: true,
            message: 'Dev ticket actualizado exitosamente',
            data: ticket
        });

    } catch (error) {
        console.error('❌ [DEV TICKETS] Error en PATCH /:id:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar dev ticket',
            details: error.message
        });
    }
});

/**
 * 🎯 GET /api/dev-tickets/:id/resume
 * Generar prompt de resumen para Claude Code
 *
 * Este endpoint genera un markdown completo con:
 * - Estado actual del ticket
 * - Qué se completó
 * - Qué falta
 * - Próximos pasos
 * - Archivos involucrados
 * - Contexto completo
 */
router.get('/:id/resume', auth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📝 [DEV TICKETS] GET /api/dev-tickets/${id}/resume`);

        const tickets = await readDevTickets();
        const ticket = tickets[id];

        if (!ticket) {
            return res.status(404).json({
                success: false,
                error: 'Dev ticket no encontrado',
                ticketId: id
            });
        }

        // Generar markdown de resumen
        const completedTasks = ticket.checklist.filter(c => c.done);
        const pendingTasks = ticket.checklist.filter(c => !c.done);

        const resume = `# 🎯 DEV TICKET RESUME - ${ticket.id}

## 📋 Información General

**Título**: ${ticket.title}
**Status**: ${ticket.status}
**Prioridad**: ${ticket.priority}
**Creado**: ${new Date(ticket.createdAt).toLocaleString('es-ES')}
**Progreso**: ${ticket.metrics.progressPercent}% (${ticket.metrics.completedTasks}/${ticket.metrics.totalTasks} tareas)

---

## 🎯 Objetivo

${ticket.objective}

---

## ✅ Tareas Completadas (${completedTasks.length})

${completedTasks.length > 0 ? completedTasks.map(t =>
    `- [x] **${t.phase}** - ${t.task}${t.completedAt ? ` ✓ ${new Date(t.completedAt).toLocaleString('es-ES')}` : ''}`
).join('\n') : '_Ninguna tarea completada aún_'}

---

## ⏳ Tareas Pendientes (${pendingTasks.length})

${pendingTasks.length > 0 ? pendingTasks.map((t, idx) =>
    `${idx === 0 ? '**→ PRÓXIMA TAREA:**\n' : ''}${idx === 0 ? '🔴 ' : '- '}[ ] **${t.phase}** - ${t.task} ${t.id === ticket.currentStep ? '← **ESTÁS AQUÍ**' : ''}`
).join('\n') : '_Todas las tareas completadas! 🎉_'}

---

## 🚀 Próximos Pasos

${ticket.nextSteps.length > 0 ? ticket.nextSteps.map((step, idx) =>
    `${idx + 1}. ${step}`
).join('\n') : '_No hay próximos pasos definidos_'}

---

## 📁 Archivos Involucrados

${ticket.filesInvolved.length > 0 ? ticket.filesInvolved.map(f => `- \`${f}\``).join('\n') : '_No hay archivos especificados_'}

---

## 📊 Contexto Adicional

**Líneas Implementadas**: ${ticket.context.totalLinesImplemented || 0}
**Tiempo Estimado Restante**: ${ticket.context.estimatedTimeRemaining || 'No estimado'}

### 🔗 Dependencias

**Externas**: ${ticket.context.dependencies.external.length > 0 ? ticket.context.dependencies.external.join(', ') : 'Ninguna'}
**Internas**: ${ticket.context.dependencies.internal.length > 0 ? ticket.context.dependencies.internal.join(', ') : 'Ninguna'}

### ⚠️ Bloqueadores

${ticket.context.blockers.length > 0 ? ticket.context.blockers.filter(b => !b.resolved).map(b =>
    `- 🔴 ${b.description} (desde ${new Date(b.addedAt).toLocaleString('es-ES')})`
).join('\n') || '_Todos los bloqueadores resueltos_' : '_Sin bloqueadores_'}

---

## 📜 Historial de Sesiones

${ticket.sessionHistory.length > 0 ? ticket.sessionHistory.map(s => `
### ${s.sessionId}
- **Inicio**: ${new Date(s.startedAt).toLocaleString('es-ES')}
- **Fin**: ${s.endedAt ? new Date(s.endedAt).toLocaleString('es-ES') : '**EN CURSO**'}
- **Tareas Completadas**: ${s.tasksCompleted.length > 0 ? s.tasksCompleted.join(', ') : 'Ninguna'}
- **Líneas Escritas**: ${s.linesWritten}
- **Resumen**: ${s.summary || 'Sin resumen'}
`).join('\n') : '_No hay historial de sesiones aún_'}

---

## 🎯 INSTRUCCIONES PARA CLAUDE CODE

### ¿Qué hacer ahora?

1. **Revisar la próxima tarea pendiente** (marcada con 🔴 arriba)
2. **Leer los archivos involucrados** para entender el contexto
3. **Ejecutar la tarea** siguiendo los próximos pasos
4. **Al completar**, actualizar el ticket con:
   \`\`\`bash
   PATCH /api/dev-tickets/${ticket.id}
   {
     "updateChecklist": { "checkId": "${ticket.currentStep}", "done": true },
     "addSessionHistory": {
       "summary": "Descripción de lo que se hizo",
       "tasksCompleted": ["${ticket.currentStep}"],
       "linesWritten": 123
     }
   }
   \`\`\`

### ¿Bloqueado?

Si encuentras un impedimento:
\`\`\`bash
PATCH /api/dev-tickets/${ticket.id}
{
  "addBlocker": "Descripción del blocker"
}
\`\`\`

---

**Archivo generado**: ${new Date().toISOString()}
**Ticket ID**: ${ticket.id}
`;

        res.json({
            success: true,
            data: {
                ticketId: id,
                resume,
                filename: `dev-ticket-resume-${id}.md`
            }
        });

    } catch (error) {
        console.error('❌ [DEV TICKETS] Error en GET /:id/resume:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar resumen',
            details: error.message
        });
    }
});

module.exports = router;
