@echo off
setlocal
set /p NODE_VERSION=<"%~dp0.node-version"
set "NODE_ARCH=x64"
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" set "NODE_ARCH=arm64"
if /i "%PROCESSOR_ARCHITEW6432%"=="ARM64" set "NODE_ARCH=arm64"
set "NODE_HOME=%~dp0.tools\node-v%NODE_VERSION%-win-%NODE_ARCH%"
if not exist "%NODE_HOME%\node.exe" (
    echo Project Node is missing. Run: powershell -ExecutionPolicy Bypass -File "%~dp0scripts\setup-node.ps1"
    exit /b 1
)
set "PATH=%NODE_HOME%;%PATH%"
"%NODE_HOME%\node.exe" "%NODE_HOME%\node_modules\npm\bin\npm-cli.js" %*
exit /b %ERRORLEVEL%
