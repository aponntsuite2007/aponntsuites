/**
 * CLAUDE CODE POLLING CLIENT - Reparación Automática de Tickets
 *
 * ✅ FIX 6 + 7: Sistema de POLLING en lugar de WebSocket
 *
 * Este script lee tickets de la BD cada 10 segundos y los repara automáticamente.
 * NO requiere WebSocket, funciona con run-iterative-audit.js standalone.
 *
 * FLUJO AUTOMÁTICO:
 * 1. Polling cada 10s busca tickets PENDING_REPAIR en BD
 * 2. Procesa tickets con HybridHealer (auto-fix)
 * 3. Marca tickets como FIXED o FAILED en BD
 * 4. IterativeAuditor detecta tickets FIXED y re-testea módulos
 *
 * USO:
 *   node claude-code-polling-client.js
 *
 * EJECUCIÓN 24/7:
 *   pm2 start claude-code-polling-client.js --name "claude-repair-agent"
 *
 * @version 2.0.0 (Polling-based)
 * @date 2025-10-25
 */

require('dotenv').config();
const database = require('./src/config/database');
const HybridHealer = require('./src/auditor/healers/HybridHealer');
const fs = require('fs');
const path = require('path');

class ClaudeCodePollingClient {
  constructor() {
    this.healer = null;
    this.isRunning = false;
    this.ticketsInProgress = new Set();
    this.pollingInterval = null;
    this.stats = {
      tickets_repaired: 0,
      tickets_failed: 0,
      total_processed: 0,
      uptime_start: new Date(),
      last_check: null
    };

    // Configuración
    this.config = {
      pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL || '10000'), // 10 segundos
      maxConcurrentRepairs: parseInt(process.env.MAX_CONCURRENT_REPAIRS || '3'),
      autoRepair: process.env.AUTO_REPAIR !== 'false' // true por defecto
    };

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  🤖 CLAUDE CODE POLLING CLIENT - Reparación Automática       ║');
    console.log('║     Sistema de Polling v2.0 (Sin WebSocket)                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('⚙️  Configuración:');
    console.log(`   Polling interval: ${this.config.pollingIntervalMs / 1000}s`);
    console.log(`   Auto-repair: ${this.config.autoRepair ? 'ACTIVO ✅' : 'DESACTIVADO ❌'}`);
    console.log(`   Max concurrent: ${this.config.maxConcurrentRepairs}`);
    console.log('');
  }

  async start() {
    try {
      // Conectar a base de datos
      await database.sequelize.authenticate();
      console.log('✅ Conectado a BD');

      // Inicializar HybridHealer
      this.healer = new HybridHealer(database);
      console.log('✅ HybridHealer inicializado');

      // Iniciar polling
      this.startPolling();

      // Manejar señales de terminación
      process.on('SIGINT', () => this.stop());
      process.on('SIGTERM', () => this.stop());

    } catch (error) {
      console.error('❌ ERROR FATAL:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  startPolling() {
    console.log('\n🔄 Iniciando sistema de polling...');
    console.log(`   Verificando tickets cada ${this.config.pollingIntervalMs / 1000}s`);
    console.log('');

    this.isRunning = true;

    // Primera ejecución inmediata
    this.checkAndProcessTickets();

    // Polling continuo
    this.pollingInterval = setInterval(() => {
      this.checkAndProcessTickets();
    }, this.config.pollingIntervalMs);

    console.log('✅ Polling activo - esperando tickets...\n');
  }

  async checkAndProcessTickets() {
    if (!this.config.autoRepair) {
      return;
    }

    this.stats.last_check = new Date();

    try {
      // Buscar tickets pendientes de reparación
      const pendingTickets = await this.getPendingTickets();

      if (pendingTickets.length === 0) {
        // Solo mostrar cada 60 segundos para no saturar logs
        const secondsSinceStart = Math.floor((Date.now() - this.stats.uptime_start) / 1000);
        if (secondsSinceStart % 60 === 0) {
          console.log(`[${new Date().toISOString()}] 🔍 No hay tickets pendientes (${this.stats.total_processed} procesados)`);
        }
        return;
      }

      console.log(`\n🎫 [${new Date().toISOString()}] Encontrados ${pendingTickets.length} tickets pendientes`);

      // Procesar cada ticket (respetando límite de concurrencia)
      for (const ticket of pendingTickets) {
        // Verificar límite de concurrencia
        if (this.ticketsInProgress.size >= this.config.maxConcurrentRepairs) {
          console.log(`   ⏸️  Límite de concurrencia alcanzado (${this.config.maxConcurrentRepairs}), esperando...`);
          break;
        }

        // Evitar procesar el mismo ticket dos veces
        if (this.ticketsInProgress.has(ticket.ticket_number)) {
          continue;
        }

        // Procesar ticket
        this.processTicket(ticket);
      }

    } catch (error) {
      console.error('❌ Error en polling:', error.message);
    }
  }

  async getPendingTickets() {
    const { sequelize } = database;

    const [tickets] = await sequelize.query(`
      SELECT *
      FROM testing_tickets
      WHERE status IN ('PENDING_REPAIR', 'REOPENED')
        AND assigned_to = 'claude-code'
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        created_at ASC
      LIMIT 10
    `);

    return tickets;
  }

  async processTicket(ticket) {
    this.ticketsInProgress.add(ticket.ticket_number);
    this.stats.total_processed++;

    console.log(`\n   🔧 [${ticket.ticket_number}] Procesando ticket...`);
    console.log(`      Módulo: ${ticket.module_name}`);
    console.log(`      Error: ${ticket.error_message.substring(0, 60)}...`);
    console.log(`      Prioridad: ${ticket.priority}`);

    try {
      // Actualizar estado a IN_REPAIR
      await this.updateTicketStatus(ticket.ticket_number, 'IN_REPAIR', 'Claude Code está analizando el error...');

      // ✅ FIX 8: HybridHealer.heal() requiere formato específico
      // Preparar datos del error para HybridHealer
      const failure = {
        id: ticket.id,
        error_message: ticket.error_message,
        error_type: ticket.error_type,
        error_stack: ticket.error_stack,
        error_file: ticket.file_path,
        error_line: ticket.line_number,
        module_name: ticket.module_name,
        test_name: ticket.test_name,
        test_type: ticket.test_type || 'frontend',
        test_context: ticket.test_context,
        // Método update() simulado para compatibilidad con HybridHealer
        update: async (data) => {
          console.log(`      📝 HybridHealer quiere actualizar ticket:`, Object.keys(data).join(', '));
          // No actualizamos aquí, lo haremos después según resultado
        }
      };

      // Intentar reparar con HybridHealer
      console.log(`      🧠 Analizando con HybridHealer...`);
      const healResult = await this.healer.heal(failure, ticket.id, 11);

      // ✅ FIX 8: HybridHealer retorna { success, type, strategy, ... }
      if (healResult.success && healResult.type === 'auto-fix') {
        // ✅ REPARADO EXITOSAMENTE (auto-fix aplicado)
        this.stats.tickets_repaired++;

        console.log(`      ✅ REPARADO exitosamente`);
        console.log(`         Estrategia: ${healResult.strategy}`);
        console.log(`         Tipo: ${healResult.type}`);

        await this.updateTicketStatus(
          ticket.ticket_number,
          'FIXED',
          `Reparado automáticamente por Claude Code usando estrategia: ${healResult.strategy}`,
          {
            fix_strategy: healResult.strategy,
            fix_type: healResult.type,
            fix_applied: healResult.code,
            fixed_at: new Date().toISOString(),
            backup_created: healResult.backup_created
          }
        );

      } else if (!healResult.success && healResult.type === 'suggestions') {
        // ⚠️ REQUIERE INTERVENCIÓN MANUAL (sugerencias generadas)
        console.log(`      ⚠️  Requiere intervención manual`);
        console.log(`         Sugerencias: ${healResult.suggestions?.length || 0}`);

        await this.updateTicketStatus(
          ticket.ticket_number,
          'NEEDS_MANUAL_FIX',
          `Claude Code generó ${healResult.suggestions?.length || 0} sugerencias de reparación`,
          {
            suggestions: healResult.suggestions,
            auto_fix_attempted: true,
            requires_confirmation: healResult.requires_confirmation
          }
        );

      } else {
        // ❌ NO SE PUDO REPARAR (sin patrón o error)
        this.stats.tickets_failed++;

        console.log(`      ❌ No se pudo reparar`);
        console.log(`         Razón: ${healResult.reason || 'No matching pattern'}`);

        await this.updateTicketStatus(
          ticket.ticket_number,
          'FAILED',
          `No se pudo reparar automáticamente: ${healResult.reason || 'Unknown'}`,
          {
            auto_fix_attempted: true,
            reason: healResult.reason
          }
        );
      }

    } catch (error) {
      this.stats.tickets_failed++;

      console.error(`      ❌ Error procesando ticket:`, error.message);

      await this.updateTicketStatus(
        ticket.ticket_number,
        'FAILED',
        `Error durante la reparación: ${error.message}`,
        {
          error: error.message,
          stack: error.stack
        }
      );

    } finally {
      this.ticketsInProgress.delete(ticket.ticket_number);
      this.showStats();
    }
  }

  async updateTicketStatus(ticketNumber, status, message, metadata = {}) {
    const { sequelize } = database;

    // ✅ FIX: No usar metadata - no existe en tabla
    await sequelize.query(`
      UPDATE testing_tickets
      SET
        status = :status,
        last_message = :message,
        updated_at = NOW(),
        conversation_log = COALESCE(conversation_log, '[]'::jsonb) || :logEntry::jsonb
      WHERE ticket_number = :ticketNumber
    `, {
      replacements: {
        ticketNumber,
        status,
        message,
        logEntry: JSON.stringify([{
          timestamp: new Date().toISOString(),
          from: 'claude-code-polling-client',
          status,
          message,
          metadata: metadata // Guardar metadata dentro del log
        }])
      }
    });

    console.log(`      📝 Ticket actualizado: ${status}`);
  }

  showStats() {
    const uptime = Math.floor((Date.now() - this.stats.uptime_start) / 1000);
    const minutes = Math.floor(uptime / 60);
    const seconds = uptime % 60;

    console.log(`\n   📊 Stats: Procesados: ${this.stats.total_processed} | ✅ ${this.stats.tickets_repaired} | ❌ ${this.stats.tickets_failed} | Uptime: ${minutes}m ${seconds}s\n`);
  }

  stop() {
    console.log('\n\n🛑 Deteniendo Claude Code Polling Client...');

    this.isRunning = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.showStats();

    console.log('✅ Cliente detenido correctamente');
    process.exit(0);
  }
}

// ═══════════════════════════════════════════════════════════════
// INICIO
// ═══════════════════════════════════════════════════════════════

const client = new ClaudeCodePollingClient();
client.start();
