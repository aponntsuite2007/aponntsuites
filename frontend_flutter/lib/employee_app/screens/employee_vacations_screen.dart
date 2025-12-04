/*
 * 🏖️ EMPLOYEE VACATIONS SCREEN
 * =============================
 * Pantalla de vacaciones del empleado
 *
 * Características:
 * - Ver saldo de días disponibles
 * - Solicitar vacaciones con calendario
 * - Ver historial de solicitudes
 * - Estado de solicitudes pendientes
 * - Cancelar solicitudes no aprobadas
 *
 * Fecha: 2025-11-30
 * Versión: 1.0.0
 */

import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import '../services/employee_api_service.dart';

/// 📦 Modelo de solicitud de vacaciones
class VacationRequest {
  final String id;
  final DateTime startDate;
  final DateTime endDate;
  final int days;
  final String status;
  final String? notes;
  final String? approverName;
  final DateTime? approvalDate;
  final DateTime createdAt;

  VacationRequest({
    required this.id,
    required this.startDate,
    required this.endDate,
    required this.days,
    required this.status,
    this.notes,
    this.approverName,
    this.approvalDate,
    required this.createdAt,
  });

  factory VacationRequest.fromJson(Map<String, dynamic> json) {
    final start = DateTime.parse(json['start_date'].toString());
    final end = DateTime.parse(json['end_date'].toString());

    return VacationRequest(
      id: json['id']?.toString() ?? '',
      startDate: start,
      endDate: end,
      days: json['days'] ?? end.difference(start).inDays + 1,
      status: json['status'] ?? 'pending',
      notes: json['notes'],
      approverName: json['approver']?['name'] ?? json['approver_name'],
      approvalDate: json['approval_date'] != null
          ? DateTime.tryParse(json['approval_date'].toString())
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'].toString())
          : DateTime.now(),
    );
  }

  bool get isPending => status == 'pending' || status == 'pendiente';
  bool get isApproved => status == 'approved' || status == 'aprobado';
  bool get isRejected => status == 'rejected' || status == 'rechazado';
  bool get isCancelled => status == 'cancelled' || status == 'cancelado';

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
    if (isCancelled) return 'Cancelado';
    return status;
  }
}

/// 🏖️ EMPLOYEE VACATIONS SCREEN
class EmployeeVacationsScreen extends StatefulWidget {
  const EmployeeVacationsScreen({Key? key}) : super(key: key);

  @override
  State<EmployeeVacationsScreen> createState() => _EmployeeVacationsScreenState();
}

class _EmployeeVacationsScreenState extends State<EmployeeVacationsScreen>
    with SingleTickerProviderStateMixin {
  final EmployeeApiService _api = EmployeeApiService();

  late TabController _tabController;

  // Datos
  Map<String, dynamic>? _balance;
  List<VacationRequest> _requests = [];

  // Estados
  bool _isLoading = true;
  String? _error;

  // Para nueva solicitud
  DateTime? _selectedStartDate;
  DateTime? _selectedEndDate;
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();

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
      final results = await Future.wait([
        _api.getVacationBalance(),
        _api.getMyVacationRequests(),
      ]);

      setState(() {
        if (results[0].isSuccess) {
          _balance = results[0].data;
        }

        if (results[1].isSuccess && results[1].data != null) {
          final List<dynamic> list = results[1].data is List ? results[1].data : [];
          _requests = list.map((r) => VacationRequest.fromJson(r)).toList();
          _requests.sort((a, b) => b.createdAt.compareTo(a.createdAt));
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1B2A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1B263B),
        elevation: 0,
        title: const Text('Mis Vacaciones'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.cyan,
          tabs: const [
            Tab(icon: Icon(Icons.add_circle_outline), text: 'Solicitar'),
            Tab(icon: Icon(Icons.history), text: 'Historial'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.cyan))
          : _error != null
              ? _buildError()
              : Column(
                  children: [
                    // Balance siempre visible
                    _buildBalanceCard(),

                    // Tabs
                    Expanded(
                      child: TabBarView(
                        controller: _tabController,
                        children: [
                          _buildRequestTab(),
                          _buildHistoryTab(),
                        ],
                      ),
                    ),
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

  Widget _buildBalanceCard() {
    final available = (_balance?['available'] ?? _balance?['disponibles'] ?? 0).toDouble();
    final used = (_balance?['used'] ?? _balance?['usados'] ?? 0).toDouble();
    final total = (_balance?['total'] ?? available + used).toDouble();
    final pending = (_balance?['pending'] ?? _balance?['pendientes'] ?? 0).toDouble();

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.cyan.shade700, Colors.blue.shade800],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.beach_access, color: Colors.white, size: 24),
              const SizedBox(width: 8),
              const Text(
                'Balance de Vacaciones',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildBalanceItem('Disponibles', available.toInt(), Colors.green),
              _buildBalanceItem('Pendientes', pending.toInt(), Colors.amber),
              _buildBalanceItem('Usados', used.toInt(), Colors.white70),
              _buildBalanceItem('Total', total.toInt(), Colors.white),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBalanceItem(String label, int value, Color color) {
    return Column(
      children: [
        Text(
          '$value',
          style: TextStyle(
            color: color,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withOpacity(0.8),
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  // ===========================================
  // 📅 TAB 1: SOLICITAR VACACIONES
  // ===========================================
  Widget _buildRequestTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Instrucciones
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.cyan.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.cyan.withOpacity(0.3)),
          ),
          child: Row(
            children: [
              const Icon(Icons.info_outline, color: Colors.cyan, size: 20),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Seleccione las fechas de inicio y fin en el calendario',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Calendario
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF1B263B),
            borderRadius: BorderRadius.circular(12),
          ),
          child: TableCalendar(
            firstDay: DateTime.now(),
            lastDay: DateTime.now().add(const Duration(days: 365)),
            focusedDay: _focusedDay,
            calendarFormat: _calendarFormat,
            selectedDayPredicate: (day) {
              if (_selectedStartDate == null) return false;
              if (_selectedEndDate == null) return isSameDay(_selectedStartDate, day);
              return day.isAfter(_selectedStartDate!.subtract(const Duration(days: 1))) &&
                  day.isBefore(_selectedEndDate!.add(const Duration(days: 1)));
            },
            onDaySelected: (selectedDay, focusedDay) {
              setState(() {
                if (_selectedStartDate == null || _selectedEndDate != null) {
                  _selectedStartDate = selectedDay;
                  _selectedEndDate = null;
                } else if (selectedDay.isBefore(_selectedStartDate!)) {
                  _selectedStartDate = selectedDay;
                } else {
                  _selectedEndDate = selectedDay;
                }
                _focusedDay = focusedDay;
              });
            },
            onFormatChanged: (format) {
              setState(() => _calendarFormat = format);
            },
            calendarStyle: CalendarStyle(
              todayDecoration: BoxDecoration(
                color: Colors.grey.shade600,
                shape: BoxShape.circle,
              ),
              selectedDecoration: const BoxDecoration(
                color: Colors.cyan,
                shape: BoxShape.circle,
              ),
              rangeHighlightColor: Colors.cyan.withOpacity(0.3),
              weekendTextStyle: const TextStyle(color: Colors.red),
              defaultTextStyle: const TextStyle(color: Colors.white),
              outsideTextStyle: const TextStyle(color: Colors.white38),
            ),
            headerStyle: const HeaderStyle(
              titleTextStyle: TextStyle(color: Colors.white, fontSize: 16),
              formatButtonTextStyle: TextStyle(color: Colors.cyan),
              formatButtonDecoration: BoxDecoration(
                border: Border.fromBorderSide(BorderSide(color: Colors.cyan)),
                borderRadius: BorderRadius.all(Radius.circular(12)),
              ),
              leftChevronIcon: Icon(Icons.chevron_left, color: Colors.white),
              rightChevronIcon: Icon(Icons.chevron_right, color: Colors.white),
            ),
            daysOfWeekStyle: const DaysOfWeekStyle(
              weekdayStyle: TextStyle(color: Colors.white70),
              weekendStyle: TextStyle(color: Colors.red),
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Resumen de selección
        if (_selectedStartDate != null)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1B263B),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.cyan.withOpacity(0.3)),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Desde',
                          style: TextStyle(color: Colors.white54, fontSize: 12),
                        ),
                        Text(
                          _formatDate(_selectedStartDate!),
                          style: const TextStyle(color: Colors.white, fontSize: 16),
                        ),
                      ],
                    ),
                    const Icon(Icons.arrow_forward, color: Colors.cyan),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text(
                          'Hasta',
                          style: TextStyle(color: Colors.white54, fontSize: 12),
                        ),
                        Text(
                          _selectedEndDate != null
                              ? _formatDate(_selectedEndDate!)
                              : 'Seleccionar',
                          style: TextStyle(
                            color: _selectedEndDate != null ? Colors.white : Colors.cyan,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                if (_selectedEndDate != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${_selectedEndDate!.difference(_selectedStartDate!).inDays + 1} días hábiles',
                      style: const TextStyle(
                        color: Colors.green,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),

        const SizedBox(height: 16),

        // Botón enviar
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _selectedStartDate != null && _selectedEndDate != null
                ? _submitRequest
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

    // Agrupar por estado
    final pending = _requests.where((r) => r.isPending).toList();
    final approved = _requests.where((r) => r.isApproved).toList();
    final rejected = _requests.where((r) => r.isRejected).toList();
    final cancelled = _requests.where((r) => r.isCancelled).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (pending.isNotEmpty) ...[
          _buildRequestSection('Pendientes', Icons.pending, Colors.amber, pending),
          const SizedBox(height: 16),
        ],
        if (approved.isNotEmpty) ...[
          _buildRequestSection('Aprobadas', Icons.check_circle, Colors.green, approved),
          const SizedBox(height: 16),
        ],
        if (rejected.isNotEmpty) ...[
          _buildRequestSection('Rechazadas', Icons.cancel, Colors.red, rejected),
          const SizedBox(height: 16),
        ],
        if (cancelled.isNotEmpty)
          _buildRequestSection('Canceladas', Icons.block, Colors.grey, cancelled),
      ],
    );
  }

  Widget _buildRequestSection(
    String title,
    IconData icon,
    Color color,
    List<VacationRequest> requests,
  ) {
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

  Widget _buildRequestItem(VacationRequest request) {
    return InkWell(
      onTap: () => _showRequestDetail(request),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // Icono de fecha
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: request.statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    request.startDate.day.toString(),
                    style: TextStyle(
                      color: request.statusColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    _getMonthAbbr(request.startDate.month),
                    style: TextStyle(
                      color: request.statusColor,
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),

            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${_formatDate(request.startDate)} - ${_formatDate(request.endDate)}',
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                  ),
                  Text(
                    '${request.days} días',
                    style: const TextStyle(color: Colors.white54, fontSize: 12),
                  ),
                ],
              ),
            ),

            // Estado
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: request.statusColor.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
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
          ],
        ),
      ),
    );
  }

  void _showRequestDetail(VacationRequest request) {
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
                    Icons.beach_access,
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
                        'Solicitud de Vacaciones',
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
            _buildDetailRow('Días', '${request.days} días'),
            _buildDetailRow('Solicitado', _formatDate(request.createdAt)),
            if (request.approverName != null)
              _buildDetailRow('Aprobador', request.approverName!),
            if (request.notes != null) _buildDetailRow('Notas', request.notes!),

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
              style: const TextStyle(color: Colors.white, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submitRequest() async {
    if (_selectedStartDate == null || _selectedEndDate == null) return;

    final notesController = TextEditingController();

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar Solicitud'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Desde: ${_formatDate(_selectedStartDate!)}\n'
              'Hasta: ${_formatDate(_selectedEndDate!)}\n'
              'Días: ${_selectedEndDate!.difference(_selectedStartDate!).inDays + 1}',
            ),
            const SizedBox(height: 16),
            TextField(
              controller: notesController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Notas (opcional)',
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
            child: const Text('Enviar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(color: Colors.cyan),
        ),
      );

      final response = await _api.requestVacation(
        startDate: _selectedStartDate!,
        endDate: _selectedEndDate!,
        notes: notesController.text.isNotEmpty ? notesController.text : null,
      );

      Navigator.pop(context);

      if (response.isSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Solicitud enviada correctamente'),
            backgroundColor: Colors.green,
          ),
        );
        setState(() {
          _selectedStartDate = null;
          _selectedEndDate = null;
        });
        _loadData();
        _tabController.animateTo(1); // Ir a historial
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

  Future<void> _cancelRequest(VacationRequest request) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancelar Solicitud'),
        content: const Text('¿Está seguro de cancelar esta solicitud de vacaciones?'),
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
      Navigator.pop(context); // Cerrar bottom sheet

      final response = await _api.cancelVacationRequest(request.id);

      if (response.isSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Solicitud cancelada'),
            backgroundColor: Colors.green,
          ),
        );
        _loadData();
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

  String _getMonthAbbr(int month) {
    const abbrs = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return abbrs[month - 1];
  }
}
