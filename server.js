 const express = require('express');
  const mysql = require('mysql2/promise');
  require('dotenv').config();

  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middlewares básicos
  app.use(express.json());
  app.use(express.static('public'));

  // Configuración de base de datos con URL completa
  const mysqlUrl = 'mysql://root:FEWWeVRNSWJuPwnFECjhwWNrKFbZeQBf@mysql.railway.internal:3306/railway';

  console.log('🚀 Starting AponntSuites...');
  console.log('📋 Using MySQL URL connection');

  // Conexión a base de datos
  let db = null;

  async function connectDB() {
    try {
      console.log('🔄 Connecting to database...');
      db = await mysql.createConnection(mysqlUrl);
      console.log('✅ Database connected successfully!');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      setTimeout(connectDB, 5000);
    }
  }

  connectDB();

  // Página principal
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AponntSuites - Sistema RRHH</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 50px;
          }
          .container { max-width: 800px; margin: 0 auto; }
          h1 { font-size: 3em; margin-bottom: 20px; }
          .status {
            background: rgba(255,255,255,0.2);
            padding: 30px;
            border-radius: 15px;
            margin: 30px 0;
          }
          .btn {
            display: inline-block;
            margin: 10px;
            padding: 15px 30px;
            background: rgba(255,255,255,0.2);
            color: white;
            text-decoration: none;
            border-radius: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎉 AponntSuites RRHH</h1>

          <div class="status">
            <h2>✅ Sistema funcionando correctamente</h2>
            <p>🌐 Puerto: ${PORT}</p>
            <p>🕐 Hora: ${new Date().toLocaleString('es-AR')}</p>
            <p>🔒 Base de datos: ${db ? 'Conectada ✅' : 'Desconectada ❌'}</p>
          </div>

          <div>
            <a href="/api/health" class="btn">🔧 Estado del Sistema</a>
            <a href="/admin" class="btn">📊 Panel Admin</a>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // API endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      database: db ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/admin', (req, res) => {
    res.send(`
      <h1>Panel Admin - AponntSuites</h1>
      <p>🚧 En desarrollo</p>
      <a href="/">← Volver</a>
    `);
  });

  // Iniciar servidor
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AponntSuites running on port ${PORT}`);
  });
