@echo off
setlocal

set "BLOCKLY_DIR=%~dp0BlockLy"
if not exist "%BLOCKLY_DIR%\tools\serve.py" (
  echo The BlockLy folder must be next to this launcher on the desktop.
  echo Expected: "%BLOCKLY_DIR%"
  pause
  exit /b 1
)

pushd "%BLOCKLY_DIR%"
where py >nul 2>&1
if not errorlevel 1 (
  py -3 tools\serve.py --open-browser
) else (
  where python >nul 2>&1
  if errorlevel 1 (
    echo Python 3 was not found. Install Python 3 and try again.
    popd
    pause
    exit /b 1
  )
  python tools\serve.py --open-browser
)
set "BLOCKLY_EXIT=%errorlevel%"
popd
if not "%BLOCKLY_EXIT%"=="0" (
  echo The server did not start. Read the error above.
  pause
)
exit /b %BLOCKLY_EXIT%
