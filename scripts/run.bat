@echo off
REM ===== 쩔어지갑 서버 실행 (폴더 자동 맞춤) =====
cd /d "%~dp0"
cd ..
set PORT=8080
start "" http://localhost:%PORT%/index.html
python -m http.server %PORT%
pause
