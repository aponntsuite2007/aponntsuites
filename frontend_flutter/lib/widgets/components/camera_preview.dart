// import 'dart:html' as html;  // Solo para web - deshabilitado para móvil
import 'package:flutter/material.dart';
import 'dart:ui' as ui;
// ignore: avoid_web_libraries_in_flutter
// import 'dart:ui_web' as ui_web;  // Solo para web - deshabilitado para móvil
import '../../services/camera_service.dart';
import '../../config/theme.dart';

class CameraPreview extends StatefulWidget {
  final double width;
  final double height;
  final bool showControls;
  final VoidCallback? onCapture;
  final VoidCallback? onClose;

  const CameraPreview({
    Key? key,
    this.width = 640,
    this.height = 480,
    this.showControls = true,
    this.onCapture,
    this.onClose,
  }) : super(key: key);

  @override
  State<CameraPreview> createState() => _CameraPreviewState();
}

class _CameraPreviewState extends State<CameraPreview> {
  @override
  void initState() {
    super.initState();
    print('🎥 CameraPreview iniciado - Funcionalidad web deshabilitada');
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        color: Colors.black87,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.primaryColor, width: 2),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.camera_alt,
            size: 64,
            color: Colors.white54,
          ),
          SizedBox(height: 16),
          Text(
            'Cámara no disponible',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Funcionalidad web deshabilitada para móvil',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
            textAlign: TextAlign.center,
          ),
          if (widget.showControls) ...[
            SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                ElevatedButton.icon(
                  onPressed: widget.onCapture,
                  icon: Icon(Icons.camera),
                  label: Text('Capturar'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: widget.onClose,
                  icon: Icon(Icons.close),
                  label: Text('Cerrar'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}