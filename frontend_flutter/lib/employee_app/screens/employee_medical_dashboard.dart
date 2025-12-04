/*
 * 🏥 EMPLOYEE MEDICAL DASHBOARD
 * ===============================
 * Dashboard médico para la APP DEL EMPLEADO
 * Integrado con el sistema médico del panel-empresa
 *
 * Funcionalidades:
 * - Ver solicitudes médicas pendientes
 * - Subir certificados y documentos
 * - Ver historial de ausencias
 * - Recibir notificaciones médicas
 *
 * Fecha: 2025-11-29
 * Versión: 1.0.0
 *
 * ⚠️ ESTE ARCHIVO ES INDEPENDIENTE - NO MODIFICA NADA DEL KIOSK
 */

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' as http_parser;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

import '../services/employee_notification_service.dart';
import '../services/employee_websocket_service.dart';

/// 📄 Tipos de documentos médicos
enum MedicalDocumentType {
  certificate, // Certificado médico
  prescription, // Receta
  study, // Estudio médico
  photo, // Foto solicitada
}

/// 📋 Estado de documento
enum DocumentStatus {
  pending,
  approved,
  rejected,
  expired,
}

/// 📦 Modelo de solicitud médica
class MedicalRequest {
  final String id;
  final String title;
  final String description;
  final MedicalDocumentType type;
  final DateTime? dueDate;
  final DocumentStatus status;
  final bool isUrgent;
  final Map<String, dynamic>? data;

  MedicalRequest({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    this.dueDate,
    this.status = DocumentStatus.pending,
    this.isUrgent = false,
    this.data,
  });

  bool get isOverdue =>
      dueDate != null && DateTime.now().isAfter(dueDate!);

  int get daysUntilDue =>
      dueDate != null ? dueDate!.difference(DateTime.now()).inDays : 0;

  String get typeIcon {
    switch (type) {
      case MedicalDocumentType.certificate:
        return '📄';
      case MedicalDocumentType.prescription:
        return '💊';
      case MedicalDocumentType.study:
        return '🔬';
      case MedicalDocumentType.photo:
        return '📸';
    }
  }

  String get typeName {
    switch (type) {
      case MedicalDocumentType.certificate:
        return 'Certificado';
      case MedicalDocumentType.prescription:
        return 'Receta';
      case MedicalDocumentType.study:
        return 'Estudio';
      case MedicalDocumentType.photo:
        return 'Foto';
    }
  }

  factory MedicalRequest.fromJson(Map<String, dynamic> json) {
    return MedicalRequest(
      id: json['id'].toString(),
      title: json['title'] ?? 'Solicitud médica',
      description: json['description'] ?? '',
      type: _parseDocumentType(json['documentType'] ?? json['type']),
      dueDate: json['dueDate'] != null
          ? DateTime.tryParse(json['dueDate'])
          : null,
      status: _parseStatus(json['status']),
      isUrgent: json['isUrgent'] ?? json['priority'] == 'urgent',
      data: json,
    );
  }

  static MedicalDocumentType _parseDocumentType(String? type) {
    switch (type?.toLowerCase()) {
      case 'certificate':
      case 'certificates':
        return MedicalDocumentType.certificate;
      case 'prescription':
      case 'prescriptions':
      case 'recipe':
      case 'recipes':
        return MedicalDocumentType.prescription;
      case 'study':
      case 'studies':
        return MedicalDocumentType.study;
      case 'photo':
      case 'photos':
        return MedicalDocumentType.photo;
      default:
        return MedicalDocumentType.certificate;
    }
  }

  static DocumentStatus _parseStatus(String? status) {
    switch (status?.toLowerCase()) {
      case 'approved':
        return DocumentStatus.approved;
      case 'rejected':
        return DocumentStatus.rejected;
      case 'expired':
        return DocumentStatus.expired;
      default:
        return DocumentStatus.pending;
    }
  }
}

/// 📦 Modelo de documento subido
class UploadedDocument {
  final String id;
  final String fileName;
  final MedicalDocumentType type;
  final DateTime uploadDate;
  final DocumentStatus status;
  final String? fileUrl;
  final String? notes;

  UploadedDocument({
    required this.id,
    required this.fileName,
    required this.type,
    required this.uploadDate,
    this.status = DocumentStatus.pending,
    this.fileUrl,
    this.notes,
  });

  factory UploadedDocument.fromJson(Map<String, dynamic> json) {
    return UploadedDocument(
      id: json['id'].toString(),
      fileName: json['fileName'] ?? json['file_name'] ?? 'documento',
      type: MedicalRequest._parseDocumentType(json['documentType']),
      uploadDate: DateTime.tryParse(json['uploadDate'] ?? json['createdAt'] ?? '') ??
          DateTime.now(),
      status: MedicalRequest._parseStatus(json['status']),
      fileUrl: json['fileUrl'] ?? json['url'],
      notes: json['notes'],
    );
  }
}

/// 🏥 EMPLOYEE MEDICAL DASHBOARD
class EmployeeMedicalDashboard extends StatefulWidget {
  const EmployeeMedicalDashboard({Key? key}) : super(key: key);

  @override
  State<EmployeeMedicalDashboard> createState() =>
      _EmployeeMedicalDashboardState();
}

class _EmployeeMedicalDashboardState extends State<EmployeeMedicalDashboard>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ImagePicker _imagePicker = ImagePicker();
  final EmployeeNotificationService _notificationService =
      EmployeeNotificationService();
  final EmployeeWebSocketService _wsService = EmployeeWebSocketService();

  // Estado
  bool _isLoading = true;
  String? _error;
  List<MedicalRequest> _pendingRequests = [];
  List<UploadedDocument> _uploadedDocuments = [];

  // Configuración
  String? _serverUrl;
  String? _authToken;
  String? _companyId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadConfiguration();
    _loadData();
    _setupWebSocketListeners();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  /// 📡 Cargar configuración
  Future<void> _loadConfiguration() async {
    final prefs = await SharedPreferences.getInstance();
    _authToken = prefs.getString('auth_token');
    _companyId = prefs.getString('config_company_id');

    final serverIp = prefs.getString('config_server_ip') ?? '';
    final serverPort = prefs.getString('config_server_port') ?? '';
    final useHttps = prefs.getBool('config_use_https') ?? false;

    if (serverIp.isNotEmpty) {
      final protocol = useHttps ? 'https' : 'http';
      _serverUrl = serverPort.isNotEmpty
          ? '$protocol://$serverIp:$serverPort'
          : '$protocol://$serverIp';
    }
  }

  /// 📋 Cargar datos
  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    try {
      await Future.wait([
        _loadPendingRequests(),
        _loadUploadedDocuments(),
      ]);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  /// 📋 Cargar solicitudes pendientes
  Future<void> _loadPendingRequests() async {
    if (_serverUrl == null) return;

    try {
      final response = await http.get(
        Uri.parse('$_serverUrl/api/medical/requests/pending'),
        headers: {
          'Authorization': 'Bearer $_authToken',
          'X-Company-Id': _companyId ?? '',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final requests = (data['requests'] ?? data ?? []) as List;
        setState(() {
          _pendingRequests =
              requests.map((r) => MedicalRequest.fromJson(r)).toList();
        });
      }
    } catch (e) {
      debugPrint('⚠️ [MEDICAL] Error cargando solicitudes: $e');
    }
  }

  /// 📄 Cargar documentos subidos
  Future<void> _loadUploadedDocuments() async {
    if (_serverUrl == null) return;

    try {
      final response = await http.get(
        Uri.parse('$_serverUrl/api/medical/documents/my'),
        headers: {
          'Authorization': 'Bearer $_authToken',
          'X-Company-Id': _companyId ?? '',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final documents = (data['documents'] ?? data ?? []) as List;
        setState(() {
          _uploadedDocuments =
              documents.map((d) => UploadedDocument.fromJson(d)).toList();
        });
      }
    } catch (e) {
      debugPrint('⚠️ [MEDICAL] Error cargando documentos: $e');
    }
  }

  /// 🔌 Configurar WebSocket
  void _setupWebSocketListeners() {
    _wsService.medicalAlerts.listen((data) {
      debugPrint('🏥 [MEDICAL] Alerta recibida: $data');

      final type = data['type'];
      if (type == 'document_required') {
        _notificationService.showMedicalRequestNotification(
          title: 'Documento Requerido',
          body: data['message'] ?? 'Se requiere un nuevo documento médico',
          documentType: data['documentType'] ?? 'certificate',
        );
        _loadPendingRequests();
      } else if (type == 'medical_response') {
        _loadUploadedDocuments();
      }
    });
  }

  /// 📸 Subir documento
  Future<void> _uploadDocument(MedicalRequest request) async {
    final source = await showDialog<ImageSource>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Seleccionar origen'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Tomar foto'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Galería'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source == null) return;

    try {
      final pickedFile = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );

      if (pickedFile == null) return;

      await _sendDocument(File(pickedFile.path), request);
    } catch (e) {
      _showErrorSnackBar('Error seleccionando imagen: $e');
    }
  }

  /// 📤 Enviar documento al servidor
  Future<void> _sendDocument(File file, MedicalRequest request) async {
    if (_serverUrl == null) {
      _showErrorSnackBar('Servidor no configurado');
      return;
    }

    _showLoadingDialog('Subiendo documento...');

    try {
      final uri = Uri.parse('$_serverUrl/api/medical/documents/upload');
      final multipartRequest = http.MultipartRequest('POST', uri);

      multipartRequest.headers['Authorization'] = 'Bearer $_authToken';
      multipartRequest.headers['X-Company-Id'] = _companyId ?? '';

      multipartRequest.fields['requestId'] = request.id;
      multipartRequest.fields['documentType'] = request.type.name;

      final bytes = await file.readAsBytes();
      multipartRequest.files.add(http.MultipartFile.fromBytes(
        'document',
        bytes,
        filename: 'medical_document.jpg',
        contentType: http_parser.MediaType('image', 'jpeg'),
      ));

      final streamedResponse = await multipartRequest.send();
      final response = await http.Response.fromStream(streamedResponse);

      Navigator.pop(context); // Cerrar loading

      if (response.statusCode == 200 || response.statusCode == 201) {
        _showSuccessSnackBar('Documento subido exitosamente');
        _notificationService.showDocumentUploadConfirmation(
          documentType: request.typeName,
        );

        // WebSocket notify
        _wsService.sendMedicalRequest({
          'action': 'document_uploaded',
          'requestId': request.id,
          'documentType': request.type.name,
        });

        _loadData(); // Recargar datos
      } else {
        _showErrorSnackBar('Error subiendo documento');
      }
    } catch (e) {
      Navigator.pop(context); // Cerrar loading
      _showErrorSnackBar('Error: $e');
    }
  }

  void _showLoadingDialog(String message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Row(
          children: [
            const CircularProgressIndicator(),
            const SizedBox(width: 16),
            Text(message),
          ],
        ),
      ),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard Médico'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              icon: Badge(
                isLabelVisible: _pendingRequests.isNotEmpty,
                label: Text('${_pendingRequests.length}'),
                child: const Icon(Icons.pending_actions),
              ),
              text: 'Pendientes',
            ),
            const Tab(
              icon: Icon(Icons.folder),
              text: 'Mis Documentos',
            ),
            const Tab(
              icon: Icon(Icons.add_circle),
              text: 'Nueva Solicitud',
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorState()
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildPendingTab(),
                    _buildDocumentsTab(),
                    _buildNewRequestTab(),
                  ],
                ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text('Error: $_error'),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadData,
            child: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }

  /// 📋 TAB: Solicitudes pendientes
  Widget _buildPendingTab() {
    if (_pendingRequests.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle, size: 64, color: Colors.green.shade300),
            const SizedBox(height: 16),
            const Text(
              'No tienes solicitudes pendientes',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _pendingRequests.length,
        itemBuilder: (context, index) {
          final request = _pendingRequests[index];
          return _buildRequestCard(request);
        },
      ),
    );
  }

  Widget _buildRequestCard(MedicalRequest request) {
    final isOverdue = request.isOverdue;
    final daysUntilDue = request.daysUntilDue;

    Color cardColor = Colors.white;
    Color borderColor = Colors.grey.shade300;

    if (isOverdue) {
      cardColor = Colors.red.shade50;
      borderColor = Colors.red;
    } else if (request.isUrgent || daysUntilDue <= 2) {
      cardColor = Colors.orange.shade50;
      borderColor = Colors.orange;
    }

    return Card(
      color: cardColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: borderColor, width: 2),
      ),
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  request.typeIcon,
                  style: const TextStyle(fontSize: 32),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        request.title,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        request.typeName,
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
                if (request.isUrgent || isOverdue)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isOverdue ? Colors.red : Colors.orange,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      isOverdue ? 'VENCIDO' : 'URGENTE',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(request.description),
            if (request.dueDate != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.calendar_today, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    'Vence: ${DateFormat('dd/MM/yyyy').format(request.dueDate!)}',
                    style: TextStyle(
                      color: isOverdue ? Colors.red : Colors.grey.shade700,
                      fontWeight:
                          isOverdue ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                  if (!isOverdue && daysUntilDue >= 0)
                    Text(
                      ' ($daysUntilDue días)',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                ],
              ),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _uploadDocument(request),
                icon: const Icon(Icons.upload_file),
                label: const Text('Subir Documento'),
                style: ElevatedButton.styleFrom(
                  backgroundColor:
                      isOverdue ? Colors.red : Theme.of(context).primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 📄 TAB: Mis documentos
  Widget _buildDocumentsTab() {
    if (_uploadedDocuments.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.folder_open, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            const Text(
              'No has subido ningún documento',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _uploadedDocuments.length,
        itemBuilder: (context, index) {
          final doc = _uploadedDocuments[index];
          return _buildDocumentCard(doc);
        },
      ),
    );
  }

  Widget _buildDocumentCard(UploadedDocument doc) {
    Color statusColor;
    String statusText;
    IconData statusIcon;

    switch (doc.status) {
      case DocumentStatus.approved:
        statusColor = Colors.green;
        statusText = 'Aprobado';
        statusIcon = Icons.check_circle;
        break;
      case DocumentStatus.rejected:
        statusColor = Colors.red;
        statusText = 'Rechazado';
        statusIcon = Icons.cancel;
        break;
      case DocumentStatus.expired:
        statusColor = Colors.grey;
        statusText = 'Expirado';
        statusIcon = Icons.schedule;
        break;
      default:
        statusColor = Colors.orange;
        statusText = 'Pendiente';
        statusIcon = Icons.hourglass_empty;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: statusColor.withOpacity(0.2),
          child: Icon(statusIcon, color: statusColor),
        ),
        title: Text(doc.fileName),
        subtitle: Text(
          '${MedicalRequest._parseDocumentType(doc.type.name).name} - ${DateFormat('dd/MM/yyyy').format(doc.uploadDate)}',
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: statusColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: statusColor),
          ),
          child: Text(
            statusText,
            style: TextStyle(
              color: statusColor,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }

  /// ➕ TAB: Nueva solicitud
  Widget _buildNewRequestTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Solicitar Ausencia Médica',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          _buildQuickActionCard(
            icon: Icons.sick,
            title: 'Notificar Enfermedad',
            description: 'Reporta que estás enfermo y no puedes trabajar',
            color: Colors.red,
            onTap: () => _showNewAbsenceForm(),
          ),
          _buildQuickActionCard(
            icon: Icons.local_hospital,
            title: 'Subir Certificado Médico',
            description: 'Adjunta un certificado de tu médico',
            color: Colors.blue,
            onTap: () => _uploadGenericDocument(MedicalDocumentType.certificate),
          ),
          _buildQuickActionCard(
            icon: Icons.medication,
            title: 'Subir Receta',
            description: 'Adjunta una receta médica',
            color: Colors.purple,
            onTap: () => _uploadGenericDocument(MedicalDocumentType.prescription),
          ),
          _buildQuickActionCard(
            icon: Icons.science,
            title: 'Subir Estudio',
            description: 'Adjunta resultados de estudios médicos',
            color: Colors.teal,
            onTap: () => _uploadGenericDocument(MedicalDocumentType.study),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionCard({
    required IconData icon,
    required String title,
    required String description,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 32),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }

  void _showNewAbsenceForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _NewAbsenceForm(
        onSubmit: _submitNewAbsence,
      ),
    );
  }

  Future<void> _submitNewAbsence(Map<String, dynamic> data) async {
    // TODO: Implementar envío de nueva ausencia
    debugPrint('📋 Nueva ausencia: $data');
    Navigator.pop(context);
    _showSuccessSnackBar('Solicitud enviada');
  }

  Future<void> _uploadGenericDocument(MedicalDocumentType type) async {
    final request = MedicalRequest(
      id: 'manual_${DateTime.now().millisecondsSinceEpoch}',
      title: 'Documento ${type.name}',
      description: 'Subido manualmente',
      type: type,
    );

    await _uploadDocument(request);
  }
}

/// 📝 FORMULARIO DE NUEVA AUSENCIA
class _NewAbsenceForm extends StatefulWidget {
  final Function(Map<String, dynamic>) onSubmit;

  const _NewAbsenceForm({required this.onSubmit});

  @override
  State<_NewAbsenceForm> createState() => _NewAbsenceFormState();
}

class _NewAbsenceFormState extends State<_NewAbsenceForm> {
  final _formKey = GlobalKey<FormState>();
  final _symptomsController = TextEditingController();
  DateTime _startDate = DateTime.now();
  int _requestedDays = 1;
  bool _hasVisitedDoctor = false;

  @override
  void dispose() {
    _symptomsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Center(
                child: Text(
                  'Notificar Ausencia',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _symptomsController,
                decoration: const InputDecoration(
                  labelText: 'Describe tus síntomas',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
                validator: (value) =>
                    value?.isEmpty ?? true ? 'Campo requerido' : null,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ListTile(
                      title: const Text('Fecha inicio'),
                      subtitle: Text(DateFormat('dd/MM/yyyy').format(_startDate)),
                      trailing: const Icon(Icons.calendar_today),
                      onTap: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: _startDate,
                          firstDate:
                              DateTime.now().subtract(const Duration(days: 7)),
                          lastDate: DateTime.now().add(const Duration(days: 30)),
                        );
                        if (date != null) {
                          setState(() => _startDate = date);
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ListTile(
                      title: const Text('Días solicitados'),
                      subtitle: Text('$_requestedDays'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.remove),
                            onPressed: _requestedDays > 1
                                ? () => setState(() => _requestedDays--)
                                : null,
                          ),
                          IconButton(
                            icon: const Icon(Icons.add),
                            onPressed: _requestedDays < 30
                                ? () => setState(() => _requestedDays++)
                                : null,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              SwitchListTile(
                title: const Text('¿Visitaste un médico?'),
                value: _hasVisitedDoctor,
                onChanged: (value) =>
                    setState(() => _hasVisitedDoctor = value),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (_formKey.currentState!.validate()) {
                      widget.onSubmit({
                        'symptoms': _symptomsController.text,
                        'startDate': _startDate.toIso8601String(),
                        'requestedDays': _requestedDays,
                        'hasVisitedDoctor': _hasVisitedDoctor,
                      });
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text('Enviar Solicitud'),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
