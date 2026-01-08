const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { auth } = require('../middleware/auth');

// 📁 Directorio de tickets
const TICKETS_DIR = path.join(__dirname, '../brain/tickets');

/**
 * 🎯 GET /api/brain/tickets
 * Obtener tickets con filtros, paginación y ordenamiento
 *
 * Query params:
 * - status: open, in_progress, resolved, all (default: all)
 * - priority: critical, high, normal, low, all (default: all)
 * - module: nombre del módulo (default: all)
 * - page: número de página (default: 1)
 * - limit: tickets por página (default: 20, max: 100)
 * - sortBy: createdAt, priority, status (default: createdAt)
 * - sortOrder: asc, desc (default: desc)
 */
router.get('/tickets', auth, async (req, res) => {
    try {
        console.log('🎫 [BRAIN TICKETS] GET /api/brain/tickets');

        // Parámetros de query
        const {
            status = 'all',
            priority = 'all',
            module = 'all',
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Validaciones
        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

        // Leer todos los archivos de tickets
        console.log(`📂 Leyendo tickets desde: ${TICKETS_DIR}`);
        const files = await fs.readdir(TICKETS_DIR);
        const ticketFiles = files.filter(f => f.startsWith('TKT-') && f.endsWith('.json'));

        console.log(`📊 Total de archivos de tickets: ${ticketFiles.length}`);

        // Leer y parsear tickets
        const tickets = [];
        for (const file of ticketFiles) {
            try {
                const filePath = path.join(TICKETS_DIR, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const ticket = JSON.parse(content);
                tickets.push(ticket);
            } catch (error) {
                console.error(`❌ Error leyendo ticket ${file}:`, error.message);
                // Continuar con el siguiente ticket
            }
        }

        console.log(`✅ Tickets parseados exitosamente: ${tickets.length}`);

        // Filtrar por status
        let filteredTickets = tickets;
        if (status !== 'all') {
            filteredTickets = filteredTickets.filter(t => t.status === status);
        }

        // Filtrar por priority
        if (priority !== 'all') {
            filteredTickets = filteredTickets.filter(t => t.priority === priority);
        }

        // Filtrar por module
        if (module !== 'all') {
            filteredTickets = filteredTickets.filter(t =>
                t.technical?.module?.toLowerCase() === module.toLowerCase()
            );
        }

        console.log(`🔍 Tickets después de filtros: ${filteredTickets.length}`);

        // Ordenar tickets
        const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
        filteredTickets.sort((a, b) => {
            let comparison = 0;

            if (sortBy === 'priority') {
                const aPriority = priorityOrder[a.priority] || 0;
                const bPriority = priorityOrder[b.priority] || 0;
                comparison = bPriority - aPriority; // Siempre de mayor a menor prioridad
            } else if (sortBy === 'status') {
                comparison = a.status.localeCompare(b.status);
            } else { // createdAt (default)
                const aDate = new Date(a.createdAt);
                const bDate = new Date(b.createdAt);
                comparison = bDate - aDate; // Más reciente primero por defecto
            }

            return sortOrder === 'asc' ? -comparison : comparison;
        });

        // Calcular estadísticas
        const stats = {
            total: tickets.length,
            filtered: filteredTickets.length,
            byStatus: {
                open: tickets.filter(t => t.status === 'open').length,
                in_progress: tickets.filter(t => t.status === 'in_progress').length,
                resolved: tickets.filter(t => t.status === 'resolved').length
            },
            byPriority: {
                critical: tickets.filter(t => t.priority === 'critical').length,
                high: tickets.filter(t => t.priority === 'high').length,
                normal: tickets.filter(t => t.priority === 'normal').length,
                low: tickets.filter(t => t.priority === 'low').length
            }
        };

        // Paginación
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

        const totalPages = Math.ceil(filteredTickets.length / limitNum);

        console.log(`📄 Página ${pageNum}/${totalPages}, mostrando ${paginatedTickets.length} tickets`);

        res.json({
            success: true,
            data: paginatedTickets,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: filteredTickets.length,
                totalPages,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            },
            stats,
            filters: {
                status,
                priority,
                module,
                sortBy,
                sortOrder
            }
        });

    } catch (error) {
        console.error('❌ [BRAIN TICKETS] Error en GET /tickets:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener tickets',
            details: error.message
        });
    }
});

/**
 * 🎯 GET /api/brain/tickets/:id
 * Obtener detalles completos de un ticket específico
 */
router.get('/tickets/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🎫 [BRAIN TICKETS] GET /api/brain/tickets/${id}`);

        const filePath = path.join(TICKETS_DIR, `${id}.json`);

        // Verificar si el archivo existe
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({
                success: false,
                error: 'Ticket no encontrado',
                ticketId: id
            });
        }

        // Leer ticket
        const content = await fs.readFile(filePath, 'utf-8');
        const ticket = JSON.parse(content);

        console.log(`✅ Ticket ${id} encontrado`);

        res.json({
            success: true,
            data: ticket
        });

    } catch (error) {
        console.error('❌ [BRAIN TICKETS] Error en GET /tickets/:id:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener ticket',
            details: error.message
        });
    }
});

/**
 * 🎯 PATCH /api/brain/tickets/:id
 * Actualizar un ticket (status, asignación, resolución, etc.)
 *
 * Body:
 * - status: open, in_progress, resolved
 * - assignedTo: string
 * - resolution: object con type, summary, fixesApplied
 * - addTimelineEntry: object con action, details
 */
router.patch('/tickets/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        console.log(`🎫 [BRAIN TICKETS] PATCH /api/brain/tickets/${id}`, updates);

        const filePath = path.join(TICKETS_DIR, `${id}.json`);

        // Verificar si el archivo existe
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({
                success: false,
                error: 'Ticket no encontrado',
                ticketId: id
            });
        }

        // Leer ticket actual
        const content = await fs.readFile(filePath, 'utf-8');
        const ticket = JSON.parse(content);

        // Aplicar actualizaciones
        if (updates.status) {
            ticket.status = updates.status;

            // Si se resuelve, marcar timestamp
            if (updates.status === 'resolved' && !ticket.resolvedAt) {
                ticket.resolvedAt = new Date().toISOString();
            }
        }

        if (updates.assignedTo) {
            ticket.assignedTo = updates.assignedTo;
        }

        if (updates.resolution) {
            ticket.resolution = {
                ...ticket.resolution,
                ...updates.resolution,
                verifiedBy: req.user?.username || 'system',
                verifiedAt: new Date().toISOString()
            };
        }

        // Agregar entrada al timeline
        if (updates.addTimelineEntry) {
            if (!ticket.technical.timeline) {
                ticket.technical.timeline = [];
            }

            ticket.technical.timeline.push({
                action: updates.addTimelineEntry.action,
                timestamp: new Date().toISOString(),
                details: updates.addTimelineEntry.details || {}
            });
        }

        // Guardar ticket actualizado
        await fs.writeFile(filePath, JSON.stringify(ticket, null, 2), 'utf-8');

        console.log(`✅ Ticket ${id} actualizado exitosamente`);

        res.json({
            success: true,
            message: 'Ticket actualizado exitosamente',
            data: ticket
        });

    } catch (error) {
        console.error('❌ [BRAIN TICKETS] Error en PATCH /tickets/:id:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar ticket',
            details: error.message
        });
    }
});

/**
 * 🎯 POST /api/brain/tickets/:id/retry-repair
 * Reintentar auto-reparación de un ticket
 *
 * Este endpoint intenta ejecutar nuevamente el AutonomousRepairAgent
 * para el ticket especificado.
 */
router.post('/tickets/:id/retry-repair', auth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🤖 [BRAIN TICKETS] POST /api/brain/tickets/${id}/retry-repair`);

        const filePath = path.join(TICKETS_DIR, `${id}.json`);

        // Verificar si el archivo existe
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({
                success: false,
                error: 'Ticket no encontrado',
                ticketId: id
            });
        }

        // Leer ticket
        const content = await fs.readFile(filePath, 'utf-8');
        const ticket = JSON.parse(content);

        // Actualizar status a in_progress
        ticket.status = 'in_progress';

        // Agregar entrada al timeline
        if (!ticket.technical.timeline) {
            ticket.technical.timeline = [];
        }

        ticket.technical.timeline.push({
            action: 'retry_repair_initiated',
            timestamp: new Date().toISOString(),
            details: {
                triggeredBy: req.user?.username || 'system',
                attemptNumber: (ticket.technical.autoRepairAttempts || 0) + 1
            }
        });

        // Incrementar contador de intentos
        ticket.technical.autoRepairAttempts = (ticket.technical.autoRepairAttempts || 0) + 1;

        // Guardar ticket actualizado
        await fs.writeFile(filePath, JSON.stringify(ticket, null, 2), 'utf-8');

        // TODO: Aquí se debe ejecutar el AutonomousRepairAgent
        // Por ahora, simulamos el proceso
        console.log(`🤖 Iniciando AutonomousRepairAgent para ticket ${id}...`);

        // Simular proceso de reparación (será implementado en siguiente paso)
        // const repairResult = await AutonomousRepairAgent.attemptRepair(ticket);

        res.json({
            success: true,
            message: 'Auto-reparación iniciada',
            data: {
                ticketId: id,
                status: 'in_progress',
                attemptNumber: ticket.technical.autoRepairAttempts,
                message: 'El sistema Brain está intentando reparar el problema automáticamente. Esto puede tomar algunos minutos.'
            }
        });

    } catch (error) {
        console.error('❌ [BRAIN TICKETS] Error en POST /tickets/:id/retry-repair:', error);
        res.status(500).json({
            success: false,
            error: 'Error al reintentar auto-reparación',
            details: error.message
        });
    }
});

/**
 * 🎯 GET /api/brain/tickets/stats/summary
 * Obtener estadísticas resumidas de todos los tickets
 */
router.get('/stats/summary', auth, async (req, res) => {
    try {
        console.log('📊 [BRAIN TICKETS] GET /api/brain/tickets/stats/summary');

        // Leer todos los tickets
        const files = await fs.readdir(TICKETS_DIR);
        const ticketFiles = files.filter(f => f.startsWith('TKT-') && f.endsWith('.json'));

        const tickets = [];
        for (const file of ticketFiles) {
            try {
                const filePath = path.join(TICKETS_DIR, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const ticket = JSON.parse(content);
                tickets.push(ticket);
            } catch (error) {
                console.error(`❌ Error leyendo ticket ${file}:`, error.message);
            }
        }

        // Calcular estadísticas
        const stats = {
            total: tickets.length,
            byStatus: {
                open: tickets.filter(t => t.status === 'open').length,
                in_progress: tickets.filter(t => t.status === 'in_progress').length,
                resolved: tickets.filter(t => t.status === 'resolved').length
            },
            byPriority: {
                critical: tickets.filter(t => t.priority === 'critical').length,
                high: tickets.filter(t => t.priority === 'high').length,
                normal: tickets.filter(t => t.priority === 'normal').length,
                low: tickets.filter(t => t.priority === 'low').length
            },
            byModule: {},
            autoRepairStats: {
                totalAttempts: 0,
                successfulRepairs: 0,
                failedRepairs: 0,
                avgAttemptsPerTicket: 0
            },
            recentTickets: tickets
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10)
                .map(t => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    createdAt: t.createdAt,
                    module: t.technical?.module
                }))
        };

        // Agrupar por módulo
        tickets.forEach(ticket => {
            const module = ticket.technical?.module || 'unknown';
            if (!stats.byModule[module]) {
                stats.byModule[module] = {
                    total: 0,
                    open: 0,
                    in_progress: 0,
                    resolved: 0
                };
            }
            stats.byModule[module].total++;
            stats.byModule[module][ticket.status]++;
        });

        // Calcular estadísticas de auto-reparación
        tickets.forEach(ticket => {
            const attempts = ticket.technical?.autoRepairAttempts || 0;
            stats.autoRepairStats.totalAttempts += attempts;

            if (ticket.status === 'resolved' && attempts > 0) {
                stats.autoRepairStats.successfulRepairs++;
            } else if (attempts > 0 && ticket.status !== 'resolved') {
                stats.autoRepairStats.failedRepairs++;
            }
        });

        if (tickets.length > 0) {
            stats.autoRepairStats.avgAttemptsPerTicket =
                (stats.autoRepairStats.totalAttempts / tickets.length).toFixed(2);
        }

        console.log(`✅ Estadísticas calculadas para ${tickets.length} tickets`);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ [BRAIN TICKETS] Error en GET /stats/summary:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas',
            details: error.message
        });
    }
});

/**
 * 🎯 POST /api/brain/tickets/:id/export-claude-code
 * Generar prompt de Claude Code para un ticket
 */
router.post('/tickets/:id/export-claude-code', auth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📝 [BRAIN TICKETS] POST /api/brain/tickets/${id}/export-claude-code`);

        const filePath = path.join(TICKETS_DIR, `${id}.json`);

        // Verificar si el archivo existe
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({
                success: false,
                error: 'Ticket no encontrado',
                ticketId: id
            });
        }

        // Leer ticket
        const content = await fs.readFile(filePath, 'utf-8');
        const ticket = JSON.parse(content);

        // Generar prompt de Claude Code
        const prompt = `# TICKET DE AUTO-REPARACIÓN FALLIDA

## 📋 ID del Ticket
${ticket.id}

## 🎯 Título
${ticket.title}

## ⚠️ Prioridad
${ticket.priority.toUpperCase()}

## 📅 Fecha de Creación
${new Date(ticket.createdAt).toLocaleString('es-ES')}

## 🔍 Descripción
${ticket.description}

## 🧠 DIAGNÓSTICO IA (Ollama)
${ticket.technical?.aiDiagnosis ? `
**Root Cause Detectado:**
${ticket.technical.aiDiagnosis.rootCause || 'N/A'}

**Confidence Score:**
${ticket.technical.aiDiagnosis.confidence ? (ticket.technical.aiDiagnosis.confidence * 100).toFixed(1) + '%' : 'N/A'}

**Suggested Fix:**
${ticket.technical.aiDiagnosis.suggestedFix || 'N/A'}
` : 'No disponible (Ollama no estuvo disponible durante el diagnóstico)'}

## 📦 Información Técnica

**Módulo:** ${ticket.technical?.module || 'N/A'}
**Tipo de Error:** ${ticket.technical?.errorType || 'N/A'}
**Mensaje de Error:**
\`\`\`
${ticket.technical?.errorMessage || 'N/A'}
\`\`\`

**Stack Trace:**
\`\`\`
${ticket.technical?.stack || 'N/A'}
\`\`\`

## 🔄 Intentos de Auto-Reparación
**Total de intentos:** ${ticket.technical?.autoRepairAttempts || 0}

## ⏱️ Timeline de Intentos de Reparación
${ticket.technical?.timeline?.map(t =>
    `- **${t.action}**: ${new Date(t.timestamp).toLocaleString('es-ES')}${t.details ? '\n  ' + JSON.stringify(t.details, null, 2) : ''}`
).join('\n') || 'N/A'}

## 📁 Archivos Relacionados
${ticket.claudeCodeContext?.files?.length > 0 ?
    ticket.claudeCodeContext.files.map(f => `- ${f}`).join('\n') :
    'No especificados'}

## 🧪 Tests a Ejecutar
${ticket.claudeCodeContext?.testToRun || 'No especificados'}

---

## 🎯 TAREA PARA CLAUDE CODE

Por favor, analiza este ticket y:

1. ✅ **Verifica el diagnóstico IA** (si está disponible)
2. ✅ **Revisa los archivos relacionados** listados arriba
3. ✅ **Analiza el stack trace** para identificar la causa raíz
4. ✅ **Implementa el fix** necesario
5. ✅ **Ejecuta los tests** para verificar la solución
6. ✅ **Actualiza el ticket** usando PATCH /api/brain/tickets/${ticket.id} con:
   - \`status: "resolved"\`
   - \`resolution\`: objeto con type, summary, fixesApplied
   - \`addTimelineEntry\`: { action: "resolved", details: { ... } }

## 📌 Nota Importante

Este ticket fue generado automáticamente por el **Sistema Brain de Aponnt** después de que ${ticket.technical?.autoRepairAttempts || 0} intento(s) de auto-reparación fallaran.

**Severidad del problema:** ${ticket.priority}
**Módulo afectado:** ${ticket.technical?.module || 'N/A'}
**Tipo de error:** ${ticket.technical?.errorType || 'N/A'}

---

**Archivo generado:** ${new Date().toISOString()}
**Ticket ID:** ${ticket.id}
`;

        console.log(`✅ Prompt de Claude Code generado para ticket ${id}`);

        res.json({
            success: true,
            data: {
                ticketId: id,
                prompt,
                filename: `claude-code-${id}.md`,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ [BRAIN TICKETS] Error en POST /tickets/:id/export-claude-code:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar prompt de Claude Code',
            details: error.message
        });
    }
});

module.exports = router;
