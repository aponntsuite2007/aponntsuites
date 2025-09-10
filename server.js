 const express = require('express');
  require('dotenv').config();

  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middlewares básicos
  app.use(express.json());
  app.use(express.static('public'));

  console.log('🚀 Starting AponntSuites...');

  // Datos simulados en memoria (temporal)
  let users = [
    { id: 1, name: 'Admin', email: 'admin@aponntsuites.com' },
    { id: 2, name: 'Juan Pérez', email: 'juan@empresa.com' }
  ];

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
          .feature {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            margin: 10px;
            border-radius: 10px;
            display: inline-block;
            width: 200px;
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
            <p>💾 Datos: En memoria (temporal)</p>
            <p>👥 Usuarios registrados: ${users.length}</p>
          </div>

          <div>
            <a href="/api/health" class="btn">🔧 Estado del Sistema</a>
            <a href="/admin" class="btn">📊 Panel Admin</a>
            <a href="/api/users" class="btn">👥 Ver Usuarios</a>
          </div>

          <div style="margin-top: 40px;">
            <div class="feature">
              <h3>👥 Gestión Personal</h3>
              <p>Control de empleados</p>
            </div>
            <div class="feature">
              <h3>📝 Asistencia</h3>
              <p>Registro biométrico</p>
            </div>
            <div class="feature">
              <h3>📊 Reportes</h3>
              <p>Analytics avanzados</p>
            </div>
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
      database: 'memory',
      users_count: users.length,
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/users', (req, res) => {
    res.json({
      success: true,
      users: users,
      total: users.length
    });
  });

  app.get('/admin', (req, res) => {
    res.send(`
      <h1>Panel Admin - AponntSuites</h1>
      <h2>Usuarios:</h2>
      <ul>
        ${users.map(user => `<li>${user.name} - ${user.email}</li>`).join('')}
      </ul>
      <a href="/">← Volver</a>
    `);
  });

  // Iniciar servidor
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AponntSuites running on port ${PORT}`);
    console.log(`✅ System ready with ${users.length} users in memory`);
  });
