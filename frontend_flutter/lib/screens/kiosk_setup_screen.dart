import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:device_info_plus/device_info_plus.dart';
import '../services/config_service.dart';
import 'biometric_selector_screen.dart';

/// KioskSetupScreen - Pantalla de Configuración Inicial del Kiosko
///
/// Solo pide: Empresa, Kiosko, GPS
/// URL del servidor está HARDCODEADA en ConfigService
class KioskSetupScreen extends StatefulWidget {
  final bool isEditMode;

  const KioskSetupScreen({Key? key, this.isEditMode = false}) : super(key: key);

  @override
  State<KioskSetupScreen> createState() => _KioskSetupScreenState();
}

class _KioskSetupScreenState extends State<KioskSetupScreen> {
  // Estado
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isGettingLocation = false;
  String? _errorMessage;
  String? _connectionStatus;

  // Datos
  List<Map<String, dynamic>> _companies = [];
  List<Map<String, dynamic>> _kiosks = [];
  Map<String, dynamic>? _selectedCompany;
  Map<String, dynamic>? _selectedKiosk;
  double? _gpsLat;
  double? _gpsLng;
  String? _deviceId;

  @override
  void initState() {
    super.initState();
    _initializeScreen();
  }

  Future<void> _initializeScreen() async {
    setState(() => _isLoading = true);

    try {
      // Obtener device ID
      await _getDeviceId();

      // Probar conexión con el servidor
      final connected = await ConfigService.testConnection();
      setState(() {
        _connectionStatus = connected
            ? '✅ Conectado a ${ConfigService.BACKEND_URL}'
            : '❌ Sin conexión al servidor';
      });

      if (connected) {
        // Cargar empresas disponibles
        await _loadCompanies();
      }

      // Si es modo edición, cargar configuración actual
      if (widget.isEditMode) {
        await _loadCurrentConfig();
      }
    } catch (e) {
      setState(() => _errorMessage = 'Error inicializando: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _getDeviceId() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      if (Theme.of(context).platform == TargetPlatform.android) {
        final androidInfo = await deviceInfo.androidInfo;
        _deviceId = androidInfo.id;
      } else if (Theme.of(context).platform == TargetPlatform.iOS) {
        final iosInfo = await deviceInfo.iosInfo;
        _deviceId = iosInfo.identifierForVendor;
      } else {
        _deviceId = 'device_${DateTime.now().millisecondsSinceEpoch}';
      }
      print('📱 [SETUP] Device ID: $_deviceId');
    } catch (e) {
      print('⚠️ [SETUP] Error obteniendo device ID: $e');
      _deviceId = 'unknown_device';
    }
  }

  Future<void> _loadCompanies() async {
    try {
      final companies = await ConfigService.getAvailableCompanies();
      setState(() {
        _companies = companies;
      });

      if (_companies.isEmpty) {
        setState(() {
          _errorMessage = 'No hay empresas disponibles.\nContacte al administrador del sistema.';
        });
      }
    } catch (e) {
      setState(() => _errorMessage = 'Error cargando empresas: $e');
    }
  }

  Future<void> _loadKiosks(String companyId) async {
    setState(() {
      _kiosks = [];
      _selectedKiosk = null;
    });

    try {
      final kiosks = await ConfigService.getAvailableKiosks(companyId);
      setState(() {
        _kiosks = kiosks;
      });

      if (_kiosks.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('⚠️ No hay kioscos disponibles para esta empresa.\nCree kioscos desde el panel web.'),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      print('❌ [SETUP] Error cargando kioscos: $e');
    }
  }

  Future<void> _loadCurrentConfig() async {
    try {
      final config = await ConfigService.getKioskConfig();

      if (config['companyId'] != null) {
        // Buscar empresa en la lista
        final company = _companies.firstWhere(
          (c) => c['id'].toString() == config['companyId'],
          orElse: () => <String, dynamic>{},
        );

        if (company.isNotEmpty) {
          setState(() => _selectedCompany = company);
          await _loadKiosks(config['companyId']);

          // Buscar kiosko
          if (config['kioskId'] != null) {
            final kiosk = _kiosks.firstWhere(
              (k) => k['id'].toString() == config['kioskId'],
              orElse: () => <String, dynamic>{},
            );
            if (kiosk.isNotEmpty) {
              setState(() => _selectedKiosk = kiosk);
            }
          }
        }

        // Cargar GPS guardado
        if (config['gpsLat'] != null && config['gpsLng'] != null) {
          setState(() {
            _gpsLat = config['gpsLat'];
            _gpsLng = config['gpsLng'];
          });
        }
      }
    } catch (e) {
      print('⚠️ [SETUP] Error cargando config actual: $e');
    }
  }

  Future<void> _getGPSLocation() async {
    setState(() => _isGettingLocation = true);

    try {
      // Verificar permisos
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception('Permisos de ubicación denegados');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw Exception('Permisos de ubicación denegados permanentemente.\nHabilite en Configuración del dispositivo.');
      }

      // Obtener ubicación
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        _gpsLat = position.latitude;
        _gpsLng = position.longitude;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('📍 Ubicación obtenida: ${_gpsLat!.toStringAsFixed(6)}, ${_gpsLng!.toStringAsFixed(6)}'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() => _isGettingLocation = false);
    }
  }

  Future<void> _saveConfiguration() async {
    // Validaciones
    if (_selectedCompany == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Seleccione una empresa'), backgroundColor: Colors.orange),
      );
      return;
    }

    if (_selectedKiosk == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Seleccione un kiosko'), backgroundColor: Colors.orange),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      // Guardar configuración local
      await ConfigService.saveKioskConfig(
        companyId: _selectedCompany!['id'].toString(),
        companyName: _selectedCompany!['name'] ?? 'Empresa',
        companySlug: _selectedCompany!['slug'] ?? '',
        kioskId: _selectedKiosk!['id'].toString(),
        kioskName: _selectedKiosk!['name'] ?? 'Kiosko',
        kioskLocation: _selectedKiosk!['location'],
        gpsLat: _gpsLat,
        gpsLng: _gpsLng,
      );

      // Registrar activación en backend (no bloqueante)
      if (_deviceId != null) {
        await ConfigService.registerKioskActivation(
          kioskId: _selectedKiosk!['id'].toString(),
          companyId: _selectedCompany!['id'].toString(),
          deviceId: _deviceId!,
          gpsLat: _gpsLat,
          gpsLng: _gpsLng,
        );
      }

      // Navegar al kiosko
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Kiosko "${_selectedKiosk!['name']}" configurado correctamente'),
            backgroundColor: Colors.green,
          ),
        );

        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => BiometricSelectorScreen()),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error guardando: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: Text(widget.isEditMode ? 'Editar Configuración' : 'Configuración del Kiosko'),
        backgroundColor: Colors.blue[700],
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (widget.isEditMode)
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => Navigator.pop(context),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header con estado de conexión
                  _buildConnectionStatus(),
                  const SizedBox(height: 24),

                  // Error message
                  if (_errorMessage != null) ...[
                    _buildErrorCard(),
                    const SizedBox(height: 24),
                  ],

                  // Formulario
                  if (_connectionStatus?.startsWith('✅') == true) ...[
                    // Selector de Empresa
                    _buildCompanySelector(),
                    const SizedBox(height: 20),

                    // Selector de Kiosko
                    _buildKioskSelector(),
                    const SizedBox(height: 20),

                    // GPS
                    _buildGPSSection(),
                    const SizedBox(height: 32),

                    // Botón Guardar
                    _buildSaveButton(),
                  ],

                  const SizedBox(height: 40),

                  // Info del servidor
                  _buildServerInfo(),
                ],
              ),
            ),
    );
  }

  Widget _buildConnectionStatus() {
    final isConnected = _connectionStatus?.startsWith('✅') == true;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isConnected ? Colors.green[50] : Colors.red[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isConnected ? Colors.green[300]! : Colors.red[300]!,
        ),
      ),
      child: Row(
        children: [
          Icon(
            isConnected ? Icons.cloud_done : Icons.cloud_off,
            color: isConnected ? Colors.green[700] : Colors.red[700],
            size: 28,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isConnected ? 'Conectado al Servidor' : 'Sin Conexión',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: isConnected ? Colors.green[800] : Colors.red[800],
                  ),
                ),
                Text(
                  ConfigService.BACKEND_URL,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _initializeScreen,
            color: Colors.grey[600],
          ),
        ],
      ),
    );
  }

  Widget _buildErrorCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.orange[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.orange[300]!),
      ),
      child: Row(
        children: [
          Icon(Icons.warning_amber, color: Colors.orange[700], size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _errorMessage!,
              style: TextStyle(color: Colors.orange[900]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompanySelector() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.business, color: Colors.blue[700]),
                const SizedBox(width: 8),
                const Text(
                  '1. Seleccionar Empresa',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<Map<String, dynamic>>(
              value: _selectedCompany,
              decoration: InputDecoration(
                labelText: 'Empresa',
                prefixIcon: const Icon(Icons.business_center),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                filled: true,
                fillColor: Colors.grey[50],
              ),
              hint: const Text('Seleccione una empresa'),
              items: _companies.map((company) {
                return DropdownMenuItem<Map<String, dynamic>>(
                  value: company,
                  child: Text(company['name'] ?? 'Sin nombre'),
                );
              }).toList(),
              onChanged: (company) {
                setState(() {
                  _selectedCompany = company;
                  _selectedKiosk = null;
                  _kiosks = [];
                });
                if (company != null) {
                  _loadKiosks(company['id'].toString());
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKioskSelector() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.storefront, color: Colors.blue[700]),
                const SizedBox(width: 8),
                const Text(
                  '2. Seleccionar Kiosko',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Los kioscos deben ser creados previamente desde el Panel Web',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<Map<String, dynamic>>(
              value: _selectedKiosk,
              decoration: InputDecoration(
                labelText: 'Kiosko',
                prefixIcon: const Icon(Icons.tablet_android),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                filled: true,
                fillColor: Colors.grey[50],
              ),
              hint: Text(
                _selectedCompany == null
                    ? 'Primero seleccione una empresa'
                    : _kiosks.isEmpty
                        ? 'No hay kioscos disponibles'
                        : 'Seleccione un kiosko',
              ),
              items: _kiosks.map((kiosk) {
                return DropdownMenuItem<Map<String, dynamic>>(
                  value: kiosk,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        kiosk['name'] ?? 'Sin nombre',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      if (kiosk['location'] != null)
                        Text(
                          kiosk['location'],
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                    ],
                  ),
                );
              }).toList(),
              onChanged: _selectedCompany == null
                  ? null
                  : (kiosk) {
                      setState(() => _selectedKiosk = kiosk);

                      // Si el kiosko tiene GPS, usarlo
                      if (kiosk?['gpsLocation'] != null) {
                        final gps = kiosk!['gpsLocation'];
                        if (gps['lat'] != null && gps['lng'] != null) {
                          setState(() {
                            _gpsLat = (gps['lat'] as num).toDouble();
                            _gpsLng = (gps['lng'] as num).toDouble();
                          });
                        }
                      }
                    },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGPSSection() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.location_on, color: Colors.blue[700]),
                const SizedBox(width: 8),
                const Text(
                  '3. Ubicación GPS',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Opcional: Para validar que los empleados marquen desde esta ubicación',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 16),

            // Mostrar GPS actual
            if (_gpsLat != null && _gpsLng != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green[300]!),
                ),
                child: Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.green[700]),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '📍 ${_gpsLat!.toStringAsFixed(6)}, ${_gpsLng!.toStringAsFixed(6)}',
                        style: TextStyle(
                          fontWeight: FontWeight.w500,
                          color: Colors.green[800],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 12),

            // Botón obtener GPS
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isGettingLocation ? null : _getGPSLocation,
                icon: _isGettingLocation
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.my_location),
                label: Text(
                  _isGettingLocation
                      ? 'Obteniendo ubicación...'
                      : _gpsLat != null
                          ? 'Actualizar Ubicación'
                          : 'Obtener Ubicación GPS',
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _gpsLat != null ? Colors.green : Colors.blue[600],
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSaveButton() {
    final canSave = _selectedCompany != null && _selectedKiosk != null;

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: canSave && !_isSaving ? _saveConfiguration : null,
        icon: _isSaving
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              )
            : const Icon(Icons.check_circle, size: 24),
        label: Text(
          _isSaving ? 'Guardando...' : 'Guardar y Continuar',
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: canSave ? Colors.green[600] : Colors.grey[400],
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 18),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: canSave ? 4 : 0,
        ),
      ),
    );
  }

  Widget _buildServerInfo() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(Icons.info_outline, color: Colors.grey[600], size: 24),
          const SizedBox(height: 8),
          Text(
            'Servidor: ${ConfigService.BACKEND_URL}',
            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            textAlign: TextAlign.center,
          ),
          if (_deviceId != null)
            Text(
              'Device ID: $_deviceId',
              style: TextStyle(fontSize: 10, color: Colors.grey[500]),
              textAlign: TextAlign.center,
            ),
        ],
      ),
    );
  }
}
