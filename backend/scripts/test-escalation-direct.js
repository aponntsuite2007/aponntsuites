/**
 * TEST DIRECTO DE ESCALAMIENTO
 * Crea tickets directamente en support_tickets y prueba escalamiento
 */

const { sequelize } = require('../src/config/database');
const http = require('http');

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

function httpRequest(method, path, data, token) {
    return new Promise((resolve, reject) => {
        const postData = data ? JSON.stringify(data) : null;
        const options = {
            hostname: 'localhost',
            port: 9998,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;
        if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
                catch (e) { resolve({ status: res.statusCode, data: body }); }
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function getToken() {
    const response = await httpRequest('POST', '/api/v1/auth/login', {
        companyId: 11,
        identifier: 'admin',
        password: 'admin123'
    });
    return response.data.token;
}

async function createTicketDirectly(companyId, userId, subject, priority, moduleName) {
    const ticketNumber = `ISI-${Date.now()}`;

    const [result] = await sequelize.query(`
        INSERT INTO support_tickets (
            ticket_number, company_id, created_by_user_id,
            module_name, subject, description, priority, status
        ) VALUES (
            :ticketNumber, :companyId, :userId,
            :moduleName, :subject, :description, :priority, 'open'
        )
        RETURNING ticket_id, ticket_number, priority, escalation_level
    `, {
        replacements: {
            ticketNumber,
            companyId,
            userId,
            moduleName,
            subject,
            description: `Descripción del ticket: ${subject}`,
            priority
        },
        type: sequelize.QueryTypes.INSERT
    });

    return result[0];
}

async function getISIUserId() {
    const [users] = await sequelize.query(`
        SELECT u.user_id, u.usuario, u."firstName", u."lastName"
        FROM users u
        WHERE u.company_id = 11 AND u.role = 'admin'
        LIMIT 1
    `);
    if (users[0]) {
        log(colors.cyan, 'SETUP', `Usuario: ${users[0].firstName} ${users[0].lastName} (${users[0].usuario})`);
    }
    return users[0]?.user_id;
}

async function main() {
    console.log('\n' + '█'.repeat(70));
    console.log('█  TEST DIRECTO DE ESCALAMIENTO DE SOPORTE');
    console.log('█'.repeat(70) + '\n');

    try {
        // 1. Obtener usuario de ISI
        log(colors.cyan, 'SETUP', 'Obteniendo usuario admin de ISI...');
        const userId = await getISIUserId();
        if (!userId) throw new Error('No se encontró usuario admin en ISI');
        log(colors.green, 'SETUP', `Usuario encontrado: ${userId}`);

        // 2. Obtener token
        log(colors.cyan, 'AUTH', 'Obteniendo token...');
        const token = await getToken();
        log(colors.green, 'AUTH', '✅ Token obtenido');

        // 3. ESCENARIO 1: Ticket sin escalamiento
        console.log('\n' + '='.repeat(70));
        log(colors.yellow, 'ESCENARIO 1', '🎫 TICKET BAJA PRIORIDAD - Sin escalamiento');
        console.log('='.repeat(70));

        const ticket1 = await createTicketDirectly(
            11, userId,
            'Consulta sobre horarios',
            'low',
            'shifts'
        );
        log(colors.green, 'TICKET 1', `Creado: ${ticket1.ticket_number} (${ticket1.priority})`);
        log(colors.cyan, 'TICKET 1', `Nivel inicial: ${ticket1.escalation_level}`);

        // 4. ESCENARIO 2: Ticket para escalar a coordinador
        console.log('\n' + '='.repeat(70));
        log(colors.yellow, 'ESCENARIO 2', '📈 TICKET MEDIA PRIORIDAD - Escalamiento a Coordinador');
        console.log('='.repeat(70));

        const ticket2 = await createTicketDirectly(
            11, userId,
            'Error en cálculos de nómina',
            'medium',
            'payroll'
        );
        log(colors.green, 'TICKET 2', `Creado: ${ticket2.ticket_number} (${ticket2.priority})`);

        // Escalar voluntariamente
        log(colors.magenta, 'ESCALATE', 'Escalando a coordinador...');
        const esc1 = await httpRequest('POST', '/api/v1/support/escalate', {
            ticketId: ticket2.ticket_id,
            reason: 'Requiere revisión de código de payroll'
        }, token);

        if (esc1.data.success) {
            log(colors.green, 'ESCALATE', `✅ Escalado a nivel ${esc1.data.newLevel}`);
            log(colors.green, 'ESCALATE', `Asignado a: ${esc1.data.assignedTo}`);
        } else {
            log(colors.red, 'ESCALATE', `Error: ${JSON.stringify(esc1.data)}`);
        }

        // 5. ESCENARIO 3: Ticket para escalar a dirección
        console.log('\n' + '='.repeat(70));
        log(colors.yellow, 'ESCENARIO 3', '🔺 TICKET URGENTE - Escalamiento hasta Dirección');
        console.log('='.repeat(70));

        const ticket3 = await createTicketDirectly(
            11, userId,
            'Sistema caído - URGENTE',
            'urgent',
            'system'
        );
        log(colors.green, 'TICKET 3', `Creado: ${ticket3.ticket_number} (${ticket3.priority})`);

        // Primer escalamiento
        log(colors.magenta, 'ESCALATE 1', 'Escalando a coordinador...');
        const esc2a = await httpRequest('POST', '/api/v1/support/escalate', {
            ticketId: ticket3.ticket_id,
            reason: 'Problema crítico de infraestructura'
        }, token);

        if (esc2a.data.success) {
            log(colors.green, 'ESCALATE 1', `✅ Escalado a nivel ${esc2a.data.newLevel}`);
        }

        // Segundo escalamiento
        log(colors.magenta, 'ESCALATE 2', 'Escalando a dirección...');
        const esc2b = await httpRequest('POST', '/api/v1/support/escalate', {
            ticketId: ticket3.ticket_id,
            reason: 'Requiere autorización de gastos urgentes'
        }, token);

        if (esc2b.data.success) {
            log(colors.green, 'ESCALATE 2', `✅ Escalado a nivel ${esc2b.data.newLevel}`);
            log(colors.green, 'ESCALATE 2', `Asignado a: ${esc2b.data.assignedTo}`);
        }

        // 6. Verificar historial de escalamientos
        console.log('\n' + '='.repeat(70));
        log(colors.yellow, 'HISTORIAL', 'Verificando historial de escalamientos');
        console.log('='.repeat(70));

        const history = await httpRequest('GET', `/api/v1/support/escalation/history/${ticket3.ticket_id}`, null, token);
        if (history.data.success && history.data.history) {
            history.data.history.forEach((h, i) => {
                log(colors.cyan, `ESC ${i+1}`, `Nivel ${h.from_level} → ${h.to_level} (${h.escalation_type})`);
            });
        }

        // 7. Estadísticas finales
        console.log('\n' + '='.repeat(70));
        log(colors.yellow, 'STATS', 'Estadísticas finales');
        console.log('='.repeat(70));

        const stats = await httpRequest('GET', '/api/v1/support/escalation/stats', null, token);
        console.log(JSON.stringify(stats.data, null, 2));

        // 8. Verificar tickets creados
        const [tickets] = await sequelize.query(`
            SELECT ticket_number, subject, priority, escalation_level,
                   (SELECT email FROM aponnt_staff WHERE staff_id = assigned_staff_id) as assigned_email
            FROM support_tickets
            WHERE company_id = 11
            ORDER BY created_at DESC
            LIMIT 5
        `);

        console.log('\n' + '='.repeat(70));
        log(colors.green, 'TICKETS', 'Tickets de ISI:');
        console.log('='.repeat(70));
        tickets.forEach(t => {
            console.log(`  📋 ${t.ticket_number}: ${t.subject}`);
            console.log(`     Prioridad: ${t.priority} | Nivel: ${t.escalation_level} | Asignado: ${t.assigned_email || 'N/A'}`);
        });

        console.log('\n' + '█'.repeat(70));
        log(colors.green, 'RESULTADO', '✅ TEST COMPLETADO');
        console.log('█'.repeat(70) + '\n');

    } catch (error) {
        log(colors.red, 'ERROR', error.message);
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

main();
