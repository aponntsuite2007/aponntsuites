import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/attendance_provider.dart';
import '../../config/theme.dart';

class RealTimeStatusWidget extends StatelessWidget {
  final bool showDetails;
  
  const RealTimeStatusWidget({
    Key? key,
    this.showDetails = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<AttendanceProvider>(
      builder: (context, attendanceProvider, child) {
        return Container(
          padding: EdgeInsets.all(showDetails ? 16 : 8),
          decoration: BoxDecoration(
            color: _getStatusColor(attendanceProvider).withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: _getStatusColor(attendanceProvider),
              width: 1,
            ),
          ),
          child: showDetails 
              ? _buildDetailedStatus(attendanceProvider)
              : _buildCompactStatus(attendanceProvider),
        );
      },
    );
  }

  Widget _buildCompactStatus(AttendanceProvider provider) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: _getStatusColor(provider),
            shape: BoxShape.circle,
          ),
        ),
        SizedBox(width: 8),
        Text(
          _getStatusText(provider),
          style: TextStyle(
            color: _getStatusColor(provider),
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildDetailedStatus(AttendanceProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              _getStatusIcon(provider),
              color: _getStatusColor(provider),
              size: 20,
            ),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Estado de Conexión',
                style: AppTheme.titleStyle.copyWith(
                  fontSize: 16,
                  color: _getStatusColor(provider),
                ),
              ),
            ),
            Container(
              padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _getStatusColor(provider),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _getStatusText(provider),
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        SizedBox(height: 12),
        Text(
          _getStatusDescription(provider),
          style: AppTheme.bodyStyle.copyWith(
            color: AppTheme.textSecondary,
            fontSize: 12,
          ),
        ),
        if (provider.isRealTimeEnabled && !provider.isWebSocketConnected) ...[
          SizedBox(height: 8),
          InkWell(
            onTap: () => _reconnect(provider),
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                'RECONECTAR',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Color _getStatusColor(AttendanceProvider provider) {
    if (!provider.isRealTimeEnabled) {
      return AppTheme.textSecondary;
    }
    
    if (provider.isWebSocketConnected) {
      return AppTheme.successColor;
    }
    
    return AppTheme.errorColor;
  }

  IconData _getStatusIcon(AttendanceProvider provider) {
    if (!provider.isRealTimeEnabled) {
      return Icons.sync_disabled;
    }
    
    if (provider.isWebSocketConnected) {
      return Icons.wifi;
    }
    
    return Icons.wifi_off;
  }

  String _getStatusText(AttendanceProvider provider) {
    if (!provider.isRealTimeEnabled) {
      return 'Deshabilitado';
    }
    
    if (provider.isWebSocketConnected) {
      return 'En Línea';
    }
    
    return 'Desconectado';
  }

  String _getStatusDescription(AttendanceProvider provider) {
    if (!provider.isRealTimeEnabled) {
      return 'Las actualizaciones en tiempo real están deshabilitadas.';
    }
    
    if (provider.isWebSocketConnected) {
      return 'Recibiendo actualizaciones de asistencia en tiempo real.';
    }
    
    return 'Sin conexión. Intentando reconectar...';
  }

  void _reconnect(AttendanceProvider provider) {
    // Implementar lógica de reconexión
    provider.setRealTimeEnabled(false);
    Future.delayed(Duration(seconds: 1), () {
      provider.setRealTimeEnabled(true);
    });
  }
}

class ConnectionStatusIndicator extends StatefulWidget {
  @override
  _ConnectionStatusIndicatorState createState() => _ConnectionStatusIndicatorState();
}

class _ConnectionStatusIndicatorState extends State<ConnectionStatusIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: Duration(milliseconds: 1500),
      vsync: this,
    );
    _animation = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
    _animationController.repeat(reverse: true);
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AttendanceProvider>(
      builder: (context, attendanceProvider, child) {
        if (!attendanceProvider.isRealTimeEnabled || 
            attendanceProvider.isWebSocketConnected) {
          _animationController.stop();
          return SizedBox.shrink();
        }

        _animationController.repeat(reverse: true);

        return AnimatedBuilder(
          animation: _animation,
          builder: (context, child) {
            return Opacity(
              opacity: _animation.value,
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppTheme.warningColor,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 12,
                      height: 12,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    ),
                    SizedBox(width: 6),
                    Text(
                      'Reconectando...',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}