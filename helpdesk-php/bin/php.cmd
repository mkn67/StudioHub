@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0php.ps1" %*
exit /b %errorlevel%
