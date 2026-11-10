@echo off
chcp 65001 >nul
setlocal EnableExtensions
title StayEasy - запуск сайта бронирования отелей

rem ============================================================
rem   Запуск проекта одним кликом:
rem   MySQL (порт 3307) + Laravel API (порт 8000) + React (порт 5173)
rem ============================================================

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "PHP_DIR=C:\OSPanel\modules\PHP-8.3"
set "MYSQL_DIR=C:\OSPanel\modules\MySQL-8.0"
set "COMPOSER_HOME=C:\OSPanel\data\PHP-8.3\default\composer"
rem MySQL не работает с русскими буквами в пути - берём короткое (8.3) имя папки
for %%I in ("%ROOT%") do set "ROOT_SHORT=%%~sI"
set "DB_DIR=%ROOT_SHORT%\database-mysql"
set "PATH=%PHP_DIR%;%PATH%"

echo.
echo  ==========================================================
echo     StayEasy - веб-сервис бронирования отелей
echo  ==========================================================
echo.

rem ---------- Проверка программ ----------
if not exist "%PHP_DIR%\php.exe" (
    echo  [ОШИБКА] Не найден PHP 8.3: %PHP_DIR%\php.exe
    echo  Установите OSPanel в C:\OSPanel или исправьте путь PHP_DIR в этом файле.
    goto :fail
)
if not exist "%MYSQL_DIR%\bin\mysqld.exe" (
    echo  [ОШИБКА] Не найден MySQL 8.0: %MYSQL_DIR%
    goto :fail
)
where node >nul 2>nul || (
    echo  [ОШИБКА] Не найден Node.js. Установите его с https://nodejs.org
    goto :fail
)

rem ---------- 1. MySQL ----------
echo  [1/4] База данных MySQL...
if not exist "%DB_DIR%" mkdir "%DB_DIR%"
set "DATA_FWD=%DB_DIR:\=/%/data"
set "BASE_FWD=%MYSQL_DIR:\=/%"
(
    echo [mysqld]
    echo basedir=%BASE_FWD%
    echo datadir=%DATA_FWD%
    echo port=3307
    echo bind-address=127.0.0.1
    echo character-set-server=utf8mb4
    echo collation-server=utf8mb4_unicode_ci
    echo mysqlx=OFF
    echo [client]
    echo port=3307
    echo default-character-set=utf8mb4
) > "%DB_DIR%\my.ini"

if not exist "%DB_DIR%\data\mysql" (
    echo        Первый запуск: создаю хранилище базы данных...
    "%MYSQL_DIR%\bin\mysqld.exe" --defaults-file="%DB_DIR%\my.ini" --initialize-insecure >nul 2>&1
)

call :port_open 3307
if errorlevel 1 (
    start "StayEasy MySQL" /min "%MYSQL_DIR%\bin\mysqld.exe" --defaults-file="%DB_DIR%\my.ini"
    call :wait_port 3307 60 || (echo  [ОШИБКА] MySQL не запустился. & goto :fail)
)
"%MYSQL_DIR%\bin\mysql.exe" --user=root --host=127.0.0.1 --port=3307 --execute="CREATE DATABASE IF NOT EXISTS hotel_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE DATABASE IF NOT EXISTS hotel_booking_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" || goto :fail
echo        OK - MySQL работает на порту 3307

rem ---------- 2. Backend (Laravel) ----------
echo  [2/4] Backend Laravel...
pushd "%ROOT%\backend"
if not exist "vendor\autoload.php" (
    echo        Устанавливаю зависимости Composer, это может занять пару минут...
    php "%COMPOSER_HOME%\composer.phar" install --no-interaction || (popd & goto :fail)
)
if not exist ".env" (
    copy /y ".env.example" ".env" >nul
    php artisan key:generate --force >nul
)
php artisan app:setup || (popd & goto :fail)
popd

call :port_open 8000
if errorlevel 1 (
    start "StayEasy Backend" /min cmd /c "cd /d "%ROOT%\backend" && php artisan serve --host=127.0.0.1 --port=8000"
    call :wait_port 8000 30 || (echo  [ОШИБКА] Backend не запустился. & goto :fail)
)
echo        OK - API: http://127.0.0.1:8000/api

rem ---------- 3. Frontend (React + Vite) ----------
echo  [3/4] Frontend React...
pushd "%ROOT%\frontend"
if not exist "node_modules\vite" (
    echo        Устанавливаю зависимости npm, это может занять пару минут...
    call npm install || (popd & goto :fail)
)
popd

call :port_open 5173
if errorlevel 1 (
    start "StayEasy Frontend" /min cmd /c "cd /d "%ROOT%\frontend" && npm run dev"
    call :wait_port 5173 60 || (echo  [ОШИБКА] Frontend не запустился. & goto :fail)
)
echo        OK - сайт: http://localhost:5173

rem ---------- 4. Браузер ----------
echo  [4/4] Открываю сайт в браузере...
if not defined HB_NO_BROWSER start "" "http://localhost:5173"

echo.
echo  ==========================================================
echo     САЙТ ЗАПУЩЕН:  http://localhost:5173
echo.
echo     Администратор:  admin@hotel.kz  /  admin123
echo     Пользователь:   user@hotel.kz   /  user1234
echo  ==========================================================
echo.
echo  Не закрывайте это окно, пока работаете с сайтом.
echo  Чтобы ОСТАНОВИТЬ сайт - нажмите любую клавишу в этом окне.
echo.
pause >nul

echo  Останавливаю сайт...
powershell -NoProfile -Command "foreach ($p in 5173,8000) { Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"
taskkill /FI "WINDOWTITLE eq StayEasy Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq StayEasy Frontend*" /T /F >nul 2>&1
"%MYSQL_DIR%\bin\mysqladmin.exe" --user=root --host=127.0.0.1 --port=3307 shutdown >nul 2>&1
echo  Сайт остановлен.
timeout /t 2 >nul
exit /b 0

rem ============================================================
:port_open
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %1 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
exit /b %errorlevel%

:wait_port
set /a "_tries=0"
:wait_loop
call :port_open %1
if not errorlevel 1 exit /b 0
set /a "_tries+=1"
if %_tries% geq %2 exit /b 1
timeout /t 1 /nobreak >nul
goto :wait_loop

:fail
echo.
echo  Запуск не удался. Прочитайте сообщение выше.
pause
exit /b 1
