/*
 * 📄 EMPLOYEE DOCUMENTS SCREEN
 * =============================
 * Pantalla de documentos vencibles del empleado
 *
 * Características:
 * - Lista de documentos con vencimientos
 * - Alertas visuales por estado (vencido/próximo/vigente)
 * - Subir documentos nuevos
 * - Filtros por tipo y estado
 * - Notificaciones push de vencimientos
 *
 * Fecha: 2025-11-30
 * Versión: 1.0.0
 */

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../services/employee_api_service.dart';

/// 📦 Modelo de documento
class EmployeeDocument {
  final String id;
  final String type;
  final String name;
  final String? description;
  final DateTime? expirationDate;
  final DateTime? uploadDate;
  final String? fileUrl;
  final String status; // active, expired, expiring_soon

  EmployeeDocument({
    required this.id,
    required this.type,
    required this.name,
    this.description,
    this.expirationDate,
    this.uploadDate,
    this.fileUrl,
    required this.status,
  });

  factory EmployeeDocument.fromJson(Map<String, dynamic> json) {
    return EmployeeDocument(
      id: json['id']?.toString() ?? '',
      type: json['type'] ?? 'other',
      name: json['name'] ?? json['type'] ?? 'Documento',
      description: json['description'],
      expirationDate: json['expiration_date'] != null
          ? DateTime.tryParse(json['expiration_date'].toString())
          : null,
      uploadDate: json['upload_date'] != null || json['created_at'] != null
          ? DateTime.tryParse((json['upload_date'] ?? json['created_at']).toString())
          : null,
      fileUrl: json['file_url'] ?? json['url'],
      status: json['status'] ?? 'active',
    );
  }

  int? get daysToExpire {
    if (expirationDate == null) return null;
    return expirationDate!.difference(DateTime.now()).inDays;
  }

  bool get isExpired => daysToExpire != null && daysToExpire! < 0;
  bool get isExpiringSoon => daysToExpire != null && daysToExpire! >= 0 && daysToExpire! <= 30;
  bool get isValid => !isExpired && !isExpiringSoon;

  Color get statusColor {
    if (isExpired) return Colors.red;
    if (isExpiringSoon) return Colors.amber;
    return Colors.green;
  }

  IconData get typeIcon {
    switch (type.toLowerCase()) {
      case 'dni':
      case 'identity':
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
      case 'insurance':
      case 'seguro':
        return Icons.security;
      case 'visa':
      case 'passport':
        return Icons.flight;
      default:
        return Icons.insert_drive_file;
    }
  }
}

/// 📄 EMPLOYEE DOCUMENTS SCREEN
class EmployeeDocumentsScreen extends StatefulWidget {
  const EmployeeDocumentsScreen({Key? key}) : super(key: key);

  @override
  State<EmployeeDocumentsScreen> createState() => _EmployeeDocumentsScreenState();
}

class _EmployeeDocumentsScreenState extends State<EmployeeDocumentsScreen> {
  final EmployeeApiService _api = EmployeeApiService();
  final ImagePicker _imagePicker = ImagePicker();

  List<EmployeeDocument> _documents = [];
  List<EmployeeDocument> _filteredDocuments = [];

  bool _isLoading = true;
  String? _error;

  // Filtros
  String _filterStatus = 'all'; // all, expired, expiring, valid
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadDocuments();
  }

  Future<void> _loadDocuments() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _api.getMyDocuments();

      if (response.isSuccess && response.data != null) {
        final List<dynamic> docsList = response.data is List ? response.data : [];
        setState(() {
          _documents = docsList.map((d) => EmployeeDocument.fromJson(d)).toList();
          _applyFilters();
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = response.error ?? 'Error al cargar documentos';
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

  void _applyFilters() {
    _filteredDocuments = _documents.where((doc) {
      // Filtro por estado
      if (_filterStatus == 'expired' && !doc.isExpired) return false;
      if (_filterStatus == 'expiring' && !doc.isExpiringSoon) return false;
      if (_filterStatus == 'valid' && !doc.isValid) return false;

      // Filtro por búsqueda
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        return doc.name.toLowerCase().contains(query) ||
            doc.type.toLowerCase().contains(query);
      }

      return true;
    }).toList();

    // Ordenar: vencidos primero, luego por vencer, luego válidos
    _filteredDocuments.sort((a, b) {
      if (a.isExpired && !b.isExpired) return -1;
      if (!a.isExpired && b.isExpired) return 1;
      if (a.isExpiringSoon && !b.isExpiringSoon) return -1;
      if (!a.isExpiringSoon && b.isExpiringSoon) return 1;

      // Ambos en mismo estado, ordenar por fecha de vencimiento
      if (a.expirationDate != null && b.expirationDate != null) {
        return a.expirationDate!.compareTo(b.expirationDate!);
      }
      return 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final expiredCount = _documents.where((d) => d.isExpired).length;
    final expiringCount = _documents.where((d) => d.isExpiringSoon).length;

    return Scaffold(
      backgroundColor: const Color(0xFF0D1B2A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1B263B),
        elevation: 0,
        title: const Text('Mis Documentos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDocuments,
          ),
        ],
      ),
      body: Column(
        children: [
          // Alertas de vencimiento
          if (expiredCount > 0 || expiringCount > 0)
            _buildAlertBanner(expiredCount, expiringCount),

          // Barra de búsqueda y filtros
          _buildSearchAndFilters(),

          // Lista de documentos
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Colors.cyan))
                : _error != null
                    ? _buildError()
                    : _buildDocumentsList(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showUploadOptions,
        backgroundColor: Colors.cyan,
        icon: const Icon(Icons.add),
        label: const Text('Subir Documento'),
      ),
    );
  }

  Widget _buildAlertBanner(int expired, int expiring) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: expired > 0
              ? [Colors.red.shade700, Colors.red.shade900]
              : [Colors.amber.shade700, Colors.amber.shade900],
        ),
      ),
      child: Row(
        children: [
          Icon(
            expired > 0 ? Icons.error : Icons.warning,
            color: Colors.white,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (expired > 0)
                  Text(
                    '$expired documento(s) vencido(s)',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                if (expiring > 0)
                  Text(
                    '$expiring próximo(s) a vencer',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.9),
                      fontSize: 13,
                    ),
                  ),
              ],
            ),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _filterStatus = expired > 0 ? 'expired' : 'expiring';
                _applyFilters();
              });
            },
            child: const Text(
              'Ver',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchAndFilters() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Búsqueda
          TextField(
            onChanged: (value) {
              setState(() {
                _searchQuery = value;
                _applyFilters();
              });
            },
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Buscar documento...',
              hintStyle: const TextStyle(color: Colors.white54),
              prefixIcon: const Icon(Icons.search, color: Colors.white54),
              filled: true,
              fillColor: const Color(0xFF1B263B),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Filtros
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip('Todos', 'all', null),
                const SizedBox(width: 8),
                _buildFilterChip('Vencidos', 'expired', Colors.red),
                const SizedBox(width: 8),
                _buildFilterChip('Por vencer', 'expiring', Colors.amber),
                const SizedBox(width: 8),
                _buildFilterChip('Vigentes', 'valid', Colors.green),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value, Color? color) {
    final isSelected = _filterStatus == value;
    final count = value == 'all'
        ? _documents.length
        : value == 'expired'
            ? _documents.where((d) => d.isExpired).length
            : value == 'expiring'
                ? _documents.where((d) => d.isExpiringSoon).length
                : _documents.where((d) => d.isValid).length;

    return FilterChip(
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (color != null) ...[
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
          ],
          Text('$label ($count)'),
        ],
      ),
      selected: isSelected,
      selectedColor: Colors.cyan.withOpacity(0.3),
      backgroundColor: const Color(0xFF1B263B),
      labelStyle: TextStyle(
        color: isSelected ? Colors.cyan : Colors.white70,
      ),
      onSelected: (_) {
        setState(() {
          _filterStatus = value;
          _applyFilters();
        });
      },
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
            onPressed: _loadDocuments,
            icon: const Icon(Icons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentsList() {
    if (_filteredDocuments.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.folder_open, size: 64, color: Colors.grey.shade600),
            const SizedBox(height: 16),
            const Text(
              'No hay documentos',
              style: TextStyle(color: Colors.white70, fontSize: 16),
            ),
            const SizedBox(height: 8),
            const Text(
              'Los documentos subidos aparecerán aquí',
              style: TextStyle(color: Colors.white54, fontSize: 14),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadDocuments,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _filteredDocuments.length,
        itemBuilder: (context, index) {
          return _buildDocumentCard(_filteredDocuments[index]);
        },
      ),
    );
  }

  Widget _buildDocumentCard(EmployeeDocument doc) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: doc.statusColor.withOpacity(0.3),
          width: doc.isExpired || doc.isExpiringSoon ? 2 : 1,
        ),
      ),
      child: InkWell(
        onTap: () => _showDocumentDetail(doc),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Icono del tipo
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: doc.statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  doc.typeIcon,
                  color: doc.statusColor,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),

              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      doc.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      doc.type.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white54,
                        fontSize: 11,
                        letterSpacing: 1,
                      ),
                    ),
                    if (doc.expirationDate != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(
                            Icons.event,
                            size: 14,
                            color: doc.statusColor,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Vence: ${_formatDate(doc.expirationDate!)}',
                            style: TextStyle(
                              color: doc.statusColor,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),

              // Estado y días
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: doc.statusColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      doc.isExpired
                          ? 'VENCIDO'
                          : doc.isExpiringSoon
                              ? 'POR VENCER'
                              : 'VIGENTE',
                      style: TextStyle(
                        color: doc.statusColor,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  if (doc.daysToExpire != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      doc.isExpired
                          ? 'Hace ${-doc.daysToExpire!}d'
                          : doc.daysToExpire == 0
                              ? 'Hoy'
                              : 'En ${doc.daysToExpire}d',
                      style: TextStyle(
                        color: doc.statusColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDocumentDetail(EmployeeDocument doc) {
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
                    color: doc.statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(doc.typeIcon, color: doc.statusColor, size: 28),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        doc.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        doc.type.toUpperCase(),
                        style: const TextStyle(
                          color: Colors.white54,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Detalles
            _buildDetailRow('Estado', doc.isExpired ? 'Vencido' : doc.isExpiringSoon ? 'Por vencer' : 'Vigente', doc.statusColor),
            if (doc.expirationDate != null)
              _buildDetailRow('Vencimiento', _formatDate(doc.expirationDate!), Colors.white70),
            if (doc.uploadDate != null)
              _buildDetailRow('Subido', _formatDate(doc.uploadDate!), Colors.white70),
            if (doc.description != null)
              _buildDetailRow('Descripción', doc.description!, Colors.white70),

            const SizedBox(height: 24),

            // Acciones
            Row(
              children: [
                if (doc.fileUrl != null)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _viewDocument(doc),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.cyan,
                        side: const BorderSide(color: Colors.cyan),
                      ),
                      icon: const Icon(Icons.visibility),
                      label: const Text('Ver'),
                    ),
                  ),
                if (doc.fileUrl != null) const SizedBox(width: 12),
                if (doc.isExpired || doc.isExpiringSoon)
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _uploadRenewal(doc);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: doc.statusColor,
                      ),
                      icon: const Icon(Icons.refresh),
                      label: const Text('Renovar'),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, Color valueColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
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
              style: TextStyle(color: valueColor, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  void _showUploadOptions() {
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
          children: [
            const Text(
              'Subir Documento',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildUploadOption(
                  Icons.camera_alt,
                  'Cámara',
                  Colors.blue,
                  () => _pickFromCamera(),
                ),
                _buildUploadOption(
                  Icons.photo_library,
                  'Galería',
                  Colors.green,
                  () => _pickFromGallery(),
                ),
                _buildUploadOption(
                  Icons.insert_drive_file,
                  'Archivo',
                  Colors.orange,
                  () => _pickFile(),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUploadOption(IconData icon, String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: () {
        Navigator.pop(context);
        onTap();
      },
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(color: Colors.white70)),
        ],
      ),
    );
  }

  Future<void> _pickFromCamera() async {
    final XFile? image = await _imagePicker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
    );
    if (image != null) {
      _processUpload(File(image.path), 'image');
    }
  }

  Future<void> _pickFromGallery() async {
    final XFile? image = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (image != null) {
      _processUpload(File(image.path), 'image');
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
    );
    if (result != null && result.files.single.path != null) {
      _processUpload(File(result.files.single.path!), 'file');
    }
  }

  Future<void> _processUpload(File file, String source) async {
    // Mostrar diálogo para metadata
    final typeController = TextEditingController();
    final nameController = TextEditingController();
    DateTime? expirationDate;

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Información del Documento'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                decoration: const InputDecoration(
                  labelText: 'Tipo de documento',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'dni', child: Text('DNI / Documento de identidad')),
                  DropdownMenuItem(value: 'license', child: Text('Licencia de conducir')),
                  DropdownMenuItem(value: 'certificate', child: Text('Certificado')),
                  DropdownMenuItem(value: 'medical', child: Text('Apto médico')),
                  DropdownMenuItem(value: 'insurance', child: Text('Seguro')),
                  DropdownMenuItem(value: 'other', child: Text('Otro')),
                ],
                onChanged: (value) => typeController.text = value ?? '',
              ),
              const SizedBox(height: 16),
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Nombre del documento',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                title: Text(expirationDate != null
                    ? 'Vence: ${_formatDate(expirationDate!)}'
                    : 'Fecha de vencimiento'),
                trailing: const Icon(Icons.calendar_today),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: BorderSide(color: Colors.grey.shade400),
                ),
                onTap: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now().add(const Duration(days: 365)),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 3650)),
                  );
                  if (date != null) {
                    setDialogState(() => expirationDate = date);
                  }
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () {
                if (typeController.text.isEmpty || nameController.text.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Complete todos los campos')),
                  );
                  return;
                }
                Navigator.pop(context, {
                  'type': typeController.text,
                  'name': nameController.text,
                  'expiration_date': expirationDate?.toIso8601String(),
                });
              },
              child: const Text('Subir'),
            ),
          ],
        ),
      ),
    );

    if (result != null) {
      // Mostrar loading
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(color: Colors.cyan),
        ),
      );

      final response = await _api.uploadDocument(file, result);
      Navigator.pop(context); // Cerrar loading

      if (response.isSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Documento subido correctamente'),
            backgroundColor: Colors.green,
          ),
        );
        _loadDocuments();
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

  void _viewDocument(EmployeeDocument doc) {
    // TODO: Implementar visor de documento
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Abriendo documento...')),
    );
  }

  void _uploadRenewal(EmployeeDocument doc) {
    _showUploadOptions();
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}
