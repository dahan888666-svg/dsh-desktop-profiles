@echo off
setlocal
call "%~dp0windows\Launch.cmd" %*
exit /b %ERRORLEVEL%
