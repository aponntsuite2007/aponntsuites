/*
 * 📝 EMPLOYEE PERMISSIONS SCREEN
 * ================================
 * Pantalla de permisos y solicitudes del empleado
 *
 * Características:
 * - Solicitar permisos (licencia, ausencia, etc.)
 * - Ver historial de solicitudes
 * - Adjuntar documentos justificativos
 * - Cancelar solicitudes pendientes
 *
 * Fecha: 2025-11-30
 * Versión: 1.0.0
 */

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../services/employee_api_service.dart';

/// 📦 Modelo de solicitud de permiso
class PermissionRequest {
  final String id;
  final String type;
  final DateTime startDate;
  final DateTime endDate;
  final String reason;
  final String status;
  final String? attachmentUrl;
  final String? approverName;
  final String? rejectionReason;
  final DateTime createdAt;

  PermissionRequest({
    required this.id,
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.reason,
    required this.status,
    this.attachmentUrl,
    this.approverName,
    this.rejectionReason,
    required this.createdAt,
  });

  factory PermissionRequest.fromJson(Map<String, dynamic> json) {
    return PermissionRequest(
      id: json['id']?.toString() ?? '',
      type: json['type'] ?? json['permission_type'] ?? json['tipo'] ?? 'other',
      startDate: DateTime.parse(json['start_date'].toString()),
      endDate: DateTime.parse(json['end_date'].toString()),
      reason: json['reason'] ?? json['motivo'] ?? '',
      status: json['status'] ?? 'pending',
      attachmentUrl: json['attachment_url'],
      approverName: json['approver']?['name'] ?? json['approver_name'],
      rejectionReason: json['rejection_reason'] ?? json['motivo_rechazo'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'].toString())
          : DateTime.now(),
    );
  }

  bool get isPending => status == 'pending' || status == 'pendiente';
  bool get isApproved => status == 'approved' || status == 'aprobado';
  bool get isRejected => status == 'rejected' || status == 'rechazado';

  Color get statusColor {
    if (isPending) return Colors.amber;
    if (isApproved) return Colors.green;
    if (isRejected) return Colors.red;
    return Colors.grey;
  }

  String get statusText {
    if (isPending) return 'Pendiente';
    if (isApproved) return 'Aprobado';
    if (isRejected) return 'Rechazado';
    return status;
  }

  String get typeLabel {
    switch (type.toLowerCase()) {
      case 'sick':
      case 'enfermedad':
        return 'Licencia por enfermedad';
      case 'personal':
        return 'Asuntos personales';
      case 'medical':
      case 'medico':
        return 'Turno médico';
      case 'study':
      case 'estudio':
        return 'Licencia por estudio';
      case 'family':
      case 'familiar':
        return 'Asuntos familiares';
      case 'bereavement':
      case 'fallecimiento':
        return 'Fallecimiento familiar';
      case 'marriage':
      case 'matrimonio':
        return 'Matrimonio';
      case 'paternity':
      case 'paternidad':
        return 'Licencia por paternidad';
      case 'maternity':
      case 'maternidad':
        return 'Licencia por maternidad';
      default:
        return type;
    }
  }

  IconData get typeIcon {
    switch (type.toLowerCase()) {
      case 'sick':
      case 'enfermedad':
        return Icons.sick;
      case 'medical':
      case 'medico':
        return Icons.local_hospital;
      case 'study':
      case 'estudio':
        return Icons.school;
      case 'family':
      case 'familiar':
        return Icons.family_restroom;
      case 'bereavement':
      case 'fallecimiento':
        return Icons.sentiment_very_dissatisfied;
      case 'marriage':
      case 'matrimonio':
        return Icons.favorite;
      case 'paternity':
      case 'paternidad':
      case 'maternity':
      case 'maternidad':
        return Icons.child_care;
      default:
        return Icons.event_busy;
    }
  }

  int get days => endDate.difference(startDate).inDays + 1;
}

/// 📝 EMPLOYEE PERMISSIONS SCREEN
class EmployeePermissionsScreen extends StatefulWidget {
  const EmployeePermissionsScreen({Key? key}) : super(key: key);

  @override
  State<EmployeePermissionsScreen> createState() => _EmployeePermissionsScreenState();
}

class _EmployeePermissionsScreenState extends State<EmployeePermissionsScreen>
    with SingleTickerProviderStateMixin {
  final EmployeeApiService _api = EmployeeApiService();

  late TabController _tabController;

  List<PermissionRequest> _requests = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadRequests();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadRequests() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _api.getMyPermissions();

      if (response.isSuccess && response.data != null) {
        final List<dynamic> list = response.data is List ? response.data : [];
        setState(() {
          _requests = list.map((r) => PermissionRequest.fromJson(r)).toList();
          _requests.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = response.error ?? 'Error al cargar solicitudes';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1B2A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1B263B),
        elevation: 0,
        title: const Text('Permisos y Solicitudes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadRequests,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.cyan,
          tabs: const [
            Tab(icon: Icon(Icons.add_circle_outline), text: 'Nueva'),
            Tab(icon: Icon(Icons.history), text: 'Historial'),
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
                    _buildNewRequestTab(),
                    _buildHistoryTab(),
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
            onPressed: _loadRequests,
            icon: const Icon(Icons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }

  // ===========================================
  // 📝 TAB 1: NUEVA SOLICITUD
  // ===========================================
  Widget _buildNewRequestTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Instrucciones
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.cyan.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.cyan.withOpacity(0.3)),
          ),
          child: Row(
            children: [
              const Icon(Icons.info_outline, color: Colors.cyan),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Seleccione el tipo de permiso que desea solicitar',
                  style: TextStyle(color: Colors.white70),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Tipos de permisos
        _buildPermissionTypeCard('sick', 'Licencia por enfermedad',
            'Requiere certificado médico', Icons.sick, Colors.red),
        _buildPermissionTypeCard('medical', 'Turno médico',
            'Consulta médica programada', Icons.local_hospital, Colors.blue),
        _buildPermissionTypeCard('personal', 'Asuntos personales',
            'Trámites o asuntos personales', Icons.person, Colors.purple),
        _buildPermissionTypeCard('study', 'Licencia por estudio',
            'Exámenes o cursado', Icons.school, Colors.orange),
        _buildPermissionTypeCard('family', 'Asuntos familiares',
            'Emergencias familiares', Icons.family_restroom, Colors.green),
        _buildPermissionTypeCard('bereavement', 'Fallecimiento',
            'Licencia por duelo', Icons.sentiment_very_dissatisfied, Colors.grey),
        _buildPermissionTypeCard('marriage', 'Matrimonio',
            'Licencia por matrimonio', Icons.favorite, Colors.pink),
      ],
    );
  }

  Widget _buildPermissionTypeCard(
    String type,
    String title,
    String subtitle,
    IconData icon,
    Color color,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B),
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        onTap: () => _showRequestForm(type, title),
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color),
        ),
        title: Text(
          title,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(color: Colors.white54, fontSize: 12),
        ),
        trailing: const Icon(Icons.arrow_forward_ios, color: Colors.white54, size: 16),
      ),
    );
  }

  void _showRequestForm(String type, String title) {
    DateTime? startDate;
    DateTime? endDate;
    final reasonController = TextEditingController();
    File? attachment;

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1B263B),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Text(
                  'Solicitar $title',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 24),

                // Fecha inicio
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text(
                    'Fecha de inicio',
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                  subtitle: Text(
                    startDate != null
                        ? _formatDate(startDate!)
                        : 'Seleccionar fecha',
                    style: TextStyle(
                      color: startDate != null ? Colors.white : Colors.cyan,
                      fontSize: 16,
                    ),
                  ),
                  trailing: const Icon(Icons.calendar_today, color: Colors.cyan),
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now(),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (date != null) {
                      setSheetState(() => startDate = date);
                    }
                  },
                ),
                const Divider(color: Colors.white24),

                // Fecha fin
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text(
                    'Fecha de fin',
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                  subtitle: Text(
                    endDate != null
                        ? _formatDate(endDate!)
                        : 'Seleccionar fecha',
                    style: TextStyle(
                      color: endDate != null ? Colors.white : Colors.cyan,
                      fontSize: 16,
                    ),
                  ),
                  trailing: const Icon(Icons.calendar_today, color: Colors.cyan),
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: startDate ?? DateTime.now(),
                      firstDate: startDate ?? DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (date != null) {
                      setSheetState(() => endDate = date);
                    }
                  },
                ),
                const Divider(color: Colors.white24),
                const SizedBox(height: 16),

                // Motivo
                TextField(
                  controller: reasonController,
                  style: const TextStyle(color: Colors.white),
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Motivo',
                    labelStyle: const TextStyle(color: Colors.white54),
                    hintText: 'Explique el motivo de su solicitud...',
                    hintStyle: const TextStyle(color: Colors.white38),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.05),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Adjunto
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: attachment != null
                          ? Colors.green.withOpacity(0.1)
                          : Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      attachment != null ? Icons.check_circle : Icons.attach_file,
                      color: attachment != null ? Colors.green : Colors.white54,
                    ),
                  ),
                  title: Text(
                    attachment != null
                        ? 'Documento adjunto'
                        : 'Adjuntar documento (opcional)',
                    style: const TextStyle(color: Colors.white),
                  ),
                  subtitle: Text(
                    attachment != null
                        ? attachment!.path.split('/').last
                        : 'Certificado médico, justificativo, etc.',
                    style: const TextStyle(color: Colors.white54, fontSize: 12),
                  ),
                  onTap: () async {
                    final result = await FilePicker.platform.pickFiles(
                      type: FileType.custom,
                      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
                    );
                    if (result != null && result.files.single.path != null) {
                      setSheetState(() {
                        attachment = File(result.files.single.path!);
                      });
                    }
                  },
                ),
                const SizedBox(height: 24),

                // Resumen
                if (startDate != null && endDate != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.cyan.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.event, color: Colors.cyan, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          '${endDate!.difference(startDate!).inDays + 1} día(s) solicitado(s)',
                          style: const TextStyle(
                            color: Colors.cyan,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 24),

                // Botón enviar
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: startDate != null &&
                            endDate != null &&
                            reasonController.text.isNotEmpty
                        ? () => _submitRequest(
                              type: type,
                              startDate: startDate!,
                              endDate: endDate!,
                              reason: reasonController.text,
                              attachment: attachment,
                            )
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.cyan,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    icon: const Icon(Icons.send),
                    label: const Text('Enviar Solicitud'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ===========================================
  // 📜 TAB 2: HISTORIAL
  // ===========================================
  Widget _buildHistoryTab() {
    if (_requests.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history, size: 64, color: Colors.grey.shade600),
            const SizedBox(height: 16),
            const Text(
              'No hay solicitudes',
              style: TextStyle(color: Colors.white70, fontSize: 16),
            ),
          ],
        ),
      );
    }

    final pending = _requests.where((r) => r.isPending).toList();
    final processed = _requests.where((r) => !r.isPending).toList();

    return RefreshIndicator(
      onRefresh: _loadRequests,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (pending.isNotEmpty) ...[
            _buildSection('Pendientes', Colors.amber, pending),
            const SizedBox(height: 16),
          ],
          if (processed.isNotEmpty)
            _buildSection('Procesadas', Colors.grey, processed),
        ],
      ),
    );
  }

  Widget _buildSection(String title, Color color, List<PermissionRequest> requests) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                  ),
                ),
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
                  '${requests.length}',
                  style: const TextStyle(color: Colors.white54),
                ),
              ],
            ),
          ),
          const Divider(color: Colors.white12, height: 1),
          ...requests.map((r) => _buildRequestItem(r)),
        ],
      ),
    );
  }

  Widget _buildRequestItem(PermissionRequest request) {
    return InkWell(
      onTap: () => _showRequestDetail(request),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // Icono tipo
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: request.statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                request.typeIcon,
                color: request.statusColor,
              ),
            ),
            const SizedBox(width: 12),

            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    request.typeLabel,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    '${_formatDate(request.startDate)} - ${_formatDate(request.endDate)}',
                    style: const TextStyle(color: Colors.white54, fontSize: 12),
                  ),
                ],
              ),
            ),

            // Estado
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: request.statusColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    request.statusText,
                    style: TextStyle(
                      color: request.statusColor,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${request.days} día(s)',
                  style: const TextStyle(color: Colors.white38, fontSize: 11),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showRequestDetail(PermissionRequest request) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1B263B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: request.statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    request.typeIcon,
                    color: request.statusColor,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        request.typeLabel,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Container(
                        margin: const EdgeInsets.only(top: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: request.statusColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          request.statusText,
                          style: TextStyle(
                            color: request.statusColor,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Detalles
            _buildDetailRow('Desde', _formatDate(request.startDate)),
            _buildDetailRow('Hasta', _formatDate(request.endDate)),
            _buildDetailRow('Días', '${request.days} día(s)'),
            _buildDetailRow('Solicitado', _formatDate(request.createdAt)),
            if (request.reason.isNotEmpty) _buildDetailRow('Motivo', request.reason),
            if (request.approverName != null)
              _buildDetailRow('Procesado por', request.approverName!),
            if (request.rejectionReason != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info, color: Colors.red, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        request.rejectionReason!,
                        style: const TextStyle(color: Colors.red, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Acciones
            if (request.isPending)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _cancelRequest(request),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  icon: const Icon(Icons.cancel),
                  label: const Text('Cancelar Solicitud'),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(color: Colors.white54, fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(color: Colors.white, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submitRequest({
    required String type,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
    File? attachment,
  }) async {
    Navigator.pop(context);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(color: Colors.cyan),
      ),
    );

    final response = await _api.requestPermission(
      permissionType: type,
      startDate: startDate,
      endDate: endDate,
      reason: reason,
      attachment: attachment,
    );

    Navigator.pop(context);

    if (response.isSuccess) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Solicitud enviada correctamente'),
          backgroundColor: Colors.green,
        ),
      );
      _loadRequests();
      _tabController.animateTo(1);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${response.error}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _cancelRequest(PermissionRequest request) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancelar Solicitud'),
        content: const Text('¿Está seguro de cancelar esta solicitud?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('No'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Sí, Cancelar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      Navigator.pop(context);

      final response = await _api.cancelPermissionRequest(request.id);

      if (response.isSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Solicitud cancelada'),
            backgroundColor: Colors.green,
          ),
        );
        _loadRequests();
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

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}
