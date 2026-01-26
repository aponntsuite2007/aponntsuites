import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../services/real_auth_service.dart';
import '../../services/simple_face_service.dart';
import '../attendance/main_attendance_screen.dart';

class RealLoginScreen extends StatefulWidget {
  @override
  _RealLoginScreenState createState() => _RealLoginScreenState();
}

class _RealLoginScreenState extends State<RealLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _companySlugController = TextEditingController(text: 'aponnt-empresa-demo');
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  
  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;
  
  // For facial biometric
  bool _showBiometricOptions = false;
  List<Map<String, dynamic>> _users = [];
  Map<String, dynamic>? _selectedUser;

  @override
  void initState() {
    super.initState();
    _initializeAuth();
  }

  Future<void> _initializeAuth() async {
    await RealAuthService.initialize();
    
    // Check if already authenticated
    if (RealAuthService.isAuthenticated) {
      _navigateToMainScreen();
    }
  }

  void _navigateToMainScreen() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => MainAttendanceScreen()),
    );
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final result = await RealAuthService.login(
        identifier: _identifierController.text.trim(),
        password: _passwordController.text,
        companySlug: _companySlugController.text.trim(),
      );

      if (result['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ ${result['message']}'),
            backgroundColor: Colors.green,
          ),
        );
        _navigateToMainScreen();
      } else {
        setState(() {
          _errorMessage = result['error'];
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error de conexión: $e';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadUsersForBiometric() async {
    setState(() => _isLoading = true);
    
    // First login as admin to get users list
    final adminResult = await RealAuthService.login(
      identifier: 'admin@empresa.com',
      password: 'admin123',
    );
    
    if (adminResult['success'] == true) {
      final usersResult = await RealAuthService.getUsers();
      if (usersResult['success'] == true) {
        setState(() {
          _users = List<Map<String, dynamic>>.from(usersResult['users']);
          _showBiometricOptions = true;
        });
      }
    }
    
    setState(() => _isLoading = false);
  }

  Future<void> _loginWithFacialBiometric() async {
    if (_selectedUser == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Selecciona un usuario para la verificación facial')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Initialize face capture service
      await SimpleFaceService.initialize();
      
      // Simulate face capture
      final faceData = await SimpleFaceService.captureAndProcessFace();
      
      if (faceData != null && faceData['success'] == true) {
        // Verify with backend
        final verifyResult = await RealAuthService.verifyFacialBiometric(
          userId: _selectedUser!['id'],
          faceEmbedding: faceData['embedding'] as String,
          qualityScore: (faceData['quality'] as double?) ?? 85.0,
        );

        if (verifyResult['success'] == true && verifyResult['verified'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✅ Login biométrico exitoso'),
              backgroundColor: Colors.green,
            ),
          );
          
          // Update login state (simulate logged in as this user)
          await RealAuthService.logout(); // Clear admin login
          
          // You might want to create a special biometric login method
          _navigateToMainScreen();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('❌ Verificación facial falló: ${verifyResult['error']}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error capturando imagen facial'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('❌ Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Widget _buildBiometricOptions() {
    if (!_showBiometricOptions) return SizedBox.shrink();

    return Container(
      margin: EdgeInsets.only(top: 20),
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.face, color: Colors.blue),
              SizedBox(width: 8),
              Text(
                'Login Biométrico Facial',
                style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue),
              ),
            ],
          ),
          SizedBox(height: 12),
          DropdownButtonFormField<Map<String, dynamic>>(
            value: _selectedUser,
            decoration: InputDecoration(
              labelText: 'Seleccionar Usuario',
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            items: _users.map((user) {
              return DropdownMenuItem<Map<String, dynamic>>(
                value: user,
                child: Text('${user['firstName']} ${user['lastName']} (${user['employeeId']})'),
              );
            }).toList(),
            onChanged: (value) {
              setState(() => _selectedUser = value);
            },
          ),
          SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _selectedUser != null ? _loginWithFacialBiometric : null,
                  icon: Icon(Icons.camera_alt),
                  label: Text('Verificar con Cámara'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
              SizedBox(width: 8),
              IconButton(
                onPressed: () {
                  setState(() => _showBiometricOptions = false);
                },
                icon: Icon(Icons.close),
                tooltip: 'Cerrar',
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(height: 40),
              
              // Logo and title
              Container(
                padding: EdgeInsets.all(20),
                child: Column(
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: Colors.blue,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Icon(Icons.fingerprint, size: 40, color: Colors.white),
                    ),
                    SizedBox(height: 16),
                    Text(
                      'Sistema de Asistencia',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey[800],
                      ),
                    ),
                    Text(
                      'Biométrico v1.0',
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              
              SizedBox(height: 32),
              
              // Login form
              Container(
                padding: EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.grey.withOpacity(0.1),
                      spreadRadius: 1,
                      blurRadius: 10,
                    ),
                  ],
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Iniciar Sesión',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[800],
                        ),
                        textAlign: TextAlign.center,
                      ),
                      
                      SizedBox(height: 24),

                      // Company slug field
                      TextFormField(
                        controller: _companySlugController,
                        decoration: InputDecoration(
                          labelText: 'Empresa (slug)',
                          prefixIcon: Icon(Icons.business),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Ingrese el slug de la empresa';
                          }
                          return null;
                        },
                      ),

                      SizedBox(height: 16),

                      // Username/Email field
                      TextFormField(
                        controller: _identifierController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: InputDecoration(
                          labelText: 'Email o ID Empleado',
                          prefixIcon: Icon(Icons.person),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Ingrese su email o ID de empleado';
                          }
                          return null;
                        },
                      ),
                      
                      SizedBox(height: 16),
                      
                      // Password field
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: 'Contraseña',
                          prefixIcon: Icon(Icons.lock),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility : Icons.visibility_off,
                            ),
                            onPressed: () {
                              setState(() => _obscurePassword = !_obscurePassword);
                            },
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Ingrese su contraseña';
                          }
                          return null;
                        },
                      ),
                      
                      if (_errorMessage != null) ...[
                        SizedBox(height: 16),
                        Container(
                          padding: EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.red.shade200),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.error, color: Colors.red, size: 20),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _errorMessage!,
                                  style: TextStyle(color: Colors.red[700]),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      
                      SizedBox(height: 24),
                      
                      // Login button
                      ElevatedButton(
                        onPressed: _isLoading ? null : _login,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          foregroundColor: Colors.white,
                          padding: EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _isLoading
                            ? Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                    ),
                                  ),
                                  SizedBox(width: 12),
                                  Text('Iniciando sesión...'),
                                ],
                              )
                            : Text(
                                'Iniciar Sesión',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                      ),
                      
                      SizedBox(height: 16),
                      
                      // Biometric login button
                      OutlinedButton.icon(
                        onPressed: _isLoading ? null : _loadUsersForBiometric,
                        icon: Icon(Icons.face),
                        label: Text('Login con Biometría Facial'),
                        style: OutlinedButton.styleFrom(
                          padding: EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                      
                      // Biometric options
                      _buildBiometricOptions(),
                    ],
                  ),
                ),
              ),
              
              SizedBox(height: 32),
              
              // Connection info
              Container(
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: Colors.green,
                            shape: BoxShape.circle,
                          ),
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Conectado a 10.0.2.2:3001 (Emulador)',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                      ],
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Base de datos MySQL Real',
                      style: TextStyle(fontSize: 10, color: Colors.grey[500]),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}