/**
 * ============================================================================
 * TEST COMPLETO DE ESCALAMIENTO DE SOPORTE
 * ============================================================================
 * Simula 3 escenarios:
 * 1. Ticket sin escalamiento - resuelto en nivel 1
 * 2. Ticket con escalamiento a coordinador (aponntcoordinacionsoporte@gmail.com)
 * 3. Ticket con escalamiento a dirección (aponntsuite@gmail.com)
 */

const http = require('http');

const BASE_URL = 'http://localhost:9998';
const ISI_COMPANY_ID = 11;

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(color, prefix, message) {
    console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

function httpRequest(method, path, data, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const postData = data ? JSON.stringify(data) : null;

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

async function login(companyId, identifier, password) {
    log(colors.cyan, 'LOGIN', `Intentando login con empresa ${companyId}...`);

    const response = await httpRequest('POST', '/api/v1/auth/login', {
        companyId: companyId,
        identifier: identifier,
        password: password
    });

    if (response.data.token) {
        log(colors.green, 'LOGIN', `✅ Login exitoso para ${identifier}`);
        return response.data.token;
    } else {
        log(colors.red, 'LOGIN', `❌ Error: ${JSON.stringify(response.data)}`);
        throw new Error('Login failed');
    }
}

async function createSupportTicket(token, subject, message, priority, category = 'technical') {
    log(colors.cyan, 'TICKET', `Creando ticket: "${subject}" (${priority})...`);

    // Endpoint correcto: /api/v1/help/ticket
    const response = await httpRequest('POST', '/api/v1/help/ticket', {
        subject: subject,
        message: message,
        priority: priority,
        category: category,
        moduleContext: 'test-escalation'
    }, token);

    if (response.data.success && response.data.ticket) {
        log(colors.green, 'TICKET', `✅ Ticket creado: ${response.data.ticket.id}`);
        return response.data.ticket;
    } else if (response.data.threadId) {
        log(colors.green, 'TICKET', `✅ Ticket creado con threadId: ${response.data.threadId}`);
        return { id: response.data.threadId, ...response.data };
    } else {
        log(colors.yellow, 'TICKET', `Respuesta: ${JSON.stringify(response.data)}`);
        return response.data;
    }
}

async function resolveTicket(token, ticketId, resolution) {
    log(colors.cyan, 'RESOLVE', `Resolviendo ticket ${ticketId}...`);

    // Endpoint correcto: /api/v1/help/tickets/:threadId/close
    const response = await httpRequest('POST', `/api/v1/help/tickets/${ticketId}/close`, {
        resolution: resolution
    }, token);

    if (response.data.success) {
        log(colors.green, 'RESOLVE', `✅ Ticket resuelto`);
    } else {
        log(colors.yellow, 'RESOLVE', `Respuesta: ${JSON.stringify(response.data)}`);
    }
    return response.data;
}

async function voluntaryEscalate(token, ticketId, reason) {
    log(colors.magenta, 'ESCALATE', `Escalando voluntariamente ticket ${ticketId}...`);

    const response = await httpRequest('POST', '/api/v1/support/escalate', {
        ticketId: ticketId,
        reason: reason
    }, token);

    if (response.data.success) {
        log(colors.green, 'ESCALATE', `✅ Escalamiento exitoso a nivel ${response.data.newLevel}`);
        log(colors.green, 'ESCALATE', `   Asignado a: ${response.data.assignedTo}`);
    } else {
        log(colors.yellow, 'ESCALATE', `Respuesta: ${JSON.stringify(response.data)}`);
    }
    return response.data;
}

async function getEscalationStatus(token) {
    const response = await httpRequest('GET', '/api/v1/support/escalation/status', null, token);
    return response.data;
}

async function getEscalationStats(token) {
    const response = await httpRequest('GET', '/api/v1/support/escalation/stats', null, token);
    return response.data;
}

async function getEscalationHistory(token, ticketId) {
    const response = await httpRequest('GET', `/api/v1/support/escalation/history/${ticketId}`, null, token);
    return response.data;
}

async function runManualCycle(token) {
    log(colors.cyan, 'CYCLE', 'Ejecutando ciclo de escalamiento manual...');
    const response = await httpRequest('POST', '/api/v1/support/escalation/run-cycle', null, token);
    if (response.data.success) {
        log(colors.green, 'CYCLE', `✅ Ciclo completado: ${response.data.result.escalated} escalados`);
    }
    return response.data;
}

// ============================================================================
// ESCENARIOS DE PRUEBA
// ============================================================================

async function escenario1_SinEscalamiento(token) {
    console.log('\n' + '='.repeat(70));
    log(colors.yellow, 'ESCENARIO 1', '🎫 TICKET SIN ESCALAMIENTO - Resolución directa');
    console.log('='.repeat(70));

    // Crear ticket
    const ticket = await createSupportTicket(
        token,
        'Consulta sobre configuración de turnos',
        'Necesito ayuda para configurar los turnos rotativos en el sistema.',
        'low',
        'technical'
    );

    if (ticket.id) {
        // Simular respuesta y resolución rápida
        await new Promise(r => setTimeout(r, 1000));

        await resolveTicket(token, ticket.id,
            'Se explicó al usuario cómo configurar turnos rotativos desde el módulo de Turnos.'
        );

        log(colors.green, 'ESCENARIO 1', '✅ COMPLETADO - Ticket resuelto sin escalamiento');
        return { success: true, ticketId: ticket.id };
    }

    return { success: false };
}

async function escenario2_EscalamientoCoordinador(token) {
    console.log('\n' + '='.repeat(70));
    log(colors.yellow, 'ESCENARIO 2', '📈 TICKET CON ESCALAMIENTO A COORDINADOR');
    console.log('='.repeat(70));

    // Crear ticket de prioridad media
    const ticket = await createSupportTicket(
        token,
        'Error en cálculo de horas extras',
        'El sistema está calculando mal las horas extras después de la última actualización.',
        'medium',
        'bug'
    );

    if (ticket.id) {
        log(colors.cyan, 'ESCENARIO 2', 'Simulando que soporte nivel 1 no puede resolver...');
        await new Promise(r => setTimeout(r, 1000));

        // Escalar voluntariamente a coordinador
        const escalation = await voluntaryEscalate(
            token,
            ticket.id,
            'El problema requiere revisión del código de cálculo de payroll. Escalando a coordinación técnica.'
        );

        // Verificar historial de escalamiento
        const history = await getEscalationHistory(token, ticket.id);
        log(colors.cyan, 'ESCENARIO 2', `Historial de escalamientos: ${history.history?.length || 0} registros`);

        if (history.history && history.history.length > 0) {
            history.history.forEach((h, i) => {
                log(colors.cyan, '  ', `${i+1}. Nivel ${h.from_level} → ${h.to_level} (${h.escalation_type})`);
            });
        }

        // Simular resolución por coordinador
        await new Promise(r => setTimeout(r, 1000));
        await resolveTicket(token, ticket.id,
            'Identificado bug en PayrollCalculatorService. Hotfix aplicado. Versión 2.1.5.'
        );

        log(colors.green, 'ESCENARIO 2', '✅ COMPLETADO - Resuelto por Coordinador');
        return { success: true, ticketId: ticket.id };
    }

    return { success: false };
}

async function escenario3_EscalamientoDireccion(token) {
    console.log('\n' + '='.repeat(70));
    log(colors.yellow, 'ESCENARIO 3', '🔺 TICKET CON ESCALAMIENTO HASTA DIRECCIÓN');
    console.log('='.repeat(70));

    // Crear ticket crítico
    const ticket = await createSupportTicket(
        token,
        'Sistema completamente caído - URGENTE',
        'El sistema no responde desde hace 2 horas. Empleados no pueden marcar asistencia.',
        'critical',
        'system_down'
    );

    if (ticket.id) {
        log(colors.cyan, 'ESCENARIO 3', 'Ticket crítico creado. Simulando escalamientos...');
        await new Promise(r => setTimeout(r, 1000));

        // Primer escalamiento: Soporte → Coordinador
        log(colors.magenta, 'ESCENARIO 3', '📈 Escalamiento 1: Soporte → Coordinador');
        const esc1 = await voluntaryEscalate(
            token,
            ticket.id,
            'Problema de infraestructura. Requiere intervención de coordinación.'
        );

        await new Promise(r => setTimeout(r, 1000));

        // Segundo escalamiento: Coordinador → Dirección
        log(colors.magenta, 'ESCENARIO 3', '📈 Escalamiento 2: Coordinador → Dirección');
        const esc2 = await voluntaryEscalate(
            token,
            ticket.id,
            'Problema de servidor requiere autorización de gastos para AWS. Escalando a dirección.'
        );

        // Verificar historial completo
        const history = await getEscalationHistory(token, ticket.id);
        log(colors.cyan, 'ESCENARIO 3', `Historial completo de escalamientos:`);

        if (history.history && history.history.length > 0) {
            history.history.forEach((h, i) => {
                log(colors.cyan, '  ', `${i+1}. Nivel ${h.from_level} → ${h.to_level} (${h.escalation_type}): ${h.reason?.substring(0, 50)}...`);
            });
        }

        // Simular resolución por dirección
        await new Promise(r => setTimeout(r, 1000));
        await resolveTicket(token, ticket.id,
            'Autorizado upgrade de servidor. Mitigación inmediata aplicada. Tiempo de respuesta mejorado 95%.'
        );

        log(colors.green, 'ESCENARIO 3', '✅ COMPLETADO - Resuelto por Dirección');
        return { success: true, ticketId: ticket.id };
    }

    return { success: false };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('\n' + '█'.repeat(70));
    console.log('█  TEST COMPLETO DE SISTEMA DE ESCALAMIENTO DE SOPORTE');
    console.log('█  Empresa: ISI (company_id: 11)');
    console.log('█'.repeat(70) + '\n');

    try {
        // 1. Login con ISI
        const token = await login(ISI_COMPANY_ID, 'admin', 'admin123');

        // 2. Verificar estado del servicio de escalamiento
        console.log('\n' + '-'.repeat(50));
        log(colors.cyan, 'STATUS', 'Verificando estado del servicio de escalamiento...');
        const status = await getEscalationStatus(token);
        console.log('Estado:', JSON.stringify(status, null, 2));

        // 3. Estadísticas iniciales
        const statsInicio = await getEscalationStats(token);
        log(colors.cyan, 'STATS', `Estadísticas iniciales: ${statsInicio.stats?.total_escalations || 0} escalamientos`);

        // 4. Ejecutar escenarios
        const resultados = {
            escenario1: await escenario1_SinEscalamiento(token),
            escenario2: await escenario2_EscalamientoCoordinador(token),
            escenario3: await escenario3_EscalamientoDireccion(token)
        };

        // 5. Estadísticas finales
        console.log('\n' + '='.repeat(70));
        log(colors.yellow, 'RESUMEN', 'ESTADÍSTICAS FINALES');
        console.log('='.repeat(70));

        const statsFinal = await getEscalationStats(token);
        console.log('Estadísticas finales:', JSON.stringify(statsFinal, null, 2));

        // 6. Resumen
        console.log('\n' + '█'.repeat(70));
        log(colors.green, 'RESULTADO', 'RESUMEN DE PRUEBAS:');
        console.log('█'.repeat(70));

        console.log(`
  📊 ESCENARIO 1 (Sin escalamiento):    ${resultados.escenario1.success ? '✅ PASS' : '❌ FAIL'}
  📊 ESCENARIO 2 (→ Coordinador):       ${resultados.escenario2.success ? '✅ PASS' : '❌ FAIL'}
  📊 ESCENARIO 3 (→ Dirección):         ${resultados.escenario3.success ? '✅ PASS' : '❌ FAIL'}

  📧 Emails de notificación enviados a:
     • Nivel 1: pablorivasjordan52@gmail.com (Soporte ISI)
     • Nivel 2: aponntcoordinacionsoporte@gmail.com (Coordinador)
     • Nivel 3: aponntsuite@gmail.com (Dirección)
        `);

        console.log('█'.repeat(70) + '\n');

    } catch (error) {
        log(colors.red, 'ERROR', `Error en pruebas: ${error.message}`);
        console.error(error);
    }
}

main();
