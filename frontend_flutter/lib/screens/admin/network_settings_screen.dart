import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../config/theme.dart';

class NetworkSettingsScreen extends StatefulWidget {
  @override
  _NetworkSettingsScreenState createState() => _NetworkSettingsScreenState();
}

class _NetworkSettingsScreenState extends State<NetworkSettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _hostController = TextEditingController();
  final _portController = TextEditingController();
  final _corsController = TextEditingController();
  final _maxConnectionsController = TextEditingController();
  
  bool _autoDetectIP = true;
  bool _firewallAutoConfig = true;
  bool _isLoading = true;
  bool _isSaving = false;
  
  Map<String, dynamic> _serverStatus = {};
  List<dynamic> _detectedIPs = [];

  @override
  void initState() {
    super.initState();
    _loadConfiguration();
  }

  @override
  void dispose() {
    _hostController.dispose();
    _portController.dispose();
    _corsController.dispose();
    _maxConnectionsController.dispose();
    super.dispose();
  }

  Future<void> _loadConfiguration() async {
    setState(() => _isLoading = true);
    
    try {
      // Cargar estado del servidor
      final statusResponse = await http.get(
        Uri.parse('http://localhost:3000/api/v1/config/system-status'),
      );
      
      if (statusResponse.statusCode == 200) {
        _serverStatus = json.decode(statusResponse.body);
      }

      // Cargar configuración de red
      final configResponse = await http.get(
        Uri.parse('http://localhost:3000/api/v1/config/network'),
      );
      
      if (configResponse.statusCode == 200) {
        final config = json.decode(configResponse.body);
        
        _hostController.text = config['serverHost'] ?? '0.0.0.0';
        _portController.text = (config['serverPort'] ?? 3000).toString();
        _corsController.text = config['corsOrigin'] ?? '*';
        _maxConnectionsController.text = (config['maxConnections'] ?? 100).toString();
        _autoDetectIP = config['autoDetectIP'] ?? true;
        _firewallAutoConfig = config['firewallAutoConfig'] ?? true;
        _detectedIPs = config['detectedIPs'] ?? [];
      }
    } catch (e) {
      _showSnackBar('Error cargando configuración: $e', isError: true);
    }
    
    setState(() => _isLoading = false);
  }

  Future<void> _saveConfiguration() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isSaving = true);
    
    try {
      final config = {
        'serverHost': _hostController.text,
        'serverPort': int.parse(_portController.text),
        'corsOrigin': _corsController.text,
        'maxConnections': int.parse(_maxConnectionsController.text),
        'autoDetectIP': _autoDetectIP,
        'firewallAutoConfig': _firewallAutoConfig,
      };

      final response = await http.put(
        Uri.parse('http://localhost:3000/api/v1/config/network'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(config),
      );

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        _showSnackBar('✅ ' + result['message']);
        
        if (result['restartRequired'] == true) {
          _showRestartDialog();
        }
      } else {
        final error = json.decode(response.body);
        throw Exception(error['error'] ?? 'Error guardando configuración');
      }
    } catch (e) {
      _showSnackBar('Error: $e', isError: true);
    }
    
    setState(() => _isSaving = false);
  }

  Future<void> _testConnection() async {
    try {
      final response = await http.get(
        Uri.parse('http://localhost:3000/health'),
      ).timeout(Duration(seconds: 5));

      if (response.statusCode == 200) {
        _showSnackBar('✅ Conexión exitosa');
      } else {
        _showSnackBar('❌ Error de conexión', isError: true);
      }
    } catch (e) {
      _showSnackBar('❌ Error de conexión: $e', isError: true);
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? AppTheme.errorColor : AppTheme.successColor,
      ),
    );
  }

  void _showRestartDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Reinicio Requerido'),
        content: Text(
          'Se cambió el puerto del servidor. Es necesario reiniciar el backend para aplicar los cambios.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Entendido'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Configuración de Red'),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _loadConfiguration,
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildServerStatusCard(),
                    SizedBox(height: 16),
                    _buildNetworkConfigCard(),
                    SizedBox(height: 16),
                    _buildDetectedIPsCard(),
                    SizedBox(height: 16),
                    _buildActionButtons(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildServerStatusCard() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.dns, color: AppTheme.primaryColor),
                SizedBox(width: 8),
                Text(
                  'Estado del Servidor',
                  style: AppTheme.titleStyle.copyWith(fontSize: 18),
                ),
              ],
            ),
            SizedBox(height: 12),
            if (_serverStatus.isNotEmpty) ...[
              _buildStatusRow('Estado', '✅ ${_serverStatus['status'] ?? 'Activo'}'),
              _buildStatusRow('Versión', _serverStatus['version'] ?? '1.0.0'),
              _buildStatusRow('Tiempo activo', '${(_serverStatus['uptime'] ?? 0) ~/ 60} minutos'),
              _buildStatusRow('Plataforma', _serverStatus['platform'] ?? 'N/A'),
              _buildStatusRow('Base de datos', _serverStatus['database'] ?? 'Conectada'),
            ] else
              Text(
                'No se pudo cargar el estado del servidor',
                style: AppTheme.bodyStyle.copyWith(color: AppTheme.errorColor),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(
            '$label: ',
            style: AppTheme.bodyStyle.copyWith(fontWeight: FontWeight.w500),
          ),
          Expanded(
            child: Text(
              value,
              style: AppTheme.bodyStyle,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNetworkConfigCard() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.router, color: AppTheme.primaryColor),
                SizedBox(width: 8),
                Text(
                  'Configuración de Red',
                  style: AppTheme.titleStyle.copyWith(fontSize: 18),
                ),
              ],
            ),
            SizedBox(height: 16),
            
            TextFormField(
              controller: _hostController,
              decoration: InputDecoration(
                labelText: 'Host del Servidor',
                hintText: '0.0.0.0 o IP específica',
                prefixIcon: Icon(Icons.computer),
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Por favor ingresa un host';
                }
                return null;
              },
            ),
            
            SizedBox(height: 16),
            
            TextFormField(
              controller: _portController,
              decoration: InputDecoration(
                labelText: 'Puerto',
                hintText: '3000',
                prefixIcon: Icon(Icons.settings_ethernet),
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Por favor ingresa un puerto';
                }
                final port = int.tryParse(value);
                if (port == null || port < 1024 || port > 65535) {
                  return 'Puerto debe estar entre 1024 y 65535';
                }
                return null;
              },
            ),
            
            SizedBox(height: 16),
            
            TextFormField(
              controller: _corsController,
              decoration: InputDecoration(
                labelText: 'CORS Origin',
                hintText: '* o URL específica',
                prefixIcon: Icon(Icons.security),
                border: OutlineInputBorder(),
              ),
            ),
            
            SizedBox(height: 16),
            
            TextFormField(
              controller: _maxConnectionsController,
              decoration: InputDecoration(
                labelText: 'Máximo Conexiones',
                hintText: '100',
                prefixIcon: Icon(Icons.people),
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Por favor ingresa el máximo de conexiones';
                }
                final max = int.tryParse(value);
                if (max == null || max < 1) {
                  return 'Debe ser un número mayor a 0';
                }
                return null;
              },
            ),
            
            SizedBox(height: 16),
            
            SwitchListTile(
              title: Text('Auto-detectar IP para apps móviles'),
              subtitle: Text('Detecta automáticamente la IP para configurar apps'),
              value: _autoDetectIP,
              onChanged: (value) => setState(() => _autoDetectIP = value),
            ),
            
            SwitchListTile(
              title: Text('Configurar firewall automáticamente'),
              subtitle: Text('Crea reglas de firewall automáticamente (requiere admin)'),
              value: _firewallAutoConfig,
              onChanged: (value) => setState(() => _firewallAutoConfig = value),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetectedIPsCard() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.wifi_find, color: AppTheme.primaryColor),
                SizedBox(width: 8),
                Text(
                  'IPs Detectadas',
                  style: AppTheme.titleStyle.copyWith(fontSize: 18),
                ),
              ],
            ),
            SizedBox(height: 12),
            
            if (_detectedIPs.isEmpty)
              Text(
                'No se detectaron IPs de red',
                style: AppTheme.bodyStyle.copyWith(color: AppTheme.textSecondary),
              )
            else
              ..._detectedIPs.map((ip) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.network_check, color: AppTheme.primaryColor),
                title: Text(ip['ip'] ?? 'N/A'),
                subtitle: Text(ip['interface'] ?? 'N/A'),
                trailing: IconButton(
                  icon: Icon(Icons.copy),
                  onPressed: () {
                    _hostController.text = ip['ip'] ?? '';
                    _showSnackBar('IP copiada al campo host');
                  },
                ),
              )).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ElevatedButton.icon(
          onPressed: _isSaving ? null : _testConnection,
          icon: Icon(Icons.wifi_tethering),
          label: Text('Probar Conexión'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            padding: EdgeInsets.symmetric(vertical: 16),
          ),
        ),
        
        SizedBox(height: 12),
        
        ElevatedButton.icon(
          onPressed: _isSaving ? null : _saveConfiguration,
          icon: _isSaving 
              ? SizedBox(
                  width: 16, 
                  height: 16, 
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)
                )
              : Icon(Icons.save),
          label: Text(_isSaving ? 'Guardando...' : 'Guardar Configuración'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.successColor,
            padding: EdgeInsets.symmetric(vertical: 16),
          ),
        ),
      ],
    );
  }
}