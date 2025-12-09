/*
 * EMPLOYEE PROCEDURES SCREEN
 * =============================
 * Pantalla de procedimientos e instructivos del empleado
 *
 * Funcionalidades:
 * - Ver procedimientos aplicables al empleado
 * - Pendientes de acuse de recibo
 * - Firmar acuse desde la app
 * - Filtros por estado y tipo
 *
 * Fecha: 2025-12-08
 * Version: 1.0.0
 */

import 'package:flutter/material.dart';
import '../services/employee_api_service.dart';

/// Modelo de procedimiento
class Procedure {
  final String id;
  final String code;
  final String title;
  final String type; // procedimiento, instructivo, manual, politica
  final String? description;
  final String status; // published, pending_review, draft
  final DateTime? publishedAt;
  final String? version;
  final bool acknowledged;
  final DateTime? acknowledgedAt;

  Procedure({
    required this.id,
    required this.code,
    required this.title,
    required this.type,
    this.description,
    required this.status,
    this.publishedAt,
    this.version,
    required this.acknowledged,
    this.acknowledgedAt,
  });

  factory Procedure.fromJson(Map<String, dynamic> json) {
    return Procedure(
      id: json['id']?.toString() ?? '',
      code: json['code'] ?? '',
      title: json['title'] ?? 'Sin titulo',
      type: json['type'] ?? 'instructivo',
      description: json['description'],
      status: json['status'] ?? 'published',
      publishedAt: json['published_at'] != null
          ? DateTime.tryParse(json['published_at'].toString())
          : null,
      version: json['version']?.toString(),
      acknowledged: json['acknowledged'] == true || json['ack_status'] == 'acknowledged',
      acknowledgedAt: json['acknowledged_at'] != null || json['ack_date'] != null
          ? DateTime.tryParse((json['acknowledged_at'] ?? json['ack_date']).toString())
          : null,
    );
  }

  Color get typeColor {
    switch (type.toLowerCase()) {
      case 'politica':
        return Colors.purple;
      case 'manual':
        return Colors.blue;
      case 'procedimiento':
        return Colors.teal;
      case 'instructivo':
      default:
        return Colors.orange;
    }
  }

  IconData get typeIcon {
    switch (type.toLowerCase()) {
      case 'politica':
        return Icons.policy;
      case 'manual':
        return Icons.menu_book;
      case 'procedimiento':
        return Icons.account_tree;
      case 'instructivo':
      default:
        return Icons.list_alt;
    }
  }

  String get typeLabel {
    switch (type.toLowerCase()) {
      case 'politica':
        return 'Politica';
      case 'manual':
        return 'Manual';
      case 'procedimiento':
        return 'Procedimiento';
      case 'instructivo':
      default:
        return 'Instructivo';
    }
  }
}

/// EMPLOYEE PROCEDURES SCREEN
class EmployeeProceduresScreen extends StatefulWidget {
  const EmployeeProceduresScreen({Key? key}) : super(key: key);

  @override
  State<EmployeeProceduresScreen> createState() => _EmployeeProceduresScreenState();
}

class _EmployeeProceduresScreenState extends State<EmployeeProceduresScreen>
    with SingleTickerProviderStateMixin {
  final EmployeeApiService _api = EmployeeApiService();
  late TabController _tabController;

  List<Procedure> _allProcedures = [];
  List<Procedure> _pendingProcedures = [];

  bool _isLoading = true;
  String? _error;

  // Resumen
  int _totalProcedures = 0;
  int _acknowledgedCount = 0;
  int _pendingCount = 0;
  double _complianceRate = 100.0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Cargar en paralelo
      final results = await Future.wait([
        _api.getMyProcedures(),
        _api.getMyPendingProcedures(),
        _api.getMyProceduresSummary(),
      ]);

      // Procedimientos
      if (results[0].isSuccess && results[0].data != null) {
        final procedures = results[0].data['procedures'] ?? results[0].data;
        if (procedures is List) {
          _allProcedures = procedures.map((p) => Procedure.fromJson(p)).toList();
        }
      }

      // Pendientes
      if (results[1].isSuccess && results[1].data != null) {
        final pending = results[1].data['procedures'] ?? results[1].data;
        if (pending is List) {
          _pendingProcedures = pending.map((p) => Procedure.fromJson(p)).toList();
        }
      }

      // Resumen
      if (results[2].isSuccess && results[2].data != null) {
        final summary = results[2].data;
        _totalProcedures = summary['total'] ?? _allProcedures.length;
        _acknowledgedCount = summary['acknowledged'] ??
            _allProcedures.where((p) => p.acknowledged).length;
        _pendingCount = summary['pending'] ?? _pendingProcedures.length;
        _complianceRate = (summary['compliance_rate'] ??
            (_totalProcedures > 0 ? (_acknowledgedCount / _totalProcedures) * 100 : 100)).toDouble();
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Error cargando procedimientos: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _acknowledgeProcedure(Procedure procedure) async {
    // Mostrar dialogo de confirmacion
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar Acuse de Recibo'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Documento: ${procedure.title}'),
            const SizedBox(height: 8),
            Text('Codigo: ${procedure.code}', style: TextStyle(color: Colors.grey.shade600)),
            const SizedBox(height: 16),
            const Text(
              'Al confirmar, declaras que has leido y comprendido este documento.',
              style: TextStyle(fontStyle: FontStyle.italic),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(context, true),
            icon: const Icon(Icons.check),
            label: const Text('Confirmar'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    // Enviar acuse
    final response = await _api.acknowledgeProcedure(procedure.id);

    if (response.isSuccess) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Acuse de recibo registrado exitosamente'),
          backgroundColor: Colors.green,
        ),
      );
      _loadData(); // Recargar
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${response.error ?? 'No se pudo registrar el acuse'}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Procedimientos'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              icon: const Icon(Icons.list_alt),
              text: 'Todos (${_allProcedures.length})',
            ),
            Tab(
              icon: Badge(
                label: Text('$_pendingCount'),
                isLabelVisible: _pendingCount > 0,
                child: const Icon(Icons.pending_actions),
              ),
              text: 'Pendientes',
            ),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorState()
              : Column(
                  children: [
                    _buildSummaryCard(),
                    Expanded(
                      child: TabBarView(
                        controller: _tabController,
                        children: [
                          _buildProceduresList(_allProcedures),
                          _buildProceduresList(_pendingProcedures, showAckButton: true),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
          const SizedBox(height: 16),
          Text(_error!, textAlign: TextAlign.center),
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

  Widget _buildSummaryCard() {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem('Total', _totalProcedures.toString(), Colors.blue),
                _buildStatItem('Firmados', _acknowledgedCount.toString(), Colors.green),
                _buildStatItem('Pendientes', _pendingCount.toString(),
                    _pendingCount > 0 ? Colors.orange : Colors.grey),
              ],
            ),
            const SizedBox(height: 16),
            // Barra de progreso
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Cumplimiento', style: TextStyle(fontWeight: FontWeight.w500)),
                    Text('${_complianceRate.toStringAsFixed(0)}%',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: _complianceRate >= 80 ? Colors.green : Colors.orange,
                        )),
                  ],
                ),
                const SizedBox(height: 8),
                LinearProgressIndicator(
                  value: _complianceRate / 100,
                  backgroundColor: Colors.grey.shade200,
                  valueColor: AlwaysStoppedAnimation(
                    _complianceRate >= 80 ? Colors.green : Colors.orange,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(label, style: TextStyle(color: Colors.grey.shade600)),
      ],
    );
  }

  Widget _buildProceduresList(List<Procedure> procedures, {bool showAckButton = false}) {
    if (procedures.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              showAckButton ? Icons.check_circle_outline : Icons.folder_open,
              size: 64,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              showAckButton
                  ? 'No tienes procedimientos pendientes'
                  : 'No hay procedimientos disponibles',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.only(bottom: 16),
        itemCount: procedures.length,
        itemBuilder: (context, index) {
          final proc = procedures[index];
          return _buildProcedureCard(proc, showAckButton: showAckButton && !proc.acknowledged);
        },
      ),
    );
  }

  Widget _buildProcedureCard(Procedure procedure, {bool showAckButton = false}) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: () => _showProcedureDetail(procedure),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: procedure.typeColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(procedure.typeIcon, color: procedure.typeColor),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          procedure.code,
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 12,
                          ),
                        ),
                        Text(
                          procedure.title,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildStatusBadge(procedure),
                ],
              ),
              if (procedure.description != null) ...[
                const SizedBox(height: 8),
                Text(
                  procedure.description!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: Colors.grey.shade600),
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: procedure.typeColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      procedure.typeLabel,
                      style: TextStyle(
                        color: procedure.typeColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const Spacer(),
                  if (showAckButton)
                    ElevatedButton.icon(
                      onPressed: () => _acknowledgeProcedure(procedure),
                      icon: const Icon(Icons.check, size: 18),
                      label: const Text('Firmar Acuse'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(Procedure procedure) {
    if (procedure.acknowledged) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.green.shade100,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_circle, color: Colors.green.shade700, size: 16),
            const SizedBox(width: 4),
            Text(
              'Firmado',
              style: TextStyle(
                color: Colors.green.shade700,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      );
    } else {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.orange.shade100,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.pending, color: Colors.orange.shade700, size: 16),
            const SizedBox(width: 4),
            Text(
              'Pendiente',
              style: TextStyle(
                color: Colors.orange.shade700,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      );
    }
  }

  void _showProcedureDetail(Procedure procedure) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Header
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: procedure.typeColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(procedure.typeIcon, color: procedure.typeColor, size: 32),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(procedure.code, style: TextStyle(color: Colors.grey.shade600)),
                          Text(
                            procedure.title,
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Info
                _buildDetailRow('Tipo', procedure.typeLabel),
                if (procedure.version != null)
                  _buildDetailRow('Version', procedure.version!),
                if (procedure.publishedAt != null)
                  _buildDetailRow('Publicado', _formatDate(procedure.publishedAt!)),
                _buildDetailRow('Estado de Acuse', procedure.acknowledged ? 'Firmado' : 'Pendiente'),
                if (procedure.acknowledgedAt != null)
                  _buildDetailRow('Fecha de Firma', _formatDate(procedure.acknowledgedAt!)),

                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 16),

                // Descripcion
                if (procedure.description != null) ...[
                  const Text('Descripcion', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(procedure.description!),
                  const SizedBox(height: 24),
                ],

                // Boton de acuse si esta pendiente
                if (!procedure.acknowledged)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _acknowledgeProcedure(procedure);
                      },
                      icon: const Icon(Icons.check),
                      label: const Text('Firmar Acuse de Recibo'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade600)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
