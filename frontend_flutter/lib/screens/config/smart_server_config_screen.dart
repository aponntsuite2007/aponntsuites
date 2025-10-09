import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/smart_auth_provider.dart';
import '../../config/dynamic_server_config.dart';

class SmartServerConfigScreen extends StatefulWidget {
  @override
  _SmartServerConfigScreenState createState() => _SmartServerConfigScreenState();
}

class _SmartServerConfigScreenState extends State<SmartServerConfigScreen>
    with SingleTickerProviderStateMixin {
  final _hostController = TextEditingController();
  final _portController = TextEditingController();
  String _selectedProtocol = 'http';
  bool _isLoading = false;
  String _statusMessage = '';
  List<ServerTestResult> _foundServers = [];
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadCurrentConfig();
  }

  @override
  void dispose() {
    _hostController.dispose();
    _portController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  void _loadCurrentConfig() {
    final auth = Provider.of<SmartAuthProvider>(context, listen: false);
    // Parsear la URL actual si existe
    final currentUrl = auth.baseUrl;
    final uri = Uri.tryParse(currentUrl);
    if (uri != null) {
      _hostController.text = uri.host;
      _portController.text = uri.port.toString();
      _selectedProtocol = uri.scheme;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<SmartAuthProvider>(
      builder: (context, auth, _) => Scaffold(
        appBar: AppBar(
          title: Text('Configuración de Servidor'),
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
          bottom: TabBar(
            controller: _tabController,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            indicatorColor: Colors.white,
            tabs: [
              Tab(icon: Icon(Icons.settings), text: 'Manual'),
              Tab(icon: Icon(Icons.search), text: 'Auto'),
              Tab(icon: Icon(Icons.cloud), text: 'Hosting'),
            ],
          ),
        ),
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildManualConfigTab(auth),
            _buildAutoDetectTab(auth),
            _buildHostingConfigTab(auth),
          ],
        ),
      ),
    );
  }

  Widget _buildManualConfigTab(SmartAuthProvider auth) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.settings, color: Colors.blue),
                      SizedBox(width: 8),
                      Text(
                        'Configuración Manual',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ],
                  ),
                  SizedBox(height: 16),
                  
                  Text('Protocolo:'),
                  SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _selectedProtocol,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.security),
                    ),
                    items: [
                      DropdownMenuItem(value: 'http', child: Text('HTTP')),
                      DropdownMenuItem(value: 'https', child: Text('HTTPS')),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _selectedProtocol = value!;
                      });
                    },
                  ),
                  
                  SizedBox(height: 16),
                  
                  Text('Host/Dirección IP:'),
                  SizedBox(height: 8),
                  TextField(
                    controller: _hostController,
                    decoration: InputDecoration(
                      labelText: 'Host',
                      hintText: 'localhost, 192.168.1.6, tu-dominio.com',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.computer),
                    ),
                  ),
                  
                  SizedBox(height: 16),
                  
                  Text('Puerto:'),
                  SizedBox(height: 8),
                  TextField(
                    controller: _portController,
                    decoration: InputDecoration(
                      labelText: 'Puerto',
                      hintText: '3001, 80, 443',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.settings_ethernet),
                    ),
                    keyboardType: TextInputType.number,
                  ),
                ],
              ),
            ),
          ),

          SizedBox(height: 20),

          // Botones de acción
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isLoading ? null : _testManualConnection,
              icon: _isLoading
                  ? SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(Icons.wifi_tethering),
              label: Text(_isLoading ? 'Probando...' : 'Probar Conexión'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),

          SizedBox(height: 12),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isLoading ? null : _saveManualConfig,
              icon: Icon(Icons.save),
              label: Text('Guardar y Aplicar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),

          _buildStatusCard(),
          _buildCurrentConfigCard(auth),
        ],
      ),
    );
  }

  Widget _buildAutoDetectTab(SmartAuthProvider auth) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.search, color: Colors.orange),
                      SizedBox(width: 8),
                      Text(
                        'Detección Automática',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ],
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Busca automáticamente servidores disponibles en la red local.',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
          ),

          SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isLoading ? null : _startAutoDetection,
              icon: _isLoading
                  ? SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(Icons.radar),
              label: Text(_isLoading ? 'Buscando...' : 'Iniciar Búsqueda'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange,
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),

          if (_foundServers.isNotEmpty) ...[
            SizedBox(height: 24),
            Text(
              'Servidores Encontrados:',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            SizedBox(height: 8),
            ...(_foundServers.map((server) => Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.green,
                  child: Icon(
                    server.protocol == 'https' ? Icons.security : Icons.lan,
                    color: Colors.white,
                  ),
                ),
                title: Text(server.displayName),
                subtitle: Text(server.message),
                trailing: ElevatedButton(
                  onPressed: () => _selectFoundServer(server),
                  child: Text('Usar'),
                ),
              ),
            )).toList()),
          ],

          _buildStatusCard(),
        ],
      ),
    );
  }

  Widget _buildHostingConfigTab(SmartAuthProvider auth) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.cloud, color: Colors.purple),
                      SizedBox(width: 8),
                      Text(
                        'Configuración para Hosting',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ],
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Configura para servidores en la nube o hosting web.',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
          ),

          SizedBox(height: 16),

          // Configuraciones rápidas para hosting común
          Text(
            'Configuraciones Rápidas:',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          SizedBox(height: 12),

          _buildQuickConfigCard(
            title: 'Hosting Web (HTTPS)',
            description: 'Para dominios con SSL',
            icon: Icons.https,
            color: Colors.green,
            onTap: () {
              _hostController.text = 'tu-dominio.com';
              _portController.text = '443';
              _selectedProtocol = 'https';
            },
          ),

          _buildQuickConfigCard(
            title: 'VPS/Servidor Dedicado',
            description: 'Para servidores con IP pública',
            icon: Icons.dns,
            color: Colors.blue,
            onTap: () {
              _hostController.text = '000.000.000.000';
              _portController.text = '3001';
              _selectedProtocol = 'http';
            },
          ),

          _buildQuickConfigCard(
            title: 'Localhost (Desarrollo)',
            description: 'Para pruebas locales',
            icon: Icons.computer,
            color: Colors.grey,
            onTap: () {
              _hostController.text = 'localhost';
              _portController.text = '3001';
              _selectedProtocol = 'http';
            },
          ),

          SizedBox(height: 20),

          Text('Dominio Personalizado:'),
          SizedBox(height: 8),
          TextField(
            controller: _hostController,
            decoration: InputDecoration(
              labelText: 'Dominio',
              hintText: 'miempresa.com, app.midominio.net',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.language),
            ),
          ),

          SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isLoading ? null : _testHostingConfig,
              icon: Icon(Icons.cloud_done),
              label: Text('Probar y Configurar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.purple,
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),

          _buildStatusCard(),
        ],
      ),
    );
  }

  Widget _buildQuickConfigCard({
    required String title,
    required String description,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: color,
                child: Icon(icon, color: Colors.white),
              ),
              SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: TextStyle(fontWeight: FontWeight.bold)),
                    Text(description, style: TextStyle(color: Colors.grey[600])),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusCard() {
    if (_statusMessage.isEmpty) return SizedBox.shrink();

    return Container(
      margin: EdgeInsets.symmetric(vertical: 16),
      child: Card(
        color: _statusMessage.contains('✅') ? Colors.green.shade50 : Colors.red.shade50,
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(
                _statusMessage.contains('✅') ? Icons.check_circle : Icons.error,
                color: _statusMessage.contains('✅') ? Colors.green : Colors.red,
              ),
              SizedBox(width: 12),
              Expanded(child: Text(_statusMessage)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCurrentConfigCard(SmartAuthProvider auth) {
    return Card(
      color: Colors.grey.shade50,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Configuración Actual:', style: Theme.of(context).textTheme.titleSmall),
            SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  auth.isConnected ? Icons.wifi : Icons.wifi_off,
                  color: auth.isConnected ? Colors.green : Colors.red,
                  size: 16,
                ),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    auth.isConnected
                        ? 'Conectado a: ${auth.serverInfo}'
                        : 'Sin conexión: ${auth.lastConnectionError ?? "Servidor no configurado"}',
                    style: TextStyle(
                      color: auth.isConnected ? Colors.green : Colors.red,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 4),
            Text('URL API: ${auth.apiBaseUrl}', style: TextStyle(fontSize: 12)),
          ],
        ),
      ),
    );
  }

  Future<void> _testManualConnection() async {
    if (_hostController.text.isEmpty || _portController.text.isEmpty) {
      setState(() {
        _statusMessage = '❌ Por favor completa host y puerto';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _statusMessage = 'Probando conexión...';
    });

    try {
      final result = await DynamicServerConfig.testConnection(
        _hostController.text,
        int.parse(_portController.text),
        protocol: _selectedProtocol,
      );

      setState(() {
        _statusMessage = result.success
            ? '✅ ${result.message}'
            : '❌ ${result.message}';
      });
    } catch (e) {
      setState(() {
        _statusMessage = '❌ Error: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _saveManualConfig() async {
    if (_hostController.text.isEmpty || _portController.text.isEmpty) {
      setState(() {
        _statusMessage = '❌ Por favor completa todos los campos';
      });
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final auth = Provider.of<SmartAuthProvider>(context, listen: false);
      await auth.updateServerConfig(
        _hostController.text,
        int.parse(_portController.text),
        protocol: _selectedProtocol,
      );

      if (auth.isConnected) {
        setState(() {
          _statusMessage = '✅ Configuración guardada y aplicada correctamente';
        });
        
        // Mostrar confirmación y volver
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Servidor configurado correctamente'),
            backgroundColor: Colors.green,
          ),
        );
        
        Future.delayed(Duration(seconds: 1), () {
          Navigator.pop(context);
        });
      } else {
        setState(() {
          _statusMessage = '❌ ${auth.lastConnectionError}';
        });
      }
    } catch (e) {
      setState(() {
        _statusMessage = '❌ Error guardando configuración: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _startAutoDetection() async {
    setState(() {
      _isLoading = true;
      _foundServers.clear();
      _statusMessage = 'Buscando servidores disponibles...';
    });

    try {
      final servers = await DynamicServerConfig.autoDetectServers(
        onProgress: (message) {
          if (mounted) {
            setState(() {
              _statusMessage = message;
            });
          }
        },
      );

      setState(() {
        _foundServers = servers;
        _statusMessage = servers.isNotEmpty
            ? '✅ Se encontraron ${servers.length} servidor(es)'
            : '❌ No se encontraron servidores disponibles';
      });
    } catch (e) {
      setState(() {
        _statusMessage = '❌ Error en búsqueda automática: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _selectFoundServer(ServerTestResult server) async {
    setState(() {
      _isLoading = true;
    });

    try {
      final auth = Provider.of<SmartAuthProvider>(context, listen: false);
      await auth.updateServerConfig(
        server.host,
        server.port,
        protocol: server.protocol,
      );

      setState(() {
        _statusMessage = '✅ Servidor ${server.displayName} configurado correctamente';
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✅ Usando servidor ${server.displayName}'),
          backgroundColor: Colors.green,
        ),
      );

      Future.delayed(Duration(seconds: 1), () {
        Navigator.pop(context);
      });
    } catch (e) {
      setState(() {
        _statusMessage = '❌ Error aplicando configuración: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _testHostingConfig() async {
    if (_hostController.text.isEmpty) {
      setState(() {
        _statusMessage = '❌ Por favor ingresa un dominio';
      });
      return;
    }

    // Auto-configurar para hosting
    final port = _selectedProtocol == 'https' ? 443 : 80;
    _portController.text = port.toString();

    setState(() {
      _isLoading = true;
      _statusMessage = 'Probando configuración de hosting...';
    });

    try {
      final result = await DynamicServerConfig.testConnection(
        _hostController.text,
        port,
        protocol: _selectedProtocol,
      );

      if (result.success) {
        final auth = Provider.of<SmartAuthProvider>(context, listen: false);
        await auth.updateServerConfig(
          _hostController.text,
          port,
          protocol: _selectedProtocol,
        );

        setState(() {
          _statusMessage = '✅ Hosting configurado correctamente';
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Hosting configurado: ${_hostController.text}'),
            backgroundColor: Colors.green,
          ),
        );

        Future.delayed(Duration(seconds: 1), () {
          Navigator.pop(context);
        });
      } else {
        setState(() {
          _statusMessage = '❌ ${result.message}';
        });
      }
    } catch (e) {
      setState(() {
        _statusMessage = '❌ Error: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
}