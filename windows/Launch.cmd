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
  echo [x] DeepSeek Harness was not found. Run Install.cmd first.
  if not defined DSH_PROFILES_NO_PAUSE pause
  exit /b 1
)

set "RUNNING=0"
for /f %%R in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%HERE%installer\close-app.ps1" "%INSTALL%" -Check') do set "RUNNING=%%R"
if "%RUNNING%"=="1" goto start

set "NODE=%INSTALL%\resources\runtime\primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE%" set "NODE=node"
"%NODE%" "%HERE%installer\repair.mjs" "%INSTALL%" --toolchain "%HERE%.." --quiet

:start
start "" "%INSTALL%\DeepSeek Harness.exe"
