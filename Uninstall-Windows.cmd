@echo off
setlocal
call "%~dp0windows\Uninstall.cmd" %*
exit /b %ERRORLEVEL%
