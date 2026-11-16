@echo off
setlocal
call "%~dp0windows\Install.cmd" %*
exit /b %ERRORLEVEL%
