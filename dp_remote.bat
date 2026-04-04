@echo off
REM Batch deployment script wrapper
REM This calls the PowerShell deployment script

setlocal enabledelayedexpansion

echo Deploying my-reference-catalog to fraserver01...
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
