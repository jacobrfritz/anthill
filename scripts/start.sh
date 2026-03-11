#!/bin/bash

# Anthill Simulation Startup Script

# Function to handle cleanup on exit
cleanup() {
    echo "Shutting down Anthill..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

echo "Starting Anthill Backend (FastAPI)..."
cd backend
source .venv/bin/activate
uvicorn app.api.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo "Starting Anthill Frontend (Vite)..."
cd frontend
npm run dev -- --port 3000 &
FRONTEND_PID=$!
cd ..

echo "---------------------------------------"
echo "Anthill is running!"
echo "Backend API: http://localhost:8000"
echo "Frontend UI:  http://localhost:3000"
echo "---------------------------------------"

# Wait for background processes
wait
