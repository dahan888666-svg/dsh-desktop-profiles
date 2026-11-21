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
  if not defined DSH_PROFILES_NO_PAUSE pause
  exit /b 1
)
echo Install target: %INSTALL%
set "SCOPE=Get-CimInstance Win32_Process -Filter \"name='DeepSeek Harness.exe'\" | Where-Object { $_.ExecutablePath -like '%INSTALL%\*' }"
set "RUNNING="
for /f %%R in ('powershell -NoProfile -Command "if (%SCOPE%) { '1' } else { '0' }"') do set "RUNNING=%%R"
if "%RUNNING%"=="1" (
  choice /C YN /M "DeepSeek Harness is running. Close it and continue"
  if errorlevel 2 exit /b 1
  powershell -NoProfile -Command "%SCOPE% | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
  timeout /t 3 /nobreak >nul
)
copy /y "%INSTALL%\resources\app.asar" "%TEMP%\dsh-profiles-write-test.bin" >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList '%INSTALL%' -Verb RunAs"
  exit /b
)
del "%TEMP%\dsh-profiles-write-test.bin" >nul 2>&1

rem Stop the background repair watcher before restoring the official archive.
set "TOOLROOT=%LOCALAPPDATA%\dsh-desktop-profiles"
if not exist "%TOOLROOT%" mkdir "%TOOLROOT%" >nul 2>&1
echo stop>"%TOOLROOT%\STOP"
powershell -NoProfile -Command "Remove-Item (Join-Path ([Environment]::GetFolderPath('Startup')) 'DSH-Desktop-Profiles-Repair.lnk') -Force -ErrorAction SilentlyContinue"
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ($_.CommandLine -like '*repair-loop.vbs*') -or ($_.CommandLine -like '*dsh-desktop-profiles*toolchain*repair.mjs*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
timeout /t 2 /nobreak >nul
if exist "%TOOLROOT%\toolchain" rmdir /s /q "%TOOLROOT%\toolchain"

set "NODE=%INSTALL%\resources\runtime\primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE%" set "NODE=node"
"%NODE%" "%HERE%installer\revert.mjs" "%INSTALL%"
if errorlevel 1 (
  echo [!] Rollback failed; see the error above.
  if not defined DSH_PROFILES_NO_PAUSE pause
  exit /b 1
)
echo Restored the stock interface. Profile data is untouched.
start "" "%INSTALL%\DeepSeek Harness.exe"
if not defined DSH_PROFILES_NO_PAUSE pause
