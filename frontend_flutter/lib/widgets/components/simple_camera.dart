// import 'dart:html' as html;  // Solo para web - deshabilitado para móvil

class SimpleCamera {
  static void openCamera() {
    print('🎥 SimpleCamera.openCamera() llamado');
    print('🎥 Cámara no disponible en móvil - funcionalidad web deshabilitada');
    // Funcionalidad web comentada para compilación móvil
    /*
    // Verificar si ya existe una ventana de cámara
    final existing = html.document.getElementById('cameraOverlay');
    if (existing != null) {
      existing.remove();
    }
    
    // Crear JavaScript que se ejecute directamente
    final script = '''
      (async function() {
        try {
          console.log('🎥 [DEBUG] Script JavaScript iniciado');
          console.log('🎥 [DEBUG] Verificando navigator.mediaDevices...');
          
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('❌ getUserMedia no está disponible');
            alert('Tu navegador no soporta acceso a la cámara');
            return;
          }
          
          console.log('🎥 [DEBUG] Solicitando acceso a la cámara...');
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              facingMode: 'user'
            } 
          });
          
          console.log('🎥 [DEBUG] Stream obtenido:', stream);
          
          // Crear overlay
          const overlay = document.createElement('div');
          overlay.id = 'cameraOverlay';
          overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            flex-direction: column;
          `;
          
          const video = document.createElement('video');
          video.style.cssText = `
            width: 80%;
            max-width: 600px;
            height: auto;
            border: 2px solid #2196F3;
            border-radius: 8px;
          `;
          
          const buttonContainer = document.createElement('div');
          buttonContainer.style.cssText = `
            margin-top: 20px;
            display: flex;
            gap: 15px;
          `;
          
          const captureButton = document.createElement('button');
          captureButton.textContent = '📸 Capturar';
          captureButton.style.cssText = `
            padding: 12px 24px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
          `;
          
          const closeButton = document.createElement('button');
          closeButton.textContent = '❌ Cerrar';
          closeButton.style.cssText = `
            padding: 12px 24px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
          `;
          
          video.srcObject = stream;
          video.autoplay = true;
          
          buttonContainer.appendChild(captureButton);
          buttonContainer.appendChild(closeButton);
          overlay.appendChild(video);
          overlay.appendChild(buttonContainer);
          document.body.appendChild(overlay);
          
          console.log('🎥 [DEBUG] Elementos creados y agregados al DOM');
          
          captureButton.onclick = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            
            // Convertir a blob y descargar
            canvas.toBlob((blob) => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `captura_\${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
              a.click();
              URL.revokeObjectURL(url);
              console.log('🎥 [DEBUG] Imagen capturada y descargada');
            });
          };
          
          closeButton.onclick = () => {
            stream.getTracks().forEach(track => track.stop());
            overlay.remove();
            console.log('🎥 [DEBUG] Cámara cerrada y limpieza realizada');
          };
          
        } catch (error) {
          console.error('❌ Error al abrir la cámara:', error);
          alert('Error al acceder a la cámara: ' + error.message);
        }
      })();
    ''';
    
    const scriptId = 'camera-script';
    final existingScript = html.document.getElementById(scriptId);
    if (existingScript != null) {
      existingScript.remove();
    }
    
    try {
      final scriptElement = html.ScriptElement();
      scriptElement.id = scriptId;
      scriptElement.text = script;
      html.document.head!.append(scriptElement);
      print('🎥 [DEBUG] Script JavaScript inyectado exitosamente');
    } catch (e) {
      print('❌ Error inyectando script: \$e');
    }
    */
  }
}