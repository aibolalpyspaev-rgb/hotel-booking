@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
set "MYSQL_DIR=C:\OSPanel\modules\MySQL-8.0"

echo  Останавливаю сайт StayEasy...

rem Frontend (5173) и Backend (8000): завершаем процессы, слушающие эти порты, и их окна
powershell -NoProfile -Command "foreach ($p in 5173,8000) { Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"
taskkill /FI "WINDOWTITLE eq StayEasy Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq StayEasy Frontend*" /T /F >nul 2>&1

rem MySQL (3307): корректное завершение
"%MYSQL_DIR%\bin\mysqladmin.exe" --user=root --host=127.0.0.1 --port=3307 shutdown >nul 2>&1

echo  Готово. Сайт остановлен.
if /i not "%~1"=="nopause" timeout /t 3 >nul
