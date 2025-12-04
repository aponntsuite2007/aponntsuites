/*
 * 👤 EMPLOYEE PROFILE SCREEN
 * ===========================
 * Pantalla de perfil del empleado
 *
 * Características:
 * - Ver datos personales completos
 * - Solicitar cambios (NO editar directo)
 * - Alertas de documentos por vencer
 * - Estado biométrico con vencimiento
 * - Contacto de emergencia
 *
 * Fecha: 2025-11-30
 * Versión: 1.0.0
 */

import 'package:flutter/material.dart';
import '../services/employee_api_service.dart';

/// 📦 Modelo de solicitud de cambio
class ChangeRequest {
  final String field;
  final String fieldLabel;
  final String currentValue;
  final String requestedValue;
  final String reason;

  ChangeRequest({
    required this.field,
    required this.fieldLabel,
    required this.currentValue,
    required this.requestedValue,
    required this.reason,
  });

  Map<String, dynamic> toJson() => {
        'field': field,
        'field_label': fieldLabel,
        'current_value': currentValue,
        'requested_value': requestedValue,
        'reason': reason,
      };
}

/// 👤 EMPLOYEE PROFILE SCREEN
class EmployeeProfileScreen extends StatefulWidget {
  const EmployeeProfileScreen({Key? key}) : super(key: key);

  @override
  State<EmployeeProfileScreen> createState() => _EmployeeProfileScreenState();
}

class _EmployeeProfileScreenState extends State<EmployeeProfileScreen>
    with SingleTickerProviderStateMixin {
  final EmployeeApiService _api = EmployeeApiService();

  late TabController _tabController;

  // Datos
  Map<String, dynamic>? _profile;
  List<dynamic> _documents = [];
  Map<String, dynamic>? _biometricStatus;
  Map<String, dynamic>? _emergencyContact;
  List<dynamic> _familyMembers = [];

  // Estados
  bool _isLoading = true;
  String? _error;

  // Lista de solicitudes de cambio pendientes (locales)
  final List<ChangeRequest> _pendingChanges = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  /// 📥 Cargar todos los datos
  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Cargar en paralelo
      final results = await Future.wait([
        _api.getMyProfile(),
        _api.getMyDocuments(),
        _api.getBiometricStatus(),
        _api.getEmergencyContact(),
        _api.getMyFamilyInfo(),
      ]);

      setState(() {
        if (results[0].isSuccess) {
          _profile = results[0].data;
        }
        if (results[1].isSuccess) {
          _documents = results[1].data ?? [];
        }
        if (results[2].isSuccess) {
          _biometricStatus = results[2].data;
        }
        if (results[3].isSuccess) {
          _emergencyContact = results[3].data;
        }
        if (results[4].isSuccess) {
          _familyMembers = results[4].data ?? [];
        }
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  /// 📝 Solicitar cambio de un campo
  Future<void> _requestChange(String field, String fieldLabel, String currentValue) async {
    final requestedController = TextEditingController();
    final reasonController = TextEditingController();

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.edit_note, color: Colors.blue),
            const SizedBox(width: 8),
            Expanded(child: Text('Solicitar cambio: $fieldLabel')),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Valor actual
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Valor actual:',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  Text(
                    currentValue.isEmpty ? '(vacío)' : currentValue,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Nuevo valor
            TextField(
              controller: requestedController,
              decoration: const InputDecoration(
                labelText: 'Nuevo valor solicitado',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.edit),
              ),
            ),
            const SizedBox(height: 16),

            // Motivo
            TextField(
              controller: reasonController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Motivo del cambio',
                hintText: 'Explique por qué necesita este cambio',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.description),
              ),
            ),
            const SizedBox(height: 12),

            // Aviso
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.amber.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.amber.shade700, size: 16),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Su solicitud será revisada por RRHH',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              if (requestedController.text.trim().isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Ingrese el nuevo valor')),
                );
                return;
              }
              Navigator.pop(context, true);
            },
            icon: const Icon(Icons.send),
            label: const Text('Enviar solicitud'),
          ),
        ],
      ),
    );

    if (result == true) {
      final change = ChangeRequest(
        field: field,
        fieldLabel: fieldLabel,
        currentValue: currentValue,
        requestedValue: requestedController.text.trim(),
        reason: reasonController.text.trim(),
      );

      // Enviar al servidor
      final response = await _api.requestProfileChange(change.toJson());

      if (response.isSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 8),
                Text('Solicitud enviada para "$fieldLabel"'),
              ],
            ),
            backgroundColor: Colors.green,
          ),
        );
        setState(() {
          _pendingChanges.add(change);
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${response.error}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1B2A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1B263B),
        elevation: 0,
        title: const Text('Mi Perfil'),
        actions: [
          if (_pendingChanges.isNotEmpty)
            Badge(
              label: Text('${_pendingChanges.length}'),
              child: IconButton(
                icon: const Icon(Icons.pending_actions),
                tooltip: 'Cambios pendientes',
                onPressed: _showPendingChanges,
              ),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.cyan,
          tabs: const [
            Tab(icon: Icon(Icons.person), text: 'Datos'),
            Tab(icon: Icon(Icons.folder), text: 'Docs'),
            Tab(icon: Icon(Icons.fingerprint), text: 'Biometría'),
            Tab(icon: Icon(Icons.family_restroom), text: 'Familia'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.cyan))
          : _error != null
              ? _buildError()
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildPersonalDataTab(),
                    _buildDocumentsTab(),
                    _buildBiometricTab(),
                    _buildFamilyTab(),
                  ],
                ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(_error!, style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _loadData,
            icon: const Icon(Icons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }

  // ===========================================
  // 📋 TAB 1: DATOS PERSONALES
  // ===========================================
  Widget _buildPersonalDataTab() {
    if (_profile == null) {
      return const Center(
        child: Text('No hay datos', style: TextStyle(color: Colors.white70)),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Encabezado con foto
        _buildProfileHeader(),
        const SizedBox(height: 24),

        // Sección: Datos Personales
        _buildSection(
          'Datos Personales',
          Icons.person_outline,
          [
            _buildEditableField('first_name', 'Nombre', _profile!['first_name'] ?? ''),
            _buildEditableField('last_name', 'Apellido', _profile!['last_name'] ?? ''),
            _buildEditableField('dni', 'DNI/CUIL', _profile!['dni'] ?? ''),
            _buildReadOnlyField('Email', _profile!['email'] ?? ''),
            _buildEditableField('phone', 'Teléfono', _profile!['phone'] ?? ''),
            _buildEditableField('birth_date', 'Fecha Nacimiento', _formatDate(_profile!['birth_date'])),
            _buildEditableField('gender', 'Género', _profile!['gender'] ?? ''),
            _buildEditableField('nationality', 'Nacionalidad', _profile!['nationality'] ?? ''),
          ],
        ),
        const SizedBox(height: 16),

        // Sección: Dirección
        _buildSection(
          'Dirección',
          Icons.location_on_outlined,
          [
            _buildEditableField('address', 'Dirección', _profile!['address'] ?? ''),
            _buildEditableField('city', 'Ciudad', _profile!['city'] ?? ''),
            _buildEditableField('province', 'Provincia', _profile!['province'] ?? ''),
            _buildEditableField('postal_code', 'Código Postal', _profile!['postal_code'] ?? ''),
          ],
        ),
        const SizedBox(height: 16),

        // Sección: Datos Laborales (solo lectura)
        _buildSection(
          'Datos Laborales',
          Icons.work_outline,
          [
            _buildReadOnlyField('Legajo', _profile!['employee_id'] ?? ''),
            _buildReadOnlyField('Departamento', _profile!['department']?['name'] ?? ''),
            _buildReadOnlyField('Puesto', _profile!['position'] ?? ''),
            _buildReadOnlyField('Fecha Ingreso', _formatDate(_profile!['hire_date'])),
            _buildReadOnlyField('Turno', _profile!['shift']?['name'] ?? ''),
          ],
        ),
      ],
    );
  }

  Widget _buildProfileHeader() {
    final photoUrl = _profile!['photo_url'];
    final fullName = '${_profile!['first_name'] ?? ''} ${_profile!['last_name'] ?? ''}'.trim();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.cyan.shade700, Colors.blue.shade800],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          // Foto
          Hero(
            tag: 'profile_photo',
            child: CircleAvatar(
              radius: 45,
              backgroundColor: Colors.white,
              child: photoUrl != null && photoUrl.isNotEmpty
                  ? ClipOval(
                      child: Image.network(
                        photoUrl,
                        width: 86,
                        height: 86,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.person,
                          size: 50,
                          color: Colors.grey,
                        ),
                      ),
                    )
                  : const Icon(Icons.person, size: 50, color: Colors.grey),
            ),
          ),
          const SizedBox(width: 16),

          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fullName.isEmpty ? 'Empleado' : fullName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _profile!['position'] ?? 'Sin puesto asignado',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Legajo: ${_profile!['employee_id'] ?? 'N/A'}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Botón cambiar foto
          IconButton(
            icon: const Icon(Icons.camera_alt, color: Colors.white),
            tooltip: 'Cambiar foto',
            onPressed: _changePhoto,
          ),
        ],
      ),
    );
  }

  Widget _buildSection(String title, IconData icon, List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(icon, color: Colors.cyan, size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const Divider(color: Colors.white12, height: 1),
          // Campos
          ...children,
        ],
      ),
    );
  }

  Widget _buildEditableField(String field, String label, String value) {
    final hasPendingChange = _pendingChanges.any((c) => c.field == field);

    return ListTile(
      title: Text(
        label,
        style: const TextStyle(color: Colors.white70, fontSize: 12),
      ),
      subtitle: Text(
        value.isEmpty ? '(sin datos)' : value,
        style: TextStyle(
          color: hasPendingChange ? Colors.amber : Colors.white,
          fontSize: 15,
        ),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (hasPendingChange)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.amber.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Pendiente',
                style: TextStyle(fontSize: 10, color: Colors.amber),
              ),
            ),
          IconButton(
            icon: Icon(
              Icons.edit_outlined,
              color: hasPendingChange ? Colors.grey : Colors.cyan,
              size: 20,
            ),
            onPressed: hasPendingChange
                ? null
                : () => _requestChange(field, label, value),
          ),
        ],
      ),
    );
  }

  Widget _buildReadOnlyField(String label, String value) {
    return ListTile(
      title: Text(
        label,
        style: const TextStyle(color: Colors.white70, fontSize: 12),
      ),
      subtitle: Text(
        value.isEmpty ? '(sin datos)' : value,
        style: const TextStyle(color: Colors.white, fontSize: 15),
      ),
      trailing: const Icon(Icons.lock_outline, color: Colors.grey, size: 16),
    );
  }

  // ===========================================
  // 📄 TAB 2: DOCUMENTOS
  // ===========================================
  Widget _buildDocumentsTab() {
    // Separar por estado
    final expired = _documents.where((d) => _isExpired(d['expiration_date'])).toList();
    final expiringSoon = _documents.where((d) => _isExpiringSoon(d['expiration_date']) && !_isExpired(d['expiration_date'])).toList();
    final valid = _documents.where((d) => !_isExpired(d['expiration_date']) && !_isExpiringSoon(d['expiration_date'])).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Resumen
        _buildDocumentSummary(expired.length, expiringSoon.length, valid.length),
        const SizedBox(height: 16),

        // Vencidos (si hay)
        if (expired.isNotEmpty) ...[
          _buildDocumentCategory(
            'Documentos Vencidos',
            Icons.error,
            Colors.red,
            expired,
          ),
          const SizedBox(height: 16),
        ],

        // Próximos a vencer
        if (expiringSoon.isNotEmpty) ...[
          _buildDocumentCategory(
            'Próximos a Vencer',
            Icons.warning,
            Colors.amber,
            expiringSoon,
          ),
          const SizedBox(height: 16),
        ],

        // Vigentes
        if (valid.isNotEmpty)
          _buildDocumentCategory(
            'Documentos Vigentes',
            Icons.check_circle,
            Colors.green,
            valid,
          ),

        // Sin documentos
        if (_documents.isEmpty)
          Center(
            child: Column(
              children: [
                const SizedBox(height: 48),
                Icon(Icons.folder_open, size: 64, color: Colors.grey.shade600),
                const SizedBox(height: 16),
                const Text(
                  'No hay documentos registrados',
                  style: TextStyle(color: Colors.white70),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildDocumentSummary(int expired, int expiring, int valid) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildSummaryItem('Vencidos', expired, Colors.red),
          _buildSummaryItem('Por vencer', expiring, Colors.amber),
          _buildSummaryItem('Vigentes', valid, Colors.green),
        ],
      ),
    );
  }

  Widget _buildSummaryItem(String label, int count, Color color) {
    return Column(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: color.withOpacity(0.2),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              '$count',
              style: TextStyle(
                color: color,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
      ],
    );
  }

  Widget _buildDocumentCategory(
    String title,
    IconData icon,
    Color color,
    List<dynamic> docs,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Icon(icon, color: color, size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Text(
                  '${docs.length} documentos',
                  style: const TextStyle(color: Colors.white54, fontSize: 12),
                ),
              ],
            ),
          ),
          const Divider(color: Colors.white12, height: 1),
          ...docs.map((doc) => _buildDocumentItem(doc, color)),
        ],
      ),
    );
  }

  Widget _buildDocumentItem(dynamic doc, Color accentColor) {
    final expirationDate = doc['expiration_date'];
    final daysRemaining = _getDaysRemaining(expirationDate);

    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: accentColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          _getDocumentIcon(doc['type']),
          color: accentColor,
          size: 20,
        ),
      ),
      title: Text(
        doc['name'] ?? doc['type'] ?? 'Documento',
        style: const TextStyle(color: Colors.white),
      ),
      subtitle: Text(
        expirationDate != null
            ? 'Vence: ${_formatDate(expirationDate)}'
            : 'Sin vencimiento',
        style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12),
      ),
      trailing: daysRemaining != null
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: accentColor.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                daysRemaining < 0
                    ? 'Vencido hace ${-daysRemaining}d'
                    : daysRemaining == 0
                        ? 'Vence hoy'
                        : 'En $daysRemaining días',
                style: TextStyle(color: accentColor, fontSize: 11),
              ),
            )
          : null,
    );
  }

  // ===========================================
  // 🔐 TAB 3: BIOMETRÍA
  // ===========================================
  Widget _buildBiometricTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Estado del registro biométrico
        _buildBiometricStatusCard(),
        const SizedBox(height: 16),

        // Información de vencimiento
        _buildBiometricExpirationCard(),
        const SizedBox(height: 16),

        // Consentimiento
        _buildBiometricConsentCard(),
      ],
    );
  }

  Widget _buildBiometricStatusCard() {
    final isRegistered = _biometricStatus?['is_registered'] == true;
    final lastUpdate = _biometricStatus?['last_update'];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isRegistered
              ? [Colors.green.shade700, Colors.green.shade900]
              : [Colors.orange.shade700, Colors.orange.shade900],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Icon(
            isRegistered ? Icons.verified_user : Icons.fingerprint,
            size: 64,
            color: Colors.white,
          ),
          const SizedBox(height: 12),
          Text(
            isRegistered ? 'Registro Biométrico Activo' : 'Sin Registro Biométrico',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          if (lastUpdate != null)
            Text(
              'Última actualización: ${_formatDate(lastUpdate)}',
              style: TextStyle(color: Colors.white.withOpacity(0.8)),
            ),
          const SizedBox(height: 16),
          if (!isRegistered)
            ElevatedButton.icon(
              onPressed: _goToBiometricCapture,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: Colors.orange.shade700,
              ),
              icon: const Icon(Icons.camera_alt),
              label: const Text('Registrar Biometría'),
            ),
        ],
      ),
    );
  }

  Widget _buildBiometricExpirationCard() {
    final expirationDate = _biometricStatus?['expiration_date'];
    final isExpired = _isExpired(expirationDate);
    final isExpiringSoon = _isExpiringSoon(expirationDate);
    final daysRemaining = _getDaysRemaining(expirationDate);

    Color cardColor;
    String statusText;
    IconData statusIcon;

    if (isExpired) {
      cardColor = Colors.red;
      statusText = 'Renovación Requerida';
      statusIcon = Icons.error;
    } else if (isExpiringSoon) {
      cardColor = Colors.amber;
      statusText = 'Próximo a Vencer';
      statusIcon = Icons.warning;
    } else {
      cardColor = Colors.green;
      statusText = 'Vigente';
      statusIcon = Icons.check_circle;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardColor.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.event, color: Colors.cyan, size: 20),
              const SizedBox(width: 8),
              const Text(
                'Vencimiento del Registro',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Fecha y estado
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Fecha de vencimiento',
                      style: TextStyle(color: Colors.white54, fontSize: 12),
                    ),
                    Text(
                      expirationDate != null
                          ? _formatDate(expirationDate)
                          : 'No configurado',
                      style: const TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: cardColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    Icon(statusIcon, color: cardColor, size: 16),
                    const SizedBox(width: 4),
                    Text(
                      statusText,
                      style: TextStyle(color: cardColor, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Días restantes
          if (daysRemaining != null) ...[
            const SizedBox(height: 12),
            LinearProgressIndicator(
              value: isExpired ? 0 : (daysRemaining / 365).clamp(0, 1),
              backgroundColor: Colors.white12,
              valueColor: AlwaysStoppedAnimation<Color>(cardColor),
            ),
            const SizedBox(height: 8),
            Text(
              isExpired
                  ? 'Vencido hace ${-daysRemaining} días'
                  : '$daysRemaining días restantes',
              style: TextStyle(color: cardColor, fontSize: 12),
            ),
          ],

          // Botón renovar
          if (isExpired || isExpiringSoon) ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _goToBiometricCapture,
                style: ElevatedButton.styleFrom(
                  backgroundColor: cardColor,
                ),
                icon: const Icon(Icons.refresh),
                label: const Text('Renovar Registro'),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBiometricConsentCard() {
    final hasConsent = _biometricStatus?['consent_given'] == true;
    final consentDate = _biometricStatus?['consent_date'];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                hasConsent ? Icons.gpp_good : Icons.gpp_bad,
                color: hasConsent ? Colors.green : Colors.amber,
                size: 20,
              ),
              const SizedBox(width: 8),
              const Text(
                'Consentimiento GDPR',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            hasConsent
                ? 'Consentimiento otorgado el ${_formatDate(consentDate)}'
                : 'No ha dado consentimiento para el uso de datos biométricos',
            style: const TextStyle(color: Colors.white70),
          ),
          if (!hasConsent) ...[
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _showConsentDialog,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.cyan,
              ),
              child: const Text('Ver y Aceptar Términos'),
            ),
          ],
        ],
      ),
    );
  }

  // ===========================================
  // 👨‍👩‍👧 TAB 4: FAMILIA
  // ===========================================
  Widget _buildFamilyTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Contacto de emergencia
        _buildEmergencyContactCard(),
        const SizedBox(height: 16),

        // Miembros familiares
        _buildFamilyMembersCard(),
      ],
    );
  }

  Widget _buildEmergencyContactCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.emergency, color: Colors.red, size: 20),
              const SizedBox(width: 8),
              const Text(
                'Contacto de Emergencia',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.edit, color: Colors.cyan, size: 18),
                onPressed: _editEmergencyContact,
              ),
            ],
          ),
          const Divider(color: Colors.white12),
          if (_emergencyContact != null) ...[
            _buildContactField('Nombre', _emergencyContact!['name']),
            _buildContactField('Relación', _emergencyContact!['relationship']),
            _buildContactField('Teléfono', _emergencyContact!['phone']),
          ] else
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text(
                'No hay contacto de emergencia registrado',
                style: TextStyle(color: Colors.white54),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildContactField(String label, String? value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: const TextStyle(color: Colors.white54, fontSize: 12),
            ),
          ),
          Expanded(
            child: Text(
              value ?? '(vacío)',
              style: const TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFamilyMembersCard() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Icon(Icons.family_restroom, color: Colors.cyan, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Grupo Familiar',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Text(
                  '${_familyMembers.length} miembros',
                  style: const TextStyle(color: Colors.white54, fontSize: 12),
                ),
              ],
            ),
          ),
          const Divider(color: Colors.white12, height: 1),
          if (_familyMembers.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(
                child: Text(
                  'No hay miembros familiares registrados',
                  style: TextStyle(color: Colors.white54),
                ),
              ),
            )
          else
            ..._familyMembers.map((member) => ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.cyan.withOpacity(0.2),
                    child: Text(
                      (member['name'] ?? 'F')[0].toUpperCase(),
                      style: const TextStyle(color: Colors.cyan),
                    ),
                  ),
                  title: Text(
                    member['name'] ?? 'Sin nombre',
                    style: const TextStyle(color: Colors.white),
                  ),
                  subtitle: Text(
                    member['relationship'] ?? '',
                    style: const TextStyle(color: Colors.white54, fontSize: 12),
                  ),
                  trailing: Text(
                    _formatDate(member['birth_date']),
                    style: const TextStyle(color: Colors.white38, fontSize: 12),
                  ),
                )),
        ],
      ),
    );
  }

  // ===========================================
  // 🛠️ UTILIDADES
  // ===========================================

  String _formatDate(dynamic date) {
    if (date == null) return '';
    try {
      final d = DateTime.parse(date.toString());
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
    } catch (e) {
      return date.toString();
    }
  }

  bool _isExpired(dynamic date) {
    if (date == null) return false;
    try {
      final d = DateTime.parse(date.toString());
      return d.isBefore(DateTime.now());
    } catch (e) {
      return false;
    }
  }

  bool _isExpiringSoon(dynamic date, {int daysThreshold = 30}) {
    if (date == null) return false;
    try {
      final d = DateTime.parse(date.toString());
      final diff = d.difference(DateTime.now()).inDays;
      return diff >= 0 && diff <= daysThreshold;
    } catch (e) {
      return false;
    }
  }

  int? _getDaysRemaining(dynamic date) {
    if (date == null) return null;
    try {
      final d = DateTime.parse(date.toString());
      return d.difference(DateTime.now()).inDays;
    } catch (e) {
      return null;
    }
  }

  IconData _getDocumentIcon(String? type) {
    switch (type?.toLowerCase()) {
      case 'dni':
      case 'id':
        return Icons.badge;
      case 'license':
      case 'carnet':
        return Icons.credit_card;
      case 'certificate':
      case 'certificado':
        return Icons.school;
      case 'contract':
      case 'contrato':
        return Icons.description;
      case 'medical':
      case 'aptitud':
        return Icons.medical_services;
      default:
        return Icons.insert_drive_file;
    }
  }

  // Acciones
  void _showPendingChanges() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1B263B),
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Cambios Pendientes de Revisión',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ..._pendingChanges.map((c) => ListTile(
                  leading: const Icon(Icons.pending, color: Colors.amber),
                  title: Text(c.fieldLabel, style: const TextStyle(color: Colors.white)),
                  subtitle: Text(
                    '${c.currentValue} → ${c.requestedValue}',
                    style: const TextStyle(color: Colors.white54),
                  ),
                )),
          ],
        ),
      ),
    );
  }

  void _changePhoto() {
    // Navegar a la captura de foto o seleccionar de galería
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Funcionalidad de cambio de foto próximamente')),
    );
  }

  void _goToBiometricCapture() {
    // Navegar a la pantalla de captura biométrica
    Navigator.pushNamed(context, '/biometric');
  }

  void _showConsentDialog() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Consentimiento de Datos Biométricos'),
        content: const SingleChildScrollView(
          child: Text(
            'Al aceptar, usted consiente el uso de sus datos biométricos '
            '(imagen facial) para el registro de asistencia.\n\n'
            'Sus datos serán:\n'
            '• Almacenados de forma segura\n'
            '• Usados únicamente para control de asistencia\n'
            '• Protegidos según normativas GDPR\n'
            '• Eliminados a su solicitud\n\n'
            '¿Acepta estos términos?',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Rechazar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Aceptar'),
          ),
        ],
      ),
    );

    if (result == true) {
      final response = await _api.giveBiometricConsent();
      if (response.isSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Consentimiento registrado correctamente'),
            backgroundColor: Colors.green,
          ),
        );
        _loadData();
      }
    }
  }

  void _editEmergencyContact() async {
    final nameController = TextEditingController(text: _emergencyContact?['name'] ?? '');
    final relationController = TextEditingController(text: _emergencyContact?['relationship'] ?? '');
    final phoneController = TextEditingController(text: _emergencyContact?['phone'] ?? '');

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Contacto de Emergencia'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(
                labelText: 'Nombre completo',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: relationController,
              decoration: const InputDecoration(
                labelText: 'Relación (ej: Esposo/a, Padre, Madre)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Teléfono',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );

    if (result == true) {
      final response = await _api.updateEmergencyContact({
        'name': nameController.text,
        'relationship': relationController.text,
        'phone': phoneController.text,
      });

      if (response.isSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Contacto actualizado'),
            backgroundColor: Colors.green,
          ),
        );
        _loadData();
      }
    }
  }
}
