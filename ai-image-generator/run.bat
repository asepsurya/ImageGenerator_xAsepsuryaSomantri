@echo off
echo ===================================================
echo 🎨 Launching AI Image Generator Studio...
echo ===================================================

:: Start Backend in a new window
echo 🚀 Starting Backend Server in a new window...
start "AI Image Generator - Backend" cmd /k "call venv\Scripts\activate & python backend\main.py"

:: Wait for a few seconds for backend to warm up
timeout /t 3 /nobreak > nul

:: Start Frontend in the current window
echo 💻 Starting Frontend Dev Server...
cd frontend
call npm run dev

pause
