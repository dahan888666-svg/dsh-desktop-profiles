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
  pause
  exit /b 1
)
echo Install target: %INSTALL%
set "NODE=%INSTALL%\resources\runtime\primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE%" set "NODE=node"
"%NODE%" "%HERE%installer\repair.mjs" "%INSTALL%" --toolchain "%HERE%.."
echo.
echo Repair finished. See %LOCALAPPDATA%\dsh-desktop-profiles\repair.log for details.
if not defined DSH_PROFILES_NO_PAUSE pause
