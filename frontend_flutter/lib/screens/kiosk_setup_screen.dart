import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:device_info_plus/device_info_plus.dart';
import '../services/config_service.dart';
import 'biometric_selector_screen.dart';

/// KioskSetupScreen - Pantalla de Configuración del Kiosko
///
/// Flujo:
/// 1. Seleccionar Empresa (dropdown público)
/// 2. Seleccionar Kiosko (dropdown filtrado - solo disponibles)
/// 3. Fijar Ubicación GPS (botón que guarda en BD)
/// 4. Activar Kiosko (marca como activo + device_id)
///
/// Acceso a configuración: Solo admin puede modificar
/// Desactivar: Botón para liberar el kiosko
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
  bool _isDeactivating = false;
  bool _isAdminAuthenticated = false;
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
  bool _gpsSavedToBackend = false;

  // Admin auth
  final _adminUserController = TextEditingController();
  final _adminPassController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _initializeScreen();
  }

  @override
  void dispose() {
    _adminUserController.dispose();
    _adminPassController.dispose();
    super.dispose();
  }

  Future<void> _initializeScreen() async {
    setState(() => _isLoading = true);

    try {
      await _getDeviceId();

      // Probar conexión con el servidor
      final connected = await ConfigService.testConnection();
      setState(() {
        _connectionStatus = connected
            ? '✅ Conectado a ${ConfigService.BACKEND_URL}'
            : '❌ Sin conexión al servidor';
      });

      if (connected) {
        await _loadCompanies();
      }

      // Si es modo edición, cargar configuración actual
      if (widget.isEditMode) {
        _isAdminAuthenticated = true; // Ya validado antes de llegar aquí
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
      _deviceId = 'unknown_device';
    }
  }

  Future<void> _loadCompanies() async {
    try {
      final companies = await ConfigService.getAvailableCompanies();
      setState(() => _companies = companies);

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
      _gpsSavedToBackend = false;
    });

    try {
      final kiosks = await ConfigService.getAvailableKiosks(companyId);
      setState(() => _kiosks = kiosks);

      if (_kiosks.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No hay kioscos disponibles para esta empresa.\nCree kioscos desde el panel web.'),
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
        final company = _companies.firstWhere(
          (c) => c['id'].toString() == config['companyId'],
          orElse: () => <String, dynamic>{},
        );

        if (company.isNotEmpty) {
          setState(() => _selectedCompany = company);
          await _loadKiosks(config['companyId']);

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

        if (config['gpsLat'] != null && config['gpsLng'] != null) {
          setState(() {
            _gpsLat = config['gpsLat'];
            _gpsLng = config['gpsLng'];
            _gpsSavedToBackend = true;
          });
        }
      }
    } catch (e) {
      print('⚠️ [SETUP] Error cargando config actual: $e');
    }
  }

  /// Obtener ubicación GPS del dispositivo
  Future<void> _getGPSLocation() async {
    setState(() => _isGettingLocation = true);

    try {
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

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        _gpsLat = position.latitude;
        _gpsLng = position.longitude;
        _gpsSavedToBackend = false; // Nuevo GPS, aún no guardado en backend
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Ubicación obtenida: ${_gpsLat!.toStringAsFixed(6)}, ${_gpsLng!.toStringAsFixed(6)}'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isGettingLocation = false);
    }
  }

  /// Fijar GPS: Guarda la ubicación en el backend
  Future<void> _fixGPSLocation() async {
    if (_selectedKiosk == null || _selectedCompany == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Primero seleccione empresa y kiosko'), backgroundColor: Colors.orange),
      );
      return;
    }

    if (_gpsLat == null || _gpsLng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Primero obtenga la ubicación GPS'), backgroundColor: Colors.orange),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final success = await ConfigService.updateKioskGPS(
        kioskId: _selectedKiosk!['id'].toString(),
        companyId: _selectedCompany!['id'].toString(),
        gpsLat: _gpsLat!,
        gpsLng: _gpsLng!,
        deviceId: _deviceId,
      );

      if (success) {
        setState(() => _gpsSavedToBackend = true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Ubicación GPS fijada correctamente en el servidor'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error guardando GPS en el servidor'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isSaving = false);
    }
  }

  /// Activar Kiosko: Registra device_id + GPS en el backend
  Future<void> _activateKiosk() async {
    if (_selectedCompany == null || _selectedKiosk == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Seleccione empresa y kiosko'), backgroundColor: Colors.orange),
      );
      return;
    }

    if (_gpsLat == null || _gpsLng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Debe fijar la ubicación GPS antes de activar'), backgroundColor: Colors.orange),
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

      // Registrar activación en backend
      if (_deviceId != null) {
        await ConfigService.registerKioskActivation(
          kioskId: _selectedKiosk!['id'].toString(),
          companyId: _selectedCompany!['id'].toString(),
          deviceId: _deviceId!,
          gpsLat: _gpsLat,
          gpsLng: _gpsLng,
        );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Kiosko "${_selectedKiosk!['name']}" activado correctamente'),
            backgroundColor: Colors.green,
          ),
        );

        // Navegar al modo kiosko (fichaje biométrico)
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => BiometricSelectorScreen()),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error activando: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isSaving = false);
    }
  }

  /// Desactivar Kiosko: Libera el device_id y resetea configuración
  Future<void> _deactivateKiosk() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Desactivar Kiosko'),
        content: const Text(
          '¿Está seguro que desea desactivar este kiosko?\n\n'
          'El kiosko quedará disponible para otro dispositivo.\n'
          'Se requiere autenticación de administrador.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Desactivar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    // Solicitar credenciales de admin
    final adminValid = await _showAdminAuthDialog();
    if (!adminValid) return;

    setState(() => _isDeactivating = true);

    try {
      final config = await ConfigService.getKioskConfig();
      final kioskId = config['kioskId'];
      final companyId = config['companyId'];

      if (kioskId != null && companyId != null) {
        await ConfigService.deactivateKiosk(
          kioskId: kioskId,
          companyId: companyId,
          deviceId: _deviceId,
        );
      } else {
        await ConfigService.resetKioskConfig();
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Kiosko desactivado. Configuración reseteada.'),
            backgroundColor: Colors.green,
          ),
        );

        // Reiniciar la pantalla de setup
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const KioskSetupScreen()),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isDeactivating = false);
    }
  }

  /// Diálogo de autenticación de administrador
  Future<bool> _showAdminAuthDialog() async {
    _adminUserController.clear();
    _adminPassController.clear();

    final companyId = _selectedCompany?['id']?.toString() ??
        (await ConfigService.getKioskConfig())['companyId'] ?? '';

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.admin_panel_settings, color: Colors.blue[700]),
            const SizedBox(width: 8),
            const Text('Acceso Administrador'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Ingrese credenciales de administrador para continuar.',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _adminUserController,
              decoration: InputDecoration(
                labelText: 'Usuario / Email',
                prefixIcon: const Icon(Icons.person),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _adminPassController,
              obscureText: true,
              decoration: InputDecoration(
                labelText: 'Contraseña',
                prefixIcon: const Icon(Icons.lock),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              final validation = await ConfigService.validateAdminCredentials(
                companyId: companyId,
                username: _adminUserController.text.trim(),
                password: _adminPassController.text.trim(),
              );

              if (validation != null && validation['success'] == true) {
                Navigator.pop(ctx, true);
              } else {
                ScaffoldMessenger.of(ctx).showSnackBar(
                  SnackBar(
                    content: Text(validation?['error'] ?? 'Credenciales inválidas'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            child: const Text('Validar'),
          ),
        ],
      ),
    );

    return result ?? false;
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

                  // Formulario (solo si hay conexión)
                  if (_connectionStatus?.startsWith('✅') == true) ...[
                    // Paso 1: Selector de Empresa
                    _buildCompanySelector(),
                    const SizedBox(height: 20),

                    // Paso 2: Selector de Kiosko
                    _buildKioskSelector(),
                    const SizedBox(height: 20),

                    // Paso 3: GPS
                    _buildGPSSection(),
                    const SizedBox(height: 32),

                    // Paso 4: Botón Activar Kiosko
                    _buildActivateButton(),
                    const SizedBox(height: 16),

                    // Botón Desactivar (si ya está configurado)
                    if (widget.isEditMode) ...[
                      _buildDeactivateButton(),
                      const SizedBox(height: 16),
                    ],
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
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
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
            child: Text(_errorMessage!, style: TextStyle(color: Colors.orange[900])),
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
              isExpanded: true,
              decoration: InputDecoration(
                labelText: 'Empresa',
                prefixIcon: const Icon(Icons.business_center),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                filled: true,
                fillColor: Colors.grey[50],
              ),
              hint: const Text('Seleccione una empresa', overflow: TextOverflow.ellipsis, maxLines: 1),
              selectedItemBuilder: (context) {
                return _companies.map((company) {
                  return Text(
                    company['name'] ?? 'Sin nombre',
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  );
                }).toList();
              },
              items: _companies.map((company) {
                return DropdownMenuItem<Map<String, dynamic>>(
                  value: company,
                  child: Text(
                    company['name'] ?? 'Sin nombre',
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                );
              }).toList(),
              onChanged: (company) {
                setState(() {
                  _selectedCompany = company;
                  _selectedKiosk = null;
                  _kiosks = [];
                  _gpsSavedToBackend = false;
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
              'Solo se muestran kioscos disponibles (no asignados a otro dispositivo)',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<Map<String, dynamic>>(
              value: _selectedKiosk,
              isExpanded: true,
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
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
              selectedItemBuilder: (context) {
                return _kiosks.map((kiosk) {
                  return Text(
                    kiosk['name'] ?? 'Sin nombre',
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  );
                }).toList();
              },
              items: _kiosks.map((kiosk) {
                final location = kiosk['location'] ?? '';
                return DropdownMenuItem<Map<String, dynamic>>(
                  value: kiosk,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        kiosk['name'] ?? 'Sin nombre',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                      if (location.isNotEmpty)
                        Text(
                          location,
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                    ],
                  ),
                );
              }).toList(),
              onChanged: _selectedCompany == null
                  ? null
                  : (kiosk) {
                      setState(() {
                        _selectedKiosk = kiosk;
                        _gpsSavedToBackend = false;
                      });

                      // Si el kiosko ya tiene GPS, mostrarlo
                      if (kiosk?['gpsLocation'] != null) {
                        final gps = kiosk!['gpsLocation'];
                        final lat = gps['lat'];
                        final lng = gps['lng'];
                        if (lat != null && lng != null) {
                          final parsedLat = lat is num ? lat.toDouble() : double.tryParse(lat.toString());
                          final parsedLng = lng is num ? lng.toDouble() : double.tryParse(lng.toString());
                          if (parsedLat != null && parsedLng != null) {
                            setState(() {
                              _gpsLat = parsedLat;
                              _gpsLng = parsedLng;
                              _gpsSavedToBackend = true;
                            });
                          }
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
                  '3. Fijar Ubicación GPS',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'La ubicación se guardará en el servidor para validar fichajes',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 16),

            // Mostrar GPS actual
            if (_gpsLat != null && _gpsLng != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _gpsSavedToBackend ? Colors.green[50] : Colors.yellow[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: _gpsSavedToBackend ? Colors.green[300]! : Colors.yellow[700]!,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _gpsSavedToBackend ? Icons.check_circle : Icons.pending,
                      color: _gpsSavedToBackend ? Colors.green[700] : Colors.yellow[800],
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${_gpsLat!.toStringAsFixed(6)}, ${_gpsLng!.toStringAsFixed(6)}',
                            style: TextStyle(
                              fontWeight: FontWeight.w500,
                              color: _gpsSavedToBackend ? Colors.green[800] : Colors.yellow[900],
                            ),
                          ),
                          Text(
                            _gpsSavedToBackend
                                ? 'Guardado en servidor'
                                : 'Pendiente de guardar en servidor',
                            style: TextStyle(
                              fontSize: 11,
                              color: _gpsSavedToBackend ? Colors.green[600] : Colors.yellow[800],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 12),

            // Botón obtener GPS
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _isGettingLocation ? null : _getGPSLocation,
                icon: _isGettingLocation
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.my_location),
                label: Text(
                  _isGettingLocation
                      ? 'Obteniendo ubicación...'
                      : _gpsLat != null
                          ? 'Obtener nueva ubicación'
                          : 'Obtener Ubicación GPS',
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.blue[700],
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Botón FIJAR GPS (guardar en backend)
            if (_gpsLat != null && _gpsLng != null && !_gpsSavedToBackend && _selectedKiosk != null)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _isSaving ? null : _fixGPSLocation,
                  icon: _isSaving
                      ? const SizedBox(
                          width: 20, height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.push_pin),
                  label: const Text(
                    'Fijar Ubicación GPS',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange[700],
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

  Widget _buildActivateButton() {
    final canActivate = _selectedCompany != null &&
        _selectedKiosk != null &&
        _gpsLat != null &&
        _gpsLng != null &&
        _gpsSavedToBackend;

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: canActivate && !_isSaving ? _activateKiosk : null,
        icon: _isSaving
            ? const SizedBox(
                width: 24, height: 24,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              )
            : const Icon(Icons.power_settings_new, size: 28),
        label: Text(
          _isSaving ? 'Activando...' : 'Activar Kiosko',
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: canActivate ? Colors.green[700] : Colors.grey[400],
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 20),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: canActivate ? 4 : 0,
        ),
      ),
    );
  }

  Widget _buildDeactivateButton() {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: _isDeactivating ? null : _deactivateKiosk,
        icon: _isDeactivating
            ? const SizedBox(
                width: 20, height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.red),
              )
            : const Icon(Icons.power_off, color: Colors.red),
        label: Text(
          _isDeactivating ? 'Desactivando...' : 'Desactivar Kiosko',
          style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
        ),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Colors.red),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
          const SizedBox(height: 4),
          Text(
            'v3.0.0 - Kiosk',
            style: TextStyle(fontSize: 10, color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }
}
