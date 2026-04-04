@echo off
REM Batch deployment script wrapper
REM This calls the PowerShell deployment script
REM Usage: dp_remote.bat -Server your-server -User your-user

setlocal enabledelayedexpansion

echo Deploying my-reference-catalog...
echo.

REM Check if running from the correct directory
if not exist "docker-compose.yml" (
    echo Error: docker-compose.yml not found. Please run from the project root.
    exit /b 1
)

REM Run PowerShell deployment script
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" %*

if !errorlevel! neq 0 (
    echo.
    echo Deployment failed. Check the output above for errors.
    exit /b 1
)

echo.
echo Deployment completed successfully!
exit /b 0
