@echo off
setlocal

set "ROOT=%~dp0.."
pushd "%ROOT%" >nul
if errorlevel 1 exit /b 1

set "GOCACHE=%ROOT%\.gocache"
set "GOTMPDIR=%ROOT%\.gotmp"

echo [behavior-matrix] Running Go tests...
go test ./...
if errorlevel 1 (
  popd >nul
  exit /b 1
)

echo [behavior-matrix] Running frontend matrix tests...
pushd "%ROOT%\frontend" >nul
if errorlevel 1 (
  popd >nul
  exit /b 1
)

call npm run test:matrix
set "STATUS=%ERRORLEVEL%"
popd >nul
popd >nul
exit /b %STATUS%
