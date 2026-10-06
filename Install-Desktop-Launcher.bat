@echo off
setlocal

set "BLOCKLY_DIR=%~dp0"
set "BLOCKLY_LAUNCHER=%BLOCKLY_DIR%tools\Start-BlockLy.bat"
if not exist "%BLOCKLY_LAUNCHER%" (
  echo Launcher file not found: "%BLOCKLY_LAUNCHER%"
  pause
  exit /b 1
)

for %%I in ("%BLOCKLY_DIR%..") do set "BLOCKLY_DESKTOP=%%~fI"
copy /Y "%BLOCKLY_LAUNCHER%" "%BLOCKLY_DESKTOP%\Start-BlockLy.bat" >nul
if errorlevel 1 (
  echo Could not create the launcher next to the BlockLy folder.
  pause
  exit /b 1
)

echo Created: "%BLOCKLY_DESKTOP%\Start-BlockLy.bat"
echo Double-click this file to start BlockLy.
pause
