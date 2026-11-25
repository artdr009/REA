@echo off
set "APP=%~dp0release\win-unpacked\REA Short Drama Studio.exe"
if not exist "%APP%" (
  echo REA Short Drama Studio executable was not found.
  echo Expected: %APP%
  pause
  exit /b 1
)
start "" "%APP%"
