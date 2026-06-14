@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "URL=http://127.0.0.1:25973/"

cd /d "%ROOT%" || (
  echo ERROR: Could not enter project folder:
  echo   %ROOT%
  pause
  exit /b 1
)

if not exist ".env" (
  echo ERROR: Missing .env file.
  echo Copy .env.example to .env and add your GEMINI_API_KEY.
  pause
  exit /b 1
)

where pnpm >nul 2>&1
if errorlevel 1 (
  echo ERROR: pnpm is not installed or not on PATH.
  echo Install Node.js, then run: npm install -g pnpm
  pause
  exit /b 1
)

echo.
echo  Poem Lens - starting local dev environment
echo  -------------------------------------------
echo.

call :is_listening 8080
if errorlevel 1 (
  echo Starting API server on port 8080...
  start "Poem Lens API" /D "%ROOT%" cmd /k pnpm --filter @workspace/api-server run dev
) else (
  echo API server already running on port 8080.
)

call :is_listening 25973
if errorlevel 1 (
  echo Starting frontend on port 25973...
  start "Poem Lens App" /D "%ROOT%" cmd /k pnpm --filter @workspace/poem-app run dev
) else (
  echo Frontend already running on port 25973.
)

echo.
echo Waiting for the website to be ready...
powershell -NoProfile -Command ^
  "$deadline = (Get-Date).AddMinutes(2); " ^
  "while ((Get-Date) -lt $deadline) { " ^
  "  try { " ^
  "    $api = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/api/status' -TimeoutSec 2; " ^
  "    $web = Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2; " ^
  "    if ($api.hasServerKey -and $web.StatusCode -eq 200) { exit 0 } " ^
  "  } catch {} " ^
  "  Start-Sleep -Seconds 2 " ^
  "}; exit 1"

if errorlevel 1 (
  echo.
  echo Timed out waiting for Poem Lens to start.
  echo Check the "Poem Lens API" and "Poem Lens App" windows for errors.
  pause
  exit /b 1
)

call :open_chrome "%URL%"

echo.
echo Poem Lens is running at %URL%
echo Leave the API and App windows open while you use the site.
echo.
ping 127.0.0.1 -n 4 >nul
exit /b 0

:is_listening
netstat -ano | findstr ":%~1 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 exit /b 1
exit /b 0

:open_chrome
where chrome >nul 2>&1
if not errorlevel 1 (
  start "" chrome "%~1"
  exit /b 0
)

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%~1"
  exit /b 0
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%~1"
  exit /b 0
)

if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
  start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "%~1"
  exit /b 0
)

echo Chrome not found. Opening in your default browser instead.
start "" "%~1"
exit /b 0
