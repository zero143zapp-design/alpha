@echo off
setlocal

set "APP=%~dp0EchoWidget.Desktop.exe"
set "HTML=%~dp0echo-desktop-widget\index.html"

if exist "%APP%" (
    start "" "%APP%"
    exit /b 0
)

if not exist "%HTML%" (
    echo ECHO could not find the desktop app or web widget.
    exit /b 1
)

start "" "%HTML%"
exit /b 0
