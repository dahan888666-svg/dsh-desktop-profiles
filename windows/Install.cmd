@echo off
setlocal EnableExtensions
set "HERE=%~dp0"
set "INSTALL=%~1"

if not defined INSTALL (
  for %%P in ("D:\DSH" "%LOCALAPPDATA%\Programs\DeepSeek Harness" "%ProgramFiles%\DeepSeek Harness" "%ProgramFiles(x86)%\DeepSeek Harness") do (
    if not defined INSTALL if exist "%%~fP\DeepSeek Harness.exe" set "INSTALL=%%~fP"
  )
)
if not defined INSTALL (
  echo [x] DeepSeek Harness was not found.
  echo     Usage: Install.cmd "C:\path\to\DeepSeek Harness"
  if not defined DSH_PROFILES_NO_PAUSE pause
  exit /b 1
)

echo Install target: %INSTALL%

set "RUNNING=0"
for /f %%R in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%HERE%installer\close-app.ps1" "%INSTALL%" -Check') do set "RUNNING=%%R"
if "%RUNNING%"=="1" (
  echo DeepSeek Harness is running. It must be closed to replace program files.
  choice /C YN /M "Close DeepSeek Harness now and continue"
  if errorlevel 2 exit /b 1
  powershell -NoProfile -ExecutionPolicy Bypass -File "%HERE%installer\close-app.ps1" "%INSTALL%"
  if errorlevel 1 (
    echo [!] Could not close DeepSeek Harness. Quit it manually and run this again.
    if not defined DSH_PROFILES_NO_PAUSE pause
    exit /b 1
  )
)

rem The install directory must be writable; Program Files needs elevation.
copy /y "%INSTALL%\resources\app.asar" "%TEMP%\dsh-profiles-write-test.bin" >nul 2>&1
if errorlevel 1 (
  echo Administrator rights are required; requesting elevation...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList '%INSTALL%' -Verb RunAs"
  exit /b
)
del "%TEMP%\dsh-profiles-write-test.bin" >nul 2>&1

set "NODE=%INSTALL%\resources\runtime\primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE%" set "NODE=node"

"%NODE%" "%HERE%installer\deploy.mjs" "%INSTALL%" --payload "%HERE%payload"
if errorlevel 1 (
  echo.
  echo [!] Install failed. The original archive was kept; nothing was left half-written.
  echo     If it reports access denied, run this file as administrator.
  if not defined DSH_PROFILES_NO_PAUSE pause
  exit /b 1
)

rem Route the usual shortcuts through the self-healing launcher.
powershell -NoProfile -ExecutionPolicy Bypass -File "%HERE%installer\set-shortcuts.ps1" "%INSTALL%" "%HERE%Launch.cmd"

echo.
echo Installed. Starting DeepSeek Harness...
start "" "%INSTALL%\DeepSeek Harness.exe"
echo.
echo After it opens, a Profile row appears above "New session" in the sidebar.
echo Use the "DeepSeek Harness (Profiles)" shortcut from now on: it re-applies
echo the patch automatically after a DSH update (Run Launch.cmd / Repair.cmd).
if not defined DSH_PROFILES_NO_PAUSE pause
