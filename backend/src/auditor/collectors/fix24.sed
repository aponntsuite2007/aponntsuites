540d
540i\
\
      // ⭐ FIX 24: Esperar a que el elemento sea clickable (no solo enabled)\
      console.log('    ⏳ Esperando que #passwordInput sea clickable...');\
      await this.page.waitForFunction(\
        () => {\
          const el = document.querySelector('#passwordInput');\
          if (!el) return false;\
          const rect = el.getBoundingClientRect();\
          // Verificar que esté visible y no cubierto\
          return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;\
        },\
        { timeout: 10000 }\
      );
542,545c\
      // Limpiar campo de contraseña (por si tiene valor previo)\
      // ⭐ FIX 24: Usar estrategia más robusta (focus + Control+A) en lugar de triple-click\
      console.log('    🧹 Limpiando campo de contraseña...');\
      await this.page.focus('#passwordInput');\
      await this.page.keyboard.press('Control+A'); // Seleccionar todo (más confiable que triple-click)\
      await this.page.keyboard.press('Backspace');\
      await this.page.waitForTimeout(500);
