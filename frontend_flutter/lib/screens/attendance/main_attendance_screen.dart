import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../services/real_auth_service.dart';
import '../auth/real_login_screen.dart';

class MainAttendanceScreen extends StatefulWidget {
  @override
  _MainAttendanceScreenState createState() => _MainAttendanceScreenState();
}

class _MainAttendanceScreenState extends State<MainAttendanceScreen> {
  static const String _baseUrl = 'http://10.168.100.5:9998/api/v1';

  Map<String, dynamic>? _currentUser;
  bool _isLoading = false;
  bool _hasCheckedIn = false;
  bool _hasCheckedOut = false;
  String? _checkInTime;
  String? _checkOutTime;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  void _loadUserData() {
    setState(() {
      _currentUser = RealAuthService.currentUser;
    });
    _checkTodayStatus();
  }

  Future<void> _checkTodayStatus() async {
    final token = RealAuthService.authToken;
    if (token == null) return;

    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/attendance/today/status'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _hasCheckedIn = data['hasCheckedIn'] ?? false;
          _hasCheckedOut = data['hasCheckedOut'] ?? false;
          if (data['attendance'] != null) {
            _checkInTime = data['attendance']['check_in'];
            _checkOutTime = data['attendance']['check_out'];
          }
        });
      }
    } catch (e) {
      print('Error checking status: $e');
    }
  }

  Future<void> _doCheckIn() async {
    setState(() => _isLoading = true);
    final token = RealAuthService.authToken;

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/attendance/checkin'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'method': 'mobile_app'}),
      );

      final data = json.decode(response.body);
      if (response.statusCode == 201) {
        setState(() => _hasCheckedIn = true);
        _checkTodayStatus();
        _showMessage('Entrada registrada correctamente');
      } else {
        _showMessage(data['error'] ?? 'Error registrando entrada');
      }
    } catch (e) {
      _showMessage('Error de conexion: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _doCheckOut() async {
    setState(() => _isLoading = true);
    final token = RealAuthService.authToken;

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/attendance/checkout'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'method': 'mobile_app'}),
      );

      final data = json.decode(response.body);
      if (response.statusCode == 200) {
        setState(() => _hasCheckedOut = true);
        _checkTodayStatus();
        _showMessage('Salida registrada correctamente');
      } else {
        _showMessage(data['error'] ?? 'Error registrando salida');
      }
    } catch (e) {
      _showMessage('Error de conexion: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _logout() async {
    await RealAuthService.logout();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => RealLoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: Text('Sistema de Asistencia'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(Icons.logout),
            onPressed: _logout,
            tooltip: 'Cerrar sesión',
          ),
        ],
      ),
      body: _currentUser == null
          ? Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Welcome Card
                  Container(
                    width: double.infinity,
                    padding: EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Colors.blue, Colors.blue.shade700],
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.blue.withOpacity(0.3),
                          spreadRadius: 1,
                          blurRadius: 10,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 30,
                              backgroundColor: Colors.white,
                              child: Icon(Icons.person, size: 35, color: Colors.blue),
                            ),
                            SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '¡Bienvenido!',
                                    style: TextStyle(
                                      color: Colors.white70,
                                      fontSize: 14,
                                    ),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    '${_currentUser!['firstName']} ${_currentUser!['lastName']}',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 16),
                        Divider(color: Colors.white30),
                        SizedBox(height: 12),
                        Row(
                          children: [
                            _buildInfoChip(
                              Icons.badge,
                              'ID: ${_currentUser!['employeeId']}',
                            ),
                            SizedBox(width: 12),
                            _buildInfoChip(
                              Icons.work,
                              _currentUser!['role'] ?? 'Empleado',
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  SizedBox(height: 24),

                  // Quick Actions
                  Text(
                    'Acciones Rápidas',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[800],
                    ),
                  ),

                  SizedBox(height: 16),

                  // Attendance status banner
                  if (_hasCheckedIn) ...[
                    Container(
                      width: double.infinity,
                      padding: EdgeInsets.all(12),
                      margin: EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: _hasCheckedOut ? Colors.grey.shade100 : Colors.green.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _hasCheckedOut ? Colors.grey.shade300 : Colors.green.shade300,
                        ),
                      ),
                      child: Column(
                        children: [
                          if (_checkInTime != null)
                            Text(
                              'Entrada: ${_formatTime(_checkInTime!)}',
                              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green.shade700),
                            ),
                          if (_checkOutTime != null)
                            Text(
                              'Salida: ${_formatTime(_checkOutTime!)}',
                              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange.shade700),
                            ),
                          if (_hasCheckedOut)
                            Text('Jornada completada', style: TextStyle(color: Colors.grey)),
                        ],
                      ),
                    ),
                  ],

                  Row(
                    children: [
                      Expanded(
                        child: _buildActionCard(
                          icon: Icons.login,
                          title: 'Entrada',
                          subtitle: _hasCheckedIn ? 'Ya registrada' : 'Registrar entrada',
                          color: _hasCheckedIn ? Colors.grey : Colors.green,
                          onTap: (_isLoading || _hasCheckedIn) ? () {} : _doCheckIn,
                        ),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: _buildActionCard(
                          icon: Icons.logout,
                          title: 'Salida',
                          subtitle: _hasCheckedOut ? 'Ya registrada' : 'Registrar salida',
                          color: (_hasCheckedIn && !_hasCheckedOut) ? Colors.orange : Colors.grey,
                          onTap: (_isLoading || !_hasCheckedIn || _hasCheckedOut) ? () {} : _doCheckOut,
                        ),
                      ),
                    ],
                  ),

                  SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: _buildActionCard(
                          icon: Icons.history,
                          title: 'Historial',
                          subtitle: 'Ver asistencias',
                          color: Colors.blue,
                          onTap: () {
                            _showMessage('Funcionalidad de historial en desarrollo');
                          },
                        ),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: _buildActionCard(
                          icon: Icons.person,
                          title: 'Perfil',
                          subtitle: 'Mis datos',
                          color: Colors.purple,
                          onTap: () {
                            _showUserInfo();
                          },
                        ),
                      ),
                    ],
                  ),

                  SizedBox(height: 24),

                  // Status Card
                  Container(
                    width: double.infinity,
                    padding: EdgeInsets.all(20),
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
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.info_outline, color: Colors.blue),
                            SizedBox(width: 8),
                            Text(
                              'Estado del Sistema',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 16),
                        _buildStatusRow(
                          '🟢',
                          'Conexión al servidor',
                          'Conectado',
                          Colors.green,
                        ),
                        SizedBox(height: 8),
                        _buildStatusRow(
                          '✅',
                          'Autenticación',
                          'Activa',
                          Colors.green,
                        ),
                        SizedBox(height: 8),
                        _buildStatusRow(
                          '📱',
                          'Versión de la app',
                          'v2.0.0 - Beta',
                          Colors.blue,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: Colors.white),
          SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(16),
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
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 32, color: color),
            ),
            SizedBox(height: 12),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.grey[800],
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 4),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusRow(String emoji, String label, String value, Color valueColor) {
    return Row(
      children: [
        Text(emoji, style: TextStyle(fontSize: 16)),
        SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: TextStyle(fontSize: 14, color: Colors.grey[700]),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: valueColor,
          ),
        ),
      ],
    );
  }

  String _formatTime(String isoDate) {
    try {
      final dt = DateTime.parse(isoDate).toLocal();
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return isoDate;
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _showUserInfo() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Información del Usuario'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildUserInfoRow('Nombre:', '${_currentUser!['firstName']} ${_currentUser!['lastName']}'),
            SizedBox(height: 8),
            _buildUserInfoRow('Email:', _currentUser!['email']),
            SizedBox(height: 8),
            _buildUserInfoRow('ID Empleado:', _currentUser!['employeeId']),
            SizedBox(height: 8),
            _buildUserInfoRow('Rol:', _currentUser!['role'] ?? 'N/A'),
            if (_currentUser!['department'] != null) ...[
              SizedBox(height: 8),
              _buildUserInfoRow('Departamento:', _currentUser!['department']),
            ],
          ],
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

  Widget _buildUserInfoRow(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
            fontWeight: FontWeight.w500,
          ),
        ),
        SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
