import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:local_auth/local_auth.dart';
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'dart:io';
import 'dart:convert';
import 'dart:math';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final prefs = await SharedPreferences.getInstance();
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider(prefs)),
        ChangeNotifierProvider(create: (_) => AttendanceProvider()),
      ],
      child: AttendanceApp(),
    ),
  );
}

class AttendanceApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sistema de Asistencia Biométrico',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          if (authProvider.isAuthenticated) {
            return HomeScreen();
          } else {
            return LoginScreen();
          }
        },
      ),
    );
  }
}

class AuthProvider with ChangeNotifier {
  final SharedPreferences _prefs;
  bool _isAuthenticated = false;
  String? _username;
  String? _userPhoto;

  AuthProvider(this._prefs) {
    _loadAuthState();
  }

  bool get isAuthenticated => _isAuthenticated;
  String? get username => _username;
  String? get userPhoto => _userPhoto;

  void _loadAuthState() {
    _isAuthenticated = _prefs.getBool('is_authenticated') ?? false;
    _username = _prefs.getString('username');
    _userPhoto = _prefs.getString('user_photo');
    notifyListeners();
  }

  Future<bool> login(String username, String password) async {
    if (username.isNotEmpty && password.isNotEmpty) {
      _isAuthenticated = true;
      _username = username;
      
      await _prefs.setBool('is_authenticated', true);
      await _prefs.setString('username', username);
      
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<void> setUserPhoto(String photoPath) async {
    _userPhoto = photoPath;
    await _prefs.setString('user_photo', photoPath);
    notifyListeners();
  }

  Future<void> logout() async {
    _isAuthenticated = false;
    _username = null;
    _userPhoto = null;
    
    await _prefs.clear();
    
    notifyListeners();
  }
}

class AttendanceProvider with ChangeNotifier {
  List<AttendanceRecord> _records = [];
  Position? _currentPosition;
  String? _currentAddress;

  List<AttendanceRecord> get records => _records;
  Position? get currentPosition => _currentPosition;
  String? get currentAddress => _currentAddress;

  Future<void> updateLocation() async {
    try {
      _currentPosition = await Geolocator.getCurrentPosition();
      List<Placemark> placemarks = await placemarkFromCoordinates(
        _currentPosition!.latitude,
        _currentPosition!.longitude,
      );
      if (placemarks.isNotEmpty) {
        final place = placemarks.first;
        _currentAddress = '${place.street}, ${place.locality}';
      }
      notifyListeners();
    } catch (e) {
      print('Error getting location: $e');
    }
  }

  void addRecord(AttendanceRecord record) {
    _records.insert(0, record);
    notifyListeners();
  }
}

class AttendanceRecord {
  final String id;
  final String type; // 'entry' or 'exit'
  final DateTime timestamp;
  final Position? position;
  final String? address;
  final String? photoPath;
  final String method; // 'biometric', 'qr', 'manual'

  AttendanceRecord({
    required this.id,
    required this.type,
    required this.timestamp,
    this.position,
    this.address,
    this.photoPath,
    required this.method,
  });
}

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _localAuth = LocalAuthentication();
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Iniciar Sesión'),
        backgroundColor: Colors.blue,
      ),
      body: Padding(
        padding: EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.fingerprint,
              size: 80,
              color: Colors.blue,
            ),
            SizedBox(height: 32),
            TextField(
              controller: _usernameController,
              decoration: InputDecoration(
                labelText: 'Usuario',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.person),
              ),
            ),
            SizedBox(height: 16),
            TextField(
              controller: _passwordController,
              decoration: InputDecoration(
                labelText: 'Contraseña',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.lock),
              ),
              obscureText: true,
            ),
            SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _handleLogin,
                child: _isLoading
                    ? CircularProgressIndicator(color: Colors.white)
                    : Text('Iniciar Sesión'),
              ),
            ),
            SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                onPressed: _handleBiometricLogin,
                icon: Icon(Icons.fingerprint),
                label: Text('Acceso Biométrico'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleLogin() async {
    setState(() => _isLoading = true);
    
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.login(
      _usernameController.text,
      _passwordController.text,
    );
    
    setState(() => _isLoading = false);
    
    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Credenciales inválidas'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _handleBiometricLogin() async {
    try {
      final bool isAvailable = await _localAuth.canCheckBiometrics;
      if (!isAvailable) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Biometría no disponible')),
        );
        return;
      }

      final bool didAuthenticate = await _localAuth.authenticate(
        localizedReason: 'Autentícate para acceder al sistema',
        options: AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: true,
        ),
      );

      if (didAuthenticate) {
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        await authProvider.login('biometric_user', 'biometric_auth');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error en autenticación biométrica'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}

class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    _requestPermissions();
    _updateLocation();
  }

  Future<void> _requestPermissions() async {
    await Permission.location.request();
    await Permission.camera.request();
  }

  Future<void> _updateLocation() async {
    final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
    await attendanceProvider.updateLocation();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Sistema de Asistencia'),
        backgroundColor: Colors.blue,
        actions: [
          IconButton(
            icon: Icon(Icons.logout),
            onPressed: () {
              Provider.of<AuthProvider>(context, listen: false).logout();
            },
          ),
        ],
      ),
      body: Consumer2<AuthProvider, AttendanceProvider>(
        builder: (context, authProvider, attendanceProvider, _) {
          return Padding(
            padding: EdgeInsets.all(16.0),
            child: Column(
              children: [
                // User info card
                Card(
                  child: Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Row(
                      children: [
                        GestureDetector(
                          onTap: _takePhoto,
                          child: CircleAvatar(
                            radius: 30,
                            backgroundColor: Colors.blue,
                            backgroundImage: authProvider.userPhoto != null 
                              ? FileImage(File(authProvider.userPhoto!))
                              : null,
                            child: authProvider.userPhoto == null
                              ? Icon(Icons.camera_alt, color: Colors.white)
                              : null,
                          ),
                        ),
                        SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Bienvenido, ${authProvider.username}',
                                style: Theme.of(context).textTheme.titleLarge,
                              ),
                              Text('Estado: Conectado'),
                              if (attendanceProvider.currentAddress != null)
                                Text('📍 ${attendanceProvider.currentAddress}'),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 24),
                
                // Feature grid
                Expanded(
                  child: GridView.count(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    children: [
                      _buildFeatureCard(
                        'Fichar Entrada',
                        Icons.login,
                        Colors.green,
                        () => _showAttendanceOptions('entry'),
                      ),
                      _buildFeatureCard(
                        'Fichar Salida',
                        Icons.logout,
                        Colors.orange,
                        () => _showAttendanceOptions('exit'),
                      ),
                      _buildFeatureCard(
                        'Mi QR Personal',
                        Icons.qr_code,
                        Colors.blue,
                        _showPersonalQR,
                      ),
                      _buildFeatureCard(
                        'Escanear QR',
                        Icons.qr_code_scanner,
                        Colors.purple,
                        _scanQRCode,
                      ),
                      _buildFeatureCard(
                        'Ver Historial',
                        Icons.history,
                        Colors.indigo,
                        () => _showHistory(context),
                      ),
                      _buildFeatureCard(
                        'Configuración',
                        Icons.settings,
                        Colors.grey,
                        () => _showMessage('Configuración abierta'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildFeatureCard(String title, IconData icon, Color color, VoidCallback onTap) {
    return Card(
      elevation: 4,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 48, color: color),
              SizedBox(height: 8),
              Text(
                title,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAttendanceOptions(String type) {
    showModalBottomSheet(
      context: context,
      builder: (context) => AttendanceOptionsSheet(type: type),
    );
  }

  void _showPersonalQR() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final qrData = jsonEncode({
      'user': authProvider.username,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'action': 'attendance_qr'
    });

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Mi Código QR Personal'),
        content: Container(
          width: 200,
          height: 200,
          child: QrImageView(
            data: qrData,
            version: QrVersions.auto,
            size: 200.0,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  Future<void> _scanQRCode() async {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => QRScannerScreen()),
    );
  }

  Future<void> _takePhoto() async {
    final ImagePicker picker = ImagePicker();
    final XFile? photo = await picker.pickImage(source: ImageSource.camera);
    
    if (photo != null) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.setUserPhoto(photo.path);
      _showMessage('Foto actualizada');
    }
  }

  void _showHistory(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => AttendanceHistoryScreen()),
    );
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
      ),
    );
  }
}

class AttendanceOptionsSheet extends StatelessWidget {
  final String type;

  AttendanceOptionsSheet({required this.type});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Fichar ${type == 'entry' ? 'Entrada' : 'Salida'}',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          SizedBox(height: 16),
          ListTile(
            leading: Icon(Icons.fingerprint, color: Colors.blue),
            title: Text('Con Biometría'),
            onTap: () => _recordAttendance(context, 'biometric'),
          ),
          ListTile(
            leading: Icon(Icons.camera_alt, color: Colors.green),
            title: Text('Con Foto'),
            onTap: () => _recordAttendance(context, 'photo'),
          ),
          ListTile(
            leading: Icon(Icons.touch_app, color: Colors.orange),
            title: Text('Manual'),
            onTap: () => _recordAttendance(context, 'manual'),
          ),
        ],
      ),
    );
  }

  Future<void> _recordAttendance(BuildContext context, String method) async {
    Navigator.pop(context);
    
    final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
    await attendanceProvider.updateLocation();

    String? photoPath;
    
    if (method == 'photo') {
      final ImagePicker picker = ImagePicker();
      final XFile? photo = await picker.pickImage(source: ImageSource.camera);
      photoPath = photo?.path;
    }

    final record = AttendanceRecord(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      type: type,
      timestamp: DateTime.now(),
      position: attendanceProvider.currentPosition,
      address: attendanceProvider.currentAddress,
      photoPath: photoPath,
      method: method,
    );

    attendanceProvider.addRecord(record);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${type == 'entry' ? 'Entrada' : 'Salida'} registrada con $method'),
        backgroundColor: Colors.green,
      ),
    );
  }
}

class QRScannerScreen extends StatefulWidget {
  @override
  _QRScannerScreenState createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  MobileScannerController cameraController = MobileScannerController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Escanear QR'),
        backgroundColor: Colors.blue,
        actions: [
          IconButton(
            icon: Icon(Icons.flash_on),
            onPressed: () => cameraController.toggleTorch(),
          ),
        ],
      ),
      body: MobileScanner(
        controller: cameraController,
        onDetect: (capture) {
          final List<Barcode> barcodes = capture.barcodes;
          for (final barcode in barcodes) {
            _handleQRScanned(barcode.rawValue ?? '');
            break;
          }
        },
      ),
    );
  }

  void _handleQRScanned(String qrData) {
    Navigator.pop(context);
    
    try {
      final data = jsonDecode(qrData);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('QR Escaneado: ${data['user'] ?? qrData}'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('QR Escaneado: $qrData'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  @override
  void dispose() {
    cameraController.dispose();
    super.dispose();
  }
}

class AttendanceHistoryScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Historial de Asistencia'),
        backgroundColor: Colors.blue,
      ),
      body: Consumer<AttendanceProvider>(
        builder: (context, provider, _) {
          if (provider.records.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.history, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('No hay registros de asistencia'),
                ],
              ),
            );
          }

          return ListView.builder(
            itemCount: provider.records.length,
            itemBuilder: (context, index) {
              final record = provider.records[index];
              return Card(
                margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: record.type == 'entry' ? Colors.green : Colors.orange,
                    child: Icon(
                      record.type == 'entry' ? Icons.login : Icons.logout,
                      color: Colors.white,
                    ),
                  ),
                  title: Text(record.type == 'entry' ? 'Entrada' : 'Salida'),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(record.timestamp.toString().substring(0, 19)),
                      if (record.address != null) Text('📍 ${record.address}'),
                      Text('Método: ${record.method}'),
                    ],
                  ),
                  trailing: record.photoPath != null
                    ? CircleAvatar(
                        backgroundImage: FileImage(File(record.photoPath!)),
                      )
                    : null,
                ),
              );
            },
          );
        },
      ),
    );
  }
}