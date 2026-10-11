@echo off
setlocal

set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set "TARGET=file:///c:/Users/Zero1/.copilot/repos/copilot-worktrees/alpha/zero143zapp-design-literate-giggle/echo-desktop-widget/index.html"

if exist "%CHROME%" (
    start "" "%CHROME%" --app="%TARGET%" --window-size=390,700
    exit /b 0
)

if exist "%EDGE%" (
    start "" "%EDGE%" --app="%TARGET%" --window-size=390,700
    exit /b 0
)

start "" "%~dp0echo-desktop-widget\index.html"
exit /b 0
