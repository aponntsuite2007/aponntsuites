/**
 * ============================================================================
 * SESSION LOCK MANAGER
 * ============================================================================
 *
 * Sistema de locks para coordinar múltiples sesiones de Claude Code
 * trabajando simultáneamente en el mismo proyecto.
 *
 * Previene conflictos de escritura y sincroniza cambios entre sesiones.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const STATE_FILE = path.join(__dirname, '../.coordination/session-state.json');
const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutos

class SessionLockManager {
  constructor(sessionId) {
    this.sessionId = sessionId;
  }

  /**
   * Leer estado actual
   */
  async readState() {
    try {
      const data = await fs.readFile(STATE_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error leyendo session-state.json:', error.message);
      throw error;
    }
  }

  /**
   * Escribir estado
   */
  async writeState(state) {
    try {
      await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Error escribiendo session-state.json:', error.message);
      throw error;
    }
  }

  /**
   * Adquirir lock sobre un archivo
   */
  async acquireLock(filePath, reason = 'Editing') {
    const state = await this.readState();
    const lock = state.locks[filePath];

    // Verificar si ya está locked
    if (lock && lock.locked_by) {
      // Verificar si el lock expiró
      const now = Date.now();
      const expiresAt = new Date(lock.expires_at).getTime();

      if (now < expiresAt && lock.locked_by !== this.sessionId) {
        return {
          success: false,
          message: `File locked by ${lock.locked_by}`,
          locked_by: lock.locked_by,
          expires_at: lock.expires_at
        };
      }
    }

    // Adquirir lock
    state.locks[filePath] = {
      locked_by: this.sessionId,
      locked_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + LOCK_TIMEOUT).toISOString(),
      reason
    };

    // Actualizar sesión
    if (state.sessions[this.sessionId]) {
      state.sessions[this.sessionId].status = 'working';
      state.sessions[this.sessionId].last_update = new Date().toISOString();
      if (!state.sessions[this.sessionId].working_on.includes(filePath)) {
        state.sessions[this.sessionId].working_on.push(filePath);
      }
    }

    await this.writeState(state);

    return {
      success: true,
      message: 'Lock acquired',
      expires_at: state.locks[filePath].expires_at
    };
  }

  /**
   * Liberar lock
   */
  async releaseLock(filePath) {
    const state = await this.readState();
    const lock = state.locks[filePath];

    if (!lock || lock.locked_by !== this.sessionId) {
      return {
        success: false,
        message: 'Lock not owned by this session'
      };
    }

    // Liberar lock
    state.locks[filePath] = {
      locked_by: null,
      locked_at: null,
      expires_at: null,
      reason: null
    };

    // Actualizar sesión
    if (state.sessions[this.sessionId]) {
      state.sessions[this.sessionId].working_on = state.sessions[this.sessionId].working_on.filter(
        f => f !== filePath
      );

      if (state.sessions[this.sessionId].working_on.length === 0) {
        state.sessions[this.sessionId].status = 'idle';
      }
    }

    await this.writeState(state);

    return {
      success: true,
      message: 'Lock released'
    };
  }

  /**
   * Verificar si un archivo está locked
   */
  async isLocked(filePath) {
    const state = await this.readState();
    const lock = state.locks[filePath];

    if (!lock || !lock.locked_by) {
      return { locked: false };
    }

    // Verificar si expiró
    const now = Date.now();
    const expiresAt = new Date(lock.expires_at).getTime();

    if (now >= expiresAt) {
      // Lock expirado, liberarlo automáticamente
      await this.releaseLock(filePath);
      return { locked: false };
    }

    return {
      locked: true,
      locked_by: lock.locked_by,
      expires_at: lock.expires_at,
      reason: lock.reason
    };
  }

  /**
   * Enviar heartbeat (indicar que la sesión está activa)
   */
  async sendHeartbeat() {
    const state = await this.readState();

    if (state.sessions[this.sessionId]) {
      state.sessions[this.sessionId].active = true;
      state.sessions[this.sessionId].last_heartbeat = new Date().toISOString();
    }

    await this.writeState(state);
  }

  /**
   * Actualizar checksum de engineering-metadata.js
   */
  async updateMetadataChecksum() {
    try {
      const metadataPath = path.join(__dirname, '../engineering-metadata.js');
      const content = await fs.readFile(metadataPath, 'utf8');
      const checksum = crypto.createHash('md5').update(content).digest('hex');

      const state = await this.readState();
      state.metadata_versions['engineering-metadata.js'] = {
        version: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        last_modified_by: this.sessionId,
        checksum
      };

      await this.writeState(state);

      return { success: true, checksum };
    } catch (error) {
      console.error('Error updating metadata checksum:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Detectar si metadata cambió
   */
  async detectMetadataChange() {
    try {
      const metadataPath = path.join(__dirname, '../engineering-metadata.js');
      const content = await fs.readFile(metadataPath, 'utf8');
      const currentChecksum = crypto.createHash('md5').update(content).digest('hex');

      const state = await this.readState();
      const stored = state.metadata_versions['engineering-metadata.js'];

      if (!stored || !stored.checksum) {
        return { changed: true, reason: 'No checksum stored' };
      }

      if (stored.checksum !== currentChecksum) {
        return {
          changed: true,
          last_modified_by: stored.last_modified_by,
          last_modified: stored.last_modified
        };
      }

      return { changed: false };
    } catch (error) {
      console.error('Error detecting metadata change:', error.message);
      return { changed: false, error: error.message };
    }
  }

  /**
   * Registrar conflicto
   */
  async logConflict(filePath, description) {
    const state = await this.readState();

    state.conflict_log.push({
      timestamp: new Date().toISOString(),
      session: this.sessionId,
      file: filePath,
      description
    });

    // Mantener solo los últimos 50 conflictos
    if (state.conflict_log.length > 50) {
      state.conflict_log = state.conflict_log.slice(-50);
    }

    await this.writeState(state);
  }
}

// Exportar
module.exports = SessionLockManager;

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const sessionId = args[1] || 'session-frontend';
  const filePath = args[2];

  const manager = new SessionLockManager(sessionId);

  (async () => {
    switch (command) {
      case 'acquire':
        const result = await manager.acquireLock(filePath, 'Manual lock');
        console.log(JSON.stringify(result, null, 2));
        break;

      case 'release':
        const releaseResult = await manager.releaseLock(filePath);
        console.log(JSON.stringify(releaseResult, null, 2));
        break;

      case 'check':
        const lockStatus = await manager.isLocked(filePath);
        console.log(JSON.stringify(lockStatus, null, 2));
        break;

      case 'heartbeat':
        await manager.sendHeartbeat();
        console.log('Heartbeat sent');
        break;

      case 'update-checksum':
        const checksumResult = await manager.updateMetadataChecksum();
        console.log(JSON.stringify(checksumResult, null, 2));
        break;

      case 'detect-change':
        const changeResult = await manager.detectMetadataChange();
        console.log(JSON.stringify(changeResult, null, 2));
        break;

      default:
        console.log(`
Usage:
  node session-lock.js acquire <sessionId> <filePath>
  node session-lock.js release <sessionId> <filePath>
  node session-lock.js check <sessionId> <filePath>
  node session-lock.js heartbeat <sessionId>
  node session-lock.js update-checksum <sessionId>
  node session-lock.js detect-change <sessionId>
        `);
    }
  })();
}
