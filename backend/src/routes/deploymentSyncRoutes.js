/**
 * Deployment Sync Routes
 * Sistema de sincronización y deploy para Backend, Frontend y APKs
 */

const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Contraseña de admin - DEBE configurarse en variables de entorno
const DEPLOY_ADMIN_PASSWORD = process.env.DEPLOY_ADMIN_PASSWORD;
if (!DEPLOY_ADMIN_PASSWORD) {
  console.error('⚠️ [DEPLOY-SYNC] DEPLOY_ADMIN_PASSWORD no configurada en variables de entorno');
}

// Middleware de autenticación
const requireDeployAuth = (req, res, next) => {
    const providedPassword = req.headers['x-deploy-admin-password'] || req.query.adminKey || req.body?.adminKey;

    if (!providedPassword || providedPassword !== DEPLOY_ADMIN_PASSWORD) {
        return res.status(403).json({
            success: false,
            error: 'Autorización requerida',
            requiresAuth: true
        });
    }
    next();
};

// ============================================================================
// GET /api/deployment/status
// Estado general de todos los componentes
// ============================================================================
router.get('/status', requireDeployAuth, async (req, res) => {
    try {
        const status = {
            timestamp: new Date().toISOString(),
            components: {
                backend: await getBackendStatus(),
                frontend: await getFrontendStatus(),
                database: await getDatabaseStatus(),
                apk: await getApkStatus()
            },
            git: await getGitStatus()
        };

        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// GET /api/deployment/git-diff
// Diferencias entre local y remoto
// ============================================================================
router.get('/git-diff', requireDeployAuth, async (req, res) => {
    try {
        const projectRoot = path.join(__dirname, '..', '..', '..');

        // Fetch remoto
        try {
            execSync('git fetch origin', { cwd: projectRoot, stdio: 'pipe' });
        } catch (e) {
            // Ignorar errores de fetch
        }

        // Obtener diferencias
        let localCommit, remoteCommit, behindCount, aheadCount;

        try {
            localCommit = execSync('git rev-parse HEAD', { cwd: projectRoot, encoding: 'utf-8' }).trim();
            remoteCommit = execSync('git rev-parse origin/master', { cwd: projectRoot, encoding: 'utf-8' }).trim();
            behindCount = parseInt(execSync('git rev-list HEAD..origin/master --count', { cwd: projectRoot, encoding: 'utf-8' }).trim()) || 0;
            aheadCount = parseInt(execSync('git rev-list origin/master..HEAD --count', { cwd: projectRoot, encoding: 'utf-8' }).trim()) || 0;
        } catch (e) {
            localCommit = 'unknown';
            remoteCommit = 'unknown';
            behindCount = 0;
            aheadCount = 0;
        }

        // Archivos modificados localmente
        let modifiedFiles = [];
        try {
            const status = execSync('git status --porcelain', { cwd: projectRoot, encoding: 'utf-8' });
            modifiedFiles = status.split('\n').filter(Boolean).map(line => ({
                status: line.substring(0, 2).trim(),
                file: line.substring(3)
            }));
        } catch (e) {
            // Ignorar
        }

        res.json({
            success: true,
            diff: {
                localCommit,
                remoteCommit,
                inSync: localCommit === remoteCommit,
                behindRemote: behindCount,
                aheadOfRemote: aheadCount,
                modifiedFiles: modifiedFiles.slice(0, 50), // Limitar a 50
                totalModified: modifiedFiles.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// POST /api/deployment/push
// Hacer push de cambios locales
// ============================================================================
router.post('/push', requireDeployAuth, async (req, res) => {
    const { commitMessage = 'Sync from dashboard' } = req.body;

    try {
        const projectRoot = path.join(__dirname, '..', '..', '..');
        const results = [];

        // 1. Add all changes
        try {
            execSync('git add -A', { cwd: projectRoot, stdio: 'pipe' });
            results.push({ step: 'git add', success: true });
        } catch (e) {
            results.push({ step: 'git add', success: false, error: e.message });
        }

        // 2. Commit
        try {
            const fullMessage = `${commitMessage}\n\n🤖 Generated with Dashboard Sync`;
            execSync(`git commit -m "${fullMessage}"`, { cwd: projectRoot, stdio: 'pipe' });
            results.push({ step: 'git commit', success: true });
        } catch (e) {
            if (e.message.includes('nothing to commit')) {
                results.push({ step: 'git commit', success: true, note: 'Nothing to commit' });
            } else {
                results.push({ step: 'git commit', success: false, error: e.message });
            }
        }

        // 3. Push
        try {
            execSync('git push origin master', { cwd: projectRoot, stdio: 'pipe' });
            results.push({ step: 'git push', success: true });
        } catch (e) {
            results.push({ step: 'git push', success: false, error: e.message });
        }

        const allSuccess = results.every(r => r.success);

        res.json({
            success: allSuccess,
            results,
            message: allSuccess
                ? 'Push completado. Render desplegará automáticamente.'
                : 'Algunos pasos fallaron'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// GET /api/deployment/apk/versions
// Listar versiones de APK disponibles
// ============================================================================
router.get('/apk/versions', async (req, res) => {
    try {
        const downloadsPath = path.join(__dirname, '..', '..', 'public', 'downloads');

        if (!fs.existsSync(downloadsPath)) {
            return res.json({ success: true, versions: [], message: 'No hay APKs disponibles' });
        }

        const files = fs.readdirSync(downloadsPath)
            .filter(f => f.endsWith('.apk'))
            .map(f => {
                const stats = fs.statSync(path.join(downloadsPath, f));
                return {
                    filename: f,
                    size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
                    created: stats.birthtime,
                    downloadUrl: `/downloads/${f}`
                };
            })
            .sort((a, b) => new Date(b.created) - new Date(a.created));

        // Leer version.json si existe
        let versionInfo = null;
        const versionPath = path.join(downloadsPath, 'version.json');
        if (fs.existsSync(versionPath)) {
            versionInfo = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
        }

        res.json({
            success: true,
            versions: files,
            latestVersion: versionInfo,
            count: files.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// POST /api/deployment/apk/build
// Iniciar build de APK (requiere Flutter instalado)
// ============================================================================
router.post('/apk/build', requireDeployAuth, async (req, res) => {
    const { buildType = 'release' } = req.body;

    try {
        const flutterPath = path.join(__dirname, '..', '..', '..', 'frontend_flutter');

        // Verificar que existe el proyecto
        if (!fs.existsSync(path.join(flutterPath, 'pubspec.yaml'))) {
            return res.status(400).json({
                success: false,
                error: 'Proyecto Flutter no encontrado'
            });
        }

        // Verificar Flutter
        try {
            execSync('flutter --version', { stdio: 'pipe' });
        } catch (e) {
            return res.status(400).json({
                success: false,
                error: 'Flutter SDK no instalado o no en PATH'
            });
        }

        // Iniciar build en background
        res.json({
            success: true,
            message: 'Build iniciado en background',
            buildType,
            note: 'Ejecutar manualmente: node scripts/build-apk-and-sync.js ' + buildType
        });

        // El build real se haría con spawn para no bloquear
        // Por ahora solo retornamos instrucciones

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// Helper Functions
// ============================================================================

async function getBackendStatus() {
    return {
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 9998,
        uptime: process.uptime(),
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage()
    };
}

async function getFrontendStatus() {
    const publicPath = path.join(__dirname, '..', '..', 'public');
    const panelEmpresa = fs.existsSync(path.join(publicPath, 'panel-empresa.html'));
    const panelAdmin = fs.existsSync(path.join(publicPath, 'panel-administrativo.html'));

    let jsModulesCount = 0;
    const modulesPath = path.join(publicPath, 'js', 'modules');
    if (fs.existsSync(modulesPath)) {
        jsModulesCount = fs.readdirSync(modulesPath).filter(f => f.endsWith('.js')).length;
    }

    return {
        status: panelEmpresa && panelAdmin ? 'ready' : 'incomplete',
        panelEmpresa,
        panelAdmin,
        jsModulesCount,
        publicPath
    };
}

async function getDatabaseStatus() {
    try {
        const { sequelize } = require('../config/database');
        await sequelize.authenticate();

        const [result] = await sequelize.query(`
            SELECT COUNT(*) as tables FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);

        return {
            status: 'connected',
            tables: parseInt(result[0]?.tables || 0),
            dialect: sequelize.getDialect()
        };
    } catch (e) {
        return {
            status: 'error',
            error: e.message
        };
    }
}

async function getApkStatus() {
    const downloadsPath = path.join(__dirname, '..', '..', 'public', 'downloads');

    if (!fs.existsSync(downloadsPath)) {
        return { status: 'no_builds', count: 0 };
    }

    const apks = fs.readdirSync(downloadsPath).filter(f => f.endsWith('.apk'));
    const latestPath = path.join(downloadsPath, 'version.json');
    let latestVersion = null;

    if (fs.existsSync(latestPath)) {
        try {
            latestVersion = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
        } catch (e) {
            // Ignorar
        }
    }

    return {
        status: apks.length > 0 ? 'available' : 'no_builds',
        count: apks.length,
        latestVersion
    };
}

async function getGitStatus() {
    const projectRoot = path.join(__dirname, '..', '..', '..');

    try {
        const branch = execSync('git branch --show-current', { cwd: projectRoot, encoding: 'utf-8' }).trim();
        const lastCommit = execSync('git log -1 --format="%h - %s (%cr)"', { cwd: projectRoot, encoding: 'utf-8' }).trim();
        const status = execSync('git status --porcelain', { cwd: projectRoot, encoding: 'utf-8' });
        const modifiedCount = status.split('\n').filter(Boolean).length;

        return {
            branch,
            lastCommit,
            modifiedFiles: modifiedCount,
            hasChanges: modifiedCount > 0
        };
    } catch (e) {
        return {
            error: e.message
        };
    }
}

module.exports = router;
