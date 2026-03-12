@echo off
echo ===================================================
echo AI Image Generator - Installation Script (Windows)
echo ===================================================

echo [1/3] Setting up Python Virtual Environment...
python -m venv venv
call venv\Scripts\activate.bat

echo [2/3] Installing Backend Dependencies...
cd backend
if not exist .env (
    echo Creating backend .env from template...
    copy .env.example .env
)
pip install -r requirements.txt
cd ..

echo [3/3] Installing Frontend Dependencies...
cd frontend
if not exist .env (
    echo Creating frontend .env from template...
    copy .env.example .env
)
call npm install
cd ..

echo ===================================================
echo Installation Complete!
echo.
echo To run the application:
echo 1. Start Backend:  call venv\Scripts\activate ^& cd backend ^& python main.py
echo 2. Start Frontend: cd frontend ^& npm run dev
echo ===================================================
pause
