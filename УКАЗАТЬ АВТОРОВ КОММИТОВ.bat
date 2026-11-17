@echo off
chcp 65001 >nul
setlocal
title StayEasy - авторы коммитов
cd /d "%~dp0"

echo.
echo  Коммиты в репозитории подписаны условно: «Разработчик Backend» и «Разработчик Frontend».
echo  Введите настоящие имена и email участников (email — тот, что в GitHub).
echo  Запускать один раз, ДО публикации репозитория на GitHub.
echo.
set /p "BACK_NAME=  Backend  — Фамилия Имя: "
set /p "BACK_EMAIL=  Backend  — email: "
set /p "FRONT_NAME=  Frontend — Фамилия Имя: "
set /p "FRONT_EMAIL=  Frontend — email: "
echo.

set "GITBASH=%ProgramFiles%\Git\bin\bash.exe"
if not exist "%GITBASH%" set "GITBASH=bash"
"%GITBASH%" tools/set-authors.sh
echo.
pause
