@echo off
echo Testing GET endpoint for user...
echo.

REM Get user 766de495-e4f3-4e91-a509-1a495c52e15c
curl -X GET "http://localhost:9998/api/v1/users/766de495-e4f3-4e91-a509-1a495c52e15c" ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3NjZkZTQ5NS1lNGYzLTRlOTEtYTUwOS0xYTQ5NWM1MmUxNWMiLCJjb21wYW55SWQiOjExLCJpYXQiOjE3MzcwNzA4MDB9.xxx" ^
  -H "Content-Type: application/json"

echo.
echo.
pause
