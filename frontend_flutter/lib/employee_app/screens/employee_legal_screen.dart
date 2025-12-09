/*
 * EMPLOYEE LEGAL SCREEN
 * =============================
 * Pantalla de informacion legal del empleado
 *
 * Funcionalidades:
 * - Ver comunicaciones legales recibidas
 * - Informacion de jurisdiccion
 * - Expediente legal 360 (resumen)
 *
 * Fecha: 2025-12-08
 * Version: 1.0.0
 */

import 'package:flutter/material.dart';
import '../services/employee_api_service.dart';

/// Modelo de comunicacion legal
class LegalCommunication {
  final String id;
  final String referenceNumber;
  final String subject;
  final String typeName;
  final String category;
  final String severity; // critical, high, medium, low
  final String status; // draft, sent, delivered, responded, closed
  final DateTime? createdAt;
  final DateTime? deliveredAt;
  final String? description;

  LegalCommunication({
    required this.id,
    required this.referenceNumber,
    required this.subject,
    required this.typeName,
    required this.category,
    required this.severity,
    required this.status,
    this.createdAt,
    this.deliveredAt,
    this.description,
  });

  factory LegalCommunication.fromJson(Map<String, dynamic> json) {
    return LegalCommunication(
      id: json['id']?.toString() ?? '',
      referenceNumber: json['reference_number'] ?? '',
      subject: json['subject'] ?? 'Sin asunto',
      typeName: json['type_name'] ?? json['type'] ?? 'Comunicacion',
      category: json['category'] ?? 'general',
      severity: json['severity'] ?? 'medium',
      status: json['status'] ?? 'sent',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
      deliveredAt: json['delivered_at'] != null
          ? DateTime.tryParse(json['delivered_at'].toString())
          : null,
      description: json['description'],
    );
  }

  Color get severityColor {
    switch (severity.toLowerCase()) {
      case 'critical':
        return Colors.red;
      case 'high':
        return Colors.orange;
      case 'medium':
        return Colors.amber;
      case 'low':
      default:
        return Colors.blue;
    }
  }

  IconData get categoryIcon {
    switch (category.toLowerCase()) {
      case 'sancion':
      case 'disciplinary':
        return Icons.gavel;
      case 'warning':
      case 'apercibimiento':
        return Icons.warning;
      case 'suspension':
        return Icons.pause_circle;
      case 'termination':
      case 'despido':
        return Icons.exit_to_app;
      case 'notification':
      case 'notificacion':
        return Icons.mail;
      default:
        return Icons.description;
    }
  }

  String get statusLabel {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'Borrador';
      case 'sent':
        return 'Enviado';
      case 'delivered':
        return 'Entregado';
      case 'responded':
        return 'Respondido';
      case 'closed':
        return 'Cerrado';
      default:
        return status;
    }
  }
}

/// EMPLOYEE LEGAL SCREEN
class EmployeeLegalScreen extends StatefulWidget {
  const EmployeeLegalScreen({Key? key}) : super(key: key);

  @override
  State<EmployeeLegalScreen> createState() => _EmployeeLegalScreenState();
}

class _EmployeeLegalScreenState extends State<EmployeeLegalScreen> {
  final EmployeeApiService _api = EmployeeApiService();

  List<LegalCommunication> _communications = [];
  Map<String, dynamic>? _jurisdiction;
  Map<String, dynamic>? _legal360;

  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _api.getMyLegalCommunications(),
        _api.getLegalJurisdiction(),
        _api.getMyLegal360(),
      ]);

      // Comunicaciones
      if (results[0].isSuccess && results[0].data != null) {
        final comms = results[0].data['data'] ?? results[0].data;
        if (comms is List) {
          _communications = comms.map((c) => LegalCommunication.fromJson(c)).toList();
        }
      }

      // Jurisdiccion
      if (results[1].isSuccess && results[1].data != null) {
        _jurisdiction = results[1].data['data'] ?? results[1].data;
      }

      // Legal 360
      if (results[2].isSuccess && results[2].data != null) {
        _legal360 = results[2].data['data'] ?? results[2].data;
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Error cargando informacion legal: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Informacion Legal'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorState()
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildJurisdictionCard(),
                        _buildLegal360Summary(),
                        _buildCommunicationsSection(),
                      ],
                    ),
                  ),
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

  Widget _buildJurisdictionCard() {
    if (_jurisdiction == null) return const SizedBox.shrink();

    final country = _jurisdiction!['country'] ?? 'Argentina';
    final region = _jurisdiction!['region'] ?? 'LATAM';
    final laborLaw = _jurisdiction!['labor_law'] ?? 'Ley de Contrato de Trabajo';

    return Card(
      margin: const EdgeInsets.all(16),
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
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.public, color: Colors.blue),
                ),
                const SizedBox(width: 12),
                const Text(
                  'Jurisdiccion Legal',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const Divider(height: 24),
            _buildInfoRow('Pais', country),
            _buildInfoRow('Region', region),
            _buildInfoRow('Marco Legal', laborLaw),
          ],
        ),
      ),
    );
  }

  Widget _buildLegal360Summary() {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
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
                    color: Colors.teal.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.account_balance, color: Colors.teal),
                ),
                const SizedBox(width: 12),
                const Text(
                  'Resumen de Expediente',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem(
                  'Comunicaciones',
                  _communications.length.toString(),
                  Colors.blue,
                  Icons.mail,
                ),
                _buildStatItem(
                  'Sanciones',
                  (_legal360?['sanctions_count'] ?? 0).toString(),
                  Colors.orange,
                  Icons.gavel,
                ),
                _buildStatItem(
                  'Incidencias',
                  (_legal360?['incidents_count'] ?? 0).toString(),
                  Colors.red,
                  Icons.warning,
                ),
              ],
            ),
            if (_legal360?['last_update'] != null) ...[
              const SizedBox(height: 16),
              Text(
                'Ultima actualizacion: ${_legal360!['last_update']}',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color, IconData icon) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color),
        ),
        Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
      ],
    );
  }

  Widget _buildCommunicationsSection() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.mail_outline, color: Colors.grey),
              SizedBox(width: 8),
              Text(
                'Comunicaciones Legales',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_communications.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  children: [
                    Icon(Icons.inbox, size: 64, color: Colors.grey.shade400),
                    const SizedBox(height: 16),
                    Text(
                      'No tienes comunicaciones legales',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ],
                ),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _communications.length,
              itemBuilder: (context, index) =>
                  _buildCommunicationCard(_communications[index]),
            ),
        ],
      ),
    );
  }

  Widget _buildCommunicationCard(LegalCommunication comm) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showCommunicationDetail(comm),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: comm.severityColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(comm.categoryIcon, color: comm.severityColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      comm.referenceNumber,
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                    ),
                    Text(
                      comm.subject,
                      style: const TextStyle(fontWeight: FontWeight.w500),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade200,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            comm.typeName,
                            style: TextStyle(color: Colors.grey.shade700, fontSize: 11),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          comm.statusLabel,
                          style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.grey.shade400),
            ],
          ),
        ),
      ),
    );
  }

  void _showCommunicationDetail(LegalCommunication comm) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
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
                        color: comm.severityColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(comm.categoryIcon, color: comm.severityColor, size: 32),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(comm.referenceNumber,
                              style: TextStyle(color: Colors.grey.shade600)),
                          Text(
                            comm.subject,
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Info
                _buildInfoRow('Tipo', comm.typeName),
                _buildInfoRow('Categoria', comm.category),
                _buildInfoRow('Severidad', comm.severity.toUpperCase()),
                _buildInfoRow('Estado', comm.statusLabel),
                if (comm.createdAt != null)
                  _buildInfoRow('Fecha', _formatDate(comm.createdAt!)),
                if (comm.deliveredAt != null)
                  _buildInfoRow('Entregado', _formatDate(comm.deliveredAt!)),

                if (comm.description != null) ...[
                  const SizedBox(height: 16),
                  const Divider(),
                  const SizedBox(height: 16),
                  const Text('Descripcion',
                      style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(comm.description!),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
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
