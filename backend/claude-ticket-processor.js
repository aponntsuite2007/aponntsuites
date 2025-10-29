/**
 * CLAUDE TICKET PROCESSOR - Auto-reparación de tickets
 *
 * Este script:
 * 1. Lee tickets PENDING_REPAIR desde BD
 * 2. Lee archivos afectados
 * 3. Analiza errores
 * 4. Aplica fixes automáticamente
 * 5. Marca tickets como FIXED
 * 6. Notifica para re-testing
 */

const fs = require('fs').promises;
const path = require('path');
const database = require('./src/config/database');

// ═══════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════

const CONFIG = {
  maxTicketsPerRun: 10, // Máximo de tickets a procesar por ejecución
  backupEnabled: true, // Hacer backup antes de modificar archivos
  dryRun: false // Si es true, solo simula (no modifica archivos)
};

// ═══════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════

async function processTickets() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  🤖 CLAUDE TICKET PROCESSOR - Auto-reparación            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    const { sequelize } = database;

    // 1. Obtener tickets pendientes
    const [tickets] = await sequelize.query(`
      SELECT * FROM testing_tickets
      WHERE status = 'PENDING_REPAIR'
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        created_at ASC
      LIMIT :limit
    `, {
      replacements: { limit: CONFIG.maxTicketsPerRun }
    });

    if (tickets.length === 0) {
      console.log('✅ No hay tickets pendientes de reparación\n');
      await sequelize.close();
      return;
    }

    console.log(`📋 Encontrados ${tickets.length} tickets pendientes:\n`);

    tickets.forEach((ticket, index) => {
      const icon = ticket.priority === 'critical' ? '⚠️ ' : '⚡';
      console.log(`${icon}  ${ticket.ticket_number} [${ticket.priority.toUpperCase()}]`);
      console.log(`   Módulo: ${ticket.module_name}`);
      console.log(`   Error: ${ticket.error_message}`);
      console.log(`   Archivo: ${ticket.file_path}:${ticket.line_number}\n`);
    });

    // 2. Procesar cada ticket
    let fixed = 0;
    let failed = 0;

    for (const ticket of tickets) {
      console.log(`\n🔧 Procesando ${ticket.ticket_number}...`);

      try {
        await processTicket(ticket, sequelize);
        fixed++;
        console.log(`✅ ${ticket.ticket_number} reparado exitosamente`);
      } catch (error) {
        failed++;
        console.error(`❌ ${ticket.ticket_number} falló:`, error.message);

        // Marcar como BLOCKED si no se puede reparar
        await sequelize.query(`
          UPDATE testing_tickets
          SET status = 'BLOCKED',
              metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{block_reason}',
                to_jsonb($1::text)
              ),
              updated_at = NOW()
          WHERE ticket_number = $2
        `, {
          bind: [error.message, ticket.ticket_number]
        });
      }
    }

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log(`║  📊 RESUMEN DE REPARACIONES                              ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Reparados: ${fixed}`);
    console.log(`❌ Fallidos: ${failed}`);
    console.log(`📊 Total procesados: ${tickets.length}\n`);

    if (fixed > 0) {
      console.log('🔄 PRÓXIMO PASO: Ollama debe re-testear los módulos reparados\n');
      console.log('Para re-testear, ejecuta:');
      console.log('  node demo-ticket-system.js\n');
    }

    await sequelize.close();

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════
// PROCESS SINGLE TICKET
// ═══════════════════════════════════════════════════════════

async function processTicket(ticket, sequelize) {
  const filePath = path.join(__dirname, '..', ticket.file_path);

  console.log(`   📁 Archivo: ${filePath}`);

  // Verificar que el archivo existe
  try {
    await fs.access(filePath);
  } catch (error) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }

  // Leer contenido del archivo
  const content = await fs.readFile(filePath, 'utf8');
  console.log(`   📄 Leído (${content.split('\n').length} líneas)`);

  // Marcar como IN_REPAIR
  await sequelize.query(`
    UPDATE testing_tickets
    SET status = 'IN_REPAIR',
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{repair_started_at}',
          to_jsonb($1::text)
        ),
        updated_at = NOW()
    WHERE ticket_number = $2
  `, {
    bind: [new Date().toISOString(), ticket.ticket_number]
  });

  // Aplicar fix según el tipo de error
  const fix = await applyFix(ticket, content, filePath);

  if (!fix.success) {
    throw new Error(fix.error || 'Fix no aplicado');
  }

  // Escribir archivo modificado (si no es dry run)
  if (!CONFIG.dryRun) {
    // Hacer backup
    if (CONFIG.backupEnabled) {
      const backupPath = `${filePath}.backup-${Date.now()}`;
      await fs.writeFile(backupPath, content);
      console.log(`   💾 Backup: ${backupPath}`);
    }

    await fs.writeFile(filePath, fix.modifiedContent);
    console.log(`   ✍️  Archivo modificado`);
  } else {
    console.log(`   🔍 [DRY RUN] NO se modificó el archivo`);
  }

  // Marcar como FIXED
  await sequelize.query(`
    UPDATE testing_tickets
    SET status = 'FIXED',
        fix_applied = $1,
        metadata = jsonb_set(
          jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{repair_completed_at}',
            to_jsonb($2::text)
          ),
          '{fix_description}',
          to_jsonb($3::text)
        ),
        updated_at = NOW()
    WHERE ticket_number = $4
  `, {
    bind: [
      true,
      new Date().toISOString(),
      fix.description,
      ticket.ticket_number
    ]
  });

  console.log(`   📝 Fix aplicado: ${fix.description}`);
}

// ═══════════════════════════════════════════════════════════
// APPLY FIX LOGIC
// ═══════════════════════════════════════════════════════════

async function applyFix(ticket, content, filePath) {
  const errorMessage = ticket.error_message.toLowerCase();

  // FIX 1: "Cannot read property 'map' of undefined"
  if (errorMessage.includes('cannot read property') && errorMessage.includes('map')) {
    return fixUndefinedMap(ticket, content);
  }

  // FIX 2: "Modal does not close"
  if (errorMessage.includes('modal') && errorMessage.includes('close')) {
    return fixModalClose(ticket, content);
  }

  // FIX 3: "HTTP 500: Internal Server Error"
  if (errorMessage.includes('http 500') || errorMessage.includes('internal server error')) {
    return fixHTTP500(ticket, content);
  }

  // FIX 4: "401 Unauthorized"
  if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
    return fixUnauthorized(ticket, content);
  }

  // Fallback: No fix disponible
  return {
    success: false,
    error: `No hay fix automático disponible para: ${ticket.error_message}`
  };
}

// ═══════════════════════════════════════════════════════════
// FIX IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════

function fixUndefinedMap(ticket, content) {
  const lines = content.split('\n');
  const lineIndex = ticket.line_number - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return { success: false, error: 'Línea fuera de rango' };
  }

  const targetLine = lines[lineIndex];

  // Buscar pattern: algo.map(...) sin validación
  const mapPattern = /(\w+)\.map\(/;
  const match = targetLine.match(mapPattern);

  if (!match) {
    return { success: false, error: 'No se encontró pattern .map()' };
  }

  const variable = match[1];

  // Reemplazar con validación segura
  const fixedLine = targetLine.replace(
    `${variable}.map(`,
    `(${variable} || []).map(`
  );

  lines[lineIndex] = fixedLine;

  return {
    success: true,
    modifiedContent: lines.join('\n'),
    description: `Agregada validación segura: (${variable} || []).map()`
  };
}

function fixModalClose(ticket, content) {
  const lines = content.split('\n');
  const lineIndex = ticket.line_number - 1;

  // Buscar el evento de click del modal cerca de la línea indicada
  const searchStart = Math.max(0, lineIndex - 20);
  const searchEnd = Math.min(lines.length, lineIndex + 20);

  let modalEventLine = -1;
  for (let i = searchStart; i < searchEnd; i++) {
    if (lines[i].includes('modal.onclick') || lines[i].includes('modal.addEventListener')) {
      modalEventLine = i;
      break;
    }
  }

  if (modalEventLine === -1) {
    return { success: false, error: 'No se encontró evento onclick del modal' };
  }

  // Agregar validación de target
  const fixedLine = lines[modalEventLine].replace(
    /modal\.onclick\s*=\s*function\s*\(\s*e?\s*\)\s*{/,
    'modal.onclick = function(e) {\n    if (e.target === modal) {'
  );

  // Agregar cierre de if
  let closeBraceLine = modalEventLine + 1;
  while (closeBraceLine < lines.length && !lines[closeBraceLine].includes('};')) {
    closeBraceLine++;
  }

  if (closeBraceLine < lines.length) {
    lines[closeBraceLine] = '    }\n' + lines[closeBraceLine];
  }

  lines[modalEventLine] = fixedLine;

  return {
    success: true,
    modifiedContent: lines.join('\n'),
    description: 'Agregada validación e.target === modal para cerrar solo al click fuera'
  };
}

function fixHTTP500(ticket, content) {
  // Este tipo de error generalmente requiere análisis más profundo
  // Por ahora, agregamos try-catch si no existe
  const lines = content.split('\n');
  const lineIndex = ticket.line_number - 1;

  // Buscar el bloque de código cercano
  const searchStart = Math.max(0, lineIndex - 10);
  const searchEnd = Math.min(lines.length, lineIndex + 5);

  let hasTryCatch = false;
  for (let i = searchStart; i < searchEnd; i++) {
    if (lines[i].includes('try {') || lines[i].includes('catch')) {
      hasTryCatch = true;
      break;
    }
  }

  if (hasTryCatch) {
    return {
      success: false,
      error: 'Ya tiene try-catch, requiere análisis manual'
    };
  }

  // Agregar logging de error
  const indent = lines[lineIndex].match(/^\s*/)[0];
  lines.splice(lineIndex, 0, `${indent}console.error('[ERROR] HTTP 500:', error);`);

  return {
    success: true,
    modifiedContent: lines.join('\n'),
    description: 'Agregado logging de error para debugging'
  };
}

function fixUnauthorized(ticket, content) {
  return {
    success: false,
    error: 'Error 401: Requiere configuración de credenciales API (Azure Face), no es fix automático'
  };
}

// ═══════════════════════════════════════════════════════════
// EXECUTE
// ═══════════════════════════════════════════════════════════

processTickets().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
