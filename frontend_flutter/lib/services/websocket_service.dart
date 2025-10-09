import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:flutter/foundation.dart';

class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  WebSocketService._internal();

  WebSocketChannel? _channel;
  bool _isConnected = false;
  Timer? _reconnectTimer;
  String? _currentUserId;

  bool get isConnected => _isConnected;

  Future<void> initialize(String serverUrl) async {
    // Método simplificado para compilación
    print('WebSocket initialized with $serverUrl');
  }

  void connect() {
    // Método simplificado para compilación
    print('WebSocket connecting...');
    _isConnected = true;
  }

  void disconnect() {
    _isConnected = false;
    _channel?.sink.close();
    _channel = null;
  }

  void sendMessage(Map<String, dynamic> message) {
    if (_isConnected && _channel != null) {
      _channel!.sink.add(jsonEncode(message));
    }
  }
}