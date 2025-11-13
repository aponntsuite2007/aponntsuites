@echo off
echo.
echo ============================================
echo TEST SIMPLE: Verificar campos GPS en API
echo ============================================
echo.

echo Consultando usuario: 766de495-e4f3-4e91-a509-1a495c52e15c
echo URL: http://localhost:9998/api/v1/users/766de495-e4f3-4e91-a509-1a495c52e15c
echo.

curl -s -H "Authorization: Bearer test-token" http://localhost:9998/api/v1/users/766de495-e4f3-4e91-a509-1a495c52e15c

echo.
echo.
echo ============================================
echo Si ves "gpsEnabled" y "allowOutsideRadius"
echo en la respuesta, el fix funciona!
echo ============================================
echo.
pause
