#!/bin/bash
echo "==================================================="
echo "🎨 Launching AI Image Generator Studio..."
echo "==================================================="

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $(jobs -p)
    exit
}

trap cleanup SIGINT

# Start Backend
echo "🚀 Starting Backend Server..."
source venv/bin/activate
python3 backend/main.py &

# Wait a bit for backend to initialize
sleep 2

# Start Frontend
echo "💻 Starting Frontend Dev Server..."
cd frontend
npm run dev

# Keep script running to maintain logs and wait for cleanup
wait
