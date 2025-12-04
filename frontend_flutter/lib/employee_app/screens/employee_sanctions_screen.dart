/*
 * ⚖️ EMPLOYEE SANCTIONS SCREEN
 * =============================
 * Pantalla de historial de sanciones del empleado
 *
 * Características:
 * - Ver historial de sanciones
 * - Detalle de cada sanción
 * - Estado (activa/vencida)
 * - Solo lectura (no puede editar)
 *
 * Fecha: 2025-11-30
 * Versión: 1.0.0
 */

import 'package:flutter/material.dart';
import '../services/employee_api_service.dart';

/// 📦 Modelo de sanción
class Sanction {
  final String id;
  final String type;
  final String severity;
  final String description;
  final DateTime date;
  final DateTime? expirationDate;
  final String? appliedBy;
  final String? notes;
  final bool isActive;

  Sanction({
    required this.id,
    required this.type,
    required this.severity,
    required this.description,
    required this.date,
    this.expirationDate,
    this.appliedBy,
    this.notes,
    required this.isActive,
  });

  factory Sanction.fromJson(Map<String, dynamic> json) {
    return Sanction(
      id: json['id']?.toString() ?? '',
      type: json['type'] ?? json['tipo'] ?? 'warning',
      severity: json['severity'] ?? json['gravedad'] ?? 'light',
      description: json['description'] ?? json['descripcion'] ?? '',
      date: DateTime.parse(json['date']?.toString() ?? json['fecha']?.toString() ?? DateTime.now().toIso8601String()),
      expirationDate: json['expiration_date'] != null
          ? DateTime.tryParse(json['expiration_date'].toString())
          : null,
      appliedBy: json['applied_by'] ?? json['aplicado_por'],
      notes: json['notes'] ?? json['observaciones'],
      isActive: json['is_active'] ?? json['activa'] ?? true,
    );
  }

  String get typeLabel {
    switch (type.toLowerCase()) {
      case 'warning':
      case 'apercibimiento':
        return 'Apercibimiento';
      case 'suspension':
      case 'suspension':
        return 'Suspensión';
      case 'dismissal':
      case 'despido':
        return 'Despido';
      default:
        return type;
    }
  }

  String get severityLabel {
    switch (severity.toLowerCase()) {
      case 'light':
      case 'leve':
        return 'Leve';
      case 'moderate':
      case 'moderada':
        return 'Moderada';
      case 'severe':
      case 'grave':
        return 'Grave';
      default:
        return severity;
    }
  }

  Color get severityColor {
    switch (severity.toLowerCase()) {
      case 'light':
      case 'leve':
        return Colors.amber;
      case 'moderate':
      case 'moderada':
        return Colors.orange;
      case 'severe':
      case 'grave':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData get typeIcon {
    switch (type.toLowerCase()) {
      case 'warning':
      case 'apercibimiento':
        return Icons.warning_amber;
      case 'suspension':
      case 'suspension':
        return Icons.pause_circle;
      case 'dismissal':
      case 'despido':
        return Icons.cancel;
      default:
        return Icons.gavel;
    }
  }
}

/// ⚖️ EMPLOYEE SANCTIONS SCREEN
class EmployeeSanctionsScreen extends StatefulWidget {
  const EmployeeSanctionsScreen({Key? key}) : super(key: key);

  @override
  State<EmployeeSanctionsScreen> createState() => _EmployeeSanctionsScreenState();
}

class _EmployeeSanctionsScreenState extends State<EmployeeSanctionsScreen> {
  final EmployeeApiService _api = EmployeeApiService();

  List<Sanction> _sanctions = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSanctions();
  }

  Future<void> _loadSanctions() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _api.getMySanctions();

      if (response.isSuccess && response.data != null) {
        final List<dynamic> list = response.data is List ? response.data : [];
        setState(() {
          _sanctions = list.map((s) => Sanction.fromJson(s)).toList();
          _sanctions.sort((a, b) => b.date.compareTo(a.date));
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = response.error ?? 'Error al cargar sanciones';
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
    final activeSanctions = _sanctions.where((s) => s.isActive).length;

    return Scaffold(
      backgroundColor: const Color(0xFF0D1B2A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1B263B),
        elevation: 0,
        title: const Text('Mis Sanciones'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadSanctions,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.cyan))
          : _error != null
              ? _buildError()
              : _buildContent(activeSanctions),
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
            onPressed: _loadSanctions,
            icon: const Icon(Icons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(int activeSanctions) {
    return Column(
      children: [
        // Resumen
        _buildSummary(activeSanctions),

        // Lista
        Expanded(
          child: _sanctions.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _loadSanctions,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _sanctions.length,
                    itemBuilder: (context, index) {
                      return _buildSanctionCard(_sanctions[index]);
                    },
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildSummary(int activeSanctions) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: activeSanctions > 0
            ? Colors.red.withOpacity(0.1)
            : Colors.green.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: activeSanctions > 0
              ? Colors.red.withOpacity(0.3)
              : Colors.green.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            activeSanctions > 0 ? Icons.warning : Icons.check_circle,
            color: activeSanctions > 0 ? Colors.red : Colors.green,
            size: 32,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  activeSanctions > 0
                      ? '$activeSanctions sanción(es) activa(s)'
                      : 'Sin sanciones activas',
                  style: TextStyle(
                    color: activeSanctions > 0 ? Colors.red : Colors.green,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'Total histórico: ${_sanctions.length}',
                  style: const TextStyle(color: Colors.white54, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.verified_user,
              color: Colors.green,
              size: 40,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Sin Sanciones',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'No tiene sanciones registradas',
            style: TextStyle(color: Colors.white54),
          ),
        ],
      ),
    );
  }

  Widget _buildSanctionCard(Sanction sanction) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B),
        borderRadius: BorderRadius.circular(12),
        border: sanction.isActive
            ? Border.all(color: sanction.severityColor.withOpacity(0.5), width: 2)
            : null,
      ),
      child: InkWell(
        onTap: () => _showSanctionDetail(sanction),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: sanction.severityColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      sanction.typeIcon,
                      color: sanction.severityColor,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          sanction.typeLabel,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                          ),
                        ),
                        Text(
                          _formatDate(sanction.date),
                          style: const TextStyle(
                            color: Colors.white54,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: sanction.severityColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          sanction.severityLabel,
                          style: TextStyle(
                            color: sanction.severityColor,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: sanction.isActive
                              ? Colors.red.withOpacity(0.1)
                              : Colors.grey.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          sanction.isActive ? 'ACTIVA' : 'VENCIDA',
                          style: TextStyle(
                            color: sanction.isActive ? Colors.red : Colors.grey,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Descripción
              Text(
                sanction.description,
                style: const TextStyle(color: Colors.white70, fontSize: 13),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSanctionDetail(Sanction sanction) {
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
                    color: sanction.severityColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    sanction.typeIcon,
                    color: sanction.severityColor,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        sanction.typeLabel,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Row(
                        children: [
                          Container(
                            margin: const EdgeInsets.only(top: 4, right: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: sanction.severityColor.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              sanction.severityLabel,
                              style: TextStyle(
                                color: sanction.severityColor,
                                fontSize: 12,
                              ),
                            ),
                          ),
                          Container(
                            margin: const EdgeInsets.only(top: 4),
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: sanction.isActive
                                  ? Colors.red.withOpacity(0.2)
                                  : Colors.grey.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              sanction.isActive ? 'Activa' : 'Vencida',
                              style: TextStyle(
                                color: sanction.isActive ? Colors.red : Colors.grey,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Descripción
            const Text(
              'DESCRIPCIÓN',
              style: TextStyle(
                color: Colors.cyan,
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              sanction.description,
              style: const TextStyle(color: Colors.white70, fontSize: 14),
            ),
            const SizedBox(height: 16),

            // Detalles
            _buildDetailRow('Fecha', _formatDate(sanction.date)),
            if (sanction.expirationDate != null)
              _buildDetailRow('Vencimiento', _formatDate(sanction.expirationDate!)),
            if (sanction.appliedBy != null)
              _buildDetailRow('Aplicada por', sanction.appliedBy!),
            if (sanction.notes != null && sanction.notes!.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text(
                'OBSERVACIONES',
                style: TextStyle(
                  color: Colors.cyan,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                sanction.notes!,
                style: const TextStyle(color: Colors.white54, fontSize: 13),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
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

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}
