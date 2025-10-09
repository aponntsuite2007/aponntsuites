import 'package:flutter/material.dart';

enum NotificationType {
  attendance,
  reminder,
  warning,
  announcement,
  system,
}

enum NotificationPriority {
  low,
  medium,
  high,
  urgent,
}

class Notification {
  final String id;
  final String title;
  final String body;
  final NotificationType type;
  final DateTime timestamp;
  final bool isRead;
  final NotificationPriority priority;
  final Map<String, dynamic>? data;
  final String? imageUrl;
  final String? actionUrl;

  const Notification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.timestamp,
    this.isRead = false,
    this.priority = NotificationPriority.medium,
    this.data,
    this.imageUrl,
    this.actionUrl,
  });

  factory Notification.fromJson(Map<String, dynamic> json) {
    return Notification(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      body: json['body'] ?? '',
      type: NotificationType.values.firstWhere(
        (type) => type.toString() == 'NotificationType.${json['type']}',
        orElse: () => NotificationType.system,
      ),
      timestamp: DateTime.parse(json['timestamp']),
      isRead: json['isRead'] ?? false,
      priority: NotificationPriority.values.firstWhere(
        (priority) => priority.toString() == 'NotificationPriority.${json['priority']}',
        orElse: () => NotificationPriority.medium,
      ),
      data: json['data'],
      imageUrl: json['imageUrl'],
      actionUrl: json['actionUrl'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'body': body,
      'type': type.toString().split('.').last,
      'timestamp': timestamp.toIso8601String(),
      'isRead': isRead,
      'priority': priority.toString().split('.').last,
      'data': data,
      'imageUrl': imageUrl,
      'actionUrl': actionUrl,
    };
  }

  Notification copyWith({
    String? id,
    String? title,
    String? body,
    NotificationType? type,
    DateTime? timestamp,
    bool? isRead,
    NotificationPriority? priority,
    Map<String, dynamic>? data,
    String? imageUrl,
    String? actionUrl,
  }) {
    return Notification(
      id: id ?? this.id,
      title: title ?? this.title,
      body: body ?? this.body,
      type: type ?? this.type,
      timestamp: timestamp ?? this.timestamp,
      isRead: isRead ?? this.isRead,
      priority: priority ?? this.priority,
      data: data ?? this.data,
      imageUrl: imageUrl ?? this.imageUrl,
      actionUrl: actionUrl ?? this.actionUrl,
    );
  }

  IconData get typeIcon {
    switch (type) {
      case NotificationType.attendance:
        return Icons.access_time;
      case NotificationType.reminder:
        return Icons.alarm;
      case NotificationType.warning:
        return Icons.warning;
      case NotificationType.announcement:
        return Icons.campaign;
      case NotificationType.system:
        return Icons.settings;
    }
  }

  Color get typeColor {
    switch (type) {
      case NotificationType.attendance:
        return Colors.blue;
      case NotificationType.reminder:
        return Colors.orange;
      case NotificationType.warning:
        return Colors.amber;
      case NotificationType.announcement:
        return Colors.purple;
      case NotificationType.system:
        return Colors.grey;
    }
  }

  String get typeDisplayName {
    switch (type) {
      case NotificationType.attendance:
        return 'Asistencia';
      case NotificationType.reminder:
        return 'Recordatorio';
      case NotificationType.warning:
        return 'Advertencia';
      case NotificationType.announcement:
        return 'Anuncio';
      case NotificationType.system:
        return 'Sistema';
    }
  }

  String get priorityDisplayName {
    switch (priority) {
      case NotificationPriority.low:
        return 'Baja';
      case NotificationPriority.medium:
        return 'Media';
      case NotificationPriority.high:
        return 'Alta';
      case NotificationPriority.urgent:
        return 'Urgente';
    }
  }

  String get relativeTime {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Ahora';
    } else if (difference.inMinutes < 60) {
      return 'hace ${difference.inMinutes}m';
    } else if (difference.inHours < 24) {
      return 'hace ${difference.inHours}h';
    } else if (difference.inDays < 7) {
      return 'hace ${difference.inDays}d';
    } else {
      return '${timestamp.day}/${timestamp.month}/${timestamp.year}';
    }
  }
}