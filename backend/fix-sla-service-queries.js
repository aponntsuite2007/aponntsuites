/**
 * FIX URGENTE: Arreglar queries de SLA Service
 * Las tablas reales tienen estructura diferente a la esperada
 */

const fs = require('fs');
const path = require('path');

function fixSLAService() {
    const filePath = path.join(__dirname, 'src', 'services', 'slaService.js');

    let content = fs.readFileSync(filePath, 'utf8');

    console.log('🔧 Arreglando queries de slaService.js...\n');

    // Fix 1: Cambiar ng.id a ng.id (está bien) pero ng.group_type no existe
    // notification_groups no tiene group_type, tiene "group_type"

    // Fix 2: notification_messages no tiene sender_type/sender_id como se espera
    // Cambiar los campos a los que realmente existen

    const fixes = [
        // Cambiar referencias a campos que no existen
        {
            old: 'nm.sender_id as approver_id',
            new: 'nm.sender_id as approver_id'
        },
        {
            old: 'nm.sender_type as approver_role',
            new: 'nm.sender_type as approver_role'
        },
        {
            old: 'ng.group_type as request_type',
            new: 'ng.group_type as request_type'
        },
        {
            old: 'JOIN notification_groups ng ON nm.group_id = ng.id',
            new: 'JOIN notification_groups ng ON nm.group_id = ng.id'
        },
        {
            old: 'WHERE nm.company_id = $1',
            new: 'WHERE nm.company_id = $1'
        }
    ];

    // El problema real es que los parámetros no están bien mapeados
    // Necesito cambiar $1, $2, $3 a :companyId, :startDate, :endDate

    // Reemplazar todos los parámetros $1, $2, $3, $4 con nombres correctos
    content = content.replace(/\$1/g, ':companyId');
    content = content.replace(/\$2/g, ':startDate');
    content = content.replace(/\$3/g, ':endDate');
    content = content.replace(/\$4/g, ':endDate2');

    // Para las inserciones con muchos parámetros, usar un approach diferente
    // Buscar el INSERT INTO sla_metrics y arreglarlo específicamente
    const insertRegex = /INSERT INTO sla_metrics[\s\S]*?\) VALUES \([\s\S]*?\)/;
    const insertMatch = content.match(insertRegex);

    if (insertMatch) {
        let insertStatement = insertMatch[0];
        // Este INSERT tiene 13 parámetros, reemplazar con placeholders nombrados
        insertStatement = insertStatement
            .replace('$1', ':approver_id')
            .replace('$2', ':approver_role')
            .replace('$3', ':company_id')
            .replace('$4', ':total_requests')
            .replace('$5', ':avg_response_hours')
            .replace('$6', ':median_response_hours')
            .replace('$7', ':min_response_hours')
            .replace('$8', ':max_response_hours')
            .replace('$9', ':within_sla_count')
            .replace('$10', ':outside_sla_count')
            .replace('$11', ':sla_compliance_percent')
            .replace('$12', ':period_start')
            .replace('$13', ':period_end');

        content = content.replace(insertRegex, insertStatement);
    }

    // También necesito arreglar el array de replacements para el INSERT
    const replacementsRegex = /\], \[[\s\S]*?approver\.approver_id,[\s\S]*?endDate[\s\S]*?\]\)/;
    const replacementsMatch = content.match(replacementsRegex);

    if (replacementsMatch) {
        let replacementsArray = replacementsMatch[0];
        // Cambiar el formato del array a un objeto con nombres
        const newReplacements = `, {
                replacements: {
                    approver_id: approver.approver_id,
                    approver_role: approver.approver_role,
                    company_id: companyId,
                    total_requests: approver.total_requests,
                    avg_response_hours: approver.avg_response_hours,
                    median_response_hours: approver.median_response_hours,
                    min_response_hours: approver.min_response_hours,
                    max_response_hours: approver.max_response_hours,
                    within_sla_count: approver.within_sla,
                    outside_sla_count: approver.outside_sla,
                    sla_compliance_percent: approver.sla_compliance_percent,
                    period_start: startDate,
                    period_end: endDate
                },
                type: db.sequelize.QueryTypes.INSERT
            })`;

        content = content.replace(replacementsRegex, newReplacements);
    }

    fs.writeFileSync(filePath, content);

    console.log('✅ slaService.js arreglado');
}

// Ejecutar
fixSLAService();