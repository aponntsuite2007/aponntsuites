/**
 * ============================================================================
 * SYNC COORDINATOR
 * ============================================================================
 *
 * Coordina la sincronización entre múltiples sesiones de Claude Code.
 * Polling constante para detectar cambios y notificar a las sesiones.
 */

const SessionLockManager = require('./session-lock');
const fs = require('fs').promises;
const path = require('path');

class SyncCoordinator {
  constructor(sessionId, options = {}) {
    this.sessionId = sessionId;
    this.lockManager = new SessionLockManager(sessionId);
    this.pollInterval = options.pollInterval || 2000; // 2 segundos
    this.isPolling = false;
    this.lastMetadataChecksum = null;
    this.callbacks = {
      onMetadataChange: null,
      onConflict: null,
      onOtherSessionActivity: null
    };
  }

  /**
   * Iniciar polling
   */
  startPolling() {
    if (this.isPolling) {
      console.log('⚠️ Polling ya está activo');
      return;
    }

    console.log(`🔄 [SYNC] Iniciando polling (cada ${this.pollInterval}ms)`);
    this.isPolling = true;

    this.pollingInterval = setInterval(async () => {
      await this.poll();
    }, this.pollInterval);

    // Enviar heartbeat inicial
    this.heartbeatInterval = setInterval(async () => {
      await this.lockManager.sendHeartbeat();
    }, 10000); // Cada 10 segundos
  }

  /**
   * Detener polling
   */
  stopPolling() {
    if (!this.isPolling) return;

    console.log('🛑 [SYNC] Deteniendo polling');
    clearInterval(this.pollingInterval);
    clearInterval(this.heartbeatInterval);
    this.isPolling = false;
  }

  /**
   * Poll (verificar cambios)
   */
  async poll() {
    try {
      // Verificar cambios en metadata
      const metadataChange = await this.lockManager.detectMetadataChange();

      if (metadataChange.changed) {
        console.log('🔔 [SYNC] Metadata cambió, notificando...');

        if (this.callbacks.onMetadataChange) {
          this.callbacks.onMetadataChange({
            last_modified_by: metadataChange.last_modified_by,
            last_modified: metadataChange.last_modified
          });
        }

        // Actualizar checksum local
        await this.lockManager.updateMetadataChecksum();
      }

      // Verificar actividad de otras sesiones
      const state = await this.lockManager.readState();
      const otherSessions = Object.keys(state.sessions)
        .filter(id => id !== this.sessionId)
        .map(id => state.sessions[id])
        .filter(session => session.active && session.status === 'working');

      if (otherSessions.length > 0 && this.callbacks.onOtherSessionActivity) {
        this.callbacks.onOtherSessionActivity(otherSessions);
      }

    } catch (error) {
      console.error('❌ [SYNC] Error en polling:', error.message);
    }
  }

  /**
   * Registrar callback para cambios en metadata
   */
  onMetadataChange(callback) {
    this.callbacks.onMetadataChange = callback;
  }

  /**
   * Registrar callback para conflictos
   */
  onConflict(callback) {
    this.callbacks.onConflict = callback;
  }

  /**
   * Registrar callback para actividad de otras sesiones
   */
  onOtherSessionActivity(callback) {
    this.callbacks.onOtherSessionActivity = callback;
  }

  /**
   * Adquirir lock (wrapper)
   */
  async acquireLock(filePath, reason) {
    return await this.lockManager.acquireLock(filePath, reason);
  }

  /**
   * Liberar lock (wrapper)
   */
  async releaseLock(filePath) {
    return await this.lockManager.releaseLock(filePath);
  }

  /**
   * Verificar si archivo está locked (wrapper)
   */
  async isLocked(filePath) {
    return await this.lockManager.isLocked(filePath);
  }

  /**
   * Obtener estado de todas las sesiones
   */
  async getAllSessions() {
    const state = await this.lockManager.readState();
    return state.sessions;
  }

  /**
   * Obtener locks activos
   */
  async getActiveLocks() {
    const state = await this.lockManager.readState();
    const activeLocks = {};

    for (const [filePath, lock] of Object.entries(state.locks)) {
      if (lock.locked_by) {
        activeLocks[filePath] = lock;
      }
    }

    return activeLocks;
  }

  /**
   * Obtener historial de conflictos
   */
  async getConflictLog() {
    const state = await this.lockManager.readState();
    return state.conflict_log || [];
  }
}

// Exportar
module.exports = SyncCoordinator;

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const sessionId = args[1] || 'session-frontend';

  const coordinator = new SyncCoordinator(sessionId);

  (async () => {
    switch (command) {
      case 'start':
        console.log('🚀 Iniciando coordinador de sincronización...');

        coordinator.onMetadataChange((data) => {
          console.log('🔔 Metadata cambió:', data);
        });

        coordinator.onOtherSessionActivity((sessions) => {
          console.log('👥 Otras sesiones activas:', sessions.map(s => s.id));
        });

        coordinator.startPolling();

        // Mantener el proceso corriendo
        console.log('✅ Coordinador activo. Presiona Ctrl+C para detener.');
        process.on('SIGINT', () => {
          console.log('\n🛑 Deteniendo coordinador...');
          coordinator.stopPolling();
          process.exit(0);
        });
        break;

      case 'status':
        const sessions = await coordinator.getAllSessions();
        console.log('\n📊 Estado de sesiones:');
        console.log(JSON.stringify(sessions, null, 2));

        const locks = await coordinator.getActiveLocks();
        console.log('\n🔒 Locks activos:');
        console.log(JSON.stringify(locks, null, 2));
        break;

      case 'conflicts':
        const conflicts = await coordinator.getConflictLog();
        console.log('\n⚠️ Historial de conflictos:');
        console.log(JSON.stringify(conflicts, null, 2));
        break;

      default:
        console.log(`
Usage:
  node sync-coordinator.js start <sessionId>    - Iniciar coordinador
  node sync-coordinator.js status <sessionId>   - Ver estado
  node sync-coordinator.js conflicts <sessionId> - Ver conflictos
        `);
    }
  })();
}
