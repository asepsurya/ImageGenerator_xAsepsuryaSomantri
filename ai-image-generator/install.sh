#!/bin/bash
echo "==================================================="
echo "AI Image Generator - Installation Script (Linux/Mac)"
echo "==================================================="

echo "[1/3] Setting up Python Virtual Environment..."
python3 -m venv venv
source venv/bin/activate

echo "[2/3] Installing Backend Dependencies..."
cd backend
pip install -r requirements.txt
cd ..

echo "[3/3] Installing Frontend Dependencies..."
cd frontend
npm install
cd ..

echo "==================================================="
echo "Installation Complete!"
echo ""
echo "To run the application:"
echo "1. Start Backend:  source venv/bin/activate && cd backend && python main.py"
echo "2. Start Frontend: cd frontend && npm run dev"
echo "==================================================="
