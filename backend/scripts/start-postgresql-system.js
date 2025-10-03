#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');

/**
 * PostgreSQL High-Concurrency System Startup Script
 * Handles migration, optimization, and system startup
 */

class PostgreSQLSystemStarter {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.logFile = path.join(this.projectRoot, 'logs', 'startup.log');
    this.pidFile = path.join(this.projectRoot, 'postgresql-system.pid');
    
    this.services = {
      postgresql: { status: 'stopped', pid: null },
      redis: { status: 'stopped', pid: null },
      application: { status: 'stopped', pid: null },
      batch_processor: { status: 'stopped', pid: null }
    };
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    console.log(logEntry.trim());
    
    try {
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  async checkPrerequisites() {
    await this.log('🔍 Checking system prerequisites...');
    
    const checks = [
      { name: 'Node.js', command: 'node --version', required: true },
      { name: 'PostgreSQL', command: 'pg_config --version', required: true },
      { name: 'Redis', command: 'redis-cli --version', required: false },
      { name: 'Git', command: 'git --version', required: false }
    ];

    const results = [];
    
    for (const check of checks) {
      try {
        const output = execSync(check.command, { encoding: 'utf8' }).trim();
        results.push({ ...check, status: 'available', version: output });
        await this.log(`✅ ${check.name}: ${output}`);
      } catch (error) {
        results.push({ ...check, status: 'missing', error: error.message });
        
        if (check.required) {
          await this.log(`❌ ${check.name}: REQUIRED but not found`, 'ERROR');
          throw new Error(`Required dependency ${check.name} not found`);
        } else {
          await this.log(`⚠️ ${check.name}: Optional dependency not found`, 'WARN');
        }
      }
    }
    
    return results;
  }

  async setupEnvironment() {
    await this.log('⚙️ Setting up environment configuration...');
    
    // Copy PostgreSQL environment config
    const envSource = path.join(this.projectRoot, '.env.postgresql');
    const envTarget = path.join(this.projectRoot, '.env');
    
    try {
      await fs.access(envSource);
      await fs.copyFile(envSource, envTarget);
      await this.log('✅ PostgreSQL environment configuration activated');
    } catch (error) {
      await this.log(`❌ Failed to setup environment: ${error.message}`, 'ERROR');
      throw error;
    }

    // Create necessary directories
    const directories = [
      'logs',
      'uploads',
      'backups',
      'temp',
      'cache'
    ];

    for (const dir of directories) {
      const dirPath = path.join(this.projectRoot, dir);
      try {
        await fs.mkdir(dirPath, { recursive: true });
        await this.log(`📁 Created directory: ${dir}`);
      } catch (error) {
        await this.log(`⚠️ Directory creation warning for ${dir}: ${error.message}`, 'WARN');
      }
    }
  }

  async installDependencies() {
    await this.log('📦 Installing/updating dependencies...');
    
    try {
      // Check if package.json exists
      await fs.access(path.join(this.projectRoot, 'package.json'));
      
      // Install dependencies
      execSync('npm install --production', { 
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      
      await this.log('✅ Dependencies installed successfully');
    } catch (error) {
      await this.log(`❌ Failed to install dependencies: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async initializeDatabase() {
    await this.log('🗃️ Initializing PostgreSQL database...');
    
    try {
      // Run migration script
      const migrationScript = path.join(this.projectRoot, 'scripts', 'postgresql-migration.js');
      
      await this.log('Running database migration...');
      execSync(`node "${migrationScript}"`, {
        cwd: this.projectRoot,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      await this.log('✅ Database migration completed');
    } catch (error) {
      await this.log(`❌ Database initialization failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async startPostgreSQL() {
    await this.log('🚀 Starting PostgreSQL service...');
    
    try {
      // Check if PostgreSQL is already running
      try {
        execSync('pg_isready', { stdio: 'ignore' });
        await this.log('✅ PostgreSQL is already running');
        this.services.postgresql.status = 'running';
        return;
      } catch (error) {
        // PostgreSQL not running, need to start it
      }

      // Start PostgreSQL (command varies by OS)
      const platform = process.platform;
      let startCommand;

      switch (platform) {
        case 'win32':
          startCommand = 'net start postgresql-x64-13'; // Adjust version as needed
          break;
        case 'linux':
          startCommand = 'sudo systemctl start postgresql';
          break;
        case 'darwin':
          startCommand = 'brew services start postgresql';
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      execSync(startCommand, { stdio: 'inherit' });
      
      // Wait for PostgreSQL to be ready
      let retries = 10;
      while (retries > 0) {
        try {
          execSync('pg_isready', { stdio: 'ignore' });
          break;
        } catch (error) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          retries--;
        }
      }

      if (retries === 0) {
        throw new Error('PostgreSQL failed to start within timeout period');
      }

      this.services.postgresql.status = 'running';
      await this.log('✅ PostgreSQL service started');
    } catch (error) {
      await this.log(`❌ Failed to start PostgreSQL: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async startRedis() {
    await this.log('🗄️ Starting Redis service...');
    
    try {
      // Check if Redis is already running
      try {
        execSync('redis-cli ping', { stdio: 'ignore' });
        await this.log('✅ Redis is already running');
        this.services.redis.status = 'running';
        return;
      } catch (error) {
        // Redis not running
      }

      // Start Redis (command varies by OS)
      const platform = process.platform;
      let startCommand;

      switch (platform) {
        case 'win32':
          startCommand = 'redis-server --service-start';
          break;
        case 'linux':
          startCommand = 'sudo systemctl start redis';
          break;
        case 'darwin':
          startCommand = 'brew services start redis';
          break;
        default:
          await this.log('⚠️ Redis auto-start not supported on this platform', 'WARN');
          return;
      }

      execSync(startCommand, { stdio: 'inherit' });
      
      // Wait for Redis to be ready
      let retries = 5;
      while (retries > 0) {
        try {
          execSync('redis-cli ping', { stdio: 'ignore' });
          break;
        } catch (error) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries--;
        }
      }

      this.services.redis.status = 'running';
      await this.log('✅ Redis service started');
    } catch (error) {
      await this.log(`⚠️ Redis start warning: ${error.message}`, 'WARN');
      // Redis is optional, continue without it
    }
  }

  async startBatchProcessor() {
    await this.log('⚙️ Starting batch processor...');
    
    try {
      const batchProcessorScript = path.join(this.projectRoot, 'src', 'services', 'batch-processor.js');
      
      // Check if batch processor script exists
      try {
        await fs.access(batchProcessorScript);
      } catch (error) {
        // Create basic batch processor if it doesn't exist
        await this.createBatchProcessor();
      }

      const batchProcess = spawn('node', [batchProcessorScript], {
        cwd: this.projectRoot,
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore'],
        env: { ...process.env, NODE_ENV: 'production' }
      });

      batchProcess.unref();
      
      this.services.batch_processor.status = 'running';
      this.services.batch_processor.pid = batchProcess.pid;
      
      await this.log(`✅ Batch processor started (PID: ${batchProcess.pid})`);
    } catch (error) {
      await this.log(`❌ Failed to start batch processor: ${error.message}`, 'ERROR');
    }
  }

  async createBatchProcessor() {
    const batchProcessorContent = `
const { connectionPoolManager } = require('../config/connection-pool-manager');

/**
 * High-Concurrency Batch Processor
 * Processes attendance batches in the background
 */

class BatchProcessor {
  constructor() {
    this.isRunning = false;
    this.db = null;
    this.processInterval = parseInt(process.env.BATCH_PROCESSING_INTERVAL) || 5000;
    this.batchSize = parseInt(process.env.BATCH_PROCESSING_SIZE) || 1000;
  }

  async start() {
    console.log('🚀 Starting batch processor...');
    
    this.db = connectionPoolManager.createOptimizedPool({
      name: 'batch_processor',
      maxConnections: 20,
      minConnections: 5
    });

    await this.db.authenticate();
    console.log('✅ Batch processor database connected');

    this.isRunning = true;
    this.processingLoop();
    
    console.log(\`🔄 Batch processor running (interval: \${this.processInterval}ms)\`);
  }

  async processingLoop() {
    while (this.isRunning) {
      try {
        await this.processPendingBatches();
        await new Promise(resolve => setTimeout(resolve, this.processInterval));
      } catch (error) {
        console.error('❌ Batch processing error:', error.message);
        await new Promise(resolve => setTimeout(resolve, this.processInterval * 2));
      }
    }
  }

  async processPendingBatches() {
    const [pendingBatches] = await this.db.query(\`
      SELECT * FROM attendance_batches 
      WHERE status = 'pending' 
      ORDER BY priority ASC, created_at ASC 
      LIMIT ?
    \`, {
      replacements: [this.batchSize],
      type: this.db.QueryTypes.SELECT
    });

    if (pendingBatches.length === 0) return;

    console.log(\`📦 Processing \${pendingBatches.length} batches...\`);

    for (const batch of pendingBatches) {
      try {
        await this.processBatch(batch);
      } catch (error) {
        console.error(\`❌ Failed to process batch \${batch.id}:\`, error.message);
      }
    }
  }

  async processBatch(batch) {
    // Implementation would go here
    // This is a placeholder for the actual batch processing logic
    
    await this.db.query(\`
      UPDATE attendance_batches 
      SET status = 'completed', processed_at = NOW() 
      WHERE id = ?
    \`, {
      replacements: [batch.id],
      type: this.db.QueryTypes.UPDATE
    });
  }

  async stop() {
    console.log('🛑 Stopping batch processor...');
    this.isRunning = false;
    
    if (this.db) {
      await this.db.close();
    }
    
    console.log('✅ Batch processor stopped');
  }
}

const processor = new BatchProcessor();

// Graceful shutdown
process.on('SIGTERM', () => processor.stop());
process.on('SIGINT', () => processor.stop());

// Start processor
processor.start().catch(console.error);
`;

    const batchProcessorPath = path.join(this.projectRoot, 'src', 'services', 'batch-processor.js');
    
    await fs.mkdir(path.dirname(batchProcessorPath), { recursive: true });
    await fs.writeFile(batchProcessorPath, batchProcessorContent.trim());
    
    await this.log('📝 Created batch processor service');
  }

  async startApplication() {
    await this.log('🚀 Starting main application...');
    
    try {
      // Use working-server.js as the main entry point
      const serverScript = path.join(this.projectRoot, 'working-server.js');
      
      const appProcess = spawn('node', [serverScript], {
        cwd: this.projectRoot,
        detached: false, // Keep attached for main process
        stdio: 'inherit',
        env: { 
          ...process.env, 
          NODE_ENV: 'production',
          USE_POSTGRESQL: 'true'
        }
      });

      this.services.application.status = 'running';
      this.services.application.pid = appProcess.pid;
      
      // Save PID for later reference
      await fs.writeFile(this.pidFile, appProcess.pid.toString());
      
      await this.log(\`✅ Application started (PID: \${appProcess.pid})\`);
      
      // Handle process events
      appProcess.on('exit', (code) => {
        this.log(\`⚠️ Application exited with code: \${code}\`, code === 0 ? 'INFO' : 'ERROR');
        this.services.application.status = 'stopped';
      });

      appProcess.on('error', (error) => {
        this.log(\`❌ Application error: \${error.message}\`, 'ERROR');
        this.services.application.status = 'error';
      });

      return appProcess;
    } catch (error) {
      await this.log(\`❌ Failed to start application: \${error.message}\`, 'ERROR');
      throw error;
    }
  }

  async createSystemdService() {
    if (process.platform !== 'linux') {
      await this.log('⚠️ Systemd service creation only supported on Linux', 'WARN');
      return;
    }

    const serviceContent = \`[Unit]
Description=PostgreSQL High-Concurrency Attendance System
After=network.target postgresql.service

[Service]
Type=forking
User=\${process.env.USER || 'attendance'}
WorkingDirectory=\${this.projectRoot}
ExecStart=\${process.execPath} \${__filename} start
ExecStop=\${process.execPath} \${__filename} stop
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
\`;

    try {
      const servicePath = '/etc/systemd/system/attendance-system.service';
      await fs.writeFile(servicePath, serviceContent);
      
      execSync('sudo systemctl daemon-reload');
      execSync('sudo systemctl enable attendance-system.service');
      
      await this.log('✅ Systemd service created and enabled');
      await this.log(\`   To start: sudo systemctl start attendance-system\`);
      await this.log(\`   To check status: sudo systemctl status attendance-system\`);
    } catch (error) {
      await this.log(\`⚠️ Failed to create systemd service: \${error.message}\`, 'WARN');
    }
  }

  async getSystemStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      services: { ...this.services },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuCount: require('os').cpus().length,
        loadAverage: require('os').loadavg()
      }
    };

    return status;
  }

  async printStatus() {
    const status = await this.getSystemStatus();
    
    console.log('\\n📊 SYSTEM STATUS:');
    console.log('================');
    console.log(\`Timestamp: \${status.timestamp}\`);
    console.log(\`Platform: \${status.system.platform}\`);
    console.log(\`Node.js: \${status.system.nodeVersion}\`);
    console.log(\`Uptime: \${Math.round(status.system.uptime)}s\`);
    console.log('\\n🔧 SERVICES:');
    
    Object.entries(status.services).forEach(([name, service]) => {
      const statusIcon = service.status === 'running' ? '✅' : 
                        service.status === 'stopped' ? '⭕' : '❌';
      const pidInfo = service.pid ? \` (PID: \${service.pid})\` : '';
      console.log(\`  \${statusIcon} \${name}: \${service.status}\${pidInfo}\`);
    });
    
    console.log('\\n');
  }

  async stop() {
    await this.log('🛑 Stopping PostgreSQL High-Concurrency System...');
    
    // Stop batch processor
    if (this.services.batch_processor.pid) {
      try {
        process.kill(this.services.batch_processor.pid, 'SIGTERM');
        await this.log('✅ Batch processor stopped');
      } catch (error) {
        await this.log(\`⚠️ Error stopping batch processor: \${error.message}\`, 'WARN');
      }
    }

    // Stop main application
    if (this.services.application.pid) {
      try {
        process.kill(this.services.application.pid, 'SIGTERM');
        await this.log('✅ Application stopped');
      } catch (error) {
        await this.log(\`⚠️ Error stopping application: \${error.message}\`, 'WARN');
      }
    }

    // Clean up PID file
    try {
      await fs.unlink(this.pidFile);
    } catch (error) {
      // PID file might not exist
    }

    await this.log('✅ System stopped');
  }

  async start() {
    try {
      await this.log('🚀 Starting PostgreSQL High-Concurrency Attendance System...');
      
      // Pre-flight checks
      await this.checkPrerequisites();
      await this.setupEnvironment();
      await this.installDependencies();
      
      // Start services in order
      await this.startPostgreSQL();
      await this.startRedis();
      await this.initializeDatabase();
      await this.startBatchProcessor();
      
      // Start main application
      const appProcess = await this.startApplication();
      
      // Print final status
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for services to fully start
      await this.printStatus();
      
      await this.log('🎉 System startup completed successfully!');
      await this.log(\`🌐 Application should be available at http://localhost:\${process.env.PORT || 3001}\`);
      
      // Create systemd service for Linux
      await this.createSystemdService();
      
      return appProcess;
      
    } catch (error) {
      await this.log(\`❌ System startup failed: \${error.message}\`, 'ERROR');
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const starter = new PostgreSQLSystemStarter();
  const command = process.argv[2] || 'start';
  
  try {
    switch (command) {
      case 'start':
        await starter.start();
        break;
        
      case 'stop':
        await starter.stop();
        break;
        
      case 'status':
        await starter.printStatus();
        break;
        
      case 'restart':
        await starter.stop();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await starter.start();
        break;
        
      default:
        console.log('Usage: node start-postgresql-system.js [start|stop|status|restart]');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PostgreSQLSystemStarter;