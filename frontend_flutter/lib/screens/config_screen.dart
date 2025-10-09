import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/config_service.dart';
import 'login_screen.dart';
import 'biometric_selector_screen.dart';
import 'package:geolocator/geolocator.dart';
import 'package:device_info_plus/device_info_plus.dart';

class ConfigScreen extends StatefulWidget {
  const ConfigScreen({Key? key}) : super(key: key);

  @override
  State<ConfigScreen> createState() => _ConfigScreenState();
}

class _ConfigScreenState extends State<ConfigScreen> {
  final _formKey = GlobalKey<FormState>();
  final _baseUrlController = TextEditingController();
  final _portController = TextEditingController();
  final _companyNameController = TextEditingController();
  final _companyIdController = TextEditingController();
  final _kioskNameController = TextEditingController();

  bool _isLoading = false;
  bool _testingConnection = false;
  bool _gettingLocation = false;
  String? _connectionStatus;
  double? _latitude;
  double? _longitude;

  // External fingerprint reader configuration
  bool _hasExternalReader = false;
  String? _selectedReaderModel;
  final List<Map<String, String>> _readerModels = [
    {'value': 'zktech_4500', 'label': 'ZKTeco U.are.U 4500 (\$45-55k ARS) - Más popular'},
    {'value': 'suprema_biomini', 'label': 'Suprema BioMini Plus 2 (\$65-80k ARS) - Alta seguridad'},
    {'value': 'digitalpersona_5160', 'label': 'Digital Persona U.are.U 5160 (\$50-60k ARS) - Web'},
    {'value': 'nitgen_hamster', 'label': 'Nitgen Hamster Plus (\$30-40k ARS) - Económico'},
    {'value': 'futronic_fs88', 'label': 'Futronic FS88 (\$35-45k ARS) - Ethernet'},
  ];

  @override
  void initState() {
    super.initState();
    _loadCurrentConfig();
  }

  Future<void> _loadCurrentConfig() async {
    final config = await ConfigService.getConfig();
    setState(() {
      _baseUrlController.text = config['baseUrl']!;
      _portController.text = config['port']!;
      _companyNameController.text = config['companyName']!;
      _companyIdController.text = config['companyId']!;
    });
  }

  Future<void> _testConnection() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _testingConnection = true;
      _connectionStatus = null;
    });

    try {
      final baseUrl = _baseUrlController.text.trim();
      final port = _portController.text.trim();
      final testUrl = 'http://$baseUrl:$port/api/v1/health';

      // Hacer petición HTTP real con timeout
      final response = await http.get(
        Uri.parse(testUrl),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        try {
          final data = json.decode(response.body);
          setState(() {
            _connectionStatus = '✅ Conexión exitosa - Servidor respondiendo';
          });
        } catch (e) {
          setState(() {
            _connectionStatus = '✅ Conexión exitosa - Servidor encontrado';
          });
        }
      } else {
        setState(() {
          _connectionStatus = '⚠️ Servidor encontrado pero responde con código ${response.statusCode}';
        });
      }
    } catch (e) {
      setState(() {
        if (e.toString().contains('timeout')) {
          _connectionStatus = '❌ Timeout: Servidor no responde';
        } else if (e.toString().contains('Connection refused') || e.toString().contains('No route to host')) {
          _connectionStatus = '❌ No se puede conectar al servidor';
        } else {
          _connectionStatus = '❌ Error de conexión: ${e.toString()}';
        }
      });
    } finally {
      setState(() {
        _testingConnection = false;
      });
    }
  }

  Future<void> _getGPSLocation() async {
    setState(() {
      _gettingLocation = true;
    });

    try {
      // Check permissions
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception('Permisos de ubicación denegados');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw Exception('Permisos de ubicación denegados permanentemente');
      }

      // Get location
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('📍 Ubicación obtenida: ${_latitude!.toStringAsFixed(6)}, ${_longitude!.toStringAsFixed(6)}'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error obteniendo ubicación: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } finally {
      setState(() {
        _gettingLocation = false;
      });
    }
  }

  Future<void> _saveKioskConfiguration() async {
    // Save kiosk configuration to backend
    try {
      final DeviceInfoPlugin deviceInfo = DeviceInfoPlugin();
      String deviceId = '';

      // Get device ID
      if (Theme.of(context).platform == TargetPlatform.android) {
        final androidInfo = await deviceInfo.androidInfo;
        deviceId = androidInfo.id;
      } else {
        deviceId = 'web_device_${DateTime.now().millisecondsSinceEpoch}';
      }

      final baseUrl = _baseUrlController.text.trim();
      final port = _portController.text.trim();
      final companyId = _companyIdController.text.trim();

      final configUrl = 'http://$baseUrl:$port/api/v1/kiosks/configure-security';

      final response = await http.post(
        Uri.parse(configUrl),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'deviceId': deviceId,
          'companyId': int.parse(companyId),
          'hasExternalReader': _hasExternalReader,
          'readerModel': _selectedReaderModel,
          'readerConfig': {},
        }),
      );

      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✅ Configuración de kiosko guardada'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (e) {
      print('Error guardando configuración de kiosko: $e');
      // No bloqueamos el flujo si falla esto
    }
  }

  Future<void> _saveConfig() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      await ConfigService.saveConfig(
        baseUrl: _baseUrlController.text.trim(),
        port: _portController.text.trim(),
        companyName: _companyNameController.text.trim(),
        companyId: _companyIdController.text.trim(),
      );

      // Save kiosk configuration if applicable
      await _saveKioskConfiguration();

      // Navegar al login
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const NewLoginScreen()),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al guardar configuración: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Configuración del Sistema'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.blue.shade50, Colors.white],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.grey.withOpacity(0.1),
                          spreadRadius: 1,
                          blurRadius: 5,
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Icon(
                          Icons.settings_ethernet,
                          size: 50,
                          color: Colors.blue.shade600,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Configuración de Conexión',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade800,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Configure la dirección del servidor antes de iniciar sesión',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.grey.shade600,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Form Fields
                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        children: [
                          // IP/URL Field
                          TextFormField(
                            controller: _baseUrlController,
                            decoration: InputDecoration(
                              labelText: 'Dirección IP del Servidor',
                              hintText: 'Ej: 192.168.1.9',
                              prefixIcon: const Icon(Icons.computer),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              filled: true,
                              fillColor: Colors.white,
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Por favor ingrese la dirección IP';
                              }
                              if (!ConfigService.isValidUrl(value)) {
                                return 'Dirección IP inválida';
                              }
                              return null;
                            },
                          ),

                          const SizedBox(height: 16),

                          // Port Field
                          TextFormField(
                            controller: _portController,
                            decoration: InputDecoration(
                              labelText: 'Puerto',
                              hintText: 'Ej: 9900',
                              prefixIcon: const Icon(Icons.settings_ethernet),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              filled: true,
                              fillColor: Colors.white,
                            ),
                            keyboardType: TextInputType.number,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Por favor ingrese el puerto';
                              }
                              if (!ConfigService.isValidPort(value)) {
                                return 'Puerto inválido (1-65535)';
                              }
                              return null;
                            },
                          ),

                          const SizedBox(height: 16),

                          // Company Name Field
                          TextFormField(
                            controller: _companyNameController,
                            decoration: InputDecoration(
                              labelText: 'Nombre de la Empresa',
                              hintText: 'Ej: Mi Empresa',
                              prefixIcon: const Icon(Icons.business),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              filled: true,
                              fillColor: Colors.white,
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Por favor ingrese el nombre de la empresa';
                              }
                              return null;
                            },
                          ),

                          const SizedBox(height: 16),

                          // Company ID Field
                          TextFormField(
                            controller: _companyIdController,
                            decoration: InputDecoration(
                              labelText: 'ID de Empresa',
                              hintText: 'Ej: 11',
                              prefixIcon: const Icon(Icons.tag),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              filled: true,
                              fillColor: Colors.white,
                            ),
                            keyboardType: TextInputType.number,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Por favor ingrese el ID de la empresa';
                              }
                              if (int.tryParse(value) == null) {
                                return 'El ID debe ser un número';
                              }
                              return null;
                            },
                          ),

                          const SizedBox(height: 24),

                          // === CONFIGURACIÓN DE KIOSKO ===
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.orange.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.orange.shade200),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.settings, color: Colors.orange.shade700),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Configuración de Kiosko (Opcional)',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.orange.shade900,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),

                                // Kiosk Name Field
                                TextFormField(
                                  controller: _kioskNameController,
                                  decoration: InputDecoration(
                                    labelText: 'Nombre del Kiosko',
                                    hintText: 'Ej: Kiosko Entrada Principal',
                                    prefixIcon: const Icon(Icons.storefront),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    filled: true,
                                    fillColor: Colors.white,
                                  ),
                                ),

                                const SizedBox(height: 12),

                                // GPS Location Button
                                SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton.icon(
                                    onPressed: _gettingLocation ? null : _getGPSLocation,
                                    icon: _gettingLocation
                                        ? const SizedBox(
                                            width: 20,
                                            height: 20,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: Colors.white,
                                            ),
                                          )
                                        : const Icon(Icons.my_location),
                                    label: Text(
                                      _latitude != null && _longitude != null
                                          ? '📍 ${_latitude!.toStringAsFixed(4)}, ${_longitude!.toStringAsFixed(4)}'
                                          : _gettingLocation
                                              ? 'Obteniendo ubicación...'
                                              : 'Obtener Ubicación GPS',
                                    ),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: _latitude != null ? Colors.green : Colors.blue.shade600,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                    ),
                                  ),
                                ),

                                const SizedBox(height: 12),

                                // External Fingerprint Reader Section
                                SwitchListTile(
                                  title: const Text('Lector de Huella Externo'),
                                  subtitle: const Text('Activar si tiene lector USB'),
                                  value: _hasExternalReader,
                                  onChanged: (value) {
                                    setState(() {
                                      _hasExternalReader = value;
                                      if (!value) {
                                        _selectedReaderModel = null;
                                      }
                                    });
                                  },
                                  activeColor: Colors.orange.shade700,
                                  contentPadding: EdgeInsets.zero,
                                ),

                                // Reader Model Dropdown (if external reader enabled)
                                if (_hasExternalReader) ...[
                                  const SizedBox(height: 8),
                                  DropdownButtonFormField<String>(
                                    value: _selectedReaderModel,
                                    decoration: InputDecoration(
                                      labelText: 'Modelo de Lector',
                                      prefixIcon: const Icon(Icons.fingerprint),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      filled: true,
                                      fillColor: Colors.white,
                                    ),
                                    items: _readerModels.map((reader) {
                                      return DropdownMenuItem<String>(
                                        value: reader['value'],
                                        child: Text(
                                          reader['label']!,
                                          style: const TextStyle(fontSize: 13),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      );
                                    }).toList(),
                                    onChanged: (value) {
                                      setState(() {
                                        _selectedReaderModel = value;
                                      });
                                    },
                                    validator: _hasExternalReader
                                        ? (value) {
                                            if (value == null || value.isEmpty) {
                                              return 'Seleccione un modelo de lector';
                                            }
                                            return null;
                                          }
                                        : null,
                                  ),
                                ],
                              ],
                            ),
                          ),

                          const SizedBox(height: 24),

                          // Instrucción para obtener IP:Puerto
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.blue.shade200),
                            ),
                            child: Column(
                              children: [
                                Icon(Icons.info_outline, color: Colors.blue.shade700, size: 36),
                                const SizedBox(height: 12),
                                Text(
                                  '📡 ¿Cómo obtener IP y Puerto?',
                                  style: TextStyle(
                                    color: Colors.blue.shade900,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  '1. En el navegador web, ir a:\nhttp://[IP-SERVIDOR]/panel-empresa.html\n\n2. Login con sus credenciales\n\n3. Ir al módulo "Configuración"\n\n4. Copiar IP y Puerto mostrados\n\n5. Ingresar aquí arriba ↑',
                                  style: TextStyle(
                                    color: Colors.blue.shade700,
                                    fontSize: 13,
                                    height: 1.5,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 12),

                          // Test Connection Button
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: _testingConnection ? null : _testConnection,
                              icon: _testingConnection
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  : const Icon(Icons.wifi_find),
                              label: Text(_testingConnection ? 'Probando...' : 'Probar Conexión'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ),

                          // Connection Status
                          if (_connectionStatus != null) ...[
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: _connectionStatus!.startsWith('✅')
                                    ? Colors.green.shade50
                                    : Colors.red.shade50,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: _connectionStatus!.startsWith('✅')
                                      ? Colors.green.shade300
                                      : Colors.red.shade300,
                                ),
                              ),
                              child: Text(
                                _connectionStatus!,
                                style: TextStyle(
                                  color: _connectionStatus!.startsWith('✅')
                                      ? Colors.green.shade700
                                      : Colors.red.shade700,
                                  fontWeight: FontWeight.w500,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ],

                          const SizedBox(height: 32),

                          // Buttons Row
                          Row(
                            children: [
                              // Kiosk Mode Button
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () async {
                                    // Guardar configuración antes de ir al kiosk
                                    if (_formKey.currentState!.validate()) {
                                      await ConfigService.saveConfig(
                                        baseUrl: _baseUrlController.text.trim(),
                                        port: _portController.text.trim(),
                                        companyName: _companyNameController.text.trim(),
                                        companyId: _companyIdController.text.trim(),
                                      );
                                    }
                                    if (mounted) {
                                      Navigator.of(context).pushReplacement(
                                        MaterialPageRoute(builder: (context) => BiometricSelectorScreen()),
                                      );
                                    }
                                  },
                                  icon: const Icon(Icons.videocam),
                                  label: const Text('Modo Kiosco'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.orange.shade600,
                                    side: BorderSide(color: Colors.orange.shade600),
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                ),
                              ),

                              const SizedBox(width: 16),

                              // Save Button
                              Expanded(
                                flex: 2,
                                child: ElevatedButton.icon(
                                  onPressed: _isLoading ? null : _saveConfig,
                                  icon: _isLoading
                                      ? const SizedBox(
                                          width: 20,
                                          height: 20,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.white,
                                          ),
                                        )
                                      : const Icon(Icons.save),
                                  label: Text(_isLoading ? 'Guardando...' : 'Guardar y Continuar'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.blue.shade600,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    elevation: 2,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _baseUrlController.dispose();
    _portController.dispose();
    _companyNameController.dispose();
    _companyIdController.dispose();
    _kioskNameController.dispose();
    super.dispose();
  }
}